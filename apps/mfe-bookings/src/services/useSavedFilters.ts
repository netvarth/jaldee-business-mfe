import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { unwrapList } from "./response";

/** Mirrors backend FilterEntity (filter_tbl). `filter` is an opaque criteria blob. */
export interface SavedFilter {
  uid?: string;
  userUid?: string | null;
  name: string;
  filter: Record<string, unknown>;
  filterType?: string;
  status?: string;
}

export interface SavedFilterQuery {
  q?: string;
  filterType?: string;
  status?: string;
  userUid?: string;
}

/**
 * Saved filters — FilterController @ /filters:
 *   POST /search · GET /{uid} · POST · PUT /{uid} · PATCH /{uid}/status · DELETE /{uid}
 */
export function useSavedFilters(filterType?: string) {
  const api = useBookingApi();
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (query: SavedFilterQuery = {}) => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.post<unknown>(
          "/filters/search",
          { filterType, ...query },
          { params: { page: 0, size: 200 } },
        );
        setFilters(unwrapList<SavedFilter>(data));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load saved filters.");
        setFilters([]);
      } finally {
        setLoading(false);
      }
    },
    [api, filterType],
  );

  useEffect(() => {
    void search();
  }, [search]);

  const create = useCallback(
    async (filter: SavedFilter) => {
      const saved = await api.post<SavedFilter>("/filters", filter);
      await search();
      return saved;
    },
    [api, search],
  );

  const update = useCallback(
    async (uid: string, filter: SavedFilter) => {
      const saved = await api.put<SavedFilter>(`/filters/${uid}`, filter);
      await search();
      return saved;
    },
    [api, search],
  );

  const setStatus = useCallback(
    async (uid: string, status: "Enabled" | "Disabled") => {
      await api.patch(`/filters/${uid}/status`, undefined, { params: { status } });
      await search();
    },
    [api, search],
  );

  const remove = useCallback(
    async (uid: string) => {
      await api.del(`/filters/${uid}`);
      await search();
    },
    [api, search],
  );

  return { filters, loading, error, search, create, update, setStatus, remove };
}
