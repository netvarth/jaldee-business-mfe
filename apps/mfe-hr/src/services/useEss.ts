import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";
import type { AttendanceBreak, Employee } from "../types";

function normalizeClockInType(value: string) {
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
    clockInType: record.clockInType ? normalizeClockInType(record.clockInType) : record.clockInType,
    clockOut: now,
  };
}

function normalizeAttendanceBreak(item: unknown) {
  if (!item || typeof item !== "object") return {};
  const b = item as Record<string, unknown>;
  const id = String(b.id ?? b.uid ?? b.breakUid ?? "");
  const uid = (b.uid ?? b.id ?? b.breakUid) as string | undefined;
  const breakIn = (b.breakIn ?? b.breakInTime ?? b.startTime ?? b.startedAt) as string | undefined;
  const breakOut = (b.breakOut ?? b.breakOutTime ?? b.endTime ?? b.endedAt) as string | undefined;
  const breakType = (b.breakType ?? b.type ?? "LUNCH") as string | undefined;
  const durationMinutes = (b.durationMinutes ?? b.duration ?? b.breakMinutes) as number | undefined;

  return {
    ...b,
    id,
    uid,
    breakIn,
    breakOut,
    breakType,
    durationMinutes,
  };
}

function withId<T extends { uid?: string; id?: string }>(value: Record<string, unknown>): T {
  const uid = (value.uid ?? value.id) as string | undefined;
  const hrDepartment = (value.hrDepartment ?? value.department) as string | undefined;
  const rawBreaks = value.breaks ?? value.attendanceBreaks ?? value.breakList ?? value.breakRecords ?? value.activeBreak;
  let breaks: unknown[] = [];
  if (Array.isArray(rawBreaks)) {
    breaks = rawBreaks.map(normalizeAttendanceBreak);
  } else if (rawBreaks && typeof rawBreaks === "object") {
    breaks = [normalizeAttendanceBreak(rawBreaks)];
  }

  return {
    ...value,
    id: String(uid ?? ""),
    uid,
    department: hrDepartment,
    hrDepartment,
    breaks,
    attendanceBreaks: breaks,
  } as T;
}

export function sortAttendanceLatestFirst<T extends { dateStr?: string; clockIn?: string; createdAt?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const timeA = a.clockIn ? new Date(a.clockIn).getTime() : (a.dateStr ? new Date(a.dateStr).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    const timeB = b.clockIn ? new Date(b.clockIn).getTime() : (b.dateStr ? new Date(b.dateStr).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0));

    if (timeA !== timeB) {
      return timeB - timeA; // Descending (latest date & time first)
    }

    const clockInA = a.clockIn ? new Date(a.clockIn).getTime() : 0;
    const clockInB = b.clockIn ? new Date(b.clockIn).getTime() : 0;
    return clockInB - clockInA;
  });
}

function useEssList<T extends { uid?: string; id?: string }>(
  endpoint: string,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const api = useHrApi();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Record<string, unknown>[]>(endpoint);
      const list = Array.isArray(response) ? response.map((item) => withId<T>(item)) : [];
      if (endpoint.includes("attendance")) {
        setData(sortAttendanceLatestFirst(list as unknown as { dateStr?: string; clockIn?: string }[]) as unknown as T[]);
      } else {
        setData(list);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${endpoint}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api, enabled, endpoint]);
  useEffect(() => { void reload(); }, [reload]);
  return { api, data, loading, error, reload };
}

export interface MyAttendance {
  id: string; uid?: string; dateStr?: string; clockIn?: string; clockOut?: string;
  clockInType?: string; status?: string; workedHours?: number; wfhStatus?: string;
  totalBreakMinutes?: number; breaks?: AttendanceBreak[];
  overtimeMinutes?: number; overtimeStatus?: string; approvedOvertimeMinutes?: number;
  shiftUid?: string; shiftName?: string; effectiveShiftUid?: string; effectiveShiftName?: string;
  shiftStartTime?: string; shiftEndTime?: string; shiftResolutionSource?: string;
  noShiftAssigned?: boolean; validationFlags?: string[]; attendanceFlags?: string[];
}

export interface MyLeave {
  id: string; uid?: string; leaveTypeName?: string; startDate?: string; endDate?: string;
  reason?: string; status?: string; duration?: number; isHalfDay?: boolean; halfDayType?: "FIRST_HALF" | "SECOND_HALF" | string;
}

export interface MyLeaveBalance {
  id: string; uid?: string; leaveTypeName?: string;
  total?: number; used?: number; available?: number; status?: "ACTIVE" | "INACTIVE" | "EXPIRED" | string;
}

export interface MyPayslip {
  id: string; uid?: string; month?: string; netPay?: number;
  status?: string; generatedAt?: string;
}

export function useMyProfile({ enabled = true }: { enabled?: boolean } = {}) {
  const api = useHrApi();
  const [data, setData] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Record<string, unknown>>("/me/profile");
      setData(response ? withId<Employee>(response) : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [api, enabled]);
  useEffect(() => { void reload(); }, [reload]);
  return { data, loading, error, reload };
}

export function useMyAttendance(options: { enabled?: boolean } = {}) {
  const { api, data, loading, error, reload } = useEssList<MyAttendance>("/me/attendance", options);
  const punchIn = useCallback(async (
    mode: string,
    options?: {
      selfieDataUrl?: string;
      locationUid?: string | null;
      location?: {
        latitude?: number | null;
        longitude?: number | null;
        accuracy?: number | null;
      } | null;
    }
  ) => {
    const clockInType = normalizeClockInType(mode);
    await api.post("/me/attendance/punch-in", {
      clockInType,
      locationUid: options?.locationUid ?? null,
      location: {
        latitude: options?.location?.latitude ?? null,
        longitude: options?.location?.longitude ?? null,
        accuracy: options?.location?.accuracy ?? null,
      },
      wfhStatus: clockInType === "Office" ? "NotApplicable" : "Requested",
      selfieDataUrl: options?.selfieDataUrl || null,
    });
    await reload();
  }, [api, reload]);
  const punchOut = useCallback(async (uid: string) => {
    const record = data.find((item) => item.id === uid || item.uid === uid);
    await api.put(`/me/attendance/${uid}/punch-out`, buildPunchOutPayload(record, uid));
    await reload();
  }, [api, data, reload]);
  const startBreak = useCallback(async (
    uid: string,
    breakType: string,
    employeeUid?: string | null,
    breakInIso?: string
  ) => {
    const attendanceUid = uid;
    const body: Record<string, unknown> = {
      attendanceUid,
      breakType,
      breakIn: breakInIso || new Date().toISOString(),
    };
    if (employeeUid) body.employeeUid = employeeUid;
    const res = await api.post(`/me/attendance/${uid}/breaks`, body);
    await reload();
    return res;
  }, [api, reload]);
  const endBreak = useCallback(async (
    uid: string,
    breakUid: string,
    breakOutIso?: string,
    employeeUid?: string | null,
    breakType?: string | null
  ) => {
    const attendanceUid = uid;
    const targetBreakUid = breakUid || "active";
    const body: Record<string, unknown> = {
      attendanceUid,
      breakUid: targetBreakUid,
      breakType: breakType || "LUNCH",
      breakOut: breakOutIso || new Date().toISOString(),
    };
    if (employeeUid) body.employeeUid = employeeUid;
    const res = await api.put(`/me/attendance/${uid}/breaks/${targetBreakUid}`, body);
    await reload();
    return res;
  }, [api, reload]);
  return { data, loading, error, reload, punchIn, punchOut, startBreak, endBreak };
}

export function useMyLeaves(options: { enabled?: boolean } = {}) {
  const { api, data, loading, error, reload } = useEssList<MyLeave>("/me/leaves", options);
  const apply = useCallback(async (payload: Record<string, unknown>) => {
    await api.post("/me/leaves", payload);
    await reload();
  }, [api, reload]);
  return { data, loading, error, reload, apply };
}

export function useMyLeaveBalances(options: { enabled?: boolean } = {}) {
  return useEssList<MyLeaveBalance>("/me/leaves/balances", options);
}

export function useMyPayslips(options: { enabled?: boolean } = {}) {
  return useEssList<MyPayslip>("/me/payslips", options);
}
