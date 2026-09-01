import {
  assertPublicRead,
  filterPublicFields,
  verifiedClaimsOnly,
} from "./public.ts";

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

export type CivicPublicRow = Record<string, unknown>;

export type CivicPublicSnapshot = {
  seats?: CivicPublicRow[];
  persons?: CivicPublicRow[];
  occupancies?: CivicPublicRow[];
  elections?: CivicPublicRow[];
  campaigns?: CivicPublicRow[];
  claims?: CivicPublicRow[];
  evidence?: CivicPublicRow[];
  claimEvidence?: CivicPublicRow[];
  researchContractFields?: CivicPublicRow[];
  monitoringProjections?: Array<{
    subjectType: string;
    subjectId: string;
    coverage: "PRESENT" | "MISSING";
    overdue: boolean;
  }>;
};

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

function read(row: CivicPublicRow | undefined, ...keys: string[]): unknown {
  if (!row) return undefined;
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function claimState(row: CivicPublicRow): string | undefined {
  return asString(read(row, "verification_state", "verificationState"));
}

export function presenceForClaim(row: CivicPublicRow | undefined): PresenceState {
  if (!row) return "MISSING";
  if (claimState(row) === "checked_no_authoritative_result") return "CHECKED_NO_AUTHORITATIVE_RESULT";
  if (read(row, "normalized_value", "normalizedValue") || read(row, "display_value", "displayValue")) return "PRESENT";
  return "UNKNOWN";
}

export function verificationBucket(row: CivicPublicRow | undefined): VerificationBucket {
  const state = row ? claimState(row) : undefined;
  if (!state) return "NOT_CHECKED";
  if (state === "verified") return "VERIFIED";
  if (state === "conflict") return "CONFLICT";
  if (state === "stale") return "STALE";
  if (state === "rejected") return "REJECTED";
  return "PENDING";
}

export function getSeat(snapshot: CivicPublicSnapshot, seatIdOrKey: string): CivicPublicRow | null {
  assertPublicRead("seats");
  const seat = (snapshot.seats ?? []).find(
    (row) =>
      asString(read(row, "seat_id", "seatId")) === seatIdOrKey ||
      asString(read(row, "seat_key", "seatKey")) === seatIdOrKey,
  );
  return seat ? filterPublicFields("seats", seat) : null;
}

export function getPerson(snapshot: CivicPublicSnapshot, personId: string): CivicPublicRow | null {
  assertPublicRead("persons");
  const person = (snapshot.persons ?? []).find((row) => asString(read(row, "person_id", "personId")) === personId);
  return person ? filterPublicFields("persons", person) : null;
}

export function getOfficialForSeat(snapshot: CivicPublicSnapshot, seatIdOrKey: string): {
  seat: CivicPublicRow | null;
  occupancy: CivicPublicRow | null;
  person: CivicPublicRow | null;
  verifiedClaims: CivicPublicRow[];
} {
  const seat = getSeat(snapshot, seatIdOrKey);
  const seatId = seat ? asString(read(seat, "seat_id")) : undefined;
  const occupancyRow =
    (snapshot.occupancies ?? []).find((row) => {
      const status = asString(read(row, "occupancy_status", "occupancyStatus"));
      return asString(read(row, "seat_id", "seatId")) === seatId && (status === "current" || status === "acting");
    }) ?? null;
  const occupancy = occupancyRow ? filterPublicFields("seat_occupancies", occupancyRow) : null;
  const personId = occupancy ? asString(read(occupancy, "person_id")) : undefined;
  const person = personId ? getPerson(snapshot, personId) : null;
  const subjectType = personId ? "person" : "seat";
  const subjectId = personId ?? seatId ?? "";
  return {
    seat,
    occupancy,
    person,
    verifiedClaims: subjectId ? getVerifiedClaimsForSubject(snapshot, subjectType, subjectId) : [],
  };
}

export function getElection(snapshot: CivicPublicSnapshot, electionIdOrKey: string): CivicPublicRow | null {
  assertPublicRead("elections");
  return (
    (snapshot.elections ?? []).find(
      (row) =>
        asString(read(row, "election_id", "electionId")) === electionIdOrKey ||
        asString(read(row, "election_key", "electionKey")) === electionIdOrKey,
    ) ?? null
  );
}

export function getCandidatesForElection(snapshot: CivicPublicSnapshot, electionId: string): CivicPublicRow[] {
  assertPublicRead("candidate_campaigns");
  return (snapshot.campaigns ?? []).filter((row) => asString(read(row, "election_id", "electionId")) === electionId);
}

export function getVerifiedClaimsForSubject(
  snapshot: CivicPublicSnapshot,
  subjectType: string,
  subjectId: string,
): CivicPublicRow[] {
  assertPublicRead("claims");
  const rows = (snapshot.claims ?? []).filter(
    (row) =>
      asString(read(row, "subject_type", "subjectType")) === subjectType &&
      asString(read(row, "subject_id", "subjectId")) === subjectId,
  );
  return verifiedClaimsOnly(rows).map((row) => filterPublicFields("claims", row));
}

export function getEvidenceForClaim(snapshot: CivicPublicSnapshot, claimId: string): CivicPublicRow[] {
  assertPublicRead("evidence_objects");
  const claim = (snapshot.claims ?? []).find((row) => asString(read(row, "claim_id", "claimId")) === claimId);
  if (!claim || claimState(claim) !== "verified") return [];
  const evidenceIds = new Set(
    (snapshot.claimEvidence ?? [])
      .filter((row) => asString(read(row, "claim_id", "claimId")) === claimId)
      .map((row) => asString(read(row, "evidence_id", "evidenceId")))
      .filter((id): id is string => Boolean(id)),
  );
  return (snapshot.evidence ?? [])
    .filter((row) => evidenceIds.has(asString(read(row, "evidence_id", "evidenceId")) ?? ""))
    .map((row) => filterPublicFields("evidence_objects", row));
}

export function getCompletenessForSubject(
  snapshot: CivicPublicSnapshot,
  subject: { seatId?: string; personId?: string; electionId?: string },
): CompletenessReport {
  const claims = (snapshot.claims ?? []).filter((row) => {
    const subjectId = asString(read(row, "subject_id", "subjectId"));
    return subjectId === subject.seatId || subjectId === subject.personId || subjectId === subject.electionId;
  });
  const required = (snapshot.researchContractFields ?? []).filter((row) =>
    Boolean(read(row, "required_for_baseline", "requiredForBaseline")),
  );
  const present = required.filter((field) => {
    const key = asString(read(field, "field_key", "fieldKey"));
    return claims.some((claim) => asString(read(claim, "field_key", "fieldKey")) === key && presenceForClaim(claim) === "PRESENT");
  }).length;
  const occupancy = (snapshot.occupancies ?? []).some((row) => {
    const status = asString(read(row, "occupancy_status", "occupancyStatus"));
    return asString(read(row, "seat_id", "seatId")) === subject.seatId && (status === "current" || status === "acting");
  });
  const monitoring = (snapshot.monitoringProjections ?? []).some(
    (row) => row.subjectId === subject.seatId || row.subjectId === subject.personId,
  );
  const hasElection = (snapshot.elections ?? []).some((row) => asString(read(row, "seat_id", "seatId")) === subject.seatId);
  const hasCandidates = (snapshot.campaigns ?? []).some((row) => asString(read(row, "seat_id", "seatId")) === subject.seatId);
  const staleClaims = claims.filter((claim) => claimState(claim) === "stale").length;
  return {
    seatDiscovery: subject.seatId && getSeat(snapshot, subject.seatId) ? "PRESENT" : "MISSING",
    officeholderBaseline: occupancy ? "PRESENT" : "MISSING",
    requiredFieldPresence: present,
    requiredFieldTotal: required.length,
    evidenceVerification: claims.filter((claim) => claimState(claim) === "verified").length,
    evidenceTotal: required.length,
    freshness: staleClaims > 0 ? "UNKNOWN" : claims.length > 0 ? "PRESENT" : "MISSING",
    monitoringCoverage: monitoring ? "PRESENT" : "MISSING",
    candidateCoverage: hasCandidates ? "PRESENT" : "MISSING",
    electionCoverage: hasElection ? "PRESENT" : "MISSING",
    unresolvedContradictions: claims.filter((claim) => claimState(claim) === "conflict").length,
  };
}

export function getMonitoringSummary(
  snapshot: CivicPublicSnapshot,
  subjectType: string,
  subjectId: string,
): { coverage: "PRESENT" | "MISSING"; overdue: boolean; source: "projection" } {
  const projection = (snapshot.monitoringProjections ?? []).find(
    (row) => row.subjectType === subjectType && row.subjectId === subjectId,
  );
  return {
    coverage: projection?.coverage ?? "MISSING",
    overdue: projection?.overdue ?? false,
    source: "projection",
  };
}
