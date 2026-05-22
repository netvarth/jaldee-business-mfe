import { BASE_SERVICE_ENDPOINTS, buildBaseServiceUrl } from "../../serviceUrls";

interface ScopedApi {
  get: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
  post: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  put: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  patch: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  delete: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
}

// === Consumer Tasks ===

export async function getConsumerTasks(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.list), { params: filters });
}

export async function createConsumerTask(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.create), data);
}

export async function getConsumerTaskByUid(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.detail(uid)));
}

export async function updateConsumerTask(api: ScopedApi, uid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.update(uid)), data);
}

export async function deleteConsumerTask(api: ScopedApi, uid: string) {
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.detail(uid)));
}

export async function updateConsumerTaskAssignee(api: ScopedApi, uid: string, assigneeId: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.assignee(uid, assigneeId)));
}

export async function removeConsumerTaskAssignee(api: ScopedApi, uid: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.removeAssignee(uid)));
}

export async function updateConsumerTaskQuantity(api: ScopedApi, uid: string, managerId: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.manager(uid, managerId)));
}

export async function updateConsumerTaskManager(api: ScopedApi, uid: string, managerId: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.manager(uid, managerId)));
}

export async function removeConsumerTaskManager(api: ScopedApi, uid: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.removeManager(uid)));
}

export async function updateConsumerTaskPriority(api: ScopedApi, uid: string, priorityId: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.priority(uid, priorityId)));
}

export async function updateConsumerTaskProgress(api: ScopedApi, uid: string, progress: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.progress(uid, progress)));
}

export async function updateConsumerTaskStatus(api: ScopedApi, uid: string, statusId: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.consumerTasks.status(uid, statusId)));
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
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.list), { params: filters });
}

export async function createTenantTask(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.create), data);
}

export async function getTenantTaskByUid(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.detail(uid)));
}

export async function updateTenantTask(api: ScopedApi, uid: string, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.update(uid)), data);
}

export async function deleteTenantTask(api: ScopedApi, uid: string) {
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.detail(uid)));
}

export async function updateTenantTaskAssignee(api: ScopedApi, uid: string, assigneeId: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.assignee(uid, assigneeId)));
}

export async function removeTenantTaskAssignee(api: ScopedApi, uid: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.removeAssignee(uid)));
}

export async function updateTenantTaskManager(api: ScopedApi, uid: string, managerId: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.manager(uid, managerId)));
}

export async function removeTenantTaskManager(api: ScopedApi, uid: string) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.removeManager(uid)));
}

export async function updateTenantTaskPriority(api: ScopedApi, uid: string, priorityId: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.priority(uid, priorityId)));
}

export async function updateTenantTaskProgress(api: ScopedApi, uid: string, progress: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.progress(uid, progress)));
}

export async function updateTenantTaskStatus(api: ScopedApi, uid: string, statusId: string | number) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.status(uid, statusId)));
}

export async function getTenantSubtasks(api: ScopedApi, uid: string) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.subtasks(uid)));
}

export async function getTenantTasksCount(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.tenantTasks.count), { params: filters });
}

// === Task Categories ===

export async function getTaskCategories(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskCategories.list), { params: filters });
}

export async function createTaskCategory(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskCategories.create), data);
}

export async function getTaskCategoryById(api: ScopedApi, id: string | number) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskCategories.detail(id)));
}

export async function updateTaskCategory(api: ScopedApi, id: string | number, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskCategories.update(id)), data);
}

export async function deleteTaskCategory(api: ScopedApi, id: string | number) {
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskCategories.detail(id)));
}

export async function getTaskCategoriesCount(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskCategories.count), { params: filters });
}

// === Task Priorities ===

export async function getTaskPriorities(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskPriorities.list), { params: filters });
}

export async function createTaskPriority(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskPriorities.create), data);
}

export async function getTaskPriorityById(api: ScopedApi, id: string | number) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskPriorities.detail(id)));
}

export async function updateTaskPriority(api: ScopedApi, id: string | number, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskPriorities.update(id)), data);
}

export async function deleteTaskPriority(api: ScopedApi, id: string | number) {
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskPriorities.detail(id)));
}

export async function getTaskPrioritiesCount(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskPriorities.count), { params: filters });
}

// === Task Statuses ===

export async function getTaskStatuses(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskStatuses.list), { params: filters });
}

export async function createTaskStatus(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskStatuses.create), data);
}

export async function getTaskStatusById(api: ScopedApi, id: string | number) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskStatuses.detail(id)));
}

export async function updateTaskStatus(api: ScopedApi, id: string | number, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskStatuses.update(id)), data);
}

export async function deleteTaskStatus(api: ScopedApi, id: string | number) {
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskStatuses.detail(id)));
}

export async function getTaskStatusesCount(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskStatuses.count), { params: filters });
}

// === Task Templates ===

export async function getTaskTemplates(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTemplates.list), { params: filters });
}

export async function createTaskTemplate(api: ScopedApi, data: unknown) {
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTemplates.create), data);
}

export async function getTaskTemplateById(api: ScopedApi, id: string | number) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTemplates.detail(id)));
}

export async function updateTaskTemplate(api: ScopedApi, id: string | number, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTemplates.update(id)), data);
}

export async function deleteTaskTemplate(api: ScopedApi, id: string | number) {
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTemplates.detail(id)));
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
  return api.post(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTypes.create), data);
}

export async function getTaskTypeById(api: ScopedApi, id: string | number) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTypes.detail(id)));
}

export async function updateTaskType(api: ScopedApi, id: string | number, data: unknown) {
  return api.put(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTypes.update(id)), data);
}

export async function deleteTaskType(api: ScopedApi, id: string | number) {
  return api.delete(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTypes.detail(id)));
}

export async function getTaskTypesCount(api: ScopedApi, filters?: unknown) {
  return api.get(buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.taskTypes.count), { params: filters });
}
