import { reconcileDataset, DATASET_TYPES } from "./dataset-reconciliation.ts";
import { isWorkerActive } from "./store.ts";
import { CAPABILITIES, capabilityState } from "./capabilities.ts";
import { runtimeCapabilityState } from "./worker-registry.ts";
import type { CivicStore } from "./store.ts";

export type ControlPlaneSnapshot = {
  seatsDiscovered: number;
  currentOccupancies: number;
  currentOccupants: number;
  baselineComplete: number;
  monitored: number;
  upcomingElections: number;
  candidatesDiscovered: number;
  verifiedClaims: number;
  pendingClaims: number;
  staleClaims: number;
  contradictions: number;
  sourcesActive: number;
  sourcesFailing: number;
  jobsQueued: number;
  jobsRunning: number;
  jobsSucceeded: number;
  jobsFailed: number;
  jobsDeadLetter: number;
  workersActiveByRecentRun: number;
  workerStates: Array<{ capability: string; state: string }>;
  completenessByCategory: Record<string, { present: number; total: number }>;
  knownGaps: string[];
  lastSuccessfulCollectionAt?: string;
  monitoringOverdue: number;
  sourceHealth: Array<{ sourceKey: string; healthState: string }>;
  recentRuns: Array<{ workerKey: string; status: string; completedAt?: string }>;
  financeCompletionState: string;
  datasetTypesTracked: string[];
};

export async function controlPlaneSnapshot(store: CivicStore, now = new Date()): Promise<ControlPlaneSnapshot> {
  const [seats, occupancies, elections, campaigns, claims, sources, jobs, runs, monitoring, contradictions, fields] = await Promise.all([
    store.listSeats(),
    store.listOccupancies(),
    store.listElections(),
    store.listCampaigns(),
    store.listClaims(),
    store.listSources(),
    store.listJobs(),
    store.listWorkerRuns(),
    store.listMonitoringState(),
    store.listContradictions(),
    store.listResearchContractFields(),
  ]);
  const successful = runs
    .filter((run) => run.status === "succeeded" && run.completedAt)
    .sort((a, b) => Date.parse(b.completedAt ?? "") - Date.parse(a.completedAt ?? ""));
  const currentOccupants = occupancies.filter((row) => row.occupancyStatus === "current" || row.occupancyStatus === "acting").length;
  const requiredKeys = new Set(fields.filter((field) => field.requiredForBaseline).map((field) => field.fieldKey));
  let baselineComplete = 0;
  for (const seat of seats) {
    const occupancy = occupancies.some(
      (row) => row.seatId === seat.seatId && (row.occupancyStatus === "current" || row.occupancyStatus === "acting"),
    );
    const occupantClaim = claims.some((claim) => claim.seatId === seat.seatId && claim.fieldKey === "current_occupant");
    if (seat.seatId && (occupancy || occupantClaim)) baselineComplete += 1;
  }
  const completenessByCategory: Record<string, { present: number; total: number }> = {};
  for (const field of fields) {
    const category = field.category ?? "uncategorized";
    const bucket = completenessByCategory[category] ?? { present: 0, total: 0 };
    bucket.total += 1;
    if (
      claims.some(
        (claim) =>
          claim.fieldKey === field.fieldKey &&
          (claim.verificationState === "verified" ||
            claim.verificationState === "checked_no_authoritative_result" ||
            Boolean(claim.normalizedValue || claim.displayValue)),
      )
    ) {
      bucket.present += 1;
    }
    completenessByCategory[category] = bucket;
  }
  const knownGaps = [...requiredKeys].filter(
    (fieldKey) =>
      !claims.some(
        (claim) =>
          claim.fieldKey === fieldKey &&
          claim.verificationState !== "not_collected" &&
          (claim.normalizedValue || claim.displayValue || claim.verificationState === "checked_no_authoritative_result"),
      ),
  );
  const financeStub = reconcileDataset({
    datasetType: "campaign_finance",
    subjectType: "control_plane",
    subjectId: "statewide",
  });
  return {
    seatsDiscovered: seats.length,
    currentOccupancies: currentOccupants,
    currentOccupants,
    baselineComplete,
    monitored: monitoring.filter((row) => row.active).length,
    upcomingElections: elections.filter((row) => row.electionDate && Date.parse(row.electionDate) >= now.getTime()).length,
    candidatesDiscovered: campaigns.length,
    verifiedClaims: claims.filter((claim) => claim.verificationState === "verified").length,
    pendingClaims: claims.filter((claim) =>
      ["collected_unreviewed", "extracted", "entity_match_pending", "evidence_pending", "verification_pending"].includes(
        claim.verificationState,
      ),
    ).length,
    staleClaims: claims.filter((claim) => claim.verificationState === "stale").length,
    contradictions: contradictions.length,
    sourcesActive: sources.filter((source) => source.active && source.healthState !== "failing").length,
    sourcesFailing: sources.filter((source) => source.healthState === "failing").length,
    jobsQueued: jobs.filter((job) => job.status === "queued").length,
    jobsRunning: jobs.filter((job) => job.status === "running" || job.status === "leased").length,
    jobsSucceeded: jobs.filter((job) => job.status === "succeeded").length,
    jobsFailed: jobs.filter((job) => job.status === "failed").length,
    jobsDeadLetter: jobs.filter((job) => job.status === "dead_letter").length,
    workersActiveByRecentRun: isWorkerActive(runs, now) ? 1 : 0,
    workerStates: CAPABILITIES.map((capability) => ({
      capability,
      state: runtimeCapabilityState(capability, runs, now),
    })),
    completenessByCategory,
    knownGaps,
    lastSuccessfulCollectionAt: successful[0]?.completedAt,
    monitoringOverdue: monitoring.filter(
      (row) => row.active && row.nextCheckAt && Date.parse(row.nextCheckAt) <= now.getTime(),
    ).length,
    sourceHealth: sources.map((source) => ({ sourceKey: source.sourceKey, healthState: source.healthState })),
    recentRuns: successful.slice(0, 10).map((run) => ({
      workerKey: run.workerKey,
      status: run.status,
      completedAt: run.completedAt,
    })),
    financeCompletionState: financeStub.completionState,
    datasetTypesTracked: [...DATASET_TYPES],
  };
}

export function declaredCapabilityStates(): Array<{ capability: string; state: string }> {
  return CAPABILITIES.map((capability) => ({ capability, state: capabilityState(capability) }));
}
