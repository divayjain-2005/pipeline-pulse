import List "mo:core/List";
import Types "../types/pipeline";
import BacktestTypes "../types/backtest";
import BacktestLib "../lib/backtest";
import PipelineStats "pipeline-stats";

/// Public API surface for the backtest panel. Read-only: the backtest is
/// recomputed from the stored closed history and the deterministic historical
/// open-pipeline snapshots on every call.
mixin (
  closedHistory : List.List<Types.Deal>,
  baselineDeals : List.List<Types.Deal>,
) {
  public query func getBacktest() : async BacktestTypes.BacktestResult {
    let history = closedHistory.toArray();
    let baseline = PipelineStats.buildBaseline(baselineDeals.toArray());
    BacktestLib.runBacktest(history, baseline, PipelineStats.nowMs());
  };
};
