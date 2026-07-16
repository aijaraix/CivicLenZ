#!/usr/bin/env python3
"""Collect current U.S. senators from the official Senate XML directory."""

from __future__ import annotations

import argparse
import sys
import uuid
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

from workers.ingestion.common import fetch, sha256_bytes, slugify, utc_now, write_json_records

SOURCE_URL = "https://www.senate.gov/general/contact_information/senators_cfm.xml"
SOURCE_KEY = "us-senate-members"
NAMESPACE = uuid.UUID("bc156848-1967-4b80-bcf0-81dbff0470b9")
PARTIES = {"D": "Democratic", "R": "Republican", "I": "Independent"}


def field(member: ET.Element, *names: str) -> str | None:
    for name in names:
        value = member.findtext(name)
        if value and value.strip():
            return " ".join(value.split())
    return None


def parse_directory(xml_content: bytes, source_hash: str, fetched_at: str, minimum_records: int = 95) -> list[dict[str, object]]:
    root = ET.fromstring(xml_content)
    records: list[dict[str, object]] = []
    seen_ids: set[str] = set()

    for member in root.findall(".//member"):
        first_name = field(member, "first_name", "firstname")
        last_name = field(member, "last_name", "lastname")
        full_name = field(member, "member_full", "full_name")
        display_name = full_name or " ".join(part for part in (first_name, last_name) if part)
        state_code = field(member, "state")
        party_code = field(member, "party")
        bioguide_id = field(member, "bioguide_id", "bioguide")
        website = field(member, "website")

        if not display_name or not state_code:
            continue

        stable_key = bioguide_id or f"{state_code}|{display_name}|senate"
        staging_id = str(uuid.uuid5(NAMESPACE, stable_key))
        if staging_id in seen_ids:
            raise RuntimeError(f"Duplicate Senate staging identity found for {display_name}")
        seen_ids.add(staging_id)

        record: dict[str, object] = {
            "candidateRecordVersion": "1.0.0",
            "stagingRecordId": staging_id,
            "sourceKey": SOURCE_KEY,
            "sourceUrl": SOURCE_URL,
            "sourceMemberUrl": website or "https://www.senate.gov/senators/",
            "sourceSnapshotSha256": source_hash,
            "fetchedAt": fetched_at,
            "extractionStatus": "extracted_unreviewed",
            "recordKind": "person_officeholder",
            "displayName": display_name,
            "firstName": first_name,
            "lastName": last_name,
            "officeTitle": "United States Senator",
            "governmentLevel": "federal",
            "branch": "legislative",
            "chamber": "senate",
            "jurisdictionName": "United States",
            "stateCode": state_code,
            "partyCode": party_code,
            "partyName": PARTIES.get(party_code or "", party_code),
            "senateClass": field(member, "class"),
            "leadershipPosition": field(member, "leadership_position"),
            "officeAddress": field(member, "address"),
            "phone": field(member, "phone"),
            "email": field(member, "email"),
            "bioguideId": bioguide_id,
            "canonicalMatchStatus": "unmatched",
            "refreshClass": "term_based",
            "rawSourceRecord": {child.tag: " ".join((child.text or "").split()) for child in member if child.text},
        }
        records.append(record)

    records.sort(key=lambda item: (str(item.get("stateCode") or ""), str(item.get("displayName") or "")))
    if len(records) < minimum_records or len(records) > 105:
        raise RuntimeError(
            f"Extracted {len(records)} Senate members; expected between {minimum_records} and 105. "
            "The official XML layout or source content may have changed."
        )
    return records


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("data/staging/federal/us-senate"))
    args = parser.parse_args()

    fetched_at = utc_now()
    response = fetch(SOURCE_URL, accept="application/xml,text/xml;q=0.9,*/*;q=0.8")
    records = parse_directory(response.content, sha256_bytes(response.content), fetched_at)
    count = write_json_records(
        records,
        args.output,
        lambda record: f"{str(record['stateCode']).lower()}-{slugify(str(record['displayName']))}.json",
    )
    print(f"Wrote {count} review-only U.S. Senate staging records to {args.output}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except requests.RequestException as exc:
        print(f"Source retrieval failed: {exc}", file=sys.stderr)
        raise SystemExit(2)
    except Exception as exc:
        print(f"Collection failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
