import { CivicError, StoreWriteError } from "./errors.ts";
import { newId, normalizePersonName, uuidFromName } from "./ids.ts";
import { canTransitionClaim, isPublicationEligible, transitionClaim } from "./claims.ts";
import { hasActiveJob } from "./jobs.ts";
import { matchPerson, reusePersonForWinningCandidate } from "./matching.ts";
import type {
  CandidateCampaignRecord,
  ClaimRecord,
  ClaimStatus,
  ElectionRecord,
  EvidenceRecord,
  JobRecord,
  JobRoute,
  JobStatus,
  JurisdictionRecord,
  MonitoringStateRecord,
  OccupancyRecord,
  PersonRecord,
  RawRetrievalRecord,
  ResearchContractFieldRecord,
  ResearchContractRecord,
  SeatRecord,
  SourceRecord,
  WorkerRunRecord,
} from "./types.ts";

export type ScheduleJobInput = {
  dedupeKey: string;
  route: JobRoute;
  sourceKey?: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  scheduledFor?: string;
};

export type CivicStore = {
  upsertJurisdiction(input: Omit<JurisdictionRecord, "id"> & { id?: string }): Promise<JurisdictionRecord>;
  upsertSeat(input: Omit<SeatRecord, "id"> & { id?: string }): Promise<SeatRecord>;
  upsertPerson(input: Omit<PersonRecord, "id" | "normalizedName"> & { id?: string; normalizedName?: string }): Promise<PersonRecord>;
  upsertOccupancy(input: Omit<OccupancyRecord, "id"> & { id?: string }): Promise<OccupancyRecord>;
  upsertElection(input: Omit<ElectionRecord, "id"> & { id?: string }): Promise<ElectionRecord>;
  upsertCandidateCampaign(input: Omit<CandidateCampaignRecord, "id"> & { id?: string }): Promise<CandidateCampaignRecord>;
  recordSource(input: Omit<SourceRecord, "id"> & { id?: string }): Promise<SourceRecord>;
  recordRawRetrieval(input: Omit<RawRetrievalRecord, "id"> & { id?: string }): Promise<RawRetrievalRecord>;
  recordEvidence(input: Omit<EvidenceRecord, "id"> & { id?: string }): Promise<EvidenceRecord>;
  recordClaim(input: Omit<ClaimRecord, "id" | "publicationEligible"> & { id?: string; publicationEligible?: boolean }): Promise<ClaimRecord>;
  transitionClaim(claimId: string, to: ClaimStatus): Promise<ClaimRecord>;
  attachClaimEvidence(claimId: string, evidenceId: string, relation?: string): Promise<void>;
  recordValidationRun(input: { claimId?: string; jobId?: string; result: string; detail?: Record<string, unknown> }): Promise<void>;
  recordContradiction(input: { claimId: string; conflictingClaimId?: string; summary: string }): Promise<void>;
  upsertMonitoringState(input: Omit<MonitoringStateRecord, "id"> & { id?: string }): Promise<MonitoringStateRecord>;
  upsertResearchContract(input: Omit<ResearchContractRecord, "id"> & { id?: string }): Promise<ResearchContractRecord>;
  upsertResearchContractField(input: Omit<ResearchContractFieldRecord, "id"> & { id?: string }): Promise<ResearchContractFieldRecord>;
  scheduleJob(input: ScheduleJobInput): Promise<{ job: JobRecord; created: boolean }>;
  leaseJob(jobId: string, owner: string, leaseMs?: number): Promise<JobRecord | undefined>;
  completeJob(jobId: string, status?: Extract<JobStatus, "completed" | "routed_heavy">): Promise<JobRecord>;
  failJob(jobId: string, errorClass: string, errorMessage: string, deadLettered?: boolean): Promise<JobRecord>;
  recordWorkerRun(input: Omit<WorkerRunRecord, "id"> & { id?: string }): Promise<WorkerRunRecord>;
  getDueJobs(now: Date, limit?: number): Promise<JobRecord[]>;
  getJobByDedupe(dedupeKey: string): Promise<JobRecord | undefined>;
  getJob(jobId: string): Promise<JobRecord | undefined>;
  listJurisdictions(): Promise<JurisdictionRecord[]>;
  listSeats(): Promise<SeatRecord[]>;
  listPersons(): Promise<PersonRecord[]>;
  listOccupancies(): Promise<OccupancyRecord[]>;
  listElections(): Promise<ElectionRecord[]>;
  listCampaigns(): Promise<CandidateCampaignRecord[]>;
  listClaims(): Promise<ClaimRecord[]>;
  listEvidence(): Promise<EvidenceRecord[]>;
  listRetrievals(): Promise<RawRetrievalRecord[]>;
  listContradictions(): Promise<Array<{ claimId: string; summary: string }>>;
  listSources(): Promise<SourceRecord[]>;
  listJobs(): Promise<JobRecord[]>;
  listWorkerRuns(): Promise<WorkerRunRecord[]>;
  listMonitoringState(): Promise<MonitoringStateRecord[]>;
  listResearchContracts(): Promise<ResearchContractRecord[]>;
  listResearchContractFields(): Promise<ResearchContractFieldRecord[]>;
  getClaim(claimId: string): Promise<ClaimRecord | undefined>;
  getRetrieval(retrievalId: string): Promise<RawRetrievalRecord | undefined>;
};

type MemoryTables = {
  jurisdictions: Map<string, JurisdictionRecord>;
  seats: Map<string, SeatRecord>;
  persons: Map<string, PersonRecord>;
  occupancies: Map<string, OccupancyRecord>;
  elections: Map<string, ElectionRecord>;
  campaigns: Map<string, CandidateCampaignRecord>;
  sources: Map<string, SourceRecord>;
  retrievals: Map<string, RawRetrievalRecord>;
  evidence: Map<string, EvidenceRecord>;
  claims: Map<string, ClaimRecord>;
  claimEvidence: Array<{ claimId: string; evidenceId: string }>;
  contradictions: Array<{ claimId: string; conflictingClaimId?: string; summary: string }>;
  monitoring: Map<string, MonitoringStateRecord>;
  contracts: Map<string, ResearchContractRecord>;
  contractFields: Map<string, ResearchContractFieldRecord>;
  jobs: Map<string, JobRecord>;
  workerRuns: WorkerRunRecord[];
};

export function createMemoryStore(): CivicStore & { tables: MemoryTables } {
  const tables: MemoryTables = {
    jurisdictions: new Map(),
    seats: new Map(),
    persons: new Map(),
    occupancies: new Map(),
    elections: new Map(),
    campaigns: new Map(),
    sources: new Map(),
    retrievals: new Map(),
    evidence: new Map(),
    claims: new Map(),
    claimEvidence: [],
    contradictions: [],
    monitoring: new Map(),
    contracts: new Map(),
    contractFields: new Map(),
    jobs: new Map(),
    workerRuns: [],
  };

  const byKey = <T extends { id: string }>(map: Map<string, T>, key: string, current: T): T => {
    for (const item of map.values()) {
      if ((item as T & { [k: string]: unknown })[key as string] === (current as T & { [k: string]: unknown })[key as string]) {
        const merged = { ...item, ...current, id: item.id };
        map.set(item.id, merged);
        return merged;
      }
    }
    map.set(current.id, current);
    return current;
  };

  const store: CivicStore & { tables: MemoryTables } = {
    tables,
    async upsertJurisdiction(input) {
      const id = input.id ?? (await uuidFromName(`jurisdiction:${input.jurisdictionKey}`));
      return byKey(tables.jurisdictions, "jurisdictionKey", { ...input, id });
    },
    async upsertSeat(input) {
      const id = input.id ?? (await uuidFromName(`seat:${input.seatKey}`));
      return byKey(tables.seats, "seatKey", { ...input, id });
    },
    async upsertPerson(input) {
      const normalizedName = input.normalizedName ?? normalizePersonName(input.displayName);
      const existing = matchPerson([...tables.persons.values()], {
        personKey: input.personKey,
        normalizedName,
      }).record;
      const occupantReuse = reusePersonForWinningCandidate({ existingPerson: existing });
      if (occupantReuse) {
        const merged = {
          ...occupantReuse,
          ...input,
          id: occupantReuse.id,
          personKey: occupantReuse.personKey,
          normalizedName: occupantReuse.normalizedName,
        };
        tables.persons.set(occupantReuse.id, merged);
        return merged;
      }
      const id = input.id ?? (await uuidFromName(`person:${input.personKey}`));
      const record = { ...input, id, normalizedName };
      tables.persons.set(id, record);
      return record;
    },
    async upsertOccupancy(input) {
      for (const item of tables.occupancies.values()) {
        if (item.seatId === input.seatId && item.personId === input.personId && item.startedOn === input.startedOn) {
          const merged = { ...item, ...input, id: item.id };
          tables.occupancies.set(item.id, merged);
          return merged;
        }
      }
      const id = input.id ?? newId();
      const record = { ...input, id };
      tables.occupancies.set(id, record);
      return record;
    },
    async upsertElection(input) {
      const id = input.id ?? (await uuidFromName(`election:${input.electionKey}`));
      return byKey(tables.elections, "electionKey", { ...input, id });
    },
    async upsertCandidateCampaign(input) {
      for (const item of tables.campaigns.values()) {
        if (item.electionId === input.electionId && item.seatId === input.seatId && item.personId === input.personId) {
          const merged = { ...item, ...input, id: item.id };
          tables.campaigns.set(item.id, merged);
          return merged;
        }
      }
      const id = input.id ?? (await uuidFromName(`campaign:${input.campaignKey}`));
      const record = { ...input, id };
      tables.campaigns.set(id, record);
      return record;
    },
    async recordSource(input) {
      const id = input.id ?? (await uuidFromName(`source:${input.sourceKey}`));
      return byKey(tables.sources, "sourceKey", { ...input, id });
    },
    async recordRawRetrieval(input) {
      for (const item of tables.retrievals.values()) {
        if (item.sourceId === input.sourceId && item.contentSha256 === input.contentSha256) {
          const merged = { ...item, ...input, id: item.id };
          tables.retrievals.set(item.id, merged);
          return merged;
        }
      }
      const id = input.id ?? newId();
      const record = { ...input, id };
      tables.retrievals.set(id, record);
      return record;
    },
    async recordEvidence(input) {
      const id = input.id ?? newId();
      const record = { ...input, id };
      tables.evidence.set(id, record);
      return record;
    },
    async recordClaim(input) {
      for (const item of tables.claims.values()) {
        if (item.claimKey === input.claimKey) {
          const merged = { ...item, ...input, id: item.id, publicationEligible: input.publicationEligible ?? item.publicationEligible };
          tables.claims.set(item.id, merged);
          return merged;
        }
      }
      const id = input.id ?? (await uuidFromName(`claim:${input.claimKey}`));
      const record = { ...input, id, publicationEligible: input.publicationEligible ?? false };
      tables.claims.set(id, record);
      return record;
    },
    async transitionClaim(claimId, to) {
      const claim = tables.claims.get(claimId);
      if (!claim) throw new StoreWriteError(`claim ${claimId} not found`);
      if (!canTransitionClaim(claim.status, to)) {
        throw new CivicError("illegal_claim_transition", `cannot move ${claim.status} → ${to}`);
      }
      const next = {
        ...claim,
        status: transitionClaim(claim.status, to),
        publicationEligible: isPublicationEligible({
          status: to,
          hasEvidence: tables.claimEvidence.some((row) => row.claimId === claimId),
          hasContradiction: tables.contradictions.some((row) => row.claimId === claimId),
          entityMatched: Boolean(claim.seatId && claim.personId),
        }),
      };
      tables.claims.set(claimId, next);
      return next;
    },
    async attachClaimEvidence(claimId, evidenceId) {
      if (!tables.claimEvidence.some((row) => row.claimId === claimId && row.evidenceId === evidenceId)) {
        tables.claimEvidence.push({ claimId, evidenceId });
      }
    },
    async recordValidationRun() {
      return;
    },
    async recordContradiction(input) {
      tables.contradictions.push(input);
    },
    async upsertMonitoringState(input) {
      const key = `${input.entityType}:${input.entityKey}:${input.checkClass}`;
      const existing = [...tables.monitoring.values()].find(
        (item) => item.entityType === input.entityType && item.entityKey === input.entityKey && item.checkClass === input.checkClass,
      );
      const record = { ...existing, ...input, id: existing?.id ?? input.id ?? (await uuidFromName(`monitor:${key}`)) };
      tables.monitoring.set(record.id, record);
      return record;
    },
    async upsertResearchContract(input) {
      const id = input.id ?? (await uuidFromName(`contract:${input.contractKey}`));
      return byKey(tables.contracts, "contractKey", { ...input, id });
    },
    async upsertResearchContractField(input) {
      const existing = [...tables.contractFields.values()].find(
        (item) => item.contractId === input.contractId && item.fieldKey === input.fieldKey,
      );
      const record = { ...existing, ...input, id: existing?.id ?? input.id ?? newId() };
      tables.contractFields.set(record.id, record);
      return record;
    },
    async scheduleJob(input) {
      const jobs = [...tables.jobs.values()];
      if (hasActiveJob(jobs, input.dedupeKey)) {
        const existing = jobs.find((job) => job.dedupeKey === input.dedupeKey && ["pending", "leased", "running"].includes(job.status));
        if (!existing) throw new StoreWriteError("active job disappeared during dedupe");
        return { job: existing, created: false };
      }
      const job: JobRecord = {
        id: await uuidFromName(`job:${input.dedupeKey}:${input.scheduledFor ?? "open"}`),
        dedupeKey: input.dedupeKey,
        route: input.route,
        status: "pending",
        sourceKey: input.sourceKey,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload ?? {},
        attemptCount: 0,
        scheduledFor: input.scheduledFor ?? new Date().toISOString(),
      };
      tables.jobs.set(job.id, job);
      return { job, created: true };
    },
    async leaseJob(jobId, owner, leaseMs = 15 * 60 * 1000) {
      const job = tables.jobs.get(jobId);
      if (!job) return undefined;
      if (!["pending", "leased"].includes(job.status)) return undefined;
      if (job.status === "leased" && job.leaseExpiresAt && Date.parse(job.leaseExpiresAt) > Date.now() && job.leaseOwner !== owner) {
        return undefined;
      }
      const now = new Date();
      const leased: JobRecord = {
        ...job,
        status: "leased",
        leaseOwner: owner,
        leasedAt: now.toISOString(),
        leaseExpiresAt: new Date(now.getTime() + leaseMs).toISOString(),
        startedAt: now.toISOString(),
        attemptCount: job.attemptCount + 1,
      };
      tables.jobs.set(jobId, leased);
      return leased;
    },
    async completeJob(jobId, status = "completed") {
      const job = tables.jobs.get(jobId);
      if (!job) throw new StoreWriteError(`job ${jobId} not found`);
      const completed = { ...job, status, completedAt: new Date().toISOString(), leaseOwner: undefined };
      tables.jobs.set(jobId, completed);
      return completed;
    },
    async failJob(jobId, errorClass, errorMessage, deadLettered = false) {
      const job = tables.jobs.get(jobId);
      if (!job) throw new StoreWriteError(`job ${jobId} not found`);
      const failed = {
        ...job,
        status: deadLettered ? "dead_lettered" : "failed",
        lastErrorClass: errorClass,
        lastErrorMessage: errorMessage,
        completedAt: new Date().toISOString(),
      } as JobRecord;
      tables.jobs.set(jobId, failed);
      return failed;
    },
    async recordWorkerRun(input) {
      const record = { ...input, id: input.id ?? newId() };
      tables.workerRuns.push(record);
      return record;
    },
    async getDueJobs(now, limit = 50) {
      return [...tables.jobs.values()]
        .filter((job) => job.status === "pending" && Date.parse(job.scheduledFor) <= now.getTime())
        .slice(0, limit);
    },
    async getJobByDedupe(dedupeKey) {
      return [...tables.jobs.values()].find((job) => job.dedupeKey === dedupeKey);
    },
    async getJob(jobId) {
      return tables.jobs.get(jobId);
    },
    async listJurisdictions() {
      return [...tables.jurisdictions.values()];
    },
    async listSeats() {
      return [...tables.seats.values()];
    },
    async listPersons() {
      return [...tables.persons.values()];
    },
    async listOccupancies() {
      return [...tables.occupancies.values()];
    },
    async listElections() {
      return [...tables.elections.values()];
    },
    async listCampaigns() {
      return [...tables.campaigns.values()];
    },
    async listClaims() {
      return [...tables.claims.values()];
    },
    async listEvidence() {
      return [...tables.evidence.values()];
    },
    async listRetrievals() {
      return [...tables.retrievals.values()];
    },
    async listContradictions() {
      return tables.contradictions;
    },
    async listSources() {
      return [...tables.sources.values()];
    },
    async listJobs() {
      return [...tables.jobs.values()];
    },
    async listWorkerRuns() {
      return tables.workerRuns;
    },
    async listMonitoringState() {
      return [...tables.monitoring.values()];
    },
    async listResearchContracts() {
      return [...tables.contracts.values()];
    },
    async listResearchContractFields() {
      return [...tables.contractFields.values()];
    },
    async getClaim(claimId) {
      return tables.claims.get(claimId);
    },
    async getRetrieval(retrievalId) {
      return tables.retrievals.get(retrievalId);
    },
  };
  return store;
}

export function isWorkerActive(runs: WorkerRunRecord[], now: Date, windowMs = 24 * 60 * 60 * 1000): boolean {
  return runs.some(
    (run) =>
      run.status === "succeeded" &&
      run.completedAt &&
      now.getTime() - Date.parse(run.completedAt) <= windowMs &&
      (run.recordsWritten > 0 || run.recordsRead > 0),
  );
}
