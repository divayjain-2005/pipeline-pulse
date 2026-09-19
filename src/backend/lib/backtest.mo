import Float "mo:core/Float";
import Int "mo:core/Int";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Types "../types/pipeline";
import BacktestTypes "../types/backtest";
import PipelineStats "../mixins/pipeline-stats";
import SampleDeals "../seed/sample-deals";

/// Pure backtest logic. Runs the live forecast over each held-out quarter as of
/// that quarter's start and scores it against actual closed-won revenue, side by
/// side with the reps' own estimates. No state, no clock: `nowMs` is supplied.
///
/// The forecast is run over a reconstructed open snapshot — the open-stage
/// pipeline filtered to deals created by the quarter's start whose expected
/// close date had not yet passed — because `computeForecast` filters `isOpen`
/// internally and would otherwise see an empty pipeline.
module {
  let dayMs : Int = 86_400_000;

  /// Number of past completed quarters the backtest holds out. Fixed so the
  /// panel always averages over the same window.
  let holdoutCount : Nat = 6;

  // ---------------------------------------------------------------------------
  // Calendar quarters
  // ---------------------------------------------------------------------------

  /// Days since the Unix epoch for an epoch-millisecond timestamp. Negative
  /// timestamps clamp to zero; the seed never produces them.
  func daysSinceEpoch(ms : Int) : Int {
    if (ms <= 0) { 0 } else { ms / dayMs };
  };

  /// Civil date (year, month 1..12, day 1..31) for a day count since the Unix
  /// epoch, using Howard Hinnant's days-from-civil inverse. Pure integer math so
  /// the result is identical on every replica.
  func civilFromDays(z0 : Int) : (Int, Int, Int) {
    let z = z0 + 719_468;
    let era = (if (z >= 0) { z } else { z - 146_096 }) / 146_097;
    let doe = z - era * 146_097; // [0, 146096]
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365; // [0, 399]
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100); // [0, 365]
    let mp = (5 * doy + 2) / 153; // [0, 11]
    let d = doy - (153 * mp + 2) / 5 + 1; // [1, 31]
    let m = if (mp < 10) { mp + 3 } else { mp - 9 }; // [1, 12]
    (if (m <= 2) { y + 1 } else { y }, m, d);
  };

  /// Days since the Unix epoch for a civil date. Inverse of `civilFromDays`.
  func daysFromCivil(y0 : Int, m : Int, d : Int) : Int {
    let y = if (m <= 2) { y0 - 1 } else { y0 };
    let era = (if (y >= 0) { y } else { y - 399 }) / 400;
    let yoe = y - era * 400; // [0, 399]
    let mp = if (m > 2) { m - 3 } else { m + 9 }; // [0, 11]
    let doy = (153 * mp + 2) / 5 + d - 1; // [0, 365]
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy; // [0, 146096]
    era * 146_097 + doe - 719_468;
  };

  /// Epoch-millisecond start of the calendar quarter containing `ms`.
  func quarterStartMs(ms : Int) : Int {
    let (y, m, _) = civilFromDays(daysSinceEpoch(ms));
    let qStartMonth = ((m - 1) / 3) * 3 + 1;
    daysFromCivil(y, qStartMonth, 1) * dayMs;
  };

  /// Human label for the quarter containing `ms`, e.g. "2025 Q3".
  func quarterLabelOf(ms : Int) : Text {
    let (y, m, _) = civilFromDays(daysSinceEpoch(ms));
    y.toText() # " Q" # (((m - 1) / 3) + 1).toText();
  };

  /// Splits the closed history into the held-out quarters, most recent first.
  /// Each entry is (quarterLabel, startMs, endMs) with `endMs` exclusive.
  ///
  /// The most recent held-out quarter is the last **completed** calendar quarter
  /// before `nowMs`; the window then walks back `holdoutCount` quarters. Each
  /// window is derived from real calendar-quarter boundaries: the previous
  /// quarter's start is `quarterStartMs(end - 1)`, so no window collapses to a
  /// single day and no quarter's final day is dropped. The closed history is not
  /// consulted for the window itself — it only supplies the actual outcomes
  /// scored inside each quarter.
  public func holdoutQuarters(closedHistory : [Types.Deal], nowMs : Int) : [(Text, Int, Int)] {
    ignore closedHistory;
    let out = List.empty<(Text, Int, Int)>();
    var end = quarterStartMs(nowMs);
    var i = 0;
    while (i < holdoutCount) {
      let start = quarterStartMs(end - 1);
      out.add((quarterLabelOf(start), start, end));
      end := start;
      i += 1;
    };
    out.toArray();
  };

  // ---------------------------------------------------------------------------
  // Quarter scoring
  // ---------------------------------------------------------------------------

  /// The open pipeline as it stood at `startMs`, reconstructed deterministically
  /// for the held-out quarter at `quarterIndex` (0 = most recent). The live open
  /// pipeline is not used: its deals were all created within the last ~8 months,
  /// so it is empty for older quarters. `computeForecast` filters `isOpen`
  /// internally, so the snapshot must contain open-stage deals — passing
  /// terminal closed-history rows would yield an empty open set and a zero
  /// forecast.
  func openAt(quarterIndex : Nat, startMs : Int, nowMs : Int) : [Types.Deal] {
    SampleDeals.historicalOpenDeals(startMs, quarterIndex, nowMs);
  };

  /// Actual closed-won revenue for the quarter: closed-won deals whose close
  /// date falls inside [startMs, endMs).
  func actualWonIn(closedHistory : [Types.Deal], startMs : Int, endMs : Int) : Nat {
    closedHistory.filter(
      func(d) = d.stage == #closedWon and d.expectedCloseDate >= startMs and d.expectedCloseDate < endMs
    ).foldLeft(0, func(acc, d) = acc + d.amount);
  };

  /// Signed percentage error of `estimate` against `actual`, as a fraction
  /// (0.10 = 10% over). A zero actual yields 0.0 rather than a division trap.
  func errorPct(estimate : Nat, actual : Nat) : Float {
    if (actual == 0) { 0.0 } else {
      (estimate.toFloat() - actual.toFloat()) / actual.toFloat();
    };
  };

  /// Signed dollar delta of `estimate` against `actual`.
  func errorDelta(estimate : Nat, actual : Nat) : Int {
    estimate.toInt() - actual.toInt();
  };

  /// Scores one held-out quarter: model forecast vs actual closed-won revenue,
  /// and the sum of rep estimates vs the same actual.
  ///
  /// The open snapshot as of the quarter's start is generated deterministically
  /// for `quarterIndex` (0 = most recent held-out quarter), and the same
  /// `computeForecast` logic used for the live forecast is run over that
  /// snapshot with the quarter's start as `nowMs`.
  public func scoreQuarter(
    quarterLabel : Text,
    quarterIndex : Nat,
    startMs : Int,
    endMs : Int,
    closedHistory : [Types.Deal],
    baseline : Types.HistoricalBaseline,
    nowMs : Int,
  ) : BacktestTypes.BacktestQuarterRow {
    let openDeals = openAt(quarterIndex, startMs, nowMs);

    // The same forecast logic as the live forecast, applied to the pipeline as
    // it stood at the quarter's start.
    let forecast = PipelineStats.computeForecast(openDeals, baseline, startMs);
    let modelForecast = forecast.mostLikely;

    // Rep estimates for the deals that were open at the quarter's start.
    let estimated = openDeals.filter(func(d) = d.repEstimate != null);
    let repEstimateTotal = estimated.foldLeft(0, func(acc, d) = acc + (d.repEstimate ?? 0));

    let actualWon = actualWonIn(closedHistory, startMs, endMs);
    let wonDealCount = closedHistory.filter(
      func(d) = d.stage == #closedWon and d.expectedCloseDate >= startMs and d.expectedCloseDate < endMs
    ).size();

    {
      quarterLabel;
      quarterStart = startMs;
      quarterEnd = endMs;
      modelForecast;
      repEstimateTotal;
      actualWon;
      modelErrorPct = errorPct(modelForecast, actualWon);
      modelErrorDelta = errorDelta(modelForecast, actualWon);
      repErrorPct = errorPct(repEstimateTotal, actualWon);
      repErrorDelta = errorDelta(repEstimateTotal, actualWon);
      dealCount = openDeals.size();
      estimatedDealCount = estimated.size();
      wonDealCount;
    };
  };

  // ---------------------------------------------------------------------------
  // Full backtest
  // ---------------------------------------------------------------------------

  func absFloat(x : Float) : Float {
    if (x < 0.0) { -x } else { x };
  };

  /// Mean of the absolute per-quarter errors, as a fraction.
  func meanAbsError(rows : [BacktestTypes.BacktestQuarterRow], pick : BacktestTypes.BacktestQuarterRow -> Float) : Float {
    if (rows.size() == 0) { return 0.0 };
    let total = rows.foldLeft(0.0, func(acc, row) = acc + absFloat(pick(row)));
    total / rows.size().toFloat();
  };

  func pctText(fraction : Float) : Text {
    let pct = Float.trunc(fraction * 1000.0) / 10.0;
    pct.toText() # "%";
  };

  /// Plain-language comparison of the model's average error against the reps'.
  func verdictFor(avgModel : Float, avgRep : Float, quarterCount : Nat) : Text {
    if (quarterCount == 0) {
      return "No completed quarters are available to score yet.";
    };
    let model = pctText(avgModel);
    let rep = pctText(avgRep);
    let gap = pctText(absFloat(avgModel - avgRep));
    if (avgModel < avgRep) {
      "Across " # quarterCount.toText() # " held-out quarters the model's average error was "
        # model # " versus the reps' " # rep # ", so the model was closer by " # gap
        # " of actual closed-won revenue.";
    } else if (avgRep < avgModel) {
      "Across " # quarterCount.toText() # " held-out quarters the reps' average error was "
        # rep # " versus the model's " # model # ", so the reps were closer by " # gap
        # " of actual closed-won revenue.";
    } else {
      "Across " # quarterCount.toText() # " held-out quarters the model and the reps were equally close, each averaging "
        # model # " error against actual closed-won revenue.";
    };
  };

  /// Builds the full backtest result: per-quarter rows, average model and rep
  /// error, and a plain-language verdict.
  public func runBacktest(
    closedHistory : [Types.Deal],
    baseline : Types.HistoricalBaseline,
    nowMs : Int,
  ) : BacktestTypes.BacktestResult {
    let quarters = holdoutQuarters(closedHistory, nowMs);
    var quarterIndex = 0;
    let rows = quarters.map(
      func((quarterLabel, startMs, endMs)) {
        let row = scoreQuarter(quarterLabel, quarterIndex, startMs, endMs, closedHistory, baseline, nowMs);
        quarterIndex += 1;
        row;
      }
    );
    let avgModelErrorPct = meanAbsError(rows, func(row) = row.modelErrorPct);
    let avgRepErrorPct = meanAbsError(rows, func(row) = row.repErrorPct);
    {
      rows;
      avgModelErrorPct;
      avgRepErrorPct;
      verdict = verdictFor(avgModelErrorPct, avgRepErrorPct, rows.size());
      holdoutQuarterCount = rows.size();
      computedAt = nowMs;
    };
  };
};
