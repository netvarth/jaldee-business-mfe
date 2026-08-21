import { useMemo, useState } from 'react';
import { ArrowLeft, Plus, Search, Trash2, X, ShoppingBasket, Check, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStores } from '../../../services/useStores';
import { useVendors } from '../../../services/useVendors';
import { useInventoryCatalogs } from '../../../services/useInventoryCatalogs';
import { useItems } from '../../../services/useItems';
import { useUnits } from '../../../services/useUnits';
import { useCreatePurchaseOrder } from '../../../services/usePurchaseOrders';

/**
 * Create Purchase Order — the document sent to a dealer.
 * Flow: select dealer → store → inventory catalog → add ordered items (purchase unit, qty, rate).
 * "Create & Send" issues the PO (SENT); goods are received later via Purchase Entry against it.
 */
interface Props {
  onBack: () => void;
  onCreated?: (po: any) => void;
  /** Optional pre-fill, e.g. when raising a PO from Reorder Alerts. */
  seed?: {
    vendorUid?: string;
    storeUid?: string;
    lines?: Array<{ itemUid: string; name: string; sku?: string; orderedQty: string | number; variantUid?: string | null }>;
  };
}

interface OrderLine {
  itemUid: string; name: string; sku: string; variantUid: string | null;
  unitUid: string; orderedQty: string; unitPrice: string; mrp: string;
}

const PURPLE = '#55349A';

export const CreatePurchaseOrder = ({ onBack, onCreated, seed }: Props) => {
  const { data: vendors = [] } = useVendors();
  const { data: stores = [] } = useStores();
  const { data: catalogs = [] } = useInventoryCatalogs();
  const { data: items = [] } = useItems();
  const { data: units = [] } = useUnits();
  const createPo = useCreatePurchaseOrder();

  const [vendorUid, setVendorUid] = useState(seed?.vendorUid || '');
  const [storeUid, setStoreUid] = useState(seed?.storeUid || '');
  const [catalogUid, setCatalogUid] = useState('');
  const [poDate, setPoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState('');
  const [refNo, setRefNo] = useState('');
  const [note, setNote] = useState('');

  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<any | null>(null);
  const [row, setRow] = useState({ unitUid: '', orderedQty: '', unitPrice: '', mrp: '' });
  const [lines, setLines] = useState<OrderLine[]>(
    (seed?.lines || []).map((l) => ({
      itemUid: l.itemUid, name: l.name, sku: l.sku || '', variantUid: l.variantUid ?? null,
      unitUid: '', orderedQty: String(l.orderedQty ?? ''), unitPrice: '', mrp: '',
    }))
  );
  const [error, setError] = useState('');

  const unitName = (uid: string) => {
    const u: any = (units as any[]).find((x) => (x.uid || x.unitUid) === uid);
    return u ? (u.symbol ? `${u.name} (${u.symbol})` : u.name) : 'Base unit';
  };

  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return (items as any[])
      .filter((i) => (i.name || '').toLowerCase().includes(q) || (i.sku || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, items]);

  // Store-wise inventory catalog filtering
  const storeCatalogs = useMemo(() => {
    const all = (catalogs as any[]) || [];
    if (!storeUid) return all;
    const filtered = all.filter((c: any) => (c.storeUid || c.storeId) === storeUid);
    return filtered.length > 0 ? filtered : all;
  }, [catalogs, storeUid]);

  const purchaseUnits = (picked?.units || []).filter((u: any) => u.purchase);

  const lineAmount = (l: OrderLine) => (parseFloat(l.orderedQty) || 0) * (parseFloat(l.unitPrice) || 0);
  const subTotal = lines.reduce((s, l) => s + lineAmount(l), 0);
  const totalQty = lines.reduce((s, l) => s + (parseFloat(l.orderedQty) || 0), 0);

  const pickItem = (item: any) => {
    setPicked(item);
    setSearch(item.name);
    setRow({ unitUid: '', orderedQty: '', unitPrice: String(item.price || item.mrp || ''), mrp: String(item.mrp || '') });
  };

  const addLine = () => {
    if (!picked || !(parseFloat(row.orderedQty) > 0)) { setError('Pick an item and enter an ordered quantity.'); return; }
    setLines([...lines, {
      itemUid: picked.uid, name: picked.name, sku: picked.sku || '', variantUid: null,
      unitUid: row.unitUid, orderedQty: row.orderedQty, unitPrice: row.unitPrice, mrp: row.mrp,
    }]);
    setPicked(null); setSearch(''); setRow({ unitUid: '', orderedQty: '', unitPrice: '', mrp: '' }); setError('');
  };

  const submit = async (status: 'DRAFT' | 'SENT') => {
    setError('');
    if (!vendorUid) return setError('Select a dealer.');
    if (!storeUid) return setError('Select a destination store.');
    if (!catalogUid) return setError('Select an inventory catalog.');
    if (lines.length === 0) return setError('Add at least one item.');
    const payload = {
      vendorUid, toStoreUid: storeUid, catalogUid,
      poDate: new Date(poDate).toISOString(),
      expectedDate: expectedDate || null,
      refNo: refNo || null, note: note || null, status,
      items: lines.map((l) => ({
        itemUid: l.itemUid, variantUid: l.variantUid, unitUid: l.unitUid || null,
        orderedQty: parseFloat(l.orderedQty) || 0,
        unitPrice: parseFloat(l.unitPrice) || 0,
        mrp: l.mrp ? parseFloat(l.mrp) : null,
      })),
    };
    try {
      const po = await createPo.mutateAsync(payload);
      onCreated?.(po);
      onBack();
    } catch (e: any) {
      setError(e?.message || 'Failed to create purchase order.');
    }
  };

  const label = 'text-xs font-bold text-slate-500 uppercase tracking-wider';
  const input = 'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:border-[#55349A] focus:ring-2 focus:ring-[#55349A]/10 outline-none transition-all';
  const sel = input + ' appearance-none cursor-pointer pr-9';

  return (
    <div className="flex flex-col flex-1 min-h-full bg-[#F8F9FA]">
      <div className="bg-white border-b border-slate-100 py-3.5 px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onBack} className="p-1 hover:bg-slate-100 rounded transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-900" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Create Purchase Order</h1>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => submit('DRAFT')} disabled={createPo.isPending}
            className="px-5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all disabled:opacity-50">
            Save draft
          </button>
          <button type="button" onClick={() => submit('SENT')} disabled={createPo.isPending}
            className="px-6 py-2 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
            style={{ backgroundColor: PURPLE }}>
            {createPo.isPending ? 'Saving…' : 'Create & Send'}
          </button>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-6 pb-24">
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">{error}</div>
        )}

        {/* Order details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Order Details</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
            <Field label="Dealer (Vendor)">
              <Dropdown value={vendorUid} onChange={setVendorUid} placeholder="Select dealer"
                options={(vendors as any[]).map((v) => ({ id: v.uid, name: v.name }))} className={sel} />
            </Field>
            <Field label="Ship-to Store">
              <Dropdown value={storeUid} onChange={setStoreUid} placeholder="Select store"
                options={(stores as any[]).map((s) => ({ id: s.id || s.uid, name: s.name }))} className={sel} />
            </Field>
            <Field label="Inventory Catalog">
              <Dropdown value={catalogUid} onChange={setCatalogUid} placeholder="Select catalog"
                options={(storeCatalogs as any[]).map((c) => ({ id: c.uid || c.id, name: c.name }))} className={sel} />
            </Field>
            <Field label="PO Date">
              <input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} className={input} />
            </Field>
            <Field label="Expected Delivery">
              <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className={input} />
            </Field>
            <Field label="Ref / Quote No">
              <input type="text" value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="Optional" className={input} />
            </Field>
            <div className="md:col-span-3">
              <label className={label}>Note / Terms</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. Deliver within 7 days"
                className={input + ' mt-2 resize-none'} />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Items to Order</h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Search an item, choose its purchase unit, enter the quantity to order and the agreed rate.</p>
            <div className="relative mt-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search item by name or SKU…" value={search}
                onChange={(e) => { setSearch(e.target.value); if (picked) setPicked(null); }}
                className="w-full pl-11 pr-10 py-3 bg-[#F8F9FA] border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:border-[#55349A] focus:ring-4 focus:ring-[#55349A]/5 outline-none" />
              {search && (
                <button type="button" onClick={() => { setSearch(''); setPicked(null); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
              {!picked && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 py-2 max-h-[300px] overflow-y-auto">
                  {results.map((it: any) => (
                    <button key={it.uid} type="button" onClick={() => pickItem(it)}
                      className="w-full px-5 py-2.5 hover:bg-slate-50 flex flex-col items-start text-left transition-colors">
                      <span className="text-sm font-bold text-slate-900">{it.name}</span>
                      <span className="text-xs text-slate-400 font-medium">{it.categoryName} • {it.sku}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {picked && (
              <div className="mt-4 p-4 bg-[#F9F8FF] border border-[#DED4F3]/60 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{picked.name}</h4>
                    <p className="text-xs text-slate-500 font-bold">{picked.sku}</p>
                  </div>
                  <button type="button" onClick={() => { setPicked(null); setSearch(''); }} className="p-1 hover:bg-white rounded-lg">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Field label="Purchase Unit">
                    <select value={row.unitUid} onChange={(e) => setRow({ ...row, unitUid: e.target.value })} className={sel}>
                      <option value="">Base unit</option>
                      {purchaseUnits.map((u: any) => <option key={u.unitUid} value={u.unitUid}>{unitName(u.unitUid)}</option>)}
                    </select>
                  </Field>
                  <Field label="Ordered Qty">
                    <input type="number" min={0} step="any" value={row.orderedQty}
                      onChange={(e) => setRow({ ...row, orderedQty: e.target.value })} className={input} />
                  </Field>
                  <Field label="Rate">
                    <input type="number" min={0} step="any" value={row.unitPrice}
                      onChange={(e) => setRow({ ...row, unitPrice: e.target.value })} className={input} />
                  </Field>
                  <Field label="MRP">
                    <input type="number" min={0} step="any" value={row.mrp}
                      onChange={(e) => setRow({ ...row, mrp: e.target.value })} className={input} />
                  </Field>
                </div>
                <div className="flex justify-end mt-3">
                  <button type="button" onClick={addLine}
                    className="flex items-center gap-2 px-5 py-2 text-white rounded-xl text-xs font-bold shadow-sm"
                    style={{ backgroundColor: PURPLE }}>
                    <Plus className="h-4 w-4" strokeWidth={3} /> Add to order
                  </button>
                </div>
              </div>
            )}
          </div>

          {lines.length === 0 ? (
            <div className="min-h-[180px] flex flex-col items-center justify-center p-8 text-center border-t border-slate-100">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <ShoppingBasket className="h-8 w-8 text-[#9EB1D3]" strokeWidth={1} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">No items added yet</h3>
              <p className="text-xs text-slate-500 max-w-xs">Search above to add the items you want to order from this dealer.</p>
            </div>
          ) : (
          <div className="w-full overflow-x-auto rounded-xl border border-surface-200 shadow-3xs">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-50 border-y border-surface-100 select-none text-surface-400 text-[10.5px] font-bold uppercase tracking-wider">
                  <th className="px-[22px] py-2.5">Item</th>
                  <th className="px-[22px] py-2.5">Unit</th>
                  <th className="px-[22px] py-2.5 text-right">Ordered</th>
                  <th className="px-[22px] py-2.5 text-right">Rate</th>
                  <th className="px-[22px] py-2.5 text-right">MRP</th>
                  <th className="px-[22px] py-2.5 text-right">Amount</th>
                  <th className="px-[22px] py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {lines.map((l, i) => (
                  <tr key={i} className="border-b border-surface-100 px-[22px] py-2.5 text-[12.5px] hover:bg-surface-50 transition-colors">
                    <td className="px-[22px] py-2.5 text-left">
                      <div className="text-[13px] font-bold text-surface-900">{l.name}</div>
                      <div className="text-[11px] text-surface-400 font-bold">{l.sku}</div>
                    </td>
                    <td className="px-[22px] py-2.5 text-left text-surface-600">{unitName(l.unitUid)}</td>
                    <td className="px-[22px] py-2.5 text-right font-bold text-surface-900">{l.orderedQty}</td>
                    <td className="px-[22px] py-2.5 text-right text-surface-600">{(parseFloat(l.unitPrice) || 0).toFixed(2)}</td>
                    <td className="px-[22px] py-2.5 text-right text-surface-600">{l.mrp ? (parseFloat(l.mrp)).toFixed(2) : '—'}</td>
                    <td className="px-[22px] py-2.5 text-right font-bold text-surface-900">{lineAmount(l).toFixed(2)}</td>
                    <td className="px-[22px] py-2.5 text-right">
                      <button type="button" onClick={() => setLines(lines.filter((_, x) => x !== i))}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-surface-400 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-surface-200 bg-surface-50">
                  <td className="px-[22px] py-2.5 text-xs font-bold text-surface-500 uppercase" colSpan={2}>Total</td>
                  <td className="px-[22px] py-2.5 text-right text-sm font-black text-surface-900">{totalQty}</td>
                  <td colSpan={2} />
                  <td className="px-[22px] py-2.5 text-right text-sm font-black" style={{ color: PURPLE }}>Rs {subTotal.toFixed(2)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function Dropdown({ value, onChange, options, placeholder, className }:
  { value: string; onChange: (v: string) => void; options: { id: string; name: string }[]; placeholder: string; className: string }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
    </div>
  );
}
