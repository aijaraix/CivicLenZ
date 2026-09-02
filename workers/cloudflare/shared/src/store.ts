import { CivicError, StoreWriteError } from "./errors.ts";
import { valueHash } from "./hash.ts";
import { isUuid, newId, uuidFromName } from "./ids.ts";
import { canTransitionClaim, transitionClaim } from "./claims.ts";
import { hasActiveJob, jobDedupeKey } from "./jobs.ts";
import { demoteOccupancy, findOccupancy, occupanciesToDemote } from "./occupancy.ts";
import {
  mergeExternalIdentifiers,
  personIdFromExternalIdentifiers,
  resolveExistingPerson,
  type UpsertPersonInput,
} from "./persons.ts";
import type {
  CandidateCampaignRecord,
  ClaimEvidenceRecord,
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
  seatId?: string;
  sourceId?: string;
  payload?: Record<string, unknown>;
  scheduledFor?: string;
  priority?: number;
};

export type CivicStore = {
  upsertJurisdiction(input: Omit<JurisdictionRecord, "jurisdictionId"> & { jurisdictionId?: string }): Promise<JurisdictionRecord>;
  upsertSeat(input: Omit<SeatRecord, "seatId"> & { seatId?: string }): Promise<SeatRecord>;
  upsertPerson(input: UpsertPersonInput): Promise<PersonRecord>;
  upsertOccupancy(input: Omit<OccupancyRecord, "occupancyId"> & { occupancyId?: string }): Promise<OccupancyRecord>;
  upsertElection(input: Omit<ElectionRecord, "electionId"> & { electionId?: string; seatId: string }): Promise<ElectionRecord>;
  upsertCandidateCampaign(input: Omit<CandidateCampaignRecord, "candidateCampaignId"> & { candidateCampaignId?: string }): Promise<CandidateCampaignRecord>;
  recordSource(input: Omit<SourceRecord, "sourceId"> & { sourceId?: string }): Promise<SourceRecord>;
  recordRawRetrieval(input: Omit<RawRetrievalRecord, "retrievalId"> & { retrievalId?: string }): Promise<RawRetrievalRecord>;
  recordEvidence(input: Omit<EvidenceRecord, "evidenceId"> & { evidenceId?: string }): Promise<EvidenceRecord>;
  recordClaim(input: Omit<ClaimRecord, "claimId"> & { claimId?: string; subjectType: string; subjectId: string }): Promise<ClaimRecord>;
  transitionClaim(claimId: string, to: ClaimStatus): Promise<ClaimRecord>;
  attachClaimEvidence(claimId: string, evidenceId: string, role?: string): Promise<void>;
  recordValidationRun(input: {
    validationRunId?: string;
    subjectType?: string;
    subjectId?: string;
    seatId?: string;
    validatorKey: string;
    status: string;
    inputSummary?: Record<string, unknown>;
    resultSummary?: Record<string, unknown>;
    startedAt?: string;
    completedAt?: string;
  }): Promise<void>;
  recordContradiction(input: {
    contradictionId?: string;
    subjectType?: string;
    subjectId?: string;
    seatId?: string;
    fieldKey?: string;
    claimIds: string[];
    status?: string;
    severity?: string;
  }): Promise<void>;
  upsertMonitoringState(input: Omit<MonitoringStateRecord, "monitoringStateId" | "consecutiveFailures" | "configuration"> & {
    monitoringStateId?: string;
    consecutiveFailures?: number;
    configuration?: Record<string, unknown>;
  }): Promise<MonitoringStateRecord>;
  upsertResearchContract(input: Omit<ResearchContractRecord, "researchContractId"> & { researchContractId?: string }): Promise<ResearchContractRecord>;
  upsertResearchContractField(input: Omit<ResearchContractFieldRecord, "researchContractFieldId"> & { researchContractFieldId?: string }): Promise<ResearchContractFieldRecord>;
  scheduleJob(input: ScheduleJobInput): Promise<{ job: JobRecord; created: boolean }>;
  leaseJob(jobId: string, owner: string, leaseMs?: number): Promise<JobRecord | undefined>;
  leaseDueJob(owner: string, leaseMs?: number): Promise<JobRecord | undefined>;
  completeJob(jobId: string, status?: Extract<JobStatus, "succeeded">): Promise<JobRecord>;
  failJob(jobId: string, errorClass: string, errorMessage: string, deadLettered?: boolean): Promise<JobRecord>;
  recordWorkerRun(input: Omit<WorkerRunRecord, "workerRunId"> & { workerRunId?: string }): Promise<WorkerRunRecord>;
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
  listClaimEvidence(): Promise<ClaimEvidenceRecord[]>;
  listContradictions(): Promise<Array<{ claimIds: string[]; fieldKey?: string; severity?: string }>>;
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
  claimEvidence: ClaimEvidenceRecord[];
  contradictions: Array<{ claimIds: string[]; fieldKey?: string; severity?: string }>;
  monitoring: Map<string, MonitoringStateRecord>;
  contracts: Map<string, ResearchContractRecord>;
  contractFields: Map<string, ResearchContractFieldRecord>;
  jobs: Map<string, JobRecord>;
  workerRuns: WorkerRunRecord[];
};

function isLeasable(job: JobRecord, nowMs: number): boolean {
  if (job.status === "queued") return Date.parse(job.scheduledFor) <= nowMs;
  if (job.status === "leased") return Boolean(job.leaseExpiresAt && Date.parse(job.leaseExpiresAt) < nowMs);
  return false;
}

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

  let leaseTail = Promise.resolve();
  const serializeLease = <T>(fn: () => T | Promise<T>): Promise<T> => {
    const run = leaseTail.then(fn, fn);
    leaseTail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  let personTail = Promise.resolve();
  const serializePerson = <T>(fn: () => T | Promise<T>): Promise<T> => {
    const run = personTail.then(fn, fn);
    personTail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  const claimLease = (job: JobRecord, owner: string, leaseMs: number): JobRecord => {
    const now = new Date();
    const leased: JobRecord = {
      ...job,
      status: "leased",
      leasedBy: owner,
      leaseExpiresAt: new Date(now.getTime() + leaseMs).toISOString(),
      startedAt: job.startedAt ?? now.toISOString(),
      attemptCount: job.attemptCount + 1,
    };
    tables.jobs.set(job.jobId, leased);
    return leased;
  };

  const store: CivicStore & { tables: MemoryTables } = {
    tables,
    async upsertJurisdiction(input) {
      const existing = [...tables.jurisdictions.values()].find(
        (item) => item.jurisdictionKey === input.jurisdictionKey,
      );
      const jurisdictionId =
        existing?.jurisdictionId ?? input.jurisdictionId ?? (await uuidFromName(`jurisdiction:${input.jurisdictionKey}`));
      const record: JurisdictionRecord = {
        ...existing,
        ...input,
        jurisdictionId,
        status: input.status ?? existing?.status ?? "active",
      };
      tables.jurisdictions.set(record.jurisdictionId, record);
      return record;
    },
    async upsertSeat(input) {
      const existing = [...tables.seats.values()].find((item) => item.seatKey === input.seatKey);
      const seatId = existing?.seatId ?? input.seatId ?? (await uuidFromName(`seat:${input.seatKey}`));
      const record: SeatRecord = {
        ...existing,
        ...input,
        seatId,
        occupancyStatus: input.occupancyStatus ?? existing?.occupancyStatus ?? "unknown",
        baselineStatus: input.baselineStatus ?? existing?.baselineStatus ?? "unknown",
        monitoringActive: input.monitoringActive ?? existing?.monitoringActive ?? false,
      };
      tables.seats.set(record.seatId, record);
      return record;
    },
    async upsertPerson(input) {
      return serializePerson(async () => {
        const existing = resolveExistingPerson({
          people: [...tables.persons.values()],
          occupancies: [...tables.occupancies.values()],
          seats: [...tables.seats.values()],
          candidate: input,
        });
        if (existing) {
          const merged: PersonRecord = {
            ...existing,
            ...input,
            personId: existing.personId,
            canonicalName: existing.canonicalName,
            externalIdentifiers: mergeExternalIdentifiers(existing.externalIdentifiers, input.externalIdentifiers),
          };
          tables.persons.set(existing.personId, merged);
          return merged;
        }
        const personId =
          input.personId ?? (await personIdFromExternalIdentifiers(input.externalIdentifiers)) ?? newId();
        const collision = tables.persons.get(personId);
        if (collision) {
          const merged: PersonRecord = {
            ...collision,
            ...input,
            personId: collision.personId,
            canonicalName: collision.canonicalName,
            externalIdentifiers: mergeExternalIdentifiers(collision.externalIdentifiers, input.externalIdentifiers),
          };
          tables.persons.set(collision.personId, merged);
          return merged;
        }
        const record: PersonRecord = {
          ...input,
          personId,
          externalIdentifiers: input.externalIdentifiers,
        };
        tables.persons.set(personId, record);
        return record;
      });
    },
    async upsertOccupancy(input) {
      const existing = findOccupancy([...tables.occupancies.values()], input);
      const occupancyId = existing?.occupancyId ?? input.occupancyId ?? newId();
      for (const row of occupanciesToDemote([...tables.occupancies.values()], {
        seatId: input.seatId,
        keepOccupancyId: occupancyId,
        nextStatus: input.occupancyStatus,
      })) {
        tables.occupancies.set(row.occupancyId, demoteOccupancy(row, input.startDate));
      }
      const record: OccupancyRecord = {
        ...existing,
        ...input,
        occupancyId,
      };
      tables.occupancies.set(record.occupancyId, record);
      return record;
    },
    async upsertElection(input) {
      const existing = [...tables.elections.values()].find((item) => item.electionKey === input.electionKey);
      const electionId = existing?.electionId ?? input.electionId ?? (await uuidFromName(`election:${input.electionKey}`));
      const record: ElectionRecord = { ...existing, ...input, electionId };
      tables.elections.set(record.electionId, record);
      return record;
    },
    async upsertCandidateCampaign(input) {
      for (const item of tables.campaigns.values()) {
        if (item.electionId === input.electionId && item.seatId === input.seatId && item.personId === input.personId) {
          const merged = { ...item, ...input, candidateCampaignId: item.candidateCampaignId };
          tables.campaigns.set(item.candidateCampaignId, merged);
          return merged;
        }
      }
      const record: CandidateCampaignRecord = {
        ...input,
        candidateCampaignId:
          input.candidateCampaignId ?? (await uuidFromName(`campaign:${input.electionId}:${input.seatId}:${input.personId}`)),
      };
      tables.campaigns.set(record.candidateCampaignId, record);
      return record;
    },
    async recordSource(input) {
      const existing = [...tables.sources.values()].find((item) => item.sourceKey === input.sourceKey);
      const record: SourceRecord = {
        ...existing,
        ...input,
        sourceId: existing?.sourceId ?? input.sourceId ?? (await uuidFromName(`source:${input.sourceKey}`)),
        active: input.active ?? existing?.active ?? true,
        healthState: input.healthState ?? existing?.healthState ?? "unknown",
      };
      tables.sources.set(record.sourceId, record);
      return record;
    },
    async recordRawRetrieval(input) {
      for (const item of tables.retrievals.values()) {
        if (item.sourceId === input.sourceId && item.contentHash === input.contentHash) {
          const merged = { ...item, ...input, retrievalId: item.retrievalId };
          tables.retrievals.set(item.retrievalId, merged);
          return merged;
        }
      }
      const record: RawRetrievalRecord = { ...input, retrievalId: input.retrievalId ?? newId() };
      tables.retrievals.set(record.retrievalId, record);
      return record;
    },
    async recordEvidence(input) {
      const record: EvidenceRecord = { ...input, evidenceId: input.evidenceId ?? newId() };
      tables.evidence.set(record.evidenceId, record);
      return record;
    },
    async recordClaim(input) {
      const hash = input.valueHash ?? (await valueHash(input.fieldKey, input.normalizedValue ?? input.displayValue ?? ""));
      const existing = [...tables.claims.values()].find(
        (item) =>
          item.subjectType === input.subjectType &&
          item.subjectId === input.subjectId &&
          item.fieldKey === input.fieldKey &&
          item.valueHash === hash,
      );
      const now = new Date().toISOString();
      const record: ClaimRecord = {
        ...existing,
        ...input,
        claimId: existing?.claimId ?? input.claimId ?? (await uuidFromName(`claim:${input.subjectType}:${input.subjectId}:${input.fieldKey}:${hash}`)),
        valueHash: hash,
        firstSeenAt: existing?.firstSeenAt ?? input.firstSeenAt ?? now,
        lastSeenAt: input.lastSeenAt ?? now,
      };
      tables.claims.set(record.claimId, record);
      return record;
    },
    async transitionClaim(claimId, to) {
      const claim = tables.claims.get(claimId);
      if (!claim) throw new StoreWriteError(`claim ${claimId} not found`);
      if (!canTransitionClaim(claim.verificationState, to)) {
        throw new CivicError("illegal_claim_transition", `cannot move ${claim.verificationState} → ${to}`);
      }
      const next = { ...claim, verificationState: transitionClaim(claim.verificationState, to) };
      tables.claims.set(claimId, next);
      return next;
    },
    async attachClaimEvidence(claimId, evidenceId, role = "supports") {
      if (!tables.claimEvidence.some((row) => row.claimId === claimId && row.evidenceId === evidenceId)) {
        tables.claimEvidence.push({ claimId, evidenceId, role });
      }
    },
    async recordValidationRun() {
      return;
    },
    async recordContradiction(input) {
      tables.contradictions.push({ claimIds: input.claimIds, fieldKey: input.fieldKey, severity: input.severity });
    },
    async upsertMonitoringState(input) {
      const existing = [...tables.monitoring.values()].find(
        (item) =>
          item.targetType === input.targetType &&
          item.targetId === input.targetId &&
          item.monitoringClass === input.monitoringClass,
      );
      const record: MonitoringStateRecord = {
        ...existing,
        ...input,
        monitoringStateId:
          existing?.monitoringStateId ??
          input.monitoringStateId ??
          (await uuidFromName(`monitor:${input.targetType}:${input.targetId}:${input.monitoringClass}`)),
        consecutiveFailures: input.consecutiveFailures ?? existing?.consecutiveFailures ?? 0,
        configuration: input.configuration ?? existing?.configuration ?? {},
      };
      tables.monitoring.set(record.monitoringStateId, record);
      return record;
    },
    async upsertResearchContract(input) {
      const existing = [...tables.contracts.values()].find((item) => item.contractKey === input.contractKey);
      const record: ResearchContractRecord = {
        ...existing,
        ...input,
        researchContractId:
          existing?.researchContractId ??
          input.researchContractId ??
          (await uuidFromName(`contract:${input.contractKey}`)),
      };
      tables.contracts.set(record.researchContractId, record);
      return record;
    },
    async upsertResearchContractField(input) {
      const existing = [...tables.contractFields.values()].find(
        (item) => item.researchContractId === input.researchContractId && item.fieldKey === input.fieldKey,
      );
      const record: ResearchContractFieldRecord = {
        ...existing,
        ...input,
        researchContractFieldId: existing?.researchContractFieldId ?? input.researchContractFieldId ?? newId(),
      };
      tables.contractFields.set(record.researchContractFieldId, record);
      return record;
    },
    async scheduleJob(input) {
      const jobs = [...tables.jobs.values()];
      if (hasActiveJob(jobs, input.dedupeKey)) {
        const existing = jobs.find((job) => jobDedupeKey(job) === input.dedupeKey && ["queued", "leased", "running"].includes(job.status));
        if (!existing) throw new StoreWriteError("active job disappeared during dedupe");
        return { job: existing, created: false };
      }
      const existingAny = jobs.find((job) => job.dedupeKey === input.dedupeKey);
      if (existingAny) return { job: existingAny, created: false };
      const payload = {
        ...input.payload,
        dedupeKey: input.dedupeKey,
        sourceKey: input.sourceKey,
        entityId: input.entityId,
      };
      const job: JobRecord = {
        jobId: await uuidFromName(`job:${input.dedupeKey}`),
        jobType: input.route,
        targetType: input.entityType,
        targetId: isUuid(input.entityId) ? input.entityId : undefined,
        seatId: input.seatId,
        sourceId: input.sourceId,
        priority: input.priority ?? 100,
        status: "queued",
        attemptCount: 0,
        maxAttempts: 5,
        checkpoint: payload,
        dedupeKey: input.dedupeKey,
        payload,
        scheduledFor: input.scheduledFor ?? new Date().toISOString(),
      };
      tables.jobs.set(job.jobId, job);
      return { job, created: true };
    },
    async leaseJob(jobId, owner, leaseMs = 15 * 60 * 1000) {
      return serializeLease(() => {
        const job = tables.jobs.get(jobId);
        if (!job || !isLeasable(job, Date.now())) return undefined;
        return claimLease(job, owner, leaseMs);
      });
    },
    async leaseDueJob(owner, leaseMs = 15 * 60 * 1000) {
      return serializeLease(() => {
        const nowMs = Date.now();
        const due = [...tables.jobs.values()]
          .filter((job) => isLeasable(job, nowMs))
          .sort((a, b) => b.priority - a.priority || Date.parse(a.scheduledFor) - Date.parse(b.scheduledFor));
        const job = due[0];
        if (!job) return undefined;
        return claimLease(job, owner, leaseMs);
      });
    },
    async completeJob(jobId, status = "succeeded") {
      const job = tables.jobs.get(jobId);
      if (!job) throw new StoreWriteError(`job ${jobId} not found`);
      const completed = {
        ...job,
        status,
        completedAt: new Date().toISOString(),
        leasedBy: undefined,
        errorClass: undefined,
        errorMessage: undefined,
      };
      tables.jobs.set(jobId, completed);
      return completed;
    },
    async failJob(jobId, errorClass, errorMessage, deadLettered = false) {
      const job = tables.jobs.get(jobId);
      if (!job) throw new StoreWriteError(`job ${jobId} not found`);
      const failed: JobRecord = {
        ...job,
        status: deadLettered ? "dead_letter" : "failed",
        errorClass,
        errorMessage,
        completedAt: new Date().toISOString(),
      };
      tables.jobs.set(jobId, failed);
      return failed;
    },
    async recordWorkerRun(input) {
      const record: WorkerRunRecord = {
        ...input,
        workerRunId: input.workerRunId ?? newId(),
        createdAt: input.createdAt ?? new Date().toISOString(),
      };
      tables.workerRuns.push(record);
      return record;
    },
    async getDueJobs(now, limit = 50) {
      return [...tables.jobs.values()]
        .filter((job) => job.status === "queued" && Date.parse(job.scheduledFor) <= now.getTime())
        .slice(0, limit);
    },
    async getJobByDedupe(dedupeKey) {
      return [...tables.jobs.values()].find((job) => jobDedupeKey(job) === dedupeKey);
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
    async listClaimEvidence() {
      return [...tables.claimEvidence];
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
