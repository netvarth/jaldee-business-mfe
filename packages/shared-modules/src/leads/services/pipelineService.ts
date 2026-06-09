import { apiClient } from "@jaldee/api-client";
import {
  BASE_SERVICE_ENDPOINTS,
  buildBaseServiceUrl,
} from "../../serviceUrls";
import type {
  CrmLeadPipelineDto,
  CrmLeadPipelineStageDto,
  LeadStageTask,
} from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ApiEnvelope<T> = {
  data?: T | { data?: T; content?: T; records?: T; items?: T };
  content?: T;
  records?: T;
  items?: T;
};

function unwrap<T>(value: unknown): T {
  const root = value as ApiEnvelope<T>;
  const data = root?.data as ApiEnvelope<T> | T | undefined;

  if (data && typeof data === "object") {
    const nested = data as ApiEnvelope<T>;
    return (nested.data ?? nested.content ?? nested.records ?? nested.items ?? data) as T;
  }

  return (root?.data ?? root?.content ?? root?.records ?? root?.items ?? value) as T;
}

function unwrapList<T>(value: unknown): T[] {
  const unwrapped = unwrap<unknown>(value);
  const list = Array.isArray(unwrapped)
    ? unwrapped
    : Array.isArray((unwrapped as any)?.content)
      ? (unwrapped as any).content
      : Array.isArray((unwrapped as any)?.records)
        ? (unwrapped as any).records
        : Array.isArray((unwrapped as any)?.items)
          ? (unwrapped as any).items
          : Array.isArray((unwrapped as any)?.data)
            ? (unwrapped as any).data
            : [];
  return list as T[];
}

const noLocation = { _skipLocationParam: true } as any;

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function toStage(raw: any): CrmLeadPipelineStageDto {
  const taskTemplates = Array.isArray(raw?.taskTemplates)
    ? raw.taskTemplates
    : Array.isArray(raw?.stageTaskTemplates)
      ? raw.stageTaskTemplates
      : Array.isArray(raw?.tasks)
        ? raw.tasks
        : Array.isArray(raw?.taskList)
          ? raw.taskList.map((task: any, index: number) => ({
              uid: String(task?.uid ?? task?.taskUid ?? `task-${index + 1}`),
              title: String(task?.title ?? task?.taskTitle ?? task?.taskName ?? ""),
              type: task?.type ?? task?.taskType ?? "TASK",
              required: Boolean(task?.required ?? task?.isRequired),
              autoCreate: Boolean(task?.autoCreate ?? task?.autogenerate ?? true),
              dueOffsetHours: Number(task?.dueOffsetHours ?? 0),
              assigneeRule: String(task?.assigneeRule ?? ""),
              priority: task?.priority ?? "NORMAL",
              outcomeRequired: Boolean(task?.outcomeRequired),
              active: task?.active !== false,
              description: task?.description,
            }))
          : undefined;

  return {
    uid: String(raw?.uid ?? raw?.stageUid ?? raw?.pipelineStageUid ?? raw?.id ?? ""),
    pipelineUid: String(raw?.pipelineUid ?? raw?.pipelineId ?? ""),
    pipelineName: String(raw?.pipelineName ?? raw?.pipeline?.name ?? ""),
    stageName: String(raw?.stageName ?? raw?.name ?? raw?.label ?? ""),
    stageOrder: Number(raw?.stageOrder ?? raw?.sequenceOrder ?? raw?.order ?? raw?.displayOrder ?? 0),
    color: String(raw?.color ?? "#6366f1"),
    probability: raw?.probability != null ? Number(raw.probability) : undefined,
    slaDays: raw?.slaDays != null ? Number(raw.slaDays) : undefined,
    isTerminal: Boolean(raw?.isTerminal ?? raw?.terminal),
    terminalType: raw?.terminalType,
    taskCompletionMode: raw?.taskCompletionMode ?? "NONE",
    autogenerateTasks: Boolean(raw?.autogenerateTasks),
    taskList: Array.isArray(raw?.taskList) ? raw.taskList : [],
    isActive: raw?.isActive ?? raw?.active ?? true,
    sequenceOrder: Number(raw?.sequenceOrder ?? raw?.stageOrder ?? raw?.order ?? raw?.displayOrder ?? 0),
    proceedStageUid: raw?.proceedStageUid,
    redirectStageUid: raw?.redirectStageUid,
    activeLeadCount: Number(raw?.activeLeadCount ?? 0),
    movementRule: raw?.movementRule,
    taskTemplates,
    conversionSetting: raw?.conversionSetting,
  };
}

function toPipeline(raw: any): CrmLeadPipelineDto {
  const rawStages = Array.isArray(raw?.stages)
    ? raw.stages
    : Array.isArray(raw?.pipelineStages)
      ? raw.pipelineStages
      : Array.isArray(raw?.pipelineStageList)
        ? raw.pipelineStageList
        : Array.isArray(raw?.stageList)
          ? raw.stageList
          : Array.isArray(raw?.crmLeadPipelineStages)
            ? raw.crmLeadPipelineStages
            : Array.isArray(raw?.crmLeadPipelineStageList)
              ? raw.crmLeadPipelineStageList
              : Array.isArray(raw?.leadPipelineStages)
                ? raw.leadPipelineStages
                : Array.isArray(raw?.stageDtos)
                  ? raw.stageDtos
                  : Array.isArray(raw?.stageDTOs)
                    ? raw.stageDTOs
                    : [];

  return {
    uid: String(raw?.uid ?? ""),
    name: String(raw?.name || raw?.pipelineName || "Untitled Pipeline"),
    description: String(raw?.description ?? ""),
    productUids: Array.isArray(raw?.productUids)
      ? raw.productUids
      : Array.isArray(raw?.products)
        ? raw.products.map((product: any) => String(product?.uid ?? product?.id ?? product)).filter(Boolean)
        : [],
    isDefault: Boolean(raw?.isDefault ?? raw?.default),
    isActive: raw?.isActive !== false,
    stagesInSequentialOrder: Boolean(raw?.stagesInSequentialOrder),
    stages: rawStages.map(toStage),
    createdByName: String(raw?.createdByName ?? raw?.createdBy ?? ""),
    createdAt: String(raw?.createdAt ?? ""),
  };
}

function toPipelineList(raw: unknown): CrmLeadPipelineDto[] {
  return unwrapList<any>(raw).map(toPipeline).filter((p) => p.uid);
}

function toStageTask(raw: any): LeadStageTask {
  return {
    uid: String(raw?.uid ?? ""),
    title: String(raw?.title ?? raw?.taskTitle ?? ""),
    type: raw?.type ?? "TASK",
    required: Boolean(raw?.required),
    completed: Boolean(raw?.completed ?? raw?.isDone),
    dueDate: raw?.dueDate,
    assigneeId: raw?.assigneeId ?? raw?.assignedTo,
    assigneeName: raw?.assigneeName,
    outcome: raw?.outcome,
    isManual: Boolean(raw?.isManual),
    createdAt: String(raw?.createdAt ?? ""),
    priority: raw?.priority,
    description: raw?.description,
    location: raw?.location,
    category: raw?.category,
    status: raw?.status,
  };
}

// ---------------------------------------------------------------------------
// Payload builders — maps frontend types → exact API field names
// ---------------------------------------------------------------------------

function toPipelinePayload(data: Partial<CrmLeadPipelineDto>) {
  const name = data.name?.trim();
  return {
    name,
    pipelineName: name,
    description: data.description?.trim() ?? undefined,
    stagesInSequentialOrder: data.stagesInSequentialOrder ?? false,
    default: data.isDefault ?? false,
  };
}

function toStagePayload(stage: Partial<CrmLeadPipelineStageDto>) {
  const taskList = Array.isArray(stage.taskList)
    ? stage.taskList.map((t: any, idx: number) => ({
        uid: t.uid ?? undefined,
        taskOrder: t.taskOrder ?? idx + 1,
        taskName: t.taskName ?? t.title ?? "",
      }))
    : [];

  return {
    uid: stage.uid,
    stageName: stage.stageName,
    stageOrder: stage.stageOrder,
    sequenceOrder: stage.sequenceOrder ?? stage.stageOrder,
    color: stage.color,
    probability: stage.probability ?? undefined,
    slaDays: stage.slaDays ?? undefined,
    terminal: stage.isTerminal ?? false,          // API uses "terminal" not "isTerminal"
    terminalType: stage.isTerminal ? stage.terminalType : undefined,
    taskCompletionMode: stage.taskCompletionMode ?? "NONE",
    autogenerateTasks: stage.autogenerateTasks ?? false,
    active: stage.isActive !== false,             // API uses "active" not "isActive"
    taskList,
    proceedStageUid: stage.proceedStageUid ?? undefined,
    redirectStageUid: stage.redirectStageUid ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const leadPipelineService = {
  endpoints: BASE_SERVICE_ENDPOINTS.crmLeadPipelines,

  // POST /v1/api/tenant/crm/leads/pipelines
  async create(data: Partial<CrmLeadPipelineDto>) {
    const response = await apiClient.post(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.create),
      toPipelinePayload(data),
      noLocation
    );
    const unwrapped = unwrap<any>(response);
    if (typeof unwrapped === "string") {
      return toPipeline({ uid: unwrapped });
    }
    return toPipeline(unwrapped);
  },

  // POST /v1/api/tenant/crm/leads/pipelines/{pipelineUid}/stages
  async addStage(pipelineUid: string, data: Partial<CrmLeadPipelineStageDto>) {
    const response = await apiClient.post(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.addStage(pipelineUid)),
      toStagePayload(data),
      noLocation
    );
    const unwrapped = unwrap<any>(response);
    const stageUid = typeof unwrapped === "string" ? unwrapped : String(unwrapped?.uid ?? "");
    try {
      return await leadPipelineService.stageDetail(stageUid);
    } catch {
      return toStage({ ...data, uid: stageUid, pipelineUid });
    }
  },

  // PUT /v1/api/tenant/crm/leads/pipelines/{pipelineUid}/stages/reorder
  async reorderStages(pipelineUid: string, stageUids: string[]) {
    const response = await apiClient.put(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.reorderStages(pipelineUid)),
      { stageUids },
      noLocation
    );
    return unwrap(response);
  },

  // GET /v1/api/tenant/crm/leads/pipelines/{uid}
  async detail(uid: string) {
    const response = await apiClient.get(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.detail(uid))
    );
    return toPipeline(unwrap(response));
  },

  // PUT /v1/api/tenant/crm/leads/pipelines/{uid}
  async update(uid: string, data: Partial<CrmLeadPipelineDto>) {
    const response = await apiClient.put(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.update(uid)),
      toPipelinePayload(data),
      noLocation
    );
    return toPipeline(unwrap(response));
  },

  // PATCH /v1/api/tenant/crm/leads/pipelines/{uid}/activate
  async activate(uid: string) {
    await apiClient.patch(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.activate(uid)),
      undefined,
      noLocation
    );
  },

  // POST /v1/api/tenant/crm/leads/pipelines/{uid}/clone
  async clone(uid: string) {
    const response = await apiClient.post(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.clone(uid)),
      undefined,
      noLocation
    );
    return toPipeline(unwrap(response));
  },

  // PATCH /v1/api/tenant/crm/leads/pipelines/{uid}/deactivate
  async deactivate(uid: string) {
    await apiClient.patch(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.deactivate(uid)),
      undefined,
      noLocation
    );
  },

  // DELETE /v1/api/tenant/crm/leads/pipelines/{uid}
  async delete(uid: string) {
    await apiClient.delete(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.delete(uid)),
      noLocation
    );
  },

  // PATCH /v1/api/tenant/crm/leads/pipelines/{uid}/default
  async setDefault(uid: string) {
    await apiClient.patch(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.setDefault(uid)),
      undefined,
      noLocation
    );
  },

  // GET /v1/api/tenant/crm/leads/pipelines/active
  async listActive() {
    const response = await apiClient.get(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.active)
    );
    return toPipelineList(response);
  },

  // POST /v1/api/tenant/crm/leads/pipelines/search
  async search(
    filters: Record<string, unknown> = {},
    params: { page?: number; size?: number } = { page: 0, size: 100 }
  ) {
    const response = await apiClient.post(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.search),
      filters,
      { _skipLocationParam: true, params }
    );
    return toPipelineList(response);
  },

  // GET /v1/api/tenant/crm/leads/pipelines/stages/{stageUid}
  async stageDetail(stageUid: string) {
    const response = await apiClient.get(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.stageDetail(stageUid))
    );
    return toStage(unwrap(response));
  },

  // PUT /v1/api/tenant/crm/leads/pipelines/stages/{stageUid}
  async updateStage(stageUid: string, data: Partial<CrmLeadPipelineStageDto>) {
    const response = await apiClient.put(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.updateStage(stageUid)),
      toStagePayload(data),
      noLocation
    );
    return toStage(unwrap(response));
  },

  // PATCH /v1/api/tenant/crm/leads/pipelines/stages/{stageUid}/deactivate
  async deactivateStage(stageUid: string) {
    await apiClient.patch(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.deactivateStage(stageUid)),
      undefined,
      noLocation
    );
  },

  // GET /v1/api/tenant/crm/leads/pipelines/stages/{stageUid}/tasks/lead/{leadUid}
  async stageTasksByLead(stageUid: string, leadUid: string): Promise<LeadStageTask[]> {
    const response = await apiClient.get(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.stageTasksByLead(stageUid, leadUid))
    );
    return unwrapList<any>(response).map(toStageTask);
  },
};
