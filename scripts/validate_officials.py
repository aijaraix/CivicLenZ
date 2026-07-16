#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "schemas" / "elected-official-profile.schema.json"
CANONICAL_ROOT = ROOT / "data" / "officials"
STAGING_ROOT = ROOT / "data" / "staging"
SOURCE_DISCOVERY_DIRECTORY = "source-discovery"


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ValueError(f"{path}: invalid JSON: {exc}") from exc


def is_sha256(value: object) -> bool:
    return isinstance(value, str) and len(value) == 64 and all(char in "0123456789abcdef" for char in value.lower())


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


def validate_source_discovery(path: Path, data: dict) -> list[str]:
    """Validate a county source map without treating it as a person record.

    Source discovery is intentionally a separate review-only artifact. It maps
    official sources that may later seed a seat collector; it must never pass
    through the elected-official staging schema or become public data by itself.
    """

    required = {
        "sourceDiscoveryVersion",
        "county",
        "state",
        "stateCode",
        "fetchedAt",
        "collectionStatus",
        "publicationAllowed",
        "reviewStatus",
        "sourceCandidates",
        "unresolvedCategories",
    }
    errors: list[str] = []
    missing = required.difference(data)
    if missing:
        errors.append(f"{path}: missing source-discovery keys: {', '.join(sorted(missing))}")
    if data.get("publicationAllowed") is not False:
        errors.append(f"{path}: source-discovery output must remain non-public until a reviewer approves derived records")
    if data.get("reviewStatus") != "unreviewed":
        errors.append(f"{path}: source-discovery output must remain unreviewed until a reviewer approves derived records")
    if not isinstance(data.get("sourceCandidates"), dict):
        errors.append(f"{path}: sourceCandidates must be an object keyed by collection category")
    if not isinstance(data.get("unresolvedCategories"), list):
        errors.append(f"{path}: unresolvedCategories must be a list")
    if data.get("collectionStatus") not in {"success", "partial", "failed", "blocked"}:
        errors.append(f"{path}: collectionStatus must distinguish success, partial, failed, or blocked discovery")
    for page in data.get("visitedPages", []):
        if isinstance(page, dict) and page.get("sha256") and not is_sha256(page["sha256"]):
            errors.append(f"{path}: visitedPages sha256 is not a SHA-256 hex digest")
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
        if SOURCE_DISCOVERY_DIRECTORY in path.parts:
            errors.extend(validate_source_discovery(path, data))
            continue

        missing = required.difference(data)
        if missing:
            errors.append(f"{path}: missing staging keys: {', '.join(sorted(missing))}")
        if data.get("extractionStatus") != "extracted_unreviewed":
            errors.append(f"{path}: scraper output must remain extracted_unreviewed until a reviewer promotes it")
        if not is_sha256(data.get("sourceSnapshotSha256")):
            errors.append(f"{path}: sourceSnapshotSha256 is not a SHA-256 hex digest")
    return errors


def main() -> int:
    errors = validate_canonical() + validate_staging()
    if errors:
        print("Data validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print("Canonical, official staging, and review-only source-discovery validation passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
