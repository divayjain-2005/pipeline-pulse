/**
 * OverviewCharts — the four recharts panels on the leadership dashboard.
 *
 * All series colors come from the chart tokens in index.css; risk buckets use
 * RISK_CHART_COLOR so the risk ramp stays consistent with the rest of the app.
 */

import {
  PanelEmpty,
  PanelError,
  PanelSkeleton,
} from "@/components/overview/OverviewStates";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
} from "@/lib/format";
import {
  type ForecastBreakdown,
  RISK_CHART_COLOR,
  RISK_ORDER,
  type RiskBucket,
  STAGE_ORDER,
  riskLabel,
  stageLabel,
} from "@/lib/pipeline";
import { cn } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11 };
const GRID_STROKE = "var(--grid-line)";

const TOOLTIP_STYLE = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  fontSize: "12px",
  color: "var(--popover-foreground)",
} as const;

function ChartFrame({
  title,
  caption,
  children,
  ocid,
  className,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
  ocid: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card p-5 shadow-none",
        className,
      )}
      data-ocid={ocid}
    >
      <h2 className="font-display text-sm font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p>
      <div className="mt-4 h-64 w-full">{children}</div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Weighted pipeline by stage
--------------------------------------------------------------------------- */

export interface StageChartProps {
  byStage: ForecastBreakdown[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function StageChart({
  byStage,
  isLoading,
  isError,
  onRetry,
}: StageChartProps) {
  const data = STAGE_ORDER.map((stage) => {
    const row = byStage.find((entry) => entry.key === stage);
    return {
      stage: stageLabel(stage),
      weighted: Number(row?.weightedValue ?? 0n),
      total: Number(row?.totalValue ?? 0n),
    };
  }).filter((row) => row.total > 0);

  return (
    <ChartFrame
      title="Weighted pipeline by stage"
      caption="Probability-adjusted value at each open stage"
      ocid="overview.chart.stage"
    >
      {isLoading ? (
        <PanelSkeleton rows={5} />
      ) : isError ? (
        <PanelError
          message="Stage breakdown could not be loaded."
          onRetry={onRetry}
          ocid="overview.chart.stage.error_state"
        />
      ) : data.length === 0 ? (
        <PanelEmpty
          title="No open pipeline"
          description="Stage weighting appears once deals are in the pipeline."
          ocid="overview.chart.stage.empty_state"
        />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
          >
            <CartesianGrid
              horizontal={false}
              stroke={GRID_STROKE}
              strokeDasharray="3 3"
            />
            <XAxis
              type="number"
              tick={AXIS_TICK}
              tickFormatter={(value: number) => formatCurrencyCompact(value)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="stage"
              tick={AXIS_TICK}
              width={92}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === "weighted" ? "Weighted" : "Raw pipeline",
              ]}
            />
            <Bar
              dataKey="weighted"
              name="Weighted"
              fill="var(--chart-1)"
              radius={[0, 4, 4, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartFrame>
  );
}

/* ---------------------------------------------------------------------------
   Forecast vs baseline
--------------------------------------------------------------------------- */

export interface BaselineChartProps {
  mostLikely: bigint;
  naivePipeline: bigint;
  repCommitEstimate: bigint;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function BaselineChart({
  mostLikely,
  naivePipeline,
  repCommitEstimate,
  isLoading,
  isError,
  onRetry,
}: BaselineChartProps) {
  const data = [
    {
      name: "Weighted forecast",
      value: Number(mostLikely),
      fill: "var(--chart-1)",
    },
    {
      name: "Raw pipeline",
      value: Number(naivePipeline),
      fill: "var(--chart-5)",
    },
    {
      name: "Rep commit",
      value: Number(repCommitEstimate),
      fill: "var(--chart-2)",
    },
  ];

  return (
    <ChartFrame
      title="Forecast vs. baseline"
      caption="The model against simpler estimates of the same quarter"
      ocid="overview.chart.baseline"
    >
      {isLoading ? (
        <PanelSkeleton rows={5} />
      ) : isError ? (
        <PanelError
          message="Baseline comparison could not be loaded."
          onRetry={onRetry}
          ocid="overview.chart.baseline.error_state"
        />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
          >
            <CartesianGrid
              vertical={false}
              stroke={GRID_STROKE}
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="name"
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={AXIS_TICK}
              tickFormatter={(value: number) => formatCurrencyCompact(value)}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              formatter={(value: number) => [formatCurrency(value), "Value"]}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={64}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartFrame>
  );
}

/* ---------------------------------------------------------------------------
   Risk distribution
--------------------------------------------------------------------------- */

export interface RiskChartProps {
  byRiskBucket: ForecastBreakdown[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function RiskChart({
  byRiskBucket,
  isLoading,
  isError,
  onRetry,
}: RiskChartProps) {
  const data = RISK_ORDER.map((bucket: RiskBucket) => {
    const row = byRiskBucket.find((entry) => entry.key === bucket);
    return {
      bucket,
      name: riskLabel(bucket),
      value: Number(row?.totalValue ?? 0n),
      count: Number(row?.dealCount ?? 0n),
      fill: RISK_CHART_COLOR[bucket],
    };
  }).filter((row) => row.value > 0);

  const total = data.reduce((sum, row) => sum + row.value, 0);

  return (
    <ChartFrame
      title="Risk distribution"
      caption="Open pipeline value by risk bucket"
      ocid="overview.chart.risk"
    >
      {isLoading ? (
        <PanelSkeleton rows={5} />
      ) : isError ? (
        <PanelError
          message="Risk distribution could not be loaded."
          onRetry={onRetry}
          ocid="overview.chart.risk.error_state"
        />
      ) : data.length === 0 ? (
        <PanelEmpty
          title="No risk signals"
          description="Risk buckets populate once deals have been scored."
          ocid="overview.chart.risk.empty_state"
        />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="52%"
              outerRadius="78%"
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.bucket} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number, name: string) => [
                `${formatCurrency(value)} · ${formatNumber(
                  data.find((row) => row.name === name)?.count ?? 0,
                )} deals`,
                name,
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={28}
              formatter={(value: string) => {
                const row = data.find((entry) => entry.name === value);
                const share = row && total > 0 ? row.value / total : 0;
                return (
                  <span className="text-xs text-muted-foreground">
                    {value} · {Math.round(share * 100)}%
                  </span>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartFrame>
  );
}

/* ---------------------------------------------------------------------------
   Pipeline by owner
--------------------------------------------------------------------------- */

export interface OwnerChartProps {
  byOwner: ForecastBreakdown[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function OwnerChart({
  byOwner,
  isLoading,
  isError,
  onRetry,
}: OwnerChartProps) {
  const data = [...byOwner]
    .sort((a, b) => Number(b.weightedValue - a.weightedValue))
    .slice(0, 8)
    .map((row) => ({
      owner: row.key,
      weighted: Number(row.weightedValue),
      total: Number(row.totalValue),
    }));

  return (
    <ChartFrame
      title="Pipeline by owner"
      caption="Weighted value each rep is carrying this quarter"
      ocid="overview.chart.owner"
    >
      {isLoading ? (
        <PanelSkeleton rows={5} />
      ) : isError ? (
        <PanelError
          message="Owner breakdown could not be loaded."
          onRetry={onRetry}
          ocid="overview.chart.owner.error_state"
        />
      ) : data.length === 0 ? (
        <PanelEmpty
          title="No owner data"
          description="Owner weighting appears once deals are assigned."
          ocid="overview.chart.owner.empty_state"
        />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
          >
            <CartesianGrid
              horizontal={false}
              stroke={GRID_STROKE}
              strokeDasharray="3 3"
            />
            <XAxis
              type="number"
              tick={AXIS_TICK}
              tickFormatter={(value: number) => formatCurrencyCompact(value)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="owner"
              tick={AXIS_TICK}
              width={104}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              formatter={(value: number) => [formatCurrency(value), "Weighted"]}
            />
            <Bar
              dataKey="weighted"
              name="Weighted"
              fill="var(--chart-1)"
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartFrame>
  );
}
