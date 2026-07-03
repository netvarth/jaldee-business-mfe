import type { Membership, MembershipFilters, MembershipFormValues } from "../types";
import { BASE_SERVICE_ENDPOINTS, buildBaseServiceUrl } from "../../serviceUrls";

interface ScopedApi {
  get: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
  post: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  put: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  patch: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  delete: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
}

export interface MembershipListResponse {
  data: Membership[];
  total: number;
}

const MEMBERSHIP_BASE = buildBaseServiceUrl("/base-service/v1/api/tenant/membership");
const MEMBERSHIP_SERVICE_BASE = `${MEMBERSHIP_BASE}/service/api`;
const FILE_UPLOAD_BASE = buildBaseServiceUrl("/base-service/v1/api/provider/fileShare/upload");
const MEMBERSHIP_REQUEST_CONFIG = { skipLocationScope: true } as const;

const membershipEndpoints = {
  members: {
    create: `${MEMBERSHIP_BASE}/member`,
    detail: (uid: string) => `${MEMBERSHIP_BASE}/member/${encodeURIComponent(uid)}`,
    update: (uid: string) => `${MEMBERSHIP_BASE}/member/${encodeURIComponent(uid)}`,
    status: (uid: string, status: string) => `${MEMBERSHIP_BASE}/member/${encodeURIComponent(uid)}/status/${encodeURIComponent(status)}`,
    approval: (uid: string, status: string) => `${MEMBERSHIP_BASE}/member/${encodeURIComponent(uid)}/approval/${encodeURIComponent(status)}`,
    search: `${MEMBERSHIP_BASE}/member/search`,
  },
  consumerMembers: {
    create: `${MEMBERSHIP_BASE}/consumer/members`,
    detail: (uid: string) => `${MEMBERSHIP_BASE}/consumer/members/${encodeURIComponent(uid)}`,
    subscriptionTypesSearch: `${MEMBERSHIP_BASE}/consumer/subscription-types/search`,
  },
  subscriptionTypes: {
    create: `${MEMBERSHIP_BASE}/subscription-type`,
    detail: (uid: string) => `${MEMBERSHIP_BASE}/subscription-type/${encodeURIComponent(uid)}`,
    update: (uid: string) => `${MEMBERSHIP_BASE}/subscription-type/${encodeURIComponent(uid)}`,
    status: (uid: string, status: string) => `${MEMBERSHIP_BASE}/subscription-type/${encodeURIComponent(uid)}/status/${encodeURIComponent(status)}`,
    search: `${MEMBERSHIP_BASE}/subscription-type/search`,
  },
  subscriptions: {
    create: `${MEMBERSHIP_BASE}/subscription`,
    detail: (uid: string) => `${MEMBERSHIP_BASE}/subscription/${encodeURIComponent(uid)}`,
    status: (uid: string, status: string) => `${MEMBERSHIP_BASE}/subscription/${encodeURIComponent(uid)}/status/${encodeURIComponent(status)}`,
    search: `${MEMBERSHIP_BASE}/subscription/search`,
  },
  invoicePayments: {
    update: (paymentUid: string) => `${MEMBERSHIP_BASE}/invoice/payment/${encodeURIComponent(paymentUid)}/update`,
    history: (subscriptionUid: string) => `${MEMBERSHIP_BASE}/invoice/payment/${encodeURIComponent(subscriptionUid)}/history`,
    historyAll: (subscriptionUid: string) => `${MEMBERSHIP_BASE}/invoice/payment/${encodeURIComponent(subscriptionUid)}/history/all`,
    pay: (subscriptionUid: string) => `${MEMBERSHIP_BASE}/invoice/payment/${encodeURIComponent(subscriptionUid)}/pay`,
    payCash: (subscriptionUid: string) => `${MEMBERSHIP_BASE}/invoice/payment/${encodeURIComponent(subscriptionUid)}/pay/cash`,
  },
  payments: {
    directCreate: (subscriptionUid: string) => `${MEMBERSHIP_BASE}/payment/${encodeURIComponent(subscriptionUid)}/direct`,
    directUpdate: (paymentUid: string) => `${MEMBERSHIP_BASE}/payment/${encodeURIComponent(paymentUid)}/direct`,
    history: (subscriptionUid: string) => `${MEMBERSHIP_BASE}/payment/${encodeURIComponent(subscriptionUid)}/history`,
    historyAll: (subscriptionUid: string) => `${MEMBERSHIP_BASE}/payment/${encodeURIComponent(subscriptionUid)}/history/all`,
  },
  groups: {
    create: `${MEMBERSHIP_BASE}/group`,
    detail: (uid: string) => `${MEMBERSHIP_BASE}/group/${encodeURIComponent(uid)}`,
    update: (uid: string) => `${MEMBERSHIP_BASE}/group/${encodeURIComponent(uid)}`,
    status: (uid: string, status: string) => `${MEMBERSHIP_BASE}/group/${encodeURIComponent(uid)}/status/${encodeURIComponent(status)}`,
    search: `${MEMBERSHIP_BASE}/group/search`,
  },
  templates: {
    create: `${MEMBERSHIP_BASE}/template`,
    detail: (uid: string) => `${MEMBERSHIP_BASE}/template/${encodeURIComponent(uid)}`,
    update: (uid: string) => `${MEMBERSHIP_BASE}/template/${encodeURIComponent(uid)}`,
    status: (uid: string, status: string) => `${MEMBERSHIP_BASE}/template/${encodeURIComponent(uid)}/status/${encodeURIComponent(status)}`,
    search: `${MEMBERSHIP_BASE}/template/search`,
  },
  settings: {
    get: `${MEMBERSHIP_BASE}/settings`,
    update: `${MEMBERSHIP_BASE}/settings`,
  },
  serviceCategories: {
    create: `${MEMBERSHIP_BASE}/service/categories`,
    detail: (uid: string) => `${MEMBERSHIP_BASE}/service/categories/${encodeURIComponent(uid)}`,
    update: (uid: string) => `${MEMBERSHIP_BASE}/service/categories/${encodeURIComponent(uid)}`,
    status: (uid: string, status: string) => `${MEMBERSHIP_BASE}/service/categories/${encodeURIComponent(uid)}/status/${encodeURIComponent(status)}`,
    search: `${MEMBERSHIP_BASE}/service/categories/search`,
  },
  services: {
    create: `${MEMBERSHIP_BASE}/service`,
    detail: (uid: string) => `${MEMBERSHIP_BASE}/service/${encodeURIComponent(uid)}`,
    update: (uid: string) => `${MEMBERSHIP_BASE}/service/${encodeURIComponent(uid)}`,
    status: (uid: string, status: string) => `${MEMBERSHIP_BASE}/service/${encodeURIComponent(uid)}/status/${encodeURIComponent(status)}`,
    search: `${MEMBERSHIP_BASE}/service/search`,
    autoExpire: `${MEMBERSHIP_BASE}/service/auto-expire`,
    assignGroups: (serviceUid: string) => `${MEMBERSHIP_BASE}/service/${encodeURIComponent(serviceUid)}/assign-groups`,
    assignMembers: (serviceUid: string) => `${MEMBERSHIP_BASE}/service/${encodeURIComponent(serviceUid)}/assign-members`,
    membersCount: (serviceUid: string) => `${MEMBERSHIP_BASE}/service/${encodeURIComponent(serviceUid)}/members/count`,
  },
  memberServices: {
    assignServices: (memberUid: string) => `${MEMBERSHIP_BASE}/service/members/${encodeURIComponent(memberUid)}/assign-services`,
    services: (memberUid: string) => `${MEMBERSHIP_BASE}/service/members/${encodeURIComponent(memberUid)}/services`,
    servicesCount: (memberUid: string) => `${MEMBERSHIP_BASE}/service/members/${encodeURIComponent(memberUid)}/services/count`,
  },
  serviceTransactions: {
    create: `${MEMBERSHIP_SERVICE_BASE}/service-transactions`,
    detail: (uid: string) => `${MEMBERSHIP_SERVICE_BASE}/service-transactions/${encodeURIComponent(uid)}`,
    status: (uid: string, status: string) => `${MEMBERSHIP_SERVICE_BASE}/service-transactions/${encodeURIComponent(uid)}/status/${encodeURIComponent(status)}`,
    search: `${MEMBERSHIP_SERVICE_BASE}/service-transactions/search`,
  },
} as const;

function withPagination(filter: Record<string, unknown> = {}, from?: number, count?: number) {
  return {
    ...filter,
    ...(from !== undefined ? { from } : {}),
    ...(count !== undefined ? { count } : {}),
  };
}

function postMembership<T = any>(scopedApi: ScopedApi, path: string, data?: unknown) {
  return scopedApi.post<T>(path, data, MEMBERSHIP_REQUEST_CONFIG);
}

// Attachments
export async function uploadFilesToS3(scopedApi: ScopedApi, data: any): Promise<any> {
  return scopedApi.post(FILE_UPLOAD_BASE, data, MEMBERSHIP_REQUEST_CONFIG);
}

export async function videoaudioS3Upload(scopedApi: ScopedApi, file: any, url: string): Promise<any> {
  return scopedApi.put(url, file);
}

export async function videoaudioS3UploadStatusUpdate(scopedApi: ScopedApi, status: string, id: string): Promise<any> {
  return scopedApi.put(
    `${FILE_UPLOAD_BASE}/${encodeURIComponent(status)}/${encodeURIComponent(id)}`,
    null,
    MEMBERSHIP_REQUEST_CONFIG
  );
}

// Locations
export async function getProviderLocations(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return scopedApi.get(
    buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.locations.search),
    { params: { page: 0, size: 100, ...filter }, ...MEMBERSHIP_REQUEST_CONFIG }
  );
}

// Member Types (Subscription Types)
export async function createSubType(scopedApi: ScopedApi, data: any): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.subscriptionTypes.create, data);
}

export async function updateSubType(scopedApi: ScopedApi, id: string, data: any): Promise<any> {
  return scopedApi.put(membershipEndpoints.subscriptionTypes.update(id), data, MEMBERSHIP_REQUEST_CONFIG);
}

export async function getMemberTypes(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.subscriptionTypes.search, filter);
}

export async function getMemberTypeByUid(scopedApi: ScopedApi, uid: string): Promise<any> {
  return scopedApi.get(membershipEndpoints.subscriptionTypes.detail(uid), MEMBERSHIP_REQUEST_CONFIG);
}

export async function getMemberTypeCount(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.subscriptionTypes.search, filter);
}

export async function addLabeltoTypes(scopedApi: ScopedApi, uid: string, data: any): Promise<any> {
  return scopedApi.put(membershipEndpoints.subscriptionTypes.update(uid), data, MEMBERSHIP_REQUEST_CONFIG);
}

export async function changeMemberTypeStatus(scopedApi: ScopedApi, uid: string, statusId: string): Promise<any> {
  return scopedApi.patch(membershipEndpoints.subscriptionTypes.status(uid, statusId), null, MEMBERSHIP_REQUEST_CONFIG);
}

// Members
export async function createMember(scopedApi: ScopedApi, data: any): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.members.create, data);
}

export async function getMembers(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.members.search, filter);
}

export async function getMemberCount(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.members.search, filter);
}

export async function getMemberDetailsByUid(scopedApi: ScopedApi, uid: string): Promise<any> {
  return scopedApi.get(membershipEndpoints.members.detail(uid), MEMBERSHIP_REQUEST_CONFIG);
}

export async function updateMembers(scopedApi: ScopedApi, id: string, data: any): Promise<any> {
  return scopedApi.put(membershipEndpoints.members.update(id), data, MEMBERSHIP_REQUEST_CONFIG);
}

export async function changeMemberStatus(scopedApi: ScopedApi, uid: string, statusId: string): Promise<any> {
  return scopedApi.patch(membershipEndpoints.members.status(uid, statusId), null, MEMBERSHIP_REQUEST_CONFIG);
}

export async function changeMemberSubscriptionStatus(scopedApi: ScopedApi, uid: string, statusId: string): Promise<any> {
  return scopedApi.patch(membershipEndpoints.subscriptions.status(uid, statusId), null, MEMBERSHIP_REQUEST_CONFIG);
}

export async function submitQuestionnaire(scopedApi: ScopedApi, id: string, data: any): Promise<any> {
  return postMembership(scopedApi, `${MEMBERSHIP_BASE}/questionnaire/submit/${encodeURIComponent(id)}`, data);
}

export async function resubmitQuestionnaire(scopedApi: ScopedApi, id: string, data: any): Promise<any> {
  return postMembership(scopedApi, `${MEMBERSHIP_BASE}/questionnaire/resubmit/${encodeURIComponent(id)}`, data);
}

export async function getMemberServiceQuestionaire(scopedApi: ScopedApi, serviceId: string, channel: string): Promise<any> {
  return scopedApi.get(
    `${MEMBERSHIP_BASE}/questionnaire/memberservice/${encodeURIComponent(serviceId)}/${encodeURIComponent(channel)}`,
    MEMBERSHIP_REQUEST_CONFIG
  );
}

// Service Types
export async function createServiceType(scopedApi: ScopedApi, data: any): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.serviceCategories.create, data);
}

export async function getServiceTypes(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.serviceCategories.search, filter);
}

export async function getServiceTypeCount(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.serviceCategories.search, filter);
}

export async function getServiceTypeByUid(scopedApi: ScopedApi, uid: string): Promise<any> {
  return scopedApi.get(membershipEndpoints.serviceCategories.detail(uid), MEMBERSHIP_REQUEST_CONFIG);
}

export async function updateServiceType(scopedApi: ScopedApi, id: string, data: any): Promise<any> {
  return scopedApi.put(membershipEndpoints.serviceCategories.update(id), data, MEMBERSHIP_REQUEST_CONFIG);
}

export async function changeServiceTypeStatus(scopedApi: ScopedApi, uid: string, statusId: string): Promise<any> {
  return scopedApi.patch(membershipEndpoints.serviceCategories.status(uid, statusId), null, MEMBERSHIP_REQUEST_CONFIG);
}

// Subscriptions
export async function getMemberSubscriptionByUid(scopedApi: ScopedApi, uid: string): Promise<any> {
  return scopedApi.get(membershipEndpoints.subscriptions.detail(uid), MEMBERSHIP_REQUEST_CONFIG);
}

export async function getAllMemberSubscriptions(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.subscriptions.search, filter);
}

export async function getAllMemberSubscriptionsCount(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.subscriptions.search, filter);
}

export async function getAllMemberSubscriptionByuid(scopedApi: ScopedApi, uid: string): Promise<any> {
  return scopedApi.get(membershipEndpoints.subscriptions.detail(uid), MEMBERSHIP_REQUEST_CONFIG);
}

export async function addNewServiceType(scopedApi: ScopedApi, data: any): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.subscriptions.create, data);
}

// Payments
export async function makeCashPayment(scopedApi: ScopedApi, data: any): Promise<any> {
  const subscriptionUid = String(data?.subscriptionUid ?? data?.subscriptionId ?? data?.uid ?? "");
  return postMembership(scopedApi, membershipEndpoints.invoicePayments.payCash(subscriptionUid), data);
}

export async function Paymentlink(scopedApi: ScopedApi, data: any): Promise<any> {
  const subscriptionUid = String(data?.subscriptionUid ?? data?.subscriptionId ?? data?.uid ?? "");
  return postMembership(scopedApi, membershipEndpoints.invoicePayments.pay(subscriptionUid), data);
}

// Templates
export async function getTemplates(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.templates.search, filter);
}

export async function getTemplatesByuuid(scopedApi: ScopedApi, tempUid: string): Promise<any> {
  return scopedApi.get(membershipEndpoints.templates.detail(tempUid));
}

export async function getMemberTemplatesByuuid(scopedApi: ScopedApi, tempUid: string): Promise<any> {
  return scopedApi.get(membershipEndpoints.templates.detail(tempUid));
}

// Services
export async function createService(scopedApi: ScopedApi, data: any): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.services.create, data);
}

export async function getServices(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.services.search, filter);
}

export async function changeServiceStatus(scopedApi: ScopedApi, uid: string, statusId: string): Promise<any> {
  return scopedApi.patch(membershipEndpoints.services.status(uid, statusId), null, MEMBERSHIP_REQUEST_CONFIG);
}

export async function updateService(scopedApi: ScopedApi, id: string, data: any): Promise<any> {
  return scopedApi.put(membershipEndpoints.services.update(id), data, MEMBERSHIP_REQUEST_CONFIG);
}

export async function getServiceCount(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.services.search, filter);
}

export async function getServiceByUid(scopedApi: ScopedApi, uid: string): Promise<any> {
  return scopedApi.get(membershipEndpoints.services.detail(uid), MEMBERSHIP_REQUEST_CONFIG);
}

// Renewals/Assignments
export async function getPaymentRenewByUid(scopedApi: ScopedApi, uid: string, data: any): Promise<any> {
  return scopedApi.put(membershipEndpoints.subscriptions.detail(uid), data, MEMBERSHIP_REQUEST_CONFIG);
}

export async function assignService(scopedApi: ScopedApi, data: any): Promise<any> {
  const memberUid = String(data?.memberUid ?? data?.memberId ?? data?.uid ?? "");
  const payload = Array.isArray(data?.serviceUids) ? data.serviceUids : Array.isArray(data) ? data : [];
  return postMembership(scopedApi, membershipEndpoints.memberServices.assignServices(memberUid), payload);
}

export async function assignMember(scopedApi: ScopedApi, data: any): Promise<any> {
  const serviceUid = String(data?.memberService?.uid ?? data?.serviceUid ?? data?.serviceId ?? data?.uid ?? "");
  const payload = Array.isArray(data?.memberIds) ? data.memberIds : Array.isArray(data) ? data : [];
  return postMembership(scopedApi, membershipEndpoints.services.assignMembers(serviceUid), payload);
}

export async function assignGroupToService(scopedApi: ScopedApi, data: any): Promise<any> {
  const serviceUid = String(data?.memberService?.uid ?? data?.serviceUid ?? data?.serviceId ?? data?.uid ?? "");
  const payload = Array.isArray(data?.groupIds) ? data.groupIds : Array.isArray(data) ? data : [];
  return postMembership(scopedApi, membershipEndpoints.services.assignGroups(serviceUid), payload);
}

export async function getAllMemberServices(scopedApi: ScopedApi, id: string, from: number, count: number): Promise<any> {
  return scopedApi.get(membershipEndpoints.memberServices.services(id), { params: withPagination({}, from, count), ...MEMBERSHIP_REQUEST_CONFIG });
}

export async function getAllMemberServicesCount(scopedApi: ScopedApi, id: string): Promise<any> {
  return scopedApi.get(membershipEndpoints.memberServices.servicesCount(id), MEMBERSHIP_REQUEST_CONFIG);
}

export async function getAllServiceMembers(scopedApi: ScopedApi, id: string, from: number, count: number): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.serviceTransactions.search, withPagination({ serviceUid: id }, from, count));
}

export async function getAllServiceMembersCount(scopedApi: ScopedApi, id: string): Promise<any> {
  return scopedApi.get(membershipEndpoints.services.membersCount(id), MEMBERSHIP_REQUEST_CONFIG);
}

export async function changeAssignedServiceStatus(scopedApi: ScopedApi, memberId: string, uid: string, status: string): Promise<any> {
  return scopedApi.patch(membershipEndpoints.serviceTransactions.status(uid, status), { memberUid: memberId }, MEMBERSHIP_REQUEST_CONFIG);
}

// Labels
export async function getLabelList(scopedApi: ScopedApi): Promise<any> {
  return scopedApi.get(
    buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantLabels.tenant),
    MEMBERSHIP_REQUEST_CONFIG
  );
}

// Analytics
export async function getAnalytics(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return scopedApi.get(`${MEMBERSHIP_BASE}/analytics`, { params: filter, ...MEMBERSHIP_REQUEST_CONFIG });
}

export async function getGraphAnalyticsData(scopedApi: ScopedApi, data: any[]): Promise<any[]> {
  return Promise.all(
    data.map((item) =>
      scopedApi.put(`${MEMBERSHIP_BASE}/analytics/graph`, item, MEMBERSHIP_REQUEST_CONFIG).then((response) => response.data)
    )
  );
}

// Member Groups
export async function createMemberGroup(scopedApi: ScopedApi, data: any): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.groups.create, data);
}

export async function updateMemberGroup(scopedApi: ScopedApi, memberGroupUid: string, data: any): Promise<any> {
  return scopedApi.put(membershipEndpoints.groups.update(memberGroupUid), data, MEMBERSHIP_REQUEST_CONFIG);
}

export async function getMemberGroup(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.groups.search, filter);
}

export async function getMemberGroupCount(scopedApi: ScopedApi, filter: {} = {}): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.groups.search, filter);
}

export async function changeMemberGroupStatus(scopedApi: ScopedApi, groupId: string, statusId: string): Promise<any> {
  return scopedApi.patch(membershipEndpoints.groups.status(groupId, statusId), null, MEMBERSHIP_REQUEST_CONFIG);
}

export async function addMemberToGroup(scopedApi: ScopedApi, data: any): Promise<any> {
  const memberUid = String(data?.memberUid ?? data?.memberId ?? data?.uid ?? "");
  return scopedApi.put(membershipEndpoints.members.update(memberUid), data, MEMBERSHIP_REQUEST_CONFIG);
}

export async function getGroupByUid(scopedApi: ScopedApi, uid: string): Promise<any> {
  return scopedApi.get(membershipEndpoints.groups.detail(uid), MEMBERSHIP_REQUEST_CONFIG);
}

export async function createGroupMemberId(scopedApi: ScopedApi, body: any): Promise<any> {
  return postMembership(scopedApi, membershipEndpoints.groups.create, body);
}

export async function updateGroupMemberId(scopedApi: ScopedApi, body: any): Promise<any> {
  const groupUid = String(body?.groupUid ?? body?.groupId ?? body?.uid ?? "");
  return scopedApi.put(membershipEndpoints.groups.update(groupUid), body, MEMBERSHIP_REQUEST_CONFIG);
}

// Original membership CRUD (keeping for compatibility)
export async function getMemberships(
  scopedApi: ScopedApi,
  filters: MembershipFilters & { page: number; pageSize: number }
): Promise<any> {
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

  return postMembership(scopedApi, membershipEndpoints.members.search, params);
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

  return postMembership<number>(scopedApi, membershipEndpoints.members.search, params).then(res => res.data);
}

export async function getMembership(scopedApi: ScopedApi, id: string): Promise<Membership> {
  return scopedApi.get<Membership>(membershipEndpoints.members.detail(id), MEMBERSHIP_REQUEST_CONFIG).then(res => res.data);
}

export async function createMembership(scopedApi: ScopedApi, data: MembershipFormValues): Promise<Membership> {
  return postMembership<Membership>(scopedApi, membershipEndpoints.members.create, data).then(res => res.data);
}

export async function updateMembership(scopedApi: ScopedApi, id: string, data: MembershipFormValues): Promise<Membership> {
  return scopedApi.put<Membership>(membershipEndpoints.members.update(id), data, MEMBERSHIP_REQUEST_CONFIG).then(res => res.data);
}

export async function deleteMembership(scopedApi: ScopedApi, id: string): Promise<void> {
  return scopedApi.patch(membershipEndpoints.members.status(id, "INACTIVE"), null, MEMBERSHIP_REQUEST_CONFIG).then(() => undefined);
}
