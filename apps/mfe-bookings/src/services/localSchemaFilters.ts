import { compactSearchClauses } from "@jaldee/shared-modules";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";

type ValueResolver<T> = (item: T) => unknown;

export function applyLocalSchemaFilters<T>(
  items: T[],
  clauses: SearchFilterClause[],
  schema: SearchSchema | null | undefined,
  resolvers: Record<string, ValueResolver<T>>
) {
  const appliedClauses = compactSearchClauses(clauses, schema);

  if (appliedClauses.length === 0) {
    return items;
  }

  return items.filter((item) =>
    appliedClauses.every((clause) => matchesClause(item, clause, schema, resolvers[clause.field]))
  );
}

export function formatAppliedLocalFilterSummary(
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

    if (field?.type === "BOOLEAN") {
      return `${label}: ${clause.values[0] === "true" ? "Yes" : "No"}`;
    }

    const operator = clause.operator === "EQ" ? "" : `${formatOperatorLabel(clause.operator)} `;
    return `${label}: ${operator}${values}`.trim();
  });

  if (appliedClauses.length > 2) {
    parts.push(`+${appliedClauses.length - 2} more`);
  }

  return parts.join(", ");
}

function matchesClause<T>(
  item: T,
  clause: SearchFilterClause,
  schema: SearchSchema | null | undefined,
  resolver?: ValueResolver<T>
) {
  if (!resolver) {
    return true;
  }

  const field = schema?.fields.find((candidate) => candidate.key === clause.field);
  const rawValue = resolver(item);
  const values = clause.values.filter((value) => value.trim().length > 0);

  if (field?.type === "BOOLEAN") {
    return String(Boolean(rawValue)) === (clause.values[0] ?? "false");
  }

  const rawValues = Array.isArray(rawValue) ? rawValue : [rawValue];
  const normalizedFieldValues = rawValues.map((value) => normalizeValue(value, field?.type));
  const normalizedClauseValues = values.map((value) => normalizeValue(value, field?.type));

  switch (clause.operator) {
    case "EQ":
      return normalizedClauseValues.some((value) => normalizedFieldValues.includes(value));
    case "IN":
      return normalizedClauseValues.some((value) => normalizedFieldValues.includes(value));
    case "CONTAINS":
      return normalizedFieldValues.some((value) =>
        normalizedClauseValues.some((needle) => value.includes(needle))
      );
    case "STARTS_WITH":
      return normalizedFieldValues.some((value) =>
        normalizedClauseValues.some((needle) => value.startsWith(needle))
      );
    case "BETWEEN":
      if (normalizedClauseValues.length < 2) {
        return true;
      }
      return normalizedFieldValues.some((value) =>
        value >= normalizedClauseValues[0] && value <= normalizedClauseValues[1]
      );
    default:
      return true;
  }
}

function normalizeValue(value: unknown, fieldType?: string) {
  if (value === null || value === undefined) {
    return "";
  }

  if (fieldType === "NUMBER") {
    return String(Number(value));
  }

  return String(value).trim().toLowerCase();
}

function formatOperatorLabel(operator: string) {
  return operator
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
