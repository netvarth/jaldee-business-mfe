import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";
import { useStores } from "./useStores";

export interface OrderCatalogItem {
  id: string;
  name: string;
  itemsCount: number;
  store: string;
  storeUid?: string;
  status: 'Active' | 'Draft' | 'Archived';
  lastModified?: string;
}

export function useOrderCatalogs() {
  const api = useCommerceApi();
  const { data: stores = [] } = useStores();

  return useQuery({
    queryKey: ["orderCatalogs", api.productContext, stores.length],
    queryFn: async () => {
      const rawData = await api.get<any>("/v1/api/tenant/order-catalogs?size=100");
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      const storeMap = new Map(stores.map((s: any) => [s.id, s.name]));
      return data.map((item: any) => ({
        id: item.uid || item.id,
        name: item.name,
        itemsCount: item.itemsCount || 0,
        store: storeMap.get(item.storeUid) || item.storeUid || '',
        storeUid: item.storeUid,
        status: item.status === 'ACTIVE' ? 'Active' : item.status === 'DRAFT' ? 'Draft' : 'Archived',
        lastModified: item.lastModified,
      })) as OrderCatalogItem[];
    }
  });
}

/**
 * Wire shape for order-catalog create/update — mirrors the backend `OrderCatalogDto`.
 * Deliberately not `Partial<OrderCatalogItem>`: that is the UI's display model (currency as
 * "INR (₹)", flags as "Yes"/"No"), and typing the API against it let mismatched field names
 * like `currency` and `inventoryCatalogUids` through silently.
 */
export interface OrderCatalogPayload {
  name?: string;
  description?: string;
  status?: string;
  storeUid?: string;
  currencyCode?: string;
  walkinPos?: boolean;
  storePickup?: boolean;
  homeDelivery?: boolean;
  inventoryManagement?: boolean;
  selectedInventoryCatalogUids?: string[];
}

export function useCreateOrderCatalog() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newCatalog: OrderCatalogPayload) =>
      api.post<any>("/v1/api/tenant/order-catalogs", newCatalog as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orderCatalogs"] });
    },
  });
}

export function useUpdateOrderCatalog() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: OrderCatalogPayload }) =>
      api.put<any>(`/v1/api/tenant/order-catalogs/${uid}`, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orderCatalogs"] });
    },
  });
}

export function useDeleteOrderCatalog() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uid: string) =>
      api.del(`/v1/api/tenant/order-catalogs/${uid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orderCatalogs"] });
    },
  });
}

export function useUpdateOrderCatalogStatus() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: string }) =>
      api.put<any>(`/v1/api/tenant/order-catalogs/${uid}/status/${status}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orderCatalogs"] });
    },
  });
}

export function useOrderCatalogItems(orderCatalogUid: string) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["orderCatalogItems", orderCatalogUid],
    queryFn: async () => {
      if (!orderCatalogUid) return [];
      const rawData = await api.get<any>(`/v1/api/tenant/order-catalogs/${orderCatalogUid}/items`);
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      return data;
    },
    enabled: !!orderCatalogUid,
  });
}
