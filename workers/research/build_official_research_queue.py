#!/usr/bin/env python3
"""Build a seat-centered review queue from CivicLenZ source listings.

This utility never fetches websites, guesses facts, or publishes records. It turns
Florida House and Senate directory records already in protected staging into
review work items. Re-running it refreshes source metadata while preserving any
existing review status, notes, assignee, and evidence on each bundle.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import uuid
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
STAGING_ROOT = ROOT / "data" / "staging"
DEFAULT_OUTPUT_ROOT = ROOT / "data" / "review-queue"

FLORIDA_SOURCE_KEYS = {
    "florida-house-members",
    "florida-senate-members",
}

BUNDLE_TEMPLATES = (
    {
        "key": "seat_and_term",
        "title": "Seat, officeholder, and term",
        "fields": [
            "canonical person identity",
            "office and district",
            "current term dates",
            "seat-holder history",
        ],
        "preferredSources": [
            "Official legislative directory",
            "Official member page",
            "Official election or appointment record",
        ],
    },
    {
        "key": "official_channels",
        "title": "Official contact and public accounts",
        "fields": [
            "office phone, email, form, and location",
            "official website",
            "office, official, campaign, and public personal social accounts",
        ],
        "preferredSources": [
            "Official member page",
            "Official office contact page",
            "Official campaign website",
        ],
    },
    {
        "key": "portrait_and_biography",
        "title": "Portrait, biography, and public service",
        "fields": [
            "official portrait or clearly licensed public image",
            "official biography",
            "prior public roles, committees, and appointments",
        ],
        "preferredSources": [
            "Official biography page",
            "Legislative profile",
            "Official committee page",
        ],
    },
    {
        "key": "public_actions",
        "title": "Votes, actions, meetings, and documents",
        "fields": [
            "bills, votes, sponsorships, and committee actions",
            "official statements, agendas, meeting records, and documents",
        ],
        "preferredSources": [
            "Official legislative system",
            "Official meeting or committee records",
            "Official press and document archive",
        ],
    },
    {
        "key": "elections_and_finance",
        "title": "Election, finance, and disclosure records",
        "fields": [
            "election history and campaign committee links",
            "public campaign filings",
            "public financial disclosures where applicable",
        ],
        "preferredSources": [
            "Florida Division of Elections",
            "Florida Commission on Ethics",
            "Official filing portals and downloadable records",
        ],
    },
    {
        "key": "claims_promises_and_issues",
        "title": "Claims, promises, issue evidence, and methodology",
        "fields": [
            "verbatim statement or promise",
            "date, context, and source record",
            "supporting and conflicting evidence",
            "review history and scoring-method eligibility",
        ],
        "preferredSources": [
            "Official statements and campaign materials",
            "Official votes and actions",
            "Primary source documents",
        ],
    },
)


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"{path}: {exc}") from exc


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "official"


def human_name(value: str) -> str:
    parts = [part.strip() for part in value.split(",") if part.strip()]
    return f"{parts[1]} {parts[0]}" if len(parts) == 2 else value.strip()


def chamber_label(source_key: str) -> str:
    return "Florida House" if source_key == "florida-house-members" else "Florida Senate"


def queue_path(record: dict[str, Any], output_root: Path) -> Path:
    district = str(record.get("districtNumber") or "at-large")
    name = slugify(human_name(str(record.get("displayName") or "official")))
    chamber = "house" if record.get("sourceKey") == "florida-house-members" else "senate"
    return output_root / f"florida-{chamber}-{district}-{name}.json"


def existing_bundles(path: Path) -> dict[str, dict[str, Any]]:
    if not path.exists():
        return {}
    try:
        data = read_json(path)
    except ValueError:
        return {}
    bundles = data.get("researchBundles", [])
    return {
        str(bundle.get("key")): bundle
        for bundle in bundles
        if isinstance(bundle, dict) and bundle.get("key")
    }


def merged_bundle(template: dict[str, Any], previous: dict[str, Any] | None) -> dict[str, Any]:
    preserved = {}
    if previous:
        for key in ("status", "assignee", "reviewNotes", "evidence", "reviewedAt", "reviewDecision"):
            if key in previous:
                preserved[key] = previous[key]

    return {
        "key": template["key"],
        "title": template["title"],
        "status": "not_started",
        "reviewRequired": True,
        "fields": template["fields"],
        "preferredSources": template["preferredSources"],
        "publicationRule": "Publish only source-backed fields that pass human review.",
        **preserved,
    }


def queue_record(record: dict[str, Any], previous: dict[str, dict[str, Any]]) -> dict[str, Any]:
    source_key = str(record["sourceKey"])
    district = str(record.get("districtNumber") or "at-large")
    seat_key = f"{source_key}:{district}"
    stable_id = str(uuid.uuid5(uuid.NAMESPACE_URL, seat_key))
    bundles = [
        merged_bundle(template, previous.get(template["key"]))
        for template in BUNDLE_TEMPLATES
    ]

    return {
        "queueVersion": "1.0.0",
        "recordKind": "seat_research_queue",
        "queueId": stable_id,
        "queueStatus": "ready_for_enrichment",
        "publicationState": "not_public",
        "seat": {
            "seatKey": seat_key,
            "chamber": chamber_label(source_key),
            "officeTitle": record["officeTitle"],
            "districtNumber": record.get("districtNumber"),
            "jurisdictionName": record["jurisdictionName"],
            "stateCode": record.get("stateCode"),
            "governmentLevel": record.get("governmentLevel"),
        },
        "directoryListedOfficeholder": {
            "displayName": human_name(str(record["displayName"])),
            "partyName": record.get("partyName"),
            "countyDescription": record.get("countyDescription"),
        },
        "sourceRecord": {
            "stagingRecordId": record["stagingRecordId"],
            "sourceKey": source_key,
            "sourceUrl": record["sourceUrl"],
            "sourceMemberUrl": record.get("sourceMemberUrl"),
            "sourceSnapshotSha256": record["sourceSnapshotSha256"],
            "fetchedAt": record["fetchedAt"],
        },
        "researchBundles": bundles,
        "promotionGate": [
            "Confirm officeholder, office, district, and current term from primary sources.",
            "Retain a source URL, retrieval time, and source snapshot for every material field.",
            "Keep contact and social candidates unclassified until a supporting official or campaign source is reviewed.",
            "Do not publish promises, scores, claims, or sensitive records without documented methodology and evidence.",
            "Run data validation and the website build before promoting a canonical profile.",
        ],
    }


def source_records(source_keys: set[str]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for path in sorted(STAGING_ROOT.rglob("*.json")):
        record = read_json(path)
        if record.get("sourceKey") not in source_keys:
            continue
        if record.get("extractionStatus") != "extracted_unreviewed":
            continue
        required = ("stagingRecordId", "displayName", "officeTitle", "jurisdictionName", "sourceUrl", "sourceSnapshotSha256", "fetchedAt")
        if not all(record.get(key) for key in required):
            print(f"Skipping incomplete source listing: {path.relative_to(ROOT)}", file=sys.stderr)
            continue
        records.append(record)
    return records


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-key",
        action="append",
        choices=sorted(FLORIDA_SOURCE_KEYS),
        help="Limit the queue to one or more source keys. Defaults to Florida House and Senate.",
    )
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--dry-run", action="store_true", help="Report queued seats without writing files.")
    args = parser.parse_args()

    selected_sources = set(args.source_key or FLORIDA_SOURCE_KEYS)
    records = source_records(selected_sources)
    if not records:
        print("No matching unreviewed Florida source records found.", file=sys.stderr)
        return 1

    output_root = args.output_dir
    written = 0
    for record in records:
        destination = queue_path(record, output_root)
        prior = existing_bundles(destination)
        queue = queue_record(record, prior)
        if args.dry_run:
            print(destination.relative_to(ROOT) if destination.is_relative_to(ROOT) else destination)
            written += 1
            continue

        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(queue, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(destination.relative_to(ROOT) if destination.is_relative_to(ROOT) else destination)
        written += 1

    print(f"{written} seat research queue record(s) ready.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
