import { normalizePersonName } from "./ids.ts";
import type { CandidateCampaignRecord, ElectionRecord, PersonRecord, SeatRecord } from "./types.ts";

export type SeatQuery = {
  jurisdictionId?: string;
  officeType?: string;
  seatName?: string;
  districtNumber?: string;
  governmentLevel?: string;
};

export type PersonQuery = {
  displayName?: string;
  normalizedName?: string;
  personKey?: string;
};

export type MatchResult<T> = {
  status: "matched" | "ambiguous" | "unmatched";
  record?: T;
  candidates: T[];
};

export function normalizeOfficeType(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function matchSeat(seats: SeatRecord[], query: SeatQuery): MatchResult<SeatRecord> {
  const filtered = seats.filter((seat) => {
    if (query.jurisdictionId && seat.jurisdictionId !== query.jurisdictionId) return false;
    if (query.governmentLevel && seat.governmentLevel !== query.governmentLevel) return false;
    if (query.districtNumber && (seat.districtNumber ?? "") !== query.districtNumber) return false;
    if (query.officeType && normalizeOfficeType(seat.officeType) !== normalizeOfficeType(query.officeType)) {
      return false;
    }
    if (query.seatName && normalizeOfficeType(seat.seatName) !== normalizeOfficeType(query.seatName)) {
      return false;
    }
    return Boolean(query.jurisdictionId || query.officeType || query.seatName);
  });
  if (filtered.length === 1) return { status: "matched", record: filtered[0], candidates: filtered };
  if (filtered.length > 1) return { status: "ambiguous", candidates: filtered };
  return { status: "unmatched", candidates: [] };
}

export function matchPerson(people: PersonRecord[], query: PersonQuery): MatchResult<PersonRecord> {
  if (query.personKey) {
    const exact = people.filter((person) => person.personKey === query.personKey);
    if (exact.length === 1) return { status: "matched", record: exact[0], candidates: exact };
    if (exact.length > 1) return { status: "ambiguous", candidates: exact };
  }
  const needle = query.normalizedName ?? (query.displayName ? normalizePersonName(query.displayName) : "");
  if (!needle) return { status: "unmatched", candidates: [] };
  const filtered = people.filter((person) => person.normalizedName === needle);
  if (filtered.length === 1) return { status: "matched", record: filtered[0], candidates: filtered };
  if (filtered.length > 1) return { status: "ambiguous", candidates: filtered };
  return { status: "unmatched", candidates: [] };
}

export function matchCandidateCampaign(
  campaigns: CandidateCampaignRecord[],
  query: { electionId: string; seatId: string; personId: string },
): MatchResult<CandidateCampaignRecord> {
  const filtered = campaigns.filter(
    (campaign) =>
      campaign.electionId === query.electionId &&
      campaign.seatId === query.seatId &&
      campaign.personId === query.personId,
  );
  if (filtered.length === 1) return { status: "matched", record: filtered[0], candidates: filtered };
  if (filtered.length > 1) return { status: "ambiguous", candidates: filtered };
  return { status: "unmatched", candidates: [] };
}

export function matchElection(
  elections: ElectionRecord[],
  query: { jurisdictionId: string; seatId?: string; electionDate?: string; electionKind?: string },
): MatchResult<ElectionRecord> {
  const filtered = elections.filter((election) => {
    if (election.jurisdictionId !== query.jurisdictionId) return false;
    if (query.seatId && election.seatId !== query.seatId) return false;
    if (query.electionDate && election.electionDate !== query.electionDate) return false;
    if (query.electionKind && election.electionKind !== query.electionKind) return false;
    return true;
  });
  if (filtered.length === 1) return { status: "matched", record: filtered[0], candidates: filtered };
  if (filtered.length > 1) return { status: "ambiguous", candidates: filtered };
  return { status: "unmatched", candidates: [] };
}

export function reusePersonForWinningCandidate(input: {
  existingOccupant?: PersonRecord;
  existingPerson?: PersonRecord;
}): PersonRecord | undefined {
  return input.existingOccupant ?? input.existingPerson;
}
