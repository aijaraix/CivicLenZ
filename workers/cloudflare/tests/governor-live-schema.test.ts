import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { persistExtractedHolders, runCollectorJob } from "../shared/src/collector.ts";
import { sha256Hex } from "../shared/src/hash.ts";
import { createMemoryBucket } from "../shared/src/memory-bucket.ts";
import { CONTROLLED_FLORIDA_GOVERNOR_RETRIEVAL_ID } from "../shared/src/operator-enqueue.ts";
import { parseOfficialProfile } from "../shared/src/parser-families.ts";
import { createQueueJobMessage } from "../shared/src/queue-messages.ts";
import { evidenceObjectKey, rawObjectUri } from "../shared/src/r2-keys.ts";
import { sourceAdapter } from "../shared/src/source-config.ts";
import { createMemoryStore } from "../shared/src/store.ts";
import {
  CLAIM_CONFIDENCE,
  CLAIM_EVIDENCE_ROLES,
  CLAIM_STATUSES,
  EVIDENCE_VERIFICATION_STATES,
  JOB_STATUSES,
  NEW_COLLECTED_EVIDENCE_VERIFICATION_STATE,
  type ExtractedOfficeholder,
} from "../shared/src/types.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const governorHtml = readFileSync(path.join(repoRoot, "tests/fixtures/florida_governor_official.html"), "utf8");
const collectorSrc = readFileSync(path.join(repoRoot, "workers/cloudflare/shared/src/collector.ts"), "utf8");

/**
 * Live Supabase CHECK allowed sets, queried 2026-09-02.
 * Encoded in this test — do not read production at test time.
 */
const LIVE_SEATS_BASELINE_STATUS = new Set([
  "undiscovered",
  "discovered",
  "seat_verified",
  "officeholder_pending",
  "baseline_research",
  "validation_pending",
  "conflict_review",
  "baseline_complete",
  "monitoring",
]);
const LIVE_SEATS_OCCUPANCY_STATUS = new Set(["occupied", "vacant", "acting", "disputed", "abolished", "unknown"]);
const LIVE_SEAT_OCCUPANCIES_OCCUPANCY_STATUS = new Set([
  "current",
  "upcoming",
  "completed",
  "vacant",
  "acting",
  "disputed",
]);
const LIVE_SEAT_OCCUPANCIES_EVIDENCE_STATE = new Set([
  "unverified",
  "pending",
  "verified",
  "conflict",
  "stale",
  "rejected",
]);
const LIVE_PERSONS_IDENTITY_STATUS = new Set([
  "unverified",
  "partially_verified",
  "verified",
  "conflict",
  "rejected",
]);
const LIVE_PERSONS_PORTRAIT_STATUS = new Set([
  "missing",
  "candidate",
  "verified",
  "rejected",
  "checked_no_authoritative_result",
]);
const LIVE_EVIDENCE_VERIFICATION_STATE = new Set(EVIDENCE_VERIFICATION_STATES);
const LIVE_CLAIMS_VERIFICATION_STATE = new Set(CLAIM_STATUSES);
const LIVE_CLAIMS_CONFIDENCE = new Set(CLAIM_CONFIDENCE);
const LIVE_CLAIMS_VOLATILITY = new Set(["immutable", "low_change", "medium_change", "high_change", "event_driven"]);
const LIVE_CLAIM_EVIDENCE_ROLE = new Set(CLAIM_EVIDENCE_ROLES);
const LIVE_JOBS_STATUS = new Set(JOB_STATUSES);
const LIVE_WORKER_RUNS_STATUS = new Set(["started", "succeeded", "failed", "degraded", "cancelled"]);
const LIVE_CONTRADICTIONS_STATUS = new Set(["open", "reviewing", "resolved", "dismissed"]);
const LIVE_CONTRADICTIONS_SEVERITY = new Set(["low", "normal", "high", "critical"]);

function occupantNameFromFixture(html: string): string {
  const match = html.match(/property="og:title" content="Governor ([^"]+)"/i);
  assert.ok(match?.[1], "fixture must contain an og:title occupant");
  return match[1].trim();
}

function governorHolder(overrides: Partial<ExtractedOfficeholder> = {}): ExtractedOfficeholder {
  const config = sourceAdapter("florida-governor-official")!;
  const [parsed] = parseOfficialProfile(governorHtml, config);
  assert.ok(parsed);
  return { ...parsed, ...overrides };
}

function ingestMessage(overrides: Record<string, unknown> = {}) {
  const config = sourceAdapter("florida-governor-official")!;
  return createQueueJobMessage({
    jobId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    dedupeKey: "ingest:florida-governor-official:fixture",
    route: "ingest",
    sourceKey: "florida-governor-official",
    sourceUrl: config.baseUrl,
    attempt: 0,
    scheduledFor: "2026-09-02T00:00:00.000Z",
    dryRun: false,
    ...overrides,
  });
}

function assertLivePersistedRows(store: ReturnType<typeof createMemoryStore>) {
  for (const seat of store.tables.seats.values()) {
    assert.ok(LIVE_SEATS_BASELINE_STATUS.has(seat.baselineStatus), `seats.baseline_status=${seat.baselineStatus}`);
    assert.ok(LIVE_SEATS_OCCUPANCY_STATUS.has(seat.occupancyStatus), `seats.occupancy_status=${seat.occupancyStatus}`);
    assert.notEqual(seat.baselineStatus, "officeholder_present");
    assert.notEqual(seat.baselineStatus, "seat_only");
    if (seat.termLengthMonths != null) assert.ok(seat.termLengthMonths > 0);
  }
  for (const person of store.tables.persons.values()) {
    if (person.identityStatus) {
      assert.ok(LIVE_PERSONS_IDENTITY_STATUS.has(person.identityStatus), person.identityStatus);
      assert.notEqual(person.identityStatus, "verified");
    }
    if (person.portraitStatus) {
      assert.ok(LIVE_PERSONS_PORTRAIT_STATUS.has(person.portraitStatus), person.portraitStatus);
      assert.notEqual(person.portraitStatus, "verified");
    }
  }
  for (const occupancy of store.tables.occupancies.values()) {
    assert.ok(
      LIVE_SEAT_OCCUPANCIES_OCCUPANCY_STATUS.has(occupancy.occupancyStatus),
      `seat_occupancies.occupancy_status=${occupancy.occupancyStatus}`,
    );
    assert.ok(
      LIVE_SEAT_OCCUPANCIES_EVIDENCE_STATE.has(occupancy.evidenceState),
      `seat_occupancies.evidence_state=${occupancy.evidenceState}`,
    );
    assert.notEqual(occupancy.occupancyStatus, "former");
    assert.notEqual(occupancy.occupancyStatus, "occupied");
    assert.notEqual(occupancy.occupancyStatus, "unknown");
    assert.notEqual(occupancy.evidenceState, "unreviewed");
    assert.notEqual(occupancy.evidenceState, "verified");
  }
  for (const evidence of store.tables.evidence.values()) {
    assert.ok(LIVE_EVIDENCE_VERIFICATION_STATE.has(evidence.verificationState), evidence.verificationState);
    assert.notEqual(evidence.verificationState, "collected_unreviewed");
    assert.notEqual(evidence.verificationState, "verified");
    assert.ok(evidence.evidenceType);
  }
  for (const claim of store.tables.claims.values()) {
    assert.ok(LIVE_CLAIMS_VERIFICATION_STATE.has(claim.verificationState), claim.verificationState);
    assert.notEqual(claim.verificationState, "verified");
    if (claim.confidence !== undefined) {
      assert.equal(typeof claim.confidence, "string");
      assert.ok(LIVE_CLAIMS_CONFIDENCE.has(claim.confidence), String(claim.confidence));
    }
    if (claim.volatilityClass) {
      assert.ok(LIVE_CLAIMS_VOLATILITY.has(claim.volatilityClass), claim.volatilityClass);
    }
    assert.ok(claim.subjectType);
  }
  for (const link of store.tables.claimEvidence) {
    assert.ok(LIVE_CLAIM_EVIDENCE_ROLE.has(link.role as (typeof CLAIM_EVIDENCE_ROLES)[number]), String(link.role));
  }
  for (const contradiction of store.tables.contradictions) {
    if (contradiction.severity) {
      assert.ok(LIVE_CONTRADICTIONS_SEVERITY.has(contradiction.severity), contradiction.severity);
    }
  }
  for (const job of store.tables.jobs.values()) {
    assert.ok(LIVE_JOBS_STATUS.has(job.status), job.status);
  }
  for (const run of store.tables.workerRuns) {
    assert.ok(LIVE_WORKER_RUNS_STATUS.has(run.status), run.status);
  }
  for (const jurisdiction of store.tables.jurisdictions.values()) {
    if (jurisdiction.stateCode) assert.match(jurisdiction.stateCode, /^[A-Z]{2}$/);
  }
}

async function persistHolders(store: ReturnType<typeof createMemoryStore>, holders: ExtractedOfficeholder[]) {
  const source = await store.recordSource({
    sourceKey: "florida-governor-official",
    name: "Florida Governor — official executive site",
    sourceUrl: "https://www.flgov.com/",
    sourceType: "official_profile_page",
    authorityTier: "TIER_1_PRIMARY_OFFICIAL",
    host: "www.flgov.com",
    active: true,
    healthState: "ok",
  });
  const retrieval = await store.recordRawRetrieval({
    sourceId: source.sourceId,
    retrievedAt: "2026-09-02T00:00:00.000Z",
    sourceUrl: "https://www.flgov.com/",
    contentHash: "a".repeat(64),
    retrievalStatus: "stored",
  });
  await persistExtractedHolders(store, {
    sourceKey: "florida-governor-official",
    sourceUrl: "https://www.flgov.com/",
    sourceId: source.sourceId,
    retrievalId: retrieval.retrievalId,
    contentHash: retrieval.contentHash,
    assetUri: "r2://civiclenzevidence/raw/florida-governor-official/fixture.html",
    holders,
  });
}

test("occupied Governor persist writes live-legal baseline and occupancy enums", async () => {
  const store = createMemoryStore();
  const config = sourceAdapter("florida-governor-official")!;
  const expected = occupantNameFromFixture(governorHtml);
  const result = await runCollectorJob({
    store,
    message: ingestMessage(),
    bucket: createMemoryBucket(),
    worker: { workerKey: "civiclenz-collector", runtime: "test" },
    fetchImpl: async () => new Response(governorHtml, { status: 200, headers: { "content-type": "text/html" } }),
  });
  assert.equal(result.status, "collected");
  const seats = await store.listSeats();
  assert.equal(seats[0]?.baselineStatus, "officeholder_pending");
  assert.equal(seats[0]?.occupancyStatus, "occupied");
  assert.equal(seats[0]?.officeType, "governor");
  assert.equal(seats[0]?.governmentLevel, "state");
  assert.equal(seats[0]?.branch, "executive");
  assert.equal(seats[0]?.researchContractKey, "STATE_GOVERNOR");
  const occupancies = await store.listOccupancies();
  assert.equal(occupancies[0]?.occupancyStatus, "current");
  assert.equal(occupancies[0]?.evidenceState, "pending");
  const evidence = await store.listEvidence();
  assert.ok(evidence.length > 0);
  assert.ok(evidence.every((row) => row.verificationState === "pending"));
  const claims = await store.listClaims();
  assert.ok(claims.some((claim) => claim.fieldKey === "current_occupant" && claim.verificationState === "collected_unreviewed"));
  assert.ok(claims.every((claim) => claim.verificationState !== "verified"));
  assert.ok(claims.every((claim) => typeof claim.confidence !== "number"));
  const people = await store.listPersons();
  assert.equal(people[0]?.canonicalName, expected);
  const contracts = await store.listResearchContracts();
  assert.ok(contracts.some((row) => row.contractKey === "STATE_GOVERNOR" && row.officeClass === "STATE_GOVERNOR"));
  const monitoring = await store.listMonitoringState();
  assert.ok(monitoring.some((row) => row.active && (row.targetType === "source" || row.seatId === seats[0]?.seatId)));
  assert.equal(config.coverage, "parser");
  assertLivePersistedRows(store);
});

test("vacant Governor seat persist uses discovered/vacant and does not invent an occupant", async () => {
  const store = createMemoryStore();
  const config = sourceAdapter("florida-governor-official")!;
  const vacantHtml = `<html><head><meta property="og:title" content="Governor Vacant" /></head><body><h1>Vacant</h1></body></html>`;
  const result = await runCollectorJob({
    store,
    message: ingestMessage({ jobId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" }),
    bucket: createMemoryBucket(),
    worker: { workerKey: "civiclenz-collector", runtime: "test" },
    fetchImpl: async () => new Response(vacantHtml, { status: 200, headers: { "content-type": "text/html" } }),
  });
  assert.equal(result.status, "collected");
  const seats = await store.listSeats();
  assert.equal(seats[0]?.baselineStatus, "discovered");
  assert.equal(seats[0]?.occupancyStatus, "vacant");
  assert.equal((await store.listPersons()).length, 0);
  const claims = await store.listClaims();
  assert.ok(claims.some((claim) => claim.fieldKey === "current_occupant" && claim.normalizedValue === "vacant"));
  assert.ok(claims.some((claim) => claim.verificationState === "collected_unreviewed"));
  const evidence = await store.listEvidence();
  assert.ok(evidence.every((row) => row.verificationState === NEW_COLLECTED_EVIDENCE_VERIFICATION_STATE));
  assert.equal(config.parserFamily, "OFFICIAL_PROFILE");
  assertLivePersistedRows(store);
});

test("acting occupancy persist uses occupancy_status acting and pending evidence_state", async () => {
  const store = createMemoryStore();
  await persistHolders(store, [governorHolder({ occupancyStatus: "acting" })]);
  const occupancies = await store.listOccupancies();
  assert.equal(occupancies[0]?.occupancyStatus, "acting");
  assert.equal(occupancies[0]?.evidenceState, "pending");
  const seats = await store.listSeats();
  assert.equal(seats[0]?.occupancyStatus, "acting");
  assert.equal(seats[0]?.baselineStatus, "officeholder_pending");
  assertLivePersistedRows(store);
});

test("completed historical occupancy persist maps former to completed", async () => {
  const store = createMemoryStore();
  await persistHolders(store, [
    governorHolder({
      displayName: "Former Officeholder",
      vacant: true,
      occupancyStatus: "former",
      endDate: "2019-01-08",
    }),
  ]);
  const occupancies = await store.listOccupancies();
  assert.equal(occupancies[0]?.occupancyStatus, "completed");
  assert.equal(occupancies[0]?.evidenceState, "pending");
  const seats = await store.listSeats();
  assert.equal(seats[0]?.baselineStatus, "discovered");
  assert.equal(seats[0]?.occupancyStatus, "vacant");
  assertLivePersistedRows(store);
});

test("Governor coverage=parser with zero holders fail-closes and writes no seats", async () => {
  const store = createMemoryStore();
  const result = await runCollectorJob({
    store,
    message: ingestMessage({ jobId: "ffffffff-ffff-4fff-8fff-ffffffffffff" }),
    bucket: createMemoryBucket(),
    worker: { workerKey: "civiclenz-collector", runtime: "test" },
    fetchImpl: async () =>
      new Response("<html><head><title>empty</title></head><body></body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
  });
  assert.equal(result.status, "dead_letter");
  assert.equal(result.errorClass, "parser_failure");
  assert.equal((await store.listSeats()).length, 0);
  assert.equal((await store.listPersons()).length, 0);
  assert.equal((await store.listOccupancies()).length, 0);
});

test("unchanged hash/etag resumes the same raw_retrievals row instead of inserting another", async () => {
  const store = createMemoryStore();
  const config = sourceAdapter("florida-governor-official")!;
  const bytes = new TextEncoder().encode(governorHtml);
  const digest = await sha256Hex(bytes);
  const source = await store.recordSource({
    sourceKey: "florida-governor-official",
    name: config.sourceName,
    sourceUrl: config.baseUrl,
    active: true,
    healthState: "ok",
  });
  const retrievedAt = "2026-09-02T00:00:00.000Z";
  const r2Key = evidenceObjectKey({
    sourceKey: "florida-governor-official",
    retrievedAt,
    sha256: digest,
    contentType: "text/html",
  });
  const retrieval = await store.recordRawRetrieval({
    retrievalId: CONTROLLED_FLORIDA_GOVERNOR_RETRIEVAL_ID,
    sourceId: source.sourceId,
    retrievedAt,
    sourceUrl: config.baseUrl,
    httpStatus: 200,
    contentType: "text/html",
    etag: '"gov-etag"',
    contentHash: digest,
    rawObjectUri: rawObjectUri("civiclenzevidence", r2Key),
    byteLength: bytes.byteLength,
    retrievalStatus: "stored",
  });
  const bucket = createMemoryBucket();
  await bucket.put(r2Key, bytes, { contentType: "text/html" });
  const result = await runCollectorJob({
    store,
    message: ingestMessage(),
    bucket,
    worker: { workerKey: "civiclenz-collector", runtime: "test" },
    fetchImpl: async () =>
      new Response(governorHtml, { status: 200, headers: { "content-type": "text/html", etag: '"gov-etag"' } }),
  });
  assert.equal(result.status, "collected");
  const retrievals = await store.listRetrievals();
  assert.equal(retrievals.length, 1);
  assert.equal(retrievals[0]?.retrievalId, retrieval.retrievalId);
  assert.equal(retrievals[0]?.retrievalId, CONTROLLED_FLORIDA_GOVERNOR_RETRIEVAL_ID);
  assert.ok((await store.listSeats()).length > 0);
});

test("collector persist literals stay inside live CHECKs and no longer emit illegal values", () => {
  assert.equal(collectorSrc.includes("officeholder_present"), false);
  assert.equal(collectorSrc.includes("seat_only"), false);
  assert.equal(/evidenceState:\s*"unreviewed"/.test(collectorSrc), false);
  assert.equal(/occupancyStatus:\s*"former"/.test(collectorSrc), false);
  assert.equal(LIVE_EVIDENCE_VERIFICATION_STATE.has("collected_unreviewed"), false);
  assert.equal(LIVE_CLAIMS_VERIFICATION_STATE.has("collected_unreviewed"), true);
  assert.equal(LIVE_CONTRADICTIONS_STATUS.has("open"), true);
  const evidenceBlocks = [...collectorSrc.matchAll(/recordEvidence\(\{([\s\S]*?)\}\)/g)].map((match) => match[1]);
  assert.ok(evidenceBlocks.length >= 2);
  for (const block of evidenceBlocks) {
    assert.equal(block.includes("collected_unreviewed"), false);
    assert.ok(
      block.includes("NEW_COLLECTED_EVIDENCE_VERIFICATION_STATE") || block.includes('"pending"'),
      "new evidence must be pending",
    );
  }
});
