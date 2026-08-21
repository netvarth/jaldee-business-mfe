import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, PackageCheck, Info, Barcode, Search, CheckCircle2, Sparkles, Printer } from 'lucide-react';
import { useItems } from '../../../services/useItems';
import { useBarcodeLabels } from '../../../services/useBarcodes';
import { useUnits } from '../../../services/useUnits';
import {
  useOpenPurchaseOrders,
  usePurchaseOrderPendingLines,
  useCreatePurchaseEntry,
  type PoPendingLine,
} from '../../../services/usePurchaseOrders';

/**
 * Purchase Entry (GRN) against a Purchase Order.
 *
 * The item lines are NOT re-entered — they are pulled from the PO's pending lines. The user
 * only enters what actually arrived this time (received qty, batch, expiry, rate). Saving posts
 * a Purchase Entry with poUid + poItemUid per line; the backend rolls received qty onto the PO
 * and receives stock. Because pending qty shrinks after each entry, you can book several entries
 * against the same PO until it is fully received.
 */
interface Props {
  onBack: () => void;
  onSaved?: (entry: any) => void;
  initialPoUid?: string;
}

const PURPLE = '#55349A';

interface EntryRow {
  receiveQty: string; batchNumber: string; expiryDate: string; unitPrice: string; include: boolean;
}

export const PurchaseEntryAgainstPO = ({ onBack, onSaved, initialPoUid }: Props) => {
  const { data: openPos = [], isLoading: posLoading } = useOpenPurchaseOrders();
  const { data: units = [] } = useUnits();
  const createEntry = useCreatePurchaseEntry();

  const [poUid, setPoUid] = useState(initialPoUid || '');
  const { data: pendingLines = [], isLoading: linesLoading } = usePurchaseOrderPendingLines(poUid);

  const [billNo, setBillNo] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<Record<string, EntryRow>>({});
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [lastScannedMsg, setLastScannedMsg] = useState<string | null>(null);
  const { data: masterItems = [] } = useItems();
  const barcodeLabels = useBarcodeLabels();

  const selectedPo = useMemo(() => openPos.find((p) => p.id === poUid), [openPos, poUid]);

  const handleBarcodeScan = (code: string) => {
    const raw = code.trim().toLowerCase();
    if (!raw) return;

    // Find master item with matching barcode or SKU
    const itemMatch = (masterItems as any[]).find((m: any) =>
      (m.barcode || '').toLowerCase() === raw ||
      (m.barCode || '').toLowerCase() === raw ||
      (m.sku || '').toLowerCase() === raw
    );

    const matchLine = pendingLines.find((l) =>
      (itemMatch && l.itemUid === (itemMatch.uid || itemMatch.id)) ||
      (l.sku || '').toLowerCase() === raw ||
      l.itemName.toLowerCase().includes(raw)
    );

    if (matchLine) {
      const cur = rows[matchLine.poItemUid];
      const curQty = parseFloat(cur?.receiveQty || '0');
      const newQty = Math.min(matchLine.pendingQty, curQty + 1);
      setRow(matchLine.poItemUid, { include: true, receiveQty: String(newQty) });
      setLastScannedMsg(`✓ Scanned ${matchLine.itemName}: Qty ${newQty} of ${matchLine.pendingQty}`);
      setTimeout(() => setLastScannedMsg(null), 3000);
      setScanInput('');
    } else {
      setError(`No pending line found matching barcode / SKU "${code}".`);
      setTimeout(() => setError(''), 4000);
    }
  };

    // Seed one editable row per pending line, defaulting the receipt to the full pending qty.
  useEffect(() => {
    const seed: Record<string, EntryRow> = {};
    pendingLines.forEach((l) => {
      seed[l.poItemUid] = {
        receiveQty: String(l.pendingQty),
        batchNumber: '', expiryDate: '',
        unitPrice: String(l.unitPrice || ''),
        include: true,
      };
    });
    setRows(seed);
  }, [pendingLines]);

  const unitName = (uid: string) => {
    const u: any = (units as any[]).find((x) => (x.uid || x.unitUid) === uid);
    return u ? (u.symbol ? `${u.name} (${u.symbol})` : u.name) : 'Base unit';
  };

  const setRow = (id: string, patch: Partial<EntryRow>) =>
    setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));

  const totalReceiving = pendingLines.reduce(
    (s, l) => s + (rows[l.poItemUid]?.include ? parseFloat(rows[l.poItemUid]?.receiveQty) || 0 : 0), 0);

  const save = async () => {
    setError('');
    if (!selectedPo) return setError('Select a purchase order.');
    const chosen = pendingLines.filter((l) => rows[l.poItemUid]?.include && (parseFloat(rows[l.poItemUid]?.receiveQty) > 0));
    if (chosen.length === 0) return setError('Enter a received quantity for at least one line.');
    const over = chosen.find((l) => (parseFloat(rows[l.poItemUid].receiveQty) || 0) > l.pendingQty);
    if (over) return setError(`Received qty for "${over.itemName}" exceeds the pending ${over.pendingQty}.`);

    // purchase-fix: replaced window.confirm with an in-app confirmation modal (design brief: "confirm first").
    setConfirmOpen(true);
  };

  const doSave = async () => {
    setConfirmOpen(false);
    if (!selectedPo) return;
    const chosen = pendingLines.filter((l) => rows[l.poItemUid]?.include && (parseFloat(rows[l.poItemUid]?.receiveQty) > 0));
    const payload = {
      poUid,
      vendorUid: selectedPo.vendorUid,
      toStoreUid: selectedPo.storeUid,
      billNo: billNo || null,
      purchaseDate: new Date(entryDate).toISOString(),
      note: note || null,
      status: 'DRAFT',
      items: chosen.map((l) => {
        const r = rows[l.poItemUid];
        return {
          poItemUid: l.poItemUid, itemUid: l.itemUid, variantUid: l.variantUid,
          unitUid: l.unitUid || null,
          // qty is a required primitive on the backend; keep it in step with purchQty.
          qty: Math.round(parseFloat(r.receiveQty) || 0),
          purchQty: parseFloat(r.receiveQty) || 0,
          batchNumber: r.batchNumber || null,
          expiryDate: r.expiryDate || null,
          unitPrice: parseFloat(r.unitPrice) || 0,
          mrp: l.mrp,
        };
      }),
    };
    try {
      const entry = await createEntry.mutateAsync(payload);
      onSaved?.(entry);
      onBack();
    } catch (e: any) {
      setError(e?.message || 'Failed to save the purchase entry.');
    }
  };

  const input = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-900 focus:border-[#55349A] focus:ring-2 focus:ring-[#55349A]/10 outline-none transition-all';

  return (
    <div className="flex flex-col flex-1 min-h-full bg-[#F8F9FA]">
      <div className="bg-white border-b border-slate-100 py-3.5 px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onBack} className="p-1 hover:bg-slate-100 rounded transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-900" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Purchase Entry against PO</h1>
        </div>
        <button type="button" onClick={save} disabled={createEntry.isPending || !poUid}
          className="px-6 py-2 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
          style={{ backgroundColor: PURPLE }}>
          <PackageCheck className="h-4 w-4" /> {createEntry.isPending ? 'Saving…' : 'Save Purchase Entry'}
        </button>
      </div>

      <div className="flex-1 p-8 space-y-6 pb-24">
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">{error}</div>
        )}

        {/* PO picker + entry meta */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-6">
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Purchase Order</label>
            <div className="relative">
              <select value={poUid} onChange={(e) => setPoUid(e.target.value)}
                className={input + ' appearance-none cursor-pointer pr-9 py-2.5'} disabled={!!initialPoUid}>
                <option value="">{posLoading ? 'Loading open POs…' : 'Select an open PO'}</option>
                {openPos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.poNo} — {p.vendorName} · {p.status === 'PARTIALLY_RECEIVED' ? 'partly received' : 'sent'}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
            {selectedPo && (
              <p className="text-[11px] text-slate-500 font-semibold">
                Dealer: <span className="text-slate-700">{selectedPo.vendorName}</span> • Store: <span className="text-slate-700">{selectedPo.storeName}</span>
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bill No</label>
            <input type="text" value={billNo} onChange={(e) => setBillNo(e.target.value)} placeholder="Dealer invoice no" className={input + ' py-2.5'} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Entry Date</label>
            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className={input + ' py-2.5'} />
          </div>
        </div>

        {/* Receipt lines */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Receive Lines</h2>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
                <Info className="h-3.5 w-3.5" /> pulled from the PO — enter only what arrived
              </span>
            </div>

            {poUid && pendingLines.length > 0 && (
              <div className="flex items-center gap-3">
                {lastScannedMsg && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 animate-in fade-in duration-200">
                    {lastScannedMsg}
                  </span>
                )}
                <div className="relative w-72">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-600" />
                  <input
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleBarcodeScan(scanInput);
                      }
                    }}
                    placeholder="Scan Barcode / EAN / SKU to receive…"
                    className="w-full pl-9 pr-4 py-1.5 bg-purple-50/40 border border-purple-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A]"
                  />
                </div>
              </div>
            )}
          </div>

          {!poUid ? (
            <Empty text="Select a purchase order above to load its pending lines." />
          ) : linesLoading ? (
            <Empty text="Loading pending lines…" />
          ) : pendingLines.length === 0 ? (
            <Empty text="This PO is fully received — nothing pending." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="py-3 px-6">Item</th>
                    <th className="py-3 px-3 text-right">Ordered</th>
                    <th className="py-3 px-3 text-right">Received</th>
                    <th className="py-3 px-3 text-right">Pending</th>
                    <th className="py-3 px-3 text-center">Receive now</th>
                    <th className="py-3 px-3">Batch</th>
                    <th className="py-3 px-3">Expiry</th>
                    <th className="py-3 px-3 text-right">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingLines.map((l: PoPendingLine) => {
                    const r = rows[l.poItemUid];
                    if (!r) return null;
                    return (
                      <tr key={l.poItemUid} className={r.include ? '' : 'opacity-40'}>
                        <td className="py-3 px-6">
                          <div className="flex items-start gap-2">
                            <input type="checkbox" checked={r.include}
                              onChange={(e) => setRow(l.poItemUid, { include: e.target.checked })}
                              className="mt-1 accent-[#55349A]" />
                            <div>
                              <div className="text-[13px] font-bold text-slate-900">{l.itemName}</div>
                              <div className="text-[11px] text-slate-400 font-bold">{l.sku} • {unitName(l.unitUid)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right text-sm text-slate-600">{l.orderedQty}</td>
                        <td className="py-3 px-3 text-right text-sm text-slate-600">{l.receivedQty}</td>
                        <td className="py-3 px-3 text-right">
                          <span className="text-[13px] font-extrabold px-2.5 py-1 rounded-lg" style={{ color: PURPLE, backgroundColor: '#EFEBFA' }}>{l.pendingQty}</span>
                        </td>
                        <td className="py-3 px-3">
                          <input type="number" min={0} step="any" disabled={!r.include} value={r.receiveQty}
                            onChange={(e) => setRow(l.poItemUid, { receiveQty: e.target.value })}
                            className={input + ' w-24 text-center'} />
                        </td>
                        <td className="py-3 px-3">
                          <input type="text" disabled={!r.include} value={r.batchNumber}
                            onChange={(e) => setRow(l.poItemUid, { batchNumber: e.target.value })}
                            placeholder="Batch" className={input + ' w-28'} />
                        </td>
                        <td className="py-3 px-3">
                          <input type="date" disabled={!r.include} value={r.expiryDate}
                            onChange={(e) => setRow(l.poItemUid, { expiryDate: e.target.value })}
                            className={input + ' w-36'} />
                        </td>
                        <td className="py-3 px-3">
                          <input type="number" min={0} step="any" disabled={!r.include} value={r.unitPrice}
                            onChange={(e) => setRow(l.poItemUid, { unitPrice: e.target.value })}
                            className={input + ' w-24 text-right'} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-[#F9F8FF]">
                    <td className="py-3 px-6 text-xs font-bold text-slate-500 uppercase" colSpan={4}>Receiving in this entry</td>
                    <td className="py-3 px-3 text-center text-sm font-black text-slate-900">{totalReceiving}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {poUid && pendingLines.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Optional note for this receipt"
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-[#55349A] focus:ring-2 focus:ring-[#55349A]/10 outline-none resize-none" />
          </div>
        )}
      </div>

      {/* purchase-fix: in-app receive confirmation (replaces window.confirm — cleaner + doesn't block automation). */}
      {confirmOpen && selectedPo && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-150 shadow-2xl w-full max-w-md p-6 text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-[#55349A]/10 flex items-center justify-center shrink-0">
                <PackageCheck className="h-5 w-5 text-[#55349A]" />
              </div>
              <div>
                <h3 className="text-[15px] font-black text-slate-900">Confirm goods receipt</h3>
                <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">
                  Receive <span className="font-bold text-slate-800">{totalReceiving}</span> unit(s) against{' '}
                  <span className="font-bold text-slate-800">{selectedPo.poNo}</span> into{' '}
                  <span className="font-bold text-slate-800">{selectedPo.storeName}</span>. This posts stock and cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-[13px] font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
              <button type="button" onClick={doSave} disabled={createEntry.isPending}
                className="px-5 py-2 rounded-xl text-[13px] font-black text-white bg-[#55349A] hover:bg-[#452a7d] transition-colors disabled:opacity-40">
                {createEntry.isPending ? 'Posting…' : 'Confirm & Receive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function Empty({ text }: { text: string }) {
  return (
    <div className="min-h-[160px] flex flex-col items-center justify-center p-8 text-center border-t border-slate-100">
      <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-3">
        <PackageCheck className="h-7 w-7 text-[#9EB1D3]" strokeWidth={1} />
      </div>
      <p className="text-xs text-slate-500 max-w-xs font-medium">{text}</p>
    </div>
  );
}
