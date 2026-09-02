import { capabilityState, type Capability, type CapabilityState } from "./capabilities.ts";
import type { WorkerRunRecord } from "./types.ts";

/** Logical worker families mapped onto existing CAPABILITIES. Not one process per official. */
export const LOGICAL_WORKER_FAMILIES = {
  official_profile_extract: "officeholder_discovery",
  html_directory_extract: "officeholder_discovery",
  pdf_directory_extract: "officeholder_discovery",
  seat_discovery: "seat_discovery",
  jurisdiction_discovery: "jurisdiction_discovery",
  identity_resolution: "identity_resolution",
  portrait_discovery: "portrait_discovery",
  contact_discovery: "contact_discovery",
  completeness_audit: "completeness_audit",
  publication_gate: "publication_gate",
  evidence_validation: "evidence_validation",
  contradiction_check: "contradiction_check",
  change_detection: "change_detection",
  source_health: "source_health",
  campaign_finance: "campaign_finance",
  financial_disclosure: "financial_disclosure",
  election_results: "election_results_check",
  executive_action: "executive_action",
  legislative_activity: "legislative_activity",
} as const;

export type LogicalWorkerFamily = keyof typeof LOGICAL_WORKER_FAMILIES;

export function capabilityForLogicalFamily(family: LogicalWorkerFamily): Capability {
  return LOGICAL_WORKER_FAMILIES[family];
}

export function runMatchesCapability(run: WorkerRunRecord, capability: Capability): boolean {
  const meta = run.metadata ?? {};
  if (meta.capability === capability) return true;
  if (typeof meta.logicalFamily === "string" && meta.logicalFamily in LOGICAL_WORKER_FAMILIES) {
    return LOGICAL_WORKER_FAMILIES[meta.logicalFamily as LogicalWorkerFamily] === capability;
  }
  return false;
}

/**
 * READY = code exists. ACTIVE only after a real successful worker_run of that path.
 * NOT_IMPLEMENTED stays fail-closed. Never inferred from an HTTP 200 or parse count.
 */
export function runtimeCapabilityState(
  capability: Capability,
  runs: WorkerRunRecord[],
  now = new Date(),
  windowMs = 24 * 60 * 60 * 1000,
): CapabilityState {
  const declared = capabilityState(capability);
  if (declared === "NOT_IMPLEMENTED") return "NOT_IMPLEMENTED";
  const pathRuns = runs.filter((run) => runMatchesCapability(run, capability));
  const recent = pathRuns.filter((run) => {
    const stamp = Date.parse(run.completedAt ?? run.startedAt);
    return Number.isFinite(stamp) && now.getTime() - stamp <= windowMs;
  });
  const succeeded = recent.filter(
    (run) => run.status === "succeeded" && (run.recordsRead > 0 || run.recordsWritten > 0),
  );
  const failed = recent.filter((run) => run.status === "failed");
  if (succeeded.length === 0 && failed.length > 0) return "FAILED";
  if (succeeded.length === 0) return declared;
  if (failed.length > 0) return "DEGRADED";
  return "ACTIVE";
}

export function inferCapabilityFromJob(input: {
  route?: string;
  sourceKey?: string;
  purpose?: string;
}): Capability | undefined {
  if (input.purpose === "completeness_audit" || input.purpose === "completeness_audit_after_baseline") {
    return "completeness_audit";
  }
  if (input.purpose === "contradiction_check") return "contradiction_check";
  if (input.purpose === "verification" || input.purpose === "evidence_validation") return "evidence_validation";
  if (input.route === "validate") return "evidence_validation";
  if (input.route === "monitor") return "source_health";
  if (input.route === "ingest") return "officeholder_discovery";
  return undefined;
}
