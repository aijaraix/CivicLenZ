# Deep Swarm Scale and Source-Family Activation Addendum — 2026-09-22

This addendum supplements FULL_SCALE_DEEP_DOSSIER_CAPABILITY_ACTIVATION_2026_09_22.md and FULL_SCALE_DEEP_DOSSIER_SWARM_PRODUCTION_LAUNCH_2026_09_22.md.

## Confirmed operating doctrine
CivicLenZ must optimize simultaneously for depth, breadth, evidence quality, continuous next-work consumption, independent validation and persistent monitoring. No subject is globally COMPLETE. Finite scopes may be reconciled only to an explicit authoritative cutoff. Open-ended scopes may only reach bounded states such as SEARCH_SATURATED_AS_OF or CURRENT_TO_CONTRACT_DEPTH and retain monitoring obligations.

## Current physical checkpoint
Last observed HERMES concurrency is 4 with deep-dossier execution enabled. Host headroom remained approximately 9.6 GiB available memory, 22% disk usage and negligible load. deep_dossier_source_evidence is physically ACTIVE. The capability registry currently exposes 4 ACTIVE, 13 READY and 59 NOT_IMPLEMENTED capabilities. READY capabilities generally lack a worker_module/queue_pool and therefore must not be mislabeled ACTIVE.

## Scale policy
Do not choose an arbitrary worker ceiling. Determine the maximum safe useful concurrency from measured bottlenecks. Ramp while observing CPU/load, memory, DB latency/connections, queue age, Cloudflare/R2 throughput, source rate limits/429s, worker error rate, validation/audit backlog and source-specific politeness limits.

Prefer independent capability/source pools so one slow or rate-limited source cannot consume all capacity. Maintain reserved capacity for validation, auditing, monitoring and discovery rather than allowing retrieval alone to starve them.

If a ramp remains healthy, continue upward. If a metric degrades, reduce only the affected pool where possible.

## Efficiency audit
Continuously detect and correct:
- many ResearchWork units reusing one source where the scope requires additional source families;
- duplicate retrievals that should reuse immutable evidence;
- top-level scopes masquerading as adequately decomposed work;
- queue starvation by capability or subject;
- repeated source-local failures;
- blocked validation/audit backlogs;
- READY capabilities with implementation present but no physical route;
- work that finishes without creating the next bounded obligation;
- source discovery that does not feed durable canonical work;
- subjects receiving shallow breadth without deep bounded decomposition;
- one subject monopolizing a capability pool.

## Source-family expansion
The current registry is too narrow for the intended dossier depth. Build generalized source discovery/registration/routing so each scope can use appropriate authoritative and high-quality evidence families without manually hard-coding every URL.

Priority source families include official government/office pages and archives; election/candidate/committee/finance authorities; ethics/financial-disclosure authorities; legislative/executive records; campaign sites and archives; speeches/debates/interviews/podcasts; press releases/newsletters; attributable social accounts/posts; reputable news/media; court/public-record sources where lawful and relevant; authoritative GIS/boundary sources.

Search/discovery results are leads, not canonical truth. Preserve source authority, provenance, retrieval timestamp/hash, attribution state and validation requirements.

## Depth behavior
For every subject, applicable scopes should recursively create bounded work until finite universes are reconciled or open-ended coverage reaches a bounded audited saturation state. Completion of one retrieval or one worker run never completes a domain.

Finite datasets: expected N -> account for N or explicitly track missing/unresolved units, amendments, refunds/transfers, periods, totals and cutoff.

Open-ended scopes: multiple source families -> multiple passes -> independent rediscovery -> unresolved-lead closure -> coverage audit -> bounded saturation/currentness state -> monitoring.

## Worker activation
Keep all ACTIVE workers running. For READY capabilities, implement/attach physical worker_module and queue_pool where required, execute real production work, then mark ACTIVE only after a successful physical worker_run.

Do not wait to implement all NOT_IMPLEMENTED capabilities. Add high-value departments one at a time while the existing swarm continues.

## Full activation target
FULL_DEEP_SWARM_ACTIVE requires simultaneous proof of: multi-subject work; multi-lane work; deep bounded Governor work; source-family diversity; finance/disclosure/promise/social/news/government/GIS lanes as physically implemented; finite reconciliation; open-ended coverage audit; validation; monitoring; automatic next-work; safe measured concurrency above proof scale; healthy resources; intact publication gates.

The machine must remain perpetual: DISCOVER -> RECONCILE -> FAN OUT -> COLLECT -> STRUCTURE -> VALIDATE -> AUDIT -> MONITOR -> TAKE NEXT WORK.
