from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[3]


class AcademySchemaTests(unittest.TestCase):
    def test_private_fail_closed_academy_schema(self):
        sql=(ROOT/'supabase/migrations/20260917050000_hermes_monitoring_academy.sql').read_text()
        self.assertIn('CREATE TABLE hermes_ops.academy_observations',sql)
        self.assertIn('CREATE TABLE hermes_ops.academy_cases',sql)
        self.assertIn('CREATE TABLE hermes_ops.academy_evaluations',sql)
        self.assertIn("CHECK (NOT civic_truth_mutation_allowed)",sql)
        self.assertIn("CHECK (NOT publication_authority)",sql)
        self.assertIn("promotion_state='PENDING_REVIEW'",sql)
        self.assertIn('REVOKE ALL',sql)

    def test_runtime_upsert_cannot_update_promotion_decision(self):
        source=(ROOT/'services/hermes-prime/academy.py').read_text()
        self.assertIn('promotion_state,post_promotion_monitoring',source)
        self.assertNotIn('promotion_state=excluded.promotion_state',source)
        self.assertIn('post_promotion_monitoring=excluded.post_promotion_monitoring',source)

    def test_supported_discovery_preserves_authority_and_dedupe(self):
        source=(ROOT/'services/hermes-prime/supported_discovery.py').read_text()
        self.assertIn('research_work_identity',source)
        self.assertIn('ON CONFLICT(dedupe_key) DO NOTHING',source)
        self.assertIn('publication_allowed',source)
        self.assertIn("'MONITORING','PRODUCTION'",source)
        self.assertNotIn('verified_claim',source)


if __name__=='__main__': unittest.main()
