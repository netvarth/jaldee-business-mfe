import { BASE_SERVICE_ENDPOINTS, buildBaseServiceUrl } from "../../serviceUrls";

interface ScopedApi {
  get: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
  post: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  put: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  patch: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  delete: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
}

const TASK_SETTINGS_REQUEST_CONFIG = {
  skipLocationScope: true,
  _skipLocationParam: true,
};

function buildTenantTaskSearchRequest(filters?: unknown) {
  const body =
    filters && typeof filters === "object" && !Array.isArray(filters)
      ? { ...(filters as Record<string, unknown>) }
      : {};
  const rawPage = Number(body.page);
  const rawSize = Number(body.size);
  const rawFrom = Number(body.from);
  const rawCount = Number(body.count);
  const size = Number.isFinite(rawSize) && rawSize > 0
    ? rawSize
    : Number.isFinite(rawCount) && rawCount > 0
      ? rawCount
      : 20;
  const page = Number.isFinite(rawPage) && rawPage >= 0
    ? rawPage
    : Number.isFinite(rawFrom) && rawFrom >= 0
      ? Math.floor(rawFrom / size)
      : 0;
  const sort = typeof body.sort === "string" ? body.sort : undefined;

  delete body.from;
  delete body.count;
  delete body.page;
  delete body.size;
  delete body.sort;

  return {
    body,
    params: {
      page,
      size,
      ...(sort ? { sort } : {}),
    },
  };
}

function buildTaskTemplateSearchRequest(filters?: unknown) {
  const input =
    filters && typeof filters === "object" && !Array.isArray(filters)
      ? { ...(filters as Record<string, unknown>) }
      : {};
  const body: Record<string, unknown> = {};
  const rawPage = Number(input.page);
  const rawSize = Number(input.size);
  const rawFrom = Number(input.from);
  const rawCount = Number(input.count);
  const size = Number.isFinite(rawSize) && rawSize > 0
    ? rawSize
    : Number.isFinite(rawCount) && rawCount > 0
      ? rawCount
      : 20;
  const page = Number.isFinite(rawPage) && rawPage >= 0
    ? rawPage
    : Number.isFinite(rawFrom) && rawFrom >= 0
      ? Math.floor(rawFrom / size)
      : 0;
  const sort = typeof input.sort === "string" ? input.sort : undefined;
  const directKeys = [
    "title",
    "source",
    "sourceService",
    "feature",
    "featureModule",
    "templateName",
    "isAvailable",
    "isSubTask",
    "isSequential",
    "categoryId",
    "typeId",
    "priorityId",
    "originFrom",
    "originId",
  ];

  directKeys.forEach((key) => {
    if (input[key] !== undefined && input[key] !== null && input[key] !== "") {
      body[key] = input[key];
    }
  });

  if (body.templateName === undefined && input.name) {
    body.templateName = input.name;
  }
  if (body.templateName === undefined && input["templateName-like"]) {
    body.templateName = input["templateName-like"];
  }
  if (body.title === undefined && input["title-like"]) {
    body.title = input["title-like"];
  }
  if (body.isAvailable === undefined && input.available !== undefined) {
    body.isAvailable = input.available;
  }
  if (body.categoryId === undefined && input["category-eq"]) {
    body.categoryId = input["category-eq"];
  }
  if (body.typeId === undefined && input["type-eq"]) {
    body.typeId = input["type-eq"];
  }
  if (body.priorityId === undefined && input["priority-eq"]) {
    body.priorityId = input["priority-eq"];
  }

  return {
    body,
    params: {
      page,
      size,
      ...(sort ? { sort } : {}),
    },
  };
}

// === Consumer Tasks ===

export async function getConsumerTasks(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.list), { params: filters });
}

export async function createConsumerTask(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.create), data, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function getConsumerTaskByUid(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.detail(uid)));
}

export async function updateConsumerTask(api: ScopedApi, uid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.update(uid)), data, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function deleteConsumerTask(api: ScopedApi, uid: string) {
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.detail(uid)), TASK_SETTINGS_REQUEST_CONFIG);
}

export async function updateConsumerTaskAssignee(api: ScopedApi, uid: string, assigneeId: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.assignee(uid, assigneeId)), null, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function removeConsumerTaskAssignee(api: ScopedApi, uid: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.removeAssignee(uid)), null, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function updateConsumerTaskQuantity(api: ScopedApi, uid: string, managerId: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.manager(uid, managerId)), null, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function updateConsumerTaskManager(api: ScopedApi, uid: string, managerId: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.manager(uid, managerId)), null, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function removeConsumerTaskManager(api: ScopedApi, uid: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.removeManager(uid)), null, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function updateConsumerTaskPriority(api: ScopedApi, uid: string, priorityId: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.priority(uid, priorityId)), null, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function updateConsumerTaskProgress(api: ScopedApi, uid: string, progress: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.progress(uid, progress)), null, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function updateConsumerTaskStatus(api: ScopedApi, uid: string, statusId: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.status(uid, statusId)), null, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function getConsumerSubtasks(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.subtasks(uid)));
}

export async function getConsumerTasksByConsumerId(api: ScopedApi, consumerId: string | number) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.byConsumer(consumerId)));
}

export async function getConsumerTasksCount(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.count), { params: filters });
}

// === Tenant Tasks ===

export async function getTenantTasks(api: ScopedApi, filters?: unknown) {
  const { body, params } = buildTenantTaskSearchRequest(filters);
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.search), body, { params });
}

export async function createTenantTask(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.create), data, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function getTenantTaskByUid(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.detail(uid)));
}

export async function updateTenantTask(api: ScopedApi, uid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.update(uid)), data, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function saveTenantTaskAttachments(api: ScopedApi, uid: string, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.attachments(uid)), data, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function deleteTenantTask(api: ScopedApi, uid: string) {
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.detail(uid)), TASK_SETTINGS_REQUEST_CONFIG);
}

export async function updateTenantTaskAssignee(api: ScopedApi, uid: string, assigneeId: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.assignee(uid, assigneeId)), null, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function removeTenantTaskAssignee(api: ScopedApi, uid: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.removeAssignee(uid)), null, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function updateTenantTaskManager(api: ScopedApi, uid: string, managerId: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.manager(uid, managerId)), null, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function removeTenantTaskManager(api: ScopedApi, uid: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.removeManager(uid)), null, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function updateTenantTaskPriority(api: ScopedApi, uid: string, priorityId: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.priority(uid, priorityId)), null, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function updateTenantTaskProgress(api: ScopedApi, uid: string, progress: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.progress(uid, progress)), null, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function updateTenantTaskStatus(api: ScopedApi, uid: string, statusId: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.status(uid, statusId)), null, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function getTenantSubtasks(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.subtasks(uid)));
}

export async function getTenantTasksCount(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.count), { params: filters });
}

export async function requestTaskFileUploadUrls(api: ScopedApi, items: unknown) {
  return api.post("provider/fileShare/upload", items);
}

export async function markTaskFileUploadComplete(api: ScopedApi, driveId: string | number) {
  return api.put(`provider/fileShare/upload/COMPLETE/${driveId}`, null);
}

// === CRM Lead Stage Tasks ===

export async function getCrmLeadStageTasks(api: ScopedApi, stageUid: string, leadUid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadPipelines.stageTasksByLead(stageUid, leadUid)));
}

// === Task Categories ===

export async function getTaskCategories(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskCategories.list), { params: filters });
}

export async function createTaskCategory(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskCategories.create), data, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function getTaskCategoryById(api: ScopedApi, id: string | number) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskCategories.detail(id)));
}

export async function updateTaskCategory(api: ScopedApi, id: string | number, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskCategories.update(id)), data, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function deleteTaskCategory(api: ScopedApi, id: string | number) {
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskCategories.detail(id)), TASK_SETTINGS_REQUEST_CONFIG);
}

export async function getTaskCategoriesCount(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskCategories.count), { params: filters });
}

// === Task Priorities ===

export async function getTaskPriorities(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskPriorities.list), { params: filters });
}

export async function createTaskPriority(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskPriorities.create), data, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function getTaskPriorityById(api: ScopedApi, id: string | number) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskPriorities.detail(id)));
}

export async function updateTaskPriority(api: ScopedApi, id: string | number, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskPriorities.update(id)), data, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function deleteTaskPriority(api: ScopedApi, id: string | number) {
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskPriorities.detail(id)), TASK_SETTINGS_REQUEST_CONFIG);
}

export async function getTaskPrioritiesCount(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskPriorities.count), { params: filters });
}

// === Task Statuses ===

export async function getTaskStatuses(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskStatuses.list), { params: filters });
}

export async function createTaskStatus(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskStatuses.create), data, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function getTaskStatusById(api: ScopedApi, id: string | number) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskStatuses.detail(id)));
}

export async function updateTaskStatus(api: ScopedApi, id: string | number, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskStatuses.update(id)), data, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function deleteTaskStatus(api: ScopedApi, id: string | number) {
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskStatuses.detail(id)), TASK_SETTINGS_REQUEST_CONFIG);
}

export async function getTaskStatusesCount(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskStatuses.count), { params: filters });
}

// === Task Templates ===

export async function getTaskTemplates(api: ScopedApi, filters?: unknown) {
  const { body, params } = buildTaskTemplateSearchRequest(filters);
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTemplates.search), body, { params });
}

export async function createTaskTemplate(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTemplates.create), data, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function getTaskTemplateById(api: ScopedApi, id: string | number) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTemplates.detail(id)));
}

export async function updateTaskTemplate(api: ScopedApi, id: string | number, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTemplates.update(id)), data, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function deleteTaskTemplate(api: ScopedApi, id: string | number) {
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTemplates.detail(id)), TASK_SETTINGS_REQUEST_CONFIG);
}

export async function getAvailableTaskTemplates(api: ScopedApi) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTemplates.available));
}

export async function getTaskTemplatesCount(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTemplates.count), { params: filters });
}

// === Task Types ===

export async function getTaskTypes(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTypes.list), { params: filters });
}

export async function createTaskType(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTypes.create), data, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function getTaskTypeById(api: ScopedApi, id: string | number) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTypes.detail(id)));
}

export async function updateTaskType(api: ScopedApi, id: string | number, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTypes.update(id)), data, TASK_SETTINGS_REQUEST_CONFIG);
}

export async function deleteTaskType(api: ScopedApi, id: string | number) {
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTypes.detail(id)), TASK_SETTINGS_REQUEST_CONFIG);
}

export async function getTaskTypesCount(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTypes.count), { params: filters });
}
