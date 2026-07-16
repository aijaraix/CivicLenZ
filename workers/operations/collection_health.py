#!/usr/bin/env python3
"""Create an evidence-safe health snapshot for CivicLenZ collection pipelines.

This script never publishes or promotes civic data. It measures staged source
records, research queues, review-only candidates, and local source-discovery
coverage so scheduled operations can expose what is collected, what is only
queued, and which Florida areas still have no claimed collection stream.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = Path("data/sources/collector-manifest.json")
QUEUE_PATH = Path("data/operations/florida-profile-research-queue.json")
IDENTITY_PATH = Path("data/research-staging/florida/identity-contact")
COUNTY_REGISTRY_PATH = Path("data/sources/florida-county-source-registry.json")
WORK_ALLOCATION_PATH = Path("data/operations/florida-work-allocation.json")
LOCAL_STAGING_ROOT = Path("data/staging/florida/local")
LOCAL_RESEARCH_ROOT = Path("data/research-staging/florida/local")
LOCAL_GOVERNMENT_LEVELS = {
    "county",
    "school_district",
    "municipal",
    "special_district",
    "judicial",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(path: Path) -> dict[str, Any] | None:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return payload if isinstance(payload, dict) else None


def count_json_files(path: Path) -> int:
    return len(list(path.glob("*.json"))) if path.exists() else 0


def counter_dict(values: list[Any]) -> dict[str, int]:
    return dict(sorted(Counter(str(value) for value in values if value is not None).items()))


def parse_time(value: str | None) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None


def max_timestamp(values: list[str]) -> str | None:
    parsed = [(parse_time(value), value) for value in values]
    valid = [(instant, raw) for instant, raw in parsed if instant is not None]
    return max(valid, key=lambda item: item[0])[1] if valid else None


def hours_since(value: str | None) -> float | None:
    instant = parse_time(value)
    if instant is None:
        return None
    return round((datetime.now(timezone.utc) - instant).total_seconds() / 3600, 2)


def florida_baseline_summary(root: Path) -> tuple[dict[str, Any], list[dict[str, str]]]:
    manifest = read_json(root / MANIFEST_PATH) or {}
    collectors = [
        item
        for item in manifest.get("collectors", [])
        if isinstance(item, dict) and item.get("group") == "florida" and item.get("phase") == "baseline"
    ]

    baselines: dict[str, Any] = {}
    signals: list[dict[str, str]] = []

    for collector in collectors:
        key = str(collector.get("collectorKey", "unknown"))
        directory = root / str(collector.get("outputDirectory", ""))
        actual = count_json_files(directory)
        minimum = int(collector.get("expectedMinimum", 0))
        maximum = int(collector.get("expectedMaximum", actual))
        status = "healthy"
        if actual < minimum:
            status = "below_expected"
            signals.append(
                {
                    "level": "error",
                    "code": "baseline_below_expected",
                    "message": f"{key} has {actual} records; expected at least {minimum}.",
                }
            )
        elif actual > maximum:
            status = "above_expected"
            signals.append(
                {
                    "level": "warning",
                    "code": "baseline_above_expected",
                    "message": f"{key} has {actual} records; expected no more than {maximum}. Review for duplicates.",
                }
            )

        baselines[key] = {
            "sourceKey": collector.get("sourceKey"),
            "outputDirectory": str(collector.get("outputDirectory")),
            "records": actual,
            "expectedRange": {"minimum": minimum, "maximum": maximum},
            "status": status,
        }

    if not baselines:
        signals.append(
            {
                "level": "error",
                "code": "florida_manifest_missing",
                "message": "No enabled Florida baseline collectors were found in the manifest.",
            }
        )

    return baselines, signals


def queue_summary(root: Path) -> tuple[dict[str, Any], list[dict[str, str]]]:
    queue = read_json(root / QUEUE_PATH)
    if not queue or not isinstance(queue.get("tasks"), list):
        return (
            {
                "available": False,
                "path": str(QUEUE_PATH),
                "taskCount": 0,
                "requiredSectionCountPerSeat": 0,
            },
            [
                {
                    "level": "warning",
                    "code": "research_queue_unavailable",
                    "message": "The Florida research queue is not available on this ref. Run the baseline collector and queue builder.",
                }
            ],
        )

    tasks = [task for task in queue["tasks"] if isinstance(task, dict)]
    sections = [
        section
        for task in tasks
        for section in task.get("sections", [])
        if isinstance(section, dict)
    ]
    canonical_tasks = sum(
        1
        for task in tasks
        if task.get("sections") and all(section.get("canonicalRecordExists") is True for section in task["sections"])
    )
    latest_baseline = max_timestamp(
        [str(task["lastBaselineCollectedAt"]) for task in tasks if task.get("lastBaselineCollectedAt")]
    )

    signals: list[dict[str, str]] = []
    declared_count = queue.get("taskCount")
    if isinstance(declared_count, int) and declared_count != len(tasks):
        signals.append(
            {
                "level": "error",
                "code": "research_queue_count_mismatch",
                "message": f"Queue declares {declared_count} tasks but contains {len(tasks)} tasks.",
            }
        )

    return (
        {
            "available": True,
            "path": str(QUEUE_PATH),
            "queueVersion": queue.get("queueVersion"),
            "generatedFromLatestSourceAt": queue.get("generatedFromLatestSourceAt"),
            "taskCount": len(tasks),
            "declaredTaskCount": declared_count,
            "requiredSectionCountPerSeat": queue.get("requiredSectionCountPerSeat"),
            "sourceCounts": counter_dict([task.get("sourceKey") for task in tasks]),
            "governmentLevelCounts": counter_dict([task.get("governmentLevel") for task in tasks]),
            "researchStageCounts": counter_dict([task.get("researchStage") for task in tasks]),
            "portraitStatusCounts": counter_dict([task.get("portraitStatus") for task in tasks]),
            "sectionStatusCounts": counter_dict([section.get("status") for section in sections]),
            "sectionCanonicalCounts": counter_dict([section.get("canonicalRecordExists") for section in sections]),
            "canonicalProfileTasks": canonical_tasks,
            "latestBaselineCollectedAt": latest_baseline,
            "ageHours": hours_since(latest_baseline),
        },
        signals,
    )


def identity_summary(root: Path) -> dict[str, Any]:
    records = [record for path in (root / IDENTITY_PATH).glob("*.json") if (record := read_json(path))]
    return {
        "path": str(IDENTITY_PATH),
        "recordCount": len(records),
        "collectionStatusCounts": counter_dict([record.get("collectionStatus") for record in records]),
        "reviewStatusCounts": counter_dict([record.get("reviewStatus") for record in records]),
        "publicationAllowedCounts": counter_dict([record.get("publicationAllowed") for record in records]),
        "withPortraitCandidates": sum(bool(record.get("portraitCandidates")) for record in records),
        "withContactCandidates": sum(bool(record.get("contactCandidates")) for record in records),
        "withSocialCandidates": sum(bool(record.get("socialCandidates")) for record in records),
        "withWebsiteCandidates": sum(bool(record.get("websiteCandidates")) for record in records),
        "latestFetchedAt": max_timestamp([str(record["fetchedAt"]) for record in records if record.get("fetchedAt")]),
    }


def local_coverage_summary(root: Path) -> tuple[dict[str, Any], list[dict[str, str]]]:
    """Measure Florida local coverage from the coordination checkout.

    The local source registry and allocation file live on the current reviewed
    checkout. The state/federal review snapshot can be a different ref, so this
    function deliberately accepts a separate root.
    """

    registry = read_json(root / COUNTY_REGISTRY_PATH) or {}
    allocation = read_json(root / WORK_ALLOCATION_PATH) or {}
    signals: list[dict[str, str]] = []

    counties = sorted({str(county) for county in registry.get("counties", []) if isinstance(county, str)})
    if not counties:
        signals.append(
            {
                "level": "error",
                "code": "county_registry_missing",
                "message": "Florida's county source registry is unavailable or contains no counties.",
            }
        )

    active_streams = [
        stream
        for stream in allocation.get("workstreams", [])
        if isinstance(stream, dict) and stream.get("status") in {"active_claimed", "active_reserved"}
    ]
    local_streams = []
    assigned_counties: set[str] = set()
    for stream in active_streams:
        scope = stream.get("scope") if isinstance(stream.get("scope"), dict) else {}
        levels = {str(level) for level in scope.get("governmentLevels", []) if isinstance(level, str)}
        if not (levels & LOCAL_GOVERNMENT_LEVELS):
            continue
        local_streams.append(stream)
        assigned_counties.update(str(county) for county in scope.get("counties", []) if isinstance(county, str))

    if not local_streams:
        signals.append(
            {
                "level": "warning",
                "code": "local_workstream_unclaimed",
                "message": "No active Florida local-government collection workstream is claimed.",
            }
        )

    source_discovery_root = root / LOCAL_STAGING_ROOT
    source_discovery_records: list[dict[str, Any]] = []
    officeholder_records: list[dict[str, Any]] = []
    if source_discovery_root.exists():
        for path in sorted(source_discovery_root.rglob("*.json")):
            record = read_json(path)
            if not record:
                continue
            if "source-discovery" in path.parts:
                source_discovery_records.append(record)
            else:
                officeholder_records.append(record)

    local_research_records: list[dict[str, Any]] = []
    research_root = root / LOCAL_RESEARCH_ROOT
    if research_root.exists():
        for path in sorted(research_root.rglob("*.json")):
            if record := read_json(path):
                local_research_records.append(record)

    discovered_counties = {
        str(record.get("county"))
        for record in source_discovery_records
        if isinstance(record.get("county"), str)
    }
    valid_discovered_counties = discovered_counties & set(counties)
    unknown_discovery_counties = sorted(discovered_counties - set(counties))
    resolved_categories = sum(
        int(record.get("resolvedCategoryCount", 0))
        for record in source_discovery_records
        if isinstance(record.get("resolvedCategoryCount"), int)
    )
    required_categories = sum(
        int(record.get("requiredCategoryCount", 0))
        for record in source_discovery_records
        if isinstance(record.get("requiredCategoryCount"), int)
    )
    unresolved_categories = sum(
        len(record.get("unresolvedCategories", []))
        for record in source_discovery_records
        if isinstance(record.get("unresolvedCategories"), list)
    )
    registry_progress = registry.get("sourceDiscovery") if isinstance(registry.get("sourceDiscovery"), dict) else {}
    reported_completed = registry_progress.get("completedCounties")
    unassigned_counties = sorted(set(counties) - assigned_counties)

    if source_discovery_records and isinstance(reported_completed, int) and reported_completed != len(valid_discovered_counties):
        signals.append(
            {
                "level": "warning",
                "code": "county_registry_progress_stale",
                "message": (
                    f"County registry reports {reported_completed} completed counties, but "
                    f"{len(valid_discovered_counties)} review-only source-discovery records are present."
                ),
            }
        )
    if counties and len(valid_discovered_counties) < len(counties):
        signals.append(
            {
                "level": "warning",
                "code": "county_source_discovery_incomplete",
                "message": (
                    f"County source discovery covers {len(valid_discovered_counties)}/{len(counties)} Florida counties; "
                    f"{len(counties) - len(valid_discovered_counties)} still have no saved discovery record."
                ),
            }
        )
    if counter_dict([record.get("collectionStatus") for record in source_discovery_records]).get("failed", 0):
        signals.append(
            {
                "level": "warning",
                "code": "county_source_discovery_failed",
                "message": "One or more county source-discovery runs failed and need a source-specific retry or manual source map.",
            }
        )
    if source_discovery_records and not officeholder_records:
        signals.append(
            {
                "level": "warning",
                "code": "local_officeholder_registry_empty",
                "message": "Local coverage is still source discovery only; no Florida local officeholder staging records exist yet.",
            }
        )
    if counties and unassigned_counties:
        signals.append(
            {
                "level": "warning",
                "code": "local_counties_unassigned",
                "message": (
                    f"{len(unassigned_counties)} Florida counties have no active local collection claim. "
                    "Assign a non-overlapping regional workstream before collecting them."
                ),
            }
        )
    if unknown_discovery_counties:
        signals.append(
            {
                "level": "warning",
                "code": "county_source_discovery_unknown_county",
                "message": "Source-discovery output contains county names not present in the Florida county registry.",
            }
        )

    return (
        {
            "available": bool(counties),
            "countyRegistryPath": str(COUNTY_REGISTRY_PATH),
            "workAllocationPath": str(WORK_ALLOCATION_PATH),
            "totalCountyCount": len(counties),
            "activeLocalWorkstreams": [
                {
                    "workstreamId": stream.get("workstreamId"),
                    "ownerKey": stream.get("ownerKey"),
                    "status": stream.get("status"),
                }
                for stream in local_streams
            ],
            "assignedCountyCount": len(assigned_counties & set(counties)),
            "unassignedCountyCount": len(unassigned_counties),
            "unassignedCounties": unassigned_counties,
            "unassignedRegions": allocation.get("unassignedLocalRegions", []),
            "sourceDiscovery": {
                "recordCount": len(source_discovery_records),
                "countyCount": len(valid_discovered_counties),
                "collectionStatusCounts": counter_dict([record.get("collectionStatus") for record in source_discovery_records]),
                "resolvedCategoryCount": resolved_categories,
                "requiredCategoryCount": required_categories,
                "unresolvedCategoryCount": unresolved_categories,
                "latestFetchedAt": max_timestamp(
                    [str(record["fetchedAt"]) for record in source_discovery_records if record.get("fetchedAt")]
                ),
                "unknownCounties": unknown_discovery_counties,
                "registryReportedCompletedCount": reported_completed,
            },
            "localOfficeholderStagingRecordCount": len(officeholder_records),
            "localResearchCandidateRecordCount": len(local_research_records),
        },
        signals,
    )


def build_report(root: Path, coordination_root: Path | None = None) -> dict[str, Any]:
    baselines, baseline_signals = florida_baseline_summary(root)
    queue, queue_signals = queue_summary(root)
    identity = identity_summary(root)
    local_coverage, local_signals = local_coverage_summary(coordination_root or root)
    signals = [*baseline_signals, *queue_signals, *local_signals]

    baseline_total = sum(item["records"] for item in baselines.values())
    if queue["available"] and queue["taskCount"] < baseline_total:
        signals.append(
            {
                "level": "error",
                "code": "research_queue_behind_baseline",
                "message": f"Research queue has {queue['taskCount']} tasks for {baseline_total} Florida state baseline records.",
            }
        )

    queue_age = queue.get("ageHours")
    if queue_age is not None and queue_age > 72:
        signals.append(
            {
                "level": "error",
                "code": "research_queue_stale",
                "message": f"Latest queue baseline is {queue_age} hours old; the daily collection target was missed.",
            }
        )
    elif queue_age is not None and queue_age > 36:
        signals.append(
            {
                "level": "warning",
                "code": "research_queue_aging",
                "message": f"Latest queue baseline is {queue_age} hours old; verify the next scheduled collection run.",
            }
        )

    if queue["available"] and identity["recordCount"] and identity["recordCount"] < queue["taskCount"]:
        signals.append(
            {
                "level": "warning",
                "code": "identity_candidates_incomplete",
                "message": f"Only {identity['recordCount']} review-only identity/contact candidate records exist for {queue['taskCount']} tasks.",
            }
        )

    state = "healthy"
    if any(signal["level"] == "error" for signal in signals):
        state = "error"
    elif signals:
        state = "attention"

    return {
        "schemaVersion": "1.1.0",
        "generatedAt": now_iso(),
        "scope": "Florida first",
        "snapshotRoot": str(root),
        "coordinationRoot": str(coordination_root or root),
        "state": state,
        "baseline": {"totalRecords": baseline_total, "collectors": baselines},
        "researchQueue": queue,
        "identityContactCandidates": identity,
        "localCoverage": local_coverage,
        "signals": signals,
        "publicationBoundary": "Staged and candidate records require evidence and review before public promotion.",
    }


def markdown(report: dict[str, Any]) -> str:
    queue = report["researchQueue"]
    identity = report["identityContactCandidates"]
    baseline = report["baseline"]
    local = report["localCoverage"]
    discovery = local["sourceDiscovery"]

    lines = [
        "### CivicLenZ collection heartbeat",
        f"- State: **{report['state']}**",
        f"- Florida state baseline records: **{baseline['totalRecords']}**",
        f"- State/federal seat/profile research tasks: **{queue['taskCount']}**",
        f"- Required research sections per task: **{queue['requiredSectionCountPerSeat']}**",
        f"- Reviewed canonical profiles: **{queue.get('canonicalProfileTasks', 0)}**",
        f"- Review-only identity/contact candidate records: **{identity['recordCount']}**",
        (
            f"- County source-discovery coverage: **{discovery['countyCount']}/{local['totalCountyCount']}** "
            "(source maps only; not officials)"
        ),
        f"- Counties with an active local claim: **{local['assignedCountyCount']}**",
        f"- Counties still unassigned: **{local['unassignedCountyCount']}**",
        f"- Local officeholder staging records: **{local['localOfficeholderStagingRecordCount']}**",
        f"- Local review-only research candidates: **{local['localResearchCandidateRecordCount']}**",
    ]
    if queue.get("latestBaselineCollectedAt"):
        lines.append(f"- Latest state/federal queue baseline: **{queue['latestBaselineCollectedAt']}**")
    if discovery.get("latestFetchedAt"):
        lines.append(f"- Latest county source discovery: **{discovery['latestFetchedAt']}**")
    if report["signals"]:
        lines.append("")
        lines.append("#### Signals")
        lines.extend(f"- {signal['level'].upper()}: {signal['message']}" for signal in report["signals"])
    lines.extend(
        [
            "",
            "> Staging and candidate records are not automatically public. Evidence and required review gates still control promotion.",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="Repository root holding the data snapshot to inspect.")
    parser.add_argument(
        "--coordination-root",
        type=Path,
        help="Optional separate checkout containing Florida allocation and local-coverage records.",
    )
    parser.add_argument("--output", type=Path, help="Optional JSON report destination, relative to --root unless absolute.")
    parser.add_argument("--markdown", action="store_true", help="Print a Markdown summary instead of JSON.")
    parser.add_argument("--fail-on-error", action="store_true", help="Exit nonzero only when the report state is error.")
    args = parser.parse_args()

    root = args.root.resolve()
    coordination_root = args.coordination_root.resolve() if args.coordination_root else root
    report = build_report(root, coordination_root)

    if args.output:
        destination = args.output if args.output.is_absolute() else root / args.output
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    if args.markdown:
        print(markdown(report))
    else:
        print(json.dumps(report, indent=2, sort_keys=True))

    return 1 if args.fail_on_error and report["state"] == "error" else 0


if __name__ == "__main__":
    raise SystemExit(main())
