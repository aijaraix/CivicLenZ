import type { OccupancyRecord } from "./types.ts";

export const CURRENT_ACTING_STATUSES = new Set(["current", "acting"]);
/** Live seat_occupancies.occupancy_status for a demoted current/acting term. `former` is not live-legal. */
export const DEMOTED_OCCUPANCY_STATUS = "completed";

/** Live seat_occupancies.occupancy_status CHECK (queried 2026-09-02). */
export const LIVE_SEAT_OCCUPANCY_STATUSES = [
  "current",
  "upcoming",
  "completed",
  "vacant",
  "acting",
  "disputed",
] as const;
export type LiveSeatOccupancyStatus = (typeof LIVE_SEAT_OCCUPANCY_STATUSES)[number];

/** Newly collected occupancy is not yet validated. `unreviewed` is not live-legal. */
export const NEW_OCCUPANCY_EVIDENCE_STATE = "pending";

export function persistSeatBaselineStatus(occupied: boolean): "officeholder_pending" | "discovered" {
  return occupied ? "officeholder_pending" : "discovered";
}

export function persistSeatTableOccupancyStatus(input: {
  occupied: boolean;
  acting?: boolean;
}): "occupied" | "vacant" | "acting" {
  if (input.acting) return "acting";
  return input.occupied ? "occupied" : "vacant";
}

export function persistOccupancyRowStatus(holder: {
  occupancyStatus?: string;
  vacant?: boolean;
}): LiveSeatOccupancyStatus {
  const raw = holder.occupancyStatus;
  if (raw === "former") return "completed";
  if (raw === "occupied" || raw === "unknown") {
    return holder.vacant ? "vacant" : "current";
  }
  if (raw && (LIVE_SEAT_OCCUPANCY_STATUSES as readonly string[]).includes(raw)) {
    return raw as LiveSeatOccupancyStatus;
  }
  return holder.vacant ? "completed" : "current";
}

export function isCurrentOrActing(status: string | undefined): boolean {
  return Boolean(status && CURRENT_ACTING_STATUSES.has(status));
}

export function occupancyTermMatches(
  row: OccupancyRecord,
  query: { occupancyId?: string; seatId: string; personId: string; startDate?: string },
): boolean {
  if (query.occupancyId) return row.occupancyId === query.occupancyId;
  if (row.seatId !== query.seatId || row.personId !== query.personId) return false;
  return (row.startDate ?? undefined) === (query.startDate ?? undefined);
}

export function findOccupancy(
  rows: OccupancyRecord[],
  query: { occupancyId?: string; seatId: string; personId: string; startDate?: string },
): OccupancyRecord | undefined {
  if (query.occupancyId) {
    const byId = rows.find((row) => row.occupancyId === query.occupancyId);
    if (byId) return byId;
  }
  return rows.find((row) => occupancyTermMatches(row, query));
}

export function occupanciesToDemote(
  rows: OccupancyRecord[],
  input: { seatId: string; keepOccupancyId?: string; nextStatus?: string },
): OccupancyRecord[] {
  if (!isCurrentOrActing(input.nextStatus)) return [];
  return rows.filter(
    (row) =>
      row.seatId === input.seatId &&
      isCurrentOrActing(row.occupancyStatus) &&
      row.occupancyId !== input.keepOccupancyId,
  );
}

export function demoteOccupancy(row: OccupancyRecord, endDate?: string): OccupancyRecord {
  return {
    ...row,
    occupancyStatus: DEMOTED_OCCUPANCY_STATUS,
    endDate: row.endDate ?? endDate,
  };
}
