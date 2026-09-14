"""Validation receipt route and independent acknowledgement in the existing HERMES tick."""
import json
import os
VERSION='hermes-validation-receipt-v1'


def enabled():
    return os.environ.get('HERMES_VALIDATION_RECEIPT')=='true'


def snapshot(cursor, seat):
    cursor.execute("SELECT md5(coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.occupancy_id)::text,'[]')) AS digest FROM public.seat_occupancies o WHERE seat_id=%s",(seat,))
    occupancy=cursor.fetchone()['digest']
    cursor.execute("SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.claim_id)::text,'[]')) AS digest FROM public.claims c WHERE seat_id=%s AND verification_state='verified'",(seat,))
    return {'occupancy_digest':occupancy,'verified_claims_digest':cursor.fetchone()['digest']}


def candidate(cursor, config):
    if not enabled() or not config['ready'] or not os.environ.get('HERMES_CF_VALIDATE_QUEUE_ID') or not os.environ.get('HERMES_VALIDATOR_DEPLOYMENT'):
        return None
    deployment=os.environ['HERMES_VALIDATOR_DEPLOYMENT']
    cursor.execute("""SELECT j.*,n.state AS need_state FROM public.jobs j
      JOIN hermes_ops.research_needs n ON n.need_id=j.research_need_id
      JOIN public.jobs p ON p.job_id=(j.payload->>'parent_job_id')::uuid
      WHERE j.job_type='contract_evidence_validate' AND j.status='queued'
      AND j.payload->>'orchestration_authority'='hermes' AND j.payload->>'execution_class'='PRODUCTION'
      AND j.dedupe_key=j.payload->>'research_work_identity' AND n.execution_class='PRODUCTION'
      AND n.state='AWAITING_RESULT' AND n.origin='CONTRACT_GAP' AND n.scope_key='evidence'
      AND n.target_id=j.target_id AND n.contract_id::text=j.payload->>'contract_id'
      AND n.contract_version=j.payload->>'contract_version'
      AND p.status='succeeded' AND p.job_type='contract_evidence_extract' AND p.research_need_id=n.need_id
      AND p.dedupe_key=j.payload->>'parent_research_work_identity'
      AND p.checkpoint->>'extraction_run_id'=j.payload->>'extraction_run_id'
      AND p.checkpoint->>'evidence_id'=j.payload->>'evidence_id'
      AND p.checkpoint->>'retrieval_id'=j.payload->>'retrieval_id'
      AND (j.payload->>'dispatch_blocker'='CAPABILITY_NOT_IMPLEMENTED: internal canonical validation receipt'
        OR j.payload->'capability_route'->>'version'=%s)
      ORDER BY j.created_at LIMIT 1 FOR UPDATE OF j SKIP LOCKED""",(VERSION,))
    job=cursor.fetchone()
    if not job:return None
    payload=dict(job['payload'])
    if payload.get('dispatch_blocker') not in (None,'CAPABILITY_NOT_IMPLEMENTED: internal canonical validation receipt'):
        return None
    route={'version':VERSION,'capability':'internal_canonical_validation_receipt','pool':'cloudflare-validation',
           'worker':'civiclenz-validator','module':'workers/cloudflare/shared/src/contract-validation.ts',
           'deployment_id':deployment,'research_need_id':str(job['research_need_id']),'max_concurrency':1}
    payload['capability_route']=route
    payload['routing_decision']={'state':'OPEN','reason':'ROUTE_RESOLVED: internal canonical validation receipt',
        'previous_blocker':payload.get('dispatch_blocker'),'route':route}
    payload.pop('dispatch_blocker',None)
    cursor.execute('UPDATE public.jobs SET payload=%s::jsonb WHERE job_id=%s',(json.dumps(payload),job['job_id']))
    budget=min(1,max(0,int(os.environ.get('HERMES_VALIDATION_RECEIPT_BUDGET','0'))))
    cursor.execute("""SELECT coalesce(sum(attempt_count),0) AS attempts FROM public.jobs WHERE job_type='contract_evidence_validate'
      AND payload->>'orchestration_authority'='hermes' AND payload->>'execution_class'='PRODUCTION'
      AND payload->'capability_route'->>'version'=%s""",(VERSION,))
    if cursor.fetchone()['attempts']>=budget:return None
    cursor.execute("""SELECT job_id FROM public.jobs j WHERE job_id=%s AND attempt_count<max_attempts
      AND (scheduled_for IS NULL OR scheduled_for<=clock_timestamp())
      AND NOT EXISTS(SELECT 1 FROM public.jobs a WHERE a.status='leased' AND a.lease_expires_at>clock_timestamp()
        AND a.payload->>'orchestration_authority'='hermes' AND a.payload->>'execution_class'='PRODUCTION')
      AND NOT EXISTS(SELECT 1 FROM hermes_ops.job_dependencies d JOIN public.jobs p ON p.job_id=d.prerequisite_job_id
        WHERE d.job_id=j.job_id AND p.status<>'succeeded')""",(job['job_id'],))
    return cursor.fetchone()


def collect(cursor):
    cursor.execute("""SELECT *,lease_expires_at<=clock_timestamp() AS expired FROM public.jobs WHERE status='leased'
      AND job_type='contract_evidence_validate' AND payload->>'orchestration_authority'='hermes'
      AND payload->>'execution_class'='PRODUCTION' AND payload->'capability_route'->>'version'=%s FOR UPDATE SKIP LOCKED""",(VERSION,))
    for job in cursor.fetchall():
        cursor.execute("""SELECT * FROM public.worker_runs WHERE job_id=%s AND worker_key='hermes.cloudflare.validation'
          AND metadata->>'attempt_token'=%s AND deployment_id=%s ORDER BY started_at DESC LIMIT 1""",
          (job['job_id'],job['leased_by'],job['payload']['capability_route']['deployment_id']))
        run=cursor.fetchone()
        if run and run['status']=='succeeded' and not job['expired']:
            m=run['metadata'];p=job['payload']
            cursor.execute("""SELECT v.validation_run_id FROM public.validation_runs v
              JOIN public.claims c ON c.claim_id=(v.result_summary->>'claim_id')::uuid
              JOIN public.claim_evidence l ON l.claim_id=c.claim_id AND l.role='supports'
              JOIN public.evidence_objects e ON e.evidence_id=l.evidence_id
              JOIN public.raw_retrievals r ON r.retrieval_id=e.retrieval_id
              WHERE v.validation_run_id=%s AND v.status='ACCEPTED_FOR_VALIDATION'
              AND v.validator_key='hermes.internal.receipt.v1' AND v.subject_id=%s
              AND v.input_summary->>'job_id'=%s AND v.input_summary->>'research_need_id'=%s
              AND v.input_summary->>'research_work_identity'=%s AND v.input_summary->>'attempt_token'=%s
              AND v.input_summary->>'validator_deployment_id'=%s
              AND v.input_summary->>'parent_extraction_job_id'=%s AND v.input_summary->>'extraction_run_id'=%s
              AND c.claim_id=%s AND c.verification_state='collected_unreviewed' AND c.last_verified_at IS NULL
              AND c.display_value=(SELECT metadata->'candidate'->>'display_value' FROM public.worker_runs WHERE worker_run_id=%s)
              AND c.subject_type='seat' AND c.subject_id=%s AND c.seat_id=%s AND c.field_key='current_occupant'
              AND e.evidence_id=%s AND e.verification_state='pending' AND r.retrieval_id=%s
              AND e.content_hash=r.content_hash AND r.content_hash=%s
              AND v.result_summary->>'decision'='ACCEPTED_FOR_VALIDATION'
              AND v.result_summary->>'schema_certified'='false'""",
              (m.get('validation_run_id'),job['target_id'],str(job['job_id']),str(job['research_need_id']),job['dedupe_key'],job['leased_by'],run['deployment_id'],p['parent_job_id'],p['extraction_run_id'],m.get('claim_id'),p['extraction_run_id'],job['target_id'],job['target_id'],p['evidence_id'],p['retrieval_id'],m.get('content_hash')))
            receipt=cursor.fetchone()
            if not receipt:continue
            if snapshot(cursor,job['target_id'])!=job['checkpoint'].get('validation_safety_before'):continue
            cursor.execute("""UPDATE public.jobs SET status='succeeded',completed_at=clock_timestamp(),leased_by=NULL,lease_expires_at=NULL,
              error_class=NULL,error_message=NULL,checkpoint=checkpoint||%s::jsonb
              WHERE job_id=%s AND leased_by=%s AND lease_expires_at>clock_timestamp() RETURNING job_id""",
              (json.dumps({'worker_run_id':str(run['worker_run_id']),**m,'independent_safety_check':'UNCHANGED_OCCUPANCY_AND_VERIFIED_CLAIMS'}),job['job_id'],job['leased_by']))
            if cursor.fetchone():
                cursor.execute("UPDATE hermes_ops.research_needs SET state='AWAITING_RESULT',reason='VALIDATION_RECEIPT_ACCEPTED: identity/currentness/contradiction validation pending',evaluated_at=clock_timestamp() WHERE need_id=%s",(job['research_need_id'],))
        elif job['expired'] or (run and run['status']=='failed'):
            if run and run['status']=='started':
                cursor.execute("UPDATE public.worker_runs SET status='failed',completed_at=clock_timestamp(),error_class='lease_expired',error_message='Canonical receipt lease expired' WHERE worker_run_id=%s AND status='started'",(run['worker_run_id'],))
            cursor.execute("UPDATE public.jobs SET status='dead_letter',leased_by=NULL,lease_expires_at=NULL,error_class='VALIDATION_RECEIPT_FAILED_BUDGET_EXHAUSTED',error_message='Preserved receipt attempt failed or expired; one-attempt budget exhausted' WHERE job_id=%s AND leased_by=%s",(job['job_id'],job['leased_by']))
            cursor.execute("UPDATE hermes_ops.research_needs SET state='AWAITING_RESULT',reason='VALIDATION_RECEIPT_BLOCKED: failed attempt; receipt budget exhausted' WHERE need_id=%s",(job['research_need_id'],))
