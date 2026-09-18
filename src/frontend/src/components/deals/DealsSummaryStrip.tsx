/**
 * DealsSummaryStrip — counts and total open value per risk bucket.
 *
 * Sits above the ranked table so leadership can read the shape of the risk
 * distribution before scanning individual deals.
 */

import { RiskChip } from "@/components/deals/RiskChip";
import { formatCurrencyCompact, formatNumber } from "@/lib/format";
import { RISK_ORDER, type RiskBucket } from "@/lib/pipeline";
import { cn } from "@/lib/utils";

export interface BucketSummary {
  bucket: RiskBucket;
  count: number;
  totalValue: bigint;
}

export interface DealsSummaryStripProps {
  summaries: BucketSummary[];
  totalCount: number;
  totalValue: bigint;
  className?: string;
}

export function DealsSummaryStrip({
  summaries,
  totalCount,
  totalValue,
  className,
}: DealsSummaryStripProps) {
  const byBucket = new Map(summaries.map((s) => [s.bucket, s]));

  return (
    <section
      className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}
      aria-label="Risk distribution summary"
      data-ocid="deals.summary_strip"
    >
      <div className="rounded-lg border border-border bg-card p-4 shadow-subtle">
        <p className="label-section">Deals in view</p>
        <p
          className="mt-2 font-display text-2xl font-semibold tabular-nums text-foreground"
          data-numeric
        >
          {formatNumber(totalCount)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatCurrencyCompact(totalValue)} total open value
        </p>
      </div>

      {RISK_ORDER.map((bucket) => {
        const summary = byBucket.get(bucket);
        const count = summary?.count ?? 0;
        const value = summary?.totalValue ?? 0n;
        return (
          <div
            key={bucket}
            className="rounded-lg border border-border bg-card p-4 shadow-subtle"
            data-ocid={`deals.summary.${bucket}`}
          >
            <RiskChip bucket={bucket} />
            <p
              className="mt-2 font-display text-2xl font-semibold tabular-nums text-foreground"
              data-numeric
            >
              {formatNumber(count)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrencyCompact(value)} at risk
            </p>
          </div>
        );
      })}
    </section>
  );
}
