import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";
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
    status: e.outcome ?? e.status ?? "Scheduled",
  } as Interview;
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

export function useCandidates() {
  const api = useHrApi();
  const [data, setData] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>("/recruitment/candidates");
      setData(extractList(res).map(normalize));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load candidates");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

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

  return { data, loading, error, reload: load, save };
}

export function useApplications() {
  const api = useHrApi();
  const [data, setData] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>("/recruitment/applications");
      setData(extractList(res).map(normalize));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load applications");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStage = useCallback(
    async (id: string, stage: string) => {
      await api.put(`/recruitment/applications/${id}/stage`, { stage });
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

  return { data, loading, error, reload: load, updateStage, hire };
}

export function useInterviews() {
  const api = useHrApi();
  const [data, setData] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
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
    void load();
  }, [load]);

  /** Schedule an interview. Sends the backend InterviewDto shape. */
  const save = useCallback(
    async (payload: Record<string, unknown>) => {
      await api.post(`/recruitment/interviews`, payload);
      await load();
    },
    [api, load]
  );

  return { data, loading, error, reload: load, save };
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
