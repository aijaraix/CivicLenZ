import { CivicError } from "./errors.ts";
import { sha256Hex } from "./hash.ts";
import { withTimeout, EXTERNAL_CALL_TIMEOUT_MS } from "./timeouts.ts";
import type { EvidenceBucket } from "./types.ts";

/** Verify bytes against both the ledger digest and content-addressed key. */
export async function verifyEvidenceBytes(key: string, bytes: Uint8Array, expected: string): Promise<void> {
  const keyDigest = /\/([a-f0-9]{64})\.[a-z0-9]+$/.exec(key)?.[1];
  if (keyDigest !== expected || await sha256Hex(bytes) !== expected) {
    throw new CivicError("evidence_integrity_mismatch", "Evidence key, ledger digest and stored bytes disagree");
  }
}

export async function readVerifiedEvidence(
  bucket: EvidenceBucket | undefined, key: string, expected: string,
  timeoutMs = EXTERNAL_CALL_TIMEOUT_MS,
): Promise<Uint8Array> {
  if (!bucket?.get) throw new CivicError("r2_read_binding_missing", "Evidence verification requires R2 read access");
  const bytes = await withTimeout(bucket.get(key), timeoutMs,
    new CivicError("r2_read_timeout", "Evidence read-back timed out", { retryable: true }));
  if (!bytes) throw new CivicError("evidence_object_missing", "Referenced evidence object is missing");
  await verifyEvidenceBytes(key, bytes, expected);
  return bytes;
}
