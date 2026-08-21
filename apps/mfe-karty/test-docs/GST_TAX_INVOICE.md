# Karty GST Tax Invoice — Use Cases & Test Cases

_Last updated: 2026-08-14_

## What it is

The GST Tax Invoice shown from a Karty order — CGST/SGST (intra-state) or IGST (inter-state),
rate-wise tax breakup, HSN, place of supply, amount in words, round-off.

- **Live screen:** open an order → **Invoice details** (`OrdersTable.tsx`, `showInvoiceDetailsPage`).
  This now renders the real `InvoiceSheet`, driven by `useOrderInvoice(orderUid)`.
- **Standalone routes:** `/karty/orders/:uid/tax-invoice` (single order) and
  `/karty/invoices/tax-invoice` (3-variant design preview with sample data).
- **Compute:** client-side in Karty (`services/useOrderInvoice.ts` → `buildInvoiceModel`). It is a
  **live render, not a persisted snapshot** — see "Finance integration" below.

## The intra vs inter-state rule (confirmed 2026-08-14)

| Buyer | State handling | Result |
|---|---|---|
| **B2C consumer** | Consumer state is **ignored** | **Always intra-state** (CGST + SGST); place of supply = seller state |
| **B2B trade partner** | **Partner state decides** — read from the first 2 digits of the partner GSTIN (authoritative) | intra if seller code == partner code, else **inter (IGST)** |
| **B2B partner, no/invalid GSTIN** | Cannot prove inter-state | Falls back to intra |

Seller state = first 2 digits of the tenant GSTIN (`commerce-settings.gstin`).
Per-line tax rate = item `attributes.taxGroup` (`"GST 18%"` → 18%). HSN = item `attributes.hsnCode`.

B2B orders are detected by `order.channel === "B2B"` / `order.partnerUid`; the partner is fetched from
`/v1/api/tenant/trade-partners/{partnerUid}`.

## Automated tests (run these)

`src/services/__tests__/useOrderInvoice.test.ts` — 9 cases covering the full rule matrix, item-driven
rate, round-off, and the zero-tax edge.

```bash
cd apps/mfe-karty && npx vitest run src/services/__tests__/useOrderInvoice.test.ts
```

Status: **9/9 passing (2026-08-14).**

## Manual / live test matrix (login-gated — run in the browser)

Prereqs: seller tenant GSTIN set in commerce-settings (e.g. Kerala `32…`); items seeded with
`taxGroup` + `hsnCode`; at least one B2B trade partner with an inter-state GSTIN (e.g. Karnataka `29…`).

| # | Scenario | Setup | Expected |
|---|---|---|---|
| TC-1 | B2C same state | order for a Kerala consumer | INTRA — CGST+SGST columns, PoS Kerala |
| TC-2 | B2C other state | order for a Karnataka consumer | **INTRA still** (consumer state ignored) |
| TC-3 | B2C walk-in | guest order, no customer | INTRA |
| TC-4 | B2B same state | B2B order, partner GSTIN `32…` | INTRA — CGST+SGST |
| TC-5 | B2B other state | B2B order, partner GSTIN `29…` | **INTER — IGST**, PoS Karnataka (29), partner GSTIN shown |
| TC-6 | B2B no GSTIN | B2B order, partner without GSTIN | INTRA, "GSTIN not on file" |
| TC-7 | Item rate | line item "GST 18%" @ ₹999×1 | taxable 999, tax 179.82, grand ₹1,179 (round +0.18) |
| TC-8 | **Print A4** | Invoice details → More Actions → Print | Only the invoice prints (no app chrome), fits A4, colour tints preserved |
| TC-9 | Print inter | same for an IGST invoice | IGST layout prints cleanly on A4 |

## Print behaviour

- `More Actions → Print` calls `window.print()`.
- Print isolation CSS lives in `OrdersTable.tsx` (Block A): `@page { size: A4; margin: 6mm }`, blanks
  all app chrome, reveals only `.karty-inv-print`, scales the 794px (=A4-width) sheet to fit, and forces
  `print-color-adjust: exact` so GST header tints + grand-total bar keep their colour.
- **Paper size:** currently fixed to **A4** (Indian tax-invoice standard). A5 / thermal-80mm receipt
  formats are **not** implemented (thermal needs a separate narrow layout).

## Action buttons (Invoice details screen)

| Button | Wired to | Status |
|---|---|---|
| **Settle Invoice** | `POST /v1/api/tenant/orders/{uid}/invoice` (`useRaiseOrderInvoice`) → raises the authoritative **finance** tax invoice (idempotent; GST split done server-side) | ✅ real |
| **Cancel Order** | `PUT /v1/api/tenant/orders/{uid}/cancel` (`useCancelOrder`) | ✅ real |
| **Download PDF** | `window.print()` with the A4 print-isolation → browser "Save as PDF" | ✅ real |
| **Print** | `window.print()` (A4 isolation) | ✅ real |
| **Get Payment** (Cash / UPI / Card / Net Banking) | `POST /v1/api/tenant/orders/{uid}/payment/offline` (`useRecordOrderPayment`) → records a real **offline payment** in finance; supports partial; on full settle it warns before marking the order completed | ✅ real |
| **Share** | mock | ⛔ not implemented |

## Finance integration — corrected status (2026-08-14)

The GST **invoice** IS connected to finance. `feature-commerce-service` already exposes
`POST /orders/{uid}/invoice` → `CommerceInvoiceServiceImpl.raiseForOrder`, which computes the GST
split (`resolveSupplyType`: provider store GSTIN vs buyer partner GSTIN — the exact B2B/B2C rule
above) and creates the finance invoice with per-line detail. **No finance schema change is needed.**
See `feature-commerce-service/docs/B2B_TAX_NOTES.md`. "Settle Invoice" now calls this endpoint.

The Karty on-screen invoice is still a **client-side render** (`useOrderInvoice`) that mirrors the same
rule — kept for instant display and print. It can later be switched to read the raised finance
`InvoiceResponse` so display == system-of-record.

### Payment recording — IMPLEMENTED (2026-08-14)

Recording an actual payment (cash/UPI/card/net-banking) is now wired, mirroring booking-service.
**No finance change was needed.** New pieces in `feature-commerce-service` (compiles):
- `client/finance/CommerceFinancePaymentClient.java` — Feign → `POST /internal/finance/payment/offline`
- `dto/request/OrderPaymentRequest.java`, `dto/OrderPaymentResultDto.java`
- `service/CommerceOrderPaymentService(+Impl)` — ensures the invoice, validates `amount ≤ amountDue`,
  books the offline payment against `paymentFor=INVOICE`, returns `{ amountPaid, amountDue, fullyPaid }`
- `OrderManager(+Impl).recordPayment` + `OrderController` `POST /orders/{uid}/payment/offline`

Frontend: `useRecordOrderPayment` + the Get Payment dropdown (Cash→`Cash`, UPI→`UPI`, Card→`CC`,
Net Banking→`NB`). Full settlement warns before marking the order completed (decision: payment status
stays separate from fulfillment). Partial payments supported (send a smaller amount). Refunds out of scope.
