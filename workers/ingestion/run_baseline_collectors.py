#!/usr/bin/env python3
"""Run enabled aggregation-first baseline collectors from the manifest."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = ROOT / "data" / "sources" / "collector-manifest.json"


def load_manifest(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data.get("collectors"), list):
        raise ValueError(f"{path} does not contain a collectors list")
    return data


def count_records(output_directory: str) -> int:
    output = ROOT / output_directory
    return len(list(output.glob("*.json"))) if output.exists() else 0


def run_collector(collector: dict) -> dict[str, object]:
    command = [sys.executable, *collector["command"]]
    completed = subprocess.run(command, cwd=ROOT, check=False)
    if completed.returncode != 0:
        raise RuntimeError(
            f"Collector {collector['collectorKey']} failed with exit code {completed.returncode}: {' '.join(command)}"
        )

    count = count_records(collector["outputDirectory"])
    minimum = int(collector["expectedMinimum"])
    maximum = int(collector["expectedMaximum"])
    if count < minimum or count > maximum:
        raise RuntimeError(
            f"Collector {collector['collectorKey']} wrote {count} records; expected {minimum}-{maximum}."
        )

    return {
        "collectorKey": collector["collectorKey"],
        "sourceKey": collector["sourceKey"],
        "outputDirectory": collector["outputDirectory"],
        "recordCount": count,
        "status": "success",
    }


def run_collectors(selected: list[dict], workers: int) -> list[dict[str, object]]:
    """Run independent source collectors concurrently while preserving manifest order.

    Each enabled collector writes to a distinct output directory. Parallelism is
    deliberately capped by the workflow; use small values for source-respectful,
    per-domain collection rather than treating this as an unrestricted scraper.
    """

    if workers <= 1 or len(selected) <= 1:
        return [run_collector(collector) for collector in selected]

    ordered: dict[str, dict[str, object]] = {}
    with ThreadPoolExecutor(max_workers=min(workers, len(selected))) as executor:
        futures = {executor.submit(run_collector, collector): collector for collector in selected}
        for future in as_completed(futures):
            collector = futures[future]
            ordered[str(collector["collectorKey"])] = future.result()

    return [ordered[str(collector["collectorKey"])] for collector in selected]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--group", help="Run only collectors in this group, such as federal or florida.")
    parser.add_argument("--collector", action="append", help="Run only the named collector key; may be repeated.")
    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Maximum concurrent independent collectors. Keep this low and source-respectful.",
    )
    args = parser.parse_args()

    if args.workers < 1:
        parser.error("--workers must be at least 1")

    manifest = load_manifest(args.manifest)
    selected = []
    requested = set(args.collector or [])

    for collector in manifest["collectors"]:
        if not collector.get("enabled") or collector.get("phase") != "baseline":
            continue
        if args.group and collector.get("group") != args.group:
            continue
        if requested and collector.get("collectorKey") not in requested:
            continue
        selected.append(collector)

    if not selected:
        raise RuntimeError("No enabled baseline collectors matched the requested filters")

    results = run_collectors(selected, args.workers)
    total = sum(int(result["recordCount"]) for result in results)
    print(
        json.dumps(
            {
                "status": "success",
                "totalRecords": total,
                "collectorWorkers": min(args.workers, len(selected)),
                "collectors": results,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Baseline aggregation failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
