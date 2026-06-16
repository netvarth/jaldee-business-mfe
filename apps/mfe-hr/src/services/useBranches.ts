import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "../services/useHrApi";

export interface Branch {
  id: string;
  uid?: string;
  name: string;
  code?: string;
  address?: string;
}

function normalize(b: Record<string, unknown>): Branch {
  const uid = (b.uid ?? b.id) as string | undefined;
  return { ...(b as object), id: String(uid ?? ""), uid } as Branch;
}

/** Loads branches from /hr-service/branches. */
export function useBranches() {
  const api = useHrApi();
  const [data, setData] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>("/branches");
      setData(Array.isArray(res) ? res.map(normalize) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load branches");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
