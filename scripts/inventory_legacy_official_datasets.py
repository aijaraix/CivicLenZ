#!/usr/bin/env python3
"""Inventory possible legacy CivicLenZ elected-official datasets.

The tool is intentionally read-only. It counts probable records, reports columns or
SQLite tables, computes SHA-256 hashes, and flags files that look like elected-
official datasets. It never promotes or imports facts into canonical records.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import sqlite3
import sys
import zipfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, BinaryIO, Iterable, TextIO

SUPPORTED_SUFFIXES = {
    ".csv",
    ".tsv",
    ".json",
    ".jsonl",
    ".ndjson",
    ".sqlite",
    ".sqlite3",
    ".db",
    ".zip",
    ".parquet",
}

SKIP_DIRECTORIES = {
    ".git",
    ".next",
    "node_modules",
    "dist",
    "build",
    "__pycache__",
    ".venv",
    "venv",
}

RECORD_ARRAY_KEYS = (
    "officials",
    "officeholders",
    "people",
    "persons",
    "seats",
    "positions",
    "records",
    "rows",
    "results",
    "data",
    "items",
)

OFFICIAL_COLUMN_GROUPS = {
    "identity": {
        "name",
        "full_name",
        "official_name",
        "first_name",
        "last_name",
        "person_name",
        "display_name",
    },
    "office": {
        "office",
        "office_name",
        "office_title",
        "title",
        "position",
        "role",
        "seat",
        "seat_name",
    },
    "jurisdiction": {
        "jurisdiction",
        "jurisdiction_name",
        "state",
        "state_code",
        "county",
        "city",
        "municipality",
        "district",
        "district_number",
    },
    "term": {
        "term_start",
        "term_end",
        "start_date",
        "end_date",
        "election_date",
        "incumbent",
        "current",
    },
    "source": {
        "source",
        "source_url",
        "official_url",
        "website",
        "profile_url",
    },
}

MAX_JSON_BYTES = 256 * 1024 * 1024
MAX_ZIP_MEMBER_BYTES = 128 * 1024 * 1024


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def normalize_column(value: str) -> str:
    return "_".join(value.strip().lower().replace("-", "_").split())


def sha256_path(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def official_likelihood(columns: Iterable[str]) -> tuple[int, list[str]]:
    normalized = {normalize_column(column) for column in columns if column}
    matched_groups = [
        group for group, names in OFFICIAL_COLUMN_GROUPS.items() if normalized & names
    ]
    score = len(matched_groups)
    if "identity" in matched_groups and "office" in matched_groups:
        score += 2
    if "jurisdiction" in matched_groups:
        score += 1
    return score, matched_groups


@dataclass
class Inspection:
    format: str
    probable_records: int | None = None
    columns: list[str] = field(default_factory=list)
    tables: dict[str, int] = field(default_factory=dict)
    nested_files: list[dict[str, Any]] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def to_json(self) -> dict[str, Any]:
        likelihood, groups = official_likelihood(self.columns)
        if self.tables and not self.columns:
            likelihood = max(likelihood, 1)
        return {
            "format": self.format,
            "probableRecords": self.probable_records,
            "columns": self.columns,
            "tables": self.tables,
            "nestedFiles": self.nested_files,
            "officialLikelihoodScore": likelihood,
            "matchedOfficialColumnGroups": groups,
            "appearsOfficialLike": likelihood >= 4,
            "notes": self.notes,
            "errors": self.errors,
        }


def find_record_array(payload: Any) -> tuple[list[Any] | None, str | None]:
    if isinstance(payload, list):
        return payload, "$"
    if not isinstance(payload, dict):
        return None, None

    for key in RECORD_ARRAY_KEYS:
        value = payload.get(key)
        if isinstance(value, list):
            return value, f"$.{key}"

    candidates = [
        (key, value)
        for key, value in payload.items()
        if isinstance(value, list) and value
    ]
    if not candidates:
        return None, None
    key, value = max(candidates, key=lambda item: len(item[1]))
    return value, f"$.{key}"


def infer_columns_from_records(records: Iterable[Any], limit: int = 100) -> list[str]:
    columns: set[str] = set()
    for index, record in enumerate(records):
        if index >= limit:
            break
        if isinstance(record, dict):
            columns.update(str(key) for key in record)
    return sorted(columns)


def inspect_json_text(text: TextIO, size_bytes: int | None = None) -> Inspection:
    inspection = Inspection(format="json")
    if size_bytes is not None and size_bytes > MAX_JSON_BYTES:
        inspection.notes.append(
            f"JSON exceeds {MAX_JSON_BYTES} bytes; skipped full parse to avoid excessive memory use."
        )
        return inspection
    try:
        payload = json.load(text)
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        inspection.errors.append(f"invalid_json:{exc}")
        return inspection

    records, locator = find_record_array(payload)
    if records is None:
        inspection.notes.append("No top-level or recognized nested record array found.")
        return inspection
    inspection.probable_records = len(records)
    inspection.columns = infer_columns_from_records(records)
    inspection.notes.append(f"Counted records at {locator}.")
    return inspection


def inspect_json_lines_text(text: TextIO, format_name: str) -> Inspection:
    inspection = Inspection(format=format_name)
    count = 0
    columns: set[str] = set()
    for line_number, line in enumerate(text, start=1):
        if not line.strip():
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError as exc:
            inspection.errors.append(f"line_{line_number}:invalid_json:{exc}")
            if len(inspection.errors) >= 20:
                inspection.notes.append("Stopped recording JSON-line errors after 20 entries.")
                break
            continue
        count += 1
        if count <= 100 and isinstance(payload, dict):
            columns.update(str(key) for key in payload)
    inspection.probable_records = count
    inspection.columns = sorted(columns)
    return inspection


def inspect_delimited_text(text: TextIO, suffix: str) -> Inspection:
    delimiter = "\t" if suffix == ".tsv" else ","
    inspection = Inspection(format="tsv" if delimiter == "\t" else "csv")
    try:
        reader = csv.reader(text, delimiter=delimiter)
        header = next(reader, None)
        if header is None:
            inspection.probable_records = 0
            return inspection
        inspection.columns = [column.strip() for column in header]
        inspection.probable_records = sum(1 for row in reader if any(cell.strip() for cell in row))
    except (csv.Error, UnicodeDecodeError) as exc:
        inspection.errors.append(f"invalid_delimited_file:{exc}")
    return inspection


def inspect_sqlite(path: Path) -> Inspection:
    inspection = Inspection(format="sqlite")
    try:
        connection = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    except sqlite3.Error as exc:
        inspection.errors.append(f"sqlite_open_error:{exc}")
        return inspection

    try:
        table_rows = connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        ).fetchall()
        total = 0
        all_columns: set[str] = set()
        for (table_name,) in table_rows:
            escaped = str(table_name).replace('"', '""')
            try:
                row_count = int(
                    connection.execute(f'SELECT COUNT(*) FROM "{escaped}"').fetchone()[0]
                )
                inspection.tables[str(table_name)] = row_count
                total += row_count
                for row in connection.execute(f'PRAGMA table_info("{escaped}")').fetchall():
                    all_columns.add(str(row[1]))
            except sqlite3.Error as exc:
                inspection.errors.append(f"table_{table_name}:{exc}")
        inspection.probable_records = total
        inspection.columns = sorted(all_columns)
    finally:
        connection.close()
    return inspection


def decode_member(data: bytes) -> TextIO:
    return io.StringIO(data.decode("utf-8-sig", errors="replace"))


def inspect_zip(path: Path) -> Inspection:
    inspection = Inspection(format="zip")
    total_records = 0
    counted_any = False
    try:
        with zipfile.ZipFile(path) as archive:
            for member in archive.infolist():
                if member.is_dir():
                    continue
                suffix = Path(member.filename).suffix.lower()
                entry: dict[str, Any] = {
                    "path": member.filename,
                    "sizeBytes": member.file_size,
                    "format": suffix.lstrip(".") or "unknown",
                }
                if suffix not in {".csv", ".tsv", ".json", ".jsonl", ".ndjson"}:
                    entry["note"] = "Member format not counted inside ZIP."
                    inspection.nested_files.append(entry)
                    continue
                if member.file_size > MAX_ZIP_MEMBER_BYTES:
                    entry["note"] = "Member too large for in-memory ZIP inspection."
                    inspection.nested_files.append(entry)
                    continue
                try:
                    data = archive.read(member)
                    text = decode_member(data)
                    if suffix in {".csv", ".tsv"}:
                        nested = inspect_delimited_text(text, suffix)
                    elif suffix == ".json":
                        nested = inspect_json_text(text, member.file_size)
                    else:
                        nested = inspect_json_lines_text(text, suffix.lstrip("."))
                    nested_json = nested.to_json()
                    entry.update(nested_json)
                    if nested.probable_records is not None:
                        total_records += nested.probable_records
                        counted_any = True
                    inspection.columns.extend(nested.columns)
                except (OSError, RuntimeError, zipfile.BadZipFile) as exc:
                    entry["error"] = str(exc)
                inspection.nested_files.append(entry)
    except (OSError, zipfile.BadZipFile) as exc:
        inspection.errors.append(f"invalid_zip:{exc}")
    inspection.probable_records = total_records if counted_any else None
    inspection.columns = sorted(set(inspection.columns))
    return inspection


def inspect_path(path: Path) -> Inspection:
    suffix = path.suffix.lower()
    if suffix == ".json":
        with path.open("r", encoding="utf-8-sig", errors="replace") as handle:
            return inspect_json_text(handle, path.stat().st_size)
    if suffix in {".jsonl", ".ndjson"}:
        with path.open("r", encoding="utf-8-sig", errors="replace") as handle:
            return inspect_json_lines_text(handle, suffix.lstrip("."))
    if suffix in {".csv", ".tsv"}:
        with path.open("r", encoding="utf-8-sig", errors="replace", newline="") as handle:
            return inspect_delimited_text(handle, suffix)
    if suffix in {".sqlite", ".sqlite3", ".db"}:
        return inspect_sqlite(path)
    if suffix == ".zip":
        return inspect_zip(path)
    if suffix == ".parquet":
        return Inspection(
            format="parquet",
            notes=[
                "File was hashed, but row count was not read because the base repository does not require a Parquet dependency."
            ],
        )
    return Inspection(format=suffix.lstrip(".") or "unknown", notes=["Unsupported format."])


def iter_candidate_files(root: Path) -> Iterable[Path]:
    if root.is_file():
        if root.suffix.lower() in SUPPORTED_SUFFIXES:
            yield root
        return
    for path in root.rglob("*"):
        if any(part in SKIP_DIRECTORIES for part in path.parts):
            continue
        if path.is_file() and path.suffix.lower() in SUPPORTED_SUFFIXES:
            yield path


def build_report(root: Path) -> dict[str, Any]:
    files: list[dict[str, Any]] = []
    probable_total = 0
    counted_files = 0
    official_like_files = 0

    for path in sorted(iter_candidate_files(root)):
        relative = str(path.relative_to(root)) if root.is_dir() else path.name
        try:
            inspection = inspect_path(path)
            inspection_json = inspection.to_json()
            if inspection.probable_records is not None:
                probable_total += inspection.probable_records
                counted_files += 1
            if inspection_json["appearsOfficialLike"]:
                official_like_files += 1
            files.append(
                {
                    "path": relative,
                    "sizeBytes": path.stat().st_size,
                    "sha256": sha256_path(path),
                    **inspection_json,
                }
            )
        except (OSError, ValueError, sqlite3.Error) as exc:
            files.append(
                {
                    "path": relative,
                    "sizeBytes": path.stat().st_size if path.exists() else None,
                    "sha256": None,
                    "format": path.suffix.lower().lstrip("."),
                    "probableRecords": None,
                    "columns": [],
                    "tables": {},
                    "nestedFiles": [],
                    "officialLikelihoodScore": 0,
                    "matchedOfficialColumnGroups": [],
                    "appearsOfficialLike": False,
                    "notes": [],
                    "errors": [f"inspection_error:{type(exc).__name__}:{exc}"],
                }
            )

    return {
        "schemaVersion": "1.0.0",
        "generatedAt": utc_now(),
        "root": str(root),
        "fileCount": len(files),
        "countedFileCount": counted_files,
        "officialLikeFileCount": official_like_files,
        "probableRecordTotal": probable_total,
        "publicationAllowed": False,
        "files": files,
        "notes": [
            "Probable record totals are an inventory estimate, not a count of unique people or elected seats.",
            "A recovered dataset must pass source, license, seat, term, vacancy, and duplicate review before import.",
        ],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("data/imports/legacy"))
    parser.add_argument("--output", type=Path)
    parser.add_argument(
        "--require-records",
        type=int,
        default=0,
        help="Exit nonzero when the probable record total is below this threshold.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = args.root.resolve()
    if not root.exists():
        report = {
            "schemaVersion": "1.0.0",
            "generatedAt": utc_now(),
            "root": str(root),
            "fileCount": 0,
            "countedFileCount": 0,
            "officialLikeFileCount": 0,
            "probableRecordTotal": 0,
            "publicationAllowed": False,
            "files": [],
            "notes": ["The requested import root does not exist."],
        }
    else:
        report = build_report(root)

    rendered = json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True) + "\n"
    if args.output:
        output = args.output.resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered, encoding="utf-8")
    print(rendered, end="")

    if report["probableRecordTotal"] < args.require_records:
        print(
            f"Probable record total {report['probableRecordTotal']} is below required {args.require_records}.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
