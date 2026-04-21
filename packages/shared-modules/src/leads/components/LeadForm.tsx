import { Alert, Button, Checkbox, Input, PageHeader, PhoneInput, SectionCard, Select } from "@jaldee/design-system";
import { useEffect, useMemo, useState } from "react";
import { useSharedModulesContext } from "../../context";
import {
  useChannelTemplates,
  useChannels,
  useCreateLead,
  useCreateLeadCustomer,
  useLeadByUid,
  useProviderUsers,
  useUpdateLead,
} from "../queries/leads";
import { unwrapList, unwrapPayload } from "../utils";

type LeadFormProps = {
  mode: "create" | "update";
  recordId?: string;
};

type ProspectFormState = {
  firstName: string;
  lastName: string;
  countryCode: string;
  phone: string;
  email: string;
};

type LeadCoreFormState = {
  channel: string;
  leadOwner: string;
};

type DynamicFieldDefinition = {
  key: string;
  path: string[];
  label: string;
  type: string;
  required: boolean;
  options?: Array<{ value: string; label: string }>;
};

type FormErrors = Record<string, string>;

const EMPTY_PROSPECT: ProspectFormState = {
  firstName: "",
  lastName: "",
  countryCode: "+91",
  phone: "",
  email: "",
};

const EMPTY_LEAD: LeadCoreFormState = {
  channel: "",
  leadOwner: "",
};

function normalizeFieldType(schema: any) {
  if (Array.isArray(schema?.enum) || Array.isArray(schema?.oneOf)) return "select";
  if (schema?.type === "boolean") return "boolean";
  if (schema?.type === "number" || schema?.type === "integer") return "number";
  if (schema?.format === "date") return "date";
  return "text";
}

function normalizeOptions(schema: any) {
  if (Array.isArray(schema?.enum)) {
    return schema.enum.map((value: any) => ({
      value: String(value),
      label: String(value),
    }));
  }

  if (Array.isArray(schema?.oneOf)) {
    return schema.oneOf
      .filter((option: any) => option?.const !== undefined)
      .map((option: any) => ({
        value: String(option.const),
        label: String(option.title ?? option.label ?? option.const),
      }));
  }

  return [];
}

function collectSchemaFields(schema: any, parentPath: string[] = [], inheritedRequired = false): DynamicFieldDefinition[] {
  if (!schema?.properties || typeof schema.properties !== "object") {
    return [];
  }

  const requiredSet = new Set<string>(Array.isArray(schema.required) ? schema.required : []);

  return Object.entries<any>(schema.properties).flatMap(([propertyKey, propertySchema]) => {
    const path = [...parentPath, propertyKey];
    const required = inheritedRequired || requiredSet.has(propertyKey);

    if (propertySchema?.type === "object" && propertySchema?.properties) {
      return collectSchemaFields(propertySchema, path, required);
    }

    return [{
      key: path.join("."),
      path,
      label: String(propertySchema?.title ?? prettifyKey(propertyKey)),
      type: normalizeFieldType(propertySchema),
      required,
      options: normalizeOptions(propertySchema),
    }];
  });
}

function prettifyKey(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function trimPhone(value: string) {
  return value.replace(/[^\d]/g, "");
}

function getNestedValue(source: any, path: string[]) {
  return path.reduce((current, segment) => (current == null ? undefined : current[segment]), source);
}

function setNestedValue(source: any, path: string[], value: any) {
  const next = Array.isArray(source) ? [...source] : { ...(source ?? {}) };
  let cursor = next;

  path.forEach((segment, index) => {
    const isLast = index === path.length - 1;
    if (isLast) {
      cursor[segment] = value;
      return;
    }

    const current = cursor[segment];
    cursor[segment] = current && typeof current === "object" && !Array.isArray(current) ? { ...current } : {};
    cursor = cursor[segment];
  });

  return next;
}

function pruneEmptyValues(value: any): any {
  if (Array.isArray(value)) {
    const cleaned = value.map((item) => pruneEmptyValues(item)).filter((item) => item !== undefined);
    return cleaned.length > 0 ? cleaned : undefined;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, entryValue]) => [key, pruneEmptyValues(entryValue)] as const)
      .filter(([, entryValue]) => entryValue !== undefined);

    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }

  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return value;
}

export function LeadForm({ mode, recordId }: LeadFormProps) {
  const { basePath } = useSharedModulesContext();
  const isUpdate = mode === "update" && !!recordId;
  const [prospect, setProspect] = useState<ProspectFormState>(EMPTY_PROSPECT);
  const [leadForm, setLeadForm] = useState<LeadCoreFormState>(EMPTY_LEAD);
  const [templateValues, setTemplateValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const leadQuery = useLeadByUid(recordId ?? "");
  const channelsQuery = useChannels({ "crmStatus-eq": "ACTIVE" });
  const usersQuery = useProviderUsers({ "status-eq": "ACTIVE" });
  const selectedChannelUid = leadForm.channel || "";
  const channelTemplateQuery = useChannelTemplates(selectedChannelUid);
  const createCustomerMutation = useCreateLeadCustomer();
  const createLeadMutation = useCreateLead();
  const updateLeadMutation = useUpdateLead();

  const lead = useMemo(() => unwrapPayload(leadQuery.data), [leadQuery.data]);
  const channels = useMemo(() => unwrapList(channelsQuery.data), [channelsQuery.data]);
  const users = useMemo(() => unwrapList(usersQuery.data), [usersQuery.data]);
  const channelTemplate = useMemo(() => unwrapPayload(channelTemplateQuery.data), [channelTemplateQuery.data]);

  const schema = useMemo(
    () => channelTemplate?.templateSchema ?? lead?.templateSchema ?? null,
    [channelTemplate?.templateSchema, lead?.templateSchema]
  );
  const dynamicFields = useMemo(() => collectSchemaFields(schema), [schema]);

  useEffect(() => {
    if (!isUpdate || !lead) return;

    setLeadForm({
      channel: String(lead.channelUid ?? ""),
      leadOwner: lead.ownerId ? String(lead.ownerId) : "",
    });

    setTemplateValues(lead.templateSchemaValue && typeof lead.templateSchemaValue === "object" ? lead.templateSchemaValue : {});
  }, [isUpdate, lead]);

  function setLeadField<K extends keyof LeadCoreFormState>(field: K, value: LeadCoreFormState[K]) {
    setLeadForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setFormError(null);
  }

  function setProspectField<K extends keyof ProspectFormState>(field: K, value: ProspectFormState[K]) {
    setProspect((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setFormError(null);
  }

  function setDynamicField(path: string[], value: any) {
    setTemplateValues((current) => setNestedValue(current, path, value));
    setErrors((current) => ({ ...current, [path.join(".")]: "" }));
    setFormError(null);
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!leadForm.channel) {
      nextErrors.channel = "Channel is required.";
    }

    if (!isUpdate) {
      if (!prospect.firstName.trim()) nextErrors.firstName = "First name is required.";
      if (!trimPhone(prospect.phone)) nextErrors.phone = "Phone number is required.";
      if (prospect.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prospect.email.trim())) {
        nextErrors.email = "Enter a valid email address.";
      }
    }

    dynamicFields.forEach((field) => {
      if (!field.required) return;

      const value = getNestedValue(templateValues, field.path);
      const missing =
        field.type === "boolean"
          ? value === undefined || value === null
          : Array.isArray(value)
            ? value.length === 0
            : value === undefined || value === null || String(value).trim() === "";

      if (missing) {
        nextErrors[field.key] = `${field.label} is required.`;
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    try {
      setFormError(null);

      let consumerUid = lead?.consumerUid;

      if (!isUpdate) {
        consumerUid = await createCustomerMutation.mutateAsync({
          firstName: prospect.firstName.trim(),
          lastName: prospect.lastName.trim() || "",
          countryCode: prospect.countryCode,
          phone: trimPhone(prospect.phone),
          email: prospect.email.trim() || undefined,
        });
      }

      const payload: Record<string, any> = {
        channel: { uid: leadForm.channel },
        ownerId: leadForm.leadOwner ? Number(leadForm.leadOwner) : 0,
      };

      if (lead?.location !== undefined) payload.location = lead.location;
      if (consumerUid) payload.consumerUid = consumerUid;

      const cleanedTemplateValues = pruneEmptyValues(templateValues);
      if (schema) {
        payload.templateSchema = schema;
        payload.templateSchemaValue = cleanedTemplateValues ?? {};
      }

      if (isUpdate && recordId) {
        if (lead?.internalStatus) payload.internalStatus = lead.internalStatus;
        if (lead?.uid) payload.uid = lead.uid;
        await updateLeadMutation.mutateAsync({ uid: recordId, data: payload });
        window.location.assign(`${basePath}/leads/details/${recordId}`);
        return;
      }

      await createLeadMutation.mutateAsync(payload);
      window.location.assign(`${basePath}/leads`);
    } catch (submitError: any) {
      setFormError(typeof submitError?.message === "string" ? submitError.message : `Unable to ${isUpdate ? "update" : "create"} lead.`);
    }
  }

  const channelOptions = channels.map((channel: any) => ({
    value: String(channel.uid ?? ""),
    label: String(channel.name ?? channel.channelName ?? "-"),
  }));

  const userOptions = users.map((user: any) => ({
    value: String(user.id ?? ""),
    label: `${String(user.firstName ?? "").trim()} ${String(user.lastName ?? "").trim()}`.trim() || String(user.userName ?? user.id ?? "-"),
  }));

  const busy =
    leadQuery.isLoading ||
    channelsQuery.isLoading ||
    usersQuery.isLoading ||
    channelTemplateQuery.isLoading ||
    createCustomerMutation.isPending ||
    createLeadMutation.isPending ||
    updateLeadMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isUpdate ? "Update Lead" : "Create Lead"}
        back={{ label: "Back", href: isUpdate && recordId ? `${basePath}/leads/details/${recordId}` : `${basePath}/leads` }}
        onNavigate={(href) => window.location.assign(href)}
      />

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="space-y-6">
          {formError ? <Alert variant="danger">{formError}</Alert> : null}

          {!isUpdate ? (
            <div className="space-y-4">
              <div className="rounded-md bg-slate-100 px-4 py-3 text-base font-semibold text-slate-700">Prospect Details</div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="First Name"
                  value={prospect.firstName}
                  onChange={(event) => setProspectField("firstName", event.target.value)}
                  error={errors.firstName}
                  required
                />
                <Input
                  label="Last Name"
                  value={prospect.lastName}
                  onChange={(event) => setProspectField("lastName", event.target.value)}
                />
                <PhoneInput
                  label="Phone"
                  value={{ countryCode: prospect.countryCode, number: prospect.phone }}
                  onChange={(value) => {
                    setProspectField("countryCode", value.countryCode);
                    setProspectField("phone", value.number);
                  }}
                  error={errors.phone}
                  required
                />
                <Input
                  label="Email Id"
                  type="email"
                  value={prospect.email}
                  onChange={(event) => setProspectField("email", event.target.value)}
                  error={errors.email}
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            <div className="rounded-md bg-slate-100 px-4 py-3 text-base font-semibold text-slate-700">Lead Details</div>
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Channel"
                value={leadForm.channel}
                onChange={(event) => setLeadField("channel", event.target.value)}
                options={channelOptions}
                placeholder="Select Channel"
                error={errors.channel}
                disabled={isUpdate}
                required
              />
              <Select
                label="Lead Owner"
                value={leadForm.leadOwner}
                onChange={(event) => setLeadField("leadOwner", event.target.value)}
                options={userOptions}
                placeholder="Select Lead Owner"
              />
            </div>
          </div>

          {dynamicFields.length > 0 ? (
            <div className="space-y-4">
              {dynamicFields.map((field) => {
                const value = getNestedValue(templateValues, field.path);
                const error = errors[field.key];

                if (field.type === "boolean") {
                  return (
                    <Checkbox
                      key={field.key}
                      label={field.label}
                      checked={Boolean(value)}
                      onChange={(event) => setDynamicField(field.path, event.target.checked)}
                      error={error}
                    />
                  );
                }

                if (field.type === "select") {
                  return (
                    <Select
                      key={field.key}
                      label={field.label}
                      value={value === undefined || value === null ? "" : String(value)}
                      onChange={(event) => setDynamicField(field.path, event.target.value)}
                      options={field.options ?? []}
                      placeholder={`Select ${field.label}`}
                      error={error}
                      required={field.required}
                    />
                  );
                }

                return (
                  <Input
                    key={field.key}
                    label={field.label}
                    type={field.type}
                    value={value === undefined || value === null ? "" : String(value)}
                    onChange={(event) => setDynamicField(field.path, field.type === "number" ? event.target.value : event.target.value)}
                    error={error}
                    required={field.required}
                  />
                );
              })}
            </div>
          ) : null}

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => window.location.assign(isUpdate && recordId ? `${basePath}/leads/details/${recordId}` : `${basePath}/leads`)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={busy}>
              {isUpdate ? "Update Lead" : "Create Lead"}
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
