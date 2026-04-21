import { Alert, Button, Input, PageHeader, RichTextEditor, SectionCard, Select, Textarea } from "@jaldee/design-system";
import { useEffect, useMemo, useState } from "react";
import { useSharedModulesContext } from "../../context";
import { useCreateProductType, useLeadTemplates, useProductTypeByUid, useUpdateProductType } from "../queries/leads";
import { PRODUCT_TYPE_OPTIONS, unwrapList, unwrapPayload } from "../utils";

type FormState = {
  typeName: string;
  productEnum: string;
  leadTemplateUid: string;
  displayName: string;
  templateTitle: string;
  description: string;
};

const EMPTY_FORM: FormState = {
  typeName: "",
  productEnum: "",
  leadTemplateUid: "",
  displayName: "",
  templateTitle: "",
  description: "",
};

export function ProductTypeForm({ mode, recordId }: { mode: "create" | "update"; recordId?: string }) {
  const { basePath } = useSharedModulesContext();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const templatesQuery = useLeadTemplates();
  const detailQuery = useProductTypeByUid(recordId ?? "");
  const createMutation = useCreateProductType();
  const updateMutation = useUpdateProductType();
  const isUpdate = mode === "update" && !!recordId;

  const detail = useMemo(() => unwrapPayload(detailQuery.data), [detailQuery.data]);
  const templates = useMemo(
    () => unwrapList(templatesQuery.data).map((item: any) => ({
      value: String(item.uid ?? ""),
      label: String(item.templateName ?? item.name ?? "Unnamed template"),
    })),
    [templatesQuery.data]
  );

  useEffect(() => {
    if (!isUpdate || !detail) return;
    setForm({
      typeName: String(detail.typeName ?? ""),
      productEnum: String(detail.productEnum ?? ""),
      leadTemplateUid: String(detail.leadTemplateDto?.uid ?? ""),
      displayName: String(detail.displayName ?? ""),
      templateTitle: String(detail.templateTitle ?? ""),
      description: String(detail.description ?? ""),
    });
  }, [detail, isUpdate]);

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  async function handleSubmit() {
    if (!form.typeName.trim() || !form.productEnum) {
      setError("Product / service name and category are required.");
      return;
    }

    const payload: any = {
      typeName: form.typeName.trim(),
      productEnum: form.productEnum,
      displayName: form.displayName.trim() || undefined,
      templateTitle: form.templateTitle.trim() || undefined,
      description: form.description.trim() || undefined,
    };

    if (form.leadTemplateUid) {
      payload.leadTemplateDto = { uid: form.leadTemplateUid };
    }

    try {
      if (isUpdate && recordId) {
        await updateMutation.mutateAsync({ uid: recordId, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      window.location.assign(`${basePath}/product-type`);
    } catch (submitError: any) {
      setError(typeof submitError?.message === "string" ? submitError.message : "Unable to save the product / service.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isUpdate ? "Update Product / Service" : "Create Product / Service"}
        back={{ label: "Back", href: `${basePath}/product-type` }}
        onNavigate={(href) => window.location.assign(href)}
      />

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="space-y-6 md:max-w-3xl">
          {error ? <Alert variant="danger">{error}</Alert> : null}

          <Input label="Product / Service Name" value={form.typeName} onChange={(event) => setField("typeName", event.target.value)} required />
          <Select label="Category" value={form.productEnum} onChange={(event) => setField("productEnum", event.target.value)} options={PRODUCT_TYPE_OPTIONS} placeholder="Select category" required />
          <Select label="Lead Template" value={form.leadTemplateUid} onChange={(event) => setField("leadTemplateUid", event.target.value)} options={templates} placeholder="Select template" />
          <Input label="Display Name" value={form.displayName} onChange={(event) => setField("displayName", event.target.value)} />
          <Input label="Template Title" value={form.templateTitle} onChange={(event) => setField("templateTitle", event.target.value)} />
          {isUpdate ? (
            <RichTextEditor
              label="Description"
              value={form.description}
              onChange={(value) => setField("description", value)}
              placeholder="Enter product or service description"
            />
          ) : (
            <Textarea label="Description" rows={5} value={form.description} onChange={(event) => setField("description", event.target.value)} />
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => window.location.assign(`${basePath}/product-type`)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={createMutation.isPending || updateMutation.isPending}>
              {isUpdate ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
