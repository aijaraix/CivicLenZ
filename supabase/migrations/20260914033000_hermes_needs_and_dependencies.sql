-- Add only missing operational entities. Jobs, runs, leases, monitoring,
-- retry/dead-letter state and incident history retain their existing stores.
-- Rollback: stop dispatch, retain these tables for audit, restore prior lease RPC.
-- No civic truth, evidence or publication permissions are added.
CREATE TABLE hermes_ops.research_needs (
 need_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 need_key text NOT NULL UNIQUE CHECK (length(need_key) BETWEEN 1 AND 512),
 contract_id uuid REFERENCES public.research_contracts(research_contract_id),
 contract_version text,
 target_type text NOT NULL,
 target_id uuid NOT NULL,
 scope_key text NOT NULL,
 origin text NOT NULL CHECK (origin IN ('CONTRACT_GAP','MONITORING','INCIDENT','PRODUCER','OPERATOR','TEST')),
 execution_class text NOT NULL CHECK (execution_class IN ('PRODUCTION','TEST')),
 state text NOT NULL DEFAULT 'OPEN' CHECK (state IN ('OPEN','BLOCKED','AWAITING_RESULT','RECONCILED_AS_OF','CANCELLED')),
 reason text NOT NULL,
 basis jsonb NOT NULL CHECK (jsonb_typeof(basis)='object'),
 priority integer NOT NULL DEFAULT 100,
 created_at timestamptz NOT NULL DEFAULT now(),
 evaluated_at timestamptz NOT NULL DEFAULT now(),
 current_as_of timestamptz,
 CHECK ((origin='TEST') = (execution_class='TEST')),
 CHECK (origin<>'CONTRACT_GAP' OR (contract_id IS NOT NULL AND contract_version IS NOT NULL)),
 CHECK (state<>'RECONCILED_AS_OF' OR current_as_of IS NOT NULL)
);
ALTER TABLE hermes_ops.research_needs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hermes_ops.research_needs FROM PUBLIC;
GRANT SELECT, INSERT ON hermes_ops.research_needs TO hermes_runtime;
GRANT UPDATE (state,reason,basis,priority,evaluated_at,current_as_of) ON hermes_ops.research_needs TO hermes_runtime;
CREATE POLICY hermes_need_access ON hermes_ops.research_needs TO hermes_runtime USING (true) WITH CHECK (true);
CREATE INDEX research_needs_open_priority ON hermes_ops.research_needs (state,priority,created_at);

ALTER TABLE public.jobs ADD COLUMN research_need_id uuid REFERENCES hermes_ops.research_needs(need_id);
CREATE INDEX jobs_research_need ON public.jobs(research_need_id) WHERE research_need_id IS NOT NULL;
COMMENT ON COLUMN public.jobs.research_need_id IS 'Canonical need; legacy rows remain unassigned until relevance/lineage reconciliation. ResearchWorkIdentity uses existing unique dedupe_key and matching payload.research_work_identity.';

CREATE TABLE hermes_ops.job_dependencies (
 job_id uuid NOT NULL REFERENCES public.jobs(job_id),
 prerequisite_job_id uuid NOT NULL REFERENCES public.jobs(job_id),
 reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (job_id,prerequisite_job_id),
 CHECK (job_id<>prerequisite_job_id)
);
ALTER TABLE hermes_ops.job_dependencies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hermes_ops.job_dependencies FROM PUBLIC;
GRANT SELECT, INSERT ON hermes_ops.job_dependencies TO hermes_runtime;
CREATE POLICY hermes_dependency_read ON hermes_ops.job_dependencies FOR SELECT TO hermes_runtime USING (true);
CREATE POLICY hermes_dependency_insert ON hermes_ops.job_dependencies FOR INSERT TO hermes_runtime
 WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j WHERE j.job_id=job_dependencies.job_id AND j.payload->>'orchestration_authority'='hermes')
 AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.job_id=job_dependencies.prerequisite_job_id AND j.payload->>'orchestration_authority'='hermes'));

-- Serialize graph edits so two transactions cannot introduce a cycle together.
CREATE FUNCTION hermes_ops.reject_dependency_cycle() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'Dependency changes require read committed isolation' USING ERRCODE='25000';
 END IF;
 PERFORM pg_advisory_xact_lock(184913,1);
 PERFORM 1 FROM public.jobs WHERE job_id=NEW.job_id AND status='queued' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Dependencies may only be added before dispatch' USING ERRCODE='23514'; END IF;
 IF EXISTS (
  WITH RECURSIVE ancestors(id) AS (
   SELECT NEW.prerequisite_job_id
   UNION
   SELECT d.prerequisite_job_id FROM hermes_ops.job_dependencies d JOIN ancestors a ON d.job_id=a.id
  ) SELECT 1 FROM ancestors WHERE id=NEW.job_id
 ) THEN RAISE EXCEPTION 'Dependency cycle rejected' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION hermes_ops.reject_dependency_cycle() FROM PUBLIC;
CREATE TRIGGER dependency_cycle_guard BEFORE INSERT ON hermes_ops.job_dependencies
 FOR EACH ROW EXECUTE FUNCTION hermes_ops.reject_dependency_cycle();

CREATE OR REPLACE FUNCTION hermes_ops.lease_job(p_job_id uuid,p_attempt_token text,p_seconds integer DEFAULT 60)
RETURNS SETOF public.jobs LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
BEGIN
 IF p_job_id IS NULL OR p_attempt_token IS NULL OR length(p_attempt_token)<32
 OR p_seconds IS NULL OR p_seconds<1 OR p_seconds>300 THEN
  RAISE EXCEPTION 'Invalid bounded lease request' USING ERRCODE='22023';
 END IF;
 RETURN QUERY UPDATE public.jobs j SET status='leased',leased_by=p_attempt_token,
  lease_expires_at=clock_timestamp()+make_interval(secs=>p_seconds),
  attempt_count=j.attempt_count+1,started_at=coalesce(j.started_at,clock_timestamp())
 WHERE j.job_id=(SELECT q.job_id FROM public.jobs q WHERE q.job_id=p_job_id
  AND q.payload->>'orchestration_authority'='hermes'
  AND q.attempt_count<q.max_attempts
  AND (q.status='queued' OR (q.status='leased' AND q.lease_expires_at<clock_timestamp()))
  AND (q.scheduled_for IS NULL OR q.scheduled_for<=clock_timestamp())
  AND (q.payload->>'execution_class'='TEST' OR (
   q.payload->>'research_work_identity'=q.dedupe_key
   AND EXISTS (SELECT 1 FROM hermes_ops.research_needs n WHERE n.need_id=q.research_need_id
    AND n.execution_class='PRODUCTION' AND n.state IN ('OPEN','AWAITING_RESULT'))))
  AND NOT EXISTS (SELECT 1 FROM hermes_ops.job_dependencies d JOIN public.jobs p ON p.job_id=d.prerequisite_job_id
   WHERE d.job_id=q.job_id AND p.status<>'succeeded')
  ORDER BY q.job_id FOR UPDATE SKIP LOCKED LIMIT 1)
 RETURNING j.*;
END;
$$;
