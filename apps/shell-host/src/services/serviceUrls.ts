export const TOKEN_AUTH_ENDPOINTS = {
  discover: "/auth-service/v1/api/auth/discover",
  otpStart: "/auth-service/v1/api/auth/login/otp/start",
  otpVerify: "/auth-service/v1/api/auth/login/otp/verify",
  passwordLogin: "/auth-service/v1/api/auth/login/password",
  logout: "/auth-service/v1/api/auth/logout",
  me: "/auth-service/v1/api/auth/me",
  refresh: "/auth-service/v1/api/auth/refresh",
  serviceToken: "/auth-service/v1/api/auth/servicetoken",
} as const;

const pathValue = (value: string | number) => encodeURIComponent(String(value));

export const BASE_SERVICE_ENDPOINTS = {
  auditLogs: {
    search: "/base-service/api/audit-logs",
    detail: (id: string | number) => `/base-service/api/audit-logs/${pathValue(id)}`,
    count: "/base-service/api/audit-logs/count",
    byEvent: (eventUuid: string) => `/base-service/api/audit-logs/event/${pathValue(eventUuid)}`,
  },
  consumerTasks: {
    list: "/base-service/v1/api/tasks/consumer",
    create: "/base-service/v1/api/tasks/consumer",
    detail: (uid: string) => `/base-service/v1/api/tasks/consumer/${pathValue(uid)}`,
    update: (uid: string) => `/base-service/v1/api/tasks/consumer/${pathValue(uid)}`,
    delete: (uid: string) => `/base-service/v1/api/tasks/consumer/${pathValue(uid)}`,
    assignee: (uid: string, assigneeId: string | number) =>
      `/base-service/v1/api/tasks/consumer/${pathValue(uid)}/assignee/${pathValue(assigneeId)}`,
    removeAssignee: (uid: string) => `/base-service/v1/api/tasks/consumer/${pathValue(uid)}/assignee/remove`,
    manager: (uid: string, managerId: string | number) =>
      `/base-service/v1/api/tasks/consumer/${pathValue(uid)}/manager/${pathValue(managerId)}`,
    removeManager: (uid: string) => `/base-service/v1/api/tasks/consumer/${pathValue(uid)}/manager/remove`,
    priority: (uid: string, priorityId: string | number) =>
      `/base-service/v1/api/tasks/consumer/${pathValue(uid)}/priority/${pathValue(priorityId)}`,
    progress: (uid: string, progress: string | number) =>
      `/base-service/v1/api/tasks/consumer/${pathValue(uid)}/progress/${pathValue(progress)}`,
    status: (uid: string, statusId: string | number) =>
      `/base-service/v1/api/tasks/consumer/${pathValue(uid)}/status/${pathValue(statusId)}`,
    subtasks: (uid: string) => `/base-service/v1/api/tasks/consumer/${pathValue(uid)}/subtasks`,
    byConsumer: (consumerId: string | number) =>
      `/base-service/v1/api/tasks/consumer/consumer/${pathValue(consumerId)}`,
    count: "/base-service/v1/api/tasks/consumer/count",
  },
  countries: {
    list: "/base-service/v1/api/countries",
    byCode: (code: string) => `/base-service/v1/api/countries/code/${pathValue(code)}`,
    byName: (name: string) => `/base-service/v1/api/countries/name/${pathValue(name)}`,
  },
  currencies: {
    list: "/base-service/v1/api/currencies",
    byCode: (code: string) => `/base-service/v1/api/currencies/code/${pathValue(code)}`,
    byName: (name: string) => `/base-service/v1/api/currencies/name/${pathValue(name)}`,
  },
  departments: {
    list: "/base-service/v1/api/departments",
    create: "/base-service/v1/api/departments",
    detail: (uid: string) => `/base-service/v1/api/departments/${pathValue(uid)}`,
    update: (uid: string) => `/base-service/v1/api/departments/${pathValue(uid)}`,
    status: (uid: string, status: string) =>
      `/base-service/v1/api/departments/${pathValue(uid)}/status/${pathValue(status)}`,
    count: "/base-service/v1/api/departments/count",
    default: "/base-service/v1/api/departments/default",
  },
  health: {
    status: "/base-service/v1/api/health",
    authServiceTestGet: "/base-service/v1/api/health/autheservice/test/get",
    authServiceTestPost: "/base-service/v1/api/health/autheservice/test/post",
    customValidation: "/base-service/v1/api/health/custom-validation",
    customValidationMultiple: "/base-service/v1/api/health/custom-validation/multiple",
  },
  locations: {
    search: "/base-service/v1/api/locations",
    create: "/base-service/v1/api/locations",
    detail: (uid: string) => `/base-service/v1/api/locations/${pathValue(uid)}`,
    update: (uid: string) => `/base-service/v1/api/locations/${pathValue(uid)}`,
    setAsBase: (locationUid: string) => `/base-service/v1/api/locations/${pathValue(locationUid)}/set-as-base`,
    status: (uid: string, status: string) =>
      `/base-service/v1/api/locations/${pathValue(uid)}/status/${pathValue(status)}`,
    baseLocation: "/base-service/v1/api/locations/base-location",
    count: "/base-service/v1/api/locations/count",
    byId: (id: string | number) => `/base-service/v1/api/locations/id/${pathValue(id)}`,
    statusById: (id: string | number, status: string) =>
      `/base-service/v1/api/locations/id/${pathValue(id)}/status/${pathValue(status)}`,
  },
  taskCategories: {
    list: "/base-service/v1/api/tasks/categories",
    create: "/base-service/v1/api/tasks/categories",
    detail: (id: string | number) => `/base-service/v1/api/tasks/categories/${pathValue(id)}`,
    update: (id: string | number) => `/base-service/v1/api/tasks/categories/${pathValue(id)}`,
    delete: (id: string | number) => `/base-service/v1/api/tasks/categories/${pathValue(id)}`,
    count: "/base-service/v1/api/tasks/categories/count",
  },
  taskPriorities: {
    list: "/base-service/v1/api/tasks/priorities",
    create: "/base-service/v1/api/tasks/priorities",
    detail: (id: string | number) => `/base-service/v1/api/tasks/priorities/${pathValue(id)}`,
    update: (id: string | number) => `/base-service/v1/api/tasks/priorities/${pathValue(id)}`,
    delete: (id: string | number) => `/base-service/v1/api/tasks/priorities/${pathValue(id)}`,
    count: "/base-service/v1/api/tasks/priorities/count",
  },
  taskStatuses: {
    list: "/base-service/v1/api/tasks/statuses",
    create: "/base-service/v1/api/tasks/statuses",
    detail: (id: string | number) => `/base-service/v1/api/tasks/statuses/${pathValue(id)}`,
    update: (id: string | number) => `/base-service/v1/api/tasks/statuses/${pathValue(id)}`,
    delete: (id: string | number) => `/base-service/v1/api/tasks/statuses/${pathValue(id)}`,
    count: "/base-service/v1/api/tasks/statuses/count",
  },
  taskTemplates: {
    list: "/base-service/v1/api/tasks/templates",
    create: "/base-service/v1/api/tasks/templates",
    detail: (id: string | number) => `/base-service/v1/api/tasks/templates/${pathValue(id)}`,
    update: (id: string | number) => `/base-service/v1/api/tasks/templates/${pathValue(id)}`,
    delete: (id: string | number) => `/base-service/v1/api/tasks/templates/${pathValue(id)}`,
    available: "/base-service/v1/api/tasks/templates/available",
    count: "/base-service/v1/api/tasks/templates/count",
  },
  taskTypes: {
    list: "/base-service/v1/api/tasks/types",
    create: "/base-service/v1/api/tasks/types",
    detail: (id: string | number) => `/base-service/v1/api/tasks/types/${pathValue(id)}`,
    update: (id: string | number) => `/base-service/v1/api/tasks/types/${pathValue(id)}`,
    delete: (id: string | number) => `/base-service/v1/api/tasks/types/${pathValue(id)}`,
    count: "/base-service/v1/api/tasks/types/count",
  },
  tenantSignup: {
    issueOtp: "/base-service/v1/api/tenant/signup/issue-otp",
    verifyOtp: "/base-service/v1/api/tenant/signup/verify-otp",
  },
  tenantTasks: {
    list: "/base-service/v1/api/tasks/tenant",
    create: "/base-service/v1/api/tasks/tenant",
    detail: (uid: string) => `/base-service/v1/api/tasks/tenant/${pathValue(uid)}`,
    update: (uid: string) => `/base-service/v1/api/tasks/tenant/${pathValue(uid)}`,
    delete: (uid: string) => `/base-service/v1/api/tasks/tenant/${pathValue(uid)}`,
    assignee: (uid: string, assigneeId: string | number) =>
      `/base-service/v1/api/tasks/tenant/${pathValue(uid)}/assignee/${pathValue(assigneeId)}`,
    removeAssignee: (uid: string) => `/base-service/v1/api/tasks/tenant/${pathValue(uid)}/assignee/remove`,
    manager: (uid: string, managerId: string | number) =>
      `/base-service/v1/api/tasks/tenant/${pathValue(uid)}/manager/${pathValue(managerId)}`,
    removeManager: (uid: string) => `/base-service/v1/api/tasks/tenant/${pathValue(uid)}/manager/remove`,
    priority: (uid: string, priorityId: string | number) =>
      `/base-service/v1/api/tasks/tenant/${pathValue(uid)}/priority/${pathValue(priorityId)}`,
    progress: (uid: string, progress: string | number) =>
      `/base-service/v1/api/tasks/tenant/${pathValue(uid)}/progress/${pathValue(progress)}`,
    status: (uid: string, statusId: string | number) =>
      `/base-service/v1/api/tasks/tenant/${pathValue(uid)}/status/${pathValue(statusId)}`,
    subtasks: (uid: string) => `/base-service/v1/api/tasks/tenant/${pathValue(uid)}/subtasks`,
    count: "/base-service/v1/api/tasks/tenant/count",
  },
  tenantUsers: {
    list: "/base-service/api/tenant/users",
    create: "/base-service/api/tenant/users",
    detail: (id: string | number) => `/base-service/api/tenant/users/${pathValue(id)}`,
    update: (uid: string) => `/base-service/api/tenant/users/${pathValue(uid)}`,
    availableStatus: (uid: string, status: string) =>
      `/base-service/api/tenant/users/${pathValue(uid)}/available-status/${pathValue(status)}`,
    userStatus: (uid: string, status: string) =>
      `/base-service/api/tenant/users/${pathValue(uid)}/user-status/${pathValue(status)}`,
    filter: "/base-service/api/tenant/users/filter",
    filterCount: "/base-service/api/tenant/users/filter/count",
    search: "/base-service/api/tenant/users/search",
    searchCount: "/base-service/api/tenant/users/search/count",
  },
  consumers: {
    create: "/base-service/v1/api/consumers",
    detail: (uid: string) => `/base-service/v1/api/consumers/${pathValue(uid)}`,
    update: (uid: string) => `/base-service/v1/api/consumers/${pathValue(uid)}`,
    delete: (uid: string) => `/base-service/v1/api/consumers/${pathValue(uid)}`,
    activate: (uid: string) => `/base-service/v1/api/consumers/${pathValue(uid)}/activate`,
    deactivate: (uid: string) => `/base-service/v1/api/consumers/${pathValue(uid)}/deactivate`,
    sendMessage: (uid: string) => `/base-service/v1/api/consumers/${pathValue(uid)}/send-message`,
    groupMemberId: (consumerUid: string) =>
      `/base-service/v1/api/consumers/${pathValue(consumerUid)}/groups/member-id`,
    applyLabel: "/base-service/v1/api/consumers/apply/label",
    applyLabelByUid: (uid: string) => `/base-service/v1/api/consumers/apply/label/${pathValue(uid)}`,
    export: "/base-service/v1/api/consumers/export",
    addGroupMembersByUid: (groupUid: string) =>
      `/base-service/v1/api/consumers/groups/${pathValue(groupUid)}/members`,
    removeGroupMembersByUid: (groupUid: string) =>
      `/base-service/v1/api/consumers/groups/${pathValue(groupUid)}/members`,
    updateGroupMemberId: "/base-service/v1/api/consumers/groups/member-id",
    addGroupMemberId: "/base-service/v1/api/consumers/groups/member-id",
    addGroupMembersByName: "/base-service/v1/api/consumers/groups/members",
    removeLabel: "/base-service/v1/api/consumers/remove/label",
    removeLabelByUid: (uid: string) => `/base-service/v1/api/consumers/remove/label/${pathValue(uid)}`,
    search: "/base-service/v1/api/consumers/search",
  },
  consumerGroups: {
    list: "/base-service/api/tenant/consumers/group",
    create: "/base-service/api/tenant/consumers/group",
    update: "/base-service/api/tenant/consumers/group",
    detail: (uid: string) => `/base-service/api/tenant/consumers/group/${pathValue(uid)}`,
    disable: (uid: string) => `/base-service/api/tenant/consumers/group/${pathValue(uid)}/disable`,
    enable: (uid: string) => `/base-service/api/tenant/consumers/group/${pathValue(uid)}/enable`,
    memberCount: (uid: string) => `/base-service/api/tenant/consumers/group/${pathValue(uid)}/member/count`,
    byName: (groupName: string) => `/base-service/api/tenant/consumers/group/by-name/${pathValue(groupName)}`,
  },
  consumerLabels: {
    create: "/base-service/api/v1/tenant/consumer/labels",
    detail: (uid: string) => `/base-service/api/v1/tenant/consumer/labels/${pathValue(uid)}`,
    update: (uid: string) => `/base-service/api/v1/tenant/consumer/labels/${pathValue(uid)}`,
    delete: (uid: string) => `/base-service/api/v1/tenant/consumer/labels/${pathValue(uid)}`,
    disable: (uid: string) => `/base-service/api/v1/tenant/consumer/labels/${pathValue(uid)}/disable`,
    enable: (uid: string) => `/base-service/api/v1/tenant/consumer/labels/${pathValue(uid)}/enable`,
    search: "/base-service/api/v1/tenant/consumer/labels/search",
  },
  consumerSettings: {
    get: "/base-service/api/tenant/consumer/settings",
    update: "/base-service/api/tenant/consumer/settings",
    delete: "/base-service/api/tenant/consumer/settings",
  },
  consumerSignup: {
    issueOtp: "/base-service/v1/api/tenant/consumer/signup/issue-otp",
    verifyOtp: "/base-service/v1/api/tenant/consumer/signup/verify-otp",
  },
  tenants: {
    search: "/base-service/api/tenants",
    create: "/base-service/api/tenants",
    detail: (uid: string) => `/base-service/api/tenants/${pathValue(uid)}`,
    update: (uid: string) => `/base-service/api/tenants/${pathValue(uid)}`,
    delete: (uid: string) => `/base-service/api/tenants/${pathValue(uid)}`,
    activate: (uid: string) => `/base-service/api/tenants/${pathValue(uid)}/activate`,
    deactivate: (uid: string) => `/base-service/api/tenants/${pathValue(uid)}/deactivate`,
    count: "/base-service/api/tenants/count",
  },
  tenantLabels: {
    list: "/base-service/v1/api/tenant/labels",
    create: "/base-service/v1/api/tenant/labels",
    detail: (uid: string) => `/base-service/v1/api/tenant/labels/${pathValue(uid)}`,
    update: (uid: string) => `/base-service/v1/api/tenant/labels/${pathValue(uid)}`,
    status: (uid: string, status: string) =>
      `/base-service/v1/api/tenant/labels/${pathValue(uid)}/status/${pathValue(status)}`,
    count: "/base-service/v1/api/tenant/labels/count",
    exists: "/base-service/v1/api/tenant/labels/exists",
    tenant: "/base-service/v1/api/tenant/labels/tenant",
  },
  tenantSettings: {
    get: "/base-service/v1/api/tenant-settings",
    create: "/base-service/v1/api/tenant-settings",
    update: "/base-service/v1/api/tenant-settings",
    bookingStatus: "/base-service/v1/api/tenant-settings/booking-status",
    financeStatus: "/base-service/v1/api/tenant-settings/finance-status",
    healthCrmStatus: "/base-service/v1/api/tenant-settings/health-crm-status",
    kartyStatus: "/base-service/v1/api/tenant-settings/karty-status",
    lendingCrmStatus: "/base-service/v1/api/tenant-settings/lending-crm-status",
  },
  crmLeadActivities: {
    byLead: (leadUid: string) => `/base-service/api/crm/lead/activities/lead/${pathValue(leadUid)}`,
    timeline: "/base-service/api/crm/lead/activities/timeline",
  },
  crmLeadChannels: {
    list: "/base-service/api/crm/lead/channels",
    create: "/base-service/api/crm/lead/channels",
    detail: (uid: string) => `/base-service/api/crm/lead/channels/${pathValue(uid)}`,
    update: (uid: string) => `/base-service/api/crm/lead/channels/${pathValue(uid)}`,
    link: (uid: string) => `/base-service/api/crm/lead/channels/${pathValue(uid)}/link`,
    status: (uid: string, status: string) =>
      `/base-service/api/crm/lead/channels/${pathValue(uid)}/status/${pathValue(status)}`,
    encoded: (encodedId: string) => `/base-service/api/crm/lead/channels/encoded/${pathValue(encodedId)}`,
    search: "/base-service/api/crm/lead/channels/search",
  },
  crmLeadConsumers: {
    create: "/base-service/api/crm/lead/consumers",
    detail: (uid: string) => `/base-service/api/crm/lead/consumers/${pathValue(uid)}`,
    update: (uid: string) => `/base-service/api/crm/lead/consumers/${pathValue(uid)}`,
    status: (uid: string) => `/base-service/api/crm/lead/consumers/${pathValue(uid)}/status`,
    search: "/base-service/api/crm/lead/consumers/search",
  },
  crmLeadConsumerSignup: {
    create: "/base-service/api/consumer/crm/leads",
    sendOtp: "/base-service/api/consumer/crm/leads/otp/send",
    verifyOtp: "/base-service/api/consumer/crm/leads/otp/verify",
  },
  crmLeadNotes: {
    pin: (noteUid: string) => `/base-service/api/crm/lead/notes/${pathValue(noteUid)}/pin`,
    unpin: (noteUid: string) => `/base-service/api/crm/lead/notes/${pathValue(noteUid)}/unpin`,
    byLead: (leadUid: string) => `/base-service/api/crm/lead/notes/lead/${pathValue(leadUid)}`,
    createForLead: (leadUid: string) => `/base-service/api/crm/lead/notes/lead/${pathValue(leadUid)}`,
    pagedByLead: (leadUid: string) => `/base-service/api/crm/lead/notes/lead/${pathValue(leadUid)}/paged`,
  },
  crmLeadPipelines: {
    create: "/base-service/api/crm/lead/pipelines",
    addStage: (pipelineUid: string) => `/base-service/api/crm/lead/pipelines/${pathValue(pipelineUid)}/stages`,
    reorderStages: (pipelineUid: string) =>
      `/base-service/api/crm/lead/pipelines/${pathValue(pipelineUid)}/stages/reorder`,
    detail: (uid: string) => `/base-service/api/crm/lead/pipelines/${pathValue(uid)}`,
    update: (uid: string) => `/base-service/api/crm/lead/pipelines/${pathValue(uid)}`,
    activate: (uid: string) => `/base-service/api/crm/lead/pipelines/${pathValue(uid)}/activate`,
    clone: (uid: string) => `/base-service/api/crm/lead/pipelines/${pathValue(uid)}/clone`,
    deactivate: (uid: string) => `/base-service/api/crm/lead/pipelines/${pathValue(uid)}/deactivate`,
    setDefault: (uid: string) => `/base-service/api/crm/lead/pipelines/${pathValue(uid)}/default`,
    active: "/base-service/api/crm/lead/pipelines/active",
    search: "/base-service/api/crm/lead/pipelines/search",
    stageDetail: (stageUid: string) => `/base-service/api/crm/lead/pipelines/stages/${pathValue(stageUid)}`,
    updateStage: (stageUid: string) => `/base-service/api/crm/lead/pipelines/stages/${pathValue(stageUid)}`,
    deactivateStage: (stageUid: string) =>
      `/base-service/api/crm/lead/pipelines/stages/${pathValue(stageUid)}/deactivate`,
  },
  crmLeadProducts: {
    create: "/base-service/api/crm/lead/products",
    detail: (uid: string) => `/base-service/api/crm/lead/products/${pathValue(uid)}`,
    update: (uid: string) => `/base-service/api/crm/lead/products/${pathValue(uid)}`,
    status: (uid: string, status: string) =>
      `/base-service/api/crm/lead/products/${pathValue(uid)}/status/${pathValue(status)}`,
    search: "/base-service/api/crm/lead/products/search",
  },
  crmProviderLeads: {
    create: "/base-service/api/provider/crm/leads",
    detail: (uid: string) => `/base-service/api/provider/crm/leads/${pathValue(uid)}`,
    update: (uid: string) => `/base-service/api/provider/crm/leads/${pathValue(uid)}`,
    assign: (uid: string) => `/base-service/api/provider/crm/leads/${pathValue(uid)}/assign`,
    notes: (uid: string) => `/base-service/api/provider/crm/leads/${pathValue(uid)}/notes`,
    sendMessage: (uid: string) => `/base-service/api/provider/crm/leads/${pathValue(uid)}/send-message`,
    active: (uid: string) => `/base-service/api/provider/crm/leads/${pathValue(uid)}/status/active`,
    complete: (uid: string) => `/base-service/api/provider/crm/leads/${pathValue(uid)}/status/complete`,
    noResponse: (uid: string) => `/base-service/api/provider/crm/leads/${pathValue(uid)}/status/noresponse`,
    reject: (uid: string) => `/base-service/api/provider/crm/leads/${pathValue(uid)}/status/reject`,
    unassign: (uid: string) => `/base-service/api/provider/crm/leads/${pathValue(uid)}/unassign`,
    migrationTemplate: "/base-service/api/provider/crm/leads/migration/template",
    search: "/base-service/api/provider/crm/leads/search",
  },
  crmLeadStages: {
    create: "/base-service/api/crm/lead/stages",
    detail: (uid: string) => `/base-service/api/crm/lead/stages/${pathValue(uid)}`,
    update: (uid: string) => `/base-service/api/crm/lead/stages/${pathValue(uid)}`,
    complete: (uid: string) => `/base-service/api/crm/lead/stages/${pathValue(uid)}/complete`,
    status: (uid: string, status: string) =>
      `/base-service/api/crm/lead/stages/${pathValue(uid)}/status/${pathValue(status)}`,
    byLead: (leadUid: string) => `/base-service/api/crm/lead/stages/lead/${pathValue(leadUid)}`,
    search: "/base-service/api/crm/lead/stages/search",
  },
  crmLeadStageProgress: {
    setPipeline: (uid: string, pipelineUid: string) =>
      `/base-service/api/provider/crm/leads/${pathValue(uid)}/pipeline/${pathValue(pipelineUid)}`,
    reopen: (uid: string) => `/base-service/api/provider/crm/leads/${pathValue(uid)}/reopen`,
    history: (uid: string) => `/base-service/api/provider/crm/leads/${pathValue(uid)}/stage/history`,
    progress: (uid: string) => `/base-service/api/provider/crm/leads/${pathValue(uid)}/stage/progress`,
  },
  crmLeadTemplates: {
    list: "/base-service/api/crm/lead/templates",
    create: "/base-service/api/crm/lead/templates",
    detail: (uid: string) => `/base-service/api/crm/lead/templates/${pathValue(uid)}`,
    update: (uid: string) => `/base-service/api/crm/lead/templates/${pathValue(uid)}`,
    search: "/base-service/api/crm/lead/templates/search",
  },
} as const;

function getConfiguredAuthServiceBaseUrl() {
  return import.meta.env.VITE_AUTH_SERVICE_BASE_URL?.trim().replace(/\/$/, "") || "";
}

function getConfiguredBaseServiceBaseUrl() {
  return import.meta.env.VITE_BASE_SERVICE_BASE_URL?.trim().replace(/\/$/, "") || "";
}

function buildServiceUrl(path: string, baseUrl: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!baseUrl) {
    return typeof window !== "undefined" ? `${window.location.origin}${normalizedPath}` : normalizedPath;
  }
  return `${baseUrl}${normalizedPath}`;
}

export function buildAuthServiceUrl(path: string) {
  return buildServiceUrl(path, getConfiguredAuthServiceBaseUrl());
}

export function buildBaseServiceUrl(path: string) {
  return buildServiceUrl(path, getConfiguredBaseServiceBaseUrl());
}
