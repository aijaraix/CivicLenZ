# CivicLenZ Behavioral Execution Proof & Anti-Simulation Contract

## 1. Purpose

This contract defines what CivicLenZ accepts as proof that a capability, agent, worker, source adapter, queue, scheduler, monitor, bridge, validator, Academy mechanism, deployment, or other subsystem actually executed its intended production behavior.

It exists because an implementation can match the vocabulary, class names, interfaces, status strings, traces, tests, metrics, or file layout of an architecture while failing to perform the operational behavior the architecture requires.

This contract therefore governs both implementation and verification.

It applies to:

- canonical CivicLenZ;
- HERMES Prime;
- OpenClaw;
- local models including Qwen;
- Cloudflare Workers, Queues, scheduled jobs and related execution fabric;
- Supabase persistence and canonical state;
- R2 evidence storage;
- canonical intake and validation services;
- CivicsLenZz / Google / Gemini Harvester;
- Codex implementation work;
- future research producers;
- future worker implementations;
- operator dashboards and metrics;
- Academy learning and promotion;
- test and proof infrastructure.

This contract is intentionally stricter than ordinary unit-test acceptance.

Its central rule is:

> A system may not prove that it performed a behavior merely by creating an object, string, status, trace, metric, file, hash, or test assertion that says the behavior occurred.

## 2. Core doctrine

The following statements are normative:

- Naming is not execution.
- Configuration is not execution.
- Registration is not execution.
- Instantiation is not execution.
- Persistence is not verification.
- A status string is not proof.
- A trace ID is not proof that the traced operation happened.
- A heartbeat is not a dispatch.
- A timer firing is not useful autonomous work.
- A queue depth counter is not proof that a durable queue exists.
- A local build is not deployment.
- A local commit is not remote GitHub durability.
- A generated file path is not proof that a file exists.
- A generated SHA-256 value is not proof that source bytes were retrieved.
- A generated EvidenceObject is not proof of evidence collection.
- A test fixture is not production work.
- A schema-valid package is not receiver acknowledgement.
- A sender-created receipt is not receiver acknowledgement.
- A producer-created verification flag is not canonical validation.
- A source registered as healthy is not proof that it was checked.
- A monitoring configuration is not a monitoring check.
- A model response is not primary civic evidence.
- A successful-looking fallback is not successful execution.
- An audit produced by the same component under test is not independent verification.
- A Google/Gemini/Codex report is not physical production evidence.

## 3. Required proof sequence

Every material production claim must follow this sequence:

`REQUIRED_BEHAVIOR -> ACTUAL_EXECUTION -> DURABLE EVIDENCE -> INDEPENDENT VERIFICATION -> CLAIM`

The sequence must not be reversed.

The system must not create the final `CLAIM` first and then generate evidence-shaped artifacts to justify it.

## 4. Execution-state ladder

Every operational requirement must be classifiable through the following states:

1. `DECLARED`
   - documented, configured, or registered;
   - no implementation proof required yet.

2. `IMPLEMENTED`
   - production-reachable code exists;
   - code inspection proves more than a placeholder or stub.

3. `CONNECTED`
   - the implementation is connected to the real production entrypoint, scheduler, queue, API, event, or consumer path.

4. `EXECUTED`
   - the connected implementation has processed a real production or explicitly controlled live-canary input.

5. `PERSISTED`
   - required durable outputs physically exist in the correct persistence system.

6. `CONSUMED`
   - the intended downstream component physically consumed or acknowledged the output.

7. `INDEPENDENTLY_VERIFIED`
   - a separate verification boundary confirmed the relevant behavior or result.

8. `MONITORED`
   - the behavior remains under longitudinal observation and can generate follow-up work when it changes or fails.

No stage may be inferred solely from the existence of a later-sounding status label.

## 5. Evidence strength levels

Use the following proof levels when reporting capabilities:

- `P0_DOCUMENTED`
- `P1_IMPLEMENTED`
- `P2_CONNECTED`
- `P3_REAL_EXECUTION`
- `P4_DURABLE_OUTPUT`
- `P5_DOWNSTREAM_CONSUMED`
- `P6_INDEPENDENTLY_VERIFIED`
- `P7_LONGITUDINALLY_MONITORED`
- `P8_FAILURE_RECOVERY_PROVEN`
- `P9_RESTART_SURVIVAL_PROVEN`

A capability must report its actual achieved level.

Do not report `PASS` when the required acceptance level is higher than the achieved proof level.

## 6. Independent attestation principle

Whenever technically possible, the component producing an event must not be the sole component certifying that event's downstream consequence.

Examples:

- producer may state `SENT`;
- receiver must state `RECEIVED`;
- persistence layer or receiver must state `DURABLY_STORED`;
- validator may state `VALIDATION_PASSED`;
- canonical authority may state `CANONICAL_ACCEPTED`;
- projection/publication layer may state `PUBLISHED`;
- monitoring system may state `CURRENT_AS_OF`.

No single process may write the entire transaction narrative and treat it as independent proof.

## 7. Prohibited self-certification

Production code MUST NOT establish success solely by setting fields such as:

- `verified=true`;
- `zero_synthetic_verified=true`;
- `acknowledged_by_consumer=true`;
- `canonical_validated=true`;
- `monitoring_proven=true`;
- `autonomous_runtime_proven=true`;
- `healthy=true`;
- `complete=true`;
- `deep_research_complete=true`;
- `production_verified=true`;

unless the value is derived from a separate physical event or authority that is explicitly identified and traceable.

A producer may report its own local state, for example `PACKAGE_PREPARED`, but may not certify remote receipt.

## 8. Prohibited synthetic production fallbacks

Production execution paths MUST NOT convert a failed source/tool/model/network operation into successful-looking production output by manufacturing:

- HTTP 200 status;
- response bodies;
- response byte counts;
- latency values;
- headers;
- source content;
- retrieved records;
- evidence text;
- extracted facts;
- source locators;
- source-health observations;
- downstream acknowledgements;
- canonical receipts;
- successful model responses;
- human approval language.

Fallbacks may exist only if they are truthfully classified, such as:

- `SOURCE_UNAVAILABLE`;
- `NETWORK_FAILURE`;
- `MODEL_UNAVAILABLE`;
- `RETRY_PENDING`;
- `DEGRADED_MODE`;
- `UNKNOWN`.

A fallback may provide diagnostic explanation, but it may not masquerade as successful production work.

## 9. Synthetic and fixture data isolation

Synthetic, demonstration, test, benchmark, fixture, and golden-answer data must be physically and logically isolated from production paths.

Requirements:

- production code cannot silently consume golden expected answers;
- production metrics exclude fixture/test records;
- production dashboards must distinguish synthetic execution if it is intentionally displayed;
- production Academy learning excludes fabricated cases;
- test files must not be imported by production runtime;
- fixture directories must not be on production lookup paths unless an explicitly controlled test mode is active;
- test mode must fail closed if accidentally enabled in production.

## 10. Hard-coded expected-value prohibition

Generic production paths MUST NOT contain hard-coded expected civic facts, expected selected persons, expected officeholders, expected current state, expected evidence text, expected source hashes, expected selectors, or expected output values solely so that tests or audits pass.

Known real entities may appear in fixtures and regression tests, but:

- the generic production logic may not branch on those identities to manufacture the expected answer;
- the same generic logic must work for subjects not named in the regression suite;
- population-wide repair must use the generalized mechanism.

## 11. Physical retrieval proof

A real retrieval requires all applicable physical facts:

- source/endpoint identity;
- request timestamp;
- actual network/tool invocation;
- returned status/result;
- retrieved bytes or structured records;
- actual byte length or record count;
- content hash computed from the retrieved material;
- source metadata;
- persistence or durable reference to the raw result where required;
- execution lineage.

A hash calculated from strings such as:

`live_bytes_<capability>_<subject>`

or other descriptive/generated text is not retrieval proof.

## 12. Artifact persistence proof

A system may not claim an artifact was persisted solely because it generated a path or URI.

For required durable artifacts, proof should include as applicable:

- actual storage write result;
- storage key/path;
- file/object existence;
- byte size;
- hash;
- write timestamp;
- storage system identity;
- read-back verification where required.

Examples include R2 evidence objects, local durable bridge spool files, Supabase rows, JSON/SQLite runtime ledgers and deployment artifacts.

## 13. Hash integrity rule

SHA-256 or equivalent integrity digests must be calculated from the exact physical bytes or canonical serialized payload they purport to identify.

Do not calculate evidence hashes from:

- invented source content;
- source descriptions;
- expected facts;
- labels;
- IDs alone;
- generated placeholder bodies.

A verifier should be capable of recomputing the digest from the preserved artifact.

## 14. Precise evidence rule

A valid civic EvidenceObject must trace to the supporting location in the retrieved source.

Where technically possible, the evidence locator must identify:

- exact page/subpath;
- PDF page;
- table/row/cell;
- DOM selector;
- structured API record key;
- GIS feature identifier;
- text anchor;
- source snapshot version.

A root homepage is not adequate when a precise supporting page is available.

A generated selector marked `verified` without inspection of the source artifact is not proof.

## 15. Claim provenance chain

Material claims should be reconstructable through:

`Claim -> EvidenceObject -> ExtractionRun -> SourceLocator -> RawArtifact -> Retrieval -> Source`

If any required link is missing, the claim's evidence state must accurately indicate that deficiency.

## 16. Queue proof

A queue is not proven by an integer counter, array length, class name, or field called `queue`.

For a material queue, proof requires as applicable:

- physical queue/store identity;
- durable enqueue event;
- unique work identity;
- consumer receipt/lease;
- visibility/lease semantics;
- acknowledgement/completion;
- retry behavior;
- dead-letter behavior;
- idempotency;
- persistence across restart where required.

Queue acceptance tests must verify movement through producer and consumer boundaries.

## 17. Scheduler proof

A scheduler is not autonomous merely because:

- a heartbeat executes;
- a timer increments;
- a state string changes;
- `START_NEW_CASE` or similar state is produced;
- a polling loop wakes up.

Scheduler proof requires:

`eligible durable work -> scheduling decision -> reservation/lease -> dispatch -> worker execution`

and, after completion:

`state transition -> next eligible work selection`.

The scheduler must be demonstrably work-conserving subject to policy and Resource Governor limits.

## 18. Autonomous-runtime proof

Autonomous runtime means useful production work continues without requiring:

- an open Gemini session;
- an open Codex session;
- an open ChatGPT session;
- an operator browser;
- an interactive terminal;
- a manually repeated prompt.

Proof must identify the physical persistent mechanism, such as systemd service, persistent queue consumer, Cloudflare scheduled worker, or equivalent production supervisor.

An interactive AI session must not be the hidden orchestrator.

## 19. Observer versus executor distinction

A runtime that observes, inventories, reports, or monitors work is not automatically an executor.

Reports must distinguish:

- `OBSERVER_ONLY`;
- `PLANNER_NO_DISPATCH`;
- `DISPATCHER`;
- `QUEUE_CONSUMER`;
- `WORKER_EXECUTOR`;
- `VALIDATOR`;
- `MONITOR`.

A service named `HERMES Prime` may not be reported as the full autonomous executive if its deployed behavior is observation-only.

## 20. Worker proof

A worker capability is proven only when the production path establishes:

- worker identity/type;
- source implementation;
- wakeup/dispatch source;
- input work identity;
- tool/source/model used;
- real execution result;
- durable output;
- handoff destination where applicable;
- failure state;
- monitoring/liveness.

A synchronous callback that simply returns predetermined JSON is not an autonomous worker.

## 21. Capability-cloning prohibition

One executed proof object must not be copied, relabeled, or parameter-substituted to claim multiple independent capability executions.

If multiple logical capabilities share a single physical execution, the report must say so and explain which requirements that execution legitimately satisfies.

Distinct capability proof requires distinct applicable behavior, not only distinct labels.

## 22. Tool-use proof

A tool is considered used only if the actual tool invocation occurred and its output materially participated in the execution path.

Examples:

- starting Chrome is not proof that the browser was used;
- generating a browser-step description is not DOM manipulation;
- issuing a direct HTTP API request from browser context is not equivalent to proving a customer UI journey;
- instantiating an OpenClaw client is not proof of OpenClaw execution;
- defining a Gemini/Qwen route is not proof that a model handled the task.

## 23. Browser proof

When a requirement specifically requires a browser or product UI journey, proof must establish real browser interaction such as applicable:

- page navigation;
- DOM inspection;
- element selection;
- user-like action;
- resulting page state;
- relevant network/result state;
- screenshot/DOM/state artifact when required.

Do not substitute direct backend API calls for UI proof unless the acceptance contract explicitly allows API-level verification.

## 24. Model-execution proof

If a report says a model executed a task, retain telemetry sufficient to identify:

- routing decision;
- provider/model;
- request timestamp;
- job/work identity;
- request success/failure;
- response/result linkage;
- token/resource accounting where available;
- fallback behavior.

If model invocation failed, the task must not be reported as model-completed because deterministic fallback prose was returned.

## 25. Model output is not evidence

Model-generated assertions are research hypotheses or extracted interpretations unless backed by source evidence.

No LLM may become the primary source for a civic claim.

## 26. Handoff proof

A handoff requires both sides when applicable:

Sender evidence:
- payload identity;
- content hash;
- send attempt;
- timestamp;
- destination.

Receiver evidence:
- receipt/correlation identity;
- received hash or manifest reconciliation;
- acknowledgement state;
- durable storage state where required.

The sender may not create `acknowledged_by_consumer=true` in lieu of receiver evidence.

## 27. Producer bridge proof

For CivicsLenZz and future producers:

- package creation may establish `RESULT_READY` or equivalent local state;
- authenticated transmission may establish `SENT`;
- only receiver evidence may establish `CANONICAL_RECEIVED`;
- only canonical processing may establish `ACCEPTED_FOR_VALIDATION`;
- only canonical validator/authority may establish `CANONICAL_VALIDATED`;
- only publication/projection authority may establish `PUBLISHED`.

A producer must never promote itself across these boundaries.

## 28. Canonical validation proof

Canonical validation requires real canonical-side processing through the configured validation path.

Local schema validation, HMAC sealing, evidence hashing, or producer checks are insufficient.

## 29. Source-health proof

A source registry entry must distinguish:

- `REGISTERED`;
- `UNKNOWN`;
- `CHECK_PENDING`;
- `HEALTHY_OBSERVED`;
- `DEGRADED_OBSERVED`;
- `UNAVAILABLE_OBSERVED`.

Do not prepopulate empirical fields such as:

- `last_success_at`;
- measured latency;
- schema fingerprint;
- compatibility status;
- response status;

and later count them as real monitoring observations unless they came from physical checks.

## 30. Monitoring proof

Monitoring is proven through repeated real checks over time.

For dynamic state, monitoring evidence should establish:

`previous state/hash -> later physical check -> changed/no-change decision -> currentness state -> next action`

A registered endpoint or configured cadence alone is not monitoring proof.

## 31. Change-detection proof

When monitoring claims a change:

- old physical state must exist;
- new physical state must exist;
- comparison logic must be identifiable;
- relevant difference must be persisted;
- follow-up reconciliation work must be generated where required.

Do not manufacture a change event solely to exercise downstream code and count it as production monitoring.

## 32. Gap Detector proof

A Gap Detector must calculate gaps against real persisted subject/evidence state.

Proof requires:

`ResearchContract requirement - qualifying current evidence = gap`

followed by a durable work item or explicit non-actionable reason.

A preconstructed list of expected gaps is not population-wide gap detection.

## 33. Completeness denominator independence

A subsystem being evaluated for completeness should not be allowed to manufacture both:

- the expected denominator; and
- the completed numerator.

For finite domains, expected universes should come from an authoritative enumeration, independent registry, statutory definition, or separately validated inventory.

Examples:

- all candidates in an election;
- all roll calls in a session;
- all filings in a reporting period;
- all seats in a jurisdiction;
- all required disclosure documents.

Sampling does not establish finite-dataset completeness.

## 34. Derived metric proof

Every operator metric must identify:

- physical source/store;
- query/derivation;
- denominator;
- applicability rule;
- currentness rule;
- exclusions;
- synthetic/test exclusion;
- update timestamp.

A metric value hard-coded into an object or initialized as a default is not a production metric.

## 35. Counter integrity

Counters such as:

- jobs completed;
- retrievals;
- pages inspected;
- facts extracted;
- evidence objects;
- handoffs;
- monitoring checks;
- Academy cases;

must be derived from physical event/ledger records where practical.

Code that merely performs `counter++` during a proof-generation function cannot by itself establish production activity.

## 36. Page/document accounting

`pages_inspected`, `documents_parsed`, `API_records_processed` and similar physical-work metrics must reflect actual processing operations.

Do not infer inspected pages from document page count or generated estimates.

## 37. Research depth proof

Deep research must be derived from actual applicable ResearchContract scope satisfaction and evidence/currentness requirements.

It must not be assigned because:

- a threshold number of arbitrary files exists;
- a proof generator sets `deep=true`;
- a sample has a small number of evidence categories;
- a subject appears in a curated demonstration list.

## 38. Academy anti-simulation rule

Academy learning must not be self-authored performance theater.

A genuine Academy lifecycle is:

`real production observation -> case -> hypothesis/proposal -> isolated test -> regression validation -> controlled promotion/rejection -> subsequent production observation`

The system must not pre-fill:

- agent competency;
- accuracy score;
- jobs completed;
- success history;
- source reliability score;
- promotion history;

and then display those values as empirical learning.

## 39. Academy benchmark isolation

Golden benchmark answers must not be exposed to the same solver that is being evaluated against them.

Where independent evaluation is claimed, maintain separation between:

- solver inputs;
- hidden expected result/evaluator;
- evaluation computation.

## 40. Academy promotion authority

Academy may propose and test improvements, but high-impact changes require the governance level specified by canonical contracts.

Academy cannot silently weaken:

- evidence standards;
- legal semantics;
- identity rules;
- privacy/security boundaries;
- canonical validation;
- publication policy.

## 41. Human-action truth

If human approval, review, CPA review, operator acceptance, counsel review, or other human action is required, the system must not generate synthetic human approval language.

Valid states include:

- `HUMAN_REVIEW_REQUIRED`;
- `AWAITING_OPERATOR`;
- `NOT_REVIEWED`.

## 42. Deployment proof

Code is deployed only when the intended production runtime is physically running the intended deployment artifact.

Proof should establish:

- repository;
- branch/ref;
- implementation commit;
- build/image/artifact digest where applicable;
- deployment timestamp;
- host/runtime;
- service/container/process identity;
- loaded configuration;
- current PID/runtime ID where applicable.

A Google AI Studio local worktree or unpushed commit is not deployed source.

## 43. GitHub durability proof

When GitHub is the durable source-of-truth for code/documents, distinguish:

- local workspace HEAD;
- remote GitHub HEAD;
- deployed runtime source/build;
- working-tree changes;
- unpushed commits.

A local SHA must not be reported as the remote canonical SHA until remote verification succeeds.

## 44. Runtime-source proof

A production process must be traceable to the implementation it is executing.

Where practical capture:

- executable path;
- command line;
- service/container definition;
- source/build version;
- loaded config version;
- startup time.

## 45. Loaded-versus-disk configuration drift

For supervised services, distinguish:

- configuration/unit definition on disk;
- configuration loaded by supervisor;
- process actually running.

If a unit file changes on disk after systemd loads it, do not claim the process is using the new definition until reload/restart/reconciliation proves it.

Create a deployment/config drift event where applicable.

## 46. Duplicate-runtime prohibition

Before activating a replacement scheduler, orchestrator, validator, monitor, worker pool or other truth-producing runtime:

- enumerate existing versions;
- identify active processes;
- identify active schedules/queues;
- identify state stores;
- verify cutover;
- retire or isolate superseded runtime;
- prove no duplicate truth-producing path remains reachable.

Do not preserve old and new truth-producing runtimes simultaneously unless explicitly designed for safe redundancy with a single ownership/lease mechanism.

## 47. Single-writer / single-authority rule

For authoritative mutable state, there must be a clearly defined writer/authority boundary.

Multiple producers may submit research, but producers must not compete with canonical validation or scheduler authority.

## 48. Shadow implementation detection

Audits must search for:

- duplicate classes;
- obsolete schedulers;
- old entrypoints;
- old services;
- alternative API routes;
- old worker versions;
- test/demo code imported into production;
- hidden local data stores;
- abandoned but reachable validation logic.

A corrected visible implementation does not establish safety if an older parallel implementation remains reachable.

## 49. Production entrypoint tracing

For each critical capability, prove the path from actual production entrypoint to the implementation being credited.

Example:

`systemd/Cloudflare cron/API/event -> runtime entrypoint -> scheduler/consumer -> worker -> output`.

Code unreachable from a production entrypoint is `IMPLEMENTED_NOT_CONNECTED`.

## 50. Server/container/process topology proof

Every critical runtime must be represented in a physical topology registry including:

- host;
- service/container/process;
- user/service identity;
- source/build;
- ports/network bindings;
- dependencies;
- state store;
- resource limits;
- supervisor;
- restart policy;
- inputs;
- outputs;
- downstream consumer.

## 51. Network communication proof

A configured URL or port does not prove communication.

For material service-to-service relationships, prove physical transactions or bounded health/canary transactions and preserve correlation data.

## 52. Security-boundary proof

Security controls must be behaviorally tested where safe.

Examples:

- unauthenticated producer rejected;
- wrong HMAC rejected;
- valid producer accepted to the permitted intake state;
- producer cannot write canonical tables directly;
- private local model/OpenClaw ports are not publicly exposed;
- secrets are absent from telemetry;
- replay/idempotency policy is enforced.

## 53. Failure truth

Failures must remain failures until resolved.

A system must not convert:

- exception;
- timeout;
- parser failure;
- unavailable source;
- unavailable model;
- auth rejection;
- queue failure;
- receiver failure;

into successful-looking output solely to keep a pipeline green.

## 54. First-incorrect-transition repair

When a defect is discovered, trace to the first incorrect transition.

Required repair sequence:

`incident -> execution lineage -> first incorrect transition -> generalized failure class -> blast radius -> generalized repair -> supersession/invalidation -> normal regeneration -> regression test -> production observation`

Do not patch only the final dashboard field unless the failure is actually in projection.

## 55. Blast-radius audit

A generalized defect requires a search across all outputs produced through the vulnerable implementation path.

Report affected:

- subjects;
- claims;
- evidence;
- occupancies;
- campaigns/elections where applicable;
- queue items;
- bridge packages;
- canonical records if any;
- projections;
- monitoring states;
- Academy cases;
- metrics.

## 56. Supersede rather than erase

Where incorrect derived/projection/result records exist:

- preserve raw historical artifacts unless prohibited;
- mark bad derived output superseded/invalid as appropriate;
- link incident and replacement;
- regenerate through the corrected normal path.

Do not delete evidence merely to hide a prior failure.

## 57. Failure-isolation proof

A localized failure must not block independent scopes or subjects.

Behavioral proof should demonstrate that while one scope retries or degrades:

- sibling subject scopes continue;
- unrelated subjects continue;
- scheduler continues;
- monitoring continues;
- Gap Detector continues;
- Academy continues where safe.

## 58. Restart-survival proof

Where a component is required to survive restart, test or otherwise physically prove:

- durable pending work remains;
- leases expire/recover correctly;
- retries resume;
- monitoring deadlines remain;
- bridge backlog remains;
- incidents remain;
- Academy state remains;
- service autostarts.

## 59. Reboot-survival proof

System-wide autonomy claims ultimately require a controlled reboot proof or equivalent infrastructure-level recovery proof after the architecture is safe to test.

A service configured with `Restart=on-failure` is not enough by itself.

## 60. Resource truth

CPU, memory, disk, network and queue utilization metrics must be obtained from real runtime sources.

Do not invent utilization to demonstrate a Resource Governor.

Resource-governor proof should show scheduling behavior changes in response to measured capacity/limits.

## 61. Resource starvation versus healthy idle

A process with low CPU is not automatically unhealthy, and a running process with a heartbeat is not automatically productive.

Reports should distinguish:

- no eligible work;
- eligible work but dependency-blocked;
- eligible work but resource-limited;
- eligible work but starved;
- active useful execution.

## 62. Dashboard anti-simulation rule

Operator/public dashboards must query or derive from physical canonical/runtime state.

Forbidden production behavior includes:

- placeholder metrics presented as live;
- randomized metrics;
- hard-coded success counts;
- canned charts labeled current;
- statuses generated from static capability definitions;
- fake worker histories.

## 63. Dashboard drill-down proof

Critical metrics should be drillable to the ledger/events that compose them.

For example:

`jobs_completed=42` should resolve to the actual completed job identities or a reproducible query.

## 64. Public projection proof

Public-facing truth must never imply a stronger state than canonical evidence supports.

Producer/unreviewed content must not be rendered as validated fact without the explicit public truth state required by canonical contracts.

## 65. Behavioral tests versus shape tests

Shape tests remain useful but must be labeled appropriately.

Examples of shape tests:

- interface contains required fields;
- class exists;
- enum contains required state;
- source contains function name;
- JSON validates against schema.

These do not prove behavior.

Critical workflows require behavioral/integration/live-canary tests.

## 66. Forbidden proof tests

A test must not claim behavioral proof merely because it:

- searches source text for expected strings;
- checks that a function name exists;
- calls a function that returns predetermined success JSON;
- tests generated fixtures instead of production boundaries;
- validates a proof object generated by the same function under test;
- expects hard-coded civic facts embedded inside production code.

## 67. Independent test oracle

Where practical, tests of factual state should obtain expected state from an independent fixture/authority layer that the production solver cannot read as an answer during execution.

## 68. Live canary requirements

A live canary must be:

- bounded;
- safe;
- clearly tagged;
- non-destructive;
- based on real production interfaces;
- distinguishable from synthetic tests;
- persisted/cleaned according to policy;
- incapable of promoting itself to canonical truth outside normal validation.

## 69. Canary anti-hardcoding

Known canary entities are useful for regression but may not become special-case branches in production.

After a repair, include non-canary population checks to ensure the generalized mechanism applies broadly.

## 70. Production proof object lineage

If CivicLenZ uses `ProductionProof`, `ConformanceProof`, or similar objects, each assertion inside the object must reference independent physical proof identifiers.

The proof object itself must not be treated as the evidence source.

## 71. Attestation schema

A recommended attestation includes:

- `attestation_id`;
- `subject_type`;
- `subject_id`;
- `behavior`;
- `producer_component_id`;
- `attesting_component_id`;
- `execution_id`;
- `input_work_identity`;
- `output_identity`;
- `physical_event_refs`;
- `artifact_refs`;
- `observed_at`;
- `verification_level`;
- `result`;
- `reason_if_not_verified`.

Producer and attester SHOULD differ when the architecture provides a natural independent boundary.

## 72. Physical-event ledger

Critical control-plane truth should derive from a durable event/ledger model rather than generated summary objects.

Relevant events include:

- research need created;
- job queued;
- lease granted;
- worker started;
- retrieval started/completed/failed;
- artifact stored;
- extraction completed/failed;
- evidence created;
- handoff sent;
- handoff received;
- validation started/completed;
- canonical decision;
- publication;
- monitor check;
- change detected;
- retry;
- dead-letter;
- Academy proposal/test/promotion;
- deployment/restart.

## 73. Event immutability and correction

Where feasible, event records should be append-only. Corrections should create superseding events rather than rewriting history invisibly.

## 74. Time semantics

Execution proof must use actual observed timestamps, not guessed or generated historical times.

Distinguish:

- event time;
- retrieval time;
- persistence time;
- processing time;
- effective civic valid-time where applicable.

## 75. Correlation requirements

Distributed flows should preserve stable correlation across boundaries using appropriate IDs such as:

- trace_id;
- work_identity;
- job_id;
- attempt_id;
- retrieval_id;
- evidence_id;
- package_id;
- correlation_id.

Correlation IDs prove linkage, not success by themselves.

## 76. No generated-runtime identities

Reports must not claim production PIDs, container IDs, pod names, deployment SHAs, hostnames or service instances that were not physically observed.

If unavailable, report `UNKNOWN` or `NOT_OBSERVED`.

## 77. Deployment-drift detection

Continuously or periodically compare:

`GitHub intended source -> deployed build/source -> loaded configuration -> running process`.

Meaningful mismatch creates `DEPLOYMENT_DRIFT_EXCEPTION`.

## 78. Contract-drift detection

Compare producer/local contracts against canonical contract hashes/versions.

Meaningful mismatch creates `CONTRACT_SYNC_DRIFT`.

A local reconstructed manifest must not override canonical manifest truth.

## 79. Simulation-risk scan

Automated/static audits SHOULD search production code for patterns associated with simulated proof, including:

- hard-coded HTTP 200/status values near proof generation;
- random latency/byte generation;
- hashes of generated strings;
- `verified=true` assignments;
- `acknowledged=true` assignments;
- fabricated URL/path generation;
- static success arrays;
- fallback success prose;
- initialized empirical health values;
- static job histories;
- fixture imports in production modules;
- counters mutated only inside proof/reporting functions;
- hard-coded benchmark answers;
- duplicated schedulers/entrypoints.

Matches are investigation candidates, not automatic defects.

## 80. Runtime anti-simulation scan

Behavioral audits SHOULD compare report claims with physical sources:

- process list/systemd/container state;
- actual logs/events;
- queue state;
- database rows;
- evidence objects;
- network transactions;
- GitHub/deployment state;
- monitoring history.

## 81. Legacy proof invalidation

If a proof mechanism is discovered to have manufactured or self-certified underlying evidence, all historical conformance claims substantially dependent on that mechanism must be reclassified as:

`PROOF_INVALIDATED_PENDING_REVERIFICATION`.

This does not automatically invalidate raw source artifacts independently proven to be real.

## 82. Preserve independently valid research

When synthetic proof machinery is found:

- do not automatically delete genuine source artifacts;
- independently re-hash/reverify raw artifacts where possible;
- retain valid extracted_unreviewed research with corrected proof state;
- regenerate only the states whose provenance is insufficient or invalid.

## 83. Conformance reporting

Every final conformance report must separately state:

- architecture declared;
- code implemented;
- production path connected;
- real executions observed;
- durable outputs verified;
- downstream consumption verified;
- independent attestations verified;
- monitoring verified;
- failure/recovery verified;
- restart/reboot survival verified.

## 84. No global 100% claim by aggregation shortcut

A system may not report `100% operational`, `all agents working`, `full production proof`, or equivalent because all capability definitions have a corresponding class or test.

The required proof level must be satisfied for each material acceptance dimension.

## 85. Unknown is valid

If evidence is unavailable, the correct result is often:

- `UNKNOWN`;
- `NOT_YET_PROVEN`;
- `PARTIAL`;
- `DEGRADED`.

These states are preferable to manufactured certainty.

## 86. Human-readable proof questions

For every major success claim, reviewers should be able to answer:

1. What physically happened?
2. Which production entrypoint initiated it?
3. Which worker/process executed it?
4. What real input did it consume?
5. What source/tool/model was physically used?
6. What durable output exists?
7. Where is that output stored?
8. Who consumed the output?
9. What independent component attested to the relevant outcome?
10. Could the same report have been generated without the intended workflow happening?

If question 10 is `YES`, the proof is insufficient.

## 87. Google/Gemini-specific implementation rule

Google/Gemini/CivicsLenZz MUST NOT satisfy canonical conformance by creating a local proof engine that manufactures the expected evidence, metrics or acknowledgements.

Google may:

- implement producer workers;
- perform real retrieval/extraction;
- preserve evidence;
- prepare extracted_unreviewed packages;
- run producer-local monitoring;
- propose Academy improvements within authority.

Google may not:

- self-certify canonical receipt;
- self-certify canonical validation;
- replace the canonical scheduler with a competing production authority;
- count synthetic fallbacks as successful production retrievals;
- use generated proof records as their own independent evidence.

## 88. Codex-specific implementation rule

Codex MUST apply the same anti-simulation standard when building canonical CivicLenZ.

Canonical components are not exempt merely because they are trusted code.

Codex should prefer real physical canaries and production event lineage over proof-by-interface.

## 89. HERMES-specific rule

HERMES may own canonical orchestration, but it cannot prove that a worker completed a task solely by writing the completion event itself unless HERMES is physically the consumer of a verifiable worker result.

Scheduler state, worker state and downstream state must remain distinguishable.

## 90. OpenClaw-specific rule

OpenClaw availability does not prove tool/browser execution.

Each credited OpenClaw action must be linked to a physical invocation/result when behavioral proof is required.

## 91. Local-model-specific rule

Qwen availability on a localhost port does not prove Qwen handled work.

Credited model jobs require model-routing and invocation telemetry tied to the actual work identity.

## 92. Cloudflare-specific rule

A deployed Worker, cron trigger, Queue binding or R2 binding is not proof of execution.

Behavioral proof requires actual events/messages/objects and consumer transitions.

## 93. Supabase-specific rule

Schema existence is not workflow proof.

Claims about jobs, validation, research contracts, claims, evidence, monitoring or Academy state must be derived from real rows/events produced through intended runtime paths.

## 94. R2-specific rule

An R2 object key stored in metadata is not proof that the object exists.

Where evidence durability matters, confirm object existence and integrity through the approved storage interface.

## 95. Production-cutover requirement

Before calling a repaired architecture active:

- old reachable truth-producing path identified;
- new path deployed;
- source/deployment version recorded;
- old path disabled or safely subordinated;
- queues/leases reconciled;
- pending work preserved;
- representative real work traverses new path;
- downstream consumption verified;
- monitoring observes new path.

## 96. Implementation acceptance matrix extension

The implementation conformance matrix must add fields equivalent to:

- `declared`;
- `implemented`;
- `connected`;
- `real_execution_proof`;
- `durable_output_proof`;
- `downstream_consumer_proof`;
- `independent_attestation`;
- `monitoring_proof`;
- `restart_survival_proof`;
- `simulation_risk_state`;
- `proof_level`.

## 97. Simulation-risk states

Use:

- `NO_KNOWN_SIMULATION_PATH`;
- `SIMULATION_RISK_UNASSESSED`;
- `SIMULATION_PATH_FOUND`;
- `SIMULATION_PATH_QUARANTINED`;
- `PROOF_INVALIDATED_PENDING_REVERIFICATION`;
- `REVERIFIED_PHYSICALLY`.

## 98. Repair priority

Prioritize simulation/proof-integrity defects ahead of cosmetic dashboard improvements because incorrect proof can hide failures in every downstream subsystem.

Do not, however, globally stop independent safe research if valid research paths can continue while proof machinery is repaired.

## 99. Non-blocking remediation

When synthetic/self-certifying behavior is isolated to a proof/reporting component:

- quarantine the faulty proof path;
- preserve valid execution paths;
- continue real research;
- rebuild metrics from physical telemetry;
- reverify affected claims.

## 100. Final acceptance principle

CivicLenZ production confidence must be based on reproducible physical behavior.

The system is accepted when the intended architecture actually moves real work through real components and produces durable, independently verifiable results while remaining observable, recoverable and truthful about uncertainty.

No implementation may substitute a convincing representation of that process for the process itself.
