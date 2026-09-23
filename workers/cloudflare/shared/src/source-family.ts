import { capabilityFamilySpec, type CapabilityFamily, type DatasetKind } from "./capability-family.ts";
import type { CivicStore, ScheduleJobInput } from "./store.ts";
import type { JobRoute } from "./types.ts";

export const MAX_SOURCE_FAMILIES_PER_PASS = 8;
export const MAX_DISCOVERY_PASSES = 3;

export type SourceFamilyPassPlanInput = {
  subjectType: string;
  subjectId: string;
  seatId?: string;
  subjectKey: string;
  capability: string;
  scopeKey: string;
  unitKey: string;
  sourceFamilies?: readonly string[];
  discoveryPasses?: number;
  generation?: number;
};

export type SourceFamilyPass = {
  researchWorkIdentity: string;
  dedupeKey: string;
  subjectType: string;
  subjectId: string;
  seatId?: string;
  capability: string;
  family: CapabilityFamily;
  scopeKey: string;
  unitKey: string;
  sourceFamily: string;
  discoveryPass: number;
  datasetKind: DatasetKind;
  queuePool: string;
  route: JobRoute;
  workerModule: string;
  executionClass: "PRODUCTION";
  orchestrationAuthority: "HERMES";
  publicationAuthority: false;
  verificationAuthority: false;
  validationHandoff: string;
  coverageHandoff: string;
  sourceRateLimitKey: string;
  generation: number;
};

export type QueuedSourceFamilyPass = SourceFamilyPass & {
  jobId: string;
  created: boolean;
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function selectedSourceFamilies(
  declared: readonly string[],
  requested?: readonly string[],
): string[] {
  const sourceFamilies = unique(requested ?? declared);
  if (
    sourceFamilies.length === 0 ||
    sourceFamilies.length > MAX_SOURCE_FAMILIES_PER_PASS ||
    sourceFamilies.some((sourceFamily) => !declared.includes(sourceFamily))
  ) {
    return [];
  }
  return sourceFamilies;
}

function passCount(datasetKind: DatasetKind, requested?: number): number {
  const defaultPasses = datasetKind === "FINITE" ? 1 : 2;
  const count = requested ?? defaultPasses;
  if (!Number.isInteger(count) || count < 1 || count > MAX_DISCOVERY_PASSES) return 0;
  if (datasetKind !== "FINITE" && count < 2) return 0;
  return count;
}

export function planSourceFamilyPasses(
  input: SourceFamilyPassPlanInput,
): SourceFamilyPass[] {
  const definition = capabilityFamilySpec(input.capability);
  if (!definition) return [];

  const sourceFamilies = selectedSourceFamilies(
    definition.sourceFamilies,
    input.sourceFamilies,
  );
  const passes = passCount(definition.datasetKind, input.discoveryPasses);
  if (!sourceFamilies.length || !passes || !input.scopeKey || !input.unitKey
      || !definition.units.includes(input.unitKey)) return [];

  const generation = input.generation ?? 1;
  if (!Number.isInteger(generation) || generation < 1) return [];

  const planned: SourceFamilyPass[] = [];
  for (let discoveryPass = 1; discoveryPass <= passes; discoveryPass += 1) {
    for (const sourceFamily of sourceFamilies) {
      const identity = [
        "source-family:v1",
        input.subjectKey,
        input.capability,
        input.scopeKey,
        input.unitKey,
        sourceFamily,
        `pass${discoveryPass}`,
        `g${generation}`,
      ].join(":");
      planned.push({
        researchWorkIdentity: identity,
        dedupeKey: `research:${identity}`,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        seatId: input.seatId,
        capability: definition.capability,
        family: definition.family,
        scopeKey: input.scopeKey,
        unitKey: input.unitKey,
        sourceFamily,
        discoveryPass,
        datasetKind: definition.datasetKind,
        queuePool: definition.queuePool,
        route: definition.route,
        workerModule: definition.workerModule,
        executionClass: "PRODUCTION",
        orchestrationAuthority: "HERMES",
        publicationAuthority: false,
        verificationAuthority: false,
        validationHandoff: definition.validationHandoff,
        coverageHandoff: definition.coverageHandoff,
        sourceRateLimitKey: sourceFamily,
        generation,
      });
    }
  }
  return planned;
}

export async function queueSourceFamilyPasses(
  store: CivicStore,
  input: SourceFamilyPassPlanInput,
): Promise<{ planned: SourceFamilyPass[]; queued: QueuedSourceFamilyPass[] }> {
  const planned = planSourceFamilyPasses(input);
  const queued: QueuedSourceFamilyPass[] = [];
  for (const work of planned) {
    const scheduleInput: ScheduleJobInput = {
      dedupeKey: work.dedupeKey,
      route: work.route,
      entityType: work.subjectType,
      entityId: work.subjectId,
      seatId: work.seatId,
      payload: {
        capability: work.capability,
        capabilityFamily: work.family,
        scopeKey: work.scopeKey,
        unitKey: work.unitKey,
        sourceFamily: work.sourceFamily,
        sourceRateLimitKey: work.sourceRateLimitKey,
        discoveryPass: work.discoveryPass,
        researchWorkIdentity: work.researchWorkIdentity,
        queuePool: work.queuePool,
        workerModule: work.workerModule,
        datasetKind: work.datasetKind,
        execution_class: work.executionClass,
        orchestration_authority: work.orchestrationAuthority,
        publication_authority: work.publicationAuthority,
        verification_authority: work.verificationAuthority,
        validationHandoff: work.validationHandoff,
        coverageHandoff: work.coverageHandoff,
        generation: work.generation,
      },
    };
    const scheduled = await store.scheduleJob(scheduleInput);
    queued.push({ ...work, jobId: scheduled.job.jobId, created: scheduled.created });
  }
  return { planned, queued };
}
