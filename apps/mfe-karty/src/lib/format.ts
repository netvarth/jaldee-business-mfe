/**
 * Shared number/label formatters for the Karty dashboards.
 *
 * These were previously copy-pasted into KartyOverview, OrderDashboardPage and
 * InventoryDashboardPage with drifting variable names and one function (`pct`) defined under two
 * names (`pct` / `pctOf`). A rounding or grouping fix in one copy silently left the others wrong,
 * so they live here once.
 */

/**
 * Indian digit grouping: 1234567 → "12,34,567". Rounds to a whole number and preserves sign.
 */
export const inr = (n: number): string => {
  const s = String(Math.round(Math.abs(n)));
  if (s.length <= 3) return (n < 0 ? '-' : '') + s;
  const l3 = s.slice(-3);
  let r = s.slice(0, -3), o = '';
  while (r.length > 2) { o = ',' + r.slice(-2) + o; r = r.slice(0, -2); }
  return (n < 0 ? '-' : '') + r + o + ',' + l3;
};

/** Compact currency for tight spaces: ₹4.6L / ₹1.2Cr, else the grouped rupee value. */
export const compactInr = (n: number): string => {
  const v = Math.abs(n);
  if (v >= 1e7) return '₹' + (n / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr';
  if (v >= 1e5) return '₹' + (n / 1e5).toFixed(1).replace(/\.0$/, '') + 'L';
  return '₹' + inr(n);
};

/** Null-safe uppercase, for comparing free-form status strings. */
export const up = (s: unknown): string => String(s ?? '').toUpperCase();

/** `part` as a whole-number percentage of `whole`; 0 when `whole` is 0. */
export const pct = (part: number, whole: number): number =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;
