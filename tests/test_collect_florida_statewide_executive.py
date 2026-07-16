import unittest

from workers.ingestion.collect_florida_statewide_executive import parse_office_source


class FloridaStatewideExecutiveCollectorTests(unittest.TestCase):
    def test_parses_verified_official_source(self) -> None:
        office = {
            "displayName": "Jane Example",
            "firstName": "Jane",
            "lastName": "Example",
            "officeTitle": "Example Officer of Florida",
            "sourceUrl": "https://example.gov/",
            "requiredPhrases": ("Example Officer Jane Example", "State of Florida"),
        }
        html = """
        <html><body>
          <h1>Example Officer Jane Example</h1>
          <footer>State of Florida</footer>
        </body></html>
        """

        record = parse_office_source(office, html, "a" * 64, "2026-07-16T00:00:00Z")

        self.assertEqual(record["displayName"], "Jane Example")
        self.assertEqual(record["officeTitle"], "Example Officer of Florida")
        self.assertEqual(record["stateCode"], "FL")
        self.assertEqual(record["extractionStatus"], "extracted_unreviewed")
        self.assertEqual(record["sourceSnapshotSha256"], "a" * 64)

    def test_blocks_source_when_officeholder_name_disappears(self) -> None:
        office = {
            "displayName": "Jane Example",
            "firstName": "Jane",
            "lastName": "Example",
            "officeTitle": "Example Officer of Florida",
            "sourceUrl": "https://example.gov/",
            "requiredPhrases": ("Example Officer Jane Example", "State of Florida"),
        }
        html = "<html><body><h1>Example Office</h1><footer>State of Florida</footer></body></html>"

        with self.assertRaisesRegex(RuntimeError, "Example Officer Jane Example"):
            parse_office_source(office, html, "a" * 64, "2026-07-16T00:00:00Z")


if __name__ == "__main__":
    unittest.main()
