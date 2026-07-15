import unittest

from workers.ingestion.collect_florida_senate import parse_directory


class FloridaSenateParserTests(unittest.TestCase):
    def test_parses_table_markup_and_both_member_link_forms(self) -> None:
        html = """
        <html><body>
          <h1>2024-2026 Senators</h1>
          <table>
            <tr><th>Senator</th><th>District</th><th>Party</th><th>Counties</th><th>Tracker</th></tr>
            <tr>
              <td><a href="/Senators/2024-2026/S27">Albritton, Ben</a><span>President</span></td>
              <td>27</td><td>Republican</td>
              <td>Consists of Charlotte, DeSoto, Hardee counties and parts of Lee, Polk counties</td>
              <td></td>
            </tr>
            <tr>
              <td><a href="/Senators/S25">Arrington, Kristen Aston</a></td>
              <td>25</td><td>Democrat</td>
              <td>Consists of Osceola county and part of Orange county</td>
              <td></td>
            </tr>
          </table>
        </body></html>
        """

        records = parse_directory(
            html,
            source_hash="example-hash",
            fetched_at="2026-07-15T23:36:25Z",
            minimum_records=2,
        )

        self.assertEqual(len(records), 2)
        self.assertEqual(records[0].displayName, "Arrington, Kristen Aston")
        self.assertEqual(records[0].districtNumber, "25")
        self.assertEqual(records[1].displayName, "Albritton, Ben")
        self.assertEqual(
            records[1].sourceMemberUrl,
            "https://www.flsenate.gov/Senators/2024-2026/S27",
        )

    def test_parses_responsive_non_table_markup(self) -> None:
        html = """
        <html><head><title>Senators - The Florida Senate</title></head><body>
          <h1>2024-2026 Senators</h1>
          <div class="member-card">
            <a href="https://www.flsenate.gov/Senators/2024-2026/S27">Albritton, Ben</a>
            <span>President</span><span>27</span><span>Republican</span>
            <p>Consists of Charlotte, DeSoto, Hardee counties and parts of Lee, Polk counties</p>
          </div>
          <div class="member-card">
            <a href="/Senators/2024-2026/S25">Arrington, Kristen Aston</a>
            <span>25</span><span>Democrat</span>
            <p>Consists of Osceola county and part of Orange county</p>
          </div>
          <h2>Former Senators in this Term</h2>
          <div><a href="/Senators/2024-2026/S14">Former, Senator</a>District 14, Republican, Resigned</div>
        </body></html>
        """

        records = parse_directory(
            html,
            source_hash="example-hash",
            fetched_at="2026-07-15T23:36:25Z",
            minimum_records=2,
        )

        self.assertEqual([record.districtNumber for record in records], ["25", "27"])
        self.assertEqual(records[0].partyName, "Democrat")
        self.assertEqual(
            records[1].countyDescription,
            "Consists of Charlotte, DeSoto, Hardee counties and parts of Lee, Polk counties",
        )

    def test_rejects_partial_or_changed_directory(self) -> None:
        html = """
        <html><body><h1>2024-2026 Senators</h1>
          <div>
            <a href="/Senators/2024-2026/S27">Albritton, Ben</a>
            <span>27 Republican</span>
            <p>Consists of Charlotte County</p>
          </div>
        </body></html>
        """

        with self.assertRaisesRegex(RuntimeError, "Only extracted 1 senators"):
            parse_directory(
                html,
                source_hash="example-hash",
                fetched_at="2026-07-15T23:36:25Z",
                minimum_records=30,
            )

    def test_rejects_visible_and_linked_district_mismatch(self) -> None:
        html = """
        <html><body><h1>2024-2026 Senators</h1>
          <div>
            <a href="/Senators/2024-2026/S27">Albritton, Ben</a>
            <span>26 Republican</span>
            <p>Consists of Charlotte County</p>
          </div>
        </body></html>
        """

        with self.assertRaisesRegex(RuntimeError, "District mismatch"):
            parse_directory(
                html,
                source_hash="example-hash",
                fetched_at="2026-07-15T23:36:25Z",
                minimum_records=1,
            )


if __name__ == "__main__":
    unittest.main()
