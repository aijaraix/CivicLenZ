from __future__ import annotations

import unittest
from pathlib import Path

from scripts.validate_collection_job_manifest import validate_paths


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures" / "collection-job-manifests"


class CollectionJobManifestTests(unittest.TestCase):
    def test_valid_permanent_seat_manifest_passes(self) -> None:
        errors = validate_paths([FIXTURES / "valid-florida-house-seat.json"])
        self.assertEqual(errors, [])

    def test_publication_boundary_is_rejected(self) -> None:
        errors = validate_paths([FIXTURES / "invalid-public-boundary.json"])
        self.assertTrue(any("publicationAllowed must be false" in error for error in errors))
        self.assertTrue(any("reviewStatus must be unreviewed" in error for error in errors))

    def test_wildcard_batch_is_rejected(self) -> None:
        errors = validate_paths([FIXTURES / "invalid-wildcard-batch.json"])
        self.assertTrue(any("memberSeatKeys[0] has an invalid format" in error for error in errors))

    def test_overlapping_explicit_batch_is_rejected(self) -> None:
        errors = validate_paths(
            [
                FIXTURES / "valid-florida-house-seat.json",
                FIXTURES / "valid-overlapping-batch.json",
            ]
        )
        self.assertTrue(any("target overlaps an existing job" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
