import AccessControl "mo:caffeineai-authorization/access-control";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";

module {
  // Single pending migration for this build. The deployed baseline is an empty
  // actor, so this file starts from `{}` and initializes every stable field.
  type OldActor = {};

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    deals : Map.Map<Nat, Deal>;
    baselineDeals : List.List<Deal>;
    state : { var nextDealId : Nat };
    reasoningCache : Map.Map<Nat, DealRisk>;
    forecastRationale : { var text : Text; var generatedAt : ?Int };
  };

  // Inlined deal shape (migrations may not import project modules).
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

  let firstNames : [Text] = [
    "Alex", "Blair", "Cameron", "Dana", "Elliot", "Frankie", "Gale",
    "Harper", "Indigo", "Jamie", "Kai", "Logan", "Marlow", "Noor",
    "Oakley", "Parker", "Reese", "Sasha", "Tatum", "Wren",
  ];

  let lastNames : [Text] = [
    "Nguyen", "Silva", "Kowalski", "Haddad", "Bergstrom", "Oyelaran",
    "Fitzgerald", "Moreau", "Tanaka", "Ibrahim", "Petrov", "Delgado",
    "Larsen", "Achebe", "Rossi", "Kim",
  ];

  let noteFragments : [Text] = [
    "Champion confirmed budget is approved for this fiscal year.",
    "Procurement asked for a revised security questionnaire before legal review.",
    "Economic buyer went quiet after the pricing conversation.",
    "Technical evaluation passed; waiting on the integration test window.",
    "Competitor was mentioned in the last call; differentiation deck requested.",
    "Legal redlines came back with two open liability clauses.",
    "New CFO joined and is re-reviewing all software spend above 50k.",
    "Pilot users reported strong adoption in the first two weeks.",
    "Champion is on parental leave until next month.",
    "Asked for a phased rollout proposal to reduce first-year commitment.",
    "Budget cycle resets next quarter; may need to shift the close date.",
    "Security review is the only remaining gate before signature.",
    "Referenced a competing vendor's discount in the negotiation call.",
    "Executive sponsor changed; relationship needs to be rebuilt.",
    "Requested a business case with a three-year total cost of ownership.",
    "No response to the last three follow-ups from the account team.",
  ];

  func pick<T>(items : [T], index : Nat) : T {
    items[index % items.size()];
  };

  func daysAgo(nowMs : Int, days : Nat) : Int {
    nowMs - days.toInt() * dayMs;
  };

  func daysAhead(nowMs : Int, days : Nat) : Int {
    nowMs + days.toInt() * dayMs;
  };

  /// Converts a signed day offset to a non-negative `Nat`, clamping negatives to
  /// zero. `Int.toNat()` traps on a negative input, so every offset that reaches
  /// `daysAhead` must pass through here first.
  func nonNegativeDays(offset : Int) : Nat {
    if (offset <= 0) { 0 } else { offset.toNat() };
  };

  func stageFromIndex(index : Nat) : DealStage {
    switch (index % 10) {
      case (0 or 1) { #prospecting };
      case (2 or 3) { #qualification };
      case (4 or 5) { #proposal };
      case (6 or 7) { #negotiation };
      case 8 { #closedWon };
      case _ { #closedLost };
    };
  };

  func roleFromIndex(index : Nat) : StakeholderRole {
    switch (index % 5) {
      case 0 { #economicBuyer };
      case 1 { #champion };
      case 2 { #technicalEvaluator };
      case 3 { #procurement };
      case _ { #blocker };
    };
  };

  func engagementFromIndex(index : Nat) : EngagementLevel {
    switch (index % 4) {
      case 0 { #high };
      case 1 { #medium };
      case 2 { #low };
      case _ { #none };
    };
  };

  func makeStakeholders(state : Nat, count : Nat, nowMs : Int) : ([Stakeholder], Nat) {
    var s = state;
    var i = 0;
    let out = List.empty<Stakeholder>();
    while (i < count) {
      let s1 = next(s);
      let s2 = next(s1);
      let s3 = next(s2);
      let name = pick(firstNames, s1) # " " # pick(lastNames, s2);
      out.add({
        name;
        role = roleFromIndex(s2);
        engagement = engagementFromIndex(s3);
        lastContacted = daysAgo(nowMs, s3 % 45);
      });
      s := s3;
      i += 1;
    };
    (out.toArray(), s);
  };

  func openDeals(nowMs : Int) : [Deal] {
    var s : Nat = 987_654_321;
    var i = 0;
    let out = List.empty<Deal>();
    while (i < 150) {
      let s1 = next(s);
      let s2 = next(s1);
      let s3 = next(s2);
      let s4 = next(s3);
      let s5 = next(s4);
      let s6 = next(s5);
      let s7 = next(s6);
      let s8 = next(s7);
      let s9 = next(s8);
      let s10 = next(s9);

      let account = pick(accountPrefixes, s1) # " " # pick(accountSuffixes, s2);
      let name = account # " — " # pick(productNames, s3) # " " # (i + 1).toText();
      let owner = pick(owners, s4);
      let stage = stageFromIndex(s5);
      let amount = 15_000 + (s6 % 120) * 2_500;
      let createdDays = 30 + (s7 % 210);
      let closeOffset = (s8 % 100).toInt() - 10;
      let lastActivityDays = s9 % 40;
      let activityLast30 = s10 % 13;
      let activityPrior30 = activityLast30 + (s1 % 9);
      let pushes = s2 % 4;
      let notes = pick(noteFragments, s3) # " " # pick(noteFragments, s4);
      let stakeholderCount = 1 + (s5 % 4);
      let (stakeholders, sEnd) = makeStakeholders(s6, stakeholderCount, nowMs);

      out.add({
        id = i + 1;
        name;
        account;
        owner;
        stage;
        amount;
        expectedCloseDate = daysAhead(nowMs, nonNegativeDays(closeOffset));
        createdDate = daysAgo(nowMs, createdDays);
        lastActivityDate = daysAgo(nowMs, lastActivityDays);
        activityLast30Days = activityLast30;
        activityPrior30Days = activityPrior30;
        closeDatePushes = pushes;
        notes;
        stakeholders;
      });

      s := sEnd;
      i += 1;
    };
    out.toArray();
  };

  func winThreshold(stageIndex : Nat) : Nat {
    switch (stageIndex) {
      case 0 { 45 };
      case 1 { 55 };
      case 2 { 65 };
      case _ { 75 };
    };
  };

  func stageMeanDays(stageIndex : Nat) : Nat {
    switch (stageIndex) {
      case 0 { 18 };
      case 1 { 22 };
      case 2 { 26 };
      case _ { 30 };
    };
  };

  func baselineDeals(nowMs : Int) : [Deal] {
    var s : Nat = 246_813_579;
    var i = 0;
    let out = List.empty<Deal>();
    while (i < 120) {
      let s1 = next(s);
      let s2 = next(s1);
      let s3 = next(s2);
      let s4 = next(s3);
      let s5 = next(s4);
      let s6 = next(s5);
      let s7 = next(s6);

      let stageIndex = s1 % 4;
      let won = (s2 % 100) < winThreshold(stageIndex);
      let outcome : DealStage = if (won) { #closedWon } else { #closedLost };
      let account = pick(accountPrefixes, s3) # " " # pick(accountSuffixes, s4);
      let name = account # " — " # pick(productNames, s5) # " (closed)";
      let owner = pick(owners, s6);
      let amount = 15_000 + (s7 % 120) * 2_500;
      let cycleDays = stageMeanDays(stageIndex) + (s1 % 25);
      let closedDays = 30 + (s2 % 300);

      out.add({
        id = 10_000 + i;
        name;
        account;
        owner;
        stage = outcome;
        amount;
        expectedCloseDate = daysAgo(nowMs, closedDays);
        createdDate = daysAgo(nowMs, closedDays + cycleDays);
        lastActivityDate = daysAgo(nowMs, closedDays);
        activityLast30Days = 0;
        activityPrior30Days = 0;
        closeDatePushes = s3 % 3;
        notes = "Historical closed deal used for baseline win-rate and cycle-time derivation.";
        stakeholders = [];
      });

      s := s7;
      i += 1;
    };
    out.toArray();
  };

  // ---------------------------------------------------------------------------
  // Migration
  // ---------------------------------------------------------------------------

  public func migration(_old : OldActor) : NewActor {
    let nowMs = 1_789_000_000_000; // fixed anchor (epoch ms) keeps the seed deterministic
    let open = openDeals(nowMs);
    let closed = baselineDeals(nowMs);
    let dealMap = Map.empty<Nat, Deal>();
    for (deal in open.values()) {
      dealMap.add(deal.id, deal);
    };
    let baselineList = List.empty<Deal>();
    for (deal in closed.values()) {
      baselineList.add(deal);
    };
    {
      accessControlState = AccessControl.initState();
      deals = dealMap;
      baselineDeals = baselineList;
      state = { var nextDealId = open.size() + 1 };
      reasoningCache = Map.empty();
      forecastRationale = { var text = ""; var generatedAt = null };
    };
  };
};
