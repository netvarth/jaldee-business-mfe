import { BASE_SERVICE_ENDPOINTS, buildBaseServiceUrl } from "../../serviceUrls";

interface ScopedApi {
  get: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
  post: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  put: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  patch: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  delete: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
}

// CRM Lead Activity Controller
export async function getLeadActivitiesByLead(api: ScopedApi, leadUid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadActivities.byLead(leadUid)));
}

export async function createLeadActivityTimeline(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadActivities.timeline), data);
}

// CRM Lead Channel Controller
export async function listLeadChannels(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadChannels.list), { params: filters });
}

export async function createLeadChannel(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadChannels.create), data);
}

export async function getLeadChannelByUid(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadChannels.detail(uid)));
}

export async function updateLeadChannel(api: ScopedApi, uid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadChannels.update(uid)), data);
}

export async function getLeadChannelLink(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadChannels.link(uid)));
}

export async function patchLeadChannelStatus(api: ScopedApi, uid: string, status: string) {
  return api.patch(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadChannels.status(uid, status)));
}

export async function getLeadChannelEncoded(api: ScopedApi, encodedId: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadChannels.encoded(encodedId)));
}

export async function searchLeadChannels(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadChannels.search), data);
}

// CRM Lead Consumer Controller
export async function createLeadConsumer(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadConsumers.create), data);
}

export async function getLeadConsumerByUid(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadConsumers.detail(uid)));
}

export async function updateLeadConsumer(api: ScopedApi, uid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadConsumers.update(uid)), data);
}

export async function patchLeadConsumerStatus(api: ScopedApi, uid: string, status: unknown) {
  return api.patch(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadConsumers.status(uid)), status);
}

export async function searchLeadConsumers(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadConsumers.search), data);
}

// CRM Lead From Consumer Controller
export async function createLeadFromConsumer(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadConsumerSignup.create), data);
}

export async function sendLeadOtp(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadConsumerSignup.sendOtp), data);
}

export async function verifyLeadOtp(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadConsumerSignup.verifyOtp), data);
}

// CRM Lead Note Controller
export async function pinLeadNote(api: ScopedApi, noteUid: string) {
  return api.patch(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadNotes.pin(noteUid)));
}

export async function unpinLeadNote(api: ScopedApi, noteUid: string) {
  return api.patch(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadNotes.unpin(noteUid)));
}

export async function getLeadNotesByLead(api: ScopedApi, leadUid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadNotes.byLead(leadUid)));
}

export async function createLeadNote(api: ScopedApi, leadUid: string, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadNotes.createForLead(leadUid)), data);
}

export async function getLeadNotesByLeadPaged(api: ScopedApi, leadUid: string, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadNotes.pagedByLead(leadUid)), { params: filters });
}

// CRM Lead Pipeline Controller
export async function createLeadPipeline(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.create), data);
}

export async function createLeadPipelineStage(api: ScopedApi, pipelineUid: string, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.addStage(pipelineUid)), data);
}

export async function reorderLeadPipelineStages(api: ScopedApi, pipelineUid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.reorderStages(pipelineUid)), data);
}

export async function getLeadPipelineByUid(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.detail(uid)));
}

export async function updateLeadPipeline(api: ScopedApi, uid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.update(uid)), data);
}

export async function activateLeadPipeline(api: ScopedApi, uid: string) {
  return api.patch(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.activate(uid)));
}

export async function cloneLeadPipeline(api: ScopedApi, uid: string) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.clone(uid)));
}

export async function deactivateLeadPipeline(api: ScopedApi, uid: string) {
  return api.patch(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.deactivate(uid)));
}

export async function setDefaultLeadPipeline(api: ScopedApi, uid: string) {
  return api.patch(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.setDefault(uid)));
}

export async function getActiveLeadPipelines(api: ScopedApi) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.active));
}

export async function searchLeadPipelines(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.search), data);
}

export async function getLeadPipelineStage(api: ScopedApi, stageUid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.stageDetail(stageUid)));
}

export async function updateLeadPipelineStage(api: ScopedApi, stageUid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.updateStage(stageUid)), data);
}

export async function deactivateLeadPipelineStage(api: ScopedApi, stageUid: string) {
  return api.patch(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.deactivateStage(stageUid)));
}

// CRM Lead Product Controller
export async function createLeadProduct(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadProducts.create), data);
}

export async function getLeadProductByUid(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadProducts.detail(uid)));
}

export async function updateLeadProduct(api: ScopedApi, uid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadProducts.update(uid)), data);
}

export async function updateLeadProductStatus(api: ScopedApi, uid: string, status: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadProducts.status(uid, status)));
}

export async function searchLeadProducts(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadProducts.search), data);
}

// CRM Lead Provider Controller
export async function createCrmProviderLead(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.create), data);
}

export async function getCrmProviderLeadByUid(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.detail(uid)));
}

export async function updateCrmProviderLead(api: ScopedApi, uid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.update(uid)), data);
}

export async function assignCrmProviderLead(api: ScopedApi, uid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.assign(uid)), data);
}

export async function createCrmProviderLeadNote(api: ScopedApi, uid: string, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.notes(uid)), data);
}

export async function sendCrmProviderLeadMessage(api: ScopedApi, uid: string, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.sendMessage(uid)), data);
}

export async function setCrmProviderLeadStatusActive(api: ScopedApi, uid: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.active(uid)));
}

export async function setCrmProviderLeadStatusComplete(api: ScopedApi, uid: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.complete(uid)));
}

export async function setCrmProviderLeadStatusNoResponse(api: ScopedApi, uid: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.noResponse(uid)));
}

export async function setCrmProviderLeadStatusReject(api: ScopedApi, uid: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.reject(uid)));
}

export async function unassignCrmProviderLead(api: ScopedApi, uid: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.unassign(uid)));
}

export async function getCrmProviderLeadsMigrationTemplate(api: ScopedApi) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.migrationTemplate));
}

export async function searchCrmProviderLeads(api: ScopedApi, data: any) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.search), { ...data, status: "ACTIVE" });
}

// CRM Lead Stage Controller
export async function createLeadStage(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadStages.create), data);
}

export async function getLeadStageByUid(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadStages.detail(uid)));
}

export async function updateLeadStage(api: ScopedApi, uid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadStages.update(uid)), data);
}

export async function completeLeadStage(api: ScopedApi, uid: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadStages.complete(uid)));
}

export async function updateLeadStageStatus(api: ScopedApi, uid: string, status: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadStages.status(uid, status)));
}

export async function getLeadStagesByLead(api: ScopedApi, leadUid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadStages.byLead(leadUid)));
}

export async function searchLeadStages(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadStages.search), data);
}

// CRM Lead Stage Progress Controller
export async function setCrmProviderLeadPipeline(api: ScopedApi, uid: string, pipelineUid: string) {
  return api.patch(
    buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadStageProgress.setPipeline(uid, pipelineUid))
  );
}

export async function reopenCrmProviderLead(api: ScopedApi, uid: string) {
  return api.patch(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadStageProgress.reopen(uid)));
}

export async function getCrmProviderLeadStageHistory(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadStageProgress.history(uid)));
}

export async function progressCrmProviderLeadStage(api: ScopedApi, uid: string, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadStageProgress.progress(uid)), data);
}

// CRM Lead Template Controller
export async function getLeadTemplatesToken(api: ScopedApi) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadTemplates.list));
}

export async function createLeadTemplate(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadTemplates.create), data);
}

export async function getLeadTemplateByUid(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadTemplates.detail(uid)));
}

export async function updateLeadTemplate(api: ScopedApi, uid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadTemplates.update(uid)), data);
}

export async function searchLeadTemplates(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadTemplates.search), data);
}
