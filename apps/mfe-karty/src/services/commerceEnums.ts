/**
 * The commerce-service enums that dashboard filters key off, copied from the backend source of
 * truth rather than re-derived per screen.
 *
 * ## Why this file exists
 * Three dashboard panels (KartyOverview's attention chips, InventoryDashboardPage's "Transfers
 * in flight" and "Purchase pipeline") each hand-wrote their own list of status strings to filter
 * on, and each list included constants that do not exist in the actual backend enum —
 * `PENDING_APPROVAL`, `RECEIVING`, `DISPATCHED`, `SHIPPED`, `PARTIAL`, `INITIATED`, `CANCELED`,
 * `REFUNDED`. Those are harmless only because they match nothing; the real damage is a status
 * that *does* exist being left out because the list was reconstructed from memory rather than
 * copied from source. `PARTIALLY_RECEIVED` transfers vanishing from "in flight", and `REQUESTED`
 * purchases having no bucket at all, are both that failure mode. See
 * `docs/karty-dashboards-review.md` A3 / C4 / C5.
 *
 * Values here are `.name()` strings, matching what the REST DTOs serialize
 * (`@Enumerated(EnumType.ORDINAL)` on the JPA side, but every DTO/controller boundary in
 * commerce-service returns the Jackson default, which is the enum name). If a backend enum
 * gains or renames a constant, this file is the one place to update — every panel reading
 * through the helpers below picks it up.
 */

/** `com.jaldee.commerce.enums.PurchaseStatus` — DRAFT, IN_REVIEW, APPROVED, REQUESTED, CANCELLED. */
export const PURCHASE_STATUS = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REQUESTED: 'REQUESTED',
  CANCELLED: 'CANCELLED',
} as const;

/**
 * Every non-terminal purchase status, in pipeline order — for a breakdown that shows *where*
 * each open purchase sits (the Inventory dashboard's "Purchase pipeline" buckets by these
 * individually, one bucket per status).
 */
export const PURCHASE_OPEN_STATUSES: string[] = [
  PURCHASE_STATUS.DRAFT,
  PURCHASE_STATUS.REQUESTED,
  PURCHASE_STATUS.IN_REVIEW,
  PURCHASE_STATUS.APPROVED,
];

/**
 * The subset that still needs a person to act on it — narrower than "open". `APPROVED` and
 * `REQUESTED` have already moved past the review step, so an attention chip counting all four
 * open statuses would flag purchases nobody is waiting on. Matches the original intent of the
 * Overview attention chip (which, before this fix, effectively resolved to DRAFT + IN_REVIEW
 * anyway, because its other two literal strings didn't exist on the real enum).
 */
export const PURCHASE_NEEDS_REVIEW_STATUSES: string[] = [
  PURCHASE_STATUS.DRAFT,
  PURCHASE_STATUS.IN_REVIEW,
];

/** `com.jaldee.commerce.enums.TransferStatus` — DRAFT, IN_TRANSIT, PARTIALLY_RECEIVED, RECEIVED, CANCELLED. */
export const TRANSFER_STATUS = {
  DRAFT: 'DRAFT',
  IN_TRANSIT: 'IN_TRANSIT',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;

/**
 * "In flight" = dispatched but not fully arrived. `PARTIALLY_RECEIVED` belongs here — the
 * transfer is not finished — and was the one previously dropped by both call sites.
 */
export const TRANSFER_IN_FLIGHT_STATUSES: string[] = [
  TRANSFER_STATUS.IN_TRANSIT,
  TRANSFER_STATUS.PARTIALLY_RECEIVED,
];

/** `com.jaldee.commerce.enums.SalesReturnStatus` — DRAFT, PENDING, COMPLETED. */
export const SALES_RETURN_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
} as const;

/**
 * "Awaiting action" = submitted but not resolved. `DRAFT` has not been submitted yet and
 * `COMPLETED` is already resolved, so `PENDING` is the only status that belongs here — the
 * previous three-way OR (`REQUESTED`, `INITIATED`, `IN_REVIEW`) matched nothing real.
 */
export const SALES_RETURN_AWAITING_ACTION_STATUSES: string[] = [SALES_RETURN_STATUS.PENDING];
