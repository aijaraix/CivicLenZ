import { summarizePayload } from "./errors.ts";
import type { DeadLetterPayload } from "./types.ts";

export function createDeadLetterPayload(input: {
  jobId: string;
  jobType?: string;
  worker: string;
  sourceKey?: string;
  errorClass: string;
  errorMessage: string;
  attemptCount: number;
  timestamp?: string;
  payload?: unknown;
}): DeadLetterPayload {
  if (!input.jobId) throw new Error("dead-letter payload requires jobId");
  if (!input.worker) throw new Error("dead-letter payload requires worker");
  if (!input.errorClass) throw new Error("dead-letter payload requires errorClass");
  return {
    schemaVersion: "1.0.0",
    jobId: input.jobId,
    jobType: input.jobType,
    worker: input.worker,
    sourceKey: input.sourceKey,
    errorClass: input.errorClass,
    errorMessage: input.errorMessage,
    attemptCount: input.attemptCount,
    timestamp: input.timestamp ?? new Date().toISOString(),
    payloadSummary: summarizePayload(input.payload),
  };
}

export const MAX_ATTEMPTS_BEFORE_DEAD_LETTER = 5;

export function shouldDeadLetter(attemptCount: number, retryable: boolean): boolean {
  if (!retryable) return true;
  return attemptCount >= MAX_ATTEMPTS_BEFORE_DEAD_LETTER;
}
