from __future__ import annotations

import json
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

from workers.seats.catalog import expected_count_summary
from workers.seats.control_plane import count_ledger
from workers.seats.ids import queue_style_seat_key, seat_id_for_key
from workers.seats.recover_occupancy import recover_occupancy_candidates

ROOT = Path(__file__).resolve().parents[1]
SEATS_ROOT = ROOT / "data" / "seats"
OCCUPANCY_ROOT = ROOT / "data" / "operations" / "florida" / "occupancy-candidates"
COVERAGE_ROOT = ROOT / "data" / "operations" / "florida" / "coverage-gaps"
LEDGER_PATH = ROOT / "data" / "operations" / "control-plane" / "florida-seat-ledger.json"
SEAT_SCHEMA = ROOT / "schemas" / "elected-seat.schema.json"
OFFICIALS_ROOT = ROOT / "data" / "officials"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


class FloridaSeatRegistryPersistenceTests(unittest.TestCase):
    def test_persisted_seat_counts_match_catalog_and_files(self) -> None:
        summary = expected_count_summary()
        seat_files = list(SEATS_ROOT.rglob("*.json"))
        occupancy_files = list(OCCUPANCY_ROOT.rglob("*.json"))
        gap_files = list(COVERAGE_ROOT.rglob("*.json"))
        self.assertEqual(len(seat_files), summary["expectedSeats"])
        self.assertEqual(len(seat_files), 532)
        self.assertEqual(len(occupancy_files), 192)
        self.assertEqual(len(gap_files), 335)
        ledger = load(LEDGER_PATH)
        live = count_ledger(ROOT)
        self.assertEqual(ledger["totals"], live["totals"])
        self.assertEqual(ledger["fileCounts"], live["fileCounts"])
        self.assertEqual(live["totals"]["expected"], len(seat_files))
        self.assertEqual(live["totals"]["discovered"], 0)
        self.assertEqual(live["totals"]["verified"], 0)
        self.assertEqual(live["totals"]["baselineResearch"], 192)
        self.assertEqual(live["totals"]["baselineComplete"], 0)
        self.assertEqual(live["totals"]["monitoring"], 0)
        self.assertEqual(live["totals"]["currentOccupancies"], 191)
        self.assertEqual(live["byRegion"]["miami_dade"]["expected"], 5)
        self.assertEqual(live["byRegion"]["broward"]["expected"], 5)
        self.assertEqual(live["byRegion"]["palm_beach"]["expected"], 5)
        self.assertEqual(live["byRegion"]["remaining"]["expected"], 64 * 5)
        self.assertEqual(live["byLevel"]["federal"]["expected"], 32)
        self.assertEqual(live["byLevel"]["state"]["expected"], 165)
        self.assertEqual(live["byLevel"]["county"]["expected"], 335)

    def test_seats_validate_and_use_uuidv5_seat_ids(self) -> None:
        schema = load(SEAT_SCHEMA)
        validator = Draft202012Validator(schema, format_checker=FormatChecker())
        for path in SEATS_ROOT.rglob("*.json"):
            payload = load(path)
            errors = list(validator.iter_errors(payload))
            self.assertEqual(errors, [], msg=f"{path}: {errors[:1]}")
            self.assertEqual(payload["seatId"], seat_id_for_key(payload["seatKey"]))
            self.assertEqual(payload["occupancyStatus"], "unknown")
            self.assertEqual(payload["schemaVersion"], "1.0.0")

        governor = load(SEATS_ROOT / "florida" / "state" / "fl-governor-of-florida-at-large.json")
        self.assertEqual(governor["seatKey"], queue_style_seat_key("Governor of Florida", None))
        self.assertIsNotNone(governor["currentPersonId"])
        self.assertEqual(governor["occupancyVerificationStatus"], "RECOVERED")

        house78 = load(SEATS_ROOT / "florida" / "state" / "fl-florida-state-representative-district-78-78.json")
        house113 = load(SEATS_ROOT / "florida" / "state" / "fl-florida-state-representative-district-113-113.json")
        self.assertIsNone(house78["currentPersonId"])
        self.assertIsNone(house113["currentPersonId"])
        self.assertEqual(house78["occupancyVerificationStatus"], "UNKNOWN")

        house20 = load(SEATS_ROOT / "florida" / "federal" / "fl-united-states-representative-20.json")
        self.assertEqual(house20["occupancyStatus"], "unknown")
        self.assertIsNone(house20["currentPersonId"])

    def test_recovered_queue_tasks_are_not_verified(self) -> None:
        candidates = recover_occupancy_candidates()
        self.assertEqual(len(candidates), 192)
        self.assertTrue(all(item["verificationStatus"] == "RECOVERED" for item in candidates))
        vacancy = next(item for item in candidates if item["candidateKind"] == "office_vacancy")
        self.assertEqual(vacancy["mappedExpectedSeatKey"], "fl-united-states-representative-20")
        senate = [item for item in candidates if item["seatKey"] == "fl-united-states-senator-at-large"]
        self.assertEqual(len(senate), 2)
        self.assertTrue(all(item["mappingStatus"] == "ambiguous_multi_seat_office" for item in senate))
        canonical = [item for item in candidates if item["canonicalRecordExists"]]
        self.assertEqual(len(canonical), 1)
        self.assertEqual(canonical[0]["officeTitle"], "Governor of Florida")

    def test_public_officials_remain_reviewed_only(self) -> None:
        officials = list(OFFICIALS_ROOT.rglob("*.json"))
        self.assertEqual(len(officials), 1)
        payload = load(officials[0])
        self.assertEqual(payload["person"]["displayName"], "Ron DeSantis")
        occupancy_names = {load(path).get("displayName") for path in OCCUPANCY_ROOT.rglob("*.json")}
        self.assertIn("Aaron Bean", occupancy_names)
        self.assertNotIn("Aaron Bean", {payload["person"]["displayName"]})


if __name__ == "__main__":
    unittest.main()
