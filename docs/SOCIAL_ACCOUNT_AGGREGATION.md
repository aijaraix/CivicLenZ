# CivicLenZ public-account aggregation policy

## Purpose

A public official may have an office account, an official personal account, a campaign account, a government-agency account, and unrelated accounts with similar names. CivicLenZ must not merge those together or guess ownership from a handle.

This policy governs how public accounts are located, stored, reviewed, and displayed.

## Account classes

| Class | Meaning | Public display rule |
| --- | --- | --- |
| `office` | An account presented by an official government office. | May display after an official government source links to it. |
| `official` | A public account clearly presented by the elected official. | May display after a primary official or campaign source supports it. |
| `campaign` | A campaign or political committee account. | May display only with a campaign-source link and visible campaign label. |
| `personal` | A public personal account used by the official. | Requires explicit source support; never infer it from a matching name. |
| `other` | A public account relevant to an officeholder but not one of the above. | Requires an explanatory label and source. |
| `unclassified` | A candidate link found on an official page but not yet classified. | Stays in the review queue; it is not shown publicly. |

## Evidence order

1. An official government website that directly links to the account.
2. The official’s verified campaign website.
3. A government directory or official press page.
4. The platform’s own verified-account indicator, recorded as supporting—not sole—evidence.
5. Human review using more than one independently attributable source.

A social platform profile alone is not enough to establish ownership.

## Required fields before public display

- Platform and canonical URL.
- Account class.
- Public handle or display label, where available.
- Source URL that supports the account’s association.
- Last checked time.
- Verification state.
- Active/removed/unknown state.

No placeholder fields such as `twitterUrl` or guessed handles may appear on a public profile.

## Collection workflow

1. The social-link collector reads links from an official or campaign website already connected to an official record.
2. It creates an **unreviewed staging candidate** with the source page, link, retrieval time, and content hash.
3. A reviewer confirms ownership and assigns an account class.
4. The reviewed account is added to the canonical official profile with its supporting source.
5. Scheduled checks flag a changed or removed link for review; they never silently rewrite a public record.

The collector does not log into social platforms, bypass access controls, or scrape private content.

## Profile presentation

Profiles group accounts by role—Office, Official, Campaign, or Personal public account—and show the supporting source and last-checked status. When no account is published, the page says that social-account research is in progress rather than implying the official has no accounts.

## Correction path

An office, campaign, or member may submit a correction with a direct official source. CivicLenZ preserves the existing record, review decision, and material change history.
