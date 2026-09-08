#!/usr/bin/env python3
"""Extract the CivicLenZ civic-field ontology from existing schemas and docs.

Fields are declared from the official-profile schema, data dictionary,
enrichment-agent manifest, and the 23 research-queue sections. Missing
implementation is DECLARED_NOT_IMPLEMENTED. This file does not invent a
speculative thousand-field catalog.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
PROFILE_SCHEMA = ROOT / "schemas" / "elected-official-profile.schema.json"
SEAT_SCHEMA = ROOT / "schemas" / "elected-seat.schema.json"
DICTIONARY = ROOT / "docs" / "OFFICIAL_PROFILE_DATA_DICTIONARY.md"
MANIFEST = ROOT / "data" / "sources" / "enrichment-agent-manifest.json"
QUEUE = ROOT / "data" / "operations" / "florida-profile-research-queue.json"
OUTPUT = ROOT / "schemas" / "civic-field-ontology.json"

SECTION_RE = re.compile(r"^#{1,3} (.+)$", re.MULTILINE)
FIELD_RE = re.compile(r"`([a-z][a-z0-9_]*)`")


def camel_to_snake(value: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", value).lower()


def walk_schema_fields(node: dict[str, Any], prefix: str = "") -> set[str]:
    fields: set[str] = set()
    properties = node.get("properties")
    if isinstance(properties, dict):
        for key, child in properties.items():
            path = f"{prefix}.{key}" if prefix else key
            fields.add(key)
            fields.add(camel_to_snake(key))
            if isinstance(child, dict):
                fields.update(walk_schema_fields(child, path))
    defs = node.get("$defs")
    if isinstance(defs, dict):
        for child in defs.values():
            if isinstance(child, dict):
                fields.update(walk_schema_fields(child, prefix))
    items = node.get("items")
    if isinstance(items, dict):
        fields.update(walk_schema_fields(items, prefix))
    return fields


def dictionary_fields(text: str) -> list[dict[str, str]]:
    current_section = "unsectioned"
    rows: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for line in text.splitlines():
        heading = SECTION_RE.match(line)
        if heading:
            current_section = heading.group(1).strip()
            continue
        for match in FIELD_RE.finditer(line):
            key = match.group(1)
            identity = (current_section, key)
            if identity in seen:
                continue
            seen.add(identity)
            rows.append({"fieldKey": key, "section": current_section, "source": "official_profile_data_dictionary"})
    return rows


def build_ontology() -> dict[str, Any]:
    profile_schema = json.loads(PROFILE_SCHEMA.read_text(encoding="utf-8"))
    seat_schema = json.loads(SEAT_SCHEMA.read_text(encoding="utf-8"))
    implemented = walk_schema_fields(profile_schema) | walk_schema_fields(seat_schema)
    dictionary = dictionary_fields(DICTIONARY.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    queue = json.loads(QUEUE.read_text(encoding="utf-8"))
    sections = [item["sectionKey"] for item in queue["tasks"][0]["sections"]]

    fields: list[dict[str, Any]] = []
    seen_keys: set[str] = set()
    for row in dictionary:
        key = row["fieldKey"]
        implemented_here = key in implemented or key.replace("_", "") in {item.replace("_", "") for item in implemented}
        status = "implemented_in_schema" if implemented_here else "DECLARED_NOT_IMPLEMENTED"
        fields.append(
            {
                "fieldKey": key,
                "section": row["section"],
                "declaredFrom": [row["source"]],
                "implementationStatus": status,
            }
        )
        seen_keys.add(key)

    for section in sections:
        if section in seen_keys:
            continue
        fields.append(
            {
                "fieldKey": section,
                "section": "profile_research_queue",
                "declaredFrom": ["florida-profile-research-queue.json"],
                "implementationStatus": "DECLARED_NOT_IMPLEMENTED" if section not in implemented else "implemented_in_schema",
            }
        )
        seen_keys.add(section)

    agents = []
    for agent in manifest.get("agents", []):
        agents.append(
            {
                "agentKey": agent.get("agentKey"),
                "enabled": bool(agent.get("enabled")),
                "outputs": agent.get("outputs") or [],
                "scope": agent.get("scope") or [],
            }
        )
        for output in agent.get("outputs") or []:
            if output in seen_keys:
                continue
            fields.append(
                {
                    "fieldKey": output,
                    "section": f"enrichment-agent:{agent.get('agentKey')}",
                    "declaredFrom": ["enrichment-agent-manifest.json"],
                    "implementationStatus": "implemented_in_schema" if output in implemented else "DECLARED_NOT_IMPLEMENTED",
                }
            )
            seen_keys.add(output)

    implemented_count = sum(1 for item in fields if item["implementationStatus"] == "implemented_in_schema")
    declared_gap_count = sum(1 for item in fields if item["implementationStatus"] == "DECLARED_NOT_IMPLEMENTED")
    return {
        "ontologyVersion": "1.0.0",
        "extractionRule": "Fields are extracted from existing CivicLenZ schemas, the official-profile data dictionary, the enrichment-agent manifest, and the 23 research-queue sections. Gaps are DECLARED_NOT_IMPLEMENTED. No speculative thousand-field catalog is added.",
        "sourceDocuments": [
            "schemas/elected-official-profile.schema.json",
            "schemas/elected-seat.schema.json",
            "docs/OFFICIAL_PROFILE_DATA_DICTIONARY.md",
            "data/sources/enrichment-agent-manifest.json",
            "data/operations/florida-profile-research-queue.json",
        ],
        "queueSectionCount": len(sections),
        "queueSections": sections,
        "enrichmentAgents": agents,
        "fieldCount": len(fields),
        "implementedInSchemaCount": implemented_count,
        "declaredNotImplementedCount": declared_gap_count,
        "fields": fields,
    }


def main() -> int:
    payload = build_ontology()
    OUTPUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        f"Wrote {payload['fieldCount']} ontology fields "
        f"({payload['implementedInSchemaCount']} implemented, "
        f"{payload['declaredNotImplementedCount']} DECLARED_NOT_IMPLEMENTED) to {OUTPUT}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
