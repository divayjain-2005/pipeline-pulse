/**
 * BacktestPanel — historical scoring of the model forecast against the reps'
 * own estimates.
 *
 * This is deliberately framed as a *historical* section: it scores past
 * quarters that were held out of the model, using only closed-won revenue as
 * the actual. It is visually distinct from the live forecast above it so the
 * two are never confused.
 *
 * Each held-out quarter is scored twice against the same actual:
 *   - the model's quarter-level revenue forecast
 *   - the sum of rep estimates for that quarter
 * Error is shown as a signed percentage plus a dollar delta so over- and
 * under-forecasting are distinguishable.
 */

import {
  PanelEmpty,
  PanelError,
  PanelSkeleton,
} from "@/components/overview/OverviewStates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCurrency,
  formatDateTime,
  formatPercentDelta,
} from "@/lib/format";
import type { BacktestQuarterRow, BacktestResult } from "@/lib/pipeline";
import { cn } from "@/lib/utils";
import { History } from "lucide-react";

export interface BacktestPanelProps {
  result: BacktestResult | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

/** Signed whole-currency delta, e.g. "+$120K" / "−$80K". */
function signedCurrency(delta: bigint): string {
  if (delta === 0n) return "$0";
  const sign = delta > 0n ? "+" : "−";
  const magnitude = delta < 0n ? -delta : delta;
  return `${sign}${formatCurrency(magnitude)}`;
}

/** Over-forecasting is warm, under-forecasting is cool, exact is neutral. */
function errorTone(pct: number): string {
  if (pct > 0) return "text-destructive";
  if (pct < 0) return "text-success";
  return "text-muted-foreground";
}

/**
 * Averages are means of absolute per-quarter errors, so they carry no
 * direction — they are always non-negative and must not read as
 * over-forecasting. Render them in a neutral tone.
 */
function averageErrorTone(): string {
  return "text-foreground";
}

function ErrorCell({
  pct,
  delta,
  ocid,
}: {
  pct: number;
  delta: bigint;
  ocid: string;
}) {
  return (
    <div className="flex flex-col items-end gap-0.5" data-ocid={ocid}>
      <span
        className={cn("font-mono text-sm tabular-nums", errorTone(pct))}
        data-numeric
      >
        {formatPercentDelta(pct, 1)}
      </span>
      <span
        className="font-mono text-xs tabular-nums text-muted-foreground"
        data-numeric
      >
        {signedCurrency(delta)}
      </span>
    </div>
  );
}

function QuarterRow({
  row,
  index,
}: { row: BacktestQuarterRow; index: number }) {
  const unestimated = row.estimatedDealCount === 0n;
  return (
    <TableRow
      className="border-b border-border/70"
      data-ocid={`overview.backtest.row.${index + 1}`}
    >
      <TableCell className="px-4 py-3.5 align-top">
        <span className="block font-medium text-foreground">
          {row.quarterLabel}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {row.wonDealCount.toString()} closed-won of {row.dealCount.toString()}{" "}
          deals
        </span>
      </TableCell>
      <TableCell
        className="px-4 py-3.5 text-right align-top font-mono tabular-nums text-foreground"
        data-numeric
      >
        {formatCurrency(row.modelForecast)}
      </TableCell>
      <TableCell className="px-4 py-3.5 text-right align-top">
        {unestimated ? (
          <span
            className="text-xs italic text-muted-foreground"
            data-ocid={`overview.backtest.unestimated.${index + 1}`}
          >
            No rep estimates
          </span>
        ) : (
          <span className="font-mono tabular-nums text-foreground" data-numeric>
            {formatCurrency(row.repEstimateTotal)}
          </span>
        )}
      </TableCell>
      <TableCell
        className="px-4 py-3.5 text-right align-top font-mono tabular-nums text-foreground"
        data-numeric
      >
        {formatCurrency(row.actualWon)}
      </TableCell>
      <TableCell className="px-4 py-3.5 text-right align-top">
        <ErrorCell
          pct={row.modelErrorPct}
          delta={row.modelErrorDelta}
          ocid={`overview.backtest.model_error.${index + 1}`}
        />
      </TableCell>
      <TableCell className="px-4 py-3.5 text-right align-top">
        {unestimated ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <ErrorCell
            pct={row.repErrorPct}
            delta={row.repErrorDelta}
            ocid={`overview.backtest.rep_error.${index + 1}`}
          />
        )}
      </TableCell>
    </TableRow>
  );
}

export function BacktestPanel({
  result,
  isLoading,
  isError,
  onRetry,
}: BacktestPanelProps) {
  return (
    <section
      className="rounded-lg border border-border bg-card p-6 shadow-none"
      aria-label="Historical backtest"
      data-ocid="overview.backtest.panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
            <History className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
              Backtest — model vs. rep estimates
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Historical scoring on held-out quarters. Not the live forecast.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Historical
        </span>
      </div>

      {isLoading ? (
        <div className="mt-5" data-ocid="overview.backtest.loading_state">
          <PanelSkeleton rows={5} />
        </div>
      ) : isError ? (
        <div className="mt-5">
          <PanelError
            message="The backtest could not be loaded. Check the connection and try again."
            onRetry={onRetry}
            ocid="overview.backtest.error_state"
          />
        </div>
      ) : !result || result.rows.length === 0 ? (
        <div className="mt-5">
          <PanelEmpty
            title="No held-out quarters yet"
            description="Once closed-won history spans a few quarters, the model and rep estimates are scored here against actual revenue."
            ocid="overview.backtest.empty_state"
          />
        </div>
      ) : (
        <>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Scoring uses only closed-won revenue.{" "}
            {result.holdoutQuarterCount.toString()} quarter
            {result.holdoutQuarterCount === 1n ? "" : "s"} held out
            {result.computedAt
              ? ` · computed ${formatDateTime(result.computedAt)}`
              : ""}
            .
          </p>

          <div className="mt-4 overflow-hidden rounded-md border border-border">
            <div className="overflow-x-auto scroll-slim">
              <Table className="min-w-[52rem] border-separate border-spacing-0">
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted hover:bg-muted">
                    <TableHead
                      scope="col"
                      className="h-10 bg-muted px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      Held-out quarter
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="h-10 bg-muted px-4 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      Model forecast
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="h-10 bg-muted px-4 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      Rep estimates
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="h-10 bg-muted px-4 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      Actual closed-won
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="h-10 bg-muted px-4 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      Model error
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="h-10 bg-muted px-4 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      Rep error
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((row, index) => (
                    <QuarterRow
                      key={row.quarterLabel}
                      row={row}
                      index={index}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div
              className="rounded-md border border-border bg-muted/40 p-4"
              data-ocid="overview.backtest.avg_model"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Average model error
              </p>
              <p
                className={cn(
                  "mt-1.5 font-display text-2xl font-semibold tabular-nums",
                  averageErrorTone(),
                )}
                data-numeric
              >
                {formatPercentDelta(result.avgModelErrorPct, 1)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Mean absolute error across held-out quarters
              </p>
            </div>

            <div
              className="rounded-md border border-border bg-muted/40 p-4"
              data-ocid="overview.backtest.avg_rep"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Average rep estimate error
              </p>
              <p
                className={cn(
                  "mt-1.5 font-display text-2xl font-semibold tabular-nums",
                  averageErrorTone(),
                )}
                data-numeric
              >
                {formatPercentDelta(result.avgRepErrorPct, 1)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Mean absolute error across held-out quarters
              </p>
            </div>
          </div>

          <div
            className="mt-4 rounded-md border border-border bg-muted/40 p-4"
            data-ocid="overview.backtest.verdict"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Verdict
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground">
              {result.verdict}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
