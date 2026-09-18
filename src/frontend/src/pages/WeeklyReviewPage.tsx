/**
 * WeeklyReviewPage — manager triage view.
 *
 * Joins `listDeals()` with `listDealRisks()` by dealId, keeps the deals that
 * need attention this week (High bucket first, then Medium), and orders them
 * by risk score descending. Each entry is a triage card with the specific top
 * risk reason and a concrete recommended next action.
 */

import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WeeklyTriageCard } from "@/components/weekly/WeeklyTriageCard";
import {
  useDealRisks,
  useDeals,
  useGenerateDealReasoning,
} from "@/hooks/use-pipeline";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import {
  type Deal,
  type DealRisk,
  RiskBucket,
  byRiskDesc,
  pipelineErrorMessage,
} from "@/lib/pipeline";
import {
  AlertCircle,
  CalendarCheck,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useMemo, useState } from "react";

/** Deals that need attention: High first, then Medium. */
const ATTENTION_BUCKETS: RiskBucket[] = [RiskBucket.high, RiskBucket.medium];

interface TriageEntry {
  deal: Deal;
  risk: DealRisk;
}

function buildTriageList(deals: Deal[], risks: DealRisk[]): TriageEntry[] {
  const dealsById = new Map(deals.map((deal) => [deal.id.toString(), deal]));
  return risks
    .filter((risk) => ATTENTION_BUCKETS.includes(risk.bucket))
    .map((risk) => {
      const deal = dealsById.get(risk.dealId.toString());
      return deal ? { deal, risk } : null;
    })
    .filter((entry): entry is TriageEntry => entry !== null)
    .sort((a, b) =>
      byRiskDesc(
        { score: a.risk.score, amount: a.deal.amount },
        { score: b.risk.score, amount: b.deal.amount },
      ),
    );
}

function SummaryStat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof ShieldAlert;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-subtle">
      <div className="flex items-center justify-between gap-3">
        <p className="label-section">{label}</p>
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p
        className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground"
        data-numeric
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function TriageSkeleton() {
  return (
    <div className="space-y-4" data-ocid="weekly.loading_state">
      {Array.from({ length: 3 }, (_, i) => `weekly-skeleton-${i}`).map((id) => (
        <div key={id} className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <Skeleton className="size-7 rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
            {Array.from(
              { length: 4 },
              (_, i) => `weekly-skeleton-stat-${i}`,
            ).map((statId) => (
              <div key={statId} className="space-y-2">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-4 h-16 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

export default function WeeklyReviewPage() {
  const dealsQuery = useDeals();
  const risksQuery = useDealRisks();
  const generateReasoning = useGenerateDealReasoning();

  const [pendingDealId, setPendingDealId] = useState<string | null>(null);
  const [failedDealId, setFailedDealId] = useState<string | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);

  const entries = useMemo(
    () => buildTriageList(dealsQuery.data ?? [], risksQuery.data ?? []),
    [dealsQuery.data, risksQuery.data],
  );

  const summary = useMemo(() => {
    const totalValue = entries.reduce(
      (sum, entry) => sum + entry.deal.amount,
      0n,
    );
    const highCount = entries.filter(
      (entry) => entry.risk.bucket === RiskBucket.high,
    ).length;
    return { count: entries.length, totalValue, highCount };
  }, [entries]);

  const isLoading = dealsQuery.isLoading || risksQuery.isLoading;
  const isError = dealsQuery.isError || risksQuery.isError;
  const errorMessage =
    (dealsQuery.error instanceof Error && dealsQuery.error.message) ||
    (risksQuery.error instanceof Error && risksQuery.error.message) ||
    "The pipeline could not be loaded.";

  function handleRunAnalysis(dealId: bigint) {
    const key = dealId.toString();
    setPendingDealId(key);
    setFailedDealId(null);
    setFailureMessage(null);
    generateReasoning.mutate(dealId, {
      onSuccess: (result) => {
        setPendingDealId(null);
        if (result.__kind__ === "err") {
          setFailedDealId(key);
          setFailureMessage(pipelineErrorMessage(result.err));
        }
      },
      onError: (error) => {
        setPendingDealId(null);
        setFailedDealId(key);
        setFailureMessage(
          error instanceof Error
            ? error.message
            : "The analysis could not be generated.",
        );
      },
    });
  }

  function refetchAll() {
    void dealsQuery.refetch();
    void risksQuery.refetch();
  }

  return (
    <Layout
      title="Weekly Review"
      subtitle="Highest-risk deals to work this week, with the next action for each"
    >
      <div className="space-y-6" data-ocid="weekly.page">
        {isLoading ? (
          <TriageSkeleton />
        ) : isError ? (
          <div
            className="rounded-lg border border-destructive/30 bg-destructive/[0.06] p-8"
            role="alert"
            data-ocid="weekly.error_state"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className="mt-0.5 size-5 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-display text-base font-semibold text-foreground">
                  We couldn't load the weekly review
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {errorMessage}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={refetchAll}
                  className="mt-4 rounded-md"
                  data-ocid="weekly.retry_button"
                >
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Try again
                </Button>
              </div>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div
            className="rounded-lg border border-border bg-card p-10 text-center shadow-subtle"
            data-ocid="weekly.empty_state"
          >
            <span
              className="mx-auto flex size-11 items-center justify-center rounded-full border border-success/30 bg-success/10 text-success"
              aria-hidden="true"
            >
              <CalendarCheck className="size-5" />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold tracking-tight text-foreground">
              Nothing at risk this week
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
              No open deals are scoring High or Medium risk. The pipeline is
              healthy — check back after the next activity sync.
            </p>
          </div>
        ) : (
          <>
            <section
              className="grid gap-4 sm:grid-cols-3"
              aria-label="Weekly review summary"
              data-ocid="weekly.summary"
            >
              <SummaryStat
                label="Deals needing attention"
                value={String(summary.count)}
                hint="High and Medium risk, open pipeline"
                icon={ShieldAlert}
              />
              <SummaryStat
                label="Combined value"
                value={formatCurrencyCompact(summary.totalValue)}
                hint={formatCurrency(summary.totalValue)}
                icon={CalendarCheck}
              />
              <SummaryStat
                label="High risk"
                value={String(summary.highCount)}
                hint="Escalate these first"
                icon={AlertCircle}
              />
            </section>

            <section aria-label="Prioritized triage list" className="space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-sm font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                  This week's priority list
                </h2>
                <p className="text-xs text-muted-foreground">
                  Ordered by risk score, highest first
                </p>
              </div>

              <div className="space-y-4" data-ocid="weekly.list">
                {entries.map((entry, index) => {
                  const key = entry.deal.id.toString();
                  return (
                    <WeeklyTriageCard
                      key={key}
                      deal={entry.deal}
                      risk={entry.risk}
                      rank={index + 1}
                      isGenerating={pendingDealId === key}
                      generateError={
                        failedDealId === key
                          ? (failureMessage ??
                            "The analysis could not be generated.")
                          : undefined
                      }
                      onRunAnalysis={() => handleRunAnalysis(entry.deal.id)}
                    />
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
