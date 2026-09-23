-- Promote repository-backed family contracts to READY without claiming physical execution.
-- This migration only records that bounded routing and the evidence worker exist.
-- ACTIVE remains telemetry-derived from a successful capability-specific worker_run.

WITH contract(capability_key, capability_family) AS (
  VALUES
    ('campaign_committees', 'finance'),
    ('campaign_finance', 'finance'),
    ('contributions', 'finance'),
    ('expenditures', 'finance'),
    ('pac_relationships', 'finance'),
    ('finance_reconciliation', 'finance'),
    ('financial_disclosures', 'disclosure'),
    ('assets', 'disclosure'),
    ('liabilities', 'disclosure'),
    ('income_sources', 'disclosure'),
    ('business_interests', 'disclosure'),
    ('gifts', 'disclosure'),
    ('outside_income', 'disclosure'),
    ('legislation', 'government_activity'),
    ('sponsored_bills', 'government_activity'),
    ('votes', 'government_activity'),
    ('committee_assignments', 'government_activity'),
    ('executive_actions', 'government_activity'),
    ('executive_orders', 'government_activity'),
    ('bill_signings', 'government_activity'),
    ('vetoes', 'government_activity'),
    ('appointments', 'government_activity'),
    ('budget_actions', 'government_activity'),
    ('campaign_promises', 'accountability'),
    ('public_commitments', 'accountability'),
    ('public_statements', 'accountability'),
    ('promise_status', 'accountability'),
    ('official_press', 'media_monitoring'),
    ('news', 'media_monitoring'),
    ('interviews', 'media_monitoring'),
    ('debates', 'media_monitoring'),
    ('official_social', 'media_monitoring'),
    ('material_social_activity', 'media_monitoring'),
    ('political_relationships', 'relationships'),
    ('organization_relationships', 'relationships'),
    ('staff_relationships', 'relationships'),
    ('appointment_relationships', 'relationships'),
    ('publicly_relevant_family_business_relationships', 'relationships'),
    ('ethics', 'accountability'),
    ('investigations', 'accountability'),
    ('court_public_records', 'accountability'),
    ('conflicts_of_interest', 'accountability'),
    ('biography', 'background'),
    ('education', 'background'),
    ('career', 'background'),
    ('military_history', 'background'),
    ('political_history', 'background'),
    ('prior_offices', 'background'),
    ('official_contact', 'foundation')
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
  current_blockers = '["NO_RECENT_SUCCESSFUL_CAPABILITY_RUN"]'::jsonb,
  monitoring_state = 'UNKNOWN',
  updated_at = now()
FROM contract AS c
WHERE p.capability_key = c.capability_key
  AND p.implementation_state = 'NOT_IMPLEMENTED';

-- The guarded state transition is intentional:
-- NOT_IMPLEMENTED -> READY is allowed here; READY/ACTIVE/FAILED/disabled rows
-- are not rewritten by this migration.
