import type { Customer, CustomerFilters, CustomerFormValues, CustomerVisit } from "../types";

interface ScopedApi {
  get: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
  post: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  put: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
}

function buildCustomerQuery(filters: CustomerFilters) {
  const query: Record<string, string | number> = {};

  if (filters.search?.trim()) {
    query["or=jaldeeId-eq"] = [
      filters.search.trim(),
      `firstName-eq=${filters.search.trim()}`,
      `phoneNo-eq=${filters.search.trim()}`,
    ].join(",");
  }

  if (filters.status) {
    query["status-eq"] = filters.status;
  }

  if (filters.page && filters.pageSize) {
    query.from = (filters.page - 1) * filters.pageSize;
    query.count = filters.pageSize;
  }

  return query;
}

function toCustomer(raw: Record<string, unknown>): Customer {
  return {
    id: String(raw.id ?? raw.uid ?? raw.consumerId ?? ""),
    jaldeeId: typeof raw.jaldeeId === "string" ? raw.jaldeeId : undefined,
    firstName: String(raw.firstName ?? ""),
    lastName: typeof raw.lastName === "string" ? raw.lastName : undefined,
    phoneNo: typeof raw.phoneNo === "string" ? raw.phoneNo : undefined,
    countryCode: typeof raw.countryCode === "string" ? raw.countryCode : undefined,
    email: typeof raw.email === "string" ? raw.email : undefined,
    gender: typeof raw.gender === "string" ? raw.gender : undefined,
    dob: typeof raw.dob === "string" ? raw.dob : undefined,
    address: typeof raw.address === "string" ? raw.address : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    parent: typeof raw.parent === "boolean" ? raw.parent : undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    lastVisit: typeof raw.lastVisit === "string" ? raw.lastVisit : undefined,
    visitCount: typeof raw.visitCount === "number" ? raw.visitCount : undefined,
  };
}

function toVisit(raw: Record<string, unknown>, type: CustomerVisit["type"]): CustomerVisit {
  const title =
    typeof raw.service === "string"
      ? raw.service
      : typeof raw.name === "string"
        ? raw.name
        : typeof raw.label === "string"
          ? raw.label
          : "Visit";

  return {
    id: String(raw.id ?? raw.uid ?? raw.ynwUuid ?? raw.orderId ?? ""),
    type,
    title,
    service: typeof raw.service === "string" ? raw.service : undefined,
    date: typeof raw.date === "string" ? raw.date : typeof raw.appmtDate === "string" ? raw.appmtDate : undefined,
    time: typeof raw.time === "string" ? raw.time : typeof raw.apptTime === "string" ? raw.apptTime : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
  };
}

export async function listCustomers(api: ScopedApi, filters: CustomerFilters): Promise<Customer[]> {
  const response = await api.get<Record<string, unknown>[]>("provider/customers", {
    params: buildCustomerQuery(filters),
  });

  return response.data.map(toCustomer);
}

export async function getCustomerCount(api: ScopedApi, filters: CustomerFilters): Promise<number> {
  const response = await api.get<number>("provider/customers/count", {
    params: buildCustomerQuery(filters),
  });

  return response.data;
}

export async function getCustomerById(api: ScopedApi, customerId: string): Promise<Customer | null> {
  const response = await api.get<Record<string, unknown>[]>("provider/customers", {
    params: { "id-eq": customerId },
  });

  return response.data[0] ? toCustomer(response.data[0]) : null;
}

export async function createCustomer(api: ScopedApi, values: CustomerFormValues): Promise<unknown> {
  return api.post("provider/customers", {
    firstName: values.firstName,
    lastName: values.lastName || undefined,
    phoneNo: values.phoneNo || undefined,
    countryCode: values.phoneNo ? values.countryCode || "+91" : undefined,
    email: values.email || undefined,
    gender: values.gender || undefined,
    dob: values.dob || undefined,
    address: values.address || undefined,
    jaldeeId: values.jaldeeId || undefined,
  });
}

export async function updateCustomer(api: ScopedApi, values: CustomerFormValues): Promise<unknown> {
  return api.put("provider/customers", {
    id: values.id,
    firstName: values.firstName,
    lastName: values.lastName || undefined,
    phoneNo: values.phoneNo || undefined,
    countryCode: values.phoneNo ? values.countryCode || "+91" : undefined,
    email: values.email || undefined,
    gender: values.gender || undefined,
    dob: values.dob || undefined,
    address: values.address || undefined,
    jaldeeId: values.jaldeeId || undefined,
  });
}

export async function getTodayVisits(api: ScopedApi, customerId: string): Promise<CustomerVisit[]> {
  const response = await api.get<Record<string, unknown>[]>(`provider/customers/bookings/today/${customerId}`);
  return response.data.map((item) => toVisit(item, "today"));
}

export async function getFutureVisits(api: ScopedApi, customerId: string): Promise<CustomerVisit[]> {
  const response = await api.get<Record<string, unknown>[]>(`provider/customers/bookings/future/${customerId}`);
  return response.data.map((item) => toVisit(item, "future"));
}

export async function getHistoryVisits(api: ScopedApi, customerId: string): Promise<CustomerVisit[]> {
  const response = await api.get<Record<string, unknown>[]>(`provider/customers/bookings/history/${customerId}`);
  return response.data.map((item) => toVisit(item, "history"));
}

export async function getOrderVisits(api: ScopedApi, customerId: string): Promise<CustomerVisit[]> {
  const response = await api.get<Record<string, unknown>[]>(`provider/orders/customer/${customerId}`);
  return response.data.map((item) => toVisit(item, "order"));
}
