import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildScopedDetailQueryKey, buildScopedListQueryKey } from "../../queryKeys";
import { useApiScope } from "../../useApiScope";
import {
  // Original membership CRUD
  getMemberships,
  getMembershipsCount,
  getMembership,
  createMembership,
  updateMembership,
  deleteMembership,
  // Gallery/Attachments
  updateGallery,
  uploadFilesToS3,
  videoaudioS3Upload,
  videoaudioS3UploadStatusUpdate,
  // Locations
  getProviderLocations,
  // Member Types (Subscription Types)
  createSubType,
  updateSubType,
  getMemberTypes,
  getMemberTypeByUid,
  getMemberTypeCount,
  addLabeltoTypes,
  changeMemberTypeStatus,
  // Members
  createMember,
  getMembers,
  getMemberCount,
  getMemberDetailsByUid,
  updateMembers,
  changeMemberStatus,
  changeMemberSubscriptionStatus,
  submitQuestionnaire,
  resubmitQuestionnaire,
  getMemberServiceQuestionaire,
  // Service Types
  createServiceType,
  getServiceTypes,
  getServiceTypeCount,
  getServiceTypeByUid,
  updateServiceType,
  changeServiceTypeStatus,
  // Subscriptions
  getMemberSubscriptionByUid,
  getAllMemberSubscriptions,
  getAllMemberSubscriptionsCount,
  getAllMemberSubscriptionByuid,
  addNewServiceType,
  // Payments
  makeCashPayment,
  Paymentlink,
  // Templates
  getTemplates,
  getTemplatesByuuid,
  getMemberTemplatesByuuid,
  // Services
  createService,
  getServices,
  changeServiceStatus,
  updateService,
  getServiceCount,
  getServiceByUid,
  // Renewals/Assignments
  getPaymentRenewByUid,
  assignService,
  assignMember,
  assignGroupToService,
  getAllMemberServices,
  getAllMemberServicesCount,
  getAllServiceMembers,
  getAllServiceMembersCount,
  changeAssignedServiceStatus,
  // Labels
  getLabelList,
  // Analytics
  getAnalytics,
  getGraphAnalyticsData,
  // Member Groups
  createMemberGroup,
  updateMemberGroup,
  getMemberGroup,
  getMemberGroupCount,
  changeMemberGroupStatus,
  addMemberToGroup,
  getGroupByUid,
  createGroupMemberId,
  updateGroupMemberId,
} from "../services/memberships";
import type { Membership, MembershipFilters, MembershipFormValues } from "../types";

export function useMembershipsList(filters: MembershipFilters & { page: number; pageSize: number }) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedListQueryKey("memberships", scopedApi.apiScope, scopedApi.locationId, filters as unknown as Record<string, unknown>),
    queryFn: () => getMemberships(scopedApi, filters),
  });
}

export function useMembershipsCount(filters: MembershipFilters) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: ["memberships-count", scopedApi.apiScope, scopedApi.locationId, filters],
    queryFn: () => getMembershipsCount(scopedApi, filters),
  });
}

export function useMembershipDetail(membershipId: string) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedDetailQueryKey("memberships", scopedApi.apiScope, scopedApi.locationId, membershipId),
    queryFn: () => getMembership(scopedApi, membershipId),
    enabled: !!membershipId,
  });
}

export function useCreateMembership() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MembershipFormValues) => createMembership(scopedApi, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
    },
  });
}

export function useUpdateMembership() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MembershipFormValues }) => updateMembership(scopedApi, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
    },
  });
}

export function useDeleteMembership() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMembership(scopedApi, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
    },
  });
}

// Gallery/Attachments
export function useUpdateGallery() {
  const scopedApi = useApiScope();
  return useMutation({
    mutationFn: (payload: {}) => updateGallery(scopedApi, payload),
  });
}

export function useUploadFilesToS3() {
  const scopedApi = useApiScope();
  return useMutation({
    mutationFn: (data: any) => uploadFilesToS3(scopedApi, data),
  });
}

export function useVideoaudioS3Upload() {
  const scopedApi = useApiScope();
  return useMutation({
    mutationFn: ({ file, url }: { file: any; url: string }) => videoaudioS3Upload(scopedApi, file, url),
  });
}

export function useVideoaudioS3UploadStatusUpdate() {
  const scopedApi = useApiScope();
  return useMutation({
    mutationFn: ({ status, id }: { status: string; id: string }) => videoaudioS3UploadStatusUpdate(scopedApi, status, id),
  });
}

// Locations
export function useProviderLocations(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedListQueryKey("provider-locations", scopedApi.apiScope, scopedApi.locationId, filter),
    queryFn: () => getProviderLocations(scopedApi, filter),
  });
}

// Member Types (Subscription Types)
export function useCreateSubType() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createSubType(scopedApi, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-types"] });
    },
  });
}

export function useUpdateSubType() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateSubType(scopedApi, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-types"] });
    },
  });
}

export function useMemberTypes(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedListQueryKey("member-types", scopedApi.apiScope, scopedApi.locationId, filter),
    queryFn: () => getMemberTypes(scopedApi, filter),
  });
}

export function useMemberTypeByUid(uid: string) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedDetailQueryKey("member-types", scopedApi.apiScope, scopedApi.locationId, uid),
    queryFn: () => getMemberTypeByUid(scopedApi, uid),
    enabled: !!uid,
  });
}

export function useMemberTypeCount(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["member-type-count", scopedApi.apiScope, scopedApi.locationId, filter],
    queryFn: () => getMemberTypeCount(scopedApi, filter),
  });
}

export function useAddLabeltoTypes() {
  const scopedApi = useApiScope();
  return useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: any }) => addLabeltoTypes(scopedApi, uid, data),
  });
}

export function useChangeMemberTypeStatus() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, statusId }: { uid: string; statusId: string }) => changeMemberTypeStatus(scopedApi, uid, statusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-types"] });
    },
  });
}

// Members
export function useCreateMember() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createMember(scopedApi, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useMembers(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedListQueryKey("members", scopedApi.apiScope, scopedApi.locationId, filter),
    queryFn: () => getMembers(scopedApi, filter),
    placeholderData: undefined,
  });
}

export function useMemberCount(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["member-count", scopedApi.apiScope, scopedApi.locationId, filter],
    queryFn: () => getMemberCount(scopedApi, filter),
    placeholderData: undefined,
  });
}

export function useMemberDetailsByUid(uid: string) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedDetailQueryKey("members", scopedApi.apiScope, scopedApi.locationId, uid),
    queryFn: () => getMemberDetailsByUid(scopedApi, uid),
    enabled: !!uid,
  });
}

export function useUpdateMembers() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateMembers(scopedApi, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useChangeMemberStatus() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, statusId }: { uid: string; statusId: string }) => changeMemberStatus(scopedApi, uid, statusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useChangeMemberSubscriptionStatus() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, statusId }: { uid: string; statusId: string }) => changeMemberSubscriptionStatus(scopedApi, uid, statusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useSubmitQuestionnaire() {
  const scopedApi = useApiScope();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => submitQuestionnaire(scopedApi, id, data),
  });
}

export function useResubmitQuestionnaire() {
  const scopedApi = useApiScope();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => resubmitQuestionnaire(scopedApi, id, data),
  });
}

export function useMemberServiceQuestionaire(serviceId: string, channel: string) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["member-service-questionnaire", scopedApi.apiScope, scopedApi.locationId, serviceId, channel],
    queryFn: () => getMemberServiceQuestionaire(scopedApi, serviceId, channel),
    enabled: !!serviceId && !!channel,
  });
}

// Service Types
export function useCreateServiceType() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createServiceType(scopedApi, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-types"] });
    },
  });
}

export function useServiceTypes(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedListQueryKey("service-types", scopedApi.apiScope, scopedApi.locationId, filter),
    queryFn: () => getServiceTypes(scopedApi, filter),
  });
}

export function useServiceTypeCount(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["service-type-count", scopedApi.apiScope, scopedApi.locationId, filter],
    queryFn: () => getServiceTypeCount(scopedApi, filter),
  });
}

export function useServiceTypeByUid(uid: string) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedDetailQueryKey("service-types", scopedApi.apiScope, scopedApi.locationId, uid),
    queryFn: () => getServiceTypeByUid(scopedApi, uid),
    enabled: !!uid,
  });
}

export function useUpdateServiceType() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateServiceType(scopedApi, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-types"] });
    },
  });
}

export function useChangeServiceTypeStatus() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, statusId }: { uid: string; statusId: string }) => changeServiceTypeStatus(scopedApi, uid, statusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-types"] });
    },
  });
}

// Subscriptions
export function useMemberSubscriptionByUid(uid: string) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedDetailQueryKey("member-subscriptions", scopedApi.apiScope, scopedApi.locationId, uid),
    queryFn: () => getMemberSubscriptionByUid(scopedApi, uid),
    enabled: !!uid,
  });
}

export function useAllMemberSubscriptions(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedListQueryKey("all-member-subscriptions", scopedApi.apiScope, scopedApi.locationId, filter),
    queryFn: () => getAllMemberSubscriptions(scopedApi, filter),
  });
}

export function useAllMemberSubscriptionsCount(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["all-member-subscriptions-count", scopedApi.apiScope, scopedApi.locationId, filter],
    queryFn: () => getAllMemberSubscriptionsCount(scopedApi, filter),
  });
}

export function useAllMemberSubscriptionByuid(uid: string) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedDetailQueryKey("all-member-subscription", scopedApi.apiScope, scopedApi.locationId, uid),
    queryFn: () => getAllMemberSubscriptionByuid(scopedApi, uid),
    enabled: !!uid,
  });
}

export function useAddNewServiceType() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => addNewServiceType(scopedApi, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-subscriptions"] });
    },
  });
}

// Payments
export function useMakeCashPayment() {
  const scopedApi = useApiScope();
  return useMutation({
    mutationFn: (data: any) => makeCashPayment(scopedApi, data),
  });
}

export function usePaymentlink() {
  const scopedApi = useApiScope();
  return useMutation({
    mutationFn: (data: any) => Paymentlink(scopedApi, data),
  });
}

// Templates
export function useTemplates(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedListQueryKey("templates", scopedApi.apiScope, scopedApi.locationId, filter),
    queryFn: () => getTemplates(scopedApi, filter),
  });
}

export function useTemplatesByuuid(tempUid: string) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedDetailQueryKey("templates", scopedApi.apiScope, scopedApi.locationId, tempUid),
    queryFn: () => getTemplatesByuuid(scopedApi, tempUid),
    enabled: !!tempUid,
  });
}

export function useMemberTemplatesByuuid(tempUid: string) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedDetailQueryKey("member-templates", scopedApi.apiScope, scopedApi.locationId, tempUid),
    queryFn: () => getMemberTemplatesByuuid(scopedApi, tempUid),
    enabled: !!tempUid,
  });
}

// Services
export function useCreateService() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createService(scopedApi, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

export function useServices(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedListQueryKey("services", scopedApi.apiScope, scopedApi.locationId, filter),
    queryFn: () => getServices(scopedApi, filter),
    placeholderData: undefined,
  });
}

export function useChangeServiceStatus() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, statusId }: { uid: string; statusId: string }) => changeServiceStatus(scopedApi, uid, statusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

export function useUpdateService() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateService(scopedApi, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

export function useServiceCount(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["service-count", scopedApi.apiScope, scopedApi.locationId, filter],
    queryFn: () => getServiceCount(scopedApi, filter),
    placeholderData: undefined,
  });
}

export function useServiceByUid(uid: string) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedDetailQueryKey("services", scopedApi.apiScope, scopedApi.locationId, uid),
    queryFn: () => getServiceByUid(scopedApi, uid),
    enabled: !!uid,
  });
}

// Renewals/Assignments
export function useGetPaymentRenewByUid() {
  const scopedApi = useApiScope();
  return useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: any }) => getPaymentRenewByUid(scopedApi, uid, data),
  });
}

export function useAssignService() {
  const scopedApi = useApiScope();
  return useMutation({
    mutationFn: (data: any) => assignService(scopedApi, data),
  });
}

export function useAssignMember() {
  const scopedApi = useApiScope();
  return useMutation({
    mutationFn: (data: any) => assignMember(scopedApi, data),
  });
}

export function useAssignGroupToService() {
  const scopedApi = useApiScope();
  return useMutation({
    mutationFn: (data: any) => assignGroupToService(scopedApi, data),
  });
}

export function useAllMemberServices(id: string, from: number, count: number) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["member-services", scopedApi.apiScope, scopedApi.locationId, id, from, count],
    queryFn: () => getAllMemberServices(scopedApi, id, from, count),
    enabled: !!id,
  });
}

export function useAllMemberServicesCount(id: string) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["member-services-count", scopedApi.apiScope, scopedApi.locationId, id],
    queryFn: () => getAllMemberServicesCount(scopedApi, id),
    enabled: !!id,
  });
}

export function useAllServiceMembers(id: string, from: number, count: number) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["service-members", scopedApi.apiScope, scopedApi.locationId, id, from, count],
    queryFn: () => getAllServiceMembers(scopedApi, id, from, count),
    enabled: !!id,
  });
}

export function useAllServiceMembersCount(id: string) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["service-members-count", scopedApi.apiScope, scopedApi.locationId, id],
    queryFn: () => getAllServiceMembersCount(scopedApi, id),
    enabled: !!id,
  });
}

export function useChangeAssignedServiceStatus() {
  const scopedApi = useApiScope();
  return useMutation({
    mutationFn: ({ memberId, uid, status }: { memberId: string; uid: string; status: string }) =>
      changeAssignedServiceStatus(scopedApi, memberId, uid, status),
  });
}

// Labels
export function useLabelList() {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["label-list", scopedApi.apiScope, scopedApi.locationId],
    queryFn: () => getLabelList(scopedApi),
  });
}

// Analytics
export function useAnalytics(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["analytics", scopedApi.apiScope, scopedApi.locationId, filter],
    queryFn: () => getAnalytics(scopedApi, filter),
  });
}

export function useGraphAnalyticsData(payload: any[]) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["analytics-graph", scopedApi.apiScope, scopedApi.locationId, payload],
    queryFn: () => getGraphAnalyticsData(scopedApi, payload),
    enabled: payload.length > 0,
  });
}

// Member Groups
export function useCreateMemberGroup() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createMemberGroup(scopedApi, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-groups"] });
    },
  });
}

export function useUpdateMemberGroup() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberGroupUid, data }: { memberGroupUid: string; data: any }) =>
      updateMemberGroup(scopedApi, memberGroupUid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-groups"] });
    },
  });
}

export function useMemberGroup(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedListQueryKey("member-groups", scopedApi.apiScope, scopedApi.locationId, filter),
    queryFn: () => getMemberGroup(scopedApi, filter),
  });
}

export function useMemberGroupCount(filter: {} = {}) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: ["member-group-count", scopedApi.apiScope, scopedApi.locationId, filter],
    queryFn: () => getMemberGroupCount(scopedApi, filter),
  });
}

export function useChangeMemberGroupStatus() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, statusId }: { groupId: string; statusId: string }) =>
      changeMemberGroupStatus(scopedApi, groupId, statusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-groups"] });
    },
  });
}

export function useAddMemberToGroup() {
  const scopedApi = useApiScope();
  return useMutation({
    mutationFn: (data: any) => addMemberToGroup(scopedApi, data),
  });
}

export function useGroupByUid(uid: string) {
  const scopedApi = useApiScope();
  return useQuery({
    queryKey: buildScopedDetailQueryKey("member-groups", scopedApi.apiScope, scopedApi.locationId, uid),
    queryFn: () => getGroupByUid(scopedApi, uid),
    enabled: !!uid,
  });
}

export function useCreateGroupMemberId() {
  const scopedApi = useApiScope();
  return useMutation({
    mutationFn: (body: any) => createGroupMemberId(scopedApi, body),
  });
}

export function useUpdateGroupMemberId() {
  const scopedApi = useApiScope();
  return useMutation({
    mutationFn: (body: any) => updateGroupMemberId(scopedApi, body),
  });
}
