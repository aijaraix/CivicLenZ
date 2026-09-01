#!/usr/bin/env python3
"""Deterministic CivicLenZ identifiers for elected seats and related records.

seatId is UUIDv5 of seatKey under a fixed namespace. Do not generate random
seat IDs. Do not special-case any person by name.
"""

from __future__ import annotations

import re
import uuid

# Fixed namespaces. Changing these would rewrite every persisted seatId.
SEAT_NAMESPACE = uuid.UUID("3c8e0b6a-2f71-4d94-9a12-6e4c8b1d0f35")
JURISDICTION_NAMESPACE = uuid.UUID("4d9f1c7b-3a82-4e05-8b23-7f5d9c2e1046")
OCCUPANCY_NAMESPACE = uuid.UUID("5e0a2d8c-4b93-4f16-9c34-8a6e0d3f2157")
PERSON_CANDIDATE_NAMESPACE = uuid.UUID("6f1b3e9d-5c04-4027-ad45-9b7f1e403268")
COVERAGE_GAP_NAMESPACE = uuid.UUID("701c4fae-6d15-4138-be56-0c802f514379")
PORTRAIT_JOB_NAMESPACE = uuid.UUID("812d50bf-7e26-4249-cf67-1d913062548a")


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "unknown"


def seat_key(*parts: str) -> str:
    return slugify("-".join(part for part in parts if part))


def queue_style_seat_key(office_title: str, district_number: str | None) -> str:
    """Match florida-profile-research-queue seatKey construction."""
    return slugify(f"fl-{office_title}-{district_number or 'at-large'}")


def seat_id_for_key(seat_key_value: str) -> str:
    return str(uuid.uuid5(SEAT_NAMESPACE, seat_key_value))


def jurisdiction_id_for_key(jurisdiction_key: str) -> str:
    return str(uuid.uuid5(JURISDICTION_NAMESPACE, jurisdiction_key))


def occupancy_id_for_key(occupancy_key: str) -> str:
    return str(uuid.uuid5(OCCUPANCY_NAMESPACE, occupancy_key))


def person_candidate_id(display_name: str, seat_key_value: str) -> str:
    return str(uuid.uuid5(PERSON_CANDIDATE_NAMESPACE, f"{display_name}|{seat_key_value}"))


def coverage_gap_id(gap_key: str) -> str:
    return str(uuid.uuid5(COVERAGE_GAP_NAMESPACE, gap_key))


def portrait_job_id(official_id: str, source_page: str) -> str:
    return str(uuid.uuid5(PORTRAIT_JOB_NAMESPACE, f"{official_id}|{source_page}"))
