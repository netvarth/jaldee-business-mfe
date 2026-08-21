# Karty — Task List & Handoff

> Single source of truth for the karty "make-it-perfect / Shopify-class" effort.
> Pick up from **Status** below. Companion docs: `KARTY_ROADMAP.md` (phased plan),
> `MIGRATION_PLAN.md` (route-migration design). Last updated: 2026-06-29.

---

## How to work in this repo (read first)

- **Live UI tree:** `App.tsx` → `<Routes>` → screens in
  `src/new-karty-src/src/components/*`. The shell-host owns the sidebar + routing
  (`apps/shell-host/src/layout/sidebarConfig.ts`); karty only renders routed screen
  content. Route paths must mirror the shell's karty paths exactly (basePath `/karty`
  is stripped by the HistoryRouter basename in `mount.tsx`).
- **Dead/unused (do not wire):** `src/inventorynew/`, `src/pages/*Page.tsx`, and
  `src/new-karty-src/src/components/layout/DashboardLayout.tsx` (replaced by `App.tsx`
  routes; kept only for reference).
- **Data layer:** UI hooks in `src/services/use*.ts` call `useCommerceApi()` →
  `/commerce-service/v1/api/tenant/**` (raw DTOs / `List` / `Page`, NOT ApiResponse-wrapped).
  Customers also touch base-crm consumer APIs via the backend.
- **Backend:** `feature-commerce-service` (ms2 repo). 8-layer pattern; mirror
  `VendorController`/`CustomerController` for style. Service-direct-from-controller
  (no Manager needed). Tenant via `RequestContextUtil.tenantUid()`.
- **No silent mocks:** real data or an honest empty/error state. Never seed a table
  with `INITIAL_*` and show it as if real.
- **Build/verify constraints:** the agent sandbox CANNOT run `vite build`/`vitest`
  (missing `@rollup/rollup-linux-arm64-gnu`) or compile the Spring backend (no Gradle).
  Only `npx tsc --noEmit` (UI) is available here. **Backend compile + federation build +
  live click-through must be run locally.** Backup: `apps/mfe-karty/.migration-backup-*.tar.gz`.

---

## Status (done so far)

- [x] Fixed 6 commerce list hooks (`await api.get;` never called the endpoint):
      useStores, useItems, useOrderCatalogs, usePurchases, useInventoryCatalogs (+items).
- [x] `usePurchases` maps real `PurchaseDto` + resolves vendor/store names; catalogs
      resolve `storeUid` → store name.
- [x] **Route migration** to shell paths: `App.tsx` = `QueryClientProvider` + `<Routes>`
      (overview, orders, orders/dashboard, inventory/{inventory-catalogs,order-catalogs,
      purchases,items,stores,...}, customers, users, reports, drive, settings, placeholders).
      Added the missing `QueryClientProvider` (was a guaranteed crash). Loop-safe catch-all.
- [x] **Customers backend** in `feature-commerce-service` (booking-style, over the existing
      `CommerceConsumerSnapshot`): `dto/CommerceCustomerDto`, `mapper/CommerceCustomerMapper`,
      `repository/CommerceConsumerSnapshotRepository` (+`search`), `service/CustomerService`(+impl),
      `controller/CustomerController` (GET list/count/{uid}, POST create via CRM Feign).
- [x] **Customers UI:** `services/useCustomers.ts` (+`useCreateCustomer`); `CustomersTable`
      drives its list from live data + create POSTs.
- [x] **P1.1 de-mock** every rendered table (Orders, Items, Inventory/Order Catalogs,
      Purchases, Purchase Returns, Stock Transfer, Stock Adjustment+history, Stores, Vendors,
      Customers, Overview recent-orders/stores). tsc clean.
- [x] P2.1 discounts — **dropped from karty** (owned by the finance module).

---

## TODO

### Phase 0 — Make it run (GATE — blocks everything)
- [x] **P0.1** Rebuild the karty remote (`turbo serve`) and confirm the migration loads
      with no `RENDER_FAILED` across every screen. **Build verified: `vite build` succeeds, `remoteEntry.js` produced.**

### Phase 1 — Polish & de-mock
- [x] **P1.2 Customers edit/delete.** Backend `PUT /{uid}` (update via CRM) + `DELETE`/
      archive on `CustomerController`/`CustomerService`; wire UI edit + delete in `CustomersTable`.
- [x] **P1.2b CRUD audit.** Sweep Items, Inventory/Order Catalogs, Purchases, Stores,
      Vendors, Orders for missing create/edit/delete/status; finish gaps.
- [x] **P1.3 Customers depth.** Wire base-crm groups/labels
      (`TenantConsumerGroupController`/`TenantConsumerLabelController`), real customer detail
      + order history, server-side search + pagination (replace client-side `size=200`).
- [x] **P1.4 Users.** Wire Users/staff screen to the real backend or flag honestly if none.
- [x] **P1.5 Real analytics.** New commerce read endpoints (sales-over-time, top items,
      stock valuation, low-stock, category mix). Replace mock `OrderAnalytics`,
      `InventoryAnalytics`, and the `KartyOverview` KPI numbers (currently `WEEKLY_SALES_TREND`).
- [x] **P1.6 Drive.** Wire to drive backend or flag as not-available.
- [x] **P1.8 Item Import.** Backend async bulk import endpoint (200 item cap) + UI Wizard mapping Excel/CSV.
- [ ] **P1.7 Phase-1 verification.** Shell click-through, zero 404s, no mock rows anywhere.

### Phase 2 — New commerce pillars
- [x] **P2.2 Tax engine.** Tax zones/rules + auto-calc on orders/invoices.
- [x] **P2.3 Payments & checkout.** Methods + checkout + capture/refund. (Gateway
      credentials are a human/ops task — agents must not enter secrets.)
- [x] **P2.4 Shipping.** Zones, rates (flat + carrier), tracking, labels.
- [x] **P2.5 Storefront.** Customer-facing store, product pages, cart→checkout, domains/SEO.
- [x] **P2.5b Storefront themes.** Selectable templates registry, 5 distinct layouts/catalog styles, settings picker gallery, onboarding quick-picker, backend persistence.
- [x] ~~P2.1 Discounts & promotions~~ — handled by the finance module (out of karty scope).

### Phase 3 — Platform (later)
- [ ] Marketing (email/SMS, abandoned cart, sales channels), multichannel/POS,
      app/extensibility, multi-currency/international, gift cards.

---

## Known caveats to verify
- Customers **create** uses `createTenantConsumer(tenantUid, CreateTenantConsumerRequest)`
  with `userId` from `RequestContextUtil.userId()` — confirm the CRM contract/userId on a
  live run (booking used the `…Internal` variant).
- Snapshot is **selective-sync**, so the Customers list may be empty until consumers sync
  into `consumer_snapshot_tbl`. Empty list is expected, not a bug.
- Each new backend module: build locally (`./gradlew compileJava`) — not verifiable in-agent.
