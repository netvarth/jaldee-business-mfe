import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

export interface ReorderAlertDto {
  uid: string;
  storeUid: string;
  storeName?: string;
  itemUid: string;
  itemName: string;
  sku?: string;
  variantUid?: string;
  variantName?: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  status: "OPEN" | "ACKNOWLEDGED" | "DISMISSED" | "RESOLVED";
  createdAt: string;
  resolvedAt?: string;
  vendorUid?: string;
  vendorName?: string;
}

export function useReorderAlerts(status?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["reorder-alerts", status],
    queryFn: async () => {
      const q = status && status !== "ALL" ? `&status=${status}` : "";
      // Backend now returns a Spring Page<> (was a raw List<>, and was backed by an
      // unbounded cross-tenant table scan) — unwrap .content the same way useStores/useItems do.
      const rawData = await api.get<any>(`/v1/api/tenant/inventory/reorder-alerts?size=200${q}`);
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      return data as ReorderAlertDto[];
    },
    staleTime: 30_000,
  });
}

export function useTriggerReorderSweep() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return api.post<number>("/v1/api/tenant/inventory/reorder-alerts/sweep", {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reorder-alerts"] });
    },
  });
}

export function useUpdateReorderAlertStatus() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, status }: { uid: string; status: string }) => {
      return api.put<ReorderAlertDto>(`/v1/api/tenant/inventory/reorder-alerts/${uid}/status?status=${status}`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reorder-alerts"] });
    },
  });
}
