import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "../services/useHrApi";

export interface ExpenseClaim {
  id: string; uid?: string; employeeUid?: string; date?: string; amount?: number;
  category?: string; notes?: string; receiptUrl?: string; status?: string;
  modeOfTransport?: string; kms?: number; submittedAt?: string;
}

function withId(r: Record<string, unknown>): ExpenseClaim {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as ExpenseClaim;
}

export function useExpenses() {
  const api = useHrApi();
  const [data, setData] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>("/expenses");
      setData(Array.isArray(res) ? res.map(withId) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load expenses");
      setData([]);
    } finally { setLoading(false); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (payload: Record<string, unknown>) => {
    await api.post("/expenses", payload); await load();
  }, [api, load]);
  const approve = useCallback(async (uid: string) => {
    await api.post(`/expenses/${uid}/approve`); await load();
  }, [api, load]);
  const update = useCallback(async (uid: string, payload: Record<string, unknown>) => {
    await api.put(`/expenses/${uid}`, payload); await load();
  }, [api, load]);

  return { data, loading, error, reload: load, create, approve, update };
}
