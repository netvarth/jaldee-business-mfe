import { useCallback, useEffect, useState } from "react";
import { useMFEProps } from "@jaldee/auth-context";
import { useHrApi } from "../services/useHrApi";
import { useBranches } from "./useBranches";
import type { ClockType } from "../types";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import { buildHrSearchBody, EMPTY_SEARCH_FILTERS, unwrapHrSearchPage } from "./hrSearch";

export interface Designation { id: string; uid?: string; name?: string; code?: string; department?: string; hrDepartmentUid?: string | null; level?: number; description?: string; }
export interface Shift { id: string; uid?: string; name?: string; startTime?: string; endTime?: string; graceMinutes?: number; halfDayThresholdMinutes?: number; breakMinutes?: number; break_minutes?: number; weeklyOffDays?: string[]; }
export interface Consent { id: string; uid?: string; employeeUid?: string; purpose?: string; status?: string; policyVersion?: string; grantedAt?: string; }
export interface BranchRow { id: string; uid?: string; name?: string; code?: string; address?: string; latitude?: number; longitude?: number; radius?: number; }
export interface Department { id: string; uid?: string; name?: string; code?: string; headEmployeeUid?: string; }
export interface LeaveType { id: string; uid?: string; name?: string; category?: string; annualQuota?: number; carryForward?: boolean; carryForwardMax?: number; accrualType?: string; paid?: boolean; colorHex?: string; }
export interface Holiday { id: string; uid?: string; name?: string; date?: string; type?: string; }

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
  uid?: string; payCycle?: string; payDay?: number; currency?: string; pfEnabled?: boolean; pfRate?: number;
  esiEnabled?: boolean; esiRate?: number; professionalTax?: number; tdsEnabled?: boolean;
  ptEnabled?: boolean; esiEmployerRate?: number; pfWageCeiling?: number;
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
  const create = useCallback(async (payload: Record<string, unknown>) => { await api.post(endpoint, payload); await load(true); }, [api, endpoint, load]);
  const update = useCallback(async (uid: string, payload: Record<string, unknown>) => { await api.put(`${endpoint}/${uid}`, payload); await load(true); }, [api, endpoint, load]);
  const remove = useCallback(async (uid: string) => { await api.del(`${endpoint}/${uid}`); await load(true); }, [api, endpoint, load]);
  return { data, loading, error, reload: load, create, update, remove, totalElements, totalPages };
}

/** Singleton config endpoint (GET returns one object, PUT upserts it). */
function useSingleton<T extends object>(endpoint: string) {
  const api = useHrApi();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (silent = false) => {
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
  }, [api, endpoint]);
  useEffect(() => { void load(); }, [load]);
  const save = useCallback(async (payload: Record<string, unknown>) => {
    await api.put(endpoint, payload);
    setData((current) => ({ ...(current ?? {}), ...payload } as T));
    await load(true);
  }, [api, endpoint, load]);
  return { data, loading, error, reload: load, save };
}

export const useDesignations = (
  filters: SearchFilterClause[] = EMPTY_SEARCH_FILTERS,
  schema: SearchSchema | null | undefined = null,
  options: { enabled?: boolean; page?: number; pageSize?: number } = {}
) => useCrud<Designation>("/designations", { search: true, filters, schema, ...options });
export const useShifts = () => useCrud<Shift>("/shifts");
export const useDepartments = (
  filters: SearchFilterClause[] = EMPTY_SEARCH_FILTERS,
  schema: SearchSchema | null | undefined = null,
  options: { enabled?: boolean; page?: number; pageSize?: number } = {}
) => useCrud<Department>("/departments", { search: true, filters, schema, ...options });
export const useLeaveTypes = () => useCrud<LeaveType>("/leave-types");
export const useHolidays = (
  filters: SearchFilterClause[] = EMPTY_SEARCH_FILTERS,
  schema: SearchSchema | null | undefined = null,
  options: { enabled?: boolean; page?: number; pageSize?: number } = {}
) => useCrud<Holiday>("/holidays", { search: true, filters, schema, ...options });

const BRANCHES_READONLY_MSG =
  "Branches are owned by Jaldee base locations and are read-only in HR. Manage them in the Jaldee business console.";

export function useBranchesAdmin() {
  const branches = useBranches();

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

export const useCompanyProfile = () => useSingleton<CompanyProfile>("/company-profile");
export const useAttendanceRules = () => useSingleton<AttendanceRule>("/attendance-rules");
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
