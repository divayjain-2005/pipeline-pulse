/**
 * BaselinePanel — compares the probabilistic forecast against the two naive
 * baselines so leadership can see what the model adds.
 *
 * The difference is stated in plain language, not just as a number.
 */

import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export interface BaselinePanelProps {
  mostLikely: bigint;
  naivePipeline: bigint;
  repCommitEstimate: bigint;
  /** Plain-language explanation of how the range was derived. */
  rangeBasis: string;
}

interface ComparisonRow {
  key: string;
  label: string;
  value: bigint;
  caption: string;
  /** Difference against mostLikely, in whole currency units. */
  delta: bigint;
  /** True when this row is the forecast itself. */
  isForecast?: boolean;
}

function deltaTone(delta: bigint): string {
  if (delta > 0n) return "text-success";
  if (delta < 0n) return "text-destructive";
  return "text-muted-foreground";
}

function DeltaIcon({ delta }: { delta: bigint }) {
  if (delta > 0n) {
    return <ArrowUpRight className="size-3.5" aria-hidden="true" />;
  }
  if (delta < 0n) {
    return <ArrowDownRight className="size-3.5" aria-hidden="true" />;
  }
  return <Minus className="size-3.5" aria-hidden="true" />;
}

function signedCurrency(delta: bigint): string {
  if (delta === 0n) return "no difference";
  const sign = delta > 0n ? "+" : "−";
  return `${sign}${formatCurrencyCompact(delta < 0n ? -delta : delta)}`;
}

export function BaselinePanel({
  mostLikely,
  naivePipeline,
  repCommitEstimate,
  rangeBasis,
}: BaselinePanelProps) {
  const rows: ComparisonRow[] = [
    {
      key: "forecast",
      label: "Weighted forecast",
      value: mostLikely,
      caption: "Probability-weighted, adjusted for historical accuracy",
      delta: 0n,
      isForecast: true,
    },
    {
      key: "naive",
      label: "Raw pipeline",
      value: naivePipeline,
      caption: "Every open deal counted at full value",
      delta: naivePipeline - mostLikely,
    },
    {
      key: "commit",
      label: "Rep commit estimate",
      value: repCommitEstimate,
      caption: "What reps have committed to close this quarter",
      delta: repCommitEstimate - mostLikely,
    },
  ];

  const vsNaive = naivePipeline - mostLikely;
  const vsCommit = repCommitEstimate - mostLikely;

  const naiveSentence =
    vsNaive > 0n
      ? `Counting every open deal at full value overstates the quarter by ${formatCurrency(
          vsNaive,
        )}.`
      : vsNaive < 0n
        ? `The weighted forecast sits ${formatCurrency(
            -vsNaive,
          )} above the raw pipeline, which is unusual and worth a look.`
        : "The weighted forecast matches the raw pipeline exactly.";

  const commitSentence =
    vsCommit > 0n
      ? `Rep commitments run ${formatCurrency(
          vsCommit,
        )} ahead of the model — treat that gap as optimism until the deals advance.`
      : vsCommit < 0n
        ? `Rep commitments trail the model by ${formatCurrency(
            -vsCommit,
          )}, suggesting the quarter may be under-called.`
        : "Rep commitments line up with the model.";

  return (
    <section
      className="rounded-lg border border-border bg-card p-6 shadow-none"
      data-ocid="overview.baseline.panel"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
          Forecast vs. baseline
        </h2>
        <p className="text-xs text-muted-foreground">
          How the model differs from simpler estimates
        </p>
      </div>

      <ul className="mt-5 divide-y divide-border">
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex flex-wrap items-center justify-between gap-3 py-3.5"
            data-ocid={`overview.baseline.row.${row.key}`}
          >
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  row.isForecast ? "text-foreground" : "text-foreground/85",
                )}
              >
                {row.label}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {row.caption}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {!row.isForecast && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-mono text-xs",
                    deltaTone(row.delta),
                  )}
                  data-numeric
                >
                  <DeltaIcon delta={row.delta} />
                  {signedCurrency(row.delta)}
                </span>
              )}
              <span
                className={cn(
                  "font-mono text-sm",
                  row.isForecast
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground",
                )}
                data-numeric
              >
                {formatCurrency(row.value)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 space-y-2 rounded-md border border-border bg-muted/40 p-4">
        <p className="text-sm leading-relaxed text-foreground">
          {naiveSentence} {commitSentence}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground/80">
            How the range is built:{" "}
          </span>
          {rangeBasis}
        </p>
      </div>
    </section>
  );
}
