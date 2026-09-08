#!/usr/bin/env python3
"""Persist Florida expected seats, coverage gaps, recovered occupancy, and the control-plane ledger.

This worker never writes data/officials. Occupancy candidates recovered from the
research queue remain RECOVERED.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Iterable

from workers.ingestion.common import utc_now
from workers.seats.catalog import all_expected_seats, coverage_gaps, expected_count_summary, slugify
from workers.seats.control_plane import count_ledger, write_ledger
from workers.seats.recover_occupancy import apply_recovered_occupancy_to_seats, recover_occupancy_candidates

ROOT = Path(__file__).resolve().parents[2]
SEATS_ROOT = ROOT / "data" / "seats" / "florida"
OCCUPANCY_ROOT = ROOT / "data" / "operations" / "florida" / "occupancy-candidates"
COVERAGE_ROOT = ROOT / "data" / "operations" / "florida" / "coverage-gaps"
OFFICIALS_ROOT = ROOT / "data" / "officials"


def seat_path(seat: dict[str, Any]) -> Path:
    level = str(seat["governmentLevel"])
    if level == "county":
        county_slug = slugify(str(seat.get("jurisdictionName") or "county").replace(" County", ""))
        return SEATS_ROOT / "county" / county_slug / f"{seat['seatKey']}.json"
    if level == "federal":
        return SEATS_ROOT / "federal" / f"{seat['seatKey']}.json"
    return SEATS_ROOT / "state" / f"{seat['seatKey']}.json"


def occupancy_path(candidate: dict[str, Any]) -> Path:
    name = slugify(str(candidate.get("displayName") or "unknown"))
    return OCCUPANCY_ROOT / f"{candidate['seatKey']}--{name}.json"


def coverage_path(gap: dict[str, Any]) -> Path:
    return COVERAGE_ROOT / f"{gap['gapKey']}.json"


def write_records(records: Iterable[dict[str, Any]], path_for) -> list[Path]:
    written: list[Path] = []
    materialized = list(records)
    expected: set[Path] = set()
    parents: set[Path] = set()
    for record in materialized:
        path = path_for(record)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        written.append(path)
        expected.add(path)
        parents.add(path.parent)

    roots = {OCCUPANCY_ROOT, COVERAGE_ROOT, SEATS_ROOT}
    scan_roots = set(parents)
    scan_roots.update(root for root in roots if root.exists())
    for directory in scan_roots:
        for old in directory.glob("*.json"):
            if old not in expected and old.parent in parents:
                old.unlink()
    return written


def stamp_seats(seats: list[dict[str, Any]], declared_at: str) -> list[dict[str, Any]]:
    stamped = []
    for seat in seats:
        record = dict(seat)
        record["createdAt"] = declared_at
        record["lastUpdatedAt"] = declared_at
        stamped.append(record)
    return stamped


def build(declared_at: str | None = None) -> dict[str, Any]:
    declared = declared_at or utc_now()
    summary = expected_count_summary()
    seats = stamp_seats(all_expected_seats(), declared)
    candidates = recover_occupancy_candidates(expected_seats=seats, created_at=declared)
    seats = apply_recovered_occupancy_to_seats(seats, candidates)
    gaps = coverage_gaps()

    if any(OFFICIALS_ROOT in path.parents or path == OFFICIALS_ROOT for path in [SEATS_ROOT, OCCUPANCY_ROOT, COVERAGE_ROOT]):
        raise RuntimeError("Seat registry must not write under data/officials.")

    seat_files = write_records(seats, seat_path)
    occupancy_files = write_records(candidates, occupancy_path)
    gap_files = write_records(gaps, coverage_path)
    ledger = count_ledger(ROOT)
    ledger["declaredAt"] = declared
    ledger["catalogSummary"] = summary
    write_ledger(ledger)

    if len(seat_files) != summary["expectedSeats"]:
        raise RuntimeError(f"Wrote {len(seat_files)} seat files, catalog expected {summary['expectedSeats']}.")
    if len(occupancy_files) != 192:
        raise RuntimeError(f"Wrote {len(occupancy_files)} occupancy files, expected 192 recovered queue tasks.")
    if len(gap_files) != summary["coverageGapRows"]:
        raise RuntimeError(f"Wrote {len(gap_files)} coverage-gap files, expected {summary['coverageGapRows']}.")
    if ledger["totals"]["expected"] != len(seat_files):
        raise RuntimeError("Control-plane expected count does not equal seat file count.")
    return ledger


def check() -> dict[str, Any]:
    summary = expected_count_summary()
    ledger = count_ledger(ROOT)
    errors: list[str] = []
    if ledger["fileCounts"]["expectedSeatFiles"] != summary["expectedSeats"]:
        errors.append(
            f"expected seat files {ledger['fileCounts']['expectedSeatFiles']} != catalog {summary['expectedSeats']}"
        )
    if ledger["fileCounts"]["occupancyCandidateFiles"] != 192:
        errors.append(
            f"occupancy files {ledger['fileCounts']['occupancyCandidateFiles']} != 192 recovered queue tasks"
        )
    if ledger["coverageGaps"]["rows"] != summary["coverageGapRows"]:
        errors.append(f"coverage-gap files {ledger['coverageGaps']['rows']} != catalog {summary['coverageGapRows']}")
    if ledger["totals"]["expected"] != ledger["fileCounts"]["expectedSeatFiles"]:
        errors.append("control-plane expected total does not equal expected seat file count")
    if errors:
        raise RuntimeError("Seat registry check failed: " + "; ".join(errors))
    return ledger


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Validate persisted files without rewriting them.")
    parser.add_argument("--declared-at", help="Stable createdAt timestamp for generated seats.")
    args = parser.parse_args()
    payload = check() if args.check else build(args.declared_at)
    print(json.dumps({"state": "ok", "fileCounts": payload["fileCounts"], "totals": payload["totals"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
