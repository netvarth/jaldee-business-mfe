import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

/**
 * Manual stock reservations (GAP-16) — hold stock for a named customer outside the order flow.
 *
 * "Hold this jacket until the weekend." A hold moves stock IN_HAND -> ON_HOLD so it cannot be
 * sold to someone else; releasing returns it. The backend
 * (ManualStockReservationController, /v1/api/tenant/stock-reservations) already existed; this is
 * the missing UI, without which no hold could ever be placed.
 *
 * The list endpoint returns only active (HELD) reservations, keyed by UIDs — the page resolves
 * store / item / customer names from their own hooks.
 */

export type ManualReservationStatus = "HELD" | "RELEASED" | "FULFILLED" | "EXPIRED";

export interface Reservation {
  uid: string;
  consumerUid?: string;
  storeUid: string;
  itemUid: string;
  variantUid?: string;
  unitUid?: string;
  qty: number;
  baseQty?: number;
  expiresAt?: string;
  note?: string;
  status: ManualReservationStatus;
}

export interface ReserveRequest {
  storeUid: string;
  itemUid: string;
  variantUid?: string;
  unitUid?: string;
  qty: number;
  consumerUid?: string;
  expiresAt?: string;
  note?: string;
}

export function useReservations() {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["stock-reservations"],
    queryFn: async () => {
      const raw = await api.get<any>(`/v1/api/tenant/stock-reservations`);
      return (Array.isArray(raw) ? raw : raw?.content || []) as Reservation[];
    },
    staleTime: 20_000,
  });
}

export function useReserveStock() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: ReserveRequest) =>
      api.post<Reservation>(`/v1/api/tenant/stock-reservations`, req as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-reservations"] });
      // A hold changes available stock, so refresh stock reads.
      qc.invalidateQueries({ queryKey: ["inventory-stock"] });
      qc.invalidateQueries({ queryKey: ["stocks"] });
    },
  });
}

export function useReleaseReservation() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) =>
      api.put<Reservation>(`/v1/api/tenant/stock-reservations/${uid}/release`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-reservations"] });
      qc.invalidateQueries({ queryKey: ["inventory-stock"] });
      qc.invalidateQueries({ queryKey: ["stocks"] });
    },
  });
}
