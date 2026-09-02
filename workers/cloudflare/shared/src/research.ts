import { auditCompleteness, type CompletenessAudit, type FieldDimensionResult } from "./completeness.ts";
import { valueHash } from "./hash.ts";
import { jobPriorityForResearchPriority, officeClassForOfficeType, type OfficeClassContract } from "./office-classes.ts";
import { persistOfficeClassContract } from "./research-contracts.ts";
import { portraitSourceDecision } from "./portraits.ts";
import { queueForCapability } from "./capabilities.ts";
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

export function workDedupeKey(purpose: string, seatKey: string, fieldKey: string): string {
  return `work:${purpose}:${seatKey}:${fieldKey}`;
}

export function planWorkFromAudit(audit: CompletenessAudit): FieldDimensionResult[] {
  if (audit.completeAndFresh) return [];
  return audit.fields.filter((field) => field.action !== "none");
}

export async function queueMissingProfileWork(
  store: CivicStore,
  input: { seat: SeatRecord; person: PersonRecord; officialWebsite?: string },
): Promise<{ missingFields: string[]; queued: boolean; skippedComplete: boolean; audit: CompletenessAudit }> {
  const persisted = await persistOfficeClassContract(store, officeClassForOfficeType(input.seat.officeType));
  await store.upsertSeat({
    ...input.seat,
    researchContractKey: persisted.contract.contractKey,
  });
  const [audit] = await auditCompleteness(store, { seatId: input.seat.seatId, personId: input.person.personId });
  const current =
    audit ??
    ({
      completeAndFresh: false,
      fields: [],
      knownGaps: [],
      monitoringEligible: false,
      baselineIdentityComplete: false,
      researchContractKey: persisted.contract.contractKey,
      officeClass: persisted.contract.officeClass,
    } as CompletenessAudit);
  if (current.completeAndFresh) {
    if (current.monitoringEligible) {
      await activateSeatMonitoring(store, input.seat, persisted.contract);
    }
    return { missingFields: [], queued: false, skippedComplete: true, audit: current };
  }
  const work = planWorkFromAudit(current);
  const missingFields: string[] = [];
  let queued = false;
  const claims = await store.listClaims();
  for (const item of work) {
    missingFields.push(item.fieldKey);
    const spec = persisted.contract.fields.find((field) => field.fieldKey === item.fieldKey);
    if (item.action === "close_not_implemented") {
      const existing = claims.find(
        (claim) =>
          claim.subjectType === "person" &&
          claim.subjectId === input.person.personId &&
          claim.fieldKey === item.fieldKey,
      );
      if (!existing) {
        await store.recordClaim({
          subjectType: "person",
          subjectId: input.person.personId,
          seatId: input.seat.seatId,
          fieldKey: item.fieldKey,
          normalizedValue: "",
          displayValue: `${item.fieldKey} checked_no_authoritative_result (NOT_IMPLEMENTED)`,
          valueHash: await valueHash(item.fieldKey, `checked_no_authoritative_result:NOT_IMPLEMENTED`),
          verificationState: "checked_no_authoritative_result",
        });
      }
      continue;
    }
    const purpose =
      item.action === "refresh"
        ? "refresh"
        : item.action === "contradiction"
          ? "contradiction_check"
          : item.action === "verify"
            ? "verification"
            : item.action === "dataset_unit"
              ? "dataset_unit"
              : "collect";
    const capability = spec?.capability ?? "completeness_audit";
    const scheduled = await store.scheduleJob({
      dedupeKey: workDedupeKey(purpose, input.seat.seatKey, item.fieldKey),
      route: queueForCapability(capability),
      entityType: "seat",
      entityId: input.seat.seatId,
      seatId: input.seat.seatId,
      priority: spec ? jobPriorityForResearchPriority(spec.priority) : 100,
      payload: {
        purpose,
        fieldKey: item.fieldKey,
        capability,
        seatKey: input.seat.seatKey,
        officialWebsite: input.officialWebsite,
      },
    });
    if (scheduled.created) queued = true;
  }
  if (current.monitoringEligible) {
    await activateSeatMonitoring(store, input.seat, persisted.contract);
  }
  return { missingFields, queued, skippedComplete: false, audit: current };
}

async function activateSeatMonitoring(store: CivicStore, seat: SeatRecord, contract: OfficeClassContract) {
  await store.upsertSeat({
    ...seat,
    researchContractKey: contract.contractKey,
    monitoringActive: true,
  });
  await store.upsertMonitoringState({
    targetType: "seat",
    targetId: seat.seatId,
    seatId: seat.seatId,
    active: true,
    monitoringClass: "daily",
    configuration: { seatKey: seat.seatKey, researchContractKey: contract.contractKey },
  });
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
  const officeClass = officeClassForOfficeType(input.officeType);
  const persisted = await persistOfficeClassContract(store, officeClass);
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
    researchContractKey: persisted.contract.contractKey,
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
  const fields = persisted.fields.length
    ? persisted.fields
    : await Promise.all(
        BASELINE_RESEARCH_FIELDS.map((fieldKey, index) =>
          store.upsertResearchContractField({
            researchContractId: persisted.contract.researchContractId,
            fieldKey,
            category: OPEN_BASELINE_FIELDS.has(fieldKey) ? "open" : "core",
            requiredForBaseline: true,
            verificationRequirement: fieldKey === "evidence" || fieldKey === "portrait" ? "official_source" : "review",
            sortOrder: index,
          }),
        ),
      );
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
    contract: persisted.contract,
    fields,
    monitoring,
  };
}
