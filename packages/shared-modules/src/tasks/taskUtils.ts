import type {
  TaskFilters,
  TaskFormValues,
  TaskLocation,
  TaskLookup,
  TaskRow,
  TaskStatusVariant,
  TaskUser,
  TasksViewKey,
} from "./types";

type TaskStatusMutator = {
  mutateAsync: (input: { uid: string; statusId: string | number }) => Promise<unknown>;
};

type TaskProgressMutator = {
  mutateAsync: (input: { uid: string; progress: number }) => Promise<unknown>;
};

export function buildTaskFilters(input: TaskFilters & { userId?: string; locationId?: string | null }) {
  const filters: Record<string, string | number> = {
    from: (input.page - 1) * input.pageSize,
    count: input.pageSize,
  };

  if (input.searchText?.trim()) filters["title-like"] = input.searchText.trim();
  if (input.statusId) filters["status-eq"] = input.statusId;
  if (input.priorityId) filters["priority-eq"] = input.priorityId;
  if (input.categoryId) filters["category-eq"] = input.categoryId;
  if (input.assigneeId) filters["assignee-eq"] = input.assigneeId;
  if (input.scope === "my" && input.userId) filters["assignee-eq"] = input.userId;
  if (input.scope === "automation") filters["origin-eq"] = "AUTOMATION";
  if (input.fromDueDate) filters["dueDate-gte"] = input.fromDueDate;
  if (input.toDueDate) filters["dueDate-lte"] = input.toDueDate;
  if (input.fromCreatedDate) filters["createdDate-gte"] = input.fromCreatedDate;
  if (input.toCreatedDate) filters["createdDate-lte"] = input.toCreatedDate;
  if (input.originReferenceNo?.trim()) filters["originReferenceNo-like"] = input.originReferenceNo.trim();
  if (input.originCustomerName?.trim()) filters["originCustomerName-like"] = input.originCustomerName.trim();

  return filters;
}

export function buildTaskPayload(values: TaskFormValues, fallbackLocationId?: string | number | null) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    dueDate: values.dueDate,
    priorityId: values.priorityId ? Number(values.priorityId) : undefined,
    categoryId: values.categoryId ? Number(values.categoryId) : 1,
    typeId: values.typeId ? Number(values.typeId) : 1,
    statusId: values.statusId ? Number(values.statusId) : undefined,
    assigneeUid: values.assigneeId || undefined,
    locationId: values.locationId ? Number(values.locationId) : fallbackLocationId ? Number(fallbackLocationId) : undefined,
  };
}

export function taskToFormValues(task?: TaskRow, defaultLocationId = ""): TaskFormValues {
  return {
    title: task?.title || "",
    description: task?.description || "",
    dueDate: toDateInputValue(task?.dueDate),
    priorityId: task?.priority?.id ? String(task.priority.id) : "",
    categoryId: task?.category?.id ? String(task.category.id) : "",
    typeId: task?.type?.id ? String(task.type.id) : "",
    statusId: task?.status?.id ? String(task.status.id) : "",
    assigneeId: task?.assignee?.id ? String(task.assignee.id) : "",
    locationId: task?.location?.id ? String(task.location.id) : defaultLocationId,
  };
}

export function normalizeView(value?: string | null): TasksViewKey {
  if (value === "crm-stage") return "crm-stage";
  if (value === "list") return "overview";      // legacy /list → overview
  if (value === "calendar") return "overview";  // legacy /calendar → overview
  if (value === "overview" || value === "templates" || value === "settings" || value === "detail") return value;
  return "overview";
}


export function normalizeTenantTask(raw: unknown): TaskRow {
  const task = raw as any;
  if (!task) return {} as TaskRow;

  const priorityId = task.priorityId ?? task.priority?.id;
  const priorityName = task.priorityName ?? task.priority?.name;

  const categoryId = task.categoryId ?? task.category?.id;
  const categoryName = task.categoryName ?? task.category?.name;

  const statusId = task.statusId ?? task.status?.id;
  const statusName = task.statusName ?? task.status?.name;

  const typeId = task.typeId ?? task.type?.id;
  const typeName = task.typeName ?? task.type?.name;

  const locationId = task.locationId ?? task.location?.id;
  const locationName = task.locationName ?? task.location?.name ?? task.location?.place;

  const assigneeId = task.assigneeUid ?? task.assigneeId ?? task.assignee?.id;
  const assigneeName = task.assigneeName ?? task.assignee?.name;

  return {
    taskUid: task.taskUid ?? task.uid ?? String(task.id),
    id: task.id ?? task.uid ?? task.taskUid,
    title: task.title || "Untitled task",
    description: task.description,
    dueDate: task.dueDate,
    createdDate: task.createdAt ?? task.createdDate,
    priority: priorityId || priorityName ? { id: priorityId, name: priorityName } : undefined,
    category: categoryId || categoryName ? { id: categoryId, name: categoryName } : undefined,
    status: statusId || statusName ? { id: statusId, name: statusName } : undefined,
    type: typeId || typeName ? { id: typeId, name: typeName } : undefined,
    assignee: assigneeId || assigneeName ? { id: assigneeId, name: assigneeName } : undefined,
    location: locationId || locationName ? { id: locationId, name: locationName } : undefined,
    progress: task.progress,
    originData: typeof task.originData === "string" ? { referenceNumber: task.originReferenceNo, customerName: task.originCustomerName } : task.originData,
    taskAttachments: Array.isArray(task.taskAttachments) ? task.taskAttachments : Array.isArray(task.attachments) ? task.attachments : [],
    required: Boolean(task.required ?? task.isRequired),
  };
}

export function extractErrorMessage(err: any): string {
  if (!err) return "An unexpected error occurred.";

  const responseData = err.response?.data || err.data || err;
  if (responseData) {
    if (responseData.details?.fieldErrors && Array.isArray(responseData.details.fieldErrors)) {
      const fieldMsgs = responseData.details.fieldErrors
        .map((f: any) => f.message || `${f.field} is invalid`)
        .join(", ");
      return `${responseData.message || "Validation failed"}: ${fieldMsgs}`;
    }
    if (responseData.message) {
      return responseData.message;
    }
  }

  if (err.message) {
    return err.message;
  }

  return String(err);
}

export function normalizeCrmStageTask(raw: unknown): TaskRow {
  const task = raw as any;
  const uid = String(task?.uid ?? task?.taskUid ?? task?.id ?? task?.templateUid ?? task?.title ?? "crm-task");
  const completed = Boolean(task?.completed ?? task?.isCompleted);
  const statusName = String(task?.status?.name ?? task?.status ?? (completed ? "Completed" : "Open"));
  const priorityName = String(task?.priority?.name ?? task?.priority ?? "Normal");
  const assigneeName = String(task?.assignee?.name ?? task?.assigneeName ?? task?.assignedToName ?? "");

  return {
    taskUid: uid,
    id: task?.id ?? task?.uid ?? task?.taskUid,
    title: String(task?.title ?? task?.taskTitle ?? task?.taskName ?? "Untitled task"),
    description: task?.description ? String(task.description) : undefined,
    dueDate: task?.dueDate ?? task?.taskDate ?? task?.dueOn,
    createdDate: task?.createdDate ?? task?.createdOn,
    priority: {
      id: task?.priority?.id ?? priorityName,
      name: priorityName,
    },
    category: task?.category
      ? {
          id: task.category?.id ?? task.category,
          name: String(task.category?.name ?? task.category),
        }
      : undefined,
    status: {
      id: task?.status?.id ?? statusName,
      name: statusName,
    },
    assignee: assigneeName
      ? {
          id: task?.assignee?.id ?? task?.assigneeId ?? assigneeName,
          name: assigneeName,
        }
      : undefined,
    location: task?.location
      ? {
          id: task.location?.id ?? task.location,
          name: task.location?.name ?? task.location,
        }
      : undefined,
    progress: completed ? 100 : task?.progress,
    originData: {
      source: "CRM",
      sourceType: task?.type ?? task?.taskType,
      referenceNumber: task?.referenceNumber,
    },
    taskAttachments: Array.isArray(task?.taskAttachments) ? task.taskAttachments : [],
    required: Boolean(task?.required ?? task?.isRequired),
  };
}

export function isRequiredCrmTask(task: TaskRow) {
  const raw = task as any;
  return Boolean(raw.required ?? raw.isRequired);
}

export function normalizeData<T>(response: unknown): T | null {
  const payload = (response as any)?.data ?? response;
  if (!payload || Array.isArray(payload)) return null;
  return payload as T;
}

export function normalizeArray<T>(response: unknown): T[] {
  const payload = (response as any)?.data ?? response;
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.items)) return payload.items as T[];
  if (Array.isArray(payload?.content)) return payload.content as T[];
  if (Array.isArray(payload?.results)) return payload.results as T[];
  return [];
}

export function normalizeCount(response: unknown, fallback: number) {
  const payload = (response as any)?.data ?? response;
  if (typeof payload === "number") return payload;
  if (typeof payload?.count === "number") return payload.count;
  if (typeof payload?.total === "number") return payload.total;
  if (typeof payload?.totalElements === "number") return payload.totalElements;
  return fallback;
}

export function toOptions(items: TaskLookup[]) {
  return [...items]
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
    .map((item) => ({ value: String(item.id), label: item.name }));
}

export function userOptions(users: TaskUser[]) {
  return users.map((item) => ({ value: String(item.id), label: getUserName(item) || String(item.id) }));
}

export function locationOptions(locations: TaskLocation[]) {
  return locations.map((item) => ({ value: String(item.id), label: item.name || item.place || String(item.id) }));
}

export function getUserId(user: unknown) {
  const value = user as any;
  const id = value?.uid ?? value?.id ?? value?.userId;
  return id !== undefined && id !== null ? String(id) : undefined;
}

export function getUserName(user?: TaskUser) {
  if (!user) return "";
  return user.fullName || user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim();
}

export function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" }).format(date);
}

export function toDateInputValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function groupTasksByDate(tasks: TaskRow[]) {
  const groups = new Map<string, TaskRow[]>();
  tasks.forEach((task) => {
    if (!task.dueDate) return;
    const key = toDateInputValue(task.dueDate);
    groups.set(key, [...(groups.get(key) ?? []), task]);
  });
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rows]) => ({ date, tasks: rows }));
}

export function clampProgress(value?: string | number) {
  const parsed = Number(value ?? 0);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

export function isCompleteStatus(value?: string) {
  return /complete|completed|done|closed/i.test(value || "");
}

export function getTaskStatusVariant(value?: string): TaskStatusVariant {
  if (isCompleteStatus(value)) return "success";
  if (/hold|pending|waiting/i.test(value || "")) return "warning";
  if (/cancel|reject|failed|overdue/i.test(value || "")) return "danger";
  if (/progress|active|open/i.test(value || "")) return "info";
  return "neutral";
}

export function getPriorityVariant(value?: string): TaskStatusVariant {
  if (/urgent|critical|high/i.test(value || "")) return "danger";
  if (/medium|normal/i.test(value || "")) return "warning";
  if (/low/i.test(value || "")) return "success";
  return "neutral";
}

export async function completeTask(task: TaskRow, statuses: TaskLookup[], updateStatus: TaskStatusMutator, updateProgress: TaskProgressMutator) {
  const completeStatus = statuses.find((status) => isCompleteStatus(status.name));
  if (completeStatus?.id !== undefined) {
    await updateStatus.mutateAsync({ uid: task.taskUid, statusId: completeStatus.id });
    return;
  }
  await updateProgress.mutateAsync({ uid: task.taskUid, progress: 100 });
}

export async function deleteLookup(id: string | number, mutator: (id: string | number) => Promise<unknown>, message: string) {
  if (!window.confirm(message)) return;
  await mutator(id);
}
