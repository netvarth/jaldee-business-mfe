import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

// Backend requires a verticalType on items (RETAIL / PHARMACY / RESTAURANT /
// GROCERY / OTHER / BAKERY). The item form doesn't collect one, so default to
// RETAIL — the vertical this tenant's stores operate in — unless caller sets it.
function normalizeItemPayload(payload: any) {
  if (!payload || typeof payload !== "object") return payload;
  const normalized: any = { ...payload };
  if (!normalized.verticalType) {
    normalized.verticalType = "RETAIL";
  }
  if (typeof normalized.status === "string") {
    normalized.status = normalized.status.toUpperCase();
  }
  return normalized;
}

export interface Item {
  uid: string;
  name: string;
  code?: string;
  sku: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  brandName?: string;
  variants?: any[];
  units?: any[];
  status: string;
  itemNo?: string;
  baseUnitUid?: string;
  trackInventory?: boolean;
  allowLooseSale?: boolean;
  rxEnabled?: boolean;
  productSpecification?: number | null;
  productContains?: number | null;
  productContainsUnitUid?: string;
  // Vertical/merchandising scalars the backend stores in the item's jsonb `attributes`
  // map (barcode, hsnCode, weight, itemType, taxGroup, taxPreference, infoBlocks).
  attributes?: Record<string, any>;
  tags?: string[];
  badges?: string[];
  upsellItemUids?: string[];
  crossSellItemUids?: string[];
}

export interface ItemImportRequest { mode: string; dryRun: boolean; items: any[]; openingStock: any[]; }
export interface ItemImportJobDto { jobId: string; status: string; progress: number; result?: ItemImportResult; errorMessage?: string; }
export interface ItemImportResult { totalRows: number; created: number; updated: number; skipped: number; errors: number; dryRun: boolean; rows: ItemImportRowResult[]; }
export interface ItemImportRowResult { rowIndex: number; itemCode: string; status: string; itemNo?: string; itemUid?: string; errors: string[]; }

export function useItems() {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["items", api.productContext],
    queryFn: async () => {
      const rawData = await api.get<any>("/v1/api/tenant/items?size=100");
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      return data.map((item: any) => ({
        uid: item.uid,
        name: item.name,
        code: item.code || '',
        sku: item.sku,
        description: item.description,
        categoryId: item.categoryId,
        categoryName: item.categoryName || 'General',
        brandName: item.brandName || '',
        variants: item.variants || [],
        units: item.units || [],
        status: item.status,
        itemNo: item.itemNo,
        baseUnitUid: item.baseUnitUid,
        trackInventory: item.trackInventory,
        allowLooseSale: item.allowLooseSale,
        rxEnabled: item.rxEnabled,
        // Pharmacy classification + medicine fields — surfaced so the edit form and
        // detail view pre-load them. Backend DTO uses `saltComposition`/`expiryExempt`;
        // the form reads `composition`/`noExpiry`, so alias them here.
        verticalType: item.verticalType,
        medicineSystem: item.medicineSystem,
        drugSchedule: item.drugSchedule,
        ayushType: item.ayushType,
        shelfLifeMonths: item.shelfLifeMonths,
        noExpiry: item.expiryExempt,
        composition: item.saltComposition,
        productSpecification: item.productSpecification,
        productContains: item.productContains,
        productContainsUnitUid: item.productContainsUnitUid,
        // Vertical/merchandising scalars live in the item's jsonb `attributes` map
        // (barcode, hsnCode, weight, itemType, taxGroup, taxPreference, infoBlocks).
        attributes: item.attributes || {},
        // Merchandising — surfaced so the edit form pre-loads them (backend jsonb columns).
        tags: item.tags || [],
        badges: item.badges || [],
        upsellItemUids: item.upsellItemUids || [],
        crossSellItemUids: item.crossSellItemUids || [],
      })) as Item[];
    },
    // Called from dozens of screens; without this every mount refetched (React Query's
    // default staleTime is 0). Kept short relative to stores/units since item data carries
    // price/stock-adjacent fields that shouldn't look stale for long.
    staleTime: 60_000,
  });
}

// F2: an item's real store/catalog placements. The list-row projection carries no catalog
// membership, so the detail panel must fetch this instead of showing "not assigned".
export function useItemPlacements(uid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["item-placements", uid],
    enabled: Boolean(uid),
    queryFn: async () => {
      if (!uid) return [] as any[];
      const data = await api.get<any>(`/v1/api/tenant/items/${uid}/placements`);
      return (Array.isArray(data) ? data : (data as any)?.content || []) as any[];
    },
  });
}

export function useCreateItem() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      const data = await api.post("/v1/api/tenant/items", normalizeItemPayload(payload));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    }
  });
}

export function useUpdateItem() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, payload }: { uid: string, payload: any }) => {
      const data = await api.put(`/v1/api/tenant/items/${uid}`, normalizeItemPayload(payload));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    }
  });
}

export function useDeleteItem() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => {
      const data = await api.del(`/v1/api/tenant/items/${uid}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    }
  });
}

export function useUpdateItemStatus() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, status }: { uid: string, status: string }) => {
      const data = await api.put(`/v1/api/tenant/items/${uid}/status/${status}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    }
  });
}

export function useSubmitImport() {
  const api = useCommerceApi();
  return useMutation({
    mutationFn: async (payload: ItemImportRequest) => {
      const data = await api.post("/v1/api/tenant/items/import", payload);
      return data as ItemImportJobDto;
    }
  });
}

export function useImportJob(jobId: string | null) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["importJob", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const data = await api.get<any>(`/v1/api/tenant/items/import/${jobId}`);
      return data as ItemImportJobDto;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state?.data?.status;
      return (status === "DONE" || status === "ERROR") ? false : 2000;
    }
  });
}
