#!/usr/bin/env python3
"""Map Miami-Dade directory rows onto expected county seats.

The PDF may name the mayor, commission, and constitutional officers. Only the
five constitutional at-large offices are expected seats. Named mayor/commission
rows become occupancy candidates with expected_seat_missing; they are never
promoted to data/officials and never invent commission seat counts.
"""

from __future__ import annotations

from typing import Any, Iterable

from workers.seats.ids import occupancy_id_for_key, person_candidate_id, queue_style_seat_key


def occupancy_candidates_from_named_offices(
    records: Iterable[dict[str, Any]],
    expected_seat_keys: set[str],
    *,
    created_at: str | None = None,
) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    for record in records:
        office_title = str(record.get("officeTitle") or "")
        district = record.get("districtNumber")
        display_name = str(record.get("displayName") or "")
        seat_key = queue_style_seat_key(office_title, str(district) if district else None)
        expected = seat_key in expected_seat_keys
        mapping_status = "unique_seat" if expected else "expected_seat_missing"
        occupancy_key = f"collector|{seat_key}|{record.get('stagingRecordId')}|{display_name}"
        candidates.append(
            {
                "schemaVersion": "1.0.0",
                "occupancyCandidateId": occupancy_id_for_key(occupancy_key),
                "seatId": None,
                "seatKey": seat_key,
                "mappedExpectedSeatKey": seat_key if expected else None,
                "mappingStatus": mapping_status,
                "verificationStatus": "RECOVERED",
                "candidateKind": "person_officeholder",
                "displayName": display_name,
                "officeTitle": office_title,
                "governmentLevel": record.get("governmentLevel"),
                "districtNumber": district,
                "personCandidateId": person_candidate_id(display_name, seat_key),
                "canonicalPersonId": None,
                "canonicalRecordExists": False,
                "sourceKind": "collector_named_office",
                "sourceKey": record.get("sourceKey"),
                "sourceUrl": record.get("sourceUrl"),
                "sourceSnapshotSha256": record.get("sourceSnapshotSha256"),
                "recoveredFrom": None,
                "queueTaskId": None,
                "portraitStatus": None,
                "notes": (
                    "Named in the Miami-Dade Supervisor of Elections directory. "
                    "Not independently VERIFIED. Not published to data/officials."
                ),
                "createdAt": created_at or record.get("fetchedAt"),
            }
        )
    return candidates
