import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

/**
 * Trade schemes (GAP-28) — B2B quantity-slab discounts and free-goods promotions.
 *
 * The backend engine (SchemeApplicationService) already applies matching schemes at order line
 * time; this is the missing definition surface, without which no scheme can ever be created and
 * therefore none can fire. Backend: SchemeController, /v1/api/tenant/schemes.
 *
 * Line fields are interpreted per schemeType (see SchemeApplicationServiceImpl):
 *   QTY_SLAB       buyQty threshold  + discountPercent OR discountAmount
 *   BOGO           buyQty + getQty   + optional freeItemUid (defaults to the bought item)
 *   FREE_GOODS     buyQty + getQty   + optional freeItemUid
 *   VALUE_DISCOUNT minValue threshold + discountPercent OR discountAmount
 */

export type SchemeType = "QTY_SLAB" | "BOGO" | "VALUE_DISCOUNT" | "FREE_GOODS";
export type SchemeScope = "ITEM" | "CATEGORY" | "PARTNER" | "ALL";

export interface SchemeLine {
  uid?: string;
  schemeUid?: string;
  buyQty?: number;
  getQty?: number;
  freeItemUid?: string;
  discountPercent?: number;
  discountAmount?: number;
  minValue?: number;
}

export interface Scheme {
  uid?: string;
  tenantUid?: string;
  name: string;
  schemeType: SchemeType;
  schemeScope: SchemeScope;
  targetUid?: string;
  active: boolean;
  validFrom?: string;   // "YYYY-MM-DD"
  validTo?: string;
  priority: number;
  lines: SchemeLine[];
  createdAt?: string;
  updatedAt?: string;
}

export function useSchemes() {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["schemes"],
    queryFn: async () => {
      const raw = await api.get<any>(`/v1/api/tenant/schemes`);
      return (Array.isArray(raw) ? raw : raw?.content || []) as Scheme[];
    },
    staleTime: 30_000,
  });
}

export function useScheme(uid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["scheme", uid],
    enabled: !!uid,
    queryFn: async () => api.get<Scheme>(`/v1/api/tenant/schemes/${uid}`),
  });
}

export function useSaveScheme() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Scheme) =>
      s.uid
        ? api.put<Scheme>(`/v1/api/tenant/schemes/${s.uid}`, s as any)
        : api.post<Scheme>(`/v1/api/tenant/schemes`, s as any),
    onSuccess: (_data, s) => {
      qc.invalidateQueries({ queryKey: ["schemes"] });
      if (s.uid) qc.invalidateQueries({ queryKey: ["scheme", s.uid] });
    },
  });
}

export function useDeleteScheme() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => api.del<boolean>(`/v1/api/tenant/schemes/${uid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schemes"] }),
  });
}

export function useSetSchemeActive() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, active }: { uid: string; active: boolean }) =>
      api.put<boolean>(`/v1/api/tenant/schemes/${uid}/active?active=${active}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schemes"] }),
  });
}
