/**
 * KpiCards — the Overview headline metrics.
 *
 * HeroForecastCard leads with the tracked uppercase eyebrow, a very large
 * display numeral for the most-likely value, and the signature confidence rail
 * beneath it. SecondaryKpiCard is the hairline-bordered supporting tile.
 */

import { ConfidenceRail } from "@/components/ConfidenceRail";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface HeroForecastCardProps {
  /** Quarter label, e.g. "Q3 2026". */
  quarterLabel: string;
  mostLikely: bigint;
  low: bigint;
  high: bigint;
  confidenceLabel: string;
  /** Comparison marker rendered on the rail, e.g. the naive pipeline. */
  baseline?: bigint | null;
  /** Short plain-language note under the rail. */
  footnote?: string;
}

export function HeroForecastCard({
  quarterLabel,
  mostLikely,
  low,
  high,
  confidenceLabel,
  baseline,
  footnote,
}: HeroForecastCardProps) {
  return (
    <section
      className="relative overflow-hidden rounded-lg border border-border bg-card p-6 shadow-subtle lg:p-8"
      data-ocid="overview.hero.card"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="label-section">Weighted forecast · {quarterLabel}</p>
          <p
            className="mt-3 font-display text-5xl font-semibold leading-none tracking-tight text-foreground lg:text-6xl"
            data-numeric
            data-ocid="overview.hero.value"
          >
            {formatCurrency(mostLikely)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Most likely outcome across the open pipeline
          </p>
        </div>

        <span
          className="inline-flex items-center rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-xs font-medium text-primary"
          data-ocid="overview.hero.confidence_label"
        >
          {confidenceLabel}
        </span>
      </div>

      <div className="mt-7">
        <ConfidenceRail
          low={low}
          high={high}
          mostLikely={mostLikely}
          baseline={baseline}
          showLabels
          size="lg"
          label={`Forecast confidence range ${formatCurrencyCompact(
            low,
          )} to ${formatCurrencyCompact(high)}, most likely ${formatCurrencyCompact(
            mostLikely,
          )}`}
        />
      </div>

      {footnote && (
        <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          {footnote}
        </p>
      )}
    </section>
  );
}

export interface SecondaryKpiCardProps {
  label: string;
  value: string;
  caption: string;
  /** Optional trailing element, e.g. a risk chip. */
  trailing?: ReactNode;
  ocid: string;
}

export function SecondaryKpiCard({
  label,
  value,
  caption,
  trailing,
  ocid,
}: SecondaryKpiCardProps) {
  return (
    <div
      className="flex flex-col justify-between rounded-lg border border-border bg-card p-5 shadow-none"
      data-ocid={ocid}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="label-section">{label}</p>
        {trailing}
      </div>
      <p
        className="mt-4 font-display text-2xl font-semibold tracking-tight text-foreground"
        data-numeric
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {caption}
      </p>
    </div>
  );
}

export interface SecondaryKpiGridProps {
  /** Probability-adjusted forecast value (forecast.mostLikely). */
  weightedPipeline: bigint;
  /** Raw unweighted total of every open deal, for contrast. */
  naivePipeline: bigint;
  atRiskValue: bigint;
  dealCount: bigint;
  openDealCount: bigint;
  atRiskDealCount: bigint;
}

export function SecondaryKpiGrid({
  weightedPipeline,
  naivePipeline,
  atRiskValue,
  dealCount,
  openDealCount,
  atRiskDealCount,
}: SecondaryKpiGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SecondaryKpiCard
        label="Weighted pipeline"
        value={formatCurrency(weightedPipeline)}
        caption={`Probability-adjusted value across ${formatNumber(
          openDealCount,
        )} open deals`}
        ocid="overview.kpi.weighted_pipeline"
      />
      <SecondaryKpiCard
        label="Raw pipeline"
        value={formatCurrency(naivePipeline)}
        caption="Every open deal at full value — the unweighted baseline"
        ocid="overview.kpi.naive_pipeline"
      />
      <SecondaryKpiCard
        label="At-risk value"
        value={formatCurrency(atRiskValue)}
        caption={`High-risk exposure across ${formatNumber(
          atRiskDealCount,
        )} deals`}
        trailing={
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium",
              "signal-high",
            )}
          >
            High risk
          </span>
        }
        ocid="overview.kpi.at_risk"
      />
      <SecondaryKpiCard
        label="Deals tracked"
        value={formatNumber(dealCount)}
        caption={`${formatNumber(
          openDealCount,
        )} open · ${formatNumber(dealCount - openDealCount)} closed`}
        ocid="overview.kpi.deal_count"
      />
    </div>
  );
}
