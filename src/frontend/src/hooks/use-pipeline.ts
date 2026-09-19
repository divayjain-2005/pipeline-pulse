/**
 * TanStack Query hooks wrapping every backend method on the pipeline canister.
 *
 * Reads are queries keyed by domain; writes are mutations that invalidate the
 * affected keys on success. `useActor(createActor)` is always called at hook
 * top level, never inside a query or mutation callback.
 */

import { createActor } from "@/backend";
import type {
  BacktestResult,
  Deal,
  DealRisk,
  Forecast,
  HistoricalBaseline,
  PipelineResult,
  PipelineResult_1,
  PipelineResult_2,
  PipelineResult_3,
  Stakeholder,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const pipelineKeys = {
  all: ["pipeline"] as const,
  deals: () => [...pipelineKeys.all, "deals"] as const,
  deal: (id: bigint) => [...pipelineKeys.all, "deal", id.toString()] as const,
  risks: () => [...pipelineKeys.all, "risks"] as const,
  forecast: () => [...pipelineKeys.all, "forecast"] as const,
  baseline: () => [...pipelineKeys.all, "baseline"] as const,
  backtest: () => [...pipelineKeys.all, "backtest"] as const,
};

/* ---------------------------------------------------------------------------
   Queries
--------------------------------------------------------------------------- */

export function useDeals() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Deal[]>({
    queryKey: pipelineKeys.deals(),
    queryFn: async () => {
      if (!actor) return [];
      return actor.listDeals();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDeal(id: bigint | null | undefined) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Deal | null>({
    queryKey: pipelineKeys.deal(id ?? 0n),
    queryFn: async () => {
      if (!actor || id === null || id === undefined) return null;
      return actor.getDeal(id);
    },
    enabled: !!actor && !isFetching && id !== null && id !== undefined,
  });
}

export function useDealRisks() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<DealRisk[]>({
    queryKey: pipelineKeys.risks(),
    queryFn: async () => {
      if (!actor) return [];
      return actor.listDealRisks();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useForecast() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Forecast>({
    queryKey: pipelineKeys.forecast(),
    queryFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.getForecast();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useBaseline() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<HistoricalBaseline>({
    queryKey: pipelineKeys.baseline(),
    queryFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.getBaseline();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useBacktest() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<BacktestResult>({
    queryKey: pipelineKeys.backtest(),
    queryFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.getBacktest();
    },
    enabled: !!actor && !isFetching,
  });
}

/* ---------------------------------------------------------------------------
   Mutations
--------------------------------------------------------------------------- */

function useInvalidatePipeline() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: pipelineKeys.all });
  };
}

export function useCreateDeal() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidatePipeline();
  return useMutation<PipelineResult, Error, Deal>({
    mutationFn: async (deal: Deal) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.createDeal(deal);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useUpdateDeal() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidatePipeline();
  return useMutation<PipelineResult, Error, { id: bigint; deal: Deal }>({
    mutationFn: async ({ id, deal }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.updateDeal(id, deal);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useDeleteDeal() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidatePipeline();
  return useMutation<PipelineResult_1, Error, bigint>({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.deleteDeal(id);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useAddStakeholder() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidatePipeline();
  return useMutation<
    PipelineResult,
    Error,
    { dealId: bigint; stakeholder: Stakeholder }
  >({
    mutationFn: async ({ dealId, stakeholder }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.addStakeholder(dealId, stakeholder);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useUpdateStakeholder() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidatePipeline();
  return useMutation<
    PipelineResult,
    Error,
    { dealId: bigint; stakeholderIndex: bigint; stakeholder: Stakeholder }
  >({
    mutationFn: async ({ dealId, stakeholderIndex, stakeholder }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.updateStakeholder(dealId, stakeholderIndex, stakeholder);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useResetSampleData() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidatePipeline();
  return useMutation<PipelineResult_1, Error, void>({
    mutationFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.resetSampleData();
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useGenerateDealReasoning() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidatePipeline();
  return useMutation<PipelineResult_3, Error, bigint>({
    mutationFn: async (dealId: bigint) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.generateDealReasoning(dealId);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useGenerateForecastRationale() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidatePipeline();
  return useMutation<PipelineResult_2, Error, void>({
    mutationFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.generateForecastRationale();
    },
    onSuccess: () => {
      invalidate();
    },
  });
}
