#!/usr/bin/env python3
"""Collect Miami-Dade County elected officers into review-only staging JSON.

The Supervisor of Elections publishes a single official directory PDF that lists
the mayor, county commission, and county constitutional officers. This worker
fetches that document, freezes the raw bytes and SHA-256, and parses only the
county offices that appear as labeled rows. It never writes data/officials.
"""

from __future__ import annotations

import argparse
import hashlib
import re
import sys
import uuid
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from workers.ingestion.common import slugify, utc_now, write_json_records
from workers.seats.catalog import all_expected_seats
from workers.seats.miami_dade_occupancy import occupancy_candidates_from_named_offices

SOURCE_URL = "https://www.miamidade.gov/elections/library/reports/elected-officials.pdf"
SOURCE_KEY = "miami-dade-county-elected-officials"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)
NAMESPACE = uuid.UUID("7c2e1a90-4b5d-4f8a-9c31-2e6f0a8b4d17")
ROOT = Path(__file__).resolve().parents[2]
OFFICIALS_ROOT = ROOT / "data" / "officials"
DEFAULT_OUTPUT = Path("data/staging/florida/local/miami-dade")

AS_OF_PATTERN = re.compile(r"As of\s+(.+?)\s*$", re.IGNORECASE)
PAGE_PATTERN = re.compile(r"^Page\s+\d+\s+of\s+\d+$", re.IGNORECASE)
DATE_PATTERN = re.compile(r"^\d{1,2}/\d{1,2}/\d{2,4}$")
YEAR_PATTERN = re.compile(r"^\d{4}$")
TERM_LENGTH_PATTERN = re.compile(r"^(?:\d+\s+years?|Appointed|N/?A)$", re.IGNORECASE)
PLACEHOLDER_PATTERN = re.compile(r"^[\-_.\u00ad]+$")
SKIP_NAMES = {"vacant", "contact", "tbd"}

COMMISSION_PATTERN = re.compile(
    r"^Board of County Commissioners District\s+(\d+)\s*:?\s*$",
    re.IGNORECASE,
)
COUNTY_OFFICES: tuple[tuple[re.Pattern[str], str, str, str], ...] = (
    (re.compile(r"^Mayor$", re.IGNORECASE), "mayor", "Mayor of Miami-Dade County", "mayor"),
    (
        re.compile(r"^Clerk of the Circuit Court and Comptroller$", re.IGNORECASE),
        "clerk",
        "Miami-Dade County Clerk of the Circuit Court and Comptroller",
        "clerk_of_circuit_court_and_comptroller",
    ),
    (re.compile(r"^Sheriff$", re.IGNORECASE), "sheriff", "Miami-Dade County Sheriff", "sheriff"),
    (
        re.compile(r"^Property Appraiser$", re.IGNORECASE),
        "property_appraiser",
        "Miami-Dade County Property Appraiser",
        "property_appraiser",
    ),
    (
        re.compile(r"^Tax Collector$", re.IGNORECASE),
        "tax_collector",
        "Miami-Dade County Tax Collector",
        "tax_collector",
    ),
    (
        re.compile(r"^Supervisor of Elections$", re.IGNORECASE),
        "supervisor_of_elections",
        "Miami-Dade County Supervisor of Elections",
        "supervisor_of_elections",
    ),
)

HEADER_LINES = {
    "federal",
    "state",
    "miami-dade county legislative delegation",
    "miami-dade county",
    "office",
    "elected official",
    "term of",
    "year on",
    "current",
    "contact",
    "office",
    "ballot",
    "term ends",
    "information",
    "elected officials information",
}


def fetch(url: str) -> requests.Response:
    response = requests.get(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "From": "research@civiclenz.ai",
            "Accept": "application/pdf,text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
        },
        timeout=(10, 60),
    )
    response.raise_for_status()
    return response


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def normalize_line(value: str) -> str:
    return " ".join(value.replace("\u00ad", "").split())


def extract_text(content: bytes) -> str:
    if content.startswith(b"%PDF"):
        import fitz

        document = fitz.open(stream=content, filetype="pdf")
        try:
            return "\n".join(page.get_text("text") for page in document)
        finally:
            document.close()

    soup = BeautifulSoup(content, "lxml")
    return soup.get_text("\n")


def is_header(line: str) -> bool:
    lowered = line.casefold()
    if PAGE_PATTERN.fullmatch(line) or lowered.startswith("miami-dade county office of the supervisor"):
        return True
    if AS_OF_PATTERN.fullmatch(line):
        return True
    return lowered in HEADER_LINES


def match_county_office(line: str) -> dict[str, str] | None:
    commission = COMMISSION_PATTERN.fullmatch(line)
    if commission:
        district = str(int(commission.group(1)))
        return {
            "officeKind": "commission",
            "officeTitle": f"Miami-Dade County Commissioner, District {district}",
            "districtNumber": district,
            "seatFamily": "county_commission",
        }
    for pattern, office_kind, title, seat_family in COUNTY_OFFICES:
        if pattern.fullmatch(line):
            return {
                "officeKind": office_kind,
                "officeTitle": title,
                "districtNumber": "",
                "seatFamily": seat_family,
            }
    return None


def is_person_name(line: str) -> bool:
    if not line or line.casefold() in SKIP_NAMES or PLACEHOLDER_PATTERN.fullmatch(line):
        return False
    if is_header(line) or match_county_office(line):
        return False
    if TERM_LENGTH_PATTERN.fullmatch(line) or YEAR_PATTERN.fullmatch(line) or DATE_PATTERN.fullmatch(line):
        return False
    if not re.search(r"[A-Za-z]", line):
        return False
    if line.casefold().startswith("state ") or line.casefold().startswith("u.s. "):
        return False
    if line.casefold().startswith("school board") or line.casefold().startswith("community council"):
        return False
    return True


def looks_like_term_end(line: str) -> bool:
    return bool(DATE_PATTERN.fullmatch(line) or line.casefold() in {"tbd"} or PLACEHOLDER_PATTERN.fullmatch(line))


def parse_directory(
    content: bytes | str,
    source_hash: str,
    fetched_at: str,
    minimum_records: int = 14,
) -> list[dict[str, object]]:
    raw = content if isinstance(content, bytes) else content.encode("utf-8")
    text = extract_text(raw)
    lines = [normalize_line(line) for line in text.splitlines()]
    lines = [line for line in lines if line]

    term_label = None
    for line in lines:
        as_of = AS_OF_PATTERN.fullmatch(line)
        if as_of:
            term_label = normalize_line(as_of.group(0))
            break

    records: list[dict[str, object]] = []
    seen_keys: set[str] = set()
    skipped_without_name: list[str] = []
    index = 0

    while index < len(lines):
        office = match_county_office(lines[index])
        if not office:
            index += 1
            continue

        name_index = index + 1
        display_name = None
        while name_index < len(lines):
            candidate = lines[name_index]
            if match_county_office(candidate) or is_header(candidate):
                break
            if is_person_name(candidate):
                display_name = candidate
                break
            if candidate.casefold() in SKIP_NAMES:
                skipped_without_name.append(f"{office['officeTitle']} ({candidate})")
                display_name = None
                break
            name_index += 1

        if not display_name:
            if office["officeTitle"] not in {item.split(" (")[0] for item in skipped_without_name}:
                skipped_without_name.append(office["officeTitle"])
            index = name_index if name_index > index else index + 1
            continue

        cursor = name_index + 1
        term_length = None
        year_on_ballot = None
        term_ends = None
        while cursor < len(lines):
            value = lines[cursor]
            if match_county_office(value) or is_header(value) or is_person_name(value):
                break
            if term_length is None and TERM_LENGTH_PATTERN.fullmatch(value):
                term_length = value
            elif year_on_ballot is None and YEAR_PATTERN.fullmatch(value):
                year_on_ballot = value
            elif term_ends is None and looks_like_term_end(value):
                if DATE_PATTERN.fullmatch(value):
                    term_ends = value
            elif value.casefold() == "contact":
                cursor += 1
                break
            cursor += 1

        stable_key = "|".join(
            [
                SOURCE_KEY,
                office["officeKind"],
                office["districtNumber"] or "at-large",
                display_name.casefold(),
            ]
        )
        if stable_key in seen_keys:
            raise RuntimeError(f"Duplicate Miami-Dade office extracted for {display_name} / {office['officeTitle']}.")
        seen_keys.add(stable_key)

        elected_or_appointed = None
        if term_length and term_length.casefold() == "appointed":
            elected_or_appointed = "appointed"
        elif term_length:
            elected_or_appointed = "elected"

        raw_parts = [display_name, office["officeTitle"]]
        if office["districtNumber"]:
            raw_parts.append(f"District {office['districtNumber']}")
        if term_length:
            raw_parts.append(term_length)
        if term_ends:
            raw_parts.append(term_ends)

        records.append(
            {
                "candidateRecordVersion": "1.0.0",
                "stagingRecordId": str(uuid.uuid5(NAMESPACE, stable_key)),
                "sourceKey": SOURCE_KEY,
                "sourceUrl": SOURCE_URL,
                "sourceMemberUrl": SOURCE_URL,
                "sourceSnapshotSha256": source_hash,
                "fetchedAt": fetched_at,
                "extractionStatus": "extracted_unreviewed",
                "recordKind": "person_officeholder",
                "termLabel": term_label,
                "displayName": display_name,
                "officeTitle": office["officeTitle"],
                "governmentLevel": "county",
                "branch": "legislative" if office["officeKind"] == "commission" else "executive",
                "chamber": None,
                "jurisdictionName": "Miami-Dade County",
                "stateCode": "FL",
                "districtNumber": office["districtNumber"] or None,
                "partyName": None,
                "phone": None,
                "officialWebsite": None,
                "termLengthText": term_length,
                "yearOnBallotText": year_on_ballot,
                "serviceEndDateText": term_ends,
                "electedOrAppointed": elected_or_appointed,
                "canonicalMatchStatus": "unmatched",
                "refreshClass": "term_based",
                "rawRowText": " | ".join(raw_parts),
            }
        )
        index = cursor if cursor > index else index + 1

    mayor_count = sum(item["officeTitle"] == "Mayor of Miami-Dade County" for item in records)
    commission_count = sum(str(item["officeTitle"]).startswith("Miami-Dade County Commissioner, District") for item in records)
    records.sort(
        key=lambda item: (
            0 if item["officeTitle"] == "Mayor of Miami-Dade County" else 1 if str(item["officeTitle"]).startswith("Miami-Dade County Commissioner") else 2,
            int(item["districtNumber"] or 0),
            str(item["officeTitle"]),
        )
    )

    if len(records) < minimum_records:
        skipped_preview = ", ".join(skipped_without_name[:6]) or "none"
        raise RuntimeError(
            f"Extracted {len(records)} Miami-Dade county officers "
            f"({mayor_count} mayor, {commission_count} commissioners); "
            f"expected the mayor plus the 13-member commission (minimum {minimum_records} records). "
            f"Skipped rows: {skipped_preview}. Publication is blocked."
        )
    if minimum_records >= 14 and (mayor_count != 1 or commission_count < 12):
        skipped_preview = ", ".join(skipped_without_name[:6]) or "none"
        raise RuntimeError(
            f"Extracted {len(records)} Miami-Dade county officers "
            f"({mayor_count} mayor, {commission_count} commissioners); "
            f"expected the mayor plus the 13-member commission (minimum {minimum_records} records). "
            f"Skipped rows: {skipped_preview}. Publication is blocked."
        )
    return records


def ensure_staging_output(output_dir: Path) -> Path:
    resolved = (output_dir if output_dir.is_absolute() else Path.cwd() / output_dir).resolve()
    officials = OFFICIALS_ROOT.resolve()
    if resolved == officials or officials in resolved.parents:
        raise RuntimeError("Miami-Dade collector must not write under data/officials.")
    if not output_dir.is_absolute() and "staging" not in Path(output_dir).as_posix().split("/"):
        raise RuntimeError(f"Miami-Dade collector must write only under data/staging, not {output_dir}.")
    return output_dir


def ensure_review_only_output(output_dir: Path) -> Path:
    resolved = (output_dir if output_dir.is_absolute() else Path.cwd() / output_dir).resolve()
    officials = OFFICIALS_ROOT.resolve()
    if resolved == officials or officials in resolved.parents:
        raise RuntimeError("Miami-Dade collector must not write under data/officials.")
    posix_parts = Path(output_dir).as_posix().split("/")
    if "staging" not in posix_parts and "occupancy-candidates" not in posix_parts:
        raise RuntimeError(
            f"Miami-Dade occupancy output must be under data/staging or occupancy-candidates, not {output_dir}."
        )
    return output_dir


def filename_for(record: dict[str, object]) -> str:
    name = slugify(str(record["displayName"]))
    district = record.get("districtNumber")
    if district:
        return f"commission-district-{int(str(district)):02d}-{name}.json"
    title = slugify(str(record["officeTitle"]).replace("Miami-Dade County ", "").replace(" of Miami-Dade County", ""))
    return f"{title}-{name}.json"


def attach_occupancy_candidates(records: list[dict[str, object]], output_dir: Path, fetched_at: str) -> int:
    expected_keys = {str(seat["seatKey"]) for seat in all_expected_seats()}
    candidates = occupancy_candidates_from_named_offices(records, expected_keys, created_at=fetched_at)
    occupancy_dir = ensure_review_only_output(output_dir)
    occupancy_dir.mkdir(parents=True, exist_ok=True)

    def occupancy_filename(candidate: dict[str, object]) -> str:
        return f"{candidate['seatKey']}--{slugify(str(candidate['displayName']))}.json"

    return write_json_records(candidates, occupancy_dir, occupancy_filename)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--occupancy-output",
        type=Path,
        help="Optional review-only occupancy-candidate directory. Never data/officials.",
    )
    args = parser.parse_args()
    output_dir = ensure_staging_output(args.output)

    fetched_at = utc_now()
    response = fetch(SOURCE_URL)
    content = response.content
    if not content.startswith(b"%PDF"):
        raise RuntimeError(
            f"Official Miami-Dade elected-officials directory did not return a PDF snapshot from {SOURCE_URL}."
        )
    source_hash = sha256_bytes(content)
    records = parse_directory(content, source_hash, fetched_at)
    count = write_json_records(records, output_dir, filename_for)
    print(f"Wrote {count} review-only Miami-Dade staging records to {output_dir}")
    if args.occupancy_output:
        occupancy_count = attach_occupancy_candidates(records, args.occupancy_output, fetched_at)
        print(f"Wrote {occupancy_count} review-only Miami-Dade occupancy candidates to {args.occupancy_output}")
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
