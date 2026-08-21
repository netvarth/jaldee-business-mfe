# Karty MFE — Engineering Handoff

> **Audience:** an engineer taking over `apps/mfe-karty` (the Karty / KAR-tee frontend).
> **Scope:** this MFE. Backend lives in the separate `jaldee-ms` repo —
> `feature-commerce-service/COMMERCE_SERVICE_HANDOFF.md` and `docs/commerce/*` there cover the services.
> **Read the repo root [`../../CLAUDE.md`](../../CLAUDE.md) first** for the MFE contract, pinned versions,
> and the "saved ≠ works" verification rule. This doc doesn't repeat them.
> **Measured against code 2026-08-20.**

## 1. What this is

The frontend for **Karty (karty.in)** — order management, inventory, and a consumer-facing **digital
storefront** for business owners, being extended with a **logistics** module (partner connections /
delivery). It is one **Vite Module Federation** micro-frontend in the `jaldee-business-ui` monorepo, loaded
at runtime by `shell-host`.

| | |
|---|---|
| Package / federation name | `mfe-karty` / `mfe_karty` |
| Dev port | **3005** |
| Exposes | `./mount` → `src/mount.tsx` |
| Shell env var | `VITE_KARTY_URL` (dev: `/mfe-karty` → proxy to `:3005`) |
| Shell route | `/karty/*` (wrapper `shell-host/src/mfes/KartyMFE.tsx`) |
| Backend | `feature-commerce-service` (`/commerce-service`), + base-crm, finance via gateway |
| Pinned stack | React 18.2, react-router 6.22.3, TS 5.4.5, Vite 5.2.14, Tailwind 3.4.3 — **do not upgrade** |

Extra deps beyond the standard set: `@tanstack/react-query`, `motion`, `xlsx`, `lucide-react`.

---

## 2. Mount contract (v3.4)

`src/mount.tsx` exports `mount / unmount / updateProps / CONTRACT_VERSION` (`"3.4"`, checked by shell on
mount). Rendering chain:

```
MFEPropsContext.Provider → HistoryRouter(history=props.history, basename=props.basePath)
  → MFEErrorBoundary → <App/>
```

Uses `unstable_HistoryRouter` with the shell-supplied `props.history` (not `BrowserRouter`). Read
auth/context via `useMFEProps()` — never `window`/`localStorage`. `basePath` ("/karty") is stripped by the
router basename.

**Two API clients are initialised on every mount** (`ensureApiClientInitialized` + `setShellHttpBridge`) —
this is deliberate, see §3.

---

## 3. API architecture — the part to understand first

Karty is a **hybrid**: it talks to the microservices with **hand-rolled `fetch` hooks**, and to the
**legacy provider REST** through the shared `@jaldee/api-client` singleton. These are two separate paths.

### 3a. Microservice calls — hand-rolled `fetch` hooks (the main path)

`src/services/*` (~65 hooks) call the gateway context-paths **directly** with `fetch`, bypassing
`@jaldee/api-client` entirely. Three base clients:

| Hook | Base path | Timeout | Special headers |
|---|---|---|---|
| `useCommerceApi` | `/commerce-service` | **read 15s / write 45s** | `X-Product-Context` + `X-Product` (see §4) |
| `useCrmApi` | `/base-service` | 4s | — |
| `useFinanceApi` | `/finance-service` | 4s | — |

All send `credentials: "include"` + `Authorization: Bearer <authToken>` and parse the platform error
envelope (`code` / `message` / `details`) onto the thrown `Error`.

**Why commerce writes get a 45s budget:** a write (order/return/stock create) runs a real backend
transaction — stock reservation, consumer stamping, outbox. A 4s client cap aborted writes that the server
still committed, producing a **false "timeout" that duplicated the order on retry**. Don't lower the write
timeout, and don't add blind retry-on-timeout to writes.

> **Order idempotency (backend, 2026-08-20):** `feature-commerce-service` now dedupes order creates on a
> **`clientRequestId`** — a repeat with the same id returns the original order instead of a duplicate
> (`ConflictException DUPLICATE_ORDER_REQUEST`). For this to protect double-submits, the **order-create
> hook must generate and send a stable `clientRequestId`** in the POST body (one per user submit, reused
> on retry). Verify the create path does this; if it doesn't, wire it up.

### 3b. Legacy provider REST — the `@jaldee/api-client` singleton

`src/lib/apiClient.ts` initialises the shared `apiClient` against `…/provider/karty` (from
`VITE_API_BASE_URL`). `src/lib/httpClient.ts` wraps it with a `shellHttpBridge` (the shell's `props.api`).
This path is used **only by `@jaldee/shared-modules`** code (e.g. `analyticsService`) that imports
`apiClient` directly.

> **Why both are initialised in `mount.tsx`:** shared-modules import the `apiClient` singleton directly,
> bypassing the `httpClient.ts` bridge. Treating them as either/or left that singleton `undefined`, so
> every direct consumer threw *"Cannot read properties of undefined (reading 'post')"*. `mount` always
> calls `ensureApiClientInitialized`, and *also* `setShellHttpBridge(props.api)` when the shell provides
> one. Keep both.

---

## 4. Product context — data-isolation contract (critical)

`feature-commerce-service` serves **two verticals from one DB** and **fails OPEN to `E_COMMERCE`** if the
`X-Product-Context` header is missing. So every commerce call **must** stamp the header, or a health/
pharmacy screen leaks retail data (and vice-versa).

`resolveCommerceProductContext(mfeProps)` in `useCommerceApi.ts` resolves it: explicit prop
(`productContext` / `product`) → else route sniff (`/health`, `/pharmacy`, `/rx`, `/dispense`,
`/drug-register`, `/ayush`, …) → default `E_COMMERCE`. Karty screens resolve to **`E_COMMERCE`**; the same
service under mfe-health must resolve to `HEALTHCARE`. If you add a pharmacy route, make sure the resolver
matches it, or it'll leak.

---

## 5. Structure

```
src/
  mount.tsx / App.tsx / main.tsx        # entry + router
  lib/            apiClient.ts, httpClient.ts, format.ts
  services/       ~65 hooks (useCommerceApi, useCrmApi, useFinanceApi, useOrders, useItems, …)
  pages/          top-level screens (OrderDashboard, OrderDetail, InventoryDashboard, Requests,
                  SalesReturns, Logistics, DeliveryProfiles, Stocks, Partners, Connections,
                  PriceLists, Reviews, AuditLog, TaxInvoice, customerDetail/, pharmacy/,
                  inventory/, shipping/, shared/)
  new-karty-src/src/components/         # the BULK of screens (ported standalone app):
                  OrdersTable, ItemsTable, InventoryCatalogs, OrderCatalogs, Create* wizards,
                  Purchases*, KartyOverview, storefront/ (themes, cart, checkout), Settings tabs
  inventorynew/components/              # CreateCatalog, CreateSalesReturn, StockLedgerHistory, …
  components/composer/                  # storefront page composer
```

`new-karty-src/` is the ported standalone app; most feature screens live there, not under `pages/`. Two
naming worlds coexist (`pages/` vs `new-karty-src/`) — grep both when hunting a screen.

### Routes (`App.tsx`)

- **Storefront:** `/store` (`DynamicStorefrontLayout`), `/store` index (`DynamicStorefrontHome`),
  `/store/checkout` (`StorefrontCheckout`).
- **Admin:** `/` & `/dashboard` (`KartyOverview`); `/orders`, `/orders/dashboard|catalogs|requests|
  sales-returns|active-carts|logistics|delivery-profiles|reviews`, `/orders/:uid`,
  `/orders/:uid/tax-invoice`; `/inventory/*` (catalogs, purchases, purchase-returns, transfers,
  adjustments, stocks, racks, audit-log); `/items`, `/stores`, `/inventory/vendors`, `/customers`,
  pharmacy routes. Several legacy paths `Navigate`-redirect to canonical ones.

### Customers

`CustomersPage.tsx` mounts the shared **`CustomersModule`** from `@jaldee/shared-modules` (same module
mfe-health and mfe-lending use). The customer-detail **Orders** tab reads
`GET /commerce-service/v1/api/tenant/customers/{uid}/orders`. A Karty customer *is* a base-crm consumer
(backend keeps a snapshot — see the base-crm integration doc).

### Storefront

`new-karty-src/src/components/storefront/` — `StorefrontCartProvider`, `StorefrontCartDrawer`,
`StorefrontCheckout`, `StorefrontSettingsTab`, `ThemeGallery`, `themes/`. This is the consumer-facing
digital shop (theme-driven). The cart is client-side state via the provider.

### Shared packages used

`@jaldee/design-system` (use these primitives, not raw HTML/Tailwind), `@jaldee/auth-context` (MFE
contract), `@jaldee/api-client`, `@jaldee/shared-modules` (Customers, etc.), `@jaldee/event-bus`.

---

## 6. Known issues (FE)

From `KARTY_COMMERCE_FIXLIST.md` (2026-08-11, FE items) + the item-form saga in the repo `CLAUDE.md`.
**These are as of the 2026-08-11 pass — re-verify against current code before acting.** The *backend*
backlog from that same pass has since been largely closed (see the commerce handoff §10), so some of
these FE items may already be resolved too.

| ID | Pri | Issue |
|---|---|---|
| UX-1 | P1 | Item create: required **Category not enforced** — "Next" advances with it empty. |
| UX-3 | P1 | **Items list has no price / stock / status columns** (only Item, Category, SKU, Variants, Track-Inv). |
| UX-5 | P2 | Splash "karty" logo overlays partially-loaded content during mount (z-index/timing). |
| UX-6 | P2 | Deep-linking to `/karty/...` reloads to shell root then re-mounts; URL not preserved. |
| UX-7 | P2 | Item create form scroll intermittently hangs the pane (heavy form + RTE). |
| — | note | `useCrmApi.ts` has a stale docstring ("Commerce service client") and dead code (`baseUrl`/`authHeader` computed, unused). Harmless; tidy when touched. |

**The item-form mapping saga (read before touching the item form).** Multiple prior agents "fully
verified" the item form and still shipped 7 broken fields (brand not shown; barcode/weight/tax/itemType/
additional-info silently dropped; variants faked; edit persisted nothing). The backend `ItemDto`/
`ItemEntity` already round-trips all of it (dedicated columns + a jsonb `attributes` map) — **the fault
was the FE mapping layer.** So for any item-form change, "verified" MUST mean all four:

1. **Full-payload diff** — every field the form renders appears in the actual POST/PUT body (read
   `read_network_requests`, don't eyeball). Fields with no dedicated column ride in `attributes`.
2. **Read-back** — open the DETAIL view *and* the EDIT form; each field displays and pre-loads.
3. **Edit path** — save an edit; confirm the PUT body is non-empty and preserves everything.
4. **Rebuild** (`vite build`) + reload before trusting the preview; `tsc` alone is not enough.

---

## 7. Build & run

```bash
# From repo root
npm run serve      # turbo build + preview all — federation needs a real build (vite dev does NOT emit remoteEntry.js)
# This app only
vite build         # must emit dist/assets/remoteEntry.js — a broken remoteEntry silently breaks the shell
npm run dev        # component dev on :3005 (not federation-valid)
npm test           # vitest
```

A live click-through needs the backend up behind the gateway: **commerce `:9105`, base-crm `:9002`,
finance `:9101`, gateway `:8080`**, shell + MFE on `:4000`/`:3005`. Always finish a change with a network-
tab pass (zero unexpected 404s), per the repo's no-silent-mocks rule.

---

## 8. Planning / history docs in this folder

Context for prior work (not all current): `KARTY_ROADMAP.md`, `MIGRATION_PLAN.md`,
`ORDERSTABLE_SPLIT_PLAN.md`, `STOREFRONT_THEMES_PROMPT.md`, `ITEM_IMPORT_SPEC.md`,
`KARTY_DASHBOARD_REMEDIATION.md`, `PREVIEW_TEST_RUNBOOK.md`, and the test pass
`KARTY_COMMERCE_TEST_FINDINGS.md` + `KARTY_COMMERCE_FIXLIST.md` (the most useful — real verified status
and the bug backlog).
