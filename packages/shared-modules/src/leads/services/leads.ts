interface ScopedApi {
  get: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
  post: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  put: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
}

export async function getLeadStats(scopedApi: ScopedApi, filter: {} = {}) {
  return scopedApi.put("provider/crm/lead/stats", filter);
}

export async function getLeadPieChart(scopedApi: ScopedApi, filter: {} = {}) {
  return scopedApi.put("provider/crm/lead/graph/pie", filter);
}

export async function getLeadChart(scopedApi: ScopedApi, filter: {} = {}) {
  return scopedApi.put("provider/crm/lead/graph/chart", filter);
}

export async function getLeads(scopedApi: ScopedApi, filter: {} = {}) {
  return scopedApi.get("provider/crm/lead", { params: filter });
}

export async function getLeadsCount(scopedApi: ScopedApi, filter: {} = {}) {
  return scopedApi.get("provider/crm/lead/count", { params: filter });
}

export async function getLeadByUid(scopedApi: ScopedApi, uid: string) {
  return scopedApi.get(`provider/crm/lead/${uid}`);
}

export async function getLeadStages(scopedApi: ScopedApi, uid: string) {
  return scopedApi.get(`provider/crm/lead/stage?uid-eq=${uid}`);
}

export async function createLead(scopedApi: ScopedApi, data: any) {
  return scopedApi.post("provider/crm/lead", data);
}

export async function updateLead(scopedApi: ScopedApi, uid: string, data: any) {
  return scopedApi.put(`provider/crm/lead/${uid}`, data);
}

export async function changeLeadStatus(scopedApi: ScopedApi, uid: string, status: string, data: any = {}) {
  return scopedApi.put(`provider/crm/lead/${uid}/status/${status}`, data);
}

export async function getLeadLogs(scopedApi: ScopedApi, filter: {} = {}) {
  return scopedApi.get("provider/crm/lead/log", { params: filter });
}

export async function getLeadLogsCount(scopedApi: ScopedApi, filter: {} = {}) {
  return scopedApi.get("provider/crm/lead/log/count", { params: filter });
}

export async function getProductTypes(scopedApi: ScopedApi, filter: {} = {}) {
  return scopedApi.get("provider/crm/lead/product", { params: filter });
}

export async function getProductTypeCount(scopedApi: ScopedApi, filter: {} = {}) {
  return scopedApi.get("provider/crm/lead/product/count", { params: filter });
}

export async function getProductTypeByUid(scopedApi: ScopedApi, uid: string) {
  return scopedApi.get(`provider/crm/lead/product/${uid}`);
}

export async function createProductType(scopedApi: ScopedApi, data: any) {
  return scopedApi.post("provider/crm/lead/product", data);
}

export async function updateProductType(scopedApi: ScopedApi, uid: string, data: any) {
  return scopedApi.put(`provider/crm/lead/product/${uid}`, data);
}

export async function changeProductTypeStatus(scopedApi: ScopedApi, uid: string, status: string) {
  return scopedApi.put(`provider/crm/lead/product/${uid}/status/${status}`, null);
}

export async function getLeadTemplates(scopedApi: ScopedApi) {
  return scopedApi.get("provider/crm/lead/template");
}

export async function getChannels(scopedApi: ScopedApi, filter: {} = {}) {
  return scopedApi.get("provider/crm/lead/channel", { params: filter });
}

export async function getChannelsCount(scopedApi: ScopedApi, filter: {} = {}) {
  return scopedApi.get("provider/crm/lead/channel/count", { params: filter });
}

export async function getChannelByUid(scopedApi: ScopedApi, uid: string) {
  return scopedApi.get(`provider/crm/lead/channel/${uid}`);
}

export async function createChannel(scopedApi: ScopedApi, data: any) {
  return scopedApi.post("provider/crm/lead/channel", data);
}

export async function updateChannel(scopedApi: ScopedApi, uid: string, data: any) {
  return scopedApi.put(`provider/crm/lead/channel/${uid}`, data);
}

export async function changeChannelStatus(scopedApi: ScopedApi, uid: string, status: string) {
  return scopedApi.put(`provider/crm/lead/channel/${uid}/status/${status}`, null);
}

export async function getChannelTemplates(scopedApi: ScopedApi, channelUid: string) {
  return scopedApi.get(`provider/crm/lead/template/channel/${channelUid}`);
}

export async function getLeadCustomers(scopedApi: ScopedApi, filter: {} = {}) {
  return scopedApi.get("provider/crm/lead/consumer", { params: filter });
}

export async function getLeadCustomersCount(scopedApi: ScopedApi, filter: {} = {}) {
  return scopedApi.get("provider/crm/lead/consumer/count", { params: filter });
}

export async function getLeadCustomerByUid(scopedApi: ScopedApi, uid: string) {
  return scopedApi.get(`provider/crm/lead/consumer/${uid}`);
}

export async function createLeadCustomer(scopedApi: ScopedApi, data: any) {
  return scopedApi.post("provider/crm/lead/consumer", data);
}

export async function updateLeadCustomer(scopedApi: ScopedApi, uid: string, data: any) {
  return scopedApi.put(`provider/crm/lead/consumer/${uid}`, data);
}

export async function getProviderLocations(scopedApi: ScopedApi, filter: {} = {}) {
  return scopedApi.get("provider/locations", { params: filter });
}

export async function getProviderUsers(scopedApi: ScopedApi, filter: {} = {}) {
  return scopedApi.get("provider/user", { params: filter });
}
