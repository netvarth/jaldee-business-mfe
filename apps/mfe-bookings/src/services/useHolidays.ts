import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { unwrapList } from "./response";

/** Mirrors the backend HolidayEntity (holiday_tbl). */
export interface Holiday {
  uid?: string;
  title: string;
  description?: string;
  /** null/absent ⇒ global (all providers); set ⇒ a specific provider's leave. */
  userUid?: string | null;
  userName?: string | null;
  startDate: string; // ISO yyyy-mm-dd
  endDate: string; // ISO yyyy-mm-dd
  startTime?: string | null; // ISO OffsetDateTime for partial-day
  endTime?: string | null;
  status?: string;
}

export interface HolidayFilters {
  q?: string;
  userUid?: string;
  status?: string;
}

export function useHolidays() {
  const api = useBookingApi();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (filters: HolidayFilters = {}) => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.post<unknown>(
          "/holidays/search",
          { q: filters.q, userUid: filters.userUid, status: filters.status },
          { params: { page: 0, size: 200 } },
        );
        setHolidays(unwrapList<Holiday>(data));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load holidays.");
        setHolidays([]);
      } finally {
        setLoading(false);
      }
    },
    [api],
  );

  useEffect(() => {
    void search();
  }, [search]);

  const create = useCallback(
    async (holiday: Holiday) => {
      const saved = await api.post<Holiday>("/holidays", holiday);
      await search();
      return saved;
    },
    [api, search],
  );

  const update = useCallback(
    async (id: string, holiday: Holiday) => {
      const saved = await api.put<Holiday>(`/holidays/${id}`, holiday);
      await search();
      return saved;
    },
    [api, search],
  );

  const remove = useCallback(
    async (id: string) => {
      await api.del(`/holidays/${id}`);
      await search();
    },
    [api, search],
  );

  return { holidays, loading, error, search, create, update, remove };
}
