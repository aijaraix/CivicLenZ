#!/usr/bin/env python3
"""Extract public social-link candidates from official websites into review-only staging.

The script deliberately does not authenticate with social platforms or infer ownership
from a matching handle. A reviewer must classify and promote every candidate.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import uuid
from datetime import UTC, datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, urlunparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
OFFICIALS_ROOT = ROOT / "data" / "officials"
OUTPUT_ROOT = ROOT / "data" / "staging" / "social-accounts"

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


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "a":
            return
        href = dict(attrs).get("href")
        if href:
            self.links.append(href.strip())


def canonical_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.rstrip("/") or "/"
    return urlunparse((parsed.scheme.lower(), parsed.netloc.lower(), path, "", "", ""))


def social_platform(url: str) -> str | None:
    hostname = urlparse(url).netloc.lower().removeprefix("www.")
    for host, platform in PLATFORM_HOSTS.items():
        if hostname == host or hostname.endswith("." + host):
            return platform
    return None


def fetch_html(url: str) -> tuple[str, str]:
    request = Request(
        url,
        headers={"User-Agent": "CivicLenZ source-link review bot/1.0 (public research)"},
    )
    with urlopen(request, timeout=20) as response:  # nosec B310: URLs come from reviewed canonical profiles
        data = response.read(2_000_000)
        final_url = response.geturl()
    return final_url, data.decode("utf-8", errors="replace")


def canonical_profiles() -> list[dict]:
    profiles = []
    for path in OFFICIALS_ROOT.rglob("*.json"):
        profiles.append(json.loads(path.read_text(encoding="utf-8")))
    return profiles


def social_candidates(source_url: str, html: str) -> list[dict]:
    parser = LinkParser()
    parser.feed(html)
    snapshot_sha = hashlib.sha256(html.encode("utf-8")).hexdigest()
    candidates: dict[str, dict] = {}

    for href in parser.links:
        if not href.startswith(("https://", "http://")):
            continue
        normalized = canonical_url(href)
        platform = social_platform(normalized)
        if not platform:
            continue
        candidates[normalized] = {
            "platform": platform,
            "url": normalized,
            "candidateAccountType": "unclassified",
            "verificationState": "source_link_found",
            "supportingSourceUrl": source_url,
            "sourceSnapshotSha256": snapshot_sha,
        }

    return list(candidates.values())


def build_record(profile: dict, website: str, retrieved_url: str, html: str) -> dict:
    fetched_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    candidates = social_candidates(retrieved_url, html)
    stable_seed = f"{profile['officialId']}|{retrieved_url}"
    return {
        "candidateRecordVersion": "1.0.0",
        "recordKind": "social_account_candidates",
        "stagingRecordId": str(uuid.uuid5(uuid.NAMESPACE_URL, stable_seed)),
        "sourceKey": "official-website-social-links",
        "sourceUrl": website,
        "sourceMemberUrl": retrieved_url,
        "sourceSnapshotSha256": hashlib.sha256(html.encode("utf-8")).hexdigest(),
        "fetchedAt": fetched_at,
        "extractionStatus": "extracted_unreviewed",
        "canonicalMatchStatus": "matched_existing_official",
        "officialId": profile["officialId"],
        "officialSlug": profile["slug"],
        "displayName": profile["person"]["displayName"],
        "officeTitle": profile["office"]["title"],
        "jurisdictionName": profile["jurisdiction"]["name"],
        "candidates": candidates,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", help="Collect one canonical official profile by slug")
    args = parser.parse_args()

    profiles = canonical_profiles()
    if args.slug:
        profiles = [profile for profile in profiles if profile.get("slug") == args.slug]
    if not profiles:
        print("No matching canonical profiles found", file=sys.stderr)
        return 1

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    written = 0

    for profile in profiles:
        official_sites = [
            site["url"]
            for site in profile.get("websites", [])
            if site.get("type") in {"official", "campaign"} and site.get("url")
        ]
        if not official_sites:
            continue

        for website in official_sites:
            try:
                retrieved_url, html = fetch_html(website)
                record = build_record(profile, website, retrieved_url, html)
            except Exception as exc:  # source failure is explicit; no partial public update
                print(f"{profile['slug']}: {website}: {exc}", file=sys.stderr)
                continue

            path = OUTPUT_ROOT / f"{profile['slug']}.json"
            path.write_text(json.dumps(record, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            print(path.relative_to(ROOT))
            written += 1
            break

    return 0 if written else 1


if __name__ == "__main__":
    raise SystemExit(main())
