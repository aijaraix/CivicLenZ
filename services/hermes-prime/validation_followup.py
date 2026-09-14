"""Post-receipt work in the existing ledger. No civic truth writes or new needs.

The allowance is lifetime cumulative, not reset by disabling/re-enabling it.
Only the selected receipt's existing current_occupant job can execute.
"""
import json
import os
import uuid
from capability_router import resolve

VERSION = 'hermes-validation-followup-v1'
ALLOWANCE = 'validation-followup-initial-v1'
SCOPES = ('identity', 'current_occupant', 'occupancy', 'person')


def settings():
    try:
        receipt = str(uuid.UUID(os.environ.get('HERMES_VALIDATION_FOLLOWUP_RECEIPT_ID', '')))
        budget = min(1, max(0, int(os.environ.get('HERMES_VALIDATION_FOLLOWUP_BUDGET', '0'))))
    except (ValueError, TypeError):
        receipt, budget = None, 0
    return {'enabled': os.environ.get('HERMES_VALIDATION_FOLLOWUP') == 'true',
            'receipt_id': receipt, 'budget': budget,
            'deployment': os.environ.get('HERMES_VALIDATION_FOLLOWUP_WORKER_DEPLOYMENT')}


def resolve_followup(job, need, field, sources, receipt, deployment, ready):
    if (need['scope_key'] != 'current_occupant' or job['payload'].get('scope_key') != 'current_occupant'
            or str(need['target_id']) != str(receipt['subject_id'])
            or str(need['contract_id']) != str(receipt['contract_id'])
            or need['contract_version'] != receipt['contract_version']):
        return None
    # Reuse the common canonical identity and official-source checks. This is
    # explicitly a substage of current_occupant; the persisted scope is unchanged.
    probe_job = {**job, 'payload': {**job['payload'], 'scope_key': 'evidence'}}
    probe_need = {**need, 'scope_key': 'evidence'}
    decision = resolve(probe_job, probe_need, field,
                       [s for s in sources if s['source_key'] == 'florida-governor-official'], deployment, ready)
    if decision['state'] != 'OPEN':
        return None
    route = decision['route']
    route.update(version=VERSION, capability='current_occupant_context_research',
                 module='workers/cloudflare/shared/src/contract-followup.ts',
                 output='pending evidence + NEEDS_FURTHER_VALIDATION assessment',
                 research_need_id=str(need['need_id']))
    return route


def plan(cursor, config):
    follow = settings()
    if not follow['enabled'] or not follow['receipt_id'] or not follow['deployment'] or not config['ready']:
        return
    cursor.execute("""SELECT v.*,j.job_id AS receipt_job_id,j.research_need_id AS evidence_need_id,
      j.payload->>'contract_id' AS contract_id,j.payload->>'contract_version' AS contract_version
      FROM public.validation_runs v JOIN public.jobs j ON j.job_id::text=v.input_summary->>'job_id'
      JOIN hermes_ops.research_needs en ON en.need_id=j.research_need_id
      JOIN public.claims c ON c.claim_id::text=v.result_summary->>'claim_id'
      JOIN public.claim_evidence l ON l.claim_id=c.claim_id AND l.evidence_id::text=v.result_summary->>'evidence_id' AND l.role='supports'
      JOIN public.evidence_objects e ON e.evidence_id=l.evidence_id
      WHERE v.validation_run_id=%s AND v.status='ACCEPTED_FOR_VALIDATION'
      AND v.validator_key='hermes.internal.receipt.v1'
      AND v.result_summary->'gate_facts'->>'outcome'='NEEDS_FURTHER_VALIDATION'
      AND j.status='succeeded' AND j.job_type='contract_evidence_validate'
      AND j.payload->>'orchestration_authority'='hermes' AND j.payload->>'execution_class'='PRODUCTION'
      AND j.checkpoint->>'validation_run_id'=v.validation_run_id::text
      AND j.checkpoint->>'independent_safety_check'='UNCHANGED_OCCUPANCY_AND_VERIFIED_CLAIMS'
      AND j.dedupe_key=v.input_summary->>'research_work_identity'
      AND en.state='AWAITING_RESULT' AND en.scope_key='evidence' AND en.execution_class='PRODUCTION'
      AND en.origin='CONTRACT_GAP' AND en.contract_id::text=j.payload->>'contract_id'
      AND en.contract_version=j.payload->>'contract_version'
      AND v.subject_type='seat' AND j.target_type='seat'
      AND en.target_id=v.subject_id AND j.target_id=v.subject_id AND c.seat_id=v.subject_id
      AND c.subject_type='seat' AND c.subject_id=v.subject_id AND c.field_key='current_occupant'
      AND c.verification_state='collected_unreviewed' AND e.verification_state='pending'""", (follow['receipt_id'],))
    receipt = cursor.fetchone()
    if not receipt:
        return
    cursor.execute("""SELECT row_to_json(j) AS job,row_to_json(n) AS need,row_to_json(f) AS field
      FROM hermes_ops.research_needs n JOIN public.jobs j ON j.research_need_id=n.need_id
      JOIN public.research_contracts c ON c.research_contract_id=n.contract_id AND c.active AND c.version::text=n.contract_version
      JOIN public.research_contract_fields f ON f.research_contract_id=n.contract_id AND f.field_key=n.scope_key
      WHERE n.target_type='seat' AND n.target_id=%s AND n.contract_id::text=%s AND n.contract_version=%s
      AND n.origin='CONTRACT_GAP' AND n.execution_class='PRODUCTION' AND n.scope_key=ANY(%s)
      AND j.job_type='contract_scope_research' AND j.status='queued' AND j.attempt_count=0
      AND j.payload->>'orchestration_authority'='hermes' AND j.payload->>'execution_class'='PRODUCTION'
      AND j.dedupe_key=j.payload->>'research_work_identity'
      AND j.target_id=n.target_id AND j.target_type=n.target_type AND j.seat_id=n.target_id
      AND j.payload->>'scope_key'=n.scope_key AND j.payload->>'contract_id'=n.contract_id::text
      AND j.payload->>'contract_version'=n.contract_version
      AND n.state IN ('BLOCKED','OPEN') ORDER BY n.scope_key,j.job_id FOR UPDATE OF n,j SKIP LOCKED""",
      (receipt['subject_id'], receipt['contract_id'], receipt['contract_version'], list(SCOPES)))
    rows = cursor.fetchall()
    # Ambiguous duplicate scope work is a routing blocker, never a random choice.
    if len([x for x in rows if x['need']['scope_key'] == 'current_occupant']) != 1:
        return
    cursor.execute('SELECT source_id,source_key,source_url,active,authority_tier FROM public.sources WHERE active')
    sources = cursor.fetchall()
    prerequisites = []
    for item in rows:
        j, n = item['job'], item['need']
        previous = j['payload'].get('validation_followup')
        if previous and previous.get('receipt_id') != follow['receipt_id']:
            continue
        allowed = ('CAPABILITY_NOT_IMPLEMENTED: contract scope requirements',
                   'CAPABILITY_NOT_IMPLEMENTED: contract scope worker routing', 'VALIDATION_FOLLOWUP_ROUTED')
        if n['reason'] not in allowed or j['payload'].get('dispatch_blocker') not in (None, 'CAPABILITY_NOT_IMPLEMENTED', *allowed[:2]):
            continue
        link = {'receipt_id': follow['receipt_id'], 'receipt_job_id': str(receipt['receipt_job_id']),
                'evidence_need_id': str(receipt['evidence_need_id']),
                'claim_id': receipt['result_summary']['claim_id'],
                'parent_evidence_id': receipt['result_summary']['evidence_id'],
                'allowance': ALLOWANCE, 'scope': n['scope_key']}
        cursor.execute("""INSERT INTO hermes_ops.job_dependencies(job_id,prerequisite_job_id,reason)
          VALUES(%s,%s,%s) ON CONFLICT DO NOTHING""",
          (j['job_id'], receipt['receipt_job_id'], 'Accepted validation receipt '+follow['receipt_id']))
        payload = {**j['payload'], 'validation_followup': link}
        route = resolve_followup(j, n, item['field'], sources, receipt, follow['deployment'], config['ready'])
        if route:
            payload['capability_route'] = route
            payload.pop('dispatch_blocker', None)
            # Generic evidence routing must never relabel this job or its budget.
            payload.pop('routing_decision', None)
        cursor.execute('UPDATE public.jobs SET payload=%s::jsonb WHERE job_id=%s', (json.dumps(payload), j['job_id']))
        cursor.execute("""UPDATE hermes_ops.research_needs SET basis=basis||%s::jsonb,
          state=CASE WHEN %s THEN 'OPEN' ELSE state END,
          reason=CASE WHEN %s THEN 'VALIDATION_FOLLOWUP_ROUTED' ELSE reason END WHERE need_id=%s""",
          (json.dumps({'validation_followup': link}), bool(route), bool(route), n['need_id']))
        prerequisites.append({'need_id': str(n['need_id']), 'job_id': str(j['job_id']),
                              'scope': n['scope_key'], 'research_work_identity': j['dedupe_key'],
                              'satisfaction': 'CANONICAL_GATE_DECISION_REQUIRED_NOT_JOB_SUCCESS'})
    if prerequisites:
        cursor.execute("""UPDATE hermes_ops.research_needs SET basis=basis||%s::jsonb
          WHERE need_id=%s AND state='AWAITING_RESULT'""",
          (json.dumps({'validation_dependencies': {follow['receipt_id']: prerequisites}}), receipt['evidence_need_id']))


def candidate(cursor):
    follow = settings()
    if not follow['enabled'] or not follow['receipt_id'] or not follow['deployment'] or not follow['budget']:
        return None
    cursor.execute("""SELECT coalesce(sum(attempt_count),0) AS attempts FROM public.jobs
      WHERE payload->'validation_followup'->>'allowance'=%s""", (ALLOWANCE,))
    if cursor.fetchone()['attempts'] >= follow['budget']:
        return None
    cursor.execute("""SELECT j.job_id FROM public.jobs j JOIN hermes_ops.research_needs n ON n.need_id=j.research_need_id
      WHERE j.status='queued' AND j.attempt_count=0 AND j.attempt_count<j.max_attempts
      AND j.job_type='contract_scope_research' AND n.state='OPEN' AND n.scope_key='current_occupant'
      AND n.execution_class='PRODUCTION' AND n.origin='CONTRACT_GAP'
      AND j.payload->>'orchestration_authority'='hermes' AND j.payload->>'execution_class'='PRODUCTION'
      AND j.dedupe_key=j.payload->>'research_work_identity'
      AND j.payload->'validation_followup'->>'receipt_id'=%s
      AND j.payload->'validation_followup'->>'allowance'=%s
      AND j.payload->'capability_route'->>'version'=%s
      AND j.payload->'capability_route'->>'deployment_id'=%s
      AND NOT (j.payload ? 'dispatch_blocker')
      AND (j.scheduled_for IS NULL OR j.scheduled_for<=clock_timestamp())
      AND NOT EXISTS(SELECT 1 FROM public.jobs a WHERE a.status='leased'
        AND a.payload->>'orchestration_authority'='hermes' AND a.payload->>'execution_class'='PRODUCTION')
      AND NOT EXISTS(SELECT 1 FROM hermes_ops.job_dependencies d JOIN public.jobs p ON p.job_id=d.prerequisite_job_id
        WHERE d.job_id=j.job_id AND p.status<>'succeeded') ORDER BY n.priority,j.created_at LIMIT 1""",
      (follow['receipt_id'], ALLOWANCE, VERSION, follow['deployment']))
    return cursor.fetchone()


def safety_snapshot(cursor, seat):
    # Includes unreviewed states, dates and Person identity; pending evidence may
    # be added, but existing linked evidence must not be changed.
    result = {}
    for key, query in {
        'claims': 'SELECT c.* FROM public.claims c WHERE c.seat_id=%s',
        'occupancy': 'SELECT o.* FROM public.seat_occupancies o WHERE o.seat_id=%s',
        'persons': 'SELECT p.* FROM public.persons p WHERE p.person_id IN (SELECT person_id FROM public.seat_occupancies WHERE seat_id=%s)',
        'existing_evidence': 'SELECT e.* FROM public.evidence_objects e WHERE e.evidence_id IN (SELECT l.evidence_id FROM public.claim_evidence l JOIN public.claims c ON c.claim_id=l.claim_id WHERE c.seat_id=%s)',
    }.items():
        cursor.execute('SELECT md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text)::text,\'[]\')) AS digest FROM ('+query+') x', (seat,))
        result[key] = cursor.fetchone()['digest']
    return result


def collect(cursor):
    # Recovery is independent of enable switches and budget, including rollback.
    cursor.execute("""SELECT j.*,lease_expires_at<=clock_timestamp() AS expired FROM public.jobs j
      WHERE j.status='leased' AND j.payload->>'orchestration_authority'='hermes'
      AND j.payload->>'execution_class'='PRODUCTION'
      AND j.payload->'validation_followup'->>'allowance'=%s FOR UPDATE SKIP LOCKED""", (ALLOWANCE,))
    for job in cursor.fetchall():
        p = job['payload']; link = p['validation_followup']; route = p['capability_route']
        cursor.execute("""SELECT * FROM public.worker_runs WHERE job_id=%s AND worker_key='hermes.cloudflare.validation_followup'
          AND metadata->>'attempt_token'=%s AND deployment_id=%s ORDER BY started_at DESC LIMIT 1""",
          (job['job_id'], job['leased_by'], route['deployment_id']))
        run = cursor.fetchone()
        if job['expired'] or (run and run['status'] == 'failed'):
            if run and run['status'] == 'started':
                cursor.execute("UPDATE public.worker_runs SET status='failed',completed_at=clock_timestamp(),error_class='lease_expired' WHERE worker_run_id=%s AND status='started'", (run['worker_run_id'],))
            cursor.execute("""UPDATE public.jobs SET status='dead_letter',leased_by=NULL,lease_expires_at=NULL,
              error_class='VALIDATION_FOLLOWUP_ALLOWANCE_EXHAUSTED' WHERE job_id=%s AND leased_by=%s""", (job['job_id'], job['leased_by']))
            cursor.execute("UPDATE hermes_ops.research_needs SET state='BLOCKED',reason='VALIDATION_FOLLOWUP_ALLOWANCE_EXHAUSTED' WHERE need_id=%s", (job['research_need_id'],))
            continue
        if not run or run['status'] != 'succeeded':
            continue
        m = run['metadata']
        cursor.execute("""SELECT v.result_summary,r.retrieved_at FROM public.validation_runs v
          JOIN public.raw_retrievals r ON r.retrieval_id::text=v.result_summary->>'retrieval_id'
          JOIN public.evidence_objects e ON e.evidence_id::text=v.result_summary->>'evidence_id'
          WHERE v.validation_run_id=%s AND v.validator_key=%s AND v.status='NEEDS_FURTHER_VALIDATION'
          AND v.subject_id=%s AND v.started_at<=v.completed_at
          AND v.input_summary->>'job_id'=%s AND v.input_summary->>'attempt_token'=%s
          AND v.input_summary->>'research_work_identity'=%s
          AND v.input_summary->>'receipt_id'=%s AND v.input_summary->>'deployment_id'=%s
          AND v.input_summary->>'research_need_id'=%s
          AND r.job_id=%s AND r.http_status=200 AND r.byte_length>0
          AND r.content_hash=%s AND r.metadata->>'worker_run_id'=%s
          AND r.metadata->>'attempt_token'=%s AND r.source_id::text=%s AND r.source_url=%s
          AND e.retrieval_id=r.retrieval_id AND e.content_hash=r.content_hash
          AND e.asset_uri=r.raw_object_uri AND e.verification_state='pending'
          AND v.result_summary->>'schema_certified'='false'
          AND v.result_summary->>'auto_verification_allowed'='false'
          AND v.result_summary->>'publication_eligible'='false'
          AND v.result_summary->'identity_assessment'->>'resolved'='false'
          AND v.result_summary->'currentness_assessment'->>'tenure_effective_period_established'='false'
          AND v.result_summary->'dataset_applicability'->>'state'='NOT_APPLICABLE'""",
          (m.get('validation_run_id'), VERSION, job['target_id'], str(job['job_id']), job['leased_by'],
           job['dedupe_key'], link['receipt_id'], route['deployment_id'], str(job['research_need_id']),
           job['job_id'], m.get('sha256'), str(run['worker_run_id']), job['leased_by'], route['source_id'], route['retrieval_url']))
        artifact = cursor.fetchone()
        if not artifact or safety_snapshot(cursor, job['target_id']) != job['checkpoint'].get('followup_safety_before'):
            continue  # Never acknowledge inconsistent artifacts; lease recovery records failure.
        # Complete bounded SQL scope: no LIMIT/sample. Unknown valid periods are
        # included conservatively. Transaction timestamp records the query cutoff.
        cursor.execute("""SELECT claim_id,display_value,verification_state,valid_from,valid_to FROM public.claims
          WHERE (seat_id=%s OR (subject_type='seat' AND subject_id=%s)) AND field_key='current_occupant'
          AND (valid_from IS NULL OR valid_from<=%s) AND (valid_to IS NULL OR valid_to>%s)
          ORDER BY claim_id""", (job['target_id'], job['target_id'], artifact['retrieved_at'], artifact['retrieved_at']))
        claims = cursor.fetchall()
        cursor.execute("""SELECT contradiction_id,status,claim_ids FROM public.contradictions
          WHERE (seat_id=%s OR (subject_type='seat' AND subject_id=%s)) AND field_key='current_occupant'
          ORDER BY contradiction_id""", (job['target_id'], job['target_id']))
        contradictions = cursor.fetchall()
        competing = [str(c['claim_id']) for c in claims if c['display_value'] != artifact['result_summary'].get('display_value')]
        assessment = {'state': 'CONTRADICTION_PENDING' if competing or contradictions else 'NO_COMPETING_CLAIM_FOUND',
                      'query_complete': True, 'as_of': str(artifact['retrieved_at']), 'claims_examined': len(claims),
                      'competing_claim_ids': competing, 'contradiction_ids': [str(c['contradiction_id']) for c in contradictions],
                      'reason': 'Unknown valid periods included; all contradiction records retained conservatively; absence is not identity proof'}
        result = {'worker_run_id': str(run['worker_run_id']), 'validation_run_id': m['validation_run_id'],
                  'retrieval_id': artifact['result_summary']['retrieval_id'], 'evidence_id': artifact['result_summary']['evidence_id'],
                  'independent_acknowledgement': 'HERMES_ARTIFACT_LINEAGE_AND_UNCHANGED_TRUTH',
                  'contradiction_assessment': assessment, 'gate_assessment': artifact['result_summary'],
                  'decision': 'NEEDS_FURTHER_VALIDATION'}
        cursor.execute("""UPDATE public.jobs SET status='succeeded',completed_at=clock_timestamp(),
          checkpoint=checkpoint||%s::jsonb,leased_by=NULL,lease_expires_at=NULL,error_class=NULL,error_message=NULL
          WHERE job_id=%s AND leased_by=%s AND lease_expires_at>clock_timestamp() RETURNING job_id""",
          (json.dumps(result), job['job_id'], job['leased_by']))
        if cursor.fetchone():
            cursor.execute("""UPDATE hermes_ops.research_needs SET state='AWAITING_RESULT',
              reason='NEEDS_FURTHER_VALIDATION: follow-up evidence acknowledged; identity/parser/currentness gates remain',
              basis=basis||%s::jsonb WHERE need_id=%s""", (json.dumps({'validation_followup_result': result}), job['research_need_id']))
