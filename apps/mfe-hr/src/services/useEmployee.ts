import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "../services/useHrApi";
import type { Employee } from "../types";

function normalize(e: Record<string, unknown>): Employee {
  const uid = (e.uid ?? e.id) as string | undefined;
  return { ...(e as object), id: String(uid ?? ""), uid } as Employee;
}

/** Loads a single employee from /hr-service/employees/{id}. */
export function useEmployee(id: string | undefined) {
  const api = useHrApi();
  const [data, setData] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Record<string, unknown>>(`/employees/${id}`);
      setData(res ? normalize(res) : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load employee");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => { void load(); }, [load]);

  return { data, loading, error, reload: load };
}
