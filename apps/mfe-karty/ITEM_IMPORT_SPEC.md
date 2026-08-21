# Karty — Item Import / Migration Spec

> What data we need to fully migrate items (with attributes, per-unit pricing, and
> opening stock) into `feature-commerce-service`, plus the import mechanics and a
> build prompt for Antigravity. Grounded in the real DTOs (`ItemDto`, `ItemUnitDto`,
> `ItemVariantDto`, `OpeningStockDto`/`OpeningStockItemDto`). No import endpoint
> exists today — this is net-new.

## Why a multi-sheet workbook (not one flat CSV)
An item is nested: it has **multiple units** (each with its own pricing), optional
**variants**, a free-form **attributes** map, and **opening stock** spread across
stores/batches. A single flat row can't express that cleanly. Use an **Excel workbook
with 4 linked sheets**, joined by a per-file business key `itemCode`. (Also offer a
"Quick CSV" single-sheet mode for simple items — one selling unit, optional single
opening-stock line.)

---

## Item identifiers — three of them (don't confuse)
1. **`uid`** (UUID primary key) — **auto-generated** (`@PrePersist`). Internal only, not for
   display. The import file must **never** contain `uid`.
2. **`itemNo`** (human-readable display id, e.g. `ITM-00001`) — **does NOT exist yet; build it.**
   Generate it automatically per tenant using the existing sequence mechanism
   (`commerce_sequence_tbl` + `SequenceScope` + generator in `CommerceSettingsServiceImpl`):
   add an `ITEM` value to `SequenceScope`, add an `itemNo` column to `ItemEntity`/`ItemDto`
   (unique per tenant), and assign it on create AND on import. The import file must **not**
   contain `itemNo` — the server assigns it.
3. **`code` / `sku`** (business/barcode identifier) — **caller-supplied** (the create UI maps
   `code` from the barcode field). Carry these from the source file to preserve legacy values;
   do **not** overload `code` as the auto display number — that's what `itemNo` is for. `code`
   is NOT NULL + unique per (tenant, vertical); if a row has no code, fall back to `sku` or the
   generated `itemNo`.

> Net: the import carries only `code`/`sku` (+ the file-local `itemCode` linking key below).
> `uid` and `itemNo` are both backend-assigned.

## On `itemCode` vs the stored item `code` (important)
`itemCode` in this spec is a **file-local linking key** (joins Units/Variants/OpeningStock to
the item) — always required in the file. It is **separate** from the stored `ItemDto.code`.
Today the backend does **NOT** generate `code`: `ItemServiceImpl.create` only
trims/uppercases `dto.getCode()`, and `code` is **NOT NULL + unique per (tenant, verticalType)**.
So decide the policy (the import service must implement it):
- **Preserve legacy codes (recommended for migration):** use the file's `itemCode`/`sku` as the
  stored `code`. Duplicate → error in `create-only`, or update in `upsert`.
- **Auto-generate:** if the row's code is blank, the import service generates one
  (e.g. `ITM-00001`, per-tenant sequence — **net-new, must be built**); the file's `itemCode`
  stays only a linking key.
- Best: **keep code if provided, else auto-generate.**

## Sheet 1 — `Items` (one row per item) → `ItemDto`
| Column | Req | Type / values | Maps to | Notes |
|---|---|---|---|---|
| `itemCode` | ✅ | text, unique in file | `code` | Business key linking the other sheets |
| `name` | ✅ | text | `name` | |
| `sku` |  | text | `sku` | Used for upsert matching if set |
| `kind` |  | `GOODS`/`SERVICE` (default GOODS) | `kind` | |
| `verticalType` |  | `RETAIL`/`PHARMACY`/`RESTAURANT`/`GROCERY`/`OTHER` | `verticalType` | default per tenant |
| `categoryName` |  | text | `categoryUid` | resolved → uid (see Resolution; category source TBD) |
| `baseUnitName` | ✅ | text | `baseUnitUid` | resolved → unit uid |
| `trackInventory` |  | bool (default true) | `trackInventory` | |
| `allowLooseSale` |  | bool | `allowLooseSale` | |
| `rxEnabled` |  | bool | `rxEnabled` | pharmacy |
| `status` |  | `ACTIVE`/`DRAFT`/`ARCHIVED` (default ACTIVE) | `status` | |
| `imageUrl` |  | url | `imageDriveId` | uploaded to drive → id (optional) |
| `attr.<Key>` |  | text/number | `attributes[<Key>]` | dynamic columns, e.g. `attr.Brand`, `attr.HSN`, `attr.Material`, `attr.Color` |
| `attributesJson` |  | JSON object | `attributes` | escape hatch for complex attributes; merged with `attr.*` |

## Sheet 2 — `Units` (one row per item-unit) → `ItemUnitDto`
At least one row per item with `conversionQty = 1` (the base unit). Mark exactly one `isDefault`.
| Column | Req | Type | Maps to | Notes |
|---|---|---|---|---|
| `itemCode` | ✅ | text | link | |
| `unitName` | ✅ | text | `unitUid` | resolved → unit uid |
| `conversionQty` | ✅ | decimal | `conversionQty` | base units per 1 of this unit (base row = 1) |
| `selling` |  | bool | `selling` | shows in order/sell unit picker |
| `purchase` |  | bool | `purchase` | |
| `isDefault` |  | bool | `isDefault` | exactly one per item |
| `rx` |  | bool | `rx` | |
| `sellingPrice` |  | decimal | `sellingPrice` | per this unit |
| `mrp` |  | decimal | `mrp` | per this unit |
| `minSaleQty` |  | decimal | `minSaleQty` | |
| `maxSaleQty` |  | decimal | `maxSaleQty` | |
| `qtyIncrement` |  | decimal | `qtyIncrement` | |

## Sheet 3 — `Variants` (optional, one row per variant) → `ItemVariantDto`
| Column | Req | Type | Maps to |
|---|---|---|---|
| `itemCode` | ✅ | text | link |
| `variantName` | ✅ | text | `variantName` |
| `sku` |  | text | `sku` |
| `mrp` |  | decimal | `mrp` |
| `sellingPrice` |  | decimal | `sellingPrice` |
| `attr.<Key>` / `attributesJson` |  | — | `attributes` |

## Sheet 4 — `OpeningStock` (optional, one row per item/variant/store/batch) → `OpeningStockItemDto`
Grouped server-side into one `OpeningStockDto` per `storeName`, then **applied** (posts to the stock ledger).
| Column | Req | Type | Maps to | Notes |
|---|---|---|---|---|
| `itemCode` | ✅ | text | `itemUid` | resolved after item create |
| `variantSku` |  | text | `variantUid` | if the item has variants |
| `storeName` | ✅ | text | `OpeningStockDto.storeUid` | resolved → store uid |
| `qty` | ✅ | decimal | `qty` | **in base unit** (or add `unitName` to convert) |
| `unitName` |  | text | — | optional; converts qty → base via `conversionQty` |
| `batchNumber` |  | text | `batchNumber` | |
| `expiryDate` |  | date (YYYY-MM-DD) | `expiryDate` | pharmacy/perishables |
| `mrp` |  | decimal | `mrp` | |
| `costPrice` |  | decimal | `costPrice` | valuation |
| `openingDate` |  | date | `OpeningStockDto.openingDate` | default today |
| `note` |  | text | `OpeningStockDto.note` | |

---

## Reference resolution (by name → uid)
- **Units / stores / category / vendor**: case-insensitive match within tenant. Policy per type:
  - Units, Category: `create-if-missing` toggle (default on) or error.
  - Stores: must already exist → error if not found (don't auto-create stores).
- **Item linking**: `itemCode` joins Units/Variants/OpeningStock to Items.
- **Category source is unresolved today** — there is no commerce Category service. Decide: accept `categoryUid` directly, resolve against an existing category source, or leave category optional. (Flag for the team.)

## Import flow (UI + backend)
1. **Upload** `.xlsx`/`.csv` → parse client-side with SheetJS.
2. **Map** columns (auto-map by header; allow manual remap).
3. **Validate (dry-run)**: types, required fields, enum values, reference resolution,
   duplicate `itemCode`, exactly-one-default-unit, base-unit row present. Produce a
   per-row/column **error report**; nothing is written in dry-run.
4. **Mode**: `create-only` (skip existing by sku/code) or `upsert` (update existing).
5. **Commit**: build payload and write. Two options:
   - **Recommended — new transactional bulk endpoint** `POST /v1/api/tenant/items/import`
     that takes the structured payload (items[] with nested units/variants/attributes +
     openingStock[]), validates server-side, creates items, then creates+applies an
     `OpeningStock` doc per store, and returns a per-row result (created/updated/skipped/errors).
   - Fallback — UI orchestrates existing endpoints: `POST /items` (carries units+variants+
     attributes) per item, then `POST /opening-stock` + `POST /opening-stock/{uid}/apply`
     per store. Simpler but not atomic and slower.
6. **Result report**: counts + downloadable error rows for re-upload.

## Backend work (if bulk endpoint)
- `dto/ItemImportRequest` (items[] + openingStock[]), `dto/ItemImportResult` (rows[] with status+message).
- `ItemImportController` `POST /items/import` → `ItemImportService` (validate → resolve refs →
  create items via existing item create path → build/apply opening stock). Follow the 8-layer
  pattern; reuse `ItemService`/`OpeningStockService`. Tenant via `RequestContextUtil.tenantUid()`.
- Provide a **template download** endpoint or a static `.xlsx` template matching the 4 sheets.

## Acceptance
- Download template → fill → upload → dry-run shows accurate validation errors.
- A clean file imports items with units (per-unit pricing), variants, attributes, and opening
  stock that actually posts to the stock ledger (visible in Stock Summary).
- Re-import with `upsert` updates existing items; `create-only` skips them.
- `npx tsc --noEmit` (UI) clean; `./gradlew compileJava` clean.

---

## Build prompt for Antigravity
Paste this verbatim. (Companion spec — read it first: `apps/mfe-karty/ITEM_IMPORT_SPEC.md`.)

> **Task: Item Import / migration for karty.** Implement per `apps/mfe-karty/ITEM_IMPORT_SPEC.md`
> (read the whole file first). Repos: UI `apps/mfe-karty` (jaldee-business-mfe — pinned React
> 18.2 / react-router 6.22 / Tailwind 3 core-classes-only / Vite 5; do NOT upgrade); backend
> `feature-commerce-service` (ms2). Conventions: 8-layer pattern, mirror the existing `Item`/
> `Vendor` controllers, service-direct-from-controller, raw DTO returns (no ApiResponse wrap),
> tenant via `RequestContextUtil.tenantUid()`, NO silent mocks. Live UI tree is `App.tsx`
> `<Routes>` → `src/new-karty-src/src/components/*`; do not touch `inventorynew/`, `pages/`, or
> `DashboardLayout.tsx`.
>
> **Part A — Item display number (`itemNo`).** Items only have `uid` (auto UUID) and a
> caller-supplied `code`/`sku`; add a human-readable, auto-generated, unique display id. Reuse the
> existing sequence mechanism (`commerce_sequence_tbl`, `enums/SequenceScope`, generator in
> `CommerceSettingsServiceImpl`): add `ITEM` to `SequenceScope`; add an `itemNo` column to
> `ItemEntity` + `ItemDto` (unique per tenant, format `ITM-00001`) with a Flyway migration (next
> `V2026…` number); assign `itemNo` automatically on item create AND on import. Do NOT overload
> `code`. Show `itemNo` in the Items list/detail UI.
>
> **Part B — Bulk import endpoint.** Add transactional `POST /v1/api/tenant/items/import`
> (`ItemImportController` + `ItemImportService` + `ItemImportRequest`/`ItemImportResult` DTOs):
> validate; resolve unit/store/category by name (create-if-missing for units/category, error for
> missing stores); create items with nested units+variants+attributes (reuse `ItemService`);
> assign `itemNo`; keep the row's `code`/`sku` if provided (preserve legacy), else fall back to
> `sku`/`itemNo`; then create and **apply** one `OpeningStock` doc per store (reuse
> `OpeningStockService`). Support `create-only` and `upsert` (match existing by `code`/`sku`).
> Return a per-row result (created/updated/skipped/errors).
>
> **Part C — Import wizard UI** on the Items screen: upload `.xlsx`/`.csv` (SheetJS); auto-map +
> manual column remap; **dry-run validation with a per-row/column error report** (writes nothing);
> mode selector; commit; result report with a downloadable error file; plus a **downloadable
> template workbook** (4 sheets: Items, Units, Variants, OpeningStock) with one sample row.
>
> **File identifiers:** no `uid`, no `itemNo` columns (both backend-assigned). Only `code`/`sku`
> come from the source, plus the file-local `itemCode` linking key (joins the sheets).
>
> **Verify:** `npx tsc --noEmit -p apps/mfe-karty/tsconfig.json` clean; `./gradlew compileJava`
> (feature-commerce-service) clean. **Report:** endpoint, new DTOs, migration version, `itemNo`
> format, template columns. Add **P2.6 Item import** to `apps/mfe-karty/TASKS.md`. **Flag** the
> unresolved **category source** (no commerce Category service today) for the team.
