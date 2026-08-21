import React, { useMemo } from 'react';
import { useUnits } from '../../../services/useUnits';

export interface ItemUnitRow {
  unitUid: string;
  conversionQty: number;
  selling: boolean;
  purchase: boolean;
  rx: boolean;
  isDefault: boolean;
  sellingDefault: boolean;
  purchaseDefault: boolean;
  rxDefault: boolean;
  sellingPrice?: number | null;
  mrp?: number | null;
  minSaleQty?: number | null;
  maxSaleQty?: number | null;
  qtyIncrement?: number | null;
}

export interface ItemUnitConfigValue {
  units: ItemUnitRow[];
  productSpecification: number | null;
  productContains: number | null;
  productContainsUnitUid: string;
  allowLooseSale: boolean;
  rxEnabled: boolean;
}

export const emptyUnitConfig = (initial?: any): ItemUnitConfigValue => ({
  units: ((initial?.units as any[]) || []).map((u: any) => ({
    unitUid: u.unitUid || '',
    conversionQty: u.conversionQty ?? 1,
    selling: u.selling ?? true,
    purchase: u.purchase ?? true,
    rx: u.rx ?? false,
    isDefault: u.isDefault ?? false,
    sellingDefault: u.sellingDefault ?? false,
    purchaseDefault: u.purchaseDefault ?? false,
    rxDefault: u.rxDefault ?? false,
    sellingPrice: u.sellingPrice ?? null,
    mrp: u.mrp ?? null,
    minSaleQty: u.minSaleQty ?? null,
    maxSaleQty: u.maxSaleQty ?? null,
    qtyIncrement: u.qtyIncrement ?? null,
  })),
  productSpecification: initial?.productSpecification ?? null,
  productContains: initial?.productContains ?? null,
  productContainsUnitUid: initial?.productContainsUnitUid || '',
  allowLooseSale: initial?.allowLooseSale ?? false,
  rxEnabled: initial?.rxEnabled ?? false,
});

type UnitRole = 'selling' | 'purchase' | 'rx';
const ROLE_DEFAULT_KEY: Record<UnitRole, 'sellingDefault' | 'purchaseDefault' | 'rxDefault'> = {
  selling: 'sellingDefault', purchase: 'purchaseDefault', rx: 'rxDefault',
};

const newRow = (unitUid = ''): ItemUnitRow => ({
  unitUid, conversionQty: 1, selling: true, purchase: true, rx: false,
  isDefault: false, sellingDefault: false, purchaseDefault: false, rxDefault: false,
  sellingPrice: null, mrp: null, minSaleQty: null, maxSaleQty: null, qtyIncrement: null,
});

interface Props {
  baseUnitUid: string;
  value: ItemUnitConfigValue;
  onChange: (v: ItemUnitConfigValue) => void;
  isHealthDomain?: boolean;
}

const inputCls = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all";
const lblCls = "block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1";

/**
 * Selling-unit configuration for an item: base-two-level UOM (product_contains),
 * per-unit roles (selling / purchase / rx) with per-role defaults, per-unit
 * price + MRP, and min/max/increment sale rules. Mirrors the commerce-service
 * ItemUnitDto contract.
 */
export const ItemUnitConfig: React.FC<Props> = ({ baseUnitUid, value, onChange, isHealthDomain = false }) => {
  const { data: unitList = [] } = useUnits();
  const units = value.units;

  const unitName = (uid: string) => {
    const u: any = (unitList as any[]).find((x) => x.uid === uid);
    if (!u) return uid ? `${uid.substring(0, 8)}…` : '—';
    return u.symbol ? `${u.name} (${u.symbol})` : u.name;
  };

  // The unit master has per-warehouse duplicates of the same logical unit (four "Piece"
  // rows, etc.). Collapse to one option per name (preferring the tenant default, code "-D"),
  // but always keep any uid this item already references so a saved selection still renders.
  const unitOptions = React.useMemo(() => {
    const list = unitList as any[];
    const referenced = new Set<string>([baseUnitUid, ...units.map((u) => u.unitUid)].filter(Boolean));
    const isDefault = (u: any) => typeof u?.code === 'string' && /-D$/i.test(u.code);
    const byName = new Map<string, any>();
    for (const u of list) {
      if (!u) continue;
      const key = String(u.name || '').trim().toLowerCase();
      const cur = byName.get(key);
      if (!cur || (isDefault(u) && !isDefault(cur))) byName.set(key, u);
    }
    const chosen = new Map<string, any>([...byName.values()].map((u) => [u.uid, u]));
    // Ensure every already-selected unit stays selectable even if it's a non-default duplicate.
    for (const u of list) if (referenced.has(u.uid) && !chosen.has(u.uid)) chosen.set(u.uid, u);
    return [...chosen.values()];
  }, [unitList, baseUnitUid, units]);

  const set = (patch: Partial<ItemUnitConfigValue>) => onChange({ ...value, ...patch });
  const setUnits = (u: ItemUnitRow[]) => set({ units: u });
  const updateUnit = (i: number, patch: Partial<ItemUnitRow>) => setUnits(units.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const setRoleDefault = (i: number, role: UnitRole) => {
    const key = ROLE_DEFAULT_KEY[role];
    setUnits(units.map((r, idx) => ({ ...r, [key]: idx === i })));
  };
  const addUnit = () => {
    const firstUnused = unitOptions.find((u: any) => u.uid !== baseUnitUid && !units.some((r) => r.unitUid === u.uid));
    setUnits([...units, newRow(firstUnused?.uid || '')]);
  };

  const warnings = useMemo(() => {
    const w: string[] = [];
    if (units.length > 0 && !units.some((u) => u.selling)) w.push('At least one unit must be a selling unit.');
    if (units.some((u) => !u.unitUid)) w.push('Every unit row must pick a unit.');
    if (units.some((u) => !(u.conversionQty > 0))) w.push('Conversion factor must be greater than zero.');
    const baseRow = units.find((u) => u.unitUid && u.unitUid === baseUnitUid);
    if (baseRow && Number(baseRow.conversionQty) !== 1) w.push('The base unit must have a conversion factor of 1.');

    // --- Mirrors of the server-side ItemUnitValidator rules. Without these the save
    //     round-trips and comes back as a 422 the user cannot act on. Keep the two in step. ---
    if (units.some((u) => !u.selling && !u.purchase && !u.rx)) {
      w.push('Each unit must be usable for at least one of Selling, Purchase or Rx.');
    }
    if (units.some((u) => u.rx && !u.selling)) {
      w.push('An Rx unit must also be a Selling unit \u2014 dispensing goes through the selling path.');
    }
    const picked = units.map((u) => u.unitUid).filter(Boolean);
    if (new Set(picked).size !== picked.length) {
      w.push('The same unit is selected on more than one row.');
    }
    if (units.some((u) => u.minSaleQty != null && u.maxSaleQty != null
      && Number(u.minSaleQty) > Number(u.maxSaleQty))) {
      w.push('Minimum sale quantity cannot exceed the maximum.');
    }
    // Measurement-family check (ITM-003). Packaging units (COUNT / OTHER) may convert to any
    // base \u2014 that is the "1 pack = N base units" model \u2014 but a litre is not a quantity of grams.
    const familyOf = (uid?: string) => {
      const opt = (unitOptions as any[]).find((o) => o?.uid === uid);
      const t = typeof opt?.unitType === 'string' ? opt.unitType.toUpperCase() : '';
      return ['WEIGHT', 'VOLUME', 'LENGTH'].includes(t) ? t : null;
    };
    const baseFamily = familyOf(baseUnitUid);
    if (baseFamily && units.some((u) => {
      const f = familyOf(u.unitUid);
      return f && f !== baseFamily;
    })) {
      w.push(`A unit of a different measurement type cannot be mapped to a ${baseFamily.toLowerCase()} base unit.`);
    }
    return w;
  }, [units, baseUnitUid, unitOptions]);

  return (
    <div className="space-y-6">
      {/* Pack details (two-level UOM) */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Pack Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={lblCls}>Pack Qty (spec)</label>
            <input type="number" min={0} step="any" value={value.productSpecification ?? ''}
              onChange={(e) => set({ productSpecification: e.target.value === '' ? null : parseFloat(e.target.value) })}
              className={inputCls} placeholder="e.g. 1" />
          </div>
          <div>
            <label className={lblCls}>Contains</label>
            <input type="number" min={0} step="any" value={value.productContains ?? ''}
              onChange={(e) => set({ productContains: e.target.value === '' ? null : parseFloat(e.target.value) })}
              className={inputCls} placeholder="e.g. 60 (bottle contains 60 ml)" />
          </div>
          <div>
            <label className={lblCls}>Contains Unit</label>
            <select value={value.productContainsUnitUid}
              onChange={(e) => set({ productContainsUnitUid: e.target.value })}
              className={inputCls + ' cursor-pointer'}>
              <option value="">—</option>
              {unitOptions.map((u: any) => <option key={u.uid} value={u.uid}>{u.symbol ? `${u.name} (${u.symbol})` : u.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-6 mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={value.allowLooseSale} onChange={(e) => set({ allowLooseSale: e.target.checked })}
              className="h-4 w-4 accent-[#55349A] cursor-pointer" />
            <span className="text-xs font-bold text-slate-600 uppercase">Allow loose sale</span>
          </label>
          {/* ITM-007: Rx Enabled is a pharmacy/health concept — only offer it in the health domain. */}
          {isHealthDomain && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={value.rxEnabled} onChange={(e) => set({ rxEnabled: e.target.checked })}
              className="h-4 w-4 accent-[#55349A] cursor-pointer" />
            <span className="text-xs font-bold text-slate-600 uppercase">Rx enabled</span>
          </label>
          )}
        </div>
      </div>

      {/* Units */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selling / Purchase Units</h3>
          <button type="button" onClick={addUnit}
            className="text-xs font-bold text-[#55349A] hover:bg-[#55349A]/10 px-3 py-1.5 rounded-lg transition-colors border-0 bg-transparent cursor-pointer">
            + Add Unit
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mb-3">Define the units and how they convert. Prices are set per catalog on the next step.</p>

        {warnings.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
            <ul className="list-disc list-inside space-y-0.5">
              {warnings.map((w, i) => <li key={i} className="text-xs text-amber-700">{w}</li>)}
            </ul>
          </div>
        )}

        {units.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            <p className="text-sm font-bold text-slate-500">No units configured</p>
            <p className="text-xs text-slate-400 mt-1">Item will only be sold in the base unit.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {units.map((unit, index) => {
              const isBase = !!baseUnitUid && unit.unitUid === baseUnitUid;
              return (
                <div key={index} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4">
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <label className={lblCls}>Unit</label>
                      <select value={unit.unitUid} onChange={(e) => updateUnit(index, { unitUid: e.target.value })} className={inputCls + ' cursor-pointer'}>
                        <option value="">Select unit</option>
                        {unitOptions.map((u: any) => <option key={u.uid} value={u.uid}>{u.symbol ? `${u.name} (${u.symbol})` : u.name}</option>)}
                      </select>
                    </div>
                    <div className="w-36">
                      <label className={lblCls}>Base units per 1</label>
                      <input type="number" min={0} step="any" value={isBase ? 1 : (unit.conversionQty ?? '')} disabled={isBase}
                        onChange={(e) => updateUnit(index, { conversionQty: parseFloat(e.target.value) })}
                        className={inputCls + ' text-right disabled:opacity-60'} />
                    </div>
                    <button type="button" onClick={() => setUnits(units.filter((_, i) => i !== index))}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg border-0 bg-transparent cursor-pointer">✕</button>
                  </div>

                  <div className="flex items-center gap-6 flex-wrap">
                    {([['selling', 'Selling'], ['purchase', 'Purchase'], ...(isHealthDomain ? [['rx', 'Rx'] as const] : [])] as const).map(([key, label]) => {
                      const defKey = ROLE_DEFAULT_KEY[key];
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={!!unit[key]} onChange={(e) => updateUnit(index, { [key]: e.target.checked } as Partial<ItemUnitRow>)}
                              className="h-4 w-4 accent-[#55349A] cursor-pointer" />
                            <span className="text-xs font-bold text-slate-600 uppercase">{label}</span>
                          </label>
                          {unit[key] && (
                            <button type="button" onClick={() => setRoleDefault(index, key)} title={`Default ${label} unit`}
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border cursor-pointer ${unit[defKey] ? 'bg-[#55349A] text-white border-[#55349A]' : 'bg-transparent text-slate-400 border-slate-200 hover:border-[#55349A]'}`}>
                              ★ default
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {isBase && <span className="text-[10px] font-bold text-[#55349A] uppercase tracking-wider">Base unit</span>}
                  </div>
                  {/*
                    Price / MRP / min / max / increment used to live here per selling unit, but
                    pricing is per order-catalog (the same item sells at different prices in
                    different catalogs). It now lives on the catalog assignment step instead —
                    this section only defines the units, conversions and roles.
                  */}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
