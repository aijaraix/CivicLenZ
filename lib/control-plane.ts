import fs from 'node:fs';
import path from 'node:path';

export type LedgerMetrics = {
  expected: number;
  discovered: number;
  verified: number;
  currentOccupancies: number;
  baselineResearch: number;
  baselineComplete: number;
  monitoring: number;
};

export type SeatLedger = {
  schemaVersion: string;
  source: string;
  truthRule: string;
  totals: LedgerMetrics;
  byLevel: Record<string, LedgerMetrics>;
  byRegion: Record<string, LedgerMetrics>;
  fileCounts: {
    expectedSeatFiles: number;
    discoveredSeatFiles: number;
    occupancyCandidateFiles: number;
    coverageGapFiles: number;
    seatFiles: number;
  };
  coverageGaps: {
    rows: number;
    expectedCountUnknown: number;
    byRegion: Record<string, number>;
    byOfficeFamily: Record<string, number>;
  };
};

const ledgerPath = path.join(
  process.cwd(),
  'data',
  'operations',
  'control-plane',
  'florida-seat-ledger.json',
);

export function getSeatLedger(): SeatLedger {
  const payload = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) as SeatLedger;
  if (payload.source !== 'persisted_files') {
    throw new Error('Control-plane ledger must be counted from persisted files.');
  }
  return payload;
}

export const metricLabels: Array<[keyof LedgerMetrics, string]> = [
  ['expected', 'EXPECTED'],
  ['discovered', 'DISCOVERED'],
  ['verified', 'VERIFIED'],
  ['currentOccupancies', 'CURRENT OCCUPANCIES'],
  ['baselineResearch', 'BASELINE RESEARCH'],
  ['baselineComplete', 'BASELINE COMPLETE'],
  ['monitoring', 'MONITORING'],
];
