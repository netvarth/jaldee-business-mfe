import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSharedModulesContext } from "../../context";
import { buildSharedQueryKey } from "../../queryKeys";
import { useApiScope } from "../../useApiScope";
import {
  applySalesOrderAdjustment,
  getOrdersBillCoupons,
  getOrdersBillDiscounts,
  getOrdersCatalogsPage,
  getOrdersCreditSystemDetails,
  getOrdersCreditSystemProviderConsumer,
  getOrdersCreditSystemSettings,
  getOrdersCustomer,
  getOrdersDashboardDataset,
  getInventoryDashboardDataset,
  getInventoryAdjustmentsPage,
  getInventoryAdjustmentFormOptions,
  getInventoryCatalogItemsPage,
  getInventoryAdjustmentDetail,
  getInventoryCatalogsPage,
  getInventoryCatalogDetail,
  getInventoryCatalogDetailItemsPage,
  getInventoryStocksFormOptions,
  getInventoryStocksPage,
  updateInventoryCatalog,
  updateInventoryCatalogItem,
  updateInventoryCatalogItemStatus,
  updateInventoryCatalogStatus,
  saveInventoryAdjustment,
  changeInventoryAdjustmentStatus,
  createInventoryAdjustmentRemark,
  getOrdersInvoicesPage,
  getOrdersInvoiceTypesPage,
  getOrdersItemConsumptionHistory,
  getOrdersItemDetail,
  getOrdersItemFormSettings,
  getOrdersItemsPage,
  getOrdersInvoiceAuditLogs,
  getOrdersInvoiceAuditLogsCount,
  getOrdersListPage,
  getOrdersPaymentDetails,
  getSalesOrderDetail,
  getSalesOrderInvoiceDetail,
  updateSalesOrderStatus,
  updateSalesOrderNotes,
  createOrdersItem,
  updateOrdersItem,
  getDeliveryProfilesConfig,
  getDeliveryProfilesConfigCount,
  getDeliveryProfileByEncId,
  createDeliveryProfile,
  updateDeliveryProfile,
  updateDeliveryProfileStatus,
  getDeliveryProfileStores,
  assignDeliveryProfileToStore,
  getLogisticsList,
  getLogisticsCount,
  getAvailableCouriers,
  createAwb,
  generateManifest,
  requestForShipmentPickup,
  trackOrder,
  getDealers,
  getDealersCount,
  getOrdersReviewsPage,
  updateOrdersReviewStatus,
  getOrdersInvoiceTypeDetail,
  createOrdersInvoiceType,
  updateOrdersInvoiceType,
  getInventoryAuditLogsPage,
  getInventorySummaryPage,
} from "../services/orders";
import type { OrdersBillAdjustmentKind, OrdersBillAdjustmentOption } from "../types";
import type { InventoryAdjustmentDetailItem } from "../types";

export function useOrdersReviewsPage(page: number, pageSize: number, filters?: Record<string, any>) {
  const { location, routeParams } = useSharedModulesContext();
  const api = useApiScope();
  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "reviews", routeParams?.view, page, pageSize, filters),
    placeholderData: (previousData) => previousData,
    queryFn: () => getOrdersReviewsPage(api, { from: (page - 1) * pageSize, count: pageSize, ...filters }),
  });
}

export function useUpdateOrdersReviewStatus() {
  const { location, routeParams } = useSharedModulesContext();
  const api = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, status }: { reviewId: string; status: "PUBLISHED" | "REJECTED" }) =>
      updateOrdersReviewStatus(api, reviewId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildSharedQueryKey("orders", "location", location?.id, "reviews", routeParams?.view),
      });
    },
  });
}

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

export function useInventoryDashboardDataset() {
  const { product, location, basePath, routeParams, user } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const selectedStore = readSelectedStoreFromLocalStorage();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, product, basePath, "inventory-dashboard", routeParams?.view, userId),
    enabled: Boolean(userId),
    queryFn: () =>
      getInventoryDashboardDataset(scopedApi, {
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

export function useOrdersOrdersPage(
  page: number,
  pageSize: number,
  options?: { enabled?: boolean; searchText?: string; status?: string }
) {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const selectedStore = readSelectedStoreFromLocalStorage();
  const searchText = String(options?.searchText ?? "").trim();
  const status = String(options?.status ?? "").trim();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "orders-grid", routeParams?.view, page, pageSize, searchText, status),
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
        searchText,
        status,
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

export function useOrdersCatalogsPage(page: number, pageSize: number) {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const selectedStore = readSelectedStoreFromLocalStorage();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "catalogs", routeParams?.view, page, pageSize),
    enabled: Boolean(location?.id),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    queryFn: () =>
      getOrdersCatalogsPage(scopedApi, {
        locationId: location?.id,
        locationName: location?.name,
        locationCode: location?.code,
        selectedStore,
        page,
        pageSize,
      }),
  });
}

export function useOrdersInvoiceTypesPage(page: number, pageSize: number) {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "invoice-types", routeParams?.view, page, pageSize),
    enabled: Boolean(location?.id),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    queryFn: () => getOrdersInvoiceTypesPage(scopedApi, { page, pageSize }),
  });
}

export function useOrdersInvoicesPage(page: number, pageSize: number) {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "invoices", routeParams?.view, page, pageSize),
    enabled: Boolean(location?.id),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    queryFn: () => getOrdersInvoicesPage(scopedApi, { page, pageSize }),
  });
}

export function useOrdersItemsPage(page: number, pageSize: number) {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "items", routeParams?.view, page, pageSize),
    enabled: Boolean(location?.id),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    queryFn: () => getOrdersItemsPage(scopedApi, { page, pageSize }),
  });
}

export function useOrdersItemDetail(itemId: string | null | undefined) {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "item-detail", routeParams?.view, itemId),
    enabled: Boolean(itemId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    queryFn: () => getOrdersItemDetail(scopedApi, itemId ?? ""),
  });
}

export function useOrdersItemFormSettings(options?: { enabled?: boolean }) {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "item-form-settings", routeParams?.view),
    enabled: Boolean(location?.id) && (options?.enabled ?? true),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: () => getOrdersItemFormSettings(scopedApi),
  });
}

export function useCreateOrdersItem() {
  const { apiScope, location } = useSharedModulesContext();
  const queryClient = useQueryClient();
  const scopedApi = useApiScope();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => createOrdersItem(scopedApi, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildSharedQueryKey("orders", apiScope, location?.id) });
    },
  });
}

export function useUpdateOrdersItem() {
  const { apiScope, location } = useSharedModulesContext();
  const queryClient = useQueryClient();
  const scopedApi = useApiScope();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => updateOrdersItem(scopedApi, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildSharedQueryKey("orders", apiScope, location?.id) });
    },
  });
}

export function useOrdersItemConsumptionHistory(
  itemId: string | null | undefined,
  page: number,
  pageSize: number,
  options?: { enabled?: boolean }
) {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey(
      "orders",
      "location",
      location?.id,
      "item-consumption-history",
      routeParams?.view,
      itemId,
      page,
      pageSize
    ),
    enabled: Boolean(itemId) && (options?.enabled ?? true),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
    queryFn: () => getOrdersItemConsumptionHistory(scopedApi, itemId ?? "", { page, pageSize }),
  });
}

export function useOrdersInventory() {
  const datasetQuery = useOrdersDataset();
  return { ...datasetQuery, data: datasetQuery.data?.inventory ?? [] };
}

export function useInventoryAdjustmentsPage(page: number, pageSize: number, filters?: Record<string, unknown>) {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-adjustments", routeParams?.view, page, pageSize, filters),
    enabled: Boolean(location?.id),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
    queryFn: () => getInventoryAdjustmentsPage(scopedApi, { page, pageSize, filters }),
  });
}

export function useInventoryAdjustmentFormOptions(storeEncId?: string | null, catalogEncId?: string | null) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-adjustment-options", storeEncId, catalogEncId),
    enabled: Boolean(location?.id),
    staleTime: 30_000,
    queryFn: () => getInventoryAdjustmentFormOptions(scopedApi, storeEncId),
  });
}

export function useInventoryCatalogItemsPage(catalogEncId: string | null | undefined, page: number, pageSize: number, searchText?: string) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-catalog-items", catalogEncId, page, pageSize, searchText),
    enabled: Boolean(location?.id && catalogEncId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
    queryFn: () => getInventoryCatalogItemsPage(scopedApi, { catalogEncId: catalogEncId ?? "", page, pageSize, searchText }),
  });
}

export function useInventoryStocksFormOptions(storeEncId?: string | null) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-stocks-options", storeEncId),
    enabled: Boolean(location?.id),
    staleTime: 30_000,
    queryFn: () => getInventoryStocksFormOptions(scopedApi, storeEncId),
  });
}

export function useInventoryStocksPage(
  page: number,
  pageSize: number,
  options: { storeEncId?: string | null; catalogEncId?: string | null; spItemCode?: string | null; enabled?: boolean }
) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const storeEncId = String(options.storeEncId ?? "").trim();
  const catalogEncId = String(options.catalogEncId ?? "").trim();
  const spItemCode = String(options.spItemCode ?? "").trim();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-stocks", page, pageSize, storeEncId, catalogEncId, spItemCode),
    enabled: Boolean(location?.id && storeEncId && catalogEncId) && (options.enabled ?? true),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
    queryFn: () => getInventoryStocksPage(scopedApi, { page, pageSize, storeEncId, catalogEncId, spItemCode }),
  });
}

export function useInventoryCatalogsPage(
  page: number,
  pageSize: number,
  storeEncId?: string | null,
  options?: { searchText?: string; filters?: Record<string, unknown> }
) {
  const { location, routeParams } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const searchText = String(options?.searchText ?? "").trim();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-catalogs", routeParams?.view, page, pageSize, storeEncId, searchText, options?.filters),
    enabled: Boolean(location?.id),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
    queryFn: () => getInventoryCatalogsPage(scopedApi, { page, pageSize, storeEncId, searchText, filters: options?.filters }),
  });
}

export function useInventoryCatalogDetail(encId?: string | null) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-catalog-detail", encId),
    enabled: Boolean(encId),
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () => getInventoryCatalogDetail(scopedApi, encId ?? ""),
  });
}

export function useInventoryCatalogDetailItemsPage(
  catalogEncId: string | null | undefined,
  page: number,
  pageSize: number,
  options?: { searchText?: string; filters?: Record<string, unknown> }
) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const searchText = String(options?.searchText ?? "").trim();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-catalog-detail-items", catalogEncId, page, pageSize, searchText, options?.filters),
    enabled: Boolean(location?.id && catalogEncId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
    queryFn: () => getInventoryCatalogDetailItemsPage(scopedApi, { catalogEncId: catalogEncId ?? "", page, pageSize, searchText, filters: options?.filters }),
  });
}

export function useUpdateInventoryCatalog() {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ encId, payload }: { encId: string; payload: Record<string, unknown> }) => updateInventoryCatalog(scopedApi, encId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-catalogs") });
      queryClient.invalidateQueries({ queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-catalog-detail", variables.encId) });
    },
  });
}

export function useUpdateInventoryCatalogStatus() {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ encId, status }: { encId: string; status: string }) => updateInventoryCatalogStatus(scopedApi, encId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-catalogs") });
      queryClient.invalidateQueries({ queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-catalog-detail", variables.encId) });
    },
  });
}

export function useUpdateInventoryCatalogItemStatus(catalogEncId?: string | null) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ encId, status }: { encId: string; status: string }) => updateInventoryCatalogItemStatus(scopedApi, encId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-catalog-detail-items", catalogEncId) });
    },
  });
}

export function useUpdateInventoryCatalogItem(catalogEncId?: string | null) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ encId, payload }: { encId: string; payload: Record<string, unknown> }) =>
      updateInventoryCatalogItem(scopedApi, encId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-catalog-detail-items", catalogEncId) });
    },
  });
}

export function useInventoryAdjustmentDetail(uid?: string | null) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-adjustment-detail", uid),
    enabled: Boolean(uid),
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () => getInventoryAdjustmentDetail(scopedApi, uid ?? ""),
  });
}

export function useSaveInventoryAdjustment() {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, mode }: { payload: Record<string, unknown>; mode: "create" | "update"; items?: InventoryAdjustmentDetailItem[] }) =>
      saveInventoryAdjustment(scopedApi, payload, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-adjustments") });
    },
  });
}

export function useChangeInventoryAdjustmentStatus() {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: string }) => changeInventoryAdjustmentStatus(scopedApi, uid, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-adjustments") });
    },
  });
}

export function useCreateInventoryAdjustmentRemark() {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (remark: string) => createInventoryAdjustmentRemark(scopedApi, remark),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-adjustment-options") });
    },
  });
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

// ─── Active Cart Queries ────────────────────────────────────────────────────

import { getActiveCart, getActiveCartCount } from "../services/orders";

export function useOrdersActiveCart() {
  const { api } = useSharedModulesContext();
  return useQuery({
    queryKey: ["orders", "active-cart"],
    queryFn: () => getActiveCart(api),
    placeholderData: (prev) => prev,
  });
}

export function useOrdersActiveCartCount() {
  const { api } = useSharedModulesContext();
  return useQuery({
    queryKey: ["orders", "active-cart", "count"],
    queryFn: () => getActiveCartCount(api),
    staleTime: 30_000,
  });
}

// ─── Delivery Profile Queries ──────────────────────────────────────────────────

export function useOrdersDeliveryProfiles(page: number, pageSize: number, options?: { enabled?: boolean; name?: string }) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const name = String(options?.name ?? "").trim();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "delivery-profiles", page, pageSize, name),
    enabled: Boolean(location?.id) && (options?.enabled ?? true),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
    queryFn: () =>
      getDeliveryProfilesConfig(scopedApi, {
        from: (page - 1) * pageSize,
        count: pageSize,
        ...(name ? { "name-eq": name } : {}),
      }),
  });
}

export function useOrdersDeliveryProfilesCount(options?: { enabled?: boolean; name?: string }) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();
  const name = String(options?.name ?? "").trim();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "delivery-profiles-count", name),
    enabled: Boolean(location?.id) && (options?.enabled ?? true),
    staleTime: 30_000,
    queryFn: () => getDeliveryProfilesConfigCount(scopedApi, name ? { "name-eq": name } : {}),
  });
}

export function useOrdersDeliveryProfileDetails(encId: string | null | undefined) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "delivery-profile-details", encId),
    enabled: Boolean(encId),
    staleTime: 30_000,
    queryFn: () => getDeliveryProfileByEncId(scopedApi, encId ?? ""),
  });
}

export function useOrdersDeliveryProfileStores(options?: { enabled?: boolean }) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "stores-list"),
    enabled: Boolean(location?.id) && (options?.enabled ?? true),
    staleTime: 60_000,
    queryFn: () => getDeliveryProfileStores(scopedApi, { "status-eq": "Active" }),
  });
}

export function useCreateOrdersDeliveryProfile() {
  const { location } = useSharedModulesContext();
  const queryClient = useQueryClient();
  const scopedApi = useApiScope();

  return useMutation({
    mutationFn: (payload: Partial<import("../types").DeliveryProfileDetails>) =>
      createDeliveryProfile(scopedApi, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildSharedQueryKey("orders", "location", location?.id, "delivery-profiles") });
      queryClient.invalidateQueries({ queryKey: buildSharedQueryKey("orders", "location", location?.id, "delivery-profiles-count") });
    },
  });
}

export function useUpdateOrdersDeliveryProfile(encId: string) {
  const { location } = useSharedModulesContext();
  const queryClient = useQueryClient();
  const scopedApi = useApiScope();

  return useMutation({
    mutationFn: (payload: Partial<import("../types").DeliveryProfileDetails>) =>
      updateDeliveryProfile(scopedApi, encId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildSharedQueryKey("orders", "location", location?.id, "delivery-profiles") });
      queryClient.invalidateQueries({ queryKey: buildSharedQueryKey("orders", "location", location?.id, "delivery-profile-details", encId) });
    },
  });
}

export function useUpdateOrdersDeliveryProfileStatus(encId: string) {
  const { location } = useSharedModulesContext();
  const queryClient = useQueryClient();
  const scopedApi = useApiScope();

  return useMutation({
    mutationFn: (status: string) => updateDeliveryProfileStatus(scopedApi, encId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildSharedQueryKey("orders", "location", location?.id, "delivery-profiles") });
    },
  });
}

export function useAssignOrdersDeliveryProfile() {
  const { location } = useSharedModulesContext();
  const queryClient = useQueryClient();
  const scopedApi = useApiScope();

  return useMutation({
    mutationFn: (payload: { storeEncId: string; deliveryType: string; deliveryProfileConfigDto: { encId: string } }) =>
      assignDeliveryProfileToStore(scopedApi, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildSharedQueryKey("orders", "location", location?.id, "delivery-profiles") });
    },
  });
}

// Logistics
export function useOrdersLogistics(page: number, pageSize: number, options?: Record<string, any>) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "logistics", page, pageSize, options),
    queryFn: () => getLogisticsList(scopedApi, { from: (page - 1) * pageSize, count: pageSize, ...options }),
    enabled: Boolean(location?.id),
  });
}

export function useOrdersLogisticsCount(options?: Record<string, any>) {
  const { location } = useSharedModulesContext();
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "logistics-count", options),
    queryFn: () => getLogisticsCount(scopedApi, options),
    enabled: Boolean(location?.id),
  });
}

export function useOrdersAvailableCouriers(orderUid: string) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: ["orders", "logistics", "couriers", orderUid],
    queryFn: () => getAvailableCouriers(scopedApi, orderUid),
    enabled: Boolean(orderUid),
  });
}

export function useOrdersCreateAwb() {
  const queryClient = useQueryClient();
  const scopedApi = useApiScope();

  return useMutation({
    mutationFn: ({ orderUid, courierId }: { orderUid: string; courierId: number }) =>
      createAwb(scopedApi, orderUid, courierId),
    onSuccess: (_, { orderUid }) => {
      queryClient.invalidateQueries({ queryKey: ["orders", "logistics"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "logistics", "couriers", orderUid] });
    },
  });
}

export function useOrdersGenerateManifest() {
  const queryClient = useQueryClient();
  const scopedApi = useApiScope();

  return useMutation({
    mutationFn: (orderUid: string) => generateManifest(scopedApi, orderUid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "logistics"] });
    },
  });
}

export function useOrdersRequestShipmentPickup() {
  const queryClient = useQueryClient();
  const scopedApi = useApiScope();

  return useMutation({
    mutationFn: ({ orderUid, data }: { orderUid: string; data: { pickupDate: string } }) =>
      requestForShipmentPickup(scopedApi, orderUid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "logistics"] });
    },
  });
}

export function useOrdersTrackOrder() {
  const scopedApi = useApiScope();

  return useMutation({
    mutationFn: (orderUid: string) => trackOrder(scopedApi, orderUid),
  });
}

export function useOrdersDealers(page: number, pageSize: number, filters?: Record<string, any>) {
  const { location, routeParams } = useSharedModulesContext();
  const api = useApiScope();
  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "dealers", routeParams?.view, page, pageSize, filters),
    placeholderData: (previousData) => previousData,
    queryFn: () => getDealers(api, { from: (page - 1) * pageSize, count: pageSize, ...filters }),
  });
}

export function useOrdersDealersCount(filters?: Record<string, any>) {
  const { location, routeParams } = useSharedModulesContext();
  const api = useApiScope();
  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "dealers-count", routeParams?.view, filters),
    queryFn: () => getDealersCount(api, filters),
  });
}

export function useOrdersInvoiceTypeDetail(uid: string | null) {
  const api = useApiScope();
  return useQuery({
    queryKey: ["orders", "invoice-type", uid],
    queryFn: () => getOrdersInvoiceTypeDetail(api, uid!),
    enabled: Boolean(uid),
  });
}

export function useCreateOrdersInvoiceType() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => createOrdersInvoiceType(api, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "location"] });
    },
  });
}

export function useUpdateOrdersInvoiceType() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, payload }: { uid: string; payload: Record<string, unknown> }) =>
      updateOrdersInvoiceType(api, uid, payload),
    onSuccess: (_, { uid }) => {
      queryClient.invalidateQueries({ queryKey: ["orders", "location"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "invoice-type", uid] });
    },
  });
}

export function useInventoryAuditLogsPage(page: number, pageSize: number) {
  const { location } = useSharedModulesContext();
  const api = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-auditlogs", page, pageSize),
    enabled: Boolean(location?.id),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
    queryFn: () => getInventoryAuditLogsPage(api, { page, pageSize }),
  });
}

export function useInventorySummaryPage(
  page: number,
  pageSize: number,
  summaryType: "OUTOFSTOCK" | "EXPIRED" | "EXPIRY_7_DAYS" | "EXPIRY_14_DAYS" | "EXPIRY_30_DAYS" | "DATE_RANGE",
  storeEncId?: string,
  fromDate?: string,
  toDate?: string
) {
  const { location } = useSharedModulesContext();
  const api = useApiScope();

  return useQuery({
    queryKey: buildSharedQueryKey("orders", "location", location?.id, "inventory-summary", summaryType, storeEncId, fromDate, toDate, page, pageSize),
    enabled: Boolean(location?.id),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
    queryFn: () => getInventorySummaryPage(api, { page, pageSize, summaryType, storeEncId, fromDate, toDate }),
  });
}
