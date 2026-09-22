/** Canonical stored-byte extraction. No civic claim, occupancy or publication writes. */
import { dispatchSourceAdapter } from "./adapters.ts";
import { sha256Hex } from "./hash.ts";
import { uuidFromName } from "./ids.ts";
import { miamiDadeSeatKey, MIAMI_DADE_PARSER_VERSION } from "./miami-dade.ts";
import { objectKeyFromRawObjectUri } from "./r2-keys.ts";
import { withTimeout } from "./timeouts.ts";
import { CivicError } from "./errors.ts";
import type { EvidenceBucket, ExtractedOfficeholder } from "./types.ts";

type Row = Record<string, any>;
type Database = (path: string, method?: string, body?: Row | Row[]) => Promise<Row[]>;

const GOVERNOR_SOURCE_KEY = "florida-governor-official";
const MIAMI_DADE_SOURCE_KEY = "miami-dade-county-elected-officials";

function isGovernorEvidenceRoute(payload: Row, route: Row): boolean {
  return payload.scope_key === "evidence" &&
    route.stage === "extraction" &&
    route.capability === "official_profile_evidence_extraction" &&
    route.source_key === GOVERNOR_SOURCE_KEY;
}

function isRosterExtractionRoute(payload: Row, route: Row): boolean {
  return payload.scope_key === "seat" &&
    route.stage === "extraction" &&
    route.capability === "authoritative_roster_extraction" &&
    route.source_key === MIAMI_DADE_SOURCE_KEY &&
    route.identity_attribution === "unresolved" &&
    route.publication_eligible === false;
}

function unitKeyFor(holder: ExtractedOfficeholder, ordinal: number): string {
  const seatKey = miamiDadeSeatKey(holder);
  const name = holder.displayName.trim().toLowerCase().replace(/\s+/g, " ");
  return `${seatKey}|${name}|${ordinal}`;
}

async function readVerifiedRaw(input: {
  bucket: EvidenceBucket;
  raw: Row;
  maxBytes: number;
}): Promise<Uint8Array> {
  const key = objectKeyFromRawObjectUri(input.raw.raw_object_uri);
  if (!key || !input.bucket.get) throw Error("extraction_r2_required");
  const bytes = await withTimeout(
    input.bucket.get(key),
    10000,
    new CivicError("r2_timeout", "R2 read timeout", { retryable: true }),
  );
  if (!bytes || bytes.byteLength !== input.raw.byte_length || bytes.byteLength > input.maxBytes ||
      await sha256Hex(bytes) !== input.raw.content_hash) {
    throw Error("extraction_r2_hash_mismatch");
  }
  return bytes;
}

export async function runContractExtraction(input: {
  message: unknown;
  database: Database;
  bucket: EvidenceBucket;
  deploymentId?: string;
}): Promise<void> {
  const message = input.message as Row;
  if (message?.schemaVersion !== "hermes.extraction.v1" ||
      !/^[a-f0-9-]{36}$/.test(message.job_id ?? "") ||
      !/^[a-f0-9]{64}$/.test(message.attempt_token ?? "")) {
    throw Error("invalid_extraction_envelope");
  }
  const query = `jobs?job_id=eq.${message.job_id}&status=eq.leased&leased_by=eq.${message.attempt_token}&lease_expires_at=gt.now`;
  const [job] = await input.database(query);
  if (!job) return;

  const payload = job.payload ?? {};
  const route = payload.capability_route ?? {};
  const governorRoute = isGovernorEvidenceRoute(payload, route);
  const rosterRoute = isRosterExtractionRoute(payload, route);
  if (job.job_type !== "contract_evidence_extract" ||
      payload.orchestration_authority !== "hermes" ||
      payload.execution_class !== "PRODUCTION" ||
      payload.dispatch_blocker ||
      payload.research_work_identity !== job.dedupe_key ||
      message.research_work_identity !== job.dedupe_key ||
      route.version !== "hermes-evidence-v1" ||
      !input.deploymentId ||
      route.deployment_id !== input.deploymentId ||
      Date.parse(job.lease_expires_at) - Date.now() < 90000 ||
      !/^[a-f0-9-]{36}$/.test(payload.parent_job_id ?? "") ||
      !/^[a-f0-9-]{36}$/.test(route.input_retrieval_id ?? "") ||
      (!governorRoute && !rosterRoute)) {
    throw Error("extraction_route_rejected");
  }

  const [parent] = await input.database(`jobs?job_id=eq.${payload.parent_job_id}&status=eq.succeeded`);
  if (!parent ||
      parent.research_need_id !== job.research_need_id ||
      parent.target_id !== job.target_id ||
      parent.payload?.execution_class !== "PRODUCTION" ||
      parent.payload?.orchestration_authority !== "hermes" ||
      parent.dedupe_key !== payload.parent_research_work_identity ||
      parent.checkpoint?.retrieval_id !== route.input_retrieval_id ||
      parent.checkpoint?.sha256 !== route.input_sha256) {
    throw Error("extraction_parent_rejected");
  }
  const [raw] = await input.database(`raw_retrievals?retrieval_id=eq.${route.input_retrieval_id}&job_id=eq.${payload.parent_job_id}`);
  const expectedRawUrl = rosterRoute ? route.retrieval_url : (route.retrieval_url ?? raw?.source_url);
  if (!raw ||
      raw.content_hash !== route.input_sha256 ||
      raw.byte_length < 1 ||
      raw.byte_length > 1048576 ||
      raw.http_status !== 200 ||
      raw.source_id !== route.source_id ||
      raw.source_url !== expectedRawUrl) {
    throw Error("extraction_input_rejected");
  }

  const extractionRunId = await uuidFromName(`hermes-extraction-run:${job.job_id}:${message.attempt_token}`);
  if ((await input.database(`worker_runs?worker_run_id=eq.${extractionRunId}`)).length) return;
  const lineage = {
    orchestration_authority: "hermes",
    execution_class: "PRODUCTION",
    research_need_id: job.research_need_id,
    research_work_identity: job.dedupe_key,
    parent_research_work_identity: payload.parent_research_work_identity,
    attempt_token: message.attempt_token,
    attempt_count: job.attempt_count,
    lease_expires_at: job.lease_expires_at,
    capability: route.capability,
    route,
    tool: "workers/cloudflare/shared/src/adapters.ts:dispatchSourceAdapter",
    worker_module: "workers/cloudflare/shared/src/contract-extraction.ts",
    extraction_run_id: extractionRunId,
    parser_key: rosterRoute ? "miami-dade-elected-officials" : "official-profile-discovery",
    parser_version: rosterRoute ? MIAMI_DADE_PARSER_VERSION : "canonical-stored-v1",
    retrieval_id: raw.retrieval_id,
    retrieval_job_id: raw.job_id,
    retrieval_attempt_token: raw.metadata.attempt_token,
    retrieval_worker_run_id: raw.metadata.worker_run_id,
    sha256: raw.content_hash,
    byte_length: raw.byte_length,
  };
  await input.database("worker_runs", "POST", {
    worker_run_id: extractionRunId,
    job_id: job.job_id,
    worker_key: "hermes.cloudflare.extraction",
    runtime: "cloudflare",
    deployment_id: input.deploymentId,
    status: "started",
    metadata: lineage,
  });

  try {
    const bytes = await readVerifiedRaw({ bucket: input.bucket, raw, maxBytes: 1048576 });
    const parsed = await dispatchSourceAdapter({
      sourceKey: route.source_key,
      bytes,
      sourceUrl: raw.source_url,
      contentType: raw.content_type,
    });
    if (!(await input.database(query)).length) throw Error("extraction_lease_lost");

    if (governorRoute) {
      if (parsed.holders.length !== 1 || parsed.verificationState !== "extracted") throw Error("extraction_ambiguous");
      const holder = parsed.holders[0];
      const [seat] = await input.database(`seats?seat_id=eq.${job.target_id}`);
      if (!seat || seat.seat_key !== holder.seatKey || holder.vacant) throw Error("extraction_subject_mismatch");
      const html = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const pos = html.indexOf(holder.displayName);
      if (pos < 0) throw Error("extraction_exact_locator_missing");
      const start = Math.max(0, pos - 100);
      const end = Math.min(html.length, pos + holder.displayName.length + 100);
      const excerpt = html.slice(start, end);
      const offset = new TextEncoder().encode(html.slice(0, start)).length;
      const evidenceId = await uuidFromName(`hermes-evidence:${raw.retrieval_id}:${raw.content_hash}:${offset}`);
      const [prior] = await input.database(`evidence_objects?evidence_id=eq.${evidenceId}`);
      if (prior && (prior.content_hash !== raw.content_hash || prior.retrieval_id !== raw.retrieval_id || prior.excerpt !== excerpt)) {
        throw Error("extraction_evidence_collision");
      }
      if (!prior) {
        await input.database("evidence_objects", "POST", {
          evidence_id: evidenceId,
          source_id: raw.source_id,
          retrieval_id: raw.retrieval_id,
          evidence_type: "html_excerpt",
          source_url: raw.source_url,
          supporting_locator: `utf8-byte-offset:${offset};length:${new TextEncoder().encode(excerpt).length}`,
          excerpt,
          asset_uri: raw.raw_object_uri,
          content_hash: raw.content_hash,
          verification_state: "pending",
        });
      }
      if (!(await input.database(query)).length) throw Error("extraction_lease_lost");
      await input.database(`worker_runs?worker_run_id=eq.${extractionRunId}&status=eq.started`, "PATCH", {
        status: "succeeded",
        completed_at: new Date().toISOString(),
        records_read: 1,
        records_written: 1,
        metadata: {
          ...lineage,
          evidence_id: evidenceId,
          candidate_count: 1,
          evidence_objects_created: prior ? 0 : 1,
          candidate: {
            subject_type: "seat",
            subject_id: job.target_id,
            field_key: "current_occupant",
            display_value: holder.displayName,
            verification_state: "collected_unreviewed",
          },
          schema_certified: parsed.schemaCertified,
          handoff_state: "AWAITING_CANONICAL_VALIDATION",
          physical_r2_sha256: raw.content_hash,
        },
      });
      return;
    }

    if (parsed.holders.length < 2 || parsed.verificationState !== "extracted") throw Error("roster_extraction_insufficient");
    const rows: Row[] = [];
    for (let index = 0; index < parsed.holders.length; index += 1) {
      const holder = parsed.holders[index];
      const unitKey = unitKeyFor(holder, index + 1);
      const rosterUnitId = await uuidFromName(`roster-unit:${route.source_id}:${raw.content_hash}:${unitKey}`);
      const [prior] = await input.database(`unresolved_roster_units?roster_unit_id=eq.${rosterUnitId}`);
      if (prior) continue;
      rows.push({
        roster_unit_id: rosterUnitId,
        unit_key: unitKey,
        source_id: route.source_id,
        retrieval_id: raw.retrieval_id,
        extraction_worker_run_id: extractionRunId,
        jurisdiction_id: job.target_id,
        source_key: route.source_key,
        source_url: raw.source_url,
        content_hash: raw.content_hash,
        locator: `roster-row:${index + 1}`,
        office_title: holder.officeTitle,
        office_kind: holder.officeKind,
        district_number: holder.districtNumber,
        jurisdiction_name: holder.jurisdictionName,
        display_name: holder.displayName,
        term_label: holder.termLabel,
        term_length_text: holder.termLengthText,
        year_on_ballot_text: holder.yearOnBallotText,
        service_end_date_text: holder.serviceEndDateText,
        raw_row_text: holder.rawRowText,
        review_state: "UNRESOLVED",
        publication_eligible: false,
        payload: {
          seat_key: miamiDadeSeatKey(holder),
          government_level: holder.governmentLevel,
          branch: holder.branch,
          elected_or_appointed: holder.electedOrAppointed,
          schema_certified: parsed.schemaCertified,
        },
      });
    }
    for (const row of rows) {
      await input.database("unresolved_roster_units", "POST", row);
    }
    if (!(await input.database(query)).length) throw Error("extraction_lease_lost");
    await input.database(`worker_runs?worker_run_id=eq.${extractionRunId}&status=eq.started`, "PATCH", {
      status: "succeeded",
      completed_at: new Date().toISOString(),
      records_read: parsed.holders.length,
      records_written: rows.length,
      metadata: {
        ...lineage,
        roster_units_extracted: parsed.holders.length,
        roster_units_created: rows.length,
        unresolved_attribution: true,
        publication_eligible: false,
        handoff_state: "AWAITING_SEAT_AND_IDENTITY_RECONCILIATION",
        physical_r2_sha256: raw.content_hash,
      },
    });
  } catch (error) {
    const code = error instanceof CivicError
      ? error.errorClass
      : error instanceof Error && /^[a-z0-9_]+$/.test(error.message)
        ? error.message
        : "extraction_failed";
    await input.database(`worker_runs?worker_run_id=eq.${extractionRunId}&status=eq.started`, "PATCH", {
      status: "failed",
      completed_at: new Date().toISOString(),
      error_class: code,
      error_message: "Stored-byte extraction failed; no claim published",
      metadata: { ...lineage, retryable: error instanceof CivicError && error.retryable },
    });
    throw error;
  }
}
