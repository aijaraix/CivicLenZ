# Central Florida local source discovery

This directory belongs only to the **Central Florida review-only source-discovery**
workstream:

- counties: Lake, Orange, Osceola, Polk, and Seminole;
- government levels: county, school district, municipal, special district, and
  judicial;
- phase: `source_discovery`.

The fixed plan is in [source-plan.json](source-plan.json). It currently contains
**15 official entry-point URLs**—county-government, county-election, and
public-school-district hubs for each of the five counties.

A fetched entry point is **not** an official-person record. It proves only that
the configured source page was reachable at collection time. Direct roster
sources for county commissions, constitutional offices, municipal offices,
special districts, and elected or retention judicial seats remain unresolved
until a reviewer adds authoritative source-specific URLs.

The worker:

- makes no recursive crawl and never follows discovered links;
- limits one run to 15 configured source requests, with at most two per host;
- honors `robots.txt` and waits at least 1.5 seconds per host;
- saves only URLs, retrieval metadata, page titles, and SHA-256 hashes;
- writes review-only maps to
  `data/staging/florida/local/central/source-discovery/`;
- does not write a person, officeholder, portrait, contact, social, biography,
  finance, score, monitoring, canonical-profile, or public-site record.

The source map cannot be a basis for a downstream seat or officeholder collector
until direct authoritative roster sources are reviewed. The separate coordination
claim is draft PR #32; this lane must not be merged or run before that claim is
on the default branch.
