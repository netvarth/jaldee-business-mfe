import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";

export interface PendingAction {
  uid: string;
  actionType: string;
  payloadJson?: string;
  requestedBy: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export function usePendingActions() {
  const api = useHrApi();
  const [data, setData] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PendingAction[]>("/pending-actions");
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pending actions");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const approveAction = useCallback(async (uid: string, comment?: string) => {
    await api.post(`/pending-actions/${uid}/approve`, { comment: comment || null });
    await load();
  }, [api, load]);

  const rejectAction = useCallback(async (uid: string, comment?: string) => {
    await api.post(`/pending-actions/${uid}/reject`, { comment: comment || null });
    await load();
  }, [api, load]);

  return { data, loading, error, reload: load, approveAction, rejectAction };
}
