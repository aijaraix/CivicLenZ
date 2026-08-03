import fs from 'node:fs';
import path from 'node:path';

export type CivicScore = {
  scoreType: string;
  value: number;
  label?: string | null;
};

export type PublicationStage = 'reviewed_profile' | 'baseline_record';

export type EvidenceLink = {
  evidenceId?: string;
  sourceUrl?: string;
  archiveUrl?: string | null;
  capturedAt?: string | null;
  exactQuote?: string | null;
};

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
  seat?: {
    seatId: string;
    seatName: string;
    seatType?: string | null;
    occupancyStatus?: 'occupied' | 'vacant' | 'disputed' | 'acting' | 'unknown';
    successionMethod?: string | null;
    nextElectionDate?: string | null;
    previousOccupants?: Array<{
      personName: string;
      startDate?: string | null;
      endDate?: string | null;
    }>;
  };
  person: {
    displayName: string;
    firstName: string;
    lastName: string;
    portraitUrl?: string | null;
    portraitSourceUrl?: string | null;
    portraitCredit?: string | null;
    portraitLicense?: string | null;
    portraitSha256?: string | null;
  };
  office: {
    officeId?: string;
    title: string;
    shortTitle?: string | null;
    governmentLevel: string;
    branch?: string | null;
    chamber?: string | null;
    seatName?: string | null;
    districtName?: string | null;
    districtNumber?: string | null;
    authoritySummary?: string | null;
    responsibilities?: string[];
  };
  jurisdiction: {
    name: string;
    stateCode?: string | null;
  };
  term?: {
    officeTermId?: string;
    startDate?: string | null;
    endDate?: string | null;
    assumedOfficeDate?: string | null;
    electedOrAppointed?: string | null;
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
    hometown?: string | null;
    publicFamilySummary?: string | null;
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
  officeLocations?: Array<{
    type: string;
    label?: string | null;
    address: string;
    officeHours?: string | null;
  }>;
  socialAccounts?: Array<{
    platform: string;
    handle?: string | null;
    url: string;
    accountType?: string | null;
  }>;
  education?: Array<{
    institution: string;
    degree?: string | null;
    field?: string | null;
    endDate?: string | null;
  }>;
  militaryService?: Array<{
    branch?: string | null;
    rank?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }>;
  careerHistory?: Array<{
    organization: string;
    title?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }>;
  politicalHistory?: Array<{
    title: string;
    organizationOrOffice?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }>;
  committeesAndAppointments?: Array<{
    name: string;
    roleType: string;
    title?: string | null;
    current?: boolean | null;
  }>;
  elections?: Array<{
    electionId?: string;
    date: string;
    type?: string | null;
    officeTitle: string;
    result?: string | null;
    votes?: number | null;
    votePercentage?: number | null;
    opponents?: string[];
  }>;
  campaignFinanceSummary?: {
    cycle?: string | null;
    totalRaised?: number | null;
    totalSpent?: number | null;
    cashOnHand?: number | null;
    debt?: number | null;
    topDonors?: Array<{ name: string; amount: number; donorType?: string | null }>;
    lastFiledAt?: string | null;
  };
  promises?: Array<{
    promiseId?: string;
    title: string;
    exactText: string;
    summary?: string | null;
    date?: string | null;
    context?: string | null;
    issueTags?: string[];
    targetDate?: string | null;
    status: string;
    progressPercentage?: number | null;
    statusReason?: string | null;
    confidence?: string;
    evidence?: EvidenceLink[];
  }>;
  statements?: Array<{
    statementId?: string;
    statementDate: string;
    exactQuote: string;
    summary?: string | null;
    context?: string | null;
    venue?: string | null;
    issueTags?: string[];
    evidence?: EvidenceLink[];
  }>;
  governmentActions?: Array<{
    actionId?: string;
    actionType: string;
    title: string;
    identifier?: string | null;
    date?: string | null;
    role?: string | null;
    status?: string | null;
    summary?: string | null;
    issueTags?: string[];
    evidence?: EvidenceLink[];
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
    completeness?: number | null;
    pillars?: Array<{
      name: string;
      status: string;
      score?: number | null;
      analysis?: string | null;
    }>;
  }>;
  financialDisclosures?: Array<{
    disclosureId?: string;
    period: string;
    filingDate?: string | null;
    estimatedNetWorthMin?: number | null;
    estimatedNetWorthMax?: number | null;
    incomeSources?: string[];
    assetSummary?: string | null;
    liabilitySummary?: string | null;
    businessInterestSummary?: string | null;
  }>;
  integrityMatters?: Array<{
    matterId?: string;
    matterType: string;
    proceduralStatus: string;
    title: string;
    authority?: string | null;
    summary?: string | null;
    officialResponse?: string | null;
    finalDisposition?: string | null;
    humanReviewed?: boolean;
  }>;
  relationships?: Array<{
    relationshipType: string;
    relatedName: string;
    relevanceNote?: string | null;
    conflictFlag?: boolean | null;
  }>;
  newsAndMedia?: Array<{
    title: string;
    url?: string | null;
    publishedAt?: string | null;
    sourceName?: string | null;
    summary?: string | null;
  }>;
  petitions?: Array<{
    title: string;
    status?: string | null;
    signatureCount?: number | null;
  }>;
  recentActivity?: Array<{
    eventType: string;
    title: string;
    occurredAt?: string | null;
    summary?: string | null;
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

function baselineSeatId(record: BaselineRecord): string {
  return slugify([
    record.stateCode ?? record.jurisdictionName ?? 'unknown',
    record.governmentLevel,
    record.chamber ?? record.branch ?? 'office',
    record.officeTitle,
    record.districtNumber ?? 'at-large',
  ].join('-'));
}

function baselineToOfficial(record: BaselineRecord): OfficialProfile | null {
  if (record.recordKind === 'vacancy' || record.stateCode !== 'FL') return null;
  if (record.extractionStatus !== 'extracted_unreviewed') return null;

  const name = normalizeDisplayName(record);
  const jurisdictionName = record.stateName ?? (record.stateCode === 'FL' ? 'Florida' : record.jurisdictionName) ?? 'Florida';
  const sourceMemberUrl = record.sourceMemberUrl || record.sourceUrl;
  const contactPoints: OfficialProfile['contactPoints'] = [];
  const seatName = record.districtNumber ? `${record.officeTitle.replace(/,?\s*District\s*\d+$/i, '')}, District ${record.districtNumber}` : record.officeTitle;

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
    seat: {
      seatId: baselineSeatId(record),
      seatName,
      seatType: record.chamber ?? record.branch ?? record.governmentLevel,
      occupancyStatus: 'occupied',
      successionMethod: 'Election or lawful succession; verification queued',
      nextElectionDate: null,
      previousOccupants: [],
    },
    person: {
      displayName: name.displayName,
      firstName: name.firstName,
      lastName: name.lastName,
      portraitUrl: null,
      portraitSourceUrl: null,
      portraitCredit: null,
      portraitLicense: null,
      portraitSha256: null,
    },
    office: {
      title: record.officeTitle,
      shortTitle: null,
      governmentLevel: record.governmentLevel,
      branch: record.branch ?? null,
      chamber: record.chamber ?? null,
      seatName,
      districtName: record.districtNumber ? `District ${record.districtNumber}` : jurisdictionName,
      districtNumber: record.districtNumber ?? null,
      authoritySummary: null,
      responsibilities: [],
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
    officeLocations: [],
    socialAccounts: [],
    education: [],
    militaryService: [],
    careerHistory: [],
    politicalHistory: [],
    committeesAndAppointments: [],
    elections: [],
    promises: [],
    statements: [],
    governmentActions: [],
    civicScores: [],
    performanceMetrics: [],
    issueTrackers: [],
    financialDisclosures: [],
    integrityMatters: [],
    relationships: [],
    newsAndMedia: [],
    petitions: [],
    recentActivity: [],
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

