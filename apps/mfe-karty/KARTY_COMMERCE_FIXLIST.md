# Karty · Commerce — Fix List & Backlog

Actionable follow-ups from the use-case test pass (2026-08-11). Companion to `KARTY_COMMERCE_TEST_FINDINGS.md`.
Priority: **P0** = correctness/data-integrity, fix first · **P1** = important gap/UX · **P2** = polish.

---

## A. Bugs to fix

| ID | Pri | Area | Bug | Where / proposed fix |
|----|-----|------|-----|----------------------|
| B-1 | **P0** | BE | **No double-submit protection on orders** — two identical `POST /orders` create two orders (00003 + 00004). | `OrderController.create` / `OrderServiceImpl.create`. Add an idempotency key (client `requestId` header or `(tenant, consumer, line-hash)` dedupe within a short window), mirroring the connection-PO idempotency (`order_request` unique index). |
| B-2 | **P0** | BE | **Opening-stock `apply` silently skips items not in the store's inventory catalog** — returns `200 APPLIED`, creates no stock, no warning. | `OpeningStockServiceImpl.postToEngine`: `resolveCatalogItem == null → continue`. Change to (a) auto-create the inventory-catalog item, or (b) fail with `ValidationException` listing the skipped items. Never return APPLIED with silent no-ops. |
| B-3 | P1 | BE | **Expired batch keeps status `IN_STOCK`** — allocation excludes it, but batch/stock reports still count it sellable. | Add an expiry sweep (scheduled) or compute status on read so a past-`expiryDate` batch reads `EXPIRED`; exclude from "sellable" aggregates. |
| B-4 | **P0** | BE | **Sales return has no over-return / cumulative-return guard** — return of 12 vs sold 6 accepted; re-return after full accepted (financial-integrity risk). | `SalesReturnService` create path — enforce `returnedBaseQty + newQty ≤ soldBaseQty` per order line (the `eligible/order/{uid}` endpoint already computes `returnableBaseQty`; apply it on create). |
| B-5 | P1 | BE | **Batch allocation is not FEFO** — draws later-expiry batch first, leaves earlier-expiry stock (A3). | `stockMovementService` allocation — order candidate batches by ascending `expiryDate` (nulls last) among non-expired. Ties to decision C-3. |
| B-6 | ⚠️ verify | BE | **Transfer receive may not credit destination** — in one run IN_TRANSIT deducted source but receive left status `IN_TRANSIT` and dest +0 (stock limbo). | Re-verify `StockTransferService.receive`; ensure destination stock is credited and status → `RECEIVED`, else it's stock loss. |
| UX-1 | P1 | FE | **Item create: required `Category` not enforced** — "Next" advances with it empty despite the `*`. | mfe-karty item-create wizard step 1 — block Next / show field error until Category set. |
| UX-3 | P1 | FE | **Items list has no price / stock / status columns** (only Item, Category, SKU, Variants, Track-Inv). | mfe-karty `ItemsTable` — add sellable price (default selling unit), on-hand, and status columns. |
| UX-4 | P1 | BE/FE | **Sequence prefixes are null for every document type** — numbering has no configured series (INV-, PO-, TO-…). | `commerce-settings/sequences` — support + surface prefix config; back-fill sensible defaults. |
| UX-8 | P2 | BE/FE | **`GET /batches` 400s without `catalogItemUid`** — no "list all batches" affordance. | Add an optional store/item-scoped batch list (paged) for a batches screen. |
| UX-5 | P2 | FE | Splash "kart y" logo overlays partially-loaded content during MFE mount (z-index/timing). | mfe-karty `KartySplash` — hold until content ready or lower z-index. |
| UX-6 | P2 | FE | Deep-linking to `/karty/...` reloads to shell root then re-mounts; URL not preserved; Karty collapses shell submenu. | shell-host routing / Karty history sync. |
| UX-7 | P2 | FE | Item create form scroll interactions intermittently hang the browser pane (heavy form + RTE). | Perf pass on the item form / rich-text editor. |

## Missing functionality to build

| ID | Pri | Area | Gap | Where / proposed fix |
|----|-----|------|-----|----------------------|
| F-1 | **P0** | BE | **Rx dispense has only `/quote`, no commit** — can't record a dispense against a prescription or reduce batch stock via the Rx path (A4/A5). | `RxDispenseController` — add `POST /rx-dispense` (commit): validate Rx unit, reduce the dispensed batch, persist against the prescription. |
| F-2 | P1 | BE | **No manual stock-reservation API (D7)** — `StockReservationEntity` + `onHold` exist but there's no controller to hold stock for a customer outside the order flow. | Add `StockReservationController` (reserve / release / list) driving `onHold`, with expiry. |
| F-3 | P1 | Data/BE | **Tiered price-list application not wired end-to-end** — lists now exist (Retail/Trade) but an order takes an explicit `unitPrice`; no auto-apply from customer→price-list. | Decide + implement server-side price resolution (see Conflict C-2). |

---

## B. Conflicts / decisions to resolve (need a call before/with the fix)

| ID | Conflict | Options | Needs |
|----|----------|---------|-------|
| C-1 | **Per-unit pricing (U4) vs create-UI copy** — doc U4 says each unit carries its **own** price (model has per-unit `sellingPrice`), but the create wizard step 2 says *"other selling units are priced automatically from their conversion."* | (a) Allow independent per-unit price in the UI and fix the copy; (b) keep auto-derive and drop the U4 claim. | Product decision, then FE fix (item form) + copy. |
| C-2 | **Price-list application semantics (K5/N5)** — should an order auto-resolve price from the customer's mapped price list, or does the client always send `unitPrice`? Today it's client-sent. | (a) Server resolves price from partner→price-list→unit; (b) client-sends, lists are reference-only. | Decision, then BE order-pricing (ties to F-3). |
| C-3 | **FEFO semantics (A3)** — "sell older batch first." Expired-exclusion is proven; ordering **among multiple non-expired** batches is unspecified/untested. | Confirm allocation = earliest-expiry-first among non-expired. | Confirm intended rule, then verify/adjust `stockMovementService` allocation. |
| C-4 | **Partner-connection "completeness"** — the source doc (K8) still says the connection workflow is *"in progress rather than complete."* We built the Karty UI + verified request/approve/scope/visibility this session. | Update the doc's K8 note; define what "complete" means (two-tenant order routing e2e still untested). | Confirm scope; run C-tests below. |

---

## C. Remaining tests — RUN 2026-08-11 (round 2)

- [x] **Fractional qty on integer-only unit** → ✅ rejected (422 "Fractional quantity not allowed for COUNT unit").
- [x] **Over-return / re-return** → 🔴 **FAIL** (accepted 12 vs 6; re-return after full accepted) → **B-4**.
- [x] **FEFO among non-expired batches** → 🔴 **FAIL** (drew later-expiry first) → **B-5** / decision **C-3**.
- [x] **ERP receipt loop** PO → purchase → approve → stock → ✅ (+24 exact).
- [x] **Order-request → convert → sales order** → ✅ (CONVERTED, order created).
- [x] **Bulk item import (K1)** → ✅ per-row failure reporting.
- [x] **BOM consume-on-sale (N3)** → ✅ (1 box consumed 2×A + 3×B). *Note: no separate assemble/produce-to-stock step.*
- [x] **Barcode scan → resolution (D2/A7)** → ✅.
- [~] **Stock-transfer lifecycle (K4)** → ⚠️ create + IN_TRANSIT deduct source ✅; receive-to-dest not completed → **B-6** (verify).
- [~] **Purchase return (K7)** → ✅ create; stock effect needs processing step.
- [~] **Order invoice (E3 tail)** → endpoint validates; needs a typed invoice body (not completed).
- [ ] **Cross-tenant read denied** → ⬜ blocked (needs 2nd tenant).
- [ ] **Two-tenant dealer→distributor routing** → ⬜ blocked (needs 2nd tenant).
- [ ] **Price-list auto-application** → ⬜ deferred to decision **C-2**.

---

## Suggested order of attack
1. **P0 BE correctness:** B-1 (order idempotency), B-2 (opening-stock silent skip), F-1 (Rx commit).
2. **Decisions:** C-1, C-2 (unblock pricing work), C-3.
3. **P1:** B-3, F-2, UX-1, UX-3, UX-4, F-3.
4. **Remaining tests (C)** — run alongside as each area is fixed.
5. **P2 polish:** UX-5/6/7/8.

**Test data note:** the `ZZ-TEST` items / `ZZ-BATCH-*` / price lists / orders `00001`–`00004` are in `Test Business`; keep for the remaining tests or clean up when done.
