import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";

export type ApprovalStatus = "Requested" | "Approved" | "Rejected";

export interface HolidayWorkRequest {
  id: string;
  uid?: string;
  employeeUid?: string;
  employeeName?: string;
  workDate?: string;
  reason?: string;
  status?: ApprovalStatus;
  approvedByUid?: string;
  approvedByName?: string;
  approvedAt?: string;
  createdAtTs?: string;
}

function withId<T extends { uid?: string; id?: string }>(r: Record<string, unknown>): T {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as T;
}

export function useMyHolidayWorkRequests() {
  const api = useHrApi();
  const [data, setData] = useState<HolidayWorkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>("/holiday-work/mine");
      setData(Array.isArray(res) ? res.map((r) => withId<HolidayWorkRequest>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load comp-off requests"); setData([]); }
    finally { setLoading(false); }
  }, [api]);
  
  useEffect(() => { void load(); }, [load]);

  const request = useCallback(async (p: { workDate: string; reason: string }) => {
    await api.post("/holiday-work", p); await load();
  }, [api, load]);

  return { data, loading, error, reload: load, request };
}
