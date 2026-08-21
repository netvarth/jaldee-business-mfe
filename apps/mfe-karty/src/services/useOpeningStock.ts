import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

/**
 * Opening-stock declarations (use case E1 — "opening balances on day one").
 *
 * A business that goes live already holding stock declares it per store and item, establishing
 * the true starting position without inventing a fictional purchase. A declaration is drafted,
 * then APPLIED — and once applied it is immutable and has posted into the stock engine.
 *
 * Backend: OpeningStockController, /v1/api/tenant/opening-stock. The list endpoint returns a
 * Spring Page<>, so the list hook unwraps `.content` the same way useStores/useItems do.
 */

export interface OpeningStockItemDto {
  uid?: string;
  openingUid?: string;
  itemUid: string;
  itemName?: string;
  variantUid?: string;
  batchNumber?: string;
  expiryDate?: string;   // LocalDate — "YYYY-MM-DD"
  qty: number;
  mrp?: number;
  costPrice?: number;
}

export interface OpeningStockDto {
  uid: string;
  tenantUid?: string;
  storeUid: string;
  storeName?: string;
  openingDate?: string;  // OffsetDateTime
  note?: string;
  status: "DRAFT" | "APPLIED";
  items: OpeningStockItemDto[];
}

export function useOpeningStockList(storeUid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["opening-stock", storeUid || "all"],
    queryFn: async () => {
      const q = new URLSearchParams();
      q.set("size", "200");
      if (storeUid) q.set("storeUid", storeUid);
      const rawData = await api.get<any>(`/v1/api/tenant/opening-stock?${q.toString()}`);
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      return data as OpeningStockDto[];
    },
    staleTime: 30_000,
  });
}

export function useOpeningStock(uid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["opening-stock", "detail", uid],
    enabled: !!uid,
    queryFn: async () => api.get<OpeningStockDto>(`/v1/api/tenant/opening-stock/${uid}`),
  });
}

export function useCreateOpeningStock() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<OpeningStockDto>) =>
      api.post<OpeningStockDto>("/v1/api/tenant/opening-stock", payload as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opening-stock"] });
    },
  });
}

export function useUpdateOpeningStock() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, payload }: { uid: string; payload: Partial<OpeningStockDto> }) =>
      api.put<OpeningStockDto>(`/v1/api/tenant/opening-stock/${uid}`, payload as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opening-stock"] });
    },
  });
}

/**
 * Post the declared quantities into the stock engine (idempotent). After this the declaration
 * is APPLIED and can no longer be edited or removed — mirrored in the UI by disabling those
 * actions on an applied row. Also invalidates stock reads, since inventory has now moved.
 */
export function useApplyOpeningStock() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) =>
      api.post<OpeningStockDto>(`/v1/api/tenant/opening-stock/${uid}/apply`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opening-stock"] });
      qc.invalidateQueries({ queryKey: ["inventory-stock"] });
      qc.invalidateQueries({ queryKey: ["stocks"] });
    },
  });
}

export function useDeleteOpeningStock() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => api.del<boolean>(`/v1/api/tenant/opening-stock/${uid}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opening-stock"] });
    },
  });
}
