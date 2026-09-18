import Types "../types/pipeline";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Float "mo:core/Float";

module {
  // ---------------------------------------------------------------------------
  // Prompt construction
  //
  // Every prompt is built from the actual numbers and text already held in the
  // deal / forecast records. The system instruction forbids generic filler and
  // requires the model to name the real signals and the real person or artifact.
  // ---------------------------------------------------------------------------

  public let DEAL_SYSTEM_PROMPT : Text = "You are a sales pipeline risk analyst. You are given the exact CRM data for one deal, including computed risk signals. Write a specific risk explanation that names the actual signals with their real numbers (for example 'no activity for 34 days', 'economic buyer never engaged', 'close date pushed twice'). Never use generic filler such as 'this deal looks risky' or 'follow up soon'. Then recommend exactly one concrete next action that names the specific person (by name and role) or the specific artifact involved (for example 're-engage economic buyer Dana Whitfield with a revised ROI summary'). Respond in exactly this format and nothing else:\nEXPLANATION: <2-4 sentences naming the real signals>\nACTION: <one concrete next action naming the person or artifact>";

  public let FORECAST_SYSTEM_PROMPT : Text = "You are a revenue forecasting analyst. You are given the exact weighted-pipeline forecast numbers, the confidence range and its basis, the historical baseline comparison, and the top contributing stages and deals. Write a rationale that explains which stages and deals drive the number and what would move it. Cite the actual figures. Never use generic filler. Respond in exactly this format and nothing else:\nRATIONALE: <3-6 sentences explaining what drives the number and what would move it>";

  // ---------------------------------------------------------------------------
  // Formatting helpers
  // ---------------------------------------------------------------------------

  func stageLabel(stage : Types.DealStage) : Text {
    switch (stage) {
      case (#prospecting) { "Prospecting" };
      case (#qualification) { "Qualification" };
      case (#proposal) { "Proposal" };
      case (#negotiation) { "Negotiation" };
      case (#closedWon) { "Closed Won" };
      case (#closedLost) { "Closed Lost" };
    };
  };

  func roleLabel(role : Types.StakeholderRole) : Text {
    switch (role) {
      case (#economicBuyer) { "economic buyer" };
      case (#champion) { "champion" };
      case (#technicalEvaluator) { "technical evaluator" };
      case (#procurement) { "procurement" };
      case (#blocker) { "blocker" };
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

  func bucketLabel(bucket : Types.RiskBucket) : Text {
    switch (bucket) {
      case (#high) { "high" };
      case (#medium) { "medium" };
      case (#low) { "low" };
    };
  };

  // Whole days between two epoch-millisecond timestamps, floored at zero.
  func daysBetween(from : Int, to : Int) : Nat {
    let diff = to - from;
    if (diff <= 0) { 0 } else { (diff / 86_400_000).toNat() };
  };

  func money(amount : Nat) : Text {
    "$" # amount.toText();
  };

  func pct(value : Float) : Text {
    (value * 100.0).toText() # "%";
  };

  // ---------------------------------------------------------------------------
  // Deal prompt
  // ---------------------------------------------------------------------------

  public func buildDealPrompt(
    deal : Types.Deal,
    risk : Types.DealRisk,
    baseline : Types.HistoricalBaseline,
    now : Int,
  ) : Text {
    let daysSinceActivity = daysBetween(deal.lastActivityDate, now);
    let stageDuration = daysBetween(deal.createdDate, now);
    let stageAvg = baseline.stageStats.find(func s = s.stage == deal.stage);
    let avgDaysInStage = switch (stageAvg) {
      case (?s) { s.avgDaysInStage };
      case null { 0.0 };
    };
    let stageWinRate = switch (stageAvg) {
      case (?s) { s.winRate };
      case null { baseline.overallWinRate };
    };

    let activityTrend = if (deal.activityLast30Days > deal.activityPrior30Days) {
      "rising (" # deal.activityLast30Days.toText() # " in the last 30 days vs " # deal.activityPrior30Days.toText() # " in the prior 30 days)";
    } else if (deal.activityLast30Days < deal.activityPrior30Days) {
      "falling (" # deal.activityLast30Days.toText() # " in the last 30 days vs " # deal.activityPrior30Days.toText() # " in the prior 30 days)";
    } else {
      "flat (" # deal.activityLast30Days.toText() # " in each of the last two 30-day windows)";
    };

    let stakeholderLines = deal.stakeholders.map(
      func(s) {
        "- " # s.name # " (" # roleLabel(s.role) # "), engagement " # engagementLabel(s.engagement)
          # ", last contacted " # daysBetween(s.lastContacted, now).toText() # " days ago";
      }
    );

    let signalLines = risk.signals.map(
      func(sig) {
        "- " # sig.caption # ": " # sig.detail # " (weight " # sig.weight.toText() # ", contribution " # sig.contribution.toText() # ")";
      }
    );

    let stakeholderBlock = if (stakeholderLines.size() == 0) {
      "No stakeholders are recorded on this deal."
    } else {
      stakeholderLines.values().join("\n")
    };

    let signalBlock = if (signalLines.size() == 0) {
      "No rule-based risk signals fired for this deal."
    } else {
      signalLines.values().join("\n")
    };

    "DEAL DATA\n"
    # "Name: " # deal.name # "\n"
    # "Account: " # deal.account # "\n"
    # "Owner: " # deal.owner # "\n"
    # "Stage: " # stageLabel(deal.stage) # "\n"
    # "Amount: " # money(deal.amount) # "\n"
    # "Days since last activity: " # daysSinceActivity.toText() # "\n"
    # "Days since deal created: " # stageDuration.toText() # "\n"
    # "Historical average days in this stage: " # avgDaysInStage.toText() # "\n"
    # "Historical win rate from this stage: " # pct(stageWinRate) # "\n"
    # "Activity trend: " # activityTrend # "\n"
    # "Close date pushes: " # deal.closeDatePushes.toText() # "\n"
    # "Notes: " # (if (deal.notes == "") { "(none)" } else { deal.notes }) # "\n"
    # "\nSTAKEHOLDERS\n" # stakeholderBlock # "\n"
    # "\nCOMPUTED RISK\n"
    # "Risk score: " # risk.score.toText() # " (" # bucketLabel(risk.bucket) # ")\n"
    # "Top reason: " # risk.topReason # "\n"
    # signalBlock # "\n"
    # "\nWrite the risk explanation and the single recommended next action for this deal.";
  };

  // ---------------------------------------------------------------------------
  // Forecast prompt
  // ---------------------------------------------------------------------------

  func breakdownLines(items : [Types.ForecastBreakdown]) : Text {
    if (items.size() == 0) { "(none)" } else {
      items.map(
        func(b) {
          "- " # b.caption # ": " # b.dealCount.toText() # " deals, " # money(b.totalValue)
            # " total, " # money(b.weightedValue) # " weighted";
        }
      ).values().join("\n")
    };
  };

  public func buildForecastPrompt(
    forecast : Types.Forecast,
    baseline : Types.HistoricalBaseline,
    topDeals : [Types.DealRisk],
    dealsById : [(Nat, Types.Deal)],
  ) : Text {
    let topDealLines = topDeals.map(
      func(r) {
        let name = switch (dealsById.find(func(pair) = pair.0 == r.dealId)) {
          case (?(_, d)) { d.name # " (" # d.account # ")" };
          case null { "deal #" # r.dealId.toText() };
        };
        "- " # name # ": risk " # r.score.toText() # " (" # bucketLabel(r.bucket) # "), " # r.topReason;
      }
    );

    let topDealBlock = if (topDealLines.size() == 0) { "(none)" } else {
      topDealLines.values().join("\n")
    };

    "FORECAST NUMBERS\n"
    # "Most likely: " # money(forecast.mostLikely) # "\n"
    # "Low: " # money(forecast.low) # "\n"
    # "High: " # money(forecast.high) # "\n"
    # "Confidence: " # forecast.confidenceLabel # "\n"
    # "Range basis: " # forecast.rangeBasis # "\n"
    # "Naive unweighted pipeline: " # money(forecast.naivePipeline) # "\n"
    # "Rep commit estimate: " # money(forecast.repCommitEstimate) # "\n"
    # "\nHISTORICAL BASELINE\n"
    # "Overall win rate: " # pct(baseline.overallWinRate) # "\n"
    # "Average deal cycle: " # baseline.avgDealCycleDays.toText() # " days\n"
    # "Historical forecast error: " # pct(baseline.forecastErrorPct) # "\n"
    # "Closed deals in baseline: " # baseline.closedDealCount.toText() # "\n"
    # "\nBY STAGE\n" # breakdownLines(forecast.byStage) # "\n"
    # "\nBY OWNER\n" # breakdownLines(forecast.byOwner) # "\n"
    # "\nBY RISK BUCKET\n" # breakdownLines(forecast.byRiskBucket) # "\n"
    # "\nTOP CONTRIBUTING AT-RISK DEALS\n" # topDealBlock # "\n"
    # "\nWrite the forecast rationale explaining what drives the number and what would move it.";
  };

  // ---------------------------------------------------------------------------
  // Response parsing
  // ---------------------------------------------------------------------------

  // Split the model response into (explanation, action). The model is instructed
  // to answer with EXPLANATION: / ACTION: lines; fall back to using the whole
  // response as the explanation when the format is not followed.
  public func parseDealResponse(response : Text) : (Text, Text) {
    let lines = response.split(#char '\n').toArray();
    var explanation = "";
    var action = "";
    for (line in lines.values()) {
      let trimmed = line.trim(#predicate(func(c) { c == ' ' or c == '\t' or c == '\r' }));
      if (trimmed.startsWith(#text "EXPLANATION:")) {
        explanation := trimmed.trimStart(#text "EXPLANATION:").trim(#predicate(func(c) { c == ' ' or c == '\t' }));
      } else if (trimmed.startsWith(#text "ACTION:")) {
        action := trimmed.trimStart(#text "ACTION:").trim(#predicate(func(c) { c == ' ' or c == '\t' }));
      } else if (explanation != "" and action == "") {
        explanation := explanation # " " # trimmed;
      };
    };
    if (explanation == "") {
      explanation := response.trim(#predicate(func(c) { c == ' ' or c == '\n' or c == '\t' or c == '\r' }));
    };
    (explanation, action);
  };

  public func parseForecastResponse(response : Text) : Text {
    let lines = response.split(#char '\n').toArray();
    var rationale = "";
    for (line in lines.values()) {
      let trimmed = line.trim(#predicate(func(c) { c == ' ' or c == '\t' or c == '\r' }));
      if (trimmed.startsWith(#text "RATIONALE:")) {
        rationale := trimmed.trimStart(#text "RATIONALE:").trim(#predicate(func(c) { c == ' ' or c == '\t' }));
      } else if (rationale != "") {
        rationale := rationale # " " # trimmed;
      };
    };
    if (rationale == "") {
      rationale := response.trim(#predicate(func(c) { c == ' ' or c == '\n' or c == '\t' or c == '\r' }));
    };
    rationale;
  };
};
