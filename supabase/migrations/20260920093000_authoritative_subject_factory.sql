-- Authoritative subject factory activation.
--
-- This migration updates current active discovery configuration from the
-- legacy Florida DOS policy key to the canonical source-registry key and adds
-- a private unresolved roster staging table.  It does not rewrite historical
-- jobs, raw retrievals, worker runs, claims, evidence, or attempts.

UPDATE public.research_contract_fields AS f
SET source_priority = jsonb_set(
    f.source_priority,
    '{policy}',
    to_jsonb(replace(coalesce(f.source_priority->>'policy', ''), 'florida-election-calendar', 'fl_dos_elections')),
    true
  ),
  updated_at = clock_timestamp()
FROM public.research_contracts AS c
WHERE c.research_contract_id = f.research_contract_id
  AND c.active
  AND c.contract_key = 'STATE_GOVERNOR'
  AND coalesce(f.source_priority->>'policy', '') LIKE '%florida-election-calendar%';

UPDATE public.sources AS s
SET jurisdiction_id = j.jurisdiction_id,
    parser_key = coalesce(s.parser_key, 'miami-dade-elected-officials'),
    parser_version = coalesce(s.parser_version, 'canonical-roster-v1'),
    updated_at = clock_timestamp()
FROM public.jurisdictions AS j
WHERE s.source_key = 'miami-dade-county-elected-officials'
  AND j.jurisdiction_key = 'us-fl-miami-dade'
  AND s.active;

INSERT INTO public.research_contracts (
  contract_key, name, office_class, version, active, description
) VALUES (
  'AUTHORITATIVE_ROSTER_DISCOVERY',
  'Authoritative roster discovery',
  'authoritative_roster',
  1,
  true,
  'Source-registry driven discovery of offices and named roster entries; outputs remain unresolved until canonical validation/reconciliation.'
)
ON CONFLICT (contract_key) DO UPDATE SET
  name = EXCLUDED.name,
  office_class = EXCLUDED.office_class,
  version = EXCLUDED.version,
  active = EXCLUDED.active,
  description = EXCLUDED.description,
  updated_at = clock_timestamp();

WITH contract AS (
  SELECT research_contract_id
  FROM public.research_contracts
  WHERE contract_key = 'AUTHORITATIVE_ROSTER_DISCOVERY'
)
INSERT INTO public.research_contract_fields (
  research_contract_id, field_key, category, required_for_baseline,
  verification_requirement, source_priority, volatility_class,
  recheck_policy, sensitivity_rule, sort_order
)
SELECT
  contract.research_contract_id,
  field_key,
  category,
  true,
  'official_source',
  jsonb_build_object('policy', 'miami-dade-county-elected-officials'),
  'dynamic',
  jsonb_build_object('cadence', 'daily', 'monitoring_required', true),
  'publication_eligible_claims_only',
  sort_order
FROM contract
CROSS JOIN (VALUES
  ('seat', 'foundation', 10),
  ('identity', 'foundation', 20)
) AS fields(field_key, category, sort_order)
ON CONFLICT (research_contract_id, field_key) DO UPDATE SET
  category = EXCLUDED.category,
  required_for_baseline = EXCLUDED.required_for_baseline,
  verification_requirement = EXCLUDED.verification_requirement,
  source_priority = EXCLUDED.source_priority,
  volatility_class = EXCLUDED.volatility_class,
  recheck_policy = EXCLUDED.recheck_policy,
  sensitivity_rule = EXCLUDED.sensitivity_rule,
  sort_order = EXCLUDED.sort_order,
  updated_at = clock_timestamp();

CREATE TABLE IF NOT EXISTS public.unresolved_roster_units (
  roster_unit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_key text NOT NULL,
  source_id uuid NOT NULL REFERENCES public.sources(source_id) ON DELETE RESTRICT,
  retrieval_id uuid REFERENCES public.raw_retrievals(retrieval_id) ON DELETE RESTRICT,
  extraction_worker_run_id uuid REFERENCES public.worker_runs(worker_run_id) ON DELETE SET NULL,
  jurisdiction_id uuid REFERENCES public.jurisdictions(jurisdiction_id) ON DELETE RESTRICT,
  seat_id uuid REFERENCES public.seats(seat_id) ON DELETE SET NULL,
  source_key text NOT NULL,
  source_url text NOT NULL,
  content_hash text,
  locator text,
  office_title text,
  office_kind text,
  district_number text,
  jurisdiction_name text,
  display_name text,
  term_label text,
  term_length_text text,
  year_on_ballot_text text,
  service_end_date_text text,
  raw_row_text text,
  review_state text NOT NULL DEFAULT 'UNRESOLVED',
  publication_eligible boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (review_state IN ('UNRESOLVED','NEEDS_IDENTITY_RESEARCH','SEAT_RECONCILED','REJECTED','SUPERSEDED')),
  CHECK (publication_eligible = false),
  UNIQUE (source_id, unit_key, content_hash)
);

CREATE INDEX IF NOT EXISTS unresolved_roster_units_source_idx
  ON public.unresolved_roster_units(source_id, review_state);

CREATE INDEX IF NOT EXISTS unresolved_roster_units_jurisdiction_idx
  ON public.unresolved_roster_units(jurisdiction_id, review_state);

CREATE INDEX IF NOT EXISTS unresolved_roster_units_seat_idx
  ON public.unresolved_roster_units(seat_id)
  WHERE seat_id IS NOT NULL;

ALTER TABLE public.unresolved_roster_units ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.unresolved_roster_units FROM anon, authenticated;
