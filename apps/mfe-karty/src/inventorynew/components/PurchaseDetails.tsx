import React, { useState } from 'react';
import {
  ArrowLeft, ArrowUpRight, ShoppingBasket,
  Trash2, Pencil, Copy, ChevronDown, Share2, Printer, XCircle, Truck
} from '../icons';
import { cn } from '@jaldee/design-system';

interface PurchaseDetailsProps {
  onBack: () => void;
  purchase: any;
}

import { usePurchase } from '../../services/usePurchases';
import { ReceiveScanBox } from '../../new-karty-src/src/components/ReceiveScanBox';

export const PurchaseDetails = ({ onBack, purchase }: PurchaseDetailsProps) => {
  const { data: fullPurchase, isLoading } = usePurchase(purchase.id || purchase.uid);
  const [taxBreakdownIndex, setTaxBreakdownIndex] = useState<number | null>(null);
  const [showMoreActions, setShowMoreActions] = useState(false);

  const items = fullPurchase?.items?.map((item: any) => ({
    name: item.itemName || 'Item',
    details: item.itemDetails || 'N/A',
    batch: item.batchNo || 'N/A',
    unit: 'Piece',
    qty: item.quantity?.toString() || '0',
    freeQty: item.freeQuantity?.toString() || '0',
    expDate: item.expiryDate?.split('T')[0] || '-',
    mrp: item.mrp?.toFixed(2) || '0.00',
    purchasePrice: item.purchasePrice?.toFixed(2) || '0.00',
    discount: item.discount?.toFixed(2) || '0.00',
    tax: item.taxPercentage || '0',
    netAmount: item.netAmount?.toFixed(2) || '0.00',
    image: item.image || 'https://images.unsplash.com/photo-1523381235212-d73f49382117?w=400&h=400&fit=crop&q=80'
  })) || [];

  const billDetails = {
    totalQuantity: fullPurchase?.totalQty || 0,
    grossAmount: items.reduce((acc: number, item: any) => acc + (parseFloat(item.qty) * parseFloat(item.purchasePrice)), 0),
    cgst: 0,
    sgst: 0,
    cess: 0,
    cessAmount: 0,
    taxableAmount: items.reduce((acc: number, item: any) => acc + (parseFloat(item.qty) * parseFloat(item.purchasePrice)), 0),
    roundOff: 0,
    netBillAmount: items.reduce((acc: number, item: any) => acc + parseFloat(item.netAmount), 0)
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface-alt)]/20">
      {/* Dedicate Navigation Bar */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-8 py-4 flex items-center gap-4 sticky top-0 z-[50] shadow-sm print:hidden">
        <button
          onClick={onBack}
          className="p-1 hover:bg-[var(--color-surface-alt)] rounded-lg transition-colors cursor-pointer group border-0 bg-transparent"
        >
          <ArrowLeft className="h-5 w-5 text-[var(--color-text-primary)] group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <h1 className="text-[17px] font-black text-[var(--color-text-primary)] uppercase tracking-tight">Purchase Details</h1>
      </div>

      <div className="flex-1 p-6 pb-32 space-y-5 text-left">
        {/* Print-only document title (on-screen nav is hidden when printing) */}
        <div className="hidden print:block mb-2">
          <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--color-text-primary)]">
            {purchase.status === 'In Review' || purchase.status === 'Requested' ? 'Purchase Request' : 'Purchase'}
          </h1>
          <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
            #{purchase.orderNo || purchase.purchaseNo || 'N/A'} · {purchase.date || 'N/A'}
          </p>
        </div>
        {/* Merged Header & Info Section */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          {/* Top Management Row */}
          <div className="px-6 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-alt)]/40">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest leading-none mb-1">Purchase ID</span>
                <span className="text-[16px] font-black text-[var(--color-primary)] leading-none">#{purchase.orderNo || '356713'}</span>
              </div>

              {purchase.status === 'Approved' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--color-success-subtle)] text-[var(--color-success)] rounded-xl text-[9px] font-black uppercase tracking-widest border border-[var(--color-success)]/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
                  Approved
                </span>
              ) : purchase.status === 'In Review' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--color-warning-subtle)] text-[var(--color-warning)] rounded-xl text-[9px] font-black uppercase tracking-widest border border-[var(--color-warning)]/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)]" />
                  In Review
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] rounded-xl text-[9px] font-black uppercase tracking-widest border border-[var(--color-border)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-secondary)]" />
                  Draft
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 print:hidden">
              <button className="flex items-center gap-2 px-3.5 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[12px] font-black text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] transition-all shadow-sm cursor-pointer">
                <Copy className="h-4 w-4 text-[var(--color-text-secondary)]" />
                Duplicate
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowMoreActions(!showMoreActions)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--color-text-primary)] rounded-xl text-[12px] font-black text-[var(--color-surface)] hover:opacity-90 transition-all shadow-lg cursor-pointer border-0"
                >
                  Actions
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </button>

                {showMoreActions && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMoreActions(false)} />
                    <div className="absolute right-0 mt-2 w-[180px] bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-[var(--color-border)] z-50 overflow-hidden py-2">
                      <button className="w-full px-4 py-2 flex items-center gap-3 text-[12px] font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] transition-colors text-left border-0 bg-transparent cursor-pointer">
                        <Share2 className="h-4 w-4 opacity-70" /> Share
                      </button>
                      <button
                        onClick={() => { setShowMoreActions(false); setTimeout(() => window.print(), 80); }}
                        className="w-full px-4 py-2 flex items-center gap-3 text-[12px] font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] transition-colors text-left border-t border-[var(--color-border)] bg-transparent cursor-pointer">
                        <Printer className="h-4 w-4 opacity-70" /> Print
                      </button>
                      <button className="w-full px-4 py-2 flex items-center gap-3 text-[12px] font-bold text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] transition-colors text-left border-t border-[var(--color-border)] bg-transparent cursor-pointer">
                        <XCircle className="h-4 w-4 opacity-70" /> Cancel Purchase
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Flow & Info Content Row */}
          <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between bg-[var(--color-surface)] gap-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex flex-col gap-1 p-4 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl min-w-[280px] shadow-sm">
                 <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest mb-1">Vendor Details</span>
                 <span className="text-[16px] font-black text-[var(--color-text-primary)] uppercase tracking-tight">{purchase.from?.name || 'Unknown Vendor'}</span>
                 <span className="text-[12px] font-bold text-[var(--color-text-secondary)]/60 font-medium mt-0.5">{purchase.from?.id || '#-'}</span>
              </div>

              <div className="flex items-center self-center py-4">
                 <div className="w-10 h-px border-t border-dashed border-[var(--color-border)]" />
                 <div className="bg-[var(--color-surface)] border text-[var(--color-border)] rounded-full p-3 shadow-md shrink-0 border-[var(--color-border)]">
                    <Truck className="h-4 w-4 text-[var(--color-text-secondary)]" strokeWidth={2.5} />
                 </div>
                 <div className="w-10 h-px border-t border-dashed border-[var(--color-border)]" />
              </div>

              <div className="flex flex-col gap-1 p-4 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl min-w-[280px] shadow-sm">
                 <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest mb-1">Destination</span>
                 <span className="text-[16px] font-black text-[var(--color-text-primary)] tracking-tight">{purchase.to?.name || 'Unknown Store'}</span>
                 <span className="text-[12px] font-bold text-[var(--color-text-secondary)]/60 font-medium uppercase tracking-tight truncate max-w-[260px]">{fullPurchase?.catalogName || 'N/A'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 min-w-[280px] w-full md:w-auto">
              <div className="px-5 py-2.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl flex items-center justify-between shadow-sm">
                <span className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-widest">Purchase No:</span>
                <span className="text-[13px] font-black text-[var(--color-text-primary)]">#{purchase.orderNo || 'N/A'}</span>
              </div>
              <div className="px-5 py-2.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl flex items-center justify-between shadow-sm">
                <span className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-widest">Bill Number:</span>
                <span className="text-[13px] font-black text-[var(--color-text-primary)]">#{fullPurchase?.billNo || 'N/A'}</span>
              </div>
              <div className="px-5 py-2.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl flex items-center justify-between shadow-sm">
                <span className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-widest">Date:</span>
                <span className="text-[13px] font-black text-[var(--color-text-primary)]">{purchase.date || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scan-to-receive — only while the purchase is still editable */}
        {purchase.status !== 'Approved' && purchase.status !== 'Cancelled' && (
          <div className="mb-6">
            <ReceiveScanBox purchaseUid={purchase.id || purchase.uid} />
          </div>
        )}

        {/* Items Section - Full Width */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <h2 className="text-[15px] font-black text-[var(--color-text-primary)] uppercase tracking-tight">Items / Products ({items.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface-alt)]/20 border-b border-[var(--color-border)]">
                  <th className="py-3 px-6 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest min-w-[250px]">Item Details</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest text-center">Batch / Unit</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest text-center whitespace-nowrap">Quantity</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest text-center whitespace-nowrap">MRP / Price (₹)</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest text-center whitespace-nowrap">Tax / Disc.</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest text-right whitespace-nowrap">Net Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-[var(--color-text-secondary)]">Loading purchase details...</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-[var(--color-text-secondary)]">No items found for this purchase.</td>
                  </tr>
                ) : items.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[var(--color-surface-alt)]/20 transition-colors align-top">
                    <td className="py-4 px-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-alt)] shrink-0">
                           <img src={item.image} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-[14px] font-black text-[var(--color-text-primary)] leading-tight truncate">{item.name}</span>
                          <span className="text-[12px] text-[var(--color-text-secondary)]/60 font-bold whitespace-nowrap uppercase tracking-tighter">{item.details}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[13px] font-extrabold text-[var(--color-text-secondary)]">#{item.batch}</span>
                        <span className="text-[11px] font-bold text-[var(--color-text-secondary)]/60 uppercase">{item.unit}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[13px] font-extrabold text-[var(--color-text-primary)]">{item.qty} Pcs</span>
                        <span className="text-[11px] font-bold text-[var(--color-success)]">+ {item.freeQty} free</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[13px] font-extrabold text-[var(--color-text-secondary)]">₹{item.mrp} <span className="text-[10px] text-[var(--color-text-secondary)]/50 ml-1">MRP</span></span>
                        <span className="text-[13px] font-black text-[var(--color-primary)]">₹{item.purchasePrice} <span className="text-[10px] opacity-60 ml-1">PUR.</span></span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[13px] font-extrabold text-[var(--color-text-secondary)]">{item.tax}% Tax</span>
                        <span className="text-[11px] font-bold text-[var(--color-danger)]">₹{item.discount} Disc</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-[15px] font-black text-[var(--color-text-primary)]">₹{item.netAmount}</span>
                        <button className="p-2 hover:bg-[var(--color-surface-alt)] rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all border-0 bg-transparent cursor-pointer">
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
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
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <h2 className="text-[16px] font-black text-[var(--color-text-primary)] uppercase tracking-tight">Bill Details</h2>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[var(--color-text-secondary)]/60 uppercase tracking-widest">Total quantity</span>
                  <span className="text-[15px] text-[var(--color-text-primary)] font-black">{billDetails.totalQuantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[var(--color-text-secondary)]/60 uppercase tracking-widest">Gross amount</span>
                  <span className="text-[15px] text-[var(--color-text-primary)] font-black">₹{billDetails.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[var(--color-text-secondary)]/60 uppercase tracking-widest">CGST%</span>
                  <span className="text-[15px] text-[var(--color-text-disabled)] font-black">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[var(--color-text-secondary)]/60 uppercase tracking-widest">SGST%</span>
                  <span className="text-[15px] text-[var(--color-text-disabled)] font-black">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[var(--color-text-secondary)]/60 uppercase tracking-widest">CESS%</span>
                  <span className="text-[15px] text-[var(--color-text-disabled)] font-black">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[var(--color-text-secondary)]/60 uppercase tracking-widest">CESS Amount(₹)</span>
                  <span className="text-[15px] text-[var(--color-text-disabled)] font-black">₹ 0.00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[var(--color-text-secondary)]/60 uppercase tracking-widest">Taxable amount(₹)</span>
                  <span className="text-[15px] text-[var(--color-text-primary)] font-black">₹{billDetails.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[var(--color-text-secondary)]/60 uppercase tracking-widest">Round Off</span>
                  <div className="flex items-center gap-0 w-[160px] bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl overflow-hidden shrink-0 shadow-inner">
                    <div className="px-3 py-2 bg-[var(--color-surface-alt)] border-r border-[var(--color-border)] text-[13px] font-black text-[var(--color-text-secondary)]/60">₹</div>
                    <div className="flex-1 px-4 py-2 text-right text-[15px] font-black text-[var(--color-text-primary)]">
                      {billDetails.roundOff.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="pt-8 mt-4 border-t border-dashed border-[var(--color-border)] flex items-center justify-between text-[var(--color-text-primary)]">
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
        <div className="fixed bottom-0 right-0 left-0 bg-[var(--color-surface)]/80 backdrop-blur-md border-t border-[var(--color-border)] px-8 py-5 flex items-center justify-end gap-4 shrink-0 shadow-sm z-30 print:hidden">
          <button
            onClick={onBack}
            className="px-6 py-2.5 text-sm font-black text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors border-0 bg-transparent cursor-pointer"
          >
            Cancel
          </button>

          {purchase.status === 'In Review' ? (
            <>
              <button className="px-10 py-3 bg-[var(--color-danger)] text-white rounded-xl text-[13px] font-black hover:opacity-90 transition-all shadow-md active:scale-95 border-0 cursor-pointer">
                Reject Purchase
              </button>
              <button className="px-12 py-3 bg-[#3B807A] text-white rounded-xl text-[13px] font-black hover:opacity-90 transition-all shadow-md active:scale-95 border-0 cursor-pointer">
                Approve Purchase
              </button>
            </>
          ) : (
            <button className="px-12 py-3 bg-[var(--color-primary)] text-[var(--color-primary-text)] rounded-xl text-[13px] font-black hover:opacity-90 transition-all shadow-lg active:scale-95 border-0 cursor-pointer">
              Create & Send Purchase
            </button>
          )}
        </div>
      )}
    </div>
  );
};
