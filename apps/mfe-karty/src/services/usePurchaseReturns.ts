import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

export interface PurchaseReturnItem {
  uid: string;
  catalogItemUid: string;
  batchNumber?: string;
  quantity: number;
  unitPrice: number;
  returnReason?: string;
}

export interface PurchaseReturn {
  uid: string;
  returnNo: string;
  returnDate: string;
  vendorUid: string;
  fromStoreUid: string;
  invoiceNo?: string;
  invoiceDate?: string;
  refundAmount: number;
  status: string;
  items: PurchaseReturnItem[];
}

export function usePurchaseReturns(search: string = "") {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["purchase-returns", search],
    queryFn: async () => {
      const rawData = await api.get<any>(`/v1/api/tenant/purchase-returns?search=${encodeURIComponent(search)}&size=100`);
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      return data as PurchaseReturn[];
    }
  });
}

export function useCreatePurchaseReturn() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      return api.post(`/v1/api/tenant/purchase-returns`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
    }
  });
}

export function useUpdatePurchaseReturnStatus() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, status }: { uid: string, status: string }) => {
      const data = await api.put(`/v1/api/tenant/purchase-returns/${uid}/status/${status}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock-ledger"] });
    }
  });
}
