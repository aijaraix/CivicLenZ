# Boundary & Seat Evolution

## Invariant
Boundaries and Seat structures change. CivicLenZ must monitor, evidence, version, historically preserve, and propagate those changes without operator prompting. Never hardcode current district geometry/numbering as permanent truth.

## Logical director
Boundary & Seat Evolution Director capabilities include:
- boundary source discovery and health;
- boundary-version monitoring;
- redistricting monitoring;
- annexation/de-annexation monitoring;
- school/special-district boundary monitoring;
- Seat structure/rename/renumber monitoring;
- split/merge/create/abolish classification;
- historical geometry archival;
- address-impact recalculation;
- election-boundary reconciliation.

## Versioned model
Boundary records should carry stable identity, type, jurisdiction, geometry/hash, source/version, effective dates, election cycle/vintage, status, and supersession lineage. SeatBoundaryAssignment links a permanent Seat to the applicable boundary version for a validity interval.

Do not assume every polygon change is the same Seat. Classify events such as GEOMETRY_UPDATED, DISTRICT_RENUMBERED, DISTRICT_SPLIT, DISTRICT_MERGED, SEAT_CREATED, SEAT_ABOLISHED, JURISDICTION_ANNEXED, JURISDICTION_DEANNEXED, BOUNDARY_EFFECTIVE_FUTURE, BOUNDARY_EFFECTIVE_NOW, and SOURCE_CORRECTION.

## Propagation
A validated material boundary/Seat-structure change may trigger:
archive old geometry -> ingest new authoritative geometry -> compare -> reconcile Seat assignments -> reconcile Election/CandidateCampaign universe -> recalculate affected address intersections -> update monitoring -> create Civic Events.

Historical queries must continue resolving against the historically effective boundary.

## Evidence and validation
A newly published map is not canonical merely because it was found. Preserve the source/bytes/hash/metadata, determine effective/legal status, validate the applicable election cycle, and retain conflicting/proposed plans separately until policy says they are effective.

## Monitoring
Boundary monitoring is continuous with source-specific cadence. It must detect both scheduled redistricting cycles and local changes that may occur independently. Pause only the affected scope on unexplained topology/count changes; do not corrupt unrelated geography.