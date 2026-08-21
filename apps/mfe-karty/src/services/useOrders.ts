import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

// Backend OrderChannel enum accepts WALKIN / ONLINE and OrderStatus is uppercase.
// Guard against legacy channel aliases (e.g. "POS") and title-case status leaking
// into the payload so we don't 400 on enum deserialization.
function normalizeOrderPayload(payload: any) {
  if (!payload || typeof payload !== "object") return payload;
  const normalized: any = { ...payload };
  if (typeof normalized.channel === "string") {
    const c = normalized.channel.toUpperCase();
    if (c === "B2B") {
      normalized.channel = "B2B";
    } else if (c === "POS" || c === "WALKIN" || c === "WALK-IN") {
      normalized.channel = "WALKIN";
    } else {
      normalized.channel = "ONLINE";
    }
  }
  if (typeof normalized.status === "string") {
    normalized.status = normalized.status.toUpperCase();
  }
  return normalized;
}

export interface OrderItem {
  uid: string;
  orderNo?: string;
  date?: string;
  consumerName?: string;
  consumerUid?: string;
  channel?: string;
  itemsCount?: number;
  totalAmount?: number;
  status: string;
  storeUid?: string;
  invoiceType?: string;
  catalogs?: any[];
  items?: any[];
  createdAt?: string;
}

/**
 * Server-side cap in OrderServiceImpl.MAX_PAGE_SIZE. Requesting more is silently clamped,
 * so callers that aggregate need to know the ceiling to detect truncation.
 */
export const ORDERS_MAX_PAGE_SIZE = 200;

export interface OrderQueryFilter {
  page?: number;
  size?: number;
  status?: string;
  storeUid?: string;
  /** ISO-8601 date-time, inclusive lower bound on orderDate. */
  fromDate?: string;
  /** ISO-8601 date-time, inclusive upper bound on orderDate. */
  toDate?: string;
  /**
   * The API excludes CANCELLED when no status is given. Aggregators must opt in,
   * otherwise cancellation rate is structurally always zero.
   */
  includeCancelled?: boolean;
}

function toParams(filter: OrderQueryFilter | undefined, opts: { paged: boolean }) {
  const params = new URLSearchParams();
  if (!filter) return params;
  if (opts.paged && filter.page !== undefined) params.append("page", String(filter.page));
  if (opts.paged && filter.size !== undefined) params.append("size", String(filter.size));
  if (filter.status) params.append("status", filter.status);
  if (filter.storeUid) params.append("storeUid", filter.storeUid);
  if (filter.fromDate) params.append("fromDate", filter.fromDate);
  if (filter.toDate) params.append("toDate", filter.toDate);
  if (filter.includeCancelled) params.append("includeCancelled", "true");
  return params;
}

export function useOrders(filter?: OrderQueryFilter) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["orders", api.productContext, filter],
    queryFn: async () => {
      const qs = toParams(filter, { paged: true }).toString();
      const url = `/v1/api/tenant/orders${qs ? `?${qs}` : ''}`;

      const rawData = await api.get(url);
      const data = Array.isArray(rawData) ? rawData : ((rawData as any)?.content || []);
      return data as OrderItem[];
    }
  });
}

/**
 * A single order with its lines and review.
 *
 * `GET /orders/{uid}` returns the full `OrderDto` — including `items[]`, which the *list*
 * endpoint omits. That asymmetry is why the dashboard's top-items panel could never be built
 * from order rows.
 *
 * ShipRocket fields (`awbCode`, `shiprocketOrderId`, `shiprocketShipmentId`, `shiprocketStatusCode`)
 * ARE mapped on `OrderDto` and returned here — read them off the raw record. The outbound shipment
 * flow (create/couriers/AWB/manifest/pickup/track/cancel) lives in useShiprocket.ts + OrderShipmentPanel.
 */
export function useOrder(uid?: string) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["order", uid],
    queryFn: async () => (await api.get(`/v1/api/tenant/orders/${uid}`)) as OrderItem & Record<string, any>,
    enabled: Boolean(uid),
  });
}

/**
 * Orders placed by a specific customer — for pickers such as the sales-return invoice
 * selector. The list endpoint takes no consumer filter, so we pull one capped page and
 * narrow by consumerUid client-side. CANCELLED orders are included so a return can still
 * reference them. Only runs once a customer is chosen.
 */
export function useCustomerOrders(consumerUid?: string) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["orders", "byCustomer", consumerUid],
    enabled: Boolean(consumerUid),
    queryFn: async () => {
      const rawData = await api.get(
        `/v1/api/tenant/orders?size=${ORDERS_MAX_PAGE_SIZE}&includeCancelled=true`
      );
      const data = Array.isArray(rawData) ? rawData : ((rawData as any)?.content || []);
      return (data as OrderItem[]).filter((o) => o.consumerUid === consumerUid);
    },
  });
}

export function useOrderCount(filter?: OrderQueryFilter) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["ordersCount", filter],
    queryFn: async () => {
      const qs = toParams(filter, { paged: false }).toString();
      const url = `/v1/api/tenant/orders/count${qs ? `?${qs}` : ''}`;

      const data = await api.get(url);
      return data as number;
    }
  });
}

export function useCreateOrder() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      const data = await api.post("/v1/api/tenant/orders", normalizeOrderPayload(payload));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersCount"] });
    }
  });
}

export function useUpdateOrder() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, payload }: { uid: string, payload: any }) => {
      const data = await api.put(`/v1/api/tenant/orders/${uid}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  });
}

export function useUpdateOrderStatus() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, status }: { uid: string, status: string }) => {
      const data = await api.put(`/v1/api/tenant/orders/${uid}/status/${status}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  });
}

export function useCancelOrder() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => {
      const data = await api.put(`/v1/api/tenant/orders/${uid}/cancel`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  });
}

/**
 * Raise (or fetch, idempotently) the authoritative finance tax invoice for an order.
 * Backend: POST /orders/{uid}/invoice → CommerceInvoiceService.raiseForOrder, which computes the
 * GST split (IGST vs CGST/SGST from provider-store vs buyer-partner GSTIN) and creates the finance
 * invoice. Safe to call more than once — finance returns the existing invoice for the same order.
 */
export function useRaiseOrderInvoice() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => api.post(`/v1/api/tenant/orders/${uid}/invoice`, {}),
    onSuccess: (_data, uid) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-invoice", uid] });
    },
  });
}

/**
 * Record an offline (cash/UPI/card) payment against an order's finance invoice.
 * Backend: POST /orders/{uid}/payment/offline. `mode` is a finance PaymentMode name
 * (Cash / UPI / CC / DC). Omit `amount` to settle the full outstanding balance.
 * Returns { paymentUid, receiptNum, invoiceUid, amountPaid, amountDue, fullyPaid }.
 */
export function useRecordOrderPayment() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, mode, amount }: { uid: string; mode: string; amount?: number }) =>
      api.post(`/v1/api/tenant/orders/${uid}/payment/offline`, { mode, amount }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-invoice", vars.uid] });
    },
  });
}

export function useReviewOrder() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => {
      const data = await api.put(`/v1/api/tenant/orders/${uid}/status/IN_REVIEW`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  });
}

// ---------------------------------------------------------------------------
// Order line editing / assignment / label (legacy changeitems, assign, label)
// Backed by OrderController: /orders/{uid}/items, /assign/{userUid}, /label.
// ---------------------------------------------------------------------------

/** Replace all lines of an order and re-reserve stock (PENDING/CONFIRMED only). */
export function useChangeOrderItems() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, items }: { uid: string; items: any[] }) =>
      api.put(`/v1/api/tenant/orders/${uid}/items`, items),
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", v.uid] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
    },
  });
}

/**
 * Attach a customer to a guest order (ORD-005/026). Server refreshes the CRM
 * snapshot (name/no/phone/email) and blocks non-mutable orders.
 */
export function useAttachConsumer() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, consumerUid }: { uid: string; consumerUid: string }) =>
      api.put(`/v1/api/tenant/orders/${uid}/consumer/${consumerUid}`),
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", v.uid] });
    },
  });
}

/** Add one line to an editable order. */
export function useAddOrderItem() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, item }: { uid: string; item: any }) =>
      api.post(`/v1/api/tenant/orders/${uid}/items`, item),
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", v.uid] });
    },
  });
}

/** Remove one line (by order-item uid) from an editable order. */
export function useRemoveOrderItem() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, orderItemUid }: { uid: string; orderItemUid: string }) =>
      api.del(`/v1/api/tenant/orders/${uid}/items/${orderItemUid}`),
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", v.uid] });
    },
  });
}

/** Assign an order to a staff user (or unassign when userUid is null). */
export function useAssignOrder() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, userUid }: { uid: string; userUid: string | null }) =>
      userUid
        ? api.put(`/v1/api/tenant/orders/${uid}/assign/${userUid}`)
        : api.put(`/v1/api/tenant/orders/${uid}/unassign`),
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", v.uid] });
    },
  });
}

/** Set or clear an order's label text/colour. */
export function useSetOrderLabel() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, text, color }: { uid: string; text?: string | null; color?: string | null }) => {
      if (!text) return api.del(`/v1/api/tenant/orders/${uid}/label`);
      const qs = new URLSearchParams({ text });
      if (color) qs.set("color", color);
      return api.put(`/v1/api/tenant/orders/${uid}/label?${qs.toString()}`);
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", v.uid] });
    },
  });
}

/** Approve a credit-parked B2B order (reserves stock + charges partner ledger). */
export function useApproveB2bOrder() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => api.put(`/v1/api/tenant/orders/${uid}/b2b/approve`),
    onSuccess: (_d, uid) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", uid] });
      queryClient.invalidateQueries({ queryKey: ["order-timeline", uid] });
    },
  });
}

/** Reject a credit-parked B2B order (cancels it). */
export function useRejectB2bOrder() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => api.put(`/v1/api/tenant/orders/${uid}/b2b/reject`),
    onSuccess: (_d, uid) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", uid] });
      queryClient.invalidateQueries({ queryKey: ["order-timeline", uid] });
    },
  });
}
