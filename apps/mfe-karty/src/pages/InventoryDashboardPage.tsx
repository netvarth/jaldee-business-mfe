import { Plus, Boxes, RefreshCw, SlidersHorizontal } from 'lucide-react';
/**
 * Inventory overview.
 *
 * Layout follows the "Karty Inventory Overview" Claude Design spec; colours use the app's
 * standard token scale (tailwind.config.ts), not the design's green/copper palette.
 *
 * Level panels (valuation, stock health, reorder, dead stock) come from a bounded SQL
 * aggregate (`/inventory/aggregate`) computed over the whole stock table. Flow panels
 * (movement chart, adjustments) come from a separate bounded aggregate over the whole
 * stock ledger (`/inventory/movement`). Neither reads the raw ledger client-side any more —
 * see `useInventoryAggregate` / `useInventoryMovement` for why.
 *
 * Route: /karty/inventory/dashboard (see App.tsx). Sidebar: "Inventory → Dashboard".
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { inr, compactInr, up, pct as pctOf } from '../lib/format';
import { useInventoryStock } from '../services/useStock';
import { useItems } from '../services/useItems';
import { useStores } from '../services/useStores';
import { useStockTransfers } from '../services/useStockTransfers';
import { usePurchases } from '../services/usePurchases';
import { useCommerceApi } from '../services/useCommerceApi';
import { useInventoryAggregate } from '../services/useInventoryAggregate';
import { useInventoryMovement } from '../services/useInventoryMovement';
import { PURCHASE_STATUS, TRANSFER_IN_FLIGHT_STATUSES } from '../services/commerceEnums';

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
  success: '#059669',
};

const CARD = 'bg-white border border-surface-200 rounded-2xl shadow-sm';
const DAY_MS = 86400000;
/** Mirrors MAX_PAGE_SIZE in the commerce service — extra uids are dropped server-side. */
const BATCH_UID_LIMIT = 200;
const DONUT_COLORS =['#55349A', '#f59e0b', '#10b981', '#8b5cf6', '#94a3b8'];

/** Ledger sourceDoc → movement-chart series colour + label. */
const SOURCE_META: Record<string, { label: string; c: string }> = {
  PURCHASE: { label: 'Purchases', c: '#55349A' },
  TRANSFER: { label: 'Transfers', c: '#8b5cf6' },
  SALES_RETURN: { label: 'Cust. returns', c: '#c4b5fd' },
  OPENING: { label: 'Opening', c: '#a78bfa' },
  ORDER: { label: 'Orders out', c: '#f59e0b' },
  PURCHASE_RETURN: { label: 'Suppl. returns', c: '#fcd34d' },
  ADJUSTMENT: { label: 'Adjustments', c: '#fb7185' },
};

const fmtDay = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

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
  <div className="flex items-center justify-center px-4 text-center text-[13px] leading-relaxed text-surface-400" style={{ height: h }}>
    {children}
  </div>
);

export function InventoryDashboardPage() {
  const navigate = useNavigate();
  const [storeUid, setStoreUid] = useState('all');
  const [deadWin, setDeadWin] = useState<60 | 90>(60);

  const stockQ = useInventoryStock();
  const itemsQ = useItems();
  const storesQ = useStores();
  const transfersQ = useStockTransfers();
  const purchasesQ = usePurchases();

  /* ---------- level figures, from a bounded server-side aggregate ----------
     Valuation, stock health, reorder pressure and dead stock were previously computed here
     from `stock`, `items` and `ledger` — each capped at 100 rows with no pagination. On any
     tenant with real volume, 100 ledger rows is a few days, so the 30-day velocity,
     days-of-cover, reorder ranking and 60/90-day dead-stock detection all described that
     slice. Dead stock failed worst: an item whose last sale fell outside the window was
     reported "never sold" and counted as idle capital.

     These are *levels*, so they cannot come from the analytics service either — analytics_tbl
     sums the buckets a window covers, and summing daily balance snapshots accumulates rather
     than replaces. Hence a purpose-built GROUP BY endpoint. See the contract doc §2, §5.4.

     The capped list hooks above are still fetched: the movement chart, adjustments, transfers
     and the purchase pipeline are flows that need metrics 430-436 published before they can
     move, and the item/store name lookups still come from the lists. */
  const aggQ = useInventoryAggregate({
    storeUid,
    velocityWindowDays: 30,
    deadStockThresholdDays: deadWin,
  });
  const agg = aggQ.data;

  /* ---------- flow figures (movement chart + adjustments), from a bounded server-side aggregate
     Previously computed here from `useStockLedger()`, capped at 100 rows with no date or page
     parameter. On any tenant with real movement volume that is a few days of history, so the
     12-week movement chart drew mostly-empty weeks that read as quiet, and the 30-day
     adjustments panel silently missed anything older than page one — with no banner disclosing
     either. Adjustments are now priced at cost server-side, not retail — the old client-side
     version priced shrinkage at retail under a "value lost" heading, overstating loss by the
     margin. See dashboards review C1/C3. */
  const movementQ = useInventoryMovement({ storeUid, weeks: 12, adjustmentWindowDays: 30 });
  const movementLoading = movementQ.isLoading;
  const movementError = movementQ.isError;
  const movementUnavailable = movementError || !movementQ.data;

  /* Level panels wait on the aggregate; movement panels wait on the list hooks. Gating the
     whole page on the lists alone would render ₹0 valuations while the aggregate is still in
     flight, because the lists resolve first. */
  const isLoading = stockQ.isLoading || itemsQ.isLoading || storesQ.isLoading;
  const aggLoading = aggQ.isLoading;
  const aggError = aggQ.isError;

  /**
   * The level panels have nothing to show — the request failed, or resolved to nothing.
   *
   * Every level panel must check this BEFORE its empty state. Without it, a failed request
   * falls through to copy like "Nothing idle — every stocked item has sold recently" or
   * "Item prices aren't set", which are affirmative claims about data that was never loaded.
   * Empty states describe the tenant; this describes the request.
   */
  const levelUnavailable = aggError || !agg;
  const stores = storesQ.data ?? [];
  const items = itemsQ.data ?? [];
  const multiStore = stores.length > 1;

  /* ---------- lookups: the stock DTO's itemName/itemSku/storeName come back null ---------- */
  type ItemMeta = { name: string; sku: string; category: string; price: number; archived?: boolean };

  const priceOf = (it: any) =>
    Math.max(0, ...(it.variants ?? []).map((v: any) => Number(v.sellingPrice) || Number(v.mrp) || 0));

  const liveItemMeta = useMemo(() => {
    const m = new Map<string, ItemMeta>();
    (items as any[]).forEach((it) =>
      m.set(it.uid, {
        name: it.name ?? 'Unnamed item',
        sku: it.sku ?? '—',
        category: it.categoryName || 'Uncategorised',
        price: priceOf(it),
      })
    );
    return m;
  }, [items]);

  const liveStoreMeta = useMemo(() => {
    const m = new Map<string, string>();
    (stores as any[]).forEach((s) => m.set(s.id ?? s.uid, s.name));
    return m;
  }, [stores]);

  /**
   * Stock can outlive the item/store it belongs to: ARCHIVED records are excluded from the
   * list endpoints but still hold quantity. Fetch just the unresolved uids so those rows
   * show a real name (and an "Archived" badge) instead of "Unknown item".
   *
   * This used to issue one GET per uid — up to 100 requests, serialised ~17 deep by the
   * browser's per-host connection limit, plus 100 DB round trips. Now it's two batch calls.
   */
  const api = useCommerceApi();
  const missing = useMemo(() => {
    const itemUids = new Set<string>();
    const storeUids = new Set<string>();
    ((stockQ.data ?? []) as any[]).forEach((s) => {
      if (s.itemUid && !liveItemMeta.has(s.itemUid)) itemUids.add(s.itemUid);
      if (s.storeUid && !liveStoreMeta.has(s.storeUid)) storeUids.add(s.storeUid);
    });
    return { itemUids: Array.from(itemUids).sort(), storeUids: Array.from(storeUids).sort() };
  }, [stockQ.data, liveItemMeta, liveStoreMeta]);

  const archivedQ = useQuery({
    // Join the uid arrays: react-query hashes the key, and stable strings beat nested arrays.
    queryKey: ['archived-refs', missing.itemUids.join(','), missing.storeUids.join(',')],
    enabled: missing.itemUids.length > 0 || missing.storeUids.length > 0,
    // Archived reference data is immutable in practice — don't refetch it on every remount.
    staleTime: 5 * 60_000,
    queryFn: async () => {
      // Server caps each batch at 200 uids and omits unknown ones rather than erroring.
      const batch = async (path: string, uids: string[]) => {
        if (uids.length === 0) return [];
        const qs = uids.slice(0, BATCH_UID_LIMIT).map((u) => `uids=${encodeURIComponent(u)}`).join('&');
        const data = await api.get<any>(`${path}?${qs}`).catch(() => null);
        return Array.isArray(data) ? data : [];
      };
      const [items, stores] = await Promise.all([
        batch('/v1/api/tenant/items/batch', missing.itemUids),
        batch('/v1/api/tenant/stores/batch', missing.storeUids),
      ]);
      return { items, stores };
    },
  });

  const itemMeta = useMemo(() => {
    const m = new Map<string, ItemMeta>(liveItemMeta);
    (archivedQ.data?.items ?? []).forEach((it: any) =>
      m.set(it.uid, {
        name: it.name ?? 'Unnamed item',
        sku: it.sku ?? '—',
        category: it.categoryName || 'Uncategorised',
        price: priceOf(it),
        archived: up(it.status) === 'ARCHIVED',
      })
    );
    return m;
  }, [liveItemMeta, archivedQ.data]);

  const storeMeta = useMemo(() => {
    const m = new Map<string, string>(liveStoreMeta);
    (archivedQ.data?.stores ?? []).forEach((s: any) => m.set(s.uid, s.name));
    return m;
  }, [liveStoreMeta, archivedQ.data]);

  /** Every variant price is 0 on a fresh tenant — a ₹0 valuation would read as fact. */
  const hasPrices = useMemo(() => Array.from(itemMeta.values()).some((i) => i.price > 0), [itemMeta]);

  /* Stock rows are no longer projected here — valuation, health, reorder and dead stock
     all come from the aggregate. stockQ is still fetched solely to discover archived
     item/store uids for the name lookup above. */

  /** Units sold per day over the last 30d, per item — ORDER-sourced outflows only. */

  /* velocity + lastSold removed: both were computed from the 100-row ledger page and
     are now derived server-side over the full ledger (reorderCandidates / deadStock). */

  /* ---------- KPIs — from the aggregate endpoint ----------
     Every figure here is a level and is now computed in SQL over the whole table rather than
     over a 100-row page. `stock` is still used for the movement panels below. */
  const stockouts = agg?.stockoutItems ?? 0;
  const lowStock = agg?.lowStockItems ?? 0;

  /**
   * Tenant-wide days of cover — read straight off the aggregate, not summed from
   * `reorderCandidates` here.
   *
   * That sum was the bug (dashboards review C2): `reorderCandidates` is hard-capped server-side
   * to the 50 most urgent items, so a client-side sum over it computed cover for the worst 50
   * items and reported it as the tenant's number — biased low by construction on any tenant
   * with more than 50 stocked items, which is exactly the tenant this figure most needs to be
   * right for. `agg.daysOfCover` is the same available÷velocity ratio computed server-side over
   * every item, unbounded. Null still means "nothing sold in the window", not zero or infinite.
   */
  const daysOfCover = agg?.daysOfCover ?? null;

  /** `badge` distinguishes a fixable data gap ("No data") from a missing capability
      ("Coming soon"). Different causes, different user actions, so different wording. */
  type Kpi = { label: string; value?: string; sub?: string; unavailable?: string; badge?: string; danger?: boolean; warn?: boolean };

  /* Coverage caveat appended to a valuation that is real but incomplete. Presenting a partial
     total as a finished one is the failure this dashboard is being moved away from. */
  const retailSub = agg
    ? agg.unpricedRows > 0
      ? `${agg.stockRows} rows · ${agg.unpricedRows} unpriced`
      : `${agg.stockRows} stock rows`
    : undefined;

  const kpis: Kpi[] = [
    !agg || agg.retailValue <= 0
      ? { label: 'Valuation · at retail', unavailable: 'Item prices are not set' }
      : { label: 'Valuation · at retail', value: '₹' + inr(agg.retailValue), sub: retailSub },

    // Cost is genuinely available now, but only over rows that have been costed. Three states:
    // no cost anywhere, partial cost (say so), complete.
    !agg || aggQ.costUnavailable
      ? { label: 'Valuation · at cost', unavailable: 'No stock has been costed yet', badge: 'No data' }
      : {
          label: 'Valuation · at cost',
          value: '₹' + inr(agg.costValue),
          sub: aggQ.costIncomplete
            ? `at least — ${agg.uncostedRows} of ${agg.stockRows} rows uncosted`
            : `${agg.stockRows} stock rows`,
          warn: aggQ.costIncomplete,
        },

    // Items and variants are distinct counts from SQL. The old version used items.length from
    // a 100-capped list and called it SKUs; variants are the actual SKUs.
    agg
      ? {
          label: 'Items / SKUs',
          value: inr(agg.distinctItems),
          sub: `${inr(agg.distinctVariants)} variants stocked`,
        }
      : { label: 'Items / SKUs', unavailable: 'Not available' },

    !agg
      ? { label: 'Stockouts', unavailable: 'Not loaded' }
      : {
          label: 'Stockouts',
          value: String(stockouts),
          sub: stockouts > 0 ? 'items at zero — act now' : 'nothing out of stock',
          danger: stockouts > 0,
        },
    !agg
      ? { label: 'Low stock', unavailable: 'Not loaded' }
      : { label: 'Low stock', value: String(lowStock), sub: 'at or below reorder point', warn: lowStock > 0 },
    !agg
      ? { label: 'Stock on hold', unavailable: 'Not loaded' }
      : { label: 'Stock on hold', value: `${inr(agg.totalOnHold)} u`, sub: 'reserved for open orders' },

    // Turnover needs COGS over average inventory at cost. Cost now exists, but the cost of
    // goods actually sold is not recorded per movement, so this stays genuinely underivable
    // rather than being approximated at retail.
    { label: 'Inventory turnover', unavailable: 'Needs cost of goods sold per movement' },

    !agg
      ? { label: 'Days of cover', unavailable: 'Not loaded' }
      : daysOfCover === null
      ? { label: 'Days of cover', unavailable: 'No sales in the velocity window' }
      : {
          label: 'Days of cover',
          value: `${Math.round(daysOfCover)} d`,
          sub: `at ${agg?.velocityWindowDays ?? 30}d velocity`,
        },
  ];

  /* ---------- reorder table ----------
     Ranked server-side by urgency over the full ledger. The row shape is kept compatible with
     the existing table markup so only the source changes. */
  const reorder = useMemo(() => {
    const rows = (agg?.reorderCandidates ?? []).map((r) => {
      const meta = itemMeta.get(r.itemUid);
      const urgency =
        r.available <= 0
          ? 'out'
          : r.daysOfCover === null
            ? 'unknown'
            : r.daysOfCover < 7
              ? 'critical'
              : r.daysOfCover < 14
                ? 'low'
                : 'healthy';
      return {
        itemUid: r.itemUid,
        // The aggregate returns the item's real name and sku; fall back to the list lookup
        // only for archived refs the join could not resolve.
        name: r.itemName || meta?.name || 'Unknown item',
        sku: r.sku || meta?.sku || '',
        inHand: r.inHand,
        onHold: r.onHold,
        avail: r.available,
        price: meta?.price ?? 0,
        velocity: r.dailyVelocity,
        cover: r.daysOfCover,
        reorderPoint: r.reorderPoint,
        vendorUid: r.preferredVendorUid,
        urgency,
      };
    });
    const count = (u: string) => rows.filter((r) => r.urgency === u).length;
    return {
      rows,
      chips: [
        { label: 'Out', count: count('out'), c: C.danger, bg: '#fff1f2' },
        { label: 'Critical', count: count('critical'), c: C.danger, bg: '#fff1f2' },
        { label: 'Low', count: count('low'), c: '#b45309', bg: '#fffbeb' },
        { label: 'Healthy', count: count('healthy'), c: C.success, bg: '#ecfdf5' },
        // Without this, items with no sales history vanish from the counts entirely and every
        // chip reads 0 while the table clearly has rows.
        { label: 'No sales data', count: count('unknown'), c: C.muted, bg: C.grid },
      ].filter((c) => c.count > 0 || c.label !== 'No sales data'),
    };
  }, [agg, itemMeta]);

  const coverStyle = (r: { avail: number; cover: number | null }) => {
    if (r.avail <= 0) return { label: 'Out of stock', bg: '#fff1f2', fg: C.danger };
    if (r.cover === null) return { label: 'No recent sales', bg: C.grid, fg: C.muted };
    if (r.cover < 7) return { label: `${Math.round(r.cover)} days`, bg: '#fff1f2', fg: C.danger };
    if (r.cover < 14) return { label: `${Math.round(r.cover)} days`, bg: '#fffbeb', fg: '#b45309' };
    return { label: `${Math.round(r.cover)} days`, bg: '#ecfdf5', fg: C.success };
  };

  /* ---------- valuation by category ---------- */
  const totalRetail = agg?.retailValue ?? 0;

  const catValuation = useMemo(() => {
    const list = agg?.byCategory ?? [];
    if (list.length === 0) return [];
    const top = list.slice(0, 5);
    // Roll the tail into one "Other" row so the bars visibly account for the whole valuation,
    // matching the by-store panel below. Without it the top-5 shares silently fail to sum to
    // 100% on a tenant with more than five categories.
    const restVal = list.slice(5).reduce((a, l) => a + l.retailValue, 0);
    const restSkus = list.slice(5).reduce((a, l) => a + l.itemCount, 0);
    const rows = restVal > 0
      ? [...top, { name: `Other (${list.length - 5} categories)`, retailValue: restVal, itemCount: restSkus }]
      : top;
    const max = Math.max(...rows.map((l) => l.retailValue), 1);
    return rows.map((l) => ({
      name: l.name,
      val: l.retailValue,
      skus: l.itemCount,
      pct: pctOf(l.retailValue, max),
      share: pctOf(l.retailValue, totalRetail),
    }));
  }, [agg, totalRetail]);

  /* ---------- distribution by store ----------
     `name` on the by-store breakdown is the store UID — the publisher deliberately does not
     emit store names, so they are resolved here from the store list the page already loads.

     IMPORTANT: this panel is ALWAYS tenant-wide. `byStore` is not narrowed by the store filter
     (one bar is not a breakdown), whereas `agg.retailValue` IS narrowed. Dividing one by the
     other would give shares over 100% the moment a store is selected — three equal stores
     filtered to one would each read ~300% and the donut would wrap around itself. The
     denominator here is therefore the sum of the buckets themselves, which is self-consistent
     by construction and sums to 100% by definition. */
  const storeDist = useMemo(() => {
    const all = agg?.byStore ?? [];
    if (all.length === 0) return { donut: [] as any[], table: [] as any[], scopeNote: false };

    const storeTotal = all.reduce((a, b) => a + b.retailValue, 0);
    const top = all.slice(0, 5).map((l) => ({
      uid: l.name,
      // Every byStore row has a store (the SQL excludes null store_uid), so a miss here means
      // the name lookup failed — not that the stock is unassigned.
      name: storeMeta.get(l.name) ?? 'Unknown store',
      val: l.retailValue,
      skus: l.itemCount,
    }));

    // Anything past the top 5, so the parts visibly sum to the whole.
    const restVal = all.slice(5).reduce((a, b) => a + b.retailValue, 0);
    const list =
      restVal > 0
        ? [...top, { uid: '__other__', name: `Other (${all.length - 5} stores)`, val: restVal, skus: 0 }]
        : top;

    const R = 45, CIRC = 2 * Math.PI * R;
    let cum = 0;
    const donut = list.map((l, i) => {
      const share = pctOf(l.val, storeTotal);
      const seg = (share / 100) * CIRC;
      const off = CIRC * 0.25 - cum;
      cum += seg;
      return {
        uid: l.uid,
        label: l.name, pct: share, c: DONUT_COLORS[i % DONUT_COLORS.length], val: compactInr(l.val),
        dash: `${Math.max(seg - 2, 0).toFixed(1)} ${(CIRC - seg + 2).toFixed(1)}`, off: off.toFixed(1),
      };
    });
    return {
      donut,
      table: list.map((l) => ({ ...l, share: pctOf(l.val, storeTotal) })),
      total: storeTotal,
      // True when the page is store-filtered but this panel is not — the subtitle says so.
      scopeNote: storeUid !== 'all',
    };
  }, [agg, storeMeta, storeUid]);

  /* ---------- stock health ----------
     Counts distinct ITEMS, each rolled up to its worst status across stores, so the three
     segments partition the set and sum to the total. The previous version counted stock rows,
     which placed an item that was out in one store and healthy in another into two buckets at
     once — the bars did not add up.

     Only the category split is available: rolling an item to its worst status is what makes
     the partition sound, and that roll-up is meaningless per store. The store toggle now
     scopes the whole page instead. */
  const healthRows = useMemo(
    () =>
      (agg?.healthByCategory ?? []).map((h) => ({
        name: h.name,
        total: h.itemCount,
        inPct: pctOf(h.inStockCount, h.itemCount),
        lowPct: pctOf(h.lowStockCount, h.itemCount),
        outPct: pctOf(h.outOfStockCount, h.itemCount),
      })),
    [agg],
  );

  /* ---------- stock movement: N weeks, diverging stacked ----------
     Rows now come pre-aggregated at (week, source) grain from the server, over the whole
     ledger — not reconstructed from raw ledger rows fetched here. `WEEKS` is echoed back by
     the endpoint rather than hardcoded, so the bucket grid always matches what was actually
     requested. */
  const movement = useMemo(() => {
    const WEEKS = movementQ.data?.weeks || 12;
    const now = Date.now(), origin = now - WEEKS * 7 * DAY_MS;
    const buckets = Array.from({ length: WEEKS }, () => ({
      in: {} as Record<string, number>,
      out: {} as Record<string, number>,
    }));
    (movementQ.data?.weeklyMovement ?? []).forEach((r) => {
      const at = Date.parse(r.weekStart);
      if (isNaN(at)) return;
      const i = Math.floor((at - origin) / (7 * DAY_MS));
      if (i < 0 || i >= WEEKS) return;
      const src = SOURCE_META[r.sourceDoc] ? r.sourceDoc : 'ADJUSTMENT';
      if (r.inUnits > 0) buckets[i].in[src] = (buckets[i].in[src] ?? 0) + r.inUnits;
      if (r.outUnits > 0) buckets[i].out[src] = (buckets[i].out[src] ?? 0) + r.outUnits;
    });
    const sum = (o: Record<string, number>) => Object.values(o).reduce((a, v) => a + v, 0);
    const maxSide = Math.max(...buckets.map((b) => sum(b.in)), ...buckets.map((b) => sum(b.out)), 1);
    const gap = (760 - 36) / WEEKS;
    const segs: { x: number; y: number; h: number; c: string }[] = [];
    buckets.forEach((b, i) => {
      const x = 18 + i * gap;
      let yUp = 110;
      Object.entries(b.in).forEach(([src, v]) => {
        const h = (v / maxSide) * 95;
        yUp -= h;
        segs.push({ x, y: yUp, h: Math.max(h - 1.5, 0.5), c: SOURCE_META[src].c });
      });
      let yDn = 110;
      Object.entries(b.out).forEach(([src, v]) => {
        const h = (v / maxSide) * 95;
        segs.push({ x, y: yDn + 1.5, h: Math.max(h - 1.5, 0.5), c: SOURCE_META[src].c });
        yDn += h;
      });
    });
    const used = new Set<string>();
    buckets.forEach((b) => {
      Object.keys(b.in).forEach((k) => used.add(k));
      Object.keys(b.out).forEach((k) => used.add(k));
    });
    return {
      segs,
      bw: Math.min(40, gap - 6),
      any: segs.length > 0,
      legend: Array.from(used).map((k) => ({ key: k, ...SOURCE_META[k] })),
      labels: [0, 0.25, 0.5, 0.75, 1].map((f) => fmtDay(new Date(origin + f * WEEKS * 7 * DAY_MS))),
    };
  }, [movementQ.data]);

  /* ---------- adjustments (30d) ----------
     Grouped and priced server-side, at cost — the previous client-side version priced
     shrinkage at retail under a "value lost" heading, which overstates loss by the margin
     (dashboards review C3). A bucket's `uncosted` flag means its value is a floor, not a
     total; the header total is marked "≥" the moment any bucket is uncosted. */
  const adjustments = useMemo(() => {
    const rows = movementQ.data?.adjustments ?? [];
    const max = Math.max(...rows.map((r) => r.units), 1);
    return {
      list: rows.slice(0, 4).map((r) => ({
        reason: r.reason,
        units: r.units,
        val: r.costValue,
        uncosted: r.uncostedRows > 0,
        pct: pctOf(r.units, max),
      })),
      total: rows.reduce((a, r) => a + r.costValue, 0),
      partial: rows.some((r) => r.uncostedRows > 0),
    };
  }, [movementQ.data]);

  /* ---------- dead & slow stock ----------
     This was the worst casualty of the capped ledger. `lastSold` was built from 100 ledger
     rows, so any item whose last sale fell outside that page looked like it had never sold —
     healthy fast-movers were reported as dead capital, and the total was junk.

     The aggregate resolves "never sold" against the whole ledger, and keys off CONSUME rather
     than a negative in_hand delta, so a reserve-then-cancel no longer counts as a sale and no
     longer rescues an item from this list. */
  const dead = useMemo(() => {
    const rows = (agg?.deadStock ?? []).map((d) => {
      const meta = itemMeta.get(d.itemUid);
      const lastMs = d.lastSoldAt ? Date.parse(d.lastSoldAt) : null;
      return {
        itemUid: d.itemUid,
        name: d.itemName || meta?.name || 'Unknown item',
        sku: d.sku || meta?.sku || '',
        inHand: d.inHand,
        // Value at cost over costed rows only. Null when this item has no costed row at all,
        // so the UI shows a dash rather than ₹0 for stock it simply cannot value.
        value: d.uncostedRows > 0 && d.costValue <= 0 ? null : d.costValue,
        uncosted: d.uncostedRows > 0,
        last: lastMs,
        idleDays: lastMs ? Math.round((Date.now() - lastMs) / DAY_MS) : null,
      };
    });
    return {
      list: rows.slice(0, 5),
      count: rows.length,
      total: rows.reduce((a, r) => a + (r.value ?? 0), 0),
      // True when any listed item could not be valued — the total is then a floor.
      partial: rows.some((r) => r.value === null || r.uncosted),
    };
  }, [agg, itemMeta]);

  /* ---------- transfers / purchases ----------
     Both filters previously checked status strings against invented constants that do not
     exist on the real backend enums — harmless where they matched nothing, but the transfers
     filter also OMITTED a real status (`PARTIALLY_RECEIVED`), so a transfer that had started
     arriving but wasn't fully received vanished from "in flight" outright. See dashboards
     review C4/C5; real enums now live in commerceEnums.ts. */
  const transfers = useMemo(
    () =>
      ((transfersQ.data ?? []) as any[])
        .filter((t) => TRANSFER_IN_FLIGHT_STATUSES.includes(up(t.status)))
        .slice(0, 4)
        .map((t) => ({
          uid: t.uid,
          id: t.transferNo ?? '—',
          route: `${storeMeta.get(t.fromStoreUid) ?? '—'} → ${storeMeta.get(t.toStoreUid) ?? '—'}`,
          units: Number(t.totalQty) || 0,
          status: up(t.status).replace(/_/g, ' '),
          age: t.transferDate
            ? `${Math.max(0, Math.round((Date.now() - new Date(t.transferDate).getTime()) / DAY_MS))} days`
            : '—',
        })),
    [transfersQ.data, storeMeta]
  );

  /**
   * One bucket per real `PurchaseStatus` value, in pipeline order. The old buckets referenced
   * `PENDING`, `PENDING_APPROVAL`, `ORDERED` and `RECEIVING` — none of which exist on the actual
   * enum (`DRAFT, IN_REVIEW, APPROVED, REQUESTED, CANCELLED`) — so "Receiving" could never be
   * anything but 0, and `REQUESTED`, a real status, had no bucket and was invisible. CANCELLED
   * is excluded: a cancelled purchase isn't part of the open pipeline this card is showing.
   */
  const purchases = useMemo(() => {
    const defs: { keys: string[]; label: string; c: string }[] = [
      { keys: [PURCHASE_STATUS.DRAFT], label: 'Draft', c: C.faint },
      { keys: [PURCHASE_STATUS.REQUESTED], label: 'Requested', c: '#8b5cf6' },
      { keys: [PURCHASE_STATUS.IN_REVIEW], label: 'In review', c: C.amber },
      { keys: [PURCHASE_STATUS.APPROVED], label: 'Approved', c: C.primary },
    ];
    const all = (purchasesQ.data ?? []) as any[];
    return defs.map((d) => ({ ...d, count: all.filter((p) => d.keys.includes(up(p.status))).length }));
  }, [purchasesQ.data]);

  /* Emptiness is now the aggregate's verdict, not a capped page's. Unlike the analytics
     hooks, absence here really does mean "no stock" — this endpoint reads the table directly,
     so there is no publishing pipeline that could be missing. */
  const noStock = !aggLoading && !aggError && !aggQ.hasStock;

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
              <span className="text-xs text-surface-500">Commerce · Inventory</span>
            </div>
            <h1 className="text-[26px] font-bold tracking-tight">Inventory overview</h1>
            <p className="mt-1 text-[13.5px] text-surface-500">
              What stock is worth, what's about to run out, and what's dead money on a shelf.
            </p>
          </div>
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
        </div>

        {/* The aggregate failed. Say so explicitly — without this the level panels fall through
            to their empty states, which claim the tenant holds no stock. That is a different
            statement from "we could not load it", and the wrong one. */}
        {aggError && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-danger-50 px-4 py-3">
            <span className="text-[13px] text-rose-600">⚠</span>
            <span className="text-[12.5px] leading-snug text-rose-700">
              Valuation, stock health, reorder pressure and dead stock could not be loaded. Those
              figures are unavailable — not zero. Movement, transfers and purchases below are
              unaffected.
            </span>
          </div>
        )}

        {/* Cost coverage. A valuation over partially-costed stock is a floor, and presenting it
            as a total would overstate how much is known. */}
        {!aggLoading && !aggError && aggQ.costIncomplete && agg && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-warning-50 px-4 py-3">
            <span className="text-[13px] text-amber-600">⚠</span>
            <span className="text-[12.5px] leading-snug text-amber-700">
              {agg.uncostedRows} of {agg.stockRows} stock rows have no cost recorded, so
              valuation at cost is a lower bound. Cost is set when stock is received — it fills in
              as purchases and transfers come through.
            </span>
          </div>
        )}

        {!movementLoading && movementError && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-danger-50 px-4 py-3">
            <span className="text-[13px] text-rose-600">⚠</span>
            <span className="text-[12.5px] leading-snug text-rose-700">
              Stock movement and adjustments could not be loaded. Unavailable, not empty.
            </span>
          </div>
        )}

        {!movementLoading && !movementError && !movement.any && adjustments.list.length === 0 && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-warning-50 px-4 py-3">
            <span className="text-[13px] text-amber-600">⚠</span>
            <span className="text-[12.5px] leading-snug text-amber-700">
              No stock movement recorded yet — the movement chart and adjustments stay empty
              until stock starts moving.
            </span>
          </div>
        )}



        {/* Quick Actions Pill Row (Reference Design) */}
        <div className="mb-6 flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none w-full">
          <button
            onClick={() => navigate('/items?action=create')}
            className="flex items-center gap-2 rounded-full bg-[#55349A] hover:bg-[#43297A] text-white px-5 py-2.5 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add item</span>
          </button>

          <button
            onClick={() => navigate('/inventory/inventory-catalogs')}
            className="flex items-center gap-2 rounded-full bg-white border border-surface-250 hover:bg-surface-50 text-surface-800 px-4 py-2.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer shrink-0 shadow-3xs"
          >
            <Boxes className="h-4 w-4 text-surface-500" />
            <span>Inventory catalogs</span>
          </button>

          <button
            onClick={() => navigate('/inventory/transfers?action=create')}
            className="flex items-center gap-2 rounded-full bg-white border border-surface-250 hover:bg-surface-50 text-surface-800 px-4 py-2.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer shrink-0 shadow-3xs"
          >
            <RefreshCw className="h-4 w-4 text-surface-500" />
            <span>Stock transfer</span>
          </button>

          <button
            onClick={() => navigate('/inventory/adjustments?action=create')}
            className="flex items-center gap-2 rounded-full bg-white border border-surface-250 hover:bg-surface-50 text-surface-800 px-4 py-2.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer shrink-0 shadow-3xs"
          >
            <SlidersHorizontal className="h-4 w-4 text-surface-500" />
            <span>Adjustments & audit</span>
          </button>
        </div>

        <div className="responsive-dashboard-grid grid grid-cols-1 lg:grid-cols-12 gap-3.5">

          {/* KPIs */}
          <div className="col-span-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 2xl:grid-cols-8 gap-2.5">
            {kpis.map((k) => (
              <div
                key={k.label}
                className={CARD + ' px-3.5 py-3.5'}
                style={k.danger ? { background: '#fff5f5', borderColor: '#fecdd3' } : undefined}
              >
                <div className="mb-2 min-h-[28px] text-[11px] font-semibold leading-tight text-surface-500">{k.label}</div>
                {isLoading || aggLoading ? (
                  <><div className="mb-1.5"><Shimmer h={20} /></div><Shimmer h={11} /></>
                ) : k.unavailable ? (
                  <>
                    <span className="mb-1 inline-block rounded-md border border-dashed border-amber-200 bg-warning-50 px-2 py-1 text-[10px] font-bold text-amber-800">
                      {k.badge ?? 'Coming soon'}
                    </span>
                    <div className="text-[10px] leading-snug text-surface-400">{k.unavailable}</div>
                  </>
                ) : (
                  <>
                    <div
                      className="text-[19px] font-bold tracking-tight"
                      style={{ color: k.danger ? C.danger : k.warn ? '#b45309' : C.ink }}
                    >
                      {k.value}
                    </div>
                    <div className="mt-1 min-h-[16px] text-[10.5px] text-surface-400">{k.sub}</div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Reorder table */}
          <div className={'col-span-12 overflow-x-auto w-full max-w-full ' + CARD}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-[22px] pb-3.5 pt-5">
              <div>
                <Title
                  t="Reorder — what runs out first"
                  s="Ranked by days of cover from 30-day sales velocity, not a fixed threshold."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {reorder.chips.map((u) => (
                  <span
                    key={u.label}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold"
                    style={{ background: u.bg, color: u.c }}
                  >
                    <span className="h-[7px] w-[7px] rounded-full" style={{ background: u.c }} />
                    {u.label} {u.count}
                  </span>
                ))}
              </div>
            </div>
            {isLoading || aggLoading ? (
              <div className="px-[22px] pb-[22px]"><Shimmer h={280} /></div>
            ) : levelUnavailable ? (
              <Blank h={210}>Couldn&apos;t load reorder pressure — unavailable, not zero.</Blank>
            ) : noStock ? (
              <Blank h={200}>No stock records yet — add items to a store's inventory catalog to see them here.</Blank>
            ) : (
              <>
                <div className="w-full overflow-x-auto rounded-xl border border-surface-200 shadow-3xs">
                  <div className="min-w-[1180px]">
                    <div
                      className="grid items-center border-y border-surface-100 bg-surface-50 px-[22px] py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-surface-400"
                      style={{ gridTemplateColumns: '14px minmax(180px,1.6fr) 100px 70px 70px 80px 100px 130px 90px 110px' }}
                    >
                      <span />
                      <span>Item</span><span>SKU</span>
                      <span className="text-right">In hand</span>
                      <span className="text-right">On hold</span>
                      <span className="text-right">Available</span>
                      <span className="text-right">30d velocity</span>
                      <span>Days of cover ↑</span>
                      <span className="text-right">Price</span>
                      <span />
                    </div>
                    {reorder.rows.slice(0, 8).map((r) => {
                      const cs = coverStyle(r);
                      const atRisk = r.avail <= 0 || (r.cover !== null && r.cover < 7);
                      return (
                        <div
                          key={r.itemUid}
                          className="grid items-center border-b border-surface-100 px-[22px] py-2.5 text-[12.5px] hover:bg-surface-50"
                          style={{
                            gridTemplateColumns: '14px minmax(180px,1.6fr) 100px 70px 70px 80px 100px 130px 90px 110px',
                            background: atRisk ? '#fff5f5' : '#fff',
                            boxShadow: atRisk ? `inset 3px 0 0 ${C.danger}` : undefined,
                          }}
                        >
                          <span className="h-2 w-2 rounded-full" style={{ background: cs.fg }} />
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate font-semibold">{r.name}</span>
                            {itemMeta.get(r.itemUid)?.archived && (
                              <span className="flex-none rounded bg-surface-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-surface-500">
                                Archived
                              </span>
                            )}
                          </span>
                          <span className="text-[11.5px] text-surface-400">{r.sku}</span>
                          <span className="text-right text-surface-500">{r.inHand}</span>
                          <span className="text-right text-surface-400">{r.onHold}</span>
                          <span className="text-right font-bold">{r.avail}</span>
                          <span className="text-right text-surface-500">
                            {r.velocity > 0 ? `${r.velocity.toFixed(1)}/day` : '—'}
                          </span>
                          <span>
                            <span className="rounded-md px-2 py-1 text-[11px] font-bold" style={{ background: cs.bg, color: cs.fg }}>
                              {cs.label}
                            </span>
                          </span>
                          <span className="text-right text-surface-500">{r.price > 0 ? '₹' + inr(r.price) : '—'}</span>
                          <button
                            onClick={() => navigate('/inventory/purchases')}
                            className="cursor-pointer whitespace-nowrap rounded-md bg-primary-50 px-2.5 py-1.5 text-[11.5px] font-semibold text-primary-600 hover:bg-primary-100"
                          >
                            + Purchase
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-wrap justify-between gap-3 px-[22px] py-3 text-xs text-surface-400">
                  <span>Urgency = available stock ÷ 30-day daily velocity.</span>
                  <span>Showing {Math.min(8, reorder.rows.length)} of {reorder.rows.length}</span>
                </div>
              </>
            )}
          </div>

          {/* Valuation by category */}
          <div className={'col-span-12 lg:col-span-4 ' + CARD + ' p-4 sm:p-5 md:px-[22px] md:py-5'}>
            <Title t="Valuation by category" s="At retail price" />
            <div className="mb-4" />
            {isLoading || aggLoading ? (
              <Shimmer h={210} />
            ) : levelUnavailable ? (
              <Blank h={200}>Couldn&apos;t load valuation by category — unavailable, not zero.</Blank>
            ) : noStock ? (
              <Blank h={200}>No stock records yet — add items to a store&apos;s inventory catalog to see them here.</Blank>
            ) : !hasPrices ? (
              <Blank h={210}>Item prices aren&apos;t set, so stock can&apos;t be valued.</Blank>
            ) : catValuation.length === 0 ? (
              <Blank h={210}>No stock to value</Blank>
            ) : (
              <div className="flex flex-col gap-3.5">
                {catValuation.map((c) => (
                  <div key={c.name}>
                    <div className="mb-1.5 flex justify-between text-[12.5px]">
                      <span className="truncate font-semibold">{c.name}</span>
                      <span className="font-bold">₹{inr(c.val)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-100">
                      <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: C.primary }} />
                    </div>
                    <div className="mt-1 text-[11px] text-surface-400">{c.skus} SKUs · {c.share}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Distribution by store */}
          <div className={'col-span-12 lg:col-span-4 ' + CARD + ' p-4 sm:p-5 md:px-[22px] md:py-5'}>
            <Title t="Distribution by store" s={storeDist.scopeNote ? 'Where the value sits · all stores' : 'Where the value sits'} />
            <div className="mb-3.5" />
            {isLoading || aggLoading ? (
              <Shimmer h={210} />
            ) : levelUnavailable ? (
              <Blank h={210}>Couldn&apos;t load distribution by store — unavailable, not zero.</Blank>
            ) : storeDist.donut.length === 0 ? (
              <Blank h={210}>
                {agg && agg.retailValue > 0 ? 'No stock to distribute' : "Item prices aren't set, so value can't be split by store."}
              </Blank>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                  <svg viewBox="0 0 120 120" className="h-[104px] w-[104px] flex-none mx-auto sm:mx-0">
                    {storeDist.donut.map((d) => (
                      <circle key={d.uid} cx="60" cy="60" r="45" fill="none" stroke={d.c} strokeWidth="17" strokeDasharray={d.dash} strokeDashoffset={d.off} />
                    ))}
                    <text x="60" y="57" textAnchor="middle" style={{ font: '700 13px inherit', fill: C.ink }}>
                      {compactInr(totalRetail)}
                    </text>
                    <text x="60" y="71" textAnchor="middle" style={{ font: '500 8.5px inherit', fill: C.faint }}>at retail</text>
                  </svg>
                  <div className="flex flex-1 flex-col gap-2 w-full min-w-0">
                    {storeDist.donut.map((d) => (
                      <div key={d.uid} className="flex items-center gap-2 text-[11.5px]">
                        <span className="h-2 w-2 flex-none rounded-sm" style={{ background: d.c }} />
                        <span className="truncate font-semibold">{d.label}</span>
                        <span className="shrink-0 text-surface-400 font-medium pl-1 text-[11px]">{d.val} · {d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  className="mt-3.5 grid gap-x-2.5 gap-y-1.5 border-t border-surface-100 pt-3 text-[11px] text-surface-400"
                  style={{ gridTemplateColumns: 'minmax(100px, 1fr) 48px 48px' }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wide">Store</span>
                  <span className="text-right text-[10px] font-bold uppercase tracking-wide">SKUs</span>
                  <span className="text-right text-[10px] font-bold uppercase tracking-wide">Share</span>
                  {storeDist.table.map((s: any) => (
                    <React.Fragment key={s.uid}>
                      <span className="truncate text-[11.5px] font-semibold text-surface-900">{s.name}</span>
                      <span className="text-right text-[11.5px]">{s.skus}</span>
                      <span className="text-right text-[11.5px]">{s.share}%</span>
                    </React.Fragment>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Stock health */}
          <div className={'col-span-12 lg:col-span-4 ' + CARD + ' p-4 sm:p-5 md:px-[22px] md:py-5'}>
            {/* The by-store / by-category toggle is gone. Each item is rolled up to its worst
                status across stores so the three segments partition the item set and sum to the
                total; that roll-up is what a per-store split would undo, putting an item that
                is out in one store and healthy in another into two buckets at once. Use the
                page's store filter to scope instead. */}
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-sm font-bold">Stock health</div>
              <div className="text-[11px] font-semibold text-surface-400 shrink-0">By category</div>
            </div>
            <div className="mb-3.5 flex gap-3 text-[11px] text-surface-500">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: C.success }} />In stock</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: C.amber }} />Low</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: C.danger }} />Out</span>
            </div>
            {isLoading || aggLoading ? (
              <Shimmer h={180} />
            ) : levelUnavailable ? (
              <Blank h={200}>Couldn&apos;t load stock health — unavailable, not zero.</Blank>
            ) : healthRows.length === 0 ? (
              <Blank h={180}>No stock records</Blank>
            ) : (
              <div className="flex flex-col gap-3.5">
                {healthRows.map((h) => (
                  <div key={h.name}>
                    <div className="mb-1.5 flex justify-between gap-2 text-xs">
                      <span className="truncate font-semibold">{h.name}</span>
                      <span className="whitespace-nowrap text-[11px] text-surface-400">{h.total} SKUs</span>
                    </div>
                    <div className="flex h-3 gap-px overflow-hidden rounded-md">
                      <div style={{ width: `${h.inPct}%`, background: C.success }} />
                      <div style={{ width: `${h.lowPct}%`, background: C.amber }} />
                      <div style={{ width: `${h.outPct}%`, background: C.danger }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stock movement */}
          <div className={'col-span-12 lg:col-span-8 ' + CARD + ' p-4 sm:p-5 md:px-[22px] md:py-5'}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
              <div><Title t="Stock movement" s="Units in (above line) and out (below), weekly" /></div>
              <div className="flex flex-wrap gap-3 text-[11px] text-surface-500">
                {movement.legend.map((l) => (
                  <span key={l.key}>
                    <span className="mr-1 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: l.c }} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
            {isLoading || movementLoading ? (
              <div className="mt-3"><Shimmer h={210} /></div>
            ) : movementUnavailable ? (
              <Blank h={210}>Couldn&apos;t load stock movement — unavailable, not zero.</Blank>
            ) : !movement.any ? (
              <Blank h={210}>No stock movements in the last {movementQ.data?.weeks ?? 12} weeks</Blank>
            ) : (
              <>
                <svg viewBox="0 0 760 220" className="mt-2.5 block w-full">
                  <line x1="0" y1="110" x2="760" y2="110" stroke={C.line} />
                  {movement.segs.map((m, i) => (
                    <rect key={i} x={m.x} y={m.y} width={movement.bw} height={m.h} rx="2" fill={m.c} />
                  ))}
                  <text x="4" y="18" style={{ font: '600 10px inherit', fill: C.faint }}>IN</text>
                  <text x="4" y="214" style={{ font: '600 10px inherit', fill: C.faint }}>OUT</text>
                </svg>
                <div className="flex justify-between px-2 pt-1 text-[10.5px] text-surface-400">
                  {movement.labels.map((l, i) => <span key={i}>{l}</span>)}
                </div>
              </>
            )}
          </div>

          {/* Adjustments */}
          <div className={'col-span-12 lg:col-span-4 ' + CARD + ' p-4 sm:p-5 md:px-[22px] md:py-5'}>
            <div className="mb-3.5 flex items-baseline justify-between gap-2">
              <div><Title t="Adjustments" s="Shrinkage & write-offs, at cost, 30d" /></div>
              <div className="text-right">
                <div className="text-[17px] font-bold text-danger-600">
                  {adjustments.list.length > 0
                    ? (adjustments.partial ? '≥ ₹' : '₹') + inr(adjustments.total)
                    : '—'}
                </div>
                <div className="text-[10.5px] text-surface-400">value lost{adjustments.partial ? ' (at least)' : ''}</div>
              </div>
            </div>
            {isLoading || movementLoading ? (
              <Shimmer h={170} />
            ) : movementUnavailable ? (
              <Blank h={170}>Couldn&apos;t load adjustments — unavailable, not zero.</Blank>
            ) : adjustments.list.length === 0 ? (
              <Blank h={170}>No write-offs in the last {movementQ.data?.adjustmentWindowDays ?? 30} days</Blank>
            ) : (
              <div className="flex flex-col gap-3">
                {adjustments.list.map((a) => (
                  <div key={a.reason}>
                    <div className="mb-1 flex justify-between gap-2 text-[12.5px]">
                      <span className="truncate font-semibold">{a.reason}</span>
                      <span className="font-bold text-danger-600">
                        {a.val > 0 ? (a.uncosted ? '≥ ₹' : '₹') + inr(a.val) : a.uncosted ? 'uncosted' : '—'}
                      </span>
                    </div>
                    <div className="h-[7px] overflow-hidden rounded bg-rose-100">
                      <div className="h-full rounded" style={{ width: `${a.pct}%`, background: '#fb7185' }} />
                    </div>
                    <div className="mt-1 text-[10.5px] text-surface-400">{a.units} units</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dead & slow stock */}
          <div
            className={'col-span-12 lg:col-span-6 ' + CARD + ' p-4 sm:p-5 md:px-[22px] md:py-5'}
            style={dead.count > 0 ? { borderColor: '#fde68a' } : undefined}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-sm font-bold">Dead &amp; slow stock</div>
              <div className="flex gap-0.5 rounded-lg bg-surface-100 p-0.5">
                {([60, 90] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => setDeadWin(w)}
                    className={
                      'cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-semibold ' +
                      (deadWin === w ? 'bg-white text-surface-900' : 'text-surface-500')
                    }
                  >
                    {w} days
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3.5 text-xs text-surface-500">
              No sales movement in {deadWin} days — capital sitting on a shelf.
            </div>
            {isLoading || aggLoading ? (
              <Shimmer h={200} />
            ) : levelUnavailable ? (
              <Blank h={190}>Couldn&apos;t load dead & slow stock — unavailable, not zero.</Blank>
            ) : dead.count === 0 ? (
              <Blank h={200}>Nothing idle — every stocked item has sold recently.</Blank>
            ) : (
              <>
                <div className="mb-3.5 flex items-baseline gap-2.5">
                  <span className="text-[28px] font-bold" style={{ color: dead.total > 0 ? '#b45309' : C.ghost }}>
                    {dead.total > 0 ? (dead.partial ? '≥ ₹' : '₹') + inr(dead.total) : '—'}
                  </span>
                  <span className="text-[12.5px] text-surface-500">
                    locked in {dead.count} item{dead.count === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {dead.list.map((d) => (
                    <div key={d.itemUid} className="grid items-center gap-2.5" style={{ gridTemplateColumns: 'minmax(120px, 1fr) 90px 80px' }}>
                      <div className="min-w-0">
                        <div className="truncate text-[12.5px] font-semibold">{d.name}</div>
                        <div className="text-[10.5px] text-surface-400">
                          {d.inHand} units · {d.last ? `last sold ${fmtDay(new Date(d.last))}` : 'never sold'}
                        </div>
                      </div>
                      <span className="text-right text-[11px] text-surface-400">
                        {d.idleDays !== null ? `${d.idleDays} days idle` : '—'}
                      </span>
                      {/* Null value = this item has no costed stock row, so it cannot be valued at all.
                          A dash is the honest render; ₹0 would claim the stock is worthless. */}
                      <span className="text-right text-[12.5px] font-bold" title={d.uncosted ? 'Some stock for this item is uncosted — value is a floor' : undefined}>
                        {d.value === null ? '—' : (d.uncosted ? '≥ ₹' : '₹') + inr(d.value)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 border-t border-surface-100 pt-2.5 text-[11px] text-surface-400">
                  Consider a clearance discount or a supplier return for the top three.
                </div>
              </>
            )}
          </div>

          {/* Transfers in flight */}
          <div className={'col-span-12 lg:col-span-3 ' + CARD + ' p-4 sm:p-5 md:px-[22px] md:py-5'}>
            <Title t="Transfers in flight" s="Between stores" />
            <div className="mb-3.5" />
            {isLoading ? (
              <Shimmer h={180} />
            ) : transfers.length === 0 ? (
              <Blank h={180}>No transfers in flight</Blank>
            ) : (
              <div className="flex flex-col gap-3">
                {transfers.map((t) => (
                  <div
                    key={t.uid}
                    onClick={() => navigate('/inventory/transfers?action=create')}
                    className="cursor-pointer rounded-xl border border-surface-200 px-3 py-2.5 hover:bg-surface-50"
                  >
                    <div className="mb-1 flex justify-between gap-2 text-xs">
                      <span className="font-bold text-primary-600">{t.id}</span>
                      <span className="whitespace-nowrap rounded bg-primary-50 px-1.5 py-0.5 text-[10.5px] font-bold text-primary-600">
                        {t.status}
                      </span>
                    </div>
                    <div className="truncate text-[11.5px] text-surface-500">{t.route}</div>
                    <div className="mt-1 text-[10.5px] text-surface-400">{t.units} units · {t.age}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Purchase pipeline */}
          <div className={'col-span-12 lg:col-span-3 ' + CARD + ' p-4 sm:p-5 md:px-[22px] md:py-5'}>
            <Title t="Purchase pipeline" s="Open POs by status" />
            <div className="mb-3.5" />
            {isLoading ? (
              <Shimmer h={180} />
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  {purchases.map((p) => (
                    <div
                      key={p.label}
                      onClick={() => navigate('/inventory/purchases')}
                      className="flex cursor-pointer items-center gap-2.5 text-[12.5px] hover:opacity-85"
                    >
                      <span className="h-2 w-2 flex-none rounded-full" style={{ background: p.c }} />
                      <span className="font-semibold">{p.label}</span>
                      <span className="ml-auto font-bold">{p.count}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 border-t border-surface-100 pt-3">
                  <div className="mb-0.5 text-[11px] text-surface-400">Open PO value</div>
                  <div className="text-[19px] font-bold text-surface-300">—</div>
                  <div className="mt-2 text-[11px] leading-snug text-surface-400">
                    PO totals and vendor lead time aren't exposed by the API yet.
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default InventoryDashboardPage;
