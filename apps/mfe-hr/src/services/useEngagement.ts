import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "../services/useHrApi";

export interface Announcement {
  id: string; uid?: string; title?: string; description?: string; type?: string;
  startDate?: string; endDate?: string; isPinned?: boolean; acknowledgedBy?: string[];
  status?: string; isAcknowledged?: boolean;
}
export interface TicketResponse { message?: string; respondedBy?: string; respondedAt?: string; }
export interface Ticket {
  id: string; uid?: string; employeeUid?: string; title?: string; category?: string;
  description?: string; department?: string; status?: string; createdAtTs?: string;
  responses?: TicketResponse[];
}

interface UseAnnouncementsOptions {
  scope?: "general" | "ess";
}

function withId<T extends { uid?: string; id?: string }>(r: Record<string, unknown>): T {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as T;
}

function normalizeListResponse<T extends { uid?: string; id?: string }>(res: unknown): T[] {
  if (Array.isArray(res)) {
    return res.map((item) => withId<T>(item as Record<string, unknown>));
  }

  if (res && typeof res === "object" && Array.isArray((res as { items?: unknown[] }).items)) {
    return (res as { items: unknown[] }).items.map((item) => withId<T>(item as Record<string, unknown>));
  }

  return [];
}

export function useAnnouncements(options: UseAnnouncementsOptions = {}) {
  const api = useHrApi();
  const [data, setData] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scope = options.scope ?? "general";
  const listEndpoint = scope === "ess" ? "/me/announcements" : "/announcements";
  const getAcknowledgeEndpoint = (uid: string, employeeUid?: string) => {
    if (scope === "ess") return `/me/announcements/${uid}/acknowledge`;
    return employeeUid
      ? `/announcements/${uid}/acknowledge?employeeUid=${encodeURIComponent(employeeUid)}`
      : `/announcements/${uid}/acknowledge`;
  };
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<unknown>(listEndpoint);
      setData(normalizeListResponse<Announcement>(res));
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load announcements"); setData([]); }
    finally { setLoading(false); }
  }, [api, listEndpoint]);
  useEffect(() => { void load(); }, [load]);
  const create = useCallback(async (payload: Record<string, unknown>) => { await api.post("/announcements", payload); await load(); }, [api, load]);
  const acknowledge = useCallback(async (uid: string, employeeUid?: string) => {
    await api.post(getAcknowledgeEndpoint(uid, employeeUid));
    await load();
  }, [api, getAcknowledgeEndpoint, load]);
  const updateStatus = useCallback(async (uid: string, status: string) => {
    await api.patch(`/announcements/${uid}/status`, { status });
    await load();
  }, [api, load]);
  return { data, loading, error, reload: load, create, acknowledge, updateStatus };
}

export function useTickets() {
  const api = useHrApi();
  const [data, setData] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<unknown>("/tickets");
      setData(normalizeListResponse<Ticket>(res));
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load tickets"); setData([]); }
    finally { setLoading(false); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);
  const create = useCallback(async (payload: Record<string, unknown>) => { await api.post("/tickets", payload); await load(); }, [api, load]);
  const reply = useCallback(async (uid: string, message: string) => { await api.post(`/tickets/${uid}/reply`, { message }); await load(); }, [api, load]);
  return { data, loading, error, reload: load, create, reply };
}
