# Store & Item Creation — Review (2026-08-18)

Full backend-contract + frontend-form + live-preview review of the two most fundamental Karty
create flows: **Store creation** and **Item creation**. Method: read the backend DTO/service/
validation, read the Karty form + payload builder, then create a real record live in the preview
and verify create → list → detail → edit-prefill round-trip (per this repo's own rule: "Persisted
≠ displays ≠ editable").

---

## A. Store creation

### What's solid
- **GSTIN** persists correctly and drives the GST invoice's CGST/SGST-vs-IGST split (verified end
  to end against the tax-invoice work).
- **Location** is wired to real base-crm locations (`useLocations`), not free text.
- **Mobile number** is folded into `contact` before send (`+91 <mobile>`) — not lost, just merged.
- Client-side validation matches backend validation exactly (`name` required; `verticalType`
  auto-derived from `type`).
- Boolean/enum normalization (`normalizeStorePayload`) correctly coerces status casing,
  `fulfillmentMethods`, etc.

### Bugs found

| # | Severity | Where | Bug |
|---|----------|-------|-----|
| S-1 | 🔴 High | `StoresGrid.tsx` create/edit form | **Email is collected but silently dropped.** `StoreDto`/`StoreEntity` has no `email` column at all — not even in a jsonb catch-all (unlike items). The value is held in local component state and displayed immediately after create (misleading — looks saved), but **disappears on refresh** because it was never persisted. Confirmed live: `POST /stores` response and a fresh `GET /stores/{uid}` both have no `email` key. |
| S-2 | 🔴 High | `StoreDetails.tsx` (detail page) | **Fabricates a phantom "Order Catalog" card.** When `selfOrder=true` but the store has no real order catalog (`orderCatalogUid=null`), the detail page synthesizes a fake catalog card — name `"${store.name} Order Catalog"`, an **ACTIVE** badge, "0 Products", and a working-looking "Add Products" button — with **zero backing data**. Verified live: created a store with `selfOrder:true` and no catalog; the UI showed "1 Catalogs Assigned to this Store" while `GET /order-catalogs` returned zero rows for that store and no `POST` to `/order-catalogs` ever fired. A user would believe their store has a live sales catalog when it does not. |
| S-3 | 🟡 Medium | Backend + FE, `trackInventory` | A store can be created with `trackInventory:true` and **no inventory catalog** (`inventoryCatalogUid:null`) — reproduced by leaving the (off-screen, easy-to-miss) catalog-name field empty. Neither FE nor `StoreServiceImpl.create()` validates or warns about this pairing; the store silently ends up unable to hold stock until someone manually fixes it via Inventory Catalogs. |
| S-4 | 🟡 Medium | `StoresGrid.tsx` | **Store image upload is fully non-functional.** Collected (`uploadedImage`, previewed locally), sent in the payload, but there is no backend field, no `imageDriveId`, and no upload-endpoint call. Pure UI theatre. |
| S-5 | 🟡 Medium | `StoresGrid.tsx` "Invoicing" tab | **Per-store invoice numbering (B2B/B2C prefix/suffix, `orderTypes`/`prefixSuffixRows`) has zero backend persistence.** Fully client-side-only feature — configured, "saved", but never sent to any field the backend keeps. |
| S-6 | 🟢 Low | Backend, pharmacy compliance | `dlNumber2021`, `dlNumber20b21b`, `dlExpiryDate`, `dlHardBlock` (drug-license fields, presumably gating pharmacy sales) exist on `StoreDto`/`StoreEntity` with **zero FE UI** anywhere in the store form. Backend-ready, frontend absent — the opposite direction of S-1/S-4/S-5. |
| S-7 | 🟢 Low | New-store default | New units default a fresh row to the **first unit alphabetically** in the tenant's unit list (in this tenant, a stray test unit called "ping") with **both Selling-Default and Purchase-Default pre-checked simultaneously** — not a store bug per se, this is actually an *item* unit-row default (see I-1 below); noted here because it was first seen while testing store→catalog assignment context. |

**Not fixed this pass** (flagged, not touched — all are either multi-file features needing a
product decision on scope, or low-severity): S-1, S-4, S-5, S-6. S-2 and S-3 are the ones worth
prioritizing (S-2 especially — it's a trust-eroding "fake data" bug in a production UI).

---

## B. Item creation

### What's solid
- Backend validation (`name` required only) matches FE client-side validation.
- **SKU / Barcode / HSN Code** all persist and round-trip correctly.
- **Multi-unit model works exactly as designed**: created Box(=12, Purchase-Default) + Piece(=1,
  Selling-Default, correctly tagged "BASE UNIT"). Backend correctly **blocks saving with zero
  selling units** ("At least one unit must be a selling unit") — good guard.
- **Tax Group** ("GST 18%") persists to `attributes.taxGroup` — exactly the field the GST Tax
  Invoice engine reads.
- **Store + Order Catalog assignment + pricing** (step 2) all persist correctly, with the order
  catalog **correctly auto-selected** from the chosen store.
- Full create → list → detail → edit-prefill round-trip verified: Name, Category, SKU, Barcode,
  HSN, Base Unit, unit rows, Tax Group, Store, Order Catalog, MRP, Selling Price **all** prefill
  correctly on Edit (this also re-confirms the earlier STORE/ORDER-CATALOG edit-prefill fix from
  the previous session still holds).

### Bugs found (and fixed)

| # | Severity | Where | Bug | Status |
|---|----------|-------|-----|--------|
| I-2 | 🔴 **High — FIXED** | `ItemPlacementDto` / `ItemServiceImpl.getPlacements` (backend) + `ItemDetails.tsx` (frontend) | **Item detail page showed ₹0.00 for Sales Price and MRP on every item reached via the placements fallback**, even though the price was 100% correctly persisted (verified directly via `inventory-catalogs/item-placements` and `order-catalogs/{uid}/items`). Root cause: `ItemPlacementDto` (backing `GET /items/{uid}/placements`) had **no price fields at all** — the FE was reading `p.salesPrice`, a key the backend never sent. **Fixed**: added `mrp`/`sellingPrice` to `ItemPlacementDto`, populated from a batched `InventoryCatalogItemEntity` lookup in `getPlacements()` (both the order-catalog and inventory-only branches), and fixed the FE to read `p.sellingPrice`/`p.mrp`. Verified live: detail page now shows **₹120.00 / ₹150.00** correctly. | ✅ Fixed & verified |
| I-1 | 🟡 Medium | `CreateItem.tsx`, "+ Add Unit" | A newly-added unit row defaults to an **arbitrary unit** (first in the tenant's unit list — a stray test unit named "ping" in this tenant) with **both Selling-Default and Purchase-Default pre-checked**. Should default to an unselected/empty unit rather than silently picking one and flagging it as both defaults — easy to accidentally save a nonsense unit if the user doesn't notice. | Not fixed (UX polish, low risk since the backend's "must have a selling unit" guard catches the worst case) |
| I-3 | 🟢 Low | Items list (transient) | Right after creating an item, the list briefly showed **two rows for the same item** (one unpriced/incomplete, one correct) before a page refresh collapsed it back to one real record. Confirmed via API that only **one** record was ever created — this is a client-side cache-merge glitch (likely an un-replaced optimistic-update entry), not a real duplicate-create / idempotency bug. Self-heals on refresh; not urgent. | Not fixed (cosmetic, self-healing) |
| — | ℹ️ Note | `CreateItem.tsx` step 2 copy | The copy *"other selling units are priced automatically from their conversion"* is still present (this is the same **C-1** conflict flagged in an earlier session — the backend model supports independent per-unit pricing, but the create-UI text implies otherwise). Not re-litigated here; still open. | Open (pre-existing, cross-referenced) |

---

## Summary

| Area | Solid | Bugs found | Fixed this pass |
|---|---|---|---|
| Store creation | GSTIN, location, mobile-fold, validation parity | S-1 email dropped, **S-2 phantom catalog card**, S-3 catalog-less tracking, S-4 dead image upload, S-5 dead invoice-numbering, S-6 no DL-field UI | 0 (all flagged for a follow-up pass — S-2 is the one to prioritize) |
| Item creation | Multi-unit model, tax-group→GST-invoice link, full round-trip, backend guards | **I-2 price showed ₹0.00 on detail** (root-caused to a missing DTO field), I-1 default-unit UX, I-3 transient phantom row | **I-2 fixed and verified live** (backend `ItemPlacementDto`/`getPlacements`, frontend `ItemDetails.tsx`) |

**Test artifacts left in `Test Business` tenant** (not cleaned up, per this repo's test convention):
store `ZZ QA Test Store` (`4ed4d52d-…`), item `ZZ QA Full Review Item` / SKU `ZZ-QA-SKU-01`
(`ca706954-…`, ITM-00128).
