// Deployment trigger: operator enqueue hotfix on main; no runtime behavior change.
import {
  OPERATOR_ENQUEUE_PATH,
  authorizeOperator,
  enqueueExistingQueuedJob,
  responseContainsSecret,
} from "../../shared/src/operator-enqueue.ts";
import { parseQueueJobMessage } from "../../shared/src/queue-messages.ts";
import { planAndEnqueue } from "../../shared/src/scheduler.ts";
import { createSupabaseStore } from "../../shared/src/supabase-store.ts";
import type { CivicStore } from "../../shared/src/store.ts";
import { sanitizeErrorMessage } from "../../shared/src/errors.ts";
import { deploymentIdFrom, withWorkerRun } from "../../shared/src/worker-lifecycle.ts";

export type SchedulerFetchDeps = {
  store?: CivicStore;
  now?: Date;
};

function queues(env: Env) {
  return {
    ingest: env.INGEST_QUEUE,
    validate: env.VALIDATE_QUEUE,
    monitor: env.MONITOR_QUEUE,
    heavy: env.HEAVY_QUEUE,
    deadLetter: env.DEAD_LETTER_QUEUE,
  };
}

function store(env: Env, deps?: SchedulerFetchDeps) {
  if (deps?.store) return deps.store;
  return createSupabaseStore({
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

function worker(env: Env) {
  return {
    workerKey: env.WORKER_KEY || "civiclenz-scheduler",
    runtime: "cloudflare" as const,
    deploymentId: deploymentIdFrom(env),
  };
}

function jsonResponse(body: unknown, status: number, secrets: Array<string | undefined>): Response {
  if (responseContainsSecret(body, secrets)) {
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
  return Response.json(body, { status });
}

async function runSchedule(env: Env, dryRun: boolean, deps?: SchedulerFetchDeps) {
  const civicStore = store(env, deps);
  return withWorkerRun({
    store: civicStore,
    worker: worker(env),
    secrets: [env.SUPABASE_SERVICE_ROLE_KEY, env.CIVICLENZ_OPERATOR_TRIGGER_SECRET],
    queues: queues(env),
    run: async () => {
      const plan = await planAndEnqueue({
        store: civicStore,
        queues: queues(env),
        dryRun,
      });
      return {
        result: plan,
        recordsRead: plan.skippedActive.length + plan.scheduled.length,
        recordsWritten: plan.scheduled.length,
        claimsVerified: 0,
      };
    },
  });
}

async function handleOperatorEnqueue(request: Request, env: Env, deps?: SchedulerFetchDeps): Promise<Response> {
  const secrets = [env.CIVICLENZ_OPERATOR_TRIGGER_SECRET, env.SUPABASE_SERVICE_ROLE_KEY];
  const authorized = await authorizeOperator(
    request.headers.get("Authorization"),
    env.CIVICLENZ_OPERATOR_TRIGGER_SECRET,
  );
  if (!authorized) {
    return jsonResponse({ error: "unauthorized" }, 401, secrets);
  }
  let jobId: unknown;
  try {
    const parsed = (await request.json()) as { jobId?: unknown };
    jobId = parsed?.jobId;
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400, secrets);
  }
  if (typeof jobId !== "string") {
    return jsonResponse({ error: "invalid_job_id" }, 400, secrets);
  }
  try {
    const result = await enqueueExistingQueuedJob({
      store: store(env, deps),
      queues: queues(env),
      jobId,
      now: deps?.now,
    });
    return jsonResponse(result.body, result.status, secrets);
  } catch (error) {
    const message = sanitizeErrorMessage(error instanceof Error ? error.message : "enqueue_failed", secrets);
    return jsonResponse({ error: "enqueue_failed", message }, 500, secrets);
  }
}

export async function handleSchedulerFetch(request: Request, env: Env, deps?: SchedulerFetchDeps): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/health" && request.method === "GET") {
    return Response.json({
      worker: env.WORKER_KEY || "civiclenz-scheduler",
      dryRun: env.DRY_RUN !== "false",
      deploymentId: deploymentIdFrom(env) ?? null,
      supabaseConfigured: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
      queueBindingsConfigured: Boolean(env.INGEST_QUEUE && env.VALIDATE_QUEUE && env.MONITOR_QUEUE && env.HEAVY_QUEUE),
    });
  }
  if (url.pathname === OPERATOR_ENQUEUE_PATH) {
    if (request.method !== "POST") {
      return new Response("method not allowed", { status: 405 });
    }
    return handleOperatorEnqueue(request, env, deps);
  }
  if (url.pathname === "/dry-run" && request.method === "POST") {
    const plan = await runSchedule(env, true, deps);
    return Response.json({
      dryRun: true,
      scheduledDedupeKeys: plan.scheduled.map((job) => job.dedupeKey),
      skippedActive: plan.skippedActive,
      enqueued: plan.enqueued.length,
    });
  }
  return new Response("not found", { status: 404 });
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext) {
    const dryRun = env.DRY_RUN !== "false";
    await runSchedule(env, dryRun);
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    return handleSchedulerFetch(request, env);
  },
} satisfies ExportedHandler<Env>;

export { parseQueueJobMessage };
