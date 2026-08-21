import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";
import { useVendors } from "./useVendors";
import { useStoresForLookup } from "./useStores";

/**
 * Purchase Order (PO) + Purchase Entry-against-PO data layer.
 *
 * A PO is the document sent to a dealer (ordered qty + agreed price). Goods arrive through
 * one or more Purchase Entries (GRNs) that each fulfil part of the PO — see
 * docs/commerce/PURCHASE_ORDER_AND_ENTRY_FLOW.md in the backend repo.
 *
 * Endpoints (feature-commerce-service, context-path /commerce-service):
 *   POST /v1/api/tenant/purchase-orders
 *   GET  /v1/api/tenant/purchase-orders            (?status=SENT&size=100)
 *   GET  /v1/api/tenant/purchase-orders/{uid}
 *   PUT  /v1/api/tenant/purchase-orders/{uid}/status/{status}
 *   GET  /v1/api/tenant/purchase-orders/{uid}/pending-lines
 *   POST /v1/api/tenant/purchases                  (entry; carries poUid + line poItemUid)
 */

export type PurchaseOrderStatus =
  | "DRAFT" | "SENT" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CLOSED" | "CANCELLED";

export interface PurchaseOrderRow {
  id: string;
  poNo: string;
  date: string;
  vendorUid: string;
  vendorName: string;
  storeUid: string;
  storeName: string;
  status: PurchaseOrderStatus;
  totalOrderedQty: number;
  totalAmount: number;
}

/** A PO line with how much is still to be received — drives the Purchase Entry screen. */
export interface PoPendingLine {
  poItemUid: string;
  itemUid: string;
  variantUid: string | null;
  itemName: string;
  sku: string;
  unitUid: string;
  orderedQty: number;
  receivedQty: number;
  pendingQty: number;
  unitPrice: number;
  mrp: number | null;
}

const STATUS_LABEL: Record<string, PurchaseOrderStatus> = {
  DRAFT: "DRAFT", SENT: "SENT", PARTIALLY_RECEIVED: "PARTIALLY_RECEIVED",
  RECEIVED: "RECEIVED", CLOSED: "CLOSED", CANCELLED: "CANCELLED",
};

export function usePurchaseOrders(status?: PurchaseOrderStatus) {
  const api = useCommerceApi();
  const { data: vendors = [] } = useVendors();
  const { data: stores = [] } = useStoresForLookup();

  return useQuery({
    queryKey: ["purchase-orders", status ?? "all", vendors.length, stores.length],
    queryFn: async () => {
      const qs = `size=100${status ? `&status=${status}` : ""}`;
      const raw = await api.get<any>(`/v1/api/tenant/purchase-orders?${qs}`);
      const data = Array.isArray(raw) ? raw : raw?.content || [];
      const vendorMap = new Map(vendors.map((v: any) => [v.uid, v.name]));
      const storeMap = new Map(stores.map((s: any) => [s.id || s.uid, s.name]));
      return data.map((p: any) => {
        const dt = p.poDate ? new Date(p.poDate) : null;
        return {
          id: p.uid || p.id,
          poNo: p.poNo || "N/A",
          date: dt ? dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "",
          vendorUid: p.vendorUid,
          vendorName: vendorMap.get(p.vendorUid) || "Unknown dealer",
          storeUid: p.toStoreUid,
          storeName: storeMap.get(p.toStoreUid) || "Unknown store",
          status: STATUS_LABEL[p.status] || "DRAFT",
          totalOrderedQty: Number(p.totalOrderedQty ?? 0),
          totalAmount: Number(p.totalAmount ?? 0),
        } as PurchaseOrderRow;
      }) as PurchaseOrderRow[];
    },
  });
}

/** Open POs a Purchase Entry can be booked against. */
export function useOpenPurchaseOrders() {
  const all = usePurchaseOrders();
  return {
    ...all,
    data: (all.data ?? []).filter(
      (p) => p.status === "SENT" || p.status === "PARTIALLY_RECEIVED"
    ),
  };
}

export function usePurchaseOrder(uid: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["purchase-order", uid],
    queryFn: async () => (uid ? api.get<any>(`/v1/api/tenant/purchase-orders/${uid}`) : null),
    enabled: !!uid,
  });
}

/** A goods receipt (Purchase) booked against a PO. */
export interface PoEntryRow {
  uid: string;
  purchaseNo: string;
  billNo: string;
  date: string;
  status: string;
  totalQty: number;
  lineCount: number;
  value: number;
}

/**
 * Goods receipts booked against this PO — GET /purchase-orders/{uid}/entries returns the
 * full PurchaseDto list, so line count and value are summed from each receipt's items.
 */
export function usePurchaseOrderEntries(uid: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["purchase-order-entries", uid],
    queryFn: async () => {
      if (!uid) return [] as PoEntryRow[];
      const raw = await api.get<any>(`/v1/api/tenant/purchase-orders/${uid}/entries`);
      const data = Array.isArray(raw) ? raw : raw?.content || [];
      return data.map((p: any) => {
        const items = Array.isArray(p.items) ? p.items : [];
        const dt = p.purchaseDate ? new Date(p.purchaseDate) : null;
        return {
          uid: p.uid || p.id,
          purchaseNo: p.purchaseNo || p.orderNo || "—",
          billNo: p.billNo || "—",
          date: dt ? dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—",
          status: p.status || "",
          totalQty: Number(p.totalQty ?? 0),
          lineCount: items.length,
          value: items.reduce(
            (sum: number, it: any) => sum + Number(it.purchQty ?? it.qty ?? 0) * Number(it.unitPrice ?? 0),
            0
          ),
        } as PoEntryRow;
      }) as PoEntryRow[];
    },
    enabled: !!uid,
  });
}

/** Lines with pendingQty > 0 for the selected PO — pre-fills the entry table. */
export function usePurchaseOrderPendingLines(uid: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["purchase-order-pending", uid],
    queryFn: async () => {
      if (!uid) return [] as PoPendingLine[];
      const raw = await api.get<any>(`/v1/api/tenant/purchase-orders/${uid}/pending-lines`);
      const data = Array.isArray(raw) ? raw : raw?.content || [];
      return data.map((l: any) => ({
        poItemUid: l.poItemUid || l.uid,
        itemUid: l.itemUid,
        variantUid: l.variantUid ?? null,
        itemName: l.itemName || l.name || "Item",
        sku: l.sku || l.itemCode || "",
        unitUid: l.unitUid || "",
        orderedQty: Number(l.orderedQty ?? 0),
        receivedQty: Number(l.receivedQty ?? 0),
        pendingQty: Number(l.pendingQty ?? (Number(l.orderedQty ?? 0) - Number(l.receivedQty ?? 0))),
        unitPrice: Number(l.unitPrice ?? 0),
        mrp: l.mrp != null ? Number(l.mrp) : null,
      })) as PoPendingLine[];
    },
    enabled: !!uid,
  });
}

export function useCreatePurchaseOrder() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => api.post<any>("/v1/api/tenant/purchase-orders", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });
}

export function useUpdatePurchaseOrderStatus() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: PurchaseOrderStatus }) =>
      api.put<any>(`/v1/api/tenant/purchase-orders/${uid}/status/${status}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });
}

/**
 * Book a Purchase Entry (GRN) against a PO. Posts to the existing purchases endpoint with
 * poUid + a poItemUid on each line, so the backend rolls received qty back onto the PO and
 * receives stock. Invalidates both the entry list and the PO/pending caches.
 */
export function useCreatePurchaseEntry() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    // Create the receipt as a draft, then approve it — approval is what posts stock
    // and rolls received qty back onto the PO (create alone does neither).
    mutationFn: async (payload: any) => {
      const created = await api.post<any>("/v1/api/tenant/purchases", payload);
      const uid = created?.uid || created?.id;
      if (uid) await api.put<any>(`/v1/api/tenant/purchases/${uid}/approve`);
      return created;
    },
    onSuccess: (_data, vars: any) => {
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      if (vars?.poUid) {
        qc.invalidateQueries({ queryKey: ["purchase-order", vars.poUid] });
        qc.invalidateQueries({ queryKey: ["purchase-order-pending", vars.poUid] });
      }
    },
  });
}
