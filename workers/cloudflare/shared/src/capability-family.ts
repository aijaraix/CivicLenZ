import { uuidFromName } from "./ids.ts";
import type { CivicStore, ScheduleJobInput } from "./store.ts";
import type { JobRoute } from "./types.ts";

export const CAPABILITY_FAMILIES = [
  "finance",
  "disclosure",
  "commitments",
  "government_activity",
  "media_social_news",
  "relationships_public_records",
  "gis_elections",
  "quality_monitoring",
  "source_discovery",
  "profile_history",
] as const;
export type CapabilityFamily = (typeof CAPABILITY_FAMILIES)[number];

export const DATASET_KINDS = ["FINITE", "OPEN_ENDED", "STREAMING_MONITORED"] as const;
export type DatasetKind = (typeof DATASET_KINDS)[number];

export type CapabilityFamilySpec = {
  capability: string;
  family: CapabilityFamily;
  workerModule: string;
  queuePool: string;
  route: JobRoute;
  datasetKind: DatasetKind;
  units: readonly string[];
  sourceFamilies: readonly string[];
  validationHandoff: string;
  coverageHandoff: string;
  requiresIdentity: boolean;
  publicationAuthority: false;
  verificationAuthority: false;
};

export type CapabilityFamilyWork = {
  researchWorkIdentity: string;
  dedupeKey: string;
  subjectType: string;
  subjectId: string;
  seatId?: string;
  capability: string;
  family: CapabilityFamily;
  unitKey: string;
  scopeKey: string;
  datasetKind: DatasetKind;
  queuePool: string;
  route: JobRoute;
  workerModule: string;
  sourceFamilies: readonly string[];
  executionClass: "PRODUCTION";
  orchestrationAuthority: "HERMES";
  publicationAuthority: false;
  verificationAuthority: false;
  validationHandoff: string;
  coverageHandoff: string;
  generation: number;
};

export type CapabilityFamilyPlanInput = {
  subjectType: string;
  subjectId: string;
  seatId?: string;
  subjectKey: string;
  capability: string;
  generation?: number;
};

export type QueuedCapabilityFamilyWork = CapabilityFamilyWork & {
  jobId: string;
  created: boolean;
};

const MODULE = "workers/cloudflare/shared/src/capability-family.ts";

function spec(
  capability: string,
  family: CapabilityFamily,
  units: readonly string[],
  options: Partial<Pick<CapabilityFamilySpec, "datasetKind" | "sourceFamilies" | "requiresIdentity">> = {},
): CapabilityFamilySpec {
  const datasetKind = options.datasetKind ?? "OPEN_ENDED";
  const route: JobRoute =
    family === "quality_monitoring" ? "validate" : family === "source_discovery" ? "monitor" : "heavy";
  return {
    capability,
    family,
    workerModule: MODULE,
    queuePool: `cloudflare-capability-${family}`,
    route,
    datasetKind,
    units,
    sourceFamilies: options.sourceFamilies ?? [],
    validationHandoff:
      family === "quality_monitoring"
        ? "canonical_validation_result"
        : "evidence_validation_then_entity_resolution",
    coverageHandoff:
      datasetKind === "FINITE"
        ? "independent_coverage_audit_expected_vs_accounted"
        : "independent_coverage_audit_multi_pass_lead_closure",
    requiresIdentity: options.requiresIdentity ?? true,
    publicationAuthority: false,
    verificationAuthority: false,
  };
}

const FINANCE_UNITS = [
  "committee_universe",
  "filing_period",
  "contributions",
  "expenditures",
  "transfers_and_refunds",
  "amendments",
  "source_totals",
  "reconciliation_audit",
] as const;
const DISCLOSURE_UNITS = [
  "filing_universe",
  "filing_period",
  "assets",
  "liabilities",
  "income_sources",
  "business_interests",
  "gifts",
  "outside_income",
  "amendments",
  "reconciliation_audit",
] as const;
const COMMITMENT_UNITS = [
  "official_statements",
  "campaign_promises",
  "public_commitments",
  "positions",
  "promise_status",
  "source_family_pass",
  "time_window",
  "unresolved_lead_closure",
  "coverage_audit",
] as const;
const GOVERNMENT_UNITS = [
  "legislation",
  "sponsored_bills",
  "votes",
  "committee_assignments",
  "executive_actions",
  "orders",
  "bill_signings",
  "vetoes",
  "appointments",
  "budget_actions",
  "coverage_audit",
] as const;
const MEDIA_UNITS = [
  "official_press",
  "news",
  "interviews",
  "debates",
  "podcasts",
  "official_social_accounts",
  "social_activity_window",
  "source_family_pass",
  "unresolved_lead_closure",
  "coverage_audit",
] as const;
const RELATIONSHIP_UNITS = [
  "political_relationships",
  "donor_relationships",
  "organization_relationships",
  "staff_relationships",
  "appointment_relationships",
  "family_business_relationships",
  "ethics",
  "investigations",
  "court_public_records",
  "conflicts_of_interest",
  "source_family_pass",
  "coverage_audit",
] as const;
const ELECTION_GIS_UNITS = [
  "jurisdiction",
  "election_calendar",
  "candidate_universe",
  "candidate_status",
  "filing_status",
  "ballot_qualification",
  "results_and_certification",
  "boundary_geometry",
  "reconciliation_audit",
] as const;
const QUALITY_UNITS = [
  "entity_resolution",
  "contradiction_resolution",
  "evidence_validation",
  "completeness_audit",
  "dataset_reconciliation",
  "publication_gate",
  "source_health",
  "change_detection",
  "freshness_monitor",
] as const;
const DISCOVERY_UNITS = [
  "source_inventory",
  "source_family_discovery",
  "archive_discovery",
  "lead_normalization",
  "independent_rediscovery",
  "unresolved_lead_closure",
  "coverage_audit",
] as const;
const PROFILE_UNITS = [
  "biography",
  "education",
  "career",
  "military_history",
  "political_history",
  "prior_offices",
  "election_history",
  "portrait",
  "contact",
] as const;

const OFFICIAL_SOURCES = ["official_registry", "official_filings", "official_agency"] as const;
const OPEN_WEB_SOURCES = ["official_source", "reputable_media", "archival_source"] as const;

export const CAPABILITY_FAMILY_SPECS: readonly CapabilityFamilySpec[] = [
  spec("campaign_committees", "finance", FINANCE_UNITS, { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("campaign_finance", "finance", FINANCE_UNITS, { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("contributions", "finance", ["contributions", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("expenditures", "finance", ["expenditures", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("pac_relationships", "finance", ["committee_universe", "transfers_and_refunds", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("finance_reconciliation", "finance", ["filing_period", "source_totals", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("financial_disclosures", "disclosure", DISCLOSURE_UNITS, { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("assets", "disclosure", ["filing_universe", "assets", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("liabilities", "disclosure", ["filing_universe", "liabilities", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("income_sources", "disclosure", ["filing_universe", "income_sources", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("business_interests", "disclosure", ["filing_universe", "business_interests", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("gifts", "disclosure", ["filing_universe", "gifts", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("outside_income", "disclosure", ["filing_universe", "outside_income", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),

  spec("campaign_promises", "commitments", COMMITMENT_UNITS, { sourceFamilies: OPEN_WEB_SOURCES }),
  spec("public_commitments", "commitments", COMMITMENT_UNITS, { sourceFamilies: OPEN_WEB_SOURCES }),
  spec("public_statements", "commitments", COMMITMENT_UNITS, { sourceFamilies: OPEN_WEB_SOURCES }),
  spec("promise_status", "commitments", ["promise_status", "time_window", "coverage_audit"], { sourceFamilies: OPEN_WEB_SOURCES }),

  spec("legislation", "government_activity", GOVERNMENT_UNITS, { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("sponsored_bills", "government_activity", ["legislation", "sponsored_bills", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("votes", "government_activity", ["legislation", "votes", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("committee_assignments", "government_activity", ["committee_assignments", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("executive_actions", "government_activity", GOVERNMENT_UNITS, { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("executive_orders", "government_activity", ["executive_actions", "orders", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("bill_signings", "government_activity", ["executive_actions", "bill_signings", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("vetoes", "government_activity", ["executive_actions", "vetoes", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("appointments", "government_activity", ["appointments", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("budget_actions", "government_activity", ["budget_actions", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),

  spec("official_press", "media_social_news", MEDIA_UNITS, { sourceFamilies: OPEN_WEB_SOURCES }),
  spec("news", "media_social_news", MEDIA_UNITS, { sourceFamilies: OPEN_WEB_SOURCES }),
  spec("interviews", "media_social_news", MEDIA_UNITS, { sourceFamilies: OPEN_WEB_SOURCES }),
  spec("debates", "media_social_news", MEDIA_UNITS, { sourceFamilies: OPEN_WEB_SOURCES }),
  spec("material_social_activity", "media_social_news", MEDIA_UNITS, { sourceFamilies: ["official_social", "reputable_media"] }),
  spec("official_social", "media_social_news", ["official_social_accounts", "social_activity_window", "coverage_audit"], { sourceFamilies: ["official_social", "official_source"] }),
  spec("change_detection", "media_social_news", ["source_family_pass", "time_window", "coverage_audit"], { datasetKind: "STREAMING_MONITORED", sourceFamilies: OPEN_WEB_SOURCES }),

  spec("political_relationships", "relationships_public_records", RELATIONSHIP_UNITS, { sourceFamilies: OPEN_WEB_SOURCES }),
  spec("donor_relationships", "relationships_public_records", RELATIONSHIP_UNITS, { sourceFamilies: [...OFFICIAL_SOURCES, "reputable_media"] }),
  spec("organization_relationships", "relationships_public_records", RELATIONSHIP_UNITS, { sourceFamilies: OPEN_WEB_SOURCES }),
  spec("staff_relationships", "relationships_public_records", RELATIONSHIP_UNITS, { sourceFamilies: OPEN_WEB_SOURCES }),
  spec("appointment_relationships", "relationships_public_records", RELATIONSHIP_UNITS, { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("publicly_relevant_family_business_relationships", "relationships_public_records", RELATIONSHIP_UNITS, { sourceFamilies: OPEN_WEB_SOURCES }),
  spec("ethics", "relationships_public_records", RELATIONSHIP_UNITS, { sourceFamilies: OFFICIAL_SOURCES }),
  spec("investigations", "relationships_public_records", RELATIONSHIP_UNITS, { sourceFamilies: [...OFFICIAL_SOURCES, "reputable_media"] }),
  spec("court_public_records", "relationships_public_records", RELATIONSHIP_UNITS, { sourceFamilies: ["court_registry", "reputable_media"] }),
  spec("conflicts_of_interest", "relationships_public_records", RELATIONSHIP_UNITS, { sourceFamilies: [...OFFICIAL_SOURCES, "reputable_media"] }),

  spec("jurisdiction_discovery", "gis_elections", ELECTION_GIS_UNITS, { sourceFamilies: OFFICIAL_SOURCES, requiresIdentity: false }),
  spec("election_calendar", "gis_elections", ELECTION_GIS_UNITS, { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES, requiresIdentity: false }),
  spec("election_discovery", "gis_elections", ELECTION_GIS_UNITS, { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES, requiresIdentity: false }),
  spec("candidate_discovery", "gis_elections", ELECTION_GIS_UNITS, { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES, requiresIdentity: false }),
  spec("candidate_status", "gis_elections", ["candidate_universe", "candidate_status", "filing_status", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("filing_status", "gis_elections", ["candidate_universe", "filing_status", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("ballot_qualification", "gis_elections", ["candidate_universe", "ballot_qualification", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("election_results", "gis_elections", ["results_and_certification", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("gis_boundaries", "gis_elections", ["jurisdiction", "boundary_geometry", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: ["authoritative_gis"] }),

  spec("source_health", "quality_monitoring", QUALITY_UNITS, { datasetKind: "STREAMING_MONITORED", sourceFamilies: ["source_registry"], requiresIdentity: false }),
  spec("freshness_monitor", "quality_monitoring", ["freshness_monitor", "change_detection", "coverage_audit"], { datasetKind: "STREAMING_MONITORED", sourceFamilies: ["source_registry"], requiresIdentity: false }),
  spec("entity_resolution", "quality_monitoring", ["entity_resolution", "contradiction_resolution", "evidence_validation"], { sourceFamilies: ["canonical_evidence"] }),
  spec("contradiction_resolution", "quality_monitoring", ["contradiction_resolution", "evidence_validation"], { sourceFamilies: ["canonical_evidence"] }),
  spec("dataset_reconciliation", "quality_monitoring", ["dataset_reconciliation", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: ["canonical_evidence"] }),
  spec("completeness_audit", "quality_monitoring", QUALITY_UNITS, { sourceFamilies: ["canonical_evidence"], requiresIdentity: false }),
  spec("publication_gate", "quality_monitoring", ["publication_gate", "evidence_validation"], { sourceFamilies: ["canonical_evidence"], requiresIdentity: false }),

  spec("source_discovery", "source_discovery", DISCOVERY_UNITS, { sourceFamilies: ["source_registry", "official_source", "reputable_media"], requiresIdentity: false }),
  spec("biography", "profile_history", PROFILE_UNITS, { sourceFamilies: OPEN_WEB_SOURCES }),
  spec("education", "profile_history", ["education", "source_family_pass", "coverage_audit"], { sourceFamilies: OPEN_WEB_SOURCES }),
  spec("career", "profile_history", ["career", "prior_offices", "source_family_pass", "coverage_audit"], { sourceFamilies: OPEN_WEB_SOURCES }),
  spec("military_history", "profile_history", ["military_history", "source_family_pass", "coverage_audit"], { sourceFamilies: OPEN_WEB_SOURCES }),
  spec("political_history", "profile_history", ["political_history", "prior_offices", "source_family_pass", "coverage_audit"], { sourceFamilies: OPEN_WEB_SOURCES }),
  spec("prior_offices", "profile_history", ["prior_offices", "source_family_pass", "coverage_audit"], { sourceFamilies: OPEN_WEB_SOURCES }),
  spec("election_history", "profile_history", ["election_history", "reconciliation_audit"], { datasetKind: "FINITE", sourceFamilies: OFFICIAL_SOURCES }),
  spec("portrait", "profile_history", ["portrait", "source_family_pass", "coverage_audit"], { sourceFamilies: ["official_source", "reputable_media"] }),
  spec("official_contact", "profile_history", ["contact", "source_family_pass", "coverage_audit"], { sourceFamilies: ["official_source"] }),
] as const;

const SPEC_BY_CAPABILITY = new Map(CAPABILITY_FAMILY_SPECS.map((item) => [item.capability, item]));

export function capabilityFamilySpec(capability: string): CapabilityFamilySpec | undefined {
  return SPEC_BY_CAPABILITY.get(capability);
}

export function planCapabilityFamilyWork(input: CapabilityFamilyPlanInput): CapabilityFamilyWork[] {
  const definition = capabilityFamilySpec(input.capability);
  if (!definition) return [];
  const generation = input.generation ?? 1;
  return definition.units.map((unitKey) => {
    const scopeKey = `${input.capability}:${unitKey}`;
    const researchWorkIdentity = `family:v1:${input.subjectKey}:${input.capability}:${unitKey}:g${generation}`;
    return {
      researchWorkIdentity,
      dedupeKey: `research:${researchWorkIdentity}`,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      seatId: input.seatId,
      capability: definition.capability,
      family: definition.family,
      unitKey,
      scopeKey,
      datasetKind: definition.datasetKind,
      queuePool: definition.queuePool,
      route: definition.route,
      workerModule: definition.workerModule,
      sourceFamilies: definition.sourceFamilies,
      executionClass: "PRODUCTION",
      orchestrationAuthority: "HERMES",
      publicationAuthority: false,
      verificationAuthority: false,
      validationHandoff: definition.validationHandoff,
      coverageHandoff: definition.coverageHandoff,
      generation,
    };
  });
}

export async function queueCapabilityFamilyWork(
  store: CivicStore,
  input: CapabilityFamilyPlanInput,
): Promise<{ planned: CapabilityFamilyWork[]; queued: QueuedCapabilityFamilyWork[] }> {
  const planned = planCapabilityFamilyWork(input);
  const queued: QueuedCapabilityFamilyWork[] = [];
  for (const work of planned) {
    const scheduleInput: ScheduleJobInput = {
      dedupeKey: work.dedupeKey,
      route: work.route,
      entityType: input.subjectType,
      entityId: input.subjectId,
      seatId: input.seatId,
      payload: {
        capability: work.capability,
        capabilityFamily: work.family,
        unitKey: work.unitKey,
        scopeKey: work.scopeKey,
        researchWorkIdentity: work.researchWorkIdentity,
        queuePool: work.queuePool,
        workerModule: work.workerModule,
        sourceFamilies: [...work.sourceFamilies],
        datasetKind: work.datasetKind,
        execution_class: work.executionClass,
        orchestration_authority: work.orchestrationAuthority,
        publication_authority: work.publicationAuthority,
        verification_authority: work.verificationAuthority,
        validationHandoff: work.validationHandoff,
        coverageHandoff: work.coverageHandoff,
        generation: work.generation,
      },
    };
    const scheduled = await store.scheduleJob(scheduleInput);
    queued.push({ ...work, jobId: scheduled.job.jobId, created: scheduled.created });
  }
  return { planned, queued };
}

export async function capabilityFamilyWorkId(input: CapabilityFamilyPlanInput & { unitKey: string }): Promise<string> {
  return uuidFromName(
    `family:v1:${input.subjectKey}:${input.capability}:${input.unitKey}:g${input.generation ?? 1}`,
  );
}
