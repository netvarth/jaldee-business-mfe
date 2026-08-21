# Karty — "Perfect" Roadmap (Shopify-class)

> Goal: take karty from a back-office commerce backbone to a complete, production-grade
> commerce platform. Executed in strict phases. Each task ends with a verification step.
> Constraint: this environment can `tsc`-check the UI but cannot compile the Spring backend
> or run a federation build — **backend + live verification happen on your machine** at the
> end of each backend task. A pre-migration backup tarball lives at
> `apps/mfe-karty/.migration-backup-*.tar.gz`.

## Phase 0 — Make it run (gate, blocks everything)

- **0.1** Rebuild the karty remote (`turbo serve`) and confirm the route migration loads
  with no `RENDER_FAILED` (shell → karty → each screen). This must pass before Phase 1.

## Phase 1 — Polish & de-mock (make what exists production-perfect)

- **1.1 De-mock every real table.** Remove `INITIAL_*` seeds from Orders, Items, Inventory
  Catalogs, Order Catalogs, Purchases, Purchase Returns, Stock Transfers, Stock Adjustments,
  Stores, Vendors. Drive lists from live data unconditionally; add real loading / empty /
  error states (no stale mock on empty or failure).
- **1.2 Complete CRUD across modules.** Audit each module for missing create/edit/delete/
  status. Finish Customers first (backend `PUT`/`DELETE`, UI edit/delete), then sweep the rest.
- **1.3 Customers depth.** Groups & labels (wire base-crm `TenantConsumerGroup`/`Label`
  controllers), customer detail with real order history, server search + pagination.
- **1.4 Users.** Wire to the real users/staff backend (or honestly flag if none exists yet).
- **1.5 Real analytics & reports.** Replace mock Order/Inventory analytics with real
  aggregates (new commerce read endpoints: sales over time, top items, stock valuation,
  low-stock, category mix).
- **1.6 Drive.** Wire to the drive backend or flag as not-yet-available (no silent mock).
- **1.7 Phase-1 verification.** Full shell click-through, zero 404s, no mock rows anywhere.

## Phase 2 — New commerce pillars (toward Shopify)

- **2.1 Discounts & promotions.** ~~Build in commerce~~ — **handled by the finance module**;
  karty integrates with finance rather than building its own. (Dropped from karty scope.)
- **2.2 Tax engine.** Tax zones/rules + automatic calculation on orders/invoices.
- **2.3 Payments & checkout.** Payment methods + checkout flow + capture/refund
  (gateway integration is a credentials/ops task you perform, not me).
- **2.4 Shipping.** Zones, rates (flat + carrier-calculated), tracking, labels.
- **2.5 Storefront.** Customer-facing online store, product pages, cart→checkout, domains/SEO.

## Phase 3 — Platform (later)

- Marketing (email/SMS, abandoned cart, sales channels), multichannel/POS, app/extensibility,
  multi-currency/international, gift cards.

## Working rules

- No silent mocks — real data or an honest empty/error state.
- Each backend module follows the commerce 8-layer pattern; mirror existing controllers
  (Vendor/Item/Customer) for style.
- Each task: implement → `tsc` (UI) → document local build/run steps → you verify live.
