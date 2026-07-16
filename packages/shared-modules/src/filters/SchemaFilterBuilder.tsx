import { useState } from "react";
import { Input, PhoneInput, Select, Switch } from "@jaldee/design-system";
import type { SelectOption } from "@jaldee/design-system";
import type {
  SearchFilterClause,
  SearchFilterGroup,
  SearchFilterNode,
  SearchOperatorDefinition,
  SearchSchema,
  SearchSchemaField,
} from "./types";

export interface SchemaFilterBuilderProps {
  schema: SearchSchema | null | undefined;
  value: SearchFilterClause[];
  onChange: (clauses: SearchFilterClause[]) => void;
  appliedCount?: number;
  onClearAll?: () => void;
  emptyStateMessage?: string;
}

const DEFAULT_OPERATOR: SearchOperatorDefinition = {
  operator: "EQ",
  arity: "EXACTLY_ONE",
  minValues: 1,
  maxValues: 1,
};

export function SchemaFilterBuilder(props: SchemaFilterBuilderProps) {
  return <SchemaFilterSingleColumn {...props} />;
}

export function SchemaFilterSingleColumn(props: SchemaFilterBuilderProps) {
  const fields = getFilterableFields(props.schema);
  const [expandedClauses, setExpandedClauses] = useState<Record<string, boolean>>({});

  if (fields.length === 0) {
    return <EmptyFilterState message={props.emptyStateMessage} />;
  }

  return (
    <div className="space-y-4">
      <FilterToolbar {...props} />
      {props.value.map((clause, index) => (
        <FilterClauseCard
          key={clause.id}
          schema={props.schema}
          clauses={props.value}
          clause={clause}
          index={index}
          onChange={props.onChange}
          collapsible
          expanded={expandedClauses[clause.id] ?? false}
          onToggleExpanded={() =>
            setExpandedClauses((current) => ({
              ...current,
              [clause.id]: !(current[clause.id] ?? false),
            }))
          }
        />
      ))}
    </div>
  );
}

export function buildDefaultSearchClauses(schema: SearchSchema | null | undefined) {
  return getFilterableFields(schema).map<SearchFilterClause>((field) => {
    const operator = field.operators?.[0] ?? DEFAULT_OPERATOR.operator;
    return {
      id: createFilterId(),
      field: field.key,
      operator,
      values: buildDefaultValues(getOperatorDefinition(schema, operator)),
    };
  });
}

export function buildDefaultSearchFilterGroup(
  schema: SearchSchema | null | undefined,
  logic: SearchFilterGroup["logic"] = "AND"
): SearchFilterGroup {
  return {
    id: createFilterId(),
    logic,
    conditions: buildDefaultSearchClauses(schema),
  };
}

export function compactSearchClauses(
  clauses: SearchFilterClause[],
  schema: SearchSchema | null | undefined
) {
  return clauses.filter((clause) => {
    const operator = getOperatorDefinition(schema, clause.operator);
    const nonEmptyValues = clause.values.map((value) => value.trim()).filter(Boolean);

    if (operator.arity === "NONE" || operator.maxValues === 0) {
      return true;
    }

    if (
      operator.arity === "EXACTLY_TWO" ||
      operator.maxValues === 2 ||
      operator.minValues === 2
    ) {
      return nonEmptyValues.length === 2;
    }

    return nonEmptyValues.length >= Math.max(operator.minValues ?? 1, 1);
  });
}

export function compactSearchFilters(
  filters: SearchFilterClause[] | SearchFilterGroup,
  schema: SearchSchema | null | undefined
) {
  if (Array.isArray(filters)) {
    return compactSearchClauses(filters, schema);
  }

  return compactSearchFilterGroup(filters, schema);
}

function compactSearchFilterGroup(
  group: SearchFilterGroup,
  schema: SearchSchema | null | undefined
): SearchFilterGroup {
  return {
    ...group,
    conditions: compactSearchFilterNodes(group.conditions, schema),
  };
}

function compactSearchFilterNodes(
  nodes: SearchFilterNode[],
  schema: SearchSchema | null | undefined
) {
  return nodes.reduce<SearchFilterNode[]>((acc, node) => {
    if (isSearchFilterGroup(node)) {
      const compactedGroup = compactSearchFilterGroup(node, schema);
      if (compactedGroup.conditions.length > 0) {
        acc.push(compactedGroup);
      }
      return acc;
    }

    if (compactSearchClauses([node], schema).length > 0) {
      acc.push(node);
    }

    return acc;
  }, []);
}

function FilterToolbar({
  schema,
  value,
  appliedCount,
  onClearAll,
}: SchemaFilterBuilderProps) {
  const resolvedAppliedCount = appliedCount ?? compactSearchClauses(value, schema).length;

  if (!onClearAll && resolvedAppliedCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <button
        type="button"
        className="inline-flex items-center gap-2 text-[length:var(--text-sm)] font-medium text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onClearAll}
        disabled={!onClearAll}
      >
        <RefreshIcon />
        <span>Clear all</span>
      </button>
      <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">
        {resolvedAppliedCount} applied
      </span>
    </div>
  );
}

function FilterClauseCard({
  schema,
  clauses,
  clause,
  index,
  onChange,
  compact = false,
  bordered = true,
  collapsible = false,
  expanded = true,
  onToggleExpanded,
}: {
  schema: SearchSchema | null | undefined;
  clauses: SearchFilterClause[];
  clause: SearchFilterClause;
  index: number;
  onChange: (clauses: SearchFilterClause[]) => void;
  compact?: boolean;
  bordered?: boolean;
  collapsible?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}) {
  const fields = getFilterableFields(schema);
  const field = fields.find((candidate) => candidate.key === clause.field) ?? fields[0];
  const operatorOptions = (field.operators ?? [DEFAULT_OPERATOR.operator]).map<SelectOption>(
    (operator) => ({
      value: operator,
      label: formatOperatorLabel(operator),
    })
  );
  const operatorDefinition = getOperatorDefinition(schema, clause.operator);
  const isBooleanField = field.type === "BOOLEAN";

  return (
    <div
      className={
        bordered
          ? "space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
          : "space-y-3"
      }
    >
      <div className="flex items-center justify-between gap-3">
        {collapsible ? (
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            onClick={onToggleExpanded}
          >
            {!isBooleanField ? <ChevronIcon open={expanded} /> : null}
            <span
              className="min-w-0 flex-1 text-[length:var(--text-sm)] font-semibold text-[var(--color-text-primary)]"
              data-testid={`schema-filter-field-${index}`}
            >
              {field.label}
            </span>
          </button>
        ) : (
          <div
            className="min-w-0 flex-1 text-[length:var(--text-sm)] font-semibold text-[var(--color-text-primary)]"
            data-testid={`schema-filter-field-${index}`}
          >
            {field.label}
          </div>
        )}
        {isBooleanField ? (
          <Switch
            checked={clause.values[0] === "true"}
            onChange={(checked) => {
              updateClause(clauses, clause.id, { values: [checked ? "true" : "false"] }, onChange);
            }}
          />
        ) : expanded && operatorOptions.length > 1 ? (
          <div className="w-full max-w-[116px] shrink-0">
            <Select
              aria-label={`${field.label} operator`}
              options={operatorOptions}
              value={clause.operator}
              onChange={(event) => {
                const nextOperator = event.target.value;
                updateClause(
                  clauses,
                  clause.id,
                  {
                    operator: nextOperator,
                    values: normalizeClauseValues(
                      clause.values,
                      getOperatorDefinition(schema, nextOperator)
                    ),
                  },
                  onChange
                );
              }}
              testId={`schema-filter-operator-${index}`}
            />
          </div>
        ) : null}
      </div>
      {isBooleanField || !expanded ? null : (
        <div className={compact ? "space-y-3" : undefined}>
          <FilterValueInputs
            clause={clause}
            field={field}
            operator={operatorDefinition}
            onChange={(nextValues) =>
              updateClause(clauses, clause.id, { values: nextValues }, onChange)
            }
            index={index}
          />
        </div>
      )}
    </div>
  );
}

function FilterValueInputs({
  clause,
  field,
  operator,
  onChange,
  index,
}: {
  clause: SearchFilterClause;
  field: SearchSchemaField;
  operator: SearchOperatorDefinition;
  onChange: (values: string[]) => void;
  index: number;
}) {
  if (operator.arity === "NONE" || operator.maxValues === 0) {
    return (
      <div className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
        This operator does not require a value.
      </div>
    );
  }

  if (field.type === "BOOLEAN") {
    return null;
  }

  if (field.type === "ENUM" && Array.isArray(field.values) && field.values.length > 0) {
    if (operator.maxValues === -1 || operator.arity === "AT_LEAST_ONE") {
      return (
        <Select
          multiple
          aria-label={`${field.label} values`}
          options={field.values.map((item) => ({ value: item, label: item }))}
          value={clause.values}
          onChange={(event) =>
            onChange(Array.from(event.target.selectedOptions).map((option) => option.value))
          }
          testId={`schema-filter-values-${index}`}
        />
      );
    }

    return (
      <Select
        aria-label={`${field.label} value`}
        options={field.values.map((item) => ({ value: item, label: item }))}
        value={clause.values[0] ?? ""}
        onChange={(event) => onChange([event.target.value])}
        testId={`schema-filter-value-${index}`}
      />
    );
  }

  if (operator.arity === "EXACTLY_TWO" || operator.maxValues === 2) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          aria-label={`${field.label} from`}
          type={resolveInputType(field)}
          value={clause.values[0] ?? ""}
          onChange={(event) => onChange([event.target.value, clause.values[1] ?? ""])}
          placeholder="From"
          data-testid={`schema-filter-from-${index}`}
        />
        <Input
          aria-label={`${field.label} to`}
          type={resolveInputType(field)}
          value={clause.values[1] ?? ""}
          onChange={(event) => onChange([clause.values[0] ?? "", event.target.value])}
          placeholder="To"
          data-testid={`schema-filter-to-${index}`}
        />
      </div>
    );
  }

  if (operator.maxValues === -1 || operator.arity === "AT_LEAST_ONE") {
    return (
      <Input
        aria-label={`${field.label} values`}
        value={clause.values.join(", ")}
        onChange={(event) => onChange(splitCommaSeparatedValues(event.target.value))}
        placeholder="Comma separated values"
        data-testid={`schema-filter-values-${index}`}
      />
    );
  }

  if (isPhoneField(field)) {
    const phoneValue = parsePhoneFilterValue(clause.values[0] ?? "");

    return (
      <PhoneInput
        testId={`schema-filter-phone-${index}`}
        value={phoneValue}
        onChange={(phone) =>
          onChange([phone.number ? phone.e164Number || `${phone.countryCode}${phone.number}` : ""])
        }
      />
    );
  }

  return (
    <Input
      aria-label={`${field.label} value`}
      type={resolveInputType(field)}
      value={clause.values[0] ?? ""}
      onChange={(event) => onChange([event.target.value])}
      placeholder={`Enter ${field.label.toLowerCase()}`}
      data-testid={`schema-filter-value-${index}`}
    />
  );
}

function EmptyFilterState({ message }: { message?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
      {message ?? "No filter fields are available for this search schema."}
    </div>
  );
}

function isSearchFilterGroup(node: SearchFilterNode): node is SearchFilterGroup {
  return "logic" in node && Array.isArray(node.conditions);
}

function getFilterableFields(schema: SearchSchema | null | undefined) {
  return (schema?.fields ?? []).filter((field) => field.filterable !== false);
}

function getOperatorDefinition(schema: SearchSchema | null | undefined, operator: string) {
  return schema?.operatorCatalog?.find((item) => item.operator === operator) ?? {
    ...DEFAULT_OPERATOR,
    operator,
  };
}

function resolveInputType(field: SearchSchemaField) {
  if (field.type === "DATE") return "date";
  if (field.type === "DATETIME") return "datetime-local";
  return "text";
}

function isPhoneField(field: SearchSchemaField) {
  const key = field.key.toLowerCase();
  const type = String(field.type ?? "").toLowerCase();
  const inputType = String(field.inputType ?? "").toLowerCase();

  return key.includes("phone") || type === "phone" || inputType === "phone";
}

function parsePhoneFilterValue(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return { countryCode: "+91", number: "" };
  }

  const normalized = trimmed.replace(/\s+/g, "");
  const match = normalized.match(/^(\+\d{1,4})(\d+)$/);

  if (match) {
    return {
      countryCode: match[1],
      number: match[2],
      e164Number: normalized,
    };
  }

  return {
    countryCode: "+91",
    number: normalized.replace(/[^\d]/g, ""),
  };
}

function buildDefaultValues(operator: SearchOperatorDefinition) {
  if (operator.arity === "NONE" || operator.maxValues === 0) return [];
  if (operator.arity === "EXACTLY_TWO" || operator.maxValues === 2) return ["", ""];
  return [""];
}

function normalizeClauseValues(values: string[], operator: SearchOperatorDefinition) {
  const nextValues = values.filter((value) => value !== undefined);
  if (operator.arity === "NONE" || operator.maxValues === 0) return [];
  if (operator.arity === "EXACTLY_TWO" || operator.maxValues === 2) {
    return [nextValues[0] ?? "", nextValues[1] ?? ""];
  }
  if (operator.maxValues === -1 || operator.arity === "AT_LEAST_ONE") {
    return nextValues.length > 0 ? nextValues : [""];
  }
  return [nextValues[0] ?? ""];
}

function updateClause(
  clauses: SearchFilterClause[],
  id: string,
  patch: Partial<SearchFilterClause>,
  onChange: (clauses: SearchFilterClause[]) => void
) {
  onChange(clauses.map((clause) => (clause.id === id ? { ...clause, ...patch } : clause)));
}

function formatOperatorLabel(operator: string) {
  return operator
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function splitCommaSeparatedValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function createFilterId() {
  return `filter-${Math.random().toString(36).slice(2, 10)}`;
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M16 10a6 6 0 1 1-1.27-3.74"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 4.5v3.5h-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path
        d="M5 7.5 10 12.5l5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
