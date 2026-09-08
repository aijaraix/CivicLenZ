import pathlib
import unittest


REPOSITORY_ROOT = pathlib.Path(__file__).resolve().parents[1]
HELPER = REPOSITORY_ROOT / "ops" / "bootstrap" / "civiclenz-set-harvester-bridge-secret"


class HarvesterBridgeSecretHelperTests(unittest.TestCase):
    def setUp(self) -> None:
        self.source = HELPER.read_text(encoding="utf-8")

    def test_uses_hidden_operator_input_and_a_distinct_secret_file(self) -> None:
        self.assertIn('read -r -s -p "CivicLenZ Harvester shared secret: "', self.source)
        self.assertIn('readonly SECRET_FILE="${SECRET_DIR}/harvester-bridge.env"', self.source)
        self.assertNotIn("CLOUDFLARE_API_TOKEN", self.source)

    def test_requires_high_entropy_shape_without_echoing_input(self) -> None:
        self.assertIn("[[ ${#value} -ge 32 && ${#value} -le 512 ]]", self.source)
        self.assertIn("[[ ${classes} -ge 3 ]]", self.source)
        self.assertNotIn('echo "$bridge_secret"', self.source)
        self.assertNotIn("set -x", self.source)

    def test_replaces_atomically_only_after_candidate_validation(self) -> None:
        validation = self.source.index('if ! verify_file "$tmp_file"; then')
        replacement = self.source.index('mv -f "$tmp_file" "$SECRET_FILE"')
        self.assertLess(validation, replacement)
        self.assertIn('trap \'rm -f -- "${tmp_file}"\' EXIT', self.source)

    def test_has_non_mutating_stored_secret_check(self) -> None:
        self.assertIn('"--verify-stored"', self.source)
        self.assertIn("CivicLenZ Harvester bridge secret is stored securely.", self.source)


if __name__ == "__main__":
    unittest.main()
