import { useCallback, useEffect, useState } from "react";
import { normalizeSearchSchema } from "@jaldee/shared-modules";
import type { SearchSchema } from "@jaldee/shared-modules";
import { useBookingApi } from "./useBookingApi";

export function useQrLinkSearchSchema() {
  const api = useBookingApi();
  const [schema, setSchema] = useState<SearchSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get<any>("/qr-links/search/schema");
      const schemaData = Array.isArray(response) ? { fields: response } : response;
      setSchema(normalizeSearchSchema(schemaData) ?? null);
    } catch (loadError) {
      setSchema(null);
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load QR Link search schema."
      );
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  return { schema, loading, error, reload: load };
}
