"""Fail-closed routing for canonical contract jobs; no leases or civic writes.

The first route performs raw authoritative retrieval for the evidence scope.
It does not resolve occupants, validate claims, or reconcile an entire scope.
"""
from urllib.parse import urlsplit

ROUTE_VERSION = "hermes-evidence-v1"
WORKER_MODULE = "workers/cloudflare/shared/src/contract-evidence.ts"
# Initial bounded subset of source-config.ts, checked again by the consumer.
SOURCE_ENDPOINTS = {"florida-governor-official": "https://www.flgov.com/",
                    "florida-election-calendar": "https://dos.fl.gov/elections/"}


def resolve(job, need, field, sources, deployment_id=None, transport_ready=False):
    payload = job.get("payload") or {}
    if (job.get("job_type") != "contract_scope_research"
            or payload.get("orchestration_authority") != "hermes"
            or payload.get("execution_class") != "PRODUCTION"
            or need.get("execution_class") != "PRODUCTION"
            or need.get("origin") != "CONTRACT_GAP"
            or not job.get("dedupe_key")
            or payload.get("research_work_identity") != job.get("dedupe_key")
            or str(job.get("research_need_id")) != str(need.get("need_id"))
            or str(job.get("target_id")) != str(need.get("target_id"))
            or job.get("target_type") != need.get("target_type")
            or payload.get("scope_key") != need.get("scope_key")
            or payload.get("contract_id") != str(need.get("contract_id"))
            or payload.get("contract_version") != need.get("contract_version")):
        return {"state": "BLOCKED", "reason": "CANONICAL_IDENTITY_MISMATCH"}
    if (need.get("scope_key") != "evidence"
            or field.get("verification_requirement") != "official_source"
            or field.get("sensitivity_rule") != "publication_eligible_claims_only"):
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
        if SOURCE_ENDPOINTS.get(source["source_key"]) != source.get("source_url"):
            continue
        url = urlsplit(source.get("source_url") or "")
        if (url.scheme != "https" or not url.hostname or url.username or url.password
                or source.get("authority_tier") != "TIER_1_PRIMARY_OFFICIAL"):
            continue
        route = {"version": ROUTE_VERSION, "capability": "authoritative_evidence_retrieval",
                 "pool": "cloudflare-deterministic-http", "worker": "civiclenz-collector",
                 "module": WORKER_MODULE, "deployment_id": deployment_id,
                 "source_id": str(source["source_id"]), "source_key": source["source_key"],
                 "source_url": source["source_url"], "max_bytes": 1048576,
                 "timeout_seconds": 15, "max_concurrency": 1,
                 "output": "raw_retrievals+r2; pending extraction and validation"}
        break
    if not route:
        return {"state": "BLOCKED", "reason": "NO_APPROVED_AUTHORITATIVE_SOURCE"}
    if not deployment_id:
        return {"state": "BLOCKED", "reason": "WORKER_DEPLOYMENT_NOT_VERIFIED", "candidate_route": route}
    if not transport_ready:
        return {"state": "BLOCKED", "reason": "CREDENTIAL_REQUIRED: HERMES scoped Cloudflare queue producer", "candidate_route": route}
    return {"state": "OPEN", "reason": "ROUTE_RESOLVED: authoritative retrieval stage", "route": route}
