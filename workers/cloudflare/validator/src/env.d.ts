interface Env {
  HEAVY_QUEUE: Queue;
  DEAD_LETTER_QUEUE: Queue;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  WORKER_KEY: string;
  CF_VERSION_METADATA?: { id?: string };
}
