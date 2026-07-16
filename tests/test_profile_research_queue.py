import unittest

from workers.enrichment.build_profile_research_queue import RESEARCH_SECTIONS, build_queue, slugify


class ProfileResearchQueueTests(unittest.TestCase):
    def test_slugify_is_stable(self) -> None:
        self.assertEqual(slugify("Florida State House, District 90"), "florida-state-house-district-90")

    def test_standard_card_has_all_required_sections(self) -> None:
        self.assertGreaterEqual(len(RESEARCH_SECTIONS), 20)
        self.assertIn("campaign_promises", RESEARCH_SECTIONS)
        self.assertIn("maha_tracker", RESEARCH_SECTIONS)
        self.assertIn("doge_government_efficiency_tracker", RESEARCH_SECTIONS)
        self.assertIn("financial_disclosures", RESEARCH_SECTIONS)
        self.assertIn("sources_archives_methodology", RESEARCH_SECTIONS)

    def test_current_repository_builds_a_florida_queue(self) -> None:
        queue = build_queue()
        self.assertGreaterEqual(queue["taskCount"], 160)
        self.assertEqual(queue["requiredSectionCountPerSeat"], len(RESEARCH_SECTIONS))
        self.assertTrue(all(task["sections"] for task in queue["tasks"]))
        self.assertTrue(all(task["seatKey"].startswith("fl-") for task in queue["tasks"]))


if __name__ == "__main__":
    unittest.main()
