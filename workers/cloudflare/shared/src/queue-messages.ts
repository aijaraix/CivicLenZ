import { JOB_ROUTES, type JobRoute, type QueueJobMessage } from "./types.ts";

export function isJobRoute(value: unknown): value is JobRoute {
  return typeof value === "string" && (JOB_ROUTES as readonly string[]).includes(value);
}

export function parseQueueJobMessage(value: unknown): QueueJobMessage {
  if (!value || typeof value !== "object") {
    throw new Error("queue message must be an object");
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== "1.0.0") {
    throw new Error("queue message schemaVersion must be 1.0.0");
  }
  if (typeof record.jobId !== "string" || record.jobId.length < 8) {
    throw new Error("queue message jobId is required");
  }
  if (typeof record.dedupeKey !== "string" || record.dedupeKey.length < 3) {
    throw new Error("queue message dedupeKey is required");
  }
  if (!isJobRoute(record.route)) {
    throw new Error("queue message route must be ingest, validate, monitor, or heavy");
  }
  if (typeof record.attempt !== "number" || !Number.isInteger(record.attempt) || record.attempt < 0) {
    throw new Error("queue message attempt must be a non-negative integer");
  }
  if (typeof record.scheduledFor !== "string" || Number.isNaN(Date.parse(record.scheduledFor))) {
    throw new Error("queue message scheduledFor must be an ISO timestamp");
  }
  if (typeof record.dryRun !== "boolean") {
    throw new Error("queue message dryRun must be a boolean");
  }
  const optionalString = (key: string): string | undefined => {
    const current = record[key];
    if (current === undefined || current === null) return undefined;
    if (typeof current !== "string") throw new Error(`queue message ${key} must be a string`);
    return current;
  };
  return {
    schemaVersion: "1.0.0",
    jobId: record.jobId,
    dedupeKey: record.dedupeKey,
    route: record.route,
    sourceKey: optionalString("sourceKey"),
    sourceUrl: optionalString("sourceUrl"),
    entityType: optionalString("entityType"),
    entityId: optionalString("entityId"),
    retrievalId: optionalString("retrievalId"),
    claimId: optionalString("claimId"),
    attempt: record.attempt,
    scheduledFor: record.scheduledFor,
    dryRun: record.dryRun,
    metadata: record.metadata && typeof record.metadata === "object" ? (record.metadata as Record<string, unknown>) : undefined,
  };
}

export function createQueueJobMessage(input: Omit<QueueJobMessage, "schemaVersion">): QueueJobMessage {
  return parseQueueJobMessage({ schemaVersion: "1.0.0", ...input });
}
