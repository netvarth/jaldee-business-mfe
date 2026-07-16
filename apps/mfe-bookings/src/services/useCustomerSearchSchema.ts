import { useCallback, useEffect, useState } from "react";
import { normalizeSearchSchema } from "@jaldee/shared-modules";
import type { SearchSchema } from "@jaldee/shared-modules";
import { useBookingApi } from "./useBookingApi";

export function useCustomerSearchSchema() {
  const api = useBookingApi();
  const [schema, setSchema] = useState<SearchSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get<SearchSchema>("/consumers/filter/schema");
      setSchema(normalizeSearchSchema(response) ?? null);
    } catch (loadError) {
      setSchema(null);
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load customer search schema."
      );
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  return { schema, loading, error, refresh: load };
}
