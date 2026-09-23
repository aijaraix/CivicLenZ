import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const migration = readFileSync(
  path.join(
    path.resolve(import.meta.dirname, "../../.."),
    "supabase/migrations/20260923011000_elections_quality_capability_readiness.sql",
  ),
  "utf8",
);

test("elections and quality readiness is limited to explicit routed contracts", () => {
  for (const capability of [
    "election_calendar", "election_discovery", "filing_status",
    "ballot_qualification", "election_results", "election_history",
    "donor_relationships", "freshness_monitor", "contradiction_resolution",
  ]) {
    assert.match(migration, new RegExp(`'${capability}',`));
  }
  assert.match(migration, /p\.implementation_state = 'NOT_IMPLEMENTED'/);
  assert.match(migration, /implementation_state = 'READY'/);
  assert.match(migration, /contract-evidence\.ts/);
  assert.doesNotMatch(migration, /implementation_state\s*=\s*'ACTIVE'/);
  assert.match(migration, /'verification_authority', false/);
  assert.match(migration, /'publication_authority', false/);
});
