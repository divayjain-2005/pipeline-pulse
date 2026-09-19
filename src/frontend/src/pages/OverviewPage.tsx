/**
 * OverviewPage — the leadership dashboard.
 *
 * Leads with the weighted forecast and its confidence range, then the
 * supporting KPIs, the baseline comparison, the four charts, and the LLM
 * reasoning panel. Every query has loading, empty, and error handling.
 */

import { Layout } from "@/components/Layout";
import { BacktestPanel } from "@/components/overview/BacktestPanel";
import { BaselinePanel } from "@/components/overview/BaselinePanel";
import {
  HeroForecastCard,
  SecondaryKpiGrid,
} from "@/components/overview/KpiCards";
import {
  BaselineChart,
  OwnerChart,
  RiskChart,
  StageChart,
} from "@/components/overview/OverviewCharts";
import {
  PanelError,
  PanelSkeleton,
} from "@/components/overview/OverviewStates";
import { RationalePanel } from "@/components/overview/RationalePanel";
import { Button } from "@/components/ui/button";
import {
  useBacktest,
  useDealRisks,
  useDeals,
  useForecast,
  useGenerateForecastRationale,
} from "@/hooks/use-pipeline";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { RiskBucket, isOpenStage, resultErrorMessage } from "@/lib/pipeline";
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

function quarterLabel(date: Date): string {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter} ${date.getFullYear()}`;
}

export default function OverviewPage() {
  const forecastQuery = useForecast();
  const dealsQuery = useDeals();
  const risksQuery = useDealRisks();
  const backtestQuery = useBacktest();
  const rationaleMutation = useGenerateForecastRationale();

  const [rationaleError, setRationaleError] = useState<string | null>(null);

  const forecast = forecastQuery.data;
  const deals = dealsQuery.data ?? [];
  const risks = risksQuery.data ?? [];

  const derived = useMemo(() => {
    const openDeals = deals.filter((deal) => isOpenStage(deal.stage));
    // The naive baseline: every open deal counted at full value. The
    // probability-adjusted figure is forecast.mostLikely, rendered separately.
    const naivePipeline = openDeals.reduce(
      (sum, deal) => sum + deal.amount,
      0n,
    );

    const highRiskIds = new Set(
      risks
        .filter((risk) => risk.bucket === RiskBucket.high)
        .map((risk) => risk.dealId.toString()),
    );
    const atRiskDeals = openDeals.filter((deal) =>
      highRiskIds.has(deal.id.toString()),
    );
    const atRiskValue = atRiskDeals.reduce(
      (sum, deal) => sum + deal.amount,
      0n,
    );

    return {
      openDealCount: openDeals.length,
      naivePipeline,
      atRiskValue,
      atRiskDealCount: atRiskDeals.length,
    };
  }, [deals, risks]);

  const isLoading = forecastQuery.isLoading || dealsQuery.isLoading;
  const isError = forecastQuery.isError || dealsQuery.isError;

  const retryAll = () => {
    void forecastQuery.refetch();
    void dealsQuery.refetch();
    void risksQuery.refetch();
    void backtestQuery.refetch();
  };

  function handleGenerateRationale() {
    setRationaleError(null);
    rationaleMutation.mutate(undefined, {
      onSuccess: (result) => {
        const message = resultErrorMessage(result);
        if (message) setRationaleError(message);
      },
      onError: (error) => {
        setRationaleError(
          error instanceof Error
            ? error.message
            : "The reasoning could not be generated. Please try again.",
        );
      },
    });
  }

  const subtitle = forecast
    ? `Forecast computed ${formatDateTime(forecast.computedAt)}`
    : undefined;

  return (
    <Layout
      title="Overview"
      subtitle={subtitle}
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={retryAll}
          disabled={forecastQuery.isFetching}
          className="rounded-md"
          data-ocid="overview.refresh_button"
        >
          <RefreshCw
            className={
              forecastQuery.isFetching ? "size-3.5 animate-spin" : "size-3.5"
            }
            aria-hidden="true"
          />
          Refresh
        </Button>
      }
    >
      <div className="space-y-6" data-ocid="overview.page">
        {isError && !forecast ? (
          <PanelError
            message="The forecast could not be loaded. Check the connection and try again."
            onRetry={retryAll}
            ocid="overview.error_state"
          />
        ) : isLoading || !forecast ? (
          <div
            className="rounded-lg border border-border bg-card p-6 shadow-subtle lg:p-8"
            data-ocid="overview.loading_state"
          >
            <PanelSkeleton rows={6} />
          </div>
        ) : (
          <>
            <HeroForecastCard
              quarterLabel={quarterLabel(new Date(Number(forecast.computedAt)))}
              mostLikely={forecast.mostLikely}
              low={forecast.low}
              high={forecast.high}
              confidenceLabel={forecast.confidenceLabel}
              baseline={forecast.naivePipeline}
              footnote={`Range spans ${formatCurrency(
                forecast.low,
              )} to ${formatCurrency(forecast.high)}. ${forecast.rangeBasis}`}
            />

            <SecondaryKpiGrid
              weightedPipeline={forecast.mostLikely}
              naivePipeline={derived.naivePipeline}
              atRiskValue={derived.atRiskValue}
              dealCount={BigInt(deals.length)}
              openDealCount={BigInt(derived.openDealCount)}
              atRiskDealCount={BigInt(derived.atRiskDealCount)}
            />

            <BaselinePanel
              mostLikely={forecast.mostLikely}
              naivePipeline={forecast.naivePipeline}
              repCommitEstimate={forecast.repCommitEstimate}
              rangeBasis={forecast.rangeBasis}
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <StageChart
                byStage={forecast.byStage}
                isLoading={forecastQuery.isLoading}
                isError={forecastQuery.isError}
                onRetry={() => void forecastQuery.refetch()}
              />
              <BaselineChart
                mostLikely={forecast.mostLikely}
                naivePipeline={forecast.naivePipeline}
                repCommitEstimate={forecast.repCommitEstimate}
                isLoading={forecastQuery.isLoading}
                isError={forecastQuery.isError}
                onRetry={() => void forecastQuery.refetch()}
              />
              <RiskChart
                byRiskBucket={forecast.byRiskBucket}
                isLoading={forecastQuery.isLoading}
                isError={forecastQuery.isError}
                onRetry={() => void forecastQuery.refetch()}
              />
              <OwnerChart
                byOwner={forecast.byOwner}
                isLoading={forecastQuery.isLoading}
                isError={forecastQuery.isError}
                onRetry={() => void forecastQuery.refetch()}
              />
            </div>

            <RationalePanel
              rationale={forecast.rationale}
              rationaleGeneratedAt={forecast.rationaleGeneratedAt}
              isPending={rationaleMutation.isPending}
              errorMessage={rationaleError}
              onGenerate={handleGenerateRationale}
            />

            <BacktestPanel
              result={backtestQuery.data}
              isLoading={backtestQuery.isLoading}
              isError={backtestQuery.isError}
              onRetry={() => void backtestQuery.refetch()}
            />
          </>
        )}
      </div>
    </Layout>
  );
}
