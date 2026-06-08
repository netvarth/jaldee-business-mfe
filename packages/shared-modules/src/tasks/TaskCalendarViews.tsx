import { useMemo, useState } from "react";
import { Badge, DataTable, EmptyState, SectionCard, Select } from "@jaldee/design-system";
import { useSharedModulesContext } from "../context";
import { useCrmLeadStageTasks, useTenantTasks } from "./queries/tasks";
import type { TaskScope } from "./types";
import { TaskDetailDialog } from "./TaskDialogs";
import { useTaskLookups } from "./taskLookups";
import {
  buildTaskFilters,
  formatDate,
  getPriorityVariant,
  getTaskStatusVariant,
  getUserId,
  getUserName,
  groupTasksByDate,
  isRequiredCrmTask,
  normalizeArray,
  normalizeCrmStageTask,
  normalizeTenantTask,
  toOptions,
} from "./taskUtils";

const CALENDAR_PAGE_SIZE = 250;

export function TasksCalendarView() {
  const { user, location } = useSharedModulesContext();
  const [scope, setScope] = useState<TaskScope>("all");
  const [statusId, setStatusId] = useState("");
  const [selectedTaskUid, setSelectedTaskUid] = useState<string | null>(null);
  const lookups = useTaskLookups();
  const filters = useMemo(
    () =>
      buildTaskFilters({
        page: 1,
        scope,
        pageSize: CALENDAR_PAGE_SIZE,
        statusId,
        userId: getUserId(user),
        locationId: location?.id,
      }),
    [location?.id, scope, statusId, user]
  );
  const tasksQuery = useTenantTasks(filters);
  const tasks = normalizeArray<unknown>(tasksQuery.data).map(normalizeTenantTask);
  const selectedTask = selectedTaskUid ? tasks.find((task) => task.taskUid === selectedTaskUid) ?? null : null;
  const groupedTasks = groupTasksByDate(tasks);

  return (
    <>
      <SectionCard
        title="Task Calendar"
        className="border-slate-200 shadow-sm"
        actions={
          <div className="flex items-center gap-2">
            <Select
              testId="selectCalendarScope_SM_Tasks"
              value={scope}
              onChange={(event) => setScope(event.target.value as TaskScope)}
              options={[
                { value: "all", label: "All Tasks" },
                { value: "my", label: "My Tasks" },
                { value: "automation", label: "Automation Tasks" },
              ]}
            />
            <Select testId="selectCalendarStatus_SM_Tasks" value={statusId} onChange={(event) => setStatusId(event.target.value)} options={[{ value: "", label: "All statuses" }, ...toOptions(lookups.statuses)]} />
          </div>
        }
      >
        {groupedTasks.length === 0 && !tasksQuery.isLoading ? (
          <EmptyState title="No dated tasks" description="Tasks with due dates will appear in this calendar view." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {groupedTasks.map((group) => (
              <div key={group.date} className="rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900">{formatDate(group.date)}</div>
                <div className="divide-y divide-slate-100">
                  {group.tasks.map((task) => (
                    <button
                      key={task.taskUid}
                      type="button"
                      className="block w-full border-0 bg-transparent px-3 py-2 text-left hover:bg-slate-50"
                      onClick={() => setSelectedTaskUid(task.taskUid)}
                      id={`btnCalendarTask_${task.taskUid}`}
                    >
                      <div className="text-sm font-semibold text-slate-900">{task.title}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant={getTaskStatusVariant(task.status?.name)}>{task.status?.name || "Open"}</Badge>
                        <span className="text-xs text-slate-500">{getUserName(task.assignee) || "Unassigned"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      <TaskDetailDialog task={selectedTask} onClose={() => setSelectedTaskUid(null)} lookups={lookups} readOnly />
    </>
  );
}

export function CrmLeadStageTasksView() {
  const { routeParams } = useSharedModulesContext();
  const stageUid = routeParams?.subview || "";
  const leadUid = routeParams?.recordId || "";
  const tasksQuery = useCrmLeadStageTasks(stageUid, leadUid);
  const tasks = normalizeArray<unknown>(tasksQuery.data).map(normalizeCrmStageTask);
  const [selectedTaskUid, setSelectedTaskUid] = useState<string | null>(null);
  const selectedTask = selectedTaskUid ? tasks.find((task) => task.taskUid === selectedTaskUid) ?? null : null;
  const lookups = useTaskLookups();

  if (!stageUid || !leadUid) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState
          title="CRM task context missing"
          description="Open CRM stage tasks with /tasks/crm-stage/{stageUid}/{leadUid} so the module can load lead-stage tasks."
        />
      </SectionCard>
    );
  }

  return (
    <>
      <SectionCard title="CRM Stage Tasks" className="border-slate-200 shadow-sm" padding={false}>
        <DataTable
          data={tasks}
          columns={[
            {
              key: "title",
              header: "Task",
              render: (row) => (
                <button
                  type="button"
                  className="border-0 bg-transparent p-0 text-left font-semibold text-slate-900 hover:text-indigo-700"
                  onClick={() => setSelectedTaskUid(row.taskUid)}
                  id={`btnCrmStageTask_${row.taskUid}`}
                >
                  {row.title}
                </button>
              ),
            },
            {
              key: "status",
              header: "Status",
              width: 140,
              render: (row) => <Badge variant={getTaskStatusVariant(row.status?.name)}>{row.status?.name || "Open"}</Badge>,
            },
            {
              key: "priority",
              header: "Priority",
              width: 140,
              render: (row) => <Badge dot variant={getPriorityVariant(row.priority?.name)}>{row.priority?.name || "Normal"}</Badge>,
            },
            { key: "assignee", header: "Assignee", width: 180, render: (row) => getUserName(row.assignee) || <span className="text-slate-400">Unassigned</span> },
            { key: "dueDate", header: "Due Date", width: 130, render: (row) => formatDate(row.dueDate) },
            { key: "required", header: "Required", width: 100, render: (row) => (isRequiredCrmTask(row) ? <Badge variant="warning">Required</Badge> : <Badge variant="neutral">Optional</Badge>) },
          ]}
          getRowId={(row) => row.taskUid}
          loading={tasksQuery.isLoading}
          data-testid="crm-stage-tasks-table"
          emptyState={<EmptyState title="No CRM stage tasks" description="Tasks configured for this lead stage will appear here." />}
        />
      </SectionCard>
      <TaskDetailDialog task={selectedTask} onClose={() => setSelectedTaskUid(null)} lookups={lookups} readOnly />
    </>
  );
}
