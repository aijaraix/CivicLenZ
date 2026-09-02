-- Additive completeness snapshot table. Do NOT apply to production from this PR.
-- Queryability is implemented in application code against existing claims/seats/jobs.
-- Live research_contracts / research_contract_fields remain the persistence path for contracts.

CREATE TABLE IF NOT EXISTS public.completeness_snapshots (
  completeness_snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,
  subject_id uuid,
  seat_id uuid,
  person_id uuid,
  jurisdiction_id uuid,
  research_contract_id uuid,
  office_class text,
  cohort_key text,
  category text,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  field_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  baseline_complete boolean NOT NULL DEFAULT false,
  monitoring_eligible boolean NOT NULL DEFAULT false,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS completeness_snapshots_person_idx
  ON public.completeness_snapshots (person_id);
CREATE INDEX IF NOT EXISTS completeness_snapshots_seat_idx
  ON public.completeness_snapshots (seat_id);
CREATE INDEX IF NOT EXISTS completeness_snapshots_category_idx
  ON public.completeness_snapshots (category);
CREATE INDEX IF NOT EXISTS completeness_snapshots_contract_idx
  ON public.completeness_snapshots (research_contract_id);
CREATE INDEX IF NOT EXISTS completeness_snapshots_jurisdiction_idx
  ON public.completeness_snapshots (jurisdiction_id);
CREATE INDEX IF NOT EXISTS completeness_snapshots_cohort_idx
  ON public.completeness_snapshots (cohort_key);

ALTER TABLE public.completeness_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS completeness_snapshots_public_read ON public.completeness_snapshots;
CREATE POLICY completeness_snapshots_public_read ON public.completeness_snapshots
  FOR SELECT USING (true);

COMMENT ON TABLE public.completeness_snapshots IS
  'Additive snapshot store for 9-dimension completeness audits. Unapplied in this PR. Do not invent a claims unique constraint here.';
