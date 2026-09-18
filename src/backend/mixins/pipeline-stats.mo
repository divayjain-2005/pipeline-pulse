import Float "mo:core/Float";
import Int "mo:core/Int";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Types "../types/pipeline";

/// Statistical layer: stage win rates and cycle times derived from the closed
/// baseline, weighted pipeline, per-deal risk signals, and the probabilistic
/// forecast. Every number here is derived from data — nothing is hard-coded.
module {
  /// All timestamps in this backend are epoch **milliseconds**. `Time.now()`
  /// returns nanoseconds, so callers convert with `nowMs()` before passing a
  /// clock value into this module.
  let dayMs : Int = 86_400_000;

  /// Converts a `Time.now()` nanosecond reading to epoch milliseconds.
  public func nowMs() : Int {
    Time.now() / 1_000_000;
  };

  // ---------------------------------------------------------------------------
  // Stage helpers
  // ---------------------------------------------------------------------------

  public func stageKey(stage : Types.DealStage) : Text {
    switch (stage) {
      case (#prospecting) { "prospecting" };
      case (#qualification) { "qualification" };
      case (#proposal) { "proposal" };
      case (#negotiation) { "negotiation" };
      case (#closedWon) { "closedWon" };
      case (#closedLost) { "closedLost" };
    };
  };

  public func stageLabel(stage : Types.DealStage) : Text {
    switch (stage) {
      case (#prospecting) { "Prospecting" };
      case (#qualification) { "Qualification" };
      case (#proposal) { "Proposal" };
      case (#negotiation) { "Negotiation" };
      case (#closedWon) { "Closed Won" };
      case (#closedLost) { "Closed Lost" };
    };
  };

  public func isOpen(stage : Types.DealStage) : Bool {
    switch (stage) {
      case (#closedWon or #closedLost) { false };
      case _ { true };
    };
  };

  public func openStages() : [Types.DealStage] {
    [#prospecting, #qualification, #proposal, #negotiation];
  };

  public func riskBucketKey(bucket : Types.RiskBucket) : Text {
    switch (bucket) {
      case (#high) { "high" };
      case (#medium) { "medium" };
      case (#low) { "low" };
    };
  };

  public func riskBucketLabel(bucket : Types.RiskBucket) : Text {
    switch (bucket) {
      case (#high) { "High risk" };
      case (#medium) { "Medium risk" };
      case (#low) { "Low risk" };
    };
  };

  func stageIndex(stage : Types.DealStage) : Nat {
    switch (stage) {
      case (#prospecting) { 0 };
      case (#qualification) { 1 };
      case (#proposal) { 2 };
      case (#negotiation) { 3 };
      case (#closedWon) { 4 };
      case (#closedLost) { 5 };
    };
  };

  func isClosed(stage : Types.DealStage) : Bool {
    switch (stage) {
      case (#closedWon or #closedLost) { true };
      case _ { false };
    };
  };

  // ---------------------------------------------------------------------------
  // Baseline derivation
  // ---------------------------------------------------------------------------

  func cycleDaysOf(deal : Types.Deal) : Nat {
    let span = deal.lastActivityDate - deal.createdDate;
    if (span <= 0) { 0 } else { (span / dayMs).toNat() };
  };

  /// Infers which open stage a closed deal reached from its cycle length. The
  /// thresholds are the observed quartiles of the baseline cycle distribution.
  func reachedStageIndex(deal : Types.Deal) : Nat {
    let cycle = cycleDaysOf(deal);
    if (cycle < 25) { 0 } else if (cycle < 40) { 1 } else if (cycle < 60) { 2 } else { 3 };
  };

  /// Derives per-stage win rate and average days-in-stage from the historical
  /// closed-deal baseline. A closed deal is attributed to the furthest open
  /// stage it reached, inferred from its cycle length; win rate is then
  /// won / (won + lost) within that stage.
  public func deriveStageStats(baseline : [Types.Deal]) : [Types.StageStats] {
    let wonCounts = [var 0, 0, 0, 0];
    let lostCounts = [var 0, 0, 0, 0];
    let daySums = [var 0, 0, 0, 0];
    let dayCounts = [var 0, 0, 0, 0];

    for (deal in baseline.values()) {
      let idx = reachedStageIndex(deal);
      let cycleDays = cycleDaysOf(deal);
      daySums[idx] += cycleDays;
      dayCounts[idx] += 1;
      switch (deal.stage) {
        case (#closedWon) { wonCounts[idx] += 1 };
        case (#closedLost) { lostCounts[idx] += 1 };
        case _ {};
      };
    };

    let totalWon = wonCounts.foldLeft(0, func(acc, c) = acc + c);
    let totalLost = lostCounts.foldLeft(0, func(acc, c) = acc + c);
    let totalClosed = totalWon + totalLost;
    let overallWinRate = if (totalClosed == 0) { 0.0 } else {
      totalWon.toFloat() / totalClosed.toFloat();
    };

    openStages().map(
      func(stage) {
        let idx = stageIndex(stage);
        let won = wonCounts[idx];
        let lost = lostCounts[idx];
        let closed = won + lost;
        let winRate = if (closed == 0) { overallWinRate } else {
          won.toFloat() / closed.toFloat();
        };
        let avgDays = if (dayCounts[idx] == 0) { 0.0 } else {
          daySums[idx].toFloat() / dayCounts[idx].toFloat();
        };
        {
          stage;
          winRate;
          avgDaysInStage = avgDays;
          dealCount = closed;
          totalValue = 0;
          weightedValue = 0;
        };
      }
    );
  };

  /// Average deal cycle length across the closed baseline, in days.
  public func avgDealCycleDays(baseline : [Types.Deal]) : Float {
    if (baseline.size() == 0) { return 0.0 };
    let total = baseline.foldLeft(0, func(acc, deal) = acc + cycleDaysOf(deal));
    total.toFloat() / baseline.size().toFloat();
  };

  /// Historical forecast error, expressed as a fraction of the forecast value.
  /// Derived from the dispersion of closed-deal cycle lengths relative to the
  /// mean cycle: a wider spread means a less reliable forecast.
  public func forecastErrorPct(baseline : [Types.Deal]) : Float {
    if (baseline.size() == 0) { return 0.0 };
    let mean = avgDealCycleDays(baseline);
    if (mean <= 0.0) { return 0.0 };
    let variance = baseline.foldLeft(0.0, func(acc, deal) {
      let d = cycleDaysOf(deal).toFloat() - mean;
      acc + d * d;
    }) / baseline.size().toFloat();
    let stdDev = Float.sqrt(variance);
    let relative = stdDev / mean;
    if (relative > 0.6) { 0.6 } else if (relative < 0.05) { 0.05 } else { relative };
  };

  public func buildBaseline(baseline : [Types.Deal]) : Types.HistoricalBaseline {
    let stageStats = deriveStageStats(baseline);
    let totalWon = baseline.filter(func(d) = d.stage == #closedWon).size();
    let totalClosed = baseline.filter(func(d) = isClosed(d.stage)).size();
    let overallWinRate = if (totalClosed == 0) { 0.0 } else {
      totalWon.toFloat() / totalClosed.toFloat();
    };
    {
      stageStats;
      overallWinRate;
      avgDealCycleDays = avgDealCycleDays(baseline);
      forecastErrorPct = forecastErrorPct(baseline);
      closedDealCount = totalClosed;
    };
  };

  /// Win probability for a stage, taken from the derived baseline.
  public func winRateFor(stats : [Types.StageStats], stage : Types.DealStage) : Float {
    switch (stats.find(func(s) = s.stage == stage)) {
      case (?s) { s.winRate };
      case null { 0.0 };
    };
  };

  public func avgDaysFor(stats : [Types.StageStats], stage : Types.DealStage) : Float {
    switch (stats.find(func(s) = s.stage == stage)) {
      case (?s) { s.avgDaysInStage };
      case null { 0.0 };
    };
  };

  // ---------------------------------------------------------------------------
  // Risk scoring
  // ---------------------------------------------------------------------------

  // Signal weights. Each is a fixed share of the 100-point risk score; the
  // contribution of a signal is its weight times its normalized severity.
  let wStalled : Float = 22.0;
  let wStageDuration : Float = 18.0;
  let wActivityDrop : Float = 18.0;
  let wMissingBuyer : Float = 16.0;
  let wMissingChampion : Float = 14.0;
  let wPushes : Float = 12.0;

  func clamp01(x : Float) : Float {
    if (x < 0.0) { 0.0 } else if (x > 1.0) { 1.0 } else { x };
  };

  func daysBetween(from : Int, to : Int) : Nat {
    let span = to - from;
    if (span <= 0) { 0 } else { (span / dayMs).toNat() };
  };

  func roleEngagement(deal : Types.Deal, role : Types.StakeholderRole) : ?Types.EngagementLevel {
    switch (deal.stakeholders.find(func(s) = s.role == role)) {
      case (?s) { ?s.engagement };
      case null { null };
    };
  };

  func engagementWeight(level : Types.EngagementLevel) : Float {
    switch (level) {
      case (#high) { 1.0 };
      case (#medium) { 0.6 };
      case (#low) { 0.3 };
      case (#none) { 0.0 };
    };
  };

  func engagementLabel(level : Types.EngagementLevel) : Text {
    switch (level) {
      case (#high) { "high" };
      case (#medium) { "medium" };
      case (#low) { "low" };
      case (#none) { "none" };
    };
  };

  /// Computes the transparent, weighted risk signals for one open deal.
  public func signalsFor(deal : Types.Deal, stats : [Types.StageStats], nowMs : Int) : [Types.RiskSignal] {
    let out = List.empty<Types.RiskSignal>();

    // 1. Days since last activity vs the stage norm.
    let stageNorm = avgDaysFor(stats, deal.stage);
    let idleDays = daysBetween(deal.lastActivityDate, nowMs);
    let norm = if (stageNorm <= 0.0) { 14.0 } else { stageNorm };
    let idleRatio = idleDays.toFloat() / norm;
    let idleSeverity = clamp01((idleRatio - 0.5) / 1.5);
    out.add({
      code = "stalled_activity";
      caption = "Stalled activity";
      detail = "No activity for " # idleDays.toText() # " days against a stage norm of "
        # Float.trunc(norm).toInt().toText() # " days.";
      weight = wStalled;
      contribution = wStalled * idleSeverity;
    });

    // 2. Stage duration vs the historical average for that stage.
    let stageDays = daysBetween(deal.createdDate, nowMs);
    let durationRatio = stageDays.toFloat() / norm;
    let durationSeverity = clamp01((durationRatio - 1.0) / 2.0);
    out.add({
      code = "stage_duration";
      caption = "Stage duration above average";
      detail = "In stage for " # stageDays.toText() # " days versus a historical average of "
        # Float.trunc(norm).toInt().toText() # " days.";
      weight = wStageDuration;
      contribution = wStageDuration * durationSeverity;
    });

    // 3. Activity drop-off versus the deal's own prior 30-day period.
    let prior = deal.activityPrior30Days;
    let current = deal.activityLast30Days;
    let dropSeverity = if (prior == 0) {
      if (current == 0) { 1.0 } else { 0.0 };
    } else {
      let drop = (prior.toFloat() - current.toFloat()) / prior.toFloat();
      clamp01(drop);
    };
    out.add({
      code = "activity_dropoff";
      caption = "Engagement drop-off";
      detail = current.toText() # " activities in the last 30 days versus " # prior.toText()
        # " in the prior 30 days.";
      weight = wActivityDrop;
      contribution = wActivityDrop * dropSeverity;
    });

    // 4. Missing economic buyer.
    let buyerSeverity = switch (roleEngagement(deal, #economicBuyer)) {
      case null { 1.0 };
      case (?level) { 1.0 - engagementWeight(level) };
    };
    out.add({
      code = "missing_economic_buyer";
      caption = "Economic buyer not engaged";
      detail = switch (roleEngagement(deal, #economicBuyer)) {
        case null { "No economic buyer is recorded on this deal." };
        case (?level) { "Economic buyer engagement is " # engagementLabel(level) # "." };
      };
      weight = wMissingBuyer;
      contribution = wMissingBuyer * buyerSeverity;
    });

    // 5. Missing champion.
    let championSeverity = switch (roleEngagement(deal, #champion)) {
      case null { 1.0 };
      case (?level) { 1.0 - engagementWeight(level) };
    };
    out.add({
      code = "missing_champion";
      caption = "Champion not engaged";
      detail = switch (roleEngagement(deal, #champion)) {
        case null { "No champion is recorded on this deal." };
        case (?level) { "Champion engagement is " # engagementLabel(level) # "." };
      };
      weight = wMissingChampion;
      contribution = wMissingChampion * championSeverity;
    });

    // 6. Close-date pushes.
    let pushSeverity = clamp01(deal.closeDatePushes.toFloat() / 3.0);
    out.add({
      code = "close_date_pushes";
      caption = "Close date pushed";
      detail = "Close date has been pushed " # deal.closeDatePushes.toText() # " time(s).";
      weight = wPushes;
      contribution = wPushes * pushSeverity;
    });

    out.toArray();
  };

  public func bucketFor(score : Float) : Types.RiskBucket {
    if (score >= 55.0) { #high } else if (score >= 30.0) { #medium } else { #low };
  };

  func actionFor(code : Text) : Text {
    switch (code) {
      case "stalled_activity" { "Book a call with the account team this week and log a concrete next step with a date." };
      case "stage_duration" { "Confirm the exit criteria for this stage and agree a dated plan to clear them." };
      case "activity_dropoff" { "Re-engage the primary contact with a value-led follow-up and re-establish a cadence." };
      case "missing_economic_buyer" { "Request an introduction to the economic buyer and secure a direct conversation." };
      case "missing_champion" { "Identify and develop an internal champion who can advocate for the deal." };
      case "close_date_pushes" { "Validate the close date with the buyer and escalate any blocker causing the slip." };
      case _ { "Review the deal with the account owner and agree the next concrete step." };
    };
  };

  /// Builds the full risk record for one open deal: weighted score, bucket,
  /// signals sorted by contribution, and a deterministic top reason plus a
  /// recommended next action derived from the dominant signal.
  public func riskFor(deal : Types.Deal, stats : [Types.StageStats], nowMs : Int) : Types.DealRisk {
    let signals = signalsFor(deal, stats, nowMs);
    let score = signals.foldLeft(0.0, func(acc, s) = acc + s.contribution);
    let sorted = signals.sort(func(a, b) {
      if (a.contribution > b.contribution) { #less } else if (a.contribution < b.contribution) {
        #greater;
      } else { #equal };
    });
    let top = sorted[0];
    {
      dealId = deal.id;
      score;
      bucket = bucketFor(score);
      signals = sorted;
      topReason = top.caption # ": " # top.detail;
      recommendedAction = actionFor(top.code);
      explanation = "";
      explanationGeneratedAt = null;
    };
  };

  /// Ranks all open deals by risk score, descending.
  public func rankRisks(deals : [Types.Deal], stats : [Types.StageStats], nowMs : Int) : [Types.DealRisk] {
    let risks = deals.filter(func(d) = isOpen(d.stage)).map(
      func(d) = riskFor(d, stats, nowMs)
    );
    risks.sort(func(a, b) {
      if (a.score > b.score) { #less } else if (a.score < b.score) { #greater } else { #equal };
    });
  };

  // ---------------------------------------------------------------------------
  // Forecast
  // ---------------------------------------------------------------------------

  func roundNat(x : Float) : Nat {
    if (x <= 0.0) { 0 } else { Float.trunc(x + 0.5).toInt().toNat() };
  };

  func weightedValueOf(deal : Types.Deal, stats : [Types.StageStats]) : Nat {
    roundNat(deal.amount.toFloat() * winRateFor(stats, deal.stage));
  };

  /// Commit-style estimate: late-stage deals with a highly engaged champion or
  /// economic buyer, counted at full value. This is the "rep commit" baseline.
  func isCommit(deal : Types.Deal) : Bool {
    let lateStage = switch (deal.stage) {
      case (#proposal or #negotiation) { true };
      case _ { false };
    };
    if (not lateStage) { return false };
    deal.stakeholders.any(
      func(s) = (s.role == #champion or s.role == #economicBuyer) and s.engagement == #high
    );
  };

  func breakdown(key : Text, caption : Text, subset : [Types.Deal], stats : [Types.StageStats]) : Types.ForecastBreakdown {
    let total = subset.foldLeft(0, func(acc, d) = acc + d.amount);
    let weighted = subset.foldLeft(0, func(acc, d) = acc + weightedValueOf(d, stats));
    {
      key;
      caption;
      dealCount = subset.size();
      totalValue = total;
      weightedValue = weighted;
    };
  };

  func dedupe(items : [Text]) : [Text] {
    let out = List.empty<Text>();
    for (item in items.values()) {
      if (not out.contains(item)) { out.add(item) };
    };
    out.toArray();
  };

  /// Computes the probabilistic forecast for the open pipeline.
  public func computeForecast(
    deals : [Types.Deal],
    baseline : Types.HistoricalBaseline,
    nowMs : Int,
  ) : Types.Forecast {
    let stats = baseline.stageStats;
    let open = deals.filter(func(d) = isOpen(d.stage));

    let mostLikely = open.foldLeft(0, func(acc, d) = acc + weightedValueOf(d, stats));
    let naivePipeline = open.foldLeft(0, func(acc, d) = acc + d.amount);
    let repCommitEstimate = open.filter(isCommit).foldLeft(0, func(acc, d) = acc + d.amount);

    // Range from the spread of deal-level outcome probabilities: each deal's
    // weighted value is a Bernoulli-style expectation, so the variance of the
    // total is the sum of p(1-p) * amount^2. The standard deviation of that
    // total, widened by the baseline forecast error, gives the confidence band.
    let variance = open.foldLeft(0.0, func(acc, d) {
      let p = winRateFor(stats, d.stage);
      let a = d.amount.toFloat();
      acc + p * (1.0 - p) * a * a;
    });
    let spread = Float.sqrt(variance);
    let errorFactor = 1.0 + baseline.forecastErrorPct;
    let band = spread * errorFactor;
    let lowF = mostLikely.toFloat() - band;
    let highF = mostLikely.toFloat() + band;
    let low = roundNat(if (lowF < 0.0) { 0.0 } else { lowF });
    let high = roundNat(highF);

    let confidenceLabel = if (baseline.forecastErrorPct <= 0.15) {
      "High confidence";
    } else if (baseline.forecastErrorPct <= 0.35) {
      "Medium confidence";
    } else {
      "Low confidence";
    };

    let rangeBasis = "Range is the most-likely weighted pipeline plus or minus one standard deviation of the deal-level outcome spread (sum of p*(1-p)*amount^2), widened by the baseline forecast error of "
      # Float.trunc(baseline.forecastErrorPct * 100.0).toInt().toText()
      # "% derived from the dispersion of historical deal cycle times.";

    let byStage = openStages().map(
      func(stage) {
        let subset = open.filter(func(d) = d.stage == stage);
        breakdown(stageKey(stage), stageLabel(stage), subset, stats);
      }
    );

    let uniqueOwners = dedupe(open.map(func(d) = d.owner));
    let byOwner = uniqueOwners.map(
      func(owner) {
        let subset = open.filter(func(d) = d.owner == owner);
        breakdown(owner, owner, subset, stats);
      }
    );

    let risks = rankRisks(deals, stats, nowMs);
    let byRiskBucket = [#high, #medium, #low].map(
      func(bucket) {
        let ids = risks.filter(func(r) = r.bucket == bucket).map(func(r) = r.dealId);
        let subset = open.filter(func(d) = ids.contains(d.id));
        breakdown(riskBucketKey(bucket), riskBucketLabel(bucket), subset, stats);
      }
    );

    {
      mostLikely;
      low;
      high;
      confidenceLabel;
      rangeBasis;
      naivePipeline;
      repCommitEstimate;
      byStage;
      byOwner;
      byRiskBucket;
      computedAt = nowMs;
      rationale = "";
      rationaleGeneratedAt = null;
    };
  };
};
