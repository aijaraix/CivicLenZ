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

function stringMeta(claim: ClaimRecord, key: string): string | undefined {
  const value = claim.metadata[key];
  return typeof value === "string" ? value : undefined;
}

export function planClaimTransition(input: {
  claim: ClaimRecord;
  entityMatched: boolean;
  hasEvidence: boolean;
  hasContradiction: boolean;
}): Plan {
  const { claim, entityMatched, hasEvidence, hasContradiction } = input;
  if (claim.metadata.forceReject === true) {
    return { to: "REJECTED", reason: stringMeta(claim, "rejectReason") ?? "validation_rejected" };
  }
  switch (claim.status) {
    case "COLLECTED_UNREVIEWED":
      return { to: "EXTRACTED", reason: "payload_extracted" };
    case "EXTRACTED":
      return { to: "ENTITY_MATCH_PENDING", reason: "ready_for_entity_match" };
    case "ENTITY_MATCH_PENDING":
      return entityMatched
        ? { to: "EVIDENCE_PENDING", reason: "entities_matched" }
        : { to: "ENTITY_MATCH_PENDING", reason: "entity_match_pending" };
    case "EVIDENCE_PENDING":
      return hasEvidence
        ? { to: "VERIFICATION_PENDING", reason: "evidence_present_unreviewed" }
        : { to: "EVIDENCE_PENDING", reason: "evidence_missing" };
    case "VERIFICATION_PENDING":
      if (hasContradiction) return { to: "CONFLICT", reason: "contradiction_open" };
      if (claim.claimType === "portrait") {
        const decision = portraitSourceDecision(stringMeta(claim, "portraitUrl") ?? "");
        if (!decision.allowedForVerified) return { to: "REJECTED", reason: decision.reason };
        return { to: "VERIFICATION_PENDING", reason: "portrait_gov_host_still_requires_review" };
      }
      if (!hasEvidence) return { to: "CHECKED_NO_AUTHORITATIVE_RESULT", reason: "no_authoritative_evidence" };
      return { to: "VERIFICATION_PENDING", reason: "evidence_backed_not_auto_verified" };
    default:
      return { to: claim.status, reason: "no_change" };
  }
}

export async function validateClaim(store: CivicStore, claim: ClaimRecord): Promise<ValidationOutcome> {
  const from = claim.status;
  const seats = await store.listSeats();
  const people = await store.listPersons();
  const evidence = await store.listEvidence();
  const hasEvidence = evidence.some(
    (item) => item.rawRetrievalId === claim.rawRetrievalId || item.id === claim.metadata.evidenceId,
  );
  const hasContradiction = (await store.listContradictions()).some((row) => row.claimId === claim.id);
  const seatMatch = claim.seatId
    ? seats.find((item) => item.id === claim.seatId)
    : matchSeat(seats, {
        officeType: stringMeta(claim, "officeType"),
        seatName: stringMeta(claim, "officeTitle"),
        districtNumber: stringMeta(claim, "districtNumber"),
        jurisdictionId: claim.jurisdictionId,
      }).record;
  const personMatch = claim.personId
    ? people.find((item) => item.id === claim.personId)
    : matchPerson(people, { displayName: stringMeta(claim, "displayName") }).record;
  const entityMatched = Boolean(seatMatch && personMatch);

  let current = claim;
  let reason = "no_change";
  for (let step = 0; step < 8; step += 1) {
    const plan = planClaimTransition({ claim: current, entityMatched, hasEvidence, hasContradiction });
    reason = plan.reason;
    if (plan.to === current.status) break;
    current = await store.transitionClaim(current.id, plan.to);
  }

  const publicationEligible = isPublicationEligible({
    status: current.status,
    hasEvidence,
    hasContradiction,
    entityMatched,
  });
  await store.recordValidationRun({
    claimId: current.id,
    result: current.status,
    detail: { reason, publicationEligible },
  });
  return {
    claimId: current.id,
    from,
    to: current.status,
    publicationEligible,
    reason,
  };
}

export async function runValidatorJob(input: {
  store: CivicStore;
  message: QueueJobMessage;
}): Promise<{ outcomes: ValidationOutcome[]; claimsVerified: number }> {
  const all = await input.store.listClaims();
  const selected = input.message.claimId
    ? all.filter((claim) => claim.id === input.message.claimId)
    : input.message.retrievalId
      ? all.filter((claim) => claim.rawRetrievalId === input.message.retrievalId)
      : all;
  const outcomes: ValidationOutcome[] = [];
  for (const claim of selected) {
    outcomes.push(await validateClaim(input.store, claim));
  }
  return {
    outcomes,
    claimsVerified: outcomes.filter((item) => item.to === "VERIFIED").length,
  };
}
