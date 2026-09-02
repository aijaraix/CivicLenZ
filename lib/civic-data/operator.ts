export type OperatorDashboardCounts = {
  seatsDiscovered: number;
  currentOccupants: number;
  baselineComplete: number;
  monitored: number;
  jobsQueued: number;
  jobsRunning: number;
  jobsSucceeded: number;
  jobsFailed: number;
  jobsDeadLetter: number;
  workerStates: Array<{ capability: string; state: string }>;
  completenessByCategory: Record<string, { present: number; total: number }>;
  knownGaps: string[];
  contradictions: number;
  staleClaims: number;
  sourceHealth: Array<{ sourceKey: string; healthState: string }>;
  recentRuns: Array<{ workerKey: string; status: string; completedAt?: string }>;
  connected: boolean;
};

export function emptyOperatorDashboard(): OperatorDashboardCounts {
  return {
    seatsDiscovered: 0,
    currentOccupants: 0,
    baselineComplete: 0,
    monitored: 0,
    jobsQueued: 0,
    jobsRunning: 0,
    jobsSucceeded: 0,
    jobsFailed: 0,
    jobsDeadLetter: 0,
    workerStates: [],
    completenessByCategory: {},
    knownGaps: [],
    contradictions: 0,
    staleClaims: 0,
    sourceHealth: [],
    recentRuns: [],
    connected: false,
  };
}
