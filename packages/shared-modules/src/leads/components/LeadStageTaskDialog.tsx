import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  TaskFormDialog,
  buildTaskPayload,
  useCreateTenantTask,
  useTaskCategories,
  useTaskPriorities,
  useTaskStatuses,
  useTaskTypes,
} from "../../tasks";
import type { TaskFormValues, TaskLocation, TaskLookup, TaskLookupData, TaskUser } from "../../tasks";
import { useProviderLocations } from "../queries/leads";
import { unwrapList } from "../utils";

type LeadStageTaskDialogProps = {
  open: boolean;
  leadUid: string;
  stageUid: string | null;
  consumerUid?: string;
  users: unknown[];
  defaultLocationId: string;
  onClose: () => void;
};

export function LeadStageTaskDialog({
  open,
  leadUid,
  stageUid,
  consumerUid,
  users,
  defaultLocationId,
  onClose,
}: LeadStageTaskDialogProps) {
  const queryClient = useQueryClient();
  const statusesQuery = useTaskStatuses();
  const prioritiesQuery = useTaskPriorities();
  const categoriesQuery = useTaskCategories();
  const typesQuery = useTaskTypes();
  const locationsQuery = useProviderLocations();
  const createTask = useCreateTenantTask();
  const lookups = useMemo<TaskLookupData>(
    () => ({
      statuses: unwrapList<TaskLookup>(statusesQuery.data),
      priorities: unwrapList<TaskLookup>(prioritiesQuery.data),
      categories: unwrapList<TaskLookup>(categoriesQuery.data),
      types: unwrapList<TaskLookup>(typesQuery.data),
      users: users.map(toTaskUser).filter((user): user is TaskUser => Boolean(user)),
      locations: unwrapList<TaskLocation>(locationsQuery.data),
    }),
    [categoriesQuery.data, locationsQuery.data, prioritiesQuery.data, statusesQuery.data, typesQuery.data, users]
  );

  async function createStageTask(values: TaskFormValues) {
    if (!stageUid) return;

    await createTask.mutateAsync({
      ...buildTaskPayload(values, defaultLocationId),
      consumerUid: consumerUid || undefined,
      originFrom: "CRM",
      originId: leadUid,
      crmLeadStageUid: stageUid,
    });

    queryClient.invalidateQueries({
      queryKey: ["tasks", "crm-lead-stage", stageUid, leadUid],
    });
    onClose();
  }

  return (
    <TaskFormDialog
      mode="create"
      open={open}
      onClose={onClose}
      loading={createTask.isPending}
      lookups={lookups}
      defaultLocationId={defaultLocationId}
      onSubmit={createStageTask}
    />
  );
}

function toTaskUser(value: unknown): TaskUser | null {
  const user = value as any;
  const id = user?.id ?? user?.uid ?? user?.userId;

  if (id === undefined || id === null || id === "") {
    return null;
  }

  const name =
    user?.fullName ||
    user?.name ||
    user?.userName ||
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    String(id);

  return {
    id,
    name,
    firstName: user?.firstName,
    lastName: user?.lastName,
    fullName: user?.fullName,
    status: user?.status,
  };
}
