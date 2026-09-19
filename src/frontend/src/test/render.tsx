/**
 * Test render helpers.
 *
 * Builds a fresh memory-history router over the app's real page components and
 * wraps it in a fresh QueryClient, so each test gets an isolated navigation and
 * cache state. The backend actor is supplied by the caller through the
 * `useActor` mock each test file installs.
 */

import type { backendInterface } from "@/backend";
import DealDetailPage from "@/pages/DealDetailPage";
import DealsPage from "@/pages/DealsPage";
import OverviewPage from "@/pages/OverviewPage";
import WeeklyReviewPage from "@/pages/WeeklyReviewPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { type RenderResult, render } from "@testing-library/react";
import type { ReactElement } from "react";

export interface RenderAppOptions {
  /** Initial URL, e.g. "/deals?bucket=high". */
  initialPath?: string;
}

function buildTestRouter(initialPath: string) {
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

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

/** Render the app at `initialPath` with a fresh query client and router. */
export function renderApp(
  options: RenderAppOptions = {},
): RenderResult & { router: ReturnType<typeof buildTestRouter> } {
  const router = buildTestRouter(options.initialPath ?? "/");
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { ...result, router };
}

/** Render an arbitrary element inside a query client (for component tests). */
export function renderWithQueryClient(ui: ReactElement): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

/**
 * A typed actor mock. Every method resolves to a benign default; tests override
 * only the methods they exercise. Typing it as `backendInterface` means a
 * backend method rename or signature change fails the type-check here.
 */
export function createMockActor(
  overrides: Partial<backendInterface> = {},
): backendInterface {
  const notImplemented = (name: string) => () =>
    Promise.reject(new Error(`mock actor: ${name} not stubbed`));

  const base: backendInterface = {
    _initialize_access_control: notImplemented("_initialize_access_control"),
    _internet_identity_sign_in_finish: notImplemented(
      "_internet_identity_sign_in_finish",
    ),
    _internet_identity_sign_in_start: notImplemented(
      "_internet_identity_sign_in_start",
    ),
    addStakeholder: notImplemented("addStakeholder"),
    assignCallerUserRole: notImplemented("assignCallerUserRole"),
    createDeal: notImplemented("createDeal"),
    deleteDeal: notImplemented("deleteDeal"),
    execute: notImplemented("execute"),
    generateDealReasoning: notImplemented("generateDealReasoning"),
    generateForecastRationale: notImplemented("generateForecastRationale"),
    getApiDoc: notImplemented("getApiDoc"),
    getBaseline: notImplemented("getBaseline"),
    getBacktest: notImplemented("getBacktest"),
    getCallerUserRole: notImplemented("getCallerUserRole"),
    getDeal: notImplemented("getDeal"),
    getDealReasoning: notImplemented("getDealReasoning"),
    getForecast: notImplemented("getForecast"),
    getForecastRationale: notImplemented("getForecastRationale"),
    isCallerAdmin: notImplemented("isCallerAdmin"),
    listDealRisks: notImplemented("listDealRisks"),
    listDeals: notImplemented("listDeals"),
    resetSampleData: notImplemented("resetSampleData"),
    schema: notImplemented("schema"),
    seedSampleData: notImplemented("seedSampleData"),
    storeAddStakeholder: notImplemented("storeAddStakeholder"),
    storeBaseline: notImplemented("storeBaseline"),
    storeCreateDeal: notImplemented("storeCreateDeal"),
    storeDeleteDeal: notImplemented("storeDeleteDeal"),
    storeGetDeal: notImplemented("storeGetDeal"),
    storeListDeals: notImplemented("storeListDeals"),
    storeUpdateDeal: notImplemented("storeUpdateDeal"),
    storeUpdateStakeholder: notImplemented("storeUpdateStakeholder"),
    updateDeal: notImplemented("updateDeal"),
    updateStakeholder: notImplemented("updateStakeholder"),
  };

  return { ...base, ...overrides };
}
