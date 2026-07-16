#!/usr/bin/env python3
"""Collect current Florida House members into review-only staging JSON.

The official directory places each current member's name, party, district,
represented counties, and service dates inside the member-profile link. Former
members from the same legislative term also appear below the current roster, so
records with a resigned, deceased, removed, or expelled status are excluded from
the current-officeholder baseline and can be collected by a separate history job.
"""

from __future__ import annotations

import argparse
import re
import sys
import uuid
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Tag

from workers.ingestion.common import fetch, sha256_bytes, slugify, utc_now, write_json_records

SOURCE_URL = "https://www.flhouse.gov/Representatives"
SOURCE_KEY = "florida-house-members"
NAMESPACE = uuid.UUID("3ef20442-bf4d-4a0c-a58e-138b521ce595")
MEMBER_LINK_PATTERN = re.compile(
    r"/(?:Sections/)?Representatives/(?:Details|details\.aspx)$",
    re.IGNORECASE,
)
ENTRY_PATTERN = re.compile(
    r"^(?P<name>.+?)\s+"
    r"(?P<party>Republican|Democrat(?:ic)?|No Party Affiliation|Independent)\s+"
    r"[—-]\s*District:\s*(?P<district>\d{1,3})\s*"
    r"(?P<counties>.*?)\s+"
    r"(?P<start>\d{2}/\d{2}/\d{2})\s*-\s*(?P<end>\d{2}/\d{2}/\d{2})"
    r"(?:\s*\((?P<status>[^)]+)\))?$",
    re.IGNORECASE,
)
INACTIVE_STATUSES = {"resigned", "deceased", "removed", "expelled"}


def clean_text(value: str) -> str:
    return " ".join(value.split())


def normalize_party(value: str | None) -> str | None:
    if not value:
        return None
    lowered = value.casefold()
    if lowered.startswith("republican"):
        return "Republican"
    if lowered.startswith("democrat"):
        return "Democrat"
    if lowered.startswith("no party"):
        return "No Party Affiliation"
    if lowered.startswith("independent"):
        return "Independent"
    return value.strip()


def is_member_link(link: Tag) -> bool:
    href = str(link.get("href", ""))
    return bool(MEMBER_LINK_PATTERN.fullmatch(urlparse(href).path))


def member_id_from_url(url: str) -> str | None:
    values = parse_qs(urlparse(url).query)
    for key in ("MemberId", "memberId", "memberid"):
        if values.get(key):
            return values[key][0]
    return None


def parse_entry_text(text: str) -> dict[str, str | None] | None:
    match = ENTRY_PATTERN.fullmatch(clean_text(text))
    if not match:
        return None
    status = clean_text(match.group("status") or "") or None
    return {
        "name": clean_text(match.group("name")),
        "party": normalize_party(match.group("party")),
        "district": str(int(match.group("district"))),
        "counties": clean_text(match.group("counties")) or None,
        "start": match.group("start"),
        "end": match.group("end"),
        "status": status,
    }


def parse_directory(
    html: str,
    source_hash: str,
    fetched_at: str,
    minimum_records: int = 115,
) -> list[dict[str, object]]:
    soup = BeautifulSoup(html, "lxml")
    records: list[dict[str, object]] = []
    seen_member_urls: set[str] = set()
    seen_districts: set[str] = set()
    matched_member_links = 0
    inactive_entries = 0
    unparsed_samples: list[str] = []

    for link in soup.find_all("a", href=True):
        if not is_member_link(link):
            continue
        matched_member_links += 1

        source_member_url = urljoin(SOURCE_URL, str(link.get("href", "")))
        if source_member_url in seen_member_urls:
            continue

        raw_text = clean_text(link.get_text(" ", strip=True))
        parsed = parse_entry_text(raw_text)
        if not parsed:
            if raw_text:
                unparsed_samples.append(raw_text[:300])
            continue

        status = str(parsed["status"] or "").casefold()
        if any(marker in status for marker in INACTIVE_STATUSES):
            inactive_entries += 1
            continue

        district = str(parsed["district"])
        display_name = str(parsed["name"])
        if district in seen_districts:
            raise RuntimeError(f"Duplicate current Florida House district {district} found while parsing {display_name}.")

        seen_districts.add(district)
        seen_member_urls.add(source_member_url)
        member_id = member_id_from_url(source_member_url)
        stable_key = f"florida-house|district-{district}|{member_id or source_member_url}"

        records.append(
            {
                "candidateRecordVersion": "1.0.0",
                "stagingRecordId": str(uuid.uuid5(NAMESPACE, stable_key)),
                "sourceKey": SOURCE_KEY,
                "sourceUrl": SOURCE_URL,
                "sourceMemberUrl": source_member_url,
                "sourceSnapshotSha256": source_hash,
                "fetchedAt": fetched_at,
                "extractionStatus": "extracted_unreviewed",
                "recordKind": "person_officeholder",
                "displayName": display_name,
                "officeTitle": f"Florida State Representative, District {district}",
                "governmentLevel": "state",
                "branch": "legislative",
                "chamber": "house",
                "jurisdictionName": "Florida",
                "stateCode": "FL",
                "districtNumber": district,
                "partyName": parsed["party"],
                "countyDescription": parsed["counties"],
                "serviceStartDateText": parsed["start"],
                "serviceEndDateText": parsed["end"],
                "externalMemberId": member_id,
                "canonicalMatchStatus": "unmatched",
                "refreshClass": "term_based",
                "rawRowText": raw_text,
            }
        )

    records.sort(key=lambda item: int(str(item["districtNumber"])))
    if len(records) < minimum_records or len(records) > 120:
        title = soup.title.get_text(" ", strip=True) if soup.title else "no-title"
        samples = " || ".join(unparsed_samples[:3]) or "none"
        raise RuntimeError(
            f"Extracted {len(records)} current Florida House seats from {matched_member_links} member links; "
            f"expected between {minimum_records} and 120. Inactive term entries skipped: {inactive_entries}. "
            f"Page title: {title!r}. First unparsed samples: {samples}."
        )
    return records


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("data/staging/florida/state-house"))
    args = parser.parse_args()

    fetched_at = utc_now()
    response = fetch(SOURCE_URL)
    records = parse_directory(response.text, sha256_bytes(response.content), fetched_at)
    count = write_json_records(
        records,
        args.output,
        lambda record: (
            f"district-{int(str(record['districtNumber'])):03d}-"
            f"{slugify(str(record['displayName']))}.json"
        ),
    )
    print(f"Wrote {count} review-only Florida House staging records to {args.output}")
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
