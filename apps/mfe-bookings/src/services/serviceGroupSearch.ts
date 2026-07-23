import { compactSearchClauses } from "@jaldee/shared-modules";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";

export interface ServiceGroupSearchSort {
  field: string;
  direction: string;
}

export interface ServiceGroupSearchRequestBody {
  view?: string;
  filters:
    | {
        logic: "AND";
        conditions: Array<{
          field: string;
          operator: string;
          values: string[];
        }>;
      }
    | null;
  sort: ServiceGroupSearchSort[];
  page: number;
  size: number;
}

export function buildServiceGroupSearchBody({
  filterClauses,
  schema,
  page = 0,
  size = 100,
}: {
  filterClauses: SearchFilterClause[];
  schema: SearchSchema | null | undefined;
  page?: number;
  size?: number;
}): ServiceGroupSearchRequestBody {
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
    sort: buildServiceGroupSearchSort(schema),
    page,
    size,
  };
}

export function formatAppliedServiceGroupFilterSummary(
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

function buildServiceGroupSearchSort(
  schema: SearchSchema | null | undefined
): ServiceGroupSearchSort[] {
  if (!schema?.defaultSort?.field) {
    return [];
  }

  const sortableField = schema.fields.find(
    (field) =>
      field.key === schema.defaultSort?.field ||
      field.name === schema.defaultSort?.field ||
      field.aliases?.includes(schema.defaultSort?.field ?? "")
  );

  if (!sortableField) {
    return [];
  }

  return [
    {
      field: sortableField.key,
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
