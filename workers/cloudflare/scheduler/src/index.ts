import { parseQueueJobMessage } from "../../shared/src/queue-messages.ts";
import { planAndEnqueue } from "../../shared/src/scheduler.ts";
import { createSupabaseStore } from "../../shared/src/supabase-store.ts";
import { deploymentIdFrom, withWorkerRun } from "../../shared/src/worker-lifecycle.ts";

function queues(env: Env) {
  return {
    ingest: env.INGEST_QUEUE,
    validate: env.VALIDATE_QUEUE,
    monitor: env.MONITOR_QUEUE,
    heavy: env.HEAVY_QUEUE,
    deadLetter: env.DEAD_LETTER_QUEUE,
  };
}

function store(env: Env) {
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

async function runSchedule(env: Env, dryRun: boolean) {
  const civicStore = store(env);
  return withWorkerRun({
    store: civicStore,
    worker: worker(env),
    secrets: [env.SUPABASE_SERVICE_ROLE_KEY],
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

export default {
  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext) {
    const dryRun = env.DRY_RUN !== "false";
    await runSchedule(env, dryRun);
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return Response.json({
        worker: env.WORKER_KEY || "civiclenz-scheduler",
        dryRun: env.DRY_RUN !== "false",
        deploymentId: deploymentIdFrom(env) ?? null,
      });
    }
    if (url.pathname === "/dry-run" && request.method === "POST") {
      const plan = await runSchedule(env, true);
      return Response.json({
        dryRun: true,
        scheduledDedupeKeys: plan.scheduled.map((job) => job.dedupeKey),
        skippedActive: plan.skippedActive,
        enqueued: plan.enqueued.length,
      });
    }
    return new Response("not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

export { parseQueueJobMessage };
