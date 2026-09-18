/**
 * DealsPage — ranked at-risk deal ledger.
 *
 * Joins `listDeals()` with `listDealRisks()` by deal id, ranks by risk score,
 * and exposes stage / owner / bucket / amount filters plus column sorting.
 * All filter and sort state lives in the URL search params so a refresh or a
 * shared link restores the exact view.
 */

import { Layout } from "@/components/Layout";
import { AddDealDialog } from "@/components/deals/AddDealDialog";
import { DealsFilterBar } from "@/components/deals/DealsFilterBar";
import { DealsSummaryStrip } from "@/components/deals/DealsSummaryStrip";
import type { BucketSummary } from "@/components/deals/DealsSummaryStrip";
import { DealsTable } from "@/components/deals/DealsTable";
import type { DealRow, SortKey } from "@/components/deals/DealsTable";
import { ResetSampleDataDialog } from "@/components/deals/ResetSampleDataDialog";
import {
  type DealsSearch,
  parseAmount,
  parseBucket,
  parseSortDir,
  parseSortKey,
  parseStage,
  sortRows,
} from "@/components/deals/deals-search";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import {
  useCreateDeal,
  useDealRisks,
  useDeals,
  useResetSampleData,
} from "@/hooks/use-pipeline";
import { formatCurrencyCompact } from "@/lib/format";
import {
  type Deal,
  type DealRisk,
  OPEN_STAGES,
  RISK_ORDER,
  isOpenStage,
  resultErrorMessage,
} from "@/lib/pipeline";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { AlertTriangle, Inbox, Plus, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function DealsPage() {
  const navigate = useNavigate();
  const rawSearch = useSearch({ strict: false }) as DealsSearch;

  const stage = parseStage(rawSearch.stage);
  const owner =
    typeof rawSearch.owner === "string" ? rawSearch.owner : undefined;
  const bucket = parseBucket(rawSearch.bucket);
  const minAmount = parseAmount(rawSearch.min);
  const maxAmount = parseAmount(rawSearch.max);
  const sortKey = parseSortKey(rawSearch.sort);
  const sortDir = parseSortDir(rawSearch.dir);

  const [confirmReset, setConfirmReset] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const dealsQuery = useDeals();
  const risksQuery = useDealRisks();
  const resetMutation = useResetSampleData();
  const createMutation = useCreateDeal();

  const deals = dealsQuery.data ?? [];
  const risks = risksQuery.data ?? [];

  const isLoading = dealsQuery.isLoading || risksQuery.isLoading;
  const isError = dealsQuery.isError || risksQuery.isError;

  /** Write a partial search patch, dropping cleared keys. */
  function patchSearch(patch: DealsSearch) {
    void navigate({
      to: "/deals",
      search: (prev: Record<string, unknown>) => {
        const next: Record<string, unknown> = { ...prev };
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined || value === null || value === "") {
            delete next[key];
          } else {
            next[key] = value;
          }
        }
        return next;
      },
      replace: true,
    });
  }

  const owners = useMemo(
    () => Array.from(new Set(deals.map((deal) => deal.owner))).sort(),
    [deals],
  );

  const rows = useMemo<DealRow[]>(() => {
    const riskByDeal = new Map<string, DealRisk>(
      risks.map((risk) => [risk.dealId.toString(), risk]),
    );
    const min = minAmount === undefined ? null : Number(minAmount);
    const max = maxAmount === undefined ? null : Number(maxAmount);

    const joined: DealRow[] = deals.map((deal: Deal) => ({
      deal,
      risk: riskByDeal.get(deal.id.toString()) ?? null,
    }));

    const filtered = joined.filter(({ deal, risk }) => {
      // Default to open stages: closed deals have no risk record and would
      // otherwise sit at the bottom of a risk-ranked ledger. Selecting a
      // stage explicitly (including a closed one) overrides the default.
      if (stage) {
        if (deal.stage !== stage) return false;
      } else if (!isOpenStage(deal.stage)) {
        return false;
      }
      if (owner && deal.owner !== owner) return false;
      if (bucket && risk?.bucket !== bucket) return false;
      const amount = Number(deal.amount);
      if (min !== null && amount < min) return false;
      if (max !== null && amount > max) return false;
      return true;
    });

    return sortRows(filtered, sortKey, sortDir);
  }, [
    deals,
    risks,
    stage,
    owner,
    bucket,
    minAmount,
    maxAmount,
    sortKey,
    sortDir,
  ]);

  const summaries = useMemo<BucketSummary[]>(
    () =>
      RISK_ORDER.map((riskBucket) => {
        const matching = rows.filter((row) => row.risk?.bucket === riskBucket);
        return {
          bucket: riskBucket,
          count: matching.length,
          totalValue: matching.reduce((sum, row) => sum + row.deal.amount, 0n),
        };
      }),
    [rows],
  );

  const totalValue = useMemo(
    () => rows.reduce((sum, row) => sum + row.deal.amount, 0n),
    [rows],
  );

  const hasActiveFilters =
    stage !== undefined ||
    owner !== undefined ||
    bucket !== undefined ||
    minAmount !== undefined ||
    maxAmount !== undefined;

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      patchSearch({ sort: key, dir: sortDir === "asc" ? "desc" : "asc" });
    } else {
      patchSearch({ sort: key, dir: key === "risk" ? "desc" : "asc" });
    }
  }

  function handleClearFilters() {
    patchSearch({
      stage: undefined,
      owner: undefined,
      bucket: undefined,
      min: undefined,
      max: undefined,
    });
  }

  function handleOpenDeal(dealId: bigint) {
    void navigate({
      to: "/deals/$dealId",
      params: { dealId: dealId.toString() },
    });
  }

  function handleReset() {
    resetMutation.mutate(undefined, {
      onSuccess: (result) => {
        const message = resultErrorMessage(result);
        if (message) {
          toast.error("Could not reset sample data", {
            description: message,
          });
          return;
        }
        toast.success("Sample pipeline restored", {
          description:
            "The synthetic CRM dataset has been regenerated with fresh risk scores.",
        });
      },
      onError: (error) => {
        toast.error("Could not reset sample data", {
          description:
            error instanceof Error
              ? error.message
              : "The backend rejected the request. Please try again.",
        });
      },
    });
  }

  function handleAddDeal(deal: Deal) {
    setAddError(null);
    createMutation.mutate(deal, {
      onSuccess: (result) => {
        const message = resultErrorMessage(result);
        if (message) {
          setAddError(message);
          return;
        }
        setAddOpen(false);
        toast.success("Deal added", {
          description: `${deal.name} is now in the pipeline and will be scored on the next refresh.`,
        });
      },
      onError: (error) => {
        setAddError(
          error instanceof Error
            ? error.message
            : "The backend rejected the request. Please try again.",
        );
      },
    });
  }

  return (
    <Layout
      title="At-Risk Deals"
      subtitle="Ranked by risk score · click any deal to open its detail view"
      actions={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirmReset(true)}
            disabled={resetMutation.isPending}
            className="rounded-md"
            data-ocid="deals.reset_button"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {resetMutation.isPending ? "Resetting…" : "Reset to sample data"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setAddError(null);
              setAddOpen(true);
            }}
            className="rounded-md"
            data-ocid="deals.add_button"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Add deal
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5" data-ocid="deals.page">
        {isError ? (
          <div
            className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6"
            data-ocid="deals.error_state"
          >
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
              <p className="font-display text-sm font-semibold">
                Could not load the pipeline
              </p>
            </div>
            <p className="max-w-prose text-sm text-muted-foreground">
              The risk model did not respond. Check your connection and try
              again — no data has been changed.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-md"
              onClick={() => {
                void dealsQuery.refetch();
                void risksQuery.refetch();
              }}
              data-ocid="deals.retry_button"
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            {isLoading ? (
              <div
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
                data-ocid="deals.loading_state"
              >
                {Array.from(
                  { length: 4 },
                  (_, i) => `summary-skeleton-${i}`,
                ).map((id) => (
                  <Skeleton key={id} className="h-28 rounded-lg" />
                ))}
              </div>
            ) : (
              <DealsSummaryStrip
                summaries={summaries}
                totalCount={rows.length}
                totalValue={totalValue}
              />
            )}

            <DealsFilterBar
              stage={stage ?? null}
              owner={owner ?? null}
              bucket={bucket ?? null}
              minAmount={minAmount ?? ""}
              maxAmount={maxAmount ?? ""}
              owners={owners}
              onStageChange={(value) =>
                patchSearch({ stage: value ?? undefined })
              }
              onOwnerChange={(value) =>
                patchSearch({ owner: value ?? undefined })
              }
              onBucketChange={(value) =>
                patchSearch({ bucket: value ?? undefined })
              }
              onMinAmountChange={(value) =>
                patchSearch({ min: value.trim() === "" ? undefined : value })
              }
              onMaxAmountChange={(value) =>
                patchSearch({ max: value.trim() === "" ? undefined : value })
              }
              onClear={handleClearFilters}
              hasActiveFilters={hasActiveFilters}
            />

            {isLoading ? (
              <div
                className="overflow-hidden rounded-lg border border-border bg-card shadow-subtle"
                data-ocid="deals.table_loading"
              >
                <div className="border-b border-border bg-muted px-4 py-3">
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="flex flex-col gap-3 p-4">
                  {Array.from({ length: 8 }, (_, i) => `row-skeleton-${i}`).map(
                    (id) => (
                      <Skeleton key={id} className="h-10 w-full" />
                    ),
                  )}
                </div>
              </div>
            ) : rows.length === 0 ? (
              <div
                className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center"
                data-ocid="deals.empty_state"
              >
                <span
                  className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground"
                  aria-hidden="true"
                >
                  <Inbox className="size-5" />
                </span>
                <p className="font-display text-base font-semibold text-foreground">
                  No deals match these filters
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? "Widen the amount range or clear a filter to bring deals back into view."
                    : "No open deals are in the pipeline. Add a deal or reset to sample data to load the synthetic CRM dataset."}
                </p>
                {hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-md"
                    onClick={handleClearFilters}
                    data-ocid="deals.empty_clear_button"
                  >
                    Clear filters
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-md"
                      onClick={() => {
                        setAddError(null);
                        setAddOpen(true);
                      }}
                      data-ocid="deals.empty_add_button"
                    >
                      <Plus className="size-3.5" aria-hidden="true" />
                      Add deal
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-md"
                      onClick={() => setConfirmReset(true)}
                      data-ocid="deals.empty_reset_button"
                    >
                      Reset to sample data
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <DealsTable
                  rows={rows}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  onOpenDeal={handleOpenDeal}
                />
                <p className="text-xs text-muted-foreground">
                  Showing {rows.length} of {deals.length} deals ·{" "}
                  {formatCurrencyCompact(totalValue)} open value in view
                </p>
              </>
            )}
          </>
        )}
      </div>

      <ResetSampleDataDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        onConfirm={handleReset}
      />

      <AddDealDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        isSaving={createMutation.isPending}
        errorMessage={addError}
        onSubmit={handleAddDeal}
      />

      <Toaster position="bottom-right" richColors closeButton />
    </Layout>
  );
}
