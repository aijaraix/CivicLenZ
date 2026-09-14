# Versioned national contract library

`national-v2.json` is the canonical, reusable v2 specification. `scopeDefinitions`
contains atomic fields, relationships, finite datasets and defined open scopes;
`officeClasses` composes them for 16 permanent office classes. Every referenced
scope retains applicability, source priority, verification, valid-time semantics,
reconciliation, freshness, monitoring, capability and separate publication policy.
Scope presence is an obligation to establish applicability, not an assertion that
all offices possess the same powers or publish the same records.

The existing Cloudflare `office-classes.ts` templates and deployed v1 records are
unchanged. This catalog is **inactive and unbound**. The offline compiler writes
v2 keys into the existing canonical contract tables, preserving the full scope
object in `research_contract_fields.source_priority.contract_scope`. The sibling
`policy` string is deliberately empty: source roles are not registry source keys.
The old router must not treat an abstract authority role as an approved endpoint.
`verification_requirement=contract_scope_v1` names the scope envelope format, not
a civic verification decision or the office contract version.

Run `python services/hermes-prime/contract_library.py --sql /tmp/national-v2.sql`
from the repository root. This only writes SQL. Installation requires review and
the established operator database channel; HERMES receives no new privileges.
Installation inserts 16 inactive contracts, 493 complete field definitions and
493 `CAPABILITY_NOT_IMPLEMENTED` implementation incidents. Reinstallation is
idempotent; existing metadata drift or unexpected fields aborts the transaction.
No Seat binding, ResearchNeed, civic record, attempt or source certification is
changed. Existing incident resolutions survive reinstallation.

Before any binding/activation, implement the exact scope consumer, resolve its
jurisdictional source registry entries and applicability, prove a bounded worker
path physically, and review the resulting contract binding separately. Versions
are immutable: changed definitions require a new version/key, not edits to an
installed v2. No scope declares a profile permanently complete.
