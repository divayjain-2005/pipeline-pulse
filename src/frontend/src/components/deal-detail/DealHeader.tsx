/**
 * DealHeader — identity and headline facts for a single deal.
 *
 * Left: name, account, owner, stage chip, amount, expected close date.
 * Right: the risk score rendered as a large numeral with its bucket chip and a
 * thin score bar, so the number and its severity read together.
 */

import { RiskChip } from "@/components/deals/RiskChip";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  type Deal,
  type DealRisk,
  clampRiskScore,
  riskChipClass,
  stageLabel,
} from "@/lib/pipeline";
import { cn } from "@/lib/utils";
import { Building2, CalendarClock, UserRound } from "lucide-react";

export interface DealHeaderProps {
  deal: Deal;
  risk: DealRisk | null | undefined;
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon
        className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="label-section">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

export function DealHeader({ deal, risk }: DealHeaderProps) {
  const score = risk ? clampRiskScore(risk.score) : null;

  return (
    <section
      className="rounded-lg border border-border bg-card p-5 shadow-subtle lg:p-6"
      aria-label="Deal summary"
      data-ocid="deal_detail.header"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center rounded-[4px] border border-border bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-secondary-foreground"
              data-ocid="deal_detail.stage_chip"
            >
              {stageLabel(deal.stage)}
            </span>
            <span
              className="font-mono text-[11px] text-muted-foreground"
              data-numeric
            >
              DEAL #{deal.id.toString()}
            </span>
          </div>

          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
            {deal.name}
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Fact icon={Building2} label="Account" value={deal.account} />
            <Fact icon={UserRound} label="Owner" value={deal.owner} />
            <Fact
              icon={CalendarClock}
              label="Expected close"
              value={formatDate(deal.expectedCloseDate)}
            />
            <div className="flex items-start gap-2">
              <span
                className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="label-section">Amount</p>
                <p
                  className="mt-0.5 truncate font-mono text-sm font-semibold text-foreground"
                  data-numeric
                >
                  {formatCurrency(deal.amount)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="w-full shrink-0 rounded-md border border-border bg-background p-4 lg:w-56"
          data-ocid="deal_detail.risk_score"
        >
          <p className="label-section">Risk score</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span
              className="font-display text-4xl font-semibold leading-none tabular-nums text-foreground"
              data-numeric
            >
              {score === null ? "—" : Math.round(score)}
            </span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
          <div className="mt-3">
            <RiskChip bucket={risk?.bucket} />
          </div>
          <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full rail-track"
            role="img"
            aria-label={
              score === null
                ? "Risk score unavailable"
                : `Risk score ${Math.round(score)} out of 100`
            }
          >
            <div
              className={cn(
                "h-full rounded-full transition-smooth",
                risk ? riskChipClass(risk.bucket) : "signal-low",
              )}
              style={{ width: `${score ?? 0}%` }}
            />
          </div>
          {risk?.topReason && (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {risk.topReason}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
