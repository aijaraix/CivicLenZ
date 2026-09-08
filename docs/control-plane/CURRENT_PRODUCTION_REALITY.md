# Current production reality — public operational summary

Observed 2026-09-08 UTC. This report excludes credentials and private account,
database, Tunnel, and host identifiers. It does not reproduce the earlier private
Stage 1 inventory or claim its historical row counts were remeasured.

- Canonical main: `2bbf69a10a9cfc38e3446bc9d673de4a4456312a`.
- Stage 1: passed baseline classification; this does not mean full activation.
- Receiver runtime: `a32c1fb04bee564210cfcded48ef2853a568b120`.
- Receiver and Tunnel: active, enabled; public TLS/health HTTP 200.
- Public result endpoint: `https://ingest.civicslenz.com/v1/harvester/results`.
- Unauthenticated POST: HTTP 401 / REJECTED_POLICY.
- Signed authentication-only probe: HTTP 503 / RETRY_LATER because corrected-
  canary intake is deliberately paused. This is not an accepted civic submission.
- Public telemetry: HTTP 404. Private services listen only on loopback.
- Secret file preserved; loader removes confirmed Markdown copy delimiters.
  Effective key shape matches the reported Google 64-hex format. Cross-system
  equality is not proven until Google successfully signs a request.
- Real interoperability canary: not run. Durable receipt count: 0.
- The producer's staged Seat/Occupancy mapping requires correction. The intake
  hold must not be removed solely because authentication passes.

## Stage 2 physical state

- HERMES Prime observation runtime: active, enabled, restart and health passed.
  Event-first receipt observation plus heartbeat; dispatch remains disabled.
- Operational SQLite history persisted across service restarts. At the recorded
  check: 30 observations, 0 Academy proposals. These are operational samples,
  not worker runs, civic claims, or a canonical Research Work Ledger.
- Resource safeguards: observer 192 MiB/25% CPU, Qwen 6 GiB/300% CPU, OpenClaw
  1.5 GiB/50% CPU ceilings; 2 GiB dedicated safety swap configured for reboot.
- Docker 29.1.3 and Compose 2.40.3 installed; no public container ports opened.
- OpenClaw 2026.9.3: separate service identity, private authenticated gateway;
  health passed. No access to bridge/Cloudflare secret files; tools/plugins
  disabled pending canonical integration. No autonomous civic research enabled.
- llama.cpp commit `5266f24da75dc449bd56cbed7addb9c8e4a6a73e` with official
  Qwen3-4B Q4_K_M, checksum verified. Local inference returned READY in 1.322 s
  (17 prompt tokens, 2 completion tokens); this is a smoke benchmark, not a load
  benchmark or proof of civic reasoning accuracy.
- Qwen and OpenClaw service restarts completed; full host reboot acceptance has
  not been performed. Stage 2 exit gate remains open.
- SentinelX preserved. No local model or private administration exposed publicly.

## Downstream gates

Canonical Queue/R2/Supabase dispatch is NOT_IMPLEMENTED. The production database
does not currently contain the proposed private intake/work-ledger tables.
The proposed SQL is unapplied and needs governed production review, an exact
runtime access design, and a dispatcher before activation.

The proposal's unreviewed-only constraints, per-target outbox uniqueness, and
public-role isolation passed in an isolated PostgreSQL 17 container, which was
removed after testing. No production civic data was inserted or promoted.

PRs #53 and #54 remain open. PR #55 contains this Stage 2 and authentication
remediation. At runtime commit a32c1fb both GitHub validation workflows passed;
20 bridge tests and 3 observer tests passed locally. No PR is implicitly merged.

Next gates: prove Google's HMAC parity, obtain the corrected real result, select
one canary for delivery, then trace its durable receipt and producer acknowledgment.
Production schema/credential approvals and the downstream dispatcher remain
separate requirements. Broad Florida dispatch remains disabled.
