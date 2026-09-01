import type { JobRoute } from "./types.ts";

export const CAPABILITY_STATES = [
  "DECLARED",
  "NOT_IMPLEMENTED",
  "READY",
  "ACTIVE",
  "DEGRADED",
  "DISABLED",
  "FAILED",
] as const;
export type CapabilityState = (typeof CAPABILITY_STATES)[number];

export const CAPABILITIES = [
  "seat_discovery",
  "jurisdiction_discovery",
  "officeholder_discovery",
  "vacancy_check",
  "term_refresh",
  "seat_structure_refresh",
  "election_calendar_discovery",
  "candidate_filing_check",
  "candidate_discovery",
  "candidate_status_refresh",
  "ballot_qualification_check",
  "election_results_check",
  "election_certification_check",
  "identity_resolution",
  "portrait_discovery",
  "contact_discovery",
  "social_account_discovery",
  "biography_research",
  "education_research",
  "career_research",
  "prior_office_research",
  "legislative_activity",
  "executive_action",
  "committee_membership",
  "statement_collection",
  "promise_collection",
  "public_position_collection",
  "campaign_finance",
  "financial_disclosure",
  "business_interest",
  "asset_disclosure",
  "relationship_conflict",
  "ethics_integrity",
  "source_health",
  "change_detection",
  "entity_resolution",
  "contradiction_check",
  "evidence_validation",
  "completeness_audit",
  "publication_gate",
  "source_discovery",
  "large_pdf_parse",
  "gis_parse",
  "browser_render",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

const QUEUE_FOR_CAPABILITY: Record<Capability, JobRoute> = {
  seat_discovery: "ingest",
  jurisdiction_discovery: "ingest",
  officeholder_discovery: "ingest",
  vacancy_check: "monitor",
  term_refresh: "monitor",
  seat_structure_refresh: "ingest",
  election_calendar_discovery: "monitor",
  candidate_filing_check: "monitor",
  candidate_discovery: "monitor",
  candidate_status_refresh: "monitor",
  ballot_qualification_check: "monitor",
  election_results_check: "monitor",
  election_certification_check: "monitor",
  identity_resolution: "validate",
  portrait_discovery: "ingest",
  contact_discovery: "ingest",
  social_account_discovery: "ingest",
  biography_research: "heavy",
  education_research: "heavy",
  career_research: "heavy",
  prior_office_research: "heavy",
  legislative_activity: "heavy",
  executive_action: "heavy",
  committee_membership: "ingest",
  statement_collection: "heavy",
  promise_collection: "heavy",
  public_position_collection: "heavy",
  campaign_finance: "heavy",
  financial_disclosure: "heavy",
  business_interest: "heavy",
  asset_disclosure: "heavy",
  relationship_conflict: "validate",
  ethics_integrity: "validate",
  source_health: "monitor",
  change_detection: "monitor",
  entity_resolution: "validate",
  contradiction_check: "validate",
  evidence_validation: "validate",
  completeness_audit: "validate",
  publication_gate: "validate",
  source_discovery: "monitor",
  large_pdf_parse: "heavy",
  gis_parse: "heavy",
  browser_render: "heavy",
};

const READY: Capability[] = [
  "officeholder_discovery",
  "source_health",
  "change_detection",
  "evidence_validation",
  "entity_resolution",
  "identity_resolution",
  "publication_gate",
  "election_calendar_discovery",
  "source_discovery",
  "seat_discovery",
  "jurisdiction_discovery",
  "candidate_discovery",
  "candidate_status_refresh",
  "portrait_discovery",
  "completeness_audit",
];

const HEAVY_PREPARE: Capability[] = [
  "large_pdf_parse",
  "gis_parse",
  "browser_render",
  "biography_research",
  "education_research",
  "career_research",
  "campaign_finance",
  "financial_disclosure",
];

export function queueForCapability(capability: Capability): JobRoute {
  return QUEUE_FOR_CAPABILITY[capability];
}

export function capabilityState(capability: Capability): CapabilityState {
  if (READY.includes(capability)) return "READY";
  if (HEAVY_PREPARE.includes(capability)) return "NOT_IMPLEMENTED";
  return "NOT_IMPLEMENTED";
}

export function isImplementedCapability(capability: string): capability is Capability {
  return (CAPABILITIES as readonly string[]).includes(capability) && capabilityState(capability as Capability) === "READY";
}

export function assertCapabilityOrFailClosed(capability: string): Capability {
  if (!(CAPABILITIES as readonly string[]).includes(capability)) {
    throw Object.assign(new Error(`unknown capability ${capability}`), { errorClass: "not_implemented" });
  }
  const typed = capability as Capability;
  if (capabilityState(typed) === "NOT_IMPLEMENTED") {
    throw Object.assign(new Error(`capability ${capability} is NOT_IMPLEMENTED`), { errorClass: "not_implemented" });
  }
  return typed;
}
