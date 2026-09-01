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
  claims: ["claim_id", "subject_type", "subject_id", "field_key", "display_value", "verification_state"],
  evidence_objects: ["evidence_id", "evidence_type", "source_url", "excerpt", "verification_state"],
} as const;

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
    if (allow.has(key)) (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

export function verifiedClaimsOnly<T extends { verification_state?: string; verificationState?: string }>(rows: T[]): T[] {
  return rows.filter((row) => (row.verification_state ?? row.verificationState) === "verified");
}
