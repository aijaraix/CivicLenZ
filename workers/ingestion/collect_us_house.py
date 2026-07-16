#!/usr/bin/env python3
"""Collect current U.S. House members and vacancies from house.gov."""

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

SOURCE_URL = "https://www.house.gov/representatives"
SOURCE_KEY = "us-house-members"
NAMESPACE = uuid.UUID("2c3f3fa1-d598-4e12-957a-0a0e4a2cabfb")
PARTIES = {"D": "Democratic", "R": "Republican", "I": "Independent"}
STATE_CODES = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
    "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
    "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
    "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO",
    "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
    "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
    "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
    "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
    "American Samoa": "AS", "District of Columbia": "DC", "Guam": "GU", "Northern Mariana Islands": "MP",
    "Puerto Rico": "PR", "Virgin Islands": "VI", "U.S. Virgin Islands": "VI",
}


def clean_text(value: str) -> str:
    return " ".join(value.split())


def state_from_row(row: Tag) -> str | None:
    text = clean_text(row.get_text(" ", strip=True))
    for state in STATE_CODES:
        if text == state:
            return state
    return None


def table_state(table: Tag) -> str | None:
    caption = table.find("caption")
    if caption:
        text = clean_text(caption.get_text(" ", strip=True))
        if text in STATE_CODES:
            return text
    heading = table.find_previous(["h1", "h2", "h3", "h4"])
    if heading:
        text = clean_text(heading.get_text(" ", strip=True))
        if text in STATE_CODES:
            return text
    return None


def normalize_district(label: str) -> str:
    lowered = label.casefold()
    if "at large" in lowered or "at-large" in lowered:
        return "AL"
    if "delegate" in lowered:
        return "DEL"
    if "resident commissioner" in lowered:
        return "RC"
    match = re.search(r"\d+", label)
    return str(int(match.group(0))) if match else label.strip()


def office_title_for(district_label: str, vacant: bool) -> str:
    lowered = district_label.casefold()
    if vacant:
        return "Vacant United States House seat"
    if "resident commissioner" in lowered:
        return "Resident Commissioner to the United States House of Representatives"
    if "delegate" in lowered:
        return "Delegate to the United States House of Representatives"
    return "United States Representative"


def parse_directory(html: str, source_hash: str, fetched_at: str, minimum_records: int = 435) -> list[dict[str, object]]:
    soup = BeautifulSoup(html, "lxml")
    records: list[dict[str, object]] = []
    seen_seats: set[str] = set()

    for table in soup.find_all("table"):
        current_state = table_state(table)
        for row in table.find_all("tr"):
            row_state = state_from_row(row)
            if row_state:
                current_state = row_state
                continue

            cells = row.find_all(["td", "th"], recursive=False)
            if len(cells) < 3 or not current_state:
                continue

            values = [clean_text(cell.get_text(" ", strip=True)) for cell in cells]
            district_label = values[0]
            if not district_label or district_label.casefold() in {"district", "district name"}:
                continue

            name_cell = cells[1]
            link = name_cell.find("a", href=True) or row.find("a", href=True)
            name_text = clean_text(name_cell.get_text(" ", strip=True))
            row_text = clean_text(row.get_text(" ", strip=True))
            is_vacant = "vacancy" in row_text.casefold()
            if not link and not is_vacant:
                continue

            state_code = STATE_CODES[current_state]
            district_number = normalize_district(district_label)
            seat_key = f"{state_code}|{district_number}"
            if seat_key in seen_seats:
                raise RuntimeError(f"Duplicate House seat found: {seat_key}")
            seen_seats.add(seat_key)

            former_name = re.sub(r"\s*-?\s*Vacancy\s*$", "", name_text, flags=re.IGNORECASE).strip() or None
            display_name = f"Vacant — {current_state} {district_label}" if is_vacant else name_text
            source_member_url = urljoin(SOURCE_URL, str(link.get("href"))) if link else SOURCE_URL
            party_code = values[2] if len(values) > 2 else None
            office_room = values[3] if len(values) > 3 else None
            phone = values[4] if len(values) > 4 else None
            committee_text = values[5] if len(values) > 5 else ""
            committees = [item.strip() for item in committee_text.split("|") if item.strip()]

            stable_key = f"house|{seat_key}|{source_member_url if not is_vacant else 'vacant'}"
            record: dict[str, object] = {
                "candidateRecordVersion": "1.0.0",
                "stagingRecordId": str(uuid.uuid5(NAMESPACE, stable_key)),
                "sourceKey": SOURCE_KEY,
                "sourceUrl": SOURCE_URL,
                "sourceMemberUrl": source_member_url,
                "sourceSnapshotSha256": source_hash,
                "fetchedAt": fetched_at,
                "extractionStatus": "extracted_unreviewed",
                "recordKind": "office_vacancy" if is_vacant else "person_officeholder",
                "displayName": display_name,
                "formerMemberName": former_name if is_vacant else None,
                "officeTitle": office_title_for(district_label, is_vacant),
                "governmentLevel": "federal",
                "branch": "legislative",
                "chamber": "house",
                "jurisdictionName": "United States",
                "stateName": current_state,
                "stateCode": state_code,
                "districtLabel": district_label,
                "districtNumber": district_number,
                "partyCode": party_code,
                "partyName": PARTIES.get(party_code or "", party_code),
                "officeRoom": office_room,
                "phone": phone,
                "committeeAssignments": committees,
                "canonicalMatchStatus": "vacancy" if is_vacant else "unmatched",
                "refreshClass": "term_based",
                "rawRowText": row_text,
            }
            records.append(record)

    records.sort(key=lambda item: (str(item.get("stateCode") or ""), str(item.get("districtNumber") or "")))
    if len(records) < minimum_records or len(records) > 450:
        raise RuntimeError(
            f"Extracted {len(records)} House seats; expected between {minimum_records} and 450. "
            "The official directory layout or source content may have changed."
        )
    return records


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("data/staging/federal/us-house"))
    args = parser.parse_args()

    fetched_at = utc_now()
    response = fetch(SOURCE_URL)
    records = parse_directory(response.text, sha256_bytes(response.content), fetched_at)
    count = write_json_records(
        records,
        args.output,
        lambda record: (
            f"{str(record['stateCode']).lower()}-{str(record['districtNumber']).lower()}-"
            f"{slugify(str(record['displayName']))}.json"
        ),
    )
    print(f"Wrote {count} review-only U.S. House staging records to {args.output}")
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
