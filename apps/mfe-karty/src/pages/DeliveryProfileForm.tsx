/**
 * Create / edit a delivery profile — Phase 1 + Phase 2 (LOG-004).
 *
 * ## What changed vs the old form
 * The old form authored a single-`type` band table (price / state / weight / …). That is now the
 * *legacy* shape. New profiles are authored in the v2 model from the LOG-004 benchmark:
 *
 *   Profile (name, store, product class, handling fee, free-above / min-order conditions,
 *            optional volumetric divisor)
 *     → Zones (match by All-India / States / Pincode ranges, + COD allowed & fee)
 *       → Methods (Standard / Express / Pickup / Local, + ETA)
 *         → Rates (flat | order-value band | weight slab), first match wins
 *
 * The wire shape is unchanged jsonb — `zones` is `DeliveryZone[]` and `feeRules` is `FeeRulesV2`
 * with `schemaVersion: 2`. No migration; `resolveDelivery` in `deliveryModel.ts` prices both v2
 * and legacy identically.
 *
 * ## Legacy profiles
 * An existing legacy profile is not silently rewritten. It loads with an "old format" banner and
 * an **Upgrade to zones** action that seeds one All-India zone + a Standard method carrying the
 * old bands, for the user to review and save as v2. Guessing the mapping and auto-saving it would
 * change live delivery pricing, so the upgrade is explicit — same principle the old flat-rate
 * notice used.
 */
import { useMemo, useState } from "react";
import { Button, Input, Select } from "@jaldee/design-system";
import { useSaveDeliveryProfile, type DeliveryProfile } from "../services/useDelivery";
import { useStores } from "../services/useStores";
import {
  isV2Profile,
  type DeliveryZone,
  type DeliveryMethod,
  type DeliveryRate,
  type FeeRulesV2,
  type RateBasis,
  type DeliveryMethodKind,
} from "../services/deliveryModel";

const STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
];

const PRODUCT_CLASSES = [
  { value: "standard", label: "Standard (default)" },
  { value: "heavy", label: "Heavy / bulky" },
  { value: "fragile", label: "Fragile" },
  { value: "cold", label: "Cold chain" },
];

const METHOD_KINDS: { value: DeliveryMethodKind; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "express", label: "Express" },
  { value: "sameday", label: "Same day" },
  { value: "pickup", label: "Store pickup" },
  { value: "local", label: "Local delivery" },
];

const RATE_BASES: { value: RateBasis; label: string }[] = [
  { value: "flat", label: "Flat" },
  { value: "value", label: "Order value band" },
  { value: "weight", label: "Weight slab (g)" },
];

let seq = 0;
const rid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

type MatchMode = "allIndia" | "states" | "pincode";

const newRate = (): DeliveryRate => ({ basis: "flat", charge: 0 });
const newMethod = (): DeliveryMethod => ({
  id: rid("m"), label: "Standard", kind: "standard", etaLabel: "", rates: [newRate()],
});
const newZone = (mode: MatchMode = "allIndia"): DeliveryZone => ({
  id: rid("z"),
  name: mode === "allIndia" ? "Rest of India" : "New zone",
  match: mode === "allIndia" ? { allIndia: true } : mode === "states" ? { states: [] } : { pincodeRanges: [{ from: "", to: "" }] },
  cod: { allowed: false, fee: { kind: "flat", value: 0 } },
  etaLabel: "",
  methods: [newMethod()],
});

const matchModeOf = (z: DeliveryZone): MatchMode =>
  z.match?.allIndia ? "allIndia" : z.match?.pincodeRanges ? "pincode" : "states";

/** Seed a v2 draft from a legacy profile's bands (one All-India zone, one Standard method). */
function upgradeLegacy(existing: DeliveryProfile): { zones: DeliveryZone[]; fee: FeeRulesV2 } {
  const type = (existing.feeRules as any)?.type ?? "price";
  const bands = Array.isArray(existing.zones) ? existing.zones : [];
  const rates: DeliveryRate[] = bands.length
    ? bands.map((b: any) => {
        if (type.includes("weight")) {
          return { basis: "weight", minWeight: b.minWeight ?? 0, maxWeight: b.maxWeight ?? null, charge: Number(b.charge) || 0 };
        }
        if (type === "price" || type === "stateprice") {
          return { basis: "value", minAmount: b.minAmount ?? 0, maxAmount: b.maxAmount ?? null, charge: Number(b.charge) || 0 };
        }
        return { basis: "flat", charge: Number(b.charge) || 0 };
      })
    : [{ basis: "flat", charge: Number((existing.feeRules as any)?.flatRate) || 0 }];

  const zone = newZone("allIndia");
  zone.methods = [{ id: rid("m"), label: "Standard", kind: "standard", etaLabel: "", rates }];
  const fee: FeeRulesV2 = { schemaVersion: 2 };
  const threshold = (existing.feeRules as any)?.freeDeliveryThreshold;
  if (threshold != null && threshold !== "") fee.conditions = { freeAboveAmount: Number(threshold) };
  return { zones: [zone], fee };
}

export function DeliveryProfileForm({
  existing,
  onDone,
  onCancel,
}: {
  existing?: DeliveryProfile;
  onDone: () => void;
  onCancel: () => void;
}) {
  const save = useSaveDeliveryProfile();
  const storesQ = useStores();

  const existingIsLegacy = existing != null && !isV2Profile(existing as any);
  const [legacyPending, setLegacyPending] = useState(existingIsLegacy);

  const [name, setName] = useState(existing?.name ?? "");
  const [storeUid, setStoreUid] = useState(existing?.storeUid ?? "");
  const [active, setActive] = useState(existing?.active ?? true);

  const existingFee = (existing?.feeRules ?? {}) as Partial<FeeRulesV2> & Record<string, any>;
  const [productClass, setProductClass] = useState<string>(existingFee.productClass ?? "standard");
  const [handlingFee, setHandlingFee] = useState<string>(existingFee.handlingFee != null ? String(existingFee.handlingFee) : "");
  const [freeAbove, setFreeAbove] = useState<string>(existingFee.conditions?.freeAboveAmount != null ? String(existingFee.conditions.freeAboveAmount) : "");
  const [minOrder, setMinOrder] = useState<string>(existingFee.conditions?.minOrderAmount != null ? String(existingFee.conditions.minOrderAmount) : "");
  const [volumetricOn, setVolumetricOn] = useState<boolean>(existingFee.volumetric != null);
  const [volumetricDivisor, setVolumetricDivisor] = useState<string>(existingFee.volumetric?.divisor != null ? String(existingFee.volumetric.divisor) : "5000");

  const [zones, setZones] = useState<DeliveryZone[]>(() => {
    if (existing && isV2Profile(existing as any) && Array.isArray(existing.zones)) {
      return existing.zones as unknown as DeliveryZone[];
    }
    return [newZone("allIndia")];
  });

  const [error, setError] = useState<string | null>(null);

  const storeOptions = useMemo(
    () => [
      { value: "", label: "All stores" },
      ...((storesQ.data ?? []) as any[]).map((s) => ({ value: String(s.id ?? s.uid), label: s.name })),
    ],
    [storesQ.data]
  );

  /* -------- zone mutation helpers -------- */
  const patchZone = (zi: number, patch: Partial<DeliveryZone>) =>
    setZones((zs) => zs.map((z, i) => (i === zi ? { ...z, ...patch } : z)));
  const patchMethod = (zi: number, mi: number, patch: Partial<DeliveryMethod>) =>
    setZones((zs) => zs.map((z, i) => (i !== zi ? z : { ...z, methods: z.methods.map((m, j) => (j === mi ? { ...m, ...patch } : m)) })));
  const patchRate = (zi: number, mi: number, ri: number, patch: Partial<DeliveryRate>) =>
    patchMethod(zi, mi, { rates: zones[zi].methods[mi].rates.map((r, k) => (k === ri ? { ...r, ...patch } : r)) });

  function setMatchMode(zi: number, mode: MatchMode) {
    const z = zones[zi];
    const match =
      mode === "allIndia" ? { allIndia: true } :
      mode === "states" ? { states: (z.match?.states ?? []) } :
      { pincodeRanges: (z.match?.pincodeRanges ?? [{ from: "", to: "" }]) };
    patchZone(zi, { match });
  }

  /* -------- serialize + validate -------- */
  function submit() {
    setError(null);
    if (!name.trim()) return setError("Name is required.");
    if (!zones.length) return setError("Add at least one delivery zone.");

    for (let zi = 0; zi < zones.length; zi++) {
      const z = zones[zi];
      if (!z.name.trim()) return setError(`Zone ${zi + 1}: name is required.`);
      const mode = matchModeOf(z);
      if (mode === "states" && !(z.match.states ?? []).length) return setError(`Zone "${z.name}": select at least one state.`);
      if (mode === "pincode") {
        const ranges = z.match.pincodeRanges ?? [];
        if (!ranges.length || ranges.some((r) => !String(r.from).trim() || !String(r.to).trim()))
          return setError(`Zone "${z.name}": every pincode range needs a from and a to.`);
      }
      if (!z.methods.length) return setError(`Zone "${z.name}": add at least one delivery method.`);
      for (const m of z.methods) {
        if (!m.label.trim()) return setError(`Zone "${z.name}": every method needs a name.`);
        if (!m.rates.length) return setError(`Zone "${z.name}" · ${m.label}: add at least one rate.`);
        for (const r of m.rates) {
          if (!Number.isFinite(Number(r.charge)) || Number(r.charge) < 0)
            return setError(`Zone "${z.name}" · ${m.label}: charge must be 0 or more.`);
        }
      }
      if (z.cod?.allowed && z.cod.fee && (!Number.isFinite(Number(z.cod.fee.value)) || Number(z.cod.fee.value) < 0))
        return setError(`Zone "${z.name}": COD fee must be 0 or more.`);
    }

    // Normalize numbers on the wire; drop empty optionals.
    const cleanZones: DeliveryZone[] = zones.map((z) => ({
      ...z,
      cod: z.cod?.allowed
        ? { allowed: true, fee: z.cod.fee ? { kind: z.cod.fee.kind, value: Number(z.cod.fee.value) || 0 } : null }
        : { allowed: false },
      methods: z.methods.map((m) => ({
        ...m,
        etaLabel: m.etaLabel?.trim() || undefined,
        rates: m.rates.map((r) => {
          const base: DeliveryRate = { basis: r.basis, charge: Number(r.charge) || 0 };
          if (r.basis === "value") {
            base.minAmount = r.minAmount == null || r.minAmount === ("" as any) ? 0 : Number(r.minAmount);
            base.maxAmount = r.maxAmount == null || r.maxAmount === ("" as any) ? null : Number(r.maxAmount);
          } else if (r.basis === "weight") {
            base.minWeight = r.minWeight == null || r.minWeight === ("" as any) ? 0 : Number(r.minWeight);
            base.maxWeight = r.maxWeight == null || r.maxWeight === ("" as any) ? null : Number(r.maxWeight);
          }
          return base;
        }),
      })),
    }));

    const feeRules: FeeRulesV2 = { schemaVersion: 2 };
    if (productClass && productClass !== "standard") feeRules.productClass = productClass;
    if (handlingFee.trim()) feeRules.handlingFee = Number(handlingFee) || 0;
    const conditions: FeeRulesV2["conditions"] = {};
    if (freeAbove.trim()) conditions!.freeAboveAmount = Number(freeAbove) || 0;
    if (minOrder.trim()) conditions!.minOrderAmount = Number(minOrder) || 0;
    if (Object.keys(conditions!).length) feeRules.conditions = conditions;
    if (volumetricOn) feeRules.volumetric = { divisor: Number(volumetricDivisor) || 5000 };

    save.mutate(
      { uid: existing?.uid, payload: { name: name.trim(), storeUid: storeUid || undefined, zones: cleanZones as any, feeRules: feeRules as any, active } },
      { onSuccess: onDone, onError: (e) => setError(e instanceof Error ? e.message : "Couldn't save the profile.") }
    );
  }

  /* -------- legacy gate -------- */
  if (legacyPending && existing) {
    const summary = `${(existing.zones?.length ?? 0)} band(s), type "${(existing.feeRules as any)?.type ?? "flat"}"`;
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 max-w-2xl">
        <div className="mb-2 text-[17px] font-semibold text-slate-900">This profile uses the old format</div>
        <p className="text-[13px] leading-relaxed text-slate-600">
          "{existing.name}" was saved in the legacy single-type format ({summary}). It still prices
          orders correctly. Upgrading maps its bands into one <strong>All-India zone</strong> with a
          <strong> Standard</strong> method so you can add pincode zones, express methods and COD.
          Nothing is changed until you review and save.
        </p>
        <div className="mt-5 flex gap-2.5">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={() => {
              const up = upgradeLegacy(existing);
              setZones(up.zones);
              setProductClass(up.fee.productClass ?? "standard");
              setFreeAbove(up.fee.conditions?.freeAboveAmount != null ? String(up.fee.conditions.freeAboveAmount) : "");
              setLegacyPending(false);
            }}
          >
            Upgrade to zones
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 max-w-4xl">
      <div className="mb-5 text-[17px] font-semibold text-slate-900">
        {existing ? "Edit delivery profile" : "Create delivery profile"}
      </div>

      {/* Basics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label={<>Name <span className="text-rose-600">*</span></>} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. South India rates" />
        <Select label="Store" value={storeUid} onChange={(e) => setStoreUid(e.target.value)} options={storeOptions} />
        <Select label="Applies to product group" value={productClass} onChange={(e) => setProductClass(e.target.value)} options={PRODUCT_CLASSES} />
      </div>

      {/* Order-level conditions */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Input label="Free delivery above (₹)" type="number" value={freeAbove} onChange={(e) => setFreeAbove(e.target.value)} placeholder="blank = off" />
        <Input label="Minimum order (₹)" type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="blank = none" />
        <Input label="Handling fee (₹)" type="number" value={handlingFee} onChange={(e) => setHandlingFee(e.target.value)} placeholder="0" />
        <div>
          <label className="ds-form-label mb-1 block">Volumetric weight</label>
          <div className="flex items-center gap-2 h-[38px]">
            <input type="checkbox" checked={volumetricOn} onChange={(e) => setVolumetricOn(e.target.checked)} className="h-4 w-4 accent-[#5B21D1]" />
            <span className="text-[13px] text-slate-600">÷</span>
            <Input type="number" value={volumetricDivisor} disabled={!volumetricOn} onChange={(e) => setVolumetricDivisor(e.target.value)} containerClassName="w-24" />
          </div>
        </div>
      </div>

      {/* Zones */}
      <div className="mt-6 mb-2 flex items-center justify-between">
        <div className="text-[13px] font-semibold text-slate-700">Delivery zones</div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setZones((zs) => [...zs, newZone("states")])}>+ State zone</Button>
          <Button size="sm" variant="secondary" onClick={() => setZones((zs) => [...zs, newZone("pincode")])}>+ Pincode zone</Button>
          <Button size="sm" variant="secondary" onClick={() => setZones((zs) => [...zs, newZone("allIndia")])}>+ All-India</Button>
        </div>
      </div>

      <div className="space-y-4">
        {zones.map((z, zi) => {
          const mode = matchModeOf(z);
          return (
            <div key={z.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                  <Input label="Zone name" value={z.name} onChange={(e) => patchZone(zi, { name: e.target.value })} />
                  <Select
                    label="Applies to"
                    value={mode}
                    onChange={(e) => setMatchMode(zi, e.target.value as MatchMode)}
                    options={[{ value: "allIndia", label: "All India (fallback)" }, { value: "states", label: "Specific states" }, { value: "pincode", label: "Pincode ranges" }]}
                  />
                  <Input label="Zone ETA (optional)" value={z.etaLabel ?? ""} onChange={(e) => patchZone(zi, { etaLabel: e.target.value })} placeholder="e.g. 3–5 days" />
                </div>
                <button type="button" aria-label="Remove zone" disabled={zones.length === 1} onClick={() => setZones((zs) => zs.filter((_, i) => i !== zi))} className="mt-6 px-2 text-rose-600 disabled:text-slate-300">✕</button>
              </div>

              {/* match editor */}
              {mode === "states" && (
                <div className="mt-3">
                  <label className="ds-form-label mb-1 block">States in this zone</label>
                  <div className="flex flex-wrap gap-1.5">
                    {STATES.map((s) => {
                      const on = (z.match.states ?? []).includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => patchZone(zi, { match: { states: on ? (z.match.states ?? []).filter((x) => x !== s) : [...(z.match.states ?? []), s] } })}
                          className={"rounded-full border px-2.5 py-1 text-[12px] " + (on ? "border-[#5B21D1] bg-[#EDE9FE] text-[#4C1DB3]" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {mode === "pincode" && (
                <div className="mt-3">
                  <label className="ds-form-label mb-1 block">Pincode ranges</label>
                  {(z.match.pincodeRanges ?? []).map((r, ri) => (
                    <div key={ri} className="mb-2 flex items-center gap-2">
                      <Input value={r.from} onChange={(e) => patchZone(zi, { match: { pincodeRanges: (z.match.pincodeRanges ?? []).map((x, k) => (k === ri ? { ...x, from: e.target.value } : x)) } })} placeholder="From e.g. 682001" containerClassName="w-40" />
                      <span className="text-slate-400">–</span>
                      <Input value={r.to} onChange={(e) => patchZone(zi, { match: { pincodeRanges: (z.match.pincodeRanges ?? []).map((x, k) => (k === ri ? { ...x, to: e.target.value } : x)) } })} placeholder="To e.g. 682999" containerClassName="w-40" />
                      <button type="button" onClick={() => patchZone(zi, { match: { pincodeRanges: (z.match.pincodeRanges ?? []).filter((_, k) => k !== ri) } })} className="px-2 text-rose-600">✕</button>
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => patchZone(zi, { match: { pincodeRanges: [...(z.match.pincodeRanges ?? []), { from: "", to: "" }] } })}>+ Add range</Button>
                </div>
              )}

              {/* COD */}
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-white px-3 py-2.5 border border-slate-200">
                <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700">
                  <input type="checkbox" checked={!!z.cod?.allowed} onChange={(e) => patchZone(zi, { cod: { ...(z.cod ?? {}), allowed: e.target.checked, fee: z.cod?.fee ?? { kind: "flat", value: 0 } } })} className="h-4 w-4 accent-[#5B21D1]" />
                  COD available
                </label>
                {z.cod?.allowed && (
                  <>
                    <Select value={z.cod.fee?.kind ?? "flat"} onChange={(e) => patchZone(zi, { cod: { allowed: true, fee: { kind: e.target.value as "flat" | "percent", value: z.cod?.fee?.value ?? 0 } } })} options={[{ value: "flat", label: "Flat ₹" }, { value: "percent", label: "% of order" }]} containerClassName="w-36" fullWidth={false} />
                    <Input type="number" value={String(z.cod.fee?.value ?? 0)} onChange={(e) => patchZone(zi, { cod: { allowed: true, fee: { kind: z.cod?.fee?.kind ?? "flat", value: Number(e.target.value) || 0 } } })} containerClassName="w-28" />
                    <span className="text-[12px] text-slate-500">COD fee</span>
                  </>
                )}
              </div>

              {/* Methods */}
              <div className="mt-3 space-y-3">
                {z.methods.map((m, mi) => (
                  <div key={m.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-3">
                        <Input label="Method name" value={m.label} onChange={(e) => patchMethod(zi, mi, { label: e.target.value })} />
                        <Select label="Type" value={m.kind ?? "standard"} onChange={(e) => patchMethod(zi, mi, { kind: e.target.value as DeliveryMethodKind })} options={METHOD_KINDS} />
                        <Input label="ETA" value={m.etaLabel ?? ""} onChange={(e) => patchMethod(zi, mi, { etaLabel: e.target.value })} placeholder="e.g. 1–2 days" />
                      </div>
                      <button type="button" aria-label="Remove method" disabled={z.methods.length === 1} onClick={() => patchZone(zi, { methods: z.methods.filter((_, j) => j !== mi) })} className="mt-6 px-2 text-rose-600 disabled:text-slate-300">✕</button>
                    </div>

                    {/* Rates */}
                    <div className="mt-2.5">
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Rates (first match wins)</div>
                      {m.rates.map((r, ri) => (
                        <div key={ri} className="mb-1.5 flex flex-wrap items-center gap-2">
                          <Select value={r.basis} onChange={(e) => patchRate(zi, mi, ri, { basis: e.target.value as RateBasis })} options={RATE_BASES} containerClassName="w-40" fullWidth={false} />
                          {r.basis === "value" && (
                            <>
                              <Input type="number" placeholder="Min ₹" value={r.minAmount == null ? "" : String(r.minAmount)} onChange={(e) => patchRate(zi, mi, ri, { minAmount: e.target.value === "" ? 0 : Number(e.target.value) })} containerClassName="w-28" />
                              <Input type="number" placeholder="Max ₹ (∞)" value={r.maxAmount == null ? "" : String(r.maxAmount)} onChange={(e) => patchRate(zi, mi, ri, { maxAmount: e.target.value === "" ? null : Number(e.target.value) })} containerClassName="w-28" />
                            </>
                          )}
                          {r.basis === "weight" && (
                            <>
                              <Input type="number" placeholder="Min g" value={r.minWeight == null ? "" : String(r.minWeight)} onChange={(e) => patchRate(zi, mi, ri, { minWeight: e.target.value === "" ? 0 : Number(e.target.value) })} containerClassName="w-28" />
                              <Input type="number" placeholder="Max g (∞)" value={r.maxWeight == null ? "" : String(r.maxWeight)} onChange={(e) => patchRate(zi, mi, ri, { maxWeight: e.target.value === "" ? null : Number(e.target.value) })} containerClassName="w-28" />
                            </>
                          )}
                          <Input type="number" placeholder="Charge ₹" value={String(r.charge)} onChange={(e) => patchRate(zi, mi, ri, { charge: Number(e.target.value) || 0 })} containerClassName="w-28" />
                          <button type="button" disabled={m.rates.length === 1} onClick={() => patchMethod(zi, mi, { rates: m.rates.filter((_, k) => k !== ri) })} className="px-2 text-rose-600 disabled:text-slate-300">✕</button>
                        </div>
                      ))}
                      <Button size="sm" variant="ghost" onClick={() => patchMethod(zi, mi, { rates: [...m.rates, newRate()] })}>+ Add rate</Button>
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="secondary" onClick={() => patchZone(zi, { methods: [...z.methods, newMethod()] })}>+ Add method</Button>
              </div>
            </div>
          );
        })}
      </div>

      <label className="mt-5 flex items-center gap-2 text-[13px] text-slate-700">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[#5B21D1]" />
        Active
      </label>

      {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700">{error}</div>}

      <div className="mt-6 flex gap-2.5">
        <Button variant="secondary" onClick={onCancel} disabled={save.isPending}>Cancel</Button>
        <Button onClick={submit} disabled={save.isPending}>{save.isPending ? "Saving…" : existing ? "Save changes" : "Create"}</Button>
      </div>
    </div>
  );
}
