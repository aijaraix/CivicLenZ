# CivicLenZ — Complete UI/UX Source

This branch is the full, responsive CivicLenZ visual frontend created from the approved wireframe boards. It is intentionally separate from `main`, so the Florida data-collection system and the live production deployment stay untouched.

## What is included

### Full page map

| Page | URL | What it shows |
| --- | --- | --- |
| Landing / home | `/` | Capitol hero, address entry, suggested addresses, trust row, four-step explainer, data-source section, mobile-app concept, and final call to action. |
| Address results | `/search/` | Address search, federal/state/local/school-board filters, representative list, government-level map markers, and links to individual profiles. |
| Official directory | `/officials/` | Search-oriented directory layout using the same filters and profile cards. |
| Official profile | `/officials/elena-morgan/` | Header, contact/follow actions, tabs, accountability score, promise tracker, activity feed, representation map, and action cards. Six sample profiles are included. |
| User dashboard | `/dashboard/` | Dashboard sidebar, monitored-official counts, alerts, AI monitoring overview, representation map, and action prompts. |
| AI Monitor | `/monitor/` | Filterable-style activity feed, source-led monitoring layout, and monitoring preferences. |
| Alerts | `/alerts/` | Alerts-focused version of the monitoring screen. |
| My Officials / Watchlist | `/watchlist/` | Saved-official cards and individual profile links. |
| Petitions | `/petitions/` | Petition directory, category tags, signature progress, signed state, and create-petition entry point. |
| Petition detail | `/petitions/protect-public-housing/` | Petition story, requested action, progress, signing state, and sharing panel. |
| Sign in | `/sign-in/` | Google and email-code sign-in layout, confirmation state, dashboard handoff. |
| Sign up | `/sign-up/` | Account-creation layout, terms check, confirmation state, dashboard handoff. |
| Product / explanation pages | `/features/`, `/how-it-works/`, `/about/`, `/research/`, `/app/`, `/pricing/`, `/contact/`, `/corrections/` | Complete informative layouts describing the product, rollout, source policy, and member experience. |

## Design system and assets

- **Primary colors:** Navy `#0D1B2A`, Blue `#2563EB`, Red `#E63946`, off-white canvas `#F7F8FA`
- **Typography:** Poppins-style display headings and Inter-style UI/body copy, with reliable browser fallbacks built in
- **Logo kit:** lens-and-capitol mark, horizontal logo, reverse logo, social-sharing image, and SVG favicon
- **UI icon set:** reusable, editable inline SVG icons for navigation, profiles, alerts, maps, petitions, settings, and civic action
- **Visual assets:** original bundled Capitol hero art and illustrative map/official-avatar components
- **Responsive behavior:** desktop, tablet, and mobile layouts; mobile product tab bar included for the app surfaces

All branded graphics live in `public/brand/` and `public/images/`. They are plain SVG files, so they can be resized, recolored, or reused without a bitmap-quality loss.

## Important prototype note

This branch is a **working UI/UX prototype**. Names, profile records, scores, activity, map placements, and petition counts are visibly labelled sample data so the layout can be used safely before CivicLenZ connects its production official-data pipeline.

The flows work in-browser (address suggestions, tabs, filters, follow state, petition signed state, and auth confirmation screens), but they do not send an email, collect an actual signature, call Google, or make an AI claim. Production integrations belong behind secure server-side environment variables and should be added to the data/application branch rather than hard-coded here.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validate and build

```bash
npm run typecheck
npm run build
```

The project uses Next.js static export. A successful build creates `out/`, which can be deployed to Vercel, Cloudflare Pages, or another static host.

## Branch safety

- **This branch:** `ui-ux-source` — the visual frontend and mock data package
- **Production/data branch:** `main` — unchanged by this UI work

Do not paste API keys or OAuth secrets into this repository. Use deployment environment variables when real authentication, Google Places, maps, email verification, petitions, or data APIs are connected.
