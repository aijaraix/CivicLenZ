import { inferCapabilityFromJob } from "./worker-registry.ts";
import { CivicError, sanitizeErrorMessage } from "./errors.ts";
import { createDeadLetterPayload, shouldDeadLetter } from "./dead-letter.ts";
import type { CivicStore, CompleteWorkerRunInput } from "./store.ts";
import { sendQueueWithTimeout, withTimeout, WORKER_RUN_TIMEOUT_MS } from "./timeouts.ts";
import type { QueueJobMessage, RuntimeQueues, WorkerIdentity, WorkerRunRecord } from "./types.ts";

export type WorkerRunSkip = {
  skipped: true;
  reason: "lease_not_acquired";
};

export type WorkerRunOutcome<T> = { skipped: false; result: T } | WorkerRunSkip;

export function isWorkerRunSkip<T>(value: WorkerRunOutcome<T>): value is WorkerRunSkip {
  return value.skipped;
}

export type QueueDeliveryHandle = {
  ack(): void;
  retry(): void;
};

type RunSuccess<T> = {
  result: T;
  recordsRead: number;
  recordsWritten: number;
  claimsVerified: number;
};

function capabilityMetadata(message?: QueueJobMessage): Record<string, unknown> {
  return {
    queueRoute: message?.route,
    sourceKey: message?.sourceKey,
    capability: inferCapabilityFromJob({
      route: message?.route,
      sourceKey: message?.sourceKey,
      purpose: typeof message?.metadata?.purpose === "string" ? message.metadata.purpose : undefined,
    }),
  };
}

async function finalizeWorkerRun(
  store: CivicStore,
  run: WorkerRunRecord | undefined,
  input: CompleteWorkerRunInput,
): Promise<void> {
  if (!run) return;
  await store.completeWorkerRun(run.workerRunId, input);
}

export async function withWorkerRun<T>(input: {
  store: CivicStore;
  worker: WorkerIdentity;
  message?: QueueJobMessage;
  secrets?: Array<string | undefined>;
  queues?: RuntimeQueues;
  runTimeoutMs?: number;
  callTimeoutMs?: number;
  run: () => Promise<RunSuccess<T>>;
}): Promise<WorkerRunOutcome<T>> {
  const startedAt = new Date().toISOString();
  const runTimeoutMs = input.runTimeoutMs ?? WORKER_RUN_TIMEOUT_MS;
  let run: WorkerRunRecord | undefined;
  let acquiredLease = false;
  let terminal: "success" | "failed" | "skipped" | undefined;
  let finished: RunSuccess<T> | undefined;
  let civic: CivicError | undefined;
  let sanitizedMessage = "";
  let dead = false;

  const startRun = async (): Promise<WorkerRunRecord> =>
    input.store.recordWorkerRun({
      workerKey: input.worker.workerKey,
      runtime: input.worker.runtime,
      deploymentId: input.worker.deploymentId,
      jobId: input.message?.jobId,
      status: "started",
      startedAt,
      recordsRead: 0,
      recordsWritten: 0,
      claimsVerified: 0,
      metadata: capabilityMetadata(input.message),
    });

  try {
    if (input.message) {
      const leased = await input.store.leaseJob(input.message.jobId, input.worker.workerKey);
      if (!leased) {
        run = await startRun();
        await finalizeWorkerRun(input.store, run, {
          status: "cancelled",
          completedAt: new Date().toISOString(),
          recordsRead: 0,
          recordsWritten: 0,
          claimsVerified: 0,
          errorClass: "lease_not_acquired",
          errorMessage: "duplicate delivery did not acquire job lease",
          metadata: { ...capabilityMetadata(input.message), skipReason: "lease_not_acquired" },
        });
        terminal = "skipped";
        return { skipped: true, reason: "lease_not_acquired" };
      }
      acquiredLease = true;
    }

    run = await startRun();
    finished = await withTimeout(
      input.run(),
      runTimeoutMs,
      new CivicError("worker_run_timeout", `worker run exceeded ${runTimeoutMs}ms`, { retryable: true }),
    );
    terminal = "success";
    return { skipped: false, result: finished.result };
  } catch (error) {
    civic = error instanceof CivicError ? error : new CivicError("worker_failed", error instanceof Error ? error.message : "unknown");
    sanitizedMessage = sanitizeErrorMessage(civic.message, input.secrets ?? []);
    dead = input.message ? shouldDeadLetter(input.message.attempt + 1, civic.retryable) : false;
    terminal = "failed";
    if (dead && input.message && input.queues?.deadLetter) {
      try {
        await sendQueueWithTimeout(
          input.queues.deadLetter,
          createDeadLetterPayload({
            jobId: input.message.jobId,
            jobType: input.message.route,
            worker: input.worker.workerKey,
            sourceKey: input.message.sourceKey,
            targetType: input.message.entityType,
            targetId: input.message.entityId,
            errorClass: civic.errorClass,
            errorMessage: sanitizedMessage,
            attemptCount: input.message.attempt + 1,
            payload: input.message,
          }),
          input.callTimeoutMs,
        );
      } catch {
        // Fail-closed even if the dead-letter send times out or rejects.
      }
    }
    throw civic;
  } finally {
    if (terminal !== "skipped") {
      try {
        if (terminal === "success" && finished) {
          if (input.message && acquiredLease) {
            await input.store.completeJob(input.message.jobId, "succeeded");
          }
          await finalizeWorkerRun(input.store, run, {
            status: "succeeded",
            completedAt: new Date().toISOString(),
            recordsRead: finished.recordsRead,
            recordsWritten: finished.recordsWritten,
            claimsVerified: finished.claimsVerified,
            metadata: capabilityMetadata(input.message),
          });
        } else {
          const failed = civic ?? new CivicError("worker_failed", "worker run did not reach a terminal state");
          const message = sanitizedMessage || sanitizeErrorMessage(failed.message, input.secrets ?? []);
          const deadLetter = input.message ? shouldDeadLetter(input.message.attempt + 1, failed.retryable) : dead;
          if (input.message && acquiredLease) {
            await input.store.failJob(input.message.jobId, failed.errorClass, message, deadLetter);
          }
          if (run) {
            await finalizeWorkerRun(input.store, run, {
              status: "failed",
              completedAt: new Date().toISOString(),
              recordsRead: 0,
              recordsWritten: 0,
              claimsVerified: 0,
              errorClass: failed.errorClass,
              errorMessage: message,
              metadata: { ...capabilityMetadata(input.message), deadLetter },
            });
          } else if (input.message && acquiredLease) {
            await input.store.recordWorkerRun({
              workerKey: input.worker.workerKey,
              runtime: input.worker.runtime,
              deploymentId: input.worker.deploymentId,
              jobId: input.message.jobId,
              status: "failed",
              startedAt,
              completedAt: new Date().toISOString(),
              recordsRead: 0,
              recordsWritten: 0,
              claimsVerified: 0,
              errorClass: failed.errorClass,
              errorMessage: message,
              metadata: { deadLetter },
            });
          }
        }
      } catch {
        // Last-resort: never leave the caller blocked on finalize I/O.
      }
    }
  }
}

export async function settleQueueDelivery(input: {
  store: CivicStore;
  jobId: string;
  handle: QueueDeliveryHandle;
}): Promise<void> {
  const job = await input.store.getJob(input.jobId);
  if (job?.status === "queued") {
    input.handle.retry();
    return;
  }
  input.handle.ack();
}

export async function runQueueJobWithWorker<T>(input: {
  store: CivicStore;
  worker: WorkerIdentity;
  message: QueueJobMessage;
  handle: QueueDeliveryHandle;
  secrets?: Array<string | undefined>;
  queues?: RuntimeQueues;
  runTimeoutMs?: number;
  callTimeoutMs?: number;
  run: () => Promise<RunSuccess<T>>;
}): Promise<WorkerRunOutcome<T | undefined>> {
  try {
    return await withWorkerRun({
      store: input.store,
      worker: input.worker,
      message: input.message,
      secrets: input.secrets,
      queues: input.queues,
      runTimeoutMs: input.runTimeoutMs,
      callTimeoutMs: input.callTimeoutMs,
      run: input.run,
    });
  } catch {
    return { skipped: false, result: undefined };
  } finally {
    await settleQueueDelivery({ store: input.store, jobId: input.message.jobId, handle: input.handle });
  }
}

export function deploymentIdFrom(env: { CF_VERSION_METADATA?: { id?: string }; CF_DEPLOYMENT_ID?: string }): string | undefined {
  return env.CF_VERSION_METADATA?.id ?? env.CF_DEPLOYMENT_ID;
}
