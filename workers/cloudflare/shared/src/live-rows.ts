import { EVIDENCE_BUCKET_NAME, type ClaimStatus, type JobStatus, type JobType } from "./types.ts";

export type Json = Record<string, unknown>;

export const GLOBAL_FORBIDDEN_WRITE_COLUMNS = [
  "id",
  "record_status",
  "claim_key",
  "route",
  "person_key",
  "content_sha256",
  "r2_key",
] as const;

export const LIVE_TABLE_COLUMNS: Record<string, readonly string[]> = {
  jurisdictions: [
    "jurisdiction_id",
    "jurisdiction_key",
    "name",
    "jurisdiction_type",
    "parent_jurisdiction_id",
    "state_code",
    "county_name",
    "municipality_name",
    "fips_code",
    "status",
    "created_at",
    "updated_at",
  ],
  seats: [
    "seat_id",
    "seat_key",
    "seat_name",
    "office_type",
    "government_level",
    "branch",
    "chamber",
    "jurisdiction_id",
    "district_name",
    "district_number",
    "seat_at_large",
    "selection_method",
    "partisan_office",
    "term_length_months",
    "term_limit_summary",
    "vacancy_filling_method",
    "authority_summary",
    "responsibilities",
    "eligibility_requirements",
    "occupancy_status",
    "next_election_date",
    "research_contract_key",
    "baseline_status",
    "monitoring_active",
    "created_at",
    "updated_at",
  ],
  persons: [
    "person_id",
    "canonical_name",
    "first_name",
    "middle_name",
    "last_name",
    "suffix",
    "preferred_name",
    "aliases",
    "date_of_birth",
    "birthplace",
    "portrait_url",
    "portrait_source_url",
    "portrait_credit",
    "portrait_status",
    "identity_status",
    "external_identifiers",
    "created_at",
    "updated_at",
  ],
  seat_occupancies: [
    "occupancy_id",
    "seat_id",
    "person_id",
    "start_date",
    "end_date",
    "assumed_office_date",
    "sworn_in_date",
    "occupancy_status",
    "elected_or_appointed",
    "election_id",
    "evidence_state",
    "created_at",
    "updated_at",
  ],
  elections: [
    "election_id",
    "seat_id",
    "election_key",
    "election_type",
    "election_date",
    "filing_open_date",
    "filing_deadline",
    "qualifying_open_date",
    "qualifying_deadline",
    "status",
    "source_url",
    "certification_date",
    "created_at",
    "updated_at",
  ],
  candidate_campaigns: [
    "candidate_campaign_id",
    "person_id",
    "seat_id",
    "election_id",
    "party",
    "candidate_status",
    "filing_date",
    "qualified_date",
    "withdrawal_date",
    "campaign_website",
    "committee_name",
    "committee_identifier",
    "portrait_status",
    "baseline_status",
    "created_at",
    "updated_at",
  ],
  sources: [
    "source_id",
    "source_key",
    "name",
    "source_url",
    "source_type",
    "authority_tier",
    "jurisdiction_id",
    "host",
    "active",
    "refresh_class",
    "normal_poll_interval",
    "election_poll_interval",
    "rate_limit_policy",
    "parser_key",
    "parser_version",
    "last_success_at",
    "last_failure_at",
    "next_poll_at",
    "health_state",
    "created_at",
    "updated_at",
  ],
  raw_retrievals: [
    "retrieval_id",
    "source_id",
    "job_id",
    "retrieved_at",
    "source_url",
    "http_status",
    "content_type",
    "etag",
    "last_modified",
    "content_hash",
    "raw_object_uri",
    "byte_length",
    "parser_key",
    "parser_version",
    "retrieval_status",
    "metadata",
  ],
  evidence_objects: [
    "evidence_id",
    "source_id",
    "retrieval_id",
    "evidence_type",
    "source_url",
    "supporting_locator",
    "excerpt",
    "asset_uri",
    "content_hash",
    "verification_state",
    "rights_metadata",
    "created_at",
    "updated_at",
  ],
  claims: [
    "claim_id",
    "subject_type",
    "subject_id",
    "seat_id",
    "field_key",
    "normalized_value",
    "display_value",
    "value_hash",
    "valid_from",
    "valid_to",
    "first_seen_at",
    "last_seen_at",
    "last_verified_at",
    "verification_state",
    "confidence",
    "volatility_class",
    "recheck_after",
    "supersedes_claim_id",
    "created_at",
    "updated_at",
  ],
  claim_evidence: ["claim_id", "evidence_id", "role"],
  validation_runs: [
    "validation_run_id",
    "subject_type",
    "subject_id",
    "seat_id",
    "validator_key",
    "status",
    "input_summary",
    "result_summary",
    "started_at",
    "completed_at",
    "created_at",
  ],
  contradictions: [
    "contradiction_id",
    "subject_type",
    "subject_id",
    "seat_id",
    "field_key",
    "claim_ids",
    "status",
    "severity",
    "resolution_summary",
    "resolved_at",
    "created_at",
    "updated_at",
  ],
  research_contracts: [
    "research_contract_id",
    "contract_key",
    "name",
    "office_class",
    "version",
    "active",
    "description",
    "created_at",
    "updated_at",
  ],
  research_contract_fields: [
    "research_contract_field_id",
    "research_contract_id",
    "field_key",
    "category",
    "required_for_baseline",
    "verification_requirement",
    "source_priority",
    "volatility_class",
    "recheck_policy",
    "sensitivity_rule",
    "sort_order",
    "created_at",
    "updated_at",
  ],
  monitoring_state: [
    "monitoring_state_id",
    "target_type",
    "target_id",
    "seat_id",
    "active",
    "monitoring_class",
    "last_checked_at",
    "last_changed_at",
    "next_check_at",
    "consecutive_failures",
    "last_result",
    "configuration",
    "created_at",
    "updated_at",
  ],
  jobs: [
    "job_id",
    "job_type",
    "target_type",
    "target_id",
    "seat_id",
    "source_id",
    "priority",
    "status",
    "attempt_count",
    "max_attempts",
    "leased_by",
    "lease_expires_at",
    "checkpoint",
    "dedupe_key",
    "payload",
    "scheduled_for",
    "started_at",
    "completed_at",
    "error_class",
    "error_message",
    "created_at",
    "updated_at",
  ],
  worker_runs: [
    "worker_run_id",
    "worker_key",
    "runtime",
    "deployment_id",
    "job_id",
    "status",
    "started_at",
    "completed_at",
    "records_read",
    "records_written",
    "claims_verified",
    "error_class",
    "error_message",
    "metadata",
    "created_at",
  ],
};

export function compactRow(row: Json): Json {
  const out: Json = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export function assertLiveWrite(table: string, payload: unknown): Json {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`live write to ${table} must be an object`);
  }
  const row = payload as Json;
  const allowed = LIVE_TABLE_COLUMNS[table];
  if (!allowed) throw new Error(`unknown live table ${table}`);
  const forbiddenHits = GLOBAL_FORBIDDEN_WRITE_COLUMNS.filter((column) => column in row);
  if (forbiddenHits.length > 0) {
    throw new Error(`${table} payload writes columns that are not live: ${forbiddenHits.join(", ")}`);
  }
  const unknown = Object.keys(row).filter((column) => !allowed.includes(column));
  if (unknown.length > 0) {
    throw new Error(`${table} payload writes unknown/non-live columns: ${unknown.join(", ")}`);
  }
  return row;
}

export function liveWriteBody(table: string, payload: Json): string {
  return JSON.stringify(assertLiveWrite(table, compactRow(payload)));
}

function str(value: unknown, fallback = ""): string {
  return value == null ? fallback : String(value);
}

function opt(value: unknown): string | undefined {
  return value == null ? undefined : String(value);
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function optNum(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value.map((item) => String(item));
  return undefined;
}

function textOrJoined(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) return value.map((item) => String(item)).join("\n");
  return String(value);
}

export function jurisdictionRow(input: {
  jurisdictionId?: string;
  jurisdictionKey: string;
  name: string;
  jurisdictionType: string;
  parentJurisdictionId?: string;
  stateCode?: string;
  countyName?: string;
  municipalityName?: string;
  fipsCode?: string;
  status?: string;
}): Json {
  return compactRow({
    jurisdiction_id: input.jurisdictionId,
    jurisdiction_key: input.jurisdictionKey,
    name: input.name,
    jurisdiction_type: input.jurisdictionType,
    parent_jurisdiction_id: input.parentJurisdictionId,
    state_code: input.stateCode,
    county_name: input.countyName,
    municipality_name: input.municipalityName,
    fips_code: input.fipsCode,
    status: input.status ?? "active",
  });
}

export function seatRow(input: {
  seatId?: string;
  seatKey: string;
  seatName: string;
  officeType?: string;
  governmentLevel?: string;
  branch?: string;
  chamber?: string;
  jurisdictionId: string;
  districtName?: string;
  districtNumber?: string;
  seatAtLarge?: boolean;
  selectionMethod?: string;
  partisanOffice?: boolean;
  termLengthMonths?: number;
  termLimitSummary?: string;
  vacancyFillingMethod?: string;
  authoritySummary?: string;
  responsibilities?: string[] | string;
  eligibilityRequirements?: string[] | string;
  occupancyStatus?: string;
  nextElectionDate?: string;
  researchContractKey?: string;
  baselineStatus?: string;
  monitoringActive?: boolean;
}): Json {
  return compactRow({
    seat_id: input.seatId,
    seat_key: input.seatKey,
    seat_name: input.seatName,
    office_type: input.officeType,
    government_level: input.governmentLevel,
    branch: input.branch,
    chamber: input.chamber,
    jurisdiction_id: input.jurisdictionId,
    district_name: input.districtName,
    district_number: input.districtNumber,
    seat_at_large: input.seatAtLarge,
    selection_method: input.selectionMethod,
    partisan_office: input.partisanOffice,
    term_length_months: input.termLengthMonths,
    term_limit_summary: input.termLimitSummary,
    vacancy_filling_method: input.vacancyFillingMethod,
    authority_summary: input.authoritySummary,
    responsibilities: textOrJoined(input.responsibilities),
    eligibility_requirements: textOrJoined(input.eligibilityRequirements),
    occupancy_status: input.occupancyStatus,
    next_election_date: input.nextElectionDate,
    research_contract_key: input.researchContractKey,
    baseline_status: input.baselineStatus,
    monitoring_active: input.monitoringActive,
  });
}

export function personRow(input: {
  personId?: string;
  canonicalName: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  preferredName?: string;
  aliases?: string[];
  dateOfBirth?: string;
  birthplace?: string;
  portraitUrl?: string;
  portraitSourceUrl?: string;
  portraitCredit?: string;
  portraitStatus?: string;
  identityStatus?: string;
  externalIdentifiers?: Record<string, unknown>;
}): Json {
  return compactRow({
    person_id: input.personId,
    canonical_name: input.canonicalName,
    first_name: input.firstName,
    middle_name: input.middleName,
    last_name: input.lastName,
    suffix: input.suffix,
    preferred_name: input.preferredName,
    aliases: input.aliases,
    date_of_birth: input.dateOfBirth,
    birthplace: input.birthplace,
    portrait_url: input.portraitUrl,
    portrait_source_url: input.portraitSourceUrl,
    portrait_credit: input.portraitCredit,
    portrait_status: input.portraitStatus,
    identity_status: input.identityStatus,
    external_identifiers: input.externalIdentifiers,
  });
}

export function occupancyRow(input: {
  occupancyId?: string;
  seatId: string;
  personId: string;
  startDate?: string;
  endDate?: string;
  assumedOfficeDate?: string;
  swornInDate?: string;
  occupancyStatus?: string;
  electedOrAppointed?: string;
  electionId?: string;
  evidenceState?: string;
}): Json {
  return compactRow({
    occupancy_id: input.occupancyId,
    seat_id: input.seatId,
    person_id: input.personId,
    start_date: input.startDate,
    end_date: input.endDate,
    assumed_office_date: input.assumedOfficeDate,
    sworn_in_date: input.swornInDate,
    occupancy_status: input.occupancyStatus,
    elected_or_appointed: input.electedOrAppointed,
    election_id: input.electionId,
    evidence_state: input.evidenceState,
  });
}

export function electionRow(input: {
  electionId?: string;
  seatId: string;
  electionKey: string;
  electionType?: string;
  electionDate?: string;
  filingOpenDate?: string;
  filingDeadline?: string;
  qualifyingOpenDate?: string;
  qualifyingDeadline?: string;
  status?: string;
  sourceUrl?: string;
  certificationDate?: string;
}): Json {
  return compactRow({
    election_id: input.electionId,
    seat_id: input.seatId,
    election_key: input.electionKey,
    election_type: input.electionType,
    election_date: input.electionDate,
    filing_open_date: input.filingOpenDate,
    filing_deadline: input.filingDeadline,
    qualifying_open_date: input.qualifyingOpenDate,
    qualifying_deadline: input.qualifyingDeadline,
    status: input.status,
    source_url: input.sourceUrl,
    certification_date: input.certificationDate,
  });
}

export function campaignRow(input: {
  candidateCampaignId?: string;
  personId: string;
  seatId: string;
  electionId: string;
  party?: string;
  candidateStatus?: string;
  filingDate?: string;
  qualifiedDate?: string;
  withdrawalDate?: string;
  campaignWebsite?: string;
  committeeName?: string;
  committeeIdentifier?: string;
  portraitStatus?: string;
  baselineStatus?: string;
}): Json {
  return compactRow({
    candidate_campaign_id: input.candidateCampaignId,
    person_id: input.personId,
    seat_id: input.seatId,
    election_id: input.electionId,
    party: input.party,
    candidate_status: input.candidateStatus,
    filing_date: input.filingDate,
    qualified_date: input.qualifiedDate,
    withdrawal_date: input.withdrawalDate,
    campaign_website: input.campaignWebsite,
    committee_name: input.committeeName,
    committee_identifier: input.committeeIdentifier,
    portrait_status: input.portraitStatus,
    baseline_status: input.baselineStatus,
  });
}

export function sourceRow(input: {
  sourceId?: string;
  sourceKey: string;
  name: string;
  sourceUrl: string;
  sourceType?: string;
  authorityTier?: string;
  jurisdictionId?: string;
  host?: string;
  active?: boolean;
  refreshClass?: string;
  normalPollInterval?: number | string;
  electionPollInterval?: number | string;
  rateLimitPolicy?: Record<string, unknown> | string;
  parserKey?: string;
  parserVersion?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  nextPollAt?: string;
  healthState?: string;
}): Json {
  return compactRow({
    source_id: input.sourceId,
    source_key: input.sourceKey,
    name: input.name,
    source_url: input.sourceUrl,
    source_type: input.sourceType,
    authority_tier: input.authorityTier,
    jurisdiction_id: input.jurisdictionId,
    host: input.host,
    active: input.active,
    refresh_class: input.refreshClass,
    normal_poll_interval: input.normalPollInterval == null ? undefined : String(input.normalPollInterval),
    election_poll_interval: input.electionPollInterval == null ? undefined : String(input.electionPollInterval),
    rate_limit_policy:
      typeof input.rateLimitPolicy === "string" ? { policy: input.rateLimitPolicy } : input.rateLimitPolicy,
    parser_key: input.parserKey,
    parser_version: input.parserVersion,
    last_success_at: input.lastSuccessAt,
    last_failure_at: input.lastFailureAt,
    next_poll_at: input.nextPollAt,
    health_state: input.healthState,
  });
}

export function retrievalRow(input: {
  retrievalId?: string;
  sourceId: string;
  jobId?: string;
  retrievedAt: string;
  sourceUrl: string;
  httpStatus?: number;
  contentType?: string;
  etag?: string;
  lastModified?: string;
  contentHash: string;
  rawObjectUri?: string;
  byteLength?: number;
  parserKey?: string;
  parserVersion?: string;
  retrievalStatus?: string;
  metadata?: Record<string, unknown>;
}): Json {
  return compactRow({
    retrieval_id: input.retrievalId,
    source_id: input.sourceId,
    job_id: input.jobId,
    retrieved_at: input.retrievedAt,
    source_url: input.sourceUrl,
    http_status: input.httpStatus,
    content_type: input.contentType,
    etag: input.etag,
    last_modified: input.lastModified,
    content_hash: input.contentHash,
    raw_object_uri: input.rawObjectUri,
    byte_length: input.byteLength,
    parser_key: input.parserKey,
    parser_version: input.parserVersion,
    retrieval_status: input.retrievalStatus,
    metadata: input.metadata,
  });
}

export function evidenceRow(input: {
  evidenceId?: string;
  sourceId?: string;
  retrievalId?: string;
  evidenceType?: string;
  sourceUrl?: string;
  supportingLocator?: string;
  excerpt?: string;
  assetUri?: string;
  contentHash: string;
  verificationState?: string;
  rightsMetadata?: Record<string, unknown>;
}): Json {
  return compactRow({
    evidence_id: input.evidenceId,
    source_id: input.sourceId,
    retrieval_id: input.retrievalId,
    evidence_type: input.evidenceType,
    source_url: input.sourceUrl,
    supporting_locator: input.supportingLocator,
    excerpt: input.excerpt,
    asset_uri: input.assetUri,
    content_hash: input.contentHash,
    verification_state: input.verificationState,
    rights_metadata: input.rightsMetadata,
  });
}

export function claimRow(input: {
  claimId?: string;
  subjectType: string;
  subjectId: string;
  seatId?: string;
  fieldKey: string;
  normalizedValue?: string;
  displayValue?: string;
  valueHash?: string;
  validFrom?: string;
  validTo?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  lastVerifiedAt?: string;
  verificationState: ClaimStatus;
  confidence?: number;
  volatilityClass?: string;
  recheckAfter?: string;
  supersedesClaimId?: string;
}): Json {
  return compactRow({
    claim_id: input.claimId,
    subject_type: input.subjectType,
    subject_id: input.subjectId,
    seat_id: input.seatId,
    field_key: input.fieldKey,
    normalized_value: input.normalizedValue,
    display_value: input.displayValue,
    value_hash: input.valueHash,
    valid_from: input.validFrom,
    valid_to: input.validTo,
    first_seen_at: input.firstSeenAt,
    last_seen_at: input.lastSeenAt,
    last_verified_at: input.lastVerifiedAt,
    verification_state: input.verificationState,
    confidence: input.confidence,
    volatility_class: input.volatilityClass,
    recheck_after: input.recheckAfter,
    supersedes_claim_id: input.supersedesClaimId,
  });
}

export function claimEvidenceRow(input: { claimId: string; evidenceId: string; role?: string }): Json {
  return compactRow({
    claim_id: input.claimId,
    evidence_id: input.evidenceId,
    role: input.role ?? "supports",
  });
}

export function validationRunRow(input: {
  validationRunId?: string;
  subjectType?: string;
  subjectId?: string;
  seatId?: string;
  validatorKey: string;
  status: string;
  inputSummary?: Record<string, unknown>;
  resultSummary?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
}): Json {
  return compactRow({
    validation_run_id: input.validationRunId,
    subject_type: input.subjectType,
    subject_id: input.subjectId,
    seat_id: input.seatId,
    validator_key: input.validatorKey,
    status: input.status,
    input_summary: input.inputSummary,
    result_summary: input.resultSummary,
    started_at: input.startedAt,
    completed_at: input.completedAt,
  });
}

export function contradictionRow(input: {
  contradictionId?: string;
  subjectType?: string;
  subjectId?: string;
  seatId?: string;
  fieldKey?: string;
  claimIds: string[];
  status?: string;
  severity?: string;
  resolutionSummary?: string;
  resolvedAt?: string;
}): Json {
  return compactRow({
    contradiction_id: input.contradictionId,
    subject_type: input.subjectType,
    subject_id: input.subjectId,
    seat_id: input.seatId,
    field_key: input.fieldKey,
    claim_ids: input.claimIds,
    status: input.status ?? "open",
    severity: input.severity,
    resolution_summary: input.resolutionSummary,
    resolved_at: input.resolvedAt,
  });
}

export function researchContractRow(input: {
  researchContractId?: string;
  contractKey: string;
  name: string;
  officeClass?: string;
  version?: string | number;
  active?: boolean;
  description?: string;
}): Json {
  return compactRow({
    research_contract_id: input.researchContractId,
    contract_key: input.contractKey,
    name: input.name,
    office_class: input.officeClass,
    version: input.version == null ? undefined : String(input.version),
    active: input.active,
    description: input.description,
  });
}

export function researchContractFieldRow(input: {
  researchContractFieldId?: string;
  researchContractId: string;
  fieldKey: string;
  category?: string;
  requiredForBaseline?: boolean;
  verificationRequirement?: string;
  sourcePriority?: string | Record<string, unknown>;
  volatilityClass?: string;
  recheckPolicy?: string;
  sensitivityRule?: string;
  sortOrder?: number;
}): Json {
  return compactRow({
    research_contract_field_id: input.researchContractFieldId,
    research_contract_id: input.researchContractId,
    field_key: input.fieldKey,
    category: input.category,
    required_for_baseline: input.requiredForBaseline,
    verification_requirement: input.verificationRequirement,
    source_priority:
      typeof input.sourcePriority === "string" ? { policy: input.sourcePriority } : input.sourcePriority,
    volatility_class: input.volatilityClass,
    recheck_policy: input.recheckPolicy,
    sensitivity_rule: input.sensitivityRule,
    sort_order: input.sortOrder,
  });
}

export function monitoringRow(input: {
  monitoringStateId?: string;
  targetType: string;
  targetId: string;
  seatId?: string;
  active?: boolean;
  monitoringClass?: string;
  lastCheckedAt?: string;
  lastChangedAt?: string;
  nextCheckAt?: string;
  consecutiveFailures?: number;
  lastResult?: string;
  configuration?: Record<string, unknown>;
}): Json {
  return compactRow({
    monitoring_state_id: input.monitoringStateId,
    target_type: input.targetType,
    target_id: input.targetId,
    seat_id: input.seatId,
    active: input.active,
    monitoring_class: input.monitoringClass,
    last_checked_at: input.lastCheckedAt,
    last_changed_at: input.lastChangedAt,
    next_check_at: input.nextCheckAt,
    consecutive_failures: input.consecutiveFailures,
    last_result: input.lastResult,
    configuration: input.configuration,
  });
}

export function jobRow(input: {
  jobId?: string;
  jobType: JobType | string;
  targetType?: string;
  targetId?: string;
  seatId?: string;
  sourceId?: string;
  priority?: number;
  status?: JobStatus | string;
  attemptCount?: number;
  maxAttempts?: number;
  leasedBy?: string;
  leaseExpiresAt?: string;
  checkpoint?: Record<string, unknown>;
  dedupeKey?: string;
  payload?: Record<string, unknown>;
  scheduledFor?: string;
  startedAt?: string;
  completedAt?: string;
  errorClass?: string;
  errorMessage?: string;
}): Json {
  return compactRow({
    job_id: input.jobId,
    job_type: input.jobType,
    target_type: input.targetType,
    target_id: input.targetId,
    seat_id: input.seatId,
    source_id: input.sourceId,
    priority: input.priority,
    status: input.status,
    attempt_count: input.attemptCount,
    max_attempts: input.maxAttempts,
    leased_by: input.leasedBy,
    lease_expires_at: input.leaseExpiresAt,
    checkpoint: input.checkpoint,
    dedupe_key: input.dedupeKey,
    payload: input.payload,
    scheduled_for: input.scheduledFor,
    started_at: input.startedAt,
    completed_at: input.completedAt,
    error_class: input.errorClass,
    error_message: input.errorMessage,
  });
}

export function workerRunRow(input: {
  workerRunId?: string;
  workerKey: string;
  runtime?: string;
  deploymentId?: string;
  jobId?: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  recordsRead?: number;
  recordsWritten?: number;
  claimsVerified?: number;
  errorClass?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}): Json {
  return compactRow({
    worker_run_id: input.workerRunId,
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
    error_message: input.errorMessage,
    metadata: input.metadata,
  });
}

export function fromJurisdiction(row: Json) {
  return {
    jurisdictionId: str(row.jurisdiction_id),
    jurisdictionKey: str(row.jurisdiction_key),
    name: str(row.name),
    jurisdictionType: str(row.jurisdiction_type),
    parentJurisdictionId: opt(row.parent_jurisdiction_id),
    stateCode: opt(row.state_code),
    countyName: opt(row.county_name),
    municipalityName: opt(row.municipality_name),
    fipsCode: opt(row.fips_code),
    status: str(row.status, "active"),
  };
}

export function fromSeat(row: Json) {
  return {
    seatId: str(row.seat_id),
    seatKey: str(row.seat_key),
    seatName: str(row.seat_name),
    officeType: str(row.office_type),
    governmentLevel: str(row.government_level),
    branch: opt(row.branch),
    chamber: opt(row.chamber),
    jurisdictionId: str(row.jurisdiction_id),
    districtName: opt(row.district_name),
    districtNumber: opt(row.district_number),
    seatAtLarge: row.seat_at_large == null ? undefined : Boolean(row.seat_at_large),
    selectionMethod: opt(row.selection_method),
    partisanOffice: row.partisan_office == null ? undefined : Boolean(row.partisan_office),
    termLengthMonths: optNum(row.term_length_months),
    termLimitSummary: opt(row.term_limit_summary),
    vacancyFillingMethod: opt(row.vacancy_filling_method),
    authoritySummary: opt(row.authority_summary),
    responsibilities: asStringArray(row.responsibilities) ?? (row.responsibilities ? [str(row.responsibilities)] : undefined),
    eligibilityRequirements:
      asStringArray(row.eligibility_requirements) ??
      (row.eligibility_requirements ? [str(row.eligibility_requirements)] : undefined),
    occupancyStatus: str(row.occupancy_status, "unknown"),
    nextElectionDate: opt(row.next_election_date),
    researchContractKey: opt(row.research_contract_key),
    baselineStatus: str(row.baseline_status, "unknown"),
    monitoringActive: Boolean(row.monitoring_active),
  };
}

export function fromPerson(row: Json) {
  return {
    personId: str(row.person_id),
    canonicalName: str(row.canonical_name),
    firstName: opt(row.first_name),
    middleName: opt(row.middle_name),
    lastName: opt(row.last_name),
    suffix: opt(row.suffix),
    preferredName: opt(row.preferred_name),
    aliases: asStringArray(row.aliases),
    dateOfBirth: opt(row.date_of_birth),
    birthplace: opt(row.birthplace),
    portraitUrl: opt(row.portrait_url),
    portraitSourceUrl: opt(row.portrait_source_url),
    portraitCredit: opt(row.portrait_credit),
    portraitStatus: opt(row.portrait_status),
    identityStatus: opt(row.identity_status),
    externalIdentifiers: asRecord(row.external_identifiers),
  };
}

export function fromOccupancy(row: Json) {
  return {
    occupancyId: str(row.occupancy_id),
    seatId: str(row.seat_id),
    personId: str(row.person_id),
    startDate: opt(row.start_date),
    endDate: opt(row.end_date),
    assumedOfficeDate: opt(row.assumed_office_date),
    swornInDate: opt(row.sworn_in_date),
    occupancyStatus: str(row.occupancy_status, "unknown"),
    electedOrAppointed: opt(row.elected_or_appointed),
    electionId: opt(row.election_id),
    evidenceState: str(row.evidence_state, "unreviewed"),
  };
}

export function fromElection(row: Json) {
  return {
    electionId: str(row.election_id),
    seatId: opt(row.seat_id),
    electionKey: str(row.election_key),
    electionType: opt(row.election_type),
    electionDate: opt(row.election_date),
    filingOpenDate: opt(row.filing_open_date),
    filingDeadline: opt(row.filing_deadline),
    qualifyingOpenDate: opt(row.qualifying_open_date),
    qualifyingDeadline: opt(row.qualifying_deadline),
    status: opt(row.status),
    sourceUrl: opt(row.source_url),
    certificationDate: opt(row.certification_date),
  };
}

export function fromCampaign(row: Json) {
  return {
    candidateCampaignId: str(row.candidate_campaign_id),
    personId: str(row.person_id),
    seatId: str(row.seat_id),
    electionId: str(row.election_id),
    party: opt(row.party),
    candidateStatus: opt(row.candidate_status),
    filingDate: opt(row.filing_date),
    qualifiedDate: opt(row.qualified_date),
    withdrawalDate: opt(row.withdrawal_date),
    campaignWebsite: opt(row.campaign_website),
    committeeName: opt(row.committee_name),
    committeeIdentifier: opt(row.committee_identifier),
    portraitStatus: opt(row.portrait_status),
    baselineStatus: opt(row.baseline_status),
  };
}

export function fromSource(row: Json) {
  return {
    sourceId: str(row.source_id),
    sourceKey: str(row.source_key),
    name: str(row.name),
    sourceUrl: str(row.source_url),
    sourceType: opt(row.source_type),
    authorityTier: opt(row.authority_tier),
    jurisdictionId: opt(row.jurisdiction_id),
    host: opt(row.host),
    active: row.active !== false,
    refreshClass: opt(row.refresh_class),
    normalPollInterval: optNum(row.normal_poll_interval) ?? (row.normal_poll_interval == null ? undefined : Number(row.normal_poll_interval)),
    electionPollInterval:
      optNum(row.election_poll_interval) ?? (row.election_poll_interval == null ? undefined : Number(row.election_poll_interval)),
    rateLimitPolicy: typeof row.rate_limit_policy === "string" ? row.rate_limit_policy : undefined,
    parserKey: opt(row.parser_key),
    parserVersion: opt(row.parser_version),
    lastSuccessAt: opt(row.last_success_at),
    lastFailureAt: opt(row.last_failure_at),
    nextPollAt: opt(row.next_poll_at),
    healthState: str(row.health_state, "unknown"),
  };
}

export function fromRetrieval(row: Json) {
  return {
    retrievalId: str(row.retrieval_id),
    sourceId: str(row.source_id),
    jobId: opt(row.job_id),
    retrievedAt: str(row.retrieved_at),
    sourceUrl: str(row.source_url),
    httpStatus: optNum(row.http_status),
    contentType: opt(row.content_type),
    etag: opt(row.etag),
    lastModified: opt(row.last_modified),
    contentHash: str(row.content_hash),
    rawObjectUri: opt(row.raw_object_uri),
    byteLength: optNum(row.byte_length),
    parserKey: opt(row.parser_key),
    parserVersion: opt(row.parser_version),
    retrievalStatus: str(row.retrieval_status, "stored"),
    metadata: asRecord(row.metadata),
  };
}

export function fromEvidence(row: Json) {
  return {
    evidenceId: str(row.evidence_id),
    sourceId: opt(row.source_id),
    retrievalId: opt(row.retrieval_id),
    evidenceType: opt(row.evidence_type),
    sourceUrl: opt(row.source_url),
    supportingLocator: opt(row.supporting_locator),
    excerpt: opt(row.excerpt),
    assetUri: opt(row.asset_uri),
    contentHash: str(row.content_hash),
    verificationState: str(row.verification_state, "collected_unreviewed"),
    rightsMetadata: row.rights_metadata ? asRecord(row.rights_metadata) : undefined,
  };
}

export function fromClaim(row: Json) {
  return {
    claimId: str(row.claim_id),
    subjectType: opt(row.subject_type),
    subjectId: opt(row.subject_id),
    seatId: opt(row.seat_id),
    fieldKey: str(row.field_key),
    normalizedValue: opt(row.normalized_value),
    displayValue: opt(row.display_value),
    valueHash: opt(row.value_hash),
    validFrom: opt(row.valid_from),
    validTo: opt(row.valid_to),
    firstSeenAt: opt(row.first_seen_at),
    lastSeenAt: opt(row.last_seen_at),
    lastVerifiedAt: opt(row.last_verified_at),
    verificationState: str(row.verification_state, "not_collected") as ClaimStatus,
    confidence: optNum(row.confidence),
    volatilityClass: opt(row.volatility_class),
    recheckAfter: opt(row.recheck_after),
    supersedesClaimId: opt(row.supersedes_claim_id),
  };
}

export function fromJob(row: Json) {
  return {
    jobId: str(row.job_id),
    jobType: str(row.job_type) as JobType,
    targetType: opt(row.target_type),
    targetId: opt(row.target_id),
    seatId: opt(row.seat_id),
    sourceId: opt(row.source_id),
    priority: num(row.priority, 100),
    status: str(row.status, "queued") as JobStatus,
    attemptCount: num(row.attempt_count),
    maxAttempts: num(row.max_attempts, 5),
    leasedBy: opt(row.leased_by),
    leaseExpiresAt: opt(row.lease_expires_at),
    checkpoint: asRecord(row.checkpoint),
    dedupeKey: str(row.dedupe_key),
    payload: asRecord(row.payload),
    scheduledFor: str(row.scheduled_for),
    startedAt: opt(row.started_at),
    completedAt: opt(row.completed_at),
    errorClass: opt(row.error_class),
    errorMessage: opt(row.error_message),
  };
}

export function fromMonitoring(row: Json) {
  return {
    monitoringStateId: str(row.monitoring_state_id),
    targetType: str(row.target_type),
    targetId: str(row.target_id),
    seatId: opt(row.seat_id),
    active: row.active !== false,
    monitoringClass: str(row.monitoring_class, "daily"),
    lastCheckedAt: opt(row.last_checked_at),
    lastChangedAt: opt(row.last_changed_at),
    nextCheckAt: opt(row.next_check_at),
    consecutiveFailures: num(row.consecutive_failures),
    lastResult: opt(row.last_result),
    configuration: asRecord(row.configuration),
  };
}

export function fromContract(row: Json) {
  return {
    researchContractId: str(row.research_contract_id),
    contractKey: str(row.contract_key),
    name: str(row.name),
    officeClass: str(row.office_class),
    version: Number(row.version ?? 1),
    active: row.active !== false,
    description: opt(row.description),
  };
}

export function fromContractField(row: Json) {
  return {
    researchContractFieldId: str(row.research_contract_field_id),
    researchContractId: str(row.research_contract_id),
    fieldKey: str(row.field_key),
    category: opt(row.category),
    requiredForBaseline: Boolean(row.required_for_baseline),
    verificationRequirement: opt(row.verification_requirement),
    sourcePriority: typeof row.source_priority === "string" ? row.source_priority : undefined,
    volatilityClass: opt(row.volatility_class),
    recheckPolicy: opt(row.recheck_policy),
    sensitivityRule: opt(row.sensitivity_rule),
    sortOrder: optNum(row.sort_order),
  };
}

export function fromWorkerRun(row: Json) {
  return {
    workerRunId: str(row.worker_run_id),
    workerKey: str(row.worker_key),
    runtime: str(row.runtime, "cloudflare"),
    deploymentId: opt(row.deployment_id),
    jobId: opt(row.job_id),
    status: (row.status as "started" | "succeeded" | "failed" | "degraded" | "cancelled") ?? "started",
    startedAt: str(row.started_at),
    completedAt: opt(row.completed_at),
    recordsRead: num(row.records_read),
    recordsWritten: num(row.records_written),
    claimsVerified: num(row.claims_verified),
    errorClass: opt(row.error_class),
    errorMessage: opt(row.error_message),
    metadata: asRecord(row.metadata),
    createdAt: opt(row.created_at),
  };
}

export function fromContradiction(row: Json) {
  const claimIds = Array.isArray(row.claim_ids) ? row.claim_ids.map((item) => String(item)) : [];
  return {
    contradictionId: opt(row.contradiction_id),
    subjectType: opt(row.subject_type),
    subjectId: opt(row.subject_id),
    seatId: opt(row.seat_id),
    fieldKey: opt(row.field_key),
    claimIds,
    status: opt(row.status),
    severity: opt(row.severity),
  };
}

export function evidenceBucketName(): string {
  return EVIDENCE_BUCKET_NAME;
}
