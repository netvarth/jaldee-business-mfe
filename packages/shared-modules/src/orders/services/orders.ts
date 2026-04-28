import type { ProductKey } from "@jaldee/auth-context";
import type {
  OrdersAction,
  OrdersBillAdjustmentKind,
  OrdersBillAdjustmentOption,
  OrdersCapabilities,
  OrdersDataset,
  OrdersCreditSystemDetail,
  OrdersCreditSystemProviderConsumer,
  OrdersCreditSystemSettings,
  OrdersCustomerSummary,
  OrdersInvoiceDetail,
  OrdersInvoiceRow,
  OrdersInvoiceTypeRow,
  OrdersItemConsumptionHistoryRow,
  OrdersItemDetail,
  OrdersItemOption,
  OrdersItemRow,
  OrdersItemSettings,
  OrdersItemSettingsOption,
  OrdersOrderDetail,
  OrdersOrderDetailAddress,
  OrdersOrderDetailLineItem,
  OrdersOrderRow,
  OrdersPaymentDetail,
} from "../types";

interface ScopedApi {
  get: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
  put: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
}

type ApiFilter = Record<string, unknown>;

type OrdersDashboardApiOptions = {
  product: ProductKey;
  basePath: string;
  userId?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  locationCode?: string | null;
  selectedStore?: {
    id?: string | number | null;
    storeId?: string | number | null;
    encId?: string | null;
    storeEncId?: string | null;
    name?: string | null;
    storeName?: string | null;
  } | null;
};

type OrdersListApiOptions = {
  locationId?: string | null;
  locationName?: string | null;
  locationCode?: string | null;
  selectedStore?: {
    id?: string | number | null;
    storeId?: string | number | null;
    encId?: string | null;
    storeEncId?: string | null;
    name?: string | null;
    storeName?: string | null;
  } | null;
  page: number;
  pageSize: number;
  searchText?: string;
  status?: string;
};

type OrdersInvoiceTypesApiOptions = {
  page: number;
  pageSize: number;
};

type OrdersInvoicesApiOptions = {
  page: number;
  pageSize: number;
};

type OrdersItemsApiOptions = {
  page: number;
  pageSize: number;
};

type OrdersItemConsumptionHistoryApiOptions = {
  page: number;
  pageSize: number;
};

type OrdersCatalogsApiOptions = {
  locationId?: string | null;
  locationName?: string | null;
  locationCode?: string | null;
  selectedStore?: {
    id?: string | number | null;
    storeId?: string | number | null;
    encId?: string | null;
    storeEncId?: string | null;
    name?: string | null;
    storeName?: string | null;
  } | null;
  page: number;
  pageSize: number;
};

type ProviderStore = {
  id?: string | number;
  storeId?: string | number;
  encId?: string;
  storeEncId?: string;
  name?: string;
  storeName?: string;
  locationId?: string | number;
  location?: { id?: string | number; name?: string; place?: string };
};

const ORDERS_REQUEST_TIMEOUT_MS = 12000;
const ACTIVE_STORES_CACHE_TTL_MS = 5 * 60 * 1000;
const SALES_ORDERS_CACHE_TTL_MS = 5 * 1000;
const SALES_ORDERS_COUNT_CACHE_TTL_MS = 30 * 1000;

type CacheEntry<T> = {
  ts: number;
  promise: Promise<T>;
};

let activeStoresCache: CacheEntry<ProviderStore[]> | null = null;
const salesOrdersCache = new Map<string, CacheEntry<any>>();
const salesOrdersCountCache = new Map<string, CacheEntry<any>>();

function isCacheFresh(entry: CacheEntry<unknown>, ttlMs: number) {
  return Date.now() - entry.ts < ttlMs;
}

function cachePromise<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  ttlMs: number,
  create: () => Promise<T>
): Promise<T> {
  const existing = cache.get(key);
  if (existing && isCacheFresh(existing, ttlMs)) {
    return existing.promise;
  }

  const promise = create().catch((error) => {
    cache.delete(key);
    throw error;
  });

  cache.set(key, { ts: Date.now(), promise });
  return promise;
}

export function formatOrdersCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function buildOrdersDetailHref(basePath: string, orderId: string, product?: ProductKey) {
  const moduleRoot = product === "health" ? joinPath(basePath, "pharmacy") : joinPath(basePath, "orders");
  const routeRecordId = collapseSalesOrderRecordId(orderId);
  return `${moduleRoot}/details/${encodeURIComponent(routeRecordId)}`;
}

export function buildOrdersLegacyInvoiceHref(basePath: string, recordId: string) {
  return buildOrdersInvoiceHref(basePath, recordId);
}

export function buildOrdersInvoiceHref(basePath: string, invoiceUid: string, params?: Record<string, string>, product?: ProductKey) {
  const resolvedInvoiceUid = ensureInvoiceUid(invoiceUid);
  const moduleRoot = product === "health" ? joinPath(basePath, "pharmacy") : joinPath(basePath, "orders");
  const invoicePath = joinPath(moduleRoot, `invoice/${encodeURIComponent(resolvedInvoiceUid)}`);
  const query = new URLSearchParams({ from: "details", invUid: resolvedInvoiceUid, ...(params ?? {}) });
  return `${invoicePath}?${query.toString()}`;
}

export function buildOrdersModuleHref(basePath: string, product: ProductKey, view: string) {
  const moduleRoot = product === "health" ? joinPath(basePath, "pharmacy") : joinPath(basePath, "orders");
  return joinPath(moduleRoot, view);
}

export function buildOrdersItemDetailHref(basePath: string, itemId: string, product?: ProductKey) {
  const moduleRoot = product === "health" ? joinPath(basePath, "pharmacy") : joinPath(basePath, "orders");
  return joinPath(moduleRoot, `items/details/${encodeURIComponent(itemId)}`);
}

export function normalizeOrdersInvoiceUid(value: string) {
  return ensureInvoiceUid(value);
}

export function buildLegacyInvoiceUrl(invoiceUid: string, params?: Record<string, string>) {
  const resolvedInvoiceUid = ensureInvoiceUid(invoiceUid);
  const query = new URLSearchParams({ from: "details", invUid: resolvedInvoiceUid, ...(params ?? {}) });
  const base = resolveLegacyProviderAppBaseUrl();

  try {
    const url = new URL(`invoice/${encodeURIComponent(resolvedInvoiceUid)}`, base);
    url.search = query.toString();
    return url.toString();
  } catch {
    const normalizedBase = base.replace(/\/$/, "");
    return `${normalizedBase}/invoice/${encodeURIComponent(resolvedInvoiceUid)}?${query.toString()}`;
  }
}

export function getOrdersStatusVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const normalized = status.toLowerCase();

  if (
    normalized.includes("deliver") ||
    normalized.includes("complete") ||
    normalized.includes("confirm") ||
    normalized.includes("active") ||
    normalized.includes("healthy")
  ) {
    return "success";
  }

  if (
    normalized.includes("await") ||
    normalized.includes("pending") ||
    normalized.includes("limited") ||
    normalized.includes("low")
  ) {
    return "warning";
  }

  if (normalized.includes("critical") || normalized.includes("cancel") || normalized.includes("fail") || normalized.includes("discard")) {
    return "danger";
  }

  if (normalized.includes("draft") || normalized.includes("pack") || normalized.includes("dispatch") || normalized.includes("ready")) {
    return "info";
  }

  return "neutral";
}

function joinPath(basePath: string, next: string) {
  const normalizedBase = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  const normalizedNext = next.startsWith("/") ? next.slice(1) : next;
  return `${normalizedBase}/${normalizedNext}`;
}

function ensureInvoiceUid(recordId: string) {
  const invoiceSuffix = "_soinv";
  const orderSuffix = "_sodr";

  if (!recordId) return "";

  if (recordId.endsWith(invoiceSuffix)) {
    return recordId;
  }

  const base = recordId.endsWith(orderSuffix) ? recordId.slice(0, -orderSuffix.length) : recordId;
  return `${base}${invoiceSuffix}`;
}

function resolveLegacyProviderAppBaseUrl() {
  if (typeof window === "undefined") {
    return "/provider/";
  }

  const configured =
    (window as any).__JALDEE_LEGACY_PROVIDER_APP_URL__ ||
    (window as any).__JALDEE_PROVIDER_APP_URL__ ||
    (window as any).__JALDEE_PROVIDER_BASE_URL__ ||
    "";

  const trimmed = String(configured ?? "").trim();
  if (trimmed) {
    // If this looks like an API base URL, strip common API prefixes.
    const withoutApi = trimmed.replace(/\/(v\d+\/rest|v\d+|rest)\/?$/i, "/");
    return withoutApi.endsWith("/") ? withoutApi : `${withoutApi}/`;
  }

  return `${window.location.origin}/provider/`;
}

export function getDefaultOrdersCapabilities(): OrdersCapabilities {
  return {
    canCreateOrder: true,
    canViewOrders: true,
    canViewRequests: true,
    canViewCatalogs: true,
    canViewStores: true,
    canViewItems: true,
    canViewInvoices: true,
    canViewDealers: true,
    canViewItemVariants: true,
    canViewLogistics: true,
    canViewDeliveryProfile: true,
    canViewActiveCart: true,
  };
}

function buildActionRoutes(product: ProductKey, basePath: string, capabilities: OrdersCapabilities): OrdersAction[] {
  const ordersRoot = product === "health" ? joinPath(basePath, "pharmacy") : joinPath(basePath, "orders");
  const inventoryRoot = product === "health" ? joinPath(basePath, "pharmacy/inventory") : joinPath(basePath, "inventory");
  const itemsRoot = joinPath(ordersRoot, "items");
  const catalogRoot = joinPath(ordersRoot, "catalogs");
  const settingsRoot = joinPath(ordersRoot, "settings");
  const invoiceTypesRoot = joinPath(ordersRoot, "invoice-types");
  const invoicesRoot = joinPath(ordersRoot, "invoices");

  return [
    { label: "Create Order", route: joinPath(ordersRoot, "create"), note: "Start a new sales order workflow", accent: "indigo", type: "route", imageKey: "orders", enabled: capabilities.canCreateOrder },
    { label: "Orders", route: joinPath(ordersRoot, "orders-grid"), note: "Track open and delivered orders", accent: "emerald", type: "route", imageKey: "rx-order", enabled: capabilities.canViewOrders },
    { label: "Requests", route: joinPath(ordersRoot, "rx-requests-grid"), note: "Convert prescription requests to orders", accent: "amber", type: "route", imageKey: "rx-requests", enabled: capabilities.canViewRequests },
    { label: "Invoice Types", route: invoiceTypesRoot, note: "Manage invoice type configuration", accent: "slate", type: "route", imageKey: "invoice-types", enabled: capabilities.canViewInvoices },
    { label: "Catalogs", route: catalogRoot, note: "Maintain pharmacy and product catalogs", accent: "rose", type: "route", imageKey: "socatalog", enabled: capabilities.canViewCatalogs },
    { label: "Stores", route: settingsRoot, note: "Manage store-facing order settings", accent: "slate", type: "externalRoute", imageKey: "store", enabled: capabilities.canViewStores },
    { label: "Items", route: itemsRoot, note: "Review sales-order item master data", accent: "slate", type: "route", imageKey: "items", enabled: capabilities.canViewItems },
    { label: "Invoices", route: invoicesRoot, note: "Review sales-order invoices", accent: "indigo", type: "route", imageKey: "invoices", enabled: capabilities.canViewInvoices },
    { label: "Dealers", route: settingsRoot, note: "Partner sales-order dealer workflow", accent: "amber", type: "route", imageKey: "partner", enabled: capabilities.canViewDealers },
    { label: "Item Variants", route: inventoryRoot, note: "Manage categories, groups, and variants", accent: "rose", type: "functionCall", imageKey: "item-variant", enabled: capabilities.canViewItemVariants },
    { label: "Logistics", route: settingsRoot, note: "Courier and shipment configuration", accent: "emerald", type: "route", imageKey: "logistics", enabled: capabilities.canViewLogistics },
    { label: "Delivery Profile", route: settingsRoot, note: "Delivery rules and fulfilment settings", accent: "slate", type: "route", imageKey: "delivery", enabled: capabilities.canViewDeliveryProfile },
    { label: "Active Cart", route: ordersRoot, note: "Resume the current cart flow", accent: "indigo", type: "route", imageKey: "active-cart", enabled: capabilities.canViewActiveCart },
  ];
}

export async function getOrdersDashboardDataset(
  scopedApi: ScopedApi,
  options: OrdersDashboardApiOptions
): Promise<OrdersDataset> {
  console.log("[orders] dataset:start", {
    userId: options.userId,
    locationId: options.locationId,
    locationName: options.locationName,
    locationCode: options.locationCode,
  });
  const capabilities = getDefaultOrdersCapabilities();
  const baseActions = buildActionRoutes(options.product, options.basePath, capabilities);
  const storesPromise = withTimeout(getActiveStores(scopedApi).catch(() => []), [], "active stores");
  const styleConfigPromise = options.userId
    ? withTimeout(getDashboardStyleConfig(scopedApi, options.userId).catch(() => []), [], "dashboard style config")
    : Promise.resolve([]);
  const settingsPromise = withTimeout(getSalesOrderSettings(scopedApi).catch(() => null), null, "sales order settings");

  const storesResponse = await storesPromise;
  console.log("[orders] dataset:storesResponse", storesResponse);
  const localSelectedStore = normalizeStore(options.selectedStore);
  const resolvedStore =
    localSelectedStore?.id || localSelectedStore?.encId
      ? localSelectedStore
      : resolveProviderStore(storesResponse, {
          locationId: options.locationId,
          locationName: options.locationName,
          locationCode: options.locationCode,
        });
  const storeId = resolvedStore?.id ? Number(resolvedStore.id) : null;
  const storeEncId = resolvedStore?.encId ?? null;
  console.log("[orders] dataset:resolvedStore", { localSelectedStore, resolvedStore, storeId, storeEncId });

  console.log("[orders] dataset:beforePromiseAll");
  const [styleConfigResponse, settingsResponse, ordersResponse, todayAnalyticsResponse, monthlyAnalyticsResponse, graphResponse] = await Promise.all([
    styleConfigPromise,
    settingsPromise,
    storeEncId ? withTimeout(getSalesOrders(scopedApi, storeEncId).catch(() => []), [], "sales orders") : Promise.resolve([]),
    storeId ? withTimeout(getOrdersAnalytics(scopedApi, "TODAY", storeId).catch(() => []), [], "today analytics") : Promise.resolve([]),
    storeId ? withTimeout(getOrdersAnalytics(scopedApi, "MONTHLY", storeId).catch(() => []), [], "monthly analytics") : Promise.resolve([]),
    storeId
      ? withTimeout(
          getOrdersGraphAnalytics(scopedApi, {
            category: "WEEKLY",
            type: "BARCHART",
            filter: {
              config_metric_type: "SALES_ORDER_GRAPH",
              "store-eq": storeId,
              orderCategory: "SALES_ORDER",
            },
          }).catch(() => null),
          null,
          "graph analytics"
        )
      : Promise.resolve(null),
  ]);
  console.log("[orders] dataset:afterPromiseAll", {
    styleConfigResponse,
    settingsResponse,
    ordersCount: Array.isArray(ordersResponse) ? ordersResponse.length : null,
    todayAnalyticsResponse,
    monthlyAnalyticsResponse,
    graphResponse,
  });

  const settings = settingsResponse ?? {};
  const actions = applySettingsToActions(baseActions, settings);
  const orders = mapSalesOrders(ordersResponse);

  const selectedActionValues = parseDashboardActionValues(styleConfigResponse);
  const preferredActionKeys = selectedActionValues.length
    ? actions.filter((action) => selectedActionValues.includes(mapActionValue(action))).map((action) => getActionKey(action))
    : undefined;

  const todayMetrics = indexAnalyticsMetrics(todayAnalyticsResponse);
  const monthlyMetrics = indexAnalyticsMetrics(monthlyAnalyticsResponse);
  const graphMetrics = parseGraphMetrics(graphResponse);
  const totalSales = readMetricNumber(todayMetrics, [
    "TODAY_SALES",
    "TODAY_SALES_AMOUNT",
    "TOTAL_SALES_AMOUNT",
    "SO_TODAY_SALES",
  ]);
  const orderCartCheckout = readMetricInt(monthlyMetrics, ["ORDER_CART_CHECKOUT"]);
  const paymentInitiated = readMetricInt(monthlyMetrics, ["ORDER_PAYMENT_INITIATED"]);
  const paymentCompleted = readMetricInt(monthlyMetrics, ["ORDER_PAYMENT_COMPLETED"]);
  const paymentFailed = Math.max(paymentInitiated - paymentCompleted, 0);
  const checkoutAbandonmentRate =
    orderCartCheckout !== 0
      ? Number((((orderCartCheckout - paymentCompleted) / orderCartCheckout) * 100).toFixed(2))
      : 0;

  return {
    title: "Sales Order",
    subtitle: "Streamlined sales tracking.",
    capabilities,
    summaries: [
      { label: "Orders Today", value: String(readMetricInt(todayMetrics, ["TOTAL_ORDERS", "TODAY_TOTAL_ORDERS", "SO_TOTAL_ORDERS"])), accent: "indigo" },
      { label: "Open Requests", value: String(readMetricInt(todayMetrics, ["OPEN_REQUESTS", "TOTAL_REQUESTS", "SO_TOTAL_REQUESTS"])), accent: "amber" },
      { label: "Catalog Items", value: "0", accent: "emerald" },
      { label: "Sales Value", value: formatOrdersCurrency(totalSales), accent: "rose" },
    ],
    actions,
    preferredActionKeys,
    orders,
    requests: [],
    catalogs: [],
    inventory: [],
    highlights: [],
    defaultDashboardView: settings?.isOrderRequest && options.product === "health" ? "rxRequests" : "orders",
    canShowRequests: Boolean(settings?.isOrderRequest) || capabilities.canViewRequests,
    adminAnalytics: {
      todaySalesAmount: totalSales,
      onlineOrdersEnabled: options.product !== "health",
      itemSearches: readMetricInt(monthlyMetrics, ["ORDER_SEARCH_QUERIES"]),
      itemDetailsPageViews: readMetricInt(monthlyMetrics, ["ORDER_PRODUCT_DETAIL_VIEWS"]),
      itemsAddedToCart: readMetricInt(monthlyMetrics, ["ORDER_CART_PRODUCTS_COUNT"]),
      cartCheckoutsInitiated: orderCartCheckout,
      checkoutAbandonmentRate,
      providerCouponApplied: readMetricInt(monthlyMetrics, ["PROVIDER_SORDER_COUPON_DISCOUNTS_COUNT"]),
      paymentsInitiated: paymentInitiated,
      paymentsCompleted: paymentCompleted,
      paymentsFailed: paymentFailed,
      weeklySalesPoints: graphMetrics.weeklySalesPoints,
      weeklyItemPoints: graphMetrics.weeklyItemPoints,
    },
  };
}

export async function getOrdersListPage(
  scopedApi: ScopedApi,
  options: OrdersListApiOptions
): Promise<{ rows: OrdersOrderRow[]; total: number }> {
  const storesResponse = await withTimeout(getActiveStores(scopedApi).catch(() => []), [], "active stores");
  const localSelectedStore = normalizeStore(options.selectedStore);
  const resolvedStore =
    localSelectedStore?.id || localSelectedStore?.encId
      ? localSelectedStore
      : resolveProviderStore(storesResponse, {
          locationId: options.locationId,
          locationName: options.locationName,
          locationCode: options.locationCode,
        });

  const storeEncId = resolvedStore?.encId ?? null;
  if (!storeEncId) {
    return { rows: [], total: 0 };
  }

  const offset = Math.max(0, (options.page - 1) * options.pageSize);
  const apiStatus = String(options.status ?? "").trim();
  const searchText = String(options.searchText ?? "").trim();
  const [pagePayload, countPayload] = await Promise.all([
    withTimeout(
      getSalesOrders(scopedApi, storeEncId, {
        from: offset,
        count: options.pageSize,
        searchText,
        status: apiStatus,
      }).catch(() => []),
      [],
      "sales orders page"
    ),
    withTimeout(
      getSalesOrdersCount(scopedApi, storeEncId, {
        searchText,
        status: apiStatus,
      }).catch(() => null),
      null,
      "sales orders count"
    ),
  ]);

  return {
    rows: mapSalesOrders(pagePayload),
    total: Math.max(
      readOrdersTotal(countPayload),
      readOrdersTotal(pagePayload),
      mapSalesOrders(pagePayload).length
    ),
  };
}

export async function getOrdersInvoiceTypesPage(
  scopedApi: ScopedApi,
  options: OrdersInvoiceTypesApiOptions
): Promise<{ rows: OrdersInvoiceTypeRow[]; total: number }> {
  const from = Math.max(0, (options.page - 1) * options.pageSize);
  const count = Math.max(1, options.pageSize);

  const [pagePayload, countPayload] = await Promise.all([
    scopedApi
      .get<any>("provider/order/invoice/type/details", {
        params: { from, count } satisfies ApiFilter,
      })
      .then((response) => response.data),
    scopedApi
      .get<any>("provider/order/invoice/type/details/count", {
        params: { from, count } satisfies ApiFilter,
      })
      .then((response) => response.data),
  ]);

  return {
    rows: mapOrdersInvoiceTypes(pagePayload),
    total: Math.max(readOrdersTotal(countPayload), mapOrdersInvoiceTypes(pagePayload).length),
  };
}

export async function getOrdersInvoicesPage(
  scopedApi: ScopedApi,
  options: OrdersInvoicesApiOptions
): Promise<{ rows: OrdersInvoiceRow[]; total: number }> {
  const from = Math.max(0, (options.page - 1) * options.pageSize);
  const count = Math.max(1, options.pageSize);
  const params = {
    from,
    count,
    "status-neq": "PREPAYMENT_PENDING_INVOICE,FAILED_ORDER_INVOICE",
    "orderCategory-eq": "SALES_ORDER",
  } satisfies ApiFilter;

  const [pagePayload, countPayload] = await Promise.all([
    scopedApi
      .get<any>("provider/so/invoice", { params })
      .then((response) => response.data),
    scopedApi
      .get<any>("provider/so/invoice/count", { params })
      .then((response) => response.data),
  ]);

  const rows = mapOrdersInvoices(pagePayload);

  return {
    rows,
    total: Math.max(readOrdersTotal(countPayload), rows.length),
  };
}

export async function getOrdersItemsPage(
  scopedApi: ScopedApi,
  options: OrdersItemsApiOptions
): Promise<{ rows: OrdersItemRow[]; total: number; settings: OrdersItemSettings }> {
  const from = Math.max(0, (options.page - 1) * options.pageSize);
  const count = Math.max(1, options.pageSize);
  const params = {
    from,
    count,
    "parentItemId-eq": 0,
    "orderCategory-eq": "SALES_ORDER",
  } satisfies ApiFilter;

  const [pagePayload, countPayload, settings] = await Promise.all([
    scopedApi
      .get<any>("provider/spitem", { params })
      .then((response) => response.data),
    scopedApi
      .get<any>("provider/spitem/count", { params })
      .then((response) => response.data),
    getOrdersItemSettings(scopedApi),
  ]);

  const rows = mapOrdersItems(pagePayload, settings);

  return {
    rows,
    total: Math.max(readOrdersTotal(countPayload), rows.length),
    settings,
  };
}

export async function getOrdersItemDetail(scopedApi: ScopedApi, itemId: string): Promise<OrdersItemDetail | null> {
  const resolvedItemId = String(itemId ?? "").trim();
  if (!resolvedItemId) {
    return null;
  }

  const [settings, payload] = await Promise.all([
    getOrdersItemSettings(scopedApi),
    getOrdersItemDetailPayload(scopedApi, resolvedItemId),
  ]);
  if (!payload) {
    return null;
  }

  const [analyticsPayload, itemOptionsPayload] = await Promise.all([
    getOrdersItemAnalytics(scopedApi, payload).catch(() => null),
    getOrdersChildItems(scopedApi, resolvedItemId).catch(() => []),
  ]);

  return mapOrdersItemDetail(payload, settings, analyticsPayload, itemOptionsPayload);
}

export async function getOrdersItemConsumptionHistory(
  scopedApi: ScopedApi,
  itemId: string,
  options: OrdersItemConsumptionHistoryApiOptions
): Promise<{ rows: OrdersItemConsumptionHistoryRow[]; total: number }> {
  const resolvedItemId = String(itemId ?? "").trim();
  if (!resolvedItemId) {
    return { rows: [], total: 0 };
  }

  const from = Math.max(0, (options.page - 1) * options.pageSize);
  const count = Math.max(1, options.pageSize);
  const encodedItemId = encodeURIComponent(resolvedItemId);
  const transactionParams = {
    "itemCode-eq": resolvedItemId,
    from,
    count,
  } satisfies ApiFilter;
  const sharedParams = {
    from,
    count,
    "spItemUid-eq": resolvedItemId,
    "itemUid-eq": resolvedItemId,
    "itemEncId-eq": resolvedItemId,
  } satisfies ApiFilter;

  try {
    const [transactionPayload, countPayload] = await Promise.all([
      scopedApi.get<any>("provider/inventory/transaction", { params: transactionParams }).then((response) => response.data),
      scopedApi.get<any>("provider/inventory/transaction/count", { params: transactionParams }).then((response) => response.data),
    ]);
    const rows = mapOrdersItemConsumptionHistory(transactionPayload);

    return {
      rows,
      total: Math.max(readOrdersTotal(countPayload), readOrdersTotal(transactionPayload), rows.length),
    };
  } catch {
    // Fall through to older item-history endpoints used by other deployments.
  }

  const requestFactories = [
    () => scopedApi.get<any>(`provider/spitem/${encodedItemId}/consumption/history`, { params: { from, count } }),
    () => scopedApi.get<any>(`provider/spitem/${encodedItemId}/consumption`, { params: { from, count } }),
    () => scopedApi.get<any>("provider/spitem/consumption/history", { params: sharedParams }),
    () => scopedApi.get<any>("provider/spitem/consumption", { params: sharedParams }),
    () => scopedApi.get<any>("provider/inventory/item/consumption/history", { params: sharedParams }),
  ];

  for (const createRequest of requestFactories) {
    try {
      const payload = await createRequest().then((response) => response.data);
      const rows = mapOrdersItemConsumptionHistory(payload);
      if (rows.length || readOrdersTotal(payload) > 0) {
        return {
          rows,
          total: Math.max(readOrdersTotal(payload), rows.length),
        };
      }
    } catch {
      // The legacy item history endpoint has varied by product; try the next known shape.
    }
  }

  return { rows: [], total: 0 };
}

export async function getOrdersCatalogsPage(
  scopedApi: ScopedApi,
  options: OrdersCatalogsApiOptions
): Promise<{ rows: OrdersCatalogRow[]; total: number }> {
  const storesResponse = await withTimeout(getActiveStores(scopedApi).catch(() => []), [], "active stores");
  const localSelectedStore = normalizeStore(options.selectedStore);
  const resolvedStore =
    localSelectedStore?.id || localSelectedStore?.encId
      ? localSelectedStore
      : resolveProviderStore(storesResponse, {
          locationId: options.locationId,
          locationName: options.locationName,
          locationCode: options.locationCode,
        });

  const storeEncId = resolvedStore?.encId ?? null;
  if (!storeEncId) {
    return { rows: [], total: 0 };
  }

  const from = Math.max(0, (options.page - 1) * options.pageSize);
  const count = Math.max(1, options.pageSize);

  const [pagePayload, countPayload] = await Promise.all([
    scopedApi
      .get<any>("provider/so/catalog", {
        params: {
          from,
          count,
          "storeEncId-eq": storeEncId,
          "orderCategory-eq": "SALES_ORDER",
        } satisfies ApiFilter,
      })
      .then((response) => response.data),
    scopedApi
      .get<any>("provider/so/catalog/count", {
        params: {
          from,
          count,
          "storeEncId-eq": storeEncId,
          "orderCategory-eq": "SALES_ORDER",
        } satisfies ApiFilter,
      })
      .then((response) => response.data),
  ]);

  return {
    rows: mapOrdersCatalogs(pagePayload),
    total: Math.max(readOrdersTotal(countPayload), mapOrdersCatalogs(pagePayload).length),
  };
}

export async function getSalesOrderDetail(scopedApi: ScopedApi, orderId: string): Promise<OrdersOrderDetail | null> {
  const collapsedRecordId = collapseSalesOrderRecordId(orderId);
  const baseOrderId = removeSalesOrderSuffix(collapsedRecordId);
  const encodedBaseOrderId = encodeURIComponent(baseOrderId);
  const encodedCollapsedOrderId = encodeURIComponent(collapsedRecordId);
  const withSuffix = ensureSalesOrderSuffix(baseOrderId);
  const encodedWithSuffix = encodeURIComponent(withSuffix);
  let lastError: unknown = null;

  // Prefer legacy `provider/sorder/:id` first (matches current production usage where ids can include `_sodr`).
  // Keep the request surface minimal to avoid extra backend load.
  for (const path of [
    `provider/sorder/${encodedCollapsedOrderId}`,
    // If the incoming id has no suffix, also try the suffixed variant.
    collapsedRecordId === withSuffix ? null : `provider/sorder/${encodedWithSuffix}`,
  ]) {
    if (!path) continue;

    try {
      const raw = await scopedApi.get<any>(path).then((response) => response.data);
      const payload = normalizeOrderDetailPayload(raw);
      const mapped = mapSalesOrderDetail(payload);
      if (mapped) return mapped;
    } catch (error) {
      lastError = error;
      // Try next endpoint.
    }
  }

  if (lastError) {
    throw toReadableApiError(lastError, "Unable to load sales order details.");
  }

  return null;
}

export async function updateSalesOrderNotes(
  scopedApi: ScopedApi,
  orderId: string,
  values: {
    notesToCustomer?: string;
    notesFromStaff?: string;
    raw?: unknown;
  }
) {
  const collapsedRecordId = collapseSalesOrderRecordId(orderId);
  const withSuffix = ensureSalesOrderSuffix(collapsedRecordId);
  const encodedOrderId = encodeURIComponent(withSuffix);
  const rawPayload = values.raw && typeof values.raw === "object" ? (values.raw as Record<string, unknown>) : {};
  const notesToCustomer = String(values.notesToCustomer ?? "").trim();
  const notesFromStaff = String(values.notesFromStaff ?? "").trim();

  const payload = {
    ...rawPayload,
    notesForCustomer: notesToCustomer,
    notesToCustomer,
    customerNotes: notesToCustomer,
    notes: notesFromStaff,
    doctorNotes: notesFromStaff,
    notesFromStaff,
  };

  return scopedApi.put<any>(`provider/sorder/${encodedOrderId}`, payload).then((response) => response.data);
}

export async function getOrdersBillDiscounts(scopedApi: ScopedApi): Promise<OrdersBillAdjustmentOption[]> {
  const raw = await scopedApi.get<any>("provider/bill/discounts").then((response) => response.data);
  return mapBillAdjustmentOptions(raw, "discount");
}

export async function getOrdersBillCoupons(scopedApi: ScopedApi): Promise<OrdersBillAdjustmentOption[]> {
  const raw = await scopedApi.get<any>("provider/bill/coupons/nonexpired").then((response) => response.data);
  return mapBillAdjustmentOptions(raw, "coupon");
}

export async function applySalesOrderAdjustment(
  scopedApi: ScopedApi,
  orderId: string,
  values: {
    kind: OrdersBillAdjustmentKind;
    selected: OrdersBillAdjustmentOption;
    privateNote?: string;
    customerNote?: string;
    raw?: unknown;
  }
) {
  const collapsedRecordId = collapseSalesOrderRecordId(orderId);
  const withSuffix = ensureSalesOrderSuffix(collapsedRecordId);
  const encodedOrderId = encodeURIComponent(withSuffix);
  const rawPayload = values.raw && typeof values.raw === "object" ? (values.raw as Record<string, unknown>) : {};
  const source = values.selected.raw && typeof values.selected.raw === "object"
    ? (values.selected.raw as Record<string, unknown>)
    : {};
  const privateNote = String(values.privateNote ?? "").trim();
  const customerNote = String(values.customerNote ?? "").trim();
  const amount = toOptionalNumber(source.discountValue ?? source.value ?? source.amount ?? values.selected.amount);

  if (values.kind === "discount") {
    const entry = {
      ...source,
      id: source.id ?? source.uid ?? values.selected.id,
      uid: source.uid ?? source.id ?? values.selected.id,
      name: String(source.name ?? source.label ?? values.selected.label).trim() || values.selected.label,
      label: String(source.label ?? source.name ?? values.selected.label).trim() || values.selected.label,
      discountValue: amount,
      value: amount,
      amount: amount ?? source.amount,
      note: privateNote || undefined,
      notes: privateNote || undefined,
      privateNote: privateNote || undefined,
      customerNote: customerNote || undefined,
      notesForCustomer: customerNote || undefined,
      notesToCustomer: customerNote || undefined,
    };

    const current = Array.isArray(rawPayload.discounts) ? rawPayload.discounts : [];
    const nextDiscounts = current
      .filter((item) => !isMatchingAdjustment(item, values.selected, "discount"))
      .concat(entry);

    return scopedApi.put<any>(`provider/sorder/${encodedOrderId}`, {
      ...rawPayload,
      discounts: nextDiscounts,
    }).then((response) => response.data);
  }

  const entry = {
    ...source,
    id: source.id ?? source.uid ?? values.selected.id,
    uid: source.uid ?? source.id ?? values.selected.id,
    code: String(source.code ?? source.couponCode ?? values.selected.code ?? values.selected.label).trim() || values.selected.label,
    couponCode: String(source.couponCode ?? source.code ?? values.selected.code ?? values.selected.label).trim() || values.selected.label,
    name: String(source.name ?? source.label ?? values.selected.label).trim() || values.selected.label,
    label: String(source.label ?? source.name ?? values.selected.label).trim() || values.selected.label,
    discount: amount,
    discountValue: amount,
    value: amount,
    amount: amount ?? source.amount,
    note: privateNote || undefined,
    notes: privateNote || undefined,
    privateNote: privateNote || undefined,
    customerNote: customerNote || undefined,
    notesForCustomer: customerNote || undefined,
    notesToCustomer: customerNote || undefined,
  };

  const current = Array.isArray(rawPayload.providerCoupons) ? rawPayload.providerCoupons : [];
  const nextCoupons = current
    .filter((item) => !isMatchingAdjustment(item, values.selected, "coupon"))
    .concat(entry);

  return scopedApi.put<any>(`provider/sorder/${encodedOrderId}`, {
    ...rawPayload,
    providerCoupons: nextCoupons,
  }).then((response) => response.data);
}

export async function updateSalesOrderStatus(
  scopedApi: ScopedApi,
  orderId: string,
  status: "ORDER_COMPLETED" | "ORDER_CANCELED"
) {
  const collapsedRecordId = collapseSalesOrderRecordId(orderId);
  const withSuffix = ensureSalesOrderSuffix(collapsedRecordId);
  const encodedOrderId = encodeURIComponent(withSuffix);
  const encodedStatus = encodeURIComponent(status);

  return scopedApi.put<any>(`provider/sorder/${encodedOrderId}/${encodedStatus}`, null).then((response) => response.data);
}

export async function getSalesOrderInvoiceUid(scopedApi: ScopedApi, orderId: string): Promise<string> {
  const collapsedRecordId = collapseSalesOrderRecordId(orderId);
  const withSuffix = ensureSalesOrderSuffix(collapsedRecordId);
  const encodedOrderId = encodeURIComponent(withSuffix);

  try {
    const raw = await scopedApi.get<any>(`provider/so/invoice/order/${encodedOrderId}`).then((response) => response.data);
    const candidate = readInvoiceUidFromInvoiceLookupPayload(raw);
    return candidate ? ensureInvoiceUid(candidate) : "";
  } catch (error) {
    throw toReadableApiError(error, "Unable to load invoice details for the selected order.");
  }
}

export async function getSalesOrderInvoiceDetail(scopedApi: ScopedApi, invoiceUid: string): Promise<OrdersInvoiceDetail | null> {
  const resolvedInvoiceUid = ensureInvoiceUid(invoiceUid);
  const encodedInvoiceUid = encodeURIComponent(resolvedInvoiceUid);

  try {
    const raw = await scopedApi.get<any>(`provider/so/invoice/${encodedInvoiceUid}`).then((response) => response.data);
    return mapInvoiceDetailPayload(raw, resolvedInvoiceUid);
  } catch (error) {
    throw toReadableApiError(error, "Unable to load invoice details.");
  }
}

export async function getOrdersCreditSystemDetails(
  scopedApi: ScopedApi,
  invoiceUid: string,
  creditSystemType: "CREDIT" | string = "CREDIT"
): Promise<OrdersCreditSystemDetail | null> {
  const resolvedInvoiceUid = ensureInvoiceUid(invoiceUid);
  const query = new URLSearchParams({
    "invoiceUid-eq": resolvedInvoiceUid,
    "creditSystemType-eq": creditSystemType,
  });

  try {
    const raw = await scopedApi.get<any>(`provider/creditsystem/details?${query.toString()}`).then((response) => response.data);
    const payload = normalizeFirstItem(raw);
    if (!payload) return null;

    return {
      invoiceUid: resolvedInvoiceUid,
      creditSystemType: String(payload?.creditSystemType ?? creditSystemType),
      status: String(payload?.status ?? payload?.state ?? "").trim() || undefined,
      amount: toOptionalNumber(payload?.amount ?? payload?.creditAmount ?? payload?.usedAmount),
      balance: toOptionalNumber(payload?.balance ?? payload?.availableBalance ?? payload?.availableCredit),
    };
  } catch (error) {
    throw toReadableApiError(error, "Unable to load credit system details.");
  }
}

export async function getOrdersPaymentDetails(scopedApi: ScopedApi, invoiceUid: string): Promise<OrdersPaymentDetail | null> {
  const resolvedInvoiceUid = ensureInvoiceUid(invoiceUid);
  const encoded = encodeURIComponent(resolvedInvoiceUid);

  try {
    const raw = await scopedApi.get<any>(`provider/payment/details/${encoded}`).then((response) => response.data);
    const payload = normalizeFirstItem(raw);
    if (!payload) return null;

    return {
      invoiceUid: resolvedInvoiceUid,
      status: String(payload?.status ?? payload?.paymentStatus ?? payload?.state ?? "").trim() || "UNKNOWN",
      paymentMethod: String(payload?.paymentMethod ?? payload?.method ?? payload?.mode ?? "").trim() || undefined,
      transactionId: String(payload?.transactionId ?? payload?.txnId ?? payload?.referenceId ?? payload?.paymentReference ?? "").trim() || undefined,
      amount: toOptionalNumber(payload?.amount ?? payload?.paidAmount ?? payload?.amountPaid),
      paidOn: String(payload?.paidOn ?? payload?.paidDate ?? payload?.paymentDate ?? payload?.createdDate ?? "").trim() || undefined,
    };
  } catch (error) {
    throw toReadableApiError(error, "Unable to load payment details.");
  }
}

export async function getOrdersInvoiceAuditLogs(
  scopedApi: ScopedApi,
  invoiceUid: string,
  pagination: { from: number; count: number }
): Promise<unknown> {
  const resolvedInvoiceUid = ensureInvoiceUid(invoiceUid);
  const query = new URLSearchParams({
    from: String(pagination?.from ?? 0),
    count: String(pagination?.count ?? 10),
    "soEncId-eq": resolvedInvoiceUid,
  });

  try {
    return await scopedApi.get<any>(`provider/so/auditlog?${query.toString()}`).then((response) => response.data);
  } catch (error) {
    throw toReadableApiError(error, "Unable to load audit logs.");
  }
}

export async function getOrdersInvoiceAuditLogsCount(scopedApi: ScopedApi, invoiceUid: string): Promise<number> {
  const resolvedInvoiceUid = ensureInvoiceUid(invoiceUid);
  const query = new URLSearchParams({
    from: "0",
    count: "10",
    "soEncId-eq": resolvedInvoiceUid,
  });

  const readCount = (payload: any): number => {
    if (typeof payload === "number") return Number.isFinite(payload) ? payload : 0;
    if (typeof payload === "string") {
      const parsed = Number(payload);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    const candidate = payload?.count ?? payload?.total ?? payload?.totalCount ?? payload?.data?.count ?? payload?.data?.totalCount;
    if (typeof candidate === "number") return Number.isFinite(candidate) ? candidate : 0;
    if (typeof candidate === "string") {
      const parsed = Number(candidate);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  };

  try {
    const raw = await scopedApi.get<any>(`provider/so/auditlog/count?${query.toString()}`).then((response) => response.data);
    return readCount(raw?.data ?? raw);
  } catch (error) {
    throw toReadableApiError(error, "Unable to load audit log count.");
  }
}

export async function getOrdersCustomer(scopedApi: ScopedApi, customerId: string): Promise<OrdersCustomerSummary | null> {
  const resolvedCustomerId = String(customerId ?? "").trim();
  if (!resolvedCustomerId) return null;

  try {
    const raw = await scopedApi.get<any>(`provider/customers/${encodeURIComponent(resolvedCustomerId)}`).then((response) => response.data);
    const payload = raw?.data ?? raw;
    if (!payload || typeof payload !== "object") return null;

    const id = String(payload?.id ?? payload?.uid ?? resolvedCustomerId).trim() || resolvedCustomerId;
    const memberJaldeeId = String(
      payload?.memberJaldeeId ??
        payload?.jaldeeId ??
        payload?.jaldeeId ??
        payload?.memberId ??
        payload?.memberUid ??
        payload?.consumerJaldeeId ??
        ""
    ).trim();
    const name = String(payload?.name ?? payload?.customerName ?? payload?.firstName ?? "").trim();
    const lastName = String(payload?.lastName ?? "").trim();
    const fullName = [name, lastName].filter(Boolean).join(" ").trim();

    return {
      id,
      memberJaldeeId: memberJaldeeId || undefined,
      name: fullName || resolvedCustomerId,
      phone: String(payload?.phoneNo ?? payload?.phone ?? payload?.mobileNo ?? payload?.mobile ?? "").trim() || undefined,
      email: String(payload?.email ?? payload?.emailId ?? "").trim() || undefined,
    };
  } catch (error) {
    throw toReadableApiError(error, "Unable to load customer details.");
  }
}

export async function getOrdersCreditSystemProviderConsumer(
  scopedApi: ScopedApi,
  customerId: string
): Promise<OrdersCreditSystemProviderConsumer | null> {
  const resolvedCustomerId = String(customerId ?? "").trim();
  if (!resolvedCustomerId) return null;

  try {
    const raw = await scopedApi
      .get<any>(`provider/creditsystem/providerconsumer/${encodeURIComponent(resolvedCustomerId)}`)
      .then((response) => response.data);
    const payload = normalizeFirstItem(raw);
    if (!payload) return null;

    return {
      customerId: resolvedCustomerId,
      creditLimit: toOptionalNumber(payload?.creditLimit ?? payload?.limit ?? payload?.maxCredit),
      availableCredit: toOptionalNumber(payload?.availableCredit ?? payload?.available ?? payload?.balance),
      outstanding: toOptionalNumber(payload?.outstanding ?? payload?.dueAmount ?? payload?.usedCredit),
      raw: payload,
    };
  } catch (error) {
    throw toReadableApiError(error, "Unable to load credit consumer details.");
  }
}

export async function getOrdersCreditSystemSettings(scopedApi: ScopedApi): Promise<OrdersCreditSystemSettings | null> {
  try {
    const raw = await scopedApi.get<any>("provider/creditsystem/settings").then((response) => response.data);
    const payload = raw?.data ?? raw;
    if (!payload) return null;

    const enabledValue = payload?.enabled ?? payload?.isEnabled ?? payload?.creditEnabled ?? payload?.status;
    const enabled =
      typeof enabledValue === "boolean"
        ? enabledValue
        : typeof enabledValue === "string"
          ? ["true", "enabled", "active", "yes", "y"].includes(enabledValue.toLowerCase())
          : undefined;

    return { enabled, raw: payload };
  } catch (error) {
    throw toReadableApiError(error, "Unable to load credit system settings.");
  }
}

function toReadableApiError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    const maybeAxios = error as any;
    const status = maybeAxios?.response?.status;
    const statusText = maybeAxios?.response?.statusText;
    const url = maybeAxios?.config?.url;
    const serverMessage =
      typeof maybeAxios?.response?.data?.message === "string"
        ? maybeAxios.response.data.message
        : typeof maybeAxios?.response?.data?.error === "string"
          ? maybeAxios.response.data.error
          : typeof maybeAxios?.response?.data === "string"
            ? maybeAxios.response.data
            : null;

    const parts = [
      fallbackMessage,
      status ? `HTTP ${status}${statusText ? ` ${statusText}` : ""}` : null,
      url ? `url: ${url}` : null,
      serverMessage ? `message: ${serverMessage}` : null,
      !status && !serverMessage ? error.message : null,
    ].filter(Boolean);

    return new Error(parts.join(" | "));
  }

  return new Error(fallbackMessage);
}

function readInvoiceUidFromInvoiceLookupPayload(payload: any): string {
  if (payload == null) return "";
  const data = payload?.data ?? payload;
  const root = Array.isArray(data) ? data[0] : data;

  const candidate = String(
    root?.invoiceUid ??
      root?.invUid ??
      root?.invoiceUUID ??
      root?.uid ??
      root?.invoice?.invoiceUid ??
      root?.invoice?.uid ??
      root?.invoiceDetails?.invoiceUid ??
      root?.invoiceDetails?.uid ??
      ""
  ).trim();

  return candidate;
}

function mapInvoiceDetailPayload(raw: any, fallbackInvoiceUid: string): OrdersInvoiceDetail | null {
  if (raw == null) return null;
  const data = raw?.data ?? raw;
  const payload = Array.isArray(data) ? data[0] : data;
  if (!payload || typeof payload !== "object") return null;

  const invoiceUid = String(
    payload?.invoiceUid ?? payload?.invUid ?? payload?.invoiceUUID ?? payload?.uid ?? payload?.invoice?.invoiceUid ?? fallbackInvoiceUid ?? ""
  ).trim();

  const invoiceNumber = String(
    payload?.invoiceNumber ?? payload?.invoiceNo ?? payload?.invoiceNum ?? payload?.displayId ?? payload?.displayNumber ?? payload?.id ?? invoiceUid
  ).trim();

  const invoiceDate = String(
    payload?.invoiceDate ?? payload?.createdDate ?? payload?.createdOn ?? payload?.date ?? payload?.invDate ?? ""
  ).trim();

  const status = String(payload?.status ?? payload?.invoiceStatus ?? payload?.state ?? "").trim();

  const customer = String(
    payload?.customerName ??
      payload?.customer ??
      payload?.consumerName ??
      payload?.consumer?.name ??
      payload?.providerConsumer?.name ??
      payload?.providerConsumer?.firstName ??
      payload?.consumer?.firstName ??
      ""
  ).trim();

  const customerId = String(
    payload?.customerId ??
      payload?.providerConsumerId ??
      payload?.providerConsumer?.id ??
      payload?.consumerId ??
      payload?.consumer?.id ??
      payload?.providerConsumerUid ??
      payload?.consumerUid ??
      ""
  ).trim();

  const orderId = String(
    payload?.orderId ?? payload?.orderUid ?? payload?.salesOrderUid ?? payload?.salesOrderId ?? payload?.soUid ?? payload?.soId ?? ""
  ).trim();

  const totalAmount = toNumber(
    payload?.totalAmount ??
      payload?.invoiceAmount ??
      payload?.grandTotal ??
      payload?.netTotal ??
      payload?.netRate ??
      payload?.amount ??
      0
  );

  const amountPaid = toOptionalNumber(payload?.amountPaid ?? payload?.paidAmount ?? payload?.amountReceived);
  const amountDue = toOptionalNumber(payload?.amountDue ?? payload?.balanceAmount ?? payload?.dueAmount);

  return {
    invoiceUid: ensureInvoiceUid(invoiceUid || fallbackInvoiceUid),
    invoiceNumber: invoiceNumber || ensureInvoiceUid(invoiceUid || fallbackInvoiceUid),
    invoiceDate,
    status,
    customer,
    customerId: customerId || undefined,
    orderId: orderId || undefined,
    totalAmount,
    amountPaid,
    amountDue,
    raw: payload,
  };
}

function collapseSalesOrderRecordId(orderId: string) {
  const suffix = "_sodr";
  let resolved = orderId;

  while (resolved.endsWith(`${suffix}${suffix}`)) {
    resolved = resolved.slice(0, -suffix.length);
  }

  return resolved;
}

function removeSalesOrderSuffix(orderId: string) {
  const suffix = "_sodr";
  return orderId.endsWith(suffix) ? orderId.slice(0, -suffix.length) : orderId;
}

function ensureSalesOrderSuffix(orderId: string) {
  const suffix = "_sodr";
  return orderId.endsWith(suffix) ? orderId : `${orderId}${suffix}`;
}

function normalizeOrderDetailPayload(raw: any): any {
  if (raw == null) {
    return null;
  }

  function tryParseEmbeddedJson(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const attempt = (startChar: "{" | "[", endChar: "}" | "]") => {
      const start = trimmed.indexOf(startChar);
      const end = trimmed.lastIndexOf(endChar);
      if (start < 0 || end < 0 || end <= start) return null;
      const slice = trimmed.slice(start, end + 1);
      try {
        return JSON.parse(slice);
      } catch {
        return null;
      }
    };

    return attempt("{", "}") ?? attempt("[", "]");
  }

  if (Array.isArray(raw)) {
    if (raw.length === 0) {
      return null;
    }
    if (raw.length === 1) {
      return normalizeOrderDetailPayload(raw[0]);
    }
    return raw;
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        return normalizeOrderDetailPayload(JSON.parse(trimmed));
      } catch {
        const embedded = tryParseEmbeddedJson(trimmed);
        return embedded ? normalizeOrderDetailPayload(embedded) : trimmed;
      }
    }

    const embedded = tryParseEmbeddedJson(trimmed);
    if (embedded) {
      return normalizeOrderDetailPayload(embedded);
    }

    return trimmed;
  }

  if (typeof raw !== "object") {
    return raw;
  }

  // Already looks like a sales order payload.
  if ((raw as any).uid || (raw as any).orderStatus || (raw as any).providerConsumer || (raw as any).itemDtoList) {
    return raw;
  }

  const candidates = [
    (raw as any).data,
    (raw as any).response,
    (raw as any).result,
    (raw as any).payload,
    (raw as any).order,
    (raw as any).sorder,
    (raw as any).sOrder,
    (raw as any).salesOrder,
    (raw as any).salesorder,
    (raw as any).sales_order,
    (raw as any).content,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (Array.isArray(candidate)) {
      if (candidate.length === 0) continue;
      return normalizeOrderDetailPayload(candidate[0]);
    }

    if (typeof candidate === "object") {
      return normalizeOrderDetailPayload(candidate);
    }
  }

  const deepMatch = findSalesOrderEntity(raw);
  return deepMatch ?? raw;
}

function findSalesOrderEntity(input: unknown) {
  const maxNodes = 250;
  const maxDepth = 6;

  const queue: Array<{ value: unknown; depth: number }> = [{ value: input, depth: 0 }];
  const visited = new Set<object>();
  let nodes = 0;

  while (queue.length > 0 && nodes < maxNodes) {
    const { value, depth } = queue.shift()!;
    nodes += 1;

    if (!value || depth > maxDepth) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        queue.push({ value: entry, depth: depth + 1 });
      }
      continue;
    }

    if (typeof value !== "object") {
      continue;
    }

    if (visited.has(value as object)) {
      continue;
    }
    visited.add(value as object);

    if (looksLikeSalesOrderPayload(value)) {
      return value as any;
    }

    for (const entry of Object.values(value as Record<string, unknown>)) {
      queue.push({ value: entry, depth: depth + 1 });
    }
  }

  return null;
}

function looksLikeSalesOrderPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  const signals = [
    Boolean((obj as any).uid),
    Boolean((obj as any).orderStatus),
    Boolean((obj as any).orderNum || (obj as any).orderNumber),
    Boolean((obj as any).providerConsumer || (obj as any).consumer),
    Boolean((obj as any).store),
    Array.isArray((obj as any).itemDtoList) || Array.isArray((obj as any).items),
  ];

  const score = signals.reduce((sum, flag) => sum + (flag ? 1 : 0), 0);
  return score >= 2;
}

async function withTimeout<T>(promise: Promise<T>, fallback: T, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => {
          console.warn(`[orders] ${label} request timed out after ${ORDERS_REQUEST_TIMEOUT_MS}ms`);
          resolve(fallback);
        }, ORDERS_REQUEST_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function getSalesOrderSettings(scopedApi: ScopedApi) {
  return scopedApi.get<any>("provider/sorder/settings/SALES_ORDER").then((response) => response.data);
}

async function getActiveStores(scopedApi: ScopedApi) {
  if (activeStoresCache && isCacheFresh(activeStoresCache, ACTIVE_STORES_CACHE_TTL_MS)) {
    return activeStoresCache.promise;
  }

  const promise = scopedApi
    .get<ProviderStore[]>("provider/store", {
      params: {
        "status-eq": "Active",
      } satisfies ApiFilter,
    })
    .then((response) => response.data)
    .catch((error) => {
      activeStoresCache = null;
      throw error;
    });

  activeStoresCache = { ts: Date.now(), promise };
  return promise;
}

async function getSalesOrders(
  scopedApi: ScopedApi,
  storeEncId: string,
  pagination?: { from: number; count: number; searchText?: string; status?: string }
) {
  const from = pagination?.from ?? 0;
  const count = pagination?.count ?? 10;
  const searchText = String(pagination?.searchText ?? "").trim();
  const status = String(pagination?.status ?? "").trim();
  const cacheKey = `${storeEncId}:${from}:${count}:${searchText}:${status}`;

  return cachePromise(salesOrdersCache, cacheKey, SALES_ORDERS_CACHE_TTL_MS, () =>
    scopedApi
      .get<any>("provider/sorder", {
        params: {
          from,
          count,
          "storeEncId-eq": storeEncId,
          ...(status ? {} : { "orderStatus-neq": "ORDER_PREPAYMENT_PENDING,FAILED_ORDER" }),
          ...(status ? { "orderStatus-eq": status } : {}),
          ...(searchText ? { "providerConsumerName-like": searchText } : {}),
          "orderCategory-eq": "SALES_ORDER",
        } satisfies ApiFilter,
      })
      .then((response) => response.data)
  );
}

async function getSalesOrdersCount(
  scopedApi: ScopedApi,
  storeEncId: string,
  options?: { searchText?: string; status?: string }
) {
  const searchText = String(options?.searchText ?? "").trim();
  const status = String(options?.status ?? "").trim();
  const cacheKey = `${storeEncId}:${searchText}:${status}`;

  return cachePromise(salesOrdersCountCache, cacheKey, SALES_ORDERS_COUNT_CACHE_TTL_MS, () =>
    scopedApi
      .get<any>("provider/sorder/count", {
        params: {
          "storeEncId-eq": storeEncId,
          ...(status ? {} : { "orderStatus-neq": "ORDER_PREPAYMENT_PENDING,FAILED_ORDER" }),
          ...(status ? { "orderStatus-eq": status } : {}),
          ...(searchText ? { "providerConsumerName-like": searchText } : {}),
          "orderCategory-eq": "SALES_ORDER",
        } satisfies ApiFilter,
      })
      .then((response) => response.data)
  );
}


async function getDashboardStyleConfig(scopedApi: ScopedApi, userId: string) {
  return scopedApi
    .get<any[]>("provider/styleconfig", {
      params: {
        "styleType-eq": "SalesOrderDashboardStyleConfig",
        "userId-eq": userId,
      },
    })
    .then((response) => response.data);
}

async function getOrdersAnalytics(scopedApi: ScopedApi, frequency: "TODAY" | "MONTHLY", storeId: number) {
  return scopedApi
    .get<any[]>("provider/analytics", {
      params: {
        frequency,
        config_metric_type: "SO_DASHBOARD_COUNT",
        orderCategory: "SALES_ORDER",
        store: storeId,
      } satisfies ApiFilter,
    })
    .then((response) => response.data);
}

async function getOrdersGraphAnalytics(scopedApi: ScopedApi, payload: unknown) {
  return scopedApi.put<any>("provider/analytics/graph", payload).then((response) => response.data);
}

function applySettingsToActions(actions: OrdersAction[], settings: any) {
  return actions.filter((action) => {
    if (action.imageKey === "rx-requests") {
      return Boolean(settings?.isOrderRequest);
    }
    if (action.imageKey === "partner") {
      return Boolean(settings?.isPartnerSalesorder);
    }
    return action.enabled !== false;
  });
}

function parseDashboardActionValues(payload: any): string[] {
  const firstConfig = Array.isArray(payload) ? payload[0] : payload;
  const configEntry = Array.isArray(firstConfig?.configJson) ? firstConfig.configJson[0] : firstConfig?.configJson;
  const dashboardActions = configEntry?.dashboardActions;
  return Array.isArray(dashboardActions) ? dashboardActions.map(String) : [];
}

function indexAnalyticsMetrics(payload: any): Record<string, number> {
  const records =
    Array.isArray(payload) ? payload :
    Array.isArray(payload?.data) ? payload.data :
    Array.isArray(payload?.responseWithStore) ? payload.responseWithStore :
    Array.isArray(payload?.metrics) ? payload.metrics :
    Array.isArray(payload?.analytics) ? payload.analytics :
    [];
  if (!records.length && payload && typeof payload === "object") {
    return Object.entries(payload).reduce<Record<string, number>>((acc, [key, value]) => {
      acc[normalizeMetricKey(key)] = toNumber(value);
      return acc;
    }, {});
  }
  return records.reduce<Record<string, number>>((acc, item) => {
    const keyCandidates = [
      item?.metricName,
      item?.metric,
      item?.configMetric,
      item?.config_metric,
      item?.displayName,
      item?.display_name,
      item?.metricLabel,
      item?.metric_label,
      item?.id,
      item?.name,
      item?.label,
    ]
      .map((value: unknown) => String(value ?? "").trim())
      .filter(Boolean)
      .map(normalizeMetricKey);

    const value = toNumber(
      item?.isAmt ? item?.amount :
      item?.metricValue ??
        item?.value ??
        item?.metric_count ??
        item?.metricCount ??
        item?.count ??
        item?.amount
    );

    keyCandidates.forEach((key) => {
      acc[key] = value;
    });
    return acc;
  }, {});
}


function parseGraphMetrics(payload: any) {
  const rawPoints = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.graphData)
        ? payload.graphData
        : [];

  const weeklySalesPoints = normalizeGraphPoints(rawPoints, ["sales", "sale", "amount", "salescost"]);
  const weeklyItemPoints = normalizeGraphPoints(rawPoints, ["item", "itemsold", "qty", "quantity"]);

  return { weeklySalesPoints, weeklyItemPoints };
}

function normalizeGraphPoints(rawPoints: any[], preferredKeys: string[]) {
  if (!Array.isArray(rawPoints) || rawPoints.length === 0) {
    return [];
  }

  return rawPoints
    .map((item) => {
      const label = String(
        item?.label ??
          item?.name ??
          item?.x ??
          item?.category ??
          item?.key ??
          ""
      ).trim();

      const value = readGraphValue(item, preferredKeys);
      return label ? { label, value } : null;
    })
    .filter((item): item is { label: string; value: number } => Boolean(item));
}

function readGraphValue(item: any, preferredKeys: string[]) {
  const entries = Object.entries(item ?? {});
  for (const preferredKey of preferredKeys) {
    const match = entries.find(([key]) => normalizeMetricKey(key) === normalizeMetricKey(preferredKey));
    if (match) {
      return toNumber(match[1]);
    }
  }

  const numericEntry = entries.find(([key, value]) => !["label", "name", "x", "category", "key"].includes(key) && typeof value !== "object");
  return toNumber(numericEntry?.[1]);
}

function readMetricNumber(metrics: Record<string, number>, keys: string[]) {
  for (const key of keys) {
    const normalized = normalizeMetricKey(key);
    if (normalized in metrics) {
      return metrics[normalized];
    }
  }
  return 0;
}

function readMetricInt(metrics: Record<string, number>, keys: string[]) {
  return Math.round(readMetricNumber(metrics, keys));
}

function normalizeMetricKey(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toOptionalNumber(value: unknown) {
  if (value == null) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeFirstItem(raw: any): any | null {
  if (raw == null) return null;
  const data = raw?.data ?? raw;
  if (Array.isArray(data)) {
    return data.length ? data[0] : null;
  }
  return data ?? null;
}

function mapActionValue(action: OrdersAction) {
  switch (action.imageKey) {
    case "orders":
      return "rxOrder";
    case "rx-order":
      return "Orders";
    case "rx-requests":
      return "RXRequests";
    case "invoice-types":
      return "invoiceTypes";
    case "socatalog":
      return "catalogs";
    case "store":
      return "Stores";
    case "items":
      return "orderItems";
    case "invoices":
      return "orderInvoices";
    case "partner":
      return "partner";
    case "item-variant":
      return "itemVariantPopup";
    case "logistics":
      return "logistics";
    case "delivery":
      return "deliveryProfile";
    case "active-cart":
      return "active-cart";
    default:
      return action.label;
  }
}

function getActionKey(action: { label: string; route: string; imageKey?: string }) {
  return `${action.label}:${action.route}:${action.imageKey ?? ""}`;
}

function resolveProviderStore(
  stores: ProviderStore[],
  target: { locationId?: string | null; locationName?: string | null; locationCode?: string | null }
) {
  if (!Array.isArray(stores) || stores.length === 0) {
    return null;
  }

  const normalizedLocationId = String(target.locationId ?? "").trim();
  const normalizedLocationName = normalizeText(target.locationName);
  const normalizedLocationCode = normalizeText(target.locationCode);

  const exactByLocationId = stores.find((store) => String(store.locationId ?? store.location?.id ?? "").trim() === normalizedLocationId);
  if (exactByLocationId) {
    return normalizeStore(exactByLocationId);
  }

  const exactByName = stores.find((store) => {
    const candidates = [
      store.name,
      store.storeName,
      store.location?.name,
      store.location?.place,
    ].map(normalizeText);

    return normalizedLocationName && candidates.includes(normalizedLocationName);
  });
  if (exactByName) {
    return normalizeStore(exactByName);
  }

  const exactByCode = stores.find((store) => {
    const candidates = [store.encId, store.storeEncId].map(normalizeText);
    return normalizedLocationCode && candidates.includes(normalizedLocationCode);
  });
  if (exactByCode) {
    return normalizeStore(exactByCode);
  }

  return normalizeStore(stores[0]);
}

function normalizeStore(store?: ProviderStore | null) {
  if (!store) {
    return null;
  }

  return {
    id: String(store.id ?? store.storeId ?? ""),
    encId: String(store.encId ?? store.storeEncId ?? ""),
    name: String(store.name ?? store.storeName ?? store.location?.name ?? store.location?.place ?? ""),
  };
}

function readOrdersTotal(payload: any) {
  if (typeof payload === "number") {
    return Number.isFinite(payload) && payload >= 0 ? payload : 0;
  }

  if (typeof payload === "string") {
    const parsed = Number(payload);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  if (Array.isArray(payload)) {
    return payload.length;
  }

  const candidates = [
    payload?.totalCount,
    payload?.totalElements,
    payload?.total,
    payload?.count,
    payload?.page?.totalElements,
    payload?.page?.total,
    payload?.data?.totalCount,
    payload?.data?.totalElements,
    payload?.data?.total,
    payload?.response?.totalCount,
    payload?.response?.totalElements,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value >= 0) {
      return value;
    }
  }

  const rows = mapSalesOrders(payload);
  return rows.length;
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function mapSalesOrders(payload: any): OrdersOrderRow[] {
  const items = Array.isArray(payload) ? payload : Array.isArray(payload?.content) ? payload.content : Array.isArray(payload?.data) ? payload.data : [];

  return items.map((item: any, index: number) => {
    const amountDue = toNumber(item?.amountDue ?? item?.balanceAmount ?? 0);
    const customerName = buildCustomerDisplayName(item);
    const orderSource = mapOrderSourceDisplay(item?.orderSource ?? item?.source ?? item?.channel ?? "PROVIDER_CONSUMER");
    const orderChannel = mapOrderTypeDisplay(item?.orderType ?? item?.channel ?? "WALK_IN");
    const orderStatus = mapOrderStatusDisplay(item?.orderStatus ?? item?.status ?? "ORDER_DRAFT");
    const paymentStatus = mapPaymentStatusDisplay(readPaymentStatus(item, amountDue));

    return {
      id: String(item?.uid ?? item?.id ?? item?.encId ?? `order-${index + 1}`),
      customer: customerName,
      customerRef: String(
        item?.providerConsumer?.jaldeeId ??
          item?.providerConsumer?.memberJaldeeId ??
          item?.providerConsumerId ??
          item?.providerConsumer?.id ??
          item?.providerConsumerUid ??
          item?.consumer?.jaldeeId ??
          item?.consumer?.id ??
          item?.consumerId ??
          ""
      ).trim() || undefined,
      source: orderSource,
      channel: orderChannel,
      orderNumber: String(item?.orderNum ?? item?.orderNumber ?? item?.displayId ?? "").trim() || undefined,
      store: String(item?.storeName ?? item?.store?.name ?? item?.departmentName ?? "").trim() || undefined,
      paymentStatus: paymentStatus || undefined,
      itemCount: Math.max(
        0,
        Math.round(
          toNumber(item?.itemCount ?? item?.item_count ?? item?.totalItems ?? item?.itemsCount)
        )
      ),
      totalAmount: toNumber(item?.netTotal ?? item?.orderAmount ?? item?.amountDue ?? item?.totalAmount ?? item?.amount),
      status: orderStatus,
      placedOn: String(item?.createdDate ?? item?.orderDate ?? item?.date ?? ""),
    };
  });
}

function mapOrdersInvoiceTypes(payload: any): OrdersInvoiceTypeRow[] {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.content)
      ? payload.content
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

  return items.map((item: any, index: number) => ({
    id: String(item?.id ?? item?.uid ?? item?.invoiceTypeId ?? `invoice-type-${index + 1}`),
    type: String(item?.type ?? item?.invoiceType ?? item?.name ?? item?.displayName ?? "").trim() || "-",
    prefix: String(item?.prefix ?? item?.invoicePrefix ?? "").trim() || "-",
    suffix: String(item?.suffix ?? item?.invoiceSuffix ?? "").trim() || "-",
    status: mapInvoiceTypeStatus(item),
    raw: item,
  }));
}

function mapOrdersInvoices(payload: any): OrdersInvoiceRow[] {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.content)
      ? payload.content
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.response)
            ? payload.response
            : [];

  return items.map((item: any, index: number) => {
    const invoiceUid = ensureInvoiceUid(
      String(
        item?.invoiceUid ??
          item?.invUid ??
          item?.invoiceUUID ??
          item?.uuid ??
          item?.uid ??
          item?.id ??
          `invoice-${index + 1}`
      ).trim()
    );
    const invoiceNumber = String(
      item?.invoiceNumber ??
        item?.invoiceNo ??
        item?.invoiceNum ??
        item?.displayId ??
        item?.displayNumber ??
        item?.invoiceId ??
        invoiceUid
    ).trim();
    const orderId = String(
      item?.orderId ??
        item?.orderUid ??
        item?.salesOrderUid ??
        item?.salesOrderId ??
        item?.soUid ??
        item?.soId ??
        item?.order?.uid ??
        item?.salesOrder?.uid ??
        ""
    ).trim();
    const orderNumber = String(
      item?.orderNumber ??
        item?.orderNum ??
        item?.salesOrderNumber ??
        item?.salesOrderNo ??
        item?.order?.orderNumber ??
        item?.order?.orderNum ??
        item?.salesOrder?.orderNumber ??
        ""
    ).trim();
    const customer = buildInvoiceCustomerDisplayName(item);
    const customerRef = String(
      item?.providerConsumer?.jaldeeId ??
        item?.providerConsumer?.memberJaldeeId ??
        item?.providerConsumerId ??
        item?.providerConsumer?.id ??
        item?.providerConsumerUid ??
        item?.consumer?.jaldeeId ??
        item?.consumer?.id ??
        item?.consumerId ??
        item?.customerId ??
        ""
    ).trim();
    const source = mapOrderSourceDisplay(
      item?.orderSource ??
        item?.source ??
        item?.salesOrder?.orderSource ??
        item?.salesOrder?.source ??
        item?.order?.orderSource ??
        item?.order?.source ??
        "PROVIDER_CONSUMER"
    );
    const storeName = String(
      item?.storeName ??
        item?.store?.name ??
        item?.departmentName ??
        item?.salesOrder?.storeName ??
        item?.salesOrder?.store?.name ??
        item?.salesOrder?.departmentName ??
        item?.order?.storeName ??
        item?.order?.store?.name ??
        item?.order?.departmentName ??
        item?.locationName ??
        ""
    ).trim();

    return {
      id: invoiceUid,
      invoiceUid,
      invoiceNumber: invoiceNumber || invoiceUid,
      orderId: orderId || undefined,
      orderNumber: orderNumber || undefined,
      customer,
      customerRef: customerRef || undefined,
      source,
      storeName: storeName || "-",
      invoiceDate: String(item?.invoiceDate ?? item?.createdDate ?? item?.createdOn ?? item?.date ?? item?.invDate ?? "").trim(),
      status: mapInvoiceStatusDisplay(item?.status ?? item?.invoiceStatus ?? item?.state ?? ""),
      totalAmount: toNumber(
        item?.totalAmount ??
          item?.invoiceAmount ??
          item?.grandTotal ??
          item?.netTotal ??
          item?.netRate ??
          item?.amount ??
          0
      ),
      amountPaid: toOptionalNumber(item?.amountPaid ?? item?.paidAmount ?? item?.amountReceived),
      amountDue: toOptionalNumber(item?.amountDue ?? item?.balanceAmount ?? item?.dueAmount),
      raw: item,
    };
  });
}

function mapOrdersItems(payload: any, settings: OrdersItemSettings): OrdersItemRow[] {
  const items = unwrapOrdersList(payload);
  const lookups = createItemSettingsLookups(settings);

  return items.map((item: any, index: number) => {
    const id =
      readFirstText(
        item?.encId,
        item?.uid,
        item?.itemUid,
        item?.spItemUid,
        item?.spCode,
        item?.spItemCode,
        item?.itemCode,
        item?.code,
        item?.itemId,
        item?.id,
        item?.item?.spCode,
        item?.item?.itemCode,
        item?.item?.uid,
        item?.item?.id
      ) || `item-${index + 1}`;
    const category = resolveOrdersSettingLabel(
      lookups.categories,
      item?.categoryName,
      item?.itemCategory?.categoryName,
      item?.category?.name,
      item?.itemCategory?.name,
      item?.spItemCategory?.name,
      item?.categoryId,
      item?.category?.id,
      item?.itemCategoryId,
      item?.itemCategory?.id,
      item?.itemCategory?.categoryCode,
      item?.itemCategory?.code,
      item?.spItemCategory?.id
    );
    const group = resolveOrdersSettingLabel(
      lookups.groups,
      item?.groupName,
      item?.group?.name,
      item?.itemGroup?.name,
      item?.spItemGroup?.name,
      item?.groupId,
      item?.group?.id,
      item?.itemGroupId,
      item?.itemGroup?.id,
      item?.spItemGroup?.id,
      item?.itemGroups
    );
    const type = resolveOrdersSettingLabel(
      lookups.types,
      item?.typeName,
      item?.type?.name,
      item?.itemType?.name,
      item?.spItemType?.name,
      item?.typeId,
      item?.type?.id,
      item?.itemTypeId,
      item?.itemType?.id,
      item?.spItemType?.id
    );
    const tax = resolveItemTaxLabel(lookups.taxes, item);

    return {
      id,
      name:
        readFirstText(
          item?.name,
          item?.itemName,
          item?.displayName,
          item?.shortName,
          item?.item?.name,
          item?.item?.itemName
        ) || "-",
      property:
        readItemPropertyLabel(item) ||
        readFirstText(
          item?.property,
          item?.propertyName,
          item?.itemProperty,
          item?.itemPropertyName,
          item?.classification,
          item?.itemClassification,
          item?.compositionName,
          item?.composition?.name
        ) || "Other",
      source: mapItemSourceDisplay(item?.source ?? item?.itemSource ?? item?.sourceType ?? "General"),
      category,
      group,
      type,
      trackInventory: readTrackInventoryLabel(item),
      tax,
      createdDate: formatOrdersItemDate(item?.createdDate ?? item?.createdOn ?? item?.createdAt ?? item?.createDate ?? item?.date),
      status: mapOrdersItemStatus(item?.status ?? item?.itemStatus ?? item?.state ?? item?.active),
      imageUrl: readOrdersItemImageUrl(item) || undefined,
      raw: item,
    };
  });
}

async function getOrdersItemSettings(scopedApi: ScopedApi): Promise<OrdersItemSettings> {
  const [
    categoryPayload,
    typePayload,
    unitPayload,
    hsnPayload,
    compositionPayload,
    taxPayload,
    groupPayload,
    manufacturerPayload,
  ] = await Promise.all([
    getOptionalOrdersPayload(scopedApi, "provider/spitem/settings/category", { "status-eq": "Enable" }),
    getOptionalOrdersPayload(scopedApi, "provider/spitem/settings/type", { "status-eq": "Enable" }),
    getOptionalOrdersPayload(scopedApi, "provider/spitem/settings/unit"),
    getOptionalOrdersPayload(scopedApi, "provider/spitem/settings/hsn", { "status-eq": "Enable" }),
    getOptionalOrdersPayload(scopedApi, "provider/spitem/settings/composition"),
    getOptionalOrdersPayload(scopedApi, "provider/spitem/settings/tax"),
    getOptionalOrdersPayload(scopedApi, "provider/spitem/group"),
    getOptionalOrdersPayload(scopedApi, "provider/spitem/settings/manufacturer", { "status-eq": "Enable" }),
  ]);

  return mapOrdersItemSettings({
    categories: categoryPayload,
    types: typePayload,
    units: unitPayload,
    hsn: hsnPayload,
    compositions: compositionPayload,
    taxes: taxPayload,
    groups: groupPayload,
    manufacturers: manufacturerPayload,
  });
}

async function getOrdersItemAnalytics(scopedApi: ScopedApi, item: any) {
  const spItemId = readOrdersItemAnalyticsId(item);
  if (!spItemId) {
    return null;
  }

  return scopedApi
    .get<any>("provider/analytics", {
      params: {
        frequency: "WEEKLY",
        config_metric_type: "INVENTORY_DASHBOARD_COUNT",
        spItem: spItemId,
      } satisfies ApiFilter,
    })
    .then((response) => response.data);
}

function readOrdersItemAnalyticsId(item: any) {
  return readFirstPositiveNumber(
    item?.id,
    item?.spItemId,
    item?.itemId,
    item?.item?.id,
    item?.spItem?.id,
    item?.analyticsSpItem,
    item?.analyticsSpItemId
  );
}

async function getOrdersItemDetailPayload(scopedApi: ScopedApi, itemId: string) {
  const encodedItemId = encodeURIComponent(itemId);
  let lastError: unknown = null;

  const requestFactories = [
    () => scopedApi.get<any>(`provider/spitem/${encodedItemId}`),
    () => scopedApi.get<any>("provider/spitem", { params: { "spCode-eq": itemId, from: 0, count: 1 } }),
    () => scopedApi.get<any>("provider/spitem", { params: { "spItemCode-eq": itemId, from: 0, count: 1 } }),
    () => scopedApi.get<any>("provider/spitem", { params: { "itemCode-eq": itemId, from: 0, count: 1 } }),
    () => scopedApi.get<any>("provider/spitem", { params: { "encId-eq": itemId, from: 0, count: 1 } }),
    () => scopedApi.get<any>("provider/spitem", { params: { "uid-eq": itemId, from: 0, count: 1 } }),
    () => scopedApi.get<any>("provider/spitem", { params: { "spItemUid-eq": itemId, from: 0, count: 1 } }),
    () => scopedApi.get<any>("provider/spitem", { params: { "itemUid-eq": itemId, from: 0, count: 1 } }),
    () => scopedApi.get<any>("provider/spitem", { params: { "id-eq": itemId, from: 0, count: 1 } }),
  ];

  for (const createRequest of requestFactories) {
    try {
      const raw = await createRequest().then((response) => response.data);
      const payload = normalizeOrdersItemDetailPayload(raw, itemId);
      if (payload) return payload;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw toReadableApiError(lastError, "Unable to load item details.");
  }

  return null;
}

async function getOrdersChildItems(scopedApi: ScopedApi, parentItemId: string): Promise<any[]> {
  const tryFetch = async (params: ApiFilter) => {
    const response = await scopedApi.get<any>("provider/spitem", { params });
    const data = response.data;
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.content)
        ? data.content
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.items)
            ? data.items
            : null;
    return Array.isArray(list) ? list : [];
  };

  // Try the various parent-filter param names used across deployments
  for (const paramKey of [
    "parentItemSpCode-eq",
    "parentSpCode-eq",
    "parentItemId-eq",
    "parentId-eq",
    "parentEncId-eq",
    "parentItemUid-eq",
  ]) {
    try {
      const rows = await tryFetch({ [paramKey]: parentItemId, from: 0, count: 100 } satisfies ApiFilter);
      if (rows.length > 0) return rows;
    } catch {
      // try next param key
    }
  }

  return [];
}

function mapOrdersItemOptions(items: any[]): OrdersItemOption[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  return items.map((item: any, index: number) => {
    const id =
      readFirstText(
        item?.encId,
        item?.uid,
        item?.spCode,
        item?.spItemCode,
        item?.itemCode,
        item?.code,
        item?.id
      ) || `option-${index + 1}`;

    const name =
      readFirstText(item?.name, item?.itemName, item?.displayName) || "-";

    const batchApplicable = readYesNoLabel(
      item?.isBatchApplicable ?? item?.batchApplicable ?? item?.batchEnabled ?? item?.batch
    );

    const trackInventory = readYesNoLabel(
      item?.isInventoryItem ?? item?.trackInventory ?? item?.inventoryTracked ?? item?.trackStock
    );

    const rawStatus = String(item?.status ?? item?.itemStatus ?? item?.state ?? "").trim();
    const status = mapOrdersItemStatus(rawStatus);

    return { id, name, batchApplicable, trackInventory, status, raw: item };
  });
}

function readIsChildItem(item: any): boolean {
  // Check every known field name that indicates a parent item exists
  const candidates = [
    item?.parentItemSpCode,
    item?.parentSpCode,
    item?.parentItemId,
    item?.parentId,
    item?.parentEncId,
    item?.parentItemUid,
    item?.parentUid,
    item?.parentCode,
    item?.parentItem?.id,
    item?.parentItem?.spCode,
    item?.parentItem?.encId,
  ];

  for (const val of candidates) {
    if (val === null || val === undefined) continue;
    if (typeof val === "number" && val > 0) return true;
    if (typeof val === "string" && val.trim() !== "" && val.trim() !== "0") return true;
    if (typeof val === "object" && val !== null) return true;
  }

  return false;
}

function normalizeOrdersItemDetailPayload(raw: any, itemId: string) {
  if (raw == null) return null;

  const data = raw?.data ?? raw?.content ?? raw?.response ?? raw;
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.content)
      ? data.content
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.items)
          ? data.items
          : null;

  if (Array.isArray(list)) {
    return (
      list.find((item: any) => {
        const ids = [
          item?.encId,
          item?.uid,
          item?.itemUid,
          item?.spItemUid,
          item?.spCode,
          item?.spItemCode,
          item?.itemCode,
          item?.code,
          item?.itemId,
          item?.id,
        ].map((value) => String(value ?? "").trim());
        return ids.includes(itemId);
      }) ?? list[0] ?? null
    );
  }

  return data && typeof data === "object" ? data : null;
}

function mapOrdersItemDetail(payload: any, settings: OrdersItemSettings, analyticsPayload?: any, itemOptionsPayload?: any[]): OrdersItemDetail | null {
  const row = mapOrdersItems([payload], settings)[0];
  if (!row) {
    return null;
  }

  const lookups = {
    units: createOrdersOptionLookup(settings.units),
    taxes: createOrdersOptionLookup(settings.taxes),
  };

  return {
    ...row,
    description: readOrdersItemDescription(payload),
    unit: readOrdersItemUnitLabel(payload, lookups.units),
    batchApplicable: readYesNoLabel(
      payload?.batchApplicable ??
        payload?.isBatchApplicable ??
        payload?.batchEnabled ??
        payload?.isBatchEnabled ??
        payload?.enableBatch ??
        payload?.batch
    ),
    tax: row.tax && row.tax !== "-" ? row.tax : resolveItemTaxLabel(lookups.taxes, payload),
    gallery: readOrdersItemGallery(payload, row.imageUrl),
    badges: readOrdersItemBadges(payload),
    stats: readOrdersItemStats(payload, analyticsPayload),
    consumptionHistory: mapOrdersItemConsumptionHistory(readOrdersItemInlineHistory(payload)),
    itemOptions: mapOrdersItemOptions(itemOptionsPayload ?? []),
    isChildItem: readIsChildItem(payload),
  };
}

function readOrdersItemDescription(item: any) {
  return readFirstText(
    item?.description,
    item?.shortDesc,
    item?.itemDescription,
    item?.shortDescription,
    item?.item?.shortDesc,
    item?.longDescription,
    item?.details,
    item?.item?.description
  );
}

function readOrdersItemUnitLabel(item: any, lookup: Map<string, string>) {
  return resolveOrdersSettingLabel(
    lookup,
    item?.unitName,
    item?.unitDisplayName,
    item?.unitLabel,
    item?.unitValue,
    item?.unitCode,
    item?.unitType,
    item?.uom,
    item?.uomName,
    item?.measurementUnit,
    item?.measurementUnitName,
    item?.unitOfMeasurement,
    item?.itemUnitName,
    item?.salesUnitName,
    item?.spItemUnitName,
    item?.unit,
    item?.itemUnit,
    item?.salesUnit,
    item?.spItemUnit,
    item?.unitId,
    item?.unitUid,
    item?.itemUnitId,
    item?.salesUnitId,
    item?.spItemUnitId,
    item?.unit?.id,
    item?.unit?.uid,
    item?.unit?.encId,
    item?.unit?.code,
    item?.unit?.value,
    item?.unit?.name,
    item?.unit?.displayName,
    item?.unit?.label,
    item?.unit?.unitName,
    item?.unit?.unitCode,
    item?.unit?.unitType,
    item?.itemUnit?.id,
    item?.itemUnit?.uid,
    item?.itemUnit?.encId,
    item?.itemUnit?.code,
    item?.itemUnit?.value,
    item?.itemUnit?.name,
    item?.itemUnit?.displayName,
    item?.itemUnit?.label,
    item?.itemUnit?.unitName,
    item?.salesUnit?.id,
    item?.salesUnit?.uid,
    item?.salesUnit?.encId,
    item?.salesUnit?.code,
    item?.salesUnit?.value,
    item?.salesUnit?.name,
    item?.salesUnit?.displayName,
    item?.salesUnit?.label,
    item?.salesUnit?.unitName,
    item?.spItemUnit?.id,
    item?.spItemUnit?.uid,
    item?.spItemUnit?.encId,
    item?.spItemUnit?.code,
    item?.spItemUnit?.value,
    item?.spItemUnit?.name,
    item?.spItemUnit?.displayName,
    item?.spItemUnit?.label,
    item?.spItemUnit?.unitName
  );
}

function readYesNoLabel(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";

  const text = readFirstText(value);
  if (!text) return "-";

  const normalized = text.toLowerCase();
  if (["true", "yes", "y", "enable", "enabled", "active", "1"].includes(normalized)) return "Yes";
  if (["false", "no", "n", "disable", "disabled", "inactive", "0"].includes(normalized)) return "No";

  return text;
}

function readOrdersItemGallery(item: any, fallbackImageUrl?: string) {
  const urls = [
    fallbackImageUrl,
    item?.imageUrl,
    item?.imageURL,
    item?.image,
    item?.s3path,
    item?.s3Path,
    item?.picture,
    item?.photo,
    item?.logo,
    item?.itemImage?.url,
    item?.itemImage?.imageUrl,
    item?.itemImage?.s3path,
    item?.itemImage?.s3Path,
    item?.item?.imageUrl,
  ];

  const attachments = [
    ...(Array.isArray(item?.attachments) ? item.attachments : []),
    ...(Array.isArray(item?.item?.attachments) ? item.item.attachments : []),
    ...(Array.isArray(item?.spItem?.attachments) ? item.spItem.attachments : []),
    ...(Array.isArray(item?.images) ? item.images : []),
    ...(Array.isArray(item?.imageList) ? item.imageList : []),
    ...(Array.isArray(item?.gallery) ? item.gallery : []),
  ];

  attachments.forEach((attachment) => {
    urls.push(
      readFirstText(
        attachment?.url,
        attachment?.imageUrl,
        attachment?.fileUrl,
        attachment?.s3Url,
        attachment?.s3path,
        attachment?.s3Path,
        attachment?.path,
        attachment
      )
    );
  });

  return Array.from(new Set(urls.map((url) => readFirstText(url)).filter(Boolean)));
}

function readOrdersItemBadges(item: any) {
  const rawBadges = [
    item?.badges,
    item?.badgeList,
    item?.labels,
    item?.labelList,
    item?.tags,
    item?.tagList,
    item?.itemBadges,
  ].flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []));

  return Array.from(
    new Set(
      rawBadges
        .map((badge: any) =>
          readFirstText(
            badge?.label,
            badge?.name,
            badge?.title,
            badge?.value,
            badge?.tagName,
            badge?.badgeName,
            badge
          )
        )
        .filter(Boolean)
    )
  );
}

function readOrdersItemStats(item: any, analyticsPayload?: any) {
  const analyticsStats = readOrdersItemAnalyticsStats(analyticsPayload);

  return {
    numberOfOrders: readFirstNumber(
      analyticsStats?.numberOfOrders,
      item?.numberOfOrders,
      item?.ordersCount,
      item?.orderCount,
      item?.salesOrderCount,
      item?.stats?.numberOfOrders,
      item?.stats?.orderCount
    ),
    orderQuantity: readFirstNumber(
      analyticsStats?.orderQuantity,
      item?.orderQuantity,
      item?.orderedQuantity,
      item?.salesOrderQuantity,
      item?.stats?.orderQuantity,
      item?.stats?.orderedQuantity
    ),
    numberOfPurchase: readFirstNumber(
      analyticsStats?.numberOfPurchase,
      item?.numberOfPurchase,
      item?.numberOfPurchases,
      item?.purchaseCount,
      item?.purchasesCount,
      item?.stats?.numberOfPurchase,
      item?.stats?.purchaseCount
    ),
    purchasedQuantity: readFirstNumber(
      analyticsStats?.purchasedQuantity,
      item?.purchasedQuantity,
      item?.purchaseQuantity,
      item?.totalPurchasedQuantity,
      item?.stats?.purchasedQuantity,
      item?.stats?.purchaseQuantity
    ),
  };
}

function readOrdersItemAnalyticsStats(payload: any) {
  if (!payload) {
    return null;
  }

  return {
    numberOfOrders: readAnalyticsMetricNumber(payload, [
      "NUMBER_OF_ORDERS",
      "NO_OF_ORDERS",
      "ORDER_COUNT",
      "ORDERS_COUNT",
      "SALES_ORDER_COUNT",
      "numberOfOrders",
      "orderCount",
    ]),
    orderQuantity: readAnalyticsMetricNumber(payload, [
      "ORDER_QUANTITY",
      "ORDERED_QUANTITY",
      "SALES_ORDER_QUANTITY",
      "ORDER_QTY",
      "orderedQuantity",
      "orderQuantity",
    ]),
    numberOfPurchase: readAnalyticsMetricNumber(payload, [
      "NUMBER_OF_PURCHASE",
      "NUMBER_OF_PURCHASES",
      "PURCHASE_COUNT",
      "PURCHASES_COUNT",
      "numberOfPurchase",
      "purchaseCount",
    ]),
    purchasedQuantity: readAnalyticsMetricNumber(payload, [
      "PURCHASED_QUANTITY",
      "PURCHASE_QUANTITY",
      "PURCHASE_QTY",
      "purchasedQuantity",
      "purchaseQuantity",
    ]),
  };
}

function readAnalyticsMetricNumber(payload: any, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeMetricKey);
  const direct = readDirectAnalyticsMetric(payload, normalizedAliases);
  if (direct !== undefined) return direct;

  const entries = collectAnalyticsEntries(payload);
  for (const entry of entries) {
    const key = normalizeMetricKey(
      readFirstText(
        entry?.configMetricType,
        entry?.config_metric_type,
        entry?.metricType,
        entry?.metric_type,
        entry?.metric,
        entry?.name,
        entry?.label,
        entry?.key,
        entry?.type
      )
    );
    if (!key || !normalizedAliases.includes(key)) {
      continue;
    }

    const value = readFirstOptionalNumber(
      entry?.value,
      entry?.count,
      entry?.metricValue,
      entry?.metric_value,
      entry?.quantity,
      entry?.qty,
      entry?.total,
      entry?.data
    );
    if (value !== undefined) return value;
  }

  return undefined;
}

function readDirectAnalyticsMetric(payload: any, normalizedAliases: string[]) {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const objects = collectAnalyticsEntries(payload);
  for (const object of [payload, ...objects]) {
    if (!object || typeof object !== "object" || Array.isArray(object)) continue;

    for (const [key, value] of Object.entries(object)) {
      if (!normalizedAliases.includes(normalizeMetricKey(key))) continue;
      const numeric = readFirstOptionalNumber(value);
      if (numeric !== undefined) return numeric;
    }
  }

  return undefined;
}

function collectAnalyticsEntries(payload: any): any[] {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload.flatMap((item) => [item, ...collectAnalyticsEntries(item)]);
  }

  if (typeof payload !== "object") {
    return [];
  }

  const nestedLists = [
    payload.data,
    payload.content,
    payload.items,
    payload.response,
    payload.results,
    payload.list,
    payload.metrics,
    payload.analytics,
  ].filter(Boolean);

  return nestedLists.flatMap((item) => (Array.isArray(item) ? item.flatMap((entry) => [entry, ...collectAnalyticsEntries(entry)]) : [item, ...collectAnalyticsEntries(item)]));
}

function readOrdersItemInlineHistory(item: any) {
  return (
    item?.consumptionHistory ??
    item?.itemConsumptionHistory ??
    item?.inventoryHistory ??
    item?.stockHistory ??
    item?.transactions ??
    item?.transactionHistory ??
    []
  );
}

function mapOrdersItemConsumptionHistory(payload: any): OrdersItemConsumptionHistoryRow[] {
  return unwrapOrdersList(payload).map((item: any, index: number) => ({
    id: readFirstText(item?.uid, item?.encId, item?.id, item?.referenceNumber, item?.referenceNo) || `history-${index + 1}`,
    date: formatOrdersItemDate(
      item?.date ??
        item?.createdDate ??
        item?.createdOn ??
        item?.createdAt ??
        item?.dateTime ??
        item?.transactionDate ??
        item?.transactionTime ??
        item?.updatedDate ??
        item?.updatedOn
    ),
    batch: readFirstText(
      item?.batch,
      item?.batchName,
      item?.batchNo,
      item?.batchNumber,
      item?.batchId,
      item?.inventoryBatch?.batch,
      item?.inventoryBatch?.batchName,
      item?.inventoryBatch?.batchNo,
      item?.catalogItemBatch?.batch,
      item?.catalogItemBatch?.batchName
    ) || "-",
    referenceNumber: readFirstText(
      item?.referenceNumber,
      item?.referenceNo,
      item?.refNo,
      item?.refNumber,
      item?.referenceId,
      item?.referenceUid,
      item?.transactionNumber,
      item?.orderNumber,
      item?.purchaseNumber,
      item?.invoiceNumber,
      item?.displayId
    ) || "-",
    store: readFirstText(item?.storeName, item?.store?.name, item?.store?.storeName, item?.departmentName, item?.locationName) || "-",
    transactionType: normalizeHistoryLabel(item?.transactionType ?? item?.transaction_type ?? item?.type ?? item?.sourceType ?? item?.source) || "-",
    updateType: normalizeHistoryLabel(item?.updateType ?? item?.update_type ?? item?.operation ?? item?.action ?? item?.movementType) || "-",
    quantity: readFirstNumber(
      item?.quantity,
      item?.qty,
      item?.updatedQuantity,
      item?.quantityChange,
      item?.changeQuantity,
      item?.transactionQuantity,
      item?.count,
      item?.itemQuantity
    ),
    raw: item,
  }));
}

function normalizeHistoryLabel(value: unknown) {
  const text = readFirstText(value);
  if (!text) return "";

  return text
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function readFirstNumber(...values: unknown[]) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const numeric = toOptionalNumber(value);
    if (numeric !== undefined) return numeric;
  }

  return 0;
}

function readFirstOptionalNumber(...values: unknown[]) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const numeric = toOptionalNumber(value);
    if (numeric !== undefined) return numeric;
  }

  return undefined;
}

function readFirstPositiveNumber(...values: unknown[]) {
  for (const value of values) {
    const numeric = readFirstOptionalNumber(value);
    if (numeric !== undefined && numeric > 0) return numeric;
  }

  return 0;
}

function mapOrdersItemSettings(payloads: {
  categories: any;
  groups: any;
  types: any;
  units: any;
  hsn: any;
  compositions: any;
  taxes: any;
  manufacturers: any;
}): OrdersItemSettings {
  return {
    categories: mapOrdersItemSettingOptions(payloads.categories, "category"),
    groups: mapOrdersItemSettingOptions(payloads.groups, "group"),
    types: mapOrdersItemSettingOptions(payloads.types, "type"),
    units: mapOrdersItemSettingOptions(payloads.units, "unit"),
    hsn: mapOrdersItemSettingOptions(payloads.hsn, "hsn"),
    compositions: mapOrdersItemSettingOptions(payloads.compositions, "composition"),
    taxes: mapOrdersItemSettingOptions(payloads.taxes, "tax"),
    manufacturers: mapOrdersItemSettingOptions(payloads.manufacturers, "manufacturer"),
  };
}

function mapOrdersItemSettingOptions(payload: any, kind: string): OrdersItemSettingsOption[] {
  return unwrapOrdersList(payload)
    .map((item: any, index: number) => {
      const id =
        readFirstText(
          item?.id,
          item?.uid,
          item?.encId,
          item?.code,
          item?.value,
          item?.[`${kind}Id`],
          item?.[`${kind}Uid`],
          item?.[`${kind}Code`]
        ) || `${kind}-${index + 1}`;
      const label =
        kind === "tax"
          ? readTaxOptionLabel(item)
          : readFirstText(
              item?.label,
              item?.name,
              item?.displayName,
              item?.title,
              item?.value,
              item?.code,
              item?.[`${kind}Name`],
              item?.[`${kind}Type`],
              item?.[`${kind}Code`]
            );

      return {
        id,
        label: label || id,
        raw: item,
      };
    })
    .filter((item) => item.id && item.label);
}

function createItemSettingsLookups(settings: OrdersItemSettings) {
  return {
    categories: createOrdersOptionLookup(settings.categories),
    groups: createOrdersOptionLookup(settings.groups),
    types: createOrdersOptionLookup(settings.types),
    taxes: createOrdersOptionLookup(settings.taxes),
  };
}

function createOrdersOptionLookup(options: OrdersItemSettingsOption[]) {
  const lookup = new Map<string, string>();

  options.forEach((option) => {
    addOrdersLookupValue(lookup, option.id, option.label);
    addOrdersLookupValue(lookup, option.label, option.label);

    const raw: any = option.raw as any;
    [
      raw?.id,
      raw?.uid,
      raw?.encId,
      raw?.code,
      raw?.value,
      raw?.name,
      raw?.displayName,
      raw?.label,
      raw?.categoryId,
      raw?.categoryName,
      raw?.groupId,
      raw?.groupName,
      raw?.groupCode,
      raw?.typeId,
      raw?.typeName,
      raw?.unitId,
      raw?.unitUid,
      raw?.unitCode,
      raw?.unitName,
      raw?.unitType,
      raw?.taxId,
      raw?.taxUid,
      raw?.taxCode,
      raw?.taxName,
      raw?.taxPercentage,
      raw?.taxPercent,
      raw?.gstPercentage,
      raw?.gstPercent,
      raw?.percentage,
    ].forEach((value) => addOrdersLookupValue(lookup, value, option.label));
  });

  return lookup;
}

function addOrdersLookupValue(lookup: Map<string, string>, key: unknown, label: string) {
  const normalized = normalizeText(key);
  if (normalized) {
    lookup.set(normalized, label);
  }
}

function resolveOrdersSettingLabel(lookup: Map<string, string>, ...candidates: unknown[]) {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const labels = candidate
        .map((entry) => resolveOrdersSettingLabel(lookup, entry))
        .filter((entry) => entry && entry !== "-");
      if (labels.length) return Array.from(new Set(labels)).join(", ");
      continue;
    }

    const text = readOrdersSettingCandidateText(candidate);
    if (!text) continue;

    const resolved = lookup.get(normalizeText(text));
    if (resolved) return resolved;

    if (!/^\d+$/.test(text)) return text;
  }

  return "-";
}

function readOrdersSettingCandidateText(candidate: unknown) {
  if (candidate && typeof candidate === "object") {
    const item = candidate as any;
    return readFirstText(
      item?.label,
      item?.name,
      item?.displayName,
      item?.title,
      item?.value,
      item?.code,
      item?.unitName,
      item?.unitCode,
      item?.unitType,
      item?.categoryName,
      item?.groupName,
      item?.typeName,
      item?.taxName,
      item?.id,
      item?.uid,
      item?.encId
    );
  }

  return readFirstText(candidate);
}

function readItemPropertyLabel(item: any) {
  const attributes = Array.isArray(item?.itemAttributes)
    ? item.itemAttributes
    : Array.isArray(item?.attributes)
      ? item.attributes
      : [];

  if (!attributes.length) return "";

  return attributes
    .slice()
    .sort((left: any, right: any) => toNumber(left?.position) - toNumber(right?.position))
    .map((attribute: any) => {
      const name = readFirstText(attribute?.attribute, attribute?.name, attribute?.label);
      const values = Array.isArray(attribute?.values)
        ? attribute.values.map((value: unknown) => readFirstText(value)).filter(Boolean)
        : [readFirstText(attribute?.value)].filter(Boolean);

      if (name && values.length) return `${name}: ${values.join(", ")}`;
      if (name) return name;
      return values.join(", ");
    })
    .filter(Boolean)
    .join(" | ");
}

function resolveItemTaxLabel(lookup: Map<string, string>, item: any) {
  const explicit = readFirstText(
    item?.taxName,
    item?.tax?.taxName,
    item?.tax?.name,
    item?.tax?.label,
    item?.tax?.displayName,
    item?.taxSettings?.taxName,
    item?.taxSettings?.name,
    item?.taxSettings?.label,
    item?.taxSettings?.displayName,
    item?.taxLabel,
    item?.gstName,
    item?.gstLabel,
    item?.gst?.name,
    item?.itemTax?.name,
    item?.itemTax?.taxName
  );
  if (explicit) return formatTaxLabelValue(explicit);

  const taxPercent = toOptionalNumber(
    item?.taxPercentage ??
      item?.taxPercent ??
      item?.gstPercentage ??
      item?.gstPercent ??
      item?.taxValue ??
      item?.gstValue ??
      item?.tax?.percentage ??
      item?.tax?.taxPercentage ??
      item?.tax?.taxPercent ??
      item?.tax?.gstPercentage ??
      item?.tax?.gstPercent ??
      item?.taxSettings?.percentage ??
      item?.taxSettings?.taxPercentage ??
      item?.taxSettings?.taxPercent ??
      item?.taxSettings?.gstPercentage ??
      item?.taxSettings?.gstPercent ??
      item?.gst?.percentage ??
      item?.gst?.taxPercentage ??
      item?.itemTax?.percentage ??
      item?.itemTax?.taxPercentage
  );
  if (taxPercent !== undefined) {
    return `GST ${taxPercent}%`;
  }

  const taxCodeList = resolveTaxCodeListLabel(
    lookup,
    item?.tax,
    item?.gst,
    item?.taxCode,
    item?.taxCodes,
    item?.taxUid,
    item?.taxUids,
    item?.taxList,
    item?.taxes,
    item?.itemTaxes,
    item?.taxSettingsList
  );
  if (taxCodeList) return taxCodeList;

  const nestedTax = resolveNestedItemTaxLabel(lookup, item);
  if (nestedTax) return nestedTax;

  const resolved = resolveOrdersSettingLabel(
    lookup,
    item?.taxId,
    item?.tax?.id,
    item?.tax?.uid,
    item?.tax?.encId,
    item?.tax?.code,
    item?.tax?.value,
    item?.taxUid,
    item?.tax?.uid,
    item?.taxCode,
    item?.taxSettingsId,
    item?.taxSettings?.id,
    item?.taxSettings?.uid,
    item?.taxSettings?.encId,
    item?.taxSettings?.code,
    item?.taxSettingsUid,
    item?.salesTaxId,
    item?.salesTaxUid,
    item?.itemTaxId,
    item?.itemTax?.id,
    item?.itemTax?.uid,
    item?.gstId,
    item?.gstUid,
    item?.gst?.id,
    item?.gst?.uid,
    item?.gst,
    item?.tax
  );
  return resolved;
}

function readTaxOptionLabel(item: any) {
  const explicit = readFirstText(item?.label, item?.name, item?.displayName, item?.taxName, item?.taxLabel);
  if (explicit) return formatTaxLabelValue(explicit);

  const percent = toOptionalNumber(item?.percentage ?? item?.taxPercentage ?? item?.taxPercent ?? item?.gstPercentage ?? item?.gstPercent ?? item?.value);
  if (percent !== undefined) {
    const taxType = readFirstText(item?.taxType, item?.type, item?.code);
    return `${taxType && !/^\d+$/.test(taxType) ? taxType : "GST"} ${percent}%`;
  }

  return readFirstText(item?.taxType, item?.value, item?.code, item?.id, item?.uid);
}

function resolveTaxCodeListLabel(lookup: Map<string, string>, ...values: unknown[]) {
  const labels: string[] = [];

  const addLabel = (value: unknown) => {
    if (value == null) return;

    if (Array.isArray(value)) {
      value.forEach(addLabel);
      return;
    }

    if (typeof value === "object") {
      const candidate: any = value;
      const label = readFirstText(
        candidate?.label,
        candidate?.name,
        candidate?.displayName,
        candidate?.taxName,
        candidate?.taxLabel,
        candidate?.gstName
      );
      if (label) {
        labels.push(formatTaxLabelValue(label));
        return;
      }

      const percent = toOptionalNumber(
        candidate?.percentage ??
          candidate?.taxPercentage ??
          candidate?.taxPercent ??
          candidate?.gstPercentage ??
          candidate?.gstPercent ??
          candidate?.value
      );
      if (percent !== undefined) {
        labels.push(`GST ${percent}%`);
        return;
      }

      const resolved = resolveTaxLookupValue(
        lookup,
        candidate?.taxCode,
        candidate?.code,
        candidate?.value,
        candidate?.id,
        candidate?.uid,
        candidate?.encId,
        candidate?.taxId,
        candidate?.taxUid
      );
      if (resolved) labels.push(resolved);
      return;
    }

    const resolved = resolveTaxLookupValue(lookup, value);
    if (resolved) labels.push(resolved);
  };

  values.forEach(addLabel);

  return Array.from(new Set(labels.filter(Boolean))).join(", ");
}

function resolveTaxLookupValue(lookup: Map<string, string>, ...values: unknown[]) {
  for (const value of values) {
    const text = readFirstText(value);
    if (!text) continue;

    const resolved = lookup.get(normalizeText(text));
    if (resolved) return resolved;

    return formatTaxLabelValue(text);
  }

  return "";
}

function resolveNestedItemTaxLabel(lookup: Map<string, string>, item: any) {
  const candidates = [
    item?.tax,
    item?.taxSettings,
    item?.gst,
    item?.itemTax,
    item?.taxInfo,
    item?.taxDetails,
    ...(Array.isArray(item?.taxList) ? item.taxList : []),
    ...(Array.isArray(item?.taxes) ? item.taxes : []),
    ...(Array.isArray(item?.itemTaxes) ? item.itemTaxes : []),
    ...(Array.isArray(item?.taxSettingsList) ? item.taxSettingsList : []),
  ].filter((candidate) => candidate && typeof candidate === "object");

  for (const candidate of candidates) {
    const label = readFirstText(
      candidate?.label,
      candidate?.name,
      candidate?.displayName,
      candidate?.taxName,
      candidate?.taxLabel,
      candidate?.gstName
    );
    if (label) return formatTaxLabelValue(label);

    const percent = toOptionalNumber(
      candidate?.percentage ??
        candidate?.taxPercentage ??
        candidate?.taxPercent ??
        candidate?.gstPercentage ??
        candidate?.gstPercent ??
        candidate?.value
    );
    if (percent !== undefined) return `GST ${percent}%`;

    const resolved = resolveOrdersSettingLabel(
      lookup,
      candidate?.id,
      candidate?.uid,
      candidate?.encId,
      candidate?.code,
      candidate?.value,
      candidate?.taxId,
      candidate?.taxUid,
      candidate?.taxCode
    );
    if (resolved !== "-") return resolved;
  }

  return "";
}

function formatTaxLabelValue(value: string) {
  const text = String(value ?? "").trim();
  if (!text) return "-";

  const numeric = toOptionalNumber(text);
  if (numeric !== undefined) return `GST ${numeric}%`;

  return text;
}

function readTrackInventoryLabel(item: any) {
  const value =
    item?.trackInventory ??
    item?.trackInventoryFlag ??
    item?.inventoryTracked ??
    item?.inventoryTracking ??
    item?.isInventoryTracked ??
    item?.isInventoryItem ??
    item?.stockAvailable ??
    item?.maintainStock;

  if (typeof value === "boolean") return value ? "Yes" : "No";
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["true", "yes", "y", "enable", "enabled", "1"].includes(normalized)) return "Yes";
  if (["false", "no", "n", "disable", "disabled", "0"].includes(normalized)) return "No";

  return "-";
}

function mapOrdersItemStatus(value: unknown) {
  if (typeof value === "boolean") return value ? "Enable" : "Disable";

  const text = readFirstText(value);
  if (!text) return "-";

  const normalized = text.toUpperCase();
  if (normalized === "ENABLED") return "Enable";
  if (normalized === "DISABLED") return "Disable";
  if (normalized === "ACTIVE") return "Enable";
  if (normalized === "INACTIVE") return "Disable";

  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function mapItemSourceDisplay(value: unknown) {
  const text = readFirstText(value);
  if (!text) return "General";

  const normalized = text.replace(/[_-]+/g, " ").trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

function formatOrdersItemDate(value: unknown) {
  const raw = readFirstText(value);
  if (!raw) return "-";

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) return raw;

  const numeric = Number(raw);
  const date = Number.isFinite(numeric) && raw.length >= 10
    ? new Date(numeric > 10_000_000_000 ? numeric : numeric * 1000)
    : new Date(raw);

  if (Number.isNaN(date.getTime())) return raw.split(",")[0] || raw;

  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function readOrdersItemImageUrl(item: any) {
  const direct = readFirstText(
    item?.imageUrl,
    item?.imageURL,
    item?.image,
    item?.s3path,
    item?.s3Path,
    item?.picture,
    item?.photo,
    item?.logo,
    item?.itemImage?.url,
    item?.itemImage?.imageUrl,
    item?.itemImage?.s3path,
    item?.itemImage?.s3Path,
    item?.item?.imageUrl
  );
  if (direct) return direct;

  const attachments = [
    ...(Array.isArray(item?.attachments) ? item.attachments : []),
    ...(Array.isArray(item?.item?.attachments) ? item.item.attachments : []),
    ...(Array.isArray(item?.spItem?.attachments) ? item.spItem.attachments : []),
    ...(Array.isArray(item?.images) ? item.images : []),
    ...(Array.isArray(item?.imageList) ? item.imageList : []),
  ];
  for (const attachment of attachments) {
    const url = readFirstText(
      attachment?.url,
      attachment?.imageUrl,
      attachment?.fileUrl,
      attachment?.s3Url,
      attachment?.s3path,
      attachment?.s3Path,
      attachment?.path
    );
    if (url) return url;
  }

  return "";
}

function readFirstText(...values: unknown[]) {
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === "object") continue;

    const text = String(value).trim();
    if (text) return text;
  }

  return "";
}

function unwrapOrdersList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.response)) return payload.response;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.list)) return payload.list;
  return [];
}

function getOptionalOrdersPayload(scopedApi: ScopedApi, path: string, params?: ApiFilter) {
  return scopedApi
    .get<any>(path, params ? { params } : undefined)
    .then((response) => response.data)
    .catch(() => null);
}

function mapOrdersCatalogs(payload: any): OrdersCatalogRow[] {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.content)
      ? payload.content
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

  return items.map((item: any, index: number) => {
    const rawStatus = String(item?.status ?? item?.catalogStatus ?? "").trim();
    const activeFlag =
      typeof item?.active === "boolean"
        ? item.active
        : typeof item?.isActive === "boolean"
          ? item.isActive
          : rawStatus.toUpperCase() === "ACTIVE";

    return {
      id: String(item?.encId ?? item?.uid ?? item?.id ?? item?.spCode ?? `catalog-${index + 1}`),
      name: String(item?.catalogName ?? item?.name ?? item?.displayName ?? "").trim() || "-",
      storeName: String(item?.store?.name ?? item?.storeName ?? "").trim() || "-",
      status: rawStatus || (activeFlag ? "Active" : "Inactive"),
      active: activeFlag,
      raw: item,
    };
  });
}

function mapInvoiceTypeStatus(item: any) {
  const rawStatus = String(item?.status ?? item?.invoiceStatus ?? "").trim();
  if (rawStatus) {
    const normalized = rawStatus.toUpperCase();
    if (normalized === "ACTIVE") return "Active";
    if (normalized === "INACTIVE") return "Inactive";
    return rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
  }

  if (typeof item?.active === "boolean") {
    return item.active ? "Active" : "Inactive";
  }

  return "-";
}

function buildCustomerDisplayName(item: any) {
  const salutation = String(
    item?.providerConsumer?.salutation ??
      item?.consumer?.salutation ??
      item?.providerConsumer?.title ??
      item?.consumer?.title ??
      ""
  ).trim();
  const firstName = String(
    item?.providerConsumer?.firstName ??
      item?.consumer?.firstName ??
      ""
  ).trim();
  const lastName = String(
    item?.providerConsumer?.lastName ??
      item?.consumer?.lastName ??
      ""
  ).trim();
  const explicitName = String(
    item?.providerConsumer?.name ??
      item?.consumer?.name ??
      item?.consumerName ??
      item?.consumer_label ??
      item?.customerName ??
      ""
  ).trim();

  const composedName = [salutation, firstName, lastName].filter(Boolean).join(" ").trim();
  return composedName || explicitName || "Customer";
}

function mapOrderSourceDisplay(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "PROVIDER_CONSUMER") {
    return "Customer";
  }
  if (normalized === "PARTNER") {
    return "Dealer";
  }
  return "Customer";
}

function mapOrderTypeDisplay(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "ONLINE_SELF" || normalized === "ONLINE") {
    return "Online";
  }
  if (normalized === "WALK_IN" || normalized === "WALKIN") {
    return "WalkIn";
  }
  return "";
}

function buildInvoiceCustomerDisplayName(item: any) {
  const salutation = String(
    item?.providerConsumer?.salutation ??
      item?.consumer?.salutation ??
      item?.customer?.salutation ??
      ""
  ).trim();
  const firstName = String(
    item?.providerConsumer?.firstName ??
      item?.consumer?.firstName ??
      item?.customer?.firstName ??
      ""
  ).trim();
  const lastName = String(
    item?.providerConsumer?.lastName ??
      item?.consumer?.lastName ??
      item?.customer?.lastName ??
      ""
  ).trim();
  const explicitName = String(
    item?.customerName ??
      item?.customer ??
      item?.consumerName ??
      item?.consumer?.name ??
      item?.providerConsumer?.name ??
      item?.customer?.name ??
      ""
  ).trim();
  const composedName = [salutation, firstName, lastName].filter(Boolean).join(" ").trim();

  return composedName || explicitName || "Customer";
}

function mapInvoiceStatusDisplay(value: unknown) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "-";

  const label = normalized
    .replace(/_+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());

  return label;
}

function mapOrderStatusDisplay(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "ORDER_CONFIRMED" || normalized === "AWAITING FULFILMENT" || normalized === "PACKED") {
    return "Confirmed";
  }
  if (normalized === "ORDER_COMPLETED" || normalized === "DELIVERED") {
    return "Completed";
  }
  if (normalized === "ORDER_CANCELED") {
    return "Cancelled";
  }
  if (normalized === "ORDER_DISCARDED") {
    return "Discarded";
  }
  if (normalized === "ORDER_DRAFT") {
    return "Draft";
  }
  if (normalized === "DISPATCHED") {
    return "Processing";
  }
  return String(value ?? "").trim();
}

function mapPaymentStatusDisplay(value: unknown) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "";
  }

  const paymentStatusMap: Record<string, string> = {
    NotPaid: "Not Paid",
    PartiallyPaid: "Partially Paid",
    FullyPaid: "Fully Paid",
    Refund: "Refund",
    PartiallyRefunded: "Partially Refunded",
    FullyRefunded: "Fully Refunded",
  };

  return paymentStatusMap[normalized] ?? normalized;
}

function mapSalesOrderDetail(payload: any): OrdersOrderDetail | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const baseRow = mapSalesOrders([payload])[0];
  const resolvedInvoiceUid = readInvoiceUid(payload, baseRow);
  const items = readSalesOrderItems(payload);
  const subtotal = toNumber(payload?.subtotal ?? payload?.subTotal ?? payload?.sub_total ?? payload?.netTotal ?? items.reduce((sum, item) => sum + item.total, 0));
  const taxTotal = toNumber(payload?.taxTotal ?? payload?.taxAmount ?? payload?.taxamount ?? payload?.gstAmount ?? payload?.gst ?? 0);
  const cessTotal = toNumber(payload?.cessTotal ?? payload?.cessamount ?? 0);
  const taxAmount = Math.max(0, taxTotal - cessTotal);
  const discountLines = readDiscountLines(payload);
  const couponLines = readCouponLines(payload);
  const computedDiscountTotal = discountLines.reduce((sum, line) => sum + line.amount, 0);
  const computedCouponTotal = couponLines.reduce((sum, line) => sum + line.amount, 0);
  const discountAmount = Math.max(toNumber(payload?.discountAmount ?? payload?.discount ?? 0), computedDiscountTotal);
  const couponAmount = Math.max(toNumber(payload?.couponAmount ?? payload?.couponDiscount ?? 0), computedCouponTotal);
  const netTotal = toNumber(payload?.netRate ?? payload?.netTotal ?? payload?.orderAmount ?? payload?.totalAmount ?? subtotal + taxAmount - discountAmount - couponAmount);
  const amountPaid = toNumber(payload?.amountPaid ?? payload?.paidAmount ?? payload?.amountReceived ?? netTotal);
  const amountDue = toNumber(payload?.amountDue ?? payload?.balanceAmount ?? Math.max(netTotal - amountPaid, 0));
  const shippingAddress = readAddress(payload?.shippingAddress ?? payload?.shippingAddressDto ?? payload?.consumerAddress);
  const billingAddress = readAddress(payload?.billingAddress ?? payload?.billingAddressDto ?? payload?.consumerAddress);
  const notesToCustomer = String(payload?.notesForCustomer ?? payload?.notesToCustomer ?? payload?.customerNotes ?? "").trim();
  const notesFromStaff = String(payload?.notes ?? payload?.doctorNotes ?? payload?.notesFromStaff ?? "").trim();

  return {
    ...baseRow,
    orderNumber: String(payload?.orderNum ?? payload?.orderNumber ?? payload?.displayId ?? baseRow.id),
    invoiceUid: resolvedInvoiceUid || undefined,
    raw: payload,
    paymentStatus: readPaymentStatus(payload, amountDue),
    store: String(payload?.storeName ?? payload?.store?.name ?? payload?.departmentName ?? "Store"),
    labels: readLabelNames(payload?.labels ?? payload?.labelList ?? payload?.label),
    assignees: readStringArray(payload?.assignees ?? payload?.assignedUsers ?? payload?.users),
    items,
    subtotal,
    taxAmount,
    discountAmount,
    couponAmount,
    discountLines: discountLines.length ? discountLines : undefined,
    couponLines: couponLines.length ? couponLines : undefined,
    netTotal,
    amountPaid,
    amountDue,
    customerId: String(
      payload?.providerConsumer?.id ??
      payload?.providerConsumer?.uid ??
      payload?.consumer?.id ??
      payload?.consumerId ??
      ""
    ),
    shippingAddress,
    billingAddress,
    gstNumber: String(payload?.gstNumber ?? payload?.business?.gstNumber ?? payload?.taxRegistrationNumber ?? ""),
    businessName: String(payload?.businessName ?? payload?.business?.name ?? ""),
    notesToCustomer: notesToCustomer || undefined,
    notesFromStaff: notesFromStaff || undefined,
  };
}

function readInvoiceUid(payload: any, baseRow: OrdersOrderRow) {
  const candidate = String(
    payload?.invoiceUid ??
      payload?.invoiceUUID ??
      payload?.invUid ??
      payload?.invoice?.uid ??
      payload?.invoice?.invoiceUid ??
      payload?.bill?.uid ??
      ""
  ).trim();

  if (candidate) {
    return ensureInvoiceUid(candidate);
  }

  // Fallback: derive from the order uid (legacy invoice uses `<uuid>_soinv`).
  return baseRow?.id ? ensureInvoiceUid(baseRow.id) : "";
}

function readSalesOrderItems(payload: any): OrdersOrderDetailLineItem[] {
  const rawItems = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.itemList)
      ? payload.itemList
      : Array.isArray(payload?.itemDtoList)
        ? payload.itemDtoList
      : Array.isArray(payload?.orderItems)
        ? payload.orderItems
        : Array.isArray(payload?.cartItems)
          ? payload.cartItems
          : [];

  return rawItems.map((item: any, index: number) => {
    const quantity = Math.max(0, toNumber(item?.orderQuantity ?? item?.quantity ?? item?.qty ?? item?.count ?? 0));
    const rate = toNumber(item?.price ?? item?.itemAmount ?? item?.rate ?? item?.itemPrice ?? item?.netRate ?? 0);
    const total = toNumber(item?.total ?? item?.amount ?? item?.netTotal ?? rate * quantity);
    const imageUrl = readAttachmentUrl(item?.attachments) ?? readAttachmentUrl(item?.spItem?.attachments) ?? undefined;

    return {
      id: String(item?.uid ?? item?.id ?? `item-${index + 1}`),
      name: String(
        item?.spItem?.name ??
        item?.parentItemName ??
        item?.itemName ??
        item?.name ??
        item?.displayName ??
        item?.item?.name ??
        item?.catalogItem?.name ??
        `Item ${index + 1}`
      ),
      batch: String(item?.catalogItemBatch?.batch ?? item?.batchName ?? item?.batchNo ?? item?.batchNumber ?? item?.batch ?? "-"),
      imageUrl,
      rate,
      quantity,
      total,
    };
  });
}

function readAttachmentUrl(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  for (let index = value.length - 1; index >= 0; index -= 1) {
    const entry = value[index];
    if (typeof entry === "string" && entry.trim()) {
      return entry.trim();
    }
    if (entry && typeof entry === "object") {
      const s3path = String((entry as any).s3path ?? (entry as any).url ?? "").trim();
      if (s3path) {
        return s3path;
      }
    }
  }

  return null;
}

function readLabelNames(value: unknown) {
  if (Array.isArray(value)) {
    return readStringArray(value);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).filter(Boolean);
  }

  return [];
}

function readDiscountLines(payload: any): Array<{ name: string; amount: number }> {
  const raw = Array.isArray(payload?.discounts) ? payload.discounts : [];
  return raw
    .map((entry: any, index: number) => {
      const name = String(entry?.name ?? entry?.label ?? `Discount ${index + 1}`).trim();
      const amount = Math.abs(toNumber(entry?.discountValue ?? entry?.value ?? entry?.amount ?? entry?.discount ?? 0));
      return { name, amount };
    })
    .filter((line: { name: string; amount: number }) => line.name && line.amount > 0);
}

function mapBillAdjustmentOptions(payload: any, kind: OrdersBillAdjustmentKind): OrdersBillAdjustmentOption[] {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.content)
        ? payload.content
        : Array.isArray(payload?.items)
          ? payload.items
          : [];

  return items
    .map((item: any, index: number) => {
      const id = String(
        item?.uid ??
        item?.id ??
        item?.couponId ??
        item?.discountId ??
        item?.couponCode ??
        item?.code ??
        item?.name ??
        `adjustment-${kind}-${index + 1}`
      ).trim();
      const label = String(
        item?.name ??
        item?.label ??
        item?.discountName ??
        item?.couponName ??
        item?.couponCode ??
        item?.code ??
        ""
      ).trim();
      const code = String(item?.couponCode ?? item?.code ?? "").trim() || undefined;
      const amount = toOptionalNumber(item?.discountValue ?? item?.discount ?? item?.value ?? item?.amount);

      if (!id || !label) {
        return null;
      }

      return {
        id,
        label,
        code,
        amount,
        raw: item,
      };
    })
    .filter((item: OrdersBillAdjustmentOption | null): item is OrdersBillAdjustmentOption => Boolean(item));
}

function isMatchingAdjustment(item: unknown, selected: OrdersBillAdjustmentOption, kind: OrdersBillAdjustmentKind) {
  if (!item || typeof item !== "object") {
    return false;
  }

  const entry = item as Record<string, unknown>;
  const selectedId = String(selected.id ?? "").trim();
  const selectedCode = String(selected.code ?? "").trim().toLowerCase();

  const entryIds = [
    entry.id,
    entry.uid,
    entry.discountId,
    entry.couponId,
  ].map((value) => String(value ?? "").trim()).filter(Boolean);

  if (selectedId && entryIds.includes(selectedId)) {
    return true;
  }

  if (kind === "coupon" && selectedCode) {
    const entryCodes = [entry.code, entry.couponCode]
      .map((value) => String(value ?? "").trim().toLowerCase())
      .filter(Boolean);
    return entryCodes.includes(selectedCode);
  }

  return false;
}

function readCouponLines(payload: any): Array<{ code: string; amount: number }> {
  const raw = Array.isArray(payload?.providerCoupons) ? payload.providerCoupons : [];
  return raw
    .map((entry: any, index: number) => {
      const code = String(entry?.couponCode ?? entry?.code ?? entry?.name ?? `Coupon ${index + 1}`).trim();
      const amount = Math.abs(toNumber(entry?.discount ?? entry?.discountValue ?? entry?.value ?? entry?.amount ?? 0));
      return { code, amount };
    })
    .filter((line: { code: string; amount: number }) => line.code && line.amount > 0);
}

function readAddress(payload: any): OrdersOrderDetailAddress | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return {
    name: String(payload?.name ?? payload?.firstName ?? payload?.fullName ?? ""),
    line1: String(payload?.line1 ?? payload?.addressLine1 ?? payload?.address ?? ""),
    line2: String(payload?.line2 ?? payload?.addressLine2 ?? payload?.landMark ?? ""),
    city: String(payload?.city ?? payload?.district ?? ""),
    state: String(payload?.state ?? ""),
    country: String(payload?.country ?? ""),
    postalCode: readPostalCode(payload?.postalCode ?? payload?.pinCode ?? payload?.zip),
    email: String(payload?.email ?? ""),
    phone: readPhone(payload?.phone ?? payload?.mobileNo ?? payload?.mobile),
  };
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (item && typeof item === "object") {
        const firstName = String((item as any).firstName ?? "").trim();
        const lastName = String((item as any).lastName ?? "").trim();
        const combinedName = `${firstName} ${lastName}`.trim();
        if (combinedName) {
          return combinedName;
        }

        return String(
          (item as any).label ??
            (item as any).name ??
            (item as any).userName ??
            (item as any).displayName ??
            ""
        ).trim();
      }

      return "";
    })
    .filter(Boolean);
}

function readPostalCode(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    const candidate =
      (value as any).postalCode ??
      (value as any).pincode ??
      (value as any).pinCode ??
      (value as any).zip ??
      (value as any).code;
    return readPostalCode(candidate);
  }

  return "";
}

function readPhone(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    const countryCode = String((value as any).countryCode ?? (value as any).cc ?? "").trim();
    const rawNumber =
      (value as any).number ??
      (value as any).phoneNo ??
      (value as any).phone ??
      (value as any).mobileNo ??
      (value as any).mobile ??
      (value as any).value ??
      "";
    const number = readPhoneNumber(rawNumber);
    return `${countryCode}${number}`.trim();
  }

  return "";
}

function readPhoneNumber(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  if (typeof value === "object") {
    const candidate =
      (value as any).number ??
      (value as any).phoneNo ??
      (value as any).phone ??
      (value as any).mobileNo ??
      (value as any).mobile ??
      (value as any).value ??
      "";
    return readPhoneNumber(candidate);
  }

  return "";
}

function readPaymentStatus(payload: any, amountDue: number) {
  const paymentStatus = String(payload?.paymentStatus ?? payload?.payment?.status ?? "").trim();
  if (paymentStatus) {
    return paymentStatus;
  }

  if (amountDue <= 0) {
    return "Fully Paid";
  }

  if (amountDue > 0 && amountDue < toNumber(payload?.netTotal ?? payload?.orderAmount ?? payload?.totalAmount ?? 0)) {
    return "Partially Paid";
  }

  return "Not Paid";
}
