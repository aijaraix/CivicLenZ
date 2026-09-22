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
from extraction_handoff import plan_extraction, plan_exhausted_extraction_recovery, plan_validation_handoff
import validation_receipt
import validation_followup
import governor_context
import producer_receipt_validation
import producer_outbound
import authoritative_roster_discovery

# A canary budget belongs to the newly introduced quarantine route, not to
# every historical route that happened to share the generic router version.
# In particular, exhausted evidence-route history must never consume the
# allowance for a new, independently bounded quarantine deployment.
QUARANTINE_CAPABILITY = 'evidence_quarantine_source_discovery'


def settings():
    credential = Path(os.environ.get("CREDENTIALS_DIRECTORY", "/nonexistent")) / "cloudflare-queue-producer"
    mode = os.environ.get("HERMES_CONTRACT_DISPATCH_MODE", "canary")
    # An unrecognized value is deliberately fail-closed: bounded canary only.
    mode = mode if mode in ("canary", "continuous") else "canary"
    return {"credential": credential,
            "ready": credential.is_file() and os.access(credential, os.R_OK)
                and bool(os.environ.get("HERMES_CF_ACCOUNT_ID"))
                and bool(os.environ.get("HERMES_CF_INGEST_QUEUE_ID")),
            "deployment": os.environ.get("HERMES_EVIDENCE_WORKER_DEPLOYMENT"),
            "enabled": os.environ.get("HERMES_CONTRACT_DISPATCH") == "true",
            "mode": mode,
            "budget": min(5, max(0, int(os.environ.get("HERMES_CONTRACT_DISPATCH_BUDGET", "1")))),
            "concurrency": min(5, max(1, int(os.environ.get("HERMES_CONTRACT_DISPATCH_CONCURRENCY", "1"))))}


def route_pending(cursor, config):
    deep_dossier_execution = os.environ.get("HERMES_DEEP_DOSSIER_EXECUTION") == "true"
    cursor.execute("""SELECT row_to_json(j) AS job,row_to_json(n) AS need,
        row_to_json(f) AS field FROM public.jobs j
        JOIN hermes_ops.research_needs n ON n.need_id=j.research_need_id
        JOIN public.research_contracts c ON c.research_contract_id=n.contract_id
          AND c.active AND c.version::text=n.contract_version
        JOIN public.research_contract_fields f ON f.research_contract_id=n.contract_id AND f.field_key=n.scope_key
        WHERE j.job_type='contract_scope_research' AND j.status='queued'
          AND NOT (j.payload ? 'validation_followup')
          AND j.payload->>'orchestration_authority'='hermes'
          AND j.payload->>'execution_class'='PRODUCTION'
          AND n.execution_class='PRODUCTION' AND n.origin IN ('CONTRACT_GAP','MONITORING','DISCOVERY')
          AND n.state IN ('BLOCKED','OPEN')
          AND (j.payload->>'dispatch_blocker'='CAPABILITY_NOT_IMPLEMENTED'
            OR j.payload->'routing_decision'->>'version'=%s)
          AND (NOT (j.payload ? 'deep_dossier_graph_version') OR %s)
        ORDER BY n.priority,j.created_at LIMIT 50 FOR UPDATE OF j,n SKIP LOCKED""", (ROUTE_VERSION, deep_dossier_execution))
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
        if run and run['status'] == 'succeeded':
            result = run['metadata']
            extracting = job['job_type']=='contract_evidence_extract'
            # A quarantine run may safely reference a prior immutable raw
            # retrieval from the same source/hash after the worker has read it
            # back and rehashed it.  Do not require that shared artifact to
            # have this later scope's job/run identifiers.  Extraction keeps
            # its stricter parent-attempt lineage requirements.
            reused_raw = bool(result.get('raw_retrieval_reused')) and not extracting
            if reused_raw:
                cursor.execute("""SELECT retrieval_id FROM public.raw_retrievals WHERE retrieval_id=%s
                    AND content_hash=%s AND byte_length>0 AND http_status=200
                    AND retrieval_status='stored' AND source_id=%s""",
                    (result.get('retrieval_id'), result.get('sha256'),
                     job['payload']['capability_route'].get('source_id')))
            else:
                cursor.execute("""SELECT retrieval_id FROM public.raw_retrievals WHERE retrieval_id=%s
                    AND job_id=%s AND content_hash=%s AND byte_length>0 AND http_status=200
                    AND metadata->>'attempt_token'=%s AND metadata->>'worker_run_id'=%s""",
                    (result.get('retrieval_id'), job['payload']['parent_job_id'] if extracting else job['job_id'], result.get('sha256'), result.get('retrieval_attempt_token') if extracting else job['leased_by'], result.get('retrieval_worker_run_id') if extracting else str(run['worker_run_id'])))
            if not cursor.fetchone():
                continue
            roster_extracting = extracting and job['payload'].get('capability_route', {}).get('capability') == 'authoritative_roster_extraction'
            if extracting and not roster_extracting:
                cursor.execute("SELECT evidence_id FROM public.evidence_objects WHERE evidence_id=%s AND retrieval_id=%s AND content_hash=%s AND verification_state='pending'", (result.get('evidence_id'),result.get('retrieval_id'),result.get('sha256')))
                if not cursor.fetchone():
                    continue
            if roster_extracting:
                cursor.execute("""SELECT count(*) AS count FROM public.unresolved_roster_units
                    WHERE extraction_worker_run_id=%s AND retrieval_id=%s AND content_hash=%s
                      AND publication_eligible=false""",
                    (result.get('extraction_run_id'), result.get('retrieval_id'), result.get('sha256')))
                row = cursor.fetchone()
                if not row or int(row['count']) < 1:
                    continue
            cursor.execute("""UPDATE public.jobs SET status='succeeded',completed_at=clock_timestamp(),
                checkpoint=coalesce(checkpoint,'{}'::jsonb)||%s::jsonb,
                leased_by=NULL,lease_expires_at=NULL,error_class=NULL,error_message=NULL WHERE job_id=%s
                AND leased_by=%s
                AND (lease_expires_at>clock_timestamp() OR (lease_expires_at<=clock_timestamp() AND %s))
                RETURNING job_id""",
                (json.dumps({'worker_run_id':str(run['worker_run_id']), **result}),job['job_id'],job['leased_by'],job['expired']))
            if cursor.fetchone():
                if roster_extracting:
                    summary = authoritative_roster_discovery.plan_downstream(cursor, job, result)
                    cursor.execute("""UPDATE public.jobs SET checkpoint=coalesce(checkpoint,'{}'::jsonb)||%s::jsonb
                        WHERE job_id=%s""", (json.dumps({'authoritative_roster_downstream': summary}), job['job_id']))
                elif extracting:
                    plan_validation_handoff(cursor,job,result)
                cursor.execute("""UPDATE hermes_ops.research_needs SET state='AWAITING_RESULT',
                    reason=%s,
                    evaluated_at=clock_timestamp() WHERE need_id=%s""",
                    ('ROSTER_EXTRACTED_UNRESOLVED: identity research work pending' if roster_extracting
                     else 'EVIDENCE_CONSTRUCTED: internal canonical validation receipt pending' if extracting
                     else 'RAW_RETRIEVAL_STORED: extraction and canonical validation pending',job['research_need_id']))
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


def collect_late_successes(cursor):
    """Acknowledge durable roster extraction after a lease sweep.

    A successful worker_run is authoritative evidence that the worker completed
    its leased extraction. If HERMES observed the success only after the lease
    expired, the ordinary leased-job collector cannot see it anymore. This
    bounded path preserves the terminal job and attempt history while allowing
    the already-persisted unresolved roster units to enter the same canonical
    downstream planner exactly once.
    """
    cursor.execute("""SELECT j.*,w.worker_run_id,w.metadata AS worker_metadata
      FROM public.jobs j
      JOIN LATERAL (SELECT w2.worker_run_id,w2.status,w2.metadata
        FROM public.worker_runs w2
        WHERE w2.job_id=j.job_id AND w2.worker_key='hermes.cloudflare.extraction'
          AND w2.status='succeeded'
          AND w2.metadata->>'roster_units_extracted' ~ '^[1-9][0-9]*$'
          AND EXISTS (SELECT 1 FROM public.unresolved_roster_units u2
            WHERE u2.extraction_worker_run_id=w2.worker_run_id
              AND u2.retrieval_id::text=w2.metadata->>'retrieval_id'
              AND u2.content_hash=w2.metadata->>'sha256'
              AND u2.publication_eligible=false)
        ORDER BY w2.started_at DESC LIMIT 1) w ON true
      WHERE j.status='dead_letter'
        AND j.job_type='contract_evidence_extract'
        AND j.attempt_count=j.max_attempts AND j.attempt_count>0
        AND j.error_class='lease_expired'
        AND j.payload->>'orchestration_authority'='hermes'
        AND j.payload->>'execution_class'='PRODUCTION'
        AND j.payload->'capability_route'->>'version'=%s
        AND j.payload->'capability_route'->>'stage'='extraction'
        AND j.payload->'capability_route'->>'capability'='authoritative_roster_extraction'
        AND j.payload->'capability_route'->>'input_retrieval_id'=w.metadata->>'retrieval_id'
        AND j.payload->'capability_route'->>'input_sha256'=w.metadata->>'sha256'
        AND w.worker_run_id::text=w.metadata->>'extraction_run_id'
        AND w.metadata->>'roster_units_extracted' ~ '^[1-9][0-9]*$'
        AND w.metadata->>'unresolved_attribution'='true'
        AND w.metadata->>'publication_eligible'='false'
        AND NOT (coalesce(j.checkpoint,'{}'::jsonb) ? 'authoritative_roster_late_success_handoff')
      FOR UPDATE OF j SKIP LOCKED""", (ROUTE_VERSION,))
    handed_off = 0
    for item in cursor.fetchall():
        result = dict(item['worker_metadata'])
        summary = authoritative_roster_discovery.plan_downstream(cursor, item, result)
        checkpoint = {
            'authoritative_roster_late_success_handoff': {
                'worker_run_id': str(item['worker_run_id']),
                'reason': 'LEASE_EXPIRED_AFTER_DURABLE_SUCCESS',
                'planner_summary': summary,
                'attempt_count_preserved': item['attempt_count'],
                'job_state_preserved': 'dead_letter',
            }
        }
        cursor.execute("""UPDATE public.jobs SET checkpoint=coalesce(checkpoint,'{}'::jsonb)||%s::jsonb
            WHERE job_id=%s AND status='dead_letter' AND attempt_count=max_attempts""",
            (json.dumps(checkpoint), item['job_id']))
        cursor.execute("""UPDATE hermes_ops.research_needs SET state='AWAITING_RESULT',
            reason='ROSTER_EXTRACTED_UNRESOLVED: identity research work pending',
            evaluated_at=clock_timestamp() WHERE need_id=%s""", (item['research_need_id'],))
        handed_off += 1
    return handed_off


def recover_immutable_raw_conflicts(cursor, config):
    """Resume only the same failed quarantine jobs after a newer worker deploy.

    The former deployment could not reuse a raw artifact already stored for
    the same source/hash.  This preserves the failed worker run and attempt
    history, creates no work, and requires an explicit new deployment before
    returning the exact job to its ordinary canonical lease path.
    """
    if not config['deployment']:
        return 0
    cursor.execute("""SELECT j.job_id,j.research_need_id,j.attempt_count,j.payload,
          w.worker_run_id,w.deployment_id AS failed_deployment,w.error_class
        FROM public.jobs j
        JOIN LATERAL (SELECT worker_run_id,deployment_id,error_class FROM public.worker_runs
          WHERE job_id=j.job_id AND worker_key='hermes.cloudflare.evidence'
          ORDER BY started_at DESC LIMIT 1) w ON true
        WHERE j.status='dead_letter' AND j.attempt_count<j.max_attempts
          AND j.payload->>'orchestration_authority'='hermes'
          AND j.payload->>'execution_class'='PRODUCTION'
          AND j.payload->'capability_route'->>'version'=%s
          AND j.payload->'capability_route'->>'capability'=%s
          AND w.error_class='worker_store_http_409'
          AND w.deployment_id<>%s
        FOR UPDATE OF j SKIP LOCKED""",
        (ROUTE_VERSION, QUARANTINE_CAPABILITY, config['deployment']))
    recovered = 0
    for item in cursor.fetchall():
        payload = dict(item['payload'])
        route = dict(payload.get('capability_route', {}))
        route['deployment_id'] = config['deployment']
        payload['capability_route'] = route
        checkpoint = {'recovery': 'IMMUTABLE_RAW_REUSE_DEPLOYMENT_REFRESH',
                      'worker_run_id': str(item['worker_run_id']),
                      'failed_deployment': item['failed_deployment'],
                      'worker_error_class': item['error_class'],
                      'attempt_count_preserved': item['attempt_count']}
        cursor.execute("""UPDATE public.jobs SET status='queued',scheduled_for=clock_timestamp(),
            payload=%s::jsonb,checkpoint=coalesce(checkpoint,'{}'::jsonb)||%s::jsonb,
            leased_by=NULL,lease_expires_at=NULL,error_class=NULL,error_message=NULL
            WHERE job_id=%s AND status='dead_letter' AND attempt_count=%s""",
            (json.dumps(payload), json.dumps(checkpoint), item['job_id'], item['attempt_count']))
        cursor.execute("""UPDATE hermes_ops.research_needs SET state='OPEN',
            reason='CANONICAL_RECOVERY_SCHEDULED: immutable raw reuse deployment refresh',
            evaluated_at=clock_timestamp() WHERE need_id=%s""", (item['research_need_id'],))
        recovered += 1
    # A parser failure is recoverable only when the exact immutable input
    # is still present and a different collector deployment is now configured.
    # This preserves attempt 1/dead-letter history and never creates a job.
    cursor.execute("""SELECT j.job_id,j.research_need_id,j.attempt_count,j.max_attempts,j.payload,
          w.worker_run_id,w.deployment_id AS failed_deployment,w.error_class,
          r.retrieval_id,r.content_hash
        FROM public.jobs j
        JOIN public.jobs parent ON parent.job_id::text=j.payload->>'parent_job_id'
          AND parent.status='succeeded'
          AND parent.research_need_id=j.research_need_id
        JOIN LATERAL (SELECT worker_run_id,deployment_id,error_class,metadata FROM public.worker_runs
          WHERE job_id=j.job_id AND worker_key='hermes.cloudflare.extraction'
          ORDER BY started_at DESC LIMIT 1) w ON true
        JOIN public.raw_retrievals r
          ON r.retrieval_id::text=j.payload->'capability_route'->>'input_retrieval_id'
        WHERE j.status='dead_letter' AND j.attempt_count<j.max_attempts
          AND j.job_type='contract_evidence_extract'
          AND j.payload->>'orchestration_authority'='hermes'
          AND j.payload->>'execution_class'='PRODUCTION'
          AND j.payload->'capability_route'->>'version'=%s
          AND j.payload->'capability_route'->>'stage'='extraction'
          AND j.payload->'capability_route'->>'input_retrieval_id'=r.retrieval_id::text
          AND j.payload->'capability_route'->>'input_sha256'=r.content_hash
          AND j.payload->'capability_route'->>'source_id'=r.source_id::text
          AND parent.checkpoint->>'retrieval_id'=r.retrieval_id::text
          AND parent.checkpoint->>'sha256'=r.content_hash
          AND r.http_status=200 AND r.byte_length>0 AND r.retrieval_status='stored'
          AND w.error_class='parser_failure'
          AND w.metadata->>'retryable'='false'
          AND w.deployment_id IS NOT NULL AND w.deployment_id<>%s
        FOR UPDATE OF j SKIP LOCKED""",
        (ROUTE_VERSION, config['deployment']))
    for item in cursor.fetchall():
        payload = dict(item['payload'])
        route = dict(payload.get('capability_route', {}))
        route['deployment_id'] = config['deployment']
        payload['capability_route'] = route
        checkpoint = {'recovery': 'CHANGED_PARSER_DEPLOYMENT_REFRESH',
                      'worker_run_id': str(item['worker_run_id']),
                      'failed_deployment': item['failed_deployment'],
                      'worker_error_class': item['error_class'],
                      'input_retrieval_id': item['retrieval_id'],
                      'input_sha256': item['content_hash'],
                      'attempt_count_preserved': item['attempt_count']}
        cursor.execute("""UPDATE public.jobs SET status='queued',scheduled_for=clock_timestamp(),
            payload=%s::jsonb,checkpoint=coalesce(checkpoint,'{}'::jsonb)||%s::jsonb,
            leased_by=NULL,lease_expires_at=NULL,error_class=NULL,error_message=NULL
            WHERE job_id=%s AND status='dead_letter' AND attempt_count=%s
              AND payload->'capability_route'->>'input_retrieval_id'=%s
              AND payload->'capability_route'->>'input_sha256'=%s""",
            (json.dumps(payload), json.dumps(checkpoint), item['job_id'], item['attempt_count'],
             item['retrieval_id'], item['content_hash']))
        cursor.execute("""UPDATE hermes_ops.research_needs SET state='OPEN',
            reason='CANONICAL_RECOVERY_SCHEDULED: changed parser deployment',
            evaluated_at=clock_timestamp() WHERE need_id=%s
              AND state='BLOCKED'""", (item['research_need_id'],))
        recovered += 1
    return recovered


def quarantine_canary_budget(cursor):
    """Return only this route family's lifetime canary usage.

    Historical evidence, validation, and Governor work stays auditable but is
    deliberately outside this new route's bounded activation allowance.
    """
    cursor.execute("""SELECT coalesce(sum(attempt_count),0) AS attempts,
        count(*) FILTER (WHERE status='leased') AS active FROM public.jobs
        WHERE payload->'capability_route'->>'version'=%s
        AND payload->'capability_route'->>'capability'=%s
        AND payload->>'orchestration_authority'='hermes'
        AND payload->>'execution_class'='PRODUCTION'""",
        (ROUTE_VERSION, QUARANTINE_CAPABILITY))
    return cursor.fetchone()


def tick(governor):
    config = settings()
    producer_config = producer_outbound.settings()
    selected = None
    local_validation = False
    producer_delivery = False
    with connect_database() as connection:
        with connection, connection.cursor(cursor_factory=RealDictCursor) as cursor:
            # This serializes selection/budget decisions, not a parallel job lease.
            cursor.execute("SELECT pg_try_advisory_xact_lock(184913,3) AS acquired")
            if not cursor.fetchone()['acquired']:
                return {'state':'ANOTHER_CANONICAL_TICK_ACTIVE'}
            producer_receipt_validation.collect(cursor)
            producer_outbound.collect(cursor)
            validation_receipt.collect(cursor)
            validation_followup.collect(cursor)
            governor_context.collect(cursor)
            recover_and_collect(cursor)
            recover_immutable_raw_conflicts(cursor, config)
            routed = route_pending(cursor,config)
            producer_route = producer_outbound.activate_exact_route(cursor, producer_config)
            validation_followup.plan(cursor,config)
            governor_context.plan(cursor,config)
            if os.environ.get('HERMES_EXTRACT_EVIDENCE')=='true':
                plan_extraction(cursor,config)
                plan_exhausted_extraction_recovery(cursor,config)
            if governor['dispatch_limit'] < 1:
                return {'state':'RESOURCE_GATED'}

            recovered = producer_outbound.recover_unconfirmed(cursor, producer_config)
            if recovered is not None:
                selected = recovered
                producer_delivery = True
                candidate = None
            else:
                candidate = producer_receipt_validation.candidate(cursor)
                if candidate is not None:
                    local_validation = True
                else:
                    candidate = producer_outbound.candidate(cursor, producer_config)
                    if candidate is not None:
                        producer_delivery = True
            if selected is None:
                if candidate is None and not local_validation and not producer_delivery:
                    if not config['enabled'] or not config['ready'] or not config['deployment']:
                        return {'state':'DISPATCH_GATED','routing_evaluated':routed,
                                'credential_ready':config['ready'],'worker_deployment_configured':bool(config['deployment']),
                                'producer_outbound_ready':producer_config['ready']}
                    candidate=governor_context.candidate(cursor)
                    if candidate is None:
                        candidate=validation_followup.candidate(cursor)
                    if candidate is None:
                        candidate=validation_receipt.candidate(cursor,config)
                    if candidate is None:
                        budget = quarantine_canary_budget(cursor)
                        if config['mode'] == 'canary' and budget['attempts'] >= config['budget']:
                            return {'state':'BOUNDED_CANARY_BUDGET','attempts':int(budget['attempts'])}
                        if int(budget['active']) >= config['concurrency']:
                            return {'state':'RESOURCE_GOVERNED_CONCURRENCY','active':int(budget['active']),
                                    'concurrency':config['concurrency']}
                        cursor.execute("""SELECT j.job_id FROM public.jobs j
                            JOIN hermes_ops.research_needs n ON n.need_id=j.research_need_id
                            WHERE j.job_type IN ('contract_scope_research','contract_evidence_extract') AND j.status='queued'
                            AND j.payload->>'orchestration_authority'='hermes'
                            AND j.payload->>'execution_class'='PRODUCTION' AND n.execution_class='PRODUCTION'
                            AND n.origin IN ('CONTRACT_GAP','MONITORING','DISCOVERY') AND (n.state='OPEN' OR (j.job_type='contract_evidence_extract' AND n.state='AWAITING_RESULT'))
                            AND (j.job_type<>'contract_evidence_extract' OR %s)
                            AND j.payload->>'research_work_identity'=j.dedupe_key
                            AND j.payload->'capability_route'->>'version'=%s
                            AND ((j.job_type='contract_scope_research'
                                  AND j.payload->'capability_route'->>'capability'=%s)
                              OR (j.job_type='contract_evidence_extract'
                                  AND j.payload->'capability_route'->>'stage'='extraction'))
                            AND NOT (j.payload ? 'dispatch_blocker') AND j.attempt_count<j.max_attempts
                            AND (j.scheduled_for IS NULL OR j.scheduled_for<=clock_timestamp())
                            AND NOT EXISTS (SELECT 1 FROM hermes_ops.job_dependencies d JOIN public.jobs p
                                ON p.job_id=d.prerequisite_job_id WHERE d.job_id=j.job_id AND p.status<>'succeeded')
                            ORDER BY n.priority,j.created_at LIMIT 1""",(os.environ.get('HERMES_EXTRACT_EVIDENCE')=='true',ROUTE_VERSION,QUARANTINE_CAPABILITY))
                        candidate=cursor.fetchone()
            if candidate:
                token=secrets.token_hex(32)
                cursor.execute("SELECT * FROM hermes_ops.lease_job(%s,%s,300)",(candidate['job_id'],token))
                selected=cursor.fetchone()
                if selected:
                    if producer_delivery:
                        authorization = producer_outbound.arm_return_authorization(selected, producer_config)
                        cursor.execute("""UPDATE public.jobs SET checkpoint=coalesce(checkpoint,'{}'::jsonb)||
                            jsonb_build_object('producer_return_authorization',%s::jsonb)
                            WHERE job_id=%s AND leased_by=%s""",
                            (json.dumps({
                                'authorization_id': authorization['authorization_id'],
                                'status': authorization['status'],
                                'maximum_uses': authorization['maximum_uses'],
                                'allowed_job_id': authorization['allowed_job_id'],
                                'allowed_research_work_identity': authorization['allowed_research_work_identity'],
                                'expires_at': authorization['expires_at'],
                                'publication_allowed': False,
                            }), selected['job_id'], token))
                    if selected['payload'].get('validation_followup'):
                        safety=validation_followup.safety_snapshot(cursor,selected['target_id'])
                        cursor.execute("UPDATE public.jobs SET checkpoint=coalesce(checkpoint,'{}'::jsonb)||%s::jsonb WHERE job_id=%s AND leased_by=%s",(json.dumps({'followup_safety_before':safety}),selected['job_id'],token))
                    if selected['job_type']=='contract_evidence_validate':
                        safety=validation_receipt.snapshot(cursor,selected['target_id'])
                        cursor.execute("UPDATE public.jobs SET checkpoint=coalesce(checkpoint,'{}'::jsonb)||%s::jsonb WHERE job_id=%s AND leased_by=%s",(json.dumps({'validation_safety_before':safety}),selected['job_id'],token))
                    cursor.execute("""UPDATE public.jobs SET checkpoint=coalesce(checkpoint,'{}'::jsonb)||
                        jsonb_build_object('dispatch_attempts',coalesce(checkpoint->'dispatch_attempts','[]'::jsonb)||
                        jsonb_build_array(jsonb_build_object('attempt_token',%s::text,'attempt_count',attempt_count,
                        'leased_at',clock_timestamp(),'lease_expires_at',lease_expires_at,
                        'scheduler_source',%s::text))) WHERE job_id=%s AND leased_by=%s""",
                        (token,str(Path(__file__).resolve()),selected['job_id'],token))
                    cursor.execute("UPDATE hermes_ops.research_needs SET state='AWAITING_RESULT',reason=%s WHERE need_id=%s",
                        ('PRODUCER_ASSIGNMENT_LEASE_ACQUIRED' if producer_delivery else 'CANONICAL_LEASE_ACQUIRED', selected['research_need_id']))
    if not selected:
        return {'state':'NO_ELIGIBLE_JOB'}
    if local_validation:
        try:
            return producer_receipt_validation.execute(selected)
        except Exception:
            # The lease remains authoritative. Recovery/collection handles expiry;
            # do not expose database/file details or invent a successful result.
            return {'state':'LOCAL_VALIDATION_EXECUTION_FAILED','job_id':str(selected['job_id'])}
    if producer_delivery:
        result = producer_outbound.deliver(selected, producer_config)
        with connect_database() as connection:
            with connection, connection.cursor(cursor_factory=RealDictCursor) as cursor:
                producer_outbound.record_delivery(cursor, selected, result)
        return result
    # Commit the lease before delivery; failure or uncertain delivery expires under
    # the same canonical policy. Never reacquire via the legacy worker RPC.
    try:
        token=config['credential'].read_text().strip()
        account=os.environ['HERMES_CF_ACCOUNT_ID']; queue=os.environ['HERMES_CF_VALIDATE_QUEUE_ID'] if selected['job_type']=='contract_evidence_validate' else os.environ['HERMES_CF_INGEST_QUEUE_ID']
        message={'schemaVersion':'hermes.governor-context.v1' if selected['payload'].get('capability_route',{}).get('version')==governor_context.VERSION else 'hermes.validation-followup.v1' if selected['payload'].get('capability_route',{}).get('version')==validation_followup.VERSION else 'hermes.validation.v1' if selected['job_type']=='contract_evidence_validate' else 'hermes.extraction.v1' if selected['job_type']=='contract_evidence_extract' else 'hermes.contract.v1','job_id':str(selected['job_id']),
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
