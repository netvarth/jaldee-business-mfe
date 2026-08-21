# Karty — Functional / Workflow Gap Audit

**Goal:** find where a Karty module *exists* but does **not** implement the full intended
workflow — missing stages, missing state transitions, or a missing "convert / promote"
handoff between modules. This is a **planned-vs-actual completeness** audit, not a visual one.

**Trigger:** demo feedback — "too many gaps; e.g. Purchase Request is a separate module but
should be the **first stage of purchase**, with its own stages and a **Convert → Purchase**
button; right now it's flat."

**Method (per module):**
1. **Intended lifecycle** — from three sources: the `docs/karty/` specs (esp.
   `PURCHASE_ORDER_AND_ENTRY_FLOW.md`, `Karty_Commerce_Use_Cases.md`, `00_CURRENT_STATE.md`),
   the backend **`*Status` enum** (the lifecycle the data model already encodes), and the
   controller's **transition / convert endpoints**.
2. **Actual** — what the UI + backend truly expose: are the stages shown? Can you move
   between states? Is the convert/handoff step present, or is it flat CRUD?
3. **Gap class:**
   - **W1** Missing stages — flat list where a staged lifecycle was planned.
   - **W2** Missing convert/handoff — no promote from one module to the next.
   - **W3** Missing transitions — backend status enum exists, UI can't drive it.
   - **W4** No UI at all — backend lifecycle built, no Karty page.
   - **W5** Not wired — control exists but calls nothing.

**Legend:** BE = backend confirmed from code. UI = needs live click-through to confirm
(marked ⏳). ✅ = confirmed present. ❌ = confirmed missing.

---

## Backend lifecycle baseline (code-confirmed)

Every module below already carries a staged status enum and, where ticked, real transition
endpoints. This is the "planned lifecycle" column — objective, from the source.

| Module | Status enum (lifecycle) | BE transitions | BE convert/handoff |
|---|---|---|---|
| **Purchase Order** | DRAFT→SENT→PARTIALLY_RECEIVED→RECEIVED→CLOSED/CANCELLED | `PUT /{uid}/status/{status}`, `/pending-lines`, `/entries` | `applyEntryReceipt()` (PO→Purchase Entry) |
| **Purchase (Entry/GRN)** | DRAFT→IN_REVIEW→APPROVED→REQUESTED→CANCELLED (ORDINAL, legacy) | `/status`, `/approve`, `/cancel` | receives stock on approve |
| **Order Request (quote)** | DRAFT→SUBMITTED→QUOTED→ACCEPTED→CONVERTED→REJECTED | `/status/{status}` | `POST /{uid}/convert` → Order |
| **Order** | PENDING→CONFIRMED→SHIPPED→DELIVERED→COMPLETED / CANCELLED / RETURNED | `/status`, `/cancel`, `/b2b/approve`, `/b2b/reject` | → sales return, → invoice (finance) |
| **Stock Transfer** | DRAFT→IN_TRANSIT→PARTIALLY_RECEIVED→RECEIVED→CANCELLED | `/status`, `/receive`, `/cancel` | receive moves stock between stores |
| **Sales Return** | DRAFT→PENDING→COMPLETED (+ refund NONE→PENDING→REFUNDED) | `/status`, `/refund-status/{status}` | against a completed order |
| **Purchase Return** | DRAFT→PENDING→COMPLETED | `/status/{status}` | against a purchase |
| **Stock Adjustment** | PENDING→APPROVED→REJECTED | `/approve`, `/reject` | (note: apply posts immediately) |
| **Reorder Alert** | OPEN→ACKNOWLEDGED→RESOLVED→DISMISSED | `PUT /{uid}/status` | ⚠ no alert→PO convert endpoint |
| **Partner Connection** | PENDING→ACTIVE→SUSPENDED→REVOKED→REJECTED | `/approve`, `/reject` | `POST /order-requests/{uid}/convert` |
| **Expiry Claim** | DRAFT→SUBMITTED→APPROVED→SETTLED | `PATCH /expiry-claims/{uid}/status` | — |
| **Production Order (BOM)** | DRAFT→IN_PROGRESS→COMPLETED→CANCELLED | `/complete`, `/cancel` | consumes components, yields output |
| **Serial** | IN_STOCK→ALLOCATED→SOLD→RETURNED→DEFECTIVE | `POST /receive` | tracked through order lifecycle |
| **Manual Reservation** | HELD→RELEASED→FULFILLED→EXPIRED | — | — |
| **Opening Stock** | DRAFT→APPLIED | apply | — |
| **ShipRocket Shipment** | ORDER_CREATED→AWB→LABEL→PICKUP→SHIPPED→DELIVERED (+RTO/NDR…) | webhook-driven | from an Order |
| Item / Store / Vendor / Catalog / Price List | ACTIVE/DRAFT/ARCHIVED (+ status endpoints) | `/status/{status}` | CRUD + archive (not a workflow) |

---

## ⭐ Worked example — Purchase Request → Purchase (your demo example)

**Planned** (`PURCHASE_ORDER_AND_ENTRY_FLOW.md`, 2026-07-23): split the old single
"purchase" into two documents —
```
Purchase Order (what we asked the dealer for)  1 ── * Purchase Entry (what actually arrived)
  stages: DRAFT → SENT → PARTIALLY_RECEIVED → RECEIVED → CLOSED
  one PO received across many entries; receivedQty accumulates; pendingQty = ordered − received
```
The dealer gets a **PO document**; goods arriving is a **Purchase Entry (GRN)** that pulls the
PO's open lines (`/pending-lines`) and books only what's received now.

**Actual — backend:** ✅ fully built. `PurchaseOrderEntity` + `PurchaseOrderItemEntity`,
`PurchaseOrderStatus` (all 6 stages), `PUT /{uid}/status/{status}` (send/cancel/close, receipt
states derived), `GET /{uid}/pending-lines` ("drives the Purchase Entry screen"),
`GET /{uid}/entries`, `applyEntryReceipt()` accumulating received qty and re-deriving status.

**Actual — UI (live-checked 2026-08-19):** ✅ the workflow **is built** — but it's **hidden**.
On the *Purchase Requests* tab, the list shows the PO stages (`SENT`, `PARTIALLY RECEIVED`,
`RECEIVED`), and the request **detail page** has a `SENT` stage badge, a **"0% received · 0
receipts booked"** progress tracker, line-level **ORDERED / RECEIVED / PENDING** columns, and a
**"Create Purchase →"** button plus an **Actions** menu. That is exactly the convert-to-purchase
flow the demo said was missing.

**Why it read as a gap in the demo (the real problem — IA/discoverability, not missing code):**
- The **sidebar entry is "Purchases"**, which opens the **flat GRN-entry list first** (legacy
  `In Review` status, no stages, no convert) — that is the screen the demo landed on.
- The staged PO workflow lives behind the **second tab, "Purchase Requests"**, with no sidebar
  entry of its own.
- Two tabs, two different status models (`In Review/Approved` vs `SENT/RECEIVED`), confusing
  names ("Purchase" vs "Purchase Request") → the workflow is invisible unless you know to click
  the second tab.

**Gap class:** **IA / discoverability** (workflow built, buried), not W2/W3.
**Fix direction (UI only, no backend):** lead the sidebar with the PO workflow; rename the two
tabs to what they are (**"Purchase Orders"** and **"Goods Receipts / Entries"**); show the stage
badge on the Purchase list too; and make "Create Purchase" reachable from the list, not only the
detail. Everything backend is already there.

---

## Candidate gaps to confirm in the live sweep (prioritised)

Ranked by demo impact. Each needs a UI click-through to confirm ✅/❌; the backend column is
already code-confirmed.

1. **Purchase Order stages + Receive/Convert** — W2/W3, backend ready. *(confirmed above)*
2. **Reorder Alert → Purchase Order** — W2. Backend has alert lifecycle but **no alert→PO
   convert**; the whole point of a reorder alert is to raise a PO. Likely dead-ends at
   acknowledge/resolve. ⏳ confirm the Reorder Alerts page has no "Create PO from alert".
3. **Order Request (quote) stages** — W1/W3. Rich DRAFT→SUBMITTED→QUOTED→ACCEPTED→CONVERTED
   + `/convert` exist; confirm the Requests page exposes quote→accept→convert, not just a list. ⏳
4. **Stock Transfer transit→receive** — W3. Backend has IN_TRANSIT→PARTIALLY_RECEIVED→RECEIVED
   + `/receive`; confirm the Transfers UI supports dispatch, in-transit, and **partial receive**. ⏳
5. **Sales / Purchase Returns stages + refund** — W3. Confirm DRAFT→PENDING→COMPLETED and the
   refund-status transition are drivable from the UI. ⏳
6. **Order status funnel + B2B approve/reject** — W3. Confirm the order detail can advance
   PENDING→CONFIRMED→SHIPPED→DELIVERED and that B2B orders show approve/reject. ⏳
7. **Expiry Claims** — **W4, no Karty page.** Full DRAFT→SUBMITTED→APPROVED→SETTLED lifecycle
   in the backend, **not in the sidebar** → feature invisible to users. ⏳ confirm no route.
8. **Production Orders (BOM)** — **W4, no Karty page.** DRAFT→IN_PROGRESS→COMPLETED + `/complete`
   built; BOM/manufacturing has no sidebar entry. ⏳ confirm.
9. **Serials lifecycle** — W3. Page exists (`/inventory/serials`); confirm it shows
   IN_STOCK→ALLOCATED→SOLD→RETURNED and isn't just a flat list.
10. **Logistics / ShipRocket** — W3. Very rich shipment status set; confirm the Logistics page
    surfaces the shipment lifecycle rather than a bare table.

**Likely NOT gaps** (CRUD + archive, not workflows): Items, Stores, Vendors, Catalogs, Price
Lists, Customers, Users — audit for completeness of the ACTIVE/DRAFT/ARCHIVED status control
only.

---

## Live sweep findings (checked 2026-08-19)

**Headline: almost nothing is functionally missing — the workflows are built. The demo "gaps"
are (a) list pages that render the lifecycle flat, (b) buried entry points, and (c) data-display
bugs.** Two features are the exception: they have no page at all.

| Route | Workflow in UI? | Finding | Class |
|---|---|---|---|
| **Purchases / Purchase Requests** ⭐ | ✅ built, **hidden** | Stages + ORDERED/RECEIVED/PENDING + **Create Purchase** convert all exist on the *Purchase Requests* tab; the sidebar lands on the flat *Purchases* (GRN) tab instead. Two tabs, two status models, confusing names. | **IA / discoverability** |
| **Reorder Alerts** ⭐ | ⚠ partial | Page is well-built (Status + Actions + Suggested Reorder + stock-sweep), but backend has **no alert→PO convert** — you can ack/resolve/dismiss but can't turn an alert into a Purchase Order. The reorder→replenish handoff is missing. | **W2** |
| **Expiry Claims** ⭐ | ❌ **no page** | Full `DRAFT→SUBMITTED→APPROVED→SETTLED` lifecycle + endpoints in backend; **no Karty route** — invisible to users. | **W4** |
| **Production Orders / BOM** ⭐ | ❌ **no page** | `DRAFT→IN_PROGRESS→COMPLETED` + `/complete` in backend; **no Karty route**. | **W4** |
| **Stock Transfers** ⭐ | ✅ stages shown | List shows Draft / In Transit / Received. **Data-display bugs:** raw store UUIDs in From/To, "Unknown Date", non-unique `#TO-000`. Receive action lives in detail (backend `/receive` exists). | display + confirm-detail |
| **Order Requests (quotes)** ⭐ | ✅ mostly | Stage tracked (`CONVERTED` shown), WhatsApp/Email Quote actions, backend `/convert`. **List** shows a type tag not the stage, and DATE is empty; convert not surfaced inline. | minor W3 + display |
| **Sales Returns** ⭐ | ⚠ flat list | Status filter + "₹250 refunded" summary exist, but the **list shows no status/refund badge**, DATE empty, and IDs inconsistent (`SRET-14172` vs raw `#c4ff4fd6`). Refund lifecycle in detail. | display + surface-status |
| **Purchase Returns** ⭐ | ⚠ flat list | `STATUS` present (DRAFT); **raw ISO timestamp** shown as the date (`2026-08-11T18:20:29.374Z`). | display |

### Cross-cutting patterns (the actual demo problems)
1. **List views flatten the lifecycle.** Detail pages and the backend carry the stages, but the
   *list* a demo scrolls through shows no status badge / no next-action — so it looks like flat
   CRUD. Fix: add a status column + primary next-action to every workflow list.
2. **Buried entry points.** The most-built workflow (PO → receive → Purchase) is behind a second
   tab the sidebar never points at. Fix: surface workflow tabs in the nav; name them honestly.
3. **Data-display bugs that read as "broken" on stage:** empty dates (`—` / "Unknown Date"),
   raw ISO timestamps, raw UUIDs in name columns, and non-unique document numbers (`#TO-000`,
   and the earlier `order_no 00029` collision). These make even finished pages look unfinished.
4. **Two genuinely missing pages:** Expiry Claims and Production/BOM (W4) — backend done, no UI.
5. **One genuinely missing handoff:** Reorder Alert → PO (W2).

### Not yet click-through-verified (backend lifecycle known; UI to confirm next)
Serials (`/inventory/serials` — IN_STOCK→ALLOCATED→SOLD→…), Logistics/ShipRocket, Orders status
funnel + B2B approve/reject, Active Carts, Connections, Price Lists. Add these to a second pass;
expect the same "built-but-flat / display-bug" pattern rather than missing features.

### Recommended fix order (highest demo impact, lowest effort)
1. **Purchase IA** — surface the PO workflow + rename tabs (UI only, backend ready).
2. **Add status badge + next-action to workflow list pages** (Sales/Purchase Returns, Transfers,
   Requests) — turns "flat" into "workflow".
3. **Kill the display bugs** — dates, raw UUIDs, non-unique numbers.
4. **Reorder Alert → "Create PO"** — one new convert (small backend + button).
5. **Expiry Claims & Production/BOM pages** — larger; decide if in demo scope at all.
