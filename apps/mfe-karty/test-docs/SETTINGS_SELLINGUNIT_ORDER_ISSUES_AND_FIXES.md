# Karty — Settings, Selling Unit & Order Creation: Issues & Fixes

**Reviewed:** 2026-08-18 · **Scope:** commerce Settings hub + item selling-unit config + POS order creation, `feature-commerce-service` + `mfe-karty`
**Method:** live preview walk-through → source read (`SettingsPage.tsx`, `OrderSettingsTab.tsx`, `CreateItem.tsx`/`ItemUnitConfig.tsx`, `DraftOrderStep2.tsx`) → API verification of persisted state.
**Tenant:** Test Business (`167b8dda`) · commerce-service `:9105` · shell `:4000` / karty `:3005`.
**Companion doc:** [`STORE_ITEM_ISSUES_AND_FIXES.md`](./STORE_ITEM_ISSUES_AND_FIXES.md) — I-1/I-3 there overlap with this doc (cross-referenced below).

---

## Status summary

| ID | Severity | Area | Issue | Status |
|----|----------|------|-------|--------|
| **SET-1** | 🔴 High | Settings | **5 of 9 settings tabs are non-functional mockups** — fake no-op save, hardcoded data, nothing persists | ⬜ Open |
| **ORD-1** | 🔴 High | Order | Cart **line price uses base-unit price**, not the selected selling unit (totals & backend are correct) | ⬜ Open |
| **ORD-3** | 🟡 Med | Order | **Non-stock-tracked item is unsellable** — POS shows "Out of stock" and blocks add | ⬜ Open |
| **SET-2** | 🟡 Med | Settings | "Save Changes" (Orders&Workflow) **never re-arms** — stuck on "Changes Applied!" | ⬜ Open |
| **ORD-2** | 🟡 Med | Order | In-cart **unit dropdown options all render "Unit"** (no unit names) | ⬜ Open |
| **SET-3** | 🟢 Low | Settings | POS-wizard toggle + default POS view persist to **localStorage only** (per-browser, not per-tenant) | ⬜ Open |
| **SET-4** | 🟢 Low | Settings | Fake header **Save Preferences / Reset Defaults** also shows on the wired tabs (duplicate/confusing) | ⬜ Open |
| **UNIT-1** | 🟡 Med | Item | New unit row auto-picks arbitrary unit + both roles checked | ↔ **Duplicate of [STORE_ITEM] I-1** |
| **UNIT-2** | 🟢 Low | Item | Transient duplicate row after item create | ↔ **Duplicate of [STORE_ITEM] I-3** |

**Verified working (no action):** Selling-unit config end-to-end (base + selling unit, conversion, roles, auto-derived per-unit catalog pricing); POS happy path (unit-selection modal, qty, 18% tax, guest policy, confirm → persisted order **00065** correct at ₹2360).

---

## 🔴 SET-1 — 5 of 9 Settings tabs are non-functional mockups

**Severity:** High — the screens look editable and show a success toast, but silently discard everything.

**Symptom.** The Settings hub (`Settings` sidebar → 9 sub-tabs) presents rich forms on every tab. Only **4** actually talk to the backend:

| Tab (`SectionKey`) | Backing | Persists? |
|---|---|---|
| Orders & Workflow (`orders`) | `OrderSettingsTab` → `useUpdateStorefrontSettings` (PUT `/commerce-settings`) | ✅ |
| Feature Capabilities (`features`) | `FeaturesSettingsTab` → `useUpdateCapabilities` / `useUpdateStoreCapabilities` | ✅ |
| Tax Schedules (`tax`) | `TaxSettingsTab` → `useTaxes`/`useCreateTax`/`useUpdateTax` | ✅ |
| Shipping & Delivery (`shipping`) | `ShippingSettingsTab` → `useDeliveryPartners` CRUD | ✅ |
| **General & Operations** (`general`) | inline hardcoded state | ❌ |
| **Invoicing & Tax Rates** (`invoice`) | inline hardcoded state | ❌ |
| **Storefront Portal** (`storefront`) | `StorefrontSettingsTab` (its own `handleSave` is a timer) | ❌ |
| **Prefixes & IDs** (`prefix_suffix`) | inline hardcoded state | ❌ |
| **Diagnostics & Properties** (`developer`) | static placeholder card, no controls | ❌ |

**Root cause** — `new-karty-src/src/components/SettingsPage.tsx`. The header save button (rendered for every non-`orders` tab, line ~150 `activeTab !== 'orders'`) calls a **stub** that never hits the network:
```ts
// SettingsPage.tsx ~L123
const handleSave = () => {
  setSaveStatus('saving');
  setTimeout(() => { setSaveStatus('saved'); setTimeout(() => setSaveStatus(null), 2500); }, 600);
};
```
and every field is seeded from literals, not the API — e.g. `invoice` (L97-106) hardcodes `gstIn: '32AABCT2345E1Z8'` (the **real** `commerce-settings.gstin` is `32AABCS1429B1ZP`), `invoiceHeading: 'TAX INVOICE'`, `taxRatePercentage: 18`; `general` (L84-95) hardcodes `'Main Distribution & Fulfillment Hub'` etc.; `prefixSuffix` (L108-121) hardcodes `ORD-/INV-/PAT-/BAT-/…` (a dead duplicate — the *real* order prefix + numbering already lives, wired, inside the Orders & Workflow tab). `StorefrontSettingsTab.tsx` has its own `handleSave = () => setTimeout(…1000)` with **zero** API calls.

**Live proof.** On the Invoicing tab, clicking **Save Preferences** flips the button to "Changes Applied!" while firing **0** commerce-service requests (`performance.getEntriesByType('resource')` count 9 → 9).

**Fix — per tab, decide wire-vs-hide:**
- **General & Operations**, **Invoicing & Tax Rates**: these map cleanly onto existing `CommerceSettingsDto` fields (currency, timezone, `gstin`, invoice heading/terms). Convert each to load from `useStorefrontSettings()` and save via `useUpdateStorefrontSettings()` (mirror `OrderSettingsTab`), and drop the hardcoded seeds.
- **Prefixes & IDs**: delete — it duplicates the real, working order-number-format control under Orders & Workflow. (Invoice/patient/batch prefixes belong to their owning services, not commerce settings.)
- **Storefront Portal**: wire `handleSave` to a real endpoint or hide the tab until the storefront-theme backend exists.
- **Diagnostics & Properties**: either populate it with real runtime info or remove it — it is an empty card today.

---

## 🔴 ORD-1 — Cart line price uses the base-unit price, not the selected unit

**Severity:** High presentation bug — the line a cashier reads contradicts the amount charged.

**Symptom.** New order → added *item 1* choosing **Kilogram (₹1,000)** × 2. The cart line rendered unit price **₹100** and line total **₹200.00** (the *base* Gram price ₹100 × 2), while **Subtotal ₹2,000 / Tax ₹360 / Total ₹2,360** were correct. Verified the persisted order (`00065`) is correct: `unitUid=Kilogram, unitPrice=1000, lineTotal=2000, total=2360`. So money is right; **only the per-line display is wrong.**

**Root cause** — `new-karty-src/src/components/DraftOrderStep2.tsx`. The subtotal uses the chosen unit price (correct)…
```ts
// L497 (cartSubtotal)
const price = item.unitPrice ?? item.product.price;
return total + price * item.qty;
```
…but the line render uses `item.product.price` (the base price):
```ts
// L887
const lineTotal = item.qty * item.product.price;         // ← should be item.unitPrice ?? item.product.price
// L934 (unit-price cell)
₹ {item.product.price.toLocaleString(...)}               // ← same
```
The same base-price mistake repeats in the second (compact) cart render at **L1568 / L1580 / L1590**. Compounding it, the in-cart unit `<select>` onChange updates `unitUid`/`unitName` but **not** `unitPrice` (L920-922), so switching a line's unit never refreshes its price either.

**Fix.** Replace `item.product.price` with `item.unitPrice ?? item.product.price` at L887, L934, L1568, L1580, L1590; and in the unit `<select>` onChange (L920-922) also set `unitPrice: newUnit?.sellingPrice ?? p.unitPrice` so an in-cart unit change re-prices the line.

---

## 🟡 ORD-3 — Non-stock-tracked item is unsellable in POS

**Severity:** Medium — items with inventory tracking off (services, made-to-order, non-inventory goods) can never be sold.

**Symptom.** Created an item with **`trackInventory:false`**; in the POS catalog it shows a red **"Out of stock"** badge and its **Add** button is disabled — clicking the tile only reveals an inert "Options" button, no qty/unit modal. Confirmed via API: `item.trackInventory=false`, catalog `inHand=0`.

**Root cause** — `DraftOrderStep2.tsx`. Out-of-stock is decided purely on on-hand, with no `trackInventory` check:
```ts
// L371
const availableStockOf = (prod) => prod.inHand == null ? null : Number(prod.inHand);
// L373
const isOutOfStock = (prod) => { const a = availableStockOf(prod); return a !== null && a <= 0; };
```
`isOutOfStock` then drives the disabled Add button (L849 `disabled={oos}`) and a hard block with alert in `addItemToCartWithVariant` (L404-406). A non-tracked item returns `inHand:0` (not `null`), so it is wrongly treated as OOS.

**Fix.** Thread the item's `trackInventory` flag into `POSProduct` (the order-catalog-items source already knows it) and short-circuit:
```ts
const isOutOfStock = (prod) => {
  if (prod.trackInventory === false) return false;   // not stock-managed → always sellable
  const a = availableStockOf(prod); return a !== null && a <= 0;
};
```
Apply the same guard in `addItemToCartWithVariant` (L404).

---

## 🟡 SET-2 — "Save Changes" never re-arms (Orders & Workflow)

**Severity:** Medium — after the first save the user gets no "unsaved changes" cue, so later edits look already-saved.

**Symptom.** On the working Orders & Workflow tab, after one successful save the button stays on **"Changes Applied!"** permanently; toggling another setting does **not** flip it back to "Save Changes". Only a page reload resets the label. (The button still saves if clicked — it is mislabeled, not dead.)

**Root cause** — `OrderSettingsTab.tsx` L141-147: the label is derived from react-query `update.isSuccess`, which stays `true` after the first mutation until the next `mutate()`:
```ts
{update.isPending ? 'Saving…' : update.isSuccess ? 'Changes Applied!' : 'Save Changes'}
```

**Fix.** Track a local `dirty` flag set on any field change and cleared on save success; label off `dirty` (and/or call `update.reset()` after the confirmation window). Show "Save Changes" whenever `dirty`, "Changes Applied!" only during the brief post-save window.

---

## 🟡 ORD-2 — In-cart unit dropdown options all render "Unit"

**Severity:** Medium — the per-line unit switcher is unreadable.

**Root cause** — `DraftOrderStep2.tsx` L926-927: the option label reads `u.unitName`, but the unit objects sourced from the catalog carry `name` / `sellingPrice` (not `unitName`), so every option falls through to the `'Unit'` default:
```ts
{(item.product.units || [...]).map((u) => (
  <option key={u.unitUid || u.unitName} value={u.unitUid}>{u.unitName || 'Unit'}</option>
))}
```

**Fix.** Use `{u.name ?? u.unitName ?? 'Unit'}` (and ideally append price, as the add-modal already does at L1733: `{u.name} · ₹{u.sellingPrice}`). Fold this in with the ORD-1 onChange fix so switching a unit both relabels and reprices.

---

## 🟢 SET-3 — POS-wizard toggle & default POS view persist to localStorage only

`OrderSettingsTab.tsx` reads/writes the **Order Creation Setup Wizard** toggle and **Default POS View Mode** from `localStorage` (L57 `karty_enable_order_presetup`, L66 `karty_default_pos_view_mode`), not the backend. They are therefore per-browser, not per-tenant/per-user — a second device or a cleared cache loses them, and they can't be centrally administered. **Fix:** promote both to `commerce-settings` fields if they're meant to be store policy; otherwise document them as device preferences.

---

## 🟢 SET-4 — Fake header save buttons also show on the wired tabs

`SettingsPage.tsx` L150 renders the header **Save Preferences / Reset Defaults** for *every* tab except `orders` — including the genuinely-wired `features` / `tax` / `shipping` tabs, which each have their **own** real save control inside their component. Result: those tabs show two save buttons, one of which (the header stub) does nothing. **Fix:** only render the header save on tabs that actually use it (and once SET-1 is resolved, likely remove the stub entirely).

---

## ↔ UNIT-1 / UNIT-2 — overlap with the Store/Item review

Both reproduced here and already documented (with fixes) in [`STORE_ITEM_ISSUES_AND_FIXES.md`](./STORE_ITEM_ISSUES_AND_FIXES.md):
- **UNIT-1 = I-1:** **+ Add Unit** auto-picks an arbitrary unit (here the stray `ping` unit) with both *Selling·Default* and *Purchase·Default* pre-ticked (`ItemUnitConfig.tsx addUnit`). Fix: start blank, `purchase:false`.
- **UNIT-2 = I-3:** transient duplicate row in the items list after create (client cache-merge artifact; server has one record). Fix: dedupe by `uid` in `useCreateItem.onSuccess`.

No separate action — track under the Store/Item doc.

---

## ✅ Verified working (recorded for regression)

- **Selling-unit config, end-to-end.** Created *Selling Unit UX Test* (base **Piece** + **Box** conv 12, selling+purchase). API confirms `item_unit` Box `conversionQty=12`; pricing step **auto-derived** base ₹100/MRP120 → **Box ₹1200/MRP1440**, persisted to `order_catalog_item` units (Piece default + Box). Base-unit dropdown is correctly grouped by measurement family.
- **POS order happy path.** Store/catalog auto-selected; unit-selection modal (Kilogram/Gram + qty stepper); 18% tax; guest walk-in permitted (matches `orderRequiresConsumer=false`). Confirm → **Order 00065 CONFIRMED**, backend amounts correct (₹2000 + ₹360 = ₹2360, `consumerUid=null`).

---

## Test artifacts left in `Test Business` (not cleaned up, per repo convention)

- Item `Selling Unit UX Test` — `9a869d45-eb60-4dda-9b2b-cfc3c70360b7` (base Piece + Box×12; `trackInventory=false`, used for ORD-3)
- Order `00065` — guest walk-in, item 1 × 2 (Kilogram), total ₹2360, status CONFIRMED
- Commerce setting `autoGenerateTask` was toggled true then **reverted to false** (SET-2 round-trip proof); net state unchanged.

---

## Suggested order of work

1. **ORD-1** cart line price — one-line-per-site frontend fix, actively misleading at the counter.
2. **SET-1** wire/hide the 5 mock settings tabs — largest trust gap (silent data loss on save).
3. **ORD-3** non-stock item sellable — small guard in `isOutOfStock`.
4. **ORD-2 / SET-2 / SET-4** — small frontend polish, all low-risk.
5. **SET-3** — decide device-pref vs. store-policy.
