from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from workers.ingestion.collect_miami_dade import (
    DEFAULT_OUTPUT,
    SOURCE_URL,
    ensure_staging_output,
    filename_for,
    parse_directory,
)
from workers.ingestion.common import write_json_records

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests" / "fixtures" / "miami_dade_elected_officials.html"


class MiamiDadeCollectorTests(unittest.TestCase):
    def test_parses_fixture_html_names_and_seats(self) -> None:
        content = FIXTURE.read_bytes()
        source_hash = hashlib.sha256(content).hexdigest()
        records = parse_directory(content, source_hash, "2026-09-02T00:00:00Z")

        names = [record["displayName"] for record in records]
        self.assertEqual(source_hash, hashlib.sha256(content).hexdigest())
        self.assertEqual(len(source_hash), 64)
        self.assertTrue(all(char in "0123456789abcdef" for char in source_hash))
        self.assertEqual(records[0]["sourceSnapshotSha256"], source_hash)
        self.assertEqual(records[0]["displayName"], "Daniella Levine Cava")
        self.assertEqual(records[0]["officeTitle"], "Mayor of Miami-Dade County")
        self.assertEqual(records[0]["termLabel"], "As of June 4, 2026")
        self.assertEqual(records[0]["sourceUrl"], SOURCE_URL)
        self.assertEqual(records[0]["extractionStatus"], "extracted_unreviewed")
        self.assertIsNone(records[0]["partyName"])
        self.assertIsNone(records[0]["phone"])

        commissioners = [record for record in records if record["districtNumber"]]
        self.assertEqual([record["districtNumber"] for record in commissioners], [str(n) for n in range(1, 14)])
        self.assertEqual(commissioners[0]["displayName"], "Oliver Gilbert")
        self.assertEqual(commissioners[4]["displayName"], "Vicki L. Lopez")
        self.assertEqual(commissioners[4]["electedOrAppointed"], "appointed")
        self.assertEqual(commissioners[12]["displayName"], "Rene Garcia")

        self.assertIn("Juan Fernandez-Barquin", names)
        self.assertIn('Rosanna "Rosie" Cordero-Stutz', names)
        self.assertIn("Alina Garcia", names)
        self.assertNotIn("Should Not Appear", names)
        self.assertNotIn("Bryan Avila", names)
        self.assertNotIn("Ron DeSantis", names)
        self.assertNotIn("Steve Gallon, III", names)
        self.assertNotIn("Lovey Clayton", names)
        self.assertNotIn("Vacant", names)
        self.assertEqual(len(records), 19)

    def test_hashes_fixture_bytes(self) -> None:
        content = FIXTURE.read_bytes()
        digest = hashlib.sha256(content).hexdigest()
        self.assertEqual(len(digest), 64)
        records = parse_directory(content, digest, "2026-09-02T00:00:00Z", minimum_records=14)
        self.assertTrue(records)
        self.assertEqual({record["sourceSnapshotSha256"] for record in records}, {digest})

    def test_skips_unparseable_and_vacant_rows(self) -> None:
        html = """
        <html><body><pre>
        As of January 1, 2026
        Mayor
        Example Mayor
        4 years
        2028
        11/21/2028
        Contact
        Board of County Commissioners District 01:
        One Commissioner
        4 years
        2028
        11/21/2028
        Contact
        Board of County Commissioners District 02:
        Vacant
        4 years
        2026
        11/17/2026
        ____
        Board of County Commissioners District 03:
        Three Commissioner
        4 years
        2028
        11/21/2028
        Contact
        </pre></body></html>
        """
        records = parse_directory(html.encode("utf-8"), "a" * 64, "2026-09-02T00:00:00Z", minimum_records=3)
        self.assertEqual([record["displayName"] for record in records], ["Example Mayor", "One Commissioner", "Three Commissioner"])
        self.assertEqual([record["districtNumber"] for record in records if record["districtNumber"]], ["1", "3"])

    def test_blocks_partial_directory(self) -> None:
        html = """
        <html><body><pre>
        Mayor
        Example Mayor
        Board of County Commissioners District 01:
        One Commissioner
        </pre></body></html>
        """
        with self.assertRaisesRegex(RuntimeError, "Extracted 2 Miami-Dade county officers"):
            parse_directory(html.encode("utf-8"), "a" * 64, "2026-09-02T00:00:00Z", minimum_records=14)

    def test_refuses_to_write_under_data_officials(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "must not write under data/officials"):
            ensure_staging_output(Path("data/officials/florida/local"))
        with self.assertRaisesRegex(RuntimeError, "must write only under data/staging"):
            ensure_staging_output(Path("data/officials-adjacent"))
        self.assertEqual(ensure_staging_output(DEFAULT_OUTPUT), DEFAULT_OUTPUT)

        content = FIXTURE.read_bytes()
        records = parse_directory(content, hashlib.sha256(content).hexdigest(), "2026-09-02T00:00:00Z")
        with tempfile.TemporaryDirectory() as tmp:
            forbidden = Path(tmp) / "data" / "officials"
            forbidden.mkdir(parents=True)
            from workers.ingestion import collect_miami_dade as module

            original_root = module.OFFICIALS_ROOT
            module.OFFICIALS_ROOT = forbidden
            try:
                with self.assertRaisesRegex(RuntimeError, "must not write under data/officials"):
                    ensure_staging_output(forbidden)
            finally:
                module.OFFICIALS_ROOT = original_root

            staging = Path(tmp) / "staging" / "miami-dade"
            written = write_json_records(records, staging, filename_for)
            self.assertEqual(written, 19)
            payload = json.loads((staging / "mayor-daniella-levine-cava.json").read_text())
            self.assertEqual(payload["displayName"], "Daniella Levine Cava")
            self.assertEqual(payload["extractionStatus"], "extracted_unreviewed")

    def test_manifest_registers_florida_baseline_collector(self) -> None:
        manifest = json.loads((ROOT / "data" / "sources" / "collector-manifest.json").read_text())
        registry = json.loads((ROOT / "data" / "sources" / "source-registry.json").read_text())
        collector = next(item for item in manifest["collectors"] if item["collectorKey"] == "miami-dade-county-baseline")
        source = next(item for item in registry["sources"] if item["sourceKey"] == "miami-dade-county-elected-officials")
        self.assertEqual(collector["group"], "florida")
        self.assertEqual(collector["phase"], "baseline")
        self.assertTrue(collector["enabled"])
        self.assertEqual(collector["outputDirectory"], "data/staging/florida/local/miami-dade")
        self.assertEqual(collector["expectedMinimum"], 14)
        self.assertEqual(source["url"], SOURCE_URL)
        self.assertTrue(source["reviewRequired"])


if __name__ == "__main__":
    unittest.main()
