import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { signHarvesterPayload } from "../src/auth.ts";
import { HermesIngestReceiver } from "../src/receiver.ts";
import type { ProducerRegistry, ReceiverConfig, ResearchIngestEnvelope } from "../src/types.ts";

const TEST_SECRET = "TEST_ONLY_SHARED_SECRET_4fB7!nQ2$kL9@rX6%vC3*eH8";
const PRODUCER_ID = "civicslenzz-gemini-harvester";

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function registry(): ProducerRegistry {
  return {
    registry_version: "PRODUCER_REGISTRY_V1",
    producers: [
      {
        producer_id: PRODUCER_ID,
        active: true,
        allowed_result_contracts: ["CIVICLENZ_RESEARCH_INGEST_CONTRACT_V1"],
        accepted_job_contracts: ["HERMES_RESEARCH_JOB_V1"],
        allowed_capabilities: ["advance_research_harvest"],
        authority_boundary: "submit_extracted_unreviewed_only",
        direct_canonical_storage_access: false,
        canonical_verification_authority: false,
        canonical_publication_authority: false,
      },
    ],
  };
}

function payload(overrides: Partial<ResearchIngestEnvelope> = {}): ResearchIngestEnvelope {
  const evidenceBytes = Buffer.from("test evidence bytes", "utf8");
  const evidenceHash = sha256(evidenceBytes);
  return {
    contract_version: "CIVICLENZ_RESEARCH_INGEST_CONTRACT_V1",
    producer: { producer_id: PRODUCER_ID, producer_version: "test-1.0.0" },
    job: { job_id: "job-test-001", research_work_identity: "research-work-identity-test-001" },
    extraction_status: "extracted_unreviewed",
    capability: "advance_research_harvest",
    cohort: { cohort_key: "test-frontier", state: "HARVESTING" },
    sources: [{ source_key: "source-1", source_url: "https://example.org/official" }],
    retrievals: [
      {
        source_key: "source-1",
        source_url: "https://example.org/official",
        retrieved_at: "2026-09-08T00:00:00.000Z",
        content_hash: evidenceHash,
        mime_type: "text/plain",
        byte_length: evidenceBytes.byteLength,
        method: "deterministic_fetch",
        parser_version: "test-parser-1",
      },
    ],
    evidence: [
      {
        evidence_key: "evidence-1",
        source_url: "https://example.org/official",
        retrieved_at: "2026-09-08T00:00:00.000Z",
        mime_type: "text/plain",
        byte_length: evidenceBytes.byteLength,
        sha256: evidenceHash,
        content_base64: evidenceBytes.toString("base64"),
        method: "deterministic_fetch",
        parser_version: "test-parser-1",
      },
    ],
    entities: {
      jurisdiction_candidates: [{ candidate_key: "jurisdiction-1", attributes: { name: "Test jurisdiction" }, evidence_keys: ["evidence-1"] }],
      seat_candidates: [],
      person_candidates: [],
      occupancy_candidates: [],
      election_candidates: [],
      candidate_campaign_candidates: [],
    },
    claims: [],
    relationships: [],
    dataset_units: [],
    gis_boundaries: [],
    warnings: [],
    gaps: [],
    currentness: { current_as_of: "2026-09-08T00:00:00.000Z" },
    monitoring_recommendations: [],
    ...overrides,
  };
}

function bodyFor(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value), "utf8");
}

function headersFor(body: Buffer, producerId = PRODUCER_ID, secret = TEST_SECRET): Record<string, string> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  return {
    "x-civiclenz-producer-id": producerId,
    "x-civiclenz-timestamp": timestamp,
    "x-civiclenz-signature": `sha256=${signHarvesterPayload(secret, timestamp, body)}`,
  };
}

async function receiver(directory?: string, maxPendingReceipts = 10): Promise<{ receiver: HermesIngestReceiver; directory: string }> {
  const spoolDirectory = directory ?? (await mkdtemp(path.join(os.tmpdir(), "civiclenz-hermes-ingest-")));
  const config: ReceiverConfig = {
    bindHost: "127.0.0.1",
    port: 0,
    maxBodyBytes: 1024 * 1024,
    maxPendingReceipts,
    retryAfterSeconds: 1,
    maxClockSkewMs: 60_000,
    spoolDirectory,
    bridgeSecret: TEST_SECRET,
    registry: registry(),
  };
  const instance = new HermesIngestReceiver(config);
  await instance.initialize();
  return { receiver: instance, directory: spoolDirectory };
}

async function dispose(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: true });
}

test("valid authenticated submission is accepted for validation", async () => {
  const harness = await receiver();
  try {
    const body = bodyFor(payload());
    const result = await harness.receiver.handle(headersFor(body), body);
    assert.equal(result.statusCode, 202);
    assert.equal(result.acknowledgement.acknowledgement_state, "ACCEPTED_FOR_VALIDATION");
    assert.ok(result.acknowledgement.receipt_id);
  } finally {
    await dispose(harness.directory);
  }
});

test("valid extracted_unreviewed result remains explicitly unreviewed in durable intake", async () => {
  const harness = await receiver();
  try {
    const body = bodyFor(payload());
    const result = await harness.receiver.handle(headersFor(body), body);
    const receipt = await harness.receiver.spool.getReceipt(result.acknowledgement.receipt_id!);
    assert.equal(receipt?.envelope.extraction_status, "extracted_unreviewed");
    assert.equal(receipt?.dispatch_state, "PENDING_CANONICAL_DISPATCH");
  } finally {
    await dispose(harness.directory);
  }
});

test("invalid authentication is rejected without receipt creation", async () => {
  const harness = await receiver();
  try {
    const body = bodyFor(payload());
    const result = await harness.receiver.handle(headersFor(body, PRODUCER_ID, "wrong-test-secret"), body);
    assert.equal(result.statusCode, 401);
    assert.equal(result.acknowledgement.acknowledgement_state, "REJECTED_POLICY");
    assert.equal((await harness.receiver.telemetry()).receipts, 0);
  } finally {
    await dispose(harness.directory);
  }
});

test("missing authentication is rejected", async () => {
  const harness = await receiver();
  try {
    const body = bodyFor(payload());
    const result = await harness.receiver.handle({}, body);
    assert.equal(result.statusCode, 401);
    assert.equal(result.acknowledgement.acknowledgement_state, "REJECTED_POLICY");
  } finally {
    await dispose(harness.directory);
  }
});

test("attempted VERIFIED submission is rejected", async () => {
  const harness = await receiver();
  try {
    const body = bodyFor({ ...payload(), extraction_status: "VERIFIED" });
    const result = await harness.receiver.handle(headersFor(body), body);
    assert.equal(result.statusCode, 400);
    assert.equal(result.acknowledgement.acknowledgement_state, "REJECTED_SCHEMA");
  } finally {
    await dispose(harness.directory);
  }
});

test("invalid schema is rejected", async () => {
  const harness = await receiver();
  try {
    const invalid = payload() as unknown as Record<string, unknown>;
    delete invalid.job;
    const body = bodyFor(invalid);
    const result = await harness.receiver.handle(headersFor(body), body);
    assert.equal(result.statusCode, 400);
    assert.equal(result.acknowledgement.acknowledgement_state, "REJECTED_SCHEMA");
  } finally {
    await dispose(harness.directory);
  }
});

test("unsupported contract version is rejected", async () => {
  const harness = await receiver();
  try {
    const body = bodyFor({ ...payload(), contract_version: "CIVICLENZ_RESEARCH_INGEST_CONTRACT_V0" });
    const result = await harness.receiver.handle(headersFor(body), body);
    assert.equal(result.statusCode, 400);
    assert.equal(result.acknowledgement.acknowledgement_state, "REJECTED_SCHEMA");
  } finally {
    await dispose(harness.directory);
  }
});

test("unknown producer is rejected by canonical policy", async () => {
  const harness = await receiver();
  try {
    const body = bodyFor({ ...payload(), producer: { producer_id: "unknown-producer", producer_version: "1" } });
    const result = await harness.receiver.handle(headersFor(body, "unknown-producer"), body);
    assert.equal(result.statusCode, 403);
    assert.equal(result.acknowledgement.acknowledgement_state, "REJECTED_POLICY");
  } finally {
    await dispose(harness.directory);
  }
});

test("identical retry receives an explicit duplicate acknowledgement", async () => {
  const harness = await receiver();
  try {
    const body = bodyFor(payload());
    const first = await harness.receiver.handle(headersFor(body), body);
    const second = await harness.receiver.handle(headersFor(body), body);
    assert.equal(first.statusCode, 202);
    assert.equal(second.statusCode, 200);
    assert.equal(second.acknowledgement.acknowledgement_state, "DUPLICATE");
    assert.equal(second.acknowledgement.receipt_id, first.acknowledgement.receipt_id);
  } finally {
    await dispose(harness.directory);
  }
});

test("same job with new content receives a canonical conflict acknowledgement", async () => {
  const harness = await receiver();
  try {
    const firstBody = bodyFor(payload());
    const secondBody = bodyFor({ ...payload(), warnings: ["new content"] });
    await harness.receiver.handle(headersFor(firstBody), firstBody);
    const result = await harness.receiver.handle(headersFor(secondBody), secondBody);
    assert.equal(result.statusCode, 409);
    assert.equal(result.acknowledgement.acknowledgement_state, "CANONICAL_CONFLICT");
  } finally {
    await dispose(harness.directory);
  }
});

test("evidence hash match preserves an integrity-marked artifact", async () => {
  const harness = await receiver();
  try {
    const body = bodyFor(payload());
    const result = await harness.receiver.handle(headersFor(body), body);
    const receipt = await harness.receiver.spool.getReceipt(result.acknowledgement.receipt_id!);
    assert.equal(receipt?.evidence[0]?.integrity_state, "MATCH");
    assert.ok(receipt?.evidence[0]?.actual_sha256);
  } finally {
    await dispose(harness.directory);
  }
});

test("evidence hash mismatch is quarantined and rejected", async () => {
  const harness = await receiver();
  try {
    const bad = payload();
    bad.evidence[0]!.sha256 = "0".repeat(64);
    const body = bodyFor(bad);
    const result = await harness.receiver.handle(headersFor(body), body);
    assert.equal(result.statusCode, 422);
    assert.equal(result.acknowledgement.acknowledgement_state, "REJECTED_POLICY");
    assert.equal((await harness.receiver.telemetry()).quarantined_evidence, 1);
  } finally {
    await dispose(harness.directory);
  }
});

test("identity-resolution requirement is durable but not canonically promoted", async () => {
  const harness = await receiver();
  try {
    const value = payload();
    value.entities.jurisdiction_candidates[0]!.identity_resolution_required = true;
    const body = bodyFor(value);
    const result = await harness.receiver.handle(headersFor(body), body);
    assert.equal(result.statusCode, 202);
    assert.equal(result.acknowledgement.acknowledgement_state, "NEEDS_IDENTITY_RESOLUTION");
  } finally {
    await dispose(harness.directory);
  }
});

test("partial submission receives an explicit partial acknowledgement", async () => {
  const harness = await receiver();
  try {
    const body = bodyFor({ ...payload(), gaps: ["source set is incomplete"] });
    const result = await harness.receiver.handle(headersFor(body), body);
    assert.equal(result.statusCode, 202);
    assert.equal(result.acknowledgement.acknowledgement_state, "PARTIALLY_ACCEPTED");
  } finally {
    await dispose(harness.directory);
  }
});

test("durable pending limit returns backpressure with retry guidance", async () => {
  const harness = await receiver(undefined, 1);
  try {
    const firstBody = bodyFor(payload());
    const secondBody = bodyFor({ ...payload(), job: { job_id: "job-test-002", research_work_identity: "research-work-identity-test-002" } });
    await harness.receiver.handle(headersFor(firstBody), firstBody);
    const result = await harness.receiver.handle(headersFor(secondBody), secondBody);
    assert.equal(result.statusCode, 429);
    assert.equal(result.acknowledgement.acknowledgement_state, "RETRY_LATER");
    assert.equal(result.acknowledgement.retry_after_seconds, 1);
  } finally {
    await dispose(harness.directory);
  }
});

test("restart recovery rebuilds idempotency indexes", async () => {
  const harness = await receiver();
  try {
    const body = bodyFor(payload());
    const first = await harness.receiver.handle(headersFor(body), body);
    const recovered = await receiver(harness.directory);
    const second = await recovered.receiver.handle(headersFor(body), body);
    assert.equal(second.statusCode, 200);
    assert.equal(second.acknowledgement.receipt_id, first.acknowledgement.receipt_id);
  } finally {
    await dispose(harness.directory);
  }
});

test("acknowledgements never redact the secret by returning it", async () => {
  const harness = await receiver();
  try {
    const body = bodyFor(payload());
    const result = await harness.receiver.handle(headersFor(body), body);
    assert.equal(JSON.stringify(result).includes(TEST_SECRET), false);
  } finally {
    await dispose(harness.directory);
  }
});

test("acknowledgement shape is versioned and correlation-safe", async () => {
  const harness = await receiver();
  try {
    const body = bodyFor(payload());
    const result = await harness.receiver.handle(headersFor(body), body);
    assert.equal(result.acknowledgement.acknowledgement_version, "CIVICLENZ_HARVESTER_ACK_V1");
    assert.equal(result.acknowledgement.acknowledgement_state, "ACCEPTED_FOR_VALIDATION");
    assert.match(result.acknowledgement.correlation_id, /^[0-9a-f-]{36}$/i);
    assert.ok(result.acknowledgement.receipt_id);
    assert.ok(result.acknowledgement.result_content_hash);
  } finally {
    await dispose(harness.directory);
  }
});
