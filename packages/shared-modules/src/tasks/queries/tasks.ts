import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiScope } from "../../useApiScope";
import * as services from "../services/tasks";

const TASKS_KEY = "tasks";

// === Consumer Tasks ===

export function useConsumerTasks(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "consumer", filters],
    queryFn: () => services.getConsumerTasks(api, filters),
  });
}

export function useCreateConsumerTask() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createConsumerTask(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer"] });
    },
  });
}

export function useConsumerTaskByUid(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "consumer-detail", uid],
    queryFn: () => services.getConsumerTaskByUid(api, uid),
    enabled: Boolean(uid),
  });
}

export function useUpdateConsumerTask(uid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateConsumerTask(api, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer"] });
    },
  });
}

export function useDeleteConsumerTask() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.deleteConsumerTask(api, uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer"] });
    },
  });
}

export function useUpdateConsumerTaskAssignee() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, assigneeId }: { uid: string; assigneeId: string | number }) =>
      services.updateConsumerTaskAssignee(api, uid, assigneeId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer-detail", variables.uid] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer"] });
    },
  });
}

export function useRemoveConsumerTaskAssignee() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.removeConsumerTaskAssignee(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer"] });
    },
  });
}

export function useUpdateConsumerTaskQuantity() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, managerId }: { uid: string; managerId: string | number }) =>
      services.updateConsumerTaskQuantity(api, uid, managerId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer-detail", variables.uid] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer"] });
    },
  });
}

export function useUpdateConsumerTaskManager() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, managerId }: { uid: string; managerId: string | number }) =>
      services.updateConsumerTaskManager(api, uid, managerId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer-detail", variables.uid] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer"] });
    },
  });
}

export function useRemoveConsumerTaskManager() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.removeConsumerTaskManager(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer"] });
    },
  });
}

export function useUpdateConsumerTaskPriority() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, priorityId }: { uid: string; priorityId: string | number }) =>
      services.updateConsumerTaskPriority(api, uid, priorityId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer-detail", variables.uid] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer"] });
    },
  });
}

export function useUpdateConsumerTaskProgress() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, progress }: { uid: string; progress: string | number }) =>
      services.updateConsumerTaskProgress(api, uid, progress),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer-detail", variables.uid] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer"] });
    },
  });
}

export function useUpdateConsumerTaskStatus() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, statusId }: { uid: string; statusId: string | number }) =>
      services.updateConsumerTaskStatus(api, uid, statusId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer-detail", variables.uid] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "consumer"] });
    },
  });
}

export function useConsumerSubtasks(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "consumer-subtasks", uid],
    queryFn: () => services.getConsumerSubtasks(api, uid),
    enabled: Boolean(uid),
  });
}

export function useConsumerTasksByConsumerId(consumerId: string | number) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "consumer-tasks-by-id", consumerId],
    queryFn: () => services.getConsumerTasksByConsumerId(api, consumerId),
    enabled: Boolean(consumerId),
  });
}

export function useConsumerTasksCount(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "consumer-count", filters],
    queryFn: () => services.getConsumerTasksCount(api, filters),
  });
}

// === Tenant Tasks ===

export function useTenantTasks(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "tenant", filters],
    queryFn: () => services.getTenantTasks(api, filters),
  });
}

export function useCreateTenantTask() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createTenantTask(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "tenant"] });
    },
  });
}

export function useTenantTaskByUid(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "tenant-detail", uid],
    queryFn: () => services.getTenantTaskByUid(api, uid),
    enabled: Boolean(uid),
  });
}

export function useUpdateTenantTask(uid: string) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateTenantTask(api, uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "tenant-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "tenant"] });
    },
  });
}

export function useDeleteTenantTask() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.deleteTenantTask(api, uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "tenant"] });
    },
  });
}

export function useUpdateTenantTaskAssignee() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, assigneeId }: { uid: string; assigneeId: string | number }) =>
      services.updateTenantTaskAssignee(api, uid, assigneeId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "tenant-detail", variables.uid] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "tenant"] });
    },
  });
}

export function useRemoveTenantTaskAssignee() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.removeTenantTaskAssignee(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "tenant-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "tenant"] });
    },
  });
}

export function useUpdateTenantTaskManager() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, managerId }: { uid: string; managerId: string | number }) =>
      services.updateTenantTaskManager(api, uid, managerId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "tenant-detail", variables.uid] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "tenant"] });
    },
  });
}

export function useRemoveTenantTaskManager() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => services.removeTenantTaskManager(api, uid),
    onSuccess: (_, uid) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "tenant-detail", uid] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "tenant"] });
    },
  });
}

export function useUpdateTenantTaskPriority() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, priorityId }: { uid: string; priorityId: string | number }) =>
      services.updateTenantTaskPriority(api, uid, priorityId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "tenant-detail", variables.uid] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "tenant"] });
    },
  });
}

export function useUpdateTenantTaskProgress() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, progress }: { uid: string; progress: string | number }) =>
      services.updateTenantTaskProgress(api, uid, progress),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "tenant-detail", variables.uid] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "tenant"] });
    },
  });
}

export function useUpdateTenantTaskStatus() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, statusId }: { uid: string; statusId: string | number }) =>
      services.updateTenantTaskStatus(api, uid, statusId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "tenant-detail", variables.uid] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "tenant"] });
    },
  });
}

export function useTenantSubtasks(uid: string) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "tenant-subtasks", uid],
    queryFn: () => services.getTenantSubtasks(api, uid),
    enabled: Boolean(uid),
  });
}

export function useTenantTasksCount(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "tenant-count", filters],
    queryFn: () => services.getTenantTasksCount(api, filters),
  });
}

// === Task Categories ===

export function useTaskCategories(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "categories", filters],
    queryFn: () => services.getTaskCategories(api, filters),
  });
}

export function useCreateTaskCategory() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createTaskCategory(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "categories"] });
    },
  });
}

export function useTaskCategoryById(id: string | number) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "category-detail", id],
    queryFn: () => services.getTaskCategoryById(api, id),
    enabled: id !== undefined && id !== null,
  });
}

export function useUpdateTaskCategory(id: string | number) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateTaskCategory(api, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "category-detail", id] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "categories"] });
    },
  });
}

export function useDeleteTaskCategory() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => services.deleteTaskCategory(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "categories"] });
    },
  });
}

export function useTaskCategoriesCount(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "categories-count", filters],
    queryFn: () => services.getTaskCategoriesCount(api, filters),
  });
}

// === Task Priorities ===

export function useTaskPriorities(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "priorities", filters],
    queryFn: () => services.getTaskPriorities(api, filters),
  });
}

export function useCreateTaskPriority() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createTaskPriority(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "priorities"] });
    },
  });
}

export function useTaskPriorityById(id: string | number) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "priority-detail", id],
    queryFn: () => services.getTaskPriorityById(api, id),
    enabled: id !== undefined && id !== null,
  });
}

export function useUpdateTaskPriority(id: string | number) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateTaskPriority(api, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "priority-detail", id] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "priorities"] });
    },
  });
}

export function useDeleteTaskPriority() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => services.deleteTaskPriority(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "priorities"] });
    },
  });
}

export function useTaskPrioritiesCount(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "priorities-count", filters],
    queryFn: () => services.getTaskPrioritiesCount(api, filters),
  });
}

// === Task Statuses ===

export function useTaskStatuses(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "statuses", filters],
    queryFn: () => services.getTaskStatuses(api, filters),
  });
}

export function useCreateTaskStatus() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createTaskStatus(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "statuses"] });
    },
  });
}

export function useTaskStatusById(id: string | number) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "status-detail", id],
    queryFn: () => services.getTaskStatusById(api, id),
    enabled: id !== undefined && id !== null,
  });
}

export function useUpdateTaskStatus(id: string | number) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateTaskStatus(api, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "status-detail", id] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "statuses"] });
    },
  });
}

export function useDeleteTaskStatus() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => services.deleteTaskStatus(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "statuses"] });
    },
  });
}

export function useTaskStatusesCount(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "statuses-count", filters],
    queryFn: () => services.getTaskStatusesCount(api, filters),
  });
}

// === Task Templates ===

export function useTaskTemplates(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "templates", filters],
    queryFn: () => services.getTaskTemplates(api, filters),
  });
}

export function useCreateTaskTemplate() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createTaskTemplate(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "templates"] });
    },
  });
}

export function useTaskTemplateById(id: string | number) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "template-detail", id],
    queryFn: () => services.getTaskTemplateById(api, id),
    enabled: id !== undefined && id !== null,
  });
}

export function useUpdateTaskTemplate(id: string | number) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateTaskTemplate(api, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "template-detail", id] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "templates"] });
    },
  });
}

export function useDeleteTaskTemplate() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => services.deleteTaskTemplate(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "templates"] });
    },
  });
}

export function useAvailableTaskTemplates() {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "templates-available"],
    queryFn: () => services.getAvailableTaskTemplates(api),
  });
}

export function useTaskTemplatesCount(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "templates-count", filters],
    queryFn: () => services.getTaskTemplatesCount(api, filters),
  });
}

// === Task Types ===

export function useTaskTypes(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "types", filters],
    queryFn: () => services.getTaskTypes(api, filters),
  });
}

export function useCreateTaskType() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.createTaskType(api, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "types"] });
    },
  });
}

export function useTaskTypeById(id: string | number) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "type-detail", id],
    queryFn: () => services.getTaskTypeById(api, id),
    enabled: id !== undefined && id !== null,
  });
}

export function useUpdateTaskType(id: string | number) {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => services.updateTaskType(api, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "type-detail", id] });
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "types"] });
    },
  });
}

export function useDeleteTaskType() {
  const api = useApiScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => services.deleteTaskType(api, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY, "types"] });
    },
  });
}

export function useTaskTypesCount(filters?: unknown) {
  const api = useApiScope();
  return useQuery({
    queryKey: [TASKS_KEY, "types-count", filters],
    queryFn: () => services.getTaskTypesCount(api, filters),
  });
}
