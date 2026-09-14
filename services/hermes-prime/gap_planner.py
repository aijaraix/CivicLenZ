"""Bounded canonical planning for persisted contract scopes with no linked evidence.

This initial rule detects complete absence of linked Seat evidence. It does not
assert field-level currentness when evidence exists, mark scopes reconciled, or
dispatch an unimplemented capability. The same HERMES process owns planning.
"""
import hashlib
import json
import time

from database_bootstrap import connect_database


def semantic_identity(seat_id, contract_id, version, field_key):
    semantic = {"subject_type": "seat", "subject_id": str(seat_id),
                "contract_id": str(contract_id), "contract_version": str(version),
                "scope_key": field_key, "purpose": "missing_linked_evidence", "version": 1}
    digest = hashlib.sha256(json.dumps(semantic, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return "need:v1:" + digest, "work:v1:" + digest


def reconcile():
    created_needs = created_jobs = examined = 0
    with connect_database() as connection:
        with connection, connection.cursor() as cursor:
            cursor.execute("SELECT pg_try_advisory_xact_lock(184913,2)")
            if not cursor.fetchone()[0]:
                return {"state": "ANOTHER_CANONICAL_TICK_ACTIVE", "observed_at": time.time()}
            cursor.execute("""
                SELECT s.seat_id,c.research_contract_id,c.version,f.field_key,
                       f.research_contract_field_id,f.required_for_baseline
                FROM public.seats s
                JOIN public.research_contracts c ON c.contract_key=s.research_contract_key AND c.active
                JOIN public.research_contract_fields f ON f.research_contract_id=c.research_contract_id
                WHERE NOT EXISTS (
                    SELECT 1 FROM public.claims claim
                    JOIN public.claim_evidence link ON link.claim_id=claim.claim_id
                    JOIN public.evidence_objects evidence ON evidence.evidence_id=link.evidence_id
                    WHERE claim.seat_id=s.seat_id OR
                          (claim.subject_type='seat' AND claim.subject_id=s.seat_id))
                AND NOT EXISTS (SELECT 1 FROM hermes_ops.research_needs n
                    WHERE n.target_type='seat' AND n.target_id=s.seat_id
                    AND n.contract_id=c.research_contract_id AND n.contract_version=c.version::text
                    AND n.scope_key=f.field_key AND n.origin='CONTRACT_GAP')
                ORDER BY s.seat_id,f.sort_order,f.field_key LIMIT 50
            """)
            for seat, contract, version, field, contract_field, baseline in cursor.fetchall():
                examined += 1
                need_key, work_key = semantic_identity(seat, contract, version, field)
                basis = {"rule": "seat_contract_with_zero_linked_evidence_v1",
                         "contract_field_id": str(contract_field), "linked_evidence_count": 0,
                         "evidence_query": "claims JOIN claim_evidence JOIN evidence_objects scoped to Seat",
                         "limitation": "Partial evidence and currentness reconciliation require additional rules"}
                cursor.execute("""INSERT INTO hermes_ops.research_needs
                    (need_key,contract_id,contract_version,target_type,target_id,scope_key,
                     origin,execution_class,state,reason,basis,priority)
                    VALUES(%s,%s,%s,'seat',%s,%s,'CONTRACT_GAP','PRODUCTION','BLOCKED',
                      'CAPABILITY_NOT_IMPLEMENTED: contract scope worker routing',%s::jsonb,%s)
                    ON CONFLICT(need_key) DO NOTHING RETURNING need_id""",
                    (need_key,contract,str(version),seat,field,json.dumps(basis),10 if baseline else 100))
                row = cursor.fetchone()
                if row:
                    created_needs += 1
                    need_id = row[0]
                else:
                    cursor.execute("SELECT need_id FROM hermes_ops.research_needs WHERE need_key=%s", (need_key,))
                    need_id = cursor.fetchone()[0]
                payload = {"orchestration_authority": "hermes", "execution_class": "PRODUCTION",
                           "research_work_identity": work_key, "scope_key": field,
                           "contract_id": str(contract), "contract_version": str(version),
                           "dispatch_blocker": "CAPABILITY_NOT_IMPLEMENTED"}
                cursor.execute("""INSERT INTO public.jobs
                    (job_type,target_type,target_id,seat_id,priority,dedupe_key,payload,research_need_id)
                    VALUES('contract_scope_research','seat',%s,%s,%s,%s,%s::jsonb,%s)
                    ON CONFLICT(dedupe_key) DO NOTHING RETURNING job_id""",
                    (seat,seat,10 if baseline else 100,work_key,json.dumps(payload),need_id))
                if cursor.fetchone():
                    created_jobs += 1
    return {"state": "GAPS_PERSISTED_WORKER_ROUTING_BLOCKED", "observed_at": time.time(),
            "scopes_examined": examined, "needs_inserted": created_needs,
            "jobs_inserted": created_jobs, "dispatch_active": False}
