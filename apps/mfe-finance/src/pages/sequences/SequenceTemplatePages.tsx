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
import { financeApi, sanitizeFinancePayload } from "../../lib/financeApi";
import { DataTableCard, FinanceFeatureLayout, PageShell } from "../../components/FinancePageLayout";

type SequenceTemplateFeature = "FINANCE" | "BOOKING" | "HEALTHCARE" | "BASE_CRM" | "PLATFORM" | "AUTH" | "E_COMMERCE" | "LENDING" | "HR";
const sequenceTemplateFeatureOptions: Array<{ value: SequenceTemplateFeature; label: string }> = [
  { value: "FINANCE", label: "Finance" }, { value: "BOOKING", label: "Booking" },
  { value: "HEALTHCARE", label: "Healthcare" }, { value: "BASE_CRM", label: "Base CRM" },
  { value: "PLATFORM", label: "Platform" }, { value: "AUTH", label: "Auth" },
  { value: "E_COMMERCE", label: "E-Commerce" }, { value: "LENDING", label: "Lending" },
  { value: "HR", label: "HR" },
];

function SequenceTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await financeApi.sequenceTemplates.list<any>({
        page: 0,
        size: 100,
        sort: [{ field: "createdAt", direction: "DESC" }],
        filters: {
          field: "feature",
          operator: "EQ",
          values: ["FINANCE"],
        }
        // view: "SUMMARY",
      });
      const payload = Array.isArray(res.data?.content)
        ? res.data.content
        : Array.isArray(res.data?.data?.content)
          ? res.data.data.content
          : Array.isArray(res.data)
            ? res.data
            : [];
      setTemplates(payload);
    } catch (error) {
      console.error("Failed to fetch sequence templates", error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      { key: "name", header: "Template Name" },
      { key: "feature", header: "Feature", render: (row) => String(row.feature || "FINANCE") },
      { key: "prefix", header: "Prefix" },
      { key: "suffix", header: "Suffix" },
      { key: "remarks", header: "Remarks" },
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
                  await financeApi.sequenceTemplates.updateStatus(row.uid, nextStatus);
                  loadTemplates();
                } catch (error) {
                  console.error("Failed to update sequence template status", error);
                  alert("Failed to update sequence template status");
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
      title="Sequence Templates"
      subtitle="Manage finance numbering templates used by sequence settings and invoice numbering."
      actions={<Button onClick={() => navigate("create")}>Create Sequence Template</Button>}
      main={
        <DataTableCard
          title="Sequence Template List"
          subtitle="Finance sequence templates."
          data={templates}
          columns={columns}
          getRowId={(row) => String(row.uid)}
          emptyTitle="No sequence templates"
          emptyDescription={loading ? "Loading..." : "Sequence templates will appear here."}
        />
      }
    />
  );
}

function SequenceTemplateCreatePage() {
  const navigate = useNavigate();
  const navigateToSequenceTemplateList = () => navigate("..", { relative: "path", replace: true });
  const [name, setName] = useState("");
  const [feature, setFeature] = useState<SequenceTemplateFeature>("FINANCE");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState("Enabled");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Template name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await financeApi.sequenceTemplates.create({
        name: name.trim(),
        feature,
        prefix: prefix.trim() || undefined,
        suffix: suffix.trim() || undefined,
        remarks: remarks.trim() || undefined,
        status,
      });
      navigateToSequenceTemplateList();
    } catch (error) {
      console.error("[mfe-finance] Failed to create sequence template", error);
      setFormError(error instanceof Error ? error.message : "Could not create sequence template.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Create Sequence Template"
      subtitle="Add a finance sequence template for numbering flows."
      actions={<Button variant="outline" onClick={navigateToSequenceTemplateList}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Template Name *" value={name} onChange={(event) => setName(event.target.value)} required />
            <Select
              label="Feature"
              value={feature}
              onChange={(event) => setFeature(event.target.value as SequenceTemplateFeature)}
              options={sequenceTemplateFeatureOptions}
            />
            <Input label="Prefix" value={prefix} maxLength={4} onChange={(event) => setPrefix(event.target.value)} />
            <Input label="Suffix" value={suffix} maxLength={6} onChange={(event) => setSuffix(event.target.value)} />
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
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={navigateToSequenceTemplateList}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create Template"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function SequenceTemplateEditPage() {
  const navigate = useNavigate();
  const navigateToSequenceTemplateList = () => navigate("../..", { relative: "path", replace: true });
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [feature, setFeature] = useState<SequenceTemplateFeature>("FINANCE");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState("Enabled");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadTemplate() {
      if (!id) return;
      try {
        const res = await financeApi.sequenceTemplates.detail<any>(id);
        const data = res.data;
        if (active && data) {
          setName(String(data.name || ""));
          setFeature((data.feature || "FINANCE") as SequenceTemplateFeature);
          setPrefix(String(data.prefix || ""));
          setSuffix(String(data.suffix || ""));
          setRemarks(String(data.remarks || ""));
          setStatus(String(data.status || "Enabled"));
        }
      } catch (error) {
        console.error("Failed to load sequence template", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadTemplate();
    return () => {
      active = false;
    };
  }, [id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Template name is required.");
      return;
    }

    setSaving(true);
    try {
      await financeApi.sequenceTemplates.update(id!, {
        uid: id,
        name: name.trim(),
        feature,
        prefix: prefix.trim() || undefined,
        suffix: suffix.trim() || undefined,
        remarks: remarks.trim() || undefined,
        status,
      });
      navigateToSequenceTemplateList();
    } catch (error) {
      console.error("[mfe-finance] Failed to update sequence template", error);
      setFormError(error instanceof Error ? error.message : "Could not update sequence template.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading sequence template...</div>;
  }

  return (
    <PageShell
      title="Edit Sequence Template"
      subtitle="Update finance sequence template details."
      actions={<Button variant="outline" onClick={navigateToSequenceTemplateList}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Template Name *" value={name} onChange={(event) => setName(event.target.value)} required />
            <Select
              label="Feature"
              value={feature}
              onChange={(event) => setFeature(event.target.value as SequenceTemplateFeature)}
              options={sequenceTemplateFeatureOptions}
            />
            <Input label="Prefix" value={prefix} maxLength={4} onChange={(event) => setPrefix(event.target.value)} />
            <Input label="Suffix" value={suffix} maxLength={6} onChange={(event) => setSuffix(event.target.value)} />
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
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={navigateToSequenceTemplateList}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Update Template"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

export { SequenceTemplatesPage, SequenceTemplateCreatePage, SequenceTemplateEditPage };
