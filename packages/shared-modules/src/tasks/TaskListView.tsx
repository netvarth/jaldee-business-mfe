import { useMemo, useState } from "react";
import { Badge, Button, DataTable, Drawer, EmptyState, Input, SectionCard, Select, Tabs } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../context";
import {
  useTenantTasks,
  useTenantTasksCount,
  useUpdateTenantTaskProgress,
  useUpdateTenantTaskRecord,
  useUpdateTenantTaskStatus,
} from "./queries/tasks";
import type { TaskFormValues, TaskLookup, TaskRow, TaskScope, TaskUser } from "./types";
import { TaskFormDialog } from "./TaskDialogs";
import { useTaskLookups } from "./taskLookups";
import {
  buildTaskFilters,
  buildTaskPayload,
  clampProgress,
  completeTask,
  formatDate,
  getPriorityVariant,
  getTaskStatusVariant,
  getUserId,
  getUserName,
  isCompleteStatus,
  normalizeArray,
  normalizeCount,
  normalizeTenantTask,
  toOptions,
  userOptions,
} from "./taskUtils";

const PAGE_SIZE = 10;

export function TasksListView() {
  const { user, location, navigate } = useSharedModulesContext();
  const [scope, setScope] = useState<TaskScope>("all");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [statusId, setStatusId] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [fromDueDate, setFromDueDate] = useState("");
  const [toDueDate, setToDueDate] = useState("");
  const [fromCreatedDate, setFromCreatedDate] = useState("");
  const [toCreatedDate, setToCreatedDate] = useState("");
  const [originReferenceNo, setOriginReferenceNo] = useState("");
  const [originCustomerName, setOriginCustomerName] = useState("");
  const [taskDialog, setTaskDialog] = useState<{ mode: "edit"; task: TaskRow } | null>(null);

  const lookups = useTaskLookups();
  const filters = useMemo(
    () =>
      buildTaskFilters({
        page,
        scope,
        pageSize: PAGE_SIZE,
        searchText: query,
        statusId,
        priorityId,
        categoryId,
        assigneeId,
        fromDueDate,
        toDueDate,
        fromCreatedDate,
        toCreatedDate,
        originReferenceNo,
        originCustomerName,
        userId: getUserId(user),
        locationId: location?.id,
      }),
    [
      assigneeId,
      categoryId,
      fromCreatedDate,
      fromDueDate,
      location?.id,
      originCustomerName,
      originReferenceNo,
      page,
      priorityId,
      query,
      scope,
      statusId,
      toCreatedDate,
      toDueDate,
      user,
    ]
  );

  const taskQuery = useTenantTasks(filters);
  const countQuery = useTenantTasksCount(filters);
  const tasks = normalizeArray<unknown>(taskQuery.data).map(normalizeTenantTask);
  const total = normalizeCount(countQuery.data, tasks.length);

  const updateTask = useUpdateTenantTaskRecord();
  const updateStatus = useUpdateTenantTaskStatus();
  const updateProgress = useUpdateTenantTaskProgress();

  function openTask(taskUid: string) {
    if (navigate) {
      navigate(`/detail/${taskUid}`);
      return;
    }
    window.location.assign(`/tasks/detail/${encodeURIComponent(taskUid)}`);
  }

  const columns = useMemo<ColumnDef<TaskRow>[]>(
    () => [
      {
        key: "title",
        header: "Task",
        sortable: true,
        width: "28%",
        render: (row) => (
          <div className="min-w-0">
            <button
              type="button"
              className="border-0 bg-transparent p-0 text-left font-semibold text-slate-900 hover:text-indigo-700"
              onClick={() => openTask(row.taskUid)}
              id={`btnTaskDetails_${row.taskUid}`}
            >
              {row.title || "Untitled task"}
            </button>
            {row.description ? <div className="mt-1 line-clamp-2 text-xs text-slate-500">{row.description}</div> : null}
            {row.originData?.customerName ? <div className="mt-1 text-xs text-slate-500">{row.originData.customerName}</div> : null}
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        width: 130,
        render: (row) => <Badge variant={getTaskStatusVariant(row.status?.name)}>{row.status?.name || "Open"}</Badge>,
      },
      {
        key: "priority",
        header: "Priority",
        width: 120,
        render: (row) => <Badge dot variant={getPriorityVariant(row.priority?.name)}>{row.priority?.name || "Normal"}</Badge>,
      },
      {
        key: "assignee",
        header: "Assignee",
        width: 180,
        render: (row) => getUserName(row.assignee) || <span className="text-slate-400">Unassigned</span>,
      },
      {
        key: "dueDate",
        header: "Due Date",
        sortable: true,
        width: 130,
        render: (row) => formatDate(row.dueDate),
      },
      {
        key: "progress",
        header: "Progress",
        width: 110,
        render: (row) => <ProgressPill value={row.progress} />,
      },
      {
        key: "actions",
        header: "",
        align: "right",
        width: 230,
        render: (row) => (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => openTask(row.taskUid)} id={`btnViewTask_${row.taskUid}`}>
              View
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setTaskDialog({ mode: "edit", task: row })} id={`btnEditTask_${row.taskUid}`}>
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isCompleteStatus(row.status?.name)}
              onClick={() => completeTask(row, lookups.statuses, updateStatus, updateProgress)}
              id={`btnCompleteTask_${row.taskUid}`}
            >
              Complete
            </Button>
          </div>
        ),
      },
    ],
    [lookups.statuses, updateProgress, updateStatus]
  );

  function resetFilters() {
    setQuery("");
    setStatusId("");
    setPriorityId("");
    setCategoryId("");
    setAssigneeId("");
    setFromDueDate("");
    setToDueDate("");
    setFromCreatedDate("");
    setToCreatedDate("");
    setOriginReferenceNo("");
    setOriginCustomerName("");
    setPage(1);
  }

  async function submitTask(values: TaskFormValues, task?: TaskRow) {
    const payload = buildTaskPayload(values, location?.id);
    if (!task?.taskUid) return;
    await updateTask.mutateAsync({ uid: task.taskUid, data: payload });
    setTaskDialog(null);
  }

  return (
    <>
      <SectionCard
        padding={false}
        className="border-slate-200 shadow-sm"
      >
        <Tabs
          value={scope}
          onValueChange={(value) => {
            setScope(value as TaskScope);
            setPage(1);
          }}
          items={[
            { value: "all", label: "All Tasks", count: scope === "all" ? total : undefined },
            { value: "my", label: "My Tasks", count: scope === "my" ? total : undefined },
            { value: "automation", label: "Automation Tasks", count: scope === "automation" ? total : undefined },
          ]}
        />

        <TaskFiltersBar
          query={query}
          statusId={statusId}
          priorityId={priorityId}
          categoryId={categoryId}
          assigneeId={assigneeId}
          fromDueDate={fromDueDate}
          toDueDate={toDueDate}
          fromCreatedDate={fromCreatedDate}
          toCreatedDate={toCreatedDate}
          originReferenceNo={originReferenceNo}
          originCustomerName={originCustomerName}
          statuses={lookups.statuses}
          priorities={lookups.priorities}
          categories={lookups.categories}
          users={lookups.users}
          onQueryChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          onStatusChange={(value) => {
            setStatusId(value);
            setPage(1);
          }}
          onPriorityChange={(value) => {
            setPriorityId(value);
            setPage(1);
          }}
          onCategoryChange={(value) => {
            setCategoryId(value);
            setPage(1);
          }}
          onAssigneeChange={(value) => {
            setAssigneeId(value);
            setPage(1);
          }}
          onFromDueDateChange={(value) => {
            setFromDueDate(value);
            setPage(1);
          }}
          onToDueDateChange={(value) => {
            setToDueDate(value);
            setPage(1);
          }}
          onFromCreatedDateChange={(value) => {
            setFromCreatedDate(value);
            setPage(1);
          }}
          onToCreatedDateChange={(value) => {
            setToCreatedDate(value);
            setPage(1);
          }}
          onOriginReferenceNoChange={(value) => {
            setOriginReferenceNo(value);
            setPage(1);
          }}
          onOriginCustomerNameChange={(value) => {
            setOriginCustomerName(value);
            setPage(1);
          }}
          onReset={resetFilters}
        />

        <DataTable
          data={tasks}
          columns={columns}
          getRowId={(row) => row.taskUid}
          loading={taskQuery.isLoading || countQuery.isLoading}
          data-testid="tasks-table"
          emptyState={<EmptyState title="No tasks found" description="Adjust filters or create a task to start tracking work." />}
          pagination={{
            page,
            pageSize: PAGE_SIZE,
            total,
            mode: "server",
            onChange: setPage,
          }}
        />
      </SectionCard>

      <TaskFormDialog
        mode="edit"
        task={taskDialog?.task}
        open={Boolean(taskDialog)}
        onClose={() => setTaskDialog(null)}
        onSubmit={submitTask}
        loading={updateTask.isPending}
        lookups={lookups}
        defaultLocationId={location?.id ? String(location.id) : ""}
      />
    </>
  );
}

function TaskFiltersBar({
  query,
  statusId,
  priorityId,
  categoryId,
  assigneeId,
  fromDueDate,
  toDueDate,
  fromCreatedDate,
  toCreatedDate,
  originReferenceNo,
  originCustomerName,
  statuses,
  priorities,
  categories,
  users,
  onQueryChange,
  onStatusChange,
  onPriorityChange,
  onCategoryChange,
  onAssigneeChange,
  onFromDueDateChange,
  onToDueDateChange,
  onFromCreatedDateChange,
  onToCreatedDateChange,
  onOriginReferenceNoChange,
  onOriginCustomerNameChange,
  onReset,
}: {
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
  statuses: TaskLookup[];
  priorities: TaskLookup[];
  categories: TaskLookup[];
  users: TaskUser[];
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  onFromDueDateChange: (value: string) => void;
  onToDueDateChange: (value: string) => void;
  onFromCreatedDateChange: (value: string) => void;
  onToCreatedDateChange: (value: string) => void;
  onOriginReferenceNoChange: (value: string) => void;
  onOriginCustomerNameChange: (value: string) => void;
  onReset: () => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeAdvancedFiltersCount = [
    priorityId,
    assigneeId,
    fromDueDate,
    toDueDate,
    fromCreatedDate,
    toCreatedDate,
    originReferenceNo,
    originCustomerName,
  ].filter(Boolean).length;

  const hasAnyFilterActive = Boolean(
    query ||
      statusId ||
      priorityId ||
      categoryId ||
      assigneeId ||
      fromDueDate ||
      toDueDate ||
      fromCreatedDate ||
      toCreatedDate ||
      originReferenceNo ||
      originCustomerName
  );

  return (
    <>
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 p-4 bg-slate-50/50">
        <div className="min-w-[240px] flex-1">
          <Input
            id="txtTaskSearch_SM_Tasks"
            label="Search"
            placeholder="Task name, reference, customer"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            label="Status"
            testId="selectTaskStatus_SM_Tasks"
            value={statusId}
            onChange={(event) => onStatusChange(event.target.value)}
            options={[{ value: "", label: "All statuses" }, ...toOptions(statuses)]}
          />
        </div>
        <div className="w-48">
          <Select
            label="Category"
            testId="selectTaskCategory_SM_Tasks"
            value={categoryId}
            onChange={(event) => onCategoryChange(event.target.value)}
            options={[{ value: "", label: "All categories" }, ...toOptions(categories)]}
          />
        </div>
        <Button
          type="button"
          variant={activeAdvancedFiltersCount > 0 ? "primary" : "outline"}
          className="flex items-center gap-2"
          onClick={() => setDrawerOpen(true)}
          id="btnTaskDrawerFilters_SM_Tasks"
        >
          <span>More Filters</span>
          {activeAdvancedFiltersCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-indigo-600">
              {activeAdvancedFiltersCount}
            </span>
          )}
        </Button>
        {hasAnyFilterActive && (
          <Button
            type="button"
            variant="outline"
            className="text-slate-600 hover:text-slate-900 border-dashed border-slate-300 hover:border-slate-400"
            onClick={onReset}
            id="btnResetTaskFilters_SM_Tasks"
          >
            Reset
          </Button>
        )}
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Advanced Filters" size="sm">
        <div className="flex h-full flex-col justify-between">
          <div className="space-y-5 flex-1">
            <Select
              label="Priority"
              testId="selectTaskPriority_SM_Tasks"
              value={priorityId}
              onChange={(event) => onPriorityChange(event.target.value)}
              options={[{ value: "", label: "All priorities" }, ...toOptions(priorities)]}
            />
            <Select
              label="Assignee"
              testId="selectTaskAssignee_SM_Tasks"
              value={assigneeId}
              onChange={(event) => onAssigneeChange(event.target.value)}
              options={[{ value: "", label: "All assignees" }, ...userOptions(users)]}
            />

            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Due Date Range</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input id="txtTaskDueFrom_SM_Tasks" label="From" type="date" value={fromDueDate} onChange={(event) => onFromDueDateChange(event.target.value)} />
                <Input id="txtTaskDueTo_SM_Tasks" label="To" type="date" value={toDueDate} onChange={(event) => onToDueDateChange(event.target.value)} />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Created Date Range</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input id="txtTaskCreatedFrom_SM_Tasks" label="From" type="date" value={fromCreatedDate} onChange={(event) => onFromCreatedDateChange(event.target.value)} />
                <Input id="txtTaskCreatedTo_SM_Tasks" label="To" type="date" value={toCreatedDate} onChange={(event) => onToCreatedDateChange(event.target.value)} />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Task Details</h4>
              <Input
                id="txtTaskReference_SM_Tasks"
                label="Reference No."
                placeholder="Reference number"
                value={originReferenceNo}
                onChange={(event) => onOriginReferenceNoChange(event.target.value)}
              />
              <Input
                id="txtTaskCustomer_SM_Tasks"
                label="Customer"
                placeholder="Customer name"
                value={originCustomerName}
                onChange={(event) => onOriginCustomerNameChange(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onReset();
                setDrawerOpen(false);
              }}
              id="btnResetAdvancedFilters_Drawer"
            >
              Reset All
            </Button>
            <Button type="button" variant="primary" onClick={() => setDrawerOpen(false)} id="btnApplyAdvancedFilters_Drawer">
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
}

function ProgressPill({ value }: { value?: string | number }) {
  const progress = clampProgress(value);
  return (
    <div className="min-w-[82px]">
      <div className="h-1.5 rounded-full bg-slate-100">
        <div className="h-1.5 rounded-full bg-indigo-600" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-1 text-xs text-slate-500">{progress}%</div>
    </div>
  );
}
