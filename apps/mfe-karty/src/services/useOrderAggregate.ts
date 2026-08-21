import { useQuery } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

/**
 * Current-state order rollups — the status funnel, open-order aging and stage chips.
 *
 * ## Why this is not the analytics service
 * `analytics_tbl` is an additive counter store: a frequency window sums the buckets it covers.
 * That expresses *flows* (an order was placed, revenue was booked) and cannot express *levels*,
 * which is what a funnel is. Metric 403 (`commerce.order.count.by.status`) counts **transitions
 * into** each status, so an order that went PENDING → CONFIRMED → SHIPPED contributes to three
 * buckets while sitting in exactly one. Summing it to draw a funnel overstates every stage and
 * the stages do not add up to the order count.
 *
 * So the funnel comes from a bounded `GROUP BY` in commerce-service
 * (`GET /commerce-service/v1/api/tenant/orders/aggregate`). That is not the anti-pattern the
 * design guide prohibits — the rule forbids counting rows from a page-capped list endpoint in
 * the browser, which is a different thing from a purpose-built aggregate that returns a
 * fixed-size result and never ships rows to the client.
 *
 * Flow figures on the same screen (revenue, orders, units, top items, trend) come from
 * `useCommerceOrderAnalytics`. Contract: `docs/karty-analytics-api-contract.md` §2, §5.2.
 */

/** Machine keys from `OrderAggregateServiceImpl`. Order here is the display order. */
export const AGING_BUCKETS = [
  "UNDER_24H",
  "ONE_TO_THREE_DAYS",
  "THREE_TO_SEVEN_DAYS",
  "OVER_SEVEN_DAYS",
] as const;
export type AgingBucketKey = (typeof AGING_BUCKETS)[number];

export interface StatusBucket {
  status: string;
  count: number;
  totalAmount: number;
}

export interface OrderAggregate {
  /** One entry per status **present** in the window. Absent statuses are genuinely zero. */
  statusBuckets: StatusBucket[];
  agingBuckets: { bucket: AgingBucketKey; count: number }[];
  totalOrders: number;
  /** Sum over non-void orders, so it agrees with the funnel's non-leak stages. */
  netAmount: number;
}

export interface OrderAggregateFilter {
  storeUid?: string;
  /** ISO-8601 date-time, inclusive lower bound on orderDate. */
  fromDate?: string;
  /** ISO-8601 date-time, inclusive upper bound on orderDate. */
  toDate?: string;
}

const STALE_MS = 60_000;

function toParams(filter: OrderAggregateFilter): string {
  const params = new URLSearchParams();
  // "all" is the UI's sentinel for no store filter; it must never reach the API, which would
  // try to parse it as a UUID and 400.
  if (filter.storeUid && filter.storeUid !== "all") params.append("storeUid", filter.storeUid);
  if (filter.fromDate) params.append("fromDate", filter.fromDate);
  if (filter.toDate) params.append("toDate", filter.toDate);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export interface UseOrderAggregate {
  data: OrderAggregate | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  /**
   * False when the request succeeded but matched no orders at all.
   *
   * Unlike the analytics hook's `hasCoverage`, this really does mean "no orders in this window"
   * rather than "nothing was measured" — the aggregate reads `order_tbl` directly, so there is
   * no publishing pipeline that could be absent. The caller should render an empty state, not
   * a "not recorded" state: those are different claims and this endpoint can only ever make the
   * first one.
   */
  hasOrders: boolean;
}

export function useOrderAggregate(filter: OrderAggregateFilter): UseOrderAggregate {
  const api = useCommerceApi();

  const query = useQuery({
    queryKey: ["orderAggregate", filter.storeUid ?? "all", filter.fromDate, filter.toDate],
    queryFn: async () => {
      const raw = await api.get<any>(`/v1/api/tenant/orders/aggregate${toParams(filter)}`);
      return {
        statusBuckets: (raw?.statusBuckets ?? []).map((b: any) => ({
          // The backend serializes the enum by name. Upper-casing defensively costs nothing and
          // means a serializer change cannot silently break every status lookup on the screen.
          status: String(b?.status ?? "").toUpperCase(),
          count: num(b?.count),
          totalAmount: num(b?.totalAmount),
        })),
        agingBuckets: (raw?.agingBuckets ?? []).map((b: any) => ({
          bucket: String(b?.bucket ?? "") as AgingBucketKey,
          count: num(b?.count),
        })),
        totalOrders: num(raw?.totalOrders),
        netAmount: num(raw?.netAmount),
      } as OrderAggregate;
    },
    staleTime: STALE_MS,
  });

  const data = query.data ?? null;

  return {
    data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasOrders: (data?.totalOrders ?? 0) > 0,
  };
}

/** Count and value for one status, or zeros when that status has no orders in the window. */
export function statusOf(agg: OrderAggregate | null, status: string): StatusBucket {
  const hit = agg?.statusBuckets.find((b) => b.status === status);
  return hit ?? { status, count: 0, totalAmount: 0 };
}

/** Count for one aging bucket, or 0 when absent. */
export function agingOf(agg: OrderAggregate | null, bucket: AgingBucketKey): number {
  return agg?.agingBuckets.find((b) => b.bucket === bucket)?.count ?? 0;
}
