import { CLAIM_STATUSES, type ClaimStatus } from "./types.ts";

const TERMINAL = new Set<ClaimStatus>([
  "verified",
  "conflict",
  "rejected",
  "stale",
  "checked_no_authoritative_result",
]);

const FORWARD: Record<ClaimStatus, ClaimStatus[]> = {
  not_collected: ["collected_unreviewed", "source_found", "checked_no_authoritative_result"],
  collected_unreviewed: ["source_found", "extracted", "rejected", "stale"],
  source_found: ["extracted", "rejected", "stale"],
  extracted: ["entity_match_pending", "rejected", "stale"],
  entity_match_pending: ["evidence_pending", "rejected", "conflict", "stale"],
  evidence_pending: ["verification_pending", "rejected", "stale"],
  verification_pending: [
    "verified",
    "conflict",
    "rejected",
    "stale",
    "checked_no_authoritative_result",
  ],
  verified: ["stale", "conflict", "superseded"],
  conflict: ["verification_pending", "rejected", "stale"],
  rejected: [],
  stale: ["collected_unreviewed"],
  superseded: [],
  checked_no_authoritative_result: ["collected_unreviewed", "stale"],
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
  verificationState: ClaimStatus;
  hasEvidence: boolean;
  hasContradiction: boolean;
  entityMatched: boolean;
}): boolean {
  return (
    input.verificationState === "verified" &&
    input.hasEvidence &&
    input.entityMatched &&
    !input.hasContradiction
  );
}

export function httpSuccessIsNotVerified(): false {
  return false;
}
