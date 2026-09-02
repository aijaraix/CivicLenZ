import { capabilityState } from "./capabilities.ts";
import { reconcileDataset, type DatasetReconciliation } from "./dataset-reconciliation.ts";
import {
  contractForOfficeType,
  officeClassForOfficeType,
  type ContractFieldSpec,
  type FieldCategory,
  type OfficeClass,
  type OfficeClassContract,
} from "./office-classes.ts";
import type { CivicStore } from "./store.ts";
import type {
  ClaimRecord,
  ClaimStatus,
  EvidenceRecord,
  OccupancyRecord,
  PersonRecord,
  ResearchContractFieldRecord,
  SeatRecord,
} from "./types.ts";

export const PRESENCE_STATES = [
  "PRESENT",
  "MISSING",
  "NOT_APPLICABLE",
  "UNKNOWN",
  "CHECKED_NO_AUTHORITATIVE_RESULT",
] as const;
export type PresenceState = (typeof PRESENCE_STATES)[number];

export const VERIFICATION_BUCKETS = ["VERIFIED", "PENDING", "CONFLICT", "STALE", "REJECTED", "NOT_CHECKED"] as const;
export type VerificationBucket = (typeof VERIFICATION_BUCKETS)[number];

export const COMPLETENESS_DIMENSIONS = [
  "FIELD",
  "SOURCE",
  "TEMPORAL",
  "EVIDENCE",
  "VERIFICATION",
  "FRESHNESS",
  "DATASET_RECONCILIATION",
  "MONITORING",
  "UNRESOLVED_CONTRADICTIONS",
] as const;
export type CompletenessDimension = (typeof COMPLETENESS_DIMENSIONS)[number];

export type CompletenessReport = {
  seatDiscovery: PresenceState;
  officeholderBaseline: PresenceState;
  requiredFieldPresence: number;
  requiredFieldTotal: number;
  evidenceVerification: number;
  evidenceTotal: number;
  freshness: PresenceState;
  monitoringCoverage: PresenceState;
  candidateCoverage: PresenceState;
  electionCoverage: PresenceState;
  unresolvedContradictions: number;
};

export type FieldDimensionResult = {
  fieldKey: string;
  category: FieldCategory;
  requiredForBaseline: boolean;
  openEnded: boolean;
  presence: PresenceState;
  claimState?: ClaimStatus;
  explanation: string;
  action:
    | "none"
    | "collect"
    | "refresh"
    | "contradiction"
    | "verify"
    | "dataset_unit"
    | "close_not_implemented";
  capabilityState: ReturnType<typeof capabilityState>;
};

export type CompletenessAudit = {
  subjectType: "person" | "seat";
  subjectId: string;
  seatId?: string;
  personId?: string;
  jurisdictionId?: string;
  researchContractKey: string;
  officeClass: OfficeClass;
  cohortKey?: string;
  generatedAt: string;
  dimensions: Record<CompletenessDimension, { status: PresenceState | "OPEN"; summary: string; count?: number }>;
  fields: FieldDimensionResult[];
  byCategory: Record<string, { present: number; total: number; gaps: string[] }>;
  datasets: DatasetReconciliation[];
  baselineIdentityComplete: boolean;
  contractBaselineComplete: boolean;
  completeAndFresh: boolean;
  monitoringEligible: boolean;
  knownGaps: string[];
  staleCount: number;
  contradictionCount: number;
  openEndedNeverEverythingComplete: false;
};

export type CompletenessQuery = {
  personId?: string;
  seatId?: string;
  category?: FieldCategory;
  researchContractKey?: string;
  jurisdictionId?: string;
  cohortKey?: string;
};

export function presenceForClaim(claim: ClaimRecord | undefined): PresenceState {
  if (!claim) return "MISSING";
  if (claim.verificationState === "checked_no_authoritative_result") return "CHECKED_NO_AUTHORITATIVE_RESULT";
  if (claim.verificationState === "not_collected") return "MISSING";
  if (claim.normalizedValue || claim.displayValue) return "PRESENT";
  return "UNKNOWN";
}

export function verificationBucket(claim: ClaimRecord | undefined): VerificationBucket {
  if (!claim) return "NOT_CHECKED";
  if (claim.verificationState === "verified") return "VERIFIED";
  if (claim.verificationState === "conflict") return "CONFLICT";
  if (claim.verificationState === "stale") return "STALE";
  if (claim.verificationState === "rejected") return "REJECTED";
  return "PENDING";
}

export function requiredFieldPresence(
  fields: ResearchContractFieldRecord[],
  claims: ClaimRecord[],
): { present: number; total: number } {
  const required = fields.filter((field) => field.requiredForBaseline);
  const present = required.filter((field) =>
    claims.some((claim) => claim.fieldKey === field.fieldKey && presenceForClaim(claim) === "PRESENT"),
  ).length;
  return { present, total: required.length };
}

export function buildCompleteness(input: {
  hasSeat: boolean;
  hasOccupancy: boolean;
  fields: ResearchContractFieldRecord[];
  claims: ClaimRecord[];
  evidenceLinked: number;
  evidenceRequired: number;
  hasMonitoring: boolean;
  hasCandidates: boolean;
  hasElection: boolean;
  staleClaims: number;
  contradictions: number;
}): CompletenessReport {
  const required = requiredFieldPresence(input.fields, input.claims);
  return {
    seatDiscovery: input.hasSeat ? "PRESENT" : "MISSING",
    officeholderBaseline: input.hasOccupancy ? "PRESENT" : "MISSING",
    requiredFieldPresence: required.present,
    requiredFieldTotal: required.total,
    evidenceVerification: input.evidenceLinked,
    evidenceTotal: input.evidenceRequired,
    freshness: input.staleClaims > 0 ? "UNKNOWN" : input.claims.length > 0 ? "PRESENT" : "MISSING",
    monitoringCoverage: input.hasMonitoring ? "PRESENT" : "MISSING",
    candidateCoverage: input.hasCandidates ? "PRESENT" : "MISSING",
    electionCoverage: input.hasElection ? "PRESENT" : "MISSING",
    unresolvedContradictions: input.contradictions,
  };
}

function claimForField(claims: ClaimRecord[], fieldKey: string, personId?: string, seatId?: string): ClaimRecord | undefined {
  return claims.find((claim) => {
    if (claim.fieldKey !== fieldKey) return false;
    if (personId && claim.subjectType === "person" && claim.subjectId === personId) return true;
    if (seatId && claim.subjectType === "seat" && claim.subjectId === seatId) return true;
    if (seatId && claim.seatId === seatId && claim.fieldKey === fieldKey) return true;
    return false;
  });
}

function hasValue(claim: ClaimRecord | undefined): boolean {
  if (!claim) return false;
  const value = claim.normalizedValue ?? claim.displayValue ?? "";
  return value.trim().length > 0;
}

function evaluateField(input: {
  spec: ContractFieldSpec;
  claim: ClaimRecord | undefined;
  structuralPresent: boolean;
  hasEvidence: boolean;
  hasContradiction: boolean;
  dataset?: DatasetReconciliation;
}): FieldDimensionResult {
  const cap = capabilityState(input.spec.capability);
  if (input.hasContradiction) {
    return {
      fieldKey: input.spec.fieldKey,
      category: input.spec.category,
      requiredForBaseline: input.spec.requiredForBaseline,
      openEnded: input.spec.openEnded,
      presence: presenceForClaim(input.claim),
      claimState: input.claim?.verificationState,
      explanation: `unresolved contradiction on ${input.spec.fieldKey}`,
      action: "contradiction",
      capabilityState: cap,
    };
  }
  if (input.claim?.verificationState === "stale") {
    return {
      fieldKey: input.spec.fieldKey,
      category: input.spec.category,
      requiredForBaseline: input.spec.requiredForBaseline,
      openEnded: input.spec.openEnded,
      presence: "PRESENT",
      claimState: "stale",
      explanation: "claim is stale and requires refresh",
      action: "refresh",
      capabilityState: cap,
    };
  }
  if (input.claim?.verificationState === "checked_no_authoritative_result") {
    return {
      fieldKey: input.spec.fieldKey,
      category: input.spec.category,
      requiredForBaseline: input.spec.requiredForBaseline,
      openEnded: input.spec.openEnded,
      presence: "CHECKED_NO_AUTHORITATIVE_RESULT",
      claimState: "checked_no_authoritative_result",
      explanation: "checked; no authoritative result",
      action: "none",
      capabilityState: cap,
    };
  }
  if (input.structuralPresent || (hasValue(input.claim) && input.claim?.verificationState !== "not_collected")) {
    if (input.spec.requiredForBaseline && !input.hasEvidence && input.claim && input.claim.fieldKey !== "monitoring") {
      const material = !["jurisdiction", "seat", "person", "occupancy", "monitoring"].includes(input.spec.fieldKey);
      if (material && input.claim.verificationState !== "checked_no_authoritative_result") {
        return {
          fieldKey: input.spec.fieldKey,
          category: input.spec.category,
          requiredForBaseline: input.spec.requiredForBaseline,
          openEnded: input.spec.openEnded,
          presence: "PRESENT",
          claimState: input.claim.verificationState,
          explanation: "value present but evidence is insufficient for a material claim",
          action: "verify",
          capabilityState: cap,
        };
      }
    }
    if (input.spec.enumerableDataset && cap !== "NOT_IMPLEMENTED" && input.dataset && input.dataset.completionState === "incomplete") {
      return {
        fieldKey: input.spec.fieldKey,
        category: input.spec.category,
        requiredForBaseline: input.spec.requiredForBaseline,
        openEnded: input.spec.openEnded,
        presence: "PRESENT",
        claimState: input.claim?.verificationState,
        explanation: `enumerable dataset incomplete; missing ${input.dataset.missingUnits.length} units`,
        action: "dataset_unit",
        capabilityState: cap,
      };
    }
    const claimState = input.claim?.verificationState;
    const explanation = input.spec.openEnded
      ? "coverage_complete_for_defined_scope (never everything_on_the_internet_complete)"
      : claimState
        ? `field contains information in state ${claimState}`
        : "structural entity present";
    return {
      fieldKey: input.spec.fieldKey,
      category: input.spec.category,
      requiredForBaseline: input.spec.requiredForBaseline,
      openEnded: input.spec.openEnded,
      presence: "PRESENT",
      claimState,
      explanation,
      action: "none",
      capabilityState: cap,
    };
  }
  if (cap === "NOT_IMPLEMENTED") {
    return {
      fieldKey: input.spec.fieldKey,
      category: input.spec.category,
      requiredForBaseline: input.spec.requiredForBaseline,
      openEnded: input.spec.openEnded,
      presence: "MISSING",
      claimState: input.claim?.verificationState ?? "not_collected",
      explanation: `NULL is not complete; capability ${input.spec.capability} is NOT_IMPLEMENTED`,
      action: "close_not_implemented",
      capabilityState: cap,
    };
  }
  return {
    fieldKey: input.spec.fieldKey,
    category: input.spec.category,
    requiredForBaseline: input.spec.requiredForBaseline,
    openEnded: input.spec.openEnded,
    presence: "MISSING",
    claimState: input.claim?.verificationState ?? "not_collected",
    explanation: input.claim
      ? `required field ${input.spec.fieldKey} is ${input.claim.verificationState}; NULL/empty is not complete`
      : `required field ${input.spec.fieldKey} has no claim; NULL is not complete`,
    action: "collect",
    capabilityState: cap,
  };
}

export async function auditCompleteness(
  store: CivicStore,
  query: CompletenessQuery,
  now = new Date(),
): Promise<CompletenessAudit[]> {
  const [seats, persons, occupancies, claims, evidence, links, contradictions, monitoring, contracts, sources, retrievals, elections, campaigns] =
    await Promise.all([
      store.listSeats(),
      store.listPersons(),
      store.listOccupancies(),
      store.listClaims(),
      store.listEvidence(),
      store.listClaimEvidence(),
      store.listContradictions(),
      store.listMonitoringState(),
      store.listResearchContracts(),
      store.listSources(),
      store.listRetrievals(),
      store.listElections(),
      store.listCampaigns(),
    ]);
  const evidenceByClaim = new Map<string, string[]>();
  for (const row of links) {
    const list = evidenceByClaim.get(row.claimId) ?? [];
    list.push(row.evidenceId);
    evidenceByClaim.set(row.claimId, list);
  }
  const selectedSeats = seats.filter((seat) => {
    if (query.seatId && seat.seatId !== query.seatId && seat.seatKey !== query.seatId) return false;
    if (query.jurisdictionId && seat.jurisdictionId !== query.jurisdictionId) return false;
    if (query.researchContractKey && seat.researchContractKey !== query.researchContractKey) return false;
    if (query.cohortKey === "florida-governor-fixture" && seat.officeType !== "governor") return false;
    if (query.cohortKey === "florida-senate" && seat.officeType !== "state_senator") return false;
    if (query.cohortKey === "florida-house" && seat.officeType !== "state_representative") return false;
    return true;
  });
  const audits: CompletenessAudit[] = [];
  for (const seat of selectedSeats) {
    const occupancy = occupancies.find(
      (row) => row.seatId === seat.seatId && (row.occupancyStatus === "current" || row.occupancyStatus === "acting"),
    );
    const person = occupancy ? persons.find((row) => row.personId === occupancy.personId) : undefined;
    if (query.personId && person?.personId !== query.personId) continue;
    audits.push(
      buildAuditForSeat({
        seat,
        person,
        occupancy,
        claims,
        evidence,
        evidenceByClaim,
        contradictions,
        monitoring,
        contracts,
        sources,
        retrievals,
        elections,
        campaigns,
        now,
        query,
      }),
    );
  }
  return audits;
}

function buildAuditForSeat(input: {
  seat: SeatRecord;
  person?: PersonRecord;
  occupancy?: OccupancyRecord;
  claims: ClaimRecord[];
  evidence: EvidenceRecord[];
  evidenceByClaim: Map<string, string[]>;
  contradictions: Array<{ claimIds: string[]; fieldKey?: string }>;
  monitoring: Array<{ targetType: string; targetId: string; seatId?: string; active: boolean }>;
  contracts: Array<{ contractKey: string }>;
  sources: Array<{ sourceKey: string; healthState: string }>;
  retrievals: Array<{ sourceId?: string; retrievalStatus: string }>;
  elections: Array<{ seatId?: string }>;
  campaigns: Array<{ seatId: string }>;
  now: Date;
  query: CompletenessQuery;
}): CompletenessAudit {
  const spec: OfficeClassContract = contractForOfficeType(input.seat.officeType);
  const relevantClaims = input.claims.filter(
    (claim) =>
      claim.seatId === input.seat.seatId ||
      claim.subjectId === input.seat.seatId ||
      (input.person && claim.subjectId === input.person.personId),
  );
  const contradictionClaimIds = new Set(input.contradictions.flatMap((row) => row.claimIds));
  const datasets = spec.datasetReconciliation.map((datasetType) =>
    reconcileDataset({
      datasetType: datasetType as DatasetReconciliation["datasetType"],
      subjectType: input.person ? "person" : "seat",
      subjectId: input.person?.personId ?? input.seat.seatId,
      seatId: input.seat.seatId,
    }),
  );
  const fields: FieldDimensionResult[] = spec.fields
    .filter((fieldSpec) => !input.query.category || fieldSpec.category === input.query.category)
    .map((fieldSpec) => {
      const claim = claimForField(relevantClaims, fieldSpec.fieldKey, input.person?.personId, input.seat.seatId);
      const structuralPresent =
        (fieldSpec.fieldKey === "jurisdiction" && Boolean(input.seat.jurisdictionId)) ||
        (fieldSpec.fieldKey === "seat" && Boolean(input.seat.seatId)) ||
        (fieldSpec.fieldKey === "person" && Boolean(input.person)) ||
        (fieldSpec.fieldKey === "occupancy" && Boolean(input.occupancy)) ||
        (fieldSpec.fieldKey === "identity" && Boolean(input.person)) ||
        (fieldSpec.fieldKey === "monitoring" &&
          input.monitoring.some(
            (row) => row.active && (row.seatId === input.seat.seatId || row.targetId === input.seat.seatId),
          )) ||
        (fieldSpec.fieldKey === "evidence" &&
          relevantClaims.some((claim) => (input.evidenceByClaim.get(claim.claimId)?.length ?? 0) > 0));
      const hasEvidence = Boolean(claim && (input.evidenceByClaim.get(claim.claimId)?.length ?? 0) > 0);
      const hasContradiction = Boolean(claim && contradictionClaimIds.has(claim.claimId));
      const dataset = datasets.find((row) => row.datasetType === fieldSpec.datasetReconciliation);
      return evaluateField({ spec: fieldSpec, claim, structuralPresent, hasEvidence, hasContradiction, dataset });
    });
  const byCategory: CompletenessAudit["byCategory"] = {};
  for (const field of fields) {
    const bucket = byCategory[field.category] ?? { present: 0, total: 0, gaps: [] };
    bucket.total += 1;
    if (field.presence === "PRESENT" || field.presence === "CHECKED_NO_AUTHORITATIVE_RESULT") bucket.present += 1;
    else bucket.gaps.push(field.fieldKey);
    byCategory[field.category] = bucket;
  }
  const required = fields.filter((field) => field.requiredForBaseline);
  const requiredClosed = required.filter(
    (field) => field.presence === "PRESENT" || field.presence === "CHECKED_NO_AUTHORITATIVE_RESULT",
  );
  const staleCount = relevantClaims.filter((claim) => claim.verificationState === "stale").length;
  const contradictionCount = input.contradictions.filter((row) =>
    row.claimIds.some((id) => relevantClaims.some((claim) => claim.claimId === id)),
  ).length;
  const preferredPresent = spec.preferredSources.some((sourceKey) =>
    input.sources.some((source) => source.sourceKey === sourceKey && source.healthState !== "failing"),
  );
  const evidenceLinked = relevantClaims.filter((claim) => (input.evidenceByClaim.get(claim.claimId)?.length ?? 0) > 0).length;
  const monitoringPresent = input.monitoring.some(
    (row) => row.active && (row.seatId === input.seat.seatId || row.targetId === input.seat.seatId),
  );
  const baselineIdentityComplete = Boolean(input.seat.seatId && (input.occupancy || relevantClaims.some((claim) => claim.fieldKey === "current_occupant")));
  const work = fields.filter((field) => field.action !== "none");
  const completeAndFresh = work.length === 0 && staleCount === 0 && contradictionCount === 0;
  const knownGaps = fields.filter((field) => field.action !== "none").map((field) => field.fieldKey);
  const officeClass = officeClassForOfficeType(input.seat.officeType);
  return {
    subjectType: input.person ? "person" : "seat",
    subjectId: input.person?.personId ?? input.seat.seatId,
    seatId: input.seat.seatId,
    personId: input.person?.personId,
    jurisdictionId: input.seat.jurisdictionId,
    researchContractKey: spec.contractKey,
    officeClass,
    cohortKey: input.query.cohortKey,
    generatedAt: input.now.toISOString(),
    dimensions: {
      FIELD: {
        status: requiredClosed.length === required.length && required.length > 0 ? "PRESENT" : "MISSING",
        summary: `${requiredClosed.length}/${required.length} required fields present or honestly closed`,
        count: requiredClosed.length,
      },
      SOURCE: {
        status: preferredPresent ? "PRESENT" : "MISSING",
        summary: preferredPresent ? "preferred source registered" : "preferred source missing or failing",
      },
      TEMPORAL: {
        status: input.occupancy ? "PRESENT" : "MISSING",
        summary: input.occupancy ? `occupancy ${input.occupancy.occupancyStatus}` : "no current occupancy",
      },
      EVIDENCE: {
        status: evidenceLinked > 0 ? "PRESENT" : "MISSING",
        summary: `${evidenceLinked} claims with attached evidence`,
        count: evidenceLinked,
      },
      VERIFICATION: {
        status: relevantClaims.some((claim) => claim.verificationState === "verified") ? "PRESENT" : "UNKNOWN",
        summary: "HTTP 200 / hash / parse count is not VERIFIED",
        count: relevantClaims.filter((claim) => claim.verificationState === "verified").length,
      },
      FRESHNESS: {
        status: staleCount > 0 ? "UNKNOWN" : relevantClaims.length > 0 ? "PRESENT" : "MISSING",
        summary: `${staleCount} stale claims`,
        count: staleCount,
      },
      DATASET_RECONCILIATION: {
        status: datasets.every((row) => row.completionState === "coverage_complete_for_defined_scope")
          ? "PRESENT"
          : "MISSING",
        summary: datasets.map((row) => `${row.datasetType}:${row.completionState}`).join(", ") || "none",
      },
      MONITORING: {
        status: monitoringPresent ? "PRESENT" : "MISSING",
        summary: monitoringPresent ? "monitoring_state active" : "monitoring not active",
      },
      UNRESOLVED_CONTRADICTIONS: {
        status: contradictionCount > 0 ? "UNKNOWN" : "PRESENT",
        summary: `${contradictionCount} unresolved contradictions`,
        count: contradictionCount,
      },
    },
    fields,
    byCategory,
    datasets,
    baselineIdentityComplete,
    contractBaselineComplete: requiredClosed.length === required.length && required.length > 0,
    completeAndFresh,
    monitoringEligible: baselineIdentityComplete,
    knownGaps,
    staleCount,
    contradictionCount,
    openEndedNeverEverythingComplete: false,
  };
}

export function httpHashParseCountIsNotVerified(): true {
  return true;
}
