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

// Behavioral integration tests of the production entrypoint. No live credentials or civic writes.
test("legacy operator endpoint retains authentication without granting dispatch authority", async () => {
  for (const secret of ["", "wrong-operator-secret"]) {
    const store = createMemoryStore(); const sent: SentMessage[] = [];
    const response = await enqueue(store, sent, { sourceKey: CONTROLLED_FLORIDA_SENATE_SOURCE_KEY }, { secret });
    assert.equal(response.status, 401);
    assertNoSecrets(await response.json(), ["wrong-operator-secret"]);
    assert.equal(sent.length, 0);
    assert.equal((await store.listJobs()).length, 0);
  }
});

test("authenticated legacy requests cannot create, requeue, lease, or dispatch canonical work", async () => {
  for (const status of ["queued", "leased", "running", "failed", "dead_letter", "succeeded"] as const) {
    for (const dryRun of ["true", "false"]) {
      const store = createMemoryStore(); seedJob(store, { status });
      const before = structuredClone(await store.listJobs()); const sent: SentMessage[] = [];
      for (const body of [{ jobId: CONTROLLED_MIAMI_DADE_INGEST_JOB_ID }, { sourceKey: CONTROLLED_FLORIDA_SENATE_SOURCE_KEY }, {}]) {
        const response = await enqueue(store, sent, body, { env: { DRY_RUN: dryRun } });
        assert.equal(response.status, 410);
        assert.deepEqual(await response.json(), { error: "legacy_enqueue_retired", authority: "HERMES" });
      }
      assert.deepEqual(await store.listJobs(), before);
      assert.equal((await store.listWorkerRuns()).length, 0);
      assert.equal(sent.length, 0);
    }
  }
});

test("health distinguishes configuration from dispatch and never exposes credentials", async () => {
  const env = testEnv([]);
  const response = await handleSchedulerFetch(new Request("https://civiclenz-scheduler.example/health"), env);
  const body = await response.json() as { dispatchActive: boolean; state: string; dryRun: boolean };
  assert.equal(body.dispatchActive, false);
  assert.equal(body.state, "LEGACY_PLANNER_DISABLED");
  assert.equal(body.dryRun, true);
  assertNoSecrets(body);
  const wrangler = readFileSync(path.join(repoRoot, "workers/cloudflare/scheduler/wrangler.jsonc"), "utf8");
  assert.match(wrangler, /"crons": \[\]/);
  assert.match(wrangler, /"DRY_RUN": "true"/);
});
