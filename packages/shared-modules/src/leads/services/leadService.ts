import { apiClient } from "@jaldee/api-client";
import {
  BASE_SERVICE_ENDPOINTS,
  buildBaseServiceUrl,
} from "../../serviceUrls";
import type { CrmLeadDto, ChannelType, Priority, InternalStatus, LeadStageTask } from "../types";

type LeadSearchParams = {
  page?: number;
  size?: number;
  sort?: string;
};

const LEAD_SEARCH_BODY_KEYS = new Set([
  "tenantUid",
  "status",
  "productTypeEnum",
  "channelType",
  "channelUid",
  "productUid",
  "ownerId",
  "locationUid",
  "assigneeUserId",
  "fromDate",
  "toDate",
  "q",
  "pipelineUid",
  "pipelineStageUid",
  "priority",
  "noPipeline",
  "isDuplicate",
]);

const withoutLocationParam = (params?: LeadSearchParams) => ({
  _skipLocationParam: true,
  ...(params ? { params } : {}),
}) as any;

type ApiEnvelope<T> = {
  data?: T | { data?: T; content?: T; records?: T; items?: T };
  content?: T;
  records?: T;
  items?: T;
};

export type TaskLookupOption = {
  id: string | number;
  name: string;
};

export type CreateTenantTaskInput = {
  title: string;
  description?: string;
  dueDate: string;
  priorityId?: string | number;
  categoryId?: string | number;
  typeId?: string | number;
  statusId?: string | number;
  assigneeUid?: string | number;
  locationId?: string | number;
  originFrom?: string;
  originUid?: string;
  crmLeadStageUid?: string;
};

function normalizeTaskTypeLabel(value?: string): LeadStageTask["type"] {
  const normalized = String(value || "").trim().toUpperCase();
  return ["CALL", "EMAIL", "MEETING", "DOCUMENT", "TASK"].includes(normalized)
    ? (normalized as LeadStageTask["type"])
    : "TASK";
}

function unwrap<T>(value: unknown): T {
  const root = value as ApiEnvelope<T>;
  const data = root?.data as ApiEnvelope<T> | T | undefined;

  if (data && typeof data === "object") {
    const nested = data as ApiEnvelope<T>;
    return (nested.data ?? nested.content ?? nested.records ?? nested.items ?? data) as T;
  }

  return (root?.data ?? root?.content ?? root?.records ?? root?.items ?? value) as T;
}

function firstString(...values: unknown[]) {
  const value = values.find((item) => item != null && String(item).trim() !== "");
  return value == null ? "" : String(value);
}

function optionalString(...values: unknown[]) {
  const value = firstString(...values);
  return value || undefined;
}

function unwrapList(raw: unknown): any[] {
  const unwrapped = unwrap<any>(raw);

  if (Array.isArray(unwrapped)) return unwrapped;
  if (Array.isArray(unwrapped?.content)) return unwrapped.content;
  if (Array.isArray(unwrapped?.records)) return unwrapped.records;
  if (Array.isArray(unwrapped?.items)) return unwrapped.items;
  if (Array.isArray(unwrapped?.data)) return unwrapped.data;

  return [];
}

function toLookupOption(raw: any): TaskLookupOption | null {
  const id = raw?.id ?? raw?.uid;
  const name = firstString(raw?.name, raw?.displayName, raw?.title, raw?.label);

  if (id === undefined || id === null || !name) return null;
  return { id, name };
}

function toTenantLeadTask(raw: any): LeadStageTask {
  const priorityName = firstString(raw?.priorityName, raw?.priority?.name);
  const categoryName = firstString(raw?.categoryName, raw?.category?.name);
  const statusName = firstString(raw?.statusName, raw?.status?.name);
  const typeName = firstString(raw?.typeName, raw?.type?.name);
  const locationName = firstString(raw?.locationName, raw?.location?.name, raw?.location?.place);
  const assigneeName = firstString(raw?.assigneeName, raw?.assignee?.name, raw?.assignee?.fullName);

  return {
    uid: String(raw?.taskUid ?? raw?.uid ?? raw?.id ?? ""),
    title: firstString(raw?.title, raw?.taskName, raw?.taskTitle) || "Untitled task",
    type: normalizeTaskTypeLabel(typeName),
    required: Boolean(raw?.required ?? raw?.isRequired),
    completed: Boolean(raw?.completed ?? raw?.isDone ?? /complete/i.test(statusName)),
    isManual: true,
    createdAt: String(raw?.createdAt ?? raw?.createdDate ?? ""),
    priority: priorityName ? (priorityName.toUpperCase() as LeadStageTask["priority"]) : undefined,
    description: optionalString(raw?.description),
    location: optionalString(locationName),
    assigneeId: optionalString(raw?.assigneeUid, raw?.assigneeId, raw?.assignee?.id),
    assigneeName: optionalString(assigneeName),
    dueDate: optionalString(raw?.dueDate),
    category: optionalString(categoryName),
    status: optionalString(statusName),
  };
}

function fullName(...parts: unknown[]) {
  return parts.map((part) => String(part ?? "").trim()).filter(Boolean).join(" ");
}

function toLead(raw: any): CrmLeadDto {
  const consumer = raw?.consumer ?? raw?.customer ?? raw?.prospect ?? raw?.leadConsumer ?? {};
  const channel = raw?.channel ?? raw?.leadChannel ?? {};
  const product =
    raw?.product ??
    raw?.service ??
    raw?.leadProduct ??
    raw?.targetProduct ??
    raw?.offeredProduct ??
    raw?.productOffered ??
    {};
  const pipeline = raw?.pipeline ?? raw?.leadPipeline ?? {};
  const currentStage = raw?.currentStage ?? raw?.currentPipelineStage ?? raw?.stage ?? {};
  const owner =
    raw?.owner ??
    raw?.assignee ??
    raw?.assignedTo ??
    raw?.assignedUser ??
    raw?.assignedProvider ??
    raw?.leadOwner ??
    raw?.salesOwner ??
    raw?.salesPerson ??
    raw?.salesRep ??
    raw?.user ??
    {};
  const location = raw?.location ?? raw?.leadLocation ?? {};
  const firstName = firstString(
    raw?.consumerFirstName,
    raw?.firstName,
    raw?.customerFirstName,
    consumer?.firstName,
    consumer?.consumerFirstName,
    consumer?.name?.firstName
  );
  const lastName = firstString(
    raw?.consumerLastName,
    raw?.lastName,
    raw?.customerLastName,
    consumer?.lastName,
    consumer?.consumerLastName,
    consumer?.name?.lastName
  );
  const displayName = fullName(firstName, lastName) || firstString(raw?.consumerName, raw?.customerName, raw?.leadName, consumer?.name, consumer?.fullName);
  const [fallbackFirstName = "", ...fallbackLastName] = displayName.split(/\s+/).filter(Boolean);

  return {
    uid: firstString(raw?.uid, raw?.uuid, raw?.id, raw?.leadUid),
    referenceNo: firstString(raw?.referenceNo, raw?.leadNo, raw?.leadNumber, raw?.leadId, raw?.displayId),
    leadDate: firstString(raw?.leadDate, raw?.createdDate, raw?.createdAt, raw?.date),
    channelUid: firstString(raw?.channelUid, raw?.channelId, channel?.uid, channel?.id),
    channelName: firstString(raw?.channelName, channel?.name, channel?.channelName, raw?.sourceName, raw?.source),
    channelType: (raw?.channelType ?? channel?.type ?? channel?.channelType ?? "DIRECT") as ChannelType,
    productUid: firstString(
      raw?.productUid,
      raw?.productId,
      raw?.crmProductUid,
      raw?.crmProductId,
      raw?.leadProductUid,
      raw?.leadProductId,
      raw?.serviceUid,
      raw?.serviceId,
      raw?.solutionUid,
      raw?.solutionId,
      raw?.targetProductUid,
      raw?.targetProductId,
      raw?.offeredProductUid,
      raw?.offeredProductId,
      product?.uid,
      product?.id,
      product?.productUid,
      product?.productId
    ),
    productName: firstString(
      raw?.productName,
      raw?.crmProductName,
      raw?.leadProductName,
      raw?.targetProductName,
      raw?.offeredProductName,
      raw?.productOfferedName,
      raw?.serviceDisplayName,
      raw?.solutionName,
      product?.name,
      product?.displayName,
      product?.productName,
      raw?.serviceName
    ),
    productEnum: firstString(raw?.productEnum, raw?.productCode, raw?.serviceCode, product?.productEnum, product?.typeEnum, product?.code),
    pipelineUid: firstString(raw?.pipelineUid, raw?.pipelineId, pipeline?.uid, pipeline?.id),
    pipelineName: firstString(raw?.pipelineName, pipeline?.name, pipeline?.pipelineName),
    currentPipelineStageUid: firstString(raw?.currentPipelineStageUid, raw?.stageUid, raw?.currentStageUid, currentStage?.uid, currentStage?.id),
    currentPipelineStageName: firstString(raw?.currentPipelineStageName, raw?.stageName, raw?.currentStageName, currentStage?.stageName, currentStage?.name),
    consumerFirstName: firstName || fallbackFirstName,
    consumerLastName: lastName || fallbackLastName.join(" "),
    consumerPhone: firstString(raw?.consumerPhone, raw?.phone, raw?.phoneNumber, raw?.mobile, consumer?.phone, consumer?.mobile, consumer?.phoneNumber),
    consumerEmail: optionalString(raw?.consumerEmail, raw?.email, consumer?.email),
    consumerGender: optionalString(raw?.consumerGender, raw?.gender, consumer?.gender),
    consumerDob: optionalString(raw?.consumerDob, raw?.dob, raw?.dateOfBirth, consumer?.dob, consumer?.dateOfBirth),
    consumerAddress: optionalString(raw?.consumerAddress, raw?.address, consumer?.address, location?.address),
    consumerCity: optionalString(raw?.consumerCity, raw?.city, consumer?.city, location?.city),
    consumerState: optionalString(raw?.consumerState, raw?.state, consumer?.state, location?.state),
    consumerCountry: optionalString(raw?.consumerCountry, raw?.country, consumer?.country, location?.country),
    consumerPin: optionalString(raw?.consumerPin, raw?.pin, raw?.zip, raw?.postalCode, consumer?.pin, location?.pin, location?.postalCode),
    company: optionalString(raw?.company, raw?.companyName, raw?.businessName, consumer?.company, consumer?.companyName),
    expectedValue: raw?.expectedValue != null ? String(raw.expectedValue) : undefined,
    winProbability: raw?.winProbability != null ? Number(raw.winProbability) : undefined,
    ownerId: firstString(
      raw?.ownerId,
      raw?.assigneeId,
      raw?.assignedToId,
      raw?.assignedUserId,
      raw?.assignedProviderId,
      raw?.leadOwnerId,
      raw?.salesOwnerId,
      raw?.salesPersonId,
      raw?.salesRepId,
      owner?.uid,
      owner?.id,
      owner?.userId
    ),
    ownerName: firstString(
      raw?.ownerName,
      raw?.assigneeName,
      raw?.assignedToName,
      raw?.assignedUserName,
      raw?.assignedProviderName,
      raw?.leadOwnerName,
      raw?.salesOwnerName,
      raw?.salesPersonName,
      raw?.salesRepName,
      raw?.updatedByName,
      owner?.name,
      owner?.userName,
      fullName(owner?.firstName, owner?.lastName)
    ),
    assignees: Array.isArray(raw?.assignees) ? raw.assignees : [],
    priority: (raw?.priority ?? raw?.leadPriority ?? "NORMAL") as Priority,
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    internalStatus: (raw?.internalStatus ?? raw?.status ?? raw?.leadStatus ?? "ACTIVE") as InternalStatus,
    isRejected: Boolean(raw?.isRejected ?? raw?.rejected),
    isConverted: Boolean(raw?.isConverted ?? raw?.converted),
    isDuplicate: Boolean(raw?.isDuplicate ?? raw?.duplicate),
    nextFollowupAt: raw?.nextFollowupAt ?? raw?.nextFollowUpAt ?? raw?.followupAt ?? raw?.followUpDate ?? undefined,
    lastActivityAt: firstString(raw?.lastActivityAt, raw?.updatedAt, raw?.updatedDate),
    generalNotes: Array.isArray(raw?.generalNotes) ? raw.generalNotes : [],
    stageHistory: Array.isArray(raw?.stageHistory) ? raw.stageHistory : [],
    attachments: Array.isArray(raw?.attachments) ? raw.attachments : [],
    createdAt: String(raw?.createdAt ?? ""),
    updatedAt: String(raw?.updatedAt ?? ""),
    createdByName: String(raw?.createdByName ?? ""),
    customFormData: raw?.customFormData ?? {},
    stageTasks: Array.isArray(raw?.stageTasks) ? raw.stageTasks : [],
    convertedTargetType: raw?.convertedTargetType,
    convertedObjectRef: raw?.convertedObjectRef,
    convertedOn: raw?.convertedOn,
    convertedNotes: raw?.convertedNotes,
    convertedBy: raw?.convertedBy,
  };
}

function toLeadList(raw: unknown): CrmLeadDto[] {
  const unwrapped = unwrap<unknown>(raw);
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

  return list.map(toLead).filter((lead) => lead.uid);
}

function toLeadPayload(lead: Partial<CrmLeadDto>) {
  return {
    consumerFirstName: lead.consumerFirstName?.trim(),
    consumerLastName: lead.consumerLastName?.trim(),
    consumerPhone: lead.consumerPhone?.trim(),
    consumerEmail: lead.consumerEmail?.trim() || undefined,
    company: lead.company?.trim() || undefined,
    channelUid: lead.channelUid || undefined,
    productUid: lead.productUid || undefined,
    productName: lead.productName || undefined,
    pipelineUid: lead.pipelineUid || undefined,
    currentPipelineStageUid: lead.currentPipelineStageUid || undefined,
    priority: lead.priority || "NORMAL",
    expectedValue: lead.expectedValue || undefined,
    ownerId: lead.ownerId || undefined,
    ownerName: lead.ownerName || undefined,
    customFormData: lead.customFormData || undefined,
  };
}

function toLeadSearchBody(filters: Record<string, unknown>) {
  return Object.entries(filters).reduce<Record<string, unknown>>((body, [key, value]) => {
    if (!LEAD_SEARCH_BODY_KEYS.has(key)) return body;
    if (value === undefined || value === null || value === "") return body;
    if (typeof value === "string" && value.trim() === "") return body;
    body[key] = typeof value === "string" ? value.trim() : value;
    return body;
  }, {});
}

const leadDetailRequests = new Map<string, Promise<CrmLeadDto>>();
const leadTenantTaskRequests = new Map<string, Promise<LeadStageTask[]>>();
const leadDetailCache = new Map<string, CrmLeadDto>();
const leadTenantTaskCache = new Map<string, LeadStageTask[]>();

export const leadService = {
  async getTaskPriorities() {
    const response = await apiClient.get(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskPriorities.list),
      withoutLocationParam()
    );
    return unwrapList(response).map(toLookupOption).filter((item): item is TaskLookupOption => Boolean(item));
  },

  async getTaskTypes() {
    const response = await apiClient.get(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTypes.list),
      withoutLocationParam()
    );
    return unwrapList(response).map(toLookupOption).filter((item): item is TaskLookupOption => Boolean(item));
  },

  async getTaskCategories() {
    const response = await apiClient.get(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskCategories.list),
      withoutLocationParam()
    );
    return unwrapList(response).map(toLookupOption).filter((item): item is TaskLookupOption => Boolean(item));
  },

  async getTaskStatuses() {
    const response = await apiClient.get(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskStatuses.list),
      withoutLocationParam()
    );
    return unwrapList(response).map(toLookupOption).filter((item): item is TaskLookupOption => Boolean(item));
  },

  async createTenantTask(input: CreateTenantTaskInput) {
    const response = await apiClient.post(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.create),
      input,
      {
        skipLocationScope: true,
        _skipLocationParam: true,
      } as any
    );
    if (input.originUid) {
      leadTenantTaskCache.delete(String(input.originUid));
      leadTenantTaskRequests.delete(String(input.originUid));
    }
    return unwrap(response);
  },

  async getLeadTenantTasks(leadUid: string) {
    const cachedTasks = leadTenantTaskCache.get(leadUid);
    if (cachedTasks) return cachedTasks;

    const existingRequest = leadTenantTaskRequests.get(leadUid);
    if (existingRequest) return existingRequest;

    const request = apiClient.post(
        buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.search),
        {
          "originFrom-eq": "LEAD",
          "originUid-eq": leadUid,
        },
        {
          skipLocationScope: true,
          _skipLocationParam: true,
          params: {
            page: 0,
            size: 100,
          },
        } as any
      )
      .then((response) => {
        const tasks = unwrapList(response).map(toTenantLeadTask).filter((task) => task.uid);
        leadTenantTaskCache.set(leadUid, tasks);
        return tasks;
      })
      .finally(() => {
        leadTenantTaskRequests.delete(leadUid);
      });

    leadTenantTaskRequests.set(leadUid, request);
    return request;
  },

  async search(filters: Record<string, unknown> = {}, params: LeadSearchParams = { page: 0, size: 100 }) {
    const response = await apiClient.post(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.search),
      toLeadSearchBody(filters),
      withoutLocationParam(params)
    );
    return toLeadList(response);
  },

  async create(lead: Partial<CrmLeadDto>) {
    const response = await apiClient.post(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.create),
      toLeadPayload(lead),
      withoutLocationParam()
    );
    return toLead(unwrap(response));
  },

  async detail(uid: string) {
    const cachedLead = leadDetailCache.get(uid);
    if (cachedLead) return cachedLead;

    const existingRequest = leadDetailRequests.get(uid);
    if (existingRequest) return existingRequest;

    const request = apiClient.get(
        buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.detail(uid))
      )
      .then((response) => {
        const lead = toLead(unwrap(response));
        leadDetailCache.set(uid, lead);
        return lead;
      })
      .finally(() => {
        leadDetailRequests.delete(uid);
      });

    leadDetailRequests.set(uid, request);
    return request;
  },

  async update(uid: string, lead: Partial<CrmLeadDto>) {
    const response = await apiClient.put(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.update(uid)),
      toLeadPayload(lead),
      withoutLocationParam()
    );
    const updatedLead = toLead(unwrap(response));
    leadDetailCache.set(uid, updatedLead);
    leadTenantTaskCache.delete(uid);
    return updatedLead;
  },

  async completeStage(uid: string) {
    const response = await apiClient.patch(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadStageProgress.completeStage(uid)),
      undefined,
      withoutLocationParam()
    );
    const unwrapped = unwrap(response);
    const updatedLead = unwrapped && typeof unwrapped === "object" ? toLead(unwrapped) : undefined;
    if (updatedLead) leadDetailCache.set(uid, updatedLead);
    leadTenantTaskCache.delete(uid);
    return updatedLead;
  },

  async previousStage(uid: string, payload: Record<string, unknown> = {}) {
    const response = await apiClient.patch(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadStageProgress.previousStage(uid)),
      payload,
      withoutLocationParam()
    );
    const unwrapped = unwrap(response);
    const updatedLead = unwrapped && typeof unwrapped === "object" ? toLead(unwrapped) : undefined;
    if (updatedLead) leadDetailCache.set(uid, updatedLead);
    leadTenantTaskCache.delete(uid);
    return updatedLead;
  },

  async updateStatus(uid: string, status: string) {
    let url = "";
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === "active") {
      url = BASE_SERVICE_ENDPOINTS.crmProviderLeads.active(uid);
    } else if (lowerStatus === "complete" || lowerStatus === "completed") {
      url = BASE_SERVICE_ENDPOINTS.crmProviderLeads.complete(uid);
    } else if (lowerStatus === "noresponse" || lowerStatus === "no_response") {
      url = BASE_SERVICE_ENDPOINTS.crmProviderLeads.noResponse(uid);
    } else if (lowerStatus === "reject" || lowerStatus === "rejected") {
      url = BASE_SERVICE_ENDPOINTS.crmProviderLeads.reject(uid);
    } else {
      throw new Error(`Unsupported status value: ${status}`);
    }

    await apiClient.put(
      buildBaseServiceUrl(url),
      undefined,
      withoutLocationParam()
    );
    leadDetailCache.delete(uid);
  },

  async assign(uid: string, assignee: { userId: string; userName: string }) {
    const response = await apiClient.put(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.assign(uid)),
      assignee,
      withoutLocationParam()
    );
    return unwrap(response);
  },

  async unassign(uid: string) {
    const response = await apiClient.put(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.unassign(uid)),
      undefined,
      withoutLocationParam()
    );
    return unwrap(response);
  },
  async getLogs(filter: Record<string, any> = {}) {
    const { from, count, ...rest } = filter;
    const response = await apiClient.get(
      buildBaseServiceUrl("/base-service/v1/api/tenant/audit-logs"),
      withoutLocationParam({
        ...rest, 
        ...(from !== undefined && count !== undefined ? { page: Math.floor(from / count) } : from !== undefined ? { page: from } : {}),
        ...(count !== undefined && { size: count }),
        auditlogContext: "CRM_LEAD" 
      })
    );
    return unwrap(response);
  },
};
