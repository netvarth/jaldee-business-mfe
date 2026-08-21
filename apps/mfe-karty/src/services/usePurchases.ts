import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";
import { useVendors } from "./useVendors";
import { useStoresForLookup } from "./useStores";

// The backend resolves a purchase only by its UUID. Optimistic rows created client-side use a
// temporary numeric id (Date.now()), so guard detail fetches to real UUIDs — otherwise
// GET /purchases/{tempId} 400s and the detail renders empty (F9).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v?: string) => !!v && UUID_RE.test(v);

export interface PurchaseItem {
  id: string;
  orderNo: string;
  date: string;
  time: string;
  from: { name: string; id: string; color: string; initials: string };
  to: { name: string; id: string; type: 'store' };
  status: 'Draft' | 'In Review' | 'Approved' | 'Cancelled';
  qty: number;
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "VN"
  );
}

export function usePurchases() {
  const api = useCommerceApi();
  const { data: vendors = [] } = useVendors();
  const { data: stores = [] } = useStoresForLookup();

  return useQuery({
    // Re-key when the lookup lists arrive so vendor/store names resolve.
    queryKey: ["purchases", vendors.length, stores.length],
    queryFn: async () => {
      const rawData = await api.get<any>("/v1/api/tenant/purchases?size=100");
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      const vendorMap = new Map(vendors.map((v: any) => [v.uid, v.name]));
      const storeMap = new Map(stores.map((s: any) => [s.id, s.name]));
      return data.map((item: any) => {
        const vendorName = vendorMap.get(item.vendorUid) || "Unknown Vendor";
        const storeName = storeMap.get(item.toStoreUid) || "Unknown Store";
        const dt = item.purchaseDate ? new Date(item.purchaseDate) : null;
        return {
          id: item.uid || item.id,
          orderNo: item.orderNo || item.purchaseNo || "N/A",
          date: dt
            ? dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "",
          time: dt ? dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "",
          from: {
            name: vendorName,
            id: item.vendorUid ? `#${String(item.vendorUid).slice(0, 6)}` : "#-",
            color: "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]",
            initials: initialsOf(vendorName),
          },
          to: {
            name: storeName,
            id: item.toStoreUid ? `#${String(item.toStoreUid).slice(0, 6)}` : "#-",
            type: "store" as const,
          },
          status:
            item.status === "APPROVED"
              ? "Approved"
              : item.status === "CANCELLED"
              ? "Cancelled"
              : item.status === "IN_REVIEW"
              ? "In Review"
              : "Draft",
          qty: item.totalQty ?? item.qty ?? 0,
        };
      }) as PurchaseItem[];
    },
  });
}

export interface ScanReceiveResult {
  barcode: string;
  status: "MATCHED_LINE" | "KNOWN_ITEM_NOT_ON_PURCHASE" | "UNKNOWN_BARCODE";
  scopeType?: string;
  barcodeType?: string;
  itemUid?: string;
  variantUid?: string;
  itemName?: string;
  purchaseItemUid?: string;
  currentQty?: number;
  message?: string;
}

/**
 * Scan a barcode while receiving goods against a purchase.
 * POST /v1/api/tenant/purchases/{uid}/scan?barcode=  (resolver — does not mutate the purchase)
 */
export function useScanToReceive() {
  const api = useCommerceApi();
  return useMutation({
    mutationFn: async ({ purchaseUid, barcode }: { purchaseUid: string; barcode: string }) =>
      api.post<ScanReceiveResult>(
        `/v1/api/tenant/purchases/${purchaseUid}/scan?barcode=${encodeURIComponent(barcode)}`
      ),
  });
}

export function usePurchase(uid: string) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["purchase", uid],
    queryFn: async () => {
      if (!isUuid(uid)) return null;
      return await api.get<any>(`/v1/api/tenant/purchases/${uid}`);
    },
    enabled: isUuid(uid),
  });
}

export function useCreatePurchase() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (purchaseData: any) =>
      api.post<any>("/v1/api/tenant/purchases", purchaseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
  });
}

export function useUpdatePurchase() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, data }: { uid: string, data: any }) =>
      api.put<any>(`/v1/api/tenant/purchases/${uid}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
  });
}

export function useUpdatePurchaseStatus() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, status }: { uid: string, status: string }) =>
      api.put<any>(`/v1/api/tenant/purchases/${uid}/status/${status}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
  });
}

export function useApprovePurchase() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uid: string) =>
      api.put<any>(`/v1/api/tenant/purchases/${uid}/status/APPROVED`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
  });
}

export function useCancelPurchase() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uid: string) =>
      api.put<any>(`/v1/api/tenant/purchases/${uid}/status/CANCELLED`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
  });
}

/**
 * Sales prices captured on a purchase, one per order catalog.
 *
 * Buying stock and pricing it for sale are one action: saving pushes the rate onto the
 * order catalog's inventory item (see feature-commerce-service PurchaseSalesPriceService).
 * Only valid once the purchase is APPROVED.
 *
 *   GET  /v1/api/tenant/purchases/{uid}/sales-prices
 *   POST /v1/api/tenant/purchases/{uid}/sales-prices   (list of {purchaseItemUid, orderCatalogUid, salesRate})
 */
export interface PurchaseSalesPrice {
  uid?: string;
  purchaseItemUid: string;
  orderCatalogUid: string;
  orderCatalogName?: string;
  salesRate: number;
  orderRate?: number;
  purchaseRate?: number;
  appliedToCatalog?: boolean;
}

export function usePurchaseSalesPrices(purchaseUid: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["purchase-sales-prices", purchaseUid],
    queryFn: async () => {
      if (!isUuid(purchaseUid)) return [] as PurchaseSalesPrice[];
      const raw = await api.get<any>(`/v1/api/tenant/purchases/${purchaseUid}/sales-prices`);
      return (Array.isArray(raw) ? raw : raw?.content || []) as PurchaseSalesPrice[];
    },
    enabled: isUuid(purchaseUid),
  });
}

export function useSavePurchaseSalesPrices(purchaseUid: string) {
  const api = useCommerceApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prices: PurchaseSalesPrice[]) =>
      api.post<any>(`/v1/api/tenant/purchases/${purchaseUid}/sales-prices`, prices),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-sales-prices", purchaseUid] });
      // Selling price landed on the catalog item — refresh anything that reads it.
      queryClient.invalidateQueries({ queryKey: ["purchase", purchaseUid] });
      queryClient.invalidateQueries({ queryKey: ["inventoryCatalogItems"] });
    },
  });
}

/**
 * Server-side line pricing (POST /purchases/item/details). Returns the fully computed line —
 * gross, discount, taxable, tax split, net — using the exact code path that runs on save, so
 * the create form previews the same numbers it will store. Never do purchase tax maths in JS.
 */
export function usePricePurchaseLine() {
  const api = useCommerceApi();
  return useMutation({
    mutationFn: ({ line, supplyType }: { line: any; supplyType?: string }) =>
      api.post<any>(
        `/v1/api/tenant/purchases/item/details${supplyType ? `?supplyType=${supplyType}` : ''}`,
        line
      ),
  });
}
