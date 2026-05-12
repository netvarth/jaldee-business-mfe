export type ReportsViewKey = "catalog" | "generated" | "saved";

export type ReportCatalogItem = {
  reportName: string;
  reportType?: string;
  group: "General" | "Finance" | "CRM" | "Sales" | "GST" | "Inventory" | "Lending" | "IVR";
  showSavedReports: boolean;
  routeTo?: string;
  products?: Array<"health" | "bookings" | "golderp" | "karty" | "finance" | "lending" | "hr" | "ai">;
};

export type GeneratedReportRow = {
  id: string;
  reportToken: string;
  reportName: string;
  reportType: string;
  status: string;
  createdDate: string;
  requestedBy: string;
  filePath?: string;
};

export type SavedReportRow = {
  id: string;
  reportToken?: string;
  reportName: string;
  reportType: string;
  createdDate: string;
};

export type ReportsPageFilter = {
  from?: number;
  count?: number;
  search?: string;
  reportType?: string;
};

export type ReportFieldType = "text" | "number" | "dropdown" | "multiselect" | "timePeriod" | "page" | "date";

export type ReportOption = {
  value: string;
  label: string;
};

export type ReportFieldConfig = {
  field: string;
  title: string;
  type: ReportFieldType;
  filterType: string;
  options?: ReportOption[];
  defaultValue?: string;
  prefix?: string;
};

export type ReportCreateConfig = {
  reportName: string;
  reportType: string;
  responseType?: string;
  fields: ReportFieldConfig[];
};

export type ReportGeneratePayload = {
  reportType: string;
  responseType: string;
  reportDateCategory?: string;
  filter: Record<string, string | number | boolean>;
};

export type GeneratedReportDetail = {
  token: string;
  reportType: string;
  reportName: string;
  reportHeader: Record<string, unknown>;
  dataHeader: Record<string, unknown>;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, unknown>>;
};
