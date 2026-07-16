import unittest

from workers.ingestion.collect_us_senate import parse_directory


class UnitedStatesSenateCollectorTests(unittest.TestCase):
    def test_parses_official_xml_shape(self) -> None:
        xml = b"""
        <contact_information>
          <member>
            <member_full>Doe, Jane</member_full>
            <last_name>Doe</last_name><first_name>Jane</first_name>
            <party>D</party><state>FL</state><class>Class I</class>
            <address>123 Senate Office Building Washington DC 20510</address>
            <phone>(202) 224-0000</phone><email>jane@example.senate.gov</email>
            <website>https://www.example.senate.gov/</website>
            <bioguide_id>D000001</bioguide_id>
          </member>
          <member>
            <member_full>Smith, John</member_full>
            <last_name>Smith</last_name><first_name>John</first_name>
            <party>R</party><state>GA</state><class>Class II</class>
            <website>https://www.smith.senate.gov/</website>
            <bioguide_id>S000001</bioguide_id>
          </member>
        </contact_information>
        """
        records = parse_directory(xml, "a" * 64, "2026-07-16T00:00:00Z", minimum_records=2)
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0]["stateCode"], "FL")
        self.assertEqual(records[0]["partyName"], "Democratic")
        self.assertEqual(records[0]["bioguideId"], "D000001")
        self.assertEqual(records[1]["officeTitle"], "United States Senator")

    def test_blocks_partial_directory(self) -> None:
        xml = b"<contact_information><member><member_full>Doe, Jane</member_full><state>FL</state></member></contact_information>"
        with self.assertRaisesRegex(RuntimeError, "Extracted 1 Senate members"):
            parse_directory(xml, "a" * 64, "2026-07-16T00:00:00Z", minimum_records=95)


if __name__ == "__main__":
    unittest.main()
