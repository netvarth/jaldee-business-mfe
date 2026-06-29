import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";
import type { AttendanceBreak, Employee } from "../types";

function withId<T extends { uid?: string; id?: string }>(value: Record<string, unknown>): T {
  const uid = (value.uid ?? value.id) as string | undefined;
  const hrDepartment = (value.hrDepartment ?? value.department) as string | undefined;
  return {
    ...value,
    id: String(uid ?? ""),
    uid,
    department: hrDepartment,
    hrDepartment,
  } as T;
}

function useEssList<T extends { uid?: string; id?: string }>(endpoint: string) {
  const api = useHrApi();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Record<string, unknown>[]>(endpoint);
      setData(Array.isArray(response) ? response.map((item) => withId<T>(item)) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${endpoint}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api, endpoint]);
  useEffect(() => { void reload(); }, [reload]);
  return { api, data, loading, error, reload };
}

export interface MyAttendance {
  id: string; uid?: string; dateStr?: string; clockIn?: string; clockOut?: string;
  clockInType?: string; status?: string; workedHours?: number; wfhStatus?: string;
  totalBreakMinutes?: number; breaks?: AttendanceBreak[];
  overtimeMinutes?: number; overtimeStatus?: string; approvedOvertimeMinutes?: number;
}

export interface MyLeave {
  id: string; uid?: string; leaveTypeName?: string; startDate?: string; endDate?: string;
  reason?: string; status?: string; duration?: number; isHalfDay?: boolean;
}

export interface MyLeaveBalance {
  id: string; uid?: string; leaveTypeName?: string;
  total?: number; used?: number; available?: number;
}

export interface MyPayslip {
  id: string; uid?: string; month?: string; netPay?: number;
  status?: string; generatedAt?: string;
}

export function useMyProfile() {
  const api = useHrApi();
  const [data, setData] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
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
  }, [api]);
  useEffect(() => { void reload(); }, [reload]);
  return { data, loading, error, reload };
}

export function useMyAttendance() {
  const { api, data, loading, error, reload } = useEssList<MyAttendance>("/me/attendance");
  const punchIn = useCallback(async (mode: string, selfieDataUrl?: string) => {
    await api.post("/me/attendance/punch-in", {
      clockInType: mode,
      wfhStatus: mode === "Office" ? null : "Pending",
      selfieDataUrl: selfieDataUrl || null,
    });
    await reload();
  }, [api, reload]);
  const punchOut = useCallback(async (uid: string) => {
    await api.put(`/me/attendance/${uid}/punch-out`);
    await reload();
  }, [api, reload]);
  return { data, loading, error, reload, punchIn, punchOut };
}

export function useMyLeaves() {
  const { api, data, loading, error, reload } = useEssList<MyLeave>("/me/leaves");
  const apply = useCallback(async (payload: Record<string, unknown>) => {
    await api.post("/me/leaves", payload);
    await reload();
  }, [api, reload]);
  return { data, loading, error, reload, apply };
}

export function useMyLeaveBalances() {
  return useEssList<MyLeaveBalance>("/me/leaves/balances");
}

export function useMyPayslips() {
  return useEssList<MyPayslip>("/me/payslips");
}
