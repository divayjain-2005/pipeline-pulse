/**
 * DealsPage — ranked at-risk ledger journeys.
 *
 * Covers the accepted behavior that the table is ranked by risk score, each row
 * carries a specific reason and recommended action, filtering by bucket and
 * owner narrows the rows, filter/sort state lives in the URL, and clicking a
 * row opens the deal detail route.
 */

import { makeSeededPipeline } from "@/test/fixtures";
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

function installSeededActor() {
  const { deals, risks } = makeSeededPipeline();
  holder.actor = createMockActor({
    listDeals: async () => deals,
    listDealRisks: async () => risks,
  });
  return { deals, risks };
}

describe("DealsPage", () => {
  beforeEach(() => {
    holder.actor = undefined;
  });

  it("ranks open deals by descending risk score", async () => {
    installSeededActor();
    renderApp({ initialPath: "/deals" });

    await screen.findByTestId("deals.row.1");
    const rows = screen.getAllByTestId(/^deals\.row\.\d+$/);
    // The closed deal is excluded from the default open-stage view.
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("Enterprise Renewal")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Platform Expansion")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Pilot Rollout")).toBeInTheDocument();
  });

  it("shows a specific top reason and recommended action on each row", async () => {
    installSeededActor();
    renderApp({ initialPath: "/deals" });

    const firstRow = await screen.findByTestId("deals.row.1");
    expect(
      within(firstRow).getByText("Activity has stalled for 14 days"),
    ).toBeInTheDocument();
    expect(
      within(firstRow).getByText(
        "Call Dana Whitfield to confirm the redline review date",
      ),
    ).toBeInTheDocument();
  });

  it("narrows rows when the URL carries a risk-bucket filter", async () => {
    installSeededActor();
    renderApp({ initialPath: "/deals?bucket=high" });

    await screen.findByTestId("deals.row.1");
    const rows = screen.getAllByTestId(/^deals\.row\.\d+$/);
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText("Enterprise Renewal")).toBeInTheDocument();
  });

  it("narrows rows when the URL carries an owner filter", async () => {
    installSeededActor();
    renderApp({ initialPath: "/deals?owner=Priya%20Raman" });

    await screen.findByTestId("deals.row.1");
    const rows = screen.getAllByTestId(/^deals\.row\.\d+$/);
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(within(row).getByText("Priya Raman")).toBeInTheDocument();
    }
  });

  it("writes a sort change into the URL", async () => {
    installSeededActor();
    const { router } = renderApp({ initialPath: "/deals" });

    await screen.findByTestId("deals.row.1");
    await userEvent.click(screen.getByTestId("deals.sort.amount"));

    await waitFor(() => {
      const search = router.state.location.search as Record<string, unknown>;
      expect(search.sort).toBe("amount");
      expect(search.dir).toBe("asc");
    });
  });

  it("opens the deal detail route when a row is clicked", async () => {
    installSeededActor();
    const { router } = renderApp({ initialPath: "/deals" });

    const firstRow = await screen.findByTestId("deals.row.1");
    await userEvent.click(firstRow);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/deals/1");
    });
  });

  it("writes an amount-range filter change into the URL", async () => {
    installSeededActor();
    const { router } = renderApp({ initialPath: "/deals" });

    await screen.findByTestId("deals.row.1");
    fireEvent.change(screen.getByTestId("deals.filter.min_amount"), {
      target: { value: "100000" },
    });

    await waitFor(() => {
      const search = router.state.location.search as Record<string, unknown>;
      expect(search.min).toBe("100000");
    });
  });

  it("adds a deal through the create mutation", async () => {
    const { deals, risks } = makeSeededPipeline();
    const createDeal = vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: deals[0],
    }));
    holder.actor = createMockActor({
      listDeals: async () => deals,
      listDealRisks: async () => risks,
      createDeal: createDeal as unknown as backendInterface["createDeal"],
    });
    renderApp({ initialPath: "/deals" });

    await screen.findByTestId("deals.row.1");
    await userEvent.click(screen.getByTestId("deals.add_button"));

    await screen.findByTestId("deals.add_dialog");
    await userEvent.type(
      screen.getByTestId("deals.add_form.name_input"),
      "New Logo Deal",
    );
    await userEvent.type(
      screen.getByTestId("deals.add_form.account_input"),
      "Contoso",
    );
    await userEvent.type(
      screen.getByTestId("deals.add_form.owner_input"),
      "Priya Raman",
    );
    await userEvent.type(
      screen.getByTestId("deals.add_form.amount_input"),
      "120000",
    );

    const submit = screen.getByTestId("deals.add_form.submit_button");
    expect(submit).toBeEnabled();
    const form = submit.closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(createDeal).toHaveBeenCalledTimes(1);
    });
    const [draft] = createDeal.mock.calls[0] as unknown as [
      { name: string; account: string; owner: string; amount: bigint },
    ];
    expect(draft).toMatchObject({
      name: "New Logo Deal",
      account: "Contoso",
      owner: "Priya Raman",
      amount: 120_000n,
    });
  });

  it("resets to sample data after confirmation", async () => {
    const { deals, risks } = makeSeededPipeline();
    const resetSampleData = vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: null,
    }));
    holder.actor = createMockActor({
      listDeals: async () => deals,
      listDealRisks: async () => risks,
      resetSampleData:
        resetSampleData as unknown as backendInterface["resetSampleData"],
    });
    renderApp({ initialPath: "/deals" });

    await screen.findByTestId("deals.row.1");
    await userEvent.click(screen.getByTestId("deals.reset_button"));

    await screen.findByTestId("deals.reset_dialog");
    await userEvent.click(screen.getByTestId("deals.reset_confirm_button"));

    await waitFor(() => {
      expect(resetSampleData).toHaveBeenCalledTimes(1);
    });
  });

  it("shows an empty state when filters match no deals", async () => {
    installSeededActor();
    renderApp({ initialPath: "/deals?owner=Nobody" });

    expect(await screen.findByTestId("deals.empty_state")).toBeInTheDocument();
  });

  it("shows an error state when the pipeline fails to load", async () => {
    holder.actor = createMockActor({
      listDeals: async () => {
        throw new Error("backend unavailable");
      },
      listDealRisks: async () => [],
    });
    renderApp({ initialPath: "/deals" });

    expect(await screen.findByTestId("deals.error_state")).toBeInTheDocument();
  });
});
