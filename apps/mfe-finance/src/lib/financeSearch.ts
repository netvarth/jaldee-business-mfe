import { compactSearchClauses, normalizeSearchSchema } from "@jaldee/shared-modules";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import { useCallback, useEffect, useState } from "react";
import { financeApi } from "./financeApi";

export interface FinanceSearchRequestBody {
  view?: string;
  filters: {
    logic: "AND";
    conditions: Array<{ field: string; operator: string; values: string[] }>;
  } | null;
  sort: Array<{ field: string; direction: string }>;
  page: number;
  size: number;
}

export interface FinanceSearchCondition {
  field: string;
  operator: string;
  values: string[];
}

export function buildFinanceSearchBody(
  filterClauses: SearchFilterClause[] = [],
  schema: SearchSchema | null | undefined = null,
  page = 0,
  size = 10,
  fixedConditions: FinanceSearchCondition[] = []
): FinanceSearchRequestBody {
  const dynamicConditions = compactSearchClauses(filterClauses, schema).map((clause) => ({
    field: clause.field,
    operator: clause.operator,
    values: clause.values.filter((value) => value.trim().length > 0),
  }));
  const conditions = [...fixedConditions, ...dynamicConditions];

  return {
    ...(schema?.defaultView ? { view: schema.defaultView } : {}),
    filters: conditions.length ? { logic: "AND", conditions } : null,
    sort: schema?.defaultSort?.field
      ? [{ field: schema.defaultSort.field, direction: schema.defaultSort.direction ?? "DESC" }]
      : [],
    page,
    size,
  };
}

export function buildLocationCondition(
  schema: SearchSchema | null | undefined,
  locationUid: string | null | undefined
): FinanceSearchCondition[] {
  if (!locationUid) {
    return [];
  }

  const locationField = schema?.fields.find(
    (field) => field.key === "locationUid" || field.name === "locationUid"
  );
  const allowedOperators = locationField?.operators ?? [];
  const operator = allowedOperators.includes("EQ")
    ? "EQ"
    : allowedOperators.includes("IN")
      ? "IN"
      : "EQ";

  return [{ field: "locationUid", operator, values: [String(locationUid)] }];
}

export function useFinanceSearchSchema(enabled = true) {
  return usePaymentsInSearchSchema(enabled);
}

export function usePaymentsInSearchSchema(enabled = true) {
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
      const response = await financeApi.revenue.searchSchema<SearchSchema>();
      setSchema(normalizeSearchSchema(response.data));
    } catch (loadError) {
      setSchema(null);
      setError(loadError instanceof Error ? loadError.message : "Failed to load receivable search schema.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { schema, loading, error, refresh: load };
}

export function usePaymentsOutSearchSchema(enabled = true) {
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
      const response = await financeApi.payables.searchSchema<SearchSchema>();
      setSchema(normalizeSearchSchema(response.data));
    } catch (loadError) {
      setSchema(null);
      setError(loadError instanceof Error ? loadError.message : "Failed to load payout search schema.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { schema, loading, error, refresh: load };
}

export function useExpensesSearchSchema(enabled = true) {
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
      const response = await financeApi.expenses.searchSchema<SearchSchema>();
      setSchema(normalizeSearchSchema(response.data));
    } catch (loadError) {
      setSchema(null);
      setError(loadError instanceof Error ? loadError.message : "Failed to load expense search schema.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { schema, loading, error, refresh: load };
}

export function useCustomersSearchSchema(enabled = true) {
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
      const response = await financeApi.customers.searchSchema<SearchSchema>();
      setSchema(normalizeSearchSchema(response.data));
    } catch (loadError) {
      setSchema(null);
      setError(loadError instanceof Error ? loadError.message : "Failed to load consumer search schema.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { schema, loading, error, refresh: load };
}
