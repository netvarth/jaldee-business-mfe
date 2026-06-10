import type {
  Customer,
  CustomerFilters,
  CustomerFamilyMember,
  CustomerFamilyMemberValues,
  CustomerFormValues,
  CustomerGroup,
  CustomerGroupValues,
  CustomerLabel,
  CustomerMedicalHistory,
  CustomerAttachment,
  CustomerQuestionnaireSummary,
  CustomerMedicalHistoryValues,
  CustomerNote,
  CustomerNoteValues,
  CustomerVisit,
} from "../types";
import { BASE_SERVICE_ENDPOINTS, buildBaseServiceUrl } from "../../serviceUrls";

interface ScopedApi {
  get: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
  post: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  put: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  delete: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
}

interface ConsumerSearchResponse {
  content?: Record<string, unknown>[];
  data?: Record<string, unknown>[] | { content?: Record<string, unknown>[]; totalElements?: number };
  records?: Record<string, unknown>[];
  items?: Record<string, unknown>[];
  totalElements?: number;
  total?: number;
  count?: number;
}

function buildConsumerSearchParams(filters: CustomerFilters) {
  const params: Record<string, number> = {};

  if (filters.page && filters.pageSize) {
    params.page = filters.page - 1;
    params.size = filters.pageSize;
  }

  return params;
}

function buildConsumerSearchBody(filters: CustomerFilters) {
  const body: Record<string, unknown> = {};
  const search = filters.search?.trim();

  if (search) {
    body.displayName = search;
  }

  if (filters.status) {
    body.statusEnum = toConsumerStatus(filters.status);
  }

  Object.entries(filters).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      key === "search" ||
      key === "status" ||
      key === "page" ||
      key === "pageSize"
    ) {
      return;
    }

    body[key] = value;
  });

  return body;
}

function toConsumerStatus(status: string) {
  if (status === "ACTIVE") return "Enabled";
  if (status === "INACTIVE") return "Disabled";
  return status;
}

function fromConsumerStatus(status: unknown) {
  const value = typeof status === "string" ? status : "";
  if (/disabled|inactive/i.test(value)) return "INACTIVE";
  if (/enabled|active/i.test(value)) return "ACTIVE";
  return value || undefined;
}

function fromConsumerLabelStatus(status: unknown) {
  const value = typeof status === "string" ? status : "";
  if (/disabled|inactive/i.test(value)) return "DISABLED";
  if (/enabled|active/i.test(value)) return "ENABLED";
  return value || undefined;
}

function fromConsumerGroupStatus(status: unknown) {
  const value = typeof status === "string" ? status : "";
  if (/disabled|inactive|disable/i.test(value)) return "DISABLE";
  if (/enabled|active|enable/i.test(value)) return "ENABLE";
  return value || undefined;
}

function normalizeConsumerList(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const raw = data as ConsumerSearchResponse;
  const nestedData = raw.data;
  const candidates = [
    raw.content,
    Array.isArray(nestedData) ? nestedData : undefined,
    nestedData && !Array.isArray(nestedData) ? nestedData.content : undefined,
    raw.records,
    raw.items,
  ];

  return (candidates.find(Array.isArray) ?? []).filter((item): item is Record<string, unknown> =>
    Boolean(item && typeof item === "object")
  );
}

function normalizeConsumerTotal(data: unknown, fallback: number) {
  if (!data || typeof data !== "object") {
    return typeof data === "number" ? data : fallback;
  }

  const raw = data as ConsumerSearchResponse;
  const nestedData = raw.data;
  const nestedTotal = nestedData && !Array.isArray(nestedData) ? nestedData.totalElements : undefined;
  const value = raw.totalElements ?? raw.total ?? raw.count ?? nestedTotal;
  return typeof value === "number" ? value : fallback;
}

function buildConsumerPayload(values: CustomerFormValues) {
  const displayName = [values.firstName, values.lastName].filter(Boolean).join(" ").trim();
  const phone = values.phoneNo ? `${values.countryCode || "+91"}${values.phoneNo}`.replace(/\s+/g, "") : undefined;

  return {
    uid: values.id || undefined,
    consumerNo: values.jaldeeId || undefined,
    firstName: values.firstName,
    lastName: values.lastName || undefined,
    displayName: displayName || values.firstName,
    phoneE164: phone,
    email: values.email || undefined,
    gender: values.gender ? values.gender.toUpperCase() : undefined,
    dob: values.dob || undefined,
    address: values.address || undefined,
  };
}

function buildMassConsumerPayload(customerIds: string[], values: Record<string, unknown>) {
  return {
    consumerUids: customerIds,
    consumers: customerIds,
    consumerIds: customerIds,
    ...values,
  };
}

async function resolveGroupUid(api: ScopedApi, groupNameOrUid: string) {
  const groups = await getCustomerGroups(api);
  return groups.find((group) => group.id === groupNameOrUid || group.groupName === groupNameOrUid)?.id ?? groupNameOrUid;
}

function toCustomer(raw: Record<string, unknown>): Customer {
  const phoneE164 = typeof raw.phoneE164 === "string" ? raw.phoneE164 : undefined;
  const labels = Array.isArray(raw.labels)
    ? raw.labels.reduce<Record<string, true>>((acc, item) => {
        if (typeof item === "string") {
          acc[item] = true;
        } else if (item && typeof item === "object") {
          const label = item as Record<string, unknown>;
          const key = String(label.label ?? label.displayName ?? label.uid ?? label.id ?? "");
          if (key) acc[key] = true;
        }
        return acc;
      }, {})
    : raw.label && typeof raw.label === "object"
      ? (raw.label as Record<string, boolean | string>)
      : undefined;

  return {
    id: String(raw.id ?? raw.uid ?? raw.consumerId ?? ""),
    jaldeeId:
      typeof raw.jaldeeId === "string"
        ? raw.jaldeeId
        : typeof raw.consumerNo === "string"
          ? raw.consumerNo
          : typeof raw.internalConsumerNo === "string"
            ? raw.internalConsumerNo
            : undefined,
    firstName: String(raw.firstName ?? ""),
    lastName: typeof raw.lastName === "string" ? raw.lastName : undefined,
    phoneNo: typeof raw.phoneNo === "string" ? raw.phoneNo : phoneE164,
    countryCode: typeof raw.countryCode === "string" ? raw.countryCode : undefined,
    email: typeof raw.email === "string" ? raw.email : undefined,
    gender: typeof raw.gender === "string" ? raw.gender : undefined,
    dob: typeof raw.dob === "string" ? raw.dob : undefined,
    address: typeof raw.address === "string" ? raw.address : undefined,
    status: fromConsumerLabelStatus(raw.statusEnum ?? raw.status),
    parent: typeof raw.parent === "boolean" ? raw.parent : undefined,
    whatsappNumber:
      typeof raw.whatsappNumber === "string"
        ? raw.whatsappNumber
        : raw.whatsAppNum && typeof raw.whatsAppNum === "object" && typeof (raw.whatsAppNum as Record<string, unknown>).number === "string"
          ? String((raw.whatsAppNum as Record<string, unknown>).number)
          : undefined,
    telegramNumber:
      typeof raw.telegramNumber === "string"
        ? raw.telegramNumber
        : raw.telegramNum && typeof raw.telegramNum === "object" && typeof (raw.telegramNum as Record<string, unknown>).number === "string"
          ? String((raw.telegramNum as Record<string, unknown>).number)
          : undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    lastVisit: typeof raw.lastVisit === "string" ? raw.lastVisit : undefined,
    visitCount: typeof raw.visitCount === "number" ? raw.visitCount : undefined,
    labels,
    questionnaires: Array.isArray(raw.questionnaires)
      ? raw.questionnaires
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
          .map(toQuestionnaireSummary)
      : undefined,
    consumerPhoto: Array.isArray(raw.consumerPhoto) || Array.isArray(raw.photos)
      ? (Array.isArray(raw.consumerPhoto) ? raw.consumerPhoto : raw.photos)
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
          .map((item, index) => toAttachment(item, index))
      : undefined,
  };
}

function toQuestionnaireSummary(raw: Record<string, unknown>): CustomerQuestionnaireSummary {
  return {
    id: String(raw.id ?? raw.uuid ?? raw.questionnaireId ?? ""),
    label:
      typeof raw.labelName === "string"
        ? raw.labelName
        : typeof raw.label === "string"
          ? raw.label
          : typeof raw.questionnaireName === "string"
            ? raw.questionnaireName
            : "Questionnaire",
    status: typeof raw.status === "string" ? raw.status : undefined,
    submittedAt:
      typeof raw.submittedAt === "string"
        ? raw.submittedAt
        : typeof raw.createdDate === "string"
          ? raw.createdDate
          : undefined,
  };
}

export interface QuestionnaireDefinition {
  id: string;
  labels?: Array<{ id?: string; labelName?: string; label?: string }>;
}

function toVisit(raw: Record<string, unknown>, type: CustomerVisit["type"]): CustomerVisit {
  const title =
    typeof raw.service === "string"
      ? raw.service
      : typeof raw.name === "string"
        ? raw.name
        : typeof raw.label === "string"
          ? raw.label
          : "Visit";

  return {
    id: String(raw.id ?? raw.uid ?? raw.ynwUuid ?? raw.orderId ?? ""),
    type,
    title,
    service: typeof raw.service === "string" ? raw.service : undefined,
    date: typeof raw.date === "string" ? raw.date : typeof raw.appmtDate === "string" ? raw.appmtDate : undefined,
    time: typeof raw.time === "string" ? raw.time : typeof raw.apptTime === "string" ? raw.apptTime : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
  };
}

function toNote(raw: Record<string, unknown>): CustomerNote {
  return {
    id: String(raw.id ?? raw.uid ?? raw.noteId ?? ""),
    note:
      typeof raw.note === "string"
        ? raw.note
        : typeof raw.value === "string"
          ? raw.value
          : typeof raw.message === "string"
            ? raw.message
            : "",
    createdAt: typeof raw.createdDate === "string" ? raw.createdDate : typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedDate === "string" ? raw.updatedDate : typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
  };
}

function toLabel(raw: Record<string, unknown>): CustomerLabel {
  const label = String(raw.label ?? raw.labelName ?? raw.name ?? "");
  return {
    id: String(raw.id ?? raw.uid ?? raw.labelUid ?? raw.label ?? raw.labelName ?? ""),
    label,
    displayName:
      typeof raw.displayName === "string"
        ? raw.displayName
        : label
          ? label.replace(/_/g, " ")
          : "",
    status: fromConsumerGroupStatus(raw.statusEnum ?? raw.status),
  };
}

function toGroup(raw: Record<string, unknown>): CustomerGroup {
  const groupName = String(raw.groupName ?? raw.name ?? raw.displayName ?? "");
  return {
    id: String(raw.id ?? raw.uid ?? raw.groupUid ?? raw.groupName ?? ""),
    groupName,
    description: typeof raw.description === "string" ? raw.description : undefined,
    status: fromConsumerStatus(raw.statusEnum ?? raw.status),
    consumerCount: typeof raw.consumerCount === "number" ? raw.consumerCount : undefined,
    generateGrpMemId: typeof raw.generateGrpMemId === "boolean" ? raw.generateGrpMemId : undefined,
  };
}

function toFamilyMember(raw: Record<string, unknown>): CustomerFamilyMember {
  return {
    id: String(raw.id ?? raw.uid ?? raw.consumerId ?? ""),
    firstName: String(raw.firstName ?? ""),
    lastName: typeof raw.lastName === "string" ? raw.lastName : undefined,
    jaldeeId: typeof raw.jaldeeId === "string" ? raw.jaldeeId : undefined,
    parent: typeof raw.parent === "string" ? raw.parent : undefined,
  };
}

function toMedicalHistory(raw: Record<string, unknown>): CustomerMedicalHistory {
  const attachmentSource = Array.isArray(raw.medicalHistoryAttachments)
    ? raw.medicalHistoryAttachments
    : Array.isArray(raw.attachments)
      ? raw.attachments
      : [];

  return {
    id: String(raw.id ?? raw.uid ?? raw.title ?? ""),
    title: typeof raw.title === "string" ? raw.title : "",
    providerConsumerId:
      typeof raw.providerConsumerId === "string"
        ? raw.providerConsumerId
        : typeof raw.provideConsumerId === "string"
          ? raw.provideConsumerId
          : undefined,
    medicalHistoryAttachments: attachmentSource
      .filter((attachment): attachment is Record<string, unknown> => Boolean(attachment && typeof attachment === "object"))
      .map((attachment, index) => toAttachment(attachment, index)),
  };
}

function toAttachment(raw: Record<string, unknown>, index: number): CustomerAttachment {
  return {
    fileName:
      typeof raw.fileName === "string"
        ? raw.fileName
        : typeof raw.name === "string"
          ? raw.name
          : `Attachment ${index + 1}`,
    fileType:
      typeof raw.fileType === "string"
        ? raw.fileType
        : typeof raw.type === "string"
          ? raw.type
          : undefined,
    caption: typeof raw.caption === "string" ? raw.caption : undefined,
    driveId: typeof raw.driveId === "string" ? raw.driveId : undefined,
    s3path:
      typeof raw.s3path === "string"
        ? raw.s3path
        : typeof raw.fileUrl === "string"
          ? raw.fileUrl
          : undefined,
    url: typeof raw.url === "string" ? raw.url : undefined,
    action: raw.action === "remove" ? "remove" : raw.action === "add" ? "add" : undefined,
    order: typeof raw.order === "number" ? raw.order : index,
  };
}

export async function listCustomers(api: ScopedApi, filters: CustomerFilters): Promise<Customer[]> {
  const response = await api.post<ConsumerSearchResponse | Record<string, unknown>[]>(
    buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.search),
    buildConsumerSearchBody(filters),
    { params: buildConsumerSearchParams(filters) }
  );

  return normalizeConsumerList(response.data).map(toCustomer);
}

export async function getCustomerCount(api: ScopedApi, filters: CustomerFilters): Promise<number> {
  const countFilters = { ...filters };
  delete countFilters.page;
  delete countFilters.pageSize;

  const response = await api.post<ConsumerSearchResponse | Record<string, unknown>[]>(
    buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.search),
    buildConsumerSearchBody(countFilters),
    { params: { page: 0, size: 1 } }
  );

  return normalizeConsumerTotal(response.data, normalizeConsumerList(response.data).length);
}

export async function getCustomerById(api: ScopedApi, customerId: string): Promise<Customer | null> {
  const response = await api.get<Record<string, unknown>>(
    buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.detail(customerId))
  );

  return response.data ? toCustomer(response.data) : null;
}

export async function createCustomer(api: ScopedApi, values: CustomerFormValues): Promise<unknown> {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.create), buildConsumerPayload(values));
}

export async function updateCustomer(api: ScopedApi, values: CustomerFormValues): Promise<unknown> {
  if (!values.id) {
    throw new Error("Customer UID is required to update consumer.");
  }

  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.update(values.id)), buildConsumerPayload(values));
}

export async function changeCustomerStatus(api: ScopedApi, customerId: string, status: "ACTIVE" | "INACTIVE"): Promise<unknown> {
  return api.put(
    buildBaseServiceUrl(
      status === "ACTIVE"
        ? BASE_SERVICE_ENDPOINTS.consumers.activate(customerId)
        : BASE_SERVICE_ENDPOINTS.consumers.deactivate(customerId)
    )
  );
}

export async function getCustomerNotes(api: ScopedApi, customerId: string): Promise<CustomerNote[]> {
  const response = await api.get<Record<string, unknown>[]>(`provider/customers/notes/${customerId}`);
  return response.data.map(toNote);
}

export async function createCustomerNote(api: ScopedApi, values: CustomerNoteValues): Promise<unknown> {
  return api.post("provider/customers/notes", {
    consumer: { id: values.customerId },
    note: values.note,
  });
}

export async function updateCustomerNote(api: ScopedApi, values: CustomerNoteValues): Promise<unknown> {
  return api.put("provider/customers/notes", {
    id: values.id,
    consumer: { id: values.customerId },
    note: values.note,
  });
}

export async function deleteCustomerNote(api: ScopedApi, noteId: string): Promise<unknown> {
  return api.delete(`provider/customers/notes/${noteId}`);
}

export async function getCustomerLabels(api: ScopedApi): Promise<CustomerLabel[]> {
  const response = await api.post<ConsumerSearchResponse | Record<string, unknown>[]>(
    buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerLabels.search),
    {}
  );
  return normalizeConsumerList(response.data).map(toLabel);
}

export async function addLabelsToCustomer(api: ScopedApi, customerId: string, labels: string[]): Promise<unknown> {
  return api.put(
    buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.applyLabel),
    buildMassConsumerPayload([customerId], { labels, labelUids: labels })
  );
}

export async function removeLabelsFromCustomer(api: ScopedApi, customerId: string, labels: string[]): Promise<unknown> {
  return api.put(
    buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.removeLabel),
    buildMassConsumerPayload([customerId], { labels, labelUids: labels, labelNames: labels })
  );
}

export async function getCustomerGroups(api: ScopedApi): Promise<CustomerGroup[]> {
  const response = await api.get<ConsumerSearchResponse | Record<string, unknown>[]>(
    buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerGroups.list)
  );
  return normalizeConsumerList(response.data).map(toGroup);
}

export async function createCustomerGroup(api: ScopedApi, values: CustomerGroupValues): Promise<unknown> {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerGroups.create), values);
}

export async function updateCustomerGroup(api: ScopedApi, values: CustomerGroupValues): Promise<unknown> {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerGroups.update), values);
}

export async function changeCustomerGroupStatus(api: ScopedApi, groupId: string, status: "ENABLE" | "DISABLE"): Promise<unknown> {
  return api.put(
    buildBaseServiceUrl(
      status === "ENABLE"
        ? BASE_SERVICE_ENDPOINTS.consumerGroups.enable(groupId)
        : BASE_SERVICE_ENDPOINTS.consumerGroups.disable(groupId)
    )
  );
}

export async function getCustomerGroupMembers(api: ScopedApi, groupId: string): Promise<Customer[]> {
  const response = await api.post<ConsumerSearchResponse | Record<string, unknown>[]>(
    buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.search),
    { groups: [groupId] }
  );

  return normalizeConsumerList(response.data).map(toCustomer);
}

export async function addCustomerToGroup(api: ScopedApi, groupName: string, customerId: string): Promise<unknown> {
  const groupUid = await resolveGroupUid(api, groupName);
  return api.post(
    buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.addGroupMembersByUid(groupUid)),
    buildMassConsumerPayload([customerId], {})
  );
}

export async function removeCustomerFromGroup(api: ScopedApi, groupName: string, customerId: string): Promise<unknown> {
  const groupUid = await resolveGroupUid(api, groupName);
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.removeGroupMembersByUid(groupUid)), {
    data: buildMassConsumerPayload([customerId], {}),
  });
}

export async function getCustomerGroupMemberId(api: ScopedApi, groupName: string, customerId: string): Promise<string | null> {
  try {
    const response = await api.get<unknown>(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.groupMemberId(customerId))
    );
    if (typeof response.data === "string") return response.data;

    const groupUid = await resolveGroupUid(api, groupName);
    const items = Array.isArray(response.data)
      ? response.data
      : response.data && typeof response.data === "object"
        ? [response.data]
        : [];
    const match = items
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
      .find((item) => item.groupUid === groupUid || item.groupName === groupName || item.group === groupUid);
    const item = match ?? items.find((value): value is Record<string, unknown> => Boolean(value && typeof value === "object"));
    const memberId = item?.memberId ?? item?.groupMemberId ?? item?.memberNo;
    return typeof memberId === "string" ? memberId : null;
  } catch {
    return null;
  }
}

export async function createCustomerGroupMemberId(
  api: ScopedApi,
  groupName: string,
  customerId: string,
  memberId: string
): Promise<unknown> {
  const groupUid = await resolveGroupUid(api, groupName);
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.addGroupMemberId), {
    groupUid,
    consumerUid: customerId,
    memberId,
    groupMemberId: memberId,
  });
}

export async function updateCustomerGroupMemberId(
  api: ScopedApi,
  groupName: string,
  customerId: string,
  memberId: string
): Promise<unknown> {
  const groupUid = await resolveGroupUid(api, groupName);
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.updateGroupMemberId), {
    groupUid,
    consumerUid: customerId,
    memberId,
    groupMemberId: memberId,
  });
}

export async function getCustomerFamilyMembers(api: ScopedApi, customerId: string): Promise<CustomerFamilyMember[]> {
  const response = await api.get<Record<string, unknown>[]>(`provider/customers/familyMember/${customerId}`);
  return response.data.map(toFamilyMember);
}

export async function createCustomerFamilyMember(
  api: ScopedApi,
  customerId: string,
  values: CustomerFamilyMemberValues
): Promise<unknown> {
  return api.post("provider/customers/familyMember", {
    firstName: values.firstName,
    lastName: values.lastName || "",
    title: "",
    dob: "",
    gender: "",
    phoneNo: "",
    address: "",
    parent: customerId,
    ...(values.jaldeeId ? { jaldeeId: values.jaldeeId } : {}),
  });
}

export async function deleteCustomerFamilyMember(api: ScopedApi, customerId: string, parentId: string): Promise<unknown> {
  return api.delete(`provider/customers/familyMember/${customerId}/${parentId}`);
}

export async function getCustomerMedicalHistory(api: ScopedApi, customerId: string): Promise<CustomerMedicalHistory[]> {
  const response = await api.get<Record<string, unknown>[]>(`provider/medicalrecord/medicalHistory/${customerId}`);
  return response.data.map(toMedicalHistory);
}

export async function createCustomerMedicalHistory(api: ScopedApi, values: CustomerMedicalHistoryValues): Promise<unknown> {
  return api.post("provider/medicalrecord/medicalHistory", values);
}

export async function updateCustomerMedicalHistory(api: ScopedApi, values: CustomerMedicalHistoryValues): Promise<unknown> {
  return api.put(`provider/medicalrecord/medicalHistory/${values.id}`, values);
}

export async function deleteCustomerMedicalHistory(api: ScopedApi, id: string): Promise<unknown> {
  return api.delete(`provider/medicalrecord/medicalHistory/${id}`);
}

interface UploadUrlRequestItem {
  owner: string;
  ownerType: "Provider";
  fileName: string;
  fileSize: number;
  caption: string;
  fileType: string;
  action: "add";
  order: number;
}

interface UploadUrlResponseItem {
  url: string;
  driveId: string;
  orderId: number;
}

export async function requestFileUploadUrls(api: ScopedApi, items: UploadUrlRequestItem[]): Promise<UploadUrlResponseItem[]> {
  const response = await api.post<UploadUrlResponseItem[]>("provider/fileShare/upload", items);
  return response.data;
}

export async function markFileUploadComplete(api: ScopedApi, driveId: string): Promise<unknown> {
  return api.put(`provider/fileShare/upload/COMPLETE/${driveId}`);
}

export async function uploadCustomerPhoto(api: ScopedApi, customerId: string, attachments: CustomerAttachment[]): Promise<unknown> {
  return api.post(`provider/customers/upload/profilePhoto/${customerId}`, attachments);
}

export async function removeCustomerPhoto(api: ScopedApi, customerId: string, attachments: CustomerAttachment[]): Promise<unknown> {
  return api.delete(`provider/customers/remove/profilePhoto/${customerId}`, {
    data: attachments,
  });
}

export async function exportCustomers(api: ScopedApi, email: string): Promise<unknown> {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumers.export), { email });
}

export async function getCustomerQuestionnaire(api: ScopedApi): Promise<QuestionnaireDefinition | null> {
  const response = await api.get<Record<string, unknown> | null>("provider/questionnaire/consumer");
  if (!response.data || typeof response.data !== "object") {
    return null;
  }

  const raw = response.data;
  return {
    id: String(raw.id ?? raw.uuid ?? ""),
    labels: Array.isArray(raw.labels)
      ? raw.labels.filter((item): item is { id?: string; labelName?: string; label?: string } => Boolean(item && typeof item === "object"))
      : undefined,
  };
}

export async function getTodayVisits(api: ScopedApi, customerId: string): Promise<CustomerVisit[]> {
  const response = await api.get<Record<string, unknown>[]>(`provider/customers/bookings/today/${customerId}`);
  return response.data.map((item) => toVisit(item, "today"));
}

export async function getFutureVisits(api: ScopedApi, customerId: string): Promise<CustomerVisit[]> {
  const response = await api.get<Record<string, unknown>[]>(`provider/customers/bookings/future/${customerId}`);
  return response.data.map((item) => toVisit(item, "future"));
}

export async function getHistoryVisits(api: ScopedApi, customerId: string): Promise<CustomerVisit[]> {
  const response = await api.get<Record<string, unknown>[]>(`provider/customers/bookings/history/${customerId}`);
  return response.data.map((item) => toVisit(item, "history"));
}

export async function getOrderVisits(api: ScopedApi, customerId: string): Promise<CustomerVisit[]> {
  const response = await api.get<Record<string, unknown>[]>(`provider/orders/customer/${customerId}`);
  return response.data.map((item) => toVisit(item, "order"));
}
