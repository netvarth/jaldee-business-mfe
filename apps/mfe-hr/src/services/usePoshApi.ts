import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";

export type PoshStatus = "Open" | "InProgress" | "Resolved" | "Closed";

export interface PoshReply {
  userId?: string;
  message?: string;
  timestamp?: string;
  isInternal?: boolean;
}

export interface PoshEntity {
  id: string;
  uid?: string;
  employeeUid?: string;
  employeeName?: string;
  accusedEmployeeUid?: string;
  title?: string;
  description?: string;
  category?: string;
  status?: PoshStatus;
  fileUrl?: string;
  createdAtTs?: string;
  responses?: PoshReply[];
  confidential?: boolean;
}

function withId<T extends { uid?: string; id?: string }>(r: Record<string, unknown>): T {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as T;
}

export function usePosh() {
  const api = useHrApi();
  const [data, setData] = useState<PoshEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>("/posh");
      setData(Array.isArray(res) ? res.map((r) => withId<PoshEntity>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load posh grievances"); setData([]); }
    finally { setLoading(false); }
  }, [api]);
  
  useEffect(() => { void load(); }, [load]);

  const raise = useCallback(async (p: { title: string; description: string; category?: string; fileUrl?: string; accusedEmployeeUid?: string }) => {
    await api.post("/posh", p); await load();
  }, [api, load]);

  const reply = useCallback(async (uid: string, message: string) => {
    await api.post(`/posh/${uid}/responses`, { message }); await load();
  }, [api, load]);

  const updateStatus = useCallback(async (uid: string, status: PoshStatus) => {
    await api.patch(`/posh/${uid}`, { status }); await load();
  }, [api, load]);

  return { data, loading, error, reload: load, raise, reply, updateStatus };
}

export function useMyPosh(employeeUid: string) {
  const api = useHrApi();
  const [data, setData] = useState<PoshEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employeeUid) return;
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>(`/posh/employee/${employeeUid}`);
      setData(Array.isArray(res) ? res.map((r) => withId<PoshEntity>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load my posh grievances"); setData([]); }
    finally { setLoading(false); }
  }, [api, employeeUid]);
  
  useEffect(() => { void load(); }, [load]);

  return { data, loading, error, reload: load };
}
