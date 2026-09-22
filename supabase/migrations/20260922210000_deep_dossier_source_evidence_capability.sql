-- Register the bounded deep-dossier source-evidence worker.
-- This is not a civic fact and does not authorize identity, verification or
-- publication.  The worker may promote this row to ACTIVE only after it has
-- persisted a real successful worker_run and pending evidence object.
INSERT INTO public.physical_capabilities (
  capability_key, capability_family, implementation_state, worker_module, runtime,
  queue_pool, evidence_obligation, validation_path, concurrency_policy,
  current_blockers, monitoring_state
)
VALUES (
  'deep_dossier_source_evidence', 'dossier_foundation', 'READY',
  'workers/cloudflare/shared/src/contract-evidence.ts', 'cloudflare',
  'cloudflare-deterministic-http',
  '{"required":true,"raw_bytes":true,"sha256":true,"pending_evidence_object":true}'::jsonb,
  '{"independent_canonical_validation":true,"publication_authority":false}'::jsonb,
  '{"max_concurrency":2,"source_rate_limited":true}'::jsonb,
  '["NO_RECENT_SUCCESSFUL_CAPABILITY_RUN"]'::jsonb, 'UNKNOWN'
)
ON CONFLICT (capability_key) DO UPDATE SET
  capability_family = EXCLUDED.capability_family,
  worker_module = EXCLUDED.worker_module,
  runtime = EXCLUDED.runtime,
  queue_pool = EXCLUDED.queue_pool,
  evidence_obligation = EXCLUDED.evidence_obligation,
  validation_path = EXCLUDED.validation_path,
  concurrency_policy = EXCLUDED.concurrency_policy,
  updated_at = now();
