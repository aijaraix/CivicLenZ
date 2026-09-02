import {
  LEASE_EXPIRED_ERROR_CLASS,
  WORKER_RUN_LEASE_EXPIRED_MESSAGE,
} from "./jobs.ts";
import type { CivicStore } from "./store.ts";
import type { JobRecord } from "./types.ts";

export type RecoveredLeaseResult = {
  recovered: JobRecord[];
};

async function closeStaleStartedWorkerRuns(store: CivicStore, jobId: string, now: Date): Promise<void> {
  const runs = await store.listWorkerRunsForJob(jobId);
  for (const run of runs) {
    if (run.status !== "started" || run.completedAt) continue;
    await store.completeWorkerRun(run.workerRunId, {
      status: "failed",
      completedAt: now.toISOString(),
      errorClass: LEASE_EXPIRED_ERROR_CLASS,
      errorMessage: WORKER_RUN_LEASE_EXPIRED_MESSAGE,
    });
  }
}

/** Recover one expired leased job in place, then fail-close its stale started worker_runs. */
export async function recoverExpiredLeaseForJob(input: {
  store: CivicStore;
  jobId: string;
  now?: Date;
}): Promise<JobRecord | undefined> {
  const now = input.now ?? new Date();
  const recovered = await input.store.recoverExpiredLease(input.jobId, now);
  if (!recovered) return undefined;
  await closeStaleStartedWorkerRuns(input.store, recovered.jobId, now);
  return recovered;
}

/**
 * RECOVER STALE WORK: reclaim jobs still status=leased after lease_expires_at.
 * Same jobs row only. Does not insert jobs or dispatch queues.
 */
export async function recoverExpiredLeases(input: {
  store: CivicStore;
  now?: Date;
}): Promise<RecoveredLeaseResult> {
  const now = input.now ?? new Date();
  const expired = await input.store.listExpiredLeasedJobs(now);
  const recovered: JobRecord[] = [];
  for (const job of expired) {
    const updated = await recoverExpiredLeaseForJob({ store: input.store, jobId: job.jobId, now });
    if (updated) recovered.push(updated);
  }
  return { recovered };
}
