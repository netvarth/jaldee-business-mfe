import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

export interface PriceListItem {
  uid?: string;
  itemUid: string;
  variantUid?: string | null;
  unitUid?: string | null;
  price: number;
  minQty?: number;
}

export interface PriceList {
  uid: string;
  name: string;
  code?: string;
  currency?: string;
  isDefault?: boolean;
  status: "ACTIVE" | "INACTIVE";
  items?: PriceListItem[];
}

export function usePriceLists() {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["price-lists"],
    queryFn: async () => api.get<PriceList[]>(`/v1/api/tenant/price-lists`),
  });
}

export function usePriceList(uid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["price-list", uid],
    enabled: !!uid,
    queryFn: async () => api.get<PriceList>(`/v1/api/tenant/price-lists/${uid}`),
  });
}

export function useSavePriceList() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<PriceList>) =>
      p.uid
        ? api.put<PriceList>(`/v1/api/tenant/price-lists/${p.uid}`, p as any)
        : api.post<PriceList>(`/v1/api/tenant/price-lists`, p as any),
    onSuccess: (_d, p) => {
      qc.invalidateQueries({ queryKey: ["price-lists"] });
      if (p.uid) qc.invalidateQueries({ queryKey: ["price-list", p.uid] });
    },
  });
}

export function useDeletePriceList() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => api.del(`/v1/api/tenant/price-lists/${uid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["price-lists"] }),
  });
}
