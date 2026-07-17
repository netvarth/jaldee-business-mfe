import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";

/**
 * Careers site + public job pages.
 *
 * Admin calls (site settings, postings CRUD, publish) go through the
 * tenant-authenticated `useHrApi` (/hr-service/v1/api/tenant/careers/**).
 *
 * Public calls (list/detail/apply) hit the unauthenticated consumer surface
 * (/hr-service/v1/api/consumer/careers/**) and must NOT require an auth token,
 * so they use a bare fetch. Tenant is resolved server-side from companySlug.
 */

const PUBLIC_BASE = "/hr-service/v1/api/consumer/careers";

export type JobPostingStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export interface JobPosting {
  uid?: string;
  requisitionUid?: string | null;
  slug?: string;
  title: string;
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
  templateKey?: string;
  status?: JobPostingStatus;
  publishedAt?: string;
  applyCount?: number;
}

export interface CareersSite {
  uid?: string;
  companySlug: string;
  companyName: string;
  tagline?: string;
  aboutHtml?: string;
  logoFileRef?: string | null;
  primaryColor?: string;
  defaultTemplate?: string;
  careersActive: boolean;
}

export interface PublicCompany {
  companySlug: string;
  companyName: string;
  tagline?: string;
  aboutHtml?: string;
  logoFileRef?: string | null;
  primaryColor?: string;
  defaultTemplate?: string;
}

export interface PublicJobSummary {
  slug: string;
  title: string;
  locationText?: string;
  employmentType?: string;
  departmentText?: string;
  experienceText?: string;
  salaryText?: string;
  tags?: string[];
  publishedAt?: string;
}

export interface PublicJobDetail extends Omit<PublicJobSummary, "publishedAt"> {
  company: PublicCompany;
  summary?: string;
  responsibilities?: string;
  requirements?: string;
  niceToHave?: string;
  benefits?: string;
  templateKey?: string;
  publishedAt?: string;
}

export interface JobApplication {
  name: string;
  email: string;
  phone?: string;
  portfolioUrl?: string;
  coverNote?: string;
  resumeFileRef?: string | null;
  resumeFileName?: string;
  website?: string; // honeypot — leave empty
}

/* --------------------------------------------------------------- admin hooks */

/** Careers site settings (single row per tenant). */
export function useCareersSite() {
  const api = useHrApi();
  const [data, setData] = useState<CareersSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<CareersSite | null>("/careers/site"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load careers settings");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(
    async (site: CareersSite) => { await api.put("/careers/site", site as unknown as Record<string, unknown>); await load(); },
    [api, load]
  );

  return { data, loading, error, reload: load, save };
}

/** Admin postings list + CRUD + publish. */
export function usePostings() {
  const api = useHrApi();
  const [data, setData] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<JobPosting[]>("/careers/postings");
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load postings");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(
    async (posting: JobPosting) => {
      if (posting.uid) {
        await api.put(`/careers/postings/${posting.uid}`, posting as unknown as Record<string, unknown>);
      } else {
        await api.post("/careers/postings", posting as unknown as Record<string, unknown>);
      }
      await load();
    },
    [api, load]
  );

  const setStatus = useCallback(
    async (uid: string, status: JobPostingStatus) => {
      await api.post(`/careers/postings/${uid}/status?status=${status}`);
      await load();
    },
    [api, load]
  );

  const remove = useCallback(
    async (uid: string) => { await api.del(`/careers/postings/${uid}`); await load(); },
    [api, load]
  );

  return { data, loading, error, reload: load, save, setStatus, remove };
}

export function useDocumentDownloader() {
  const api = useHrApi();
  return useCallback(async (filePathOrUrl?: string | null, fileName?: string | null) => {
    if (!filePathOrUrl) return;
    const resolvedUrl = /^https?:\/\//i.test(filePathOrUrl)
      ? filePathOrUrl
      : (await api.get<{ url?: string }>(`/careers/document-url?filePath=${encodeURIComponent(filePathOrUrl)}`))?.url ?? null;
    if (!resolvedUrl) return;

    const link = document.createElement("a");
    link.href = resolvedUrl;
    if (fileName) link.download = fileName;
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [api]);
}

/* -------------------------------------------------------------- public hooks */

async function publicGet<T>(path: string): Promise<T> {
  const res = await fetch(`${PUBLIC_BASE}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Careers ${res.status}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Public listing for a company careers page. */
export function usePublicJobs(companySlug: string) {
  const [data, setData] = useState<PublicJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    publicGet<PublicJobSummary[]>(`/${companySlug}/jobs`)
      .then((r) => { if (live) { setData(r ?? []); setError(null); } })
      .catch((e) => { if (live) { setError(e instanceof Error ? e.message : "Failed to load jobs"); setData([]); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [companySlug]);

  return { data, loading, error };
}

/** Public single job. */
export function usePublicJob(companySlug: string, jobSlug: string) {
  const [data, setData] = useState<PublicJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    publicGet<PublicJobDetail>(`/${companySlug}/jobs/${jobSlug}`)
      .then((r) => { if (live) { setData(r); setError(null); } })
      .catch((e) => { if (live) { setError(e instanceof Error ? e.message : "Job not found"); setData(null); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [companySlug, jobSlug]);

  return { data, loading, error };
}

/** Submit a public application using multipart form data. */
export async function applyToJob(
  companySlug: string,
  jobSlug: string,
  payload: JobApplication,
  resume?: File | null
) {
  const fd = new FormData();
  fd.append("application", new Blob([JSON.stringify(payload)], { type: "application/json" }));
  if (resume) fd.append("resume", resume, resume.name);

  const res = await fetch(`${PUBLIC_BASE}/${companySlug}/jobs/${jobSlug}/apply`, {
    method: "POST",
    body: fd, // browser sets multipart boundary; do NOT set Content-Type manually
  });
  if (!res.ok) {
    let msg = `Apply failed (${res.status})`;
    try { const j = JSON.parse(await res.text()); msg = j?.message || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : { accepted: true }) as { accepted: boolean; message?: string };
}
