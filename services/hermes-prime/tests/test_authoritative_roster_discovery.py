"""Focused regression coverage for the Subject Factory origin contract."""
from __future__ import annotations

import json
from pathlib import Path
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import authoritative_roster_discovery as factory


CANONICAL_ORIGINS = {
    "CONTRACT_GAP",
    "MONITORING",
    "INCIDENT",
    "PRODUCER",
    "OPERATOR",
    "TEST",
}


class FakeDatabase:
    def __init__(self):
        self.cursor_state = FakeCursorState()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def cursor(self):
        return self.cursor_state


class FakeCursorState:
    def __init__(self):
        self.calls = []
        self.need_inserts = 0
        self.job_inserts = 0
        self.outstanding = 0
        self.result = None

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, sql, args=()):
        self.calls.append((sql, args))
        if "pg_try_advisory_xact_lock" in sql:
            self.result = (True,)
        elif "SELECT src.source_id" in sql:
            self.result = (
                "source-id",
                "https://www.miamidade.gov/elected-officials",
                "TIER_1_PRIMARY_OFFICIAL",
                "jurisdiction-id",
                "contract-id",
                1,
                "field-id",
            )
        elif "SELECT count(*) FROM public.jobs" in sql:
            self.result = (self.outstanding,)
        elif "INSERT INTO hermes_ops.research_needs" in sql:
            if self.need_inserts:
                self.result = None
            else:
                self.need_inserts += 1
                self.result = ("need-id",)
        elif "INSERT INTO public.jobs" in sql:
            self.job_inserts += 1
            self.outstanding = 1
            self.result = ("job-id",)
        else:
            self.result = None

    def fetchone(self):
        result = self.result
        self.result = None
        return result


class SubjectFactoryOriginTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()

    def reconcile(self):
        with patch.dict(
            os.environ,
            {
                "HERMES_AUTHORITATIVE_ROSTER_DISCOVERY": "true",
                "HERMES_AUTHORITATIVE_ROSTER_SOURCES": "miami-dade-county-elected-officials",
                "HERMES_AUTHORITATIVE_ROSTER_MAX_OUTSTANDING": "1",
            },
            clear=False,
        ), patch.object(factory, "connect_database", return_value=self.db):
            return factory.reconcile()

    def test_reconcile_uses_schema_permitted_monitoring_origin(self):
        result = self.reconcile()
        self.assertEqual(result["state"], "AUTHORITATIVE_ROSTER_WORK_CREATED")

        need_calls = [
            (sql, args)
            for sql, args in self.db.cursor_state.calls
            if "INSERT INTO hermes_ops.research_needs" in sql
        ]
        self.assertEqual(len(need_calls), 1)
        need_sql, need_args = need_calls[0]
        self.assertIn("AUTHORITATIVE_ROSTER_RETRIEVAL_READY", need_sql)
        self.assertEqual(need_args[5], factory.RESEARCH_NEED_ORIGIN)
        self.assertIn(need_args[5], CANONICAL_ORIGINS)
        self.assertEqual(factory.RESEARCH_NEED_ORIGIN, "MONITORING")

        job_calls = [
            (sql, args)
            for sql, args in self.db.cursor_state.calls
            if "INSERT INTO public.jobs" in sql
        ]
        self.assertEqual(len(job_calls), 1)
        payload = json.loads(job_calls[0][1][3])
        self.assertEqual(payload["execution_class"], "PRODUCTION")
        self.assertEqual(payload["orchestration_authority"], "hermes")
        self.assertEqual(payload["classification_ceiling"], "extracted_unreviewed")
        self.assertFalse(payload["verification_allowed"])
        self.assertFalse(payload["publication_allowed"])
        self.assertFalse(payload["identity_authority"])

        basis = json.loads(need_args[6])
        self.assertFalse(basis["truth_authority"])
        self.assertFalse(basis["publication_authority"])
        self.assertFalse(basis["identity_authority"])

        sql_text = "\n".join(sql for sql, _ in self.db.cursor_state.calls).lower()
        self.assertNotIn("insert into public.persons", sql_text)
        self.assertNotIn("insert into public.occupancies", sql_text)

    def test_repeated_reconcile_is_idempotent_and_no_invalid_origin_remains(self):
        first = self.reconcile()
        second = self.reconcile()
        self.assertEqual(first["created"], 1)
        self.assertEqual(second["created"], 0)
        self.assertEqual(self.db.cursor_state.need_inserts, 1)
        self.assertEqual(self.db.cursor_state.job_inserts, 1)

        source = Path(__file__).resolve().parents[1] / "authoritative_roster_discovery.py"
        source_text = source.read_text()
        self.assertNotIn('"DISCOVERY"', source_text)
        self.assertEqual(source_text.count("RESEARCH_NEED_ORIGIN"), 3)

    def test_schema_remains_bounded_and_generic_router_contract_is_untouched(self):
        migration = (
            Path(__file__).resolve().parents[3]
            / "supabase"
            / "migrations"
            / "20260914033000_hermes_needs_and_dependencies.sql"
        ).read_text()
        self.assertIn("origin IN ('CONTRACT_GAP','MONITORING','INCIDENT','PRODUCER','OPERATOR','TEST')", migration)
        self.assertNotIn("'DISCOVERY'", migration)

        router = (
            Path(__file__).resolve().parents[1] / "capability_router.py"
        ).read_text()
        self.assertIn("ALLOWED_NEED_ORIGINS", router)
        self.assertIn('"CONTRACT_GAP"', router)
        self.assertIn('"MONITORING"', router)


if __name__ == "__main__":
    unittest.main()
