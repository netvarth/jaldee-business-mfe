import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

export interface StockAdjustmentHistory {
  uid: string;
  catalogItemUid: string;
  itemUid: string;
  batchNumber?: string;
  type: string;
  target: string;
  quantity: number;
  previousQty: number;
  newQty: number;
  reason?: string;
  notes?: string;
  adjustedBy: string;
  adjustedAt: string;
  createdBy?: string;
  createdByName?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export function useStockAdjustments(search: string = "", status: string = "") {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["stock-adjustments", search, status],
    queryFn: async () => {
      let url = `/v1/api/tenant/stock-adjustments/history?size=100`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (status) url += `&status=${encodeURIComponent(status)}`;
      const rawData = await api.get<any>(url);
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      return data as StockAdjustmentHistory[];
    }
  });
}

export function useCreateStockAdjustment() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      const data = await api.post("/v1/api/tenant/stock-adjustments", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-adjustments"] });
    }
  });
}

export function useApproveStockAdjustment() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => {
      const data = await api.put(`/v1/api/tenant/stock-adjustments/${uid}/approve`, {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock-ledger"] });
    }
  });
}

export function useRejectStockAdjustment() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => {
      const data = await api.put(`/v1/api/tenant/stock-adjustments/${uid}/reject`, {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-adjustments"] });
    }
  });
}
