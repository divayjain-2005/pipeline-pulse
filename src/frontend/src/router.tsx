/**
 * Router configuration.
 *
 * Four routes: Overview (/), At-Risk Deals (/deals), Deal Detail
 * (/deals/$dealId), Weekly Review (/weekly). Page components live in
 * `src/pages/` and are owned by their respective page tasks.
 */

import DealDetailPage from "@/pages/DealDetailPage";
import DealsPage from "@/pages/DealsPage";
import OverviewPage from "@/pages/OverviewPage";
import WeeklyReviewPage from "@/pages/WeeklyReviewPage";
import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

const rootRoute = createRootRoute();

const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: OverviewPage,
});

const dealsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/deals",
  component: DealsPage,
});

const dealDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/deals/$dealId",
  component: DealDetailPage,
});

const weeklyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/weekly",
  component: WeeklyReviewPage,
});

const routeTree = rootRoute.addChildren([
  overviewRoute,
  dealsRoute,
  dealDetailRoute,
  weeklyRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
