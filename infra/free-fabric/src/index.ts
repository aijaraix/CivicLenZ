interface Env {
  DB: D1Database;
  CONTROL_TOKEN: string;
  DEFAULT_LEASE_SECONDS?: string;
  MAX_CLAIM_BATCH?: string;
}

type JsonRecord = Record<string, unknown>;

interface JobRow {
  id: number;
  dedupe_key: string;
  task_type: string;
  collector_key: string | null;
  scope_key: string | null;
  region: string | null;
  office_family: string | null;
  source_key: string | null;
  source_host: string | null;
  priority: number;
  status: string;
  payload_json: string;
  result_json: string | null;
  lease_owner: string | null;
  lease_expires_at: number | null;
  attempts: number;
  max_attempts: number;
  next_run_at: number;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
  last_error: string | null;
}

interface SourceScheduleRow {
  id: number;
  schedule_key: string;
  collector_key: string;
  task_type: string;
  scope_key: string | null;
  region: string | null;
  office_family: string | null;
  source_key: string | null;
  source_host: string | null;
  priority: number;
  payload_json: string;
  cadence_seconds: number;
  next_run_at: number;
}

interface EnqueueJob {
  dedupeKey: string;
  taskType: string;
  collectorKey?: string;
  scopeKey?: string;
  region?: string;
  officeFamily?: string;
  sourceKey?: string;
  sourceHost?: string;
  priority?: number;
  maxAttempts?: number;
  nextRunAt?: number;
  payload?: JsonRecord;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function nowEpoch(): number {
  return Math.floor(Date.now() / 1000);
}

function parseInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, parsed));
}

function isAuthorized(request: Request, env: Env): boolean {
  const header = request.headers.get("authorization") ?? "";
  return Boolean(env.CONTROL_TOKEN) && header === `Bearer ${env.CONTROL_TOKEN}`;
}

async function readJson(request: Request): Promise<JsonRecord> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("content_type_must_be_application_json");
  }
  const payload: unknown = await request.json();
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("json_body_must_be_an_object");
  }
  return payload as JsonRecord;
}

function parseJsonObject(value: string | null): JsonRecord | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JsonRecord)
      : { value: parsed };
  } catch {
    return { raw: value };
  }
}

function publicJob(row: JobRow): JsonRecord {
  return {
    id: row.id,
    dedupeKey: row.dedupe_key,
    taskType: row.task_type,
    collectorKey: row.collector_key,
    scopeKey: row.scope_key,
    region: row.region,
    officeFamily: row.office_family,
    sourceKey: row.source_key,
    sourceHost: row.source_host,
    priority: row.priority,
    status: row.status,
    payload: parseJsonObject(row.payload_json) ?? {},
    result: parseJsonObject(row.result_json),
    leaseOwner: row.lease_owner,
    leaseExpiresAt: row.lease_expires_at,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    nextRunAt: row.next_run_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    lastError: row.last_error,
  };
}

async function recordEvent(
  env: Env,
  eventType: string,
  jobId: number | null,
  workerId: string | null,
  event: JsonRecord = {},
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO collection_events (job_id, event_type, worker_id, event_json)
     VALUES (?1, ?2, ?3, ?4)`,
  )
    .bind(jobId, eventType, workerId, JSON.stringify(event))
    .run();
}

function validateEnqueueJob(value: unknown): EnqueueJob {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("each_job_must_be_an_object");
  }
  const job = value as Record<string, unknown>;
  const dedupeKey = String(job.dedupeKey ?? "").trim();
  const taskType = String(job.taskType ?? "").trim();
  if (!dedupeKey || dedupeKey.length > 500) throw new Error("invalid_dedupe_key");
  if (!taskType || taskType.length > 100) throw new Error("invalid_task_type");
  const payload = job.payload;
  if (payload !== undefined && (!payload || typeof payload !== "object" || Array.isArray(payload))) {
    throw new Error("payload_must_be_an_object");
  }
  return {
    dedupeKey,
    taskType,
    collectorKey: job.collectorKey ? String(job.collectorKey) : undefined,
    scopeKey: job.scopeKey ? String(job.scopeKey) : undefined,
    region: job.region ? String(job.region) : undefined,
    officeFamily: job.officeFamily ? String(job.officeFamily) : undefined,
    sourceKey: job.sourceKey ? String(job.sourceKey) : undefined,
    sourceHost: job.sourceHost ? String(job.sourceHost).toLowerCase() : undefined,
    priority: Number.isFinite(Number(job.priority)) ? Number(job.priority) : 50,
    maxAttempts: Number.isFinite(Number(job.maxAttempts)) ? Number(job.maxAttempts) : 5,
    nextRunAt: Number.isFinite(Number(job.nextRunAt)) ? Number(job.nextRunAt) : nowEpoch(),
    payload: (payload as JsonRecord | undefined) ?? {},
  };
}

async function enqueueJobs(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  const values = body.jobs;
  if (!Array.isArray(values) || values.length === 0) {
    return jsonResponse({ error: "jobs_array_required" }, 400);
  }
  if (values.length > 500) {
    return jsonResponse({ error: "maximum_500_jobs_per_request" }, 400);
  }

  let jobs: EnqueueJob[];
  try {
    jobs = values.map(validateEnqueueJob);
  } catch (error) {
    return jsonResponse({ error: String(error) }, 400);
  }

  const statements = jobs.map((job) =>
    env.DB.prepare(
      `INSERT OR IGNORE INTO collection_jobs (
        dedupe_key, task_type, collector_key, scope_key, region, office_family,
        source_key, source_host, priority, payload_json, max_attempts, next_run_at,
        created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, unixepoch(), unixepoch())`,
    ).bind(
      job.dedupeKey,
      job.taskType,
      job.collectorKey ?? null,
      job.scopeKey ?? null,
      job.region ?? null,
      job.officeFamily ?? null,
      job.sourceKey ?? null,
      job.sourceHost ?? null,
      Math.max(0, Math.min(1000, Math.trunc(job.priority ?? 50))),
      JSON.stringify(job.payload ?? {}),
      Math.max(1, Math.min(20, Math.trunc(job.maxAttempts ?? 5))),
      Math.trunc(job.nextRunAt ?? nowEpoch()),
    ),
  );

  const results = await env.DB.batch(statements);
  const inserted = results.reduce((total, result) => total + Number(result.meta.changes ?? 0), 0);
  return jsonResponse({ requested: jobs.length, inserted, duplicates: jobs.length - inserted }, 202);
}

async function claimOneJob(
  env: Env,
  workerId: string,
  capabilities: string[],
  region: string | null,
  leaseSeconds: number,
): Promise<JobRow | null> {
  const capabilityPlaceholders = capabilities.map(() => "?").join(", ");
  const conditions = [
    "status = 'queued'",
    "next_run_at <= unixepoch()",
    `task_type IN (${capabilityPlaceholders})`,
  ];
  const bindings: unknown[] = [...capabilities];
  if (region) {
    conditions.push("(region IS NULL OR region = ?)");
    bindings.push(region);
  }
  bindings.push(workerId, leaseSeconds);

  const sql = `
    UPDATE collection_jobs
    SET status = 'leased',
        lease_owner = ?,
        lease_expires_at = unixepoch() + ?,
        attempts = attempts + 1,
        updated_at = unixepoch()
    WHERE id = (
      SELECT id
      FROM collection_jobs
      WHERE ${conditions.join(" AND ")}
      ORDER BY priority DESC, created_at ASC
      LIMIT 1
    )
    AND status = 'queued'
    RETURNING *
  `;

  const reorderedBindings = [
    workerId,
    leaseSeconds,
    ...bindings.slice(0, capabilities.length + (region ? 1 : 0)),
  ];
  return env.DB.prepare(sql).bind(...reorderedBindings).first<JobRow>();
}

async function claimJobs(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  const workerId = String(body.workerId ?? "").trim();
  const rawCapabilities = body.capabilities;
  if (!workerId || workerId.length > 200) {
    return jsonResponse({ error: "valid_worker_id_required" }, 400);
  }
  if (!Array.isArray(rawCapabilities) || rawCapabilities.length === 0) {
    return jsonResponse({ error: "capabilities_array_required" }, 400);
  }
  const capabilities = [...new Set(rawCapabilities.map((value) => String(value).trim()).filter(Boolean))];
  if (capabilities.length === 0 || capabilities.length > 50) {
    return jsonResponse({ error: "capabilities_must_contain_1_to_50_values" }, 400);
  }

  const maximum = parseInteger(env.MAX_CLAIM_BATCH, 20, 1, 100);
  const requested = Math.max(1, Math.min(maximum, Math.trunc(Number(body.limit ?? 1))));
  const defaultLease = parseInteger(env.DEFAULT_LEASE_SECONDS, 900, 60, 7200);
  const leaseSeconds = Math.max(60, Math.min(7200, Math.trunc(Number(body.leaseSeconds ?? defaultLease))));
  const region = body.region ? String(body.region) : null;

  const jobs: JsonRecord[] = [];
  for (let index = 0; index < requested; index += 1) {
    const row = await claimOneJob(env, workerId, capabilities, region, leaseSeconds);
    if (!row) break;
    jobs.push(publicJob(row));
    await recordEvent(env, "job_leased", row.id, workerId, { leaseSeconds });
  }

  await env.DB.prepare(
    `INSERT INTO worker_heartbeats (
       worker_id, capabilities_json, region, state, active_job_id, last_seen_at
     ) VALUES (?1, ?2, ?3, 'online', ?4, unixepoch())
     ON CONFLICT(worker_id) DO UPDATE SET
       capabilities_json = excluded.capabilities_json,
       region = excluded.region,
       state = 'online',
       active_job_id = excluded.active_job_id,
       last_seen_at = unixepoch()`,
  )
    .bind(workerId, JSON.stringify(capabilities), region, jobs.length ? jobs[0].id : null)
    .run();

  return jsonResponse({ workerId, jobs, leaseSeconds });
}

function routeJobId(pathname: string, action: string): number | null {
  const match = pathname.match(new RegExp(`^/jobs/(\\d+)/${action}$`));
  return match ? Number.parseInt(match[1], 10) : null;
}

async function heartbeatJob(request: Request, env: Env, jobId: number): Promise<Response> {
  const body = await readJson(request);
  const workerId = String(body.workerId ?? "").trim();
  const defaultLease = parseInteger(env.DEFAULT_LEASE_SECONDS, 900, 60, 7200);
  const leaseSeconds = Math.max(60, Math.min(7200, Math.trunc(Number(body.leaseSeconds ?? defaultLease))));
  const result = await env.DB.prepare(
    `UPDATE collection_jobs
     SET lease_expires_at = unixepoch() + ?1, updated_at = unixepoch()
     WHERE id = ?2 AND status = 'leased' AND lease_owner = ?3`,
  )
    .bind(leaseSeconds, jobId, workerId)
    .run();
  if (!result.meta.changes) return jsonResponse({ error: "active_lease_not_found" }, 409);
  await recordEvent(env, "job_heartbeat", jobId, workerId, { leaseSeconds });
  return jsonResponse({ jobId, leaseExtended: true, leaseSeconds });
}

async function completeJob(request: Request, env: Env, jobId: number): Promise<Response> {
  const body = await readJson(request);
  const workerId = String(body.workerId ?? "").trim();
  const resultPayload = body.result && typeof body.result === "object" ? body.result : {};
  const result = await env.DB.prepare(
    `UPDATE collection_jobs
     SET status = 'complete', result_json = ?1, completed_at = unixepoch(),
         lease_owner = NULL, lease_expires_at = NULL, updated_at = unixepoch(), last_error = NULL
     WHERE id = ?2 AND status = 'leased' AND lease_owner = ?3`,
  )
    .bind(JSON.stringify(resultPayload), jobId, workerId)
    .run();
  if (!result.meta.changes) return jsonResponse({ error: "active_lease_not_found" }, 409);
  await env.DB.prepare(
    `UPDATE worker_heartbeats
     SET active_job_id = NULL, last_seen_at = unixepoch()
     WHERE worker_id = ?1`,
  )
    .bind(workerId)
    .run();
  await recordEvent(env, "job_completed", jobId, workerId, resultPayload as JsonRecord);
  return jsonResponse({ jobId, status: "complete" });
}

async function failJob(request: Request, env: Env, jobId: number): Promise<Response> {
  const body = await readJson(request);
  const workerId = String(body.workerId ?? "").trim();
  const errorText = String(body.error ?? "unknown_error").slice(0, 4000);
  const current = await env.DB.prepare(
    `SELECT * FROM collection_jobs
     WHERE id = ?1 AND status = 'leased' AND lease_owner = ?2`,
  )
    .bind(jobId, workerId)
    .first<JobRow>();
  if (!current) return jsonResponse({ error: "active_lease_not_found" }, 409);

  const dead = current.attempts >= current.max_attempts;
  const delaySeconds = Math.min(86400, 60 * 2 ** Math.max(0, current.attempts - 1));
  await env.DB.prepare(
    `UPDATE collection_jobs
     SET status = ?1,
         next_run_at = CASE WHEN ?1 = 'dead' THEN next_run_at ELSE unixepoch() + ?2 END,
         lease_owner = NULL,
         lease_expires_at = NULL,
         updated_at = unixepoch(),
         last_error = ?3
     WHERE id = ?4 AND status = 'leased' AND lease_owner = ?5`,
  )
    .bind(dead ? "dead" : "queued", delaySeconds, errorText, jobId, workerId)
    .run();
  await env.DB.prepare(
    `UPDATE worker_heartbeats
     SET active_job_id = NULL, last_seen_at = unixepoch(), state = 'online'
     WHERE worker_id = ?1`,
  )
    .bind(workerId)
    .run();
  await recordEvent(env, dead ? "job_dead" : "job_retry_scheduled", jobId, workerId, {
    error: errorText,
    delaySeconds: dead ? null : delaySeconds,
  });
  return jsonResponse({ jobId, status: dead ? "dead" : "queued", delaySeconds: dead ? null : delaySeconds });
}

async function workerHeartbeat(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  const workerId = String(body.workerId ?? "").trim();
  if (!workerId) return jsonResponse({ error: "worker_id_required" }, 400);
  const capabilities = Array.isArray(body.capabilities)
    ? body.capabilities.map((value) => String(value))
    : [];
  const state = ["online", "draining", "offline", "error"].includes(String(body.state))
    ? String(body.state)
    : "online";
  await env.DB.prepare(
    `INSERT INTO worker_heartbeats (
       worker_id, capabilities_json, region, host_name, version, state,
       active_job_id, last_seen_at, metadata_json
     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, unixepoch(), ?8)
     ON CONFLICT(worker_id) DO UPDATE SET
       capabilities_json = excluded.capabilities_json,
       region = excluded.region,
       host_name = excluded.host_name,
       version = excluded.version,
       state = excluded.state,
       active_job_id = excluded.active_job_id,
       last_seen_at = unixepoch(),
       metadata_json = excluded.metadata_json`,
  )
    .bind(
      workerId,
      JSON.stringify(capabilities),
      body.region ? String(body.region) : null,
      body.hostName ? String(body.hostName) : null,
      body.version ? String(body.version) : null,
      state,
      Number.isFinite(Number(body.activeJobId)) ? Number(body.activeJobId) : null,
      JSON.stringify(body.metadata && typeof body.metadata === "object" ? body.metadata : {}),
    )
    .run();
  return jsonResponse({ workerId, state, heartbeatAt: nowEpoch() });
}

async function health(env: Env): Promise<Response> {
  const statusResult = await env.DB.prepare(
    "SELECT status, COUNT(*) AS count FROM collection_jobs GROUP BY status ORDER BY status",
  ).all<{ status: string; count: number }>();
  const workerResult = await env.DB.prepare(
    `SELECT state, COUNT(*) AS count
     FROM worker_heartbeats
     GROUP BY state
     ORDER BY state`,
  ).all<{ state: string; count: number }>();
  const due = await env.DB.prepare(
    `SELECT COUNT(*) AS count
     FROM collection_jobs
     WHERE status = 'queued' AND next_run_at <= unixepoch()`,
  ).first<{ count: number }>();
  const oldest = await env.DB.prepare(
    `SELECT MIN(created_at) AS created_at
     FROM collection_jobs
     WHERE status = 'queued'`,
  ).first<{ created_at: number | null }>();
  return jsonResponse({
    generatedAt: nowEpoch(),
    jobsByStatus: Object.fromEntries(
      (statusResult.results ?? []).map((row) => [row.status, Number(row.count)]),
    ),
    workersByState: Object.fromEntries(
      (workerResult.results ?? []).map((row) => [row.state, Number(row.count)]),
    ),
    dueJobs: Number(due?.count ?? 0),
    oldestQueuedAt: oldest?.created_at ?? null,
  });
}

async function scheduledMaintenance(env: Env): Promise<void> {
  const now = nowEpoch();
  await env.DB.prepare(
    `UPDATE collection_jobs
     SET status = 'queued', lease_owner = NULL, lease_expires_at = NULL,
         next_run_at = unixepoch(), updated_at = unixepoch(),
         last_error = COALESCE(last_error, 'lease_expired')
     WHERE status = 'leased' AND lease_expires_at IS NOT NULL AND lease_expires_at < unixepoch()`,
  ).run();

  await env.DB.prepare(
    `UPDATE worker_heartbeats
     SET state = 'offline', active_job_id = NULL
     WHERE last_seen_at < unixepoch() - 300 AND state != 'offline'`,
  ).run();

  const dueSchedules = await env.DB.prepare(
    `SELECT * FROM source_schedules
     WHERE enabled = 1 AND next_run_at <= unixepoch()
     ORDER BY next_run_at ASC
     LIMIT 100`,
  ).all<SourceScheduleRow>();

  for (const schedule of dueSchedules.results ?? []) {
    const dedupeKey = `schedule:${schedule.schedule_key}:${schedule.next_run_at}`;
    const insert = await env.DB.prepare(
      `INSERT OR IGNORE INTO collection_jobs (
         dedupe_key, task_type, collector_key, scope_key, region, office_family,
         source_key, source_host, priority, payload_json, next_run_at,
         created_at, updated_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, unixepoch(), unixepoch(), unixepoch())`,
    )
      .bind(
        dedupeKey,
        schedule.task_type,
        schedule.collector_key,
        schedule.scope_key,
        schedule.region,
        schedule.office_family,
        schedule.source_key,
        schedule.source_host,
        schedule.priority,
        schedule.payload_json,
      )
      .run();
    await env.DB.prepare(
      `UPDATE source_schedules
       SET next_run_at = CASE
         WHEN next_run_at + cadence_seconds < unixepoch()
           THEN unixepoch() + cadence_seconds
         ELSE next_run_at + cadence_seconds
       END,
       updated_at = unixepoch()
       WHERE id = ?1`,
    )
      .bind(schedule.id)
      .run();
    if (insert.meta.changes) {
      await recordEvent(env, "scheduled_job_enqueued", null, null, {
        scheduleKey: schedule.schedule_key,
        dedupeKey,
        scheduledAt: schedule.next_run_at,
      });
    }
  }

  await recordEvent(env, "scheduler_heartbeat", null, null, {
    dueSchedules: dueSchedules.results?.length ?? 0,
    at: now,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!isAuthorized(request, env)) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return health(env);
      }
      if (request.method === "POST" && url.pathname === "/jobs/enqueue") {
        return enqueueJobs(request, env);
      }
      if (request.method === "POST" && url.pathname === "/jobs/claim") {
        return claimJobs(request, env);
      }
      if (request.method === "POST" && url.pathname === "/workers/heartbeat") {
        return workerHeartbeat(request, env);
      }

      const heartbeatId = routeJobId(url.pathname, "heartbeat");
      if (request.method === "POST" && heartbeatId !== null) {
        return heartbeatJob(request, env, heartbeatId);
      }
      const completeId = routeJobId(url.pathname, "complete");
      if (request.method === "POST" && completeId !== null) {
        return completeJob(request, env, completeId);
      }
      const failId = routeJobId(url.pathname, "fail");
      if (request.method === "POST" && failId !== null) {
        return failJob(request, env, failId);
      }

      return jsonResponse({ error: "not_found" }, 404);
    } catch (error) {
      console.error(error);
      return jsonResponse(
        {
          error: "request_failed",
          detail: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  },

  async scheduled(_event: ScheduledController, env: Env, context: ExecutionContext): Promise<void> {
    context.waitUntil(scheduledMaintenance(env));
  },
} satisfies ExportedHandler<Env>;
