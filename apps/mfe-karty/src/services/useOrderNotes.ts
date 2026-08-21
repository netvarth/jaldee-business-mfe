import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

export interface OrderNote {
  uid: string;
  orderUid: string;
  note: string;
  authorUid?: string;
  authorName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateOrderNoteRequest {
  note: string;
  authorUid?: string;
  authorName?: string;
}

export function useOrderNotes(orderUid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["order-notes", orderUid],
    enabled: !!orderUid,
    queryFn: async () => {
      const data = await api.get<OrderNote[]>(`/v1/api/tenant/orders/${orderUid}/notes`);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useAddOrderNote() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderUid, request }: { orderUid: string; request: CreateOrderNoteRequest }) => {
      return api.post<OrderNote>(`/v1/api/tenant/orders/${orderUid}/notes`, request);
    },
    onSuccess: (_, { orderUid }) => {
      qc.invalidateQueries({ queryKey: ["order-notes", orderUid] });
      qc.invalidateQueries({ queryKey: ["order-timeline", orderUid] });
    },
  });
}
