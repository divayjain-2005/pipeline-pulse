/**
 * RiskChip — restrained risk-bucket chip.
 *
 * Color is never the only signal: every chip renders its bucket label as text
 * alongside the tinted background and border.
 */

import { RISK_LABELS, type RiskBucket, riskChipClass } from "@/lib/pipeline";
import { cn } from "@/lib/utils";

export interface RiskChipProps {
  bucket: RiskBucket | null | undefined;
  /** Optional stable suffix (e.g. a deal id) to keep the ocid unique per chip. */
  id?: string | number;
  className?: string;
}

export function RiskChip({ bucket, id, className }: RiskChipProps) {
  const label = bucket ? (RISK_LABELS[bucket] ?? bucket) : "Unrated";
  const bucketToken = bucket ?? "unrated";
  const ocid =
    id === undefined || id === null
      ? `deals.risk_chip.${bucketToken}`
      : `deals.risk_chip.${bucketToken}.${id}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[4px] border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]",
        riskChipClass(bucket),
        className,
      )}
      data-ocid={ocid}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
