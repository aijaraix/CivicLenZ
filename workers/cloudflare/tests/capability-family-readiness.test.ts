import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const migration = readFileSync(
  path.join(repoRoot, "supabase/migrations/20260923010000_capability_family_readiness.sql"),
  "utf8",
);

const routedFamilies = [
  "campaign_committees", "campaign_finance", "contributions", "expenditures",
  "pac_relationships", "finance_reconciliation", "financial_disclosures",
  "assets", "liabilities", "income_sources", "business_interests", "gifts",
  "outside_income", "legislation", "sponsored_bills", "votes",
  "committee_assignments", "executive_actions", "executive_orders",
  "bill_signings", "vetoes", "appointments", "budget_actions",
  "campaign_promises", "public_commitments", "public_statements",
  "promise_status", "official_press", "news", "interviews", "debates",
  "official_social", "material_social_activity", "political_relationships",
  "organization_relationships", "staff_relationships", "appointment_relationships",
  "publicly_relevant_family_business_relationships", "ethics", "investigations",
  "court_public_records", "conflicts_of_interest", "biography", "education",
  "career", "military_history", "political_history", "prior_offices",
  "official_contact",
];

test("family readiness migration covers only routed repository contracts", () => {
  for (const capability of routedFamilies) {
    assert.match(migration, new RegExp(`'${capability}',`));
  }
  assert.match(migration, /p\.implementation_state = 'NOT_IMPLEMENTED'/);
  assert.match(migration, /implementation_state = 'READY'/);
  assert.match(migration, /services\/hermes-prime\/capability_router\.py/);
  assert.match(migration, /workers\/cloudflare\/shared\/src\/contract-evidence\.ts/);
  assert.match(migration, /cloudflare-deterministic-http/);
});

test("readiness migration cannot claim physical success or publication authority", () => {
  assert.doesNotMatch(migration, /implementation_state\s*=\s*'ACTIVE'/);
  assert.doesNotMatch(migration, /last_successful_worker_run_id/);
  assert.doesNotMatch(migration, /last_observed_at/);
  assert.match(migration, /'verification_authority', false/);
  assert.match(migration, /'publication_authority', false/);
  assert.match(migration, /'immutable_raw_bytes', true/);
  assert.match(migration, /'independent_canonical_validation', true/);
});
