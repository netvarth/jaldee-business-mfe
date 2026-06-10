import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Calendar, DataTable, EmptyState, SectionCard, Select } from "@jaldee/design-system";
import { useSharedModulesContext } from "../context";
import { useCrmLeadStageTasks, useTenantTasks } from "./queries/tasks";
import type { TaskRow } from "./types";
import { TaskDetailDialog } from "./TaskDialogs";
import { useTaskLookups } from "./taskLookups";
import {
  buildTaskFilters,
  formatDate,
  getPriorityVariant,
  getTaskStatusVariant,
  getUserId,
  getUserName,
  isRequiredCrmTask,
  normalizeArray,
  normalizeCrmStageTask,
  normalizeTenantTask,
  toDateInputValue,
} from "./taskUtils";

const CALENDAR_PAGE_SIZE = 250;
type TaskCalendarDateFilter = "taskDate" | "createdDate";
type TaskCalendarMode = "month" | "week" | "day" | "list";

const calendarModeOptions: Array<{ label: string; value: TaskCalendarMode }> = [
  { label: "Month", value: "month" },
  { label: "Week", value: "week" },
  { label: "Day", value: "day" },
  { label: "List", value: "list" },
];

export function TasksCalendarView() {
  const { user, location, navigate } = useSharedModulesContext();
  const [dateFilterType, setDateFilterType] = useState<TaskCalendarDateFilter>("taskDate");
  const [calendarMode, setCalendarMode] = useState<TaskCalendarMode>("list");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [hasAlignedToTasks, setHasAlignedToTasks] = useState(false);

  const filters = useMemo(
    () =>
      buildTaskFilters({
        page: 1,
        scope: "all",
        pageSize: CALENDAR_PAGE_SIZE,
        userId: getUserId(user),
        locationId: location?.id,
      }),
    [location?.id, user]
  );

  const tasksQuery = useTenantTasks(filters);
  const tasks = normalizeArray<unknown>(tasksQuery.data).map(normalizeTenantTask);

  const datedTasks = useMemo(() => {
    return tasks
      .map((task) => {
        const key = getTaskCalendarDateKey(task, dateFilterType);
        return key ? { task, key, date: dateFromKey(key) } : null;
      })
      .filter((item): item is { task: TaskRow; key: string; date: Date } => Boolean(item))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [tasks, dateFilterType]);

  const calendarEvents = useMemo(() => {
    return datedTasks.map((item) => ({
      id: item.task.taskUid,
      title: item.task.title || "Untitled task",
      date: item.date,
      allDay: true,
      color: getTaskCalendarColor(item.task),
      subtitle: getUserName(item.task.assignee) || "Unassigned",
      task: item.task,
    }));
  }, [datedTasks]);

  useEffect(() => {
    if (hasAlignedToTasks || datedTasks.length === 0) return;
    setCurrentDate(startOfMonth(datedTasks[0].date));
    setHasAlignedToTasks(true);
  }, [datedTasks, hasAlignedToTasks]);

  const visibleGroups = useMemo(() => {
    const groups = new Map<string, { date: Date; tasks: TaskRow[] }>();

    datedTasks
      .filter((item) => sameMonth(item.date, currentDate))
      .forEach((item) => {
        const group = groups.get(item.key) ?? { date: item.date, tasks: [] };
        group.tasks.push(item.task);
        groups.set(item.key, group);
      });

    return Array.from(groups.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [currentDate, datedTasks]);

  function moveCalendar(direction: -1 | 1) {
    setHasAlignedToTasks(true);
    setCurrentDate((date) => moveCalendarDate(date, calendarMode, direction));
  }

  function goToday() {
    setHasAlignedToTasks(true);
    setCurrentDate(new Date());
  }

  function openTask(taskUid: string) {
    if (navigate) {
      navigate(`/detail/${taskUid}`);
      return;
    }
    window.location.assign(`/tasks/detail/${encodeURIComponent(taskUid)}`);
  }

  const calendarTitle = formatCalendarTitle(currentDate, calendarMode);

  const dateFilter = (
    <div className="flex items-center gap-2">
      <span className="text-lg font-bold text-slate-900">By :</span>
      <Select
        testId="selectCalendarDateFilter_SM_Tasks"
        value={dateFilterType}
        onChange={(event) => {
          setDateFilterType(event.target.value as TaskCalendarDateFilter);
          setHasAlignedToTasks(false);
        }}
        options={[
          { value: "taskDate", label: "Task Date" },
          { value: "createdDate", label: "Created Date" },
        ]}
        fullWidth={false}
        className="h-10 min-w-[200px] text-base"
      />
    </div>
  );

  return (
    <>
      <SectionCard padding={false} className="border-slate-200 shadow-sm">
        <div className="p-6">
          {dateFilter}

          <div className="mt-4 border-t border-slate-300 pt-8">
            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="flex items-center gap-2">
                <div className="inline-flex overflow-hidden rounded-md">
                  <Button
                    type="button"
                    variant="primary"
                    aria-label={`Previous ${calendarMode}`}
                    className="h-9 w-9 rounded-r-none px-0"
                    onClick={() => moveCalendar(-1)}
                  >
                    &lt;
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    aria-label={`Next ${calendarMode}`}
                    className="h-9 w-9 rounded-l-none px-0"
                    onClick={() => moveCalendar(1)}
                  >
                    &gt;
                  </Button>
                </div>
                <Button type="button" variant="primary" className="h-9 px-3" onClick={goToday}>
                  Today
                </Button>
              </div>

              <h2 className="m-0 text-center text-3xl font-normal tracking-normal text-slate-950">
                {calendarTitle}
              </h2>

              <div className="flex justify-start md:justify-end">
                <div className="inline-flex overflow-hidden rounded-md border border-slate-200 bg-white">
                  {calendarModeOptions.map(({ label, value }) => {
                    const active = calendarMode === value;
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setCalendarMode(value)}
                        className={[
                          "h-9 border-0 border-r border-slate-200 px-3 text-sm font-medium last:border-r-0",
                          active ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]" : "bg-white text-slate-900 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden border border-slate-200 bg-white">
              {tasksQuery.isLoading ? (
                <div className="px-4 py-6 text-sm text-slate-500">Loading tasks...</div>
              ) : calendarMode !== "list" ? (
                <Calendar
                  events={calendarEvents}
                  view={calendarMode}
                  currentDate={currentDate}
                  onCurrentDateChange={(date) => {
                    setCurrentDate(date);
                    setHasAlignedToTasks(true);
                  }}
                  onEventClick={(event) => openTask(event.task.taskUid)}
                  className="border-0 shadow-none"
                  hideToolbar
                />
              ) : visibleGroups.length === 0 ? (
                <EmptyState
                  title="No tasks found"
                  description={`No ${dateFilterType === "taskDate" ? "task date" : "created date"} tasks found for ${calendarTitle}.`}
                />
              ) : (
                visibleGroups.map((group) => (
                  <div key={toDateInputValue(group.date.toISOString())}>
                    <div className="grid grid-cols-[1fr_auto] border-b border-slate-200 px-4 py-2 text-sm font-bold text-slate-950">
                      <span>{formatCalendarListDate(group.date)}</span>
                      <span>{formatCalendarWeekday(group.date)}</span>
                    </div>
                    {group.tasks.map((task) => (
                      <button
                        key={task.taskUid}
                        type="button"
                        className="grid w-full grid-cols-[4.5rem_0.75rem_minmax(0,1fr)] items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 text-left text-sm text-slate-900 last:border-b-0 hover:bg-slate-50"
                        onClick={() => openTask(task.taskUid)}
                      >
                        <span className="text-slate-900">all-day</span>
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" aria-hidden="true" />
                        <span className="truncate font-bold">{task.title || "Untitled task"}</span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

function getTaskCalendarDateKey(task: TaskRow, dateFilterType: TaskCalendarDateFilter) {
  const value = dateFilterType === "taskDate" ? task.dueDate : task.createdDate;
  return value ? toDateInputValue(value) : "";
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function moveCalendarDate(date: Date, mode: TaskCalendarMode, direction: -1 | 1) {
  const next = new Date(date);

  if (mode === "week") {
    next.setDate(next.getDate() + direction * 7);
    return next;
  }

  if (mode === "day") {
    next.setDate(next.getDate() + direction);
    return next;
  }

  return startOfMonth(new Date(next.getFullYear(), next.getMonth() + direction, 1));
}

function formatCalendarTitle(date: Date, mode: TaskCalendarMode) {
  if (mode === "day") {
    return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" }).format(date);
  }

  if (mode === "week") {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(start);
    }

    return `${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(start)} - ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(end)}`;
  }

  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
}

function getTaskCalendarColor(task: TaskRow) {
  const priority = task.priority?.name || "Normal";
  if (/urgent|critical|high/i.test(priority)) return "#DC2626";
  if (/medium|normal/i.test(priority)) return "#D97706";
  if (/low/i.test(priority)) return "#059669";
  return "#3B82F6";
}

function formatCalendarListDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function formatCalendarWeekday(date: Date) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);
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
