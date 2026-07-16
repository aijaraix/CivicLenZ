import fs from 'node:fs';
import path from 'node:path';

export type CivicScore = {
  scoreType: string;
  value: number;
  label?: string | null;
};

export type SourceReference = {
  label: string;
  url: string;
  publisher?: string | null;
  sourceType?: string | null;
  fields?: string[];
  checkedAt?: string | null;
};

export type SocialAccount = {
  platform: string;
  handle?: string | null;
  url: string;
  accountType?: 'official' | 'campaign' | 'personal' | 'office' | 'other' | 'unclassified' | null;
  verified?: boolean | null;
  active?: boolean | null;
  lastCheckedAt?: string | null;
  sourceUrl?: string | null;
  sourceLabel?: string | null;
  verificationState?: 'official_source_confirmed' | 'platform_verified' | 'source_linked' | 'under_review' | 'unverified' | null;
};

export type OfficialProfile = {
  schemaVersion: string;
  officialId: string;
  canonicalPersonId?: string;
  slug: string;
  recordStatus: string;
  dataState?: string;
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
    active?: boolean | null;
    verifiedAt?: string | null;
  }>;
  contactPoints?: Array<{
    type: string;
    label?: string | null;
    value: string;
    officialUse?: boolean | null;
    verifiedAt?: string | null;
    dataState?: string;
  }>;
  officeLocations?: Array<{
    type: string;
    label?: string | null;
    address: string;
    officeHours?: string | null;
    public?: boolean;
  }>;
  socialAccounts?: SocialAccount[];
  sourceReferences?: SourceReference[];
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
  publishedAt?: string | null;
  monitoring?: {
    active?: boolean;
    health?: string;
    lastFullResearchAt?: string | null;
    lastSourceScanAt?: string | null;
    staleSections?: string[];
  };
};

type StagingRecord = {
  stagingRecordId: string;
  sourceKey: string;
  sourceUrl: string;
  sourceMemberUrl?: string;
  fetchedAt: string;
  extractionStatus: string;
  displayName: string;
  districtNumber?: string;
  partyName?: string;
  countyDescription?: string;
  officeTitle: string;
  governmentLevel: string;
  jurisdictionName: string;
  stateCode?: string;
  canonicalMatchStatus: string;
};

export type SourceListedOfficial = {
  id: string;
  slug: string;
  displayName: string;
  officeTitle: string;
  governmentLevel: string;
  jurisdictionName: string;
  stateCode?: string;
  districtName?: string;
  partyName?: string;
  countyDescription?: string;
  sourceUrl: string;
  sourceDirectoryUrl: string;
  sourceLabel: string;
  fetchedAt: string;
};

export type DirectoryEntry = {
  id: string;
  slug: string;
  displayName: string;
  officeTitle: string;
  governmentLevel: string;
  jurisdictionName: string;
  stateCode?: string | null;
  districtName?: string | null;
  partyName?: string;
  countyDescription?: string;
  portraitUrl?: string | null;
  listingType: 'profile' | 'source_listing';
  completeness?: number;
  sourceUrl?: string;
  sourceLabel?: string;
  fetchedAt?: string;
};

const dataRoot = path.join(process.cwd(), 'data', 'officials');
const stagingRoot = path.join(process.cwd(), 'data', 'staging');
const PUBLIC_SOURCE_LISTING_KEYS = new Set(['florida-senate-members']);

function findJsonFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findJsonFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : [];
  });
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function humanName(value: string): string {
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length === 2 ? parts[1] + ' ' + parts[0] : value.trim();
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sourceListingSlug(record: StagingRecord): string {
  return 'florida-state-senate-' + (record.districtNumber ?? 'member') + '-' + slugify(humanName(record.displayName));
}

export function getAllOfficials(): OfficialProfile[] {
  return findJsonFiles(dataRoot)
    .map((filePath) => readJson<OfficialProfile>(filePath))
    .filter((official) => ['active', 'former', 'candidate'].includes(official.recordStatus))
    .sort((a, b) => a.person.displayName.localeCompare(b.person.displayName));
}

export function getOfficialBySlug(slug: string): OfficialProfile | undefined {
  return getAllOfficials().find((official) => official.slug === slug);
}

export function getSourceListedOfficials(): SourceListedOfficial[] {
  return findJsonFiles(stagingRoot)
    .map((filePath) => readJson<StagingRecord>(filePath))
    .filter((record) => {
      return (
        record.extractionStatus === 'extracted_unreviewed' &&
        PUBLIC_SOURCE_LISTING_KEYS.has(record.sourceKey) &&
        Boolean(record.displayName && record.officeTitle && record.jurisdictionName && record.sourceUrl)
      );
    })
    .map((record) => ({
      id: record.stagingRecordId,
      slug: sourceListingSlug(record),
      displayName: humanName(record.displayName),
      officeTitle: record.officeTitle,
      governmentLevel: record.governmentLevel,
      jurisdictionName: record.jurisdictionName,
      stateCode: record.stateCode,
      districtName: record.districtNumber ? 'Florida Senate District ' + record.districtNumber : undefined,
      partyName: record.partyName,
      countyDescription: record.countyDescription,
      sourceUrl: record.sourceMemberUrl ?? record.sourceUrl,
      sourceDirectoryUrl: record.sourceUrl,
      sourceLabel: 'Florida Senate — Senators',
      fetchedAt: record.fetchedAt,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function getSourceListedOfficialBySlug(slug: string): SourceListedOfficial | undefined {
  return getSourceListedOfficials().find((official) => official.slug === slug);
}

export function getDirectoryEntries(): DirectoryEntry[] {
  const profileEntries = getAllOfficials().map<DirectoryEntry>((official) => ({
    id: official.officialId,
    slug: official.slug,
    displayName: official.person.displayName,
    officeTitle: official.office.title,
    governmentLevel: official.office.governmentLevel,
    jurisdictionName: official.jurisdiction.name,
    stateCode: official.jurisdiction.stateCode,
    districtName: official.office.districtName,
    partyName: official.party?.name,
    portraitUrl: official.person.portraitUrl,
    listingType: 'profile',
    completeness: official.profileCompleteness,
    sourceUrl: official.sourceReferences?.[0]?.url ?? official.websites?.find((item) => item.type === 'official')?.url,
    sourceLabel: official.sourceReferences?.[0]?.label ?? 'Official profile source',
    fetchedAt: official.lastTrackedAt ?? official.lastUpdatedAt,
  }));

  const profileIdentityKeys = new Set(
    profileEntries.map((entry) =>
      [entry.displayName.toLowerCase(), entry.officeTitle.toLowerCase(), entry.districtName?.toLowerCase() ?? ''].join('|'),
    ),
  );

  const sourceEntries = getSourceListedOfficials()
    .filter((official) => {
      const key = [
        official.displayName.toLowerCase(),
        official.officeTitle.toLowerCase(),
        official.districtName?.toLowerCase() ?? '',
      ].join('|');
      return !profileIdentityKeys.has(key);
    })
    .map<DirectoryEntry>((official) => ({
      id: official.id,
      slug: official.slug,
      displayName: official.displayName,
      officeTitle: official.officeTitle,
      governmentLevel: official.governmentLevel,
      jurisdictionName: official.jurisdictionName,
      stateCode: official.stateCode,
      districtName: official.districtName,
      partyName: official.partyName,
      countyDescription: official.countyDescription,
      listingType: 'source_listing',
      sourceUrl: official.sourceUrl,
      sourceLabel: official.sourceLabel,
      fetchedAt: official.fetchedAt,
    }));

  return [...profileEntries, ...sourceEntries].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function getDirectoryCoverage() {
  const publishedProfiles = getAllOfficials().length;
  const sourceListings = getSourceListedOfficials().length;
  return {
    publishedProfiles,
    sourceListings,
    total: publishedProfiles + sourceListings,
  };
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
