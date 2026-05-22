import { httpClient } from "@/lib/httpClient";
import type {
  DraftStoneDetail,
  DraftTag,
  GoodsReceiptNote,
  PurchaseOrder,
  PurchaseOrderStatus,
} from "@/lib/gold-erp-types";
import { appendQuery, normalizeCountResponse } from "./serviceUtils";

export interface CreatePurchaseOrderPayload {
  poNumber: string;
  supplierName: string;
  supplierPhone?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  totalAmount: number;
  status: PurchaseOrderStatus;
  notes?: string;
  lines: Array<{
    itemUid: string;
    quantityOrdered: number;
    unitPrice: number;
    lineTotal: number;
    grossWt?: number;
    netWt?: number;
    stoneWt?: number;
    stoneDetails?: Array<{
      stoneUid: string;
      count: number;
    }>;
    notes?: string;
  }>;
}

export interface CreateGrnPayload {
  grnNumber: string;
  poUid: string;
  supplierName: string;
  receivedDate: string;
  receivedBy?: string;
  totalPieces: number;
  status: "DRAFT";
  notes?: string;
}

export interface CreateCompositeGrnPayload {
  grnNumber: string;
  poUid?: string;
  supplierName: string;
  receivedDate: string;
  receivedBy?: string;
  totalPieces: number;
  status: "DRAFT";
  notes?: string;
  draftTags: Array<{
    itemUid: string;
    itemCode?: string;
    tagNumber: string;
    grossWt: number;
    netWt: number;
    stoneWt?: number;
    notes?: string;
    stoneDetails: Array<{
      stoneUid: string;
      count: number;
    }>;
  }>;
}

export interface CreateDraftTagPayload {
  itemUid: string;
  itemCode?: string;
  tagNumber: string;
  grossWt: number;
  netWt: number;
  stoneWt?: number;
  notes?: string;
}

export interface GrnListFilters {
  grnNumber?: string;
  poNumber?: string;
  supplierName?: string;
  receivedBy?: string;
  status?: string;
  receivedDateFrom?: string;
  receivedDateTo?: string;
  poUid?: string;
  from?: number;
  count?: number;
}

export interface PurchaseOrderListFilters {
  poUid?: string;
  poNumber?: string;
  supplierName?: string;
  supplierPhone?: string;
  status?: string;
  orderDateFrom?: string;
  orderDateTo?: string;
  expectedDeliveryDateFrom?: string;
  expectedDeliveryDateTo?: string;
  from?: number;
  count?: number;
}

function buildGrnQueryString(filters: GrnListFilters = {}) {
  const params = new URLSearchParams();

  if (filters.grnNumber?.trim()) params.set("grnNumber-like", filters.grnNumber.trim());
  if (filters.poNumber?.trim()) params.set("poNumber-like", filters.poNumber.trim());
  if (filters.supplierName?.trim()) params.set("supplierName-like", filters.supplierName.trim());
  if (filters.receivedBy?.trim()) params.set("receivedBy-like", filters.receivedBy.trim());
  if (filters.status?.trim() && filters.status !== "all") params.set("status-eq", filters.status.trim());
  if (filters.receivedDateFrom?.trim()) params.set("receivedDate-ge", filters.receivedDateFrom.trim());
  if (filters.receivedDateTo?.trim()) params.set("receivedDate-le", filters.receivedDateTo.trim());
  if (filters.poUid?.trim()) params.set("poUid-eq", filters.poUid.trim());
  if (typeof filters.from === "number") params.set("from", String(Math.max(0, filters.from)));
  if (typeof filters.count === "number") params.set("count", String(Math.max(1, filters.count)));

  return params.toString() ? `?${params.toString()}` : "";
}

function buildPurchaseOrderPath(path: string, filters: PurchaseOrderListFilters = {}) {
  const params = new URLSearchParams();
  if (filters.poUid?.trim()) params.set("poUid-eq", filters.poUid.trim());
  if (filters.poNumber?.trim()) params.set("poNumber-like", filters.poNumber.trim());
  if (filters.supplierName?.trim()) params.set("supplierName-like", filters.supplierName.trim());
  if (filters.supplierPhone?.trim()) params.set("supplierPhone-like", filters.supplierPhone.trim());
  if (filters.status?.trim() && filters.status !== "all") params.set("status-eq", filters.status.trim());
  if (filters.orderDateFrom?.trim()) params.set("orderDate-ge", filters.orderDateFrom.trim());
  if (filters.orderDateTo?.trim()) params.set("orderDate-le", filters.orderDateTo.trim());
  if (filters.expectedDeliveryDateFrom?.trim()) params.set("expectedDeliveryDate-ge", filters.expectedDeliveryDateFrom.trim());
  if (filters.expectedDeliveryDateTo?.trim()) params.set("expectedDeliveryDate-le", filters.expectedDeliveryDateTo.trim());
  if (typeof filters.from === "number") params.set("from", String(Math.max(0, filters.from)));
  if (typeof filters.count === "number") params.set("count", String(Math.max(1, filters.count)));
  return appendQuery(path, params);
}

export const purchaseService = {
  async getPurchaseOrders(filters: PurchaseOrderListFilters = {}) {
    const res = await httpClient.get<PurchaseOrder[]>(buildPurchaseOrderPath("/provider/golderp/purchase/po", filters));
    return res.data;
  },

  async getPurchaseOrderCount(filters: Omit<PurchaseOrderListFilters, "from" | "count"> = {}) {
    const res = await httpClient.get<unknown>(buildPurchaseOrderPath("/provider/golderp/purchase/po/count", filters));
    return normalizeCountResponse(res.data);
  },

  async getPurchaseOrderDetails(poUid: string) {
    const res = await httpClient.get<PurchaseOrder>(`/provider/golderp/purchase/po/${poUid}`);
    return res.data;
  },

  async getPurchaseOrderGrns(poUid: string) {
    const res = await httpClient.get<GoodsReceiptNote[]>(`/provider/golderp/purchase/grn/po/${poUid}`);
    return res.data;
  },

  async getGrns(filters: GrnListFilters = {}) {
    const res = await httpClient.get<GoodsReceiptNote[]>(`/provider/golderp/purchase/grn${buildGrnQueryString(filters)}`);
    return res.data;
  },

  async getGrnCount(filters: Omit<GrnListFilters, "from" | "count"> = {}) {
    const res = await httpClient.get<unknown>(`/provider/golderp/purchase/grn/count${buildGrnQueryString(filters)}`);
    return normalizeCountResponse(res.data);
  },

  async getGrnDetails(grnUid: string) {
    const res = await httpClient.get<GoodsReceiptNote>(`/provider/golderp/purchase/grn/${grnUid}`);
    return res.data;
  },

  async getDraftTags(grnUid: string) {
    const res = await httpClient.get<DraftTag[]>(`/provider/golderp/purchase/grn/${grnUid}/draft-tag`);
    return res.data;
  },

  async getDraftTagStones(draftTagUid: string) {
    const res = await httpClient.get<DraftStoneDetail[]>(`/provider/golderp/purchase/draft-tag/${draftTagUid}/stone`);
    return res.data;
  },

  async createPO(data: CreatePurchaseOrderPayload) {
    const res = await httpClient.post<PurchaseOrder>("/provider/golderp/purchase/po", data);
    return res.data;
  },

  async updatePO(poUid: string, data: CreatePurchaseOrderPayload) {
    const res = await httpClient.put<PurchaseOrder>(`/provider/golderp/purchase/po/${poUid}`, data);
    return res.data;
  },

  async updatePOStatus(poUid: string, status: PurchaseOrderStatus) {
    const res = await httpClient.put<PurchaseOrder>(`/provider/golderp/purchase/po/${poUid}/status?status=${status}`);
    return res.data;
  },

  async createGRN(data: CreateGrnPayload) {
    const res = await httpClient.post<GoodsReceiptNote>("/provider/golderp/purchase/grn", data);
    return res.data;
  },

  async createCompositeGRN(data: CreateCompositeGrnPayload) {
    const res = await httpClient.post<GoodsReceiptNote>("/provider/golderp/purchase/grn/composite", data);
    return res.data;
  },

  async updateCompositeGRN(grnUid: string, data: CreateCompositeGrnPayload) {
    const res = await httpClient.put<GoodsReceiptNote>(`/provider/golderp/purchase/grn/${grnUid}/composite`, data);
    return res.data;
  },

  async createDraftTag(grnUid: string, data: CreateDraftTagPayload) {
    const res = await httpClient.post<DraftTag>(`/provider/golderp/purchase/grn/${grnUid}/draft-tag`, data);
    return res.data;
  },

  async addDraftTagStone(draftTagUid: string, data: { stoneUid: string; count: number }) {
    const res = await httpClient.post<DraftStoneDetail>(`/provider/golderp/purchase/draft-tag/${draftTagUid}/stone`, data);
    return res.data;
  },

  async confirmGRN(grnUid: string) {
    const res = await httpClient.put(`/provider/golderp/purchase/grn/${grnUid}/confirm`);
    return res.data;
  },
};
