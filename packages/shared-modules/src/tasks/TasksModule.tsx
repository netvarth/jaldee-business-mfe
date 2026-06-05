import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogFooter,
  Drawer,
  EmptyState,
  FileUpload,
  Icon,
  Input,
  PageHeader,
  SectionCard,
  Select,
  Tabs,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useModuleAccess } from "../useModuleAccess";
import { useSharedModulesContext } from "../context";
import { useUserLocations, useUsersList } from "../users/queries/users";
import {
  useCreateTaskCategory,
  useCreateTaskPriority,
  useCreateTaskStatus,
  useCreateTaskTemplate,
  useCreateTaskType,
  useCreateTenantTask,
  useCrmLeadStageTasks,
  useDeleteTaskCategory,
  useDeleteTaskPriority,
  useDeleteTaskStatus,
  useDeleteTaskTemplate,
  useDeleteTaskType,
  useDeleteTenantTask,
  useMarkTaskFileUploadComplete,
  useRemoveTenantTaskAssignee,
  useRequestTaskFileUploadUrls,
  useSaveTenantTaskAttachments,
  useTaskCategories,
  useTaskPriorities,
  useTaskStatuses,
  useTaskTemplateById,
  useTaskTemplates,
  useTaskTypes,
  useTenantSubtasks,
  useTenantTaskByUid,
  useTenantTasks,
  useTenantTasksCount,
  useUpdateTaskCategoryRecord,
  useUpdateTaskPriorityRecord,
  useUpdateTaskStatusRecord,
  useUpdateTaskTemplateRecord,
  useUpdateTaskTypeRecord,
  useUpdateTenantTaskAssignee,
  useUpdateTenantTaskPriority,
  useUpdateTenantTaskProgress,
  useUpdateTenantTaskRecord,
  useUpdateTenantTaskStatus,
} from "./queries/tasks";
import type {
  TaskFilters,
  TaskFormValues,
  TaskAttachment,
  TaskCalendarDateField,
  TaskDashboardView,
  TaskLocation,
  TaskLookup,
  TaskLookupFormValues,
  TaskRow,
  TaskScope,
  TaskStatusVariant,
  TaskTemplateFieldFlags,
  TaskTemplateFormValues,
  TaskTemplateRow,
  TaskUser,
  TasksViewKey,
} from "./types";

const PAGE_SIZE = 10;
const TASK_BOARD_PAGE_SIZE = 9;
const CALENDAR_PAGE_SIZE = 250;
const TASK_BUCKET_COLORS = ["#FFB6C1", "#FFD700", "#90EE90", "#87CEFA", "#FFA07A", "#DDA0DD", "#20B2AA", "#FF69B4"];
const TASK_UPLOAD_ACCEPT = ".jpg,.jpeg,.png,.bmp,.jfif,.pdf,.mp4,.mpeg,.mp3,.ogg,.xls,.xlsx,.doc,.docx";
const TASK_TEMPLATE_FIELD_DEFS = [
  { key: "title", label: "Title", fieldtype: "TextInput", datatype: "String", valueInput: "text" },
  { key: "description", label: "Description", fieldtype: "TextInput", datatype: "String", valueInput: "text" },
  { key: "category", label: "Category", fieldtype: "DropDown", datatype: "Object", dropdownapi: "drop", valueInput: "category" },
  { key: "type", label: "Type", fieldtype: "DropDown", datatype: "Object", dropdownapi: "drop", valueInput: "type" },
  { key: "priority", label: "Priority", fieldtype: "DropDown", datatype: "Object", dropdownapi: "drop", valueInput: "priority" },
  { key: "targetResult", label: "Target Result", fieldtype: "TextInput", datatype: "String", valueInput: "text" },
  { key: "targetPotential", label: "Target Potential", fieldtype: "TextInput", datatype: "Double", valueInput: "number" },
  { key: "estDuration", label: "Estimated Duration", fieldtype: "TextInput", datatype: "Object", valueInput: "duration" },
  { key: "location", label: "Location", fieldtype: "DropDown", datatype: "Object", valueInput: "location" },
  { key: "locationArea", label: "Location Area", fieldtype: "TextInput", datatype: "String", valueInput: "text" },
  { key: "assignee", label: "Assignee", fieldtype: "DropDown", datatype: "Object", valueInput: "user" },
  { key: "manager", label: "Manager", fieldtype: "DropDown", datatype: "Object", valueInput: "user" },
  { key: "dueDate", label: "Due Date", fieldtype: "TextInput", datatype: "Date", valueInput: "date" },
  { key: "status", label: "Status", fieldtype: "DropDown", datatype: "Object", valueInput: "status" },
  { key: "actualDuration", label: "Actual Duration", fieldtype: "TextInput", datatype: "Object", valueInput: "duration" },
  { key: "actualResult", label: "Actual Result", fieldtype: "TextInput", datatype: "String", valueInput: "text" },
  { key: "actualPotential", label: "Actual Potential", fieldtype: "TextInput", datatype: "Double", valueInput: "number" },
] as const;
const TASK_TEMPLATE_FIELD_GROUPS = [
  { title: "Core", fields: ["title", "description"] },
  { title: "Classification", fields: ["category", "type", "priority", "status"] },
  { title: "Assignment", fields: ["location", "locationArea", "assignee", "manager"] },
  { title: "Dates & Duration", fields: ["dueDate", "estDuration", "actualDuration"] },
  { title: "Results", fields: ["targetResult", "targetPotential", "actualResult", "actualPotential"] },
] as const;

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

const EMPTY_LOOKUP_FORM: TaskLookupFormValues = {
  name: "",
  description: "",
  sortOrder: "",
  status: "Enabled",
  aliasName: "",
  conversionValue: "",
  crmTableType: "NONE",
  priorityLevel: "1",
  colour: "#9d4062",
  isDefault: false,
};

type TaskAdvancedFilters = {
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
  const { routeParams, navigate } = useSharedModulesContext();
  const requestedView = normalizeView(routeParams?.view);
  const [fallbackView, setFallbackView] = useState<TasksViewKey>(requestedView);
  const view = navigate ? requestedView : fallbackView;

  function changeView(nextView: TasksViewKey) {
    if (navigate) {
      navigate(nextView === "list" ? "/" : `/${nextView}`);
      return;
    }
    setFallbackView(nextView);
  }

  return (
    <div data-testid="tasks-module" data-active-view={view} className="space-y-4">
      <PageHeader
        title="Tasks"
        subtitle="Track assigned, automated, and product-linked work across locations."
        actions={<TasksViewActions view={view} onViewChange={changeView} />}
      />

      {view === "list" && <TasksListView />}
      {view === "calendar" && <TasksCalendarView />}
      {view === "templates" && <TaskTemplatesView />}
      {view === "settings" && <TaskSettingsView />}
      {view === "crm-stage" && <CrmLeadStageTasksView />}
    </div>
  );
}

function TasksViewActions({ view, onViewChange }: { view: TasksViewKey; onViewChange: (view: TasksViewKey) => void }) {
  if (view === "crm-stage") {
    return null;
  }

  return (
    <Tabs
      value={view}
      onValueChange={(value) => onViewChange(value as TasksViewKey)}
      className="border-b-0"
      items={[
        { value: "list", label: "Tasks" },
        { value: "calendar", label: "Calendar" },
        { value: "templates", label: "Templates" },
        { value: "settings", label: "Settings" },
      ]}
    />
  );
}

function TasksBoardDashboardView() {
  const { user } = useSharedModulesContext();
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
  const countQuery = useTenantTasksCount(apiFilters);
  const detailQuery = useTenantTaskByUid(selectedTaskUid || "");
  const updateTask = useUpdateTenantTaskRecord();
  const removeAssignee = useRemoveTenantTaskAssignee();
  const updateAssignee = useUpdateTenantTaskAssignee();
  const updateStatus = useUpdateTenantTaskStatus();
  const tasks = normalizeArray<unknown>(tasksQuery.data).map(normalizeTenantTask);
  const total = normalizeCount(countQuery.data, tasks.length);
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
      ) : tasksQuery.isLoading || countQuery.isLoading ? (
        <div className="p-4 text-sm text-slate-500">Loading tasks...</div>
      ) : (
        <EmptyState title="No Tasks Found" description="Adjust filters or add a task in this group." />
      )}

      {total > TASK_BOARD_PAGE_SIZE ? (
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {page} of {Math.max(1, Math.ceil(total / TASK_BOARD_PAGE_SIZE))}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(total / TASK_BOARD_PAGE_SIZE)}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

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
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  function setValue(key: keyof TaskAdvancedFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  function resetFilters() {
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
          <Input label="Task Date From" id="txtTaskDueFrom_TB_Filter" type="date" value={filters.fromDueDate || ""} onChange={(event) => setValue("fromDueDate", event.target.value)} />
          <Input label="Task Date To" id="txtTaskDueTo_TB_Filter" type="date" value={filters.toDueDate || ""} onChange={(event) => setValue("toDueDate", event.target.value)} />
          <Select label="Priority" testId="selectTaskPriority_TB_Filter" value={filters.priorityId || ""} onChange={(event) => setValue("priorityId", event.target.value)} options={[{ value: "", label: "All priorities" }, ...toOptions(lookups.priorities)]} />
          <Input label="Created From" id="txtTaskCreatedFrom_TB_Filter" type="date" value={filters.fromCreatedDate || ""} onChange={(event) => setValue("fromCreatedDate", event.target.value)} />
          <Input label="Created To" id="txtTaskCreatedTo_TB_Filter" type="date" value={filters.toCreatedDate || ""} onChange={(event) => setValue("toCreatedDate", event.target.value)} />
          <Select label="Assignee" testId="selectTaskAssignee_TB_Filter" value={filters.assigneeId || ""} onChange={(event) => setValue("assigneeId", event.target.value)} options={[{ value: "", label: "All assignees" }, ...userOptions(lookups.users)]} />
          <Input label="Reference Number" id="txtTaskReference_TB_Filter" value={filters.originReferenceNo || ""} onChange={(event) => setValue("originReferenceNo", event.target.value)} />
          <Input label="Clinic Name" id="txtTaskClinic_TB_Filter" value={filters.originCustomerName || ""} onChange={(event) => setValue("originCustomerName", event.target.value)} />
          {dashboardView === "category" ? (
            <Select label="Status" testId="selectTaskStatus_TB_Filter" value={filters.statusId || ""} onChange={(event) => setValue("statusId", event.target.value)} options={[{ value: "", label: "All statuses" }, ...toOptions(lookups.statuses)]} />
          ) : (
            <Select label="Category" testId="selectTaskCategory_TB_Filter" value={filters.categoryId || ""} onChange={(event) => setValue("categoryId", event.target.value)} options={[{ value: "", label: "All categories" }, ...toOptions(lookups.categories)]} />
          )}
          <div className="flex items-end justify-end gap-2 md:col-span-3">
            <Button type="button" variant="outline" onClick={resetFilters} id="btnResetAdvancedTaskFilters_TB_Filter">
              Reset
            </Button>
            <Button type="button" variant="primary" onClick={() => setOpen(false)} id="btnApplyAdvancedTaskFilters_TB_Filter">
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

function TasksListView() {
  const { user, location, routeParams } = useSharedModulesContext();
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
  const [taskDialog, setTaskDialog] = useState<{ mode: "create" | "edit"; task?: TaskRow } | null>(null);
  const [selectedTaskUid, setSelectedTaskUid] = useState<string | null>(routeParams?.recordId ?? null);

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
  const detailQuery = useTenantTaskByUid(selectedTaskUid || "");
  const tasks = normalizeArray<unknown>(taskQuery.data).map(normalizeTenantTask);
  const total = normalizeCount(countQuery.data, tasks.length);
  const rawDetail = normalizeData<unknown>(detailQuery.data);
  const selectedTask = selectedTaskUid ? (rawDetail ? normalizeTenantTask(rawDetail) : null) ?? tasks.find((task) => task.taskUid === selectedTaskUid) ?? null : null;

  const createTask = useCreateTenantTask();
  const updateTask = useUpdateTenantTaskRecord();
  const deleteTask = useDeleteTenantTask();
  const updateAssignee = useUpdateTenantTaskAssignee();
  const removeAssignee = useRemoveTenantTaskAssignee();
  const updateStatus = useUpdateTenantTaskStatus();
  const updatePriority = useUpdateTenantTaskPriority();
  const updateProgress = useUpdateTenantTaskProgress();

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
              onClick={() => setSelectedTaskUid(row.taskUid)}
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
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedTaskUid(row.taskUid)} id={`btnViewTask_${row.taskUid}`}>
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
    if (task?.taskUid) {
      await updateTask.mutateAsync({ uid: task.taskUid, data: payload });
    } else {
      await createTask.mutateAsync(payload);
    }
    setTaskDialog(null);
  }

  async function removeTask(task: TaskRow) {
    if (!window.confirm("Delete this task?")) return;
    await deleteTask.mutateAsync(task.taskUid);
    setSelectedTaskUid(null);
  }

  return (
    <>
      <SectionCard
        padding={false}
        className="border-slate-200 shadow-sm"
        actions={
          <Button type="button" variant="primary" onClick={() => setTaskDialog({ mode: "create" })} id="btnCreateTask_SM_Tasks">
            Create Task
          </Button>
        }
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
        mode={taskDialog?.mode ?? "create"}
        task={taskDialog?.task}
        open={Boolean(taskDialog)}
        onClose={() => setTaskDialog(null)}
        onSubmit={submitTask}
        loading={createTask.isPending || updateTask.isPending}
        lookups={lookups}
        defaultLocationId={location?.id ? String(location.id) : ""}
      />

      <TaskDetailDialog
        task={selectedTask}
        onClose={() => setSelectedTaskUid(null)}
        onEdit={(task) => setTaskDialog({ mode: "edit", task })}
        onDelete={removeTask}
        lookups={lookups}
        updating={
          updateAssignee.isPending ||
          removeAssignee.isPending ||
          updateStatus.isPending ||
          updatePriority.isPending ||
          updateProgress.isPending ||
          deleteTask.isPending
        }
        onAssigneeChange={(task, assigneeId) =>
          assigneeId ? updateAssignee.mutateAsync({ uid: task.taskUid, assigneeId }) : removeAssignee.mutateAsync(task.taskUid)
        }
        onStatusChange={(task, nextStatusId) => updateStatus.mutateAsync({ uid: task.taskUid, statusId: nextStatusId })}
        onPriorityChange={(task, nextPriorityId) => updatePriority.mutateAsync({ uid: task.taskUid, priorityId: nextPriorityId })}
        onProgressChange={(task, nextProgress) => updateProgress.mutateAsync({ uid: task.taskUid, progress: nextProgress })}
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

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Advanced Filters"
        size="sm"
      >
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
                <Input
                  id="txtTaskDueFrom_SM_Tasks"
                  label="From"
                  type="date"
                  value={fromDueDate}
                  onChange={(event) => onFromDueDateChange(event.target.value)}
                />
                <Input
                  id="txtTaskDueTo_SM_Tasks"
                  label="To"
                  type="date"
                  value={toDueDate}
                  onChange={(event) => onToDueDateChange(event.target.value)}
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Created Date Range</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="txtTaskCreatedFrom_SM_Tasks"
                  label="From"
                  type="date"
                  value={fromCreatedDate}
                  onChange={(event) => onFromCreatedDateChange(event.target.value)}
                />
                <Input
                  id="txtTaskCreatedTo_SM_Tasks"
                  label="To"
                  type="date"
                  value={toCreatedDate}
                  onChange={(event) => onToCreatedDateChange(event.target.value)}
                />
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
            <Button
              type="button"
              variant="primary"
              onClick={() => setDrawerOpen(false)}
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

function TasksCalendarView() {
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

function CrmLeadStageTasksView() {
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

function TaskTemplatesView() {
  const { routeParams, navigate } = useSharedModulesContext();
  const [templateDialog, setTemplateDialog] = useState<TaskTemplateRow | "new" | null>(null);
  const lookups = useTaskLookups();
  const templatesQuery = useTaskTemplates({ from: 0, count: 100 });
  const createTemplate = useCreateTaskTemplate();
  const updateTemplate = useUpdateTaskTemplateRecord();
  const deleteTemplate = useDeleteTaskTemplate();
  const templates = normalizeArray<TaskTemplateRow>(templatesQuery.data);
  const isRouteCreate = routeParams?.subview === "create";
  const isRouteEdit = routeParams?.subview === "edit";
  const routeTemplateId = routeParams?.recordId ?? "";
  const routeTemplateQuery = useTaskTemplateById(routeTemplateId);
  const routeTemplate = routeTemplateId
    ? (normalizeData<TaskTemplateRow>(routeTemplateQuery.data) ?? templates.find((template) => String(template.id) === String(routeTemplateId)))
    : undefined;
  const editorTemplate = isRouteEdit ? routeTemplate : templateDialog && templateDialog !== "new" ? templateDialog : undefined;
  const editorOpen = isRouteCreate || isRouteEdit || Boolean(templateDialog);
  const columns: ColumnDef<TaskTemplateRow>[] = [
    { key: "name", header: "Template", render: (row) => <div className="font-semibold text-slate-900">{templateText(row, "templateName") || templateText(row, "name") || templateText(row, "title") || templateText(row, "taskName")}</div> },
    { key: "originFrom", header: "Origin", width: 140, render: (row) => row.originFrom || "-" },
    { key: "category", header: "Category", render: (row) => templateLookupName(row, "category") || row.categoryId || "-" },
    { key: "priority", header: "Priority", render: (row) => <Badge variant={getPriorityVariant(templateLookupName(row, "priority"))}>{templateLookupName(row, "priority") || row.priorityId || "Normal"}</Badge> },
    { key: "isAvailable", header: "Available", width: 110, render: (row) => (row.isAvailable === false ? "No" : "Yes") },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => (navigate ? navigate(`templates/edit/${row.id}`) : setTemplateDialog(row))} id={`btnEditTemplate_${row.id}`}>
            Edit
          </Button>
          <Button type="button" variant="danger" size="sm" onClick={() => deleteLookup(row.id, deleteTemplate.mutateAsync, "Delete this template?")} id={`btnDeleteTemplate_${row.id}`}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  async function submitTemplate(values: TaskTemplateFormValues, template?: TaskTemplateRow) {
    const payload = buildTemplatePayload(values, lookups);
    if (template?.id) {
      await updateTemplate.mutateAsync({ id: template.id, data: payload });
    } else {
      await createTemplate.mutateAsync(payload);
    }
    setTemplateDialog(null);
    if (navigate) {
      navigate("templates");
    }
  }

  if (editorOpen) {
    return (
      <TemplateDialog
        template={editorTemplate}
        open={editorOpen}
        onClose={() => (navigate ? navigate("templates") : setTemplateDialog(null))}
        onSubmit={submitTemplate}
        loading={createTemplate.isPending || updateTemplate.isPending || routeTemplateQuery.isLoading}
        lookups={lookups}
      />
    );
  }

  return (
    <>
      <SectionCard
        title="Task Templates"
        className="border-slate-200 shadow-sm"
        actions={
          <Button type="button" variant="primary" onClick={() => (navigate ? navigate("templates/create") : setTemplateDialog("new"))} id="btnCreateTemplate_SM_Tasks">
            Create Template
          </Button>
        }
        padding={false}
      >
        <DataTable
          data={templates}
          columns={columns}
          getRowId={(row) => String(row.id)}
          loading={templatesQuery.isLoading}
          data-testid="task-templates-table"
          emptyState={<EmptyState title="No templates found" description="Create reusable templates for repeated task workflows." />}
        />
      </SectionCard>
    </>
  );
}

function TaskSettingsView() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <LookupManager kind="category" title="Categories" />
      <LookupManager kind="priority" title="Priorities" />
      <LookupManager kind="status" title="Statuses" />
      <LookupManager kind="type" title="Types" />
    </div>
  );
}

function LookupManager({ kind, title }: { kind: "category" | "priority" | "status" | "type"; title: string }) {
  const [dialogRow, setDialogRow] = useState<TaskLookup | "new" | null>(null);
  const queryMap = {
    category: useTaskCategories({ from: 0, count: 100 }),
    priority: useTaskPriorities({ from: 0, count: 100 }),
    status: useTaskStatuses({ from: 0, count: 100 }),
    type: useTaskTypes({ from: 0, count: 100 }),
  };
  const createMap = {
    category: useCreateTaskCategory(),
    priority: useCreateTaskPriority(),
    status: useCreateTaskStatus(),
    type: useCreateTaskType(),
  };
  const updateMap = {
    category: useUpdateTaskCategoryRecord(),
    priority: useUpdateTaskPriorityRecord(),
    status: useUpdateTaskStatusRecord(),
    type: useUpdateTaskTypeRecord(),
  };
  const deleteMap = {
    category: useDeleteTaskCategory(),
    priority: useDeleteTaskPriority(),
    status: useDeleteTaskStatus(),
    type: useDeleteTaskType(),
  };
  const rows = normalizeArray<TaskLookup>(queryMap[kind].data);
  const columns: ColumnDef<TaskLookup>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <span className="inline-flex items-center gap-2 font-semibold text-slate-900">
          {kind === "priority" && row.colour ? <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.colour }} /> : null}
          {row.name}
        </span>
      ),
    },
    ...getLookupColumns(kind),
    {
      key: "actions",
      header: "",
      align: "right",
      width: 150,
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            iconOnly
            icon={<Icon name="pencil" />}
            aria-label={`Edit ${kind}`}
            title={`Edit ${kind}`}
            className="h-8 w-8 px-0"
            onClick={() => setDialogRow(row)}
            id={`btnEditTask${kind}_${row.id}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            iconOnly
            icon={<Icon name="trash" />}
            aria-label={`Delete ${kind}`}
            title={`Delete ${kind}`}
            className="h-8 w-8 px-0 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => deleteLookup(row.id, deleteMap[kind].mutateAsync, `Delete this ${kind}?`)}
            id={`btnDeleteTask${kind}_${row.id}`}
          />
        </div>
      ),
    },
  ];

  async function submit(values: TaskLookupFormValues, row?: TaskLookup) {
    const payload = buildLookupPayload(kind, values, row);
    if (row?.id) {
      await updateMap[kind].mutateAsync({ id: row.id, data: payload });
    } else {
      await createMap[kind].mutateAsync(payload);
    }
    setDialogRow(null);
  }

  return (
    <>
      <SectionCard
        title={title}
        className="border-slate-200 shadow-sm"
        padding={false}
        actions={
          <Button type="button" variant="primary" size="sm" onClick={() => setDialogRow("new")} id={`btnCreateTask${kind}`}>
            Add
          </Button>
        }
      >
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => String(row.id)}
          loading={queryMap[kind].isLoading}
          data-testid={`task-${kind}-table`}
          emptyState={<EmptyState title={`No ${title.toLowerCase()} found`} description={`Add ${title.toLowerCase()} to configure task workflows.`} />}
        />
      </SectionCard>
      <LookupDialog
        kind={kind}
        title={dialogRow && dialogRow !== "new" ? `Edit ${title}` : `Add ${title}`}
        row={dialogRow && dialogRow !== "new" ? dialogRow : undefined}
        open={Boolean(dialogRow)}
        onClose={() => setDialogRow(null)}
        onSubmit={submit}
        loading={createMap[kind].isPending || updateMap[kind].isPending}
      />
    </>
  );
}

function getLookupColumns(kind: "category" | "priority" | "status" | "type"): ColumnDef<TaskLookup>[] {
  if (kind === "priority") {
    return [
      { key: "priorityLevel", header: "Level", width: 90, render: (row) => row.priorityLevel ?? "-" },
      { key: "status", header: "Status", width: 110, render: (row) => row.status || "-" },
    ];
  }

  if (kind === "category") {
    return [];
  }

  if (kind === "type") {
    return [
      { key: "status", header: "Status", width: 110, render: (row) => row.status || "-" },
    ];
  }

  return [{ key: "sortOrder", header: "Order", width: 80, render: (row) => row.sortOrder ?? "-" }];
}

function buildLookupPayload(kind: "category" | "priority" | "status" | "type", values: TaskLookupFormValues, row?: TaskLookup) {
  if (kind === "priority") {
    return {
      ...(row?.id ? { id: row.id } : {}),
      name: values.name.trim(),
      crmTableType: "NONE",
      priorityLevel: values.priorityLevel ? Number(values.priorityLevel) : 1,
      colour: values.colour || "#9d4062",
      status: values.status || "Enabled",
      isDefault: row?.isDefault ?? false,
    };
  }

  if (kind === "category") {
    return {
      ...(row?.id ? { id: row.id } : {}),
      ...(row?.uid ? { uid: row.uid } : {}),
      name: values.name.trim(),
      aliasName: row?.aliasName || values.name.trim(),
      conversionValue: row?.conversionValue ?? 0,
      crmTableType: "NONE",
      status: row?.status || "Enabled",
      sortOrder: row?.sortOrder ?? 0,
    };
  }

  if (kind === "type") {
    return {
      ...(row?.id ? { id: row.id } : {}),
      name: values.name.trim(),
      crmTableType: "NONE",
      status: values.status || "Enabled",
    };
  }

  return {
    ...(row?.id ? { id: row.id } : {}),
    name: values.name.trim(),
    description: values.description.trim(),
    crmTableType: "NONE",
    sortOrder: values.sortOrder ? Number(values.sortOrder) : undefined,
    status: values.status || "ACTIVE",
  };
}

function buildTemplatePayload(values: TaskTemplateFormValues, lookups: TaskLookupData) {
  return {
    originFrom: values.originFrom || "Order",
    isSubTask: values.isSubTask,
    templateName: values.name.trim(),
    ...Object.fromEntries(
      TASK_TEMPLATE_FIELD_DEFS.map((field) => [
        field.key,
        templateField(field.fieldtype, field.datatype, values.fieldFlags[field.key], "dropdownapi" in field ? field.dropdownapi : "", templateFieldValue(field, values, lookups)),
      ])
    ),
    isSequential: values.isSequential,
    available: values.isAvailable,
  };
}

function templateField(fieldtype: "TextInput" | "DropDown", datatype: "String" | "Double" | "Object" | "Date", flags?: TaskTemplateFieldFlags, dropdownapi = "", value?: unknown) {
  return {
    fieldtype,
    datatype,
    ...(value !== undefined && value !== "" ? { value } : {}),
    dropdownapi,
    iseditable: flags?.iseditable ?? true,
    isvisible: flags?.isvisible ?? true,
    ismandatory: flags?.ismandatory ?? false,
  };
}

function templateFieldValue(field: (typeof TASK_TEMPLATE_FIELD_DEFS)[number], values: TaskTemplateFormValues, lookups: TaskLookupData) {
  const value = values.fieldValues[field.key];
  if (!value) return undefined;

  if (field.valueInput === "number") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  if (field.valueInput === "duration") {
    return parseTemplateDuration(value);
  }

  const lookupItems = templateLookupItems(field.valueInput, lookups);
  if (lookupItems) {
    return templateLookupValue(value, lookupItems);
  }

  return value.trim();
}

function templateLookupItems(valueInput: string, lookups: TaskLookupData) {
  if (valueInput === "category") return lookups.categories;
  if (valueInput === "type") return lookups.types;
  if (valueInput === "priority") return lookups.priorities;
  if (valueInput === "status") return lookups.statuses;
  if (valueInput === "location") return lookups.locations;
  if (valueInput === "user") return lookups.users;
  return null;
}

function templateLookupValue(value: string, items: Array<TaskLookup | TaskLocation | TaskUser>) {
  const item = items.find((entry) => String(entry.id) === value || String((entry as any).uid ?? "") === value);
  const name = item ? ("name" in item && item.name ? item.name : "place" in item && item.place ? item.place : getUserName(item as TaskUser)) : value;
  return {
    id: Number.isNaN(Number(value)) ? value : Number(value),
    name,
  };
}

function templateValueOptions(valueInput: string, items: Array<TaskLookup | TaskLocation | TaskUser>) {
  if (valueInput === "user") {
    return (items as TaskUser[]).map((item) => ({ value: String(item.id), label: getUserName(item) || item.name || String(item.id) }));
  }

  if (valueInput === "location") {
    return (items as TaskLocation[]).map((item) => ({ value: String(item.id), label: item.name || item.place || String(item.id) }));
  }

  return toOptions(items as TaskLookup[]);
}

function parseTemplateDuration(value: string) {
  const [days = "0", hours = "0", minutes = "0"] = value.split("|");
  return {
    days: Number(days) || 0,
    hours: Number(hours) || 0,
    minutes: Number(minutes) || 0,
  };
}

function templateText(row: TaskTemplateRow, key: string) {
  const value = (row as any)?.[key];
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return String(value.value ?? value.name ?? "");
  return String(value);
}

function templateLookupName(row: TaskTemplateRow, key: string) {
  const value = (row as any)?.[key];
  if (!value) return "";
  if (value.value && typeof value.value === "object") return String(value.value.name ?? "");
  if (typeof value === "object") return String(value.name ?? "");
  return String(value);
}

function templateToFormValues(template?: TaskTemplateRow): TaskTemplateFormValues {
  return {
    ...EMPTY_FORM,
    name: templateText(template ?? ({} as TaskTemplateRow), "templateName") || templateText(template ?? ({} as TaskTemplateRow), "name") || templateText(template ?? ({} as TaskTemplateRow), "title") || templateText(template ?? ({} as TaskTemplateRow), "taskName"),
    originFrom: template?.originFrom || "Order",
    isSubTask: Boolean(template?.isSubTask),
    isSequential: Boolean(template?.isSequential),
    isAvailable: (template as any)?.available ?? template?.isAvailable ?? true,
    fieldFlags: Object.fromEntries(TASK_TEMPLATE_FIELD_DEFS.map((field) => [field.key, templateFieldFlags(template, field.key)])),
    fieldValues: Object.fromEntries(TASK_TEMPLATE_FIELD_DEFS.map((field) => [field.key, templateFieldValueFromTemplate(template, field.key)])),
  };
}

function templateFieldFlags(template: TaskTemplateRow | undefined, key: string): TaskTemplateFieldFlags {
  const field = (template as any)?.[key];
  return {
    iseditable: field?.iseditable ?? true,
    isvisible: field?.isvisible ?? true,
    ismandatory: field?.ismandatory ?? false,
  };
}

function templateFieldValueFromTemplate(template: TaskTemplateRow | undefined, key: string) {
  const fieldValue = (template as any)?.[key]?.value;
  if (fieldValue === undefined || fieldValue === null) return "";
  if (typeof fieldValue === "object") {
    if ("days" in fieldValue || "hours" in fieldValue || "minutes" in fieldValue) {
      return `${fieldValue.days ?? 0}|${fieldValue.hours ?? 0}|${fieldValue.minutes ?? 0}`;
    }
    return fieldValue.id !== undefined && fieldValue.id !== null ? String(fieldValue.id) : "";
  }
  return String(fieldValue);
}

export function TaskFormDialog({
  mode,
  task,
  open,
  onClose,
  onSubmit,
  loading,
  lookups,
  defaultLocationId,
}: {
  mode: "create" | "edit";
  task?: TaskRow;
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TaskFormValues, task?: TaskRow) => Promise<void>;
  loading: boolean;
  lookups: TaskLookupData;
  defaultLocationId: string;
}) {
  const [values, setValues] = useState<TaskFormValues>(() => taskToFormValues(task, defaultLocationId));
  const [error, setError] = useState<string | null>(null);
  const submitDisabled = loading || !values.title.trim() || !values.dueDate || !values.statusId;

  useEffect(() => {
    if (open) {
      setError(null);
      setValues(taskToFormValues(task, defaultLocationId));
    }
  }, [open, task, defaultLocationId]);

  function setValue<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Dialog open={open} onClose={onClose} title={mode === "edit" ? "Edit Task" : "Create Task"} size="lg" testId="task-form-dialog">
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (submitDisabled) return;
          setError(null);
          try {
            await onSubmit(values, task);
          } catch (err: any) {
            setError(extractErrorMessage(err));
          }
        }}
      >
        {error && (
          <div className="md:col-span-2">
            <Alert variant="danger">{error}</Alert>
          </div>
        )}
        <Input label="Task Name" id="txtTaskName_SM_TaskForm" required value={values.title} onChange={(event) => setValue("title", event.target.value)} />
        <Input label="Task Date" id="dateTaskDue_SM_TaskForm" type="date" required value={values.dueDate} onChange={(event) => setValue("dueDate", event.target.value)} />
        <Select label="Priority" testId="selectPriority_SM_TaskForm" value={values.priorityId} onChange={(event) => setValue("priorityId", event.target.value)} options={[{ value: "", label: "Select priority" }, ...toOptions(lookups.priorities)]} />
        <Select label="Status" testId="selectStatus_SM_TaskForm" value={values.statusId} onChange={(event) => setValue("statusId", event.target.value)} options={[{ value: "", label: "Select status" }, ...toOptions(lookups.statuses)]} />
        <Select label="Category" testId="selectCategory_SM_TaskForm" value={values.categoryId} onChange={(event) => setValue("categoryId", event.target.value)} options={[{ value: "", label: "Select category" }, ...toOptions(lookups.categories)]} />
        <Select label="Type" testId="selectType_SM_TaskForm" value={values.typeId} onChange={(event) => setValue("typeId", event.target.value)} options={[{ value: "", label: "Select type" }, ...toOptions(lookups.types)]} />
        <Select label="Location" testId="selectLocation_SM_TaskForm" value={values.locationId} onChange={(event) => setValue("locationId", event.target.value)} options={[{ value: "", label: "Select location" }, ...locationOptions(lookups.locations)]} />
        <Select label="Assignee" testId="selectAssignee_SM_TaskForm" value={values.assigneeId} onChange={(event) => setValue("assigneeId", event.target.value)} options={[{ value: "", label: "Unassigned" }, ...userOptions(lookups.users)]} />
        <Input containerClassName="md:col-span-2" label="Description" id="txtTaskDescription_SM_TaskForm" value={values.description} onChange={(event) => setValue("description", event.target.value)} />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitDisabled} loading={loading} id="btnSaveTask_SM_TaskForm">
            {mode === "edit" ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

function TaskDetailDialog({
  task,
  onClose,
  onEdit,
  onDelete,
  lookups,
  updating = false,
  readOnly = false,
  onAssigneeChange,
  onStatusChange,
  onPriorityChange,
  onProgressChange,
}: {
  task: TaskRow | null;
  onClose: () => void;
  onEdit?: (task: TaskRow) => void;
  onDelete?: (task: TaskRow) => void;
  lookups: TaskLookupData;
  updating?: boolean;
  readOnly?: boolean;
  onAssigneeChange?: (task: TaskRow, assigneeId: string) => Promise<unknown>;
  onStatusChange?: (task: TaskRow, statusId: string) => Promise<unknown>;
  onPriorityChange?: (task: TaskRow, priorityId: string) => Promise<unknown>;
  onProgressChange?: (task: TaskRow, progress: string) => Promise<unknown>;
}) {
  const subtasksQuery = useTenantSubtasks(task?.taskUid || "");
  const subtasks = normalizeArray<TaskRow>(subtasksQuery.data);
  const [progress, setProgress] = useState(task?.progress ? String(task.progress) : "0");

  useEffect(() => {
    if (task) {
      setProgress(task.progress ? String(task.progress) : "0");
    }
  }, [task]);

  if (!task) return null;

  return (
    <Dialog open={Boolean(task)} onClose={onClose} title={task.title || "Task Details"} size="lg" testId="task-detail-dialog">
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={getTaskStatusVariant(task.status?.name)}>{task.status?.name || "Open"}</Badge>
            <Badge dot variant={getPriorityVariant(task.priority?.name)}>{task.priority?.name || "Normal"}</Badge>
            {task.originData?.source || task.originData?.sourceType ? <Badge variant="info">{task.originData.source || task.originData.sourceType}</Badge> : null}
          </div>
          <p className="m-0 text-sm text-slate-600">{task.description || "No description added."}</p>
          <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
            <Info label="Due Date" value={formatDate(task.dueDate)} />
            <Info label="Created Date" value={formatDate(task.createdDate)} />
            <Info label="Category" value={task.category?.name || "-"} />
            <Info label="Type" value={task.type?.name || "-"} />
            <Info label="Location" value={task.location?.name || task.location?.place || "-"} />
            <Info label="Reference" value={task.originData?.referenceNumber ? `#${task.originData.referenceNumber}` : "-"} />
          </div>
          <SectionCard title="Subtasks" className="border-slate-200" padding={false}>
            <DataTable
              data={subtasks}
              columns={[
                { key: "title", header: "Task", render: (row) => row.title || "Untitled task" },
                { key: "status", header: "Status", width: 120, render: (row) => <Badge variant={getTaskStatusVariant(row.status?.name)}>{row.status?.name || "Open"}</Badge> },
                { key: "dueDate", header: "Due Date", width: 120, render: (row) => formatDate(row.dueDate) },
              ]}
              getRowId={(row) => row.taskUid}
              loading={subtasksQuery.isLoading}
              data-testid="task-subtasks-table"
              emptyState={<EmptyState title="No subtasks" description="Subtasks linked to this task will appear here." />}
            />
          </SectionCard>
          <SectionCard title="Attachments" className="border-slate-200">
            {task.taskAttachments?.length ? (
              <div className="text-sm text-slate-700">{task.taskAttachments.length} attachment(s) linked to this task.</div>
            ) : (
              <EmptyState title="No attachments" description="Attachments linked by backend workflows will appear here." />
            )}
          </SectionCard>
        </div>
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <Select label="Status" testId="selectTaskStatus_SM_Detail" value={task.status?.id ? String(task.status.id) : ""} disabled={readOnly || updating} onChange={(event) => onStatusChange?.(task, event.target.value)} options={[{ value: "", label: "Select status" }, ...toOptions(lookups.statuses)]} />
          <Select label="Priority" testId="selectTaskPriority_SM_Detail" value={task.priority?.id ? String(task.priority.id) : ""} disabled={readOnly || updating} onChange={(event) => onPriorityChange?.(task, event.target.value)} options={[{ value: "", label: "Select priority" }, ...toOptions(lookups.priorities)]} />
          <Select label="Assignee" testId="selectTaskAssignee_SM_Detail" value={task.assignee?.id ? String(task.assignee.id) : ""} disabled={readOnly || updating} onChange={(event) => onAssigneeChange?.(task, event.target.value)} options={[{ value: "", label: "Unassigned" }, ...userOptions(lookups.users)]} />
          <div className="flex items-end gap-2">
            <Input label="Progress %" id="txtTaskProgress_SM_Detail" type="number" min={0} max={100} value={progress} disabled={readOnly || updating} onChange={(event) => setProgress(event.target.value)} />
            <Button type="button" variant="outline" disabled={readOnly || updating} onClick={() => onProgressChange?.(task, progress)} id="btnSaveTaskProgress_SM_Detail">
              Save
            </Button>
          </div>
          {!readOnly && (
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onEdit?.(task)} id="btnEditTask_SM_Detail">
                Edit
              </Button>
              <Button type="button" variant="danger" onClick={() => onDelete?.(task)} id="btnDeleteTask_SM_Detail">
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}



function TemplateDialog({
  template,
  open,
  onClose,
  onSubmit,
  loading,
  lookups,
}: {
  template?: TaskTemplateRow;
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TaskTemplateFormValues, template?: TaskTemplateRow) => Promise<void>;
  loading: boolean;
  lookups: TaskLookupData;
}) {
  const [values, setValues] = useState<TaskTemplateFormValues>(() => templateToFormValues(template));
  const [error, setError] = useState<string | null>(null);
  const submitDisabled = loading || !values.name.trim();

  useEffect(() => {
    if (open) {
      setError(null);
      setValues(templateToFormValues(template));
    }
  }, [open, template]);

  function setValue<K extends keyof TaskTemplateFormValues>(key: K, value: TaskTemplateFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function setFieldFlag(fieldKey: string, flagKey: keyof TaskTemplateFieldFlags, checked: boolean) {
    setValues((prev) => ({
      ...prev,
      fieldFlags: {
        ...prev.fieldFlags,
        [fieldKey]: {
          ...(prev.fieldFlags[fieldKey] ?? templateFieldFlags(undefined, fieldKey)),
          [flagKey]: checked,
        },
      },
    }));
  }

  function setFieldValue(fieldKey: string, value: string) {
    setValues((prev) => ({
      ...prev,
      fieldValues: {
        ...prev.fieldValues,
        [fieldKey]: value,
      },
    }));
  }

  const templateTitle = template ? "Edit Template" : "Create Template";

  return (
    <div className="space-y-4" data-testid="template-editor-page">
      <PageHeader
        title={templateTitle}
        actions={
          <Button type="button" variant="outline" onClick={onClose} id="btnBackTemplates_SM_Tasks">
            Back
          </Button>
        }
      />
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitDisabled) return;
          setError(null);
          try {
            await onSubmit(values, template);
          } catch (err: any) {
            setError(extractErrorMessage(err));
          }
        }}
      >
        {error ? <Alert variant="danger">{error}</Alert> : null}
        <SectionCard title="Template Setup" className="border-slate-200 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Template Name" id="txtTemplateName_SM_Tasks" required value={values.name} onChange={(event) => setValue("name", event.target.value)} />
            <Input label="Origin From" id="txtTemplateOriginFrom_SM_Tasks" value={values.originFrom} onChange={(event) => setValue("originFrom", event.target.value)} />
            <div className="flex flex-wrap gap-4 md:col-span-2">
              <Checkbox label="Subtask template" id="chkTemplateSubtask_SM_Tasks" checked={values.isSubTask} onChange={(event) => setValue("isSubTask", event.target.checked)} />
              <Checkbox label="Sequential" id="chkTemplateSequential_SM_Tasks" checked={values.isSequential} onChange={(event) => setValue("isSequential", event.target.checked)} />
              <Checkbox label="Available" id="chkTemplateAvailable_SM_Tasks" checked={values.isAvailable} onChange={(event) => setValue("isAvailable", event.target.checked)} />
            </div>
          </div>
        </SectionCard>

        {TASK_TEMPLATE_FIELD_GROUPS.map((group) => (
          <SectionCard key={group.title} title={group.title} className="border-slate-200 shadow-sm" padding={false}>
            <div className="divide-y divide-slate-200">
              {group.fields.map((fieldKey) => {
                const field = TASK_TEMPLATE_FIELD_DEFS.find((item) => item.key === fieldKey);
                if (!field) return null;
                const flags = values.fieldFlags[field.key] ?? templateFieldFlags(undefined, field.key);
                return (
                  <div key={field.key} className="grid gap-3 p-4 lg:grid-cols-[180px_minmax(260px,1fr)_310px] lg:items-center">
                    <div>
                      <div className="font-semibold text-slate-900">{field.label}</div>
                      <div className="text-xs text-slate-500">{field.datatype}</div>
                    </div>
                    <TemplateFieldValueInput
                      field={field}
                      value={values.fieldValues[field.key] || ""}
                      lookups={lookups}
                      onChange={(value) => setFieldValue(field.key, value)}
                    />
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Checkbox label="Editable" id={`chkTemplate${field.key}Editable_SM_Tasks`} checked={flags.iseditable} onChange={(event) => setFieldFlag(field.key, "iseditable", event.target.checked)} />
                      <Checkbox label="Visible" id={`chkTemplate${field.key}Visible_SM_Tasks`} checked={flags.isvisible} onChange={(event) => setFieldFlag(field.key, "isvisible", event.target.checked)} />
                      <Checkbox label="Mandatory" id={`chkTemplate${field.key}Mandatory_SM_Tasks`} checked={flags.ismandatory} onChange={(event) => setFieldFlag(field.key, "ismandatory", event.target.checked)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        ))}

        <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t border-slate-200 bg-white/95 py-3 backdrop-blur">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitDisabled} loading={loading} id="btnSaveTemplate_SM_Tasks">
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}

function TemplateFieldValueInput({
  field,
  value,
  lookups,
  onChange,
}: {
  field: (typeof TASK_TEMPLATE_FIELD_DEFS)[number];
  value: string;
  lookups: TaskLookupData;
  onChange: (value: string) => void;
}) {
  if (field.valueInput === "text") {
    return <Input label="" id={`txtTemplate${field.key}Value_SM_Tasks`} value={value} onChange={(event) => onChange(event.target.value)} />;
  }

  if (field.valueInput === "number") {
    return <Input label="" id={`txtTemplate${field.key}Value_SM_Tasks`} type="number" step="0.1" value={value} onChange={(event) => onChange(event.target.value)} />;
  }

  if (field.valueInput === "date") {
    return <Input label="" id={`dateTemplate${field.key}Value_SM_Tasks`} type="date" value={value} onChange={(event) => onChange(event.target.value)} />;
  }

  if (field.valueInput === "duration") {
    const duration = parseTemplateDuration(value);
    const setPart = (index: number, nextValue: string) => {
      const parts = [String(duration.days), String(duration.hours), String(duration.minutes)];
      parts[index] = nextValue;
      onChange(parts.join("|"));
    };
    return (
      <div className="grid grid-cols-3 gap-1">
        <Input label="" id={`txtTemplate${field.key}Days_SM_Tasks`} type="number" min={0} placeholder="Days" value={String(duration.days)} onChange={(event) => setPart(0, event.target.value)} />
        <Input label="" id={`txtTemplate${field.key}Hours_SM_Tasks`} type="number" min={0} placeholder="Hours" value={String(duration.hours)} onChange={(event) => setPart(1, event.target.value)} />
        <Input label="" id={`txtTemplate${field.key}Minutes_SM_Tasks`} type="number" min={0} placeholder="Mins" value={String(duration.minutes)} onChange={(event) => setPart(2, event.target.value)} />
      </div>
    );
  }

  const lookupItems = templateLookupItems(field.valueInput, lookups);
  if (lookupItems) {
    return (
      <Select
        label=""
        testId={`selectTemplate${field.key}Value_SM_Tasks`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        options={[{ value: "", label: "No default" }, ...templateValueOptions(field.valueInput, lookupItems)]}
      />
    );
  }

  return null;
}

function LookupDialog({
  kind,
  title,
  row,
  open,
  onClose,
  onSubmit,
  loading,
}: {
  kind: "category" | "priority" | "status" | "type";
  title: string;
  row?: TaskLookup;
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TaskLookupFormValues, row?: TaskLookup) => Promise<void>;
  loading: boolean;
}) {
  const [values, setValues] = useState<TaskLookupFormValues>({
    ...EMPTY_LOOKUP_FORM,
    name: row?.name || "",
    description: row?.description || "",
    sortOrder: row?.sortOrder !== undefined ? String(row.sortOrder) : "",
    status: row?.status || EMPTY_LOOKUP_FORM.status,
    aliasName: row?.aliasName || "",
    conversionValue: row?.conversionValue !== undefined ? String(row.conversionValue) : "",
    crmTableType: row?.crmTableType || "NONE",
    priorityLevel: row?.priorityLevel !== undefined ? String(row.priorityLevel) : "1",
    colour: row?.colour || "#9d4062",
    isDefault: Boolean(row?.isDefault),
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setValues({
        ...EMPTY_LOOKUP_FORM,
        name: row?.name || "",
        description: row?.description || "",
        sortOrder: row?.sortOrder !== undefined ? String(row.sortOrder) : "",
        status: row?.status || EMPTY_LOOKUP_FORM.status,
        aliasName: row?.aliasName || "",
        conversionValue: row?.conversionValue !== undefined ? String(row.conversionValue) : "",
        crmTableType: row?.crmTableType || "NONE",
        priorityLevel: row?.priorityLevel !== undefined ? String(row.priorityLevel) : "1",
        colour: row?.colour || "#9d4062",
        isDefault: Boolean(row?.isDefault),
      });
    }
  }, [open, row]);

  return (
    <Dialog open={open} onClose={onClose} title={title} size="md" testId="task-lookup-dialog">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!values.name.trim() || loading) return;
          setError(null);
          try {
            await onSubmit(values, row);
          } catch (err: any) {
            setError(extractErrorMessage(err));
          }
        }}
      >
        {error && <Alert variant="danger">{error}</Alert>}
        <Input label="Name" id="txtLookupName_SM_Tasks" required value={values.name} onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))} />
        {kind === "priority" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Priority Level" id="txtPriorityLevel_SM_Tasks" type="number" min={1} value={values.priorityLevel} onChange={(event) => setValues((prev) => ({ ...prev, priorityLevel: event.target.value }))} />
            <Input label="Colour" id="txtPriorityColour_SM_Tasks" type="color" value={values.colour} onChange={(event) => setValues((prev) => ({ ...prev, colour: event.target.value }))} />
            <Select
              label="Status"
              testId="selectPriorityStatus_SM_Tasks"
              value={values.status}
              onChange={(event) => setValues((prev) => ({ ...prev, status: event.target.value }))}
              options={[
                { value: "Enabled", label: "Enabled" },
                { value: "Disabled", label: "Disabled" },
              ]}
            />
          </div>
        ) : kind === "type" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Status"
              testId="selectTypeStatus_SM_Tasks"
              value={values.status}
              onChange={(event) => setValues((prev) => ({ ...prev, status: event.target.value }))}
              options={[
                { value: "Enabled", label: "Enabled" },
                { value: "Disabled", label: "Disabled" },
              ]}
            />
          </div>
        ) : (
          <>
            <Input label="Description" id="txtLookupDesc_SM_Tasks" value={values.description} onChange={(event) => setValues((prev) => ({ ...prev, description: event.target.value }))} />
            <Input label="Sort Order" id="txtLookupSort_SM_Tasks" type="number" value={values.sortOrder} onChange={(event) => setValues((prev) => ({ ...prev, sortOrder: event.target.value }))} />
          </>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!values.name.trim()} loading={loading} id="btnSaveLookup_SM_Tasks">
            Save
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

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
    users: normalizeArray<TaskUser>(usersQuery.data),
    locations: normalizeArray<TaskLocation>(locationsQuery.data),
  };
}

export type TaskLookupData = {
  statuses: TaskLookup[];
  priorities: TaskLookup[];
  categories: TaskLookup[];
  types: TaskLookup[];
  users: TaskUser[];
  locations: TaskLocation[];
};

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-0.5 font-medium text-slate-900">{value}</div>
    </div>
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

function buildTaskFilters(input: TaskFilters & { userId?: string; locationId?: string | null }) {
  const filters: Record<string, string | number> = {
    from: (input.page - 1) * input.pageSize,
    count: input.pageSize,
  };

  if (input.searchText?.trim()) filters["title-like"] = input.searchText.trim();
  if (input.statusId) filters["status-eq"] = input.statusId;
  if (input.priorityId) filters["priority-eq"] = input.priorityId;
  if (input.categoryId) filters["category-eq"] = input.categoryId;
  if (input.assigneeId) filters["assignee-eq"] = input.assigneeId;
  if (input.scope === "my" && input.userId) filters["assignee-eq"] = input.userId;
  if (input.scope === "automation") filters["origin-eq"] = "AUTOMATION";
  if (input.fromDueDate) filters["dueDate-gte"] = input.fromDueDate;
  if (input.toDueDate) filters["dueDate-lte"] = input.toDueDate;
  if (input.fromCreatedDate) filters["createdDate-gte"] = input.fromCreatedDate;
  if (input.toCreatedDate) filters["createdDate-lte"] = input.toCreatedDate;
  if (input.originReferenceNo?.trim()) filters["originReferenceNo-like"] = input.originReferenceNo.trim();
  if (input.originCustomerName?.trim()) filters["originCustomerName-like"] = input.originCustomerName.trim();

  return filters;
}

export function buildTaskPayload(values: TaskFormValues, fallbackLocationId?: string | number | null) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    dueDate: values.dueDate,
    priorityId: values.priorityId ? Number(values.priorityId) : undefined,
    categoryId: values.categoryId ? Number(values.categoryId) : 1,
    typeId: values.typeId ? Number(values.typeId) : 1,
    statusId: values.statusId ? Number(values.statusId) : undefined,
    assigneeUid: values.assigneeId || undefined,
    locationId: values.locationId ? Number(values.locationId) : fallbackLocationId ? Number(fallbackLocationId) : undefined,
  };
}

function taskToFormValues(task?: TaskRow, defaultLocationId = ""): TaskFormValues {
  return {
    title: task?.title || "",
    description: task?.description || "",
    dueDate: toDateInputValue(task?.dueDate),
    priorityId: task?.priority?.id ? String(task.priority.id) : "",
    categoryId: task?.category?.id ? String(task.category.id) : "",
    typeId: task?.type?.id ? String(task.type.id) : "",
    statusId: task?.status?.id ? String(task.status.id) : "",
    assigneeId: task?.assignee?.id ? String(task.assignee.id) : "",
    locationId: task?.location?.id ? String(task.location.id) : defaultLocationId,
  };
}

function normalizeView(value?: string | null): TasksViewKey {
  if (value === "crm-stage") return "crm-stage";
  if (value === "calendar" || value === "templates" || value === "settings") return value;
  return "list";
}

function normalizeTenantTask(raw: unknown): TaskRow {
  const task = raw as any;
  if (!task) return {} as TaskRow;

  const priorityId = task.priorityId ?? task.priority?.id;
  const priorityName = task.priorityName ?? task.priority?.name;

  const categoryId = task.categoryId ?? task.category?.id;
  const categoryName = task.categoryName ?? task.category?.name;

  const statusId = task.statusId ?? task.status?.id;
  const statusName = task.statusName ?? task.status?.name;

  const typeId = task.typeId ?? task.type?.id;
  const typeName = task.typeName ?? task.type?.name;

  const locationId = task.locationId ?? task.location?.id;
  const locationName = task.locationName ?? task.location?.name ?? task.location?.place;

  const assigneeId = task.assigneeUid ?? task.assigneeId ?? task.assignee?.id;
  const assigneeName = task.assigneeName ?? task.assignee?.name;

  return {
    taskUid: task.taskUid ?? task.uid ?? String(task.id),
    id: task.id ?? task.uid ?? task.taskUid,
    title: task.title || "Untitled task",
    description: task.description,
    dueDate: task.dueDate,
    createdDate: task.createdAt ?? task.createdDate,
    priority: priorityId || priorityName ? { id: priorityId, name: priorityName } : undefined,
    category: categoryId || categoryName ? { id: categoryId, name: categoryName } : undefined,
    status: statusId || statusName ? { id: statusId, name: statusName } : undefined,
    type: typeId || typeName ? { id: typeId, name: typeName } : undefined,
    assignee: assigneeId || assigneeName ? { id: assigneeId, name: assigneeName } : undefined,
    location: locationId || locationName ? { id: locationId, name: locationName } : undefined,
    progress: task.progress,
    originData: typeof task.originData === "string" ? { referenceNumber: task.originReferenceNo, customerName: task.originCustomerName } : task.originData,
    taskAttachments: Array.isArray(task.taskAttachments) ? task.taskAttachments : Array.isArray(task.attachments) ? task.attachments : [],
    required: Boolean(task.required ?? task.isRequired),
  };
}

function extractErrorMessage(err: any): string {
  if (!err) return "An unexpected error occurred.";

  const responseData = err.response?.data || err.data || err;
  if (responseData) {
    if (responseData.details?.fieldErrors && Array.isArray(responseData.details.fieldErrors)) {
      const fieldMsgs = responseData.details.fieldErrors
        .map((f: any) => f.message || `${f.field} is invalid`)
        .join(", ");
      return `${responseData.message || "Validation failed"}: ${fieldMsgs}`;
    }
    if (responseData.message) {
      return responseData.message;
    }
  }

  if (err.message) {
    return err.message;
  }

  return String(err);
}

function normalizeCrmStageTask(raw: unknown): TaskRow {
  const task = raw as any;
  const uid = String(task?.uid ?? task?.taskUid ?? task?.id ?? task?.templateUid ?? task?.title ?? "crm-task");
  const completed = Boolean(task?.completed ?? task?.isCompleted);
  const statusName = String(task?.status?.name ?? task?.status ?? (completed ? "Completed" : "Open"));
  const priorityName = String(task?.priority?.name ?? task?.priority ?? "Normal");
  const assigneeName = String(task?.assignee?.name ?? task?.assigneeName ?? task?.assignedToName ?? "");

  return {
    taskUid: uid,
    id: task?.id ?? task?.uid ?? task?.taskUid,
    title: String(task?.title ?? task?.taskTitle ?? task?.taskName ?? "Untitled task"),
    description: task?.description ? String(task.description) : undefined,
    dueDate: task?.dueDate ?? task?.taskDate ?? task?.dueOn,
    createdDate: task?.createdDate ?? task?.createdOn,
    priority: {
      id: task?.priority?.id ?? priorityName,
      name: priorityName,
    },
    category: task?.category
      ? {
          id: task.category?.id ?? task.category,
          name: String(task.category?.name ?? task.category),
        }
      : undefined,
    status: {
      id: task?.status?.id ?? statusName,
      name: statusName,
    },
    assignee: assigneeName
      ? {
          id: task?.assignee?.id ?? task?.assigneeId ?? assigneeName,
          name: assigneeName,
        }
      : undefined,
    location: task?.location
      ? {
          id: task.location?.id ?? task.location,
          name: task.location?.name ?? task.location,
        }
      : undefined,
    progress: completed ? 100 : task?.progress,
    originData: {
      source: "CRM",
      sourceType: task?.type ?? task?.taskType,
      referenceNumber: task?.referenceNumber,
    },
    taskAttachments: Array.isArray(task?.taskAttachments) ? task.taskAttachments : [],
    required: Boolean(task?.required ?? task?.isRequired),
  };
}

function isRequiredCrmTask(task: TaskRow) {
  const raw = task as any;
  return Boolean(raw.required ?? raw.isRequired);
}

function normalizeData<T>(response: unknown): T | null {
  const payload = (response as any)?.data ?? response;
  if (!payload || Array.isArray(payload)) return null;
  return payload as T;
}

function normalizeArray<T>(response: unknown): T[] {
  const payload = (response as any)?.data ?? response;
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.items)) return payload.items as T[];
  if (Array.isArray(payload?.content)) return payload.content as T[];
  if (Array.isArray(payload?.results)) return payload.results as T[];
  return [];
}

function normalizeCount(response: unknown, fallback: number) {
  const payload = (response as any)?.data ?? response;
  if (typeof payload === "number") return payload;
  if (typeof payload?.count === "number") return payload.count;
  if (typeof payload?.total === "number") return payload.total;
  if (typeof payload?.totalElements === "number") return payload.totalElements;
  return fallback;
}

function toOptions(items: TaskLookup[]) {
  return [...items]
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
    .map((item) => ({ value: String(item.id), label: item.name }));
}

function userOptions(users: TaskUser[]) {
  return users.map((item) => ({ value: String(item.id), label: getUserName(item) || String(item.id) }));
}

function locationOptions(locations: TaskLocation[]) {
  return locations.map((item) => ({ value: String(item.id), label: item.name || item.place || String(item.id) }));
}

function getUserId(user: unknown) {
  const value = user as any;
  const id = value?.uid ?? value?.id ?? value?.userId;
  return id !== undefined && id !== null ? String(id) : undefined;
}

function getUserName(user?: TaskUser) {
  if (!user) return "";
  return user.fullName || user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim();
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" }).format(date);
}

function toDateInputValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function groupTasksByDate(tasks: TaskRow[]) {
  const groups = new Map<string, TaskRow[]>();
  tasks.forEach((task) => {
    if (!task.dueDate) return;
    const key = toDateInputValue(task.dueDate);
    groups.set(key, [...(groups.get(key) ?? []), task]);
  });
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rows]) => ({ date, tasks: rows }));
}

function clampProgress(value?: string | number) {
  const parsed = Number(value ?? 0);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function isCompleteStatus(value?: string) {
  return /complete|completed|done|closed/i.test(value || "");
}

function getTaskStatusVariant(value?: string): TaskStatusVariant {
  if (isCompleteStatus(value)) return "success";
  if (/hold|pending|waiting/i.test(value || "")) return "warning";
  if (/cancel|reject|failed|overdue/i.test(value || "")) return "danger";
  if (/progress|active|open/i.test(value || "")) return "info";
  return "neutral";
}

function getPriorityVariant(value?: string): TaskStatusVariant {
  if (/urgent|critical|high/i.test(value || "")) return "danger";
  if (/medium|normal/i.test(value || "")) return "warning";
  if (/low/i.test(value || "")) return "success";
  return "neutral";
}

async function completeTask(
  task: TaskRow,
  statuses: TaskLookup[],
  updateStatus: ReturnType<typeof useUpdateTenantTaskStatus>,
  updateProgress: ReturnType<typeof useUpdateTenantTaskProgress>
) {
  const completeStatus = statuses.find((status) => isCompleteStatus(status.name));
  if (completeStatus?.id !== undefined) {
    await updateStatus.mutateAsync({ uid: task.taskUid, statusId: completeStatus.id });
    return;
  }
  await updateProgress.mutateAsync({ uid: task.taskUid, progress: 100 });
}

async function deleteLookup(id: string | number, mutator: (id: string | number) => Promise<unknown>, message: string) {
  if (!window.confirm(message)) return;
  await mutator(id);
}
