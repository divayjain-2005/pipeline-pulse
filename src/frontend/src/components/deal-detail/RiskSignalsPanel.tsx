/**
 * RiskSignalsPanel — full transparency into how the risk score is composed.
 *
 * Every contributing signal is listed with its caption, human-readable detail,
 * weight, and contribution. A footer reconciles the contributions against the
 * final score so leadership can see the arithmetic, not just the verdict.
 */

import { formatNumber } from "@/lib/format";
import type { DealRisk, RiskSignal } from "@/lib/pipeline";
import { cn } from "@/lib/utils";
import { SlidersHorizontal } from "lucide-react";

export interface RiskSignalsPanelProps {
  risk: DealRisk | null | undefined;
}

function SignalRow({ signal, index }: { signal: RiskSignal; index: number }) {
  const contribution = Math.max(0, signal.contribution);
  // Backend weights are already on a 0-100 scale (22.0 means 22%).
  const weightPct = Math.min(100, Math.max(0, signal.weight));

  return (
    <li
      className="border-t border-border px-4 py-3.5 first:border-t-0"
      data-ocid={`deal_detail.signal.item.${index + 1}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {signal.caption}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {signal.detail}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-right">
          <div>
            <p className="label-section">Weight</p>
            <p
              className="mt-0.5 font-mono text-sm text-foreground"
              data-numeric
            >
              {formatNumber(Math.round(signal.weight))}%
            </p>
          </div>
          <div>
            <p className="label-section">Contribution</p>
            <p
              className="mt-0.5 font-mono text-sm font-semibold text-foreground"
              data-numeric
            >
              +{formatNumber(Math.round(contribution))}
            </p>
          </div>
        </div>
      </div>

      <div
        className="mt-2.5 h-1 w-full overflow-hidden rounded-full rail-track"
        role="img"
        aria-label={`${signal.caption} weight ${Math.round(
          signal.weight,
        )} percent`}
      >
        <div
          className="h-full rounded-full bg-primary/70"
          style={{ width: `${weightPct}%` }}
        />
      </div>
    </li>
  );
}

export function RiskSignalsPanel({ risk }: RiskSignalsPanelProps) {
  const signals = risk?.signals ?? [];
  const totalContribution = signals.reduce(
    (sum, signal) => sum + Math.max(0, signal.contribution),
    0,
  );

  return (
    <section
      className="rounded-lg border border-border bg-card shadow-subtle"
      aria-label="Contributing risk signals"
      data-ocid="deal_detail.signals_panel"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <h3 className="font-display text-sm font-semibold text-foreground">
            Contributing signals
          </h3>
        </div>
        <span className="font-mono text-xs text-muted-foreground" data-numeric>
          {signals.length} {signals.length === 1 ? "signal" : "signals"}
        </span>
      </header>

      {signals.length === 0 ? (
        <div
          className="px-4 py-8 text-center"
          data-ocid="deal_detail.signals_panel.empty_state"
        >
          <p className="text-sm text-muted-foreground">
            No risk signals are recorded for this deal yet. Run the risk
            analysis to compute them.
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y-0">
            {signals.map((signal, index) => (
              <SignalRow
                key={`${signal.code}-${index}`}
                signal={signal}
                index={index}
              />
            ))}
          </ul>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Contributions sum to the risk score
            </p>
            <p className="font-mono text-sm text-foreground" data-numeric>
              <span className="text-muted-foreground">Σ </span>
              {formatNumber(Math.round(totalContribution))}
              <span className="text-muted-foreground"> / 100</span>
            </p>
          </footer>
        </>
      )}
    </section>
  );
}
