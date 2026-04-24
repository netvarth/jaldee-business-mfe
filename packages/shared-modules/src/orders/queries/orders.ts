import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSharedModulesContext } from "../../context";
import { buildSharedQueryKey } from "../../queryKeys";
import { useApiScope } from "../../useApiScope";
import {
  applySalesOrderAdjustment,
  getOrdersBillCoupons,
  getOrdersBillDiscounts,
  getOrdersCreditSystemDetails,
  getOrdersCreditSystemProviderConsumer,
  getOrdersCreditSystemSettings,
  getOrdersCustomer,
  getOrdersDashboardDataset,
  getOrdersInvoiceAuditLogs,
  getOrdersInvoiceAuditLogsCount,
  getOrdersListPage,
  getOrdersPaymentDetails,
  getSalesOrderDetail,
  getSalesOrderInvoiceDetail,
  updateSalesOrderStatus,
  updateSalesOrderNotes,
} from "../services/orders";
import type { OrdersBillAdjustmentKind, OrdersBillAdjustmentOption } from "../types";

export function useOrdersDataset() {
  const { product, location, basePath, routeParams, user } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const selectedStore = readSelectedStoreFromLocalStorage();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, product, basePath, routeParams?.view, userId),
    enabled: Boolean(userId),
    queryFn: () =>
      getOrdersDashboardDataset(scopedApi, {
        product,
        basePath,
        userId,
        locationId: location?.id,
        locationName: location?.name,
        locationCode: location?.code,
        selectedStore,
      }),
  });
}

export function useOrdersOrders() {
  const datasetQuery = useOrdersDataset();
  return { ...datasetQuery, data: datasetQuery.data?.orders ?? [] };
}

export function useOrdersOrdersPage(page: number, pageSize: number, options?: { enabled?: boolean }) {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const selectedStore = readSelectedStoreFromLocalStorage();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "orders-grid", routeParams?.view, page, pageSize),
    enabled: Boolean(location?.id) && (options?.enabled ?? true),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    queryFn: () =>
      getOrdersListPage(scopedApi, {
        locationId: location?.id,
        locationName: location?.name,
        locationCode: location?.code,
        selectedStore,
        page,
        pageSize,
      }),
  });
}

export function useOrdersRequests() {
  const datasetQuery = useOrdersDataset();
  return { ...datasetQuery, data: datasetQuery.data?.requests ?? [] };
}

export function useOrdersOrderDetail(orderId: string | null | undefined) {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "order-details", routeParams?.view, orderId),
    enabled: Boolean(orderId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    queryFn: () => getSalesOrderDetail(scopedApi, orderId ?? ""),
  });
}

export function useUpdateSalesOrderNotes(orderId: string | null | undefined) {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: { notesToCustomer?: string; notesFromStaff?: string; raw?: unknown }) =>
      updateSalesOrderNotes(scopedApi, orderId ?? "", values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildSharedQueryKey("orders", "location", location?.id, "order-details", routeParams?.view, orderId),
      });
    },
  });
}

export function useOrdersBillDiscounts(options?: { enabled?: boolean }) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "bill-discounts"),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60_000,
    queryFn: () => getOrdersBillDiscounts(scopedApi),
  });
}

export function useOrdersBillCoupons(options?: { enabled?: boolean }) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "bill-coupons"),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
    queryFn: () => getOrdersBillCoupons(scopedApi),
  });
}

export function useApplySalesOrderAdjustment(orderId: string | null | undefined) {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: {
      kind: OrdersBillAdjustmentKind;
      selected: OrdersBillAdjustmentOption;
      privateNote?: string;
      customerNote?: string;
      raw?: unknown;
    }) => applySalesOrderAdjustment(scopedApi, orderId ?? "", values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildSharedQueryKey("orders", "location", location?.id, "order-details", routeParams?.view, orderId),
      });
    },
  });
}

export function useUpdateSalesOrderStatus(orderId: string | null | undefined) {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: "ORDER_COMPLETED" | "ORDER_CANCELED") =>
      updateSalesOrderStatus(scopedApi, orderId ?? "", status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildSharedQueryKey("orders", "location", location?.id, "order-details", routeParams?.view, orderId),
      });
    },
  });
}

export function useOrdersInvoiceDetail(invoiceUid: string | null | undefined) {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "invoice-detail", routeParams?.view, invoiceUid),
    enabled: Boolean(invoiceUid),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    queryFn: () => getSalesOrderInvoiceDetail(scopedApi, invoiceUid ?? ""),
  });
}

export function useOrdersPaymentDetails(invoiceUid: string | null | undefined) {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "payment-detail", routeParams?.view, invoiceUid),
    enabled: Boolean(invoiceUid),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    queryFn: () => getOrdersPaymentDetails(scopedApi, invoiceUid ?? ""),
  });
}

export function useOrdersInvoiceAuditLogs(
  invoiceUid: string | null | undefined,
  pagination: { from: number; count: number },
  options?: { enabled?: boolean }
) {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();

  const enabled = Boolean(invoiceUid) && (options?.enabled ?? true);

  return useQuery({
    queryKey: buildSharedQueryKey(
      "orders",
      "location",
      location?.id,
      "invoice-auditlog",
      routeParams?.view,
      invoiceUid,
      pagination?.from,
      pagination?.count
    ),
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    queryFn: () => getOrdersInvoiceAuditLogs(scopedApi, invoiceUid ?? "", pagination),
  });
}

export function useOrdersInvoiceAuditLogsCount(invoiceUid: string | null | undefined, options?: { enabled?: boolean }) {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();

  const enabled = Boolean(invoiceUid) && (options?.enabled ?? true);

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "invoice-auditlog-count", routeParams?.view, invoiceUid),
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    queryFn: () => getOrdersInvoiceAuditLogsCount(scopedApi, invoiceUid ?? ""),
  });
}

export function useOrdersCreditSystemDetails(invoiceUid: string | null | undefined, creditSystemType: "CREDIT" | string = "CREDIT") {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey(
      "orders",
      "location",
      location?.id,
      "creditsystem-detail",
      routeParams?.view,
      invoiceUid,
      creditSystemType
    ),
    enabled: Boolean(invoiceUid),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    queryFn: () => getOrdersCreditSystemDetails(scopedApi, invoiceUid ?? "", creditSystemType),
  });
}

export function useOrdersCustomer(customerId: string | null | undefined) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "customer-detail", customerId),
    enabled: Boolean(customerId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
    queryFn: () => getOrdersCustomer(scopedApi, customerId ?? ""),
  });
}

export function useOrdersCreditSystemProviderConsumer(customerId: string | null | undefined) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "creditsystem-consumer", customerId),
    enabled: Boolean(customerId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
    queryFn: () => getOrdersCreditSystemProviderConsumer(scopedApi, customerId ?? ""),
  });
}

export function useOrdersCreditSystemSettings(enabled: boolean = true) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "creditsystem-settings"),
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 10 * 60_000,
    queryFn: () => getOrdersCreditSystemSettings(scopedApi),
  });
}

export function useOrdersCatalogs() {
  const datasetQuery = useOrdersDataset();
  return { ...datasetQuery, data: datasetQuery.data?.catalogs ?? [] };
}

export function useOrdersInventory() {
  const datasetQuery = useOrdersDataset();
  return { ...datasetQuery, data: datasetQuery.data?.inventory ?? [] };
}

function readSelectedStoreFromLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem("selectedStore");
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
