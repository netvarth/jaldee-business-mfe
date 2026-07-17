import { useState } from "react";
import { applyToJob, type JobApplication } from "../../services/useCareers";
import { careersStyles } from "./careersStyles";

/** Normalized job shape the view renders — used by both the public page and the live preview. */
export interface JobView {
  companyName?: string;
  companySlug?: string;
  jobSlug?: string;
  primaryColor?: string;
  templateKey?: string;
  title?: string;
  locationText?: string;
  employmentType?: string;
  departmentText?: string;
  experienceText?: string;
  salaryText?: string;
  summary?: string;
  responsibilities?: string;
  requirements?: string;
  niceToHave?: string;
  benefits?: string;
  tags?: string[];
  aboutHtml?: string;
}

function looksLikeHtml(value?: string): boolean {
  if (!value) return false;
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function lines(text?: string): string[] {
  if (!text) return [];
  return text.split(/\r?\n/).map((l) => l.replace(/^[-•]\s*/, "").trim()).filter(Boolean);
}

/**
 * Pure renderer for a careers job page. `interactive` submits real applications
 * (public page); when false the apply form is a disabled visual (live preview).
 */
export default function JobPageView({ job, interactive = true }: { job: JobView; interactive?: boolean }) {
  const tpl = job.templateKey || "classic";
  const responsibilities = lines(job.responsibilities);
  const requirements = lines(job.requirements);
  const benefits = lines(job.benefits);
  const tags = job.tags ?? [];
  const accent = job.primaryColor || "#5B21D1";

  return (
    <div className={`jd device tpl-${tpl}`} style={{ ["--brand" as string]: accent }}>
      <style>{careersStyles}</style>

      <div className="site-nav">
        <div className="logo"><span className="mark">{(job.companyName || "J").charAt(0)}</span> {job.companyName || "Company"}</div>
        <div className="nav-links"><a>Careers</a></div>
      </div>

      <div className="hero">
        <div className="crumb"><a>Careers</a>{job.departmentText ? ` › ${job.departmentText}` : ""} › <b>{job.title}</b></div>
        <h1>{job.title || "Job title"}</h1>
        <div className="chips">
          {job.locationText && <span className="chip">📍 {job.locationText}</span>}
          {job.employmentType && <span className="chip">🕑 {job.employmentType}</span>}
          {job.departmentText && <span className="chip">🗂 {job.departmentText}</span>}
          {job.experienceText && <span className="chip">★ {job.experienceText}</span>}
          {job.salaryText && <span className="chip">💰 {job.salaryText}</span>}
        </div>
      </div>

      <div className="layout">
        <div className="prose">
          {job.summary && (<><h2>About the role</h2><p>{job.summary}</p></>)}
          {responsibilities.length > 0 && (<><h2>What you'll do</h2><ul>{responsibilities.map((l, i) => <li key={i}>{l}</li>)}</ul></>)}
          {requirements.length > 0 && (<><h2>What we're looking for</h2><ul>{requirements.map((l, i) => <li key={i}>{l}</li>)}</ul></>)}
          {job.niceToHave && (<><h2>Nice to have</h2><div className="tags">{lines(job.niceToHave).map((t, i) => <span className="tag" key={i}>{t}</span>)}</div></>)}
          {benefits.length > 0 && (<><h2>Benefits</h2><ul>{benefits.map((l, i) => <li key={i}>{l}</li>)}</ul></>)}
          {job.aboutHtml && (
            <>
              <h2>About {job.companyName}</h2>
              {looksLikeHtml(job.aboutHtml) ? (
                <div className="rich-content" dangerouslySetInnerHTML={{ __html: job.aboutHtml }} />
              ) : (
                <div className="rich-content rich-content--plaintext">{job.aboutHtml}</div>
              )}
            </>
          )}
          {tags.length > 0 && <div className="tags" style={{ marginTop: 18 }}>{tags.map((t, i) => <span className="tag" key={i}>{t}</span>)}</div>}
        </div>

        <div className="apply">
          <ApplyCard companySlug={job.companySlug} jobSlug={job.jobSlug} title={job.title || "this role"} interactive={interactive} />
        </div>
      </div>

      <div className="footer">
        <span>© {new Date().getFullYear()} {job.companyName}. All rights reserved.</span>
        <span>Careers · Privacy · Equal opportunity employer</span>
      </div>
    </div>
  );
}

function ApplyCard({ companySlug, jobSlug, title, interactive }: { companySlug?: string; jobSlug?: string; title: string; interactive: boolean }) {
  const [form, setForm] = useState<JobApplication>({ name: "", email: "", phone: "", portfolioUrl: "", coverNote: "", website: "" });
  const [resume, setResume] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (k: keyof JobApplication) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interactive || !companySlug || !jobSlug) return; // preview mode
    if (!resume) { setError("Please attach your resume."); return; }
    setLoading(true);
    setError(null);
    try {
      await applyToJob(companySlug, jobSlug, { ...form, resumeFileName: resume.name }, resume);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="apply-card">
      <div className="apply-head">
        <div className="t">Apply for this role</div>
        <div className="s">Takes ~2 minutes · Attach your resume</div>
      </div>

      {done ? (
        <div className="success show">
          <div className="ok">✓</div>
          <h3>Application received</h3>
          <p>Thanks for applying to {title}. We'll review your profile and be in touch by email.</p>
        </div>
      ) : (
        <form className="apply-body" onSubmit={submit}>
          {error && <div className="err">{error}</div>}
          <div className="field"><label>Full name <span className="req">*</span></label>
            <input value={form.name} onChange={set("name")} placeholder="e.g. Ananya Nair" /></div>
          <div className="row2">
            <div className="field"><label>Email <span className="req">*</span></label>
              <input type="email" value={form.email} onChange={set("email")} placeholder="you@email.com" /></div>
            <div className="field"><label>Phone</label>
              <input value={form.phone} onChange={set("phone")} placeholder="+91 …" /></div>
          </div>
          <div className="field"><label>Portfolio / LinkedIn</label>
            <input value={form.portfolioUrl} onChange={set("portfolioUrl")} placeholder="https://…" /></div>
          <div className="field"><label>Cover note</label>
            <textarea value={form.coverNote} onChange={set("coverNote")} placeholder="A line or two on why you're a great fit…" /></div>
          <div className="field"><label>Resume <span className="req">*</span></label>
            <label className="dropzone">
              <span className="dz-ic">⬆</span>
              <div className="dz-main">{resume?.name || "Click to upload your resume"}</div>
              <div className="dz-sub">PDF, DOC or DOCX · up to 5 MB</div>
              <input type="file" accept=".pdf,.doc,.docx" hidden disabled={!interactive} onChange={(e) => setResume(e.target.files?.[0] || null)} />
            </label>
          </div>
          <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")}
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }} aria-hidden="true" />
          <label className="consent"><input type="checkbox" /> I agree to my application data being stored for recruitment purposes.</label>
          <button className="btn-apply" type="submit" disabled={loading || !interactive}>{loading ? "Submitting…" : "Submit application"}</button>
        </form>
      )}
      <div className="apply-foot">🔒 Your information is kept private.</div>
    </div>
  );
}
