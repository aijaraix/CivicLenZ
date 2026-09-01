import { normalizePersonName, uuidFromName } from "./ids.ts";
import type { OccupancyRecord, PersonRecord, SeatRecord } from "./types.ts";

export const PERSON_IDENTITY_KEYS = [
  "bioguide",
  "fec",
  "fec_id",
  "state_id",
  "source_person_id",
  "wikidata",
  "ocd_person",
  "ballotpedia",
] as const;

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
