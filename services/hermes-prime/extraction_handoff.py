"""Canonical child work planning; no worker persistence or alternate lease authority."""
import hashlib
import json
from capability_router import ROUTE_VERSION

MAX_CHANGED_PARSER_GENERATIONS = 3

EXHAUSTED_RECOVERY_QUERY = r"""SELECT j.*,parent.dedupe_key AS parent_work,r.retrieval_id,r.content_hash,
          w.worker_run_id,w.deployment_id AS failed_deployment,w.error_class,w.metadata AS worker_metadata
        FROM public.jobs j
        JOIN hermes_ops.research_needs n ON n.need_id=j.research_need_id
        JOIN public.jobs parent ON parent.job_id::text=j.payload->>'parent_job_id'
          AND parent.status='succeeded' AND parent.research_need_id=j.research_need_id
        JOIN LATERAL (SELECT r2.retrieval_id,r2.content_hash,r2.http_status,r2.byte_length,r2.retrieval_status,r2.source_id
          FROM public.raw_retrievals r2
          WHERE r2.retrieval_id::text=j.payload->'capability_route'->>'input_retrieval_id'
          LIMIT 1) r ON true
        JOIN LATERAL (SELECT w2.worker_run_id,w2.deployment_id,w2.error_class,w2.metadata
          FROM public.worker_runs w2 WHERE w2.job_id=j.job_id AND w2.worker_key='hermes.cloudflare.extraction'
          ORDER BY w2.started_at DESC LIMIT 1) w ON true
        WHERE j.job_type='contract_evidence_extract' AND j.status='dead_letter'
          AND j.attempt_count=j.max_attempts AND j.attempt_count>0
          AND j.payload->>'orchestration_authority'='hermes'
          AND j.payload->>'execution_class'='PRODUCTION'
          AND j.payload->>'research_work_identity'=j.dedupe_key
          AND j.payload->'capability_route'->>'version'=%s
          AND j.payload->'capability_route'->>'stage'='extraction'
          AND j.payload->'capability_route'->>'input_retrieval_id'=r.retrieval_id::text
          AND j.payload->'capability_route'->>'input_sha256'=r.content_hash
          AND j.payload->'capability_route'->>'source_id'=r.source_id::text
          AND parent.checkpoint->>'retrieval_id'=r.retrieval_id::text
          AND parent.checkpoint->>'sha256'=r.content_hash
          AND r.http_status=200 AND r.byte_length>0 AND r.retrieval_status='stored'
          AND w.error_class='parser_failure'
          AND coalesce(w.metadata->>'retryable','false')='false'
          AND w.deployment_id IS NOT NULL AND w.deployment_id<>%s
          AND n.execution_class='PRODUCTION'
          AND n.state IN ('BLOCKED','AWAITING_RESULT')
          AND (CASE WHEN j.payload->>'recovery_generation' ~ '^[0-9]+$'
                    THEN (j.payload->>'recovery_generation')::integer ELSE 1 END) < %s
          AND NOT EXISTS (SELECT 1 FROM public.jobs replacement
            WHERE replacement.payload->>'supersedes_job_id'=j.job_id::text
              AND replacement.payload->>'recovery_reason'='CHANGED_PARSER_IMPLEMENTATION')
        FOR UPDATE OF j SKIP LOCKED"""


def child_identity(parent_work, retrieval_id, stage):
    value = {'parent_research_work_identity': parent_work, 'retrieval_id': str(retrieval_id),
             'scope': 'evidence', 'stage': stage, 'version': 1}
    return 'work:v1:' + hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def recovery_identity(parent_work, retrieval_id, exhausted_job_id, deployment):
    """Create one bounded ResearchWork generation for a changed implementation.

    This is deliberately distinct from a retry: the exhausted job and every
    attempt remain terminal history, while the new work retains the same
    parent scope and immutable retrieval lineage.
    """
    value = {'parent_research_work_identity': parent_work, 'retrieval_id': str(retrieval_id),
             'supersedes_job_id': str(exhausted_job_id), 'deployment': deployment,
             'scope': 'evidence', 'stage': 'extraction_recovery', 'version': 1}
    return 'work:v2:' + hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def plan_extraction(cursor, config):
    if not config['deployment'] or not config['ready']:
        return
    cursor.execute("""SELECT j.*,r.retrieval_id,r.content_hash FROM public.jobs j
        JOIN hermes_ops.research_needs n ON n.need_id=j.research_need_id
        JOIN public.raw_retrievals r ON r.job_id=j.job_id
        WHERE j.job_type='contract_scope_research' AND j.status='succeeded'
        AND j.payload->>'orchestration_authority'='hermes' AND j.payload->>'execution_class'='PRODUCTION'
        AND j.dedupe_key=j.payload->>'research_work_identity' AND n.execution_class='PRODUCTION'
        AND n.state='AWAITING_RESULT' AND n.scope_key IN ('evidence','seat')
        AND j.checkpoint->>'retrieval_id'=r.retrieval_id::text
        AND j.checkpoint->>'sha256'=r.content_hash AND r.http_status=200 AND r.byte_length>0
        AND j.payload->'capability_route'->>'source_key' IN ('florida-governor-official','miami-dade-county-elected-officials')
        AND EXISTS (SELECT 1 FROM public.research_contracts c WHERE c.research_contract_id=n.contract_id AND c.active AND c.version::text=n.contract_version)
        AND j.payload->'capability_route'->>'version'=%s LIMIT 1""", (ROUTE_VERSION,))
    for parent in cursor.fetchall():
        route = dict(parent['payload']['capability_route'])
        roster = route.get('source_key') == 'miami-dade-county-elected-officials'
        route.update(deployment_id=config['deployment'], stage='extraction',
                     capability='authoritative_roster_extraction' if roster else 'official_profile_evidence_extraction',
                     module='workers/cloudflare/shared/src/contract-extraction.ts',
                     output='unresolved_roster_units pending; seat/identity reconciliation handoff' if roster
                     else 'evidence_objects pending; canonical validation handoff',
                     input_retrieval_id=str(parent['retrieval_id']), input_sha256=parent['content_hash'])
        work = child_identity(parent['dedupe_key'], parent['retrieval_id'], 'extraction')
        payload = {**parent['payload'], 'research_work_identity':work,
                   'parent_research_work_identity':parent['dedupe_key'], 'parent_job_id':str(parent['job_id']),
                   'capability_route':route, 'routing_decision':{'version':ROUTE_VERSION,'state':'OPEN',
                   'reason':'ROUTE_RESOLVED: verified raw retrieval to unverified evidence','route':route}}
        payload.pop('dispatch_blocker',None)
        cursor.execute("""INSERT INTO public.jobs
            (job_type,target_type,target_id,seat_id,priority,dedupe_key,payload,research_need_id,max_attempts)
            VALUES('contract_evidence_extract',%s,%s,%s,%s,%s,%s::jsonb,%s,2)
            ON CONFLICT(dedupe_key) DO NOTHING RETURNING job_id""",
            (parent['target_type'],parent['target_id'],parent['seat_id'],parent['priority'],work,json.dumps(payload),parent['research_need_id']))
        child=cursor.fetchone()
        if child:
            cursor.execute("INSERT INTO hermes_ops.job_dependencies(job_id,prerequisite_job_id,reason) VALUES(%s,%s,'Canonical evidence stage requires successful parent')",
                           (child['job_id'],parent['job_id']))


def plan_exhausted_extraction_recovery(cursor, config):
    """Regenerate one extraction ResearchWork after a changed parser deploy.

    The historical job is never requeued or edited. A replacement is allowed
    only for an exhausted, non-retryable parser failure with the same
    successful parent and verified immutable retrieval/hash, and only once per
    prior job/deployment pair.
    """
    if not config['deployment'] or not config['ready']:
        return 0
    cursor.execute(EXHAUSTED_RECOVERY_QUERY, (ROUTE_VERSION, config['deployment'], MAX_CHANGED_PARSER_GENERATIONS))
    created = 0
    for prior in cursor.fetchall():
        route = dict(prior['payload'].get('capability_route', {}))
        route['deployment_id'] = config['deployment']
        work = recovery_identity(prior['dedupe_key'], prior['retrieval_id'], prior['job_id'], config['deployment'])
        payload = {**prior['payload'],
                   'research_work_identity': work,
                   'parent_research_work_identity': prior['payload'].get('parent_research_work_identity', prior['parent_work']),
                   'capability_route': route,
                   'routing_decision': {'version': ROUTE_VERSION, 'state': 'OPEN',
                                        'reason': 'ROUTE_RESOLVED: changed parser implementation generation',
                                        'route': route},
                   'supersedes_job_id': str(prior['job_id']),
                   'supersedes_research_work_identity': prior['dedupe_key'],
                   'recovery_generation': int(prior['payload'].get('recovery_generation', 1)) + 1,
                   'recovery_reason': 'CHANGED_PARSER_IMPLEMENTATION',
                   'recovery_deployment': config['deployment'],
                   'input_retrieval_id': str(prior['retrieval_id']),
                   'input_sha256': prior['content_hash']}
        payload.pop('dispatch_blocker', None)
        cursor.execute("""INSERT INTO public.jobs
            (job_type,target_type,target_id,seat_id,priority,dedupe_key,payload,research_need_id,max_attempts)
            VALUES('contract_evidence_extract',%s,%s,%s,%s,%s,%s::jsonb,%s,2)
            ON CONFLICT(dedupe_key) DO NOTHING RETURNING job_id""",
            (prior['target_type'], prior['target_id'], prior['seat_id'], prior['priority'], work,
             json.dumps(payload), prior['research_need_id']))
        replacement = cursor.fetchone()
        if not replacement:
            continue
        cursor.execute("""INSERT INTO hermes_ops.job_dependencies(job_id,prerequisite_job_id,reason)
            VALUES(%s,%s,'Changed parser generation retains successful retrieval parent')""",
            (replacement['job_id'], prior['payload']['parent_job_id']))
        cursor.execute("""UPDATE hermes_ops.research_needs SET state='AWAITING_RESULT',
            reason='CANONICAL_RECOVERY_SCHEDULED: changed parser ResearchWork generation',
            basis=coalesce(basis,'{}'::jsonb)||%s::jsonb,evaluated_at=clock_timestamp()
            WHERE need_id=%s AND state IN ('BLOCKED','AWAITING_RESULT')""",
            (json.dumps({'recovery_generation': int(prior['payload'].get('recovery_generation', 1)) + 1, 'supersedes_job_id': str(prior['job_id']),
                         'input_retrieval_id': str(prior['retrieval_id']), 'input_sha256': prior['content_hash'],
                         'deployment': config['deployment']}), prior['research_need_id']))
        created += 1
    return created


def plan_validation_handoff(cursor, job, result):
    work=child_identity(job['dedupe_key'], result['retrieval_id'], 'canonical_validation')
    payload={'orchestration_authority':'hermes','execution_class':'PRODUCTION',
             'research_work_identity':work,'parent_research_work_identity':job['dedupe_key'],
             'root_research_work_identity':job['payload']['parent_research_work_identity'],
             'parent_job_id':str(job['job_id']),'scope_key':'evidence',
             'contract_id':job['payload']['contract_id'],'contract_version':job['payload']['contract_version'],
             'retrieval_id':result['retrieval_id'],'evidence_id':result['evidence_id'],
             'extraction_run_id':result['extraction_run_id'],
             'dispatch_blocker':'CAPABILITY_NOT_IMPLEMENTED: internal canonical validation receipt'}
    cursor.execute("""INSERT INTO public.jobs(job_type,target_type,target_id,seat_id,priority,dedupe_key,payload,research_need_id)
        VALUES('contract_evidence_validate',%s,%s,%s,%s,%s,%s::jsonb,%s)
        ON CONFLICT(dedupe_key) DO NOTHING RETURNING job_id""",
        (job['target_type'],job['target_id'],job['seat_id'],job['priority'],work,json.dumps(payload),job['research_need_id']))
    row=cursor.fetchone()
    if row:
        cursor.execute("INSERT INTO hermes_ops.job_dependencies(job_id,prerequisite_job_id,reason) VALUES(%s,%s,'Canonical evidence stage requires successful parent')",(row['job_id'],job['job_id']))
