import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Input,
  PageHeader,
  SectionCard,
  RadioGroup,
  Select,
  Textarea,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import {
  useCreateServiceType,
  useServiceTypeByUid,
  useTemplates,
  useTemplatesByuuid,
  useUpdateServiceType,
} from "../queries/memberships";

interface ServiceTypeFormProps {
  source?: string;
  serviceTypeUid?: string;
}

type FormState = {
  categoryName: string;
  templateSchemaId: string;
  remarks: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  categoryName: "",
  templateSchemaId: "",
  remarks: "",
};

function unwrapPayload<T>(value: T): any {
  const maybeWrapped = value as any;

  if (maybeWrapped?.data?.data !== undefined) {
    return maybeWrapped.data.data;
  }

  if (maybeWrapped?.data !== undefined) {
    return maybeWrapped.data;
  }

  return maybeWrapped;
}

function unwrapList(value: unknown): any[] {
  const payload = unwrapPayload(value);

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.content)) {
    return payload.content;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

function parseTemplateSchema(templateSchema: unknown) {
  if (!templateSchema) return null;

  if (typeof templateSchema === "string") {
    try {
      return JSON.parse(templateSchema);
    } catch {
      return null;
    }
  }

  if (typeof templateSchema === "object") {
    return templateSchema;
  }

  return null;
}

function buildInitialSchemaValues(schema: any): any {
  if (!schema || typeof schema !== "object") {
    return "";
  }

  if (schema.type === "object") {
    return Object.entries<any>(schema.properties ?? {}).reduce((acc, [key, property]) => {
      acc[key] = buildInitialSchemaValues(property);
      return acc;
    }, {} as Record<string, unknown>);
  }

  if (schema.default !== undefined) {
    return schema.default;
  }

  if (schema.type === "boolean") {
    return false;
  }

  if (schema.type === "array") {
    return [];
  }

  return "";
}

function normalizeArrayValue(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSchemaOptions(schema: any) {
  if (Array.isArray(schema?.options) && schema.options.length > 0) {
    return schema.options.map((option: any) => ({
      value: String(option?.value ?? option),
      label: String(option?.displayName ?? option?.label ?? option?.value ?? option),
    }));
  }

  if (Array.isArray(schema?.enum) && schema.enum.length > 0) {
    return schema.enum.map((option: unknown) => ({
      value: String(option ?? ""),
      label: String(option ?? ""),
    }));
  }

  if (Array.isArray(schema?.items?.options) && schema.items.options.length > 0) {
    return schema.items.options.map((option: any) => ({
      value: String(option?.value ?? option),
      label: String(option?.displayName ?? option?.label ?? option?.value ?? option),
    }));
  }

  if (Array.isArray(schema?.items?.enum) && schema.items.enum.length > 0) {
    return schema.items.enum.map((option: unknown) => ({
      value: String(option ?? ""),
      label: String(option ?? ""),
    }));
  }

  return [];
}

type TemplateSchemaFieldProps = {
  fieldKey: string;
  schema: any;
  value: any;
  required: boolean;
  onChange: (value: any) => void;
};

function TemplateSchemaField({ fieldKey, schema, value, required, onChange }: TemplateSchemaFieldProps) {
  const label = String(schema?.title ?? fieldKey);
  const description = String(schema?.description ?? "").trim();
  const options = getSchemaOptions(schema);
  const itemType = String(schema?.itemType ?? "");
  const inputType = String(schema?.inputType ?? schema?.type ?? "text");

  if (schema?.type === "object" && schema?.properties) {
    const requiredFields = Array.isArray(schema.required) ? schema.required : [];

    return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">{label}</div>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries<any>(schema.properties).map(([childKey, childSchema]) => (
            <TemplateSchemaField
              key={childKey}
              fieldKey={childKey}
              schema={childSchema}
              value={value?.[childKey]}
              required={requiredFields.includes(childKey)}
              onChange={(nextValue) =>
                onChange({
                  ...(value && typeof value === "object" ? value : {}),
                  [childKey]: nextValue,
                })
              }
            />
          ))}
        </div>
      </div>
    );
  }

  if (schema?.type === "boolean" || itemType === "checkbox" || itemType === "toggle" || inputType === "boolean") {
    return (
      <div className="space-y-2">
        <Checkbox
          label={label}
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
    );
  }

  if ((itemType === "radioButton" || inputType === "radio") && options.length > 0) {
    return (
      <div className="space-y-2">
        <RadioGroup
          label={label}
          name={fieldKey}
          value={String(value ?? "")}
          onChange={(nextValue) => onChange(nextValue)}
          options={options}
        />
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
    );
  }

  if ((itemType === "dropDown" || itemType === "options" || inputType === "dropdown") && options.length > 0) {
    return (
      <Select
        label={label}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        options={options}
        placeholder={`Select ${label}`}
        required={required}
      />
    );
  }

  if (schema?.type === "array") {
    return (
      <Textarea
        label={label}
        rows={3}
        value={Array.isArray(value) ? value.join(", ") : ""}
        onChange={(event) => onChange(normalizeArrayValue(event.target.value))}
        hint={description || "Enter multiple values separated by commas."}
        required={required}
      />
    );
  }

  if (itemType === "textArea" || inputType === "textarea") {
    return (
      <Textarea
        label={label}
        rows={4}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        hint={description || undefined}
        required={required}
      />
    );
  }

  const resolvedInputType =
    inputType === "number" || inputType === "float"
      ? "number"
      : inputType === "date" || inputType === "time" || inputType === "email"
        ? inputType
        : "text";

  return (
    <Input
      label={label}
      type={resolvedInputType}
      value={value === undefined || value === null ? "" : String(value)}
      onChange={(event) =>
        onChange(
          resolvedInputType === "number"
            ? event.target.value
            : event.target.value
        )
      }
      hint={description || undefined}
      required={required}
    />
  );
}

export function ServiceTypeForm({ source, serviceTypeUid }: ServiceTypeFormProps) {
  const { basePath } = useSharedModulesContext();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [templatePreviewValues, setTemplatePreviewValues] = useState<Record<string, unknown>>({});

  const isUpdate = source === "update" && Boolean(serviceTypeUid);

  const templatesQuery = useTemplates({
    "status-eq": "Enabled",
    "templateType-eq": "SERVICE",
  });
  const selectedTemplateQuery = useTemplatesByuuid(form.templateSchemaId);
  const serviceTypeDetailsQuery = useServiceTypeByUid(serviceTypeUid ?? "");
  const createMutation = useCreateServiceType();
  const updateMutation = useUpdateServiceType();

  const templates = useMemo(() => unwrapList(templatesQuery.data), [templatesQuery.data]);
  const selectedTemplate = useMemo(
    () => unwrapPayload(selectedTemplateQuery.data),
    [selectedTemplateQuery.data]
  );
  const serviceTypeDetails = useMemo(
    () => unwrapPayload(serviceTypeDetailsQuery.data),
    [serviceTypeDetailsQuery.data]
  );
  const selectedTemplateSchema = useMemo(
    () => parseTemplateSchema(selectedTemplate?.templateSchema),
    [selectedTemplate]
  );

  useEffect(() => {
    if (!isUpdate || !serviceTypeDetails) return;

    setForm({
      categoryName: String(serviceTypeDetails.categoryName ?? serviceTypeDetails.name ?? ""),
      templateSchemaId: String(
        serviceTypeDetails.templateSchemaId?.uid ??
        serviceTypeDetails.templateSchemaId?.id ??
        serviceTypeDetails.templateSchema?.uid ??
        serviceTypeDetails.templateSchema?.id ??
        serviceTypeDetails.template?.uid ??
        serviceTypeDetails.template?.id ??
        serviceTypeDetails.templateUid ??
        serviceTypeDetails.templateSchemaUid ??
        serviceTypeDetails.templateSchemaId ??
        ""
      ),
      remarks: String(serviceTypeDetails.remarks ?? ""),
    });
  }, [isUpdate, serviceTypeDetails]);

  useEffect(() => {
    if (!selectedTemplateSchema?.properties) {
      setTemplatePreviewValues({});
      return;
    }

    setTemplatePreviewValues(buildInitialSchemaValues(selectedTemplateSchema));
  }, [selectedTemplateSchema]);

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!form.categoryName.trim()) nextErrors.categoryName = "Service type name is required.";
    if (!form.templateSchemaId) nextErrors.templateSchemaId = "Details form is required.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    const normalizedTemplateUid = form.templateSchemaId.trim();
    const payload = {
      categoryName: form.categoryName.trim(),
      name: form.categoryName.trim(),
      templateSchemaId: {
        uid: normalizedTemplateUid,
      },
      templateSchemaUid: normalizedTemplateUid,
      templateUid: normalizedTemplateUid,
      remarks: form.remarks.trim() || undefined,
      status: isUpdate ? (serviceTypeDetails?.status ?? "Enabled") : "Enabled",
    };

    try {
      setFormError(null);

      if (isUpdate && serviceTypeUid) {
        await updateMutation.mutateAsync({ id: serviceTypeUid, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      window.location.assign(`${basePath}/serviceType`);
    } catch (error: any) {
      setFormError(
        typeof error?.message === "string"
          ? error.message
          : isUpdate
            ? "Unable to update the service type."
            : "Unable to create the service type."
      );
    }
  }

  const templateOptions = useMemo(
    () => templates.map((item: any) => ({
      value: String(item.uid ?? ""),
      label: String(item.templateName ?? item.name ?? "Unnamed template"),
    })),
    [templates]
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isLoadingInitial = isUpdate && serviceTypeDetailsQuery.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isUpdate ? "Update Service Type" : "Create Service Type"}
        back={{ label: "Back", href: `${basePath}/serviceType` }}
        onNavigate={(href) => window.location.assign(href)}
      />

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="space-y-6 md:max-w-3xl">
          {formError ? <Alert variant="danger">{formError}</Alert> : null}

          <Input
            label="Service Type Name"
            value={form.categoryName}
            onChange={(event) => setField("categoryName", event.target.value)}
            error={errors.categoryName}
            disabled={isLoadingInitial}
            required
          />

          <Select
            label="Details Form"
            value={form.templateSchemaId}
            onChange={(event) => setField("templateSchemaId", event.target.value)}
            options={templateOptions}
            placeholder="Select details form"
            error={errors.templateSchemaId}
            disabled={isLoadingInitial}
            required
          />

          {form.templateSchemaId ? (
            selectedTemplateQuery.isLoading ? (
              <div className="text-sm text-slate-500">Loading template schema...</div>
            ) : selectedTemplateSchema?.properties ? (
              <SectionCard
                title="Template Schema Preview"
                className="border-slate-200 bg-slate-50/50 shadow-none"
              >
                <div className="space-y-4">
                  <p className="m-0 text-sm text-slate-500">
                    Preview of the selected service template fields.
                  </p>

                  <div className="grid gap-4 md:grid-cols-2">
                    {Object.entries<any>(selectedTemplateSchema.properties).map(([fieldKey, fieldSchema]) => (
                      <TemplateSchemaField
                        key={fieldKey}
                        fieldKey={fieldKey}
                        schema={fieldSchema}
                        value={templatePreviewValues[fieldKey]}
                        required={Array.isArray(selectedTemplateSchema.required) && selectedTemplateSchema.required.includes(fieldKey)}
                        onChange={(value) =>
                          setTemplatePreviewValues((current) => ({
                            ...current,
                            [fieldKey]: value,
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>
              </SectionCard>
            ) : (
              <Alert variant="warning">
                The selected template does not contain a valid schema.
              </Alert>
            )
          ) : null}

          <Textarea
            label="Remarks"
            rows={4}
            value={form.remarks}
            onChange={(event) => setField("remarks", event.target.value)}
            disabled={isLoadingInitial}
          />

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => window.location.assign(`${basePath}/serviceType`)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={isSubmitting}>
              {isUpdate ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
