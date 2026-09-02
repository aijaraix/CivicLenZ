interface Env {
  EVIDENCE_BUCKET: R2Bucket;
  VALIDATE_QUEUE: Queue;
  HEAVY_QUEUE: Queue;
  DEAD_LETTER_QUEUE: Queue;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  WORKER_KEY: string;
  CF_VERSION_METADATA?: { id?: string };
}
