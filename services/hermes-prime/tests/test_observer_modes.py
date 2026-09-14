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
