import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

/**
 * Items offered for sale inside an order catalog, with their per-selling-unit prices.
 *
 * ## Why this exists
 * Price used to be written to the *inventory* catalog item
 * (`useAddInventoryCatalogItem` + `catalog_item_unit_tbl`), which keys it to a stock location.
 * Two order catalogs drawing on the same stock were therefore forced to share one price, and an
 * item could not be priced at all without first creating a stock row. `order_catalog_item_tbl`
 * (+ `order_catalog_item_unit_tbl`) restores the grain the legacy monolith used —
 * (order catalog x item x selling unit) — with stock referenced rather than merged.
 *
 * Stock still goes through `useInventoryCatalogs`; this is the price surface only.
 */

export interface OrderCatalogItemUnitPayload {
  unitUid: string;
  sellingPrice?: number | null;
  mrp?: number | null;
  minSaleQty?: number | null;
  maxSaleQty?: number | null;
  qtyIncrement?: number | null;
  /** Named `defaultUnit`, not `isDefault` — see the note on the backend entity. */
  defaultUnit?: boolean;
  active?: boolean;
}

export interface OrderCatalogItemPayload {
  itemUid?: string;
  variantUid?: string | null;
  inventoryCatalogItemUid?: string | null;
  /** Source warehouse for the stock row above; used to group a catalog's items. */
  inventoryCatalogUid?: string | null;
  taxGroupUid?: string | null;
  taxIncluded?: boolean;
  showMrp?: boolean;
  storePickup?: boolean;
  homeDelivery?: boolean;
  courierService?: boolean;
  sortOrder?: number | null;
  active?: boolean;
  units?: OrderCatalogItemUnitPayload[];
}

export function useOrderCatalogItems(orderCatalogUid: string | null) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["orderCatalogItems", orderCatalogUid],
    enabled: !!orderCatalogUid,
    queryFn: () =>
      api.get<any[]>(`/v1/api/tenant/order-catalogs/${orderCatalogUid}/items`),
  });
}

/** One offering row as returned to the order/POS picker (item name, price units, live stock). */
export interface StoreCatalogItem {
  uid: string;
  itemUid: string;
  variantUid?: string | null;
  itemName?: string;
  itemCode?: string;
  /** Live in-hand stock from the linked inventory catalog item. `null` = untracked (not "zero"). */
  inHand?: number | null;
  units?: OrderCatalogItemUnitPayload[];
}

/**
 * Every item a store can actually sell — the union of its active order catalogs' offerings,
 * one row per (item, variant), each carrying its per-unit price and live stock.
 *
 * This is the correct source for the order-creation item picker: store → order catalog →
 * order catalog item. Returns an empty array for stores that have no order-catalog items set
 * up yet, so callers can fall back to the flat item master rather than showing nothing.
 */
export function useStoreCatalogProducts(storeUid: string | null) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["storeCatalogProducts", storeUid],
    enabled: !!storeUid,
    queryFn: () =>
      api.get<StoreCatalogItem[]>(
        `/v1/api/tenant/order-catalogs/store/${storeUid}/items`
      ),
  });
}

export function useAddOrderCatalogItem() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderCatalogUid,
      itemData,
    }: {
      orderCatalogUid: string;
      itemData: OrderCatalogItemPayload;
    }) =>
      // `useCommerceApi` types bodies as a structural `Json`; the payload interfaces above are
      // for caller ergonomics, so widen at the boundary rather than loosen them.
      api.post<any>(
        `/v1/api/tenant/order-catalogs/${orderCatalogUid}/items`,
        itemData as any
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["orderCatalogItems", variables.orderCatalogUid],
      });
    },
  });
}

export function useUpdateOrderCatalogItem() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    // Sending `units` replaces the whole price list; omit it to leave prices untouched.
    mutationFn: ({ uid, itemData }: { uid: string; itemData: OrderCatalogItemPayload }) =>
      api.put<any>(`/v1/api/tenant/order-catalogs/items/${uid}`, itemData as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orderCatalogItems"] });
    },
  });
}

export function useDeleteOrderCatalogItem() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uid: string) =>
      api.del<any>(`/v1/api/tenant/order-catalogs/items/${uid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orderCatalogItems"] });
    },
  });
}
