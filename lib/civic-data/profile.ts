import {
  getOfficialForSeat,
  getPublicationEligibleClaimsForSubject,
  type CivicPublicSnapshot,
  type CivicPublicRow,
} from "./public";

export const COMPLETENESS_DIMENSION_LABELS = [
  "FIELD",
  "SOURCE",
  "TEMPORAL",
  "EVIDENCE",
  "VERIFICATION",
  "FRESHNESS",
  "DATASET RECONCILIATION",
  "MONITORING",
  "UNRESOLVED CONTRADICTIONS",
] as const;

export type ProfileClaimView = {
  fieldKey: string;
  displayValue: string;
  verificationState: string;
};

export type CanonicalProfileView = {
  seatName: string;
  occupantName: string | null;
  occupancyStatus: string;
  officeType: string;
  publicationEligibleClaims: ProfileClaimView[];
  unpublishedCount: number;
  completenessNote: string;
};

function asString(row: CivicPublicRow | null | undefined, ...keys: string[]): string | undefined {
  if (!row) return undefined;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

export function buildCanonicalProfileView(snapshot: CivicPublicSnapshot, seatIdOrKey: string): CanonicalProfileView {
  const official = getOfficialForSeat(snapshot, seatIdOrKey);
  const seatName = asString(official.seat, "seat_name") ?? "Unknown seat";
  const occupantName = asString(official.person, "canonical_name") ?? null;
  const personClaims = official.person
    ? getPublicationEligibleClaimsForSubject(snapshot, "person", asString(official.person, "person_id") ?? "")
    : [];
  const seatClaims = official.seat
    ? getPublicationEligibleClaimsForSubject(snapshot, "seat", asString(official.seat, "seat_id") ?? "")
    : [];
  const all = [...seatClaims, ...personClaims];
  return {
    seatName,
    occupantName,
    occupancyStatus: asString(official.seat, "occupancy_status") ?? "unknown",
    officeType: asString(official.seat, "office_type") ?? "unknown",
    publicationEligibleClaims: all.map((row) => ({
      fieldKey: asString(row, "field_key") ?? "",
      displayValue: asString(row, "display_value") ?? "",
      verificationState: asString(row, "verification_state") ?? "",
    })),
    unpublishedCount: (snapshot.claims ?? []).length - all.length,
    completenessNote:
      "Only publication-eligible claims appear. Completeness is dimensional, not a single percentage. HTTP 200 is not VERIFIED.",
  };
}
