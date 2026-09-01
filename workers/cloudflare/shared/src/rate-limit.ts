export type RateLimitState = {
  sourceKey: string;
  lastRequestAt?: number;
  consecutiveFailures: number;
  circuitOpenUntil?: number;
};

export type RateLimitPolicy = {
  minIntervalMs: number;
  maxConcurrent: number;
  backoffBaseMs?: number;
  maxBackoffMs?: number;
  circuitFailures?: number;
  circuitOpenMs?: number;
};

export function nextAllowedAt(state: RateLimitState, policy: RateLimitPolicy, now = Date.now()): number {
  if (state.circuitOpenUntil && state.circuitOpenUntil > now) return state.circuitOpenUntil;
  const last = state.lastRequestAt ?? 0;
  return last + policy.minIntervalMs;
}

export function canRequest(state: RateLimitState, policy: RateLimitPolicy, now = Date.now()): boolean {
  return now >= nextAllowedAt(state, policy, now);
}

export function backoffMs(failures: number, policy: RateLimitPolicy): number {
  const base = policy.backoffBaseMs ?? policy.minIntervalMs;
  const cap = policy.maxBackoffMs ?? 15 * 60 * 1000;
  const exp = Math.min(cap, base * 2 ** Math.max(0, failures - 1));
  const jitter = Math.floor(exp * 0.1 * ((failures % 7) / 7));
  return exp + jitter;
}

export function recordFailure(state: RateLimitState, policy: RateLimitPolicy, now = Date.now()): RateLimitState {
  const consecutiveFailures = state.consecutiveFailures + 1;
  const threshold = policy.circuitFailures ?? 5;
  return {
    ...state,
    lastRequestAt: now,
    consecutiveFailures,
    circuitOpenUntil: consecutiveFailures >= threshold ? now + (policy.circuitOpenMs ?? 30 * 60 * 1000) : undefined,
  };
}

export function recordSuccess(state: RateLimitState, now = Date.now()): RateLimitState {
  return { ...state, lastRequestAt: now, consecutiveFailures: 0, circuitOpenUntil: undefined };
}

export function retryAfterMs(header: string | null | undefined, fallbackMs: number): number {
  if (!header) return fallbackMs;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const when = Date.parse(header);
  if (!Number.isNaN(when)) return Math.max(0, when - Date.now());
  return fallbackMs;
}
