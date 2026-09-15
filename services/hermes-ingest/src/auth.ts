import { createHmac, timingSafeEqual } from "node:crypto";

// Legacy hidden entry could preserve copied Markdown delimiters. Interpret only
// that exact documented representation; never try multiple keys or decode hex.
export function loadBridgeSecret(value: string): string {
  return /^`[0-9a-fA-F]{64}`$/.test(value) ? value.slice(1, -1) : value;
}

export type AuthHeaders = Record<string, string | string[] | undefined>;

export type AuthResult =
  | { ok: true; producerId: string }
  | { ok: false; reason: "missing_authentication" | "invalid_authentication" | "stale_authentication" };

function headerValue(headers: AuthHeaders, name: string): string | undefined {
  const value = headers[name.toLowerCase()] ?? headers[name];
  return Array.isArray(value) ? value[0] : value;
}

export function signHarvesterPayload(secret: string, timestamp: string, rawBody: Buffer): string {
  return createHmac("sha256", secret).update(timestamp).update(".").update(rawBody).digest("hex");
}

function parseTimestamp(value: string): number | undefined {
  if (/^\d{10}$/.test(value)) return Number(value) * 1000;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function verifyHarvesterAuthentication(
  headers: AuthHeaders,
  rawBody: Buffer,
  secret: string,
  maxClockSkewMs: number,
  now = Date.now(),
): AuthResult {
  const producerId = headerValue(headers, "x-civiclenz-producer-id");
  const timestamp = headerValue(headers, "x-civiclenz-timestamp");
  const supplied = headerValue(headers, "x-civiclenz-signature");
  if (!producerId || !timestamp || !supplied) return { ok: false, reason: "missing_authentication" };

  const parsedTimestamp = parseTimestamp(timestamp);
  if (parsedTimestamp === undefined || Math.abs(now - parsedTimestamp) > maxClockSkewMs) {
    return { ok: false, reason: "stale_authentication" };
  }

  const suppliedDigest = supplied.startsWith("sha256=") ? supplied.slice("sha256=".length) : supplied;
  if (!/^[a-f0-9]{64}$/i.test(suppliedDigest)) return { ok: false, reason: "invalid_authentication" };
  const expected = signHarvesterPayload(secret, timestamp, rawBody);
  const suppliedBytes = Buffer.from(suppliedDigest, "hex");
  const expectedBytes = Buffer.from(expected, "hex");
  if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) {
    return { ok: false, reason: "invalid_authentication" };
  }
  return { ok: true, producerId };
}
