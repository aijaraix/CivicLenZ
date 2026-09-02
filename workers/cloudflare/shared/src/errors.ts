export class CivicError extends Error {
  readonly errorClass: string;
  readonly retryable: boolean;
  readonly routeHeavy: boolean;

  constructor(
    errorClass: string,
    message: string,
    options: { retryable?: boolean; routeHeavy?: boolean } = {},
  ) {
    super(message);
    this.name = "CivicError";
    this.errorClass = errorClass;
    this.retryable = options.retryable ?? false;
    this.routeHeavy = options.routeHeavy ?? false;
  }
}

export class HttpFetchError extends CivicError {
  readonly httpStatus?: number;
  constructor(message: string, httpStatus?: number) {
    super(httpStatus && httpStatus >= 400 && httpStatus < 500 ? "http_client_error" : "http_fetch_failed", message, {
      retryable: !httpStatus || httpStatus >= 500 || httpStatus === 429,
    });
    this.httpStatus = httpStatus;
    this.name = "HttpFetchError";
  }
}

export class ParserError extends CivicError {
  constructor(message: string, routeHeavy = false) {
    super("parser_failure", message, { retryable: false, routeHeavy });
    this.name = "ParserError";
  }
}

export class StoreWriteError extends CivicError {
  constructor(message: string) {
    super("supabase_write_failed", message, { retryable: true });
    this.name = "StoreWriteError";
  }
}

export class DuplicateClaimError extends CivicError {
  readonly claimIds: string[];
  readonly fieldKey: string;

  constructor(claimIds: string[], fieldKey: string) {
    super(
      "duplicate_claim_rows",
      `multiple claims match subject_type+subject_id+field_key+value_hash for ${fieldKey}: ${claimIds.join(",")}`,
      { retryable: false },
    );
    this.claimIds = claimIds;
    this.fieldKey = fieldKey;
    this.name = "DuplicateClaimError";
  }
}

export function summarizePayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return { kind: typeof value };
  const record = value as Record<string, unknown>;
  return {
    jobId: record.jobId ?? record.id,
    dedupeKey: record.dedupeKey,
    route: record.route,
    sourceKey: record.sourceKey,
    sourceUrl: typeof record.sourceUrl === "string" ? record.sourceUrl : undefined,
    entityType: record.entityType,
    entityId: record.entityId,
    attempt: record.attempt ?? record.attemptCount,
  };
}

export function sanitizeErrorMessage(message: string, secrets: Array<string | undefined>): string {
  let sanitized = message;
  for (const secret of secrets) {
    if (secret && secret.length > 0 && sanitized.includes(secret)) {
      sanitized = sanitized.split(secret).join("[redacted]");
    }
  }
  return sanitized;
}
