# Canonical Research Contract Package

## Purpose
CivicLenZ must define what research producers are expected to gather without requiring each producer to reinvent the product specification. The canonical repository owns a versioned machine-readable Contract Package. CivicsLenZz and every other producer consume it; they do not fork or redefine it.

The prose control-plane documents define doctrine. Machine-readable contracts define exact interchange and research obligations.

## Target package
The implementation should converge on a versioned `contracts/` tree containing schemas/configuration equivalent to:

- VERSION
- core: Jurisdiction, Seat, Person, Occupancy, Election, CandidateCampaign
- research: universal Person/Seat research plus office-class contracts (Governor, executive, senator, representative, county, mayor/municipal, school board, judicial/special district as applicable) and CandidateCampaign
- intelligence: biography, education, career, political/election history, campaign platform, promises/positions, campaign finance, disclosures, business interests, government activity, votes, legislation, executive actions, ethics/public records, relationships, media/social, mandate/agenda alignment
- evidence: Claim, Evidence, Source, Retrieval, verification/source-authority policy
- orchestration: ResearchWorkIdentity, ResearchReservation, ProducerManifest, CohortAssignment, CohortReadinessPackage
- interchange: CIVICLENZ_RESEARCH_INGEST_CONTRACT_V1

Exact physical layout may change, but ownership/versioning semantics may not.

## Research depth
Do not model CivicLenZ depth as a thousand columns or a boolean field such as `campaign_finance=true`. Research domains define sub-scopes, enumerable datasets, evidence requirements, current-as-of cutoffs, freshness, monitoring, and follow-up obligations.

Example campaign-finance scope includes committee discovery, filing authorities, reporting periods, expected filings, amendments, receipts, expenditures, loans/debts, donor/PAC relationships where appropriate, reconciliation, missing units, cutoff, and future monitoring.

Campaign-platform scope includes campaign-site discovery/archive, issues/policy/press/FAQ material, commitments, qualifiers/red lines, positions, source context, changes, and monitoring.

Government activity may be large/open datasets (bills, votes, committees, executive orders/actions, appointments, vetoes, budgets). These belong in normalized datasets/graphs, not a Person row.

## Three contract layers
1. Core contract: universal identity/Seat/election/evidence/monitoring requirements.
2. Office-class or CandidateCampaign contract: role-specific obligations.
3. Dynamic research scopes: new obligations created by discoveries such as a prior jurisdiction, committee, business, prior office, ethics/public record, relationship, or promise.

Research is recursive: discoveries may generate new ResearchWorkIdentity records.

## Currentness, not global completion
There is no global profile COMPLETE. Contracts may establish BASELINE_SUFFICIENT, CURRENT_AS_OF, SCOPE_RECONCILED_AS_OF, DATASET_RECONCILED_THROUGH, STALE, RESEARCHING, BLOCKED, and MONITORING_ACTIVE.

`CAPABILITY_NOT_IMPLEMENTED` is operational state and must never be converted into `CHECKED_NO_AUTHORITATIVE_RESULT`. The latter requires an implemented worker to actually exhaust the defined authoritative scope and preserve that search/reconciliation evidence.

## First-pass harvester behavior
A capable harvester should not merely discover a Seat and stop. Given the canonical contracts, it may collect and structure as much legitimate first-pass research as possible, preserve evidence, perform defined dataset enumeration/reconciliation, and report gaps. Everything remains `extracted_unreviewed`.

Canonical workers then verify, independently corroborate where required, reconcile, resolve identity/conflicts, deepen unresolved scopes, apply publication policy, and monitor.

Principle: HARVEST ONCE, VERIFY INDEPENDENTLY, DEEPEN WHERE NECESSARY, MONITOR CONTINUOUSLY.

## Verification levels
Implementations may use more detailed states, but the conceptual progression is:
- V0 DISCOVERED;
- V1 EXTRACTED from preserved evidence;
- V2 SOURCE_VALIDATED (evidence supports extraction);
- V3 INDEPENDENTLY_CORROBORATED where the ResearchContract requires it;
- V4 CANONICAL/PUBLICATION_ELIGIBLE after all applicable policy/verification gates.

Not every field requires V3. High-impact/sensitive assertions (for example ethics/legal/conflict allegations) require stronger source, identity, and publication safeguards than an official roster claim.

## Producer synchronization
Canonical contract version must be included in exported packages and producer manifests. CI/contract tests should detect incompatibility before runtime. A producer may propose contract improvements through Academy/PR governance but may not silently alter canonical requirements.

## Mandate/agenda alignment
The contract package must support neutral evidence-based alignment to campaign mandates, party/coalition/administration agenda items, or other defined civic commitments without partisan scoring. Relationships should be evidence states such as SUPPORTS, OPPOSES, PARTIALLY_SUPPORTS, MIXED, NO_PUBLIC_POSITION, or INSUFFICIENT_EVIDENCE, with underlying statements/votes/actions visible. HERMES must not infer a political loyalty score as fact.