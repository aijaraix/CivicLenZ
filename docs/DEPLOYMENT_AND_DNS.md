# CivicLenZ Deployment and GoDaddy DNS Runbook

## Recommended launch path

Use the GitHub repository as the source of truth and deploy the statically exported Next.js site to Vercel for preview and production. This keeps the repository private, provides a temporary preview URL before DNS is changed, automatically redeploys after approved changes reach `main`, and leaves the data collectors in GitHub Actions.

GitHub Pages remains a supported alternative when the account plan permits Pages for this private repository.

## Zero-downtime sequence

1. Merge a reviewed website pull request into `main`.
2. Create the hosting project from `aijaraix/CivicLenZ`.
3. Confirm the generated preview URL works on desktop and mobile.
4. Add both `civiclenz.ai` and `www.civiclenz.ai` in the hosting provider's domain settings.
5. Copy the exact DNS records shown by the hosting provider.
6. In GoDaddy, change only the website records after the provider is ready to verify them.
7. Do not delete MX, SPF, DKIM, DMARC, verification, or other email/service TXT records.
8. Verify the apex and `www` addresses, HTTPS, redirects, and several profile routes.
9. Retain the previous website record values for quick rollback until the new deployment is stable.

## Vercel setup

1. Sign in to Vercel and choose **Add New → Project**.
2. Import the GitHub repository `aijaraix/CivicLenZ`.
3. Vercel should detect Next.js.
4. Use the repository root as the project directory.
5. Build command: `npm run build`.
6. The Next.js configuration produces an `out/` static export; Vercel can also serve the project through its native Next.js integration.
7. Deploy and test the temporary `vercel.app` address.
8. Open **Project Settings → Domains**.
9. Add `civiclenz.ai` and `www.civiclenz.ai`.
10. Vercel will display the exact root A record, `www` CNAME record, and any TXT ownership-verification record required for this project. Use those displayed values rather than copying values from an old deployment.

## GoDaddy DNS steps

1. Open the GoDaddy **Domain Portfolio**.
2. Select `civiclenz.ai`.
3. Open **DNS**.
4. Save screenshots or a written copy of the existing root (`@`) and `www` website records before editing.
5. Remove or edit only conflicting website A/CNAME records.
6. Add the exact records required by the selected host.
7. Keep the default TTL or temporarily choose a short available TTL during the cutover.
8. Save the changes and complete GoDaddy identity verification if requested.
9. Return to the hosting provider and wait for domain verification and SSL issuance.

DNS updates often appear quickly but can take substantially longer to propagate across resolvers. Do not repeatedly change records while propagation is in progress.

## GitHub Pages alternative

The repository includes a manual Pages deployment workflow. Before running it:

1. Open the repository **Settings → Pages**.
2. Under **Build and deployment**, choose **GitHub Actions**.
3. Run the `Deploy static site to GitHub Pages` workflow.
4. Test the generated GitHub Pages URL.
5. Add `civiclenz.ai` as the custom domain in repository Pages settings before changing DNS.

For an apex domain, GitHub currently documents these A records:

```text
@  A  185.199.108.153
@  A  185.199.109.153
@  A  185.199.110.153
@  A  185.199.111.153
```

For `www`, point a CNAME directly to:

```text
www  CNAME  aijaraix.github.io
```

After verification, enable **Enforce HTTPS**. Do not use a wildcard DNS record.

## Rollback

If the new site fails after the DNS switch:

1. Restore the prior root and `www` record values saved before the cutover.
2. Leave mail and verification records unchanged.
3. Investigate the failed deployment using the preview URL and GitHub Actions logs.
4. Switch DNS back only after the corrected deployment is verified.

## Production checklist

- Homepage loads without browser warnings.
- `/officials/` loads.
- Every generated official route loads directly and after refresh.
- Mobile navigation does not cover content.
- HTTPS is active for apex and `www`.
- One domain redirects consistently to the preferred domain.
- No placeholder database field names appear publicly.
- Source links open correctly.
- Privacy, terms, source policy, methodology, accessibility, and corrections pages are present before broad promotion.
- Analytics and error monitoring are configured without collecting unnecessary address or constituent-message data.