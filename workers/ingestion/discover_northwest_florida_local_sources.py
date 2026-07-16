#!/usr/bin/env python3
"""Discover official local-government source directories for Northwest Florida.

This worker is intentionally source-first. It does not publish officeholders. It maps
county, constitutional-office, school, municipal, special-district, judicial, finance,
and disclosure source candidates into review-only staging records.
"""

from __future__ import annotations

import argparse
import json
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup

from workers.ingestion.common import BROWSER_USER_AGENT, sha256_bytes, slugify, utc_now

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SEEDS = ROOT / "data" / "sources" / "florida-regions" / "northwest" / "county-root-seeds.json"
DEFAULT_OUTPUT = ROOT / "data" / "staging" / "florida" / "local" / "northwest" / "source-discovery"

REQUEST_HEADERS = {
    "User-Agent": BROWSER_USER_AGENT,
    "From": "research@civicslenz.com",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
}

CATEGORY_PATTERNS: dict[str, tuple[str, ...]] = {
    "county_commission_directory": (
        "board of county commissioners",
        "county commissioners",
        "county commission",
        "commissioners",
        "bocc",
    ),
    "sheriff_directory": ("sheriff", "sheriff's office", "sheriffs office"),
    "clerk_directory": (
        "clerk of court",
        "clerk of courts",
        "clerk and comptroller",
        "clerk of the circuit court",
        "county clerk",
    ),
    "supervisor_of_elections_directory": (
        "supervisor of elections",
        "elections office",
        "vote ",
        "voter registration",
        "candidate filing",
    ),
    "tax_collector_directory": ("tax collector", "county tax"),
    "property_appraiser_directory": ("property appraiser", "property appraisal"),
    "school_board_directory": (
        "school board",
        "district schools",
        "school district",
        "board members",
    ),
    "school_superintendent_status_and_directory": (
        "superintendent",
        "school superintendent",
    ),
    "municipality_registry": (
        "municipalities",
        "cities and towns",
        "city government",
        "town government",
        "local governments",
    ),
    "special_district_registry": (
        "special districts",
        "special district",
        "independent district",
        "dependent district",
    ),
    "judicial_election_or_retention_sources": (
        "county judge",
        "judges",
        "judicial",
        "circuit court",
        "court administration",
    ),
    "campaign_finance_and_candidate_filing_sources": (
        "campaign finance",
        "candidate reports",
        "candidate information",
        "candidate filing",
        "financial reports",
        "election reports",
    ),
    "financial_disclosure_sources": (
        "financial disclosure",
        "form 1",
        "form 6",
        "ethics disclosure",
        "disclosure filing",
    ),
}

NEGATIVE_TERMS = (
    "employment",
    "job openings",
    "tourism",
    "parks and recreation",
    "animal control",
    "emergency management",
    "road closure",
    "utility bill",
)

HTML_EXTENSIONS = ("", ".html", ".htm", ".php", ".aspx", ".asp", "/")


@dataclass(frozen=True)
class LinkCandidate:
    category: str
    url: str
    label: str
    discovered_on: str
    score: int
    same_host: bool

    def to_json(self) -> dict[str, object]:
        return {
            "url": self.url,
            "label": self.label or None,
            "discoveredOn": self.discovered_on,
            "score": self.score,
            "sameHost": self.same_host,
            "reviewStatus": "unreviewed",
        }


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def canonicalize_url(value: str, base_url: str) -> str | None:
    if not value:
        return None
    raw = value.strip()
    if raw.startswith(("mailto:", "tel:", "javascript:", "#")):
        return None
    joined = urljoin(base_url, raw)
    parsed = urlparse(joined)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    path = re.sub(r"/{2,}", "/", parsed.path or "/")
    return urlunparse((parsed.scheme.lower(), parsed.netloc.lower(), path, "", parsed.query, ""))


def is_probable_html(url: str) -> bool:
    path = urlparse(url).path.lower()
    if any(path.endswith(ext) for ext in (".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".zip", ".doc", ".docx", ".xls", ".xlsx")):
        return False
    return path.endswith(HTML_EXTENSIONS)


def official_domain_bonus(host: str) -> int:
    host = host.lower()
    if host.endswith(".gov") or ".gov." in host:
        return 5
    if host.endswith(".fl.us"):
        return 5
    if any(token in host for token in ("countyfl", "florida", "myescambia", "myokaloosa", "mywakulla", "mywalton")):
        return 2
    return 0


def classify_link(label: str, url: str, root_host: str, discovered_on: str) -> list[LinkCandidate]:
    haystack = f"{clean_text(label).lower()} {url.lower()}"
    if any(term in haystack for term in NEGATIVE_TERMS):
        return []

    host = urlparse(url).netloc.lower()
    same_host = host == root_host or host.endswith(f".{root_host}") or root_host.endswith(f".{host}")
    results: list[LinkCandidate] = []

    for category, patterns in CATEGORY_PATTERNS.items():
        matched = [pattern for pattern in patterns if pattern in haystack]
        if not matched:
            continue
        score = 10 + min(12, 3 * len(matched))
        if same_host:
            score += 4
        score += official_domain_bonus(host)
        if any(pattern == clean_text(label).lower() for pattern in matched):
            score += 4
        if "directory" in haystack or "officials" in haystack or "members" in haystack:
            score += 3
        results.append(
            LinkCandidate(
                category=category,
                url=url,
                label=clean_text(label),
                discovered_on=discovered_on,
                score=score,
                same_host=same_host,
            )
        )
    return results


def extract_page_links(html: bytes, page_url: str, root_host: str) -> tuple[str | None, list[LinkCandidate], list[str]]:
    soup = BeautifulSoup(html, "lxml")
    title = clean_text(soup.title.get_text(" ", strip=True)) if soup.title else None
    candidates: list[LinkCandidate] = []
    crawl_urls: list[str] = []

    for anchor in soup.find_all("a", href=True):
        url = canonicalize_url(str(anchor.get("href")), page_url)
        if not url:
            continue
        label = clean_text(anchor.get_text(" ", strip=True))
        candidates.extend(classify_link(label, url, root_host, page_url))

        parsed = urlparse(url)
        same_host = parsed.netloc == root_host or parsed.netloc.endswith(f".{root_host}") or root_host.endswith(f".{parsed.netloc}")
        if same_host and is_probable_html(url):
            crawl_haystack = f"{label.lower()} {url.lower()}"
            if any(pattern in crawl_haystack for patterns in CATEGORY_PATTERNS.values() for pattern in patterns):
                crawl_urls.append(url)

    return title, candidates, crawl_urls


def fetch_page(session: requests.Session, url: str) -> tuple[requests.Response | None, str | None]:
    try:
        response = session.get(url, headers=REQUEST_HEADERS, timeout=(10, 45), allow_redirects=True)
        response.raise_for_status()
        content_type = response.headers.get("content-type", "").lower()
        if "html" not in content_type and "xml" not in content_type:
            return response, f"unsupported_content_type:{content_type or 'unknown'}"
        return response, None
    except Exception as exc:  # network behavior varies by county platform
        return None, f"{type(exc).__name__}:{exc}"


def dedupe_candidates(candidates: Iterable[LinkCandidate]) -> dict[str, list[dict[str, object]]]:
    grouped: dict[str, dict[str, LinkCandidate]] = {category: {} for category in CATEGORY_PATTERNS}
    for candidate in candidates:
        existing = grouped[candidate.category].get(candidate.url)
        if existing is None or candidate.score > existing.score:
            grouped[candidate.category][candidate.url] = candidate

    result: dict[str, list[dict[str, object]]] = {}
    for category, by_url in grouped.items():
        ranked = sorted(by_url.values(), key=lambda item: (-item.score, item.url))
        result[category] = [item.to_json() for item in ranked[:20]]
    return result


def discover_county(seed: dict[str, object], max_pages: int) -> dict[str, object]:
    county = str(seed["county"])
    root_url = str(seed["countyGovernmentRoot"])
    root_host = urlparse(root_url).netloc.lower()
    fetched_at = utc_now()
    session = requests.Session()

    response, root_error = fetch_page(session, root_url)
    if response is None:
        return {
            "sourceDiscoveryVersion": "1.0.0",
            "county": county,
            "state": "Florida",
            "stateCode": "FL",
            "region": "northwest_florida_panhandle",
            "rootSeedUrl": root_url,
            "fetchedAt": fetched_at,
            "collectionStatus": "failed",
            "publicationAllowed": False,
            "errors": [root_error],
            "sourceCandidates": {category: [] for category in CATEGORY_PATTERNS},
            "unresolvedCategories": list(CATEGORY_PATTERNS),
        }

    all_candidates: list[LinkCandidate] = []
    visited: list[dict[str, object]] = []
    page_queue: list[str] = []

    title, candidates, crawl_urls = extract_page_links(response.content, response.url, root_host)
    all_candidates.extend(candidates)
    visited.append(
        {
            "url": response.url,
            "httpStatus": response.status_code,
            "contentType": response.headers.get("content-type"),
            "pageTitle": title,
            "sha256": sha256_bytes(response.content),
        }
    )
    page_queue.extend(crawl_urls)

    seen = {response.url}
    for page_url in page_queue:
        if len(visited) >= max_pages:
            break
        if page_url in seen:
            continue
        seen.add(page_url)
        page_response, page_error = fetch_page(session, page_url)
        if page_response is None:
            visited.append({"url": page_url, "error": page_error})
            continue
        page_title, page_candidates, more_urls = extract_page_links(page_response.content, page_response.url, root_host)
        all_candidates.extend(page_candidates)
        visited.append(
            {
                "url": page_response.url,
                "httpStatus": page_response.status_code,
                "contentType": page_response.headers.get("content-type"),
                "pageTitle": page_title,
                "sha256": sha256_bytes(page_response.content),
            }
        )
        for more_url in more_urls:
            if more_url not in seen and more_url not in page_queue:
                page_queue.append(more_url)

    grouped = dedupe_candidates(all_candidates)
    unresolved = [category for category, items in grouped.items() if not items]
    found_count = len(grouped) - len(unresolved)

    return {
        "sourceDiscoveryVersion": "1.0.0",
        "county": county,
        "state": "Florida",
        "stateCode": "FL",
        "region": "northwest_florida_panhandle",
        "rootSeedUrl": root_url,
        "finalRootUrl": response.url,
        "rootSeedStatus": seed.get("rootStatus"),
        "sitePlatformHint": seed.get("sitePlatformHint"),
        "fetchedAt": fetched_at,
        "collectionStatus": "success" if found_count else "partial",
        "publicationAllowed": False,
        "reviewStatus": "unreviewed",
        "visitedPages": visited,
        "sourceCandidates": grouped,
        "resolvedCategoryCount": found_count,
        "requiredCategoryCount": len(CATEGORY_PATTERNS),
        "unresolvedCategories": unresolved,
        "notes": [
            "Candidate links require source review before they can seed an officeholder collector.",
            "External constitutional-office and school-district domains are allowed only when linked from an attributable official source or independently verified.",
        ],
        "errors": [root_error] if root_error else [],
    }


def write_records(records: list[dict[str, object]], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    expected: set[Path] = set()
    for record in records:
        path = output_dir / f"{slugify(str(record['county']))}-county-source-discovery.json"
        expected.add(path)
        path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    for existing in output_dir.glob("*.json"):
        if existing not in expected:
            existing.unlink()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seeds", type=Path, default=DEFAULT_SEEDS)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--max-pages-per-county", type=int, default=12)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--minimum-success-rate", type=float, default=0.5)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    payload = json.loads(args.seeds.read_text(encoding="utf-8"))
    counties = list(payload["counties"])
    if args.limit:
        counties = counties[: args.limit]

    records: list[dict[str, object]] = []
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        future_map = {
            executor.submit(discover_county, seed, max(1, args.max_pages_per_county)): seed
            for seed in counties
        }
        for future in as_completed(future_map):
            seed = future_map[future]
            try:
                records.append(future.result())
            except Exception as exc:
                records.append(
                    {
                        "sourceDiscoveryVersion": "1.0.0",
                        "county": seed["county"],
                        "state": "Florida",
                        "stateCode": "FL",
                        "region": "northwest_florida_panhandle",
                        "rootSeedUrl": seed["countyGovernmentRoot"],
                        "fetchedAt": utc_now(),
                        "collectionStatus": "failed",
                        "publicationAllowed": False,
                        "errors": [f"unhandled:{type(exc).__name__}:{exc}"],
                        "sourceCandidates": {category: [] for category in CATEGORY_PATTERNS},
                        "unresolvedCategories": list(CATEGORY_PATTERNS),
                    }
                )

    records.sort(key=lambda item: str(item["county"]))
    write_records(records, args.output_dir)

    successful = sum(item.get("collectionStatus") in {"success", "partial"} for item in records)
    resolved = sum(int(item.get("resolvedCategoryCount", 0)) for item in records)
    possible = len(records) * len(CATEGORY_PATTERNS)
    success_rate = successful / len(records) if records else 0.0
    print(
        json.dumps(
            {
                "records": len(records),
                "successfulOrPartial": successful,
                "successRate": round(success_rate, 4),
                "resolvedSourceCategories": resolved,
                "possibleSourceCategories": possible,
                "outputDir": str(args.output_dir),
            },
            indent=2,
        )
    )
    if records and success_rate < args.minimum_success_rate:
        raise SystemExit(
            f"Northwest Florida source discovery success rate {success_rate:.1%} "
            f"was below required {args.minimum_success_rate:.1%}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
