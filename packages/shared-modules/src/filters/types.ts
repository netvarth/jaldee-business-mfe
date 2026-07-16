export interface SearchSchema {
  schemaVersion?: number;
  label?: string;
  description?: string;
  defaultView?: string;
  defaultSort?: {
    field?: string;
    direction?: string;
  };
  fields: SearchSchemaField[];
  views?: SearchSchemaView[];
  operatorCatalog?: SearchOperatorDefinition[];
}

export interface SearchSchemaField {
  key: string;
  name?: string;
  label: string;
  aliases?: string[];
  type?: string;
  inputType?: string;
  filterable?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  operators?: string[];
  views?: string[];
  values?: string[];
}

export interface SearchSchemaView {
  name: string;
  label: string;
  resultFields?: string[];
}

export interface SearchOperatorDefinition {
  operator: string;
  arity?: string;
  minValues?: number;
  maxValues?: number;
}

export type SearchFilterLogic = "AND" | "OR";

export interface SearchFilterCondition {
  id: string;
  field: string;
  operator: string;
  values: string[];
}

export interface SearchFilterGroup {
  id: string;
  logic: SearchFilterLogic;
  conditions: SearchFilterNode[];
}

export type SearchFilterNode = SearchFilterCondition | SearchFilterGroup;
export type SearchFilterClause = SearchFilterCondition;
export type SearchFilterState = SearchFilterClause[] | SearchFilterGroup;

export type SearchFilterLayout = "single-column";
