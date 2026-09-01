import { CivicError, sanitizeErrorMessage } from "./errors.ts";
import { createDeadLetterPayload, shouldDeadLetter } from "./dead-letter.ts";
import type { CivicStore } from "./store.ts";
import type { QueueJobMessage, RuntimeQueues, WorkerIdentity, WorkerRunRecord } from "./types.ts";

export async function withWorkerRun<T>(input: {
  store: CivicStore;
  worker: WorkerIdentity;
  message?: QueueJobMessage;
  secrets?: Array<string | undefined>;
  queues?: RuntimeQueues;
  run: () => Promise<{ result: T; recordsRead: number; recordsWritten: number; claimsVerified: number }>;
}): Promise<T> {
  const startedAt = new Date().toISOString();
  let run: WorkerRunRecord | undefined;
  try {
    run = await input.store.recordWorkerRun({
      workerKey: input.worker.workerKey,
      runtime: input.worker.runtime,
      deploymentId: input.worker.deploymentId,
      jobId: input.message?.jobId,
      status: "started",
      startedAt,
      recordsRead: 0,
      recordsWritten: 0,
      claimsVerified: 0,
      metadata: { queueRoute: input.message?.route, sourceKey: input.message?.sourceKey },
    });
    if (input.message) {
      await input.store.leaseJob(input.message.jobId, input.worker.workerKey);
    }
    const finished = await input.run();
    if (input.message) {
      await input.store.completeJob(input.message.jobId, "succeeded");
    }
    await input.store.recordWorkerRun({
      workerKey: input.worker.workerKey,
      runtime: input.worker.runtime,
      deploymentId: input.worker.deploymentId,
      jobId: input.message?.jobId,
      status: "succeeded",
      startedAt,
      completedAt: new Date().toISOString(),
      recordsRead: finished.recordsRead,
      recordsWritten: finished.recordsWritten,
      claimsVerified: finished.claimsVerified,
      metadata: { priorRunId: run.workerRunId },
    });
    return finished.result;
  } catch (error) {
    const civic = error instanceof CivicError ? error : new CivicError("worker_failed", error instanceof Error ? error.message : "unknown");
    const message = sanitizeErrorMessage(civic.message, input.secrets ?? []);
    const dead = input.message ? shouldDeadLetter(input.message.attempt + 1, civic.retryable) : false;
    if (input.message) {
      await input.store.failJob(input.message.jobId, civic.errorClass, message, dead);
    }
    if (dead && input.message && input.queues?.deadLetter) {
      await input.queues.deadLetter.send(
        createDeadLetterPayload({
          jobId: input.message.jobId,
          worker: input.worker.workerKey,
          sourceKey: input.message.sourceKey,
          errorClass: civic.errorClass,
          errorMessage: message,
          attemptCount: input.message.attempt + 1,
          payload: input.message,
        }),
      );
    }
    await input.store.recordWorkerRun({
      workerKey: input.worker.workerKey,
      runtime: input.worker.runtime,
      deploymentId: input.worker.deploymentId,
      jobId: input.message?.jobId,
      status: "failed",
      startedAt,
      completedAt: new Date().toISOString(),
      recordsRead: 0,
      recordsWritten: 0,
      claimsVerified: 0,
      errorClass: civic.errorClass,
      errorMessage: message,
      metadata: { priorRunId: run?.workerRunId, deadLetter: dead },
    });
    throw civic;
  }
}

export function deploymentIdFrom(env: { CF_VERSION_METADATA?: { id?: string }; CF_DEPLOYMENT_ID?: string }): string | undefined {
  return env.CF_VERSION_METADATA?.id ?? env.CF_DEPLOYMENT_ID;
}
