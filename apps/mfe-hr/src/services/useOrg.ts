import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";

/** W3 / R2.2–R2.6 — org & position model client. */

export interface Position {
  id: string; uid?: string;
  code?: string; name?: string;
  designationUid?: string; designationName?: string;
  departmentUid?: string; departmentName?: string;
  locationUid?: string; locationName?: string;
  sanctionedCount?: number;
}
export interface HierarchyLevel {
  id: string; uid?: string; levelNo?: number; label?: string;
}
export interface AreaManagerBranch {
  id: string; uid?: string; managerEmployeeUid?: string; managerName?: string;
  locationUid?: string; effectiveFrom?: string; effectiveTo?: string;
}
export interface Transfer {
  id: string; uid?: string; employeeUid?: string; employeeName?: string;
  fromLocationUid?: string; toLocationUid?: string;
  fromDepartmentUid?: string; toDepartmentUid?: string;
  fromShiftUid?: string; toShiftUid?: string;
  fromManagerUid?: string; fromManagerName?: string;
  toManagerUid?: string; toManagerName?: string;
  effectiveDate?: string; status?: "Scheduled" | "Effected" | "Cancelled"; reason?: string;
}
export interface BranchNorm {
  locationUid?: string; positionUid?: string; positionName?: string;
  departmentUid?: string; departmentName?: string;
  shiftUid?: string; shiftName?: string;
  sanctioned: number; actual: number; inNotice: number; projected: number;
  flag: "Shortage" | "Excess" | "OK";
}

function withId<T extends { uid?: string; id?: string }>(r: Record<string, unknown>): T {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as T;
}

function useOrgList<T extends { uid?: string; id?: string }>(endpoint: string, failMsg: string, enabled = true) {
  const api = useHrApi();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!enabled) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>(endpoint);
      setData(Array.isArray(res) ? res.map((r) => withId<T>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : failMsg); setData([]); }
    finally { setLoading(false); }
  }, [api, endpoint, failMsg, enabled]);
  useEffect(() => { if (enabled) { void load(); } }, [load, enabled]);
  const create = useCallback(async (p: Record<string, unknown>) => { await api.post(endpoint, p); await load(); }, [api, endpoint, load]);
  const update = useCallback(async (uid: string, p: Record<string, unknown>) => { await api.put(`${endpoint}/${uid}`, p); await load(); }, [api, endpoint, load]);
  const remove = useCallback(async (uid: string) => { await api.del(`${endpoint}/${uid}`); await load(); }, [api, endpoint, load]);
  return { api, data, loading, error, reload: load, create, update, remove };
}

export const usePositions = (enabled = true) => useOrgList<Position>("/org/positions", "Failed to load positions", enabled);
export const useHierarchyLevels = (enabled = true) => useOrgList<HierarchyLevel>("/org/levels", "Failed to load levels", enabled);
export const useAreaManagers = (enabled = true) => useOrgList<AreaManagerBranch>("/org/area-managers", "Failed to load mappings", enabled);

export function useTransfers(enabled = true) {
  const base = useOrgList<Transfer>("/org/transfers", "Failed to load transfers", enabled);
  const effect = useCallback(async (uid: string) => { await base.api.post(`/org/transfers/${uid}/effect`); await base.reload(); }, [base.api, base.reload]);
  const cancel = useCallback(async (uid: string) => { await base.api.post(`/org/transfers/${uid}/cancel`); await base.reload(); }, [base.api, base.reload]);
  return { ...base, effect, cancel };
}

export function useBranchNorms(enabled = true) {
  const api = useHrApi();
  const [data, setData] = useState<BranchNorm[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!enabled) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await api.get<BranchNorm[]>("/org/norms");
      setData(Array.isArray(res) ? res : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load norms"); setData([]); }
    finally { setLoading(false); }
  }, [api, enabled]);
  useEffect(() => { if (enabled) { void load(); } }, [load, enabled]);
  return { data, loading, error, reload: load };
}
