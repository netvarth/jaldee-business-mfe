import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

/** Shape returned by GET /v1/api/tenant/customers (CommerceCustomerDto). */
export interface Customer {
  uid: string;
  consumerNo?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phoneE164?: string;
  whatsAppE164?: string;
  email?: string;
  gender?: string;
  dob?: string;
  address?: string;
  state?: string;
  district?: string;
  status?: string;
}

export interface NewCustomerInput {
  title?: string;
  firstName: string;
  lastName?: string;
  primaryNumber?: string;
  primaryCountryCode?: string;
  email?: string;
  gender?: string;
  dob?: string;
  address?: string;
}

/**
 * Karty customers — booking-style: reads live data from commerce-service
 * (which projects the CRM consumer snapshot). No mock fallback, so a backend
 * gap is visible as an empty/error state rather than fake rows.
 */
export function useCustomers(search: string = "", page: number = 0, size: number = 20) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["customers", search, page, size],
    queryFn: async () => {
      const data = await api.get<any>(
        `/v1/api/tenant/customers?search=${encodeURIComponent(search)}&page=${page}&size=${size}`
      );
      return (Array.isArray(data) ? data : data?.content ?? []) as Customer[];
    },
  });
}

export function useCreateCustomer() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NewCustomerInput) => {
      const data = await api.post<Customer>("/v1/api/tenant/customers", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, ...input }: NewCustomerInput & { uid: string }) => {
      const data = await api.put<Customer>(`/v1/api/tenant/customers/${uid}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useDeleteCustomer() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => {
      await api.del(`/v1/api/tenant/customers/${uid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useCustomerOrders(uid: string | null) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["customerOrders", uid],
    queryFn: async () => {
      if (!uid) return [];
      const data = await api.get<any>(`/v1/api/tenant/orders?consumerUid=${uid}`);
      return (Array.isArray(data) ? data : data?.content ?? []) as any[];
    },
    enabled: !!uid
  });
}
