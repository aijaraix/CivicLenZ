#!/usr/bin/env python3
"""Bounded, review-only local source discovery for Broward and Miami-Dade.

This worker intentionally maps authoritative-source *candidates* only. It does
not enumerate people, officeholders, seats, contacts, portraits, social accounts,
biographies, campaign data, or public profiles. It refuses normal collection when
the matching South Florida coordination claim is absent or mismatched.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup

from workers.ingestion.common import BROWSER_USER_AGENT, sha256_bytes, slugify, utc_now

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SEEDS = ROOT / "data" / "sources" / "florida-regions" / "south-florida" / "county-root-seeds.json"
DEFAULT_OUTPUT = ROOT / "data" / "staging" / "florida" / "local" / "south-florida" / "source-discovery"
ALLOCATION_PATH = ROOT / "data" / "operations" / "florida-work-allocation.json"

WORKSTREAM_ID = "fl-south-florida-local-source-discovery"
EXPECTED_COUNTIES = {"Broward", "Miami-Dade"}
EXPECTED_OUTPUT_ROOT = "data/staging/florida/local/south-florida"

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
        "candidate filing",
        "voter registration",
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
NON_HTML_SUFFIXES = (
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".svg",
    ".zip",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
)


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
            "publicationAllowed": False,
        }


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def canonicalize_url(value: str, base_url: str) -> str | None:
    raw = (value or "").strip()
    if not raw or raw.startswith(("mailto:", "tel:", "javascript:", "#")):
        return None
    parsed = urlparse(urljoin(base_url, raw))
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    path = re.sub(r"/{2,}", "/", parsed.path or "/")
    return urlunparse(
        (parsed.scheme.lower(), parsed.netloc.lower(), path, "", parsed.query, "")
    )


def is_probable_html(url: str) -> bool:
    path = urlparse(url).path.lower()
    return not any(path.endswith(suffix) for suffix in NON_HTML_SUFFIXES)


def official_domain_bonus(host: str) -> int:
    host = host.lower()
    if host.endswith(".gov") or ".gov." in host or host.endswith(".fl.us"):
        return 5
    if any(token in host for token in ("broward", "miamidade", "florida")):
        return 2
    return 0


def same_or_related_host(host: str, root_host: str) -> bool:
    return host == root_host or host.endswith(f".{root_host}") or root_host.endswith(f".{host}")


def classify_link(label: str, url: str, root_host: str, discovered_on: str) -> list[LinkCandidate]:
    text = clean_text(label)
    haystack = f"{text.lower()} {url.lower()}"
    if any(term in haystack for term in NEGATIVE_TERMS):
        return []

    host = urlparse(url).netloc.lower()
    same_host = same_or_related_host(host, root_host)
    candidates: list[LinkCandidate] = []

    for category, patterns in CATEGORY_PATTERNS.items():
        matched = [pattern for pattern in patterns if pattern in haystack]
        if not matched:
            continue
        score = 10 + min(12, len(matched) * 3)
        score += 4 if same_host else 0
        score += official_domain_bonus(host)
        score += 4 if any(pattern == text.lower() for pattern in matched) else 0
        score += 3 if any(word in haystack for word in ("directory", "officials", "members")) else 0
        candidates.append(
            LinkCandidate(
                category=category,
                url=url,
                label=text,
                discovered_on=discovered_on,
                score=score,
                same_host=same_host,
            )
        )
    return candidates


def extract_page_links(
    html: bytes, page_url: str, root_host: str
) -> tuple[str | None, list[LinkCandidate], list[str]]:
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

        host = urlparse(url).netloc.lower()
        crawl_haystack = f"{label.lower()} {url.lower()}"
        category_match = any(
            pattern in crawl_haystack
            for patterns in CATEGORY_PATTERNS.values()
            for pattern in patterns
        )
        if category_match and same_or_related_host(host, root_host) and is_probable_html(url):
            crawl_urls.append(url)

    return title, candidates, crawl_urls


def fetch_page(session: requests.Session, url: str) -> tuple[requests.Response | None, str | None]:
    try:
        response = session.get(
            url,
            headers=REQUEST_HEADERS,
            timeout=(10, 35),
            allow_redirects=True,
        )
        response.raise_for_status()
        content_type = response.headers.get("content-type", "").lower()
        if "html" not in content_type and "xml" not in content_type:
            return response, f"unsupported_content_type:{content_type or 'unknown'}"
        return response, None
    except Exception as exc:  # County platforms differ; record the safe failure.
        return None, f"{type(exc).__name__}:{exc}"


def dedupe_candidates(
    candidates: Iterable[LinkCandidate], max_per_category: int
) -> dict[str, list[dict[str, object]]]:
    by_category: dict[str, dict[str, LinkCandidate]] = {
        category: {} for category in CATEGORY_PATTERNS
    }
    for candidate in candidates:
        existing = by_category[candidate.category].get(candidate.url)
        if existing is None or candidate.score > existing.score:
            by_category[candidate.category][candidate.url] = candidate

    return {
        category: [
            candidate.to_json()
            for candidate in sorted(items.values(), key=lambda item: (-item.score, item.url))[
                :max_per_category
            ]
        ]
        for category, items in by_category.items()
    }


def empty_record(seed: dict[str, object], fetched_at: str, error: str) -> dict[str, object]:
    return {
        "sourceDiscoveryVersion": "1.0.0",
        "workstreamId": WORKSTREAM_ID,
        "county": str(seed["county"]),
        "state": "Florida",
        "stateCode": "FL",
        "region": "broward_and_miami_dade",
        "rootSeedUrl": str(seed["countyGovernmentRoot"]),
        "rootSeedStatus": seed.get("rootStatus"),
        "fetchedAt": fetched_at,
        "collectionStatus": "failed",
        "publicationAllowed": False,
        "reviewStatus": "unreviewed",
        "sourceCandidates": {category: [] for category in CATEGORY_PATTERNS},
        "resolvedCategoryCount": 0,
        "requiredCategoryCount": len(CATEGORY_PATTERNS),
        "unresolvedCategories": list(CATEGORY_PATTERNS),
        "visitedPages": [],
        "errors": [error],
        "notes": [
            "This is a review-only source-discovery record; it contains no people or officeholder data.",
            "A failure means no source was verified and must not be inferred as an absence of an office or official.",
        ],
    }


def discover_county(
    seed: dict[str, object], max_pages: int, max_per_category: int
) -> dict[str, object]:
    county = str(seed["county"])
    root_url = str(seed["countyGovernmentRoot"])
    root_host = urlparse(root_url).netloc.lower()
    fetched_at = utc_now()
    session = requests.Session()

    response, root_error = fetch_page(session, root_url)
    if response is None:
        return empty_record(seed, fetched_at, root_error or "unknown_root_error")

    all_candidates: list[LinkCandidate] = []
    visited: list[dict[str, object]] = []
    queue: list[str] = []
    seen: set[str] = {response.url}

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
    queue.extend(crawl_urls)

    while queue and len(visited) < max_pages:
        page_url = queue.pop(0)
        if page_url in seen:
            continue
        seen.add(page_url)
        page_response, page_error = fetch_page(session, page_url)
        if page_response is None:
            visited.append({"url": page_url, "error": page_error})
            continue
        page_title, page_candidates, more_urls = extract_page_links(
            page_response.content, page_response.url, root_host
        )
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
        for candidate_url in more_urls:
            if candidate_url not in seen and candidate_url not in queue:
                queue.append(candidate_url)

    grouped = dedupe_candidates(all_candidates, max_per_category)
    unresolved = [category for category, items in grouped.items() if not items]
    resolved = len(grouped) - len(unresolved)
    return {
        "sourceDiscoveryVersion": "1.0.0",
        "workstreamId": WORKSTREAM_ID,
        "county": county,
        "state": "Florida",
        "stateCode": "FL",
        "region": "broward_and_miami_dade",
        "rootSeedUrl": root_url,
        "finalRootUrl": response.url,
        "rootSeedStatus": seed.get("rootStatus"),
        "sitePlatformHint": seed.get("sitePlatformHint"),
        "fetchedAt": fetched_at,
        "collectionStatus": "success" if resolved else "partial",
        "publicationAllowed": False,
        "reviewStatus": "unreviewed",
        "visitedPages": visited,
        "sourceCandidates": grouped,
        "resolvedCategoryCount": resolved,
        "requiredCategoryCount": len(CATEGORY_PATTERNS),
        "unresolvedCategories": unresolved,
        "notes": [
            "Candidate links require source review before any later collection phase can use them.",
            "External links are retained only as candidates linked from the county root; the worker does not follow them.",
            "This record deliberately contains no individual, officeholder, or public-profile data.",
        ],
        "errors": [root_error] if root_error else [],
    }


def write_records(records: list[dict[str, object]], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for record in records:
        output = output_dir / f"{slugify(str(record['county']))}-county-source-discovery.json"
        output.write_text(
            json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )


def verify_active_claim(allow_missing: bool = False) -> bool:
    if not ALLOCATION_PATH.exists():
        if allow_missing:
            print("Coordination allocation is unavailable; dry PR validation may continue.")
            return False
        raise RuntimeError(f"Missing allocation registry: {ALLOCATION_PATH}")

    payload = json.loads(ALLOCATION_PATH.read_text(encoding="utf-8"))
    claim = next(
        (
            item
            for item in payload.get("workstreams", [])
            if item.get("workstreamId") == WORKSTREAM_ID
        ),
        None,
    )
    if claim is None:
        if allow_missing:
            print(f"Coordination claim {WORKSTREAM_ID} is not yet present; no live collection is allowed.")
            return False
        raise RuntimeError(
            f"Required coordination claim {WORKSTREAM_ID} is absent. "
            "Merge coordination PR #32 before live discovery."
        )

    errors: list[str] = []
    if claim.get("status") != "active_claimed":
        errors.append("status must be active_claimed")
    counties = set(claim.get("scope", {}).get("counties", []))
    if counties != EXPECTED_COUNTIES:
        errors.append(f"counties must equal {sorted(EXPECTED_COUNTIES)}")
    phases = set(claim.get("scope", {}).get("dataPhases", []))
    if phases != {"source_discovery"}:
        errors.append("data phase must be source_discovery only")
    roots = set(claim.get("outputRoots", []))
    if EXPECTED_OUTPUT_ROOT not in roots:
        errors.append(f"missing output root {EXPECTED_OUTPUT_ROOT}")
    if errors:
        raise RuntimeError(
            f"South Florida coordination claim is unsafe: {'; '.join(errors)}"
        )
    print("South Florida source-discovery claim is active and isolated.")
    return True


def self_test() -> int:
    root = "examplecountyfl.gov"
    classified = classify_link(
        "Board of County Commissioners",
        "https://examplecountyfl.gov/government/commission",
        root,
        "https://examplecountyfl.gov/",
    )
    if "county_commission_directory" not in {item.category for item in classified}:
        raise AssertionError("county commission classification failed")

    classified = classify_link(
        "Supervisor of Elections",
        "https://voteexample.gov/",
        root,
        "https://examplecountyfl.gov/",
    )
    if "supervisor_of_elections_directory" not in {item.category for item in classified}:
        raise AssertionError("elections classification failed")

    if canonicalize_url(
        "../government/commission#district-1", "https://examplecountyfl.gov/departments/"
    ) != "https://examplecountyfl.gov/government/commission":
        raise AssertionError("URL canonicalization failed")

    html = b"""
      <html><head><title>Example County</title></head><body>
        <a href="/government/commission">County Commissioners</a>
        <a href="https://examplevotes.gov/">Supervisor of Elections</a>
        <a href="/jobs">Employment Opportunities</a>
      </body></html>
    """
    title, candidates, crawl_urls = extract_page_links(
        html, "https://examplecountyfl.gov/", root
    )
    if title != "Example County":
        raise AssertionError("title extraction failed")
    categories = {item.category for item in candidates}
    if "county_commission_directory" not in categories:
        raise AssertionError("same-host extraction failed")
    if "supervisor_of_elections_directory" not in categories:
        raise AssertionError("external candidate extraction failed")
    if "https://examplecountyfl.gov/jobs" in crawl_urls:
        raise AssertionError("negative-term filtering failed")

    print("South Florida source-discovery self-test passed.")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seeds", type=Path, default=DEFAULT_SEEDS)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--max-pages-per-county", type=int, default=8)
    parser.add_argument("--max-candidates-per-category", type=int, default=12)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--minimum-success-rate", type=float, default=0.50)
    parser.add_argument("--verify-claim", action="store_true")
    parser.add_argument("--allow-missing-claim", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.self_test:
        return self_test()
    if args.workers < 1 or args.workers > 2:
        raise SystemExit("--workers must be between 1 and 2 for this bounded lane")
    if args.max_pages_per_county < 1 or args.max_pages_per_county > 12:
        raise SystemExit("--max-pages-per-county must be between 1 and 12")
    if args.max_candidates_per_category < 1 or args.max_candidates_per_category > 20:
        raise SystemExit("--max-candidates-per-category must be between 1 and 20")
    if not 0 <= args.minimum_success_rate <= 1:
        raise SystemExit("--minimum-success-rate must be in [0, 1]")

    claim_present = verify_active_claim(allow_missing=args.allow_missing_claim)
    if args.verify_claim:
        return 0
    if args.dry_run:
        print(
            json.dumps(
                {
                    "worker": WORKSTREAM_ID,
                    "seeds": str(args.seeds),
                    "outputDir": str(args.output_dir),
                    "workers": args.workers,
                    "maxPagesPerCounty": args.max_pages_per_county,
                    "publicationAllowed": False,
                },
                indent=2,
            )
        )
        return 0
    if not claim_present:
        raise SystemExit("Live source discovery is blocked until the coordination claim is active.")

    payload = json.loads(args.seeds.read_text(encoding="utf-8"))
    counties = list(payload.get("counties", []))
    if set(str(item.get("county")) for item in counties) != EXPECTED_COUNTIES:
        raise SystemExit("Seed file must contain exactly Broward and Miami-Dade.")
    if args.limit:
        counties = counties[: args.limit]

    records: list[dict[str, object]] = []
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        future_map = {
            executor.submit(
                discover_county, seed, args.max_pages_per_county, args.max_candidates_per_category
            ): seed
            for seed in counties
        }
        for future in as_completed(future_map):
            seed = future_map[future]
            try:
                records.append(future.result())
            except Exception as exc:  # Persist a safe failure artifact, never an inferred result.
                records.append(empty_record(seed, utc_now(), f"unhandled:{type(exc).__name__}:{exc}"))

    records.sort(key=lambda item: str(item["county"]))
    write_records(records, args.output_dir)
    successful = sum(
        record.get("collectionStatus") in {"success", "partial"} for record in records
    )
    resolved = sum(int(record.get("resolvedCategoryCount", 0)) for record in records)
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
                "publicationAllowed": False,
            },
            indent=2,
        )
    )
    if records and success_rate < args.minimum_success_rate:
        raise SystemExit(
            f"South Florida source discovery success rate {success_rate:.1%} "
            f"was below required {args.minimum_success_rate:.1%}"
        )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)
