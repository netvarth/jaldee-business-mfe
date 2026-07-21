import { useCallback, useEffect, useState } from "react";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import { buildAttendanceSearchBody, unwrapAttendancePage } from "./attendanceSearch";
import { useHrApi } from "../services/useHrApi";

function normalizeClockInType(value: unknown) {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (normalized === "wfh" || normalized === "work from home" || normalized === "home") return "Home";
  if (normalized === "on-field" || normalized === "field" || normalized === "on duty") return "Field";
  if (normalized === "remote") return "Remote";
  if (normalized === "office") return "Office";
  return value;
}

function buildPunchOutPayload<T extends { uid?: string; id?: string; clockInType?: string }>(record: T | undefined, uid: string) {
  const now = new Date().toISOString();
  if (!record) {
    return {
      uid,
      clockOut: now,
    };
  }
  return {
    ...record,
    uid: record.uid || record.id || uid,
    clockInType: normalizeClockInType(record.clockInType),
    clockOut: now,
  };
}

export interface AttendanceRecord {
  id: string; uid?: string; employeeUid?: string; dateStr?: string;
  clockIn?: string; clockOut?: string; clockInType?: string; status?: string;
  wfhStatus?: string; workedHours?: number;
  verifiedByUid?: string; verifiedAt?: string;
  totalBreakMinutes?: number; breaks?: import("../types").AttendanceBreak[];
  overtimeMinutes?: number; overtimeStatus?: "Pending" | "Approved" | "Rejected" | string;
  approvedOvertimeMinutes?: number;
  shiftStartTime?: string; shiftEndTime?: string; systemGenerated?: boolean; generatedBy?: string; source?: string;
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

const EMPTY_FILTERS: SearchFilterClause[] = [];

export function useAttendance(
  filterClauses: SearchFilterClause[] = EMPTY_FILTERS,
  schema: SearchSchema | null | undefined = null,
  { enabled = true, page = 0, pageSize = 20 }: { enabled?: boolean; page?: number; pageSize?: number } = {}
) {
  const api = useHrApi();
  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = useCallback(async () => {
    if (!enabled) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      let res: unknown;
      try {
        res = await api.post<unknown>("/attendance/search", buildAttendanceSearchBody(filterClauses, schema, page, pageSize));
      } catch {
        res = await api.get<Record<string, unknown>[]>("/attendance");
      }
      const page_result = unwrapAttendancePage(res);
      setData(page_result.content.map((r) => withId<AttendanceRecord>(r)));
      setTotalElements(page_result.totalElements);
      setTotalPages(page_result.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attendance");
      setData([]);
    } finally { setLoading(false); }
  }, [api, enabled, filterClauses, schema, page, pageSize]);
  useEffect(() => { void load(); }, [load]);

  const punchIn = useCallback(async (payload: Record<string, unknown>) => {
    const created = await api.post<Record<string, unknown>>("/attendance", {
      ...payload,
      clockInType: normalizeClockInType(payload.clockInType),
    });
    await load();
    if (created && typeof created === "object") {
      const createdRecord = withId<AttendanceRecord>(created);
      setData((current) => {
        const alreadyLoaded = current.some((item) =>
          (createdRecord.id && item.id === createdRecord.id) ||
          (createdRecord.uid && item.uid === createdRecord.uid)
        );
        return alreadyLoaded ? current : [createdRecord, ...current];
      });
      setTotalElements((current) => Math.max(current, data.length + 1));
    }
  }, [api, data.length, load]);
  const punchOut = useCallback(async (uid: string) => {
    const record = data.find((item) => item.id === uid || item.uid === uid);
    await api.put(`/attendance/${uid}/punch-out`, buildPunchOutPayload(record, uid));
    await load();
  }, [api, data, load]);
  const verify = useCallback(async (uid: string, wfhStatus: string, verifiedByUid?: string | null) => {
    await api.put(`/attendance/${uid}/verify`, { wfhStatus, verifiedByUid: verifiedByUid || null }); await load();
  }, [api, load]);
  const startBreak = useCallback(async (uid: string, breakType: string) => {
    await api.post(`/attendance/${uid}/breaks`, { breakType });
    await load();
  }, [api, load]);
  const endBreak = useCallback(async (uid: string, breakUid: string) => {
    await api.put(`/attendance/${uid}/breaks/${breakUid}`);
    await load();
  }, [api, load]);
  const approveOvertime = useCallback(async (uid: string, approvedMinutes: number) => {
    await api.put(`/attendance/${uid}/overtime?approvedMinutes=${encodeURIComponent(String(Math.max(0, approvedMinutes)))}`);
    await load();
  }, [api, load]);
  return { data, loading, error, reload: load, punchIn, punchOut, verify, startBreak, endBreak, approveOvertime, totalElements, totalPages };
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
