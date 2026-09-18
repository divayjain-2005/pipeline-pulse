/**
 * ActivityHistoryPanel — engagement trend for a single deal.
 *
 * Compares activity in the last 30 days against the prior 30 days and shows
 * the close-date push count. The trend is stated in words and reinforced by a
 * directional icon and a two-bar comparison, never by color alone.
 */

import { formatDate, formatNumber } from "@/lib/format";
import type { Deal } from "@/lib/pipeline";
import { cn } from "@/lib/utils";
import { Activity, Minus, TrendingDown, TrendingUp } from "lucide-react";

export interface ActivityHistoryPanelProps {
  deal: Deal;
}

type Trend = "up" | "down" | "flat";

function trendOf(current: number, prior: number): Trend {
  if (current > prior) return "up";
  if (current < prior) return "down";
  return "flat";
}

const TREND_META: Record<
  Trend,
  { label: string; icon: typeof TrendingUp; className: string }
> = {
  up: {
    label: "Accelerating",
    icon: TrendingUp,
    className: "text-success",
  },
  down: {
    label: "Slowing",
    icon: TrendingDown,
    className: "text-destructive",
  },
  flat: {
    label: "Steady",
    icon: Minus,
    className: "text-muted-foreground",
  },
};

export function ActivityHistoryPanel({ deal }: ActivityHistoryPanelProps) {
  const current = Number(deal.activityLast30Days);
  const prior = Number(deal.activityPrior30Days);
  const trend = trendOf(current, prior);
  const meta = TREND_META[trend];
  const TrendIcon = meta.icon;

  const max = Math.max(current, prior, 1);
  const currentPct = (current / max) * 100;
  const priorPct = (prior / max) * 100;

  const delta = current - prior;
  const deltaLabel =
    delta === 0
      ? "No change"
      : `${delta > 0 ? "+" : "−"}${formatNumber(Math.abs(delta))} vs prior 30 days`;

  return (
    <section
      className="rounded-lg border border-border bg-card shadow-subtle"
      aria-label="Activity history"
      data-ocid="deal_detail.activity_panel"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <h3 className="font-display text-sm font-semibold text-foreground">
            Activity history
          </h3>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-semibold",
            meta.className,
          )}
          data-ocid="deal_detail.activity_panel.trend"
        >
          <TrendIcon className="size-3.5" aria-hidden="true" />
          {meta.label}
        </span>
      </header>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="label-section">Last activity</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {formatDate(deal.lastActivityDate)}
            </p>
          </div>
          <div>
            <p className="label-section">Close-date pushes</p>
            <p
              className="mt-1 font-mono text-sm font-semibold text-foreground"
              data-numeric
            >
              {formatNumber(deal.closeDatePushes)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Last 30 days</span>
              <span className="font-mono text-foreground" data-numeric>
                {formatNumber(current)}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full rail-track">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${currentPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Prior 30 days</span>
              <span className="font-mono text-foreground" data-numeric>
                {formatNumber(prior)}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full rail-track">
              <div
                className="h-full rounded-full bg-muted-foreground/50"
                style={{ width: `${priorPct}%` }}
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground" data-numeric>
          {deltaLabel}
        </p>
      </div>
    </section>
  );
}
