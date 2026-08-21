import React, { useMemo, useState } from 'react';
import { ArrowLeft, Printer, Share2, ChevronDown, ArrowRight } from 'lucide-react';
import { usePurchaseOrder, usePurchaseOrderEntries } from '../../../services/usePurchaseOrders';
import { useVendors } from '../../../services/useVendors';
import { useStoresForLookup, useStores } from '../../../services/useStores';
import { useItems } from '../../../services/useItems';
import { useUnits } from '../../../services/useUnits';

/**
 * Purchase Request (backend Purchase Order) details — the read view of a raised request,
 * with the full vendor and ship-to blocks, ordered/received/pending per line, the goods
 * receipts booked against it, and a print document.
 *
 * Layout follows the "Purchase Order" Claude Design (claude.ai/design project
 * cc011e36-e1c9-4738-b2b9-0e683ca82d41). The design's per-line Discount %, Tax %, Taxable
 * and CGST/SGST columns are intentionally absent: purchase_order_item_tbl stores only
 * unitPrice and mrp, so there is nothing to populate them with and printing invented tax
 * figures on a vendor-facing document would be wrong.
 */

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
  SENT: 'bg-[#EFEBFA] text-[#55349A] border-[#DED4F3]',
  PARTIALLY_RECEIVED: 'bg-[#FDF2E9] text-[#AD6A34] border-[#FBE5D3]',
  RECEIVED: 'bg-[#E7F7EF] text-[#0A874F] border-[#D1F0E0]',
  CLOSED: 'bg-[#E7F7EF] text-[#0A874F] border-[#D1F0E0]',
  CANCELLED: 'bg-[#FEECEC] text-[#C0392B] border-[#F8D7D3]',
};

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const twoDigit = (n: number) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''));
const threeDigit = (n: number) =>
  (n > 99 ? ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' : '') : '') + (n % 100 ? twoDigit(n % 100) : '');

/** Indian numbering (crore / lakh / thousand) — used for the printed amount in words. */
function inWords(amount: number): string {
  let n = Math.round(amount);
  if (!n) return 'Zero Rupees only';
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(threeDigit(crore) + ' Crore');
  if (lakh) parts.push(threeDigit(lakh) + ' Lakh');
  if (thousand) parts.push(threeDigit(thousand) + ' Thousand');
  if (n) parts.push(threeDigit(n));
  return parts.join(' ') + ' Rupees only';
}

const money = (n: number) =>
  (Math.round(n * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtyFmt = (n: number) => Number(Math.round(n * 1000) / 1000).toLocaleString('en-IN');
const dateFmt = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

interface Props {
  poUid: string;
  onBack: () => void;
  /** Opens the goods-receipt screen for this PO. Hidden when the PO cannot be received against. */
  onReceive?: (poUid: string) => void;
}

export const PurchaseRequestDetails = ({ poUid, onBack, onReceive }: Props) => {
  const [showActions, setShowActions] = useState(false);
  const { data: po, isLoading } = usePurchaseOrder(poUid);
  const { data: entries = [] } = usePurchaseOrderEntries(poUid);
  const { data: vendors = [] } = useVendors();
  const { data: stores = [] } = useStoresForLookup();
  const { data: allStores = [] } = useStores();
  const { data: items = [] } = useItems();
  const { data: units = [] } = useUnits();

  const vendor = useMemo(
    () => vendors.find((v: any) => v.uid === po?.vendorUid || v.id === po?.vendorUid),
    [vendors, po?.vendorUid]
  );
  const store = useMemo(
    () => {
      const match = (stores as any[]).find((s: any) => s.id === po?.toStoreUid || s.uid === po?.toStoreUid || s.id === po?.storeUid || s.uid === po?.storeUid)
        || (allStores as any[]).find((s: any) => s.id === po?.toStoreUid || s.uid === po?.toStoreUid || s.id === po?.storeUid || s.uid === po?.storeUid);
      return match || (po?.storeName ? { name: po.storeName } : (stores[0] || allStores[0] || null));
    },
    [stores, allStores, po?.toStoreUid, po?.storeUid, po?.storeName]
  );

  const lines = useMemo(() => {
    const itemMap = new Map(items.map((i: any) => [i.uid, i]));
    const unitMap = new Map(units.map((u: any) => [u.uid, u]));
    return (po?.items ?? []).map((l: any, idx: number) => {
      const it: any = itemMap.get(l.itemUid);
      const un: any = unitMap.get(l.unitUid);
      const ordered = Number(l.orderedQty ?? 0);
      const received = Number(l.receivedQty ?? 0);
      const pending = Number(l.pendingQty ?? Math.max(0, ordered - received));
      const rate = Number(l.unitPrice ?? 0);
      return {
        n: idx + 1,
        key: l.uid || idx,
        name: it?.name || 'Unknown item',
        sku: it?.sku || it?.itemNo || '—',
        unit: un?.symbol || un?.name || '—',
        baseOrdered: Number(l.baseOrderedQty ?? 0),
        ordered, received, pending, rate,
        mrp: l.mrp != null ? Number(l.mrp) : null,
        amount: ordered * rate,
      };
    });
  }, [po?.items, items, units]);

  const totals = useMemo(() => {
    const subTotal = lines.reduce((a, l) => a + l.amount, 0);
    const orderedQty = lines.reduce((a, l) => a + l.ordered, 0);
    const receivedQty = lines.reduce((a, l) => a + Math.min(l.received, l.ordered), 0);
    // The stored header total wins when present — it is what the vendor was sent.
    const grand = po?.totalAmount != null ? Number(po.totalAmount) : subTotal;
    return {
      subTotal, orderedQty, grand,
      roundOff: Math.round(grand) - grand,
      pct: orderedQty > 0 ? Math.min(100, Math.round((receivedQty / orderedQty) * 100)) : 0,
    };
  }, [lines, po?.totalAmount]);

  if (isLoading || !po) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
        <div className="bg-white border-b border-surface-100 px-8 py-4 flex items-center gap-4">
          <button onClick={onBack} className="p-1 hover:bg-surface-50 rounded-lg cursor-pointer">
            <ArrowLeft className="h-5 w-5 text-surface-900" />
          </button>
          <h1 className="text-[17px] font-black text-surface-900 uppercase tracking-tight">Purchase Request</h1>
        </div>
        <div className="flex-1 grid place-items-center text-sm text-surface-400">
          {isLoading ? 'Loading purchase request…' : 'Purchase request not found.'}
        </div>
      </div>
    );
  }

  const status: string = po.status || 'DRAFT';
  const canReceive = status === 'SENT' || status === 'PARTIALLY_RECEIVED';
  const vendorAddress = (vendor?.address || '').trim();

  const shareSummary = `Purchase Request ${po.poNo || ''} — ${vendor?.name || 'vendor'} → ${store?.name || 'store'} · ₹${money(totals.grand)}`;
  const doShare = async () => {
    setShowActions(false);
    try {
      if (navigator.share) await navigator.share({ title: 'Purchase Request', text: shareSummary });
      else { await navigator.clipboard.writeText(shareSummary); alert('Copied to clipboard:\n' + shareSummary); }
    } catch { /* user dismissed the share sheet */ }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
      {/*
        Print isolation. The shell hides its own nav/topbar (shell.css @media print), but any
        chrome mounted between it and this page would otherwise print too, so everything is
        blanked and only the document is made visible again.
      */}
      <style>{`@page { size: A4; margin: 14mm; }
        @media print {
          body { background: #fff !important; }
          body * { visibility: hidden !important; }
          .po-print-doc, .po-print-doc * { visibility: visible !important; }
          .po-print-doc {
            display: block !important;
            position: absolute !important;
            left: 0; top: 0; width: 100%;
          }
        }`}</style>

      {/* ── Nav bar ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-surface-100 px-8 py-4 flex items-center gap-4 sticky top-0 z-[50] shadow-sm print:hidden">
        <button onClick={onBack} className="p-1 hover:bg-surface-50 rounded-lg transition-colors cursor-pointer group">
          <ArrowLeft className="h-5 w-5 text-surface-900 group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <h1 className="text-[17px] font-black text-surface-900 uppercase tracking-tight">Purchase Request Details</h1>

        <div className="ml-auto flex items-center gap-3">
          {canReceive && onReceive && (
            <button
              onClick={() => onReceive(poUid)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[12px] font-black shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              Create Purchase <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => setTimeout(() => window.print(), 80)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-surface-200 rounded-xl text-[12px] font-black text-surface-900 hover:bg-surface-50 transition-all shadow-sm cursor-pointer"
          >
            <Printer className="h-4 w-4 text-surface-400" /> Print
          </button>
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A1D1F] rounded-xl text-[12px] font-black text-white hover:bg-[#2A2E31] transition-all shadow-lg cursor-pointer"
            >
              Actions <ChevronDown className="h-4 w-4 opacity-70" />
            </button>
            {showActions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 mt-2 w-[180px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-surface-100 z-50 overflow-hidden py-2">
                  <button
                    onClick={doShare}
                    className="w-full px-4 py-2 flex items-center gap-3 text-[12px] font-bold text-surface-600 hover:bg-surface-50 transition-colors text-left cursor-pointer"
                  >
                    <Share2 className="h-4 w-4 opacity-70" /> Share
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Screen view ─────────────────────────────────────────────────────── */}
      <div className="flex-1 p-8 pt-6 pb-16 space-y-6 print:hidden">
        {/* Header + vendor / ship-to blocks */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-6 py-3.5 border-b border-surface-50 flex items-center gap-6 flex-wrap bg-[#F8F9FA]/40">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest leading-none mb-1">Request No</span>
              <span className="text-[16px] font-black text-[#55349A] leading-none">{po.poNo || '—'}</span>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${STATUS_STYLE[status] || STATUS_STYLE.DRAFT}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-current" />
              {status.replace(/_/g, ' ')}
            </span>
            <span className="text-[12px] font-bold text-surface-400">
              {totals.pct}% received · {entries.length} receipt{entries.length === 1 ? '' : 's'} booked
            </span>
          </div>

          {/*
            Auto-fit fact grid, as in the design. It reflows from four columns down to one
            without any breakpoint guessing — which matters here because the shell sidebar
            makes the content column far narrower than the viewport that media queries see.
          */}
          <div className="p-8 grid gap-4 bg-white" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
            <div className="flex flex-col gap-1.5 p-6 bg-[#F8F9FA] border border-surface-50 rounded-2xl shadow-sm">
              <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1">Vendor Details</span>
              <span className="text-[16px] font-black text-surface-900 uppercase tracking-tight leading-snug">{vendor?.name || 'Unknown vendor'}</span>
              {vendor?.taxId && <span className="text-[12px] font-bold text-surface-500 break-words">GSTIN {vendor.taxId}</span>}
              {vendor?.phone && <span className="text-[12px] font-bold text-surface-400">{vendor.phone}</span>}
              {vendor?.email && <span className="text-[12px] font-bold text-surface-400 break-words">{vendor.email}</span>}
              {vendorAddress && (
                <span className="text-[12px] font-semibold text-surface-400 whitespace-pre-line leading-relaxed mt-1">{vendorAddress}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5 p-6 bg-[#F8F9FA] border border-surface-50 rounded-2xl shadow-sm">
              <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1">Ship To</span>
              <span className="text-[16px] font-black text-surface-900 tracking-tight leading-snug">{store?.name || po?.storeName || 'Main Store'}</span>
              {store?.code && <span className="text-[12px] font-bold text-surface-500">Store Code: {store.code}</span>}
              {store?.address && (
                <span className="text-[12px] font-semibold text-surface-500 leading-relaxed whitespace-pre-line mt-0.5">{store.address}</span>
              )}
              {store?.location && !store?.address && (
                <span className="text-[12px] font-semibold text-surface-500">{store.location}</span>
              )}
              {store?.contact && <span className="text-[12px] font-bold text-surface-400">{store.contact}</span>}
              {store?.catalogName && (
                <span className="text-[12px] font-bold text-surface-400 uppercase tracking-tight">Catalog: {store.catalogName}</span>
              )}
            </div>

            {([
              ['Request Date', dateFmt(po.poDate)],
              ['Expected Delivery', po.expectedDate ? dateFmt(po.expectedDate) : '—'],
              ['Reference', po.refNo || '—'],
            ] as const).map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1.5 p-6 bg-[#F8F9FA] border border-surface-50 rounded-2xl shadow-sm">
                <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1">{label}</span>
                <span className="text-[15px] font-black text-surface-900 break-words">{value}</span>
              </div>
            ))}
          </div>

          {po.note && (
            <div className="px-8 pb-8 pt-2 text-left">
              <span className="text-[11px] font-bold text-[#8FA3C7] uppercase tracking-wider block mb-3">Notes to Vendor</span>
              <div className="w-full px-6 py-5 bg-[#F8F9FB]/80 border border-slate-200/60 rounded-[14px] text-[13px] font-semibold text-slate-700 leading-relaxed whitespace-pre-line">
                {po.note}
              </div>
            </div>
          )}
        </div>

        {/* Lines */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="px-6 py-5 border-b border-surface-50">
            <h2 className="text-[15px] font-black text-surface-900 uppercase tracking-tight">Items — Ordered / Received / Pending</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-surface-50/30 border-b border-surface-100">
                  <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest min-w-[240px]">Item Details</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest">Unit</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-right">Ordered</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-right">Received</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-right">Pending</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-right">MRP (₹)</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-right">Rate (₹)</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {lines.length === 0 ? (
                  <tr><td colSpan={8} className="py-10 text-center text-sm text-surface-400">This request has no lines.</td></tr>
                ) : lines.map((l) => (
                  <tr key={l.key} className="hover:bg-surface-50/20 transition-colors align-top">
                    <td className="py-5 px-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[14px] font-black text-surface-900 leading-tight">{l.name}</span>
                        <span className="text-[11px] text-surface-400 font-bold">{l.sku}</span>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-[13px] font-bold text-surface-600">{l.unit}</td>
                    <td className="py-5 px-6 text-right">
                      <div className="text-[13px] font-extrabold text-surface-900">{qtyFmt(l.ordered)}</div>
                      {l.baseOrdered > 0 && l.baseOrdered !== l.ordered && (
                        <div className="text-[11px] text-surface-400 font-semibold mt-0.5">= {qtyFmt(l.baseOrdered)} base</div>
                      )}
                    </td>
                    <td className="py-5 px-6 text-right text-[13px] font-extrabold text-surface-700">{qtyFmt(l.received)}</td>
                    <td className="py-5 px-6 text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-black ${l.pending > 0 ? 'bg-[#FDF2E9] text-[#AD6A34]' : 'bg-[#E7F7EF] text-[#0A874F]'}`}>
                        {qtyFmt(l.pending)}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-right text-[13px] font-extrabold text-surface-500">{l.mrp != null ? money(l.mrp) : '—'}</td>
                    <td className="py-5 px-6 text-right text-[13px] font-extrabold text-surface-700">{money(l.rate)}</td>
                    <td className="py-5 px-6 text-right text-[15px] font-black text-surface-900">{money(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end border-t border-surface-50 px-6 py-6">
            <div className="w-full max-w-[340px] flex flex-col gap-3 text-[13px]">
              <div className="flex items-center justify-between text-surface-500">
                <span className="font-bold uppercase tracking-widest text-[11px]">Total Ordered Qty</span>
                <span className="font-black text-surface-900">{qtyFmt(totals.orderedQty)}</span>
              </div>
              <div className="flex items-center justify-between text-surface-500">
                <span className="font-bold uppercase tracking-widest text-[11px]">Sub Total</span>
                <span className="font-black text-surface-900">₹{money(totals.subTotal)}</span>
              </div>
              <div className="pt-3 border-t border-dashed border-surface-200 flex items-center justify-between">
                <span className="text-[13px] font-black uppercase tracking-widest text-[#1A1D1F]">Order Value</span>
                <span className="text-[22px] font-black tracking-tight text-[#1A1D1F]">₹{money(totals.grand)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Goods receipts */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="px-6 py-5 border-b border-surface-50">
            <h2 className="text-[15px] font-black text-surface-900 uppercase tracking-tight">Purchases against this Request</h2>
          </div>
          {entries.length === 0 ? (
            <div className="py-10 text-center text-sm text-surface-400">No goods received yet against this request.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[720px]">
                <thead>
                  <tr className="bg-surface-50/30 border-b border-surface-100">
                    <th className="py-3 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest">Purchase No</th>
                    <th className="py-3 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest">Date</th>
                    <th className="py-3 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest">Bill No</th>
                    <th className="py-3 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center">Lines</th>
                    <th className="py-3 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center">Status</th>
                    <th className="py-3 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-right">Value (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-50">
                  {entries.map((g) => (
                    <tr key={g.uid} className="hover:bg-surface-50/20 transition-colors">
                      <td className="py-4 px-6 text-[13px] font-black text-[#55349A]">{g.purchaseNo}</td>
                      <td className="py-4 px-6 text-[13px] text-surface-600 font-semibold">{g.date}</td>
                      <td className="py-4 px-6 text-[13px] text-surface-600 font-semibold">{g.billNo}</td>
                      <td className="py-4 px-6 text-[13px] text-center font-bold text-surface-900">{g.lineCount}</td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-[#F1F5F9] text-[#475569]">
                          {String(g.status).replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-[13px] text-right font-black text-surface-900">{money(g.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Print document ──────────────────────────────────────────────────── */}
      <div className="po-print-doc hidden text-[#1f1f2b]">
        <div className="flex items-start gap-6 border-b-2 border-[#1D0A42] pb-3">
          <div className="flex-1">
            <div className="text-[16pt] font-bold text-[#1D0A42] tracking-tight">{store?.name || 'Purchasing Entity'}</div>
            <div className="text-[9pt] text-[#4a4a5a] leading-relaxed mt-1">
              {store?.code && <div>Store code {store.code}</div>}
              {store?.contact && <div>{store.contact}</div>}
              {store?.catalogName && <div>{store.catalogName}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[15pt] font-bold tracking-[1pt] text-[#1D0A42]">PURCHASE ORDER</div>
            <div className="text-[10pt] mt-1 text-[#2b2b3a]">{po.poNo || '—'}</div>
            <div className="text-[9pt] mt-0.5 text-[#6b6b78]">
              Dated {dateFmt(po.poDate)} · {status.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3.5 mt-3.5" style={{ breakInside: 'avoid' }}>
          <div className="border border-[#ddd] rounded p-2.5">
            <div className="text-[7.5pt] tracking-[0.08em] uppercase text-[#6b6b78] font-semibold mb-1">Vendor / Supplier</div>
            <div className="text-[9pt] leading-relaxed whitespace-pre-line">
              {[vendor?.name, vendorAddress, vendor?.taxId ? 'GSTIN ' + vendor.taxId : '', vendor?.phone, vendor?.email]
                .filter(Boolean).join('\n') || '—'}
            </div>
          </div>
          <div className="border border-[#ddd] rounded p-2.5">
            <div className="text-[7.5pt] tracking-[0.08em] uppercase text-[#6b6b78] font-semibold mb-1">Ship To</div>
            <div className="text-[9pt] leading-relaxed whitespace-pre-line font-medium text-slate-800">
              {[store?.name || po?.storeName, store?.code ? `Code: ${store.code}` : '', store?.address || store?.location, store?.contact, store?.catalogName ? `Catalog: ${store.catalogName}` : ''].filter(Boolean).join('\n') || '—'}
            </div>
          </div>
          <div className="border border-[#ddd] rounded p-2.5">
            <div className="text-[7.5pt] tracking-[0.08em] uppercase text-[#6b6b78] font-semibold mb-1">Order Details</div>
            <div className="text-[9pt] leading-relaxed whitespace-pre-line">
              {[`PO No: ${po.poNo || '—'}`,
                `PO Date: ${dateFmt(po.poDate)}`,
                `Expected: ${po.expectedDate ? dateFmt(po.expectedDate) : '—'}`,
                `Reference: ${po.refNo || '—'}`,
                'Currency: INR'].join('\n')}
            </div>
          </div>
        </div>

        <table className="w-full border-collapse mt-3.5 text-[8.5pt]">
          <thead>
            <tr className="bg-[#f2f2f5]">
              {['#', 'Item', 'Unit', 'Ordered', 'Received', 'Pending', 'MRP', 'Rate', 'Amount'].map((h, i) => (
                <th key={h} className={`p-1.5 border border-[#ddd] font-semibold ${i > 2 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key} style={{ breakInside: 'avoid' }}>
                <td className="p-1.5 border border-[#ddd] text-[#6b6b78]">{l.n}</td>
                <td className="p-1.5 border border-[#ddd]">
                  <div className="font-medium">{l.name}</div>
                  <div className="text-[7.5pt] text-[#6b6b78] mt-px">{l.sku}</div>
                </td>
                <td className="p-1.5 border border-[#ddd]">{l.unit}</td>
                <td className="p-1.5 border border-[#ddd] text-right">
                  <div>{qtyFmt(l.ordered)}</div>
                  {l.baseOrdered > 0 && l.baseOrdered !== l.ordered && (
                    <div className="text-[7.5pt] text-[#6b6b78] mt-px">{qtyFmt(l.baseOrdered)} base</div>
                  )}
                </td>
                <td className="p-1.5 border border-[#ddd] text-right">{qtyFmt(l.received)}</td>
                <td className="p-1.5 border border-[#ddd] text-right">{qtyFmt(l.pending)}</td>
                <td className="p-1.5 border border-[#ddd] text-right">{l.mrp != null ? money(l.mrp) : '—'}</td>
                <td className="p-1.5 border border-[#ddd] text-right">{money(l.rate)}</td>
                <td className="p-1.5 border border-[#ddd] text-right font-semibold">{money(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex gap-4 mt-3" style={{ breakInside: 'avoid' }}>
          <div className="flex-1">
            <div className="text-[8.5pt] leading-relaxed"><strong>Amount in words:</strong> {inWords(totals.grand)}</div>
            <div className="mt-2.5 border border-[#ddd] rounded p-2.5">
              <div className="text-[7.5pt] tracking-[0.08em] uppercase text-[#6b6b78] font-semibold mb-1">Terms &amp; Conditions</div>
              <div className="text-[8.5pt] leading-relaxed whitespace-pre-line">
                {['Delivery: On or before the expected date, to the ship-to address above.',
                  'Goods must match the ordered item, unit and quantity on each line.',
                  'Over-supply beyond the ordered quantity will not be accepted.',
                  'Rates are as agreed on this order and may not be revised on delivery.'].join('\n')}
              </div>
            </div>
          </div>
          <div className="w-[260pt]">
            <table className="w-full border-collapse text-[9pt]">
              <tbody>
                <tr>
                  <td className="px-2 py-1 border border-[#ddd] text-[#4a4a5a]">Total Ordered Qty</td>
                  <td className="px-2 py-1 border border-[#ddd] text-right">{qtyFmt(totals.orderedQty)}</td>
                </tr>
                <tr>
                  <td className="px-2 py-1 border border-[#ddd] text-[#4a4a5a]">Sub Total</td>
                  <td className="px-2 py-1 border border-[#ddd] text-right">{money(totals.subTotal)}</td>
                </tr>
                <tr>
                  <td className="px-2 py-1 border border-[#ddd] text-[#4a4a5a]">Round Off</td>
                  <td className="px-2 py-1 border border-[#ddd] text-right">
                    {(totals.roundOff < 0 ? '− ' : '') + money(Math.abs(totals.roundOff))}
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-1.5 border border-[#ddd] bg-[#f2f2f5] font-bold">Order Value (₹)</td>
                  <td className="px-2 py-1.5 border border-[#ddd] bg-[#f2f2f5] text-right font-bold">{money(Math.round(totals.grand))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between items-end mt-9" style={{ breakInside: 'avoid' }}>
          <div className="text-[8.5pt] text-[#6b6b78] max-w-[300pt] leading-relaxed whitespace-pre-line">{po.note || ''}</div>
          <div className="text-center">
            <div className="h-[40pt]" />
            <div className="border-t border-[#1f1f2b] pt-1.5 text-[8.5pt] w-[170pt]">
              Authorised Signatory<br />for {store?.name || ''}
            </div>
          </div>
        </div>

        <div className="flex justify-between text-[9pt] text-[#6b6b78] border-t border-[#ddd] pt-1.5 mt-6">
          <span>Purchase Order {po.poNo || ''}</span>
          <span>This is a computer-generated document.</span>
        </div>
      </div>
    </div>
  );
};
