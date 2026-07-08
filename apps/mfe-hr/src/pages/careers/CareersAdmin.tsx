import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, Badge, Button, Input, Select, Textarea, ErrorState, EmptyState } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useCareersSite, usePostings, type JobPosting, type CareersSite } from "../../services/useCareers";
import { useShellErrorToast, useShellFeedback } from "../../services/useShellFeedback";
import RecruitmentLayout from "../recruitment/RecruitmentLayout";

const templateOptions = [
  { value: "classic", label: "Classic" },
  { value: "split", label: "Split" },
  { value: "minimal", label: "Minimal" },
];

export default function CareersAdmin() {
  const navigate = useNavigate();
  const { toast, track, capture } = useShellFeedback("hr.recruitment.careers");
  const site = useCareersSite();
  const { data: postings, loading, error, setStatus } = usePostings();
  useShellErrorToast("hr.recruitment.careers", "Careers", error || site.error);

  const [busy, setBusy] = useState<string | null>(null);

  const openEdit = (p: JobPosting) => { if (p.requisitionUid) navigate(`/recruitment/careers/publish/${p.requisitionUid}`); };

  const doStatus = async (uid: string, status: JobPosting["status"]) => {
    setBusy(uid);
    try {
      await setStatus(uid, status!);
      toast("success", "Careers", status === "PUBLISHED" ? "Job published." : "Job unpublished.");
      track("posting_status_changed", { status });
    } catch (e) {
      capture(e, { postingUid: uid, status });
      toast("error", "Careers", e instanceof Error ? e.message : "Status update failed.");
    } finally {
      setBusy(null);
    }
  };

  const columns: ColumnDef<JobPosting>[] = [
    { header: "Title", key: "title", render: (r) => (
      <div><div className="font-medium text-gray-900">{r.title}</div>
        <div className="text-xs text-gray-500">/{r.slug}</div></div>
    ) },
    { header: "Location", key: "locationText", render: (r) => r.locationText || "—" },
    { header: "Applies", key: "applyCount", render: (r) => r.applyCount ?? 0 },
    { header: "Status", key: "status", render: (r) => {
      const v = String(r.status);
      const variant = v === "PUBLISHED" ? "success" : v === "CLOSED" ? "danger" : "neutral";
      return <Badge variant={variant}>{v}</Badge>;
    } },
    { header: "", key: "uid", align: "right", render: (r) => (
      <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" data-testid={`hr-careers-edit-${r.uid}`} onClick={() => openEdit(r)}>Edit</Button>
        {r.status !== "PUBLISHED" ? (
          <Button variant="primary" size="sm" data-testid={`hr-careers-publish-${r.uid}`} loading={busy === r.uid} onClick={() => doStatus(r.uid!, "PUBLISHED")}>Publish</Button>
        ) : (
          <Button variant="outline" size="sm" data-testid={`hr-careers-unpublish-${r.uid}`} loading={busy === r.uid} onClick={() => doStatus(r.uid!, "CLOSED")}>Unpublish</Button>
        )}
      </div>
    ) },
  ];

  return (
    <RecruitmentLayout title="Careers Page" subtitle="Publish job requisitions to your public careers site.">
    <section id="hr-careers-admin" data-testid="hr-careers-admin" className="space-y-6 p-6">
      <SiteSettings site={site} />

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="font-semibold text-gray-900">Published roles</h3>
            {site.data?.companySlug && (
              <p className="text-xs text-gray-500 mt-0.5">
                Public URL: <span className="text-violet-700">/careers/{site.data.companySlug}/&lt;slug&gt;</span>
              </p>
            )}
          </div>
          <span className="text-xs text-gray-400">Publish jobs from Recruitment → Requisitions</span>
        </div>
        <div className="p-0">
          {error ? (
            <div className="p-6"><ErrorState title="Failed to load postings" description={error} /></div>
          ) : !loading && postings.length === 0 ? (
            <div className="py-12"><EmptyState title="No published roles yet" description="Open Requisitions and click 'Publish to careers' on a role." /></div>
          ) : (
            <DataTable data={postings} columns={columns} loading={loading} />
          )}
        </div>
      </div>

    </section>
    </RecruitmentLayout>
  );
}

function SiteSettings({ site }: { site: ReturnType<typeof useCareersSite> }) {
  const [form, setForm] = useState<CareersSite>(
    site.data ?? { companySlug: "", companyName: "", careersActive: true, defaultTemplate: "classic" }
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Sync once data arrives.
  const [seeded, setSeeded] = useState(false);
  if (!seeded && site.data) { setSeeded(true); setForm(site.data); }

  const set = (k: keyof CareersSite) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try { await site.save(form); setMsg("Saved."); }
    catch (err) { setMsg(err instanceof Error ? err.message : "Failed to save."); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Careers site</h3>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={form.careersActive} onChange={(e) => setForm((p) => ({ ...p, careersActive: e.target.checked }))} />
          Site live
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Company name" value={form.companyName} onChange={set("companyName")} placeholder="Jaldee" />
        <Input label="Company URL slug" value={form.companySlug} onChange={set("companySlug")} placeholder="jaldee" />
      </div>
      <Input label="Tagline" value={form.tagline ?? ""} onChange={set("tagline")} placeholder="The operating system for local businesses" />
      <Textarea label="About the company" value={form.aboutHtml ?? ""} onChange={set("aboutHtml")} rows={3} />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Default template" options={templateOptions} value={form.defaultTemplate ?? "classic"} onChange={set("defaultTemplate")} />
        <Input label="Brand colour (hex)" value={form.primaryColor ?? ""} onChange={set("primaryColor")} placeholder="#5B21D1" />
      </div>
      <div className="flex items-center gap-3">
        <Button variant="primary" type="submit" loading={saving}>Save site</Button>
        {msg && <span className="text-sm text-gray-500">{msg}</span>}
      </div>
    </form>
  );
}
