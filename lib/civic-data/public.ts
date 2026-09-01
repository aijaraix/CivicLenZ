export const PUBLIC_TABLES = [
  "jurisdictions",
  "seats",
  "persons",
  "seat_occupancies",
  "elections",
  "candidate_campaigns",
  "claims",
  "evidence_objects",
  "research_contracts",
  "research_contract_fields",
] as const;

export const INTERNAL_TABLES = [
  "jobs",
  "worker_runs",
  "raw_retrievals",
  "validation_runs",
  "contradictions",
  "monitoring_state",
  "sources",
  "jurisdiction_boundaries",
] as const;

export type PublicCivicQuery =
  | "getSeat"
  | "getOfficialForSeat"
  | "getPerson"
  | "getElection"
  | "getCandidatesForElection"
  | "getVerifiedClaimsForSubject"
  | "getCompletenessForSubject"
  | "getEvidenceForClaim"
  | "getMonitoringSummary";

export const PUBLIC_FIELD_ALLOWLIST = {
  seats: ["seat_id", "seat_key", "seat_name", "office_type", "government_level", "jurisdiction_id", "occupancy_status"],
  persons: ["person_id", "canonical_name", "portrait_url", "portrait_source_url", "portrait_credit", "portrait_status"],
  seat_occupancies: ["occupancy_id", "seat_id", "person_id", "start_date", "end_date", "occupancy_status"],
  claims: ["claim_id", "subject_type", "subject_id", "field_key", "display_value", "verification_state"],
  evidence_objects: ["evidence_id", "evidence_type", "source_url", "excerpt", "verification_state"],
} as const;

const CAMEL_TO_SNAKE: Record<string, string> = {
  seatId: "seat_id",
  seatKey: "seat_key",
  seatName: "seat_name",
  officeType: "office_type",
  governmentLevel: "government_level",
  jurisdictionId: "jurisdiction_id",
  occupancyStatus: "occupancy_status",
  occupancyId: "occupancy_id",
  personId: "person_id",
  startDate: "start_date",
  endDate: "end_date",
  canonicalName: "canonical_name",
  portraitUrl: "portrait_url",
  portraitSourceUrl: "portrait_source_url",
  portraitCredit: "portrait_credit",
  portraitStatus: "portrait_status",
  claimId: "claim_id",
  subjectType: "subject_type",
  subjectId: "subject_id",
  fieldKey: "field_key",
  displayValue: "display_value",
  verificationState: "verification_state",
  evidenceId: "evidence_id",
  evidenceType: "evidence_type",
  sourceUrl: "source_url",
};

export function isPublicTable(table: string): boolean {
  return (PUBLIC_TABLES as readonly string[]).includes(table);
}

export function isInternalTable(table: string): boolean {
  return (INTERNAL_TABLES as readonly string[]).includes(table);
}

export function assertPublicRead(table: string): void {
  if (isInternalTable(table)) {
    throw new Error(`public civic adapter cannot read internal table ${table}`);
  }
  if (!isPublicTable(table)) {
    throw new Error(`public civic adapter has no allowlist for ${table}`);
  }
}

export function filterPublicFields<T extends Record<string, unknown>>(
  table: keyof typeof PUBLIC_FIELD_ALLOWLIST,
  row: T,
): Partial<T> {
  const allow = new Set(PUBLIC_FIELD_ALLOWLIST[table] as readonly string[]);
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(row)) {
    const mapped = CAMEL_TO_SNAKE[key] ?? key;
    if (allow.has(mapped)) (out as Record<string, unknown>)[mapped] = value;
  }
  return out;
}

export function verifiedClaimsOnly<T extends { verification_state?: string; verificationState?: string }>(rows: T[]): T[] {
  return rows.filter((row) => (row.verification_state ?? row.verificationState) === "verified");
}
