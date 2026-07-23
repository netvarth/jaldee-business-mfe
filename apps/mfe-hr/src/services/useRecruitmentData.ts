import { useCallback, useEffect, useState } from "react";
import { useMFEProps } from "@jaldee/auth-context";
import { useHrApi } from "./useHrApi";
import { buildBaseServiceUrl } from "../../../../packages/shared-modules/src/serviceUrls";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import { buildHrSearchBody, EMPTY_SEARCH_FILTERS, unwrapHrSearchPage } from "./hrSearch";
import type { JobRequisition, Candidate, Application, Interview, Offer } from "../types";

/** Backend returns `uid`; the UI keys on `id`. Normalize once here. */
function normalize<T extends Record<string, unknown>>(e: T): T {
  const uid = (e.uid ?? e.id) as string | undefined;
  return { ...e, id: String(uid ?? ""), uid: uid } as T;
}

/** Extracts array from Spring Page<T> or raw array */
function extractList(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.content)) return res.content;
  return [];
}

function normalizeApplicationStage(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/[\s-]+/g, "_").toUpperCase();
  return normalized || undefined;
}

type RecruitmentUploadTarget = {
  fileUid: string;
  uploadUrl: string;
};

function resolveFileType(file: File) {
  const byMime = file.type?.split("/").pop()?.trim();
  if (byMime) return byMime.toLowerCase();
  const byName = file.name.split(".").pop()?.trim();
  return (byName || "bin").toLowerCase();
}

async function uploadCandidateResumeFile(
  shellApi: ReturnType<typeof useMFEProps>["api"],
  account: ReturnType<typeof useMFEProps>["account"],
  user: ReturnType<typeof useMFEProps>["user"],
  ownerId: string,
  file: File
) {
  if (!shellApi) {
    throw new Error("Drive upload is unavailable in this shell.");
  }

  const tenantUid = account.tenantUid ?? account.id;
  const userName = user.name || "User";
  const descriptor = {
    action: "ADD",
    caption: file.name,
    contextType: "CAREERS",
    featureModuleName: "HR_CAREERS",
    featureServiceName: "HR",
    fileName: file.name,
    fileType: resolveFileType(file),
    fileSize: file.size,
    owner: ownerId,
    ownerName: userName,
    ownerType: "TenantUser",
    sharedType: "secureShare",
    tenantUid,
    uploadedBy: user.id,
    uploadedByName: userName,
  };

  const targetResponse = await shellApi.post<RecruitmentUploadTarget>(
    buildBaseServiceUrl("/platform-service/v1/api/drive/initiate-upload"),
    descriptor,
    { _skipLocationParam: true } as any
  );
  const target = targetResponse.data;

  const uploadResponse = await fetch(target.uploadUrl, {
    method: "PUT",
    body: file,
    headers: file.type ? { "Content-Type": file.type } : undefined,
  });
  if (!uploadResponse.ok) {
    throw new Error("Unable to upload resume right now.");
  }

  await shellApi.patch(
    buildBaseServiceUrl(`/platform-service/v1/api/drive/${target.fileUid}/status?status=COMPLETE`),
    null,
    { _skipLocationParam: true } as any
  );

  return target.fileUid;
}

/** OfferDto (backend) → Offer (UI). Backend uses applicationUid/annualCtc/validTill. */
function mapOffer(e: any): Offer {
  const uid = e.uid ?? e.id;
  return {
    ...e,
    id: String(uid ?? ""),
    uid,
    applicationId: e.applicationUid ?? e.applicationId ?? "",
    offeredSalary: e.annualCtc ?? e.offeredSalary,
    currency: e.currency,
    validUntil: e.validTill ?? e.validUntil,
    status: e.status,
    designation: e.designation,
    joiningDate: e.joiningDate,
    probationPeriod: e.probationPeriod,
    departmentUid: e.departmentUid,
    branchUid: e.branchUid,
  } as Offer;
}

/** InterviewDto (backend) → Interview (UI). Backend uses applicationUid/outcome. */
function mapInterview(e: any): Interview {
  const uid = e.uid ?? e.id;
  return {
    ...e,
    id: String(uid ?? ""),
    uid,
    applicationId: e.applicationUid ?? e.applicationId ?? "",
    applicationUid: e.applicationUid ?? e.applicationId ?? "",
    interviewerUids: Array.isArray(e.interviewerUids) ? e.interviewerUids : [],
    outcome: e.outcome ?? e.status ?? "HOLD",
    status: e.outcome ?? e.status ?? "HOLD",
  } as Interview;
}

function mapApplication(e: any): Application {
  const uid = e.uid ?? e.id;
  const candidateUid = e.candidateUid ?? e.candidateId ?? e.candidate?.uid ?? e.candidate?.id;
  const requisitionUid = e.requisitionUid ?? e.requisitionId ?? e.requisition?.uid ?? e.requisition?.id;
  const normalizedStage = normalizeApplicationStage(e.stage);

  return {
    ...e,
    id: String(uid ?? ""),
    uid,
    candidateId: candidateUid ? String(candidateUid) : undefined,
    candidateUid: candidateUid ? String(candidateUid) : undefined,
    candidateName: e.candidateName ?? e.candidate?.name ?? undefined,
    candidate: e.candidate ?? (candidateUid || e.candidateName ? {
      id: String(candidateUid ?? ""),
      uid: candidateUid ? String(candidateUid) : undefined,
      name: e.candidateName ?? "Unknown Candidate",
    } : null),
    requisitionId: requisitionUid ? String(requisitionUid) : undefined,
    requisitionUid: requisitionUid ? String(requisitionUid) : undefined,
    requisition: e.requisition ?? (requisitionUid || e.requisitionTitle ? {
      id: String(requisitionUid ?? ""),
      uid: requisitionUid ? String(requisitionUid) : undefined,
      title: e.requisitionTitle ?? e.role ?? "Unknown Role",
    } : null),
    role: e.role ?? e.requisitionTitle ?? e.requisition?.title ?? undefined,
    stage: normalizedStage ?? e.stage,
    status: e.status,
    notes: e.notes ?? null,
    rating: typeof e.rating === "number" ? e.rating : (e.rating != null ? Number(e.rating) : null),
    createdAt: e.createdAt ?? e.appliedAt ?? undefined,
    updatedAt: e.updatedAt ?? undefined,
    resumeFileRef: e.resumeFileRef ?? e.candidate?.resumeFileRef ?? null,
    resumeFileName: e.resumeFileName ?? e.candidate?.resumeFileName ?? undefined,
    resumeUrl: e.resumeUrl ?? e.candidate?.resumeUrl ?? null,
  } as Application;
}

export function useDashboardStats() {
  const api = useHrApi();
  const [data, setData] = useState<{ openRequisitions: number; totalCandidates: number; hiredCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>("/recruitment/dashboard");
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard stats");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function useJobRequisitions() {
  const api = useHrApi();
  const [data, setData] = useState<JobRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>("/recruitment/requisitions");
      setData(extractList(res).map(normalize));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requisitions");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (req: Partial<JobRequisition>) => {
      if (req.id) {
        await api.put(`/recruitment/requisitions/${req.id}`, req);
      } else {
        await api.post(`/recruitment/requisitions`, req);
      }
      await load();
    },
    [api, load]
  );

  return { data, loading, error, reload: load, save };
}

export function useCandidates(
  filterClauses: SearchFilterClause[] = EMPTY_SEARCH_FILTERS,
  schema: SearchSchema | null | undefined = null,
  { enabled = true, page = 0, pageSize = 100 }: { enabled?: boolean; page?: number; pageSize?: number } = {}
) {
  const api = useHrApi();
  const { api: shellApi, account, user } = useMFEProps();
  const [data, setData] = useState<Candidate[]>([]);
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
        "/recruitment/candidates/search",
        buildHrSearchBody(filterClauses, schema, page, pageSize)
      );
      const pageResult = unwrapHrSearchPage(res);
      setData(pageResult.content.map((row) => normalize(row) as Candidate));
      setTotalElements(pageResult.totalElements);
      setTotalPages(pageResult.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load candidates");
      setData([]);
      setTotalElements(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [api, enabled, filterClauses, page, pageSize, schema]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (candidate: Partial<Candidate>) => {
      if (candidate.id) {
        await api.put(`/recruitment/candidates/${candidate.id}`, candidate);
      } else {
        await api.post(`/recruitment/candidates`, candidate);
      }
      await load();
    },
    [api, load]
  );

  const uploadResume = useCallback(
    async (candidateId: string, file: File) => {
      const fileRef = await uploadCandidateResumeFile(shellApi, account, user, candidateId, file);
      await api.post(`/recruitment/candidates/${candidateId}/resume?fileRef=${encodeURIComponent(fileRef)}`);
      await load();
    },
    [account, api, load, shellApi, user]
  );

  return { data, loading, error, reload: load, save, uploadResume, totalElements, totalPages };
}

export function useCandidate(candidateUid?: string) {
  const api = useHrApi();
  const { api: shellApi, account, user } = useMFEProps();
  const [data, setData] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!candidateUid) {
      setData(null);
      setError("Candidate not found");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>(`/recruitment/candidates/${candidateUid}`);
      setData(normalize(res));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load candidate");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [api, candidateUid]);

  useEffect(() => {
    void load();
  }, [load]);

  const uploadResume = useCallback(
    async (file: File) => {
      if (!candidateUid) throw new Error("Candidate not found");
      const fileRef = await uploadCandidateResumeFile(shellApi, account, user, candidateUid, file);
      await api.post(`/recruitment/candidates/${candidateUid}/resume?fileRef=${encodeURIComponent(fileRef)}`);
      await load();
    },
    [account, api, candidateUid, load, shellApi, user]
  );

  return { data, loading, error, reload: load, uploadResume };
}

export function useApplications(options?: { autoload?: boolean }) {
  const api = useHrApi();
  const autoload = options?.autoload ?? true;
  const [data, setData] = useState<Application[]>([]);
  const [loading, setLoading] = useState(autoload);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>("/recruitment/applications");
      setData(extractList(res).map(mapApplication));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load applications");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!autoload) {
      setLoading(false);
      return;
    }
    void load();
  }, [autoload, load]);

  const updateStage = useCallback(
    async (id: string, stage: string, rejectionReason?: string | null) => {
      const params = new URLSearchParams({ toStage: stage });
      if (rejectionReason && rejectionReason.trim()) {
        params.set("rejectionReason", rejectionReason.trim());
      }
      await api.post(`/recruitment/applications/${id}/move-stage?${params.toString()}`);
      await load();
    },
    [api, load]
  );

  const addNote = useCallback(
    async (id: string, notes: string) => {
      await api.post(`/recruitment/applications/${id}/notes`, notes);
      await load();
    },
    [api, load]
  );

  const updateRating = useCallback(
    async (id: string, rating: number) => {
      await api.put(`/recruitment/applications/${id}/rating?rating=${encodeURIComponent(String(rating))}`);
      await load();
    },
    [api, load]
  );

  /**
   * Convert a hired candidate into an employee. The backend requires a valid
   * CreateEmployeeRequest body (employeeId, contactNumber, locationUid are
   * mandatory); it creates the employee, moves the application to HIRED and
   * decrements the requisition openings in one transaction.
   */
  const hire = useCallback(
    async (id: string, request: Record<string, unknown>) => {
      await api.post(`/recruitment/applications/${id}/hire`, request);
      await load();
    },
    [api, load]
  );

  return { data, loading, error, reload: load, updateStage, addNote, updateRating, hire };
}

export function useInterviews(options?: { autoload?: boolean }) {
  const api = useHrApi();
  const autoload = options?.autoload ?? true;
  const [data, setData] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(autoload);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>("/recruitment/interviews");
      setData(extractList(res).map(mapInterview));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load interviews");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!autoload) {
      setLoading(false);
      return;
    }
    void load();
  }, [autoload, load]);

  /** Schedule an interview. Sends the backend InterviewDto shape. */
  const save = useCallback(
    async (payload: Record<string, unknown>) => {
      await api.post(`/recruitment/interviews`, payload);
      await load();
    },
    [api, load]
  );

  const updateFeedback = useCallback(
    async (
      id: string,
      payload: {
        id?: string;
        applicationUid?: string;
        round?: string;
        scheduledAt?: string;
        durationMinutes?: number;
        mode?: string;
        locationOrLink?: string;
        interviewerUids?: string[];
        score?: string | number | null;
        feedback?: string | null;
        outcome?: string;
      }
    ) => {
      await api.put(`/recruitment/interviews/${id}/feedback`, payload as unknown as Record<string, unknown>);
      await load();
    },
    [api, load]
  );

  return { data, loading, error, reload: load, save, updateFeedback };
}

export function useOffers() {
  const api = useHrApi();
  const [data, setData] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>("/recruitment/offers");
      setData(extractList(res).map(mapOffer));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load offers");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Create an offer. Sends the backend OfferDto shape. */
  const create = useCallback(
    async (payload: Record<string, unknown>) => {
      await api.post(`/recruitment/offers`, payload);
      await load();
    },
    [api, load]
  );

  /** Transition an offer: DRAFT | SENT | ACCEPTED | DECLINED | WITHDRAWN. */
  const updateStatus = useCallback(
    async (id: string, status: string) => {
      await api.post(`/recruitment/offers/${id}/status?status=${status}`);
      await load();
    },
    [api, load]
  );

  return { data, loading, error, reload: load, create, updateStatus };
}
