import List "mo:core/List";
import Map "mo:core/Map";
import Types "../types/pipeline";
import SampleDeals "../seed/sample-deals";
import PipelineStats "pipeline-stats";

/// Persistent pipeline state plus the seeding and CRUD primitives that back the
/// public API. State is injected by `main.mo` so it survives upgrades through
/// the migration chain. First-install seeding is performed by the migration;
/// `seedSampleData` re-seeds from the same deterministic generator.
///
/// The primitives here are named with a `store` prefix so they do not collide
/// with the public endpoint names declared in `pipeline-api.mo`.
mixin (
  deals : Map.Map<Nat, Types.Deal>,
  baselineDeals : List.List<Types.Deal>,
  state : { var nextDealId : Nat },
) {
  // ---------------------------------------------------------------------------
  // Seeding
  // ---------------------------------------------------------------------------

  /// Replaces all pipeline state with the deterministic synthetic dataset.
  public func seedSampleData() : async () {
    let nowMs = PipelineStats.nowMs();
    let seed = SampleDeals.seed(nowMs);
    deals.clear();
    baselineDeals.clear();
    for (deal in seed.deals.values()) {
      deals.add(deal.id, deal);
    };
    for (deal in seed.baseline.values()) {
      baselineDeals.add(deal);
    };
    state.nextDealId := seed.deals.size() + 1;
  };

  // ---------------------------------------------------------------------------
  // Read primitives
  // ---------------------------------------------------------------------------

  public func storeListDeals() : async [Types.Deal] {
    deals.values().toArray();
  };

  public func storeGetDeal(id : Nat) : async ?Types.Deal {
    deals.get(id);
  };

  public func storeBaseline() : async Types.HistoricalBaseline {
    PipelineStats.buildBaseline(baselineDeals.toArray());
  };

  // ---------------------------------------------------------------------------
  // Mutation primitives
  // ---------------------------------------------------------------------------

  public func storeCreateDeal(deal : Types.Deal) : async Types.PipelineResult<Types.Deal> {
    if (deal.name.size() == 0) { return #err(#invalidInput("Deal name is required")) };
    if (deal.amount == 0) { return #err(#invalidInput("Deal amount must be greater than zero")) };
    let id = state.nextDealId;
    state.nextDealId := id + 1;
    let created : Types.Deal = { deal with id };
    deals.add(id, created);
    #ok(created);
  };

  public func storeUpdateDeal(id : Nat, deal : Types.Deal) : async Types.PipelineResult<Types.Deal> {
    switch (deals.get(id)) {
      case null { return #err(#notFound(id)) };
      case (?_) {};
    };
    if (deal.name.size() == 0) { return #err(#invalidInput("Deal name is required")) };
    if (deal.amount == 0) { return #err(#invalidInput("Deal amount must be greater than zero")) };
    let updated : Types.Deal = { deal with id };
    deals.add(id, updated);
    #ok(updated);
  };

  public func storeDeleteDeal(id : Nat) : async Types.PipelineResult<()> {
    switch (deals.get(id)) {
      case null { #err(#notFound(id)) };
      case (?_) {
        deals.remove(id);
        #ok(());
      };
    };
  };

  public func storeAddStakeholder(dealId : Nat, stakeholder : Types.Stakeholder) : async Types.PipelineResult<Types.Deal> {
    switch (deals.get(dealId)) {
      case null { #err(#notFound(dealId)) };
      case (?deal) {
        let updated : Types.Deal = {
          deal with
          stakeholders = deal.stakeholders.concat([stakeholder]);
        };
        deals.add(dealId, updated);
        #ok(updated);
      };
    };
  };

  public func storeUpdateStakeholder(dealId : Nat, stakeholderIndex : Nat, stakeholder : Types.Stakeholder) : async Types.PipelineResult<Types.Deal> {
    switch (deals.get(dealId)) {
      case null { #err(#notFound(dealId)) };
      case (?deal) {
        if (stakeholderIndex >= deal.stakeholders.size()) {
          return #err(#invalidInput("Stakeholder index out of range"));
        };
        let updatedStakeholders = deal.stakeholders.mapEntries(
          func(s, i) = if (i == stakeholderIndex) { stakeholder } else { s }
        );
        let updated : Types.Deal = { deal with stakeholders = updatedStakeholders };
        deals.add(dealId, updated);
        #ok(updated);
      };
    };
  };
};
