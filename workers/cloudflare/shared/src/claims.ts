import { CLAIM_STATUSES, type ClaimStatus } from "./types.ts";

const TERMINAL = new Set<ClaimStatus>([
  "VERIFIED",
  "CONFLICT",
  "REJECTED",
  "STALE",
  "CHECKED_NO_AUTHORITATIVE_RESULT",
]);

const FORWARD: Record<ClaimStatus, ClaimStatus[]> = {
  COLLECTED_UNREVIEWED: ["EXTRACTED", "REJECTED", "STALE"],
  EXTRACTED: ["ENTITY_MATCH_PENDING", "REJECTED", "STALE"],
  ENTITY_MATCH_PENDING: ["EVIDENCE_PENDING", "REJECTED", "CONFLICT", "STALE"],
  EVIDENCE_PENDING: ["VERIFICATION_PENDING", "REJECTED", "STALE"],
  VERIFICATION_PENDING: [
    "VERIFIED",
    "CONFLICT",
    "REJECTED",
    "STALE",
    "CHECKED_NO_AUTHORITATIVE_RESULT",
  ],
  VERIFIED: ["STALE", "CONFLICT"],
  CONFLICT: ["VERIFICATION_PENDING", "REJECTED", "STALE"],
  REJECTED: [],
  STALE: ["COLLECTED_UNREVIEWED"],
  CHECKED_NO_AUTHORITATIVE_RESULT: ["COLLECTED_UNREVIEWED", "STALE"],
};

export function isClaimStatus(value: string): value is ClaimStatus {
  return (CLAIM_STATUSES as readonly string[]).includes(value);
}

export function canTransitionClaim(from: ClaimStatus, to: ClaimStatus): boolean {
  if (from === to) return true;
  return FORWARD[from].includes(to);
}

export function transitionClaim(from: ClaimStatus, to: ClaimStatus): ClaimStatus {
  if (!canTransitionClaim(from, to)) {
    throw new Error(`illegal claim transition ${from} → ${to}`);
  }
  return to;
}

export function isTerminalClaimStatus(status: ClaimStatus): boolean {
  return TERMINAL.has(status);
}

export function isPublicationEligible(input: {
  status: ClaimStatus;
  hasEvidence: boolean;
  hasContradiction: boolean;
  entityMatched: boolean;
}): boolean {
  return (
    input.status === "VERIFIED" &&
    input.hasEvidence &&
    input.entityMatched &&
    !input.hasContradiction
  );
}

export function httpSuccessIsNotVerified(): false {
  return false;
}
