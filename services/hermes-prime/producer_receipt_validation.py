"""Local HERMES validation for durable producer receipts.

This capability deliberately does not create or promote civic truth. It reuses
HERMES's existing lease authority, independently re-validates the dispatched
receipt/evidence lineage, records one deterministic operational worker run, and
leaves unresolved identity/currentness/contradiction questions explicit.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
import uuid

import producer_receipt_dispatch as receipt_dispatch

VERSION = "hermes-producer-receipt-validation-v1"
WORKER_KEY = "hermes.local.producer_receipt_validation"
CAPABILITY = "producer_receipt_identity_evidence_validation"
ROUTE_REASON = "PRODUCER_RECEIPT_VALIDATION_ROUTE_RESOLVED"
ALLOWED_DISPOSITIONS = {
    "NEEDS_IDENTITY_RESOLUTION",
    "NEEDS_MORE_EVIDENCE",
    "NEEDS_CURRENTNESS_REVIEW",
    "CONTRADICTION_REVIEW_REQUIRED",
    "ACCEPTED_FOR_FURTHER_VALIDATION",
}


def connect_database():
    from database_bootstrap import connect_database as connect
    return connect()


def _real_dict_cursor():
    from psycopg2.extras import RealDictCursor
    return RealDictCursor


def settings() -> dict:
    try:
        budget = min(1, max(0, int(os.environ.get("HERMES_PRODUCER_RECEIPT_VALIDATION_BUDGET", "0"))))
    except ValueError:
        budget = 0
    raw_receipt = os.environ.get("HERMES_PRODUCER_RECEIPT_VALIDATION_RECEIPT_ID", "")
    try:
        receipt_id = str(uuid.UUID(raw_receipt)) if raw_receipt else None
    except (ValueError, TypeError, AttributeError):
        receipt_id = None
    queue_selection = os.environ.get("HERMES_PRODUCER_RECEIPT_VALIDATION_SELECTION", "exact_receipt") == "bounded_queue"
    return {
        "enabled": os.environ.get("HERMES_PRODUCER_RECEIPT_VALIDATION") == "true",
        "budget": budget,
        "receipt_id": None if queue_selection else receipt_id,
        "queue_selection": queue_selection,
        "spool": Path(os.environ.get("HERMES_INGEST_SPOOL_DIRECTORY", "/var/lib/civiclenz/hermes-ingest")),
        "registry": Path(os.environ.get(
            "HERMES_INGEST_PRODUCER_REGISTRY",
            str(Path(__file__).resolve().parents[2] / "config/producers/registry.json"),
        )),
    }


def _uuid5(name: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, name))


def _parse_time(value: object) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo is not None else None


def _receipt_path(config: dict, receipt_id: str) -> Path:
    return config["spool"] / "receipts" / f"{receipt_id}.json"


def _validate_dispatched_receipt(path: Path, registry: dict, job: dict) -> tuple[dict, dict]:
    receipt = receipt_dispatch.load_receipt(path)
    if receipt.get("dispatch_state") != "DISPATCHED":
        raise receipt_dispatch.ReceiptRejected("RECEIPT_NOT_DISPATCHED")
    attempts = receipt.get("dispatch_attempts")
    if isinstance(attempts, bool) or not isinstance(attempts, int) or attempts < 1:
        raise receipt_dispatch.ReceiptRejected("DISPATCH_ATTEMPTS_INVALID")

    # Reuse the exact ingress integrity/policy checks without weakening the
    # dispatch path's accepted state machine. The adaptation is in-memory only.
    probe = dict(receipt)
    probe["dispatch_state"] = "PENDING_CANONICAL_DISPATCH"
    lineage = receipt_dispatch.validate_receipt(probe, path, registry)

    handoff = receipt.get("canonical_handoff")
    if not isinstance(handoff, dict):
        raise receipt_dispatch.ReceiptRejected("CANONICAL_HANDOFF_MISSING")
    if (handoff.get("version") != receipt_dispatch.VERSION
            or handoff.get("handoff_id") != lineage["handoff_id"]
            or handoff.get("job_id") != lineage["validation_job_id"]
            or handoff.get("job_type") != receipt_dispatch.JOB_TYPE
            or handoff.get("validation_state") != receipt_dispatch.VALIDATION_STATE):
        raise receipt_dispatch.ReceiptRejected("CANONICAL_HANDOFF_MISMATCH")

    payload = job.get("payload") or {}
    route = payload.get("capability_route") or {}
    if (str(job.get("job_id")) != lineage["validation_job_id"]
            or job.get("job_type") != receipt_dispatch.JOB_TYPE
            or job.get("target_type") != "producer_receipt"
            or str(job.get("target_id")) != lineage["receipt_id"]
            or str(job.get("research_need_id")) != lineage["handoff_id"]
            or job.get("dedupe_key") != lineage["work_identity"]
            or payload.get("research_work_identity") != lineage["work_identity"]
            or payload.get("canonical_receipt_id") != lineage["receipt_id"]
            or payload.get("canonical_handoff_id") != lineage["handoff_id"]
            or payload.get("result_content_hash") != lineage["result_content_hash"]
            or payload.get("classification") != "extracted_unreviewed"
            or payload.get("publication_allowed") is not False
            or payload.get("orchestration_authority") != "hermes"
            or payload.get("execution_class") != "PRODUCTION"
            or route.get("version") != VERSION
            or route.get("capability") != CAPABILITY
            or route.get("worker") != WORKER_KEY
            or route.get("receipt_id") != lineage["receipt_id"]):
        raise receipt_dispatch.ReceiptRejected("CANONICAL_VALIDATION_JOB_MISMATCH")

    envelope = receipt.get("envelope") or {}
    claims = envelope.get("claims")
    if not isinstance(claims, list):
        raise receipt_dispatch.ReceiptRejected("CLAIMS_INVALID")
    sources = envelope.get("sources") or []
    retrievals = envelope.get("retrievals") or []
    evidence = envelope.get("evidence") or []

    source_by_key: dict[str, dict] = {}
    for source in sources:
        key = source.get("source_key") if isinstance(source, dict) else None
        url = source.get("source_url") if isinstance(source, dict) else None
        if not isinstance(key, str) or not key or not isinstance(url, str) or not url or key in source_by_key:
            raise receipt_dispatch.ReceiptRejected("SOURCE_PROVENANCE_INVALID")
        source_by_key[key] = source

    normalized_retrievals = []
    for retrieval in retrievals:
        if not isinstance(retrieval, dict):
            raise receipt_dispatch.ReceiptRejected("SOURCE_PROVENANCE_INVALID")
        key = retrieval.get("source_key")
        source_url = retrieval.get("source_url")
        content_hash = retrieval.get("content_hash")
        byte_length = retrieval.get("byte_length")
        if (key not in source_by_key or not isinstance(source_url, str) or not source_url
                or not isinstance(content_hash, str) or not receipt_dispatch.SHA256.fullmatch(content_hash)
                or isinstance(byte_length, bool) or not isinstance(byte_length, int) or byte_length <= 0):
            raise receipt_dispatch.ReceiptRejected("RETRIEVAL_LINEAGE_INVALID")
        normalized_retrievals.append((source_url, content_hash, byte_length))

    for item in evidence:
        if not isinstance(item, dict):
            raise receipt_dispatch.ReceiptRejected("EVIDENCE_LINEAGE_INCOMPLETE")
        expected = (item.get("source_url"), item.get("sha256"), item.get("byte_length"))
        if expected not in normalized_retrievals:
            raise receipt_dispatch.ReceiptRejected("EVIDENCE_RETRIEVAL_LINEAGE_MISMATCH")

    return receipt, lineage


def _source_provenance(cursor, sources: list[dict]) -> list[dict]:
    result = []
    for source in sources:
        key, url = source.get("source_key"), source.get("source_url")
        cursor.execute("""SELECT source_id,source_key,source_url,active,authority_tier FROM public.sources
            WHERE active AND (source_key=%s OR source_url=%s) ORDER BY source_id LIMIT 20""", (key, url))
        rows = cursor.fetchall()
        exact = [row for row in rows if row["source_key"] == key and row["source_url"] == url]
        if len(exact) == 1:
            state = "REGISTERED_EXACT"
            canonical_source_id = str(exact[0]["source_id"])
            canonical_authority_tier = exact[0].get("authority_tier")
        elif len(exact) > 1:
            state = "AMBIGUOUS_CANONICAL_REGISTRATION"
            canonical_source_id = None
            canonical_authority_tier = None
        elif rows:
            state = "CANONICAL_REGISTRATION_MISMATCH"
            canonical_source_id = None
            canonical_authority_tier = None
        else:
            state = "MISSING_CANONICAL_REGISTRATION"
            canonical_source_id = None
            canonical_authority_tier = None
        result.append({
            "source_key": key,
            "source_url": url,
            "producer_authority_tier": source.get("authority_tier"),
            "canonical_registration": state,
            "canonical_source_id": canonical_source_id,
            "canonical_authority_tier": canonical_authority_tier,
        })
    return result


def _evaluate(cursor, receipt: dict, lineage: dict, job: dict, started_at: datetime) -> dict:
    envelope = receipt["envelope"]
    sources = envelope.get("sources", [])
    source_provenance = _source_provenance(cursor, sources)
    source_registered = bool(source_provenance) and all(
        item["canonical_registration"] == "REGISTERED_EXACT" for item in source_provenance
    )

    entities = envelope["entities"]
    subject_counts = {key: len(entities[key]) for key in receipt_dispatch.ENTITY_SETS}
    candidate_count = sum(subject_counts.values())
    claims_count = len(envelope.get("claims", []))
    if candidate_count == 0:
        identity = {
            "state": "NO_CANONICAL_SUBJECT_SUBMITTED",
            "resolved": False,
            "candidate_count": 0,
            "reason": "Producer submitted no entity candidate; no subject may be fabricated from evidence or names",
        }
    else:
        identity = {
            "state": "NEEDS_IDENTITY_RESOLUTION",
            "resolved": False,
            "candidate_count": candidate_count,
            "reason": "Producer candidates remain unreviewed; names and canonical_id_hint values are not identity proof",
        }

    currentness = envelope.get("currentness") if isinstance(envelope.get("currentness"), dict) else {}
    current_as_of = _parse_time(currentness.get("current_as_of"))
    receipt_received = _parse_time(receipt.get("received_at"))
    retrieval_times = [_parse_time(item.get("retrieved_at")) for item in envelope.get("retrievals", [])]
    temporal_valid = bool(current_as_of and receipt_received and all(retrieval_times))
    if temporal_valid:
        temporal_valid = current_as_of <= receipt_received and all(value <= receipt_received for value in retrieval_times if value)
    currentness_assessment = {
        "state": ("OBSERVATION_TIME_COHERENT_SUBJECT_CURRENTNESS_UNRESOLVED"
                  if temporal_valid else "NEEDS_CURRENTNESS_REVIEW"),
        "current_as_of": currentness.get("current_as_of"),
        "receipt_received_at": receipt.get("received_at"),
        "observation_time_valid": temporal_valid,
        "tenure_effective_period_established": False,
        "reason": "Observation/retrieval time does not establish a subject's legal or office-effective period",
    }

    contradiction = {
        "state": ("NOT_EVALUATED_NO_CANONICAL_SUBJECT" if candidate_count == 0
                  else "NOT_EVALUATED_IDENTITY_UNRESOLVED"),
        "resolved": False,
        "reason": "Contradiction reconciliation requires a canonical subject and claim context",
    }
    contract = {
        "interchange_contract": receipt_dispatch.CONTRACT_VERSION,
        "interchange_contract_valid": True,
        "subject_contract_state": ("NOT_APPLICABLE_NO_CANONICAL_SUBJECT" if candidate_count == 0
                                   else "NOT_EVALUATED_IDENTITY_UNRESOLVED"),
        "canonical_research_contract_satisfied": False,
    }

    if not source_registered or candidate_count == 0 or claims_count == 0:
        disposition = "NEEDS_MORE_EVIDENCE"
    elif not temporal_valid:
        disposition = "NEEDS_CURRENTNESS_REVIEW"
    else:
        disposition = "NEEDS_IDENTITY_RESOLUTION"

    evidence_summary = [{
        "evidence_key": item["evidence_key"],
        "sha256": item["sha256"],
        "byte_length": item["byte_length"],
        "source_url": item.get("source_url"),
        "integrity_state": item["integrity_state"],
    } for item in lineage["evidence"]]
    attempt_token = job["leased_by"]
    evaluation_id = _uuid5(
        f"https://civiclenz.com/hermes/producer-receipts/{lineage['receipt_id']}/validation/"
        f"{job['job_id']}/{attempt_token}/{VERSION}"
    )
    completed_at = datetime.now(timezone.utc)
    if completed_at < started_at:
        completed_at = started_at
    return {
        "validation_version": VERSION,
        "validation_evaluation_id": evaluation_id,
        "job_id": str(job["job_id"]),
        "research_need_id": str(job["research_need_id"]),
        "canonical_receipt_id": lineage["receipt_id"],
        "canonical_handoff_id": lineage["handoff_id"],
        "research_work_identity": lineage["work_identity"],
        "attempt_token": attempt_token,
        "attempt_count": int(job["attempt_count"]),
        "producer_id": lineage["producer_id"],
        "producer_version": lineage["producer_version"],
        "producer_job_id": lineage["producer_job_id"],
        "producer_research_work_identity": lineage["producer_research_work_identity"],
        "result_content_hash": lineage["result_content_hash"],
        "classification": "extracted_unreviewed",
        "evidence_integrity": "PASS",
        "evidence": evidence_summary,
        "source_provenance": source_provenance,
        "identity_disposition": identity,
        "currentness_disposition": currentness_assessment,
        "contradiction_disposition": contradiction,
        "research_contract_disposition": contract,
        "subject_candidate_counts": subject_counts,
        "producer_claim_count": claims_count,
        "validation_disposition": disposition,
        "verification_allowed": False,
        "publication_allowed": False,
        "person_creation_allowed": False,
        "occupancy_creation_allowed": False,
        "started_at": started_at.isoformat().replace("+00:00", "Z"),
        "completed_at": completed_at.isoformat().replace("+00:00", "Z"),
    }


def _result_valid(job: dict, run: dict) -> bool:
    metadata = run.get("metadata") or {}
    if (run.get("worker_key") != WORKER_KEY or run.get("status") != "succeeded"
            or metadata.get("validation_version") != VERSION
            or metadata.get("job_id") != str(job["job_id"])
            or metadata.get("research_need_id") != str(job["research_need_id"])
            or metadata.get("canonical_receipt_id") != job["payload"].get("canonical_receipt_id")
            or metadata.get("canonical_handoff_id") != job["payload"].get("canonical_handoff_id")
            or metadata.get("research_work_identity") != job["dedupe_key"]
            or metadata.get("attempt_token") != job["leased_by"]
            or metadata.get("result_content_hash") != job["payload"].get("result_content_hash")
            or metadata.get("validation_disposition") not in ALLOWED_DISPOSITIONS
            or metadata.get("evidence_integrity") != "PASS"
            or metadata.get("verification_allowed") is not False
            or metadata.get("publication_allowed") is not False
            or metadata.get("person_creation_allowed") is not False
            or metadata.get("occupancy_creation_allowed") is not False):
        return False
    expected_evaluation = _uuid5(
        f"https://civiclenz.com/hermes/producer-receipts/{metadata['canonical_receipt_id']}/validation/"
        f"{job['job_id']}/{job['leased_by']}/{VERSION}"
    )
    return metadata.get("validation_evaluation_id") == expected_evaluation


def collect(cursor) -> None:
    cursor.execute("""SELECT j.*,clock_timestamp()>=j.lease_expires_at AS expired FROM public.jobs j
        WHERE j.status='leased' AND j.job_type=%s
        AND j.payload->>'orchestration_authority'='hermes'
        AND j.payload->>'execution_class'='PRODUCTION'
        AND j.payload->'capability_route'->>'version'=%s FOR UPDATE SKIP LOCKED""",
        (receipt_dispatch.JOB_TYPE, VERSION))
    for job in cursor.fetchall():
        cursor.execute("""SELECT * FROM public.worker_runs WHERE job_id=%s AND worker_key=%s
            AND metadata->>'attempt_token'=%s ORDER BY started_at DESC LIMIT 1""",
            (job["job_id"], WORKER_KEY, job["leased_by"]))
        run = cursor.fetchone()
        if run and _result_valid(job, run) and not job["expired"]:
            metadata = run["metadata"]
            checkpoint = {
                "worker_run_id": str(run["worker_run_id"]),
                "validation_evaluation_id": metadata["validation_evaluation_id"],
                "validation_disposition": metadata["validation_disposition"],
                "identity_disposition": metadata["identity_disposition"],
                "currentness_disposition": metadata["currentness_disposition"],
                "contradiction_disposition": metadata["contradiction_disposition"],
                "research_contract_disposition": metadata["research_contract_disposition"],
                "source_provenance": metadata["source_provenance"],
                "independent_validation_acknowledgement": "HERMES_PRODUCER_RECEIPT_RESULT_ACCEPTED",
            }
            cursor.execute("""UPDATE public.jobs SET status='succeeded',completed_at=clock_timestamp(),
                leased_by=NULL,lease_expires_at=NULL,error_class=NULL,error_message=NULL,
                checkpoint=coalesce(checkpoint,'{}'::jsonb)||%s::jsonb
                WHERE job_id=%s AND leased_by=%s AND lease_expires_at>clock_timestamp() RETURNING job_id""",
                (json.dumps(checkpoint), job["job_id"], job["leased_by"]))
            if cursor.fetchone():
                summary = {
                    "version": VERSION,
                    "worker_run_id": str(run["worker_run_id"]),
                    "validation_evaluation_id": metadata["validation_evaluation_id"],
                    "validation_disposition": metadata["validation_disposition"],
                    "identity_disposition": metadata["identity_disposition"],
                    "currentness_disposition": metadata["currentness_disposition"],
                    "contradiction_disposition": metadata["contradiction_disposition"],
                    "research_contract_disposition": metadata["research_contract_disposition"],
                    "source_provenance": metadata["source_provenance"],
                    "publication_allowed": False,
                }
                reason = "PRODUCER_RECEIPT_VALIDATED_" + metadata["validation_disposition"]
                cursor.execute("""UPDATE hermes_ops.research_needs SET state='BLOCKED',reason=%s,
                    basis=basis||%s::jsonb,evaluated_at=clock_timestamp() WHERE need_id=%s""",
                    (reason, json.dumps({"producer_receipt_validation": summary}), job["research_need_id"]))
        elif job["expired"] or (run and run.get("status") == "failed"):
            reason = (run.get("error_class") if run and run.get("error_class") else "PRODUCER_RECEIPT_VALIDATION_LEASE_EXPIRED")
            cursor.execute("""UPDATE public.jobs SET status='dead_letter',leased_by=NULL,lease_expires_at=NULL,
                error_class=%s,error_message='Producer receipt validation failed closed; inspect worker_runs'
                WHERE job_id=%s AND leased_by=%s""", (reason, job["job_id"], job["leased_by"]))
            cursor.execute("""UPDATE hermes_ops.research_needs SET state='BLOCKED',reason=%s,
                evaluated_at=clock_timestamp() WHERE need_id=%s""",
                ("PRODUCER_RECEIPT_VALIDATION_FAILED: " + reason, job["research_need_id"]))


def _attempt_budget_allows(config: dict, job_attempt_count: int, cumulative_attempts: int) -> bool:
    # The one-unit budget fences new receipt-validation work. A retry of the
    # same already-created validation job is governed by that job's max_attempts
    # and must not be blocked merely because attempt 1 is part of history.
    if job_attempt_count > 0:
        return True
    return cumulative_attempts < int(config.get("budget", 0))


def candidate(cursor) -> dict | None:
    config = settings()
    if (not config["enabled"] or config["budget"] < 1
            or (not config["receipt_id"] and not config["queue_selection"])):
        return None
    cursor.execute("""SELECT row_to_json(j) AS job,row_to_json(n) AS need FROM public.jobs j
        JOIN hermes_ops.research_needs n ON n.need_id=j.research_need_id
        WHERE j.job_type=%s AND j.status='queued' AND j.attempt_count<j.max_attempts
        AND (%s::uuid IS NULL OR j.payload->>'canonical_receipt_id'=%s::text)
        AND j.payload->>'orchestration_authority'='hermes' AND j.payload->>'execution_class'='PRODUCTION'
        AND j.dedupe_key=j.payload->>'research_work_identity'
        AND n.origin='PRODUCER' AND n.execution_class='PRODUCTION' AND n.scope_key='canonical_validation'
        AND n.target_type='producer_receipt' AND n.target_id=j.target_id
        AND ((n.state='BLOCKED' AND n.reason=%s AND j.payload->>'dispatch_blocker'=%s)
          OR (n.state='OPEN' AND j.payload->'capability_route'->>'version'=%s))
        ORDER BY j.created_at LIMIT 1 FOR UPDATE OF j,n SKIP LOCKED""",
        (receipt_dispatch.JOB_TYPE, config["receipt_id"], config["receipt_id"], receipt_dispatch.CAPABILITY_GAP,
         receipt_dispatch.CAPABILITY_GAP, VERSION))
    row = cursor.fetchone()
    if not row:
        return None
    job, need = row["job"], row["need"]
    payload = dict(job["payload"])
    if payload.get("dispatch_blocker") not in (None, receipt_dispatch.CAPABILITY_GAP):
        return None
    route = {
        "version": VERSION,
        "capability": CAPABILITY,
        "worker": WORKER_KEY,
        "runtime": "local",
        "receipt_id": payload.get("canonical_receipt_id"),
        "research_need_id": str(job["research_need_id"]),
        "max_concurrency": 1,
    }
    payload["capability_route"] = route
    payload.pop("dispatch_blocker", None)
    cursor.execute("UPDATE public.jobs SET payload=%s::jsonb WHERE job_id=%s", (json.dumps(payload), job["job_id"]))
    if need["state"] == "BLOCKED":
        cursor.execute("""UPDATE hermes_ops.research_needs SET state='OPEN',reason=%s,
            basis=basis||%s::jsonb,evaluated_at=clock_timestamp() WHERE need_id=%s""",
            (ROUTE_REASON, json.dumps({"producer_receipt_validation_route": route}), job["research_need_id"]))

    cursor.execute("""SELECT coalesce(sum(attempt_count),0) AS attempts FROM public.jobs
        WHERE job_type=%s AND payload->>'canonical_receipt_id'=%s""",
        (receipt_dispatch.JOB_TYPE, payload.get("canonical_receipt_id")))
    cumulative_attempts = int(cursor.fetchone()["attempts"])
    if not _attempt_budget_allows(config, int(job.get("attempt_count") or 0), cumulative_attempts):
        return None
    cursor.execute("""SELECT j.job_id FROM public.jobs j JOIN hermes_ops.research_needs n ON n.need_id=j.research_need_id
        WHERE j.job_id=%s AND j.status='queued' AND j.attempt_count<j.max_attempts
        AND n.state='OPEN' AND n.origin='PRODUCER' AND n.execution_class='PRODUCTION'
        AND j.payload->'capability_route'->>'version'=%s AND NOT (j.payload ? 'dispatch_blocker')
        AND (j.scheduled_for IS NULL OR j.scheduled_for<=clock_timestamp())
        AND NOT EXISTS(SELECT 1 FROM public.jobs a WHERE a.status='leased'
          AND a.lease_expires_at>clock_timestamp() AND a.payload->>'orchestration_authority'='hermes'
          AND a.payload->>'execution_class'='PRODUCTION')
        AND NOT EXISTS(SELECT 1 FROM hermes_ops.job_dependencies d JOIN public.jobs p
          ON p.job_id=d.prerequisite_job_id WHERE d.job_id=j.job_id AND p.status<>'succeeded')""",
        (job["job_id"], VERSION))
    return cursor.fetchone()


def _receipt_selected(config: dict, receipt_id: object) -> bool:
    if not isinstance(receipt_id, str) or not receipt_id:
        return False
    if config.get("queue_selection") is True:
        return True
    configured = config.get("receipt_id")
    return isinstance(configured, str) and configured == receipt_id


def execute(job: dict) -> dict:
    config = settings()
    receipt_id = job.get("payload", {}).get("canonical_receipt_id")
    if (not config["enabled"] or not _receipt_selected(config, receipt_id)
            or job.get("job_type") != receipt_dispatch.JOB_TYPE or not job.get("leased_by")):
        return {"state": "LOCAL_VALIDATION_GATED"}
    worker_run_id = _uuid5(f"https://civiclenz.com/hermes/producer-receipts/{receipt_id}/worker/{job['job_id']}/{job['leased_by']}/{VERSION}")
    started_at = datetime.now(timezone.utc)
    with connect_database() as connection:
        with connection:
            with connection.cursor(cursor_factory=_real_dict_cursor()) as cursor:
                cursor.execute("""SELECT * FROM public.jobs WHERE job_id=%s AND status='leased' AND leased_by=%s
                    AND lease_expires_at>clock_timestamp() AND job_type=%s""",
                    (job["job_id"], job["leased_by"], receipt_dispatch.JOB_TYPE))
                live = cursor.fetchone()
                if not live:
                    return {"state": "STALE_LEASE_NO_WORK"}
                cursor.execute("SELECT worker_run_id,status FROM public.worker_runs WHERE worker_run_id=%s", (worker_run_id,))
                prior = cursor.fetchone()
                if prior:
                    return {"state": "LOCAL_VALIDATION_ALREADY_RECORDED", "worker_run_id": str(prior["worker_run_id"])}
                try:
                    registry = receipt_dispatch.load_registry(config["registry"])
                    receipt, lineage = _validate_dispatched_receipt(_receipt_path(config, receipt_id), registry, live)
                    result = _evaluate(cursor, receipt, lineage, live, started_at)
                except receipt_dispatch.ReceiptRejected as error:
                    cursor.execute("""SELECT job_id FROM public.jobs WHERE job_id=%s AND status='leased' AND leased_by=%s
                        AND lease_expires_at>clock_timestamp()""", (job["job_id"], job["leased_by"]))
                    if cursor.fetchone():
                        cursor.execute("""INSERT INTO public.worker_runs
                            (worker_run_id,worker_key,runtime,deployment_id,job_id,status,started_at,completed_at,
                             records_read,records_written,claims_verified,error_class,error_message,metadata)
                            VALUES(%s,%s,'local',%s,%s,'failed',%s,clock_timestamp(),0,1,0,%s,
                             'Producer receipt validation failed closed',%s::jsonb) ON CONFLICT (worker_run_id) DO NOTHING""",
                            (worker_run_id, WORKER_KEY, VERSION, job["job_id"], started_at,
                             error.code, json.dumps({"validation_version": VERSION, "job_id": str(job["job_id"]),
                                                    "canonical_receipt_id": receipt_id, "attempt_token": job["leased_by"],
                                                    "retryable": False})))
                    return {"state": "LOCAL_VALIDATION_REJECTED", "failure": error.code, "worker_run_id": worker_run_id}

                cursor.execute("""SELECT job_id FROM public.jobs WHERE job_id=%s AND status='leased' AND leased_by=%s
                    AND lease_expires_at>clock_timestamp()""", (job["job_id"], job["leased_by"]))
                if not cursor.fetchone():
                    return {"state": "STALE_LEASE_NO_WORK"}
                cursor.execute("""INSERT INTO public.worker_runs
                    (worker_run_id,worker_key,runtime,deployment_id,job_id,status,started_at,completed_at,
                     records_read,records_written,claims_verified,metadata)
                    VALUES(%s,%s,'local',%s,%s,'succeeded',%s,%s,%s,1,0,%s::jsonb)
                    ON CONFLICT (worker_run_id) DO NOTHING""",
                    (worker_run_id, WORKER_KEY, VERSION, job["job_id"], started_at,
                     result["completed_at"], len(result["evidence"]), json.dumps(result)))
    return {"state": "LOCAL_VALIDATION_RECORDED_AWAITING_COLLECTION", "worker_run_id": worker_run_id,
            "validation_evaluation_id": result["validation_evaluation_id"],
            "validation_disposition": result["validation_disposition"]}
