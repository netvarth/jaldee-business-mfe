import { useQuery } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";
import { useVendors } from "./useVendors";
import { useStores } from "./useStores";
import { useItems } from "./useItems";

/**
 * Shape consumed by the "create purchase return" wizard in PurchaseReturnsTable.
 * Mirrors what the screen previously took from MOCK_PURCHASE_ORDERS, but sourced
 * from live purchases (feature-commerce-service /purchases + /purchases/{uid}).
 */
export interface ReturnablePurchaseItem {
  id: string;
  itemUid: string;
  units: any[];
  unitUid?: string;
  batchNumber?: string;
  name: string;
  details: string;
  batch: string;
  image: string;
  availableQty: string;
  purPrice: number;
  returnQty: number;
  reason: string;
  taxPercent: number;
  unit?: string;
  unitDescription?: string;
  selectedUnit?: string;
  boxSize?: number;
  // extra context fields the wizard reads via (item as any)
  vendorName?: string;
  purchaseNo?: string;
}

export interface ReturnablePurchaseOrder {
  purchaseNo: string;
  billNo: string;
  date: string;
  vendorName: string;
  vendorId: string;
  vendorUid: string | null;
  storeUid: string | null;
  storeName: string;
  storeSubtitle: string;
  items: ReturnablePurchaseItem[];
}

// Only recent, received/approved purchases are returnable; cap the number of
// per-PO detail fetches so the wizard stays responsive.
const MAX_RETURNABLE_POS = 30;

export function useReturnablePurchases() {
  const api = useCommerceApi();
  const { data: vendors = [] } = useVendors();
  const { data: stores = [] } = useStores();
  const { data: items = [] } = useItems();

  return useQuery({
    queryKey: ["returnable-purchases", vendors.length, stores.length, items.length],
    queryFn: async (): Promise<ReturnablePurchaseOrder[]> => {
      const rawList = await api.get<any>("/v1/api/tenant/purchases?size=100");
      const list = Array.isArray(rawList) ? rawList : rawList?.content || [];

      const vendorMap = new Map(vendors.map((v: any) => [v.uid, v.name]));
      const storeMap = new Map(stores.map((s: any) => [s.id, s.name]));
      const itemMap = new Map(items.map((it: any) => [it.uid, it]));

      // Received/approved purchases first; these are the ones that can be returned.
      const returnable = list
        .filter((p: any) => ["APPROVED", "RECEIVED", "COMPLETED"].includes(p.status) || !!p.status)
        .slice(0, MAX_RETURNABLE_POS);

      const detailed = await Promise.all(
        returnable.map(async (p: any) => {
          const uid = p.uid || p.id;
          let detail = p;
          try {
            detail = await api.get<any>(`/v1/api/tenant/purchases/${uid}`);
          } catch {
            /* fall back to the list row if the detail fetch fails */
          }

          const vendorName = vendorMap.get(p.vendorUid) || "Unknown Vendor";
          const storeName = storeMap.get(p.toStoreUid) || "Unknown Store";
          const dt = p.purchaseDate ? new Date(p.purchaseDate) : null;
          const purchaseNo = p.purchaseNo || p.orderNo || `#${String(uid).slice(0, 6)}`;

          const poItems: ReturnablePurchaseItem[] = (detail.items || []).map((it: any) => {
            const item = itemMap.get(it.itemUid);
            const qty = it.qty ?? it.purchQty ?? 0;
            return {
              id: it.uid || `${uid}-${it.itemUid}`,
              itemUid: it.itemUid,
              units: item?.units || [],
              unitUid: "",
              batchNumber: it.batchNumber || "",
              name: item?.name || "Item",
              details: item?.sku ? `SKU ${item.sku}` : "",
              batch: it.batchNumber ? `Batch ${it.batchNumber}` : "No Batch",
              image: item?.image || item?.imageUrl || "",
              availableQty: String(qty),
              purPrice: Number(it.unitPrice) || 0,
              returnQty: 0,
              reason: "",
              taxPercent: 0,
              vendorName,
              purchaseNo,
            };
          });

          return {
            purchaseNo,
            billNo: p.billNo || "—",
            date: dt
              ? dt.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
              : "",
            vendorName,
            vendorId: p.vendorUid ? `#${String(p.vendorUid).slice(0, 7)}` : "#-",
            vendorUid: p.vendorUid || null,
            storeUid: p.toStoreUid || null,
            storeName,
            storeSubtitle: storeName,
            items: poItems,
          } as ReturnablePurchaseOrder;
        })
      );

      // Only keep POs that actually have line items to return.
      return detailed.filter((po) => po.items.length > 0);
    },
  });
}
