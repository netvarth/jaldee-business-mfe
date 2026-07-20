import { compactSearchClauses } from "@jaldee/shared-modules";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";

export interface HrSearchRequestBody {
  view?: string;
  filters: {
    logic: "AND";
    conditions: Array<{ field: string; operator: string; values: string[] }>;
  } | null;
  sort: Array<{ field: string; direction: string }>;
  page: number;
  size: number;
}

export interface HrSearchPage {
  content: Record<string, unknown>[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const EMPTY_SEARCH_FILTERS: SearchFilterClause[] = [];

export function buildHrSearchBody(
  filterClauses: SearchFilterClause[] = EMPTY_SEARCH_FILTERS,
  schema: SearchSchema | null | undefined = null,
  page = 0,
  size = 100
): HrSearchRequestBody {
  const conditions = compactSearchClauses(filterClauses, schema).map((clause) => ({
    field: clause.field,
    operator: clause.operator,
    values: clause.values.filter((value) => value.trim().length > 0),
  }));

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

export function unwrapHrSearchPage(response: unknown): HrSearchPage {
  if (response && typeof response === "object") {
    const value = response as Record<string, unknown>;
    const content = Array.isArray(value.content)
      ? value.content as Record<string, unknown>[]
      : Array.isArray(value.items)
        ? value.items as Record<string, unknown>[]
        : Array.isArray(value.results)
          ? value.results as Record<string, unknown>[]
          : Array.isArray(value.data)
            ? value.data as Record<string, unknown>[]
            : null;

    if (content) {
      return {
        content,
        totalElements: typeof value.totalElements === "number" ? value.totalElements : content.length,
        totalPages: typeof value.totalPages === "number" ? value.totalPages : 1,
        number: typeof value.number === "number" ? value.number : 0,
        size: typeof value.size === "number" ? value.size : content.length,
      };
    }
  }

  const list = Array.isArray(response) ? response as Record<string, unknown>[] : [];
  return { content: list, totalElements: list.length, totalPages: 1, number: 0, size: list.length };
}
