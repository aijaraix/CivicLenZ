import { capabilityState, type Capability, type CapabilityState } from "./capabilities.ts";

export const DATASET_TYPES = [
  "campaign_finance",
  "elections",
  "executive_orders",
  "disclosures",
  "votes",
] as const;
export type DatasetType = (typeof DATASET_TYPES)[number];

export const DATASET_COMPLETION_STATES = [
  "not_collected",
  "incomplete",
  "coverage_complete_for_defined_scope",
  "checked_no_authoritative_result",
] as const;
export type DatasetCompletionState = (typeof DATASET_COMPLETION_STATES)[number];

export const EVERYTHING_ON_THE_INTERNET_COMPLETE = "everything_on_the_internet_complete" as const;

export type DatasetReconciliation = {
  datasetType: DatasetType;
  subjectType: string;
  subjectId: string;
  seatId?: string;
  expectedUnits: number | null;
  collectedUnits: number;
  missingUnits: string[];
  cutoff?: string;
  completionState: DatasetCompletionState;
  capability: Capability;
  capabilityState: CapabilityState;
  reason: string;
};

const DATASET_CAPABILITY: Record<DatasetType, Capability> = {
  campaign_finance: "campaign_finance",
  elections: "election_results_check",
  executive_orders: "executive_action",
  disclosures: "financial_disclosure",
  votes: "legislative_activity",
};

/** Fail-closed stub. Never reports finance (or any unimplemented dataset) complete. */
export function reconcileDataset(input: {
  datasetType: DatasetType;
  subjectType: string;
  subjectId: string;
  seatId?: string;
  expectedUnits?: number | null;
  collectedUnits?: number;
  missingUnits?: string[];
  cutoff?: string;
}): DatasetReconciliation {
  const capability = DATASET_CAPABILITY[input.datasetType];
  const state = capabilityState(capability);
  const collectedUnits = input.collectedUnits ?? 0;
  const expectedUnits = input.expectedUnits ?? null;
  const missingUnits = input.missingUnits ?? (expectedUnits != null ? [`expected:${expectedUnits}`] : []);
  if (state === "NOT_IMPLEMENTED") {
    return {
      datasetType: input.datasetType,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      seatId: input.seatId,
      expectedUnits,
      collectedUnits,
      missingUnits,
      cutoff: input.cutoff,
      completionState: "checked_no_authoritative_result",
      capability,
      capabilityState: state,
      reason: `capability ${capability} is NOT_IMPLEMENTED; fail closed`,
    };
  }
  if (collectedUnits === 0) {
    return {
      datasetType: input.datasetType,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      seatId: input.seatId,
      expectedUnits,
      collectedUnits,
      missingUnits,
      cutoff: input.cutoff,
      completionState: "not_collected",
      capability,
      capabilityState: state,
      reason: "no units collected",
    };
  }
  const definedScopeMet =
    expectedUnits != null && expectedUnits > 0 && collectedUnits >= expectedUnits && missingUnits.length === 0;
  return {
    datasetType: input.datasetType,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    seatId: input.seatId,
    expectedUnits,
    collectedUnits,
    missingUnits,
    cutoff: input.cutoff,
    completionState: definedScopeMet ? "coverage_complete_for_defined_scope" : "incomplete",
    capability,
    capabilityState: state,
    reason: definedScopeMet ? "coverage_complete_for_defined_scope" : "enumerable dataset incomplete",
  };
}

export function financeMustNotBeComplete(row: DatasetReconciliation): boolean {
  return row.datasetType !== "campaign_finance" || row.completionState !== "coverage_complete_for_defined_scope";
}

export function isEverythingOnTheInternetComplete(_row: DatasetReconciliation): false {
  return false;
}
