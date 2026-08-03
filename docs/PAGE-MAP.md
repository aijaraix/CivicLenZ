# CivicLenZ visual page map

This is the page-by-page product layout built from the approved CivicLenZ wireframes. It is the visual source of truth for the database-connected site; it is intentionally separate from the current live website.

| Route | Customer purpose | Content and layout |
| --- | --- | --- |
| `/` | Start with an address | Dark Capitol hero, CivicLenZ value proposition, address entry/autocomplete, suggested addresses, trust row, four-step explanation, data-source row, mobile concept, and final call to action. |
| `/search/` | See who represents an address | Search bar at top, government-level filters, official list at left, representation map with level markers at right, profile entry point from each official. |
| `/officials/` | Browse the public directory | Directory version of the search/results layout with the same level filtering and official profile cards. |
| `/officials/[slug]/` | Understand one official | Identity header, official contact/actions, seven tabs, accountability score, promise tracker, activity, representation map, and civic action cards. |
| `/dashboard/` | Member home | Summary counts, alert queue, AI-monitoring overview, representation map, watchlist, and immediate action cards. |
| `/watchlist/` | Saved officials | Cards for each followed official with level, office, accountability score, and profile link. |
| `/monitor/` | Monitor source-backed changes | Activity feed with categories, source/context space, filters, and member monitoring preferences. |
| `/alerts/` | Review urgent updates | Alerts-specific view of the monitoring feed, focused on the changes that need attention. |
| `/promises/` | Follow public commitments | Promise status totals, source-linked commitment table, status legend, last-update date, and an explanation of the tracking process. |
| `/contact-official/` | Prepare constituent outreach | Official picker, subject/topic, message draft area, private-draft notice, selected-office details, and a confirmation state before production delivery. |
| `/petitions/` | Discover civic action | Petition list, categories, signature progress, member signed state, and start-petition entry point. |
| `/petitions/[slug]/` | Decide whether to sign | Petition background, requested action, target details, progress, source/context space, signing card, and sharing area. |
| `/activity/` | Review the member's own actions | Private timeline for follows, saved updates, alerts, petitions, and message drafts; participation summary at right. |
| `/reports/` | Read or schedule briefings | Report library, preview actions, weekly/monthly schedule controls, and a path to notification preferences. |
| `/settings/` | Control account and privacy | Toggle-style preferences for important alerts, digest cadence, saved address, product notices, plus privacy/export area. |
| `/sign-in/` | Return to the member area | Dark visual brand panel beside Google/email sign-in choices and a one-time-code confirmation state. |
| `/sign-up/` | Create a member account | Matching account-creation screen with consent acknowledgment and a clear dashboard handoff. |
| `/features/`, `/how-it-works/`, `/about/`, `/research/`, `/app/`, `/pricing/`, `/contact/`, `/corrections/` | Explain the product | Branded marketing/information pages that support the main user journey without changing the product interface. |

## Official-profile tabs

The profile uses the structure shown in the wireframes—not a generic bio page:

1. **Overview** — accountability score, promise summary, biography facts, recent activity, and key metrics.
2. **Votes** — dated voting entries, stance/status, and public-record source space.
3. **Promises** — original commitment, current status, reason, source, and change history.
4. **AI Monitor** — source-backed updates and their review state.
5. **Financials** — campaign/disclosure filing summaries and source provenance.
6. **Legislation** — bills, sponsorship, committee/action status, and dates.
7. **Bio** — verified background, education, work history, office information, and correction/source context.

## Mobile rules

- Public pages become single-column and retain the prominent address-first entry point.
- Search results stack the official list above the map.
- Product surfaces hide the desktop sidebar and use the fixed four-item bottom tab bar: Home, Officials, Monitor, Action.
- Dense tables become compact cards/rows; no desktop-only information is removed from the user journey.
- Touch targets remain button-sized, and filters/tabs scroll horizontally when necessary.

The actual source files are in `app/`, `components/`, and `app/globals.css`. The data fields that should populate these layouts are defined in `lib/civic-data-contract.ts`.
