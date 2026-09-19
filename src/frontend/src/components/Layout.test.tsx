/**
 * Layout — navigation hierarchy journey.
 *
 * The shell is the app's navigation contract: a persistent primary nav with the
 * current route marked active, a mobile nav that mirrors it, and a theme toggle.
 * These are the behaviors a new dashboard panel must not disturb, so the test
 * drives the real router and asserts the observable nav state on each route.
 */

import { renderApp } from "@/test/render";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const holder = vi.hoisted(() => ({
  actor: undefined as unknown,
}));

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: holder.actor, isFetching: false }),
}));

import { makeForecast, makeSeededPipeline } from "@/test/fixtures";
import { createMockActor } from "@/test/render";

function installSeededActor() {
  const { deals, risks } = makeSeededPipeline();
  holder.actor = createMockActor({
    listDeals: async () => deals,
    listDealRisks: async () => risks,
    getForecast: async () => makeForecast(),
  });
}

describe("Layout navigation", () => {
  beforeEach(() => {
    holder.actor = undefined;
    window.localStorage.clear();
  });

  it("renders the three primary destinations in the sidebar", async () => {
    installSeededActor();
    renderApp({ initialPath: "/" });

    const nav = await screen.findByTestId("nav.primary");
    expect(within(nav).getByText("Overview")).toBeInTheDocument();
    expect(within(nav).getByText("Deals")).toBeInTheDocument();
    expect(within(nav).getByText("Weekly Review")).toBeInTheDocument();
  });

  it("marks the Overview nav item active on the default route", async () => {
    installSeededActor();
    renderApp({ initialPath: "/" });

    const nav = await screen.findByTestId("nav.primary");
    expect(within(nav).getByText("Overview").closest("a")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByText("Deals").closest("a")).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks the Deals nav item active on the deals route", async () => {
    installSeededActor();
    renderApp({ initialPath: "/deals" });

    const nav = await screen.findByTestId("nav.primary");
    expect(within(nav).getByText("Deals").closest("a")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByText("Overview").closest("a")).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("navigates from Overview to Deals through the sidebar link", async () => {
    installSeededActor();
    const { router } = renderApp({ initialPath: "/" });

    const nav = await screen.findByTestId("nav.primary");
    await userEvent.click(within(nav).getByText("Deals"));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/deals");
    });
  });

  it("mirrors the primary destinations in the mobile nav", async () => {
    installSeededActor();
    renderApp({ initialPath: "/" });

    const mobileNav = await screen.findByLabelText("Primary mobile");
    expect(within(mobileNav).getByText("Overview")).toBeInTheDocument();
    expect(within(mobileNav).getByText("Deals")).toBeInTheDocument();
    expect(within(mobileNav).getByText("Weekly Review")).toBeInTheDocument();
  });

  it("toggles the theme from the header control", async () => {
    installSeededActor();
    renderApp({ initialPath: "/" });

    const toggle = await screen.findByTestId("theme.toggle");
    expect(toggle).toHaveAttribute("aria-label", "Switch to dark theme");

    await userEvent.click(toggle);

    await waitFor(() => {
      expect(toggle).toHaveAttribute("aria-label", "Switch to light theme");
    });
  });
});
