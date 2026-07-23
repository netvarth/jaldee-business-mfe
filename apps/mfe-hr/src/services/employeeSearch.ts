import { compactSearchClauses } from "@jaldee/shared-modules";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";

export interface EmployeeSearchRequestBody {
  view?: string;
  filters: {
    logic: "AND";
    conditions: Array<{ field: string; operator: string; values: string[] }>;
  } | null;
  sort: Array<{ field: string; direction: string }>;
  page: number;
  size: number;
}

export function buildEmployeeSearchBody(
  filterClauses: SearchFilterClause[],
  schema: SearchSchema | null | undefined,
  page = 0,
  size = 100,
  sort?: Array<{ field: string; direction: string }>
): EmployeeSearchRequestBody {
  const conditions = compactSearchClauses(filterClauses, schema).map((clause) => ({
    field: clause.field,
    operator: clause.operator,
    values: clause.values.filter((value) => value.trim().length > 0),
  }));

  return {
    ...(schema?.defaultView ? { view: schema.defaultView } : {}),
    filters: conditions.length ? { logic: "AND", conditions } : null,
    sort: sort ?? (schema?.defaultSort?.field
      ? [{ field: schema.defaultSort.field, direction: schema.defaultSort.direction ?? "DESC" }]
      : []),
    page,
    size,
  };
}
