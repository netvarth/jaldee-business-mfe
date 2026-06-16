import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "../services/useHrApi";

export interface AttendanceRecord {
  id: string; uid?: string; employeeUid?: string; dateStr?: string;
  clockIn?: string; clockOut?: string; clockInType?: string; status?: string;
  wfhStatus?: string; workedHours?: number; branchUid?: string; branchName?: string;
  verifiedByUid?: string; verifiedAt?: string;
}
export interface OnDutyRequest {
  id: string; uid?: string; employeeUid?: string; date?: string;
  clientSite?: string; reason?: string; status?: string; approvedByUid?: string;
}
export interface CompOff {
  id: string; uid?: string; employeeUid?: string; creditedDays?: number;
  expiryDate?: string; status?: string;
}
export interface LocationLog {
  id: string; uid?: string; userId?: string; timestamp?: string;
  latitude?: number; longitude?: number; accuracy?: number; activity?: string;
}

function withId<T extends { uid?: string; id?: string }>(r: Record<string, unknown>): T {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as T;
}

function useList<T extends { uid?: string; id?: string }>(endpoint: string) {
  const api = useHrApi();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>(endpoint);
      setData(Array.isArray(res) ? res.map((r) => withId<T>(r)) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to load ${endpoint}`);
      setData([]);
    } finally { setLoading(false); }
  }, [api, endpoint]);
  useEffect(() => { void load(); }, [load]);
  return { api, data, loading, error, reload: load };
}

export function useAttendance() {
  const { api, data, loading, error, reload } = useList<AttendanceRecord>("/attendance");
  const punchIn = useCallback(async (payload: Record<string, unknown>) => {
    await api.post("/attendance", payload); await reload();
  }, [api, reload]);
  const punchOut = useCallback(async (uid: string, payload: Record<string, unknown>) => {
    await api.put(`/attendance/${uid}`, payload); await reload();
  }, [api, reload]);
  const verify = useCallback(async (uid: string, wfhStatus: string, verifiedByUid?: string | null) => {
    await api.put(`/attendance/${uid}/verify`, { wfhStatus, verifiedByUid: verifiedByUid || null }); await reload();
  }, [api, reload]);
  return { data, loading, error, reload, punchIn, punchOut, verify };
}

export function useOnDuty() {
  const { api, data, loading, error, reload } = useList<OnDutyRequest>("/on-duty");
  const create = useCallback(async (payload: Record<string, unknown>) => {
    await api.post("/on-duty", payload); await reload();
  }, [api, reload]);
  const update = useCallback(async (uid: string, payload: Record<string, unknown>) => {
    await api.put(`/on-duty/${uid}`, payload); await reload();
  }, [api, reload]);
  return { data, loading, error, reload, create, update };
}

export function useCompOffs() {
  const { data, loading, error, reload } = useList<CompOff>("/comp-offs");
  return { data, loading, error, reload };
}

export function useLocationLogs() {
  const { api, data, loading, error, reload } = useList<LocationLog>("/location-logs");
  const create = useCallback(async (payload: Record<string, unknown>) => {
    await api.post("/location-logs", payload); await reload();
  }, [api, reload]);
  return { data, loading, error, reload, create };
}
