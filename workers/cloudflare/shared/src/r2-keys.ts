const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "application/json": "json",
  "text/csv": "csv",
  "text/plain": "txt",
  "text/html": "html",
  "application/xhtml+xml": "html",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/xml": "xml",
  "text/xml": "xml",
};

export function extensionForContentType(contentType: string | undefined, fallback = "bin"): string {
  if (!contentType) return fallback;
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return EXTENSIONS[normalized] ?? fallback;
}

export function rawObjectUri(bucketName: string, objectKey: string): string {
  return `r2://${bucketName}/${objectKey}`;
}

export function objectKeyFromRawObjectUri(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  const match = /^r2:\/\/[^/]+\/(.+)$/.exec(uri);
  return match?.[1];
}

export function evidenceObjectKey(input: {
  sourceKey: string;
  retrievedAt: Date | string;
  sha256: string;
  contentType?: string;
  extension?: string;
}): string {
  const retrieved = typeof input.retrievedAt === "string" ? new Date(input.retrievedAt) : input.retrievedAt;
  if (Number.isNaN(retrieved.getTime())) {
    throw new Error("retrieved_at is required to build an R2 object key");
  }
  if (!/^[a-f0-9]{64}$/.test(input.sha256)) {
    throw new Error("R2 object key requires a SHA-256 hex digest");
  }
  const sourceKey = input.sourceKey
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-");
  if (!sourceKey) throw new Error("source_key is required for the R2 object key");
  const year = String(retrieved.getUTCFullYear());
  const month = String(retrieved.getUTCMonth() + 1).padStart(2, "0");
  const day = String(retrieved.getUTCDate()).padStart(2, "0");
  const ext = input.extension ?? extensionForContentType(input.contentType);
  return `raw/${sourceKey}/${year}/${month}/${day}/${input.sha256}.${ext}`;
}
