export type TaskScope = "all" | "my" | "automation";
export type TasksViewKey = "list" | "calendar" | "templates" | "settings" | "crm-stage" | "detail";
export type TaskDashboardView = "status" | "category";
export type TaskCalendarDateField = "dueDate" | "createdDate";

export type TaskStatusVariant = "success" | "warning" | "danger" | "info" | "neutral";

export interface TaskLookup {
  id: string | number;
  uid?: string;
  name: string;
  tenantUid?: string;
  aliasName?: string;
  conversionValue?: number;
  crmTableType?: "NONE" | string;
  priorityLevel?: number;
  colour?: string;
  status?: string;
  isDefault?: boolean;
  description?: string;
  sortOrder?: number;
}

export interface TaskUser {
  id: string | number;
  uid?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  status?: string;
}

export interface TaskLocation {
  id: string | number;
  uid?: string;
  name?: string;
  place?: string;
}

export interface TaskOriginData {
  customerName?: string;
  customerPhone?: string;
  internalJaldeeId?: string;
  referenceNumber?: string | number;
  source?: string;
  sourceType?: string;
  automationRuleName?: string;
}

export interface TaskAttachment {
  fileName?: string;
  fileType?: string;
  caption?: string;
  driveId?: string;
  s3path?: string;
  url?: string;
  action?: "add" | "remove";
  order?: number;
  [key: string]: unknown;
}

export interface TaskRow {
  taskUid: string;
  id?: string | number;
  title: string;
  description?: string;
  dueDate?: string;
  createdDate?: string;
  priority?: TaskLookup;
  category?: TaskLookup;
  status?: TaskLookup;
  type?: TaskLookup;
  assignee?: TaskUser;
  manager?: TaskUser;
  location?: TaskLocation;
  progress?: string | number;
  originData?: TaskOriginData;
  taskAttachments?: TaskAttachment[];
  required?: boolean;
}

export interface TaskTemplateRow {
  id: string | number;
  account?: string | number;
  uid?: string;
  tenantUid?: string;
  name: string;
  templateName?: string;
  description?: string;
  title?: string;
  taskName?: string;
  status?: string;
  priority?: TaskLookup;
  category?: TaskLookup;
  type?: TaskLookup;
  status?: TaskLookup;
  location?: TaskLocation;
  assignee?: TaskUser;
  manager?: TaskUser;
  categoryId?: string | number;
  typeId?: string | number;
  priorityId?: string | number;
  statusId?: string | number;
  locationId?: string | number;
  assigneeId?: string | number;
  managerId?: string | number;
  dueInDays?: number;
  sourceService?: string;
  feature?: string;
  subFeature?: string;
  featureModule?: string;
  originFrom?: string;
  originId?: number;
  isSubTask?: boolean;
  imageUrl?: string;
  estimatedDuration?: string;
  estDuration?: { days?: number; hours?: number; minutes?: number };
  locationArea?: string;
  targetResult?: string;
  targetPotential?: number;
  dueDate?: string;
  actualDuration?: { days?: number; hours?: number; minutes?: number };
  actualResult?: string;
  actualPotential?: number;
  notes?: string[];
  attachments?: string[];
  subtaskCount?: number;
  isSequential?: boolean;
  sequenceOrder?: number;
  isAvailable?: boolean;
}

export interface TaskFilters {
  page: number;
  pageSize: number;
  scope: TaskScope;
  searchText?: string;
  statusId?: string;
  priorityId?: string;
  assigneeId?: string;
  fromDueDate?: string;
  toDueDate?: string;
  fromCreatedDate?: string;
  toCreatedDate?: string;
  categoryId?: string;
  originReferenceNo?: string;
  originCustomerName?: string;
}

export interface TaskFormValues {
  title: string;
  description: string;
  dueDate: string;
  priorityId: string;
  categoryId: string;
  typeId: string;
  statusId: string;
  assigneeId: string;
  locationId: string;
}

export interface TaskLookupFormValues {
  name: string;
  description: string;
  sortOrder: string;
  status: string;
  aliasName: string;
  conversionValue: string;
  crmTableType: string;
  priorityLevel: string;
  colour: string;
  isDefault: boolean;
}

export interface TaskTemplateFormValues extends TaskFormValues {
  name: string;
  originFrom: string;
  isSubTask: boolean;
  isSequential: boolean;
  isAvailable: boolean;
  fieldFlags: Record<string, TaskTemplateFieldFlags>;
  fieldValues: Record<string, string>;
}

export interface TaskTemplateFieldFlags {
  iseditable: boolean;
  isvisible: boolean;
  ismandatory: boolean;
}
