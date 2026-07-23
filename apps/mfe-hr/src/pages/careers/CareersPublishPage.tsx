import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useJobRequisitions } from "../../services/useRecruitmentData";
import { useCareersSite, usePostings, type JobPosting } from "../../services/useCareers";
import JobPageView, { type JobView } from "./JobPageView";
import type { JobRequisition } from "../../types";

function slugify(s?: string) {
  return (s || "job").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "") || "job";
}

const templates = [
  { value: "classic", label: "Classic" },
  { value: "split", label: "Split" },
  { value: "minimal", label: "Minimal" },
];

/**
 * Full publish flow (mirrors the approved demo): left = public-copy form with the
 * requisition shown read-only; right = live preview; then a generated-link step.
 */
export default function CareersPublishPage() {
  const { requisitionUid } = useParams();
  const navigate = useNavigate();

  const { data: requisitions } = useJobRequisitions();
  const siteHook = useCareersSite();
  const site = siteHook.data;
  const { data: postings, save } = usePostings();

  const requisition: JobRequisition | undefined = requisitions.find((r) => r.id === requisitionUid);
  const existing = postings.find((p) => p.requisitionUid === requisitionUid);

  const [form, setForm] = useState<JobPosting>(
    existing ?? { title: "", requisitionUid, templateKey: site?.defaultTemplate || "classic" }
  );
  const [tagsText, setTagsText] = useState((existing?.tags ?? []).join(", "));
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (existing?.uid) {
      setForm(existing);
      setTagsText((existing.tags ?? []).join(", "));
      return;
    }

    setForm((previous) => {
      if (previous.uid || previous.summary || previous.requirements || previous.responsibilities || previous.benefits || previous.slug) {
        return previous;
      }
      return {
        ...previous,
        requisitionUid,
        templateKey: previous.templateKey || site?.defaultTemplate || "classic",
      };
    });
  }, [existing, requisitionUid, site?.defaultTemplate]);

  const set = (k: keyof JobPosting) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const salaryText = requisition?.salaryMin && requisition?.salaryMax
    ? `${requisition.currency || "₹"} ${requisition.salaryMin}–${requisition.salaryMax}` : undefined;

  // Live preview — requisition core + the public copy being typed.
  const preview: JobView = useMemo(() => ({
    companyName: site?.companyName || "Your company",
    primaryColor: site?.primaryColor,
    templateKey: form.templateKey,
    title: requisition?.title,
    departmentText: requisition?.department,
    locationText: requisition?.location,
    employmentType: typeof requisition?.employmentType === "string" ? requisition.employmentType : undefined,
    experienceText: requisition?.experienceRequired,
    salaryText,
    summary: form.summary || requisition?.jobDescription,
    responsibilities: form.responsibilities,
    requirements: form.requirements,
    niceToHave: form.niceToHave,
    benefits: form.benefits,
    tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
    aboutHtml: site?.aboutHtml,
  }), [site, form, requisition, tagsText, salaryText]);

  const publish = async () => {
    if (!requisitionUid) return;
    setPublishing(true);
    setError(null);
    try {
      const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
      await save({ ...form, requisitionUid, tags, status: "PUBLISHED" });
      await siteHook.reload(); // publishing auto-provisions the site — pick up its real slug
      setPublishedSlug(form.slug?.trim() || slugify(requisition?.title));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to publish.");
    } finally {
      setPublishing(false);
    }
  };

  const companySlug = site?.companySlug || "your-company";
  const link = `${window.location.origin}/careers/${companySlug}/${publishedSlug}`;

  // ---- generated-link success screen ----
  if (publishedSlug) {
    return (
      <div data-testid="hr-careers-publish-success" style={{ padding: 24, maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#D1FAE5", color: "#059669", display: "grid", placeItems: "center", margin: "0 auto 14px", fontSize: 26, fontWeight: 800 }}>✓</div>
        <h2 style={{ color: "#1E1B4B", margin: "0 0 4px" }}>Published to your careers site</h2>
        <p style={{ color: "#6b7280", margin: 0, fontSize: 14 }}>{requisition?.title} is now live. Share this link anywhere.</p>
        <div style={{ display: "flex", gap: 10, alignItems: "center", border: "1px dashed #b9a9e6", borderRadius: 11, padding: "11px 14px", margin: "16px 0" }}>
          <code data-testid="hr-careers-generated-link" style={{ flex: 1, textAlign: "left", color: "#4C1DB3", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link}</code>
          <button onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1400); }}
            style={{ border: "1px solid #E5E7EB", background: "#fff", borderRadius: 8, padding: "6px 11px", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>{copied ? "Copied ✓" : "Copy"}</button>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button data-testid="hr-careers-publish-done" onClick={() => navigate("/recruitment/requisitions")} style={btnGhost}>Done</button>
          <button data-testid="hr-careers-open-public-page" onClick={() => window.open(link, "_blank", "noopener,noreferrer")} style={btnPrimary}>Open public page →</button>
        </div>
      </div>
    );
  }

  // ---- publish + live preview screen ----
  return (
    <div data-testid="hr-careers-publish-page" style={{ padding: "22px 24px 60px" }}>
      <button onClick={() => navigate("/recruitment/requisitions")} style={backLink}>← Back to requisitions</button>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1E1B4B", margin: "8px 0 2px" }}>Publish to careers</h1>
      <p style={{ color: "#6b7280", fontSize: 13.5, margin: 0 }}>Add the public-facing copy. Core details come straight from the requisition.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 18 }}>
        {/* form */}
        <div style={card}>
          {error && <div style={{ background: "#FEE2E2", border: "1px solid #fca5a5", color: "#b91c1c", borderRadius: 9, padding: "9px 12px", fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <div style={{ background: "#EDE9FE", border: "1px solid #ddd3ef", borderRadius: 11, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".5px", color: "#5B21D1", fontWeight: 800 }}>Publishing requisition</div>
            <div style={{ fontWeight: 800, color: "#1E1B4B", marginTop: 2 }}>{requisition?.title || "—"}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {requisition?.location && <span style={chip}>📍 {requisition.location}</span>}
              {requisition?.department && <span style={chip}>🗂 {requisition.department}</span>}
              {salaryText && <span style={chip}>💰 {salaryText}</span>}
            </div>
            <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 7 }}>These stay in sync with the requisition — you never retype them.</div>
          </div>

          <Field label="Public URL slug (optional)"><input style={inp} value={form.slug ?? ""} onChange={set("slug")} placeholder={`auto: ${slugify(requisition?.title)}`} /></Field>
          <Field label="Public intro"><textarea style={ta} value={form.summary ?? ""} onChange={set("summary")} placeholder="Marketing intro. Blank = the requisition's description." /></Field>
          <Field label="Responsibilities (one per line)"><textarea style={ta} value={form.responsibilities ?? ""} onChange={set("responsibilities")} /></Field>
          <Field label="Requirements (one per line)"><textarea style={ta} value={form.requirements ?? ""} onChange={set("requirements")} /></Field>
          <Field label="Benefits (one per line)"><textarea style={ta} value={form.benefits ?? ""} onChange={set("benefits")} /></Field>
          <Field label="Tags (comma separated)"><input style={inp} value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="React, TypeScript, Vite" /></Field>
          <Field label="Template">
            <div style={{ display: "inline-flex", background: "#f3f0fa", borderRadius: 9, padding: 3, gap: 3 }}>
              {templates.map((t) => (
                <button key={t.value} data-testid={`hr-careers-template-${t.value}`} onClick={() => setForm((p) => ({ ...p, templateKey: t.value }))}
                  style={{ border: 0, background: form.templateKey === t.value ? "#5B21D1" : "transparent", color: form.templateKey === t.value ? "#fff" : "#6b7280", fontWeight: 700, fontSize: 12.5, padding: "6px 12px", borderRadius: 7, cursor: "pointer" }}>{t.label}</button>
              ))}
            </div>
          </Field>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={() => navigate("/recruitment/requisitions")} style={btnGhost}>Cancel</button>
            <button data-testid="hr-careers-publish-get-link" onClick={publish} disabled={publishing} style={btnPrimary}>{publishing ? "Publishing…" : "Publish & get link"}</button>
          </div>
        </div>

        {/* live preview */}
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #E5E7EB", fontSize: 12, color: "#6b7280", background: "#faf8fc" }}>
            <span>Live preview — what candidates see</span>
            <span style={{ textTransform: "capitalize" }}>{form.templateKey}</span>
          </div>
          <div style={{ padding: 14, background: "#F5F3FB" }}>
            <JobPageView job={preview} interactive={false} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#1E1B4B", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: 20, boxShadow: "0 1px 2px rgba(16,12,20,.04),0 12px 30px rgba(40,30,90,.06)" };
const inp: React.CSSProperties = { width: "100%", border: "1px solid #E5E7EB", borderRadius: 9, padding: "9px 11px", font: "inherit", fontSize: 13.5, color: "#1E1B4B" };
const ta: React.CSSProperties = { ...inp, minHeight: 56, resize: "vertical" };
const chip: React.CSSProperties = { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 20, padding: "2px 9px" };
const btnPrimary: React.CSSProperties = { border: 0, background: "#5B21D1", color: "#fff", fontWeight: 700, fontSize: 13, borderRadius: 9, padding: "9px 15px", cursor: "pointer" };
const btnGhost: React.CSSProperties = { border: "1px solid #E5E7EB", background: "#fff", color: "#3b4252", fontWeight: 700, fontSize: 13, borderRadius: 9, padding: "9px 15px", cursor: "pointer" };
const backLink: React.CSSProperties = { background: "none", border: 0, color: "#5B21D1", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0 };
