import { CivicError } from "./errors.ts";
import { createDeadLetterPayload, shouldDeadLetter } from "./dead-letter.ts";
import { sha256Hex, valueHash } from "./hash.ts";
import { fetchDocument } from "./http.ts";
import { electionMonitorDedupeKey, heavyDedupeKey, toQueueMessage, validateDedupeKey } from "./jobs.ts";
import { miamiDadeSeatKey } from "./miami-dade.ts";
import { dispatchSourceAdapter } from "./adapters.ts";
import { httpUnchanged, isRetrievalDownstreamComplete, retrievalUnchanged } from "./change-detection.ts";
import { sourceAdapter } from "./source-config.ts";
import { evidenceObjectKey, objectKeyFromRawObjectUri, rawObjectUri } from "./r2-keys.ts";
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
    const config = sourceAdapter(sourceKey);
    const priorRetrievals = await input.store.listRetrievals();
    const prior = priorRetrievals.find((item) => item.sourceUrl === sourceUrl);
    const document = await fetchDocument(sourceUrl, {
      fetchImpl: input.fetchImpl,
      ifNoneMatch: prior?.etag,
      ifModifiedSince: prior?.lastModified,
    });
    const downstreamComplete = isRetrievalDownstreamComplete({
      retrieval: prior,
      evidence: await input.store.listEvidence(),
      claims: await input.store.listClaims(),
      jurisdictions: await input.store.listJurisdictions(),
      seats: await input.store.listSeats(),
    });
    let bytes = document.bytes;
    let sha256 = document.status === 200 ? await sha256Hex(document.bytes) : prior?.contentHash;
    let contentType = document.contentType ?? prior?.contentType;
    let retrievedAt = document.retrievedAt;
    let etag = document.etag ?? prior?.etag;
    let lastModified = document.lastModified ?? prior?.lastModified;
    let skipR2Put = false;

    const bytesUnchanged =
      httpUnchanged(document.status) ||
      retrievalUnchanged({ contentHash: prior?.contentHash, etag: prior?.etag }, { contentHash: sha256, etag: document.etag });
    if (bytesUnchanged && downstreamComplete) {
      return { status: "unchanged", extractedCount: 0, claimsWritten: 0, sha256: sha256 ?? prior?.contentHash };
    }
    if (httpUnchanged(document.status) && !downstreamComplete) {
      const resumed = await resumeStoredBytes({
        bucket: input.bucket,
        prior,
        sourceUrl,
        fetchImpl: input.fetchImpl,
      });
      bytes = resumed.bytes;
      sha256 = prior?.contentHash ?? (await sha256Hex(bytes));
      contentType = prior?.contentType ?? resumed.contentType ?? contentType;
      retrievedAt = prior?.retrievedAt ?? retrievedAt;
      skipR2Put = resumed.fromStore;
    } else if (bytesUnchanged && !downstreamComplete) {
      skipR2Put = Boolean(prior?.rawObjectUri);
      sha256 = sha256 ?? (await sha256Hex(bytes));
    }
    if (!sha256) sha256 = await sha256Hex(bytes);

    const storedKey = objectKeyFromRawObjectUri(prior?.rawObjectUri);
    const r2Key =
      storedKey ??
      evidenceObjectKey({
        sourceKey,
        retrievedAt,
        sha256,
        contentType,
      });
    if (!input.bucket) {
      throw new CivicError("r2_binding_missing", "EVIDENCE_BUCKET binding is required");
    }
    if (!skipR2Put) {
      try {
        await input.bucket.put(r2Key, bytes, {
          contentType,
          customMetadata: {
            sourceKey,
            sourceUrl,
            sha256,
            retrievedAt,
            parserVersion,
          },
        });
      } catch (error) {
        throw new CivicError("r2_write_failed", error instanceof Error ? error.message : "R2 put failed");
      }
    }

    const source = await input.store.recordSource({
      sourceKey,
      name: config?.sourceName ?? sourceKey,
      sourceUrl,
      sourceType: config?.sourceType ?? "html_directory",
      authorityTier: config?.authorityTier ?? "TIER_1_PRIMARY_OFFICIAL",
      host: new URL(sourceUrl).host,
      active: true,
      healthState: "ok",
    });
    const retrieval = await input.store.recordRawRetrieval({
      sourceId: source.sourceId,
      jobId: input.message.jobId,
      retrievalId: prior?.contentHash === sha256 ? prior.retrievalId : undefined,
      retrievedAt,
      sourceUrl,
      httpStatus: document.status,
      contentType,
      etag,
      lastModified,
      contentHash: sha256,
      rawObjectUri: rawObjectUri(EVIDENCE_BUCKET_NAME, r2Key),
      byteLength: bytes.byteLength,
      parserKey: config?.parserKey ?? "unknown",
      parserVersion,
      retrievalStatus: prior?.contentHash === sha256 ? prior.retrievalStatus : "stored",
    });

    let holders: ExtractedOfficeholder[] = [];
    let retrievalStatus = "parsed";
    try {
      const parsed = await dispatchSourceAdapter({
        sourceKey,
        bytes,
        contentType,
        sourceUrl,
      });
      holders = parsed.holders;
      if (holders.length === 0 && parsed.verificationState === "source_found") {
        await input.store.recordClaim({
          subjectType: "source",
          subjectId: source.sourceId,
          fieldKey: "source_discovery",
          normalizedValue: "discovered_unverified",
          displayValue: parsed.discoveredUrls.join(" "),
          valueHash: await valueHash("source_discovery", parsed.discoveredUrls.join(" ")),
          verificationState: "source_found",
        });
      }
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
    await input.store.recordRawRetrieval({
      ...retrieval,
      retrievalStatus,
    });

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

async function resumeStoredBytes(input: {
  bucket?: EvidenceBucket;
  prior?: { rawObjectUri?: string; contentType?: string };
  sourceUrl: string;
  fetchImpl?: typeof fetch;
}): Promise<{ bytes: Uint8Array; fromStore: boolean; contentType?: string }> {
  const key = objectKeyFromRawObjectUri(input.prior?.rawObjectUri);
  if (key && input.bucket?.get) {
    const stored = await input.bucket.get(key);
    if (stored && stored.byteLength > 0) {
      return { bytes: stored, fromStore: true, contentType: input.prior?.contentType };
    }
  }
  const fresh = await fetchDocument(input.sourceUrl, { fetchImpl: input.fetchImpl });
  return { bytes: fresh.bytes, fromStore: false, contentType: fresh.contentType };
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
      seatId: seat.seatId,
      jurisdictionId: county.jurisdictionId,
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
        jobType: input.message.route,
        worker: input.worker.workerKey,
        sourceKey: input.message.sourceKey,
        targetType: input.message.entityType,
        targetId: input.message.entityId,
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
