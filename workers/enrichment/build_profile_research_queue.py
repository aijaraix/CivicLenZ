#!/usr/bin/env python3
"""Build a deterministic research queue for every currently indexed Florida seat/term.

The queue keeps every public profile section explicit even before enrichment begins.
It is operational metadata, not a source of public factual claims.
"""

from __future__ import annotations

import argparse
import json
import re
import uuid
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = ROOT / "data" / "operations" / "florida-profile-research-queue.json"
NAMESPACE = uuid.UUID("97e6de0f-24bb-4586-9789-b6913e42e7ca")

RESEARCH_SECTIONS = [
    "seat_and_occupancy",
    "portrait_and_identity",
    "contact_and_public_channels",
    "biography_education_military_career",
    "election_and_term_history",
    "committees_leadership_appointments",
    "campaign_promises",
    "quotes_and_statements",
    "actions_decisions_bills_votes",
    "campaign_finance",
    "civic_scores_and_performance",
    "maha_tracker",
    "doge_government_efficiency_tracker",
    "border_immigration_tracker",
    "energy_independence_tracker",
    "trade_tariffs_tracker",
    "education_school_choice_tracker",
    "fraud_integrity_tracker",
    "financial_disclosures",
    "ethics_integrity_legal",
    "relationships_endorsements_conflicts",
    "news_and_real_time_activity",
    "sources_archives_methodology",
]


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "unknown"


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def staging_records() -> list[dict[str, Any]]:
    roots = [
        ROOT / "data" / "staging" / "florida" / "state-house",
        ROOT / "data" / "staging" / "florida" / "state-senate",
        ROOT / "data" / "staging" / "florida" / "statewide-executive",
        ROOT / "data" / "staging" / "federal" / "us-house",
        ROOT / "data" / "staging" / "federal" / "us-senate",
    ]
    records: list[dict[str, Any]] = []
    for root in roots:
        if not root.exists():
            continue
        for path in sorted(root.glob("*.json")):
            record = read_json(path)
            if record.get("recordKind") == "vacancy":
                continue
            if record.get("stateCode") != "FL":
                continue
            if record.get("extractionStatus") != "extracted_unreviewed":
                continue
            records.append(record)
    return records


def canonical_records() -> list[dict[str, Any]]:
    root = ROOT / "data" / "officials"
    records: list[dict[str, Any]] = []
    if not root.exists():
        return records
    for path in sorted(root.rglob("*.json")):
        record = read_json(path)
        if record.get("recordStatus") in {"duplicate", "archived", "former"}:
            continue
        if record.get("jurisdiction", {}).get("stateCode") != "FL":
            continue
        records.append(record)
    return records


def normalize_staging_name(record: dict[str, Any]) -> str:
    first = record.get("firstName")
    last = record.get("lastName")
    if first and last:
        return f"{first} {last}".strip()
    display = str(record.get("displayName", "Unknown")).strip()
    if "," in display:
        last_name, rest = [part.strip() for part in display.split(",", 1)]
        return f"{rest} {last_name}".strip()
    return display


def record_key(display_name: str, office_title: str, district_number: str | None) -> str:
    return slugify(f"{display_name}|{office_title}|{district_number or 'at-large'}")


def section_state(has_portrait: bool, is_canonical: bool) -> list[dict[str, Any]]:
    sections = []
    for index, section in enumerate(RESEARCH_SECTIONS, start=1):
        status = "pending"
        if section == "seat_and_occupancy":
            status = "baseline_collected"
        elif section == "portrait_and_identity" and has_portrait:
            status = "candidate_collected"
        elif section == "sources_archives_methodology":
            status = "baseline_collected"
        sections.append(
            {
                "sectionKey": section,
                "priority": index,
                "status": status,
                "humanReviewRequired": section not in {"seat_and_occupancy"},
                "publicationGate": "evidence_and_review" if section not in {"seat_and_occupancy", "sources_archives_methodology"} else "official_source",
                "canonicalRecordExists": is_canonical,
            }
        )
    return sections


def build_queue() -> dict[str, Any]:
    tasks: dict[str, dict[str, Any]] = {}
    timestamps: list[str] = []

    for record in staging_records():
        display_name = normalize_staging_name(record)
        office_title = str(record.get("officeTitle", "Unknown office"))
        district_number = record.get("districtNumber")
        key = record_key(display_name, office_title, district_number)
        fetched_at = str(record.get("fetchedAt", ""))
        if fetched_at:
            timestamps.append(fetched_at)
        tasks[key] = {
            "taskId": str(uuid.uuid5(NAMESPACE, key)),
            "seatKey": slugify(f"fl-{office_title}-{district_number or 'at-large'}"),
            "displayName": display_name,
            "officeTitle": office_title,
            "governmentLevel": record.get("governmentLevel"),
            "branch": record.get("branch"),
            "chamber": record.get("chamber"),
            "districtNumber": district_number,
            "sourceKey": record.get("sourceKey"),
            "sourceUrl": record.get("sourceMemberUrl") or record.get("sourceUrl"),
            "sourceSnapshotSha256": record.get("sourceSnapshotSha256"),
            "lastBaselineCollectedAt": fetched_at or None,
            "researchStage": "baseline_collected",
            "portraitStatus": "pending_official_or_licensed_source",
            "sections": section_state(False, False),
        }

    for record in canonical_records():
        person = record.get("person", {})
        office = record.get("office", {})
        display_name = str(person.get("displayName", "Unknown"))
        office_title = str(office.get("title", "Unknown office"))
        district_number = office.get("districtNumber")
        key = record_key(display_name, office_title, district_number)
        last_updated = str(record.get("lastUpdatedAt", ""))
        if last_updated:
            timestamps.append(last_updated)
        tasks[key] = {
            "taskId": str(uuid.uuid5(NAMESPACE, key)),
            "seatKey": slugify(f"fl-{office_title}-{district_number or 'at-large'}"),
            "displayName": display_name,
            "officeTitle": office_title,
            "governmentLevel": office.get("governmentLevel"),
            "branch": office.get("branch"),
            "chamber": office.get("chamber"),
            "districtNumber": district_number,
            "sourceKey": record.get("sourceKey", "canonical-profile"),
            "sourceUrl": record.get("sourceMemberUrl") or record.get("sourceUrl") or next((item.get("url") for item in record.get("websites", []) if item.get("type") == "official"), None),
            "sourceSnapshotSha256": record.get("sourceSnapshotSha256"),
            "lastBaselineCollectedAt": record.get("lastTrackedAt") or last_updated or None,
            "researchStage": "reviewed_profile",
            "portraitStatus": "collected" if person.get("portraitUrl") else "pending_official_or_licensed_source",
            "sections": section_state(bool(person.get("portraitUrl")), True),
        }

    ordered_tasks = sorted(tasks.values(), key=lambda task: (str(task.get("governmentLevel")), str(task.get("officeTitle")), str(task.get("displayName"))))
    generated_at = max(timestamps) if timestamps else None
    return {
        "queueVersion": "1.0.0",
        "jurisdiction": "Florida",
        "strategy": "seat_first_evidence_preserving",
        "generatedFromLatestSourceAt": generated_at,
        "taskCount": len(ordered_tasks),
        "requiredSectionCountPerSeat": len(RESEARCH_SECTIONS),
        "tasks": ordered_tasks,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    queue = build_queue()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(queue, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {queue['taskCount']} Florida seat research tasks to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
