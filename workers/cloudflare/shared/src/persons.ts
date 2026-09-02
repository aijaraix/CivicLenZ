import { normalizePersonName, uuidFromName } from "./ids.ts";
import type { OccupancyRecord, PersonRecord, SeatRecord } from "./types.ts";

export const PERSON_IDENTITY_PRIORITY = [
  "person_id",
  "official_source_id",
  "source_person_id",
  "fec",
  "fec_id",
  "bioguide",
  "state_id",
  "state_candidate_id",
  "legislative_id",
  "election_filing_id",
  "ocd_person",
  "wikidata",
  "ballotpedia",
] as const;

export const PERSON_IDENTITY_KEYS = PERSON_IDENTITY_PRIORITY.filter((key) => key !== "person_id");

export type IdentityResolution =
  | { status: "matched"; method: string; person: PersonRecord }
  | { status: "unmatched"; method: "none"; queue: "manual" }
  | { status: "conflict"; method: string; queue: "conflict"; candidates: PersonRecord[] };

export function resolveIdentity(input: {
  people: PersonRecord[];
  occupancies: OccupancyRecord[];
  seats: SeatRecord[];
  candidate: UpsertPersonInput;
}): IdentityResolution {
  const resolved = resolveExistingPerson(input);
  if (resolved) {
    const method = input.candidate.personId
      ? "person_id"
      : identityEntries(input.candidate.externalIdentifiers).length
        ? "external_identifier"
        : input.candidate.seatId
          ? "normalized_name_seat"
          : "normalized_name_jurisdiction";
    return { status: "matched", method, person: resolved };
  }
  const needle = normalizePersonName(input.candidate.canonicalName);
  const namesakes = input.people.filter((person) => normalizePersonName(person.canonicalName) === needle);
  if (namesakes.length > 1 && !input.candidate.seatId && !input.candidate.jurisdictionId) {
    return { status: "conflict", method: "name_only", queue: "conflict", candidates: namesakes };
  }
  return { status: "unmatched", method: "none", queue: "manual" };
}

export type UpsertPersonInput = Omit<PersonRecord, "personId"> & {
  personId?: string;
  seatId?: string;
  jurisdictionId?: string;
};

export function identityEntries(ids: Record<string, unknown> | undefined): Array<[string, string]> {
  if (!ids) return [];
  const out: Array<[string, string]> = [];
  for (const key of PERSON_IDENTITY_KEYS) {
    const value = ids[key];
    if (typeof value === "string" && value.trim()) out.push([key, value.trim()]);
  }
  return out;
}

export async function personIdFromExternalIdentifiers(
  ids: Record<string, unknown> | undefined,
): Promise<string | undefined> {
  const [first] = identityEntries(ids);
  if (!first) return undefined;
  return uuidFromName(`person:ext:${first[0]}:${first[1].toLowerCase()}`);
}

export function personsShareExternalIdentifier(left?: Record<string, unknown>, right?: Record<string, unknown>): boolean {
  const rightEntries = identityEntries(right);
  if (rightEntries.length === 0) return false;
  const leftMap = new Map(identityEntries(left));
  return rightEntries.some(([key, value]) => leftMap.get(key)?.toLowerCase() === value.toLowerCase());
}

export function mergeExternalIdentifiers(
  existing?: Record<string, unknown>,
  incoming?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!existing && !incoming) return undefined;
  return { ...existing, ...incoming };
}

export function resolveExistingPerson(input: {
  people: PersonRecord[];
  occupancies: OccupancyRecord[];
  seats: SeatRecord[];
  candidate: UpsertPersonInput;
}): PersonRecord | undefined {
  if (input.candidate.personId) {
    return input.people.find((person) => person.personId === input.candidate.personId);
  }

  const byExternal = input.people.find((person) =>
    personsShareExternalIdentifier(person.externalIdentifiers, input.candidate.externalIdentifiers),
  );
  if (byExternal) return byExternal;

  const needle = normalizePersonName(input.candidate.canonicalName);
  if (!needle) return undefined;

  if (input.candidate.seatId) {
    const occupantIds = new Set(
      input.occupancies.filter((row) => row.seatId === input.candidate.seatId).map((row) => row.personId),
    );
    const seated = input.people.filter(
      (person) => occupantIds.has(person.personId) && normalizePersonName(person.canonicalName) === needle,
    );
    if (seated.length === 1) return seated[0];
  }

  if (input.candidate.jurisdictionId) {
    const seatIds = new Set(
      input.seats.filter((seat) => seat.jurisdictionId === input.candidate.jurisdictionId).map((seat) => seat.seatId),
    );
    const occupantIds = new Set(
      input.occupancies.filter((row) => seatIds.has(row.seatId)).map((row) => row.personId),
    );
    const local = input.people.filter(
      (person) => occupantIds.has(person.personId) && normalizePersonName(person.canonicalName) === needle,
    );
    if (local.length === 1) return local[0];
  }

  return undefined;
}
