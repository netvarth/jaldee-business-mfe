import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";

export type NotificationStatus = "Unread" | "Read";

export interface AppNotification {
  id: string;
  uid?: string;
  type?: string;
  recipientId?: string;
  phoneOrEmail?: string;
  message?: string;
  category?: string;
  timestamp?: string;
  status?: NotificationStatus;
}

function withId<T extends { uid?: string; id?: string }>(r: Record<string, unknown>): T {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as T;
}

export function useNotifications() {
  const api = useHrApi();
  const [data, setData] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>("/notifications/mine");
      setData(Array.isArray(res) ? res.map((r) => withId<AppNotification>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load notifications"); setData([]); }
    finally { setLoading(false); }
  }, [api]);
  
  useEffect(() => { void load(); }, [load]);

  const markAsRead = useCallback(async (uid: string) => {
    await api.patch(`/notifications/${uid}/read`, {}); await load();
  }, [api, load]);

  const markAllAsRead = useCallback(async () => {
    await api.post("/notifications/mark-all-read", {}); await load();
  }, [api, load]);

  return { data, loading, error, reload: load, markAsRead, markAllAsRead };
}
