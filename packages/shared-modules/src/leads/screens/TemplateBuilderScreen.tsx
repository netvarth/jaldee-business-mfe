import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Checkbox, Input, PageHeader, SectionCard, Select, Textarea } from "@jaldee/design-system";
import { ArrowDown, ArrowUp, Copy, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import type { FormField, FormTemplate } from "../types";
import { leadTemplateService } from "../services/templateService";
import { useJaldeeLeadsContext } from "../lib/sharedContext";

type JsonSchemaType = "string" | "number" | "boolean" | "array";

type TemplateField = {
  id: string;
  key: string;
  title: string;
  description: string;
  type: JsonSchemaType;
  itemType: string;
  inputType: string;
  optionType: string;
  defaultValue: string;
  optionsText: string;
  minimum: string;
  maximum: string;
  required: boolean;
};

type TemplateObject = {
  id: string;
  key: string;
  title: string;
  description: string;
  fields: TemplateField[];
  required: boolean;
};

type TemplateItem =
  | { id: string; kind: "field"; field: TemplateField }
  | { id: string; kind: "object"; object: TemplateObject };

type AddModalState =
  | { kind: "field" }
  | { kind: "editField"; itemId: string }
  | { kind: "object" }
  | { kind: "editObject"; itemId: string }
  | { kind: "objectField"; objectId: string }
  | { kind: "editObjectField"; objectId: string; fieldId: string }
  | null;

interface TemplateBuilderScreenProps {
  onSave: (template: FormTemplate) => void | Promise<void>;
  initialTemplate?: FormTemplate | null;
}

const fieldTypeOptions = [
  { value: "string", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "array", label: "Array" },
];

const itemTypeOptions = [
  { value: "textBox", label: "Text box" },
  { value: "textArea", label: "Text area" },
  { value: "options", label: "Options" },
  { value: "dropDown", label: "Dropdown" },
  { value: "radioButton", label: "Radio button" },
  { value: "checkbox", label: "Checkbox" },
  { value: "toggle", label: "Toggle" },
  { value: "email", label: "Email" },
];

const inputTypeOptions = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "number", label: "Number" },
  { value: "float", label: "Float" },
  { value: "dropdown", label: "Dropdown" },
  { value: "radio", label: "Radio" },
  { value: "array", label: "Array" },
  { value: "multiSelection", label: "Multi selection" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
];

const optionTypeOptions = [
  { value: "", label: "None" },
  { value: "countriesList", label: "Countries list" },
  { value: "statesList", label: "States list" },
];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeField(
  key: string,
  title: string,
  description: string,
  type: JsonSchemaType = "string",
  itemType = "textBox",
  inputType = "text",
  overrides: Partial<TemplateField> = {},
): TemplateField {
  return {
    id: makeId("field"),
    key,
    title,
    description,
    type,
    itemType,
    inputType,
    optionType: "",
    defaultValue: "",
    optionsText: "",
    minimum: "",
    maximum: "",
    required: false,
    ...overrides,
  };
}

function makeObject(key: string, title: string, description: string, fields: TemplateField[] = []): TemplateObject {
  return {
    id: makeId("object"),
    key,
    title,
    description,
    fields,
    required: true,
  };
}

function makeFieldItem(field: TemplateField): TemplateItem {
  return { id: field.id, kind: "field", field };
}

function makeObjectItem(object: TemplateObject): TemplateItem {
  return { id: object.id, kind: "object", object };
}

const initialItems: TemplateItem[] = [];

function optionsToText(options: any[] | undefined) {
  if (!Array.isArray(options)) return "";
  return options
    .map((option) => {
      const value = String(option?.value ?? "").trim();
      const displayName = String(option?.displayName ?? option?.label ?? value).trim();
      return value ? `${value}:${displayName || value}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function schemaFieldToTemplateField(key: string, schema: any, required: string[] = []) {
  const items = schema?.items && typeof schema.items === "object" ? schema.items : null;
  const options = Array.isArray(schema?.options) ? schema.options : Array.isArray(items?.options) ? items.options : undefined;

  return makeField(
    key,
    String(schema?.title ?? key),
    String(schema?.description ?? ""),
    (schema?.type === "number" || schema?.type === "boolean" || schema?.type === "array" ? schema.type : "string") as JsonSchemaType,
    String(schema?.itemType ?? "textBox"),
    String(schema?.inputType ?? "text"),
    {
      optionType: String(schema?.optionType ?? ""),
      defaultValue: schema?.default == null ? "" : String(schema.default),
      optionsText: optionsToText(options),
      minimum: schema?.minimum == null ? "" : String(schema.minimum),
      maximum: schema?.maximum == null ? "" : String(schema.maximum),
      required: required.includes(key),
    },
  );
}

function schemaToItems(schema: unknown) {
  const properties = (schema as any)?.properties;
  if (!properties || typeof properties !== "object") return initialItems;
  const required = Array.isArray((schema as any)?.required) ? (schema as any).required.map(String) : [];

  return Object.entries(properties).map(([key, value]: [string, any]) => {
    if (value?.type === "object") {
      const objectRequired = Array.isArray(value?.required) ? value.required.map(String) : [];
      const objectFields = value?.properties && typeof value.properties === "object"
        ? Object.entries(value.properties).map(([fieldKey, fieldValue]: [string, any]) =>
            schemaFieldToTemplateField(fieldKey, fieldValue, objectRequired),
          )
        : [];

      return makeObjectItem({
        ...makeObject(key, String(value?.title ?? key), String(value?.description ?? ""), objectFields),
        required: required.includes(key),
      });
    }

    return makeFieldItem(schemaFieldToTemplateField(key, value, required));
  });
}

function parseOptions(text: string) {
  return text
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, ...labelParts] = line.split(":");
      const trimmedValue = value.trim();
      return {
        value: trimmedValue,
        displayName: (labelParts.join(":").trim() || trimmedValue).trim(),
      };
    });
}

function buildFieldSchema(field: TemplateField) {
  const schema: Record<string, unknown> = {
    title: field.title.trim() || field.key,
    description: field.description.trim(),
    type: field.type,
    itemType: field.itemType,
    inputType: field.inputType,
  };

  if (field.optionType) schema.optionType = field.optionType;
  if (field.defaultValue) schema.default = field.type === "number" ? Number(field.defaultValue) : field.defaultValue;
  if (field.minimum) schema.minimum = Number(field.minimum);
  if (field.maximum) schema.maximum = Number(field.maximum);

  const options = parseOptions(field.optionsText);
  if (options.length && field.type === "array") {
    schema.items = { type: "string", enum: options.map((option) => option.value), options };
  } else if (options.length) {
    schema.enum = options.map((option) => option.value);
    schema.options = options;
  }

  return schema;
}

function buildTemplateSchema(items: TemplateItem[]) {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  items.forEach((item) => {
    if (item.kind === "field") {
      const fieldKey = item.field.key.trim();
      if (!fieldKey) return;
      properties[fieldKey] = buildFieldSchema(item.field);
      if (item.field.required) required.push(fieldKey);
      return;
    }

    const objectKey = item.object.key.trim();
    if (!objectKey) return;

    const fieldProperties: Record<string, unknown> = {};
    const requiredFields: string[] = [];
    item.object.fields.forEach((field) => {
      const fieldKey = field.key.trim();
      if (!fieldKey) return;
      fieldProperties[fieldKey] = buildFieldSchema(field);
      if (field.required) requiredFields.push(fieldKey);
    });

    properties[objectKey] = {
      type: "object",
      title: item.object.title.trim() || objectKey,
      description: item.object.description.trim(),
      properties: fieldProperties,
      required: requiredFields,
    };
    if (item.object.required) required.push(objectKey);
  });

  return { type: "object", properties, required };
}

function toFormField(field: TemplateField): FormField {
  const options = parseOptions(field.optionsText).map((option) => option.displayName);
  return {
    id: field.key.trim(),
    label: field.title.trim() || field.key.trim(),
    type: field.type === "number" ? "number" : options.length ? "select" : field.type === "boolean" ? "checkbox" : "text",
    required: field.required,
    options: options.length ? options : undefined,
  };
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

function optionLabel(options: { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function FieldSummary({
  field,
  testIdPrefix,
}: {
  field: TemplateField;
  testIdPrefix: string;
}) {
  return (
    <div data-testid={`${testIdPrefix}-summary`} className="grid w-full min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr),160px,120px] sm:items-center">
      <div className="min-w-0">
        <div data-testid={`${testIdPrefix}-summary-name`} className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
          {field.title || field.key || "Untitled input"}
        </div>
        <div className="mt-0.5 truncate font-mono text-xs text-[var(--color-text-secondary)]">{field.key || "no-key"}</div>
      </div>
      <div data-testid={`${testIdPrefix}-summary-input-type`} className="text-sm text-[var(--color-text-secondary)]">
        {optionLabel(inputTypeOptions, field.inputType)}
      </div>
      <div data-testid={`${testIdPrefix}-summary-required`} className="flex justify-start sm:justify-end">
        <Badge variant={field.required ? "warning" : "neutral"}>{field.required ? "Required" : "Optional"}</Badge>
      </div>
    </div>
  );
}

function FieldEditor({
  field,
  onChange,
  testIdPrefix,
}: {
  field: TemplateField;
  onChange: (patch: Partial<TemplateField>) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Input id={`${testIdPrefix}-json-key-input`} data-testid={`${testIdPrefix}-json-key-input`} label="Data key" value={field.key} onChange={(event) => onChange({ key: event.target.value })} placeholder="customerName" />
      <Input id={`${testIdPrefix}-title-input`} data-testid={`${testIdPrefix}-title-input`} label="Input label" value={field.title} onChange={(event) => onChange({ title: event.target.value })} placeholder="Customer name" />
      <Input id={`${testIdPrefix}-description-input`} data-testid={`${testIdPrefix}-description-input`} label="Help text" value={field.description} onChange={(event) => onChange({ description: event.target.value })} placeholder="Shown below the input" />
      <Select id={`${testIdPrefix}-type-select`} data-testid={`${testIdPrefix}-type-select`} label="Data type" value={field.type} onChange={(event) => onChange({ type: event.target.value as JsonSchemaType })} options={fieldTypeOptions} />
      <Select id={`${testIdPrefix}-item-type-select`} data-testid={`${testIdPrefix}-item-type-select`} label="Display style" value={field.itemType} onChange={(event) => onChange({ itemType: event.target.value })} options={itemTypeOptions} />
      <Select id={`${testIdPrefix}-input-type-select`} data-testid={`${testIdPrefix}-input-type-select`} label="Input type" value={field.inputType} onChange={(event) => onChange({ inputType: event.target.value })} options={inputTypeOptions} />
      <Select id={`${testIdPrefix}-option-source-select`} data-testid={`${testIdPrefix}-option-source-select`} label="Option source" value={field.optionType} onChange={(event) => onChange({ optionType: event.target.value })} options={optionTypeOptions} />
      <Input id={`${testIdPrefix}-default-input`} data-testid={`${testIdPrefix}-default-input`} label="Default" value={field.defaultValue} onChange={(event) => onChange({ defaultValue: event.target.value })} />
      <div className="mt-7 flex h-9 items-center">
        <Checkbox
          data-testid={`${testIdPrefix}-required-checkbox`}
          data-active={field.required}
          checked={field.required}
          onChange={(event) => onChange({ required: event.target.checked })}
          label="Required"
        />
      </div>
      <Input id={`${testIdPrefix}-minimum-input`} data-testid={`${testIdPrefix}-minimum-input`} label="Minimum" value={field.minimum} onChange={(event) => onChange({ minimum: event.target.value })} />
      <Input id={`${testIdPrefix}-maximum-input`} data-testid={`${testIdPrefix}-maximum-input`} label="Maximum" value={field.maximum} onChange={(event) => onChange({ maximum: event.target.value })} />
      <Textarea id={`${testIdPrefix}-options-textarea`} data-testid={`${testIdPrefix}-options-textarea`} label="Options" value={field.optionsText} onChange={(event) => onChange({ optionsText: event.target.value })} placeholder={"new:New\nqualified:Qualified"} rows={3} />
    </div>
  );
}

function AddItemModal({
  state,
  fieldDraft,
  objectDraft,
  onFieldChange,
  onObjectChange,
  onClose,
  onConfirm,
}: {
  state: AddModalState;
  fieldDraft: TemplateField;
  objectDraft: TemplateObject;
  onFieldChange: (patch: Partial<TemplateField>) => void;
  onObjectChange: (patch: Partial<TemplateObject>) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!state) return null;

  const title =
    state.kind === "field"
      ? "Add Input"
      : state.kind === "editField"
        ? "Edit Input"
        : state.kind === "object"
        ? "Add Section"
        : state.kind === "editObject"
          ? "Edit Section"
          : state.kind === "objectField"
            ? "Add Section Input"
            : "Edit Section Input";
  const isEdit = state.kind === "editField" || state.kind === "editObject" || state.kind === "editObjectField";
  const isObjectEditor = state.kind === "object" || state.kind === "editObject";

  return (
    <div data-testid="jaldee-leads-template-builder-add-item-dialog-overlay" data-state="open" className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-slate-950/40 p-3 sm:items-center sm:p-4">
      <div data-testid="jaldee-leads-template-builder-add-item-dialog" data-state="open" className="my-3 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-lg bg-white shadow-xl sm:my-6 sm:max-h-[calc(100dvh-3rem)] sm:max-w-4xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="m-0 text-sm font-semibold text-slate-900">{title}</h3>
          <Button id="jaldee-leads-template-builder-add-item-close-button" data-testid="jaldee-leads-template-builder-add-item-close-button" size="sm" variant="ghost" icon={<X size={16} />} onClick={onClose} aria-label="Close modal" />
        </div>

        <div className="overflow-y-auto p-4">
          {isObjectEditor ? (
            <div className="grid gap-3 md:grid-cols-3">
              <Input id="jaldee-leads-template-builder-add-object-json-key-input" data-testid="jaldee-leads-template-builder-add-object-json-key-input" label="Data key" value={objectDraft.key} onChange={(event) => onObjectChange({ key: event.target.value })} placeholder="contactDetails" />
              <Input id="jaldee-leads-template-builder-add-object-title-input" data-testid="jaldee-leads-template-builder-add-object-title-input" label="Section label" value={objectDraft.title} onChange={(event) => onObjectChange({ title: event.target.value })} placeholder="Contact details" />
              <Input id="jaldee-leads-template-builder-add-object-description-input" data-testid="jaldee-leads-template-builder-add-object-description-input" label="Section note" value={objectDraft.description} onChange={(event) => onObjectChange({ description: event.target.value })} placeholder="Groups related inputs" />
              <div className="mt-7 flex h-9 items-center">
                <Checkbox
                  data-testid="jaldee-leads-template-builder-add-object-required-checkbox"
                  data-active={objectDraft.required}
                  checked={objectDraft.required}
                  onChange={(event) => onObjectChange({ required: event.target.checked })}
                  label="Required"
                />
              </div>
            </div>
          ) : (
            <FieldEditor field={fieldDraft} onChange={onFieldChange} testIdPrefix="jaldee-leads-template-builder-add-field" />
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <Button id="jaldee-leads-template-builder-add-item-cancel-button" data-testid="jaldee-leads-template-builder-add-item-cancel-button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button id="jaldee-leads-template-builder-add-item-confirm-button" data-testid="jaldee-leads-template-builder-add-item-confirm-button" icon={isEdit ? <Save size={16} /> : <Plus size={16} />} onClick={onConfirm}>
            {isEdit ? "Save" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TemplateBuilderScreen({ onSave, initialTemplate }: TemplateBuilderScreenProps) {
  const navigate = useNavigate();
  const { account } = useJaldeeLeadsContext();
  const isEditMode = Boolean(initialTemplate?.uid);
  const [templateName, setTemplateName] = useState(initialTemplate?.name ?? "");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<TemplateItem[]>(() => initialTemplate?.templateSchema ? schemaToItems(initialTemplate.templateSchema) : initialItems);
  const [addModal, setAddModal] = useState<AddModalState>(null);
  const [fieldDraft, setFieldDraft] = useState<TemplateField>(() => makeField("", "", "", "string", "textBox", "text"));
  const [objectDraft, setObjectDraft] = useState<TemplateObject>(() => makeObject("", "", ""));
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const templateSchema = useMemo(() => buildTemplateSchema(items), [items]);
  const payload = useMemo(
    () => ({
      templateName: templateName.trim(),
      name: templateName.trim(),
      description: description.trim(),
      templateSchema,
    }),
    [description, templateName, templateSchema],
  );
  const jsonPreview = useMemo(() => JSON.stringify({ templateSchema }, null, 2), [templateSchema]);

  function openAddModal(state: AddModalState) {
    setAddModal(state);
    if (state?.kind === "object") {
      setObjectDraft(makeObject("", "", ""));
    } else if (state?.kind === "field" || state?.kind === "objectField") {
      setFieldDraft(makeField("", "", "", "string", "textBox", "text"));
    }
  }

  function openEditField(itemId: string, field: TemplateField) {
    setFieldDraft({ ...field });
    setAddModal({ kind: "editField", itemId });
  }

  function openEditObject(itemId: string, object: TemplateObject) {
    setObjectDraft({ ...object, fields: [...object.fields] });
    setAddModal({ kind: "editObject", itemId });
  }

  function openEditObjectField(objectId: string, field: TemplateField) {
    setFieldDraft({ ...field });
    setAddModal({ kind: "editObjectField", objectId, fieldId: field.id });
  }

  function confirmAddModal() {
    if (!addModal) return;
    if (addModal.kind === "field") {
      setItems((current) => [...current, makeFieldItem({ ...fieldDraft, id: makeId("field") })]);
    } else if (addModal.kind === "editField") {
      setItems((current) =>
        current.map((item) =>
          item.kind === "field" && item.id === addModal.itemId
            ? { ...item, field: { ...fieldDraft, id: item.field.id } }
            : item,
        ),
      );
    } else if (addModal.kind === "object") {
      setItems((current) => [...current, makeObjectItem({ ...objectDraft, id: makeId("object"), fields: [] })]);
    } else if (addModal.kind === "editObject") {
      setItems((current) =>
        current.map((item) =>
          item.kind === "object" && item.id === addModal.itemId
            ? { ...item, object: { ...objectDraft, id: item.object.id, fields: item.object.fields } }
            : item,
        ),
      );
    } else if (addModal.kind === "objectField") {
      setItems((current) =>
        current.map((item) =>
          item.kind === "object" && item.object.id === addModal.objectId
            ? { ...item, object: { ...item.object, fields: [...item.object.fields, { ...fieldDraft, id: makeId("field") }] } }
            : item,
        ),
      );
    } else {
      setItems((current) =>
        current.map((item) =>
          item.kind === "object" && item.object.id === addModal.objectId
            ? {
                ...item,
                object: {
                  ...item.object,
                  fields: item.object.fields.map((field) =>
                    field.id === addModal.fieldId ? { ...fieldDraft, id: field.id } : field,
                  ),
                },
              }
            : item,
        ),
      );
    }
    setAddModal(null);
  }

  function removeObjectField(objectId: string, fieldId: string) {
    setItems((current) =>
      current.map((item) =>
        item.kind === "object" && item.object.id === objectId
          ? { ...item, object: { ...item.object, fields: item.object.fields.filter((field) => field.id !== fieldId) } }
          : item,
      ),
    );
  }

  async function handleSaveTemplate() {
    setStatus(null);
    if (!templateName.trim()) {
      setStatus("Template name is required.");
      return;
    }
    if (!items.length) {
      setStatus("Add at least one input or section.");
      return;
    }

    const fields = items
      .filter((item): item is Extract<TemplateItem, { kind: "field" }> => item.kind === "field")
      .map((item) => item.field)
      .filter((field) => field.key.trim())
      .map(toFormField);

    const tenantUid = account?.tenantUid ?? account?.id;
    const fallbackTemplate: FormTemplate = {
      uid: makeId("template"),
      name: templateName.trim(),
      fields,
      templateSchema,
    };

    setIsSaving(true);
    try {
      const requestPayload = {
        tenantUid,
        templateName: templateName.trim(),
        status: "ACTIVE",
        templateSchema: JSON.stringify(templateSchema),
        defaultTemplate: false,
        autosuggestion: false,
        autosuggestionType: "",
      };

      const createdTemplate = isEditMode && initialTemplate?.uid
        ? await leadTemplateService.update(
            initialTemplate.uid,
            { ...requestPayload, uid: initialTemplate.uid },
            fields,
            templateSchema,
          )
        : await leadTemplateService.create(requestPayload, fields, templateSchema);

      await onSave(createdTemplate);
      setStatus(isEditMode ? "Template updated." : "Template created. You can select it while creating a product.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create template.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopyJson() {
    await navigator.clipboard?.writeText(jsonPreview);
    setStatus("JSON copied.");
  }

  return (
    <div data-testid="jaldee-leads-template-builder-page" data-state={isSaving ? "loading" : status ? "status" : "idle"} className="h-full overflow-y-auto bg-slate-50 p-4 sm:p-6 md:p-8 pb-24">
      <PageHeader
        title={isEditMode ? "Edit Lead Template" : "Lead Template Builder"}
        subtitle="Build lead intake template JSON in the exact order required."
        back={{ label: "Templates", href: "/leads/templates" }}
        onNavigate={navigate}
        actions={
          <div className="flex items-center gap-2">
            <Button id="jaldee-leads-template-builder-cancel-button" data-testid="jaldee-leads-template-builder-cancel-button" variant="outline" onClick={() => navigate("/leads/templates")}>
              Cancel
            </Button>
            <Button id="jaldee-leads-template-builder-save-button" data-testid="jaldee-leads-template-builder-save-button" icon={<Save size={16} />} loading={isSaving} onClick={handleSaveTemplate}>
              {isEditMode ? "Update template" : "Create template"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.25fr,0.75fr]">
        <div className="flex flex-col gap-4">
          <SectionCard title="Template">
            <div className="grid gap-3 md:grid-cols-2">
              <Input id="jaldee-leads-template-builder-name-input" data-testid="jaldee-leads-template-builder-name-input" label="Template name" value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Customer enquiry form" />
              <Input id="jaldee-leads-template-builder-description-input" data-testid="jaldee-leads-template-builder-description-input" label="Description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Used for website and walk-in leads" />
            </div>
          </SectionCard>

          <SectionCard
            title="Current Template Items"
            actions={
              <>
                <Button id="jaldee-leads-template-builder-add-field-button" data-testid="jaldee-leads-template-builder-add-field-button" size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => openAddModal({ kind: "field" })}>
                  Input
                </Button>
                <Button id="jaldee-leads-template-builder-add-object-button" data-testid="jaldee-leads-template-builder-add-object-button" size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => openAddModal({ kind: "object" })}>
                  Section
                </Button>
              </>
            }
          >
            <div className="flex flex-col gap-3">
              {items.map((item, index) => {
                const itemActions = (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button id={`jaldee-leads-template-builder-item-${item.id}-move-up-button`} data-testid={`jaldee-leads-template-builder-item-${item.id}-move-up-button`} size="sm" variant="ghost" icon={<ArrowUp size={14} />} disabled={index === 0} onClick={() => setItems((current) => moveItem(current, index, -1))} aria-label="Move up" />
                    <Button id={`jaldee-leads-template-builder-item-${item.id}-move-down-button`} data-testid={`jaldee-leads-template-builder-item-${item.id}-move-down-button`} size="sm" variant="ghost" icon={<ArrowDown size={14} />} disabled={index === items.length - 1} onClick={() => setItems((current) => moveItem(current, index, 1))} aria-label="Move down" />
                    {item.kind === "field" ? (
                      <Button id={`jaldee-leads-template-builder-item-${item.id}-edit-button`} data-testid={`jaldee-leads-template-builder-item-${item.id}-edit-button`} size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={() => openEditField(item.id, item.field)} aria-label="Edit input" />
                    ) : (
                      <Button id={`jaldee-leads-template-builder-item-${item.id}-edit-button`} data-testid={`jaldee-leads-template-builder-item-${item.id}-edit-button`} size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={() => openEditObject(item.id, item.object)} aria-label="Edit section" />
                    )}
                    <Button id={`jaldee-leads-template-builder-item-${item.id}-delete-button`} data-testid={`jaldee-leads-template-builder-item-${item.id}-delete-button`} size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={() => setItems((current) => current.filter((currentItem) => currentItem.id !== item.id))} aria-label="Delete item" />
                  </div>
                );

                return (
                  <div key={item.id} data-testid={`jaldee-leads-template-builder-item-${item.id}-row`} className="rounded-lg border border-gray-200 bg-white p-3">
                    {item.kind === "field" ? (
                      <div className="flex items-start justify-between gap-3">
                        <FieldSummary field={item.field} testIdPrefix={`jaldee-leads-template-builder-item-${item.id}`} />
                        {itemActions}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div data-testid={`jaldee-leads-template-builder-object-${item.object.id}-summary`} className="grid w-full min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr),160px,120px] sm:items-center">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{item.object.title || item.object.key || "Untitled section"}</div>
                              <div className="mt-0.5 truncate font-mono text-xs text-[var(--color-text-secondary)]">{item.object.key || "no-key"}</div>
                            </div>
                            <div className="text-sm text-[var(--color-text-secondary)]">{item.object.fields.length} inputs</div>
                            <div className="flex justify-start sm:justify-end">
                              <Badge variant={item.object.required ? "warning" : "neutral"}>{item.object.required ? "Required" : "Optional"}</Badge>
                            </div>
                          </div>
                          {itemActions}
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                          <h4 className="m-0 text-sm font-semibold text-gray-700">Section inputs</h4>
                          <Button id={`jaldee-leads-template-builder-object-${item.object.id}-add-field-button`} data-testid={`jaldee-leads-template-builder-object-${item.object.id}-add-field-button`} size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => openAddModal({ kind: "objectField", objectId: item.object.id })}>
                            Input
                          </Button>
                        </div>

                        {item.object.fields.map((field) => (
                          <div key={field.id} data-testid={`jaldee-leads-template-builder-object-${item.object.id}-field-${field.id}-row`} className="rounded-md border border-gray-100 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <FieldSummary field={field} testIdPrefix={`jaldee-leads-template-builder-object-${item.object.id}-field-${field.id}`} />
                              <div className="flex shrink-0 items-center gap-1">
                                <Button id={`jaldee-leads-template-builder-object-${item.object.id}-field-${field.id}-edit-button`} data-testid={`jaldee-leads-template-builder-object-${item.object.id}-field-${field.id}-edit-button`} size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={() => openEditObjectField(item.object.id, field)} aria-label="Edit section input" />
                                <Button id={`jaldee-leads-template-builder-object-${item.object.id}-field-${field.id}-delete-button`} data-testid={`jaldee-leads-template-builder-object-${item.object.id}-field-${field.id}-delete-button`} size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={() => removeObjectField(item.object.id, field.id)} aria-label="Delete section input" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {items.length === 0 ? (
                <div data-testid="jaldee-leads-template-builder-items-empty-state" data-state="empty" className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                  Add an input or section to start the template.
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Generated JSON" actions={<Button id="jaldee-leads-template-builder-copy-json-button" data-testid="jaldee-leads-template-builder-copy-json-button" size="sm" variant="outline" icon={<Copy size={14} />} onClick={handleCopyJson}>Copy</Button>}>
          <pre data-testid="jaldee-leads-template-builder-json-preview" className="max-h-[720px] overflow-auto rounded-md bg-gray-950 p-4 text-xs leading-5 text-gray-50">{jsonPreview}</pre>
          <Textarea id="jaldee-leads-template-builder-create-payload-textarea" data-testid="jaldee-leads-template-builder-create-payload-textarea" className="mt-3 font-mono text-xs" label="Create payload" value={JSON.stringify(payload, null, 2)} readOnly rows={10} />
          {status ? <p data-testid="jaldee-leads-template-builder-status" data-state={isSaving ? "loading" : "status"} className="mt-3 text-sm text-gray-600">{status}</p> : null}
        </SectionCard>
      </div>

      <AddItemModal
        state={addModal}
        fieldDraft={fieldDraft}
        objectDraft={objectDraft}
        onFieldChange={(patch) => setFieldDraft((current) => ({ ...current, ...patch }))}
        onObjectChange={(patch) => setObjectDraft((current) => ({ ...current, ...patch }))}
        onClose={() => setAddModal(null)}
        onConfirm={confirmAddModal}
      />
    </div>
  );
}
