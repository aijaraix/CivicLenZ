export const COVERAGE_STATES = [
  "UNRESOLVED",
  "SOURCE_BLOCKED",
  "CAPABILITY_BLOCKED",
  "IN_PROGRESS",
  "REOPENED",
  "RECONCILED_THROUGH",
  "SEARCH_SATURATED_AS_OF",
  "CURRENT_TO_CONTRACT_DEPTH",
  "NOT_APPLICABLE",
] as const;
export type CoverageState = (typeof COVERAGE_STATES)[number];

export const COVERAGE_DATASET_KINDS = ["FINITE", "OPEN_ENDED"] as const;
export type CoverageDatasetKind = (typeof COVERAGE_DATASET_KINDS)[number];

export type CoverageAuditInput = {
  datasetKind: CoverageDatasetKind;
  expectedUnits?: number | null;
  accountedUnits?: number;
  missingUnits?: number;
  cutoffAt?: string;
  requiredSourceFamilies?: readonly string[];
  attemptedSourceFamilies?: readonly string[];
  successfulSourceFamilies?: readonly string[];
  discoveryPasses?: number;
  unresolvedLeads?: number;
  independentAuditPassed?: boolean;
  sourceBlocked?: boolean;
  capabilityBlocked?: boolean;
  reopened?: boolean;
};

export type CoverageAuditResult = {
  state: CoverageState;
  datasetKind: CoverageDatasetKind;
  expectedUnits: number | null;
  accountedUnits: number;
  missingUnits: number | null;
  requiredSourceFamilies: readonly string[];
  attemptedSourceFamilies: readonly string[];
  successfulSourceFamilies: readonly string[];
  discoveryPasses: number;
  unresolvedLeads: number;
  cutoffAt?: string;
  independentAuditPassed: boolean;
  coverageAuditRequired: true;
  publicationEligible: false;
  reason: string;
};

function unique(values: readonly string[] | undefined): string[] {
  return [...new Set((values ?? []).filter((value) => value.trim().length > 0))].sort();
}

function finiteResult(input: CoverageAuditInput, base: Omit<CoverageAuditResult, "state" | "reason">): CoverageAuditResult {
  if (input.expectedUnits == null) {
    return { ...base, state: "IN_PROGRESS", reason: "FINITE_SCOPE_REQUIRES_EXPECTED_UNITS" };
  }
  if (base.accountedUnits + (base.missingUnits ?? 0) > input.expectedUnits) {
    return { ...base, state: "REOPENED", reason: "ACCOUNTED_PLUS_MISSING_EXCEEDS_EXPECTED_UNITS" };
  }
  if (!base.cutoffAt || !base.independentAuditPassed) {
    return { ...base, state: "IN_PROGRESS", reason: "FINITE_SCOPE_REQUIRES_CUTOFF_AND_INDEPENDENT_AUDIT" };
  }
  if (base.accountedUnits !== input.expectedUnits || base.missingUnits !== 0) {
    return { ...base, state: "IN_PROGRESS", reason: "FINITE_SCOPE_HAS_UNACCOUNTED_UNITS" };
  }
  return { ...base, state: "RECONCILED_THROUGH", reason: "FINITE_SCOPE_RECONCILED_TO_EXPLICIT_CUTOFF" };
}

function openEndedResult(input: CoverageAuditInput, base: Omit<CoverageAuditResult, "state" | "reason">): CoverageAuditResult {
  const multipleSourceFamilies = base.successfulSourceFamilies.length >= 2;
  const multiplePasses = base.discoveryPasses >= 2;
  if (!multipleSourceFamilies || !multiplePasses) {
    return { ...base, state: "IN_PROGRESS", reason: "OPEN_SCOPE_REQUIRES_MULTIPLE_SOURCE_FAMILIES_AND_PASSES" };
  }
  if (base.unresolvedLeads > 0) {
    return { ...base, state: "IN_PROGRESS", reason: "OPEN_SCOPE_HAS_UNRESOLVED_LEADS" };
  }
  if (!base.cutoffAt || !base.independentAuditPassed) {
    return { ...base, state: "IN_PROGRESS", reason: "OPEN_SCOPE_REQUIRES_AUDIT_AND_AS_OF_BOUNDARY" };
  }
  return {
    ...base,
    state: "SEARCH_SATURATED_AS_OF",
    reason: "OPEN_SCOPE_SATURATED_ONLY_FOR_DECLARED_AS_OF_BOUNDARY",
  };
}

export function evaluateCoverage(input: CoverageAuditInput): CoverageAuditResult {
  const requiredSourceFamilies = unique(input.requiredSourceFamilies);
  const attemptedSourceFamilies = unique(input.attemptedSourceFamilies);
  const successfulSourceFamilies = unique(input.successfulSourceFamilies);
  const accountedUnits = Math.max(0, input.accountedUnits ?? 0);
  const missingUnits =
    input.datasetKind === "FINITE"
      ? Math.max(0, input.missingUnits ?? (input.expectedUnits == null ? 0 : input.expectedUnits - accountedUnits))
      : null;
  const base = {
    datasetKind: input.datasetKind,
    expectedUnits: input.expectedUnits ?? null,
    accountedUnits,
    missingUnits,
    requiredSourceFamilies,
    attemptedSourceFamilies,
    successfulSourceFamilies,
    discoveryPasses: Math.max(0, input.discoveryPasses ?? 0),
    unresolvedLeads: Math.max(0, input.unresolvedLeads ?? 0),
    cutoffAt: input.cutoffAt,
    independentAuditPassed: input.independentAuditPassed === true,
    coverageAuditRequired: true as const,
    publicationEligible: false as const,
  };
  if (input.reopened) return { ...base, state: "REOPENED", reason: "MATERIAL_MISS_REOPENED_SCOPE" };
  if (input.capabilityBlocked) return { ...base, state: "CAPABILITY_BLOCKED", reason: "REQUIRED_CAPABILITY_BLOCKED" };
  if (input.sourceBlocked) return { ...base, state: "SOURCE_BLOCKED", reason: "REQUIRED_SOURCE_FAMILY_BLOCKED" };
  if (input.datasetKind === "FINITE") return finiteResult(input, base);
  return openEndedResult(input, base);
}
