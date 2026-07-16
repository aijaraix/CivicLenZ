import unittest

from workers.ingestion.collect_florida_house import parse_directory


class FloridaHouseCollectorTests(unittest.TestCase):
    def test_parses_current_members_and_skips_former_term_entries(self) -> None:
        html = """
        <html><head><title>Representatives for 2024 - 2026</title></head><body>
          <a href="/Sections/Representatives/details.aspx?MemberId=4763&LegislativeTermId=91">
            Salzman, Michelle Republican — District: 1 Part of Escambia 11/06/24 - 11/03/26
          </a>
          <a href="/Sections/Representatives/details.aspx?MemberId=4710&LegislativeTermId=91">
            Andrade, Robert Alexander "Alex" Republican — District: 2 Parts of Escambia, Santa Rosa 11/06/24 - 11/03/26
          </a>
          <a href="/Sections/Representatives/details.aspx?MemberId=4861&LegislativeTermId=91">
            Rudman, Dr. Joel Republican — District: 3 11/06/24 - 01/01/25 (Resigned)
          </a>
        </body></html>
        """
        records = parse_directory(html, "a" * 64, "2026-07-16T00:00:00Z", minimum_records=2)
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0]["displayName"], "Salzman, Michelle")
        self.assertEqual(records[0]["districtNumber"], "1")
        self.assertEqual(records[0]["partyName"], "Republican")
        self.assertEqual(records[0]["countyDescription"], "Part of Escambia")
        self.assertEqual(records[0]["externalMemberId"], "4763")
        self.assertEqual(records[1]["countyDescription"], "Parts of Escambia, Santa Rosa")

    def test_blocks_duplicate_current_district(self) -> None:
        html = """
        <a href="/Sections/Representatives/details.aspx?MemberId=1&LegislativeTermId=91">
          One, Member Republican — District: 1 Part of Escambia 11/06/24 - 11/03/26
        </a>
        <a href="/Sections/Representatives/details.aspx?MemberId=2&LegislativeTermId=91">
          Two, Member Democrat — District: 1 Part of Escambia 11/06/24 - 11/03/26
        </a>
        """
        with self.assertRaisesRegex(RuntimeError, "Duplicate current Florida House district 1"):
            parse_directory(html, "a" * 64, "2026-07-16T00:00:00Z", minimum_records=1)

    def test_blocks_partial_directory(self) -> None:
        html = """
        <a href="/Sections/Representatives/details.aspx?MemberId=1&LegislativeTermId=91">
          One, Member Republican — District: 1 Part of Escambia 11/06/24 - 11/03/26
        </a>
        """
        with self.assertRaisesRegex(RuntimeError, "Extracted 1 current Florida House seats"):
            parse_directory(html, "a" * 64, "2026-07-16T00:00:00Z", minimum_records=115)


if __name__ == "__main__":
    unittest.main()
