import { CivicError } from "./errors.ts";
import type { QueueSender } from "./types.ts";

/** Bound for one Supabase, HTTP, R2, or queue call. Must stay well under the job lease. */
export const EXTERNAL_CALL_TIMEOUT_MS = 15_000;
/** Overall withWorkerRun budget. Must stay under the 15-minute job lease. */
export const WORKER_RUN_TIMEOUT_MS = 120_000;

export function timeoutSignal(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String((error as { name?: unknown }).name) : "";
  return name === "AbortError" || name === "TimeoutError";
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  error: CivicError,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      reject(error);
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (timedOut) {
      void promise.then(
        () => undefined,
        () => undefined,
      );
    }
  }
}

export async function sendQueueWithTimeout(
  queue: QueueSender | undefined,
  message: unknown,
  timeoutMs = EXTERNAL_CALL_TIMEOUT_MS,
): Promise<void> {
  if (!queue) return;
  await withTimeout(
    queue.send(message),
    timeoutMs,
    new CivicError("queue_send_timeout", `queue send exceeded ${timeoutMs}ms`, { retryable: true }),
  );
}
