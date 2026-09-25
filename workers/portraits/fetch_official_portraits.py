#!/usr/bin/env python3
"""Official-source portrait job. Search-engine image results are not a source."""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

import requests

from workers.ingestion.common import utc_now
from workers.seats.ids import portrait_job_id, queue_style_seat_key

ROOT = Path(__file__).resolve().parents[2]
OFFICIALS_ROOT = ROOT / "data" / "officials"
OUTPUT_ROOT = ROOT / "data" / "portraits" / "jobs"
USER_AGENT = (
    "Mozilla/5.0 (compatible; CivicLenZPortraitBot/1.0; +https://www.civicslenz.com/; research@civiclenz.ai)"
)
DISALLOWED_HOST_FRAGMENTS = (
    "google.",
    "gstatic.",
    "googleusercontent.",
    "ggpht.",
    "bing.com",
    "yahoo.com",
    "duckduckgo.com",
    "civicslenzz",
)
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".gif")
NON_PORTRAIT_FRAGMENTS = ("seal", "logo", "icon", "favicon", "sprite", "banner", "wordmark", "og-default")


class _PortraitHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.og_images: list[str] = []
        self.img_srcs: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = {key.lower(): (value or "") for key, value in attrs}
        if tag.lower() == "meta":
            prop = attributes.get("property") or attributes.get("name") or ""
            if prop.lower() in {"og:image", "og:image:url", "twitter:image"}:
                content = attributes.get("content")
                if content:
                    self.og_images.append(content)
        if tag.lower() == "img":
            src = attributes.get("src")
            alt = attributes.get("alt")
            if src:
                self.img_srcs.append((src, alt))


def disallowed_url(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    return any(fragment in host for fragment in DISALLOWED_HOST_FRAGMENTS)


def official_website(record: dict[str, Any]) -> str | None:
    for item in record.get("websites") or []:
        if item.get("type") == "official" and item.get("url"):
            return str(item["url"])
    return record.get("sourceUrl") or record.get("sourceMemberUrl")


def load_canonical_officials(root: Path = OFFICIALS_ROOT) -> list[dict[str, Any]]:
    officials: list[dict[str, Any]] = []
    for path in sorted(root.rglob("*.json")):
        record = json.loads(path.read_text(encoding="utf-8"))
        if record.get("recordStatus") in {"duplicate", "archived"}:
            continue
        officials.append(record)
    return officials


def fetch(url: str, accept: str) -> requests.Response:
    response = requests.get(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "From": "research@civiclenz.ai",
            "Accept": accept,
            "Accept-Language": "en-US,en;q=0.9",
        },
        timeout=(10, 45),
    )
    response.raise_for_status()
    return response


def image_dimensions(content: bytes, content_type: str) -> tuple[int | None, int | None]:
    try:
        if content.startswith(b"\x89PNG\r\n\x1a\n") and len(content) >= 24:
            width, height = struct.unpack(">II", content[16:24])
            return int(width), int(height)
        if content.startswith(b"\xff\xd8"):
            index = 2
            while index < len(content) - 9:
                if content[index] != 0xFF:
                    break
                marker = content[index + 1]
                length = struct.unpack(">H", content[index + 2 : index + 4])[0]
                if marker in {0xC0, 0xC1, 0xC2} and length >= 7:
                    height, width = struct.unpack(">HH", content[index + 5 : index + 9])
                    return int(width), int(height)
                index += 2 + length
        if content_type.startswith("image/webp") and content[0:4] == b"RIFF" and len(content) >= 30:
            if content[12:16] == b"VP8 ":
                width = struct.unpack("<H", content[26:28])[0] & 0x3FFF
                height = struct.unpack("<H", content[28:30])[0] & 0x3FFF
                return int(width), int(height)
    except Exception:
        return None, None
    return None, None


def looks_like_non_portrait(url: str) -> bool:
    lowered = url.lower()
    return any(fragment in lowered for fragment in NON_PORTRAIT_FRAGMENTS)


def candidate_image_urls(page_url: str, html: str) -> list[str]:
    parser = _PortraitHTMLParser()
    parser.feed(html)
    portrait_like: list[str] = []
    generic: list[str] = []
    for src, alt in parser.img_srcs:
        haystack = f"{src} {alt}".lower()
        target = portrait_like if any(token in haystack for token in ("portrait", "official photo", "headshot", "governor")) else generic
        target.append(src)
    ordered = portrait_like + list(parser.og_images) + generic
    resolved: list[str] = []
    seen: set[str] = set()
    for item in ordered:
        absolute = urljoin(page_url, item)
        if absolute in seen or disallowed_url(absolute):
            continue
        seen.add(absolute)
        resolved.append(absolute)
    return resolved


def portrait_job_for_official(record: dict[str, Any]) -> dict[str, Any]:
    official_id = str(record["officialId"])
    office = record.get("office") or {}
    seat_key = queue_style_seat_key(str(office.get("title") or "unknown-office"), office.get("districtNumber"))
    source_page = official_website(record)
    urls_tried: list[str] = []
    checked_at = utc_now()
    job_id = portrait_job_id(official_id, source_page or "none")

    def failure(reason: str) -> dict[str, Any]:
        return {
            "schemaVersion": "1.0.0",
            "portraitJobId": job_id,
            "officialId": official_id,
            "seatKey": seat_key,
            "status": "CHECKED_NO_AUTHORITATIVE_RESULT",
            "reviewStatus": "unreviewed",
            "imageUrl": None,
            "sourcePageUrl": source_page,
            "retrievedAt": None,
            "contentSha256": None,
            "width": None,
            "height": None,
            "mimeType": None,
            "rights": None,
            "credit": None,
            "urlsTried": urls_tried,
            "failureReason": reason,
            "checkedAt": checked_at,
            "notes": "Official-source fetch only. Search-engine image results are not a source.",
        }

    if not source_page:
        return failure("Canonical official has no official website to fetch.")
    if disallowed_url(source_page):
        return failure("Official website host is not an allowed portrait source.")

    try:
        urls_tried.append(source_page)
        page = fetch(source_page, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8")
    except requests.RequestException as exc:
        return failure(f"Official source page retrieval failed: {exc}")

    image_urls = candidate_image_urls(str(page.url), page.text)
    if not image_urls:
        return failure("Official source page did not expose an attributable portrait image URL.")

    for image_url in image_urls:
        urls_tried.append(image_url)
        if looks_like_non_portrait(image_url):
            continue
        try:
            image = fetch(image_url, "image/*,*/*;q=0.8")
        except requests.RequestException:
            continue
        content_type = (image.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        content = image.content
        if not content or not (content_type.startswith("image/") or content[:3] in {b"\xff\xd8\xff", b"\x89PN"} or content.startswith(b"\x89PNG")):
            if not content.startswith((b"\xff\xd8", b"\x89PNG", b"RIFF", b"GIF8")):
                continue
            if not content_type.startswith("image/"):
                content_type = "image/jpeg" if content.startswith(b"\xff\xd8") else "image/png"
        width, height = image_dimensions(content, content_type)
        return {
            "schemaVersion": "1.0.0",
            "portraitJobId": job_id,
            "officialId": official_id,
            "seatKey": seat_key,
            "status": "fetched_unreviewed",
            "reviewStatus": "unreviewed",
            "imageUrl": str(image.url or image_url),
            "sourcePageUrl": str(page.url),
            "retrievedAt": checked_at,
            "contentSha256": hashlib.sha256(content).hexdigest(),
            "width": width,
            "height": height,
            "mimeType": content_type or None,
            "rights": "unknown_pending_review",
            "credit": urlparse(str(page.url)).netloc,
            "urlsTried": urls_tried,
            "failureReason": None,
            "checkedAt": checked_at,
            "notes": "Fetched from an official website. reviewStatus remains unreviewed. HTTP 200 is not VERIFIED publication.",
        }

    return failure("Tried official-source image URLs; none returned an attributable image.")


def run_portrait_jobs(output_dir: Path = OUTPUT_ROOT) -> list[dict[str, Any]]:
    output_dir.mkdir(parents=True, exist_ok=True)
    jobs = [portrait_job_for_official(record) for record in load_canonical_officials()]
    expected: set[Path] = set()
    for job in jobs:
        path = output_dir / f"{job['officialId']}.json"
        path.write_text(json.dumps(job, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        expected.add(path)
    for old in output_dir.glob("*.json"):
        if old not in expected:
            old.unlink()
    return jobs


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=OUTPUT_ROOT)
    args = parser.parse_args()
    jobs = run_portrait_jobs(args.output)
    print(json.dumps({"jobCount": len(jobs), "statuses": [job["status"] for job in jobs]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
