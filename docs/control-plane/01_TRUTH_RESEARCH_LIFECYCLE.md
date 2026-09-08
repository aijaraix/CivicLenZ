# Step 1 — Truth, Research Lifecycle, and Continuous Currentness

## Core rule
A CivicLenZ Person, Candidate, Seat, or profile is never globally `COMPLETE`. Civic knowledge is continuously changing. The system may only say that a bounded scope has been reconciled or is current as of a known cutoff.

## Separate state families
Never collapse system capability, research outcome, and factual verification into one field.

### Research/work state
- NOT_REQUESTED
- CAPABILITY_NOT_IMPLEMENTED
- QUEUED
- RESEARCHING
- BLOCKED
- RETRYING
- RESEARCH_SCOPE_RECONCILED
- MONITORING

`CAPABILITY_NOT_IMPLEMENTED` means CivicLenZ currently lacks a capable worker. It must never create a civic Claim such as `checked_no_authoritative_result`.

### Claim verification state
- EXTRACTED_UNREVIEWED
- EVIDENCE_PENDING
- VERIFICATION_PENDING
- VERIFIED
- CONFLICT
- STALE
- REJECTED
- SUPERSEDED

Research workers submit claims and evidence. They do not self-declare material civic facts verified.

### Search outcome
- FOUND
- CHECKED_NO_AUTHORITATIVE_RESULT
- NOT_APPLICABLE
- SOURCE_UNAVAILABLE
- SOURCE_INCOMPLETE
- SCOPE_EXHAUSTED
- UNKNOWN

`CHECKED_NO_AUTHORITATIVE_RESULT` is valid only when an implemented worker actually searched the contract-defined authoritative scope and records the scope/cutoff searched.

## No global completion flag
Track bounded states instead:
- seat discovery reconciled as of cutoff
- officeholder baseline sufficient/current as of cutoff
- research scope reconciled as of cutoff
- enumerable dataset reconciled through cutoff
- verification coverage
- freshness
- monitoring active
- unresolved contradictions

## Currentness contract
Every reconciled scope must record, where applicable:
- scope definition
- source universe
- cutoff/current_as_of
- next_check_at
- evidence coverage
- unresolved gaps
- contradictions
- worker/version

## Continuous loop
DISCOVER → COLLECT → RECONCILE DEFINED SCOPE → VALIDATE → PUBLISH IF ELIGIBLE → MONITOR → DETECT CHANGE → RESEARCH AGAIN.

## Required code remediation
The current behavior that may translate `NOT_IMPLEMENTED` into a factual `checked_no_authoritative_result` claim must be removed before broad autonomous rollout. Software inability is operational state, not civic evidence.
