import assert from "node:assert/strict";
import test from "node:test";

import { evaluateCoverage } from "../shared/src/coverage-audit.ts";

test("finite scopes require expected/accounted reconciliation and an independent audit", () => {
  const incomplete = evaluateCoverage({
    datasetKind: "FINITE",
    expectedUnits: 10,
    accountedUnits: 9,
    missingUnits: 1,
    cutoffAt: "2026-09-23T00:00:00Z",
    independentAuditPassed: true,
  });
  assert.equal(incomplete.state, "IN_PROGRESS");
  assert.equal(incomplete.publicationEligible, false);

  const complete = evaluateCoverage({
    datasetKind: "FINITE",
    expectedUnits: 10,
    accountedUnits: 10,
    missingUnits: 0,
    cutoffAt: "2026-09-23T00:00:00Z",
    independentAuditPassed: true,
  });
  assert.equal(complete.state, "RECONCILED_THROUGH");
  assert.equal(complete.reason, "FINITE_SCOPE_RECONCILED_TO_EXPLICIT_CUTOFF");
});

test("finite scope without a declared universe cannot be represented as reconciled", () => {
  const result = evaluateCoverage({
    datasetKind: "FINITE",
    accountedUnits: 100,
    cutoffAt: "2026-09-23T00:00:00Z",
    independentAuditPassed: true,
  });
  assert.equal(result.state, "IN_PROGRESS");
  assert.equal(result.reason, "FINITE_SCOPE_REQUIRES_EXPECTED_UNITS");
});

test("open-ended scopes require multiple source families, passes, lead closure, and audit", () => {
  const result = evaluateCoverage({
    datasetKind: "OPEN_ENDED",
    requiredSourceFamilies: ["official", "media"],
    attemptedSourceFamilies: ["official", "media"],
    successfulSourceFamilies: ["official", "media"],
    discoveryPasses: 2,
    unresolvedLeads: 0,
    cutoffAt: "2026-09-23T00:00:00Z",
    independentAuditPassed: true,
  });
  assert.equal(result.state, "SEARCH_SATURATED_AS_OF");
  assert.equal(result.missingUnits, null);
  assert.equal(result.publicationEligible, false);
});

test("open-ended scope stays in progress with a single source or unresolved leads", () => {
  const singleSource = evaluateCoverage({
    datasetKind: "OPEN_ENDED",
    successfulSourceFamilies: ["official"],
    discoveryPasses: 4,
    cutoffAt: "2026-09-23T00:00:00Z",
    independentAuditPassed: true,
  });
  assert.equal(singleSource.state, "IN_PROGRESS");

  const unresolved = evaluateCoverage({
    datasetKind: "OPEN_ENDED",
    successfulSourceFamilies: ["official", "media"],
    discoveryPasses: 2,
    unresolvedLeads: 1,
    cutoffAt: "2026-09-23T00:00:00Z",
    independentAuditPassed: true,
  });
  assert.equal(unresolved.state, "IN_PROGRESS");
});

test("blocked and reopened lanes remain explicit and never become complete", () => {
  assert.equal(evaluateCoverage({ datasetKind: "FINITE", capabilityBlocked: true }).state, "CAPABILITY_BLOCKED");
  assert.equal(evaluateCoverage({ datasetKind: "OPEN_ENDED", sourceBlocked: true }).state, "SOURCE_BLOCKED");
  assert.equal(evaluateCoverage({ datasetKind: "FINITE", reopened: true }).state, "REOPENED");
  assert.equal(
    evaluateCoverage({
      datasetKind: "OPEN_ENDED",
      successfulSourceFamilies: ["official", "media"],
      discoveryPasses: 2,
      cutoffAt: "2026-09-23T00:00:00Z",
      independentAuditPassed: true,
    }).state === "CURRENT_TO_CONTRACT_DEPTH",
    false,
  );
});
