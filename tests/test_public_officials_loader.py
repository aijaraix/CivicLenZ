from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OFFICIALS_LOADER = ROOT / "lib" / "officials.ts"
PUBLIC_PAGES = (
    ROOT / "app" / "officials" / "page.tsx",
    ROOT / "app" / "officials" / "[slug]" / "page.tsx",
    ROOT / "components" / "official-directory.tsx",
)
STAGING_ROOT = ROOT / "data" / "staging"
CANONICAL_ROOT = ROOT / "data" / "officials"


def function_source(path: Path, name: str) -> str:
    text = path.read_text(encoding="utf-8")
    match = re.search(rf"export function {re.escape(name)}\s*\([^)]*\)[^{{]*{{", text)
    if not match:
        raise AssertionError(f"{path} does not export {name}")
    start = match.start()
    brace_start = text.find("{", match.end() - 1)
    depth = 0
    for index in range(brace_start, len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                return text[start : index + 1]
    raise AssertionError(f"Could not bound {name} in {path}")


class PublicOfficialsLoaderTests(unittest.TestCase):
    def test_public_loader_does_not_read_staging(self) -> None:
        public_loader = function_source(OFFICIALS_LOADER, "getAllOfficials")
        slug_loader = function_source(OFFICIALS_LOADER, "getOfficialBySlug")
        source = OFFICIALS_LOADER.read_text(encoding="utf-8")

        self.assertRegex(
            source,
            r"path\.join\(process\.cwd\(\),\s*'data',\s*'officials'\)",
        )
        self.assertIn("loadCanonicalOfficials", public_loader)
        self.assertNotIn("reviewStagingRoots", public_loader)
        self.assertNotIn("baselineRoots", public_loader)
        self.assertNotIn("getStagingRecordsForReview", public_loader)
        self.assertNotRegex(public_loader, r"['\"]staging['\"]")
        self.assertIn("getAllOfficials()", slug_loader)
        self.assertNotIn("getStagingRecordsForReview", slug_loader)

    def test_public_pages_do_not_import_staging_review_loader(self) -> None:
        for path in PUBLIC_PAGES:
            text = path.read_text(encoding="utf-8")
            self.assertNotIn("getStagingRecordsForReview", text, msg=path)
            self.assertNotIn("data/staging", text, msg=path)

    def test_staging_only_names_are_not_canonical_public_records(self) -> None:
        canonical_names = {
            json.loads(path.read_text(encoding="utf-8")).get("person", {}).get("displayName")
            for path in CANONICAL_ROOT.rglob("*.json")
        }
        self.assertIn("Ron DeSantis", canonical_names)

        leaked: list[str] = []
        for path in STAGING_ROOT.rglob("*.json"):
            if "source-discovery" in path.parts:
                continue
            record = json.loads(path.read_text(encoding="utf-8"))
            name = record.get("displayName")
            if not name or name in canonical_names:
                continue
            leaked.append(name)
            self.assertNotEqual(
                record.get("extractionStatus"),
                "published",
                msg=f"{path} staging record is marked published",
            )

        self.assertGreater(len(leaked), 0, "expected existing staging records to prove the leak would be visible")
        public_loader = function_source(OFFICIALS_LOADER, "getAllOfficials")
        self.assertNotRegex(public_loader, r"['\"]staging['\"]")
        self.assertIn("loadCanonicalOfficials", public_loader)


if __name__ == "__main__":
    unittest.main()
