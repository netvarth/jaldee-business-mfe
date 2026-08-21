import { useCallback, useEffect, useState } from "react";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import { normalizeServiceGatewayUrl } from "@jaldee/api-client";
import { buildHrSearchBody, EMPTY_SEARCH_FILTERS, unwrapHrSearchPage } from "./hrSearch";
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

const PUBLIC_BASE = normalizeServiceGatewayUrl("/hr-service/v1/api/consumer/careers");

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

export interface PublicResumeUploadResponse {
  fileUid: string;
  fileName: string;
  filePath: string;
  uploadUrl: string;
  status: string;
}

export interface PublicResumeAttachment {
  fileUid: string;
  fileName: string;
  filePath: string;
}

export interface JobApplication {
  name: string;
  email: string;
  phone?: string;
  portfolioUrl?: string;
  coverNote?: string;
  attachment?: PublicResumeAttachment | null;
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
      const site = await api.get<CareersSite | null>("/careers/site");
      setData(site);
      return site;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load careers settings");
      return null;
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
export function usePostings(
  filterClauses: SearchFilterClause[] = EMPTY_SEARCH_FILTERS,
  schema: SearchSchema | null | undefined = null,
  { enabled = true, page = 0, pageSize = 100 }: { enabled?: boolean; page?: number; pageSize?: number } = {}
) {
  const api = useHrApi();
  const [data, setData] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = useCallback(async () => {
    if (!enabled) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<unknown>(
        "/careers/postings/search",
        buildHrSearchBody(filterClauses, schema, page, pageSize)
      );
      const pageResult = unwrapHrSearchPage(res);
      setData(pageResult.content as unknown as JobPosting[]);
      setTotalElements(pageResult.totalElements);
      setTotalPages(pageResult.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load postings");
      setData([]);
      setTotalElements(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [api, enabled, filterClauses, page, pageSize, schema]);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(
    async (posting: JobPosting) => {
      let saved: JobPosting;
      if (posting.uid) {
        saved = await api.put<JobPosting>(`/careers/postings/${posting.uid}`, posting as unknown as Record<string, unknown>);
      } else {
        saved = await api.post<JobPosting>("/careers/postings", posting as unknown as Record<string, unknown>);
      }
      await load();
      return saved;
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

  return { data, loading, error, reload: load, save, setStatus, remove, totalElements, totalPages };
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

/** Step 1: Initiate unauthenticated public upload to get pre-signed S3 URL. */
export async function initiatePublicResumeUpload(
  companySlug: string,
  file: File
): Promise<PublicResumeUploadResponse> {
  const initUrl = `${PUBLIC_BASE}/${companySlug}/initiate-public-upload`;
  const response = await fetch(initUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type || "application/pdf",
      fileSize: file.size,
    }),
  });

  if (!response.ok) {
    let msg = `Failed to initiate resume upload (${response.status})`;
    try {
      const errJson = await response.json();
      msg = errJson?.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  return (await response.json()) as PublicResumeUploadResponse;
}

/** Step 2: Upload binary file directly to pre-signed S3 URL. */
export async function uploadPublicResumeToS3(uploadUrl: string, file: File): Promise<void> {
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/pdf",
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload file to S3");
  }
}

/** Helper function wrapping Step 1 + Step 2. */
export async function uploadPublicResumeFile(file: File, companySlug?: string): Promise<string> {
  const meta = await initiatePublicResumeUpload(companySlug || "default", file);
  await uploadPublicResumeToS3(meta.uploadUrl, file);
  return meta.fileUid;
}

/** Step 3: Submit public job application with uploaded attachment metadata. */
export async function applyToJob(
  companySlug: string,
  jobSlug: string,
  payload: JobApplication,
  resume?: File | null
) {
  let attachment = payload.attachment ?? null;

  if (resume && !attachment) {
    // Step 1: Request pre-signed S3 upload URL
    const uploadMeta = await initiatePublicResumeUpload(companySlug, resume);

    // Step 2: Direct binary upload to AWS S3
    await uploadPublicResumeToS3(uploadMeta.uploadUrl, resume);

    // Prepare unified attachment JSONB object
    attachment = {
      fileUid: uploadMeta.fileUid,
      fileName: uploadMeta.fileName || resume.name,
      filePath: uploadMeta.filePath,
    };
  }

  const applicationPayload = {
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    portfolioUrl: payload.portfolioUrl,
    coverNote: payload.coverNote,
    attachment: attachment || undefined,
  };

  const res = await fetch(`${PUBLIC_BASE}/${companySlug}/jobs/${jobSlug}/apply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(applicationPayload),
  });

  if (!res.ok) {
    let msg = `Apply failed (${res.status})`;
    try {
      const j = JSON.parse(await res.text());
      msg = j?.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : { accepted: true }) as { accepted: boolean; message?: string };
}
