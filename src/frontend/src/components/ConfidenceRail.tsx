/**
 * ConfidenceRail — the signature forecast uncertainty object.
 *
 * Renders a hairline track spanning the full domain, a translucent band from
 * `low` to `high`, a marker at `mostLikely`, and optional end labels. The band
 * animates in from the left (`animate-rail-in`) and the marker fades in after
 * (`animate-marker-in`), per the design brief.
 */

import { formatCurrencyCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ConfidenceRailProps {
  /** Lower bound of the confidence range. */
  low: bigint | number;
  /** Upper bound of the confidence range. */
  high: bigint | number;
  /** Point estimate rendered as the marker. */
  mostLikely: bigint | number;
  /** Optional comparison marker, e.g. the naive pipeline or baseline. */
  baseline?: bigint | number | null;
  /** Show low/high value labels beneath the rail. */
  showLabels?: boolean;
  /** Compact rail for table rows and triage lists. */
  size?: "sm" | "md" | "lg";
  /** Accessible description of what the rail represents. */
  label?: string;
  className?: string;
}

const SIZE_CLASS = {
  sm: { track: "h-1.5", marker: "h-3 w-[3px]", label: "text-[10px]" },
  md: { track: "h-2", marker: "h-4 w-[3px]", label: "text-[11px]" },
  lg: { track: "h-2.5", marker: "h-5 w-1", label: "text-xs" },
} as const;

function toNumber(value: bigint | number): number {
  return typeof value === "bigint" ? Number(value) : value;
}

export function ConfidenceRail({
  low,
  high,
  mostLikely,
  baseline,
  showLabels = false,
  size = "md",
  label,
  className,
}: ConfidenceRailProps) {
  const lowNum = toNumber(low);
  const highNum = toNumber(high);
  const likelyNum = toNumber(mostLikely);
  const baselineNum =
    baseline === null || baseline === undefined ? null : toNumber(baseline);

  // Domain spans the union of the range and any comparison marker so both
  // markers stay inside the track.
  const domainMin = Math.min(lowNum, baselineNum ?? lowNum);
  const domainMax = Math.max(highNum, baselineNum ?? highNum);
  const span = domainMax - domainMin || 1;

  const pct = (value: number) =>
    Math.min(100, Math.max(0, ((value - domainMin) / span) * 100));

  const bandLeft = pct(lowNum);
  const bandWidth = Math.max(0, pct(highNum) - bandLeft);
  const markerLeft = pct(likelyNum);
  const baselineLeft = baselineNum === null ? null : pct(baselineNum);

  const sizes = SIZE_CLASS[size];
  const accessibleLabel =
    label ??
    `Confidence range ${formatCurrencyCompact(low)} to ${formatCurrencyCompact(
      high,
    )}, most likely ${formatCurrencyCompact(mostLikely)}`;

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full rail-track",
          sizes.track,
        )}
        role="img"
        aria-label={accessibleLabel}
        data-ocid="confidence_rail"
      >
        <div
          className="absolute inset-y-0 origin-left animate-rail-in rounded-full rail-band"
          style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
        />
        {baselineLeft !== null && (
          <div
            className="absolute inset-y-0 w-px animate-marker-in rail-marker-baseline"
            style={{ left: `${baselineLeft}%` }}
            aria-hidden="true"
          />
        )}
        <div
          className={cn(
            "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 animate-marker-in rounded-full rail-marker",
            sizes.marker,
          )}
          style={{ left: `${markerLeft}%` }}
          aria-hidden="true"
        />
      </div>

      {showLabels && (
        <div
          className={cn(
            "mt-1.5 flex items-center justify-between font-mono text-muted-foreground",
            sizes.label,
          )}
        >
          <span data-numeric>{formatCurrencyCompact(low)}</span>
          <span className="label-section">Confidence range</span>
          <span data-numeric>{formatCurrencyCompact(high)}</span>
        </div>
      )}
    </div>
  );
}
