import { valueHash } from "./hash.ts";
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

const OPEN_BASELINE_FIELDS = new Set(["contact", "biography", "election_history", "evidence"]);

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
    jurisdictionType: input.governmentLevel === "state" ? "state" : input.governmentLevel,
    stateCode: "FL",
  });
  const seat = await store.upsertSeat({
    seatKey: input.seatKey,
    jurisdictionId: jurisdiction.jurisdictionId,
    seatName: input.seatName,
    officeType: input.officeType,
    governmentLevel: input.governmentLevel,
    branch: "executive",
    occupancyStatus: "unknown",
    researchContractKey: `${input.officeType}-baseline`,
    baselineStatus: "unknown",
    monitoringActive: true,
  });
  const person = await store.upsertPerson({
    canonicalName: input.personDisplayName,
    seatId: seat.seatId,
    jurisdictionId: jurisdiction.jurisdictionId,
  });
  const occupancy = await store.upsertOccupancy({
    seatId: seat.seatId,
    personId: person.personId,
    occupancyStatus: "unknown",
    evidenceState: "unreviewed",
  });
  const occupancyClaim = await store.recordClaim({
    subjectType: "seat",
    subjectId: seat.seatId,
    seatId: seat.seatId,
    fieldKey: "current_occupant",
    normalizedValue: input.personDisplayName,
    displayValue: input.personDisplayName,
    valueHash: await valueHash("current_occupant", input.personDisplayName),
    verificationState: "collected_unreviewed",
  });
  const portraitDecision = input.portraitUrl
    ? portraitSourceDecision(input.portraitUrl)
    : { allowedForVerified: false, reason: "portrait_missing" };
  const portraitClaim = await store.recordClaim({
    subjectType: "person",
    subjectId: person.personId,
    seatId: seat.seatId,
    fieldKey: "portrait",
    normalizedValue: input.portraitUrl ?? "",
    displayValue: input.portraitUrl,
    valueHash: await valueHash("portrait", input.portraitUrl ?? ""),
    verificationState: "collected_unreviewed",
  });
  const contract = await store.upsertResearchContract({
    contractKey: `${input.officeType}-baseline`,
    name: `${input.officeType} baseline research`,
    officeClass: input.officeType,
    version: 1,
    active: true,
    description: `${input.seatName} baseline research contract`,
  });
  const fields = [];
  for (const [index, fieldKey] of BASELINE_RESEARCH_FIELDS.entries()) {
    fields.push(
      await store.upsertResearchContractField({
        researchContractId: contract.researchContractId,
        fieldKey,
        category: OPEN_BASELINE_FIELDS.has(fieldKey) ? "open" : "core",
        requiredForBaseline: true,
        verificationRequirement: fieldKey === "evidence" || fieldKey === "portrait" ? "official_source" : "review",
        sortOrder: index,
      }),
    );
  }
  const monitoring = await store.upsertMonitoringState({
    targetType: "seat",
    targetId: seat.seatId,
    seatId: seat.seatId,
    active: true,
    monitoringClass: "daily",
    configuration: { seatKey: seat.seatKey },
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
