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

interface ScopedApi {
  get: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
  post: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  put: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  delete: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
}

function buildCustomerQuery(filters: CustomerFilters) {
  const query: Record<string, string | number> = {};

  if (filters.search?.trim()) {
    query.or = [
      `jaldeeId-eq=${filters.search.trim()}`,
      `firstName-eq=${filters.search.trim()}`,
      `phoneNo-eq=${filters.search.trim()}`,
    ].join(",");
  }

  if (filters.status) {
    query["status-eq"] = filters.status;
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

    query[key] = value as string | number;
  });

  if (filters.page && filters.pageSize) {
    query.from = (filters.page - 1) * filters.pageSize;
    query.count = filters.pageSize;
  }

  return query;
}

function toCustomer(raw: Record<string, unknown>): Customer {
  return {
    id: String(raw.id ?? raw.uid ?? raw.consumerId ?? ""),
    jaldeeId: typeof raw.jaldeeId === "string" ? raw.jaldeeId : undefined,
    firstName: String(raw.firstName ?? ""),
    lastName: typeof raw.lastName === "string" ? raw.lastName : undefined,
    phoneNo: typeof raw.phoneNo === "string" ? raw.phoneNo : undefined,
    countryCode: typeof raw.countryCode === "string" ? raw.countryCode : undefined,
    email: typeof raw.email === "string" ? raw.email : undefined,
    gender: typeof raw.gender === "string" ? raw.gender : undefined,
    dob: typeof raw.dob === "string" ? raw.dob : undefined,
    address: typeof raw.address === "string" ? raw.address : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
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
    labels: raw.label && typeof raw.label === "object" ? (raw.label as Record<string, boolean | string>) : undefined,
    questionnaires: Array.isArray(raw.questionnaires)
      ? raw.questionnaires
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
          .map(toQuestionnaireSummary)
      : undefined,
    consumerPhoto: Array.isArray(raw.consumerPhoto)
      ? raw.consumerPhoto
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
  return {
    id: String(raw.id ?? raw.uid ?? raw.label ?? ""),
    label: typeof raw.label === "string" ? raw.label : "",
    displayName:
      typeof raw.displayName === "string"
        ? raw.displayName
        : typeof raw.label === "string"
          ? raw.label.replace(/_/g, " ")
          : "",
    status: typeof raw.status === "string" ? raw.status : undefined,
  };
}

function toGroup(raw: Record<string, unknown>): CustomerGroup {
  return {
    id: String(raw.id ?? raw.uid ?? raw.groupName ?? ""),
    groupName: typeof raw.groupName === "string" ? raw.groupName : "",
    description: typeof raw.description === "string" ? raw.description : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
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
  const response = await api.get<Record<string, unknown>[]>("provider/customers", {
    params: buildCustomerQuery(filters),
  });

  return response.data.map(toCustomer);
}

export async function getCustomerCount(api: ScopedApi, filters: CustomerFilters): Promise<number> {
  const countFilters = { ...filters };
  delete countFilters.page;
  delete countFilters.pageSize;

  const response = await api.get<number>("provider/customers/count", {
    params: buildCustomerQuery(countFilters),
  });

  return response.data;
}

export async function getCustomerById(api: ScopedApi, customerId: string): Promise<Customer | null> {
  const response = await api.get<Record<string, unknown>[]>("provider/customers", {
    params: { "id-eq": customerId },
  });

  return response.data[0] ? toCustomer(response.data[0]) : null;
}

export async function createCustomer(api: ScopedApi, values: CustomerFormValues): Promise<unknown> {
  return api.post("provider/customers", {
    firstName: values.firstName,
    lastName: values.lastName || undefined,
    phoneNo: values.phoneNo || undefined,
    countryCode: values.phoneNo ? values.countryCode || "+91" : undefined,
    email: values.email || undefined,
    gender: values.gender || undefined,
    dob: values.dob || undefined,
    address: values.address || undefined,
    jaldeeId: values.jaldeeId || undefined,
  });
}

export async function updateCustomer(api: ScopedApi, values: CustomerFormValues): Promise<unknown> {
  return api.put("provider/customers", {
    id: values.id,
    firstName: values.firstName,
    lastName: values.lastName || undefined,
    phoneNo: values.phoneNo || undefined,
    countryCode: values.phoneNo ? values.countryCode || "+91" : undefined,
    email: values.email || undefined,
    gender: values.gender || undefined,
    dob: values.dob || undefined,
    address: values.address || undefined,
    jaldeeId: values.jaldeeId || undefined,
  });
}

export async function changeCustomerStatus(api: ScopedApi, customerId: string, status: "ACTIVE" | "INACTIVE"): Promise<unknown> {
  return api.put(`provider/customers/${customerId}/changeStatus/${status}`);
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
  const response = await api.get<Record<string, unknown>[]>("provider/waitlist/label");
  return response.data.map(toLabel);
}

export async function addLabelsToCustomer(api: ScopedApi, customerId: string, labels: string[]): Promise<unknown> {
  const labelMap = labels.reduce<Record<string, true>>((acc, key) => {
    acc[key] = true;
    return acc;
  }, {});

  return api.post("provider/customers/label", {
    labels: labelMap,
    proConIds: [customerId],
  });
}

export async function removeLabelsFromCustomer(api: ScopedApi, customerId: string, labels: string[]): Promise<unknown> {
  return api.delete("provider/customers/masslabel", {
    data: {
      labelNames: labels,
      proConIds: [customerId],
    },
  });
}

export async function getCustomerGroups(api: ScopedApi): Promise<CustomerGroup[]> {
  const response = await api.get<Record<string, unknown>[]>("provider/customers/group");
  return response.data.map(toGroup);
}

export async function createCustomerGroup(api: ScopedApi, values: CustomerGroupValues): Promise<unknown> {
  return api.post("provider/customers/group", values);
}

export async function updateCustomerGroup(api: ScopedApi, values: CustomerGroupValues): Promise<unknown> {
  return api.put("provider/customers/group", values);
}

export async function changeCustomerGroupStatus(api: ScopedApi, groupId: string, status: "ENABLE" | "DISABLE"): Promise<unknown> {
  return api.put(`provider/customers/group/${groupId}/${status}`);
}

export async function getCustomerGroupMembers(api: ScopedApi, groupId: string): Promise<Customer[]> {
  const response = await api.get<Record<string, unknown>[]>("provider/customers", {
    params: { "groups-eq": groupId },
  });

  return response.data.map(toCustomer);
}

export async function addCustomerToGroup(api: ScopedApi, groupName: string, customerId: string): Promise<unknown> {
  return api.post("provider/customers/group/addGroup", {
    groupName,
    providerConsumerIds: [customerId],
  });
}

export async function removeCustomerFromGroup(api: ScopedApi, groupName: string, customerId: string): Promise<unknown> {
  return api.delete(`provider/customers/group/${groupName}`, {
    data: [customerId],
  });
}

export async function getCustomerGroupMemberId(api: ScopedApi, groupName: string, customerId: string): Promise<string | null> {
  try {
    const response = await api.get<string>(`provider/customers/groupMemId/${groupName}/${customerId}`);
    return typeof response.data === "string" ? response.data : null;
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
  return api.post(`provider/customers/groupMemId/${groupName}/${customerId}/${memberId}`);
}

export async function updateCustomerGroupMemberId(
  api: ScopedApi,
  groupName: string,
  customerId: string,
  memberId: string
): Promise<unknown> {
  return api.put(`provider/customers/groupMemId/${groupName}/${customerId}/${memberId}`);
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
  return api.post("provider/customers/exportdata", { email });
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
