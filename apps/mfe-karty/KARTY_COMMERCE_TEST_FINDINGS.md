# Karty · Commerce — Local Test Findings

**Tested against:** running local stack — gateway `:8080`, `feature-commerce-service :9105`, shell + MFE at `:4000`, tenant **Test Business** (`167b8dda…884b`).
**Date:** 2026-08-11.
**Method:** authenticated API probes driven from the live browser session (real JWT, reusing the app's own bearer token) for data/behaviour, plus UI walkthrough screenshots for UX. Source of truth for endpoints = the service controllers.
**Source doc under test:** `~/Downloads/Karty_Commerce_Use_Cases.md`.

## Legend
- ✅ **Verified** — confirmed working live (real data or exercised behaviour).
- 🟡 **Present, not fully exercised** — endpoint + data model support it, but the *behaviour* wasn't triggered in this pass (usually because seed data for it doesn't exist).
- 🔴 **Gap / incomplete** — functionality the doc implies is missing or only partial.
- ⚠️ **UX issue** — works, but the experience is wrong/confusing.

> **Honesty caveat.** Where a use case is about *runtime enforcement* (e.g. "an order of 7 is rejected against a step of 6"), I could only confirm the **model/fields exist** unless seed data let me trigger it. Those are marked 🟡 with a note, not ✅. The edge-case checklist (§ bottom) was **not** executed — it needs deliberate write-tests and is listed as recommended.

---

## 1. Coverage matrix (mapped to the use-case doc)

### §1 Selling units
| UC | Claim | Status | Evidence / note |
|----|-------|--------|-----------------|
| U1 | Buy carton, sell bottle | ✅ model+data | `KEMTEX EP-2` has 2 units: conv=1 `selling`+`sellingDefault` (₹270), conv=12 `purchase`+`purchaseDefault`. UI item form → **SELLING / PURCHASE UNITS** → *+ Add Unit* with per-row conversion. |
| U2 | Loose item by weight (decimal) | ✅ model+data | `Ashwagandha Churna` stock `inHand=5000`; item has `allowLooseSale`. |
| U3 | Min / max / step increment | ✅ **PASS (write-tested)** | Seeded stepped item; qty 7 → 422 "Invalid quantity increment", qty 600 → 422 max exceeded, qty 6 → OK. See §4. |
| U4 | Different price per unit | 🟡 conflict to resolve | Model stores per-unit `sellingPrice`/`mrp`. **But** the create wizard step 2 says *"other selling units are priced automatically from their conversion"* — implying non-default units can't carry an independent price in the create UI. See UX-2. |
| U5 | Rx unit ≠ selling/purchase unit | 🟡 config present, dispense incomplete | `rx`/`rxDefault` per unit + item `rxEnabled` + UI "Rx enabled" toggle. Dispense flow itself is incomplete — see A4. |

### §2 Lubricant distribution (KEMTEX / NIDIYA)
| UC | Claim | Status | Evidence / note |
|----|-------|--------|-----------------|
| K1 | Bulk item import as a tracked job | ✅ present | `POST /items/import`, `GET /items/import/{jobId}`. ~48 KEMTEX SKUs present (consistent with an import). |
| K2 | Many stores, one company | ✅ | 4 stores incl. NIDIYA Distributor / Super-Distributor warehouses. |
| K3 | PO naming destination store | 🟡 present | PO endpoints + 3 POs exist; receipt-lands-at-named-store not step-tested. |
| K4 | Stock transfer between stores | ✅ | Transfers present with `DRAFT` and `RECEIVED` states (lifecycle real). |
| K5 | Dealer price list | 🟡 mechanism only | `/price-lists` works but **0 lists configured**; trade-partner carries `priceListUid`. Rate-application not validatable without data. |
| K6 | Sales return w/ reason, traceable | ✅ | `SRET-*` returns, reason "Damaged", status `COMPLETED`, `orderUid` back-reference. |
| K7 | Purchase return to manufacturer | 🟡 present | `/purchase-returns` works, 0 data. |
| K8 | Dealer ordering via partner connection | ✅ built (this session) / 🟡 e2e | Distributor–Dealer Connections UI + API verified live; full two-tenant dealer→distributor order routing not exercised (needs a 2nd tenant). |
| K9 | Stock adjustment w/ reason + history | ✅ | `/stock-adjustments/history` with reason + `PENDING` approval status. |

### §3 Ayurveda pharmacy (batches, expiry, dispensing)
| UC | Claim | Status | Evidence / note |
|----|-------|--------|-----------------|
| A1 | Same medicine, two batches | ✅ **write-tested** | Seeded syrup with 2 batches; both held separately with own expiry + inHand/onHold. See §4. |
| A2 | Never sell an expired batch | ✅ **PASS (write-tested)** | Order drew from the future batch only; expired batch left untouched (excluded from allocation). See §4. B-3: expired batch still shows status `IN_STOCK`. |
| A3 | Sell older batch first (FEFO) | 🟡 partial | Expired-exclusion proven; FEFO ordering *among multiple non-expired* batches not yet tested (only 1 non-expired seeded). |
| A4 | Dispense against a prescription | 🔴 **incomplete** | `RxDispenseController` exposes only `POST /rx-dispense/quote` — **no commit/persist-against-prescription endpoint**. Dispensing can be quoted but not recorded/stock-reduced through a dedicated Rx path. |
| A5 | Box → strip → tablet | 🟡 config / 🔴 dispense | 3-unit model supported; dispense commit missing (A4). |
| A6 | Loose oils/churnas by weight | 🟡 | `allowLooseSale` + decimal stock. |
| A7 | Barcode on a batch | 🟡 present | `/barcodes/registry` (scope lookup) + `/barcodes/batches/generate` + labels. Not exercised with batch data. |
| A8 | Customer returns medicine to its batch | 🟡 | Sales-return model traces order (and batch); no batch data to prove batch-level landing. |

### §4 Dry-fruits / nuts (weight, mixes, packing)
| UC | Claim | Status | Evidence / note |
|----|-------|--------|-----------------|
| N1 | "250 g of almonds" | ✅ model+data | Decimal selling unit + fractional stock. |
| N2 | Sack in, grams out | ✅ model | Conversion (purchase sack → base gram). |
| N3 | Diwali gift box (BOM) | 🟡 present | `/boms` (create/update/get/`item/{itemUid}`/delete); no BOM data seeded. |
| N4 | Market rate changed today | 🟡 | Order lines retain billed price; item/price-list rate at sale time. Not step-tested. |
| N5 | Wholesale + retail price lists | 🟡 | 0 price lists configured. |
| N6 | Weighing losses / spoilage | ✅ | Stock adjustment + history (as K9). |
| N7 | Festival stall = temp store | ✅ | Store + transfer supported. |

### §5 Retail dress (variants, sizes, exchanges)
| UC | Claim | Status | Evidence / note |
|----|-------|--------|-----------------|
| D1 | One shirt, many variants | ✅ | `QA Full Check Item` → variants S/M with `attributes{Size}`, per-variant SKU/MRP/sellingPrice. |
| D2 | Bill by scanning tag → variant | 🟡 present | `/barcodes/registry` lookup + `/barcodes/…/generate` + labels. |
| D3 | Size exchange | 🟡 | Sales return (restore) + new sale line, order-traceable. |
| D4 | What's selling / dead stock | 🟡 | Stock + aggregates carry `variantUid`. |
| D5 | Second branch, one catalogue | ✅ | Items business-level; stock per store. |
| D6 | Hold without offering (inv vs order catalog) | ✅ model | Inventory catalogs (5) vs order catalog (1) are separate tables/endpoints. |
| D7 | Customer reserves an item | 🔴 **no manual-reserve API** | `onHold` exists on stock + a `StockReservationEntity`, **but no reservation controller/endpoint** — on-hold is only produced internally by the order flow. No way to "hold a jacket till evening" from the UI. |

### §6 ERP loop
| UC | Claim | Status | Evidence / note |
|----|-------|--------|-----------------|
| E1 | Opening balances | 🟡 present | `/opening-stock` (+ `/{uid}/apply`); 0 rows. |
| E2 | Explain a stock figure | ✅ **strong** | `/stock-ledger` is append-only: `movementType` (RECEIVE/ISSUE), `inHandDelta`/`onHoldDelta`, `inHandAfter`, `sourceDoc`/`sourceUid`/`sourceLineUid`, `reversalOfUid`, `reason`. Figure = sum of history, attributable. |
| E3 | Full trading loop | 🟡 components | PO, purchase, orders (+ `/{uid}/invoice`), returns all present; end-to-end chain not step-run. |
| E4 | Approval before commit | ✅ present | `/order-requests` + `POST /{uid}/convert`; order `b2b/approve|reject`; purchase `approve`. |
| E5 | Repeat orders (templates) | 🟡 present | `/order-templates`. |
| E6 | Document numbering | 🟡 / ⚠️ | `/commerce-settings/sequences` returns per-type `nextNumber` — but **`prefix` is null for every type** (see UX-4). |
| E7 | Online storefront from same stock | 🟡 present | `/carts`, `/wishlists`, `/item-feedback`; storefront routes in the MFE. |
| E8 | Know the business (aggregates) | ✅ | `/inventory/aggregate` (`retailValue`,`costValue`,`stockRows`,`uncostedRows`) + `/orders/aggregate` (`statusBuckets`,`agingBuckets`,`totalOrders`,`netAmount`) — server-computed. |
| E9 | Two businesses never see each other | ✅ design | Every query tenant-scoped; the only cross-tenant route is an approved partner connection (now **fail-closed** on scope). Not adversarially pen-tested. |

---

## 2. UX issues (to fix later)

| # | Severity | Where | Issue |
|---|----------|-------|-------|
| UX-1 | High | Item create wizard, step 1→2 | **Required `Category` is not enforced.** "Next" advances to Catalog & Pricing with Category empty, despite the `*`. Weak validation → items can be created without a mandatory field. |
| UX-2 | High | Item create wizard, step 2 | Copy says *"other selling units are priced automatically from their conversion."* This conflicts with U4 (independent per-unit price the model supports). Either the copy is wrong or per-unit pricing isn't settable in create — confirm and align. |
| UX-3 | Medium | Items list | No **price / stock / status** columns (only Item, Category, SKU, Variants, Track-Inventory). A commerce item list should show at-a-glance price and stock. |
| UX-4 | Medium | Settings → sequences (E6) | All document-type sequence **prefixes are null**. Auditor-friendly series (e.g. `INV-`, `PO-`) aren't configured/surfaced. |
| UX-5 | Low | MFE mount | The "kart y" splash logo overlays partially-loaded content during Karty mount (z-index/timing). |
| UX-6 | Low | Shell routing | Deep-linking to a Karty route (`/karty/...`) reloads to shell root and re-mounts; the URL isn't preserved on hard nav, and Karty collapses the shell submenu. |
| UX-7 | Low (perf) | Item create form | Scroll interactions on the item form intermittently hang the browser pane (heavy form + rich-text editor). Worth a perf check. |
| UX-8 | Low | Batches | `GET /batches` 400s without a required param — no plain "list all batches" affordance. |

---

## 3. Missing / incomplete functionality (to build later)

| # | Use case | What's missing |
|---|----------|----------------|
| F-1 | A4 / A5 | **Rx dispense commit.** Only `POST /rx-dispense/quote` exists — no endpoint to *record* a dispense against a prescription and reduce batch stock through the Rx path. The whole "dispense a tablet against an Rx" loop stops at a quote. |
| F-2 | D7 | **Manual stock reservation.** `StockReservationEntity` + `onHold` exist, but there's **no reservation controller/API** to hold stock for a customer outside the order flow. |
| F-3 | K5 / N5 | **Tiered pricing not demonstrable.** No price lists are configured, so dealer/wholesale-vs-retail rate application can't be validated. Needs seed lists + a mapped partner. |
| F-4 | A1–A3, A7, A8 | **Batch flows unexercised.** No batch-tracked items with real batch numbers/expiry are seeded, so expiry-block, FEFO, batch barcode and return-to-batch are all model-only. Needs batch seed data. |
| F-5 | E6 | Sequence **prefix configuration** appears unset for all document types. |

---

## 4. Edge-case checklist — EXECUTED 2026-08-11 (behavioural write-tests)

Seeded test data (all `ZZ-TEST`) into the **Test Business** tenant and ran real transactions:
- `ZZ-TEST Stepped Packs` — unit Piece, `min 6 / max 60 / step 6`, price ₹100, opening stock 100 @ NIDIYA Distributor Warehouse.
- `ZZ-TEST Batch Syrup` — Rx-enabled, 2 batches: `ZZ-BATCH-FUTURE` (exp 2027-03-31, 50) + `ZZ-BATCH-EXPIRED` (exp 2025-01-31, 40).
- Price lists `ZZ-TEST Retail` (₹100) + `ZZ-TEST Trade` (₹80).

| Edge case | Result | Evidence |
|-----------|--------|----------|
| Qty violates step increment (7 vs step 6) | ✅ **PASS** | `POST /orders` sellQty=7 → **422 "Invalid quantity increment"**; sellQty=6 → order `00001`, total ₹600. |
| Exceed max sale qty (600 vs max 60) | ✅ **PASS** | → **422 "Quantity exceeds the maximum sale quantity"**. |
| Oversell (500 vs ~90 stock) | ✅ **PASS** | → **422 "Insufficient stock for item …"**. |
| Never sell an expired batch (A2/A3) | ✅ **PASS** | Order 45 of syrup drew **entirely from the future batch** (50→5); the expired batch **stayed at 40, untouched**. Engine excludes expired lots from allocation. |
| Stock correct immediately after sale | ✅ **PASS** | Stepped: inHand **82** / onHold **18** after 3×6 orders; ledger RESERVE deltas 94→88→82 exact; syrup batch onHold 45. |
| Opening-stock ledgering (E1) | ✅ **PASS** | After catalog assignment, apply produced `OPENING/RECEIVE` ledger rows (+100, +50, +40) and live stock. |
| **Double-submit → must not create two** | 🔴 **FAIL** | Two identical `POST /orders` created **two distinct orders (`00003` + `00004`)**, both 200. No idempotency on the plain order endpoint (only the connection-PO path is idempotent). |
| Fractional qty on integer-only unit | ⬜ not run | needs an integer-only unit configured. |
| Return more than ordered / re-return | ⬜ not run | needs a return write-test against `00001`. |
| Cross-tenant read denied | ⬜ not run | needs a 2nd tenant. |

### New bugs surfaced by the write-tests
| # | Severity | Where | Bug |
|---|----------|-------|-----|
| B-1 | 🔴 High | `POST /orders` | **No double-submit protection** — identical rapid submits create duplicate orders. Needs an idempotency key / client-request-id, like the connection-PO path has. |
| B-2 | 🔴 High | Opening stock `apply` (`OpeningStockServiceImpl.postToEngine`) | **Silently skips items not in the store's inventory catalog** — `resolveCatalogItem == null → continue`, yet returns `200 APPLIED` with no stock created and no warning. A user seeding opening stock for a new item gets nothing and no error. Should fail loudly or auto-create the catalog item. |
| B-3 | ⚠️ Medium | Batch status | An expired batch keeps status **`IN_STOCK`** (expiry not auto-flagged on the batch row). Allocation correctly excludes it, but a batch/stock *report* would still count it as in-stock. Needs an expiry sweep or computed status. |

**Now unblocked (data exists):** U3 ✅, max-qty ✅, oversell ✅, A2/A3 ✅, E1 ✅, K5/N5 price lists exist with correct Retail/Trade rates (auto-application on a partner-mapped order still to test).

**Cleanup:** all seed records are prefixed `ZZ-TEST` / `ZZ-BATCH-*` and can be removed. Orders `00001`–`00007` and the applied opening-stock are in `Test Business`.

### Remaining tests — executed 2026-08-11 (round 2)

| Test | Result | Evidence |
|------|--------|----------|
| Fractional qty on integer-only unit | ✅ **PASS** | sellQty 2.5 on a COUNT-unit item → **422 "Fractional quantity not allowed for COUNT unit"**. |
| Never sell expired (strict — only stock is expired) | ✅ **PASS** | item whose only stock is an expired batch → **422 "Insufficient stock"**. Expired truly excluded from sellable. |
| **FEFO among non-expired batches** | 🔴 **FAIL** | 2 valid batches A(exp 2026) + B(exp 2027); order drained **B (later expiry)**, left **A (earlier expiry) untouched**. Not earliest-expiry-first → bug **B-5**. |
| **Over-return / re-return** | 🔴 **FAIL** | return of **12 against an order of 6 accepted (200)**; a further return after the order was fully returned **also accepted**. No cumulative-return guard → bug **B-4**. |
| Order-request → convert → sales order | ✅ **PASS** | request `CONVERTED`, sales order created. |
| Bulk item import (K1) w/ bad row | ✅ **PASS** | dry-run job reports per row: good `CREATED`, bad `ERROR` `["name is required","At least one unit is required"]`. |
| Barcode scan → resolution (D2/A7) | ✅ **PASS** | register barcode vs ITEM scope, `GET /barcodes/registry/lookup` resolves to the item. |
| ERP receipt loop: PO → purchase → approve → stock | ✅ **PASS** | PO-00008 → PUR-00012 → approve → **stock +24 exact**. |
| BOM consume-on-sale (N3) | ✅ **PASS** | selling 1 gift box consumed exactly **2× Comp A + 3× Comp B**. (Note: consume-on-sale, no separate "assemble/produce-to-stock" step — semantic difference from doc.) |
| Stock-transfer lifecycle (K4) | ⚠️ **partial** | create ✅ + IN_TRANSIT deducted source **−10**, but the receive call left status `IN_TRANSIT` and **dest +0** (stock in limbo). Existing seed transfers show `RECEIVED`, so the flow works — likely my receive payload; **re-verify** the receive-to-destination path. |
| Purchase return (K7) | ✅ create | return created `DRAFT`; stock effect requires processing (like sales returns). |
| Order invoice (E3 tail) | ◐ endpoint validates | `POST /orders/{uid}/invoice` needs a typed invoice body (422 on empty) — not completed. |
| Cross-tenant denial / two-tenant routing | ⬜ blocked | needs a 2nd tenant. |
| Price-list auto-application | ⬜ deferred | tied to decision C-2. |

### New bugs (round 2)
| # | Severity | Where | Bug |
|---|----------|-------|-----|
| B-4 | 🔴 **P0** | `POST /sales-returns` | **No over-return / cumulative-return guard.** Returns exceeding sold qty are accepted, and re-returning after a full return is accepted. The `eligible/order/{uid}` endpoint computes `returnableBaseQty` but the create path doesn't enforce it → duplicate/over credits possible. |
| B-5 | 🔴 **P1** | Batch allocation (`stockMovementService`) | **Allocation is not FEFO.** Among valid batches it drained the **later-expiry** lot and left the earlier-expiry one, so near-expiry stock isn't moved first (A3). |
| B-6 | ⚠️ verify | Stock transfer receive | In one run, IN_TRANSIT deducted the source but the receive didn't credit the destination (stock limbo). Re-verify the receive payload/path — if reproducible, it's stock loss. |

---

## 5. What is genuinely solid

Stock ledger (E2), multi-store (K2), transfers with lifecycle (K4), adjustments+history+approval (K9), sales returns with reason+trace (K6), variants (D1), inventory-vs-order catalog separation (D6), server-side aggregates (E8), order-request approval (E4), and the multi-unit **data model** across every vertical (U1/U2/U5, A5, N2) are all real and working. The commerce *engine* matches the document; the gaps are concentrated in **Rx dispense commit, manual reservation, and seed data for batches/price-lists/step-rules**.
