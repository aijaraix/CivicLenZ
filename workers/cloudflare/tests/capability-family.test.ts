import assert from "node:assert/strict";
import test from "node:test";

import {
  CAPABILITY_FAMILY_SPECS,
  capabilityFamilySpec,
  planCapabilityFamilyWork,
  queueCapabilityFamilyWork,
} from "../shared/src/capability-family.ts";
import { createMemoryStore } from "../shared/src/store.ts";

const SUBJECT_ID = "00000000-0000-4000-8000-000000000001";
const SEAT_ID = "00000000-0000-4000-8000-000000000002";

test("capability-family contracts cover reusable finance and disclosure departments", () => {
  const finance = capabilityFamilySpec("campaign_finance");
  assert.ok(finance);
  assert.equal(finance?.family, "finance");
  assert.equal(finance?.datasetKind, "FINITE");
  assert.ok(finance?.units.includes("contributions"));
  assert.ok(finance?.units.includes("expenditures"));
  assert.ok(finance?.units.includes("reconciliation_audit"));
  assert.equal(finance?.publicationAuthority, false);
  assert.equal(finance?.verificationAuthority, false);

  const disclosure = capabilityFamilySpec("financial_disclosures");
  assert.ok(disclosure);
  assert.equal(disclosure?.family, "disclosure");
  assert.equal(disclosure?.datasetKind, "FINITE");
  assert.ok(disclosure?.units.includes("assets"));
  assert.ok(disclosure?.units.includes("liabilities"));
  assert.ok(disclosure?.units.includes("reconciliation_audit"));
});

test("family planning decomposes a subject into bounded, source-family-aware work", () => {
  const planned = planCapabilityFamilyWork({
    subjectType: "person",
    subjectId: SUBJECT_ID,
    seatId: SEAT_ID,
    subjectKey: "seat:example-office",
    capability: "campaign_finance",
  });
  assert.ok(planned.length > 1);
  assert.ok(new Set(planned.map((item) => item.unitKey)).size === planned.length);
  assert.ok(planned.every((item) => item.datasetKind === "FINITE"));
  assert.ok(planned.every((item) => item.sourceFamilies.length > 0));
  assert.ok(planned.every((item) => item.route === "heavy"));
  assert.ok(planned.every((item) => item.queuePool === "cloudflare-capability-finance"));
  assert.ok(planned.every((item) => item.executionClass === "PRODUCTION"));
  assert.ok(planned.every((item) => item.orchestrationAuthority === "HERMES"));
  assert.ok(planned.every((item) => item.publicationAuthority === false));
  assert.ok(planned.every((item) => item.verificationAuthority === false));
  assert.ok(planned.every((item) => item.validationHandoff.length > 0));
  assert.ok(planned.every((item) => item.coverageHandoff.includes("expected_vs_accounted")));
  assert.equal(
    planned.some((item) => /politician|governor|desantis/i.test(JSON.stringify(item))),
    false,
  );
});

test("open-ended families require multi-pass coverage and do not become finite", () => {
  const planned = planCapabilityFamilyWork({
    subjectType: "person",
    subjectId: SUBJECT_ID,
    seatId: SEAT_ID,
    subjectKey: "seat:example-office",
    capability: "public_commitments",
    generation: 2,
  });
  assert.ok(planned.length > 1);
  assert.ok(planned.every((item) => item.datasetKind === "OPEN_ENDED"));
  assert.ok(planned.every((item) => item.coverageHandoff.includes("multi_pass_lead_closure")));
  assert.ok(planned.every((item) => item.generation === 2));
  assert.ok(planned.every((item) => item.researchWorkIdentity.endsWith(":g2")));
});

test("queueing is idempotent and creates no civic facts or publication authority", async () => {
  const store = createMemoryStore();
  const input = {
    subjectType: "person",
    subjectId: SUBJECT_ID,
    seatId: SEAT_ID,
    subjectKey: "seat:example-office",
    capability: "financial_disclosures",
  };
  const first = await queueCapabilityFamilyWork(store, input);
  const second = await queueCapabilityFamilyWork(store, input);
  assert.equal(first.planned.length, first.queued.length);
  assert.equal(first.queued.filter((item) => item.created).length, first.planned.length);
  assert.equal(second.queued.filter((item) => item.created).length, 0);
  assert.equal((await store.listJobs()).length, first.planned.length);
  assert.equal((await store.listPersons()).length, 0);
  assert.equal((await store.listOccupancies()).length, 0);
  assert.ok((await store.listJobs()).every((job) => job.payload.publication_authority === false));
  assert.ok((await store.listJobs()).every((job) => job.payload.verification_authority === false));
});

test("family catalog is bounded and rejects unknown capabilities", () => {
  assert.ok(CAPABILITY_FAMILY_SPECS.length >= 50);
  assert.equal(
    planCapabilityFamilyWork({
      subjectType: "person",
      subjectId: SUBJECT_ID,
      subjectKey: "seat:example-office",
      capability: "made_up_capability",
    }).length,
    0,
  );
});
