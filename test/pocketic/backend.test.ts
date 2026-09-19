/**
 * PocketIC backend lane for the pipeline forecasting canister.
 *
 * Installs the app's own compiled wasm into the platform's PocketIC replica and
 * calls the real public API, so a canister whose methods are unimplemented
 * stubs that trap at runtime fails the gate instead of passing behind a mock.
 *
 * The runner sets POCKET_IC_URL and BACKEND_WASM before Vitest starts; this
 * file only consumes them. It speaks the Candid declarations' shapes, not the
 * TypeScript wrapper's: `Nat`/`Int` are bigint, `?T` is `[] | [T]`, and a
 * variant is `{ variantName: null }`.
 *
 * The mutation endpoints intentionally reject anonymous callers with
 * `#err(#notAuthorized)` (see `mixins/pipeline-api.mo` and the API doc), so the
 * mutation tests install a non-anonymous principal before calling them. The
 * lane's actor is anonymous by default.
 */

import { PocketIc } from "@dfinity/pic";
import { Principal } from "@icp-sdk/core/principal";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";
// Set only on a converted project: the last pre-EM revision, whose schema this
// app's migration chain replays from. Installing the current wasm onto an empty
// canister there traps IC0503 before any test runs.
const BASELINE_WASM = process.env.BACKEND_WASM_BASELINE;

/** A stable non-anonymous caller for the mutation endpoints. */
const SIGNED_IN = Principal.fromText("aaaaa-aa");

let pic: PocketIc | undefined;
let actor: _SERVICE;

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  if (BASELINE_WASM === undefined) {
    ({ actor } = await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: BACKEND_WASM,
    }));
    return;
  }
  // `[baseline, current]`, the same install contract the hosted deploy uses for
  // a converted project. The upgrade replays the chain from the legacy schema.
  const installed = await pic.setupCanister<_SERVICE>({
    idlFactory,
    wasm: BASELINE_WASM,
  });
  await pic.upgradeCanister({
    canisterId: installed.canisterId,
    wasm: BACKEND_WASM,
    arg: new Uint8Array(),
  });
  actor = installed.actor;
});

afterAll(async () => {
  // `?.` because `beforeAll` may not have got that far. A failed
  // `PocketIc.create` otherwise stacks "Cannot read properties of undefined"
  // on top of the real error and buries the one line that explains the run.
  await pic?.tearDown();
});

it("ships a populated synthetic dataset on first load", async () => {
  const deals = await actor.listDeals();
  expect(deals.length).toBeGreaterThanOrEqual(100);
  expect(deals.length).toBeLessThanOrEqual(200);
  // Every seeded deal carries the fields the dashboard renders.
  for (const deal of deals) {
    expect(typeof deal.name).toBe("string");
    expect(deal.name.length).toBeGreaterThan(0);
    expect(typeof deal.account).toBe("string");
    expect(typeof deal.owner).toBe("string");
    expect(deal.amount).toBeGreaterThan(0n);
  }
});

it("returns a forecast with an explicit low-high confidence range", async () => {
  const forecast = await actor.getForecast();
  expect(forecast.low).toBeLessThanOrEqual(forecast.mostLikely);
  expect(forecast.mostLikely).toBeLessThanOrEqual(forecast.high);
  expect(forecast.low).toBeLessThan(forecast.high);
  expect(forecast.confidenceLabel.length).toBeGreaterThan(0);
  expect(forecast.rangeBasis.length).toBeGreaterThan(0);
  // The naive baseline comparison is part of the same payload.
  expect(forecast.naivePipeline).toBeGreaterThan(0n);
  expect(forecast.repCommitEstimate).toBeGreaterThan(0n);
});

it("scores every open deal with a transparent weighted risk record", async () => {
  const risks = await actor.listDealRisks();
  expect(risks.length).toBeGreaterThan(0);
  for (const risk of risks) {
    expect(risk.score).toBeGreaterThanOrEqual(0);
    expect(risk.score).toBeLessThanOrEqual(100);
    // `bucket` is a Candid variant, so it arrives as `{ high: null }` etc.
    const bucketKeys = Object.keys(risk.bucket);
    expect(bucketKeys).toHaveLength(1);
    expect(["high", "medium", "low"]).toContain(bucketKeys[0]);
    expect(risk.topReason.length).toBeGreaterThan(0);
    expect(risk.recommendedAction.length).toBeGreaterThan(0);
    // Signals are the transparent breakdown: each names a code and a weight.
    expect(risk.signals.length).toBeGreaterThan(0);
    for (const signal of risk.signals) {
      expect(signal.code.length).toBeGreaterThan(0);
      expect(signal.caption.length).toBeGreaterThan(0);
      expect(signal.weight).toBeGreaterThanOrEqual(0);
      expect(signal.weight).toBeLessThanOrEqual(100);
    }
  }
});

it("rejects an anonymous caller on a mutation endpoint", async () => {
  actor.setPrincipal(Principal.anonymous());
  const result = await actor.createDeal({
    id: 0n,
    name: "Anonymous attempt",
    account: "Nobody",
    owner: "Nobody",
    stage: { qualification: null },
    amount: 1n,
    expectedCloseDate: BigInt(Date.now()),
    lastActivityDate: BigInt(Date.now()),
    notes: "",
    createdDate: BigInt(Date.now()),
    closeDatePushes: 0n,
    activityLast30Days: 0n,
    activityPrior30Days: 0n,
    stakeholders: [],
    // `repEstimate` is a required Candid record key (`?Nat`); omitting it makes
    // the encoder throw before the call reaches the canister.
    repEstimate: [],
  });
  expect(result).toEqual({ err: { notAuthorized: null } });
});

it("round-trips a deal through create, read, update, and delete", async () => {
  actor.setPrincipal(SIGNED_IN);
  const now = BigInt(Date.now());
  const draft = {
    id: 0n,
    name: "Lane round-trip deal",
    account: "Lane Test Co",
    owner: "Lane Tester",
    stage: { qualification: null },
    amount: 250_000n,
    expectedCloseDate: now + 30n * 86_400_000n,
    lastActivityDate: now,
    notes: "created by the backend lane",
    createdDate: now,
    closeDatePushes: 0n,
    activityLast30Days: 0n,
    activityPrior30Days: 0n,
    stakeholders: [],
    repEstimate: [275_000n],
  };

  const created = await actor.createDeal(draft);
  expect(created).toHaveProperty("ok");
  const createdId = (created as { ok: { id: bigint } }).ok.id;
  expect(createdId).toBeGreaterThan(0n);

  const fetched = await actor.getDeal(createdId);
  expect(fetched).toHaveLength(1);
  expect(fetched[0]).toMatchObject({ name: "Lane round-trip deal" });

  const updated = await actor.updateDeal(createdId, {
    ...draft,
    id: createdId,
    stage: { negotiation: null },
    amount: 300_000n,
  });
  expect(updated).toHaveProperty("ok");
  const afterUpdate = await actor.getDeal(createdId);
  expect(afterUpdate[0]).toMatchObject({ amount: 300_000n });

  const deleted = await actor.deleteDeal(createdId);
  expect(deleted).toHaveProperty("ok");
  expect(await actor.getDeal(createdId)).toEqual([]);
});

it("adds and updates a stakeholder on a real deal", async () => {
  actor.setPrincipal(SIGNED_IN);
  const deals = await actor.listDeals();
  const target = deals[0];
  expect(target).toBeDefined();
  const dealId = target.id;

  const added = await actor.addStakeholder(dealId, {
    name: "Lane Stakeholder",
    role: { champion: null },
    lastContacted: BigInt(Date.now()),
    engagement: { high: null },
  });
  expect(added).toHaveProperty("ok");

  const afterAdd = await actor.getDeal(dealId);
  const index = afterAdd[0].stakeholders.findIndex(
    (s) => s.name === "Lane Stakeholder",
  );
  expect(index).toBeGreaterThanOrEqual(0);

  const updated = await actor.updateStakeholder(dealId, BigInt(index), {
    name: "Lane Stakeholder",
    role: { champion: null },
    lastContacted: BigInt(Date.now()),
    engagement: { low: null },
  });
  expect(updated).toHaveProperty("ok");
});

it("resets to the seeded dataset", async () => {
  actor.setPrincipal(SIGNED_IN);
  const result = await actor.resetSampleData();
  expect(result).toHaveProperty("ok");
  const deals = await actor.listDeals();
  expect(deals.length).toBeGreaterThanOrEqual(100);
});

it("returns a historical baseline with stage win rates", async () => {
  const baseline = await actor.getBaseline();
  expect(baseline.closedDealCount).toBeGreaterThan(0n);
  expect(baseline.overallWinRate).toBeGreaterThanOrEqual(0);
  expect(baseline.overallWinRate).toBeLessThanOrEqual(1);
  expect(baseline.stageStats.length).toBeGreaterThan(0);
});

it("scores held-out quarters against actual closed-won revenue", async () => {
  const backtest = await actor.getBacktest();
  // At least four past quarters of closed history must be scored.
  expect(backtest.rows.length).toBeGreaterThanOrEqual(4);
  expect(backtest.holdoutQuarterCount).toBe(BigInt(backtest.rows.length));
  expect(backtest.verdict.length).toBeGreaterThan(0);
  // Averages are means of absolute errors, so they are non-negative.
  expect(backtest.avgModelErrorPct).toBeGreaterThanOrEqual(0);
  expect(backtest.avgRepErrorPct).toBeGreaterThanOrEqual(0);

  for (const row of backtest.rows) {
    expect(row.quarterLabel.length).toBeGreaterThan(0);
    expect(row.quarterEnd).toBeGreaterThan(row.quarterStart);
    expect(row.actualWon).toBeGreaterThan(0n);
    expect(row.wonDealCount).toBeGreaterThan(0n);
    expect(row.dealCount).toBeGreaterThan(0n);
    // The signed error is consistent with the forecast and the actual.
    expect(row.modelErrorDelta).toBe(row.modelForecast - row.actualWon);
    expect(row.repErrorDelta).toBe(row.repEstimateTotal - row.actualWon);
    // Unestimated quarters report zero estimates and no estimated deals.
    if (row.estimatedDealCount === 0n) {
      expect(row.repEstimateTotal).toBe(0n);
    }
  }
});

it("round-trips a rep estimate through create and update", async () => {
  actor.setPrincipal(SIGNED_IN);
  const now = BigInt(Date.now());
  const draft = {
    id: 0n,
    name: "Lane rep-estimate deal",
    account: "Lane Test Co",
    owner: "Lane Tester",
    stage: { qualification: null },
    amount: 200_000n,
    expectedCloseDate: now + 30n * 86_400_000n,
    lastActivityDate: now,
    notes: "created by the backend lane",
    createdDate: now,
    closeDatePushes: 0n,
    activityLast30Days: 0n,
    activityPrior30Days: 0n,
    stakeholders: [],
    repEstimate: [180_000n],
  };

  const created = await actor.createDeal(draft);
  expect(created).toHaveProperty("ok");
  const createdId = (created as { ok: { id: bigint } }).ok.id;

  const fetched = await actor.getDeal(createdId);
  expect(fetched).toHaveLength(1);
  expect(fetched[0].repEstimate).toEqual([180_000n]);

  // Clearing the estimate stores an absent option, not zero.
  const cleared = await actor.updateDeal(createdId, {
    ...draft,
    id: createdId,
    repEstimate: [],
  });
  expect(cleared).toHaveProperty("ok");
  const afterClear = await actor.getDeal(createdId);
  expect(afterClear[0].repEstimate).toEqual([]);

  await actor.deleteDeal(createdId);
});
