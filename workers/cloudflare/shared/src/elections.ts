import type { CivicStore } from "./store.ts";
import type { CandidateCampaignRecord, ElectionRecord, OccupancyRecord, PersonRecord } from "./types.ts";

export async function upsertElectionDate(store: CivicStore, input: {
  seatId: string;
  electionKey: string;
  electionType?: string;
  electionDate?: string;
  filingDeadline?: string;
  qualifyingDeadline?: string;
  status?: string;
  sourceUrl?: string;
}): Promise<{ election: ElectionRecord; dateChanged: boolean }> {
  const existing = (await store.listElections()).find((item) => item.electionKey === input.electionKey);
  const election = await store.upsertElection(input);
  return { election, dateChanged: Boolean(existing && existing.electionDate !== input.electionDate) };
}

export async function recordCandidate(store: CivicStore, input: {
  person: Omit<PersonRecord, "personId"> & { personId?: string; seatId?: string; jurisdictionId?: string };
  seatId: string;
  electionId: string;
  party?: string;
  candidateStatus?: string;
  filingDate?: string;
}): Promise<{ person: PersonRecord; campaign: CandidateCampaignRecord }> {
  const person = await store.upsertPerson({ ...input.person, seatId: input.seatId });
  const campaign = await store.upsertCandidateCampaign({
    personId: person.personId,
    seatId: input.seatId,
    electionId: input.electionId,
    party: input.party,
    candidateStatus: input.candidateStatus ?? "filed",
    filingDate: input.filingDate,
  });
  return { person, campaign };
}

export async function withdrawCandidate(
  store: CivicStore,
  campaign: CandidateCampaignRecord,
  withdrawalDate: string,
): Promise<CandidateCampaignRecord> {
  return store.upsertCandidateCampaign({
    ...campaign,
    candidateStatus: "withdrawn",
    withdrawalDate,
  });
}

export async function applyWinnerOccupancy(store: CivicStore, input: {
  seatId: string;
  winnerPersonId: string;
  electionId: string;
  startDate: string;
}): Promise<OccupancyRecord> {
  return store.upsertOccupancy({
    seatId: input.seatId,
    personId: input.winnerPersonId,
    electionId: input.electionId,
    startDate: input.startDate,
    occupancyStatus: "current",
    electedOrAppointed: "elected",
    evidenceState: "unreviewed",
  });
}
