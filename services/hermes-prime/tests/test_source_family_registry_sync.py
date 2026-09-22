import unittest
from pathlib import Path


MIGRATION = (
    Path(__file__).resolve().parents[3]
    / "supabase"
    / "migrations"
    / "20260922230000_source_family_registry_sync.sql"
)


class SourceFamilyRegistrySyncTests(unittest.TestCase):
    def test_migration_is_source_metadata_only_and_covers_adapter_backed_families(self):
        sql = MIGRATION.read_text(encoding="utf-8")
        expected = {
            "florida-senate-members",
            "florida-house-members",
            "broward-county-soe",
            "palm-beach-county-soe",
            "florida-attorney-general",
            "florida-cfo",
            "florida-agriculture-commissioner",
            "us-house-members",
            "us-senate-members",
            "miami-dade-mayor-html",
            "miami-dade-county-commission-html",
            "broward-county-commission",
            "palm-beach-county-commission",
        }
        for source_key in expected:
            self.assertIn("'" + source_key + "'", sql)
        self.assertIn("ON CONFLICT (source_key) DO UPDATE", sql)
        self.assertIn("WHERE jurisdiction_id IS NOT NULL", sql)
        self.assertIn("'UNOBSERVED'", sql)
        self.assertNotIn("INSERT INTO public.persons", sql)
        self.assertNotIn("INSERT INTO public.seats", sql)
        self.assertNotIn("INSERT INTO public.jobs", sql)
        self.assertNotIn("INSERT INTO hermes_ops.research_needs", sql)
        self.assertNotIn("publication_eligible", sql)

    def test_migration_does_not_activate_disabled_or_authenticated_sources(self):
        sql = MIGRATION.read_text(encoding="utf-8")
        self.assertNotIn("fec-api", sql)
        self.assertNotIn("florida-financial-disclosure", sql)
        self.assertNotIn("GOOGLE_CIVIC_API_KEY", sql)
        self.assertNotIn("FEC_API_KEY", sql)


if __name__ == "__main__":
    unittest.main()
