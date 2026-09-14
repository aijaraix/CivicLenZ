"""Durable, non-dispatching implementation gaps and legacy provenance inventory.

Runs inside HERMES only when HERMES_BACKLOG_INVENTORY=true. Never mutates jobs,
needs, evidence or people. Classification is an observation, not lease authority.
A legacy run or self-declared payload cannot establish REAL_PROVEN provenance.
"""
import hashlib
import json
import time
from database_bootstrap import connect_database

LIMIT = 200


def legacy_classification(payload, runs):
    # Payload labels are retained as declarations, not accepted as proof of TEST,
    # SYNTHETIC or REAL_PROVEN. Those classes require independent audit evidence.
    return {'classification': 'LEGACY_UNPROVEN' if runs else 'UNKNOWN',
            'reason': 'Worker history lacks canonical attestation' if runs else 'No worker execution provenance',
            'declared_execution_class': (payload.get('execution_class')
                if payload.get('execution_class') in ('PRODUCTION', 'TEST', 'SYNTHETIC', 'REAL_PROVEN') else None),
            'worker_runs': runs, 'dispatch_allowed': False,
            'required_action': 'independent_provenance_review_before_retire_supersede_or_migrate'}


def record(cursor, key, kind, references, observation):
    # Immutable observation key includes the observation hash. Changed physical
    # facts append a new record; an operator's resolution is never reopened/lost.
    digest = hashlib.sha256(json.dumps(observation, sort_keys=True).encode()).hexdigest()
    cursor.execute('''INSERT INTO hermes_ops.incidents
        (incident_key,incident_class,affected_references,observations)
        VALUES(%s,%s,%s::jsonb,%s::jsonb)
        ON CONFLICT(incident_key) DO UPDATE SET last_observed_at=clock_timestamp()''',
        (key+':'+digest, kind, json.dumps(references), json.dumps(observation)))


def reconcile():
    counts = {'legacy_observations': 0, 'capability_observations': 0}
    with connect_database() as connection:
        with connection, connection.cursor() as cursor:
            cursor.execute('SELECT pg_try_advisory_xact_lock(184913,8)')
            if not cursor.fetchone()[0]:
                return {'state': 'ANOTHER_INVENTORY_ACTIVE', 'dispatch_active': False}
            # At most 200 records per population per tick. Oldest observation
            # ordering rotates unhandled items to the front on later ticks.
            cursor.execute('''SELECT j.job_id,j.job_type,j.payload,j.attempt_count,
                    (SELECT count(*) FROM public.worker_runs w WHERE w.job_id=j.job_id)
                FROM public.jobs j
                WHERE j.status='queued' AND j.job_type IN ('ingest','monitor')
                  AND nullif(j.payload->>'orchestration_authority','') IS NULL
                ORDER BY coalesce((SELECT max(i.last_observed_at) FROM hermes_ops.incidents i
                  WHERE i.incident_class='LEGACY_PROVENANCE_REVIEW'
                  AND i.affected_references->>'job_id'=j.job_id::text), '-infinity'::timestamptz),j.job_id
                LIMIT %s''', (LIMIT+1,))
            legacy = cursor.fetchall()
            for job, kind, payload, attempts, runs in legacy[:LIMIT]:
                assessment = legacy_classification(payload or {}, runs)
                assessment.update(job_type=kind, attempt_count=attempts)
                record(cursor, 'legacy-review:v1:'+str(job), 'LEGACY_PROVENANCE_REVIEW',
                       {'job_id': str(job)}, assessment)
                counts['legacy_observations'] += 1
            cursor.execute('''SELECT n.need_id,n.contract_id,n.contract_version,n.scope_key,n.reason
                FROM hermes_ops.research_needs n
                WHERE n.state='BLOCKED' AND n.execution_class='PRODUCTION'
                  AND n.reason LIKE 'CAPABILITY_NOT_IMPLEMENTED%%'
                ORDER BY coalesce((SELECT max(i.last_observed_at) FROM hermes_ops.incidents i
                  WHERE i.incident_class='CAPABILITY_NOT_IMPLEMENTED'
                  AND i.affected_references->>'need_id'=n.need_id::text), '-infinity'::timestamptz),n.need_id
                LIMIT %s''', (LIMIT+1,))
            needs = cursor.fetchall()
            for need, contract, version, scope, reason in needs[:LIMIT]:
                record(cursor, 'capability-gap:v1:'+str(need), 'CAPABILITY_NOT_IMPLEMENTED',
                       {'need_id':str(need),'contract_id':str(contract),'contract_version':str(version),'scope_key':scope},
                       {'state':'CAPABILITY_NOT_IMPLEMENTED','reason':reason,
                        'required_action':'implement_and_physically_prove_exact_contract_capability',
                        'factual_no_result':False,'dispatch_allowed':False})
                counts['capability_observations'] += 1
    return {'state':'PARTIAL_ROTATING_INVENTORY' if max(len(legacy),len(needs))>LIMIT else 'OBSERVED_BACKLOG_REQUIRES_REVIEW',
            **counts,'dispatch_active':False,'observed_at':time.time(),
            'national_acceptance':False,'producer_activation_allowed':False}
