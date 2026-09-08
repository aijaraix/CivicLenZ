# Address, Boundary, Election & Map Architecture

## Product invariant
The CivicLenZ map is a core product surface, not a later visualization. Every address-resolvable Seat should be map-resolvable; every mapped Seat should link to its boundary version, current Occupancy, applicable Election/CandidateCampaigns, evidence/currentness, and canonical profile.

The three linked questions are:
- WHO GOVERNS? Seat graph.
- WHERE DO THEY GOVERN? Boundary graph.
- WHEN CAN THAT CHANGE? Election graph.

## Address-first resolution
ZIP code may assist autocomplete/coarse discovery but is never authoritative for representation. Resolve a physical street address to a precise point, then intersect authoritative/versioned boundaries. Never infer representation solely from city, county, ZIP, or district labels when a boundary lookup is required.

Target layers include federal, state legislative, county/commission, municipal/ward, school/board, special district, and other elected jurisdictions. Census/TIGER may provide important parent/federal/state layers; local layers require the applicable authoritative state/county/municipal/school/special-district sources.

## Honest coverage
Address results must distinguish RESOLVED, AUTHORITATIVE_LOOKUP, INFERRED, and UNRESOLVED. Inferred/unresolved layers cannot be presented as exhaustive representation. UI should disclose which governing layers are resolved and which remain under research.

## Canonical geography objects
Build toward versioned Boundary, SeatBoundaryAssignment, CivicLocation, and AddressResolution concepts. Geometry is evidence-backed/versioned data, never hardcoded application logic.

## Map modes
1. Civic Boundaries: precise 2D overlapping jurisdiction/Seat layers.
2. Civic Explorer: rich 2D/3D exploration with selectable civic markers/cards.
3. Elections: active/upcoming election overlays linked to Seats and CandidateCampaigns.

Legends/toggles should support federal, state, county, municipal, school, special district, elections, and verified civic/public-office locations.

## Markers vs boundaries
Never imply an official personally lives at a map marker. Markers represent verified public civic locations such as government offices, district offices, city halls, legislatures, meeting facilities, or other appropriate public locations. Private residences are not a default civic map feature.

## Civic card
Selecting a Seat/boundary/location should expose a compact evidence-backed card with Seat title, current Occupancy, current-as-of state, next applicable election, CandidateCampaign status/count where known, and navigation to profile/election/evidence/follow functionality. Do not fabricate missing fields.

## Election linkage
Every Seat discovery triggers election-authority/cycle discovery. Map resolution should support both `who represents this address now?` and `who is competing to represent this Seat next?`.

## GIS cohort readiness
A geographic cohort is not address-ready merely because Seats/occupants were harvested. CohortReadinessPackage must report boundary coverage, authoritative sources, unresolved local layers, geometry versions, address-resolution tests, election linkage, and monitoring readiness.

## Historical resolution
Address/geography queries must be capable of using the boundary version effective for the requested historical period. Current polygons must not overwrite historical representation.