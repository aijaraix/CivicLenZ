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
    "news_activity", "social", "jurisdiction", "seat", "monitoring",
    "publication_gate",
))

# Capability-specific evidence contracts. These routes still preserve only
# immutable source evidence; the named capability is the bounded downstream
# reconciliation obligation and is promoted to ACTIVE only by a real worker_run.
# A missing mapping stays on the legacy quarantine route and cannot inflate
# capability truth.
CAPABILITY_CONTRACTS = {
    "candidate_discovery": {"scopes": ("election_history",), "units": ("election_universe",), "output": "candidate_discovery_evidence"},
    "candidate_status": {"scopes": ("election_history",), "units": ("cycle_records",), "output": "candidate_status_evidence"},
    "change_detection": {"scopes": ("monitoring",), "units": ("change_detection",), "output": "change_detection_observation"},
    "completeness_audit": {"scopes": ("*",), "units": ("coverage_audit",), "output": "bounded_coverage_audit_input"},
    "current_officeholder": {"scopes": ("identity",), "units": ("official",), "output": "current_officeholder_evidence"},
    "dataset_reconciliation": {"scopes": ("election_history", "campaign_finance", "financial_disclosure"), "units": ("reconciliation_audit",), "output": "dataset_reconciliation_input"},
    "entity_resolution": {"scopes": ("identity",), "units": ("source_pass",), "output": "entity_resolution_evidence"},
    "identity_resolution": {"scopes": ("identity",), "units": ("official_identity",), "output": "identity_resolution_evidence"},
    "jurisdiction_discovery": {"scopes": ("jurisdiction",), "units": ("*",), "output": "jurisdiction_discovery_evidence"},
    "portrait": {"scopes": ("portrait",), "units": ("official_portrait", "asset_provenance"), "output": "portrait_provenance_evidence"},
    "publication_gate": {"scopes": ("publication_gate",), "units": ("*",), "output": "publication_gate_assessment"},
    "seat_discovery": {"scopes": ("seat",), "units": ("*",), "output": "seat_discovery_evidence"},
    "source_health": {"scopes": ("monitoring",), "units": ("currentness_baseline", "monitoring_followup"), "output": "source_health_observation"},
}
# Family contracts use the existing bounded evidence/quarantine route. These
# entries identify the downstream department and child unit without granting
# identity, verification, or publication authority.
CAPABILITY_CONTRACTS.update({
    "campaign_committees": {"scopes": ("campaign_finance",), "units": ("filing_universe",), "output": "campaign_committee_evidence"},
    "campaign_finance": {"scopes": ("campaign_finance",), "units": ("filing_universe", "transaction_classes"), "output": "campaign_finance_evidence"},
    "contributions": {"scopes": ("campaign_finance",), "units": ("transaction_classes",), "output": "contribution_evidence"},
    "expenditures": {"scopes": ("campaign_finance",), "units": ("transaction_classes",), "output": "expenditure_evidence"},
    "pac_relationships": {"scopes": ("campaign_finance",), "units": ("transaction_classes",), "output": "pac_relationship_evidence"},
    "finance_reconciliation": {"scopes": ("campaign_finance",), "units": ("reconciliation_audit",), "output": "finance_reconciliation_input"},
    "financial_disclosures": {"scopes": ("financial_disclosure",), "units": ("filing_universe", "disclosure_categories"), "output": "financial_disclosure_evidence"},
    "assets": {"scopes": ("financial_disclosure",), "units": ("disclosure_categories",), "output": "asset_disclosure_evidence"},
    "liabilities": {"scopes": ("financial_disclosure",), "units": ("disclosure_categories",), "output": "liability_disclosure_evidence"},
    "income_sources": {"scopes": ("financial_disclosure",), "units": ("disclosure_categories",), "output": "income_source_disclosure_evidence"},
    "business_interests": {"scopes": ("financial_disclosure", "business_interests"), "units": ("disclosure_categories", "source_pass"), "output": "business_interest_evidence"},
    "gifts": {"scopes": ("financial_disclosure",), "units": ("disclosure_categories",), "output": "gift_disclosure_evidence"},
    "outside_income": {"scopes": ("financial_disclosure",), "units": ("disclosure_categories",), "output": "outside_income_disclosure_evidence"},
    "legislation": {"scopes": ("executive_actions",), "units": ("official_actions", "action_period"), "output": "legislative_activity_evidence"},
    "sponsored_bills": {"scopes": ("executive_actions",), "units": ("action_period",), "output": "sponsored_bill_evidence"},
    "votes": {"scopes": ("executive_actions",), "units": ("action_period",), "output": "vote_evidence"},
    "committee_assignments": {"scopes": ("executive_actions",), "units": ("official_actions",), "output": "committee_assignment_evidence"},
    "executive_actions": {"scopes": ("executive_actions",), "units": ("official_actions", "action_period"), "output": "executive_action_evidence"},
    "executive_orders": {"scopes": ("executive_actions",), "units": ("action_period",), "output": "executive_order_evidence"},
    "bill_signings": {"scopes": ("executive_actions",), "units": ("action_period",), "output": "bill_signing_evidence"},
    "vetoes": {"scopes": ("executive_actions",), "units": ("action_period",), "output": "veto_evidence"},
    "appointments": {"scopes": ("executive_actions",), "units": ("official_actions",), "output": "appointment_evidence"},
    "budget_actions": {"scopes": ("executive_actions",), "units": ("action_period",), "output": "budget_action_evidence"},
    "campaign_promises": {"scopes": ("promises_statements",), "units": ("commitment_period",), "output": "campaign_promise_evidence"},
    "public_commitments": {"scopes": ("promises_statements",), "units": ("commitment_period",), "output": "public_commitment_evidence"},
    "public_statements": {"scopes": ("promises_statements",), "units": ("official_commitments",), "output": "public_statement_evidence"},
    "promise_status": {"scopes": ("promises_statements",), "units": ("commitment_period",), "output": "promise_status_input"},
    "official_press": {"scopes": ("news_activity",), "units": ("official_press",), "output": "official_press_evidence"},
    "news": {"scopes": ("news_activity",), "units": ("source_pass",), "output": "news_evidence"},
    "interviews": {"scopes": ("news_activity",), "units": ("source_pass",), "output": "interview_evidence"},
    "debates": {"scopes": ("news_activity",), "units": ("source_pass",), "output": "debate_evidence"},
    "official_social": {"scopes": ("social",), "units": ("official_account_discovery",), "output": "official_social_account_evidence"},
    "material_social_activity": {"scopes": ("social",), "units": ("activity_window",), "output": "social_activity_evidence"},
    "political_relationships": {"scopes": ("family_public_relationships",), "units": ("public_relationship_leads",), "output": "political_relationship_evidence"},
    "organization_relationships": {"scopes": ("family_public_relationships",), "units": ("source_pass",), "output": "organization_relationship_evidence"},
    "staff_relationships": {"scopes": ("family_public_relationships",), "units": ("source_pass",), "output": "staff_relationship_evidence"},
    "appointment_relationships": {"scopes": ("family_public_relationships",), "units": ("public_relationship_leads",), "output": "appointment_relationship_evidence"},
    "publicly_relevant_family_business_relationships": {"scopes": ("family_public_relationships",), "units": ("source_pass",), "output": "family_business_relationship_evidence"},
    "ethics": {"scopes": ("ethics_legal_public_records",), "units": ("official_records",), "output": "ethics_record_evidence"},
    "investigations": {"scopes": ("ethics_legal_public_records",), "units": ("period_records",), "output": "investigation_evidence"},
    "court_public_records": {"scopes": ("ethics_legal_public_records",), "units": ("period_records",), "output": "court_record_evidence"},
    "conflicts_of_interest": {"scopes": ("ethics_legal_public_records",), "units": ("official_records",), "output": "conflict_evidence"},
    "biography": {"scopes": ("biography",), "units": ("official_profile", "chronology"), "output": "biography_evidence"},
    "education": {"scopes": ("education",), "units": ("official_profile", "institution_chronology"), "output": "education_evidence"},
    "career": {"scopes": ("career",), "units": ("official_profile", "career_chronology"), "output": "career_evidence"},
    "military_history": {"scopes": ("biography",), "units": ("chronology",), "output": "military_history_evidence"},
    "political_history": {"scopes": ("political_history",), "units": ("official_history", "election_history"), "output": "political_history_evidence"},
    "prior_offices": {"scopes": ("prior_offices",), "units": ("official_history", "election_history"), "output": "prior_office_evidence"},
    "official_contact": {"scopes": ("contact",), "units": ("official_contact", "source_pass"), "output": "official_contact_evidence"},
})

CAPABILITY_ROUTE_KEYS = tuple(CAPABILITY_CONTRACTS) + ("evidence_quarantine_source_discovery",)


def capability_for_job(job):
    payload = job.get("payload") or {}
    explicit = payload.get("capability_key")
    scope = payload.get("scope_key")
    unit = payload.get("deep_dossier_unit_key")
    if explicit in CAPABILITY_CONTRACTS:
        contract = CAPABILITY_CONTRACTS[explicit]
        if (scope in contract["scopes"] or "*" in contract["scopes"]) and (unit in contract["units"] or "*" in contract["units"]):
            return explicit
        return None
    for key, contract in CAPABILITY_CONTRACTS.items():
        if (scope in contract["scopes"] or "*" in contract["scopes"]) and (unit in contract["units"] or "*" in contract["units"]):
            return key
    return None


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
    capability = capability_for_job(job)
    capability_contract = CAPABILITY_CONTRACTS.get(capability) if capability else None
    if not evidence_scope and not quarantine_scope:
        return {"state": "BLOCKED", "reason": "CAPABILITY_NOT_IMPLEMENTED: contract scope requirements"}
    if capability is None and payload.get("capability_key"):
        return {"state": "BLOCKED", "reason": "CAPABILITY_NOT_IMPLEMENTED: capability contract mismatch"}
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
                 "capability": "authoritative_evidence_retrieval" if evidence_scope else capability or "evidence_quarantine_source_discovery",
                 "stage": "evidence" if evidence_scope else "quarantine",
                 "pool": "cloudflare-deterministic-http", "worker": "civiclenz-collector",
                 "module": WORKER_MODULE, "deployment_id": deployment_id,
                 "capability_contract": capability_contract or {"output": "immutable_raw_evidence_only", "publication_authority": False},
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
