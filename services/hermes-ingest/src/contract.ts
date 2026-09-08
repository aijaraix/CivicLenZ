import { createHash } from "node:crypto";

import {
  RESEARCH_INGEST_CONTRACT_VERSION,
  type EntityCandidate,
  type EvidenceSubmission,
  type JsonObject,
  type JsonValue,
  type ResearchIngestEnvelope,
} from "./types.ts";

const SHA256_HEX = /^[a-f0-9]{64}$/i;
const PROMOTION_TERMS = new Set(["verified", "canonical", "published", "publication_eligible"]);

export type EnvelopeValidation =
  | { ok: true; envelope: ResearchIngestEnvelope }
  | { ok: false; errors: string[]; unsupportedContract: boolean };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (isRecord(value)) return Object.values(value).every(isJsonValue);
  return false;
}

function requireObject(value: unknown, path: string, errors: string[]): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return undefined;
  }
  return value;
}

function requireArray(value: unknown, path: string, errors: string[]): unknown[] | undefined {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return undefined;
  }
  return value;
}

function requireString(value: unknown, path: string, errors: string[], options: { min?: number; max?: number } = {}): string | undefined {
  if (typeof value !== "string") {
    errors.push(`${path} must be a string`);
    return undefined;
  }
  if (options.min !== undefined && value.length < options.min) errors.push(`${path} must not be empty`);
  if (options.max !== undefined && value.length > options.max) errors.push(`${path} exceeds its maximum length`);
  return value;
}

function requireBoolean(value: unknown, path: string, errors: string[]): boolean | undefined {
  if (typeof value !== "boolean") {
    errors.push(`${path} must be a boolean`);
    return undefined;
  }
  return value;
}

function requireInteger(value: unknown, path: string, errors: string[], minimum = 0): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum) {
    errors.push(`${path} must be an integer greater than or equal to ${minimum}`);
    return undefined;
  }
  return value;
}

function requireDateTime(value: unknown, path: string, errors: string[]): string | undefined {
  const parsed = requireString(value, path, errors, { min: 1, max: 128 });
  if (parsed !== undefined && Number.isNaN(Date.parse(parsed))) errors.push(`${path} must be an ISO-8601 timestamp`);
  return parsed;
}

function requireSha256(value: unknown, path: string, errors: string[]): string | undefined {
  const parsed = requireString(value, path, errors, { min: 64, max: 64 });
  if (parsed !== undefined && !SHA256_HEX.test(parsed)) errors.push(`${path} must be a SHA-256 hexadecimal digest`);
  return parsed?.toLowerCase();
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string, errors: string[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) errors.push(`${path}.${key} is not allowed by this contract version`);
  }
}

function requiredKeys(value: Record<string, unknown>, required: readonly string[], path: string, errors: string[]): void {
  for (const key of required) {
    if (!(key in value)) errors.push(`${path}.${key} is required`);
  }
}

function validateStringArray(value: unknown, path: string, errors: string[], minItems = 0): string[] | undefined {
  if (!isStringArray(value)) {
    errors.push(`${path} must be an array of strings`);
    return undefined;
  }
  if (value.length < minItems) errors.push(`${path} requires at least ${minItems} item(s)`);
  return value;
}

function validateUrl(value: unknown, path: string, errors: string[]): string | undefined {
  const url = requireString(value, path, errors, { min: 1, max: 4096 });
  if (url !== undefined) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") errors.push(`${path} must use http or https`);
    } catch {
      errors.push(`${path} must be a URL`);
    }
  }
  return url;
}

function validateSource(value: unknown, path: string, errors: string[]): void {
  const source = requireObject(value, path, errors);
  if (!source) return;
  exactKeys(source, ["source_key", "source_url", "source_name", "authority_tier"], path, errors);
  requiredKeys(source, ["source_key", "source_url"], path, errors);
  requireString(source.source_key, `${path}.source_key`, errors, { min: 1, max: 256 });
  validateUrl(source.source_url, `${path}.source_url`, errors);
  if (source.source_name !== undefined) requireString(source.source_name, `${path}.source_name`, errors, { max: 512 });
  if (source.authority_tier !== undefined) requireString(source.authority_tier, `${path}.authority_tier`, errors, { max: 128 });
}

function validateRetrieval(value: unknown, path: string, errors: string[]): void {
  const retrieval = requireObject(value, path, errors);
  if (!retrieval) return;
  const allowed = [
    "source_key",
    "source_url",
    "retrieved_at",
    "content_hash",
    "mime_type",
    "byte_length",
    "method",
    "parser_version",
  ];
  exactKeys(retrieval, allowed, path, errors);
  requiredKeys(retrieval, allowed, path, errors);
  requireString(retrieval.source_key, `${path}.source_key`, errors, { min: 1, max: 256 });
  validateUrl(retrieval.source_url, `${path}.source_url`, errors);
  requireDateTime(retrieval.retrieved_at, `${path}.retrieved_at`, errors);
  requireSha256(retrieval.content_hash, `${path}.content_hash`, errors);
  requireString(retrieval.mime_type, `${path}.mime_type`, errors, { min: 1, max: 512 });
  requireInteger(retrieval.byte_length, `${path}.byte_length`, errors);
  requireString(retrieval.method, `${path}.method`, errors, { min: 1, max: 256 });
  requireString(retrieval.parser_version, `${path}.parser_version`, errors, { min: 1, max: 256 });
}

function base64LooksValid(value: string): boolean {
  if (value.length === 0 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) return false;
  const decoded = Buffer.from(value, "base64");
  return decoded.toString("base64") === value;
}

function validateEvidence(value: unknown, path: string, errors: string[]): EvidenceSubmission | undefined {
  const evidence = requireObject(value, path, errors);
  if (!evidence) return undefined;
  const required = ["evidence_key", "source_url", "retrieved_at", "mime_type", "byte_length", "sha256", "method", "parser_version"];
  exactKeys(evidence, [...required, "content_base64", "locator"], path, errors);
  requiredKeys(evidence, required, path, errors);
  const evidenceKey = requireString(evidence.evidence_key, `${path}.evidence_key`, errors, { min: 1, max: 256 });
  const sourceUrl = validateUrl(evidence.source_url, `${path}.source_url`, errors);
  const retrievedAt = requireDateTime(evidence.retrieved_at, `${path}.retrieved_at`, errors);
  const mimeType = requireString(evidence.mime_type, `${path}.mime_type`, errors, { min: 1, max: 512 });
  const byteLength = requireInteger(evidence.byte_length, `${path}.byte_length`, errors);
  const sha256 = requireSha256(evidence.sha256, `${path}.sha256`, errors);
  const method = requireString(evidence.method, `${path}.method`, errors, { min: 1, max: 256 });
  const parserVersion = requireString(evidence.parser_version, `${path}.parser_version`, errors, { min: 1, max: 256 });
  let contentBase64: string | undefined;
  if (evidence.content_base64 !== undefined) {
    contentBase64 = requireString(evidence.content_base64, `${path}.content_base64`, errors, { min: 4 });
    if (contentBase64 !== undefined && !base64LooksValid(contentBase64)) errors.push(`${path}.content_base64 must be strict base64`);
  }
  const locator = evidence.locator === undefined ? undefined : requireString(evidence.locator, `${path}.locator`, errors, { max: 4096 });
  if (
    evidenceKey === undefined ||
    sourceUrl === undefined ||
    retrievedAt === undefined ||
    mimeType === undefined ||
    byteLength === undefined ||
    sha256 === undefined ||
    method === undefined ||
    parserVersion === undefined
  ) {
    return undefined;
  }
  return {
    evidence_key: evidenceKey,
    source_url: sourceUrl,
    retrieved_at: retrievedAt,
    mime_type: mimeType,
    byte_length: byteLength,
    sha256,
    content_base64: contentBase64,
    method,
    parser_version: parserVersion,
    locator,
  };
}

function validateEntityCandidate(value: unknown, path: string, errors: string[]): EntityCandidate | undefined {
  const candidate = requireObject(value, path, errors);
  if (!candidate) return undefined;
  exactKeys(candidate, ["candidate_key", "canonical_id_hint", "attributes", "evidence_keys", "identity_resolution_required"], path, errors);
  requiredKeys(candidate, ["candidate_key", "attributes", "evidence_keys"], path, errors);
  const candidateKey = requireString(candidate.candidate_key, `${path}.candidate_key`, errors, { min: 1, max: 512 });
  const attributes = requireObject(candidate.attributes, `${path}.attributes`, errors);
  const evidenceKeys = validateStringArray(candidate.evidence_keys, `${path}.evidence_keys`, errors);
  const canonicalIdHint =
    candidate.canonical_id_hint === undefined
      ? undefined
      : requireString(candidate.canonical_id_hint, `${path}.canonical_id_hint`, errors, { max: 256 });
  const identityResolutionRequired =
    candidate.identity_resolution_required === undefined
      ? undefined
      : requireBoolean(candidate.identity_resolution_required, `${path}.identity_resolution_required`, errors);
  if (!candidateKey || !attributes || !evidenceKeys) return undefined;
  if (!isJsonValue(attributes)) {
    errors.push(`${path}.attributes must be JSON-compatible`);
    return undefined;
  }
  return {
    candidate_key: candidateKey,
    canonical_id_hint: canonicalIdHint,
    attributes: attributes as JsonObject,
    evidence_keys: evidenceKeys,
    identity_resolution_required: identityResolutionRequired,
  };
}

function validateClaims(value: unknown, path: string, errors: string[]): JsonObject[] | undefined {
  const claims = requireArray(value, path, errors);
  if (!claims) return undefined;
  const out: JsonObject[] = [];
  for (const [index, item] of claims.entries()) {
    const claimPath = `${path}[${index}]`;
    const claim = requireObject(item, claimPath, errors);
    if (!claim) continue;
    exactKeys(claim, ["claim_key", "subject_candidate_key", "field_key", "value", "evidence_keys", "observed_at"], claimPath, errors);
    requiredKeys(claim, ["claim_key", "subject_candidate_key", "field_key", "value", "evidence_keys"], claimPath, errors);
    requireString(claim.claim_key, `${claimPath}.claim_key`, errors, { min: 1, max: 512 });
    requireString(claim.subject_candidate_key, `${claimPath}.subject_candidate_key`, errors, { min: 1, max: 512 });
    requireString(claim.field_key, `${claimPath}.field_key`, errors, { min: 1, max: 256 });
    if (!isJsonValue(claim.value)) errors.push(`${claimPath}.value must be JSON-compatible`);
    validateStringArray(claim.evidence_keys, `${claimPath}.evidence_keys`, errors, 1);
    if (claim.observed_at !== undefined) requireDateTime(claim.observed_at, `${claimPath}.observed_at`, errors);
    out.push(claim as JsonObject);
  }
  return out;
}

function validateRelationships(value: unknown, path: string, errors: string[]): JsonObject[] | undefined {
  const relationships = requireArray(value, path, errors);
  if (!relationships) return undefined;
  const out: JsonObject[] = [];
  for (const [index, item] of relationships.entries()) {
    const itemPath = `${path}[${index}]`;
    const relationship = requireObject(item, itemPath, errors);
    if (!relationship) continue;
    exactKeys(
      relationship,
      ["subject_candidate_key", "object_candidate_key", "relationship_type", "direction", "amount", "period", "evidence_keys"],
      itemPath,
      errors,
    );
    requiredKeys(relationship, ["subject_candidate_key", "object_candidate_key", "relationship_type", "evidence_keys"], itemPath, errors);
    requireString(relationship.subject_candidate_key, `${itemPath}.subject_candidate_key`, errors, { min: 1, max: 512 });
    requireString(relationship.object_candidate_key, `${itemPath}.object_candidate_key`, errors, { min: 1, max: 512 });
    requireString(relationship.relationship_type, `${itemPath}.relationship_type`, errors, { min: 1, max: 256 });
    validateStringArray(relationship.evidence_keys, `${itemPath}.evidence_keys`, errors, 1);
    if (relationship.direction !== undefined) requireString(relationship.direction, `${itemPath}.direction`, errors, { max: 64 });
    if (relationship.amount !== undefined && typeof relationship.amount !== "number") errors.push(`${itemPath}.amount must be a number`);
    if (relationship.period !== undefined) requireString(relationship.period, `${itemPath}.period`, errors, { max: 256 });
    out.push(relationship as JsonObject);
  }
  return out;
}

function validateDatasetUnits(value: unknown, path: string, errors: string[]): JsonObject[] | undefined {
  const units = requireArray(value, path, errors);
  if (!units) return undefined;
  const out: JsonObject[] = [];
  for (const [index, item] of units.entries()) {
    const itemPath = `${path}[${index}]`;
    const unit = requireObject(item, itemPath, errors);
    if (!unit) continue;
    exactKeys(unit, ["dataset_key", "unit_key", "state", "evidence_keys"], itemPath, errors);
    requiredKeys(unit, ["dataset_key", "unit_key", "state"], itemPath, errors);
    requireString(unit.dataset_key, `${itemPath}.dataset_key`, errors, { min: 1, max: 256 });
    requireString(unit.unit_key, `${itemPath}.unit_key`, errors, { min: 1, max: 512 });
    requireString(unit.state, `${itemPath}.state`, errors, { min: 1, max: 128 });
    if (unit.evidence_keys !== undefined) validateStringArray(unit.evidence_keys, `${itemPath}.evidence_keys`, errors);
    out.push(unit as JsonObject);
  }
  return out;
}

function validateGisBoundaries(value: unknown, path: string, errors: string[]): JsonObject[] | undefined {
  const boundaries = requireArray(value, path, errors);
  if (!boundaries) return undefined;
  const out: JsonObject[] = [];
  for (const [index, item] of boundaries.entries()) {
    const itemPath = `${path}[${index}]`;
    const boundary = requireObject(item, itemPath, errors);
    if (!boundary) continue;
    exactKeys(
      boundary,
      ["boundary_key", "source_url", "effective_status", "effective_from", "effective_to", "geometry_sha256", "evidence_keys"],
      itemPath,
      errors,
    );
    requiredKeys(boundary, ["boundary_key", "source_url", "effective_status"], itemPath, errors);
    requireString(boundary.boundary_key, `${itemPath}.boundary_key`, errors, { min: 1, max: 512 });
    validateUrl(boundary.source_url, `${itemPath}.source_url`, errors);
    requireString(boundary.effective_status, `${itemPath}.effective_status`, errors, { min: 1, max: 128 });
    if (boundary.effective_from !== undefined) requireString(boundary.effective_from, `${itemPath}.effective_from`, errors, { min: 10, max: 10 });
    if (boundary.effective_to !== undefined) requireString(boundary.effective_to, `${itemPath}.effective_to`, errors, { min: 10, max: 10 });
    if (boundary.geometry_sha256 !== undefined) requireSha256(boundary.geometry_sha256, `${itemPath}.geometry_sha256`, errors);
    if (boundary.evidence_keys !== undefined) validateStringArray(boundary.evidence_keys, `${itemPath}.evidence_keys`, errors);
    out.push(boundary as JsonObject);
  }
  return out;
}

function forbiddenPromotionValues(value: unknown, path: string, key = ""): string[] {
  const findings: string[] = [];
  if (typeof value === "string" && /(status|state|verification|publication)/i.test(key)) {
    if (PROMOTION_TERMS.has(value.toLowerCase())) findings.push(path);
  } else if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) findings.push(...forbiddenPromotionValues(item, `${path}[${index}]`, key));
  } else if (isRecord(value)) {
    for (const [childKey, childValue] of Object.entries(value)) {
      if (path === "" && childKey === "extraction_status") continue;
      findings.push(...forbiddenPromotionValues(childValue, path ? `${path}.${childKey}` : childKey, childKey));
    }
  }
  return findings;
}

function assertEvidenceReferences(envelope: ResearchIngestEnvelope, errors: string[]): void {
  const evidenceKeys = new Set(envelope.evidence.map((evidence) => evidence.evidence_key));
  const subjectKeys = new Set<string>();
  for (const candidates of Object.values(envelope.entities)) {
    for (const candidate of candidates) {
      subjectKeys.add(candidate.candidate_key);
      for (const evidenceKey of candidate.evidence_keys) {
        if (!evidenceKeys.has(evidenceKey)) errors.push(`entity candidate ${candidate.candidate_key} references unknown evidence ${evidenceKey}`);
      }
    }
  }
  for (const claim of envelope.claims) {
    const subjectKey = claim.subject_candidate_key;
    if (typeof subjectKey === "string" && !subjectKeys.has(subjectKey)) errors.push(`claim references unknown subject candidate ${subjectKey}`);
    const keys = claim.evidence_keys;
    if (isStringArray(keys)) {
      for (const evidenceKey of keys) if (!evidenceKeys.has(evidenceKey)) errors.push(`claim references unknown evidence ${evidenceKey}`);
    }
  }
  for (const relationship of envelope.relationships) {
    for (const field of ["subject_candidate_key", "object_candidate_key"]) {
      const candidateKey = relationship[field];
      if (typeof candidateKey === "string" && !subjectKeys.has(candidateKey)) {
        errors.push(`relationship references unknown candidate ${candidateKey}`);
      }
    }
    const keys = relationship.evidence_keys;
    if (isStringArray(keys)) {
      for (const evidenceKey of keys) if (!evidenceKeys.has(evidenceKey)) errors.push(`relationship references unknown evidence ${evidenceKey}`);
    }
  }
}

export function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function validateResearchIngestEnvelope(input: unknown): EnvelopeValidation {
  const errors: string[] = [];
  const root = requireObject(input, "payload", errors);
  if (!root) return { ok: false, errors, unsupportedContract: false };

  const allowedRoot = [
    "contract_version",
    "producer",
    "job",
    "extraction_status",
    "capability",
    "cohort",
    "sources",
    "retrievals",
    "evidence",
    "entities",
    "claims",
    "relationships",
    "dataset_units",
    "gis_boundaries",
    "warnings",
    "gaps",
    "currentness",
    "monitoring_recommendations",
  ];
  exactKeys(root, allowedRoot, "payload", errors);
  requiredKeys(root, allowedRoot, "payload", errors);

  const contractVersion = root.contract_version;
  if (contractVersion !== RESEARCH_INGEST_CONTRACT_VERSION) {
    return {
      ok: false,
      errors: [`payload.contract_version must equal ${RESEARCH_INGEST_CONTRACT_VERSION}`],
      unsupportedContract: true,
    };
  }
  if (root.extraction_status !== "extracted_unreviewed") errors.push("payload.extraction_status must be extracted_unreviewed");
  const promotionPaths = forbiddenPromotionValues(root, "payload");
  for (const path of promotionPaths) errors.push(`${path} attempts producer-side promotion authority`);

  const producer = requireObject(root.producer, "payload.producer", errors);
  if (producer) {
    exactKeys(producer, ["producer_id", "producer_version", "manifest_version", "execution_id"], "payload.producer", errors);
    requiredKeys(producer, ["producer_id", "producer_version"], "payload.producer", errors);
    requireString(producer.producer_id, "payload.producer.producer_id", errors, { min: 1, max: 128 });
    requireString(producer.producer_version, "payload.producer.producer_version", errors, { min: 1, max: 128 });
    if (producer.manifest_version !== undefined) requireString(producer.manifest_version, "payload.producer.manifest_version", errors, { max: 128 });
    if (producer.execution_id !== undefined) requireString(producer.execution_id, "payload.producer.execution_id", errors, { max: 256 });
  }

  const job = requireObject(root.job, "payload.job", errors);
  if (job) {
    exactKeys(job, ["job_id", "research_work_identity", "research_reservation"], "payload.job", errors);
    requiredKeys(job, ["job_id", "research_work_identity"], "payload.job", errors);
    requireString(job.job_id, "payload.job.job_id", errors, { min: 1, max: 256 });
    requireString(job.research_work_identity, "payload.job.research_work_identity", errors, { min: 16, max: 512 });
    if (job.research_reservation !== undefined) {
      const reservation = requireObject(job.research_reservation, "payload.job.research_reservation", errors);
      if (reservation) {
        exactKeys(reservation, ["reservation_id", "lease_expires_at"], "payload.job.research_reservation", errors);
        requiredKeys(reservation, ["reservation_id", "lease_expires_at"], "payload.job.research_reservation", errors);
        requireString(reservation.reservation_id, "payload.job.research_reservation.reservation_id", errors, { min: 1, max: 256 });
        requireDateTime(reservation.lease_expires_at, "payload.job.research_reservation.lease_expires_at", errors);
      }
    }
  }

  requireString(root.capability, "payload.capability", errors, { min: 1, max: 128 });
  const cohort = requireObject(root.cohort, "payload.cohort", errors);
  if (cohort) {
    exactKeys(cohort, ["cohort_key", "state", "assignment_id"], "payload.cohort", errors);
    requiredKeys(cohort, ["cohort_key", "state"], "payload.cohort", errors);
    requireString(cohort.cohort_key, "payload.cohort.cohort_key", errors, { min: 1, max: 256 });
    requireString(cohort.state, "payload.cohort.state", errors, { min: 1, max: 128 });
    if (cohort.assignment_id !== undefined) requireString(cohort.assignment_id, "payload.cohort.assignment_id", errors, { max: 256 });
  }

  const sources = requireArray(root.sources, "payload.sources", errors);
  sources?.forEach((source, index) => validateSource(source, `payload.sources[${index}]`, errors));
  const retrievals = requireArray(root.retrievals, "payload.retrievals", errors);
  retrievals?.forEach((retrieval, index) => validateRetrieval(retrieval, `payload.retrievals[${index}]`, errors));
  const evidenceRaw = requireArray(root.evidence, "payload.evidence", errors);
  const evidence = evidenceRaw?.map((item, index) => validateEvidence(item, `payload.evidence[${index}]`, errors)).filter(Boolean) ?? [];

  const entities = requireObject(root.entities, "payload.entities", errors);
  const entitySets = [
    "jurisdiction_candidates",
    "seat_candidates",
    "person_candidates",
    "occupancy_candidates",
    "election_candidates",
    "candidate_campaign_candidates",
  ] as const;
  const parsedEntities: Record<(typeof entitySets)[number], EntityCandidate[]> = {
    jurisdiction_candidates: [],
    seat_candidates: [],
    person_candidates: [],
    occupancy_candidates: [],
    election_candidates: [],
    candidate_campaign_candidates: [],
  };
  if (entities) {
    exactKeys(entities, entitySets, "payload.entities", errors);
    requiredKeys(entities, entitySets, "payload.entities", errors);
    for (const entitySet of entitySets) {
      const candidates = requireArray(entities[entitySet], `payload.entities.${entitySet}`, errors);
      if (candidates) {
        parsedEntities[entitySet] = candidates
          .map((candidate, index) => validateEntityCandidate(candidate, `payload.entities.${entitySet}[${index}]`, errors))
          .filter((candidate): candidate is EntityCandidate => candidate !== undefined);
      }
    }
  }

  const claims = validateClaims(root.claims, "payload.claims", errors);
  const relationships = validateRelationships(root.relationships, "payload.relationships", errors);
  const datasetUnits = validateDatasetUnits(root.dataset_units, "payload.dataset_units", errors);
  const gisBoundaries = validateGisBoundaries(root.gis_boundaries, "payload.gis_boundaries", errors);
  const warnings = validateStringArray(root.warnings, "payload.warnings", errors);
  const gaps = validateStringArray(root.gaps, "payload.gaps", errors);

  const currentness = requireObject(root.currentness, "payload.currentness", errors);
  if (currentness) {
    exactKeys(currentness, ["current_as_of", "cutoff", "source_universe"], "payload.currentness", errors);
    requiredKeys(currentness, ["current_as_of"], "payload.currentness", errors);
    requireDateTime(currentness.current_as_of, "payload.currentness.current_as_of", errors);
    if (currentness.cutoff !== undefined) requireDateTime(currentness.cutoff, "payload.currentness.cutoff", errors);
    if (currentness.source_universe !== undefined) requireString(currentness.source_universe, "payload.currentness.source_universe", errors, { max: 4096 });
  }

  const monitoring = requireArray(root.monitoring_recommendations, "payload.monitoring_recommendations", errors);
  monitoring?.forEach((item, index) => {
    const path = `payload.monitoring_recommendations[${index}]`;
    const recommendation = requireObject(item, path, errors);
    if (!recommendation) return;
    exactKeys(recommendation, ["scope", "reason", "next_check_at"], path, errors);
    requiredKeys(recommendation, ["scope", "reason"], path, errors);
    requireString(recommendation.scope, `${path}.scope`, errors, { min: 1, max: 256 });
    requireString(recommendation.reason, `${path}.reason`, errors, { min: 1, max: 4096 });
    if (recommendation.next_check_at !== undefined) requireDateTime(recommendation.next_check_at, `${path}.next_check_at`, errors);
  });

  if (errors.length > 0 || !producer || !job || !cohort || !currentness || !sources || !retrievals || !evidenceRaw || !claims || !relationships || !datasetUnits || !gisBoundaries || !warnings || !gaps || !monitoring) {
    return { ok: false, errors: errors.slice(0, 64), unsupportedContract: false };
  }

  const envelope: ResearchIngestEnvelope = {
    contract_version: RESEARCH_INGEST_CONTRACT_VERSION,
    producer: producer as ResearchIngestEnvelope["producer"],
    job: job as ResearchIngestEnvelope["job"],
    extraction_status: "extracted_unreviewed",
    capability: root.capability as string,
    cohort: cohort as ResearchIngestEnvelope["cohort"],
    sources: sources as JsonObject[],
    retrievals: retrievals as JsonObject[],
    evidence: evidence as EvidenceSubmission[],
    entities: parsedEntities,
    claims,
    relationships,
    dataset_units: datasetUnits,
    gis_boundaries: gisBoundaries,
    warnings,
    gaps,
    currentness: currentness as ResearchIngestEnvelope["currentness"],
    monitoring_recommendations: monitoring as JsonObject[],
  };
  assertEvidenceReferences(envelope, errors);
  return errors.length > 0 ? { ok: false, errors: errors.slice(0, 64), unsupportedContract: false } : { ok: true, envelope };
}

export function requiresIdentityResolution(envelope: ResearchIngestEnvelope): boolean {
  return Object.values(envelope.entities).some((candidates) => candidates.some((candidate) => candidate.identity_resolution_required));
}

export function isPartialSubmission(envelope: ResearchIngestEnvelope): boolean {
  return envelope.evidence.some((evidence) => evidence.content_base64 === undefined) || envelope.gaps.length > 0;
}
