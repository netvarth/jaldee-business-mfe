import { useQuery } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

/**
 * Available (sellable) batches for a store + item/variant — non-expired, FEFO-ordered
 * (earliest expiry first), from the backend GAP-11 endpoint. Feeds the batch selector
 * on order/purchase/transfer lines so a batch-tracked item is billed against a real,
 * in-stock, non-expired batch (never a hardcoded placeholder).
 */
export interface AvailableBatch {
  batchUid: string;
  batchNumber: string;
  expiryDate?: string;
  inHand?: number;
  onHold?: number;
  availableQty?: number;
  mrp?: number;
  sellingPrice?: number;
  itemUid?: string;
  variantUid?: string;
  storeUid?: string;
}

export function useBatchAvailable(
  storeUid?: string | null,
  itemUid?: string | null,
  variantUid?: string | null,
) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["batches-available", api.productContext, storeUid, itemUid, variantUid],
    enabled: Boolean(storeUid && itemUid),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("storeUid", String(storeUid));
      params.set("itemUid", String(itemUid));
      if (variantUid) params.set("variantUid", String(variantUid));
      const data = await api.get<any>(`/v1/api/tenant/batches/available?${params.toString()}`);
      return (Array.isArray(data) ? data : (data?.content ?? [])) as AvailableBatch[];
    },
  });
}
