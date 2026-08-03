import { useEffect, useMemo, useState } from "react";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { useDepartmentSearchSchema, useDesignationSearchSchema } from "./useHrSearchSchema";
import { useDepartments, useDesignations } from "./useSettingsData";

const PAGE_SIZE = 100;

function useDebouncedSearch() {
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchValue.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchValue]);

  return { searchValue, setSearchValue, debouncedSearch };
}

function searchFilters(id: string, query: string): SearchFilterClause[] {
  return query.length >= 3
    ? [{ id, field: "name", operator: "CONTAINS", values: [query] }]
    : [];
}

export function usePagedDepartments({ enabled = true }: { enabled?: boolean } = {}) {
  const [page, setPage] = useState(0);
  const [loaded, setLoaded] = useState<ReturnType<typeof useDepartments>["data"]>([]);
  const { searchValue, setSearchValue, debouncedSearch } = useDebouncedSearch();
  const { schema } = useDepartmentSearchSchema(enabled);
  const filters = useMemo(() => searchFilters("department-option-search", debouncedSearch), [debouncedSearch]);
  const result = useDepartments(filters, schema, { enabled, page, pageSize: PAGE_SIZE });

  useEffect(() => { setPage(0); setLoaded([]); }, [debouncedSearch]);
  useEffect(() => {
    setLoaded((current) => {
      const merged = new Map((page === 0 ? [] : current).map((item) => [item.id, item]));
      result.data.forEach((item) => merged.set(item.id, item));
      return Array.from(merged.values());
    });
  }, [page, result.data]);

  return {
    ...result,
    data: loaded,
    searchValue,
    onSearchChange: setSearchValue,
    hasMore: page + 1 < result.totalPages,
    onLoadMore: () => setPage((current) => current + 1 < result.totalPages ? current + 1 : current),
  };
}

export function usePagedDesignations({ enabled = true }: { enabled?: boolean } = {}) {
  const [page, setPage] = useState(0);
  const [loaded, setLoaded] = useState<ReturnType<typeof useDesignations>["data"]>([]);
  const { searchValue, setSearchValue, debouncedSearch } = useDebouncedSearch();
  const { schema } = useDesignationSearchSchema();
  const filters = useMemo(() => searchFilters("designation-option-search", debouncedSearch), [debouncedSearch]);
  const result = useDesignations(filters, schema, { enabled, page, pageSize: PAGE_SIZE });

  useEffect(() => { setPage(0); setLoaded([]); }, [debouncedSearch]);
  useEffect(() => {
    setLoaded((current) => {
      const merged = new Map((page === 0 ? [] : current).map((item) => [item.id, item]));
      result.data.forEach((item) => merged.set(item.id, item));
      return Array.from(merged.values());
    });
  }, [page, result.data]);

  return {
    ...result,
    data: loaded,
    searchValue,
    onSearchChange: setSearchValue,
    hasMore: page + 1 < result.totalPages,
    onLoadMore: () => setPage((current) => current + 1 < result.totalPages ? current + 1 : current),
  };
}
