import Types "../types/pipeline";
import Llm "../lib/pipeline-llm";
import PipelineStats "pipeline-stats";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Inference "mo:caffeineai-inference-client/Config";
import ChatApi "mo:caffeineai-inference-client/Apis/ChatApi";
import ChatCompletionRequest "mo:caffeineai-inference-client/Models/ChatCompletionRequest";
import ChatCompletionRequestMessageOneOf "mo:caffeineai-inference-client/Models/ChatCompletionRequestMessageOneOf";
import ChatCompletionRequestMessageOneOf2 "mo:caffeineai-inference-client/Models/ChatCompletionRequestMessageOneOf2";

/// LLM reasoning layer. Generates a specific, signal-grounded risk explanation
/// and next action per deal, and a written rationale for the forecast, using
/// Caffeine Inference. Generated text is persisted in `reasoningCache` /
/// `forecastRationale` so it survives refresh.
mixin (
  deals : Map.Map<Nat, Types.Deal>,
  baselineDeals : List.List<Types.Deal>,
  reasoningCache : Map.Map<Nat, Types.DealRisk>,
  forecastRationale : { var text : Text; var generatedAt : ?Int },
) {
  // ---------------------------------------------------------------------------
  // Inference call
  //
  // Config.fromEnv<system>() is called inside the shared method on every request
  // so the platform-provisioned credentials are always current. The model is
  // always "router" — there is no model picker.
  // ---------------------------------------------------------------------------

  func runInference<system>(systemPrompt : Text, userPrompt : Text) : async* Text {
    let config = Inference.fromEnv<system>();
    let systemMessage = ChatCompletionRequestMessageOneOf.JSON.init({
      content = #string(systemPrompt);
      role = #system_;
    });
    let userMessage = ChatCompletionRequestMessageOneOf2.JSON.init({
      content = #string(userPrompt);
      role = #user;
    });
    let req = {
      ChatCompletionRequest.JSON.init({
        messages = [#system_(systemMessage), #user(userMessage)];
        model = "router";
      }) with
      temperature = ?0.2;
    };
    let resp = await* ChatApi.createChatCompletion(config, req);
    if (resp.choices.size() == 0) {
      Runtime.trap("Inference returned no choices");
    };
    resp.choices[0].message.content
      ?? Runtime.trap("Inference returned no text content");
  };

  // ---------------------------------------------------------------------------
  // Persisted reasoning reads
  // ---------------------------------------------------------------------------

  public query func getDealReasoning(dealId : Nat) : async ?Types.DealRisk {
    reasoningCache.get(dealId);
  };

  public query func getForecastRationale() : async ?{ text : Text; generatedAt : Int } {
    switch (forecastRationale.generatedAt) {
      case (?at) { ?{ text = forecastRationale.text; generatedAt = at } };
      case null { null };
    };
  };

  // ---------------------------------------------------------------------------
  // Deal reasoning
  // ---------------------------------------------------------------------------

  public shared ({ caller }) func generateDealReasoning(dealId : Nat) : async Types.PipelineResult<Types.DealRisk> {
    ignore caller;
    let deal = switch (deals.get(dealId)) {
      case (?d) { d };
      case null { return #err(#notFound(dealId)) };
    };
    let baseline = PipelineStats.buildBaseline(baselineDeals.toArray());
    let now = PipelineStats.nowMs();
    // Prefer the cached (already enriched) risk so a regeneration keeps the
    // prior explanation as its base; fall back to the statistical layer.
    let risk = switch (reasoningCache.get(dealId)) {
      case (?cached) { cached };
      case null { PipelineStats.riskFor(deal, baseline.stageStats, now) };
    };
    let userPrompt = Llm.buildDealPrompt(deal, risk, baseline, now);
    let response = try {
      await* runInference<system>(Llm.DEAL_SYSTEM_PROMPT, userPrompt);
    } catch (_) {
      return #err(#invalidInput("Reasoning generation failed. Please retry."));
    };
    let (explanation, action) = Llm.parseDealResponse(response);
    let updated : Types.DealRisk = {
      risk with
      explanation;
      recommendedAction = if (action == "") { risk.recommendedAction } else { action };
      explanationGeneratedAt = ?now;
    };
    reasoningCache.add(dealId, updated);
    #ok(updated);
  };

  // ---------------------------------------------------------------------------
  // Forecast rationale
  // ---------------------------------------------------------------------------

  public shared ({ caller }) func generateForecastRationale() : async Types.PipelineResult<Types.Forecast> {
    ignore caller;
    let all = deals.values().toArray();
    let baseline = PipelineStats.buildBaseline(baselineDeals.toArray());
    let now = PipelineStats.nowMs();
    let forecast = PipelineStats.computeForecast(all, baseline, now);
    let topDeals = PipelineStats.rankRisks(all, baseline.stageStats, now);
    let top = if (topDeals.size() > 8) { topDeals.sliceToArray(0, 8) } else { topDeals };
    let dealsById = all.map(func(d) = (d.id, d));
    let userPrompt = Llm.buildForecastPrompt(forecast, baseline, top, dealsById);
    let response = try {
      await* runInference<system>(Llm.FORECAST_SYSTEM_PROMPT, userPrompt);
    } catch (_) {
      return #err(#invalidInput("Forecast rationale generation failed. Please retry."));
    };
    let rationale = Llm.parseForecastResponse(response);
    forecastRationale.text := rationale;
    forecastRationale.generatedAt := ?now;
    #ok({ forecast with rationale; rationaleGeneratedAt = ?now });
  };
};
