import List "mo:core/List";
import Map "mo:core/Map";
import Types "../types/pipeline";
import PipelineStats "pipeline-stats";

/// Public API surface for the statistical and risk-scoring layer. Read and
/// mutation endpoints delegate to the store primitives and the statistics
/// module. The LLM reasoning endpoints live in `pipeline-llm.mo`.
///
/// The persisted reasoning state (`reasoningCache`, `forecastRationale`) is
/// injected so the read paths can merge generated text into freshly computed
/// records; without that merge the generated explanations would be dropped on
/// every refresh.
mixin (
  deals : Map.Map<Nat, Types.Deal>,
  baselineDeals : List.List<Types.Deal>,
  state : { var nextDealId : Nat },
  reasoningCache : Map.Map<Nat, Types.DealRisk>,
  forecastRationale : { var text : Text; var generatedAt : ?Int },
  storeCreateDeal : shared (Types.Deal) -> async Types.PipelineResult<Types.Deal>,
  storeUpdateDeal : shared (Nat, Types.Deal) -> async Types.PipelineResult<Types.Deal>,
  storeDeleteDeal : shared (Nat) -> async Types.PipelineResult<()>,
  storeAddStakeholder : shared (Nat, Types.Stakeholder) -> async Types.PipelineResult<Types.Deal>,
  storeUpdateStakeholder : shared (Nat, Nat, Types.Stakeholder) -> async Types.PipelineResult<Types.Deal>,
  seedSampleData : shared () -> async (),
) {
  // ---------------------------------------------------------------------------
  // Persisted-reasoning merge
  //
  // The statistical layer recomputes scores and signals from current state, but
  // it cannot know about generated text. These helpers overlay the persisted
  // explanation / recommended action / rationale onto the computed record so a
  // generated result survives a refresh.
  // ---------------------------------------------------------------------------

  func mergeRisk(risk : Types.DealRisk) : Types.DealRisk {
    switch (reasoningCache.get(risk.dealId)) {
      case (?cached) {
        {
          risk with
          explanation = cached.explanation;
          recommendedAction = if (cached.recommendedAction == "") {
            risk.recommendedAction;
          } else { cached.recommendedAction };
          explanationGeneratedAt = cached.explanationGeneratedAt;
        };
      };
      case null { risk };
    };
  };

  func mergeForecast(forecast : Types.Forecast) : Types.Forecast {
    switch (forecastRationale.generatedAt) {
      case (?at) {
        {
          forecast with
          rationale = forecastRationale.text;
          rationaleGeneratedAt = ?at;
        };
      };
      case null { forecast };
    };
  };

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  public query func listDeals() : async [Types.Deal] {
    deals.values().toArray();
  };

  public query func getDeal(id : Nat) : async ?Types.Deal {
    deals.get(id);
  };

  public query func listDealRisks() : async [Types.DealRisk] {
    let all = deals.values().toArray();
    let baseline = PipelineStats.buildBaseline(baselineDeals.toArray());
    let risks = PipelineStats.rankRisks(all, baseline.stageStats, PipelineStats.nowMs());
    risks.map(mergeRisk);
  };

  public query func getForecast() : async Types.Forecast {
    let all = deals.values().toArray();
    let baseline = PipelineStats.buildBaseline(baselineDeals.toArray());
    let forecast = PipelineStats.computeForecast(all, baseline, PipelineStats.nowMs());
    mergeForecast(forecast);
  };

  public query func getBaseline() : async Types.HistoricalBaseline {
    PipelineStats.buildBaseline(baselineDeals.toArray());
  };

  // ---------------------------------------------------------------------------
  // Deal mutations
  // ---------------------------------------------------------------------------

  public shared ({ caller }) func createDeal(deal : Types.Deal) : async Types.PipelineResult<Types.Deal> {
    if (caller.isAnonymous()) { return #err(#notAuthorized) };
    await storeCreateDeal(deal);
  };

  public shared ({ caller }) func updateDeal(id : Nat, deal : Types.Deal) : async Types.PipelineResult<Types.Deal> {
    if (caller.isAnonymous()) { return #err(#notAuthorized) };
    await storeUpdateDeal(id, deal);
  };

  public shared ({ caller }) func deleteDeal(id : Nat) : async Types.PipelineResult<()> {
    if (caller.isAnonymous()) { return #err(#notAuthorized) };
    await storeDeleteDeal(id);
  };

  public shared ({ caller }) func addStakeholder(dealId : Nat, stakeholder : Types.Stakeholder) : async Types.PipelineResult<Types.Deal> {
    if (caller.isAnonymous()) { return #err(#notAuthorized) };
    await storeAddStakeholder(dealId, stakeholder);
  };

  public shared ({ caller }) func updateStakeholder(dealId : Nat, stakeholderIndex : Nat, stakeholder : Types.Stakeholder) : async Types.PipelineResult<Types.Deal> {
    if (caller.isAnonymous()) { return #err(#notAuthorized) };
    await storeUpdateStakeholder(dealId, stakeholderIndex, stakeholder);
  };

  public shared ({ caller }) func resetSampleData() : async Types.PipelineResult<()> {
    if (caller.isAnonymous()) { return #err(#notAuthorized) };
    await seedSampleData();
    #ok(());
  };
};
