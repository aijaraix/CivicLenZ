"""Canonical child work planning; no worker persistence or alternate lease authority."""
import hashlib
import json
from capability_router import ROUTE_VERSION


def child_identity(parent_work, retrieval_id, stage):
    value = {'parent_research_work_identity': parent_work, 'retrieval_id': str(retrieval_id),
             'scope': 'evidence', 'stage': stage, 'version': 1}
    return 'work:v1:' + hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


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
