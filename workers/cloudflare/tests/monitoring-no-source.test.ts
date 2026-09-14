import assert from "node:assert/strict";
import test from "node:test";
import { runCollectorJob } from "../shared/src/collector.ts";
import { CivicError } from "../shared/src/errors.ts";
import { createMemoryStore } from "../shared/src/store.ts";
import { createQueueJobMessage } from "../shared/src/queue-messages.ts";

test("unconfigured monitoring cannot manufacture a no-authoritative-result claim", async () => {
  const store = createMemoryStore();
  let fetches = 0;
  const message = createQueueJobMessage({
    jobId: "11111111-1111-4111-8111-111111111111", route: "monitor",
    dedupeKey: "TEST:unconfigured-monitor", attempt: 0,
    scheduledFor: "2026-09-14T00:00:00Z", dryRun: false,
  });
  await assert.rejects(runCollectorJob({ store, message,
    worker: { workerKey: "test.collector", runtime: "cloudflare" },
    fetchImpl: async () => { fetches += 1; throw new Error("Unexpected source request"); },
  }), (error: unknown) => error instanceof CivicError && error.errorClass === "source_not_configured");
  assert.equal(fetches, 0);
  assert.equal((await store.listClaims()).length, 0);
  assert.equal((await store.listRetrievals()).length, 0);
});
