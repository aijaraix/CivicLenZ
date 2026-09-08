# Step 4 — Operator/Research Experience and Public Product

## One civic graph, two projections
Do not build an unrelated admin dashboard and public website. Build one canonical civic graph and one canonical Seat/Profile model with different visibility rules.

### Operator/research projection
May show:
- raw/extracted/pending/conflict/stale/rejected states
- worker activity
- missing/stale research scopes
- evidence and retrievals
- contradictions
- source health
- job/queue state
- capability state
- currentness/reconciliation cutoffs
- infrastructure health

### Public projection
Shows only publication-eligible information under the applicable evidence, freshness, verification, and presentation rules.

## Command Center
Protected operator UI should answer `What is CivicLenZ doing right now?` using physical production state only.

Required areas:
- infrastructure health: HERMES, OpenClaw, local model, Cloudflare, queues, Supabase, R2
- civic coverage: Seats, occupancies, elections, candidates
- research: scopes researching/current/stale/blocked, contradictions, evidence gaps
- work: queued/leased/running/retrying/blocked/dead-letter
- workers: capability, implementation state, runtime state, last success, failures, throughput
- sources: healthy/changed/failing/paused
- monitoring: due/overdue checks and recent Civic Events
- cost/resource telemetry

No simulated counts.

## Canonical Seat/Profile renderer
The operator profile should resemble the eventual public profile, with an operator overlay rather than a separate data model.

Core sections may include:
- overview / current occupancy
- biography / education / career
- political and election history
- campaign platform / promises
- campaign finance / disclosures / business interests
- government activity: legislation, votes, committees, executive actions, appointments
- statements / positions / mandate-agenda relationships
- ethics / relevant public records
- relationships
- news / social / live activity
- evidence / provenance / currentness

Operator mode additionally displays scope status, worker, current_as_of, missing units, contradictions, evidence counts, next action, and next_check_at.

## Evidence drawer
Every material public claim should be able to explain why CivicLenZ presents it: source organization/URL, retrieval time, evidence object, locator/excerpt where appropriate, hash integrity metadata, validation state, first/last seen, freshness, and contradictions.

## Candidate experience
CandidateCampaign is first-class and linked to Person + Election + Seat. Candidate profiles use the same evidence architecture and include filing/qualification, platform, promises, campaign finance, background, endorsements, debates/statements, disclosures where applicable, result/status, and timeline. A winning candidate becomes a new Occupancy of the same Seat; the Person is not recreated.

## Live activity and Civic Events
Entity timelines should be driven by structured Civic Events, not separate bespoke feed logic. Later the same events feed in-app activity, RSS/Atom, email, push, social/share outputs, and citizen-action triggers.

## Ask CivicLenZ / OpenClaw
The UI should expose conversational access.
- If eligible data already exists, answer from the civic graph.
- If a requested scope is missing, stale or insufficient, OpenClaw may create a HERMES research request.
- The user can be told that research was requested and notified when eligible results are ready.
- User demand may affect priority, never verification standards.

## Address-first public experience
Long-term public entry point: address → geocode/boundary intersection → all applicable Seats → current officials → upcoming elections → candidates → monitoring/action.

## Citizen action compatibility
Architecture must remain compatible with follows, alerts, petitions, message/call campaigns, public-comment workflows, issue tracking, and attributable official responses. Facts, analysis, user opinion, and action requests remain distinct data/presentation classes.
