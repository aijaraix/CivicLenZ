import { timingSafeEqual } from "node:crypto";

import { isUuid } from "./ids.ts";
import {
  ingestDedupeKey,
  isJobDue,
  queueNameForRoute,
  queueSenderForRoute,
  routeForJobType,
  toQueueMessage,
} from "./jobs.ts";
import { operatorControlledSources, sourceAdapter } from "./source-config.ts";
import type { CivicStore } from "./store.ts";
import type { JobRoute, RuntimeQueues } from "./types.ts";

export const OPERATOR_ENQUEUE_PATH = "/operator/enqueue-job";
export const OPERATOR_SECRET_NAME = "CIVICLENZ_OPERATOR_TRIGGER_SECRET";

/** Live controlled Miami-Dade ingest job. Tests use this as a fixture. Do not call production. */
export const CONTROLLED_MIAMI_DADE_INGEST_JOB_ID = "7d93a416-1483-4550-b203-e8c424c289b7";
export const CONTROLLED_MIAMI_DADE_DEDUPE_KEY = "ingest:miami-dade-county-elected-officials:2026-09-02";
export const CONTROLLED_MIAMI_DADE_SOURCE_KEY = "miami-dade-county-elected-officials";
export const CONTROLLED_MIAMI_DADE_SOURCE_URL =
  "https://www.miamidade.gov/elections/library/reports/elected-officials.pdf";

/** Live controlled Florida Governor ingest job. Tests use this as a fixture. Do not call production. */
export const CONTROLLED_FLORIDA_GOVERNOR_INGEST_JOB_ID = "7a3b6912-1d01-569f-8b62-03b4c39a88da";
export const CONTROLLED_FLORIDA_GOVERNOR_DEDUPE_KEY = "ingest:florida-governor-official:2026-09-02";
export const CONTROLLED_FLORIDA_GOVERNOR_SOURCE_KEY = "florida-governor-official";
export const CONTROLLED_FLORIDA_GOVERNOR_RETRIEVAL_ID = "c92dace8-94f4-46bd-bc51-23d85bd73f28";

export const CONTROLLED_FLORIDA_SENATE_SOURCE_KEY = "florida-senate-members";
export const CONTROLLED_FLORIDA_HOUSE_SOURCE_KEY = "florida-house-members";

export type OperatorEnqueueRequest = {
  jobId?: string;
  sourceKey?: string;
};

export type OperatorEnqueueSuccess = {
  jobId: string;
  dedupeKey: string;
  route: JobRoute;
  queue: string;
  enqueued: true;
};

function extractBearerToken(authorizationHeader: string | null | undefined): string | undefined {
  if (!authorizationHeader) return undefined;
  const trimmed = authorizationHeader.trim();
  const space = trimmed.indexOf(" ");
  if (space <= 0) return undefined;
  const scheme = trimmed.slice(0, space);
  if (scheme.toLowerCase() !== "bearer") return undefined;
  const token = trimmed.slice(space + 1).trim();
  return token.length > 0 ? token : undefined;
}

async function secretsMatch(provided: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return timingSafeEqual(new Uint8Array(providedHash), new Uint8Array(expectedHash));
}

export async function authorizeOperator(
  authorizationHeader: string | null | undefined,
  expectedSecret: string | undefined,
): Promise<boolean> {
  if (!expectedSecret) return false;
  const token = extractBearerToken(authorizationHeader);
  if (!token) {
    await secretsMatch("missing-operator-token", expectedSecret);
    return false;
  }
  return secretsMatch(token, expectedSecret);
}

export function responseContainsSecret(body: unknown, secrets: Array<string | undefined>): boolean {
  const serialized = JSON.stringify(body);
  return secrets.some((secret) => Boolean(secret && secret.length > 0 && serialized.includes(secret)));
}

export async function enqueueExistingQueuedJob(input: {
  store: CivicStore;
  queues: RuntimeQueues;
  jobId: string;
  now?: Date;
}): Promise<{ status: number; body: OperatorEnqueueSuccess | { error: string } }> {
  if (!isUuid(input.jobId)) {
    return { status: 400, body: { error: "invalid_job_id" } };
  }
  const job = await input.store.getJob(input.jobId);
  if (!job) {
    return { status: 404, body: { error: "job_not_found" } };
  }
  if (job.status !== "queued") {
    return { status: 409, body: { error: "job_not_enqueueable" } };
  }
  const now = input.now ?? new Date();
  if (!isJobDue(job.scheduledFor, now)) {
    return { status: 409, body: { error: "job_not_due" } };
  }
  const route = routeForJobType(job.jobType);
  if (!route) {
    return { status: 400, body: { error: "invalid_job_type" } };
  }
  const sender = queueSenderForRoute(route, input.queues);
  if (!sender) {
    return { status: 503, body: { error: "queue_binding_missing" } };
  }
  const message = toQueueMessage(job, false, now);
  await sender.send(message);
  return {
    status: 200,
    body: {
      jobId: job.jobId,
      dedupeKey: job.dedupeKey,
      route,
      queue: queueNameForRoute(route),
      enqueued: true,
    },
  };
}

const TERMINAL_REQUEUE_STATUSES = new Set(["dead_letter", "failed"]);

/**
 * Reset an existing dead_letter/failed jobs row to queued and send it to its queue.
 * jobId only — never inserts a new jobs row and never accepts sourceKey.
 */
export async function requeueExistingTerminalJob(input: {
  store: CivicStore;
  queues: RuntimeQueues;
  jobId: string;
  now?: Date;
}): Promise<{ status: number; body: OperatorEnqueueSuccess | { error: string } }> {
  if (!isUuid(input.jobId)) {
    return { status: 400, body: { error: "invalid_job_id" } };
  }
  if (input.jobId === CONTROLLED_MIAMI_DADE_INGEST_JOB_ID) {
    return { status: 409, body: { error: "miami_dade_job_must_not_be_recreated" } };
  }
  const job = await input.store.getJob(input.jobId);
  if (!job) {
    return { status: 404, body: { error: "job_not_found" } };
  }
  if (!TERMINAL_REQUEUE_STATUSES.has(job.status)) {
    return { status: 409, body: { error: "job_not_requeueable" } };
  }
  await input.store.requeueJob(input.jobId);
  return enqueueExistingQueuedJob(input);
}

/** POST {jobId}: enqueue if queued; reset+enqueue if dead_letter/failed (except Miami-Dade). */
export async function enqueueExistingJobById(input: {
  store: CivicStore;
  queues: RuntimeQueues;
  jobId: string;
  now?: Date;
}): Promise<{ status: number; body: OperatorEnqueueSuccess | { error: string } }> {
  if (!isUuid(input.jobId)) {
    return { status: 400, body: { error: "invalid_job_id" } };
  }
  const job = await input.store.getJob(input.jobId);
  if (!job) {
    return { status: 404, body: { error: "job_not_found" } };
  }
  if (TERMINAL_REQUEUE_STATUSES.has(job.status)) {
    return requeueExistingTerminalJob(input);
  }
  return enqueueExistingQueuedJob(input);
}

export function isOperatorControlledSource(sourceKey: string): boolean {
  if (sourceKey === CONTROLLED_MIAMI_DADE_SOURCE_KEY) return false;
  return operatorControlledSources().some((item) => item.sourceKey === sourceKey);
}

export async function enqueueControlledSourceJob(input: {
  store: CivicStore;
  queues: RuntimeQueues;
  sourceKey: string;
  now?: Date;
}): Promise<{ status: number; body: OperatorEnqueueSuccess | { error: string } }> {
  if (input.sourceKey === CONTROLLED_MIAMI_DADE_SOURCE_KEY) {
    return { status: 409, body: { error: "miami_dade_job_must_not_be_recreated" } };
  }
  if (!isOperatorControlledSource(input.sourceKey)) {
    return { status: 400, body: { error: "source_not_operator_controlled" } };
  }
  const config = sourceAdapter(input.sourceKey);
  if (!config?.baseUrl) {
    return { status: 404, body: { error: "source_not_found" } };
  }
  const now = input.now ?? new Date();
  const scheduled = await input.store.scheduleJob({
    dedupeKey: ingestDedupeKey(input.sourceKey, now),
    route: "ingest",
    sourceKey: input.sourceKey,
    payload: {
      sourceKey: input.sourceKey,
      sourceUrl: config.baseUrl,
      sourceType: config.sourceType,
      parserKey: config.parserKey,
      operatorSeed: true,
      purpose: "controlled florida legislative baseline",
    },
    scheduledFor: now.toISOString(),
  });
  if (scheduled.job.status !== "queued") {
    return { status: 409, body: { error: "job_not_enqueueable" } };
  }
  return enqueueExistingQueuedJob({
    store: input.store,
    queues: input.queues,
    jobId: scheduled.job.jobId,
    now,
  });
}
