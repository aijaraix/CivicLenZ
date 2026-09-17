"""Durable Academy observation intake for real production incidents.

Academy records operational learning only. It cannot write civic tables, verify
claims, publish, or promote changes. Initial cases are admitted only when their
physical receipt/job lineage is still present.
"""
from __future__ import annotations

import json
from pathlib import Path
import time

from database_bootstrap import connect_database

INITIAL_RECEIPT = "6b627925-2f4c-4078-a5a9-3376099c98ec"
INITIAL_JOB = "d2261640-8cdd-4f9a-bef3-ff12166e6d93"


def _load_receipt(spool: Path, receipt_id: str) -> dict | None:
    try:
        value = json.loads((spool / "receipts" / f"{receipt_id}.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return value if isinstance(value, dict) and value.get("receipt_id") == receipt_id else None


def _candidate_names(receipt: dict) -> list[str]:
    entities = (receipt.get("envelope") or {}).get("entities") or {}
    result = []
    for item in entities.get("candidate_campaign_candidates") or []:
        name = ((item if isinstance(item, dict) else {}).get("attributes") or {}).get("candidate_name")
        if isinstance(name, str):
            result.append(name)
    return result


def _upsert(cursor, observation: dict, case: dict, evaluation: dict) -> None:
    cursor.execute("""INSERT INTO hermes_ops.academy_observations
        (observation_key,environment,event_class,affected_component,telemetry_lineage,measurement)
        VALUES(%s,'PRODUCTION',%s,%s,%s::jsonb,%s::jsonb)
        ON CONFLICT(observation_key) DO UPDATE SET
          last_observed_at=clock_timestamp(),
          occurrence_count=hermes_ops.academy_observations.occurrence_count+1,
          measurement=excluded.measurement
        RETURNING observation_id""", (
        observation["key"], observation["event_class"], observation["component"],
        json.dumps(observation["lineage"]), json.dumps(observation["measurement"]),
    ))
    observation_id = cursor.fetchone()[0]
    cursor.execute("""INSERT INTO hermes_ops.academy_cases
        (case_key,observation_id,failure_class,affected_component,first_incorrect_transition,
         blast_radius,hypothesis,proposed_change,expected_benefit,risk_level,
         regression_requirements,rollback_plan,state,promotion_requires_review)
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s,true)
        ON CONFLICT(case_key) DO UPDATE SET updated_at=clock_timestamp()
        RETURNING academy_case_id""", (
        case["key"], observation_id, case["failure_class"], observation["component"],
        case["transition"], case["blast_radius"], case["hypothesis"], case["change"],
        case["benefit"], case["risk"], json.dumps(case["tests"]), case["rollback"], case["state"],
    ))
    case_id = cursor.fetchone()[0]
    cursor.execute("""INSERT INTO hermes_ops.academy_evaluations
        (academy_case_id,evaluation_key,test_references,measured_result,regression_state,
         promotion_state,post_promotion_monitoring)
        VALUES(%s,%s,%s::jsonb,%s::jsonb,%s,%s,%s::jsonb)
        ON CONFLICT(evaluation_key) DO UPDATE SET
          measured_result=excluded.measured_result,
          regression_state=excluded.regression_state,
          post_promotion_monitoring=excluded.post_promotion_monitoring""", (
        case_id, evaluation["key"], json.dumps(evaluation["tests"]),
        json.dumps(evaluation["result"]), evaluation["regression"], evaluation["promotion"],
        json.dumps(evaluation["monitoring"]),
    ))


def reconcile(spool: Path | None = None) -> dict:
    spool = spool or Path("/var/lib/civiclenz/hermes-ingest")
    receipt = _load_receipt(spool, INITIAL_RECEIPT)
    if receipt is None:
        return {"state": "ACADEMY_SOURCE_LINEAGE_UNAVAILABLE", "cases_observed": 0}
    names = _candidate_names(receipt)
    pseudo = sorted(name for name in names if name.strip().rstrip(":") in ("General Election", "Special Election"))
    dispatch_attempts = receipt.get("dispatch_attempts")
    evidence_count = len((receipt.get("envelope") or {}).get("evidence") or [])

    with connect_database() as connection:
        with connection, connection.cursor() as cursor:
            cursor.execute("SELECT pg_try_advisory_xact_lock(184913,9)")
            if not cursor.fetchone()[0]:
                return {"state": "ANOTHER_ACADEMY_TICK_ACTIVE", "cases_observed": 0}
            cursor.execute("""SELECT checkpoint FROM public.jobs WHERE job_id=%s
                AND payload->>'orchestration_authority'='hermes'""", (INITIAL_JOB,))
            row = cursor.fetchone()
            if not row:
                return {"state": "ACADEMY_SOURCE_LINEAGE_UNAVAILABLE", "cases_observed": 0}
            checkpoint = row[0] or {}
            recovery = checkpoint.get("producer_outbound_recovery") or {}
            prior_child = recovery.get("previous_producer_job_id")
            common_lineage = {
                "canonical_job_id": INITIAL_JOB,
                "receipt_id": INITIAL_RECEIPT,
                "research_work_identity": receipt.get("research_work_identity"),
            }
            cases = []
            if prior_child:
                cases.extend([
                    ({"key":"academy-observation:multi-evidence-envelope-v1","event_class":"HANDOFF_FAILURE",
                      "component":"producer.canonical-envelope","lineage":{**common_lineage,"failed_producer_child":prior_child},
                      "measurement":{"recovered_receipt_evidence_count":evidence_count,"history_preserved":True}},
                     {"key":"academy-case:multi-evidence-envelope-v1","failure_class":"EVIDENCE_REFERENCE_OMISSION",
                      "transition":"producer canonical-envelope serialization omitted referenced evidence after extraction",
                      "blast_radius":"multi-record producer results using row-specific evidence","hypothesis":"serialize and validate every referenced evidence object before durable return",
                      "change":"complete evidence closure validation in canonical-envelope construction","benefit":"no orphan claim/candidate evidence references",
                      "risk":"HIGH","tests":["multi-evidence envelope closure","raw hash and byte-length integrity"],
                      "rollback":"restore prior producer revision while leaving failed runs and receipts intact","state":"EVALUATED"},
                     {"key":"academy-evaluation:multi-evidence-envelope-v1","tests":["producer PR 9 regression"],
                      "result":{"physical_multi_evidence_receipt":INITIAL_RECEIPT,"evidence_count":evidence_count},
                      "regression":"PASSED","promotion":"PENDING_REVIEW","monitoring":{"orphan_reference_count":0}}),
                    ({"key":"academy-observation:same-attempt-terminal-child-recovery-v1","event_class":"QUEUE_FAILURE",
                      "component":"hermes.producer-outbound","lineage":{**common_lineage,"terminal_child":prior_child},
                      "measurement":{"canonical_attempt":1,"recovery_reason":recovery.get("reason")}},
                     {"key":"academy-case:same-attempt-terminal-child-recovery-v1","failure_class":"TERMINAL_CHILD_BLOCKED_CANONICAL_ATTEMPT",
                      "transition":"producer dedupe treated a terminal child as a live canonical execution",
                      "blast_radius":"canonical assignments whose producer child is terminal before accepted return",
                      "hypothesis":"permit one fenced replacement child while preserving canonical attempt identity",
                      "change":"bounded same-attempt terminal-child recovery","benefit":"recover executor failure without duplicate canonical attempts",
                      "risk":"HIGH","tests":["terminal child required","new nonterminal child required","attempt remains one"],
                      "rollback":"disable terminal-child recovery gate; preserve both child records","state":"EVALUATED"},
                     {"key":"academy-evaluation:same-attempt-terminal-child-recovery-v1","tests":["canonical PR 83 regression"],
                      "result":{"canonical_attempt":1,"receipt_id":INITIAL_RECEIPT},"regression":"PASSED",
                      "promotion":"PENDING_REVIEW","monitoring":{"duplicate_canonical_attempts":0}}),
                ])
            if receipt.get("acknowledgement_state") == "NEEDS_IDENTITY_RESOLUTION" and isinstance(dispatch_attempts, int) and dispatch_attempts >= 3:
                cases.append((
                    {"key":"academy-observation:identity-resolution-dispatch-v1","event_class":"HANDOFF_FAILURE",
                     "component":"hermes.producer-receipt-dispatch","lineage":common_lineage,
                     "measurement":{"acknowledgement_state":"NEEDS_IDENTITY_RESOLUTION","historical_dispatch_attempts":dispatch_attempts,
                                    "final_dispatch_state":receipt.get("dispatch_state")}},
                    {"key":"academy-case:identity-resolution-dispatch-v1","failure_class":"VALID_REVIEW_STATE_NOT_DISPATCHABLE",
                     "transition":"receipt dispatcher rejected a truthful review-required acknowledgement before validation handoff",
                     "blast_radius":"integrity-passing unreviewed receipts requiring canonical identity resolution",
                     "hypothesis":"review-required acknowledgements are valid validation inputs without truth promotion",
                     "change":"allow NEEDS_IDENTITY_RESOLUTION to create exactly one validation handoff","benefit":"preserve fail-closed review while completing canonical lineage",
                     "risk":"HIGH","tests":["ack state preserved","one handoff","no verification/publication authority"],
                     "rollback":"remove dispatchable state while retaining receipt and failed dispatch history","state":"EVALUATED"},
                    {"key":"academy-evaluation:identity-resolution-dispatch-v1","tests":["canonical PR 84 regression"],
                     "result":{"final_dispatch_state":receipt.get("dispatch_state"),"acknowledgement_state":receipt.get("acknowledgement_state")},
                     "regression":"PASSED","promotion":"PENDING_REVIEW","monitoring":{"duplicate_validation_jobs":0}},
                ))
            if pseudo:
                cases.append((
                    {"key":"academy-observation:fl-dos-selector-parser-v1","event_class":"PARSER_FAILURE",
                     "component":"producer.FloridaDOSDivisionOfElectionsAdapter","lineage":common_lineage,
                     "measurement":{"pseudo_candidate_labels":pseudo,"canonical_truth_created":False}},
                    {"key":"academy-case:fl-dos-selector-parser-v1","failure_class":"SELECTOR_ROWS_PARSED_AS_CANDIDATES",
                     "transition":"landing-page form controls entered candidate-row extraction",
                     "blast_radius":"Florida DOS candidate-listing results from the selector-page parser",
                     "hypothesis":"accept only result rows carrying official candidate-detail structural identity",
                     "change":"resolve selected election listing and require CanDetail account links","benefit":"reject form/header pseudo-candidates deterministically",
                     "risk":"HIGH","tests":["reject General Election label","reject Special Election label","require candidate-detail link"],
                     "rollback":"restore prior producer revision with outbound disabled","state":"EVALUATED"},
                    {"key":"academy-evaluation:fl-dos-selector-parser-v1","tests":["producer PR 10 parser regression"],
                     "result":{"historical_pseudo_labels":pseudo,"later_clean_receipts_required":True},
                     "regression":"PASSED","promotion":"PENDING_REVIEW","monitoring":{"pseudo_label_recurrence_target":0}},
                ))
            for observation, case, evaluation in cases:
                _upsert(cursor, observation, case, evaluation)
    return {"state": "ACADEMY_PRODUCTION_OBSERVATIONS_PERSISTED", "cases_observed": len(cases),
            "observed_at": time.time()}
