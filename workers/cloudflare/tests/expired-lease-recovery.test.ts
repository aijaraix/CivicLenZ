import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  LEASE_ATTEMPTS_EXHAUSTED_ERROR_CLASS,
  LEASE_EXPIRED_ERROR_CLASS,
  LEASE_EXPIRED_QUEUED_MESSAGE,
  expiredLeaseFilter,
  isExpiredLeasedJob,
} from "../shared/src/jobs.ts";
import { recoverExpiredLeaseForJob, recoverExpiredLeases } from "../shared/src/lease-recovery.ts";
import {
  CONTROLLED_FLORIDA_GOVERNOR_DEDUPE_KEY,
  CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID,
  CONTROLLED_FLORIDA_GOVERNOR_SOURCE_KEY,
  OPERATOR_ENQUEUE_PATH,
} from "../shared/src/operator-enqueue.ts";
import { parseQueueJobMessage } from "../shared/src/queue-messages.ts";
import { handleSchedulerFetch, runSchedule } from "../scheduler/src/index.ts";
import { createMemoryStore } from "../shared/src/store.ts";
import { createSupabaseStore } from "../shared/src/supabase-store.ts";
import type { JobRecord, WorkerRunRecord } from "../shared/src/types.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

const OPERATOR_SECRET = "test-operator-secret-not-for-production";
const SERVICE_ROLE = "test-service-role-key-not-for-production";
const NOW = new Date("2026-09-02T23:00:00.000Z");
const EXPIRED_LEASE = "2026-09-02T22:38:59.000Z";
const ACTIVE_LEASE = "2026-09-02T23:30:00.000Z";

type SentMessage = { queue: string; message: unknown };

function seedGovernorJob(store: ReturnType<typeof createMemoryStore>, overrides: Partial<JobRecord> = {}): JobRecord {
  const job: JobRecord = {
    jobId: CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID,
    jobType: "ingest",
    targetType: "source",
    priority: 100,
    status: "leased",
    attemptCount: 2,
    maxAttempts: 5,
    leasedBy: "civiclenz-collector",
    leaseExpiresAt: EXPIRED_LEASE,
    checkpoint: {
      sourceKey: CONTROLLED_FLORIDA_GOVERNOR_SOURCE_KEY,
      sourceUrl: "https://www.flgov.com/",
    },
    dedupeKey: CONTROLLED_FLORIDA_GOVERNOR_DEDUPE_KEY,
    payload: {
      sourceKey: CONTROLLED_FLORIDA_GOVERNOR_SOURCE_KEY,
      sourceUrl: "https://www.flgov.com/",
    },
    scheduledFor: "2026-09-02T00:00:00.000Z",
    ...overrides,
  };
  store.tables.jobs.set(job.jobId, job);
  return job;
}

function seedWorkerRun(
  store: ReturnType<typeof createMemoryStore>,
  overrides: Partial<WorkerRunRecord> = {},
): WorkerRunRecord {
  const run: WorkerRunRecord = {
    workerRunId: overrides.workerRunId ?? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    workerKey: "civiclenz-collector",
    runtime: "cloudflare",
    jobId: CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID,
    status: "started",
    startedAt: "2026-09-02T22:20:00.000Z",
    recordsRead: 0,
    recordsWritten: 0,
    claimsVerified: 0,
    metadata: {},
    ...overrides,
  };
  store.tables.workerRuns.push(run);
  return run;
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

function enqueueRequest(body: unknown): Request {
  return new Request(`https://civiclenz-scheduler.example${OPERATOR_ENQUEUE_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPERATOR_SECRET}`,
    },
    body: JSON.stringify(body),
  });
}

test("A: expired leased job with attempts remaining recovers to queued on the same row", async () => {
  const store = createMemoryStore();
  seedGovernorJob(store);
  const result = await recoverExpiredLeases({ store, now: NOW });
  assert.equal(result.recovered.length, 1);
  assert.equal((await store.listJobs()).length, 1);
  const job = await store.getJob(CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID);
  assert.equal(job?.jobId, CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID);
  assert.equal(job?.dedupeKey, CONTROLLED_FLORIDA_GOVERNOR_DEDUPE_KEY);
  assert.equal(job?.status, "queued");
  assert.equal(job?.attemptCount, 2);
  assert.equal(job?.maxAttempts, 5);
  assert.equal(job?.leasedBy, undefined);
  assert.equal(job?.leaseExpiresAt, undefined);
  assert.equal(job?.errorClass, LEASE_EXPIRED_ERROR_CLASS);
  assert.equal(job?.errorMessage, LEASE_EXPIRED_QUEUED_MESSAGE);
  assert.equal(job?.scheduledFor, NOW.toISOString());
});

test("B: expired leased job with attempts exhausted recovers to dead_letter on the same row", async () => {
  const store = createMemoryStore();
  seedGovernorJob(store, { attemptCount: 5, maxAttempts: 5 });
  const result = await recoverExpiredLeases({ store, now: NOW });
  assert.equal(result.recovered.length, 1);
  assert.equal((await store.listJobs()).length, 1);
  const job = await store.getJob(CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID);
  assert.equal(job?.jobId, CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID);
  assert.equal(job?.dedupeKey, CONTROLLED_FLORIDA_GOVERNOR_DEDUPE_KEY);
  assert.equal(job?.status, "dead_letter");
  assert.equal(job?.attemptCount, 5);
  assert.equal(job?.leasedBy, undefined);
  assert.equal(job?.leaseExpiresAt, undefined);
  assert.equal(job?.errorClass, LEASE_ATTEMPTS_EXHAUSTED_ERROR_CLASS);
  assert.equal(job?.completedAt, NOW.toISOString());
});

test("C: active lease is untouched", async () => {
  const store = createMemoryStore();
  seedGovernorJob(store, { leaseExpiresAt: ACTIVE_LEASE });
  const result = await recoverExpiredLeases({ store, now: NOW });
  assert.equal(result.recovered.length, 0);
  const job = await store.getJob(CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID);
  assert.equal(job?.status, "leased");
  assert.equal(job?.leasedBy, "civiclenz-collector");
  assert.equal(job?.leaseExpiresAt, ACTIVE_LEASE);
  assert.equal(job?.errorClass, undefined);
  assert.equal(job?.attemptCount, 2);
  assert.equal(isExpiredLeasedJob(job!, NOW), false);
});

test("D: terminal jobs are untouched", async () => {
  for (const status of ["succeeded", "failed", "dead_letter"] as const) {
    const store = createMemoryStore();
    seedGovernorJob(store, { status, leaseExpiresAt: EXPIRED_LEASE, errorClass: "already_terminal" });
    const result = await recoverExpiredLeases({ store, now: NOW });
    assert.equal(result.recovered.length, 0, status);
    const job = await store.getJob(CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID);
    assert.equal(job?.status, status);
    assert.equal(job?.errorClass, "already_terminal");
    assert.equal(job?.attemptCount, 2);
  }
});

test("E: stale started worker_run becomes terminal lease_expired; already-failed run is unchanged", async () => {
  const store = createMemoryStore();
  seedGovernorJob(store);
  const stale = seedWorkerRun(store, { workerRunId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", status: "started" });
  const failed = seedWorkerRun(store, {
    workerRunId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    status: "failed",
    completedAt: "2026-09-02T22:30:00.000Z",
    errorClass: "worker_run_timeout",
    errorMessage: "timed out",
  });
  await recoverExpiredLeases({ store, now: NOW });
  const runs = await store.listWorkerRuns();
  assert.equal(runs.length, 2);
  const recoveredRun = runs.find((run) => run.workerRunId === stale.workerRunId);
  const untouched = runs.find((run) => run.workerRunId === failed.workerRunId);
  assert.equal(recoveredRun?.status, "failed");
  assert.equal(recoveredRun?.errorClass, LEASE_EXPIRED_ERROR_CLASS);
  assert.ok(recoveredRun?.completedAt);
  assert.notEqual(recoveredRun?.status, "succeeded");
  assert.equal(untouched?.status, "failed");
  assert.equal(untouched?.errorClass, "worker_run_timeout");
  assert.equal(untouched?.errorMessage, "timed out");
  assert.equal(untouched?.completedAt, "2026-09-02T22:30:00.000Z");
});

test("F: duplicate recovery is idempotent and does not insert a second job", async () => {
  const store = createMemoryStore();
  seedGovernorJob(store);
  const first = await recoverExpiredLeases({ store, now: NOW });
  const second = await recoverExpiredLeases({ store, now: NOW });
  assert.equal(first.recovered.length, 1);
  assert.equal(second.recovered.length, 0);
  assert.equal((await store.listJobs()).length, 1);
  const job = await store.getJob(CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID);
  assert.equal(job?.status, "queued");
  assert.equal(job?.attemptCount, 2);
  assert.equal(job?.dedupeKey, CONTROLLED_FLORIDA_GOVERNOR_DEDUPE_KEY);
  assert.equal(job?.errorClass, LEASE_EXPIRED_ERROR_CLASS);
  const again = await recoverExpiredLeaseForJob({
    store,
    jobId: CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID,
    now: NOW,
  });
  assert.equal(again, undefined);
});

test("G: operator jobId expired lease recovers the same row then enqueues it", async () => {
  const store = createMemoryStore();
  seedGovernorJob(store);
  const sent: SentMessage[] = [];
  const response = await handleSchedulerFetch(enqueueRequest({ jobId: CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID }), testEnv(sent), {
    store,
    now: NOW,
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { jobId: string; dedupeKey: string; enqueued: boolean; queue: string };
  assert.equal(body.jobId, CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID);
  assert.equal(body.dedupeKey, CONTROLLED_FLORIDA_GOVERNOR_DEDUPE_KEY);
  assert.equal(body.enqueued, true);
  assert.equal(body.queue, "civiclenz-ingest");
  assert.equal((await store.listJobs()).length, 1);
  const job = await store.getJob(CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID);
  assert.equal(job?.status, "queued");
  assert.equal(job?.dedupeKey, CONTROLLED_FLORIDA_GOVERNOR_DEDUPE_KEY);
  assert.equal(job?.attemptCount, 2);
  assert.equal(sent.length, 1);
  const message = parseQueueJobMessage(sent[0]?.message);
  assert.equal(message.jobId, CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID);
  assert.equal(message.dedupeKey, CONTROLLED_FLORIDA_GOVERNOR_DEDUPE_KEY);
  assert.equal(message.sourceKey, CONTROLLED_FLORIDA_GOVERNOR_SOURCE_KEY);
});

test("H: operator jobId active lease returns 409 job_not_enqueueable", async () => {
  const store = createMemoryStore();
  seedGovernorJob(store, { leaseExpiresAt: ACTIVE_LEASE });
  const sent: SentMessage[] = [];
  const response = await handleSchedulerFetch(enqueueRequest({ jobId: CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID }), testEnv(sent), {
    store,
    now: NOW,
  });
  assert.equal(response.status, 409);
  assert.equal(((await response.json()) as { error: string }).error, "job_not_enqueueable");
  assert.equal(sent.length, 0);
  const job = await store.getJob(CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID);
  assert.equal(job?.status, "leased");
  assert.equal(job?.leasedBy, "civiclenz-collector");
  assert.equal(job?.leaseExpiresAt, ACTIVE_LEASE);
  assert.equal((await store.listJobs()).length, 1);
});

test("I: scheduler recovery does not duplicate the job and dryRun does not send collection messages", async () => {
  const wrangler = readFileSync(path.join(repoRoot, "workers/cloudflare/scheduler/wrangler.jsonc"), "utf8");
  assert.match(wrangler, /"DRY_RUN": "true"/);
  const store = createMemoryStore();
  seedGovernorJob(store);
  const sent: SentMessage[] = [];
  const env = testEnv(sent);
  const plan = await runSchedule(env, true, { store, now: NOW });
  assert.equal(plan.dryRun, true);
  assert.equal(plan.enqueued.length, 0);
  assert.equal(sent.length, 0);
  assert.equal(env.DRY_RUN, "true");
  const recovered = plan.recoveredLeases ?? [];
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0]?.jobId, CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID);
  const matches = (await store.listJobs()).filter(
    (job) =>
      job.jobId === CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID ||
      job.dedupeKey === CONTROLLED_FLORIDA_GOVERNOR_DEDUPE_KEY,
  );
  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.status, "queued");
  assert.equal(matches[0]?.attemptCount, 2);

  const dryRun = await handleSchedulerFetch(new Request("https://civiclenz-scheduler.example/dry-run", { method: "POST" }), env, {
    store,
    now: NOW,
  });
  const body = (await dryRun.json()) as { dryRun: boolean; enqueued: number; recoveredJobIds: string[] };
  assert.equal(body.dryRun, true);
  assert.equal(body.enqueued, 0);
  assert.deepEqual(body.recoveredJobIds, []);
  assert.equal(sent.length, 0);
  assert.equal((await store.listJobs()).filter((job) => job.dedupeKey === CONTROLLED_FLORIDA_GOVERNOR_DEDUPE_KEY).length, 1);
});

test("supabase recoverExpiredLease uses a conditional PATCH and skips 0-row races", async () => {
  const calls: Array<{ method: string; path: string; body: Record<string, unknown> }> = [];
  let patchedOnce = false;
  const store = createSupabaseStore({
    url: "https://example.supabase.co",
    serviceRoleKey: SERVICE_ROLE,
    fetchImpl: async (input, init) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      const parsed = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      calls.push({ method, path: url, body: parsed });
      const leasedRow = {
        job_id: CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID,
        job_type: "ingest",
        status: "leased",
        attempt_count: 2,
        max_attempts: 5,
        priority: 100,
        dedupe_key: CONTROLLED_FLORIDA_GOVERNOR_DEDUPE_KEY,
        payload: { sourceKey: CONTROLLED_FLORIDA_GOVERNOR_SOURCE_KEY },
        checkpoint: {},
        scheduled_for: "2026-09-02T00:00:00.000Z",
        leased_by: "civiclenz-collector",
        lease_expires_at: EXPIRED_LEASE,
      };
      if (method === "GET" && url.includes("jobs")) {
        return new Response(JSON.stringify([leasedRow]), { status: 200 });
      }
      if (method === "PATCH" && url.includes("jobs")) {
        if (patchedOnce) return new Response(JSON.stringify([]), { status: 200 });
        patchedOnce = true;
        return new Response(
          JSON.stringify([
            {
              ...leasedRow,
              status: parsed.status ?? "queued",
              leased_by: parsed.leased_by ?? null,
              lease_expires_at: parsed.lease_expires_at ?? null,
              error_class: parsed.error_class,
              error_message: parsed.error_message,
              attempt_count: 2,
            },
          ]),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify([]), { status: 200 });
    },
  });
  const first = await store.recoverExpiredLease(CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID, NOW);
  const second = await store.recoverExpiredLease(CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID, NOW);
  assert.equal(first?.jobId, CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID);
  assert.equal(first?.status, "queued");
  assert.equal(first?.attemptCount, 2);
  assert.equal(first?.errorClass, LEASE_EXPIRED_ERROR_CLASS);
  assert.equal(second, undefined);
  const jobPatches = calls.filter((item) => item.method === "PATCH" && item.path.includes("jobs"));
  assert.equal(jobPatches.length, 2);
  const expectedFilter = expiredLeaseFilter(CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID, NOW);
  for (const patch of jobPatches) {
    assert.ok(patch.path.includes(expectedFilter), patch.path);
    assert.equal("attempt_count" in patch.body, false);
    assert.equal(patch.body.leased_by, null);
    assert.equal(patch.body.lease_expires_at, null);
  }
});
