import { StoreWriteError, sanitizeErrorMessage } from "./errors.ts";
import { normalizePersonName } from "./ids.ts";
import type { CivicStore, ScheduleJobInput } from "./store.ts";
import type {
  CandidateCampaignRecord,
  ClaimRecord,
  ClaimStatus,
  ElectionRecord,
  EvidenceRecord,
  JobRecord,
  JurisdictionRecord,
  MonitoringStateRecord,
  OccupancyRecord,
  PersonRecord,
  RawRetrievalRecord,
  ResearchContractFieldRecord,
  ResearchContractRecord,
  SeatRecord,
  SourceRecord,
  WorkerRunRecord,
} from "./types.ts";

export type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
  fetchImpl?: typeof fetch;
};

type Json = Record<string, unknown>;

function requiredSecret(name: string, value: string | undefined): string {
  if (!value) throw new StoreWriteError(`${name} is not configured`);
  return value;
}

export function createSupabaseStore(config: SupabaseConfig): CivicStore {
  const baseUrl = requiredSecret("SUPABASE_URL", config.url).replace(/\/$/, "");
  const key = requiredSecret("SUPABASE_SERVICE_ROLE_KEY", config.serviceRoleKey);
  const fetchImpl = config.fetchImpl ?? fetch;

  const request = async <T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> => {
    const headers = new Headers(init.headers);
    headers.set("apikey", key);
    headers.set("Authorization", `Bearer ${key}`);
    headers.set("Content-Type", "application/json");
    if (init.prefer) headers.set("Prefer", init.prefer);
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}/rest/v1/${path}`, { ...init, headers });
    } catch (error) {
      throw new StoreWriteError(`Supabase request failed: ${error instanceof Error ? error.message : "network error"}`);
    }
    const text = await response.text();
    const sanitized = sanitizeErrorMessage(text, [key]);
    if (!response.ok) {
      throw new StoreWriteError(`Supabase write/read failed HTTP ${response.status}: ${sanitized.slice(0, 300)}`);
    }
    if (!text) return [] as T;
    return JSON.parse(sanitized) as T;
  };

  const upsert = async <T>(table: string, row: Json, onConflict: string): Promise<T> => {
    const rows = await request<T[]>(`${table}?on_conflict=${onConflict}`, {
      method: "POST",
      body: JSON.stringify(row),
      prefer: "resolution=merge-duplicates,return=representation",
    });
    if (!Array.isArray(rows) || rows.length === 0) throw new StoreWriteError(`upsert ${table} returned no row`);
    return rows[0] as T;
  };

  return {
    async upsertJurisdiction(input) {
      const row = await upsert<Json>("jurisdictions", {
        jurisdiction_key: input.jurisdictionKey,
        name: input.name,
        kind: input.kind,
        state_code: input.stateCode,
        county_name: input.countyName,
        parent_id: input.parentId,
      }, "jurisdiction_key");
      return fromJurisdiction(row);
    },
    async upsertSeat(input) {
      const row = await upsert<Json>("seats", {
        seat_key: input.seatKey,
        jurisdiction_id: input.jurisdictionId,
        seat_name: input.seatName,
        office_type: input.officeType,
        government_level: input.governmentLevel,
        branch: input.branch,
        chamber: input.chamber,
        district_name: input.districtName,
        district_number: input.districtNumber,
        occupancy_status: input.occupancyStatus,
        record_status: input.recordStatus,
      }, "seat_key");
      return fromSeat(row);
    },
    async upsertPerson(input) {
      const row = await upsert<Json>("persons", {
        person_key: input.personKey,
        display_name: input.displayName,
        full_legal_name: input.fullLegalName,
        first_name: input.firstName,
        last_name: input.lastName,
        normalized_name: input.normalizedName ?? normalizePersonName(input.displayName),
        record_status: input.recordStatus,
      }, "person_key");
      return fromPerson(row);
    },
    async upsertOccupancy(input) {
      const row = await upsert<Json>("seat_occupancies", {
        seat_id: input.seatId,
        person_id: input.personId,
        term_label: input.termLabel,
        started_on: input.startedOn,
        ended_on: input.endedOn,
        elected_or_appointed: input.electedOrAppointed,
        current_status: input.currentStatus,
        record_status: input.recordStatus,
      }, "seat_id,person_id,started_on");
      return fromOccupancy(row);
    },
    async upsertElection(input) {
      const row = await upsert<Json>("elections", {
        election_key: input.electionKey,
        jurisdiction_id: input.jurisdictionId,
        seat_id: input.seatId,
        name: input.name,
        election_date: input.electionDate,
        election_kind: input.electionKind,
        record_status: input.recordStatus,
      }, "election_key");
      return fromElection(row);
    },
    async upsertCandidateCampaign(input) {
      const row = await upsert<Json>("candidate_campaigns", {
        campaign_key: input.campaignKey,
        election_id: input.electionId,
        seat_id: input.seatId,
        person_id: input.personId,
        party_name: input.partyName,
        outcome: input.outcome,
        record_status: input.recordStatus,
      }, "election_id,seat_id,person_id");
      return fromCampaign(row);
    },
    async recordSource(input) {
      const row = await upsert<Json>("sources", {
        source_key: input.sourceKey,
        name: input.name,
        source_url: input.sourceUrl,
        source_tier: input.sourceTier,
        source_type: input.sourceType,
        enabled: input.enabled,
      }, "source_key");
      return fromSource(row);
    },
    async recordRawRetrieval(input) {
      const row = await upsert<Json>("raw_retrievals", {
        source_id: input.sourceId,
        source_url: input.sourceUrl,
        retrieved_at: input.retrievedAt,
        http_status: input.httpStatus,
        content_type: input.contentType,
        etag: input.etag,
        last_modified: input.lastModified,
        content_sha256: input.contentSha256,
        byte_length: input.byteLength,
        r2_bucket: input.r2Bucket,
        r2_key: input.r2Key,
        parser_version: input.parserVersion,
        parse_status: input.parseStatus,
      }, "source_id,content_sha256");
      return fromRetrieval(row);
    },
    async recordEvidence(input) {
      const rows = await request<Json[]>("evidence_objects", {
        method: "POST",
        body: JSON.stringify({
          raw_retrieval_id: input.rawRetrievalId,
          source_id: input.sourceId,
          evidence_type: input.evidenceType,
          source_url: input.sourceUrl,
          content_sha256: input.contentSha256,
          captured_at: input.capturedAt,
          exact_excerpt: input.exactExcerpt,
          review_status: input.reviewStatus,
        }),
        prefer: "return=representation",
      });
      return fromEvidence(rows[0] ?? {});
    },
    async recordClaim(input) {
      const row = await upsert<Json>("claims", {
        claim_key: input.claimKey,
        claim_type: input.claimType,
        status: input.status,
        subject_type: input.subjectType,
        subject_id: input.subjectId,
        predicate: input.predicate,
        object_value: input.objectValue,
        jurisdiction_id: input.jurisdictionId,
        seat_id: input.seatId,
        person_id: input.personId,
        election_id: input.electionId,
        raw_retrieval_id: input.rawRetrievalId,
        publication_eligible: input.publicationEligible ?? false,
        metadata: input.metadata,
      }, "claim_key");
      return fromClaim(row);
    },
    async transitionClaim(claimId, to) {
      const rows = await request<Json[]>(`claims?id=eq.${claimId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: to }),
        prefer: "return=representation",
      });
      if (!rows[0]) throw new StoreWriteError(`claim ${claimId} not found`);
      return fromClaim(rows[0]);
    },
    async attachClaimEvidence(claimId, evidenceId, relation = "supports") {
      await request("claim_evidence", {
        method: "POST",
        body: JSON.stringify({ claim_id: claimId, evidence_id: evidenceId, relation }),
        prefer: "resolution=ignore-duplicates,return=minimal",
      });
    },
    async recordValidationRun(input) {
      await request("validation_runs", {
        method: "POST",
        body: JSON.stringify({
          claim_id: input.claimId,
          job_id: input.jobId,
          result: input.result,
          detail: input.detail ?? {},
          completed_at: new Date().toISOString(),
        }),
        prefer: "return=minimal",
      });
    },
    async recordContradiction(input) {
      await request("contradictions", {
        method: "POST",
        body: JSON.stringify({
          claim_id: input.claimId,
          conflicting_claim_id: input.conflictingClaimId,
          summary: input.summary,
        }),
        prefer: "return=minimal",
      });
    },
    async upsertMonitoringState(input) {
      const row = await upsert<Json>("monitoring_state", {
        entity_type: input.entityType,
        entity_key: input.entityKey,
        check_class: input.checkClass,
        active: input.active,
        last_checked_at: input.lastCheckedAt,
        last_changed_at: input.lastChangedAt,
        next_check_at: input.nextCheckAt,
        last_content_sha256: input.lastContentSha256,
      }, "entity_type,entity_key,check_class");
      return fromMonitoring(row);
    },
    async upsertResearchContract(input) {
      const row = await upsert<Json>("research_contracts", {
        contract_key: input.contractKey,
        seat_id: input.seatId,
        person_id: input.personId,
        title: input.title,
        status: input.status,
      }, "contract_key");
      return fromContract(row);
    },
    async upsertResearchContractField(input) {
      const row = await upsert<Json>("research_contract_fields", {
        contract_id: input.contractId,
        field_key: input.fieldKey,
        status: input.status,
        notes: input.notes,
      }, "contract_id,field_key");
      return fromContractField(row);
    },
    async scheduleJob(input: ScheduleJobInput) {
      const existing = await request<Json[]>(
        `jobs?dedupe_key=eq.${encodeURIComponent(input.dedupeKey)}&status=in.(pending,leased,running)&select=*`,
      );
      if (existing[0]) return { job: fromJob(existing[0]), created: false };
      const rows = await request<Json[]>("jobs", {
        method: "POST",
        body: JSON.stringify({
          dedupe_key: input.dedupeKey,
          route: input.route,
          status: "pending",
          source_key: input.sourceKey,
          entity_type: input.entityType,
          entity_id: input.entityId,
          payload: input.payload ?? {},
          scheduled_for: input.scheduledFor ?? new Date().toISOString(),
        }),
        prefer: "return=representation",
      });
      if (!rows[0]) throw new StoreWriteError("scheduleJob returned no row");
      return { job: fromJob(rows[0]), created: true };
    },
    async leaseJob(jobId, owner, leaseMs = 15 * 60 * 1000) {
      const now = new Date();
      const rows = await request<Json[]>(
        `jobs?id=eq.${jobId}&status=in.(pending,leased)&or=(lease_expires_at.is.null,lease_expires_at.lt.${now.toISOString()})`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "leased",
            lease_owner: owner,
            leased_at: now.toISOString(),
            lease_expires_at: new Date(now.getTime() + leaseMs).toISOString(),
            started_at: now.toISOString(),
            attempt_count: undefined,
          }),
          prefer: "return=representation",
        },
      );
      if (!rows[0]) return undefined;
      const current = fromJob(rows[0]);
      const incremented = await request<Json[]>(`jobs?id=eq.${jobId}`, {
        method: "PATCH",
        body: JSON.stringify({ attempt_count: current.attemptCount + 1 }),
        prefer: "return=representation",
      });
      return incremented[0] ? fromJob(incremented[0]) : current;
    },
    async completeJob(jobId, status = "completed") {
      const rows = await request<Json[]>(`jobs?id=eq.${jobId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, completed_at: new Date().toISOString(), lease_owner: null }),
        prefer: "return=representation",
      });
      if (!rows[0]) throw new StoreWriteError(`job ${jobId} not found`);
      return fromJob(rows[0]);
    },
    async failJob(jobId, errorClass, errorMessage, deadLettered = false) {
      const rows = await request<Json[]>(`jobs?id=eq.${jobId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: deadLettered ? "dead_lettered" : "failed",
          last_error_class: errorClass,
          last_error_message: sanitizeErrorMessage(errorMessage, [key]),
          completed_at: new Date().toISOString(),
        }),
        prefer: "return=representation",
      });
      if (!rows[0]) throw new StoreWriteError(`job ${jobId} not found`);
      return fromJob(rows[0]);
    },
    async recordWorkerRun(input) {
      const rows = await request<Json[]>("worker_runs", {
        method: "POST",
        body: JSON.stringify({
          worker_key: input.workerKey,
          runtime: input.runtime,
          deployment_id: input.deploymentId,
          job_id: input.jobId,
          status: input.status,
          started_at: input.startedAt,
          completed_at: input.completedAt,
          records_read: input.recordsRead,
          records_written: input.recordsWritten,
          claims_verified: input.claimsVerified,
          error_class: input.errorClass,
          error_message: input.errorMessage ? sanitizeErrorMessage(input.errorMessage, [key]) : undefined,
          metadata: input.metadata,
        }),
        prefer: "return=representation",
      });
      return fromWorkerRun(rows[0] ?? { id: input.id });
    },
    async getDueJobs(now, limit = 50) {
      const rows = await request<Json[]>(
        `jobs?status=eq.pending&scheduled_for=lte.${now.toISOString()}&order=scheduled_for.asc&limit=${limit}`,
      );
      return rows.map(fromJob);
    },
    async getJobByDedupe(dedupeKey) {
      const rows = await request<Json[]>(`jobs?dedupe_key=eq.${encodeURIComponent(dedupeKey)}&order=created_at.desc&limit=1`);
      return rows[0] ? fromJob(rows[0]) : undefined;
    },
    async getJob(jobId) {
      const rows = await request<Json[]>(`jobs?id=eq.${jobId}&limit=1`);
      return rows[0] ? fromJob(rows[0]) : undefined;
    },
    async listJurisdictions() {
      return (await request<Json[]>("jurisdictions?select=*")).map(fromJurisdiction);
    },
    async listSeats() {
      return (await request<Json[]>("seats?select=*")).map(fromSeat);
    },
    async listPersons() {
      return (await request<Json[]>("persons?select=*")).map(fromPerson);
    },
    async listOccupancies() {
      return (await request<Json[]>("seat_occupancies?select=*")).map(fromOccupancy);
    },
    async listElections() {
      return (await request<Json[]>("elections?select=*")).map(fromElection);
    },
    async listCampaigns() {
      return (await request<Json[]>("candidate_campaigns?select=*")).map(fromCampaign);
    },
    async listClaims() {
      return (await request<Json[]>("claims?select=*")).map(fromClaim);
    },
    async listEvidence() {
      return (await request<Json[]>("evidence_objects?select=*")).map(fromEvidence);
    },
    async listRetrievals() {
      return (await request<Json[]>("raw_retrievals?select=*")).map(fromRetrieval);
    },
    async listContradictions() {
      const rows = await request<Json[]>("contradictions?select=claim_id,summary");
      return rows.map((row) => ({ claimId: String(row.claim_id), summary: String(row.summary) }));
    },
    async listSources() {
      return (await request<Json[]>("sources?select=*")).map(fromSource);
    },
    async listJobs() {
      return (await request<Json[]>("jobs?select=*")).map(fromJob);
    },
    async listWorkerRuns() {
      return (await request<Json[]>("worker_runs?select=*")).map(fromWorkerRun);
    },
    async listMonitoringState() {
      return (await request<Json[]>("monitoring_state?select=*")).map(fromMonitoring);
    },
    async listResearchContracts() {
      return (await request<Json[]>("research_contracts?select=*")).map(fromContract);
    },
    async listResearchContractFields() {
      return (await request<Json[]>("research_contract_fields?select=*")).map(fromContractField);
    },
    async getClaim(claimId) {
      const rows = await request<Json[]>(`claims?id=eq.${claimId}&limit=1`);
      return rows[0] ? fromClaim(rows[0]) : undefined;
    },
    async getRetrieval(retrievalId) {
      const rows = await request<Json[]>(`raw_retrievals?id=eq.${retrievalId}&limit=1`);
      return rows[0] ? fromRetrieval(rows[0]) : undefined;
    },
  };
}

function str(value: unknown): string {
  return value == null ? "" : String(value);
}

function opt(value: unknown): string | undefined {
  return value == null ? undefined : String(value);
}

function fromJurisdiction(row: Json): JurisdictionRecord {
  return {
    id: str(row.id),
    jurisdictionKey: str(row.jurisdiction_key),
    name: str(row.name),
    kind: str(row.kind),
    stateCode: opt(row.state_code),
    countyName: opt(row.county_name),
    parentId: opt(row.parent_id),
  };
}

function fromSeat(row: Json): SeatRecord {
  return {
    id: str(row.id),
    seatKey: str(row.seat_key),
    jurisdictionId: str(row.jurisdiction_id),
    seatName: str(row.seat_name),
    officeType: str(row.office_type),
    governmentLevel: str(row.government_level),
    branch: opt(row.branch),
    chamber: opt(row.chamber),
    districtName: opt(row.district_name),
    districtNumber: opt(row.district_number),
    occupancyStatus: str(row.occupancy_status || "unknown"),
    recordStatus: str(row.record_status || "extracted"),
  };
}

function fromPerson(row: Json): PersonRecord {
  return {
    id: str(row.id),
    personKey: str(row.person_key),
    displayName: str(row.display_name),
    fullLegalName: opt(row.full_legal_name),
    firstName: opt(row.first_name),
    lastName: opt(row.last_name),
    normalizedName: str(row.normalized_name),
    recordStatus: str(row.record_status || "extracted"),
  };
}

function fromOccupancy(row: Json): OccupancyRecord {
  return {
    id: str(row.id),
    seatId: str(row.seat_id),
    personId: str(row.person_id),
    termLabel: opt(row.term_label),
    startedOn: opt(row.started_on),
    endedOn: opt(row.ended_on),
    electedOrAppointed: opt(row.elected_or_appointed),
    currentStatus: str(row.current_status || "unknown"),
    recordStatus: str(row.record_status || "extracted"),
  };
}

function fromElection(row: Json): ElectionRecord {
  return {
    id: str(row.id),
    electionKey: str(row.election_key),
    jurisdictionId: str(row.jurisdiction_id),
    seatId: opt(row.seat_id),
    name: str(row.name),
    electionDate: opt(row.election_date),
    electionKind: opt(row.election_kind),
    recordStatus: str(row.record_status || "extracted"),
  };
}

function fromCampaign(row: Json): CandidateCampaignRecord {
  return {
    id: str(row.id),
    campaignKey: str(row.campaign_key),
    electionId: str(row.election_id),
    seatId: str(row.seat_id),
    personId: str(row.person_id),
    partyName: opt(row.party_name),
    outcome: opt(row.outcome),
    recordStatus: str(row.record_status || "extracted"),
  };
}

function fromSource(row: Json): SourceRecord {
  return {
    id: str(row.id),
    sourceKey: str(row.source_key),
    name: str(row.name),
    sourceUrl: str(row.source_url),
    sourceTier: opt(row.source_tier),
    sourceType: opt(row.source_type),
    enabled: Boolean(row.enabled),
  };
}

function fromRetrieval(row: Json): RawRetrievalRecord {
  return {
    id: str(row.id),
    sourceId: str(row.source_id),
    sourceUrl: str(row.source_url),
    retrievedAt: str(row.retrieved_at),
    httpStatus: typeof row.http_status === "number" ? row.http_status : undefined,
    contentType: opt(row.content_type),
    etag: opt(row.etag),
    lastModified: opt(row.last_modified),
    contentSha256: str(row.content_sha256),
    byteLength: typeof row.byte_length === "number" ? row.byte_length : undefined,
    r2Bucket: opt(row.r2_bucket),
    r2Key: opt(row.r2_key),
    parserVersion: opt(row.parser_version),
    parseStatus: str(row.parse_status || "unparsed"),
  };
}

function fromEvidence(row: Json): EvidenceRecord {
  return {
    id: str(row.id),
    rawRetrievalId: opt(row.raw_retrieval_id),
    sourceId: opt(row.source_id),
    evidenceType: str(row.evidence_type),
    sourceUrl: str(row.source_url),
    contentSha256: str(row.content_sha256),
    capturedAt: str(row.captured_at),
    exactExcerpt: opt(row.exact_excerpt),
    reviewStatus: str(row.review_status || "unreviewed"),
  };
}

function fromClaim(row: Json): ClaimRecord {
  return {
    id: str(row.id),
    claimKey: str(row.claim_key),
    claimType: str(row.claim_type),
    status: str(row.status) as ClaimStatus,
    subjectType: opt(row.subject_type),
    subjectId: opt(row.subject_id),
    predicate: opt(row.predicate),
    objectValue: opt(row.object_value),
    jurisdictionId: opt(row.jurisdiction_id),
    seatId: opt(row.seat_id),
    personId: opt(row.person_id),
    electionId: opt(row.election_id),
    rawRetrievalId: opt(row.raw_retrieval_id),
    publicationEligible: Boolean(row.publication_eligible),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function fromJob(row: Json): JobRecord {
  return {
    id: str(row.id),
    dedupeKey: str(row.dedupe_key),
    route: row.route as JobRecord["route"],
    status: row.status as JobRecord["status"],
    sourceKey: opt(row.source_key),
    entityType: opt(row.entity_type),
    entityId: opt(row.entity_id),
    payload: (row.payload as Record<string, unknown>) ?? {},
    attemptCount: Number(row.attempt_count ?? 0),
    leaseOwner: opt(row.lease_owner),
    leasedAt: opt(row.leased_at),
    leaseExpiresAt: opt(row.lease_expires_at),
    lastErrorClass: opt(row.last_error_class),
    lastErrorMessage: opt(row.last_error_message),
    scheduledFor: str(row.scheduled_for),
    startedAt: opt(row.started_at),
    completedAt: opt(row.completed_at),
  };
}

function fromMonitoring(row: Json): MonitoringStateRecord {
  return {
    id: str(row.id),
    entityType: str(row.entity_type),
    entityKey: str(row.entity_key),
    checkClass: str(row.check_class),
    active: Boolean(row.active),
    lastCheckedAt: opt(row.last_checked_at),
    lastChangedAt: opt(row.last_changed_at),
    nextCheckAt: opt(row.next_check_at),
    lastContentSha256: opt(row.last_content_sha256),
  };
}

function fromContract(row: Json): ResearchContractRecord {
  return {
    id: str(row.id),
    contractKey: str(row.contract_key),
    seatId: opt(row.seat_id),
    personId: opt(row.person_id),
    title: str(row.title),
    status: str(row.status),
  };
}

function fromContractField(row: Json): ResearchContractFieldRecord {
  return {
    id: str(row.id),
    contractId: str(row.contract_id),
    fieldKey: str(row.field_key),
    status: str(row.status),
    notes: opt(row.notes),
  };
}

function fromWorkerRun(row: Json): WorkerRunRecord {
  return {
    id: str(row.id),
    workerKey: str(row.worker_key),
    runtime: str(row.runtime || "cloudflare"),
    deploymentId: opt(row.deployment_id),
    jobId: opt(row.job_id),
    status: (row.status as WorkerRunRecord["status"]) ?? "started",
    startedAt: str(row.started_at),
    completedAt: opt(row.completed_at),
    recordsRead: Number(row.records_read ?? 0),
    recordsWritten: Number(row.records_written ?? 0),
    claimsVerified: Number(row.claims_verified ?? 0),
    errorClass: opt(row.error_class),
    errorMessage: opt(row.error_message),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}
