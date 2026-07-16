import {
  buildDefaultSearchClauses,
  compactSearchClauses,
  SchemaFilterBuilder,
  SchemaFilterSingleColumn,
} from "../../filters";
import type { SchemaFilterBuilderProps } from "../../filters/SchemaFilterBuilder";

export function CustomerSearchFilterBuilder(props: SchemaFilterBuilderProps) {
  return <SchemaFilterBuilder {...props} />;
}

export function CustomerSearchFilterSingleColumn(props: SchemaFilterBuilderProps) {
  return <SchemaFilterSingleColumn {...props} />;
}

export const buildDefaultCustomerSearchClauses = buildDefaultSearchClauses;
export const compactCustomerSearchClauses = compactSearchClauses;
