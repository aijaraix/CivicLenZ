# Product Mission and Non-Negotiables

## Mission
CivicLenZ is a continuously operating civic-intelligence and accountability platform. It should discover, identify, research, verify, organize, update, and monitor public government seats, the people who occupy them, the candidates competing for them, the elections governing them, and the evidence needed to hold public actors accountable.

The end-user experience should eventually resolve a street address into every applicable public seat and show current officials, upcoming elections, candidates, accountability history, evidence, live civic events, alerts, and lawful civic-action options.

## Seat-centric model
The permanent anchor is the `Seat`, not the politician. People move through seats. Elections determine future occupancies. CandidateCampaigns target seats. Historical occupancies are never overwritten.

Core graph:
`Jurisdiction -> Seat -> SeatOccupancy -> Person`
with linked `Election`, `CandidateCampaign`, `Claim`, `EvidenceObject`, `CivicEvent`, `Issue`, `UserFollow`, and `Action` entities.

## Truth rules
- HTTP 200 proves retrieval, not truth.
- SHA-256 proves byte integrity, not factual correctness.
- Parser success proves extraction, not verification.
- LLM output is not a source.
- Secondary sources can discover leads but do not automatically override primary records.
- No production fact is VERIFIED without the required evidence/validation policy.
- Never fabricate officials, seats, candidates, phone numbers, portraits, finance records, election results, verification status, worker activity, or coverage metrics.

## Scale rules
Truth and scale are both requirements. Do not solve truth by creating a manual-only process. Do not solve scale by manufacturing data. The system should parallelize discovery, enrichment, validation, monitoring, and change detection while failing closed on suspicious sources or parser behavior.

## Continuous operation
A profile is never truly finished. Once baseline completeness is achieved, monitoring begins. Changes can make a previously complete profile stale or incomplete, creating new work automatically.

## Florida-first, national end state
Florida is the first proving ground, not the product boundary. Expand from statewide executive and legislative seats through federal delegation, counties, municipalities, school districts, special districts, and eventually national coverage.

## Citizen action
CivicLenZ is not merely a directory. The product loop is:
`discover -> understand -> compare -> monitor -> alert -> organize -> act -> measure accountability`.
Actions such as petitions, message campaigns, call campaigns, public comments, meeting requests, and sharing must remain clearly separated from the factual evidence layer.