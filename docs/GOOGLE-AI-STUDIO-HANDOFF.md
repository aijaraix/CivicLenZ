# Google AI Studio handoff — CivicLenZ visual frontend

## What this branch is for

This `ui-ux-source` branch is the standalone CivicLenZ visual product. It was built from the approved CivicLenZ wireframes: navy Capitol imagery, the Capitol-in-a-lens logo, blue and red action colors, Poppins-style display typography, Inter-style UI typography, address-first discovery, data-rich official profiles, monitoring, petitions, member tools, and mobile-first behavior.

It is **not** a copy of the current live website. Do not use the current live website as a visual reference or merge its existing styling into this design. The database Google AI Studio already created remains the data source; this repository supplies the product interface and the exact place each database field belongs.

## First read

1. `README.md` — the route inventory and local build instructions.
2. `docs/PAGE-MAP.md` — every customer-facing page and the intended content placement.
3. `lib/civic-data-contract.ts` — the backend-safe data contract for the UI.
4. `app/`, `components/`, and `app/globals.css` — the actual frontend implementation and responsive rules.

## Required implementation outcome

Keep the visual frontend intact and connect it to the existing Google AI Studio database/API:

- Replace only the illustrative data in `lib/demo-data.ts` with server-side database/API adapters.
- Preserve the public routes and the customer flow described in `docs/PAGE-MAP.md`.
- Keep database credentials, Google Places keys, map keys, email keys, and AI credentials server-side; never commit them or place them in browser code.
- Use real, source-verified official data in production. Do not turn missing fields into invented content. Show `Not yet available`, `Under review`, or `Incomplete record` where needed.
- Keep the wireframe design system: navy `#0D1B2A`, blue `#2563EB`, red `#E63946`, off-white `#F7F8FA`, lens-and-Capitol logo, and the existing mobile behavior.

## Data binding map

| UI surface | Production data required | Contract entry point |
| --- | --- | --- |
| Address hero and `/search/` | Canonical address, latitude/longitude, representative list, government level, map markers | `findRepresentation(address)` |
| Directory and filters | Official name, title, level, jurisdiction, party, photo, slug | `listOfficials(filters)` |
| Official profile | Identity, contacts, office, next election, score/metrics, biography, sources | `getOfficial(slug)` |
| Votes/monitor/activity | Dated record, category, source, review status, summary | `getOfficialActivity(officialId)` |
| Promise tracker | Original statement, status, rationale, update date, sources | `getOfficialPromises(officialId)` |
| Petition views | Title, summary, target, signature count/goal, status, sources | `listPetitions(filters)` |
| Dashboard/watchlist/alerts | Watched officials, unread count, recent alerts, member preferences | `getMemberDashboard(memberId)` |

## Production integration rules

- Use Google Places Autocomplete and geocoding only after the key is placed in deployment environment variables.
- Calculate which officials represent an address on the server or through the existing database/API, then return only safe public data to the browser.
- Map markers must come from the actual jurisdiction/representation response, not hard-coded coordinates.
- Scores, status labels, alert counts, and petition totals must identify their methodology and source state in the real product.
- Sign-in, email-code delivery, real signatures, outreach delivery, and notifications require authenticated backend routes. The UI can show a confirmation only after the backend reports success.
- Maintain a clear correction and provenance path on public official records.

## Copy/paste implementation prompt for Google AI Studio

```text
Use the CivicLenZ `ui-ux-source` GitHub branch as the complete visual frontend source of truth. Do not copy, reuse, or visually reference the existing live CivicLenZ website.

Read README.md, docs/PAGE-MAP.md, and lib/civic-data-contract.ts before changing code. Keep the existing design intact: dark navy Capitol hero, Capitol-in-a-lens CivicLenZ logo, navy #0D1B2A, blue #2563EB, red #E63946, off-white #F7F8FA, Poppins-style display headings, Inter-style UI text, the existing responsive/mobile layout, and the exact route structure.

Connect the database that already exists to this frontend. Replace illustrative data in lib/demo-data.ts with secure server-side data adapters that implement the CivicLenZDataProvider contract in lib/civic-data-contract.ts. Do not put database credentials, Google Places keys, map keys, email keys, or AI keys in browser code or GitHub.

Implement the real flow as follows:
1. The home address field uses Google Places Autocomplete. Once an address is chosen, call the existing backend/database to find every elected official who represents that address from federal through local and school board.
2. Render the results in /search with government-level filters, an interactive map, and profile links. Use real jurisdiction geometry/coordinates, not hard-coded sample markers.
3. Populate /officials/[slug] and all seven profile tabs using source-verified data. If a field is missing, show an honest incomplete/unavailable state instead of inventing content.
4. Populate the dashboard, watchlist, alerts, AI monitor, promise tracker, petitions, activity, reports, contact flow, and settings from authenticated backend APIs. Keep the current layouts and mobile patterns.
5. Preserve source provenance, status labels, corrections, and clear distinctions between verified data, incomplete data, and AI-assisted summaries.

Before delivery, run TypeScript validation and a production build. Do not redesign any page unless a required integration needs an explicit loading, empty, error, or privacy state that matches the current visual system.
```

## What remains intentionally illustrative in this branch

The visual prototype uses demo officials, labels, portraits, scores, activities, petition counts, maps, and account behavior. That is deliberate: it lets the full UI be designed and reviewed before live data is connected. Every live claim should come from the Google AI Studio database or another source-verified production service.
