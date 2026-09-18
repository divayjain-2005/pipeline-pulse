/**
 * WeeklyTriageCard — one deal in the manager's weekly triage list.
 *
 * Shows the deal identity, the risk score with its bucket chip, the specific
 * top risk reason, and the recommended next action as a short sentence a
 * manager can read aloud in a meeting. Deals without a persisted explanation
 * expose a "Run risk analysis" action with pending and retry states.
 */

import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/format";
import {
  type Deal,
  type DealRisk,
  clampRiskScore,
  riskChipClass,
  riskLabel,
  stageLabel,
} from "@/lib/pipeline";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { AlertCircle, ArrowUpRight, Loader2, Sparkles } from "lucide-react";

export interface WeeklyTriageCardProps {
  deal: Deal;
  risk: DealRisk;
  /** 1-based position in the prioritized list. */
  rank: number;
  /** True while this deal's reasoning mutation is in flight. */
  isGenerating: boolean;
  /** Error message from the last failed reasoning attempt, if any. */
  generateError?: string;
  onRunAnalysis: () => void;
}

export function WeeklyTriageCard({
  deal,
  risk,
  rank,
  isGenerating,
  generateError,
  onRunAnalysis,
}: WeeklyTriageCardProps) {
  const score = clampRiskScore(risk.score);
  const hasExplanation = risk.explanation.trim().length > 0;

  return (
    <article
      className="group relative rounded-lg border border-border bg-card p-5 shadow-subtle transition-smooth hover:border-primary/40"
      data-ocid={`weekly.item.${rank}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <span
            className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-secondary font-mono text-xs font-semibold text-secondary-foreground"
            aria-hidden="true"
          >
            {rank}
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-semibold tracking-tight text-foreground">
              <Link
                to="/deals/$dealId"
                params={{ dealId: deal.id.toString() }}
                className="transition-smooth hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                data-ocid={`weekly.link.${rank}`}
              >
                {deal.name}
              </Link>
            </h3>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {deal.account}
              <span className="mx-1.5 text-border" aria-hidden="true">
                ·
              </span>
              {deal.owner}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <p
              className="font-mono text-lg font-semibold leading-none text-foreground"
              data-numeric
            >
              {score}
            </p>
            <p className="label-section mt-1">Risk score</p>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold",
              riskChipClass(risk.bucket),
            )}
            data-ocid={`weekly.risk_chip.${rank}`}
          >
            {riskLabel(risk.bucket)}
          </span>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-4 sm:grid-cols-4">
        <div className="min-w-0">
          <dt className="label-section">Amount</dt>
          <dd
            className="mt-1 truncate font-mono text-sm font-medium text-foreground"
            data-numeric
          >
            {formatCurrency(deal.amount)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="label-section">Stage</dt>
          <dd className="mt-1 truncate text-sm text-foreground">
            {stageLabel(deal.stage)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="label-section">Expected close</dt>
          <dd className="mt-1 truncate text-sm text-foreground">
            {formatDate(deal.expectedCloseDate)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="label-section">Last activity</dt>
          <dd className="mt-1 truncate text-sm text-foreground">
            {formatRelativeTime(deal.lastActivityDate)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-3">
        <div className="rounded-md border border-border bg-secondary/60 p-3.5">
          <p className="label-section">Top risk</p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">
            {risk.topReason}
          </p>
        </div>

        <div className="rounded-md border border-primary/25 bg-primary/[0.06] p-3.5">
          <p className="label-section text-primary">Recommended next action</p>
          <p className="mt-1.5 text-sm font-medium leading-relaxed text-foreground">
            {risk.recommendedAction}
          </p>
        </div>
      </div>

      {hasExplanation ? (
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="label-section">Why this is at risk</p>
            {risk.explanationGeneratedAt != null ? (
              <p className="text-xs text-muted-foreground">
                Generated {formatRelativeTime(risk.explanationGeneratedAt)}
              </p>
            ) : null}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {risk.explanation}
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            No written analysis yet — run it to get the full reasoning.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRunAnalysis}
            disabled={isGenerating}
            data-ocid={`weekly.run_analysis_button.${rank}`}
            className="rounded-md"
          >
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="size-4" aria-hidden="true" />
            )}
            {isGenerating ? "Analyzing…" : "Run risk analysis"}
          </Button>
        </div>
      )}

      {generateError ? (
        <div
          className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/[0.07] px-3.5 py-2.5"
          role="alert"
          data-ocid={`weekly.analysis_error.${rank}`}
        >
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            {generateError}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRunAnalysis}
            disabled={isGenerating}
            data-ocid={`weekly.retry_analysis_button.${rank}`}
            className="rounded-md"
          >
            Retry
          </Button>
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <Link
          to="/deals/$dealId"
          params={{ dealId: deal.id.toString() }}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-smooth hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          data-ocid={`weekly.open_deal_link.${rank}`}
        >
          Open deal
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
