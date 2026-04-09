export interface Customer {
  id: string;
  jaldeeId?: string;
  firstName: string;
  lastName?: string;
  phoneNo?: string;
  countryCode?: string;
  email?: string;
  gender?: string;
  dob?: string;
  address?: string;
  status?: string;
  parent?: boolean;
  whatsappNumber?: string;
  telegramNumber?: string;
  createdAt?: string;
  lastVisit?: string;
  visitCount?: number;
  labels?: Record<string, boolean | string>;
  questionnaires?: CustomerQuestionnaireSummary[];
  consumerPhoto?: CustomerAttachment[];
}

export interface CustomerQuestionnaireSummary {
  id: string;
  label?: string;
  status?: string;
  submittedAt?: string;
}

export interface CustomerVisit {
  id: string;
  type: "today" | "future" | "history" | "order";
  title: string;
  service?: string;
  date?: string;
  time?: string;
  status?: string;
}

export interface CustomerNote {
  id: string;
  note: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerLabel {
  id: string;
  label: string;
  displayName: string;
  status?: string;
}

export interface CustomerGroup {
  id: string;
  groupName: string;
  description?: string;
  status?: string;
  consumerCount?: number;
  generateGrpMemId?: boolean;
  memberId?: string | null;
}

export interface CustomerFamilyMember {
  id: string;
  firstName: string;
  lastName?: string;
  jaldeeId?: string;
  parent?: string;
}

export interface CustomerMedicalHistory {
  id: string;
  title: string;
  providerConsumerId?: string;
  medicalHistoryAttachments?: CustomerAttachment[];
}

export interface CustomerAttachment {
  fileName: string;
  fileType?: string;
  caption?: string;
  driveId?: string;
  s3path?: string;
  url?: string;
  action?: "add" | "remove";
  order?: number;
}

export interface CustomerFilters extends Record<string, unknown> {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface CustomerFormValues {
  id?: string;
  firstName: string;
  lastName: string;
  phoneNo: string;
  countryCode: string;
  email: string;
  gender: string;
  dob: string;
  address: string;
  jaldeeId: string;
}

export interface CustomerNoteValues {
  id?: string;
  customerId: string;
  note: string;
}

export interface CustomerGroupValues {
  id?: string;
  groupName: string;
  description?: string;
  generateGrpMemId?: boolean;
}

export interface CustomerFamilyMemberValues {
  firstName: string;
  lastName?: string;
  jaldeeId?: string;
}

export interface CustomerMedicalHistoryValues {
  id?: string;
  providerConsumerId: string;
  title: string;
  medicalHistoryAttachments?: CustomerAttachment[];
}
