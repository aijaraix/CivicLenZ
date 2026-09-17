-- Durable operational learning/currentness state. These tables never store or
-- promote civic claims. Rollback is fail-closed: revoke runtime writes and keep
-- rows as audit history.
CREATE TABLE hermes_ops.academy_observations (
 observation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 observation_key text NOT NULL UNIQUE,
 environment text NOT NULL CHECK (environment IN ('PRODUCTION','TEST','FIXTURE')),
 observed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 last_observed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 occurrence_count integer NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
 event_class text NOT NULL,
 affected_component text NOT NULL,
 telemetry_lineage jsonb NOT NULL,
 measurement jsonb NOT NULL DEFAULT '{}'::jsonb,
 civic_truth_mutation_allowed boolean NOT NULL DEFAULT false CHECK (NOT civic_truth_mutation_allowed),
 publication_allowed boolean NOT NULL DEFAULT false CHECK (NOT publication_allowed)
);

CREATE TABLE hermes_ops.academy_cases (
 academy_case_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 case_key text NOT NULL UNIQUE,
 observation_id uuid NOT NULL REFERENCES hermes_ops.academy_observations(observation_id),
 failure_class text NOT NULL,
 affected_component text NOT NULL,
 first_incorrect_transition text NOT NULL,
 blast_radius text NOT NULL,
 hypothesis text NOT NULL,
 proposed_change text NOT NULL,
 expected_benefit text NOT NULL,
 risk_level text NOT NULL CHECK (risk_level IN ('LOW','MEDIUM','HIGH')),
 regression_requirements jsonb NOT NULL,
 rollback_plan text NOT NULL,
 state text NOT NULL CHECK (state IN (
   'OBSERVED','MEASURED','HYPOTHESIS_FORMED','PROPOSED','TEST_BUILT',
   'REGRESSION_PASSED','EVALUATED','PROMOTED','REJECTED','MONITORING','ROLLED_BACK'
 )),
 promotion_requires_review boolean NOT NULL DEFAULT true,
 canonical_truth_authority boolean NOT NULL DEFAULT false CHECK (NOT canonical_truth_authority),
 verification_authority boolean NOT NULL DEFAULT false CHECK (NOT verification_authority),
 publication_authority boolean NOT NULL DEFAULT false CHECK (NOT publication_authority),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE hermes_ops.academy_evaluations (
 evaluation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 academy_case_id uuid NOT NULL REFERENCES hermes_ops.academy_cases(academy_case_id),
 evaluation_key text NOT NULL UNIQUE,
 test_references jsonb NOT NULL,
 measured_result jsonb NOT NULL,
 regression_state text NOT NULL CHECK (regression_state IN ('NOT_RUN','PASSED','FAILED','BLOCKED')),
 promotion_state text NOT NULL CHECK (promotion_state IN ('PENDING_REVIEW','PROMOTED','REJECTED','ROLLED_BACK')),
 evaluated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 post_promotion_monitoring jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE hermes_ops.academy_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hermes_ops.academy_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE hermes_ops.academy_evaluations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hermes_ops.academy_observations, hermes_ops.academy_cases,
 hermes_ops.academy_evaluations FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT ON hermes_ops.academy_observations, hermes_ops.academy_cases,
 hermes_ops.academy_evaluations TO hermes_runtime;
GRANT UPDATE(last_observed_at,occurrence_count,measurement) ON hermes_ops.academy_observations TO hermes_runtime;
GRANT UPDATE(state,updated_at) ON hermes_ops.academy_cases TO hermes_runtime;
GRANT UPDATE(measured_result,regression_state,post_promotion_monitoring)
 ON hermes_ops.academy_evaluations TO hermes_runtime;
CREATE POLICY hermes_academy_observation_read ON hermes_ops.academy_observations
 FOR SELECT TO hermes_runtime USING (true);
CREATE POLICY hermes_academy_observation_insert ON hermes_ops.academy_observations
 FOR INSERT TO hermes_runtime WITH CHECK (
   environment='PRODUCTION' AND NOT civic_truth_mutation_allowed AND NOT publication_allowed
 );
CREATE POLICY hermes_academy_observation_update ON hermes_ops.academy_observations
 FOR UPDATE TO hermes_runtime USING (true) WITH CHECK (
   environment='PRODUCTION' AND NOT civic_truth_mutation_allowed AND NOT publication_allowed
 );
CREATE POLICY hermes_academy_case_read ON hermes_ops.academy_cases
 FOR SELECT TO hermes_runtime USING (true);
CREATE POLICY hermes_academy_case_insert ON hermes_ops.academy_cases
 FOR INSERT TO hermes_runtime WITH CHECK (
   NOT canonical_truth_authority AND NOT verification_authority AND NOT publication_authority
 );
CREATE POLICY hermes_academy_case_update ON hermes_ops.academy_cases
 FOR UPDATE TO hermes_runtime USING (true) WITH CHECK (
   NOT canonical_truth_authority AND NOT verification_authority AND NOT publication_authority
 );
CREATE POLICY hermes_academy_evaluation_read ON hermes_ops.academy_evaluations
 FOR SELECT TO hermes_runtime USING (true);
CREATE POLICY hermes_academy_evaluation_insert ON hermes_ops.academy_evaluations
 FOR INSERT TO hermes_runtime WITH CHECK (promotion_state='PENDING_REVIEW');
CREATE POLICY hermes_academy_evaluation_update ON hermes_ops.academy_evaluations
 FOR UPDATE TO hermes_runtime USING (promotion_state='PENDING_REVIEW')
 WITH CHECK (promotion_state='PENDING_REVIEW');

ALTER TABLE public.monitoring_state
 ADD COLUMN IF NOT EXISTS source_id uuid REFERENCES public.sources(source_id),
 ADD COLUMN IF NOT EXISTS monitoring_status text NOT NULL DEFAULT 'NOT_CONFIGURED',
 ADD COLUMN IF NOT EXISTS current_as_of timestamptz,
 ADD COLUMN IF NOT EXISTS stale_after timestamptz,
 ADD COLUMN IF NOT EXISTS previous_fingerprint text,
 ADD COLUMN IF NOT EXISTS current_fingerprint text,
 ADD COLUMN IF NOT EXISTS source_state text NOT NULL DEFAULT 'UNKNOWN',
 ADD COLUMN IF NOT EXISTS next_action text;
ALTER TABLE public.monitoring_state ADD CONSTRAINT monitoring_status_allowed CHECK (
 monitoring_status IN ('NOT_CONFIGURED','CONFIGURED','DUE','RUNNING','CURRENT','CHANGE_DETECTED',
 'STALE','DEGRADED','RETRYING','FAILED','BLOCKED_BY_DEPENDENCY','SOURCE_UNAVAILABLE','DISABLED_BY_POLICY'));
ALTER TABLE public.monitoring_state ADD CONSTRAINT monitoring_source_state_allowed CHECK (
 source_state IN ('HEALTHY','DEGRADED','RATE_LIMITED','SCHEMA_DRIFT','UNAVAILABLE','AUTH_FAILURE','UNKNOWN','DISABLED'));
GRANT UPDATE(last_checked_at,last_changed_at,next_check_at,consecutive_failures,last_result,
 monitoring_status,current_as_of,stale_after,previous_fingerprint,current_fingerprint,source_state,next_action)
 ON public.monitoring_state TO hermes_runtime;
CREATE INDEX academy_observations_recent ON hermes_ops.academy_observations(last_observed_at DESC);
CREATE INDEX academy_cases_state ON hermes_ops.academy_cases(state,updated_at DESC);
CREATE INDEX monitoring_due_supported ON public.monitoring_state(next_check_at)
 WHERE active AND monitoring_status IN ('CONFIGURED','DUE','CURRENT','STALE','DEGRADED','RETRYING');
