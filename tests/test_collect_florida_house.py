import unittest

from workers.ingestion.collect_florida_house import parse_directory


class FloridaHouseCollectorTests(unittest.TestCase):
    def test_parses_member_cards_and_vacancy(self) -> None:
        html = """
        <html><head><title>Florida House Members</title></head><body>
          <div class="representative-card">
            <a href="/Representatives/Details?MemberId=1001&LegislativeTermId=91">Salzman, Michelle</a>
            <div>District 1</div><div>Republican</div><div>Counties Represented: Part of Escambia</div>
          </div>
          <div class="representative-card">
            <a href="/Representatives/Details?MemberId=1002&LegislativeTermId=91">Andrade, Alex</a>
            <div>District 2</div><div>Republican</div><div>Representing Parts of Escambia and Santa Rosa</div>
          </div>
          <div class="representative-card">
            <a href="/Representatives/Details?MemberId=0&LegislativeTermId=91">Vacant</a>
            <div>District 3</div><div>Counties: Parts of Santa Rosa and Okaloosa</div>
          </div>
        </body></html>
        """
        records = parse_directory(html, "a" * 64, "2026-07-16T00:00:00Z", minimum_records=3)
        self.assertEqual(len(records), 3)
        self.assertEqual(records[0]["districtNumber"], "1")
        self.assertEqual(records[0]["partyName"], "Republican")
        self.assertEqual(records[0]["externalMemberId"], "1001")
        self.assertEqual(records[1]["countyDescription"], "Parts of Escambia and Santa Rosa")
        self.assertEqual(records[2]["recordKind"], "office_vacancy")
        self.assertEqual(records[2]["canonicalMatchStatus"], "vacancy")

    def test_blocks_duplicate_district(self) -> None:
        html = """
        <div class="member-card"><a href="/Representatives/Details?MemberId=1">One, Member</a>District 1 Republican</div>
        <div class="member-card"><a href="/Representatives/Details?MemberId=2">Two, Member</a>District 1 Democrat</div>
        """
        with self.assertRaisesRegex(RuntimeError, "Duplicate Florida House district 1"):
            parse_directory(html, "a" * 64, "2026-07-16T00:00:00Z", minimum_records=1)

    def test_blocks_partial_directory(self) -> None:
        html = """
        <div class="member-card"><a href="/Representatives/Details?MemberId=1">One, Member</a>District 1 Republican</div>
        """
        with self.assertRaisesRegex(RuntimeError, "Extracted 1 Florida House seats"):
            parse_directory(html, "a" * 64, "2026-07-16T00:00:00Z", minimum_records=115)


if __name__ == "__main__":
    unittest.main()
