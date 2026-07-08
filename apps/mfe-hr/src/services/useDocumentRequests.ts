import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";

/**
 * R7.1 (partial) — document request/verify workflow, live from
 * /document-requests (DocumentRequestController). Status is free-form on the
 * backend; the service defaults new requests to "REQUESTED".
 */
export interface DocumentRequest {
  id: string;
  uid?: string;
  employeeUid?: string;
  documentType?: string;
  status?: string;
  documentUrl?: string;
  verifiedByUid?: string;
  expiryDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const DOC_REQUEST_STATUSES = ["REQUESTED", "SUBMITTED", "VERIFIED", "REJECTED"] as const;

function withId(r: Record<string, unknown>): DocumentRequest {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as DocumentRequest;
}

export function useDocumentRequests(employeeUid?: string) {
  const api = useHrApi();
  const [data, setData] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employeeUid) { setData([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>(`/document-requests/employee/${employeeUid}`);
      setData(Array.isArray(res) ? res.map(withId) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load document requests");
      setData([]);
    } finally { setLoading(false); }
  }, [api, employeeUid]);

  useEffect(() => { void load(); }, [load]);

  const request = useCallback(async (documentType: string) => {
    await api.post("/document-requests", { employeeUid, documentType, status: "REQUESTED" });
    await load();
  }, [api, employeeUid, load]);

  const setStatus = useCallback(async (uid: string, status: string) => {
    await api.put(`/document-requests/${uid}`, { status });
    await load();
  }, [api, load]);

  const remove = useCallback(async (uid: string) => {
    await api.del(`/document-requests/${uid}`);
    await load();
  }, [api, load]);

  return { data, loading, error, reload: load, request, setStatus, remove };
}

export function useDocumentCompleteness(employeeUid?: string) {
  const api = useHrApi();
  const [data, setData] = useState<{ submittedCount?: number; totalRequired?: number } | null>(null);
  
  const load = useCallback(async () => {
    if (!employeeUid) return;
    try {
      const res = await api.get<Record<string, unknown>>(`/document-requests/completeness/${employeeUid}`);
      setData(res as { submittedCount?: number; totalRequired?: number });
    } catch (e) {
      console.error(e);
    }
  }, [api, employeeUid]);

  useEffect(() => { void load(); }, [load]);
  
  return data;
}
