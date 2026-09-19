/**
 * DealDetailPage — full deal view journeys.
 *
 * Covers the accepted behavior that a deal opens with its full data,
 * stakeholder list, every contributing risk signal with its weight, the
 * persisted LLM explanation and recommended action, the activity history, and
 * that the page can edit the deal and re-run the risk analysis.
 */

import { StakeholderRole } from "@/lib/pipeline";
import { makeDeal, makeRisk, makeStakeholder } from "@/test/fixtures";
import { createMockActor, renderApp } from "@/test/render";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const holder = vi.hoisted(() => ({
  actor: undefined as unknown,
}));

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: holder.actor, isFetching: false }),
}));

import type { backendInterface } from "@/backend";

describe("DealDetailPage", () => {
  beforeEach(() => {
    holder.actor = undefined;
  });

  it("renders the full deal, stakeholders, signals, reasoning, and activity", async () => {
    const deal = makeDeal({
      id: 7n,
      name: "Enterprise Renewal",
      account: "Northwind Logistics",
      owner: "Priya Raman",
      amount: 250_000n,
      stakeholders: [
        makeStakeholder({
          name: "Dana Whitfield",
          role: StakeholderRole.economicBuyer,
        }),
      ],
    });
    const risk = makeRisk({ dealId: 7n, score: 72 });
    holder.actor = createMockActor({
      getDeal: async () => deal,
      listDealRisks: async () => [risk],
    });

    renderApp({ initialPath: "/deals/7" });

    await screen.findByTestId("deal_detail.header");
    // Full deal data.
    expect(screen.getByTestId("deal_detail.header")).toHaveTextContent(
      "Northwind Logistics",
    );
    expect(screen.getByTestId("deal_detail.header")).toHaveTextContent(
      "Priya Raman",
    );
    expect(screen.getByTestId("deal_detail.risk_score")).toHaveTextContent(
      "72",
    );

    // Stakeholder list.
    expect(
      screen.getByTestId("deal_detail.stakeholders_panel"),
    ).toHaveTextContent("Dana Whitfield");

    // Every contributing signal with its weight.
    expect(screen.getByTestId("deal_detail.signal.item.1")).toHaveTextContent(
      "Activity has stalled",
    );
    expect(screen.getByTestId("deal_detail.signal.item.1")).toHaveTextContent(
      "30%",
    );
    expect(screen.getByTestId("deal_detail.signal.item.2")).toHaveTextContent(
      "Close date pushed twice",
    );

    // Persisted LLM explanation and recommended action.
    expect(
      screen.getByTestId("deal_detail.reasoning_panel.explanation"),
    ).toHaveTextContent("activity stopped after the proposal stage");
    expect(
      screen.getByTestId("deal_detail.reasoning_panel.recommended_action"),
    ).toHaveTextContent("Call Dana Whitfield");

    // Activity history.
    expect(screen.getByTestId("deal_detail.activity_panel")).toHaveTextContent(
      "Activity history",
    );
  });

  it("shows an empty signal state when no risk record exists", async () => {
    const deal = makeDeal({ id: 7n });
    holder.actor = createMockActor({
      getDeal: async () => deal,
      listDealRisks: async () => [],
    });

    renderApp({ initialPath: "/deals/7" });

    await screen.findByTestId("deal_detail.header");
    expect(
      screen.getByTestId("deal_detail.signals_panel.empty_state"),
    ).toBeInTheDocument();
  });

  it("saves an edited last activity date through the update mutation", async () => {
    const deal = makeDeal({
      id: 7n,
      lastActivityDate: BigInt(Date.UTC(2026, 8, 1)),
    });
    const updateDeal = vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: deal,
    }));
    holder.actor = createMockActor({
      getDeal: async () => deal,
      listDealRisks: async () => [makeRisk({ dealId: 7n })],
      updateDeal: updateDeal as unknown as backendInterface["updateDeal"],
    });

    renderApp({ initialPath: "/deals/7" });
    await screen.findByTestId("deal_detail.edit_panel");

    const lastActivity = screen.getByTestId(
      "deal_detail.edit_form.last_activity_input",
    );
    // `type` does not drive a native date input in jsdom; an input event does.
    fireEvent.input(lastActivity, { target: { value: "2026-09-15" } });
    const saveButton = screen.getByTestId("deal_detail.edit_form.save_button");
    expect(saveButton).toBeEnabled();
    // jsdom does not reliably dispatch `submit` from a button click, so submit
    // the form the button belongs to directly.
    const form = saveButton.closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(updateDeal).toHaveBeenCalledTimes(1);
    });
    const [savedId, savedDeal] = updateDeal.mock.calls[0] as unknown as [
      bigint,
      { lastActivityDate: bigint },
    ];
    expect(savedId).toBe(7n);
    // 2026-09-15 local midnight, whatever the container timezone.
    expect(savedDeal.lastActivityDate).toBe(
      BigInt(new Date("2026-09-15T00:00:00").getTime()),
    );
  });

  it("saves an edited amount through the update mutation", async () => {
    const deal = makeDeal({ id: 7n, amount: 250_000n });
    const updateDeal = vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: deal,
    }));
    holder.actor = createMockActor({
      getDeal: async () => deal,
      listDealRisks: async () => [makeRisk({ dealId: 7n })],
      updateDeal: updateDeal as unknown as backendInterface["updateDeal"],
    });

    renderApp({ initialPath: "/deals/7" });
    await screen.findByTestId("deal_detail.edit_panel");

    fireEvent.change(screen.getByTestId("deal_detail.edit_form.amount_input"), {
      target: { value: "310000" },
    });

    const saveButton = screen.getByTestId("deal_detail.edit_form.save_button");
    const form = saveButton.closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(updateDeal).toHaveBeenCalledTimes(1);
    });
    const [savedId, savedDeal] = updateDeal.mock.calls[0] as unknown as [
      bigint,
      { amount: bigint },
    ];
    expect(savedId).toBe(7n);
    expect(savedDeal.amount).toBe(310_000n);
  });

  it("saves an edited rep estimate through the update mutation", async () => {
    const deal = makeDeal({ id: 7n, amount: 250_000n, repEstimate: 200_000n });
    const updateDeal = vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: deal,
    }));
    holder.actor = createMockActor({
      getDeal: async () => deal,
      listDealRisks: async () => [makeRisk({ dealId: 7n })],
      updateDeal: updateDeal as unknown as backendInterface["updateDeal"],
    });

    renderApp({ initialPath: "/deals/7" });
    await screen.findByTestId("deal_detail.edit_panel");

    const repEstimate = screen.getByTestId(
      "deal_detail.edit_form.rep_estimate_input",
    );
    // The field is seeded from the loaded deal.
    expect(repEstimate).toHaveValue(200000);
    fireEvent.change(repEstimate, { target: { value: "275000" } });

    const saveButton = screen.getByTestId("deal_detail.edit_form.save_button");
    const form = saveButton.closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(updateDeal).toHaveBeenCalledTimes(1);
    });
    const [savedId, savedDeal] = updateDeal.mock.calls[0] as unknown as [
      bigint,
      { repEstimate?: bigint },
    ];
    expect(savedId).toBe(7n);
    expect(savedDeal.repEstimate).toBe(275_000n);
  });

  it("shows the saved rep estimate and amount again after reloading the deal", async () => {
    const original = makeDeal({
      id: 7n,
      amount: 250_000n,
      repEstimate: 200_000n,
    });
    // The backend stores the write and serves it back on the next read, which
    // is what a page reload does.
    let stored = original;
    const updateDeal = vi.fn(async (_id: bigint, next: typeof original) => {
      stored = next;
      return { __kind__: "ok" as const, ok: next };
    });
    holder.actor = createMockActor({
      getDeal: async () => stored,
      listDealRisks: async () => [makeRisk({ dealId: 7n })],
      updateDeal: updateDeal as unknown as backendInterface["updateDeal"],
    });

    const first = renderApp({ initialPath: "/deals/7" });
    await screen.findByTestId("deal_detail.edit_panel");

    fireEvent.change(
      screen.getByTestId("deal_detail.edit_form.rep_estimate_input"),
      { target: { value: "275000" } },
    );
    fireEvent.change(screen.getByTestId("deal_detail.edit_form.amount_input"), {
      target: { value: "310000" },
    });

    const saveButton = screen.getByTestId("deal_detail.edit_form.save_button");
    const form = saveButton.closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(updateDeal).toHaveBeenCalledTimes(1);
    });
    const [, savedDeal] = updateDeal.mock.calls[0] as unknown as [
      bigint,
      { amount: bigint; repEstimate?: bigint },
    ];
    expect(savedDeal.amount).toBe(310_000n);
    expect(savedDeal.repEstimate).toBe(275_000n);

    // Reload: unmount and render the route fresh, so the form seeds from the
    // deal the backend now serves rather than from the previous draft.
    first.unmount();
    renderApp({ initialPath: "/deals/7" });
    await screen.findByTestId("deal_detail.edit_panel");

    expect(
      screen.getByTestId("deal_detail.edit_form.rep_estimate_input"),
    ).toHaveValue(275000);
    expect(
      screen.getByTestId("deal_detail.edit_form.amount_input"),
    ).toHaveValue(310000);
  });

  it("clears the rep estimate when the field is left blank", async () => {
    const deal = makeDeal({ id: 7n, repEstimate: 200_000n });
    const updateDeal = vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: deal,
    }));
    holder.actor = createMockActor({
      getDeal: async () => deal,
      listDealRisks: async () => [makeRisk({ dealId: 7n })],
      updateDeal: updateDeal as unknown as backendInterface["updateDeal"],
    });

    renderApp({ initialPath: "/deals/7" });
    await screen.findByTestId("deal_detail.edit_panel");

    fireEvent.change(
      screen.getByTestId("deal_detail.edit_form.rep_estimate_input"),
      { target: { value: "" } },
    );

    const saveButton = screen.getByTestId("deal_detail.edit_form.save_button");
    const form = saveButton.closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(updateDeal).toHaveBeenCalledTimes(1);
    });
    const [, savedDeal] = updateDeal.mock.calls[0] as unknown as [
      bigint,
      { repEstimate?: bigint },
    ];
    // Blank means unestimated: the optional field is omitted, not zero.
    expect(savedDeal.repEstimate).toBeUndefined();
  });

  it("rejects a negative rep estimate without saving", async () => {
    const deal = makeDeal({ id: 7n, repEstimate: 200_000n });
    const updateDeal = vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: deal,
    }));
    holder.actor = createMockActor({
      getDeal: async () => deal,
      listDealRisks: async () => [makeRisk({ dealId: 7n })],
      updateDeal: updateDeal as unknown as backendInterface["updateDeal"],
    });

    renderApp({ initialPath: "/deals/7" });
    await screen.findByTestId("deal_detail.edit_panel");

    fireEvent.change(
      screen.getByTestId("deal_detail.edit_form.rep_estimate_input"),
      { target: { value: "-5000" } },
    );

    expect(
      screen.getByTestId("deal_detail.edit_form.rep_estimate_error"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("deal_detail.edit_form.save_button"),
    ).toBeDisabled();
    expect(updateDeal).not.toHaveBeenCalled();
  });

  it("re-runs the risk analysis for the deal and renders the new explanation", async () => {
    const deal = makeDeal({ id: 7n });
    const regenerated = makeRisk({
      dealId: 7n,
      explanation: "Freshly generated explanation naming the stalled activity.",
    });
    const generateDealReasoning = vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: regenerated,
    }));
    holder.actor = createMockActor({
      getDeal: async () => deal,
      listDealRisks: async () => [makeRisk({ dealId: 7n, explanation: "" })],
      generateDealReasoning:
        generateDealReasoning as unknown as backendInterface["generateDealReasoning"],
    });

    renderApp({ initialPath: "/deals/7" });
    await screen.findByTestId("deal_detail.run_analysis_button");

    await userEvent.click(
      screen.getByTestId("deal_detail.run_analysis_button"),
    );

    await waitFor(() => {
      expect(generateDealReasoning).toHaveBeenCalledWith(7n);
    });
  });

  it("shows a not-found state when the deal does not exist", async () => {
    holder.actor = createMockActor({
      getDeal: async () => null,
      listDealRisks: async () => [],
    });

    renderApp({ initialPath: "/deals/999" });

    expect(
      await screen.findByTestId("deal_detail.not_found_state"),
    ).toBeInTheDocument();
  });
});
