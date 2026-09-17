"""Durable producer-receipt handoff into the existing HERMES work ledger.

The ingest spool is not canonical truth.  This module validates an accepted
receipt, commits one receipt-scoped ResearchNeed and one blocked validation
job, then (and only then) advances the local receipt dispatch state.
"""
from __future__ import annotations

import base64
import binascii
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
import time
import uuid
from datetime import datetime

VERSION = "hermes-producer-receipt-dispatch-v1"
RECEIPT_VERSION = "CIVICLENZ_HARVESTER_RECEIPT_V1"
CONTRACT_VERSION = "CIVICLENZ_RESEARCH_INGEST_CONTRACT_V1"
JOB_TYPE = "producer_receipt_validate"
CAPABILITY_GAP = "CAPABILITY_NOT_IMPLEMENTED: producer receipt identity/evidence validation"
VALIDATION_STATE = "NEEDS_IDENTITY_RESOLUTION_AND_EVIDENCE_REVIEW"
MAX_RECEIPT_BYTES = 32 * 1024 * 1024
SHA256 = re.compile(r"^[0-9a-f]{64}$")
ENTITY_SETS = (
    "jurisdiction_candidates", "seat_candidates", "person_candidates",
    "occupancy_candidates", "election_candidates", "candidate_campaign_candidates",
)


class ReceiptRejected(ValueError):
    """A stable fail-closed receipt rejection with no payload disclosure."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def connect_database():
    """Load the production database adapter only when a database action runs."""
    from database_bootstrap import connect_database as connect
    return connect()


def _real_dict_cursor():
    """Keep pure receipt validation/test imports independent of the VPS driver."""
    from psycopg2.extras import RealDictCursor
    return RealDictCursor


def settings() -> dict:
    raw_budget = os.environ.get("HERMES_PRODUCER_RECEIPT_DISPATCH_BUDGET", "1")
    raw_attempts = os.environ.get("HERMES_PRODUCER_RECEIPT_DISPATCH_MAX_ATTEMPTS", "3")
    try:
        budget = min(1, max(0, int(raw_budget)))
    except ValueError:
        budget = 0
    try:
        attempts = min(3, max(1, int(raw_attempts)))
    except ValueError:
        attempts = 3
    return {
        "enabled": os.environ.get("HERMES_PRODUCER_RECEIPT_DISPATCH") == "true",
        "budget": budget,
        "max_attempts": attempts,
        "registry": Path(os.environ.get(
            "HERMES_INGEST_PRODUCER_REGISTRY",
            str(Path(__file__).resolve().parents[2] / "config/producers/registry.json"),
        )),
    }


def _json_bytes(value: object) -> bytes:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def _uuid(value: object, code: str) -> str:
    try:
        parsed = uuid.UUID(str(value))
    except (ValueError, TypeError, AttributeError) as exc:
        raise ReceiptRejected(code) from exc
    return str(parsed)


def load_registry(path: Path) -> dict:
    try:
        registry = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise ReceiptRejected("PRODUCER_REGISTRY_UNAVAILABLE") from exc
    if registry.get("registry_version") != "PRODUCER_REGISTRY_V1" or not isinstance(registry.get("producers"), list):
        raise ReceiptRejected("PRODUCER_REGISTRY_INVALID")
    return registry


def load_receipt(path: Path) -> dict:
    try:
        if path.stat().st_size > MAX_RECEIPT_BYTES:
            raise ReceiptRejected("RECEIPT_EXCEEDS_BOUND")
        receipt = json.loads(path.read_text(encoding="utf-8"))
    except ReceiptRejected:
        raise
    except (OSError, ValueError) as exc:
        raise ReceiptRejected("RECEIPT_MALFORMED") from exc
    if not isinstance(receipt, dict):
        raise ReceiptRejected("RECEIPT_MALFORMED")
    return receipt


def _producer_policy(registry: dict, producer_id: str, contract: str, capability: str) -> dict:
    matches = [p for p in registry["producers"] if p.get("producer_id") == producer_id]
    if len(matches) != 1 or not matches[0].get("active"):
        raise ReceiptRejected("PRODUCER_NOT_AUTHORIZED")
    policy = matches[0]
    if contract not in policy.get("allowed_result_contracts", []):
        raise ReceiptRejected("CONTRACT_NOT_AUTHORIZED")
    if capability not in policy.get("allowed_capabilities", []):
        raise ReceiptRejected("CAPABILITY_NOT_AUTHORIZED")
    if (policy.get("authority_boundary") != "submit_extracted_unreviewed_only"
            or policy.get("canonical_verification_authority") is not False
            or policy.get("canonical_publication_authority") is not False
            or policy.get("direct_canonical_storage_access") is not False):
        raise ReceiptRejected("PRODUCER_AUTHORITY_BOUNDARY_INVALID")
    return policy


def validate_receipt(receipt: dict, path: Path, registry: dict) -> dict:
    receipt_id = _uuid(receipt.get("receipt_id"), "RECEIPT_ID_INVALID")
    if path.stem != receipt_id:
        raise ReceiptRejected("RECEIPT_FILENAME_ID_MISMATCH")
    if receipt.get("receipt_version") != RECEIPT_VERSION:
        raise ReceiptRejected("RECEIPT_VERSION_UNSUPPORTED")
    if receipt.get("contract_version") != CONTRACT_VERSION:
        raise ReceiptRejected("CONTRACT_NOT_AUTHORIZED")
    if receipt.get("acknowledgement_state") not in ("ACCEPTED_FOR_VALIDATION", "PARTIALLY_ACCEPTED", "NEEDS_IDENTITY_RESOLUTION"):
        raise ReceiptRejected("ACKNOWLEDGEMENT_NOT_DISPATCHABLE")
    if receipt.get("dispatch_state") not in ("PENDING_CANONICAL_DISPATCH", "DISPATCH_FAILED"):
        raise ReceiptRejected("RECEIPT_NOT_PENDING")
    dispatch_attempts = receipt.get("dispatch_attempts", 0)
    if isinstance(dispatch_attempts, bool) or not isinstance(dispatch_attempts, int) or dispatch_attempts < 0:
        raise ReceiptRejected("DISPATCH_ATTEMPTS_INVALID")

    envelope = receipt.get("envelope")
    if not isinstance(envelope, dict):
        raise ReceiptRejected("ENVELOPE_MISSING")
    producer = envelope.get("producer")
    job = envelope.get("job")
    if not isinstance(producer, dict) or not isinstance(job, dict):
        raise ReceiptRejected("ENVELOPE_IDENTITY_MISSING")
    producer_id = receipt.get("producer_id")
    if not isinstance(producer_id, str) or producer.get("producer_id") != producer_id:
        raise ReceiptRejected("PRODUCER_IDENTITY_MISMATCH")
    if producer.get("producer_version") != receipt.get("producer_version"):
        raise ReceiptRejected("PRODUCER_VERSION_MISMATCH")
    if envelope.get("contract_version") != receipt.get("contract_version"):
        raise ReceiptRejected("CONTRACT_IDENTITY_MISMATCH")
    if job.get("job_id") != receipt.get("job_id") or job.get("research_work_identity") != receipt.get("research_work_identity"):
        raise ReceiptRejected("WORK_IDENTITY_MISMATCH")
    if not isinstance(receipt.get("job_id"), str) or not receipt["job_id"]:
        raise ReceiptRejected("PRODUCER_JOB_ID_INVALID")
    if not isinstance(receipt.get("research_work_identity"), str) or not receipt["research_work_identity"]:
        raise ReceiptRejected("RESEARCH_WORK_IDENTITY_INVALID")
    if envelope.get("extraction_status") != "extracted_unreviewed":
        raise ReceiptRejected("PRODUCER_CLASSIFICATION_INVALID")
    capability = envelope.get("capability")
    if not isinstance(capability, str):
        raise ReceiptRejected("CAPABILITY_INVALID")
    _producer_policy(registry, producer_id, receipt["contract_version"], capability)

    result_hash = receipt.get("result_content_hash")
    if not isinstance(result_hash, str) or not SHA256.fullmatch(result_hash):
        raise ReceiptRejected("RESULT_CONTENT_HASH_INVALID")
    if hashlib.sha256(_json_bytes(envelope)).hexdigest() != result_hash:
        raise ReceiptRejected("RESULT_CONTENT_HASH_MISMATCH")

    stored = receipt.get("evidence")
    submitted = envelope.get("evidence")
    if not isinstance(stored, list) or not isinstance(submitted, list) or not stored or len(stored) != len(submitted):
        raise ReceiptRejected("EVIDENCE_LINEAGE_INCOMPLETE")
    stored_by_key = {item.get("evidence_key"): item for item in stored if isinstance(item, dict)}
    if len(stored_by_key) != len(stored):
        raise ReceiptRejected("EVIDENCE_IDENTITY_DUPLICATE")
    evidence_lineage = []
    for evidence in submitted:
        if not isinstance(evidence, dict) or not isinstance(evidence.get("evidence_key"), str):
            raise ReceiptRejected("EVIDENCE_IDENTITY_INVALID")
        artifact = stored_by_key.get(evidence["evidence_key"])
        if not artifact or artifact.get("integrity_state") != "MATCH":
            raise ReceiptRejected("EVIDENCE_INTEGRITY_NOT_PROVEN")
        declared = evidence.get("sha256")
        length = evidence.get("byte_length")
        encoded = evidence.get("content_base64")
        if not isinstance(declared, str) or not SHA256.fullmatch(declared) or not isinstance(length, int) or length <= 0:
            raise ReceiptRejected("EVIDENCE_METADATA_INVALID")
        if not isinstance(encoded, str):
            raise ReceiptRejected("EVIDENCE_BYTES_REQUIRED")
        try:
            raw = base64.b64decode(encoded, validate=True)
        except (ValueError, binascii.Error) as exc:
            raise ReceiptRejected("EVIDENCE_BASE64_INVALID") from exc
        actual = hashlib.sha256(raw).hexdigest()
        if (len(raw) != length or artifact.get("byte_length") != length
                or artifact.get("declared_sha256") != declared
                or artifact.get("actual_sha256") != actual or actual != declared):
            raise ReceiptRejected("EVIDENCE_HASH_OR_LENGTH_MISMATCH")
        evidence_lineage.append({
            "evidence_key": evidence["evidence_key"], "sha256": actual,
            "byte_length": length, "source_url": evidence.get("source_url"),
            "retrieved_at": evidence.get("retrieved_at"), "mime_type": evidence.get("mime_type"),
            "method": evidence.get("method"), "parser_version": evidence.get("parser_version"),
            "locator": evidence.get("locator"), "integrity_state": "MATCH",
        })

    sources = envelope.get("sources")
    retrievals = envelope.get("retrievals")
    entities = envelope.get("entities")
    if (not isinstance(sources, list) or any(not isinstance(item, dict) for item in sources)
            or not isinstance(retrievals, list) or any(not isinstance(item, dict) for item in retrievals)):
        raise ReceiptRejected("SOURCE_PROVENANCE_INVALID")
    if (not isinstance(entities, dict) or set(entities) != set(ENTITY_SETS)
            or any(not isinstance(entities[key], list) for key in ENTITY_SETS)):
        raise ReceiptRejected("SUBJECT_CANDIDATES_INVALID")
    subject_counts = {key: len(entities[key]) for key in ENTITY_SETS}
    received_at = receipt.get("received_at")
    if not isinstance(received_at, str):
        raise ReceiptRejected("RECEIVED_AT_INVALID")
    try:
        parsed_received_at = datetime.fromisoformat(received_at.replace("Z", "+00:00"))
        if parsed_received_at.tzinfo is None:
            raise ValueError("timezone required")
    except ValueError as exc:
        raise ReceiptRejected("RECEIVED_AT_INVALID") from exc

    identity_seed = {
        "receipt_id": receipt_id, "producer_id": producer_id,
        "producer_job_id": receipt["job_id"], "result_content_hash": result_hash,
        "stage": "canonical_validation", "version": 1,
    }
    work_identity = "work:v1:" + hashlib.sha256(_json_bytes(identity_seed)).hexdigest()
    namespace = uuid.NAMESPACE_URL
    handoff_id = str(uuid.uuid5(namespace, f"https://civiclenz.com/hermes/producer-receipts/{receipt_id}/handoff"))
    validation_job_id = str(uuid.uuid5(namespace, f"https://civiclenz.com/hermes/producer-receipts/{receipt_id}/validation-job"))
    return {
        "receipt_id": receipt_id, "handoff_id": handoff_id,
        "validation_job_id": validation_job_id, "work_identity": work_identity,
        "producer_id": producer_id, "producer_version": receipt["producer_version"],
        "contract_version": receipt["contract_version"], "producer_job_id": receipt["job_id"],
        "producer_research_work_identity": receipt["research_work_identity"],
        "result_content_hash": result_hash, "received_at": received_at,
        "acknowledgement_state": receipt["acknowledgement_state"],
        "classification": "extracted_unreviewed", "capability": capability,
        "sources": sources, "retrievals": retrievals,
        "evidence": evidence_lineage, "subject_candidate_counts": subject_counts,
    }


def _handoff_basis(lineage: dict) -> dict:
    return {
        "canonical_handoff_version": VERSION,
        "canonical_handoff_id": lineage["handoff_id"],
        "canonical_handoff_state": "VALIDATION_WORKER_GAP",
        "canonical_receipt_id": lineage["receipt_id"],
        "producer_id": lineage["producer_id"],
        "producer_version": lineage["producer_version"],
        "contract_version": lineage["contract_version"],
        "producer_job_id": lineage["producer_job_id"],
        "producer_research_work_identity": lineage["producer_research_work_identity"],
        "result_content_hash": lineage["result_content_hash"],
        "received_at": lineage["received_at"],
        "acknowledgement_state": lineage["acknowledgement_state"],
        "classification": lineage["classification"],
        "evidence": lineage["evidence"],
        "sources": lineage["sources"],
        "retrievals": lineage["retrievals"],
        "subject_candidate_counts": lineage["subject_candidate_counts"],
        "validation_state": VALIDATION_STATE,
        "publication_allowed": False,
    }


def persist_handoff(cursor, lineage: dict) -> dict | None:
    cursor.execute("SELECT pg_try_advisory_xact_lock(hashtext(%s),hashtext(%s)) AS acquired",
                   (VERSION, lineage["receipt_id"]))
    lock = cursor.fetchone()
    if not lock or not lock["acquired"]:
        return None
    need_key = f"producer-receipt:v1:{lineage['receipt_id']}"
    basis = _handoff_basis(lineage)
    cursor.execute("""INSERT INTO hermes_ops.research_needs
        (need_id,need_key,target_type,target_id,scope_key,origin,execution_class,state,reason,basis,priority)
        VALUES (%s,%s,'producer_receipt',%s,'canonical_validation','PRODUCER','PRODUCTION','BLOCKED',%s,%s::jsonb,10)
        ON CONFLICT (need_key) DO NOTHING""",
        (lineage["handoff_id"], need_key, lineage["receipt_id"], CAPABILITY_GAP, json.dumps(basis)))
    cursor.execute("""SELECT need_id,need_key,target_type,target_id,scope_key,origin,execution_class,state,reason,basis
        FROM hermes_ops.research_needs WHERE need_key=%s FOR UPDATE""", (need_key,))
    need = cursor.fetchone()
    if (not need or str(need["need_id"]) != lineage["handoff_id"]
            or need["target_type"] != "producer_receipt" or str(need["target_id"]) != lineage["receipt_id"]
            or need["scope_key"] != "canonical_validation" or need["origin"] != "PRODUCER"
            or need["execution_class"] != "PRODUCTION"
            or need["basis"].get("result_content_hash") != lineage["result_content_hash"]):
        raise ReceiptRejected("CANONICAL_HANDOFF_IDENTITY_CONFLICT")

    payload = {
        "orchestration_authority": "hermes", "execution_class": "PRODUCTION",
        "research_work_identity": lineage["work_identity"],
        "scope_key": "canonical_validation", "canonical_receipt_id": lineage["receipt_id"],
        "canonical_handoff_id": lineage["handoff_id"], "producer_id": lineage["producer_id"],
        "producer_version": lineage["producer_version"], "contract_version": lineage["contract_version"],
        "producer_job_id": lineage["producer_job_id"],
        "producer_research_work_identity": lineage["producer_research_work_identity"],
        "result_content_hash": lineage["result_content_hash"], "received_at": lineage["received_at"],
        "acknowledgement_state": lineage["acknowledgement_state"],
        "classification": lineage["classification"], "evidence": lineage["evidence"],
        "subject_candidate_counts": lineage["subject_candidate_counts"],
        "validation_state": VALIDATION_STATE, "publication_allowed": False,
        "dispatch_blocker": CAPABILITY_GAP,
    }
    cursor.execute("""INSERT INTO public.jobs
        (job_id,job_type,target_type,target_id,priority,status,attempt_count,max_attempts,dedupe_key,payload,research_need_id)
        VALUES (%s,%s,'producer_receipt',%s,10,'queued',0,1,%s,%s::jsonb,%s)
        ON CONFLICT (dedupe_key) DO NOTHING""",
        (lineage["validation_job_id"], JOB_TYPE, lineage["receipt_id"],
         lineage["work_identity"], json.dumps(payload), lineage["handoff_id"]))
    cursor.execute("""SELECT job_id,job_type,target_type,target_id,status,attempt_count,dedupe_key,payload,research_need_id
        FROM public.jobs WHERE dedupe_key=%s FOR UPDATE""", (lineage["work_identity"],))
    job = cursor.fetchone()
    if (not job or str(job["job_id"]) != lineage["validation_job_id"] or job["job_type"] != JOB_TYPE
            or str(job["target_id"]) != lineage["receipt_id"] or str(job["research_need_id"]) != lineage["handoff_id"]
            or job["payload"].get("canonical_receipt_id") != lineage["receipt_id"]
            or job["payload"].get("result_content_hash") != lineage["result_content_hash"]
            or job["payload"].get("orchestration_authority") != "hermes"
            or job["payload"].get("execution_class") != "PRODUCTION"
            or job["payload"].get("classification") != "extracted_unreviewed"
            or job["payload"].get("publication_allowed") is not False):
        raise ReceiptRejected("CANONICAL_VALIDATION_JOB_IDENTITY_CONFLICT")
    cursor.execute("""SELECT count(*) AS jobs FROM public.jobs
        WHERE job_type=%s AND payload->>'canonical_receipt_id'=%s
        AND status IN ('queued','leased','running')""", (JOB_TYPE, lineage["receipt_id"]))
    if int(cursor.fetchone()["jobs"]) != 1:
        raise ReceiptRejected("CANONICAL_VALIDATION_JOB_CARDINALITY_INVALID")
    return {"handoff_id": lineage["handoff_id"], "job_id": lineage["validation_job_id"],
            "job_type": JOB_TYPE, "validation_state": VALIDATION_STATE}


def ledger_status(cursor) -> dict:
    cursor.execute("""SELECT count(*) AS handoffs FROM hermes_ops.research_needs n
        JOIN public.jobs j ON j.research_need_id=n.need_id
        WHERE n.origin='PRODUCER' AND n.execution_class='PRODUCTION'
        AND n.scope_key='canonical_validation' AND j.job_type=%s
        AND j.payload->>'orchestration_authority'='hermes'
        AND j.payload->>'execution_class'='PRODUCTION'
        AND j.payload->>'classification'='extracted_unreviewed'
        AND j.payload->>'publication_allowed'='false'
        AND j.dedupe_key=j.payload->>'research_work_identity'""", (JOB_TYPE,))
    return {"durable_handoffs": int(cursor.fetchone()["handoffs"])}


def _atomic_receipt_transition_unlocked(path: Path, expected: dict, state: str, details: dict,
                                        failure: str | None = None) -> dict:
    live = load_receipt(path)
    for key in ("receipt_id", "producer_id", "job_id", "result_content_hash", "received_at"):
        if live.get(key) != expected.get(key):
            raise ReceiptRejected("RECEIPT_CHANGED_DURING_DISPATCH")
    if live.get("dispatch_state") == "DISPATCHED" and state == "DISPATCHED":
        return {**live, "_transition_applied": False}
    if live.get("dispatch_state") not in ("PENDING_CANONICAL_DISPATCH", "DISPATCH_FAILED"):
        raise ReceiptRejected("RECEIPT_STATE_TRANSITION_REJECTED")
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    updated = dict(live)
    updated["dispatch_state"] = state
    updated["dispatch_attempts"] = int(live.get("dispatch_attempts", 0)) + 1
    updated["last_dispatch_attempt_at"] = now
    if state == "DISPATCHED":
        updated["canonical_handoff"] = {**details, "version": VERSION, "dispatched_at": now}
        updated.pop("dispatch_failure", None)
    else:
        updated["dispatch_failure"] = {"code": failure or "CANONICAL_HANDOFF_FAILED", "observed_at": now}
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(_json_bytes(updated) + b"\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, 0o660)
        os.replace(temporary, path)
        directory = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    return {**updated, "_transition_applied": True}


def _atomic_receipt_transition(path: Path, expected: dict, state: str, details: dict,
                               failure: str | None = None) -> dict:
    """Serialize receipt-file compare-and-swap across Prime ticks/processes."""
    lock_path = path.with_name(f".{path.name}.dispatch.lock")
    lock_fd = os.open(lock_path, os.O_CREAT | os.O_RDWR, 0o660)
    try:
        os.fchmod(lock_fd, 0o660)
        fcntl.flock(lock_fd, fcntl.LOCK_EX)
        return _atomic_receipt_transition_unlocked(path, expected, state, details, failure)
    finally:
        fcntl.flock(lock_fd, fcntl.LOCK_UN)
        os.close(lock_fd)


def _record_unparseable_failure(path: Path, code: str) -> None:
    failure_path = path.with_name(path.name + ".dispatch-failure")
    if failure_path.exists():
        return
    record = {"receipt_file": path.name, "state": "DISPATCH_FAILED", "failure": code,
              "observed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    fd, temporary = tempfile.mkstemp(prefix=f".{failure_path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(_json_bytes(record) + b"\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, 0o660)
        try:
            os.link(temporary, failure_path)
        except FileExistsError:
            pass
        directory = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def _candidate_paths(spool: Path, max_attempts: int) -> list[Path]:
    receipts = spool / "receipts"
    if not receipts.is_dir():
        return []
    candidates = []
    for path in sorted(receipts.glob("*.json")):
        if path.with_name(path.name + ".dispatch-failure").exists():
            continue
        try:
            receipt = load_receipt(path)
        except ReceiptRejected:
            candidates.append(path)
            continue
        attempts = receipt.get("dispatch_attempts", 0)
        invalid_attempts = isinstance(attempts, bool) or not isinstance(attempts, int) or attempts < 0
        if (receipt.get("dispatch_state") in ("PENDING_CANONICAL_DISPATCH", "DISPATCH_FAILED")
                and (invalid_attempts or attempts < max_attempts)):
            candidates.append(path)
    return candidates


def _status() -> dict:
    with connect_database() as connection:
        with connection.cursor(cursor_factory=_real_dict_cursor()) as cursor:
            return ledger_status(cursor)


def dispatch_path(path: Path, registry: dict) -> dict:
    try:
        receipt = load_receipt(path)
    except ReceiptRejected as error:
        _record_unparseable_failure(path, error.code)
        return {"state": "RECEIPT_REJECTED_FAIL_CLOSED", "failure": error.code}
    try:
        lineage = validate_receipt(receipt, path, registry)
    except ReceiptRejected as error:
        if isinstance(receipt.get("receipt_id"), str) and receipt.get("dispatch_state") in ("PENDING_CANONICAL_DISPATCH", "DISPATCH_FAILED"):
            try:
                _atomic_receipt_transition(path, receipt, "DISPATCH_FAILED", {}, error.code)
            except ReceiptRejected:
                pass
        return {"state": "RECEIPT_REJECTED_FAIL_CLOSED", "failure": error.code}

    try:
        with connect_database() as connection:
            with connection:
                with connection.cursor(cursor_factory=_real_dict_cursor()) as cursor:
                    handoff = persist_handoff(cursor, lineage)
    except Exception as error:
        code = error.code if isinstance(error, ReceiptRejected) else "CANONICAL_HANDOFF_TRANSACTION_FAILED"
        _atomic_receipt_transition(path, receipt, "DISPATCH_FAILED", {}, code)
        return {"state": "RECEIPT_DISPATCH_FAILED_RECOVERABLE", "failure": code}
    if handoff is None:
        return {"state": "CONCURRENT_RECEIPT_TICK_SKIPPED"}
    try:
        transition = _atomic_receipt_transition(path, receipt, "DISPATCHED", handoff)
    except Exception:
        return {"state": "CANONICAL_COMMITTED_RECEIPT_TRANSITION_PENDING", **handoff}
    if not transition.pop("_transition_applied", False):
        return {"state": "ALREADY_DISPATCHED_IDEMPOTENT", **handoff,
                "receipt_id": lineage["receipt_id"], "research_work_identity": lineage["work_identity"]}
    return {"state": "RECEIPT_CANONICAL_HANDOFF_PROVEN_VALIDATION_WORKER_GAP", **handoff,
            "receipt_id": lineage["receipt_id"], "research_work_identity": lineage["work_identity"]}


def tick(spool: Path, governor: dict) -> dict:
    config = settings()
    if not config["enabled"]:
        return {"state": "DISABLED", "durable_handoffs": 0}
    try:
        registry = load_registry(config["registry"])
        status = _status()
    except Exception:
        return {"state": "RECEIPT_DISPATCH_STATUS_FAILED", "durable_handoffs": 0}
    if not governor.get("dispatch_enabled") or int(governor.get("dispatch_limit", 0)) <= 0:
        return {"state": "RESOURCE_GATED", **status}
    candidates = _candidate_paths(spool, config["max_attempts"])
    if not candidates or config["budget"] == 0:
        return ({"state": "RECEIPT_CANONICAL_HANDOFF_PROVEN_VALIDATION_WORKER_GAP", **status}
                if status["durable_handoffs"] else {"state": "IDLE_NO_ELIGIBLE_RECEIPT", **status})
    result = dispatch_path(candidates[0], registry)
    result["eligible_receipts_observed"] = len(candidates)
    return result
