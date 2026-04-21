import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Input,
  PageHeader,
  SectionCard,
  Select,
  Textarea,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import {
  useCreateServiceType,
  useServiceTypeByUid,
  useTemplates,
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
  return Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
}

export function ServiceTypeForm({ source, serviceTypeUid }: ServiceTypeFormProps) {
  const { basePath } = useSharedModulesContext();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const isUpdate = source === "update" && Boolean(serviceTypeUid);

  const templatesQuery = useTemplates({
    "status-eq": "Enabled",
    "templateType-eq": "SERVICE",
  });
  const serviceTypeDetailsQuery = useServiceTypeByUid(serviceTypeUid ?? "");
  const createMutation = useCreateServiceType();
  const updateMutation = useUpdateServiceType();

  const templates = useMemo(() => unwrapList(templatesQuery.data), [templatesQuery.data]);
  const serviceTypeDetails = useMemo(
    () => unwrapPayload(serviceTypeDetailsQuery.data),
    [serviceTypeDetailsQuery.data]
  );

  useEffect(() => {
    if (!isUpdate || !serviceTypeDetails) return;

    setForm({
      categoryName: String(serviceTypeDetails.categoryName ?? ""),
      templateSchemaId: String(
        serviceTypeDetails.templateSchemaId?.uid ??
        serviceTypeDetails.templateSchemaId ??
        ""
      ),
      remarks: String(serviceTypeDetails.remarks ?? ""),
    });
  }, [isUpdate, serviceTypeDetails]);

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

    const payload = {
      categoryName: form.categoryName.trim(),
      templateSchemaId: {
        uid: form.templateSchemaId,
      },
      remarks: form.remarks.trim() || undefined,
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
