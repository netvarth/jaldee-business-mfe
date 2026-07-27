import { useCallback, useEffect, useState } from "react";
import { normalizeSearchSchema } from "@jaldee/shared-modules";
import type { SearchSchema } from "@jaldee/shared-modules";
import { useHrApi } from "./useHrApi";

export function useEmployeeSearchSchema() {
  const api = useHrApi();
  const [schema, setSchema] = useState<SearchSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<SearchSchema>("/employees/search/schema");
      const normalized = normalizeSearchSchema(response);
      setSchema({
        ...normalized,
        fields: normalized.fields.map((field) => ({
          ...field,
          values: field.values?.filter((value) => {
            const option = value.trim();
            return option !== "" && option !== "-" && option !== "—" && !option.startsWith("â€");
          }),
        })),
      });
    } catch (loadError) {
      setSchema(null);
      setError(loadError instanceof Error ? loadError.message : "Failed to load employee filters.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { void load(); }, [load]);

  return { schema, loading, error, refresh: load };
}
