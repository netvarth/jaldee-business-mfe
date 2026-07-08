import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";

/** W8 / R6.1 + R6.3 + R6.4 — lifecycle timeline, disciplinary actions, memos. */

export interface LifecycleEvent {
  type: "JOINED" | "PAY_REVISION" | "TRANSFER" | "DISCIPLINARY" | "MEMO" | "EXIT" | string;
  date?: string;
  title?: string;
  detail?: string;
  fromValue?: string;
  toValue?: string;
  referenceUid?: string;
}

export interface DisciplinaryAction {
  id: string;
  uid?: string;
  employeeUid?: string;
  employeeName?: string;
  actionType?: "Suspension" | "Dismissal" | "Demotion" | "Warning";
  status?: "Active" | "Closed" | "Revoked";
  startDate?: string;
  endDate?: string;
  reason?: string;
  notes?: string;
}

export interface WarningMemo {
  id: string;
  uid?: string;
  employeeUid?: string;
  employeeName?: string;
  issuedByUid?: string;
  issuedByName?: string;
  issuedOn?: string;
  category?: string;
  severity?: "Low" | "Medium" | "High";
  description?: string;
  acknowledgedAt?: string;
  ackComment?: string;
}

function withId<T extends { uid?: string; id?: string }>(r: Record<string, unknown>): T {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as T;
}

export function useLifecycleTimeline(employeeUid?: string) {
  const api = useHrApi();
  const [data, setData] = useState<LifecycleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!employeeUid) { setData([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await api.get<LifecycleEvent[]>(`/lifecycle/${employeeUid}/timeline`);
      setData(Array.isArray(res) ? res : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load timeline"); setData([]); }
    finally { setLoading(false); }
  }, [api, employeeUid]);
  useEffect(() => { void load(); }, [load]);
  
  const rejoin = useCallback(async (p: { newDoj: string; note?: string; reuseCode?: boolean }) => {
    if (!employeeUid) return;
    await api.post(`/lifecycle/${employeeUid}/rejoin`, p);
    await load();
  }, [api, load, employeeUid]);

  return { data, loading, error, reload: load, rejoin };
}

export function useDisciplinary(employeeUid?: string) {
  const api = useHrApi();
  const [data, setData] = useState<DisciplinaryAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>(`/lifecycle/disciplinary${employeeUid ? `?employeeUid=${employeeUid}` : ""}`);
      setData(Array.isArray(res) ? res.map((r) => withId<DisciplinaryAction>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load disciplinary actions"); setData([]); }
    finally { setLoading(false); }
  }, [api, employeeUid]);
  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (p: Record<string, unknown>) => { await api.post("/lifecycle/disciplinary", p); await load(); }, [api, load]);
  const close = useCallback(async (uid: string, revoke = false) => { await api.post(`/lifecycle/disciplinary/${uid}/close?revoke=${revoke}`); await load(); }, [api, load]);
  return { data, loading, error, reload: load, create, close };
}

export function useMemos(employeeUid?: string) {
  const api = useHrApi();
  const [data, setData] = useState<WarningMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>(`/lifecycle/memos${employeeUid ? `?employeeUid=${employeeUid}` : ""}`);
      setData(Array.isArray(res) ? res.map((r) => withId<WarningMemo>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load memos"); setData([]); }
    finally { setLoading(false); }
  }, [api, employeeUid]);
  useEffect(() => { void load(); }, [load]);

  const issue = useCallback(async (p: Record<string, unknown>) => { await api.post("/lifecycle/memos", p); await load(); }, [api, load]);
  const acknowledge = useCallback(async (uid: string, comment?: string) => {
    await api.post(`/lifecycle/memos/${uid}/acknowledge`, { comment: comment || null }); await load();
  }, [api, load]);
  const remove = useCallback(async (uid: string) => { await api.del(`/lifecycle/memos/${uid}`); await load(); }, [api, load]);
  return { data, loading, error, reload: load, issue, acknowledge, remove };
}
