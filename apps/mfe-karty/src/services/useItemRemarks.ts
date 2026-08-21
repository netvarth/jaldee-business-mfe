import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

export interface ItemRemark {
  uid: string;
  itemUid: string;
  remark: string;
  active?: boolean;
}

/** Remarks/notes on a stock item. GET /v1/api/tenant/item-remarks?itemUid= */
export function useItemRemarks(itemUid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["item-remarks", itemUid],
    enabled: !!itemUid,
    queryFn: async () => api.get<ItemRemark[]>(`/v1/api/tenant/item-remarks?itemUid=${itemUid}`),
  });
}

export function useCreateItemRemark() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { itemUid: string; remark: string; active?: boolean }) =>
      api.post<ItemRemark>(`/v1/api/tenant/item-remarks`, payload),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["item-remarks", v.itemUid] }),
  });
}

export function useUpdateItemRemark() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, itemUid, remark, active }: { uid: string; itemUid: string; remark?: string; active?: boolean }) =>
      api.put<ItemRemark>(`/v1/api/tenant/item-remarks/${uid}`, { remark, active }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["item-remarks", v.itemUid] }),
  });
}

export function useSetItemRemarkActive() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, active }: { uid: string; itemUid: string; active: boolean }) =>
      api.put(`/v1/api/tenant/item-remarks/${uid}/status/${active}`),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["item-remarks", v.itemUid] }),
  });
}

export function useDeleteItemRemark() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid }: { uid: string; itemUid: string }) =>
      api.del(`/v1/api/tenant/item-remarks/${uid}`),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["item-remarks", v.itemUid] }),
  });
}
