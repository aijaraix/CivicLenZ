# CivicLenZ Live Canonical Product Projection, Operator, Public, Mobile & Social Contract

## 1. Purpose

CivicLenZ research has no product value if validated intelligence remains trapped in HERMES logs, producer storage, Supabase rows, or R2 objects that the owner/public product cannot inspect.

This contract requires one continuous pipeline from canonical research state to operator visibility and publication-eligible product surfaces.

The website, future mobile application, map, APIs, and neutral evidence-backed social publishing must project from the same canonical truth system rather than separate hand-maintained JSON copies.

## 2. Core invariant

The intended chain is:

```text
Research workers/producers
-> canonical persistence
-> evidence + validation + reconciliation
-> publication eligibility
-> canonical projection/API
-> public website / mobile / map / neutral social outputs
```

The private operator surface additionally reads authorized operational state:

```text
jobs + worker_runs + ResearchNeeds + capability registry + sources + validation + coverage + monitoring
-> private operator projections
```

A successful research result that cannot be found in the authorized operator product is an observability defect.

A publication-eligible civic fact that never reaches the public product is a projection defect.

## 3. One canonical data path

Do not maintain a separate file-backed official universe as the long-term production source of truth.

Repository JSON may remain fixtures, reviewed historical exports, development data, or explicit fallback artifacts, but production directory/profile counts and live dossier content must come from canonical database projections/API.

Public and mobile clients must not connect with privileged database credentials. Use a least-privilege server/API/projection boundary with an explicit field/table allowlist and publication eligibility policy.

## 4. Operator and public surfaces are different

### Private operator surface

The operator/owner dashboard may show operational states that are not public civic truth, including:

- unreviewed/extracted records;
- open ResearchNeeds and scope gaps;
- queued/leased/running/retrying/dead-letter jobs;
- physical worker/capability states;
- raw counts of evidence/claims by validation state;
- monitoring due/overdue;
- source health;
- contradiction queues;
- unpublished research depth;
- dataset exhaustion/reconciliation state;
- deployment/runtime lineage.

It must be access-controlled before real operational data/secrets are exposed.

### Public surface

Public pages show only publication-eligible canonical civic data and clearly labeled completeness/currentness/evidence state.

Raw producer output, unreviewed allegations, internal errors, secrets, internal source credentials, private operator controls, and unvalidated material must not leak to public clients.

## 5. Public officials directory

The public directory must become a live canonical projection supporting at minimum:

- total publication-eligible officials indexed;
- geographic/jurisdiction coverage;
- government level;
- office class/body/chamber;
- state/jurisdiction/district;
- current occupancy status;
- candidate/current/former context where applicable;
- portrait where identity/licensing/provenance permit;
- party where canonically supported;
- evidence/current-as-of signal;
- dossier research-depth/status summary without pretending global completeness;
- search by name, office, jurisdiction, district;
- filters/sorts appropriate to available canonical fields;
- links to full canonical profile.

The directory card must never be the only copy of a fact; it is a projection of canonical state.

## 6. Public deep dossier page

Each official/candidate/seat dossier should progressively expose publication-eligible sections such as applicable:

- Seat and current/historical Occupancy;
- identity and name history;
- official portrait/media provenance;
- public official/campaign contact channels;
- official/campaign websites and social accounts;
- biography, education, career, military/public service;
- prior offices and election/campaign history;
- committees/leadership/appointments;
- legislation/votes or executive/government activity by office class;
- campaign committees/finance/contributions/expenditures and reconciliation metadata;
- financial/public disclosures and relevant business interests;
- promises/public commitments and evidence timelines;
- public statements, interviews, debates, podcasts and speeches;
- ethics/investigation/public court records with procedural status and evidence;
- documented relationships without unsupported motive/causation claims;
- news/media chronology with source links;
- constituency/territory/election context;
- map/boundary/public civic locations;
- evidence/source timeline;
- research depth/completeness matrix;
- currentness/monitoring state;
- unresolved gaps/contradictions where public policy permits.

Public profiles must use neutral evidence relationships and must not rank politicians, recommend votes, or publish opaque political scores.

## 7. Dossier depth view

The owner must be able to answer `how deep is this individual researched?` without reading raw tables.

Build a dossier-depth matrix from physical coverage state. For each applicable scope show:

- scope name;
- state;
- finite vs open-ended;
- expected/accounted/missing units where finite;
- required/attempted/successful source families;
- independent discovery passes;
- open leads;
- search saturation/current-as-of;
- evidence count;
- validation state;
- contradiction state;
- coverage-audit state;
- last researched;
- next check;
- monitor state;
- explicit blocker/next action.

Do not reduce this to one misleading percentage. Aggregated summaries may exist only alongside the dimension details.

## 8. Private operator dashboard

Replace zero/synthetic placeholders with live physical metrics.

Required top-level operator panels include:

### Canonical universe
- Seats;
- Persons;
- current Occupancies;
- Elections;
- CandidateCampaigns;
- publication-eligible profiles;
- validated vs pending/conflicting claims;
- evidence objects/retrievals;
- geographic coverage by layer/jurisdiction.

### Research machine
- declared capabilities;
- ACTIVE/READY/BLOCKED/NOT_IMPLEMENTED/DEGRADED capability counts;
- physical worker deployments/processes;
- current effective concurrency;
- jobs by lifecycle/status/type;
- backlog by capability/research domain;
- recent worker runs;
- throughput;
- retries/dead letters;
- validation backlog;
- source health/throttling.

### Dossier depth
- subjects entering deep research;
- scope coverage by research family;
- finite-dataset reconciliation status;
- open-ended search saturation;
- coverage-audit rediscovery misses;
- unresolved gaps/contradictions;
- monitored subjects/scopes;
- stale/overdue scopes.

### Geography/map
- boundary coverage;
- SeatBoundaryAssignments;
- GIS source/currentness;
- address-resolution readiness by geography;
- election linkage.

### Academy
- observations/cases/evaluations;
- proposals/promotion state;
- production misses that generated learning;
- authority violations.

Every metric must drill down to physical records.

## 9. Live activity feed

The owner should be able to open the operator dashboard and watch trustworthy activity without tailing logs.

Provide an activity stream derived from durable events, for example:

- official identity resolved;
- new dossier fan-out generated;
- worker completed a bounded scope;
- source retrieval preserved;
- evidence validated/rejected;
- finite dataset reconciled;
- coverage auditor found a miss;
- monitor detected change;
- promise/public-commitment evidence changed;
- boundary/election state updated;
- public profile gained newly publication-eligible information;
- worker/source entered degraded/blocked state.

Activity feed entries must link to subject/job/evidence where authorized.

## 10. Public coverage dashboard

A public-facing coverage page may expose safe aggregate metrics such as:

- publication-eligible official count;
- jurisdictions/states/office classes covered;
- research/currentness status distributions;
- map/boundary readiness;
- evidence-backed dataset counts;
- last-updated information.

Do not expose private operational security details or imply unvalidated backlog is published truth.

## 11. Portrait/media cards

Directory cards should render the verified/usage-eligible portrait when available rather than always initials.

Every media asset must preserve identity/provenance/licensing/usage status under the media contract. A wrong portrait is worse than no portrait.

## 12. Search and filtering

The public directory and mobile clients should use server-backed canonical search/filtering rather than requiring all records to be statically bundled into the build.

Support scalable pagination/cursors as the dataset grows toward hundreds of thousands of seats/officials/candidates.

Search/filter dimensions should include applicable name, geography, government level, office class, district/body, current status, election context, and research/currentness filters.

## 13. Map and `find my officials`

The map/address product shares the same canonical Seat/Boundary/Occupancy/Election projection.

Do not resolve representation from ZIP/city labels alone when boundary intersection is required.

Target flow:

```text
street address
-> geocoded point
-> effective/versioned authoritative boundary intersections
-> Seats
-> current Occupancies
-> current/upcoming Elections/CandidateCampaigns
-> canonical cards/dossiers
```

Before full address lookup is ready, the product may still offer jurisdiction/district/map browsing with honest coverage status.

## 14. Mobile application

The mobile application must consume the same versioned canonical public API/projection as the website.

Do not create a second civic database for mobile.

Mobile may add follows, push alerts, saved jurisdictions/issues, map/location UX, evidence timelines, and civic actions while preserving the same truth/publication contracts.

## 15. Social publishing

Social publishing is a downstream publication client, not a research worker and not a truth authority.

Only publication-eligible canonical Civic Events/content may enter the automated social publishing queue.

Every automated post must retain an internal link to the canonical subject/event/evidence set and use neutral factual templates. It must not endorse candidates, rank officials, recommend votes, infer motives, or convert unresolved evidence into definitive accusations.

Appropriate social triggers may include neutral, validated civic events such as:

- office/occupancy changes;
- election/filing/certification changes;
- newly published official action or filing;
- materially new validated promise/commitment evidence relationship;
- newly reconciled public dataset;
- public profile updates.

Human/governed review gates may be required for sensitive/high-impact content.

VPS/social credentials must be scoped to the publishing service and kept separate from HERMES canonical truth authority.

## 16. Current physical product audit — 2026-09-17

This is a dated checkpoint and must be revalidated before mutation.

At canonical repo `9ab9b5f103322dd5bbc677611110d362f22c067c` and the then-live website:

- `/officials/` was live and displayed exactly 1 reviewed Florida official;
- the directory already supported text search and federal/state filter UI;
- cards displayed initials rather than using a portrait image in the directory component;
- `lib/officials.ts` loaded canonical/review-staging JSON from repository filesystem paths rather than the live Supabase canonical store;
- the profile route used `getAllOfficials/getOfficialBySlug` from that file-backed adapter;
- the profile UI already contained extensive deep-dossier sections and placeholders for many intended domains;
- `/operator/` was publicly reachable and explicitly used `emptyOperatorDashboard()`, showing all operational counts as zero and stating that the collection store was not connected;
- canonical Supabase actually contained live jobs, worker_runs, research contracts, sources, Persons/Seats/Occupancies, claims, and monitoring state;
- therefore research state and product projection were physically disconnected.

## 17. Immediate repair order

Without rebuilding the visual product from scratch:

1. protect the real operator dashboard before wiring sensitive live operational data;
2. implement a least-privilege server-side canonical database/projection adapter;
3. replace file-backed production official counts/directory/profile reads with live canonical publication-eligible projection;
4. preserve file-backed fixtures only for explicit development/fallback/testing use;
5. wire live operator metrics and drilldowns to canonical/internal authorized state;
6. add capability registry and dossier-depth matrix views;
7. make profile sections read normalized canonical datasets/evidence rather than static placeholders;
8. make directory cards use verified portraits when available;
9. add live coverage/geography panels and map readiness;
10. make web/mobile/social share the canonical API/projection contract;
11. only after the publication gate is proven, enable neutral automated social publishing from validated Civic Events.

## 18. Acceptance

The projection system is proven when:

- a real worker acquires evidence;
- canonical validation/reconciliation makes a result publication eligible;
- the private operator UI reflects the new work/state without manual file editing;
- the public directory/profile reflects publication-eligible changes without a hand-maintained JSON copy;
- dossier depth shows truthful coverage/exhaustion state;
- map/geographic state uses canonical boundaries/Seats;
- a website deployment/restart does not lose canonical research;
- public clients cannot read internal operational tables/secrets;
- mobile uses the same public API contract;
- social publishing, when enabled, consumes only publication-eligible neutral canonical events.
