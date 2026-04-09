import type { Membership, MembershipFilters, MembershipFormValues } from "../types";

interface ScopedApi {
  get: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
  post: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  put: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  delete: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
}

export interface MembershipListResponse {
  data: Membership[];
  total: number;
}

// Gallery/Attachments
export async function updateGallery(scopedApi: ScopedApi, payload: {}): Promise<any> {
  return scopedApi.put("provider/spitem/attachments", payload);
}

export async function uploadFilesToS3(scopedApi: ScopedApi, data: any): Promise<any> {
  return scopedApi.post("provider/fileShare/upload", data);
}

export async function videoaudioS3Upload(scopedApi: ScopedApi, file: any, url: string): Promise<any> {
  return scopedApi.put(url, file);
}

export async function videoaudioS3UploadStatusUpdate(scopedApi: ScopedApi, status: string, id: string): Promise<any> {
  return scopedApi.put(`provider/fileShare/upload/${status}/${id}`, null);
}

// Locations
export async function getProviderLocations(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return scopedApi.get("provider/locations", { params: filter });
}

// Member Types (Subscription Types)
export async function createSubType(scopedApi: ScopedApi, data: any): Promise<any> {
  return scopedApi.post("provider/membership/subscriptiontype", data);
}

export async function updateSubType(scopedApi: ScopedApi, id: string, data: any): Promise<any> {
  return scopedApi.put(`provider/membership/subscriptiontype/${id}`, data);
}

export async function getMemberTypes(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return scopedApi.get("provider/membership/subscriptiontype", { params: filter });
}

export async function getMemberTypeByUid(scopedApi: ScopedApi, uid: string): Promise<any> {
  return scopedApi.get(`provider/membership/subscriptiontype/${uid}`);
}

export async function getMemberTypeCount(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return scopedApi.get("provider/membership/subscriptiontype/count", { params: filter });
}

export async function addLabeltoTypes(scopedApi: ScopedApi, uid: string, data: any): Promise<any> {
  return scopedApi.put(`provider/membership/subscriptiontype/applyLabel/${uid}`, data);
}

export async function changeMemberTypeStatus(scopedApi: ScopedApi, uid: string, statusId: string): Promise<any> {
  return scopedApi.put(`provider/membership/subscriptiontype/${uid}/status/${statusId}`, null);
}

// Members
export async function createMember(scopedApi: ScopedApi, data: any): Promise<any> {
  return scopedApi.post("provider/membership/member", data);
}

export async function getMembers(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return scopedApi.get("provider/membership", { params: filter });
}

export async function getMemberCount(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return scopedApi.get("provider/membership/count", { params: filter });
}

export async function getMemberDetailsByUid(scopedApi: ScopedApi, uid: string): Promise<any> {
  return scopedApi.get(`provider/membership/member/${uid}`);
}

export async function updateMembers(scopedApi: ScopedApi, id: string, data: any): Promise<any> {
  return scopedApi.put(`provider/membership/${id}`, data);
}

export async function changeMemberStatus(scopedApi: ScopedApi, uid: string, statusId: string): Promise<any> {
  return scopedApi.put(`provider/membership/${uid}/status/${statusId}`, null);
}

export async function changeMemberSubscriptionStatus(scopedApi: ScopedApi, uid: string, statusId: string): Promise<any> {
  return scopedApi.put(`provider/membership/member/subscription/${uid}/status/${statusId}`, null);
}

export async function submitQuestionnaire(scopedApi: ScopedApi, id: string, data: any): Promise<any> {
  return scopedApi.post(`provider/membership/questionnaire/submit/${id}`, data);
}

export async function resubmitQuestionnaire(scopedApi: ScopedApi, id: string, data: any): Promise<any> {
  return scopedApi.post(`provider/membership/questionnaire/resubmit/${id}`, data);
}

export async function getMemberServiceQuestionaire(scopedApi: ScopedApi, serviceId: string, channel: string): Promise<any> {
  return scopedApi.get(`provider/questionnaire/memberservice/${serviceId}/${channel}`);
}

// Service Types
export async function createServiceType(scopedApi: ScopedApi, data: any): Promise<any> {
  return scopedApi.post("provider/membership/servicecategory", data);
}

export async function getServiceTypes(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return scopedApi.get("provider/membership/servicecategory", { params: filter });
}

export async function getServiceTypeCount(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return scopedApi.get("provider/membership/servicecategory/count", { params: filter });
}

export async function getServiceTypeByUid(scopedApi: ScopedApi, uid: string): Promise<any> {
  return scopedApi.get(`provider/membership/servicecategory/${uid}`);
}

export async function updateServiceType(scopedApi: ScopedApi, id: string, data: any): Promise<any> {
  return scopedApi.put(`provider/membership/servicecategory/${id}`, data);
}

export async function changeServiceTypeStatus(scopedApi: ScopedApi, uid: string, statusId: string): Promise<any> {
  return scopedApi.put(`provider/membership/servicecategory/${uid}/status/${statusId}`, null);
}

// Subscriptions
export async function getMemberSubscriptionByUid(scopedApi: ScopedApi, uid: string): Promise<any> {
  return scopedApi.get(`provider/membership/member/subscription/${uid}`);
}

export async function getAllMemberSubscriptions(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return scopedApi.get("provider/membership/subscription", { params: filter });
}

export async function getAllMemberSubscriptionsCount(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return scopedApi.get("provider/membership/subscription/count", { params: filter });
}

export async function getAllMemberSubscriptionByuid(scopedApi: ScopedApi, uid: string): Promise<any> {
  return scopedApi.get(`provider/membership/subscription/${uid}`);
}

export async function addNewServiceType(scopedApi: ScopedApi, data: any): Promise<any> {
  return scopedApi.post("provider/membership/member/subscription", data);
}

// Payments
export async function makeCashPayment(scopedApi: ScopedApi, data: any): Promise<any> {
  return scopedApi.post("provider/membership/payment/acceptPayment", data);
}

export async function Paymentlink(scopedApi: ScopedApi, data: any): Promise<any> {
  return scopedApi.post("provider/membership/payment/createLink", data);
}

// Templates
export async function getTemplates(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return scopedApi.get("provider/membership/template", { params: filter });
}

export async function getTemplatesByuuid(scopedApi: ScopedApi, tempUid: string): Promise<any> {
  return scopedApi.get(`provider/membership/template/servicecategory/${tempUid}`);
}

export async function getMemberTemplatesByuuid(scopedApi: ScopedApi, tempUid: string): Promise<any> {
  return scopedApi.get(`provider/membership/template/${tempUid}`);
}

// Services
export async function createService(scopedApi: ScopedApi, data: any): Promise<any> {
  return scopedApi.post("provider/membership/service", data);
}

export async function getServices(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return scopedApi.get("provider/membership/service", { params: filter });
}

export async function changeServiceStatus(scopedApi: ScopedApi, uid: string, statusId: string): Promise<any> {
  return scopedApi.put(`provider/membership/service/${uid}/status/${statusId}`, null);
}

export async function updateService(scopedApi: ScopedApi, id: string, data: any): Promise<any> {
  return scopedApi.put(`provider/membership/service/${id}`, data);
}

export async function getServiceCount(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return scopedApi.get("provider/membership/service/count", { params: filter });
}

export async function getServiceByUid(scopedApi: ScopedApi, uid: string): Promise<any> {
  return scopedApi.get(`provider/membership/service/${uid}`);
}

// Renewals/Assignments
export async function getPaymentRenewByUid(scopedApi: ScopedApi, uid: string, data: any): Promise<any> {
  return scopedApi.put(`provider/membership/member/subscription/renew/${uid}`, data);
}

export async function assignService(scopedApi: ScopedApi, data: any): Promise<any> {
  return scopedApi.post("provider/membership/member/transaction/assign", data);
}

export async function assignMember(scopedApi: ScopedApi, data: any): Promise<any> {
  return scopedApi.post("provider/membership/service/transaction/assign", data);
}

export async function assignGroupToService(scopedApi: ScopedApi, data: any): Promise<any> {
  return scopedApi.post("provider/membership/service/transaction/assign/group", data);
}

export async function getAllMemberServices(scopedApi: ScopedApi, id: string, from: number, count: number): Promise<any> {
  return scopedApi.get(`provider/membership/service/member/${id}/from/${from}/count/${count}`);
}

export async function getAllMemberServicesCount(scopedApi: ScopedApi, id: string): Promise<any> {
  return scopedApi.get(`provider/membership/service/member/${id}/count`);
}

export async function getAllServiceMembers(scopedApi: ScopedApi, id: string, from: number, count: number): Promise<any> {
  return scopedApi.get(`provider/membership/member/service/${id}/from/${from}/count/${count}`);
}

export async function getAllServiceMembersCount(scopedApi: ScopedApi, id: string): Promise<any> {
  return scopedApi.get(`provider/membership/member/service/${id}/count`);
}

export async function changeAssignedServiceStatus(scopedApi: ScopedApi, memberId: string, uid: string, status: string): Promise<any> {
  return scopedApi.put(`provider/membership/transaction/member/${memberId}/service/${uid}/status/${status}`, null);
}

// Labels
export async function getLabelList(scopedApi: ScopedApi): Promise<any> {
  return scopedApi.get("provider/waitlist/label");
}

// Analytics
export async function getAnalytics(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return scopedApi.get("provider/membership/analytics", { params: filter });
}

export async function getGraphAnalyticsData(scopedApi: ScopedApi, data: any[]): Promise<any[]> {
  return Promise.all(
    data.map((item) =>
      scopedApi.put("provider/membership/analytics/graph", item).then((response) => response.data)
    )
  );
}

// Member Groups
export async function createMemberGroup(scopedApi: ScopedApi, data: any): Promise<any> {
  return scopedApi.post("provider/membership/membergroup", data);
}

export async function updateMemberGroup(scopedApi: ScopedApi, memberGroupUid: string, data: any): Promise<any> {
  return scopedApi.put(`provider/membership/membergroup/${memberGroupUid}`, data);
}

export async function getMemberGroup(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return scopedApi.get("provider/membership/membergroup", { params: filter });
}

export async function getMemberGroupCount(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return scopedApi.get("provider/membership/membergroup/count", { params: filter });
}

export async function changeMemberGroupStatus(scopedApi: ScopedApi, groupId: string, statusId: string): Promise<any> {
  return scopedApi.put(`provider/membership/membergroup/${groupId}/status/${statusId}`, null);
}

export async function addMemberToGroup(scopedApi: ScopedApi, data: any): Promise<any> {
  return scopedApi.post("provider/membership/member/addGroup", data);
}

export async function getGroupByUid(scopedApi: ScopedApi, uid: string): Promise<any> {
  return scopedApi.get(`provider/membership/membergroup/${uid}`);
}

export async function createGroupMemberId(scopedApi: ScopedApi, body: any): Promise<any> {
  const { groupName, memberId, groupmemId } = body;
  return scopedApi.post(`provider/membership/groupMemId/${groupName}/${memberId}/${groupmemId}`);
}

export async function updateGroupMemberId(scopedApi: ScopedApi, body: any): Promise<any> {
  const { groupName, memberId, groupmemId } = body;
  return scopedApi.put(`provider/membership/groupMemId/${groupName}/${memberId}/${groupmemId}`);
}

// Original membership CRUD (keeping for compatibility)
export async function getMemberships(
  scopedApi: ScopedApi,
  filters: MembershipFilters & { page: number; pageSize: number }
): Promise<Membership[]> {
  const params: any = {
    from: (filters.page - 1) * filters.pageSize, // Convert page to from offset
    count: filters.pageSize,
  };

  if (filters.search) {
    params.search = filters.search;
  }

  if (filters.status) {
    params.status = filters.status;
  }

  return scopedApi.get<Membership[]>("provider/membership", { params }).then(res => res.data);
}

export async function getMembershipsCount(
  scopedApi: ScopedApi,
  filters: MembershipFilters
): Promise<number> {
  const params: any = {};

  if (filters.search) {
    params.search = filters.search;
  }

  if (filters.status) {
    params.status = filters.status;
  }

  return scopedApi.get<number>("provider/membership/count", { params }).then(res => res.data);
}

export async function getMembership(scopedApi: ScopedApi, id: string): Promise<Membership> {
  return scopedApi.get<Membership>(`provider/membership/${id}`).then(res => res.data);
}

export async function createMembership(scopedApi: ScopedApi, data: MembershipFormValues): Promise<Membership> {
  return scopedApi.post<Membership>("provider/membership", data).then(res => res.data);
}

export async function updateMembership(scopedApi: ScopedApi, id: string, data: MembershipFormValues): Promise<Membership> {
  return scopedApi.put<Membership>(`provider/membership/${id}`, data).then(res => res.data);
}

export async function deleteMembership(scopedApi: ScopedApi, id: string): Promise<void> {
  return scopedApi.delete(`provider/membership/${id}`).then(() => undefined);
}
