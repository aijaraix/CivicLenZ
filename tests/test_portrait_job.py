from __future__ import annotations

import json
import unittest
from pathlib import Path
from urllib.parse import urlparse

from workers.portraits.fetch_official_portraits import (
    candidate_image_urls,
    disallowed_url,
    load_canonical_officials,
)

ROOT = Path(__file__).resolve().parents[1]


class PortraitJobTests(unittest.TestCase):
    def test_search_engine_hosts_are_rejected(self) -> None:
        self.assertTrue(disallowed_url("https://www.google.com/imgres?imgurl=https://example.com/a.jpg"))
        self.assertTrue(disallowed_url("https://encrypted-tbn0.gstatic.com/images?q=x"))
        self.assertFalse(disallowed_url("https://www.flgov.com/wp-content/uploads/portrait.jpg"))

    def test_job_interface_does_not_special_case_a_person_name(self) -> None:
        source = Path("workers/portraits/fetch_official_portraits.py").read_text()
        self.assertNotIn("DeSantis", source)
        self.assertNotIn("desantis", source.lower())
        officials = load_canonical_officials()
        self.assertGreaterEqual(len(officials), 1)

    def test_persisted_jobs_cover_canonical_officials(self) -> None:
        officials = load_canonical_officials()
        job_dir = ROOT / "data" / "portraits" / "jobs"
        for official in officials:
            path = job_dir / f"{official['officialId']}.json"
            self.assertTrue(path.exists(), msg=str(path))
            payload = json.loads(path.read_text())
            self.assertEqual(payload["reviewStatus"], "unreviewed")
            self.assertIn(payload["status"], {"fetched_unreviewed", "CHECKED_NO_AUTHORITATIVE_RESULT"})
            self.assertTrue(payload["urlsTried"])
            self.assertFalse(any(disallowed_url(url) for url in payload["urlsTried"] if urlparse(url).netloc))
            if payload["status"] == "CHECKED_NO_AUTHORITATIVE_RESULT":
                self.assertIsNone(payload["imageUrl"])
                self.assertTrue(payload["failureReason"])
            else:
                self.assertTrue(payload["imageUrl"])
                self.assertEqual(len(payload["contentSha256"]), 64)
                self.assertTrue(all(char in "0123456789abcdef" for char in payload["contentSha256"]))

    def test_html_extractor_skips_google_thumbnails(self) -> None:
        html = """
        <html><head><meta property="og:image" content="https://encrypted-tbn0.gstatic.com/images?q=bad"></head>
        <body><img alt="Official portrait" src="/media/official.jpg"></body></html>
        """
        urls = candidate_image_urls("https://www.flgov.com/", html)
        self.assertEqual(urls, ["https://www.flgov.com/media/official.jpg"])


if __name__ == "__main__":
    unittest.main()
