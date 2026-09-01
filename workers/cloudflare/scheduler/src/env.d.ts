interface Env {
  INGEST_QUEUE: Queue;
  VALIDATE_QUEUE: Queue;
  MONITOR_QUEUE: Queue;
  HEAVY_QUEUE: Queue;
  DEAD_LETTER_QUEUE: Queue;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  DRY_RUN: string;
  WORKER_KEY: string;
  CF_VERSION_METADATA?: { id?: string };
}
