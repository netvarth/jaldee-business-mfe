import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Dialog, DialogFooter, Drawer, EmptyState, Input, SectionCard, Select, cn } from "@jaldee/design-system";
import { useSharedModulesContext } from "../context";
import {
  useRemoveTenantTaskAssignee,
  useTenantTasks,
  useUpdateTenantTaskAssignee,
  useUpdateTenantTaskStatus,
} from "./queries/tasks";
import type { TaskLookup, TaskRow, TaskUser } from "./types";
import { useTaskLookups } from "./taskLookups";
import { TaskPaginationFooter } from "./TaskPaginationFooter";
import {
  buildTaskFilters,
  formatDate,
  getPriorityVariant,
  getTaskStatusVariant,
  getUserId,
  getUserName,
  normalizeArray,
  normalizeCount,
  normalizeTenantTask,
  toOptions,
  userOptions,
} from "./taskUtils";

const PAGE_SIZE = 10;
type TaskListFilterValues = {
  query: string;
  statusId: string;
  priorityId: string;
  categoryId: string;
  assigneeId: string;
  fromDueDate: string;
  toDueDate: string;
  fromCreatedDate: string;
  toCreatedDate: string;
  originReferenceNo: string;
  originCustomerName: string;
};
type TaskCardActionType = "changeAssignee" | "changeStatus";
type TaskCardActionState = { type: TaskCardActionType; task: TaskRow };
type TaskCardActionValues = { assigneeId: string; statusId: string };

const EMPTY_TASK_LIST_FILTERS: TaskListFilterValues = {
  query: "",
  statusId: "",
  priorityId: "",
  categoryId: "",
  assigneeId: "",
  fromDueDate: "",
  toDueDate: "",
  fromCreatedDate: "",
  toCreatedDate: "",
  originReferenceNo: "",
  originCustomerName: "",
};

export function TasksListView() {
  const { user, location, navigate } = useSharedModulesContext();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TaskListFilterValues>(EMPTY_TASK_LIST_FILTERS);
  const [actionDialog, setActionDialog] = useState<TaskCardActionState | null>(null);

  const lookups = useTaskLookups();
  const apiFilters = useMemo(
    () =>
      buildTaskFilters({
        page,
        scope: "all",
        pageSize: PAGE_SIZE,
        searchText: filters.query,
        statusId: filters.statusId,
        priorityId: filters.priorityId,
        categoryId: filters.categoryId,
        assigneeId: filters.assigneeId,
        fromDueDate: filters.fromDueDate,
        toDueDate: filters.toDueDate,
        fromCreatedDate: filters.fromCreatedDate,
        toCreatedDate: filters.toCreatedDate,
        originReferenceNo: filters.originReferenceNo,
        originCustomerName: filters.originCustomerName,
        userId: getUserId(user),
        locationId: location?.id,
      }),
    [
      filters,
      location?.id,
      page,
      user,
    ]
  );

  const taskQuery = useTenantTasks(apiFilters);
  const tasks = normalizeArray<unknown>(taskQuery.data).map(normalizeTenantTask);
  const total = normalizeCount(taskQuery.data, tasks.length);

  const updateAssignee = useUpdateTenantTaskAssignee();
  const removeAssignee = useRemoveTenantTaskAssignee();
  const updateStatus = useUpdateTenantTaskStatus();

  function openTask(taskUid: string) {
    if (navigate) {
      navigate(`/detail/${taskUid}`);
      return;
    }
    window.location.assign(`/tasks/detail/${encodeURIComponent(taskUid)}`);
  }

  function resetFilters() {
    setFilters(EMPTY_TASK_LIST_FILTERS);
    setPage(1);
  }

  function applyFilters(nextFilters: TaskListFilterValues) {
    setFilters(nextFilters);
    setPage(1);
  }

  async function submitCardAction(values: TaskCardActionValues) {
    const task = actionDialog?.task;
    if (!task) return;

    if (actionDialog.type === "changeAssignee") {
      await updateAssignee.mutateAsync({ uid: task.taskUid, assigneeId: values.assigneeId });
    } else if (actionDialog.type === "changeStatus") {
      await updateStatus.mutateAsync({ uid: task.taskUid, statusId: values.statusId });
    }

    setActionDialog(null);
  }

  async function removeTaskAssignee(task: TaskRow) {
    if (!task.assignee?.id || !window.confirm("Remove assignee from this task?")) return;
    await removeAssignee.mutateAsync(task.taskUid);
  }

  return (
    <>
      <SectionCard
        padding={false}
        className="overflow-visible border-slate-200 shadow-sm"
      >
        <TaskFiltersBar
          filters={filters}
          statuses={lookups.statuses}
          priorities={lookups.priorities}
          categories={lookups.categories}
          users={lookups.users}
          onApply={applyFilters}
          onReset={resetFilters}
        />

        <div data-testid="tasks-card-list" className="p-4">
          {taskQuery.isLoading ? (
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="min-h-[180px] rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="h-4 w-3/4 rounded bg-slate-100" />
                  <div className="mt-4 h-3 w-full rounded bg-slate-100" />
                  <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState title="No tasks found" description="Adjust filters or create a task to start tracking work." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {tasks.map((task) => (
                <TaskCard
                  key={task.taskUid}
                  task={task}
                  onOpen={() => openTask(task.taskUid)}
                  onChangeAssignee={() => setActionDialog({ type: "changeAssignee", task })}
                  onRemoveAssignee={() => removeTaskAssignee(task)}
                  onChangeStatus={() => setActionDialog({ type: "changeStatus", task })}
                />
              ))}
            </div>
          )}
        </div>

        <TaskPaginationFooter
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onChange={setPage}
          testId="tasks-card-list-pagination"
        />
      </SectionCard>

      <TaskCardActionDialog
        state={actionDialog}
        lookups={lookups}
        loading={updateAssignee.isPending || updateStatus.isPending}
        onClose={() => setActionDialog(null)}
        onSubmit={submitCardAction}
      />
    </>
  );
}

function TaskFiltersBar({
  filters,
  statuses,
  priorities,
  categories,
  users,
  onApply,
  onReset,
}: {
  filters: TaskListFilterValues;
  statuses: TaskLookup[];
  priorities: TaskLookup[];
  categories: TaskLookup[];
  users: TaskUser[];
  onApply: (filters: TaskListFilterValues) => void;
  onReset: () => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<TaskListFilterValues>(filters);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  function setDraftValue(key: keyof TaskListFilterValues, value: string) {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  }

  function applyDraft() {
    onApply(draftFilters);
  }

  function applyTopFilter(key: "statusId" | "categoryId", value: string) {
    const nextFilters = { ...filters, [key]: value };
    setDraftFilters(nextFilters);
    onApply(nextFilters);
  }

  function resetDraft() {
    setDraftFilters(EMPTY_TASK_LIST_FILTERS);
    onReset();
  }

  const appliedAdvancedFilterCount = [
    filters.query,
    filters.priorityId,
    filters.assigneeId,
    filters.fromDueDate,
  ].filter(Boolean).length;

  return (
    <>
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-slate-50/50 p-4">
        <div className="w-48">
          <Select
            label="Status"
            testId="selectTaskStatus_SM_Tasks"
            value={filters.statusId}
            onChange={(event) => applyTopFilter("statusId", event.target.value)}
            options={[{ value: "", label: "All statuses" }, ...toOptions(statuses)]}
          />
        </div>
        <div className="w-48">
          <Select
            label="Category"
            testId="selectTaskCategory_SM_Tasks"
            value={filters.categoryId}
            onChange={(event) => applyTopFilter("categoryId", event.target.value)}
            options={[{ value: "", label: "All categories" }, ...toOptions(categories)]}
          />
        </div>
        <Button
          type="button"
          variant={appliedAdvancedFilterCount > 0 ? "primary" : "outline"}
          className={cn(
            "ml-auto flex items-center gap-2 rounded-md border-slate-300 px-4 py-2 font-semibold",
            appliedAdvancedFilterCount > 0
              ? ""
              : "border-indigo-100 text-indigo-700 hover:bg-indigo-50/20"
          )}
          onClick={() => setDrawerOpen(true)}
          id="btnTaskDrawerFilters_SM_Tasks"
        >
          <FilterIcon />
          <span>Filter</span>
          {appliedAdvancedFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-indigo-600">
              {appliedAdvancedFilterCount}
            </span>
          )}
        </Button>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Advanced Filters" size="sm">
        <div className="flex h-full flex-col justify-between">
          <div className="space-y-5 flex-1">
            <Input
              id="txtTaskName_SM_Tasks"
              label="Task Name"
              placeholder="Task name"
              value={draftFilters.query}
              onChange={(event) => setDraftValue("query", event.target.value)}
            />
            <Select
              label="Priority"
              testId="selectTaskPriority_SM_Tasks"
              value={draftFilters.priorityId}
              onChange={(event) => setDraftValue("priorityId", event.target.value)}
              options={[{ value: "", label: "All priorities" }, ...toOptions(priorities)]}
            />
            <Select
              label="Assignee"
              testId="selectTaskAssignee_SM_Tasks"
              value={draftFilters.assigneeId}
              onChange={(event) => setDraftValue("assigneeId", event.target.value)}
              options={[{ value: "", label: "All assignees" }, ...userOptions(users)]}
            />

            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Task Date</h4>
              <Input
                id="txtTaskDueDate_SM_Tasks"
                label="Due Date"
                type="date"
                value={draftFilters.fromDueDate}
                onChange={(event) => setDraftValue("fromDueDate", event.target.value)}
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetDraft();
                setDrawerOpen(false);
              }}
              id="btnResetAdvancedFilters_Drawer"
            >
              Reset All
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                applyDraft();
                setDrawerOpen(false);
              }}
              id="btnApplyAdvancedFilters_Drawer"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 stroke-[2.2]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}

function TaskCard({
  task,
  onOpen,
  onChangeAssignee,
  onRemoveAssignee,
  onChangeStatus,
}: {
  task: TaskRow;
  onOpen: () => void;
  onChangeAssignee: () => void;
  onRemoveAssignee: () => void;
  onChangeStatus: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const assigneeName = getUserName(task.assignee) || "Unassigned";
  const locationName = task.location?.name || task.location?.place || "No location";
  const categoryName = task.category?.name || "N/A";
  const attachmentCount = task.taskAttachments?.length ?? 0;

  return (
    <article
      data-testid={`task-card-${task.taskUid}`}
      className="group relative flex min-h-[240px] min-w-0 flex-col overflow-visible rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <Badge className="max-w-[10rem] truncate px-2.5 py-1 text-xs" dot variant={getPriorityVariant(task.priority?.name)}>
            {task.priority?.name || "Normal"}
          </Badge>
          <div className="flex min-w-0 items-center gap-1.5 text-sm text-slate-700">
            <TaskCardIcon kind="location" />
            <span className="truncate" title={locationName}>{locationName}</span>
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            aria-label="Task actions"
            aria-expanded={menuOpen}
            className="flex h-8 w-8 items-center justify-center rounded-md border-0 bg-transparent text-xl font-bold leading-none text-slate-700 transition-colors hover:bg-slate-100"
            onClick={() => setMenuOpen((value) => !value)}
          >
            ...
          </button>

          {menuOpen ? (
            <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white py-2 text-sm shadow-xl">
              <TaskMenuButton label="View Details" onClick={() => { setMenuOpen(false); onOpen(); }} />
              <TaskMenuButton label="Change Assignee" onClick={() => { setMenuOpen(false); onChangeAssignee(); }} />
              <TaskMenuButton label="Remove Assignee" disabled={!task.assignee?.id} onClick={() => { setMenuOpen(false); onRemoveAssignee(); }} />
              <TaskMenuButton label="Change Status" onClick={() => { setMenuOpen(false); onChangeStatus(); }} />
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        className="mt-4 block max-w-full border-0 bg-transparent p-0 text-left text-xl font-bold leading-6 text-slate-950 transition-colors hover:text-indigo-700"
        onClick={onOpen}
        title={task.title || "Untitled task"}
        id={`btnTaskDetails_${task.taskUid}`}
      >
        <span className="line-clamp-2">{task.title || "Untitled task"}</span>
      </button>

      {task.description ? (
        <p className="mt-3 line-clamp-2 text-base leading-6 text-slate-700">
          {task.description}
        </p>
      ) : (
        <p className="mt-3 text-base leading-6 text-slate-400">No description added.</p>
      )}

      <div className="mt-4 flex min-w-0 items-center gap-2 text-base">
        <span className="font-bold text-slate-950">Category:</span>
        <span className="truncate text-slate-900" title={categoryName}>{categoryName}</span>
      </div>

      <div className="mt-auto flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 pt-5 text-sm text-slate-600">
        <TaskCardMetric icon="calendar" value={formatDate(task.dueDate)} />
        <TaskCardMetric icon="attachment" value={String(attachmentCount)} />
        <TaskCardMetric icon="user" value={assigneeName} muted={assigneeName === "Unassigned"} />
        <Badge className="ml-auto max-w-[9rem] truncate" variant={getTaskStatusVariant(task.status?.name)}>
          {task.status?.name || "Open"}
        </Badge>
      </div>
    </article>
  );
}

function TaskMenuButton({ label, onClick, disabled = false }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="block w-full border-0 bg-white px-5 py-3 text-left text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function TaskCardMetric({ icon, value, muted = false }: { icon: "calendar" | "attachment" | "user"; value: string; muted?: boolean }) {
  return (
    <span className={`flex min-w-0 items-center gap-1.5 ${muted ? "text-slate-400" : "text-slate-600"}`}>
      <TaskCardIcon kind={icon} />
      <span className="truncate" title={value}>{value}</span>
    </span>
  );
}

function TaskCardIcon({ kind }: { kind: "location" | "calendar" | "attachment" | "user" }) {
  const shared = "h-4 w-4 shrink-0 text-slate-500";

  if (kind === "location") {
    return (
      <svg className={shared} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 21s7-5.2 7-12A7 7 0 0 0 5 9c0 6.8 7 12 7 12z" />
        <circle cx="12" cy="9" r="2.4" />
      </svg>
    );
  }

  if (kind === "calendar") {
    return (
      <svg className={shared} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    );
  }

  if (kind === "attachment") {
    return (
      <svg className={shared} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M20 12.5 12.8 19.7a6 6 0 0 1-8.5-8.5l8.5-8.5a4 4 0 0 1 5.7 5.7l-8.7 8.7a2 2 0 0 1-2.8-2.8l7.5-7.5" />
      </svg>
    );
  }

  return (
    <svg className={shared} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function TaskCardActionDialog({
  state,
  lookups,
  loading,
  onClose,
  onSubmit,
}: {
  state: TaskCardActionState | null;
  lookups: ReturnType<typeof useTaskLookups>;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: TaskCardActionValues) => Promise<void>;
}) {
  const [values, setValues] = useState<TaskCardActionValues>({ assigneeId: "", statusId: "" });

  useEffect(() => {
    setValues({
      assigneeId: state?.task.assignee?.id ? String(state.task.assignee.id) : "",
      statusId: state?.task.status?.id ? String(state.task.status.id) : "",
    });
  }, [state?.task.assignee?.id, state?.task.status?.id, state?.task.taskUid, state?.type]);

  if (!state) return null;

  const isAssignee = state.type === "changeAssignee";
  const valid = isAssignee ? Boolean(values.assigneeId) : Boolean(values.statusId);

  return (
    <Dialog
      open={Boolean(state)}
      onClose={onClose}
      title={isAssignee ? "Change Assignee" : "Change Status"}
      size="md"
      testId="task-card-action-dialog"
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="font-semibold text-slate-900">{state.task.title || "Untitled task"}</div>
          {state.task.originData?.customerName ? (
            <div className="mt-1 text-sm text-slate-600">{state.task.originData.customerName}</div>
          ) : null}
        </div>

        {isAssignee ? (
          <Select
            label="Assignee"
            testId="selectTaskCardAssignee_SM_Tasks"
            value={values.assigneeId}
            onChange={(event) => setValues((prev) => ({ ...prev, assigneeId: event.target.value }))}
            options={[{ value: "", label: "Select assignee" }, ...userOptions(lookups.users)]}
          />
        ) : (
          <Select
            label="Status"
            testId="selectTaskCardStatus_SM_Tasks"
            value={values.statusId}
            onChange={(event) => setValues((prev) => ({ ...prev, statusId: event.target.value }))}
            options={[{ value: "", label: "Select status" }, ...toOptions(lookups.statuses)]}
          />
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" disabled={!valid} loading={loading} onClick={() => onSubmit(values)}>
            Save
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
