#!/usr/bin/env python3
"""Collect review-only Central Florida local-government source maps.

This worker is deliberately narrow. It reads a fixed allowlist of 15 official
entry points for Lake, Orange, Osceola, Polk, and Seminole counties. It does
not follow discovered links, extract people, create officeholder records, or
write outside the Central Florida source-discovery staging directory.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Any
from urllib import robotparser
from urllib.parse import urlparse

import requests

from workers.ingestion.common import sha256_bytes, slugify, utc_now, write_json_records

ROOT = Path(__file__).resolve().parents[2]
PLAN_PATH = ROOT / "data" / "sources" / "florida-regions" / "central" / "source-plan.json"
OUTPUT_DIRECTORY = ROOT / "data" / "staging" / "florida" / "local" / "central" / "source-discovery"
ROBOT_USER_AGENT = "CivicLenZSourceDiscovery"


class SourcePlanError(ValueError):
    """Raised when a source plan violates the collection contract."""


def load_json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise SourcePlanError(f"Unable to read {path}: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise SourcePlanError(f"{path} is not valid JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise SourcePlanError(f"{path} must contain a JSON object")
    return data


def https_url(value: object) -> bool:
    if not isinstance(value, str):
        return False
    parsed = urlparse(value)
    return parsed.scheme == "https" and bool(parsed.netloc)


def permitted_host(host: str, requested_host: str) -> bool:
    """Permit only the configured host and its ordinary www/non-www variant."""

    normalized_host = host.lower().split(":", 1)[0]
    normalized_requested = requested_host.lower().split(":", 1)[0]
    return normalized_host in {
        normalized_requested,
        f"www.{normalized_requested.removeprefix('www.')}",
        normalized_requested.removeprefix("www."),
    }


def validate_plan(plan: dict[str, Any]) -> int:
    required_top_level = {
        "sourcePlanVersion",
        "workstreamId",
        "ownerKey",
        "scope",
        "publicationAllowed",
        "reviewStatus",
        "retrievalPolicy",
        "counties",
    }
    missing = required_top_level.difference(plan)
    if missing:
        raise SourcePlanError(f"Plan is missing keys: {', '.join(sorted(missing))}")
    if plan["workstreamId"] != "fl-central-florida-local-source-discovery":
        raise SourcePlanError("Plan workstreamId does not match the Central Florida source-discovery claim")
    if plan["ownerKey"] != "agent-central-florida-source-discovery":
        raise SourcePlanError("Plan ownerKey does not match the Central Florida source-discovery claim")
    if plan["publicationAllowed"] is not False or plan["reviewStatus"] != "unreviewed":
        raise SourcePlanError("Source discovery must be non-public and unreviewed")
    if not isinstance(plan["scope"], dict) or plan["scope"].get("dataPhase") != "source_discovery":
        raise SourcePlanError("Plan must be limited to the source_discovery data phase")
    expected_counties = {"Lake", "Orange", "Osceola", "Polk", "Seminole"}
    configured_counties = {
        item.get("county")
        for item in plan["counties"]
        if isinstance(item, dict) and isinstance(item.get("county"), str)
    }
    if configured_counties != expected_counties:
        raise SourcePlanError(
            "Plan counties must be exactly Lake, Orange, Osceola, Polk, and Seminole"
        )

    policy = plan["retrievalPolicy"]
    if not isinstance(policy, dict):
        raise SourcePlanError("retrievalPolicy must be an object")
    max_requests = policy.get("maxRequestsPerRun")
    if not isinstance(max_requests, int) or max_requests < 1:
        raise SourcePlanError("retrievalPolicy.maxRequestsPerRun must be a positive integer")
    if policy.get("recursiveCrawling") is not False:
        raise SourcePlanError("recursive crawling must remain disabled")
    if policy.get("robotsTxt") != "honor":
        raise SourcePlanError("robots.txt policy must remain honor")

    source_keys: set[str] = set()
    source_count = 0
    for county in plan["counties"]:
        if not isinstance(county, dict):
            raise SourcePlanError("Every county plan must be an object")
        required_categories = county.get("requiredCategories")
        candidates_by_category = county.get("sourceCandidates")
        if not isinstance(required_categories, list) or not all(
            isinstance(category, str) for category in required_categories
        ):
            raise SourcePlanError(f"{county.get('county')}: requiredCategories must be string list")
        if not isinstance(candidates_by_category, dict):
            raise SourcePlanError(f"{county.get('county')}: sourceCandidates must be an object")
        if set(required_categories) != set(candidates_by_category):
            raise SourcePlanError(
                f"{county.get('county')}: sourceCandidates must have every required category"
            )
        for category, candidates in candidates_by_category.items():
            if not isinstance(candidates, list):
                raise SourcePlanError(f"{county.get('county')}: {category} must be a list")
            for candidate in candidates:
                if not isinstance(candidate, dict):
                    raise SourcePlanError(f"{county.get('county')}: {category} candidate must be an object")
                source_key = candidate.get("sourceKey")
                source_url = candidate.get("sourceUrl")
                if not isinstance(source_key, str) or not source_key:
                    raise SourcePlanError(f"{county.get('county')}: source candidate has no sourceKey")
                if source_key in source_keys:
                    raise SourcePlanError(f"Duplicate sourceKey in plan: {source_key}")
                if not https_url(source_url):
                    raise SourcePlanError(f"{source_key}: sourceUrl must be an absolute HTTPS URL")
                source_keys.add(source_key)
                source_count += 1

    if source_count > max_requests:
        raise SourcePlanError(
            f"Plan configures {source_count} requests but its per-run limit is {max_requests}"
        )
    return source_count


def pause_for_host(
    host: str,
    last_request_at: dict[str, float],
    minimum_delay_seconds: float,
) -> None:
    previous = last_request_at.get(host)
    if previous is not None:
        remaining = minimum_delay_seconds - (time.monotonic() - previous)
        if remaining > 0:
            time.sleep(remaining)


def fetch_robots(
    session: requests.Session,
    source_url: str,
    minimum_delay_seconds: float,
    last_request_at: dict[str, float],
    robots_cache: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    parsed = urlparse(source_url)
    host = parsed.netloc.lower()
    if host in robots_cache:
        return robots_cache[host]

    robots_url = f"{parsed.scheme}://{host}/robots.txt"
    pause_for_host(host, last_request_at, minimum_delay_seconds)
    try:
        response = session.get(robots_url, timeout=(10, 30), allow_redirects=True)
        last_request_at[host] = time.monotonic()
    except requests.RequestException as exc:
        result = {
            "allowed": False,
            "status": "robots_unavailable",
            "crawlDelaySeconds": minimum_delay_seconds,
            "detail": f"{type(exc).__name__}: {str(exc)[:180]}",
        }
        robots_cache[host] = result
        return result

    if response.status_code == 404:
        result = {
            "allowed": True,
            "status": "robots_not_found",
            "crawlDelaySeconds": minimum_delay_seconds,
            "detail": None,
        }
        robots_cache[host] = result
        return result
    if response.status_code < 200 or response.status_code >= 300:
        result = {
            "allowed": False,
            "status": "robots_unavailable",
            "crawlDelaySeconds": minimum_delay_seconds,
            "detail": f"robots.txt returned HTTP {response.status_code}",
        }
        robots_cache[host] = result
        return result

    parser = robotparser.RobotFileParser()
    parser.set_url(robots_url)
    parser.parse(response.text.splitlines())
    configured_delay = parser.crawl_delay(ROBOT_USER_AGENT) or parser.crawl_delay("*")
    crawl_delay = max(minimum_delay_seconds, float(configured_delay or 0))
    result = {
        "allowed": parser.can_fetch(ROBOT_USER_AGENT, source_url),
        "status": "robots_allowed" if parser.can_fetch(ROBOT_USER_AGENT, source_url) else "robots_disallowed",
        "crawlDelaySeconds": crawl_delay,
        "detail": None,
    }
    robots_cache[host] = result
    return result


def page_title(response: requests.Response) -> str | None:
    content_type = response.headers.get("content-type", "").lower()
    if "html" not in content_type:
        return None
    text = response.content[:512_000].decode(response.encoding or "utf-8", errors="replace")
    match = re.search(r"<title[^>]*>(.*?)</title>", text, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return None
    title = re.sub(r"\s+", " ", match.group(1)).strip()
    return title[:300] or None


def fetch_candidate(
    session: requests.Session,
    candidate: dict[str, Any],
    minimum_delay_seconds: float,
    last_request_at: dict[str, float],
    robots_cache: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    source_url = str(candidate["sourceUrl"])
    requested_host = urlparse(source_url).netloc.lower()
    fetched_at = utc_now()
    robots = fetch_robots(
        session,
        source_url,
        minimum_delay_seconds,
        last_request_at,
        robots_cache,
    )
    result: dict[str, Any] = {
        "sourceKey": candidate["sourceKey"],
        "sourceUrl": source_url,
        "authority": candidate.get("authority"),
        "authorityType": candidate.get("authorityType"),
        "sourceRole": candidate.get("sourceRole"),
        "sourceProvenance": candidate.get("sourceProvenance"),
        "fetchedAt": fetched_at,
        "robotsStatus": robots["status"],
        "robotsCrawlDelaySeconds": robots["crawlDelaySeconds"],
        "retrievalStatus": "blocked",
    }
    if not robots["allowed"]:
        result["error"] = robots["detail"] or "Robots policy does not permit this source request"
        return result

    pause_for_host(
        requested_host,
        last_request_at,
        float(robots["crawlDelaySeconds"]),
    )
    try:
        response = session.get(source_url, timeout=(10, 30), allow_redirects=True)
        last_request_at[requested_host] = time.monotonic()
    except requests.RequestException as exc:
        result["retrievalStatus"] = "failed"
        result["error"] = f"{type(exc).__name__}: {str(exc)[:180]}"
        return result

    final_url = response.url
    final_host = urlparse(final_url).netloc.lower()
    result["httpStatus"] = response.status_code
    result["finalUrl"] = final_url
    result["contentType"] = response.headers.get("content-type", "").split(";", 1)[0].lower() or None
    if not permitted_host(final_host, requested_host):
        result["retrievalStatus"] = "blocked"
        result["error"] = "Redirected outside the configured source host; review before adding that host"
        return result
    if response.status_code < 200 or response.status_code >= 300:
        result["retrievalStatus"] = "failed"
        result["error"] = f"Source returned HTTP {response.status_code}"
        return result

    result["retrievalStatus"] = "success"
    result["sha256"] = sha256_bytes(response.content)
    result["title"] = page_title(response)
    return result


def collection_status(results: list[dict[str, Any]]) -> str:
    statuses = [result.get("retrievalStatus") for result in results]
    success_count = statuses.count("success")
    if success_count == len(results):
        return "success"
    if success_count:
        return "partial"
    if "blocked" in statuses:
        return "blocked"
    return "failed"


def build_source_map(
    county: dict[str, Any],
    session: requests.Session,
    minimum_delay_seconds: float,
    last_request_at: dict[str, float],
    robots_cache: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    candidate_results: dict[str, list[dict[str, Any]]] = {}
    all_results: list[dict[str, Any]] = []
    for category in county["requiredCategories"]:
        results = [
            fetch_candidate(
                session,
                candidate,
                minimum_delay_seconds,
                last_request_at,
                robots_cache,
            )
            for candidate in county["sourceCandidates"][category]
        ]
        candidate_results[category] = results
        all_results.extend(results)

    resolved_categories = [
        category
        for category, results in candidate_results.items()
        if any(result.get("retrievalStatus") == "success" for result in results)
    ]
    unresolved_categories = [
        category
        for category in county["requiredCategories"]
        if category not in resolved_categories
    ]
    visited_pages = [
        {
            key: result[key]
            for key in (
                "sourceKey",
                "sourceUrl",
                "finalUrl",
                "httpStatus",
                "contentType",
                "sha256",
                "fetchedAt",
                "retrievalStatus",
            )
            if key in result and result[key] is not None
        }
        for result in all_results
    ]

    return {
        "sourceDiscoveryVersion": "1.0.0",
        "county": county["county"],
        "state": county["state"],
        "stateCode": county["stateCode"],
        "fetchedAt": utc_now(),
        "collectionStatus": collection_status(all_results),
        "publicationAllowed": False,
        "reviewStatus": "unreviewed",
        "workstreamId": "fl-central-florida-local-source-discovery",
        "scope": {
            "dataPhase": "source_discovery",
            "governmentLevels": ["county", "school_district", "municipal", "special_district", "judicial"],
        },
        "sourceCandidates": candidate_results,
        "requiredCategories": county["requiredCategories"],
        "resolvedCategories": resolved_categories,
        "unresolvedCategories": unresolved_categories,
        "requiredCategoryCount": len(county["requiredCategories"]),
        "resolvedCategoryCount": len(resolved_categories),
        "visitedPages": visited_pages,
        "collectionNotes": (
            "Review-only source entry-point map. It records retrieval metadata and content hashes only; "
            "it contains no person, officeholder, portrait, contact, social, biography, finance, score, "
            "or public profile data."
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--validate-plan", action="store_true", help="Validate the static plan without HTTP requests or writes.")
    parser.add_argument("--dry-run", action="store_true", help="Print the bounded run scope without HTTP requests or writes.")
    args = parser.parse_args()

    plan = load_json(PLAN_PATH)
    source_count = validate_plan(plan)
    if args.validate_plan:
        print(
            json.dumps(
                {
                    "status": "valid",
                    "workstreamId": plan["workstreamId"],
                    "countyCount": len(plan["counties"]),
                    "sourceEntryPointCount": source_count,
                    "publicationAllowed": plan["publicationAllowed"],
                },
                indent=2,
            )
        )
        return 0
    if args.dry_run:
        print(
            json.dumps(
                {
                    "status": "dry_run",
                    "countyCount": len(plan["counties"]),
                    "sourceEntryPointCount": source_count,
                    "maximumRequestsPerRun": plan["retrievalPolicy"]["maxRequestsPerRun"],
                    "outputDirectory": str(OUTPUT_DIRECTORY.relative_to(ROOT)),
                },
                indent=2,
            )
        )
        return 0

    policy = plan["retrievalPolicy"]
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": str(policy["requestUserAgent"]),
            "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.1",
            "Accept-Language": "en-US,en;q=0.9",
        }
    )
    last_request_at: dict[str, float] = {}
    robots_cache: dict[str, dict[str, Any]] = {}
    records = [
        build_source_map(
            county,
            session,
            float(policy["minimumDelaySecondsPerHost"]),
            last_request_at,
            robots_cache,
        )
        for county in plan["counties"]
    ]
    written = write_json_records(
        records,
        OUTPUT_DIRECTORY,
        lambda record: f"{slugify(str(record['county']))}-source-map.json",
    )
    summary = defaultdict(int)
    for record in records:
        summary[str(record["collectionStatus"])] += 1
    print(
        json.dumps(
            {
                "status": "complete",
                "workstreamId": plan["workstreamId"],
                "recordsWritten": written,
                "collectionStatusCounts": dict(sorted(summary.items())),
                "publicationAllowed": False,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SourcePlanError as exc:
        print(f"Central Florida source-plan validation failed: {exc}", file=sys.stderr)
        raise SystemExit(2)
