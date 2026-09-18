/**
 * OverviewPage — leadership dashboard journeys.
 *
 * Covers the accepted behavior that the default route renders a populated
 * dashboard from the seeded dataset, leads with a forecast that has an explicit
 * low-high range, and shows the naive baseline comparison alongside it.
 */

import { makeForecast, makeRisk, makeSeededPipeline } from "@/test/fixtures";
import { createMockActor, renderApp } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const holder = vi.hoisted(() => ({
  actor: undefined as unknown,
}));

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: holder.actor, isFetching: false }),
}));

import type { backendInterface } from "@/backend";

describe("OverviewPage", () => {
  beforeEach(() => {
    holder.actor = undefined;
  });

  it("renders a populated dashboard from the seeded dataset", async () => {
    const { deals, risks } = makeSeededPipeline();
    holder.actor = createMockActor({
      listDeals: async () => deals,
      listDealRisks: async () => risks,
      getForecast: async () => makeForecast(),
    });

    renderApp({ initialPath: "/" });

    // The hero forecast card is present, not a blank screen.
    expect(await screen.findByTestId("overview.hero.card")).toBeInTheDocument();
    expect(screen.getByTestId("overview.hero.value")).toHaveTextContent(
      "$1,500,000",
    );
    // The seeded pipeline is reflected in the KPI grid.
    expect(screen.getByTestId("overview.kpi.deal_count")).toHaveTextContent(
      "4",
    );
  });

  it("shows the forecast with an explicit low-high confidence range", async () => {
    const { deals, risks } = makeSeededPipeline();
    holder.actor = createMockActor({
      listDeals: async () => deals,
      listDealRisks: async () => risks,
      getForecast: async () =>
        makeForecast({
          low: 1_100_000n,
          high: 1_900_000n,
          mostLikely: 1_500_000n,
        }),
    });

    renderApp({ initialPath: "/" });

    await screen.findByTestId("overview.hero.card");
    // The rail's accessible label states the range, not a single point.
    const rail = screen.getByTestId("confidence_rail");
    expect(rail).toHaveAttribute(
      "aria-label",
      expect.stringContaining("$1.1M to $1.9M"),
    );
    // The footnote spells the range out in full currency.
    expect(screen.getByText(/\$1,100,000 to \$1,900,000/)).toBeInTheDocument();
  });

  it("shows the naive baseline comparison next to the forecast", async () => {
    const { deals, risks } = makeSeededPipeline();
    holder.actor = createMockActor({
      listDeals: async () => deals,
      listDealRisks: async () => risks,
      getForecast: async () =>
        makeForecast({
          mostLikely: 1_500_000n,
          naivePipeline: 2_400_000n,
          repCommitEstimate: 1_800_000n,
        }),
    });

    renderApp({ initialPath: "/" });

    await screen.findByTestId("overview.baseline.panel");
    expect(screen.getByTestId("overview.baseline.row.naive")).toHaveTextContent(
      "$2,400,000",
    );
    expect(
      screen.getByTestId("overview.baseline.row.commit"),
    ).toHaveTextContent("$1,800,000");
    // The comparison is stated in plain language, not only as numbers.
    expect(
      screen.getByText(/overstates the quarter by \$900,000/),
    ).toBeInTheDocument();
  });

  it("renders the forecast rationale when one is persisted", async () => {
    const { deals, risks } = makeSeededPipeline();
    holder.actor = createMockActor({
      listDeals: async () => deals,
      listDealRisks: async () => risks,
      getForecast: async () =>
        makeForecast({
          rationale: "Negotiation-stage deals carry the quarter.",
        }),
    });

    renderApp({ initialPath: "/" });

    await screen.findByTestId("overview.rationale.panel");
    expect(screen.getByTestId("overview.rationale.text")).toHaveTextContent(
      "Negotiation-stage deals carry the quarter.",
    );
  });

  it("shows an error state instead of a blank screen when the forecast fails", async () => {
    const { deals, risks } = makeSeededPipeline();
    holder.actor = createMockActor({
      listDeals: async () => deals,
      listDealRisks: async () => risks,
      getForecast: async () => {
        throw new Error("backend unavailable");
      },
    });

    renderApp({ initialPath: "/" });

    expect(
      await screen.findByTestId("overview.error_state"),
    ).toBeInTheDocument();
  });

  it("shows the at-risk value derived from high-risk deals", async () => {
    const { deals, risks } = makeSeededPipeline();
    holder.actor = createMockActor({
      listDeals: async () => deals,
      listDealRisks: async () => risks,
      getForecast: async () => makeForecast(),
    });

    renderApp({ initialPath: "/" });

    await screen.findByTestId("overview.kpi.at_risk");
    // Only deal 1 is high risk, worth $250,000.
    await waitFor(() => {
      expect(screen.getByTestId("overview.kpi.at_risk")).toHaveTextContent(
        "$250,000",
      );
    });
  });
});
