import React, { useState } from 'react';
import {
  ArrowLeft, ArrowUpRight, ShoppingBasket,
  Trash2, Pencil, Store, Truck, ChevronRight,
  Copy, ChevronDown, Share2, Printer, XCircle,
  X, Plus, Check, Barcode as BarcodeIcon, Wand2
} from 'lucide-react';
import { useBarcodeLabels } from '../../../services/useBarcodes';
import { useCommerceApi } from '../../../services/useCommerceApi';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import {
  usePurchase,
  usePurchaseSalesPrices,
  useSavePurchaseSalesPrices,
  type PurchaseSalesPrice,
} from '../../../services/usePurchases';
import { useItems } from '../../../services/useItems';
import { useUnits } from '../../../services/useUnits';
import { useOrderCatalogs } from '../../../services/useOrderCatalogs';

interface PurchaseDetailsProps {
  onBack: () => void;
  purchase: any;
  onStatusChange?: (status: 'Draft' | 'In Review' | 'Approved' | 'Cancelled') => void;
  onConvertToPO?: (purchase: any) => void;
}

export const PurchaseDetails = ({ onBack, purchase, onStatusChange, onConvertToPO }: PurchaseDetailsProps) => {
  const [taxBreakdownIndex, setTaxBreakdownIndex] = useState<number | null>(null);
  const [salesPriceBreakdownIndex, setSalesPriceBreakdownIndex] = useState<number | null>(null);
  const [showMoreActions, setShowMoreActions] = useState(false);

  // Price setup states
  const [selectedPriceItem, setSelectedPriceItem] = useState<any | null>(null);
  const [editingCatalogPrices, setEditingCatalogPrices] = useState<any[]>([]);
  const [savingPrices, setSavingPrices] = useState(false);
  const [priceError, setPriceError] = useState<string>('');

  const money = (v: any) =>
    Number(v ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /**
   * The list row carries no lines — usePurchases() maps only the header fields — so the
   * lines are fetched from GET /purchases/{uid}, and item/unit names resolved from the
   * catalog (PurchaseItemDto stores uids only).
   */
  const { data: full } = usePurchase(purchase?.id || '');
  const { data: catalogItems = [] } = useItems();
  const { data: units = [] } = useUnits();
  // Real order catalogs the user can price into, and any prices already saved on this purchase.
  const { data: orderCatalogs = [] } = useOrderCatalogs();
  const { data: savedPrices = [] } = usePurchaseSalesPrices(purchase?.id || '');
  const saveSalesPrices = useSavePurchaseSalesPrices(purchase?.id || '');
  const barcodeLabels = useBarcodeLabels();
  const api = useCommerceApi();
  const [generatingBarcodes, setGeneratingBarcodes] = useState(false);

  // Sales price is a post-approval action — the backend rejects it otherwise (stock has to
  // be received before it can be priced), so the button is disabled until then.
  const isApproved = purchase?.status === 'Approved';

  const fetchedItems = React.useMemo(() => {
    const itemMap = new Map(catalogItems.map((i: any) => [i.uid, i]));
    const unitMap = new Map(units.map((u: any) => [u.uid, u]));
    const catalogNameByUid = new Map(orderCatalogs.map((c: any) => [c.id, c.name]));
    // Group any already-saved sales prices by the purchase line they belong to.
    const pricesByLine = new Map<string, any[]>();
    (savedPrices as PurchaseSalesPrice[]).forEach((p) => {
      const rows = pricesByLine.get(p.purchaseItemUid) || [];
      rows.push({
        orderCatalogUid: p.orderCatalogUid,
        orderCatalogName: p.orderCatalogName || catalogNameByUid.get(p.orderCatalogUid) || 'Catalog',
        salesPrice: p.salesRate != null ? String(p.salesRate) : '',
        appliedToCatalog: p.appliedToCatalog,
      });
      pricesByLine.set(p.purchaseItemUid, rows);
    });
    return (full?.items ?? []).map((l: any, idx: number) => {
      const it: any = itemMap.get(l.itemUid);
      const un: any = unitMap.get(l.unitUid);
      const qty = Number(l.purchQty ?? l.qty ?? 0);
      const rate = Number(l.unitPrice ?? 0);
      return {
        id: l.uid || idx,
        name: it?.name || 'Unknown item',
        details: it?.sku || it?.itemNo || '',
        batch: l.batchNumber || '—',
        unit: un?.symbol || un?.name || '—',
        qty,
        baseQty: Number(l.baseQty ?? 0),
        expDate: l.expiryDate
          ? new Date(l.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—',
        mrp: l.mrp != null ? Number(l.mrp).toFixed(2) : '—',
        purchasePrice: rate.toFixed(2),
        // Discount and tax are computed server-side (PurchaseLineCalculator) and stored on
        // the line — never recomputed here, so the screen always agrees with the DB.
        discount: l.discountAmount != null && Number(l.discountAmount) > 0
          ? money(l.discountAmount) : '—',
        tax: l.taxAmount != null && Number(l.taxAmount) > 0
          ? `${money(l.taxAmount)}${l.taxPercentage ? ` (${Number(l.taxPercentage)}%)` : ''}` : '—',
        taxBreakdown: {
          cgst: Number(l.cgst ?? 0), sgst: Number(l.sgst ?? 0),
          igst: Number(l.igst ?? 0), cess: Number(l.cess ?? 0),
          cgstPct: Number(l.cgstPercentage ?? 0), sgstPct: Number(l.sgstPercentage ?? 0),
          igstPct: Number(l.igstPercentage ?? 0), cessPct: Number(l.cessPercentage ?? 0),
          taxable: Number(l.taxableAmount ?? 0),
        },
        freeQty: Number(l.freeQty ?? 0),
        netAmount: money(l.netTotal != null ? l.netTotal : qty * rate),
        catalogPrices: pricesByLine.get(l.uid) || [],
      };
    });
  }, [full?.items, catalogItems, units, orderCatalogs, savedPrices]);

  const purchaseItems = fetchedItems;

  // Methods for price configuration popup
  const openPriceModal = (item: any) => {
    setSelectedPriceItem(item);
    setEditingCatalogPrices(item.catalogPrices ? item.catalogPrices.map((p: any) => ({ ...p })) : []);
    setPriceError('');
  };

  const addPricingRow = () => {
    setEditingCatalogPrices([
      ...editingCatalogPrices,
      { orderCatalogUid: '', salesPrice: '' }
    ]);
  };

  const handleCatalogChange = (idx: number, uid: string) => {
    const updated = [...editingCatalogPrices];
    updated[idx].orderCatalogUid = uid;
    updated[idx].orderCatalogName = orderCatalogs.find((c: any) => c.id === uid)?.name || '';
    setEditingCatalogPrices(updated);
  };

  const handlePriceChange = (idx: number, price: string) => {
    const updated = [...editingCatalogPrices];
    updated[idx].salesPrice = price;
    setEditingCatalogPrices(updated);
  };

  const removePricingRow = (idx: number) => {
    setEditingCatalogPrices(editingCatalogPrices.filter((_, i) => i !== idx));
  };

  /**
   * Persist the rates and let the backend push them onto the order catalogs. The line uid is
   * the purchaseItemUid the price attaches to; salesRate is in the line's purchase unit and
   * the server converts it to the base unit before it reaches the catalog.
   */
  const saveCatalogPrices = async () => {
    if (!selectedPriceItem) return;
    const clean = editingCatalogPrices.filter(cp => cp.orderCatalogUid && Number(cp.salesPrice) > 0);
    if (clean.length === 0) {
      setPriceError('Pick a catalog and enter a sales price greater than zero.');
      return;
    }
    const seen = new Set<string>();
    for (const cp of clean) {
      if (seen.has(cp.orderCatalogUid)) {
        setPriceError('The same catalog is listed twice — one price per catalog.');
        return;
      }
      seen.add(cp.orderCatalogUid);
    }
    const payload: PurchaseSalesPrice[] = clean.map(cp => ({
      purchaseItemUid: selectedPriceItem.id,
      orderCatalogUid: cp.orderCatalogUid,
      salesRate: Number(cp.salesPrice),
    }));
    setSavingPrices(true);
    setPriceError('');
    try {
      await saveSalesPrices.mutateAsync(payload);
      setSelectedPriceItem(null);
    } catch (e: any) {
      setPriceError(e?.message || 'Could not save the sales prices. Please try again.');
    } finally {
      setSavingPrices(false);
    }
  };

  /**
   * Header totals as stored by the server. They are rolled up from the lines on every write,
   * so reading them back keeps the bill panel identical to what finance and the printed
   * document will show. Falls back to summing the lines only for pre-migration purchases.
   */
  const billDetails = React.useMemo(() => {
    const sum = (f: string) => fetchedItems.reduce((a: number, i: any) => a + Number(i[f] ?? 0), 0);
    const grossFallback = fetchedItems.reduce(
      (a: number, i: any) => a + i.qty * parseFloat(i.purchasePrice || '0'), 0
    );
    const n = (v: any, fb = 0) => (v != null ? Number(v) : fb);
    return {
      totalQuantity: n(full?.netQty, fetchedItems.reduce((a: number, i: any) => a + i.qty, 0)),
      freeQuantity: n(full?.totalFreeQty, sum('freeQty')),
      grossAmount: n(full?.totalGrossAmount, grossFallback),
      discountAmount: n(full?.totalDiscountAmount),
      taxableAmount: n(full?.totalTaxableAmount, grossFallback),
      taxAmount: n(full?.totalTaxAmount),
      cgst: n(full?.totalCgst),
      sgst: n(full?.totalSgst),
      igst: n(full?.totalIgst),
      cess: n(full?.totalCess),
      roundOff: n(full?.roundOff, Math.round(grossFallback) - grossFallback),
      netBillAmount: n(full?.totalNetAmount, grossFallback) + n(full?.roundOff),
      supplyType: full?.supplyType || 'INTRA_STATE',
    };
  }, [fetchedItems, full]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
      {/* Dedicate Navigation Bar */}
      <div className="bg-white border-b border-surface-100 px-8 py-4 flex items-center gap-4 sticky top-0 z-[50] shadow-sm print:hidden">
        <button
          onClick={onBack}
          className="p-1 hover:bg-surface-50 rounded-lg transition-colors cursor-pointer group"
        >
          <ArrowLeft className="h-5 w-5 text-surface-900 group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <h1 className="text-[17px] font-black text-surface-900 uppercase tracking-tight">Purchase Details</h1>
      </div>

      <div className="flex-1 p-8 pt-6 pb-40 space-y-6">
        {/* Print-only document title (on-screen nav is hidden when printing) */}
        <div className="hidden print:block mb-2">
          <h1 className="text-2xl font-black uppercase tracking-tight text-surface-900">
            {purchase.status === 'In Review' || purchase.status === 'Requested' ? 'Purchase Request' : 'Purchase'}
          </h1>
          <p className="text-sm font-semibold text-surface-500">#{purchase.orderNo || 'N/A'} · {purchase.date || ''}</p>
        </div>
        {/* Merged Header & Info Section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          // clip-fix: dropped overflow-hidden — it clipped the header actions menu + per-row menus (z-50); rounded+border keep corners
          className="bg-white rounded-2xl border border-surface-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
        >
          {/* Top Management Row */}
          <div className="px-6 py-3.5 border-b border-surface-50 flex items-center justify-between bg-[#F8F9FA]/40">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest leading-none mb-1">Purchase ID</span>
                <span className="text-[16px] font-black text-[#55349A] leading-none">#{purchase.orderNo || '356713'}</span>
              </div>

              {purchase.status === 'Approved' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#E7F7EF] text-[#0A874F] rounded-xl text-[9px] font-black uppercase tracking-widest border border-[#D1F0E0]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0A874F]" />
                  Approved
                </span>
              ) : purchase.status === 'In Review' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FDF2E9] text-[#AD6A34] rounded-xl text-[9px] font-black uppercase tracking-widest border border-[#FBE5D3]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#AD6A34]" />
                  In Review
                </span>
              ) : purchase.status === 'Requested' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#EFEBFA] text-[#55349A] rounded-xl text-[9px] font-black uppercase tracking-widest border border-[#DED4F3]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#55349A]" />
                  Requested
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#F1F5F9] text-[#475569] rounded-xl text-[9px] font-black uppercase tracking-widest border border-[#E2E8F0]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#475569]" />
                  Draft
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 print:hidden">
              {purchase.status === 'Requested' && (
                <button
                  onClick={() => onConvertToPO?.(purchase)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[12px] font-black shadow-md hover:shadow-green-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  Convert to Purchase Order
                </button>
              )}
              <button className="flex items-center gap-2 px-3.5 py-2 bg-white border border-surface-200 rounded-xl text-[12px] font-black text-surface-900 hover:bg-surface-50 transition-all shadow-sm">
                <Copy className="h-4 w-4 text-surface-400" />
                Duplicate
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowMoreActions(!showMoreActions)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1A1D1F] rounded-xl text-[12px] font-black text-white hover:bg-[#2A2E31] transition-all shadow-lg"
                >
                  Actions
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </button>

                <AnimatePresence>
                  {showMoreActions && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMoreActions(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-[180px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-surface-100 z-50 overflow-hidden py-2"
                      >
                        <button
                          onClick={async () => {
                            setShowMoreActions(false);
                            const label = purchase.status === 'In Review' || purchase.status === 'Requested' ? 'Purchase Request' : 'Purchase';
                            const summary = `${label} #${purchase.orderNo || ''} — ${purchase.from?.name || ''} → ${purchase.to?.name || ''}`;
                            try {
                              if (navigator.share) await navigator.share({ title: label, text: summary });
                              else { await navigator.clipboard.writeText(summary); alert('Copied to clipboard:\n' + summary); }
                            } catch { /* user dismissed share sheet */ }
                          }}
                          className="w-full px-4 py-2 flex items-center gap-3 text-[12px] font-bold text-surface-600 hover:bg-surface-50 transition-colors text-left">
                          <Share2 className="h-4 w-4 opacity-70" /> Share
                        </button>
                        <button
                          onClick={() => { setShowMoreActions(false); setTimeout(() => window.print(), 80); }}
                          className="w-full px-4 py-2 flex items-center gap-3 text-[12px] font-bold text-surface-600 hover:bg-surface-50 transition-colors text-left border-t border-surface-50">
                          <Printer className="h-4 w-4 opacity-70" /> Print Bill
                        </button>
                        <button
                          onClick={async () => {
                            setShowMoreActions(false);
                            const itemUids = (full?.items || []).map((it: any) => it.itemUid).filter(Boolean);
                            if (itemUids.length === 0) {
                              alert('No item lines found to print barcodes.');
                              return;
                            }
                            try {
                              await barcodeLabels.renderAndDownload({
                                catalogItemUids: itemUids,
                                outputFormat: 'PDF',
                                showPrice: true,
                                showBatchInfo: true,
                              });
                            } catch (err: any) {
                              alert(err?.message || 'Failed to print barcode labels');
                            }
                          }}
                          className="w-full px-4 py-2 flex items-center gap-3 text-[12px] font-bold text-purple-700 hover:bg-purple-50 transition-colors text-left border-t border-surface-50">
                          <BarcodeIcon className="h-4 w-4 opacity-70" /> Print Barcodes (PDF)
                        </button>
                        <button
                          disabled={generatingBarcodes}
                          onClick={async () => {
                            setShowMoreActions(false);
                            if (!purchase?.id) return;
                            try {
                              setGeneratingBarcodes(true);
                              await api.post(`/v1/api/tenant/barcodes/purchases/${purchase.id}/generate?overwriteExisting=false`, {});
                              alert('Unique internal EAN-13 barcodes successfully generated for all items in this purchase!');
                            } catch (err: any) {
                              alert(err?.message || 'Failed to auto-generate barcodes');
                            } finally {
                              setGeneratingBarcodes(false);
                            }
                          }}
                          className="w-full px-4 py-2 flex items-center gap-3 text-[12px] font-bold text-purple-700 hover:bg-purple-50 transition-colors text-left border-t border-surface-50">
                          <Wand2 className="h-4 w-4 opacity-70" /> Auto-Generate Barcodes
                        </button>
                        <button
                          onClick={() => {
                            setShowMoreActions(false);
                            if (window.confirm(`Cancel purchase #${purchase.orderNo || ''}? This cannot be undone.`)) onStatusChange?.('Cancelled');
                          }}
                          className="w-full px-4 py-2 flex items-center gap-3 text-[12px] font-bold text-red-600 hover:bg-red-50 transition-colors text-left border-t border-surface-50"
                        >
                          <XCircle className="h-4 w-4 opacity-70" /> Cancel Purchase
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Flow & Info Content Row */}
          <div className="p-8 flex items-center justify-between bg-white">
            <div className="flex items-start gap-8">
              <div className="flex flex-col gap-2 p-6 bg-[#F8F9FA] border border-surface-50 rounded-2xl min-w-[300px] shadow-sm">
                 <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1">Vendor Details</span>
                 <span className="text-[18px] font-black text-surface-900 uppercase tracking-tight">
                   {purchase.from?.name || 'Unknown Vendor'}
                 </span>
                 <span className="text-[12px] font-bold text-surface-400">
                   {purchase.from?.id || '#-'}
                 </span>
              </div>

              <div className="flex items-center self-center py-4">
                 <div className="w-14 h-px border-t border-dashed border-surface-200" />
                 <div className="bg-white border text-surface-100 rounded-full p-4 shadow-md shrink-0 border-surface-50">
                    <Truck className="h-5 w-5 text-surface-400" strokeWidth={2.5} />
                 </div>
                 <div className="w-14 h-px border-t border-dashed border-surface-200" />
              </div>

              <div className="flex flex-col gap-2 p-6 bg-[#F8F9FA] border border-surface-50 rounded-2xl min-w-[300px] shadow-sm">
                 <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1">Destination</span>
                 <span className="text-[18px] font-black text-surface-900 tracking-tight">
                   {purchase.to?.name || 'Unknown Store'}
                 </span>
                 <span className="text-[12px] font-bold text-surface-400 uppercase tracking-tight truncate max-w-[280px]">
                   {purchase.catalog || '-'}
                 </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 min-w-[300px]">
              <div className="px-6 py-3 bg-[#F8F9FA] border border-surface-50 rounded-xl flex items-center justify-between shadow-sm">
                <span className="text-[10px] text-surface-400 font-bold uppercase tracking-widest">Bill Number:</span>
                <span className="text-[14px] font-black text-surface-900">
                  {purchase.billNo ? `#${purchase.billNo}` : '-'}
                </span>
              </div>
              <div className="px-6 py-3 bg-[#F8F9FA] border border-surface-50 rounded-xl flex items-center justify-between shadow-sm">
                <span className="text-[10px] text-surface-400 font-bold uppercase tracking-widest">Date:</span>
                <span className="text-[14px] font-black text-surface-900">
                  {purchase.date || '-'}
                </span>
              </div>
            </div>
          </div>

          {purchase.note && (
            <div className="px-8 pb-8 pt-2 text-left">
              <span className="text-[11px] font-bold text-[#8FA3C7] uppercase tracking-wider block mb-3">
                Purchase Note
              </span>
              <div className="w-full px-6 py-5 bg-[#F8F9FB]/80 border border-slate-200/60 rounded-[14px] text-[13px] font-semibold text-slate-700 leading-relaxed">
                {purchase.note}
              </div>
            </div>
          )}
        </motion.div>

        {/* Items Section - Full Width */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="px-6 py-5 border-b border-surface-50 bg-white">
            <h2 className="text-[15px] font-black text-surface-900 uppercase tracking-tight">Items/Products</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-50/30 border-b border-surface-100">
                  <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest min-w-[250px]">Item Details</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center whitespace-nowrap">Quantity</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center whitespace-nowrap">Expires</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center whitespace-nowrap">MRP (₹)</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center whitespace-nowrap">Pur. Price (₹)</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center whitespace-nowrap">Sales Price (₹)</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center whitespace-nowrap">Disc. (₹)</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center whitespace-nowrap">Tax%</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-right whitespace-nowrap" style={{ paddingRight: '48px' }}>Net. Amount(₹)</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {purchaseItems.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-[13px] font-semibold text-surface-400">
                      {full ? 'This purchase has no line items.' : 'Loading items…'}
                    </td>
                  </tr>
                )}
                {purchaseItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-surface-50/20 transition-colors align-top">
                    <td className="py-5 px-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-surface-100 bg-[#F9FAFB] shrink-0 grid place-items-center">
                           {item.image
                             ? <img src={item.image} className="w-full h-full object-cover" />
                             : <ShoppingBasket className="h-5 w-5 text-surface-300" />}
                        </div>
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-black text-surface-900 leading-tight truncate">{item.name}</span>
                            <span className="text-[12px] text-surface-400 font-bold whitespace-nowrap">{item.details}</span>
                          </div>
                          {(() => {
                            // Batch is optional and the unit may be unresolved — omit the
                            // empty halves instead of rendering "Batch — - —".
                            const parts = [
                              item.batch && item.batch !== '—' ? `Batch ${item.batch}` : null,
                              item.unit && item.unit !== '—' ? item.unit : null,
                            ].filter(Boolean);
                            if (!parts.length) return null;
                            return (
                              <div className="px-2.5 py-1 bg-[#F4F1FD] border border-[#DED4F3] rounded text-[10px] font-black text-[#55349A] w-fit whitespace-nowrap uppercase tracking-wider">
                                {parts.join(' · ')}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-center">
                      <span className="text-[13px] font-extrabold text-surface-700">
                        {item.qty}{item.freeQty > 0 ? ` + ${item.freeQty} free` : ''}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-center whitespace-nowrap">
                      <span className="text-[13px] font-extrabold text-[#1A1D1F]">{item.expDate}</span>
                    </td>
                    <td className="py-5 px-6 text-center">
                      <span className="text-[13px] font-extrabold text-surface-700">{item.mrp}</span>
                    </td>
                    <td className="py-5 px-6 text-center">
                      <span className="text-[13px] font-extrabold text-surface-700">{item.purchasePrice}</span>
                    </td>
                    <td className="py-5 px-6 text-center">
                      <div className="flex flex-col items-center relative gap-1.5">
                        <button
                          onClick={() => setSalesPriceBreakdownIndex(salesPriceBreakdownIndex === idx ? null : idx)}
                          className="flex items-center gap-0.5 text-[11px] font-black text-[#55349A] hover:underline uppercase tracking-tight whitespace-nowrap mt-0.5 cursor-pointer"
                        >
                          View Sales Price
                          <ArrowUpRight className="h-3 w-3" strokeWidth={3} />
                        </button>

                        <AnimatePresence>
                          {salesPriceBreakdownIndex === idx && (
                            <>
                              <div className="fixed inset-0 z-[40]" onClick={() => setSalesPriceBreakdownIndex(null)} />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute left-1/2 -translate-x-1/2 top-7 w-[240px] bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-surface-100 z-[50] overflow-hidden text-left"
                              >
                                <div className="px-5 py-4 border-b border-surface-50 bg-[#F8FAFC]">
                                  <h3 className="text-[13px] font-black text-[#1A1D1F] uppercase tracking-wide">Sales Prices</h3>
                                </div>
                                <div className="p-5 space-y-4 max-h-[220px] overflow-y-auto">
                                  {item.catalogPrices && item.catalogPrices.length > 0 ? (
                                    item.catalogPrices.map((cp: any, cpIdx: number) => (
                                      <div key={cpIdx} className="flex items-center justify-between gap-2">
                                        <span className="text-[12px] font-bold text-[#6F767E] uppercase truncate block max-w-[130px]" title={cp.orderCatalogName}>
                                          {cp.orderCatalogName}
                                        </span>
                                        <span className="text-[13px] font-black text-surface-900 shrink-0">
                                          ₹{parseFloat(cp.salesPrice || '0').toFixed(2)}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-center text-surface-400 text-[12px] font-medium py-2">
                                      No assigned prices
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-center">
                      <span className="text-[13px] font-extrabold text-surface-700">{item.discount}</span>
                    </td>
                    <td className="py-5 px-6 text-center">
                      <div className="flex flex-col items-center relative gap-1.5">
                        <span className="text-[13px] font-extrabold text-surface-700">{item.tax}</span>
                        <button
                          onClick={() => setTaxBreakdownIndex(taxBreakdownIndex === idx ? null : idx)}
                          className="flex items-center gap-0.5 text-[11px] font-black text-[#55349A] hover:underline uppercase tracking-tight whitespace-nowrap mt-0.5"
                        >
                          Tax Breakdown
                          <ArrowUpRight className="h-3 w-3" strokeWidth={3} />
                        </button>

                        <AnimatePresence>
                          {taxBreakdownIndex === idx && (
                            <>
                              <div className="fixed inset-0 z-[40]" onClick={() => setTaxBreakdownIndex(null)} />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, x: 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95, x: 20 }}
                                className="absolute right-[-40px] top-0 w-[240px] bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-surface-100 z-[50] overflow-hidden text-left"
                              >
                                <div className="px-5 py-4 border-b border-surface-50 bg-[#F8FAFC]">
                                  <h3 className="text-[14px] font-black text-[#1A1D1F]">Tax Breakdown</h3>
                                </div>
                                <div className="p-5 space-y-4">
                                  {/* Per-line split as stored on the purchase line by the server. */}
                                  {(billDetails.supplyType === 'INTER_STATE'
                                    ? [['IGST', item.taxBreakdown?.igst, item.taxBreakdown?.igstPct]]
                                    : [['CGST', item.taxBreakdown?.cgst, item.taxBreakdown?.cgstPct],
                                       ['SGST', item.taxBreakdown?.sgst, item.taxBreakdown?.sgstPct]]
                                  ).map(([label, amt, pct]: any) => (
                                    <div key={label} className="flex items-center justify-between">
                                      <span className="text-[12px] font-bold text-[#6F767E] uppercase">
                                        {label}{pct ? ` ${pct}%` : ''}
                                      </span>
                                      <span className="text-[13px] font-black text-surface-900">₹ {money(amt)}</span>
                                    </div>
                                  ))}
                                  <div className="flex items-center justify-between">
                                    <span className="text-[12px] font-bold text-[#6F767E] uppercase">
                                      CESS{item.taxBreakdown?.cessPct ? ` ${item.taxBreakdown.cessPct}%` : ''}
                                    </span>
                                    <span className="text-[13px] font-black text-surface-900">₹ {money(item.taxBreakdown?.cess)}</span>
                                  </div>
                                  <div className="pt-4 border-t border-dashed border-surface-100 flex items-center justify-between">
                                    <span className="text-[12px] font-bold text-[#6F767E] uppercase tracking-tight">Taxable amount(₹)</span>
                                    <span className="text-[14px] font-black text-[#1A1D1F]">₹ {money(item.taxBreakdown?.taxable)}</span>
                                  </div>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-right font-black text-surface-900 text-[15px]" style={{ paddingRight: '48px' }}>
                      {item.netAmount}
                    </td>
                    <td className="py-5 px-6 text-center">
                      <button
                        onClick={() => openPriceModal(item)}
                        disabled={!isApproved}
                        title={isApproved ? 'Set sales price' : 'Approve the purchase to receive stock before pricing it'}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-black uppercase transition-all shadow-sm',
                          isApproved
                            ? 'bg-[#55349A] text-white hover:bg-opacity-90 active:scale-95 shadow-primary-500/10 cursor-pointer'
                            : 'bg-surface-100 text-surface-400 cursor-not-allowed'
                        )}
                      >
                        <Pencil className="h-3 w-3" strokeWidth={3} />
                        Sales Price
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bill Details Section - Full & Precise */}
        <div className="flex justify-end pt-4">
          <div className="w-full max-w-[420px]">
            <div className="bg-white rounded-2xl border border-surface-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
              <div className="px-6 py-5 border-b border-surface-50 bg-white">
                <h2 className="text-[16px] font-black text-surface-900 uppercase tracking-tight">Bill Details</h2>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-surface-400 uppercase tracking-widest">Total quantity</span>
                  <span className="text-[15px] text-surface-900 font-black">{billDetails.totalQuantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-surface-400 uppercase tracking-widest">Gross amount</span>
                  <span className="text-[15px] text-surface-900 font-black">₹{billDetails.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-surface-400 uppercase tracking-widest">Discount</span>
                  <span className="text-[15px] text-surface-900 font-black">
                    {billDetails.discountAmount > 0 ? `− ₹${money(billDetails.discountAmount)}` : '₹0.00'}
                  </span>
                </div>
                {/*
                  INTRA_STATE bills split GST into CGST+SGST; INTER_STATE charges IGST. Only
                  the applicable pair is shown so the panel matches the vendor's bill.
                */}
                {(billDetails.supplyType === 'INTER_STATE'
                  ? [['IGST', billDetails.igst]]
                  : [['CGST', billDetails.cgst], ['SGST', billDetails.sgst]]
                ).map(([label, val]: any) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-surface-400 uppercase tracking-widest">{label}(₹)</span>
                    <span className="text-[15px] text-surface-900 font-black">₹{money(val)}</span>
                  </div>
                ))}
                {billDetails.cess > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-surface-400 uppercase tracking-widest">CESS(₹)</span>
                    <span className="text-[15px] text-surface-900 font-black">₹{money(billDetails.cess)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-surface-400 uppercase tracking-widest">Taxable amount(₹)</span>
                  <span className="text-[15px] text-surface-900 font-black">₹{billDetails.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-surface-400 uppercase tracking-widest">Round Off</span>
                  <div className="flex items-center gap-0 w-[160px] bg-surface-50 border border-surface-100 rounded-xl overflow-hidden shrink-0 shadow-inner">
                    <div className="px-3 py-2 bg-surface-100 border-r border-surface-100 text-[13px] font-black text-surface-400">₹</div>
                    <div className="flex-1 px-4 py-2 text-right text-[15px] font-black text-surface-900">
                      {billDetails.roundOff.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="pt-8 mt-4 border-t border-dashed border-surface-200 flex items-center justify-between text-[#1A1D1F]">
                  <span className="text-[16px] font-black uppercase tracking-widest">Net Bill Amount(₹)</span>
                  <span className="text-[28px] font-black tracking-tight">₹{billDetails.netBillAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      {purchase.status !== 'Approved' && (
        <div className="fixed bottom-0 right-0 left-0 bg-white/80 backdrop-blur-md border-t border-surface-200 px-8 py-5 flex items-center justify-end gap-4 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.02)] z-30 print:hidden">
          <button
            onClick={onBack}
            className="px-6 py-2.5 text-sm font-black text-surface-500 hover:text-surface-900 transition-colors"
          >
            Cancel
          </button>

          {purchase.status === 'In Review' ? (
            <>
              <button
                onClick={() => { if (window.confirm('Reject this purchase? This cannot be undone.')) onStatusChange?.('Cancelled'); }}
                className="px-10 py-3 bg-[#DA2828] text-white rounded-xl text-[13px] font-black hover:bg-opacity-90 transition-all shadow-md active:scale-95"
              >
                Reject Purchase
              </button>
              <button
                onClick={() => { if (window.confirm(`Approve purchase #${purchase.orderNo || ''}? This will receive the stock into inventory.`)) onStatusChange?.('Approved'); }}
                className="px-12 py-3 bg-[#3B807A] text-white rounded-xl text-[13px] font-black hover:bg-opacity-90 transition-all shadow-md active:scale-95"
              >
                Approve Purchase
              </button>
            </>
          ) : (
            <button
              onClick={() => onStatusChange?.('In Review')}
              className="px-12 py-3 bg-[#55349A] text-white rounded-xl text-[13px] font-black hover:bg-opacity-90 transition-all shadow-lg active:scale-95"
            >
              Create & Send Purchase
            </button>
          )}
        </div>
      )}

      {/* Sales Price Setup Popup Modal */}
      <AnimatePresence>
        {selectedPriceItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop wrapper */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPriceItem(null)}
              className="absolute inset-0 bg-surface-900/60 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border border-surface-100 shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-surface-100 bg-surface-50/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 font-sans">
                  <div className="h-9 w-9 bg-primary-100 rounded-xl flex items-center justify-center text-[#55349A]">
                     <Store className="h-5 w-5" />
                  </div>
                  <div className="text-left animate-in fade-in">
                    <h3 className="text-[17px] font-black text-surface-950 uppercase tracking-tight">Sales Price Setup</h3>
                    <p className="text-[11px] text-surface-400 font-bold uppercase tracking-wider mt-0.5">Configure pricing across multiple order catalogs</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPriceItem(null)}
                  className="p-1.5 hover:bg-surface-100 rounded-lg text-surface-400 hover:text-surface-900 transition-all cursor-pointer"
                >
                  <X className="h-5 w-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Product Detail Card */}
                <div className="p-5 bg-surface-50 border border-surface-100 rounded-2xl flex items-start gap-4">
                  <div className="h-16 w-16 bg-white border border-surface-150 rounded-xl overflow-hidden shrink-0 shadow-sm grid place-items-center">
                    {selectedPriceItem.image
                      ? <img src={selectedPriceItem.image} className="w-full h-full object-cover" />
                      : <ShoppingBasket className="h-6 w-6 text-surface-300" />}
                  </div>
                  <div className="flex-1 space-y-3 text-left">
                    <div>
                      <h4 className="text-[15px] font-black text-surface-900 leading-tight">{selectedPriceItem.name}</h4>
                      <p className="text-xs font-bold text-surface-400 uppercase mt-1 tracking-wider">{selectedPriceItem.details}</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-dashed border-surface-200">
                      <div>
                        <span className="block text-[10px] text-surface-400 font-bold uppercase tracking-widest">Batch</span>
                        <span className="text-[13px] font-extrabold text-surface-800">{selectedPriceItem.batch}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-surface-400 font-bold uppercase tracking-widest">Quantity</span>
                        <span className="text-[13px] font-extrabold text-surface-800">{selectedPriceItem.qty} {selectedPriceItem.unit}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-surface-400 font-bold uppercase tracking-widest">MRP</span>
                        <span className="text-[13px] font-extrabold text-surface-800">₹{selectedPriceItem.mrp}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-surface-400 font-bold uppercase tracking-widest">Pur. Price</span>
                        <span className="text-[13px] font-extrabold text-[#55349A]">₹{selectedPriceItem.purchasePrice}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Catalog Sales Prices Configuration Area */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[12px] font-black text-surface-500 uppercase tracking-widest text-left">Catalog Assignments & Sale Prices</h5>
                    <button
                      type="button"
                      onClick={addPricingRow}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black uppercase text-[#55349A] hover:bg-primary-50 rounded-lg transition-colors border border-primary-100 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                      Add Catalog Price
                    </button>
                  </div>

                  {editingCatalogPrices.length === 0 ? (
                    <div className="p-8 text-center bg-[#F8F9FA]/45 border border-dashed border-surface-200 rounded-2xl">
                      <p className="text-[13px] font-bold text-surface-400">No catalog pricing has been assigned to this product yet.</p>
                      <button
                        type="button"
                        onClick={addPricingRow}
                        className="mt-3 inline-flex items-center gap-1 px-4 py-2 bg-[#55349A] text-white rounded-lg text-xs font-black uppercase hover:bg-opacity-95 transition-all active:scale-95 shadow-md cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        Create Assignment Row
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-surface-150 rounded-2xl bg-white shadow-xs">
                      <table className="w-full border-collapse text-left text-xs min-w-[500px]">
                        <thead>
                          <tr className="bg-surface-50 border-b border-surface-150 text-[10px] text-surface-400 font-extrabold uppercase tracking-widest select-none">
                            <th className="py-3 px-4 text-left">Order Catalog</th>
                            <th className="py-3 px-4 text-center">Purchase Price</th>
                            <th className="py-3 px-4 text-left">Sales Price(₹)</th>
                            <th className="py-3 px-4 text-center w-16">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100">
                          {editingCatalogPrices.map((row, idx) => (
                            <tr key={idx} className="hover:bg-surface-50/40">
                              {/* Order Catalog Selector — real catalogs from the tenant */}
                              <td className="py-4 px-4">
                                <select
                                  value={row.orderCatalogUid || ''}
                                  onChange={(e) => handleCatalogChange(idx, e.target.value)}
                                  className="w-full max-w-[220px] px-2.5 py-1.5 bg-white border border-surface-200 rounded-lg text-xs font-semibold text-surface-800 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-colors cursor-pointer"
                                >
                                  <option value="">Select catalog…</option>
                                  {orderCatalogs.map((cat: any) => (
                                    <option key={cat.id} value={cat.id}>
                                      {cat.name}{cat.store ? ` · ${cat.store}` : ''}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* Purchase Price Display */}
                              <td className="py-4 px-4 text-center font-bold text-surface-500">
                                ₹{parseFloat(selectedPriceItem.purchasePrice).toFixed(2)}
                              </td>

                              {/* Sales Price Input */}
                              <td className="py-4 px-4">
                                <div className="relative w-36">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-surface-400">₹</span>
                                  <input
                                    type="text"
                                    placeholder="0.00"
                                    value={row.salesPrice}
                                    onChange={(e) => handlePriceChange(idx, e.target.value)}
                                    className="w-full pl-6 pr-3 py-1.5 bg-white border border-surface-200 rounded-lg text-xs font-black text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all"
                                  />
                                </div>
                              </td>

                              {/* Delete Action */}
                              <td className="py-4 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => removePricingRow(idx)}
                                  className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100 cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-5 border-t border-surface-100 bg-surface-50/50 flex items-center justify-between gap-3 shrink-0">
                <span className="text-[11px] font-bold text-red-600 text-left max-w-[300px]">{priceError}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedPriceItem(null)}
                    disabled={savingPrices}
                    className="px-5 py-2.5 rounded-xl text-xs font-black uppercase text-surface-500 hover:text-surface-900 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveCatalogPrices}
                    disabled={savingPrices}
                    className="px-6 py-2.5 bg-[#55349A] text-white rounded-xl text-xs font-black uppercase hover:bg-opacity-95 transition-all shadow-md active:scale-95 shadow-primary-500/10 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingPrices ? 'Saving…' : 'Save & Apply to Catalog'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
