import { DuplicateClaimError, StoreWriteError, sanitizeErrorMessage } from "./errors.ts";
import { valueHash } from "./hash.ts";
import { isUuid, uuidFromName } from "./ids.ts";
import { DEMOTED_OCCUPANCY_STATUS, isCurrentOrActing } from "./occupancy.ts";
import {
  identityEntries,
  mergeExternalIdentifiers,
  personIdFromExternalIdentifiers,
  resolveExistingPerson,
} from "./persons.ts";
import {
  assertLiveWrite,
  campaignRow,
  claimEvidenceRow,
  claimRow,
  contradictionRow,
  electionRow,
  evidenceRow,
  fromCampaign,
  fromClaim,
  fromContract,
  fromContractField,
  fromContradiction,
  fromElection,
  fromEvidence,
  fromJob,
  fromJurisdiction,
  fromMonitoring,
  fromOccupancy,
  fromPerson,
  fromRetrieval,
  fromSeat,
  fromSource,
  fromWorkerRun,
  jobRow,
  jurisdictionRow,
  liveWriteBody,
  monitoringRow,
  occupancyRow,
  personRow,
  researchContractFieldRow,
  researchContractRow,
  retrievalRow,
  seatRow,
  sourceRow,
  validationRunRow,
  workerRunRow,
  type Json,
} from "./live-rows.ts";
import type { CivicStore, ScheduleJobInput } from "./store.ts";

export type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
  fetchImpl?: typeof fetch;
};

function requiredSecret(name: string, value: string | undefined): string {
  if (!value) throw new StoreWriteError(`${name} is not configured`);
  return value;
}

export function createSupabaseStore(config: SupabaseConfig): CivicStore {
  const baseUrl = requiredSecret("SUPABASE_URL", config.url).replace(/\/$/, "");
  const key = requiredSecret("SUPABASE_SERVICE_ROLE_KEY", config.serviceRoleKey);
  const fetchImpl = config.fetchImpl ?? fetch;

  const request = async <T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> => {
    const headers = new Headers(init.headers);
    headers.set("apikey", key);
    headers.set("Authorization", `Bearer ${key}`);
    headers.set("Content-Type", "application/json");
    if (init.prefer) headers.set("Prefer", init.prefer);
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}/rest/v1/${path}`, { ...init, headers });
    } catch (error) {
      throw new StoreWriteError(`Supabase request failed: ${error instanceof Error ? error.message : "network error"}`);
    }
    const text = await response.text();
    const sanitized = sanitizeErrorMessage(text, [key]);
    if (!response.ok) {
      throw new StoreWriteError(`Supabase write/read failed HTTP ${response.status}: ${sanitized.slice(0, 300)}`);
    }
    if (!text) return [] as T;
    return JSON.parse(sanitized) as T;
  };

  const upsert = async <T>(table: string, row: Json, onConflict: string): Promise<T> => {
    const body = liveWriteBody(table, row);
    const rows = await request<T[]>(`${table}?on_conflict=${onConflict}`, {
      method: "POST",
      body,
      prefer: "resolution=merge-duplicates,return=representation",
    });
    if (!Array.isArray(rows) || rows.length === 0) throw new StoreWriteError(`upsert ${table} returned no row`);
    return rows[0] as T;
  };

  const insert = async <T>(table: string, row: Json): Promise<T> => {
    const body = liveWriteBody(table, row);
    const rows = await request<T[]>(table, {
      method: "POST",
      body,
      prefer: "return=representation",
    });
    if (!Array.isArray(rows) || rows.length === 0) throw new StoreWriteError(`insert ${table} returned no row`);
    return rows[0] as T;
  };

  const insertOrConflict = async (table: string, row: Json): Promise<{ row?: Json; conflict: boolean }> => {
    const body = liveWriteBody(table, row);
    const headers = new Headers();
    headers.set("apikey", key);
    headers.set("Authorization", `Bearer ${key}`);
    headers.set("Content-Type", "application/json");
    headers.set("Prefer", "return=representation");
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}/rest/v1/${table}`, { method: "POST", headers, body });
    } catch (error) {
      throw new StoreWriteError(`Supabase request failed: ${error instanceof Error ? error.message : "network error"}`);
    }
    const text = await response.text();
    const sanitized = sanitizeErrorMessage(text, [key]);
    if (response.status === 409) return { conflict: true };
    if (!response.ok) {
      throw new StoreWriteError(`Supabase write/read failed HTTP ${response.status}: ${sanitized.slice(0, 300)}`);
    }
    const rows = text ? (JSON.parse(sanitized) as Json[]) : [];
    return { row: rows[0], conflict: false };
  };

  const patch = async <T>(table: string, filter: string, row: Json): Promise<T[]> => {
    const body = liveWriteBody(table, row);
    return request<T[]>(`${table}?${filter}`, {
      method: "PATCH",
      body,
      prefer: "return=representation",
    });
  };

  const rpcLease = async (owner: string, leaseMs: number, jobId?: string) => {
    const payload = {
      p_leased_by: owner,
      p_lease_seconds: Math.max(1, Math.round(leaseMs / 1000)),
      p_job_id: jobId ?? null,
    };
    assertLiveWrite("jobs", { leased_by: owner, status: "leased" });
    const rows = await request<Json[]>("rpc/lease_due_job", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const row = Array.isArray(rows) ? rows[0] : (rows as Json | undefined);
    return row ? fromJob(row) : undefined;
  };

  return {
    async upsertJurisdiction(input) {
      return fromJurisdiction(await upsert("jurisdictions", jurisdictionRow(input), "jurisdiction_key"));
    },
    async upsertSeat(input) {
      return fromSeat(await upsert("seats", seatRow(input), "seat_key"));
    },
    async upsertPerson(input) {
      const people = (await request<Json[]>("persons?select=*")).map(fromPerson);
      const occupancies = (await request<Json[]>("seat_occupancies?select=*")).map(fromOccupancy);
      const seats = (await request<Json[]>("seats?select=*")).map(fromSeat);
      const existing = resolveExistingPerson({ people, occupancies, seats, candidate: input });
      if (existing) {
        const personId = existing.personId;
        const rows = await patch(
          "persons",
          `person_id=eq.${personId}`,
          personRow({
            ...input,
            personId,
            externalIdentifiers: mergeExternalIdentifiers(existing.externalIdentifiers, input.externalIdentifiers),
          }),
        );
        return fromPerson(rows[0] ?? { person_id: personId, canonical_name: existing.canonicalName });
      }

      const personId = input.personId ?? (await personIdFromExternalIdentifiers(input.externalIdentifiers));
      const attempt = await insertOrConflict("persons", personRow({ ...input, personId }));
      if (attempt.row) return fromPerson(attempt.row);
      if (attempt.conflict && personId) {
        const again = await request<Json[]>(`persons?person_id=eq.${personId}&limit=1`);
        if (again[0]) return fromPerson(again[0]);
      }
      if (attempt.conflict) {
        const identifiers = identityEntries(input.externalIdentifiers);
        for (const [key, value] of identifiers) {
          const rows = await request<Json[]>(
            `persons?external_identifiers->>${key}=eq.${encodeURIComponent(value)}&limit=1`,
          );
          if (rows[0]) return fromPerson(rows[0]);
        }
      }
      throw new StoreWriteError("person insert conflicted and re-query found no row");
    },
    async upsertOccupancy(input) {
      const startFilter = input.startDate ? `start_date=eq.${input.startDate}` : "start_date=is.null";
      const lookup = input.occupancyId
        ? `occupancy_id=eq.${input.occupancyId}`
        : `seat_id=eq.${input.seatId}&person_id=eq.${input.personId}&${startFilter}`;
      const existing = await request<Json[]>(`seat_occupancies?${lookup}&limit=1`);
      const occupancyId = input.occupancyId ?? (existing[0] ? String(existing[0].occupancy_id) : undefined);

      if (isCurrentOrActing(input.occupancyStatus)) {
        const current = await request<Json[]>(
          `seat_occupancies?seat_id=eq.${input.seatId}&occupancy_status=in.(current,acting)`,
        );
        for (const row of current) {
          if (occupancyId && String(row.occupancy_id) === occupancyId) continue;
          await patch("seat_occupancies", `occupancy_id=eq.${String(row.occupancy_id)}`, {
            occupancy_status: DEMOTED_OCCUPANCY_STATUS,
            end_date: input.startDate,
            updated_at: new Date().toISOString(),
          });
        }
      }

      if (existing[0]) {
        const rows = await patch(
          "seat_occupancies",
          `occupancy_id=eq.${String(existing[0].occupancy_id)}`,
          occupancyRow({ ...input, occupancyId: String(existing[0].occupancy_id) }),
        );
        return fromOccupancy(rows[0] ?? existing[0]);
      }
      return fromOccupancy(await insert("seat_occupancies", occupancyRow({ ...input, occupancyId })));
    },
    async upsertElection(input) {
      return fromElection(await upsert("elections", electionRow({ ...input, seatId: input.seatId }), "election_key"));
    },
    async upsertCandidateCampaign(input) {
      return fromCampaign(await upsert("candidate_campaigns", campaignRow(input), "person_id,election_id,seat_id"));
    },
    async recordSource(input) {
      return fromSource(await upsert("sources", sourceRow(input), "source_key"));
    },
    async recordRawRetrieval(input) {
      const existing = await request<Json[]>(
        `raw_retrievals?source_id=eq.${input.sourceId}&content_hash=eq.${encodeURIComponent(input.contentHash)}&limit=1`,
      );
      if (existing[0]) {
        const retrievalId = String(existing[0].retrieval_id);
        const rows = await patch(
          "raw_retrievals",
          `retrieval_id=eq.${retrievalId}`,
          retrievalRow({ ...input, retrievalId }),
        );
        return fromRetrieval(rows[0] ?? existing[0]);
      }
      return fromRetrieval(await insert("raw_retrievals", retrievalRow(input)));
    },
    async recordEvidence(input) {
      return fromEvidence(await insert("evidence_objects", evidenceRow(input)));
    },
    async recordClaim(input) {
      const hash =
        input.valueHash ?? (await valueHash(input.fieldKey, input.normalizedValue ?? input.displayValue ?? ""));
      const lookup = `subject_type=eq.${encodeURIComponent(input.subjectType)}&subject_id=eq.${input.subjectId}&field_key=eq.${encodeURIComponent(input.fieldKey)}&value_hash=eq.${encodeURIComponent(hash)}`;
      const existing = await request<Json[]>(`claims?${lookup}`);
      if (existing.length > 1) {
        const claimIds = existing.map((row) => String(row.claim_id));
        try {
          await request("contradictions", {
            method: "POST",
            body: liveWriteBody(
              "contradictions",
              contradictionRow({
                subjectType: input.subjectType,
                subjectId: input.subjectId,
                seatId: input.seatId,
                fieldKey: input.fieldKey,
                claimIds,
                status: "open",
                severity: "critical",
              }),
            ),
            prefer: "return=minimal",
          });
        } catch {
          // Still fail closed even if the QA contradiction write does not land.
        }
        throw new DuplicateClaimError(claimIds, input.fieldKey);
      }
      if (existing[0]) {
        const found = fromClaim(existing[0]);
        const rows = await patch(
          "claims",
          `claim_id=eq.${found.claimId}`,
          claimRow({
            claimId: found.claimId,
            subjectType: input.subjectType,
            subjectId: input.subjectId,
            seatId: input.seatId ?? found.seatId,
            fieldKey: input.fieldKey,
            normalizedValue: input.normalizedValue ?? found.normalizedValue,
            displayValue: input.displayValue ?? found.displayValue,
            valueHash: hash,
            validFrom: input.validFrom ?? found.validFrom,
            validTo: input.validTo ?? found.validTo,
            firstSeenAt: found.firstSeenAt,
            lastSeenAt: input.lastSeenAt ?? new Date().toISOString(),
            lastVerifiedAt: input.lastVerifiedAt ?? found.lastVerifiedAt,
            verificationState: found.verificationState,
            confidence: input.confidence ?? found.confidence,
            volatilityClass: input.volatilityClass ?? found.volatilityClass,
            recheckAfter: input.recheckAfter ?? found.recheckAfter,
            supersedesClaimId: input.supersedesClaimId ?? found.supersedesClaimId,
          }),
        );
        return fromClaim(rows[0] ?? existing[0]);
      }
      return fromClaim(
        await insert(
          "claims",
          claimRow({
            ...input,
            claimId: input.claimId,
            subjectType: input.subjectType,
            subjectId: input.subjectId,
            valueHash: hash,
          }),
        ),
      );
    },
    async transitionClaim(claimId, to) {
      const rows = await patch("claims", `claim_id=eq.${claimId}`, { verification_state: to, updated_at: new Date().toISOString() });
      if (!rows[0]) throw new StoreWriteError(`claim ${claimId} not found`);
      return fromClaim(rows[0]);
    },
    async attachClaimEvidence(claimId, evidenceId, role = "supports") {
      await request("claim_evidence", {
        method: "POST",
        body: liveWriteBody("claim_evidence", claimEvidenceRow({ claimId, evidenceId, role })),
        prefer: "resolution=ignore-duplicates,return=minimal",
      });
    },
    async recordValidationRun(input) {
      await request("validation_runs", {
        method: "POST",
        body: liveWriteBody(
          "validation_runs",
          validationRunRow({
            ...input,
            completedAt: input.completedAt ?? new Date().toISOString(),
          }),
        ),
        prefer: "return=minimal",
      });
    },
    async recordContradiction(input) {
      await request("contradictions", {
        method: "POST",
        body: liveWriteBody("contradictions", contradictionRow(input)),
        prefer: "return=minimal",
      });
    },
    async upsertMonitoringState(input) {
      return fromMonitoring(
        await upsert("monitoring_state", monitoringRow(input), "target_type,target_id,monitoring_class"),
      );
    },
    async upsertResearchContract(input) {
      return fromContract(await upsert("research_contracts", researchContractRow(input), "contract_key"));
    },
    async upsertResearchContractField(input) {
      return fromContractField(
        await upsert(
          "research_contract_fields",
          researchContractFieldRow(input),
          "research_contract_id,field_key",
        ),
      );
    },
    async scheduleJob(input: ScheduleJobInput) {
      const existing = await request<Json[]>(
        `jobs?dedupe_key=eq.${encodeURIComponent(input.dedupeKey)}&status=in.(queued,leased,running)&select=*`,
      );
      if (existing[0]) return { job: fromJob(existing[0]), created: false };
      const payload = {
        ...input.payload,
        dedupeKey: input.dedupeKey,
        sourceKey: input.sourceKey,
        entityId: input.entityId,
      };
      const rows = await request<Json[]>("jobs", {
        method: "POST",
        body: liveWriteBody(
          "jobs",
          jobRow({
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
          }),
        ),
        prefer: "return=representation",
      });
      if (!rows[0]) throw new StoreWriteError("scheduleJob returned no row");
      return { job: fromJob(rows[0]), created: true };
    },
    async leaseJob(jobId, owner, leaseMs = 15 * 60 * 1000) {
      return rpcLease(owner, leaseMs, jobId);
    },
    async leaseDueJob(owner, leaseMs = 15 * 60 * 1000) {
      return rpcLease(owner, leaseMs);
    },
    async completeJob(jobId, status = "succeeded") {
      const rows = await patch("jobs", `job_id=eq.${jobId}`, {
        status,
        completed_at: new Date().toISOString(),
        leased_by: null,
        error_class: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      });
      if (!rows[0]) throw new StoreWriteError(`job ${jobId} not found`);
      return fromJob(rows[0]);
    },
    async failJob(jobId, errorClass, errorMessage, deadLettered = false) {
      const rows = await patch("jobs", `job_id=eq.${jobId}`, {
        status: deadLettered ? "dead_letter" : "failed",
        error_class: errorClass,
        error_message: sanitizeErrorMessage(errorMessage, [key]),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (!rows[0]) throw new StoreWriteError(`job ${jobId} not found`);
      return fromJob(rows[0]);
    },
    async requeueJob(jobId) {
      const rows = await patch("jobs", `job_id=eq.${jobId}`, {
        status: "queued",
        error_class: null,
        error_message: null,
        completed_at: null,
        leased_by: null,
        lease_expires_at: null,
        updated_at: new Date().toISOString(),
      });
      if (!rows[0]) throw new StoreWriteError(`job ${jobId} not found`);
      return fromJob(rows[0]);
    },
    async recordWorkerRun(input) {
      const row = await insert(
        "worker_runs",
        workerRunRow({
          ...input,
          errorMessage: input.errorMessage ? sanitizeErrorMessage(input.errorMessage, [key]) : undefined,
        }),
      );
      return fromWorkerRun(row);
    },
    async getDueJobs(now, limit = 50) {
      const rows = await request<Json[]>(
        `jobs?status=eq.queued&scheduled_for=lte.${now.toISOString()}&order=priority.desc,scheduled_for.asc&limit=${limit}`,
      );
      return rows.map(fromJob);
    },
    async getJobByDedupe(dedupeKey) {
      const rows = await request<Json[]>(
        `jobs?dedupe_key=eq.${encodeURIComponent(dedupeKey)}&order=created_at.desc&limit=1`,
      );
      return rows[0] ? fromJob(rows[0]) : undefined;
    },
    async getJob(jobId) {
      const rows = await request<Json[]>(`jobs?job_id=eq.${jobId}&limit=1`);
      return rows[0] ? fromJob(rows[0]) : undefined;
    },
    async listJurisdictions() {
      return (await request<Json[]>("jurisdictions?select=*")).map(fromJurisdiction);
    },
    async listSeats() {
      return (await request<Json[]>("seats?select=*")).map(fromSeat);
    },
    async listPersons() {
      return (await request<Json[]>("persons?select=*")).map(fromPerson);
    },
    async listOccupancies() {
      return (await request<Json[]>("seat_occupancies?select=*")).map(fromOccupancy);
    },
    async listElections() {
      return (await request<Json[]>("elections?select=*")).map(fromElection);
    },
    async listCampaigns() {
      return (await request<Json[]>("candidate_campaigns?select=*")).map(fromCampaign);
    },
    async listClaims() {
      return (await request<Json[]>("claims?select=*")).map(fromClaim);
    },
    async listEvidence() {
      return (await request<Json[]>("evidence_objects?select=*")).map(fromEvidence);
    },
    async listRetrievals() {
      return (await request<Json[]>("raw_retrievals?select=*")).map(fromRetrieval);
    },
    async listClaimEvidence() {
      const rows = await request<Json[]>("claim_evidence?select=claim_id,evidence_id,role");
      return rows.map((row) => ({
        claimId: String(row.claim_id),
        evidenceId: String(row.evidence_id),
        role: String(row.role),
      }));
    },
    async listContradictions() {
      const rows = await request<Json[]>("contradictions?select=claim_ids,field_key,severity");
      return rows.map(fromContradiction);
    },
    async listSources() {
      return (await request<Json[]>("sources?select=*")).map(fromSource);
    },
    async listJobs() {
      return (await request<Json[]>("jobs?select=*")).map(fromJob);
    },
    async listWorkerRuns() {
      return (await request<Json[]>("worker_runs?select=*")).map(fromWorkerRun);
    },
    async listMonitoringState() {
      return (await request<Json[]>("monitoring_state?select=*")).map(fromMonitoring);
    },
    async listResearchContracts() {
      return (await request<Json[]>("research_contracts?select=*")).map(fromContract);
    },
    async listResearchContractFields() {
      return (await request<Json[]>("research_contract_fields?select=*")).map(fromContractField);
    },
    async getClaim(claimId) {
      const rows = await request<Json[]>(`claims?claim_id=eq.${claimId}&limit=1`);
      return rows[0] ? fromClaim(rows[0]) : undefined;
    },
    async getRetrieval(retrievalId) {
      const rows = await request<Json[]>(`raw_retrievals?retrieval_id=eq.${retrievalId}&limit=1`);
      return rows[0] ? fromRetrieval(rows[0]) : undefined;
    },
  };
}
