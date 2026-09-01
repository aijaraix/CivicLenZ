export const CLAIM_STATUSES = [
  "COLLECTED_UNREVIEWED",
  "EXTRACTED",
  "ENTITY_MATCH_PENDING",
  "EVIDENCE_PENDING",
  "VERIFICATION_PENDING",
  "VERIFIED",
  "CONFLICT",
  "REJECTED",
  "STALE",
  "CHECKED_NO_AUTHORITATIVE_RESULT",
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const JOB_ROUTES = ["ingest", "validate", "monitor", "heavy"] as const;
export type JobRoute = (typeof JOB_ROUTES)[number];

export const JOB_STATUSES = [
  "pending",
  "leased",
  "running",
  "completed",
  "failed",
  "dead_lettered",
  "routed_heavy",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const PARSER_VERSION = "civiclenz-cf-collector/1.0.0";
export const VALIDATOR_VERSION = "civiclenz-cf-validator/1.0.0";
export const SCHEDULER_VERSION = "civiclenz-cf-scheduler/1.0.0";
export const USER_AGENT = "CivicLenZCollector/1.0 (+https://civiclenz.ai; research@civiclenz.ai)";

export const SMALL_PAYLOAD_MAX_BYTES = 8 * 1024 * 1024;
export const CIVIC_NAMESPACE = "7c2e1a90-4b5d-4f8a-9c31-2e6f0a8b4d17";

export type QueueJobMessage = {
  schemaVersion: "1.0.0";
  jobId: string;
  dedupeKey: string;
  route: JobRoute;
  sourceKey?: string;
  sourceUrl?: string;
  entityType?: string;
  entityId?: string;
  retrievalId?: string;
  claimId?: string;
  attempt: number;
  scheduledFor: string;
  dryRun: boolean;
  metadata?: Record<string, unknown>;
};

export type DeadLetterPayload = {
  schemaVersion: "1.0.0";
  jobId: string;
  worker: string;
  sourceKey?: string;
  errorClass: string;
  errorMessage: string;
  attemptCount: number;
  timestamp: string;
  payloadSummary: Record<string, unknown>;
};

export type WorkerIdentity = {
  workerKey: string;
  runtime: "cloudflare" | "test";
  deploymentId?: string;
};

export type WorkerRunRecord = {
  id: string;
  workerKey: string;
  runtime: string;
  deploymentId?: string;
  jobId?: string;
  status: "started" | "succeeded" | "failed" | "dead_lettered";
  startedAt: string;
  completedAt?: string;
  recordsRead: number;
  recordsWritten: number;
  claimsVerified: number;
  errorClass?: string;
  errorMessage?: string;
  metadata: Record<string, unknown>;
};

export type JurisdictionRecord = {
  id: string;
  jurisdictionKey: string;
  name: string;
  kind: string;
  stateCode?: string;
  countyName?: string;
  parentId?: string;
};

export type SeatRecord = {
  id: string;
  seatKey: string;
  jurisdictionId: string;
  seatName: string;
  officeType: string;
  governmentLevel: string;
  branch?: string;
  chamber?: string;
  districtName?: string;
  districtNumber?: string;
  occupancyStatus: string;
  recordStatus: string;
};

export type PersonRecord = {
  id: string;
  personKey: string;
  displayName: string;
  fullLegalName?: string;
  firstName?: string;
  lastName?: string;
  normalizedName: string;
  recordStatus: string;
};

export type OccupancyRecord = {
  id: string;
  seatId: string;
  personId: string;
  termLabel?: string;
  startedOn?: string;
  endedOn?: string;
  electedOrAppointed?: string;
  currentStatus: string;
  recordStatus: string;
};

export type ElectionRecord = {
  id: string;
  electionKey: string;
  jurisdictionId: string;
  seatId?: string;
  name: string;
  electionDate?: string;
  electionKind?: string;
  recordStatus: string;
};

export type CandidateCampaignRecord = {
  id: string;
  campaignKey: string;
  electionId: string;
  seatId: string;
  personId: string;
  partyName?: string;
  outcome?: string;
  recordStatus: string;
};

export type SourceRecord = {
  id: string;
  sourceKey: string;
  name: string;
  sourceUrl: string;
  sourceTier?: string;
  sourceType?: string;
  enabled: boolean;
};

export type RawRetrievalRecord = {
  id: string;
  sourceId: string;
  sourceUrl: string;
  retrievedAt: string;
  httpStatus?: number;
  contentType?: string;
  etag?: string;
  lastModified?: string;
  contentSha256: string;
  byteLength?: number;
  r2Bucket?: string;
  r2Key?: string;
  parserVersion?: string;
  parseStatus: string;
};

export type EvidenceRecord = {
  id: string;
  rawRetrievalId?: string;
  sourceId?: string;
  evidenceType: string;
  sourceUrl: string;
  contentSha256: string;
  capturedAt: string;
  exactExcerpt?: string;
  reviewStatus: string;
};

export type ClaimRecord = {
  id: string;
  claimKey: string;
  claimType: string;
  status: ClaimStatus;
  subjectType?: string;
  subjectId?: string;
  predicate?: string;
  objectValue?: string;
  jurisdictionId?: string;
  seatId?: string;
  personId?: string;
  electionId?: string;
  rawRetrievalId?: string;
  publicationEligible: boolean;
  metadata: Record<string, unknown>;
};

export type JobRecord = {
  id: string;
  dedupeKey: string;
  route: JobRoute;
  status: JobStatus;
  sourceKey?: string;
  entityType?: string;
  entityId?: string;
  payload: Record<string, unknown>;
  attemptCount: number;
  leaseOwner?: string;
  leasedAt?: string;
  leaseExpiresAt?: string;
  lastErrorClass?: string;
  lastErrorMessage?: string;
  scheduledFor: string;
  startedAt?: string;
  completedAt?: string;
};

export type MonitoringStateRecord = {
  id: string;
  entityType: string;
  entityKey: string;
  checkClass: string;
  active: boolean;
  lastCheckedAt?: string;
  lastChangedAt?: string;
  nextCheckAt?: string;
  lastContentSha256?: string;
};

export type ResearchContractRecord = {
  id: string;
  contractKey: string;
  seatId?: string;
  personId?: string;
  title: string;
  status: string;
};

export type ResearchContractFieldRecord = {
  id: string;
  contractId: string;
  fieldKey: string;
  status: string;
  notes?: string;
};

export type ExtractedOfficeholder = {
  displayName: string;
  officeTitle: string;
  officeKind: string;
  seatFamily: string;
  governmentLevel: string;
  branch?: string;
  districtNumber?: string;
  jurisdictionName: string;
  stateCode: string;
  termLabel?: string;
  termLengthText?: string;
  yearOnBallotText?: string;
  serviceEndDateText?: string;
  electedOrAppointed?: string;
  rawRowText: string;
};

export type EvidenceBucket = {
  put(
    key: string,
    value: Uint8Array,
    options: { contentType?: string; customMetadata?: Record<string, string> },
  ): Promise<void>;
};

export type QueueSender = {
  send(message: unknown): Promise<void>;
};

export type RuntimeQueues = {
  ingest?: QueueSender;
  validate?: QueueSender;
  monitor?: QueueSender;
  heavy?: QueueSender;
  deadLetter?: QueueSender;
};
