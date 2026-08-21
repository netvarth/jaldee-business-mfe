import { useQuery } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

/**
 * Commerce-side data for one customer's detail page: orders, returns, live cart and
 * wishlist. The CRM half of the page (profile, labels, groups, notes, family) comes from
 * base-crm through the shared customers hooks — this file only covers what commerce owns.
 */

export interface CustomerOrder {
  uid: string;
  orderNo?: string;
  orderDate?: string;
  consumerUid?: string;
  consumerName?: string;
  channel?: "WALKIN" | "ONLINE" | string;
  storeUid?: string;
  itemsCount?: number;
  totalAmount?: number;
  status?: string;
}

export interface CustomerOrderLine {
  uid?: string;
  itemUid?: string;
  variantUid?: string;
  qty?: number;
  sellQty?: number;
  unitPrice?: number;
  lineTotal?: number;
}

/**
 * Every order this customer has placed. Uses the per-customer endpoint rather than
 * `/orders?consumerUid=`, because that one hides CANCELLED rows unless asked — and a
 * customer record has to show a cancellation, not silently drop it.
 */
export function useCustomerOrders(consumerUid?: string | null) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["customerOrders", consumerUid],
    enabled: Boolean(consumerUid),
    queryFn: async () => {
      const data = await api.get<any>(`/v1/api/tenant/customers/${consumerUid}/orders`);
      return (Array.isArray(data) ? data : data?.content ?? []) as CustomerOrder[];
    },
  });
}

/** One order with its lines — fetched only when a row is expanded. */
export function useOrderLines(orderUid?: string | null) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["orderLines", orderUid],
    enabled: Boolean(orderUid),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const data = await api.get<any>(`/v1/api/tenant/orders/${orderUid}`);
      return (data?.items ?? []) as CustomerOrderLine[];
    },
  });
}

export interface CustomerReturn {
  uid: string;
  returnNo?: string;
  returnDate?: string;
  orderUid?: string;
  refundAmount?: number;
  refundStatus?: "NONE" | "PENDING" | "REFUNDED" | string;
  status?: string;
  items?: { itemUid?: string; qty?: number }[];
}

export function useCustomerReturns(consumerUid?: string | null) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["customerReturns", consumerUid],
    enabled: Boolean(consumerUid),
    queryFn: async () => {
      const data = await api.get<any>(
        `/v1/api/tenant/sales-returns?consumerUid=${consumerUid}&page=0&size=100`
      );
      return (Array.isArray(data) ? data : data?.content ?? []) as CustomerReturn[];
    },
  });
}

export interface CustomerCart {
  uid?: string;
  consumerUid?: string;
  storeUid?: string;
  updatedAt?: string;
  items?: {
    uid?: string;
    itemUid?: string;
    variantUid?: string;
    qty?: number;
    sellQty?: number;
    unitPrice?: number;
  }[];
}

/** The customer's open (not checked out) cart. 204/empty is normal — most customers have none. */
export function useCustomerCart(consumerUid?: string | null) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["customerCart", consumerUid],
    enabled: Boolean(consumerUid),
    queryFn: async () => {
      const data = await api.get<any>(`/v1/api/tenant/carts?consumerUid=${consumerUid}`);
      return (data ?? null) as CustomerCart | null;
    },
  });
}

export interface WishlistEntry {
  uid: string;
  itemUid?: string;
  variantUid?: string;
  storeUid?: string;
}

export function useCustomerWishlist(consumerUid?: string | null) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["customerWishlist", consumerUid],
    enabled: Boolean(consumerUid),
    queryFn: async () => {
      const data = await api.get<any>(`/v1/api/tenant/wishlists?consumerUid=${consumerUid}`);
      return (Array.isArray(data) ? data : data?.content ?? []) as WishlistEntry[];
    },
  });
}
