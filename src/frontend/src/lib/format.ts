/**
 * Shared formatters for the pipeline forecasting dashboard.
 *
 * Backend conventions:
 *  - currency amounts are whole currency units (bigint)
 *  - dates are epoch milliseconds (bigint)
 *  - ratios (winRate, forecastErrorPct) are 0..1 fractions
 */

const CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const COMPACT_CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const NUMBER = new Intl.NumberFormat("en-US");

const DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const DATE_SHORT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const DATE_TIME = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Whole currency units → "$1,250,000". */
export function formatCurrency(
  value: bigint | number | null | undefined,
): string {
  if (value === null || value === undefined) return "—";
  return CURRENCY.format(Number(value));
}

/** Whole currency units → "$1.3M" for dense KPI and axis labels. */
export function formatCurrencyCompact(
  value: bigint | number | null | undefined,
): string {
  if (value === null || value === undefined) return "—";
  return COMPACT_CURRENCY.format(Number(value));
}

/** Plain integer with thousands separators. */
export function formatNumber(
  value: bigint | number | null | undefined,
): string {
  if (value === null || value === undefined) return "—";
  return NUMBER.format(Number(value));
}

/** 0..1 fraction → "42%". Pass `digits` for fractional precision. */
export function formatPercent(
  value: number | null | undefined,
  digits = 0,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

/** Signed percentage delta, e.g. "+12%" / "−4%". */
export function formatPercentDelta(
  value: number | null | undefined,
  digits = 0,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value * 100).toFixed(digits)}%`;
}

/** Epoch milliseconds → "Mar 14, 2026". */
export function formatDate(value: bigint | number | null | undefined): string {
  const date = toDate(value);
  return date ? DATE.format(date) : "—";
}

/** Epoch milliseconds → "Mar 14" for dense table cells. */
export function formatDateShort(
  value: bigint | number | null | undefined,
): string {
  const date = toDate(value);
  return date ? DATE_SHORT.format(date) : "—";
}

/** Epoch milliseconds → "Mar 14, 2026, 9:41 AM". */
export function formatDateTime(
  value: bigint | number | null | undefined,
): string {
  const date = toDate(value);
  return date ? DATE_TIME.format(date) : "—";
}

/** Epoch milliseconds → "3 days ago" / "in 2 weeks". */
export function formatRelativeTime(
  value: bigint | number | null | undefined,
  now: number = Date.now(),
): string {
  const date = toDate(value);
  if (!date) return "—";
  const diffMs = date.getTime() - now;
  const absMs = Math.abs(diffMs);
  const past = diffMs < 0;

  const minutes = Math.round(absMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return past ? `${minutes}m ago` : `in ${minutes}m`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return past ? `${hours}h ago` : `in ${hours}h`;

  const days = Math.round(hours / 24);
  if (days < 7) return past ? `${days}d ago` : `in ${days}d`;

  const weeks = Math.round(days / 7);
  if (weeks < 5) return past ? `${weeks}w ago` : `in ${weeks}w`;

  const months = Math.round(days / 30);
  if (months < 12) return past ? `${months}mo ago` : `in ${months}mo`;

  const years = Math.round(days / 365);
  return past ? `${years}y ago` : `in ${years}y`;
}

/** Days between two epoch-millisecond values, rounded. */
export function daysBetween(
  from: bigint | number | null | undefined,
  to: bigint | number | null | undefined,
): number | null {
  const a = toDate(from);
  const b = toDate(to);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Epoch milliseconds → Date, or null when the value is missing/invalid. */
export function toDate(value: bigint | number | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const date = new Date(Number(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Acme Corp — Enterprise Renewal" → "AR" style initials for avatars. */
export function initials(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Title-case a camelCase backend enum value: "economicBuyer" → "Economic Buyer". */
export function humanizeEnum(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}
