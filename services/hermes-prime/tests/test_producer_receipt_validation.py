import base64
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import sys
import tempfile
import unittest
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import producer_receipt_dispatch as dispatch
import producer_receipt_validation as validation


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode()


def registry():
    return {"registry_version": "PRODUCER_REGISTRY_V1", "producers": [{
        "producer_id": "civicslenzz-gemini-harvester", "active": True,
        "allowed_result_contracts": [dispatch.CONTRACT_VERSION],
        "allowed_capabilities": ["advance_research_harvest"],
        "authority_boundary": "submit_extracted_unreviewed_only",
        "direct_canonical_storage_access": False,
        "canonical_verification_authority": False,
        "canonical_publication_authority": False,
    }]}


def pending_fixture(receipt_id=None):
    receipt_id = receipt_id or str(uuid.uuid4())
    raw = b"producer receipt validation fixture"
    digest = hashlib.sha256(raw).hexdigest()
    source_url = "https://dos.elections.myflorida.com/candidates/CanList.asp"
    envelope = {
        "contract_version": dispatch.CONTRACT_VERSION,
        "producer": {"producer_id": "civicslenzz-gemini-harvester", "producer_version": "test-v1",
                     "execution_id": str(uuid.uuid4())},
        "job": {"job_id": "fl_dos_candidate_filing_canary", "research_work_identity": "producer-work"},
        "extraction_status": "extracted_unreviewed", "capability": "advance_research_harvest",
        "cohort": {"cohort_key": "florida", "state": "HARVESTING"},
        "sources": [{"source_key": "fl_dos_elections", "source_url": source_url,
                     "authority_tier": "OFFICIAL_STATE_ELECTIONS"}],
        "retrievals": [{"source_key": "fl_dos_elections", "source_url": source_url,
                        "retrieved_at": "2026-09-15T01:59:54.870Z", "content_hash": digest,
                        "mime_type": "text/html", "byte_length": len(raw), "method": "http",
                        "parser_version": "fixture-v1"}],
        "evidence": [{"evidence_key": str(uuid.uuid4()), "source_url": source_url,
                      "retrieved_at": "2026-09-15T01:59:54.870Z", "mime_type": "text/html",
                      "byte_length": len(raw), "sha256": digest,
                      "content_base64": base64.b64encode(raw).decode(), "method": "http",
                      "parser_version": "fixture-v1", "locator": "r2://fixture/object.raw"}],
        "entities": {key: [] for key in dispatch.ENTITY_SETS},
        "claims": [], "relationships": [], "dataset_units": [], "gis_boundaries": [],
        "warnings": [], "gaps": [], "currentness": {"current_as_of": "2026-09-15T01:59:54.870Z"},
        "monitoring_recommendations": [],
    }
    return {
        "receipt_version": dispatch.RECEIPT_VERSION, "receipt_id": receipt_id,
        "producer_id": envelope["producer"]["producer_id"], "producer_version": envelope["producer"]["producer_version"],
        "contract_version": dispatch.CONTRACT_VERSION, "job_id": envelope["job"]["job_id"],
        "research_work_identity": envelope["job"]["research_work_identity"],
        "result_content_hash": hashlib.sha256(compact(envelope)).hexdigest(), "idempotency_key": "fixture-idempotency",
        "received_at": "2026-09-15T02:00:54.870Z", "acknowledgement_state": "ACCEPTED_FOR_VALIDATION",
        "dispatch_state": "PENDING_CANONICAL_DISPATCH",
        "evidence": [{"evidence_key": envelope["evidence"][0]["evidence_key"], "declared_sha256": digest,
                      "actual_sha256": digest, "byte_length": len(raw), "integrity_state": "MATCH"}],
        "envelope": envelope,
    }


def make_dispatched(folder, receipt=None):
    receipt = receipt or pending_fixture()
    path = Path(folder) / f"{receipt['receipt_id']}.json"
    path.write_bytes(compact(receipt) + b"\n")
    lineage = dispatch.validate_receipt(receipt, path, registry())
    receipt["dispatch_state"] = "DISPATCHED"
    receipt["dispatch_attempts"] = 1
    receipt["canonical_handoff"] = {
        "version": dispatch.VERSION, "handoff_id": lineage["handoff_id"],
        "job_id": lineage["validation_job_id"], "job_type": dispatch.JOB_TYPE,
        "validation_state": dispatch.VALIDATION_STATE, "dispatched_at": "2026-09-16T05:14:32Z",
    }
    path.write_bytes(compact(receipt) + b"\n")
    job = {
        "job_id": lineage["validation_job_id"], "job_type": dispatch.JOB_TYPE,
        "target_type": "producer_receipt", "target_id": lineage["receipt_id"],
        "research_need_id": lineage["handoff_id"], "dedupe_key": lineage["work_identity"],
        "leased_by": "a" * 64, "attempt_count": 1,
        "payload": {
            "orchestration_authority": "hermes", "execution_class": "PRODUCTION",
            "research_work_identity": lineage["work_identity"], "canonical_receipt_id": lineage["receipt_id"],
            "canonical_handoff_id": lineage["handoff_id"], "result_content_hash": lineage["result_content_hash"],
            "classification": "extracted_unreviewed", "publication_allowed": False,
            "capability_route": {"version": validation.VERSION, "capability": validation.CAPABILITY,
                                 "worker": validation.WORKER_KEY, "receipt_id": lineage["receipt_id"]},
        },
    }
    return path, receipt, lineage, job


class SourceCursor:
    def __init__(self, rows=None):
        self.rows = rows or []
        self.calls = []
    def execute(self, sql, args=()):
        self.calls.append((sql, args))
    def fetchall(self):
        return list(self.rows)


class ProducerReceiptValidationTests(unittest.TestCase):
    def test_bounded_queue_execution_selects_receipt_from_leased_job(self):
        receipt_id = str(uuid.uuid4())
        self.assertTrue(validation._receipt_selected({"queue_selection": True, "receipt_id": None}, receipt_id))
        self.assertFalse(validation._receipt_selected({"queue_selection": True, "receipt_id": None}, None))
        self.assertTrue(validation._receipt_selected({"queue_selection": False, "receipt_id": receipt_id}, receipt_id))
        self.assertFalse(validation._receipt_selected({"queue_selection": False, "receipt_id": str(uuid.uuid4())}, receipt_id))

    def test_zero_candidate_canary_truthfully_needs_more_evidence(self):
        with tempfile.TemporaryDirectory() as folder:
            path, receipt, lineage, job = make_dispatched(folder)
            live, checked = validation._validate_dispatched_receipt(path, registry(), job)
            result = validation._evaluate(SourceCursor(), live, checked, job, datetime.now(timezone.utc))
        self.assertEqual(result["validation_disposition"], "NEEDS_MORE_EVIDENCE")
        self.assertEqual(result["evidence_integrity"], "PASS")
        self.assertEqual(result["identity_disposition"]["state"], "NO_CANONICAL_SUBJECT_SUBMITTED")
        self.assertEqual(result["currentness_disposition"]["state"], "OBSERVATION_TIME_COHERENT_SUBJECT_CURRENTNESS_UNRESOLVED")
        self.assertEqual(result["contradiction_disposition"]["state"], "NOT_EVALUATED_NO_CANONICAL_SUBJECT")
        self.assertEqual(result["research_contract_disposition"]["subject_contract_state"], "NOT_APPLICABLE_NO_CANONICAL_SUBJECT")
        self.assertEqual(result["source_provenance"][0]["canonical_registration"], "MISSING_CANONICAL_REGISTRATION")
        for key in ("verification_allowed", "publication_allowed", "person_creation_allowed", "occupancy_creation_allowed"):
            self.assertIs(result[key], False)

    def test_exact_canonical_source_does_not_fabricate_missing_subject_or_claim(self):
        with tempfile.TemporaryDirectory() as folder:
            path, receipt, lineage, job = make_dispatched(folder)
            live, checked = validation._validate_dispatched_receipt(path, registry(), job)
            source = receipt["envelope"]["sources"][0]
            rows = [{"source_id": uuid.uuid4(), "source_key": source["source_key"], "source_url": source["source_url"],
                     "active": True, "authority_tier": "TIER_1_PRIMARY_OFFICIAL"}]
            result = validation._evaluate(SourceCursor(rows), live, checked, job, datetime.now(timezone.utc))
        self.assertEqual(result["source_provenance"][0]["canonical_registration"], "REGISTERED_EXACT")
        self.assertEqual(result["validation_disposition"], "NEEDS_MORE_EVIDENCE")
        self.assertEqual(result["producer_claim_count"], 0)
        self.assertFalse(result["identity_disposition"]["resolved"])

    def test_corrupted_evidence_bytes_are_rejected_even_when_envelope_hash_is_recomputed(self):
        receipt = pending_fixture()
        receipt["envelope"]["evidence"][0]["content_base64"] = base64.b64encode(b"corrupt").decode()
        receipt["result_content_hash"] = hashlib.sha256(compact(receipt["envelope"])).hexdigest()
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / f"{receipt['receipt_id']}.json"
            path.write_bytes(compact(receipt) + b"\n")
            with self.assertRaises(dispatch.ReceiptRejected) as caught:
                dispatch.validate_receipt(receipt, path, registry())
        self.assertEqual(caught.exception.code, "EVIDENCE_HASH_OR_LENGTH_MISMATCH")

    def test_wrong_handoff_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path, receipt, lineage, job = make_dispatched(folder)
            receipt["canonical_handoff"]["job_id"] = str(uuid.uuid4())
            path.write_bytes(compact(receipt) + b"\n")
            with self.assertRaises(dispatch.ReceiptRejected) as caught:
                validation._validate_dispatched_receipt(path, registry(), job)
        self.assertEqual(caught.exception.code, "CANONICAL_HANDOFF_MISMATCH")

    def test_name_candidate_never_resolves_identity(self):
        receipt = pending_fixture()
        receipt["envelope"]["entities"]["person_candidates"].append({
            "candidate_key": "candidate-1", "canonical_id_hint": str(uuid.uuid4()),
            "attributes": {"canonical_name": "Example Person"}, "evidence_keys": [receipt["envelope"]["evidence"][0]["evidence_key"]],
            "identity_resolution_required": True,
        })
        receipt["result_content_hash"] = hashlib.sha256(compact(receipt["envelope"])).hexdigest()
        with tempfile.TemporaryDirectory() as folder:
            path, live_receipt, lineage, job = make_dispatched(folder, receipt)
            live, checked = validation._validate_dispatched_receipt(path, registry(), job)
            result = validation._evaluate(SourceCursor(), live, checked, job, datetime.now(timezone.utc))
        self.assertEqual(result["identity_disposition"]["state"], "NEEDS_IDENTITY_RESOLUTION")
        self.assertFalse(result["identity_disposition"]["resolved"])
        self.assertEqual(result["validation_disposition"], "NEEDS_MORE_EVIDENCE")

    def test_invalid_observation_time_never_establishes_current_tenure(self):
        receipt = pending_fixture()
        receipt["envelope"]["currentness"]["current_as_of"] = "not-a-date"
        receipt["result_content_hash"] = hashlib.sha256(compact(receipt["envelope"])).hexdigest()
        with tempfile.TemporaryDirectory() as folder:
            path, live_receipt, lineage, job = make_dispatched(folder, receipt)
            live, checked = validation._validate_dispatched_receipt(path, registry(), job)
            result = validation._evaluate(SourceCursor(), live, checked, job, datetime.now(timezone.utc))
        self.assertEqual(result["currentness_disposition"]["state"], "NEEDS_CURRENTNESS_REVIEW")
        self.assertFalse(result["currentness_disposition"]["tenure_effective_period_established"])

    def test_result_acceptance_is_attempt_fenced_and_never_authorizes_truth(self):
        with tempfile.TemporaryDirectory() as folder:
            path, receipt, lineage, job = make_dispatched(folder)
            live, checked = validation._validate_dispatched_receipt(path, registry(), job)
            result = validation._evaluate(SourceCursor(), live, checked, job, datetime.now(timezone.utc))
        run = {"worker_key": validation.WORKER_KEY, "status": "succeeded", "metadata": result}
        self.assertTrue(validation._result_valid(job, run))
        changed = json.loads(json.dumps(result)); changed["attempt_token"] = "b" * 64
        self.assertFalse(validation._result_valid(job, {"worker_key": validation.WORKER_KEY, "status": "succeeded", "metadata": changed}))
        changed = json.loads(json.dumps(result)); changed["publication_allowed"] = True
        self.assertFalse(validation._result_valid(job, {"worker_key": validation.WORKER_KEY, "status": "succeeded", "metadata": changed}))


if __name__ == "__main__":
    unittest.main()
