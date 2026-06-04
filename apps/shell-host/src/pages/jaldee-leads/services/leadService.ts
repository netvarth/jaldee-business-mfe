import { apiClient } from "@jaldee/api-client";
import {
  BASE_SERVICE_ENDPOINTS,
  buildBaseServiceUrl,
} from "@jaldee/shared-modules";
import type { CrmLeadDto, ChannelType, Priority, InternalStatus } from "../types";

type LeadSearchParams = {
  page?: number;
  size?: number;
  sort?: string;
};

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

export const leadService = {
  async search(filters: Record<string, unknown> = {}, params: LeadSearchParams = { page: 0, size: 100 }) {
    const response = await apiClient.post(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.search),
      { ...filters, status: "ACTIVE", page: params.page, size: params.size },
      withoutLocationParam()
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
    const response = await apiClient.get(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.detail(uid))
    );
    return toLead(unwrap(response));
  },

  async update(uid: string, lead: Partial<CrmLeadDto>) {
    const response = await apiClient.put(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmProviderLeads.update(uid)),
      toLeadPayload(lead),
      withoutLocationParam()
    );
    return toLead(unwrap(response));
  },

  async completeStage(uid: string) {
    const response = await apiClient.patch(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadStageProgress.completeStage(uid)),
      undefined,
      withoutLocationParam()
    );
    const unwrapped = unwrap(response);
    return unwrapped && typeof unwrapped === "object" ? toLead(unwrapped) : undefined;
  },

  async previousStage(uid: string, payload: Record<string, unknown> = {}) {
    const response = await apiClient.patch(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadStageProgress.previousStage(uid)),
      payload,
      withoutLocationParam()
    );
    const unwrapped = unwrap(response);
    return unwrapped && typeof unwrapped === "object" ? toLead(unwrapped) : undefined;
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
