from __future__ import annotations

import json
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

from workers.ontology.build_civic_field_ontology import build_ontology
from workers.quality.quality_control import run_quality_control

ROOT = Path(__file__).resolve().parents[1]


class CivicOntologyAndContractTests(unittest.TestCase):
    def test_ontology_is_extracted_not_speculative(self) -> None:
        ontology = json.loads((ROOT / "schemas" / "civic-field-ontology.json").read_text())
        built = build_ontology()
        self.assertEqual(ontology["fieldCount"], built["fieldCount"])
        self.assertEqual(ontology["queueSectionCount"], 23)
        self.assertEqual(len(ontology["queueSections"]), 23)
        self.assertLess(ontology["fieldCount"], 1000)
        self.assertGreater(ontology["declaredNotImplementedCount"], 0)
        self.assertIn("portrait_and_identity", ontology["queueSections"])
        statuses = {item["implementationStatus"] for item in ontology["fields"]}
        self.assertIn("DECLARED_NOT_IMPLEMENTED", statuses)
        self.assertTrue(any(item["implementationStatus"] == "DECLARED_NOT_IMPLEMENTED" for item in ontology["fields"]))

    def test_research_contracts_exist_for_required_families(self) -> None:
        schema = json.loads((ROOT / "schemas" / "research-contract.schema.json").read_text())
        validator = Draft202012Validator(schema, format_checker=FormatChecker())
        required = {
            "florida-statewide-executive",
            "florida-state-legislator",
            "us-legislator",
            "florida-county-constitutional-officer",
        }
        found = set()
        for path in (ROOT / "data" / "research-contracts").glob("*.json"):
            payload = json.loads(path.read_text())
            errors = list(validator.iter_errors(payload))
            self.assertEqual(errors, [], msg=path.name)
            found.add(payload["researchContractKey"])
        self.assertTrue(required.issubset(found))

    def test_quality_control_matches_files(self) -> None:
        report = run_quality_control()
        self.assertEqual(report["state"], "healthy", msg=report.get("errors"))
        self.assertEqual(report["fileCounts"]["expectedSeatFiles"], 532)
        self.assertEqual(report["fileCounts"]["occupancyCandidateFiles"], 192)


if __name__ == "__main__":
    unittest.main()
