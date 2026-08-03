import { useEffect, useMemo, useState } from "react";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { useEmployees } from "./useEmployees";
import { useEmployeeSearchSchema } from "./useEmployeeSearchSchema";

const PAGE_SIZE = 100;
const EMPTY_FILTERS: SearchFilterClause[] = [];

export function usePagedEmployeeOptions({ enabled = true, filters: baseFilters = EMPTY_FILTERS }: { enabled?: boolean; filters?: SearchFilterClause[] } = {}) {
  const [page, setPage] = useState(0);
  const [loaded, setLoaded] = useState<ReturnType<typeof useEmployees>["data"]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { schema } = useEmployeeSearchSchema();

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchValue.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchValue]);

  useEffect(() => {
    setPage(0);
    setLoaded([]);
  }, [debouncedSearch, baseFilters]);

  const filters = useMemo<SearchFilterClause[]>(() => [
    ...baseFilters,
    ...(debouncedSearch.length >= 3
      ? [{ id: "employee-option-search", field: "name", operator: "CONTAINS", values: [debouncedSearch] } as SearchFilterClause]
      : []),
  ], [baseFilters, debouncedSearch]);
  const result = useEmployees(filters, schema, { enabled, page, pageSize: PAGE_SIZE });

  useEffect(() => {
    setLoaded((current) => {
      const merged = new Map((page === 0 ? [] : current).map((employee) => [employee.id, employee]));
      result.data.forEach((employee) => merged.set(employee.id, employee));
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
