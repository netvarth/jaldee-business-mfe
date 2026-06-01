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

function toLead(raw: any): CrmLeadDto {
  return {
    uid: String(raw?.uid ?? raw?.uuid ?? ""),
    referenceNo: String(raw?.referenceNo ?? ""),
    leadDate: String(raw?.leadDate ?? raw?.createdAt ?? ""),
    channelUid: String(raw?.channelUid ?? raw?.channel?.uid ?? ""),
    channelName: String(raw?.channelName ?? raw?.channel?.name ?? ""),
    channelType: (raw?.channelType ?? raw?.channel?.type ?? "ONLINE") as ChannelType,
    productUid: String(raw?.productUid ?? raw?.product?.uid ?? ""),
    productName: String(raw?.productName ?? raw?.product?.name ?? ""),
    productEnum: String(raw?.productEnum ?? raw?.product?.productEnum ?? ""),
    pipelineUid: String(raw?.pipelineUid ?? raw?.pipeline?.uid ?? ""),
    pipelineName: String(raw?.pipelineName ?? raw?.pipeline?.name ?? ""),
    currentPipelineStageUid: String(raw?.currentPipelineStageUid ?? raw?.currentStage?.uid ?? ""),
    currentPipelineStageName: String(raw?.currentPipelineStageName ?? raw?.currentStage?.stageName ?? ""),
    consumerFirstName: String(raw?.consumerFirstName ?? ""),
    consumerLastName: String(raw?.consumerLastName ?? ""),
    consumerPhone: String(raw?.consumerPhone ?? ""),
    consumerEmail: raw?.consumerEmail ?? undefined,
    consumerGender: raw?.consumerGender ?? undefined,
    consumerDob: raw?.consumerDob ?? undefined,
    consumerAddress: raw?.consumerAddress ?? undefined,
    consumerCity: raw?.consumerCity ?? undefined,
    consumerState: raw?.consumerState ?? undefined,
    consumerCountry: raw?.consumerCountry ?? undefined,
    consumerPin: raw?.consumerPin ?? undefined,
    company: raw?.company ?? undefined,
    expectedValue: raw?.expectedValue != null ? String(raw.expectedValue) : undefined,
    winProbability: raw?.winProbability != null ? Number(raw.winProbability) : undefined,
    ownerId: String(raw?.ownerId ?? ""),
    ownerName: String(raw?.ownerName ?? ""),
    assignees: Array.isArray(raw?.assignees) ? raw.assignees : [],
    priority: (raw?.priority ?? "NORMAL") as Priority,
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    internalStatus: (raw?.internalStatus ?? "ACTIVE") as InternalStatus,
    isRejected: Boolean(raw?.isRejected ?? raw?.rejected),
    isConverted: Boolean(raw?.isConverted ?? raw?.converted),
    isDuplicate: Boolean(raw?.isDuplicate ?? raw?.duplicate),
    nextFollowupAt: raw?.nextFollowupAt ?? undefined,
    lastActivityAt: String(raw?.lastActivityAt ?? raw?.updatedAt ?? ""),
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
      filters,
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
};
