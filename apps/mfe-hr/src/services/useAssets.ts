import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";

/** W9 / R9.1 — asset registry + allocation lifecycle client. */

export type AssetStatus = "Available" | "Allocated" | "UnderRepair" | "Lost" | "Retired";

export interface Asset {
  id: string;
  uid?: string;
  assetType?: string;
  name?: string;
  tagNumber?: string;
  serialNumber?: string;
  assetValue?: number;
  ownerDepartment?: string;
  accountsRef?: string;
  status?: AssetStatus;
  notes?: string;
  holderEmployeeUid?: string;
  holderEmployeeName?: string;
  issuedOn?: string;
}

export interface AssetAllocation {
  id: string;
  uid?: string;
  assetUid?: string;
  assetName?: string;
  assetType?: string;
  tagNumber?: string;
  employeeUid?: string;
  employeeName?: string;
  issuedOn?: string;
  issueCondition?: string;
  returnedOn?: string;
  returnCondition?: string;
}

function withId<T extends { uid?: string; id?: string }>(r: Record<string, unknown>): T {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as T;
}

export function useAssets() {
  const api = useHrApi();
  const [data, setData] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>("/assets");
      setData(Array.isArray(res) ? res.map((r) => withId<Asset>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load assets"); setData([]); }
    finally { setLoading(false); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (p: Record<string, unknown>) => { await api.post("/assets", p); await load(); }, [api, load]);
  const update = useCallback(async (uid: string, p: Record<string, unknown>) => { await api.put(`/assets/${uid}`, p); await load(); }, [api, load]);
  const remove = useCallback(async (uid: string) => { await api.del(`/assets/${uid}`); await load(); }, [api, load]);
  const allocate = useCallback(async (uid: string, employeeUid: string, condition?: string) => {
    await api.post(`/assets/${uid}/allocate`, { employeeUid, condition: condition || null }); await load();
  }, [api, load]);
  const returnAsset = useCallback(async (uid: string, opts?: { condition?: string; lost?: boolean }) => {
    await api.post(`/assets/${uid}/return`, { condition: opts?.condition || null, lost: !!opts?.lost }); await load();
  }, [api, load]);
  const history = useCallback(async (uid: string) => {
    const res = await api.get<Record<string, unknown>[]>(`/assets/${uid}/history`);
    return Array.isArray(res) ? res.map((r) => withId<AssetAllocation>(r)) : [];
  }, [api]);

  return { data, loading, error, reload: load, create, update, remove, allocate, returnAsset, history };
}

/** Assets currently (or historically) held by one employee. */
export function useEmployeeAssets(employeeUid?: string, openOnly = false) {
  const api = useHrApi();
  const [data, setData] = useState<AssetAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employeeUid) { setData([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>(`/assets/employee/${employeeUid}?openOnly=${openOnly}`);
      setData(Array.isArray(res) ? res.map((r) => withId<AssetAllocation>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load employee assets"); setData([]); }
    finally { setLoading(false); }
  }, [api, employeeUid, openOnly]);
  useEffect(() => { void load(); }, [load]);

  return { data, loading, error, reload: load };
}
