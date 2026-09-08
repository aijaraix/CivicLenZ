export const RESEARCH_INGEST_CONTRACT_VERSION = "CIVICLENZ_RESEARCH_INGEST_CONTRACT_V1" as const;
export const HERMES_RESEARCH_JOB_CONTRACT_VERSION = "HERMES_RESEARCH_JOB_V1" as const;

export const ACKNOWLEDGEMENT_STATES = [
  "ACCEPTED_FOR_VALIDATION",
  "DUPLICATE",
  "NEEDS_IDENTITY_RESOLUTION",
  "NEEDS_MORE_EVIDENCE",
  "PARTIALLY_ACCEPTED",
  "REJECTED_SCHEMA",
  "REJECTED_POLICY",
  "RETRY_LATER",
  "CANONICAL_CONFLICT",
] as const;

export type AcknowledgementState = (typeof ACKNOWLEDGEMENT_STATES)[number];

export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

export type ProducerDefinition = {
  producer_id: string;
  active: boolean;
  allowed_result_contracts: string[];
  accepted_job_contracts: string[];
  allowed_capabilities: string[];
  authority_boundary: string;
  direct_canonical_storage_access: boolean;
  canonical_verification_authority: boolean;
  canonical_publication_authority: boolean;
};

export type ProducerRegistry = {
  registry_version: string;
  producers: ProducerDefinition[];
};

export type ResearchReservation = {
  reservation_id: string;
  lease_expires_at: string;
};

export type EvidenceSubmission = {
  evidence_key: string;
  source_url: string;
  retrieved_at: string;
  mime_type: string;
  byte_length: number;
  sha256: string;
  content_base64?: string;
  method: string;
  parser_version: string;
  locator?: string;
};

export type EntityCandidate = {
  candidate_key: string;
  canonical_id_hint?: string;
  attributes: JsonObject;
  evidence_keys: string[];
  identity_resolution_required?: boolean;
};

export type ResearchIngestEnvelope = {
  contract_version: typeof RESEARCH_INGEST_CONTRACT_VERSION;
  producer: {
    producer_id: string;
    producer_version: string;
    manifest_version?: string;
    execution_id?: string;
  };
  job: {
    job_id: string;
    research_work_identity: string;
    research_reservation?: ResearchReservation;
  };
  extraction_status: "extracted_unreviewed";
  capability: string;
  cohort: {
    cohort_key: string;
    state: string;
    assignment_id?: string;
  };
  sources: JsonObject[];
  retrievals: JsonObject[];
  evidence: EvidenceSubmission[];
  entities: {
    jurisdiction_candidates: EntityCandidate[];
    seat_candidates: EntityCandidate[];
    person_candidates: EntityCandidate[];
    occupancy_candidates: EntityCandidate[];
    election_candidates: EntityCandidate[];
    candidate_campaign_candidates: EntityCandidate[];
  };
  claims: JsonObject[];
  relationships: JsonObject[];
  dataset_units: JsonObject[];
  gis_boundaries: JsonObject[];
  warnings: string[];
  gaps: string[];
  currentness: {
    current_as_of: string;
    cutoff?: string;
    source_universe?: string;
  };
  monitoring_recommendations: JsonObject[];
};

export type IntakeAcknowledgement = {
  acknowledgement_version: "CIVICLENZ_HARVESTER_ACK_V1";
  acknowledgement_state: AcknowledgementState;
  receipt_id?: string;
  producer_id?: string;
  job_id?: string;
  research_work_identity?: string;
  result_content_hash?: string;
  correlation_id: string;
  retry_after_seconds?: number;
  reasons?: string[];
};

export type ReceiverConfig = {
  bindHost: string;
  port: number;
  maxBodyBytes: number;
  maxPendingReceipts: number;
  retryAfterSeconds: number;
  maxClockSkewMs: number;
  spoolDirectory: string;
  bridgeSecret: string;
  registry: ProducerRegistry;
};

export type StoredEvidenceArtifact = {
  evidence_key: string;
  declared_sha256: string;
  actual_sha256?: string;
  byte_length: number;
  integrity_state: "MATCH" | "METADATA_ONLY";
  local_spool_path?: string;
};

export type StoredReceipt = {
  receipt_version: "CIVICLENZ_HARVESTER_RECEIPT_V1";
  receipt_id: string;
  producer_id: string;
  producer_version: string;
  contract_version: string;
  job_id: string;
  research_work_identity: string;
  research_reservation_id?: string;
  result_content_hash: string;
  idempotency_key: string;
  received_at: string;
  acknowledgement_state: Exclude<AcknowledgementState, "DUPLICATE" | "CANONICAL_CONFLICT" | "REJECTED_SCHEMA" | "REJECTED_POLICY" | "RETRY_LATER">;
  dispatch_state: "PENDING_CANONICAL_DISPATCH" | "DISPATCHED" | "DISPATCH_FAILED";
  evidence: StoredEvidenceArtifact[];
  envelope: ResearchIngestEnvelope;
};

export type SpoolAcceptResult =
  | { kind: "accepted"; receipt: StoredReceipt }
  | { kind: "duplicate"; receipt: StoredReceipt }
  | { kind: "conflict"; receipt: StoredReceipt }
  | { kind: "hash_mismatch"; evidence_keys: string[] }
  | { kind: "backpressure" };

export type ReceiverResult = {
  statusCode: number;
  acknowledgement: IntakeAcknowledgement;
};

export type BridgeTelemetry = {
  contract_versions: string[];
  known_producers: Array<{ producer_id: string; active: boolean }>;
  pending_canonical_dispatch: number;
  receipts: number;
  quarantined_evidence: number;
  last_harvester_contact_at?: string;
  authentication_successes: number;
  authentication_failures: number;
  submissions: number;
  accepted_for_validation: number;
  duplicates: number;
  schema_rejects: number;
  policy_rejects: number;
  hash_mismatches: number;
  identity_resolution_requirements: number;
  partially_accepted: number;
  retry_later: number;
  canonical_conflicts: number;
  producer_versions: Record<string, string>;
  observed_contract_versions: Record<string, number>;
};

export type BridgeTelemetryOutcome =
  | "authentication_success"
  | "authentication_failure"
  | "accepted_for_validation"
  | "duplicate"
  | "schema_reject"
  | "policy_reject"
  | "hash_mismatch"
  | "identity_resolution_requirement"
  | "partially_accepted"
  | "retry_later"
  | "canonical_conflict";

export type PersistedBridgeTelemetry = {
  telemetry_version: "CIVICLENZ_HARVESTER_TELEMETRY_V1";
  last_harvester_contact_at?: string;
  authentication_successes: number;
  authentication_failures: number;
  submissions: number;
  accepted_for_validation: number;
  duplicates: number;
  schema_rejects: number;
  policy_rejects: number;
  hash_mismatches: number;
  identity_resolution_requirements: number;
  partially_accepted: number;
  retry_later: number;
  canonical_conflicts: number;
  producer_versions: Record<string, string>;
  observed_contract_versions: Record<string, number>;
};
