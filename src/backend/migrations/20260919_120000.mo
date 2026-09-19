import AccessControl "mo:caffeineai-authorization/access-control";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";

module {
  // Migration for the backtest build. The previous deployed version had no
  // `repEstimate` on `Deal` and no `closedHistory` stable field, so this file
  // maps every existing deal onto the new shape and generates the multi-quarter
  // closed history from the same deterministic generator.
  type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    deals : Map.Map<Nat, OldDeal>;
    baselineDeals : List.List<OldDeal>;
    state : { var nextDealId : Nat };
    reasoningCache : Map.Map<Nat, DealRisk>;
    forecastRationale : { var text : Text; var generatedAt : ?Int };
  };

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    deals : Map.Map<Nat, Deal>;
    baselineDeals : List.List<Deal>;
    closedHistory : List.List<Deal>;
    state : { var nextDealId : Nat };
    reasoningCache : Map.Map<Nat, DealRisk>;
    forecastRationale : { var text : Text; var generatedAt : ?Int };
  };

  // Inlined old deal shape (migrations may not import project modules).
  type DealStage = {
    #prospecting;
    #qualification;
    #proposal;
    #negotiation;
    #closedWon;
    #closedLost;
  };

  type StakeholderRole = {
    #economicBuyer;
    #champion;
    #technicalEvaluator;
    #procurement;
    #blocker;
  };

  type EngagementLevel = {
    #high;
    #medium;
    #low;
    #none;
  };

  type Stakeholder = {
    name : Text;
    role : StakeholderRole;
    engagement : EngagementLevel;
    lastContacted : Int;
  };

  type OldDeal = {
    id : Nat;
    name : Text;
    account : Text;
    owner : Text;
    stage : DealStage;
    amount : Nat;
    expectedCloseDate : Int;
    createdDate : Int;
    lastActivityDate : Int;
    activityLast30Days : Nat;
    activityPrior30Days : Nat;
    closeDatePushes : Nat;
    notes : Text;
    stakeholders : [Stakeholder];
  };

  // New deal shape: identical plus the optional rep estimate.
  type Deal = {
    id : Nat;
    name : Text;
    account : Text;
    owner : Text;
    stage : DealStage;
    amount : Nat;
    expectedCloseDate : Int;
    createdDate : Int;
    lastActivityDate : Int;
    activityLast30Days : Nat;
    activityPrior30Days : Nat;
    closeDatePushes : Nat;
    notes : Text;
    stakeholders : [Stakeholder];
    repEstimate : ?Nat;
  };

  // Inlined persisted reasoning shape (migrations may not import project modules).
  type RiskSignal = {
    code : Text;
    caption : Text;
    detail : Text;
    weight : Float;
    contribution : Float;
  };

  type RiskBucket = {
    #high;
    #medium;
    #low;
  };

  type DealRisk = {
    dealId : Nat;
    score : Float;
    bucket : RiskBucket;
    signals : [RiskSignal];
    topReason : Text;
    recommendedAction : Text;
    explanation : Text;
    explanationGeneratedAt : ?Int;
  };

  // ---------------------------------------------------------------------------
  // Deterministic seed generation (inlined; migrations cannot import project
  // modules). Mirrors src/backend/seed/sample-deals.mo so a fresh install and a
  // "reset to sample data" produce the same dataset.
  // ---------------------------------------------------------------------------

  let MOD : Nat = 2_147_483_647;
  let MUL : Nat = 48_271;
  let dayMs : Int = 86_400_000;

  func next(state : Nat) : Nat {
    (state * MUL) % MOD;
  };

  let owners : [Text] = [
    "Avery Chen", "Jordan Patel", "Riley Novak", "Sam Okafor",
    "Morgan Diaz", "Casey Lindqvist", "Devon Marsh", "Quinn Alvarez",
  ];

  let accountPrefixes : [Text] = [
    "Northwind", "Acme", "Globex", "Initech", "Umbrella", "Soylent",
    "Hooli", "Vandelay", "Stark", "Wayne", "Cyberdyne", "Massive Dynamic",
    "Aperture", "Tyrell", "Wonka", "Gringotts", "Duff", "Pied Piper",
    "Prestige", "Bluth",
  ];

  let accountSuffixes : [Text] = [
    "Industries", "Logistics", "Health", "Financial", "Systems",
    "Labs", "Retail Group", "Manufacturing", "Analytics", "Networks",
  ];

  let productNames : [Text] = [
    "Platform", "Enterprise", "Cloud", "Data Suite", "Security",
    "Automation", "Insights", "Connect", "Workspace", "Renewal",
  ];

  func pick<T>(items : [T], index : Nat) : T {
    items[index % items.size()];
  };

  func daysAgo(nowMs : Int, days : Nat) : Int {
    nowMs - days.toInt() * dayMs;
  };

  /// A plausible rep estimate: the deal amount nudged by a deterministic
  /// -15%..+10% adjustment, rounded to the nearest 500. Roughly one deal in
  /// eight is left unestimated.
  func repEstimateFor(amount : Nat, roll : Nat) : ?Nat {
    if (roll % 8 == 0) { return null };
    let pct = (roll % 26).toInt() - 15;
    let adjusted = amount.toInt() * (100 + pct) / 100;
    let rounded = ((adjusted + 250) / 500) * 500;
    if (rounded <= 0) { ?0 } else { ?rounded.toNat() };
  };

  /// Builds ~6 quarters of closed deals (won and lost) with close dates spread
  /// across those quarters. Ids start at 20_000 so they never collide with open
  /// deals or the win-rate baseline.
  func closedHistoryDeals(nowMs : Int) : [Deal] {
    var s : Nat = 135_792_468;
    var i = 0;
    let out = List.empty<Deal>();
    let perQuarter : Nat = 20;
    let total = 6 * perQuarter;
    while (i < total) {
      let s1 = next(s);
      let s2 = next(s1);
      let s3 = next(s2);
      let s4 = next(s3);
      let s5 = next(s4);
      let s6 = next(s5);
      let s7 = next(s6);

      let quarterIndex = i / perQuarter;
      let dayOffset = quarterIndex * 91 + (s1 % 88);
      let won = (s2 % 100) < 62;
      let outcome : DealStage = if (won) { #closedWon } else { #closedLost };
      let account = pick(accountPrefixes, s3) # " " # pick(accountSuffixes, s4);
      let name = account # " — " # pick(productNames, s5) # " (history)";
      let owner = pick(owners, s6);
      let amount = 15_000 + (s7 % 120) * 2_500;
      let cycleDays = 20 + (s1 % 70);

      out.add({
        id = 20_000 + i;
        name;
        account;
        owner;
        stage = outcome;
        amount;
        expectedCloseDate = daysAgo(nowMs, dayOffset);
        createdDate = daysAgo(nowMs, dayOffset + cycleDays);
        lastActivityDate = daysAgo(nowMs, dayOffset);
        activityLast30Days = 0;
        activityPrior30Days = 0;
        closeDatePushes = s3 % 3;
        notes = "Historical closed deal used as a backtest actual outcome.";
        stakeholders = [];
        repEstimate = repEstimateFor(amount, s4);
      });

      s := s7;
      i += 1;
    };
    out.toArray();
  };

  // ---------------------------------------------------------------------------
  // Migration
  // ---------------------------------------------------------------------------

  public func migration(old : OldActor) : NewActor {
    let nowMs = 1_789_000_000_000; // fixed anchor (epoch ms) keeps the seed deterministic

    let deals = old.deals.map<Nat, OldDeal, Deal>(
      func(_id, deal) = { deal with repEstimate = null }
    );
    let baselineDeals = old.baselineDeals.map<OldDeal, Deal>(
      func(deal) = { deal with repEstimate = null }
    );

    let closedHistory = List.empty<Deal>();
    for (deal in closedHistoryDeals(nowMs).values()) {
      closedHistory.add(deal);
    };

    {
      accessControlState = old.accessControlState;
      deals;
      baselineDeals;
      closedHistory;
      state = old.state;
      reasoningCache = old.reasoningCache;
      forecastRationale = old.forecastRationale;
    };
  };
};
