import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { canTransitionClaim, isPublicationEligible, transitionClaim } from "../shared/src/claims.ts";
import { isRetrievalDownstreamComplete } from "../shared/src/change-detection.ts";
import { runCollectorJob } from "../shared/src/collector.ts";
import { createDeadLetterPayload, shouldDeadLetter } from "../shared/src/dead-letter.ts";
import { CivicError, DuplicateClaimError, HttpFetchError } from "../shared/src/errors.ts";
import { sha256Hex, isSha256Hex } from "../shared/src/hash.ts";
import { classifyDocument, fetchDocument } from "../shared/src/http.ts";
import {
  electionMonitorDedupeKey,
  hasActiveJob,
  ingestDedupeKey,
  monitorDedupeKey,
  shouldEnqueueJob,
  validateDedupeKey,
} from "../shared/src/jobs.ts";
import { matchCandidateCampaign, matchPerson, matchSeat, reusePersonForWinningCandidate } from "../shared/src/matching.ts";
import { createMemoryBucket } from "../shared/src/memory-bucket.ts";
import { parseMiamiDadeDirectory } from "../shared/src/miami-dade.ts";
import { extractOfficeholders, extractHtmlText } from "../shared/src/parsers.ts";
import { extractTextOperators } from "../shared/src/pdf-text.ts";
import { portraitSourceDecision } from "../shared/src/portraits.ts";
import { createQueueJobMessage, parseQueueJobMessage } from "../shared/src/queue-messages.ts";
import { evidenceObjectKey, rawObjectUri } from "../shared/src/r2-keys.ts";
import { upsertBaselineResearchContract } from "../shared/src/research.ts";
import { planAndEnqueue } from "../shared/src/scheduler.ts";
import { CONTROLLED_SLICE_SOURCES, firstWaveIngestSources } from "../shared/src/slice.ts";
import {
  GLOBAL_FORBIDDEN_WRITE_COLUMNS,
  LIVE_TABLE_COLUMNS,
  assertLiveWrite,
  campaignRow,
  claimRow,
  evidenceRow,
  jobRow,
  jurisdictionRow,
  occupancyRow,
  personRow,
  retrievalRow,
  seatRow,
  sourceRow,
} from "../shared/src/live-rows.ts";
import { createMemoryStore, isWorkerActive } from "../shared/src/store.ts";
import { createSupabaseStore } from "../shared/src/supabase-store.ts";
import type { PersonRecord, QueueJobMessage, SeatRecord } from "../shared/src/types.ts";
import { planClaimTransition, runValidatorJob, validateClaim } from "../shared/src/validation.ts";
import { withWorkerRun } from "../shared/src/worker-lifecycle.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const miamiFixture = path.join(repoRoot, "tests/fixtures/miami_dade_elected_officials.html");

function worker() {
  return { workerKey: "civiclenz-collector", runtime: "test" as const, deploymentId: "test-deploy" };
}

function ingestMessage(overrides: Partial<QueueJobMessage> = {}): QueueJobMessage {
  return createQueueJobMessage({
    jobId: "11111111-1111-4111-8111-111111111111",
    dedupeKey: "ingest:miami-dade-county-elected-officials:2026-09-01",
    route: "ingest",
    sourceKey: "miami-dade-county-elected-officials",
    sourceUrl: "https://www.miamidade.gov/elections/library/reports/elected-officials.pdf",
    attempt: 0,
    scheduledFor: "2026-09-01T00:00:00.000Z",
    dryRun: false,
    ...overrides,
  });
}

test("repo root has no wrangler config that could bind the website", () => {
  assert.equal(existsSync(path.join(repoRoot, "wrangler.toml")), false);
  assert.equal(existsSync(path.join(repoRoot, "wrangler.jsonc")), false);
  assert.equal(existsSync(path.join(repoRoot, "wrangler.json")), false);
});

test("queue message schema accepts a complete job and rejects a bad route", () => {
  const message = ingestMessage();
  assert.equal(message.schemaVersion, "1.0.0");
  assert.equal(parseQueueJobMessage(message).route, "ingest");
  assert.throws(() => parseQueueJobMessage({ ...message, route: "magic" }), /route/);
  assert.throws(() => parseQueueJobMessage({ ...message, dryRun: "yes" }), /dryRun/);
});

test("job dedupe never enqueues a second active job", async () => {
  const store = createMemoryStore();
  const now = new Date("2026-09-01T12:00:00Z");
  const key = ingestDedupeKey("miami-dade-county-elected-officials", now);
  const first = await store.scheduleJob({ dedupeKey: key, route: "ingest", sourceKey: "miami-dade-county-elected-officials" });
  const second = await store.scheduleJob({ dedupeKey: key, route: "ingest", sourceKey: "miami-dade-county-elected-officials" });
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.job.jobId, first.job.jobId);
  assert.equal(first.job.status, "queued");
  assert.equal(hasActiveJob(await store.listJobs(), key), true);
  assert.equal(shouldEnqueueJob(first.job), false);
  await store.completeJob(first.job.jobId);
  assert.equal(hasActiveJob(await store.listJobs(), key), false);
});

test("R2 key generation and SHA-256 are deterministic", async () => {
  const bytes = new TextEncoder().encode("civiclenz-evidence");
  const digest = await sha256Hex(bytes);
  assert.equal(isSha256Hex(digest), true);
  assert.equal(
    evidenceObjectKey({
      sourceKey: "miami-dade-county-elected-officials",
      retrievedAt: "2026-09-01T15:04:05Z",
      sha256: digest,
      contentType: "application/pdf",
    }),
    `raw/miami-dade-county-elected-officials/2026/09/01/${digest}.pdf`,
  );
});

test("failed HTTP and non-200 responses fail closed", async () => {
  await assert.rejects(
    () =>
      fetchDocument("https://www.miamidade.gov/missing", {
        fetchImpl: async () => {
          throw new Error("connect reset");
        },
      }),
    (error: unknown) => error instanceof HttpFetchError && error.errorClass === "http_fetch_failed",
  );
  await assert.rejects(
    () =>
      fetchDocument("https://www.miamidade.gov/missing", {
        fetchImpl: async () => new Response("nope", { status: 404 }),
      }),
    (error: unknown) => error instanceof HttpFetchError && error.httpStatus === 404,
  );
  await assert.rejects(
    () =>
      fetchDocument("https://www.miamidade.gov/missing", {
        fetchImpl: async () => new Response("accepted", { status: 201 }),
      }),
    (error: unknown) => error instanceof HttpFetchError && error.httpStatus === 201,
  );
});

test("parser failure does not invent officeholders", async () => {
  await assert.rejects(
    () => extractOfficeholders({ sourceKey: "unknown-source", bytes: new TextEncoder().encode("{}"), contentType: "application/json" }),
    (error: unknown) => error instanceof CivicError && error.errorClass === "parser_failure",
  );
});

test("Supabase write failure is classified and does not look like success", async () => {
  const store = createSupabaseStore({
    url: "https://example.supabase.co",
    serviceRoleKey: "service-role-test-key",
    fetchImpl: async () => new Response(JSON.stringify({ message: "row-level security" }), { status: 401 }),
  });
  await assert.rejects(
    () => store.recordSource({ sourceKey: "x", name: "x", sourceUrl: "https://example.gov", active: true, healthState: "unknown" }),
    (error: unknown) => error instanceof CivicError && error.errorClass === "supabase_write_failed",
  );
});

test("seat, person, and winning-candidate matching reuse the existing person", () => {
  const seats: SeatRecord[] = [
    {
      seatId: "seat-1",
      seatKey: "us-fl-governor",
      jurisdictionId: "fl",
      seatName: "Governor of Florida",
      officeType: "governor",
      governmentLevel: "state",
      occupancyStatus: "unknown",
      baselineStatus: "unknown",
      monitoringActive: false,
    },
  ];
  const people: PersonRecord[] = [
    {
      personId: "person-1",
      canonicalName: "Ron DeSantis",
    },
  ];
  assert.equal(matchSeat(seats, { jurisdictionId: "fl", officeType: "governor" }).status, "matched");
  assert.equal(matchPerson(people, { displayName: "Ron DeSantis" }).record?.personId, "person-1");
  const reused = reusePersonForWinningCandidate({
    existingOccupant: people[0],
    existingPerson: { ...people[0], personId: "other" },
  });
  assert.equal(reused?.personId, "person-1");
  const campaign = matchCandidateCampaign(
    [{ candidateCampaignId: "c1", electionId: "e1", seatId: "seat-1", personId: "person-1" }],
    { electionId: "e1", seatId: "seat-1", personId: "person-1" },
  );
  assert.equal(campaign.status, "matched");
});

test("claim lifecycle walks legal hops and rejects illegal ones", () => {
  assert.equal(canTransitionClaim("collected_unreviewed", "extracted"), true);
  assert.equal(canTransitionClaim("collected_unreviewed", "verified"), false);
  assert.throws(() => transitionClaim("collected_unreviewed", "verified"), /illegal claim transition/);
  assert.equal(isPublicationEligible({ verificationState: "verified", hasEvidence: true, hasContradiction: false, entityMatched: true }), true);
  assert.equal(isPublicationEligible({ verificationState: "extracted", hasEvidence: true, hasContradiction: false, entityMatched: true }), false);
});

test("validation rejection and evidence-backed-not-verified", async () => {
  const store = createMemoryStore();
  const claim = await store.recordClaim({
    subjectType: "seat",
    subjectId: "11111111-1111-4111-8111-111111111111",
    seatId: "11111111-1111-4111-8111-111111111111",
    fieldKey: "test_force_reject",
    normalizedValue: "schema_mismatch",
    displayValue: "schema_mismatch",
    verificationState: "verification_pending",
  });
  const rejected = await validateClaim(store, claim);
  assert.equal(rejected.to, "rejected");
  assert.equal(rejected.publicationEligible, false);

  const pending = await store.recordClaim({
    subjectType: "seat",
    subjectId: "22222222-2222-4222-8222-222222222222",
    seatId: "22222222-2222-4222-8222-222222222222",
    fieldKey: "current_occupant",
    normalizedValue: "Example Person",
    displayValue: "Example Person",
    verificationState: "verification_pending",
  });
  await store.recordEvidence({
    retrievalId: "33333333-3333-4333-8333-333333333333",
    evidenceType: "pdf",
    sourceUrl: "https://www.miamidade.gov/elections/library/reports/elected-officials.pdf",
    contentHash: "a".repeat(64),
    verificationState: "collected_unreviewed",
  });
  const plan = planClaimTransition({
    claim: pending,
    entityMatched: true,
    hasEvidence: true,
    hasContradiction: false,
  });
  assert.equal(plan.to, "verification_pending");
  assert.match(plan.reason, /not_auto_verified|evidence_backed/);
});

test("dead-letter payload is complete and never silent", () => {
  const payload = createDeadLetterPayload({
    jobId: "job-1",
    worker: "civiclenz-collector",
    sourceKey: "miami-dade-county-elected-officials",
    errorClass: "http_fetch_failed",
    errorMessage: "source returned HTTP 503",
    attemptCount: 5,
    timestamp: "2026-09-01T00:00:00.000Z",
    payload: ingestMessage({ attempt: 4 }),
  });
  assert.equal(payload.jobId, "job-1");
  assert.equal(payload.worker, "civiclenz-collector");
  assert.equal(payload.source, "miami-dade-county-elected-officials");
  assert.equal(payload.errorClass, "http_fetch_failed");
  assert.equal(payload.attemptCount, 5);
  assert.ok(payload.payloadSummary.dedupeKey);
  assert.ok(payload.timestamp);
  assert.equal(shouldDeadLetter(1, true), false);
  assert.equal(shouldDeadLetter(5, true), true);
  assert.equal(shouldDeadLetter(1, false), true);
});

test("election and monitor scheduling uses one job per window", async () => {
  const store = createMemoryStore();
  const sent: unknown[] = [];
  const now = new Date("2026-09-01T12:00:00Z");
  const plan = await planAndEnqueue({
    store,
    now,
    dryRun: false,
    queues: {
      ingest: { async send(message) { sent.push(message); } },
      monitor: { async send(message) { sent.push(message); } },
    },
  });
  assert.ok(plan.scheduled.some((job) => job.dedupeKey === ingestDedupeKey("miami-dade-county-elected-officials", now)));
  assert.ok(plan.scheduled.some((job) => job.dedupeKey === electionMonitorDedupeKey("us-fl", now)));
  assert.ok(plan.scheduled.some((job) => job.dedupeKey === monitorDedupeKey("jurisdiction", "us-fl-broward", "daily", now)));
  const again = await planAndEnqueue({ store, now, dryRun: false, queues: { ingest: { async send() {} } } });
  assert.ok(again.skippedActive.length > 0);
  assert.equal(firstWaveIngestSources().length, 1);
});

test("Miami-Dade fixture maps county seats only and skips school/federal/state/city inventions", async () => {
  const html = readFileSync(miamiFixture, "utf8");
  const records = parseMiamiDadeDirectory(extractHtmlText(html));
  const names = records.map((item) => item.displayName);
  assert.equal(records[0]?.displayName, "Daniella Levine Cava");
  assert.equal(records[0]?.officeTitle, "Mayor of Miami-Dade County");
  assert.ok(names.includes("Juan Fernandez-Barquin"));
  assert.ok(names.includes('Rosanna "Rosie" Cordero-Stutz'));
  assert.equal(names.includes("Ron DeSantis"), false);
  assert.equal(names.includes("Bryan Avila"), false);
  assert.equal(names.includes("Steve Gallon, III"), false);
  assert.equal(names.includes("Lovey Clayton"), false);
  assert.equal(names.includes("Should Not Appear"), false);
  assert.equal(records.some((item) => item.officeTitle.toLowerCase().includes("school")), false);
  assert.equal(records.length, 19);
  const holders = await extractOfficeholders({
    sourceKey: "miami-dade-county-elected-officials",
    bytes: readFileSync(miamiFixture),
    contentType: "text/html",
  });
  assert.equal(holders.length, 19);
});

test("collector fetch stores R2 object, raw retrieval, and unreviewed claims; HTTP 200 is not VERIFIED", async () => {
  const store = createMemoryStore();
  await store.scheduleJob({
    dedupeKey: ingestMessage().dedupeKey,
    route: "ingest",
    sourceKey: ingestMessage().sourceKey,
  });
  const bucket = createMemoryBucket();
  const bytes = readFileSync(miamiFixture);
  const result = await runCollectorJob({
    store,
    message: ingestMessage(),
    bucket,
    worker: worker(),
    fetchImpl: async () =>
      new Response(bytes, {
        status: 200,
        headers: {
          "content-type": "text/html",
          etag: "W/\"abc\"",
          "last-modified": "Tue, 01 Sep 2026 00:00:00 GMT",
        },
      }),
  });
  assert.equal(result.status, "collected");
  assert.ok(result.r2Key?.startsWith("raw/miami-dade-county-elected-officials/"));
  assert.ok(result.sha256 && isSha256Hex(result.sha256));
  assert.equal(bucket.objects.has(result.r2Key ?? ""), true);
  const retrievals = await store.listRetrievals();
  assert.equal(retrievals[0]?.httpStatus, 200);
  assert.equal(retrievals[0]?.etag, "W/\"abc\"");
  assert.equal(retrievals[0]?.contentHash, result.sha256);
  assert.ok(retrievals[0]?.rawObjectUri?.startsWith("r2://civiclenzevidence/"));
  const claims = await store.listClaims();
  const occupantClaims = claims.filter((claim) => claim.fieldKey === "current_occupant");
  assert.ok(occupantClaims.length >= 19);
  assert.ok(occupantClaims.every((claim) => claim.verificationState === "collected_unreviewed"));
  assert.equal(claims.some((claim) => claim.verificationState === "verified"), false);
  const validated = await runValidatorJob({
    store,
    message: createQueueJobMessage({
      jobId: "22222222-2222-4222-8222-222222222222",
      dedupeKey: validateDedupeKey(result.retrievalId ?? "missing"),
      route: "validate",
      retrievalId: result.retrievalId,
      attempt: 0,
      scheduledFor: "2026-09-01T00:00:00.000Z",
      dryRun: false,
    }),
  });
  assert.equal(validated.claimsVerified, 0);
  assert.ok(validated.outcomes.every((item) => item.to !== "verified"));
});

test("Ron DeSantis is a baseline research test, not special-case worker code", async () => {
  const schedulerSrc = readFileSync(path.join(repoRoot, "workers/cloudflare/scheduler/src/index.ts"), "utf8");
  const collectorSrc = readFileSync(path.join(repoRoot, "workers/cloudflare/collector/src/index.ts"), "utf8");
  const validatorSrc = readFileSync(path.join(repoRoot, "workers/cloudflare/validator/src/index.ts"), "utf8");
  assert.equal(/desantis/i.test(schedulerSrc + collectorSrc + validatorSrc), false);
  const store = createMemoryStore();
  const seeded = await upsertBaselineResearchContract(store, {
    jurisdictionKey: "us-fl",
    jurisdictionName: "Florida",
    seatKey: "us-fl-governor",
    seatName: "Governor of Florida",
    officeType: "governor",
    governmentLevel: "state",
    personDisplayName: "Ron DeSantis",
    officialWebsite: "https://www.flgov.com/",
    portraitUrl: "https://www.flgov.com/wp-content/uploads/governor.jpg",
  });
  assert.equal(seeded.jurisdiction.jurisdictionKey, "us-fl");
  assert.equal(seeded.seat.seatKey, "us-fl-governor");
  assert.equal(seeded.person.canonicalName, "Ron DeSantis");
  assert.equal(seeded.occupancy.occupancyStatus, "unknown");
  assert.equal(seeded.occupancyClaim.verificationState, "collected_unreviewed");
  assert.equal(seeded.portraitDecision.allowedForVerified, false);
  assert.equal(seeded.portraitDecision.reason, "not_official_gov_host");
  assert.equal(seeded.contract.active, true);
  const openFields = seeded.fields.filter((field) => field.category === "open");
  assert.ok(openFields.length >= 3);
  assert.equal(seeded.monitoring.targetType, "seat");
  assert.equal(seeded.monitoring.targetId, seeded.seat.seatId);
  assert.equal(seeded.monitoring.configuration.seatKey, "us-fl-governor");
  const searchPortrait = portraitSourceDecision("https://www.google.com/imgres?imgurl=https://example.com/x.jpg");
  assert.equal(searchPortrait.allowedForVerified, false);
  assert.equal(searchPortrait.reason, "search_engine_image_rejected");
  const govPortrait = portraitSourceDecision("https://www.flgov.com/portrait.jpg");
  assert.equal(govPortrait.allowedForVerified, false);
});

test("worker ACTIVE requires a recent successful real job, not a declared agent", async () => {
  const store = createMemoryStore();
  await store.recordWorkerRun({
    workerKey: "civiclenz-collector",
    runtime: "test",
    status: "started",
    startedAt: new Date().toISOString(),
    recordsRead: 0,
    recordsWritten: 0,
    claimsVerified: 0,
    metadata: {},
  });
  assert.equal(isWorkerActive(await store.listWorkerRuns(), new Date()), false);
  await store.recordWorkerRun({
    workerKey: "civiclenz-collector",
    runtime: "test",
    status: "succeeded",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    recordsRead: 19,
    recordsWritten: 19,
    claimsVerified: 0,
    metadata: {},
  });
  assert.equal(isWorkerActive(await store.listWorkerRuns(), new Date()), true);
});

test("slice URLs stay aligned with source-registry.json", () => {
  const registry = JSON.parse(readFileSync(path.join(repoRoot, "data/sources/source-registry.json"), "utf8")) as {
    sources: Array<{ sourceKey: string; url?: string; urls?: string[]; enabled: boolean }>;
  };
  for (const slice of CONTROLLED_SLICE_SOURCES) {
    const registered = registry.sources.find((item) => item.sourceKey === slice.sourceKey);
    assert.ok(registered, slice.sourceKey);
    const urls = [registered?.url, ...(registered?.urls ?? [])].filter(Boolean);
    if (slice.sourceKey !== "florida-statewide-executive") {
      assert.ok(urls.includes(slice.url), slice.sourceKey);
    }
    assert.equal(registered?.enabled, slice.enabledInRegistry);
  }
});

test("PDF text operator extraction and document classification", () => {
  const text = extractTextOperators("(Mayor) Tj\n[(Daniella) 10 ( Levine Cava)] TJ");
  assert.match(text, /Mayor/);
  assert.match(text, /Daniella Levine Cava/);
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
  assert.equal(classifyDocument(pdf, "application/pdf"), "small_pdf");
});

test("collector routes oversized or unreadable PDF work to heavy, never consumes it", async () => {
  const store = createMemoryStore();
  const heavy: unknown[] = [];
  const result = await runCollectorJob({
    store,
    message: ingestMessage(),
    bucket: createMemoryBucket(),
    worker: worker(),
    queues: { heavy: { async send(message) { heavy.push(message); } } },
    fetchImpl: async () =>
      new Response(new Uint8Array(8), {
        status: 200,
        headers: { "content-length": String(20 * 1024 * 1024), "content-type": "application/pdf" },
      }),
  });
  assert.equal(result.status, "routed_heavy");
  assert.equal(heavy.length, 1);
});

test("each Worker directory has its own wrangler config and no accidental civiclenz worker name", () => {
  for (const name of ["scheduler", "collector", "validator"]) {
    const config = JSON.parse(
      readFileSync(path.join(repoRoot, "workers/cloudflare", name, "wrangler.jsonc"), "utf8").replace(/\/\/.*$/gm, ""),
    ) as { name: string };
    assert.equal(config.name, `civiclenz-${name}`);
    assert.notEqual(config.name, "civiclenz");
  }
  const names = readdirSync(path.join(repoRoot, "workers/cloudflare"));
  assert.ok(names.includes("scheduler"));
  assert.ok(names.includes("collector"));
  assert.ok(names.includes("validator"));
});

test("schema-contract builders refuse invented columns that live tables do not have", () => {
  const payloads: Array<[string, Record<string, unknown>]> = [
    ["jurisdictions", jurisdictionRow({ jurisdictionKey: "us-fl", name: "Florida", jurisdictionType: "state" })],
    [
      "seats",
      seatRow({
        seatKey: "us-fl-governor",
        seatName: "Governor",
        jurisdictionId: "11111111-1111-4111-8111-111111111111",
        officeType: "governor",
        occupancyStatus: "unknown",
        baselineStatus: "unknown",
        monitoringActive: false,
      }),
    ],
    ["persons", personRow({ canonicalName: "Example Person" })],
    [
      "seat_occupancies",
      occupancyRow({
        seatId: "11111111-1111-4111-8111-111111111111",
        personId: "22222222-2222-4222-8222-222222222222",
        occupancyStatus: "unknown",
        evidenceState: "unreviewed",
      }),
    ],
    [
      "raw_retrievals",
      retrievalRow({
        sourceId: "11111111-1111-4111-8111-111111111111",
        retrievedAt: "2026-09-01T00:00:00.000Z",
        sourceUrl: "https://example.gov",
        contentHash: "a".repeat(64),
        rawObjectUri: "r2://civiclenzevidence/raw/x/a.pdf",
        retrievalStatus: "stored",
      }),
    ],
    [
      "evidence_objects",
      evidenceRow({
        contentHash: "a".repeat(64),
        retrievalId: "11111111-1111-4111-8111-111111111111",
        verificationState: "collected_unreviewed",
      }),
    ],
    [
      "claims",
      claimRow({
        subjectType: "seat",
        subjectId: "11111111-1111-4111-8111-111111111111",
        fieldKey: "current_occupant",
        verificationState: "collected_unreviewed",
      }),
    ],
    [
      "jobs",
      jobRow({
        jobType: "ingest",
        status: "queued",
        dedupeKey: "ingest:x",
        payload: { sourceKey: "x" },
      }),
    ],
    [
      "candidate_campaigns",
      campaignRow({
        personId: "11111111-1111-4111-8111-111111111111",
        seatId: "22222222-2222-4222-8222-222222222222",
        electionId: "33333333-3333-4333-8333-333333333333",
      }),
    ],
    ["sources", sourceRow({ sourceKey: "x", name: "x", sourceUrl: "https://example.gov", active: true })],
  ];
  for (const [table, payload] of payloads) {
    assertLiveWrite(table, payload);
    for (const column of GLOBAL_FORBIDDEN_WRITE_COLUMNS) {
      assert.equal(column in payload, false, `${table} must not write ${column}`);
    }
    for (const column of Object.keys(payload)) {
      assert.ok(LIVE_TABLE_COLUMNS[table].includes(column), `${table}.${column} is not a live column`);
    }
  }
  assert.throws(() => assertLiveWrite("claims", { id: "x", claim_key: "k", field_key: "x" }), /not live|unknown/);
  assert.throws(() => assertLiveWrite("jobs", { route: "ingest", status: "queued" }), /route/);
  assert.throws(() => assertLiveWrite("persons", { person_key: "p", canonical_name: "n" }), /person_key/);
  assert.throws(() => assertLiveWrite("raw_retrievals", { content_sha256: "a", source_id: "s" }), /content_sha256/);
  assert.throws(() => assertLiveWrite("raw_retrievals", { r2_key: "k", source_id: "s" }), /r2_key/);
  assert.throws(() => assertLiveWrite("seats", { record_status: "extracted", seat_key: "x" }), /record_status/);
});

test("supabase-store write bodies never include invented columns", async () => {
  const bodies: Array<{ path: string; body: unknown }> = [];
  const store = createSupabaseStore({
    url: "https://example.supabase.co",
    serviceRoleKey: "service-role-test-key",
    fetchImpl: async (input, init) => {
      const path = String(input);
      const parsed = init?.body ? JSON.parse(String(init.body)) : {};
      bodies.push({ path, body: parsed });
      const representation = path.includes("rpc/lease_due_job")
        ? []
        : [
            {
              jurisdiction_id: "11111111-1111-4111-8111-111111111111",
              jurisdiction_key: "us-fl",
              name: "Florida",
              jurisdiction_type: "state",
              status: "active",
              seat_id: "22222222-2222-4222-8222-222222222222",
              seat_key: "us-fl-governor",
              seat_name: "Governor",
              person_id: "33333333-3333-4333-8333-333333333333",
              canonical_name: "Example",
              occupancy_id: "44444444-4444-4444-8444-444444444444",
              occupancy_status: "unknown",
              evidence_state: "unreviewed",
              source_id: "55555555-5555-4555-8555-555555555555",
              source_key: "x",
              source_url: "https://example.gov",
              active: true,
              health_state: "unknown",
              retrieval_id: "66666666-6666-4666-8666-666666666666",
              content_hash: "a".repeat(64),
              raw_object_uri: "r2://civiclenzevidence/raw/x/a.pdf",
              retrieval_status: "stored",
              retrieved_at: "2026-09-01T00:00:00.000Z",
              evidence_id: "77777777-7777-4777-8777-777777777777",
              verification_state: "collected_unreviewed",
              claim_id: "88888888-8888-4888-8888-888888888888",
              field_key: "current_occupant",
              job_id: "99999999-9999-4999-8999-999999999999",
              job_type: "ingest",
              dedupe_key: "ingest:x",
              payload: {},
              checkpoint: {},
              attempt_count: 0,
              max_attempts: 5,
              priority: 100,
              scheduled_for: "2026-09-01T00:00:00.000Z",
              worker_run_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              worker_key: "civiclenz-collector",
              runtime: "test",
              started_at: "2026-09-01T00:00:00.000Z",
              records_read: 0,
              records_written: 0,
              claims_verified: 0,
              metadata: {},
              monitoring_state_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              target_type: "source",
              target_id: "55555555-5555-4555-8555-555555555555",
              monitoring_class: "daily",
              consecutive_failures: 0,
              configuration: {},
              research_contract_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
              contract_key: "governor-baseline",
              office_class: "governor",
              version: "1",
              research_contract_field_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            },
          ];
      return new Response(JSON.stringify(representation), { status: 201 });
    },
  });
  await store.upsertJurisdiction({ jurisdictionKey: "us-fl", name: "Florida", jurisdictionType: "state" });
  await store.upsertSeat({
    seatKey: "us-fl-governor",
    seatName: "Governor",
    jurisdictionId: "11111111-1111-4111-8111-111111111111",
    officeType: "governor",
    governmentLevel: "state",
    occupancyStatus: "unknown",
    baselineStatus: "unknown",
    monitoringActive: false,
  });
  await store.upsertPerson({ canonicalName: "Example" });
  await store.recordSource({ sourceKey: "x", name: "x", sourceUrl: "https://example.gov", active: true, healthState: "ok" });
  await store.recordRawRetrieval({
    sourceId: "55555555-5555-4555-8555-555555555555",
    retrievedAt: "2026-09-01T00:00:00.000Z",
    sourceUrl: "https://example.gov",
    contentHash: "a".repeat(64),
    rawObjectUri: "r2://civiclenzevidence/raw/x/a.pdf",
    retrievalStatus: "stored",
  });
  await store.recordClaim({
    subjectType: "seat",
    subjectId: "22222222-2222-4222-8222-222222222222",
    fieldKey: "current_occupant",
    normalizedValue: "Example",
    verificationState: "collected_unreviewed",
  });
  await store.scheduleJob({ dedupeKey: "ingest:x:2026-09-01", route: "ingest", sourceKey: "x" });
  await store.leaseDueJob("civiclenz-collector");
  for (const item of bodies) {
    if (String(item.path).includes("/rpc/")) continue;
    const rows = Array.isArray(item.body) ? item.body : [item.body];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      for (const column of GLOBAL_FORBIDDEN_WRITE_COLUMNS) {
        assert.equal(column in row, false, `${item.path} wrote forbidden ${column}`);
      }
    }
  }
});

test("two concurrent leaseDueJob attempts claim exactly one queued job", async () => {
  const store = createMemoryStore();
  const { job } = await store.scheduleJob({
    dedupeKey: "ingest:concurrent:2026-09-01",
    route: "ingest",
    sourceKey: "miami-dade-county-elected-officials",
    scheduledFor: "2026-09-01T00:00:00.000Z",
  });
  const [first, second] = await Promise.all([
    store.leaseDueJob("worker-a"),
    store.leaseDueJob("worker-b"),
  ]);
  const winners = [first, second].filter(Boolean);
  assert.equal(winners.length, 1);
  assert.equal(winners[0]?.jobId, job.jobId);
  assert.equal(winners[0]?.status, "leased");
  assert.equal(winners[0]?.attemptCount, 1);
  const leftover = first && second ? null : first ? second : first;
  assert.equal(leftover, undefined);
  const leased = await store.leaseJob(job.jobId, "worker-c");
  assert.equal(leased, undefined);
});

test("workers and supabase adapter do not reference invented live columns", () => {
  const files = [
    "workers/cloudflare/shared/src/supabase-store.ts",
    "workers/cloudflare/shared/src/collector.ts",
    "workers/cloudflare/shared/src/research.ts",
    "workers/cloudflare/shared/src/validation.ts",
    "workers/cloudflare/shared/src/scheduler.ts",
    "workers/cloudflare/shared/src/store.ts",
  ];
  const forbiddenWriteTokens = [
    "content_sha256",
    "r2_key",
    "claim_key",
    "person_key",
    "record_status",
    "lease_owner",
    "dead_lettered",
    "raw_retrieval_id",
  ];
  for (const rel of files) {
    const src = readFileSync(path.join(repoRoot, rel), "utf8");
    for (const token of forbiddenWriteTokens) {
      assert.equal(src.includes(token), false, `${rel} still references ${token}`);
    }
    if (rel.endsWith("supabase-store.ts")) {
      assert.equal(/\broute:/.test(src), false, "supabase-store must not write jobs.route");
      assert.equal(src.includes("on_conflict=seat_id,person_id,start_date"), false);
      assert.equal(src.includes("seat_id,person_id,start_date"), false);
      assert.equal(src.includes("on_conflict=subject_type,subject_id,field_key,value_hash"), false);
      assert.ok(src.includes("rpc/lease_due_job"));
      assert.ok(src.includes("job_id="));
      assert.ok(src.includes("claim_id="));
    }
  }
  const migration = readFileSync(path.join(repoRoot, "supabase/migrations/202609020001_civic_collection_runtime.sql"), "utf8");
  assert.match(migration, /jurisdiction_id uuid PRIMARY KEY/);
  assert.match(migration, /seat_id uuid PRIMARY KEY/);
  assert.match(migration, /person_id uuid PRIMARY KEY/);
  assert.match(migration, /content_hash text/);
  assert.match(migration, /raw_object_uri text/);
  assert.doesNotMatch(migration, /content_sha256/);
  assert.doesNotMatch(migration, /\br2_key\b/);
  assert.doesNotMatch(migration, /\bclaim_key\b/);
  assert.doesNotMatch(migration, /^\s*UNIQUE \(seat_id, person_id, start_date\)/m);
  assert.doesNotMatch(migration, /^\s*UNIQUE \(canonical_name\)/m);
  assert.doesNotMatch(migration, /canonical_name text NOT NULL UNIQUE/);
  assert.match(migration, /occupancy_status IN \('current', 'acting'\)/);
});

test("occupancy upsert queries then updates; current/acting is one per seat", async () => {
  const store = createMemoryStore();
  const seatId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const firstPerson = await store.upsertPerson({ canonicalName: "Alex Rivera" });
  const secondPerson = await store.upsertPerson({ canonicalName: "Blair Chen" });
  const first = await store.upsertOccupancy({
    seatId,
    personId: firstPerson.personId,
    startDate: "2020-01-07",
    occupancyStatus: "current",
    evidenceState: "unreviewed",
  });
  const again = await store.upsertOccupancy({
    seatId,
    personId: firstPerson.personId,
    startDate: "2020-01-07",
    occupancyStatus: "current",
    evidenceState: "reviewed",
  });
  assert.equal(again.occupancyId, first.occupancyId);
  assert.equal(again.evidenceState, "reviewed");

  const successor = await store.upsertOccupancy({
    seatId,
    personId: secondPerson.personId,
    startDate: "2024-01-02",
    occupancyStatus: "current",
    evidenceState: "unreviewed",
  });
  const rows = await store.listOccupancies();
  assert.equal(rows.filter((row) => row.occupancyStatus === "current").length, 1);
  assert.equal(rows.find((row) => row.occupancyId === first.occupancyId)?.occupancyStatus, "former");
  assert.equal(successor.occupancyStatus, "current");
});

test("same person can hold two non-overlapping terms in the same seat", async () => {
  const store = createMemoryStore();
  const seatId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const person = await store.upsertPerson({ canonicalName: "Casey Ng" });
  const termOne = await store.upsertOccupancy({
    seatId,
    personId: person.personId,
    startDate: "2015-01-06",
    endDate: "2019-01-08",
    occupancyStatus: "former",
    evidenceState: "unreviewed",
  });
  const termTwo = await store.upsertOccupancy({
    seatId,
    personId: person.personId,
    startDate: "2023-01-03",
    occupancyStatus: "current",
    evidenceState: "unreviewed",
  });
  assert.notEqual(termOne.occupancyId, termTwo.occupancyId);
  const rows = (await store.listOccupancies()).filter((row) => row.personId === person.personId && row.seatId === seatId);
  assert.equal(rows.length, 2);
});

test("two different people with the same canonical_name stay two person_id rows", async () => {
  const store = createMemoryStore();
  const left = await store.upsertPerson({ canonicalName: "John Smith" });
  const right = await store.upsertPerson({ canonicalName: "John Smith" });
  assert.notEqual(left.personId, right.personId);
  assert.equal((await store.listPersons()).length, 2);
});

test("concurrent identified-person inserts re-query on collision instead of merging by name", async () => {
  const store = createMemoryStore();
  const [first, second] = await Promise.all([
    store.upsertPerson({
      canonicalName: "Ron DeSantis",
      externalIdentifiers: { bioguide: "D000647" },
    }),
    store.upsertPerson({
      canonicalName: "Ron DeSantis",
      externalIdentifiers: { bioguide: "D000647" },
    }),
  ]);
  assert.equal(first.personId, second.personId);
  assert.equal((await store.listPersons()).length, 1);

  const otherJohn = await store.upsertPerson({
    canonicalName: "Ron DeSantis",
    externalIdentifiers: { bioguide: "OTHER-PERSON" },
  });
  assert.notEqual(otherJohn.personId, first.personId);
  assert.equal((await store.listPersons()).length, 2);
});

test("name plus seat occupancy context reuses the occupant, not a namesake", async () => {
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
  const occupant = await store.upsertPerson({ canonicalName: "Jane Doe" });
  await store.upsertOccupancy({
    seatId: seat.seatId,
    personId: occupant.personId,
    occupancyStatus: "current",
    evidenceState: "unreviewed",
  });
  const namesake = await store.upsertPerson({ canonicalName: "Jane Doe" });
  assert.notEqual(namesake.personId, occupant.personId);
  const resolved = await store.upsertPerson({
    canonicalName: "Jane Doe",
    seatId: seat.seatId,
    jurisdictionId: jurisdiction.jurisdictionId,
  });
  assert.equal(resolved.personId, occupant.personId);
});

test("supabase occupancy writes never use on_conflict seat_id,person_id,start_date", async () => {
  const urls: string[] = [];
  const store = createSupabaseStore({
    url: "https://example.supabase.co",
    serviceRoleKey: "service-role-test-key",
    fetchImpl: async (input) => {
      urls.push(String(input));
      return new Response(JSON.stringify([]), { status: 200 });
    },
  });
  await store.upsertOccupancy({
    seatId: "11111111-1111-4111-8111-111111111111",
    personId: "22222222-2222-4222-8222-222222222222",
    startDate: "2024-01-02",
    occupancyStatus: "unknown",
    evidenceState: "unreviewed",
  }).catch(() => undefined);
  assert.equal(
    urls.some((url) => url.includes("on_conflict=seat_id,person_id,start_date")),
    false,
  );
  assert.equal(
    urls.some((url) => url.includes("seat_occupancies?") && url.includes("seat_id=eq.") && url.includes("person_id=eq.")),
    true,
  );
});

test("lease_due_job additive migration uses live job columns and SKIP LOCKED", () => {
  const additive = readFileSync(
    path.join(repoRoot, "supabase/migrations/202609020002_atomic_job_leasing.sql"),
    "utf8",
  );
  assert.match(additive, /CREATE OR REPLACE FUNCTION public\.lease_due_job/);
  assert.match(additive, /p_leased_by text/);
  assert.match(additive, /p_job_id uuid/);
  assert.match(additive, /FOR UPDATE SKIP LOCKED/);
  assert.match(additive, /LIMIT 1/);
  assert.match(additive, /j\.status = 'queued'/);
  assert.match(additive, /j\.status = 'leased' AND j\.lease_expires_at < now\(\)/);
  assert.match(additive, /leased_by = p_leased_by/);
  assert.match(additive, /attempt_count = attempt_count \+ 1/);
  assert.match(additive, /started_at = COALESCE\(started_at, now\(\)\)/);
  assert.match(additive, /RETURNS SETOF public\.jobs/);
  assert.match(additive, /SET search_path = pg_catalog, public/);
  assert.match(additive, /p_lease_seconds must be greater than zero/);
  assert.match(additive, /REVOKE ALL ON FUNCTION public\.lease_due_job/);
  assert.match(additive, /GRANT EXECUTE ON FUNCTION public\.lease_due_job\(text, integer, uuid\) TO service_role/);
  assert.doesNotMatch(additive, /DROP TABLE/);
  assert.doesNotMatch(additive, /DROP COLUMN/);
  assert.doesNotMatch(additive, /TRUNCATE/);
  assert.doesNotMatch(additive, /\broute\b/);
  for (const status of ["queued", "leased", "running", "succeeded", "failed", "dead_letter", "cancelled"]) {
    assert.match(
      readFileSync(path.join(repoRoot, "supabase/migrations/202609020001_civic_collection_runtime.sql"), "utf8"),
      new RegExp(status),
    );
  }
  assert.equal(
    readFileSync(path.join(repoRoot, "supabase/migrations/202609020003_proposed_historical_occupancy_unique.sql"), "utf8").includes(
      "PROPOSAL ONLY",
    ),
    true,
  );
});

test("expired lease is reclaimable; two racers still produce one winner", async () => {
  const store = createMemoryStore();
  const { job } = await store.scheduleJob({
    dedupeKey: "ingest:expired:2026-09-01",
    route: "ingest",
    sourceKey: "miami-dade-county-elected-officials",
    scheduledFor: "2026-09-01T00:00:00.000Z",
  });
  const firstLease = await store.leaseDueJob("worker-a");
  assert.equal(firstLease?.jobId, job.jobId);
  const current = store.tables.jobs.get(job.jobId);
  assert.ok(current);
  current.leaseExpiresAt = "2020-01-01T00:00:00.000Z";
  store.tables.jobs.set(job.jobId, current);
  const [winner, loser] = await Promise.all([store.leaseDueJob("worker-b"), store.leaseDueJob("worker-c")]);
  const claimed = [winner, loser].filter(Boolean);
  assert.equal(claimed.length, 1);
  assert.equal(claimed[0]?.jobId, job.jobId);
  assert.equal(claimed[0]?.leasedBy === "worker-b" || claimed[0]?.leasedBy === "worker-c", true);
  assert.equal(claimed[0]?.attemptCount, 2);
  assert.equal(claimed[0]?.status, "leased");
});

function liveClaimsOnlyPrimaryKeyStore(seed: Array<Record<string, unknown>> = []) {
  const claims = seed.map((row) => ({ ...row }));
  const urls: string[] = [];
  const methods: string[] = [];
  const store = createSupabaseStore({
    url: "https://example.supabase.co",
    serviceRoleKey: "service-role-test-key",
    fetchImpl: async (input, init) => {
      const url = String(input);
      urls.push(url);
      const method = (init?.method ?? "GET").toUpperCase();
      methods.push(method);
      if (url.includes("on_conflict=")) {
        return new Response(
          JSON.stringify({
            code: "42P10",
            message: "there is no unique or exclusion constraint matching the ON CONFLICT specification",
          }),
          { status: 400 },
        );
      }
      const parsedUrl = new URL(url);
      const table = parsedUrl.pathname.split("/").pop();
      const filters: Record<string, string> = {};
      for (const [key, value] of parsedUrl.searchParams.entries()) {
        if (value.startsWith("eq.")) filters[key] = value.slice(3);
      }
      const matches = (row: Record<string, unknown>) =>
        Object.entries(filters).every(([key, value]) => String(row[key] ?? "") === value);
      if (table === "contradictions" && method === "POST") {
        return new Response("[]", { status: 201 });
      }
      if (method === "GET") {
        return new Response(JSON.stringify(claims.filter(matches)), { status: 200 });
      }
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      if (method === "PATCH") {
        const updated = claims.filter(matches).map((row) => Object.assign(row, body));
        return new Response(JSON.stringify(updated), { status: 200 });
      }
      if (method === "POST") {
        const row = {
          ...body,
          claim_id: body.claim_id ?? "88888888-8888-4888-8888-888888888888",
        };
        claims.push(row);
        return new Response(JSON.stringify([row]), { status: 201 });
      }
      return new Response(JSON.stringify([]), { status: 200 });
    },
  });
  return { store, claims, urls, methods };
}

test("recordClaim works when live claims have only claims_pkey and never sends the 42P10 on_conflict", async () => {
  const { store, claims, urls, methods } = liveClaimsOnlyPrimaryKeyStore();
  const inserted = await store.recordClaim({
    subjectType: "source",
    subjectId: "55555555-5555-4555-8555-555555555555",
    fieldKey: "source_retrieval",
    normalizedValue: "eb86ff61-d2a5-44f7-a7b4-4ea8faafe0d3",
    displayValue: "https://www.miamidade.gov/elections/library/reports/elected-officials.pdf",
    valueHash: "b".repeat(64),
    verificationState: "collected_unreviewed",
  });
  assert.equal(inserted.claimId, "88888888-8888-4888-8888-888888888888");
  assert.equal(claims.length, 1);
  assert.equal(methods.includes("POST"), true);
  assert.equal(
    urls.some((url) => url.includes("on_conflict=subject_type,subject_id,field_key,value_hash")),
    false,
  );
  assert.equal(
    urls.some(
      (url) =>
        url.includes("claims?") &&
        url.includes("subject_type=eq.") &&
        url.includes("subject_id=eq.") &&
        url.includes("field_key=eq.") &&
        url.includes("value_hash=eq."),
    ),
    true,
  );
});

test("recordClaim PATCHes the existing identical claim by claim_id", async () => {
  const { store, claims, urls, methods } = liveClaimsOnlyPrimaryKeyStore([
    {
      claim_id: "88888888-8888-4888-8888-888888888888",
      subject_type: "source",
      subject_id: "55555555-5555-4555-8555-555555555555",
      field_key: "source_retrieval",
      value_hash: "b".repeat(64),
      verification_state: "verification_pending",
      supersedes_claim_id: "77777777-7777-4777-8777-777777777777",
      valid_from: "2026-01-01T00:00:00.000Z",
      volatility_class: "stable",
      first_seen_at: "2026-09-01T00:00:00.000Z",
    },
  ]);
  const updated = await store.recordClaim({
    subjectType: "source",
    subjectId: "55555555-5555-4555-8555-555555555555",
    fieldKey: "source_retrieval",
    normalizedValue: "eb86ff61-d2a5-44f7-a7b4-4ea8faafe0d3",
    displayValue: "https://www.miamidade.gov/elections/library/reports/elected-officials.pdf",
    valueHash: "b".repeat(64),
    verificationState: "collected_unreviewed",
  });
  assert.equal(updated.claimId, "88888888-8888-4888-8888-888888888888");
  assert.equal(updated.verificationState, "verification_pending");
  assert.equal(updated.supersedesClaimId, "77777777-7777-4777-8777-777777777777");
  assert.equal(updated.validFrom, "2026-01-01T00:00:00.000Z");
  assert.equal(updated.volatilityClass, "stable");
  assert.equal(claims.length, 1);
  assert.equal(methods.includes("PATCH"), true);
  assert.equal(methods.includes("POST"), false);
  assert.equal(
    urls.some((url) => url.includes("claims?") && url.includes("claim_id=eq.88888888-8888-4888-8888-888888888888")),
    true,
  );
  assert.equal(
    urls.some((url) => url.includes("on_conflict=subject_type,subject_id,field_key,value_hash")),
    false,
  );
});

test("recordClaim fail-closes when more than one live row matches the claim identity", async () => {
  const { store } = liveClaimsOnlyPrimaryKeyStore([
    {
      claim_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      subject_type: "source",
      subject_id: "55555555-5555-4555-8555-555555555555",
      field_key: "source_retrieval",
      value_hash: "b".repeat(64),
      verification_state: "collected_unreviewed",
    },
    {
      claim_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      subject_type: "source",
      subject_id: "55555555-5555-4555-8555-555555555555",
      field_key: "source_retrieval",
      value_hash: "b".repeat(64),
      verification_state: "collected_unreviewed",
    },
  ]);
  await assert.rejects(
    () =>
      store.recordClaim({
        subjectType: "source",
        subjectId: "55555555-5555-4555-8555-555555555555",
        fieldKey: "source_retrieval",
        normalizedValue: "eb86ff61-d2a5-44f7-a7b4-4ea8faafe0d3",
        valueHash: "b".repeat(64),
        verificationState: "collected_unreviewed",
      }),
    (error: unknown) =>
      error instanceof DuplicateClaimError &&
      error.errorClass === "duplicate_claim_rows" &&
      error.claimIds.length === 2,
  );

  const memory = createMemoryStore();
  const left = await memory.recordClaim({
    subjectType: "seat",
    subjectId: "11111111-1111-4111-8111-111111111111",
    fieldKey: "current_occupant",
    normalizedValue: "Example Person",
    valueHash: "c".repeat(64),
    verificationState: "collected_unreviewed",
  });
  memory.tables.claims.set("cccccccc-cccc-4ccc-8ccc-cccccccccccc", {
    ...left,
    claimId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  });
  await assert.rejects(
    () =>
      memory.recordClaim({
        subjectType: "seat",
        subjectId: "11111111-1111-4111-8111-111111111111",
        fieldKey: "current_occupant",
        normalizedValue: "Example Person",
        valueHash: "c".repeat(64),
        verificationState: "collected_unreviewed",
      }),
    (error: unknown) => error instanceof DuplicateClaimError && error.errorClass === "duplicate_claim_rows",
  );
  assert.equal((await memory.listContradictions()).length, 1);
});

test("completeJob succeeded clears leftover error_class and error_message", async () => {
  const store = createMemoryStore();
  const { job } = await store.scheduleJob({
    dedupeKey: "ingest:miami-dade-county-elected-officials:2026-09-02",
    route: "ingest",
    sourceKey: "miami-dade-county-elected-officials",
  });
  await store.failJob(job.jobId, "supabase_write_failed", "HTTP 400 Postgres 42P10");
  const failed = await store.getJob(job.jobId);
  assert.equal(failed?.status, "failed");
  assert.equal(failed?.errorClass, "supabase_write_failed");
  assert.ok(failed?.errorMessage);

  const done = await store.completeJob(job.jobId);
  assert.equal(done.status, "succeeded");
  assert.equal(done.errorClass, undefined);
  assert.equal(done.errorMessage, undefined);
  const stored = await store.getJob(job.jobId);
  assert.equal(stored?.status, "succeeded");
  assert.equal(stored?.errorClass, undefined);
  assert.equal(stored?.errorMessage, undefined);
});

test("supabase completeJob succeeded patches error fields to null", async () => {
  const bodies: Array<Record<string, unknown>> = [];
  const store = createSupabaseStore({
    url: "https://example.supabase.co",
    serviceRoleKey: "service-role-test-key",
    fetchImpl: async (input, init) => {
      const parsed = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      if ((init?.method ?? "GET").toUpperCase() === "PATCH") bodies.push(parsed);
      return new Response(
        JSON.stringify([
          {
            job_id: "7d93a416-1483-4550-b203-e8c424c289b7",
            job_type: "ingest",
            status: "succeeded",
            attempt_count: 2,
            max_attempts: 5,
            priority: 100,
            dedupe_key: "ingest:miami-dade-county-elected-officials:2026-09-02",
            payload: {},
            checkpoint: {},
            scheduled_for: "2026-09-02T00:00:00.000Z",
            error_class: parsed.error_class ?? null,
            error_message: parsed.error_message ?? null,
          },
        ]),
        { status: 200 },
      );
    },
  });
  const done = await store.completeJob("7d93a416-1483-4550-b203-e8c424c289b7");
  assert.equal(bodies.length, 1);
  assert.equal(bodies[0]?.status, "succeeded");
  assert.equal(bodies[0]?.error_class, null);
  assert.equal(bodies[0]?.error_message, null);
  assert.equal(done.status, "succeeded");
  assert.equal(done.errorClass, undefined);
  assert.equal(done.errorMessage, undefined);
});

test("stored retrieval with incomplete persist resumes downstream instead of short-circuiting", async () => {
  const store = createMemoryStore();
  const bytes = readFileSync(miamiFixture);
  const digest = await sha256Hex(bytes);
  const source = await store.recordSource({
    sourceKey: "miami-dade-county-elected-officials",
    name: "Miami-Dade County Elected Officials",
    sourceUrl: ingestMessage().sourceUrl ?? "https://www.miamidade.gov/elections/library/reports/elected-officials.pdf",
    active: true,
    healthState: "ok",
  });
  const retrievedAt = "2026-09-02T00:00:00.000Z";
  const r2Key = evidenceObjectKey({
    sourceKey: "miami-dade-county-elected-officials",
    retrievedAt,
    sha256: digest,
    contentType: "text/html",
  });
  const retrieval = await store.recordRawRetrieval({
    sourceId: source.sourceId,
    retrievedAt,
    sourceUrl: ingestMessage().sourceUrl ?? "https://www.miamidade.gov/elections/library/reports/elected-officials.pdf",
    httpStatus: 200,
    contentType: "text/html",
    etag: '"abc"',
    contentHash: digest,
    rawObjectUri: rawObjectUri("civiclenzevidence", r2Key),
    byteLength: bytes.byteLength,
    retrievalStatus: "stored",
  });
  const bucket = createMemoryBucket();
  await bucket.put(r2Key, bytes, { contentType: "text/html" });
  assert.equal(
    isRetrievalDownstreamComplete({
      retrieval,
      evidence: await store.listEvidence(),
      claims: await store.listClaims(),
      jurisdictions: await store.listJurisdictions(),
      seats: await store.listSeats(),
    }),
    false,
  );

  const hashMatch = await runCollectorJob({
    store,
    message: ingestMessage(),
    bucket,
    worker: worker(),
    fetchImpl: async () =>
      new Response(bytes, { status: 200, headers: { "content-type": "text/html", etag: '"abc"' } }),
  });
  assert.equal(hashMatch.status, "collected");
  assert.notEqual(hashMatch.status, "unchanged");
  assert.ok((hashMatch.claimsWritten ?? 0) >= 19);
  assert.equal((await store.listRetrievals()).length, 1);
  assert.equal((await store.listRetrievals())[0]?.retrievalId, retrieval.retrievalId);
  assert.equal((await store.listRetrievals())[0]?.retrievalStatus, "parsed");
  assert.ok((await store.listJurisdictions()).length > 0);
  assert.ok((await store.listSeats()).length > 0);
  assert.ok((await store.listClaims()).length > 0);
  assert.ok((await store.listEvidence()).length > 0);
});

test("incomplete stored retrieval plus 304 resumes from R2 and does not succeed with zero downstream records", async () => {
  const store = createMemoryStore();
  const bytes = readFileSync(miamiFixture);
  const digest = await sha256Hex(bytes);
  const source = await store.recordSource({
    sourceKey: "miami-dade-county-elected-officials",
    name: "Miami-Dade County Elected Officials",
    sourceUrl: ingestMessage().sourceUrl ?? "https://www.miamidade.gov/elections/library/reports/elected-officials.pdf",
    active: true,
    healthState: "ok",
  });
  const retrievedAt = "2026-09-02T00:00:00.000Z";
  const r2Key = evidenceObjectKey({
    sourceKey: "miami-dade-county-elected-officials",
    retrievedAt,
    sha256: digest,
    contentType: "text/html",
  });
  await store.recordRawRetrieval({
    retrievalId: "eb86ff61-d2a5-44f7-a7b4-4ea8faafe0d3",
    sourceId: source.sourceId,
    retrievedAt,
    sourceUrl: ingestMessage().sourceUrl ?? "https://www.miamidade.gov/elections/library/reports/elected-officials.pdf",
    httpStatus: 200,
    contentType: "text/html",
    etag: '"abc"',
    contentHash: digest,
    rawObjectUri: rawObjectUri("civiclenzevidence", r2Key),
    byteLength: bytes.byteLength,
    retrievalStatus: "stored",
  });
  const bucket = createMemoryBucket();
  await bucket.put(r2Key, bytes, { contentType: "text/html" });
  const { job } = await store.scheduleJob({
    dedupeKey: ingestMessage().dedupeKey,
    route: "ingest",
    sourceKey: ingestMessage().sourceKey,
  });
  await store.failJob(job.jobId, "supabase_write_failed", "HTTP 400 Postgres 42P10");

  const result = await withWorkerRun({
    store,
    worker: worker(),
    message: ingestMessage({ jobId: job.jobId }),
    run: async () => {
      const collected = await runCollectorJob({
        store,
        message: ingestMessage({ jobId: job.jobId }),
        bucket,
        worker: worker(),
        fetchImpl: async () => new Response(null, { status: 304, headers: { etag: '"abc"' } }),
      });
      if (collected.status === "failed" || collected.status === "dead_letter") {
        throw new CivicError(collected.errorClass ?? "collector_failed", collected.errorMessage ?? "collector failed");
      }
      return {
        result: collected,
        recordsRead: 1,
        recordsWritten: collected.claimsWritten + (collected.retrievalId ? 1 : 0),
        claimsVerified: 0,
      };
    },
  });

  assert.equal(result.status, "collected");
  assert.notEqual(result.status, "unchanged");
  const completed = await store.getJob(job.jobId);
  assert.equal(completed?.status, "succeeded");
  assert.equal(completed?.errorClass, undefined);
  assert.equal(completed?.errorMessage, undefined);
  assert.ok((await store.listClaims()).length > 0);
  assert.ok((await store.listJurisdictions()).length > 0);
  assert.ok((await store.listSeats()).length > 0);
  assert.ok((await store.listEvidence()).length > 0);
  assert.equal((await store.listRetrievals())[0]?.retrievalStatus, "parsed");
});
