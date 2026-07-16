#!/usr/bin/env python3
"""Collect the President and Vice President from the official White House administration page."""

from __future__ import annotations

import argparse
import re
import sys
import uuid
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup, Tag

from workers.ingestion.common import fetch, sha256_bytes, slugify, utc_now, write_json_records

SOURCE_URL = "https://www.whitehouse.gov/administration/"
SOURCE_KEY = "white-house-administration"
NAMESPACE = uuid.UUID("77dcb278-f43a-494f-b4c1-717a6158b683")
OFFICES = ("President", "Vice President")


def heading_candidates(soup: BeautifulSoup) -> list[Tag]:
    headings = list(soup.find_all(["h1", "h2", "h3"]))
    if headings:
        return headings
    return list(soup.find_all("a", href=True))


def parse_administration(html: str, source_hash: str, fetched_at: str) -> list[dict[str, object]]:
    soup = BeautifulSoup(html, "lxml")
    found: dict[str, dict[str, object]] = {}

    for node in heading_candidates(soup):
        text = " ".join(node.get_text(" ", strip=True).split())
        for office in OFFICES:
            if office in found or not re.match(rf"^{re.escape(office)}\b", text, re.IGNORECASE):
                continue
            display_name = re.sub(rf"^{re.escape(office)}\s+", "", text, flags=re.IGNORECASE).strip()
            if not display_name:
                continue
            link = node.find("a", href=True) if node.name != "a" else node
            member_url = urljoin(SOURCE_URL, str(link.get("href"))) if link and link.get("href") else SOURCE_URL
            found[office] = {
                "candidateRecordVersion": "1.0.0",
                "stagingRecordId": str(uuid.uuid5(NAMESPACE, office.casefold())),
                "sourceKey": SOURCE_KEY,
                "sourceUrl": SOURCE_URL,
                "sourceMemberUrl": member_url,
                "sourceSnapshotSha256": source_hash,
                "fetchedAt": fetched_at,
                "extractionStatus": "extracted_unreviewed",
                "recordKind": "person_officeholder",
                "displayName": display_name,
                "officeTitle": f"{office} of the United States",
                "governmentLevel": "federal",
                "branch": "executive",
                "jurisdictionName": "United States",
                "canonicalMatchStatus": "unmatched",
                "refreshClass": "term_based",
                "rawHeadingText": text,
            }

    missing = [office for office in OFFICES if office not in found]
    if missing:
        raise RuntimeError(f"Could not identify required White House offices: {', '.join(missing)}")
    return [found[office] for office in OFFICES]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("data/staging/federal/executive"))
    args = parser.parse_args()

    fetched_at = utc_now()
    response = fetch(SOURCE_URL)
    records = parse_administration(response.text, sha256_bytes(response.content), fetched_at)
    count = write_json_records(
        records,
        args.output,
        lambda record: f"{slugify(str(record['officeTitle']))}-{slugify(str(record['displayName']))}.json",
    )
    print(f"Wrote {count} review-only federal executive staging records to {args.output}")
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
