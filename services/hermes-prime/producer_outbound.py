"""Bounded canonical HERMES -> CivicsLenZz producer assignment delivery.

This module does not create a second scheduler or ledger. It selects one exact,
operator-authorized canonical contract job, leases it through hermes_ops.lease_job,
and delivers HERMES_RESEARCH_JOB_V1 to the registered untrusted producer.
Returned producer evidence still enters through the canonical ingest/receipt
validation path and never directly creates civic truth.
"""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import time
import urllib.error
import urllib.request
import uuid

VERSION = "hermes-producer-outbound-v1"
JOB_CONTRACT = "HERMES_RESEARCH_JOB_V1"
PRODUCER_TARGET = "civicslenzz-gemini-harvester"
CAPABILITY = "advance_research_harvest"
RESEARCH_SCOPE = "FL_DOS_CANDIDATE_FILINGS"
CANONICAL_TARGET_SEAT = "us-fl-governor"
CANONICAL_JURISDICTION = "us-fl"
PRODUCER_JURISDICTION = "jurisdiction_us_fl"
SOURCE_CONSTRAINT = "dos.elections.myflorida.com"
SENDER_ID = "civiclenz-hermes"
WORK_ID = re.compile(r"^work:v1:[0-9a-f]{64}$")


def _uuid(value: object) -> str | None:
    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, TypeError, AttributeError):
        return None


def _secret_from_credential() -> str | None:
    direct = os.environ.get("CIVICLENZ_HARVESTER_SHARED_SECRET", "").strip()
    if direct:
        return direct
    directory = Path(os.environ.get("CREDENTIALS_DIRECTORY", "/nonexistent"))
    for name in ("producer-bridge-secret", "harvester-bridge"):
        path = directory / name
        try:
            text = path.read_text(encoding="utf-8").strip()
        except OSError:
            continue
        if not text:
            continue
        if "\n" not in text and "=" not in text:
            return text
        for line in text.splitlines():
            if line.startswith("CIVICLENZ_HARVESTER_SHARED_SECRET="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def settings() -> dict:
    raw_budget = os.environ.get("HERMES_PRODUCER_OUTBOUND_BUDGET", "1")
    try:
        budget = min(1, max(0, int(raw_budget)))
    except ValueError:
        budget = 0
    endpoint = os.environ.get("HERMES_PRODUCER_ENDPOINT", "").strip()
    exact_job_id = _uuid(os.environ.get("HERMES_PRODUCER_OUTBOUND_JOB_ID"))
    secret = _secret_from_credential()
    enabled = os.environ.get("HERMES_PRODUCER_OUTBOUND") == "true"
    ready = bool(
        enabled and budget == 1 and exact_job_id and secret
        and endpoint.startswith("https://") and endpoint.endswith("/api/harvester/jobs")
    )
    return {
        "enabled": enabled,
        "ready": ready,
        "budget": budget,
        "endpoint": endpoint,
        "exact_job_id": exact_job_id,
        "secret": secret,
    }


def activate_exact_route(cursor, config: dict) -> str | None:
    """Replace only the known capability-gap blocker with the bounded producer route.

    The caller already holds the canonical tick advisory lock. This transition is
    deliberately exact: any drift in job, need, contract, source policy, target,
    blocker, attempt count, or dependency state leaves the row untouched.
    """
    if not config.get("ready") or config.get("budget") != 1 or not config.get("exact_job_id"):
        return None
    cursor.execute("""
        SELECT j.job_id,j.payload,n.need_id,n.state,n.reason,n.basis
        FROM public.jobs j
        JOIN hermes_ops.research_needs n ON n.need_id=j.research_need_id
        JOIN public.research_contracts c ON c.research_contract_id=n.contract_id
          AND c.active AND c.version::text=n.contract_version
        JOIN public.research_contract_fields f ON f.research_contract_id=n.contract_id
          AND f.field_key=n.scope_key
        JOIN public.seats s ON s.seat_id=j.target_id AND j.target_type='seat'
        JOIN public.jurisdictions jur ON jur.jurisdiction_id=s.jurisdiction_id
        WHERE j.job_id=%s
          AND j.job_type='contract_scope_research' AND j.status='queued'
          AND j.attempt_count=0 AND j.max_attempts>=1
          AND j.payload->>'orchestration_authority'='hermes'
          AND j.payload->>'execution_class'='PRODUCTION'
          AND j.payload->>'research_work_identity'=j.dedupe_key
          AND NOT (j.payload ? 'validation_followup')
          AND j.payload->>'dispatch_blocker'='CAPABILITY_NOT_IMPLEMENTED: contract scope requirements'
          AND n.origin='CONTRACT_GAP' AND n.execution_class='PRODUCTION'
          AND n.state='BLOCKED' AND n.reason='CAPABILITY_NOT_IMPLEMENTED: contract scope requirements'
          AND n.scope_key='election_history'
          AND c.contract_key='STATE_GOVERNOR'
          AND f.verification_requirement='official_source'
          AND f.source_priority->>'policy'='florida-election-calendar'
          AND s.seat_key=%s AND jur.jurisdiction_key=%s
          AND NOT EXISTS (
            SELECT 1 FROM hermes_ops.job_dependencies d
            JOIN public.jobs p ON p.job_id=d.prerequisite_job_id
            WHERE d.job_id=j.job_id AND p.status<>'succeeded'
          )
        FOR UPDATE OF j,n SKIP LOCKED
    """, (config["exact_job_id"], CANONICAL_TARGET_SEAT, CANONICAL_JURISDICTION))
    row = cursor.fetchone()
    if not row:
        return None
    route = {
        "version": VERSION,
        "producer_target": PRODUCER_TARGET,
        "capability": CAPABILITY,
        "research_scope": RESEARCH_SCOPE,
        "source_constraint": SOURCE_CONSTRAINT,
        "bounded_job_id": str(row["job_id"]),
        "activated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    payload = dict(row["payload"] or {})
    payload.pop("dispatch_blocker", None)
    payload["producer_outbound_route"] = route
    basis = dict(row["basis"] or {})
    basis.setdefault("producer_outbound_previous_state", row["state"])
    basis.setdefault("producer_outbound_previous_reason", row["reason"])
    basis["producer_outbound_route"] = route
    cursor.execute("""UPDATE public.jobs SET payload=%s::jsonb
        WHERE job_id=%s AND status='queued' AND attempt_count=0
        AND payload->>'dispatch_blocker'='CAPABILITY_NOT_IMPLEMENTED: contract scope requirements'
        RETURNING job_id""", (json.dumps(payload), row["job_id"]))
    if not cursor.fetchone():
        return None
    cursor.execute("""UPDATE hermes_ops.research_needs
        SET state='OPEN',reason=%s,basis=%s::jsonb,evaluated_at=clock_timestamp()
        WHERE need_id=%s AND state='BLOCKED'
          AND reason='CAPABILITY_NOT_IMPLEMENTED: contract scope requirements'
        RETURNING need_id""",
        (f"PRODUCER_OUTBOUND_ROUTE_READY: {RESEARCH_SCOPE}", json.dumps(basis), row["need_id"]))
    return str(row["job_id"]) if cursor.fetchone() else None


def recover_unconfirmed(cursor, config: dict):
    """Renew the exact expired delivery lease once without consuming attempt 2.

    This is only for a delivery that never became durable at the producer and has
    no canonical receipt handoff. The original lease token and attempt_count=1 are
    preserved, so downstream identity remains the same canonical attempt.
    """
    if not config.get("ready") or config.get("budget") != 1 or not config.get("exact_job_id"):
        return None
    cursor.execute("""
        SELECT j.*
        FROM public.jobs j
        JOIN hermes_ops.research_needs n ON n.need_id=j.research_need_id
        WHERE j.job_id=%s
          AND j.status='leased' AND j.attempt_count=1
          AND j.leased_by IS NOT NULL AND j.lease_expires_at<=clock_timestamp()
          AND j.payload->>'orchestration_authority'='hermes'
          AND j.payload->>'execution_class'='PRODUCTION'
          AND j.payload->>'research_work_identity'=j.dedupe_key
          AND j.payload->'producer_outbound_route'->>'version'=%s
          AND j.payload->'producer_outbound_route'->>'bounded_job_id'=j.job_id::text
          AND j.checkpoint->'producer_outbound'->>'version'=%s
          AND j.checkpoint->'producer_outbound'->>'state'='PRODUCER_DELIVERY_UNCONFIRMED'
          AND NOT (j.checkpoint ? 'producer_outbound_recovery')
          AND n.origin='CONTRACT_GAP' AND n.execution_class='PRODUCTION'
          AND n.state='AWAITING_RESULT' AND n.reason='PRODUCER_ASSIGNMENT_LEASE_ACQUIRED'
          AND NOT EXISTS (
            SELECT 1 FROM hermes_ops.research_needs rn
            WHERE rn.origin='PRODUCER' AND rn.execution_class='PRODUCTION'
              AND rn.basis->>'producer_job_id'=j.job_id::text
              AND rn.basis->>'producer_research_work_identity'=j.dedupe_key
          )
        FOR UPDATE OF j,n SKIP LOCKED
    """, (config["exact_job_id"], VERSION, VERSION))
    row = cursor.fetchone()
    if not row:
        return None
    recovery = {
        "version": VERSION,
        "count": 1,
        "attempt_count": 1,
        "renewed_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "reason": "SAME_ATTEMPT_DELIVERY_RECOVERY",
    }
    cursor.execute("""UPDATE public.jobs
        SET lease_expires_at=clock_timestamp()+make_interval(secs=>300),
            checkpoint=coalesce(checkpoint,'{}'::jsonb)||jsonb_build_object('producer_outbound_recovery',%s::jsonb)
        WHERE job_id=%s AND status='leased' AND attempt_count=1 AND leased_by=%s
          AND lease_expires_at<=clock_timestamp()
          AND checkpoint->'producer_outbound'->>'state'='PRODUCER_DELIVERY_UNCONFIRMED'
          AND NOT (checkpoint ? 'producer_outbound_recovery')
        RETURNING *""", (json.dumps(recovery), row["job_id"], row["leased_by"]))
    return cursor.fetchone()


def candidate(cursor, config: dict):
    if not config.get("ready") or config.get("budget") != 1 or not config.get("exact_job_id"):
        return None
    cursor.execute("""
        SELECT j.job_id
        FROM public.jobs j
        JOIN hermes_ops.research_needs n ON n.need_id=j.research_need_id
        JOIN public.research_contracts c ON c.research_contract_id=n.contract_id
          AND c.active AND c.version::text=n.contract_version
        JOIN public.research_contract_fields f ON f.research_contract_id=n.contract_id
          AND f.field_key=n.scope_key
        JOIN public.seats s ON s.seat_id=j.target_id AND j.target_type='seat'
        JOIN public.jurisdictions jur ON jur.jurisdiction_id=s.jurisdiction_id
        WHERE j.job_id=%s
          AND j.job_type='contract_scope_research' AND j.status='queued'
          AND j.attempt_count=0 AND j.max_attempts>=1
          AND j.payload->>'orchestration_authority'='hermes'
          AND j.payload->>'execution_class'='PRODUCTION'
          AND j.payload->>'research_work_identity'=j.dedupe_key
          AND NOT (j.payload ? 'validation_followup')
          AND NOT (j.payload ? 'dispatch_blocker')
          AND j.payload->'producer_outbound_route'->>'version'=%s
          AND j.payload->'producer_outbound_route'->>'bounded_job_id'=j.job_id::text
          AND n.origin='CONTRACT_GAP' AND n.execution_class='PRODUCTION'
          AND n.state='OPEN' AND n.reason=%s
          AND n.scope_key='election_history'
          AND c.contract_key='STATE_GOVERNOR'
          AND f.verification_requirement='official_source'
          AND f.source_priority->>'policy'='florida-election-calendar'
          AND s.seat_key=%s AND jur.jurisdiction_key=%s
          AND NOT EXISTS (
            SELECT 1 FROM hermes_ops.job_dependencies d
            JOIN public.jobs p ON p.job_id=d.prerequisite_job_id
            WHERE d.job_id=j.job_id AND p.status<>'succeeded'
          )
        FOR UPDATE OF j,n SKIP LOCKED
    """, (config["exact_job_id"], VERSION,
          f"PRODUCER_OUTBOUND_ROUTE_READY: {RESEARCH_SCOPE}",
          CANONICAL_TARGET_SEAT, CANONICAL_JURISDICTION))
    return cursor.fetchone()


def reservation_id(job_id: str, attempt_count: int) -> str:
    return str(uuid.uuid5(
        uuid.NAMESPACE_URL,
        f"https://civiclenz.com/hermes/producer-reservations/{job_id}/{attempt_count}",
    ))


def build_assignment(leased: dict) -> dict:
    job_id = _uuid(leased.get("job_id"))
    need_id = _uuid(leased.get("research_need_id"))
    work_identity = leased.get("dedupe_key")
    attempt = leased.get("attempt_count")
    if not job_id or not need_id or not isinstance(work_identity, str) or not WORK_ID.fullmatch(work_identity):
        raise ValueError("invalid canonical producer assignment identity")
    if attempt != 1:
        raise ValueError("bounded producer assignment must be first canonical attempt")
    return {
        "contract_version": JOB_CONTRACT,
        "job_id": job_id,
        "research_work_identity": {
            "work_key": work_identity,
            "jurisdiction_key": PRODUCER_JURISDICTION,
            "research_domain": CAPABILITY,
            "cycle_year": 2026,
        },
        "research_reservation_id": reservation_id(job_id, attempt),
        "producer_target": PRODUCER_TARGET,
        "priority": 1,
        "capability": CAPABILITY,
        "cohort": "FLORIDA_CONTROLLED_INITIAL",
        "jurisdiction": PRODUCER_JURISDICTION,
        "research_scope": RESEARCH_SCOPE,
        "dataset_period": "2026",
        "source_constraints": [SOURCE_CONSTRAINT],
        "attempt": 1,
        "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "trace_id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"https://civiclenz.com/hermes/producer-traces/{job_id}/1")),
        "correlation_id": need_id,
    }


def _body_and_headers(assignment: dict, secret: str, now: int | None = None) -> tuple[bytes, dict]:
    body = json.dumps(assignment, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    timestamp = str(int(time.time() if now is None else now))
    signature = hmac.new(secret.encode("utf-8"), timestamp.encode("utf-8") + b"." + body, hashlib.sha256).hexdigest()
    return body, {
        "Content-Type": "application/json",
        "x-civiclenz-producer-id": SENDER_ID,
        "x-civiclenz-timestamp": timestamp,
        "x-civiclenz-signature": "sha256=" + signature,
    }


def deliver(leased: dict, config: dict, opener=None) -> dict:
    if not config.get("ready") or not config.get("secret"):
        return {"state": "PRODUCER_OUTBOUND_GATED", "job_id": str(leased.get("job_id"))}
    assignment = build_assignment(leased)
    body, headers = _body_and_headers(assignment, config["secret"])
    request = urllib.request.Request(config["endpoint"], data=body, headers=headers, method="POST")
    open_url = opener or urllib.request.urlopen
    try:
        with open_url(request, timeout=15) as response:
            status = getattr(response, "status", 0)
            raw = response.read(64 * 1024)
    except (OSError, urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
        return {"state": "PRODUCER_DELIVERY_UNCONFIRMED", "job_id": assignment["job_id"]}
    if status not in (200, 201):
        return {"state": "PRODUCER_DELIVERY_UNCONFIRMED", "job_id": assignment["job_id"]}
    try:
        acknowledged = json.loads(raw)
    except ValueError:
        return {"state": "PRODUCER_DELIVERY_UNCONFIRMED", "job_id": assignment["job_id"]}
    producer_job = acknowledged.get("job") if isinstance(acknowledged, dict) else None
    checkpoint = producer_job.get("checkpoint") if isinstance(producer_job, dict) else None
    canonical = checkpoint.get("canonical_assignment") if isinstance(checkpoint, dict) else None
    expected_logical = "canonical:" + assignment["research_work_identity"]["work_key"]
    if (acknowledged.get("status") != "SUCCESS"
            or acknowledged.get("storage") != "AUTHORITATIVE_PRODUCER_PERSISTENCE"
            or not isinstance(producer_job, dict)
            or producer_job.get("logical_work_key") != expected_logical
            or not isinstance(canonical, dict)
            or canonical.get("canonical_job_id") != assignment["job_id"]
            or canonical.get("research_scope") != RESEARCH_SCOPE):
        return {"state": "PRODUCER_DELIVERY_UNCONFIRMED", "job_id": assignment["job_id"]}
    return {
        "state": "PRODUCER_ASSIGNMENT_ACCEPTED",
        "job_id": assignment["job_id"],
        "producer_job_id": producer_job.get("job_uuid"),
        "producer_status": producer_job.get("status"),
        "is_new_job": acknowledged.get("is_new_job"),
        "research_reservation_id": assignment["research_reservation_id"],
    }


def record_delivery(cursor, leased: dict, result: dict) -> None:
    payload = {
        "version": VERSION,
        "state": result["state"],
        "producer_target": PRODUCER_TARGET,
        "capability": CAPABILITY,
        "research_scope": RESEARCH_SCOPE,
        "source_constraint": SOURCE_CONSTRAINT,
        "producer_job_id": result.get("producer_job_id"),
        "producer_status": result.get("producer_status"),
        "research_reservation_id": result.get("research_reservation_id"),
        "observed_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    cursor.execute("""UPDATE public.jobs
        SET checkpoint=coalesce(checkpoint,'{}'::jsonb)||jsonb_build_object('producer_outbound',%s::jsonb),
            error_class=CASE WHEN %s='PRODUCER_ASSIGNMENT_ACCEPTED' THEN NULL ELSE 'PRODUCER_DELIVERY_UNCONFIRMED' END,
            error_message=CASE WHEN %s='PRODUCER_ASSIGNMENT_ACCEPTED' THEN NULL ELSE 'Inspect exact bounded producer assignment after lease expiry' END
        WHERE job_id=%s AND leased_by=%s AND status='leased'""",
        (json.dumps(payload), result["state"], result["state"], leased["job_id"], leased["leased_by"]))


def collect(cursor) -> int:
    """Close producer execution only after canonical receipt handoff is durable.

    The contract ResearchNeed stays unresolved. Canonical receipt validation decides
    whether more evidence/identity work is required; this function never promotes truth.
    """
    # Legacy dispatcher unit fixtures intentionally expose only fetchone().
    # Production psycopg2 cursors expose fetchall(); do not perturb old paths.
    if not callable(getattr(cursor, "fetchall", None)):
        return 0
    cursor.execute("""SELECT j.job_id,j.research_need_id,j.dedupe_key,j.leased_by,j.status,
            rn.need_id AS receipt_need_id,rn.target_id AS receipt_id,rn.state AS receipt_need_state,
            rn.reason AS receipt_need_reason,rn.basis AS receipt_basis,
            v.job_id AS validation_job_id,v.status AS validation_job_status
        FROM public.jobs j
        JOIN hermes_ops.research_needs rn
          ON rn.origin='PRODUCER' AND rn.execution_class='PRODUCTION'
          AND rn.basis->>'producer_job_id'=j.job_id::text
          AND rn.basis->>'producer_research_work_identity'=j.dedupe_key
        LEFT JOIN public.jobs v ON v.research_need_id=rn.need_id AND v.job_type='producer_receipt_validate'
        WHERE j.status='leased'
          AND j.checkpoint->'producer_outbound'->>'version'=%s
        FOR UPDATE OF j SKIP LOCKED""", (VERSION,))
    rows = cursor.fetchall()
    for row in rows:
        basis = row["receipt_basis"] or {}
        receipt_id = str(row["receipt_id"])
        validation_done = row["validation_job_status"] == "succeeded"
        final_reason = (row["receipt_need_reason"] if validation_done
                        else "PRODUCER_RECEIPT_ACCEPTED_PENDING_CANONICAL_VALIDATION")
        checkpoint = {
            "producer_receipt_id": receipt_id,
            "producer_receipt_handoff_id": str(row["receipt_need_id"]),
            "producer_validation_job_id": str(row["validation_job_id"]) if row["validation_job_id"] else None,
            "producer_validation_state": row["receipt_need_state"],
            "producer_validation_reason": row["receipt_need_reason"],
            "result_content_hash": basis.get("result_content_hash"),
        }
        cursor.execute("""UPDATE public.jobs SET status='succeeded',completed_at=clock_timestamp(),
            checkpoint=coalesce(checkpoint,'{}'::jsonb)||%s::jsonb,
            leased_by=NULL,lease_expires_at=NULL,error_class=NULL,error_message=NULL
            WHERE job_id=%s AND status='leased' RETURNING job_id""",
            (json.dumps(checkpoint), row["job_id"]))
        if cursor.fetchone():
            cursor.execute("""UPDATE hermes_ops.research_needs SET state=%s,reason=%s,
                evaluated_at=clock_timestamp() WHERE need_id=%s""",
                ("BLOCKED" if validation_done else "AWAITING_RESULT", final_reason, row["research_need_id"]))
    return len(rows)
