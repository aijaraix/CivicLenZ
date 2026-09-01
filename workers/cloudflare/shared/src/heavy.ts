import type { Capability } from "./capabilities.ts";

export const HEAVY_CAPABILITIES = [
  "large_pdf_parse",
  "gis_parse",
  "browser_render",
  "biography_research",
  "education_research",
  "career_research",
  "campaign_finance",
  "financial_disclosure",
] as const satisfies readonly Capability[];

export type HeavyCapability = (typeof HEAVY_CAPABILITIES)[number];

/** Prepare-only Railway consumer contract. Cloudflare produces; it does not consume civiclenz-heavy. */
export type RailwayHeavyJobPayload = {
  schemaVersion: "1.0.0";
  runtime: "railway";
  jobId: string;
  jobType: HeavyCapability;
  sourceKey?: string;
  sourceUrl?: string;
  rawObjectUri?: string;
  targetType?: string;
  targetId?: string;
  seatId?: string;
  parserKey?: string;
  attemptCount: number;
  payloadSummary: Record<string, unknown>;
};

export function createRailwayHeavyPayload(input: Omit<RailwayHeavyJobPayload, "schemaVersion" | "runtime">): RailwayHeavyJobPayload {
  if (!input.jobId) throw new Error("heavy payload requires jobId");
  if (!(HEAVY_CAPABILITIES as readonly string[]).includes(input.jobType)) {
    throw new Error(`unknown heavy jobType ${input.jobType}`);
  }
  return {
    schemaVersion: "1.0.0",
    runtime: "railway",
    ...input,
  };
}

export function cloudflareConsumesHeavy(): false {
  return false;
}
