import base64
import contextlib
import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
import uuid
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import producer_receipt_dispatch as dispatch


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


def fixture(receipt_id=None):
    receipt_id = receipt_id or str(uuid.uuid4())
    raw = b"isolated non-civic producer receipt fixture"
    digest = hashlib.sha256(raw).hexdigest()
    envelope = {
        "contract_version": dispatch.CONTRACT_VERSION,
        "producer": {"producer_id": "civicslenzz-gemini-harvester", "producer_version": "test-v1",
                     "execution_id": str(uuid.uuid4())},
        "job": {"job_id": "producer-job-fixture", "research_work_identity": "fixture-research-work-identity"},
        "extraction_status": "extracted_unreviewed", "capability": "advance_research_harvest",
        "cohort": {"cohort_key": "fixture", "state": "HARVESTING"},
        "sources": [{"source_key": "source-fixture", "source_url": "https://example.org/official"}],
        "retrievals": [{"source_key": "source-fixture", "source_url": "https://example.org/official",
                        "retrieved_at": "2026-09-16T00:00:00Z", "content_hash": digest,
                        "mime_type": "application/octet-stream", "byte_length": len(raw),
                        "method": "fixture", "parser_version": "fixture-v1"}],
        "evidence": [{"evidence_key": "evidence-fixture", "source_url": "https://example.org/official",
                      "retrieved_at": "2026-09-16T00:00:00Z", "mime_type": "application/octet-stream",
                      "byte_length": len(raw), "sha256": digest,
                      "content_base64": base64.b64encode(raw).decode(), "method": "fixture",
                      "parser_version": "fixture-v1", "locator": "r2://fixture/object.raw"}],
        "entities": {key: [] for key in ("jurisdiction_candidates", "seat_candidates", "person_candidates",
                                           "occupancy_candidates", "election_candidates", "candidate_campaign_candidates")},
        "claims": [], "relationships": [], "dataset_units": [], "gis_boundaries": [],
        "warnings": [], "gaps": [], "currentness": {"current_as_of": "2026-09-16T00:00:00Z"},
        "monitoring_recommendations": [],
    }
    return {
        "receipt_version": dispatch.RECEIPT_VERSION, "receipt_id": receipt_id,
        "producer_id": envelope["producer"]["producer_id"], "producer_version": envelope["producer"]["producer_version"],
        "contract_version": dispatch.CONTRACT_VERSION, "job_id": envelope["job"]["job_id"],
        "research_work_identity": envelope["job"]["research_work_identity"],
        "result_content_hash": hashlib.sha256(compact(envelope)).hexdigest(), "idempotency_key": "fixture-idempotency",
        "received_at": "2026-09-16T00:01:00Z", "acknowledgement_state": "ACCEPTED_FOR_VALIDATION",
        "dispatch_state": "PENDING_CANONICAL_DISPATCH",
        "evidence": [{"evidence_key": "evidence-fixture", "declared_sha256": digest, "actual_sha256": digest,
                      "byte_length": len(raw), "integrity_state": "MATCH",
                      "local_spool_path": f"evidence/{digest}.bin"}],
        "envelope": envelope,
        "canary_authorization": {"authorization_id": receipt_id, "status": "CONSUMED", "use_count": 1},
    }


class Ledger:
    def __init__(self):
        self.needs = {}
        self.jobs = {}
        self.advisory = threading.Lock()
        self.statements = []
        self.fail_job_insert = False


class Cursor:
    def __init__(self, ledger):
        self.ledger = ledger
        self.result = None
        self.acquired = False

    def __enter__(self): return self
    def __exit__(self, *_): return False

    def execute(self, sql, args=()):
        self.ledger.statements.append(sql)
        if "pg_try_advisory_xact_lock" in sql:
            self.acquired = self.ledger.advisory.acquire(blocking=False)
            self.result = {"acquired": self.acquired}
        elif sql.startswith("INSERT INTO hermes_ops.research_needs"):
            need_id, need_key, target_id, reason, basis = args
            self.ledger.needs.setdefault(need_key, {"need_id": need_id, "need_key": need_key,
                "target_type": "producer_receipt", "target_id": target_id, "scope_key": "canonical_validation",
                "origin": "PRODUCER", "execution_class": "PRODUCTION", "state": "BLOCKED",
                "reason": reason, "basis": json.loads(basis)})
            self.result = None
        elif "FROM hermes_ops.research_needs WHERE need_key" in sql:
            self.result = self.ledger.needs.get(args[0])
        elif sql.startswith("INSERT INTO public.jobs"):
            if self.ledger.fail_job_insert:
                raise RuntimeError("isolated database failure")
            job_id, job_type, target_id, work, payload, need_id = args
            self.ledger.jobs.setdefault(work, {"job_id": job_id, "job_type": job_type,
                "target_type": "producer_receipt", "target_id": target_id, "status": "queued", "attempt_count": 0,
                "dedupe_key": work, "payload": json.loads(payload), "research_need_id": need_id})
            self.result = None
        elif "FROM public.jobs WHERE dedupe_key" in sql:
            self.result = self.ledger.jobs.get(args[0])
        elif "SELECT count(*) AS jobs FROM public.jobs" in sql:
            self.result = {"jobs": sum(1 for job in self.ledger.jobs.values()
                if job["job_type"] == args[0] and job["payload"].get("canonical_receipt_id") == args[1]
                and job["status"] in ("queued", "leased", "running"))}
        elif "SELECT count(*) AS handoffs" in sql:
            self.result = {"handoffs": len(self.ledger.jobs)}
        else:
            raise AssertionError(sql)

    def fetchone(self): return self.result


class Connection:
    def __init__(self, ledger):
        self.ledger = ledger
        self.cursor_value = None
    def __enter__(self):
        self.snapshot = (copy.deepcopy(self.ledger.needs), copy.deepcopy(self.ledger.jobs))
        return self
    def __exit__(self, exc_type, *_):
        if exc_type is not None:
            self.ledger.needs, self.ledger.jobs = self.snapshot
        if self.cursor_value and self.cursor_value.acquired:
            self.ledger.advisory.release()
        return False
    def cursor(self, **_):
        self.cursor_value = Cursor(self.ledger)
        return self.cursor_value


def connector(ledger):
    @contextlib.contextmanager
    def connect():
        yield Connection(ledger)
    return connect


class ProducerReceiptDispatchTests(unittest.TestCase):
    def setUp(self):
        cursor_patch = patch.object(dispatch, "_real_dict_cursor", return_value=object)
        cursor_patch.start()
        self.addCleanup(cursor_patch.stop)

    def write(self, folder, receipt):
        receipts = Path(folder) / "receipts"
        receipts.mkdir()
        path = receipts / f"{receipt['receipt_id']}.json"
        path.write_bytes(compact(receipt) + b"\n")
        return path

    def test_pending_receipt_creates_one_unreviewed_blocked_handoff_without_truth_writes(self):
        ledger = Ledger()
        with tempfile.TemporaryDirectory() as folder:
            original = fixture(); path = self.write(folder, original)
            with patch.object(dispatch, "connect_database", connector(ledger)):
                result = dispatch.dispatch_path(path, registry())
            live = json.loads(path.read_text())
        self.assertEqual(result["state"], "RECEIPT_CANONICAL_HANDOFF_PROVEN_VALIDATION_WORKER_GAP")
        self.assertEqual(live["dispatch_state"], "DISPATCHED")
        self.assertEqual(len(ledger.needs), 1); self.assertEqual(len(ledger.jobs), 1)
        job = next(iter(ledger.jobs.values()))
        self.assertEqual(job["payload"]["orchestration_authority"], "hermes")
        self.assertEqual(job["payload"]["execution_class"], "PRODUCTION")
        self.assertEqual(job["payload"]["classification"], "extracted_unreviewed")
        self.assertEqual(job["payload"]["publication_allowed"], False)
        self.assertEqual(job["attempt_count"], 0); self.assertEqual(job["status"], "queued")
        self.assertEqual(next(iter(ledger.needs.values()))["state"], "BLOCKED")
        sql = "\n".join(ledger.statements).lower()
        self.assertNotIn("insert into public.claims", sql)
        self.assertNotIn("insert into public.seat_occupancies", sql)
        self.assertNotIn("insert into public.people", sql)
        for key in ("evidence", "envelope", "acknowledgement_state", "canary_authorization", "result_content_hash"):
            self.assertEqual(live[key], original[key])

    def test_partially_accepted_unreviewed_evidence_dispatches_to_validation_without_truth_promotion(self):
        ledger = Ledger()
        with tempfile.TemporaryDirectory() as folder:
            receipt = fixture()
            receipt["acknowledgement_state"] = "PARTIALLY_ACCEPTED"
            receipt["envelope"]["gaps"] = ["CANONICAL_ENTITY_MAPPING_REQUIRED"]
            receipt["result_content_hash"] = hashlib.sha256(compact(receipt["envelope"])).hexdigest()
            path = self.write(folder, receipt)
            with patch.object(dispatch, "connect_database", connector(ledger)):
                result = dispatch.dispatch_path(path, registry())
            live = json.loads(path.read_text())
        self.assertEqual(result["state"], "RECEIPT_CANONICAL_HANDOFF_PROVEN_VALIDATION_WORKER_GAP")
        self.assertEqual(live["dispatch_state"], "DISPATCHED")
        self.assertEqual(live["acknowledgement_state"], "PARTIALLY_ACCEPTED")
        self.assertEqual(len(ledger.jobs), 1)
        job = next(iter(ledger.jobs.values()))
        self.assertEqual(job["payload"]["classification"], "extracted_unreviewed")
        self.assertEqual(job["payload"]["publication_allowed"], False)
        self.assertEqual(next(iter(ledger.needs.values()))["state"], "BLOCKED")
        sql = "\n".join(ledger.statements).lower()
        self.assertNotIn("insert into public.claims", sql)
        self.assertNotIn("insert into public.seat_occupancies", sql)
        self.assertNotIn("insert into public.people", sql)

    def test_database_commit_then_receipt_failure_is_restart_recoverable_without_duplicate(self):
        ledger = Ledger()
        with tempfile.TemporaryDirectory() as folder:
            receipt = fixture(); path = self.write(folder, receipt)
            real_transition = dispatch._atomic_receipt_transition
            with patch.object(dispatch, "connect_database", connector(ledger)), \
                 patch.object(dispatch, "_atomic_receipt_transition", side_effect=OSError("isolated write failure")):
                first = dispatch.dispatch_path(path, registry())
            self.assertEqual(first["state"], "CANONICAL_COMMITTED_RECEIPT_TRANSITION_PENDING")
            self.assertEqual(json.loads(path.read_text())["dispatch_state"], "PENDING_CANONICAL_DISPATCH")
            with patch.object(dispatch, "connect_database", connector(ledger)), \
                 patch.object(dispatch, "_atomic_receipt_transition", wraps=real_transition):
                second = dispatch.dispatch_path(path, registry())
            self.assertEqual(second["state"], "RECEIPT_CANONICAL_HANDOFF_PROVEN_VALIDATION_WORKER_GAP")
            self.assertEqual(json.loads(path.read_text())["dispatch_state"], "DISPATCHED")
        self.assertEqual(len(ledger.needs), 1); self.assertEqual(len(ledger.jobs), 1)

    def test_database_failure_is_dispatch_failed_and_bounded_recovery_can_succeed(self):
        ledger = Ledger(); ledger.fail_job_insert = True
        with tempfile.TemporaryDirectory() as folder:
            path = self.write(folder, fixture())
            with patch.object(dispatch, "connect_database", connector(ledger)):
                failed = dispatch.dispatch_path(path, registry())
            self.assertEqual(failed["state"], "RECEIPT_DISPATCH_FAILED_RECOVERABLE")
            self.assertEqual(json.loads(path.read_text())["dispatch_state"], "DISPATCH_FAILED")
            ledger.fail_job_insert = False
            with patch.object(dispatch, "connect_database", connector(ledger)):
                recovered = dispatch.dispatch_path(path, registry())
            self.assertEqual(recovered["state"], "RECEIPT_CANONICAL_HANDOFF_PROVEN_VALIDATION_WORKER_GAP")
        self.assertEqual(len(ledger.jobs), 1)

    def test_malformed_unsupported_and_integrity_mismatch_fail_closed(self):
        for mutation, expected in (
            (lambda receipt: (receipt.update(producer_id="unsupported"),
                              receipt["envelope"]["producer"].update(producer_id="unsupported")), "PRODUCER_NOT_AUTHORIZED"),
            (lambda receipt: (receipt.update(contract_version="V0"),
                              receipt["envelope"].update(contract_version="V0")), "CONTRACT_NOT_AUTHORIZED"),
            (lambda receipt: receipt["evidence"][0].update(byte_length=999), "EVIDENCE_HASH_OR_LENGTH_MISMATCH"),
        ):
            ledger = Ledger()
            with self.subTest(expected=expected), tempfile.TemporaryDirectory() as folder:
                receipt = fixture(); mutation(receipt); path = self.write(folder, receipt)
                with patch.object(dispatch, "connect_database", connector(ledger)):
                    result = dispatch.dispatch_path(path, registry())
                self.assertEqual(result["state"], "RECEIPT_REJECTED_FAIL_CLOSED")
                self.assertEqual(result["failure"], expected)
                self.assertEqual(json.loads(path.read_text())["dispatch_state"], "DISPATCH_FAILED")
                self.assertEqual(len(ledger.jobs), 0)
        with tempfile.TemporaryDirectory() as folder:
            receipts = Path(folder) / "receipts"; receipts.mkdir()
            path = receipts / f"{uuid.uuid4()}.json"; path.write_text("{not-json")
            result = dispatch.dispatch_path(path, registry())
            self.assertEqual(result["failure"], "RECEIPT_MALFORMED")
            self.assertTrue(path.with_name(path.name + ".dispatch-failure").exists())

    def test_concurrent_ticks_create_maximum_one_handoff_and_job(self):
        ledger = Ledger()
        with tempfile.TemporaryDirectory() as folder:
            path = self.write(folder, fixture())
            barrier = threading.Barrier(8)
            results = []
            def run():
                barrier.wait()
                results.append(dispatch.dispatch_path(path, registry()))
            with patch.object(dispatch, "connect_database", connector(ledger)):
                threads = [threading.Thread(target=run) for _ in range(8)]
                for thread in threads: thread.start()
                for thread in threads: thread.join()
            self.assertEqual(json.loads(path.read_text())["dispatch_state"], "DISPATCHED")
        self.assertEqual(len(ledger.needs), 1); self.assertEqual(len(ledger.jobs), 1)
        self.assertEqual(sum(r["state"] == "RECEIPT_CANONICAL_HANDOFF_PROVEN_VALIDATION_WORKER_GAP" for r in results), 1)

    def test_result_hash_and_classification_mutation_never_dispatch(self):
        for mutate, code in (
            (lambda receipt: receipt.update(result_content_hash="0" * 64), "RESULT_CONTENT_HASH_MISMATCH"),
            (lambda receipt: receipt["envelope"].update(extraction_status="verified"), "PRODUCER_CLASSIFICATION_INVALID"),
        ):
            with self.subTest(code=code), tempfile.TemporaryDirectory() as folder:
                receipt = fixture(); mutate(receipt); path = self.write(folder, receipt); ledger = Ledger()
                with patch.object(dispatch, "connect_database", connector(ledger)):
                    result = dispatch.dispatch_path(path, registry())
                self.assertEqual(result["failure"], code); self.assertEqual(len(ledger.jobs), 0)

    def test_malformed_nested_shape_is_a_durable_fail_closed_result(self):
        with tempfile.TemporaryDirectory() as folder:
            receipt = fixture()
            receipt["envelope"]["entities"] = []
            receipt["result_content_hash"] = hashlib.sha256(compact(receipt["envelope"])).hexdigest()
            path = self.write(folder, receipt); ledger = Ledger()
            with patch.object(dispatch, "connect_database", connector(ledger)):
                result = dispatch.dispatch_path(path, registry())
            self.assertEqual(result["failure"], "SUBJECT_CANDIDATES_INVALID")
            self.assertEqual(json.loads(path.read_text())["dispatch_state"], "DISPATCH_FAILED")
            self.assertEqual(len(ledger.jobs), 0)

    def test_resource_governor_requires_enablement_and_positive_allowance(self):
        config = {"enabled": True, "budget": 1, "max_attempts": 3, "registry": Path("fixture")}
        for governor in ({"dispatch_enabled": False, "dispatch_limit": 1},
                         {"dispatch_enabled": True, "dispatch_limit": 0}):
            with self.subTest(governor=governor), \
                 patch.object(dispatch, "settings", return_value=config), \
                 patch.object(dispatch, "load_registry", return_value=registry()), \
                 patch.object(dispatch, "_status", return_value={"durable_handoffs": 0}), \
                 patch.object(dispatch, "_candidate_paths") as candidates:
                self.assertEqual(dispatch.tick(Path("fixture"), governor)["state"], "RESOURCE_GATED")
                candidates.assert_not_called()


if __name__ == "__main__":
    unittest.main()
