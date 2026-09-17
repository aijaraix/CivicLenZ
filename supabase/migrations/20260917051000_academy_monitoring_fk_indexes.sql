-- Cover new operational foreign keys used by Academy/currentness reconciliation.
CREATE INDEX academy_cases_observation_id_idx
 ON hermes_ops.academy_cases(observation_id);
CREATE INDEX academy_evaluations_case_id_idx
 ON hermes_ops.academy_evaluations(academy_case_id);
CREATE INDEX monitoring_state_source_id_idx
 ON public.monitoring_state(source_id);
