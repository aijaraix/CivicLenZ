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
        regenerated = deep_dossier._identity("seat", "contract", "1", "biography", "official_profile", 2)
        self.assertEqual(first, repeat)
        self.assertNotEqual(first, other)
        self.assertNotEqual(first, regenerated)
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
            "generation": 1,
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

    def test_deep_children_map_to_explicit_capabilities_without_names_or_counts(self):
        self.assertEqual(deep_dossier.capability_for_child("identity", "official_identity"), "identity_resolution")
        self.assertEqual(deep_dossier.capability_for_child("identity", "source_pass"), "entity_resolution")
        self.assertEqual(deep_dossier.capability_for_child("election_history", "reconciliation_audit"), "dataset_reconciliation")
        self.assertEqual(deep_dossier.capability_for_child("monitoring", "change_detection"), "change_detection")
        self.assertIsNone(deep_dossier.capability_for_child("biography", "official_profile"))

    def test_family_children_map_to_explicit_capabilities(self):
        expected = {
            ("campaign_finance", "filing_universe"): "campaign_finance",
            ("campaign_finance", "transaction_classes"): "contributions",
            ("campaign_finance", "reconciliation_audit"): "finance_reconciliation",
            ("financial_disclosure", "filing_universe"): "financial_disclosures",
            ("promises_statements", "commitment_period"): "campaign_promises",
            ("news_activity", "source_pass"): "news",
            ("social", "activity_window"): "material_social_activity",
            ("family_public_relationships", "source_pass"): "organization_relationships",
            ("biography", "chronology"): "biography",
        }
        for child, capability in expected.items():
            self.assertEqual(deep_dossier.capability_for_child(*child), capability)


    def test_elections_and_quality_scopes_are_bounded_and_named_by_contract(self):
        self.assertEqual(
            deep_dossier.CHILDREN["elections_gis"],
            ("calendar_window", "election_universe", "result_records"),
        )
        self.assertEqual(
            deep_dossier.CHILDREN["quality_monitoring"],
            ("currentness_check", "contradiction_check", "coverage_audit"),
        )
        expected = {
            ("elections_gis", "calendar_window"): "election_calendar",
            ("elections_gis", "election_universe"): "election_discovery",
            ("elections_gis", "result_records"): "election_results",
            ("quality_monitoring", "currentness_check"): "freshness_monitor",
            ("quality_monitoring", "contradiction_check"): "contradiction_resolution",
        }
        for child, capability in expected.items():
            self.assertEqual(deep_dossier.capability_for_child(*child), capability)


    def test_multiple_registered_source_families_get_distinct_lineage(self):
        sources = {
            "official-one": {"active": True},
            "official-two": {"active": True},
            "inactive": {"active": False},
        }
        selected = deep_dossier._sources_for_child(
            "source_pass",
            {"policy": "official-one,official-two,inactive"},
            sources,
        )
        self.assertEqual(selected, ["official-one", "official-two"])
        first = deep_dossier._identity(
            "seat", "contract", "1", "news_activity", "source_pass",
            source_family=selected[0],
        )
        second = deep_dossier._identity(
            "seat", "contract", "1", "news_activity", "source_pass",
            source_family=selected[1],
        )
        self.assertNotEqual(first, second)
        self.assertEqual(
            deep_dossier._identity("seat", "contract", "1", "news_activity", "source_pass"),
            deep_dossier._identity("seat", "contract", "1", "news_activity", "source_pass"),
        )

    def test_source_family_passes_are_bounded(self):
        sources = {
            f"official-{index}": {"active": True}
            for index in range(6)
        }
        selected = deep_dossier._sources_for_child(
            "source_pass",
            {"policy": ",".join(sources)},
            sources,
        )
        self.assertEqual(len(selected), deep_dossier.MAX_SOURCE_FAMILY_PASSES)


    def test_source_discovery_and_gis_scopes_decompose_into_bounded_units(self):
        self.assertEqual(
            deep_dossier.CHILDREN["source_discovery"],
            ("source_inventory", "source_family_discovery", "independent_rediscovery"),
        )
        self.assertEqual(
            deep_dossier.CHILDREN["gis_boundaries"],
            ("boundary_geometry", "reconciliation_audit", "coverage_audit"),
        )
        self.assertEqual(
            deep_dossier.capability_for_child("source_discovery", "source_family_discovery"),
            "source_discovery",
        )
        self.assertEqual(
            deep_dossier.capability_for_child("gis_boundaries", "boundary_geometry"),
            "gis_boundaries",
        )


if __name__ == "__main__":
    unittest.main()
