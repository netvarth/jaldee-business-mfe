import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

export interface StockTransferItem {
  catalogItemUid: string;
  batchNumber?: string;
  quantity: number;
  receivedQty?: number;
}

export interface StockTransfer {
  uid: string;
  transferNo: string;
  transferDate: string;
  fromStoreUid: string;
  toStoreUid: string;
  totalQty: number;
  status: string;
  items: StockTransferItem[];
}

export function useStockTransfers(search: string = "") {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["stock-transfers", search],
    queryFn: async () => {
      const rawData = await api.get<any>(`/v1/api/tenant/stock-transfers?search=${encodeURIComponent(search)}&size=100`);
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      return data as StockTransfer[];
    }
  });
}

export function useCreateStockTransfer() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      const data = await api.post("/v1/api/tenant/stock-transfers", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock-ledger"] });
    }
  });
}

export function useReceiveStockTransfer() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, payload }: { uid: string, payload: any }) => {
      const data = await api.put(`/v1/api/tenant/stock-transfers/${uid}/receive`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock-ledger"] });
    }
  });
}

export function useUpdateTransferStatus() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, status }: { uid: string, status: string }) => {
      const data = await api.put(`/v1/api/tenant/stock-transfers/${uid}/status/${status}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock-ledger"] });
    }
  });
}
