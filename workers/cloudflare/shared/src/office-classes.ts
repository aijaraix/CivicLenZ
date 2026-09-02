import type { Capability } from "./capabilities.ts";

/** Office-class research contracts. Never person-specific. */
export const OFFICE_CLASSES = [
  "STATE_GOVERNOR",
  "STATE_EXECUTIVE",
  "STATE_SENATOR",
  "STATE_REPRESENTATIVE",
  "COUNTY_COMMISSIONER",
  "SHERIFF",
  "MAYOR",
  "CITY_COUNCIL_MEMBER",
  "SCHOOL_BOARD_MEMBER",
  "JUDGE",
  "SPECIAL_DISTRICT_MEMBER",
] as const;
export type OfficeClass = (typeof OFFICE_CLASSES)[number];

export const RESEARCH_PRIORITIES = [0, 1, 2, 3, 4, 5] as const;
export type ResearchPriority = (typeof RESEARCH_PRIORITIES)[number];

export const FIELD_CATEGORIES = [
  "identity",
  "seat",
  "occupancy",
  "portrait",
  "contact",
  "biography",
  "political",
  "elections",
  "finance",
  "disclosures",
  "government_activity",
  "accountability",
  "relationships",
  "media",
  "monitoring",
  "evidence",
] as const;
export type FieldCategory = (typeof FIELD_CATEGORIES)[number];

export const COMPLETION_RULES = [
  "required_present_or_honestly_closed",
  "coverage_complete_for_defined_scope",
] as const;
export type CompletionRule = (typeof COMPLETION_RULES)[number];

export const PUBLICATION_POLICIES = ["publication_eligible_claims_only"] as const;
export type PublicationPolicy = (typeof PUBLICATION_POLICIES)[number];

export type ContractFieldSpec = {
  fieldKey: string;
  category: FieldCategory;
  requiredForBaseline: boolean;
  optional: boolean;
  openEnded: boolean;
  enumerableDataset: boolean;
  verificationRequirement: string;
  preferredSources: string[];
  completionRule: CompletionRule;
  volatility: "IMMUTABLE" | "LOW" | "MEDIUM" | "HIGH";
  recheckInterval: string;
  datasetReconciliation?: string;
  publicationPolicy: PublicationPolicy;
  priority: ResearchPriority;
  capability: Capability;
};

export type OfficeClassContract = {
  contractKey: OfficeClass;
  name: string;
  officeClass: OfficeClass;
  version: number;
  active: boolean;
  description: string;
  completionRule: CompletionRule;
  publicationPolicy: PublicationPolicy;
  preferredSources: string[];
  volatility: "LOW" | "MEDIUM" | "HIGH";
  recheckInterval: string;
  datasetReconciliation: string[];
  stub: boolean;
  fields: ContractFieldSpec[];
};

const OPEN_ENDED = new Set([
  "biography",
  "news_activity",
  "promises_statements",
  "family_public_relationships",
]);

function field(
  partial: Omit<ContractFieldSpec, "publicationPolicy" | "completionRule" | "openEnded" | "optional"> & {
    completionRule?: CompletionRule;
    openEnded?: boolean;
  },
): ContractFieldSpec {
  const openEnded = partial.openEnded ?? OPEN_ENDED.has(partial.fieldKey);
  return {
    ...partial,
    optional: !partial.requiredForBaseline,
    openEnded,
    completionRule:
      partial.completionRule ??
      (openEnded ? "coverage_complete_for_defined_scope" : "required_present_or_honestly_closed"),
    publicationPolicy: "publication_eligible_claims_only",
  };
}

const IDENTITY_SEAT_FIELDS: ContractFieldSpec[] = [
  field({
    fieldKey: "jurisdiction",
    category: "seat",
    requiredForBaseline: true,
    enumerableDataset: false,
    verificationRequirement: "review",
    preferredSources: [],
    volatility: "IMMUTABLE",
    recheckInterval: "365d",
    priority: 0,
    capability: "jurisdiction_discovery",
  }),
  field({
    fieldKey: "seat",
    category: "seat",
    requiredForBaseline: true,
    enumerableDataset: false,
    verificationRequirement: "review",
    preferredSources: [],
    volatility: "IMMUTABLE",
    recheckInterval: "365d",
    priority: 0,
    capability: "seat_discovery",
  }),
  field({
    fieldKey: "person",
    category: "identity",
    requiredForBaseline: true,
    enumerableDataset: false,
    verificationRequirement: "review",
    preferredSources: [],
    volatility: "LOW",
    recheckInterval: "30d",
    priority: 0,
    capability: "identity_resolution",
  }),
  field({
    fieldKey: "occupancy",
    category: "occupancy",
    requiredForBaseline: true,
    enumerableDataset: false,
    verificationRequirement: "review",
    preferredSources: [],
    volatility: "MEDIUM",
    recheckInterval: "7d",
    priority: 0,
    capability: "officeholder_discovery",
  }),
  field({
    fieldKey: "current_occupant",
    category: "occupancy",
    requiredForBaseline: true,
    enumerableDataset: false,
    verificationRequirement: "official_source",
    preferredSources: [],
    volatility: "MEDIUM",
    recheckInterval: "7d",
    priority: 0,
    capability: "officeholder_discovery",
  }),
  field({
    fieldKey: "portrait",
    category: "portrait",
    requiredForBaseline: true,
    enumerableDataset: false,
    verificationRequirement: "official_source",
    preferredSources: [],
    volatility: "LOW",
    recheckInterval: "90d",
    priority: 0,
    capability: "portrait_discovery",
  }),
  field({
    fieldKey: "contact",
    category: "contact",
    requiredForBaseline: true,
    enumerableDataset: false,
    verificationRequirement: "official_source",
    preferredSources: [],
    volatility: "MEDIUM",
    recheckInterval: "30d",
    priority: 0,
    capability: "contact_discovery",
  }),
  field({
    fieldKey: "identity",
    category: "identity",
    requiredForBaseline: true,
    enumerableDataset: false,
    verificationRequirement: "official_source",
    preferredSources: [],
    volatility: "LOW",
    recheckInterval: "30d",
    priority: 0,
    capability: "identity_resolution",
  }),
];

const SHARED_ENRICHMENT_FIELDS: ContractFieldSpec[] = [
  field({
    fieldKey: "biography",
    category: "biography",
    requiredForBaseline: false,
    enumerableDataset: false,
    verificationRequirement: "review",
    preferredSources: [],
    volatility: "LOW",
    recheckInterval: "90d",
    priority: 1,
    capability: "biography_research",
    openEnded: true,
  }),
  field({
    fieldKey: "education",
    category: "biography",
    requiredForBaseline: false,
    enumerableDataset: false,
    verificationRequirement: "review",
    preferredSources: [],
    volatility: "LOW",
    recheckInterval: "365d",
    priority: 1,
    capability: "education_research",
  }),
  field({
    fieldKey: "career",
    category: "biography",
    requiredForBaseline: false,
    enumerableDataset: false,
    verificationRequirement: "review",
    preferredSources: [],
    volatility: "LOW",
    recheckInterval: "180d",
    priority: 1,
    capability: "career_research",
  }),
  field({
    fieldKey: "political_history",
    category: "political",
    requiredForBaseline: false,
    enumerableDataset: false,
    verificationRequirement: "review",
    preferredSources: [],
    volatility: "LOW",
    recheckInterval: "90d",
    priority: 1,
    capability: "prior_office_research",
  }),
  field({
    fieldKey: "prior_offices",
    category: "political",
    requiredForBaseline: false,
    enumerableDataset: false,
    verificationRequirement: "review",
    preferredSources: [],
    volatility: "LOW",
    recheckInterval: "90d",
    priority: 1,
    capability: "prior_office_research",
  }),
  field({
    fieldKey: "election_history",
    category: "elections",
    requiredForBaseline: false,
    enumerableDataset: true,
    verificationRequirement: "official_source",
    preferredSources: ["florida-election-calendar"],
    volatility: "HIGH",
    recheckInterval: "1d",
    datasetReconciliation: "elections",
    priority: 1,
    capability: "election_results_check",
  }),
  field({
    fieldKey: "campaign_finance",
    category: "finance",
    requiredForBaseline: false,
    enumerableDataset: true,
    verificationRequirement: "official_source",
    preferredSources: [],
    volatility: "HIGH",
    recheckInterval: "7d",
    datasetReconciliation: "campaign_finance",
    priority: 2,
    capability: "campaign_finance",
  }),
  field({
    fieldKey: "financial_disclosure",
    category: "disclosures",
    requiredForBaseline: false,
    enumerableDataset: true,
    verificationRequirement: "official_source",
    preferredSources: [],
    volatility: "MEDIUM",
    recheckInterval: "30d",
    datasetReconciliation: "disclosures",
    priority: 2,
    capability: "financial_disclosure",
  }),
  field({
    fieldKey: "business_interests",
    category: "disclosures",
    requiredForBaseline: false,
    enumerableDataset: false,
    verificationRequirement: "review",
    preferredSources: [],
    volatility: "MEDIUM",
    recheckInterval: "90d",
    priority: 3,
    capability: "business_interest",
  }),
  field({
    fieldKey: "ethics_legal_public_records",
    category: "accountability",
    requiredForBaseline: false,
    enumerableDataset: false,
    verificationRequirement: "review",
    preferredSources: [],
    volatility: "HIGH",
    recheckInterval: "7d",
    priority: 3,
    capability: "ethics_integrity",
  }),
  field({
    fieldKey: "family_public_relationships",
    category: "relationships",
    requiredForBaseline: false,
    enumerableDataset: false,
    verificationRequirement: "review",
    preferredSources: [],
    volatility: "LOW",
    recheckInterval: "180d",
    priority: 3,
    capability: "relationship_conflict",
    openEnded: true,
  }),
  field({
    fieldKey: "promises_statements",
    category: "media",
    requiredForBaseline: false,
    enumerableDataset: false,
    verificationRequirement: "review",
    preferredSources: [],
    volatility: "HIGH",
    recheckInterval: "1d",
    priority: 4,
    capability: "promise_collection",
    openEnded: true,
  }),
  field({
    fieldKey: "news_activity",
    category: "media",
    requiredForBaseline: false,
    enumerableDataset: false,
    verificationRequirement: "review",
    preferredSources: [],
    volatility: "HIGH",
    recheckInterval: "1d",
    priority: 4,
    capability: "statement_collection",
    openEnded: true,
  }),
  field({
    fieldKey: "social",
    category: "contact",
    requiredForBaseline: false,
    enumerableDataset: false,
    verificationRequirement: "review",
    preferredSources: [],
    volatility: "MEDIUM",
    recheckInterval: "30d",
    priority: 4,
    capability: "social_account_discovery",
  }),
  field({
    fieldKey: "monitoring",
    category: "monitoring",
    requiredForBaseline: true,
    enumerableDataset: false,
    verificationRequirement: "review",
    preferredSources: [],
    volatility: "HIGH",
    recheckInterval: "1d",
    priority: 5,
    capability: "change_detection",
  }),
  field({
    fieldKey: "evidence",
    category: "evidence",
    requiredForBaseline: true,
    enumerableDataset: false,
    verificationRequirement: "official_source",
    preferredSources: [],
    volatility: "MEDIUM",
    recheckInterval: "7d",
    priority: 0,
    capability: "evidence_validation",
  }),
];

function withSources(fields: ContractFieldSpec[], sources: string[]): ContractFieldSpec[] {
  return fields.map((item) =>
    item.preferredSources.length > 0 ? item : { ...item, preferredSources: sources },
  );
}

function contract(input: {
  officeClass: OfficeClass;
  name: string;
  preferredSources: string[];
  datasetReconciliation: string[];
  extraFields?: ContractFieldSpec[];
  stub?: boolean;
  volatility?: "LOW" | "MEDIUM" | "HIGH";
  recheckInterval?: string;
}): OfficeClassContract {
  const extra = input.extraFields ?? [];
  const fields = withSources([...IDENTITY_SEAT_FIELDS, ...extra, ...SHARED_ENRICHMENT_FIELDS], input.preferredSources);
  return {
    contractKey: input.officeClass,
    name: input.name,
    officeClass: input.officeClass,
    version: 1,
    active: true,
    description: `${input.name}. Office-class contract; never person-specific. Publication-eligible claims only. Open-ended datasets may reach coverage_complete_for_defined_scope, never everything_on_the_internet_complete.`,
    completionRule: "required_present_or_honestly_closed",
    publicationPolicy: "publication_eligible_claims_only",
    preferredSources: input.preferredSources,
    volatility: input.volatility ?? "MEDIUM",
    recheckInterval: input.recheckInterval ?? "7d",
    datasetReconciliation: input.datasetReconciliation,
    stub: input.stub ?? false,
    fields,
  };
}

const LEGISLATIVE_EXTRAS: ContractFieldSpec[] = [
  field({
    fieldKey: "committees",
    category: "government_activity",
    requiredForBaseline: false,
    enumerableDataset: true,
    verificationRequirement: "official_source",
    preferredSources: [],
    volatility: "MEDIUM",
    recheckInterval: "30d",
    priority: 2,
    capability: "committee_membership",
  }),
  field({
    fieldKey: "legislative_actions",
    category: "government_activity",
    requiredForBaseline: false,
    enumerableDataset: true,
    verificationRequirement: "official_source",
    preferredSources: [],
    volatility: "HIGH",
    recheckInterval: "1d",
    datasetReconciliation: "votes",
    priority: 2,
    capability: "legislative_activity",
  }),
];

const EXECUTIVE_EXTRAS: ContractFieldSpec[] = [
  field({
    fieldKey: "executive_actions",
    category: "government_activity",
    requiredForBaseline: false,
    enumerableDataset: true,
    verificationRequirement: "official_source",
    preferredSources: [],
    volatility: "HIGH",
    recheckInterval: "1d",
    datasetReconciliation: "executive_orders",
    priority: 2,
    capability: "executive_action",
  }),
];

export const OFFICE_CLASS_CONTRACTS: Record<OfficeClass, OfficeClassContract> = {
  STATE_GOVERNOR: contract({
    officeClass: "STATE_GOVERNOR",
    name: "State governor research contract",
    preferredSources: ["florida-governor-official", "florida-election-calendar"],
    datasetReconciliation: ["campaign_finance", "elections", "executive_orders", "disclosures"],
    extraFields: EXECUTIVE_EXTRAS,
    volatility: "MEDIUM",
    recheckInterval: "7d",
  }),
  STATE_EXECUTIVE: contract({
    officeClass: "STATE_EXECUTIVE",
    name: "State executive cabinet research contract",
    preferredSources: ["florida-election-calendar"],
    datasetReconciliation: ["campaign_finance", "elections", "disclosures"],
    extraFields: EXECUTIVE_EXTRAS,
  }),
  STATE_SENATOR: contract({
    officeClass: "STATE_SENATOR",
    name: "State senator research contract",
    preferredSources: ["florida-senate-members", "florida-election-calendar"],
    datasetReconciliation: ["campaign_finance", "elections", "votes", "disclosures"],
    extraFields: LEGISLATIVE_EXTRAS,
  }),
  STATE_REPRESENTATIVE: contract({
    officeClass: "STATE_REPRESENTATIVE",
    name: "State representative research contract",
    preferredSources: ["florida-house-members", "florida-election-calendar"],
    datasetReconciliation: ["campaign_finance", "elections", "votes", "disclosures"],
    extraFields: LEGISLATIVE_EXTRAS,
  }),
  COUNTY_COMMISSIONER: contract({
    officeClass: "COUNTY_COMMISSIONER",
    name: "County commissioner research contract (stub)",
    preferredSources: [],
    datasetReconciliation: ["elections", "disclosures"],
    stub: true,
  }),
  SHERIFF: contract({
    officeClass: "SHERIFF",
    name: "Sheriff research contract (stub)",
    preferredSources: [],
    datasetReconciliation: ["elections", "disclosures"],
    stub: true,
  }),
  MAYOR: contract({
    officeClass: "MAYOR",
    name: "Mayor research contract (stub)",
    preferredSources: [],
    datasetReconciliation: ["elections", "disclosures"],
    extraFields: EXECUTIVE_EXTRAS,
    stub: true,
  }),
  CITY_COUNCIL_MEMBER: contract({
    officeClass: "CITY_COUNCIL_MEMBER",
    name: "City council member research contract (stub)",
    preferredSources: [],
    datasetReconciliation: ["elections", "votes", "disclosures"],
    stub: true,
  }),
  SCHOOL_BOARD_MEMBER: contract({
    officeClass: "SCHOOL_BOARD_MEMBER",
    name: "School board member research contract (stub)",
    preferredSources: [],
    datasetReconciliation: ["elections", "disclosures"],
    stub: true,
  }),
  JUDGE: contract({
    officeClass: "JUDGE",
    name: "Judge research contract (stub)",
    preferredSources: [],
    datasetReconciliation: ["elections", "disclosures"],
    stub: true,
  }),
  SPECIAL_DISTRICT_MEMBER: contract({
    officeClass: "SPECIAL_DISTRICT_MEMBER",
    name: "Special district member research contract (stub)",
    preferredSources: [],
    datasetReconciliation: ["elections", "disclosures"],
    stub: true,
  }),
};

const OFFICE_TYPE_TO_CLASS: Record<string, OfficeClass> = {
  governor: "STATE_GOVERNOR",
  state_governor: "STATE_GOVERNOR",
  attorney_general: "STATE_EXECUTIVE",
  chief_financial_officer: "STATE_EXECUTIVE",
  cfo: "STATE_EXECUTIVE",
  agriculture_commissioner: "STATE_EXECUTIVE",
  commissioner_of_agriculture: "STATE_EXECUTIVE",
  lieutenant_governor: "STATE_EXECUTIVE",
  secretary_of_state: "STATE_EXECUTIVE",
  state_senator: "STATE_SENATOR",
  state_representative: "STATE_REPRESENTATIVE",
  county_commissioner: "COUNTY_COMMISSIONER",
  sheriff: "SHERIFF",
  mayor: "MAYOR",
  county_mayor: "MAYOR",
  city_council_member: "CITY_COUNCIL_MEMBER",
  school_board_member: "SCHOOL_BOARD_MEMBER",
  judge: "JUDGE",
  special_district_member: "SPECIAL_DISTRICT_MEMBER",
};

export function officeClassForOfficeType(officeType: string | undefined): OfficeClass {
  if (!officeType) return "STATE_EXECUTIVE";
  const direct = OFFICE_TYPE_TO_CLASS[officeType];
  if (direct) return direct;
  const upper = officeType.toUpperCase().replace(/[\s-]+/g, "_");
  if ((OFFICE_CLASSES as readonly string[]).includes(upper)) return upper as OfficeClass;
  return "STATE_EXECUTIVE";
}

export function contractForOfficeType(officeType: string | undefined): OfficeClassContract {
  return OFFICE_CLASS_CONTRACTS[officeClassForOfficeType(officeType)];
}

export function jobPriorityForResearchPriority(priority: ResearchPriority): number {
  return 500 - priority * 80;
}

export function isOfficeClass(value: string): value is OfficeClass {
  return (OFFICE_CLASSES as readonly string[]).includes(value);
}
