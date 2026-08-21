# Antigravity task — Karty storefront themes (selectable templates)

## Goal
Add a **storefront theme system** to karty: a set of several pre-built, visually distinct
storefront templates the business can **choose from during onboarding** (and later change in
Storefront Settings). Drag-and-drop / page-builder is NOT required now — just selectable,
fully-built templates with live preview thumbnails. The chosen theme is persisted per tenant
and drives the public `/store` experience.

## Where things are (extend, don't rebuild)
- App: `apps/mfe-karty` (monorepo `jaldee-business-mfe`). **Pinned: React 18.2.0,
  react-router-dom 6.22.3, TypeScript 5.4.5, Tailwind 3 (core utility classes only — no TW4
  syntax, no `@theme`/oklch), Vite 5.** Do not upgrade anything.
- Existing storefront lives in
  `src/new-karty-src/src/components/storefront/`:
  - `StorefrontLayout.tsx` — header + footer + slide-in cart drawer, wraps `<Outlet/>`.
    (Currently a single hardcoded "MyStore" design.)
  - `StorefrontHome.tsx` — hero + product grid; reads live products via
    `useItems()` (`../../../../services/useItems`), adds to cart via `useStorefrontCart()`.
  - `StorefrontCheckout.tsx`, `StorefrontCartProvider.tsx`, `StorefrontSettingsTab.tsx`.
- Routing (in `src/App.tsx`): `/store` → `<StorefrontLayout>` with index `<StorefrontHome/>`
  and `checkout` → `<StorefrontCheckout/>`, all wrapped in `<StorefrontCartProvider>`.
- Data + cart hooks are theme-agnostic and MUST be reused as-is.

## What to build

### 1. Theme registry
Create `src/new-karty-src/src/components/storefront/themes/`:
- One folder per theme, each exporting a `Layout` (header/footer/cart-trigger wrapping
  `<Outlet/>`) and a `Home` (catalog) component.
- `themes/registry.ts` exporting:
  ```ts
  export interface StorefrontThemeMeta {
    id: string; name: string; description: string; tags: string[];
    Thumbnail: React.ComponentType;      // inline preview (SVG/CSS, NO external images)
  }
  export interface StorefrontTheme extends StorefrontThemeMeta {
    Layout: React.ComponentType; Home: React.ComponentType;
  }
  export const STOREFRONT_THEMES: StorefrontTheme[];
  export const DEFAULT_THEME_ID: string;
  export function getTheme(id?: string | null): StorefrontTheme; // falls back to default
  ```

### 2. Build 5 genuinely distinct themes
Each must be a DIFFERENT layout/typography/color treatment (not recolors). Suggested:
`minimal` (clean, lots of whitespace), `bold` (big type, dark hero), `boutique`
(editorial/serif, large imagery), `market` (dense grid, deals-forward), `dark` (dark mode).
Each theme MUST:
- Read products from `useItems()` only (filter `status === 'ACTIVE'`). **No mock/seed data.**
- Handle loading / empty / error states honestly.
- Add to cart via `useStorefrontCart()`; reuse `StorefrontCartProvider` and
  `StorefrontCheckout` unchanged.
- Be fully responsive; Tailwind **core classes only**; no `localStorage`.
- Use the existing product fields (`item.name`, `item.categoryName`, `item.variants?.[0]?.price`).

### 3. Active-theme wiring
- Add `services/useStorefrontSettings.ts` (via `useCommerceApi`): `GET`/`PUT`
  `/v1/api/tenant/storefront-settings` returning at least `{ themeId }`. If a storefront/commerce
  settings endpoint already exists, extend it instead of inventing a new one — check
  `CommerceSettingsController` / `StorefrontSettingsTab` first.
- Refactor `/store` so the rendered Layout/Home come from `getTheme(settings.themeId)`
  (default when unset). Keep `StorefrontCartProvider` + `/store/checkout` outside the theme.

### 4. Onboarding + settings theme picker
- Build `storefront/ThemeGallery.tsx`: a responsive grid of theme cards, each showing the
  theme's `Thumbnail`, name, description, tags, a **"Use this theme"** button, and a
  "currently active" badge. Selecting persists `themeId` via `useStorefrontSettings` (PUT)
  and shows a success toast.
- Surface it in two places: (a) a **Theme** tab/section in `StorefrontSettingsTab`, and
  (b) the **onboarding** flow (wherever store setup happens). Optional: a "Preview" link that
  opens `/store?previewTheme=<id>` so they can see it live before saving.

### 5. Backend (feature-commerce-service, ms2)
- Persist `themeId` (String, nullable) on the storefront/commerce settings entity + DTO +
  mapper; expose `GET`/`PUT` on the settings controller. Follow the 8-layer pattern; mirror
  `VendorController`/`CommerceSettingsController`. Service-direct-from-controller, tenant via
  `RequestContextUtil.tenantUid()`, raw DTO returns (not ApiResponse-wrapped). Add a Flyway
  migration for the new column (next `V2026...` number).

## Constraints & acceptance
- **No silent mocks** anywhere — real product data or honest empty/error states.
- Do not touch the dead trees (`src/inventorynew/`, `src/pages/*Page.tsx`,
  `components/layout/DashboardLayout.tsx`).
- Keep `/store` route paths and the `StorefrontCartProvider` wrapper intact.
- **Verify:** `npx tsc --noEmit -p apps/mfe-karty/tsconfig.json` clean; `vite build` of
  mfe-karty succeeds; `./gradlew compileJava` in feature-commerce-service succeeds.
- Acceptance: 5 distinct themes selectable; choosing one in onboarding/settings persists and
  changes `/store`; default theme renders when none chosen; all themes show live products.

## Report back
List the theme ids built, the settings endpoint used (new vs extended), the migration version,
and anything you deviated from. Update `apps/mfe-karty/TASKS.md` (add this under Phase 2 as
"P2.5b Storefront themes").
