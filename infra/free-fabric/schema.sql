PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS collection_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dedupe_key TEXT NOT NULL UNIQUE,
  task_type TEXT NOT NULL,
  collector_key TEXT,
  scope_key TEXT,
  region TEXT,
  office_family TEXT,
  source_key TEXT,
  source_host TEXT,
  priority INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'leased', 'complete', 'failed', 'dead', 'cancelled')),
  payload_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT,
  lease_owner TEXT,
  lease_expires_at INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_run_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at INTEGER,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_claim
  ON collection_jobs(status, next_run_at, task_type, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_region
  ON collection_jobs(status, region, task_type, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_source_host
  ON collection_jobs(source_host, status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_jobs_lease
  ON collection_jobs(status, lease_expires_at);

CREATE TABLE IF NOT EXISTS source_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_key TEXT NOT NULL UNIQUE,
  collector_key TEXT NOT NULL,
  task_type TEXT NOT NULL,
  scope_key TEXT,
  region TEXT,
  office_family TEXT,
  source_key TEXT,
  source_host TEXT,
  priority INTEGER NOT NULL DEFAULT 50,
  payload_json TEXT NOT NULL DEFAULT '{}',
  cadence_seconds INTEGER NOT NULL,
  next_run_at INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_source_schedules_due
  ON source_schedules(enabled, next_run_at);

CREATE TABLE IF NOT EXISTS worker_heartbeats (
  worker_id TEXT PRIMARY KEY,
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  region TEXT,
  host_name TEXT,
  version TEXT,
  state TEXT NOT NULL DEFAULT 'online'
    CHECK (state IN ('online', 'draining', 'offline', 'error')),
  active_job_id INTEGER,
  last_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (active_job_id) REFERENCES collection_jobs(id)
);

CREATE INDEX IF NOT EXISTS idx_worker_last_seen
  ON worker_heartbeats(last_seen_at);

CREATE TABLE IF NOT EXISTS collection_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER,
  event_type TEXT NOT NULL,
  worker_id TEXT,
  event_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (job_id) REFERENCES collection_jobs(id)
);

CREATE INDEX IF NOT EXISTS idx_events_job
  ON collection_events(job_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_type
  ON collection_events(event_type, created_at);

CREATE TABLE IF NOT EXISTS evidence_objects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sha256 TEXT NOT NULL UNIQUE,
  r2_key TEXT NOT NULL UNIQUE,
  source_url TEXT,
  source_key TEXT,
  media_type TEXT,
  byte_size INTEGER,
  retrieved_at INTEGER NOT NULL,
  rights_status TEXT NOT NULL DEFAULT 'review_required',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_evidence_source
  ON evidence_objects(source_key, retrieved_at);

CREATE TABLE IF NOT EXISTS fact_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_key TEXT NOT NULL UNIQUE,
  seat_id TEXT,
  person_id TEXT,
  term_id TEXT,
  field_path TEXT NOT NULL,
  value_json TEXT NOT NULL,
  evidence_object_id INTEGER,
  evidence_locator_json TEXT NOT NULL DEFAULT '{}',
  confidence REAL,
  sensitivity_tier TEXT NOT NULL DEFAULT 'B'
    CHECK (sensitivity_tier IN ('A', 'B', 'C')),
  review_status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (review_status IN ('candidate', 'approved', 'rejected', 'disputed', 'superseded')),
  extractor TEXT,
  collected_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewer TEXT,
  review_note TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (evidence_object_id) REFERENCES evidence_objects(id)
);

CREATE INDEX IF NOT EXISTS idx_fact_seat_field
  ON fact_candidates(seat_id, field_path, review_status);
CREATE INDEX IF NOT EXISTS idx_fact_review_queue
  ON fact_candidates(review_status, sensitivity_tier, collected_at);

CREATE TABLE IF NOT EXISTS coverage_metrics (
  scope_key TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  numerator INTEGER NOT NULL DEFAULT 0,
  denominator INTEGER NOT NULL DEFAULT 0,
  generated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (scope_key, metric_key)
);

CREATE TABLE IF NOT EXISTS source_rate_limits (
  source_host TEXT PRIMARY KEY,
  max_concurrency INTEGER NOT NULL DEFAULT 1,
  minimum_delay_ms INTEGER NOT NULL DEFAULT 1000,
  blocked_until INTEGER,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
