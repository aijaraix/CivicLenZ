import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { dispatchSourceAdapter, parseFloridaDirectoryHtml, sourceDiscoveryRemainsUnverified } from "../shared/src/adapters.ts";
import { AUTHORITY_TIERS, canIndependentlyVerify, mapRegistryTier } from "../shared/src/authority.ts";
import { nextCheckAt } from "../shared/src/cadence.ts";
import { capabilityState, queueForCapability } from "../shared/src/capabilities.ts";
import { httpUnchanged, retrievalUnchanged } from "../shared/src/change-detection.ts";
import { runCollectorJob } from "../shared/src/collector.ts";
import { buildCompleteness, presenceForClaim, verificationBucket } from "../shared/src/completeness.ts";
import { controlPlaneSnapshot } from "../shared/src/control-plane.ts";
import { createDeadLetterPayload } from "../shared/src/dead-letter.ts";
import { applyWinnerOccupancy, recordCandidate, upsertElectionDate, withdrawCandidate } from "../shared/src/elections.ts";
import { CivicError } from "../shared/src/errors.ts";
import { fetchDocument } from "../shared/src/http.ts";
import { createMemoryBucket } from "../shared/src/memory-bucket.ts";
import { PERSON_IDENTITY_PRIORITY, resolveIdentity } from "../shared/src/persons.ts";
import { portraitSourceDecision } from "../shared/src/portraits.ts";
import { isPublicationEligible } from "../shared/src/claims.ts";
import { createQueueJobMessage } from "../shared/src/queue-messages.ts";
import { backoffMs, canRequest, recordFailure } from "../shared/src/rate-limit.ts";
import { planAndEnqueue } from "../shared/src/scheduler.ts";
import { firstWaveSourceAdapters, parserCoveredSources, sourceAdapter } from "../shared/src/source-config.ts";
import { createMemoryStore } from "../shared/src/store.ts";
import { canAutoVerify, planClaimTransition } from "../shared/src/validation.ts";
import {
  assertPublicRead,
  getCandidatesForElection,
  getCompletenessForSubject,
  getElection,
  getEvidenceForClaim,
  getMonitoringSummary,
  getOfficialForSeat,
  getPerson,
  getSeat,
  getVerifiedClaimsForSubject,
  isInternalTable,
  verifiedClaimsOnly,
} from "../../../lib/civic-data/public.ts";
import { cloudflareConsumesHeavy, createRailwayHeavyPayload } from "../shared/src/heavy.ts";
import { newsCanIndependentlyVerify, NEWS_WORKER_STATE } from "../shared/src/news.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

function ingestMessage() {
  return createQueueJobMessage({
    jobId: "11111111-1111-4111-8111-111111111111",
    dedupeKey: "ingest:miami-dade-county-elected-officials:2026-09-01",
    route: "ingest",
    sourceKey: "miami-dade-county-elected-officials",
    sourceUrl: "https://www.miamidade.gov/elections/library/reports/elected-officials.pdf",
    attempt: 0,
    scheduledFor: "2026-09-01T00:00:00.000Z",
    dryRun: false,
  });
}

test("lease hardening rejects non-positive lease seconds and pins search_path", () => {
  const sql = readFileSync(path.join(repoRoot, "supabase/migrations/202609020002_atomic_job_leasing.sql"), "utf8");
  assert.match(sql, /IF p_lease_seconds IS NULL OR p_lease_seconds <= 0/);
  assert.match(sql, /SET search_path = pg_catalog, public/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.lease_due_job/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.lease_due_job\(text, integer, uuid\) TO service_role/);
  assert.match(sql, /p_job_id uuid DEFAULT NULL/);
  const local = readFileSync(path.join(repoRoot, "supabase/migrations/202609020001_civic_collection_runtime.sql"), "utf8");
  assert.match(local, /SET search_path = pg_catalog, public/);
});

test("source adapter dispatch uses registered Florida HTML_DIRECTORY parsers and fail-closes unknown keys", async () => {
  const senate = sourceAdapter("florida-senate-members");
  assert.ok(senate);
  const html = readFileSync(path.join(repoRoot, "tests/fixtures/florida_senate_directory.html"), "utf8");
  assert.equal(parseFloridaDirectoryHtml(html, senate).filter((item) => !item.vacant).length, 2);
  await assert.rejects(
    () => dispatchSourceAdapter({ sourceKey: "no-such-source", bytes: new Uint8Array(), sourceUrl: "https://example.gov" }),
    (error: unknown) => error instanceof CivicError && error.errorClass === "parser_failure",
  );
  assert.equal(sourceDiscoveryRemainsUnverified(), true);
  assert.equal(firstWaveSourceAdapters().every((item) => item.sourceKey === "miami-dade-county-elected-officials"), true);
  assert.ok(parserCoveredSources().some((item) => item.sourceKey === "miami-dade-county-elected-officials"));
});

test("authority tiers: TIER_5 cannot independently verify", () => {
  assert.equal(AUTHORITY_TIERS.includes("TIER_5_DISCOVERY_ONLY"), true);
  assert.equal(canIndependentlyVerify("TIER_5_DISCOVERY_ONLY"), false);
  assert.equal(canIndependentlyVerify("TIER_1_PRIMARY_OFFICIAL"), true);
  assert.equal(mapRegistryTier("primary_official"), "TIER_1_PRIMARY_OFFICIAL");
});

test("ETag 304 and Last-Modified/hash unchanged skip new claims", async () => {
  const store = createMemoryStore();
  const bytes = readFileSync(path.join(repoRoot, "tests/fixtures/miami_dade_elected_officials.html"));
  const first = await runCollectorJob({
    store,
    message: ingestMessage(),
    bucket: createMemoryBucket(),
    worker: { workerKey: "civiclenz-collector", runtime: "test" },
    fetchImpl: async () =>
      new Response(bytes, { status: 200, headers: { etag: '"abc"', "content-type": "text/html", "last-modified": "Tue, 01 Sep 2026 00:00:00 GMT" } }),
  });
  assert.equal(first.status, "collected");
  const second = await runCollectorJob({
    store,
    message: ingestMessage(),
    bucket: createMemoryBucket(),
    worker: { workerKey: "civiclenz-collector", runtime: "test" },
    fetchImpl: async () => new Response(null, { status: 304, headers: { etag: '"abc"' } }),
  });
  assert.equal(second.status, "unchanged");
  assert.equal(httpUnchanged(304), true);
  assert.equal(retrievalUnchanged({ contentHash: first.sha256 }, { contentHash: first.sha256 }), true);
  assert.equal(retrievalUnchanged({ lastModified: "x" }, { lastModified: "x" }), true);
});

test("duplicate raw retrieval hash does not invent a second retrieval row", async () => {
  const store = createMemoryStore();
  const bytes = readFileSync(path.join(repoRoot, "tests/fixtures/miami_dade_elected_officials.html"));
  const fetchImpl = async () => new Response(bytes, { status: 200, headers: { "content-type": "text/html" } });
  await runCollectorJob({
    store,
    message: ingestMessage(),
    bucket: createMemoryBucket(),
    worker: { workerKey: "civiclenz-collector", runtime: "test" },
    fetchImpl,
  });
  await runCollectorJob({
    store,
    message: ingestMessage(),
    bucket: createMemoryBucket(),
    worker: { workerKey: "civiclenz-collector", runtime: "test" },
    fetchImpl,
  });
  assert.equal((await store.listRetrievals()).length, 1);
});

test("collector fail-closed on HTTP error and R2 write failure", async () => {
  const store = createMemoryStore();
  const httpFail = await runCollectorJob({
    store,
    message: ingestMessage(),
    bucket: createMemoryBucket(),
    worker: { workerKey: "civiclenz-collector", runtime: "test" },
    fetchImpl: async () => new Response("nope", { status: 503 }),
  });
  assert.equal(httpFail.status, "failed");
  const r2Fail = await runCollectorJob({
    store,
    message: ingestMessage(),
    bucket: {
      async put() {
        throw new Error("R2 unavailable");
      },
    },
    worker: { workerKey: "civiclenz-collector", runtime: "test" },
    fetchImpl: async () => new Response("ok", { status: 200, headers: { "content-type": "text/html" } }),
  });
  assert.ok(r2Fail.status === "failed" || r2Fail.status === "dead_letter");
  assert.equal(r2Fail.errorClass, "r2_write_failed");
});

test("parser failure and capability queue mapping", async () => {
  await assert.rejects(
    () =>
      dispatchSourceAdapter({
        sourceKey: "fec-api",
        bytes: new TextEncoder().encode("{}"),
        sourceUrl: "https://api.open.fec.gov/v1/",
      }),
    (error: unknown) => error instanceof CivicError && error.routeHeavy === true,
  );
  assert.equal(queueForCapability("seat_discovery"), "ingest");
  assert.equal(queueForCapability("candidate_filing_check"), "monitor");
  assert.equal(queueForCapability("evidence_validation"), "validate");
  assert.equal(queueForCapability("large_pdf_parse"), "heavy");
  assert.equal(capabilityState("officeholder_discovery"), "READY");
  assert.equal(capabilityState("campaign_finance"), "NOT_IMPLEMENTED");
});

test("candidate creation, withdrawal, winner occupancy, and election date change", async () => {
  const store = createMemoryStore();
  const jurisdiction = await store.upsertJurisdiction({
    jurisdictionKey: "us-fl",
    name: "Florida",
    jurisdictionType: "state",
  });
  const seat = await store.upsertSeat({
    seatKey: "us-fl-governor",
    seatName: "Governor",
    officeType: "governor",
    governmentLevel: "state",
    jurisdictionId: jurisdiction.jurisdictionId,
    occupancyStatus: "unknown",
    baselineStatus: "unknown",
    monitoringActive: false,
  });
  const election = await store.upsertElection({
    seatId: seat.seatId,
    electionKey: "us-fl-governor-2026",
    electionType: "general",
    electionDate: "2026-11-03",
  });
  const incumbent = await store.upsertPerson({ canonicalName: "Incumbent One", seatId: seat.seatId });
  await store.upsertOccupancy({
    seatId: seat.seatId,
    personId: incumbent.personId,
    startDate: "2019-01-08",
    occupancyStatus: "current",
    evidenceState: "unreviewed",
  });
  const filed = await recordCandidate(store, {
    person: { canonicalName: "Challenger Two", seatId: seat.seatId, jurisdictionId: jurisdiction.jurisdictionId },
    seatId: seat.seatId,
    electionId: election.electionId,
    party: "NPA",
  });
  const withdrawn = await withdrawCandidate(store, filed.campaign, "2026-06-01");
  assert.equal(withdrawn.candidateStatus, "withdrawn");
  const winner = await applyWinnerOccupancy(store, {
    seatId: seat.seatId,
    winnerPersonId: incumbent.personId,
    electionId: election.electionId,
    startDate: "2027-01-05",
  });
  assert.equal(winner.personId, incumbent.personId);
  assert.equal(winner.occupancyStatus, "current");
  const occupancies = await store.listOccupancies();
  assert.equal(occupancies.filter((row) => row.occupancyStatus === "current").length, 1);
  const changed = await upsertElectionDate(store, {
    seatId: seat.seatId,
    electionKey: "us-fl-governor-2026",
    electionDate: "2026-11-10",
  });
  assert.equal(changed.dateChanged, true);
});

test("publication eligibility and auto-verify require tier-1 schema-certified evidence", () => {
  assert.equal(
    isPublicationEligible({ verificationState: "verified", hasEvidence: true, hasContradiction: false, entityMatched: true }),
    true,
  );
  assert.equal(
    canAutoVerify({
      authorityTier: "TIER_1_PRIMARY_OFFICIAL",
      schemaCertified: true,
      uniqueEntityMatch: true,
      hasEvidence: true,
      hasContradiction: false,
    }),
    true,
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
  const pending = planClaimTransition({
    claim: {
      claimId: "c",
      fieldKey: "current_occupant",
      verificationState: "verification_pending",
    },
    entityMatched: true,
    hasEvidence: true,
    hasContradiction: false,
    schemaCertified: false,
    authorityTier: "TIER_1_PRIMARY_OFFICIAL",
  });
  assert.equal(pending.to, "verification_pending");
});

test("source discovery stays unverified and portrait authority rejects search engines", () => {
  assert.equal(sourceDiscoveryRemainsUnverified(), true);
  assert.equal(sourceAdapter("broward-county-soe")?.coverage, "discovered");
  assert.equal(sourceAdapter("palm-beach-county-soe")?.coverage, "discovered");
  const search = portraitSourceDecision("https://www.google.com/imgres?imgurl=https://example.com/x.jpg");
  assert.equal(search.allowedForVerified, false);
  assert.equal(search.reason, "search_engine_image_rejected");
  const gov = portraitSourceDecision("https://www.flsenate.gov/Senators/photo.jpg");
  assert.equal(gov.allowedForVerified, true);
});

test("rate limiting, dead-letter, stale claim scheduling, and monitor cadence", async () => {
  const policy = { minIntervalMs: 1000, maxConcurrent: 1, circuitFailures: 2, circuitOpenMs: 60_000 };
  assert.equal(canRequest({ sourceKey: "x", lastRequestAt: Date.now(), consecutiveFailures: 0 }, policy), false);
  const opened = recordFailure({ sourceKey: "x", consecutiveFailures: 1 }, policy);
  assert.ok(opened.circuitOpenUntil);
  assert.ok(backoffMs(3, policy) > 1000);
  const dlq = createDeadLetterPayload({
    jobId: "job-1",
    jobType: "ingest",
    worker: "civiclenz-collector",
    sourceKey: "miami-dade-county-elected-officials",
    targetType: "source",
    targetId: "miami-dade-county-elected-officials",
    errorClass: "http_fetch_failed",
    errorMessage: "503",
    attemptCount: 5,
    payload: ingestMessage(),
  });
  assert.equal(dlq.jobType, "ingest");
  assert.equal(dlq.source, "miami-dade-county-elected-officials");
  assert.equal(dlq.target, "source:miami-dade-county-elected-officials");
  const store = createMemoryStore();
  const stale = await store.recordClaim({
    subjectType: "seat",
    subjectId: "11111111-1111-4111-8111-111111111111",
    fieldKey: "current_occupant",
    normalizedValue: "x",
    verificationState: "stale",
  });
  assert.equal(stale.verificationState, "stale");
  const now = new Date("2026-09-01T12:00:00Z");
  const plan = await planAndEnqueue({ store, now, dryRun: true });
  assert.equal(plan.dryRun, true);
  assert.equal(typeof plan.dueJobs, "number");
  assert.equal(plan.staleClaims, 1);
  assert.ok(plan.dueMonitoringTargets >= 3);
  const next = nextCheckAt({ refreshClass: "ELECTION_REALTIME", now, electionProximityDays: 3 });
  assert.ok(next.getTime() - now.getTime() <= 15 * 60 * 1000);
});

test("public civic adapter excludes internal tables; control plane uses persisted counts", async () => {
  assert.equal(isInternalTable("jobs"), true);
  assert.equal(isInternalTable("raw_retrievals"), true);
  assert.throws(() => assertPublicRead("jobs"), /internal table/);
  assert.deepEqual(
    verifiedClaimsOnly([
      { verification_state: "verified" },
      { verification_state: "collected_unreviewed" },
    ]).map((row) => row.verification_state),
    ["verified"],
  );
  const snapshot = {
    seats: [{ seat_id: "seat-1", seat_key: "us-fl-governor", seat_name: "Governor", office_type: "governor", government_level: "state", jurisdiction_id: "j-1", occupancy_status: "occupied", secret: "nope" }],
    persons: [{ person_id: "p-1", canonical_name: "Example Official", portrait_url: "https://example.gov/p.jpg" }],
    occupancies: [{ occupancy_id: "o-1", seat_id: "seat-1", person_id: "p-1", occupancy_status: "current" }],
    elections: [{ election_id: "e-1", election_key: "us-fl-governor-2026", seat_id: "seat-1", election_date: "2026-11-03" }],
    campaigns: [{ candidate_campaign_id: "c-1", person_id: "p-2", election_id: "e-1", seat_id: "seat-1" }],
    claims: [
      { claim_id: "cl-1", subject_type: "person", subject_id: "p-1", field_key: "current_occupant", display_value: "Example Official", verification_state: "verified" },
      { claim_id: "cl-2", subject_type: "person", subject_id: "p-1", field_key: "biography", display_value: "unreviewed", verification_state: "collected_unreviewed" },
    ],
    evidence: [{ evidence_id: "ev-1", evidence_type: "official_page", source_url: "https://example.gov", excerpt: "ok", verification_state: "verified", raw_object_uri: "hidden" }],
    claimEvidence: [{ claim_id: "cl-1", evidence_id: "ev-1" }],
    researchContractFields: [{ research_contract_field_id: "f", research_contract_id: "c", field_key: "current_occupant", required_for_baseline: true }],
    monitoringProjections: [{ subjectType: "seat", subjectId: "seat-1", coverage: "PRESENT" as const, overdue: false }],
  };
  assert.equal(getSeat(snapshot, "us-fl-governor")?.seat_key, "us-fl-governor");
  assert.equal("secret" in (getSeat(snapshot, "us-fl-governor") ?? {}), false);
  assert.equal(getOfficialForSeat(snapshot, "seat-1").person?.canonical_name, "Example Official");
  assert.equal(getOfficialForSeat(snapshot, "seat-1").verifiedClaims.length, 1);
  assert.equal(getPerson(snapshot, "p-1")?.canonical_name, "Example Official");
  assert.equal(getElection(snapshot, "us-fl-governor-2026")?.election_id, "e-1");
  assert.equal(getCandidatesForElection(snapshot, "e-1").length, 1);
  assert.equal(getVerifiedClaimsForSubject(snapshot, "person", "p-1").length, 1);
  assert.equal(getEvidenceForClaim(snapshot, "cl-1").length, 1);
  assert.equal(getEvidenceForClaim(snapshot, "cl-2").length, 0);
  assert.equal(getMonitoringSummary(snapshot, "seat", "seat-1").coverage, "PRESENT");
  assert.equal(getCompletenessForSubject(snapshot, { seatId: "seat-1", personId: "p-1" }).officeholderBaseline, "PRESENT");
  assert.equal(NEWS_WORKER_STATE, "PREPARE_ONLY");
  assert.equal(newsCanIndependentlyVerify(), false);
  assert.equal(cloudflareConsumesHeavy(), false);
  const heavy = createRailwayHeavyPayload({
    jobId: "h-1",
    jobType: "large_pdf_parse",
    attemptCount: 1,
    payloadSummary: { sourceKey: "fec-api" },
  });
  assert.equal(heavy.runtime, "railway");
  assert.equal(sourceAdapter("florida-attorney-general")?.coverage, "discovered");
  assert.equal(sourceAdapter("us-house-members")?.coverage, "discovered");
  const store = createMemoryStore();
  await store.upsertJurisdiction({ jurisdictionKey: "us-fl", name: "Florida", jurisdictionType: "state" });
  const snap = await controlPlaneSnapshot(store, new Date("2026-09-01T00:00:00Z"));
  assert.equal(snap.seatsDiscovered, 0);
  assert.equal(snap.verifiedClaims, 0);
  assert.equal(snap.jobsQueued, 0);
  assert.equal(presenceForClaim(undefined), "MISSING");
  assert.equal(verificationBucket(undefined), "NOT_CHECKED");
  const report = buildCompleteness({
    hasSeat: true,
    hasOccupancy: false,
    fields: [{ researchContractFieldId: "f", researchContractId: "c", fieldKey: "current_occupant", requiredForBaseline: true }],
    claims: [],
    evidenceLinked: 0,
    evidenceRequired: 1,
    hasMonitoring: false,
    hasCandidates: false,
    hasElection: false,
    staleClaims: 0,
    contradictions: 0,
  });
  assert.equal(report.seatDiscovery, "PRESENT");
  assert.equal(report.officeholderBaseline, "MISSING");
  assert.equal(report.requiredFieldPresence, 0);
});

test("identity resolver never merges on name alone and documents identifier priority", () => {
  assert.ok(PERSON_IDENTITY_PRIORITY.indexOf("bioguide") > PERSON_IDENTITY_PRIORITY.indexOf("fec"));
  const people = [
    { personId: "a", canonicalName: "John Smith" },
    { personId: "b", canonicalName: "John Smith" },
  ];
  const conflict = resolveIdentity({
    people,
    occupancies: [],
    seats: [],
    candidate: { canonicalName: "John Smith" },
  });
  assert.equal(conflict.status, "conflict");
  const unmatched = resolveIdentity({
    people: [],
    occupancies: [],
    seats: [],
    candidate: { canonicalName: "Jane Roe" },
  });
  assert.equal(unmatched.status, "unmatched");
});

test("site civic-data modules do not use .ts import extensions", () => {
  const publicSrc = readFileSync(path.join(repoRoot, "lib/civic-data/public.ts"), "utf8");
  const indexSrc = readFileSync(path.join(repoRoot, "lib/civic-data/index.ts"), "utf8");
  assert.doesNotMatch(publicSrc, /from ["'][^"']+\.ts["']/);
  assert.doesNotMatch(indexSrc, /from ["'][^"']+\.ts["']/);
});

test("scheduler DRY_RUN stays true in wrangler and If-None-Match is sent", async () => {
  const wrangler = readFileSync(path.join(repoRoot, "workers/cloudflare/scheduler/wrangler.jsonc"), "utf8");
  assert.match(wrangler, /"DRY_RUN": "true"/);
  let seen = "";
  await fetchDocument("https://www.miamidade.gov/elections/library/reports/elected-officials.pdf", {
    ifNoneMatch: '"abc"',
    fetchImpl: async (_url, init) => {
      seen = new Headers(init?.headers).get("If-None-Match") ?? "";
      return new Response(null, { status: 304, headers: { etag: '"abc"' } });
    },
  });
  assert.equal(seen, '"abc"');
});
