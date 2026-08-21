# Karty — Store & Item Creation: Issues & Fixes

**Reviewed:** 2026-08-18 · **Scope:** store creation + item creation, `feature-commerce-service` + `mfe-karty`
**Method:** backend DTO/service/validation read → Karty form + payload builder read → live create in preview → verify create → list → detail → edit-prefill round-trip.
**Tenant:** Test Business · commerce-service `:9105` (needs `REDIS_HOST=localhost`, see N-1).

---

## Status summary

| ID | Severity | Area | Issue | Status |
|----|----------|------|-------|--------|
| **I-2** | 🔴 High | Item | Item detail showed **₹0.00** for Sales Price & MRP | ✅ **Fixed & verified** |
| **S-2** | 🔴 High | Store | Detail page fabricated a fake "Order Catalog" card | 🟠 **Mostly fixed — 1 residual block left** |
| **S-1** | 🔴 High | Store | **Email** collected but silently dropped (no backend field) | ⬜ Open |
| **S-3** | 🟡 Med | Store | `trackInventory:true` allowed with **no inventory catalog** | ⬜ Open |
| **S-4** | 🟡 Med | Store | Store **image upload** entirely non-functional | ⬜ Open |
| **S-5** | 🟡 Med | Store | Per-store **invoice numbering** never persisted | ⬜ Open |
| **I-1** | 🟡 Med | Item | New unit row auto-picks arbitrary unit + both roles checked | ⬜ Open |
| **S-6** | 🟢 Low | Store | Backend **drug-license** fields have no FE UI | ⬜ Open |
| **I-3** | 🟢 Low | Item | Transient duplicate row after create (self-heals) | ⬜ Open |
| **C-1** | ℹ️ Decision | Item | Per-unit pricing: model supports it, UI copy denies it | ⬜ Needs product call |

---

## ✅ I-2 — Item detail showed ₹0.00 for Sales Price & MRP  *(FIXED)*

**Severity:** High — looked like total data loss on every item.

**Symptom.** Created an item with MRP 150 / Selling 120. Both persisted correctly, but the item
detail page rendered **₹ 0.00** in the catalog card *and* the variants table.

**Root cause.** `GET /items/{uid}/placements` returns `ItemPlacementDto`, which had **no price
fields at all** — only `storeUid, store, orderCatalogUid, catalog, inventoryCatalogUid,
inventoryCatalog`. The frontend read `p.salesPrice`, a key the backend has never sent, so it always
fell through to `'0.00'`. The price was correct in the DB the whole time (confirmed via
`inventory-catalogs/item-placements` → `mrp:150, sellingPrice:120`).

**Fix applied — backend** `dto/ItemPlacementDto.java`:
```java
@Builder
public record ItemPlacementDto(
        UUID storeUid, String store,
        UUID orderCatalogUid, String catalog,
        UUID inventoryCatalogUid, String inventoryCatalog,
        BigDecimal mrp,            // added
        BigDecimal sellingPrice    // added
) {}
```

**Fix applied — backend** `service/impl/ItemServiceImpl.java#getPlacements()`: fetch every
`InventoryCatalogItemEntity` for the item **once**, key it by uid, and populate price in *both*
branches (order-catalog placements resolve via `oci.getInventoryCatalogItemUid()`; inventory-only
placements read their own row):
```java
List<InventoryCatalogItemEntity> allIci =
        inventoryCatalogItemRepository.findByTenantUidAndItemUid(tenantUid, itemUid);
Map<UUID, InventoryCatalogItemEntity> iciByUid = allIci.stream()
        .collect(Collectors.toMap(InventoryCatalogItemEntity::getUid, i -> i, (a, b) -> a));
// … .mrp(ici != null ? ici.getMrp() : null).sellingPrice(ici != null ? ici.getSellingPrice() : null)
```

**Fix applied — frontend** `new-karty-src/src/components/ItemDetails.tsx`:
```ts
salesPrice: p.sellingPrice ?? p.salesPrice ?? '',   // backend field is sellingPrice
mrp: p.mrp ?? '',
```

**Verified live:** API now returns `mrp:150, sellingPrice:120`; detail page renders
**₹120.00 / ₹150.00**. No schema/migration change was needed.

---

## 🟠 S-2 — Store detail fabricated a phantom "Order Catalog" card  *(residual)*

**Severity:** High — shows users a catalog that does not exist.

**Original symptom.** Creating a store with `selfOrder:true` and no catalog produced a detail page
reading **"1 Catalogs Assigned to this Store"** with an **ACTIVE** badge, a name
(`"<store> Order Catalog"`) and an "Add Products" button — while `GET /order-catalogs` returned
zero rows for that store and no `POST /order-catalogs` was ever fired.

**Now.** The `selfOrder`-driven fabrication has been removed — `storeInvCatalogs` /
`storeOrderCatalogs` are now filtered strictly on real `storeUid` / real catalog uid
("NO phantom fallbacks").

**Residual — still open.** `StoreDetails.tsx` **lines 957–980** still render an **ACTIVE** card with
"0 Products" purely from a *name string*:
```tsx
{/* Fallback if catalog was saved by name in store but pending query reload */}
{storeInvCatalogs.length === 0 && storeOrderCatalogs.length === 0 &&
 (store.inventoryCatalogName || store.orderCatalogName) && ( … ACTIVE … 0 Products … )}
```
`inventoryCatalogName` / `orderCatalogName` are **create-time inputs that are never persisted on
the entity** (`StoreDto`: *"Not persisted on the store entity itself"*). So this block can only fire
from stale local state right after create — i.e. precisely the misleading window.

**Fix:** delete lines 957–980. The genuine empty state already exists (`totalAssignedCatalogs === 0`,
line ~924); also drop `&& !store.inventoryCatalogName && !store.orderCatalogName` from that
condition so the honest "No Catalogs Assigned" state actually shows.

---

## ⬜ S-1 — Store email is silently dropped

**Severity:** High (silent data loss).

**Symptom.** The create-store form collects an email. After save it still displays (local state), so
it looks saved — then **disappears on refresh**.

**Root cause.** There is no `email` anywhere in `StoreDto` or `StoreEntity`, and `StoreEntity` has
no jsonb catch-all (unlike `ItemEntity.attributes`). Confirmed live: the `POST /stores` response and
a fresh `GET /stores/{uid}` contain no `email` key.

**Fix (3 files + migration):**
1. Migration `src/main/resources/db/migration/commerce/V20260821_01__add_store_email.sql`
   *(last existing is `V20260820_01` — re-check before creating)*:
   ```sql
   ALTER TABLE store_tbl ADD COLUMN IF NOT EXISTS email VARCHAR(150);
   ```
2. `entity/StoreEntity.java`: `@Column(name = "email", length = 150) private String email;`
3. `dto/StoreDto.java`: `private String email;`

MapStruct maps it automatically; the FE already sends `email` in the payload, so no frontend change
is required.

*Alternative (no migration):* add a `capabilities`-style jsonb `attributes` map to the store and
route email + S-4 + S-5 through it — better long-term if more free-form store fields are coming.

---

## ⬜ S-3 — `trackInventory:true` store can be created with no inventory catalog

**Severity:** Medium — store silently cannot hold stock.

**Symptom.** Reproduced live: created a store with `trackInventory:true`, left the (off-screen)
catalog-name field empty → `inventoryCatalogUid: null`. Neither FE nor backend warns.

**Root cause.** `StoreServiceImpl.create()` auto-provisions a catalog **only if**
`inventoryCatalogName` is non-blank:
```java
if (saved.isTrackInventory() && saved.getInventoryCatalogUid() == null
        && dto.getInventoryCatalogName() != null && !dto.getInventoryCatalogName().isBlank()) { … }
```

**Fix (recommended — auto-provision instead of failing):** in `StoreServiceImpl.create()`, drop the
name requirement and fall back to a derived name:
```java
if (saved.isTrackInventory() && saved.getInventoryCatalogUid() == null) {
    String catName = (dto.getInventoryCatalogName() != null && !dto.getInventoryCatalogName().isBlank())
            ? dto.getInventoryCatalogName().trim()
            : saved.getName() + " Stock";
    // … existing inventoryCatalogService.create(...) block
}
```
*Alternative (stricter):* throw `ValidationException("Inventory catalog is required when tracking inventory")`.
Auto-provision is preferred — it matches what the user asked for by ticking the box.

---

## ⬜ S-4 — Store image upload is non-functional

**Severity:** Medium (UI theatre).

**Symptom.** "Store Gallery" accepts a file and previews it; the value is put in the payload as
`uploadedImage`; nothing is stored. No backend field, no `imageDriveId`, no upload call.

**Fix — pick one:**
- **Wire it** (mirrors items, which already do this): add `image_drive_id` column +
  `StoreEntity.imageDriveId` + `StoreDto.imageDriveId`, upload the file via the existing
  `shared-drive` client, then send the returned drive id. Reuse the item image flow.
- **Or remove the control** until it is real — a non-working upload is worse than no upload.

---

## ⬜ S-5 — Per-store invoice numbering never persists

**Severity:** Medium.

**Symptom.** The store form's "Invoicing" tab configures B2B/B2C invoice types with
prefix/suffix/active/independent-sequence. `executeSaveForm()` sends `orderTypes`,
`prefixSuffixRows`, `invoiceTypeRequiredVal`, `walkInInvoiceTypes` — **none of which exist on
`StoreDto`**. All discarded by Jackson; state is client-side only.

**Fix — pick one:**
- **Persist as jsonb** (smallest change): add `invoice_config jsonb` to `store_tbl` +
  `private Map<String,Object> invoiceConfig;` on entity/DTO (same pattern as the existing
  `capabilities` / `fulfillmentMethods` jsonb columns), and send `orderTypes` under that key.
  Then wire it into the sequence generator so the prefixes actually apply to issued numbers.
- **Or hide the tab** until the numbering engine is built — currently it implies a guarantee
  (auditor-friendly continuous per-type series) that nothing enforces.

---

## ⬜ I-1 — New unit row auto-picks an arbitrary unit with both roles checked

**Severity:** Medium (easy to save a nonsense unit).

**Symptom.** Clicking **+ Add Unit** creates a row already set to an arbitrary unit — in this tenant
a stray test unit literally named **"ping"** — with **both** *Selling·Default* and
*Purchase·Default* pre-ticked.

**Root cause** — `new-karty-src/src/components/ItemUnitConfig.tsx`:
```ts
const newRow = (unitUid = ''): ItemUnitRow => ({
  unitUid, conversionQty: 1, selling: true, purchase: true, /* … */ });

const addUnit = () => {
  const firstUnused = unitOptions.find((u) => u.uid !== baseUnitUid && !units.some(r => r.unitUid === u.uid));
  setUnits([...units, newRow(firstUnused?.uid || '')]);   // ← auto-picks
};
```

**Fix:** don't guess the unit, and don't claim both roles. The component **already warns** on both
conditions (`'Every unit row must pick a unit.'`, `'At least one unit must be a selling unit.'`), so
this is low-risk:
```ts
const newRow = (unitUid = ''): ItemUnitRow => ({
  unitUid, conversionQty: 1, selling: true, purchase: false, /* … unchanged … */ });

const addUnit = () => setUnits([...units, newRow('')]);
```

---

## ⬜ S-6 — Drug-license fields have no frontend UI

**Severity:** Low (but a pharmacy-compliance gap).

`StoreDto`/`StoreEntity` carry `dlNumber2021`, `dlNumber20b21b`, `dlExpiryDate`, `dlHardBlock`
(`dl_hard_block` presumably gates sales on an expired licence). **Zero** references anywhere in the
Karty store form — backend-ready, frontend absent (the inverse of S-1/S-4/S-5).

**Fix:** add a "Drug Licence" section to the store form, shown when
`verticalType ∈ {PHARMACY, AYURVEDA}` (the same verticals `create()` already entitlement-checks):
two licence numbers, an expiry date picker, and a "block sales after expiry" toggle bound to
`dlHardBlock`.

---

## ⬜ I-3 — Transient duplicate row in the items list

**Severity:** Low (cosmetic, self-healing).

Immediately after creating an item the list briefly showed **two rows** for it (one unpriced) —
API confirmed **only one** record was ever created, and a refresh collapsed it. This is a
client-side cache-merge artifact (an optimistic entry not replaced by the server row), **not** a
double-submit.

**Fix:** in `useCreateItem`'s `onSuccess`, replace/dedupe by `uid` rather than appending, or drop the
optimistic insert and rely on `invalidateQueries(['items'])` alone.

---

## ℹ️ C-1 — Per-unit pricing: model vs. UI copy *(needs a decision)*

`ItemUnitDto` supports independent `sellingPrice`/`mrp` **per unit**, but the create wizard's
step-2 copy says *"other selling units are priced automatically from their conversion"*.

**Decide:** (a) allow independent per-unit prices in the UI and fix the copy, or (b) keep
auto-derive and drop the claim that units can be priced independently. Until then the model and the
UI disagree. *(Carried over from an earlier session — still open.)*

---

## N-1 — Environment note (not a product bug)

`commerce-service` must be started with **`REDIS_HOST=localhost`**. The local profile defaults to
`${REDIS_HOST:host.docker.internal}`, which only resolves inside Docker; running via `./gradlew
bootRun` on the host makes every `@Cacheable` store query fail with
`500 … "Query failed with NXDOMAIN"` — which is what emptied the Ship-to-Store dropdown earlier.
Worth baking into the launch script so it does not recur.

---

## Suggested order of work

1. **S-2 residual** (delete lines 957–980) — smallest change, removes actively misleading UI.
2. **S-1 email** — silent data loss; one migration + two field additions.
3. **S-3 auto-provision catalog** — a few lines in `StoreServiceImpl.create()`.
4. **I-1 unit-row defaults** — two-line frontend change, warnings already back it.
5. **S-5 / S-4** — decide *persist vs. remove*; both currently promise something untrue.
6. **S-6, I-3, C-1** — polish / product decision.

---

## Test artifacts left in `Test Business`

Per this repo's convention these were **not** cleaned up:
- Store `ZZ QA Test Store` — `4ed4d52d-6350-4a28-8b31-d8979de2454e`
- Item `ZZ QA Full Review Item` / SKU `ZZ-QA-SKU-01` — `ca706954-6e83-4408-91cc-3d04d67bc30d` (ITM-00128)

**Re-verify I-2 with:**
```bash
GET /commerce-service/v1/api/tenant/items/ca706954-6e83-4408-91cc-3d04d67bc30d/placements
# expect: mrp: 150, sellingPrice: 120
```
