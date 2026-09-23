-- Promote the second independent contract slice to READY.
-- These are routed evidence/quarantine paths only; physical success remains
-- required before any capability can become ACTIVE.

WITH contract(capability_key, capability_family) AS (
  VALUES
    ('election_calendar', 'elections_candidates'),
    ('election_discovery', 'elections_candidates'),
    ('filing_status', 'elections_candidates'),
    ('ballot_qualification', 'elections_candidates'),
    ('election_results', 'elections_candidates'),
    ('election_history', 'background'),
    ('donor_relationships', 'relationships'),
    ('freshness_monitor', 'system_quality'),
    ('contradiction_resolution', 'system_quality')
)
UPDATE public.physical_capabilities AS p
SET
  capability_family = c.capability_family,
  implementation_state = 'READY',
  worker_module = 'services/hermes-prime/capability_router.py -> workers/cloudflare/shared/src/contract-evidence.ts',
  runtime = 'cloudflare',
  queue_pool = 'cloudflare-deterministic-http',
  source_tool_authority = jsonb_build_object(
    'registry_required', true,
    'authority_tier', 'TIER_1_PRIMARY_OFFICIAL',
    'source_family_selection', 'contract_scoped',
    'capability_family', c.capability_family
  ),
  input_schema = jsonb_build_object(
    'subject_or_seat_id', 'uuid',
    'scope_key', 'text',
    'deep_dossier_unit_key', 'text',
    'source_id', 'uuid',
    'retrieval_id', 'uuid'
  ),
  output_schema = jsonb_build_object(
    'evidence_only', true,
    'identity_attribution', 'unresolved',
    'verification_authority', false,
    'publication_authority', false
  ),
  evidence_obligation = jsonb_build_object(
    'required', true,
    'immutable_raw_bytes', true,
    'sha256', true,
    'provenance', true
  ),
  validation_path = jsonb_build_object(
    'independent_canonical_validation', true,
    'next_stage', 'canonical_reconciliation_and_validation',
    'coverage_audit_required', true
  ),
  concurrency_policy = jsonb_build_object(
    'governor', 'resource_governor',
    'source_rate_limits', true,
    'pool_reserved_for_validation', true
  ),
  current_blockers = '[\"NO_RECENT_SUCCESSFUL_CAPABILITY_RUN\"]'::jsonb,
  monitoring_state = 'UNKNOWN',
  updated_at = now()
FROM contract AS c
WHERE p.capability_key = c.capability_key
  AND p.implementation_state = 'NOT_IMPLEMENTED';
