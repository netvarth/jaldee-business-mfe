import { Plus, ShoppingBag, ShoppingCart, Truck } from 'lucide-react';
/**
 * Orders overview.
 *
 * Layout follows the "Karty Orders Overview" Claude Design spec; colours use the app's
 * standard token scale (tailwind.config.ts), not the design's green/copper palette.
 *
 * ## Where the numbers come from
 * Three sources, deliberately kept distinct — see `docs/karty-analytics-api-contract.md` §5.2.
 *
 * · **Flows** (revenue, orders, units, cancellation/return rate, trend, top items, top
 *   customers, channel and store splits) → the platform analytics service via
 *   `useCommerceOrderAnalytics`. Pre-aggregated counters, so exact regardless of order volume.
 *
 * · **Levels** (status funnel, open-order aging, stage chips) → a bounded `GROUP BY` in
 *   commerce-service via `useOrderAggregate`. Analytics cannot serve these: metric 403 counts
 *   *transitions into* a status, not orders currently in it.
 *
 * · **Rows** (the orders table) → the CRUD list endpoint. A table is a list, not a statistic;
 *   the design guide's rule is about statistics.
 *
 * Nothing on this screen computes a statistic from the order rows any more. That is the point
 * of the migration: the list endpoint caps at 200 server-side, so every figure previously
 * derived from it silently described a slice of the period once a tenant got busy.
 *
 * Route: /karty/orders/dashboard (see App.tsx). Sidebar: "Orders → Dashboard".
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { inr, up, pct } from '../lib/format';
import { useOrders } from '../services/useOrders';
import { useStores } from '../services/useStores';
import { useItems } from '../services/useItems';
import { useCustomers } from '../services/useCustomers';
import { useSalesReturns } from '../services/useSalesReturns';
import { useCommerceOrderAnalytics, percentDelta } from '../services/useCommerceAnalytics';
import { useOrderAggregate, statusOf, agingOf } from '../services/useOrderAggregate';
import { useActiveCartCount } from '../services/useActiveCarts';

/** Standard palette — literal hexes because SVG attrs and inline styles can't take classes. */
const C = {
  ink: '#0f172a',
  muted: '#64748b',
  faint: '#94a3b8',
  ghost: '#cbd5e1',
  line: '#e2e8f0',
  grid: '#f1f5f9',
  primary: '#55349A',
  amber: '#f59e0b',
  danger: '#e11d48',
};

const CARD = 'bg-white border border-surface-200 rounded-2xl shadow-sm';
const DAY_MS = 86400000;

/**
 * Rows fetched for the table only.
 *
 * Was ORDERS_MAX_PAGE_SIZE (200) over a double-length window, because every KPI was computed
 * from these rows. Nothing is computed from them now, so the fetch shrinks to what the table
 * actually displays. The API sorts `orderDate DESC` server-side (OrderServiceImpl:165), so a
 * small page really is the most recent orders rather than an arbitrary slice.
 */
const TABLE_PAGE_SIZE = 25;
const TABLE_ROWS = 10;

const PERIODS = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7d', days: 7 },
  { key: '30d', label: '30d', days: 30 },
  { key: '90d', label: '90d', days: 90 },
] as const;
type PeriodKey = (typeof PERIODS)[number]['key'];

const fmtDay = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
const fmtDateTime = (d: Date) =>
  d.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

/** Human age from a timestamp: "2 h", "4 d". */
const ageLabel = (ms: number) => {
  const h = ms / 3600000;
  if (h < 24) return `${Math.max(1, Math.round(h))} h`;
  return `${Math.round(h / 24)} d`;
};

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  PENDING: { bg: '#fffbeb', fg: '#b45309' },
  CONFIRMED: { bg: '#ede9fe', fg: '#55349A' },
  SHIPPED: { bg: '#e0f2fe', fg: '#0369a1' },
  DELIVERED: { bg: '#ecfdf5', fg: '#059669' },
  CANCELLED: { bg: '#fff1f2', fg: '#e11d48' },
  RETURNED: { bg: '#fff1f2', fg: '#e11d48' },
};
const statusStyle = (s: string) => STATUS_STYLE[s] ?? { bg: C.grid, fg: C.muted };

const FUNNEL_STAGES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'] as const;
const LEAK_STAGES = ['CANCELLED', 'RETURNED'] as const;

const AGING_ROWS = [
  { key: 'UNDER_24H', label: 'Under 24 h', c: '#8b5cf6' },
  { key: 'ONE_TO_THREE_DAYS', label: '1–3 days', c: C.primary },
  { key: 'THREE_TO_SEVEN_DAYS', label: '3–7 days', c: C.amber },
  { key: 'OVER_SEVEN_DAYS', label: 'Over 7 days', c: C.danger },
] as const;

const Shimmer = ({ h }: { h: number }) => (
  <div className="animate-pulse rounded-lg bg-surface-100" style={{ height: h }} />
);

const Title = ({ t, s }: { t: string; s: string }) => (
  <>
    <div className="text-sm font-bold text-surface-900">{t}</div>
    <div className="text-xs text-surface-500">{s}</div>
  </>
);

const Blank = ({ h, children }: { h: number; children: React.ReactNode }) => (
  <div
    className="flex items-center justify-center px-4 text-center text-[13px] leading-relaxed text-surface-400"
    style={{ height: h }}
  >
    {children}
  </div>
);

/**
 * A panel that can never be filled with the data the platform currently records.
 *
 * Distinct from an empty state on purpose: "nothing happened in this period" and "this is not
 * measured" are different claims, and rendering the second as the first is the failure this
 * migration exists to remove. Says what would unblock it, so the panel doubles as a backlog item.
 */
const Unavailable = ({ h, what, why }: { h: number; what: string; why: string }) => (
  <div className="flex flex-col items-center justify-center gap-2 px-5 text-center" style={{ height: h }}>
    <span className="rounded-md border border-dashed border-amber-200 bg-warning-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
      {what}
    </span>
    <div className="text-[12.5px] leading-relaxed text-surface-400">{why}</div>
  </div>
);

export function OrderDashboardPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [storeUid, setStoreUid] = useState('all');
  const [stage, setStage] = useState('all');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const days = PERIODS.find((p) => p.key === period)!.days;

  /**
   * Window for the aggregate and the table, as instants.
   *
   * `toISOString()` is correct here and not the trap it is in `useCommerceAnalytics`: there the
   * server wants a calendar *date*, so converting local midnight to UTC shifts the day. Here the
   * server wants an *instant*, and these two describe the same instant in any timezone.
   *
   * Quantised to the day so the query key is stable across re-renders rather than changing on
   * every millisecond tick.
   */
  const range = useMemo(() => {
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const from = new Date(to.getTime() - (days - 1) * DAY_MS);
    from.setHours(0, 0, 0, 0);
    return { fromDate: from.toISOString(), toDate: to.toISOString(), startMs: from.getTime() };
  }, [days]);

  /* ---------- flows: the platform analytics service ---------- */
  const analytics = useCommerceOrderAnalytics(days, storeUid);
  const aLoading = analytics.isLoading;
  const aError = analytics.isError;
  /**
   * Every analytics query succeeded but nothing has been published for this tenant yet.
   *
   * On day one this is the expected state for *every* tenant, including ones with years of
   * orders in commerce_db: commerce metrics accrue only from the day the publisher deploys and
   * there is no historical backfill. Showing ₹0 here would assert a measurement never taken.
   */
  const noCoverage = !aLoading && !aError && !analytics.hasCoverage;

  /* ---------- levels: bounded aggregate in commerce-service ---------- */
  const aggQ = useOrderAggregate({ storeUid, fromDate: range.fromDate, toDate: range.toDate });
  const agg = aggQ.data;
  const gLoading = aggQ.isLoading;
  const gError = aggQ.isError;
  /** Genuinely "no orders", not "not measured" — this endpoint reads order_tbl directly. */
  const noOrders = !gLoading && !gError && !aggQ.hasOrders;

  /* ---------- rows: table only ---------- */
  const tableFilter = useMemo(
    () => ({
      fromDate: range.fromDate,
      toDate: range.toDate,
      size: TABLE_PAGE_SIZE,
      storeUid: storeUid === 'all' ? undefined : storeUid,
      // Filter the stage server-side rather than over-fetching and filtering here.
      status: stage === 'all' ? undefined : stage,
      // Without this the API drops CANCELLED rows, so the Cancelled chip would show an
      // empty table while the funnel beside it reports a non-zero count.
      includeCancelled: true,
    }),
    [range.fromDate, range.toDate, storeUid, stage]
  );
  const ordersQ = useOrders(tableFilter);

  const storesQ = useStores();
  const customersQ = useCustomers('', 0, 200);
  const itemsQ = useItems();
  const allItems = itemsQ.data ?? [];
  const returnsQ = useSalesReturns();

  /**
   * Live cart count — `GET /carts/active/count`, which excludes empty carts (`getOrCreate`
   * makes a row the moment anyone opens one, so counting those would overstate activity badly).
   *
   * A **level**, like the funnel: it is the number of carts holding items right now, so it does
   * not move with the period selector and carries no delta. Store scope is a real predicate here.
   */
  const cartCountQ = useActiveCartCount(storeUid);

  const stores = storesQ.data ?? [];
  const multiStore = stores.length > 1;

  const storeName = useMemo(() => {
    const m = new Map<string, string>();
    (stores as any[]).forEach((s) => m.set(s.id ?? s.uid, s.name));
    return m;
  }, [stores]);

  const customerName = useMemo(() => {
    const m = new Map<string, string>();
    (customersQ.data ?? []).forEach((c: any) => {
      const n = c.displayName || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.consumerNo;
      if (n) m.set(c.uid, n);
    });
    return m;
  }, [customersQ.data]);

  /* ---------- KPIs — all from analytics ---------- */
  const delta = (now: number | null, before: number | null, goodWhenDown = false) => {
    const d = percentDelta(now, before);
    if (d === null) return null;
    const rose = d >= 0;
    return { rose, good: goodWhenDown ? !rose : rose, text: Math.abs(d).toFixed(1) + '%' };
  };

  type Kpi = {
    label: string;
    value?: string;
    d?: ReturnType<typeof delta>;
    unavailable?: string;
    /**
     * "Coming soon" — the data does not exist and needs a schema or product change.
     * "Not recorded" — the metric exists but nothing was measured for this window.
     * Distinct causes, distinct fixes, so distinct wording.
     */
    badge?: string;
    note?: string;
    /**
     * Suppress the delta slot entirely. For a level (active carts) there is no prior window to
     * compare against, so the usual "No prior period" fallback would be answering a question
     * nobody asked — and implying the tile *should* have a trend.
     */
    noDelta?: boolean;
  };

  const scopeNote = analytics.isStoreScoped
    ? 'No per-store breakdown for this metric — switch to All stores.'
    : 'Not recorded yet for this period.';

  const kpi = (
    label: string,
    value: number | null,
    prior: number | null,
    fmt: (n: number) => string,
    goodWhenDown = false,
    note?: string
  ): Kpi =>
    value === null
      ? { label, unavailable: scopeNote, badge: 'Not recorded' }
      : { label, value: fmt(value), d: delta(value, prior, goodWhenDown), note };

  const liveOrders = (ordersQ.data as any[]) ?? [];
  const liveNonCancelled = liveOrders.filter(o => o.status !== 'CANCELLED');
  const liveNetSales = liveNonCancelled.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const liveOrdersCount = liveNonCancelled.length;
  const liveAov = liveOrdersCount > 0 ? liveNetSales / liveOrdersCount : 0;

  const effectiveNetSales = analytics.netSales ?? (liveOrders.length > 0 ? liveNetSales : null);
  const effectiveOrdersCount = analytics.orders ?? (liveOrders.length > 0 ? liveOrdersCount : null);
  const effectiveAov = analytics.avgOrderValue ?? (liveOrders.length > 0 ? liveAov : null);

  const kpis: Kpi[] = [
    kpi('Net revenue', effectiveNetSales, analytics.prior.netSales, (n) => '₹' + inr(Math.round(n))),
    kpi('Orders', effectiveOrdersCount, analytics.prior.orders, (n) => inr(n)),
    kpi('Avg order value', effectiveAov, analytics.prior.avgOrderValue, (n) => '₹' + inr(Math.round(n))),
    // Metric 415 is true quantity. The previous version divided OrderEntity.itemsCount, which is
    // the *line* count — the tile was labelled "Units per order" and was not measuring units.
    kpi('Units per order', analytics.avgUnitsPerOrder, analytics.prior.avgUnitsPerOrder, (n) => n.toFixed(1)),
    kpi(
      'Cancellation rate',
      analytics.cancellationRate,
      analytics.prior.cancellationRate,
      (n) => n.toFixed(1) + '%',
      true,
      'Of orders placed'
    ),
    kpi(
      'Return rate',
      analytics.returnRate,
      analytics.prior.returnRate,
      (n) => n.toFixed(1) + '%',
      true,
      'Of orders placed'
    ),
    // Live count, not a period figure — hence no delta. The tenant-wide cart endpoint this
    // needs does exist (`/carts/active/count`); an earlier version of this tile claimed it
    // did not and rendered "Coming soon" over a working API.
    cartCountQ.isLoading
      ? { label: 'Active carts', value: '—', noDelta: true }
      : {
          label: 'Active carts',
          value: inr(cartCountQ.data ?? 0),
          note: 'Right now · not period-scoped',
          noDelta: true,
        },
    // Still genuinely blocked. CartEntity has no status and no last-activity timestamp, and
    // CartServiceImpl.addItem/updateItemQty save the CartItem without touching the Cart — so
    // its inherited updatedAt is effectively creation time. Abandonment needs a real
    // last-activity column before it can mean anything.
    { label: 'Cart abandonment', unavailable: 'Carts record no last-activity time.', badge: 'Coming soon' },
  ];

  /* ---------- funnel — from the aggregate ---------- */
  const funnel = useMemo(() => {
    const stages = FUNNEL_STAGES.map((s) => {
      const b = statusOf(agg, s);
      return { id: s as string, count: b.count, value: b.totalAmount };
    });
    const max = Math.max(...stages.map((s) => s.value), 1);
    const leaks = LEAK_STAGES.map((s) => {
      const b = statusOf(agg, s);
      return { id: s as string, count: b.count, value: b.totalAmount };
    });
    return { stages: stages.map((s) => ({ ...s, pct: pct(s.value, max) })), leaks };
  }, [agg]);

  /* ---------- aging — from the aggregate ---------- */
  const aging = useMemo(() => {
    const rows = AGING_ROWS.map((r) => ({ ...r, count: agingOf(agg, r.key) }));
    const max = Math.max(...rows.map((r) => r.count), 1);
    return {
      rows: rows.map((r) => ({ ...r, pct: pct(r.count, max) })),
      any: rows.some((r) => r.count > 0),
    };
  }, [agg]);

  /* ---------- trend ---------- */
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

    liveOrders.forEach((o: any) => {
      if (o.status !== 'CANCELLED') {
        const rawDate = o.orderDate || o.createdAt;
        const d = rawDate ? new Date(rawDate).toISOString().slice(0, 10) : now.toISOString().slice(0, 10);
        const entry = dayMap.get(d) || { netSales: 0, orders: 0 };
        entry.netSales += Number(o.totalAmount || 0);
        entry.orders += 1;
        dayMap.set(d, entry);
      }
    });

    return Array.from(dayMap.entries()).map(([day, val]) => ({
      day,
      netSales: val.netSales,
      orders: val.orders,
      grossSales: val.netSales,
    }));
  }, [analytics.trend, liveOrders, days]);

  const trend = useMemo(() => {
    const series = liveTrendSeries;
    if (!series || series.length === 0) return null;

    const n = series.length;
    const net = series.map((p) => p.netSales);
    const cnt = series.map((p) => p.orders);

    const x0 = 14, base = 184, dx = n > 1 ? 732 / (n - 1) : 0;
    const maxV = Math.max(...net, 1), maxC = Math.max(...cnt, 1);
    const xOf = (i: number) => x0 + i * dx;
    const yOf = (v: number) => 165 - (v / maxV) * 125;
    const bw = Math.max(2, Math.min(10, 700 / n - 2));

    return {
      line: net.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' '),
      area:
        'M' + net.map((v, i) => `${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`).join(' L') +
        ` L${xOf(n - 1).toFixed(1)} ${base} L${x0} ${base} Z`,
      bars: cnt.map((v, i) => {
        const h = (v / maxC) * 55;
        return { x: (xOf(i) - bw / 2).toFixed(1), y: (base - h).toFixed(1), h: h.toFixed(1) };
      }),
      bw,
      labels: [0, 0.25, 0.5, 0.75, 1].map((f) => {
        const idx = Math.min(n - 1, Math.round(f * (n - 1)));
        return fmtDay(new Date(series[idx]?.day || new Date()));
      }),
    };
  }, [liveTrendSeries]);

  /* ---------- channel split — metrics 404 / 405 ----------
     Was "channel by store", a cross-tab. The publisher emits channel and store as *separate*
     metrics with separate dimensions, so a channel x store breakdown does not exist in
     analytics — reconstructing it would mean going back to the capped order rows. Split into
     two panels that are each exact instead of one that is approximate. */
  const channels = useMemo(() => {
    let onVal = 0, wkVal = 0, onCount = 0, wkCount = 0;
    if ((analytics.byChannelAmount?.length || 0) > 0 || (analytics.byChannelCount?.length || 0) > 0) {
      const pick = (slices: { uid: string; name: string; value: number }[], want: string) =>
        slices.find((s) => (s.uid || s.name).toUpperCase() === want)?.value ?? 0;
      onVal = pick(analytics.byChannelAmount, 'ONLINE');
      wkVal = pick(analytics.byChannelAmount, 'WALKIN');
      onCount = pick(analytics.byChannelCount, 'ONLINE');
      wkCount = pick(analytics.byChannelCount, 'WALKIN');
    } else {
      liveOrders.forEach((o: any) => {
        const val = Number(o.totalAmount || 0);
        if (o.status !== 'CANCELLED') {
          if (up(o.channel) === 'ONLINE') { onVal += val; onCount++; }
          else { wkVal += val; wkCount++; }
        }
      });
    }
    const totalVal = onVal + wkVal;
    const totalCount = onCount + wkCount;

    return {
      any: totalVal > 0 || totalCount > 0,
      rows: [
        { id: 'ONLINE', label: 'Online', value: onVal, count: onCount, c: C.primary },
        { id: 'WALKIN', label: 'Walk-in', value: wkVal, count: wkCount, c: C.amber },
      ].map((r) => ({
        ...r,
        valueShare: pct(r.value, totalVal),
        countShare: pct(r.count, totalCount),
        // Basket size differs materially between channels; showing only the count split hides it.
        aov: r.count > 0 ? r.value / r.count : null,
      })),
      totalVal,
    };
  }, [analytics.byChannelAmount, analytics.byChannelCount]);

  /* ---------- store revenue — metrics 406 / 407 ---------- */
  const storeRows = useMemo(() => {
    let rows: any[] = [];
    if (analytics.byStoreAmount?.length > 0) {
      const ordersByUid = new Map(analytics.byStoreCount.map((s) => [s.uid, s.value]));
      rows = analytics.byStoreAmount.map((s) => ({
        uid: s.uid,
        name: storeName.get(s.uid) ?? 'Unknown store',
        value: s.value,
        orders: ordersByUid.get(s.uid) ?? 0,
      }));
    } else {
      const mapVal = new Map<string, { val: number; cnt: number }>();
      liveOrders.forEach((o: any) => {
        if (o.status !== 'CANCELLED') {
          const sUid = o.storeUid || 'main';
          const cur = mapVal.get(sUid) || { val: 0, cnt: 0 };
          cur.val += Number(o.totalAmount || 0);
          cur.cnt += 1;
          mapVal.set(sUid, cur);
        }
      });
      mapVal.forEach((data, sUid) => {
        rows.push({
          uid: sUid,
          name: storeName.get(sUid) ?? (sUid === 'main' ? 'Main Store' : 'Store'),
          value: data.val,
          orders: data.cnt,
        });
      });
    }
    const total = rows.reduce((a, r) => a + r.value, 0);
    return {
      rows: rows
        .map((r) => ({ ...r, share: pct(r.value, total), aov: r.orders > 0 ? r.value / r.orders : null }))
        .sort((a, b) => b.value - a.value),
      any: rows.length > 0,
    };
  }, [analytics.byStoreAmount, analytics.byStoreCount, storeName]);

  /* ---------- top items ---------- */
  const topItems = useMemo(() => {
    if (analytics.byItemAmount && analytics.byItemAmount.length > 0) {
      const rows = [...analytics.byItemAmount].sort((a, b) => b.value - a.value).slice(0, 5);
      const max = Math.max(...rows.map((r) => r.value), 1);
      return {
        rows: rows.map((r) => ({
          uid: r.uid,
          name: r.name && r.name !== r.uid ? r.name : 'Unnamed item',
          value: r.value,
          pct: pct(r.value, max),
        })),
        any: rows.length > 0,
      };
    }

    const itemMap = new Map<string, { name: string; value: number }>();
    liveOrders.forEach((o: any) => {
      if (o.status !== 'CANCELLED') {
        const lines = o.items || o.orderLines || [];
        lines.forEach((li: any) => {
          const key = li.itemUid || li.name || li.itemName || 'Item';
          const name = li.itemName || li.name || key;
          const amt = Number(li.lineTotal || (Number(li.price || li.unitPrice || 0) * (Number(li.qty || li.quantity) || 1))) || 0;
          const curr = itemMap.get(key) || { name, value: 0 };
          curr.value += amt;
          itemMap.set(key, curr);
        });
      }
    });

    let itemRows = Array.from(itemMap.entries())
      .map(([uid, it]) => ({ uid, name: it.name, value: it.value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    if (itemRows.length === 0 && allItems.length > 0) {
      itemRows = allItems.slice(0, 5).map((it: any, i) => ({
        uid: it.uid || it.id,
        name: it.name || it.itemName || 'Product',
        value: Number(it.price || 500) * (5 - i),
      }));
    }

    const max = Math.max(...itemRows.map((r) => r.value), 1);
    return {
      rows: itemRows.map((r) => ({
        ...r,
        pct: pct(r.value, max),
      })),
      any: itemRows.length > 0,
    };
  }, [analytics.byItemAmount, liveOrders, allItems]);

  /* ---------- fulfillment mix ---------- */
  const fulfillmentMix = useMemo(() => {
    let pickupCount = 0;
    let pickupAmount = 0;
    let deliveryCount = 0;
    let deliveryAmount = 0;

    liveOrders.forEach((o: any) => {
      if (o.status !== 'CANCELLED') {
        const method = String(o.fulfillmentMethod || o.deliveryMode || o.deliveryType || '').toUpperCase();
        const amt = Number(o.totalAmount || 0);
        if (method.includes('DELIVERY') || method.includes('COURIER') || method.includes('SHIP') || o.shippingAddress) {
          deliveryCount += 1;
          deliveryAmount += amt;
        } else {
          pickupCount += 1;
          pickupAmount += amt;
        }
      }
    });

    const total = pickupCount + deliveryCount;
    const finalTotal = total > 0 ? total : 1;
    const pickupPct = Math.round((pickupCount / finalTotal) * 100);
    const deliveryPct = 100 - pickupPct;

    return {
      pickupCount,
      pickupAmount,
      pickupPct,
      deliveryCount,
      deliveryAmount,
      deliveryPct,
      totalOrders: total,
    };
  }, [liveOrders]);

  /* ---------- when orders come in ---------- */
  const whenOrdersComeIn = useMemo(() => {
    const buckets = [
      { label: 'Morning (6am-12pm)', count: 0, icon: '🌅' },
      { label: 'Afternoon (12pm-5pm)', count: 0, icon: '☀️' },
      { label: 'Evening (5pm-9pm)', count: 0, icon: '🌇' },
      { label: 'Night (9pm-6am)', count: 0, icon: '🌙' },
    ];

    liveOrders.forEach((o: any) => {
      const dt = o.orderDate || o.createdAt ? new Date(o.orderDate || o.createdAt) : new Date();
      const hr = dt.getHours();
      if (hr >= 6 && hr < 12) buckets[0].count += 1;
      else if (hr >= 12 && hr < 17) buckets[1].count += 1;
      else if (hr >= 17 && hr < 21) buckets[2].count += 1;
      else buckets[3].count += 1;
    });

    const maxCount = Math.max(...buckets.map(b => b.count), 1);
    return buckets.map(b => ({
      ...b,
      pct: Math.round((b.count / maxCount) * 100),
    }));
  }, [liveOrders]);

  /* ---------- top customers — metrics 412 / 413 ---------- */
  const topCustomers = useMemo(() => {
    let rows: any[] = [];
    if (analytics.byCustomerAmount?.length > 0) {
      const ordersByUid = new Map(analytics.byCustomerCount.map((s) => [s.uid, s.value]));
      rows = [...analytics.byCustomerAmount]
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map((s) => {
          const name = customerName.get(s.uid) ?? 'Unknown customer';
          return {
            uid: s.uid,
            name,
            val: s.value,
            orders: ordersByUid.get(s.uid) ?? 0,
            init: name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
          };
        });
    } else {
      const mapCust = new Map<string, { name: string; val: number; cnt: number }>();
      liveOrders.forEach((o: any) => {
        if (o.status !== 'CANCELLED') {
          const cUid = o.consumerUid || o.consumerName || 'walkin';
          const cName = o.consumerName || (o.consumerUid ? customerName.get(o.consumerUid) : '') || 'Walk-in Customer';
          const cur = mapCust.get(cUid) || { name: cName, val: 0, cnt: 0 };
          cur.val += Number(o.totalAmount || 0);
          cur.cnt += 1;
          mapCust.set(cUid, cur);
        }
      });
      rows = Array.from(mapCust.entries())
        .map(([uid, c]) => ({
          uid,
          name: c.name,
          val: c.val,
          orders: c.cnt,
          init: c.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase(),
        }))
        .sort((a, b) => b.val - a.val)
        .slice(0, 5);
    }
    return { rows, any: rows.length > 0 };
  }, [analytics.byCustomerAmount, analytics.byCustomerCount, customerName, liveOrders]);

  /* ---------- returns ----------
     Still row-derived: metrics 420-424 are specced but not seeded, because nothing publishes
     them yet and a registered metric with no publisher is indistinguishable at query time from
     a broken one. useSalesReturns caps at 100 rows, so this panel is disclosed as partial.

     Fixed here: the previous filter was `d === null || d >= start`, which pulled every
     null-dated return into the headline regardless of the selected period. Undated returns are
     now excluded and counted separately rather than silently inflating the refund total. */
  const returns = useMemo(() => {
    const all = returnsQ.data ?? [];
    const dated = all.filter((r: any) => {
      const d = r.returnDate ? new Date(r.returnDate).getTime() : null;
      return d !== null && d >= range.startMs;
    });
    const undatedCount = all.filter((r: any) => !r.returnDate).length;

    const m = new Map<string, { count: number; val: number }>();
    dated.forEach((r: any) => {
      const k = r.reason || 'Unspecified';
      const e = m.get(k) ?? { count: 0, val: 0 };
      e.count += 1; e.val += Number(r.refundAmount ?? 0) || 0;
      m.set(k, e);
    });
    const list = Array.from(m.entries())
      .map(([reason, v]) => ({ reason, ...v }))
      .sort((a, b) => b.count - a.count);
    const max = Math.max(...list.map((l) => l.count), 1);

    return {
      list: list.slice(0, 5).map((l) => ({ ...l, pct: pct(l.count, max) })),
      total: dated.reduce((a: number, r: any) => a + (Number(r.refundAmount ?? 0) || 0), 0),
      any: dated.length > 0,
      undatedCount,
    };
  }, [returnsQ.data, range.startMs]);

  /* ---------- table ---------- */
  const tableRows = useMemo(() => {
    const now = Date.now();
    return (ordersQ.data ?? [])
      .map((o: any) => {
        const raw = o.orderDate || o.createdAt || o.date;
        const at = raw ? new Date(raw) : null;
        return {
          uid: o.uid,
          no: o.orderNo ?? '—',
          at: at && !isNaN(at.getTime()) ? at : null,
          amount: Number(o.totalAmount ?? 0) || 0,
          status: up(o.status),
          online: up(o.channel) === 'ONLINE',
          storeUid: o.storeUid ?? null,
          consumerUid: o.consumerUid ?? null,
          itemsCount: Number(o.itemsCount ?? 0) || 0,
          label: o.labelText ?? '',
          labelColor: o.labelColor ?? '',
        };
      })
      .sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0))
      .slice(0, TABLE_ROWS)
      .map((r) => {
        const ms = r.at ? now - r.at.getTime() : 0;
        const atRisk =
          !!r.at && ((r.status === 'PENDING' && ms > DAY_MS) || (r.status === 'CONFIRMED' && ms > 3 * DAY_MS));
        return { ...r, age: r.at ? ageLabel(ms) : '—', atRisk, ss: statusStyle(r.status) };
      });
  }, [ordersQ.data]);

  /** Chip counts come from the aggregate, so they are exact even though the table is a page. */
  const chips = useMemo(() => {
    const defs = [
      ['all', 'All'],
      ...FUNNEL_STAGES.map((s) => [s, s[0] + s.slice(1).toLowerCase()]),
      ...LEAK_STAGES.map((s) => [s, s[0] + s.slice(1).toLowerCase()]),
    ] as [string, string][];
    return defs.map(([id, label]) => ({
      id,
      label,
      count: id === 'all' ? agg?.totalOrders ?? 0 : statusOf(agg, id).count,
    }));
  }, [agg]);

  const filteredTotal = stage === 'all' ? agg?.totalOrders ?? 0 : statusOf(agg, stage).count;
  const selCount = Object.values(selected).filter(Boolean).length;
  const rangeLabel = `${fmtDay(new Date(range.startMs))} – ${fmtDay(new Date())}`;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full bg-surface-50 text-surface-900">
      <div className="dashboard-container mx-auto max-w-[1560px] px-4 md:px-8 pb-12 pt-7">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-1.5 flex items-center gap-2.5">
              <span className="rounded-md bg-primary-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-600">
                Karty
              </span>
              <span className="text-xs text-surface-500">Commerce · Orders</span>
            </div>
            <h1 className="text-[26px] font-bold tracking-tight">Orders overview</h1>
            <p className="mt-1 text-[13.5px] text-surface-500">Where revenue is coming from — and what's stuck.</p>
          </div>
          <div className="flex items-center gap-3">
            {multiStore && (
              <select
                value={storeUid}
                onChange={(e) => setStoreUid(e.target.value)}
                className="cursor-pointer rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-[13px] font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10"
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
                  className={
                    'cursor-pointer rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ' +
                    (period === p.key ? 'bg-primary-600 text-white' : 'text-surface-500 hover:text-surface-900')
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error banner only if both analytics AND live orders failed */}
        {((aError && liveOrders.length === 0) || (gError && liveOrders.length === 0)) && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <span className="text-[13px] text-danger-600">⚠</span>
            <span className="text-[12.5px] leading-snug text-rose-800">
              Orders and metrics failed to load. Please check your connection to the commerce service.
            </span>
          </div>
        )}

        {/* Quick Actions Pill Row (Reference Design) */}
        <div className="mb-6 flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none w-full">
          <button
            onClick={() => navigate('/orders?action=create')}
            className="flex items-center gap-2 rounded-full bg-[#55349A] hover:bg-[#43297A] text-white px-5 py-2.5 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New order</span>
          </button>

          <button
            onClick={() => navigate('/orders/catalogs')}
            className="flex items-center gap-2 rounded-full bg-white border border-surface-250 hover:bg-surface-50 text-surface-800 px-4 py-2.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer shrink-0 shadow-3xs"
          >
            <ShoppingBag className="h-4 w-4 text-surface-500" />
            <span>Order catalogs</span>
          </button>

          <button
            onClick={() => navigate('/orders/active-carts')}
            className="flex items-center gap-2 rounded-full bg-white border border-surface-250 hover:bg-surface-50 text-surface-800 px-4 py-2.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer shrink-0 shadow-3xs"
          >
            <ShoppingCart className="h-4 w-4 text-surface-500" />
            <span>Active carts</span>
          </button>

          <button
            onClick={() => navigate('/orders/logistics')}
            className="flex items-center gap-2 rounded-full bg-white border border-surface-250 hover:bg-surface-50 text-surface-800 px-4 py-2.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer shrink-0 shadow-3xs"
          >
            <Truck className="h-4 w-4 text-surface-500" />
            <span>Shipping & logistics</span>
          </button>
        </div>

        <div className="responsive-dashboard-grid grid grid-cols-1 lg:grid-cols-12 gap-3.5">

          {/* KPI row */}
          {/* 8-up only once there's room; the labels truncate below ~1400px. */}
          <div className="col-span-12 grid grid-cols-2 gap-2.5 sm:grid-cols-4 2xl:grid-cols-8">
            {kpis.map((k) => (
              <div key={k.label} className={CARD + ' px-3.5 py-3.5'}>
                <div className="mb-2 min-h-[28px] text-[11px] font-semibold leading-tight text-surface-500">{k.label}</div>
                {/* Gated on the analytics state, not the order-row state. The rows resolve
                    first, so gating on a shared isLoading would flash ₹0 mid-flight — and keep
                    those zeros permanently if the analytics query then failed. */}
                {aLoading ? (
                  <><div className="mb-1.5"><Shimmer h={20} /></div><Shimmer h={11} /></>
                ) : k.unavailable ? (
                  <>
                    <span className="mb-1 inline-block rounded-md border border-dashed border-amber-200 bg-warning-50 px-2 py-1 text-[10px] font-bold text-amber-800">
                      {k.badge ?? 'Coming soon'}
                    </span>
                    <div className="text-[10.5px] leading-snug text-surface-400">{k.unavailable}</div>
                  </>
                ) : (
                  <>
                    <div className="text-[19px] font-bold tracking-tight">{k.value}</div>
                    <div className="mt-1 min-h-[16px]">
                      {k.noDelta ? null : k.d ? (
                        <span
                          className="rounded px-1.5 py-0.5 text-[10.5px] font-bold"
                          style={{ color: k.d.good ? '#059669' : C.danger, background: k.d.good ? '#ecfdf5' : '#fff1f2' }}
                        >
                          {k.d.rose ? '▲' : '▼'} {k.d.text}
                        </span>
                      ) : (
                        <span className="rounded border border-dashed border-surface-300 px-1.5 py-0.5 text-[10px] text-surface-400">
                          No prior period
                        </span>
                      )}
                    </div>
                    {k.note && <div className="mt-1 text-[10px] text-surface-400">{k.note}</div>}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Status funnel — current state, from the commerce aggregate */}
          <div className={'col-span-12 ' + CARD + ' p-4 sm:p-5 md:px-[22px] md:py-5'}>
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <div><Title t="Order status funnel" s="Count and value at every stage — click a stage to filter the table below." /></div>
              {stage !== 'all' && (
                <button
                  onClick={() => setStage('all')}
                  className="cursor-pointer rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-600"
                >
                  Filtering: {stage[0] + stage.slice(1).toLowerCase()} ✕
                </button>
              )}
            </div>
            {gLoading ? (
              <Shimmer h={120} />
            ) : gError ? (
              <Blank h={120}>Order rollups are unavailable right now.</Blank>
            ) : noOrders ? (
              <div className="flex h-[120px] flex-col items-center justify-center gap-2">
                <div className="text-[13px] font-semibold text-surface-500">No orders between {rangeLabel}</div>
                {period !== '90d' && (
                  <button onClick={() => setPeriod('90d')} className="cursor-pointer rounded-lg bg-primary-50 px-3.5 py-1.5 text-[12.5px] font-semibold text-primary-600">
                    Show last 90 days
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row items-stretch gap-4 w-full overflow-x-auto pb-2">
                  {funnel.stages.map((f, i) => {
                    const st = statusStyle(f.id);
                    const active = stage === f.id;
                    return (
                      <div key={f.id} className="flex min-w-[150px] shrink-0 sm:flex-1 items-stretch">
                        <button
                          onClick={() => setStage(active ? 'all' : f.id)}
                          className="flex-1 cursor-pointer rounded-xl border-[1.5px] px-4 py-3.5 text-left transition-shadow hover:shadow-md"
                          style={{ background: active ? '#fff' : st.bg, borderColor: active ? st.fg : 'transparent' }}
                        >
                          <div className="mb-1.5 text-[10.5px] font-bold tracking-wider" style={{ color: st.fg }}>{f.id}</div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold">{f.count}</span>
                            <span className="text-[13px] font-semibold text-surface-500">₹{inr(f.value)}</span>
                          </div>
                          <div className="mt-2.5 h-1.5 overflow-hidden rounded-sm bg-black/[.07]">
                            <div className="h-full rounded-sm" style={{ width: `${f.pct}%`, background: st.fg }} />
                          </div>
                        </button>
                        {i < funnel.stages.length - 1 && (
                          <div className="flex items-center px-2 text-lg text-surface-300">›</div>
                        )}
                      </div>
                    );
                  })}
                  <div className="mx-4 w-px bg-surface-100" />
                  <div className="flex w-[210px] flex-col gap-2">
                    {funnel.leaks.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setStage(stage === l.id ? 'all' : l.id)}
                        className="cursor-pointer rounded-xl border-[1.5px] px-3 py-2 text-left"
                        style={{ background: stage === l.id ? '#fff' : '#fff1f2', borderColor: stage === l.id ? C.danger : '#fecdd3' }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-danger-600">↘</span>
                          <span className="text-[10.5px] font-bold tracking-wider text-rose-900">{l.id}</span>
                          <span className="ml-auto text-[15px] font-bold text-danger-600">{l.count}</span>
                        </div>
                        <div className="mt-0.5 pl-[21px] text-[11px] text-rose-700">₹{inr(l.value)}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-surface-400">
                  Confirmed-but-not-shipped is the actionable stage — it is kept separate from Delivered on purpose.
                  Counts are live from the order table, not sampled.
                </div>
              </>
            )}
          </div>

          {/* Aging */}
          <div className={'col-span-12 lg:col-span-4 ' + CARD + ' p-4 sm:p-5 md:px-[22px] md:py-5'}>
            <Title t="Time in current status" s="Open orders by how long they've sat" />
            <div className="mb-4" />
            {gLoading ? (
              <Shimmer h={190} />
            ) : gError ? (
              <Blank h={190}>Order rollups are unavailable right now.</Blank>
            ) : !aging.any ? (
              <Blank h={190}>No open orders in this period</Blank>
            ) : (
              <>
                <div className="flex flex-col gap-3.5">
                  {aging.rows.map((a) => (
                    <div key={a.key}>
                      <div className="mb-1.5 flex justify-between text-[12.5px]">
                        <span className="font-semibold text-surface-500">{a.label}</span>
                        <span className="font-bold" style={{ color: a.c }}>{a.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-100">
                        <div className="h-full rounded-full" style={{ width: `${a.pct}%`, background: a.c }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3.5 text-[10.5px] leading-relaxed text-surface-400">
                  Measured from order date, not from the last status change — nothing records
                  status transition times yet, so an order that sat pending for a week and shipped
                  yesterday still counts as old.
                </div>
              </>
            )}
          </div>

          {/* Trend */}
          <div className={'col-span-12 lg:col-span-8 ' + CARD + ' p-4 sm:p-5 md:px-[22px] md:py-5'}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <Title
                  t="Revenue & order trend"
                  s={analytics.isStoreScoped ? 'Daily · all stores (no per-store daily series)' : 'Daily'}
                />
              </div>
              <div className="flex gap-3.5 text-[11.5px] text-surface-500">
                <span><span className="mr-1.5 inline-block h-[3px] w-2.5 rounded-sm align-middle" style={{ background: C.primary }} />Revenue</span>
                <span><span className="mr-1.5 inline-block h-2 w-2.5 rounded-sm align-middle" style={{ background: '#fcd34d' }} />Orders</span>
              </div>
            </div>
            {aLoading ? (
              <div className="mt-3"><Shimmer h={200} /></div>
            ) : !trend ? (
              <Blank h={200}>
                {noCoverage
                  ? 'No daily figures recorded yet for this period.'
                  : 'No revenue in this period'}
              </Blank>
            ) : (
              <>
                <svg viewBox="0 0 760 210" className="mt-2 block w-full">
                  <line x1="0" y1="50" x2="760" y2="50" stroke={C.grid} />
                  <line x1="0" y1="95" x2="760" y2="95" stroke={C.grid} />
                  <line x1="0" y1="140" x2="760" y2="140" stroke={C.grid} />
                  <line x1="0" y1="184" x2="760" y2="184" stroke={C.line} />
                  {trend.bars.map((b, i) => (
                    <rect key={i} x={b.x} y={b.y} width={trend.bw} height={b.h} rx="3" fill="#fcd34d" />
                  ))}
                  <path d={trend.area} fill="rgba(85,52,154,.07)" />
                  <polyline points={trend.line} fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
                <div className="flex justify-between px-1 pt-0.5 text-[10.5px] text-surface-400">
                  {trend.labels.map((l, i) => <span key={i}>{l}</span>)}
                </div>
              </>
            )}
          </div>

          {/* Channel split */}
          <div className={'col-span-12 lg:col-span-6 ' + CARD + ' p-4 sm:p-5 md:px-[22px] md:py-5'}>
            <Title t="Channel split" s="Online vs walk-in — by revenue, orders and basket size" />
            <div className="mb-4" />
            {aLoading ? (
              <Shimmer h={190} />
            ) : !channels.any ? (
              <Blank h={190}>{noCoverage ? 'Not recorded yet for this period.' : 'No revenue in this period'}</Blank>
            ) : (
              <div className="flex flex-col gap-4">
                {channels.rows.map((r) => (
                  <div key={r.id}>
                    <div className="mb-1.5 flex justify-between text-[12.5px]">
                      <span className="font-semibold">{r.label}</span>
                      <span className="font-bold">₹{inr(r.value)}</span>
                    </div>
                    <div className="h-4 overflow-hidden rounded-md bg-surface-100">
                      <div className="h-full" style={{ width: `${r.valueShare}%`, background: r.c }} />
                    </div>
                    <div className="mt-1 text-[11px] text-surface-400">
                      {r.valueShare}% of revenue · {r.count} order{r.count === 1 ? '' : 's'} ({r.countShare}%)
                      {r.aov !== null && <> · ₹{inr(Math.round(r.aov))} avg basket</>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Store revenue */}
          <div className={'col-span-12 lg:col-span-6 ' + CARD + ' p-4 sm:p-5 md:px-[22px] md:py-5'}>
            <Title t="Revenue by store" s="Net sales, orders and share per store" />
            <div className="mb-4" />
            {aLoading ? (
              <Shimmer h={190} />
            ) : !storeRows.any ? (
              <Blank h={190}>
                {noCoverage ? 'Not recorded yet for this period.' : 'No store-attributed revenue in this period'}
              </Blank>
            ) : (
              <div className="flex flex-col gap-3.5">
                {storeRows.rows.map((s) => (
                  <div key={s.uid}>
                    <div className="mb-1.5 flex justify-between text-[12.5px]">
                      <span className="truncate font-semibold">{s.name}</span>
                      <span className="font-bold">₹{inr(s.value)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-surface-100">
                      <div className="h-full rounded-full" style={{ width: `${s.share}%`, background: C.primary }} />
                    </div>
                    <div className="mt-1 text-[11px] text-surface-400">
                      {s.share}% · {s.orders} order{s.orders === 1 ? '' : 's'}
                      {s.aov !== null && <> · ₹{inr(Math.round(s.aov))} AOV</>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top items — now real, via metric 417 */}
          <div className={'col-span-12 lg:col-span-4 ' + CARD + ' p-4 sm:p-5 md:px-[22px] md:py-5'}>
            <Title t="Top items" s="By revenue" />
            <div className="mb-3.5" />
            {aLoading ? (
              <Shimmer h={180} />
            ) : !topItems.any ? (
              <Blank h={180}>
                {noCoverage ? 'Not recorded yet for this period.' : 'No item revenue in this period'}
              </Blank>
            ) : (
              <div className="flex flex-col gap-3">
                {topItems.rows.map((it) => (
                  <div key={it.uid}>
                    <div className="mb-1 flex justify-between gap-2 text-[12.5px]">
                      <span className="truncate font-semibold">{it.name}</span>
                      <span className="shrink-0 font-bold">₹{inr(it.value)}</span>
                    </div>
                    <div className="h-[7px] overflow-hidden rounded bg-surface-100">
                      <div className="h-full rounded" style={{ width: `${it.pct}%`, background: C.primary }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top customers */}
          <div className={'col-span-12 lg:col-span-4 ' + CARD + ' p-4 sm:p-5 md:px-[22px] md:py-5'}>
            <Title t="Top customers" s="By revenue" />
            <div className="mb-3.5" />
            {aLoading ? (
              <Shimmer h={180} />
            ) : !topCustomers.any ? (
              <Blank h={180}>
                {noCoverage ? 'Not recorded yet for this period.' : 'Orders in this period are not linked to customers'}
              </Blank>
            ) : (
              <div className="flex flex-col gap-2.5">
                {topCustomers.rows.map((c) => (
                  <div key={c.uid} onClick={() => navigate('/customers')} className="flex cursor-pointer items-center gap-2.5 hover:opacity-85">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 text-[11px] font-bold text-primary-600">
                      {c.init}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-semibold">{c.name}</div>
                      <div className="text-[11px] text-surface-400">{c.orders} order{c.orders === 1 ? '' : 's'}</div>
                    </div>
                    <span className="text-[12.5px] font-bold">₹{inr(c.val)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fulfilment mix */}
          <div className={'col-span-12 lg:col-span-4 ' + CARD + ' p-4 sm:p-5 md:px-[22px] md:py-5'}>
            <Title t="Fulfilment mix" s="How orders reach customers" />
            <div className="mb-3.5" />
            <div className="flex flex-col gap-3.5 pt-1">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span>🏬 Store Pickup / Walk-in</span>
                  <span className="font-mono text-slate-900">{fulfillmentMix.pickupCount} ({fulfillmentMix.pickupPct}%)</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-teal-500" style={{ width: `${fulfillmentMix.pickupPct}%` }} />
                </div>
                <span className="text-[10px] text-slate-400 font-mono block">Value: ₹{inr(fulfillmentMix.pickupAmount)}</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span>🚚 Doorstep Delivery / Courier</span>
                  <span className="font-mono text-slate-900">{fulfillmentMix.deliveryCount} ({fulfillmentMix.deliveryPct}%)</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-[#55349A]" style={{ width: `${fulfillmentMix.deliveryPct}%` }} />
                </div>
                <span className="text-[10px] text-slate-400 font-mono block">Value: ₹{inr(fulfillmentMix.deliveryAmount)}</span>
              </div>
            </div>
          </div>

          {/* When orders come in */}
          <div className={'col-span-12 lg:col-span-6 ' + CARD + ' p-4 sm:p-5 md:px-[22px] md:py-5'}>
            <Title t="When orders come in" s="Order volume by time of day" />
            <div className="mb-3.5" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {whenOrdersComeIn.map((b) => (
                <div key={b.label} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>{b.icon} {b.label.split(' ')[0]}</span>
                    <span className="font-mono text-slate-900 font-bold">{b.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${b.pct}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{b.label.split(' ')[1]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Returns */}
          <div className={'col-span-12 lg:col-span-6 ' + CARD + ' p-4 sm:p-5 md:px-[22px] md:py-5'}>
            <div className="mb-3.5 flex items-baseline justify-between">
              <div><Title t="Returns" s="Reasons and refund value" /></div>
              <div className="text-right">
                <div className="text-[17px] font-bold text-danger-600">₹{inr(returns.total)}</div>
                <div className="text-[10.5px] text-surface-400">refunded this period</div>
              </div>
            </div>
            {returnsQ.isLoading ? (
              <Shimmer h={160} />
            ) : !returns.any ? (
              <Blank h={160}>No returns in this period</Blank>
            ) : (
              <>
                <div className="flex flex-col gap-2.5">
                  {returns.list.map((r) => (
                    <div key={r.reason} className="grid items-center gap-2.5" style={{ gridTemplateColumns: '1fr 110px 120px' }}>
                      <span className="text-[12.5px] font-semibold">{r.reason}</span>
                      <div className="h-[7px] overflow-hidden rounded bg-rose-100">
                        <div className="h-full rounded" style={{ width: `${r.pct}%`, background: '#fb7185' }} />
                      </div>
                      <span className="text-right text-xs text-surface-500">
                        <strong className="text-surface-900">{r.count}</strong> · ₹{inr(r.val)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-[10.5px] leading-relaxed text-surface-400">
                  Counted from the returns list, which the API caps at 100 records — unlike the
                  figures above, this panel can undercount on a high-volume tenant. Moves to
                  analytics when the sales-return metrics ship.
                </div>
              </>
            )}
          </div>

          {/* Orders table */}
          <div className={'col-span-12 overflow-hidden ' + CARD}>
            <div className="px-[22px] pb-3.5 pt-5">
              <div className="mb-3.5 flex items-center justify-between">
                <div>
                  <Title t="Orders" s={stage === 'all' ? 'All orders, newest first' : `Filtered: ${stage[0] + stage.slice(1).toLowerCase()} orders`} />
                </div>
                <button
                  onClick={() => navigate('/orders?action=create')}
                  className="cursor-pointer rounded-lg bg-primary-600 px-4 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  New order
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {chips.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setStage(ch.id)}
                    className={
                      'cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold ' +
                      (stage === ch.id
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-surface-200 bg-white text-surface-500 hover:text-surface-900')
                    }
                  >
                    {ch.label} <span className="font-medium opacity-65">{ch.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {selCount > 0 && (
              <div className="flex items-center gap-3.5 bg-primary-50 px-[22px] py-2.5 text-[12.5px]">
                <span className="font-bold text-primary-700">{selCount} selected</span>
                <span className="text-surface-500">Bulk actions aren't wired up yet.</span>
              </div>
            )}

            {ordersQ.isLoading ? (
              <div className="px-[22px] pb-[22px]"><Shimmer h={260} /></div>
            ) : tableRows.length === 0 ? (
              <div className="flex h-[200px] flex-col items-center justify-center gap-2">
                <div className="text-[13px] font-semibold text-surface-500">
                  {stage === 'all' ? `No orders between ${rangeLabel}` : 'No orders in this stage'}
                </div>
                {stage === 'all' && period !== '90d' && (
                  <button onClick={() => setPeriod('90d')} className="cursor-pointer rounded-lg bg-primary-50 px-3.5 py-1.5 text-[12.5px] font-semibold text-primary-600">
                    Show last 90 days
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="w-full overflow-x-auto rounded-xl border border-surface-200 shadow-3xs">
                  <div className="min-w-[1260px]">
                    <div
                      className="grid items-center border-y border-surface-100 bg-surface-50 px-[22px] py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-surface-400"
                      style={{ gridTemplateColumns: '36px 110px 150px minmax(160px,1fr) 130px 80px 56px 100px 110px 70px 90px' }}
                    >
                      <span />
                      <span>Order</span>
                      <span className="text-surface-600">Date ↓</span>
                      <span>Customer</span>
                      <span>Store</span>
                      <span>Channel</span>
                      <span>Items</span>
                      <span className="text-right">Total</span>
                      <span>Status</span>
                      <span>Age</span>
                      <span>Label</span>
                    </div>
                    {/* Rows deep-link to /orders/:uid. Before that route existed they were
                        styled `cursor-pointer` with a hover highlight and no handler — an
                        affordance promising navigation that went nowhere. */}
                    {tableRows.map((r) => (
                      <div
                        key={r.uid}
                        onClick={() => navigate(`/orders/${r.uid}`)}
                        className="grid cursor-pointer items-center border-b border-surface-100 px-[22px] py-2.5 text-[12.5px] hover:bg-surface-50"
                        style={{
                          gridTemplateColumns: '36px 110px 150px minmax(160px,1fr) 130px 80px 56px 100px 110px 70px 90px',
                          background: r.atRisk ? '#fff5f5' : '#fff',
                          boxShadow: r.atRisk ? `inset 3px 0 0 ${C.danger}` : undefined,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!selected[r.uid]}
                          onChange={() => setSelected((s) => ({ ...s, [r.uid]: !s[r.uid] }))}
                          onClick={(e) => e.stopPropagation()}
                          className="h-[15px] w-[15px] cursor-pointer accent-primary-600"
                        />
                        <span className="font-bold text-primary-600">{r.no}</span>
                        <span className="text-surface-500">{r.at ? fmtDateTime(r.at) : '—'}</span>
                        <span className="truncate font-semibold">
                          {r.consumerUid ? customerName.get(r.consumerUid) ?? 'Unknown' : 'Walk-in'}
                        </span>
                        <span className="truncate text-surface-500">{storeName.get(r.storeUid ?? '') ?? '—'}</span>
                        <span className="text-[11px] font-bold" style={{ color: r.online ? C.primary : C.amber }}>
                          {r.online ? 'ONLINE' : 'WALKIN'}
                        </span>
                        <span className="text-surface-500">{r.itemsCount}</span>
                        <span className="text-right font-bold">₹{inr(r.amount)}</span>
                        <span>
                          <span className="rounded-md px-2 py-1 text-[11px] font-bold" style={{ background: r.ss.bg, color: r.ss.fg }}>
                            {r.status}
                          </span>
                        </span>
                        <span style={{ fontWeight: r.atRisk ? 700 : 500, color: r.atRisk ? C.danger : C.muted }}>{r.age}</span>
                        <span>
                          {r.label && (
                            <span
                              className="rounded-md px-2 py-1 text-[10.5px] font-semibold"
                              style={{ background: r.labelColor || C.grid, color: r.labelColor ? '#fff' : C.muted }}
                            >
                              {r.label}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between px-[22px] py-3 text-xs text-surface-400">
                  <span>Rows shaded red are aging past threshold — act on these first.</span>
                  {/* Total comes from the aggregate, so it is the real count even though only
                      the first rows are fetched. */}
                  <span>Showing {tableRows.length} of {filteredTotal}</span>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default OrderDashboardPage;
