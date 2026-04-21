import { Alert, Button, Input, PageHeader, SectionCard, Select } from "@jaldee/design-system";
import { useEffect, useMemo, useState } from "react";
import { useSharedModulesContext } from "../../context";
import { useChannelByUid, useCreateChannel, useProductTypes, useProviderLocations, useUpdateChannel } from "../queries/leads";
import { CHANNEL_TYPE_OPTIONS, unwrapList, unwrapPayload } from "../utils";

type FormState = {
  name: string;
  channelType: string;
  productTypeUid: string;
  locationId: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  channelType: "",
  productTypeUid: "",
  locationId: "",
};

export function ChannelForm({ mode, recordId }: { mode: "create" | "update"; recordId?: string }) {
  const { basePath } = useSharedModulesContext();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const detailQuery = useChannelByUid(recordId ?? "");
  const productTypesQuery = useProductTypes({ "crmStatus-eq": "ACTIVE" });
  const locationsQuery = useProviderLocations({});
  const createMutation = useCreateChannel();
  const updateMutation = useUpdateChannel();
  const isUpdate = mode === "update" && !!recordId;

  const detail = useMemo(() => unwrapPayload(detailQuery.data), [detailQuery.data]);
  const productOptions = useMemo(
    () => unwrapList(productTypesQuery.data).map((item: any) => ({ value: String(item.uid ?? ""), label: String(item.typeName ?? item.name ?? "-") })),
    [productTypesQuery.data]
  );
  const locationOptions = useMemo(
    () =>
      unwrapList(locationsQuery.data)
        .filter((item: any) => String(item.status ?? "").toUpperCase() === "ACTIVE")
        .map((item: any) => ({ value: String(item.id ?? item.uid ?? ""), label: String(item.place ?? item.name ?? "-") })),
    [locationsQuery.data]
  );

  useEffect(() => {
    if (!isUpdate || !detail) return;
    setForm({
      name: String(detail.name ?? ""),
      channelType: String(detail.channelType ?? ""),
      productTypeUid: String(detail.crmLeadProductTypeDto?.uid ?? ""),
      locationId: String(detail.locationDtos?.[0]?.id ?? ""),
    });
  }, [detail, isUpdate]);

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.channelType || !form.productTypeUid || !form.locationId) {
      setError("Channel name, type, product / service, and location are required.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      channelType: form.channelType,
      crmLeadProductTypeDto: { uid: form.productTypeUid },
      locationDtos: [{ id: form.locationId }],
      attachments: [],
    };

    try {
      if (isUpdate && recordId) {
        await updateMutation.mutateAsync({ uid: recordId, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      window.location.assign(`${basePath}/channels`);
    } catch (submitError: any) {
      setError(typeof submitError?.message === "string" ? submitError.message : "Unable to save the channel.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isUpdate ? "Update Channel" : "Create Channel"}
        back={{ label: "Back", href: `${basePath}/channels` }}
        onNavigate={(href) => window.location.assign(href)}
      />

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="space-y-6">
          {error ? <Alert variant="danger">{error}</Alert> : null}

          <div className="grid gap-6 md:grid-cols-2">
            <Input label="Channel" value={form.name} onChange={(event) => setField("name", event.target.value)} required />
            <Select label="Platform Type" value={form.channelType} onChange={(event) => setField("channelType", event.target.value)} options={CHANNEL_TYPE_OPTIONS} placeholder="Select platform type" required />
            <Select label="Product/Service" value={form.productTypeUid} onChange={(event) => setField("productTypeUid", event.target.value)} options={productOptions} placeholder="Select product / service" required />
            <Select label="Location" value={form.locationId} onChange={(event) => setField("locationId", event.target.value)} options={locationOptions} placeholder="Select location" required />
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => window.location.assign(`${basePath}/channels`)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={createMutation.isPending || updateMutation.isPending}>
              {isUpdate ? "Update Channel" : "Create Channel"}
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
