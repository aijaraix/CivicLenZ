# Agent, Tool, Source & Execution Lineage

## Purpose
CivicLenZ must be able to reconstruct the operational lineage of every material research result across producers and services. This document defines the canonical execution chain, responsibility model, handoff protocol, physical work accounting, and failure localization requirements that implement `RESEARCH_CONTROL_AND_OBSERVABILITY_PLANE.md`.

The objective is not merely to know that a fact exists. The system must be able to determine which research need created the work, which agent/capability executed it, which tools and source families were used, which physical pages/documents/records were inspected, what was extracted or rejected, what evidence was preserved, where the result was handed off, and where any failure occurred.

## Canonical lineage chain
Every material research result should be capable of linking through:

`ResearchNeed -> ResearchWorkIdentity -> ResearchReservation -> Job -> AgentRun -> ToolInvocation -> Source -> Retrieval -> WorkUnit -> ExtractionRun -> Evidence -> Claim/Relationship/EntityCandidate -> Handoff -> ProducerResult -> CanonicalReceipt -> Validation/Reconciliation -> Monitoring -> ProductProjection`

Not every research task will populate every object, but missing/unsupported stages must remain explicit rather than being synthesized.

## Identity domains
Do not overload one identifier for unrelated concerns. Maintain stable identifiers for at least:

- `research_work_identity`: deterministic semantic identity of the work;
- `research_reservation_id`: ownership/lease identity;
- `job_id`: concrete execution request;
- `trace_id`: end-to-end execution lineage;
- `run_id`: one agent/worker execution attempt;
- `span_id`: one meaningful operation within a trace;
- `tool_invocation_id`: one external/tool action;
- `retrieval_id`: one source retrieval;
- `work_unit_id`: page/document/API record/dataset unit where applicable;
- `extraction_run_id`: extraction/normalization operation;
- `evidence_id`: preserved evidentiary artifact/locator;
- `handoff_id`: inter-agent/service transfer;
- `producer_result_id`: Harvester/producer package;
- `canonical_receipt_id`: canonical intake receipt;
- `validation_run_id`: canonical validation/reconciliation attempt;
- `projection_id` or projection refresh identity where useful.

IDs should be propagated rather than regenerated when work crosses process/service boundaries.

## Agent/capability responsibility contract
Each logical agent/capability must declare a machine-readable contract. Minimum fields:

```text
agent_id
agent_name
agent_version
director_or_domain
mission
accepted_job_types
research_contracts_served
required_inputs
expected_outputs
allowed_tools
preferred_tools
fallback_tools
source_classes
handoff_targets
retry_policy
failure_policy
resource_class
monitoring_cadence
academy_metrics
prohibited_actions
```

Examples of logical capabilities include Seat Discovery, Occupancy Discovery, Election Discovery, Candidate Discovery, Candidate Dossier Research, Campaign Finance, Legislative Activity, Vote Collection, Promise/Platform Extraction, GIS/Boundary, Boundary Evolution, Public Finance, Relationship Discovery, Evidence Capture, Source Health, Change Detection, Monitoring, and Gap Detection.

These are accountability domains, not a requirement to create one daemon/process per label.

## Tool and adapter identity
Every meaningful tool invocation must identify the implementation used. Tool registry entries should distinguish:

- deterministic HTTP/API adapters;
- HTML parsers;
- CSV/JSON/XML ingestion;
- GIS adapters;
- PDF/document extraction;
- browser automation;
- search/discovery;
- Gemini/LLM semantic assistance;
- local model utilities;
- canonical validation utilities.

Record tool/adapter/parser/model version and configuration fingerprint where useful for reproducibility. Never store secrets in the fingerprint.

## Tool hierarchy
Prefer the least expensive reliable method appropriate to the scope:

`structured authoritative API -> deterministic adapter`

`official structured file -> deterministic ingestion`

`official stable HTML -> deterministic parser`

`official GIS -> GIS adapter`

`official PDF/document -> document extraction + precise locator`

`public website -> deterministic fetch/parser where stable`

`search -> source discovery`

`browser -> difficult navigation/discovery/access`

`Gemini/LLM -> semantic extraction/reconciliation assistance when deterministic processing is insufficient`

Do not use a model merely because it is available when deterministic processing is reliable. Do not refuse useful browser/model research when deterministic support has not yet been built. Academy should convert recurring stable patterns into deterministic infrastructure.

## Source registry linkage
Every recurring authoritative source should map to a Source Registry entry containing source identity, authority class, jurisdiction/coverage, research domains, access method, endpoint/URL family, format, parser/adapter, cadence, rate-limit/access constraints, last success/failure, schema fingerprint, and legal/effective period where relevant.

Executions should reference `source_id` rather than repeatedly treating the same site as an unknown URL.

## Retrieval event
A retrieval is a physical interaction with a source. Record where applicable:

```text
retrieval_id
trace_id
run_id
agent_id
tool_invocation_id
source_id
requested_url
resolved/canonical_url
request_method
safe query/period metadata
started_at
completed_at
http_status
content_type
byte_length
sha256
cache_state
retry_count
rate_limit_state
access_state
parser_selected
result_state
```

Authentication headers, cookies, tokens, secrets, and sensitive request bodies must not enter ordinary telemetry.

A retrieval counter may only increment when a corresponding retrieval event exists.

## Work-unit accounting
The system must distinguish a retrieved container from the actual units inspected.

### HTML / web
Possible work units:
- page;
- section;
- table;
- row;
- paginated result page;
- linked document.

Track pages discovered, requested, retrieved, parsed, skipped, and failed where the scope makes these meaningful.

### PDF/document
Track document identity, total pages where known, pages inspected, pages parsed, pages failed/skipped, tables/sections inspected, and precise source locators for extracted evidence.

A 200-page PDF retrieval does not mean 200 pages were inspected.

### API / structured dataset
Track endpoint/query period, pagination/cursors, expected units where enumerable, units requested/retrieved/parsed/rejected/missing, and record identifiers.

### GIS
Track layer/service identity, layer version/vintage, feature counts where enumerable, feature IDs processed, geometry hash, spatial-reference metadata, and cross-source reconciliation state.

## ExtractionRun
Each extraction/normalization stage should record:

```text
extraction_run_id
trace_id
run_id
input retrieval/work-unit IDs
extractor/parser ID + version
research scope
started_at/completed_at
facts_candidate_count
claims_candidate_count
relationships_candidate_count
entity_candidates_count
evidence_objects_created
dataset_units_created
duplicates_removed
invalid_items
unsupported_items
identity_ambiguous_items
contradictions_found
warnings
terminal_state
```

These counts are operational measurements only. They do not establish truth or verification.

## Fact/claim lineage
Every extracted fact/claim candidate should retain enough lineage to answer:

- which ResearchContract/scope requested it;
- which extraction run produced it;
- which retrieval/work unit supports it;
- which evidence locator points to the relevant passage/record;
- which producer/agent/tool versions were involved;
- whether the evidence supports, contradicts, contextualizes, or supersedes the candidate;
- current trust/validation state.

Never retain a substantive fact whose only provenance is `Gemini said so`, a search snippet, or a generic homepage when more precise evidence was used.

## Handoff protocol
Material handoffs between agents/services must create receipts. Minimum fields:

```text
handoff_id
trace_id
from_agent_or_service
to_agent_or_service
payload_type
payload_manifest_hash
input_record_count
output_record_count where applicable
sent_at
received_at
acknowledged_at
status
failure_category
retry_count
```

A handoff is not complete merely because the sender attempted delivery. Distinguish SENT, RECEIVED, ACKNOWLEDGED, RETRYABLE_FAILURE, TERMINAL_FAILURE, and SUPERSEDED where applicable.

This applies to internal agent handoffs and cross-system flows such as CivicsLenZz -> HERMES.

## Bridge lineage
The Harvester/HERMES bridge must preserve end-to-end lineage. A canonical receipt should be linkable back to:

`canonical_receipt_id -> producer_result_id -> job_id -> ResearchWorkIdentity -> trace_id -> agent runs -> retrievals -> evidence`

Canonical acknowledgment state must be persisted on the producer side without rewriting the original extraction history.

Bridge authentication failures, contract mismatches, duplicate acknowledgments, backpressure, and canonical conflicts are distinct operational outcomes.

## Failure localization
Failures must identify the narrowest known stage. Example categories include:

- assignment/reservation;
- source discovery;
- DNS/network/TLS;
- HTTP/access/rate limit;
- browser/navigation;
- download/integrity;
- parser/schema drift;
- extraction/normalization;
- identity ambiguity/conflict;
- evidence locator/integrity;
- handoff/queue;
- bridge authentication;
- bridge contract/schema;
- canonical intake;
- canonical validation/reconciliation;
- persistence;
- monitoring;
- product projection.

Each failure record should retain retryability, first/last occurrence, attempt count, affected work/scope, safe error details, upstream/downstream dependencies, and next action.

A blank profile field must never be the only visible symptom of a failed pipeline.

## Funnel reconciliation
For important pipelines maintain physical funnels that allow loss to be located. Examples:

Candidate filing discovered -> identity candidate -> CandidateCampaign -> campaign site -> dossier scopes -> evidence package -> bridge submission -> canonical receipt -> validation.

Seat discovered -> Occupancy -> Election -> CandidateCampaigns -> boundary -> address-ready -> monitoring.

For each transition, counts must be derived from records and handoff receipts. Large deltas create gap/exception work rather than being hidden.

## Source vs parser vs agent failure
Do not classify every failed extraction as an agent failure. The observability model must distinguish at least:

- source unavailable/degraded;
- access/rate-limit failure;
- source schema changed;
- parser bug;
- tool failure;
- agent routing/decision failure;
- identity ambiguity;
- downstream handoff failure;
- canonical rejection.

This distinction is required for useful Academy improvements.

## Retry lineage
Retries must link to the original job/trace and identify the reason. Do not inflate unique-work metrics by counting retries as new research scopes. Preserve attempt number, backoff, changed tool/source strategy where applicable, and terminal disposition.

## Supersession and bug repair
When an adapter/identity bug is discovered, use lineage to identify affected outputs by agent/tool/parser version and source family. Preserve incorrect prior artifacts for audit where policy requires, mark them superseded/invalid for active use, regenerate affected work, and never silently rewrite history.

The Florida Senate District 34/35 correction is the model: a Seat↔Occupancy mismatch should be traceable to the producing source/parser/mapping and all affected packages should be identifiable.

## Media execution lineage
Image/media discovery follows the same execution model. Every candidate media asset must identify the source page, direct asset URL, retrieval, hash, identity association method, media classification, and provenance/rights metadata required by the media contract. Generic stock-image discovery must never silently satisfy an official/candidate portrait requirement.

## Monitoring lineage
Monitoring checks are executions too. Every check should identify monitored scope, source, previous state/hash, new state/hash, whether a change was detected, whether work was generated, and next check. A heartbeat counter without physical monitoring-check records is not acceptable.

## Resource attribution
Where measurable, attribute resource usage to trace/run/capability/source family/cohort:

- wall-clock duration;
- CPU time;
- peak/average memory where practical;
- bytes downloaded/processed;
- browser minutes/actions;
- Gemini/LLM calls/tokens where available;
- local-model calls;
- queue wait time;
- retries.

Resource telemetry exists to improve safe utilization and method selection, not to create artificial activity.

## Operator trace explorer requirements
The eventual operator UI must support drilling from a Seat/Person/Election/Candidate/fact/job/failure into its lineage. A useful trace view should show:

- research need/scope;
- job/work identity;
- agent/capability and version;
- tools/adapters/parsers;
- sources/retrievals;
- physical pages/documents/dataset units;
- extraction outputs;
- evidence;
- handoffs;
- bridge/canonical receipt;
- validation/currentness;
- failures/retries;
- monitoring state.

Development/operator mode should expose this deeply. Public UX may collapse lineage to concise Sources/Evidence interactions.

## Metrics integrity
Examples of acceptable physical metrics:

- retrieval events;
- unique source records;
- pages actually inspected;
- documents actually parsed;
- bytes actually processed;
- extraction candidates physically emitted;
- evidence objects physically persisted;
- handoffs acknowledged;
- jobs terminally succeeded/failed;
- canonical acknowledgments received.

Do not report `pages scanned`, `facts extracted`, `agents active`, or similar numbers without a reproducible physical definition and backing records.

## Continuous execution
Instrumentation must not turn into a reason to halt useful research. Add lineage incrementally around existing productive paths, prioritize high-value external/handoff boundaries first, and continue unrelated safe work when one traced component is blocked. Successful instrumentation milestones are checkpoints, not stopping conditions.