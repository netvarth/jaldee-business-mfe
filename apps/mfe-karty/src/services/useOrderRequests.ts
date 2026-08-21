import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

/**
 * Order requests — the quote/enquiry stage that precedes an order.
 * Backed by OrderRequestController (/v1/api/tenant/order-requests).
 */

/** Mirrors OrderRequestStatus on the backend. */
export type OrderRequestStatus =
  | "PENDING"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CONVERTED"
  | "CANCELLED";

export interface OrderRequestItem {
  uid?: string;
  itemUid?: string;
  itemName?: string;
  dosageInstructions?: string;
  variantUid?: string;
  qty?: number;
  unitPrice?: number;
  lineTotal?: number;
  note?: string;
}

export interface OrderRequest {
  uid: string;
  requestNo?: string;
  requestDate?: string;
  consumerUid?: string;
  consumerName?: string;
  consumerPhone?: string;
  patientName?: string;
  prescriberName?: string;
  prescriberRegNo?: string;
  prescriptionRef?: string;
  docType?: string;
  storeUid?: string;
  status: string;
  totalAmount?: number;
  itemsCount?: number;
  note?: string;
  notes?: string;
  items?: OrderRequestItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderRequestFilter {
  page?: number;
  size?: number;
  status?: string;
  storeUid?: string;
  consumerUid?: string;
  requestNo?: string;
}

function toParams(filter: OrderRequestFilter | undefined, opts: { paged: boolean }) {
  const params = new URLSearchParams();
  if (!filter) return params;
  if (opts.paged) {
    params.append("page", String(filter.page ?? 0));
    params.append("size", String(filter.size ?? 100));
  }
  if (filter.status) params.append("status", filter.status);
  if (filter.storeUid) params.append("storeUid", filter.storeUid);
  if (filter.consumerUid) params.append("consumerUid", filter.consumerUid);
  if (filter.requestNo) params.append("requestNo", filter.requestNo);
  return params;
}

export function useOrderRequests(filter?: OrderRequestFilter) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["order-requests", filter],
    queryFn: async () => {
      const qs = toParams(filter, { paged: true }).toString();
      const data = await api.get<any>(`/v1/api/tenant/order-requests?${qs}`);
      return (Array.isArray(data) ? data : data?.content ?? []) as OrderRequest[];
    },
  });
}

/** Paired with useOrderRequests so a screen can tell a full page from a truncated one. */
export function useOrderRequestCount(filter?: OrderRequestFilter) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["order-requests-count", filter],
    queryFn: async () => {
      const qs = toParams(filter, { paged: false }).toString();
      const data = await api.get<any>(`/v1/api/tenant/order-requests/count${qs ? `?${qs}` : ""}`);
      return Number(data) || 0;
    },
  });
}

export function useCreateOrderRequest() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => api.post(`/v1/api/tenant/order-requests`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-requests"] });
      queryClient.invalidateQueries({ queryKey: ["order-requests-count"] });
    },
  });
}

export function useDeleteOrderRequest() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => api.delete(`/v1/api/tenant/order-requests/${uid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-requests"] });
      queryClient.invalidateQueries({ queryKey: ["order-requests-count"] });
    },
  });
}

export function useUpdateOrderRequestStatus() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, status }: { uid: string; status: string }) =>
      api.put(`/v1/api/tenant/order-requests/${uid}/status/${status}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-requests"] });
      queryClient.invalidateQueries({ queryKey: ["order-requests-count"] });
    },
  });
}

/** Converts an approved request into a real order; invalidates orders too. */
export function useConvertOrderRequest() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => api.post(`/v1/api/tenant/order-requests/${uid}/convert`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-requests"] });
      queryClient.invalidateQueries({ queryKey: ["order-requests-count"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersCount"] });
    },
  });
}


export function useOrderRequest(uid?: string) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["order-request", uid],
    enabled: !!uid,
    queryFn: async () => {
      const data = await api.get<any>(`/v1/api/tenant/order-requests/${uid}`);
      return data as OrderRequest;
    },
  });
}
