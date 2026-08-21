import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

export interface SalesReturnItem {
  uid?: string;
  itemUid: string;
  batchNumber?: string;
  qty: number;
  unitUid?: string;
  unitPrice?: number;
}

export type RefundStatus = "NONE" | "PENDING" | "REFUNDED";

export interface SalesReturn {
  uid: string;
  returnNo: string;
  returnDate?: string;
  consumerUid?: string;
  storeUid?: string;
  orderUid?: string;
  invoiceNo?: string;
  refundAmount?: number;
  refundStatus?: RefundStatus;
  reason?: string;
  status: string;
  items?: SalesReturnItem[];
}

/** A returnable order line from GET /sales-returns/eligible/order/{orderUid}. */
export interface ReturnableLine {
  orderItemUid: string;
  itemUid: string;
  variantUid?: string | null;
  itemName?: string;
  sku?: string;
  unitUid?: string;
  soldQty?: number;
  soldBaseQty?: number;
  returnedBaseQty?: number;
  returnableBaseQty: number;
  unitPrice?: number;
  batchNumber?: string;
}

export interface EligibleOrder {
  orderUid: string;
  orderNo?: string;
  orderDate?: string;
  storeUid?: string;
  totalAmount?: number;
  returnableLineCount: number;
}

export function useSalesReturns(search: string = "") {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["sales-returns", search],
    queryFn: async () => {
      const data = await api.get<any>(`/v1/api/tenant/sales-returns?size=100`);
      const arr = Array.isArray(data) ? data : (data?.content || []);
      return arr as SalesReturn[];
    },
  });
}

export function useSalesReturn(uid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["sales-return", uid],
    enabled: !!uid,
    queryFn: async () => api.get<SalesReturn>(`/v1/api/tenant/sales-returns/${uid}`),
  });
}

export function useCreateSalesReturn() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => api.post(`/v1/api/tenant/sales-returns`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-returns"] });
    },
  });
}

export function useUpdateSalesReturnStatus() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, status }: { uid: string; status: string }) =>
      api.put(`/v1/api/tenant/sales-returns/${uid}/status/${status}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-returns"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock-ledger"] });
    },
  });
}

/** Returnable lines of a past order — drives the "Create Sales Return" picker. */
export function useReturnableByOrder(orderUid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["sales-return-eligible-order", orderUid],
    enabled: !!orderUid,
    queryFn: async () =>
      api.get<ReturnableLine[]>(`/v1/api/tenant/sales-returns/eligible/order/${orderUid}`),
  });
}

/** A consumer's orders that still have returnable lines. */
export function useReturnableByConsumer(consumerUid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["sales-return-eligible-consumer", consumerUid],
    enabled: !!consumerUid,
    queryFn: async () =>
      api.get<EligibleOrder[]>(`/v1/api/tenant/sales-returns/eligible/consumer/${consumerUid}`),
  });
}

/** Record a refund against a completed return (amount + settle status). */
export function useRefundSalesReturn() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, amount, status }: { uid: string; amount?: number; status?: RefundStatus }) => {
      const qs = new URLSearchParams();
      if (amount != null) qs.set("amount", String(amount));
      if (status) qs.set("status", status);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return api.put(`/v1/api/tenant/sales-returns/${uid}/refund${suffix}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sales-returns"] }),
  });
}

export function useUpdateRefundStatus() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, status }: { uid: string; status: RefundStatus }) =>
      api.put(`/v1/api/tenant/sales-returns/${uid}/refund-status/${status}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sales-returns"] }),
  });
}

/** Structured receipt for a return (credit-note data). */
export function useReturnReceipt(uid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["sales-return-receipt", uid],
    enabled: !!uid,
    queryFn: async () => api.get<any>(`/v1/api/tenant/sales-returns/${uid}/receipt`),
  });
}
