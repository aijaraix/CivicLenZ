import unittest

from bs4 import BeautifulSoup

from workers.enrichment.collect_identity_contact_candidates import (
    discover_contacts_and_links,
    discover_image_candidates,
    image_score,
)


class IdentityContactCandidateTests(unittest.TestCase):
    def test_prefers_named_official_portrait_over_logo(self) -> None:
        html = """
        <html><head>
          <meta property="og:image" content="/images/jane-example-official-portrait.jpg" />
        </head><body>
          <img src="/images/site-logo.png" alt="Agency logo" />
          <img src="/images/jane-example-headshot.jpg" alt="Representative Jane Example" />
        </body></html>
        """
        candidates = discover_image_candidates(BeautifulSoup(html, "lxml"), "https://example.gov/member", "Jane Example")
        self.assertGreaterEqual(len(candidates), 2)
        self.assertIn("jane-example", candidates[0].url)
        self.assertGreater(candidates[0].score, next(candidate.score for candidate in candidates if "logo" in candidate.url))

    def test_collects_contact_and_social_links(self) -> None:
        html = """
        <html><body>
          <a href="mailto:jane@example.gov">Email the office</a>
          <a href="tel:202-555-0123">Call</a>
          <a href="https://x.com/RepJaneExample">X</a>
          <a href="/contact">Contact form</a>
        </body></html>
        """
        contacts, socials, websites = discover_contacts_and_links(BeautifulSoup(html, "lxml"), "https://example.gov/member")
        self.assertTrue(any(item["type"] == "email" and item["value"] == "jane@example.gov" for item in contacts))
        self.assertTrue(any(item["type"] == "phone" for item in contacts))
        self.assertTrue(any(item["platform"] == "X" for item in socials))
        self.assertTrue(any(item["url"] == "https://example.gov/contact" for item in websites))

    def test_logo_terms_are_penalized(self) -> None:
        portrait = image_score("https://example.gov/jane-portrait.jpg", "Jane Example official portrait", "Jane Example", "img")
        logo = image_score("https://example.gov/site-logo.png", "Agency logo", "Jane Example", "img")
        self.assertGreater(portrait, logo)


if __name__ == "__main__":
    unittest.main()
