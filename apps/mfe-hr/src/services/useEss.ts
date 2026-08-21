import { useCallback, useEffect, useState } from "react";
import type { FilterClause, SearchSchema } from "@jaldee/shared-modules";
import { useHrApi } from "./useHrApi";
import { buildHrSearchBody } from "./hrSearch";
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

function extractListFromResponse(response: unknown): Record<string, unknown>[] {
  if (!response) return [];
  if (Array.isArray(response)) return response as Record<string, unknown>[];
  if (typeof response === "object") {
    const res = response as Record<string, unknown>;
    if (Array.isArray(res.content)) return res.content as Record<string, unknown>[];
    if (Array.isArray(res.data)) return res.data as Record<string, unknown>[];
    if (Array.isArray(res.balances)) return res.balances as Record<string, unknown>[];
    if (Array.isArray(res.payslips)) return res.payslips as Record<string, unknown>[];
    if (Array.isArray(res.leaves)) return res.leaves as Record<string, unknown>[];
    if (Array.isArray(res.items)) return res.items as Record<string, unknown>[];
    if (Array.isArray(res.records)) return res.records as Record<string, unknown>[];
    if (Array.isArray(res.results)) return res.results as Record<string, unknown>[];
  }
  return [];
}

function normalizeItem<T>(item: Record<string, unknown>, endpoint: string): T {
  const base = withId<T>(item) as Record<string, unknown>;
  if (endpoint.includes("leave") && endpoint.includes("balance")) {
    const total = Number(base.total ?? base.totalDays ?? base.allocated ?? base.totalBalance ?? 0);
    const used = Number(base.used ?? base.usedDays ?? base.availed ?? 0);
    const rawAvailable = base.available ?? base.availableDays ?? base.remainingDays ?? base.balance ?? base.availableBalance;
    const available = rawAvailable != null ? Number(rawAvailable) : Math.max(0, total - used);
    return {
      ...base,
      leaveTypeName: String(base.leaveTypeName || base.leaveType || base.name || base.type || "Leave"),
      total,
      used,
      available,
      status: String(base.status || "ACTIVE"),
    } as unknown as T;
  }
  if (endpoint.includes("payslip")) {
    const netPay = Number(base.netPay ?? base.netSalary ?? base.takeHome ?? base.amount ?? 0);
    const rawMonth = base.month || base.period || base.payPeriod || base.payslipMonth || base.monthYear;
    const dateFormatted = formatDate((base.generatedAt || base.createdAt || base.dateStr) as string);
    const month = String(
      rawMonth ||
        (base.year && base.month ? `${base.month}/${base.year}` : "") ||
        (dateFormatted && dateFormatted !== "-" ? dateFormatted : "Payslip")
    );
    return {
      ...base,
      month,
      netPay,
      status: String(base.status || base.payslipStatus || "Generated"),
    } as unknown as T;
  }
  return base as unknown as T;
}

const EMPTY_FALLBACKS: string[] = [];
const LEAVE_FALLBACKS = ["/me/leave-requests"];
const LEAVE_BALANCE_FALLBACKS = ["/me/leave-balances", "/me/leave/balances"];
const PAYSLIP_FALLBACKS = [
  "/me/payroll/payslips",
  "/me/payslip",
  "/payroll/me/payslips",
  "/payroll/payslips/me",
  "/payroll/payslips/my",
];

function useEssList<T extends { uid?: string; id?: string }>(
  endpoint: string,
  { enabled = true }: { enabled?: boolean } = {},
  fallbackEndpoints: string[] = EMPTY_FALLBACKS
) {
  const api = useHrApi();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fallbackJoined = fallbackEndpoints.join(",");

  const reload = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const endpointsToTry = [endpoint, ...fallbackEndpoints];
    let lastError: Error | null = null;
    let fetchedList: Record<string, unknown>[] = [];
    let successEndpoint = endpoint;

    for (const ep of endpointsToTry) {
      try {
        const response = await api.get<unknown>(ep);
        fetchedList = extractListFromResponse(response);
        successEndpoint = ep;
        lastError = null;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(`Failed to load ${ep}`);
      }
    }

    if (lastError && fetchedList.length === 0) {
      setError(lastError.message);
      setData([]);
    } else {
      const list = fetchedList.map((item) => normalizeItem<T>(item, successEndpoint));
      if (endpoint.includes("attendance")) {
        setData(sortAttendanceLatestFirst(list as unknown as { dateStr?: string; clockIn?: string }[]) as unknown as T[]);
      } else {
        setData(list);
      }
    }
    setLoading(false);
  }, [api, enabled, endpoint, fallbackJoined]);

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
  id: string; uid?: string; leaveTypeUid?: string; leaveTypeName?: string; leaveType?: string;
  total?: number; used?: number; available?: number; availableDays?: number; remainingDays?: number; balance?: number;
  status?: "ACTIVE" | "INACTIVE" | "EXPIRED" | string;
}

export interface MyPayslip {
  id: string; uid?: string; month?: string; period?: string; netPay?: number; netSalary?: number; amount?: number;
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
      setError(err instanceof Error ? err.message : "Failed to load /me/profile");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [api, enabled]);
  useEffect(() => { void reload(); }, [reload]);
  return { api, data, loading, error, reload };
}

export function useMyAttendance({ enabled = true }: { enabled?: boolean } = {}) {
  const { api, data, loading, error, reload } = useEssList<MyAttendance>("/me/attendance", { enabled });
  const punchIn = useCallback(async (
    clockInType: string,
    options?: { selfieDataUrl?: string; locationUid?: string | null; location?: { latitude: number | null; longitude: number | null; accuracy: number | null } }
  ) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const body: Record<string, unknown> = {
      dateStr: todayStr,
      clockIn: new Date().toISOString(),
      clockInType,
    };
    if (options?.selfieDataUrl) body.selfieDataUrl = options.selfieDataUrl;
    if (options?.locationUid) body.locationUid = options.locationUid;
    if (options?.location && (options.location.latitude != null || options.location.longitude != null)) {
      body.latitude = options.location.latitude;
      body.longitude = options.location.longitude;
      body.accuracy = options.location.accuracy;
    }
    await api.post("/me/attendance/punch-in", body);
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
  const { api, data, loading, error, reload } = useEssList<MyLeave>("/me/leaves", options, LEAVE_FALLBACKS);
  const apply = useCallback(async (payload: Record<string, unknown>) => {
    await api.post("/me/leaves", payload);
    await reload();
  }, [api, reload]);
  return { data, loading, error, reload, apply };
}

export function useMyLeaveBalances(options: { enabled?: boolean } = {}) {
  return useEssList<MyLeaveBalance>("/me/leaves/balances", options, LEAVE_BALANCE_FALLBACKS);
}

export function useMyPayslips(options: { enabled?: boolean } = {}) {
  return useEssList<MyPayslip>("/me/payslips", options, PAYSLIP_FALLBACKS);
}

export interface EssHoliday {
  id: string;
  uid?: string;
  name?: string;
  date?: string;
  dateStr?: string;
  type?: string;
  description?: string;
  status?: string;
}

export function useEssHolidays(
  filters: FilterClause[] = [],
  schema: SearchSchema | null = null,
  options: { enabled?: boolean; page?: number; pageSize?: number } = {},
) {
  const { enabled = true, page = 0, pageSize = 20 } = options;
  const api = useHrApi();
  const [data, setData] = useState<EssHoliday[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const searchBody = buildHrSearchBody(filters as any, schema, page, pageSize);
      const res = await api.post<unknown>("/me/holidays/search", searchBody);
      const list = extractListFromResponse(res);
      const items = list.map((item) => withId<EssHoliday>(item));
      setData(items);
      const rawTotal = Number(
        Array.isArray(res)
          ? res.length
          : (res?.totalElements ?? res?.totalCount ?? res?.total ?? res?.count ?? items.length)
      );
      const total = Number.isFinite(rawTotal) && rawTotal >= 0 ? rawTotal : items.length;
      setTotalElements(total);
    } catch {
      setData([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [api, enabled, filters, page, pageSize, schema]);

  useEffect(() => { void load(); }, [load]);

  return { data, totalElements, loading, error, reload: load };
}
