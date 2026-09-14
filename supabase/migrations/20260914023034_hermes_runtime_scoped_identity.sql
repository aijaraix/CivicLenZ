CREATE ROLE hermes_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 4;
GRANT CONNECT ON DATABASE postgres TO hermes_runtime;
GRANT USAGE ON SCHEMA public TO hermes_runtime;
ALTER ROLE hermes_runtime SET search_path = pg_catalog, public;
ALTER ROLE hermes_runtime SET statement_timeout = '15s';
ALTER ROLE hermes_runtime SET lock_timeout = '3s';
ALTER ROLE hermes_runtime SET idle_in_transaction_session_timeout = '30s';

CREATE SCHEMA hermes_ops;
REVOKE ALL ON SCHEMA hermes_ops FROM PUBLIC;
GRANT USAGE ON SCHEMA hermes_ops TO hermes_runtime;

GRANT SELECT ON public.jobs, public.worker_runs, public.monitoring_state,
 public.research_contracts, public.research_contract_fields, public.sources,
 public.seats, public.persons, public.seat_occupancies, public.elections,
 public.candidate_campaigns, public.jurisdictions, public.claims,
 public.claim_evidence, public.evidence_objects, public.raw_retrievals,
 public.contradictions, public.validation_runs TO hermes_runtime;

DO $block$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['jobs','worker_runs','monitoring_state','research_contracts',
 'research_contract_fields','sources','seats','persons','seat_occupancies','elections',
 'candidate_campaigns','jurisdictions','claims','claim_evidence','evidence_objects',
 'raw_retrievals','contradictions','validation_runs'] LOOP
 EXECUTE format('CREATE POLICY hermes_context_read ON public.%I FOR SELECT TO hermes_runtime USING (true)', t);
 END LOOP;
END $block$;

GRANT INSERT, UPDATE ON public.jobs TO hermes_runtime;
CREATE POLICY hermes_job_insert ON public.jobs FOR INSERT TO hermes_runtime
 WITH CHECK (payload->>'orchestration_authority' = 'hermes');
CREATE POLICY hermes_job_update ON public.jobs FOR UPDATE TO hermes_runtime
 USING (payload->>'orchestration_authority' = 'hermes')
 WITH CHECK (payload->>'orchestration_authority' = 'hermes');

GRANT INSERT ON public.worker_runs TO hermes_runtime;
GRANT UPDATE (status, completed_at, records_read, records_written, error_class, error_message, metadata)
 ON public.worker_runs TO hermes_runtime;
CREATE POLICY hermes_run_insert ON public.worker_runs FOR INSERT TO hermes_runtime
 WITH CHECK (worker_key LIKE 'hermes.%' AND coalesce(claims_verified,0)=0
 AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.job_id=worker_runs.job_id
 AND j.payload->>'orchestration_authority'='hermes'));
CREATE POLICY hermes_run_update ON public.worker_runs FOR UPDATE TO hermes_runtime
 USING (worker_key LIKE 'hermes.%') WITH CHECK (worker_key LIKE 'hermes.%' AND coalesce(claims_verified,0)=0);

GRANT INSERT ON public.monitoring_state TO hermes_runtime;
GRANT UPDATE (active, monitoring_class, next_check_at, configuration) ON public.monitoring_state TO hermes_runtime;
CREATE POLICY hermes_monitor_insert ON public.monitoring_state FOR INSERT TO hermes_runtime
 WITH CHECK (configuration->>'orchestration_authority'='hermes'
 AND last_checked_at IS NULL AND last_changed_at IS NULL AND last_result IS NULL);
CREATE POLICY hermes_monitor_update ON public.monitoring_state FOR UPDATE TO hermes_runtime
 USING (configuration->>'orchestration_authority'='hermes')
 WITH CHECK (configuration->>'orchestration_authority'='hermes');

CREATE FUNCTION hermes_ops.lease_job(p_job_id uuid, p_attempt_token text, p_seconds integer DEFAULT 60)
RETURNS SETOF public.jobs LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
BEGIN
 IF p_attempt_token IS NULL OR length(p_attempt_token)<32 OR p_seconds<1 OR p_seconds>300 THEN
  RAISE EXCEPTION 'Invalid bounded lease request';
 END IF;
 RETURN QUERY UPDATE public.jobs j SET status='leased', leased_by=p_attempt_token,
 lease_expires_at=clock_timestamp()+make_interval(secs=>p_seconds),
 attempt_count=j.attempt_count+1, started_at=coalesce(j.started_at,clock_timestamp())
 WHERE j.job_id=(SELECT q.job_id FROM public.jobs q WHERE q.job_id=p_job_id
  AND q.payload->>'orchestration_authority'='hermes'
  AND q.attempt_count<q.max_attempts
  AND (q.status='queued' OR (q.status='leased' AND q.lease_expires_at<clock_timestamp()))
  AND (q.scheduled_for IS NULL OR q.scheduled_for<=clock_timestamp())
  ORDER BY q.job_id FOR UPDATE SKIP LOCKED LIMIT 1)
 RETURNING j.*;
END $fn$;

CREATE FUNCTION hermes_ops.release_job(p_job_id uuid,p_attempt_token text)
RETURNS SETOF public.jobs LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS $fn$
 UPDATE public.jobs j SET status='queued', leased_by=NULL, lease_expires_at=NULL
 WHERE j.job_id=p_job_id AND j.payload->>'orchestration_authority'='hermes'
 AND j.status='leased' AND j.leased_by=p_attempt_token AND j.lease_expires_at>clock_timestamp()
 RETURNING j.*;
$fn$;
REVOKE ALL ON FUNCTION hermes_ops.lease_job(uuid,text,integer), hermes_ops.release_job(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hermes_ops.lease_job(uuid,text,integer), hermes_ops.release_job(uuid,text) TO hermes_runtime;
