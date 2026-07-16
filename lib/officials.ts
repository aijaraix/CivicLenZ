import fs from 'node:fs';
import path from 'node:path';

export type CivicScore = {
  scoreType: string;
  value: number;
  label?: string | null;
};

export type PublicationStage = 'reviewed_profile' | 'baseline_record';

export type OfficialProfile = {
  schemaVersion: string;
  officialId: string;
  slug: string;
  recordStatus: string;
  publicationStage?: PublicationStage;
  dataState?: string;
  sourceKey?: string;
  sourceUrl?: string;
  sourceMemberUrl?: string;
  sourceSnapshotSha256?: string;
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
    branch?: string | null;
    chamber?: string | null;
    districtName?: string | null;
    districtNumber?: string | null;
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

type BaselineRecord = {
  candidateRecordVersion?: string;
  stagingRecordId: string;
  sourceKey: string;
  sourceUrl: string;
  sourceMemberUrl?: string | null;
  sourceSnapshotSha256?: string;
  fetchedAt: string;
  extractionStatus: string;
  recordKind?: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  officeTitle: string;
  governmentLevel: string;
  branch?: string | null;
  chamber?: string | null;
  jurisdictionName?: string;
  stateName?: string;
  stateCode?: string;
  districtNumber?: string | null;
  partyName?: string | null;
  phone?: string | null;
  officeAddress?: string | null;
  serviceStartDateText?: string | null;
  serviceEndDateText?: string | null;
};

const canonicalDataRoot = path.join(process.cwd(), 'data', 'officials');
const baselineRoots = [
  path.join(process.cwd(), 'data', 'staging', 'florida', 'state-house'),
  path.join(process.cwd(), 'data', 'staging', 'florida', 'state-senate'),
  path.join(process.cwd(), 'data', 'staging', 'florida', 'statewide-executive'),
  path.join(process.cwd(), 'data', 'staging', 'federal', 'us-house'),
  path.join(process.cwd(), 'data', 'staging', 'federal', 'us-senate'),
];

function findJsonFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findJsonFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : [];
  });
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeDisplayName(record: BaselineRecord): {
  displayName: string;
  firstName: string;
  lastName: string;
} {
  if (record.firstName && record.lastName) {
    return {
      displayName: `${record.firstName} ${record.lastName}`.trim(),
      firstName: record.firstName,
      lastName: record.lastName,
    };
  }

  const commaParts = record.displayName.split(',').map((part) => part.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    const lastName = commaParts[0];
    const firstName = commaParts.slice(1).join(' ');
    return {
      displayName: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
    };
  }

  const parts = record.displayName.trim().split(/\s+/).filter(Boolean);
  return {
    displayName: record.displayName.trim(),
    firstName: parts[0] ?? record.displayName.trim(),
    lastName: parts.slice(1).join(' ') || parts[0] || record.displayName.trim(),
  };
}

function normalizeDate(value?: string | null): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!match) return null;
  const [, month, day, rawYear] = match;
  const year = rawYear.length === 2 ? Number(rawYear) + 2000 : Number(rawYear);
  return `${year.toString().padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function baselineToOfficial(record: BaselineRecord): OfficialProfile | null {
  if (record.recordKind === 'vacancy' || record.stateCode !== 'FL') return null;
  if (record.extractionStatus !== 'extracted_unreviewed') return null;

  const name = normalizeDisplayName(record);
  const jurisdictionName = record.stateName ?? (record.stateCode === 'FL' ? 'Florida' : record.jurisdictionName) ?? 'Florida';
  const sourceMemberUrl = record.sourceMemberUrl || record.sourceUrl;
  const contactPoints: OfficialProfile['contactPoints'] = [];

  if (record.phone) contactPoints.push({ type: 'phone', label: 'Official phone', value: record.phone });
  if (record.officeAddress) contactPoints.push({ type: 'address', label: 'Office address', value: record.officeAddress });

  return {
    schemaVersion: record.candidateRecordVersion ?? '1.0.0',
    officialId: record.stagingRecordId,
    slug: slugify(`${name.displayName}-${record.officeTitle}`),
    recordStatus: 'active',
    publicationStage: 'baseline_record',
    dataState: 'partially_verified',
    sourceKey: record.sourceKey,
    sourceUrl: record.sourceUrl,
    sourceMemberUrl,
    sourceSnapshotSha256: record.sourceSnapshotSha256,
    person: {
      displayName: name.displayName,
      firstName: name.firstName,
      lastName: name.lastName,
      portraitUrl: null,
    },
    office: {
      title: record.officeTitle,
      shortTitle: null,
      governmentLevel: record.governmentLevel,
      branch: record.branch ?? null,
      chamber: record.chamber ?? null,
      districtName: record.districtNumber ? `District ${record.districtNumber}` : jurisdictionName,
      districtNumber: record.districtNumber ?? null,
    },
    jurisdiction: {
      name: jurisdictionName,
      stateCode: record.stateCode ?? 'FL',
    },
    term: {
      startDate: normalizeDate(record.serviceStartDateText),
      endDate: normalizeDate(record.serviceEndDateText),
      currentStatus: 'current',
    },
    party: record.partyName ? { name: record.partyName } : undefined,
    websites: sourceMemberUrl ? [{ type: 'official', url: sourceMemberUrl }] : [],
    contactPoints,
    civicScores: [],
    performanceMetrics: [],
    issueTrackers: [],
    lastTrackedAt: record.fetchedAt,
    lastUpdatedAt: record.fetchedAt,
  };
}

function dedupeKey(official: OfficialProfile): string {
  return [
    official.person.displayName,
    official.office.title,
    official.office.districtNumber ?? '',
    official.jurisdiction.stateCode ?? official.jurisdiction.name,
  ]
    .join('|')
    .toLowerCase()
    .replace(/[^a-z0-9|]+/g, '');
}

export function getAllOfficials(): OfficialProfile[] {
  const canonical = findJsonFiles(canonicalDataRoot)
    .map((filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8')) as OfficialProfile)
    .filter((official) => official.recordStatus !== 'duplicate' && official.recordStatus !== 'archived')
    .map((official) => ({ ...official, publicationStage: 'reviewed_profile' as const }));

  const canonicalKeys = new Set(canonical.map(dedupeKey));
  const baseline = baselineRoots
    .flatMap(findJsonFiles)
    .map((filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8')) as BaselineRecord)
    .map(baselineToOfficial)
    .filter((official): official is OfficialProfile => Boolean(official))
    .filter((official) => !canonicalKeys.has(dedupeKey(official)));

  return [...canonical, ...baseline].sort((a, b) => {
    const levelOrder = (official: OfficialProfile) => {
      if (official.office.governmentLevel === 'federal') return 0;
      if (official.office.branch === 'executive') return 1;
      if (official.office.chamber === 'senate') return 2;
      if (official.office.chamber === 'house') return 3;
      return 4;
    };

    return levelOrder(a) - levelOrder(b) || a.person.displayName.localeCompare(b.person.displayName);
  });
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
