/**
 * URL search-param parsing and row sorting for the At-Risk Deals page.
 *
 * Kept out of the page module so the page stays focused on composition and
 * data flow. Every parser is total: unknown or malformed values fall back to
 * the default view rather than throwing.
 */

import type { DealRow, SortDir, SortKey } from "@/components/deals/DealsTable";
import {
  type DealStage,
  RISK_ORDER,
  type RiskBucket,
  STAGE_ORDER,
} from "@/lib/pipeline";

export interface DealsSearch {
  stage?: DealStage;
  owner?: string;
  bucket?: RiskBucket;
  min?: string;
  max?: string;
  sort?: SortKey;
  dir?: SortDir;
}

const SORT_KEYS: SortKey[] = [
  "risk",
  "amount",
  "repEstimate",
  "closeDate",
  "name",
  "account",
  "owner",
  "stage",
];

export function parseSortKey(value: unknown): SortKey {
  return SORT_KEYS.includes(value as SortKey) ? (value as SortKey) : "risk";
}

export function parseSortDir(value: unknown): SortDir {
  return value === "asc" ? "asc" : "desc";
}

export function parseStage(value: unknown): DealStage | undefined {
  return STAGE_ORDER.includes(value as DealStage)
    ? (value as DealStage)
    : undefined;
}

export function parseBucket(value: unknown): RiskBucket | undefined {
  return RISK_ORDER.includes(value as RiskBucket)
    ? (value as RiskBucket)
    : undefined;
}

export function parseAmount(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? value : undefined;
}

function compareRows(a: DealRow, b: DealRow, key: SortKey): number {
  switch (key) {
    case "risk":
      return (a.risk?.score ?? -1) - (b.risk?.score ?? -1);
    case "amount":
      return Number(a.deal.amount - b.deal.amount);
    case "repEstimate":
      // Unestimated deals sort below estimated ones in ascending order.
      return Number((a.deal.repEstimate ?? -1n) - (b.deal.repEstimate ?? -1n));
    case "closeDate":
      return Number(a.deal.expectedCloseDate - b.deal.expectedCloseDate);
    case "name":
      return a.deal.name.localeCompare(b.deal.name);
    case "account":
      return a.deal.account.localeCompare(b.deal.account);
    case "owner":
      return a.deal.owner.localeCompare(b.deal.owner);
    case "stage":
      return a.deal.stage.localeCompare(b.deal.stage);
    default:
      return 0;
  }
}

/** Sort rows by the active column, breaking ties on descending risk score. */
export function sortRows(
  rows: DealRow[],
  key: SortKey,
  dir: SortDir,
): DealRow[] {
  const direction = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const primary = compareRows(a, b, key) * direction;
    if (primary !== 0) return primary;
    return (b.risk?.score ?? -1) - (a.risk?.score ?? -1);
  });
}
