# CivicLenZ Product Foundation Plan

## Product position

CivicLenZ launches **Florida-first, built for every community**. Florida is the initial coverage area, not the product boundary. Public copy must not claim nationwide coverage, continuous monitoring, app availability, legal petition validity, or data completeness before those capabilities are live.

## Recommended production architecture

- **Web application:** Next.js, deployed on Vercel.
- **Public site:** the same Next.js project and `civicslenz.com` domain.
- **Authentication and data:** Supabase Auth + Postgres + Row Level Security.
- **Sign-in choices:** Google OAuth and email one-time passcode. Passwords are deferred unless a clear need emerges.
- **Transactional email:** Resend, configured as Supabase Auth custom SMTP. Use separate sender addresses for accounts, updates, and support.
- **Newsletter:** a consented Resend audience/list with double opt-in and unsubscribe handling.
- **Payments:** defer until paid plans are defined; use Stripe Billing for subscriptions if/when CivicLenZ sells Pro or Organization plans.
- **Crossmint:** do not integrate into CivicLenZ authentication, petitions, or dashboard. Revisit only if a separately approved digital-wallet or tokenized-payment feature has a lawful product purpose.
- **Observability:** add error tracking, audit logs, and administrative review before launching authenticated civic actions.

GitHub Pages may remain available as a temporary static preview, but it cannot safely run OAuth callbacks, server-only API keys, sessions, secure action workflows, or database-backed dashboards.

## Public navigation

- Home
- Find Officials
- How It Works
- Research & Standards
- CivicLenZ App
- Pricing
- About
- Contact
- Sign in / Create account

Footer:

- Find Officials
- App waitlist
- Newsletter
- About / Contact
- Research & standards
- Corrections
- Privacy
- Terms
- Accessibility
- Cookie / data controls

## Authenticated member experience

### Onboarding

1. Sign in with Google or request a one-time email code.
2. Accept terms, privacy notice, and age/eligibility notices where relevant.
3. Enter an address or ZIP code.
4. Resolve jurisdictions and show the officials connected to that location.
5. Ask what the member wants to follow: officials, offices, issues, bills, meetings, or petitions.
6. Select email/app alert frequency.
7. Show the dashboard.

Store jurisdiction identifiers and only the minimum location data needed for the member's chosen experience. Do not expose a member's home address to other users or public pages.

### Dashboard

- My representatives
- My follows and alert preferences
- Recent source-backed updates
- Saved issues and records
- My messages to offices
- Petitions I created, signed, or saved
- Account, privacy, and notification controls

### Follow an official

A public profile can be viewed without an account. Following requires authentication. The member chooses update categories and frequency. The database stores follows and notification preferences separately from public profile data.

### Contact an official

Start with a reviewed message-assist flow:

1. Member chooses the official and topic.
2. Member provides their own message or asks for a draft.
3. CivicLenZ shows the source/context and a plain-language draft.
4. Member reviews and explicitly confirms.
5. The initial release opens the office's official contact channel or provides a copy/send action.
6. Any direct sending service must have rate limits, abuse prevention, delivery status, and an audit trail.

Do not automatically mass-message public offices.

## Petition safety model

A civic petition is not automatically a legally valid recall or removal petition.

### Initial release

- Label the feature **Start a civic petition**.
- Let members request action, attention, policy change, investigation, or accountability.
- Require sign-in and creator attestations.
- Require a specific target, jurisdiction, purpose, evidence/source links, and a plain-language petition statement.
- Send every new petition to moderation before publishing.
- Give readers a clear status: draft, under review, published, paused, removed, or closed.
- Support reporting, appeals, and official responses.
- Clearly disclose that online support may not satisfy statutory recall, election, or signature rules.

### Later legal-action route

A jurisdiction-specific legal removal/recall flow can only be added after counsel validates the law, filing authority, eligibility, signature format, residence rules, identity verification, retention, and fraud controls for that office and jurisdiction.

Do not call an ordinary online petition a legally qualifying recall petition.

## Core data model

- `profiles`
- `user_jurisdictions`
- `official_follows`
- `alert_preferences`
- `official_profiles`
- `source_records`
- `corrections`
- `petitions`
- `petition_targets`
- `petition_evidence`
- `petition_signatures`
- `petition_moderation_events`
- `member_messages`
- `message_deliveries`
- `identity_verifications`
- `consent_records`
- `audit_events`

All member-owned tables must have Row Level Security. Administrative and reviewer operations need separate roles and an audit trail.

## External setup checklist for the owner

### 1. Hosting

- Create/connect a Vercel account with the GitHub account that owns `aijaraix/CivicLenZ`.
- Import the repository but do not switch the live domain until preview is verified.
- Create a preview deployment for this staging branch.
- Later add `civicslenz.com` and `www.civicslenz.com` to Vercel and update GoDaddy DNS with Vercel's exact records.

### 2. Supabase

- Create a production Supabase project.
- Save the project URL, public anon key, and service-role key. Never put the service-role key in client code or GitHub.
- Enable Row Level Security for every member table.
- Configure Google as an Auth provider.
- Configure production, preview, and local redirect URLs.
- Enable email OTP and configure branded templates.

### 3. Google OAuth

- Create a Google Cloud project and OAuth consent screen for CivicLenZ.
- Create a Web application OAuth client.
- Add the exact Supabase callback URL shown by Supabase to Google.
- Put the Google client ID and client secret in Supabase Auth, not in browser code.
- Add CivicLenZ app URLs to Supabase's allowed redirect list.

### 4. Resend

- Create a Resend account.
- Verify `civicslenz.com` using the DNS records Resend gives you.
- Create an API key.
- Configure Supabase Custom SMTP with Resend.
- Use a branded account sender, such as `accounts@civicslenz.com`, and a separate support sender.
- Enable unsubscribe handling and store newsletter consent.

### 5. Identity and petitions

- Select an identity-verification vendor only after deciding whether verification is needed for public petition creation, legally meaningful signatures, or both.
- Obtain legal review before presenting any petition as a recall/removal process.
- Define moderation, reporting, appeals, retention, and privacy rules before publication.

## Environment variables

Add these to Vercel only after accounts are created:

```bash
NEXT_PUBLIC_APP_URL=https://civicslenz.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
SENTRY_DSN=
```

Google OAuth credentials are normally configured inside Supabase. If a server-only integration later requires them, keep them in Vercel environment variables only.

## Delivery order

1. Complete public pages, navigation, company details, newsletter/app waitlist, and accurate coming-soon states.
2. Move the app-capable deployment to Vercel.
3. Add Supabase Auth, Google login, email OTP, and account settings.
4. Add address onboarding, jurisdiction resolution, follows, and alerts.
5. Add the member dashboard.
6. Add message-assist and moderation.
7. Add civic petitions with legal/privacy guardrails.
8. Add paid plans only after the value and billing rules are decided.
