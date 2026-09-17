# CivicLenZ Data Acquisition Machine & Deep Dossier Swarm Operating Contract

## 1. Purpose

This document defines the production operating model for turning CivicLenZ into a continuously running civic-intelligence acquisition machine.

The product objective is not a shallow roster. For every supported elected official and candidate, CivicLenZ must pursue a deep, evidence-backed dossier spanning the applicable ResearchContract universe, potentially yielding roughly 1,000-2,000+ normalized data points, events, relationships, source artifacts, monitoring obligations and derived evidence relationships per subject where the public record supports them.

The system must achieve depth and scale simultaneously.

A discovered/identified subject must not wait for another subject to finish. A worker finishing one bounded task must not wait for sibling workers on the same subject. HERMES Prime continuously fills available capacity with the next eligible unit of work.

## 2. Core production invariant

The canonical production flow is:

`Seat/Territory Discovery -> Occupancy/Candidate Discovery -> Identity Resolution -> Subject Fan-Out -> Parallel Research Swarm -> Evidence Preservation -> Independent Validation/Reconciliation -> Gap Re-evaluation -> Monitoring -> Change Detection -> Re-research`

The flow overlaps across many subjects. Person A can be in deep research while Person B is being identified, Person C is being validated, Person D is being monitored, and Person E is being discovered.

No stage may impose a global barrier on unrelated work.

## 3. HERMES Prime is the conveyor controller

HERMES Prime owns canonical research intent, priorities, ResearchWorkIdentity, reservations/leases, dependency state, dynamic concurrency, retries, validation coordination, monitoring obligations, currentness, Gap Detector work generation and Academy governance.

Prime does not perform every research task itself. It keeps the machine moving.

Prime must answer continuously:
- what eligible work exists now;
- what dependencies are satisfied;
- what worker capability can execute it;
- how much safe capacity is available;
- which source/tool route is permitted;
- what work should be monitored rather than recollected;
- what finished work creates new research obligations.

If safe eligible backlog exists and resources are healthy, the machine should not intentionally idle.

## 4. Worker-pool doctrine

Workers are reusable capabilities, not permanently dedicated one-per-politician processes.

Examples include:
- seat/jurisdiction discovery;
- officeholder discovery;
- identity resolution;
- portrait/media asset discovery;
- official contact/social discovery;
- biography/education/career;
- prior offices/election history;
- campaign promises/public commitments;
- campaign finance/disclosures;
- legislation/votes/committees;
- executive actions/orders/appointments/budgets;
- ethics/investigations/public court records;
- organization/relationship research;
- speeches/interviews/debates/podcasts;
- social-media retrieval and classification;
- news/media monitoring;
- GIS/boundary discovery;
- evidence validation;
- contradiction resolution;
- dataset reconciliation;
- completeness/gap audit;
- monitoring/currentness.

A worker leases one bounded ResearchWorkIdentity, executes it, submits durable evidence/results, terminalizes or returns a truthful failure state, and immediately requests the next eligible job.

A portrait worker that finishes Subject A moves to Subject B even if Subject A still has 150 other research tasks open. The same rule applies to every independent capability.

## 5. No sibling-wait rule

Research scopes for the same subject run independently unless a genuine data dependency exists.

Examples of genuine dependencies:
- identity must be sufficiently resolved before attributing a sensitive historical record;
- a CandidateCampaign must be resolved to the correct office/cycle before campaign-finance reconciliation;
- a canonical promise must exist before later conduct can be evaluated against it;
- a Seat/Boundary identity must exist before authoritative address intersection can be finalized.

Examples that must NOT create artificial dependencies:
- portrait discovery does not wait for biography;
- biography does not wait for finance;
- finance does not wait for social-media collection;
- promise extraction does not wait for education history;
- GIS work does not wait for media research;
- Subject B does not wait for Subject A.

The scheduler must encode explicit dependency edges rather than serializing whole dossiers.

## 6. Identity-triggered fan-out

Once a canonical subject identity is sufficiently established for safe research attribution, HERMES immediately evaluates the applicable Core, Office-Class and Dynamic ResearchContracts.

Applicable missing/stale/conflicting scopes become durable work.

Fan-out should create as many independent ResearchWorkIdentities as needed to cover the full dossier contract. Hundreds of work items for one subject are acceptable when they represent real distinct research obligations.

The subject fan-out planner must not stop at basic fields. It should generate the full applicable research graph, including enumerable datasets, open-ended research scopes, media/social streams, geospatial relationships and monitoring obligations.

## 7. Deep dossier research universe

The exact contract is office-class specific, but deep research should include applicable families such as:

### Identity and biography
- canonical identity and aliases;
- birth/background facts where public and relevant;
- education;
- professional career;
- military/public-service history;
- prior candidacies and offices;
- historical jurisdictions;
- authoritative portraits and media assets.

### Seat, territory and elections
- current Seat and Occupancy;
- jurisdiction hierarchy;
- election calendar/history/results;
- CandidateCampaign records;
- district/territory boundaries and versions;
- public civic locations;
- address-to-boundary resolution readiness.

### Government activity
- legislation;
- sponsored/co-sponsored measures;
- votes;
- committees;
- hearings/attendance where available;
- executive orders/actions;
- appointments;
- vetoes/signings;
- budgets/appropriations and other office-specific actions.

### Campaigns, finance and disclosures
- campaign committees;
- contributions/expenditures;
- PAC relationships;
- financial disclosures;
- assets/liabilities/income sources where lawfully public and civically relevant;
- business interests;
- gifts/outside income where applicable;
- amendments and reporting-period reconciliation.

### Accountability and public record
- campaign promises;
- public commitments and explicit non-commitments;
- documented positions;
- ethics matters;
- investigations and dispositions;
- public court records where materially relevant and lawfully public;
- conflicts/relationship evidence without unsupported motive inference.

### Media, speech and social
- official/campaign websites;
- press releases;
- speeches;
- interviews;
- debates;
- podcasts;
- video/audio appearances;
- official and campaign social accounts;
- materially relevant social posts;
- news chronology;
- endorsements and other attributable public statements where relevant.

### Relationships and organizations
- staff/appointment relationships;
- campaign/donor/committee relationships;
- organization relationships;
- publicly relevant business relationships;
- other evidence-backed civic relationship edges.

### Currentness and monitoring
Every dynamic field family receives a monitoring/currentness rule after first-pass reconciliation.

## 8. Enumerable vs open-ended completion

Finite datasets such as election results, campaign filings, votes, executive orders and disclosures must be reconciled against an identified universe and cutoff.

Use states such as `RECONCILED_THROUGH <cutoff>`.

Open-ended domains such as public statements, social posts, interviews, promises, news and relationships cannot become globally complete. They may reach `COVERAGE_RECONCILED_FOR_DEFINED_SCOPE_AS_OF <cutoff>` and transition immediately to monitoring.

There is no permanent global Person `COMPLETE` state.

For operator convenience, CivicLenZ may expose an `INITIAL_DEEP_DOSSIER_SNAPSHOT_RECONCILED` milestone only when all required applicable bounded scopes have either:
- an evidence-backed reconciled state;
- a truthful unresolved/conflicting state;
- a truthful source/capability block;
- a not-applicable determination supported by contract semantics;
- an active monitoring obligation where the domain is open-ended/dynamic.

This milestone never terminates monitoring.

## 9. Resource-governed concurrency

Production throughput is controlled by measured safe capacity, not arbitrary worker-count doctrine.

HERMES Resource Governor should continuously observe CPU, RAM, I/O, network, browser capacity, queue depth, database latency/connections, R2/Cloudflare health, source rate limits, error rates, model/API limits, cost ceilings, lease failures and validation backpressure.

If the system safely supports 25 concurrent work units, run approximately that many. If it safely supports 100, use that capacity. If additional execution nodes increase safe capacity, HERMES should distribute work across them while preserving canonical authority.

Cohort sizes are acceptance/risk controls, not the steady-state operating model.

After a capability/source path is physically proven, it should join the bounded continuous scheduler rather than requiring repeated manual 10/50-job ceremonies.

## 10. Discovery lane never waits for enrichment

Seat/officeholder/candidate discovery is a continuous upstream lane.

Once Subject A is handed into canonical fan-out, discovery continues to Subject B.

Discovery capacity should keep the downstream research machine supplied without creating uncontrolled duplicate identities.

Every new Seat frontier must also trigger applicable election, CandidateCampaign and GIS/boundary obligations according to canon.

## 11. Persistent monitoring obligations

A completed first-pass worker does not remain resident merely to watch a subject. Instead HERMES creates durable monitoring obligations tied to subject/scope/source.

Examples:
- official website change monitor;
- campaign website monitor;
- X/Facebook/Instagram/YouTube/other official feed monitor where permitted;
- RSS/Atom/press release feeds;
- legislative/vote feeds;
- executive-action feeds;
- election/candidate status feeds;
- finance/disclosure filing schedules;
- news/interview/podcast discovery;
- source-health/schema fingerprint monitoring;
- boundary/GIS version monitoring;
- promise/position monitoring.

Use event/webhook/feed-first mechanisms where possible with scheduled heartbeat/polling backstops.

A monitor detecting material change creates new durable research/validation work; it does not silently rewrite canonical truth.

## 12. Campaign promise intelligence pipeline

Campaign-promise and public-commitment intelligence is a first-class CivicLenZ capability.

Promise discovery must search beyond campaign websites where lawful and appropriate, including debates, speeches, interviews, podcasts, videos, press releases, advertisements, social posts, transcripts and attributable reporting that links to the underlying source.

Each material promise/commitment should preserve:
- speaker/subject identity;
- office/campaign/cycle context;
- exact or narrowly quoted supporting statement within copyright limits;
- normalized proposition;
- affirmative action promised, non-action promised, prohibition or condition;
- qualifiers and exceptions;
- relevant timeframe;
- applicable governmental authority;
- source URL/artifact;
- retrieval timestamp;
- publication/event date;
- transcript/video timecode or document locator where available;
- raw artifact/evidence hash;
- source authority/provenance;
- current evidence relationship state.

Repeated formulations should be reconciled into a canonical commitment without discarding individual source evidence.

## 13. Promise monitoring and contradiction events

Monitoring continuously compares later attributable statements/actions against existing commitments.

Potential later evidence may include:
- new statements;
- votes;
- bill sponsorships;
- executive actions;
- budgets;
- appointments;
- signed/vetoed measures;
- official policies;
- campaign/official website revisions;
- interviews/podcasts/social posts;
- other evidence-backed conduct.

A possible conflict creates a `POTENTIAL_PROMISE_EVIDENCE_CONFLICT` or equivalent research/validation event, not an automatic political verdict.

Validation must examine identity, source authenticity, context, qualifiers, timing, office authority, semantic equivalence and contradictory/corroborating evidence.

Allowed evidence-relationship conclusions follow the Promise/Position contract, such as `EVIDENCE_SUPPORTS_FULFILLMENT`, `EVIDENCE_SUPPORTS_PARTIAL_FULFILLMENT`, `EVIDENCE_SUPPORTS_NON_FULFILLMENT`, `EVIDENCE_SUPPORTS_REVERSAL`, `CONFLICTING_EVIDENCE` or `INSUFFICIENT_EVIDENCE`.

CivicLenZ must not rank politicians, assign ideological/loyalty grades, recommend voting choices or convert evidence relationships into a politician score.

## 14. Proactive civic alerts

Validated material change/conflict events may generate evidence-backed alerts for opted-in users with an applicable constituency/follow relationship.

An alert should show the prior documented commitment, the new documented statement/action, dates, context, evidence locators and validation/currentness state.

Alerts inform users of evidence; they do not tell users how to vote, whom to support or what political action to take.

High-impact or ambiguous alerts require the publication/validation gates defined in canonical policy.

## 15. Media evidence requirements

Where evidence is audiovisual, preserve where technically/legal-policy appropriate:
- underlying source URL;
- title/publisher/account;
- publication date;
- retrieval timestamp;
- media identifier;
- transcript and speaker attribution where available;
- timecode(s);
- raw/archived artifact or permitted derivative/reference;
- hash/locator;
- screenshots/stills only where policy permits and where they improve evidentiary review;
- extraction/version metadata.

Search-engine snippets, summaries and model-generated transcripts are not sufficient authority by themselves.

## 16. GIS and map acquisition is part of the same machine

Geospatial research is not a later visualization project.

For each Seat/geographic frontier, the machine must generate/reconcile work for authoritative/versioned boundaries, SeatBoundaryAssignment, public civic locations, election linkage and address-resolution testing.

Boundary discovery and official deep research may proceed in parallel.

Map readiness is separately measured from subject dossier readiness, but neither is optional to the full CivicLenZ product.

Do not use ZIP/city/county labels as authoritative representation where geometric boundary resolution is required.

## 17. Evidence chain invariant

Every material fact/relationship/event must be traceable through the physical chain:

`ResearchWorkIdentity -> worker execution -> source retrieval -> raw artifact/record -> evidence object/locator -> extracted candidate claim/entity -> canonical receipt/handoff -> independent validation/reconciliation -> canonical state -> projection/monitoring`

No worker self-verifies material civic truth merely because its extraction succeeded.

## 18. Gap Detector loop

After any scope completes/reconciles, HERMES evaluates the subject against the full applicable contract again.

New facts may create new work recursively.

Examples:
- prior office -> historical elections/votes/finance;
- company -> business/disclosure/relationship research;
- campaign committee -> finance reconciliation;
- discovered social account -> historical retrieval + monitoring;
- material promise -> promise evidence timeline + monitoring;
- discovered organization -> relationship/source expansion;
- discovered boundary version -> address/election reconciliation.

A deep dossier is therefore a graph expansion process, not a fixed questionnaire.

## 19. Reference-subject proof

CivicLenZ should maintain at least one physically proven reference deep dossier for each important office class over time.

For the current Florida activation, use the already canonically identified current Florida Governor subject as the first STATE_GOVERNOR deep-dossier reference subject; do not create a duplicate Person or Occupancy.

The reference proof must demonstrate real multi-domain fan-out, parallel work, evidence lineage, validation, Gap Detector recursion, monitoring conversion and GIS/election linkage.

The discovery lane must continue while this reference dossier deepens.

## 20. Required physical metrics

Operator truth should expose at minimum:
- identified subjects by office class/geography;
- applicable ResearchContracts generated;
- eligible/blocked/running work by capability;
- concurrent worker executions;
- worker throughput by capability;
- source retrievals/evidence objects;
- validation queue/backpressure;
- reconciled bounded scopes;
- unresolved gaps/contradictions;
- monitoring obligations and due checks;
- promise records and potential conflict events by validation state;
- GIS/boundary coverage/readiness;
- per-subject initial deep-dossier reconciliation state;
- resource-governor limits and actual utilization.

Do not reduce all of these to one misleading completion score.

## 21. Failure isolation

One failing source, parser, capability, subject or research scope must block only the smallest dependency-bound unit.

Independent worker pools continue.

When a systemic defect appears, follow canonical incident doctrine: first incorrect transition -> generalized repair -> blast-radius audit -> regression -> regeneration/resume -> monitoring.

## 22. Production-machine acceptance

The data acquisition machine is not considered physically active merely because workers/classes/contracts exist.

Prove with real durable execution that:
1. a canonical identity triggers full applicable ResearchContract fan-out;
2. multiple independent scopes for one subject can run concurrently;
3. workers finishing a scope immediately lease unrelated next work without waiting for sibling scopes;
4. discovery continues while existing subjects are enriched;
5. each material result preserves evidence lineage and enters independent validation;
6. Gap Detector creates recursive follow-up work from new discoveries;
7. reconciled dynamic scopes become monitoring obligations;
8. monitoring physically detects source/state changes and creates new work;
9. GIS/boundary research proceeds in parallel with dossier research;
10. promise discovery creates evidence-backed commitment records;
11. later evidence can trigger reviewable potential-conflict events;
12. Resource Governor increases/decreases concurrency from measured capacity;
13. the runtime survives interactive Codex/ChatGPT/Google sessions disconnecting;
14. unsupported capabilities remain explicitly blocked rather than fabricated;
15. no duplicate canonical orchestrator or truth authority is created.

## 23. Relationship to existing canon

This contract operationalizes, and does not weaken, the existing ResearchContract, worker, monitoring, evidence, map/GIS, promise and national-expansion contracts.

Where there is ambiguity, existing security, identity, validation, publication, privacy and anti-simulation restrictions retain precedence.
