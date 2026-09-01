import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { canTransitionClaim, isPublicationEligible, transitionClaim } from "../shared/src/claims.ts";
import { runCollectorJob } from "../shared/src/collector.ts";
import { createDeadLetterPayload, shouldDeadLetter } from "../shared/src/dead-letter.ts";
import { CivicError, HttpFetchError } from "../shared/src/errors.ts";
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
import { evidenceObjectKey } from "../shared/src/r2-keys.ts";
import { upsertBaselineResearchContract } from "../shared/src/research.ts";
import { planAndEnqueue } from "../shared/src/scheduler.ts";
import { CONTROLLED_SLICE_SOURCES, firstWaveIngestSources } from "../shared/src/slice.ts";
import { createMemoryStore, isWorkerActive } from "../shared/src/store.ts";
import { createSupabaseStore } from "../shared/src/supabase-store.ts";
import type { PersonRecord, QueueJobMessage, SeatRecord } from "../shared/src/types.ts";
import { planClaimTransition, runValidatorJob, validateClaim } from "../shared/src/validation.ts";

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
  assert.equal(second.job.id, first.job.id);
  assert.equal(hasActiveJob(await store.listJobs(), key), true);
  assert.equal(shouldEnqueueJob(first.job), false);
  await store.completeJob(first.job.id);
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
    () => store.recordSource({ sourceKey: "x", name: "x", sourceUrl: "https://example.gov", enabled: true }),
    (error: unknown) => error instanceof CivicError && error.errorClass === "supabase_write_failed",
  );
});

test("seat, person, and winning-candidate matching reuse the existing person", () => {
  const seats: SeatRecord[] = [
    {
      id: "seat-1",
      seatKey: "us-fl-governor",
      jurisdictionId: "fl",
      seatName: "Governor of Florida",
      officeType: "governor",
      governmentLevel: "state",
      occupancyStatus: "unknown",
      recordStatus: "extracted",
    },
  ];
  const people: PersonRecord[] = [
    {
      id: "person-1",
      personKey: "person:ron-desantis",
      displayName: "Ron DeSantis",
      normalizedName: "ron desantis",
      recordStatus: "extracted",
    },
  ];
  assert.equal(matchSeat(seats, { jurisdictionId: "fl", officeType: "governor" }).status, "matched");
  assert.equal(matchPerson(people, { displayName: "Ron DeSantis" }).record?.id, "person-1");
  const reused = reusePersonForWinningCandidate({
    existingOccupant: people[0],
    existingPerson: { ...people[0], id: "other" },
  });
  assert.equal(reused?.id, "person-1");
  const campaign = matchCandidateCampaign(
    [{ id: "c1", campaignKey: "k", electionId: "e1", seatId: "seat-1", personId: "person-1", recordStatus: "extracted" }],
    { electionId: "e1", seatId: "seat-1", personId: "person-1" },
  );
  assert.equal(campaign.status, "matched");
});

test("claim lifecycle walks legal hops and rejects illegal ones", () => {
  assert.equal(canTransitionClaim("COLLECTED_UNREVIEWED", "EXTRACTED"), true);
  assert.equal(canTransitionClaim("COLLECTED_UNREVIEWED", "VERIFIED"), false);
  assert.throws(() => transitionClaim("COLLECTED_UNREVIEWED", "VERIFIED"), /illegal claim transition/);
  assert.equal(isPublicationEligible({ status: "VERIFIED", hasEvidence: true, hasContradiction: false, entityMatched: true }), true);
  assert.equal(isPublicationEligible({ status: "EXTRACTED", hasEvidence: true, hasContradiction: false, entityMatched: true }), false);
});

test("validation rejection and evidence-backed-not-verified", async () => {
  const store = createMemoryStore();
  const claim = await store.recordClaim({
    claimKey: "reject-me",
    claimType: "occupancy",
    status: "VERIFICATION_PENDING",
    metadata: { forceReject: true, rejectReason: "schema_mismatch" },
  });
  const rejected = await validateClaim(store, claim);
  assert.equal(rejected.to, "REJECTED");
  assert.equal(rejected.publicationEligible, false);

  const pending = await store.recordClaim({
    claimKey: "pending-me",
    claimType: "occupancy",
    status: "VERIFICATION_PENDING",
    seatId: "seat",
    personId: "person",
    rawRetrievalId: "ret",
    metadata: {},
  });
  await store.recordEvidence({
    rawRetrievalId: "ret",
    evidenceType: "pdf",
    sourceUrl: "https://www.miamidade.gov/elections/library/reports/elected-officials.pdf",
    contentSha256: "a".repeat(64),
    capturedAt: "2026-09-01T00:00:00Z",
    reviewStatus: "unreviewed",
  });
  const plan = planClaimTransition({
    claim: pending,
    entityMatched: true,
    hasEvidence: true,
    hasContradiction: false,
  });
  assert.equal(plan.to, "VERIFICATION_PENDING");
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
  assert.equal(payload.errorClass, "http_fetch_failed");
  assert.equal(payload.attemptCount, 5);
  assert.ok(payload.payloadSummary.dedupeKey);
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
  assert.equal(retrievals[0]?.contentSha256, result.sha256);
  const claims = await store.listClaims();
  assert.ok(claims.length >= 19);
  assert.ok(claims.every((claim) => claim.status === "COLLECTED_UNREVIEWED"));
  assert.ok(claims.every((claim) => claim.publicationEligible === false));
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
  assert.ok(validated.outcomes.every((item) => item.to !== "VERIFIED"));
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
  assert.equal(seeded.person.displayName, "Ron DeSantis");
  assert.equal(seeded.occupancy.recordStatus, "extracted");
  assert.equal(seeded.occupancyClaim.status, "COLLECTED_UNREVIEWED");
  assert.equal(seeded.portraitDecision.allowedForVerified, false);
  assert.equal(seeded.portraitDecision.reason, "not_official_gov_host");
  assert.equal(seeded.contract.status, "open");
  const openFields = seeded.fields.filter((field) => field.status === "open");
  assert.ok(openFields.length >= 3);
  assert.equal(seeded.monitoring.entityKey, "us-fl-governor");
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
