import { useEffect, useState } from "react";
import { Alert, Badge, Button, Checkbox, DataTable, EmptyState, Input, PageHeader, SectionCard, Select } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../context";
import {
  useCreateTaskTemplate,
  useDeleteTaskTemplate,
  useTaskTemplateById,
  useTaskTemplates,
  useUpdateTaskTemplateRecord,
} from "./queries/tasks";
import type { TaskLocation, TaskLookup, TaskTemplateFieldFlags, TaskTemplateFormValues, TaskTemplateRow, TaskUser } from "./types";
import type { TaskLookupData } from "./taskLookups";
import { useTaskLookups } from "./taskLookups";
import {
  deleteLookup,
  extractErrorMessage,
  getPriorityVariant,
  getUserName,
  normalizeArray,
  normalizeData,
  toOptions,
} from "./taskUtils";

const EMPTY_TEMPLATE_FORM: TaskTemplateFormValues = {
  name: "",
  originFrom: "Order",
  isSubTask: false,
  isSequential: false,
  isAvailable: true,
  fieldFlags: {},
  fieldValues: {},
};

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

export function TaskTemplatesView() {
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
  );
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
    ...EMPTY_TEMPLATE_FORM,
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
    iseditable: field?.iseditable ?? false,
    isvisible: field?.isvisible ?? false,
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
                  <div key={field.key} className="grid min-w-0 gap-3 p-4 xl:grid-cols-[minmax(140px,180px)_minmax(220px,1fr)_minmax(240px,310px)] xl:items-center">
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
                    <div className="grid min-w-0 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,6.5rem),1fr))]">
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
