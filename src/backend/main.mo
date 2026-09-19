import AccessControl "mo:caffeineai-authorization/access-control";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import OQL "mo:caffeineai-oql";
import Expose "mo:caffeineai-oql/Expose";
import Entity "mo:caffeineai-oql/Entity";
import MapEntity "mo:caffeineai-oql/MapEntity";
import IntValue "mo:caffeineai-oql/IntValue";
import NatValue "mo:caffeineai-oql/NatValue";
import TextValue "mo:caffeineai-oql/TextValue";
import Types "types/pipeline";
import PipelineStore "mixins/pipeline-store";
import PipelineApi "mixins/pipeline-api";
import PipelineLlm "mixins/pipeline-llm";
import BacktestApi "mixins/backtest-api";
import ApiDocMixin "mixins/api-doc";

actor {
  let accessControlState : AccessControl.AccessControlState;
  let deals : Map.Map<Nat, Types.Deal>;
  let baselineDeals : List.List<Types.Deal>;
  let closedHistory : List.List<Types.Deal>;
  let state : { var nextDealId : Nat };
  let reasoningCache : Map.Map<Nat, Types.DealRisk>;
  let forecastRationale : { var text : Text; var generatedAt : ?Int };

  // ---------------------------------------------------------------------------
  // OQL row projections
  //
  // `Deal` embeds a `stakeholders` array and `Stakeholder` carries variant
  // fields, so neither record is all-primitive and both are exposed in manual
  // mode. Variants collapse to their tag text; the stakeholder array is
  // projected as a count on the deal row and as its own table below.
  // ---------------------------------------------------------------------------

  func stageText(stage : Types.DealStage) : Text =
    switch (stage) {
      case (#prospecting) { "prospecting" };
      case (#qualification) { "qualification" };
      case (#proposal) { "proposal" };
      case (#negotiation) { "negotiation" };
      case (#closedWon) { "closedWon" };
      case (#closedLost) { "closedLost" };
    };

  func roleText(role : Types.StakeholderRole) : Text =
    switch (role) {
      case (#economicBuyer) { "economicBuyer" };
      case (#champion) { "champion" };
      case (#technicalEvaluator) { "technicalEvaluator" };
      case (#procurement) { "procurement" };
      case (#blocker) { "blocker" };
    };

  func engagementText(engagement : Types.EngagementLevel) : Text =
    switch (engagement) {
      case (#high) { "high" };
      case (#medium) { "medium" };
      case (#low) { "low" };
      case (#none) { "none" };
    };

  // Flatten every deal's stakeholders into (dealId, index, stakeholder) rows so
  // the stakeholder table is queryable on its own and joins back to the deal.
  func stakeholderRows() : Iter.Iter<(Nat, Nat, Types.Stakeholder)> {
    let rows = List.empty<(Nat, Nat, Types.Stakeholder)>();
    for (deal in deals.values()) {
      var i = 0;
      for (s in deal.stakeholders.values()) {
        rows.add((deal.id, i, s));
        i += 1;
      };
    };
    rows.values();
  };

  include MixinAuthorization(accessControlState, null);
  include PipelineStore(deals, baselineDeals, closedHistory, state);
  include PipelineApi(
    deals,
    baselineDeals,
    state,
    reasoningCache,
    forecastRationale,
    storeCreateDeal,
    storeUpdateDeal,
    storeDeleteDeal,
    storeAddStakeholder,
    storeUpdateStakeholder,
    seedSampleData,
  );
  include PipelineLlm(deals, baselineDeals, reasoningCache, forecastRationale);
  include BacktestApi(closedHistory, baselineDeals);
  include ApiDocMixin();
  include Expose({
    entities = [
      deals.toEntityManual("deal", "Deal", "id")
        .sample({
          id = 0;
          name = "";
          account = "";
          owner = "";
          stage = #prospecting;
          amount = 0;
          expectedCloseDate = 0;
          createdDate = 0;
          lastActivityDate = 0;
          activityLast30Days = 0;
          activityPrior30Days = 0;
          closeDatePushes = 0;
          notes = "";
          stakeholders = [];
          repEstimate = null;
        })
        .payload("id", func d = d.id)
        .payload("name", func d = d.name)
        .payload("account", func d = d.account)
        .payload("owner", func d = d.owner)
        .payload("stage", func d = stageText(d.stage))
        .payload("amount", func d = d.amount)
        .payload("expectedCloseDate", func d = d.expectedCloseDate)
        .payload("createdDate", func d = d.createdDate)
        .payload("lastActivityDate", func d = d.lastActivityDate)
        .payload("activityLast30Days", func d = d.activityLast30Days)
        .payload("activityPrior30Days", func d = d.activityPrior30Days)
        .payload("closeDatePushes", func d = d.closeDatePushes)
        .payload("notes", func d = d.notes)
        .payload("stakeholderCount", func d = d.stakeholders.size())
        .payload("repEstimate", func d = d.repEstimate ?? 0)
        .controllerOnly()
        .build(),
      OQL.Entity.manual<(Nat, Nat, Types.Stakeholder)>(
        "stakeholder",
        stakeholderRows,
        "Stakeholder",
        "key",
      )
        .sample((0, 0, { name = ""; role = #champion; engagement = #high; lastContacted = 0 }))
        .payload("key", func ((dealId, index, _)) = dealId.toText() # ":" # index.toText())
        .payload("dealId", func ((dealId, _, _)) = dealId)
        .edge("dealId", "deal")
        .payload("index", func ((_, index, _)) = index)
        .payload("name", func ((_, _, s)) = s.name)
        .payload("role", func ((_, _, s)) = roleText(s.role))
        .payload("engagement", func ((_, _, s)) = engagementText(s.engagement))
        .payload("lastContacted", func ((_, _, s)) = s.lastContacted)
        .controllerOnly()
        .build(),
    ];
  });
};
