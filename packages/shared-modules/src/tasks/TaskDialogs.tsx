import { useEffect, useState } from "react";
import { Alert, Badge, Button, DataTable, Dialog, DialogFooter, EmptyState, Input, SectionCard, Select } from "@jaldee/design-system";
import { useTenantSubtasks } from "./queries/tasks";
import type { TaskFormValues, TaskRow } from "./types";
import type { TaskLookupData } from "./taskLookups";
import {
  extractErrorMessage,
  formatDate,
  getPriorityVariant,
  getTaskStatusVariant,
  locationOptions,
  normalizeArray,
  taskToFormValues,
  toOptions,
  userOptions,
} from "./taskUtils";

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
        className="grid gap-4"
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

export function TaskDetailDialog({
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
  if (!task) return null;

  return (
    <Dialog open={Boolean(task)} onClose={onClose} title={task.title || "Task Details"} size="lg" testId="task-detail-dialog">
      <TaskDetailContent
        task={task}
        lookups={lookups}
        updating={updating}
        readOnly={readOnly}
        onEdit={onEdit}
        onDelete={onDelete}
        onAssigneeChange={onAssigneeChange}
        onStatusChange={onStatusChange}
        onPriorityChange={onPriorityChange}
        onProgressChange={onProgressChange}
      />
    </Dialog>
  );
}

export function TaskDetailContent({
  task,
  lookups,
  updating = false,
  readOnly = false,
  onEdit,
  onDelete,
  onAssigneeChange,
  onStatusChange,
  onPriorityChange,
  onProgressChange,
}: {
  task: TaskRow;
  lookups: TaskLookupData;
  updating?: boolean;
  readOnly?: boolean;
  onEdit?: (task: TaskRow) => void;
  onDelete?: (task: TaskRow) => void;
  onAssigneeChange?: (task: TaskRow, assigneeId: string) => Promise<unknown>;
  onStatusChange?: (task: TaskRow, statusId: string) => Promise<unknown>;
  onPriorityChange?: (task: TaskRow, priorityId: string) => Promise<unknown>;
  onProgressChange?: (task: TaskRow, progress: string) => Promise<unknown>;
}) {
  const subtasksQuery = useTenantSubtasks(task.taskUid);
  const subtasks = normalizeArray<TaskRow>(subtasksQuery.data);
  const [progress, setProgress] = useState(task.progress ? String(task.progress) : "0");

  useEffect(() => {
    setProgress(task.progress ? String(task.progress) : "0");
  }, [task]);

  return (
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
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-0.5 font-medium text-slate-900">{value}</div>
    </div>
  );
}
