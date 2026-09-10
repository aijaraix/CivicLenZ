# CivicLenZ Master Autonomous Research Operating Contract

## Status and authority
This document defines the mandatory end-to-end operating contract for CivicLenZ autonomous civic research.

It governs the interaction among canonical CivicLenZ, HERMES Prime, OpenClaw, the Research Work Ledger, schedulers, resource governors, worker/capability implementations, producer systems including CivicsLenZz, deterministic collectors, browser/discovery workers, model-assisted workers, evidence capture, canonical validation, monitoring, failure/incident management, Academy/evolution, storage, bridge transport, operator observability, and product projection.

Implementations may differ physically. They may not diverge semantically from this contract.

The canonical repository is:

`aijaraix/CivicLenZ`

Advance producer systems, including `aijaraix/CivicsLenZz`, are subordinate producers. They may discover, retrieve, parse, extract, stage, package, and monitor. They may not self-declare canonical truth, bypass validation, or publish unreviewed civic assertions as canonical facts.

Google/Gemini, Codex, ChatGPT, browser sessions, notebooks, terminals, and engineering sessions are development/control clients. They MUST NOT be counted as the persistent production orchestrator or as autonomous research workers merely because they invoked code during an interactive session.

## Non-negotiable system outcome
The required outcome is a persistent, observable, evidence-backed autonomous research organization that continuously:

1. discovers civic subjects and researchable events;
2. identifies what should be known about them;
3. compares that requirement against what is physically known and current;
4. generates independent research work for missing, stale, conflicting, or incomplete scopes;
5. routes work to authorized capabilities;
6. retrieves real sources through appropriate tools;
7. preserves raw evidence and provenance;
8. extracts structured claims, entities, relationships, media, boundaries, and records;
9. validates and reconciles canonical state through HERMES/canonical CivicLenZ;
10. monitors dynamic facts over time;
11. detects failures, contradictions, staleness, source drift, and worker starvation;
12. learns from real execution through Academy/evolution;
13. automatically selects the next eligible work;
14. continues even when interactive development sessions are closed or individual research scopes are blocked.

Documentation is not completion. A registered capability is not completion. A passing unit test is not completion. A constructed proof object is not completion. One successful fetch is not completion. One researched official is not completion. A schema-valid Harvester package is not canonical truth.

## Canonical operating loop
The complete research loop is:

```text
DISCOVER
→ ENUMERATE REQUIREMENTS
→ CREATE WORK
→ RESERVE
→ ROUTE
→ RESEARCH
→ RETRIEVE
→ PRESERVE
→ EXTRACT
→ LOCATE EVIDENCE
→ HAND OFF
→ VALIDATE
→ RECONCILE
→ PERSIST
→ PROJECT
→ MONITOR
→ LEARN
→ FIND NEXT GAP
→ REPEAT
```

The loop never terminates globally.

## Top-level runtime topology

```text
                         CIVICLENZ CONTROL PLANE
                                  │
                                  ▼
                            HERMES PRIME
                                  │
                ┌─────────────────┼──────────────────┐
                │                 │                  │
                ▼                 ▼                  ▼
         Research Work       Resource           Monitoring /
            Ledger           Governor           Gap Detector
                │                 │                  │
                └─────────────────┼──────────────────┘
                                  ▼
                              Scheduler
                                  │
                 ResearchWorkIdentity + Reservation
                                  │
                   ┌──────────────┼──────────────┐
                   ▼              ▼              ▼
              Deterministic   Model-assisted   Browser /
                Workers          Workers        Discovery
                   │              │              │
                   └──────────────┼──────────────┘
                                  ▼
                               SOURCES
                                  │
                                  ▼
                              RETRIEVAL
                                  │
                                  ▼
                         RAW EVIDENCE / R2
                                  │
                                  ▼
                             EXTRACTION
                                  │
                                  ▼
                 CLAIMS / ENTITIES / RELATIONSHIPS
                                  │
                                  ▼
                              HANDOFF
                                  │
                                  ▼
                       CANONICAL INTAKE / HERMES
                                  │
                         ┌────────┼────────┐
                         ▼        ▼        ▼
                     Identity  Evidence  Contradiction
                    Resolution Validation Reconciliation
                         └────────┼────────┘
                                  ▼
                        CANONICAL OPERATIONAL STATE
                              / SUPABASE
                                  │
                 ┌────────────────┼────────────────┐
                 ▼                ▼                ▼
              Monitoring       Product           Academy
                              Projection
                 │                                  │
                 └────────────────┬─────────────────┘
                                  ▼
                              NEXT WORK
```

No interactive AI session may substitute for this topology.

## System role definitions

### Canonical CivicLenZ
Owns canonical models, validation policy, identity policy, evidence policy, monitoring requirements, publication policy, product projection rules, canonical ResearchContracts, canonical Work Ledger semantics, and final canonical state.

### HERMES Prime
HERMES Prime is the persistent research orchestrator. It decides what work exists, what is missing, what is stale, what conflicts, what is due, what is urgent, what has dependencies, which capability should perform work, what may execute concurrently, what must wait, what failed, what should retry, what requires escalation, what Academy should inspect, and what work should run next.

HERMES Prime does not automatically perform every retrieval itself. It orchestrates specialized capabilities.

HERMES Prime may not self-declare unsupported civic facts verified.

### OpenClaw
OpenClaw is an execution/runtime component used where configured for agent/workflow execution. It is subordinate to HERMES orchestration and canonical policy. It is not an independent truth authority.

### CivicsLenZz and other producers
Producers may perform high-volume advance discovery and extraction. Their output remains untrusted until canonical processing. All civic output from CivicsLenZz defaults to `extracted_unreviewed` or the equivalent current canonical pre-validation state.

Producers may not directly write canonical production tables unless an explicit canonical contract later authorizes a tightly scoped ingest path. Current default policy is no direct canonical database write.

### Google/Gemini, Codex, ChatGPT and human engineering sessions
These sessions may build, inspect, debug, deploy, test, reconcile, and control the system. They are not the persistent runtime. If closing the interactive session stops research, the autonomous architecture is not operational.

## Data creates work
Whenever a researchable subject or event enters the system, the system MUST automatically determine what applicable research work exists.

Examples of researchable subjects include:

- Seat;
- Person;
- Occupancy;
- Election;
- CandidateCampaign;
- Jurisdiction;
- GovernmentEntity;
- Organization;
- Boundary;
- Program;
- Project;
- source change;
- filing;
- vote;
- public action;
- disclosure;
- vacancy;
- boundary version;
- monitoring event.

The required sequence is:

```text
Subject/Event discovered
→ identify canonical subject/context
→ determine applicable ResearchContract(s)
→ compare required scopes with physical current state
→ create work for missing/stale/conflicting/incomplete scopes
→ queue independent jobs
→ schedule monitoring where applicable
```

A human should not need to say “research this person” after discovery. Discovery itself creates downstream work.

## Subject research fan-out
For an applicable official or candidate, the system MUST independently consider research scopes such as:

- identity;
- public name variants;
- current Seat;
- Seat sought;
- current Occupancy;
- Election;
- CandidateCampaign;
- biography;
- education;
- career;
- prior offices;
- election history;
- campaign history;
- official public contact;
- campaign public contact;
- publicly published official/campaign phone;
- publicly published official/campaign email;
- official website;
- campaign website;
- official social accounts;
- campaign social accounts;
- portrait/media;
- committees;
- leadership roles;
- legislation;
- sponsored/co-sponsored measures;
- roll-call votes;
- executive/government actions;
- appointments;
- budget actions;
- public statements;
- interviews/debates where applicable;
- campaign platform;
- promises/commitments;
- policy positions;
- endorsements;
- campaign committees;
- campaign finance;
- contributions/expenditures;
- financial disclosures;
- ethics disclosures;
- publicly relevant business interests;
- boards/organizations;
- documented donor/PAC relationships;
- documented lobbying relationships;
- documented appointment relationships;
- public contracts/grants where applicable;
- oversight/ethics/court public records where civically relevant;
- district/boundary;
- address readiness;
- constituency data;
- public-resource context;
- monitoring.

These are independent ResearchContract scopes, not one monolithic “research politician” job.

## Contact-information boundary
CivicLenZ may research and preserve appropriately public, civically relevant contact information such as:

- official office phone;
- official office email;
- official contact page;
- campaign phone;
- campaign email;
- campaign contact form;
- public campaign mailing address;
- public committee contact;
- official social profiles;
- campaign social profiles.

Each contact datum requires provenance and currentness. The system must not become a private-person contact-harvesting system merely because a person holds or seeks office.

## Agent/capability terminology
The system MUST distinguish the following concepts.

### Logical capability
A responsibility the system must fulfill, such as `candidate_discovery`, `campaign_finance`, `current_occupancy`, `votes`, `portrait`, or `evidence_capture`.

### Agent/worker
An execution unit capable of fulfilling one or more capabilities.

### Persistent worker
A process or queue consumer that runs independently of an interactive AI session.

### Scheduled worker
A worker activated because a scheduler/cron/monitoring deadline makes work due.

### Event-driven worker
A worker activated because an event or dependency completion creates work.

### Deterministic adapter
Code interacting predictably with an API, HTML structure, file, feed, database, or GIS layer.

### Model-assisted worker
A worker using a local or external model for bounded semantic work.

### Browser worker
A worker using browser automation/navigation when deterministic access is insufficient and allowed.

### Session-invoked function
A function executed only because a Google/Codex/ChatGPT/user session called it. This is not an autonomous worker unless it is also reachable through the persistent scheduler/runtime.

The canonical architecture does not require one persistent process per logical capability. It requires every mandatory responsibility to have a real, owned, observable execution path.

Implementation-specific counts such as “47 capabilities” are not the canonical definition of CivicLenZ.

## Canonical Responsibility Contract
Every logical capability MUST have a machine-readable Responsibility Contract containing at least:

```text
capability_id
name
version
mission
subject_types
ResearchContracts served
accepted_job_types
required_inputs
expected_outputs
preferred_tools
fallback_tools
prohibited_tools
authoritative_source_families
secondary_source_policy
wakeup_mechanisms
queue
dependencies
resource_class
concurrency_policy
retry_policy
dead_letter_policy
handoff_targets
evidence_requirements
currentness_policy
monitoring_cadence
Academy metrics
security permissions
implementation_state
runtime_state
last_real_execution
```

No capability may remain an ambiguous “research agent.”

## HERMES orchestration questions
For every researchable subject, HERMES must be able to determine:

- What should we know?
- What do we know physically?
- What is current?
- What is stale?
- What is partial?
- What is missing?
- What conflicts?
- What evidence exists?
- What evidence is insufficient?
- What can be researched now?
- What must wait on a dependency?
- Which capability owns each eligible scope?
- Which source families should be attempted?
- What should happen next?

These decisions must derive from persistent state, not conversational memory.

## Research Work Ledger
Every meaningful research unit MUST exist as a physical ledger record.

The ledger should support:

```text
ResearchNeed
ResearchWorkIdentity
ResearchReservation
Job
Attempt
Run
Dependency
Priority
Subject
ResearchContract
Scope
Capability
Current state
Next action
Retry state
Evidence/result references
Monitoring state
```

A prompt is not a job. A Markdown TODO is not a job. A capability registry entry is not a job. A durable ledger entry with lifecycle state is work.

## ResearchWorkIdentity
ResearchWorkIdentity MUST prevent unnecessary duplication while preserving legitimate monitoring/retry history.

Identity should include enough context to distinguish:

- subject;
- research scope;
- office type where relevant;
- Election/cycle where relevant;
- dataset/reference period;
- source scope where relevant;
- contract version.

Retries preserve the same underlying ResearchWorkIdentity. Monitoring iterations link to the same scope while creating distinct execution/check records.

CandidateCampaign identity MUST include enough context to prevent cross-office or cross-cycle collisions, including Person, Seat/office type, district where applicable, Election/cycle, and filing authority identity where available.

## Reservations and leases
Before expensive or state-mutating work, workers should acquire a reservation/lease where appropriate. Reservations prevent duplicate concurrent research from masquerading as progress.

Reservations must expire/recover safely after worker failure. Stale leases must not permanently block research.

## Scheduler
The scheduler MUST be work-conserving.

If eligible work exists, dependencies are satisfied, policy allows execution, and resources are available, useful work should be dispatched.

The scheduler may not remain idle because one unrelated job is blocked.

Priority should consider:

- canonical HERMES requests;
- election/event urgency;
- monitoring deadlines;
- staleness;
- ResearchContract gaps;
- frontier/cohort priority;
- source health;
- dependency readiness;
- resource cost;
- queue age;
- Academy remediation;
- validation/reconciliation needs.

## Wake-up model
Workers do not need to poll independently every few seconds.

The persistent scheduler/control plane wakes frequently enough for the required service level and evaluates due/eligible work.

Capabilities may wake through:

- queue message;
- scheduled due-time;
- source-change event;
- Gap Detector output;
- dependency completion;
- frontier backlog availability;
- canonical HERMES assignment;
- monitoring deadline;
- failure retry;
- Academy-approved remediation.

A capability with applicable backlog and no viable wake-up path is not operationally autonomous.

## Agent starvation detection
For each capability, the system MUST compare applicable eligible backlog with recent real executions.

If eligible backlog remains greater than zero and the responsible capability receives no work beyond its service expectation, create:

`AGENT_STARVATION_EXCEPTION`

Investigate:

- scheduler;
- routing;
- queue;
- dependency state;
- Resource Governor;
- source health;
- process liveness;
- incorrect capability ownership;
- session-bound execution.

A live process with no real work is not necessarily a healthy worker.

## Parallelism and failure isolation
Independent scopes SHOULD execute concurrently within Resource Governor and source-policy limits.

The following invariants apply:

```text
one retrieval fails ≠ whole capability fails
one capability fails ≠ whole Person/Seat fails
one research scope fails ≠ all scopes for the subject fail
one subject fails ≠ cohort fails
one source fails ≠ Harvester fails
bridge unavailable ≠ research stops
canonical validation unavailable ≠ extraction stops
```

A blocked scope must block only the smallest dependency-bound work unit.

## Resource Governor
The system MUST not launch every expensive worker against every subject simultaneously.

The Resource Governor allocates capacity across:

- structural frontier discovery;
- first-pass enrichment;
- deep dossiers;
- election/candidate urgency;
- monitoring/currentness;
- failure remediation;
- source-health probes;
- Academy experiments;
- canonical requests.

Cheap deterministic mechanisms are preferred for broad, repeatable work. Browser/model-heavy work is reserved for scopes where it materially improves results.

## Tool authority and escalation
Each capability must declare preferred/fallback tools and prohibited actions.

A typical execution preference is:

```text
authoritative structured API
→ structured file/dataset
→ deterministic HTML parser
→ document/PDF parser
→ GIS adapter
→ browser/discovery
→ local model
→ external model where justified
```

Canonical model escalation should normally favor:

```text
deterministic parser/database logic
→ local model such as Qwen
→ inexpensive external model such as Gemini Flash
→ stronger external reasoning model only when justified
```

Models may assist discovery, classification, extraction, summarization, reconciliation, routing, or anomaly detection. Model output is derivative work and is never primary evidence merely because a model generated it.

## Source Registry
Recurring sources MUST become first-class Source Registry entries.

Suggested fields:

```text
source_id
organization
authority_type
domains_served
jurisdictions
coverage
endpoint_or_page_family
adapter_or_parser
format
access_method
rate_limit_policy
health_state
last_success
last_failure
schema_fingerprint
currentness_characteristics
dependent_capabilities
```

Workers must not repeatedly rediscover stable known sources when a registered deterministic path exists.

Search/browser/model discovery may propose new sources. New recurring authoritative sources should be promoted into the registry after validation.

## Source-health semantics
Health is endpoint/scope-specific.

A domain homepage returning HTTP 200 does not make a failing candidate docket, API, GIS layer, or document endpoint healthy.

Health states should include at least:

- HEALTHY;
- DEGRADED;
- RATE_LIMITED;
- SCHEMA_DRIFT;
- ACCESS_CHANGED;
- UNAVAILABLE;
- UNKNOWN.

UNKNOWN is not HEALTHY.

## Retrieval record
Every material retrieval should create a physical record containing, where applicable:

```text
retrieval_id
trace_id
job_id
ResearchWorkIdentity
agent_or_capability
source_id
requested_url
resolved_url
retrieved_at
HTTP status
content type
ETag
Last-Modified
byte length
SHA-256
raw artifact URI
parser/adapter key and version
result state
```

Secrets must never be stored in retrieval records.

Constructed strings/fixtures must never be represented as real network retrievals.

## Physical work units
Metrics MUST describe actual work performed.

### HTML/web
Count pages actually requested and pages actually inspected separately.

### PDF/document
Track actual document retrieval and actual pages/sections inspected. A 200-page document download does not mean 200 pages were inspected.

### API
Track actual requests, pages/cursors, records returned, records inspected, and reference period where applicable.

### GIS
Track services, layers, features, versions/vintages, and geometry operations actually processed.

### Finance
Track filings, reporting periods, transaction records, committees/entities, and calculations actually processed.

## Storage roles
Canonical storage responsibilities are:

- Supabase: canonical structured operational state and relationships;
- Cloudflare R2: immutable/raw retrieval artifacts and evidence payloads;
- GitHub: code, contracts, schemas, tests, safe fixtures, and documentation—not live civic records.

Producer systems may use local durable staging for jobs/results/evidence manifests until canonical intake is available.

## Evidence chain
Every substantive claim or relationship should support the chain:

```text
Source
→ Retrieval
→ Raw Artifact
→ SHA-256
→ SourceLocator
→ ExtractionRun
→ EvidenceObject
→ Claim / Relationship
→ Validation
→ Projection
```

The system must be able to navigate this chain in both directions for operator auditing.

## SourceLocator requirements
Use the most precise practical locator.

### HTML
- deep URL;
- heading/section;
- table/row/column where applicable;
- element/semantic anchor;
- text/context hash where useful.

### PDF
- document;
- page;
- section;
- table;
- paragraph/line/text anchor;
- optional reliable bounding coordinates.

### API/structured data
- endpoint;
- dataset/version;
- query/reference period;
- record ID;
- JSON pointer/XML path/row key.

### Finance
- filing;
- committee/entity;
- transaction/record;
- reporting period;
- calculation provenance.

### GIS
- service;
- layer;
- feature;
- version/vintage;
- geometry hash;
- legal authority where applicable.

Generic homepages cannot satisfy substantive facts when more precise evidence exists.

## Locator validation
A SourceLocator must be validated against the retrieved/preserved artifact where feasible. The system must not construct a locator string merely because expected text is known in advance.

A locator failure creates an evidence-chain exception and remediation job.

## Extraction versus canonical truth
The system MUST preserve the distinction:

```text
RETRIEVED
≠ EXTRACTED
≠ SCHEMA_VALID
≠ EVIDENCE_BACKED
≠ CANONICAL_RECEIVED
≠ ACCEPTED_FOR_VALIDATION
≠ CANONICAL_VALIDATED
≠ PUBLISHED
```

HTTP success proves retrieval only.

A government domain may increase source authority but does not automatically validate every parsed field.

SHA-256 proves preserved-byte identity, not factual correctness.

Model summaries are derivative artifacts, not primary evidence.

## Canonical validation pipeline
Canonical HERMES should process producer results through stages equivalent to:

```text
INGEST
→ SCHEMA CHECK
→ PRODUCER AUTHENTICATION
→ HASH / ARTIFACT INTEGRITY
→ IDENTITY RESOLUTION
→ SOURCE / EVIDENCE VALIDATION
→ CURRENTNESS
→ CONTRADICTION DETECTION
→ DATASET RECONCILIATION
→ CANONICAL STATE DECISION
→ PUBLICATION ELIGIBILITY
```

No producer may skip or self-complete this pipeline.

## Identity resolution
People must never be merged solely on name.

Applicable identity evidence may include:

- official identifier;
- Seat;
- jurisdiction;
- office class;
- Election;
- CandidateCampaign;
- filing ID;
- campaign/committee ID;
- official URL;
- temporal context;
- biographical corroboration.

Ambiguity fails closed into explicit unresolved state.

## Temporal truth
Dynamic facts require valid-time/currentness semantics.

Use fields such as:

```text
valid_from
valid_to
current_as_of
retrieved_at
first_seen
last_seen
superseded_by
```

A historical source may remain authoritative evidence of past service while being unsuitable evidence of current state.

Source suitability must be claim-type-specific. Current-state claims should prefer authoritative current roster/status sources when available.

## Contradiction handling
Conflicting authoritative evidence must not be silently overwritten or resolved by convenience.

Create a contradiction candidate containing both evidence chains, relevant temporal/source metadata, and reconciliation work.

Harvester producers preserve contradictions as unreviewed candidates. Canonical HERMES decides canonical resolution.

## Failure as persistent state
Failures are persistent operational records, not merely logs.

For every material failure, the system should be able to answer:

- what failed;
- where it failed;
- which ResearchWorkIdentity/job/run was affected;
- which capability/agent/tool/parser/source was involved;
- what entered the stage;
- what exited;
- whether data was lost;
- whether retryable;
- what retry occurred;
- what next action exists;
- whether unrelated work continued.

## Root-cause remediation contract
When an incorrect civic state is detected, the system MUST NOT patch only the visible record unless the issue is truly data-local.

The required sequence is:

```text
Detect discrepancy
→ create incident
→ trace lineage backward
→ identify FIRST incorrect transition
→ identify generalized failure class
→ determine blast radius
→ repair generalized rule
→ invalidate/supersede affected active outputs
→ regenerate through normal pipeline
→ create regression test
→ re-run monitoring/reconciliation
→ close incident only after recovery proof
```

Person-, Seat-, or candidate-specific hard-coded corrections are forbidden except as temporary emergency mitigations that are explicitly labeled, isolated, and scheduled for removal.

## Blast-radius audit
Every generalized data-integrity defect must trigger a targeted search for other records produced through the same vulnerable path.

Examples:

- stale source precedence bug → audit all current-state claims using that precedence path;
- CandidateCampaign key bug → audit all campaigns using the same key function;
- district-number collision → audit office types sharing numeric district identifiers;
- stale handoff bug → audit all outputs generated by affected pipeline version;
- parser drift → audit affected source/version/time window.

## Invalidation and supersession
Incorrect historical outputs are not silently deleted.

Affected outputs should preserve:

- original record/artifact;
- incident link;
- invalidation/supersession reason;
- replacement/research job;
- regenerated successor when available.

Historical auditability is mandatory.

## Handoff receipts
Every material handoff should be observable.

Track:

```text
from
to
trace_id
ResearchWorkIdentity
payload type
manifest/hash
record counts where meaningful
sent_at
received_at
acknowledged_at
status
failure/retry
```

A sender-created receipt alone is insufficient proof that the receiver consumed the handoff. Receiver acknowledgment/persistence should be reconciled where applicable.

## Monitoring model
Monitoring is scope-specific, not Person-global.

Dynamic domains may include:

- Occupancy;
- candidate filing/status;
- Election status;
- campaign finance;
- votes;
- legislation;
- campaign/public sources;
- disclosures;
- relationships;
- boundaries;
- source health;
- public-resource datasets.

Each MonitoringScope should maintain:

```text
subject_id
scope_id
source_ids
capability_id
last_checked
current_as_of
last_change_at
previous_hash
current_hash
next_check
stale_after
monitoring_state
consecutive_failures
```

## Event-first monitoring
Prefer event-driven/change-signal work when authoritative event streams, feeds, filings, or hash changes exist.

Examples:

- new candidate filing → candidate pipeline;
- new finance filing → finance pipeline;
- new vote → vote + promise-evidence work;
- new boundary version → GIS reconciliation;
- new Occupancy/vacancy event → Occupancy + Election research;
- campaign page change → platform/promise extraction;
- source schema change → parser/Academy work.

Heartbeats/backstop sweeps detect missed events, stale scopes, source-health issues, and worker failures.

## Continuous enrichment lifecycle
No dynamic research subject is `DONE_FOREVER`.

The lifecycle is:

```text
MISSING
→ RESEARCH
→ CURRENT_WITH_EVIDENCE
→ MONITOR
→ CHANGE / STALE
→ RESEARCH AGAIN
```

## ResearchContract completeness
Each office/subject class defines applicable research scopes and standards.

Completeness must be tracked separately across:

- Field Coverage;
- Source Coverage;
- Temporal Coverage;
- Evidence Coverage;
- Verification Coverage;
- Freshness;
- Dataset Reconciliation;
- Monitoring Coverage;
- Unresolved Contradictions.

Do not collapse these into one misleading percentage.

## Subject research states
Subjects should use states such as:

- DISCOVERED;
- STRUCTURED;
- FIRST_PASS;
- PARTIALLY_ENRICHED;
- DEEP_RESEARCH_ACTIVE;
- CURRENT_WITH_APPLICABLE_EVIDENCE;
- MONITORED;
- STALE;
- CONFLICTING.

Existence in a ledger does not mean researched.

## Missing-work behavior
For every applicable ResearchContract scope:

```text
missing → create work
complete and fresh → skip until due
stale → refresh
conflicting → investigate
evidence missing → validate/remediate
capability unavailable → remain explicitly incomplete
```

Every applicable missing field/scope should have one of:

- queued work;
- running work;
- retrying work;
- explicit unresolved reason;
- dependency block;
- source unavailable state;
- not applicable state.

An unexplained blank is a control-plane defect.

## Gap Detector
The Gap Detector computes:

```text
ResearchContract expected state
-
physical current evidence/state
=
work backlog
```

The Gap Detector MUST operate across the real subject universe, not only sampled canaries.

It must answer questions such as:

- how many people need biography research;
- how many need official/campaign email research;
- how many need phone research;
- how many need social-source research;
- how many need portrait research;
- how many need campaign finance;
- how many need disclosure research;
- how many need vote history;
- how many need relationship research;
- how many need GIS/currentness research.

Each applicable gap must map to an owned capability and execution path.

## Research depth standard
One successful fact is not domain completion.

Examples:

- Legislation means applicable legislative-record coverage, not one bill.
- Votes means applicable roll-call reconciliation, not one parsed vote.
- Campaign finance means applicable filing/reporting periods and records, not one filing.
- Biography means applicable evidence-backed biographical scopes, not one sentence.
- Relationships means continuing source-family research, not one organization.
- Promises/positions means continuing source discovery, context preservation, and later action linkage.

## Finite dataset reconciliation
For enumerable authoritative universes, completion requires physical reconciliation.

Examples include:

- candidate filings;
- Election results;
- roll-call votes;
- committee assignments;
- executive orders;
- financial disclosures;
- campaign-finance reporting periods;
- registered lobbying records where enumerable.

Track:

```text
expected/enumerated units
retrieved units
parsed units
persisted units
failed units
missing units
cutoff/reference period
```

## Open-ended research domains
Biography, relationships, statements, public commitments, media, and campaign platforms may not have a finite enumerable universe.

These domains use source-family coverage standards, authoritative-source discovery, currentness, diminishing returns, and monitoring rather than claiming absolute exhaustiveness.

## Source discovery loop
The system must be capable of discovering new authoritative sources when gaps require them.

```text
gap
→ source discovery
→ candidate source
→ authority evaluation
→ Source Registry
→ retrieval
→ parser/adapter
→ evidence
```

Repeated useful workflows should be candidates for deterministic adapters through Academy/evolution.

## Media/portrait requirements
No image is better than the wrong image.

Person identity media must not use random stock people, unrelated persons, generated faces, or unverified search thumbnails.

The media chain should include:

```text
Person/CandidateCampaign
→ source context page
→ direct media asset
→ retrieval
→ hash
→ identity association
→ classification
→ rights/usage state
→ currentness
→ public eligibility
```

## Money-domain separation
The system MUST keep separate:

- campaign money;
- public/government money;
- personal/public disclosures;
- lobbying.

Derived financial values require reproducible calculation provenance and reference periods.

## Relationship graph
Relationships may include evidence-backed links among:

- Persons;
- CandidateCampaigns;
- campaign committees;
- donors/PACs;
- organizations;
- businesses;
- lobbyists;
- contractors;
- grantees;
- boards;
- appointments;
- endorsements;
- disclosed interests.

Relationship does not by itself establish motive, corruption, causation, or influence. The system records neutral evidence-backed relationships and leaves unsupported inference out of canonical fact state.

## Territory and constituency research
Versioned geography may link to authoritative civic datasets such as:

- population;
- households;
- voting-age context;
- turnout where authoritative;
- business establishments;
- employment;
- industry;
- income;
- housing;
- education;
- transportation;
- government finance;
- projects;
- grants;
- contracts;
- audits;
- other approved civic indicators.

Always preserve geography, boundary version, reference period, dataset, source, and methodology.

## GIS/address architecture
Address lookup is based on physical address/geographic coordinates and versioned overlapping boundaries, not ZIP-code inference.

The system must support applicable layers such as:

- federal;
- state legislative;
- county;
- county commission;
- municipality;
- municipal ward/council;
- school district;
- special district;
- other elected local geography.

Boundary states should distinguish:

- DIRECT_BOUNDARY_MATCH;
- AUTHORITATIVE_LOOKUP;
- INFERRED;
- UNRESOLVED.

Inferred geography must never be presented as authoritative.

## Boundary/Seat evolution
Seats and boundaries change over time.

Boundary research must track:

- source authority;
- legal plan/version;
- operational geometry;
- effective dates;
- geometry hashes;
- supersession;
- affected Seats/Elections/address lookups.

Boundary changes generate reconciliation and monitoring work rather than requiring manual intervention.

## Academy/evolution
Academy operates on real telemetry and production outcomes.

The loop is:

```text
EXECUTE
→ OBSERVE
→ MEASURE
→ IDENTIFY FAILURE / QUALITY / COST / YIELD PATTERN
→ ACADEMY CASE
→ HYPOTHESIS
→ PROPOSE IMPROVEMENT
→ TEST
→ REGRESSION VALIDATION
→ CONTROLLED PROMOTION
→ OBSERVE AGAIN
```

Academy may improve:

- parsers;
- source discovery;
- routing;
- retry strategy;
- caching;
- ResearchWorkIdentity;
- source precedence;
- model routing;
- cost;
- latency;
- evidence locator quality;
- deterministic adapter coverage.

Academy may not independently weaken or rewrite canonical truth, evidence, validation, privacy, security, or publication standards.

## Academy evidence requirements
Academy must distinguish:

- REAL_PRODUCTION_CASE;
- TEST_CASE;
- FIXTURE_CASE.

Promotions based only on fixtures are insufficient for high-impact production changes. Real runtime outcomes and regression tests are required where practical.

## Security architecture
Mandatory principles include:

- least privilege;
- service-specific credentials;
- no secrets in Git;
- no secrets in telemetry;
- no unnecessary secret exposure to model prompts;
- authenticated service-to-service traffic;
- rate limiting;
- CORS allowlists where relevant;
- local-only model interfaces by default;
- separate producer/canonical permissions;
- no direct Harvester canonical DB writes by default;
- immutable evidence hashes;
- audit logging;
- credential rotation procedures;
- scoped worker permissions;
- deny-by-default behavior for privileged operations.

Harvester producers may not:

- publish canonical truth;
- directly promote extracted data to verified;
- override canonical identity;
- override validation policy;
- override publication policy;
- bypass canonical contradiction handling.

## Secret handling
Secrets must live only in approved secret stores/environment/service credential mechanisms.

Never place secrets in:

- repository files;
- evidence objects;
- telemetry;
- logs;
- error messages;
- public dashboard output;
- prompts unnecessarily;
- persistent Git remote URLs.

Security failures must create appropriate incidents without echoing secret material.

## Producer independence
Advance producers must continue useful work during canonical outages.

Expected behavior:

```text
producer researches continuously
→ persists extracted_unreviewed results
→ builds deterministic bridge-ready package
→ canonical unavailable?
→ retains package durably
→ continues unrelated research
→ retries under bounded policy
```

When canonical intake returns, producers deliver backlog idempotently.

## HERMES bridge contract
Bridge payloads should carry enough information to preserve:

- producer identity;
- contract/schema version;
- ResearchWorkIdentity;
- trace lineage;
- subject context;
- claims/entities/relationships;
- evidence manifests;
- hashes;
- source/currentness metadata;
- extraction status.

Canonical responses should preserve states including equivalents of:

- ACCEPTED_FOR_VALIDATION;
- DUPLICATE;
- NEEDS_IDENTITY_RESOLUTION;
- NEEDS_MORE_EVIDENCE;
- PARTIALLY_ACCEPTED;
- REJECTED_SCHEMA;
- REJECTED_POLICY;
- RETRY_LATER;
- CANONICAL_CONFLICT.

Transport acknowledgment is not canonical validation.

## Runtime durability
The autonomous research system MUST continue when:

- Google/Gemini chat closes;
- ChatGPT closes;
- Codex pauses;
- browser windows close;
- an operator logs out;
- an individual worker crashes;
- a source becomes temporarily unavailable;
- canonical intake becomes temporarily unavailable.

Persistent runtime state should survive ordinary supervised process/server restart where the deployment architecture supports restart recovery.

Durable state includes:

- queued work;
- active reservations/leases;
- retry state;
- monitoring deadlines;
- failure/incident state;
- bridge backlog;
- Academy cases;
- coverage/gap state;
- evidence/result references.

## Process supervision
Every persistent runtime component should expose or record:

```text
service/process identity
runtime/PID identity where applicable
start time
heartbeat
supervisor/autostart mechanism
restart policy
health endpoint or health state
queue connection
last successful work
last failure
```

Deployment technology may vary: systemd, Docker/Compose, Cloudflare Workers/Queues, or another approved mechanism. The behavioral contract is mandatory even when the process topology differs.

## Session-independence acceptance test
To prove autonomy, an audit must be able to capture physical counters/state at time A, avoid invoking manual research functions through the interactive session, then observe new scheduler-generated work at time B.

Evidence of autonomy may include:

- new jobs created;
- new monitoring checks;
- new retrievals;
- new evidence;
- new Gap Detector jobs;
- new completed work;
- new Academy observations.

If no eligible work advances without interactive invocation, investigate orchestration placement.

## Agent/capability active-state definition
A capability is not ACTIVE merely because code exists or a process is alive.

ACTIVE requires recent real execution appropriate to the capability, including where applicable:

```text
actual job
→ actual tool/source activity
→ actual output
→ actual persistence/handoff
```

Possible runtime states include:

- ACTIVE;
- IDLE_NO_ELIGIBLE_WORK;
- STARVED_BY_UPSTREAM;
- DEGRADED;
- FAILED;
- DISABLED.

## Operator liveness metrics
The operator surface should expose physical metrics including:

- scheduler heartbeat;
- last job created;
- last job completed;
- last retrieval;
- last evidence created;
- last monitoring check;
- last Gap Detector run/job;
- last Academy observation;
- queued work;
- running work;
- retry work;
- dead-letter work;
- starved capabilities;
- failed capabilities;
- source-health summary;
- bridge backlog;
- canonical intake state.

## Enrichment metrics
The operator surface should make subject enrichment observable.

Examples:

- people known;
- people with applicable biography evidence;
- people missing biography;
- people with public official email;
- people with public official phone;
- people with official social sources;
- candidates with campaign website;
- candidates with current campaign-finance coverage;
- officials with applicable vote-history coverage;
- people with verified portraits;
- subjects with relationship evidence;
- subjects with deep-dossier current state;
- subjects stale;
- subjects conflicting;
- subjects awaiting canonical validation.

All counts must derive from physical records and versioned MetricDefinitions.

## Coverage truth
The system MUST distinguish:

- STRUCTURAL_DISCOVERY;
- FIRST_PASS_RESEARCH;
- DEEP_DOSSIER_RESEARCH;
- CURRENT_MONITORING;
- CANONICAL_VALIDATION;
- PUBLICATION.

A Seat existing in a ledger does not imply deep-dossier completion.

A schema-valid bridge package does not imply canonical validation.

## System alive acceptance criteria
The autonomous research organization is not considered operationally alive unless physical evidence demonstrates all applicable criteria:

- persistent orchestrator active;
- scheduler active independently of interactive sessions;
- durable queue/backlog;
- real work generated automatically;
- real capabilities consuming work;
- real sources retrieved;
- raw evidence preserved;
- claims/relationships extracted;
- handoffs consumed/acknowledged;
- missing scopes generating new work;
- failures isolated;
- unrelated work continuing during failures;
- monitoring generating recurring work;
- Gap Detector generating work;
- Academy receiving real production outcomes;
- runtime surviving interactive-session closure;
- GitHub not used as live research storage;
- bridge backlog surviving canonical outage;
- starvation detection functioning;
- operator metrics derived from physical events.

## Conformance matrix
Google/CivicsLenZz, Codex/canonical CivicLenZ, and future execution environments MUST be able to produce a conformance matrix of the form:

```text
REQUIREMENT
CANONICAL CONTRACT
IMPLEMENTATION COMPONENT
RUNTIME OWNER
STATUS
PHYSICAL PROOF
GAP
REMEDIATION
```

The purpose is to keep multiple implementations aligned to one canonical system rather than allowing each environment to invent its own interpretation.

## Implementation-state taxonomy
For architecture and runtime audits, use states such as:

- DEFINED;
- IMPLEMENTED;
- TEST_PROVEN;
- LIVE_SOURCE_PROVEN;
- AUTONOMOUS_RUNTIME_PROVEN;
- MONITORING_PROVEN;
- DEGRADED;
- FAILED;
- BLOCKED;
- NOT_APPLICABLE.

Do not promote a state merely because a lower-level criterion passed.

## Required implementation sequence
Implementations must proceed in this order where dependencies require it:

```text
architecture/contracts
→ persistent state models
→ scheduler/work ledger
→ capability ownership
→ source/tool adapters
→ retrieval/evidence
→ extraction
→ handoffs
→ canonical intake/validation
→ monitoring
→ Gap Detector
→ Academy
→ operator observability
→ continuous autonomous operation
```

Work that can safely proceed independently should proceed in parallel.

## Non-blocking continuation rule
A checkpoint is not a stopping condition.

For every eligible milestone:

```text
FETCH / RECONCILE
→ IMPLEMENT / RESEARCH
→ VERIFY
→ TEST
→ FIX
→ PERSIST
→ COMMIT where source changed
→ PUSH where authorized
→ VERIFY REMOTE
→ CONTINUE
```

Stop only for a genuine human-only gate or a safety/policy condition that cannot be resolved autonomously.

If one scope is blocked, all other safe independent scopes continue.

## Required audit questions
Any comprehensive operational audit must answer at least:

### Runtime
- Is the orchestrator persistent?
- Is the scheduler alive?
- Is the queue durable?
- Does research continue without Google/Codex/chat open?
- Does supervised restart preserve work?

### Work generation
- Does every new subject fan out into applicable ResearchContract scopes?
- Do missing/stale/conflicting scopes create real jobs?
- Are applicable gaps unexplained anywhere?

### Agents/capabilities
- Which logical responsibilities exist?
- Which physical workers execute them?
- What wakes each worker?
- What tools/sources may each use?
- Which have recent real jobs?
- Which have eligible backlog but no work?

### Research quality
- Are finite datasets reconciled physically?
- Are open-ended domains using explicit source-family depth standards?
- Are evidence locators real and validated?
- Are historical/current facts separated correctly?

### Failure isolation
- Does one failure block only the smallest necessary scope?
- Can lineage locate the first incorrect transition?
- Is blast radius audited?
- Does remediation fix the generalized rule?

### Validation
- Are extraction and canonical verification separate?
- Are contradictions preserved?
- Are identity ambiguities failing closed?

### Monitoring
- Are dynamic scopes current?
- Are stale scopes reopened automatically?
- Are source changes/events generating research?

### Academy
- Is Academy using real production telemetry?
- Are changes tested and governed?

### Security
- Are secrets isolated?
- Are permissions least-privilege?
- Can producers bypass canonical truth controls? They must not.

## Final doctrine
CivicLenZ is not a static database populated by occasional manual research sessions. It is a continuously operating research organization.

The permanent Seat and its associated Persons, Occupancies, Elections, CandidateCampaigns, boundaries, organizations, public-resource context, evidence, and historical state form a living civic knowledge graph.

The system MUST continuously discover what exists, determine what should be known, create missing research work, route that work to authorized reusable capabilities, retrieve real authoritative/public sources, preserve exact evidence and provenance, build structured knowledge, validate canonical state, monitor changes, learn from operational outcomes, and continue automatically.

The question is never merely “how many agents do we have?”

The canonical question is:

**Does every required research responsibility have a real, persistent, observable, evidence-producing execution path that is consuming the real backlog and keeping civic knowledge current?**

That is the acceptance standard for the CivicLenZ autonomous research organization.