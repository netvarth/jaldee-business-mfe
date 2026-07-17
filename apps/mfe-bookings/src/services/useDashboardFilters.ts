import { useState, useCallback, useEffect } from "react";
import { useBookingApi } from "./useBookingApi";
import { useMFEProps } from "@jaldee/auth-context";
import { unwrapList } from "./response";
import type { SearchFilterClause } from "@jaldee/shared-modules";

export interface FilterEntity {
  uid?: string;
  userUid?: string;
  name: string;
  filter: {
    filters: SearchFilterClause[];
  };
  filterType: "BOOKING_DASHBOARD" | "CALENDAR_DASHBOARD";
  status?: "Disabled" | "Enabled";
}

export function useDashboardFilters() {
  const api = useBookingApi();
  const { user } = useMFEProps();
  const [filters, setFilters] = useState<FilterEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFilters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<unknown>("/filters/search", {
        filterType: "CALENDAR_DASHBOARD",
      }, {
        params: { page: 0, size: 200 }
      });
      setFilters(unwrapList<FilterEntity>(data));
    } catch (err: any) {
      setError(err.message || "Failed to fetch filters");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void fetchFilters();
  }, [fetchFilters]);

  const saveFilter = async (name: string, draftFilters: SearchFilterClause[]) => {
    const payload: FilterEntity = {
      name,
      filter: { filters: draftFilters },
      filterType: "CALENDAR_DASHBOARD",
      status: "Enabled",
      userUid: user.id,
    };
    const created = await api.post<FilterEntity>("/filters", payload);
    setFilters((prev) => [...prev, created]);
    return created;
  };

  const deleteFilter = async (uid: string) => {
    await api.delete(`/filters/${uid}`);
    setFilters((prev) => prev.filter((f) => f.uid !== uid));
  };

  return {
    filters,
    loading,
    error,
    saveFilter,
    deleteFilter,
    refreshFilters: fetchFilters,
  };
}
