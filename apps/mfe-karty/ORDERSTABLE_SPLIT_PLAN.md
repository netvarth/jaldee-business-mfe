# OrdersTable.tsx split — execution plan

Target file: `apps/mfe-karty/src/new-karty-src/src/components/OrdersTable.tsx`

This is the live component behind `/karty/orders`. It is a ~3,289-line god-component with
107 `useState` hooks and 21 memo/effect/callback. We are splitting it into smaller files
**in phases**. Do **not** rewrite it in one pass.

## Already done (do not redo)
- `DraftOrderStep1`, `DraftOrderStep2` extracted (imported by OrdersTable).
- **Phase 1**: 5 leaf modals extracted into `./OrdersModals.tsx`
  (`OrderLabelModal`, `OrderAssigneeModal`, `OrderTemplateModal`, `OrderRatingModal`,
  `PhotoLightbox`). **Use that file as the reference pattern.**

## Hard rules (learned the hard way — this file has crashed 3× from these)
1. **Verbatim moves only.** Copy JSX exactly; do not "improve" markup, classes, or logic.
   Behavior must be byte-identical.
2. **Move state as a unit.** When you move state out of OrdersTable into a hook, move
   *every* declaration and *every* setter usage together. A single orphaned reference
   throws a runtime `ReferenceError` that blanks the whole page (this already happened
   with `showCreateModal`, `statusFilters`, `orderSuccess`).
3. **No import cycles.** Child components use `import type { OrderItem } from './OrdersTable'`
   (type-only, erased at compile) and receive shared constants (`AVAILABLE_LABELS`,
   `AVAILABLE_ASSIGNEES`) as **props** — never a runtime import back into OrdersTable.
4. **Modals stay inside the parent's `<AnimatePresence>`.** Keep the conditional
   (`{stateVar && <Modal .../>}`) in the **parent**; the child returns the inner JSX only.
   This preserves exit animations.
5. **Build is the only reliable type signal** — `tsc -p tsconfig.json` is a no-op in this
   repo (checks zero files). After **each** phase run `cd apps/mfe-karty && npm run build`.
   It must succeed. Then restart the server and verify live. If a phase fails to build or
   crashes at runtime, **stop and report** — do not pile on more phases.

## Verify after every phase
1. `cd apps/mfe-karty && npm run build` (must succeed)
2. Restart karty preview: `kill $(lsof -ti tcp:3005); (cd apps/mfe-karty && nohup npm run serve &)`
   Ensure shell-host is up: `curl -sS -o /dev/null -w "%{http_code}" http://localhost:4000/`
   (if not 200: `cd apps/shell-host && nohup npm run serve &`)
3. Open `http://localhost:4000/karty/orders`, hard-reload to bust the Module Federation
   cache, confirm the orders list renders and console has **no** `ReferenceError` /
   `RENDER_FAILED` from mfe-karty. (Backend 500s and a stale mfe-health remoteEntry are
   unrelated — ignore those.)
4. Click an order row to confirm the detail view still opens.

## Phases (do in order; build + verify + report after each)

### Phase 1b — heavier overlays (in the main `return`, ~2900–3130)
Extract into `./OrdersModals.tsx` (or a new `./modals/` dir):
- `OrderDetailDrawer` — the `{viewingOrder && (…)}` block (~150 lines)
- `OrderInvoiceModal` — the `{invoiceOrder && (…)}` block (~140 lines)

These reference more handlers/state than the leaf modals; pass each referenced handler
and value as an explicit prop. Grep the block for every identifier it uses and confirm
each is passed in. Keep the conditional in the parent.

### Phase 2 — filter drawer + hook
- Create `./hooks/useOrderFilters.ts` exporting the 11 filter states
  (`patientNameFilter`, `orderIdFilter`, `statusFilters`, `storeFilters`,
  `assignedUserFilters`, `labelFilters`, `orderTypeFilters`, `paymentStatusFilters`,
  `dateRangeFilters`, `filterDropdownOpen`, `activeDropdownId`) **plus** the
  `filteredOrders` `useMemo`. Return them as an object. Move **all** their declarations
  out of OrdersTable together (rule 2).
- Create `./OrdersFilterDrawer.tsx` from the `{filterDropdownOpen && (…)}` block.
- OrdersTable consumes `const filters = useOrderFilters(orders)` and passes what the
  drawer + list need.

### Phase 3 — data hook
- Create `./hooks/useOrdersData.ts` that calls the ~14 data hooks currently at the top of
  OrdersTable (`useOrders`, `useUsers`, `useTradePartners`, `useItems`, `useStores`,
  `usePickLocations`, `useOrderCatalogs`, `useStoreCatalogProducts`, `useUnits`,
  `useCustomers`, `useStorefrontSettings`, `useOrderInvoice`, plus the mutation hooks)
  and returns their results. Container calls one hook instead of 14. Pure move — no
  behavior change.

### Phase 4 — create/POS wizard (HIGHEST RISK — do last, alone)
- The `if (showCreateModal) { return (…) }` branch (~1652–2258) is the 3-step create/POS
  flow with ~30 interdependent states (`createStep`, `posCart`, `customerMode`,
  `selected*`, `new*Customer*`, `orderSuccess`, etc.) and their handlers.
- Create `./hooks/useOrderCreate.ts` for that state cluster + handlers, and
  `./OrderCreateWizard.tsx` for the branch JSX (which already delegates to
  `DraftOrderStep1`/`DraftOrderStep2`).
- Because of the state entanglement, do this **incrementally**: move the wizard JSX first
  (passing state down as props from the still-in-container states), build + verify, **then**
  lift the states into the hook, build + verify again. Do not do both at once.

### Final
Container `OrdersTable.tsx` becomes a thin router: data via `useOrdersData`, filters via
`useOrderFilters`, rendering `<OrdersListTable/>` / `<OrderCreateWizard/>` plus the
conditional modals. Target: container well under ~400 lines.

## Report format
After each phase: the new file(s), the OrdersTable line-count delta, the build result, and
the live-verify result. If anything fails, stop and show the error.
