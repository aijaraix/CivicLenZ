# Review-only source-discovery staging

Generated JSON records in this directory describe **source candidates**, not people or official profiles.

Each record must include:

- `publicationAllowed: false`
- `reviewStatus: "unreviewed"` when a root was reached
- retrieval timestamp, final URL, HTTP/content metadata, and page hash for visited pages
- candidate source URLs grouped by discovery target
- unresolved target categories

Do not add names, portraits, contact details, social links, biographies, campaign data, assessments, or scores here. A later, separately claimed stage may consume only reviewed sources with retained evidence.

The South Florida workflow uploads every run as an artifact and, after the coordination claim exists on `main`, updates a dedicated bot review branch rather than public data.
