import { useMemo } from "react";
import { useQueries, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { EntityStatus, MetalRate } from "@/lib/gold-erp-types";
import { usePurities } from "@/hooks/useMasterData";

export const useCurrentRatesAll = () => {
  const { data: purities = [] } = usePurities();
  const rateQueries = useQueries({
    queries: purities.map((purity) => ({
      queryKey: ["currentRate", purity.metalUid, purity.purityUid],
      queryFn: async () => {
        try {
          return await apiFetch<MetalRate>(`/rate/current/${purity.metalUid}/${purity.purityUid}`);
        } catch {
          return null;
        }
      },
      enabled: Boolean(purity.metalUid && purity.purityUid),
    })),
  });

  const data = useMemo(
    () =>
      rateQueries
        .map((query) => query.data)
        .filter((rate): rate is MetalRate => Boolean(rate)),
    [rateQueries],
  );

  return {
    data,
    isLoading: rateQueries.some((query) => query.isLoading),
    isFetching: rateQueries.some((query) => query.isFetching),
    isError: rateQueries.some((query) => query.isError),
  };
};

export const useRates = () => {
  return useQuery({
    queryKey: ["rates"],
    queryFn: () => apiFetch<MetalRate[]>("/rate"),
  });
};

export const useRateHistory = (metalUid?: string, purityUid?: string) => {
  return useQuery({
    queryKey: ["rateHistory", metalUid, purityUid],
    queryFn: () => apiFetch<MetalRate[]>(`/rate/history/${metalUid}/${purityUid}`),
    enabled: Boolean(metalUid && purityUid),
  });
};

export const useSaveRate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { metalUid: string; purityUid: string; ratePerGram: number; effectiveDate: string; status: EntityStatus }) =>
      apiFetch<{ rateUid: string }>("/rate", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentRate"] });
      queryClient.invalidateQueries({ queryKey: ["rates"] });
    },
  });
};
