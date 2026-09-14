import { runContractExtraction } from "../../shared/src/contract-extraction.ts";
import { runCollectorJob } from "../../shared/src/collector.ts";
import { contractDatabase, runContractEvidence } from "../../shared/src/contract-evidence.ts";
import { CivicError } from "../../shared/src/errors.ts";
import { parseQueueJobMessage } from "../../shared/src/queue-messages.ts";
import { createSupabaseStore } from "../../shared/src/supabase-store.ts";
import type { EvidenceBucket } from "../../shared/src/types.ts";
import { deploymentIdFrom, runQueueJobWithWorker } from "../../shared/src/worker-lifecycle.ts";

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
    async get(key) {
      const object = await env.EVIDENCE_BUCKET.get(key);
      if (!object) return undefined;
      return new Uint8Array(await object.arrayBuffer());
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
      if (["hermes.contract.v1", "hermes.extraction.v1"].includes((message.body as { schemaVersion?: string })?.schemaVersion ?? "")) {
        try {
          const execute = (message.body as { schemaVersion: string }).schemaVersion === "hermes.extraction.v1" ? runContractExtraction : runContractEvidence;
          await execute({ message: message.body,
            database: contractDatabase(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY),
            bucket: bucket(env), deploymentId: deploymentIdFrom(env) });
          message.ack();
        } catch {
          // The canonical lease/attempt policy controls a new execution attempt.
          // Queue redelivery may only reconcile the same deterministic run.
          message.retry();
        }
        continue;
      }
      const parsed = parseQueueJobMessage(message.body);
      await runQueueJobWithWorker({
        store: civicStore,
        worker: identity,
        message: parsed,
        secrets: [env.SUPABASE_SERVICE_ROLE_KEY],
        queues: queues(env),
        handle: message,
        run: async () => {
          const result = await runCollectorJob({
            store: civicStore,
            message: parsed,
            bucket: bucket(env),
            queues: queues(env),
            worker: identity,
          });
          if (result.status === "failed" || result.status === "dead_letter") {
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
    }
  },
} satisfies ExportedHandler<Env>;
