/**
 * Shared pipeline domain types and label maps.
 *
 * Types are re-exported from the generated backend bindings so pages never
 * import `@/backend` directly for data shapes. Enum *values* are re-exported
 * as values (not `export type`) because they are used in comparisons and
 * label-map lookups.
 */

import {
  DealStage,
  EngagementLevel,
  RiskBucket,
  StakeholderRole,
} from "@/backend";

export type {
  Deal,
  DealRisk,
  Forecast,
  ForecastBreakdown,
  HistoricalBaseline,
  PipelineError,
  PipelineResult,
  PipelineResult_1,
  PipelineResult_2,
  PipelineResult_3,
  RiskSignal,
  StageStats,
  Stakeholder,
} from "@/backend";

export { DealStage, EngagementLevel, RiskBucket, StakeholderRole };

/* ---------------------------------------------------------------------------
   Stage
--------------------------------------------------------------------------- */

export const STAGE_LABELS: Record<DealStage, string> = {
  [DealStage.prospecting]: "Prospecting",
  [DealStage.qualification]: "Qualification",
  [DealStage.proposal]: "Proposal",
  [DealStage.negotiation]: "Negotiation",
  [DealStage.closedWon]: "Closed Won",
  [DealStage.closedLost]: "Closed Lost",
};

/** Pipeline order — open stages first, then terminal outcomes. */
export const STAGE_ORDER: DealStage[] = [
  DealStage.prospecting,
  DealStage.qualification,
  DealStage.proposal,
  DealStage.negotiation,
  DealStage.closedWon,
  DealStage.closedLost,
];

/** Stages that still count toward the open pipeline. */
export const OPEN_STAGES: DealStage[] = [
  DealStage.prospecting,
  DealStage.qualification,
  DealStage.proposal,
  DealStage.negotiation,
];

export function isOpenStage(stage: DealStage): boolean {
  return OPEN_STAGES.includes(stage);
}

export function stageLabel(stage: DealStage | null | undefined): string {
  if (!stage) return "—";
  return STAGE_LABELS[stage] ?? stage;
}

/* ---------------------------------------------------------------------------
   Stakeholder role
--------------------------------------------------------------------------- */

export const ROLE_LABELS: Record<StakeholderRole, string> = {
  [StakeholderRole.economicBuyer]: "Economic Buyer",
  [StakeholderRole.champion]: "Champion",
  [StakeholderRole.technicalEvaluator]: "Technical Evaluator",
  [StakeholderRole.procurement]: "Procurement",
  [StakeholderRole.blocker]: "Blocker",
};

export const ROLE_ORDER: StakeholderRole[] = [
  StakeholderRole.economicBuyer,
  StakeholderRole.champion,
  StakeholderRole.technicalEvaluator,
  StakeholderRole.procurement,
  StakeholderRole.blocker,
];

export function roleLabel(role: StakeholderRole | null | undefined): string {
  if (!role) return "—";
  return ROLE_LABELS[role] ?? role;
}

/* ---------------------------------------------------------------------------
   Engagement
--------------------------------------------------------------------------- */

export const ENGAGEMENT_LABELS: Record<EngagementLevel, string> = {
  [EngagementLevel.high]: "High",
  [EngagementLevel.medium]: "Medium",
  [EngagementLevel.low]: "Low",
  [EngagementLevel.none]: "None",
};

export const ENGAGEMENT_ORDER: EngagementLevel[] = [
  EngagementLevel.high,
  EngagementLevel.medium,
  EngagementLevel.low,
  EngagementLevel.none,
];

export function engagementLabel(
  engagement: EngagementLevel | null | undefined,
): string {
  if (!engagement) return "—";
  return ENGAGEMENT_LABELS[engagement] ?? engagement;
}

/* ---------------------------------------------------------------------------
   Risk bucket
--------------------------------------------------------------------------- */

export const RISK_LABELS: Record<RiskBucket, string> = {
  [RiskBucket.high]: "High risk",
  [RiskBucket.medium]: "Medium risk",
  [RiskBucket.low]: "Low risk",
};

export const RISK_ORDER: RiskBucket[] = [
  RiskBucket.high,
  RiskBucket.medium,
  RiskBucket.low,
];

/** Tailwind class for the restrained risk chip treatment. */
export const RISK_CHIP_CLASS: Record<RiskBucket, string> = {
  [RiskBucket.high]: "signal-high",
  [RiskBucket.medium]: "signal-medium",
  [RiskBucket.low]: "signal-low",
};

/** Chart series color token per bucket, ordered by severity. */
export const RISK_CHART_COLOR: Record<RiskBucket, string> = {
  [RiskBucket.high]: "var(--chart-4)",
  [RiskBucket.medium]: "var(--chart-3)",
  [RiskBucket.low]: "var(--chart-2)",
};

export function riskLabel(bucket: RiskBucket | null | undefined): string {
  if (!bucket) return "—";
  return RISK_LABELS[bucket] ?? bucket;
}

export function riskChipClass(bucket: RiskBucket | null | undefined): string {
  if (!bucket) return "signal-low";
  return RISK_CHIP_CLASS[bucket] ?? "signal-low";
}

/* ---------------------------------------------------------------------------
   Derived helpers
--------------------------------------------------------------------------- */

/** Risk score is 0..100; clamp for rail and bar geometry. */
export function clampRiskScore(score: number | null | undefined): number {
  if (score === null || score === undefined || Number.isNaN(score)) return 0;
  return Math.min(100, Math.max(0, score));
}

/** Sort deals by descending risk score, then by amount. */
export function byRiskDesc(
  a: { score: number; amount?: bigint },
  b: { score: number; amount?: bigint },
): number {
  if (b.score !== a.score) return b.score - a.score;
  return Number((b.amount ?? 0n) - (a.amount ?? 0n));
}

/**
 * The backend returns `#err` as a *resolved* value, so a mutation's `onError`
 * never fires for a rejected write. Inspect the result instead: this returns
 * the human-readable message for an `err` result, or `null` for `ok`.
 */
export function resultErrorMessage(
  result: { __kind__: string; [key: string]: unknown } | null | undefined,
): string | null {
  if (!result || result.__kind__ !== "err") return null;
  const error = result.err;
  if (error && typeof error === "object") {
    return pipelineErrorMessage(error as { __kind__: string });
  }
  return "Something went wrong. Please try again.";
}

/** Human-readable message for a PipelineError variant. */
export function pipelineErrorMessage(error: {
  __kind__: string;
  [key: string]: unknown;
}): string {
  switch (error.__kind__) {
    case "notAuthorized":
      return "You do not have permission to perform this action.";
    case "invalidInput":
      return typeof error.invalidInput === "string"
        ? error.invalidInput
        : "The submitted values are not valid.";
    case "notFound":
      return "That deal no longer exists. Refresh to see the current pipeline.";
    default:
      return "Something went wrong. Please try again.";
  }
}
