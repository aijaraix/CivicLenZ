#!/usr/bin/env python3
"""Create an evidence-safe health snapshot for CivicLenZ collection pipelines.

This script never publishes or promotes civic data. It only measures staged source
records, the seat research queue, and review-only identity/contact candidates so a
scheduled worker can prove what was collected and flag stale or incomplete runs.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = Path("data/sources/collector-manifest.json")
QUEUE_PATH = Path("data/operations/florida-profile-research-queue.json")
IDENTITY_PATH = Path("data/research-staging/florida/identity-contact")


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
        1 for task in tasks if task.get("sections") and all(section.get("canonicalRecordExists") is True for section in task["sections"])
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


def build_report(root: Path) -> dict[str, Any]:
    baselines, baseline_signals = florida_baseline_summary(root)
    queue, queue_signals = queue_summary(root)
    identity = identity_summary(root)
    signals = [*baseline_signals, *queue_signals]

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
        "schemaVersion": "1.0.0",
        "generatedAt": now_iso(),
        "scope": "Florida first",
        "state": state,
        "baseline": {"totalRecords": baseline_total, "collectors": baselines},
        "researchQueue": queue,
        "identityContactCandidates": identity,
        "signals": signals,
        "publicationBoundary": "Staged and candidate records require evidence and review before public promotion.",
    }


def markdown(report: dict[str, Any]) -> str:
    queue = report["researchQueue"]
    identity = report["identityContactCandidates"]
    baseline = report["baseline"]

    lines = [
        "### CivicLenZ collection heartbeat",
        f"- State: **{report['state']}**",
        f"- Florida baseline records: **{baseline['totalRecords']}**",
        f"- Seat/profile research tasks: **{queue['taskCount']}**",
        f"- Required research sections per task: **{queue['requiredSectionCountPerSeat']}**",
        f"- Reviewed canonical profiles: **{queue.get('canonicalProfileTasks', 0)}**",
        f"- Review-only identity/contact candidate records: **{identity['recordCount']}**",
    ]
    if queue.get("latestBaselineCollectedAt"):
        lines.append(f"- Latest queue baseline: **{queue['latestBaselineCollectedAt']}**")
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
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="Repository root to inspect.")
    parser.add_argument("--output", type=Path, help="Optional JSON report destination, relative to --root unless absolute.")
    parser.add_argument("--markdown", action="store_true", help="Print a Markdown summary instead of JSON.")
    parser.add_argument("--fail-on-error", action="store_true", help="Exit nonzero only when the report state is error.")
    args = parser.parse_args()

    root = args.root.resolve()
    report = build_report(root)

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
