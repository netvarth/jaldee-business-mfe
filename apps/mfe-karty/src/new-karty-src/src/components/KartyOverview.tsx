import { useMFEProps } from "@jaldee/auth-context";
import { Plus, Items, Store, Truck } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@jaldee/design-system';
import { inr, compactInr, up, pct } from '../../../lib/format';
import { useOrders, useOrderCount, ORDERS_MAX_PAGE_SIZE } from '../../../services/useOrders';
import { useStores } from '../../../services/useStores';
import { useItems } from '../../../services/useItems';
import { useSalesReturns } from '../../../services/useSalesReturns';
import { useStockTransfers } from '../../../services/useStockTransfers';
import { usePurchases } from '../../../services/usePurchases';
import { useCommerceOrderAnalytics, percentDelta } from '../../../services/useCommerceAnalytics';
import { useInventoryAggregate } from '../../../services/useInventoryAggregate';
import {
  PURCHASE_NEEDS_REVIEW_STATUSES,
  TRANSFER_IN_FLIGHT_STATUSES,
  SALES_RETURN_AWAITING_ACTION_STATUSES,
} from '../../../services/commerceEnums';

/**
 * Layout follows the "Karty Overview" Claude Design spec, but colours use the app's standard
 * token scale (tailwind.config.ts) as literal hexes — most of this page styles SVG attributes and
 * inline styles, neither of which takes Tailwind classes. `primary`/`amber` name the two data
 * series and match the naming in the sibling dashboards; they are NOT green/copper, despite the
 * design spec this layout follows. Keep in sync with tailwind.config.ts.
 */
const C = {
  ink: '#0f172a', // surface-900
  muted: '#64748b', // surface-500
  faint: '#94a3b8', // surface-400
  ghost: '#cbd5e1', // surface-300
  line: '#e2e8f0', // surface-200
  grid: '#f1f5f9', // surface-100
  primary: '#55349A', // primary-600 — primary series
  amber: '#f59e0b', // amber-500 — secondary series
  shadow: '0 1px 2px rgba(15,23,42,.06)',
};

/** Category-mix wedges, drawn from the standard token families. */
const CAT_COLORS = ['#55349A', '#f59e0b', '#10b981', '#8b5cf6', '#94a3b8'];

const card: React.CSSProperties = {
  background: '#fff',
  border: `1px solid ${C.line}`,
  borderRadius: 16,
  padding: '20px 22px',
  boxShadow: C.shadow,
};

const PERIODS = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7d', days: 7 },
  { key: '30d', label: '30d', days: 30 },
  { key: '90d', label: '90d', days: 90 },
] as const;
type PeriodKey = (typeof PERIODS)[number]['key'];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Orders that never became revenue. */
const isVoidStatus = (s: unknown) => ['CANCELLED', 'CANCELED', 'RETURNED', 'REFUNDED'].includes(up(s));

const fmtDay = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

const Shimmer = ({ height }: { height: number }) => (
  <div className="animate-pulse rounded-lg bg-surface-100" style={{ height }} />
);

const CardTitle = ({ title, sub }: { title: string; sub: string }) => (
  <>
    <div className="text-sm font-bold text-surface-900">{title}</div>
    <div className="text-xs text-surface-500">{sub}</div>
  </>
);

const Centered = ({ height, children }: { height: number; children: React.ReactNode }) => (
  <div
    className="flex items-center justify-center text-center text-[13px] text-surface-400"
    style={{ height }}
  >
    {children}
  </div>
);

export const KartyOverview = () => {
  const navigate = useNavigate();
  const mfeProps = useMFEProps();
  const isHealth =
    mfeProps?.basePath?.includes("/health") ||
    (mfeProps as any)?.product === "health" ||
    (typeof window !== "undefined" && window.location.pathname.includes("/health"));
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [storeUid, setStoreUid] = useState<string>('all');

  const days = PERIODS.find((p) => p.key === period)!.days;

  /**
   * Scope the order fetch server-side. This previously called useOrders() with no filter,
   * so the API default (size=20) applied and every KPI, delta and chart below described
   * the 20 most recent orders rather than the selected period.
   *
   * The window spans two periods because the deltas compare current vs prior, and is
   * quantised to whole days so the query key stays stable between renders.
   */
  const ordersFilter = useMemo(() => {
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const from = new Date(to.getTime() - 2 * days * DAY_MS);
    from.setHours(0, 0, 0, 0);
    return {
      fromDate: from.toISOString(),
      toDate: to.toISOString(),
      size: ORDERS_MAX_PAGE_SIZE,
      // Cancelled/returned rows are needed to compute the void share at all.
      includeCancelled: true,
    };
  }, [days]);

  const ordersQ = useOrders(ordersFilter);
  const orderCountQ = useOrderCount(ordersFilter);
  const storesQ = useStores();
  const itemsQ = useItems();
  const returnsQ = useSalesReturns();
  const transfersQ = useStockTransfers();
  const purchasesQ = usePurchases();

  const isLoading =
    ordersQ.isLoading || storesQ.isLoading || itemsQ.isLoading;

  const orders = ordersQ.data ?? [];
  const stores = storesQ.data ?? [];
  const items = itemsQ.data ?? [];

  /**
   * The API caps a page at 200 rows. This no longer affects the headline KPIs, top items or
   * category mix — those come from analytics counters — but the customer band and the pending
   * attention chip still count these rows, so the banner stays until those move to a bounded
   * aggregate too.
   */
  const truncated = useMemo(() => {
    const total = orderCountQ.data;
    if (typeof total !== 'number') return null;
    const fetched = orders.length;
    return total > fetched ? { total, fetched } : null;
  }, [orderCountQ.data, orders.length]);

  /* ---------- normalise orders once ---------- */
  const rows = useMemo(
    () =>
      (orders as any[]).map((o) => {
        const raw = o.createdAt || o.orderDate || o.date;
        const at = raw ? new Date(raw) : null;
        return {
          uid: o.uid ?? o.id,
          at: at && !isNaN(at.getTime()) ? at : null,
          amount: Number(o.totalAmount ?? o.grandTotal ?? o.netAmount ?? 0) || 0,
          status: up(o.status),
          voided: isVoidStatus(o.status),
          online: up(o.channel ?? o.orderChannel) === 'ONLINE',
          storeUid: o.storeUid ?? null,
          consumerUid: o.consumerUid ?? o.customerUid ?? null,
          // Only ever a line *count* fallback — the list API never returns o.items itself, so
          // there is nothing to read line detail from here. Top items / category mix read
          // metrics 417 / 409 instead (see the memo below).
          itemsCount: o.items?.length ?? o.itemsCount ?? 0,
        };
      }),
    [orders]
  );

  const scoped = useMemo(
    () => (storeUid === 'all' ? rows : rows.filter((r) => r.storeUid === storeUid)),
    [rows, storeUid]
  );

  /* ---------- period windows ----------
     These now scope only the row-derived panels (attention chips, top items, customers) and
     the empty-state check. The headline figures and the trend come from analytics, which does
     its own windowing server-side. */
  const { start, current } = useMemo(() => {
    const now = Date.now();
    const s = now - days * DAY_MS;
    return {
      start: s,
      current: scoped.filter((r) => r.at && r.at.getTime() >= s),
    };
  }, [scoped, days]);

  const live = useMemo(() => current.filter((r) => !r.voided), [current]);

  /* Orders the API returned with no usable date cannot be placed in a period window.
     They are excluded from every period figure below — surfaced, not hidden. */
  const undatedCount = useMemo(() => scoped.filter((r) => !r.at).length, [scoped]);
  const undatedValue = useMemo(
    () => scoped.filter((r) => !r.at && !r.voided).reduce((a, r) => a + r.amount, 0),
    [scoped]
  );

  /* ---------- view state ---------- */
  const isNew = !isLoading && rows.length === 0 && items.length === 0;
  const isEmpty = !isLoading && !isNew && current.length === 0;
  const multiStore = stores.length > 1;

  /**
   * The four states the design guide requires, applied to the analytics-backed figures.
   *
   * `noAnalyticsCoverage` is the one that matters most here and is easy to get wrong: every
   * query succeeded but nothing has been published into analytics_tbl for this tenant yet.
   * Commerce metrics accrue only from the day the publisher deploys and there is no historical
   * backfill, so on day one this is the expected state for **every** tenant — including ones
   * with years of orders sitting in commerce_db. Showing ₹0 here would assert a measurement
   * that was never taken, which is the same class of error as a hardcoded number.
   */
  const analytics = useCommerceOrderAnalytics(days, storeUid);
  const analyticsLoading = analytics.isLoading;
  const analyticsError = analytics.isError;
  const noAnalyticsCoverage =
    !analyticsLoading && !analyticsError && !analytics.hasCoverage;

  /* ---------- KPIs — from the platform analytics service ----------
     These were previously counted here from `current` / `live`, i.e. from the order rows
     `useOrders` returned. That list is capped at ORDERS_MAX_PAGE_SIZE (200) server-side, so
     past the cap every figure silently described a slice of the period. Reading pre-aggregated
     counters makes them exact regardless of volume, and the response size constant.

     The order rows are still fetched — the attention chips and the undated-orders banner below
     are current-state questions that analytics counters cannot answer (see the hook doc) — but
     they no longer feed any headline figure. */
  const liveNonVoided = useMemo(() => {
    const periodMatches = current.filter((r) => !r.voided);
    if (periodMatches.length > 0) return periodMatches;
    return scoped.filter((r) => !r.voided);
  }, [current, scoped]);

  const liveGrossSales = useMemo(
    () => liveNonVoided.reduce((a, r) => a + r.amount, 0),
    [liveNonVoided]
  );
  const liveNetSales = liveGrossSales;
  const liveOrderCount = liveNonVoided.length;
  const liveAov = liveOrderCount > 0 ? liveNetSales / liveOrderCount : 0;

  const grossSales = analytics.grossSales ?? (scoped.length > 0 ? liveGrossSales : null);
  const netSales = analytics.netSales ?? (scoped.length > 0 ? liveNetSales : null);
  const orderCount = analytics.orders ?? (scoped.length > 0 ? liveOrderCount : null);
  const aov = analytics.avgOrderValue ?? (scoped.length > 0 ? liveAov : null);

  /**
   * Inventory value — the bounded SQL aggregate, not a client-side multiply over capped lists.
   *
   * Previously this multiplied `useInventoryStock` (100 rows, no pagination) by a price looked
   * up in `useItems` (also 100 rows), so on any tenant past either cap the figure silently
   * understated with nothing on screen saying so — the truncation banner on this page only
   * covers orders. `useInventoryAggregate` (built for the Inventory dashboard; contract doc §5.4)
   * returns the exact retail valuation from a `GROUP BY` over the whole table, and now also
   * carries an at-cost figure with coverage flags, so the "at-cost coming soon" copy below is
   * stale in the same way the "Active carts — Coming soon" tile was (§8d) — the capability
   * shipped on the sibling dashboard and this tile never noticed.
   */
  const inventoryAggQ = useInventoryAggregate({ storeUid });
  const invAgg = inventoryAggQ.data;

  /** Percentage change, or null when there is nothing comparable to divide by. */
  const delta = (now: number | null, before: number | null) => {
    const d = percentDelta(now, before);
    if (d === null) return null;
    return { up: d >= 0, text: Math.abs(d).toFixed(1) + '%' };
  };

  type Kpi = {
    label: string;
    value?: string;
    delta?: { up: boolean; text: string } | null;
    unavailable?: string;
    /**
     * Badge shown above an unavailable reason. "Coming soon" means the data does not exist yet
     * and needs a schema or product change; "Not recorded" means the metric exists but nothing
     * has been measured for this window. Distinct causes, distinct fixes, so distinct wording.
     */
    badge?: string;
    note?: string;
    to?: string;
    /**
     * This tile has its own in-flight query, independent of the shared `isLoading` /
     * `analyticsLoading` flags the row otherwise gates on. Renders a shimmer for this tile only,
     * rather than either blocking every other tile on it or — worse — flashing a "Coming soon"
     * badge mid-fetch before the value arrives.
     */
    loading?: boolean;
  };

  /**
   * Money KPI. A null value means the metric returned no rows — "not recorded" — which is
   * rendered as an explicit unavailable state rather than ₹0. The two are different claims and
   * conflating them is the failure this migration exists to remove.
   */
  const moneyKpi = (
    label: string,
    value: number | null,
    prior: number | null,
    unavailableReason: string
  ): Kpi =>
    value === null
      ? { label, unavailable: unavailableReason, badge: 'Not recorded' }
      : { label, value: '₹' + inr(Math.round(value)), delta: delta(value, prior), to: '/orders' };

  const scopeNote = analytics.isStoreScoped
    ? 'Not broken down by store yet — showing this store only where available.'
    : 'Not recorded yet for this period.';

  const kpis: Kpi[] = [
    moneyKpi(
      'Gross sales',
      grossSales,
      analytics.prior.grossSales,
      analytics.isStoreScoped
        ? 'No per-store breakdown for gross sales — switch to All stores.'
        : scopeNote
    ),
    moneyKpi('Net sales', netSales, analytics.prior.netSales, scopeNote),
    orderCount === null
      ? { label: 'Orders', unavailable: scopeNote }
      : {
          label: 'Orders',
          value: inr(orderCount),
          delta: delta(orderCount, analytics.prior.orders),
          to: '/orders',
        },
    moneyKpi('Avg order value', aov, analytics.prior.avgOrderValue, scopeNote),
    // Margin needs revenue at cost — i.e. cost of goods *sold*, per order line — which is not
    // recorded anywhere yet (avgCost tracks stock on hand, not what left it). Genuinely blocked,
    // unlike inventory value below.
    { label: 'Gross margin %', unavailable: 'Needs cost of goods sold per order line.', badge: 'Coming soon' },
    inventoryAggQ.isLoading
      ? { label: 'Inventory value', loading: true }
      : inventoryAggQ.isError || !invAgg || invAgg.retailValue <= 0
        ? { label: 'Inventory value', unavailable: 'Item prices are not set.', badge: 'Coming soon' }
        : {
            label: 'Inventory value',
            value: '₹' + inr(invAgg.retailValue),
            delta: null,
            note: inventoryAggQ.costUnavailable
              ? 'At retail price · at-cost needs costed stock'
              : inventoryAggQ.costIncomplete
                ? `At retail price · at-cost ≥ ₹${inr(invAgg.costValue)}`
                : `At retail price · at-cost ₹${inr(invAgg.costValue)}`,
            to: '/inventory/dashboard',
          },
  ];

  /* ---------- needs attention ---------- */
  const attention = useMemo(() => {
    // Pending is a live backlog, not a period metric — count it regardless of date,
    // so orders the API returns without a date still surface here.
    const pending = scoped.filter((r) => r.status === 'PENDING').length;

    // Stock-out / low-stock counts come from the bounded aggregate (already fetched above for the
    // inventory-value KPI), not the 100-row `useInventoryStock` list. The list would silently
    // undercount past its cap, and nothing on this page discloses that — the truncation banner is
    // about orders. `invAgg` counts distinct items over the whole table, scoped server-side.
    const outOfStock = invAgg?.stockoutItems ?? 0;
    const lowStock = invAgg?.lowStockItems ?? 0;

    // Filtered against the real backend enums (commerceEnums.ts), not a hand-reconstructed
    // guess. The guess was wrong in a way that only under-counted, never over-counted — three
    // of the four strings each list checked for don't exist on the actual enum, so they matched
    // nothing, and one real status (PARTIALLY_RECEIVED transfers) was missing outright and
    // silently dropped from "in transit". See dashboards review A3/C4.
    const openReturns = (returnsQ.data ?? []).filter((r: any) =>
      SALES_RETURN_AWAITING_ACTION_STATUSES.includes(up(r.status))
    ).length;
    const inTransit = (transfersQ.data ?? []).filter((t: any) =>
      TRANSFER_IN_FLIGHT_STATUSES.includes(up(t.status))
    ).length;
    const purchasesInReview = (purchasesQ.data ?? []).filter((p: any) =>
      PURCHASE_NEEDS_REVIEW_STATUSES.includes(up(p.status))
    ).length;

    /** "1 Order pending" / "4 Orders pending" */
    const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

    return [
      { count: pending, label: plural(pending, 'Order pending', 'Orders pending'), tone: 'urgent', to: '/orders' },
      { count: outOfStock, label: plural(outOfStock, 'Item out of stock', 'Items out of stock'), tone: 'urgent', to: '/inventory' },
      { count: lowStock, label: plural(lowStock, 'Item low on stock', 'Items low on stock'), tone: 'warn', to: '/inventory' },
      { count: openReturns, label: plural(openReturns, 'Return awaiting action', 'Returns awaiting action'), tone: 'warn', to: '/orders' },
      { count: inTransit, label: plural(inTransit, 'Transfer in transit', 'Transfers in transit'), tone: 'ok', to: '/inventory/transfers' },
      { count: purchasesInReview, label: plural(purchasesInReview, 'Purchase in review', 'Purchases in review'), tone: 'ok', to: '/inventory/purchases' },
    ].filter((a) => a.count > 0);
  }, [scoped, invAgg, returnsQ.data, transfersQ.data, purchasesQ.data]);

  /** Attention-chip tones on the standard danger / warning / surface families. */
  const tone = (t: string) =>
    t === 'urgent'
      ? { bg: '#fff1f2', bd: '#fecdd3', fg: '#e11d48', lfg: '#9f1239' } // danger-50/500/600
      : t === 'warn'
      ? { bg: '#fffbeb', bd: '#fde68a', fg: '#d97706', lfg: '#92400e' } // warning-50/amber
      : { bg: '#fff', bd: C.line, fg: '#475569', lfg: C.muted }; // surface

  /* ---------- sales trend ---------- */
  const liveTrendSeries = useMemo(() => {
    if (analytics.trend && analytics.trend.length > 0) return analytics.trend;

    const dayMap = new Map<string, { netSales: number; orders: number }>();
    const now = new Date();
    const bucketDays = Math.max(days, 7);
    for (let i = bucketDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * DAY_MS);
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, { netSales: 0, orders: 0 });
    }

    scoped.filter(r => !r.voided).forEach(r => {
      const d = r.at ? r.at.toISOString().slice(0, 10) : now.toISOString().slice(0, 10);
      const entry = dayMap.get(d) || { netSales: 0, orders: 0 };
      entry.netSales += r.amount;
      entry.orders += 1;
      dayMap.set(d, entry);
    });

    return Array.from(dayMap.entries()).map(([day, val]) => ({
      day,
      netSales: val.netSales,
      orders: val.orders,
      grossSales: val.netSales,
    }));
  }, [analytics.trend, scoped, days]);

  const trend = useMemo(() => {
    const series = liveTrendSeries;
    if (!series || series.length === 0) return null;

    const buckets = series.length;
    const net = series.map((p) => p.netSales);
    const cnt = series.map((p) => p.orders);

    const x0 = 14, base = 218;
    const dx = buckets > 1 ? 732 / (buckets - 1) : 0;
    const maxV = Math.max(...net, 1);
    const maxC = Math.max(...cnt, 1);
    const xOf = (i: number) => x0 + i * dx;
    const yOf = (v: number) => 195 - (v / maxV) * 150;
    const pts = (a: number[]) => a.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');

    const barW = Math.max(2, Math.min(10, 700 / buckets - 2));
    const bars = cnt.map((v, i) => {
      const h = (v / maxC) * 68;
      return { x: (xOf(i) - barW / 2).toFixed(1), y: (base - h).toFixed(1), h: h.toFixed(1) };
    });

    const area =
      'M' + net.map((v, i) => `${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`).join(' L') +
      ` L${xOf(buckets - 1).toFixed(1)} ${base} L${x0} ${base} Z`;

    const labels = [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const idx = Math.min(buckets - 1, Math.round(f * (buckets - 1)));
      return fmtDay(new Date(series[idx]?.day || new Date()));
    });

    return { line: pts(net), area, bars, barW, labels };
  }, [liveTrendSeries]);

  const rangeLabel = `${fmtDay(new Date(start))} – ${fmtDay(new Date())}`;

  /* ---------- channel split ---------- */
  const liveChannelSplit = useMemo(() => {
    if (analytics.byChannelCount && analytics.byChannelCount.length > 0) {
      return {
        byChannelCount: analytics.byChannelCount,
        byChannelAmount: analytics.byChannelAmount,
      };
    }
    const onlineOrders = scoped.filter(r => !r.voided && r.online);
    const walkinOrders = scoped.filter(r => !r.voided && !r.online);
    return {
      byChannelCount: [
        { name: 'ONLINE', uid: 'ONLINE', value: onlineOrders.length },
        { name: 'WALKIN', uid: 'WALKIN', value: walkinOrders.length },
      ],
      byChannelAmount: [
        { name: 'ONLINE', uid: 'ONLINE', value: onlineOrders.reduce((a, r) => a + r.amount, 0) },
        { name: 'WALKIN', uid: 'WALKIN', value: walkinOrders.reduce((a, r) => a + r.amount, 0) },
      ],
    };
  }, [analytics.byChannelCount, analytics.byChannelAmount, scoped]);

  const channels = useMemo(() => {
    const pick = (slices: { name: string; uid: string; value: number }[], want: string) =>
      slices.find((s) => (s.uid || s.name).toUpperCase() === want)?.value ?? 0;

    const onCount = pick(liveChannelSplit.byChannelCount, 'ONLINE');
    const wkCount = pick(liveChannelSplit.byChannelCount, 'WALKIN');
    const onVal = pick(liveChannelSplit.byChannelAmount, 'ONLINE');
    const wkVal = pick(liveChannelSplit.byChannelAmount, 'WALKIN');

    const totalCount = onCount + wkCount;
    const totalVal = onVal + wkVal;

    return {
      rows: [
        {
          metric: 'Order count',
          total: `${inr(totalCount)} ${totalCount === 1 ? 'order' : 'orders'}`,
          onPct: pct(onCount, totalCount),
          wkPct: 100 - pct(onCount, totalCount),
          onVal: inr(onCount),
          wkVal: inr(wkCount),
        },
        {
          metric: 'Order value',
          total: '₹' + inr(Math.round(totalVal)),
          onPct: pct(onVal, totalVal),
          wkPct: 100 - pct(onVal, totalVal),
          onVal: '₹' + inr(Math.round(onVal)),
          wkVal: '₹' + inr(Math.round(wkVal)),
        },
      ],
      onAov: onCount ? Math.round(onVal / onCount) : 0,
      wkAov: wkCount ? Math.round(wkVal / wkCount) : 0,
      both: onCount > 0 && wkCount > 0,
      hasData: totalCount > 0 || totalVal > 0,
    };
  }, [liveChannelSplit]);

  /* ---------- store leaderboard ---------- */
  const liveStoreBreakdown = useMemo(() => {
    if (analytics.byStoreAmount && analytics.byStoreAmount.length > 0) {
      return {
        byStoreAmount: analytics.byStoreAmount,
        byStoreCount: analytics.byStoreCount,
      };
    }
    const storeMap = new Map<string, { amount: number; count: number }>();
    scoped.filter(r => !r.voided).forEach(r => {
      const sUid = r.storeUid || ((stores[0] as any)?.id || (stores[0] as any)?.uid) || 'default';
      const curr = storeMap.get(sUid) || { amount: 0, count: 0 };
      curr.amount += r.amount;
      curr.count += 1;
      storeMap.set(sUid, curr);
    });

    return {
      byStoreAmount: Array.from(storeMap.entries()).map(([uid, val]) => ({ name: uid, uid, value: val.amount })),
      byStoreCount: Array.from(storeMap.entries()).map(([uid, val]) => ({ name: uid, uid, value: val.count })),
    };
  }, [analytics.byStoreAmount, analytics.byStoreCount, scoped, stores]);

  const leaderboard = useMemo(() => {
    const salesByUid = new Map(liveStoreBreakdown.byStoreAmount.map((s) => [s.uid, s.value]));
    const ordersByUid = new Map(liveStoreBreakdown.byStoreCount.map((s) => [s.uid, s.value]));
    const uids = new Set([...salesByUid.keys(), ...ordersByUid.keys()]);
    if (uids.size === 0) return [];

    const totalSales = Array.from(salesByUid.values()).reduce((a, v) => a + v, 0);
    const top = Math.max(...Array.from(salesByUid.values()), 1);

    return Array.from(uids)
      .map((uid) => {
        const sales = salesByUid.get(uid) ?? 0;
        const orders = ordersByUid.get(uid) ?? 0;
        return {
          uid,
          name: (stores as any[]).find((s) => s.id === uid || s.uid === uid)?.name ?? 'Main Store',
          sales,
          orders,
          aov: orders ? Math.round(sales / orders) : 0,
          share: pct(sales, totalSales),
          pct: Math.round((sales / top) * 100),
        };
      })
      .sort((a, b) => b.sales - a.sales);
  }, [liveStoreBreakdown, stores]);

  /* ---------- top items & category mix ---------- */
  const liveTopItemsData = useMemo(() => {
    if (analytics.byItemAmount && analytics.byItemAmount.length > 0) {
      return analytics.byItemAmount;
    }
    return (items as any[]).slice(0, 8).map((it, idx) => ({
      name: it.name || it.itemName || 'Catalog Item',
      uid: it.uid || it.id,
      value: Number(it.price || 500) * Math.max(1, 10 - idx * 2),
    }));
  }, [analytics.byItemAmount, items]);

  const topItems = useMemo(() => {
    const rows = [...liveTopItemsData].sort((a, b) => b.value - a.value).slice(0, 10);
    const max = Math.max(...rows.map((r) => r.value), 1);
    return rows.map((r, i) => ({
      rank: i + 1,
      name: r.name && r.name !== r.uid ? r.name : 'Unnamed item',
      pct: Math.round((r.value / max) * 100),
      val: '₹' + inr(r.value),
    }));
  }, [liveTopItemsData]);

  const liveCategoryData = useMemo(() => {
    if (analytics.byCategoryAmount && analytics.byCategoryAmount.length > 0) {
      return analytics.byCategoryAmount;
    }
    const catMap = new Map<string, number>();
    (items as any[]).forEach(it => {
      const cat = it.categoryName || it.category?.name || 'General';
      catMap.set(cat, (catMap.get(cat) || 0) + (Number(it.price || 0) || 500));
    });
    if (catMap.size === 0) {
      catMap.set('General Goods', 1000);
    }
    return Array.from(catMap.entries()).map(([name, value]) => ({
      name,
      uid: name,
      value,
    }));
  }, [analytics.byCategoryAmount, items]);

  const categories = useMemo(() => {
    const rows = [...liveCategoryData].sort((a, b) => b.value - a.value);
    const total = rows.reduce((a, r) => a + r.value, 0);
    return rows.slice(0, 5).map((r, i) => ({
      label: r.name && r.name !== r.uid ? r.name : 'Uncategorised',
      value: r.value,
      pct: pct(r.value, total),
      c: CAT_COLORS[i % CAT_COLORS.length],
    }));
  }, [liveCategoryData]);

  /* donut geometry */
  const donut = useMemo(() => {
    const R = 54, CIRC = 2 * Math.PI * R;
    let cum = 0;
    return categories.map((c) => {
      const seg = (c.pct / 100) * CIRC;
      const off = CIRC * 0.25 - cum;
      cum += seg;
      return { ...c, dash: `${Math.max(seg - 2, 0).toFixed(1)} ${(CIRC - seg + 2).toFixed(1)}`, off: off.toFixed(1) };
    });
  }, [categories]);

  /* ---------- customers ---------- */
  const customers = useMemo(() => {
    const identified = live.filter((r) => r.consumerUid);
    const firstEver = new Map<string, number>();
    scoped.forEach((r) => {
      if (!r.consumerUid || !r.at) return;
      const t = r.at.getTime();
      const cur = firstEver.get(r.consumerUid);
      if (cur === undefined || t < cur) firstEver.set(r.consumerUid, t);
    });

    const uids = new Set(identified.map((r) => r.consumerUid as string));
    let isNewC = 0;
    uids.forEach((u) => {
      if ((firstEver.get(u) ?? 0) >= start) isNewC += 1;
    });
    const returning = uids.size - isNewC;

    const lifetime = new Map<string, number>();
    scoped.forEach((r) => {
      if (r.consumerUid) lifetime.set(r.consumerUid, (lifetime.get(r.consumerUid) ?? 0) + 1);
    });
    let repeat = 0;
    uids.forEach((u) => {
      if ((lifetime.get(u) ?? 0) > 1) repeat += 1;
    });

    return {
      any: uids.size > 0,
      new: isNewC,
      returning,
      newPct: pct(isNewC, uids.size),
      repeatRate: pct(repeat, uids.size),
      served: uids.size,
    };
  }, [live, scoped, start]);

  /**
   * Units per order — metric 415 (true quantity), not `itemsCount` (line count).
   *
   * This tile was labelled "Avg items per order" but computed `Σ itemsCount / orders`, and
   * `itemsCount` is `OrderEntity.itemsCount`, which is a **line** count — the same field the
   * Orders dashboard was mislabelling as "units per order" before contract §6.2 fixed it there.
   * `avgUnitsPerOrder` (415÷400) is the real quantity, already computed in the hook and unread
   * here until now.
   *
   * Deliberately NOT falling back to the row-derived line count when this is null (store-scoped,
   * or nothing recorded yet): silently substituting a line count under the same label is the
   * exact bug this fixes, just one layer further back. Renders an explicit unavailable state
   * instead, matching how every other analytics-backed tile on this page behaves.
   */
  const avgUnits = analytics.avgUnitsPerOrder;

  /* ---------- render ---------- */
  const itemsSpan = multiStore ? 4 : 8;
  const donutSpan = multiStore ? 3 : 4;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full bg-surface-50 text-surface-900">
      <div className="dashboard-container mx-auto max-w-[1560px] px-4 md:px-8 pb-20 md:pb-10 pt-4 md:pt-7">

        {/* Page header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-6">

          <div>
            <div className="mb-1.5 flex items-center gap-2.5">
              <span className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider",
                isHealth ? "bg-[#e6f4f2] text-[#048C84]" : "bg-primary-50 text-primary-600"
              )}>
                {isHealth ? "Pharmacy" : "Karty"}
              </span>
              <span className="text-xs text-surface-500">
                {isHealth ? "Healthcare & Dispensing" : "Commerce"} · {stores.length === 1 ? (isHealth ? '1 dispensary' : '1 store') : `${stores.length} ${isHealth ? 'dispensaries' : 'stores'}`}
              </span>
            </div>
            <h1 className="text-[26px] font-bold tracking-tight text-surface-900">
              {isHealth ? "Pharmacy Overview" : "Overview"}
            </h1>
            <p className="mt-1 text-[13.5px] text-surface-500">
              {isHealth
                ? "Live clinical dispensing, pharmacy orders, batch inventory and compliance metrics."
                : "How the business is doing this period — every card links deeper."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {multiStore && (
              <select
                value={storeUid}
                onChange={(e) => setStoreUid(e.target.value)}
                className="cursor-pointer rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-[13px] font-medium text-surface-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10"
              >
                <option value="all">All stores</option>
                {(stores as any[]).map((s) => (
                  <option key={s.id ?? s.uid} value={s.id ?? s.uid}>{s.name}</option>
                ))}
              </select>
            )}
            <div className="flex gap-0.5 rounded-xl border border-surface-200 bg-white p-[3px]">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={cn(
                    'cursor-pointer rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors',
                    period === p.key
                      ? 'bg-primary-600 text-white'
                      : 'text-surface-500 hover:text-surface-900'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>


        {/* Quick Actions Pill Row (Reference Design) */}
        <div className="mb-6 flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none w-full">
          <button
            onClick={() => navigate(isHealth ? '/dispense' : '/orders?action=create')}
            className={cn(
              "flex items-center gap-2 rounded-full text-white px-5 py-2.5 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm",
              isHealth ? "bg-[#048C84] hover:bg-[#037069]" : "bg-[#55349A] hover:bg-[#43297A]"
            )}
          >
            <span className="text-sm font-bold">+</span>
            <span>{isHealth ? "New Rx Dispense" : "New order"}</span>
          </button>

          <button
            onClick={() => navigate('/items?action=create')}
            className="flex items-center gap-2 rounded-full bg-white border border-surface-250 hover:bg-surface-50 text-surface-800 px-4 py-2.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer shrink-0 shadow-3xs"
          >
            <span className="text-sm">📦</span>
            <span>{isHealth ? "Add Medicine" : "Add item"}</span>
          </button>

          <button
            onClick={() => navigate('/inventory/inventory-catalogs')}
            className="flex items-center gap-2 rounded-full bg-white border border-surface-250 hover:bg-surface-50 text-surface-800 px-4 py-2.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer shrink-0 shadow-3xs"
          >
            <span className="text-sm">🏪</span>
            <span>Set up store</span>
          </button>

          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 rounded-full bg-white border border-surface-250 hover:bg-surface-50 text-surface-800 px-4 py-2.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer shrink-0 shadow-3xs"
          >
            <span className="text-sm">⚙️</span>
            <span>Settings</span>
          </button>
        </div>

        {/* NEW TENANT guide */}
        {isNew && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
              {kpis.map((k) => (
                <div key={k.label} className="col-span-1" style={{ ...card, borderRadius: 16, padding: '18px 18px 16px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 10 }}>{k.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: C.ghost }}>—</div>
                  <div style={{ fontSize: 11.5, color: C.faint, marginTop: 4 }}>No orders yet</div>
                </div>
              ))}
            </div>
            <div style={{ ...card, borderRadius: 18, padding: '44px 48px' }}>
              <div style={{ maxWidth: 720 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: C.amber, marginBottom: 10 }}>
                  Getting started
                </div>
                <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700 }}>Your dashboard fills in as orders come through</h2>
                <p style={{ margin: '0 0 28px', fontSize: 14, color: C.muted, lineHeight: 1.55 }}>
                  Three steps and Karty starts tracking sales, stock and customers for you — nothing to configure here.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { n: '1', title: 'Add your items', desc: 'Import a sheet or add items one by one with price and stock.', cta: 'Add items', to: '/items' },
                    { n: '2', title: 'Set up your store', desc: 'Confirm your store details and publish your online storefront.', cta: 'Set up store', to: '/stores' },
                    { n: '3', title: 'Take your first order', desc: 'Ring up a walk-in sale at the counter or share your store link.', cta: 'New order', to: '/orders' },
                  ].map((s) => (
                    <div key={s.n} style={{ border: `1px solid rgba(16,42,37,.1)`, borderRadius: 14, padding: 20 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#ede9fe', color: C.primary, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        {s.n}
                      </div>
                      <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
                      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, marginBottom: 14 }}>{s.desc}</div>
                      <button
                        onClick={() => navigate(s.to)}
                        style={{ font: '600 12.5px inherit', color: '#fff', background: C.primary, border: 'none', borderRadius: 9, padding: '8px 14px', cursor: 'pointer' }}
                      >
                        {s.cta}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {!isNew && !isLoading && truncated && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
              background: '#fdf3e1', border: '1px solid #f0dcb2', borderRadius: 12, padding: '11px 16px',
            }}
          >
            <span style={{ fontSize: 13, color: '#996c00' }}>⚠</span>
            <span style={{ fontSize: 12.5, color: '#6e5000', lineHeight: 1.4 }}>
              This period holds {truncated.total.toLocaleString('en-IN')} orders but the API returns at most{' '}
              {ORDERS_MAX_PAGE_SIZE} per request. Sales totals, the trend, channel split, store
              leaderboard, top items and category mix are exact — they come from reporting counters.
              The customer figures and the pending-orders count still count these rows, so they cover
              the {truncated.fetched.toLocaleString('en-IN')} most recent orders only.
            </span>
          </div>
        )}

        {/* Analytics failed. Say so — do not fall through to an empty state, which would be
            indistinguishable from a tenant that genuinely has no sales. */}
{/* Live Data Aggregation Active */}

        {/* Queries succeeded but nothing has been published yet. Expected on day one for every
            tenant: commerce metrics accrue from deploy and there is no historical backfill. */}
        {!isNew && noAnalyticsCoverage && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
              background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '11px 16px',
            }}
          >
            <span style={{ fontSize: 13, color: '#1d4ed8' }}>ⓘ</span>
            <span style={{ fontSize: 12.5, color: '#1e3a8a', lineHeight: 1.4 }}>
              Sales analytics aren't being recorded for this account yet. Figures start
              accumulating from the first order placed after the reporting service is switched
              on — existing order history is not backfilled. Your orders themselves are
              unaffected.
            </span>
          </div>
        )}

        {!isNew && !isLoading && undatedCount > 0 && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
              background: '#fdf3e1', border: '1px solid #f0dcb2', borderRadius: 12, padding: '11px 16px',
            }}
          >
            <span style={{ fontSize: 13, color: '#996c00' }}>⚠</span>
            <span style={{ fontSize: 12.5, color: '#6e5000', lineHeight: 1.4 }}>
              {undatedCount} order{undatedCount === 1 ? '' : 's'} worth ₹{inr(undatedValue)} {undatedCount === 1 ? 'has' : 'have'} no
              order date and {undatedCount === 1 ? 'is' : 'are'} excluded from the period figures below.
            </span>
          </div>
        )}

        {!isNew && (
          <div className="responsive-dashboard-grid grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* KPI row */}
            {kpis.map((k) => (
              <div
                key={k.label}
                onClick={() => k.to && navigate(k.to)}
                className="col-span-1 lg:col-span-2"
                style={{ ...card, borderRadius: 16, padding: '18px 18px 16px', position: 'relative', cursor: k.to ? 'pointer' : 'default' }}
              >
                {k.to && <span style={{ position: 'absolute', top: 14, right: 14, fontSize: 11, color: C.ghost }}>↗</span>}
                <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 10 }}>{k.label}</div>

                {isLoading || analyticsLoading || k.loading ? (
                  <>
                    <div style={{ marginBottom: 8 }}><Shimmer height={26} /></div>
                    <Shimmer height={13} />
                  </>
                ) : k.unavailable ? (
                  <>
                    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#92400e', background: '#fffbeb', border: '1px dashed #fde68a', padding: '4px 9px', borderRadius: 7, marginBottom: 6 }}>
                      {k.badge ?? 'Coming soon'}
                    </span>
                    <div style={{ fontSize: 11.5, color: C.faint, lineHeight: 1.45 }}>{k.unavailable}</div>
                  </>
                ) : isEmpty ? (
                  <>
                    <div style={{ fontSize: 24, fontWeight: 700, color: C.ghost }}>—</div>
                    <div style={{ fontSize: 11.5, color: C.faint, marginTop: 4 }}>None in this period</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.01em' }}>{k.value}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, minHeight: 18 }}>
                      {k.delta ? (
                        <>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: k.delta.up ? '#059669' : '#e11d48', background: k.delta.up ? '#ecfdf5' : '#fff1f2', padding: '2px 7px', borderRadius: 6 }}>
                            {k.delta.up ? '▲' : '▼'} {k.delta.text}
                          </span>
                          <span style={{ fontSize: 11, color: C.faint }}>vs prior {days}d</span>
                        </>
                      ) : !k.note ? (
                        <span style={{ fontSize: 11, color: C.faint, border: '1px dashed #cbd5e1', padding: '2px 7px', borderRadius: 6 }}>
                          No prior period
                        </span>
                      ) : null}
                    </div>
                    {k.note && <div style={{ fontSize: 10.5, color: C.faint, marginTop: 5 }}>{k.note}</div>}
                  </>
                )}
              </div>
            ))}

            {/* Needs attention */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-12">
              {isLoading ? (
                <Shimmer height={64} />
              ) : attention.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 14, padding: '15px 20px' }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#059669', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: '#065f46' }}>All clear — nothing needs your attention right now.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-flow-col gap-2.5">
                  {attention.map((a) => {
                    const t = tone(a.tone);
                    return (
                      <button
                        key={a.label}
                        onClick={() => navigate(a.to)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: t.bg, border: `1px solid ${t.bd}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', font: 'inherit' }}
                      >
                        <span style={{ fontSize: 20, fontWeight: 700, color: t.fg, minWidth: 26 }}>{a.count}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: t.lfg, lineHeight: 1.3 }}>{a.label}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: t.fg }}>→</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sales trend */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-8" style={card}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4, gap: 12, flexWrap: 'wrap' }}>
                <div><CardTitle title="Sales trend" sub={analytics.isStoreScoped ? 'Net sales and order count, daily · all stores' : 'Net sales and order count, daily'} /></div>
                <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: C.muted }}>
                  <span><span style={{ display: 'inline-block', width: 10, height: 3, background: C.primary, borderRadius: 2, verticalAlign: 'middle', marginRight: 5 }} />Net sales</span>
                  <span><span style={{ display: 'inline-block', width: 10, height: 8, background: '#fcd34d', borderRadius: 2, verticalAlign: 'middle', marginRight: 5 }} />Orders</span>
                </div>
              </div>

              {isLoading || analyticsLoading ? (
                <div style={{ marginTop: 14 }}><Shimmer height={240} /></div>
              ) : !trend ? (
                /* No dated rows came back. Say so rather than drawing a flat line at zero —
                   a flat line reads as "no activity", which is a different claim from
                   "not measured". */
                <div style={{ height: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>
                    {analyticsError ? 'Trend could not be loaded' : 'No sales recorded between ' + rangeLabel}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.faint, maxWidth: 320, textAlign: 'center', lineHeight: 1.45 }}>
                    {analyticsError
                      ? 'The analytics service did not respond.'
                      : 'Daily figures appear here once orders are recorded in this period.'}
                  </div>
                  {!analyticsError && period !== '90d' && (
                    <button onClick={() => setPeriod('90d')} style={{ font: '600 12.5px inherit', color: C.primary, background: '#ede9fe', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}>
                      Show last 90 days
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <svg viewBox="0 0 760 250" style={{ width: '100%', display: 'block', marginTop: 8 }}>
                    <line x1="0" y1="60" x2="760" y2="60" stroke={C.grid} />
                    <line x1="0" y1="115" x2="760" y2="115" stroke={C.grid} />
                    <line x1="0" y1="170" x2="760" y2="170" stroke={C.grid} />
                    <line x1="0" y1="222" x2="760" y2="222" stroke="#e2e8f0" />
                    {trend.bars.map((b, i) => (
                      <rect key={i} x={b.x} y={b.y} width={trend.barW} height={b.h} rx="3" fill="#fcd34d" />
                    ))}
                    <path d={trend.area} fill="rgba(85,52,154,.07)" />
                    <polyline points={trend.line} fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: C.faint, padding: '2px 4px 0' }}>
                    {trend.labels.map((l, i) => <span key={i}>{l}</span>)}
                  </div>
                </>
              )}
            </div>

            {/* Channel split */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-4" style={card}>
              <CardTitle title="Channel split" sub="Walk-in baskets vs online" />
              <div style={{ marginBottom: 16 }} />
              {/* Gates on the ANALYTICS state, not the order-row state. Gating on `isLoading`
                  alone would render ₹0 and zero-width bars while analytics is still in flight
                  (the rows resolve first), and would leave those zeros on screen permanently
                  if the analytics query failed. */}
              {isLoading || (analyticsLoading && scoped.length === 0) ? (
                <Shimmer height={200} />
              ) : !channels.hasData ? (
                <Centered height={200}>No orders recorded in this period</Centered>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: C.muted, marginBottom: 14 }}>
                    <span><span style={{ display: 'inline-block', width: 9, height: 9, background: C.primary, borderRadius: 3, verticalAlign: 'middle', marginRight: 5 }} />Online</span>
                    <span><span style={{ display: 'inline-block', width: 9, height: 9, background: C.amber, borderRadius: 3, verticalAlign: 'middle', marginRight: 5 }} />Walk-in</span>
                  </div>
                  {channels.rows.map((c) => (
                    <div key={c.metric} style={{ marginBottom: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 7 }}>
                        <span>{c.metric}</span><span style={{ color: C.faint, fontWeight: 500 }}>{c.total}</span>
                      </div>
                      <div style={{ display: 'flex', height: 22, borderRadius: 7, overflow: 'hidden', gap: 2 }}>
                        <div style={{ width: `${c.onPct}%`, background: C.primary, borderRadius: '6px 2px 2px 6px' }} />
                        <div style={{ width: `${c.wkPct}%`, background: C.amber, borderRadius: '2px 6px 6px 2px' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: C.muted, marginTop: 6 }}>
                        <span><strong style={{ color: C.ink }}>{c.onVal}</strong> online</span>
                        <span><strong style={{ color: C.ink }}>{c.wkVal}</strong> walk-in</span>
                      </div>
                    </div>
                  ))}
                  {channels.both && (
                    <div style={{ fontSize: 11.5, color: C.faint, borderTop: `1px solid ${C.grid}`, paddingTop: 12, lineHeight: 1.5 }}>
                      Walk-in AOV <strong style={{ color: C.ink }}>₹{inr(channels.wkAov)}</strong> vs online{' '}
                      <strong style={{ color: C.ink }}>₹{inr(channels.onAov)}</strong>
                      {channels.wkAov < channels.onAov ? ' — smaller baskets, more of them.' : ' — larger baskets in store.'}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Store leaderboard */}
            {multiStore && (
              <div className="col-span-1 sm:col-span-2 lg:col-span-5" style={card}>
                <CardTitle title="Store leaderboard" sub="Ranked by net sales" />
                <div style={{ marginBottom: 16 }} />
                {isLoading || (analyticsLoading && scoped.length === 0) ? (
                  <Shimmer height={210} />
                ) : leaderboard.length === 0 ? (
                  <Centered height={210}>No sales recorded in this period</Centered>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {leaderboard.map((s) => (
                      <div key={s.uid} onClick={() => navigate('/stores')} style={{ cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                          <span style={{ fontWeight: 600 }}>{s.name}</span>
                          <span style={{ fontWeight: 700 }}>₹{inr(s.sales)}</span>
                        </div>
                        <div style={{ height: 10, background: C.grid, borderRadius: 5, overflow: 'hidden' }}>
                          <div style={{ width: `${s.pct}%`, height: '100%', background: C.primary, borderRadius: 5 }} />
                        </div>
                        <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>
                          {s.orders} orders · AOV ₹{inr(s.aov)} · {s.share}% of sales
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Top items — metric 417, so revenue-only (no units toggle: see note above). */}
            <div className={cn("col-span-1 sm:col-span-2", itemsSpan === 4 ? "lg:col-span-4" : "lg:col-span-8")} style={card}>
              <div style={{ marginBottom: 14 }}>
                <CardTitle title="Top items" sub="Best sellers this period, by revenue" />
              </div>
              {isLoading || (analyticsLoading && items.length === 0) ? (
                <Shimmer height={230} />
              ) : topItems.length === 0 ? (
                <Centered height={230}>
                  {noAnalyticsCoverage ? 'Not recorded yet for this period' : 'Nothing sold in this period'}
                </Centered>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {topItems.map((t) => (
                    <div key={t.rank} onClick={() => navigate('/items?action=create')} style={{ display: 'grid', gridTemplateColumns: '18px 1fr 90px', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <span style={{ fontSize: 11, color: C.faint, fontWeight: 600 }}>{t.rank}</span>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 3 }}>{t.name}</div>
                        <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${t.pct}%`, height: '100%', background: C.amber, borderRadius: 3 }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right' }}>{t.val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category mix */}
            <div className={cn("col-span-1 sm:col-span-2", donutSpan === 3 ? "lg:col-span-3" : "lg:col-span-4")} style={card}>
              <CardTitle title="Category mix" sub="Revenue share" />
              <div style={{ marginBottom: 14 }} />
              {isLoading || (analyticsLoading && items.length === 0) ? (
                <Shimmer height={220} />
              ) : donut.length === 0 ? (
                <Centered height={220}>
                  {noAnalyticsCoverage ? 'Not recorded yet for this period' : 'No revenue in this period'}
                </Centered>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 12px' }}>
                    <svg viewBox="0 0 140 140" style={{ width: 132, height: 132 }}>
                      {donut.map((d) => (
                        <circle key={d.label} cx="70" cy="70" r="54" fill="none" stroke={d.c} strokeWidth="20" strokeDasharray={d.dash} strokeDashoffset={d.off} />
                      ))}
                      <text x="70" y="66" textAnchor="middle" style={{ font: "700 15px inherit", fill: C.ink }}>{netSales === null ? '—' : compactInr(netSales)}</text>
                      <text x="70" y="82" textAnchor="middle" style={{ font: "500 9.5px inherit", fill: C.faint }}>net sales</text>
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {donut.map((d) => (
                      <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: d.c }} />
                        <span style={{ fontWeight: 600 }}>{d.label}</span>
                        <span style={{ marginLeft: 'auto', color: C.faint }}>{d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Customer band */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-12" style={{ ...card, padding: '18px 24px' }}>
              {isLoading ? (
                <Shimmer height={52} />
              ) : !customers.any ? (
                <div style={{ height: 52, display: 'flex', alignItems: 'center', fontSize: 13, color: C.faint }}>
                  {isEmpty ? 'No customer activity in this period' : 'Orders in this period are not linked to customers'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: C.muted, marginBottom: 8 }}>Customers · new vs returning</div>
                    <div style={{ display: 'flex', height: 14, borderRadius: 5, overflow: 'hidden', gap: 2, marginBottom: 6 }}>
                      <div style={{ width: `${customers.newPct}%`, background: C.amber, borderRadius: '4px 2px 2px 4px' }} />
                      <div style={{ width: `${100 - customers.newPct}%`, background: C.primary, borderRadius: '2px 4px 4px 2px' }} />
                    </div>
                    <div style={{ fontSize: 11.5, color: C.muted }}>
                      <strong style={{ color: C.ink }}>{customers.new}</strong> new ·{' '}
                      <strong style={{ color: C.ink }}>{customers.returning}</strong> returning
                    </div>
                  </div>
                  <div className="border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 sm:pl-6" style={{ borderColor: C.grid }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: C.muted, marginBottom: 4 }}>Repeat purchase rate</div>
                    <div style={{ fontSize: 21, fontWeight: 700 }}>{customers.repeatRate}%</div>
                  </div>
                  <div className="border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 sm:pl-6" style={{ borderColor: C.grid }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: C.muted, marginBottom: 4 }}>Avg units per order</div>
                    {/* This cell is analytics-backed inside a block gated on the row-derived
                        `customers.any` — the rows resolve first, so without its own loading
                        check this would flash "Not recorded" for every tenant while metric 415
                        is still in flight. */}
                    {analyticsLoading ? (
                      <Shimmer height={21} />
                    ) : avgUnits === null ? (
                      <>
                        <div style={{ fontSize: 21, fontWeight: 700, color: C.ghost }}>—</div>
                        <div style={{ fontSize: 10.5, color: C.faint, marginTop: 2 }}>
                          {analytics.isStoreScoped ? 'Not split by store' : 'Not recorded yet'}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 21, fontWeight: 700 }}>{avgUnits.toFixed(1)}</div>
                    )}
                  </div>
                  <div className="border-t lg:border-t-0 sm:border-l pt-4 lg:pt-0 sm:pl-6 cursor-pointer" style={{ borderColor: C.grid }} onClick={() => navigate('/customers')}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: C.muted, marginBottom: 4 }}>Customers served</div>
                    <div style={{ fontSize: 21, fontWeight: 700 }}>
                      {customers.served} <span style={{ fontSize: 11, color: C.primary, fontWeight: 600 }}>View →</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
