/**
 * ReasoningPanel — the LLM reasoning layer for a single deal.
 *
 * Shows the persisted explanation and recommended next action when present,
 * and a "Run risk analysis" control that regenerates them. The outcall takes
 * seconds, so the pending state is explicit and a failure offers a retry.
 */

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { DealRisk } from "@/lib/pipeline";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowRight, Loader2, Sparkles } from "lucide-react";

export interface ReasoningPanelProps {
  risk: DealRisk | null | undefined;
  isPending: boolean;
  errorMessage: string | null;
  onRun: () => void;
}

export function ReasoningPanel({
  risk,
  isPending,
  errorMessage,
  onRun,
}: ReasoningPanelProps) {
  const hasExplanation = Boolean(risk?.explanation?.trim());
  const hasAction = Boolean(risk?.recommendedAction?.trim());

  return (
    <section
      className="rounded-lg border border-border bg-card shadow-subtle"
      aria-label="AI risk reasoning"
      data-ocid="deal_detail.reasoning_panel"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          <h3 className="font-display text-sm font-semibold text-foreground">
            AI risk reasoning
          </h3>
        </div>
        <Button
          type="button"
          size="sm"
          variant={hasExplanation ? "outline" : "default"}
          onClick={onRun}
          disabled={isPending}
          className="rounded-md"
          data-ocid="deal_detail.run_analysis_button"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="size-3.5" aria-hidden="true" />
          )}
          {isPending
            ? "Analyzing…"
            : hasExplanation
              ? "Re-run risk analysis"
              : "Run risk analysis"}
        </Button>
      </header>

      <div className="space-y-4 p-4">
        {isPending && (
          <div
            className="flex items-center gap-2.5 rounded-md border border-border bg-muted/40 px-3 py-2.5"
            data-ocid="deal_detail.reasoning_panel.loading_state"
          >
            <Loader2
              className="size-4 shrink-0 animate-spin text-primary"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Reading the deal's signals and drafting a specific explanation.
              This can take a few seconds.
            </p>
          </div>
        )}

        {errorMessage && (
          <div
            className="flex flex-col items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5"
            data-ocid="deal_detail.reasoning_panel.error_state"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <p className="text-xs leading-relaxed text-foreground">
                {errorMessage}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRun}
              disabled={isPending}
              className="rounded-md"
              data-ocid="deal_detail.reasoning_panel.retry_button"
            >
              Retry analysis
            </Button>
          </div>
        )}

        {hasExplanation ? (
          <div data-ocid="deal_detail.reasoning_panel.explanation">
            <p className="label-section">Why this deal is at risk</p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground">
              {risk?.explanation}
            </p>
          </div>
        ) : (
          !isPending &&
          !errorMessage && (
            <div
              className="rounded-md border border-dashed border-border px-4 py-6 text-center"
              data-ocid="deal_detail.reasoning_panel.empty_state"
            >
              <p className="text-sm text-muted-foreground">
                No explanation has been generated for this deal yet. Run the
                risk analysis to produce one.
              </p>
            </div>
          )
        )}

        {hasAction && (
          <div
            className={cn(
              "rounded-md border border-primary/25 bg-primary/5 p-3.5",
            )}
            data-ocid="deal_detail.reasoning_panel.recommended_action"
          >
            <p className="label-section flex items-center gap-1.5">
              <ArrowRight className="size-3" aria-hidden="true" />
              Recommended next action
            </p>
            <p className="mt-1.5 text-sm font-medium leading-relaxed text-foreground">
              {risk?.recommendedAction}
            </p>
          </div>
        )}

        {risk?.explanationGeneratedAt != null && (
          <p
            className="font-mono text-[11px] text-muted-foreground"
            data-numeric
            data-ocid="deal_detail.reasoning_panel.generated_at"
          >
            Generated {formatDateTime(risk.explanationGeneratedAt)}
          </p>
        )}
      </div>
    </section>
  );
}
