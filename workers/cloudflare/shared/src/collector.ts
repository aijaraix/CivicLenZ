import { CivicError } from "./errors.ts";
import { createDeadLetterPayload, shouldDeadLetter } from "./dead-letter.ts";
import { sha256Hex, valueHash } from "./hash.ts";
import { fetchDocument } from "./http.ts";
import { electionMonitorDedupeKey, heavyDedupeKey, toQueueMessage, validateDedupeKey } from "./jobs.ts";
import { miamiDadeSeatKey } from "./miami-dade.ts";
import { extractOfficeholders } from "./parsers.ts";
import { evidenceObjectKey, rawObjectUri } from "./r2-keys.ts";
import { uuidFromName } from "./ids.ts";
import type { CivicStore } from "./store.ts";
import {
  EVIDENCE_BUCKET_NAME,
  PARSER_VERSION,
  type EvidenceBucket,
  type ExtractedOfficeholder,
  type QueueJobMessage,
  type RuntimeQueues,
  type WorkerIdentity,
} from "./types.ts";

export type CollectorResult = {
  status: "collected" | "unchanged" | "routed_heavy" | "failed" | "dead_letter" | "dry_run";
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
    const subjectId = await uuidFromName(`monitor:${input.message.entityType ?? "unknown"}:${input.message.entityId ?? "unknown"}`);
    await input.store.recordClaim({
      subjectType: "monitor",
      subjectId,
      fieldKey: "authoritative_source",
      normalizedValue: "none",
      displayValue: "No first-wave official source URL is registered for this monitor target.",
      valueHash: await valueHash("authoritative_source", "none"),
      verificationState: "checked_no_authoritative_result",
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
      sourceType: "official_directory",
      authorityTier: "official",
      host: new URL(sourceUrl).host,
      active: true,
      healthState: "ok",
    });
    const retrieval = await input.store.recordRawRetrieval({
      sourceId: source.sourceId,
      jobId: input.message.jobId,
      retrievedAt: document.retrievedAt,
      sourceUrl,
      httpStatus: document.status,
      contentType: document.contentType,
      etag: document.etag,
      lastModified: document.lastModified,
      contentHash: sha256,
      rawObjectUri: rawObjectUri(EVIDENCE_BUCKET_NAME, r2Key),
      byteLength: document.bytes.byteLength,
      parserKey: "miami-dade-elected-officials",
      parserVersion,
      retrievalStatus: "stored",
    });

    let holders: ExtractedOfficeholder[] = [];
    let retrievalStatus = "parsed";
    try {
      holders = await extractOfficeholders({
        sourceKey,
        bytes: document.bytes,
        contentType: document.contentType,
      });
      await persistExtractedHolders(input.store, {
        sourceKey,
        sourceUrl,
        sourceId: source.sourceId,
        retrievalId: retrieval.retrievalId,
        contentHash: sha256,
        assetUri: rawObjectUri(EVIDENCE_BUCKET_NAME, r2Key),
        holders,
      });
    } catch (error) {
      if (!(error instanceof CivicError) || error.errorClass !== "parser_failure") throw error;
      if (error.routeHeavy) throw error;
      retrievalStatus = "parser_unavailable";
      await input.store.recordClaim({
        subjectType: "source",
        subjectId: source.sourceId,
        fieldKey: "source_retrieval",
        normalizedValue: retrieval.retrievalId,
        displayValue: sourceUrl,
        valueHash: await valueHash("source_retrieval", retrieval.retrievalId),
        verificationState: "collected_unreviewed",
      });
    }
    if (retrievalStatus !== "parsed") {
      await input.store.recordRawRetrieval({
        ...retrieval,
        retrievalStatus,
      });
    }

    const validate = await input.store.scheduleJob({
      dedupeKey: validateDedupeKey(retrieval.retrievalId),
      route: "validate",
      sourceKey,
      payload: { retrievalId: retrieval.retrievalId, sourceUrl },
    });
    if (validate.created && input.queues?.validate) {
      await input.queues.validate.send(toQueueMessage(validate.job, false));
    }

    await input.store.upsertMonitoringState({
      targetType: "source",
      targetId: source.sourceId,
      active: true,
      monitoringClass: "daily",
      lastCheckedAt: document.retrievedAt,
      lastResult: sha256,
    });

    return {
      status: "collected",
      retrievalId: retrieval.retrievalId,
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
  input: {
    sourceKey: string;
    sourceUrl: string;
    sourceId: string;
    retrievalId: string;
    contentHash: string;
    assetUri: string;
    holders: ExtractedOfficeholder[];
  },
): Promise<void> {
  const parent = await store.upsertJurisdiction({
    jurisdictionKey: "us-fl",
    name: "Florida",
    jurisdictionType: "state",
    stateCode: "FL",
  });
  const county = await store.upsertJurisdiction({
    jurisdictionKey: "us-fl-miami-dade",
    name: "Miami-Dade County",
    jurisdictionType: "county",
    stateCode: "FL",
    countyName: "Miami-Dade",
    parentJurisdictionId: parent.jurisdictionId,
  });
  for (const holder of input.holders) {
    const seat = await store.upsertSeat({
      seatKey: miamiDadeSeatKey(holder),
      jurisdictionId: county.jurisdictionId,
      seatName: holder.officeTitle,
      officeType: holder.officeKind,
      governmentLevel: holder.governmentLevel,
      branch: holder.branch,
      districtNumber: holder.districtNumber,
      occupancyStatus: "unknown",
      baselineStatus: "unknown",
      monitoringActive: false,
    });
    const person = await store.upsertPerson({
      canonicalName: holder.displayName,
    });
    await store.upsertOccupancy({
      seatId: seat.seatId,
      personId: person.personId,
      occupancyStatus: "unknown",
      electedOrAppointed: holder.electedOrAppointed,
      evidenceState: "unreviewed",
    });
    const normalized = holder.displayName;
    const claim = await store.recordClaim({
      subjectType: "seat",
      subjectId: seat.seatId,
      seatId: seat.seatId,
      fieldKey: "current_occupant",
      normalizedValue: normalized,
      displayValue: holder.displayName,
      valueHash: await valueHash("current_occupant", normalized),
      verificationState: "collected_unreviewed",
    });
    const evidence = await store.recordEvidence({
      sourceId: input.sourceId,
      retrievalId: input.retrievalId,
      evidenceType: "pdf_excerpt",
      sourceUrl: input.sourceUrl,
      excerpt: holder.rawRowText,
      assetUri: input.assetUri,
      contentHash: input.contentHash,
      verificationState: "collected_unreviewed",
    });
    await store.attachClaimEvidence(claim.claimId, evidence.evidenceId, "supports");
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
    status: dead ? "dead_letter" : "failed",
    extractedCount: 0,
    claimsWritten: 0,
    errorClass: civic.errorClass,
    errorMessage: civic.message,
  };
}

export { electionMonitorDedupeKey };
