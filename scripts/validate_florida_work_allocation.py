#!/usr/bin/env python3
"""Validate CivicLenZ Florida workstream claims and write boundaries.

The registry is a coordination guard, not a publisher. It prevents two active
workstreams from owning overlapping geographic/office/data scopes or output paths.
"""

from __future__ import annotations

import argparse
import json
import sys
from itertools import combinations
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REGISTRY = ROOT / "data" / "operations" / "florida-work-allocation.json"
ACTIVE_STATUSES = {"active_claimed", "active_reserved"}


def read_registry(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload.get("workstreams"), list):
        raise ValueError("Registry does not contain a workstreams list.")
    return payload


def normalized(path: str) -> str:
    return path.strip().strip("/")


def paths_overlap(left: str, right: str) -> bool:
    left, right = normalized(left), normalized(right)
    return left == right or left.startswith(right + "/") or right.startswith(left + "/")


def intersects(left: list[str], right: list[str]) -> bool:
    return bool(set(left) & set(right))


def regions_overlap(left: dict[str, Any], right: dict[str, Any]) -> bool:
    left_regions = set(left.get("regions", []))
    right_regions = set(right.get("regions", []))
    left_counties = set(left.get("counties", []))
    right_counties = set(right.get("counties", []))

    if left_counties and right_counties:
        return bool(left_counties & right_counties)
    if left_regions & right_regions:
        return True
    # A statewide scope can overlap a regional scope only when the government
    # level and office family dimensions also overlap.
    return "statewide" in left_regions or "statewide" in right_regions


def scopes_overlap(left: dict[str, Any], right: dict[str, Any]) -> bool:
    return (
        intersects(left.get("governmentLevels", []), right.get("governmentLevels", []))
        and regions_overlap(left, right)
        and intersects(left.get("officeFamilies", []), right.get("officeFamilies", []))
        and intersects(left.get("dataPhases", []), right.get("dataPhases", []))
    )


def validate(registry: dict[str, Any], require_workstream: str | None) -> dict[str, Any]:
    all_streams = [item for item in registry["workstreams"] if isinstance(item, dict)]
    active = [item for item in all_streams if item.get("status") in ACTIVE_STATUSES]
    errors: list[str] = []
    warnings: list[str] = []

    required_fields = registry.get("rules", {}).get("requiredClaimFields", [])
    seen_ids: set[str] = set()
    for item in active:
        identifier = str(item.get("workstreamId", ""))
        if not identifier:
            errors.append("An active workstream is missing workstreamId.")
        elif identifier in seen_ids:
            errors.append(f"Duplicate active workstreamId: {identifier}.")
        seen_ids.add(identifier)

        for field in required_fields:
            if not item.get(field):
                errors.append(f"{identifier or 'unknown'} is missing required claim field: {field}.")

        roots = [normalized(path) for path in item.get("outputRoots", []) if isinstance(path, str)]
        if len(roots) != len(set(roots)):
            errors.append(f"{identifier} lists the same output root more than once.")

    if require_workstream and not any(item.get("workstreamId") == require_workstream for item in active):
        errors.append(f"Required active workstream is missing: {require_workstream}.")

    for left, right in combinations(active, 2):
        left_id = str(left.get("workstreamId", "unknown"))
        right_id = str(right.get("workstreamId", "unknown"))
        left_scope = left.get("scope", {}) if isinstance(left.get("scope"), dict) else {}
        right_scope = right.get("scope", {}) if isinstance(right.get("scope"), dict) else {}

        if scopes_overlap(left_scope, right_scope):
            errors.append(
                f"Scope conflict: {left_id} and {right_id} overlap on government level, region, office family, and data phase."
            )

        for left_root in left.get("outputRoots", []):
            for right_root in right.get("outputRoots", []):
                if isinstance(left_root, str) and isinstance(right_root, str) and paths_overlap(left_root, right_root):
                    errors.append(
                        f"Write-path conflict: {left_id} ({left_root}) overlaps {right_id} ({right_root})."
                    )

        left_prefix = str(left.get("branchPrefix", ""))
        right_prefix = str(right.get("branchPrefix", ""))
        if left_prefix and right_prefix and (left_prefix.startswith(right_prefix) or right_prefix.startswith(left_prefix)):
            warnings.append(
                f"Branch prefixes {left_prefix!r} and {right_prefix!r} overlap; use separate output roots and review before merging."
            )

    return {
        "state": "error" if errors else "healthy",
        "activeWorkstreamCount": len(active),
        "activeWorkstreams": [
            {
                "workstreamId": item.get("workstreamId"),
                "ownerKey": item.get("ownerKey"),
                "branchPrefix": item.get("branchPrefix"),
                "outputRoots": item.get("outputRoots"),
            }
            for item in active
        ],
        "errors": errors,
        "warnings": warnings,
    }


def markdown(report: dict[str, Any]) -> str:
    lines = [
        "### Florida work-allocation guard",
        f"- State: **{report['state']}**",
        f"- Active workstreams: **{report['activeWorkstreamCount']}**",
    ]
    lines.extend(
        f"- `{item['workstreamId']}` → `{item['ownerKey']}`"
        for item in report["activeWorkstreams"]
    )
    if report["warnings"]:
        lines.append("")
        lines.append("#### Warnings")
        lines.extend(f"- {warning}" for warning in report["warnings"])
    if report["errors"]:
        lines.append("")
        lines.append("#### Errors")
        lines.extend(f"- {error}" for error in report["errors"])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--registry", type=Path, default=DEFAULT_REGISTRY)
    parser.add_argument("--require-workstream")
    parser.add_argument("--markdown", action="store_true")
    args = parser.parse_args()

    report = validate(read_registry(args.registry), args.require_workstream)
    print(markdown(report) if args.markdown else json.dumps(report, indent=2, sort_keys=True))
    return 1 if report["state"] == "error" else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Florida allocation validation failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
