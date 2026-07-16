#!/usr/bin/env python3
"""Collect review-only public-channel candidates from CivicLenZ public sources.

The collector reads only public pages already linked from canonical CivicLenZ profiles
or the Florida House/Senate primary directories. It never signs into a platform,
infers a personal account from a name, or publishes any result. Every contact,
social account, and image remains a source-backed candidate pending review.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
OFFICIALS_ROOT = ROOT / "data" / "officials"
STAGING_ROOT = ROOT / "data" / "staging"
OUTPUT_ROOT = STAGING_ROOT / "public-channels"

FLORIDA_DIRECTORY_SOURCE_KEYS = {
    "florida-house-members",
    "florida-senate-members",
}

PLATFORM_HOSTS = {
    "facebook.com": "Facebook",
    "instagram.com": "Instagram",
    "linkedin.com": "LinkedIn",
    "rumble.com": "Rumble",
    "threads.net": "Threads",
    "tiktok.com": "TikTok",
    "twitter.com": "X",
    "x.com": "X",
    "youtube.com": "YouTube",
    "youtu.be": "YouTube",
}


@dataclass(frozen=True)
class ResearchTarget:
    stable_id: str
    output_stem: str
    record_origin: str
    display_name: str
    office_title: str
    government_level: str
    jurisdiction_name: str
    state_code: str | None
    source_key: str
    source_url: str
    page_url: str
    canonical_match_status: str
    linked_record: dict[str, str]


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self.images: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag == "a":
            href = attributes.get("href")
            if href:
                self.links.append((href.strip(), (attributes.get("aria-label") or "").strip()))
        if tag == "img":
            src = attributes.get("src")
            if src:
                self.images.append((src.strip(), (attributes.get("alt") or "").strip()))


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def slugify(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower().strip())
    return value.strip("-") or "official"


def human_name(value: str) -> str:
    parts = [part.strip() for part in value.split(",") if part.strip()]
    return f"{parts[1]} {parts[0]}" if len(parts) == 2 else value.strip()


def canonical_social_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.rstrip("/") or "/"
    return urlunparse((parsed.scheme.lower(), parsed.netloc.lower(), path, "", "", ""))


def social_platform(url: str) -> str | None:
    hostname = urlparse(url).netloc.lower().removeprefix("www.")
    for host, platform in PLATFORM_HOSTS.items():
        if hostname == host or hostname.endswith("." + host):
            return platform
    return None


def external_url(page_url: str, href: str) -> str | None:
    candidate = urljoin(page_url, href)
    parsed = urlparse(candidate)
    if parsed.scheme not in {"http", "https"}:
        return None
    return candidate


def fetch_html(url: str) -> tuple[str, str]:
    request = Request(
        url,
        headers={"User-Agent": "CivicLenZ public-source research bot/1.0 (review only)"},
    )
    with urlopen(request, timeout=20) as response:  # nosec B310: targets originate from reviewed source records
        body = response.read(2_000_000)
        final_url = response.geturl()
    return final_url, body.decode("utf-8", errors="replace")


def canonical_targets() -> list[ResearchTarget]:
    targets: list[ResearchTarget] = []
    for path in sorted(OFFICIALS_ROOT.rglob("*.json")):
        record = read_json(path)
        if record.get("recordStatus") not in {"active", "former", "candidate"}:
            continue

        for website in record.get("websites", []):
            if website.get("type") not in {"official", "campaign"} or not website.get("url"):
                continue
            official_id = str(record["officialId"])
            slug = str(record["slug"])
            targets.append(
                ResearchTarget(
                    stable_id=f"canonical:{official_id}:{website['url']}",
                    output_stem=f"canonical-{slug}",
                    record_origin="canonical_profile",
                    display_name=str(record["person"]["displayName"]),
                    office_title=str(record["office"]["title"]),
                    government_level=str(record["office"]["governmentLevel"]),
                    jurisdiction_name=str(record["jurisdiction"]["name"]),
                    state_code=record["jurisdiction"].get("stateCode"),
                    source_key="canonical-profile-public-channel-source",
                    source_url=str(website["url"]),
                    page_url=str(website["url"]),
                    canonical_match_status="matched_existing_official",
                    linked_record={"officialId": official_id, "officialSlug": slug},
                )
            )
    return targets


def source_listing_targets(source_keys: set[str]) -> list[ResearchTarget]:
    targets: list[ResearchTarget] = []
    for path in sorted(STAGING_ROOT.rglob("*.json")):
        record = read_json(path)
        source_key = record.get("sourceKey")
        if source_key not in source_keys or record.get("extractionStatus") != "extracted_unreviewed":
            continue
        if not all(record.get(key) for key in ("stagingRecordId", "displayName", "officeTitle", "jurisdictionName", "sourceUrl")):
            continue

        district = str(record.get("districtNumber") or "at-large")
        display_name = human_name(str(record["displayName"]))
        chamber = "house" if source_key == "florida-house-members" else "senate"
        targets.append(
            ResearchTarget(
                stable_id=f"staging:{record['stagingRecordId']}",
                output_stem=f"florida-{chamber}-{district}-{slugify(display_name)}",
                record_origin="source_listing",
                display_name=display_name,
                office_title=str(record["officeTitle"]),
                government_level=str(record.get("governmentLevel") or "state"),
                jurisdiction_name=str(record["jurisdictionName"]),
                state_code=record.get("stateCode"),
                source_key=str(source_key),
                source_url=str(record["sourceUrl"]),
                page_url=str(record.get("sourceMemberUrl") or record["sourceUrl"]),
                canonical_match_status="linked_source_listing",
                linked_record={"stagingRecordId": str(record["stagingRecordId"])},
            )
        )
    return targets


def contact_candidates(page_url: str, links: list[tuple[str, str]]) -> list[dict[str, str]]:
    candidates: dict[tuple[str, str], dict[str, str]] = {}
    for href, label in links:
        if href.lower().startswith("mailto:"):
            value = href.split(":", 1)[1].split("?", 1)[0].strip()
            if value:
                candidates[("email", value.lower())] = {
                    "type": "email",
                    "value": value,
                    "label": label or "Email link on source page",
                    "supportingSourceUrl": page_url,
                }
        if href.lower().startswith("tel:"):
            value = href.split(":", 1)[1].strip()
            if value:
                candidates[("phone", value)] = {
                    "type": "phone",
                    "value": value,
                    "label": label or "Telephone link on source page",
                    "supportingSourceUrl": page_url,
                }
    return list(candidates.values())


def social_candidates(page_url: str, links: list[tuple[str, str]]) -> list[dict[str, str]]:
    candidates: dict[str, dict[str, str]] = {}
    for href, label in links:
        url = external_url(page_url, href)
        if not url:
            continue
        normalized = canonical_social_url(url)
        platform = social_platform(normalized)
        if not platform:
            continue
        candidates[normalized] = {
            "platform": platform,
            "url": normalized,
            "candidateAccountType": "unclassified",
            "verificationState": "source_link_found",
            "sourceLabel": label or "Link found on a primary public source page",
            "supportingSourceUrl": page_url,
        }
    return list(candidates.values())


def image_candidates(page_url: str, images: list[tuple[str, str]]) -> list[dict[str, str]]:
    candidates: dict[str, dict[str, str]] = {}
    for src, alt in images:
        url = external_url(page_url, src)
        if not url:
            continue
        candidates[url] = {
            "url": url,
            "alt": alt,
            "supportingSourceUrl": page_url,
            "verificationState": "source_image_candidate",
        }
    return list(candidates.values())


def build_record(target: ResearchTarget, retrieved_url: str, html: str) -> dict[str, Any]:
    parser = PageParser()
    parser.feed(html)
    fetched_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    snapshot_sha = hashlib.sha256(html.encode("utf-8")).hexdigest()

    return {
        "candidateRecordVersion": "1.0.0",
        "recordKind": "public_channel_candidates",
        "stagingRecordId": str(uuid.uuid5(uuid.NAMESPACE_URL, target.stable_id)),
        "sourceKey": "official-public-channel-candidates",
        "sourceUrl": target.source_url,
        "sourceMemberUrl": retrieved_url,
        "sourceSnapshotSha256": snapshot_sha,
        "fetchedAt": fetched_at,
        "extractionStatus": "extracted_unreviewed",
        "canonicalMatchStatus": target.canonical_match_status,
        "displayName": target.display_name,
        "officeTitle": target.office_title,
        "governmentLevel": target.government_level,
        "jurisdictionName": target.jurisdiction_name,
        "stateCode": target.state_code,
        "recordOrigin": target.record_origin,
        "linkedRecord": target.linked_record,
        "originSourceKey": target.source_key,
        "candidateContactPoints": contact_candidates(retrieved_url, parser.links),
        "candidateSocialAccounts": social_candidates(retrieved_url, parser.links),
        "candidateImages": image_candidates(retrieved_url, parser.images),
        "reviewInstructions": [
            "Confirm every candidate against the linked source before promotion.",
            "Classify social accounts as office, official, campaign, personal, other, or unclassified.",
            "Do not publish candidate images or contact details until the image/person or channel/office relationship is reviewed.",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-key",
        action="append",
        choices=sorted(FLORIDA_DIRECTORY_SOURCE_KEYS),
        help="Limit Florida source listings to a chamber. Defaults to House and Senate.",
    )
    parser.add_argument("--include-canonical", action="store_true", help="Also collect candidates from canonical CivicLenZ profiles.")
    parser.add_argument("--limit", type=int, help="Limit the number of source pages requested.")
    parser.add_argument("--output-dir", type=Path, default=OUTPUT_ROOT)
    parser.add_argument("--dry-run", action="store_true", help="List targets without fetching or writing.")
    args = parser.parse_args()

    selected_sources = set(args.source_key or FLORIDA_DIRECTORY_SOURCE_KEYS)
    targets = source_listing_targets(selected_sources)
    if args.include_canonical:
        targets.extend(canonical_targets())

    unique_targets = {target.stable_id: target for target in targets}
    selected_targets = sorted(unique_targets.values(), key=lambda target: target.output_stem)
    if args.limit is not None:
        selected_targets = selected_targets[: max(args.limit, 0)]

    if not selected_targets:
        print("No matching source records found.", file=sys.stderr)
        return 1

    written = 0
    for target in selected_targets:
        destination = args.output_dir / f"{target.output_stem}.json"
        if args.dry_run:
            print(destination.relative_to(ROOT) if destination.is_relative_to(ROOT) else destination)
            written += 1
            continue

        try:
            retrieved_url, html = fetch_html(target.page_url)
            record = build_record(target, retrieved_url, html)
        except Exception as exc:  # source failures remain explicit; no partial or public record is created
            print(f"{target.display_name}: {target.page_url}: {exc}", file=sys.stderr)
            continue

        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(record, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(destination.relative_to(ROOT) if destination.is_relative_to(ROOT) else destination)
        written += 1

    print(f"{written} protected public-channel candidate record(s) written.")
    return 0 if written else 1


if __name__ == "__main__":
    raise SystemExit(main())
