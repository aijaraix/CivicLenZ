#!/usr/bin/env python3
"""Collect review-only detail candidates from Florida legislative member pages.

This worker enriches the Florida House and Senate baseline records with official-page
portrait candidates, staff, office locations, committees, biography labels, education,
public service, affiliations, awards, maps, bills, and media links. It never publishes
facts directly; output remains review-only research staging.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup, Tag

from workers.enrichment.collect_identity_contact_candidates import (
    discover_contacts_and_links,
    discover_image_candidates,
    request_headers,
)
from workers.ingestion.common import utc_now

ROOT = Path(__file__).resolve().parents[2]
HOUSE_ROOT = ROOT / "data" / "staging" / "florida" / "state-house"
SENATE_ROOT = ROOT / "data" / "staging" / "florida" / "state-senate"
DEFAULT_OUTPUT = ROOT / "data" / "research-staging" / "florida" / "legislative-details"
NAMESPACE = uuid.UUID("64c27f2a-35ab-40df-8d12-d37a80bdfaf0")
HEADING_TAG = re.compile(r"^h[1-6]$")

HOUSE_LABELS = {
    "cityOfResidence": ["City of Residence"],
    "occupation": ["Occupation"],
    "spouse": ["Spouse"],
    "educationRaw": ["Education"],
    "bornRaw": ["Born"],
    "movedToFlorida": ["Moved to Florida"],
    "recreationalInterests": ["Recreational Interest", "Recreational Interests"],
    "legislativeAide": ["Legislative Aide"],
    "districtAide": ["District Aide"],
}

SENATE_LABELS = {
    "occupation": ["Occupation"],
    "spouse": ["Spouse"],
    "children": ["Children"],
    "bornRaw": ["Born"],
    "religiousAffiliation": ["Religious Affiliation"],
    "recreation": ["Recreation"],
}

SECTION_ALIASES = {
    "committees": ["Current Committee Assignments", "Committee Assignments"],
    "biography": ["Biographical Information"],
    "publicService": ["Other Public Services", "Other Public Service"],
    "affiliations": ["Affiliations"],
    "awards": ["Highlights", "Honors and Awards"],
    "legislativeService": ["Legislative Service", "Florida Senate Service"],
    "personalCareer": ["Personal & Career"],
    "billsIntroduced": ["Bills Introduced"],
    "media": ["Media"],
}


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def clean_text(value: str) -> str:
    return " ".join(value.replace("\xa0", " ").split())


def text_lines(soup: BeautifulSoup) -> list[str]:
    lines = [clean_text(line) for line in soup.get_text("\n", strip=True).splitlines()]
    return [line for line in lines if line]


def unique(values: Iterable[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        normalized = clean_text(value)
        key = normalized.lower()
        if normalized and key not in seen:
            seen.add(key)
            result.append(normalized)
    return result


def extract_label(text: str, labels: list[str]) -> str | None:
    for label in labels:
        pattern = re.compile(rf"(?:^|\n)\s*{re.escape(label)}\s*:\s*([^\n]+)", re.IGNORECASE)
        match = pattern.search(text)
        if match:
            return clean_text(match.group(1))
    return None


def heading_level(tag: Tag) -> int:
    try:
        return int(tag.name[1])
    except Exception:
        return 6


def section_items(soup: BeautifulSoup, aliases: list[str], limit: int = 100) -> list[str]:
    target: Tag | None = None
    lowered = [alias.lower() for alias in aliases]
    for heading in soup.find_all(HEADING_TAG):
        heading_text = clean_text(heading.get_text(" ", strip=True)).lower()
        if any(alias == heading_text or alias in heading_text for alias in lowered):
            target = heading
            break
    if target is None:
        return []

    target_level = heading_level(target)
    values: list[str] = []
    for element in target.find_all_next():
        if element is target:
            continue
        if isinstance(element, Tag) and HEADING_TAG.match(element.name or "") and heading_level(element) <= target_level:
            break
        if not isinstance(element, Tag) or element.name not in {"li", "p", "address", "dd"}:
            continue
        if element.find_parent(["nav", "header", "footer"]):
            continue
        value = clean_text(element.get_text(" ", strip=True))
        if value:
            values.append(value)
        if len(values) >= limit:
            break
    return unique(values)


def heading_blocks(soup: BeautifulSoup, heading_pattern: re.Pattern[str]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for heading in soup.find_all(HEADING_TAG):
        title = clean_text(heading.get_text(" ", strip=True))
        if not heading_pattern.search(title):
            continue
        level = heading_level(heading)
        content: list[str] = []
        for element in heading.find_all_next():
            if element is heading:
                continue
            if isinstance(element, Tag) and HEADING_TAG.match(element.name or "") and heading_level(element) <= level:
                break
            if not isinstance(element, Tag) or element.name not in {"p", "li", "address", "dd"}:
                continue
            value = clean_text(element.get_text(" ", strip=True))
            if value:
                content.append(value)
        blocks.append({"label": title, "lines": unique(content)[:30]})
    return blocks


def named_links(soup: BeautifulSoup, page_url: str, terms: list[str], limit: int = 50) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    seen: set[str] = set()
    for link in soup.find_all("a", href=True):
        label = clean_text(link.get_text(" ", strip=True))
        href = str(link.get("href", "")).strip()
        haystack = f"{label} {href}".lower()
        if not any(term.lower() in haystack for term in terms):
            continue
        url = urljoin(page_url, href)
        if url in seen or not url.startswith(("http://", "https://")):
            continue
        seen.add(url)
        results.append({"label": label or url, "url": url})
        if len(results) >= limit:
            break
    return results


def parse_education_entries(raw: str | None) -> list[dict[str, Any]]:
    if not raw:
        return []
    entries: list[dict[str, Any]] = []
    for part in re.split(r"\s*;\s*|\n+", raw):
        value = clean_text(part)
        if not value:
            continue
        entries.append({"rawText": value, "reviewStatus": "unreviewed"})
    return entries


def parse_house_detail(soup: BeautifulSoup, page_url: str, baseline: dict[str, Any]) -> dict[str, Any]:
    full_text = soup.get_text("\n", strip=True).replace("\xa0", " ")
    biography = {key: extract_label(full_text, labels) for key, labels in HOUSE_LABELS.items()}
    committees = section_items(soup, SECTION_ALIASES["committees"])
    public_service = section_items(soup, SECTION_ALIASES["publicService"])
    affiliations = section_items(soup, SECTION_ALIASES["affiliations"])
    awards = section_items(soup, SECTION_ALIASES["awards"])
    contacts, socials, websites = discover_contacts_and_links(soup, page_url)
    images = discover_image_candidates(soup, page_url, str(baseline.get("displayName", "")))

    return {
        "partyAndDistrictText": next((line for line in text_lines(soup) if line.lower().startswith("district:") or "-- democrat" in line.lower() or "-- republican" in line.lower()), None),
        "staffCandidates": [
            {"role": "Legislative Aide", "name": biography.pop("legislativeAide"), "reviewStatus": "unreviewed"},
            {"role": "District Aide", "name": biography.pop("districtAide"), "reviewStatus": "unreviewed"},
        ],
        "biographyCandidates": biography,
        "educationCandidates": parse_education_entries(biography.get("educationRaw")),
        "committeeCandidates": [{"name": item, "roleType": "member", "reviewStatus": "unreviewed"} for item in committees],
        "publicServiceCandidates": [{"rawText": item, "reviewStatus": "unreviewed"} for item in public_service],
        "affiliationCandidates": [{"name": item, "reviewStatus": "unreviewed"} for item in affiliations],
        "awardCandidates": [{"rawText": item, "reviewStatus": "unreviewed"} for item in awards],
        "officeLocationCandidates": [],
        "contactCandidates": contacts,
        "socialCandidates": socials,
        "websiteCandidates": websites,
        "portraitCandidates": [
            {"url": candidate.url, "method": candidate.method, "score": candidate.score, "altText": candidate.alt_text, "sourcePageUrl": page_url, "rightsStatus": "review_required", "identityReviewStatus": "unreviewed"}
            for candidate in images
        ],
        "mapLinks": named_links(soup, page_url, ["district map", "detailed district", "large format"]),
        "billLinks": named_links(soup, page_url, ["sponsored bills", "bill"]),
        "mediaLinks": named_links(soup, page_url, ["communications", "gallery", "media", "youtube"]),
    }


def parse_senate_detail(soup: BeautifulSoup, page_url: str, baseline: dict[str, Any]) -> dict[str, Any]:
    full_text = soup.get_text("\n", strip=True).replace("\xa0", " ")
    biography = {key: extract_label(full_text, labels) for key, labels in SENATE_LABELS.items()}
    contacts, socials, websites = discover_contacts_and_links(soup, page_url)
    images = discover_image_candidates(soup, page_url, str(baseline.get("displayName", "")))
    office_blocks = heading_blocks(soup, re.compile(r"(?:District|Satellite|Tallahassee|Capitol) Office", re.IGNORECASE))
    aide_lines = heading_blocks(soup, re.compile(r"Legislative Aides?", re.IGNORECASE))
    committees = section_items(soup, SECTION_ALIASES["committees"])
    public_service = section_items(soup, SECTION_ALIASES["publicService"])
    affiliations = section_items(soup, SECTION_ALIASES["affiliations"])
    awards = section_items(soup, SECTION_ALIASES["awards"])
    legislative_service = section_items(soup, SECTION_ALIASES["legislativeService"])

    education_lines: list[str] = []
    for heading in soup.find_all(HEADING_TAG):
        if clean_text(heading.get_text(" ", strip=True)).lower() == "education":
            level = heading_level(heading)
            for element in heading.find_all_next():
                if element is heading:
                    continue
                if isinstance(element, Tag) and HEADING_TAG.match(element.name or "") and heading_level(element) <= level:
                    break
                if isinstance(element, Tag) and element.name in {"li", "p", "dd"}:
                    value = clean_text(element.get_text(" ", strip=True))
                    if value:
                        education_lines.append(value)
            break

    staff_candidates: list[dict[str, Any]] = []
    for block in aide_lines:
        for line in block["lines"]:
            for name in re.split(r",|\band\b", line):
                clean_name = clean_text(name)
                if clean_name:
                    staff_candidates.append({"role": "Legislative Aide", "name": clean_name, "reviewStatus": "unreviewed"})

    return {
        "partyAndDistrictText": next((line for line in text_lines(soup) if line.lower().startswith("party:")), None),
        "staffCandidates": staff_candidates,
        "biographyCandidates": biography,
        "educationCandidates": [{"rawText": item, "reviewStatus": "unreviewed"} for item in unique(education_lines)],
        "committeeCandidates": [{"name": item, "roleType": "member", "reviewStatus": "unreviewed"} for item in committees],
        "publicServiceCandidates": [{"rawText": item, "reviewStatus": "unreviewed"} for item in public_service],
        "affiliationCandidates": [{"name": item, "reviewStatus": "unreviewed"} for item in affiliations],
        "awardCandidates": [{"rawText": item, "reviewStatus": "unreviewed"} for item in awards],
        "legislativeServiceCandidates": [{"rawText": item, "reviewStatus": "unreviewed"} for item in legislative_service],
        "officeLocationCandidates": [
            {"label": block["label"], "rawLines": block["lines"], "reviewStatus": "unreviewed"}
            for block in office_blocks
        ],
        "contactCandidates": contacts,
        "socialCandidates": socials,
        "websiteCandidates": websites,
        "portraitCandidates": [
            {"url": candidate.url, "method": candidate.method, "score": candidate.score, "altText": candidate.alt_text, "sourcePageUrl": page_url, "rightsStatus": "review_required", "identityReviewStatus": "unreviewed"}
            for candidate in images
        ],
        "mapLinks": named_links(soup, page_url, ["letter size", "poster size", "district map"]),
        "billLinks": named_links(soup, page_url, ["bills introduced", "co-introduced", "bill"]),
        "mediaLinks": named_links(soup, page_url, ["media", "publication", "video"]),
    }


def collect_record(path: Path) -> dict[str, Any]:
    baseline = json.loads(path.read_text(encoding="utf-8"))
    source_url = baseline.get("sourceMemberUrl") or baseline.get("sourceUrl")
    record_id = str(uuid.uuid5(NAMESPACE, str(baseline["stagingRecordId"])))
    output: dict[str, Any] = {
        "detailRecordVersion": "1.0.0",
        "detailRecordId": record_id,
        "stagingRecordId": baseline.get("stagingRecordId"),
        "sourceKey": baseline.get("sourceKey"),
        "displayName": baseline.get("displayName"),
        "officeTitle": baseline.get("officeTitle"),
        "districtNumber": baseline.get("districtNumber"),
        "sourceUrl": source_url,
        "fetchedAt": utc_now(),
        "collectionStatus": "failed",
        "reviewStatus": "unreviewed",
        "publicationAllowed": False,
        "errors": [],
    }
    if not source_url:
        output["errors"].append("No official member source URL")
        return output

    try:
        response = requests.get(source_url, headers=request_headers("text/html,application/xhtml+xml;q=0.9,*/*;q=0.8"), timeout=(10, 35), allow_redirects=True)
        response.raise_for_status()
        output["httpStatus"] = response.status_code
        output["finalUrl"] = response.url
        output["sourceSnapshotSha256"] = sha256_bytes(response.content)
        soup = BeautifulSoup(response.text, "lxml")
        if baseline.get("sourceKey") == "florida-house-members":
            details = parse_house_detail(soup, response.url, baseline)
        elif baseline.get("sourceKey") == "florida-senate-members":
            details = parse_senate_detail(soup, response.url, baseline)
        else:
            raise RuntimeError(f"Unsupported legislative source: {baseline.get('sourceKey')}")
        output.update(details)
        output["collectionStatus"] = "success"
        output["candidateCounts"] = {
            key: len(value)
            for key, value in details.items()
            if key.endswith("Candidates") and isinstance(value, list)
        }
    except Exception as exc:
        output["errors"].append(str(exc)[:1000])
    return output


def input_paths(max_records: int | None = None) -> list[Path]:
    paths = sorted(HOUSE_ROOT.glob("*.json")) + sorted(SENATE_ROOT.glob("*.json"))
    if max_records is not None:
        return paths[:max_records]
    return paths


def write_records(records: list[dict[str, Any]], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    expected: set[Path] = set()
    for record in records:
        slug = re.sub(r"[^a-z0-9]+", "-", f"{record.get('sourceKey')}-{record.get('districtNumber')}-{record.get('displayName')}".lower()).strip("-")
        path = output_dir / f"{slug}.json"
        expected.add(path)
        path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    for old in output_dir.glob("*.json"):
        if old not in expected:
            old.unlink()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--max-records", type=int)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--minimum-success-rate", type=float, default=0.90)
    args = parser.parse_args()

    paths = input_paths(args.max_records)
    records: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        futures = {executor.submit(collect_record, path): path for path in paths}
        for future in as_completed(futures):
            records.append(future.result())
    records.sort(key=lambda item: (str(item.get("sourceKey")), int(item.get("districtNumber") or 0)))
    write_records(records, args.output)

    successes = sum(record.get("collectionStatus") == "success" for record in records)
    portrait_candidates = sum(bool(record.get("portraitCandidates")) for record in records)
    biography_candidates = sum(bool(record.get("biographyCandidates")) for record in records)
    committee_candidates = sum(bool(record.get("committeeCandidates")) for record in records)
    rate = successes / len(records) if records else 0.0
    print(json.dumps({
        "records": len(records),
        "successes": successes,
        "successRate": round(rate, 4),
        "recordsWithPortraitCandidates": portrait_candidates,
        "recordsWithBiographyCandidates": biography_candidates,
        "recordsWithCommitteeCandidates": committee_candidates,
        "outputDirectory": str(args.output),
    }, indent=2))
    return 0 if records and rate >= args.minimum_success_rate else 1


if __name__ == "__main__":
    raise SystemExit(main())
