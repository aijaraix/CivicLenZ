#!/usr/bin/env python3
"""Quality-control worker: control-plane counts must equal persisted file counts.

Fails closed. Does not publish. Does not promote staging into data/officials.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

from workers.seats.catalog import expected_count_summary
from workers.seats.control_plane import LEDGER_PATH, ROOT, count_ledger

SEAT_SCHEMA = ROOT / "schemas" / "elected-seat.schema.json"
OCCUPANCY_SCHEMA = ROOT / "schemas" / "occupancy-candidate.schema.json"
COVERAGE_SCHEMA = ROOT / "schemas" / "coverage-gap.schema.json"
OFFICIALS_ROOT = ROOT / "data" / "officials"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def validate_tree(directory: Path, schema_path: Path) -> list[str]:
    if not directory.exists():
        return [f"missing directory {directory}"]
    schema = load_json(schema_path)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    errors: list[str] = []
    for path in sorted(directory.rglob("*.json")):
        data = load_json(path)
        for error in sorted(validator.iter_errors(data), key=lambda item: list(item.path)):
            location = ".".join(str(part) for part in error.path) or "<root>"
            errors.append(f"{path}:{location}: {error.message}")
    return errors


def public_officials_have_no_unreviewed_staging() -> list[str]:
    errors: list[str] = []
    names = []
    for path in sorted(OFFICIALS_ROOT.rglob("*.json")):
        payload = load_json(path)
        names.append(payload.get("person", {}).get("displayName"))
        if "staging" in path.parts:
            errors.append(f"{path} is under data/officials but looks like a staging path")
        if payload.get("extractionStatus") == "extracted_unreviewed":
            errors.append(f"{path} is an unreviewed staging record inside data/officials")
    if "Ron DeSantis" not in names:
        errors.append("Reviewed canonical official list no longer includes the completeness-test fixture profile")
    return errors


def run_quality_control() -> dict:
    summary = expected_count_summary()
    live = count_ledger(ROOT)
    stored = load_json(LEDGER_PATH) if LEDGER_PATH.exists() else None
    errors: list[str] = []

    if live["totals"]["expected"] != live["fileCounts"]["expectedSeatFiles"]:
        errors.append(
            f"EXPECTED {live['totals']['expected']} != expected seat files {live['fileCounts']['expectedSeatFiles']}"
        )
    if live["totals"]["discovered"] != live["fileCounts"]["discoveredSeatFiles"]:
        errors.append(
            f"DISCOVERED {live['totals']['discovered']} != discovered seat files {live['fileCounts']['discoveredSeatFiles']}"
        )
    if live["fileCounts"]["expectedSeatFiles"] != summary["expectedSeats"]:
        errors.append(
            f"expected seat files {live['fileCounts']['expectedSeatFiles']} != known-count catalog {summary['expectedSeats']}"
        )
    if live["fileCounts"]["occupancyCandidateFiles"] != 192:
        errors.append(
            f"occupancy files {live['fileCounts']['occupancyCandidateFiles']} != 192 recovered queue tasks"
        )
    if live["totals"]["baselineResearch"] != 192:
        errors.append(f"BASELINE RESEARCH {live['totals']['baselineResearch']} != 192 recovered queue rows")
    if live["coverageGaps"]["rows"] != live["coverageGaps"]["expectedCountUnknown"]:
        errors.append("coverage-gap row count does not equal expected_count_unknown rows")
    if stored and stored.get("totals") != live.get("totals"):
        errors.append("stored control-plane totals do not match a fresh count of persisted files")
    if stored and stored.get("fileCounts") != live.get("fileCounts"):
        errors.append("stored control-plane fileCounts do not match a fresh count of persisted files")

    errors.extend(validate_tree(ROOT / "data" / "seats", SEAT_SCHEMA))
    errors.extend(validate_tree(ROOT / "data" / "operations" / "florida" / "occupancy-candidates", OCCUPANCY_SCHEMA))
    errors.extend(validate_tree(ROOT / "data" / "operations" / "florida" / "coverage-gaps", COVERAGE_SCHEMA))
    errors.extend(public_officials_have_no_unreviewed_staging())

    house78 = ROOT / "data" / "seats" / "florida" / "state" / "fl-florida-state-representative-district-78-78.json"
    house113 = ROOT / "data" / "seats" / "florida" / "state" / "fl-florida-state-representative-district-113-113.json"
    for path in (house78, house113):
        if not path.exists():
            errors.append(f"missing expected vacant-occupancy House seat file {path.name}")
            continue
        payload = load_json(path)
        if payload.get("occupancyStatus") != "unknown":
            errors.append(f"{path.name} occupancyStatus must remain unknown")
        if payload.get("currentPersonId") is not None:
            errors.append(f"{path.name} must not receive a recovered occupant; the queue has no task for this district")

    return {
        "state": "error" if errors else "healthy",
        "errors": errors,
        "totals": live["totals"],
        "fileCounts": live["fileCounts"],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--markdown", action="store_true")
    args = parser.parse_args()
    report = run_quality_control()
    if args.markdown:
        lines = [
            "### CivicLenZ quality control",
            f"- State: **{report['state']}**",
            f"- Expected seats: **{report['fileCounts']['expectedSeatFiles']}**",
            f"- Occupancy candidates: **{report['fileCounts']['occupancyCandidateFiles']}**",
            f"- Coverage gaps: **{report['fileCounts']['coverageGapFiles']}**",
        ]
        if report["errors"]:
            lines.append("")
            lines.append("#### Errors")
            lines.extend(f"- {error}" for error in report["errors"])
        print("\n".join(lines))
    else:
        print(json.dumps(report, indent=2))
    return 1 if report["state"] == "error" else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Quality control failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
