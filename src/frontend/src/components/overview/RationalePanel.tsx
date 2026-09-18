/**
 * RationalePanel — the LLM reasoning layer surface.
 *
 * Generation runs an outcall that takes seconds, so the pending state is
 * explicit and the failure path offers a retry. The returned rationale is
 * rendered as prose, with the last-computed time beneath it.
 */

import { Button } from "@/components/ui/button";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";

export interface RationalePanelProps {
  rationale: string;
  rationaleGeneratedAt?: bigint;
  isPending: boolean;
  errorMessage?: string | null;
  onGenerate: () => void;
}

export function RationalePanel({
  rationale,
  rationaleGeneratedAt,
  isPending,
  errorMessage,
  onGenerate,
}: RationalePanelProps) {
  const hasRationale = rationale.trim().length > 0;

  return (
    <section
      className="rounded-lg border border-border bg-card p-6 shadow-none"
      data-ocid="overview.rationale.panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
            Forecast reasoning
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Which stages and deals drive the number, and what would move it
          </p>
        </div>

        <Button
          type="button"
          variant={hasRationale ? "outline" : "default"}
          size="sm"
          onClick={onGenerate}
          disabled={isPending}
          className="rounded-md"
          data-ocid="overview.rationale.generate_button"
        >
          {isPending ? (
            <>
              <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" aria-hidden="true" />
              {hasRationale ? "Regenerate" : "Generate reasoning"}
            </>
          )}
        </Button>
      </div>

      {isPending && (
        <div
          className="mt-5 flex items-center gap-3 rounded-md border border-border bg-muted/40 p-4"
          data-ocid="overview.rationale.loading_state"
          aria-live="polite"
        >
          <span className="flex gap-1" aria-hidden="true">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
            <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
          </span>
          <p className="text-sm text-muted-foreground">
            The forecast agent is reading the pipeline. This usually takes a few
            seconds.
          </p>
        </div>
      )}

      {errorMessage && !isPending && (
        <div
          className="mt-5 flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4"
          data-ocid="overview.rationale.error_state"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <p className="text-sm leading-relaxed text-foreground">
              {errorMessage}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onGenerate}
            className="rounded-md"
            data-ocid="overview.rationale.retry_button"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      {!isPending && !errorMessage && !hasRationale && (
        <div
          className="mt-5 rounded-md border border-dashed border-border px-5 py-8 text-center"
          data-ocid="overview.rationale.empty_state"
        >
          <p className="text-sm font-medium text-foreground">
            No reasoning generated yet
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
            Generate a written rationale that explains which stages and deals
            drive the forecast, and what would move it.
          </p>
        </div>
      )}

      {!isPending && hasRationale && (
        <div className="mt-5" data-ocid="overview.rationale.text">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
            {rationale}
          </p>
          <p
            className={cn(
              "mt-4 border-t border-border pt-3 font-mono text-[11px] text-muted-foreground",
            )}
            data-numeric
          >
            {rationaleGeneratedAt
              ? `Generated ${formatDateTime(
                  rationaleGeneratedAt,
                )} · ${formatRelativeTime(rationaleGeneratedAt)}`
              : "Generation time unavailable"}
          </p>
        </div>
      )}
    </section>
  );
}
