import { CivicError, ParserError } from "./errors.ts";
import { createDeadLetterPayload, shouldDeadLetter } from "./dead-letter.ts";
import { sha256Hex, valueHash } from "./hash.ts";
import { fetchDocument } from "./http.ts";
import { electionMonitorDedupeKey, heavyDedupeKey, toQueueMessage, validateDedupeKey } from "./jobs.ts";
import { miamiDadeSeatKey } from "./miami-dade.ts";
import { dispatchSourceAdapter } from "./adapters.ts";
import { httpUnchanged, isRetrievalDownstreamComplete, retrievalUnchanged } from "./change-detection.ts";
import { officeClassForOfficeType } from "./office-classes.ts";
import { persistOfficeClassContract } from "./research-contracts.ts";
import { queueMissingProfileWork } from "./research.ts";
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
    const fetchHeaders = config?.fetchUserAgent ? { "User-Agent": config.fetchUserAgent } : undefined;
    const document = await fetchDocument(sourceUrl, {
      fetchImpl: input.fetchImpl,
      ifNoneMatch: prior?.etag,
      ifModifiedSince: prior?.lastModified,
      headers: fetchHeaders,
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
        headers: fetchHeaders,
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
      if (holders.length === 0 && parsed.verificationState === "extracted" && config?.coverage === "parser") {
        throw new ParserError(`parser ${config.parserKey} extracted 0 officeholders from ${sourceKey}`);
      }
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
      const pdfFamily = config?.sourceType === "small_pdf" || config?.sourceType === "large_pdf";
      if (!pdfFamily && config?.coverage === "parser") throw error;
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
  headers?: Record<string, string>;
}): Promise<{ bytes: Uint8Array; fromStore: boolean; contentType?: string }> {
  const key = objectKeyFromRawObjectUri(input.prior?.rawObjectUri);
  if (key && input.bucket?.get) {
    const stored = await input.bucket.get(key);
    if (stored && stored.byteLength > 0) {
      return { bytes: stored, fromStore: true, contentType: input.prior?.contentType };
    }
  }
  const fresh = await fetchDocument(input.sourceUrl, { fetchImpl: input.fetchImpl, headers: input.headers });
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
  const config = sourceAdapter(input.sourceKey);
  const evidenceType =
    config?.sourceType === "small_pdf" || config?.sourceType === "large_pdf" ? "pdf_excerpt" : "html_excerpt";
  const occupiedSeatKeys = new Set<string>();
  for (const holder of input.holders) {
    const jurisdiction = await upsertHolderJurisdiction(store, holder);
    const seatKey = seatKeyFor(holder, input.sourceKey);
    const officeClass = officeClassForOfficeType(holder.officeKind);
    await persistOfficeClassContract(store, officeClass);
    const skipPerson = isVacantDisplayName(holder.displayName);
    const isCurrentOccupant =
      !skipPerson &&
      (!holder.vacant || holder.occupancyStatus === "current" || holder.occupancyStatus === "acting");
    const seatOccupied = isCurrentOccupant || occupiedSeatKeys.has(seatKey);
    const seat = await store.upsertSeat({
      seatKey,
      jurisdictionId: jurisdiction.jurisdictionId,
      seatName: holder.officeTitle,
      officeType: holder.officeKind,
      governmentLevel: holder.governmentLevel,
      branch: holder.branch,
      chamber: holder.chamber,
      districtNumber: holder.districtNumber,
      occupancyStatus: seatOccupied ? "occupied" : "vacant",
      researchContractKey: officeClass,
      baselineStatus: seatOccupied ? "officeholder_present" : "seat_only",
      monitoringActive: false,
    });
    if (skipPerson) {
      if (occupiedSeatKeys.has(seatKey)) continue;
      const vacantClaim = await store.recordClaim({
        subjectType: "seat",
        subjectId: seat.seatId,
        seatId: seat.seatId,
        fieldKey: "current_occupant",
        normalizedValue: "vacant",
        displayValue: "Vacant",
        valueHash: await valueHash("current_occupant", "vacant"),
        verificationState: "collected_unreviewed",
      });
      const evidence = await store.recordEvidence({
        sourceId: input.sourceId,
        retrievalId: input.retrievalId,
        evidenceType,
        sourceUrl: holder.sourceMemberUrl ?? input.sourceUrl,
        excerpt: holder.rawRowText,
        assetUri: input.assetUri,
        contentHash: input.contentHash,
        verificationState: "collected_unreviewed",
      });
      await store.attachClaimEvidence(vacantClaim.claimId, evidence.evidenceId, "supports");
      continue;
    }
    const person = await store.upsertPerson({
      canonicalName: holder.displayName,
      seatId: seat.seatId,
      jurisdictionId: jurisdiction.jurisdictionId,
      externalIdentifiers: holder.externalIdentifiers,
    });
    const occupancyStatus = holder.occupancyStatus ?? (holder.vacant ? "former" : "current");
    await store.upsertOccupancy({
      seatId: seat.seatId,
      personId: person.personId,
      startDate: holder.startDate,
      endDate: occupancyStatus === "former" ? holder.endDate : undefined,
      occupancyStatus,
      electedOrAppointed: holder.electedOrAppointed,
      evidenceState: "unreviewed",
    });
    if (occupancyStatus === "current" || occupancyStatus === "acting") {
      occupiedSeatKeys.add(seatKey);
      await store.upsertSeat({
        seatKey: seat.seatKey,
        jurisdictionId: seat.jurisdictionId,
        seatName: seat.seatName,
        officeType: seat.officeType,
        governmentLevel: seat.governmentLevel,
        branch: seat.branch,
        chamber: seat.chamber,
        districtNumber: seat.districtNumber,
        occupancyStatus: "occupied",
        researchContractKey: officeClass,
        baselineStatus: "officeholder_present",
        monitoringActive: false,
      });
    }
    const claim = await store.recordClaim({
      subjectType: "seat",
      subjectId: seat.seatId,
      seatId: seat.seatId,
      fieldKey: occupancyStatus === "current" || occupancyStatus === "acting" ? "current_occupant" : "former_occupant",
      normalizedValue: holder.displayName,
      displayValue: holder.displayName,
      valueHash: await valueHash(
        occupancyStatus === "current" || occupancyStatus === "acting" ? "current_occupant" : "former_occupant",
        holder.displayName,
      ),
      verificationState: "collected_unreviewed",
    });
    const evidence = await store.recordEvidence({
      sourceId: input.sourceId,
      retrievalId: input.retrievalId,
      evidenceType,
      sourceUrl: holder.sourceMemberUrl ?? input.sourceUrl,
      excerpt: holder.rawRowText,
      assetUri: input.assetUri,
      contentHash: input.contentHash,
      verificationState: "collected_unreviewed",
    });
    await store.attachClaimEvidence(claim.claimId, evidence.evidenceId, "supports");
    if (holder.partyName) {
      const partyClaim = await store.recordClaim({
        subjectType: "person",
        subjectId: person.personId,
        seatId: seat.seatId,
        fieldKey: "party",
        normalizedValue: holder.partyName,
        displayValue: holder.partyName,
        valueHash: await valueHash("party", holder.partyName),
        verificationState: "collected_unreviewed",
      });
      await store.attachClaimEvidence(partyClaim.claimId, evidence.evidenceId, "supports");
    }
    if (holder.portraitUrl) {
      const portraitClaim = await store.recordClaim({
        subjectType: "person",
        subjectId: person.personId,
        seatId: seat.seatId,
        fieldKey: "portrait",
        normalizedValue: holder.portraitUrl,
        displayValue: holder.portraitUrl,
        valueHash: await valueHash("portrait", holder.portraitUrl),
        verificationState: "collected_unreviewed",
      });
      await store.attachClaimEvidence(portraitClaim.claimId, evidence.evidenceId, "supports");
    }
    if (holder.email || holder.phone) {
      const contactValue = [holder.email, holder.phone].filter(Boolean).join(" ");
      const contactClaim = await store.recordClaim({
        subjectType: "person",
        subjectId: person.personId,
        seatId: seat.seatId,
        fieldKey: "contact",
        normalizedValue: contactValue,
        displayValue: contactValue,
        valueHash: await valueHash("contact", contactValue),
        verificationState: "collected_unreviewed",
      });
      await store.attachClaimEvidence(contactClaim.claimId, evidence.evidenceId, "supports");
    }
    if (occupancyStatus === "current" || occupancyStatus === "acting") {
      await queueMissingProfileWork(store, {
        seat,
        person,
        officialWebsite: holder.sourceMemberUrl ?? input.sourceUrl,
      });
    }
  }
}

async function upsertHolderJurisdiction(
  store: CivicStore,
  holder: ExtractedOfficeholder,
): Promise<{ jurisdictionId: string }> {
  const parent = await store.upsertJurisdiction({
    jurisdictionKey: holder.parentJurisdictionKey ?? "us-fl",
    name: "Florida",
    jurisdictionType: "state",
    stateCode: "FL",
  });
  const key = jurisdictionKeyFor(holder);
  if (key === "us-fl") return parent;
  return store.upsertJurisdiction({
    jurisdictionKey: key,
    name: holder.jurisdictionName,
    jurisdictionType: holder.jurisdictionType ?? holder.governmentLevel,
    stateCode: holder.stateCode || "FL",
    countyName: holder.countyName ?? (holder.governmentLevel === "county" ? holder.jurisdictionName.replace(/ County$/i, "") : undefined),
    parentJurisdictionId: parent.jurisdictionId,
  });
}

function jurisdictionKeyFor(holder: ExtractedOfficeholder): string {
  if (holder.jurisdictionKey) return holder.jurisdictionKey;
  if (holder.governmentLevel === "county" && /miami-dade/i.test(holder.jurisdictionName)) return "us-fl-miami-dade";
  return "us-fl";
}

function seatKeyFor(holder: ExtractedOfficeholder, sourceKey: string): string {
  if (holder.seatKey) return holder.seatKey;
  if (sourceKey === "miami-dade-county-elected-officials" || holder.governmentLevel === "county") {
    return miamiDadeSeatKey(holder);
  }
  const family = holder.seatFamily.replace(/_/g, "-");
  return holder.districtNumber ? `us-fl-${family}-district-${holder.districtNumber}` : `us-fl-${family}`;
}

function isVacantDisplayName(value: string): boolean {
  return value.trim().toLowerCase() === "vacant";
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
