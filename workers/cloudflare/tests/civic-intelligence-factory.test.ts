import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { isPublicationEligible } from "../shared/src/claims.ts";
import { senateAutoEnqueueBlocked, evaluateCohortGate } from "../shared/src/cohort-planner.ts";
import { COMPLETENESS_DIMENSIONS, auditCompleteness, httpHashParseCountIsNotVerified } from "../shared/src/completeness.ts";
import { runCollectorJob } from "../shared/src/collector.ts";
import { financeMustNotBeComplete, isEverythingOnTheInternetComplete, reconcileDataset } from "../shared/src/dataset-reconciliation.ts";
import { createMemoryBucket } from "../shared/src/memory-bucket.ts";
import { OFFICE_CLASSES, OFFICE_CLASS_CONTRACTS, officeClassForOfficeType } from "../shared/src/office-classes.ts";
import { parseOfficialProfile, parseWithParserFamily } from "../shared/src/parser-families.ts";
import { createQueueJobMessage } from "../shared/src/queue-messages.ts";
import { queueMissingProfileWork } from "../shared/src/research.ts";
import { persistOfficeClassContract } from "../shared/src/research-contracts.ts";
import { sourceAdapter } from "../shared/src/source-config.ts";
import { createMemoryStore } from "../shared/src/store.ts";
import { canAutoVerify } from "../shared/src/validation.ts";
import { runtimeCapabilityState } from "../shared/src/worker-registry.ts";
import { getPublicationEligibleClaimsForSubject } from "../../../lib/civic-data/public.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const governorHtml = readFileSync(path.join(repoRoot, "tests/fixtures/florida_governor_official.html"), "utf8");

function occupantNameFromFixture(html: string): string {
  const match = html.match(/property="og:title" content="Governor ([^"]+)"/i);
  assert.ok(match?.[1], "fixture must contain an og:title occupant");
  return match[1].trim();
}

function appLogicSources(): string {
  return [
    "workers/cloudflare/shared/src/parser-families.ts",
    "workers/cloudflare/shared/src/office-classes.ts",
    "workers/cloudflare/shared/src/research.ts",
    "workers/cloudflare/shared/src/research-contracts.ts",
    "workers/cloudflare/shared/src/source-config.ts",
    "workers/cloudflare/shared/src/collector.ts",
    "workers/cloudflare/shared/src/cohort-planner.ts",
    "app/seats/[seatKey]/page.tsx",
    "app/operator/page.tsx",
  ]
    .map((relative) => readFileSync(path.join(repoRoot, relative), "utf8"))
    .join("\n");
}

test("office-class contracts are reusable and never person-specific", () => {
  for (const officeClass of OFFICE_CLASSES) {
    const contract = OFFICE_CLASS_CONTRACTS[officeClass];
    assert.equal(contract.contractKey, officeClass);
    assert.equal(contract.officeClass, officeClass);
    assert.ok(contract.fields.some((field) => field.requiredForBaseline));
    assert.equal(contract.publicationPolicy, "publication_eligible_claims_only");
    assert.ok(contract.datasetReconciliation.length > 0);
  }
  assert.equal(officeClassForOfficeType("governor"), "STATE_GOVERNOR");
  assert.equal(officeClassForOfficeType("state_senator"), "STATE_SENATOR");
  assert.equal(officeClassForOfficeType("state_representative"), "STATE_REPRESENTATIVE");
  assert.equal(/desantis/i.test(JSON.stringify(OFFICE_CLASS_CONTRACTS)), false);
});

test("completeness engine exposes nine queryable dimensions", async () => {
  assert.deepEqual(
    [...COMPLETENESS_DIMENSIONS],
    [
      "FIELD",
      "SOURCE",
      "TEMPORAL",
      "EVIDENCE",
      "VERIFICATION",
      "FRESHNESS",
      "DATASET_RECONCILIATION",
      "MONITORING",
      "UNRESOLVED_CONTRADICTIONS",
    ],
  );
  assert.equal(httpHashParseCountIsNotVerified(), true);
  const store = createMemoryStore();
  await persistOfficeClassContract(store, "STATE_GOVERNOR");
  const jurisdiction = await store.upsertJurisdiction({
    jurisdictionKey: "us-fl",
    name: "Florida",
    jurisdictionType: "state",
    stateCode: "FL",
  });
  const seat = await store.upsertSeat({
    seatKey: "us-fl-governor",
    jurisdictionId: jurisdiction.jurisdictionId,
    seatName: "Governor of Florida",
    officeType: "governor",
    governmentLevel: "state",
    occupancyStatus: "occupied",
    researchContractKey: "STATE_GOVERNOR",
    baselineStatus: "officeholder_present",
    monitoringActive: false,
  });
  const person = await store.upsertPerson({
    canonicalName: occupantNameFromFixture(governorHtml),
    seatId: seat.seatId,
    jurisdictionId: jurisdiction.jurisdictionId,
  });
  await store.upsertOccupancy({
    seatId: seat.seatId,
    personId: person.personId,
    occupancyStatus: "current",
    evidenceState: "unreviewed",
  });
  const [audit] = await auditCompleteness(store, { seatId: seat.seatId, personId: person.personId, category: "identity" });
  assert.ok(audit);
  assert.equal(audit.officeClass, "STATE_GOVERNOR");
  assert.ok(Object.keys(audit.dimensions).length === 9);
  assert.equal(audit.openEndedNeverEverythingComplete, false);
  assert.ok(audit.fields.every((field) => field.category === "identity"));
  const statewide = await auditCompleteness(store, { jurisdictionId: jurisdiction.jurisdictionId, cohortKey: "florida-governor-fixture" });
  assert.equal(statewide.length, 1);
});

test("job generator skips when completeness audit is complete and fresh", async () => {
  const store = createMemoryStore();
  const jurisdiction = await store.upsertJurisdiction({
    jurisdictionKey: "us-fl",
    name: "Florida",
    jurisdictionType: "state",
    stateCode: "FL",
  });
  const seat = await store.upsertSeat({
    seatKey: "us-fl-governor",
    jurisdictionId: jurisdiction.jurisdictionId,
    seatName: "Governor of Florida",
    officeType: "governor",
    governmentLevel: "state",
    occupancyStatus: "occupied",
    researchContractKey: "STATE_GOVERNOR",
    baselineStatus: "officeholder_present",
    monitoringActive: true,
  });
  const person = await store.upsertPerson({
    canonicalName: occupantNameFromFixture(governorHtml),
    seatId: seat.seatId,
    jurisdictionId: jurisdiction.jurisdictionId,
  });
  await store.upsertOccupancy({
    seatId: seat.seatId,
    personId: person.personId,
    occupancyStatus: "current",
    evidenceState: "unreviewed",
  });
  await store.upsertMonitoringState({
    targetType: "seat",
    targetId: seat.seatId,
    seatId: seat.seatId,
    active: true,
    monitoringClass: "daily",
    configuration: { seatKey: seat.seatKey },
  });
  const occupant = await store.recordClaim({
    subjectType: "seat",
    subjectId: seat.seatId,
    seatId: seat.seatId,
    fieldKey: "current_occupant",
    normalizedValue: person.canonicalName,
    displayValue: person.canonicalName,
    verificationState: "collected_unreviewed",
  });
  const portrait = await store.recordClaim({
    subjectType: "person",
    subjectId: person.personId,
    seatId: seat.seatId,
    fieldKey: "portrait",
    normalizedValue: "https://example.gov/portrait.png",
    displayValue: "https://example.gov/portrait.png",
    verificationState: "collected_unreviewed",
  });
  const evidence = await store.recordEvidence({
    contentHash: "a".repeat(64),
    evidenceType: "html_excerpt",
    sourceUrl: "https://www.flgov.com/",
    excerpt: person.canonicalName,
    verificationState: "collected_unreviewed",
  });
  await store.attachClaimEvidence(occupant.claimId, evidence.evidenceId, "supports");
  await store.attachClaimEvidence(portrait.claimId, evidence.evidenceId, "supports");
  const first = await queueMissingProfileWork(store, { seat, person, officialWebsite: "https://www.flgov.com/" });
  assert.equal(first.skippedComplete, false);
  const second = await queueMissingProfileWork(store, { seat, person, officialWebsite: "https://www.flgov.com/" });
  assert.equal(second.skippedComplete, true);
  assert.equal(second.queued, false);
  assert.deepEqual(second.missingFields, []);
});

test("OFFICIAL_PROFILE extracts the occupant from fixture HTML without a name constant", () => {
  const config = sourceAdapter("florida-governor-official")!;
  assert.equal(config.parserFamily, "OFFICIAL_PROFILE");
  assert.equal(config.operatorControlled, true);
  assert.equal(config.firstWaveActive, false);
  assert.equal(config.schemaCertified, false);
  assert.equal(config.coverage, "parser");
  const expected = occupantNameFromFixture(governorHtml);
  const holders = parseOfficialProfile(governorHtml, config);
  assert.equal(holders.length, 1);
  assert.equal(holders[0]?.displayName, expected);
  assert.equal(holders[0]?.vacant, false);
  assert.equal(holders[0]?.officeTitle, "Governor of Florida");
  assert.equal(holders[0]?.seatKey, "us-fl-governor");
  assert.equal(holders[0]?.officeKind, "governor");
  const vacant = parseOfficialProfile(
    `<html><head><meta property="og:title" content="Governor Vacant" /></head><body><h1>Vacant</h1></body></html>`,
    config,
  );
  assert.equal(vacant[0]?.vacant, true);
  assert.equal(vacant[0]?.displayName, "Vacant");
  const parsed = parseWithParserFamily({
    config,
    html: governorHtml,
    bytes: new TextEncoder().encode(governorHtml),
    sourceUrl: config.baseUrl,
  });
  assert.equal(parsed.verificationState, "extracted");
  assert.equal(/desantis/i.test(readFileSync(path.join(repoRoot, "workers/cloudflare/shared/src/parser-families.ts"), "utf8")), false);
});

test("collector persists governor seat/person/occupancy/contract from fixture HTML with no network", async () => {
  const store = createMemoryStore();
  const config = sourceAdapter("florida-governor-official")!;
  const expected = occupantNameFromFixture(governorHtml);
  const result = await runCollectorJob({
    store,
    message: createQueueJobMessage({
      jobId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      dedupeKey: "ingest:florida-governor-official:fixture",
      route: "ingest",
      sourceKey: "florida-governor-official",
      sourceUrl: config.baseUrl,
      attempt: 0,
      scheduledFor: "2026-09-02T00:00:00.000Z",
      dryRun: false,
    }),
    bucket: createMemoryBucket(),
    worker: { workerKey: "civiclenz-collector", runtime: "test" },
    fetchImpl: async () => new Response(governorHtml, { status: 200, headers: { "content-type": "text/html" } }),
  });
  assert.equal(result.status, "collected");
  assert.equal(result.extractedCount, 1);
  const seats = await store.listSeats();
  assert.equal(seats.length, 1);
  assert.equal(seats[0]?.seatName, "Governor of Florida");
  assert.equal(seats[0]?.seatKey, "us-fl-governor");
  assert.equal(seats[0]?.researchContractKey, "STATE_GOVERNOR");
  const people = await store.listPersons();
  assert.equal(people.length, 1);
  assert.equal(people[0]?.canonicalName, expected);
  assert.equal(people.some((person) => person.canonicalName.toLowerCase() === "vacant"), false);
  const occupancies = await store.listOccupancies();
  assert.equal(occupancies[0]?.occupancyStatus, "current");
  const contracts = await store.listResearchContracts();
  assert.ok(contracts.some((row) => row.contractKey === "STATE_GOVERNOR"));
  const claims = await store.listClaims();
  assert.ok(claims.some((claim) => claim.fieldKey === "current_occupant" && claim.displayValue === expected));
  assert.equal(claims.some((claim) => claim.verificationState === "verified"), false);
  assert.ok(
    claims.some(
      (claim) =>
        claim.verificationState === "checked_no_authoritative_result" ||
        claim.verificationState === "not_collected",
    ),
  );
  const portrait = claims.find((claim) => claim.fieldKey === "portrait");
  assert.ok(portrait);
  assert.notEqual(portrait?.verificationState, "verified");
  const monitoring = await store.listMonitoringState();
  assert.ok(monitoring.some((row) => row.active && row.seatId === seats[0]?.seatId));
  const [audit] = await auditCompleteness(store, { seatId: seats[0]?.seatId, personId: people[0]?.personId });
  assert.ok(audit?.knownGaps.length || audit?.fields.some((field) => field.capabilityState === "NOT_IMPLEMENTED"));
  assert.equal(audit?.dimensions.VERIFICATION.summary.includes("not VERIFIED"), true);
});

test("publication eligibility requires evidence and does not auto-verify non-.gov portraits", () => {
  assert.equal(
    isPublicationEligible({
      verificationState: "verified",
      hasEvidence: true,
      hasContradiction: false,
      entityMatched: true,
    }),
    true,
  );
  assert.equal(
    isPublicationEligible({
      verificationState: "verified",
      hasEvidence: false,
      hasContradiction: false,
      entityMatched: true,
    }),
    false,
  );
  assert.equal(
    canAutoVerify({
      authorityTier: "TIER_1_PRIMARY_OFFICIAL",
      schemaCertified: false,
      uniqueEntityMatch: true,
      hasEvidence: true,
      hasContradiction: false,
    }),
    false,
  );
  const eligible = getPublicationEligibleClaimsForSubject(
    {
      persons: [{ person_id: "p-1", canonical_name: occupantNameFromFixture(governorHtml) }],
      seats: [{ seat_id: "seat-1" }],
      claims: [
        { claim_id: "cl-1", subject_type: "person", subject_id: "p-1", field_key: "portrait", display_value: "https://www.flgov.com/p.png", verification_state: "verified" },
        { claim_id: "cl-2", subject_type: "person", subject_id: "p-1", field_key: "biography", display_value: "unreviewed", verification_state: "collected_unreviewed" },
      ],
      evidence: [{ evidence_id: "ev-1", verification_state: "collected_unreviewed" }],
      claimEvidence: [],
    },
    "person",
    "p-1",
  );
  assert.equal(eligible.length, 0);
  const withEvidence = getPublicationEligibleClaimsForSubject(
    {
      persons: [{ person_id: "p-1", canonical_name: occupantNameFromFixture(governorHtml) }],
      claims: [
        { claim_id: "cl-1", subject_type: "person", subject_id: "p-1", field_key: "current_occupant", display_value: occupantNameFromFixture(governorHtml), verification_state: "verified" },
      ],
      evidence: [{ evidence_id: "ev-1", verification_state: "verified" }],
      claimEvidence: [{ claim_id: "cl-1", evidence_id: "ev-1" }],
    },
    "person",
    "p-1",
  );
  assert.equal(withEvidence.length, 1);
});

test("Florida Senate cohort gate blocks auto-enqueue and leaves firstWaveActive false", () => {
  const blocked = evaluateCohortGate({ cohortKey: "florida-senate" });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.autoEnqueue, false);
  assert.equal(blocked.firstWaveActive, false);
  assert.equal(blocked.bulkFloridaEnabled, false);
  assert.equal(senateAutoEnqueueBlocked(blocked), true);
  const resumed = evaluateCohortGate({
    cohortKey: "florida-senate",
    operatorResume: true,
    priorCohortsStable: { "florida-governor-fixture": true },
    metrics: {
      schemaMismatch: true,
      unexpectedZeroRecordParse: true,
      deadLetterCount: 3,
    },
  });
  assert.equal(resumed.allowed, false);
  assert.ok(resumed.blockers.includes("schema_mismatch"));
  assert.equal(sourceAdapter("florida-senate-members")?.firstWaveActive, false);
  assert.equal(sourceAdapter("florida-house-members")?.firstWaveActive, false);
});

test("dataset reconciliation is fail-closed and never marks finance complete", () => {
  const finance = reconcileDataset({
    datasetType: "campaign_finance",
    subjectType: "person",
    subjectId: "p-1",
    collectedUnits: 12,
    expectedUnits: 12,
    missingUnits: [],
  });
  assert.equal(finance.completionState, "checked_no_authoritative_result");
  assert.equal(financeMustNotBeComplete(finance), true);
  assert.equal(isEverythingOnTheInternetComplete(finance), false);
});

test("READY capabilities are not ACTIVE without a matching worker_run", () => {
  assert.equal(runtimeCapabilityState("officeholder_discovery", []), "READY");
  assert.equal(
    runtimeCapabilityState("officeholder_discovery", [
      {
        workerRunId: "r1",
        workerKey: "civiclenz-collector",
        runtime: "test",
        status: "succeeded",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        recordsRead: 1,
        recordsWritten: 1,
        claimsVerified: 0,
        metadata: { capability: "officeholder_discovery" },
      },
    ]),
    "ACTIVE",
  );
  assert.equal(runtimeCapabilityState("campaign_finance", []), "NOT_IMPLEMENTED");
});

test("application logic does not hardcode the fixture occupant name", () => {
  assert.equal(/desantis/i.test(appLogicSources()), false);
});
