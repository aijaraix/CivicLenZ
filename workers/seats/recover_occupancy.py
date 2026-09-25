#!/usr/bin/env python3
"""Recover profile-research-queue tasks as RECOVERED occupancy candidates.

Recovered queue data is RECOVERED, not independently VERIFIED. HTTP 200 is not
verification. Canonical reviewed officials may supply a person id, but occupancy
on the seat remains unknown until independently verified.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from workers.seats.catalog import all_expected_seats
from workers.seats.ids import occupancy_id_for_key, person_candidate_id, queue_style_seat_key

ROOT = Path(__file__).resolve().parents[2]
QUEUE_PATH = ROOT / "data" / "operations" / "florida-profile-research-queue.json"
OFFICIALS_ROOT = ROOT / "data" / "officials"
RECOVERED_NOTE = (
    "Recovered from florida-profile-research-queue.json. Recovered queue data is "
    "RECOVERED, not independently VERIFIED."
)


def load_queue(path: Path = QUEUE_PATH) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    tasks = payload.get("tasks")
    if not isinstance(tasks, list) or len(tasks) != payload.get("taskCount"):
        raise RuntimeError("Research queue taskCount does not match persisted tasks.")
    return payload


def canonical_officials_by_seat_key(root: Path = OFFICIALS_ROOT) -> dict[str, dict[str, Any]]:
    matched: dict[str, dict[str, Any]] = {}
    if not root.exists():
        return matched
    for path in sorted(root.rglob("*.json")):
        record = json.loads(path.read_text(encoding="utf-8"))
        if record.get("recordStatus") in {"duplicate", "archived", "former"}:
            continue
        office = record.get("office") or {}
        title = str(office.get("title") or "")
        district = office.get("districtNumber")
        if not title:
            continue
        seat_key = queue_style_seat_key(title, district)
        matched[seat_key] = record
    return matched


def map_recovered_seat_key(task: dict[str, Any], expected_keys: set[str]) -> tuple[str | None, str]:
    recovered_key = str(task["seatKey"])
    if recovered_key == "fl-united-states-senator-at-large":
        return None, "ambiguous_multi_seat_office"
    if recovered_key.startswith("fl-vacant-united-states-house-seat-"):
        district = str(task.get("districtNumber") or "")
        mapped = queue_style_seat_key("United States Representative", district)
        if mapped in expected_keys:
            return mapped, "vacancy_mapped_to_expected_seat"
        return None, "expected_seat_missing"
    if recovered_key in expected_keys:
        return recovered_key, "unique_seat"
    return None, "expected_seat_missing"


def candidate_kind(task: dict[str, Any]) -> str:
    title = str(task.get("officeTitle") or "")
    name = str(task.get("displayName") or "")
    if title.lower().startswith("vacant") or name.lower().startswith("vacant"):
        return "office_vacancy"
    return "person_officeholder"


def recover_occupancy_candidates(
    *,
    queue_path: Path = QUEUE_PATH,
    expected_seats: list[dict[str, Any]] | None = None,
    officials_root: Path = OFFICIALS_ROOT,
    created_at: str | None = None,
) -> list[dict[str, Any]]:
    queue = load_queue(queue_path)
    seats = expected_seats if expected_seats is not None else all_expected_seats()
    expected_keys = {str(seat["seatKey"]) for seat in seats}
    canonical = canonical_officials_by_seat_key(officials_root)
    candidates: list[dict[str, Any]] = []

    for task in queue["tasks"]:
        recovered_key = str(task["seatKey"])
        mapped_key, mapping_status = map_recovered_seat_key(task, expected_keys)
        kind = candidate_kind(task)
        display_name = str(task.get("displayName") or "Unknown")
        occupancy_key = f"{recovered_key}|{task.get('taskId')}|{display_name}"
        mapped_official = canonical.get(mapped_key or "")
        canonical_record_exists = any(
            section.get("canonicalRecordExists") for section in task.get("sections") or []
        ) or bool(mapped_official)
        person_id = None
        canonical_person_id = None
        if kind == "person_officeholder":
            person_id = person_candidate_id(display_name, mapped_key or recovered_key)
            if mapped_official:
                canonical_person_id = mapped_official.get("canonicalPersonId") or mapped_official.get("officialId")
                person_id = canonical_person_id or person_id

        seat_id = None
        if mapped_key:
            seat_id = next(seat["seatId"] for seat in seats if seat["seatKey"] == mapped_key)

        candidates.append(
            {
                "schemaVersion": "1.0.0",
                "occupancyCandidateId": occupancy_id_for_key(occupancy_key),
                "seatId": seat_id,
                "seatKey": recovered_key,
                "mappedExpectedSeatKey": mapped_key,
                "mappingStatus": mapping_status,
                "verificationStatus": "RECOVERED",
                "candidateKind": kind,
                "displayName": display_name,
                "officeTitle": task.get("officeTitle"),
                "governmentLevel": task.get("governmentLevel"),
                "districtNumber": task.get("districtNumber"),
                "personCandidateId": person_id,
                "canonicalPersonId": canonical_person_id,
                "canonicalRecordExists": bool(canonical_record_exists),
                "sourceKind": "profile_research_queue",
                "sourceKey": task.get("sourceKey"),
                "sourceUrl": task.get("sourceUrl"),
                "sourceSnapshotSha256": task.get("sourceSnapshotSha256"),
                "recoveredFrom": "data/operations/florida-profile-research-queue.json",
                "queueTaskId": task.get("taskId"),
                "portraitStatus": task.get("portraitStatus"),
                "notes": RECOVERED_NOTE,
                "createdAt": created_at,
            }
        )

    if len(candidates) != 192:
        raise RuntimeError(f"Expected 192 recovered occupancy candidates, found {len(candidates)}.")
    return candidates


def apply_recovered_occupancy_to_seats(
    seats: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Attach recovered person ids without promoting occupancy to occupied or VERIFIED."""
    unique_people: dict[str, dict[str, Any]] = {}
    for candidate in candidates:
        mapped = candidate.get("mappedExpectedSeatKey")
        if candidate.get("mappingStatus") != "unique_seat" or not mapped:
            continue
        if candidate.get("candidateKind") != "person_officeholder":
            continue
        unique_people[str(mapped)] = candidate

    updated: list[dict[str, Any]] = []
    for seat in seats:
        record = dict(seat)
        candidate = unique_people.get(str(record["seatKey"]))
        if candidate:
            record["currentPersonId"] = candidate.get("canonicalPersonId") or candidate.get("personCandidateId")
            record["occupancyVerificationStatus"] = "RECOVERED"
        record["occupancyStatus"] = "unknown"
        updated.append(record)
    return updated
