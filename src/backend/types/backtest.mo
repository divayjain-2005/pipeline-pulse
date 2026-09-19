module {
  /// One held-out quarter scored by the backtest.
  ///
  /// `modelForecast` is the quarter-level revenue forecast produced by the same
  /// `computeForecast` logic used for the live forecast, applied to the pipeline
  /// as it stood at `quarterStart`. `repEstimateTotal` is the sum of the
  /// per-deal rep estimates for the deals open at `quarterStart`. `actualWon` is
  /// the sum of closed-won deals whose close date falls inside the quarter.
  ///
  /// Errors are signed so over- and under-forecasting are distinguishable:
  /// a positive `modelErrorPct` means the model forecast **above** actual.
  public type BacktestQuarterRow = {
    quarterLabel : Text; // e.g. "2025 Q3"
    quarterStart : Int; // epoch milliseconds, inclusive
    quarterEnd : Int; // epoch milliseconds, exclusive
    modelForecast : Nat; // model quarter-level revenue forecast
    repEstimateTotal : Nat; // sum of rep estimates for the quarter
    actualWon : Nat; // actual closed-won revenue for the quarter
    modelErrorPct : Float; // signed: (model - actual) / actual
    modelErrorDelta : Int; // signed: model - actual
    repErrorPct : Float; // signed: (rep - actual) / actual
    repErrorDelta : Int; // signed: rep - actual
    dealCount : Nat; // deals open at quarter start
    estimatedDealCount : Nat; // of those, deals carrying a rep estimate
    wonDealCount : Nat; // closed-won deals in the quarter
  };

  /// Full backtest result: per-quarter rows plus the averages and a verdict.
  public type BacktestResult = {
    rows : [BacktestQuarterRow];
    avgModelErrorPct : Float; // mean of |modelErrorPct| across held-out quarters
    avgRepErrorPct : Float; // mean of |repErrorPct| across held-out quarters
    verdict : Text; // plain-language comparison of model vs reps
    holdoutQuarterCount : Nat;
    computedAt : Int; // epoch milliseconds
  };
};
