import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { DraftStoneDetail, DraftTag, GoodsReceiptNote, PurchaseOrder, PurchaseOrderStatus } from "@/lib/gold-erp-types";

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
    wastageWt?: number;
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
  wastageWt?: number;
  notes?: string;
}

export interface GrnListFilters {
  poNumber?: string;
  supplierName?: string;
  status?: string;
  receivedDateFrom?: string;
  receivedDateTo?: string;
  poUid?: string;
  from?: number;
  count?: number;
}

const buildGrnQueryString = ({
  poNumber,
  supplierName,
  status,
  receivedDateFrom,
  receivedDateTo,
  poUid,
  from,
  count,
}: GrnListFilters = {}) => {
  const params = new URLSearchParams();

  if (poNumber?.trim()) {
    params.set("poNumber-like", poNumber.trim());
  }
  if (supplierName?.trim()) {
    params.set("supplierName-like", supplierName.trim());
  }
  if (status?.trim() && status !== "all") {
    params.set("status-eq", status.trim());
  }
  if (receivedDateFrom?.trim()) {
    params.set("receivedDate-ge", receivedDateFrom.trim());
  }
  if (receivedDateTo?.trim()) {
    params.set("receivedDate-le", receivedDateTo.trim());
  }
  if (poUid?.trim()) {
    params.set("poUid-eq", poUid.trim());
  }
  if (typeof from === "number") {
    params.set("from", String(Math.max(0, from)));
  }
  if (typeof count === "number") {
    params.set("count", String(Math.max(1, count)));
  }

  const query = params.toString();
  return query ? `?${query}` : "";
};

const normalizeCountResponse = (response: unknown) => {
  if (typeof response === "number") {
    return response;
  }
  if (typeof response === "string") {
    const parsed = Number(response);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (response && typeof response === "object") {
    const candidate = (response as Record<string, unknown>).count;
    if (typeof candidate === "number") {
      return candidate;
    }
    if (typeof candidate === "string") {
      const parsed = Number(candidate);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }
  return 0;
};

export const usePurchaseOrders = () =>
  useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: () => apiFetch<PurchaseOrder[]>("/purchase/po"),
  });

export const usePurchaseOrderDetails = (poUid: string | null) =>
  useQuery({
    queryKey: ["purchaseOrder", poUid],
    queryFn: () => apiFetch<PurchaseOrder>(`/purchase/po/${poUid}`),
    enabled: !!poUid,
  });

export const usePurchaseOrderGrns = (poUid: string | null) =>
  useQuery({
    queryKey: ["purchaseGrns", poUid],
    queryFn: () => apiFetch<GoodsReceiptNote[]>(`/purchase/grn/po/${poUid}`),
    enabled: !!poUid,
  });

export const useGrns = (filters: GrnListFilters = {}) =>
  useQuery({
    queryKey: ["purchaseGrns", "list", filters],
    queryFn: () => apiFetch<GoodsReceiptNote[]>(`/purchase/grn${buildGrnQueryString(filters)}`),
  });

export const useGrnCount = (filters: Omit<GrnListFilters, "from" | "count"> = {}) =>
  useQuery({
    queryKey: ["purchaseGrns", "count", filters],
    queryFn: async () => normalizeCountResponse(await apiFetch<unknown>(`/purchase/grn/count${buildGrnQueryString(filters)}`)),
  });

export const useDraftTags = (grnUid: string | null) =>
  useQuery({
    queryKey: ["draftTags", grnUid],
    queryFn: () => apiFetch<DraftTag[]>(`/purchase/grn/${grnUid}/draft-tag`),
    enabled: !!grnUid,
  });

export const useDraftTagStones = (draftTagUid: string | null) =>
  useQuery({
    queryKey: ["draftTagStones", draftTagUid],
    queryFn: () => apiFetch<DraftStoneDetail[]>(`/purchase/draft-tag/${draftTagUid}/stone`),
    enabled: !!draftTagUid,
  });

export const useCreatePO = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePurchaseOrderPayload) =>
      apiFetch<PurchaseOrder>("/purchase/po", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
  });
};

export const useUpdatePOStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ poUid, status }: { poUid: string; status: PurchaseOrderStatus }) =>
      apiFetch<PurchaseOrder>(`/purchase/po/${poUid}/status?status=${status}`, {
        method: "PUT",
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", variables.poUid] });
    },
  });
};

export const useCreateGRN = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGrnPayload) =>
      apiFetch<GoodsReceiptNote>("/purchase/grn", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["purchaseGrns", variables.poUid] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", variables.poUid] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
  });
};

export const useCreateCompositeGRN = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCompositeGrnPayload) =>
      apiFetch<GoodsReceiptNote>("/purchase/grn/composite", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseGrns"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseGrns", "list"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseGrns", "count"] });
      queryClient.invalidateQueries({ queryKey: ["draftTags"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
  });
};

export const useCreateDraftTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ grnUid, data }: { grnUid: string; data: CreateDraftTagPayload }) =>
      apiFetch<DraftTag>(`/purchase/grn/${grnUid}/draft-tag`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["draftTags", variables.grnUid] });
      queryClient.invalidateQueries({ queryKey: ["purchaseGrns"] });
    },
  });
};

export const useAddDraftTagStone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ draftTagUid, data }: { draftTagUid: string; data: { stoneUid: string; count: number } }) =>
      apiFetch<DraftStoneDetail>(`/purchase/draft-tag/${draftTagUid}/stone`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["draftTagStones", variables.draftTagUid] });
    },
  });
};

export const useConfirmGRN = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (grnUid: string) =>
      apiFetch(`/purchase/grn/${grnUid}/confirm`, {
        method: "PUT",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseGrns"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseGrns", "list"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseGrns", "count"] });
      queryClient.invalidateQueries({ queryKey: ["draftTags"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder"] });
    },
  });
};
