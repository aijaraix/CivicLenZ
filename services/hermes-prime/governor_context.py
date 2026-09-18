"""Governor context research using the existing identity/person/occupancy jobs.

The allowance is lifetime cumulative, not reset by disabling/re-enabling it.
Only an explicitly selected scope can execute, once, after the proven follow-up.
"""
import json
import os
import uuid
from capability_router import resolve

VERSION = 'hermes-governor-context-v1'
ALLOWANCE = 'governor-context-initial-v1'
SCOPES = ('identity', 'person', 'occupancy')
# A parser/schema repair can safely resume the *same* durable work after the
# corrected worker is deployed.  This is deliberately narrower than generic
# failed-work retry: the failure must be a structural non-match and the prior
# worker deployment must differ from the configured deployment.
RETRYABLE_WORKER_FAILURES = ('governor_card_structure_unproven', 'worker_store_http_409')


def settings():
    try:
        receipt = str(uuid.UUID(os.environ.get('HERMES_GOVERNOR_CONTEXT_RECEIPT_ID', '')))
        budget = min(5, max(0, int(os.environ.get('HERMES_GOVERNOR_CONTEXT_BUDGET', '0'))))
    except (ValueError, TypeError):
        receipt, budget = None, 0
    return {'enabled': os.environ.get('HERMES_GOVERNOR_CONTEXT') == 'true',
            'receipt_id': receipt, 'budget': budget,
            'deployment': os.environ.get('HERMES_GOVERNOR_CONTEXT_WORKER_DEPLOYMENT'),
            'scope': os.environ.get('HERMES_GOVERNOR_CONTEXT_SCOPE', 'identity')}


def resolve_followup(job, need, field, sources, receipt, deployment, ready):
    if (need['scope_key'] not in SCOPES or job['payload'].get('scope_key') != need['scope_key']
            or str(need['target_id']) != str(receipt['subject_id'])
            or str(need['contract_id']) != str(receipt['contract_id'])
            or need['contract_version'] != receipt['contract_version']):
        return None
    # Reuse the common canonical identity and official-source checks. This is
    # explicitly a substage of current_occupant; the persisted scope is unchanged.
    required = 'official_source' if need['scope_key'] == 'identity' else 'review'
    if field.get('verification_requirement') != required:
        return None
    # Resolve source transport only. The actual review requirement remains in the
    # contract and is enforced by the worker; routing does not satisfy review.
    transport_field = {**field, 'verification_requirement': 'official_source'}
    probe_job = {**job, 'payload': {**job['payload'], 'scope_key': 'evidence'}}
    probe_need = {**need, 'scope_key': 'evidence'}
    decision = resolve(probe_job, probe_need, transport_field,
                       [s for s in sources if s['source_key'] == 'florida-governor-official'], deployment, ready)
    if decision['state'] != 'OPEN':
        return None
    route = decision['route']
    route.update(version=VERSION, capability='governor_authoritative_context', retrieval_url='https://www.flgov.com/eog/leadership',
                 module='workers/cloudflare/shared/src/contract-followup.ts',
                 output='pending evidence + NEEDS_FURTHER_VALIDATION assessment',
                 research_need_id=str(need['need_id']))
    return route


def plan(cursor, config):
    follow = settings()
    if not follow['enabled'] or follow['scope'] not in SCOPES or not follow['receipt_id'] or not follow['deployment'] or not config['ready']:
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
    cursor.execute("""SELECT job_id FROM public.jobs WHERE status='succeeded'
      AND target_id=%s AND payload->>'orchestration_authority'='hermes'
      AND payload->>'execution_class'='PRODUCTION'
      AND payload->'capability_route'->>'version'='hermes-validation-followup-v1'
      AND payload->'validation_followup'->>'receipt_id'=%s
      AND checkpoint->>'independent_acknowledgement'='HERMES_ARTIFACT_LINEAGE_AND_UNCHANGED_TRUTH'""",
      (receipt['subject_id'],follow['receipt_id']))
    parents = cursor.fetchall()
    if len(parents) != 1:
        return
    receipt['context_parent_job_id'] = str(parents[0]['job_id'])
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
    if len([x for x in rows if x['need']['scope_key'] == follow['scope']]) != 1:
        return
    cursor.execute('SELECT source_id,source_key,source_url,active,authority_tier FROM public.sources WHERE active')
    sources = cursor.fetchall()
    prerequisites = []
    for item in rows:
        j, n = item['job'], item['need']
        if n['scope_key'] != follow['scope']:
            continue
        previous = j['payload'].get('validation_followup')
        if previous and previous.get('receipt_id') != follow['receipt_id']:
            continue
        allowed = ('CAPABILITY_NOT_IMPLEMENTED: contract scope requirements',
                   'CAPABILITY_NOT_IMPLEMENTED: contract scope worker routing', 'GOVERNOR_CONTEXT_ROUTED')
        if n['reason'] not in allowed or j['payload'].get('dispatch_blocker') not in (None, 'CAPABILITY_NOT_IMPLEMENTED', *allowed[:2]):
            continue
        link = {'receipt_id': follow['receipt_id'], 'receipt_job_id': str(receipt['receipt_job_id']),
                'evidence_need_id': str(receipt['evidence_need_id']),
                'claim_id': receipt['result_summary']['claim_id'],
                'parent_evidence_id': receipt['result_summary']['evidence_id'],
                'allowance': ALLOWANCE, 'scope': n['scope_key'],
                'context_parent_job_id': receipt['context_parent_job_id']}
        cursor.execute("""INSERT INTO hermes_ops.job_dependencies(job_id,prerequisite_job_id,reason)
          VALUES(%s,%s,%s) ON CONFLICT DO NOTHING""",
          (j['job_id'], receipt['receipt_job_id'], 'Accepted validation receipt '+follow['receipt_id']))
        cursor.execute("""INSERT INTO hermes_ops.job_dependencies(job_id,prerequisite_job_id,reason)
          VALUES(%s,%s,%s) ON CONFLICT DO NOTHING""",
          (j['job_id'], receipt['context_parent_job_id'], 'Independently acknowledged current-office follow-up'))
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
          reason=CASE WHEN %s THEN 'GOVERNOR_CONTEXT_ROUTED' ELSE reason END WHERE need_id=%s""",
          (json.dumps({'validation_followup': link}), bool(route), bool(route), n['need_id']))
        prerequisites.append({'need_id': str(n['need_id']), 'job_id': str(j['job_id']),
                              'scope': n['scope_key'], 'research_work_identity': j['dedupe_key'],
                              'satisfaction': 'CANONICAL_GATE_DECISION_REQUIRED_NOT_JOB_SUCCESS'})
    if prerequisites:
        cursor.execute("""UPDATE hermes_ops.research_needs SET basis=jsonb_set(basis,
          '{governor_context_dependencies}',coalesce(basis->'governor_context_dependencies','{}'::jsonb)||%s::jsonb)
          WHERE need_id=%s AND state='AWAITING_RESULT'""",
          (json.dumps({follow['scope']: prerequisites}), receipt['evidence_need_id']))


def candidate(cursor):
    follow = settings()
    if not follow['enabled'] or follow['scope'] not in SCOPES or not follow['receipt_id'] or not follow['deployment'] or not follow['budget']:
        return None
    cursor.execute("""SELECT coalesce(sum(attempt_count),0) AS attempts FROM public.jobs
      WHERE payload->'validation_followup'->>'allowance'=%s""", (ALLOWANCE,))
    if cursor.fetchone()['attempts'] >= follow['budget']:
        return None
    cursor.execute("""SELECT j.job_id FROM public.jobs j JOIN hermes_ops.research_needs n ON n.need_id=j.research_need_id
      WHERE j.status='queued' AND j.attempt_count<j.max_attempts
      AND j.job_type='contract_scope_research' AND n.state='OPEN' AND n.scope_key=%s
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
      (follow['scope'], follow['receipt_id'], ALLOWANCE, VERSION, follow['deployment']))
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
    # A dispatch that never reached a worker may be retried on the same durable
    # job. Preserve its consumed attempt and dead-letter details in checkpoint;
    # only refresh the stale physical worker deployment binding.
    follow = settings()
    if follow['enabled'] and follow['deployment'] and follow['budget']:
        cursor.execute("""SELECT j.* FROM public.jobs j
          WHERE j.status='dead_letter' AND j.error_class='GOVERNOR_CONTEXT_ALLOWANCE_EXHAUSTED'
          AND j.attempt_count>0 AND j.attempt_count<j.max_attempts AND j.attempt_count<%s
          AND j.payload->'validation_followup'->>'allowance'=%s
          AND j.payload->'validation_followup'->>'receipt_id'=%s
          AND j.payload->'capability_route'->>'version'=%s
          AND NOT EXISTS(SELECT 1 FROM public.worker_runs w WHERE w.job_id=j.job_id)
          ORDER BY j.updated_at,j.job_id LIMIT 1 FOR UPDATE SKIP LOCKED""",
          (follow['budget'], ALLOWANCE, follow['receipt_id'], VERSION))
        retry = cursor.fetchone()
        if retry:
            prior = {'attempt_count': retry['attempt_count'], 'status': retry['status'],
                     'error_class': retry['error_class'], 'error_message': retry['error_message'],
                     'worker_deployment': retry['payload']['capability_route'].get('deployment_id'),
                     'recovery': 'NO_WORKER_RUN_DEPLOYMENT_REFRESH'}
            payload = {**retry['payload']}
            payload['capability_route'] = {**payload['capability_route'], 'deployment_id': follow['deployment']}
            cursor.execute("""UPDATE public.jobs SET status='queued',payload=%s::jsonb,
              checkpoint=checkpoint||jsonb_build_object('governor_context_failed_attempt_'||attempt_count::text,%s::jsonb),
              error_class=NULL,error_message=NULL,scheduled_for=clock_timestamp(),updated_at=clock_timestamp()
              WHERE job_id=%s AND status='dead_letter' AND attempt_count=%s""",
              (json.dumps(payload), json.dumps(prior), retry['job_id'], retry['attempt_count']))
            cursor.execute("""UPDATE hermes_ops.research_needs SET state='OPEN',reason='GOVERNOR_CONTEXT_RETRY_READY',
              basis=basis||%s::jsonb WHERE need_id=%s AND state='BLOCKED'
              AND reason='GOVERNOR_CONTEXT_ALLOWANCE_EXHAUSTED'""",
              (json.dumps({'governor_context_retry': prior}), retry['research_need_id']))
        # Preserve failed worker history, but allow a structural parser repair
        # to use the next existing canonical attempt.  A different deployment
        # is an explicit guard against re-running unchanged code; arbitrary
        # worker failures and exhausted jobs remain terminal.
        cursor.execute("""SELECT j.*,w.worker_run_id,w.deployment_id AS failed_deployment,
            w.error_class AS worker_error_class,w.error_message AS worker_error_message
          FROM public.jobs j JOIN public.worker_runs w ON w.job_id=j.job_id
          WHERE j.status='dead_letter' AND j.error_class='GOVERNOR_CONTEXT_ALLOWANCE_EXHAUSTED'
          AND j.attempt_count>0 AND j.attempt_count<j.max_attempts AND j.attempt_count<%s
          AND j.payload->'validation_followup'->>'allowance'=%s
          AND j.payload->'validation_followup'->>'receipt_id'=%s
          AND j.payload->'capability_route'->>'version'=%s
          AND w.worker_key='hermes.cloudflare.governor_context' AND w.status='failed'
          AND w.error_class=ANY(%s) AND w.deployment_id<>%s
          AND NOT EXISTS(SELECT 1 FROM public.worker_runs newer WHERE newer.job_id=j.job_id
            AND newer.started_at>w.started_at)
          ORDER BY w.completed_at DESC NULLS LAST,j.job_id LIMIT 1 FOR UPDATE OF j,w SKIP LOCKED""",
          (follow['budget'], ALLOWANCE, follow['receipt_id'], VERSION,
           list(RETRYABLE_WORKER_FAILURES), follow['deployment']))
        retry = cursor.fetchone()
        if retry:
            prior = {'attempt_count': retry['attempt_count'], 'status': retry['status'],
                     'error_class': retry['error_class'], 'error_message': retry['error_message'],
                     'worker_run_id': str(retry['worker_run_id']),
                     'worker_error_class': retry['worker_error_class'],
                     'worker_error_message': retry['worker_error_message'],
                     'worker_deployment': retry['failed_deployment'],
                     'replacement_deployment': follow['deployment'],
                     'recovery': 'PARSER_DEPLOYMENT_REFRESH'}
            payload = {**retry['payload']}
            payload['capability_route'] = {**payload['capability_route'], 'deployment_id': follow['deployment']}
            cursor.execute("""UPDATE public.jobs SET status='queued',payload=%s::jsonb,
              checkpoint=checkpoint||jsonb_build_object('governor_context_failed_attempt_'||attempt_count::text,%s::jsonb),
              error_class=NULL,error_message=NULL,scheduled_for=clock_timestamp(),updated_at=clock_timestamp()
              WHERE job_id=%s AND status='dead_letter' AND attempt_count=%s""",
              (json.dumps(payload), json.dumps(prior), retry['job_id'], retry['attempt_count']))
            cursor.execute("""UPDATE hermes_ops.research_needs SET state='OPEN',reason='GOVERNOR_CONTEXT_RETRY_READY',
              basis=basis||%s::jsonb WHERE need_id=%s AND state='BLOCKED'
              AND reason='GOVERNOR_CONTEXT_ALLOWANCE_EXHAUSTED'""",
              (json.dumps({'governor_context_retry': prior}), retry['research_need_id']))
    cursor.execute("""SELECT j.*,lease_expires_at<=clock_timestamp() AS expired,
      CASE WHEN j.status='dead_letter' THEN j.checkpoint->'dispatch_attempts'->-1->>'attempt_token'
        ELSE j.leased_by END AS acknowledgement_attempt_token,
      (j.status='dead_letter' AND j.error_class='GOVERNOR_CONTEXT_ALLOWANCE_EXHAUSTED'
       AND j.attempt_count=j.max_attempts
       AND NOT (j.checkpoint ? 'independent_acknowledgement')) AS postlease_ack
      FROM public.jobs j
      WHERE j.status IN ('leased','dead_letter')
      AND j.payload->>'orchestration_authority'='hermes'
      AND j.payload->>'execution_class'='PRODUCTION'
      AND j.payload->'validation_followup'->>'allowance'=%s
      AND (j.status='leased' OR (j.error_class='GOVERNOR_CONTEXT_ALLOWANCE_EXHAUSTED'
        AND j.attempt_count=j.max_attempts AND NOT (j.checkpoint ? 'independent_acknowledgement')))
      FOR UPDATE SKIP LOCKED""", (ALLOWANCE,))
    for job in cursor.fetchall():
        p = job['payload']; link = p['validation_followup']; route = p['capability_route']
        cursor.execute("""SELECT * FROM public.worker_runs WHERE job_id=%s AND worker_key='hermes.cloudflare.governor_context'
          AND metadata->>'attempt_token'=%s AND deployment_id=%s ORDER BY started_at DESC LIMIT 1""",
          (job['job_id'], job['acknowledgement_attempt_token'], route['deployment_id']))
        run = cursor.fetchone()
        # A completed worker run is canonical input to acknowledgement even if
        # the lease sweep runs after expiry.  The post-lease branch is limited
        # to the already dead-lettered final attempt; it never requeues,
        # dispatches, or changes attempt_count.
        if (job['expired'] and not (run and run['status'] == 'succeeded')) or (run and run['status'] == 'failed'):
            if run and run['status'] == 'started':
                cursor.execute("UPDATE public.worker_runs SET status='failed',completed_at=clock_timestamp(),error_class='lease_expired' WHERE worker_run_id=%s AND status='started'", (run['worker_run_id'],))
            cursor.execute("""UPDATE public.jobs SET status='dead_letter',leased_by=NULL,lease_expires_at=NULL,
              error_class='GOVERNOR_CONTEXT_ALLOWANCE_EXHAUSTED' WHERE job_id=%s AND leased_by=%s""", (job['job_id'], job['leased_by']))
            cursor.execute("UPDATE hermes_ops.research_needs SET state='BLOCKED',reason='GOVERNOR_CONTEXT_ALLOWANCE_EXHAUSTED' WHERE need_id=%s", (job['research_need_id'],))
            continue
        if not run or run['status'] != 'succeeded':
            continue
        m = run['metadata']
        cursor.execute("""SELECT v.result_summary,r.retrieved_at FROM public.validation_runs v
          JOIN public.raw_retrievals r ON r.retrieval_id::text=v.result_summary->>'retrieval_id'
          JOIN public.evidence_objects e ON e.evidence_id::text=v.result_summary->>'evidence_id'
          JOIN hermes_ops.research_needs j_scope ON j_scope.need_id::text=v.input_summary->>'research_need_id'
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
          AND v.result_summary->>'research_scope'=j_scope.scope_key
          AND v.result_summary->'authoritative_context'->>'parserVersion'='hermes-governor-context-v1'
          AND (j_scope.scope_key='identity' OR v.result_summary->>'review_required'='true')
          AND v.result_summary->>'schema_certified'='false'
          AND v.result_summary->>'auto_verification_allowed'='false'
          AND v.result_summary->>'publication_eligible'='false'
          AND v.result_summary->'identity_assessment'->>'resolved'='false'
          AND v.result_summary->'currentness_assessment'->>'tenure_effective_period_established'='false'
          AND v.result_summary->'dataset_applicability'->>'state'='NOT_APPLICABLE'""",
          (m.get('validation_run_id'), VERSION, job['target_id'], str(job['job_id']), job['acknowledgement_attempt_token'],
           job['dedupe_key'], link['receipt_id'], route['deployment_id'], str(job['research_need_id']),
           job['job_id'], m.get('sha256'), str(run['worker_run_id']), job['acknowledgement_attempt_token'], route['source_id'], route['retrieval_url']))
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
          WHERE job_id=%s AND ((status='leased' AND leased_by=%s AND lease_expires_at>clock_timestamp())
            OR (status='dead_letter' AND error_class='GOVERNOR_CONTEXT_ALLOWANCE_EXHAUSTED'
              AND attempt_count=max_attempts AND NOT (checkpoint ? 'independent_acknowledgement')))
          RETURNING job_id""", (json.dumps(result), job['job_id'], job['leased_by']))
        if cursor.fetchone():
            cursor.execute("""UPDATE hermes_ops.research_needs SET state='AWAITING_RESULT',
              reason='NEEDS_FURTHER_VALIDATION: authoritative context acknowledged; identity/review/parser/currentness gates remain',
              basis=basis||%s::jsonb WHERE need_id=%s""", (json.dumps({'validation_followup_result': result}), job['research_need_id']))
