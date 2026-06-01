import { httpClient } from "@/lib/httpClient";
import type { ProviderCustomer, ProviderUserTitle } from "@/lib/gold-erp-types";
import { appendQuery, normalizeCountResponse } from "./serviceUtils";

export interface CustomerListFilters {
  firstName?: string;
  lastName?: string;
  name?: string;
  phoneNo?: string;
  countryCode?: string;
  email?: string;
  status?: string;
  from?: number;
  count?: number;
}

function buildCustomerPath(path: string, filters: CustomerListFilters = {}) {
  const params = new URLSearchParams();

  if (filters.firstName?.trim()) params.set("firstName-like", filters.firstName.trim());
  if (filters.lastName?.trim()) params.set("lastName-like", filters.lastName.trim());
  if (filters.name?.trim()) params.set("name-like", filters.name.trim());
  if (filters.phoneNo?.trim()) params.set("phoneNo-eq", filters.phoneNo.trim());
  if (filters.countryCode?.trim()) params.set("countryCode-eq", filters.countryCode.trim());
  if (filters.email?.trim()) params.set("email-eq", filters.email.trim());
  if (filters.status?.trim() && filters.status !== "all") params.set("status-eq", filters.status.trim());
  if (typeof filters.from === "number") params.set("from", String(Math.max(0, filters.from)));
  if (typeof filters.count === "number") params.set("count", String(Math.max(1, filters.count)));

  return appendQuery(path, params);
}

export const customerService = {
  async getCustomers(filters: CustomerListFilters = {}) {
    const res = await httpClient.get<ProviderCustomer[]>(buildCustomerPath("/provider/customers", filters));
    return res.data;
  },

  async getCustomerCount(filters: Omit<CustomerListFilters, "from" | "count"> = {}) {
    const res = await httpClient.get<unknown>(buildCustomerPath("/provider/customers/count", filters));
    return normalizeCountResponse(res.data);
  },

  async getCustomerDetails(customerId: number) {
    const res = await httpClient.get<ProviderCustomer>(`/provider/customers/${customerId}`);
    return res.data;
  },

  async createCustomer(data: Record<string, unknown>) {
    const res = await httpClient.post<ProviderCustomer>("/provider/customers", data);
    return res.data;
  },

  async getUserTitles() {
    const res = await httpClient.get<ProviderUserTitle[]>("/provider/userTitle");
    return res.data;
  },
};
