import { useEffect, useState } from "react";
import { apiClient } from "@jaldee/api-client";
import { useMFEProps } from "@jaldee/auth-context";
import { buildBaseServiceUrl } from "@jaldee/shared-modules";

export type HrAnalyticsFrequency = "DAILY" | "WEEKLY" | "MONTHLY";
export type HrAnalyticsData = Record<string, unknown>;
const HR_ANALYTICS_FEATURE_MODULES = [
  "HR_EMPLOYEE",
  "HR_ATTENDANCE",
  "HR_PAYROLL",
] as const;

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangeFor(frequency: HrAnalyticsFrequency) {
  const dateTo = new Date();
  const dateFrom = new Date(dateTo);
  if (frequency === "WEEKLY") dateFrom.setDate(dateFrom.getDate() - 6);
  if (frequency === "MONTHLY") dateFrom.setMonth(dateFrom.getMonth() - 1);
  return { dateFrom: dateString(dateFrom), dateTo: dateString(dateTo) };
}

function unwrap(value: unknown): HrAnalyticsData {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  return record.data && typeof record.data === "object"
    ? record.data as HrAnalyticsData
    : record;
}

function mergeAnalyticsData(items: HrAnalyticsData[]): HrAnalyticsData {
  const merged: HrAnalyticsData = {};
  for (const item of items) {
    for (const [key, value] of Object.entries(item)) {
      if (Array.isArray(value)) {
        merged[key] = [
          ...(Array.isArray(merged[key]) ? merged[key] as unknown[] : []),
          ...value,
        ];
      } else if (value != null && merged[key] == null) {
        merged[key] = value;
      }
    }
  }
  return merged;
}

export function useHrAnalytics(frequency: HrAnalyticsFrequency) {
  const { account } = useMFEProps();
  const tenantUid =
    (account as (typeof account & { tenantUid?: string }) | null)?.tenantUid ??
    account?.id;
  const [data, setData] = useState<HrAnalyticsData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantUid) {
      setData({});
      setLoading(false);
      setError("Analytics are unavailable because no active tenant was found.");
      return;
    }

    let active = true;
    const range = rangeFor(frequency);
    setLoading(true);
    setError(null);

    void Promise.all(HR_ANALYTICS_FEATURE_MODULES.map((featureModule) =>
      apiClient.post(
        buildBaseServiceUrl(`/platform-service/v1/api/analytics?frequency=${frequency}`),
        {
          tenantUid,
          featureModule,
          groupBy: [],
          frequency,
          dateFrom: range.dateFrom,
          dateTo: range.dateTo,
          filters: {},
          includeTotals: true,
          getDimensionWiseValue: true,
        },
        { _skipLocationParam: true },
      ).then((response) => unwrap(response.data))
    )).then((responses) => {
      if (active) setData(mergeAnalyticsData(responses));
    }).catch((reason: unknown) => {
      if (!active) return;
      setData({});
      setError(reason instanceof Error ? reason.message : "HR analytics could not be loaded.");
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [frequency, tenantUid]);

  return { data, loading, error };
}
