import { httpClient } from "./httpClient";

type ApiFilter = Record<string, unknown>;
type ApiResponse<T> = Promise<{ data: T }>;

function get<T>(url: string, params?: ApiFilter): ApiResponse<T> {
  return httpClient.get<T>(url, params ? { params } : undefined);
}

function post<T>(url: string, data?: unknown): ApiResponse<T> {
  return httpClient.post<T>(url, data);
}

function put<T>(url: string, data?: unknown, params?: ApiFilter): ApiResponse<T> {
  return httpClient.put<T>(url, data, params ? { params } : undefined);
}

function del<T>(url: string, params?: ApiFilter): ApiResponse<T> {
  return httpClient.delete<T>(url, params ? { params } : undefined);
}

function buildCountPath(basePath: string) {
  return `${basePath}/count`;
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
const expenses = createCrudApi("provider/jp/finance/expense");
const payables = createCrudApi("provider/jp/finance/paymentsOut");
const revenue = createCrudApi("provider/jp/finance/paymentsIn");
const categories = createCrudApi("provider/jp/finance/category");
const statuses = createCrudApi("provider/jp/finance/status");
const invoices = createCrudApi("provider/jp/finance/invoice");
const invoiceGeneral = createCrudApi("provider/jp/finance/invoice/general");

export const financeApi = {
  settings: {
    provider(filter: ApiFilter = {}) {
      return get("provider/jp/finance/settings", filter);
    },
    expenseAutoPayout(status: string) {
      return put(`provider/jp/finance/settings/expense/autoPayout/${status}`);
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
    byType<T = unknown>(type: string, filter: ApiFilter = {}) {
      return get<T>(`provider/jp/finance/category/type/${type}`, filter);
    },
    byFilter<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/jp/finance/category/list", filter);
    },
    countByType<T = number>(categoryType: string, filter: ApiFilter = {}) {
      return get<T>("provider/jp/finance/category/list/count", {
        ...filter,
        "categoryType-eq": categoryType,
      });
    },
    expenseCategories<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/jp/finance/category/list", {
        ...filter,
        "categoryType-eq": "Expense",
      });
    },
    payableCategories<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/jp/finance/category/list", {
        ...filter,
        "categoryType-eq": "PaymentsOut",
      });
    },
  },

  statuses: {
    ...statuses,
    byType<T = unknown>(type: string, filter: ApiFilter = {}) {
      return get<T>(`provider/jp/finance/status/type/${type}`, filter);
    },
    byFilter<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/jp/finance/status/list", filter);
    },
    countByType<T = number>(categoryType: string, filter: ApiFilter = {}) {
      return get<T>("provider/jp/finance/status/list/count", {
        ...filter,
        "categoryType-eq": categoryType,
      });
    },
    enable<T = unknown>(id: string, status: string) {
      return put<T>(`provider/jp/finance/status/${id}/${status}`);
    },
    disable<T = unknown>(id: string, status: string) {
      return put<T>(`provider/jp/finance/status/${id}/${status}`);
    },
  },

  expenses: {
    ...expenses,
    createPayout<T = unknown>(data: unknown) {
      return post<T>("provider/jp/finance/paymentsOut", data);
    },
    listByCategory<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/jp/finance/analytics/categorywise/comparison", filter);
    },
  },

  payables: {
    ...payables,
    listByCategory<T = unknown>(categoryId: string) {
      return get<T>("provider/jp/finance/paymentsOut", {
        "paymentsOutCategoryId-eq": categoryId,
      });
    },
  },

  revenue: {
    ...revenue,
  },

  totals: {
    list<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/jp/finance/paymentsIn/paymentsInOut", filter);
    },
    count<T = number>(filter: ApiFilter = {}) {
      return get<T>("provider/jp/finance/paymentsIn/paymentsInOut/count", filter);
    },
  },

  invoices: {
    ...invoices,
    createGeneral<T = unknown>(data: unknown) {
      return invoiceGeneral.create<T>(data);
    },
    updateGeneral<T = unknown>(invoiceId: string, data: unknown) {
      return invoiceGeneral.update<T>(invoiceId, data);
    },
    listGeneral<T = unknown>(filter: ApiFilter = {}) {
      return invoiceGeneral.list<T>(filter);
    },
    countGeneral<T = number>(filter: ApiFilter = {}) {
      return invoiceGeneral.count<T>(filter);
    },
    detailGeneral<T = unknown>(invoiceId: string) {
      return invoiceGeneral.detail<T>(invoiceId);
    },
    createMaster<T = unknown>(data: unknown) {
      return post<T>("provider/jp/finance/invoice/general/master", data);
    },
    linkInvoices<T = unknown>(masterUid: string, data: unknown) {
      return put<T>(`provider/jp/finance/invoice/general/master/${masterUid}/link`, data);
    },
    unlinkInvoices<T = unknown>(masterUid: string, data: unknown) {
      return put<T>(`provider/jp/finance/invoice/general/master/${masterUid}/unlink`, data);
    },
    assignUser<T = unknown>(invoiceId: string, userId: string) {
      return put<T>(`provider/jp/finance/invoice/general/${invoiceId}/assign/${userId}`);
    },
    unassignUser<T = unknown>(invoiceId: string) {
      return put<T>(`provider/jp/finance/invoice/general/${invoiceId}/unassign`);
    },
    sharePdf<T = unknown>(invoiceId: string, data: unknown) {
      return put<T>(`provider/jp/finance/invoice/general/${invoiceId}/sharePdf`, data);
    },
    sharePdfAttachment<T = unknown>(invoiceId: string, data: unknown) {
      return put<T>(`provider/jp/finance/invoice/general/${invoiceId}/sharePdfAttachment`, data);
    },
    createPaymentLink<T = unknown>(data: unknown) {
      return post<T>("provider/jp/finance/general/pay/createLink", data);
    },
    acceptPayment<T = unknown>(data: unknown) {
      return post<T>("provider/jp/finance/general/pay/acceptPayment", data);
    },
    updateAcceptedPayment<T = unknown>(paymentRefId: string, data: unknown) {
      return put<T>(`provider/jp/finance/general/pay/acceptPayment/update/${paymentRefId}`, data);
    },
    priceCalculation<T = unknown>(data: unknown) {
      return put<T>("provider/jp/finance/invoice/calculations", data);
    },
    billAction<T = unknown>(invoiceId: string, action: string, data?: unknown) {
      return put<T>(`provider/jp/finance/invoice/general/${invoiceId}/${action}`, data);
    },
    billStatus<T = unknown>(invoiceId: string, status: string, data?: unknown) {
      return put<T>(`provider/jp/finance/invoice/general/${invoiceId}/billStatus/${status}`, data);
    },
    templateList<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/jp/finance/invoice/general/template", filter);
    },
    templateById<T = unknown>(uid: string) {
      return get<T>(`provider/jp/finance/invoice/general/template/${uid}`);
    },
    createTemplate<T = unknown>(data: unknown) {
      return post<T>("provider/jp/finance/invoice/general/template", data);
    },
    updateTemplate<T = unknown>(uid: string, data: unknown) {
      return put<T>(`provider/jp/finance/invoice/general/template/${uid}`, data);
    },
    deleteTemplate<T = unknown>(uid: string) {
      return del<T>(`provider/jp/finance/invoice/general/template/${uid}`);
    },
    nextInvoiceId<T = unknown>(locationId: string) {
      return get<T>(`provider/jp/finance/invoice/general/${locationId}/nextInvoiceId`);
    },
  },

  cash: {
    createReserve<T = unknown>(direction: "paymentsIn" | "paymentsOut", data: unknown) {
      return post<T>(`provider/jp/finance/${direction}/cashReserve`, data);
    },
    updateReserve<T = unknown>(direction: "paymentsIn" | "paymentsOut", payId: string, data: unknown) {
      return put<T>(`provider/jp/finance/${direction}/cashReserve/${payId}`, data);
    },
    list<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/jp/finance/paymentsIn/cashReserve", filter);
    },
    count<T = number>(filter: ApiFilter = {}) {
      return get<T>("provider/jp/finance/paymentsIn/cashReserve/count", filter);
    },
    balance<T = unknown>() {
      return get<T>("provider/jp/finance/cashbalance");
    },
    recalculateBalance<T = unknown>() {
      return put<T>("provider/jp/finance/cashbalance/calculate");
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
      return get<T>("provider/jp/finance/log", filter);
    },
    count<T = number>(filter: ApiFilter = {}) {
      return get<T>("provider/jp/finance/log/count", filter);
    },
  },

  locations: {
    provider<T = unknown>() {
      return get<T>("provider/locations");
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
    list<T = unknown>(filter: ApiFilter = {}) {
      return get<T>("provider/customers", filter);
    },
    detail<T = unknown>(id: string) {
      return get<T>(`provider/customers/${id}`);
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
};

export type FinanceApi = typeof financeApi;
