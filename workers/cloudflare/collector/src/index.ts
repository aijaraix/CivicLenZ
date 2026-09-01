import { runCollectorJob } from "../../shared/src/collector.ts";
import { CivicError } from "../../shared/src/errors.ts";
import { parseQueueJobMessage } from "../../shared/src/queue-messages.ts";
import { createSupabaseStore } from "../../shared/src/supabase-store.ts";
import type { EvidenceBucket } from "../../shared/src/types.ts";
import { deploymentIdFrom, withWorkerRun } from "../../shared/src/worker-lifecycle.ts";

function store(env: Env) {
  return createSupabaseStore({
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

function bucket(env: Env): EvidenceBucket {
  return {
    async put(key, value, options) {
      await env.EVIDENCE_BUCKET.put(key, value, {
        httpMetadata: { contentType: options.contentType },
        customMetadata: options.customMetadata,
      });
    },
  };
}

function queues(env: Env) {
  return {
    validate: env.VALIDATE_QUEUE,
    heavy: env.HEAVY_QUEUE,
    deadLetter: env.DEAD_LETTER_QUEUE,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return Response.json({
        worker: env.WORKER_KEY || "civiclenz-collector",
        deploymentId: deploymentIdFrom(env) ?? null,
      });
    }
    return new Response("not found", { status: 404 });
  },

  async queue(batch: MessageBatch<unknown>, env: Env, _ctx: ExecutionContext): Promise<void> {
    if (batch.queue === "civiclenz-heavy") {
      throw new CivicError("heavy_not_consumed", "civiclenz-collector must not consume civiclenz-heavy");
    }
    const civicStore = store(env);
    const identity = {
      workerKey: env.WORKER_KEY || "civiclenz-collector",
      runtime: "cloudflare" as const,
      deploymentId: deploymentIdFrom(env),
    };
    for (const message of batch.messages) {
      const parsed = parseQueueJobMessage(message.body);
      await withWorkerRun({
        store: civicStore,
        worker: identity,
        message: parsed,
        secrets: [env.SUPABASE_SERVICE_ROLE_KEY],
        queues: queues(env),
        run: async () => {
          const result = await runCollectorJob({
            store: civicStore,
            message: parsed,
            bucket: bucket(env),
            queues: queues(env),
            worker: identity,
          });
          if (result.status === "failed" || result.status === "dead_lettered") {
            throw new CivicError(result.errorClass ?? "collector_failed", result.errorMessage ?? "collector failed");
          }
          return {
            result,
            recordsRead: 1,
            recordsWritten: result.claimsWritten + (result.retrievalId ? 1 : 0),
            claimsVerified: 0,
          };
        },
      });
      message.ack();
    }
  },
} satisfies ExportedHandler<Env>;
