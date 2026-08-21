import { useQuery } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

/**
 * Point-in-time inventory rollups — valuation, stock health, reorder pressure, dead stock.
 * Backed by `GET /v1/api/tenant/inventory/aggregate` (InventoryAggregateController).
 *
 * ## Why this is not the analytics service
 * `analytics_tbl` is an additive counter store: a frequency window sums the buckets it covers.
 * That expresses *flows* — stock was received, units were sold — and cannot express *levels*,
 * which is what every number here is. Publishing "stock on hand = 40" daily and querying
 * TILL_NOW returns the sum of every snapshot ever written, not 40. There is no last-value-wins
 * semantic.
 *
 * ## Why this is not client-side either
 * The dashboard previously computed all of this from `useInventoryStock`, `useItems` and
 * `useStockLedger` — each capped at 100 rows with no pagination. On any tenant with real
 * movement volume, 100 ledger rows is a few days, so the 30-day velocity, days-of-cover,
 * reorder ranking, 30-day adjustments and 60/90-day dead-stock detection were all computed
 * over that slice. Dead stock failed worst: an item whose last sale fell outside the window was
 * reported "never sold" and counted as idle capital.
 *
 * Contract: `docs/karty-analytics-api-contract.md` §2, §5.4.
 */

const STALE_MS = 60_000;

export interface InventoryBreakdown {
  /** Category name, or the store **uid** on the by-store list — resolve names client-side. */
  name: string;
  retailValue: number;
  costValue: number;
  itemCount: number;
  /** Rows in this bucket with no cost. Non-zero means costValue is a floor, not a total. */
  uncostedRows: number;
  totalInHand: number;
}

export interface InventoryHealth {
  name: string;
  itemCount: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface ReorderCandidate {
  itemUid: string;
  itemName: string;
  sku: string | null;
  preferredVendorUid: string | null;
  inHand: number;
  onHold: number;
  available: number;
  /** Null when the item has no configured threshold and falls back to the service default. */
  reorderPoint: number | null;
  dailyVelocity: number;
  /** Null when nothing sold in the window — "no sales", not "infinite cover". */
  daysOfCover: number | null;
  lastSoldAt: string | null;
}

export interface DeadStockItem {
  itemUid: string;
  itemName: string;
  sku: string | null;
  inHand: number;
  costValue: number;
  uncostedRows: number;
  /** Null means never sold across the whole ledger — not merely "not sold recently". */
  lastSoldAt: string | null;
}

export interface InventoryAggregate {
  retailValue: number;
  /** Over costed rows only. Read with `uncostedRows` before presenting as a total. */
  costValue: number;

  stockRows: number;
  uncostedRows: number;
  unpricedRows: number;

  distinctItems: number;
  distinctVariants: number;

  /** Distinct ITEMS, not stock rows — an item held in three stores counts once. */
  stockoutItems: number;
  lowStockItems: number;

  totalInHand: number;
  totalOnHold: number;

  /**
   * Tenant-wide days of cover, computed server-side over every item — not summed from
   * `reorderCandidates` on the client, which is capped to the most urgent 50 rows and would
   * bias the figure low (dashboards review C2: the "tenant-wide" number was really "the worst
   * 50 items' " number). Null when nothing has sold in the velocity window.
   */
  daysOfCover: number | null;

  byCategory: InventoryBreakdown[];
  /** Always tenant-wide; not narrowed by `storeUid` (one bar is not a breakdown). */
  byStore: InventoryBreakdown[];
  healthByCategory: InventoryHealth[];
  reorderCandidates: ReorderCandidate[];
  deadStock: DeadStockItem[];

  velocityWindowDays: number;
  deadStockThresholdDays: number;
}

export interface InventoryAggregateFilter {
  storeUid?: string;
  velocityWindowDays?: number;
  deadStockThresholdDays?: number;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Preserves null. Used where null and zero mean different things — see `daysOfCover`. */
function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toParams(filter: InventoryAggregateFilter): string {
  const params = new URLSearchParams();
  // "all" is the UI's sentinel for no store filter and must never reach the API, which would
  // try to parse it as a UUID and 400.
  if (filter.storeUid && filter.storeUid !== "all") params.append("storeUid", filter.storeUid);
  if (filter.velocityWindowDays) params.append("velocityWindowDays", String(filter.velocityWindowDays));
  if (filter.deadStockThresholdDays) {
    params.append("deadStockThresholdDays", String(filter.deadStockThresholdDays));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function normalize(raw: any): InventoryAggregate {
  const breakdown = (b: any): InventoryBreakdown => ({
    name: String(b?.name ?? ""),
    retailValue: num(b?.retailValue),
    costValue: num(b?.costValue),
    itemCount: num(b?.itemCount),
    uncostedRows: num(b?.uncostedRows),
    totalInHand: num(b?.totalInHand),
  });

  return {
    retailValue: num(raw?.retailValue),
    costValue: num(raw?.costValue),
    stockRows: num(raw?.stockRows),
    uncostedRows: num(raw?.uncostedRows),
    unpricedRows: num(raw?.unpricedRows),
    distinctItems: num(raw?.distinctItems),
    distinctVariants: num(raw?.distinctVariants),
    stockoutItems: num(raw?.stockoutItems),
    lowStockItems: num(raw?.lowStockItems),
    totalInHand: num(raw?.totalInHand),
    totalOnHold: num(raw?.totalOnHold),
    // Null-preserving: no sales in the window is not zero cover and not infinite cover.
    daysOfCover: numOrNull(raw?.daysOfCover),
    byCategory: (raw?.byCategory ?? []).map(breakdown),
    byStore: (raw?.byStore ?? []).map(breakdown),
    healthByCategory: (raw?.healthByCategory ?? []).map((h: any) => ({
      name: String(h?.name ?? ""),
      itemCount: num(h?.itemCount),
      inStockCount: num(h?.inStockCount),
      lowStockCount: num(h?.lowStockCount),
      outOfStockCount: num(h?.outOfStockCount),
    })),
    reorderCandidates: (raw?.reorderCandidates ?? []).map((r: any) => ({
      itemUid: String(r?.itemUid ?? ""),
      itemName: String(r?.itemName ?? ""),
      sku: r?.sku ?? null,
      preferredVendorUid: r?.preferredVendorUid ?? null,
      inHand: num(r?.inHand),
      onHold: num(r?.onHold),
      available: num(r?.available),
      // Null-preserving: a missing threshold is "uses the default", not "zero".
      reorderPoint: numOrNull(r?.reorderPoint),
      dailyVelocity: num(r?.dailyVelocity),
      // Null-preserving: no sales is not infinite cover, and definitely not zero cover.
      daysOfCover: numOrNull(r?.daysOfCover),
      lastSoldAt: r?.lastSoldAt ?? null,
    })),
    deadStock: (raw?.deadStock ?? []).map((d: any) => ({
      itemUid: String(d?.itemUid ?? ""),
      itemName: String(d?.itemName ?? ""),
      sku: d?.sku ?? null,
      inHand: num(d?.inHand),
      costValue: num(d?.costValue),
      uncostedRows: num(d?.uncostedRows),
      lastSoldAt: d?.lastSoldAt ?? null,
    })),
    velocityWindowDays: num(raw?.velocityWindowDays),
    deadStockThresholdDays: num(raw?.deadStockThresholdDays),
  };
}

export interface UseInventoryAggregate {
  data: InventoryAggregate | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;

  /**
   * False when the request succeeded but the tenant holds no stock rows at all.
   *
   * Unlike the analytics hook's `hasCoverage`, this genuinely means "no stock" rather than
   * "nothing was measured" — the aggregate reads `inventory_stock_tbl` directly, so there is no
   * publishing pipeline that could be missing. Callers should render an empty state, not a
   * "not recorded" state: this endpoint can only ever make the first claim.
   */
  hasStock: boolean;

  /**
   * True when at least one stock row has no cost, so `costValue` is a floor rather than a
   * total. The UI must say so instead of presenting the number as complete — a valuation with
   * 40% of rows uncosted is a different figure from a finished one.
   */
  costIncomplete: boolean;

  /**
   * True when no row anywhere carries a cost. Valuation-at-cost is then not merely incomplete
   * but entirely unavailable, and should render as such rather than as ₹0.
   */
  costUnavailable: boolean;
}

export function useInventoryAggregate(filter: InventoryAggregateFilter = {}): UseInventoryAggregate {
  const api = useCommerceApi();
  const qs = toParams(filter);

  const query = useQuery({
    queryKey: ["inventory-aggregate", qs],
    queryFn: async () => normalize(await api.get<any>(`/v1/api/tenant/inventory/aggregate${qs}`)),
    staleTime: STALE_MS,
  });

  const data = query.data ?? null;

  return {
    data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasStock: (data?.stockRows ?? 0) > 0,
    costIncomplete: (data?.uncostedRows ?? 0) > 0,
    costUnavailable: data ? data.stockRows > 0 && data.uncostedRows >= data.stockRows : false,
  };
}
