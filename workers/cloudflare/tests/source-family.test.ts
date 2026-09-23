import assert from "node:assert/strict";
import test from "node:test";

import {
  planSourceFamilyPasses,
  queueSourceFamilyPasses,
} from "../shared/src/source-family.ts";

const base = {
  subjectType: "seat",
  subjectId: "seat-1",
  seatId: "seat-1",
  subjectKey: "seat-1",
  capability: "campaign_finance",
  scopeKey: "campaign_finance",
  unitKey: "contributions",
};

test("finite capability work fans out by declared source family once", () => {
  const planned = planSourceFamilyPasses(base);
  assert.equal(planned.length, 3);
  assert.deepEqual(
    planned.map((item) => item.sourceFamily),
    ["official_registry", "official_filings", "official_agency"],
  );
  assert.deepEqual(planned.map((item) => item.discoveryPass), [1, 1, 1]);
  assert.equal(new Set(planned.map((item) => item.dedupeKey)).size, planned.length);
  assert.ok(planned.every((item) => item.datasetKind === "FINITE"));
  assert.ok(planned.every((item) => item.publicationAuthority === false));
  assert.ok(planned.every((item) => item.verificationAuthority === false));
});

test("open-ended work requires multiple bounded discovery passes", () => {
  const planned = planSourceFamilyPasses({
    ...base,
    capability: "campaign_promises",
    scopeKey: "promises_statements",
    unitKey: "official_statements",
  });
  assert.equal(planned.length, 6);
  assert.deepEqual([...new Set(planned.map((item) => item.discoveryPass))], [1, 2]);
  assert.deepEqual(
    [...new Set(planned.map((item) => item.sourceRateLimitKey))],
    ["official_source", "reputable_media", "archival_source"],
  );
  assert.deepEqual(
    planSourceFamilyPasses({
      ...base,
      capability: "campaign_promises",
      scopeKey: "promises_statements",
      unitKey: "official_statements",
      discoveryPasses: 1,
    }),
    [],
  );
});

test("source-family selection is allow-listed, bounded, and unit-specific", () => {
  assert.deepEqual(
    planSourceFamilyPasses({
      ...base,
      sourceFamilies: ["unregistered_source"],
    }),
    [],
  );
  assert.deepEqual(
    planSourceFamilyPasses({
      ...base,
      unitKey: "not_a_campaign_finance_unit",
    }),
    [],
  );
  assert.deepEqual(
    planSourceFamilyPasses({
      ...base,
      sourceFamilies: Array.from({ length: 9 }, (_, index) => `source-${index}`),
    }),
    [],
  );
});

test("source-family identities separate source, pass, and generation", () => {
  const first = planSourceFamilyPasses(base);
  const second = planSourceFamilyPasses({ ...base, generation: 2 });
  assert.notEqual(first[0].researchWorkIdentity, second[0].researchWorkIdentity);
  assert.notEqual(first[0].researchWorkIdentity, first[1].researchWorkIdentity);
  assert.notEqual(first[0].researchWorkIdentity, first[0].researchWorkIdentity.replace("official_registry", "official_filings"));
});

test("queue adapter preserves deterministic idempotence and evidence-only authority", async () => {
  const jobs = new Map<string, unknown>();
  const store = {
    scheduleJob: async (input: { dedupeKey: string }) => {
      const existing = jobs.get(input.dedupeKey);
      if (existing) return { job: existing, created: false };
      const job = { jobId: `job-${jobs.size}`, dedupeKey: input.dedupeKey };
      jobs.set(input.dedupeKey, job);
      return { job, created: true };
    },
  } as never;
  const first = await queueSourceFamilyPasses(store, base);
  const second = await queueSourceFamilyPasses(store, base);
  assert.equal(first.planned.length, 3);
  assert.ok(first.queued.every((item) => item.created));
  assert.ok(second.queued.every((item) => item.created === false));
  assert.equal(jobs.size, 3);
  assert.ok(first.queued.every((item) => item.sourceRateLimitKey));
  assert.ok(first.queued.every((item) => item.publicationAuthority === false));
  assert.ok(first.queued.every((item) => item.verificationAuthority === false));
});
