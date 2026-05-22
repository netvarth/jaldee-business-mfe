import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiScope } from "../../useApiScope";
import * as services from "../services/crmLeads";

const CRM_LEADS_KEY = "crm-leads";

// CRM Lead Activity Controller
export function useLeadActivitiesByLead(leadUid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [CRM_LEADS_KEY, "activities", leadUid],
    queryFn: () => services.getLeadActivitiesByLead(api, leadUid),
    enabled: Boolean(leadUid),
  });
}

export function useCreateLeadActivityTimeline() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createLeadActivityTimeline(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "activities"] });
    },
  });
}

// CRM Lead Channel Controller
export function useListLeadChannels(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [CRM_LEADS_KEY, "channels", filters],
    queryFn: () => services.listLeadChannels(api, filters),
  });
}

export function useCreateLeadChannel() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createLeadChannel(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "channels"] });
    },
  });
}

export function useLeadChannelByUid(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [CRM_LEADS_KEY, "channel-detail", uid],
    queryFn: () => services.getLeadChannelByUid(api, uid),
    enabled: Boolean(uid),
  });
}

export function useUpdateLeadChannel(uid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateLeadChannel(api, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "channel-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "channels"] });
    },
  });
}

export function useLeadChannelLink(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [CRM_LEADS_KEY, "channel-link", uid],
    queryFn: () => services.getLeadChannelLink(api, uid),
    enabled: Boolean(uid),
  });
}

export function usePatchLeadChannelStatus() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: string }) =>
      services.patchLeadChannelStatus(api, uid, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "channel-detail", variables.uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "channels"] });
    },
  });
}

export function useLeadChannelEncoded(encodedId: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [CRM_LEADS_KEY, "channel-encoded", encodedId],
    queryFn: () => services.getLeadChannelEncoded(api, encodedId),
    enabled: Boolean(encodedId),
  });
}

export function useSearchLeadChannels() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.searchLeadChannels(api, data),
  });
}

// CRM Lead Consumer Controller
export function useCreateLeadConsumer() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createLeadConsumer(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "consumers"] });
    },
  });
}

export function useLeadConsumerByUid(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [CRM_LEADS_KEY, "consumer-detail", uid],
    queryFn: () => services.getLeadConsumerByUid(api, uid),
    enabled: Boolean(uid),
  });
}

export function useUpdateLeadConsumer(uid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateLeadConsumer(api, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "consumer-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "consumers"] });
    },
  });
}

export function usePatchLeadConsumerStatus() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: unknown }) =>
      services.patchLeadConsumerStatus(api, uid, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "consumer-detail", variables.uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "consumers"] });
    },
  });
}

export function useSearchLeadConsumers() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.searchLeadConsumers(api, data),
  });
}

// CRM Lead From Consumer Controller
export function useCreateLeadFromConsumer() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.createLeadFromConsumer(api, data),
  });
}

export function useSendLeadOtp() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.sendLeadOtp(api, data),
  });
}

export function useVerifyLeadOtp() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.verifyLeadOtp(api, data),
  });
}

// CRM Lead Note Controller
export function usePinLeadNote() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteUid: string) => services.pinLeadNote(api, noteUid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "notes"] });
    },
  });
}

export function useUnpinLeadNote() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteUid: string) => services.unpinLeadNote(api, noteUid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "notes"] });
    },
  });
}

export function useLeadNotesByLead(leadUid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [CRM_LEADS_KEY, "notes", leadUid],
    queryFn: () => services.getLeadNotesByLead(api, leadUid),
    enabled: Boolean(leadUid),
  });
}

export function useCreateLeadNote(leadUid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createLeadNote(api, leadUid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "notes", leadUid] });
    },
  });
}

export function useLeadNotesByLeadPaged(leadUid: string, filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [CRM_LEADS_KEY, "notes-paged", leadUid, filters],
    queryFn: () => services.getLeadNotesByLeadPaged(api, leadUid, filters),
    enabled: Boolean(leadUid),
  });
}

// CRM Lead Pipeline Controller
export function useCreateLeadPipeline() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createLeadPipeline(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "pipelines"] });
    },
  });
}

export function useCreateLeadPipelineStage(pipelineUid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createLeadPipelineStage(api, pipelineUid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "pipeline-detail", pipelineUid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "pipelines"] });
    },
  });
}

export function useReorderLeadPipelineStages(pipelineUid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.reorderLeadPipelineStages(api, pipelineUid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "pipeline-detail", pipelineUid] });
    },
  });
}

export function useLeadPipelineByUid(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [CRM_LEADS_KEY, "pipeline-detail", uid],
    queryFn: () => services.getLeadPipelineByUid(api, uid),
    enabled: Boolean(uid),
  });
}

export function useUpdateLeadPipeline(uid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateLeadPipeline(api, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "pipeline-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "pipelines"] });
    },
  });
}

export function useActivateLeadPipeline() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.activateLeadPipeline(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "pipeline-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "pipelines"] });
    },
  });
}

export function useCloneLeadPipeline() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.cloneLeadPipeline(api, uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "pipelines"] });
    },
  });
}

export function useDeactivateLeadPipeline() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.deactivateLeadPipeline(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "pipeline-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "pipelines"] });
    },
  });
}

export function useSetDefaultLeadPipeline() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.setDefaultLeadPipeline(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "pipeline-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "pipelines"] });
    },
  });
}

export function useActiveLeadPipelines() {
  const api = useApiScope();
  return useQuery({
    queryKey: [CRM_LEADS_KEY, "pipelines-active"],
    queryFn: () => services.getActiveLeadPipelines(api),
  });
}

export function useSearchLeadPipelines() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.searchLeadPipelines(api, data),
  });
}

export function useLeadPipelineStage(stageUid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [CRM_LEADS_KEY, "stage-detail", stageUid],
    queryFn: () => services.getLeadPipelineStage(api, stageUid),
    enabled: Boolean(stageUid),
  });
}

export function useUpdateLeadPipelineStage(stageUid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateLeadPipelineStage(api, stageUid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "stage-detail", stageUid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "pipelines"] });
    },
  });
}

export function useDeactivateLeadPipelineStage(stageUid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => services.deactivateLeadPipelineStage(api, stageUid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "stage-detail", stageUid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "pipelines"] });
    },
  });
}

// CRM Lead Product Controller
export function useCreateLeadProduct() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createLeadProduct(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "products"] });
    },
  });
}

export function useLeadProductByUid(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [CRM_LEADS_KEY, "product-detail", uid],
    queryFn: () => services.getLeadProductByUid(api, uid),
    enabled: Boolean(uid),
  });
}

export function useUpdateLeadProduct(uid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateLeadProduct(api, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "product-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "products"] });
    },
  });
}

export function useUpdateLeadProductStatus() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: string }) =>
      services.updateLeadProductStatus(api, uid, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "product-detail", variables.uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "products"] });
    },
  });
}

export function useSearchLeadProducts() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.searchLeadProducts(api, data),
  });
}

// CRM Lead Provider Controller
export function useCreateCrmProviderLead() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createCrmProviderLead(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "provider-leads"] });
    },
  });
}

export function useCrmProviderLeadByUid(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [CRM_LEADS_KEY, "provider-lead-detail", uid],
    queryFn: () => services.getCrmProviderLeadByUid(api, uid),
    enabled: Boolean(uid),
  });
}

export function useUpdateCrmProviderLead(uid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateCrmProviderLead(api, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "provider-lead-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "provider-leads"] });
    },
  });
}

export function useAssignCrmProviderLead(uid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.assignCrmProviderLead(api, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "provider-lead-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "provider-leads"] });
    },
  });
}

export function useCreateCrmProviderLeadNote(uid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createCrmProviderLeadNote(api, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "provider-lead-detail", uid] });
    },
  });
}

export function useSendCrmProviderLeadMessage(uid: string) {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.sendCrmProviderLeadMessage(api, uid, data),
  });
}

export function useSetCrmProviderLeadStatusActive() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.setCrmProviderLeadStatusActive(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "provider-lead-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "provider-leads"] });
    },
  });
}

export function useSetCrmProviderLeadStatusComplete() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.setCrmProviderLeadStatusComplete(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "provider-lead-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "provider-leads"] });
    },
  });
}

export function useSetCrmProviderLeadStatusNoResponse() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.setCrmProviderLeadStatusNoResponse(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "provider-lead-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "provider-leads"] });
    },
  });
}

export function useSetCrmProviderLeadStatusReject() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.setCrmProviderLeadStatusReject(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "provider-lead-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "provider-leads"] });
    },
  });
}

export function useUnassignCrmProviderLead() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.unassignCrmProviderLead(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "provider-lead-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "provider-leads"] });
    },
  });
}

export function useCrmProviderLeadsMigrationTemplate() {
  const api = useApiScope();
  return useQuery({
    queryKey: [CRM_LEADS_KEY, "migration-template"],
    queryFn: () => services.getCrmProviderLeadsMigrationTemplate(api),
  });
}

export function useSearchCrmProviderLeads() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.searchCrmProviderLeads(api, data),
  });
}

// CRM Lead Stage Controller
export function useCreateLeadStage() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createLeadStage(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "stages"] });
    },
  });
}

export function useLeadStageByUid(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [CRM_LEADS_KEY, "stage-detail", uid],
    queryFn: () => services.getLeadStageByUid(api, uid),
    enabled: Boolean(uid),
  });
}

export function useUpdateLeadStage(uid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateLeadStage(api, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "stage-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "stages"] });
    },
  });
}

export function useCompleteLeadStage() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.completeLeadStage(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "stage-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "stages"] });
    },
  });
}

export function useUpdateLeadStageStatus() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: string }) =>
      services.updateLeadStageStatus(api, uid, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "stage-detail", variables.uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "stages"] });
    },
  });
}

export function useLeadStagesByLead(leadUid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [CRM_LEADS_KEY, "stages-by-lead", leadUid],
    queryFn: () => services.getLeadStagesByLead(api, leadUid),
    enabled: Boolean(leadUid),
  });
}

export function useSearchLeadStages() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.searchLeadStages(api, data),
  });
}

// CRM Lead Stage Progress Controller
export function useSetCrmProviderLeadPipeline() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, pipelineUid }: { uid: string; pipelineUid: string }) =>
      services.setCrmProviderLeadPipeline(api, uid, pipelineUid),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "provider-lead-detail", variables.uid] });
    },
  });
}

export function useReopenCrmProviderLead() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.reopenCrmProviderLead(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "provider-lead-detail", uid] });
    },
  });
}

export function useCrmProviderLeadStageHistory(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [CRM_LEADS_KEY, "stage-history", uid],
    queryFn: () => services.getCrmProviderLeadStageHistory(api, uid),
    enabled: Boolean(uid),
  });
}

export function useProgressCrmProviderLeadStage(uid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.progressCrmProviderLeadStage(api, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "provider-lead-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "stage-history", uid] });
    },
  });
}

// CRM Lead Template Controller
export function useLeadTemplatesToken() {
  const api = useApiScope();
  return useQuery({
    queryKey: [CRM_LEADS_KEY, "templates"],
    queryFn: () => services.getLeadTemplatesToken(api),
  });
}

export function useCreateLeadTemplate() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createLeadTemplate(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "templates"] });
    },
  });
}

export function useLeadTemplateByUid(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [CRM_LEADS_KEY, "template-detail", uid],
    queryFn: () => services.getLeadTemplateByUid(api, uid),
    enabled: Boolean(uid),
  });
}

export function useUpdateLeadTemplate(uid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateLeadTemplate(api, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "template-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [CRM_LEADS_KEY, "templates"] });
    },
  });
}

export function useSearchLeadTemplates() {
  const api = useApiScope();
  return useMutation({
    mutationFn: (data: unknown) => services.searchLeadTemplates(api, data),
  });
}
