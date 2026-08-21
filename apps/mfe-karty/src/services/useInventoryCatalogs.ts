import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";
import { useStores } from "./useStores";

export interface CatalogItem {
  id: string;
  name: string;
  itemsCount: number;
  store: string;
  storeUid?: string;
  status: 'Active' | 'Draft' | 'Archived';
  description?: string;
}

export function useInventoryCatalogs() {
  const api = useCommerceApi();
  const { data: stores = [] } = useStores();

  return useQuery({
    queryKey: ["inventoryCatalogs", stores.length],
    queryFn: async () => {
      const rawData = await api.get<any>("/v1/api/tenant/inventory-catalogs?size=100");
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      const storeMap = new Map(stores.map((s: any) => [s.id, s.name]));
      return data.map((item: any) => ({
        id: item.uid || item.id,
        name: item.name,
        itemsCount: item.itemsCount || 0,
        store: storeMap.get(item.storeUid) || item.storeUid || 'Unknown Store',
        storeUid: item.storeUid,
        status: item.status === 'ACTIVE' ? 'Active' : item.status === 'DRAFT' ? 'Draft' : 'Archived',
        description: item.description,
      })) as CatalogItem[];
    },
  });
}

export function useCreateCatalog() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newCatalog: Partial<CatalogItem> & { storeUid?: string }) => {
      const payload: any = { ...newCatalog };
      if (typeof payload.status === 'string') {
        payload.status = payload.status.toUpperCase();
      }
      return api.post<CatalogItem>("/v1/api/tenant/inventory-catalogs", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryCatalogs"] });
    },
  });
}

export function useUpdateCatalogStatus() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: string }) =>
      api.put<boolean>(`/v1/api/tenant/inventory-catalogs/${uid}/status/${status}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryCatalogs"] });
    },
  });
}

export function useUpdateCatalog() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: Partial<CatalogItem> }) =>
      api.put<CatalogItem>(`/v1/api/tenant/inventory-catalogs/${uid}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryCatalogs"] });
    },
  });
}

export function useDeleteCatalog() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uid: string) =>
      api.del<boolean>(`/v1/api/tenant/inventory-catalogs/${uid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryCatalogs"] });
    },
  });
}

export function useInventoryCatalogItems(catalogUid: string) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["inventoryCatalogItems", catalogUid],
    queryFn: async () => {
      if (!catalogUid) return [];
      const rawData = await api.get<any>(`/v1/api/tenant/inventory-catalogs/${catalogUid}/items?size=100`);
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      return data.map((item: any) => ({
        id: item.uid,
        catalogUid: item.catalogUid,
        itemUid: item.itemUid,
        variantUid: item.variantUid,
        // Backend now resolves these on InventoryCatalogItemDto — prefer them over the item master map.
        itemName: item.itemName,
        itemSku: item.itemSku,
        categoryName: item.categoryName,
        itemAliasName: item.itemAliasName,
        itemDetail: item.itemDetail, // if backend expands it
        sellingPrice: item.sellingPrice,
        mrp: item.mrp,
        batches: item.batches || [],
        units: item.units || [], // per-unit price + rules
        status: item.status,
      }));
    },
    enabled: !!catalogUid,
  });
}

/**
 * Every inventory-catalog placement of one item, across all catalogs. Backs the edit form's
 * Catalog & Pricing step so an item's existing catalog rows and prices pre-load instead of
 * showing a blank row. Backed by GET /inventory-catalogs/item-placements?itemUid=…
 */
export function useItemInventoryPlacements(itemUid?: string | null) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["itemInventoryPlacements", itemUid],
    enabled: !!itemUid,
    queryFn: async () => {
      if (!itemUid) return [];
      const rawData = await api.get<any>(
        `/v1/api/tenant/inventory-catalogs/item-placements?itemUid=${itemUid}&size=200`
      );
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      return data.map((row: any) => ({
        catalogItemUid: row.uid,
        catalogUid: row.catalogUid,
        itemUid: row.itemUid,
        mrp: row.mrp,
        sellingPrice: row.sellingPrice,
        inHand: row.inHand,
        units: row.units || [],
      }));
    },
  });
}

export function useAddInventoryCatalogItem() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ catalogUid, itemData }: { catalogUid: string, itemData: any }) =>
      api.post<any>(`/v1/api/tenant/inventory-catalogs/${catalogUid}/items`, itemData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventoryCatalogItems", variables.catalogUid] });
    },
  });
}

export function useInventoryCatalogItem(uid: string | null) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["inventoryCatalogItem", uid],
    enabled: !!uid,
    queryFn: async () => {
      if (!uid) return null;
      return api.get<any>(`/v1/api/tenant/inventory-catalogs/items/${uid}`);
    },
  });
}

export function useUpdateInventoryCatalogItem() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, data }: { uid: string, data: any }) =>
      api.put<any>(`/v1/api/tenant/inventory-catalogs/items/${uid}`, data),
    onSuccess: (_, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["inventoryCatalogItems", variables.catalogUid] });
    },
  });
}

export function useRemoveInventoryCatalogItem() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ catalogUid, itemUid }: { catalogUid: string, itemUid: string }) =>
      api.del(`/v1/api/tenant/inventory-catalogs/${catalogUid}/items/${itemUid}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventoryCatalogItems", variables.catalogUid] });
    },
  });
}
