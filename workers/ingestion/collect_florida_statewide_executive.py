#!/usr/bin/env python3
"""Collect Florida's independently elected statewide cabinet officers.

The Governor already has a canonical CivicLenZ seed profile, so this baseline
collector focuses on the other statewide elected cabinet offices currently
confirmed by their official agency websites. Each source is fetched and its
expected officeholder name is asserted before a review-only record is written.
"""

from __future__ import annotations

import sys
import uuid
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from workers.ingestion.common import fetch, sha256_bytes, slugify, utc_now, write_json_records

SOURCE_KEY = "florida-statewide-executive"
NAMESPACE = uuid.UUID("0ef18967-8314-4ce1-837a-b5991f006460")
DEFAULT_OUTPUT = Path("data/staging/florida/statewide-executive")

OFFICES = (
    {
        "displayName": "James Uthmeier",
        "firstName": "James",
        "lastName": "Uthmeier",
        "officeTitle": "Attorney General of Florida",
        "sourceUrl": "https://www.myfloridalegal.com/",
        "requiredPhrases": ("Attorney General James Uthmeier", "State of Florida"),
    },
    {
        "displayName": "Blaise Ingoglia",
        "firstName": "Blaise",
        "lastName": "Ingoglia",
        "officeTitle": "Chief Financial Officer of Florida",
        "sourceUrl": "https://www.myfloridacfo.com/",
        "requiredPhrases": ("Chief Financial Officer Blaise Ingoglia", "State of Florida"),
    },
    {
        "displayName": "Wilton Simpson",
        "firstName": "Wilton",
        "lastName": "Simpson",
        "officeTitle": "Commissioner of Agriculture of Florida",
        "sourceUrl": "https://www.fdacs.gov/",
        "requiredPhrases": ("Commissioner Wilton Simpson", "Florida Department of Agriculture"),
    },
)


def visible_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    return " ".join(soup.get_text(" ", strip=True).split())


def parse_office_source(
    office: dict[str, object],
    html: str,
    source_hash: str,
    fetched_at: str,
) -> dict[str, object]:
    text = visible_text(html)
    required_phrases = tuple(str(value) for value in office["requiredPhrases"])
    missing = [phrase for phrase in required_phrases if phrase.casefold() not in text.casefold()]
    if missing:
        raise RuntimeError(
            f"Official source {office['sourceUrl']} did not contain required phrases: {', '.join(missing)}"
        )

    stable_id = str(uuid.uuid5(NAMESPACE, str(office["sourceUrl"])))
    return {
        "candidateRecordVersion": "1.0.0",
        "stagingRecordId": stable_id,
        "sourceKey": SOURCE_KEY,
        "sourceUrl": office["sourceUrl"],
        "sourceMemberUrl": office["sourceUrl"],
        "sourceSnapshotSha256": source_hash,
        "fetchedAt": fetched_at,
        "extractionStatus": "extracted_unreviewed",
        "recordKind": "person_officeholder",
        "displayName": office["displayName"],
        "firstName": office["firstName"],
        "lastName": office["lastName"],
        "officeTitle": office["officeTitle"],
        "governmentLevel": "state",
        "branch": "executive",
        "chamber": None,
        "jurisdictionName": "Florida",
        "stateCode": "FL",
        "districtNumber": None,
        "partyName": None,
        "canonicalMatchStatus": "unmatched",
        "refreshClass": "term_based",
        "rawSourceRecord": {
            "requiredPhrases": list(required_phrases),
            "officialSource": office["sourceUrl"],
        },
    }


def collect(output_dir: Path = DEFAULT_OUTPUT) -> int:
    fetched_at = utc_now()
    records: list[dict[str, object]] = []

    for office in OFFICES:
        response = fetch(str(office["sourceUrl"]))
        records.append(
            parse_office_source(
                office,
                response.text,
                sha256_bytes(response.content),
                fetched_at,
            )
        )

    return write_json_records(
        records,
        output_dir,
        lambda record: f"{slugify(str(record['officeTitle']))}-{slugify(str(record['displayName']))}.json",
    )


def main() -> int:
    count = collect()
    if count != len(OFFICES):
        raise RuntimeError(f"Collected {count} statewide executive records; expected {len(OFFICES)}")
    print(f"Wrote {count} Florida statewide executive staging records to {DEFAULT_OUTPUT}")
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
