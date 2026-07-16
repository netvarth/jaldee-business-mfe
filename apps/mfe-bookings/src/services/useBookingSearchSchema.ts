import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeSearchSchema } from "@jaldee/shared-modules";
import type { SearchSchema } from "@jaldee/shared-modules";
import { useBookingApi } from "./useBookingApi";

export function useBookingSearchSchema() {
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
      const response = await api.get<SearchSchema>("/bookings/search/schema");
      setSchema(normalizeSearchSchema(response) ?? null);
    } catch (loadError) {
      setSchema(null);
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load booking search schema."
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
