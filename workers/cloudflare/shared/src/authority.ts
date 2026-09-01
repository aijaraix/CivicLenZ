export const AUTHORITY_TIERS = [
  "TIER_1_PRIMARY_OFFICIAL",
  "TIER_2_OFFICIAL_CAMPAIGN",
  "TIER_3_PUBLIC_INSTITUTIONAL",
  "TIER_4_SECONDARY_REVIEW",
  "TIER_5_DISCOVERY_ONLY",
] as const;

export type AuthorityTier = (typeof AUTHORITY_TIERS)[number];

export function isAuthorityTier(value: string): value is AuthorityTier {
  return (AUTHORITY_TIERS as readonly string[]).includes(value);
}

export function mapRegistryTier(value: string | undefined): AuthorityTier {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "tier_1_primary_official" || normalized === "primary_official" || normalized === "official") {
    return "TIER_1_PRIMARY_OFFICIAL";
  }
  if (normalized === "tier_2_official_campaign" || normalized === "official_campaign") {
    return "TIER_2_OFFICIAL_CAMPAIGN";
  }
  if (normalized === "tier_3_public_institutional" || normalized === "public_institutional") {
    return "TIER_3_PUBLIC_INSTITUTIONAL";
  }
  if (normalized === "tier_4_secondary_review" || normalized === "specialist_database" || normalized === "secondary") {
    return "TIER_4_SECONDARY_REVIEW";
  }
  return "TIER_5_DISCOVERY_ONLY";
}

export function canIndependentlyVerify(tier: AuthorityTier): boolean {
  return tier !== "TIER_5_DISCOVERY_ONLY";
}

export function isGovernmentPrimary(tier: AuthorityTier): boolean {
  return tier === "TIER_1_PRIMARY_OFFICIAL";
}
