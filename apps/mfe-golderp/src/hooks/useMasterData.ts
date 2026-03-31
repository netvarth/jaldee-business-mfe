import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Metal, MetalPurity, Stone, StoneClarity, StoneCut, StoneShape, StoneType } from "@/lib/gold-erp-types";

export const useMetals = () => {
  return useQuery({
    queryKey: ["metals"],
    queryFn: () => apiFetch<Metal[]>("/master/metal"),
  });
};

export const useCreateMetal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { metalCode: string; name: string; status: "ACTIVE" | "INACTIVE" }) =>
      apiFetch<{ metalUid: string }>("/master/metal", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metals"] });
    },
  });
};

export const useUpdateMetal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ metalUid, data }: { metalUid: string; data: { metalCode: string; name: string; status: "ACTIVE" | "INACTIVE" } }) =>
      apiFetch<Metal>(`/master/metal/${metalUid}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metals"] });
    },
  });
};

export const usePurities = () => {
  return useQuery({
    queryKey: ["purities"],
    queryFn: () => apiFetch<MetalPurity[]>("/master/purity"),
  });
};

export const usePuritiesByMetal = (metalUid?: string) => {
  return useQuery({
    queryKey: ["purities", "metal", metalUid],
    queryFn: () => apiFetch<MetalPurity[]>(`/master/purity/metal/${metalUid}`),
    enabled: Boolean(metalUid),
  });
};

export const useCreatePurity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { metalUid: string; purityCode: string; label: string; purityRatio: number; status: "ACTIVE" | "INACTIVE" }) =>
      apiFetch<{ purityUid: string }>("/master/purity", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purities"] });
    },
  });
};

export const useUpdatePurity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ purityUid, data }: { purityUid: string; data: { metalUid: string; purityCode: string; label: string; purityRatio: number; status: "ACTIVE" | "INACTIVE" } }) =>
      apiFetch<MetalPurity>(`/master/purity/${purityUid}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purities"] });
    },
  });
};

export const useStones = () => {
  return useQuery({
    queryKey: ["stones"],
    queryFn: () => apiFetch<Stone[]>("/master/stone"),
  });
};

export const useCreateStone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      stoneCode: string;
      name: string;
      stoneType: StoneType;
      shape: StoneShape;
      clarity: StoneClarity;
      cut: StoneCut;
      pricePerPiece: number;
      status: "ACTIVE" | "INACTIVE";
    }) =>
      apiFetch<Stone>("/master/stone", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stones"] });
    },
  });
};

export const useUpdateStone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      stoneUid,
      data,
    }: {
      stoneUid: string;
      data: Partial<{
        stoneCode: string;
        name: string;
        stoneType: StoneType;
        shape: StoneShape;
        clarity: StoneClarity;
        cut: StoneCut;
        pricePerPiece: number;
        status: "ACTIVE" | "INACTIVE";
      }>;
    }) =>
      apiFetch<Stone>(`/master/stone/${stoneUid}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stones"] });
    },
  });
};

// Making Charges
export const useMakingCharges = () => {
  return useQuery({
    queryKey: ["makingCharges"],
    queryFn: async () => [],
  });
};
