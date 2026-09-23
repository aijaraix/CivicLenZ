"""Bounded deep-dossier graph generation for already-identified reference seats.

This planner creates durable child work identities.  It never creates people,
occupancies or claims, and it never marks a scope complete.  A child may be
dispatched only when its source policy resolves to an active canonical source;
otherwise the missing source family remains an explicit blocked obligation.
"""
from __future__ import annotations

import hashlib
import json
import os
import time


VERSION = "hermes-deep-dossier-graph-v1"
CONTRACT_KEY = "STATE_GOVERNOR"
MAX_SUBJECTS_PER_TICK = 5
MAX_CHILDREN_PER_SCOPE = 3

# These are bounded research purposes, not claims about what a source contains.
# The planner uses the contract's source policy and refuses a child when no
# active source in that policy can perform the requested pass.
CAPABILITY_BY_CHILD = {
    ("identity", "official_identity"): "identity_resolution",
    ("identity", "source_pass"): "entity_resolution",
    ("identity", "official"): "current_officeholder",
    ("jurisdiction", "*"): "jurisdiction_discovery",
    ("seat", "*"): "seat_discovery",
    ("portrait", "official_portrait"): "portrait",
    ("portrait", "asset_provenance"): "portrait",
    ("portrait", "coverage_audit"): "completeness_audit",
    ("election_history", "election_universe"): "candidate_discovery",
    ("election_history", "cycle_records"): "candidate_status",
    ("election_history", "reconciliation_audit"): "dataset_reconciliation",
    ("monitoring", "currentness_baseline"): "source_health",
    ("monitoring", "change_detection"): "change_detection",
    ("monitoring", "monitoring_followup"): "source_health",

    # Capability-family children carry explicit bounded department identity.
    ("biography", "official_profile"): "biography",
    ("biography", "chronology"): "biography",
    ("biography", "coverage_audit"): "completeness_audit",
    ("education", "official_profile"): "education",
    ("education", "institution_chronology"): "education",
    ("education", "coverage_audit"): "completeness_audit",
    ("career", "official_profile"): "career",
    ("career", "career_chronology"): "career",
    ("career", "coverage_audit"): "completeness_audit",
    ("political_history", "official_history"): "political_history",
    ("political_history", "election_history"): "election_history",
    ("political_history", "coverage_audit"): "completeness_audit",
    ("prior_offices", "official_history"): "prior_offices",
    ("prior_offices", "election_history"): "election_history",
    ("prior_offices", "coverage_audit"): "completeness_audit",
    ("campaign_finance", "filing_universe"): "campaign_finance",
    ("campaign_finance", "transaction_classes"): "contributions",
    ("campaign_finance", "reconciliation_audit"): "finance_reconciliation",
    ("financial_disclosure", "filing_universe"): "financial_disclosures",
    ("financial_disclosure", "disclosure_categories"): "assets",
    ("financial_disclosure", "reconciliation_audit"): "dataset_reconciliation",
    ("executive_actions", "official_actions"): "executive_actions",
    ("executive_actions", "action_period"): "executive_orders",
    ("executive_actions", "coverage_audit"): "completeness_audit",
    ("promises_statements", "official_commitments"): "public_statements",
    ("promises_statements", "commitment_period"): "campaign_promises",
    ("promises_statements", "coverage_audit"): "completeness_audit",
    ("news_activity", "official_press"): "official_press",
    ("news_activity", "source_pass"): "news",
    ("news_activity", "coverage_audit"): "completeness_audit",
    ("social", "official_account_discovery"): "official_social",
    ("social", "activity_window"): "material_social_activity",
    ("social", "coverage_audit"): "completeness_audit",
    ("contact", "official_contact"): "official_contact",
    ("contact", "source_pass"): "official_contact",
    ("contact", "coverage_audit"): "completeness_audit",
    ("business_interests", "disclosure_business_interests"): "business_interests",
    ("business_interests", "source_pass"): "business_interests",
    ("business_interests", "coverage_audit"): "completeness_audit",
    ("ethics_legal_public_records", "official_records"): "ethics",
    ("ethics_legal_public_records", "period_records"): "investigations",
    ("ethics_legal_public_records", "coverage_audit"): "completeness_audit",
    ("family_public_relationships", "public_relationship_leads"): "political_relationships",
    ("family_public_relationships", "source_pass"): "organization_relationships",
    ("family_public_relationships", "coverage_audit"): "completeness_audit",
    ("family_public_relationships", "donor_relationship_leads"): "donor_relationships",
    ("elections_gis", "calendar_window"): "election_calendar",
    ("elections_gis", "election_universe"): "election_discovery",
    ("elections_gis", "filing_records"): "filing_status",
    ("elections_gis", "ballot_records"): "ballot_qualification",
    ("elections_gis", "result_records"): "election_results",
    ("elections_gis", "historical_cycles"): "election_history",
    ("quality_monitoring", "currentness_check"): "freshness_monitor",
    ("quality_monitoring", "contradiction_check"): "contradiction_resolution",
    ("quality_monitoring", "coverage_audit"): "completeness_audit",
    ("gis_boundaries", "boundary_geometry"): "gis_boundaries",
    ("gis_boundaries", "reconciliation_audit"): "dataset_reconciliation",
    ("gis_boundaries", "coverage_audit"): "completeness_audit",
    ("source_discovery", "source_inventory"): "source_discovery",
    ("source_discovery", "source_family_discovery"): "source_discovery",
    ("source_discovery", "archive_discovery"): "source_discovery",
    ("source_discovery", "lead_normalization"): "source_discovery",
    ("source_discovery", "independent_rediscovery"): "source_discovery",
    ("source_discovery", "unresolved_lead_closure"): "source_discovery",
    ("source_discovery", "coverage_audit"): "completeness_audit",
}

def capability_for_child(scope: str, child: str) -> str | None:
    return CAPABILITY_BY_CHILD.get((scope, child)) or CAPABILITY_BY_CHILD.get((scope, "*"))

CHILDREN = {
    "identity": ("official_identity", "source_pass", "official"),
    "biography": ("official_profile", "chronology", "coverage_audit"),
    "education": ("official_profile", "institution_chronology", "coverage_audit"),
    "career": ("official_profile", "career_chronology", "coverage_audit"),
    "political_history": ("official_history", "election_history", "coverage_audit"),
    "prior_offices": ("official_history", "election_history", "coverage_audit"),
    "election_history": ("election_universe", "cycle_records", "reconciliation_audit"),
    "campaign_finance": ("filing_universe", "transaction_classes", "reconciliation_audit"),
    "financial_disclosure": ("filing_universe", "disclosure_categories", "reconciliation_audit"),
    "executive_actions": ("official_actions", "action_period", "coverage_audit"),
    "promises_statements": ("official_commitments", "commitment_period", "coverage_audit"),
    "news_activity": ("official_press", "source_pass", "coverage_audit"),
    "social": ("official_account_discovery", "activity_window", "coverage_audit"),
    "contact": ("official_contact", "source_pass", "coverage_audit"),
    "portrait": ("official_portrait", "asset_provenance", "coverage_audit"),
    "business_interests": ("disclosure_business_interests", "source_pass", "coverage_audit"),
    "ethics_legal_public_records": ("official_records", "period_records", "coverage_audit"),
    "family_public_relationships": ("public_relationship_leads", "source_pass", "coverage_audit"),
    "elections_gis": ("calendar_window", "election_universe", "result_records"),
    "quality_monitoring": ("currentness_check", "contradiction_check", "coverage_audit"),
    "gis_boundaries": ("boundary_geometry", "reconciliation_audit", "coverage_audit"),
    "source_discovery": ("source_inventory", "source_family_discovery", "independent_rediscovery"),
    "monitoring": ("currentness_baseline", "change_detection", "monitoring_followup"),
}


def _identity(seat_id: str, contract_id: str, version: str, scope: str, child: str,
              generation: int = 1, source_family: str | None = None,
              discovery_pass: int = 1) -> tuple[str, str]:
    semantic = {
        "version": 1,
        "graph_version": VERSION,
        "subject_type": "seat",
        "subject_id": str(seat_id),
        "contract_id": str(contract_id),
        "contract_version": str(version),
        "scope_key": scope,
        "child_unit": child,
        "generation": generation,
    }
    if source_family is not None:
        semantic["source_family"] = source_family
        semantic["discovery_pass"] = discovery_pass
    digest = hashlib.sha256(json.dumps(semantic, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return "need:v1:" + digest, "work:v1:" + digest


def _source_policy(policy: object) -> list[str]:
    if not isinstance(policy, dict) or not isinstance(policy.get("policy"), str):
        return []
    return [key.strip() for key in policy["policy"].split(",") if key.strip()]


MAX_SOURCE_FAMILY_PASSES = 3

def _sources_for_child(child: str, policy: object, sources: dict[str, dict]) -> list[str]:
    allowed = _source_policy(policy)
    if not allowed:
        return []
    # The source registry remains authoritative. Prefer explicitly relevant
    # official/election families, then retain the declared order. No URL is
    # inferred from a child label.
    election_child = any(marker in child for marker in ("election", "filing", "transaction", "disclosure"))
    active = [key for key in allowed if key in sources and sources[key].get("active")]
    preferred = [key for key in active if
                 ((election_child and "election" in key)
                  or (not election_child and ("governor" in key or "official" in key)))]
    selected = preferred or active
    return selected[:MAX_SOURCE_FAMILY_PASSES]


def _source_for_child(child: str, policy: object, sources: dict[str, dict]) -> tuple[str | None, str]:
    selected = _sources_for_child(child, policy, sources)
    return (selected[0], "SOURCE_RESOLVED") if selected else (None, "SOURCE_FAMILY_NOT_REGISTERED")


def reconcile() -> dict:
    # Keep pure identity/source helpers importable in the lightweight test
    # environment; the production dependency is loaded only for a live tick.
    from database_bootstrap import connect_database

    created_needs = created_jobs = regenerated_jobs = blocked_children = examined = 0
    execution_enabled = os.environ.get("HERMES_DEEP_DOSSIER_EXECUTION") == "true"
    current_deployment = os.environ.get("HERMES_EVIDENCE_WORKER_DEPLOYMENT")
    with connect_database() as connection:
        with connection, connection.cursor() as cursor:
            cursor.execute("SELECT pg_try_advisory_xact_lock(184913,13)")
            if not cursor.fetchone()[0]:
                return {"state": "ANOTHER_DEEP_DOSSIER_TICK_ACTIVE", "observed_at": time.time()}

            cursor.execute("""
                SELECT s.seat_id,c.research_contract_id,c.version,f.field_key,
                       f.research_contract_field_id,f.source_priority
                FROM public.seats s
                JOIN public.research_contracts c ON c.contract_key=%s AND c.active
                JOIN public.research_contract_fields f ON f.research_contract_id=c.research_contract_id
                WHERE s.research_contract_key=%s
                  AND s.baseline_status IN ('officeholder_pending','baseline_research','baseline_complete','verified','reviewed','complete')
                ORDER BY s.created_at,f.sort_order,f.field_key
                LIMIT %s
            """, (CONTRACT_KEY, CONTRACT_KEY, MAX_SUBJECTS_PER_TICK * 25))
            rows = cursor.fetchall()
            if not rows:
                return {"state": "DEEP_DOSSIER_NO_ELIGIBLE_SUBJECT", "observed_at": time.time()}
            cursor.execute("SELECT source_id,source_key,source_url,active,authority_tier FROM public.sources WHERE active")
            sources = {row[1]: {
                "source_id": row[0], "source_key": row[1], "source_url": row[2],
                "active": row[3], "authority_tier": row[4],
            } for row in cursor.fetchall()}

            seen_subjects: set[str] = set()
            for seat_id, contract_id, version, scope, contract_field_id, source_priority in rows:
                if str(seat_id) not in seen_subjects and len(seen_subjects) >= MAX_SUBJECTS_PER_TICK:
                    continue
                seen_subjects.add(str(seat_id))
                children = CHILDREN.get(scope)
                if not children:
                    continue
                for child in children[:MAX_CHILDREN_PER_SCOPE]:
                    examined += 1
                    source_keys = _sources_for_child(child, source_priority, sources)
                    if not source_keys:
                        source_keys = [None]
                    for source_key in source_keys:
                        source_family_pass = source_key if len(source_keys) > 1 else None
                        need_key, work_key = _identity(
                            seat_id, contract_id, version, scope, child,
                            source_family=source_family_pass,
                        )
                        source_state = "SOURCE_RESOLVED" if source_key else "SOURCE_FAMILY_NOT_REGISTERED"
                        source = sources.get(source_key) if source_key else None
                        blocked = source is None
                        capability_key = capability_for_child(scope, child)
                        basis = {
                            "rule": "deep_dossier_child_graph_v1",
                            "graph_version": VERSION,
                            "parent_scope_key": scope,
                            "dossier_unit": child,
                            "contract_field_id": str(contract_field_id),
                            "source_selection": source_state,
                            "source_key": source_key,
                            "source_family_pass": source_family_pass,
                            "discovery_pass": 1,
                            "capability_key": capability_key,
                            "truth_authority": False,
                            "identity_authority": False,
                            "verification_authority": False,
                            "publication_authority": False,
                        }
                        cursor.execute("""
                            INSERT INTO hermes_ops.research_needs
                              (need_key,contract_id,contract_version,target_type,target_id,scope_key,
                               origin,execution_class,state,reason,basis,priority)
                            VALUES(%s,%s,%s,'seat',%s,%s,'CONTRACT_GAP','PRODUCTION',%s,%s,%s::jsonb,30)
                            ON CONFLICT(need_key) DO NOTHING RETURNING need_id
                        """, (
                            need_key, contract_id, str(version), seat_id, scope,
                            "BLOCKED" if blocked else "OPEN",
                            "SOURCE_FAMILY_NOT_REGISTERED" if blocked else "DEEP_DOSSIER_CHILD_READY",
                            json.dumps(basis),
                        ))
                        need = cursor.fetchone()
                        if need:
                            created_needs += 1
                        else:
                            cursor.execute("SELECT need_id FROM hermes_ops.research_needs WHERE need_key=%s", (need_key,))
                            need = cursor.fetchone()
                        if not need:
                            continue
                        supersedes_job_id = None
                        generation = 1
                        if source and execution_enabled and current_deployment:
                            cursor.execute("""
                                SELECT j.job_id,j.status,j.payload
                                FROM public.jobs j
                                WHERE j.dedupe_key=%s
                            """, (work_key,))
                            prior = cursor.fetchone()
                            prior_route = (prior[2] or {}).get("capability_route", {}) if prior else {}
                            prior_deployment = prior_route.get("deployment_id")
                            prior_capability = prior_route.get("capability") or (prior[2] or {}).get("capability_key")
                            capability_refresh_required = bool(capability_key and prior_capability != capability_key)
                            if prior and prior[1] == "succeeded" and prior_deployment and prior_deployment != current_deployment:
                                cursor.execute("""
                                    SELECT 1 FROM public.worker_runs wr
                                    WHERE wr.job_id=%s AND wr.status='succeeded'
                                      AND wr.metadata->>'dossier_evidence_id' IS NOT NULL
                                    LIMIT 1
                                """, (prior[0],))
                                prior_has_capability_evidence = bool(cursor.fetchone())
                                if capability_refresh_required or not prior_has_capability_evidence:
                                    generation = 2
                                    supersedes_job_id = str(prior[0])
                                    need_basis = dict(basis)
                                    need_basis.update({
                                        "regeneration_generation": generation,
                                        "supersedes_job_id": supersedes_job_id,
                                        "regeneration_deployment": current_deployment,
                                    })
                                    cursor.execute("""
                                        UPDATE hermes_ops.research_needs
                                        SET state='OPEN', reason='DEEP_DOSSIER_REGENERATION_REQUIRED',
                                            basis=%s::jsonb, evaluated_at=clock_timestamp()
                                        WHERE need_id=%s
                                    """, (json.dumps(need_basis), need[0]))
                                    regenerated_jobs += 1
                        if generation > 1:
                            _, work_key = _identity(seat_id, contract_id, version, scope, child, generation, source_family=source_family_pass)
                        payload = {
                            "orchestration_authority": "hermes",
                            "execution_class": "PRODUCTION",
                            "research_work_identity": work_key,
                            "scope_key": scope,
                            "contract_id": str(contract_id),
                            "contract_version": str(version),
                            "deep_dossier_graph_version": VERSION,
                            "deep_dossier_generation": generation,
                            "deep_dossier_unit_key": child,
                            "deep_dossier_parent_scope": scope,
                            "source_key": source_key,
                            "source_family_pass": source_family_pass,
                            "discovery_pass": 1,
                            "capability_key": capability_key,
                            "classification_ceiling": "extracted_unreviewed",
                            "identity_authority": False,
                            "verification_allowed": False,
                            "publication_allowed": False,
                            "dispatch_blocker": "CAPABILITY_NOT_IMPLEMENTED" if not blocked else "SOURCE_FAMILY_NOT_REGISTERED",
                        }
                        if supersedes_job_id:
                            payload["supersedes_job_id"] = supersedes_job_id
                        cursor.execute("""
                            INSERT INTO public.jobs
                              (job_type,target_type,target_id,seat_id,source_id,priority,status,attempt_count,
                               max_attempts,dedupe_key,payload,research_need_id)
                            VALUES('contract_scope_research','seat',%s,%s,%s,30,'queued',0,2,%s,%s::jsonb,%s)
                            ON CONFLICT(dedupe_key) DO NOTHING RETURNING job_id
                        """, (
                            seat_id, seat_id, source["source_id"] if source else None,
                            work_key, json.dumps(payload), need[0],
                        ))
                        if cursor.fetchone():
                            created_jobs += 1
                        if blocked:
                            blocked_children += 1
    return {
        "state": "DEEP_DOSSIER_GRAPH_WORK_CREATED" if created_jobs else "DEEP_DOSSIER_GRAPH_PRESENT",
        "graph_version": VERSION,
        "subjects": len(seen_subjects),
        "children_examined": examined,
        "needs_created": created_needs,
        "jobs_created": created_jobs,
        "regenerated_jobs": regenerated_jobs,
        "blocked_children": blocked_children,
        "observed_at": time.time(),
    }
