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
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

SOURCE_URL = "https://www.flsenate.gov/Senators"
SOURCE_KEY = "florida-senate-members"
USER_AGENT = "CivicLenZResearchBot/0.1 (+https://civiclenz.ai; evidence-first public records research)"
NAMESPACE = uuid.UUID("9ad986b4-f174-46ec-9a24-e953c5329226")


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
    rawRowText: str


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", normalized).strip("-").lower()
    return normalized or "unknown"


def fetch(url: str) -> requests.Response:
    response = requests.get(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"},
        timeout=(10, 45),
    )
    response.raise_for_status()
    return response


def parse_directory(html: str, source_hash: str, fetched_at: str) -> list[ExtractedSenator]:
    soup = BeautifulSoup(html, "lxml")
    term_heading = soup.find(string=re.compile(r"\d{4}-\d{4}\s+Senators"))
    term_label = term_heading.strip() if isinstance(term_heading, str) else None

    records: list[ExtractedSenator] = []
    seen_member_urls: set[str] = set()

    for row in soup.select("table tr"):
        cells = [cell.get_text(" ", strip=True) for cell in row.find_all("td")]
        member_link = row.find("a", href=re.compile(r"^/Senators/s"))
        if not member_link or len(cells) < 4:
            continue

        member_url = urljoin(SOURCE_URL, member_link.get("href", ""))
        if member_url in seen_member_urls:
            continue

        display_name = member_link.get_text(" ", strip=True)
        district = cells[1].strip()
        party = cells[2].strip()
        counties = cells[3].strip()

        if not display_name or not re.fullmatch(r"\d{1,3}", district):
            continue

        seen_member_urls.add(member_url)
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
                rawRowText=" | ".join(cells),
            )
        )

    if len(records) < 30:
        raise RuntimeError(
            f"Only extracted {len(records)} senators; expected a near-complete 40-member directory. "
            "The source layout may have changed, so publication is blocked."
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
