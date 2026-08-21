import { useQuery } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

/**
 * Purchase lines from one vendor that still have quantity available to return.
 *
 * Backed by `GET /v1/api/tenant/purchases/returnable-items` in feature-commerce-service.
 *
 * ## Why this replaces `useReturnablePurchases`
 * That hook fetched `/purchases?size=100`, kept the newest 30, then issued **one detail request
 * per purchase** and filtered by vendor in the browser. Three consequences:
 *
 * 1. A vendor whose purchases fell outside the newest 30 had no returnable items at all — the
 *    search box simply came up empty, with nothing on screen saying why.
 * 2. Opening the screen cost up to 31 round trips.
 * 3. `availableQty` was the **full purchased quantity**. Nothing subtracted what had already been
 *    returned, so the same stock could be sent back repeatedly and the vendor over-credited.
 *
 * The server does the join now — `purchase_tbl.vendor_uid → purchase_item_tbl` was already indexed
 * (`idx_purchase_tenant_vendor`), so no new table was needed for this; only a query.
 *
 * ## Returned quantity
 * `returnedQty` is exact for returns recorded after 2026-07-20, when
 * `purchase_return_item_tbl.purchase_item_uid` was added. Older rows carry no reference to the
 * purchase line they came from and are attributed by item + batch, which is ambiguous when the
 * same batch was bought from the same vendor twice. Lines affected by that carry
 * `returnedQtyApproximate: true` — surface it rather than presenting the remaining quantity as
 * certain.
 */
export interface ReturnablePurchaseLine {
  /** Send this back as `purchaseItemUid` when creating the return line. */
  purchaseItemUid: string;

  purchaseUid: string;
  purchaseNo: string | null;
  billNo: string | null;
  purchaseDate: string | null;

  vendorUid: string | null;
  storeUid: string | null;

  itemUid: string;
  variantUid: string | null;
  itemName: string | null;
  sku: string | null;
  batchNumber: string | null;
  expiryDate: string | null;

  /** Purchase unit, e.g. "Strip of 20". Null when bought in the base unit. */
  unitUid: string | null;
  unitName: string | null;
  baseQty: number | null;

  unitPrice: number | null;
  mrp: number | null;
  /** Not stored on the purchase line — resolve from the item. Always null from the API today. */
  taxPercent: number | null;

  purchasedQty: number;
  returnedQty: number;
  returnableQty: number;

  /** True when some of `returnedQty` was matched by batch rather than by reference. */
  returnedQtyApproximate: boolean;
}

export interface ReturnableItemsFilter {
  /** Required — a purchase return is always against one dealer. */
  vendorUid?: string | null;
  storeUid?: string;
  search?: string;
  includeFullyReturned?: boolean;
}

const STALE_MS = 30_000;

export function useReturnableItems(filter: ReturnableItemsFilter) {
  const api = useCommerceApi();
  const { vendorUid, storeUid, search, includeFullyReturned } = filter;

  return useQuery({
    // Vendor is part of the key: switching dealer must not show the previous one's stock while
    // the new request is in flight.
    queryKey: ["returnable-items", vendorUid ?? null, storeUid ?? "all", search ?? "", !!includeFullyReturned],

    // The endpoint requires a vendor. Until one is chosen there is nothing meaningful to ask for,
    // and firing the request anyway would 400 on every keystroke.
    enabled: Boolean(vendorUid),

    queryFn: async (): Promise<ReturnablePurchaseLine[]> => {
      const params = new URLSearchParams({ vendorUid: String(vendorUid) });
      if (storeUid && storeUid !== "all") params.append("storeUid", storeUid);
      if (search?.trim()) params.append("search", search.trim());
      if (includeFullyReturned) params.append("includeFullyReturned", "true");

      const data = await api.get<any>(`/v1/api/tenant/purchases/returnable-items?${params.toString()}`);
      const rows: any[] = Array.isArray(data) ? data : data?.content ?? [];

      return rows.map((r) => ({
        ...r,
        // The API returns BigDecimal as string or number depending on the serializer; normalise so
        // arithmetic in the wizard can't silently concatenate.
        baseQty: num(r.baseQty),
        unitPrice: num(r.unitPrice),
        mrp: num(r.mrp),
        taxPercent: num(r.taxPercent),
        purchasedQty: num(r.purchasedQty) ?? 0,
        returnedQty: num(r.returnedQty) ?? 0,
        returnableQty: num(r.returnableQty) ?? 0,
        returnedQtyApproximate: Boolean(r.returnedQtyApproximate),
      }));
    },

    staleTime: STALE_MS,
  });
}

/** Preserves null — a missing price is not ₹0. */
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
