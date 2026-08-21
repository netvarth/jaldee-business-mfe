import { apiClient } from "@jaldee/api-client";
import { buildBaseServiceUrl } from "@jaldee/shared-modules";

export interface AnalyticsRequest {
  featureModule: string;
  frequency: string;
  metricId: number;
  dateFrom?: string;
  dateTo?: string;
  groupBy?: string[];
  includeTotals?: boolean;
  getDimensionWiseValue?: boolean;
}

export interface AnalyticsRow {
  dateFor?: string;
  value?: number | string | null;
  amount?: number | string | null;
  [key: string]: unknown;
}

export interface AnalyticsQueryResponse {
  rows?: AnalyticsRow[];
  [key: string]: unknown;
}

export interface DimensionSlice {
  uid: string;
  name: string;
  value: number;
}

function unwrap(response: unknown): AnalyticsQueryResponse {
  if (!response || typeof response !== "object") return {};
  const record = response as Record<string, unknown>;
  return (record.data && typeof record.data === "object" ? record.data : record) as AnalyticsQueryResponse;
}

export const analyticsService = {
  query(request: AnalyticsRequest): Promise<AnalyticsQueryResponse> {
    return apiClient
      .post(buildBaseServiceUrl("/platform-service/v1/api/analytics"), request, { _skipLocationParam: true })
      .then((response) => unwrap(response.data));
  },
};

export function numericValueOf(row: AnalyticsRow): number {
  const value = row.amount ?? row.value ?? 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function scalarOf(response: AnalyticsQueryResponse | undefined): number | null {
  const rows = response?.rows ?? [];
  return rows.length ? rows.reduce((total, row) => total + numericValueOf(row), 0) : null;
}

export function dimensionSlices(response: AnalyticsQueryResponse | undefined, dimension: string): DimensionSlice[] {
  const rows = response?.rows ?? [];
  return rows.map((row) => {
    const uid = String(row[`${dimension}.uid`] ?? row.uid ?? row[dimension] ?? "");
    const name = String(row[`${dimension}.name`] ?? row.name ?? uid);
    return { uid, name, value: numericValueOf(row) };
  }).filter((slice) => slice.uid);
}
