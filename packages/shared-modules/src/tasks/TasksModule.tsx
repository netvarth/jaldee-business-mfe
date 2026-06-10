import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogFooter,
  EmptyState,
  FileUpload,
  Input,
  PageHeader,
  SectionCard,
  Select,
  Tabs,
} from "@jaldee/design-system";
import { useModuleAccess } from "../useModuleAccess";
import { useSharedModulesContext } from "../context";
import {
  useCreateTenantTask,
  useDeleteTenantTask,
  useMarkTaskFileUploadComplete,
  useRemoveTenantTaskAssignee,
  useRequestTaskFileUploadUrls,
  useSaveTenantTaskAttachments,
  useTenantTaskByUid,
  useTenantTasks,
  useUpdateTenantTaskAssignee,
  useUpdateTenantTaskPriority,
  useUpdateTenantTaskProgress,
  useUpdateTenantTaskRecord,
  useUpdateTenantTaskStatus,
} from "./queries/tasks";
import type {
  TaskFormValues,
  TaskAttachment,
  TaskDashboardView,
  TaskLocation,
  TaskLookup,
  TaskRow,
  TaskUser,
  TasksViewKey,
} from "./types";
import { TaskTemplatesView } from "./TaskTemplates";
import { TaskSettingsView } from "./TaskSettings";
import { TaskDetailContent, TaskDetailDialog, TaskFormDialog } from "./TaskDialogs";
import { TasksListView } from "./TaskListView";
import { TaskPaginationFooter } from "./TaskPaginationFooter";
import { CrmLeadStageTasksView, TasksCalendarView } from "./TaskCalendarViews";
import { useTaskLookups } from "./taskLookups";
import type { TaskLookupData } from "./taskLookups";
import {
  buildTaskFilters,
  buildTaskPayload,
  extractErrorMessage,
  formatDate,
  getPriorityVariant,
  getUserId,
  getUserName,
  normalizeArray,
  normalizeCount,
  normalizeData,
  normalizeTenantTask,
  normalizeView,
  splitLines,
  toDateInputValue,
  toOptions,
  userOptions,
} from "./taskUtils";

export { buildTaskPayload } from "./taskUtils";
export { TaskFormDialog } from "./TaskDialogs";
export { useTaskLookups } from "./taskLookups";
export type { TaskLookupData } from "./taskLookups";

const TASK_BOARD_PAGE_SIZE = 9;
const TASK_BUCKET_COLORS = ["#FFB6C1", "#FFD700", "#90EE90", "#87CEFA", "#FFA07A", "#DDA0DD", "#20B2AA", "#FF69B4"];
const TASK_UPLOAD_ACCEPT = ".jpg,.jpeg,.png,.bmp,.jfif,.pdf,.mp4,.mpeg,.mp3,.ogg,.xls,.xlsx,.doc,.docx";
const EMPTY_FORM: TaskFormValues = {
  title: "",
  description: "",
  dueDate: "",
  priorityId: "",
  categoryId: "",
  typeId: "",
  statusId: "",
  assigneeId: "",
  locationId: "",
};

type TaskAdvancedFilters = {
  query?: string;
  fromDueDate?: string;
  toDueDate?: string;
  fromCreatedDate?: string;
  toCreatedDate?: string;
  priorityId?: string;
  assigneeId?: string;
  statusId?: string;
  categoryId?: string;
  originReferenceNo?: string;
  originCustomerName?: string;
};

type TaskActionType = "viewDetails" | "addAssignee" | "changeAssignee" | "changeStatus" | "addDuedate" | "changeDuedate";
type TaskActionDialogState = { type: TaskActionType; task: TaskRow };
type TaskActionValues = { assigneeId: string; statusId: string; dueDate: string };

export function TasksModule() {
  const access = useModuleAccess("tasks");

  if (!access.allowed) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState
          title="Tasks unavailable"
          description={
            access.reason === "location-required"
              ? "Select a location to work with location-scoped tasks."
              : "The shared tasks module is not available in the current shell context."
          }
        />
      </SectionCard>
    );
  }

  return <TasksWorkspace />;
}

function TasksWorkspace() {
  const { routeParams, navigate, location } = useSharedModulesContext();
  const requestedView = normalizeView(routeParams?.view);
  const [fallbackView, setFallbackView] = useState<TasksViewKey>(requestedView);
  const view = navigate ? requestedView : fallbackView;
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const lookups = useTaskLookups();
  const createTask = useCreateTenantTask();

  // Sub-tab within Overview (Tasks | Calendar)
  const requestedSubTab = routeParams?.subview ?? null;
  const [fallbackSubTab, setFallbackSubTab] = useState<"list" | "calendar">(
    requestedSubTab === "calendar" ? "calendar" : "list"
  );
  const overviewTab: "list" | "calendar" =
    navigate
      ? requestedSubTab === "calendar"
        ? "calendar"
        : "list"
      : fallbackSubTab;

  function changeView(nextView: TasksViewKey) {
    if (navigate) {
      navigate(`/${nextView}`);
      return;
    }
    setFallbackView(nextView);
  }

  function changeOverviewTab(tab: "list" | "calendar") {
    if (navigate) {
      navigate(`/overview/${tab}`);
      return;
    }
    setFallbackSubTab(tab);
  }

  async function submitCreatedTask(values: TaskFormValues) {
    await createTask.mutateAsync(buildTaskPayload(values, location?.id));
    setCreateTaskOpen(false);
  }

  return (
    <div data-testid="tasks-module" data-active-view={view} className="space-y-4">
      {view !== "detail" ? (
        <PageHeader
          title="Tasks"
          subtitle="Track assigned, automated, and product-linked work across locations."
          actions={
            view === "overview" ? (
              <Button type="button" variant="primary" onClick={() => setCreateTaskOpen(true)} id="btnCreateTask_SM_Tasks">
                Create Task
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {/* Overview — contains Tasks list + Calendar sub-tabs */}
      {view === "overview" && (
        <>
          <Tabs
            value={overviewTab}
            onValueChange={(v) => changeOverviewTab(v as "list" | "calendar")}
            className="border-b-0"
            items={[
              { value: "list", label: "Tasks" },
              { value: "calendar", label: "Calendar" },
            ]}
          />
          {overviewTab === "list" && <TasksListView />}
          {overviewTab === "calendar" && <TasksCalendarView />}
        </>
      )}

      {view === "templates" && <TaskTemplatesView />}
      {view === "settings" && <TaskSettingsView />}
      {view === "crm-stage" && <CrmLeadStageTasksView />}
      {view === "detail" && <TaskDetailPage />}

      <TaskFormDialog
        mode="create"
        open={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        onSubmit={submitCreatedTask}
        loading={createTask.isPending}
        lookups={lookups}
        defaultLocationId={location?.id ? String(location.id) : ""}
      />
    </div>
  );
}



function TaskDetailPage() {
  const { routeParams, navigate, location } = useSharedModulesContext();
  const taskUid = routeParams?.recordId || routeParams?.subview || "";
  const lookups = useTaskLookups();
  const detailQuery = useTenantTaskByUid(taskUid);
  const rawDetail = normalizeData<unknown>(detailQuery.data);
  const task = rawDetail ? normalizeTenantTask(rawDetail) : null;
  const [taskDialog, setTaskDialog] = useState<{ mode: "edit"; task: TaskRow } | null>(null);
  const updateTask = useUpdateTenantTaskRecord();
  const deleteTask = useDeleteTenantTask();
  const updateAssignee = useUpdateTenantTaskAssignee();
  const removeAssignee = useRemoveTenantTaskAssignee();
  const updateStatus = useUpdateTenantTaskStatus();
  const updatePriority = useUpdateTenantTaskPriority();
  const updateProgress = useUpdateTenantTaskProgress();

  function goBack() {
    if (navigate) {
      navigate("/");
      return;
    }
    window.location.assign("/tasks");
  }

  async function submitTask(values: TaskFormValues, currentTask?: TaskRow) {
    if (!currentTask?.taskUid) return;
    await updateTask.mutateAsync({ uid: currentTask.taskUid, data: buildTaskPayload(values, location?.id) });
    setTaskDialog(null);
  }

  async function removeTask(currentTask: TaskRow) {
    if (!window.confirm("Delete this task?")) return;
    await deleteTask.mutateAsync(currentTask.taskUid);
    goBack();
  }

  if (!taskUid) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState title="Task not selected" description="Open a task from the task list to view its details." />
      </SectionCard>
    );
  }

  if (detailQuery.isLoading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading task...</div>;
  }

  if (!task) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState title="Task not found" description="The selected task could not be loaded." />
      </SectionCard>
    );
  }

  return (
    <>
      <PageHeader
        title={task.title || "Task Details"}
        subtitle={task.originData?.referenceNumber ? `Reference #${task.originData.referenceNumber}` : "Task details and activity"}
        back={{ label: "Back to Tasks", href: "/tasks" }}
        onNavigate={goBack}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setTaskDialog({ mode: "edit", task })} id="btnEditTask_SM_Detail">
              Edit
            </Button>
            <Button type="button" variant="danger" disabled={deleteTask.isPending} onClick={() => removeTask(task)} id="btnDeleteTask_SM_Detail">
              Delete
            </Button>
          </>
        }
      />
      <SectionCard className="border-slate-200 shadow-sm">
        <TaskDetailContent
          task={task}
          lookups={lookups}
          hideInlineActions
          updating={
            updateAssignee.isPending ||
            removeAssignee.isPending ||
            updateStatus.isPending ||
            updatePriority.isPending ||
            updateProgress.isPending ||
            updateTask.isPending ||
            deleteTask.isPending
          }
          onEdit={(selectedTask) => setTaskDialog({ mode: "edit", task: selectedTask })}
          onDelete={removeTask}
          onAssigneeChange={(selectedTask, assigneeId) =>
            assigneeId ? updateAssignee.mutateAsync({ uid: selectedTask.taskUid, assigneeId }) : removeAssignee.mutateAsync(selectedTask.taskUid)
          }
          onStatusChange={(selectedTask, nextStatusId) => updateStatus.mutateAsync({ uid: selectedTask.taskUid, statusId: nextStatusId })}
          onPriorityChange={(selectedTask, nextPriorityId) => updatePriority.mutateAsync({ uid: selectedTask.taskUid, priorityId: nextPriorityId })}
          onProgressChange={(selectedTask, nextProgress) => updateProgress.mutateAsync({ uid: selectedTask.taskUid, progress: nextProgress })}
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

function TasksBoardDashboardView() {
  const { user, navigate } = useSharedModulesContext();
  const [dashboardView, setDashboardView] = useState<TaskDashboardView>("status");
  const [selectedBucket, setSelectedBucket] = useState<TaskLookup | null>(null);
  const [taskDialog, setTaskDialog] = useState<{ mode: "create"; defaults?: Partial<TaskFormValues> } | null>(null);
  const lookups = useTaskLookups();
  const createTask = useCreateTenantTask();
  const buckets = dashboardView === "status" ? lookups.statuses : lookups.categories;
  const userName = getUserName(user as TaskUser) || (user as any)?.userName || "there";

  return (
    <>
      <PageHeader
        title={`Hey there, ${userName}`}
        subtitle="Welcome back, we're happy to have you here."
        actions={
          <Button type="button" variant="primary" onClick={() => setTaskDialog({ mode: "create" })} id="btnCreateTask_TB_DB">
            Create Task
          </Button>
        }
      />

      <SectionCard padding={false} className="border-slate-200 shadow-sm">
        <Tabs
          value="allTasks"
          onValueChange={() => undefined}
          items={[
            { value: "allTasks", label: "All Tasks" },
            { value: "calendarTasks", label: "Calendar" },
          ]}
        />

        {!selectedBucket ? (
          <div className="space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-md border border-slate-200 bg-white p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={dashboardView === "status" ? "primary" : "ghost"}
                  onClick={() => setDashboardView("status")}
                  id="btnTaskStatusView_TB_DB"
                >
                  Status
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={dashboardView === "category" ? "primary" : "ghost"}
                  onClick={() => setDashboardView("category")}
                  id="btnTaskCategoryView_TB_DB"
                >
                  Category
                </Button>
              </div>
              <div className="text-sm text-slate-700">
                <span className="font-semibold">Viewing as:</span> {dashboardView === "status" ? "Status" : "Category"}
              </div>
            </div>

            {buckets.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {buckets.map((bucket, index) => (
                  <button
                    key={String(bucket.id)}
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow"
                    onClick={() => setSelectedBucket(bucket)}
                    id={`divSelectCard${index}_TB_DB`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: TASK_BUCKET_COLORS[index % TASK_BUCKET_COLORS.length] }} />
                      <span className="font-semibold text-slate-900">{bucket.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState title="No task groups found" description="Create task statuses or categories to organize the task board." />
            )}
          </div>
        ) : (
          <TaskBoardBucketList
            bucket={selectedBucket}
            dashboardView={dashboardView}
            onBack={() => setSelectedBucket(null)}
            onCreateTask={(defaults) => setTaskDialog({ mode: "create", defaults })}
          />
        )}
      </SectionCard>

      <TaskFormDialog
        mode="create"
        open={Boolean(taskDialog)}
        onClose={() => setTaskDialog(null)}
        onSubmit={async (values) => {
          await createTask.mutateAsync(buildTaskPayload(values, undefined));
          setTaskDialog(null);
        }}
        loading={createTask.isPending}
        lookups={lookups}
        defaultLocationId=""
        defaults={taskDialog?.defaults}
      />
    </>
  );
}

function TaskBoardBucketList({
  bucket,
  dashboardView,
  onBack,
  onCreateTask,
}: {
  bucket: TaskLookup;
  dashboardView: TaskDashboardView;
  onBack: () => void;
  onCreateTask: (defaults: Partial<TaskFormValues>) => void;
}) {
  const { user, location } = useSharedModulesContext();
  const [page, setPage] = useState(1);
  const [selectedTaskUid, setSelectedTaskUid] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<TaskActionDialogState | null>(null);
  const [attachmentTask, setAttachmentTask] = useState<TaskRow | null>(null);
  const [filters, setFilters] = useState<TaskAdvancedFilters>({});
  const lookups = useTaskLookups();
  const apiFilters = useMemo(
    () =>
      buildTaskFilters({
        page,
        scope: "all",
        pageSize: TASK_BOARD_PAGE_SIZE,
        searchText: filters.query,
        userId: getUserId(user),
        locationId: location?.id,
        statusId: dashboardView === "status" ? String(bucket.id) : filters.statusId,
        categoryId: dashboardView === "category" ? String(bucket.id) : filters.categoryId,
        priorityId: filters.priorityId,
        assigneeId: filters.assigneeId,
        fromDueDate: filters.fromDueDate,
        toDueDate: filters.toDueDate,
        fromCreatedDate: filters.fromCreatedDate,
        toCreatedDate: filters.toCreatedDate,
        originReferenceNo: filters.originReferenceNo,
        originCustomerName: filters.originCustomerName,
      }),
    [bucket.id, dashboardView, filters, location?.id, page, user]
  );

  const tasksQuery = useTenantTasks(apiFilters);
  const detailQuery = useTenantTaskByUid(selectedTaskUid || "");
  const updateTask = useUpdateTenantTaskRecord();
  const removeAssignee = useRemoveTenantTaskAssignee();
  const updateAssignee = useUpdateTenantTaskAssignee();
  const updateStatus = useUpdateTenantTaskStatus();
  const tasks = normalizeArray<unknown>(tasksQuery.data).map(normalizeTenantTask);
  const total = normalizeCount(tasksQuery.data, tasks.length);
  const rawDetail = normalizeData<unknown>(detailQuery.data);
  const selectedTask = selectedTaskUid
    ? (rawDetail ? normalizeTenantTask(rawDetail) : null) ?? tasks.find((task) => task.taskUid === selectedTaskUid) ?? null
    : null;

  async function submitAction(values: TaskActionValues) {
    const task = actionDialog?.task;
    if (!task) return;

    if (actionDialog.type === "addAssignee" || actionDialog.type === "changeAssignee") {
      await updateAssignee.mutateAsync({ uid: task.taskUid, assigneeId: values.assigneeId });
    } else if (actionDialog.type === "changeStatus") {
      await updateStatus.mutateAsync({ uid: task.taskUid, statusId: values.statusId });
    } else if (actionDialog.type === "addDuedate" || actionDialog.type === "changeDuedate") {
      await updateTask.mutateAsync({ uid: task.taskUid, data: buildDueDatePayload(task, values.dueDate) });
    }

    setActionDialog(null);
  }

  async function removeTaskAssignee(task: TaskRow) {
    if (!window.confirm("Are you sure you want to remove assignee for this task?")) return;
    await removeAssignee.mutateAsync(task.taskUid);
  }

  return (
    <>
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onBack} id="icoGoBack_TB_TL">
              Back
            </Button>
            <div className="text-lg font-semibold text-slate-900">
              {bucket.name} {dashboardView} Tasks ({total})
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={() =>
                onCreateTask({
                  statusId: dashboardView === "status" ? String(bucket.id) : "",
                  categoryId: dashboardView === "category" ? String(bucket.id) : "",
                })
              }
              id="divCreateTask_TB_TL"
            >
              Add Task
            </Button>
          </div>
        </div>
        <TaskAdvancedFiltersPanel
          filters={filters}
          dashboardView={dashboardView}
          lookups={lookups}
          onChange={(nextFilters) => {
            setFilters(nextFilters);
            setPage(1);
          }}
        />
      </div>

      {tasks.length ? (
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task) => (
            <TaskBoardCard
              key={task.taskUid}
              task={task}
              dashboardView={dashboardView}
              onView={() => setSelectedTaskUid(task.taskUid)}
              onAttachment={() => setAttachmentTask(task)}
              onAction={(type) => setActionDialog({ type, task })}
              onRemoveAssignee={() => removeTaskAssignee(task)}
            />
          ))}
        </div>
      ) : tasksQuery.isLoading ? (
        <div className="p-4 text-sm text-slate-500">Loading tasks...</div>
      ) : (
        <EmptyState title="No Tasks Found" description="Adjust filters or add a task in this group." />
      )}

      <TaskPaginationFooter
        page={page}
        pageSize={TASK_BOARD_PAGE_SIZE}
        total={total}
        onChange={setPage}
        className="px-4 md:px-4"
        testId="tasks-board-card-pagination"
      />

      <TaskDetailDialog task={selectedTask} onClose={() => setSelectedTaskUid(null)} lookups={lookups} readOnly />
      <TaskActionDialog
        state={actionDialog}
        lookups={lookups}
        loading={updateAssignee.isPending || updateStatus.isPending || updateTask.isPending}
        onClose={() => setActionDialog(null)}
        onSubmit={submitAction}
      />
      <TaskAttachmentsDialog task={attachmentTask} onClose={() => setAttachmentTask(null)} />
    </>
  );
}

function TaskBoardCard({
  task,
  dashboardView,
  onView,
  onAttachment,
  onAction,
  onRemoveAssignee,
}: {
  task: TaskRow;
  dashboardView: TaskDashboardView;
  onView: () => void;
  onAttachment: () => void;
  onAction: (type: TaskActionType) => void;
  onRemoveAssignee: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <article className="flex min-h-[260px] flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <Badge dot variant={getPriorityVariant(task.priority?.name)}>{task.priority?.name || "Normal"}</Badge>
        <div className="relative">
          <Button type="button" variant="ghost" size="sm" onClick={() => setMenuOpen((value) => !value)} aria-label="Task actions">
            More
          </Button>
          {menuOpen ? (
            <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg">
              <TaskMenuButton label="View Details" onClick={() => { setMenuOpen(false); onView(); }} />
              {!task.assignee?.id ? (
                <TaskMenuButton label="Add Assignee" onClick={() => { setMenuOpen(false); onAction("addAssignee"); }} />
              ) : (
                <>
                  <TaskMenuButton label="Change Assignee" onClick={() => { setMenuOpen(false); onAction("changeAssignee"); }} />
                  <TaskMenuButton label="Remove Assignee" onClick={() => { setMenuOpen(false); onRemoveAssignee(); }} />
                </>
              )}
              <TaskMenuButton label="Change Status" onClick={() => { setMenuOpen(false); onAction("changeStatus"); }} />
              <TaskMenuButton label={task.dueDate ? "Change Due Date" : "Add Due Date"} onClick={() => { setMenuOpen(false); onAction(task.dueDate ? "changeDuedate" : "addDuedate"); }} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-2 text-sm text-slate-500">{task.location?.name || task.location?.place || "-"}</div>
      <button type="button" className="mt-2 border-0 bg-transparent p-0 text-left font-semibold text-slate-900 hover:text-indigo-700" onClick={onView}>
        {task.title || "Untitled task"}
      </button>
      {task.description ? <p className="mt-2 line-clamp-3 text-sm text-slate-600">{task.description}</p> : null}

      <div className="mt-3 grid gap-2 text-sm text-slate-700">
        {task.originData?.customerName ? <Info label="Clinic" value={task.originData.customerName} /> : null}
        {task.originData?.referenceNumber ? <Info label="Ref No" value={`#${task.originData.referenceNumber}`} /> : null}
        <Info label={dashboardView === "category" ? "Status" : "Category"} value={dashboardView === "category" ? task.status?.name || "-" : task.category?.name || "-"} />
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4 text-sm text-slate-500">
        <span>{formatDate(task.dueDate)}</span>
        <button type="button" className="border-0 bg-transparent p-0 text-sm text-indigo-700 hover:text-indigo-900" onClick={onAttachment} id="divViewAttach_TB_TL">
          Attachments ({task.taskAttachments?.length ?? 0})
        </button>
        {task.assignee?.name ? <span>{task.assignee.name}</span> : null}
      </div>
    </article>
  );
}

function TaskMenuButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="block w-full border-0 bg-white px-3 py-2 text-left text-slate-700 hover:bg-slate-50" onClick={onClick}>
      {label}
    </button>
  );
}

function TaskAdvancedFiltersPanel({
  filters,
  dashboardView,
  lookups,
  onChange,
}: {
  filters: TaskAdvancedFilters;
  dashboardView: TaskDashboardView;
  lookups: TaskLookupData;
  onChange: (filters: TaskAdvancedFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<TaskAdvancedFilters>(filters);
  const activeFilterCount = Object.values(draftFilters).filter(Boolean).length;

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  function setValue(key: keyof TaskAdvancedFilters, value: string) {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  }

  function resetFilters() {
    setDraftFilters({});
    onChange({});
  }

  return (
    <div className="mt-3">
      <div className="flex justify-end">
        <Button type="button" variant={activeFilterCount ? "primary" : "outline"} size="sm" onClick={() => setOpen((value) => !value)} id="btnTaskFilters_TB_TL">
          Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
        </Button>
      </div>
      {open ? (
        <div className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
          <Input label="Task Name" id="txtTaskName_TB_Filter" value={draftFilters.query || ""} onChange={(event) => setValue("query", event.target.value)} />
          <Input label="Due Date" id="txtTaskDueFrom_TB_Filter" type="date" value={draftFilters.fromDueDate || ""} onChange={(event) => setValue("fromDueDate", event.target.value)} />
          <Select label="Priority" testId="selectTaskPriority_TB_Filter" value={draftFilters.priorityId || ""} onChange={(event) => setValue("priorityId", event.target.value)} options={[{ value: "", label: "All priorities" }, ...toOptions(lookups.priorities)]} />
          <Select label="Assignee" testId="selectTaskAssignee_TB_Filter" value={draftFilters.assigneeId || ""} onChange={(event) => setValue("assigneeId", event.target.value)} options={[{ value: "", label: "All assignees" }, ...userOptions(lookups.users)]} />
          {dashboardView === "category" ? (
            <Select label="Status" testId="selectTaskStatus_TB_Filter" value={draftFilters.statusId || ""} onChange={(event) => setValue("statusId", event.target.value)} options={[{ value: "", label: "All statuses" }, ...toOptions(lookups.statuses)]} />
          ) : (
            <Select label="Category" testId="selectTaskCategory_TB_Filter" value={draftFilters.categoryId || ""} onChange={(event) => setValue("categoryId", event.target.value)} options={[{ value: "", label: "All categories" }, ...toOptions(lookups.categories)]} />
          )}
          <div className="flex items-end justify-end gap-2 md:col-span-3">
            <Button type="button" variant="outline" onClick={resetFilters} id="btnResetAdvancedTaskFilters_TB_Filter">
              Reset
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                onChange(draftFilters);
                setOpen(false);
              }}
              id="btnApplyAdvancedTaskFilters_TB_Filter"
            >
              Apply
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TaskActionDialog({
  state,
  lookups,
  loading,
  onClose,
  onSubmit,
}: {
  state: TaskActionDialogState | null;
  lookups: TaskLookupData;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: TaskActionValues) => Promise<void>;
}) {
  const [values, setValues] = useState<TaskActionValues>({
    assigneeId: state?.task.assignee?.id ? String(state.task.assignee.id) : "",
    statusId: "",
    dueDate: toDateInputValue(state?.task.dueDate),
  });

  useEffect(() => {
    setValues({
      assigneeId: state?.task.assignee?.id ? String(state.task.assignee.id) : "",
      statusId: "",
      dueDate: toDateInputValue(state?.task.dueDate),
    });
  }, [state?.task.assignee?.id, state?.task.dueDate, state?.task.taskUid, state?.type]);

  if (!state) return null;

  const requiresAssignee = state.type === "addAssignee" || state.type === "changeAssignee";
  const requiresStatus = state.type === "changeStatus";
  const requiresDueDate = state.type === "addDuedate" || state.type === "changeDuedate";
  const valid = requiresAssignee ? Boolean(values.assigneeId) : requiresStatus ? Boolean(values.statusId) : requiresDueDate ? Boolean(values.dueDate) : true;

  return (
    <Dialog open={Boolean(state)} onClose={onClose} title={getActionTitle(state)} size="md" testId="task-action-dialog">
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="font-semibold text-slate-900">{state.task.title}</div>
          {state.task.originData?.customerName ? <div className="mt-1 text-sm text-slate-600">Clinic: {state.task.originData.customerName}</div> : null}
          {state.task.originData?.referenceNumber ? <div className="mt-1 text-sm text-slate-600">Ref No: #{state.task.originData.referenceNumber}</div> : null}
        </div>

        {requiresAssignee ? (
          <Select
            label="Assignee"
            testId="selectTaskActionAssignee_TB"
            value={values.assigneeId}
            onChange={(event) => setValues((prev) => ({ ...prev, assigneeId: event.target.value }))}
            options={[{ value: "", label: "Select assignee" }, ...userOptions(lookups.users)]}
          />
        ) : null}

        {requiresStatus ? (
          <Select
            label="Status"
            testId="selectTaskActionStatus_TB"
            value={values.statusId}
            onChange={(event) => setValues((prev) => ({ ...prev, statusId: event.target.value }))}
            options={[
              { value: "", label: "Select status" },
              ...toOptions(lookups.statuses.filter((status) => String(status.id) !== String(state.task.status?.id))),
            ]}
          />
        ) : null}

        {requiresDueDate ? (
          <Input
            label="Due Date"
            id="txtTaskActionDueDate_TB"
            type="date"
            value={values.dueDate}
            onChange={(event) => setValues((prev) => ({ ...prev, dueDate: event.target.value }))}
          />
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" disabled={!valid} loading={loading} onClick={() => onSubmit(values)} id="btnSaveTaskAction_TB">
            Save
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}

function TaskAttachmentsDialog({ task, onClose }: { task: TaskRow | null; onClose: () => void }) {
  const { account, api } = useSharedModulesContext();
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const requestUploadUrls = useRequestTaskFileUploadUrls();
  const markUploadComplete = useMarkTaskFileUploadComplete();
  const saveAttachments = useSaveTenantTaskAttachments();

  if (!task) return null;

  async function save() {
    if (!task) return;
    setUploadError(null);
    try {
      const uploaded = pendingFiles.length ? await uploadTaskAttachments(String((account as any)?.id ?? ""), pendingFiles, api, requestUploadUrls.mutateAsync, markUploadComplete.mutateAsync) : [];
      await saveAttachments.mutateAsync({
        uid: task.taskUid,
        data: { taskAttachments: [...(task.taskAttachments ?? []), ...uploaded].map((item, index) => ({ ...item, order: index })) },
      });
      setPendingFiles([]);
      onClose();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Unable to save attachments right now.");
    }
  }

  return (
    <Dialog open={Boolean(task)} onClose={onClose} title="Task Attachments" size="lg" testId="task-attachments-dialog">
      <div className="space-y-4">
        {uploadError ? <Alert variant="danger">{uploadError}</Alert> : null}
        {task.taskAttachments?.length ? (
          <div className="space-y-2">
            {task.taskAttachments.map((attachment, index) => (
              <div key={`${attachment.driveId ?? attachment.fileName ?? index}`} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{attachment.fileName || `Attachment ${index + 1}`}</span>
                {resolveAttachmentUrl(attachment) ? (
                  <a className="text-indigo-700 hover:text-indigo-900" href={resolveAttachmentUrl(attachment) || undefined} target="_blank" rel="noreferrer">
                    Open
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No attachments" description="Upload files and save them to this task." />
        )}

        <FileUpload
          label="Add Attachments"
          accept={TASK_UPLOAD_ACCEPT}
          multiple
          maxSize={10 * 1024 * 1024}
          onUpload={(files) => {
            setPendingFiles(files);
            setUploadError(null);
          }}
        />
        {pendingFiles.length ? <div className="text-sm text-slate-600">{pendingFiles.length} file(s) ready to save.</div> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" loading={requestUploadUrls.isPending || markUploadComplete.isPending || saveAttachments.isPending} onClick={save} id="btnSaveTaskAttachments_TB">
            Save Attachments
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}


