#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "schemas" / "elected-official-profile.schema.json"
REVIEW_QUEUE_SCHEMA_PATH = ROOT / "schemas" / "seat-research-queue.schema.json"
CANONICAL_ROOT = ROOT / "data" / "officials"
STAGING_ROOT = ROOT / "data" / "staging"
REVIEW_QUEUE_ROOT = ROOT / "data" / "review-queue"


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ValueError(f"{path}: invalid JSON: {exc}") from exc


def validate_canonical() -> list[str]:
    schema = load_json(SCHEMA_PATH)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    errors: list[str] = []
    slugs: dict[str, Path] = {}
    official_ids: dict[str, Path] = {}

    for path in sorted(CANONICAL_ROOT.rglob("*.json")):
        data = load_json(path)
        for error in sorted(validator.iter_errors(data), key=lambda item: list(item.path)):
            location = ".".join(str(part) for part in error.path) or "<root>"
            errors.append(f"{path}:{location}: {error.message}")

        slug = data.get("slug")
        if slug:
            if slug in slugs:
                errors.append(f"Duplicate slug {slug!r}: {slugs[slug]} and {path}")
            slugs[slug] = path

        official_id = data.get("officialId")
        if official_id:
            if official_id in official_ids:
                errors.append(f"Duplicate officialId {official_id!r}: {official_ids[official_id]} and {path}")
            official_ids[official_id] = path

    if not list(CANONICAL_ROOT.rglob("*.json")):
        errors.append("No canonical official JSON files were found")
    return errors


def validate_staging() -> list[str]:
    errors: list[str] = []
    required = {
        "candidateRecordVersion",
        "stagingRecordId",
        "sourceKey",
        "sourceUrl",
        "sourceMemberUrl",
        "sourceSnapshotSha256",
        "fetchedAt",
        "extractionStatus",
        "displayName",
        "officeTitle",
        "jurisdictionName",
        "canonicalMatchStatus",
    }

    if not STAGING_ROOT.exists():
        return errors

    for path in sorted(STAGING_ROOT.rglob("*.json")):
        data = load_json(path)
        missing = required.difference(data)
        if missing:
            errors.append(f"{path}: missing staging keys: {', '.join(sorted(missing))}")
        if data.get("extractionStatus") != "extracted_unreviewed":
            errors.append(f"{path}: scraper output must remain extracted_unreviewed until a reviewer promotes it")
        sha = data.get("sourceSnapshotSha256", "")
        if len(sha) != 64 or any(char not in "0123456789abcdef" for char in sha.lower()):
            errors.append(f"{path}: sourceSnapshotSha256 is not a SHA-256 hex digest")
    return errors


def validate_review_queue() -> list[str]:
    errors: list[str] = []
    if not REVIEW_QUEUE_ROOT.exists():
        return errors

    schema = load_json(REVIEW_QUEUE_SCHEMA_PATH)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    queue_ids: dict[str, Path] = {}
    seat_keys: dict[str, Path] = {}

    for path in sorted(REVIEW_QUEUE_ROOT.rglob("*.json")):
        data = load_json(path)
        for error in sorted(validator.iter_errors(data), key=lambda item: list(item.path)):
            location = ".".join(str(part) for part in error.path) or "<root>"
            errors.append(f"{path}:{location}: {error.message}")

        queue_id = data.get("queueId")
        if queue_id:
            if queue_id in queue_ids:
                errors.append(f"Duplicate queueId {queue_id!r}: {queue_ids[queue_id]} and {path}")
            queue_ids[queue_id] = path

        seat_key = data.get("seat", {}).get("seatKey")
        if seat_key:
            if seat_key in seat_keys:
                errors.append(f"Duplicate seat research queue {seat_key!r}: {seat_keys[seat_key]} and {path}")
            seat_keys[seat_key] = path

    return errors


def main() -> int:
    errors = validate_canonical() + validate_staging() + validate_review_queue()
    if errors:
        print("Data validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print("Canonical, staging, and review-queue data validation passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
