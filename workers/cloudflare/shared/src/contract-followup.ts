import { GOVERNOR_CONTEXT_VERSION, GOVERNOR_CONTEXT_URL, parseGovernorContext } from './governor-context-parser.ts';

/** One HERMES-leased current-office research unit; no canonical truth writes. */
import { fetchDocument } from './http.ts';
import { sha256Hex } from './hash.ts';
import { uuidFromName } from './ids.ts';
import { sourceAdapter } from './source-config.ts';
import { dispatchSourceAdapter } from './adapters.ts';
import { objectKeyFromRawObjectUri, rawObjectUri } from './r2-keys.ts';
import { withTimeout } from './timeouts.ts';
import { CivicError, HttpFetchError } from './errors.ts';
import type { EvidenceBucket } from './types.ts';

type Row = Record<string, any>;
type Database = (path: string, method?: string, body?: Row) => Promise<Row[]>;
export const FOLLOWUP_VERSION = 'hermes-validation-followup-v1';
const uuid = (s: unknown): s is string => typeof s === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(s);
const canonical = (j: Row) => j.payload?.orchestration_authority === 'hermes' && j.payload?.execution_class === 'PRODUCTION'
  && !!j.dedupe_key && j.dedupe_key === j.payload?.research_work_identity;

export async function runValidationFollowup(input: {
  message: unknown; database: Database; bucket: EvidenceBucket; deploymentId?: string; fetchImpl?: typeof fetch;
}): Promise<void> {
  const m = input.message as Row, db = input.database;
  const context = m?.schemaVersion === 'hermes.governor-context.v1';
  const version = context ? GOVERNOR_CONTEXT_VERSION : FOLLOWUP_VERSION;
  const allowance = context ? 'governor-context-initial-v1' : 'validation-followup-initial-v1';
  const workerKey = context ? 'hermes.cloudflare.governor_context' : 'hermes.cloudflare.validation_followup';
  if ((!context && m?.schemaVersion !== 'hermes.validation-followup.v1') || !uuid(m.job_id)
      || !/^[a-f0-9]{64}$/.test(m.attempt_token ?? '')) throw Error('invalid_followup_envelope');
  const lease = `jobs?job_id=eq.${m.job_id}&status=eq.leased&leased_by=eq.${m.attempt_token}&lease_expires_at=gt.now`;
  const [j] = await db(lease);
  if (!j) return;
  const p = j.payload ?? {}, route = p.capability_route ?? {}, link = p.validation_followup ?? {};
  const config = sourceAdapter(route.source_key);
  if (!canonical(j) || j.job_type !== 'contract_scope_research' || !(context ? ['identity','person','occupancy'] : ['current_occupant']).includes(p.scope_key)
      || j.target_type !== 'seat' || j.seat_id !== j.target_id || !uuid(j.target_id) || !uuid(j.research_need_id)
      || !Number.isInteger(j.attempt_count) || j.attempt_count < 1 || j.attempt_count > j.max_attempts
      || p.dispatch_blocker || m.research_work_identity !== j.dedupe_key
      || !Number.isFinite(Date.parse(j.lease_expires_at)) || Date.parse(j.lease_expires_at) - Date.now() < 90000
      || link.allowance !== allowance || link.scope !== p.scope_key
      || !['receipt_id','receipt_job_id','evidence_need_id','claim_id','parent_evidence_id'].every(k => uuid(link[k]))
      || !uuid(p.contract_id) || typeof p.contract_version !== 'string'
      || route.version !== version || route.capability !== (context ? 'governor_authoritative_context' : 'current_occupant_context_research')
      || route.worker !== 'civiclenz-collector' || route.research_need_id !== j.research_need_id
      || !input.deploymentId || route.deployment_id !== input.deploymentId
      || route.source_key !== 'florida-governor-official' || !uuid(route.source_id)
      || !config?.active || config.heavyRequired || config.schemaCertified !== false
      || route.source_url !== config.baseUrl || route.retrieval_url !== (context ? GOVERNOR_CONTEXT_URL : 'https://www.flgov.com/eog/')
      || config.authorityTier !== 'TIER_1_PRIMARY_OFFICIAL' || config.officeScope !== 'governor'
      || route.max_bytes !== 1048576 || route.timeout_seconds !== 15) throw Error('followup_route_rejected');
  const runId = await uuidFromName(`hermes-followup-run:${j.job_id}:${m.attempt_token}`);
  if ((await db(`worker_runs?worker_run_id=eq.${runId}`)).length) return;
  const started = Date.now();
  const completeTime = () => new Date(Math.max(started, Date.now())).toISOString();
  const lineage = { job_id: j.job_id, research_need_id: j.research_need_id, research_work_identity: j.dedupe_key,
    receipt_id: link.receipt_id, context_parent_job_id: context ? link.context_parent_job_id : null, receipt_job_id: link.receipt_job_id, evidence_need_id: link.evidence_need_id,
    parent_evidence_id: link.parent_evidence_id, claim_id: link.claim_id,
    attempt_token: m.attempt_token, attempt_count: j.attempt_count, deployment_id: input.deploymentId,
    orchestration_authority: 'hermes', execution_class: 'PRODUCTION', worker_run_id: runId,
    route, tool: 'http.ts:fetchDocument', parser_key: context ? 'florida-governor-leadership-card' : 'official-profile-discovery', parser_version: version };
  await db('worker_runs', 'POST', { worker_run_id: runId, job_id: j.job_id,
    worker_key: workerKey, runtime: 'cloudflare', deployment_id: input.deploymentId,
    status: 'started', started_at: new Date(started).toISOString(), metadata: lineage });
  const assertLease = async () => { if (!(await db(lease)).length) throw Error('followup_lease_lost'); };
  try {
    const [receipt] = await db(`validation_runs?validation_run_id=eq.${link.receipt_id}`);
    const [parent] = await db(`jobs?job_id=eq.${link.receipt_job_id}&status=eq.succeeded`);
    if (!receipt || receipt.status !== 'ACCEPTED_FOR_VALIDATION' || receipt.validator_key !== 'hermes.internal.receipt.v1'
        || receipt.subject_id !== j.target_id || receipt.input_summary?.job_id !== link.receipt_job_id
        || receipt.result_summary?.claim_id !== link.claim_id || receipt.result_summary?.evidence_id !== link.parent_evidence_id
        || receipt.result_summary?.gate_facts?.outcome !== 'NEEDS_FURTHER_VALIDATION'
        || !parent || !canonical(parent) || parent.job_type !== 'contract_evidence_validate'
        || parent.research_need_id !== link.evidence_need_id || parent.target_id !== j.target_id
        || parent.payload.contract_id !== p.contract_id || parent.payload.contract_version !== p.contract_version
        || receipt.input_summary?.research_work_identity !== parent.dedupe_key
        || parent.checkpoint?.validation_run_id !== link.receipt_id
        || parent.checkpoint?.independent_safety_check !== 'UNCHANGED_OCCUPANCY_AND_VERIFIED_CLAIMS') throw Error('followup_receipt_lineage_rejected');
    if (context) {
      if (!uuid(link.context_parent_job_id)) throw Error('context_parent_missing');
      const [prior] = await db(`jobs?job_id=eq.${link.context_parent_job_id}&status=eq.succeeded`);
      if (!prior || !canonical(prior) || prior.target_id !== j.target_id
          || prior.payload?.validation_followup?.receipt_id !== link.receipt_id
          || prior.payload?.capability_route?.version !== FOLLOWUP_VERSION
          || prior.checkpoint?.independent_acknowledgement !== 'HERMES_ARTIFACT_LINEAGE_AND_UNCHANGED_TRUTH') throw Error('context_parent_unproven');
    }
    const [claim] = await db(`claims?claim_id=eq.${link.claim_id}`);
    const [oldEvidence] = await db(`evidence_objects?evidence_id=eq.${link.parent_evidence_id}`);
    const [oldLink] = await db(`claim_evidence?claim_id=eq.${link.claim_id}&evidence_id=eq.${link.parent_evidence_id}&role=eq.supports`);
    const [seat] = await db(`seats?seat_id=eq.${j.target_id}`);
    const [source] = await db(`sources?source_id=eq.${route.source_id}`);
    const [contract] = await db(`research_contracts?research_contract_id=eq.${p.contract_id}&active=eq.true`);
    const [field] = await db(`research_contract_fields?research_contract_id=eq.${p.contract_id}&field_key=eq.${p.scope_key}`);
    if (!claim || claim.subject_type !== 'seat' || claim.subject_id !== j.target_id || claim.seat_id !== j.target_id
        || claim.field_key !== 'current_occupant' || claim.verification_state !== 'collected_unreviewed'
        || !oldEvidence || oldEvidence.verification_state !== 'pending' || !oldLink
        || !seat || seat.seat_key !== `${config.jurisdiction}-${config.officeScope}`
        || !source?.active || source.source_key !== route.source_key || source.source_url !== config.baseUrl
        || source.authority_tier !== config.authorityTier || !contract || String(contract.version) !== p.contract_version
        || !(context && ['person','occupancy'].includes(p.scope_key) ? ['review'] : ['official_source']).includes(field?.verification_requirement) || field?.sensitivity_rule !== 'publication_eligible_claims_only'
        || typeof field?.source_priority?.policy !== 'string'
        || !field.source_priority.policy.split(',').map((s: string) => s.trim()).includes(route.source_key)) throw Error('followup_context_rejected');
    const document = await fetchDocument(route.retrieval_url, { maxBytes: 1048576, timeoutMs: 15000,
      fetchImpl: (url, init) => (input.fetchImpl ?? fetch)(url, { ...init, redirect: 'manual' }) });
    if (document.status !== 200 || !document.bytes.length || document.url !== route.retrieval_url
        || !/^text\/html(?:;|$)/i.test(document.contentType ?? '')) throw Error('followup_source_response_rejected');
    await assertLease();
    const digest = await sha256Hex(document.bytes);
    // The canonical raw store deduplicates identical source bytes by
    // (source_id, content_hash). Reuse only a fully verified immutable object;
    // never overwrite it or manufacture another retrieval row for the same
    // bytes. The worker-run still records this distinct observation/attempt.
    const [existingRaw] = await db(`raw_retrievals?source_id=eq.${route.source_id}&content_hash=eq.${digest}&select=retrieval_id,http_status,byte_length,raw_object_uri,retrieval_status`);
    let retrievalId: string, uri: string, evidenceBytes: Uint8Array, rawRetrievalReused = false;
    if (!input.bucket.get) throw Error('followup_r2_readback_required');
    const r2 = <T>(promise: Promise<T>) => withTimeout(promise, 10000, new CivicError('r2_timeout','R2 timeout'));
    if (existingRaw) {
      const existingKey = objectKeyFromRawObjectUri(existingRaw.raw_object_uri);
      if (existingRaw.http_status !== 200 || existingRaw.retrieval_status !== 'stored' || !existingKey
          || existingRaw.byte_length !== document.bytes.byteLength) throw Error('followup_existing_raw_invalid');
      const saved = await r2(input.bucket.get(existingKey));
      if (!saved || saved.byteLength !== document.bytes.byteLength || await sha256Hex(saved) !== digest) throw Error('followup_existing_raw_integrity_failed');
      retrievalId = existingRaw.retrieval_id; uri = existingRaw.raw_object_uri; evidenceBytes = saved; rawRetrievalReused = true;
    } else {
      retrievalId = await uuidFromName(`followup-retrieval:${runId}`);
      const key = `validation-followup/${runId}/${digest}.html`; uri = rawObjectUri('civiclenzevidence', key);
      const prior = await r2(input.bucket.get(key));
      if (prior && await sha256Hex(prior) !== digest) throw Error('followup_r2_collision');
      if (!prior) await r2(input.bucket.put(key, document.bytes, { contentType: document.contentType!, customMetadata: { sha256: digest } }));
      const saved = await r2(input.bucket.get(key));
      if (!saved || saved.byteLength !== document.bytes.byteLength || await sha256Hex(saved) !== digest) throw Error('followup_r2_integrity_failed');
      evidenceBytes = saved;
      await db('raw_retrievals', 'POST', { retrieval_id: retrievalId, source_id: route.source_id, job_id: j.job_id,
        source_url: document.url, retrieved_at: document.retrievedAt, http_status: 200, content_type: document.contentType,
        content_hash: digest, byte_length: saved.byteLength, raw_object_uri: uri, retrieval_status: 'stored',
        parser_key: context ? 'florida-governor-leadership-card' : 'official-profile-discovery', parser_version: version, metadata: { ...lineage, raw_retrieval_reused: false } });
    }
    await assertLease();
    // Preserve source bytes before parsing; parser failure never erases retrieval.
    const html = new TextDecoder('utf-8', { fatal: true }).decode(evidenceBytes);
    const contextual = context ? parseGovernorContext(html, document.url, seat.seat_key) : null;
    const parsed = contextual ? {holders:[contextual]} : await dispatchSourceAdapter({ sourceKey: route.source_key, bytes: evidenceBytes,
      sourceUrl: document.url, contentType: document.contentType });
    const holder = parsed.holders[0];
    if (parsed.holders.length !== 1 || !holder || holder.vacant || holder.seatKey !== seat.seat_key
        || holder.jurisdictionKey !== config.jurisdiction || holder.officeKind !== config.officeScope) throw Error('followup_parser_context_ambiguous');
    const pos = contextual ? contextual.charOffset : html.indexOf(holder.displayName);
    if (pos < 0) throw Error('followup_locator_missing');
    const start = contextual ? pos : Math.max(0, pos - 120);
    const excerpt = contextual ? contextual.excerpt : html.slice(start, pos + holder.displayName.length + 120);
    const encoder = new TextEncoder(), offset = encoder.encode(html.slice(0, start)).length;
    const evidenceId = await uuidFromName(`followup-evidence:${retrievalId}`);
    await assertLease();
    const [existingEvidence] = await db(`evidence_objects?evidence_id=eq.${evidenceId}`);
    if (existingEvidence) {
      if (existingEvidence.retrieval_id !== retrievalId || existingEvidence.source_id !== route.source_id
          || existingEvidence.content_hash !== digest || existingEvidence.asset_uri !== uri || existingEvidence.verification_state !== 'pending') throw Error('followup_existing_evidence_invalid');
    } else await db('evidence_objects', 'POST', { evidence_id: evidenceId, source_id: route.source_id, retrieval_id: retrievalId,
      evidence_type: 'html_excerpt', source_url: document.url, supporting_locator: `utf8-byte-offset:${offset};length:${encoder.encode(excerpt).length}`,
      excerpt, asset_uri: uri, content_hash: digest, verification_state: 'pending' });
    // Read candidates only. Even a single name match plus pending Occupancy is
    // not an independent identity anchor; do not copy status/dates from it.
    const people = await db(`persons?canonical_name=eq.${encodeURIComponent(holder.displayName)}&select=person_id,canonical_name,identity_status&limit=21`);
    const result = { ...lineage, authoritative_context: contextual, research_scope: p.scope_key,
      review_required: context && ['person','occupancy'].includes(p.scope_key), retrieval_id: retrievalId, evidence_id: evidenceId, sha256: digest, raw_retrieval_reused: rawRetrievalReused,
      display_value: holder.displayName, agrees_with_original_display: holder.displayName === claim.display_value,
      seat_context: { seat_id: seat.seat_id, seat_key: seat.seat_key, office: holder.officeKind, jurisdiction: holder.jurisdictionKey },
      identity_assessment: { state: 'NEEDS_IDENTITY_RESOLUTION', candidate_person_ids: people.map(x => x.person_id),
        contextual_candidate_proposed: !!contextual && people.length === 1,
        official_profile_url: contextual?.officialProfileUrl ?? null,
        candidates_truncated: people.length >= 21, resolved: false,
        reason: 'Official office context observed; canonical candidates lack independently established identity linkage' },
      source_suitability: { state: 'OFFICIAL_EXECUTIVE_PROFILE_CANDIDATE', source_id: route.source_id,
        reason: contextual ? 'Official leadership-card context observed; production page-role certification remains required' : 'Registered official office source; metadata parser alone does not certify current-office page role' },
      currentness_assessment: { state: 'CURRENT_OFFICE_CONTEXT_OBSERVED_NOT_VALIDATED', retrieved_at: document.retrievedAt,
        current_as_of: null, tenure_effective_period_established: false,
        reason: 'Observation time only; current page role and effective tenure require independent validation' },
      schema_certified: false, parser_certification: { state: 'NOT_CERTIFIED', parser_version: version,
        reason: contextual ? 'Leadership-card invariants and exact locator are not production certification; source-level certification remains false' : 'Single metadata-derived holder and exact locator are insufficient; no global source certification' },
      dataset_applicability: { state: 'NOT_APPLICABLE', field: 'current_occupant',
        reason: 'Single Person-to-Seat assertion, no finite-universe completeness assertion; canonical validation contract section 34' },
      contradiction_assessment: { state: 'PENDING_HERMES_COMPLETE_QUERY' },
      auto_verification_allowed: false, publication_eligible: false, decision: 'NEEDS_FURTHER_VALIDATION' };
    const validationId = await uuidFromName(`followup-assessment:${runId}`);
    await assertLease();
    await db('validation_runs', 'POST', { validation_run_id: validationId, subject_type: 'seat', subject_id: j.target_id,
      seat_id: j.target_id, validator_key: version, status: 'NEEDS_FURTHER_VALIDATION',
      started_at: new Date(started).toISOString(), completed_at: completeTime(), input_summary: lineage, result_summary: result });
    await assertLease();
    await db(`worker_runs?worker_run_id=eq.${runId}&status=eq.started`, 'PATCH', { status: 'succeeded', completed_at: completeTime(),
      records_read: 1, records_written: rawRetrievalReused ? 1 : 3, metadata: { ...lineage, retrieval_id: retrievalId, evidence_id: evidenceId, raw_retrieval_reused: rawRetrievalReused,
        sha256: digest, validation_run_id: validationId } });
  } catch (error) {
    const code = context && error instanceof HttpFetchError && [401,403].includes(error.httpStatus ?? 0)
      ? 'authoritative_source_access_restricted'
      : error instanceof Error && /^[a-z0-9_]+$/.test(error.message) ? error.message : 'followup_execution_failed';
    await db(`worker_runs?worker_run_id=eq.${runId}&status=eq.started`, 'PATCH', { status: 'failed', completed_at: completeTime(),
      error_class: code, error_message: 'Follow-up failed; preserve artifacts and consumed allowance', metadata: { ...lineage, retryable: false, http_status: error instanceof HttpFetchError ? error.httpStatus ?? null : null } });
    throw error;
  }
}
