import unittest

from workers.ingestion.collect_florida_senate import parse_directory


class FloridaSenateParserTests(unittest.TestCase):
    def test_parses_current_term_and_short_member_links(self) -> None:
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
        self.assertEqual(records[0].displayName, "Albritton, Ben")
        self.assertEqual(records[0].districtNumber, "27")
        self.assertEqual(
            records[0].sourceMemberUrl,
            "https://www.flsenate.gov/Senators/2024-2026/S27",
        )
        self.assertEqual(
            records[1].sourceMemberUrl,
            "https://www.flsenate.gov/Senators/S25",
        )

    def test_rejects_partial_or_changed_directory(self) -> None:
        html = """
        <html><body><h1>2024-2026 Senators</h1>
          <table><tr>
            <td><a href="/Senators/2024-2026/S27">Albritton, Ben</a></td>
            <td>27</td><td>Republican</td><td>Charlotte County</td>
          </tr></table>
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
          <table><tr>
            <td><a href="/Senators/2024-2026/S27">Albritton, Ben</a></td>
            <td>26</td><td>Republican</td><td>Charlotte County</td>
          </tr></table>
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
