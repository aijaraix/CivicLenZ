import fs from 'node:fs';
import path from 'node:path';

export type CivicScore = {
  scoreType: string;
  value: number;
  label?: string | null;
};

export type OfficialProfile = {
  schemaVersion: string;
  officialId: string;
  slug: string;
  recordStatus: string;
  person: {
    displayName: string;
    firstName: string;
    lastName: string;
    portraitUrl?: string | null;
  };
  office: {
    title: string;
    shortTitle?: string | null;
    governmentLevel: string;
    districtName?: string | null;
  };
  jurisdiction: {
    name: string;
    stateCode?: string | null;
  };
  term?: {
    startDate?: string | null;
    endDate?: string | null;
    currentStatus?: string | null;
  };
  party?: {
    name: string;
  };
  biography?: {
    short?: string | null;
    long?: string | null;
    birthDate?: string | null;
    birthplace?: string | null;
  };
  websites?: Array<{
    type: string;
    url: string;
  }>;
  contactPoints?: Array<{
    type: string;
    label?: string | null;
    value: string;
  }>;
  socialAccounts?: Array<{
    platform: string;
    handle?: string | null;
    url: string;
  }>;
  civicScores?: CivicScore[];
  performanceMetrics?: Array<{
    metricType: string;
    value: number;
  }>;
  issueTrackers?: Array<{
    title: string;
    description?: string | null;
    score?: number | null;
    status: string;
    analysis?: string | null;
  }>;
  profileCompleteness?: number;
  lastTrackedAt?: string | null;
  lastUpdatedAt: string;
};

const dataRoot = path.join(process.cwd(), 'data', 'officials');

function findJsonFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findJsonFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : [];
  });
}

export function getAllOfficials(): OfficialProfile[] {
  return findJsonFiles(dataRoot)
    .map((filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8')) as OfficialProfile)
    .filter((official) => official.recordStatus !== 'duplicate' && official.recordStatus !== 'archived')
    .sort((a, b) => a.person.displayName.localeCompare(b.person.displayName));
}

export function getOfficialBySlug(slug: string): OfficialProfile | undefined {
  return getAllOfficials().find((official) => official.slug === slug);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function humanize(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
