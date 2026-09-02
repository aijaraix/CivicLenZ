import type { OccupancyRecord } from "./types.ts";

export const CURRENT_ACTING_STATUSES = new Set(["current", "acting"]);
export const DEMOTED_OCCUPANCY_STATUS = "former";

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
