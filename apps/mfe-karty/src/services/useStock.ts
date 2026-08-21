import { useQuery } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

export interface InventoryStock {
  uid: string;
  storeUid: string;
  catalogUid: string;
  catalogItemUid: string;
  itemUid: string;
  variantUid?: string;
  batchUid: string;
  inHand: number;
  onHold: number;
  stockStatus: string;
  itemName?: string;
  itemSku?: string;
  storeName?: string;
}

export interface StockLedger {
  uid: string;
  occurredAt: string;
  storeUid: string;
  catalogUid: string;
  catalogItemUid: string;
  itemUid: string;
  variantUid?: string;
  batchUid: string;
  movementType: string;
  sourceDoc: string;
  sourceUid: string;
  sourceLineUid: string;
  inHandDelta: number;
  onHoldDelta: number;
  inHandAfter: number;
  onHoldAfter: number;
  reversalOfUid?: string;
  reason?: string;
  notes?: string;
  itemName?: string;
  storeName?: string;
}

export function useInventoryStock(storeUid?: string, search: string = "", enabled: boolean = true) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["inventory-stock", api.productContext, storeUid, search],
    queryFn: async () => {
      let url = `/v1/api/tenant/inventory-stock?search=${encodeURIComponent(search)}&size=100`;
      if (storeUid) {
        url += `&storeUid=${storeUid}`;
      }
      const rawData = await api.get<any>(url);
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      return data as InventoryStock[];
    },
    enabled,
  });
}

export function useStockLedger(storeUid?: string, itemUid?: string) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["stock-ledger", storeUid, itemUid],
    queryFn: async () => {
      let url = `/v1/api/tenant/stock-ledger?size=100`;
      if (storeUid) url += `&storeUid=${storeUid}`;
      if (itemUid) url += `&itemUid=${itemUid}`;
      const rawData = await api.get<any>(url);
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      return data as StockLedger[];
    }
  });
}

export interface BatchDto {
  uid: string;
  itemUid: string;
  itemName?: string;
  variantUid?: string;
  batchNumber: string;
  mfgDate?: string;
  expiryDate?: string;
  isMaturedNoExpiry?: boolean;
  mrp?: number;
  costPrice?: number;
  status: 'IN_STOCK' | 'EXPIRED' | 'DEPLETED' | 'QUARANTINE';
  availableQty?: number;
}

export function useAvailableBatches(storeUid?: string, itemUid?: string, variantUid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["available-batches", storeUid, itemUid, variantUid],
    queryFn: async () => {
      if (!storeUid || !itemUid) return [];
      const q = new URLSearchParams({ storeUid, itemUid });
      if (variantUid) q.set('variantUid', variantUid);
      const data = await api.get<BatchDto[]>(`/v1/api/tenant/batches/available?${q.toString()}`);
      return data || [];
    },
    enabled: !!storeUid && !!itemUid,
    staleTime: 15_000,
  });
}

export function useAllBatches(storeUid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["all-batches", storeUid],
    queryFn: async () => {
      const url = storeUid
        ? `/v1/api/tenant/batches/all?storeUid=${storeUid}&size=200`
        : '/v1/api/tenant/batches/all?size=200';
      const rawData = await api.get<any>(url);
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      return data as BatchDto[];
    },
    staleTime: 30_000,
  });
}
