import { compactSearchClauses } from "@jaldee/shared-modules";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";

export interface BookingSearchSort {
  field: string;
  direction: string;
}

export interface BookingSearchRequestBody {
  view?: string;
  filters: {
    logic: "AND";
    conditions: Array<{
      field: string;
      operator: string;
      values: string[];
    }>;
  } | null;
  sort: BookingSearchSort[];
  page: number;
  size: number;
}

export function getBookingDateRange(
  date: string,
  viewMode: "DAY" | "WEEK" | "MONTH"
) {
  const currentDate = new Date(date);
  let fromDate = new Date(currentDate);
  let toDate = new Date(currentDate);

  if (viewMode === "WEEK") {
    const day = currentDate.getDay();
    const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
    fromDate = new Date(currentDate);
    fromDate.setDate(diff);
    toDate = new Date(fromDate);
    toDate.setDate(fromDate.getDate() + 6);
  } else if (viewMode === "MONTH") {
    fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    toDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  }

  return {
    fromDate: fromDate.toISOString().split("T")[0],
    toDate: toDate.toISOString().split("T")[0],
  };
}

export function buildBookingSearchBody({
  date,
  viewMode,
  filterClauses,
  schema,
  page = 0,
  size = 500,
}: {
  date: string;
  viewMode: "DAY" | "WEEK" | "MONTH";
  filterClauses: SearchFilterClause[];
  schema: SearchSchema | null | undefined;
  page?: number;
  size?: number;
}): BookingSearchRequestBody {
  const { fromDate, toDate } = getBookingDateRange(date, viewMode);
  const conditions = compactSearchClauses(filterClauses, schema).map((clause) => ({
    field: clause.field,
    operator: clause.operator,
    values: clause.values.filter((value) => value.trim().length > 0),
  }));
  const dateCondition = buildBookingDateCondition(schema, viewMode, date, fromDate, toDate);
  const allConditions = dateCondition ? [dateCondition, ...conditions] : conditions;

  return {
    ...(schema?.defaultView ? { view: schema.defaultView } : {}),
    filters:
      allConditions.length > 0
        ? {
            logic: "AND" as const,
            conditions: allConditions,
          }
        : null,
    sort: buildBookingSort(schema),
    page,
    size,
  };
}

export function formatAppliedFilterSummary(
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

function buildBookingSort(schema: SearchSchema | null | undefined): BookingSearchSort[] {
  if (schema?.defaultSort?.field) {
    return [
      {
        field: schema.defaultSort.field,
        direction: schema.defaultSort.direction ?? "DESC",
      },
    ];
  }

  return [];
}

function buildBookingDateCondition(
  schema: SearchSchema | null | undefined,
  viewMode: "DAY" | "WEEK" | "MONTH",
  date: string,
  fromDate: string,
  toDate: string
) {
  const dateField = resolveBookingDateField(schema);

  if (!dateField) {
    return null;
  }

  if (viewMode === "DAY") {
    return {
      field: dateField,
      operator: "EQ",
      values: [date],
    };
  }

  return {
    field: dateField,
    operator: "BETWEEN",
    values: [fromDate, toDate],
  };
}

function resolveBookingDateField(schema: SearchSchema | null | undefined) {
  const candidates = ["bookingDate", "date", "appointmentDate", "startDate", "serviceDate"];
  const fields = schema?.fields ?? [];

  for (const candidate of candidates) {
    const match = fields.find(
      (field) =>
        field.key === candidate ||
        field.name === candidate ||
        field.aliases?.includes(candidate)
    );

    if (match) {
      return match.key;
    }
  }

  return "bookingDate";
}

function formatOperatorLabel(operator: string) {
  return operator
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
