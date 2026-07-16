import type {
  SearchOperatorDefinition,
  SearchSchema,
  SearchSchemaField,
  SearchSchemaView,
} from "./types";

function normalizeSchemaField(raw: Record<string, unknown>, fallbackKey?: string): SearchSchemaField | null {
  const keyCandidate = [
    raw.key,
    raw.field,
    raw.fieldName,
    raw.name,
    raw.param,
    raw.paramName,
    raw.parameter,
    raw.parameterName,
    raw.queryParam,
    raw.id,
    fallbackKey,
  ].find((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (!keyCandidate) {
    return null;
  }

  const aliases = new Set<string>();
  if (Array.isArray(raw.aliases)) {
    raw.aliases.forEach((value) => {
      if (typeof value === "string" && value.trim()) {
        aliases.add(value.trim());
      }
    });
  }

  const labelCandidate = [
    raw.label,
    raw.title,
    raw.displayName,
    raw.name,
    fallbackKey,
    keyCandidate,
  ].find((value): value is string => typeof value === "string" && value.trim().length > 0);

  return {
    key: keyCandidate.trim(),
    name: keyCandidate.trim(),
    label: (labelCandidate ?? keyCandidate).trim(),
    aliases: aliases.size > 0 ? [...aliases] : undefined,
    type: typeof raw.type === "string" ? raw.type : undefined,
    inputType: typeof raw.inputType === "string" ? raw.inputType : undefined,
    filterable: typeof raw.filterable === "boolean" ? raw.filterable : undefined,
    searchable: typeof raw.searchable === "boolean" ? raw.searchable : undefined,
    sortable: typeof raw.sortable === "boolean" ? raw.sortable : undefined,
    operators: Array.isArray(raw.operators)
      ? raw.operators.filter(
          (value): value is string => typeof value === "string" && value.trim().length > 0
        )
      : undefined,
    views: Array.isArray(raw.views)
      ? raw.views.filter(
          (value): value is string => typeof value === "string" && value.trim().length > 0
        )
      : undefined,
    values: Array.isArray(raw.values)
      ? raw.values.filter(
          (value): value is string => typeof value === "string" && value.trim().length > 0
        )
      : undefined,
  };
}

function normalizeSchemaView(raw: Record<string, unknown>): SearchSchemaView | null {
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : null;
  if (!name) {
    return null;
  }

  return {
    name,
    label: typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : name,
    resultFields: Array.isArray(raw.resultFields)
      ? raw.resultFields.filter(
          (value): value is string => typeof value === "string" && value.trim().length > 0
        )
      : undefined,
  };
}

function normalizeOperatorDefinition(raw: Record<string, unknown>): SearchOperatorDefinition | null {
  const operator =
    typeof raw.operator === "string" && raw.operator.trim() ? raw.operator.trim() : null;

  if (!operator) {
    return null;
  }

  return {
    operator,
    arity: typeof raw.arity === "string" ? raw.arity : undefined,
    minValues: typeof raw.minValues === "number" ? raw.minValues : undefined,
    maxValues: typeof raw.maxValues === "number" ? raw.maxValues : undefined,
  };
}

export function normalizeSearchSchema(schema: unknown): SearchSchema | null {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return null;
  }

  const raw = schema as Record<string, unknown>;
  const fields = Array.isArray(raw.fields)
    ? raw.fields
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item && typeof item === "object" && !Array.isArray(item))
        )
        .map((item) => normalizeSchemaField(item))
        .filter((item): item is SearchSchemaField => Boolean(item))
    : [];

  const views = Array.isArray(raw.views)
    ? raw.views
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item && typeof item === "object" && !Array.isArray(item))
        )
        .map((item) => normalizeSchemaView(item))
        .filter((item): item is SearchSchemaView => Boolean(item))
    : undefined;

  const operatorCatalog = Array.isArray(raw.operatorCatalog)
    ? raw.operatorCatalog
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item && typeof item === "object" && !Array.isArray(item))
        )
        .map((item) => normalizeOperatorDefinition(item))
        .filter((item): item is SearchOperatorDefinition => Boolean(item))
    : undefined;

  return {
    schemaVersion: typeof raw.schemaVersion === "number" ? raw.schemaVersion : undefined,
    label: typeof raw.label === "string" ? raw.label : undefined,
    description: typeof raw.description === "string" ? raw.description : undefined,
    defaultView: typeof raw.defaultView === "string" ? raw.defaultView : undefined,
    defaultSort:
      raw.defaultSort && typeof raw.defaultSort === "object" && !Array.isArray(raw.defaultSort)
        ? {
            field:
              typeof (raw.defaultSort as Record<string, unknown>).field === "string"
                ? String((raw.defaultSort as Record<string, unknown>).field)
                : undefined,
            direction:
              typeof (raw.defaultSort as Record<string, unknown>).direction === "string"
                ? String((raw.defaultSort as Record<string, unknown>).direction)
                : undefined,
          }
        : undefined,
    fields,
    views,
    operatorCatalog,
  };
}
