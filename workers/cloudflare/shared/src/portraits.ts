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

export function portraitSourceDecision(url: string): {
  allowedForVerified: boolean;
  reason: string;
} {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { allowedForVerified: false, reason: "invalid_url" };
  }
  if (parsed.protocol !== "https:") {
    return { allowedForVerified: false, reason: "insecure_url" };
  }
  if (isSearchEngineHost(parsed.hostname)) {
    return { allowedForVerified: false, reason: "search_engine_image_rejected" };
  }
  if (!isOfficialGovHost(parsed.hostname)) {
    return { allowedForVerified: false, reason: "not_official_gov_host" };
  }
  return { allowedForVerified: true, reason: "official_gov_host" };
}
