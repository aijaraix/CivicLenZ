from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from workers.ingestion.collect_miami_dade import (
    DEFAULT_OUTPUT,
    attach_occupancy_candidates,
    ensure_review_only_output,
    ensure_staging_output,
    parse_directory,
)
from workers.seats.catalog import all_expected_seats, queue_style_seat_key
from workers.seats.miami_dade_occupancy import occupancy_candidates_from_named_offices

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests" / "fixtures" / "miami_dade_elected_officials.html"


class MiamiDadeOccupancyMappingTests(unittest.TestCase):
    def setUp(self) -> None:
        content = FIXTURE.read_bytes()
        self.records = parse_directory(content, hashlib.sha256(content).hexdigest(), "2026-09-02T00:00:00Z")
        self.expected_keys = {str(seat["seatKey"]) for seat in all_expected_seats()}

    def test_constitutional_officers_attach_to_expected_seats(self) -> None:
        candidates = occupancy_candidates_from_named_offices(self.records, self.expected_keys)
        by_title = {str(item["officeTitle"]): item for item in candidates}

        sheriff = by_title["Miami-Dade County Sheriff"]
        self.assertEqual(sheriff["mappingStatus"], "unique_seat")
        self.assertEqual(sheriff["seatKey"], queue_style_seat_key("Miami-Dade County Sheriff", None))
        self.assertIn(sheriff["seatKey"], self.expected_keys)
        self.assertEqual(sheriff["verificationStatus"], "RECOVERED")
        self.assertFalse(sheriff["canonicalRecordExists"])

        for title in (
            "Miami-Dade County Clerk of the Circuit Court and Comptroller",
            "Miami-Dade County Supervisor of Elections",
            "Miami-Dade County Tax Collector",
            "Miami-Dade County Property Appraiser",
        ):
            self.assertEqual(by_title[title]["mappingStatus"], "unique_seat")
            self.assertIn(by_title[title]["seatKey"], self.expected_keys)

    def test_mayor_and_commission_do_not_invent_expected_seats(self) -> None:
        candidates = occupancy_candidates_from_named_offices(self.records, self.expected_keys)
        mayor = next(item for item in candidates if item["officeTitle"] == "Mayor of Miami-Dade County")
        commission = [item for item in candidates if str(item["officeTitle"]).startswith("Miami-Dade County Commissioner")]
        self.assertEqual(mayor["mappingStatus"], "expected_seat_missing")
        self.assertNotIn(mayor["seatKey"], self.expected_keys)
        self.assertEqual(len(commission), 13)
        self.assertTrue(all(item["mappingStatus"] == "expected_seat_missing" for item in commission))
        self.assertTrue(all(item["seatKey"] not in self.expected_keys for item in commission))

    def test_collector_does_not_write_occupancy_under_officials(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "must not write under data/officials"):
            ensure_review_only_output(Path("data/officials/florida/local"))
        self.assertEqual(ensure_staging_output(DEFAULT_OUTPUT), DEFAULT_OUTPUT)
        with tempfile.TemporaryDirectory() as tmp:
            occupancy_dir = Path(tmp) / "staging" / "miami-dade-occupancy"
            written = attach_occupancy_candidates(self.records, occupancy_dir, "2026-09-02T00:00:00Z")
            self.assertEqual(written, 19)
            payload = json.loads(next(occupancy_dir.glob("*sheriff*.json")).read_text())
            self.assertEqual(payload["verificationStatus"], "RECOVERED")
            self.assertEqual(payload["sourceKind"], "collector_named_office")


if __name__ == "__main__":
    unittest.main()
