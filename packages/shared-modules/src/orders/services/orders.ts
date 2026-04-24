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

export function buildOrdersInvoiceHref(basePath: string, invoiceUid: string, params?: Record<string, string>) {
  const resolvedInvoiceUid = ensureInvoiceUid(invoiceUid);
  const invoicePath = joinPath(basePath, `orders/invoice/${encodeURIComponent(resolvedInvoiceUid)}`);
  const query = new URLSearchParams({ from: "details", invUid: resolvedInvoiceUid, ...(params ?? {}) });
  return `${invoicePath}?${query.toString()}`;
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
  const catalogRoot = product === "health" ? joinPath(basePath, "pharmacy/catalogs") : joinPath(basePath, "catalog");
  const settingsRoot = joinPath(ordersRoot, "settings");

  return [
    { label: "Create Order", route: joinPath(ordersRoot, "create"), note: "Start a new sales order workflow", accent: "indigo", type: "route", imageKey: "orders", enabled: capabilities.canCreateOrder },
    { label: "Orders", route: joinPath(ordersRoot, "orders-grid"), note: "Track open and delivered orders", accent: "emerald", type: "route", imageKey: "rx-order", enabled: capabilities.canViewOrders },
    { label: "Requests", route: joinPath(ordersRoot, "rx-requests-grid"), note: "Convert prescription requests to orders", accent: "amber", type: "route", imageKey: "rx-requests", enabled: capabilities.canViewRequests },
    { label: "Invoice Types", route: settingsRoot, note: "Manage invoice type configuration", accent: "slate", type: "route", imageKey: "invoice-types", enabled: capabilities.canViewInvoices },
    { label: "Catalogs", route: catalogRoot, note: "Maintain pharmacy and product catalogs", accent: "rose", type: "route", imageKey: "socatalog", enabled: capabilities.canViewCatalogs },
    { label: "Stores", route: settingsRoot, note: "Manage store-facing order settings", accent: "slate", type: "externalRoute", imageKey: "store", enabled: capabilities.canViewStores },
    { label: "Items", route: inventoryRoot, note: "Review item inventory and stock levels", accent: "slate", type: "route", imageKey: "items", enabled: capabilities.canViewItems },
    { label: "Invoices", route: settingsRoot, note: "Review invoice-related workflows", accent: "indigo", type: "route", imageKey: "invoices", enabled: capabilities.canViewInvoices },
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
  const [pagePayload, countPayload] = await Promise.all([
    withTimeout(
      getSalesOrders(scopedApi, storeEncId, {
        from: offset,
        count: options.pageSize,
      }).catch(() => []),
      [],
      "sales orders page"
    ),
    withTimeout(
      getSalesOrdersCount(scopedApi, storeEncId).catch(() => null),
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
  pagination?: { from: number; count: number }
) {
  const from = pagination?.from ?? 0;
  const count = pagination?.count ?? 10;
  const cacheKey = `${storeEncId}:${from}:${count}`;

  return cachePromise(salesOrdersCache, cacheKey, SALES_ORDERS_CACHE_TTL_MS, () =>
    scopedApi
      .get<any>("provider/sorder", {
        params: {
          from,
          count,
          "storeEncId-eq": storeEncId,
          "orderStatus-neq": "ORDER_PREPAYMENT_PENDING,FAILED_ORDER",
          "orderCategory-eq": "SALES_ORDER",
        } satisfies ApiFilter,
      })
      .then((response) => response.data)
  );
}

async function getSalesOrdersCount(scopedApi: ScopedApi, storeEncId: string) {
  return cachePromise(salesOrdersCountCache, storeEncId, SALES_ORDERS_COUNT_CACHE_TTL_MS, () =>
    scopedApi
      .get<any>("provider/sorder/count", {
        params: {
          "storeEncId-eq": storeEncId,
          "orderStatus-neq": "ORDER_PREPAYMENT_PENDING,FAILED_ORDER",
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

  return items.map((item: any, index: number) => ({
    id: String(item?.uid ?? item?.id ?? item?.encId ?? `order-${index + 1}`),
    customer: String(
      item?.providerConsumer?.firstName ||
      item?.providerConsumer?.name ||
      item?.consumer?.firstName ||
      item?.consumerName ||
      item?.consumer_label ||
      item?.customerName ||
      "Customer"
    ),
    source: String(item?.orderSource ?? item?.source ?? item?.channel ?? "Customer"),
    channel: String(item?.orderType ?? item?.channel ?? "WalkIn"),
    itemCount: Math.max(
      0,
      Math.round(
        toNumber(item?.itemCount ?? item?.item_count ?? item?.totalItems ?? item?.itemsCount)
      )
    ),
    totalAmount: toNumber(item?.netTotal ?? item?.orderAmount ?? item?.amountDue ?? item?.totalAmount ?? item?.amount),
    status: String(item?.orderStatus ?? item?.status ?? "Draft"),
    placedOn: String(item?.createdDate ?? item?.orderDate ?? item?.date ?? ""),
  }));
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
