import { useEffect, useState } from "react";
import { Alert, Button, DataTable, Dialog, DialogFooter, EmptyState, Icon, Input, SectionCard, Select } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import {
  useCreateTaskCategory,
  useCreateTaskPriority,
  useCreateTaskStatus,
  useCreateTaskType,
  useDeleteTaskCategory,
  useDeleteTaskPriority,
  useDeleteTaskStatus,
  useDeleteTaskType,
  useTaskCategories,
  useTaskPriorities,
  useTaskStatuses,
  useTaskTypes,
  useUpdateTaskCategoryRecord,
  useUpdateTaskPriorityRecord,
  useUpdateTaskStatusRecord,
  useUpdateTaskTypeRecord,
} from "./queries/tasks";
import type { TaskLookup, TaskLookupFormValues } from "./types";
import { deleteLookup, extractErrorMessage, normalizeArray } from "./taskUtils";

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

type LookupKind = "category" | "priority" | "status" | "type";

export function TaskSettingsView() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <LookupManager kind="category" title="Categories" />
      <LookupManager kind="priority" title="Priorities" />
      <LookupManager kind="status" title="Statuses" />
      <LookupManager kind="type" title="Types" />
    </div>
  );
}

function LookupManager({ kind, title }: { kind: LookupKind; title: string }) {
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

function getLookupColumns(kind: LookupKind): ColumnDef<TaskLookup>[] {
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

function buildLookupPayload(kind: LookupKind, values: TaskLookupFormValues, row?: TaskLookup) {
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

function LookupDialog({
  kind,
  title,
  row,
  open,
  onClose,
  onSubmit,
  loading,
}: {
  kind: LookupKind;
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
