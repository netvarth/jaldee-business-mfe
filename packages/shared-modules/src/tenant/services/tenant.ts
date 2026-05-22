import { BASE_SERVICE_ENDPOINTS, buildBaseServiceUrl } from "../../serviceUrls";

interface ScopedApi {
  get: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
  post: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  put: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  patch: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  delete: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
}

// === Tenant Management ===

export async function getTenants(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenants.search), { params: filters });
}

export async function createTenant(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenants.create), data);
}

export async function getTenantByUid(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenants.detail(uid)));
}

export async function updateTenant(api: ScopedApi, uid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenants.update(uid)), data);
}

export async function deleteTenant(api: ScopedApi, uid: string) {
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenants.delete(uid)));
}

export async function activateTenant(api: ScopedApi, uid: string) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenants.activate(uid)));
}

export async function deactivateTenant(api: ScopedApi, uid: string) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenants.deactivate(uid)));
}

export async function getTenantsCount(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenants.count), { params: filters });
}

// === Tenant Settings ===

export async function getTenantSettings(api: ScopedApi) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantSettings.get));
}

export async function updateTenantSettings(api: ScopedApi, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantSettings.update), data);
}

export async function createTenantSettings(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantSettings.create), data);
}

export async function patchTenantSettingsBookingStatus(api: ScopedApi, data: unknown) {
  return api.patch(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantSettings.bookingStatus), data);
}

export async function patchTenantSettingsFinanceStatus(api: ScopedApi, data: unknown) {
  return api.patch(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantSettings.financeStatus), data);
}

export async function patchTenantSettingsHealthCrmStatus(api: ScopedApi, data: unknown) {
  return api.patch(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantSettings.healthCrmStatus), data);
}

export async function patchTenantSettingsKartyStatus(api: ScopedApi, data: unknown) {
  return api.patch(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantSettings.kartyStatus), data);
}

export async function patchTenantSettingsLendingCrmStatus(api: ScopedApi, data: unknown) {
  return api.patch(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantSettings.lendingCrmStatus), data);
}

// === Tenant Signup ===

export async function issueTenantSignupOtp(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantSignup.issueOtp), data);
}

export async function verifyTenantSignupOtp(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantSignup.verifyOtp), data);
}

// === Tenant Labels ===

export async function getTenantLabels(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantLabels.list), { params: filters });
}

export async function createTenantLabel(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantLabels.create), data);
}

export async function getTenantLabelByUid(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantLabels.detail(uid)));
}

export async function updateTenantLabel(api: ScopedApi, uid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantLabels.update(uid)), data);
}

export async function updateTenantLabelStatus(api: ScopedApi, uid: string, status: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantLabels.status(uid, status)));
}

export async function getTenantLabelsCount(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantLabels.count), { params: filters });
}

export async function checkTenantLabelExists(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantLabels.exists), { params: filters });
}

export async function getTenantLabelsForTenant(api: ScopedApi) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantLabels.tenant));
}

// === Tenant Consumer Groups ===

export async function getTenantConsumerGroups(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerGroups.list), { params: filters });
}

export async function updateTenantConsumerGroup(api: ScopedApi, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerGroups.update), data);
}

export async function createTenantConsumerGroup(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerGroups.create), data);
}

export async function getTenantConsumerGroupByUid(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerGroups.detail(uid)));
}

export async function disableTenantConsumerGroup(api: ScopedApi, uid: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerGroups.disable(uid)));
}

export async function enableTenantConsumerGroup(api: ScopedApi, uid: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerGroups.enable(uid)));
}

export async function getTenantConsumerGroupMemberCount(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerGroups.memberCount(uid)));
}

export async function getTenantConsumerGroupByName(api: ScopedApi, groupName: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerGroups.byName(groupName)));
}

// === Tenant Consumer Labels ===

export async function createTenantConsumerLabel(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerLabels.create), data);
}

export async function getTenantConsumerLabelByUid(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerLabels.detail(uid)));
}

export async function updateTenantConsumerLabel(api: ScopedApi, uid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerLabels.update(uid)), data);
}

export async function deleteTenantConsumerLabel(api: ScopedApi, uid: string) {
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerLabels.delete(uid)));
}

export async function disableTenantConsumerLabel(api: ScopedApi, uid: string) {
  return api.patch(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerLabels.disable(uid)));
}

export async function enableTenantConsumerLabel(api: ScopedApi, uid: string) {
  return api.patch(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerLabels.enable(uid)));
}

export async function searchTenantConsumerLabels(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerLabels.search), data);
}

// === Tenant Consumer Management ===

export async function createConsumer(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.create), data);
}

export async function getConsumerGroupsMemberId(api: ScopedApi, consumerUid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.groupMemberId(consumerUid)));
}

export async function getConsumerByUid(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.detail(uid)));
}

export async function updateConsumer(api: ScopedApi, uid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.update(uid)), data);
}

export async function deleteConsumer(api: ScopedApi, uid: string) {
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.delete(uid)));
}

export async function activateConsumer(api: ScopedApi, uid: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.activate(uid)));
}

export async function deactivateConsumer(api: ScopedApi, uid: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.deactivate(uid)));
}

export async function sendConsumerMessage(api: ScopedApi, uid: string, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.sendMessage(uid)), data);
}

export async function applyConsumerLabel(api: ScopedApi, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.applyLabel), data);
}

export async function exportConsumers(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.export), data);
}

export async function addConsumerGroupMembers(api: ScopedApi, groupUid: string, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.addGroupMembersByUid(groupUid)), data);
}

export async function removeConsumerGroupMembers(api: ScopedApi, groupUid: string, data?: unknown) {
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.removeGroupMembersByUid(groupUid)), data ? { data } : undefined);
}

export async function updateConsumerGroupsMemberId(api: ScopedApi, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.updateGroupMemberId), data);
}

export async function createConsumerGroupsMemberId(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.addGroupMemberId), data);
}

export async function searchConsumerGroupsMembers(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.addGroupMembersByName), data);
}

export async function removeConsumerLabel(api: ScopedApi, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.removeLabel), data);
}

export async function searchConsumers(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.search), data);
}

// === Tenant Consumer Settings ===

export async function getTenantConsumerSettings(api: ScopedApi) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerSettings.get));
}

export async function updateTenantConsumerSettings(api: ScopedApi, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerSettings.update), data);
}

export async function deleteTenantConsumerSettings(api: ScopedApi) {
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerSettings.delete));
}

// === Tenant Consumer Signup ===

export async function issueTenantConsumerSignupOtp(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerSignup.issueOtp), data);
}

export async function verifyTenantConsumerSignupOtp(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerSignup.verifyOtp), data);
}

// === Departments ===

export async function getDepartments(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.departments.list), { params: filters });
}

export async function createDepartment(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.departments.create), data);
}

export async function getDepartmentByUid(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.departments.detail(uid)));
}

export async function updateDepartment(api: ScopedApi, uid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.departments.update(uid)), data);
}

export async function updateDepartmentStatus(api: ScopedApi, uid: string, status: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.departments.status(uid, status)));
}

export async function getDepartmentsCount(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.departments.count), { params: filters });
}

export async function getDefaultDepartment(api: ScopedApi) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.departments.default));
}

// === Locations ===

export async function getLocations(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.locations.search), { params: filters });
}

export async function createLocation(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.locations.create), data);
}

export async function setLocationAsBase(api: ScopedApi, locationUid: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.locations.setAsBase(locationUid)));
}

export async function getLocationByUid(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.locations.detail(uid)));
}

export async function updateLocation(api: ScopedApi, uid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.locations.update(uid)), data);
}

export async function updateLocationStatus(api: ScopedApi, uid: string, status: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.locations.status(uid, status)));
}

export async function getBaseLocation(api: ScopedApi) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.locations.baseLocation));
}

export async function getLocationsCount(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.locations.count), { params: filters });
}

export async function getLocationById(api: ScopedApi, id: string | number) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.locations.byId(id)));
}

export async function updateLocationStatusById(api: ScopedApi, id: string | number, status: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.locations.statusById(id, status)));
}

// === Countries ===

export async function getCountries(api: ScopedApi) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.countries.list));
}

export async function getCountryByCode(api: ScopedApi, code: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.countries.byCode(code)));
}

export async function getCountryByName(api: ScopedApi, name: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.countries.byName(name)));
}

// === Currencies ===

export async function getCurrencies(api: ScopedApi) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.currencies.list));
}

export async function getCurrencyByCode(api: ScopedApi, code: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.currencies.byCode(code)));
}

export async function getCurrencyByName(api: ScopedApi, name: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.currencies.byName(name)));
}

// === Health ===

export async function getHealth(api: ScopedApi) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.health.status));
}

export async function getHealthAuthServiceTest(api: ScopedApi) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.health.authServiceTestGet));
}

export async function postHealthAuthServiceTest(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.health.authServiceTestPost), data);
}

export async function getHealthCustomValidation(api: ScopedApi) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.health.customValidation));
}

export async function getHealthCustomValidationMultiple(api: ScopedApi) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.health.customValidationMultiple));
}

// === Audit Logs ===

export async function getAuditLogs(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.auditLogs.search), { params: filters });
}

export async function getAuditLogById(api: ScopedApi, id: string | number) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.auditLogs.detail(id)));
}

export async function getAuditLogsCount(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.auditLogs.count), { params: filters });
}

export async function getAuditLogByEventUuid(api: ScopedApi, eventUuid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.auditLogs.byEvent(eventUuid)));
}
