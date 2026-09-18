/// Static behavioral API documentation for the pipeline forecasting backend.
/// The document is a compile-time literal: it reads no actor state, so the
/// mixin takes no parameters and the method is a plain query.
mixin () {
  public query func getApiDoc() : async Text {
    "# Pipeline Revenue Forecasting & Deal-Risk API\n\n" #
    "## Purpose\n\n" #
    "This backend stores a synthetic CRM pipeline (open deals plus a historical\n" #
    "closed-won/closed-lost baseline) and exposes a statistical layer over it:\n\n" #
    "- **Weighted pipeline** — each open deal is weighted by the win probability of\n" #
    "  its stage, derived from the historical baseline.\n" #
    "- **Risk scoring** — every open deal receives a transparent, weighted risk\n" #
    "  score built from individually attributable signals (activity stall,\n" #
    "  engagement drop-off, close-date pushes, missing key stakeholders, stage\n" #
    "  duration versus the historical average).\n" #
    "- **Probabilistic forecast** — a most-likely value plus a low/high confidence\n" #
    "  range, never a single point estimate.\n" #
    "- **LLM reasoning** — Caffeine Inference generates a specific explanation and a\n" #
    "  recommended next action per at-risk deal, and a written rationale for the\n" #
    "  forecast.\n\n" #
    "The dataset is seeded on first install and can be restored at any time with\n" #
    "`resetSampleData`. No upload or import step is required.\n\n" #
    "## Authentication and authorization\n\n" #
    "- **Reads** (`listDeals`, `getDeal`, `listDealRisks`, `getForecast`,\n" #
    "  `getBaseline`, `getDealReasoning`, `getForecastRationale`, `getApiDoc`) are\n" #
    "  `query` methods and are callable by anyone, including anonymous callers.\n" #
    "- **Mutations** (`createDeal`, `updateDeal`, `deleteDeal`, `addStakeholder`,\n" #
    "  `updateStakeholder`, `resetSampleData`) require a **signed (non-anonymous)\n" #
    "  caller**. An anonymous caller receives `#err(#notAuthorized)`; the call is\n" #
    "  rejected before any state changes.\n" #
    "- **Reasoning generation** (`generateDealReasoning`, `generateForecastRationale`)\n" #
    "  is callable by any caller, including anonymous ones. It spends the platform's\n" #
    "  inference budget, so treat it as a shared resource and do not poll it.\n" #
    "- There is no per-user data partitioning: every signed-in caller sees and edits\n" #
    "  the same pipeline. This is a shared team dataset, not per-user storage.\n\n" #
    "### Identity derivation\n\n" #
    "The frontend pins an Internet Identity derivation origin, published at\n" #
    "`/.well-known/ii-derivation-origin` when available. An agent that already holds\n" #
    "the user's Internet Identity authorization derives the correct per-app\n" #
    "principal against that origin, for example:\n\n" #
    "```\n" #
    "icp identity link web <name> --app <host>\n" #
    "```\n\n" #
    "Such a delegation acts with the user's full authority in this app until it\n" #
    "expires. A principal derived against a different origin is a **different\n" #
    "principal** than the one the frontend registered, so it will not be recognized\n" #
    "as the same caller.\n\n" #
    "## Units and encodings\n\n" #
    "- **Amounts** (`amount`, `mostLikely`, `low`, `high`, `naivePipeline`,\n" #
    "  `repCommitEstimate`, `totalValue`, `weightedValue`) are whole currency units\n" #
    "  (no minor units, no decimals).\n" #
    "- **Dates** (`expectedCloseDate`, `createdDate`, `lastActivityDate`,\n" #
    "  `lastContacted`, `computedAt`, `explanationGeneratedAt`,\n" #
    "  `rationaleGeneratedAt`) are **epoch milliseconds** as `Int`. They are not\n" #
    "  nanoseconds and not seconds.\n" #
    "- **Scores and rates** (`score`, `winRate`, `avgDaysInStage`,\n" #
    "  `forecastErrorPct`, `weight`, `contribution`) are `Float`.\n" #
    "- **Optional timestamps** (`explanationGeneratedAt`, `rationaleGeneratedAt`)\n" #
    "  are `null` until the corresponding reasoning has been generated.\n" #
    "- **Enumerations** are Candid variants: `DealStage` (`#prospecting`,\n" #
    "  `#qualification`, `#proposal`, `#negotiation`, `#closedWon`, `#closedLost`),\n" #
    "  `StakeholderRole` (`#economicBuyer`, `#champion`, `#technicalEvaluator`,\n" #
    "  `#procurement`, `#blocker`), `EngagementLevel` (`#high`, `#medium`, `#low`,\n" #
    "  `#none`), `RiskBucket` (`#high`, `#medium`, `#low`).\n" #
    "- **Stakeholders** are embedded in each `Deal` as an ordered array. A\n" #
    "  stakeholder is addressed by its **index** in that array, not by an id.\n\n" #
    "## Lifecycle and polling\n\n" #
    "- The pipeline is seeded on first install. `resetSampleData` clears all open\n" #
    "  deals and the baseline and regenerates the deterministic synthetic dataset\n" #
    "  (~150 open deals plus the closed baseline). It is **destructive**: any deals\n" #
    "  created or edited since the last seed are lost.\n" #
    "- `listDealRisks` and `getForecast` are computed on every call from current\n" #
    "  state; the statistical numbers are not cached. `getForecast` returns\n" #
    "  `computedAt` so a client can tell when the numbers were produced.\n" #
    "- Generated reasoning is **merged into the main read paths**. Once\n" #
    "  `generateDealReasoning` has run for a deal, `listDealRisks` returns that\n" #
    "  deal's persisted `explanation`, `recommendedAction`, and\n" #
    "  `explanationGeneratedAt`; once `generateForecastRationale` has run,\n" #
    "  `getForecast` returns the persisted `rationale` and `rationaleGeneratedAt`.\n" #
    "  A refresh therefore keeps the generated text without regenerating it.\n" #
    "- `generateDealReasoning` and `generateForecastRationale` are **async update\n" #
    "  calls that may take several seconds** because they call an LLM. Do not poll\n" #
    "  them in a tight loop. Call once, await the result, and render it.\n" #
    "- Generated reasoning is **cached and persisted**: `generateDealReasoning`\n" #
    "  stores the enriched `DealRisk` in the reasoning cache, and\n" #
    "  `generateForecastRationale` stores the rationale text and timestamp. Read them\n" #
    "  back with `getDealReasoning` / `getForecastRationale` without regenerating.\n" #
    "- Regenerating a deal's reasoning uses the previously cached risk (including its\n" #
    "  prior explanation) as the base, so repeated generation refines rather than\n" #
    "  discards earlier context.\n\n" #
    "## Mutation retry safety\n\n" #
    "- `createDeal` assigns the next id server-side and **ignores any id supplied in\n" #
    "  the payload**. Retrying a create after a timeout therefore creates a\n" #
    "  **duplicate deal** — it is not idempotent. Confirm success before retrying.\n" #
    "- `updateDeal`, `deleteDeal`, `addStakeholder`, and `updateStakeholder` are\n" #
    "  idempotent for the same arguments: applying them twice leaves the same state.\n" #
    "- `addStakeholder` appends to the stakeholder array, so retrying it duplicates\n" #
    "  the stakeholder. Use `updateStakeholder` with the known index to correct an\n" #
    "  entry instead.\n" #
    "- `resetSampleData` is destructive and not idempotent in effect: each call\n" #
    "  discards current state and reseeds.\n" #
    "- `generateDealReasoning` and `generateForecastRationale` are safe to retry but\n" #
    "  each retry spends inference budget and overwrites the cached text.\n\n" #
    "## Errors\n\n" #
    "Mutating endpoints return `PipelineResult<T>`, which is either `#ok(value)` or\n" #
    "`#err(PipelineError)`:\n\n" #
    "- `#notFound(id)` — no deal exists with the given id (returned by `updateDeal`,\n" #
    "  `deleteDeal`, `addStakeholder`, `updateStakeholder`,\n" #
    "  `generateDealReasoning`).\n" #
    "- `#invalidInput(message)` — the payload failed validation. `createDeal` and\n" #
    "  `updateDeal` reject an empty deal name and a zero amount. `updateStakeholder`\n" #
    "  rejects an out-of-range stakeholder index. The reasoning endpoints return\n" #
    "  `#invalidInput` when the inference call fails, with a retry message.\n" #
    "- `#notAuthorized` — the caller is anonymous on a mutation endpoint.\n\n" #
    "Read endpoints return their value directly (`?Deal` for `getDeal`, `null` when\n" #
    "absent) and do not use `PipelineResult`.\n\n" #
    "## Gotchas\n\n" #
    "- **Reasoning endpoints are slow.** They await an LLM and can take seconds.\n" #
    "  Render a loading state and do not block the whole dashboard on them.\n" #
    "- **Reasoning is cached and persisted.** `listDealRisks` and `getForecast`\n" #
    "  already return the generated text once it exists, so prefer those reads; only\n" #
    "  generate when the user explicitly asks for a fresh explanation.\n" #
    "- **`resetSampleData` restores the seeded dataset** and destroys any edits.\n" #
    "- **Amounts are whole currency units** — do not divide by 100 when displaying.\n" #
    "- **Dates are epoch milliseconds** — convert with the platform's millisecond\n" #
    "  date handling, not seconds.\n" #
    "- **`getDeal` returns an option**, while the list endpoints return arrays; an\n" #
    "  unknown id is `null`, not an error.\n" #
    "- **Stakeholders are index-addressed** and their order is the array order; an\n" #
    "  index shifts when a stakeholder is added.\n" #
    "- **The forecast always carries a range.** `low` and `high` bound `mostLikely`;\n" #
    "  present the range, not just the point value.\n" #
    "- **Risk signals are individually attributable.** Each `RiskSignal` carries a\n" #
    "  `code`, a human-readable `caption`, a `detail`, and its `weight` and\n" #
    "  `contribution` to the total `score`, so an explanation can name the exact\n" #
    "  signals that drove the score.\n"
  };
};
