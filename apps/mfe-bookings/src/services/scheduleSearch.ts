import { compactSearchClauses } from "@jaldee/shared-modules";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";

export interface ScheduleSearchSort {
  field: string;
  direction: string;
}

export interface ScheduleSearchRequestBody {
  view?: string;
  filters: {
    logic: "AND";
    conditions: Array<{
      field: string;
      operator: string;
      values: string[];
    }>;
  } | null;
  sort: ScheduleSearchSort[];
  page: number;
  size: number;
}

export function buildScheduleSearchBody({
  filterClauses,
  schema,
  page = 0,
  size = 100,
}: {
  filterClauses: SearchFilterClause[];
  schema: SearchSchema | null | undefined;
  page?: number;
  size?: number;
}): ScheduleSearchRequestBody {
  const conditions = compactSearchClauses(filterClauses, schema).map((clause) => ({
    field: clause.field,
    operator: clause.operator,
    values: clause.values.filter((value) => value.trim().length > 0),
  }));

  return {
    filters:
      conditions.length > 0
        ? {
            logic: "AND",
            conditions,
          }
        : null,
    sort: buildScheduleSearchSort(schema),
    page,
    size,
  };
}

function buildScheduleSearchSort(schema: SearchSchema | null | undefined): ScheduleSearchSort[] {
  const sortField = schema?.defaultSort?.field?.trim();
  if (!sortField) {
    return [];
  }

  if (sortField === "bookingChannels" || sortField === "booking_channels") {
    return [];
  }

  const sortableField = schema?.fields.find((field) => {
    const fieldName = "key" in field ? field.key : field.name;
    return fieldName === sortField && field.sortable;
  });

  if (!sortableField) {
    return [];
  }

  return [
    {
      field: sortField,
      direction: schema.defaultSort.direction ?? "DESC",
    },
  ];
}
