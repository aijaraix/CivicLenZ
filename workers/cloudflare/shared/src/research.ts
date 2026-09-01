import { normalizePersonName, slugify } from "./ids.ts";
import { portraitSourceDecision } from "./portraits.ts";
import type { CivicStore } from "./store.ts";

export const BASELINE_RESEARCH_FIELDS = [
  "jurisdiction",
  "seat",
  "person",
  "occupancy",
  "claims",
  "evidence",
  "portrait",
  "monitoring",
  "contact",
  "biography",
  "election_history",
] as const;

export async function upsertBaselineResearchContract(
  store: CivicStore,
  input: {
    jurisdictionKey: string;
    jurisdictionName: string;
    seatKey: string;
    seatName: string;
    officeType: string;
    governmentLevel: string;
    personDisplayName: string;
    officialWebsite?: string;
    portraitUrl?: string;
  },
) {
  const jurisdiction = await store.upsertJurisdiction({
    jurisdictionKey: input.jurisdictionKey,
    name: input.jurisdictionName,
    kind: input.governmentLevel === "state" ? "state" : input.governmentLevel,
    stateCode: "FL",
  });
  const seat = await store.upsertSeat({
    seatKey: input.seatKey,
    jurisdictionId: jurisdiction.id,
    seatName: input.seatName,
    officeType: input.officeType,
    governmentLevel: input.governmentLevel,
    branch: "executive",
    occupancyStatus: "unknown",
    recordStatus: "extracted",
  });
  const person = await store.upsertPerson({
    personKey: `person:${slugify(input.personDisplayName)}`,
    displayName: input.personDisplayName,
    normalizedName: normalizePersonName(input.personDisplayName),
    recordStatus: "extracted",
  });
  const occupancy = await store.upsertOccupancy({
    seatId: seat.id,
    personId: person.id,
    currentStatus: "unknown",
    recordStatus: "extracted",
  });
  const occupancyClaim = await store.recordClaim({
    claimKey: `occupancy:${seat.seatKey}:${person.personKey}:baseline`,
    claimType: "occupancy",
    status: "COLLECTED_UNREVIEWED",
    jurisdictionId: jurisdiction.id,
    seatId: seat.id,
    personId: person.id,
    predicate: "occupied_by",
    objectValue: input.personDisplayName,
    metadata: { displayName: input.personDisplayName, officeTitle: input.seatName },
  });
  const portraitDecision = input.portraitUrl
    ? portraitSourceDecision(input.portraitUrl)
    : { allowedForVerified: false, reason: "portrait_missing" };
  const portraitClaim = await store.recordClaim({
    claimKey: `portrait:${person.personKey}:baseline`,
    claimType: "portrait",
    status: "COLLECTED_UNREVIEWED",
    personId: person.id,
    seatId: seat.id,
    metadata: { portraitUrl: input.portraitUrl, displayName: input.personDisplayName },
  });
  const contract = await store.upsertResearchContract({
    contractKey: `baseline:${input.seatKey}`,
    seatId: seat.id,
    personId: person.id,
    title: `${input.seatName} baseline research`,
    status: "open",
  });
  const fields = [];
  for (const fieldKey of BASELINE_RESEARCH_FIELDS) {
    let status = "open";
    let notes = "incomplete is correct until evidence exists";
    if (fieldKey === "jurisdiction") {
      status = "present_unverified";
      notes = jurisdiction.jurisdictionKey;
    } else if (fieldKey === "seat") {
      status = "present_unverified";
      notes = seat.seatKey;
    } else if (fieldKey === "person") {
      status = "present_unverified";
      notes = person.displayName;
    } else if (fieldKey === "occupancy") {
      status = "present_unverified";
      notes = occupancy.id;
    } else if (fieldKey === "claims") {
      status = "present_unverified";
      notes = occupancyClaim.status;
    } else if (fieldKey === "evidence") {
      status = "open";
      notes = "no evidence object attached in baseline seed";
    } else if (fieldKey === "portrait") {
      status = portraitDecision.allowedForVerified ? "present_unverified" : "open";
      notes = `${portraitDecision.reason}; claim=${portraitClaim.status}`;
    } else if (fieldKey === "monitoring") {
      status = "present_unverified";
      notes = "monitoring_state row upserted separately";
    }
    fields.push(
      await store.upsertResearchContractField({
        contractId: contract.id,
        fieldKey,
        status,
        notes,
      }),
    );
  }
  const monitoring = await store.upsertMonitoringState({
    entityType: "seat",
    entityKey: seat.seatKey,
    checkClass: "daily",
    active: true,
  });
  return {
    jurisdiction,
    seat,
    person,
    occupancy,
    occupancyClaim,
    portraitClaim,
    portraitDecision,
    contract,
    fields,
    monitoring,
  };
}
