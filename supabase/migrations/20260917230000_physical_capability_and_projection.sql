-- Physical capability truth and dimensional dossier coverage.
-- Additive only: this migration does not create civic facts or publication eligibility.

CREATE TABLE IF NOT EXISTS public.physical_capabilities (
  capability_key text PRIMARY KEY,
  capability_family text NOT NULL,
  implementation_state text NOT NULL CHECK (implementation_state IN
    ('DECLARED','NOT_IMPLEMENTED','READY','ACTIVE','DEGRADED','DISABLED','FAILED')),
  worker_module text,
  runtime text,
  queue_pool text,
  source_tool_authority jsonb NOT NULL DEFAULT '{}'::jsonb,
  input_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_obligation jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_path jsonb NOT NULL DEFAULT '{}'::jsonb,
  concurrency_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_successful_worker_run_id uuid REFERENCES public.worker_runs(worker_run_id) ON DELETE SET NULL,
  last_failed_worker_run_id uuid REFERENCES public.worker_runs(worker_run_id) ON DELETE SET NULL,
  backlog_count bigint NOT NULL DEFAULT 0 CHECK (backlog_count >= 0),
  current_blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  deployment_version text,
  monitoring_state text NOT NULL DEFAULT 'UNKNOWN',
  last_observed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (implementation_state <> 'ACTIVE' OR
    (last_successful_worker_run_id IS NOT NULL AND last_observed_at IS NOT NULL))
);

COMMENT ON TABLE public.physical_capabilities IS
  'Machine-readable capability truth. ACTIVE requires a durable successful worker_run and recent observation.';

CREATE TABLE IF NOT EXISTS public.subject_scope_coverage (
  subject_scope_coverage_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  seat_id uuid REFERENCES public.seats(seat_id) ON DELETE SET NULL,
  research_contract_id uuid NOT NULL REFERENCES public.research_contracts(research_contract_id) ON DELETE RESTRICT,
  scope_key text NOT NULL,
  dataset_kind text NOT NULL CHECK (dataset_kind IN ('FINITE','OPEN_ENDED')),
  coverage_state text NOT NULL CHECK (coverage_state IN
    ('UNRESOLVED','SOURCE_BLOCKED','CAPABILITY_BLOCKED','IN_PROGRESS','REOPENED',
     'RECONCILED_THROUGH','SEARCH_SATURATED_AS_OF','CURRENT_TO_CONTRACT_DEPTH','NOT_APPLICABLE')),
  cutoff_at timestamptz,
  expected_units bigint CHECK (expected_units IS NULL OR expected_units >= 0),
  accounted_units bigint NOT NULL DEFAULT 0 CHECK (accounted_units >= 0),
  missing_units bigint CHECK (missing_units IS NULL OR missing_units >= 0),
  required_source_families jsonb NOT NULL DEFAULT '[]'::jsonb,
  attempted_source_families jsonb NOT NULL DEFAULT '[]'::jsonb,
  successful_source_families jsonb NOT NULL DEFAULT '[]'::jsonb,
  discovery_passes integer NOT NULL DEFAULT 0 CHECK (discovery_passes >= 0),
  unresolved_leads integer NOT NULL DEFAULT 0 CHECK (unresolved_leads >= 0),
  evidence_count bigint NOT NULL DEFAULT 0 CHECK (evidence_count >= 0),
  validation_count bigint NOT NULL DEFAULT 0 CHECK (validation_count >= 0),
  coverage_audit_state text NOT NULL DEFAULT 'PENDING',
  coverage_audit_worker_run_id uuid REFERENCES public.worker_runs(worker_run_id) ON DELETE SET NULL,
  last_researched_at timestamptz,
  next_check_at timestamptz,
  blocker text,
  next_action text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subject_type, subject_id, research_contract_id, scope_key),
  CHECK (dataset_kind <> 'FINITE' OR expected_units IS NULL OR
    accounted_units + COALESCE(missing_units, 0) <= expected_units),
  CHECK (coverage_state NOT IN ('RECONCILED_THROUGH','SEARCH_SATURATED_AS_OF','CURRENT_TO_CONTRACT_DEPTH')
    OR coverage_audit_state IN ('PASSED','PASSED_WITH_DISCLOSED_GAPS'))
);

CREATE INDEX IF NOT EXISTS physical_capabilities_state_idx
  ON public.physical_capabilities (implementation_state, capability_family);
CREATE INDEX IF NOT EXISTS subject_scope_coverage_subject_idx
  ON public.subject_scope_coverage (subject_type, subject_id, coverage_state);
CREATE INDEX IF NOT EXISTS subject_scope_coverage_due_idx
  ON public.subject_scope_coverage (next_check_at)
  WHERE next_check_at IS NOT NULL;

ALTER TABLE public.physical_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_scope_coverage ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.physical_capabilities FROM anon, authenticated;
REVOKE ALL ON public.subject_scope_coverage FROM anon, authenticated;

CREATE OR REPLACE VIEW public.public_official_projection
WITH (security_invoker = true) AS
SELECT
  p.person_id,
  p.canonical_name,
  p.portrait_url,
  p.portrait_source_url,
  p.portrait_credit,
  p.portrait_status,
  s.seat_id,
  s.seat_key,
  s.seat_name,
  s.office_type,
  s.government_level,
  s.district_name,
  s.district_number,
  s.jurisdiction_id,
  j.name AS jurisdiction_name,
  j.state_code,
  o.occupancy_id,
  o.start_date,
  o.end_date,
  o.occupancy_status,
  GREATEST(p.updated_at, s.updated_at, o.updated_at) AS current_as_of
FROM public.seat_occupancies o
JOIN public.persons p ON p.person_id = o.person_id
JOIN public.seats s ON s.seat_id = o.seat_id
JOIN public.jurisdictions j ON j.jurisdiction_id = s.jurisdiction_id
WHERE o.occupancy_status IN ('current','acting')
  AND o.evidence_state IN ('verified','reviewed','authoritative')
  AND p.identity_status IN ('verified','resolved')
  AND s.baseline_status IN ('verified','reviewed','complete');

COMMENT ON VIEW public.public_official_projection IS
  'Least-field publication-gated official projection; internal jobs, workers, notes and unreviewed claims are excluded.';

REVOKE ALL ON public.public_official_projection FROM anon, authenticated;

