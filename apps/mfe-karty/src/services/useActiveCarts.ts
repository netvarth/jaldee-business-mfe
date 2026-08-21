import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

/**
 * Active carts — shopper sessions holding at least one line.
 * Backed by GET /v1/api/tenant/carts/active (CartController).
 *
 * Note the backend excludes empty carts: `getOrCreate` creates a row the moment anyone
 * opens a cart, so counting those would badly overstate live shopping activity.
 */

export interface CartLine {
  uid?: string;
  cartUid?: string;
  itemUid?: string;
  variantUid?: string;
  qty?: number;
  unitUid?: string;
  sellQty?: number;
  unitPrice?: number;
}

export interface ActiveCart {
  uid: string;
  consumerUid?: string;
  storeUid?: string;
  items?: CartLine[];
  updatedAt?: string;
}

export function useActiveCarts(storeUid?: string, page = 0, size = 100) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["active-carts", storeUid ?? "all", page, size],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), size: String(size) });
      if (storeUid && storeUid !== "all") params.append("storeUid", storeUid);
      const data = await api.get<any>(`/v1/api/tenant/carts/active?${params.toString()}`);
      return (Array.isArray(data) ? data : data?.content ?? []) as ActiveCart[];
    },
    // Carts change constantly; a short stale window keeps the view live without hammering.
    staleTime: 30_000,
  });
}

/** Clear a cart (empties the basket) — DELETE /carts?consumerUid=&storeUid=. */
export function useClearCart() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ consumerUid, storeUid }: { consumerUid: string; storeUid?: string }) => {
      const params = new URLSearchParams({ consumerUid });
      if (storeUid) params.append("storeUid", storeUid);
      return api.del<boolean>(`/v1/api/tenant/carts?${params.toString()}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["active-carts"] });
      qc.invalidateQueries({ queryKey: ["active-carts-count"] });
    },
  });
}

export function useActiveCartCount(storeUid?: string) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["active-carts-count", storeUid ?? "all"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (storeUid && storeUid !== "all") params.append("storeUid", storeUid);
      const qs = params.toString();
      const data = await api.get<any>(`/v1/api/tenant/carts/active/count${qs ? `?${qs}` : ""}`);
      return Number(data) || 0;
    },
    staleTime: 30_000,
  });
}
