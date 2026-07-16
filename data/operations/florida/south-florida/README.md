# South Florida Local Source Discovery

This directory is reserved for the `fl-south-florida-local-source-discovery` claim proposed in coordination PR #32.

## Strict scope

- Counties: **Broward** and **Miami-Dade**
- Government levels: county, school district, municipal, special district, and judicial
- Current data phase: **source discovery only**
- Public exposure: **never from this lane**

This lane maps likely official directories and filing systems. It does **not** create or update an official, candidate, seat, portrait, contact, social account, biography, election, finance, score, monitoring, or public-profile record.

## Isolated outputs

- Seed map: `data/sources/florida-regions/south-florida/`
- Review-only discovery records: `data/staging/florida/local/south-florida/source-discovery/`
- Future reviewed research, only after a separate claim: `data/research-staging/florida/local/south-florida/`
- Operations notes: this directory

No output may be written to Northwest, state/federal, canonical, public UI, or shared-worker-registry paths.

## Source-review gate

A discovered URL is only a candidate. Before any later collector uses it, a reviewer must establish:

1. jurisdiction and office-family relevance;
2. official ownership or a documented official cross-link;
3. retrieval evidence and current status;
4. whether it is a directory, filing system, or merely an informational page; and
5. an authorized promotion path for the next phase.

The scheduled worker writes only review artifacts to a bot branch and opens/updates a draft review PR. It never pushes discovery output to `main`.

## Safe refresh profile

The worker is bounded to two county roots, at most two concurrent county tasks, and a small per-county page budget. The 15-minute CivicLenZ heartbeat should report health and queue state; it must not turn this discovery lane into an unbounded crawler.
