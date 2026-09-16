"""Regression: exercise the actual observer tick and its persisted health view."""
import contextlib
import io
import json
import os
from pathlib import Path
import sqlite3
import sys
import tempfile
import time
import types
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import observer


class ObserverModesTest(unittest.TestCase):
    def test_planning_does_not_overwrite_dispatch_and_health_reports_same_mode(self):
        for state in ("DELIVERED_AWAITING_WORKER", "BOUNDED_CANARY_BUDGET", "DISPATCH_GATED"):
            with self.subTest(state=state), tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "state.sqlite3"
                planner = types.SimpleNamespace(reconcile=lambda: {"state": "GAPS_PERSISTED"})
                dispatcher = types.SimpleNamespace(tick=lambda governor: {"state": state})
                snapshot = {"observed_at": time.time(), "mode": "OBSERVATION_NO_DISPATCH",
                    "governor": {"reasons": [], "dispatch_enabled": True, "dispatch_limit": 1},
                    "receiver_health": True, "local_receipt_files": 0}
                with patch.dict(os.environ, {"HERMES_PLAN_GAPS": "true", "HERMES_ROUTE_CONTRACTS": "true"}), \
                     patch.dict(sys.modules, {"gap_planner": planner, "contract_dispatcher": dispatcher}), \
                     patch.object(sys, "argv", ["observer", "--state", str(path)]), \
                     patch.object(observer, "observe", return_value=snapshot), \
                     patch.object(observer, "watch_receipts", return_value=None), \
                     patch.object(observer.signal, "signal"), \
                     patch.object(observer.time, "sleep", side_effect=KeyboardInterrupt):
                    with self.assertRaises(KeyboardInterrupt):
                        observer.main()
                with sqlite3.connect(path) as db:
                    saved = json.loads(db.execute("SELECT snapshot FROM observations").fetchone()[0])
                self.assertEqual(saved["canonical_dispatch"], state)
                self.assertEqual(saved["gap_detector"]["state"], "GAPS_PERSISTED")
                self.assertEqual(saved["mode"], "GAP_PLANNING_AND_BOUNDED_CONTRACT_ROUTING")
                output = io.StringIO()
                with patch.object(sys, "argv", ["observer", "--state", str(path), "--health"]), \
                     contextlib.redirect_stdout(output), self.assertRaises(SystemExit) as exited:
                    observer.main()
                self.assertEqual(exited.exception.code, 0)
                self.assertEqual(json.loads(output.getvalue())["mode"], saved["mode"])

    def test_receipt_handoff_uses_prime_loop_and_consumes_single_governor_allowance(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "state.sqlite3"
            calls = []
            receipt_dispatcher = types.SimpleNamespace(tick=lambda spool, governor: {
                "state": "RECEIPT_CANONICAL_HANDOFF_PROVEN_VALIDATION_WORKER_GAP",
                "eligible_receipts_observed": 1, "durable_handoffs": 1})
            contract_dispatcher = types.SimpleNamespace(
                tick=lambda governor: calls.append(dict(governor)) or {"state": "RESOURCE_GATED"})
            gap_planner = types.SimpleNamespace(reconcile=lambda: {"state": "PARTIAL"})
            snapshot = {"observed_at": time.time(), "mode": "OBSERVATION_NO_DISPATCH",
                "governor": {"reasons": [], "dispatch_enabled": True, "dispatch_limit": 1},
                "receiver_health": True, "local_receipt_files": 1,
                "canonical_dispatch": "RECEIPT_DISPATCH_ENABLED_PENDING_TICK",
                "canonical_work_ledger": "EXISTING_HERMES_LEDGER_PENDING_RECEIPT_HANDOFF"}
            with patch.dict(os.environ, {"HERMES_PRODUCER_RECEIPT_DISPATCH": "true",
                                        "HERMES_ROUTE_CONTRACTS": "true",
                                        "HERMES_PLAN_GAPS": "true"}, clear=True), \
                 patch.dict(sys.modules, {"producer_receipt_dispatch": receipt_dispatcher,
                                          "contract_dispatcher": contract_dispatcher,
                                          "gap_planner": gap_planner}), \
                 patch.object(sys, "argv", ["observer", "--state", str(path), "--spool", directory]), \
                 patch.object(observer, "observe", return_value=snapshot), \
                 patch.object(observer, "watch_receipts", return_value=None), \
                 patch.object(observer.signal, "signal"), \
                 patch.object(observer.time, "sleep", side_effect=KeyboardInterrupt):
                with self.assertRaises(KeyboardInterrupt):
                    observer.main()
            with sqlite3.connect(path) as db:
                saved = json.loads(db.execute("SELECT snapshot FROM observations").fetchone()[0])
            self.assertEqual(saved["canonical_dispatch"],
                             "RECEIPT_CANONICAL_HANDOFF_PROVEN_VALIDATION_WORKER_GAP")
            self.assertEqual(saved["canonical_work_ledger"],
                             "RECEIPT_HANDOFF_DURABLE_VALIDATION_WORKER_GAP")
            self.assertEqual(saved["governor"]["receipt_dispatch_consumed_allowance"], 1)
            self.assertEqual(calls[0]["dispatch_limit"], 0)
            self.assertTrue(saved["mode"].endswith("_AND_PRODUCER_RECEIPT_HANDOFF"))
