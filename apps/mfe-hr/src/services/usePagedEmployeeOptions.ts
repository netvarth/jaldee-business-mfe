import { useEffect, useMemo, useState } from "react";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { useEmployees } from "./useEmployees";
import { useEmployeeSearchSchema } from "./useEmployeeSearchSchema";

const PAGE_SIZE = 100;
const EMPTY_FILTERS: SearchFilterClause[] = [];

export function isActiveEmployee(employee: { status?: string | null }) {
  const status = (employee.status || "Active").trim().toLowerCase();
  return !["inactive", "disabled", "deactivated"].includes(status);
}

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
      const optionKey = (employee: ReturnType<typeof useEmployees>["data"][number], index: number) =>
        employee.id || employee.uid || employee.employeeId || employee.email || `employee-option-${page}-${index}`;
      const merged = new Map((page === 0 ? [] : current).map((employee, index) => [optionKey(employee, index), employee]));
      // Employee creation may leave status empty or use a backend-specific
      // active value. Exclude only statuses that are explicitly disabled.
      result.data.filter(isActiveEmployee).forEach((employee, index) => merged.set(optionKey(employee, index), employee));
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
