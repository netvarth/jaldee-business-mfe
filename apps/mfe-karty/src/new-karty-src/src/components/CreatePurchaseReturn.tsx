import { useMemo, useState } from 'react';
import { ArrowLeft, RotateCcw, Search, PackageCheck, AlertCircle, Store as StoreIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useVendors } from '../../../services/useVendors';
import { useStores } from '../../../services/useStores';
import { useReturnableItems, type ReturnablePurchaseLine } from '../../../services/useReturnableItems';
import { useCreatePurchaseReturn } from '../../../services/usePurchaseReturns';

/**
 * Dealer-first Purchase Return.
 *
 * The flow the business wants: pick the DEALER first, then only that dealer's still-returnable
 * purchased lines appear (scoped server-side by `GET /purchases/returnable-items?vendorUid=…`).
 * Pick lines, enter a return qty capped at each line's `returnableQty`, and submit.
 */
interface Props {
  onBack: () => void;
  onCreated?: () => void;
}

interface RowState { include: boolean; qty: string; }

export const CreatePurchaseReturn = ({ onBack, onCreated }: Props) => {
  const { data: vendors = [] } = useVendors();
  const { data: stores = [] } = useStores();
  const createReturn = useCreatePurchaseReturn();

  const [vendorUid, setVendorUid] = useState('');
  const [storeUid, setStoreUid] = useState('');
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [error, setError] = useState('');

  // Dealer-scoped returnable lines — the query is disabled until a dealer is chosen.
  const { data: lines = [], isLoading } = useReturnableItems({
    vendorUid: vendorUid || null,
    storeUid: storeUid || undefined,
    search: search || undefined,
    includeFullyReturned: false,
  });

  const vendorName = (vendors as any[]).find(v => (v.uid || v.id) === vendorUid)?.name || '';

  const chosen = useMemo(
    () => (lines as ReturnablePurchaseLine[]).filter(l => rows[l.purchaseItemUid]?.include && Number(rows[l.purchaseItemUid]?.qty) > 0),
    [lines, rows]
  );
  const totalQty = chosen.reduce((s, l) => s + (Number(rows[l.purchaseItemUid].qty) || 0), 0);
  const refundEstimate = chosen.reduce((s, l) => s + (Number(rows[l.purchaseItemUid].qty) || 0) * (l.unitPrice || 0), 0);

  const setRow = (id: string, patch: Partial<RowState>) =>
    setRows(prev => ({ ...prev, [id]: { include: false, qty: '', ...prev[id], ...patch } }));

  const submit = async () => {
    setError('');
    if (!vendorUid) return setError('Select a dealer first.');
    if (chosen.length === 0) return setError('Select at least one line and enter a return quantity.');
    const over = chosen.find(l => (Number(rows[l.purchaseItemUid].qty) || 0) > l.returnableQty);
    if (over) return setError(`Return qty for "${over.itemName}" exceeds the returnable ${over.returnableQty}.`);

    // Returns are scoped to one dealer; take the store from the first chosen line if not filtered.
    const fromStoreUid = storeUid || chosen[0].storeUid || null;
    const payload = {
      vendorUid,
      fromStoreUid,
      returnDate: new Date(returnDate).toISOString(),
      status: 'DRAFT',
      items: chosen.map(l => {
        const qty = Number(rows[l.purchaseItemUid].qty) || 0;
        return {
          // purchaseItemUid is sent for when the backend links the source line (RET-002); harmless today.
          purchaseItemUid: l.purchaseItemUid,
          itemUid: l.itemUid,
          variantUid: l.variantUid,
          batchNumber: l.batchNumber || null,
          qty: Math.round(qty),
          unitUid: l.unitUid || null,
          purchQty: qty,
          baseQty: l.baseQty ?? qty,
          unitPrice: l.unitPrice ?? 0,
        };
      }),
    };
    try {
      await createReturn.mutateAsync(payload);
      onCreated?.();
      onBack();
    } catch (e: any) {
      setError(e?.message || 'Failed to create the purchase return.');
    }
  };

  const canSubmit = !!vendorUid && chosen.length > 0 && !createReturn.isPending;
  const field = 'w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm focus:border-[#55349A] focus:ring-2 focus:ring-[#55349A]/10 outline-none transition-all';

  return (
    <div className="flex flex-col flex-1 bg-[#F8F9FA] min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-surface-100 py-3.5 px-8 flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-surface-900" />
          </button>
          <h1 className="text-lg font-black text-surface-950 tracking-tight flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-[#55349A]" /> New Purchase Return
          </h1>
        </div>
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="px-6 py-2.5 rounded-xl text-[13px] font-black text-white bg-[#55349A] hover:bg-[#452a7d] transition-all shadow-lg shadow-primary-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {createReturn.isPending ? 'Creating…' : 'Create Return'}
        </button>
      </div>

      <div className="p-6 md:p-8 space-y-6 max-w-5xl w-full mx-auto">
        {error && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-600 text-[13px] font-semibold px-4 py-3 rounded-xl">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* 1. Dealer + store + date */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6">
          <h2 className="text-sm font-black text-surface-900 uppercase tracking-wider mb-5">Return To Dealer</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Dealer (Vendor) *</label>
              <select className={field} value={vendorUid} onChange={e => { setVendorUid(e.target.value); setRows({}); }}>
                <option value="">Select dealer</option>
                {(vendors as any[]).map(v => (
                  <option key={v.uid || v.id} value={v.uid || v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Store (optional)</label>
              <select className={field} value={storeUid} onChange={e => setStoreUid(e.target.value)}>
                <option value="">All stores</option>
                {(stores as any[]).map(s => (
                  <option key={s.id || s.uid} value={s.id || s.uid}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Return Date</label>
              <input type="date" className={field} value={returnDate} onChange={e => setReturnDate(e.target.value)} />
            </div>
          </div>
        </div>

        {/* 2. Returnable items (dealer-scoped) */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm">
          <div className="p-6 border-b border-surface-100 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-black text-surface-900 uppercase tracking-wider">Returnable Items</h2>
              <p className="text-xs text-surface-500 mt-0.5">
                {vendorUid ? <>Purchased from <span className="font-bold text-surface-700">{vendorName}</span> and still returnable.</> : 'Choose a dealer to load their returnable purchases.'}
              </p>
            </div>
            {vendorUid && (
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item / bill / batch"
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm outline-none focus:border-[#55349A]" />
              </div>
            )}
          </div>

          {!vendorUid ? (
            <Empty icon={<StoreIcon className="h-7 w-7 text-[#9EB1D3]" strokeWidth={1} />} text="Select a dealer above to see the items you purchased from them." />
          ) : isLoading ? (
            <Empty icon={<PackageCheck className="h-7 w-7 text-[#9EB1D3]" strokeWidth={1} />} text="Loading returnable items…" />
          ) : (lines as ReturnablePurchaseLine[]).length === 0 ? (
            <Empty icon={<PackageCheck className="h-7 w-7 text-[#9EB1D3]" strokeWidth={1} />} text="No returnable purchases from this dealer." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-surface-100">
                    {['', 'Item', 'Bill', 'Batch', 'Expiry', 'Unit', 'Purchased', 'Returned', 'Returnable', 'Return Qty'].map((h, i) => (
                      <th key={i} className={cn('py-3 px-4 text-[10px] font-bold text-surface-400 uppercase tracking-widest', i >= 6 && 'text-right')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(lines as ReturnablePurchaseLine[]).map(l => {
                    const r = rows[l.purchaseItemUid] || { include: false, qty: '' };
                    return (
                      <tr key={l.purchaseItemUid} className={cn('border-b border-surface-50 hover:bg-surface-50/50 transition-colors', r.include && 'bg-[#55349A]/[0.03]')}>
                        <td className="py-3 px-4">
                          <input type="checkbox" checked={r.include}
                            onChange={e => setRow(l.purchaseItemUid, { include: e.target.checked, qty: e.target.checked && !r.qty ? String(l.returnableQty) : r.qty })}
                            className="h-4 w-4 rounded border-surface-300 text-[#55349A] focus:ring-[#55349A]" />
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-[13px] font-bold text-surface-900">{l.itemName || '—'}</div>
                          <div className="text-[11px] text-surface-400">{l.sku || ''}</div>
                        </td>
                        <td className="py-3 px-4 text-[12px] text-surface-600">{l.billNo || l.purchaseNo || '—'}</td>
                        <td className="py-3 px-4 text-[12px] text-surface-600">{l.batchNumber || '—'}</td>
                        <td className="py-3 px-4 text-[12px] text-surface-600">{l.expiryDate || '—'}</td>
                        <td className="py-3 px-4 text-[12px] text-surface-600">{l.unitName || 'Base'}</td>
                        <td className="py-3 px-4 text-[12px] text-surface-700 text-right">{l.purchasedQty}</td>
                        <td className="py-3 px-4 text-[12px] text-surface-500 text-right">{l.returnedQty}</td>
                        <td className="py-3 px-4 text-[12px] font-black text-surface-900 text-right">{l.returnableQty}</td>
                        <td className="py-3 px-4 text-right">
                          <input
                            type="number" min={0} max={l.returnableQty}
                            value={r.qty}
                            onChange={e => {
                              const capped = Math.min(Number(e.target.value) || 0, l.returnableQty);
                              setRow(l.purchaseItemUid, { qty: e.target.value === '' ? '' : String(capped), include: capped > 0 ? true : r.include });
                            }}
                            className="w-20 px-2 py-1.5 bg-white border border-surface-200 rounded-lg text-[12px] font-bold text-right outline-none focus:border-[#55349A]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 3. Summary */}
        {chosen.length > 0 && (
          <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div>
                <div className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Lines</div>
                <div className="text-lg font-black text-surface-900">{chosen.length}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Total Return Qty</div>
                <div className="text-lg font-black text-surface-900">{totalQty}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Est. Refund</div>
                <div className="text-lg font-black text-surface-900">₹{refundEstimate.toFixed(2)}</div>
              </div>
            </div>
            <button onClick={submit} disabled={!canSubmit}
              className="px-6 py-2.5 rounded-xl text-[13px] font-black text-white bg-[#55349A] hover:bg-[#452a7d] transition-all disabled:opacity-40">
              {createReturn.isPending ? 'Creating…' : 'Create Return'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="min-h-[200px] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-14 h-14 bg-surface-50 rounded-full flex items-center justify-center mb-3">{icon}</div>
      <p className="text-xs text-surface-500 max-w-xs font-medium">{text}</p>
    </div>
  );
}
