# CODEX START HERE — CivicLenZ

Before making architectural, runtime, worker, research, UI, Cloudflare, Supabase, VPS, OpenClaw, or HERMES changes, read the authoritative control-plane documentation in `docs/control-plane/`.

## Required first read
1. `docs/control-plane/README.md`
2. `docs/control-plane/01_TRUTH_RESEARCH_LIFECYCLE.md`
3. `docs/control-plane/02_HERMES_AGENTS_EVOLUTION.md`
4. `docs/control-plane/03_RESEARCH_CONTRACTS_CONTINUOUS_SCOPE.md`
5. `docs/control-plane/04_OPERATOR_PUBLIC_PRODUCT.md`
6. `docs/control-plane/05_AUTONOMOUS_RUNTIME_OPERATIONS.md`
7. `docs/control-plane/PRODUCT_MISSION_AND_NONNEGOTIABLES.md`
8. `docs/control-plane/SYSTEM_ARCHITECTURE.md`
9. `docs/control-plane/HERMES_OPENCLAW_RUNTIME.md`
10. `docs/control-plane/WORKER_CATALOG_AND_RESEARCH_CONTRACTS.md`
11. `docs/control-plane/DATA_EVIDENCE_VERIFICATION.md`
12. `docs/control-plane/CODEX_MASTER_IMPLEMENTATION_DIRECTIVE.md`
13. `docs/control-plane/PRODUCER_INDEPENDENCE_AND_FRONTIER_HARVESTING.md`
14. `docs/control-plane/CANONICAL_RESEARCH_CONTRACT_PACKAGE.md`
15. `docs/control-plane/SEAT_ELECTION_CANDIDATE_PARALLEL_RESEARCH.md`
16. `docs/control-plane/ADDRESS_BOUNDARY_ELECTION_MAP_ARCHITECTURE.md`
17. `docs/control-plane/BOUNDARY_AND_SEAT_EVOLUTION.md`
18. `docs/control-plane/CIVIC_TERRITORY_AND_PUBLIC_RESOURCE_GRAPH.md`
19. `docs/control-plane/ORGANIZATION_RELATIONSHIP_AND_INFLUENCE_GRAPH.md`
20. `docs/control-plane/PROMISE_POSITION_EVIDENCE_ALIGNMENT.md`
21. `docs/control-plane/NATIONAL_COVERAGE_ATLAS_AND_EXPANSION.md`

The master implementation directive defines the seven-stage production activation sequence. Follow it in order while continuing autonomously through non-destructive implementation. Do not reinterpret a stage exit gate as permission to bypass evidence, safety, credential, schema, or production-change controls.

The producer/frontier documents define the replaceable-producer model, canonical machine-readable research specifications, non-duplication/work reservations, and the invariant that Seat discovery must trigger election and candidate research in parallel. Implement integrations so Gemini/CivicsLenZz can accelerate the frontier without becoming required for continuity or bypassing HERMES validation.

The map/territory/accountability documents make address-level map resolution, versioned boundary evolution, elections/candidates, constituency context, public-resource flows, organization relationships, neutral promise-evidence alignment, and national coverage planning part of the canonical product architecture. These are architectural requirements even where implementation is staged later.

Then inspect the existing implementation and current production state before proposing or making changes.

## Non-negotiable doctrines
- Seat-centric architecture.
- Address/map resolution is a core product surface; ZIP/city/county inference is not authoritative representation.
- Boundaries are versioned evidence-backed data, never hardcoded permanent logic.
- Seat discovery requires election/candidate discovery in parallel; candidates are first-class.
- Producers are replaceable executors; HERMES owns research intent, work identity, reservations, priority, validation and recovery.
- Public-resource context, campaign money, personal disclosures and lobbying are distinct data domains and must not be conflated.
- Relationship evidence does not establish motive/causation without qualifying evidence.
- Promise/position analysis classifies evidence relationships, never politicians; no political ranking/score or voting recommendation.
- No global `COMPLETE` state for a Person/Candidate/Seat/profile; only bounded currentness/reconciliation with cutoff + monitoring.
- `CAPABILITY_NOT_IMPLEMENTED` is operational state, never a factual `checked_no_authoritative_result` claim.
- Evidence-first and publication-eligible-claims-only public projection.
- Research workers do not self-verify material civic claims.
- Deterministic-first collection/processing.
- Search/browser discovery may find evidence but search snippets are not evidence.
- HERMES Prime is the persistent executive/orchestrator.
- OpenClaw is the conversational/research-request/action gateway and tool layer.
- Qwen local is a bounded reasoning utility, not civic truth authority.
- Cloudflare remains the distributed deterministic execution fabric.
- Supabase is structured civic state; R2 is raw evidence; GitHub is implementation/docs/config, not runtime civic storage.
- Maximum safe utilization: use paid compute efficiently while preserving headroom, rate limits and stability.
- Event-first orchestration, heartbeat backstop.
- Monitoring never ends.
- Evolution is core HERMES behavior: every role executes, measures, learns and improves within authorized scope.
- HERMES may evolve research methods but may not silently evolve verification/publication truth standards.
- No synthetic scale, fake records, fake worker activity or simulated production counts.

## Before implementation
For every requested change:
1. inspect existing code and current deployed/live state;
2. identify what already exists and preserve useful working behavior;
3. state the mismatch between implementation and authoritative docs;
4. prefer additive/reversible changes;
5. test locally/CI;
6. use PRs/review for governed changes;
7. never bypass broken pipelines by hand-inserting facts merely to make a demo pass;
8. report physical rows, real worker runs and real deployment identifiers only.

## Cloudflare rule
Cloudflare production configuration should be reproducible from GitHub plus secret stores. Use scoped Cloudflare API tokens/Wrangler permissions for CivicLenZ resources rather than a Global API Key. Dashboard-only drift should be reconciled back into repository configuration.

## Production-runtime rule
Codex/GrokBot/ChatGPT are builders, maintainers and copilots. CivicLenZ must continue operating when they are offline. HERMES/OpenClaw/Cloudflare/Supabase/R2 constitute the persistent runtime.
