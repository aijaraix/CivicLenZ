import { CivicError } from "./errors.ts";
import { createDeadLetterPayload, shouldDeadLetter } from "./dead-letter.ts";
import { sha256Hex } from "./hash.ts";
import { fetchDocument } from "./http.ts";
import { electionMonitorDedupeKey, heavyDedupeKey, toQueueMessage, validateDedupeKey } from "./jobs.ts";
import { miamiDadeSeatKey } from "./miami-dade.ts";
import { extractOfficeholders } from "./parsers.ts";
import { evidenceObjectKey } from "./r2-keys.ts";
import { slugify } from "./ids.ts";
import type { CivicStore } from "./store.ts";
import {
  PARSER_VERSION,
  type EvidenceBucket,
  type ExtractedOfficeholder,
  type QueueJobMessage,
  type RuntimeQueues,
  type WorkerIdentity,
} from "./types.ts";

export type CollectorResult = {
  status: "collected" | "unchanged" | "routed_heavy" | "failed" | "dead_lettered" | "dry_run";
  retrievalId?: string;
  r2Key?: string;
  sha256?: string;
  extractedCount: number;
  claimsWritten: number;
  errorClass?: string;
  errorMessage?: string;
};

export async function runCollectorJob(input: {
  store: CivicStore;
  message: QueueJobMessage;
  bucket?: EvidenceBucket;
  queues?: RuntimeQueues;
  worker: WorkerIdentity;
  fetchImpl?: typeof fetch;
  parserVersion?: string;
}): Promise<CollectorResult> {
  const parserVersion = input.parserVersion ?? PARSER_VERSION;
  if (input.message.dryRun) {
    return { status: "dry_run", extractedCount: 0, claimsWritten: 0 };
  }
  if (input.message.route === "heavy") {
    throw new CivicError("heavy_not_consumed", "Cloudflare collector does not consume civiclenz-heavy");
  }
  const sourceUrl = input.message.sourceUrl;
  const sourceKey = input.message.sourceKey;
  if (input.message.route === "monitor" && !sourceUrl) {
    await input.store.recordClaim({
      claimKey: `monitor:${input.message.entityType ?? "unknown"}:${input.message.entityId ?? "unknown"}:no-source`,
      claimType: "monitor",
      status: "CHECKED_NO_AUTHORITATIVE_RESULT",
      metadata: { note: "No first-wave official source URL is registered for this monitor target." },
    });
    return { status: "collected", extractedCount: 0, claimsWritten: 1 };
  }
  if (!sourceUrl || !sourceKey) {
    throw new CivicError("invalid_job", "ingest/monitor job requires sourceKey and sourceUrl");
  }

  try {
    const document = await fetchDocument(sourceUrl, { fetchImpl: input.fetchImpl });
    const sha256 = await sha256Hex(document.bytes);
    const r2Key = evidenceObjectKey({
      sourceKey,
      retrievedAt: document.retrievedAt,
      sha256,
      contentType: document.contentType,
    });
    if (!input.bucket) {
      throw new CivicError("r2_binding_missing", "EVIDENCE_BUCKET binding is required");
    }
    await input.bucket.put(r2Key, document.bytes, {
      contentType: document.contentType,
      customMetadata: {
        sourceKey,
        sourceUrl,
        sha256,
        retrievedAt: document.retrievedAt,
        parserVersion,
      },
    });

    const source = await input.store.recordSource({
      sourceKey,
      name: sourceKey,
      sourceUrl,
      enabled: true,
    });
    const retrieval = await input.store.recordRawRetrieval({
      sourceId: source.id,
      sourceUrl,
      retrievedAt: document.retrievedAt,
      httpStatus: document.status,
      contentType: document.contentType,
      etag: document.etag,
      lastModified: document.lastModified,
      contentSha256: sha256,
      byteLength: document.bytes.byteLength,
      r2Bucket: "civiclenzevidence",
      r2Key,
      parserVersion,
      parseStatus: "stored",
    });

    let holders: ExtractedOfficeholder[] = [];
    let parseStatus = "parsed";
    try {
      holders = await extractOfficeholders({
        sourceKey,
        bytes: document.bytes,
        contentType: document.contentType,
      });
      await persistExtractedHolders(input.store, {
        sourceKey,
        sourceUrl,
        retrievalId: retrieval.id,
        holders,
      });
    } catch (error) {
      if (!(error instanceof CivicError) || error.errorClass !== "parser_failure") throw error;
      if (error.routeHeavy) throw error;
      parseStatus = "parser_unavailable";
      await input.store.recordClaim({
        claimKey: `retrieval:${sourceKey}:${retrieval.id}`,
        claimType: "source_retrieval",
        status: "COLLECTED_UNREVIEWED",
        rawRetrievalId: retrieval.id,
        metadata: { sourceKey, sourceUrl, parserError: error.message },
      });
    }
    if (parseStatus !== "parsed") {
      await input.store.recordRawRetrieval({
        ...retrieval,
        parseStatus,
      });
    }

    const validate = await input.store.scheduleJob({
      dedupeKey: validateDedupeKey(retrieval.id),
      route: "validate",
      sourceKey,
      payload: { retrievalId: retrieval.id, sourceUrl },
    });
    if (validate.created && input.queues?.validate) {
      await input.queues.validate.send(toQueueMessage(validate.job, false));
    }

    await input.store.upsertMonitoringState({
      entityType: "source",
      entityKey: sourceKey,
      checkClass: "daily",
      active: true,
      lastCheckedAt: document.retrievedAt,
      lastContentSha256: sha256,
    });

    return {
      status: "collected",
      retrievalId: retrieval.id,
      r2Key,
      sha256,
      extractedCount: holders.length,
      claimsWritten: holders.length,
    };
  } catch (error) {
    return handleCollectorFailure(input, error);
  }
}

async function persistExtractedHolders(
  store: CivicStore,
  input: { sourceKey: string; sourceUrl: string; retrievalId: string; holders: ExtractedOfficeholder[] },
): Promise<void> {
  const parent = await store.upsertJurisdiction({
    jurisdictionKey: "us-fl",
    name: "Florida",
    kind: "state",
    stateCode: "FL",
  });
  const county = await store.upsertJurisdiction({
    jurisdictionKey: "us-fl-miami-dade",
    name: "Miami-Dade County",
    kind: "county",
    stateCode: "FL",
    countyName: "Miami-Dade",
    parentId: parent.id,
  });
  for (const holder of input.holders) {
    const seat = await store.upsertSeat({
      seatKey: miamiDadeSeatKey(holder),
      jurisdictionId: county.id,
      seatName: holder.officeTitle,
      officeType: holder.officeKind,
      governmentLevel: holder.governmentLevel,
      branch: holder.branch,
      districtNumber: holder.districtNumber,
      occupancyStatus: "unknown",
      recordStatus: "extracted",
    });
    const person = await store.upsertPerson({
      personKey: `person:${slugify(holder.displayName)}`,
      displayName: holder.displayName,
      recordStatus: "extracted",
    });
    await store.upsertOccupancy({
      seatId: seat.id,
      personId: person.id,
      termLabel: holder.termLabel,
      electedOrAppointed: holder.electedOrAppointed,
      currentStatus: "unknown",
      recordStatus: "extracted",
    });
    const claim = await store.recordClaim({
      claimKey: `occupancy:${seat.seatKey}:${person.personKey}:${input.retrievalId}`,
      claimType: "occupancy",
      status: "COLLECTED_UNREVIEWED",
      subjectType: "seat",
      subjectId: seat.id,
      predicate: "occupied_by",
      objectValue: holder.displayName,
      jurisdictionId: county.id,
      seatId: seat.id,
      personId: person.id,
      rawRetrievalId: input.retrievalId,
      metadata: {
        displayName: holder.displayName,
        officeTitle: holder.officeTitle,
        officeType: holder.officeKind,
        districtNumber: holder.districtNumber,
        sourceKey: input.sourceKey,
        sourceUrl: input.sourceUrl,
        rawRowText: holder.rawRowText,
      },
    });
    const evidence = await store.recordEvidence({
      rawRetrievalId: input.retrievalId,
      evidenceType: "pdf",
      sourceUrl: input.sourceUrl,
      contentSha256: (await store.getRetrieval(input.retrievalId))?.contentSha256 ?? "",
      capturedAt: new Date().toISOString(),
      exactExcerpt: holder.rawRowText,
      reviewStatus: "unreviewed",
    });
    await store.attachClaimEvidence(claim.id, evidence.id);
  }
}

async function handleCollectorFailure(
  input: {
    store: CivicStore;
    message: QueueJobMessage;
    queues?: RuntimeQueues;
    worker: WorkerIdentity;
  },
  error: unknown,
): Promise<CollectorResult> {
  const civic = error instanceof CivicError ? error : new CivicError("collector_failed", error instanceof Error ? error.message : "unknown");
  if (civic.routeHeavy && input.message.sourceKey && input.message.sourceUrl) {
    const heavy = await input.store.scheduleJob({
      dedupeKey: heavyDedupeKey(input.message.sourceKey, civic.errorClass, input.message.sourceUrl, new Date()),
      route: "heavy",
      sourceKey: input.message.sourceKey,
      payload: { sourceUrl: input.message.sourceUrl, reason: civic.errorClass },
    });
    if (heavy.created && input.queues?.heavy) {
      await input.queues.heavy.send(toQueueMessage(heavy.job, false));
    }
    return {
      status: "routed_heavy",
      extractedCount: 0,
      claimsWritten: 0,
      errorClass: civic.errorClass,
      errorMessage: civic.message,
    };
  }
  const dead = shouldDeadLetter(input.message.attempt + 1, civic.retryable);
  if (dead && input.queues?.deadLetter) {
    await input.queues.deadLetter.send(
      createDeadLetterPayload({
        jobId: input.message.jobId,
        worker: input.worker.workerKey,
        sourceKey: input.message.sourceKey,
        errorClass: civic.errorClass,
        errorMessage: civic.message,
        attemptCount: input.message.attempt + 1,
        payload: input.message,
      }),
    );
  }
  return {
    status: dead ? "dead_lettered" : "failed",
    extractedCount: 0,
    claimsWritten: 0,
    errorClass: civic.errorClass,
    errorMessage: civic.message,
  };
}

export { electionMonitorDedupeKey };
