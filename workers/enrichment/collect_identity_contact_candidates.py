#!/usr/bin/env python3
"""Collect review-only portrait, contact, website, and social candidates.

The collector reads the seat research queue and visits only the official source URL
already attached to each task. It does not publish candidates directly. Portraits
remain rights-review candidates until source, identity, credit, and reuse status are
confirmed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Tag

from workers.ingestion.common import BROWSER_USER_AGENT, utc_now

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_QUEUE = ROOT / "data" / "operations" / "florida-profile-research-queue.json"
DEFAULT_OUTPUT = ROOT / "data" / "research-staging" / "florida" / "identity-contact"
NAMESPACE = uuid.UUID("84b50df2-0f7d-48f4-a17e-49331b393c44")
MAX_IMAGE_BYTES = 5_000_000

SOCIAL_DOMAINS = {
    "x.com": "X",
    "twitter.com": "X",
    "facebook.com": "Facebook",
    "instagram.com": "Instagram",
    "youtube.com": "YouTube",
    "youtu.be": "YouTube",
    "tiktok.com": "TikTok",
    "linkedin.com": "LinkedIn",
    "threads.net": "Threads",
    "bsky.app": "Bluesky",
    "truthsocial.com": "Truth Social",
    "telegram.me": "Telegram",
    "t.me": "Telegram",
}

IMAGE_EXCLUDE_TERMS = {
    "logo",
    "seal",
    "icon",
    "favicon",
    "sprite",
    "banner",
    "masthead",
    "header",
    "footer",
    "placeholder",
    "default",
    "spacer",
    "loading",
}
IMAGE_PREFERRED_TERMS = {
    "portrait",
    "headshot",
    "member",
    "senator",
    "representative",
    "governor",
    "attorney",
    "commissioner",
    "official",
    "profile",
}
EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
PHONE_PATTERN = re.compile(r"(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}")


@dataclass(frozen=True)
class ImageCandidate:
    url: str
    method: str
    score: int
    alt_text: str | None


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def canonical_host(url: str) -> str:
    return urlparse(url).netloc.lower().split(":", 1)[0].removeprefix("www.")


def request_headers(accept: str) -> dict[str, str]:
    return {
        "User-Agent": BROWSER_USER_AGENT,
        "From": "research@civicslenz.com",
        "Accept": accept,
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
    }


def normalize_url(base_url: str, value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip()
    if not value or value.startswith(("data:", "javascript:", "#")):
        return None
    resolved = urljoin(base_url, value)
    parsed = urlparse(resolved)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    return resolved


def meta_content(soup: BeautifulSoup, *, property_name: str | None = None, name: str | None = None) -> str | None:
    selector: dict[str, str] = {}
    if property_name:
        selector["property"] = property_name
    if name:
        selector["name"] = name
    tag = soup.find("meta", attrs=selector)
    if isinstance(tag, Tag):
        content = tag.get("content")
        return str(content).strip() if content else None
    return None


def image_score(url: str, alt_text: str | None, display_name: str, method: str) -> int:
    text = f"{url} {alt_text or ''}".lower()
    score = 0
    if method == "og:image":
        score += 45
    elif method == "twitter:image":
        score += 40
    elif method == "json-ld":
        score += 35
    else:
        score += 5

    for term in IMAGE_PREFERRED_TERMS:
        if term in text:
            score += 9
    for term in IMAGE_EXCLUDE_TERMS:
        if term in text:
            score -= 35

    name_tokens = [token.lower() for token in re.findall(r"[A-Za-z]{3,}", display_name)]
    score += sum(12 for token in name_tokens if token in text)
    if re.search(r"\.(?:jpe?g|png|webp)(?:\?|$)", url, re.IGNORECASE):
        score += 4
    return score


def json_ld_images(soup: BeautifulSoup) -> Iterable[str]:
    for tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw = tag.string or tag.get_text(" ", strip=True)
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except Exception:
            continue
        stack: list[Any] = [data]
        while stack:
            item = stack.pop()
            if isinstance(item, dict):
                for key, value in item.items():
                    if key in {"image", "photo", "thumbnailUrl"}:
                        if isinstance(value, str):
                            yield value
                        elif isinstance(value, dict) and isinstance(value.get("url"), str):
                            yield value["url"]
                        elif isinstance(value, list):
                            for part in value:
                                if isinstance(part, str):
                                    yield part
                                elif isinstance(part, dict) and isinstance(part.get("url"), str):
                                    yield part["url"]
                    elif isinstance(value, (dict, list)):
                        stack.append(value)
            elif isinstance(item, list):
                stack.extend(item)


def discover_image_candidates(soup: BeautifulSoup, page_url: str, display_name: str) -> list[ImageCandidate]:
    found: dict[str, ImageCandidate] = {}

    def add(raw_url: str | None, method: str, alt_text: str | None = None) -> None:
        url = normalize_url(page_url, raw_url)
        if not url:
            return
        candidate = ImageCandidate(url=url, method=method, score=image_score(url, alt_text, display_name, method), alt_text=alt_text)
        previous = found.get(url)
        if previous is None or candidate.score > previous.score:
            found[url] = candidate

    add(meta_content(soup, property_name="og:image"), "og:image")
    add(meta_content(soup, property_name="og:image:url"), "og:image")
    add(meta_content(soup, name="twitter:image"), "twitter:image")
    add(meta_content(soup, name="twitter:image:src"), "twitter:image")

    for raw_url in json_ld_images(soup):
        add(raw_url, "json-ld")

    for image in soup.find_all("img"):
        src = image.get("src") or image.get("data-src") or image.get("data-lazy-src")
        alt = str(image.get("alt") or "").strip() or None
        add(str(src) if src else None, "img", alt)

    return sorted(found.values(), key=lambda candidate: (-candidate.score, candidate.url))[:6]


def download_image_metadata(candidate: ImageCandidate, page_url: str) -> dict[str, Any]:
    result: dict[str, Any] = {
        "url": candidate.url,
        "method": candidate.method,
        "score": candidate.score,
        "altText": candidate.alt_text,
        "sourcePageUrl": page_url,
        "rightsStatus": "review_required",
        "identityReviewStatus": "unreviewed",
    }
    try:
        response = requests.get(
            candidate.url,
            headers=request_headers("image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"),
            timeout=(8, 20),
            allow_redirects=True,
        )
        result["httpStatus"] = response.status_code
        result["finalUrl"] = response.url
        content_type = response.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
        result["contentType"] = content_type or None
        result["byteSize"] = len(response.content)
        if response.ok and content_type.startswith("image/") and len(response.content) <= MAX_IMAGE_BYTES:
            result["imageSha256"] = sha256_bytes(response.content)
            result["downloadStatus"] = "captured_for_hash"
        elif len(response.content) > MAX_IMAGE_BYTES:
            result["downloadStatus"] = "skipped_too_large"
        else:
            result["downloadStatus"] = "not_an_image_or_http_error"
    except Exception as exc:
        result["downloadStatus"] = "failed"
        result["error"] = str(exc)[:500]
    return result


def link_text(link: Tag) -> str:
    return " ".join(link.get_text(" ", strip=True).split())


def discover_contacts_and_links(soup: BeautifulSoup, page_url: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    contacts: dict[tuple[str, str], dict[str, Any]] = {}
    socials: dict[tuple[str, str], dict[str, Any]] = {}
    websites: dict[str, dict[str, Any]] = {}

    for link in soup.find_all("a", href=True):
        href = str(link.get("href", "")).strip()
        label = link_text(link) or None
        lower = href.lower()
        if lower.startswith("mailto:"):
            value = href.split(":", 1)[1].split("?", 1)[0].strip()
            if value:
                contacts[("email", value.lower())] = {"type": "email", "value": value, "label": label, "sourcePageUrl": page_url}
            continue
        if lower.startswith("tel:"):
            value = href.split(":", 1)[1].strip()
            if value:
                contacts[("phone", value)] = {"type": "phone", "value": value, "label": label, "sourcePageUrl": page_url}
            continue

        url = normalize_url(page_url, href)
        if not url:
            continue
        host = canonical_host(url)
        platform = next((name for domain, name in SOCIAL_DOMAINS.items() if host == domain or host.endswith(f".{domain}")), None)
        if platform:
            socials[(platform, url)] = {"platform": platform, "url": url, "label": label, "sourcePageUrl": page_url, "reviewStatus": "unreviewed"}
            continue

        label_lower = (label or "").lower()
        if any(term in label_lower or term in url.lower() for term in ["contact", "newsletter", "subscribe", "constituent", "office", "schedule", "appointment", "public record"]):
            websites[url] = {"url": url, "label": label, "sourcePageUrl": page_url, "reviewStatus": "unreviewed"}

    text = soup.get_text(" ", strip=True)
    for email in sorted(set(EMAIL_PATTERN.findall(text))):
        contacts.setdefault(("email", email.lower()), {"type": "email", "value": email, "label": None, "sourcePageUrl": page_url})
    for phone in sorted(set(PHONE_PATTERN.findall(text))):
        normalized = " ".join(phone.split())
        contacts.setdefault(("phone", normalized), {"type": "phone", "value": normalized, "label": None, "sourcePageUrl": page_url})

    return list(contacts.values())[:20], list(socials.values())[:20], list(websites.values())[:20]


def collect_task(task: dict[str, Any], sleep_seconds: float = 0.0) -> dict[str, Any]:
    task_id = str(task["taskId"])
    source_url = task.get("sourceUrl")
    fetched_at = utc_now()
    record: dict[str, Any] = {
        "enrichmentRecordVersion": "1.0.0",
        "enrichmentRecordId": str(uuid.uuid5(NAMESPACE, task_id)),
        "taskId": task_id,
        "seatKey": task.get("seatKey"),
        "displayName": task.get("displayName"),
        "officeTitle": task.get("officeTitle"),
        "sourceUrl": source_url,
        "fetchedAt": fetched_at,
        "collectionStatus": "failed",
        "reviewStatus": "unreviewed",
        "publicationAllowed": False,
        "portraitCandidates": [],
        "contactCandidates": [],
        "socialCandidates": [],
        "websiteCandidates": [],
        "errors": [],
    }
    if not source_url:
        record["errors"].append("No official source URL is attached to the research task")
        return record

    try:
        if sleep_seconds:
            time.sleep(sleep_seconds)
        response = requests.get(
            source_url,
            headers=request_headers("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"),
            timeout=(10, 30),
            allow_redirects=True,
        )
        response.raise_for_status()
        record["httpStatus"] = response.status_code
        record["finalUrl"] = response.url
        record["sourceSnapshotSha256"] = sha256_bytes(response.content)
        content_type = response.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
        record["contentType"] = content_type or None
        if "html" not in content_type and not response.text.lstrip().lower().startswith(("<!doctype html", "<html")):
            raise RuntimeError(f"Official source returned unsupported content type: {content_type or 'unknown'}")

        soup = BeautifulSoup(response.text, "lxml")
        title = soup.title.get_text(" ", strip=True) if soup.title else None
        record["pageTitle"] = title
        image_candidates = discover_image_candidates(soup, response.url, str(task.get("displayName") or ""))
        record["portraitCandidates"] = [download_image_metadata(candidate, response.url) for candidate in image_candidates]
        contacts, socials, websites = discover_contacts_and_links(soup, response.url)
        record["contactCandidates"] = contacts
        record["socialCandidates"] = socials
        record["websiteCandidates"] = websites
        record["collectionStatus"] = "success"
        record["candidateSummary"] = {
            "portraits": len(record["portraitCandidates"]),
            "contacts": len(contacts),
            "socials": len(socials),
            "websites": len(websites),
        }
    except Exception as exc:
        record["errors"].append(str(exc)[:1000])
    return record


def write_records(records: list[dict[str, Any]], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    expected: set[Path] = set()
    for record in records:
        filename = f"{record['seatKey']}-{record['taskId']}.json"
        path = output_dir / filename
        expected.add(path)
        path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    for old_file in output_dir.glob("*.json"):
        if old_file not in expected:
            old_file.unlink()


def load_tasks(queue_path: Path, max_tasks: int | None = None) -> list[dict[str, Any]]:
    queue = json.loads(queue_path.read_text(encoding="utf-8"))
    tasks = list(queue.get("tasks", []))
    if max_tasks is not None:
        tasks = tasks[:max_tasks]
    return tasks


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--queue", type=Path, default=DEFAULT_QUEUE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--max-tasks", type=int)
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--sleep-seconds", type=float, default=0.0)
    parser.add_argument("--minimum-success-rate", type=float, default=0.60)
    args = parser.parse_args()

    tasks = load_tasks(args.queue, args.max_tasks)
    records: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        futures = {executor.submit(collect_task, task, args.sleep_seconds): task for task in tasks}
        for future in as_completed(futures):
            records.append(future.result())

    records.sort(key=lambda item: (str(item.get("officeTitle")), str(item.get("displayName"))))
    write_records(records, args.output)
    successes = sum(1 for record in records if record.get("collectionStatus") == "success")
    portrait_records = sum(1 for record in records if record.get("portraitCandidates"))
    contact_records = sum(1 for record in records if record.get("contactCandidates"))
    success_rate = successes / len(records) if records else 0.0
    summary = {
        "status": "success" if success_rate >= args.minimum_success_rate else "below_minimum_success_rate",
        "tasks": len(records),
        "successes": successes,
        "successRate": round(success_rate, 4),
        "recordsWithPortraitCandidates": portrait_records,
        "recordsWithContactCandidates": contact_records,
        "outputDirectory": str(args.output),
    }
    print(json.dumps(summary, indent=2))
    return 0 if success_rate >= args.minimum_success_rate else 1


if __name__ == "__main__":
    raise SystemExit(main())
