import { useCallback, useEffect, useState } from "react";
import { normalizeSearchSchema } from "@jaldee/shared-modules";
import type { SearchSchema } from "@jaldee/shared-modules";
import { useHrApi } from "./useHrApi";

export function useHrSearchSchema(endpoint: string, enabled = true) {
  const api = useHrApi();
  const [schema, setSchema] = useState<SearchSchema | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<SearchSchema>(`${endpoint}/search/schema`);
      setSchema(normalizeSearchSchema(response));
    } catch (loadError) {
      setSchema(null);
      setError(loadError instanceof Error ? loadError.message : `Failed to load search schema for ${endpoint}.`);
    } finally {
      setLoading(false);
    }
  }, [api, enabled, endpoint]);

  useEffect(() => { void load(); }, [load]);

  return { schema, loading, error, refresh: load };
}

export const useCandidateSearchSchema = () => useHrSearchSchema("/recruitment/candidates");
export const useCareerPostingSearchSchema = () => useHrSearchSchema("/careers/postings");
export const useDesignationSearchSchema = () => useHrSearchSchema("/designations");
export const useDocumentRequestSearchSchema = (enabled = true) => useHrSearchSchema("/document-requests", enabled);
export const useHolidaySearchSchema = () => useHrSearchSchema("/holidays");
export const useDepartmentSearchSchema = () => useHrSearchSchema("/departments");
export const useTicketSearchSchema = () => useHrSearchSchema("/tickets");
