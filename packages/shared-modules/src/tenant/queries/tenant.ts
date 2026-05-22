import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiScope } from "../../useApiScope";
import * as services from "../services/tenant";

const TENANT_KEY = "tenant";

// === Tenant Management ===

export function useTenants(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "tenants", filters],
    queryFn: () => services.getTenants(api, filters),
  });
}

export function useCreateTenant() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createTenant(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "tenants"] });
    },
  });
}

export function useTenantByUid(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "tenant-detail", uid],
    queryFn: () => services.getTenantByUid(api, uid),
    enabled: Boolean(uid),
  });
}

export function useUpdateTenant(uid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateTenant(api, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "tenant-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "tenants"] });
    },
  });
}

export function useDeleteTenant() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.deleteTenant(api, uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "tenants"] });
    },
  });
}

export function useActivateTenant() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.activateTenant(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "tenant-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "tenants"] });
    },
  });
}

export function useDeactivateTenant() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.deactivateTenant(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "tenant-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "tenants"] });
    },
  });
}

export function useTenantsCount(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "tenants-count", filters],
    queryFn: () => services.getTenantsCount(api, filters),
  });
}

// === Tenant Settings ===

export function useTenantSettings() {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "settings"],
    queryFn: () => services.getTenantSettings(api),
  });
}

export function useUpdateTenantSettings() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateTenantSettings(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "settings"] });
    },
  });
}

export function useCreateTenantSettings() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createTenantSettings(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "settings"] });
    },
  });
}

export function usePatchTenantSettingsBookingStatus() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.patchTenantSettingsBookingStatus(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "settings"] });
    },
  });
}

export function usePatchTenantSettingsFinanceStatus() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.patchTenantSettingsFinanceStatus(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "settings"] });
    },
  });
}

export function usePatchTenantSettingsHealthCrmStatus() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.patchTenantSettingsHealthCrmStatus(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "settings"] });
    },
  });
}

export function usePatchTenantSettingsKartyStatus() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.patchTenantSettingsKartyStatus(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "settings"] });
    },
  });
}

export function usePatchTenantSettingsLendingCrmStatus() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.patchTenantSettingsLendingCrmStatus(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "settings"] });
    },
  });
}

// === Tenant Signup ===

export function useIssueTenantSignupOtp() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.issueTenantSignupOtp(api, data),
  });
}

export function useVerifyTenantSignupOtp() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.verifyTenantSignupOtp(api, data),
  });
}

// === Tenant Labels ===

export function useTenantLabels(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "labels", filters],
    queryFn: () => services.getTenantLabels(api, filters),
  });
}

export function useCreateTenantLabel() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createTenantLabel(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "labels"] });
    },
  });
}

export function useTenantLabelByUid(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "label-detail", uid],
    queryFn: () => services.getTenantLabelByUid(api, uid),
    enabled: Boolean(uid),
  });
}

export function useUpdateTenantLabel(uid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateTenantLabel(api, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "label-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "labels"] });
    },
  });
}

export function useUpdateTenantLabelStatus() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: string | number }) =>
      services.updateTenantLabelStatus(api, uid, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "label-detail", variables.uid] });
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "labels"] });
    },
  });
}

export function useTenantLabelsCount(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "labels-count", filters],
    queryFn: () => services.getTenantLabelsCount(api, filters),
  });
}

export function useCheckTenantLabelExists(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "labels-exists", filters],
    queryFn: () => services.checkTenantLabelExists(api, filters),
  });
}

export function useTenantLabelsForTenant() {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "labels-for-tenant"],
    queryFn: () => services.getTenantLabelsForTenant(api),
  });
}

// === Tenant Consumer Groups ===

export function useTenantConsumerGroups(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "consumer-groups", filters],
    queryFn: () => services.getTenantConsumerGroups(api, filters),
  });
}

export function useUpdateTenantConsumerGroup() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateTenantConsumerGroup(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-groups"] });
    },
  });
}

export function useCreateTenantConsumerGroup() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createTenantConsumerGroup(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-groups"] });
    },
  });
}

export function useTenantConsumerGroupByUid(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "consumer-group-detail", uid],
    queryFn: () => services.getTenantConsumerGroupByUid(api, uid),
    enabled: Boolean(uid),
  });
}

export function useDisableTenantConsumerGroup() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.disableTenantConsumerGroup(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-group-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-groups"] });
    },
  });
}

export function useEnableTenantConsumerGroup() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.enableTenantConsumerGroup(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-group-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-groups"] });
    },
  });
}

export function useTenantConsumerGroupMemberCount(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "consumer-group-member-count", uid],
    queryFn: () => services.getTenantConsumerGroupMemberCount(api, uid),
    enabled: Boolean(uid),
  });
}

export function useTenantConsumerGroupByName(groupName: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "consumer-group-by-name", groupName],
    queryFn: () => services.getTenantConsumerGroupByName(api, groupName),
    enabled: Boolean(groupName),
  });
}

// === Tenant Consumer Labels ===

export function useCreateTenantConsumerLabel() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createTenantConsumerLabel(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-labels"] });
    },
  });
}

export function useTenantConsumerLabelByUid(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "consumer-label-detail", uid],
    queryFn: () => services.getTenantConsumerLabelByUid(api, uid),
    enabled: Boolean(uid),
  });
}

export function useUpdateTenantConsumerLabel(uid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateTenantConsumerLabel(api, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-label-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-labels"] });
    },
  });
}

export function useDeleteTenantConsumerLabel() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.deleteTenantConsumerLabel(api, uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-labels"] });
    },
  });
}

export function useDisableTenantConsumerLabel() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.disableTenantConsumerLabel(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-label-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-labels"] });
    },
  });
}

export function useEnableTenantConsumerLabel() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.enableTenantConsumerLabel(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-label-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-labels"] });
    },
  });
}

export function useSearchTenantConsumerLabels() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.searchTenantConsumerLabels(api, data),
  });
}

// === Tenant Consumer Management ===

export function useCreateConsumer() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createConsumer(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumers"] });
    },
  });
}

export function useConsumerGroupsMemberId(consumerUid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "consumer-groups-member-id", consumerUid],
    queryFn: () => services.getConsumerGroupsMemberId(api, consumerUid),
    enabled: Boolean(consumerUid),
  });
}

export function useConsumerByUid(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "consumer-detail", uid],
    queryFn: () => services.getConsumerByUid(api, uid),
    enabled: Boolean(uid),
  });
}

export function useUpdateConsumer(uid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateConsumer(api, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumers"] });
    },
  });
}

export function useDeleteConsumer() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.deleteConsumer(api, uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumers"] });
    },
  });
}

export function useActivateConsumer() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.activateConsumer(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumers"] });
    },
  });
}

export function useDeactivateConsumer() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.deactivateConsumer(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumers"] });
    },
  });
}

export function useSendConsumerMessage() {
  const api = useApiScope();
  return useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: unknown }) =>
      services.sendConsumerMessage(api, uid, data),
  });
}

export function useApplyConsumerLabel() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.applyConsumerLabel(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumers"] });
    },
  });
}

export function useExportConsumers() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.exportConsumers(api, data),
  });
}

export function useAddConsumerGroupMembers(groupUid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.addConsumerGroupMembers(api, groupUid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-groups"] });
    },
  });
}

export function useRemoveConsumerGroupMembers(groupUid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: unknown) => services.removeConsumerGroupMembers(api, groupUid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-groups"] });
    },
  });
}

export function useUpdateConsumerGroupsMemberId() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.updateConsumerGroupsMemberId(api, data),
  });
}

export function useCreateConsumerGroupsMemberId() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.createConsumerGroupsMemberId(api, data),
  });
}

export function useSearchConsumerGroupsMembers() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.searchConsumerGroupsMembers(api, data),
  });
}

export function useRemoveConsumerLabel() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.removeConsumerLabel(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumers"] });
    },
  });
}

export function useSearchConsumers() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.searchConsumers(api, data),
  });
}

// === Tenant Consumer Settings ===

export function useTenantConsumerSettings() {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "consumer-settings"],
    queryFn: () => services.getTenantConsumerSettings(api),
  });
}

export function useUpdateTenantConsumerSettings() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateTenantConsumerSettings(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-settings"] });
    },
  });
}

export function useDeleteTenantConsumerSettings() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => services.deleteTenantConsumerSettings(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "consumer-settings"] });
    },
  });
}

// === Tenant Consumer Signup ===

export function useIssueTenantConsumerSignupOtp() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.issueTenantConsumerSignupOtp(api, data),
  });
}

export function useVerifyTenantConsumerSignupOtp() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.verifyTenantConsumerSignupOtp(api, data),
  });
}

// === Departments ===

export function useDepartments(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "departments", filters],
    queryFn: () => services.getDepartments(api, filters),
  });
}

export function useCreateDepartment() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createDepartment(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "departments"] });
    },
  });
}

export function useDepartmentByUid(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "department-detail", uid],
    queryFn: () => services.getDepartmentByUid(api, uid),
    enabled: Boolean(uid),
  });
}

export function useUpdateDepartment(uid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateDepartment(api, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "department-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "departments"] });
    },
  });
}

export function useUpdateDepartmentStatus() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: string | number }) =>
      services.updateDepartmentStatus(api, uid, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "department-detail", variables.uid] });
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "departments"] });
    },
  });
}

export function useDepartmentsCount(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "departments-count", filters],
    queryFn: () => services.getDepartmentsCount(api, filters),
  });
}

export function useDefaultDepartment() {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "department-default"],
    queryFn: () => services.getDefaultDepartment(api),
  });
}

// === Locations ===

export function useLocations(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "locations", filters],
    queryFn: () => services.getLocations(api, filters),
  });
}

export function useCreateLocation() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createLocation(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "locations"] });
    },
  });
}

export function useSetLocationAsBase() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (locationUid: string) => services.setLocationAsBase(api, locationUid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "locations"] });
    },
  });
}

export function useLocationByUid(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "location-detail", uid],
    queryFn: () => services.getLocationByUid(api, uid),
    enabled: Boolean(uid),
  });
}

export function useUpdateLocation(uid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateLocation(api, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "location-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "locations"] });
    },
  });
}

export function useUpdateLocationStatus() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: string | number }) =>
      services.updateLocationStatus(api, uid, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "location-detail", variables.uid] });
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "locations"] });
    },
  });
}

export function useBaseLocation() {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "location-base"],
    queryFn: () => services.getBaseLocation(api),
  });
}

export function useLocationsCount(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "locations-count", filters],
    queryFn: () => services.getLocationsCount(api, filters),
  });
}

export function useLocationById(id: string | number) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "location-id-detail", id],
    queryFn: () => services.getLocationById(api, id),
    enabled: id !== undefined && id !== null,
  });
}

export function useUpdateLocationStatusById() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string | number; status: string | number }) =>
      services.updateLocationStatusById(api, id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "location-id-detail", variables.id] });
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY, "locations"] });
    },
  });
}

// === Countries ===

export function useCountries() {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "countries"],
    queryFn: () => services.getCountries(api),
  });
}

export function useCountryByCode(code: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "country-code", code],
    queryFn: () => services.getCountryByCode(api, code),
    enabled: Boolean(code),
  });
}

export function useCountryByName(name: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "country-name", name],
    queryFn: () => services.getCountryByName(api, name),
    enabled: Boolean(name),
  });
}

// === Currencies ===

export function useCurrencies() {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "currencies"],
    queryFn: () => services.getCurrencies(api),
  });
}

export function useCurrencyByCode(code: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "currency-code", code],
    queryFn: () => services.getCurrencyByCode(api, code),
    enabled: Boolean(code),
  });
}

export function useCurrencyByName(name: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "currency-name", name],
    queryFn: () => services.getCurrencyByName(api, name),
    enabled: Boolean(name),
  });
}

// === Health ===

export function useHealth() {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "health"],
    queryFn: () => services.getHealth(api),
  });
}

export function useHealthAuthServiceTest() {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "health-auth-test"],
    queryFn: () => services.getHealthAuthServiceTest(api),
  });
}

export function usePostHealthAuthServiceTest() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.postHealthAuthServiceTest(api, data),
  });
}

export function useHealthCustomValidation() {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "health-custom-validation"],
    queryFn: () => services.getHealthCustomValidation(api),
  });
}

export function useHealthCustomValidationMultiple() {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "health-custom-validation-multiple"],
    queryFn: () => services.getHealthCustomValidationMultiple(api),
  });
}

// === Audit Logs ===

export function useAuditLogs(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "audit-logs", filters],
    queryFn: () => services.getAuditLogs(api, filters),
  });
}

export function useAuditLogById(id: string | number) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "audit-log-detail", id],
    queryFn: () => services.getAuditLogById(api, id),
    enabled: id !== undefined && id !== null,
  });
}

export function useAuditLogsCount(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "audit-logs-count", filters],
    queryFn: () => services.getAuditLogsCount(api, filters),
  });
}

export function useAuditLogByEventUuid(eventUuid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TENANT_KEY, "audit-log-event-detail", eventUuid],
    queryFn: () => services.getAuditLogByEventUuid(api, eventUuid),
    enabled: Boolean(eventUuid),
  });
}
