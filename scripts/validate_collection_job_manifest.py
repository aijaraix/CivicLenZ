#!/usr/bin/env python3
"""Validate bounded, non-public CivicLenZ collection-job manifests.

The validator is intentionally dependency-free so queue workers can reject an
unsafe manifest before importing collector code or contacting a source. It is a
contract checker, not a scheduler: it does not fetch, enqueue, publish, or
modify CivicLenZ data.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import sys
from collections.abc import Iterable
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit


MANIFEST_VERSION = "1.0"
MAX_BATCH_MEMBERS = 50
NON_PUBLIC_ROOTS = (
    "data/sources/",
    "data/staging/",
    "data/research-staging/",
    "data/operations/",
)
PHASES = {
    "source_discovery",
    "seat_registry",
    "identity",
    "portrait",
    "contact",
    "social",
    "biography",
    "legislative_detail",
    "evidence_refresh",
}
SOURCE_TIERS = {
    "primary_official",
    "primary_statement",
    "reputable_secondary",
    "specialist_database",
    "discovery_only",
}
ROBOT_POLICIES = {"honor", "not_applicable_with_documented_reason"}
JOB_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{2,95}$")
TOKEN_RE = re.compile(r"^[a-z0-9][a-z0-9._:-]{1,159}$")
SHORT_TOKEN_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{2,99}$")
SEAT_KEY_RE = re.compile(r"^[a-z0-9][a-z0-9._:-]{2,159}$")
DEDUPE_KEY_RE = re.compile(r"^clzj1-[a-f0-9]{64}$")
OUTPUT_NAMESPACE_RE = re.compile(
    r"^data/(sources|staging|research-staging|operations)/[a-z0-9][a-z0-9._/-]*$"
)


def _is_int(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def _is_object(value: object) -> bool:
    return isinstance(value, dict)


def _display(path: Path | str) -> str:
    return str(path)


def _error(path: Path | str, message: str) -> str:
    return f"{_display(path)}: {message}"


def _expect_object(
    path: Path | str,
    name: str,
    value: object,
    required: set[str],
    allowed: set[str],
    errors: list[str],
) -> dict[str, Any] | None:
    if not _is_object(value):
        errors.append(_error(path, f"{name} must be an object"))
        return None
    missing = required.difference(value)
    if missing:
        errors.append(_error(path, f"{name} is missing required keys: {', '.join(sorted(missing))}"))
    unexpected = set(value).difference(allowed)
    if unexpected:
        errors.append(_error(path, f"{name} contains unsupported keys: {', '.join(sorted(unexpected))}"))
    return value


def _expect_string(
    path: Path | str,
    name: str,
    value: object,
    errors: list[str],
    pattern: re.Pattern[str] | None = None,
) -> str | None:
    if not isinstance(value, str):
        errors.append(_error(path, f"{name} must be a string"))
        return None
    if not value:
        errors.append(_error(path, f"{name} cannot be empty"))
        return None
    if pattern is not None and not pattern.fullmatch(value):
        errors.append(_error(path, f"{name} has an invalid format"))
    return value


def _expect_bounded_int(
    path: Path | str,
    name: str,
    value: object,
    minimum: int,
    maximum: int,
    errors: list[str],
) -> int | None:
    if not _is_int(value):
        errors.append(_error(path, f"{name} must be an integer"))
        return None
    if not minimum <= value <= maximum:
        errors.append(_error(path, f"{name} must be between {minimum} and {maximum}"))
    return value


def _normalize_url(value: str) -> str | None:
    try:
        parsed = urlsplit(value)
    except ValueError:
        return None
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.fragment:
        return None
    try:
        port = parsed.port
    except ValueError:
        return None
    host = parsed.hostname.lower()
    netloc = host if port in {None, 443} else f"{host}:{port}"
    path = parsed.path or "/"
    if path != "/":
        path = path.rstrip("/")
    return urlunsplit(("https", netloc, path, parsed.query, ""))


def _validate_effective_date(path: Path | str, value: object, errors: list[str]) -> str | None:
    date = _expect_string(path, "identity.effectiveDate", value, errors)
    if date is None:
        return None
    try:
        dt.date.fromisoformat(date)
    except ValueError:
        errors.append(_error(path, "identity.effectiveDate must be an ISO-8601 calendar date"))
    return date


def _target_member_keys(target: dict[str, Any]) -> list[str]:
    if target.get("kind") == "permanent_seat":
        seat_key = target.get("seatKey")
        return [seat_key] if isinstance(seat_key, str) else []
    members = target.get("memberSeatKeys")
    return sorted(members) if isinstance(members, list) and all(isinstance(item, str) for item in members) else []


def _validate_target(path: Path | str, value: object, limits: dict[str, Any] | None, errors: list[str]) -> dict[str, Any] | None:
    target = _expect_object(
        path,
        "identity.target",
        value,
        {"kind"},
        {"kind", "seatKey", "batchId", "memberSeatKeys"},
        errors,
    )
    if target is None:
        return None
    kind = target.get("kind")
    if kind == "permanent_seat":
        if set(target) != {"kind", "seatKey"}:
            errors.append(_error(path, "a permanent seat target must contain only kind and seatKey"))
        _expect_string(path, "identity.target.seatKey", target.get("seatKey"), errors, SEAT_KEY_RE)
        if limits is not None and limits.get("maxRecords") != 1:
            errors.append(_error(path, "a permanent seat target must set executionLimits.maxRecords to 1"))
    elif kind == "bounded_batch":
        if set(target) != {"kind", "batchId", "memberSeatKeys"}:
            errors.append(_error(path, "a bounded batch target must contain only kind, batchId, and memberSeatKeys"))
        _expect_string(path, "identity.target.batchId", target.get("batchId"), errors, SHORT_TOKEN_RE)
        members = target.get("memberSeatKeys")
        if not isinstance(members, list):
            errors.append(_error(path, "identity.target.memberSeatKeys must be an array of explicit seat keys"))
        else:
            if not 1 <= len(members) <= MAX_BATCH_MEMBERS:
                errors.append(_error(path, f"a bounded batch must list between 1 and {MAX_BATCH_MEMBERS} seat keys"))
            if all(isinstance(member, str) for member in members) and len(set(members)) != len(members):
                errors.append(_error(path, "identity.target.memberSeatKeys must not contain duplicates"))
            for index, member in enumerate(members):
                _expect_string(path, f"identity.target.memberSeatKeys[{index}]", member, errors, SEAT_KEY_RE)
            if limits is not None and _is_int(limits.get("maxRecords")) and limits["maxRecords"] != len(members):
                errors.append(_error(path, "a bounded batch must set executionLimits.maxRecords equal to its explicit seat-key count"))
    else:
        errors.append(_error(path, "identity.target.kind must be permanent_seat or bounded_batch"))
    return target


def _validate_execution_limits(path: Path | str, value: object, errors: list[str]) -> dict[str, Any] | None:
    limits = _expect_object(
        path,
        "executionLimits",
        value,
        {"maxRecords", "maxRequests", "maxRuntimeSeconds", "mode"},
        {"maxRecords", "maxRequests", "maxRuntimeSeconds", "mode"},
        errors,
    )
    if limits is None:
        return None
    _expect_bounded_int(path, "executionLimits.maxRecords", limits.get("maxRecords"), 1, MAX_BATCH_MEMBERS, errors)
    _expect_bounded_int(path, "executionLimits.maxRequests", limits.get("maxRequests"), 1, 500, errors)
    _expect_bounded_int(path, "executionLimits.maxRuntimeSeconds", limits.get("maxRuntimeSeconds"), 1, 3600, errors)
    if limits.get("mode") != "staging_only":
        errors.append(_error(path, "executionLimits.mode must be staging_only"))
    return limits


def _validate_source(path: Path | str, value: object, errors: list[str]) -> dict[str, Any] | None:
    source = _expect_object(
        path,
        "source",
        value,
        {"sourceId", "canonicalUrl", "host", "tier", "ratePolicy"},
        {"sourceId", "canonicalUrl", "host", "tier", "termsUrl", "ratePolicy"},
        errors,
    )
    if source is None:
        return None
    _expect_string(path, "source.sourceId", source.get("sourceId"), errors, SHORT_TOKEN_RE)
    canonical_url = _expect_string(path, "source.canonicalUrl", source.get("canonicalUrl"), errors)
    host = _expect_string(path, "source.host", source.get("host"), errors, re.compile(r"^[a-z0-9][a-z0-9.-]{1,251}$"))
    if isinstance(canonical_url, str):
        normalized_url = _normalize_url(canonical_url)
        if normalized_url is None:
            errors.append(_error(path, "source.canonicalUrl must be a fragment-free HTTPS URL without credentials"))
        elif canonical_url != normalized_url:
            errors.append(_error(path, "source.canonicalUrl must be normalized (lower-case host, no default port, no trailing slash)"))
        elif isinstance(host, str) and urlsplit(canonical_url).hostname != host:
            errors.append(_error(path, "source.host must exactly match the canonical URL host"))
    if source.get("tier") not in SOURCE_TIERS:
        errors.append(_error(path, "source.tier must be an approved source tier"))
    if "termsUrl" in source:
        terms_url = _expect_string(path, "source.termsUrl", source.get("termsUrl"), errors)
        if isinstance(terms_url, str) and _normalize_url(terms_url) is None:
            errors.append(_error(path, "source.termsUrl must be a fragment-free HTTPS URL without credentials"))
    _validate_rate_policy(path, source.get("ratePolicy"), errors)
    return source


def _validate_rate_policy(path: Path | str, value: object, errors: list[str]) -> dict[str, Any] | None:
    policy = _expect_object(
        path,
        "source.ratePolicy",
        value,
        {"requestsPerMinute", "maxConcurrentRequests", "minDelayMs", "maxRetries", "backoffSeconds", "robotsPolicy"},
        {"requestsPerMinute", "maxConcurrentRequests", "minDelayMs", "maxRetries", "backoffSeconds", "robotsPolicy"},
        errors,
    )
    if policy is None:
        return None
    _expect_bounded_int(path, "source.ratePolicy.requestsPerMinute", policy.get("requestsPerMinute"), 1, 60, errors)
    _expect_bounded_int(path, "source.ratePolicy.maxConcurrentRequests", policy.get("maxConcurrentRequests"), 1, 8, errors)
    _expect_bounded_int(path, "source.ratePolicy.minDelayMs", policy.get("minDelayMs"), 0, 60000, errors)
    _expect_bounded_int(path, "source.ratePolicy.maxRetries", policy.get("maxRetries"), 0, 5, errors)
    _expect_bounded_int(path, "source.ratePolicy.backoffSeconds", policy.get("backoffSeconds"), 0, 3600, errors)
    if policy.get("robotsPolicy") not in ROBOT_POLICIES:
        errors.append(_error(path, "source.ratePolicy.robotsPolicy must be honor or not_applicable_with_documented_reason"))
    return policy


def _validate_owner(path: Path | str, value: object, errors: list[str]) -> dict[str, Any] | None:
    owner = _expect_object(
        path,
        "owner",
        value,
        {"workstreamId", "workerId"},
        {"workstreamId", "workerId"},
        errors,
    )
    if owner is None:
        return None
    _expect_string(path, "owner.workstreamId", owner.get("workstreamId"), errors, SHORT_TOKEN_RE)
    _expect_string(path, "owner.workerId", owner.get("workerId"), errors, SHORT_TOKEN_RE)
    return owner


def _validate_output(path: Path | str, value: object, job_id: str | None, errors: list[str]) -> dict[str, Any] | None:
    output = _expect_object(
        path,
        "output",
        value,
        {"namespace", "writeMode", "visibility"},
        {"namespace", "writeMode", "visibility"},
        errors,
    )
    if output is None:
        return None
    namespace = _expect_string(path, "output.namespace", output.get("namespace"), errors)
    if isinstance(namespace, str):
        if not OUTPUT_NAMESPACE_RE.fullmatch(namespace) or not namespace.startswith(NON_PUBLIC_ROOTS):
            errors.append(_error(path, "output.namespace must be under one allowed non-public data root"))
        if ".." in namespace.split("/") or "//" in namespace:
            errors.append(_error(path, "output.namespace must not contain traversal or empty path segments"))
        if isinstance(job_id, str) and not namespace.endswith(f"/{job_id}"):
            errors.append(_error(path, "output.namespace must end with its jobId so no two jobs share a write location"))
    if output.get("writeMode") not in {"append_only", "idempotent_upsert"}:
        errors.append(_error(path, "output.writeMode must be append_only or idempotent_upsert"))
    if output.get("visibility") != "review_only":
        errors.append(_error(path, "output.visibility must be review_only"))
    return output


def _validate_review(path: Path | str, value: object, errors: list[str]) -> dict[str, Any] | None:
    review = _expect_object(
        path,
        "review",
        value,
        {"publicationAllowed", "reviewStatus", "promotionRequired", "humanReviewRequired"},
        {"publicationAllowed", "reviewStatus", "promotionRequired", "humanReviewRequired"},
        errors,
    )
    if review is None:
        return None
    if review.get("publicationAllowed") is not False:
        errors.append(_error(path, "review.publicationAllowed must be false"))
    if review.get("reviewStatus") != "unreviewed":
        errors.append(_error(path, "review.reviewStatus must be unreviewed"))
    if review.get("promotionRequired") is not True:
        errors.append(_error(path, "review.promotionRequired must be true"))
    if review.get("humanReviewRequired") is not True:
        errors.append(_error(path, "review.humanReviewRequired must be true"))
    return review


def dedupe_material(manifest: dict[str, Any]) -> dict[str, Any]:
    """Return the stable identity material that is hashed into ``dedupeKey``."""

    identity = manifest["identity"]
    source = manifest["source"]
    target = identity["target"]
    return {
        "jurisdictionId": identity["jurisdictionId"].lower(),
        "targetKind": target["kind"],
        "targetSeatKeys": _target_member_keys(target),
        "phase": identity["phase"],
        "sourceId": source["sourceId"],
        "sourceHost": source["host"],
        "sourceUrl": source["canonicalUrl"],
        "effectiveDate": identity["effectiveDate"],
    }


def compute_dedupe_key(manifest: dict[str, Any]) -> str:
    material = json.dumps(dedupe_material(manifest), sort_keys=True, separators=(",", ":"))
    return "clzj1-" + hashlib.sha256(material.encode("utf-8")).hexdigest()


def validate_manifest(manifest: object, path: Path | str = "<manifest>") -> list[str]:
    """Validate one manifest without executing it.

    The returned list is empty only when the manifest is safe to hand to a
    scheduler. Cross-manifest duplicate and overlap checks are done by
    :func:`validate_paths`.
    """

    errors: list[str] = []
    root = _expect_object(
        path,
        "manifest",
        manifest,
        {"manifestVersion", "jobId", "identity", "source", "owner", "executionLimits", "output", "review", "dedupeKey"},
        {"manifestVersion", "jobId", "identity", "source", "owner", "executionLimits", "output", "review", "dedupeKey"},
        errors,
    )
    if root is None:
        return errors
    if root.get("manifestVersion") != MANIFEST_VERSION:
        errors.append(_error(path, f"manifestVersion must be {MANIFEST_VERSION!r}"))
    job_id = _expect_string(path, "jobId", root.get("jobId"), errors, JOB_ID_RE)
    limits = _validate_execution_limits(path, root.get("executionLimits"), errors)

    identity = _expect_object(
        path,
        "identity",
        root.get("identity"),
        {"jurisdictionId", "jurisdictionName", "effectiveDate", "phase", "target"},
        {"jurisdictionId", "jurisdictionName", "effectiveDate", "phase", "target"},
        errors,
    )
    if identity is not None:
        _expect_string(path, "identity.jurisdictionId", identity.get("jurisdictionId"), errors, TOKEN_RE)
        jurisdiction_name = _expect_string(path, "identity.jurisdictionName", identity.get("jurisdictionName"), errors)
        if isinstance(jurisdiction_name, str) and len(jurisdiction_name) > 160:
            errors.append(_error(path, "identity.jurisdictionName must be at most 160 characters"))
        _validate_effective_date(path, identity.get("effectiveDate"), errors)
        if identity.get("phase") not in PHASES:
            errors.append(_error(path, "identity.phase must be an approved granular collection phase"))
        _validate_target(path, identity.get("target"), limits, errors)

    source = _validate_source(path, root.get("source"), errors)
    _validate_owner(path, root.get("owner"), errors)
    _validate_output(path, root.get("output"), job_id, errors)
    _validate_review(path, root.get("review"), errors)
    provided_key = _expect_string(path, "dedupeKey", root.get("dedupeKey"), errors, DEDUPE_KEY_RE)

    if not errors and identity is not None and source is not None and isinstance(provided_key, str):
        expected_key = compute_dedupe_key(root)
        if provided_key != expected_key:
            errors.append(_error(path, "dedupeKey does not match the deterministic identity hash"))
    return errors


def _load_manifest(path: Path) -> tuple[dict[str, Any] | None, list[str]]:
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return None, [_error(path, f"invalid JSON: {exc}")]
    if not _is_object(loaded):
        return None, [_error(path, "manifest root must be an object")]
    return loaded, []


def _manifest_paths(inputs: Iterable[Path]) -> tuple[list[Path], list[str]]:
    manifests: list[Path] = []
    errors: list[str] = []
    for value in inputs:
        if value.is_file():
            manifests.append(value)
        elif value.is_dir():
            manifests.extend(sorted(path for path in value.rglob("*.json") if path.is_file()))
        else:
            errors.append(_error(value, "does not exist or is not a file/directory"))
    return sorted(set(manifests)), errors


def _collision_scope(manifest: dict[str, Any]) -> tuple[str, str, str, str, str]:
    identity = manifest["identity"]
    source = manifest["source"]
    return (
        identity["jurisdictionId"].lower(),
        identity["phase"],
        source["sourceId"],
        source["host"],
        identity["effectiveDate"],
    )


def validate_paths(inputs: Iterable[Path | str]) -> list[str]:
    """Validate one or more manifest paths, including scope collisions.

    A bounded batch and a permanent-seat job collide when they include the same
    explicit seat under the same jurisdiction, phase, source, and effective
    date. Different sources remain separately attributable and may coexist.
    """

    paths, errors = _manifest_paths([Path(value) for value in inputs])
    valid: list[tuple[Path, dict[str, Any]]] = []
    for path in paths:
        manifest, load_errors = _load_manifest(path)
        errors.extend(load_errors)
        if manifest is None:
            continue
        manifest_errors = validate_manifest(manifest, path)
        errors.extend(manifest_errors)
        if not manifest_errors:
            valid.append((path, manifest))

    seen_job_ids: dict[str, Path] = {}
    seen_dedupe_keys: dict[str, Path] = {}
    seen_namespaces: dict[str, Path] = {}
    seen_seats: dict[tuple[str, str, str, str, str], dict[str, Path]] = {}
    for path, manifest in valid:
        job_id = manifest["jobId"]
        dedupe_key = manifest["dedupeKey"]
        namespace = manifest["output"]["namespace"]
        for label, value, seen in (
            ("jobId", job_id, seen_job_ids),
            ("dedupeKey", dedupe_key, seen_dedupe_keys),
            ("output.namespace", namespace, seen_namespaces),
        ):
            prior = seen.get(value)
            if prior is not None:
                errors.append(_error(path, f"duplicate {label} {value!r}; already claimed by {prior}"))
            else:
                seen[value] = path

        scope = _collision_scope(manifest)
        claimed = seen_seats.setdefault(scope, {})
        for seat_key in _target_member_keys(manifest["identity"]["target"]):
            prior = claimed.get(seat_key)
            if prior is not None:
                errors.append(
                    _error(
                        path,
                        "target overlaps an existing job for the same jurisdiction, phase, source, and effective date "
                        f"(seat {seat_key!r} already claimed by {prior})",
                    )
                )
            else:
                claimed[seat_key] = path
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Validate bounded, non-public CivicLenZ collection-job manifests without running collection."
    )
    parser.add_argument(
        "paths",
        nargs="+",
        type=Path,
        help="Manifest files or directories containing manifest JSON files.",
    )
    args = parser.parse_args(argv)
    errors = validate_paths(args.paths)
    if errors:
        print("Collection-job manifest validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print("Collection-job manifest validation passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
