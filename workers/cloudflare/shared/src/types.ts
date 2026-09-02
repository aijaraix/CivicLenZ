export const CLAIM_STATUSES = [
  "not_collected",
  "collected_unreviewed",
  "source_found",
  "extracted",
  "entity_match_pending",
  "evidence_pending",
  "verification_pending",
  "verified",
  "conflict",
  "stale",
  "rejected",
  "superseded",
  "checked_no_authoritative_result",
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const CLAIM_CONFIDENCE = ["high", "medium", "low", "insufficient"] as const;
export type ClaimConfidence = (typeof CLAIM_CONFIDENCE)[number];

export const EVIDENCE_VERIFICATION_STATES = ["pending", "verified", "conflict", "stale", "rejected"] as const;
export type EvidenceVerificationState = (typeof EVIDENCE_VERIFICATION_STATES)[number];
/** Newly collected evidence_objects.verification_state. `collected_unreviewed` is claims-only. */
export const NEW_COLLECTED_EVIDENCE_VERIFICATION_STATE = "pending";

export const JOB_TYPES = ["ingest", "validate", "monitor", "heavy"] as const;
export type JobType = (typeof JOB_TYPES)[number];
/** Application queue selection. Never a jobs table column. */
export const JOB_ROUTES = JOB_TYPES;
export type JobRoute = JobType;

export const CLAIM_EVIDENCE_ROLES = [
  "supports",
  "contradicts",
  "contextualizes",
  "official_response",
] as const;
export type ClaimEvidenceRole = (typeof CLAIM_EVIDENCE_ROLES)[number];

export type ClaimEvidenceRecord = {
  claimId: string;
  evidenceId: string;
  role: ClaimEvidenceRole | string;
};

export const JOB_STATUSES = [
  "queued",
  "leased",
  "running",
  "succeeded",
  "failed",
  "dead_letter",
  "cancelled",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const PARSER_VERSION = "civiclenz-cf-collector/1.0.0";
export const VALIDATOR_VERSION = "civiclenz-cf-validator/1.0.0";
export const SCHEDULER_VERSION = "civiclenz-cf-scheduler/1.0.0";
export const USER_AGENT = "CivicLenZCollector/1.0 (+https://civiclenz.ai; research@civiclenz.ai)";
export const BROWSER_DIRECTORY_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
export const EVIDENCE_BUCKET_NAME = "civiclenzevidence";

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
  jobType?: string;
  worker: string;
  source?: string;
  sourceKey?: string;
  targetType?: string;
  targetId?: string;
  target?: string;
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
  workerRunId: string;
  workerKey: string;
  runtime: string;
  deploymentId?: string;
  jobId?: string;
  status: "started" | "succeeded" | "failed" | "degraded" | "cancelled";
  startedAt: string;
  completedAt?: string;
  recordsRead: number;
  recordsWritten: number;
  claimsVerified: number;
  errorClass?: string;
  errorMessage?: string;
  metadata: Record<string, unknown>;
  createdAt?: string;
};

export type JurisdictionRecord = {
  jurisdictionId: string;
  jurisdictionKey: string;
  name: string;
  jurisdictionType: string;
  parentJurisdictionId?: string;
  stateCode?: string;
  countyName?: string;
  municipalityName?: string;
  fipsCode?: string;
  status: string;
};

export type SeatRecord = {
  seatId: string;
  seatKey: string;
  seatName: string;
  officeType: string;
  governmentLevel: string;
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
  responsibilities?: string[];
  eligibilityRequirements?: string[];
  occupancyStatus: string;
  nextElectionDate?: string;
  researchContractKey?: string;
  baselineStatus: string;
  monitoringActive: boolean;
};

export type PersonRecord = {
  personId: string;
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
};

export type OccupancyRecord = {
  occupancyId: string;
  seatId: string;
  personId: string;
  startDate?: string;
  endDate?: string;
  assumedOfficeDate?: string;
  swornInDate?: string;
  occupancyStatus: string;
  electedOrAppointed?: string;
  electionId?: string;
  evidenceState: string;
};

export type ElectionRecord = {
  electionId: string;
  seatId?: string;
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
};

export type CandidateCampaignRecord = {
  candidateCampaignId: string;
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
};

export type SourceRecord = {
  sourceId: string;
  sourceKey: string;
  name: string;
  sourceUrl: string;
  sourceType?: string;
  authorityTier?: string;
  jurisdictionId?: string;
  host?: string;
  active: boolean;
  refreshClass?: string;
  normalPollInterval?: number;
  electionPollInterval?: number;
  rateLimitPolicy?: string;
  parserKey?: string;
  parserVersion?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  nextPollAt?: string;
  healthState: string;
};

export type RawRetrievalRecord = {
  retrievalId: string;
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
  retrievalStatus: string;
  metadata?: Record<string, unknown>;
};

export type EvidenceRecord = {
  evidenceId: string;
  sourceId?: string;
  retrievalId?: string;
  evidenceType?: string;
  sourceUrl?: string;
  supportingLocator?: string;
  excerpt?: string;
  assetUri?: string;
  contentHash: string;
  verificationState: string;
  rightsMetadata?: Record<string, unknown>;
};

export type ClaimRecord = {
  claimId: string;
  subjectType?: string;
  subjectId?: string;
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
  confidence?: ClaimConfidence;
  volatilityClass?: string;
  recheckAfter?: string;
  supersedesClaimId?: string;
};

export type JobRecord = {
  jobId: string;
  jobType: JobType;
  targetType?: string;
  targetId?: string;
  seatId?: string;
  sourceId?: string;
  priority: number;
  status: JobStatus;
  attemptCount: number;
  maxAttempts: number;
  leasedBy?: string;
  leaseExpiresAt?: string;
  checkpoint: Record<string, unknown>;
  dedupeKey: string;
  payload: Record<string, unknown>;
  scheduledFor: string;
  startedAt?: string;
  completedAt?: string;
  errorClass?: string;
  errorMessage?: string;
};

export type MonitoringStateRecord = {
  monitoringStateId: string;
  targetType: string;
  targetId: string;
  seatId?: string;
  active: boolean;
  monitoringClass: string;
  lastCheckedAt?: string;
  lastChangedAt?: string;
  nextCheckAt?: string;
  consecutiveFailures: number;
  lastResult?: string;
  configuration: Record<string, unknown>;
};

export type ResearchContractRecord = {
  researchContractId: string;
  contractKey: string;
  name: string;
  officeClass: string;
  version: number;
  active: boolean;
  description?: string;
};

export type ResearchContractFieldRecord = {
  researchContractFieldId: string;
  researchContractId: string;
  fieldKey: string;
  category?: string;
  requiredForBaseline: boolean;
  verificationRequirement?: string;
  sourcePriority?: string;
  volatilityClass?: string;
  recheckPolicy?: string;
  sensitivityRule?: string;
  sortOrder?: number;
};

export type ExtractedOfficeholder = {
  displayName: string;
  officeTitle: string;
  officeKind: string;
  seatFamily: string;
  governmentLevel: string;
  branch?: string;
  chamber?: string;
  districtNumber?: string;
  jurisdictionName: string;
  jurisdictionKey?: string;
  jurisdictionType?: string;
  countyName?: string;
  parentJurisdictionKey?: string;
  stateCode: string;
  seatKey?: string;
  vacant?: boolean;
  partyName?: string;
  countyDescription?: string;
  sourceMemberUrl?: string;
  externalIdentifiers?: Record<string, string>;
  occupancyStatus?: string;
  startDate?: string;
  endDate?: string;
  termLabel?: string;
  termLengthText?: string;
  yearOnBallotText?: string;
  serviceStartDateText?: string;
  serviceEndDateText?: string;
  electedOrAppointed?: string;
  portraitUrl?: string;
  email?: string;
  phone?: string;
  rawRowText: string;
};

export type EvidenceBucket = {
  put(
    key: string,
    value: Uint8Array,
    options: { contentType?: string; customMetadata?: Record<string, string> },
  ): Promise<void>;
  get?(key: string): Promise<Uint8Array | undefined>;
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
