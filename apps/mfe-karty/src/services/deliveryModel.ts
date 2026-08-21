/**
 * Delivery pricing model + resolver — Phase 1 + Phase 2 (LOG-004).
 *
 * ## Why this file exists
 * Delivery pricing was two things at once: a `calculateDeliveryFee` in `useDeliveryProfiles.ts`
 * that only ever saw the order subtotal, and a `DeliveryProfile` shape in `useDelivery.ts` that
 * treated `zones`/`feeRules` as opaque. The rate table itself lived implicitly in the form. This
 * module makes the model explicit and gives ONE resolver that the checkout, the authoring form
 * and any future server-side parity can share.
 *
 * ## Backward compatibility is non-negotiable
 * `zones` and `feeRules` are free-form jsonb on the backend, and tenants already have legacy
 * profiles written by the old single-`type` form (`price` / `state` / `stateprice` / `weight` /
 * `stateweight`, plus the even older `{ flatRate }`). Those MUST keep resolving to exactly the
 * same fee. So the model is versioned: a v2 profile carries `feeRules.schemaVersion === 2` and a
 * nested zone→method→rate table; anything else is resolved by the legacy path, unchanged.
 *
 * The v2 model is the Shopify/Woo/India-courier standard from the LOG-004 benchmark:
 *   Profile (optional product class)                                   ── Phase 2 grouping
 *     → Zones (match by all-India / states / pincode ranges, + COD)    ── Phase 1 geography
 *       → Methods (Standard / Express / Pickup / Local, + ETA)         ── Phase 2 choice
 *         → Rates (flat | order-value band | weight slab), first match ── Phase 1 pricing
 *   + order-level conditions (free above ₹X, min order), handling fee, ── Phase 1
 *     volumetric divisor (chargeable = max(actual, volumetric))        ── Phase 2
 */

/* ────────────────────────────── v2 model ────────────────────────────── */

export type RateBasis = "flat" | "value" | "weight";

export interface DeliveryRate {
  basis: RateBasis;
  charge: number;
  /** value band (INR). `maxAmount: null` means "and above". */
  minAmount?: number | null;
  maxAmount?: number | null;
  /** weight slab (grams). `maxWeight: null` means "and above". */
  minWeight?: number | null;
  maxWeight?: number | null;
}

export type DeliveryMethodKind = "standard" | "express" | "sameday" | "pickup" | "local";

export interface DeliveryMethod {
  id: string;
  label: string;
  kind?: DeliveryMethodKind;
  etaLabel?: string;
  rates: DeliveryRate[];
}

export interface CodPolicy {
  allowed: boolean;
  /** COD handling fee. `flat` = rupees; `percent` = % of subtotal. */
  fee?: { kind: "flat" | "percent"; value: number } | null;
}

export interface ZoneMatch {
  allIndia?: boolean;
  states?: string[];
  /** Inclusive pincode ranges, compared numerically. */
  pincodeRanges?: Array<{ from: string; to: string }>;
}

export interface DeliveryZone {
  id: string;
  name: string;
  match: ZoneMatch;
  cod?: CodPolicy | null;
  etaLabel?: string;
  methods: DeliveryMethod[];
}

export interface DeliveryConditions {
  /** Free delivery when subtotal >= this (INR). Applies to the base rate only, not COD. */
  freeAboveAmount?: number | null;
  /** Delivery unavailable below this order value (INR). */
  minOrderAmount?: number | null;
}

export interface FeeRulesV2 {
  schemaVersion: 2;
  /** Phase 2 product grouping. Absent/`"standard"` = the default profile. */
  productClass?: string | null;
  handlingFee?: number | null;
  conditions?: DeliveryConditions | null;
  /** Phase 2. When set, chargeable weight = max(actualGrams, L*W*H/divisor grams). */
  volumetric?: { divisor: number } | null;
}

/** A profile as stored — v2 or legacy. Both keep `zones`/`feeRules` free-form on the wire. */
export interface DeliveryProfileLike {
  uid?: string;
  name?: string;
  storeUid?: string;
  active?: boolean;
  zones?: any[] | null;
  feeRules?: Record<string, any> | null;
}

/* ────────────────────────────── resolve I/O ────────────────────────────── */

export interface DeliveryContext {
  subtotal: number;
  /** Actual order weight in grams (sum of item weight * qty). */
  weightGrams?: number;
  /** Volumetric grams if item dimensions are known; combined via max() with actual. */
  volumetricGrams?: number;
  destinationState?: string;
  destinationPincode?: string;
  /** Chosen method id (v2). Falls back to the cheapest method when omitted. */
  methodId?: string | null;
  /** COD selected at checkout. */
  cod?: boolean;
  /** Order's product group (Phase 2). Only used by the caller to pick the right profile. */
  productClass?: string | null;
}

export type DeliveryReason =
  | "ok"
  | "no-profile"
  | "free-above-threshold"
  | "below-min-order"
  | "no-serviceable-zone"
  | "no-matching-rate";

export interface DeliveryQuote {
  /** Total delivery charge = base + handling + cod. */
  fee: number;
  baseFee: number;
  handlingFee: number;
  codFee: number;
  free: boolean;
  belowMinOrder: boolean;
  codAvailable: boolean;
  zoneId?: string;
  zoneName?: string;
  methodId?: string;
  methodLabel?: string;
  etaLabel?: string;
  reason: DeliveryReason;
}

const ZERO_QUOTE = (reason: DeliveryReason): DeliveryQuote => ({
  fee: 0, baseFee: 0, handlingFee: 0, codFee: 0,
  free: false, belowMinOrder: false, codAvailable: false, reason,
});

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
};

/* ────────────────────────────── version detection ────────────────────────────── */

export function isV2Profile(p: DeliveryProfileLike | null | undefined): boolean {
  if (!p) return false;
  if (p.feeRules && num(p.feeRules.schemaVersion, 0) >= 2) return true;
  // Tolerate a v2 shape even if the version key was dropped: a zone carrying `methods`.
  return Array.isArray(p.zones) && p.zones.some((z) => z && Array.isArray((z as any).methods));
}

/* ────────────────────────────── zone / rate matching ────────────────────────────── */

/** Numeric compare of two pincodes; non-numeric pincodes never match a range. */
function pincodeInRange(pin: string, from: string, to: string): boolean {
  const p = parseInt(pin, 10), a = parseInt(from, 10), b = parseInt(to, 10);
  if (![p, a, b].every(Number.isFinite)) return false;
  const lo = Math.min(a, b), hi = Math.max(a, b);
  return p >= lo && p <= hi;
}

/**
 * Pick the most specific zone. Specificity order: a pincode-range hit beats a state hit, which
 * beats an all-India fallback. Returns null only when nothing matches AND there is no all-India
 * zone — i.e. genuinely unserviceable.
 */
export function matchZone(
  zones: DeliveryZone[],
  state?: string,
  pincode?: string
): DeliveryZone | null {
  let pincodeHit: DeliveryZone | null = null;
  let stateHit: DeliveryZone | null = null;
  let allIndia: DeliveryZone | null = null;

  const st = (state ?? "").trim().toLowerCase();
  const pin = (pincode ?? "").trim();

  for (const z of zones) {
    const m = z?.match ?? {};
    if (pin && !pincodeHit && Array.isArray(m.pincodeRanges)) {
      if (m.pincodeRanges.some((r) => r && pincodeInRange(pin, String(r.from), String(r.to)))) {
        pincodeHit = z;
      }
    }
    if (st && !stateHit && Array.isArray(m.states)) {
      if (m.states.some((s) => String(s).trim().toLowerCase() === st)) stateHit = z;
    }
    if (!allIndia && m.allIndia) allIndia = z;
  }
  return pincodeHit ?? stateHit ?? allIndia ?? null;
}

/** First matching rate wins; a flat rate matches anything. Returns null when none match. */
export function matchRate(
  rates: DeliveryRate[],
  subtotal: number,
  chargeableWeight: number
): DeliveryRate | null {
  for (const r of rates ?? []) {
    if (r.basis === "flat") return r;
    if (r.basis === "value") {
      const min = r.minAmount == null ? 0 : num(r.minAmount);
      const max = r.maxAmount == null ? Infinity : num(r.maxAmount);
      if (subtotal >= min && subtotal <= max) return r;
    } else if (r.basis === "weight") {
      const min = r.minWeight == null ? 0 : num(r.minWeight);
      const max = r.maxWeight == null ? Infinity : num(r.maxWeight);
      if (chargeableWeight >= min && chargeableWeight <= max) return r;
    }
  }
  return null;
}

/** Cheapest method by its rate for the given order (used when the caller hasn't chosen one). */
export function cheapestMethod(
  methods: DeliveryMethod[],
  subtotal: number,
  chargeableWeight: number
): DeliveryMethod | null {
  let best: DeliveryMethod | null = null;
  let bestFee = Infinity;
  for (const m of methods ?? []) {
    const r = matchRate(m.rates, subtotal, chargeableWeight);
    const fee = r ? num(r.charge) : Infinity;
    if (fee < bestFee) { bestFee = fee; best = m; }
  }
  return best ?? (methods && methods.length ? methods[0] : null);
}

/* ────────────────────────────── v2 resolver ────────────────────────────── */

function resolveV2(p: DeliveryProfileLike, ctx: DeliveryContext): DeliveryQuote {
  const fee = (p.feeRules ?? {}) as FeeRulesV2 & Record<string, any>;
  const zones = (Array.isArray(p.zones) ? p.zones : []) as DeliveryZone[];
  const subtotal = num(ctx.subtotal);

  const chargeableWeight = Math.max(num(ctx.weightGrams), num(ctx.volumetricGrams));

  const zone = matchZone(zones, ctx.destinationState, ctx.destinationPincode);
  if (!zone) return ZERO_QUOTE("no-serviceable-zone");

  const method =
    (ctx.methodId && zone.methods?.find((m) => m.id === ctx.methodId)) ||
    cheapestMethod(zone.methods ?? [], subtotal, chargeableWeight);

  const handlingFee = Math.max(0, num(fee.handlingFee));
  const conditions = fee.conditions ?? {};
  const minOrder = conditions.minOrderAmount == null ? null : num(conditions.minOrderAmount);
  const belowMinOrder = minOrder != null && subtotal < minOrder;

  const codAvailable = !!zone.cod?.allowed;
  let codFee = 0;
  if (ctx.cod && codAvailable && zone.cod?.fee) {
    codFee = zone.cod.fee.kind === "percent"
      ? (subtotal * num(zone.cod.fee.value)) / 100
      : num(zone.cod.fee.value);
    codFee = Math.max(0, codFee);
  }

  const base = {
    zoneId: zone.id, zoneName: zone.name,
    methodId: method?.id, methodLabel: method?.label,
    etaLabel: method?.etaLabel ?? zone.etaLabel,
    codAvailable, handlingFee, codFee, belowMinOrder,
  };

  // Free-above zeroes the base rate (shipping), not COD/handling — matches how Shopify frames
  // "free shipping". The threshold gate is evaluated before rate matching so a free order never
  // depends on a band existing.
  const freeAbove = conditions.freeAboveAmount == null ? null : num(conditions.freeAboveAmount);
  if (freeAbove != null && subtotal >= freeAbove) {
    return { ...base, baseFee: 0, free: true, fee: handlingFee + codFee, reason: "free-above-threshold" };
  }

  const rate = matchRate(method?.rates ?? [], subtotal, chargeableWeight);
  if (!rate) {
    return { ...base, baseFee: 0, free: false, fee: handlingFee + codFee, reason: "no-matching-rate" };
  }

  const baseFee = Math.max(0, num(rate.charge));
  return {
    ...base,
    baseFee,
    free: baseFee === 0,
    fee: baseFee + handlingFee + codFee,
    reason: belowMinOrder ? "below-min-order" : "ok",
  };
}

/* ────────────────────────────── legacy resolver (unchanged behaviour) ────────────────────────────── */

/**
 * Ported verbatim from the original `calculateDeliveryFee` so existing profiles price identically.
 * Type = price | state | stateprice | weight | stateweight, first-matching band, currency
 * free-threshold (not on weight types), `flatRate` / first-band fallback.
 */
function resolveLegacy(p: DeliveryProfileLike, ctx: DeliveryContext): DeliveryQuote {
  const feeRules = (p.feeRules ?? {}) as Record<string, any>;
  const zones: any[] = Array.isArray(p.zones) ? p.zones : [];
  const type = feeRules.type || "price";
  const subtotal = num(ctx.subtotal);
  const totalWeight = num(ctx.weightGrams);
  const state = (ctx.destinationState ?? "").trim();

  const q = (fee: number, reason: DeliveryReason, free = false): DeliveryQuote => ({
    fee, baseFee: fee, handlingFee: 0, codFee: 0,
    free, belowMinOrder: false, codAvailable: false, reason,
  });

  if (
    type !== "weight" && type !== "stateweight" &&
    feeRules.freeDeliveryThreshold != null && feeRules.freeDeliveryThreshold !== "" &&
    subtotal >= num(feeRules.freeDeliveryThreshold)
  ) {
    return q(0, "free-above-threshold", true);
  }

  if (zones.length === 0) return q(num(feeRules.flatRate), "ok");

  for (const z of zones) {
    if (type === "state" || type === "stateprice" || type === "stateweight") {
      if (z.state && state && String(z.state).trim().toLowerCase() !== state.toLowerCase()) continue;
    }
    if (type === "price" || type === "stateprice") {
      const min = z.minAmount != null && z.minAmount !== "" ? num(z.minAmount) : 0;
      const max = z.maxAmount != null && z.maxAmount !== "" ? num(z.maxAmount) : Infinity;
      if (subtotal >= min && subtotal <= max) return q(num(z.charge), "ok");
    } else if (type === "weight" || type === "stateweight") {
      const min = z.minWeight != null && z.minWeight !== "" ? num(z.minWeight) : 0;
      const max = z.maxWeight != null && z.maxWeight !== "" ? num(z.maxWeight) : Infinity;
      if (totalWeight >= min && totalWeight <= max) return q(num(z.charge), "ok");
    } else if (type === "state") {
      if (z.charge != null) return q(num(z.charge), "ok");
    }
  }

  const firstCharge = zones[0]?.charge;
  return q(firstCharge != null ? num(firstCharge) : num(feeRules.flatRate), "ok");
}

/* ────────────────────────────── public API ────────────────────────────── */

/** Full quote (base + handling + COD + zone/method/eta), version-aware. */
export function resolveDelivery(
  p: DeliveryProfileLike | null | undefined,
  ctx: DeliveryContext
): DeliveryQuote {
  if (!p) return ZERO_QUOTE("no-profile");
  return isV2Profile(p) ? resolveV2(p, ctx) : resolveLegacy(p, ctx);
}

/**
 * Backward-compatible shim for existing call sites:
 *   calculateDeliveryFee(profile, subtotal, totalWeight?, state?) → number
 * New callers should prefer `resolveDelivery` for the full breakdown.
 */
export function calculateDeliveryFee(
  profile: DeliveryProfileLike | null | undefined,
  subtotal: number,
  totalWeight = 0,
  state = ""
): number {
  return resolveDelivery(profile, { subtotal, weightGrams: totalWeight, destinationState: state }).fee;
}

/** Methods available for a destination (for a checkout method picker). */
export function availableMethods(
  p: DeliveryProfileLike | null | undefined,
  ctx: Pick<DeliveryContext, "destinationState" | "destinationPincode">
): DeliveryMethod[] {
  if (!p || !isV2Profile(p)) return [];
  const zone = matchZone((p.zones ?? []) as DeliveryZone[], ctx.destinationState, ctx.destinationPincode);
  return zone?.methods ?? [];
}
