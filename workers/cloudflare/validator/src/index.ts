import { CivicError } from "../../shared/src/errors.ts";
import { parseQueueJobMessage } from "../../shared/src/queue-messages.ts";
import { createSupabaseStore } from "../../shared/src/supabase-store.ts";
import { runValidatorJob } from "../../shared/src/validation.ts";
import { deploymentIdFrom, runQueueJobWithWorker } from "../../shared/src/worker-lifecycle.ts";

function store(env: Env) {
  return createSupabaseStore({
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return Response.json({
        worker: env.WORKER_KEY || "civiclenz-validator",
        deploymentId: deploymentIdFrom(env) ?? null,
      });
    }
    return new Response("not found", { status: 404 });
  },

  async queue(batch: MessageBatch<unknown>, env: Env, _ctx: ExecutionContext): Promise<void> {
    if (batch.queue === "civiclenz-heavy") {
      throw new CivicError("heavy_not_consumed", "civiclenz-validator must not consume civiclenz-heavy");
    }
    const civicStore = store(env);
    const identity = {
      workerKey: env.WORKER_KEY || "civiclenz-validator",
      runtime: "cloudflare" as const,
      deploymentId: deploymentIdFrom(env),
    };
    for (const message of batch.messages) {
      const parsed = parseQueueJobMessage(message.body);
      await runQueueJobWithWorker({
        store: civicStore,
        worker: identity,
        message: parsed,
        secrets: [env.SUPABASE_SERVICE_ROLE_KEY],
        queues: { heavy: env.HEAVY_QUEUE, deadLetter: env.DEAD_LETTER_QUEUE },
        handle: message,
        run: async () => {
          const result = await runValidatorJob({ store: civicStore, message: parsed });
          return {
            result,
            recordsRead: result.outcomes.length,
            recordsWritten: result.outcomes.length,
            claimsVerified: result.claimsVerified,
          };
        },
      });
    }
  },
} satisfies ExportedHandler<Env>;
