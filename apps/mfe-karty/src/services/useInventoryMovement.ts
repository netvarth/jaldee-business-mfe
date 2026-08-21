import { useQuery } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

/**
 * Stock movement over time — the flows counterpart to `useInventoryAggregate`'s levels.
 * Backed by `GET /v1/api/tenant/inventory/movement` (InventoryAggregateController#movement).
 *
 * ## Why this exists
 * The weekly in/out chart and 30-day shrinkage-by-reason panel previously read `useStockLedger`,
 * capped at 100 rows with no date or page parameter. On any tenant with real movement volume
 * that is a few days of history, so the 12-week chart drew mostly-empty weeks that read as
 * quiet, and the adjustments panel silently missed anything older than page one — with no
 * banner disclosing either. See `docs/karty-dashboards-review.md` C1.
 *
 * Adjustment value is priced **at cost**, not retail — the previous client-side version valued
 * shrinkage at retail under a "value lost" heading, overstating loss by the margin (C3).
 */

const STALE_MS = 60_000;

export interface MovementRow {
  /** Monday of the ISO week this bucket covers, ISO timestamp. */
  weekStart: string;
  /** StockSourceDoc name: ORDER, PURCHASE, PURCHASE_RETURN, SALES_RETURN, TRANSFER, ADJUSTMENT, OPENING. */
  sourceDoc: string;
  inUnits: number;
  outUnits: number;
}

export interface AdjustmentRow {
  reason: string;
  /** Units reduced — always positive; this list is reductions only. */
  units: number;
  /** Value at cost, over rows with a matching costed stock row. A floor when `uncostedRows` > 0. */
  costValue: number;
  uncostedRows: number;
}

export interface InventoryMovement {
  weeklyMovement: MovementRow[];
  adjustments: AdjustmentRow[];
  weeks: number;
  adjustmentWindowDays: number;
}

export interface InventoryMovementFilter {
  storeUid?: string;
  weeks?: number;
  adjustmentWindowDays?: number;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toParams(filter: InventoryMovementFilter): string {
  const params = new URLSearchParams();
  if (filter.storeUid && filter.storeUid !== "all") params.append("storeUid", filter.storeUid);
  if (filter.weeks) params.append("weeks", String(filter.weeks));
  if (filter.adjustmentWindowDays) params.append("adjustmentWindowDays", String(filter.adjustmentWindowDays));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function normalize(raw: any): InventoryMovement {
  return {
    weeklyMovement: (raw?.weeklyMovement ?? []).map((r: any) => ({
      weekStart: String(r?.weekStart ?? ""),
      sourceDoc: String(r?.sourceDoc ?? ""),
      inUnits: num(r?.inUnits),
      outUnits: num(r?.outUnits),
    })),
    adjustments: (raw?.adjustments ?? []).map((a: any) => ({
      reason: String(a?.reason ?? "Unspecified"),
      units: num(a?.units),
      costValue: num(a?.costValue),
      uncostedRows: num(a?.uncostedRows),
    })),
    weeks: num(raw?.weeks),
    adjustmentWindowDays: num(raw?.adjustmentWindowDays),
  };
}

export interface UseInventoryMovement {
  data: InventoryMovement | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;

  /** True when at least one adjustment reason has rows with no resolvable cost. */
  adjustmentCostIncomplete: boolean;
}

export function useInventoryMovement(filter: InventoryMovementFilter = {}): UseInventoryMovement {
  const api = useCommerceApi();
  const qs = toParams(filter);

  const query = useQuery({
    queryKey: ["inventory-movement", qs],
    queryFn: async () => normalize(await api.get<any>(`/v1/api/tenant/inventory/movement${qs}`)),
    staleTime: STALE_MS,
  });

  const data = query.data ?? null;

  return {
    data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    adjustmentCostIncomplete: (data?.adjustments ?? []).some((a) => a.uncostedRows > 0),
  };
}
