import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runCollectorJob } from "../shared/src/collector.ts";
import { CivicError, StoreWriteError } from "../shared/src/errors.ts";
import { exactByteCopy, sha256Hex } from "../shared/src/hash.ts";
import { createMemoryBucket } from "../shared/src/memory-bucket.ts";
import { createQueueJobMessage } from "../shared/src/queue-messages.ts";
import { objectKeyFromRawObjectUri } from "../shared/src/r2-keys.ts";
import { createMemoryStore } from "../shared/src/store.ts";
import { createSupabaseStore } from "../shared/src/supabase-store.ts";
import type { QueueJobMessage } from "../shared/src/types.ts";
import {
  isWorkerRunSkip,
  runQueueJobWithWorker,
  withWorkerRun,
} from "../shared/src/worker-lifecycle.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const governorHtml = readFileSync(path.join(repoRoot, "tests/fixtures/florida_governor_official.html"), "utf8");

function occupantNameFromFixture(html: string): string {
  const match = html.match(/property="og:title" content="Governor ([^"]+)"/i);
  assert.ok(match?.[1], "fixture must contain an og:title occupant");
  return match[1].trim();
}

function worker() {
  return { workerKey: "civiclenz-collector", runtime: "test" as const, deploymentId: "test-lifecycle" };
}

function ingestMessage(overrides: Partial<QueueJobMessage> = {}): QueueJobMessage {
  return createQueueJobMessage({
    jobId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    dedupeKey: "ingest:florida-governor-official:lifecycle",
    route: "ingest",
    sourceKey: "florida-governor-official",
    sourceUrl: "https://www.flgov.com/",
    attempt: 0,
    scheduledFor: "2026-09-02T00:00:00.000Z",
    dryRun: false,
    ...overrides,
  });
}

async function queuedIngestJob(store: ReturnType<typeof createMemoryStore>, overrides: Partial<QueueJobMessage> = {}) {
  const message = ingestMessage(overrides);
  const { job } = await store.scheduleJob({
    dedupeKey: message.dedupeKey,
    route: message.route,
    sourceKey: message.sourceKey,
    scheduledFor: message.scheduledFor,
    payload: { sourceUrl: message.sourceUrl },
  });
  return { store, message: ingestMessage({ ...overrides, jobId: job.jobId, dedupeKey: job.dedupeKey ?? message.dedupeKey }) };
}

async function waitFor(predicate: () => boolean | Promise<boolean>, timeoutMs = 500): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("timed out waiting for condition");
}

async function collectGovernor(
  store: ReturnType<typeof createMemoryStore>,
  message: QueueJobMessage,
  options: {
    fetchImpl?: typeof fetch;
    queues?: { validate?: { send(message: unknown): Promise<void> } };
    callTimeoutMs?: number;
    runTimeoutMs?: number;
  } = {},
) {
  return withWorkerRun({
    store,
    worker: worker(),
    message,
    runTimeoutMs: options.runTimeoutMs,
    callTimeoutMs: options.callTimeoutMs,
    queues: options.queues,
    run: async () => {
      const collected = await runCollectorJob({
        store,
        message,
        bucket: createMemoryBucket(),
        worker: worker(),
        queues: options.queues,
        callTimeoutMs: options.callTimeoutMs,
        fetchImpl:
          options.fetchImpl ??
          (async () => new Response(governorHtml, { status: 200, headers: { "content-type": "text/html" } })),
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
}

test("A: Governor persist through withWorkerRun writes seat/person/occupancy/evidence/claim and patches the same worker_run", async () => {
  const store = createMemoryStore();
  const { message } = await queuedIngestJob(store);
  const expected = occupantNameFromFixture(governorHtml);
  const validateBodies: unknown[] = [];
  const outcome = await collectGovernor(store, message, {
    queues: {
      validate: {
        async send(body) {
          validateBodies.push(body);
        },
      },
    },
  });
  assert.equal(outcome.skipped, false);
  assert.equal(outcome.skipped ? undefined : outcome.result.status, "collected");

  const seats = await store.listSeats();
  const people = await store.listPersons();
  const occupancies = await store.listOccupancies();
  const claims = await store.listClaims();
  const evidence = await store.listEvidence();
  const links = await store.listClaimEvidence();
  const jobs = await store.listJobs();
  const monitoring = await store.listMonitoringState();
  const runs = await store.listWorkerRuns();

  assert.equal(seats[0]?.seatKey, "us-fl-governor");
  assert.equal(people[0]?.canonicalName, expected);
  assert.notEqual(people[0]?.canonicalName, "hardcoded");
  assert.equal(occupancies.length, 1);
  assert.ok(claims.some((claim) => claim.fieldKey === "current_occupant" && claim.normalizedValue === expected));
  assert.ok(evidence.length > 0);
  assert.ok(links.some((link) => link.role === "supports"));
  assert.ok(jobs.some((job) => job.jobType === "validate"));
  assert.equal(validateBodies.length, 1);
  assert.ok(monitoring.some((row) => row.active && (row.targetType === "source" || row.seatId === seats[0]?.seatId)));
  assert.ok(jobs.some((job) => String(job.dedupeKey ?? "").startsWith("work:") || job.jobType === "ingest" || job.jobType === "validate"));

  assert.equal(runs.length, 1);
  assert.equal(runs[0]?.status, "succeeded");
  assert.ok(runs[0]?.completedAt);
  const ingest = await store.getJob(message.jobId);
  assert.equal(ingest?.status, "succeeded");
  assert.equal(ingest?.leasedBy, undefined);
});

test("B: evidence persist failure after occupancy fail-closes worker_run and job", async () => {
  const store = createMemoryStore();
  const { message } = await queuedIngestJob(store, { dedupeKey: "ingest:florida-governor-official:evidence-fail" });
  const original = store.recordEvidence.bind(store);
  store.recordEvidence = async (input) => {
    if ((await store.listOccupancies()).length > 0) {
      throw new StoreWriteError("evidence persist failed after occupancy");
    }
    return original(input);
  };

  await assert.rejects(
    () => collectGovernor(store, message),
    (error: unknown) => error instanceof CivicError && error.errorClass === "supabase_write_failed",
  );

  assert.equal((await store.listOccupancies()).length, 1);
  const runs = await store.listWorkerRuns();
  assert.equal(runs.length, 1);
  assert.ok(runs[0]?.status === "failed" || runs[0]?.status === "degraded");
  assert.ok(runs[0]?.completedAt);
  const job = await store.getJob(message.jobId);
  assert.ok(job?.status === "failed" || job?.status === "dead_letter");
  assert.equal(job?.leasedBy, undefined);
  assert.equal(job?.leaseExpiresAt, undefined);
});

test("C: claim persist failure fail-closes worker_run and job", async () => {
  const store = createMemoryStore();
  const { message } = await queuedIngestJob(store, { dedupeKey: "ingest:florida-governor-official:claim-fail" });
  store.recordClaim = async () => {
    throw new StoreWriteError("claim persist failed");
  };

  await assert.rejects(
    () => collectGovernor(store, message),
    (error: unknown) => error instanceof CivicError && error.errorClass === "supabase_write_failed",
  );

  assert.equal((await store.listOccupancies()).length, 1);
  const runs = await store.listWorkerRuns();
  assert.equal(runs.length, 1);
  assert.ok(runs[0]?.status === "failed" || runs[0]?.status === "degraded");
  const job = await store.getJob(message.jobId);
  assert.ok(job?.status === "failed" || job?.status === "dead_letter");
  assert.equal(job?.leasedBy, undefined);
});

test("D: hanging validate.send still terminates with terminal worker_run and job", async () => {
  const store = createMemoryStore();
  const { message } = await queuedIngestJob(store, { dedupeKey: "ingest:florida-governor-official:queue-hang" });
  await assert.rejects(
    () =>
      collectGovernor(store, message, {
        callTimeoutMs: 40,
        runTimeoutMs: 250,
        queues: {
          validate: {
            send: () => new Promise(() => {}),
          },
        },
      }),
    (error: unknown) =>
      error instanceof CivicError &&
      (error.errorClass === "queue_send_timeout" || error.errorClass === "worker_run_timeout" || error.errorClass === "collector_failed"),
  );

  const runs = await store.listWorkerRuns();
  assert.equal(runs.length, 1);
  assert.ok(runs[0]?.status === "failed" || runs[0]?.status === "degraded" || runs[0]?.status === "cancelled");
  assert.ok(runs[0]?.completedAt);
  const job = await store.getJob(message.jobId);
  assert.ok(job?.status === "failed" || job?.status === "dead_letter");
  assert.equal(job?.leasedBy, undefined);
  assert.ok((await store.listOccupancies()).length > 0);
  assert.ok((await store.listClaims()).some((claim) => claim.fieldKey === "current_occupant"));
});

test("E: retrieval hash is content-addressed and changed bytes get a new R2 key", async () => {
  const store = createMemoryStore();
  const original = new TextEncoder().encode(governorHtml);
  const mutatedHtml = governorHtml.includes("<html") ? governorHtml.replace("<html", "<HTML") : `${governorHtml.slice(0, -1)}\t`;
  const mutated = new TextEncoder().encode(mutatedHtml);
  assert.equal(mutated.byteLength, original.byteLength);
  const originalHash = await sha256Hex(original);
  const mutatedHash = await sha256Hex(mutated);
  assert.notEqual(originalHash, mutatedHash);

  const first = await queuedIngestJob(store, { dedupeKey: "ingest:florida-governor-official:hash-1" });
  const firstOutcome = await collectGovernor(store, first.message, {
    fetchImpl: async () => new Response(original, { status: 200, headers: { "content-type": "text/html" } }),
  });
  assert.equal(firstOutcome.skipped, false);
  const firstRetrievals = await store.listRetrievals();
  assert.equal(firstRetrievals.length, 1);
  assert.equal(firstRetrievals[0]?.contentHash, originalHash);
  const firstKey = objectKeyFromRawObjectUri(firstRetrievals[0]?.rawObjectUri);
  assert.ok(firstKey?.includes(originalHash));
  const firstRetrievalId = firstRetrievals[0]?.retrievalId;
  const firstUri = firstRetrievals[0]?.rawObjectUri;

  const second = await collectGovernor(store, ingestMessage({ jobId: first.message.jobId, dryRun: false }), {
    fetchImpl: async () => new Response(original, { status: 200, headers: { "content-type": "text/html" } }),
  });
  assert.equal(second.skipped, true);
  await store.requeueJob(first.message.jobId);
  const sameBytes = await collectGovernor(store, first.message, {
    fetchImpl: async () => new Response(original, { status: 200, headers: { "content-type": "text/html" } }),
  });
  assert.equal(sameBytes.skipped, false);
  const afterSame = await store.listRetrievals();
  assert.equal(afterSame.length, 1);
  assert.equal(afterSame[0]?.retrievalId, firstRetrievalId);
  assert.equal(afterSame[0]?.contentHash, originalHash);
  assert.equal(afterSame[0]?.rawObjectUri, firstUri);
  assert.equal(objectKeyFromRawObjectUri(afterSame[0]?.rawObjectUri), firstKey);

  await store.requeueJob(first.message.jobId);
  const changed = await collectGovernor(store, first.message, {
    fetchImpl: async () => new Response(mutated, { status: 200, headers: { "content-type": "text/html" } }),
  });
  assert.equal(changed.skipped, false);
  const afterChange = await store.listRetrievals();
  assert.equal(afterChange.length, 2);
  const newRow = afterChange.find((row) => row.contentHash === mutatedHash);
  const oldRow = afterChange.find((row) => row.contentHash === originalHash);
  assert.ok(oldRow);
  assert.ok(newRow);
  assert.equal(oldRow?.rawObjectUri, firstUri);
  assert.notEqual(newRow?.rawObjectUri, firstUri);
  const newKey = objectKeyFromRawObjectUri(newRow?.rawObjectUri);
  assert.ok(newKey?.includes(mutatedHash));
  assert.equal(newKey?.includes(originalHash), false);
});

test("E2: sha256Hex hashes only the exact view, not a larger backing store", async () => {
  const backing = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const view = new Uint8Array(backing.buffer, 2, 3);
  assert.deepEqual([...view], [3, 4, 5]);
  const fromView = await sha256Hex(view);
  const fromCopy = await sha256Hex(new Uint8Array([3, 4, 5]));
  const fromBacking = await sha256Hex(backing);
  assert.equal(fromView, fromCopy);
  assert.notEqual(fromView, fromBacking);
  const copied = exactByteCopy(view);
  assert.equal(copied.byteLength, 3);
  assert.equal(copied.byteOffset, 0);
});

test("F: withWorkerRun times out a never-resolving run and does not leave the job leased", async () => {
  const store = createMemoryStore();
  const { message } = await queuedIngestJob(store, { dedupeKey: "ingest:florida-governor-official:hang" });
  await assert.rejects(
    () =>
      withWorkerRun({
        store,
        worker: worker(),
        message,
        runTimeoutMs: 40,
        run: () => new Promise(() => {}),
      }),
    (error: unknown) => error instanceof CivicError && error.errorClass === "worker_run_timeout",
  );
  const runs = await store.listWorkerRuns();
  assert.equal(runs.length, 1);
  assert.ok(runs[0]?.status === "failed" || runs[0]?.status === "degraded" || runs[0]?.status === "cancelled");
  assert.ok(runs[0]?.completedAt);
  const job = await store.getJob(message.jobId);
  assert.ok(job?.status === "failed" || job?.status === "dead_letter");
  assert.equal(job?.leasedBy, undefined);
  assert.equal(job?.leaseExpiresAt, undefined);
});

test("G: duplicate queue delivery while leased skips persist and acks", async () => {
  const store = createMemoryStore();
  const { message } = await queuedIngestJob(store, { dedupeKey: "ingest:florida-governor-official:dup" });
  let release!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  let persistCalls = 0;
  const firstAcks: string[] = [];
  const secondAcks: string[] = [];

  const first = runQueueJobWithWorker({
    store,
    worker: worker(),
    message,
    handle: {
      ack: () => firstAcks.push("ack"),
      retry: () => firstAcks.push("retry"),
    },
    run: async () => {
      await hold;
      persistCalls += 1;
      const collected = await runCollectorJob({
        store,
        message,
        bucket: createMemoryBucket(),
        worker: worker(),
        fetchImpl: async () => new Response(governorHtml, { status: 200, headers: { "content-type": "text/html" } }),
      });
      return {
        result: collected,
        recordsRead: 1,
        recordsWritten: collected.claimsWritten,
        claimsVerified: 0,
      };
    },
  });

  await waitFor(async () => (await store.getJob(message.jobId))?.status === "leased");

  const second = await runQueueJobWithWorker({
    store,
    worker: worker(),
    message,
    handle: {
      ack: () => secondAcks.push("ack"),
      retry: () => secondAcks.push("retry"),
    },
    run: async () => {
      persistCalls += 1;
      throw new Error("duplicate delivery must not persist");
    },
  });

  assert.equal(isWorkerRunSkip(second), true);
  assert.deepEqual(secondAcks, ["ack"]);
  assert.equal(persistCalls, 0);
  assert.equal((await store.listOccupancies()).length, 0);
  const skipRun = (await store.listWorkerRuns()).find((run) => run.status === "cancelled");
  assert.ok(skipRun);
  assert.equal(skipRun?.errorClass, "lease_not_acquired");

  release();
  const firstOutcome = await first;
  assert.equal(firstOutcome.skipped, false);
  assert.equal(persistCalls, 1);
  assert.equal((await store.listOccupancies()).length, 1);
  assert.deepEqual(firstAcks, ["ack"]);
  const ownerJob = await store.getJob(message.jobId);
  assert.equal(ownerJob?.status, "succeeded");
  assert.equal(ownerJob?.leasedBy, undefined);
});

test("failJob and completeWorkerRun clear lease and patch the started worker_run in both stores", async () => {
  const memory = createMemoryStore();
  const { job } = await memory.scheduleJob({
    dedupeKey: "ingest:florida-governor-official:fail-lease",
    route: "ingest",
    sourceKey: "florida-governor-official",
  });
  const leased = await memory.leaseJob(job.jobId, "civiclenz-collector");
  assert.equal(leased?.status, "leased");
  const failed = await memory.failJob(job.jobId, "worker_run_timeout", "timed out");
  assert.equal(failed.status, "failed");
  assert.equal(failed.leasedBy, undefined);
  assert.equal(failed.leaseExpiresAt, undefined);

  const started = await memory.recordWorkerRun({
    workerKey: "civiclenz-collector",
    runtime: "test",
    status: "started",
    startedAt: "2026-09-02T00:00:00.000Z",
    recordsRead: 0,
    recordsWritten: 0,
    claimsVerified: 0,
    metadata: {},
  });
  const patched = await memory.completeWorkerRun(started.workerRunId, { status: "failed", errorClass: "worker_run_timeout" });
  assert.equal(patched.workerRunId, started.workerRunId);
  assert.equal(patched.status, "failed");
  assert.equal((await memory.listWorkerRuns()).length, 1);

  const patches: Array<{ path: string; body: Record<string, unknown> }> = [];
  const supabase = createSupabaseStore({
    url: "https://example.supabase.co",
    serviceRoleKey: "service-role-test-key",
    fetchImpl: async (input, init) => {
      const url = String(input);
      const parsed = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      if ((init?.method ?? "GET").toUpperCase() === "PATCH") {
        patches.push({ path: url, body: parsed });
      }
      if (url.includes("worker_runs")) {
        return new Response(
          JSON.stringify([
            {
              worker_run_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              worker_key: "civiclenz-collector",
              runtime: "cloudflare",
              status: parsed.status ?? "failed",
              started_at: "2026-09-02T00:00:00.000Z",
              completed_at: parsed.completed_at ?? "2026-09-02T00:00:01.000Z",
              records_read: 0,
              records_written: 0,
              claims_verified: 0,
              metadata: {},
            },
          ]),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify([
          {
            job_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            job_type: "ingest",
            status: parsed.status ?? "failed",
            attempt_count: 2,
            max_attempts: 5,
            priority: 100,
            dedupe_key: "ingest:x",
            payload: {},
            checkpoint: {},
            scheduled_for: "2026-09-02T00:00:00.000Z",
            leased_by: parsed.leased_by ?? null,
            lease_expires_at: parsed.lease_expires_at ?? null,
            error_class: parsed.error_class ?? null,
            error_message: parsed.error_message ?? null,
          },
        ]),
        { status: 200 },
      );
    },
  });
  await supabase.failJob("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "worker_run_timeout", "timed out");
  const failPatch = patches.find((item) => item.path.includes("jobs"));
  assert.equal(failPatch?.body.leased_by, null);
  assert.equal(failPatch?.body.lease_expires_at, null);
  await supabase.completeWorkerRun("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", { status: "cancelled" });
  const runPatch = patches.find((item) => item.path.includes("worker_runs") && item.path.includes("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"));
  assert.ok(runPatch);
  assert.equal(runPatch?.body.status, "cancelled");
});
