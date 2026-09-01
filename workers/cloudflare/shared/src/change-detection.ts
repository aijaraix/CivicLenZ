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
