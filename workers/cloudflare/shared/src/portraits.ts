const SEARCH_ENGINE_HOSTS = new Set([
  "google.com",
  "www.google.com",
  "images.google.com",
  "bing.com",
  "www.bing.com",
  "duckduckgo.com",
  "www.duckduckgo.com",
  "yahoo.com",
  "images.search.yahoo.com",
  "yandex.com",
  "baidu.com",
]);

export function isOfficialGovHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  return host === "gov" || host.endsWith(".gov");
}

export function isSearchEngineHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  return SEARCH_ENGINE_HOSTS.has(host) || host.endsWith(".google.com") || host.endsWith(".bing.com");
}

export const PORTRAIT_PRIORITY = [
  "official_government_profile",
  "legislature_directory",
  "official_executive_or_local_page",
  "official_candidate_campaign",
  "public_domain_government_image",
  "attributable_licensed_review",
] as const;

export type PortraitRecordDraft = {
  portraitUrl: string;
  portraitSourceUrl: string;
  portraitCredit?: string;
  contentHash?: string;
  width?: number;
  height?: number;
  contentType?: string;
  rights?: string;
  identityMatch?: string;
  reviewState: "unreviewed" | "rejected" | "verified";
  retrievedAt: string;
};

export function portraitSourceDecision(url: string): {
  allowedForVerified: boolean;
  reason: string;
  priorityClass: (typeof PORTRAIT_PRIORITY)[number] | "rejected";
} {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { allowedForVerified: false, reason: "invalid_url", priorityClass: "rejected" };
  }
  if (parsed.protocol !== "https:") {
    return { allowedForVerified: false, reason: "insecure_url", priorityClass: "rejected" };
  }
  if (isSearchEngineHost(parsed.hostname)) {
    return { allowedForVerified: false, reason: "search_engine_image_rejected", priorityClass: "rejected" };
  }
  if (!isOfficialGovHost(parsed.hostname)) {
    return { allowedForVerified: false, reason: "not_official_gov_host", priorityClass: "rejected" };
  }
  return { allowedForVerified: true, reason: "official_gov_host", priorityClass: "official_government_profile" };
}
