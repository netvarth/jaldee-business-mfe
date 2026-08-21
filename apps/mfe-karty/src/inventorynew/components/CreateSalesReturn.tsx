import React, { useMemo, useState } from 'react';
import { ArrowLeft, Save, Plus, Trash2 } from '../icons';
import {
  useCreateSalesReturn,
  useReturnableByConsumer,
  useReturnableByOrder,
  ReturnableLine,
} from '../../services/useSalesReturns';
import { useItems } from '../../services/useItems';
import { useUnits } from '../../services/useUnits';
import { useCustomers } from '../../services/useCustomers';
import { useStores } from '../../services/useStores';
import { useInventoryCatalogs, useInventoryCatalogItems } from '../../services/useInventoryCatalogs';

interface CreateSalesReturnProps {
  onBack: () => void;
  onCreate: (data: any) => void;
}

interface ReturnLine {
  itemUid: string;
  itemName: string;
  unitUid: string;
  qty: number;
  unitPrice: number;
  batchNumber: string;
}

export const CreateSalesReturn = ({ onBack, onCreate }: CreateSalesReturnProps) => {
  const createMutation = useCreateSalesReturn();
  const customersQuery = useCustomers('');
  const { data: stores = [] } = useStores();
  const { data: globalItems = [] } = useItems();
  const { data: unitList = [] } = useUnits();
  const { data: catalogs = [] } = useInventoryCatalogs();

  const customers: any[] = (customersQuery.data as any)?.content
    || (Array.isArray(customersQuery.data) ? (customersQuery.data as any[]) : []);

  const [returnNo] = useState('SRET-' + Math.floor(Math.random() * 10000));
  const [mode, setMode] = useState<'invoice' | 'manual'>('invoice');
  const [consumerUid, setConsumerUid] = useState('');
  const [reason, setReason] = useState('');

  // ---- invoice-driven path (RET-002) -------------------------------------
  const [orderUid, setOrderUid] = useState('');
  const { data: eligibleOrders = [], isFetching: loadingOrders } = useReturnableByConsumer(consumerUid || undefined);
  const { data: returnableLines = [], isFetching: loadingLines } = useReturnableByOrder(orderUid || undefined);
  // qty the user wants to return per order line, keyed by orderItemUid
  const [returnQty, setReturnQty] = useState<Record<string, number>>({});

  const selectedOrder: any = (eligibleOrders as any[]).find((o) => o.orderUid === orderUid);
  const derivedStoreUid: string | undefined = selectedOrder?.storeUid;

  const pickedInvoiceLines = useMemo(
    () => (returnableLines as ReturnableLine[]).filter((l) => (returnQty[l.orderItemUid] || 0) > 0),
    [returnableLines, returnQty],
  );

  // ---- manual path (no invoice) ------------------------------------------
  const [storeUid, setStoreUid] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [selectedCatalog, setSelectedCatalog] = useState('');
  const { data: catalogItems = [] } = useInventoryCatalogItems(selectedCatalog);
  const [lines, setLines] = useState<ReturnLine[]>([]);
  const [pick, setPick] = useState({ catalogItemUid: '', unitUid: '', qty: 1, unitPrice: 0, batchNumber: '' });

  const unitName = (uid?: string) => {
    if (!uid) return 'Base unit';
    const u: any = (unitList as any[]).find((x) => x.uid === uid);
    if (!u) return `${uid.substring(0, 8)}…`;
    return u.symbol ? `${u.name} (${u.symbol})` : u.name;
  };
  const storeName = (uid?: string) => {
    const s: any = (stores as any[]).find((x) => (x.uid || x.id) === uid);
    return s?.name || s?.storeName || (uid ? `${uid.substring(0, 8)}…` : '—');
  };
  const customerName = (c: any) => c.displayName || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.phoneE164 || 'Customer';

  const pickedCatalogItem: any = (catalogItems as any[]).find((c) => c.uid === pick.catalogItemUid);
  const pickedItem: any = pickedCatalogItem && (globalItems as any[]).find((i) => i.uid === pickedCatalogItem.itemUid);
  const pickedUnits: any[] = ((pickedItem?.units as any[]) || []).filter((u) => u.selling);

  const addLine = () => {
    if (!pick.catalogItemUid || pick.qty <= 0) return;
    setLines([...lines, {
      itemUid: pickedCatalogItem?.itemUid,
      itemName: pickedItem?.name || 'Item',
      unitUid: pick.unitUid,
      qty: pick.qty,
      unitPrice: pick.unitPrice,
      batchNumber: pick.batchNumber,
    }]);
    setPick({ catalogItemUid: '', unitUid: '', qty: 1, unitPrice: 0, batchNumber: '' });
  };

  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  const setLineQty = (line: ReturnableLine, raw: number) => {
    const capped = Math.max(0, Math.min(raw || 0, line.returnableBaseQty));
    setReturnQty((prev) => ({ ...prev, [line.orderItemUid]: capped }));
  };

  // ---- save --------------------------------------------------------------
  const canSaveInvoice = !!orderUid && pickedInvoiceLines.length > 0;
  const canSaveManual = !!storeUid && lines.length > 0;
  const saveDisabled = createMutation.isPending || (mode === 'invoice' ? !canSaveInvoice : !canSaveManual);

  const handleSave = () => {
    let payload: any;
    if (mode === 'invoice') {
      // Server derives store, invoiceNo/date, and per-line unit + price from the
      // source order — do not send storeUid / unitUid / unitPrice / batchNumber.
      payload = {
        returnNo,
        orderUid,
        consumerUid: consumerUid || null,
        reason: reason || null,
        status: 'DRAFT',
        items: pickedInvoiceLines.map((l) => ({
          itemUid: l.itemUid,
          variantUid: l.variantUid || null,
          qty: Math.round(returnQty[l.orderItemUid] || 0),
        })),
      };
    } else {
      payload = {
        returnNo,
        consumerUid: consumerUid || null,
        storeUid: storeUid || null,
        invoiceNo: invoiceNo || null,
        reason: reason || null,
        status: 'DRAFT',
        items: lines.map((l) => ({
          itemUid: l.itemUid,
          qty: Math.round(l.qty),
          sellQty: l.qty,
          unitUid: l.unitUid || null,
          unitPrice: l.unitPrice,
          batchNumber: l.batchNumber || null,
        })),
      };
    }
    createMutation.mutate(payload, { onSuccess: (data) => onCreate(data) });
  };

  const input = "w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all";
  const lbl = "block text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2";
  const roLbl = "block text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider";

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-[var(--color-surface-alt)]/10">
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] py-4 px-8 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-[var(--color-surface-alt)] rounded-lg border-0 bg-transparent cursor-pointer">
            <ArrowLeft className="h-5 w-5 text-[var(--color-text-primary)]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">New Sales Return</h1>
            <p className="text-xs text-[var(--color-text-secondary)] font-medium mt-0.5">Customer return — restocked in base units on completion</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onBack} className="px-5 py-2.5 bg-transparent border-2 border-[var(--color-border)] text-[var(--color-text-primary)] rounded-xl text-sm font-bold hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer">Cancel</button>
          <button
            disabled={saveDisabled}
            onClick={handleSave}
            className="px-6 py-2.5 bg-[var(--color-primary)] text-[var(--color-primary-text)] rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer border-0 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {createMutation.isPending ? 'Saving…' : 'Save Return'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* mode toggle */}
          <div className="inline-flex bg-[var(--color-surface-alt)] rounded-xl p-1 border border-[var(--color-border)]">
            {(['invoice', 'manual'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer border-0 ${
                  mode === m ? 'bg-[var(--color-primary)] text-[var(--color-primary-text)] shadow-sm' : 'bg-transparent text-[var(--color-text-secondary)]'
                }`}
              >
                {m === 'invoice' ? 'From invoice' : 'Manual (no invoice)'}
              </button>
            ))}
          </div>

          {/* header fields */}
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6 grid grid-cols-2 gap-6">
            <div>
              <label className={lbl}>Return No</label>
              <input value={returnNo} disabled className={input + ' opacity-60'} />
            </div>
            <div>
              <label className={lbl}>Customer</label>
              <select
                value={consumerUid}
                onChange={(e) => { setConsumerUid(e.target.value); setOrderUid(''); setReturnQty({}); }}
                className={input + ' cursor-pointer'}
              >
                <option value="">Select customer</option>
                {customers.map((c) => <option key={c.uid} value={c.uid}>{customerName(c)}</option>)}
              </select>
            </div>

            {mode === 'invoice' ? (
              <>
                <div>
                  <label className={lbl}>Order / Invoice</label>
                  <select
                    value={orderUid}
                    disabled={!consumerUid}
                    onChange={(e) => { setOrderUid(e.target.value); setReturnQty({}); }}
                    className={input + ' cursor-pointer disabled:opacity-50'}
                  >
                    <option value="">{consumerUid ? (loadingOrders ? 'Loading orders…' : 'Select order') : 'Pick a customer first'}</option>
                    {(eligibleOrders as any[]).map((o) => (
                      <option key={o.orderUid} value={o.orderUid}>
                        {(o.orderNo || o.orderUid.substring(0, 8))}{o.orderDate ? ` · ${String(o.orderDate).substring(0, 10)}` : ''} · {o.returnableLineCount} returnable
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={roLbl + ' mb-2'}>Store (from order)</label>
                  <div className={input + ' opacity-70 bg-[var(--color-surface-alt)]/40'}>{orderUid ? storeName(derivedStoreUid) : '—'}</div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className={lbl}>Invoice No</label>
                  <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className={input} placeholder="Original sale invoice ref" />
                </div>
                <div>
                  <label className={lbl}>Store *</label>
                  <select value={storeUid} onChange={(e) => setStoreUid(e.target.value)} className={input + ' cursor-pointer'}>
                    <option value="">Select store</option>
                    {(stores as any[]).map((s) => <option key={s.uid || s.id} value={s.uid || s.id}>{s.name || s.storeName}</option>)}
                  </select>
                </div>
              </>
            )}

            <div className="col-span-2">
              <label className={lbl}>Reason</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} className={input} placeholder="e.g. Damaged / wrong item" />
            </div>
          </div>

          {/* ---- invoice-driven returnable lines ---- */}
          {mode === 'invoice' && (
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--color-border)]">
                <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Returnable Items</h2>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Unit and price are taken from the original order. Enter how many to return (capped at what's still returnable).</p>
              </div>
              {!orderUid ? (
                <div className="px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">Select a customer and order to load returnable items.</div>
              ) : loadingLines ? (
                <div className="px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">Loading returnable items…</div>
              ) : (returnableLines as ReturnableLine[]).length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">This order has no returnable items left.</div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[640px]">
                  <thead>
                    <tr className="bg-surface-50 border-y border-surface-100 select-none text-surface-400 text-[10.5px] font-bold uppercase tracking-wider">
                      <th className="px-[22px] py-2.5">Item</th>
                      <th className="px-[22px] py-2.5">Unit</th>
                      <th className="px-[22px] py-2.5 text-right">Sold</th>
                      <th className="px-[22px] py-2.5 text-right">Returnable</th>
                      <th className="px-[22px] py-2.5 text-right">Price</th>
                      <th className="px-[22px] py-2.5 text-right w-32">Return Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {(returnableLines as ReturnableLine[]).map((l) => (
                      <tr key={l.orderItemUid} className="border-b border-surface-100 text-[12.5px] hover:bg-surface-50 transition-colors bg-white">
                        <td className="px-[22px] py-2.5">
                          <div className="font-medium text-surface-900">{l.itemName || 'Item'}</div>
                          {l.sku ? <div className="text-[11px] text-surface-400 font-mono">{l.sku}</div> : null}
                        </td>
                        <td className="px-[22px] py-2.5 text-surface-500">{unitName(l.unitUid)}</td>
                        <td className="px-[22px] py-2.5 text-right text-surface-500">{l.soldQty ?? l.soldBaseQty ?? '—'}</td>
                        <td className="px-[22px] py-2.5 text-right font-semibold text-surface-700">{l.returnableBaseQty}</td>
                        <td className="px-[22px] py-2.5 text-right text-surface-500">{l.unitPrice ?? '—'}</td>
                        <td className="px-[22px] py-2.5 text-right">
                          <input
                            type="number"
                            min={0}
                            max={l.returnableBaseQty}
                            step="any"
                            value={returnQty[l.orderItemUid] ?? ''}
                            onChange={(e) => setLineQty(l, parseFloat(e.target.value))}
                            placeholder="0"
                            className="w-24 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-right outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ---- manual add-line path ---- */}
          {mode === 'manual' && (
            <>
              <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6">
                <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider mb-4">Add Item</h2>
                <div className="flex items-end gap-3 flex-wrap">
                  <div className="flex-1 min-w-[160px]">
                    <label className={lbl}>Catalog</label>
                    <select value={selectedCatalog} onChange={(e) => setSelectedCatalog(e.target.value)} className={input + ' cursor-pointer'}>
                      <option value="">Select catalog</option>
                      {(catalogs as any[]).map((c) => <option key={c.uid || c.id} value={c.uid || c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className={lbl}>Item</label>
                    <select value={pick.catalogItemUid} disabled={!selectedCatalog} onChange={(e) => setPick({ ...pick, catalogItemUid: e.target.value, unitUid: '' })} className={input + ' cursor-pointer disabled:opacity-50'}>
                      <option value="">Select item</option>
                      {(catalogItems as any[]).map((ci) => {
                        const it: any = (globalItems as any[]).find((i) => i.uid === ci.itemUid);
                        return <option key={ci.uid} value={ci.uid}>{it?.name || 'Item'}</option>;
                      })}
                    </select>
                  </div>
                  <div className="w-32">
                    <label className={lbl}>Unit</label>
                    <select value={pick.unitUid} disabled={!pick.catalogItemUid} onChange={(e) => setPick({ ...pick, unitUid: e.target.value })} className={input + ' cursor-pointer disabled:opacity-50'}>
                      <option value="">Base unit</option>
                      {pickedUnits.map((u: any) => <option key={u.unitUid} value={u.unitUid}>{unitName(u.unitUid)}</option>)}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className={lbl}>Qty</label>
                    <input type="number" min={0} step="any" value={pick.qty} onChange={(e) => setPick({ ...pick, qty: parseFloat(e.target.value) || 0 })} className={input + ' text-right'} />
                  </div>
                  <div className="w-28">
                    <label className={lbl}>Unit Price</label>
                    <input type="number" min={0} step="any" value={pick.unitPrice} onChange={(e) => setPick({ ...pick, unitPrice: parseFloat(e.target.value) || 0 })} className={input + ' text-right'} />
                  </div>
                  <button onClick={addLine} disabled={!pick.catalogItemUid || pick.qty <= 0} className="px-4 py-2.5 bg-[var(--color-primary-subtle)] text-[var(--color-primary)] rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[var(--color-primary)] hover:text-white transition-all disabled:opacity-50 border-0 cursor-pointer">
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>
              </div>

              {lines.length > 0 && (
                <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-surface-50 border-y border-surface-100 select-none text-surface-400 text-[10.5px] font-bold uppercase tracking-wider">
                        <th className="px-[22px] py-2.5 font-bold tracking-wider">Item</th>
                        <th className="px-[22px] py-2.5 font-bold tracking-wider">Unit</th>
                        <th className="px-[22px] py-2.5 font-bold tracking-wider text-right">Qty</th>
                        <th className="px-[22px] py-2.5 font-bold tracking-wider text-right">Price</th>
                        <th className="px-[22px] py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {lines.map((l, i) => (
                        <tr key={i} className="border-b border-surface-100 px-[22px] py-2.5 text-[12.5px] hover:bg-surface-50 transition-colors bg-white">
                          <td className="px-[22px] py-2.5 font-medium text-surface-900">{l.itemName}</td>
                          <td className="px-[22px] py-2.5 text-surface-500">{l.unitUid ? unitName(l.unitUid) : 'Base unit'}</td>
                          <td className="px-[22px] py-2.5 text-right">{l.qty}</td>
                          <td className="px-[22px] py-2.5 text-right">{l.unitPrice}</td>
                          <td className="px-[22px] py-2.5 text-right">
                            <button onClick={() => removeLine(i)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg border-0 bg-transparent cursor-pointer">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
