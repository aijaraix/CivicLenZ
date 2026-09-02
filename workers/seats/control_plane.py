#!/usr/bin/env python3
"""Count persisted CivicLenZ seat-ledger files. Every number is a file or row count."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
SEATS_ROOT = ROOT / "data" / "seats"
OCCUPANCY_ROOT = ROOT / "data" / "operations" / "florida" / "occupancy-candidates"
COVERAGE_ROOT = ROOT / "data" / "operations" / "florida" / "coverage-gaps"
LEDGER_PATH = ROOT / "data" / "operations" / "control-plane" / "florida-seat-ledger.json"

LEVELS = (
    "federal",
    "state",
    "county",
    "school_district",
    "municipal",
    "special_district",
    "judicial",
)
REGIONS = ("miami_dade", "broward", "palm_beach", "remaining", "statewide", "national")
METRICS = (
    "expected",
    "discovered",
    "verified",
    "currentOccupancies",
    "baselineResearch",
    "baselineComplete",
    "monitoring",
)


def read_json_files(directory: Path) -> list[tuple[Path, dict[str, Any]]]:
    if not directory.exists():
        return []
    records: list[tuple[Path, dict[str, Any]]] = []
    for path in sorted(directory.rglob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(payload, dict):
            records.append((path, payload))
    return records


def empty_metric_block() -> dict[str, int]:
    return {metric: 0 for metric in METRICS}


def add_metric(block: dict[str, int], metric: str, amount: int = 1) -> None:
    block[metric] = block.get(metric, 0) + amount


def count_ledger(root: Path = ROOT) -> dict[str, Any]:
    seats = read_json_files(root / "data" / "seats")
    occupancy = read_json_files(root / "data" / "operations" / "florida" / "occupancy-candidates")
    gaps = read_json_files(root / "data" / "operations" / "florida" / "coverage-gaps")

    totals = empty_metric_block()
    by_level = {level: empty_metric_block() for level in LEVELS}
    by_region = {region: empty_metric_block() for region in REGIONS}

    for _path, seat in seats:
        level = str(seat.get("governmentLevel") or "other")
        region = str(seat.get("coverageRegion") or "remaining")
        if level not in by_level:
            by_level[level] = empty_metric_block()
        if region not in by_region:
            by_region[region] = empty_metric_block()

        if seat.get("ledgerStatus") == "expected":
            add_metric(totals, "expected")
            add_metric(by_level[level], "expected")
            add_metric(by_region[region], "expected")
        elif seat.get("ledgerStatus") == "discovered":
            add_metric(totals, "discovered")
            add_metric(by_level[level], "discovered")
            add_metric(by_region[region], "discovered")

        if seat.get("ledgerStatus") == "verified" or seat.get("occupancyVerificationStatus") == "VERIFIED":
            add_metric(totals, "verified")
            add_metric(by_level[level], "verified")
            add_metric(by_region[region], "verified")

        if (seat.get("monitoring") or {}).get("active") is True:
            add_metric(totals, "monitoring")
            add_metric(by_level[level], "monitoring")
            add_metric(by_region[region], "monitoring")

        # Baseline complete is a count of seats whose persisted occupancy is
        # independently verified and whose canonical reviewed profile exists.
        if seat.get("occupancyVerificationStatus") == "VERIFIED" and seat.get("ledgerStatus") == "verified":
            add_metric(totals, "baselineComplete")
            add_metric(by_level[level], "baselineComplete")
            add_metric(by_region[region], "baselineComplete")

    occupancy_by_level: Counter[str] = Counter()
    occupancy_by_region: Counter[str] = Counter()
    seats_by_key = {str(seat["seatKey"]): seat for _path, seat in seats}

    for _path, candidate in occupancy:
        level = str(candidate.get("governmentLevel") or "")
        mapped = candidate.get("mappedExpectedSeatKey") or candidate.get("seatKey")
        seat = seats_by_key.get(str(mapped) if mapped else "")
        region = str((seat or {}).get("coverageRegion") or "statewide")
        if candidate.get("sourceKind") == "profile_research_queue":
            add_metric(totals, "baselineResearch")
            if level in by_level:
                add_metric(by_level[level], "baselineResearch")
            if region in by_region:
                add_metric(by_region[region], "baselineResearch")
            occupancy_by_level[level] += 0
        if candidate.get("verificationStatus") == "VERIFIED":
            add_metric(totals, "verified")
            if level in by_level:
                add_metric(by_level[level], "verified")
            if region in by_region:
                add_metric(by_region[region], "verified")
        if candidate.get("candidateKind") == "person_officeholder":
            add_metric(totals, "currentOccupancies")
            if level in by_level:
                add_metric(by_level[level], "currentOccupancies")
            if region in by_region:
                add_metric(by_region[region], "currentOccupancies")
            occupancy_by_level[level] += 1
            occupancy_by_region[region] += 1

    return {
        "schemaVersion": "1.0.0",
        "source": "persisted_files",
        "truthRule": "Every number equals a count of persisted JSON files or rows. 0 is valid. Recovered is not VERIFIED.",
        "totals": totals,
        "byLevel": by_level,
        "byRegion": {key: by_region[key] for key in REGIONS if key in by_region},
        "fileCounts": {
            "expectedSeatFiles": sum(1 for _path, seat in seats if seat.get("ledgerStatus") == "expected"),
            "discoveredSeatFiles": sum(1 for _path, seat in seats if seat.get("ledgerStatus") == "discovered"),
            "occupancyCandidateFiles": len(occupancy),
            "coverageGapFiles": len(gaps),
            "seatFiles": len(seats),
        },
        "coverageGaps": {
            "rows": len(gaps),
            "expectedCountUnknown": sum(
                1 for _path, gap in gaps if gap.get("expectedCountStatus") == "expected_count_unknown"
            ),
            "byRegion": dict(
                Counter(str(gap.get("coverageRegion") or "remaining") for _path, gap in gaps)
            ),
            "byOfficeFamily": dict(Counter(str(gap.get("officeFamily") or "unknown") for _path, gap in gaps)),
        },
    }


def write_ledger(payload: dict[str, Any], path: Path = LEDGER_PATH) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path
