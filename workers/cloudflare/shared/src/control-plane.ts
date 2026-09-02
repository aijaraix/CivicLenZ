import { isWorkerActive } from "./store.ts";
import type { CivicStore } from "./store.ts";

export type ControlPlaneSnapshot = {
  seatsDiscovered: number;
  currentOccupancies: number;
  upcomingElections: number;
  candidatesDiscovered: number;
  verifiedClaims: number;
  pendingClaims: number;
  sourcesActive: number;
  sourcesFailing: number;
  jobsQueued: number;
  jobsFailed: number;
  workersActiveByRecentRun: number;
  lastSuccessfulCollectionAt?: string;
  monitoringOverdue: number;
};

export async function controlPlaneSnapshot(store: CivicStore, now = new Date()): Promise<ControlPlaneSnapshot> {
  const [seats, occupancies, elections, campaigns, claims, sources, jobs, runs, monitoring] = await Promise.all([
    store.listSeats(),
    store.listOccupancies(),
    store.listElections(),
    store.listCampaigns(),
    store.listClaims(),
    store.listSources(),
    store.listJobs(),
    store.listWorkerRuns(),
    store.listMonitoringState(),
  ]);
  const successful = runs
    .filter((run) => run.status === "succeeded" && run.completedAt)
    .sort((a, b) => Date.parse(b.completedAt ?? "") - Date.parse(a.completedAt ?? ""));
  return {
    seatsDiscovered: seats.length,
    currentOccupancies: occupancies.filter((row) => row.occupancyStatus === "current" || row.occupancyStatus === "acting").length,
    upcomingElections: elections.filter((row) => row.electionDate && Date.parse(row.electionDate) >= now.getTime()).length,
    candidatesDiscovered: campaigns.length,
    verifiedClaims: claims.filter((claim) => claim.verificationState === "verified").length,
    pendingClaims: claims.filter((claim) =>
      ["collected_unreviewed", "extracted", "entity_match_pending", "evidence_pending", "verification_pending"].includes(
        claim.verificationState,
      ),
    ).length,
    sourcesActive: sources.filter((source) => source.active && source.healthState !== "failing").length,
    sourcesFailing: sources.filter((source) => source.healthState === "failing").length,
    jobsQueued: jobs.filter((job) => job.status === "queued").length,
    jobsFailed: jobs.filter((job) => job.status === "failed" || job.status === "dead_letter").length,
    workersActiveByRecentRun: isWorkerActive(runs, now) ? 1 : 0,
    lastSuccessfulCollectionAt: successful[0]?.completedAt,
    monitoringOverdue: monitoring.filter(
      (row) => row.active && row.nextCheckAt && Date.parse(row.nextCheckAt) <= now.getTime(),
    ).length,
  };
}
