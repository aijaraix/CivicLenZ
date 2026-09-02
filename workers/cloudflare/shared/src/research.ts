import { valueHash } from "./hash.ts";
import { capabilityState, type Capability } from "./capabilities.ts";
import { portraitSourceDecision } from "./portraits.ts";
import type { CivicStore } from "./store.ts";
import type { PersonRecord, SeatRecord } from "./types.ts";

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

export const ENRICHMENT_RESEARCH_FIELDS = [
  "portrait",
  "identity",
  "date_of_birth",
  "birthplace",
  "education",
  "career",
  "political_history",
  "prior_offices",
  "family_public_relationships",
  "contact",
  "social",
  "campaign_finance",
  "financial_disclosure",
  "business_interests",
  "committees",
  "legislative_actions",
  "executive_actions",
  "promises_statements",
  "ethics_legal_public_records",
  "news_activity",
] as const;

const FIELD_CAPABILITY: Record<(typeof ENRICHMENT_RESEARCH_FIELDS)[number], Capability> = {
  portrait: "portrait_discovery",
  identity: "identity_resolution",
  date_of_birth: "biography_research",
  birthplace: "biography_research",
  education: "education_research",
  career: "career_research",
  political_history: "prior_office_research",
  prior_offices: "prior_office_research",
  family_public_relationships: "relationship_conflict",
  contact: "contact_discovery",
  social: "social_account_discovery",
  campaign_finance: "campaign_finance",
  financial_disclosure: "financial_disclosure",
  business_interests: "business_interest",
  committees: "committee_membership",
  legislative_actions: "legislative_activity",
  executive_actions: "executive_action",
  promises_statements: "promise_collection",
  ethics_legal_public_records: "ethics_integrity",
  news_activity: "statement_collection",
};

export async function queueMissingProfileWork(
  store: CivicStore,
  input: { seat: SeatRecord; person: PersonRecord; officialWebsite?: string },
): Promise<{ missingFields: string[]; queued: boolean }> {
  const contract = await store.upsertResearchContract({
    contractKey: `${input.seat.officeType}-baseline`,
    name: `${input.seat.officeType} baseline research`,
    officeClass: input.seat.officeType,
    version: 1,
    active: true,
    description: `${input.seat.seatName} enrichment after seat + occupant`,
  });
  const missingFields: string[] = [];
  for (const [index, fieldKey] of ENRICHMENT_RESEARCH_FIELDS.entries()) {
    await store.upsertResearchContractField({
      researchContractId: contract.researchContractId,
      fieldKey,
      category: "open",
      requiredForBaseline: fieldKey === "portrait" || fieldKey === "identity" || fieldKey === "contact",
      verificationRequirement: "official_source",
      sortOrder: 100 + index,
    });
    const capability = FIELD_CAPABILITY[fieldKey];
    const state = capabilityState(capability);
    missingFields.push(fieldKey);
    await store.recordClaim({
      subjectType: "person",
      subjectId: input.person.personId,
      seatId: input.seat.seatId,
      fieldKey,
      normalizedValue: "",
      displayValue: `${fieldKey} not collected (${state})`,
      valueHash: await valueHash(fieldKey, `not_collected:${state}`),
      verificationState: "not_collected",
    });
  }
  await store.scheduleJob({
    dedupeKey: `enrichment:${input.seat.seatKey}:baseline`,
    route: "validate",
    entityType: "seat",
    entityId: input.seat.seatId,
    seatId: input.seat.seatId,
    payload: {
      purpose: "completeness_audit_after_baseline",
      missingFields,
      capabilityStates: Object.fromEntries(
        ENRICHMENT_RESEARCH_FIELDS.map((fieldKey) => [fieldKey, capabilityState(FIELD_CAPABILITY[fieldKey])]),
      ),
      officialWebsite: input.officialWebsite,
    },
  });
  return { missingFields, queued: true };
}

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
