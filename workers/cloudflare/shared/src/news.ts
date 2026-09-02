export const NEWS_WORKER_STATE = "PREPARE_ONLY" as const;

export function newsCanIndependentlyVerify(): false {
  return false;
}

export function newsVerificationThreshold(): "manual_review_required" {
  return "manual_review_required";
}

export type NewsDraft = {
  headline: string;
  sourceUrl: string;
  retrievedAt: string;
  reviewState: "unreviewed";
  verificationState: "collected_unreviewed";
};

export function draftNewsItem(input: { headline: string; sourceUrl: string; retrievedAt?: string }): NewsDraft {
  return {
    headline: input.headline,
    sourceUrl: input.sourceUrl,
    retrievedAt: input.retrievedAt ?? new Date().toISOString(),
    reviewState: "unreviewed",
    verificationState: "collected_unreviewed",
  };
}
