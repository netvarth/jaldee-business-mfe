import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";

/** W2 / R6.2 + R6.5 + R6.6 — separation workflow client. */

export type ExitStatus = "Pending" | "Partially_Approved" | "Approved" | "Rejected" | "Completed" | "Cancelled";
export type ClearanceStatus = "Pending" | "InProgress" | "Cleared" | "Rejected";

export interface ExitClearance {
  id: string;
  uid?: string;
  exitRequestUid?: string;
  departmentName?: string;
  status?: ClearanceStatus;
  clearedByUid?: string;
  clearedByName?: string;
  comments?: string;
}

export interface ExitRequest {
  id: string;
  uid?: string;
  employeeUid?: string;
  employeeName?: string;
  separationType?: string;
  reason?: string;
  status?: ExitStatus;
  noticePeriodDays?: number;
  noticeWaivedDays?: number;
  waiveReason?: string;
  lastWorkingDay?: string;
  clearanceStatus?: string;
  exitInterview?: Record<string, string>;
  clearances?: ExitClearance[];
}

function normalize(r: Record<string, unknown>): ExitRequest {
  const uid = (r.uid ?? r.id) as string | undefined;
  const clearances = Array.isArray(r.clearances)
    ? (r.clearances as Record<string, unknown>[]).map((c) => ({ ...(c as object), id: String((c.uid ?? c.id) ?? ""), uid: c.uid } as ExitClearance))
    : [];
  return { ...(r as object), id: String(uid ?? ""), uid, clearances } as ExitRequest;
}

export function useExits() {
  const api = useHrApi();
  const [data, setData] = useState<ExitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>("/exits");
      setData(Array.isArray(res) ? res.map(normalize) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load exit requests"); setData([]); }
    finally { setLoading(false); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);

  const raise = useCallback(async (payload: {
    employeeUid: string; separationType: string; reason?: string;
    noticePeriodDays?: number; lastWorkingDay?: string; clearanceDepartments?: string[];
  }) => { await api.post("/exits", payload); await load(); }, [api, load]);

  const decide = useCallback(async (uid: string, action: "APPROVE" | "REJECT", statusRemarks?: string | null) => {
    await api.post(`/exits/${uid}/decide`, { action, statusRemarks: statusRemarks || null }); await load();
  }, [api, load]);

  const waiveNotice = useCallback(async (uid: string, waivedDays: number, reason: string) => {
    await api.post(`/exits/${uid}/waive-notice`, { waivedDays, reason }); await load();
  }, [api, load]);

  const saveInterview = useCallback(async (uid: string, responses: Record<string, string>) => {
    await api.put(`/exits/${uid}/interview`, responses); await load();
  }, [api, load]);

  const updateClearance = useCallback(async (clearanceUid: string, status: ClearanceStatus, comments?: string) => {
    await api.patch(`/exits/clearances/${clearanceUid}/status/${status}${comments ? `?comments=${encodeURIComponent(comments)}` : ""}`);
    await load();
  }, [api, load]);

  const cancel = useCallback(async (uid: string) => {
    await api.post(`/exits/${uid}/cancel`); await load();
  }, [api, load]);

  return { data, loading, error, reload: load, raise, decide, waiveNotice, saveInterview, updateClearance, cancel };
}
