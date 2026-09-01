from __future__ import annotations

import json
import re
import subprocess
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
RUNTIME_ASSERT = ROOT / "tests" / "assert_public_officials_listing.ts"

# Confirmed on https://www.civicslenz.com/officials/ (2026-09-02): these
# unreviewed staging records were rendered as public "Baseline record" cards.
LIVE_SITE_STAGING_LEAKS = (
    {
        "path": STAGING_ROOT / "federal" / "us-senate" / "fl-scott-r-fl.json",
        "displayName": "Rick Scott",
        "slug": "rick-scott-united-states-senator",
        "phone": "(202) 224-5274",
        "officeAddressFragment": "110 Hart Senate Office Building",
        "sourceKey": "us-senate-members",
    },
    {
        "path": STAGING_ROOT / "federal" / "us-senate" / "fl-moody-r-fl.json",
        "displayName": "Ashley Moody",
        "slug": "ashley-moody-united-states-senator",
        "phone": "(202) 224-3041",
        "officeAddressFragment": "387 Russell Senate Office Building",
        "sourceKey": "us-senate-members",
    },
    {
        "path": STAGING_ROOT / "federal" / "us-house" / "fl-4-bean-aaron.json",
        "displayName": "Aaron Bean",
        "slug": "aaron-bean-united-states-representative",
        "sourceKey": "us-house-members",
    },
    {
        "path": STAGING_ROOT / "federal" / "us-house" / "fl-13-luna-anna-paulina.json",
        "displayName": "Anna Paulina Luna",
        "slug": "anna-paulina-luna-united-states-representative",
        "sourceKey": "us-house-members",
    },
)


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


def canonical_names() -> set[str]:
    names: set[str] = set()
    for path in CANONICAL_ROOT.rglob("*.json"):
        payload = json.loads(path.read_text(encoding="utf-8"))
        name = payload.get("person", {}).get("displayName")
        if name:
            names.add(name)
    return names


class PublicOfficialsLoaderTests(unittest.TestCase):
    def test_public_loader_does_not_read_staging(self) -> None:
        public_loader = function_source(OFFICIALS_LOADER, "getAllOfficials")
        slug_loader = function_source(OFFICIALS_LOADER, "getOfficialBySlug")
        static_params = (ROOT / "app" / "officials" / "[slug]" / "page.tsx").read_text(encoding="utf-8")
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
        self.assertIn("getAllOfficials()", static_params)
        self.assertNotIn("getStagingRecordsForReview", static_params)

    def test_public_pages_do_not_import_staging_review_loader(self) -> None:
        for path in PUBLIC_PAGES:
            text = path.read_text(encoding="utf-8")
            self.assertNotIn("getStagingRecordsForReview", text, msg=path)
            self.assertNotIn("data/staging", text, msg=path)

    def test_live_site_staging_examples_are_not_canonical(self) -> None:
        reviewed = canonical_names()
        self.assertIn("Ron DeSantis", reviewed)

        for example in LIVE_SITE_STAGING_LEAKS:
            with self.subTest(name=example["displayName"]):
                payload = json.loads(example["path"].read_text(encoding="utf-8"))
                self.assertEqual(payload["extractionStatus"], "extracted_unreviewed")
                self.assertEqual(payload["sourceKey"], example["sourceKey"])
                if "phone" in example:
                    self.assertEqual(payload.get("phone"), example["phone"])
                if "officeAddressFragment" in example:
                    self.assertIn(example["officeAddressFragment"], payload.get("officeAddress") or "")
                self.assertNotIn(example["displayName"], reviewed)
                self.assertNotEqual(payload.get("extractionStatus"), "published")

    def test_runtime_public_list_excludes_live_site_staging_cards(self) -> None:
        version = subprocess.run(["node", "-v"], capture_output=True, text=True, check=False)
        if version.returncode != 0:
            self.skipTest("node is required to execute the public officials listing")
        match = re.match(r"v(\d+)", version.stdout.strip())
        if not match or int(match.group(1)) < 22:
            self.skipTest("Node 22+ is required for the public officials listing runtime check")

        completed = subprocess.run(
            [
                "node",
                "--experimental-strip-types",
                "--no-warnings",
                str(RUNTIME_ASSERT),
            ],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertEqual(
            completed.returncode,
            0,
            msg=completed.stdout + completed.stderr,
        )
        listing = json.loads(completed.stdout)
        self.assertEqual(listing["names"], ["Ron DeSantis"])
        self.assertNotIn("Rick Scott", listing["names"])
        self.assertNotIn("Ashley Moody", listing["names"])
        self.assertNotIn("Aaron Bean", listing["names"])
        self.assertNotIn("Anna Paulina Luna", listing["names"])
        self.assertNotIn("rick-scott-united-states-senator", listing["slugs"])
        self.assertNotIn("ashley-moody-united-states-senator", listing["slugs"])


if __name__ == "__main__":
    unittest.main()
