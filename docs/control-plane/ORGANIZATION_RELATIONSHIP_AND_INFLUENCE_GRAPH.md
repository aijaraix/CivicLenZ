# Organization, Relationship & Influence Graph

## Purpose
CivicLenZ should expose evidence-backed, civically relevant relationships among public officials/candidates, committees, donors, PACs, organizations, businesses, lobbyists, contractors, grant recipients, boards, appointments, endorsements, unions/associations, nonprofits and other relevant entities where lawful/public data supports the relationship.

## Neutral Relationship object
Represent documented relationships rather than inferred motives. A relationship should identify subject/object, type/direction, amount where applicable, period, first/last observed, source/evidence, verification/currentness, and provenance.

Examples include campaign contribution, committee affiliation, lobbying relationship, government contract/award, board/business affiliation, appointment, endorsement, grant relationship, or disclosed interest.

## Causation rule
Do not convert temporal correlation into motive or causation. `Organization/people associated with X contributed amount Y` and `Official later took action Z` may both be sourced facts; CivicLenZ must not assert `Y caused Z` without qualifying evidence.

## Logical director
Organizations & Influence Director capabilities may include campaign donor/PAC/committee relationships, lobbying, government contractor/grantee relationships, business/board relationships, union/association/nonprofit relationships, endorsements, appointments, procurement/public-private partnerships, relationship entity resolution, and change monitoring.

## Identity and sensitivity
Relationships require strong entity resolution, especially for common names, employers, companies, family/public relationships, legal/ethics records, and cross-jurisdiction history. Do not collect private information merely because a person is politically relevant; research must be lawfully public and materially relevant to civic evaluation, public conduct, conflicts, campaign activity, governance, or accountability.

## Separation of money domains
Campaign money, personal/public disclosures, lobbying, and government/public money are distinct datasets. UI and data models must not conflate them.

## Monitoring
New campaign filings, lobbying records, contracts/awards, disclosures, appointments, endorsements or authoritative relationship records may create relationship updates/Civic Events after validation.