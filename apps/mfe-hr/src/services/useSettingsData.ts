import { useCallback, useEffect, useState } from "react";
import { useMFEProps } from "@jaldee/auth-context";
import { useHrApi } from "../services/useHrApi";
import { useBranches } from "./useBranches";
import type { ClockType } from "../types";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import { buildHrSearchBody, EMPTY_SEARCH_FILTERS, unwrapHrSearchPage } from "./hrSearch";

export interface Designation { id: string; uid?: string; name?: string; code?: string; department?: string; hrDepartment?: string; hrDepartmentUid?: string | null; orgLevelUid?: string | null; level?: number; description?: string; status?: string; }
export interface Shift { id: string; uid?: string; name?: string; startTime?: string; endTime?: string; isOvernight?: boolean; graceMinutes?: number; halfDayThresholdMinutes?: number; breakMinutes?: number; break_minutes?: number; weeklyOffDays?: string[]; status?: string; }
export interface ShiftRotation { id: string; uid?: string; name?: string; shiftUids?: string[]; rotationPeriodDays?: number; startDate?: string; active?: boolean; }
export interface Consent { id: string; uid?: string; employeeUid?: string; purpose?: string; status?: string; policyVersion?: string; grantedAt?: string; }
export interface BranchRow { id: string; uid?: string; name?: string; code?: string; address?: string; latitude?: number; longitude?: number; radius?: number; }
export interface Department { id: string; uid?: string; name?: string; code?: string; headEmployeeUid?: string; status?: string; }
export interface LeaveType { id: string; uid?: string; name?: string; category?: string; annualQuota?: number; carryForward?: boolean; carryForwardMax?: number; accrualType?: string; paid?: boolean; colorHex?: string; status?: string; }
export interface Holiday { id: string; uid?: string; name?: string; date?: string; type?: string; status?: string; }

export interface CompanyProfile {
  uid?: string; name?: string; legalName?: string; logoUrl?: string; email?: string; phone?: string;
  addressLine?: string; city?: string; state?: string; country?: string; gstin?: string; pan?: string;
  industry?: string; currency?: string; fiscalYearStart?: string; workingDays?: string;
}
export interface AttendanceRule {
  uid?: string; workHoursPerDay?: number; shiftStartTime?: string; graceMinutes?: number; lateThresholdMinutes?: number;
  halfDayThresholdMinutes?: number; fullDayThresholdHours?: number; geofenceRadiusMeters?: number;
  faceRecognitionRequired?: boolean; allowedWorkModes?: ClockType[] | string[] | string; autoClockOutMinutes?: number;
}
export interface PayrollSetting {
  uid?: string; payCycle?: string; payDay?: number; payDayType?: "FIXED_DATE" | "LAST_WORKING_DAY"; currency?: string; pfEnabled?: boolean; pfRate?: number;
  pfEmployeeRate?: number; pfEmployerRate?: number;
  workingDaysBasis?: "CALENDAR_DAYS" | "FIXED_DAYS" | "ACTUAL_WORKING_DAYS"; fixedWorkingDays?: number;
  esiEnabled?: boolean; esiRate?: number; professionalTax?: number; tdsEnabled?: boolean;
  ptEnabled?: boolean; esiEmployerRate?: number; pfWageCeiling?: number; pfBaseType?: "BASIC" | "GROSS" | "COMPONENTS";
  esiGrossCeiling?: number; lwfAmount?: number; state?: string;
}

function withId<T extends { uid?: string; id?: string }>(r: Record<string, unknown>): T {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as T;
}

/** Generic list CRUD against a collection endpoint. Lists use /search when available. */
function useCrud<T extends { uid?: string; id?: string }>(
  endpoint: string,
  options: {
    search?: boolean;
    filters?: SearchFilterClause[];
    schema?: SearchSchema | null;
    enabled?: boolean;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const enabled = options.enabled ?? true;
  const page = options.page ?? 0;
  const pageSize = options.pageSize ?? 100;
  const api = useHrApi();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const load = useCallback(async (silent = false) => {
    if (!enabled) { setLoading(false); return; }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = options.search
        ? await api.post<unknown>(`${endpoint}/search`, buildHrSearchBody(options.filters ?? EMPTY_SEARCH_FILTERS, options.schema, page, pageSize))
        : await api.get<Record<string, unknown>[]>(endpoint);
      const pageResult = options.search ? unwrapHrSearchPage(res) : null;
      const rows = pageResult ? pageResult.content : Array.isArray(res) ? res : [];
      setData(rows.map((r) => withId<T>(r)));
      setTotalElements(pageResult?.totalElements ?? rows.length);
      setTotalPages(pageResult?.totalPages ?? 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to load ${endpoint}`);
      if (!silent) {
        setData([]);
        setTotalElements(0);
        setTotalPages(0);
      }
    }
    finally { if (!silent) setLoading(false); }
  }, [api, enabled, endpoint, options.filters, options.schema, options.search, page, pageSize]);
  useEffect(() => { void load(); }, [load]);
  const create = useCallback(async (payload: Record<string, unknown>) => {
    const response = await api.post<unknown>(endpoint, payload);
    const responseRecord = response && typeof response === "object" && !Array.isArray(response)
      ? response as Record<string, unknown>
      : null;
    const nestedRecord = responseRecord?.data && typeof responseRecord.data === "object" && !Array.isArray(responseRecord.data)
      ? responseRecord.data as Record<string, unknown>
      : null;
    const createdRecord = nestedRecord ?? responseRecord;
    const createdUid = createdRecord?.uid ?? createdRecord?.id;

    if (createdRecord && createdUid) {
      const created = withId<T>(createdRecord);
      setData((current) => [created, ...current.filter((item) => item.id !== created.id)].slice(0, pageSize));
      setTotalElements((current) => current + (current === 0 || !data.some((item) => item.id === created.id) ? 1 : 0));
      return created;
    }

    await load(true);
    return null;
  }, [api, data, endpoint, load, pageSize]);
  const update = useCallback(async (uid: string, payload: Record<string, unknown>) => { await api.put(`${endpoint}/${uid}`, payload); await load(true); }, [api, endpoint, load]);
  const remove = useCallback(async (uid: string) => { await api.del(`${endpoint}/${uid}`); await load(true); }, [api, endpoint, load]);
  return { data, loading, error, reload: load, create, update, remove, totalElements, totalPages };
}

/** Singleton config endpoint (GET returns one object, PUT upserts it). */
function useSingleton<T extends object>(
  endpoint: string,
  { enabled = true, reloadAfterSave = true }: { enabled?: boolean; reloadAfterSave?: boolean } = {},
) {
  const api = useHrApi();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (silent = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await api.get<Record<string, unknown>>(endpoint);
      setData((res ?? {}) as T);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to load ${endpoint}`);
      if (!silent) setData(null);
    }
    finally { if (!silent) setLoading(false); }
  }, [api, enabled, endpoint]);
  useEffect(() => { void load(); }, [load]);
  const save = useCallback(async (payload: Record<string, unknown>) => {
    await api.put(endpoint, payload);
    setData((current) => ({ ...(current ?? {}), ...payload } as T));
    if (reloadAfterSave) await load(true);
  }, [api, endpoint, load, reloadAfterSave]);
  return { data, loading, error, reload: load, save };
}

export const useDesignations = (
  filters: SearchFilterClause[] = EMPTY_SEARCH_FILTERS,
  schema: SearchSchema | null | undefined = null,
  options: { enabled?: boolean; page?: number; pageSize?: number } = {}
) => {
  const api = useHrApi();
  const designations = useCrud<Designation>("/designations", { search: true, filters, schema, ...options });
  const setStatus = useCallback(async (uid: string, status: "Enabled" | "Disabled") => {
    await api.patch(`/designations/${uid}/status`, { status });
    await designations.reload(true);
  }, [api, designations.reload]);
  return { ...designations, setStatus };
};
export const useShifts = (options: { enabled?: boolean } = {}) => {
  const api = useHrApi();
  const shifts = useCrud<Shift>("/shifts", options);
  const setStatus = useCallback(async (uid: string, status: "Enabled" | "Disabled") => {
    await api.patch(`/shifts/${uid}/status`, { status });
    await shifts.reload(true);
  }, [api, shifts.reload]);
  return { ...shifts, setStatus };
};
export const useShiftRotations = (options: { enabled?: boolean } = {}) =>
  useCrud<ShiftRotation>("/shift-rotations", options);
export const useDepartments = (
  filters: SearchFilterClause[] = EMPTY_SEARCH_FILTERS,
  schema: SearchSchema | null | undefined = null,
  options: { enabled?: boolean; page?: number; pageSize?: number } = {}
) => {
  const api = useHrApi();
  const departments = useCrud<Department>("/departments", { search: true, filters, schema, ...options });
  const setStatus = useCallback(async (uid: string, status: "Enabled" | "Disabled") => {
    await api.patch(`/departments/${uid}/status`, { status });
    await departments.reload(true);
  }, [api, departments.reload]);
  return { ...departments, setStatus };
};
export const useLeaveTypes = (options: { enabled?: boolean } = {}) => {
  const api = useHrApi();
  const leaveTypes = useCrud<LeaveType>("/leave-types", options);
  const setStatus = useCallback(async (uid: string, status: "Enabled" | "Disabled") => {
    await api.patch(`/leave-types/${uid}/status`, { status });
    await leaveTypes.reload(true);
  }, [api, leaveTypes.reload]);
  return { ...leaveTypes, setStatus };
};
export const useHolidays = (
  filters: SearchFilterClause[] = EMPTY_SEARCH_FILTERS,
  schema: SearchSchema | null | undefined = null,
  options: { enabled?: boolean; page?: number; pageSize?: number } = {}
) => {
  const api = useHrApi();
  const holidays = useCrud<Holiday>("/holidays", { search: true, filters, schema, ...options });
  const setStatus = useCallback(async (uid: string, status: "Enabled" | "Disabled") => {
    await api.patch(`/holidays/${uid}/status`, { status });
    await holidays.reload(true);
  }, [api, holidays.reload]);
  return { ...holidays, setStatus };
};

const BRANCHES_READONLY_MSG =
  "Branches are owned by Jaldee base locations and are read-only in HR. Manage them in the Jaldee business console.";

export function useBranchesAdmin(options: { enabled?: boolean } = {}) {
  const branches = useBranches(options);

  const reject = useCallback(async () => {
    throw new Error(BRANCHES_READONLY_MSG);
  }, []);

  return {
    data: branches.data as BranchRow[],
    loading: branches.loading,
    error: branches.error,
    reload: branches.reload,
    create: reject,
    update: reject,
    remove: reject,
    readOnlyNote: BRANCHES_READONLY_MSG,
  };
}

export const useCompanyProfile = () => useSingleton<CompanyProfile>("/company-profile", { reloadAfterSave: false });
export const useAttendanceRules = (options: { enabled?: boolean } = {}) => useSingleton<AttendanceRule>("/attendance-rules", options);
export const usePayrollSettings = () => useSingleton<PayrollSetting>("/payroll-settings");

export function useConsents() {
  const api = useHrApi();
  const [data, setData] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>("/consents");
      setData(Array.isArray(res) ? res.map((r) => withId<Consent>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load consents"); setData([]); }
    finally { setLoading(false); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);
  return { data, loading, error, reload: load };
}
