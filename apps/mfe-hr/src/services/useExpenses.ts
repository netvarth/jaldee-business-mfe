import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "../services/useHrApi";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import { buildHrSearchBody, unwrapHrSearchPage } from "./hrSearch";

export interface ExpenseClaim {
  id: string; uid?: string; employeeUid?: string; date?: string; amount?: number;
  category?: string; notes?: string; receiptUrl?: string; status?: string;
  modeOfTransport?: string; kms?: number; submittedAt?: string;
}

function withId(r: Record<string, unknown>): ExpenseClaim {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as ExpenseClaim;
}

export function useExpenses(
  filters: SearchFilterClause[] = [],
  schema: SearchSchema | null = null,
  options: { scope?: "admin" | "ess" } = {},
) {
  const api = useHrApi();
  const basePath = options.scope === "ess" ? "/me/expenses" : "/expenses";
  const [data, setData] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = schema
        ? await api.post<unknown>(`${basePath}/search`, buildHrSearchBody(filters, schema, 0, 1000))
        : await api.get<Record<string, unknown>[]>(basePath);
      const records = schema ? unwrapHrSearchPage(res).content : (Array.isArray(res) ? res : []);
      setData(records.map(withId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load expenses");
      setData([]);
    } finally { setLoading(false); }
  }, [api, basePath, filters, schema]);
  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (payload: Record<string, unknown>, receipt?: File | null) => {
    if (options.scope === "ess" && receipt) {
      const multipart = new FormData();
      multipart.append("request", new Blob([JSON.stringify(payload)], { type: "application/json" }));
      multipart.append("file", receipt);
      await api.post(basePath, multipart);
    } else {
      await api.post(basePath, payload);
    }
    await load();
  }, [api, basePath, load, options.scope]);
  const approve = useCallback(async (uid: string) => {
    await api.post(`/expenses/${uid}/approve`); await load();
  }, [api, load]);
  const reimburse = useCallback(async (uid: string) => {
    await api.post(`/expenses/${uid}/reimburse`); await load();
  }, [api, load]);
  const pay = useCallback(async (uid: string) => {
    await api.post(`/expenses/${uid}/pay`); await load();
  }, [api, load]);
  const update = useCallback(async (uid: string, payload: Record<string, unknown>) => {
    await api.put(`/expenses/${uid}`, payload); await load();
  }, [api, load]);

  return { data, loading, error, reload: load, create, approve, reimburse, pay, update };
}
