/** Executes a HERMES-owned lease. Never acquires a lease or publishes civic truth. */
import { fetchDocument } from "./http.ts";
import { sha256Hex } from "./hash.ts";
import { sourceAdapter } from "./source-config.ts";
import { evidenceObjectKey, rawObjectUri } from "./r2-keys.ts";
import { uuidFromName } from "./ids.ts";
import type { EvidenceBucket } from "./types.ts";
import { CivicError, HttpFetchError } from "./errors.ts";
import { withTimeout } from "./timeouts.ts";

type Row = Record<string, any>;
type RequestRows = (path: string, method?: string, body?: Row) => Promise<Row[]>;

export function contractDatabase(url: string, key: string): RequestRows {
  return async (path, method = "GET", body) => {
    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
      method, signal: AbortSignal.timeout(10000),
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
        Prefer: "return=representation" },
      body: body ? JSON.stringify(body) : undefined,
    });
    // Never propagate a response body or key into worker logs.
    if (!response.ok) throw new Error(`worker_store_http_${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error("worker_store_invalid_response");
    return rows;
  };
}

export async function runContractEvidence(input: {
  message: unknown; database: RequestRows; bucket: EvidenceBucket; deploymentId?: string;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const message = input.message as Row;
  if (message?.schemaVersion !== "hermes.contract.v1"
      || !/^[a-f0-9-]{36}$/.test(message.job_id ?? "")
      || !/^[a-f0-9]{64}$/.test(message.attempt_token ?? "")) throw new Error("invalid_canonical_envelope");
  const query = `jobs?job_id=eq.${message.job_id}&status=eq.leased&leased_by=eq.${message.attempt_token}&lease_expires_at=gt.now`;
  const [job] = await input.database(query);
  if (!job) return; // Stale delivery: no run, no retrieval, no alternate lease.
  const p = job.payload ?? {};
  const route = p.capability_route ?? {};
  const config = sourceAdapter(route.source_key);
  if (job.job_type !== "contract_scope_research" || !job.research_need_id
      || p.orchestration_authority !== "hermes" || p.execution_class !== "PRODUCTION"
      || p.scope_key !== "evidence" || p.dispatch_blocker
      || p.research_work_identity !== job.dedupe_key || message.research_work_identity !== job.dedupe_key
      || route.version !== "hermes-evidence-v1" || route.worker !== "civiclenz-collector"
      || !input.deploymentId || route.deployment_id !== input.deploymentId
      || !config?.active || config.heavyRequired || config.baseUrl !== route.source_url
      || config.authorityTier !== "TIER_1_PRIMARY_OFFICIAL"
      || route.max_bytes !== 1048576 || route.timeout_seconds !== 15
      || Date.parse(job.lease_expires_at) - Date.now() < 90000) throw new Error("canonical_route_or_lease_rejected");
  const runId = await uuidFromName(`hermes-contract-run:${job.job_id}:${message.attempt_token}`);
  const lineage = { orchestration_authority: "hermes", execution_class: "PRODUCTION",
    research_need_id: job.research_need_id, research_work_identity: job.dedupe_key,
    attempt_token: message.attempt_token, attempt_count: job.attempt_count,
    lease_expires_at: job.lease_expires_at, capability: route.capability,
    route, tool: "workers/cloudflare/shared/src/http.ts:fetchDocument" };
  const existing = await input.database(`worker_runs?worker_run_id=eq.${runId}`);
  if (existing.length) return; // Deterministic PK also fences concurrent duplicate deliveries.
  await input.database("worker_runs", "POST", { worker_run_id: runId, job_id: job.job_id,
    worker_key: "hermes.cloudflare.evidence", runtime: "cloudflare", deployment_id: input.deploymentId,
    status: "started", metadata: lineage });
  try {
    const document = await fetchDocument(route.source_url, { maxBytes: route.max_bytes,
      timeoutMs: 15000, fetchImpl: (url, init) => (input.fetchImpl ?? fetch)(url, { ...init, redirect: "error" }),
      // Redirects require separate source-policy review for this initial route.
    });
    if (document.status !== 200 || !document.bytes.length
        || new URL(document.url).hostname !== new URL(route.source_url).hostname) throw new Error("invalid_retrieval_response");
    if (!(await input.database(query)).length) throw new Error("lease_lost_before_persistence");
    const digest = await sha256Hex(document.bytes);
    const key = evidenceObjectKey({ sourceKey: route.source_key, retrievedAt: document.retrievedAt,
      sha256: digest, contentType: document.contentType });
    if (!input.bucket.get) throw new Error("r2_readback_required");
    const priorBytes = await withTimeout(input.bucket.get(key), 10000, new CivicError("r2_timeout", "R2 read timeout", { retryable: true }));
    if (priorBytes && await sha256Hex(priorBytes) !== digest) throw new Error("r2_existing_object_mismatch");
    if (!priorBytes) await withTimeout(input.bucket.put(key, document.bytes, { contentType: document.contentType,
      customMetadata: { sha256: digest, sourceUrl: route.source_url } }), 10000,
      new CivicError("r2_timeout", "R2 write timeout", { retryable: true }));
    const saved = await withTimeout(input.bucket.get(key), 10000, new CivicError("r2_timeout", "R2 read timeout", { retryable: true }));
    if (!saved || saved.byteLength !== document.bytes.byteLength || await sha256Hex(saved) !== digest) throw new Error("r2_readback_mismatch");
    if (!(await input.database(query)).length) throw new Error("lease_lost_before_result");
    const retrievalId = await uuidFromName(`hermes-contract-retrieval:${runId}`);
    await input.database("raw_retrievals", "POST", { retrieval_id: retrievalId, source_id: route.source_id,
      job_id: job.job_id, source_url: route.source_url, retrieved_at: document.retrievedAt,
      http_status: document.status, content_type: document.contentType, content_hash: digest,
      byte_length: document.bytes.byteLength, raw_object_uri: rawObjectUri("civiclenzevidence", key),
      retrieval_status: "stored", parser_key: "pending_extraction", parser_version: "none",
      metadata: { ...lineage, worker_run_id: runId, final_url: document.url } });
    await input.database(`worker_runs?worker_run_id=eq.${runId}&status=eq.started`, "PATCH", {
      status: "succeeded", completed_at: new Date().toISOString(), records_read: 1, records_written: 1,
      metadata: { ...lineage, retrieval_id: retrievalId, raw_object_uri: rawObjectUri("civiclenzevidence", key),
        sha256: digest, byte_length: document.bytes.byteLength, http_status: document.status } });
    // HERMES independently reads this result and owns all job/need transitions.
  } catch (error) {
    const failure = error instanceof CivicError ? error.errorClass
      : error instanceof Error && /^[a-z0-9_]+$/.test(error.message) ? error.message : "worker_execution_failed";
    await input.database(`worker_runs?worker_run_id=eq.${runId}&status=eq.started`, "PATCH", {
      status: "failed", completed_at: new Date().toISOString(), error_class: failure,
      error_message: "Real retrieval/persistence failed; no civic claim promoted", metadata: {
        ...lineage, retryable: error instanceof CivicError && error.retryable,
        http_status: error instanceof HttpFetchError ? error.httpStatus : undefined } });
    throw error;
  }
}
