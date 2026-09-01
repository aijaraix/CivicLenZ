-- CivicLenZ collection runtime reconstruction.
--
-- LIVE SUPABASE (project CivicLenZ, ref uazqyzmzydtmbypjuqjw) is authoritative.
-- This file reconstructs the live civic / collection tables for a FRESH database
-- so local / CI / review environments match production columns, PKs, and RLS.
--
-- DO NOT apply this file to live production. Live already has these tables
-- (empty, RLS enabled) from:
--   20260901222128 civiclenz_canonical_civic_foundation
--   20260901222145 civiclenz_foundation_security_hardening
--
-- lease_due_job() is NEW relative to live. After review, add it to live via a
-- separate additive migration. Do not apply this reconstruction to production.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- Civic entities
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.jurisdictions (
  jurisdiction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_key text NOT NULL UNIQUE,
  name text NOT NULL,
  jurisdiction_type text NOT NULL,
  parent_jurisdiction_id uuid REFERENCES public.jurisdictions (jurisdiction_id),
  state_code text,
  county_name text,
  municipality_name text,
  fips_code text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jurisdiction_boundaries (
  boundary_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_id uuid NOT NULL REFERENCES public.jurisdictions (jurisdiction_id),
  geometry geometry,
  version text,
  effective_from date,
  effective_to date,
  source_hash text
);

CREATE TABLE IF NOT EXISTS public.seats (
  seat_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_key text NOT NULL UNIQUE,
  seat_name text NOT NULL,
  office_type text,
  government_level text,
  branch text,
  chamber text,
  jurisdiction_id uuid NOT NULL REFERENCES public.jurisdictions (jurisdiction_id),
  district_name text,
  district_number text,
  seat_at_large boolean NOT NULL DEFAULT false,
  selection_method text,
  partisan_office boolean,
  term_length_months integer,
  term_limit_summary text,
  vacancy_filling_method text,
  authority_summary text,
  responsibilities text,
  eligibility_requirements text,
  occupancy_status text,
  next_election_date date,
  research_contract_key text,
  baseline_status text,
  monitoring_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.persons (
  person_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL,
  first_name text,
  middle_name text,
  last_name text,
  suffix text,
  preferred_name text,
  aliases jsonb NOT NULL DEFAULT '[]'::jsonb,
  date_of_birth date,
  birthplace text,
  portrait_url text,
  portrait_source_url text,
  portrait_credit text,
  portrait_status text,
  identity_status text,
  external_identifiers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.elections (
  election_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id uuid NOT NULL REFERENCES public.seats (seat_id),
  election_key text NOT NULL UNIQUE,
  election_type text,
  election_date date,
  filing_open_date date,
  filing_deadline date,
  qualifying_open_date date,
  qualifying_deadline date,
  status text,
  source_url text,
  certification_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seat_occupancies (
  occupancy_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id uuid NOT NULL REFERENCES public.seats (seat_id),
  person_id uuid NOT NULL REFERENCES public.persons (person_id),
  start_date date,
  end_date date,
  assumed_office_date date,
  sworn_in_date date,
  occupancy_status text,
  elected_or_appointed text,
  election_id uuid REFERENCES public.elections (election_id),
  evidence_state text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seat_id, person_id, start_date)
);

CREATE TABLE IF NOT EXISTS public.candidate_campaigns (
  candidate_campaign_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.persons (person_id),
  seat_id uuid NOT NULL REFERENCES public.seats (seat_id),
  election_id uuid NOT NULL REFERENCES public.elections (election_id),
  party text,
  candidate_status text,
  filing_date date,
  qualified_date date,
  withdrawal_date date,
  campaign_website text,
  committee_name text,
  committee_identifier text,
  portrait_status text,
  baseline_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (person_id, seat_id, election_id)
);

CREATE TABLE IF NOT EXISTS public.sources (
  source_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  name text NOT NULL,
  source_url text NOT NULL,
  source_type text,
  authority_tier text,
  jurisdiction_id uuid REFERENCES public.jurisdictions (jurisdiction_id),
  host text,
  active boolean NOT NULL DEFAULT true,
  refresh_class text,
  normal_poll_interval text,
  election_poll_interval text,
  rate_limit_policy jsonb,
  parser_key text,
  parser_version text,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  next_poll_at timestamptz,
  health_state text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jobs (
  job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  target_type text,
  target_id uuid,
  seat_id uuid REFERENCES public.seats (seat_id),
  source_id uuid REFERENCES public.sources (source_id),
  priority integer NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'leased', 'running', 'succeeded', 'failed', 'dead_letter', 'cancelled')),
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  leased_by text,
  lease_expires_at timestamptz,
  checkpoint jsonb,
  dedupe_key text UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  error_class text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.raw_retrievals (
  retrieval_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.sources (source_id),
  job_id uuid REFERENCES public.jobs (job_id),
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  source_url text NOT NULL,
  http_status integer,
  content_type text,
  etag text,
  last_modified text,
  content_hash text,
  raw_object_uri text,
  byte_length bigint,
  parser_key text,
  parser_version text,
  retrieval_status text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.evidence_objects (
  evidence_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.sources (source_id),
  retrieval_id uuid REFERENCES public.raw_retrievals (retrieval_id),
  evidence_type text,
  source_url text,
  supporting_locator text,
  excerpt text,
  asset_uri text,
  content_hash text,
  verification_state text,
  rights_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.claims (
  claim_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  seat_id uuid REFERENCES public.seats (seat_id),
  field_key text NOT NULL,
  normalized_value text,
  display_value text,
  value_hash text,
  valid_from timestamptz,
  valid_to timestamptz,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  last_verified_at timestamptz,
  verification_state text NOT NULL DEFAULT 'not_collected'
    CHECK (verification_state IN (
      'not_collected',
      'collected_unreviewed',
      'source_found',
      'extracted',
      'entity_match_pending',
      'evidence_pending',
      'verification_pending',
      'verified',
      'conflict',
      'stale',
      'rejected',
      'superseded',
      'checked_no_authoritative_result'
    )),
  confidence numeric,
  volatility_class text,
  recheck_after timestamptz,
  supersedes_claim_id uuid REFERENCES public.claims (claim_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_type, subject_id, field_key, value_hash)
);

CREATE TABLE IF NOT EXISTS public.claim_evidence (
  claim_id uuid NOT NULL REFERENCES public.claims (claim_id) ON DELETE CASCADE,
  evidence_id uuid NOT NULL REFERENCES public.evidence_objects (evidence_id) ON DELETE CASCADE,
  role text NOT NULL
    CHECK (role IN ('supports', 'contradicts', 'contextualizes', 'official_response')),
  PRIMARY KEY (claim_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS public.validation_runs (
  validation_run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text,
  subject_id uuid,
  seat_id uuid REFERENCES public.seats (seat_id),
  validator_key text,
  status text,
  input_summary jsonb,
  result_summary jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contradictions (
  contradiction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text,
  subject_id uuid,
  seat_id uuid REFERENCES public.seats (seat_id),
  field_key text,
  claim_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  status text,
  severity text,
  resolution_summary text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.research_contracts (
  research_contract_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_key text NOT NULL UNIQUE,
  name text NOT NULL,
  office_class text,
  version text,
  active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.research_contract_fields (
  research_contract_field_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_contract_id uuid NOT NULL REFERENCES public.research_contracts (research_contract_id) ON DELETE CASCADE,
  field_key text NOT NULL,
  category text,
  required_for_baseline boolean NOT NULL DEFAULT false,
  verification_requirement text,
  source_priority jsonb,
  volatility_class text,
  recheck_policy text,
  sensitivity_rule text,
  sort_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (research_contract_id, field_key)
);

CREATE TABLE IF NOT EXISTS public.monitoring_state (
  monitoring_state_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  seat_id uuid REFERENCES public.seats (seat_id),
  active boolean NOT NULL DEFAULT true,
  monitoring_class text,
  last_checked_at timestamptz,
  last_changed_at timestamptz,
  next_check_at timestamptz,
  consecutive_failures integer NOT NULL DEFAULT 0,
  last_result text,
  configuration jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, monitoring_class)
);

CREATE TABLE IF NOT EXISTS public.worker_runs (
  worker_run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_key text NOT NULL,
  runtime text,
  deployment_id text,
  job_id uuid REFERENCES public.jobs (job_id),
  status text NOT NULL DEFAULT 'started'
    CHECK (status IN ('started', 'succeeded', 'failed', 'degraded', 'cancelled')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  records_read integer NOT NULL DEFAULT 0,
  records_written integer NOT NULL DEFAULT 0,
  claims_verified integer NOT NULL DEFAULT 0,
  error_class text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_lease_queue
  ON public.jobs (status, scheduled_for, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_claims_subject
  ON public.claims (subject_type, subject_id, field_key);
CREATE INDEX IF NOT EXISTS idx_seats_jurisdiction
  ON public.seats (jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_next_check
  ON public.monitoring_state (active, next_check_at);

-- ---------------------------------------------------------------------------
-- Atomic job lease (GitHub reconstruction only — do not apply to live yet)
-- Live needs this function added later via a NEW additive migration after review.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lease_due_job(
  p_leased_by text,
  p_lease_seconds integer DEFAULT 300,
  p_job_id uuid DEFAULT NULL
)
RETURNS SETOF public.jobs
LANGUAGE plpgsql
AS $$
DECLARE
  claimed public.jobs;
BEGIN
  UPDATE public.jobs
  SET
    status = 'leased',
    leased_by = p_leased_by,
    lease_expires_at = now() + make_interval(secs => p_lease_seconds),
    attempt_count = attempt_count + 1,
    started_at = COALESCE(started_at, now()),
    updated_at = now()
  WHERE job_id = (
    SELECT j.job_id
    FROM public.jobs j
    WHERE (
        j.status = 'queued'
        OR (j.status = 'leased' AND (j.lease_expires_at IS NULL OR j.lease_expires_at < now()))
      )
      AND (j.scheduled_for IS NULL OR j.scheduled_for <= now())
      AND (p_job_id IS NULL OR j.job_id = p_job_id)
    ORDER BY j.priority DESC, j.scheduled_for ASC NULLS FIRST, j.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING * INTO claimed;

  IF claimed.job_id IS NOT NULL THEN
    RETURN NEXT claimed;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.lease_due_job(text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lease_due_job(text, integer, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- RLS: match live. Public SELECT only on the listed civic tables.
-- Internal tables: RLS on, no policies (service_role only).
-- ---------------------------------------------------------------------------

ALTER TABLE public.jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurisdiction_boundaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_occupancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_retrievals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contradictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_contract_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jurisdictions_public_read ON public.jurisdictions;
CREATE POLICY jurisdictions_public_read ON public.jurisdictions
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS seats_public_read ON public.seats;
CREATE POLICY seats_public_read ON public.seats
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS persons_public_read ON public.persons;
CREATE POLICY persons_public_read ON public.persons
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS occupancies_public_read ON public.seat_occupancies;
CREATE POLICY occupancies_public_read ON public.seat_occupancies
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS elections_public_read ON public.elections;
CREATE POLICY elections_public_read ON public.elections
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS campaigns_public_read ON public.candidate_campaigns;
CREATE POLICY campaigns_public_read ON public.candidate_campaigns
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS claims_public_verified_read ON public.claims;
CREATE POLICY claims_public_verified_read ON public.claims
  FOR SELECT TO anon, authenticated
  USING (verification_state = 'verified');

DROP POLICY IF EXISTS evidence_public_verified_read ON public.evidence_objects;
CREATE POLICY evidence_public_verified_read ON public.evidence_objects
  FOR SELECT TO anon, authenticated
  USING (verification_state = 'verified');

DROP POLICY IF EXISTS research_contracts_public_read ON public.research_contracts;
CREATE POLICY research_contracts_public_read ON public.research_contracts
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS research_contract_fields_public_read ON public.research_contract_fields;
CREATE POLICY research_contract_fields_public_read ON public.research_contract_fields
  FOR SELECT TO anon, authenticated USING (true);
