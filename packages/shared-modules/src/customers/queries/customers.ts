import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildScopedDetailQueryKey, buildScopedListQueryKey } from "../../queryKeys";
import { useApiScope } from "../../useApiScope";
import { useSharedModulesContext } from "../../context";
import {
  createCustomer,
  getCustomerById,
  getCustomerCount,
  getFutureVisits,
  getHistoryVisits,
  getOrderVisits,
  getTodayVisits,
  listCustomers,
  updateCustomer,
} from "../services/customers";
import type { CustomerFilters, CustomerFormValues } from "../types";

export function useCustomersList(filters: CustomerFilters) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedListQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, filters),
    queryFn: () => listCustomers(scopedApi, filters),
  });
}

export function useCustomersCount(filters: CustomerFilters) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, "count", filters),
    queryFn: () => getCustomerCount(scopedApi, filters),
  });
}

export function useCustomerDetail(customerId: string | null) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, customerId ?? "missing"),
    queryFn: () => getCustomerById(scopedApi, customerId as string),
    enabled: Boolean(customerId),
  });
}

export function useCustomerVisits(customerId: string | null) {
  const scopedApi = useApiScope();

  const today = useQuery({
    queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-today`),
    queryFn: () => getTodayVisits(scopedApi, customerId as string),
    enabled: Boolean(customerId),
  });

  const future = useQuery({
    queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-future`),
    queryFn: () => getFutureVisits(scopedApi, customerId as string),
    enabled: Boolean(customerId),
  });

  const history = useQuery({
    queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-history`),
    queryFn: () => getHistoryVisits(scopedApi, customerId as string),
    enabled: Boolean(customerId),
  });

  const orders = useQuery({
    queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-orders`),
    queryFn: () => getOrderVisits(scopedApi, customerId as string),
    enabled: Boolean(customerId),
  });

  return { today, future, history, orders };
}

export function useCreateCustomer() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CustomerFormValues) => createCustomer(scopedApi, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customers", scopedApi.apiScope, scopedApi.locationId],
      });
    },
  });
}

export function useUpdateCustomer() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  const { routeParams } = useSharedModulesContext();

  return useMutation({
    mutationFn: (values: CustomerFormValues) => updateCustomer(scopedApi, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customers", scopedApi.apiScope, scopedApi.locationId],
      });

      if (routeParams?.recordId) {
        queryClient.invalidateQueries({
          queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, routeParams.recordId),
        });
      }
    },
  });
}
