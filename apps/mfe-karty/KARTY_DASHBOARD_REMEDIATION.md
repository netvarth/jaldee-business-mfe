# Karty (mfe-karty) — Dashboard Remediation

Findings from an audit of the three Karty dashboards and the analytics paths behind them.

Written 2026-07-20. Every claim is cited to a file and line read on disk. `npm run build` was
**not** run — the sandbox only has the macOS rollup binary. Verify locally before shipping.

**Companion docs:**
`core-platform-service/ANALYTICS_PLATFORM_REMEDIATION.md` (P1 unblocks K3 below) and
`feature-finance-service/FINANCE_ANALYTICS_REMEDIATION.md` in the backend repo.

---

## Priority summary

| # | Issue | Severity | Status |
|---|---|---|---|
| K1 | Unreachable duplicate branch in the valuation panel | Low | **Fixed 2026-07-20** |
| K2 | Legacy full-table-scan analytics path still routed | **High** | **Retired 2026-07-20** |
| K3 | Graph endpoint unusable, so trends are hand-rolled | Medium | Blocked on platform P1 |
| K4 | Dead code that looks live | Medium | Documented, retained by decision |
| K5 | Formatters and primitives duplicated across all three dashboards | Low | Safe refactor, open |

---

## The three dashboards (for orientation)

All routed from `src/App.tsx`, all reading real APIs, none using mock data:

| Dashboard | Route | File |
|---|---|---|
| Karty Overview | `/` (and `/overview` → redirect) | `src/new-karty-src/src/components/KartyOverview.tsx` (1123 ln) |
| Order Dashboard | `/orders/dashboard` | `src/pages/OrderDashboardPage.tsx` (1168 ln) |
| Inventory Dashboard | `/inventory/dashboard` | `src/pages/InventoryDashboardPage.tsx` (1158 ln) |

These are in good shape. They consistently distinguish four states — loading, unavailable (query
failed), empty (genuinely zero), and coming-soon (data does not exist yet) — and they name the
missing capability rather than fabricating a number. Gross margin %, cart abandonment, fulfilment
mix, hourly order timing and inventory turnover all render an explicit badge with a stated reason.
That discipline is the reason this audit found so little in them; keep it.

The overlap between Overview and Order Dashboard (sales, AOV, channel split, top items) is
intentional layering — cross-domain summary vs order-domain drill-down — and both link into each
other. Not duplication to remove.

---

## K1 — Unreachable duplicate branch *(fixed)*

`src/pages/InventoryDashboardPage.tsx`, valuation-by-category panel. The chain tested the same
condition twice:

```tsx
) : catValuation.length === 0 ? (
  <Blank h={210}>Item prices aren't set, so stock can't be valued.</Blank>
) : catValuation.length === 0 ? (   // ← unreachable
  <Blank h={210}>No stock to value</Blank>
) : (
```

Two genuinely different empty-states were intended — *no stock at all* vs *stock exists but is
unpriced* — but both were wired to the same test, so the second could never render and an unpriced
catalogue and an empty one showed the same message.

Both signals already existed in the component: `noStock` (`:626`) and `hasPrices` (`:228`). Fixed
to match the sibling panels' chain (`levelUnavailable` → `noStock` → content, as at `:754-759`):

```tsx
) : noStock ? (
  <Blank h={200}>No stock records yet — add items to a store&apos;s inventory catalog to see them here.</Blank>
) : !hasPrices ? (
  <Blank h={210}>Item prices aren&apos;t set, so stock can&apos;t be valued.</Blank>
) : catValuation.length === 0 ? (
  <Blank h={210}>No stock to value</Blank>
) : (
```

Every branch is now reachable.

---

## K2 — The legacy full-table-scan analytics path is still routed

**Severity: High. This is the real Karty problem.**

Karty currently runs **three** analytics paths at once. Two are correct. The third is the one the
other two were built to replace, and it is still live.

| Path | Backend | Status |
|---|---|---|
| `useCommerceAnalytics.ts` | platform analytics service, metrics 400–417 | Correct |
| `useOrderAggregate.ts` / `useInventoryAggregate.ts` | bounded server-side `GROUP BY` in commerce | Correct |
| **`useAnalytics.ts`** | **`CommerceAnalyticsController` → `CommerceAnalyticsService`** | **Legacy** |

The backend behind the third does this (`CommerceAnalyticsService.getOrderAnalytics`, backend repo):

```java
List<OrderEntity> orders = orderRepository.findAllByTenantUid(tenantUid).stream()
        .filter(o -> o.getCreatedAt() != null && o.getCreatedAt().isAfter(filterDate))
        .collect(Collectors.toList());
```

Every order for the tenant loaded into JVM heap, then filtered and summed in Java. No pagination,
no date predicate pushed to SQL, no index use. `getInventoryAnalytics` additionally returns
`.totalValuation(BigDecimal.ZERO)` hardcoded.

This is precisely what the event-driven pipeline exists to prevent, and what
`useCommerceAnalytics.ts:18-23` documents as the reason the good path was built:

> These figures were previously counted in the browser from `useOrders`, which is capped at 200
> rows server-side. Past that cap the numbers silently described a slice of the data with nothing
> on screen saying so.

The browser-side cap was fixed. The server-side full scan was not — it was left in place and is
still reachable.

### It is not dead code

`src/App.tsx:21-22` imports `OrderAnalytics` and `InventoryAnalytics`, and renders them at:

- `:130` — `{tab === "inventory" ? <InventoryAnalytics /> : <OrderAnalytics />}` (a tabbed
  Reports Center view)
- `:201` — `<Route path="/inventory/analytics" element={<InventoryAnalytics />} />`

Both components call `useAnalytics.ts`, which hits `/v1/api/tenant/analytics/{orders,inventory}`.

### Resolution — retired 2026-07-20

Done frontend-first so nothing broke mid-flight:

1. **`OrderAnalytics.tsx` rewritten** against `useCommerceOrderAnalytics` — the same
   pre-aggregated counters the Order Dashboard reads. Response size is now constant regardless of
   order volume.
2. **`InventoryAnalytics.tsx` rewritten** against `useInventoryAggregate` — the bounded
   server-side `GROUP BY` the Inventory Dashboard reads.
3. **Deleted:** `src/services/useAnalytics.ts` (frontend); `CommerceAnalyticsController`,
   `CommerceAnalyticsService`, `CommerceAnalyticsServiceImplTest`, `OrderAnalyticsDto`,
   `InventoryAnalyticsDto`, `OverviewAnalyticsDto` (backend). Verified beforehand that no other
   MFE calls `/v1/api/tenant/analytics/*` and that no gateway route in `infra-config-repo`
   references it. `OrderAggregateDto` survives in `dto/analytics/` — it belongs to the live
   aggregate path, not the deleted one.

### Panels dropped rather than ported

Three had no backing data, and porting them would have carried fabricated numbers forward:

| Panel | Why dropped |
|---|---|
| "Fulfilment Performance Ledger" (speed / mode / efficiency per order) | Backend returned `.recentPerformance(List.of())` unconditionally — the table always rendered zero rows, and its columns described a measurement the platform does not take. |
| "Avg prep speed: 14.5 min" | A string literal in the JSX. Not from any API. |
| Warehouse selector `['All Warehouses', 'Thrissur', 'Kochi']` | Two hardcoded store names unrelated to the tenant's actual stores. Replaced with real stores from `useStores`, now driving the `storeUid` filter on the aggregate. |
| "Total valuation" | Backend returned `.totalValuation(BigDecimal.ZERO)` — a hardcoded zero presented as a valuation. Now the real `retailValue`, with the unpriced-rows caveat surfaced. |

### One correction worth recording

The first draft of the rewrite marked **active carts** as "Coming soon". That was wrong:
`/v1/api/tenant/carts/active/count` exists and `useActiveCartCount` already backs the Order
Dashboard's live tile. Only cart *abandonment* is genuinely underivable, because `CartEntity`
records no last-activity time.

`OrderDashboardPage.tsx:315` carries a comment warning about exactly this — rendering "Coming
soon" over a working API. The two failure modes are mirror images and both are dishonest: a
fabricated number claims a measurement never taken, and a false "coming soon" hides one that was.
Check for an existing endpoint before flagging anything unavailable.

---

## K3 — Trend charts are hand-rolled because the graph endpoint is unusable

**Severity: Medium. Blocked on platform P1 — no Karty change until that lands.**

`useCommerceAnalytics.ts` builds daily series with repeated `dailyQuery(...)` calls rather than
using `POST /v1/api/analytics/graph`, which exists for exactly this. The reason is documented at
`:57-61`:

> Query by featureModule rather than metricTypeId: `analyticsDashboardConfig.json` has no entries
> for the 400 block, so the metricTypeId path throws
> `"Metric ID 402 not found in metric type 6"`.

The graph endpoint requires `metricTypeName`, which requires the config registration that was never
done. This is a backend gap, correctly worked around here.

**Once platform P1 lands** (commerce 400-block added to `analyticsDashboardConfig.json`),
revisit: the per-day fan-out can collapse into single graph calls, cutting request count on the
Overview and Order dashboards noticeably. Do not attempt it before then — the endpoint will throw.

Leave the explanatory comment at `:57-61` in place until the migration happens, and update it
rather than deleting it when it does. It is the only record of why this shape was chosen.

---

## K4 — Dead code that reads as live

**Severity: Medium.** Not broken, but actively misleading — a reader looking for "how does the
Karty overview work" finds the wrong file first.

| File | Status |
|---|---|
| `src/pages/OverviewPage.tsx` | Self-marked dead in its own header comment: *"DEAD CODE — not imported or routed anywhere… Safe to delete"*. Contains hardcoded literal KPIs (`"126"`, `"18"`, `"9"`, `"42"`) — a direct violation of the repo's no-silent-mocks rule. Grep confirms no importer. |
| `src/new-karty-src/src/App.tsx` | A second, disconnected standalone app entered only via its own `main.tsx`, which the live `mount.tsx` never invokes. |
| `src/new-karty-src/src/components/layout/DashboardLayout.tsx` | Used only by the above. Declares its own competing route table (`:506`, `:516`) that shadows nothing real. |

The confusing part is that `new-karty-src/` is **not** wholly dead — the live `App.tsx` imports
`KartyOverview.tsx`, `OrderAnalytics.tsx` and `InventoryAnalytics.tsx` out of it. So the directory
cannot be deleted wholesale; only the three files above.

**Decision (2026-07-20): retained, documented only.** No deletions made.

They are inert — nothing imports them, so they cost nothing at runtime and cannot break a build.
The cost is to readers: `OverviewPage.tsx` holds hardcoded KPIs (`"126"`, `"18"`, `"9"`, `"42"`)
that look like a working screen, and the standalone `App.tsx`/`DashboardLayout.tsx` pair declares a
competing route table which is what made this codebase's dashboard count ambiguous on first read.

If they are being kept deliberately as reference exports, adding one line to the top of each
(`// Reference export — not part of the build. See KARTY_DASHBOARD_REMEDIATION.md §K4.`) would
remove the ambiguity at no risk. `OverviewPage.tsx` already self-declares "Safe to delete", so
whenever the decision changes it needs no further investigation.

---

## K5 — Duplicated helpers across all three dashboards

**Severity: Low. Safe, mechanical.**

Each dashboard redefines the same primitives independently:

| Helper | KartyOverview | OrderDashboardPage | InventoryDashboardPage |
|---|---|---|---|
| `C` (colour tokens) | `:21` | `:38` | `:24` |
| `inr` | `:60` | `:72` | `:54` |
| `compactInr` | `:75` | — | `:62` |
| `pct` | `:86` | `:82` | — |
| `Shimmer` | `:90` | `:114` | `:72` |
| `Title` | — | `:118` | `:75` |
| `Blank` | — | `:125` | `:81` |

Note the signature drift already present: `Shimmer` takes `{ height }` in KartyOverview but
`{ h }` in the other two, and `pct` is `(part, whole)` vs `(a, b)`. Divergence has started.

`src/lib/` exists (`apiClient.ts`, `httpClient.ts`) but has no formatting module.

**Fix:** extract to `src/lib/dashboardFormat.ts` (`inr`, `compactInr`, `pct`, colour tokens `C`) and
`src/components/dashboard/primitives.tsx` (`Shimmer`, `Title`, `Blank`), standardising on the
`{ h }` prop name used by two of three. Import from all three dashboards.

Check `@jaldee/design-system` first — it exports ~55 components including `StatCard` and chart
primitives, and the monorepo rule is to use those instead of raw HTML/Tailwind. If `Shimmer` or an
equivalent skeleton already exists there, use it rather than adding a Karty-local copy.

Do this **after** K2, not before — K2 rewrites two components that would otherwise need touching
twice.

---

## State of play

- **K1** — fixed.
- **K2** — retired. Both components rewritten, seven files deleted across the two repos.
- **K4** — documented, retained by decision.
- **K5** — open. Now unblocked: K2 has settled which components survive, so the extraction can
  proceed without touching anything twice.
- **K3** — open, blocked on platform P1.

## Verification still owed

**Nothing here was built or type-checked.** The sandbox has only the macOS rollup binary, and no
Gradle toolchain for the backend side. Before this ships:

```bash
# frontend
cd apps/mfe-karty && npx tsc --noEmit && npx vite build
npm run build            # from repo root — confirms remoteEntry.js still emits

# backend
cd feature-commerce-service && ./gradlew build
```

A broken `remoteEntry.js` breaks the shell silently, per the monorepo's federation rule — so the
build check matters more here than the type check.

Then a live click-through of both rewritten screens against a running gateway, watching the network
tab for 404s. The two screens now call `/v1/api/analytics` (platform) and
`/v1/api/tenant/inventory/aggregate` + `/v1/api/tenant/carts/active/count` (commerce) instead of
the deleted `/v1/api/tenant/analytics/*`. Expect **no coverage** on the order screen until the
commerce analytics publisher has been running for at least a day — that is the correct day-one
state, and the banner says so rather than showing ₹0.
