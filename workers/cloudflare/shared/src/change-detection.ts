export type ChangeSignals = {
  etag?: string;
  lastModified?: string;
  contentHash?: string;
};

export function retrievalUnchanged(previous: ChangeSignals | undefined, next: ChangeSignals): boolean {
  if (!previous) return false;
  if (next.contentHash && previous.contentHash && next.contentHash === previous.contentHash) return true;
  if (next.etag && previous.etag && next.etag === previous.etag) return true;
  if (next.lastModified && previous.lastModified && next.lastModified === previous.lastModified && !next.contentHash) {
    return true;
  }
  return false;
}

export function httpUnchanged(status: number): boolean {
  return status === 304;
}

export function isRetrievalDownstreamComplete(input: {
  retrieval?: { retrievalId: string; retrievalStatus: string };
  evidence?: Array<{ retrievalId?: string }>;
  claims?: unknown[];
  jurisdictions?: unknown[];
  seats?: unknown[];
}): boolean {
  if (!input.retrieval || input.retrieval.retrievalStatus !== "parsed") return false;
  const evidenceForRetrieval = (input.evidence ?? []).some(
    (row) => row.retrievalId === input.retrieval?.retrievalId,
  );
  const persistHappened =
    evidenceForRetrieval ||
    (input.claims?.length ?? 0) > 0 ||
    (input.jurisdictions?.length ?? 0) > 0 ||
    (input.seats?.length ?? 0) > 0;
  return persistHappened;
}
