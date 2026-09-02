import { CAPABILITIES, queueForCapability, type Capability } from "./capabilities.ts";
import { createQueueJobMessage, isJobRoute } from "./queue-messages.ts";
import type { JobRecord, JobRoute, QueueJobMessage, QueueSender, RuntimeQueues } from "./types.ts";

export const QUEUE_RESOURCE_NAMES: Record<JobRoute, string> = {
  ingest: "civiclenz-ingest",
  validate: "civiclenz-validate",
  monitor: "civiclenz-monitor",
  heavy: "civiclenz-heavy",
};

const ACTIVE_JOB_STATUSES = new Set(["queued", "leased", "running"]);

export function ingestDedupeKey(sourceKey: string, windowStart: Date): string {
  return `ingest:${sourceKey}:${utcDateKey(windowStart)}`;
}

export function validateDedupeKey(retrievalId: string): string {
  return `validate:${retrievalId}`;
}

export function monitorDedupeKey(targetType: string, targetKey: string, monitoringClass: string, windowStart: Date): string {
  return `monitor:${targetType}:${targetKey}:${monitoringClass}:${utcDateKey(windowStart)}`;
}

export function heavyDedupeKey(sourceKey: string, reason: string, url: string, windowStart: Date): string {
  return `heavy:${sourceKey}:${reason}:${stableToken(url)}:${utcDateKey(windowStart)}`;
}

export function electionMonitorDedupeKey(jurisdictionKey: string, windowStart: Date): string {
  return monitorDedupeKey("election_calendar", jurisdictionKey, "daily", windowStart);
}

export function utcDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function stableToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function jobDedupeKey(job: JobRecord): string {
  if (job.dedupeKey) return job.dedupeKey;
  const fromCheckpoint = job.checkpoint.dedupeKey;
  if (typeof fromCheckpoint === "string" && fromCheckpoint.length > 0) return fromCheckpoint;
  const fromPayload = job.payload.dedupeKey;
  if (typeof fromPayload === "string" && fromPayload.length > 0) return fromPayload;
  return `${job.jobType}:${job.targetType ?? ""}:${job.targetId ?? ""}`;
}

export function hasActiveJob(jobs: JobRecord[], dedupeKey: string): boolean {
  return jobs.some((job) => jobDedupeKey(job) === dedupeKey && ACTIVE_JOB_STATUSES.has(job.status));
}

export function shouldEnqueueJob(existing: JobRecord | undefined): boolean {
  if (!existing) return true;
  return !ACTIVE_JOB_STATUSES.has(existing.status);
}

export function routeForSource(input: {
  collectionMode?: string;
  sourceType?: string;
  byteLength?: number;
  needsBrowser?: boolean;
  needsOcr?: boolean;
  needsGis?: boolean;
}): JobRoute {
  if (input.needsBrowser || input.needsOcr || input.needsGis) return "heavy";
  if (input.collectionMode === "manual_or_browser_assisted") return "heavy";
  if ((input.byteLength ?? 0) > 8 * 1024 * 1024) return "heavy";
  if (input.sourceType === "database_and_filings") return "heavy";
  return "ingest";
}

export function routeForJobType(jobType: string | undefined): JobRoute | undefined {
  if (!jobType) return undefined;
  if (isJobRoute(jobType)) return jobType;
  if ((CAPABILITIES as readonly string[]).includes(jobType)) {
    return queueForCapability(jobType as Capability);
  }
  return undefined;
}

export function queueNameForRoute(route: JobRoute): string {
  return QUEUE_RESOURCE_NAMES[route];
}

export function queueSenderForRoute(route: JobRoute, queues: RuntimeQueues): QueueSender | undefined {
  if (route === "ingest") return queues.ingest;
  if (route === "validate") return queues.validate;
  if (route === "monitor") return queues.monitor;
  return queues.heavy;
}

export function isJobDue(scheduledFor: string | null | undefined, now: Date): boolean {
  if (scheduledFor == null || scheduledFor === "") return true;
  const ts = Date.parse(scheduledFor);
  if (Number.isNaN(ts)) return false;
  return ts <= now.getTime();
}

export function scheduledForForQueueMessage(scheduledFor: string | null | undefined, now: Date): string {
  if (scheduledFor && !Number.isNaN(Date.parse(scheduledFor))) return scheduledFor;
  return now.toISOString();
}

export function toQueueMessage(job: JobRecord, dryRun: boolean, now = new Date()): QueueJobMessage {
  const route = routeForJobType(job.jobType);
  if (!route) {
    throw new Error("queue message route must be ingest, validate, monitor, or heavy");
  }
  const sourceKey =
    typeof job.payload.sourceKey === "string"
      ? job.payload.sourceKey
      : typeof job.checkpoint.sourceKey === "string"
        ? job.checkpoint.sourceKey
        : undefined;
  const sourceUrl =
    typeof job.payload.sourceUrl === "string"
      ? job.payload.sourceUrl
      : typeof job.checkpoint.sourceUrl === "string"
        ? job.checkpoint.sourceUrl
        : undefined;
  return createQueueJobMessage({
    jobId: job.jobId,
    dedupeKey: jobDedupeKey(job),
    route,
    sourceKey,
    sourceUrl,
    entityType: job.targetType,
    entityId: job.targetId ?? (typeof job.payload.entityId === "string" ? job.payload.entityId : undefined),
    retrievalId:
      typeof job.payload.retrievalId === "string"
        ? job.payload.retrievalId
        : typeof job.checkpoint.retrievalId === "string"
          ? job.checkpoint.retrievalId
          : undefined,
    claimId:
      typeof job.payload.claimId === "string"
        ? job.payload.claimId
        : typeof job.checkpoint.claimId === "string"
          ? job.checkpoint.claimId
          : undefined,
    attempt: job.attemptCount,
    scheduledFor: scheduledForForQueueMessage(job.scheduledFor, now),
    dryRun,
    metadata: { ...job.checkpoint, ...job.payload },
  });
}
