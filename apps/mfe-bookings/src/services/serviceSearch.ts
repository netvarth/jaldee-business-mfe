import { compactSearchClauses } from "@jaldee/shared-modules";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";

export interface ServiceSearchSort {
  field: string;
  direction: string;
}

export interface ServiceSearchRequestBody {
  view?: string;
  filters: {
    logic: "AND";
    conditions: Array<{
      field: string;
      operator: string;
      values: string[];
    }>;
  } | null;
  sort: ServiceSearchSort[];
  page: number;
  size: number;
}

export function buildServiceSearchBody({
  filterClauses,
  schema,
  page = 0,
  size = 100,
}: {
  filterClauses: SearchFilterClause[];
  schema: SearchSchema | null | undefined;
  page?: number;
  size?: number;
}): ServiceSearchRequestBody {
  const conditions = compactSearchClauses(filterClauses, schema).map((clause) => ({
    field: clause.field,
    operator: clause.operator,
    values: clause.values.filter((value) => value.trim().length > 0),
  }));

  return {
    ...(schema?.defaultView ? { view: schema.defaultView } : {}),
    filters:
      conditions.length > 0
        ? {
            logic: "AND",
            conditions,
          }
        : null,
    sort: buildServiceSearchSort(schema),
    page,
    size,
  };
}

export function formatAppliedServiceFilterSummary(
  clauses: SearchFilterClause[],
  schema: SearchSchema | null | undefined
) {
  const appliedClauses = compactSearchClauses(clauses, schema);

  if (appliedClauses.length === 0) {
    return "";
  }

  const parts = appliedClauses.slice(0, 2).map((clause) => {
    const field = schema?.fields.find((item) => item.key === clause.field);
    const label = field?.label ?? clause.field;
    const values = clause.values.filter(Boolean).join(" - ");
    const operator = clause.operator === "EQ" ? "" : `${formatOperatorLabel(clause.operator)} `;
    return `${label}: ${operator}${values}`.trim();
  });

  if (appliedClauses.length > 2) {
    parts.push(`+${appliedClauses.length - 2} more`);
  }

  return parts.join(", ");
}

function buildServiceSearchSort(schema: SearchSchema | null | undefined): ServiceSearchSort[] {
  if (!schema?.defaultSort?.field) {
    return [];
  }

  return [
    {
      field: schema.defaultSort.field,
      direction: schema.defaultSort.direction ?? "DESC",
    },
  ];
}

function formatOperatorLabel(operator: string) {
  return operator
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
