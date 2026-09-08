# Promise, Position & Evidence Alignment

## Purpose
CivicLenZ should help users inspect whether documented conduct is consistent with documented commitments without endorsing candidates, assigning political scores, or telling users how to vote.

## Promise evidence object
Preserve the original commitment, source, date, context, qualifiers/conditions, applicable office/authority, expected observable actions where definable, relevant period, and evidence timeline.

Later evidence may include statements, votes, sponsorships, executive actions, budgets, appointments, official policies, or other attributable conduct.

## Evidence relationship states
Classify the relationship between evidence and a specific commitment rather than scoring the politician. Appropriate states may include:
- EVIDENCE_SUPPORTS_FULFILLMENT
- EVIDENCE_SUPPORTS_PARTIAL_FULFILLMENT
- EVIDENCE_SUPPORTS_NON_FULFILLMENT
- EVIDENCE_SUPPORTS_REVERSAL
- IN_PROGRESS
- NOT_YET_ACTIONABLE
- OUTSIDE_OFFICEHOLDER_AUTHORITY
- CONFLICTING_EVIDENCE
- INSUFFICIENT_EVIDENCE

Every state must expose its underlying evidence/currentness and be reviewable/supersedable.

## Authority analysis
Before comparing a promise to conduct, determine what the relevant Seat can legally propose, vote, veto, administer, appoint, oversee, or otherwise influence. Do not attribute failure to perform an action outside the officeholder's lawful authority.

## Neutrality
No candidate/official ranking, ideological grade, loyalty score, electability score, or voting recommendation. CivicLenZ may organize documented positions, commitments, votes/actions and evidence so users can make their own decisions.

## Mandate/agenda alignment
Where users request alignment with a documented campaign/party/coalition/administration agenda, represent evidence relationships such as SUPPORTS, OPPOSES, PARTIALLY_SUPPORTS, MIXED, NO_PUBLIC_POSITION, or INSUFFICIENT_EVIDENCE. Preserve the agenda item's authoritative/primary definition and the official's relevant evidence. Do not convert this into a politician score.

## AI role
AI may help identify candidate promises, relevant later actions, issue taxonomy, possible conflicts, and evidence timelines. It must not manufacture commitments, infer motive, or issue unsupported conclusions. Ambiguous/high-impact conclusions require stronger validation/review.

## User personalization
User-selected issues/preferences may filter or organize evidence, but must remain separate from canonical civic truth. The system can show documented positions/actions relevant to selected issues; it does not tell a user which candidate to support.

## Monitoring
Promises/positions are open-ended monitored scopes. New statements/actions may alter the evidence relationship and should trigger re-evaluation rather than overwriting history.