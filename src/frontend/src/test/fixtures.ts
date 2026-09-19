/**
 * Shared test fixtures for the pipeline dashboard.
 *
 * Every fixture is typed against the app's own exported domain types so a
 * backend shape change fails the type-check rather than silently drifting.
 */

import {
  type BacktestQuarterRow,
  type BacktestResult,
  type Deal,
  type DealRisk,
  DealStage,
  EngagementLevel,
  type Forecast,
  type ForecastBreakdown,
  type HistoricalBaseline,
  RiskBucket,
  type RiskSignal,
  type Stakeholder,
  StakeholderRole,
} from "@/lib/pipeline";

const DAY = 86_400_000;
const NOW = BigInt(Date.UTC(2026, 8, 18, 12, 0, 0));

export function makeStakeholder(
  overrides: Partial<Stakeholder> = {},
): Stakeholder {
  return {
    name: "Dana Whitfield",
    role: StakeholderRole.economicBuyer,
    lastContacted: NOW - 5n * BigInt(DAY),
    engagement: EngagementLevel.high,
    ...overrides,
  };
}

export function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 1n,
    name: "Enterprise Renewal",
    account: "Northwind Logistics",
    owner: "Priya Raman",
    stage: DealStage.negotiation,
    amount: 250_000n,
    expectedCloseDate: NOW + 21n * BigInt(DAY),
    lastActivityDate: NOW - 2n * BigInt(DAY),
    notes: "Procurement is reviewing the redlines.",
    createdDate: NOW - 90n * BigInt(DAY),
    closeDatePushes: 2n,
    activityLast30Days: 3n,
    activityPrior30Days: 8n,
    stakeholders: [makeStakeholder()],
    ...overrides,
  };
}

export function makeSignal(overrides: Partial<RiskSignal> = {}): RiskSignal {
  return {
    code: "stalled_activity",
    caption: "Activity has stalled",
    detail: "No logged activity in the last 14 days.",
    weight: 30,
    contribution: 30,
    ...overrides,
  };
}

export function makeRisk(overrides: Partial<DealRisk> = {}): DealRisk {
  return {
    dealId: 1n,
    score: 72,
    bucket: RiskBucket.high,
    topReason: "Activity has stalled for 14 days",
    recommendedAction: "Call Dana Whitfield to confirm the redline review date",
    explanation:
      "This deal is at risk because activity stopped after the proposal stage and the close date has slipped twice.",
    explanationGeneratedAt: NOW - BigInt(DAY),
    signals: [
      makeSignal(),
      makeSignal({
        code: "close_date_push",
        caption: "Close date pushed twice",
        detail: "The expected close date moved twice in 30 days.",
        weight: 25,
        contribution: 25,
      }),
      makeSignal({
        code: "single_threaded",
        caption: "Single-threaded",
        detail: "Only one stakeholder is engaged.",
        weight: 17,
        contribution: 17,
      }),
    ],
    ...overrides,
  };
}

export function makeBreakdown(
  overrides: Partial<ForecastBreakdown> = {},
): ForecastBreakdown {
  return {
    key: "negotiation",
    totalValue: 500_000n,
    weightedValue: 300_000n,
    caption: "Negotiation",
    dealCount: 2n,
    ...overrides,
  };
}

export function makeForecast(overrides: Partial<Forecast> = {}): Forecast {
  return {
    low: 1_100_000n,
    high: 1_900_000n,
    mostLikely: 1_500_000n,
    naivePipeline: 2_400_000n,
    repCommitEstimate: 1_800_000n,
    confidenceLabel: "Medium confidence",
    rangeBasis:
      "Range spans the 25th to 75th percentile of historical stage outcomes.",
    rationale:
      "Negotiation-stage deals carry the quarter; two large renewals dominate the upside.",
    rationaleGeneratedAt: NOW - BigInt(DAY),
    computedAt: NOW,
    byStage: [
      makeBreakdown({ key: "prospecting", caption: "Prospecting" }),
      makeBreakdown({ key: "qualification", caption: "Qualification" }),
      makeBreakdown({ key: "proposal", caption: "Proposal" }),
      makeBreakdown({ key: "negotiation", caption: "Negotiation" }),
    ],
    byRiskBucket: [
      makeBreakdown({ key: "high", caption: "High risk" }),
      makeBreakdown({ key: "medium", caption: "Medium risk" }),
      makeBreakdown({ key: "low", caption: "Low risk" }),
    ],
    byOwner: [
      makeBreakdown({ key: "Priya Raman", caption: "Priya Raman" }),
      makeBreakdown({ key: "Marcus Lee", caption: "Marcus Lee" }),
    ],
    ...overrides,
  };
}

export function makeBaseline(
  overrides: Partial<HistoricalBaseline> = {},
): HistoricalBaseline {
  return {
    forecastErrorPct: 0.12,
    overallWinRate: 0.34,
    avgDealCycleDays: 96,
    closedDealCount: 120n,
    stageStats: [
      {
        stage: DealStage.negotiation,
        totalValue: 500_000n,
        weightedValue: 300_000n,
        dealCount: 2n,
        avgDaysInStage: 18,
        winRate: 0.6,
      },
    ],
    ...overrides,
  };
}

export function makeBacktestRow(
  overrides: Partial<BacktestQuarterRow> = {},
): BacktestQuarterRow {
  return {
    quarterLabel: "2026 Q2",
    quarterStart: NOW - 180n * BigInt(DAY),
    quarterEnd: NOW - 90n * BigInt(DAY),
    modelForecast: 1_200_000n,
    repEstimateTotal: 1_050_000n,
    actualWon: 1_000_000n,
    modelErrorPct: 0.2,
    modelErrorDelta: 200_000n,
    repErrorPct: 0.05,
    repErrorDelta: 50_000n,
    dealCount: 48n,
    estimatedDealCount: 42n,
    wonDealCount: 12n,
    ...overrides,
  };
}

export function makeBacktestResult(
  overrides: Partial<BacktestResult> = {},
): BacktestResult {
  return {
    rows: [
      makeBacktestRow({
        quarterLabel: "2026 Q2",
        modelErrorPct: 0.2,
        repErrorPct: 0.05,
      }),
      makeBacktestRow({
        quarterLabel: "2026 Q1",
        modelErrorPct: -0.1,
        repErrorPct: 0.15,
      }),
    ],
    avgModelErrorPct: 0.15,
    avgRepErrorPct: 0.1,
    verdict:
      "Across 2 held-out quarters the reps' average error was 10% versus the model's 15%, so the reps were closer by 5% of actual closed-won revenue.",
    holdoutQuarterCount: 2n,
    computedAt: NOW,
    ...overrides,
  };
}

/** A small, deterministic seeded pipeline for page-level journeys. */
export function makeSeededPipeline(): { deals: Deal[]; risks: DealRisk[] } {
  const deals: Deal[] = [
    makeDeal({
      id: 1n,
      name: "Enterprise Renewal",
      account: "Northwind Logistics",
      owner: "Priya Raman",
      stage: DealStage.negotiation,
      amount: 250_000n,
      repEstimate: 240_000n,
    }),
    makeDeal({
      id: 2n,
      name: "Platform Expansion",
      account: "Acme Corp",
      owner: "Marcus Lee",
      stage: DealStage.proposal,
      amount: 180_000n,
      repEstimate: 150_000n,
    }),
    makeDeal({
      id: 3n,
      name: "Pilot Rollout",
      account: "Globex",
      owner: "Priya Raman",
      stage: DealStage.qualification,
      amount: 90_000n,
      // Deliberately unestimated: the ledger must mark it as such.
      repEstimate: undefined,
    }),
    makeDeal({
      id: 4n,
      name: "Closed Legacy Deal",
      account: "Initech",
      owner: "Marcus Lee",
      stage: DealStage.closedWon,
      amount: 400_000n,
    }),
  ];

  const risks: DealRisk[] = [
    makeRisk({
      dealId: 1n,
      score: 82,
      bucket: RiskBucket.high,
      topReason: "Activity has stalled for 14 days",
      recommendedAction:
        "Call Dana Whitfield to confirm the redline review date",
    }),
    makeRisk({
      dealId: 2n,
      score: 55,
      bucket: RiskBucket.medium,
      topReason: "Close date pushed twice",
      recommendedAction: "Email Marcus Lee to re-baseline the close plan",
      signals: [
        makeSignal({ code: "close_date_push", weight: 55, contribution: 55 }),
      ],
    }),
    makeRisk({
      dealId: 3n,
      score: 20,
      bucket: RiskBucket.low,
      topReason: "Single-threaded buying committee",
      recommendedAction: "Ask Priya Raman to introduce the economic buyer",
      signals: [
        makeSignal({ code: "single_threaded", weight: 20, contribution: 20 }),
      ],
    }),
  ];

  return { deals, risks };
}
