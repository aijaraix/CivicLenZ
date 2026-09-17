import "server-only";

import type { OfficialProfile } from "@/lib/officials";
import { emptyOperatorDashboard, type OperatorDashboardCounts } from "./operator";

type Row = Record<string, unknown>;

function configuration(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

async function rows(path: string): Promise<Row[]> {
  const config = configuration();
  if (!config) throw new Error("canonical Supabase server configuration is unavailable");
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    headers: { apikey: config.key, authorization: `Bearer ${config.key}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`canonical projection read failed (${response.status})`);
  return (await response.json()) as Row[];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function slug(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function getCanonicalPublicOfficials(): Promise<OfficialProfile[]> {
  const result = await rows("public_official_projection?select=*&order=canonical_name.asc&limit=250");
  return result.map((row) => {
    const displayName = text(row.canonical_name);
    const parts = displayName.split(/\s+/).filter(Boolean);
    return {
      schemaVersion: "CIVICLENZ_PUBLIC_PROJECTION_V1",
      officialId: text(row.person_id),
      slug: slug(`${displayName}-${text(row.seat_key)}`),
      recordStatus: "publication_eligible",
      publicationStage: "reviewed_profile",
      dataState: "canonical_public_projection",
      person: {
        displayName,
        firstName: parts[0] ?? "",
        lastName: parts.at(-1) ?? "",
        portraitUrl: text(row.portrait_url) || null,
        portraitSourceUrl: text(row.portrait_source_url) || null,
        portraitCredit: text(row.portrait_credit) || null,
      },
      seat: {
        seatId: text(row.seat_id),
        seatName: text(row.seat_name),
        occupancyStatus: text(row.occupancy_status) as OfficialProfile["seat"] extends infer S
          ? S extends { occupancyStatus?: infer O } ? O : never
          : never,
      },
      office: {
        officeId: text(row.seat_id),
        title: text(row.seat_name),
        officeType: text(row.office_type),
        governmentLevel: text(row.government_level),
        districtName: text(row.district_name) || null,
        districtNumber: text(row.district_number) || null,
      },
      jurisdiction: { name: text(row.jurisdiction_name), stateCode: text(row.state_code) || null },
      term: {
        officeTermId: text(row.occupancy_id),
        startDate: text(row.start_date) || null,
        endDate: text(row.end_date) || null,
        currentStatus: text(row.occupancy_status),
      },
      lastTrackedAt: text(row.current_as_of) || undefined,
      lastUpdatedAt: text(row.current_as_of) || new Date(0).toISOString(),
    };
  });
}

export async function getCanonicalOfficialBySlug(profileSlug: string): Promise<OfficialProfile | undefined> {
  return (await getCanonicalPublicOfficials()).find((official) => official.slug === profileSlug);
}

function countByStatus(source: Row[], ...statuses: string[]): number {
  return source.filter((row) => statuses.includes(text(row.status))).length;
}

export async function getLiveOperatorDashboard(): Promise<OperatorDashboardCounts> {
  if (!configuration()) return emptyOperatorDashboard();
  const [seats, occupancies, jobs, capabilities, monitoring, contradictions, claims, sources, runs, coverage] = await Promise.all([
    rows("seats?select=seat_id,baseline_status"),
    rows("seat_occupancies?select=occupancy_id,occupancy_status"),
    rows("jobs?select=status,error_class,payload&limit=5000"),
    rows("physical_capabilities?select=capability_key,implementation_state&order=capability_key.asc"),
    rows("monitoring_state?select=active,monitoring_status,next_check_at"),
    rows("contradictions?select=contradiction_id,status"),
    rows("claims?select=verification_state,field_key"),
    rows("sources?select=source_key,health_state&order=source_key.asc"),
    rows("worker_runs?select=worker_key,status,completed_at&order=started_at.desc&limit=20"),
    rows("subject_scope_coverage?select=coverage_state,dataset_kind,scope_key"),
  ]);
  const completenessByCategory: Record<string, { present: number; total: number }> = {};
  for (const row of coverage) {
    const key = text(row.dataset_kind) || "UNKNOWN";
    const bucket = completenessByCategory[key] ?? { present: 0, total: 0 };
    bucket.total += 1;
    if (["RECONCILED_THROUGH", "SEARCH_SATURATED_AS_OF", "CURRENT_TO_CONTRACT_DEPTH", "NOT_APPLICABLE"].includes(text(row.coverage_state))) bucket.present += 1;
    completenessByCategory[key] = bucket;
  }
  return {
    seatsDiscovered: seats.length,
    currentOccupants: occupancies.filter((row) => ["current", "acting"].includes(text(row.occupancy_status))).length,
    baselineComplete: seats.filter((row) => ["verified", "reviewed", "complete"].includes(text(row.baseline_status))).length,
    monitored: monitoring.filter((row) => row.active === true).length,
    jobsQueued: countByStatus(jobs, "queued"),
    jobsRunning: countByStatus(jobs, "leased", "running"),
    jobsSucceeded: countByStatus(jobs, "succeeded"),
    jobsFailed: countByStatus(jobs, "failed"),
    jobsDeadLetter: countByStatus(jobs, "dead_letter"),
    workerStates: capabilities.map((row) => ({ capability: text(row.capability_key), state: text(row.implementation_state) })),
    completenessByCategory,
    knownGaps: coverage.filter((row) => !["RECONCILED_THROUGH", "SEARCH_SATURATED_AS_OF", "CURRENT_TO_CONTRACT_DEPTH", "NOT_APPLICABLE"].includes(text(row.coverage_state))).map((row) => text(row.scope_key)).filter(Boolean),
    contradictions: contradictions.filter((row) => !["resolved", "closed"].includes(text(row.status))).length,
    staleClaims: claims.filter((row) => text(row.verification_state) === "stale").length,
    sourceHealth: sources.map((row) => ({ sourceKey: text(row.source_key), healthState: text(row.health_state) || "UNKNOWN" })),
    recentRuns: runs.map((row) => ({ workerKey: text(row.worker_key), status: text(row.status), completedAt: text(row.completed_at) || undefined })),
    connected: true,
  };
}
