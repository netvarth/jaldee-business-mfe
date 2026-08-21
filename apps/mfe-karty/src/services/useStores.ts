import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

export interface StoreItem {
  id: string;
  name: string;
  location: string;
  contact: string;
  staff: number;
  status: 'Active' | 'Inactive';
  /** The store's inventory catalog — where its stock and catalog items live. Assigning an
   *  item "to a store" means adding it to this catalog, so callers need the uid. */
  inventoryCatalogUid?: string;
  trackInventory?: boolean;
}

export function useStores() {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["stores", api.productContext],
    queryFn: async () => {
      const rawData = await api.get<any>('/v1/api/tenant/stores?size=100');
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      return data.map((item: any) => ({
        id: item.uid || item.id,
        name: item.name,
        verticalType: item.verticalType || item.type || 'RETAIL',
        type: item.type || item.verticalType || 'RETAIL',
        location: item.location || item.type || item.code || 'Unknown Location',
        contact: item.contact || 'No Contact',
        staff: item.staffCount || 0,
        status: (item.status === 'ACTIVE' || item.status === 'Active' || !item.status) ? 'Active' : 'Inactive',
        inventoryCatalogUid: item.inventoryCatalogUid || undefined,
        trackInventory: item.trackInventory ?? undefined,
      })) as StoreItem[];
    },
    // Called from ~44 components; without this every mount refetched (React Query's default
    // staleTime is 0). Note this is a *different* query than useStoreSearchSchema() further
    // down this file, which already had its own staleTime — this one covers the actual store
    // list, which didn't.
    staleTime: 5 * 60_000,
  });
}

/** Lookup shape — name plus the descriptive fields a document header needs. */
export interface StoreLookupItem {
  id: string;
  name: string;
  code: string;
  type: string;
  contact: string;
  phone?: string;
  email?: string;
  location?: string;
  address?: string;
  catalogName: string;
  status: string;
}

/**
 * Store lookup for resolving names on historical documents (purchases, POs).
 * The default list endpoint excludes ARCHIVED stores, so a purchase raised
 * against a store that was later archived would otherwise show "Unknown Store".
 * This fetches active + archived and merges them.
 */
export function useStoresForLookup() {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["stores-lookup"],
    queryFn: async () => {
      const norm = (raw: any) => (Array.isArray(raw) ? raw : raw?.content || []);
      const [active, archived] = await Promise.all([
        api.get<any>('/v1/api/tenant/stores?size=200'),
        api.get<any>('/v1/api/tenant/stores?size=200&status=ARCHIVED').catch(() => []),
      ]);
      const byUid = new Map<string, any>();
      [...norm(active), ...norm(archived)].forEach((s: any) => byUid.set(s.uid || s.id, s));
      return Array.from(byUid.values()).map((item: any) => ({
        id: item.uid || item.id,
        name: item.name,
        code: item.code || '',
        gstin: item.gstin || '',
        type: item.type || '',
        contact: item.contact || item.phone || '',
        phone: item.phone || item.contact || '',
        email: item.email || '',
        location: item.location || '',
        address: [item.addressLine1 || item.address, item.city, item.state, item.pinCode || item.postalCode].filter(Boolean).join(', ') || item.address || item.location || '',
        catalogName: item.inventoryCatalogName || '',
        status: item.status || '',
      })) as StoreLookupItem[];
    },
  });
}

// ---------------------------------------------------------------------------
// Structured store search (search-filter API) — POST /v1/api/tenant/stores/search
// Backed by feature-commerce-service StoreController.search / StoreSearch config.
// ---------------------------------------------------------------------------

export type FilterOperator =
  | 'EQ' | 'NE' | 'IN' | 'NOT_IN'
  | 'LIKE' | 'STARTS_WITH' | 'ENDS_WITH' | 'CONTAINS'
  | 'GT' | 'GTE' | 'LT' | 'LTE' | 'BETWEEN' | 'IS_NULL' | 'IS_NOT_NULL';

export interface FilterNode {
  logic?: 'AND' | 'OR';
  conditions?: FilterNode[];
  field?: string;
  operator?: FilterOperator;
  values?: unknown[];
}

export interface StoreSearchRequest {
  view?: string;
  filters?: FilterNode;
  sort?: { field: string; direction: 'ASC' | 'DESC' }[];
  page?: number;
  size?: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
}

/** Structured, server-side store search. Tenant scope is derived from the auth token. */
export function useStoreSearch(request: StoreSearchRequest) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["stores", "search", request],
    queryFn: async () => {
      const res = await api.post<any>('/v1/api/tenant/stores/search', request ?? {});
      const content = Array.isArray(res) ? res : (res?.content ?? []);
      return {
        content,
        page: res?.page ?? 0,
        size: res?.size ?? content.length,
        totalElements: res?.totalElements ?? content.length,
        totalPages: res?.totalPages ?? 1,
        first: res?.first ?? true,
        last: res?.last ?? true,
        hasNext: res?.hasNext ?? false,
      } as PageResponse<any>;
    },
    // Keep the previous page visible while a new filter/page is fetched.
    placeholderData: (prev) => prev,
  });
}

/** Backend-declared filter schema (fields, operators, views) for the store search. */
export function useStoreSearchSchema() {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["stores", "search", "schema"],
    queryFn: () => api.get<any>('/v1/api/tenant/stores/search/schema'),
    staleTime: 5 * 60_000,
  });
}

// Backend VerticalType enum: RETAIL / PHARMACY / RESTAURANT / GROCERY / OTHER / BAKERY.
// The store form only collects a "type" (RETAIL/PHARMACY/BAKERY/DEPARTMENTAL) but the
// backend requires verticalType — derive it from type (unmapped types fall back to OTHER).
function deriveVerticalType(type: any): string {
  const t = typeof type === "string" ? type.toUpperCase() : "";
  const known = ["RETAIL", "PHARMACY", "RESTAURANT", "GROCERY", "BAKERY", "AYURVEDA", "WAREHOUSE", "CAFE", "KITCHEN", "CINEMA", "DISTRIBUTOR", "OTHER"];
  return known.includes(t) ? t : "OTHER";
}

// Backend StoreStatus enum accepts ACTIVE / DRAFT / ARCHIVED (uppercase).
// The UI carries status as title-case ('Active'/'Draft'/'Archived'); normalize
// before sending so we don't 400 on enum deserialization.
function normalizeStorePayload(payload: any) {
  if (!payload || typeof payload !== "object") return payload;
  const normalized: any = { ...payload };
  delete normalized.id;
  if (!normalized.uid || typeof normalized.uid !== "string" || normalized.uid.length < 32) {
    delete normalized.uid;
  }
  if (typeof normalized.status === "string") {
    normalized.status = normalized.status.toUpperCase();
  }
  if (!normalized.verticalType) {
    normalized.verticalType = deriveVerticalType(normalized.type);
  }
  if (normalized.isSelfOrder !== undefined && normalized.selfOrder === undefined) {
    normalized.selfOrder = Boolean(normalized.isSelfOrder);
  }
  if (normalized.walkInPos !== undefined && normalized.walkinPos === undefined) {
    normalized.walkinPos = Boolean(normalized.walkInPos);
  }
  if (normalized.storePickup !== undefined) {
    normalized.storePickup = Boolean(normalized.storePickup);
  }
  if (normalized.homeDelivery !== undefined) {
    normalized.homeDelivery = Boolean(normalized.homeDelivery);
  }
  if (normalized.trackInventory !== undefined) {
    normalized.trackInventory = Boolean(normalized.trackInventory);
  }

  const methods: string[] = [];
  if (normalized.storePickup || normalized.walkinPos) {
    methods.push("PICKUP");
  }
  if (normalized.homeDelivery) {
    methods.push("DELIVERY");
    methods.push("SHIP");
  }
  if (methods.length > 0 && !normalized.fulfillmentMethods) {
    normalized.fulfillmentMethods = methods;
  }
  return normalized;
}

export function useCreateStore() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/v1/api/tenant/stores", normalizeStorePayload(payload));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["stores", "search"] });
      queryClient.invalidateQueries({ queryKey: ["stores-search"] });
      queryClient.invalidateQueries({ queryKey: ["stores-lookup"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryCatalogs"] });
      queryClient.invalidateQueries({ queryKey: ["orderCatalogs"] });
    }
  });
}

export function useUpdateStore() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, payload }: { uid: string, payload: any }) => {
      return await api.put(`/v1/api/tenant/stores/${uid}`, normalizeStorePayload(payload));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    }
  });
}

export function useDeleteStore() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => {
      await api.del(`/v1/api/tenant/stores/${uid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    }
  });
}

export function useUpdateStoreStatus() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, status }: { uid: string, status: string }) => {
      return await api.put(`/v1/api/tenant/stores/${uid}/status/${status.toUpperCase()}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    }
  });
}
