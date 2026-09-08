import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("observer", Path(__file__).resolve().parents[1] / "services/hermes-prime/observer.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class ObserverTests(unittest.TestCase):
    def test_pressure_always_disables_dispatch(self):
        for memory, disk, load in [(1, 20*1024**3, 0), (4*1024**3, 1, 0), (4*1024**3, 20*1024**3, 5)]:
            result = m.governor(memory, disk, load, 4)
            self.assertEqual(result["state"], "PAUSE_NEW_WORK")
            self.assertFalse(result["dispatch_enabled"])

    def test_headroom_does_not_enable_dispatch(self):
        result = m.governor(4*1024**3, 20*1024**3, .2, 4)
        self.assertEqual(result["state"], "HEADROOM_AVAILABLE")
        self.assertEqual(result["dispatch_limit"], 0)

    def test_restart_preserves_observations_and_dedupes_academy(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "ops.sqlite3"
            data = {"observed_at": 1, "receiver_health": False, "local_receipt_files": 1,
                    "canonical_dispatch": "NOT_IMPLEMENTED", "governor": {"reasons": []}}
            db = m.database(path)
            m.persist(db, data, "STARTUP")
            db.close()
            db = m.database(path)
            data["observed_at"] = 2
            m.persist(db, data, "HEARTBEAT")
            self.assertEqual(db.execute("SELECT COUNT(*) FROM observations").fetchone()[0], 2)
            rows = db.execute("SELECT observations,state FROM academy_observations").fetchall()
            self.assertEqual(rows, [(2, "PROPOSED_REQUIRES_TEST"), (2, "PROPOSED_REQUIRES_TEST")])
            db.close()


if __name__ == "__main__":
    unittest.main()
