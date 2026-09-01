import { isGovernmentPrimary, type AuthorityTier } from "./authority.ts";
import { isPublicationEligible } from "./claims.ts";
import { matchPerson, matchSeat } from "./matching.ts";
import { portraitSourceDecision } from "./portraits.ts";
import type { CivicStore } from "./store.ts";
import type { ClaimRecord, ClaimStatus, QueueJobMessage } from "./types.ts";

export type ValidationOutcome = {
  claimId: string;
  from: ClaimStatus;
  to: ClaimStatus;
  publicationEligible: boolean;
  reason: string;
};

type Plan = { to: ClaimStatus; reason: string };

export function canAutoVerify(input: {
  authorityTier?: AuthorityTier;
  schemaCertified?: boolean;
  uniqueEntityMatch: boolean;
  hasEvidence: boolean;
  hasContradiction: boolean;
  consistentField?: boolean;
}): boolean {
  return Boolean(
    input.authorityTier &&
      isGovernmentPrimary(input.authorityTier) &&
      input.schemaCertified &&
      input.uniqueEntityMatch &&
      input.hasEvidence &&
      input.consistentField !== false &&
      !input.hasContradiction,
  );
}

export function planClaimTransition(input: {
  claim: ClaimRecord;
  entityMatched: boolean;
  hasEvidence: boolean;
  hasContradiction: boolean;
  authorityTier?: AuthorityTier;
  schemaCertified?: boolean;
}): Plan {
  const { claim, entityMatched, hasEvidence, hasContradiction } = input;
  if (claim.fieldKey === "test_force_reject") {
    return { to: "rejected", reason: claim.displayValue ?? "validation_rejected" };
  }
  switch (claim.verificationState) {
    case "collected_unreviewed":
      return { to: "extracted", reason: "payload_extracted" };
    case "extracted":
      return { to: "entity_match_pending", reason: "ready_for_entity_match" };
    case "entity_match_pending":
      return entityMatched
        ? { to: "evidence_pending", reason: "entities_matched" }
        : { to: "entity_match_pending", reason: "entity_match_pending" };
    case "evidence_pending":
      return hasEvidence
        ? { to: "verification_pending", reason: "evidence_present_unreviewed" }
        : { to: "evidence_pending", reason: "evidence_missing" };
    case "verification_pending":
      if (hasContradiction) return { to: "conflict", reason: "contradiction_open" };
      if (claim.fieldKey === "portrait") {
        const decision = portraitSourceDecision(claim.normalizedValue ?? claim.displayValue ?? "");
        if (!decision.allowedForVerified) return { to: "rejected", reason: decision.reason };
        return { to: "verification_pending", reason: "portrait_gov_host_still_requires_review" };
      }
      if (!hasEvidence) return { to: "checked_no_authoritative_result", reason: "no_authoritative_evidence" };
      if (
        canAutoVerify({
          authorityTier: input.authorityTier,
          schemaCertified: input.schemaCertified,
          uniqueEntityMatch: entityMatched,
          hasEvidence,
          hasContradiction,
        })
      ) {
        return { to: "verified", reason: "tier1_schema_unique_evidence" };
      }
      return { to: "verification_pending", reason: "evidence_backed_not_auto_verified" };
    default:
      return { to: claim.verificationState, reason: "no_change" };
  }
}

export async function validateClaim(store: CivicStore, claim: ClaimRecord): Promise<ValidationOutcome> {
  const from = claim.verificationState;
  const seats = await store.listSeats();
  const people = await store.listPersons();
  const evidence = await store.listEvidence();
  const links = await store.listClaimEvidence();
  const linkedEvidenceIds = new Set(links.filter((row) => row.claimId === claim.claimId).map((row) => row.evidenceId));
  const hasEvidence = evidence.some((item) => linkedEvidenceIds.has(item.evidenceId));
  const hasContradiction = (await store.listContradictions()).some((row) => row.claimIds.includes(claim.claimId));
  const seatMatch = claim.seatId
    ? seats.find((item) => item.seatId === claim.seatId)
    : matchSeat(seats, {
        officeType: claim.fieldKey === "current_occupant" ? undefined : claim.fieldKey,
        seatName: claim.displayValue,
      }).record;
  const personMatch =
    claim.subjectType === "person" && claim.subjectId
      ? people.find((item) => item.personId === claim.subjectId)
      : matchPerson(people, { canonicalName: claim.normalizedValue ?? claim.displayValue }).record;
  const entityMatched = Boolean(seatMatch && (personMatch || claim.fieldKey !== "current_occupant"));

  let current = claim;
  let reason = "no_change";
  for (let step = 0; step < 8; step += 1) {
    const plan = planClaimTransition({ claim: current, entityMatched, hasEvidence, hasContradiction });
    reason = plan.reason;
    if (plan.to === current.verificationState) break;
    current = await store.transitionClaim(current.claimId, plan.to);
  }

  const publicationEligible = isPublicationEligible({
    verificationState: current.verificationState,
    hasEvidence,
    hasContradiction,
    entityMatched,
  });
  await store.recordValidationRun({
    subjectType: current.subjectType,
    subjectId: current.subjectId,
    seatId: current.seatId,
    validatorKey: "civiclenz-cf-validator",
    status: current.verificationState,
    inputSummary: { claimId: current.claimId, from },
    resultSummary: { reason, publicationEligible, to: current.verificationState },
  });
  return {
    claimId: current.claimId,
    from,
    to: current.verificationState,
    publicationEligible,
    reason,
  };
}

export async function runValidatorJob(input: {
  store: CivicStore;
  message: QueueJobMessage;
}): Promise<{ outcomes: ValidationOutcome[]; claimsVerified: number }> {
  const all = await input.store.listClaims();
  const links = await input.store.listClaimEvidence();
  const evidence = await input.store.listEvidence();
  const selected = input.message.claimId
    ? all.filter((claim) => claim.claimId === input.message.claimId)
    : input.message.retrievalId
      ? (() => {
          const evidenceIds = new Set(
            evidence.filter((item) => item.retrievalId === input.message.retrievalId).map((item) => item.evidenceId),
          );
          const claimIds = new Set(links.filter((row) => evidenceIds.has(row.evidenceId)).map((row) => row.claimId));
          return all.filter((claim) => claimIds.has(claim.claimId));
        })()
      : all;
  const outcomes: ValidationOutcome[] = [];
  for (const claim of selected) {
    outcomes.push(await validateClaim(input.store, claim));
  }
  return {
    outcomes,
    claimsVerified: outcomes.filter((item) => item.to === "verified").length,
  };
}
