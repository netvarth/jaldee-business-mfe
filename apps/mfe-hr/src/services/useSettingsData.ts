import { useCallback, useEffect, useState } from "react";
import { useMFEProps } from "@jaldee/auth-context";
import { useHrApi } from "../services/useHrApi";
import { mapAvailableLocationsToBranches } from "./useBranches";
import type { ClockType } from "../types";

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

/** Generic list CRUD against a collection endpoint (GET, POST, PUT/{uid}, DELETE/{uid}). */
function useCrud<T extends { uid?: string; id?: string }>(endpoint: string) {
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
    }
    finally { setLoading(false); }
  }, [api, endpoint]);
  useEffect(() => { void load(); }, [load]);
  const create = useCallback(async (payload: Record<string, unknown>) => { await api.post(endpoint, payload); await load(); }, [api, endpoint, load]);
  const update = useCallback(async (uid: string, payload: Record<string, unknown>) => { await api.put(`${endpoint}/${uid}`, payload); await load(); }, [api, endpoint, load]);
  const remove = useCallback(async (uid: string) => { await api.del(`${endpoint}/${uid}`); await load(); }, [api, endpoint, load]);
  return { data, loading, error, reload: load, create, update, remove };
}

/** Singleton config endpoint (GET returns one object, PUT upserts it). */
function useSingleton<T extends object>(endpoint: string) {
  const api = useHrApi();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>>(endpoint);
      setData((res ?? {}) as T);
    } catch (e) { setError(e instanceof Error ? e.message : `Failed to load ${endpoint}`); setData(null); }
    finally { setLoading(false); }
  }, [api, endpoint]);
  useEffect(() => { void load(); }, [load]);
  const save = useCallback(async (payload: Record<string, unknown>) => { await api.put(endpoint, payload); await load(); }, [api, endpoint, load]);
  return { data, loading, error, reload: load, save };
}

export const useDesignations = () => useCrud<Designation>("/designations");
export const useShifts = () => useCrud<Shift>("/shifts");
export const useDepartments = () => useCrud<Department>("/departments");
export const useLeaveTypes = () => useCrud<LeaveType>("/leave-types");
export const useHolidays = () => useCrud<Holiday>("/holidays");

const BRANCHES_READONLY_MSG =
  "Branches are owned by Jaldee base locations and are read-only in HR. Manage them in the Jaldee business console.";

export function useBranchesAdmin() {
  const mfeProps = useMFEProps() as ReturnType<typeof useMFEProps> & {
    availableLocations?: Array<{
      id: string;
      uid?: string;
      name: string;
      code?: string;
      address?: string;
      latitude?: string | number;
      longitude?: string | number;
    }>;
  };
  const data = mapAvailableLocationsToBranches(mfeProps.availableLocations) as BranchRow[];

  const reject = useCallback(async () => {
    throw new Error(BRANCHES_READONLY_MSG);
  }, []);

  return {
    data,
    loading: false,
    error: null,
    reload: async () => undefined,
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
