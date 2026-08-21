import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, History, HelpCircle, Plus, Minus, Trash2, X, ArrowLeft,
  PackageOpen, CheckCircle, AlertCircle, ChevronDown, Loader2, User,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useInventoryStock, InventoryStock } from '../../../services/useStock';
import { useStockAdjustments, useCreateStockAdjustment } from '../../../services/useStockAdjustments';
import { useStores } from '../../../services/useStores';
import { useItems } from '../../../services/useItems';
import { useInventoryCatalogs } from '../../../services/useInventoryCatalogs';
import { useQueryClient } from '@tanstack/react-query';

// Backend sends the all-zeros UUID as a placeholder when a stock row has no real
// batch. Treat that (and empty) as "no batch" everywhere it is displayed/filtered.
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
const hasBatch = (b?: string): boolean => !!b && b !== ZERO_UUID;

const REASON_PRESETS = [
  'Physical Count Audit',
  'Damaged / Expired',
  'Theft / Loss',
  'Received Correction',
  'Opening Stock',
  'Other',
];

type AdjType = 'ADDITION' | 'DEDUCTION';
type AdjTarget = 'IN_HAND' | 'ON_HOLD';

// A line the user has added to the adjustment basket, awaiting submit.
interface DraftLine {
  key: string; // catalogItemUid + batchUid — unique per stock row
  catalogItemUid: string;
  itemName: string;
  sku: string;
  batchUid?: string;
  inHand: number;
  onHold: number;
  type: AdjType;
  target: AdjTarget;
  quantity: number;
}

const draftKey = (row: InventoryStock) => `${row.catalogItemUid}::${row.batchUid || 'nobatch'}`;

export const StockAdjustment: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: stores = [] } = useStores();
  const { data: catalogs = [] } = useInventoryCatalogs();
  const { data: recentAdjustments = [] } = useStockAdjustments();
  const { data: items = [] } = useItems();
  const createAdjustment = useCreateStockAdjustment();

  const itemNameByUid = useMemo(() => {
    const m: Record<string, string> = {};
    (items as any[]).forEach((it) => { if (it?.uid) m[it.uid] = it.name; });
    return m;
  }, [items]);

  // ---- criteria selection -------------------------------------------------
  const [selectedStoreUid, setSelectedStoreUid] = useState<string>('');
  const [selectedCatalogUid, setSelectedCatalogUid] = useState<string>('');

  const catalogsForStore = useMemo(
    () => (catalogs as any[]).filter((c) => c.storeUid === selectedStoreUid),
    [catalogs, selectedStoreUid],
  );

  // default to the first store once stores load
  useEffect(() => {
    if (!selectedStoreUid && (stores as any[]).length > 0) {
      setSelectedStoreUid((stores as any[])[0].id);
    }
  }, [stores, selectedStoreUid]);

  // keep the catalog selection valid for the chosen store
  useEffect(() => {
    if (catalogsForStore.length === 0) {
      if (selectedCatalogUid) setSelectedCatalogUid('');
      return;
    }
    if (!catalogsForStore.some((c) => c.id === selectedCatalogUid)) {
      setSelectedCatalogUid(catalogsForStore[0].id);
    }
  }, [catalogsForStore, selectedCatalogUid]);

  const storeName = (uid?: string) =>
    (stores as any[]).find((s) => s.id === uid)?.name || (uid ? `Store ${uid.substring(0, 8)}…` : '—');
  const catalogName = (uid?: string) =>
    (catalogs as any[]).find((c) => c.id === uid)?.name || (uid ? `Catalog ${uid.substring(0, 8)}…` : '—');

  // ---- search (debounced, server-side) ------------------------------------
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const canSearch = !!selectedStoreUid && !!selectedCatalogUid && searchTerm.length >= 2;
  const { data: rawResults = [], isFetching } = useInventoryStock(
    selectedStoreUid || undefined,
    searchTerm,
    canSearch,
  );
  const results = useMemo(
    () => (rawResults as InventoryStock[]).filter((r) => r.catalogUid === selectedCatalogUid),
    [rawResults, selectedCatalogUid],
  );

  // ---- adjustment basket --------------------------------------------------
  const [draft, setDraft] = useState<DraftLine[]>([]);
  const [reason, setReason] = useState<string>(REASON_PRESETS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const inDraft = (row: InventoryStock) => draft.some((d) => d.key === draftKey(row));

  const addToDraft = (row: InventoryStock) => {
    if (inDraft(row)) return;
    setDraft((prev) => [
      ...prev,
      {
        key: draftKey(row),
        catalogItemUid: row.catalogItemUid,
        itemName: row.itemName || 'Item',
        sku: row.itemSku || '',
        batchUid: hasBatch(row.batchUid) ? row.batchUid : undefined,
        inHand: row.inHand ?? 0,
        onHold: row.onHold ?? 0,
        type: 'ADDITION',
        target: 'IN_HAND',
        quantity: 1,
      },
    ]);
  };

  const patchLine = (key: string, patch: Partial<DraftLine>) =>
    setDraft((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const removeLine = (key: string) => setDraft((prev) => prev.filter((d) => d.key !== key));

  const resultingQty = (d: DraftLine) => {
    const base = d.target === 'IN_HAND' ? d.inHand : d.onHold;
    return d.type === 'ADDITION' ? base + d.quantity : base - d.quantity;
  };

  const effectiveReason = reason === 'Other' ? customReason.trim() : reason;

  const basketStats = useMemo(() => {
    const additions = draft.filter((d) => d.type === 'ADDITION').length;
    const deductions = draft.filter((d) => d.type === 'DEDUCTION').length;
    return { lines: draft.length, additions, deductions };
  }, [draft]);

  const invalidLines = draft.filter((d) => d.quantity <= 0 || resultingQty(d) < 0);
  const canSubmit =
    draft.length > 0 && !!effectiveReason && invalidLines.length === 0 && !createAdjustment.isPending;

  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Step 1: validate, then ask for confirmation before touching stock.
  const requestSave = () => {
    if (!effectiveReason) {
      setToast({ kind: 'err', msg: 'Choose a reason for the adjustment.' });
      return;
    }
    if (draft.length === 0) return;
    if (invalidLines.length > 0) {
      setToast({ kind: 'err', msg: 'Fix the highlighted lines — quantity must be > 0 and cannot make stock negative.' });
      return;
    }
    setConfirmOpen(true);
  };

  // Step 2: user confirmed — apply the whole basket.
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setConfirmOpen(false);
    setSubmitting(true);
    let ok = 0;
    try {
      for (const d of draft) {
        await createAdjustment.mutateAsync({
          catalogItemUid: d.catalogItemUid,
          batchNumber: d.batchUid, // undefined when no real batch
          type: d.type,
          target: d.target,
          quantity: d.quantity,
          reason: effectiveReason,
          notes: notes || undefined,
        });
        ok++;
      }
      setToast({ kind: 'ok', msg: `Applied ${ok} adjustment${ok === 1 ? '' : 's'}.` });
      setDraft([]);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
    } catch (e: any) {
      setToast({ kind: 'err', msg: `Applied ${ok} of ${draft.length}. ${e?.message || 'A line failed.'}` });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- recent audit log (read-only) ---------------------------------------
  const recentLogs = useMemo(
    () =>
      (recentAdjustments as any[]).slice(0, 12).map((adj) => ({
        id: adj.uid,
        when: adj.adjustedAt
          ? new Date(adj.adjustedAt).toLocaleString('en-US', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
            })
          : '',
        type: (adj.type === 'ADDITION' ? 'ADDITION' : 'DEDUCTION') as AdjType,
        itemName: itemNameByUid[adj.itemUid] || adj.itemName || (adj.sku ? `Item (${adj.sku})` : 'Item'),
        prev: adj.previousQty ?? 0,
        next: adj.newQty ?? 0,
        target: adj.target === 'ON_HOLD' ? 'On Hold' : 'In Hand',
        reason: adj.reason || '',
        by: adj.createdByName || adj.createdBy || '',
      })),
    [recentAdjustments, itemNameByUid],
  );

  const noStores = (stores as any[]).length === 0;

  return (
    <div className="flex flex-col h-full bg-surface-50/20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100/80 py-5 px-8 flex items-center shrink-0 select-none">
        <button className="flex items-center justify-center text-slate-800 hover:text-slate-950 transition-colors mr-3 cursor-pointer">
          <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <div>
          <h1 className="text-[21px] font-black text-slate-900 tracking-tight leading-none">Stock Adjustment</h1>
          <p className="text-xs font-semibold text-surface-400 mt-1">
            Search an item, add it to the basket, then apply all adjustments at once.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col xl:flex-row gap-8 pb-32">
        {/* LEFT: work area */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Step 1 — criteria + search */}
          <div className="bg-white border border-surface-200 rounded-2xl shadow-xs p-6 text-left">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[#55349A] text-white text-xs font-black">1</span>
              <h2 className="text-[15px] font-black text-surface-900 tracking-tight">Choose location & find item</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Store */}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-surface-500 uppercase tracking-wider">Store Target</span>
                <div className="relative">
                  <select
                    value={selectedStoreUid}
                    onChange={(e) => setSelectedStoreUid(e.target.value)}
                    className="w-full appearance-none pl-4 pr-10 py-2.5 bg-[#FAF9F6] border border-surface-200 hover:border-primary-500 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/15 rounded-xl text-sm font-bold text-surface-900 outline-none transition-all cursor-pointer shadow-sm"
                  >
                    {noStores && <option value="">No stores</option>}
                    {(stores as any[]).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                </div>
              </label>

              {/* Catalog */}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-surface-500 uppercase tracking-wider">Inventory Catalog</span>
                <div className="relative">
                  <select
                    value={selectedCatalogUid}
                    onChange={(e) => setSelectedCatalogUid(e.target.value)}
                    disabled={catalogsForStore.length === 0}
                    className="w-full appearance-none pl-4 pr-10 py-2.5 bg-[#FAF9F6] border border-surface-200 hover:border-primary-500 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/15 rounded-xl text-sm font-bold text-surface-900 outline-none transition-all cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {catalogsForStore.length === 0 && <option value="">No catalog for this store</option>}
                    {catalogsForStore.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                </div>
              </label>
            </div>

            {/* Search */}
            <label className="flex flex-col gap-1.5 mt-4">
              <span className="text-xs font-bold text-surface-500 uppercase tracking-wider">Search item to adjust</span>
              <div className="relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  disabled={!selectedCatalogUid}
                  placeholder="Type item name, SKU or batch…"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#FAF9F6] border border-surface-200 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/15 rounded-xl text-sm font-bold text-surface-950 outline-none transition-all shadow-sm disabled:opacity-60"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                {isFetching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 animate-spin" />}
                {!isFetching && searchInput && (
                  <button onClick={() => setSearchInput('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-900">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </label>

            {/* Search results */}
            <div className="mt-4">
              {!canSearch ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-surface-400 px-1 py-2">
                  <Search className="h-4 w-4" />
                  Type at least 2 characters to look up items in <span className="font-bold text-surface-600">{catalogName(selectedCatalogUid)}</span>. No bulk list is loaded — only what you search.
                </div>
              ) : results.length === 0 ? (
                <div className="text-xs font-semibold text-surface-400 px-1 py-4 text-center border border-dashed border-surface-200 rounded-xl">
                  {isFetching ? 'Searching…' : `No items match “${searchTerm}” in this catalog.`}
                </div>
              ) : (
                <div className="border border-surface-200 rounded-xl divide-y divide-surface-100 overflow-hidden">
                  {results.map((row) => {
                    const added = inDraft(row);
                    return (
                      <div key={row.uid} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-50/70">
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-bold text-surface-900 truncate">{row.itemName}</div>
                          <div className="flex items-center gap-2 text-[11px] text-surface-400 font-medium mt-0.5">
                            {hasBatch(row.batchUid)
                              ? <span className="font-mono uppercase">Batch {row.batchUid!.substring(0, 8)}</span>
                              : <span className="italic">No batch</span>}
                            {row.itemSku ? <><span>·</span><span className="font-mono">{row.itemSku}</span></> : null}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-bold text-surface-400 uppercase leading-none">In hand</div>
                          <div className="text-sm font-black text-surface-800 leading-none mt-0.5">{row.inHand}</div>
                        </div>
                        <button
                          onClick={() => addToDraft(row)}
                          disabled={added}
                          className={cn(
                            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition-all shrink-0 active:scale-95',
                            added
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
                              : 'bg-[#55349A] text-white hover:bg-[#452a80]',
                          )}
                        >
                          {added ? <><CheckCircle className="h-3.5 w-3.5" /> Added</> : <><Plus className="h-3.5 w-3.5" /> Add</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Step 2 — basket */}
          <div className="bg-white border border-surface-200 rounded-2xl shadow-xs text-left flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-surface-100">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[#55349A] text-white text-xs font-black">2</span>
                <h2 className="text-[15px] font-black text-surface-900 tracking-tight">Adjustment basket</h2>
                <span className="text-[10px] font-bold bg-purple-50 text-[#55349A] px-2 py-0.5 rounded-full">{basketStats.lines}</span>
              </div>
              {draft.length > 0 && (
                <button onClick={() => setDraft([])} className="text-xs font-bold text-surface-400 hover:text-rose-600 transition-colors">
                  Clear all
                </button>
              )}
            </div>

            {draft.length === 0 ? (
              <div className="py-14 flex flex-col items-center justify-center text-center gap-2">
                <PackageOpen className="h-8 w-8 text-surface-300" />
                <div className="text-sm font-bold text-surface-500">No items added yet</div>
                <div className="text-xs font-medium text-surface-400 max-w-xs">Search above and hit <span className="font-bold text-[#55349A]">Add</span> to build up a batch of adjustments, then apply them together.</div>
              </div>
            ) : (
              <div className="divide-y divide-surface-100">
                {draft.map((d) => {
                  const result = resultingQty(d);
                  const bad = d.quantity <= 0 || result < 0;
                  return (
                    <div key={d.key} className={cn('p-4 flex flex-col gap-3', bad && 'bg-rose-50/40')}>
                      {/* row 1 — item + remove */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold text-surface-900">{d.itemName}</div>
                          <div className="text-[11px] text-surface-400 font-medium mt-0.5">
                            {d.batchUid ? <>Batch {d.batchUid.substring(0, 8)} · </> : null}
                            Current {d.target === 'IN_HAND' ? 'in hand' : 'on hold'}: <span className="font-bold text-surface-600">{d.target === 'IN_HAND' ? d.inHand : d.onHold}</span>
                          </div>
                        </div>
                        <button onClick={() => removeLine(d.key)} className="h-8 w-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-rose-600 hover:bg-rose-50 shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* row 2 — controls */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* type toggle */}
                        <div className="flex bg-surface-100 rounded-lg p-0.5 shrink-0">
                          {(['ADDITION', 'DEDUCTION'] as AdjType[]).map((t) => (
                            <button
                              key={t}
                              onClick={() => patchLine(d.key, { type: t })}
                              className={cn(
                                'px-2.5 py-1 rounded-md text-[11px] font-black uppercase transition-all',
                                d.type === t
                                  ? t === 'ADDITION' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-rose-500 text-white shadow-sm'
                                  : 'text-surface-500 hover:text-surface-800',
                              )}
                            >
                              {t === 'ADDITION' ? 'Add' : 'Deduct'}
                            </button>
                          ))}
                        </div>

                        {/* target toggle */}
                        <div className="relative shrink-0">
                          <select
                            value={d.target}
                            onChange={(e) => patchLine(d.key, { target: e.target.value as AdjTarget })}
                            className="appearance-none pl-3 pr-8 py-1.5 bg-[#FAF9F6] border border-surface-200 rounded-lg text-[11px] font-bold text-surface-700 outline-none cursor-pointer"
                          >
                            <option value="IN_HAND">In Hand</option>
                            <option value="ON_HOLD">On Hold</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400 pointer-events-none" />
                        </div>

                        {/* qty stepper */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => patchLine(d.key, { quantity: Math.max(0, d.quantity - 1) })} className="h-7 w-7 flex items-center justify-center rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-100">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={d.quantity}
                            onChange={(e) => patchLine(d.key, { quantity: Math.max(0, Number(e.target.value) || 0) })}
                            className={cn('w-16 text-center py-1.5 rounded-lg border text-sm font-black outline-none', bad ? 'border-rose-300 text-rose-600 bg-white' : 'border-surface-200 text-surface-900 bg-[#FAF9F6]')}
                          />
                          <button onClick={() => patchLine(d.key, { quantity: d.quantity + 1 })} className="h-7 w-7 flex items-center justify-center rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-100">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* result preview */}
                        <div className="ml-auto flex items-baseline gap-1.5 shrink-0">
                          <span className="text-[9px] font-bold text-surface-400 uppercase">Result</span>
                          <span className={cn('text-sm font-black', bad ? 'text-rose-600' : 'text-surface-900')}>{result}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* reason + submit footer */}
            <div className="p-6 border-t border-surface-100 bg-[#FAFAFB] rounded-b-2xl flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-surface-500 uppercase tracking-wider">Reason <span className="text-rose-500">*</span></span>
                  <div className="relative">
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full appearance-none pl-4 pr-10 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-bold text-surface-900 outline-none cursor-pointer shadow-sm"
                    >
                      {REASON_PRESETS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                  </div>
                  {reason === 'Other' && (
                    <input
                      type="text"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Describe the reason…"
                      className="mt-1 w-full px-4 py-2 bg-white border border-surface-200 rounded-xl text-sm font-semibold outline-none shadow-sm"
                    />
                  )}
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-surface-500 uppercase tracking-wider">Notes (optional)</span>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Reference / remark applied to all lines"
                    className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold outline-none shadow-sm"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="text-xs font-semibold text-surface-500">
                  {draft.length > 0 ? (
                    <>
                      <span className="font-black text-surface-800">{basketStats.lines}</span> line{basketStats.lines === 1 ? '' : 's'} ·{' '}
                      <span className="text-emerald-600 font-bold">{basketStats.additions} add</span> ·{' '}
                      <span className="text-rose-600 font-bold">{basketStats.deductions} deduct</span>
                      {invalidLines.length > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-rose-600 font-bold"><AlertCircle className="h-3.5 w-3.5" />{invalidLines.length} to fix</span>
                      )}
                    </>
                  ) : (
                    'Adjustments apply immediately once submitted.'
                  )}
                </div>
                <button
                  onClick={requestSave}
                  disabled={!canSubmit || submitting}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 shrink-0',
                    canSubmit && !submitting ? 'bg-[#55349A] text-white hover:bg-[#452a80] shadow-sm' : 'bg-surface-200 text-surface-400 cursor-not-allowed',
                  )}
                >
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><CheckCircle className="h-4 w-4" /> Save {draft.length > 0 ? `${draft.length} ` : ''}adjustment{draft.length === 1 ? '' : 's'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: guide + recent log */}
        <div className="w-full xl:w-96 shrink-0 flex flex-col gap-6 text-left">
          <div className="bg-[#FAF9F6] border border-[#ECEBE6] rounded-2xl p-6">
            <h3 className="text-sm font-bold text-surface-900 uppercase tracking-widest flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-amber-600" />
              How it works
            </h3>
            <ul className="mt-4 space-y-3.5 text-xs text-surface-600 font-semibold leading-relaxed">
              <li className="flex gap-2"><span className="text-amber-600">1.</span><span>Pick the store and inventory catalog you are correcting.</span></li>
              <li className="flex gap-2"><span className="text-amber-600">2.</span><span>Search the item — nothing loads until you do, so it stays fast.</span></li>
              <li className="flex gap-2"><span className="text-amber-600">3.</span><span>Add each item, set Add/Deduct and quantity, then apply the whole basket in one go.</span></li>
              <li className="flex gap-2"><span className="text-amber-600">✦</span><span>Deductions can’t take stock below zero. Adjustments post immediately.</span></li>
            </ul>
          </div>

          <div className="bg-white border border-surface-200 rounded-2xl shadow-xs overflow-hidden flex flex-col max-h-[560px]">
            <div className="p-5 border-b border-surface-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-surface-900 tracking-tight flex items-center gap-1.5">
                <History className="h-4 w-4 text-[#55349A]" />
                Recent Adjustments
              </h3>
              <span className="text-[10px] font-bold bg-purple-50 text-[#55349A] px-2.5 py-0.5 rounded-full">{recentLogs.length}</span>
            </div>
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {recentLogs.length === 0 ? (
                <div className="py-12 text-center text-xs font-semibold text-surface-400">No adjustments yet.</div>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-xl bg-surface-50 border border-surface-100 text-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-surface-400">{log.when}</span>
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase', log.type === 'ADDITION' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}>
                        {log.type === 'ADDITION' ? 'Addition' : 'Deduction'}
                      </span>
                    </div>
                    <div className="font-black text-surface-900 text-[13px] leading-tight">{log.itemName}</div>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold">
                      <span className="text-surface-500">{log.prev}</span>
                      <span className="text-surface-300">→</span>
                      <span className="text-surface-900">{log.next}</span>
                      <span className="text-surface-400 font-sans font-semibold">({log.target})</span>
                    </div>
                    {log.reason && <div className="text-surface-500 font-medium"><span className="font-bold text-surface-600">Reason:</span> {log.reason}</div>}
                    {log.by && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-surface-400 mt-0.5 pt-1.5 border-t border-dashed border-surface-200">
                        <User className="h-3 w-3" />
                        <span className="text-surface-600 font-bold">{log.by}</span>
                        <span className="text-surface-300">·</span>
                        <span>{log.when}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* confirmation dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/45 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-surface-200 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-surface-100 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-black text-surface-900 leading-tight">Confirm stock adjustment</h2>
                <p className="text-xs font-semibold text-surface-400 mt-1">
                  {draft.length} line{draft.length === 1 ? '' : 's'} · {storeName(selectedStoreUid)} · {catalogName(selectedCatalogUid)}
                </p>
              </div>
              <button onClick={() => setConfirmOpen(false)} className="p-1.5 hover:bg-surface-100 rounded-full text-surface-400 hover:text-surface-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-2">
              {draft.map((d) => (
                <div key={d.key} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-50 border border-surface-100">
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-surface-900 truncate">{d.itemName}</div>
                    <div className="text-[11px] text-surface-400 font-medium">
                      {d.batchUid ? <>Batch {d.batchUid.substring(0, 8)} · </> : null}{d.target === 'IN_HAND' ? 'In hand' : 'On hold'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-black uppercase', d.type === 'ADDITION' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}>
                      {d.type === 'ADDITION' ? '+' : '−'}{d.quantity}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-surface-500">{d.target === 'IN_HAND' ? d.inHand : d.onHold}</span>
                    <span className="text-surface-300">→</span>
                    <span className="text-[13px] font-mono font-black text-surface-900">{resultingQty(d)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 pb-5 pt-3 border-t border-surface-100">
              <div className="text-xs font-semibold text-surface-500 mb-3">
                <span className="font-bold text-surface-700">Reason:</span> {effectiveReason}{notes ? <> · <span className="font-bold text-surface-700">Notes:</span> {notes}</> : null}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 rounded-lg px-3 py-2 mb-4">
                <AlertCircle className="h-4 w-4 shrink-0" />
                These adjustments apply immediately and are recorded against your name.
              </div>
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setConfirmOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-bold text-surface-600 hover:bg-surface-100 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black bg-[#55349A] text-white hover:bg-[#452a80] shadow-sm transition-all active:scale-95 disabled:opacity-60"
                >
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><CheckCircle className="h-4 w-4" /> Confirm & Save</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div className={cn('fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-bold animate-in fade-in slide-in-from-bottom-2 duration-200',
          toast.kind === 'ok' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white')}>
          {toast.kind === 'ok' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default StockAdjustment;
