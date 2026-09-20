"""Fail-closed routing for canonical contract jobs; no leases or civic writes.

The first route performs raw authoritative retrieval for the evidence scope.
It does not resolve occupants, validate claims, or reconcile an entire scope.
"""
from urllib.parse import urlsplit

ROUTE_VERSION = "hermes-evidence-v1"
WORKER_MODULE = "workers/cloudflare/shared/src/contract-evidence.ts"
# Source URLs are read from the canonical source registry. This one
# compatibility path is retained for the already-proven Governor route: the
# registry entry is the homepage, while its bounded retrieval target is the
# documented leadership page. All other routes use the registry URL exactly.
REGISTRY_RETRIEVAL_OVERRIDES = {
    "florida-governor-official": "https://www.flgov.com/eog/",
}
ALLOWED_AUTHORITY_TIERS = frozenset(("TIER_1_PRIMARY_OFFICIAL",))
ALLOWED_NEED_ORIGINS = frozenset(("CONTRACT_GAP", "MONITORING", "DISCOVERY"))

# These routes preserve source evidence only.  They are deliberately not an
# identity, claim, occupancy, or publication path: the bounded scope remains
# unresolved until a later capability supplies its own extraction and
# validation contract.
QUARANTINE_SCOPES = frozenset((
    "portrait", "contact", "identity", "biography", "education", "career",
    "political_history", "prior_offices", "election_history", "campaign_finance",
    "financial_disclosure", "executive_actions", "promises_statements",
    "news_activity", "social", "jurisdiction", "seat",
))


def resolve(job, need, field, sources, deployment_id=None, transport_ready=False):
    payload = job.get("payload") or {}
    if (job.get("job_type") != "contract_scope_research"
            or payload.get("orchestration_authority") != "hermes"
            or payload.get("execution_class") != "PRODUCTION"
            or need.get("execution_class") != "PRODUCTION"
            or need.get("origin") not in ALLOWED_NEED_ORIGINS
            or not job.get("dedupe_key")
            or payload.get("research_work_identity") != job.get("dedupe_key")
            or str(job.get("research_need_id")) != str(need.get("need_id"))
            or str(job.get("target_id")) != str(need.get("target_id"))
            or job.get("target_type") != need.get("target_type")
            or payload.get("scope_key") != need.get("scope_key")
            or payload.get("contract_id") != str(need.get("contract_id"))
            or payload.get("contract_version") != need.get("contract_version")):
        return {"state": "BLOCKED", "reason": "CANONICAL_IDENTITY_MISMATCH"}
    scope = need.get("scope_key")
    evidence_scope = (scope == "evidence"
        and field.get("verification_requirement") == "official_source"
        and field.get("sensitivity_rule") == "publication_eligible_claims_only")
    quarantine_scope = scope in QUARANTINE_SCOPES
    if not evidence_scope and not quarantine_scope:
        return {"state": "BLOCKED", "reason": "CAPABILITY_NOT_IMPLEMENTED: contract scope requirements"}
    policy = field.get("source_priority") or {}
    keys = policy.get("policy", "") if isinstance(policy, dict) else ""
    if not isinstance(keys, str):
        return {"state": "BLOCKED", "reason": "SOURCE_POLICY_UNSUPPORTED"}
    candidates = {s["source_key"]: s for s in sources}
    route = None
    for key in keys.split(","):
        source = candidates.get(key.strip())
        if not source or not source.get("active"):
            continue
        url = urlsplit(source.get("source_url") or "")
        if (url.scheme != "https" or not url.hostname or url.username or url.password
                or source.get("authority_tier") not in ALLOWED_AUTHORITY_TIERS
                or not source.get("source_key") or not source.get("source_id")):
            continue
        # The URL is selected solely from the canonical registry row. A job
        # payload cannot provide or override a retrieval URL.
        retrieval_url = REGISTRY_RETRIEVAL_OVERRIDES.get(source["source_key"], source["source_url"])
        retrieval = urlsplit(retrieval_url)
        if retrieval.scheme != "https" or retrieval.hostname != url.hostname:
            continue
        route = {"version": ROUTE_VERSION,
                 "capability": "authoritative_evidence_retrieval" if evidence_scope else "evidence_quarantine_source_discovery",
                 "stage": "evidence" if evidence_scope else "quarantine",
                 "pool": "cloudflare-deterministic-http", "worker": "civiclenz-collector",
                 "module": WORKER_MODULE, "deployment_id": deployment_id,
                 "source_id": str(source["source_id"]), "source_key": source["source_key"],
                 "source_url": source["source_url"],
                 "retrieval_url": retrieval_url,
                 "max_bytes": 1048576,
                 "timeout_seconds": 15, "max_concurrency": 1,
                 "output": "raw_retrievals+r2; pending extraction and validation" if evidence_scope
                    else "raw_retrievals+r2; unresolved source/evidence quarantine only",
                 "identity_attribution": "unresolved" if quarantine_scope else "contract_bound",
                 "publication_eligible": False}
        break
    if not route:
        return {"state": "BLOCKED", "reason": "NO_APPROVED_AUTHORITATIVE_SOURCE"}
    if not deployment_id:
        return {"state": "BLOCKED", "reason": "WORKER_DEPLOYMENT_NOT_VERIFIED", "candidate_route": route}
    if not transport_ready:
        return {"state": "BLOCKED", "reason": "CREDENTIAL_REQUIRED: HERMES scoped Cloudflare queue producer", "candidate_route": route}
    return {"state": "OPEN", "reason": "ROUTE_RESOLVED: authoritative retrieval stage" if evidence_scope
            else "ROUTE_RESOLVED: evidence quarantine source discovery", "route": route}
