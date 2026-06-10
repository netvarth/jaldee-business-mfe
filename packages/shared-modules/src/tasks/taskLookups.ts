import { useUserLocations, useUsersList } from "../users/queries/users";
import { useTaskCategories, useTaskPriorities, useTaskStatuses, useTaskTypes } from "./queries/tasks";
import type { TaskLocation, TaskLookup, TaskUser } from "./types";
import { normalizeArray } from "./taskUtils";

export type TaskLookupData = {
  statuses: TaskLookup[];
  priorities: TaskLookup[];
  categories: TaskLookup[];
  types: TaskLookup[];
  users: TaskUser[];
  locations: TaskLocation[];
};

export function useTaskLookups(): TaskLookupData {
  const statusQuery = useTaskStatuses();
  const priorityQuery = useTaskPriorities();
  const categoryQuery = useTaskCategories();
  const typeQuery = useTaskTypes();
  const usersQuery = useUsersList({ page: 1, pageSize: 100, status: "ACTIVE" });
  const locationsQuery = useUserLocations();

  return {
    statuses: normalizeArray<TaskLookup>(statusQuery.data),
    priorities: normalizeArray<TaskLookup>(priorityQuery.data),
    categories: normalizeArray<TaskLookup>(categoryQuery.data),
    types: normalizeArray<TaskLookup>(typeQuery.data),
    users: normalizeArray<TaskUser>(usersQuery.data?.users),
    locations: normalizeArray<TaskLocation>(locationsQuery.data),
  };
}
