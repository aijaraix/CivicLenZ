import type { ClaimRecord, ResearchContractFieldRecord } from "./types.ts";

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

export function presenceForClaim(claim: ClaimRecord | undefined): PresenceState {
  if (!claim) return "MISSING";
  if (claim.verificationState === "checked_no_authoritative_result") return "CHECKED_NO_AUTHORITATIVE_RESULT";
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

export function requiredFieldPresence(fields: ResearchContractFieldRecord[], claims: ClaimRecord[]): { present: number; total: number } {
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
