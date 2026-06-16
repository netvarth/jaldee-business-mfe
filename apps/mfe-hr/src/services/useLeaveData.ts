import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "../services/useHrApi";

export interface LeaveRequest {
  id: string; uid?: string; employeeUid?: string; type?: string;
  startDate?: string; endDate?: string; reason?: string; status?: string;
  appliedAt?: string; isHalfDay?: boolean; duration?: number; statusRemarks?: string;
}
export interface LeaveBalance {
  id: string; uid?: string; employeeUid?: string; leaveType?: string;
  total?: number; used?: number; available?: number;
}

function withId<T extends { uid?: string; id?: string }>(r: Record<string, unknown>): T {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as T;
}

export function useLeaves() {
  const api = useHrApi();
  const [data, setData] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>("/leaves/all");
      setData(Array.isArray(res) ? res.map((r) => withId<LeaveRequest>(r)) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leaves");
      setData([]);
    } finally { setLoading(false); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);

  const apply = useCallback(async (payload: Record<string, unknown>) => {
    await api.post("/leaves", payload); await load();
  }, [api, load]);
  const update = useCallback(async (uid: string, payload: Record<string, unknown>) => {
    await api.put(`/leaves/${uid}`, payload); await load();
  }, [api, load]);

  return { data, loading, error, reload: load, apply, update };
}

export function useLeaveBalances() {
  const api = useHrApi();
  const [data, setData] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>("/leaves/balances/all");
      setData(Array.isArray(res) ? res.map((r) => withId<LeaveBalance>(r)) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load balances");
      setData([]);
    } finally { setLoading(false); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);
  return { data, loading, error, reload: load };
}
