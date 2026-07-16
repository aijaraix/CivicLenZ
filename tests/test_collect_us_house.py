import unittest

from workers.ingestion.collect_us_house import parse_directory


class UnitedStatesHouseCollectorTests(unittest.TestCase):
    def test_parses_members_delegate_and_vacancy(self) -> None:
        html = """
        <html><body><table>
          <tr><th colspan="6">Florida</th></tr>
          <tr><td>1st</td><td><a href="https://patronis.house.gov">Patronis, Jimmy</a></td><td>R</td><td>2021 RHOB</td><td>(202) 225-4136</td><td>Transportation|Small Business</td></tr>
          <tr><td>20th</td><td><a href="https://clerk.house.gov">Cherfilus-McCormick, Sheila - Vacancy</a></td><td>D</td><td>2442 RHOB</td><td>(202) 225-1313</td><td></td></tr>
          <tr><th colspan="6">District of Columbia</th></tr>
          <tr><td>Delegate</td><td><a href="https://norton.house.gov">Norton, Eleanor</a></td><td>D</td><td>2136 RHOB</td><td>(202) 225-8050</td><td>Oversight|Transportation</td></tr>
        </table></body></html>
        """
        records = parse_directory(html, "b" * 64, "2026-07-16T00:00:00Z", minimum_records=3)
        self.assertEqual(len(records), 3)
        self.assertEqual(records[0]["stateCode"], "DC")
        florida = [record for record in records if record["stateCode"] == "FL"]
        self.assertEqual(len(florida), 2)
        member = next(record for record in florida if record["recordKind"] == "person_officeholder")
        vacancy = next(record for record in florida if record["recordKind"] == "office_vacancy")
        self.assertEqual(member["districtNumber"], "1")
        self.assertEqual(member["committeeAssignments"], ["Transportation", "Small Business"])
        self.assertEqual(vacancy["formerMemberName"], "Cherfilus-McCormick, Sheila")
        self.assertEqual(vacancy["canonicalMatchStatus"], "vacancy")

    def test_blocks_duplicate_seat(self) -> None:
        html = """
        <table><tr><th>Florida</th></tr>
          <tr><td>1st</td><td><a href="https://one.house.gov">One, Member</a></td><td>R</td></tr>
          <tr><td>1st</td><td><a href="https://two.house.gov">Two, Member</a></td><td>D</td></tr>
        </table>
        """
        with self.assertRaisesRegex(RuntimeError, "Duplicate House seat"):
            parse_directory(html, "b" * 64, "2026-07-16T00:00:00Z", minimum_records=1)


if __name__ == "__main__":
    unittest.main()
