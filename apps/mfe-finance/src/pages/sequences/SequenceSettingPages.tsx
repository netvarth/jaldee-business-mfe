import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Icon,
  Input,
  PageHeader,
  SectionCard,
  Select,
  Switch,
  Textarea,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useMFEProps } from "@jaldee/auth-context";
import { financeApi, sanitizeFinancePayload } from "../../lib/financeApi";
import { DataTableCard, FinanceFeatureLayout, PageShell } from "../../components/FinancePageLayout";

type FinanceFeatureModule = "FINANCE_CORE" | "FINANCE_INVOICE" | "FINANCE_PAYMENT" | "FINANCE_EXPENSE";
const financeFeatureModuleOptions: Array<{ value: FinanceFeatureModule; label: string }> = [
  { value: "FINANCE_CORE", label: "Finance Core" }, { value: "FINANCE_INVOICE", label: "Finance Invoice" },
  { value: "FINANCE_PAYMENT", label: "Finance Payment" }, { value: "FINANCE_EXPENSE", label: "Finance Expense" },
];

function SequenceSettingsPage() {
  const navigate = useNavigate();
  const [settingsRows, setSettingsRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await financeApi.sequenceSettings.list<any>({
        page: 0,
        size: 100,
        sort: [{ field: "createdAt", direction: "DESC" }],
        filters: {
          field: "feature",
          operator: "EQ",
          values: ["FINANCE"],
        },
        // view: "SUMMARY",
      });
      const payload = Array.isArray(res.data?.content)
        ? res.data.content
        : Array.isArray(res.data?.data?.content)
          ? res.data.data.content
          : Array.isArray(res.data)
            ? res.data
            : [];
      setSettingsRows(payload);
    } catch (error) {
      console.error("Failed to fetch sequence settings", error);
      setSettingsRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      { key: "locationUid", header: "Location UID" },
      { key: "storeUid", header: "Store UID" },
      { key: "feature", header: "Feature" },
      { key: "featureModule", header: "Feature Module" },
      {
        key: "details",
        header: "Details",
        align: "right",
        render: (row) => String(Array.isArray(row.details) ? row.details.length : 0),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <Badge variant={row.status === "Enabled" ? "success" : "neutral"}>{row.status || "Disabled"}</Badge>,
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`edit/${row.uid}`)}>
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const nextStatus = row.status === "Enabled" ? "Disabled" : "Enabled";
                try {
                  await financeApi.sequenceSettings.updateStatus(row.uid, nextStatus);
                  loadSettings();
                } catch (error) {
                  console.error("Failed to update sequence setting status", error);
                  alert("Failed to update sequence setting status");
                }
              }}
            >
              {row.status === "Enabled" ? "Disable" : "Enable"}
            </Button>
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <FinanceFeatureLayout
      title="Sequence Settings"
      subtitle="Manage finance sequence settings that drive numbering contexts."
      actions={<Button onClick={() => navigate("create")}>Create Sequence Setting</Button>}
      main={
        <DataTableCard
          title="Sequence Settings List"
          subtitle="Finance sequence settings."
          data={settingsRows}
          columns={columns}
          getRowId={(row) => String(row.uid)}
          emptyTitle="No sequence settings"
          emptyDescription={loading ? "Loading..." : "Sequence settings will appear here."}
        />
      }
    />
  );
}

function SequenceSettingCreatePage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const navigateToSequenceSettingsList = () => navigate("..", { relative: "path", replace: true });
  const locationRecord = (mfeProps.location ?? {}) as Record<string, unknown>;
  const defaultLocationUid = String(locationRecord.uid ?? locationRecord.locationUid ?? locationRecord.id ?? "");
  const defaultStoreUid = String(locationRecord.storeUid ?? locationRecord.storeId ?? "");

  const [locationUid, setLocationUid] = useState(defaultLocationUid);
  const [storeUid, setStoreUid] = useState(defaultStoreUid);
  const [feature, setFeature] = useState<SequenceTemplateFeature>("FINANCE");
  const [subFeature, setSubFeature] = useState<SequenceTemplateFeature>("FINANCE");
  const [featureModule, setFeatureModule] = useState<FinanceFeatureModule>("FINANCE_CORE");
  const [financeModule, setFinanceModule] = useState<FinanceFeatureModule>("FINANCE_CORE");
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState("Enabled");
  const [sequenceTemplateOptions, setSequenceTemplateOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [details, setDetails] = useState<any[]>([
    {
      sequenceTemplateUid: "",
      prefix: "",
      suffix: "",
      status: "Enabled",
      isDefault: true,
    },
  ]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadSequenceTemplates() {
      try {
        const res = await financeApi.sequenceTemplates.list<any>({
          page: 0,
          size: 100,
          sort: [{ field: "createdAt", direction: "DESC" }],
          filters: {
            field: "feature",
            operator: "EQ",
            values: ["FINANCE"],
          },
          // view: "SUMMARY",
        });
        const payload = Array.isArray(res.data?.content)
          ? res.data.content
          : Array.isArray(res.data?.data?.content)
            ? res.data.data.content
            : Array.isArray(res.data)
              ? res.data
              : [];
        if (!active) return;
        setSequenceTemplateOptions(
          payload.map((item: any) => ({
            value: String(item.uid),
            label: String(item.name || item.templateName || item.uid),
          }))
        );
      } catch (error) {
        console.error("Failed to load sequence templates", error);
      }
    }
    loadSequenceTemplates();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!locationUid.trim()) {
      setFormError("Location UID is required.");
      return;
    }
    if (details.length === 0) {
      setFormError("At least one detail is required.");
      return;
    }
    if (details.some((item) => !String(item.sequenceTemplateUid || "").trim())) {
      setFormError("Sequence template is required for every detail.");
      return;
    }

    setSubmitting(true);
    try {
      await financeApi.sequenceSettings.create({
        locationUid: locationUid.trim(),
        storeUid: storeUid.trim() || undefined,
        feature,
        subFeature,
        featureModule,
        financeModule,
        remarks: remarks.trim() || undefined,
        status,
        details: details.map((item) => ({
          locationUid: locationUid.trim(),
          storeUid: storeUid.trim() || undefined,
          feature,
          subFeature,
          featureModule,
          financeModule,
          sequenceTemplateUid: String(item.sequenceTemplateUid).trim(),
          prefix: String(item.prefix || "").trim() || undefined,
          suffix: String(item.suffix || "").trim() || undefined,
          status: item.status || "Enabled",
          isDefault: Boolean(item.isDefault),
        })),
      });
      navigateToSequenceSettingsList();
    } catch (error) {
      console.error("[mfe-finance] Failed to create sequence setting", error);
      setFormError(error instanceof Error ? error.message : "Could not create sequence setting.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Create Sequence Setting"
      subtitle="Create a finance sequence setting."
      actions={<Button variant="outline" onClick={navigateToSequenceSettingsList}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Location UID *" value={locationUid} onChange={(event) => setLocationUid(event.target.value)} required />
            <Input label="Store UID" value={storeUid} onChange={(event) => setStoreUid(event.target.value)} />
            <Select label="Feature" value={feature} onChange={(event) => setFeature(event.target.value as SequenceTemplateFeature)} options={sequenceTemplateFeatureOptions} />
            <Select label="Sub Feature" value={subFeature} onChange={(event) => setSubFeature(event.target.value as SequenceTemplateFeature)} options={sequenceTemplateFeatureOptions} />
            <Select label="Feature Module" value={featureModule} onChange={(event) => setFeatureModule(event.target.value as FinanceFeatureModule)} options={financeFeatureModuleOptions} />
            <Select label="Finance Module" value={financeModule} onChange={(event) => setFinanceModule(event.target.value as FinanceFeatureModule)} options={financeFeatureModuleOptions} />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={[
                { value: "Enabled", label: "Enabled" },
                { value: "Disabled", label: "Disabled" },
              ]}
            />
          </div>
          <Textarea label="Remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
          <SectionCard title="Details" className="border-slate-200 shadow-none">
            <div className="grid gap-4">
              {details.map((detail, index) => (
                <div key={`sequence-detail-${index}`} className="grid gap-4 rounded-lg border border-slate-200 p-4 md:grid-cols-2">
                  <Select
                    label="Sequence Template *"
                    value={detail.sequenceTemplateUid}
                    onChange={(event) =>
                      setDetails((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, sequenceTemplateUid: event.target.value } : item
                        )
                      )
                    }
                    options={[{ value: "", label: "Select template" }, ...sequenceTemplateOptions]}
                  />
                  <Select
                    label="Detail Status"
                    value={detail.status}
                    onChange={(event) =>
                      setDetails((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, status: event.target.value } : item))
                      )
                    }
                    options={[
                      { value: "Enabled", label: "Enabled" },
                      { value: "Disabled", label: "Disabled" },
                    ]}
                  />
                  <Input
                    label="Prefix"
                    maxLength={4}
                    value={detail.prefix}
                    onChange={(event) =>
                      setDetails((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, prefix: event.target.value } : item))
                      )
                    }
                  />
                  <Input
                    label="Suffix"
                    maxLength={6}
                    value={detail.suffix}
                    onChange={(event) =>
                      setDetails((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, suffix: event.target.value } : item))
                      )
                    }
                  />
                  <div className="flex items-center gap-3 pt-2">
                    <Switch
                      checked={Boolean(detail.isDefault)}
                      onChange={(checked) =>
                        setDetails((current) =>
                          current.map((item, itemIndex) => ({
                            ...item,
                            isDefault: itemIndex === index ? checked : checked ? false : item.isDefault,
                          }))
                        )
                      }
                    />
                    <label className="text-sm font-semibold text-slate-700">Default Detail</label>
                  </div>
                  <div className="flex items-end justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setDetails((current) => (current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)))
                      }
                      disabled={details.length === 1}
                    >
                      Remove Detail
                    </Button>
                  </div>
                </div>
              ))}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setDetails((current) => [
                      ...current,
                      {
                        sequenceTemplateUid: "",
                        prefix: "",
                        suffix: "",
                        status: "Enabled",
                        isDefault: current.length === 0,
                      },
                    ])
                  }
                >
                  Add Detail
                </Button>
              </div>
            </div>
          </SectionCard>
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={navigateToSequenceSettingsList}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create Setting"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function SequenceSettingEditPage() {
  const navigate = useNavigate();
  const navigateToSequenceSettingsList = () => navigate("../..", { relative: "path", replace: true });
  const { id } = useParams<{ id: string }>();
  const [locationUid, setLocationUid] = useState("");
  const [storeUid, setStoreUid] = useState("");
  const [feature, setFeature] = useState<SequenceTemplateFeature>("FINANCE");
  const [subFeature, setSubFeature] = useState<SequenceTemplateFeature>("FINANCE");
  const [featureModule, setFeatureModule] = useState<FinanceFeatureModule>("FINANCE_CORE");
  const [financeModule, setFinanceModule] = useState<FinanceFeatureModule>("FINANCE_CORE");
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState("Enabled");
  const [sequenceTemplateOptions, setSequenceTemplateOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [details, setDetails] = useState<any[]>([]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadSequenceTemplates() {
      try {
        const res = await financeApi.sequenceTemplates.list<any>({
          page: 0,
          size: 100,
          sort: [{ field: "createdAt", direction: "DESC" }],
          filters: {
            field: "feature",
            operator: "EQ",
            values: ["FINANCE"],
          },
          // view: "SUMMARY",
        });
        const payload = Array.isArray(res.data?.content)
          ? res.data.content
          : Array.isArray(res.data?.data?.content)
            ? res.data.data.content
            : Array.isArray(res.data)
              ? res.data
              : [];
        if (!active) return;
        setSequenceTemplateOptions(
          payload.map((item: any) => ({
            value: String(item.uid),
            label: String(item.name || item.templateName || item.uid),
          }))
        );
      } catch (error) {
        console.error("Failed to load sequence templates", error);
      }
    }
    loadSequenceTemplates();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadSetting() {
      if (!id) return;
      try {
        const res = await financeApi.sequenceSettings.detail<any>(id);
        const data = res.data;
        if (active && data) {
          setLocationUid(String(data.locationUid || ""));
          setStoreUid(String(data.storeUid || ""));
          setFeature((data.feature || "FINANCE") as SequenceTemplateFeature);
          setSubFeature((data.subFeature || "FINANCE") as SequenceTemplateFeature);
          setFeatureModule((data.featureModule || "FINANCE_CORE") as FinanceFeatureModule);
          setFinanceModule((data.financeModule || data.featureModule || "FINANCE_CORE") as FinanceFeatureModule);
          setRemarks(String(data.remarks || ""));
          setStatus(String(data.status || "Enabled"));
          setDetails(
            Array.isArray(data.details) && data.details.length > 0
              ? data.details.map((item: any) => ({
                  uid: item.uid,
                  sequenceTemplateUid: String(item.sequenceTemplateUid || ""),
                  prefix: String(item.prefix || ""),
                  suffix: String(item.suffix || ""),
                  status: String(item.status || "Enabled"),
                  isDefault: Boolean(item.isDefault),
                }))
              : [
                  {
                    sequenceTemplateUid: "",
                    prefix: "",
                    suffix: "",
                    status: "Enabled",
                    isDefault: true,
                  },
                ]
          );
        }
      } catch (error) {
        console.error("Failed to load sequence setting", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadSetting();
    return () => {
      active = false;
    };
  }, [id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!locationUid.trim()) {
      setFormError("Location UID is required.");
      return;
    }
    if (details.length === 0) {
      setFormError("At least one detail is required.");
      return;
    }
    if (details.some((item) => !String(item.sequenceTemplateUid || "").trim())) {
      setFormError("Sequence template is required for every detail.");
      return;
    }

    setSaving(true);
    try {
      await financeApi.sequenceSettings.update(id!, {
        uid: id,
        locationUid: locationUid.trim(),
        storeUid: storeUid.trim() || undefined,
        feature,
        subFeature,
        featureModule,
        financeModule,
        remarks: remarks.trim() || undefined,
        status,
        details: details.map((item) => ({
          uid: item.uid || undefined,
          locationUid: locationUid.trim(),
          storeUid: storeUid.trim() || undefined,
          feature,
          subFeature,
          featureModule,
          financeModule,
          sequenceTemplateUid: String(item.sequenceTemplateUid).trim(),
          prefix: String(item.prefix || "").trim() || undefined,
          suffix: String(item.suffix || "").trim() || undefined,
          status: item.status || "Enabled",
          isDefault: Boolean(item.isDefault),
        })),
      });
      navigateToSequenceSettingsList();
    } catch (error) {
      console.error("[mfe-finance] Failed to update sequence setting", error);
      setFormError(error instanceof Error ? error.message : "Could not update sequence setting.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading sequence setting...</div>;
  }

  return (
    <PageShell
      title="Edit Sequence Setting"
      subtitle="Update finance sequence setting details."
      actions={<Button variant="outline" onClick={navigateToSequenceSettingsList}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Location UID *" value={locationUid} onChange={(event) => setLocationUid(event.target.value)} required />
            <Input label="Store UID" value={storeUid} onChange={(event) => setStoreUid(event.target.value)} />
            <Select label="Feature" value={feature} onChange={(event) => setFeature(event.target.value as SequenceTemplateFeature)} options={sequenceTemplateFeatureOptions} />
            <Select label="Sub Feature" value={subFeature} onChange={(event) => setSubFeature(event.target.value as SequenceTemplateFeature)} options={sequenceTemplateFeatureOptions} />
            <Select label="Feature Module" value={featureModule} onChange={(event) => setFeatureModule(event.target.value as FinanceFeatureModule)} options={financeFeatureModuleOptions} />
            <Select label="Finance Module" value={financeModule} onChange={(event) => setFinanceModule(event.target.value as FinanceFeatureModule)} options={financeFeatureModuleOptions} />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={[
                { value: "Enabled", label: "Enabled" },
                { value: "Disabled", label: "Disabled" },
              ]}
            />
          </div>
          <Textarea label="Remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
          <SectionCard title="Details" className="border-slate-200 shadow-none">
            <div className="grid gap-4">
              {details.map((detail, index) => (
                <div key={detail.uid || `sequence-setting-detail-${index}`} className="grid gap-4 rounded-lg border border-slate-200 p-4 md:grid-cols-2">
                  <Select
                    label="Sequence Template *"
                    value={detail.sequenceTemplateUid}
                    onChange={(event) =>
                      setDetails((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, sequenceTemplateUid: event.target.value } : item
                        )
                      )
                    }
                    options={[{ value: "", label: "Select template" }, ...sequenceTemplateOptions]}
                  />
                  <Select
                    label="Detail Status"
                    value={detail.status}
                    onChange={(event) =>
                      setDetails((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, status: event.target.value } : item))
                      )
                    }
                    options={[
                      { value: "Enabled", label: "Enabled" },
                      { value: "Disabled", label: "Disabled" },
                    ]}
                  />
                  <Input
                    label="Prefix"
                    maxLength={4}
                    value={detail.prefix}
                    onChange={(event) =>
                      setDetails((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, prefix: event.target.value } : item))
                      )
                    }
                  />
                  <Input
                    label="Suffix"
                    maxLength={6}
                    value={detail.suffix}
                    onChange={(event) =>
                      setDetails((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, suffix: event.target.value } : item))
                      )
                    }
                  />
                  <div className="flex items-center gap-3 pt-2">
                    <Switch
                      checked={Boolean(detail.isDefault)}
                      onChange={(checked) =>
                        setDetails((current) =>
                          current.map((item, itemIndex) => ({
                            ...item,
                            isDefault: itemIndex === index ? checked : checked ? false : item.isDefault,
                          }))
                        )
                      }
                    />
                    <label className="text-sm font-semibold text-slate-700">Default Detail</label>
                  </div>
                  <div className="flex items-end justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setDetails((current) => (current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)))
                      }
                      disabled={details.length === 1}
                    >
                      Remove Detail
                    </Button>
                  </div>
                </div>
              ))}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setDetails((current) => [
                      ...current,
                      {
                        sequenceTemplateUid: "",
                        prefix: "",
                        suffix: "",
                        status: "Enabled",
                        isDefault: current.length === 0,
                      },
                    ])
                  }
                >
                  Add Detail
                </Button>
              </div>
            </div>
          </SectionCard>
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={navigateToSequenceSettingsList}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Update Setting"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

export { SequenceSettingsPage, SequenceSettingCreatePage, SequenceSettingEditPage };
