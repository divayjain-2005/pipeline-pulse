module {
  // ---------------------------------------------------------------------------
  // Enumerations
  // ---------------------------------------------------------------------------

  public type DealStage = {
    #prospecting;
    #qualification;
    #proposal;
    #negotiation;
    #closedWon;
    #closedLost;
  };

  public type StakeholderRole = {
    #economicBuyer;
    #champion;
    #technicalEvaluator;
    #procurement;
    #blocker;
  };

  public type EngagementLevel = {
    #high;
    #medium;
    #low;
    #none;
  };

  public type RiskBucket = {
    #high;
    #medium;
    #low;
  };

  // ---------------------------------------------------------------------------
  // Core records
  // ---------------------------------------------------------------------------

  public type Stakeholder = {
    name : Text;
    role : StakeholderRole;
    engagement : EngagementLevel;
    lastContacted : Int; // epoch milliseconds
  };

  public type Deal = {
    id : Nat;
    name : Text;
    account : Text;
    owner : Text;
    stage : DealStage;
    amount : Nat;
    expectedCloseDate : Int; // epoch milliseconds
    createdDate : Int; // epoch milliseconds
    lastActivityDate : Int; // epoch milliseconds
    activityLast30Days : Nat;
    activityPrior30Days : Nat;
    closeDatePushes : Nat;
    notes : Text;
    stakeholders : [Stakeholder];
    /// Optional per-deal rep estimate in whole currency units. `null` means the
    /// rep has not estimated this deal; unestimated deals are excluded from
    /// rep-estimate totals and are marked as unestimated in the UI.
    repEstimate : ?Nat;
  };

  // ---------------------------------------------------------------------------
  // Risk
  // ---------------------------------------------------------------------------

  public type RiskSignal = {
    code : Text;
    caption : Text;
    detail : Text;
    weight : Float;
    contribution : Float;
  };

  public type DealRisk = {
    dealId : Nat;
    score : Float;
    bucket : RiskBucket;
    signals : [RiskSignal];
    topReason : Text;
    recommendedAction : Text;
    explanation : Text;
    explanationGeneratedAt : ?Int; // epoch milliseconds; null until generated
  };

  // ---------------------------------------------------------------------------
  // Statistics and forecast
  // ---------------------------------------------------------------------------

  public type StageStats = {
    stage : DealStage;
    winRate : Float;
    avgDaysInStage : Float;
    dealCount : Nat;
    totalValue : Nat;
    weightedValue : Nat;
  };

  public type ForecastBreakdown = {
    key : Text;
    caption : Text;
    dealCount : Nat;
    totalValue : Nat;
    weightedValue : Nat;
  };

  public type Forecast = {
    mostLikely : Nat;
    low : Nat;
    high : Nat;
    confidenceLabel : Text;
    rangeBasis : Text;
    naivePipeline : Nat;
    repCommitEstimate : Nat;
    byStage : [ForecastBreakdown];
    byOwner : [ForecastBreakdown];
    byRiskBucket : [ForecastBreakdown];
    computedAt : Int; // epoch milliseconds
    rationale : Text;
    rationaleGeneratedAt : ?Int; // epoch milliseconds; null until generated
  };

  public type HistoricalBaseline = {
    stageStats : [StageStats];
    overallWinRate : Float;
    avgDealCycleDays : Float;
    forecastErrorPct : Float;
    closedDealCount : Nat;
  };

  // ---------------------------------------------------------------------------
  // Result
  // ---------------------------------------------------------------------------

  public type PipelineError = {
    #notFound : Nat;
    #invalidInput : Text;
    #notAuthorized;
  };

  public type PipelineResult<T> = {
    #ok : T;
    #err : PipelineError;
  };
};
