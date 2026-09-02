export const COHORT_KEYS = ["florida-governor-fixture", "florida-senate", "florida-house"] as const;
export type CohortKey = (typeof COHORT_KEYS)[number];

export type CohortDefinition = {
  key: CohortKey;
  sourceKey: string;
  officeClass: string;
  requires: CohortKey[];
  firstWaveActive: false;
  autoEnqueue: false;
};

export const FLORIDA_COHORTS: CohortDefinition[] = [
  {
    key: "florida-governor-fixture",
    sourceKey: "florida-governor-official",
    officeClass: "STATE_GOVERNOR",
    requires: [],
    firstWaveActive: false,
    autoEnqueue: false,
  },
  {
    key: "florida-senate",
    sourceKey: "florida-senate-members",
    officeClass: "STATE_SENATOR",
    requires: ["florida-governor-fixture"],
    firstWaveActive: false,
    autoEnqueue: false,
  },
  {
    key: "florida-house",
    sourceKey: "florida-house-members",
    officeClass: "STATE_REPRESENTATIVE",
    requires: ["florida-senate"],
    firstWaveActive: false,
    autoEnqueue: false,
  },
];

export type CohortSafetyMetrics = {
  schemaMismatch: boolean;
  parserFailureRate: number;
  duplicateSpike: boolean;
  contradictionSpike: boolean;
  sourceFailure: boolean;
  evidencePersistenceFailure: boolean;
  unexpectedZeroRecordParse: boolean;
  deadLetterCount: number;
};

export const COHORT_THRESHOLDS = {
  parserFailureRate: 0.15,
  deadLetterCount: 3,
} as const;

export type CohortGateResult = {
  cohortKey: CohortKey;
  allowed: boolean;
  autoEnqueue: false;
  firstWaveActive: false;
  bulkFloridaEnabled: false;
  blockers: string[];
  operatorResumeRequired: boolean;
};

export function emptyCohortMetrics(): CohortSafetyMetrics {
  return {
    schemaMismatch: false,
    parserFailureRate: 0,
    duplicateSpike: false,
    contradictionSpike: false,
    sourceFailure: false,
    evidencePersistenceFailure: false,
    unexpectedZeroRecordParse: false,
    deadLetterCount: 0,
  };
}

export function evaluateCohortGate(input: {
  cohortKey: CohortKey;
  operatorResume?: boolean;
  priorCohortsStable?: Partial<Record<CohortKey, boolean>>;
  metrics?: Partial<CohortSafetyMetrics>;
}): CohortGateResult {
  const definition = FLORIDA_COHORTS.find((item) => item.key === input.cohortKey);
  const metrics: CohortSafetyMetrics = { ...emptyCohortMetrics(), ...input.metrics };
  const blockers: string[] = [];
  if (!definition) blockers.push("unknown_cohort");
  for (const required of definition?.requires ?? []) {
    if (!input.priorCohortsStable?.[required]) blockers.push(`requires_stable:${required}`);
  }
  if (metrics.schemaMismatch) blockers.push("schema_mismatch");
  if (metrics.parserFailureRate > COHORT_THRESHOLDS.parserFailureRate) blockers.push("high_parser_failure");
  if (metrics.duplicateSpike) blockers.push("duplicate_spike");
  if (metrics.contradictionSpike) blockers.push("contradiction_spike");
  if (metrics.sourceFailure) blockers.push("source_failure");
  if (metrics.evidencePersistenceFailure) blockers.push("evidence_persistence_failure");
  if (metrics.unexpectedZeroRecordParse) blockers.push("unexpected_zero_record_parse");
  if (metrics.deadLetterCount >= COHORT_THRESHOLDS.deadLetterCount) blockers.push("dead_letter_threshold");
  if (!input.operatorResume) blockers.push("operator_inspect_resume_required");
  return {
    cohortKey: input.cohortKey,
    allowed: blockers.length === 0,
    autoEnqueue: false,
    firstWaveActive: false,
    bulkFloridaEnabled: false,
    blockers,
    operatorResumeRequired: !input.operatorResume,
  };
}

/** Automatic Senate transition is a code gate, never a live enqueue. */
export function senateAutoEnqueueBlocked(gate = evaluateCohortGate({ cohortKey: "florida-senate" })): boolean {
  return gate.autoEnqueue === false || gate.allowed === false || gate.firstWaveActive === false;
}

export function nextCohortAfter(key: CohortKey): CohortKey | undefined {
  if (key === "florida-governor-fixture") return "florida-senate";
  if (key === "florida-senate") return "florida-house";
  return undefined;
}
