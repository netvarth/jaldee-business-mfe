import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

export interface BusinessPreset {
  name: string;
  displayName: string;
  description: string;
  defaultCapabilities: Record<string, boolean>;
}

export function useCapabilities() {
  const api = useCommerceApi();
  const query = useQuery({
    queryKey: ["commerce-capabilities"],
    queryFn: async () => {
      const data = await api.get<Record<string, boolean>>("/v1/api/tenant/commerce-settings/capabilities");
      return data || {};
    },
    staleTime: 60_000,
  });

  const isEnabled = (flag: string): boolean => {
    if (!query.data) return false;
    return !!query.data[flag];
  };

  return {
    ...query,
    capabilities: query.data || {},
    isEnabled,
  };
}

export function useStoreCapabilities(storeUid?: string) {
  const api = useCommerceApi();
  const query = useQuery({
    queryKey: ["commerce-store-capabilities", storeUid],
    queryFn: async () => {
      if (!storeUid) {
        const data = await api.get<Record<string, boolean>>("/v1/api/tenant/commerce-settings/capabilities");
        return data || {};
      }
      const data = await api.get<Record<string, boolean>>(`/v1/api/tenant/stores/${storeUid}/capabilities`);
      return data || {};
    },
    staleTime: 60_000,
  });

  const isEnabled = (flag: string): boolean => {
    if (!query.data) return false;
    return !!query.data[flag];
  };

  return {
    ...query,
    capabilities: query.data || {},
    isEnabled,
  };
}

export function useUpdateCapabilities() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (overrides: Record<string, boolean>) => {
      return api.put<Record<string, boolean>>("/v1/api/tenant/commerce-settings/capabilities", overrides);
    },
    onSuccess: (data) => {
      qc.setQueryData(["commerce-capabilities"], data);
      qc.invalidateQueries({ queryKey: ["commerce-capabilities"] });
      qc.invalidateQueries({ queryKey: ["commerce-store-capabilities"] });
    },
  });
}

export function useUpdateStoreCapabilities() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ storeUid, overrides }: { storeUid: string; overrides: Record<string, boolean> }) => {
      return api.put<Record<string, boolean>>(`/v1/api/tenant/stores/${storeUid}/capabilities`, overrides);
    },
    onSuccess: (data, variables) => {
      qc.setQueryData(["commerce-store-capabilities", variables.storeUid], data);
      qc.invalidateQueries({ queryKey: ["commerce-store-capabilities", variables.storeUid] });
    },
  });
}

export function usePresets() {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["commerce-presets"],
    queryFn: async () => {
      const data = await api.get<BusinessPreset[]>("/v1/api/tenant/commerce-settings/presets");
      return data || [];
    },
    staleTime: 300_000,
  });
}

export function useApplyPreset() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ preset, reset = false }: { preset: string; reset?: boolean }) => {
      return api.post(`/v1/api/tenant/commerce-settings/preset/${preset}?reset=${reset}`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commerce-capabilities"] });
      qc.invalidateQueries({ queryKey: ["commerce-store-capabilities"] });
      qc.invalidateQueries({ queryKey: ["commerce-settings"] });
    },
  });
}

export function useApplyStorePreset() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ storeUid, preset, reset = false }: { storeUid: string; preset: string; reset?: boolean }) => {
      return api.post(`/v1/api/tenant/stores/${storeUid}/preset/${preset}?reset=${reset}`, {});
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["commerce-store-capabilities", variables.storeUid] });
    },
  });
}
