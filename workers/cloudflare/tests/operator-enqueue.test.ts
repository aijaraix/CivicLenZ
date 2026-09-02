import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { handleSchedulerFetch } from "../scheduler/src/index.ts";
import { routeForJobType, toQueueMessage } from "../shared/src/jobs.ts";
import {
  CONTROLLED_MIAMI_DADE_DEDUPE_KEY,
  CONTROLLED_MIAMI_DADE_INGEST_JOB_ID,
  CONTROLLED_MIAMI_DADE_SOURCE_KEY,
  CONTROLLED_MIAMI_DADE_SOURCE_URL,
  CONTROLLED_FLORIDA_GOVERNOR_DEDUPE_KEY,
  CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID,
  CONTROLLED_FLORIDA_GOVERNOR_SOURCE_KEY,
  CONTROLLED_FLORIDA_HOUSE_SOURCE_KEY,
  CONTROLLED_FLORIDA_SENATE_SOURCE_KEY,
  OPERATOR_ENQUEUE_PATH,
  OPERATOR_SECRET_NAME,
} from "../shared/src/operator-enqueue.ts";
import { parseQueueJobMessage } from "../shared/src/queue-messages.ts";
import { createMemoryStore } from "../shared/src/store.ts";
import type { JobRecord, JobType } from "../shared/src/types.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

const OPERATOR_SECRET = "test-operator-secret-not-for-production";
const SERVICE_ROLE = "test-service-role-key-not-for-production";
const NOW = new Date("2026-09-02T12:00:00.000Z");

type SentMessage = { queue: string; message: unknown };

function seedJob(store: ReturnType<typeof createMemoryStore>, overrides: Partial<JobRecord> = {}): JobRecord {
  const job: JobRecord = {
    jobId: CONTROLLED_MIAMI_DADE_INGEST_JOB_ID,
    jobType: "ingest",
    targetType: "source",
    priority: 100,
    status: "queued",
    attemptCount: 0,
    maxAttempts: 5,
    checkpoint: {
      sourceKey: CONTROLLED_MIAMI_DADE_SOURCE_KEY,
      sourceUrl: CONTROLLED_MIAMI_DADE_SOURCE_URL,
    },
    dedupeKey: CONTROLLED_MIAMI_DADE_DEDUPE_KEY,
    payload: {
      sourceKey: CONTROLLED_MIAMI_DADE_SOURCE_KEY,
      sourceUrl: CONTROLLED_MIAMI_DADE_SOURCE_URL,
    },
    scheduledFor: "2026-09-02T00:00:00.000Z",
    ...overrides,
  };
  store.tables.jobs.set(job.jobId, job);
  return job;
}

function testEnv(sent: SentMessage[], overrides: Record<string, unknown> = {}) {
  const queue = (name: string) => ({
    async send(message: unknown) {
      sent.push({ queue: name, message });
    },
  });
  return {
    INGEST_QUEUE: queue("civiclenz-ingest"),
    VALIDATE_QUEUE: queue("civiclenz-validate"),
    MONITOR_QUEUE: queue("civiclenz-monitor"),
    HEAVY_QUEUE: queue("civiclenz-heavy"),
    DEAD_LETTER_QUEUE: queue("civiclenz-dead-letter"),
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE,
    CIVICLENZ_OPERATOR_TRIGGER_SECRET: OPERATOR_SECRET,
    DRY_RUN: "true",
    WORKER_KEY: "civiclenz-scheduler",
    ...overrides,
  } as Env;
}

function enqueueRequest(body: unknown, secret = OPERATOR_SECRET): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secret !== "") {
    headers.authorization = `Bearer ${secret}`;
  }
  return new Request(`https://civiclenz-scheduler.example${OPERATOR_ENQUEUE_PATH}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function enqueue(
  store: ReturnType<typeof createMemoryStore>,
  sent: SentMessage[],
  body: unknown,
  options: { secret?: string; env?: Record<string, unknown> } = {},
): Promise<Response> {
  const secret = options.secret === undefined ? OPERATOR_SECRET : options.secret;
  return handleSchedulerFetch(enqueueRequest(body, secret), testEnv(sent, options.env), { store, now: NOW });
}

function assertNoSecrets(body: unknown, extra: string[] = []) {
  const serialized = JSON.stringify(body);
  for (const secret of [OPERATOR_SECRET, SERVICE_ROLE, ...extra]) {
    assert.equal(serialized.includes(secret), false, "response must not contain secrets");
  }
}

test("operator secret missing returns 401 and does not enqueue", async () => {
  const store = createMemoryStore();
  seedJob(store);
  const sent: SentMessage[] = [];
  const missingEnv = await enqueue(store, sent, { jobId: CONTROLLED_MIAMI_DADE_INGEST_JOB_ID }, {
    env: { CIVICLENZ_OPERATOR_TRIGGER_SECRET: undefined },
  });
  assert.equal(missingEnv.status, 401);
  assertNoSecrets(await missingEnv.json());
  const missingHeader = await handleSchedulerFetch(
    new Request(`https://civiclenz-scheduler.example${OPERATOR_ENQUEUE_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: CONTROLLED_MIAMI_DADE_INGEST_JOB_ID }),
    }),
    testEnv(sent),
    { store, now: NOW },
  );
  assert.equal(missingHeader.status, 401);
  assert.equal(sent.length, 0);
  assert.equal((await store.listJobs()).length, 1);
});

test("operator wrong secret returns 401", async () => {
  const store = createMemoryStore();
  seedJob(store);
  const sent: SentMessage[] = [];
  const response = await enqueue(store, sent, { jobId: CONTROLLED_MIAMI_DADE_INGEST_JOB_ID }, {
    secret: "wrong-operator-secret",
  });
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal((body as { error: string }).error, "unauthorized");
  assertNoSecrets(body, ["wrong-operator-secret"]);
  assert.equal(sent.length, 0);
});

test("valid queued Miami-Dade job enqueues civiclenz-ingest with schema 1.0.0", async () => {
  const store = createMemoryStore();
  seedJob(store);
  const sent: SentMessage[] = [];
  const response = await enqueue(store, sent, { jobId: CONTROLLED_MIAMI_DADE_INGEST_JOB_ID });
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    jobId: string;
    dedupeKey: string;
    route: string;
    queue: string;
    enqueued: boolean;
  };
  assert.deepEqual(body, {
    jobId: CONTROLLED_MIAMI_DADE_INGEST_JOB_ID,
    dedupeKey: CONTROLLED_MIAMI_DADE_DEDUPE_KEY,
    route: "ingest",
    queue: "civiclenz-ingest",
    enqueued: true,
  });
  assertNoSecrets(body);
  assert.equal(sent.length, 1);
  assert.equal(sent[0]?.queue, "civiclenz-ingest");
  const message = parseQueueJobMessage(sent[0]?.message);
  assert.equal(message.schemaVersion, "1.0.0");
  assert.equal(message.jobId, CONTROLLED_MIAMI_DADE_INGEST_JOB_ID);
  assert.equal(message.dedupeKey, CONTROLLED_MIAMI_DADE_DEDUPE_KEY);
  assert.equal(message.route, "ingest");
  assert.equal(message.sourceKey, CONTROLLED_MIAMI_DADE_SOURCE_KEY);
  assert.equal(message.sourceUrl, CONTROLLED_MIAMI_DADE_SOURCE_URL);
  assert.equal(message.dryRun, false);
  assert.equal(message.attempt, 0);
  assert.equal((await store.listJobs()).length, 1);
  assert.equal((await store.getJob(CONTROLLED_MIAMI_DADE_INGEST_JOB_ID))?.status, "queued");
  assert.equal((await store.getJob(CONTROLLED_MIAMI_DADE_INGEST_JOB_ID))?.dedupeKey, CONTROLLED_MIAMI_DADE_DEDUPE_KEY);
});

test("nonexistent job returns 404", async () => {
  const store = createMemoryStore();
  const sent: SentMessage[] = [];
  const response = await enqueue(store, sent, { jobId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
  assert.equal(response.status, 404);
  assert.equal(((await response.json()) as { error: string }).error, "job_not_found");
  assert.equal(sent.length, 0);
});

test("succeeded and running jobs are rejected instead of enqueueing another copy", async () => {
  for (const status of ["succeeded", "running", "leased"] as const) {
    const store = createMemoryStore();
    seedJob(store, { status });
    const sent: SentMessage[] = [];
    const response = await enqueue(store, sent, { jobId: CONTROLLED_MIAMI_DADE_INGEST_JOB_ID });
    assert.equal(response.status, 409, status);
    assert.equal(((await response.json()) as { error: string }).error, "job_not_enqueueable");
    assert.equal(sent.length, 0);
    assert.equal((await store.listJobs()).length, 1);
  }
});

test("future scheduled_for is rejected", async () => {
  const store = createMemoryStore();
  seedJob(store, { scheduledFor: "2026-12-01T00:00:00.000Z" });
  const sent: SentMessage[] = [];
  const response = await enqueue(store, sent, { jobId: CONTROLLED_MIAMI_DADE_INGEST_JOB_ID });
  assert.equal(response.status, 409);
  assert.equal(((await response.json()) as { error: string }).error, "job_not_due");
  assert.equal(sent.length, 0);
});

test("null scheduled_for counts as due", async () => {
  const store = createMemoryStore();
  seedJob(store, { scheduledFor: "" });
  const sent: SentMessage[] = [];
  const response = await enqueue(store, sent, { jobId: CONTROLLED_MIAMI_DADE_INGEST_JOB_ID });
  assert.equal(response.status, 200);
  assert.equal(sent.length, 1);
  assert.equal(parseQueueJobMessage(sent[0]?.message).dryRun, false);
});

test("invalid job type is rejected", async () => {
  const store = createMemoryStore();
  seedJob(store, { jobType: "magic" as JobType });
  const sent: SentMessage[] = [];
  const response = await enqueue(store, sent, { jobId: CONTROLLED_MIAMI_DADE_INGEST_JOB_ID });
  assert.equal(response.status, 400);
  assert.equal(((await response.json()) as { error: string }).error, "invalid_job_type");
  assert.equal(sent.length, 0);
});

test("capability job_type maps through existing queueForCapability", async () => {
  assert.equal(routeForJobType("ingest"), "ingest");
  assert.equal(routeForJobType("officeholder_discovery"), "ingest");
  assert.equal(routeForJobType("evidence_validation"), "validate");
  assert.equal(routeForJobType("source_health"), "monitor");
  assert.equal(routeForJobType("gis_parse"), "heavy");
  assert.equal(routeForJobType("not-a-route"), undefined);
  const store = createMemoryStore();
  seedJob(store, { jobType: "officeholder_discovery" as JobType });
  const sent: SentMessage[] = [];
  const response = await enqueue(store, sent, { jobId: CONTROLLED_MIAMI_DADE_INGEST_JOB_ID });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { route: string; queue: string };
  assert.equal(body.route, "ingest");
  assert.equal(body.queue, "civiclenz-ingest");
  assert.equal(parseQueueJobMessage(sent[0]?.message).route, "ingest");
});

test("duplicate submission does not create a second job row", async () => {
  const store = createMemoryStore();
  seedJob(store);
  const sent: SentMessage[] = [];
  const first = await enqueue(store, sent, { jobId: CONTROLLED_MIAMI_DADE_INGEST_JOB_ID });
  const second = await enqueue(store, sent, { jobId: CONTROLLED_MIAMI_DADE_INGEST_JOB_ID });
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal((await store.listJobs()).length, 1);
  assert.equal((await store.getJob(CONTROLLED_MIAMI_DADE_INGEST_JOB_ID))?.dedupeKey, CONTROLLED_MIAMI_DADE_DEDUPE_KEY);
  assert.equal(sent.every((item) => parseQueueJobMessage(item.message).jobId === CONTROLLED_MIAMI_DADE_INGEST_JOB_ID), true);
});

test("invalid uuid and missing jobId are 400; secret and service role stay out of the body", async () => {
  const store = createMemoryStore();
  const sent: SentMessage[] = [];
  const badId = await enqueue(store, sent, { jobId: "not-a-uuid" });
  assert.equal(badId.status, 400);
  assertNoSecrets(await badId.json());
  const missing = await enqueue(store, sent, {});
  assert.equal(missing.status, 400);
  assertNoSecrets(await missing.json());
  assert.equal(sent.length, 0);
});

test("operator enqueue leaves scheduler DRY_RUN true", async () => {
  const wrangler = readFileSync(path.join(repoRoot, "workers/cloudflare/scheduler/wrangler.jsonc"), "utf8");
  assert.match(wrangler, /"DRY_RUN": "true"/);
  assert.doesNotMatch(wrangler, /CIVICLENZ_OPERATOR_TRIGGER_SECRET\s*:/);
  const store = createMemoryStore();
  seedJob(store);
  const sent: SentMessage[] = [];
  const env = testEnv(sent);
  await handleSchedulerFetch(enqueueRequest({ jobId: CONTROLLED_MIAMI_DADE_INGEST_JOB_ID }), env, { store, now: NOW });
  const health = await handleSchedulerFetch(new Request("https://civiclenz-scheduler.example/health"), env, {
    store,
    now: NOW,
  });
  const body = (await health.json()) as {
    dryRun: boolean;
    worker: string;
    supabaseConfigured: boolean;
    queueBindingsConfigured: boolean;
  };
  assert.equal(body.worker, "civiclenz-scheduler");
  assert.equal(body.dryRun, true);
  assert.equal(body.supabaseConfigured, true);
  assert.equal(body.queueBindingsConfigured, true);
  assert.equal(env.DRY_RUN, "true");
  assertNoSecrets(body);
  assert.equal(OPERATOR_SECRET_NAME, "CIVICLENZ_OPERATOR_TRIGGER_SECRET");
});

test("toQueueMessage for the controlled job stays ingest/false and does not invent VERIFIED", async () => {
  const store = createMemoryStore();
  const job = seedJob(store);
  const message = toQueueMessage(job, false, NOW);
  assert.equal(message.route, "ingest");
  assert.equal(message.dryRun, false);
  assert.equal(message.jobId, CONTROLLED_MIAMI_DADE_INGEST_JOB_ID);
});

test("operator can create and enqueue Senate/House ingest jobs without flipping DRY_RUN", async () => {
  const store = createMemoryStore();
  const sent: SentMessage[] = [];
  const senate = await enqueue(store, sent, { sourceKey: CONTROLLED_FLORIDA_SENATE_SOURCE_KEY });
  assert.equal(senate.status, 200);
  const senateBody = (await senate.json()) as { sourceKey?: string; route: string; enqueued: boolean; jobId: string };
  assert.equal(senateBody.route, "ingest");
  assert.equal(senateBody.enqueued, true);
  assert.equal(parseQueueJobMessage(sent[0]?.message).sourceKey, CONTROLLED_FLORIDA_SENATE_SOURCE_KEY);
  assert.equal(parseQueueJobMessage(sent[0]?.message).dryRun, false);
  const house = await enqueue(store, sent, { sourceKey: CONTROLLED_FLORIDA_HOUSE_SOURCE_KEY });
  assert.equal(house.status, 200);
  assert.equal(sent.length, 2);
  assert.equal((await store.listJobs()).length, 2);
});

test("operator sourceKey refuses Miami-Dade recreation and bulk Florida sources", async () => {
  const store = createMemoryStore();
  const sent: SentMessage[] = [];
  const miami = await enqueue(store, sent, { sourceKey: CONTROLLED_MIAMI_DADE_SOURCE_KEY });
  assert.equal(miami.status, 409);
  const bulk = await enqueue(store, sent, { sourceKey: "florida-attorney-general" });
  assert.equal(bulk.status, 400);
  assert.equal(sent.length, 0);
});

test("dead_letter Governor job is reset in place and sent to ingest; no second jobs row", async () => {
  const store = createMemoryStore();
  seedJob(store, {
    jobId: CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID,
    status: "dead_letter",
    dedupeKey: CONTROLLED_FLORIDA_GOVERNOR_DEDUPE_KEY,
    errorClass: "supabase_write_failed",
    errorMessage: "Postgres 23514 seats_baseline_status_check",
    checkpoint: {
      sourceKey: CONTROLLED_FLORIDA_GOVERNOR_SOURCE_KEY,
      sourceUrl: "https://www.flgov.com/",
    },
    payload: {
      sourceKey: CONTROLLED_FLORIDA_GOVERNOR_SOURCE_KEY,
      sourceUrl: "https://www.flgov.com/",
    },
  });
  const sent: SentMessage[] = [];
  const response = await enqueue(store, sent, { jobId: CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { jobId: string; dedupeKey: string; enqueued: boolean; queue: string };
  assert.equal(body.jobId, CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID);
  assert.equal(body.dedupeKey, CONTROLLED_FLORIDA_GOVERNOR_DEDUPE_KEY);
  assert.equal(body.enqueued, true);
  assert.equal(body.queue, "civiclenz-ingest");
  assert.equal((await store.listJobs()).length, 1);
  const job = await store.getJob(CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID);
  assert.equal(job?.status, "queued");
  assert.equal(job?.errorClass, undefined);
  assert.equal(job?.errorMessage, undefined);
  assert.equal(job?.dedupeKey, CONTROLLED_FLORIDA_GOVERNOR_DEDUPE_KEY);
  assert.equal(job?.payload.sourceUrl, "https://www.flgov.com/");
  assert.equal(sent.length, 1);
  const message = parseQueueJobMessage(sent[0]?.message);
  assert.equal(message.jobId, CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID);
  assert.equal(message.sourceKey, CONTROLLED_FLORIDA_GOVERNOR_SOURCE_KEY);
  assert.equal(message.dryRun, false);
});

test("failed Governor job is requeued by jobId only; sourceKey does not insert a second row", async () => {
  const store = createMemoryStore();
  seedJob(store, {
    jobId: CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID,
    status: "failed",
    dedupeKey: CONTROLLED_FLORIDA_GOVERNOR_DEDUPE_KEY,
    errorClass: "supabase_write_failed",
    errorMessage: "Postgres 23514",
    checkpoint: {
      sourceKey: CONTROLLED_FLORIDA_GOVERNOR_SOURCE_KEY,
      sourceUrl: "https://www.flgov.com/",
    },
    payload: {
      sourceKey: CONTROLLED_FLORIDA_GOVERNOR_SOURCE_KEY,
      sourceUrl: "https://www.flgov.com/",
    },
  });
  const sent: SentMessage[] = [];
  const viaSource = await enqueue(store, sent, { sourceKey: CONTROLLED_FLORIDA_GOVERNOR_SOURCE_KEY });
  assert.equal(viaSource.status, 409);
  assert.equal(((await viaSource.json()) as { error: string }).error, "job_not_enqueueable");
  assert.equal((await store.listJobs()).length, 1);
  assert.equal((await store.getJob(CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID))?.status, "failed");
  assert.equal(sent.length, 0);
  const viaJobId = await enqueue(store, sent, { jobId: CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID });
  assert.equal(viaJobId.status, 200);
  assert.equal((await store.listJobs()).length, 1);
  assert.equal((await store.getJob(CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID))?.status, "queued");
  assert.equal(sent.length, 1);
});

test("dead_letter Miami-Dade job is refused and is not reset", async () => {
  const store = createMemoryStore();
  seedJob(store, { status: "dead_letter", errorClass: "parser_failure", errorMessage: "do not retry" });
  const sent: SentMessage[] = [];
  const response = await enqueue(store, sent, { jobId: CONTROLLED_MIAMI_DADE_INGEST_JOB_ID });
  assert.equal(response.status, 409);
  assert.equal(((await response.json()) as { error: string }).error, "miami_dade_job_must_not_be_recreated");
  assert.equal(sent.length, 0);
  const job = await store.getJob(CONTROLLED_MIAMI_DADE_INGEST_JOB_ID);
  assert.equal(job?.status, "dead_letter");
  assert.equal(job?.errorClass, "parser_failure");
});
