import { useCallback, useEffect, useState } from "react";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import { buildAnnouncementSearchBody } from "./announcementSearch";
import { buildHrSearchBody, unwrapHrSearchPage } from "./hrSearch";
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
  enabled?: boolean;
}

const EMPTY_FILTERS: SearchFilterClause[] = [];

function isUseAnnouncementsOptions(value: unknown): value is UseAnnouncementsOptions {
  return Boolean(value && typeof value === "object" && ("scope" in value || "enabled" in value));
}

function withId<T extends { uid?: string; id?: string }>(r: Record<string, unknown>): T {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as T;
}

function normalizeListResponse<T extends { uid?: string; id?: string }>(res: unknown): T[] {
  if (Array.isArray(res)) {
    return res.map((item) => withId<T>(item as Record<string, unknown>));
  }

  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    for (const key of ["content", "items", "results", "data"]) {
      if (Array.isArray(obj[key])) {
        return (obj[key] as unknown[]).map((item) => withId<T>(item as Record<string, unknown>));
      }
    }
  }

  return [];
}

export function useAnnouncements(
  filterClausesOrOptions: SearchFilterClause[] | UseAnnouncementsOptions = EMPTY_FILTERS,
  schema: SearchSchema | null | undefined = null,
  options: UseAnnouncementsOptions = {}
) {
  const legacyOptions = isUseAnnouncementsOptions(filterClausesOrOptions) ? filterClausesOrOptions : null;
  const filterClauses = legacyOptions ? EMPTY_FILTERS : filterClausesOrOptions;
  const mergedOptions = legacyOptions ?? options;
  const scope = mergedOptions.scope ?? "general";
  const enabled = mergedOptions.enabled ?? true;
  const api = useHrApi();
  const [data, setData] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const listEndpoint = scope === "ess" ? "/me/announcements" : "/announcements";
  const getAcknowledgeEndpoint = (uid: string, employeeUid?: string) => {
    if (scope === "ess") return `/me/announcements/${uid}/acknowledge`;
    return employeeUid
      ? `/announcements/${uid}/acknowledge?employeeUid=${encodeURIComponent(employeeUid)}`
      : `/announcements/${uid}/acknowledge`;
  };

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (scope === "general") {
        try {
          const res = await api.post<unknown>(
            "/announcements/search",
            buildAnnouncementSearchBody(filterClauses, schema)
          );
          setData(normalizeListResponse<Announcement>(res));
          return;
        } catch (searchError) {
          const res = await api.get<unknown>("/announcements");
          setData(normalizeListResponse<Announcement>(res));
          return;
        }
      } else {
        const res = await api.get<unknown>(listEndpoint);
        setData(normalizeListResponse<Announcement>(res));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load announcements");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api, enabled, filterClauses, listEndpoint, schema, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (payload: Record<string, unknown>) => {
      await api.post("/announcements", payload);
      await load();
    },
    [api, load]
  );

  const acknowledge = useCallback(
    async (uid: string, employeeUid?: string) => {
      await api.post(getAcknowledgeEndpoint(uid, employeeUid));
      await load();
    },
    [api, getAcknowledgeEndpoint, load]
  );

  const updateStatus = useCallback(
    async (uid: string, status: string) => {
      await api.patch(`/announcements/${uid}/status`, { status });
      await load();
    },
    [api, load]
  );

  return { data, loading, error, reload: load, create, acknowledge, updateStatus };
}

export function useTickets(
  filterClauses: SearchFilterClause[] = EMPTY_FILTERS,
  schema: SearchSchema | null | undefined = null,
  { enabled = true, page = 0, pageSize = 20 }: { enabled?: boolean; page?: number; pageSize?: number } = {}
) {
  const api = useHrApi();
  const [data, setData] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const load = useCallback(async () => {
    if (!enabled) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await api.post<unknown>("/tickets/search", buildHrSearchBody(filterClauses, schema, page, pageSize));
      const pageResult = unwrapHrSearchPage(res);
      setData(pageResult.content.map((item) => withId<Ticket>(item)));
      setTotalElements(pageResult.totalElements);
      setTotalPages(pageResult.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tickets");
      setData([]);
      setTotalElements(0);
      setTotalPages(0);
    }
    finally { setLoading(false); }
  }, [api, enabled, filterClauses, page, pageSize, schema]);
  useEffect(() => { void load(); }, [load]);
  const create = useCallback(async (payload: Record<string, unknown>) => { await api.post("/tickets", payload); await load(); }, [api, load]);
  const reply = useCallback(async (uid: string, message: string) => { await api.post(`/tickets/${uid}/reply`, { message }); await load(); }, [api, load]);
  return { data, loading, error, reload: load, create, reply, totalElements, totalPages };
}
