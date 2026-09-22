"""HERMES-owned authoritative roster subject factory.

This module creates discovery work from approved source-registry entries and
fans unresolved roster units into Seat/identity research work.  It never
creates Person, Occupancy, verified claim, or publication-eligible state.
"""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import os
import time

from database_bootstrap import connect_database

VERSION = "hermes-authoritative-roster-discovery-v1"
CONTRACT_KEY = "AUTHORITATIVE_ROSTER_DISCOVERY"
SCOPE_KEY = "seat"
IDENTITY_SCOPE_KEY = "identity"
# Roster retrieval and its bounded identity follow-up are generated from a
# durable monitoring obligation.  Keep this aligned with the ResearchNeed
# schema rather than introducing a subject-factory-specific origin.
RESEARCH_NEED_ORIGIN = "MONITORING"

ROSTER_SOURCES = {
    "miami-dade-county-elected-officials": {
        "jurisdiction_key": "us-fl-miami-dade",
        "monitoring_class": "authoritative_official_roster",
        "cadence_seconds": 21600,
        "target": 1,
    },
}


def settings() -> dict:
    enabled = os.environ.get("HERMES_AUTHORITATIVE_ROSTER_DISCOVERY", "false").strip().lower() == "true"
    requested = os.environ.get("HERMES_AUTHORITATIVE_ROSTER_SOURCES", "miami-dade-county-elected-officials")
    sources = [item.strip() for item in requested.split(",") if item.strip()]
    try:
        max_outstanding = min(5, max(1, int(os.environ.get("HERMES_AUTHORITATIVE_ROSTER_MAX_OUTSTANDING", "1"))))
    except ValueError:
        max_outstanding = 1
    return {"enabled": enabled, "sources": sources, "max_outstanding": max_outstanding}


def _digest(payload: dict) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def _work_identity(source_key: str, scope: str, bucket: str) -> tuple[str, str]:
    semantic = {
        "version": 1,
        "orchestrator": "hermes",
        "factory": VERSION,
        "source_key": source_key,
        "scope": scope,
        "bucket": bucket,
    }
    digest = _digest(semantic)
    return "need:v1:" + digest, "work:v1:" + digest


def _unit_identity(unit_id: str, seat_id: str, scope: str) -> tuple[str, str]:
    semantic = {
        "version": 1,
        "orchestrator": "hermes",
        "factory": VERSION,
        "roster_unit_id": str(unit_id),
        "seat_id": str(seat_id),
        "scope": scope,
    }
    digest = _digest(semantic)
    return "need:v1:" + digest, "work:v1:" + digest


def _bucket(cadence_seconds: int) -> str:
    value = int(datetime.now(timezone.utc).timestamp()) // cadence_seconds
    return f"{cadence_seconds}s-{value}"


def reconcile() -> dict:
    config = settings()
    if not config["enabled"]:
        return {"state": "AUTHORITATIVE_ROSTER_DISCOVERY_DISABLED", "created": 0}
    created = 0
    inspected = 0
    blockers: list[dict] = []
    with connect_database() as connection:
        with connection, connection.cursor() as cursor:
            cursor.execute("SELECT pg_try_advisory_xact_lock(184913,13)")
            if not cursor.fetchone()[0]:
                return {"state": "ANOTHER_AUTHORITATIVE_ROSTER_TICK_ACTIVE", "created": 0}
            for source_key in config["sources"]:
                source_config = ROSTER_SOURCES.get(source_key)
                if not source_config:
                    blockers.append({"source_key": source_key, "reason": "SOURCE_FACTORY_CONFIG_MISSING"})
                    continue
                inspected += 1
                cursor.execute("""SELECT src.source_id,src.source_url,src.authority_tier,
                         coalesce(src.jurisdiction_id,j.jurisdiction_id) AS jurisdiction_id,
                         c.research_contract_id,c.version,f.research_contract_field_id
                    FROM public.sources src
                    JOIN public.jurisdictions j ON j.jurisdiction_key=%s
                    JOIN public.research_contracts c ON c.contract_key=%s AND c.active
                    JOIN public.research_contract_fields f ON f.research_contract_id=c.research_contract_id
                      AND f.field_key=%s
                    WHERE src.source_key=%s AND src.active
                      AND src.authority_tier='TIER_1_PRIMARY_OFFICIAL'
                      AND src.source_url LIKE 'https://%%'
                      AND %s=ANY(string_to_array(replace(f.source_priority->>'policy',' ',''),','))""",
                    (source_config["jurisdiction_key"], CONTRACT_KEY, SCOPE_KEY, source_key, source_key))
                row = cursor.fetchone()
                if not row:
                    blockers.append({"source_key": source_key, "reason": "AUTHORITATIVE_ROSTER_DEPENDENCY_MISSING"})
                    continue
                source_id, _, _, jurisdiction_id, contract_id, version, field_id = row
                cadence = int(source_config["cadence_seconds"])
                bucket = _bucket(cadence)
                need_key, work_key = _work_identity(source_key, SCOPE_KEY, bucket)
                cursor.execute("""INSERT INTO public.monitoring_state
                    (target_type,target_id,active,monitoring_class,next_check_at,configuration,
                     source_id,monitoring_status,source_state,next_action)
                    VALUES('source',%s,true,%s,clock_timestamp(),%s::jsonb,
                           %s,'DUE','UNKNOWN','CREATE_AUTHORITATIVE_ROSTER_WORK')
                    ON CONFLICT(target_type,target_id,monitoring_class) DO UPDATE SET
                      active=true,
                      next_check_at=least(public.monitoring_state.next_check_at, EXCLUDED.next_check_at),
                      configuration=EXCLUDED.configuration,
                      source_id=EXCLUDED.source_id,
                      monitoring_status='DUE',
                      next_action='CREATE_AUTHORITATIVE_ROSTER_WORK',
                      updated_at=clock_timestamp()""",
                    (source_id, source_config["monitoring_class"], json.dumps({
                        "orchestration_authority": "hermes",
                        "version": VERSION,
                        "source_key": source_key,
                        "scope_key": SCOPE_KEY,
                        "cadence_seconds": cadence,
                        "truth_authority": False,
                        "publication_authority": False,
                    }), source_id))
                cursor.execute("""SELECT count(*) FROM public.jobs
                    WHERE status IN ('queued','leased','running')
                      AND payload->>'authoritative_roster_discovery_version'=%s
                      AND payload->>'source_key'=%s""", (VERSION, source_key))
                if int(cursor.fetchone()[0]) >= config["max_outstanding"]:
                    continue
                basis = {
                    "rule": "authoritative_roster_source_factory_v1",
                    "source_id": str(source_id),
                    "source_key": source_key,
                    "contract_field_id": str(field_id),
                    "bucket": bucket,
                    "truth_authority": False,
                    "publication_authority": False,
                    "identity_authority": False,
                }
                cursor.execute("""INSERT INTO hermes_ops.research_needs
                    (need_key,contract_id,contract_version,target_type,target_id,scope_key,origin,
                     execution_class,state,reason,basis,priority)
                    VALUES(%s,%s,%s,'jurisdiction',%s,%s,%s,'PRODUCTION','OPEN',
                      'AUTHORITATIVE_ROSTER_RETRIEVAL_READY',%s::jsonb,15)
                    ON CONFLICT(need_key) DO NOTHING RETURNING need_id""",
                    (need_key, contract_id, str(version), jurisdiction_id, SCOPE_KEY,
                     RESEARCH_NEED_ORIGIN, json.dumps(basis)))
                need = cursor.fetchone()
                if not need:
                    continue
                payload = {
                    "orchestration_authority": "hermes",
                    "execution_class": "PRODUCTION",
                    "research_work_identity": work_key,
                    "scope_key": SCOPE_KEY,
                    "contract_id": str(contract_id),
                    "contract_version": str(version),
                    "authoritative_roster_discovery_version": VERSION,
                    "source_key": source_key,
                    "classification_ceiling": "extracted_unreviewed",
                    "verification_allowed": False,
                    "publication_allowed": False,
                    "identity_authority": False,
                    "dispatch_blocker": "CAPABILITY_NOT_IMPLEMENTED",
                }
                cursor.execute("""INSERT INTO public.jobs
                    (job_type,target_type,target_id,source_id,priority,status,attempt_count,
                     max_attempts,dedupe_key,payload,research_need_id)
                    VALUES('contract_scope_research','jurisdiction',%s,%s,15,'queued',0,2,%s,%s::jsonb,%s)
                    ON CONFLICT(dedupe_key) DO NOTHING RETURNING job_id""",
                    (jurisdiction_id, source_id, work_key, json.dumps(payload), need[0]))
                if cursor.fetchone():
                    created += 1
    return {
        "state": "AUTHORITATIVE_ROSTER_WORK_CREATED" if created else "AUTHORITATIVE_ROSTER_NO_NEW_WORK",
        "created": created,
        "inspected": inspected,
        "blockers": blockers,
        "observed_at": time.time(),
    }


def plan_downstream(cursor, job: dict, result: dict) -> dict:
    extraction_run_id = result.get("extraction_run_id")
    if not extraction_run_id or result.get("roster_units_extracted", 0) < 1:
        return {"state": "NO_ROSTER_EXTRACTION_RESULT", "created": 0}
    cursor.execute("""SELECT u.roster_unit_id,u.unit_key,u.source_id,u.jurisdiction_id,
             u.office_title,u.office_kind,u.district_number,u.display_name,u.payload,u.content_hash
        FROM public.unresolved_roster_units u
        WHERE u.extraction_worker_run_id=%s AND u.review_state='UNRESOLVED'
        ORDER BY u.locator LIMIT 100""", (extraction_run_id,))
    units = cursor.fetchall()
    created = 0
    seats_created = 0
    seats_reused = 0
    for unit in units:
        payload = unit["payload"] or {}
        seat_key = payload.get("seat_key")
        if not seat_key:
            continue
        cursor.execute("""INSERT INTO public.seats
            (seat_key,seat_name,office_type,government_level,branch,jurisdiction_id,
             district_number,occupancy_status,research_contract_key,baseline_status,monitoring_active)
            VALUES(%s,%s,%s,%s,%s,%s,%s,'unknown',%s,'discovered_unreviewed',false)
            ON CONFLICT(seat_key) DO NOTHING
            RETURNING seat_id,true AS inserted""",
            (seat_key, unit["office_title"], unit["office_kind"],
             payload.get("government_level", "county"), payload.get("branch"),
             unit["jurisdiction_id"], unit["district_number"], CONTRACT_KEY))
        seat = cursor.fetchone()
        if seat:
            seats_created += 1
        else:
            cursor.execute("SELECT seat_id,false AS inserted FROM public.seats WHERE seat_key=%s", (seat_key,))
            seat = cursor.fetchone()
            if not seat:
                continue
            seats_reused += 1
        cursor.execute("""UPDATE public.unresolved_roster_units
            SET seat_id=%s,review_state='NEEDS_IDENTITY_RESEARCH',updated_at=clock_timestamp()
            WHERE roster_unit_id=%s""", (seat["seat_id"], unit["roster_unit_id"]))
        cursor.execute("""SELECT c.research_contract_id,c.version,f.research_contract_field_id
            FROM public.research_contracts c
            JOIN public.research_contract_fields f ON f.research_contract_id=c.research_contract_id
             AND f.field_key=%s
            WHERE c.contract_key=%s AND c.active
              AND %s=ANY(string_to_array(replace(f.source_priority->>'policy',' ',''),','))""",
            (IDENTITY_SCOPE_KEY, CONTRACT_KEY, job["payload"]["source_key"]))
        contract = cursor.fetchone()
        if not contract:
            continue
        need_key, work_key = _unit_identity(unit["roster_unit_id"], seat["seat_id"], IDENTITY_SCOPE_KEY)
        basis = {
            "rule": "authoritative_roster_identity_followup_v1",
            "roster_unit_id": str(unit["roster_unit_id"]),
            "source_id": str(unit["source_id"]),
            "source_key": job["payload"]["source_key"],
            "content_hash": unit["content_hash"],
            "truth_authority": False,
            "publication_authority": False,
            "identity_authority": False,
        }
        cursor.execute("""INSERT INTO hermes_ops.research_needs
            (need_key,contract_id,contract_version,target_type,target_id,scope_key,origin,
             execution_class,state,reason,basis,priority)
            VALUES(%s,%s,%s,'seat',%s,%s,%s,'PRODUCTION','OPEN',
              'AUTHORITATIVE_ROSTER_IDENTITY_RESEARCH_READY',%s::jsonb,16)
            ON CONFLICT(need_key) DO NOTHING RETURNING need_id""",
            (need_key, contract["research_contract_id"], str(contract["version"]),
             seat["seat_id"], IDENTITY_SCOPE_KEY, RESEARCH_NEED_ORIGIN,
             json.dumps(basis)))
        need = cursor.fetchone()
        if not need:
            continue
        downstream_payload = {
            "orchestration_authority": "hermes",
            "execution_class": "PRODUCTION",
            "research_work_identity": work_key,
            "parent_research_work_identity": job["dedupe_key"],
            "scope_key": IDENTITY_SCOPE_KEY,
            "contract_id": str(contract["research_contract_id"]),
            "contract_version": str(contract["version"]),
            "authoritative_roster_discovery_version": VERSION,
            "source_key": job["payload"]["source_key"],
            "roster_unit_id": str(unit["roster_unit_id"]),
            "classification_ceiling": "extracted_unreviewed",
            "verification_allowed": False,
            "publication_allowed": False,
            "identity_authority": False,
            "dispatch_blocker": "CAPABILITY_NOT_IMPLEMENTED",
        }
        cursor.execute("""INSERT INTO public.jobs
            (job_type,target_type,target_id,seat_id,source_id,priority,status,attempt_count,
             max_attempts,dedupe_key,payload,research_need_id)
            VALUES('contract_scope_research','seat',%s,%s,%s,16,'queued',0,2,%s,%s::jsonb,%s)
            ON CONFLICT(dedupe_key) DO NOTHING RETURNING job_id""",
            (seat["seat_id"], seat["seat_id"], unit["source_id"], work_key,
             json.dumps(downstream_payload), need[0]))
        if cursor.fetchone():
            created += 1
    return {
        "state": "AUTHORITATIVE_ROSTER_DOWNSTREAM_PLANNED" if created else "AUTHORITATIVE_ROSTER_DOWNSTREAM_PRESENT",
        "created": created,
        "units": len(units),
        "seats_created": seats_created,
        "seats_reused": seats_reused,
    }
