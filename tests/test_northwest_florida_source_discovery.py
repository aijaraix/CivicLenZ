from __future__ import annotations

import unittest

from workers.ingestion.discover_northwest_florida_local_sources import (
    canonicalize_url,
    classify_link,
    dedupe_candidates,
    extract_page_links,
)


class NorthwestFloridaSourceDiscoveryTests(unittest.TestCase):
    def test_classifies_core_local_office_links(self):
        root_host = "examplecountyfl.gov"
        cases = [
            ("Board of County Commissioners", "https://examplecountyfl.gov/commissioners", "county_commission_directory"),
            ("Sheriff's Office", "https://sheriff.example.org/", "sheriff_directory"),
            ("Supervisor of Elections", "https://voteexample.gov/", "supervisor_of_elections_directory"),
            ("Property Appraiser", "https://examplepa.org/", "property_appraiser_directory"),
            ("School Board Members", "https://schools.example.org/board", "school_board_directory"),
            ("Campaign Finance Reports", "https://voteexample.gov/reports", "campaign_finance_and_candidate_filing_sources"),
        ]
        for label, url, expected in cases:
            with self.subTest(label=label):
                categories = {item.category for item in classify_link(label, url, root_host, "https://examplecountyfl.gov/")}
                self.assertIn(expected, categories)

    def test_extracts_external_constitutional_office_links(self):
        html = b"""
        <html><head><title>Example County Government</title></head><body>
          <a href="/government/commissioners">County Commissioners</a>
          <a href="https://examplevotes.gov/">Supervisor of Elections</a>
          <a href="https://examplesheriff.org/">Sheriff</a>
          <a href="/jobs">Employment Opportunities</a>
        </body></html>
        """
        title, candidates, crawl_urls = extract_page_links(html, "https://examplecountyfl.gov/", "examplecountyfl.gov")
        self.assertEqual(title, "Example County Government")
        categories = {item.category for item in candidates}
        self.assertIn("county_commission_directory", categories)
        self.assertIn("supervisor_of_elections_directory", categories)
        self.assertIn("sheriff_directory", categories)
        self.assertNotIn("https://examplecountyfl.gov/jobs", crawl_urls)

    def test_dedupes_same_url_using_best_score(self):
        candidates = classify_link(
            "County Commissioners",
            "https://examplecountyfl.gov/commissioners",
            "examplecountyfl.gov",
            "https://examplecountyfl.gov/",
        )
        candidates += classify_link(
            "Board of County Commissioners Directory",
            "https://examplecountyfl.gov/commissioners",
            "examplecountyfl.gov",
            "https://examplecountyfl.gov/government",
        )
        grouped = dedupe_candidates(candidates)
        self.assertEqual(len(grouped["county_commission_directory"]), 1)
        self.assertGreater(grouped["county_commission_directory"][0]["score"], 0)

    def test_canonicalizes_relative_url_and_removes_fragment(self):
        value = canonicalize_url("../government/commissioners#district1", "https://examplecountyfl.gov/departments/")
        self.assertEqual(value, "https://examplecountyfl.gov/government/commissioners")


if __name__ == "__main__":
    unittest.main()
