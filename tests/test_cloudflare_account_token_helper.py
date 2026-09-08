import pathlib
import unittest


REPOSITORY_ROOT = pathlib.Path(__file__).resolve().parents[1]
HELPER = REPOSITORY_ROOT / "ops" / "bootstrap" / "civiclenz-set-cloudflare-secrets"


class CloudflareAccountTokenHelperTests(unittest.TestCase):
    def setUp(self) -> None:
        self.source = HELPER.read_text(encoding="utf-8")

    def test_uses_account_owned_token_verification_endpoint(self) -> None:
        self.assertIn('path = f"/accounts/{account_id}/tokens/verify"', self.source)
        self.assertNotIn('/user/tokens/verify', self.source)

    def test_requires_current_account_owned_token_format(self) -> None:
        self.assertIn('"$1" == cfat_*', self.source)

    def test_failure_preserves_existing_secret_file(self) -> None:
        self.assertIn('if ! report_verification_result "${verification_result}"; then', self.source)
        self.assertIn('mv -f "${tmp_file}" "${SECRET_FILE}"', self.source)
        self.assertLess(
            self.source.index('if ! report_verification_result "${verification_result}"; then'),
            self.source.index('mv -f "${tmp_file}" "${SECRET_FILE}"'),
        )

    def test_supports_a_non_mutating_stored_credential_check(self) -> None:
        self.assertIn('"--verify-stored"', self.source)
        self.assertIn('CivicLenZ stored Cloudflare account token verified securely.', self.source)


if __name__ == "__main__":
    unittest.main()
