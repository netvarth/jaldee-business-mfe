import { httpClient } from "./httpClient";

type ApiFilter = Record<string, unknown>;
type ApiResponse<T> = Promise<{ data: T }>;

function isTenantFinanceEndpoint(url: string) {
  return url.includes("/finance-service/v1/api/tenant/")
    || url.includes("/base-service/v1/api/tenant/")
    || url.includes("/v1/api/tenant/");
}

function withTenantConfig(config?: { params?: ApiFilter }) {
  return {
    ...(config ?? {}),
    _skipLocationParam: true,
  };
}

function get<T>(url: string, params?: ApiFilter): ApiResponse<T> {
  const config = params ? { params } : undefined;
  return httpClient.get<T>(url, isTenantFinanceEndpoint(url) ? withTenantConfig(config) : config);
}

function post<T>(url: string, data?: unknown): ApiResponse<T> {
  return httpClient.post<T>(url, data, isTenantFinanceEndpoint(url) ? withTenantConfig() : undefined);
}

function put<T>(url: string, data?: unknown, params?: ApiFilter): ApiResponse<T> {
  const config = params ? { params } : undefined;
  return httpClient.put<T>(url, data, isTenantFinanceEndpoint(url) ? withTenantConfig(config) : config);
}

function del<T>(url: string, params?: ApiFilter): ApiResponse<T> {
  const config = params ? { params } : undefined;
  return httpClient.delete<T>(url, isTenantFinanceEndpoint(url) ? withTenantConfig(config) : config);
}

function buildCountPath(basePath: string) {
  return `${basePath}/count`;
}

// The MS @ModelAttribute filters use plain field names + Spring Pageable, while the
// legacy UI sends `from`/`count`, `sort_*`, and `<field>-eq/-like/...` keys. Translate:
//  - from/count            -> page/size
//  - locationId(-eq)       -> locationUid
//  - <field>-<matchmode>   -> <field>   (suffix stripped; MS binds the base field)
//  - sort_* keys           -> dropped   (MS sort convention differs)
function toMsQuery(filter: ApiFilter = {}): ApiFilter {
  const out: Record<string, unknown> = {};
  let from: unknown;
  let count: unknown;
  for (const [rawKey, value] of Object.entries(filter as Record<string, unknown>)) {
    if (value === undefined || value === null || value === "") continue;
    if (rawKey === "from") { from = value; continue; }
    if (rawKey === "count") { count = value; continue; }
    if (rawKey === "page" || rawKey === "size") { out[rawKey] = value; continue; }
    if (rawKey.startsWith("sort_")) continue;
    let key = rawKey.replace(/-(eq|neq|like|startWith|endWith|gt|lt|gte|lte)$/i, "");
    if (key === "locationId") key = "locationUid";
    // MS category/status/consumer filters expose a single `search` field for
    // name-contains rather than a per-column name filter.
    if (key === "name" || key === "categoryName" || key === "statusName") key = "search";
    out[key] = value;
  }
  const size = count !== undefined ? Number(count) : undefined;
  if (size !== undefined && !Number.isNaN(size)) {
    out.size = size;
    if (from !== undefined) {
      const fromNum = Number(from);
      out.page = size > 0 && !Number.isNaN(fromNum) ? Math.floor(fromNum / size) : 0;
    }
  } else if (from !== undefined) {
    const fromNum = Number(from);
    out.page = Number.isNaN(fromNum) ? 0 : fromNum;
  }
  return out;
}

function createCrudApi(basePath: string) {
  return {
    create<T = unknown>(data: unknown) {
      return post<T>(basePath, data);
    },
    update<T = unknown>(id: string, data: unknown) {
      return put<T>(`${basePath}/${id}`, data);
    },
    list<T = unknown>(filter: ApiFilter = {}) {
      return get<T>(basePath, filter);
    },
    count<T = number>(filter: ApiFilter = {}) {
      return get<T>(buildCountPath(basePath), filter);
    },
    detail<T = unknown>(id: string) {
      return get<T>(`${basePath}/${id}`);
    },
    changeStatus<T = unknown>(id: string, status: string) {
      return put<T>(`${basePath}/${id}/${status}`);
    },
  };
}

function buildTenantApiUrl(path: string) {
  return new URL(path, window.location.origin).toString();
}

const TENANT_CATEGORY_ENDPOINT = buildTenantApiUrl("/finance-service/v1/api/tenant/category");
const TENANT_CATEGORY_SEARCH_ENDPOINT = `${TENANT_CATEGORY_ENDPOINT}/search`;
const TENANT_STATUS_ENDPOINT = buildTenantApiUrl("/finance-service/v1/api/tenant/status");
const TENANT_STATUS_SEARCH_ENDPOINT = `${TENANT_STATUS_ENDPOINT}/search`;
const TENANT_ITEM_ENDPOINT = buildTenantApiUrl("/finance-service/v1/api/tenant/item");
const TENANT_PAYMENTS_IN_ENDPOINT = buildTenantApiUrl("/finance-service/v1/api/tenant/payments-in");
const TENANT_PAYMENTS_OUT_ENDPOINT = buildTenantApiUrl("/finance-service/v1/api/tenant/payments-out");
const TENANT_PAYMENTS_IN_SEARCH_ENDPOINT = `${TENANT_PAYMENTS_IN_ENDPOINT}/search`;
const TENANT_PAYMENTS_IN_COUNT_ENDPOINT = `${TENANT_PAYMENTS_IN_ENDPOINT}/count`;
const TENANT_PAYMENTS_OUT_SEARCH_ENDPOINT = `${TENANT_PAYMENTS_OUT_ENDPOINT}/search`;
const TENANT_PAYMENTS_OUT_CASH_RESERVE_ENDPOINT = `${TENANT_PAYMENTS_OUT_ENDPOINT}/cashReserve`;
const TENANT_PAYMENTS_OUT_CASH_RESERVE_SEARCH_ENDPOINT = `${TENANT_PAYMENTS_OUT_CASH_RESERVE_ENDPOINT}/search`;
const TENANT_PAYMENTS_IN_CASH_RESERVE_ENDPOINT = `${TENANT_PAYMENTS_IN_ENDPOINT}/cashReserve`;
const TENANT_PAYMENTS_IN_CASH_RESERVE_SEARCH_ENDPOINT = `${TENANT_PAYMENTS_IN_CASH_RESERVE_ENDPOINT}/search`;
const TENANT_PAYMENTS_IN_CASH_RESERVE_COUNT_ENDPOINT = `${TENANT_PAYMENTS_IN_CASH_RESERVE_ENDPOINT}/count`;

const TENANT_INVOICE_ENDPOINT = buildTenantApiUrl("/finance-service/v1/api/tenant/invoice");
const TENANT_INVOICE_SEARCH_ENDPOINT = `${TENANT_INVOICE_ENDPOINT}/search`;
const TENANT_INVOICE_TEMPLATE_ENDPOINT = buildTenantApiUrl("/finance-service/v1/api/tenant/invoice/templates");
const TENANT_INVOICE_PAYMENT_ENDPOINT = buildTenantApiUrl("/finance-service/v1/api/tenant/invoice/payment");
const TENANT_SEQUENCE_TEMPLATE_ENDPOINT = buildTenantApiUrl("/finance-service/v1/api/tenant/sequence/template");
const TENANT_SEQUENCE_TEMPLATE_SEARCH_ENDPOINT = `${TENANT_SEQUENCE_TEMPLATE_ENDPOINT}/search`;
const TENANT_SEQUENCE_SETTINGS_ENDPOINT = buildTenantApiUrl("/finance-service/v1/api/tenant/sequence/settings");
const TENANT_SEQUENCE_SETTINGS_SEARCH_ENDPOINT = `${TENANT_SEQUENCE_SETTINGS_ENDPOINT}/search`;

const TENANT_EXPENSES_ENDPOINT = buildTenantApiUrl("/finance-service/v1/api/tenant/expenses");
const TENANT_EXPENSES_SEARCH_ENDPOINT = `${TENANT_EXPENSES_ENDPOINT}/search`;
const TENANT_CASH_BALANCE_ENDPOINT = buildTenantApiUrl("/finance-service/v1/api/tenant/payment/cash-balance");
const TENANT_AUDIT_LOG_ENDPOINT = buildTenantApiUrl("/finance-service/v1/api/tenant/audit-logs");
const TENANT_SETTINGS_ENDPOINT = buildTenantApiUrl("/finance-service/v1/api/tenant/settings");
const TENANT_CONSUMER_ENDPOINT = buildTenantApiUrl("/finance-service/v1/api/tenant/consumer");
const TENANT_CONSUMER_SEARCH_ENDPOINT = `${TENANT_CONSUMER_ENDPOINT}/search`;
const TENANT_DISCOUNTS_ENDPOINT = buildTenantApiUrl("/finance-service/v1/api/tenant/discounts");
const TENANT_DISCOUNTS_SEARCH_ENDPOINT = `${TENANT_DISCOUNTS_ENDPOINT}/search`;
const TENANT_COUPONS_ENDPOINT = buildTenantApiUrl("/finance-service/v1/api/tenant/coupons");
const TENANT_COUPONS_SEARCH_ENDPOINT = `${TENANT_COUPONS_ENDPOINT}/search`;
const TENANT_LOCATIONS_ENDPOINT = buildTenantApiUrl("/base-service/v1/api/tenant/locations");

export function sanitizeFinancePayload<T extends Record<string, unknown>>(data: T) {
  const sanitized = { ...data };
  Object.keys(sanitized).forEach((key) => {
    const value = sanitized[key];
    if (value === null || value === undefined || value === "") {
      delete sanitized[key];
    }
  });
  return sanitized;
}

export function setFiltersFromPrimeTable(
  event: {
    first?: number;
    rows?: number;
    filters?: Record<string, { value: unknown; matchMode?: string }>;
    sortField?: string;
    sortOrder?: 1 | -1;
  },
  formatDate?: (date: Date) => string
) {
  const apiFilter: Record<string, unknown> = {
    from: event.first ?? 0,
    count: event.rows ?? 10,
  };

  if (event.filters) {
    Object.entries(event.filters).forEach(([key, filter]) => {
      if (filter.value == null) return;

      let suffix = "";
      let value = filter.value;

      switch (filter.matchMode) {
        case "startsWith":
          suffix = "startWith";
          break;
        case "contains":
          suffix = "like";
          break;
        case "endsWith":
          suffix = "endWith";
          break;
        case "equals":
          suffix = "eq";
          break;
        case "notEquals":
          suffix = "neq";
          break;
        case "dateIs":
          suffix = "eq";
          value = formatDate ? formatDate(new Date(value as string)) : value;
          break;
        case "dateIsNot":
          suffix = "neq";
          value = formatDate ? formatDate(new Date(value as string)) : value;
          break;
        default:
          suffix = "";
      }

      if (suffix) {
        apiFilter[`${key}-${suffix}`] = value;
      }
    });
  }

  if (event.sortField && event.sortOrder) {
    apiFilter[`sort_${event.sortField}`] = event.sortOrder === 1 ? "asc" : "dsc";
  }

  return apiFilter;
}

const vendors = createCrudApi("provider/vendor");
const expenses = createCrudApi(TENANT_EXPENSES_ENDPOINT);
const payables = createCrudApi(TENANT_PAYMENTS_OUT_ENDPOINT);
const revenue = createCrudApi(TENANT_PAYMENTS_IN_ENDPOINT);
const categories = createCrudApi(TENANT_CATEGORY_ENDPOINT);
const statuses = createCrudApi(TENANT_STATUS_ENDPOINT);
const invoices = createCrudApi(TENANT_INVOICE_ENDPOINT);
const invoiceTemplates = createCrudApi(TENANT_INVOICE_TEMPLATE_ENDPOINT);

export const financeApi = {
  settings: {
    provider(filter: ApiFilter = {}) {
      return get(TENANT_SETTINGS_ENDPOINT, filter);
    },
    expenseAutoPayout(status: string) {
      return put(`${TENANT_SETTINGS_ENDPOINT}/auto-payout-on-expense/${status}`);
    },
    expenseFeature(status: "Enabled" | "Disabled") {
      return put(`${TENANT_SETTINGS_ENDPOINT}/expense/${status}`);
    },
    invoiceFeature(status: "Enabled" | "Disabled") {
      return put(`${TENANT_SETTINGS_ENDPOINT}/invoice/${status}`);
    },
    dashboardActions<T = unknown>(data: unknown) {
      return post<T>("provider/styleconfig/styletype/FinanceStyleConfig", data);
    },
  },

  vendors: {
    ...vendors,
    uploadPhoto<T = unknown>(vendorId: string, data: unknown) {
      return put<T>(`provider/jp/finance/vendor/${vendorId}/attachments`, data);
    },
    removePhoto<T = unknown>(vendorId: string, data: unknown) {
      return put<T>(`provider/jp/finance/vendor/${vendorId}/attachments`, data);
    },
  },

  categories: {
    ...categories,
    create<T = unknown>(data: unknown) {
      return post<T>(TENANT_CATEGORY_ENDPOINT, data);
    },
    detail<T = unknown>(id: string) {
      return get<T>(`${TENANT_CATEGORY_ENDPOINT}/${id}`);
    },
    update<T = unknown>(id: string, data: unknown) {
      return put<T>(`${TENANT_CATEGORY_ENDPOINT}/${id}`, data);
    },
    getDefaultByType<T = unknown>(categoryType: string) {
      return get<T>(`${TENANT_CATEGORY_ENDPOINT}/${categoryType}/default`);
    },
    setDefaultByType<T = unknown>(id: string, categoryType: string) {
      return put<T>(`${TENANT_CATEGORY_ENDPOINT}/${id}/${categoryType}/default`);
    },
    updateStatus<T = unknown>(id: string, status: string) {
      return put<T>(`${TENANT_CATEGORY_ENDPOINT}/${id}/${status}`);
    },
    uploadDocument<T = unknown>(uid: string, data: unknown) {
      return post<T>(`${TENANT_CATEGORY_ENDPOINT}/${uid}/document`, data);
    },
    uploadDocuments<T = unknown>(uid: string, data: unknown) {
      return post<T>(`${TENANT_CATEGORY_ENDPOINT}/${uid}/documents`, data);
    },
    search<T = unknown>(filter: ApiFilter = {}) {
      return post<T>(TENANT_CATEGORY_SEARCH_ENDPOINT, filter);
    },
    byType<T = unknown>(type: string, filter: ApiFilter = {}) {
      return get<T>(`${TENANT_CATEGORY_ENDPOINT}/type/${type}`, filter);
    },
    byFilter<T = unknown>(filter: ApiFilter = {}) {
      return get<T>(TENANT_CATEGORY_ENDPOINT, toMsQuery(filter));
    },
    countByType<T = number>(categoryType: string, filter: ApiFilter = {}) {
      return get<T>(`${TENANT_CATEGORY_ENDPOINT}/count`, {
        ...filter,
        "categoryType-eq": categoryType,
      });
    },
    expenseCategories<T = unknown>(filter: ApiFilter = {}) {
      return get<T>(TENANT_CATEGORY_ENDPOINT, {
        ...filter,
        "categoryType-eq": "Expense",
      });
    },
    payableCategories<T = unknown>(filter: ApiFilter = {}) {
      return get<T>(TENANT_CATEGORY_ENDPOINT, {
        ...filter,
        "categoryType-eq": "PaymentsOut",
      });
    },
  },

  statuses: {
    ...statuses,
    search<T = unknown>(filter: ApiFilter = {}) {
      return post<T>(TENANT_STATUS_SEARCH_ENDPOINT, filter);
    },
    byType<T = unknown>(type: string, filter: ApiFilter = {}) {
      return get<T>(`${TENANT_STATUS_ENDPOINT}/type/${type}`, filter);
    },
    byFilter<T = unknown>(filter: ApiFilter = {}) {
      return get<T>(TENANT_STATUS_ENDPOINT, toMsQuery(filter));
    },
    countByType<T = number>(categoryType: string, filter: ApiFilter = {}) {
      return get<T>(`${TENANT_STATUS_ENDPOINT}/count`, {
        ...filter,
        "categoryType-eq": categoryType,
      });
    },
    enable<T = unknown>(id: string, status: string) {
      return put<T>(`${TENANT_STATUS_ENDPOINT}/${id}/${status}`);
    },
    disable<T = unknown>(id: string, status: string) {
      return put<T>(`${TENANT_STATUS_ENDPOINT}/${id}/${status}`);
    },
  },

  expenses: {
    ...expenses,
    // MS ExpenseController pages via ExpenseFilter.page/size, not from/count.
    list<T = unknown>(filter: ApiFilter = {}) {
      return post<T>(TENANT_EXPENSES_SEARCH_ENDPOINT, toMsQuery(filter));
    },
    createPayout<T = unknown>(data: unknown) {
      return post<T>(TENANT_PAYMENTS_OUT_ENDPOINT, data);
    },
    listByCategory<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/jp/finance/analytics/categorywise/comparison", filter);
    },
  },

  payables: {
    ...payables,
    create<T = unknown>(data: unknown) {
      return post<T>(TENANT_PAYMENTS_OUT_ENDPOINT, data);
    },
    list<T = unknown>(filter: ApiFilter = {}) {
      return post<T>(TENANT_PAYMENTS_OUT_SEARCH_ENDPOINT, toMsQuery(filter));
    },
    detail<T = unknown>(uid: string) {
      return get<T>(`${TENANT_PAYMENTS_OUT_ENDPOINT}/${uid}`);
    },
    update<T = unknown>(uid: string, data: unknown) {
      return put<T>(`${TENANT_PAYMENTS_OUT_ENDPOINT}/${uid}`, data);
    },
    updateStatus<T = unknown>(uid: string, statusId: string) {
      return put<T>(`${TENANT_PAYMENTS_OUT_ENDPOINT}/${uid}/status/${statusId}`);
    },
    createCashReserve<T = unknown>(data: unknown) {
      return post<T>(TENANT_PAYMENTS_OUT_CASH_RESERVE_ENDPOINT, data);
    },
    cashReserveDetail<T = unknown>(uid: string) {
      return get<T>(`${TENANT_PAYMENTS_OUT_CASH_RESERVE_ENDPOINT}/${uid}`);
    },
    updateCashReserve<T = unknown>(uid: string, data: unknown) {
      return put<T>(`${TENANT_PAYMENTS_OUT_CASH_RESERVE_ENDPOINT}/${uid}`, data);
    },
    updateCashReserveStatus<T = unknown>(uid: string, statusId: string) {
      return put<T>(`${TENANT_PAYMENTS_OUT_CASH_RESERVE_ENDPOINT}/${uid}/status/${statusId}`);
    },
    searchCashReserve<T = unknown>(filter: ApiFilter = {}) {
      return post<T>(TENANT_PAYMENTS_OUT_CASH_RESERVE_SEARCH_ENDPOINT, toMsQuery(filter));
    },
    listByCategory<T = unknown>(categoryId: string) {
      return post<T>(TENANT_PAYMENTS_OUT_SEARCH_ENDPOINT, toMsQuery({
        "paymentsOutCategoryId-eq": categoryId,
      }));
    },
  },

  revenue: {
    ...revenue,
    list<T = unknown>(filter: ApiFilter = {}) {
      return post<T>(TENANT_PAYMENTS_IN_SEARCH_ENDPOINT, toMsQuery(filter));
    },
    detail<T = unknown>(uid: string) {
      return get<T>(`${TENANT_PAYMENTS_IN_ENDPOINT}/${uid}`);
    },
    update<T = unknown>(uid: string, data: unknown) {
      return put<T>(`${TENANT_PAYMENTS_IN_ENDPOINT}/${uid}`, data);
    },
    count<T = number>(filter: ApiFilter = {}) {
      return get<T>(TENANT_PAYMENTS_IN_COUNT_ENDPOINT, toMsQuery(filter));
    },
  },

  totals: {
    list<T = unknown>(filter: ApiFilter = {}) {
      return post<T>(TENANT_PAYMENTS_IN_SEARCH_ENDPOINT, toMsQuery(filter));
    },
    count<T = number>(filter: ApiFilter = {}) {
      return get<T>(TENANT_PAYMENTS_IN_COUNT_ENDPOINT, toMsQuery(filter));
    },
  },

  invoices: {
    ...invoices,
    // Compatibility aliases for callers that still use the legacy *General names.
    // Invoice listing is served by the dedicated POST /search route and uses
    // Spring Pageable, so translate from/count -> page/size.
    listGeneral<T = unknown>(filter: ApiFilter = {}) {
      return post<T>(TENANT_INVOICE_SEARCH_ENDPOINT, toMsQuery(filter));
    },
    countGeneral<T = number>(filter: ApiFilter = {}) {
      return invoices.count<T>(filter);
    },
    detailGeneral<T = unknown>(id: string) {
      return invoices.detail<T>(id);
    },
    createGeneral<T = unknown>(data: unknown) {
      return invoices.create<T>(data);
    },
    updateGeneral<T = unknown>(id: string, data: unknown) {
      return invoices.update<T>(id, data);
    },
    getBySourceUid<T = unknown>(sourceUid: string) {
      return get<T>(`${TENANT_INVOICE_ENDPOINT}/by-source-category-uid/${sourceUid}`);
    },
    updateInvoiceStatus<T = unknown>(invoiceId: string, status: string, note?: unknown) {
      return put<T>(`${TENANT_INVOICE_ENDPOINT}/${invoiceId}/invoice-status/${status}`, note);
    },
    updateStatus<T = unknown>(invoiceId: string, statusId: string) {
      return put<T>(`${TENANT_INVOICE_ENDPOINT}/${invoiceId}/status/${statusId}`);
    },
    assignUser<T = unknown>(invoiceId: string, users: unknown) {
      return put<T>(`${TENANT_INVOICE_ENDPOINT}/${invoiceId}/assignees`, users);
    },
    unassignUser<T = unknown>(invoiceId: string, users: unknown) {
      return put<T>(`${TENANT_INVOICE_ENDPOINT}/${invoiceId}/assignees/remove`, users);
    },
    removeDetail<T = unknown>(detailUid: string) {
      return del<T>(`${TENANT_INVOICE_ENDPOINT}/remove/details/${detailUid}`);
    },
    uploadDocument<T = unknown>(uid: string, data: unknown) {
      return post<T>(`${TENANT_INVOICE_ENDPOINT}/${uid}/document`, data);
    },
    uploadDocuments<T = unknown>(uid: string, data: unknown) {
      return post<T>(`${TENANT_INVOICE_ENDPOINT}/${uid}/documents`, data);
    },
    applyCoupon<T = unknown>(uid: string, data: unknown) {
      return put<T>(`${TENANT_INVOICE_ENDPOINT}/${uid}/coupon/apply`, data);
    },
    removeCoupon<T = unknown>(uid: string, data: unknown) {
      return put<T>(`${TENANT_INVOICE_ENDPOINT}/${uid}/coupon/remove`, data);
    },
    applyDiscount<T = unknown>(uid: string, data: unknown) {
      return put<T>(`${TENANT_INVOICE_ENDPOINT}/${uid}/discount/apply`, data);
    },
    removeDiscount<T = unknown>(uid: string, data: unknown) {
      return put<T>(`${TENANT_INVOICE_ENDPOINT}/${uid}/discount/remove`, data);
    },
    applyDiscountInDetail<T = unknown>(uid: string, data: unknown) {
      return put<T>(`${TENANT_INVOICE_ENDPOINT}/detail/${uid}/discount/apply`, data);
    },
    removeDiscountFromDetail<T = unknown>(uid: string, data: unknown) {
      return put<T>(`${TENANT_INVOICE_ENDPOINT}/detail/${uid}/discount/remove`, data);
    },
    sharePaymentLink<T = unknown>(invoiceId: string, data: unknown) {
      return put<T>(`${TENANT_INVOICE_ENDPOINT}/${invoiceId}/share/payment/link`, data);
    },
    sharePdf<T = unknown>(invoiceId: string, data: unknown) {
      return put<T>(`${TENANT_INVOICE_ENDPOINT}/${invoiceId}/share`, data);
    },
    sharePdfAttachment<T = unknown>(invoiceId: string, data: unknown) {
      return put<T>(`${TENANT_INVOICE_ENDPOINT}/${invoiceId}/sharePdf`, data);
    },
    createMaster<T = unknown>(data: unknown) {
      return post<T>(`${TENANT_INVOICE_ENDPOINT}/master`, data);
    },
    linkInvoices<T = unknown>(masterUid: string, data: unknown) {
      return put<T>(`${TENANT_INVOICE_ENDPOINT}/master/${masterUid}/link`, data);
    },
    unlinkInvoices<T = unknown>(masterUid: string, data: unknown) {
      return put<T>(`${TENANT_INVOICE_ENDPOINT}/master/${masterUid}/unlink`, data);
    },
    nextInvoiceId<T = unknown>(data: unknown) {
      return put<T>(`${TENANT_INVOICE_ENDPOINT}/nextInvoiceNum`, data);
    },
    templateList<T = unknown>(filter: ApiFilter = {}) {
      return invoiceTemplates.list<T>(filter);
    },
    templateById<T = unknown>(uid: string) {
      return invoiceTemplates.detail<T>(uid);
    },
    createTemplate<T = unknown>(data: unknown) {
      return invoiceTemplates.create<T>(data);
    },
    updateTemplate<T = unknown>(uid: string, data: unknown) {
      return invoiceTemplates.update<T>(uid, data);
    },
    deleteTemplate<T = unknown>(uid: string) {
      return invoiceTemplates.changeStatus<T>(uid, "INACTIVE");
    },
    createOfflinePayment<T = unknown>(data: unknown) {
      return post<T>(`${TENANT_INVOICE_PAYMENT_ENDPOINT}/offline`, data);
    },
    updateOfflinePayment<T = unknown>(uid: string, data: unknown) {
      return put<T>(`${TENANT_INVOICE_PAYMENT_ENDPOINT}/offline/${uid}/update`, data);
    },
    paymentByInvoice<T = unknown>(invoiceId: string) {
      return get<T>(`${TENANT_INVOICE_PAYMENT_ENDPOINT}/invoice/${invoiceId}`);
    },
  },

  cash: {
    createReserve<T = unknown>(direction: "paymentsIn" | "paymentsOut", data: unknown) {
      if (direction === "paymentsIn") {
        return post<T>(TENANT_PAYMENTS_IN_CASH_RESERVE_ENDPOINT, data);
      }
      return post<T>(TENANT_PAYMENTS_OUT_CASH_RESERVE_ENDPOINT, data);
    },
    updateReserve<T = unknown>(direction: "paymentsIn" | "paymentsOut", payId: string, data: unknown) {
      if (direction === "paymentsIn") {
        return put<T>(`${TENANT_PAYMENTS_IN_CASH_RESERVE_ENDPOINT}/${payId}`, data);
      }
      return put<T>(`${TENANT_PAYMENTS_OUT_CASH_RESERVE_ENDPOINT}/${payId}`, data);
    },
    list<T = unknown>(filter: ApiFilter = {}) {
      return post<T>(TENANT_PAYMENTS_IN_CASH_RESERVE_SEARCH_ENDPOINT, toMsQuery(filter));
    },
    listOut<T = unknown>(filter: ApiFilter = {}) {
      return post<T>(TENANT_PAYMENTS_OUT_CASH_RESERVE_SEARCH_ENDPOINT, toMsQuery(filter));
    },
    detailIn<T = unknown>(uid: string) {
      return get<T>(`${TENANT_PAYMENTS_IN_CASH_RESERVE_ENDPOINT}/${uid}`);
    },
    detailOut<T = unknown>(uid: string) {
      return get<T>(`${TENANT_PAYMENTS_OUT_CASH_RESERVE_ENDPOINT}/${uid}`);
    },
    count<T = number>(filter: ApiFilter = {}) {
      return get<T>(TENANT_PAYMENTS_IN_CASH_RESERVE_COUNT_ENDPOINT, filter);
    },
    balance<T = unknown>(locationId: string) {
      return get<T>(`${TENANT_CASH_BALANCE_ENDPOINT}/${locationId}`);
    },
    recalculateBalance<T = unknown>(locationId: string) {
      return put<T>(`${TENANT_CASH_BALANCE_ENDPOINT}/calculate/${locationId}`);
    },
  },

  analytics: {
    revenue<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/jp/finance/analytics/account", { ...filter, metricId: "174" });
    },
    expense<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/jp/finance/analytics/account", { ...filter, metricId: "168" });
    },
    payout<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/jp/finance/analytics/account", { ...filter, metricId: "176" });
    },
    all<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/analytics", filter);
    },
    categorywise<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/jp/finance/analytics/categorywise", filter);
    },
    graph<T = unknown>(payloads: unknown[]) {
      return Promise.all(
        payloads.map((payload) => put<T>("provider/analytics/graph", payload).then((response) => response.data))
      );
    },
  },

  ledger: {
    list<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/creditsystem", filter);
    },
    count<T = number>(filter: ApiFilter = {}) {
      return get<T>("provider/creditsystem/count", filter);
    },
    create<T = unknown>(payload: unknown) {
      return post<T>("provider/creditsystem", payload);
    },
    detail<T = unknown>(ledgerUid: string) {
      return get<T>(`provider/creditsystem/${ledgerUid}`);
    },
    detailList<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/creditsystem/details", filter);
    },
    detailCount<T = number>(filter: ApiFilter = {}) {
      return get<T>("provider/creditsystem/details/count", filter);
    },
    auditLogs<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/creditsystem/auditlog", filter);
    },
    auditLogCount<T = number>(filter: ApiFilter = {}) {
      return get<T>("provider/creditsystem/auditlog/count", filter);
    },
    addCredits<T = unknown>(data: unknown) {
      return post<T>("provider/creditsystem/payment/acceptPayment", data);
    },
    updateCredits<T = unknown>(paymentRefId: string, data: unknown) {
      return put<T>(`provider/creditsystem/payment/acceptPayment/update/${paymentRefId}`, data);
    },
    byCustomer<T = unknown>(customerId: string) {
      return get<T>(`provider/creditsystem/providerconsumer/${customerId}`);
    },
    applyCredits<T = unknown>(data: unknown) {
      return post<T>("provider/creditsystem/apply/credits", data);
    },
    removeCredits<T = unknown>(data: unknown) {
      return put<T>("provider/creditsystem/remove/credits", data);
    },
  },

  activity: {
    list<T = unknown>(filter: ApiFilter = {}) {
      return get<T>(TENANT_AUDIT_LOG_ENDPOINT, toMsQuery(filter));
    },
    count<T = number>(filter: ApiFilter = {}) {
      return get<T>(`${TENANT_AUDIT_LOG_ENDPOINT}/count`, toMsQuery(filter));
    },
  },

  locations: {
    provider<T = unknown>() {
      return get<T>("provider/locations");
    },
    tenant<T = unknown>(filter: ApiFilter = {}) {
      return get<T>(TENANT_LOCATIONS_ENDPOINT, filter);
    },
    list<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/locations", filter);
    },
  },

  users: {
    list<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/user", filter);
    },
    detail<T = unknown>(id: string) {
      return get<T>(`provider/user/${id}`);
    },
    digitalSign<T = unknown>(providerId: string) {
      return get<T>(`provider/user/digitalSign/${providerId}`);
    },
  },

  customers: {
    search<T = unknown>(data: unknown) {
      return post<T>(TENANT_CONSUMER_SEARCH_ENDPOINT, data);
    },
    list<T = unknown>(data: unknown) {
      return post<T>(TENANT_CONSUMER_SEARCH_ENDPOINT, data);
    },
    detail<T = unknown>(id: string) {
      return get<T>(`${TENANT_CONSUMER_ENDPOINT}/${id}`);
    },
  },

  assets: {
    generateUploadPath<T = unknown>(data: unknown) {
      return post<T>("provider/fileShare/upload", data);
    },
    markUploadStatus<T = unknown>(status: string, id: string) {
      return put<T>(`provider/fileShare/upload/${status}/${id}`, null);
    },
    uploadToSignedUrl<T = unknown>(url: string, file: unknown) {
      return put<T>(url, file);
    },
  },
  services: {
    list<T = unknown>() {
      return get<T>("/v1/api/provider/services");
    },
  },
  items: {
    list<T = unknown>(filter: ApiFilter = {}) {
      return get<T>(TENANT_ITEM_ENDPOINT, filter);
    },
    detail<T = unknown>(uid: string) {
      return get<T>(`${TENANT_ITEM_ENDPOINT}/${uid}`);
    },
    create<T = unknown>(data: unknown) {
      return post<T>(TENANT_ITEM_ENDPOINT, data);
    },
    update<T = unknown>(uid: string, data: unknown) {
      return put<T>(`${TENANT_ITEM_ENDPOINT}/${uid}`, data);
    },
    changeStatus<T = unknown>(uid: string, status: string) {
      return put<T>(`${TENANT_ITEM_ENDPOINT}/${uid}/status/${status}`);
    },
    updateCouponApplicable<T = unknown>(uid: string, applicable: boolean) {
      return put<T>(`${TENANT_ITEM_ENDPOINT}/${uid}/coupon-applicable/${applicable}`);
    },
    updateDiscountApplicable<T = unknown>(uid: string, applicable: boolean) {
      return put<T>(`${TENANT_ITEM_ENDPOINT}/${uid}/discount-applicable/${applicable}`);
    },
  },
  sequenceTemplates: {
    list<T = unknown>(filter: ApiFilter = {}) {
      return post<T>(TENANT_SEQUENCE_TEMPLATE_SEARCH_ENDPOINT, filter);
    },
    detail<T = unknown>(uid: string) {
      return get<T>(`${TENANT_SEQUENCE_TEMPLATE_ENDPOINT}/${uid}`);
    },
    create<T = unknown>(data: unknown) {
      return post<T>(TENANT_SEQUENCE_TEMPLATE_ENDPOINT, data);
    },
    update<T = unknown>(uid: string, data: unknown) {
      return put<T>(`${TENANT_SEQUENCE_TEMPLATE_ENDPOINT}/${uid}`, data);
    },
    updateStatus<T = unknown>(uid: string, status: string) {
      return put<T>(`${TENANT_SEQUENCE_TEMPLATE_ENDPOINT}/${uid}/${status}`);
    },
  },
  sequenceSettings: {
    list<T = unknown>(filter: ApiFilter = {}) {
      return post<T>(TENANT_SEQUENCE_SETTINGS_SEARCH_ENDPOINT, filter);
    },
    detail<T = unknown>(uid: string) {
      return get<T>(`${TENANT_SEQUENCE_SETTINGS_ENDPOINT}/${uid}`);
    },
    create<T = unknown>(data: unknown) {
      return post<T>(TENANT_SEQUENCE_SETTINGS_ENDPOINT, data);
    },
    update<T = unknown>(uid: string, data: unknown) {
      return put<T>(`${TENANT_SEQUENCE_SETTINGS_ENDPOINT}/${uid}`, data);
    },
    updateStatus<T = unknown>(uid: string, status: string) {
      return put<T>(`${TENANT_SEQUENCE_SETTINGS_ENDPOINT}/${uid}/${status}`);
    },
  },
  discounts: {
    list<T = unknown>(filter: ApiFilter = {}) {
      return post<T>(TENANT_DISCOUNTS_SEARCH_ENDPOINT, filter);
    },
    listBill<T = unknown>() {
      return get<T>("provider/bill/discounts");
    },
    detail<T = unknown>(uid: string) {
      return get<T>(`${TENANT_DISCOUNTS_ENDPOINT}/${uid}`);
    },
    create<T = unknown>(data: unknown) {
      return post<T>(TENANT_DISCOUNTS_ENDPOINT, data);
    },
    update<T = unknown>(uid: string, data: unknown) {
      return put<T>(`${TENANT_DISCOUNTS_ENDPOINT}/${uid}`, data);
    },
    updateStatus<T = unknown>(uid: string, status: string) {
      return put<T>(`${TENANT_DISCOUNTS_ENDPOINT}/${uid}/${status}`);
    },
    remove<T = unknown>(id: string) {
      return put<T>(`${TENANT_DISCOUNTS_ENDPOINT}/${id}/remove`);
    },
  },
  coupons: {
    list<T = unknown>(filter: ApiFilter = {}) {
      return post<T>(TENANT_COUPONS_SEARCH_ENDPOINT, filter);
    },
    listBill<T = unknown>() {
      return get<T>("provider/bill/coupons/nonexpired");
    },
    detail<T = unknown>(uid: string) {
      return get<T>(`${TENANT_COUPONS_ENDPOINT}/${uid}`);
    },
    byCode<T = unknown>(feature: string, couponCode: string) {
      return get<T>(`${TENANT_COUPONS_ENDPOINT}/${feature}/by-code/${couponCode}`);
    },
    create<T = unknown>(data: unknown) {
      return post<T>(TENANT_COUPONS_ENDPOINT, data);
    },
    update<T = unknown>(uid: string, data: unknown) {
      return put<T>(`${TENANT_COUPONS_ENDPOINT}/${uid}`, data);
    },
    remove<T = unknown>(uid: string) {
      return del<T>(`${TENANT_COUPONS_ENDPOINT}/${uid}`);
    },
    publish<T = unknown>(uid: string) {
      return put<T>(`${TENANT_COUPONS_ENDPOINT}/${uid}/publish`);
    },
    updateStatus<T = unknown>(uid: string, status: string) {
      return put<T>(`${TENANT_COUPONS_ENDPOINT}/${uid}/status/${status}`);
    },
    searchSchema<T = unknown>() {
      return get<T>(`${TENANT_COUPONS_ENDPOINT}/search/schema`);
    },
  },
};

export type FinanceApi = typeof financeApi;
