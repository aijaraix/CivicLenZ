#!/usr/bin/env python3
"""Collect the Florida Senate member directory into review-only staging JSON.

The worker intentionally does not publish directly into data/officials. It creates
one deterministic staging record per source member so a reviewer or merge process
can compare the extraction with an existing canonical person/office/term record.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, NavigableString, Tag

SOURCE_URL = "https://www.flsenate.gov/Senators"
SOURCE_KEY = "florida-senate-members"
# Use a conventional browser user agent because the Senate site returns different
# markup to some non-browser clients. CivicLenZ identity remains explicit in From.
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)
NAMESPACE = uuid.UUID("9ad986b4-f174-46ec-9a24-e953c5329226")

MEMBER_PATH_PATTERN = re.compile(
    r"^/Senators/(?:\d{4}-\d{4}/)?S(?P<district>\d{1,3})/?$",
    re.IGNORECASE,
)
PARTY_PATTERN = re.compile(
    r"\b(No Party Affiliation|Republican|Democrat(?:ic)?)\b",
    re.IGNORECASE,
)
COUNTY_PATTERN = re.compile(
    r"\b(Consists of\s+.+?)(?=\s+(?:Track(?:er)?|Former Senators|Home\b)|$)",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class ExtractedSenator:
    candidateRecordVersion: str
    stagingRecordId: str
    sourceKey: str
    sourceUrl: str
    sourceMemberUrl: str
    sourceSnapshotSha256: str
    fetchedAt: str
    extractionStatus: str
    termLabel: str | None
    displayName: str
    districtNumber: str
    partyName: str
    countyDescription: str
    officeTitle: str
    governmentLevel: str
    jurisdictionName: str
    stateCode: str
    canonicalMatchStatus: str
    refreshClass: str
    rawRowText: str


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", normalized).strip("-").lower()
    return normalized or "unknown"


def fetch(url: str) -> requests.Response:
    response = requests.get(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "From": "research@civiclenz.ai",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
        },
        timeout=(10, 45),
    )
    response.raise_for_status()
    return response


def member_path_match(link: Tag) -> re.Match[str] | None:
    href = str(link.get("href", "")).strip()
    return MEMBER_PATH_PATTERN.fullmatch(urlparse(href).path)


def text_until_next_member(link: Tag, max_characters: int = 1500) -> str:
    """Collect the visible directory-entry text following one member link.

    The official page has changed between semantic tables and responsive list
    markup. Reading the DOM sequence until the next member link is resilient to
    either representation while remaining bounded to one directory entry.
    """

    pieces: list[str] = []
    character_count = 0

    for element in link.next_elements:
        if element is link:
            continue
        if isinstance(element, Tag) and element.name == "a" and member_path_match(element):
            break
        if not isinstance(element, NavigableString):
            continue

        text = " ".join(str(element).split())
        if not text:
            continue
        pieces.append(text)
        character_count += len(text) + 1
        if character_count >= max_characters:
            break

    return " ".join(pieces)


def normalize_party(value: str) -> str:
    lowered = value.casefold()
    if lowered.startswith("republican"):
        return "Republican"
    if lowered.startswith("democrat"):
        return "Democrat"
    if lowered.startswith("no party"):
        return "No Party Affiliation"
    return value.strip()


def parse_directory(
    html: str,
    source_hash: str,
    fetched_at: str,
    minimum_records: int = 30,
) -> list[ExtractedSenator]:
    soup = BeautifulSoup(html, "lxml")
    term_heading = soup.find(string=re.compile(r"\b\d{4}-\d{4}\s+Senators\b", re.IGNORECASE))
    term_label = term_heading.strip() if isinstance(term_heading, str) else None

    records: list[ExtractedSenator] = []
    seen_member_urls: set[str] = set()
    seen_districts: set[int] = set()
    matched_member_links = 0
    skipped_without_directory_fields: list[str] = []

    for link in soup.find_all("a", href=True):
        path_match = member_path_match(link)
        if not path_match:
            continue
        matched_member_links += 1

        raw_href = str(link.get("href", "")).strip()
        member_url = urljoin(SOURCE_URL, raw_href)
        display_name = link.get_text(" ", strip=True)
        district = path_match.group("district")
        entry_text = text_until_next_member(link)
        party_match = PARTY_PATTERN.search(entry_text)
        county_match = COUNTY_PATTERN.search(entry_text)

        # Former-member entries contain a district and party but no "Consists of"
        # representation description. Requiring both fields keeps the collection
        # focused on the current 40-member directory.
        if not display_name or not party_match or not county_match:
            if display_name:
                skipped_without_directory_fields.append(display_name)
            continue

        district_number = int(district)
        visible_district_match = re.search(r"\b(\d{1,3})\b", entry_text[: party_match.start()])
        if visible_district_match and int(visible_district_match.group(1)) != district_number:
            raise RuntimeError(
                f"District mismatch for {display_name}: directory text shows "
                f"{visible_district_match.group(1)}, but the member URL identifies district {district}."
            )
        if district_number in seen_districts:
            raise RuntimeError(
                f"Duplicate current Senate district {district_number} found while parsing {display_name}."
            )
        if member_url in seen_member_urls:
            continue

        party = normalize_party(party_match.group(1))
        counties = " ".join(county_match.group(1).split())
        # Store only the normalized directory facts for the row. The prior DOM
        # walk could include footer text when the final responsive card lacked a
        # following member link, which made the evidence fragment misleading.
        raw_record_text = f"{display_name} | District {district} | {party} | {counties}"

        seen_member_urls.add(member_url)
        seen_districts.add(district_number)
        stable_id = str(uuid.uuid5(NAMESPACE, member_url))
        records.append(
            ExtractedSenator(
                candidateRecordVersion="1.0.0",
                stagingRecordId=stable_id,
                sourceKey=SOURCE_KEY,
                sourceUrl=SOURCE_URL,
                sourceMemberUrl=member_url,
                sourceSnapshotSha256=source_hash,
                fetchedAt=fetched_at,
                extractionStatus="extracted_unreviewed",
                termLabel=term_label,
                displayName=display_name,
                districtNumber=district,
                partyName=party,
                countyDescription=counties,
                officeTitle=f"Florida State Senator, District {district}",
                governmentLevel="state",
                jurisdictionName="Florida",
                stateCode="FL",
                canonicalMatchStatus="unmatched",
                refreshClass="term_based",
                rawRowText=raw_record_text,
            )
        )

    records.sort(key=lambda record: int(record.districtNumber))

    if len(records) < minimum_records:
        page_title = soup.title.get_text(" ", strip=True) if soup.title else "no-title"
        skipped_preview = ", ".join(skipped_without_directory_fields[:5]) or "none"
        raise RuntimeError(
            f"Only extracted {len(records)} senators from {matched_member_links} member-like links; "
            f"expected at least {minimum_records} from the near-complete 40-member directory. "
            f"Page title: {page_title!r}; HTML length: {len(html)}; "
            f"first skipped names: {skipped_preview}. Publication is blocked."
        )

    return records


def write_records(records: list[ExtractedSenator], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    expected_files: set[Path] = set()

    for record in records:
        filename = f"district-{int(record.districtNumber):02d}-{slugify(record.displayName)}.json"
        path = output_dir / filename
        expected_files.add(path)
        path.write_text(json.dumps(asdict(record), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    for old_file in output_dir.glob("*.json"):
        if old_file not in expected_files:
            old_file.unlink()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/staging/florida/state-senate"),
        help="Review-only staging output directory.",
    )
    args = parser.parse_args()

    fetched_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    response = fetch(SOURCE_URL)
    source_hash = hashlib.sha256(response.content).hexdigest()
    records = parse_directory(response.text, source_hash, fetched_at)
    write_records(records, args.output)
    print(f"Wrote {len(records)} review-only Florida Senate staging records to {args.output}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except requests.RequestException as exc:
        print(f"Source retrieval failed: {exc}", file=sys.stderr)
        raise SystemExit(2)
    except Exception as exc:  # Keep scheduled jobs visibly failed instead of publishing partial data.
        print(f"Collection failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
