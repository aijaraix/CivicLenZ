import hashlib
import json
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import deep_dossier
import contract_dispatcher


class DeepDossierPlannerTests(unittest.TestCase):
    def test_child_work_identity_is_deterministic_and_distinct(self):
        first = deep_dossier._identity("seat", "contract", "1", "biography", "official_profile")
        repeat = deep_dossier._identity("seat", "contract", "1", "biography", "official_profile")
        other = deep_dossier._identity("seat", "contract", "1", "biography", "chronology")
        self.assertEqual(first, repeat)
        self.assertNotEqual(first, other)
        self.assertTrue(first[0].startswith("need:v1:"))
        self.assertTrue(first[1].startswith("work:v1:"))

    def test_graph_has_multiple_bounded_children_without_names_or_fixed_counts(self):
        self.assertGreater(len(deep_dossier.CHILDREN["campaign_finance"]), 1)
        self.assertGreater(len(deep_dossier.CHILDREN["promises_statements"]), 1)
        self.assertLessEqual(max(map(len, deep_dossier.CHILDREN.values())), deep_dossier.MAX_CHILDREN_PER_SCOPE)
        source, state = deep_dossier._source_for_child(
            "filing_universe",
            {"policy": "florida-governor-official,fl_dos_elections"},
            {
                "fl_dos_elections": {"active": True},
                "florida-governor-official": {"active": True},
            },
        )
        self.assertEqual(source, "fl_dos_elections")
        self.assertEqual(state, "SOURCE_RESOLVED")

    def test_missing_source_family_is_explicitly_blocked(self):
        source, state = deep_dossier._source_for_child(
            "independent_pass", {"policy": "missing-authoritative-source"}, {}
        )
        self.assertIsNone(source)
        self.assertEqual(state, "SOURCE_FAMILY_NOT_REGISTERED")

    def test_identity_digest_does_not_depend_on_politician_name(self):
        need, work = deep_dossier._identity("seat", "contract", "1", "biography", "official_profile")
        expected = hashlib.sha256(json.dumps({
            "version": 1,
            "graph_version": deep_dossier.VERSION,
            "subject_type": "seat",
            "subject_id": "seat",
            "contract_id": "contract",
            "contract_version": "1",
            "scope_key": "biography",
            "child_unit": "official_profile",
        }, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        self.assertEqual(need, "need:v1:" + expected)
        self.assertNotIn("politician", need + work)

    def test_deep_graph_waits_for_explicit_collector_execution_enablement(self):
        class Cursor:
            def __init__(self):
                self.calls = []

            def execute(self, sql, params=()):
                self.calls.append((sql, params))

            def fetchall(self):
                return []

        cursor = Cursor()
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(contract_dispatcher.route_pending(cursor, {"deployment": None, "ready": False}), 0)
        self.assertIn("deep_dossier_graph_version", cursor.calls[0][0])
        self.assertEqual(cursor.calls[0][1][-1], False)


if __name__ == "__main__":
    unittest.main()
