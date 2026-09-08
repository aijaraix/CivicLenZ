from __future__ import annotations

import unittest

from workers.seats.catalog import (
    CONSTITUTIONAL_OFFICES,
    all_expected_seats,
    coverage_gaps,
    expected_count_summary,
    load_counties,
)
from workers.seats.ids import queue_style_seat_key, seat_id_for_key


class FloridaExpectedCatalogTests(unittest.TestCase):
    def test_known_counts_only(self) -> None:
        summary = expected_count_summary()
        self.assertEqual(summary["usPresident"], 1)
        self.assertEqual(summary["usVicePresident"], 1)
        self.assertEqual(summary["floridaUsSenate"], 2)
        self.assertEqual(summary["floridaUsHouse"], 28)
        self.assertEqual(summary["floridaStatewideExecutive"], 5)
        self.assertEqual(summary["floridaSenate"], 40)
        self.assertEqual(summary["floridaHouse"], 120)
        self.assertEqual(summary["counties"], 67)
        self.assertEqual(summary["countyConstitutionalOfficesPerCounty"], 5)
        self.assertEqual(summary["countyConstitutionalSeats"], 335)
        self.assertEqual(summary["expectedSeats"], 532)
        self.assertEqual(summary["coverageGapRows"], 335)

    def test_seat_ids_are_uuidv5_of_seat_key(self) -> None:
        governor_key = queue_style_seat_key("Governor of Florida", None)
        self.assertEqual(governor_key, "fl-governor-of-florida-at-large")
        self.assertEqual(seat_id_for_key(governor_key), seat_id_for_key(governor_key))
        seats = {seat["seatKey"]: seat for seat in all_expected_seats()}
        self.assertEqual(seats[governor_key]["seatId"], seat_id_for_key(governor_key))
        self.assertEqual(seats[governor_key]["occupancyStatus"], "unknown")
        self.assertIsNone(seats[governor_key]["currentPersonId"])
        self.assertEqual(seats["fl-united-states-representative-20"]["occupancyStatus"], "unknown")
        self.assertEqual(seats["fl-florida-state-representative-district-78-78"]["occupancyStatus"], "unknown")
        self.assertEqual(seats["fl-florida-state-representative-district-113-113"]["occupancyStatus"], "unknown")
        self.assertEqual(len(seats), 532)

    def test_coverage_gaps_do_not_invent_counts(self) -> None:
        gaps = coverage_gaps()
        self.assertEqual(len(gaps), 67 * 5)
        self.assertTrue(all(gap["expectedCountStatus"] == "expected_count_unknown" for gap in gaps))
        self.assertTrue(all(gap["expectedCount"] is None for gap in gaps))
        self.assertNotIn("county_commission", {office for office, _ in CONSTITUTIONAL_OFFICES})
        counties = load_counties()
        self.assertEqual(len(counties), 67)
        self.assertIn("Miami-Dade", counties)
        self.assertIn("Broward", counties)
        self.assertIn("Palm Beach", counties)


if __name__ == "__main__":
    unittest.main()
