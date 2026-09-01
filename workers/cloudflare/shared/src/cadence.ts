import type { RefreshClass } from "./source-config.ts";

const INTERVAL_MS: Record<RefreshClass, { normal: number; election: number }> = {
  IMMUTABLE: { normal: 30 * 24 * 60 * 60 * 1000, election: 7 * 24 * 60 * 60 * 1000 },
  LOW: { normal: 24 * 60 * 60 * 1000, election: 6 * 60 * 60 * 1000 },
  MEDIUM: { normal: 6 * 60 * 60 * 1000, election: 60 * 60 * 1000 },
  HIGH: { normal: 60 * 60 * 1000, election: 15 * 60 * 1000 },
  ELECTION_REALTIME: { normal: 15 * 60 * 1000, election: 5 * 60 * 1000 },
};

export function nextCheckAt(input: {
  refreshClass: RefreshClass;
  now?: Date;
  electionProximityDays?: number;
}): Date {
  const now = input.now ?? new Date();
  const nearElection = (input.electionProximityDays ?? 999) <= 45;
  const ms = nearElection ? INTERVAL_MS[input.refreshClass].election : INTERVAL_MS[input.refreshClass].normal;
  return new Date(now.getTime() + ms);
}

export function electionProximityDays(electionDate: string | undefined, now = new Date()): number | undefined {
  if (!electionDate) return undefined;
  const ms = Date.parse(electionDate) - now.getTime();
  if (Number.isNaN(ms)) return undefined;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
