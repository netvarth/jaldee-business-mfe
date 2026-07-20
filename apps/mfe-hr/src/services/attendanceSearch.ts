import { compactSearchClauses } from "@jaldee/shared-modules";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";

export interface AttendanceSearchRequestBody {
  filters: {
    logic: "AND";
    conditions: Array<{ field: string; operator: string; values: string[] }>;
  } | null;
  sort: Array<{ field: string; direction: string }>;
  page: number;
  size: number;
}

export interface AttendanceSearchPage {
  content: Record<string, unknown>[];
  totalElements: number;
  totalPages: number;
  number: number;   // current page (0-based)
  size: number;
}

export function buildAttendanceSearchBody(
  filterClauses: SearchFilterClause[],
  schema: SearchSchema | null | undefined,
  page = 0,
  size = 20
): AttendanceSearchRequestBody {
  const conditions = compactSearchClauses(filterClauses, schema).map((clause) => ({
    field: clause.field,
    operator: clause.operator,
    values: clause.values.filter((v) => v.trim().length > 0),
  }));

  return {
    filters: conditions.length ? { logic: "AND", conditions } : null,
    sort: schema?.defaultSort?.field
      ? [{ field: schema.defaultSort.field, direction: schema.defaultSort.direction ?? "DESC" }]
      : [{ field: "dateStr", direction: "DESC" }],
    page,
    size,
  };
}

export function unwrapAttendancePage(res: unknown): AttendanceSearchPage {
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.content)) {
      return {
        content: obj.content as Record<string, unknown>[],
        totalElements: (obj.totalElements as number) ?? (obj.content as unknown[]).length,
        totalPages: (obj.totalPages as number) ?? 1,
        number: (obj.number as number) ?? 0,
        size: (obj.size as number) ?? (obj.content as unknown[]).length,
      };
    }
  }
  const list = Array.isArray(res) ? (res as Record<string, unknown>[]) : [];
  return { content: list, totalElements: list.length, totalPages: 1, number: 0, size: list.length };
}
