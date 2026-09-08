from __future__ import annotations

import csv
import json
import sqlite3
import tempfile
import unittest
import zipfile
from pathlib import Path

from scripts.inventory_legacy_official_datasets import build_report, inspect_path


class LegacyDatasetInventoryTests(unittest.TestCase):
    def test_counts_official_like_csv(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "officials.csv"
            with path.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(
                    handle,
                    fieldnames=["name", "office", "county", "state", "source_url"],
                )
                writer.writeheader()
                writer.writerow(
                    {
                        "name": "Alex Example",
                        "office": "County Commissioner",
                        "county": "Example",
                        "state": "FL",
                        "source_url": "https://example.gov",
                    }
                )
                writer.writerow(
                    {
                        "name": "Jordan Example",
                        "office": "Sheriff",
                        "county": "Example",
                        "state": "FL",
                        "source_url": "https://example.gov/sheriff",
                    }
                )

            result = inspect_path(path).to_json()
            self.assertEqual(result["probableRecords"], 2)
            self.assertTrue(result["appearsOfficialLike"])
            self.assertIn("identity", result["matchedOfficialColumnGroups"])
            self.assertIn("office", result["matchedOfficialColumnGroups"])

    def test_counts_nested_json_records(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "officials.json"
            path.write_text(
                json.dumps(
                    {
                        "officials": [
                            {"full_name": "A", "office_title": "Mayor", "city": "One"},
                            {"full_name": "B", "office_title": "Council", "city": "Two"},
                            {"full_name": "C", "office_title": "Council", "city": "Two"},
                        ]
                    }
                ),
                encoding="utf-8",
            )
            result = inspect_path(path).to_json()
            self.assertEqual(result["probableRecords"], 3)
            self.assertTrue(result["appearsOfficialLike"])

    def test_counts_json_lines(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "officials.ndjson"
            path.write_text(
                "\n".join(
                    [
                        json.dumps({"name": "A", "seat": "1", "jurisdiction": "X"}),
                        json.dumps({"name": "B", "seat": "2", "jurisdiction": "X"}),
                    ]
                )
                + "\n",
                encoding="utf-8",
            )
            result = inspect_path(path).to_json()
            self.assertEqual(result["probableRecords"], 2)

    def test_counts_sqlite_tables(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "officials.sqlite"
            connection = sqlite3.connect(path)
            connection.execute(
                "CREATE TABLE officials (name TEXT, office TEXT, jurisdiction TEXT)"
            )
            connection.executemany(
                "INSERT INTO officials VALUES (?, ?, ?)",
                [
                    ("A", "Mayor", "One"),
                    ("B", "Council", "One"),
                    ("C", "Sheriff", "Two"),
                    ("D", "Clerk", "Two"),
                ],
            )
            connection.commit()
            connection.close()

            result = inspect_path(path).to_json()
            self.assertEqual(result["probableRecords"], 4)
            self.assertEqual(result["tables"]["officials"], 4)

    def test_counts_supported_members_in_zip(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "officials.zip"
            with zipfile.ZipFile(path, "w") as archive:
                archive.writestr(
                    "officials.csv",
                    "name,office,state\nA,Mayor,FL\nB,Council,FL\n",
                )
                archive.writestr(
                    "more.ndjson",
                    json.dumps({"name": "C", "office": "Sheriff", "state": "FL"})
                    + "\n",
                )
            result = inspect_path(path).to_json()
            self.assertEqual(result["probableRecords"], 3)
            self.assertEqual(len(result["nestedFiles"]), 2)

    def test_build_report_sums_files_without_claiming_unique_people(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "one.json").write_text(
                json.dumps([{"name": "A", "office": "Mayor", "city": "One"}]),
                encoding="utf-8",
            )
            (root / "two.csv").write_text(
                "name,office,city\nB,Council,Two\nC,Council,Two\n",
                encoding="utf-8",
            )
            report = build_report(root)
            self.assertEqual(report["fileCount"], 2)
            self.assertEqual(report["probableRecordTotal"], 3)
            self.assertFalse(report["publicationAllowed"])


if __name__ == "__main__":
    unittest.main()
