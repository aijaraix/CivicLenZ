"""One bounded HERMES dispatch path, using the existing Postgres lease authority.

No owner/admin credential is accepted here. The credential must be separately
provisioned as a queue-producer credential through systemd LoadCredential.
"""
import json
import os
from pathlib import Path
import secrets
import urllib.request

from psycopg2.extras import RealDictCursor
from database_bootstrap import connect_database
from capability_router import resolve, ROUTE_VERSION
from extraction_handoff import plan_extraction, plan_validation_handoff


def settings():
    credential = Path(os.environ.get("CREDENTIALS_DIRECTORY", "/nonexistent")) / "cloudflare-queue-producer"
    return {"credential": credential,
            "ready": credential.is_file() and os.access(credential, os.R_OK)
                and bool(os.environ.get("HERMES_CF_ACCOUNT_ID"))
                and bool(os.environ.get("HERMES_CF_INGEST_QUEUE_ID")),
            "deployment": os.environ.get("HERMES_EVIDENCE_WORKER_DEPLOYMENT"),
            "enabled": os.environ.get("HERMES_CONTRACT_DISPATCH") == "true",
            "budget": min(4, max(0, int(os.environ.get("HERMES_CONTRACT_DISPATCH_BUDGET", "1"))))}


def route_pending(cursor, config):
    cursor.execute("""SELECT row_to_json(j) AS job,row_to_json(n) AS need,
        row_to_json(f) AS field FROM public.jobs j
        JOIN hermes_ops.research_needs n ON n.need_id=j.research_need_id
        JOIN public.research_contracts c ON c.research_contract_id=n.contract_id
          AND c.active AND c.version::text=n.contract_version
        JOIN public.research_contract_fields f ON f.research_contract_id=n.contract_id AND f.field_key=n.scope_key
        WHERE j.job_type='contract_scope_research' AND j.status='queued'
          AND j.payload->>'orchestration_authority'='hermes'
          AND j.payload->>'execution_class'='PRODUCTION'
          AND n.execution_class='PRODUCTION' AND n.origin='CONTRACT_GAP'
          AND n.state IN ('BLOCKED','OPEN')
          AND (j.payload->>'dispatch_blocker'='CAPABILITY_NOT_IMPLEMENTED'
            OR j.payload->'routing_decision'->>'version'=%s)
        ORDER BY n.priority,j.created_at LIMIT 50 FOR UPDATE OF j,n SKIP LOCKED""", (ROUTE_VERSION,))
    pending = cursor.fetchall()
    cursor.execute("SELECT source_id,source_key,source_url,active,authority_tier FROM public.sources WHERE active")
    sources = cursor.fetchall()
    for item in pending:
        previous = item['job']['payload'].get('routing_decision', {})
        if item['need']['state']=='BLOCKED' and item['need']['reason'] not in (
                'CAPABILITY_NOT_IMPLEMENTED: contract scope worker routing', previous.get('reason')):
            continue  # Never clear an unrelated dependency/security/operator blocker.
        decision = resolve(item['job'], item['need'], item['field'], sources,
                           config['deployment'], config['ready'])
        payload = item['job']['payload'].copy()
        payload['routing_decision'] = {**decision, 'version': ROUTE_VERSION,
            'previous_state': item['need']['basis'].get('routing_previous_state', item['need']['state']),
            'previous_reason': item['need']['basis'].get('routing_previous_reason', item['need']['reason'])}
        if decision['state'] == 'OPEN':
            payload.pop('dispatch_blocker', None)
            payload['capability_route'] = decision['route']
        else:
            payload['dispatch_blocker'] = decision['reason']
            payload.pop('capability_route', None)
        cursor.execute("UPDATE public.jobs SET payload=%s::jsonb WHERE job_id=%s",
                       (json.dumps(payload), item['job']['job_id']))
        basis = dict(item['need']['basis'])
        basis.setdefault('routing_previous_state', item['need']['state'])
        basis.setdefault('routing_previous_reason', item['need']['reason'])
        cursor.execute("""UPDATE hermes_ops.research_needs SET state=%s,reason=%s,basis=%s::jsonb,
            evaluated_at=clock_timestamp() WHERE need_id=%s""",
            (decision['state'], decision['reason'], json.dumps(basis), item['need']['need_id']))
    return len(pending)


def recover_and_collect(cursor):
    """Only this route's owned attempts; unknown and legacy jobs are untouched."""
    cursor.execute("""SELECT j.*,clock_timestamp()>=j.lease_expires_at AS expired FROM public.jobs j
        WHERE j.status='leased' AND j.payload->>'orchestration_authority'='hermes'
        AND j.payload->>'execution_class'='PRODUCTION'
        AND j.payload->'capability_route'->>'version'=%s FOR UPDATE SKIP LOCKED""", (ROUTE_VERSION,))
    for job in cursor.fetchall():
        cursor.execute("""SELECT * FROM public.worker_runs WHERE job_id=%s
            AND worker_key=%s AND metadata->>'attempt_token'=%s
            ORDER BY started_at DESC LIMIT 1""", (job['job_id'], 'hermes.cloudflare.extraction' if job['job_type']=='contract_evidence_extract' else 'hermes.cloudflare.evidence', job['leased_by']))
        run = cursor.fetchone()
        if run and run['status'] == 'succeeded' and not job['expired']:
            result = run['metadata']
            extracting = job['job_type']=='contract_evidence_extract'
            cursor.execute("""SELECT retrieval_id FROM public.raw_retrievals WHERE retrieval_id=%s
                AND job_id=%s AND content_hash=%s AND byte_length>0 AND http_status=200
                AND metadata->>'attempt_token'=%s AND metadata->>'worker_run_id'=%s""",
                (result.get('retrieval_id'), job['payload']['parent_job_id'] if extracting else job['job_id'], result.get('sha256'), result.get('retrieval_attempt_token') if extracting else job['leased_by'], result.get('retrieval_worker_run_id') if extracting else str(run['worker_run_id'])))
            if not cursor.fetchone():
                continue
            if extracting:
                cursor.execute("SELECT evidence_id FROM public.evidence_objects WHERE evidence_id=%s AND retrieval_id=%s AND content_hash=%s AND verification_state='collected_unreviewed'", (result.get('evidence_id'),result.get('retrieval_id'),result.get('sha256')))
                if not cursor.fetchone():
                    continue
            cursor.execute("""UPDATE public.jobs SET status='succeeded',completed_at=clock_timestamp(),
                checkpoint=coalesce(checkpoint,'{}'::jsonb)||%s::jsonb,
                leased_by=NULL,lease_expires_at=NULL,error_class=NULL,error_message=NULL WHERE job_id=%s
                AND leased_by=%s AND lease_expires_at>clock_timestamp() RETURNING job_id""",
                (json.dumps({'worker_run_id':str(run['worker_run_id']), **result}),job['job_id'],job['leased_by']))
            if cursor.fetchone():
                if extracting:
                    plan_validation_handoff(cursor,job,result)
                cursor.execute("""UPDATE hermes_ops.research_needs SET state='AWAITING_RESULT',
                    reason=%s,
                    evaluated_at=clock_timestamp() WHERE need_id=%s""", ('EVIDENCE_CONSTRUCTED: internal canonical validation receipt pending' if extracting else 'RAW_RETRIEVAL_STORED: extraction and canonical validation pending',job['research_need_id']))
        elif job['expired'] or (run and run['status'] == 'failed'):
            if job['expired'] and run and run['status']=='started':
                cursor.execute("""UPDATE public.worker_runs SET status='failed',completed_at=clock_timestamp(),
                    error_class='lease_expired',error_message='Canonical lease expired before durable completion'
                    WHERE worker_run_id=%s AND status='started'""", (run['worker_run_id'],))
            dead = job['attempt_count'] >= job['max_attempts'] or bool(
                run and run['status']=='failed' and not run['metadata'].get('retryable', False))
            cursor.execute("""UPDATE public.jobs SET status=%s,leased_by=NULL,lease_expires_at=NULL,
                error_class=%s,error_message='Canonical worker attempt failed or expired; inspect worker_runs',
                scheduled_for=clock_timestamp()+make_interval(secs=>%s)
                WHERE job_id=%s AND leased_by=%s""",
                ('dead_letter' if dead else 'queued', 'lease_expired' if job['expired'] else 'worker_failed',
                 min(3600,60*2**min(job['attempt_count'],6)),job['job_id'],job['leased_by']))
            cursor.execute("""UPDATE hermes_ops.research_needs SET state=%s,reason=%s,
                evaluated_at=clock_timestamp() WHERE need_id=%s""",
                ('BLOCKED' if dead else 'OPEN','TERMINAL_WORKER_FAILURE_OR_ATTEMPTS_EXHAUSTED' if dead else 'CANONICAL_RETRY_SCHEDULED',job['research_need_id']))


def tick(governor):
    config = settings()
    selected = None
    with connect_database() as connection:
        with connection, connection.cursor(cursor_factory=RealDictCursor) as cursor:
            # This serializes selection/budget decisions, not a parallel job lease.
            cursor.execute("SELECT pg_try_advisory_xact_lock(184913,3) AS acquired")
            if not cursor.fetchone()['acquired']:
                return {'state':'ANOTHER_CANONICAL_TICK_ACTIVE'}
            recover_and_collect(cursor)
            routed = route_pending(cursor,config)
            if os.environ.get('HERMES_EXTRACT_EVIDENCE')=='true':
                plan_extraction(cursor,config)
            if not config['enabled'] or not config['ready'] or not config['deployment']:
                return {'state':'DISPATCH_GATED','routing_evaluated':routed,
                        'credential_ready':config['ready'],'worker_deployment_configured':bool(config['deployment'])}
            if governor['dispatch_limit'] < 1:
                return {'state':'RESOURCE_GATED'}
            cursor.execute("""SELECT coalesce(sum(attempt_count),0) AS attempts,
                count(*) FILTER (WHERE status='leased') AS active FROM public.jobs
                WHERE payload->'capability_route'->>'version'=%s
                AND payload->>'orchestration_authority'='hermes'
                AND payload->>'execution_class'='PRODUCTION'""", (ROUTE_VERSION,))
            budget = cursor.fetchone()
            if budget['active'] or budget['attempts'] >= config['budget']:
                return {'state':'BOUNDED_CANARY_BUDGET','attempts':int(budget['attempts'])}
            cursor.execute("""SELECT j.job_id FROM public.jobs j
                JOIN hermes_ops.research_needs n ON n.need_id=j.research_need_id
                WHERE j.job_type IN ('contract_scope_research','contract_evidence_extract') AND j.status='queued'
                AND j.payload->>'orchestration_authority'='hermes'
                AND j.payload->>'execution_class'='PRODUCTION' AND n.execution_class='PRODUCTION'
                AND n.origin='CONTRACT_GAP' AND (n.state='OPEN' OR (j.job_type='contract_evidence_extract' AND n.state='AWAITING_RESULT'))
                AND (j.job_type<>'contract_evidence_extract' OR %s)
                AND j.payload->>'research_work_identity'=j.dedupe_key
                AND j.payload->'capability_route'->>'version'=%s
                AND NOT (j.payload ? 'dispatch_blocker') AND j.attempt_count<j.max_attempts
                AND (j.scheduled_for IS NULL OR j.scheduled_for<=clock_timestamp())
                AND NOT EXISTS (SELECT 1 FROM hermes_ops.job_dependencies d JOIN public.jobs p
                    ON p.job_id=d.prerequisite_job_id WHERE d.job_id=j.job_id AND p.status<>'succeeded')
                ORDER BY n.priority,j.created_at LIMIT 1""",(os.environ.get('HERMES_EXTRACT_EVIDENCE')=='true',ROUTE_VERSION))
            candidate=cursor.fetchone()
            if candidate:
                token=secrets.token_hex(32)
                cursor.execute("SELECT * FROM hermes_ops.lease_job(%s,%s,300)",(candidate['job_id'],token))
                selected=cursor.fetchone()
                if selected:
                    cursor.execute("""UPDATE public.jobs SET checkpoint=coalesce(checkpoint,'{}'::jsonb)||
                        jsonb_build_object('dispatch_attempts',coalesce(checkpoint->'dispatch_attempts','[]'::jsonb)||
                        jsonb_build_array(jsonb_build_object('attempt_token',%s::text,'attempt_count',attempt_count,
                        'leased_at',clock_timestamp(),'lease_expires_at',lease_expires_at,
                        'scheduler_source',%s::text))) WHERE job_id=%s AND leased_by=%s""",
                        (token,str(Path(__file__).resolve()),selected['job_id'],token))
                    cursor.execute("UPDATE hermes_ops.research_needs SET state='AWAITING_RESULT',reason='CANONICAL_LEASE_ACQUIRED' WHERE need_id=%s",(selected['research_need_id'],))
    if not selected:
        return {'state':'NO_ELIGIBLE_JOB'}
    # Commit the lease before delivery; failure or uncertain delivery expires under
    # the same canonical policy. Never reacquire via the legacy worker RPC.
    try:
        token=config['credential'].read_text().strip()
        account=os.environ['HERMES_CF_ACCOUNT_ID']; queue=os.environ['HERMES_CF_INGEST_QUEUE_ID']
        message={'schemaVersion':'hermes.extraction.v1' if selected['job_type']=='contract_evidence_extract' else 'hermes.contract.v1','job_id':str(selected['job_id']),
                 'attempt_token':selected['leased_by'],'research_work_identity':selected['dedupe_key']}
        body=json.dumps({'body':message,'content_type':'json'}).encode()
        request=urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{account}/queues/{queue}/messages',
            data=body,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
        with urllib.request.urlopen(request,timeout=10) as response:
            if not json.load(response).get('success'):
                raise RuntimeError('queue delivery rejected')
        return {'state':'DELIVERED_AWAITING_WORKER','job_id':str(selected['job_id'])}
    except Exception:
        # Do not release an uncertain delivery early: the worker may have received it.
        with connect_database() as connection:
            with connection, connection.cursor() as cursor:
                cursor.execute("""UPDATE public.jobs SET error_class='QUEUE_DELIVERY_UNCONFIRMED',
                    error_message='Inspect canonical attempt after lease expiry' WHERE job_id=%s AND leased_by=%s""",
                    (selected['job_id'],selected['leased_by']))
        return {'state':'QUEUE_DELIVERY_UNCONFIRMED','job_id':str(selected['job_id'])}
