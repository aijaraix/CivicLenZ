#!/usr/bin/env python3
"""Shared helpers for CivicLenZ baseline collectors."""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Mapping

import requests

BROWSER_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", normalized).strip("-").lower()
    return normalized or "unknown"


def fetch(url: str, accept: str = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8") -> requests.Response:
    response = requests.get(
        url,
        headers={
            "User-Agent": BROWSER_USER_AGENT,
            "From": "research@civicslenz.com",
            "Accept": accept,
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
        },
        timeout=(10, 60),
    )
    response.raise_for_status()
    return response


def write_json_records(records: Iterable[Mapping[str, object]], output_dir: Path, filename_for) -> int:
    materialized = list(records)
    output_dir.mkdir(parents=True, exist_ok=True)
    expected_files: set[Path] = set()

    for record in materialized:
        path = output_dir / filename_for(record)
        expected_files.add(path)
        path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    for old_file in output_dir.glob("*.json"):
        if old_file not in expected_files:
            old_file.unlink()

    return len(materialized)
