-- Synchronize existing family definitions into the physical capability catalog.
-- These rows are READY for routed evidence work, never ACTIVE by declaration.

WITH contract(capability_key, capability_family) AS (
  VALUES
    ('source_discovery', 'source_discovery'),
    ('gis_boundaries', 'gis_elections')
)
INSERT INTO public.physical_capabilities (
  capability_key,
  capability_family,
  implementation_state,
  worker_module,
  runtime,
  queue_pool,
  source_tool_authority,
  input_schema,
  output_schema,
  evidence_obligation,
  validation_path,
  concurrency_policy,
  current_blockers,
  monitoring_state
)
SELECT
  c.capability_key,
  c.capability_family,
  'READY',
  'services/hermes-prime/capability_router.py -> workers/cloudflare/shared/src/contract-evidence.ts',
  'cloudflare',
  'cloudflare-deterministic-http',
  jsonb_build_object(
    'registry_required', true,
    'authority_tier', 'TIER_1_PRIMARY_OFFICIAL',
    'source_family_selection', 'contract_scoped',
    'capability_family', c.capability_family
  ),
  jsonb_build_object(
    'subject_or_seat_id', 'uuid',
    'scope_key', 'text',
    'deep_dossier_unit_key', 'text',
    'source_id', 'uuid',
    'retrieval_id', 'uuid'
  ),
  jsonb_build_object(
    'evidence_only', true,
    'identity_attribution', 'unresolved',
    'verification_authority', false,
    'publication_authority', false
  ),
  jsonb_build_object(
    'required', true,
    'immutable_raw_bytes', true,
    'sha256', true,
    'provenance', true
  ),
  jsonb_build_object(
    'independent_canonical_validation', true,
    'next_stage', 'canonical_reconciliation_and_validation',
    'coverage_audit_required', true
  ),
  jsonb_build_object(
    'governor', 'resource_governor',
    'source_rate_limits', true,
    'pool_reserved_for_validation', true
  ),
  '["NO_RECENT_SUCCESSFUL_CAPABILITY_RUN"]'::jsonb,
  'UNKNOWN'
FROM contract AS c
ON CONFLICT (capability_key) DO UPDATE
SET
  capability_family = EXCLUDED.capability_family,
  implementation_state = EXCLUDED.implementation_state,
  worker_module = EXCLUDED.worker_module,
  runtime = EXCLUDED.runtime,
  queue_pool = EXCLUDED.queue_pool,
  source_tool_authority = EXCLUDED.source_tool_authority,
  input_schema = EXCLUDED.input_schema,
  output_schema = EXCLUDED.output_schema,
  evidence_obligation = EXCLUDED.evidence_obligation,
  validation_path = EXCLUDED.validation_path,
  concurrency_policy = EXCLUDED.concurrency_policy,
  current_blockers = EXCLUDED.current_blockers,
  monitoring_state = EXCLUDED.monitoring_state,
  updated_at = now()
WHERE public.physical_capabilities.implementation_state = 'NOT_IMPLEMENTED';
