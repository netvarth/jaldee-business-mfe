import React, { useMemo, useState } from 'react';
import { useItems } from '../../../services/useItems';
import { useUnits } from '../../../services/useUnits';
import {
  useInventoryCatalogItem,
  useUpdateInventoryCatalogItem,
} from '../../../services/useInventoryCatalogs';

interface Props {
  catalogItem: any; // raw catalog item (id/uid, catalogUid, itemUid, units)
  onClose: () => void;
  onSaved?: () => void;
}

interface UnitPriceRow {
  unitUid: string;
  sellingPrice: number | null;
  mrp: number | null;
  minSaleQty: number | null;
  maxSaleQty: number | null;
  qtyIncrement: number | null;
}

/**
 * Per-store, per-unit price editor for a catalog item. Reads the item's selling
 * units, prefills existing catalog prices, and PUTs the units[] child back —
 * round-tripping the full item (batches omitted) so stock/batches stay intact.
 */
export const CatalogItemUnitPriceEditor: React.FC<Props> = ({ catalogItem, onClose, onSaved }) => {
  const uid = catalogItem?.id || catalogItem?.uid;
  const { data: fullItem } = useInventoryCatalogItem(uid);
  const { data: globalItems = [] } = useItems();
  const { data: unitList = [] } = useUnits();
  const updateMutation = useUpdateInventoryCatalogItem();

  const unitName = (unitUid: string) => {
    const u: any = (unitList as any[]).find((x) => x.uid === unitUid);
    if (!u) return unitUid ? `${unitUid.substring(0, 8)}…` : '—';
    return u.symbol ? `${u.name} (${u.symbol})` : u.name;
  };

  const sellingUnits: any[] = useMemo(() => {
    const item: any = (globalItems as any[]).find((i) => i.uid === catalogItem?.itemUid);
    return ((item?.units as any[]) || []).filter((u) => u.selling);
  }, [globalItems, catalogItem?.itemUid]);

  const [rows, setRows] = useState<Record<string, UnitPriceRow>>({});
  const seeded = React.useRef(false);
  React.useEffect(() => {
    if (seeded.current || sellingUnits.length === 0) return;
    const existing: any[] = (fullItem?.units as any[]) || catalogItem?.units || [];
    const next: Record<string, UnitPriceRow> = {};
    sellingUnits.forEach((su) => {
      const cur = existing.find((e: any) => e.unitUid === su.unitUid);
      next[su.unitUid] = {
        unitUid: su.unitUid,
        sellingPrice: cur?.sellingPrice ?? su.sellingPrice ?? null,
        mrp: cur?.mrp ?? su.mrp ?? null,
        minSaleQty: cur?.minSaleQty ?? null,
        maxSaleQty: cur?.maxSaleQty ?? null,
        qtyIncrement: cur?.qtyIncrement ?? null,
      };
    });
    setRows(next);
    seeded.current = true;
  }, [fullItem, sellingUnits, catalogItem]);

  const setField = (unitUid: string, field: keyof UnitPriceRow, value: string) => {
    setRows((r) => ({ ...r, [unitUid]: { ...r[unitUid], [field]: value === '' ? null : parseFloat(value) } }));
  };

  const handleSave = () => {
    const units = Object.values(rows).map((r) => ({
      unitUid: r.unitUid, sellingPrice: r.sellingPrice, mrp: r.mrp,
      minSaleQty: r.minSaleQty, maxSaleQty: r.maxSaleQty, qtyIncrement: r.qtyIncrement, active: true,
    }));
    const data = { ...(fullItem || {}), batches: undefined, units };
    updateMutation.mutate({ uid, catalogUid: catalogItem?.catalogUid, data } as any, {
      onSuccess: () => { onSaved?.(); onClose(); },
    });
  };

  const itemName = (globalItems as any[]).find((i) => i.uid === catalogItem?.itemUid)?.name || 'Item';
  const inputCls = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-right outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Unit-wise Price</h2>
            <p className="text-xs text-slate-500 mt-0.5">{itemName} — this catalog only</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg border-0 bg-transparent cursor-pointer text-slate-500">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {sellingUnits.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">This item has no selling units configured. Add them on the item first.</p>
          ) : (
            sellingUnits.map((su) => {
              const row = rows[su.unitUid];
              if (!row) return null;
              return (
                <div key={su.unitUid} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">{unitName(su.unitUid)}</div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {([['sellingPrice', 'Price'], ['mrp', 'MRP'], ['minSaleQty', 'Min'], ['maxSaleQty', 'Max'], ['qtyIncrement', 'Increment']] as const).map(([field, label]) => (
                      <div key={field}>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
                        <input type="number" min={0} step="any" value={(row[field] as number | null) ?? ''}
                          onChange={(e) => setField(su.unitUid, field, e.target.value)} className={inputCls} placeholder="—" />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 bg-transparent border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 cursor-pointer">Cancel</button>
          <button onClick={handleSave} disabled={updateMutation.isPending || sellingUnits.length === 0}
            className="px-6 py-2.5 bg-[#55349A] text-white rounded-xl text-sm font-bold hover:bg-opacity-90 cursor-pointer border-0 disabled:opacity-50">
            {updateMutation.isPending ? 'Saving…' : 'Save Prices'}
          </button>
        </div>
      </div>
    </div>
  );
};
