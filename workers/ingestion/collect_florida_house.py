#!/usr/bin/env python3
"""Collect current Florida House members and vacancies into review-only staging JSON.

The live smoke test must confirm a near-complete 120-seat directory before the
collector is accepted for scheduled aggregation.
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
MEMBER_LINK_PATTERN = re.compile(r"/Representatives/(?:Details|details\.aspx)", re.IGNORECASE)
PARTY_PATTERN = re.compile(r"\b(Republican|Democrat(?:ic)?|No Party Affiliation|Independent)\b", re.IGNORECASE)
DISTRICT_PATTERN = re.compile(r"\bDistrict\s*(?:No\.?\s*)?(\d{1,3})\b", re.IGNORECASE)
COUNTY_PATTERN = re.compile(
    r"\b(?:Count(?:y|ies)(?:\s+Represented)?|Representing)\s*:?\s*(.+?)(?=\s+(?:District|Party|Capitol|Office|Contact|Phone|Email|Committees?|Biography)\b|$)",
    re.IGNORECASE,
)


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
    return bool(MEMBER_LINK_PATTERN.search(urlparse(href).path))


def member_id_from_url(url: str) -> str | None:
    values = parse_qs(urlparse(url).query)
    for key in ("MemberId", "memberId", "memberid"):
        if values.get(key):
            return values[key][0]
    match = re.search(r"(?:MemberId|memberId|memberid)[=/](\d+)", url)
    return match.group(1) if match else None


def candidate_container(link: Tag) -> Tag:
    """Find the smallest useful directory entry surrounding one member link."""
    for parent in link.parents:
        if not isinstance(parent, Tag):
            continue
        if parent.name in {"article", "li", "tr"}:
            return parent
        classes = " ".join(parent.get("class", []))
        if re.search(r"representative|member|profile|card|district", classes, re.IGNORECASE):
            text = clean_text(parent.get_text(" ", strip=True))
            if len(text) <= 1600:
                return parent
    return link.parent if isinstance(link.parent, Tag) else link


def extract_district(container_text: str, link: Tag) -> str | None:
    match = DISTRICT_PATTERN.search(container_text)
    if match:
        return str(int(match.group(1)))

    href = str(link.get("href", ""))
    query = parse_qs(urlparse(href).query)
    for key in ("District", "district", "DistrictNumber", "districtNumber"):
        if query.get(key) and str(query[key][0]).isdigit():
            return str(int(query[key][0]))
    return None


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

    for link in soup.find_all("a", href=True):
        if not is_member_link(link):
            continue

        source_member_url = urljoin(SOURCE_URL, str(link.get("href", "")))
        if source_member_url in seen_member_urls:
            continue

        display_name = clean_text(link.get_text(" ", strip=True))
        if not display_name or display_name.casefold() in {"details", "view profile", "read more"}:
            image = link.find("img", alt=True)
            display_name = clean_text(str(image.get("alt", ""))) if image else ""
        if not display_name:
            continue

        container = candidate_container(link)
        raw_text = clean_text(container.get_text(" ", strip=True))
        district = extract_district(raw_text, link)
        if not district:
            continue

        party_match = PARTY_PATTERN.search(raw_text)
        party = normalize_party(party_match.group(1) if party_match else None)
        county_match = COUNTY_PATTERN.search(raw_text)
        counties = clean_text(county_match.group(1)) if county_match else None
        is_vacant = display_name.casefold().startswith("vacant") or " vacancy" in raw_text.casefold()

        if district in seen_districts:
            raise RuntimeError(f"Duplicate Florida House district {district} found while parsing {display_name}.")
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
                "recordKind": "office_vacancy" if is_vacant else "person_officeholder",
                "displayName": f"Vacant — Florida House District {district}" if is_vacant else display_name,
                "officeTitle": f"Florida State Representative, District {district}",
                "governmentLevel": "state",
                "branch": "legislative",
                "chamber": "house",
                "jurisdictionName": "Florida",
                "stateCode": "FL",
                "districtNumber": district,
                "partyName": party,
                "countyDescription": counties,
                "externalMemberId": member_id,
                "canonicalMatchStatus": "vacancy" if is_vacant else "unmatched",
                "refreshClass": "term_based",
                "rawRowText": raw_text[:1600],
            }
        )

    records.sort(key=lambda item: int(str(item["districtNumber"])))
    if len(records) < minimum_records or len(records) > 120:
        title = soup.title.get_text(" ", strip=True) if soup.title else "no-title"
        raise RuntimeError(
            f"Extracted {len(records)} Florida House seats; expected between {minimum_records} and 120. "
            f"Page title: {title!r}. The official directory layout may have changed."
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
