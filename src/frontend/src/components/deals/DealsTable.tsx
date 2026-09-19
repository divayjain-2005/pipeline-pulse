/**
 * DealsTable — the ranked at-risk deal ledger.
 *
 * Sticky light header, generous row height, hairline separators, right-aligned
 * tabular mono currency. Sortable column headers write through to the URL.
 * Rows are keyboard-activatable and navigate to the deal detail route.
 */

import { RiskChip } from "@/components/deals/RiskChip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  type Deal,
  type DealRisk,
  clampRiskScore,
  stageLabel,
} from "@/lib/pipeline";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

export type SortKey =
  | "risk"
  | "amount"
  | "repEstimate"
  | "closeDate"
  | "name"
  | "account"
  | "owner"
  | "stage";

export type SortDir = "asc" | "desc";

export interface DealRow {
  deal: Deal;
  risk: DealRisk | null;
}

export interface DealsTableProps {
  rows: DealRow[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onOpenDeal: (dealId: bigint) => void;
}

interface Column {
  key: SortKey;
  label: string;
  align?: "left" | "right";
  className?: string;
}

const COLUMNS: Column[] = [
  { key: "name", label: "Deal" },
  { key: "account", label: "Account" },
  { key: "owner", label: "Owner" },
  { key: "amount", label: "Amount", align: "right" },
  { key: "repEstimate", label: "Rep estimate", align: "right" },
  { key: "stage", label: "Stage" },
  { key: "closeDate", label: "Expected close" },
  { key: "risk", label: "Risk score", align: "right" },
];

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return (
      <ChevronsUpDown
        className="size-3.5 text-muted-foreground/60"
        aria-hidden="true"
      />
    );
  }
  return dir === "asc" ? (
    <ArrowUp className="size-3.5" aria-hidden="true" />
  ) : (
    <ArrowDown className="size-3.5" aria-hidden="true" />
  );
}

export function DealsTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  onOpenDeal,
}: DealsTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-subtle">
      <div className="max-h-[38rem] overflow-auto scroll-slim">
        <Table className="min-w-[68rem] border-separate border-spacing-0">
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="border-b border-border bg-muted hover:bg-muted">
              {COLUMNS.map((column) => {
                const active = sortKey === column.key;
                return (
                  <TableHead
                    key={column.key}
                    scope="col"
                    aria-sort={
                      active
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className={cn(
                      "h-11 bg-muted px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
                      column.align === "right" && "text-right",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSort(column.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-sm transition-smooth hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                        column.align === "right" && "flex-row-reverse",
                        active && "text-foreground",
                      )}
                      data-ocid={`deals.sort.${column.key}`}
                    >
                      {column.label}
                      <SortIcon active={active} dir={sortDir} />
                    </button>
                  </TableHead>
                );
              })}
              <TableHead
                scope="col"
                className="h-11 bg-muted px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
              >
                Risk level
              </TableHead>
              <TableHead
                scope="col"
                className="h-11 bg-muted px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
              >
                Top risk reason
              </TableHead>
              <TableHead
                scope="col"
                className="h-11 bg-muted px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
              >
                Recommended action
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map(({ deal, risk }, index) => {
              const score = risk ? clampRiskScore(risk.score) : null;
              return (
                <TableRow
                  key={deal.id.toString()}
                  tabIndex={0}
                  onClick={() => onOpenDeal(deal.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpenDeal(deal.id);
                    }
                  }}
                  className="cursor-pointer border-b border-border/70 transition-smooth hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none"
                  data-ocid={`deals.row.${index + 1}`}
                >
                  <TableCell className="max-w-[16rem] px-4 py-4 align-top">
                    <span className="block truncate font-medium text-foreground">
                      {deal.name}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[12rem] px-4 py-4 align-top">
                    <span className="block truncate text-muted-foreground">
                      {deal.account}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-4 align-top text-muted-foreground">
                    {deal.owner}
                  </TableCell>
                  <TableCell
                    className="px-4 py-4 text-right align-top font-mono tabular-nums text-foreground"
                    data-numeric
                  >
                    {formatCurrency(deal.amount)}
                  </TableCell>
                  <TableCell
                    className="px-4 py-4 text-right align-top"
                    data-ocid={`deals.rep_estimate.${index + 1}`}
                  >
                    {deal.repEstimate === undefined ? (
                      <span className="text-xs italic text-muted-foreground">
                        Unestimated
                      </span>
                    ) : (
                      <span
                        className="font-mono tabular-nums text-foreground"
                        data-numeric
                      >
                        {formatCurrency(deal.repEstimate)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-4 align-top text-muted-foreground">
                    {stageLabel(deal.stage)}
                  </TableCell>
                  <TableCell
                    className="px-4 py-4 align-top font-mono tabular-nums text-muted-foreground"
                    data-numeric
                  >
                    {formatDate(deal.expectedCloseDate)}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-right align-top">
                    <span
                      className="font-display text-base font-semibold tabular-nums text-foreground"
                      data-numeric
                    >
                      {score === null ? "—" : Math.round(score)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-4 align-top">
                    <RiskChip bucket={risk?.bucket} id={deal.id.toString()} />
                  </TableCell>
                  <TableCell className="max-w-[20rem] px-4 py-4 align-top">
                    <span className="block text-sm leading-relaxed text-foreground">
                      {risk?.topReason ?? "Risk assessment pending."}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[20rem] px-4 py-4 align-top">
                    <span className="block text-sm leading-relaxed text-muted-foreground">
                      {risk?.recommendedAction ?? "—"}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
