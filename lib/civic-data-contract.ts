/**
 * CivicLenZ UI data contract
 *
 * Google AI Studio (or any production backend) should implement this contract
 * behind a server-side data provider. The wireframe branch intentionally uses
 * local demonstration data so it never publishes an unverified claim.
 */

export type GovernmentLevel = 'Federal' | 'State' | 'Local' | 'School Board';
export type RecordStatus = 'verified' | 'incomplete' | 'contested' | 'under_review';
export type PromiseStatus = 'kept' | 'in_progress' | 'needs_review' | 'not_started';

export type SourceRecord = {
  id: string;
  title: string;
  publisher: string;
  publishedAt: string;
  url: string;
  recordStatus: RecordStatus;
};

export type OfficialContact = {
  phone?: string;
  email?: string;
  website?: string;
  officeAddress?: string;
  socialLinks?: Array<{ label: string; url: string }>;
};

export type OfficialMetrics = {
  accountabilityScore?: number;
  scoreLabel?: string;
  votesCast?: number;
  billsSponsored?: number;
  promisesTracked?: number;
  missedVotesPercent?: number;
};

export type CivicOfficial = {
  id: string;
  slug: string;
  fullName: string;
  title: string;
  governmentLevel: GovernmentLevel;
  jurisdiction: string;
  district?: string;
  party?: string;
  photoUrl?: string;
  nextElection?: string;
  currentOfficeStart?: string;
  contact: OfficialContact;
  metrics: OfficialMetrics;
  biography?: string;
  education?: string[];
  experience?: string[];
  sources?: SourceRecord[];
};

export type RepresentationMapPoint = {
  officialId: string;
  governmentLevel: GovernmentLevel;
  latitude: number;
  longitude: number;
  label: string;
};

export type RepresentationResult = {
  canonicalAddress: string;
  latitude: number;
  longitude: number;
  officials: CivicOfficial[];
  mapPoints: RepresentationMapPoint[];
  addressStatus: 'matched' | 'unsupported' | 'not_found';
};

export type OfficialActivity = {
  id: string;
  officialId: string;
  category: 'vote' | 'bill' | 'promise' | 'statement' | 'news' | 'meeting';
  title: string;
  summary?: string;
  occurredAt: string;
  source?: SourceRecord;
  reviewStatus: RecordStatus;
};

export type OfficialPromise = {
  id: string;
  officialId: string;
  title: string;
  originalStatement?: string;
  status: PromiseStatus;
  statusUpdatedAt: string;
  rationale?: string;
  sources: SourceRecord[];
};

export type PetitionRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  targetOfficialIds: string[];
  currentSignatures: number;
  signatureGoal: number;
  createdAt: string;
  status: 'active' | 'closed' | 'under_review';
  sources?: SourceRecord[];
};

export type MemberDashboard = {
  watchedOfficialIds: string[];
  unreadAlertCount: number;
  alerts: OfficialActivity[];
  recentActivity: OfficialActivity[];
  followedIssues: string[];
};

/**
 * The production implementation should live behind authenticated API routes.
 * Keep database credentials, Google keys, email services, and AI tools on the
 * server; browser components should consume only safe response data.
 */
export interface CivicLenZDataProvider {
  findRepresentation(address: string): Promise<RepresentationResult>;
  listOfficials(filters?: { level?: GovernmentLevel; query?: string }): Promise<CivicOfficial[]>;
  getOfficial(slug: string): Promise<CivicOfficial | null>;
  getOfficialActivity(officialId: string): Promise<OfficialActivity[]>;
  getOfficialPromises(officialId: string): Promise<OfficialPromise[]>;
  listPetitions(filters?: { status?: PetitionRecord['status'] }): Promise<PetitionRecord[]>;
  getMemberDashboard(memberId: string): Promise<MemberDashboard>;
}
