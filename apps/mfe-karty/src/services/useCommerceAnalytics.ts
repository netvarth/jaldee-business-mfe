import { useQueries } from "@tanstack/react-query";
import { useMFEProps } from "@jaldee/auth-context";
import {
  analyticsService,
  dimensionSlices,
  numericValueOf,
  scalarOf,
  type AnalyticsQueryResponse,
  type AnalyticsRequest,
  type DimensionSlice,
} from "./commerceAnalytics";

/**
 * Commerce order metrics, read from the platform analytics service.
 *
 * Metric ids come from the registry seed
 * (core-platform-service/src/main/resources/db.migration.analytics/V6__seed_commerce_metrics.sql).
 * Contract: docs/karty-analytics-api-contract.md.
 *
 * ## Why this exists
 * These figures were previously counted in the browser from `useOrders`, which is capped at
 * 200 rows server-side. Past that cap the numbers silently described a slice of the data with
 * nothing on screen saying so. Reading pre-aggregated counters makes the response size constant
 * and the figures correct regardless of order volume.
 *
 * ## What this does NOT cover
 * Only *flows* — things that happened in a window. Inventory **levels** (valuation, stock on
 * hand, stockout counts) cannot come from here: `analytics_tbl` sums the buckets a window
 * covers, so a daily balance snapshot would accumulate rather than replace. Those need a
 * bounded aggregate endpoint in commerce-service. Likewise the attention chips (orders
 * currently pending, returns awaiting action) are current-state questions, not flows —
 * metric 403 counts *transitions into* a status, which is a different number.
 */

/** Registry ids — see V6__seed_commerce_metrics.sql. */
export const COMMERCE_METRIC = {
  ORDER_COUNT: 400,
  GROSS_AMOUNT: 401,
  NET_AMOUNT: 402,
  COUNT_BY_STATUS: 403,
  COUNT_BY_CHANNEL: 404,
  AMOUNT_BY_CHANNEL: 405,
  COUNT_BY_STORE: 406,
  AMOUNT_BY_STORE: 407,
  COUNT_BY_CATEGORY: 408,
  AMOUNT_BY_CATEGORY: 409,
  CANCELLED_COUNT: 410,
  RETURNED_COUNT: 411,
  COUNT_BY_CUSTOMER: 412,
  AMOUNT_BY_CUSTOMER: 413,
  LINE_COUNT: 414,
  UNIT_COUNT: 415,
  COUNT_BY_ITEM: 416,
  AMOUNT_BY_ITEM: 417,
} as const;

/**
 * Commerce metrics are registered under this feature module. Query by featureModule rather
 * than metricTypeId: `analyticsDashboardConfig.json` has no entries for the 400 block, so the
 * metricTypeId path throws "Metric ID 402 not found in metric type 6".
 */
const FEATURE_MODULE = "COMMERCE_SALES";

const STALE_MS = 60_000;

/**
 * Format a Date as YYYY-MM-DD in **local** time.
 *
 * Deliberately not `toISOString().slice(0,10)`: the dates here come from `setHours(0,0,0,0)`,
 * which is local midnight. In any timezone ahead of UTC that instant is still the previous day
 * in UTC — in IST (+05:30) local midnight is 18:30Z the day before — so `toISOString` would
 * shift every window back a day. Today's orders would never appear, and the "Today" period
 * would show yesterday. The shift is uniform across the current and prior windows, so deltas
 * would still look plausible, which is what would make it hard to notice.
 */
function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Window [from, to] inclusive, `days` long and ending today. */
function windowFor(days: number, offsetWindows = 0): { from: string; to: string } {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() - offsetWindows * days);

  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));

  return { from: isoDay(start), to: isoDay(end) };
}

/**
 * Arbitrary date windows require frequency NONE.
 *
 * `resolveAnalyticsDateRange` only reads `dateFrom`/`dateTo` when the frequency is *not* one
 * of the presets (TODAY, WEEKLY, THIS_MONTH, TILL_NOW, …) — those compute their own range and
 * ignore explicit dates entirely. NONE falls through to the explicit range and routes to a
 * single aggregate. Passing WEEKLY with dateFrom/dateTo would silently return the last 7 days
 * whatever dates were sent.
 */
function totalsRequest(metricId: number, days: number, offsetWindows: number): AnalyticsRequest {
  const { from, to } = windowFor(days, offsetWindows);
  return {
    featureModule: FEATURE_MODULE,
    frequency: "NONE",
    metricId,
    dateFrom: from,
    dateTo: to,
    includeTotals: true,
  };
}

function scalarQuery(metricId: number, days: number, offsetWindows = 0, enabled = true) {
  const req = totalsRequest(metricId, days, offsetWindows);
  return {
    queryKey: ["commerce-analytics", "scalar", metricId, req.dateFrom, req.dateTo],
    queryFn: () => analyticsService.query(req),
    staleTime: STALE_MS,
    // Analytics is read-only dashboard data. Retrying every failed metric creates a burst of
    // duplicate requests when the analytics service is unavailable, without helping the page.
    retry: false,
    refetchOnReconnect: false,
    enabled,
  };
}

/**
 * @param dimension bare dimension key, e.g. "store.uid" or "order.channel".
 *
 * Pass the `.uid`/`.name` pair together where both are registered (item, category) so the
 * response carries a label. Where only `.uid` is registered (store, customer) the server
 * COALESCEs `byName` to the uid, and the caller must resolve display names itself — the
 * commerce publisher deliberately does not emit `store.name`, to keep a name lookup off the
 * order hot path.
 */
function groupedQuery(
  metricId: number,
  dimensions: string[],
  days: number,
  offsetWindows = 0,
  enabled = true
) {
  const req: AnalyticsRequest = {
    ...totalsRequest(metricId, days, offsetWindows),
    groupBy: dimensions,
    getDimensionWiseValue: true,
  };
  return {
    queryKey: ["commerce-analytics", "grouped", metricId, dimensions.join(","), req.dateFrom, req.dateTo],
    queryFn: () => analyticsService.query(req),
    staleTime: STALE_MS,
    retry: false,
    refetchOnReconnect: false,
    enabled,
  };
}

/** Value for one bucket of a grouped result, or null when that bucket is absent. */
function sliceValue(slices: DimensionSlice[], uid: string): number | null {
  const hit = slices.find((s) => s.uid === uid);
  return hit ? hit.value : null;
}

/** Daily series over the window. DAILY is not a preset, so the explicit range is honoured. */
function dailyQuery(metricId: number, days: number, enabled = true) {
  const { from, to } = windowFor(days, 0);
  return {
    queryKey: ["commerce-analytics", "daily", metricId, from, to],
    queryFn: () =>
      analyticsService.query({
        featureModule: FEATURE_MODULE,
        frequency: "DAILY",
        metricId,
        dateFrom: from,
        dateTo: to,
        includeTotals: false,
      }),
    staleTime: STALE_MS,
    retry: false,
    refetchOnReconnect: false,
    enabled,
  };
}

export interface TrendPoint {
  /** Bucket start, ISO day. */
  day: string;
  netSales: number;
  orders: number;
}

export interface CommerceOrderAnalytics {
  /** Null means the query succeeded with no rows — "not recorded", not zero. See hasCoverage. */
  grossSales: number | null;
  netSales: number | null;
  orders: number | null;
  /** Net ÷ orders, or null if either is unavailable or orders is 0. */
  avgOrderValue: number | null;
  /** Mean order lines per order. Lines, not units — metric 415 is units. */
  avgLinesPerOrder: number | null;
  /**
   * Mean units per order — true quantity (metric 415), not line count.
   *
   * The orders dashboard previously computed this from `OrderEntity.itemsCount`, which is the
   * *line* count, and labelled it "Units per order" while KartyOverview labelled the identical
   * field "Avg items per order". Metrics 414 and 415 are separate precisely so the two labels
   * stop disagreeing. See contract doc §6.2.
   */
  avgUnitsPerOrder: number | null;

  /**
   * Percentage of orders in the window that were cancelled / returned.
   *
   * Denominator is metric 400, which counts orders *placed* in the window — cancelled and
   * returned orders included. State that in the tile subtitle: a denominator of live orders
   * only would make the rate climb toward 100% rather than toward the true share.
   *
   * Caveat worth knowing: 410/411 are published on the *cancellation* date while 400 is
   * published on the *order* date, so an order placed on the 1st and cancelled on the 20th
   * lands in different windows for numerator and denominator. Over a window long enough to
   * contain both, the rate is right; on a one-day window it can read oddly.
   */
  cancellationRate: number | null;
  returnRate: number | null;

  /** Same figures over the immediately preceding window of equal length, for deltas. */
  prior: {
    grossSales: number | null;
    netSales: number | null;
    orders: number | null;
    avgOrderValue: number | null;
    avgUnitsPerOrder: number | null;
    cancellationRate: number | null;
    returnRate: number | null;
  };

  byChannelCount: DimensionSlice[];
  byChannelAmount: DimensionSlice[];
  /** `name` is the store uid — resolve display names from useStores. */
  byStoreCount: DimensionSlice[];
  byStoreAmount: DimensionSlice[];
  byCategoryAmount: DimensionSlice[];
  byItemAmount: DimensionSlice[];
  /** `name` is the consumer uid — resolve display names from useCustomers. */
  byCustomerCount: DimensionSlice[];
  byCustomerAmount: DimensionSlice[];

  /**
   * Null when the service returned no dated rows — render "not available", never a flat zero
   * line.
   *
   * Always tenant-wide: the daily series carries no store dimension, so it is not narrowed by
   * `storeUid`. Label it accordingly when a store is selected.
   */
  trend: TrendPoint[] | null;

  /** True when figures are narrowed to one store — some are null in that mode. See the hook doc. */
  isStoreScoped: boolean;

  isLoading: boolean;
  isError: boolean;
  error: unknown;

  /**
   * False when every query succeeded but nothing anywhere returned rows — the metrics are
   * registered but nothing has been published into analytics_tbl yet.
   *
   * Distinct from "all values are zero", and the distinction matters more than usual here:
   * commerce analytics accrue only from the day the publisher deploys, and there is no
   * historical backfill (AnalyticsSlotBackfillService slices intra-day flush windows, it does
   * not replay history). So "no coverage" is the *expected* state on day one for every tenant,
   * including ones with years of orders. Rendering 0 would assert a measurement never taken.
   */
  hasCoverage: boolean;
}

/**
 * @param days     length of the reporting window, ending today. KartyOverview offers 1/7/30/90.
 * @param storeUid when set, figures are scoped to that store.
 *
 * ## Store scoping is derived, not filtered
 * `AnalyticsRequest.filters` exists on the DTO but is **not implemented** on the live query
 * path — the only code that reads it builds a SQL string that is discarded, and that string
 * references a `tenant_id` column which does not exist in the schema. So a store filter cannot
 * be pushed into the query. Instead the per-store figures are read out of the
 * `count.by.store` / `net.amount.by.store` buckets, which is exact for the metrics that have a
 * by-store breakdown.
 *
 * Gross sales has no by-store metric (only 401 tenant-wide), so `grossSales` is null when a
 * store is selected rather than silently showing the tenant-wide figure under a store label.
 */
export function useCommerceOrderAnalytics(
  days: number,
  storeUid?: string,
  view: "dashboard" | "overview" = "dashboard"
): CommerceOrderAnalytics {
  const scoped = Boolean(storeUid && storeUid !== "all");

  // The shell mounts this MFE and renders it before the real auth token always finishes
  // propagating through props — firing these queries against a client still in "session" auth
  // mode produces a real 401 that has nothing to do with the tenant's data. Once that happens,
  // apiClient's shared session-expired latch rejects every retry client-side (no network call,
  // just an immediate error), so the query never recovers even after the real token arrives a
  // moment later — the dashboard is stuck showing "did not respond" for a tenant that actually
  // has none of this problem. Gating on a non-empty token avoids ever taking that path.
  const { authToken } = useMFEProps();
  const enabled = Boolean(authToken);
  // Store-scoped headline values are read from the by-store buckets below. The corresponding
  // tenant-wide scalar requests cannot contribute a value and should not be sent.
  const tenantWideEnabled = enabled && !scoped;
  const dashboardDetailsEnabled = tenantWideEnabled && view === "dashboard";
  // Customer rankings and prior store buckets are only rendered on the detailed dashboard, or
  // when a selected store needs its previous-window comparison.
  const customerBreakdownEnabled = enabled && view === "dashboard";
  const priorStoreBreakdownEnabled = enabled && scoped;

  const results = useQueries({
    queries: [
      scalarQuery(COMMERCE_METRIC.GROSS_AMOUNT, days, 0, tenantWideEnabled),
      scalarQuery(COMMERCE_METRIC.NET_AMOUNT, days, 0, tenantWideEnabled),
      scalarQuery(COMMERCE_METRIC.ORDER_COUNT, days, 0, tenantWideEnabled),
      // No screen consumes the line-count metric; retain the result slot to avoid a brittle
      // positional rewrite while preventing the unnecessary network request.
      scalarQuery(COMMERCE_METRIC.LINE_COUNT, days, 0, false),
      scalarQuery(COMMERCE_METRIC.UNIT_COUNT, days, 0, tenantWideEnabled),
      scalarQuery(COMMERCE_METRIC.CANCELLED_COUNT, days, 0, dashboardDetailsEnabled),
      scalarQuery(COMMERCE_METRIC.RETURNED_COUNT, days, 0, dashboardDetailsEnabled),
      // Prior window of equal length, offset by one window — the delta denominators.
      scalarQuery(COMMERCE_METRIC.GROSS_AMOUNT, days, 1, tenantWideEnabled),
      scalarQuery(COMMERCE_METRIC.NET_AMOUNT, days, 1, tenantWideEnabled),
      scalarQuery(COMMERCE_METRIC.ORDER_COUNT, days, 1, tenantWideEnabled),
      scalarQuery(COMMERCE_METRIC.UNIT_COUNT, days, 1, dashboardDetailsEnabled),
      scalarQuery(COMMERCE_METRIC.CANCELLED_COUNT, days, 1, dashboardDetailsEnabled),
      scalarQuery(COMMERCE_METRIC.RETURNED_COUNT, days, 1, dashboardDetailsEnabled),
      // Prior-window store buckets, so deltas still work when scoped to one store.
      groupedQuery(COMMERCE_METRIC.COUNT_BY_STORE, ["store.uid"], days, 1, priorStoreBreakdownEnabled),
      groupedQuery(COMMERCE_METRIC.AMOUNT_BY_STORE, ["store.uid"], days, 1, priorStoreBreakdownEnabled),
      // order.channel is a bare enum dimension with no .name pair; the server COALESCEs
      // byName to the value itself, so byName is "ONLINE" / "WALKIN".
      groupedQuery(COMMERCE_METRIC.COUNT_BY_CHANNEL, ["order.channel"], days, 0, enabled),
      groupedQuery(COMMERCE_METRIC.AMOUNT_BY_CHANNEL, ["order.channel"], days, 0, enabled),
      groupedQuery(COMMERCE_METRIC.COUNT_BY_STORE, ["store.uid"], days, 0, enabled),
      groupedQuery(COMMERCE_METRIC.AMOUNT_BY_STORE, ["store.uid"], days, 0, enabled),
      groupedQuery(COMMERCE_METRIC.AMOUNT_BY_CATEGORY, ["category.uid", "category.name"], days, 0, enabled),
      groupedQuery(COMMERCE_METRIC.AMOUNT_BY_ITEM, ["item.uid", "item.name"], days, 0, enabled),
      groupedQuery(COMMERCE_METRIC.COUNT_BY_CUSTOMER, ["customer.uid"], days, 0, customerBreakdownEnabled),
      groupedQuery(COMMERCE_METRIC.AMOUNT_BY_CUSTOMER, ["customer.uid"], days, 0, customerBreakdownEnabled),
      dailyQuery(COMMERCE_METRIC.NET_AMOUNT, days, enabled),
      dailyQuery(COMMERCE_METRIC.ORDER_COUNT, days, enabled),
    ],
  });

  const [
    grossQ, netQ, ordersQ, linesQ, unitsQ, cancelledQ, returnedQ,
    priorGrossQ, priorNetQ, priorOrdersQ, priorUnitsQ, priorCancelledQ, priorReturnedQ,
    priorStoreCountQ, priorStoreAmountQ,
    channelCountQ, channelAmountQ,
    storeCountQ, storeAmountQ,
    categoryAmountQ, itemAmountQ,
    customerCountQ, customerAmountQ,
    dailyNetQ, dailyOrdersQ,
  ] = results;

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const error = results.find((r) => r.error)?.error;

  const data = (r: (typeof results)[number]) => r.data as AnalyticsQueryResponse | undefined;

  const byChannelCount = dimensionSlices(data(channelCountQ), "order.channel");
  const byChannelAmount = dimensionSlices(data(channelAmountQ), "order.channel");
  const byStoreCount = dimensionSlices(data(storeCountQ), "store.uid");
  const byStoreAmount = dimensionSlices(data(storeAmountQ), "store.uid");
  const byCategoryAmount = dimensionSlices(data(categoryAmountQ), "category.uid");
  const byItemAmount = dimensionSlices(data(itemAmountQ), "item.uid");
  const byCustomerCount = dimensionSlices(data(customerCountQ), "customer.uid");
  const byCustomerAmount = dimensionSlices(data(customerAmountQ), "customer.uid");

  const priorStoreCount = dimensionSlices(data(priorStoreCountQ), "store.uid");
  const priorStoreAmount = dimensionSlices(data(priorStoreAmountQ), "store.uid");

  // Tenant-wide or store-scoped. When scoped, read the store's bucket out of the grouped
  // result rather than the tenant-wide scalar. Gross has no by-store metric, so it resolves
  // to null under a store scope rather than reporting the tenant total under a store label.
  const grossSales = scoped ? null : scalarOf(data(grossQ));
  const netSales = scoped
    ? sliceValue(byStoreAmount, storeUid as string)
    : scalarOf(data(netQ));
  const orders = scoped
    ? sliceValue(byStoreCount, storeUid as string)
    : scalarOf(data(ordersQ));
  // Line count, unit count and the void counters have no by-store breakdown either — the
  // publisher emits them as headline metrics with no store dimension. Under a store scope they
  // resolve to null rather than reporting a tenant-wide figure under a store label.
  const lines = scoped ? null : scalarOf(data(linesQ));
  const units = scoped ? null : scalarOf(data(unitsQ));
  const cancelled = scoped ? null : scalarOf(data(cancelledQ));
  const returned = scoped ? null : scalarOf(data(returnedQ));

  const priorGross = scoped ? null : scalarOf(data(priorGrossQ));
  const priorUnits = scoped ? null : scalarOf(data(priorUnitsQ));
  const priorCancelled = scoped ? null : scalarOf(data(priorCancelledQ));
  const priorReturned = scoped ? null : scalarOf(data(priorReturnedQ));
  const priorNet = scoped
    ? sliceValue(priorStoreAmount, storeUid as string)
    : scalarOf(data(priorNetQ));
  const priorOrders = scoped
    ? sliceValue(priorStoreCount, storeUid as string)
    : scalarOf(data(priorOrdersQ));

  const trend = buildTrend(data(dailyNetQ), data(dailyOrdersQ), days);

  const scalars = [
    grossSales, netSales, orders, lines, units, cancelled, returned,
    priorGross, priorNet, priorOrders, priorUnits, priorCancelled, priorReturned,
  ];
  const slices = [
    byChannelCount, byChannelAmount, byStoreCount, byStoreAmount,
    byCategoryAmount, byItemAmount, byCustomerCount, byCustomerAmount,
  ];

  const hasCoverage =
    scalars.some((v) => v !== null) ||
    slices.some((s) => s.length > 0) ||
    (trend?.length ?? 0) > 0;

  /**
   * Resolve "no rows" into a verified zero once coverage is established for this window.
   *
   * The server returns no rows both when a metric was never recorded and when the tenant
   * genuinely had none of that thing. Left as null, a quiet-but-healthy tenant would be told
   * "not recorded" for a week with no sales — a false claim in the opposite direction from the
   * ₹0 this migration exists to remove.
   *
   * If *any* metric returned rows for this window then the pipeline is demonstrably working,
   * so a metric that returned nothing is a real zero. If nothing anywhere returned rows,
   * `hasCoverage` is false, the caller shows its no-coverage state, and these stay null.
   */
  const settled = (v: number | null) => (v === null && hasCoverage ? 0 : v);

  const netSalesOut = settled(netSales);
  const ordersOut = settled(orders);
  const priorNetOut = settled(priorNet);
  const priorOrdersOut = settled(priorOrders);

  return {
    // Gross and lines stay null under store scope — those have no by-store metric, which is a
    // genuine absence rather than a zero, so `settled` must not be applied when scoped.
    grossSales: scoped ? null : settled(grossSales),
    netSales: netSalesOut,
    orders: ordersOut,
    avgOrderValue: ratio(netSalesOut, ordersOut),
    avgLinesPerOrder: scoped ? null : ratio(settled(lines), ordersOut),
    avgUnitsPerOrder: scoped ? null : ratio(settled(units), ordersOut),
    cancellationRate: scoped ? null : percentOf(settled(cancelled), ordersOut),
    returnRate: scoped ? null : percentOf(settled(returned), ordersOut),
    prior: {
      grossSales: scoped ? null : settled(priorGross),
      netSales: priorNetOut,
      orders: priorOrdersOut,
      avgOrderValue: ratio(priorNetOut, priorOrdersOut),
      avgUnitsPerOrder: scoped ? null : ratio(settled(priorUnits), priorOrdersOut),
      cancellationRate: scoped ? null : percentOf(settled(priorCancelled), priorOrdersOut),
      returnRate: scoped ? null : percentOf(settled(priorReturned), priorOrdersOut),
    },
    byChannelCount,
    byChannelAmount,
    byStoreCount,
    byStoreAmount,
    byCategoryAmount,
    byItemAmount,
    byCustomerCount,
    byCustomerAmount,
    trend,
    isStoreScoped: scoped,
    isLoading,
    isError,
    error,
    hasCoverage,
  };
}

/** Null-propagating division. A zero denominator is undefined, not zero. */
function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return numerator / denominator;
}

/**
 * Share of a total, 0–100.
 *
 * Distinct from `ratio` only in scale, but kept separate so call sites read unambiguously — a
 * rate rendered as `0.043%` instead of `4.3%` is the kind of error that survives review because
 * both look like plausible numbers.
 */
function percentOf(part: number | null, whole: number | null): number | null {
  const r = ratio(part, whole);
  return r === null ? null : r * 100;
}

/**
 * Percentage change, or null when there is no comparable prior figure.
 *
 * Returns null rather than 0 when the prior window is empty or zero: "no change" and "nothing
 * to compare against" are different claims, and a first-week tenant showing +0% would be the
 * second dressed as the first.
 */
export function percentDelta(current: number | null, prior: number | null): number | null {
  if (current === null || prior === null || prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

/**
 * Merge the two daily series into one per-day list.
 *
 * Returns null when neither query produced dated rows, so the caller can say "not available"
 * rather than draw a flat line at zero — which reads as "no activity", a different claim from
 * "not measured". Days present in the window but absent from the response are genuinely zero
 * and are filled in as such.
 */
function buildTrend(
  netResponse: AnalyticsQueryResponse | undefined,
  ordersResponse: AnalyticsQueryResponse | undefined,
  days: number
): TrendPoint[] | null {
  const netRows = (netResponse?.rows ?? []).filter((r) => r.dateFor);
  const orderRows = (ordersResponse?.rows ?? []).filter((r) => r.dateFor);
  if (netRows.length === 0 && orderRows.length === 0) return null;

  // Local-time key, for the same reason isoDay avoids toISOString.
  const key = (iso: string) => isoDay(new Date(iso));

  const netByDay = new Map<string, number>();
  netRows.forEach((r) => {
    // Routed through the shared helper rather than `r.amount ?? r.value`: net sales is a money
    // metric, and `value` is 0 (not null) for those, so a `??` fallback would silently zero
    // the series if `amount` were ever absent.
    netByDay.set(key(r.dateFor as string), (netByDay.get(key(r.dateFor as string)) ?? 0) + numericValueOf(r));
  });

  const ordersByDay = new Map<string, number>();
  orderRows.forEach((r) => {
    const k = key(r.dateFor as string);
    ordersByDay.set(k, (ordersByDay.get(k) ?? 0) + numericValueOf(r));
  });

  // Seed from the requested window, not from the response keys. A day with no orders is a
  // genuine zero and must occupy its slot — otherwise a 30-day window with 4 active days
  // renders 4 points spread across the full width, joined by a line, with a fabricated time
  // axis that claims continuous daily activity.
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, i) => {
    const d = new Date(end);
    d.setDate(end.getDate() - (days - 1 - i));
    const day = isoDay(d);
    return {
      day,
      netSales: netByDay.get(day) ?? 0,
      orders: ordersByDay.get(day) ?? 0,
    };
  });
}
