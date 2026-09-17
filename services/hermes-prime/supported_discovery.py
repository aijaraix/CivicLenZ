"""HERMES-owned bounded work generation for the proven Florida DOS capability."""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import os
import time

from database_bootstrap import connect_database

VERSION = "hermes-supported-florida-discovery-v1"
SOURCE_KEY = "fl_dos_elections"
SEAT_KEY = "us-fl-governor"
JURISDICTION_KEY = "us-fl"
CONTRACT_KEY = "STATE_GOVERNOR"
SCOPE_KEY = "election_history"


def settings() -> dict:
    mode = os.environ.get("HERMES_SUPPORTED_FLORIDA_DISCOVERY_MODE", "off").strip().lower()
    cohort = os.environ.get("HERMES_SUPPORTED_FLORIDA_DISCOVERY_COHORT", "").strip()
    try:
        target = min(50, max(0, int(os.environ.get("HERMES_SUPPORTED_FLORIDA_DISCOVERY_TARGET", "0"))))
        max_outstanding = min(2, max(1, int(os.environ.get("HERMES_SUPPORTED_FLORIDA_MAX_OUTSTANDING", "1"))))
        cadence_seconds = min(86400, max(900, int(os.environ.get("HERMES_SUPPORTED_FLORIDA_CADENCE_SECONDS", "3600"))))
    except ValueError:
        target, max_outstanding, cadence_seconds = 0, 1, 3600
    return {"enabled": mode in ("cohort", "continuous"), "mode": mode, "cohort": cohort,
            "target": target, "max_outstanding": max_outstanding, "cadence_seconds": cadence_seconds}


def _identity(cohort: str, ordinal: int) -> tuple[str, str]:
    semantic = {"version": 1, "orchestrator": "hermes", "capability": "FL_DOS_CANDIDATE_FILINGS",
                "purpose": "supported_currentness_retrieval", "cohort": cohort, "ordinal": ordinal}
    digest = hashlib.sha256(json.dumps(semantic, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return "need:v1:" + digest, "work:v1:" + digest


def _continuous_cohort(cadence_seconds: int) -> str:
    bucket = int(datetime.now(timezone.utc).timestamp()) // cadence_seconds
    return f"fl-dos-continuous-{cadence_seconds}s-{bucket}"


def reconcile() -> dict:
    config = settings()
    if not config["enabled"]:
        return {"state": "SUPPORTED_DISCOVERY_DISABLED", "created": 0}
    cohort = config["cohort"] if config["mode"] == "cohort" else _continuous_cohort(config["cadence_seconds"])
    target = config["target"] if config["mode"] == "cohort" else 1
    if not cohort or target < 1:
        return {"state": "SUPPORTED_DISCOVERY_CONFIG_INVALID", "created": 0}
    created = 0
    with connect_database() as connection:
        with connection, connection.cursor() as cursor:
            cursor.execute("SELECT pg_try_advisory_xact_lock(184913,10)")
            if not cursor.fetchone()[0]:
                return {"state": "ANOTHER_SUPPORTED_DISCOVERY_TICK_ACTIVE", "created": 0}
            cursor.execute("""SELECT s.seat_id,j.jurisdiction_id,c.research_contract_id,c.version,
                f.research_contract_field_id,src.source_id
                FROM public.seats s JOIN public.jurisdictions j ON j.jurisdiction_id=s.jurisdiction_id
                JOIN public.research_contracts c ON c.contract_key=s.research_contract_key AND c.active
                JOIN public.research_contract_fields f ON f.research_contract_id=c.research_contract_id
                JOIN public.sources src ON src.source_key=%s AND src.active
                WHERE s.seat_key=%s AND j.jurisdiction_key=%s AND c.contract_key=%s
                  AND f.field_key=%s AND f.verification_requirement='official_source'
                  AND f.source_priority->>'policy'='florida-election-calendar'""",
                (SOURCE_KEY, SEAT_KEY, JURISDICTION_KEY, CONTRACT_KEY, SCOPE_KEY))
            row = cursor.fetchone()
            if not row:
                return {"state": "SUPPORTED_DISCOVERY_DEPENDENCY_MISSING", "created": 0}
            seat_id, _, contract_id, version, contract_field_id, source_id = row
            cursor.execute("""INSERT INTO public.monitoring_state
                (target_type,target_id,seat_id,active,monitoring_class,next_check_at,configuration,
                 source_id,monitoring_status,source_state,next_action)
                VALUES('source',%s,%s,true,'fl_dos_candidate_filings',clock_timestamp(),%s::jsonb,
                       %s,'DUE','UNKNOWN','CREATE_SUPPORTED_RESEARCH_WORK')
                ON CONFLICT(target_type,target_id,monitoring_class) DO NOTHING""",
                (source_id, seat_id, json.dumps({"orchestration_authority":"hermes","version":VERSION,
                 "source_key":SOURCE_KEY,"scope_key":SCOPE_KEY,"cadence_seconds":config["cadence_seconds"]}), source_id))
            cursor.execute("""SELECT count(*) FROM public.jobs
                WHERE payload->>'supported_discovery_version'=%s AND payload->>'cohort_key'=%s""", (VERSION, cohort))
            existing = int(cursor.fetchone()[0])
            if existing >= target:
                return {"state": "SUPPORTED_DISCOVERY_TARGET_PRESENT", "created": 0,
                        "cohort": cohort, "target": target, "existing": existing}
            for ordinal in range(existing + 1, target + 1):
                need_key, work_key = _identity(cohort, ordinal)
                basis = {"rule":"supported_dynamic_source_currentness_v1","source_id":str(source_id),
                         "source_key":SOURCE_KEY,"contract_field_id":str(contract_field_id),
                         "cohort_key":cohort,"cohort_ordinal":ordinal,"target":target,
                         "monitoring_only":True,"truth_authority":False,"publication_authority":False}
                cursor.execute("""INSERT INTO hermes_ops.research_needs
                    (need_key,contract_id,contract_version,target_type,target_id,scope_key,origin,
                     execution_class,state,reason,basis,priority)
                    VALUES(%s,%s,%s,'seat',%s,%s,'MONITORING','PRODUCTION','OPEN',
                      'SUPPORTED_FL_DOS_CURRENTNESS_WORK_READY',%s::jsonb,20)
                    ON CONFLICT(need_key) DO NOTHING RETURNING need_id""",
                    (need_key, contract_id, str(version), seat_id, SCOPE_KEY, json.dumps(basis)))
                need = cursor.fetchone()
                if not need:
                    continue
                payload = {"orchestration_authority":"hermes","execution_class":"PRODUCTION",
                           "research_work_identity":work_key,"scope_key":SCOPE_KEY,
                           "contract_id":str(contract_id),"contract_version":str(version),
                           "supported_discovery_version":VERSION,"cohort_key":cohort,
                           "cohort_ordinal":ordinal,"source_key":SOURCE_KEY,
                           "classification_ceiling":"extracted_unreviewed",
                           "verification_allowed":False,"publication_allowed":False}
                cursor.execute("""INSERT INTO public.jobs
                    (job_type,target_type,target_id,seat_id,source_id,priority,status,attempt_count,
                     max_attempts,dedupe_key,payload,research_need_id)
                    VALUES('contract_scope_research','seat',%s,%s,%s,20,'queued',0,1,%s,%s::jsonb,%s)
                    ON CONFLICT(dedupe_key) DO NOTHING RETURNING job_id""",
                    (seat_id, seat_id, source_id, work_key, json.dumps(payload), need[0]))
                if cursor.fetchone():
                    created += 1
    return {"state":"SUPPORTED_DISCOVERY_WORK_CREATED" if created else "SUPPORTED_DISCOVERY_TARGET_PRESENT",
            "created":created,"cohort":cohort,"target":target,"observed_at":time.time()}


def reconcile_monitoring_outcomes() -> dict:
    with connect_database() as connection:
        with connection, connection.cursor() as cursor:
            cursor.execute("""SELECT j.completed_at,j.checkpoint->>'result_content_hash',j.payload->>'cohort_key'
                FROM public.jobs j WHERE j.status='succeeded'
                  AND j.payload->>'supported_discovery_version'=%s
                  AND j.checkpoint ? 'producer_validation_evaluation_id'
                ORDER BY j.completed_at DESC LIMIT 1""", (VERSION,))
            row = cursor.fetchone()
            if not row:
                return {"state":"NO_SUPPORTED_MONITORING_OUTCOME"}
            completed, fingerprint, cohort = row
            cursor.execute("""UPDATE public.monitoring_state SET
                last_checked_at=%s,current_as_of=%s,next_check_at=%s+make_interval(secs=>
                  coalesce((configuration->>'cadence_seconds')::integer,3600)),
                stale_after=%s+make_interval(secs=>2*coalesce((configuration->>'cadence_seconds')::integer,3600)),
                previous_fingerprint=CASE WHEN current_fingerprint IS DISTINCT FROM %s THEN current_fingerprint ELSE previous_fingerprint END,
                current_fingerprint=%s,last_changed_at=CASE WHEN current_fingerprint IS DISTINCT FROM %s THEN %s ELSE last_changed_at END,
                consecutive_failures=0,last_result='VALIDATED_UNREVIEWED_RESULT',monitoring_status='CURRENT',
                source_state='HEALTHY',next_action='MONITOR'
                WHERE monitoring_class='fl_dos_candidate_filings'
                  AND configuration->>'orchestration_authority'='hermes'""",
                (completed,completed,completed,completed,fingerprint,fingerprint,fingerprint,completed))
    return {"state":"SUPPORTED_MONITORING_CURRENT","cohort":cohort,"fingerprint":fingerprint}
