import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchSchema } from "@jaldee/shared-modules";
import { useBookingApi } from "./useBookingApi";
import { loadCalendarSearchSchema } from "./calendarSearchSchema";

export function useCalendarSearchSchema() {
  const api = useBookingApi();
  const [schema, setSchema] = useState<SearchSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestInFlightRef = useRef(false);

  const load = useCallback(async () => {
    if (requestInFlightRef.current) {
      return;
    }

    requestInFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await loadCalendarSearchSchema(api);
      setSchema(response ?? null);
    } catch (loadError) {
      setSchema(null);
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load calendar search schema."
      );
    } finally {
      requestInFlightRef.current = false;
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  return { schema, loading, error, refresh: load };
}
