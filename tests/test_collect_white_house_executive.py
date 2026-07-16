import unittest

from workers.ingestion.collect_white_house_executive import parse_administration


class WhiteHouseExecutiveCollectorTests(unittest.TestCase):
    def test_parses_president_and_vice_president(self) -> None:
        html = """
        <html><body><main>
          <h2><a href="/administration/president-example/">President Jane Example</a></h2>
          <p>President of the United States</p>
          <h2><a href="/administration/vice-president-example/">Vice President John Example</a></h2>
          <p>Vice President of the United States</p>
        </main></body></html>
        """
        records = parse_administration(html, "c" * 64, "2026-07-16T00:00:00Z")
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0]["displayName"], "Jane Example")
        self.assertEqual(records[0]["officeTitle"], "President of the United States")
        self.assertEqual(records[1]["displayName"], "John Example")
        self.assertEqual(records[1]["sourceMemberUrl"], "https://www.whitehouse.gov/administration/vice-president-example/")

    def test_blocks_missing_required_office(self) -> None:
        html = "<html><body><h2>President Jane Example</h2></body></html>"
        with self.assertRaisesRegex(RuntimeError, "Vice President"):
            parse_administration(html, "c" * 64, "2026-07-16T00:00:00Z")


if __name__ == "__main__":
    unittest.main()
