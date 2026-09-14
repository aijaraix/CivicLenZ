/** Legacy global planner retired: canonical scheduling belongs to HERMES. */
import { OPERATOR_ENQUEUE_PATH, authorizeOperator } from "../../shared/src/operator-enqueue.ts";
import { deploymentIdFrom } from "../../shared/src/worker-lifecycle.ts";
import type { CivicStore } from "../../shared/src/store.ts";

export type SchedulerFetchDeps = { store?: CivicStore; now?: Date };

/** Deliberately performs no database, lease, queue, or worker-run writes. */
export async function runSchedule(_env: Env, _dryRun: boolean, _deps?: SchedulerFetchDeps) {
  return { authority: "HERMES", state: "LEGACY_PLANNER_DISABLED", dryRun: true,
    scheduled: [], skippedActive: [], enqueued: [], recoveredLeases: [] };
}

export async function handleSchedulerFetch(request: Request, env: Env, _deps?: SchedulerFetchDeps): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/health" && request.method === "GET") {
    return Response.json({ worker: env.WORKER_KEY || "civiclenz-scheduler",
      authority: "HERMES", state: "LEGACY_PLANNER_DISABLED", dispatchActive: false,
      dryRun: env.DRY_RUN !== "false", deploymentId: deploymentIdFrom(env) ?? null,
      supabaseConfigured: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
      queueBindingsConfigured: Boolean(env.INGEST_QUEUE && env.VALIDATE_QUEUE && env.MONITOR_QUEUE && env.HEAVY_QUEUE) });
  }
  if (url.pathname === OPERATOR_ENQUEUE_PATH) {
    if (request.method !== "POST") return new Response("method not allowed", { status: 405 });
    if (!await authorizeOperator(request.headers.get("Authorization"), env.CIVICLENZ_OPERATOR_TRIGGER_SECRET)) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "legacy_enqueue_retired", authority: "HERMES" }, { status: 410 });
  }
  if (url.pathname === "/dry-run" && request.method === "POST") {
    return Response.json(await runSchedule(env, true));
  }
  return new Response("not found", { status: 404 });
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext) {
    // Also safe if a stale deployed cron survives configuration reconciliation.
    await runSchedule(env, env.DRY_RUN !== "false");
  },
  async fetch(request: Request, env: Env) { return handleSchedulerFetch(request, env); },
} satisfies ExportedHandler<Env>;
export { parseQueueJobMessage } from "../../shared/src/queue-messages.ts";
