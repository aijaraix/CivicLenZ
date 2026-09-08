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

Then inspect the existing implementation and current production state before proposing or making changes.

## Non-negotiable doctrines
- Seat-centric architecture.
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
