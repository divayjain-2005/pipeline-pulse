/**
 * WeeklyReviewPage — manager triage journeys.
 *
 * Covers the accepted behavior that the weekly review surfaces only the deals
 * that need attention (High then Medium risk), orders them by risk score
 * descending, shows each deal's specific top risk reason and recommended next
 * action, and can run the risk analysis for a deal that has no written
 * explanation yet.
 */

import { RiskBucket } from "@/lib/pipeline";
import { makeDeal, makeRisk, makeSeededPipeline } from "@/test/fixtures";
import { createMockActor, renderApp } from "@/test/render";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const holder = vi.hoisted(() => ({
  actor: undefined as unknown,
}));

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: holder.actor, isFetching: false }),
}));

import type { backendInterface } from "@/backend";

describe("WeeklyReviewPage", () => {
  beforeEach(() => {
    holder.actor = undefined;
  });

  it("lists only High and Medium risk deals, highest score first", async () => {
    const { deals, risks } = makeSeededPipeline();
    holder.actor = createMockActor({
      listDeals: async () => deals,
      listDealRisks: async () => risks,
    });

    renderApp({ initialPath: "/weekly" });

    await screen.findByTestId("weekly.list");

    // Rank 1 is the highest-scoring High-risk deal.
    const first = screen.getByTestId("weekly.item.1");
    expect(first).toHaveTextContent("Enterprise Renewal");
    expect(first).toHaveTextContent("82");
    expect(screen.getByTestId("weekly.risk_chip.1")).toHaveTextContent("High");

    // Rank 2 is the Medium-risk deal.
    const second = screen.getByTestId("weekly.item.2");
    expect(second).toHaveTextContent("Platform Expansion");
    expect(second).toHaveTextContent("55");
    expect(screen.getByTestId("weekly.risk_chip.2")).toHaveTextContent(
      "Medium",
    );

    // The Low-risk deal is not in the triage list.
    expect(screen.queryByTestId("weekly.item.3")).not.toBeInTheDocument();
    expect(screen.queryByText("Pilot Rollout")).not.toBeInTheDocument();
  });

  it("shows the specific top risk reason and recommended action per deal", async () => {
    const { deals, risks } = makeSeededPipeline();
    holder.actor = createMockActor({
      listDeals: async () => deals,
      listDealRisks: async () => risks,
    });

    renderApp({ initialPath: "/weekly" });

    const first = await screen.findByTestId("weekly.item.1");
    expect(first).toHaveTextContent("Activity has stalled for 14 days");
    expect(first).toHaveTextContent(
      "Call Dana Whitfield to confirm the redline review date",
    );

    const second = screen.getByTestId("weekly.item.2");
    expect(second).toHaveTextContent("Close date pushed twice");
    expect(second).toHaveTextContent(
      "Email Marcus Lee to re-baseline the close plan",
    );
  });

  it("summarizes the count, combined value, and high-risk count", async () => {
    const { deals, risks } = makeSeededPipeline();
    holder.actor = createMockActor({
      listDeals: async () => deals,
      listDealRisks: async () => risks,
    });

    renderApp({ initialPath: "/weekly" });

    const summary = await screen.findByTestId("weekly.summary");
    // Two attention deals: 250k + 180k = 430k.
    expect(summary).toHaveTextContent("Deals needing attention");
    expect(summary).toHaveTextContent("2");
    expect(summary).toHaveTextContent("Combined value");
    expect(summary).toHaveTextContent("$430K");
    expect(summary).toHaveTextContent("High risk");
  });

  it("runs the risk analysis for a deal with no written explanation", async () => {
    const deal = makeDeal({ id: 7n, name: "Stalled Renewal" });
    const risk = makeRisk({
      dealId: 7n,
      score: 68,
      bucket: RiskBucket.high,
      explanation: "",
      explanationGeneratedAt: undefined,
    });
    const generateDealReasoning = vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: makeRisk({
        dealId: 7n,
        score: 68,
        bucket: RiskBucket.high,
        explanation: "Freshly generated reasoning for the stalled renewal.",
      }),
    }));
    holder.actor = createMockActor({
      listDeals: async () => [deal],
      listDealRisks: async () => [risk],
      generateDealReasoning:
        generateDealReasoning as unknown as backendInterface["generateDealReasoning"],
    });

    renderApp({ initialPath: "/weekly" });

    const runButton = await screen.findByTestId("weekly.run_analysis_button.1");
    await userEvent.click(runButton);

    await waitFor(() => {
      expect(generateDealReasoning).toHaveBeenCalledWith(7n);
    });
  });

  it("shows an empty state when no deal is High or Medium risk", async () => {
    const deal = makeDeal({ id: 3n, name: "Pilot Rollout" });
    holder.actor = createMockActor({
      listDeals: async () => [deal],
      listDealRisks: async () => [
        makeRisk({ dealId: 3n, score: 20, bucket: RiskBucket.low }),
      ],
    });

    renderApp({ initialPath: "/weekly" });

    const empty = await screen.findByTestId("weekly.empty_state");
    expect(
      within(empty).getByText("Nothing at risk this week"),
    ).toBeInTheDocument();
  });
});
