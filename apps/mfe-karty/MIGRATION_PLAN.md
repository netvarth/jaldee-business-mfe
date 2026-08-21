# Karty MFE — Route Migration Plan (style-preserving)

> Goal: bring `mfe-karty` in line with the `mfe-hr` / `mfe-bookings-v2` architecture
> (URL-routed screens under the shell's `HistoryRouter`) **without losing any of the
> existing visual design**. We follow the **bookings-v2 model** — a *faithful port of
> the chrome*, where only navigation is rewired to react-router and every screen
> component + stylesheet is left exactly as-is. This is NOT a redevelop; no screen
> is rewritten.

## Guiding rule: nothing visual changes

- No screen component (`new-karty-src/src/components/*Table.tsx`, `*Grid.tsx`, etc.)
  is rewritten or restyled. They keep their Tailwind classes and markup verbatim.
- `new-karty-src/src/index.css` (and any other CSS imports) stay loaded.
- `DashboardLayout` chrome markup + classes are **kept**. Only the click handlers and
  the active-state derivation change (state → URL). The sidebar looks identical.
- The data hooks we just fixed (`useStores`, `usePurchases`, catalogs, etc.) are reused
  unchanged.

## Why migrate (the 3 problems being fixed)

1. **Nested router bug** — `App.tsx` creates its own `<BrowserRouter>` *inside* the
   shell's `HistoryRouter`, so `basePath` is ignored and deep-linking / shell
   back-forward sync break.
2. **No per-screen URLs** — navigation is `useState` (`activeSub`/`activeDeepSub`), so
   no screen is linkable or refresh-safe.
3. **Dead duplicate trees** — `inventorynew/` and `pages/*Page.tsx` are a half-built
   route structure that is never mounted.

## Target route map

Routes are relative; the shell injects `basePath` via `HistoryRouter`. The nav arrays
in `DashboardLayout` already declare these `path` values — we just start honoring them.

| Current view (`activeSub` / `activeDeepSub`) | Route | Screen component (unchanged) |
|---|---|---|
| `overview` | `/overview` | `KartyOverview` |
| `orders` (default) | `/orders` | `OrdersTable` |
| `orders` / `catalogs_orders` | `/orders/catalogs` | `OrderCatalogs` |
| `orders` / `order_analytics` | `/orders/analytics` | `OrderAnalytics` |
| `orders` / `delivery_profiles` | `/orders/delivery-profiles` | `PlaceholderPage` (not built yet) |
| `orders` / `partners` | `/orders/partners` | `PlaceholderPage` (not built yet) |
| `inventory` / `catalogs` | `/inventory/catalogs` | `InventoryCatalogs` |
| `inventory` / `purchase` | `/inventory/purchases` | `PurchasesTable` |
| `inventory` / `purchase_return` | `/inventory/purchase-returns` | `PurchaseReturnsTable` |
| `inventory` / `transfer` | `/inventory/transfers` | `StockTransfer` |
| `inventory` / `stock` | `/inventory/adjustments` | `StockAdjustment` |
| `inventory` / `inventory_analytics` | `/inventory/analytics` | `InventoryAnalytics` |
| `items` | `/items` | `ItemsTable` |
| `stores` | `/stores` | `StoresGrid` |
| `vendors` | `/vendors` | `VendorsTable` |
| `customers` | `/customers` | `CustomersTable` |
| `users` | `/users` | `UsersTable` |
| `reports` | `/reports` | Reports tabs wrapper (Order/Inventory analytics) |
| `drive` | `/drive` | `DrivePage` |
| `settings` | `/settings` | `SettingsPage` |
| `finance` / `tasks` / `membership` / `leads` / `audit` | `/finance` … | `PlaceholderPage` (or shared-modules later) |
| (default `/`) | `/` | `Navigate` → `/overview` |

Cross-screen callbacks become navigations: `PurchaseReturnsTable onBackToInventory` →
`navigate('/inventory/catalogs')`; `CustomersTable/UsersTable onBack` → `navigate('/overview')`.

## Phased execution (each phase independently verifiable, nothing lost)

### Phase 0 — Safety net (prerequisite)
- The repo is **not under git**. Before refactoring, create a backup copy of
  `apps/mfe-karty` (or `git init` a checkpoint) so any step is reversible.
- `vite build` karty now to confirm a clean baseline.
- Capture a screenshot of every screen (via shell-host) as the **visual baseline** to
  diff against at the end. This is how we prove "no style lost".

### Phase 1 — Remove the nested router (low risk)
- Delete the inner `<BrowserRouter>` in `App.tsx`; rely on the shell's `HistoryRouter`
  from `mount.tsx`. `DashboardLayout` still works (state-based) — **zero visual change**.
- Verify deep-link/basePath now resolves under the shell.

### Phase 2 — Introduce `<Routes>` behind the existing chrome
- Convert `DashboardLayout`'s `renderContent()` switch into a `<Routes>` block rendered
  in the same content `<div>`. The chrome (rails, sidebar, topbar) stays exactly where
  it is and keeps its classes. Screens now mount via `<Route element={…}>` instead of
  the `if (activeSub === …)` ladder.

### Phase 3 — Rewire nav to navigation
- Replace `onClick={() => setActiveSub(item.id)}` with `navigate(item.path)` (paths
  already exist on the items).
- Replace `activeSub === item.id` / `activeDeepSub === sub.id` active highlighting with
  `useLocation()` + `matchPath` (or `NavLink` `isActive`). **Keep the exact same
  className expressions** so the active/hover styling is pixel-identical.
- Sub-menu expand: drive `expandedMenus` from the current path prefix (e.g. pathname
  starts with `/inventory` → Inventory group expanded), so deep-links open the right group.

### Phase 4 — Derive remaining UI state from URL
- Active highlight, expanded group, and the Reports inner tabs all read from
  `useLocation()`. Collapse toggle + mobile menu stay as local `useState` (pure UI).

### Phase 5 — Remove dead code (after parity confirmed)
- Once the new-karty-src screens render via routes, delete the unused parallel trees:
  `src/inventorynew/` and `src/pages/*Page.tsx` (confirm zero imports first). Keep the
  screens in `new-karty-src` since those are the styled ones in use.

### Phase 6 — Verify
- `tsc --noEmit` clean, `vite build` clean, `turbo serve` emits `remoteEntry.js`.
- Click through every route under shell-host; screenshot each and **diff against the
  Phase 0 baseline** for visual parity.
- Network tab: zero 404s (per repo's conversion rule).

## Open decisions (need your call)

1. **Chrome strategy.** Keep karty's full primary rail (preserves the look exactly, but
   it duplicates the shell's product rail) vs. trim to a bookings-style *secondary* nav
   and let the shell own the primary chrome. Recommendation: **keep as-is now** (zero
   visual change), revisit chrome-trim as a separate styling task.
2. **Unbuilt sub-items** (delivery profiles, partners, finance, tasks, membership, leads,
   audit): route them to `PlaceholderPage` now, or wire to `@jaldee/shared-modules`
   (Finance/Leads/Membership/Tasks exist there). Recommendation: Placeholder now, wire
   shared-modules as a follow-up.
3. **Git checkpoint** before starting (strongly recommended given no version control).

## What this plan explicitly does NOT do

- Does not rewrite or restyle any screen.
- Does not adopt HR's bare/chromeless layout.
- Does not touch the data hooks (already fixed).
- Does not change the mount contract (already v3.4 compliant).
