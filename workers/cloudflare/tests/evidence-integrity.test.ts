import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runCollectorJob } from "../shared/src/collector.ts";
import { retrievalUnchanged } from "../shared/src/change-detection.ts";
import { verifyEvidenceBytes, readVerifiedEvidence } from "../shared/src/evidence-integrity.ts";
import { sha256Hex } from "../shared/src/hash.ts";
import { createMemoryBucket } from "../shared/src/memory-bucket.ts";
import { createMemoryStore } from "../shared/src/store.ts";
import { createQueueJobMessage } from "../shared/src/queue-messages.ts";

const bytes = new TextEncoder().encode("explicit test evidence A");
const changed = new TextEncoder().encode("explicit test evidence B");

test("same-length overwritten bytes fail against the original content-addressed key", async () => {
  const digest = await sha256Hex(bytes);
  const key = `raw/test/2026/09/14/${digest}.html`;
  const bucket = createMemoryBucket();
  await bucket.put(key, changed, {});
  await assert.rejects(readVerifiedEvidence(bucket, key, digest), /disagree/);
  assert.deepEqual(await bucket.get!(key), changed, "verification must preserve the incident artifact");
  await assert.rejects(verifyEvidenceBytes(key, changed, await sha256Hex(changed)), /disagree/);
});

test("read-back distinguishes a real object from a successful-looking write", async () => {
  const digest = await sha256Hex(bytes);
  const key = `raw/test/2026/09/14/${digest}.html`;
  const bucket = createMemoryBucket();
  await assert.rejects(readVerifiedEvidence(bucket, key, digest), /missing/);
  await bucket.put(key, bytes, {});
  assert.deepEqual(await readVerifiedEvidence(bucket, key, digest), bytes);
});

test("changed bytes override a reused source ETag", async () => {
  assert.equal(retrievalUnchanged({ etag: 'same', contentHash: await sha256Hex(bytes) },
    { etag: 'same', contentHash: await sha256Hex(changed) }), false);
});

test("collector refuses corrupted R2 read-back before writing retrievals or civic state", async () => {
  const store = createMemoryStore();
  const fixture = readFileSync(new URL("../../../tests/fixtures/florida_governor_official.html", import.meta.url));
  const result = await runCollectorJob({
    store,
    message: createQueueJobMessage({ jobId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      dedupeKey: "TEST:corrupt-storage", route: "ingest", sourceKey: "florida-governor-official",
      sourceUrl: "https://www.flgov.com/", attempt: 0, scheduledFor: new Date().toISOString(), dryRun: false }),
    bucket: { async put() {}, async get() { return changed; } },
    worker: { workerKey: "integrity-test", runtime: "test" },
    fetchImpl: async () => new Response(fixture, { status: 200, headers: { "content-type": "text/html" } }),
  });
  assert.equal(result.errorClass, "evidence_integrity_mismatch");
  assert.equal((await store.listRetrievals()).length, 0);
  assert.equal((await store.listClaims()).length, 0);
  assert.equal((await store.listOccupancies()).length, 0);
});
