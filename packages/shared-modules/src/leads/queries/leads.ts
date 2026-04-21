import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildScopedDetailQueryKey, buildScopedListQueryKey } from "../../queryKeys";
import { useApiScope } from "../../useApiScope";
import {
  changeLeadStatus,
  changeChannelStatus,
  getLeadChart,
  changeProductTypeStatus,
  createChannel,
  createLead,
  createLeadCustomer,
  createProductType,
  getChannelByUid,
  getChannels,
  getChannelsCount,
  getChannelTemplates,
  getLeadByUid,
  getLeadStages,
  getLeadCustomerByUid,
  getLeadCustomers,
  getLeadCustomersCount,
  getLeadLogs,
  getLeadLogsCount,
  getLeadPieChart,
  getLeads,
  getLeadsCount,
  getLeadStats,
  getLeadTemplates,
  getProductTypeByUid,
  getProductTypeCount,
  getProductTypes,
  getProviderLocations,
  getProviderUsers,
  updateChannel,
  updateLead,
  updateLeadCustomer,
  updateProductType,
} from "../services/leads";

export function useLeadStats(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["lead-stats", scopedApi.apiScope, scopedApi.locationId, filter],
    queryFn: () => getLeadStats(scopedApi, filter),
  });
}

export function useLeadPieChart(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["lead-pie-chart", scopedApi.apiScope, scopedApi.locationId, filter],
    queryFn: () => getLeadPieChart(scopedApi, filter),
  });
}

export function useLeadChart(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["lead-chart", scopedApi.apiScope, scopedApi.locationId, filter],
    queryFn: () => getLeadChart(scopedApi, filter),
  });
}

export function useLeads(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedListQueryKey("lead-records", scopedApi.apiScope, scopedApi.locationId, filter),
    queryFn: () => getLeads(scopedApi, filter),
  });
}

export function useLeadsCount(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["lead-records-count", scopedApi.apiScope, scopedApi.locationId, filter],
    queryFn: () => getLeadsCount(scopedApi, filter),
  });
}

export function useLeadByUid(uid: string) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedDetailQueryKey("lead-records", scopedApi.apiScope, scopedApi.locationId, uid),
    queryFn: () => getLeadByUid(scopedApi, uid),
    enabled: !!uid,
  });
}

export function useCreateLead() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createLead(scopedApi, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-records"] });
      queryClient.invalidateQueries({ queryKey: ["lead-stats"] });
    },
  });
}

export function useUpdateLead() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: any }) => updateLead(scopedApi, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-records"] });
      queryClient.invalidateQueries({ queryKey: ["lead-stats"] });
    },
  });
}

export function useChangeLeadStatus() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, status, data }: { uid: string; status: string; data?: any }) => changeLeadStatus(scopedApi, uid, status, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-records"] });
      queryClient.invalidateQueries({ queryKey: ["lead-stats"] });
      queryClient.invalidateQueries({ queryKey: ["lead-chart"] });
      queryClient.invalidateQueries({ queryKey: ["lead-pie-chart"] });
    },
  });
}

export function useLeadStages(uid: string) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["lead-stages", scopedApi.apiScope, scopedApi.locationId, uid],
    queryFn: () => getLeadStages(scopedApi, uid),
    enabled: !!uid,
  });
}

export function useLeadLogs(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedListQueryKey("lead-logs", scopedApi.apiScope, scopedApi.locationId, filter),
    queryFn: () => getLeadLogs(scopedApi, filter),
  });
}

export function useLeadLogsCount(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["lead-logs-count", scopedApi.apiScope, scopedApi.locationId, filter],
    queryFn: () => getLeadLogsCount(scopedApi, filter),
  });
}

export function useProductTypes(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedListQueryKey("lead-product-types", scopedApi.apiScope, scopedApi.locationId, filter),
    queryFn: () => getProductTypes(scopedApi, filter),
  });
}

export function useProductTypeCount(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["lead-product-types-count", scopedApi.apiScope, scopedApi.locationId, filter],
    queryFn: () => getProductTypeCount(scopedApi, filter),
  });
}

export function useProductTypeByUid(uid: string) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedDetailQueryKey("lead-product-types", scopedApi.apiScope, scopedApi.locationId, uid),
    queryFn: () => getProductTypeByUid(scopedApi, uid),
    enabled: !!uid,
  });
}

export function useCreateProductType() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createProductType(scopedApi, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-product-types"] });
    },
  });
}

export function useUpdateProductType() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: any }) => updateProductType(scopedApi, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-product-types"] });
    },
  });
}

export function useChangeProductTypeStatus() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: string }) => changeProductTypeStatus(scopedApi, uid, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-product-types"] });
    },
  });
}

export function useLeadTemplates() {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["lead-templates", scopedApi.apiScope, scopedApi.locationId],
    queryFn: () => getLeadTemplates(scopedApi),
  });
}

export function useChannels(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedListQueryKey("lead-channels", scopedApi.apiScope, scopedApi.locationId, filter),
    queryFn: () => getChannels(scopedApi, filter),
  });
}

export function useChannelsCount(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["lead-channels-count", scopedApi.apiScope, scopedApi.locationId, filter],
    queryFn: () => getChannelsCount(scopedApi, filter),
  });
}

export function useChannelByUid(uid: string) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedDetailQueryKey("lead-channels", scopedApi.apiScope, scopedApi.locationId, uid),
    queryFn: () => getChannelByUid(scopedApi, uid),
    enabled: !!uid,
  });
}

export function useCreateChannel() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createChannel(scopedApi, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-channels"] });
    },
  });
}

export function useUpdateChannel() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: any }) => updateChannel(scopedApi, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-channels"] });
    },
  });
}

export function useChangeChannelStatus() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: string }) => changeChannelStatus(scopedApi, uid, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-channels"] });
    },
  });
}

export function useChannelTemplates(channelUid: string) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["lead-channel-templates", scopedApi.apiScope, scopedApi.locationId, channelUid],
    queryFn: () => getChannelTemplates(scopedApi, channelUid),
    enabled: !!channelUid,
  });
}

export function useLeadCustomers(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedListQueryKey("lead-customers", scopedApi.apiScope, scopedApi.locationId, filter),
    queryFn: () => getLeadCustomers(scopedApi, filter),
  });
}

export function useLeadCustomersCount(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["lead-customers-count", scopedApi.apiScope, scopedApi.locationId, filter],
    queryFn: () => getLeadCustomersCount(scopedApi, filter),
  });
}

export function useLeadCustomerByUid(uid: string) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedDetailQueryKey("lead-customers", scopedApi.apiScope, scopedApi.locationId, uid),
    queryFn: () => getLeadCustomerByUid(scopedApi, uid),
    enabled: !!uid,
  });
}

export function useCreateLeadCustomer() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createLeadCustomer(scopedApi, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-customers"] });
    },
  });
}

export function useUpdateLeadCustomer() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: any }) => updateLeadCustomer(scopedApi, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-customers"] });
    },
  });
}

export function useProviderLocations(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedListQueryKey("lead-provider-locations", scopedApi.apiScope, scopedApi.locationId, filter),
    queryFn: () => getProviderLocations(scopedApi, filter),
  });
}

export function useProviderUsers(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedListQueryKey("lead-provider-users", scopedApi.apiScope, scopedApi.locationId, filter),
    queryFn: () => getProviderUsers(scopedApi, filter),
  });
}
