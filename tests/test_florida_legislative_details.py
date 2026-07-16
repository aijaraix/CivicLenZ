import unittest

from bs4 import BeautifulSoup

from workers.enrichment.collect_florida_legislative_details import parse_house_detail, parse_senate_detail


class FloridaLegislativeDetailTests(unittest.TestCase):
    def test_parses_house_profile_sections(self) -> None:
        html = """
        <html><head><meta property="og:image" content="/photos/rob-long-official-portrait.jpg"></head><body>
          <h1>Rob Long</h1>
          <h2>District: 90 -- Democrat</h2>
          <p>Legislative Aide: Christi Fearnley</p>
          <p>District Aide: Brian Bees</p>
          <h2>Current Committee Assignments</h2>
          <ul><li>Health & Human Services Committee</li><li>Education Administration Subcommittee</li></ul>
          <h2>Biographical Information</h2>
          <p>City of Residence: Delray Beach</p>
          <p>Occupation: Engineer</p>
          <p>Education: Penn State University, BS, Civil Engineering; University of Florida, MBA</p>
          <p>Born: January 13, 1985, Gaithersburg, MD</p>
          <h2>Other Public Services</h2><ul><li>Delray Beach City Commission, Vice Mayor, 2023-2025</li></ul>
          <h2>Affiliations</h2><ul><li>American Society of Civil Engineers</li></ul>
          <h2>Highlights</h2><ul><li>Early Career Award, 2025</li></ul>
          <a href="mailto:rob@example.gov">Email</a><a href="/contact">Contact Member</a>
          <a href="/district-map.pdf">Detailed District Map</a><a href="/bills">Sponsored Bills</a>
        </body></html>
        """
        details = parse_house_detail(BeautifulSoup(html, "lxml"), "https://www.flhouse.gov/member", {"displayName": "Rob Long"})
        self.assertEqual(details["biographyCandidates"]["cityOfResidence"], "Delray Beach")
        self.assertEqual(len(details["educationCandidates"]), 2)
        self.assertTrue(any(item["name"] == "Health & Human Services Committee" for item in details["committeeCandidates"]))
        self.assertTrue(any(item["role"] == "Legislative Aide" and item["name"] == "Christi Fearnley" for item in details["staffCandidates"]))
        self.assertTrue(details["portraitCandidates"])
        self.assertTrue(details["mapLinks"])

    def test_parses_senate_contact_bio_and_service(self) -> None:
        html = """
        <html><head><meta property="og:image" content="/Senators/Photos/S27.jpg"></head><body>
          <h1>Senator Ben Albritton</h1>
          <p>Party: Republican</p>
          <h4>District Office</h4><address>150 North Central Avenue<br>Bartow, FL 33830<br>(863) 534-0073</address>
          <h5>Legislative Aides</h5><p>Patty Harrison, Kara Lucas, and Karen Whaley</p>
          <h4>Tallahassee Office</h4><address>409 The Capitol<br>Tallahassee, FL 32399<br>(850) 487-5027</address>
          <h3>Legislative Service</h3><ul><li>Elected to the Senate in 2018</li><li>House of Representatives, 2010-2018</li></ul>
          <h3>Other Public Service</h3><ul><li>Florida Citrus Commission, Chair</li></ul>
          <h3>Honors and Awards</h3><ul><li>Champion of Agriculture, 2018</li></ul>
          <h3>Affiliations</h3><ul><li>First Christian Church</li></ul>
          <h3>Biographical Information</h3>
          <p>Occupation: Agribusiness Owner</p><p>Spouse: Missy Albritton</p><p>Born: in Lakeland, Florida</p>
          <h4>Education</h4><ul><li>Florida Southern College, B.S., Business/Citrus, 1990</li></ul>
          <a href="mailto:albritton.ben.web@flsenate.gov">Email this Senator</a>
          <a href="/Senators/S27/District">District Map</a><a href="/Senators/S27/Bills">Bills Introduced</a>
        </body></html>
        """
        details = parse_senate_detail(BeautifulSoup(html, "lxml"), "https://www.flsenate.gov/Senators/S27", {"displayName": "Ben Albritton"})
        self.assertEqual(details["biographyCandidates"]["occupation"], "Agribusiness Owner")
        self.assertTrue(any(item["name"] == "Patty Harrison" for item in details["staffCandidates"]))
        self.assertEqual(len(details["officeLocationCandidates"]), 2)
        self.assertTrue(details["legislativeServiceCandidates"])
        self.assertTrue(details["educationCandidates"])
        self.assertTrue(details["portraitCandidates"])


if __name__ == "__main__":
    unittest.main()
