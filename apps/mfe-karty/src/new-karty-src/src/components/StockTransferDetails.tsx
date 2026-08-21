import React, { useState } from 'react';
import {
  ArrowLeft, Truck, CheckCircle2,
  Store, XCircle, Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { TransferItem } from './StockTransfer';

import { useReceiveStockTransfer } from '../../../services/useStockTransfers';

interface StockTransferDetailsProps {
  transfer: TransferItem;
  onBack: () => void;
  onUpdateStatus: (id: string, nextStatus: TransferItem['status']) => void;
}

export const StockTransferDetails: React.FC<StockTransferDetailsProps> = ({
  transfer,
  onBack,
  onUpdateStatus
}) => {
  const receiveMutation = useReceiveStockTransfer();
  const [currentStatus, setCurrentStatus] = useState<TransferItem['status']>(transfer.status);

  const [items, setItems] = useState<any[]>(() => (transfer as any).items || []);

  const totalQty = items.reduce((acc, item) => acc + (item.totalQty || item.qtySent || 0), 0);

  // Calculate received for each item based on inputs
  const processedItems = items.map(item => {
    const qty = item.totalQty || item.qtySent || 0;
    const accepted = item.accepted !== undefined ? item.accepted : qty;
    const rejected = item.rejected || 0;
    const received = Math.min(qty, Math.max(0, accepted - rejected));
    return { ...item, totalQty: qty, accepted, rejected, received };
  });

  const totalReceived = processedItems.reduce((acc, item) => acc + item.received, 0);
  const progress = totalQty > 0 ? (totalReceived / totalQty) * 100 : 0;

  const updateItem = (index: number, field: 'accepted' | 'rejected', value: number) => {
    const next = [...items];
    next[index][field] = value;
    setItems(next);
  };

  const handleAcceptAll = () => {
    const next = items.map(item => ({
      ...item,
      accepted: item.totalQty || item.qtySent || 0,
      rejected: 0
    }));
    setItems(next);
  };

  const handleRejectAll = () => {
    const next = items.map(item => ({
      ...item,
      accepted: item.totalQty || item.qtySent || 0,
      rejected: item.totalQty || item.qtySent || 0
    }));
    setItems(next);
  };

  const handleReceiveClick = async () => {
    // Determine status based on whether all items are accepted fully
    const allItemFullyReceived = processedItems.every(item => item.received === item.totalQty);
    const nextStatus = allItemFullyReceived ? 'Received' : 'Partially Received';

    // Bug fix: this used to fire receiveMutation.mutate() without awaiting it (inside a
    // try/catch that can't actually catch anything from a fire-and-forget call), flip the
    // local status immediately, and show a success alert regardless of whether the backend
    // accepted the per-item quantities. Now the per-item receipt is the source of truth: we
    // only flip status and confirm success once it's actually recorded, and surface a failure
    // instead of silently pretending it worked.
    try {
      await receiveMutation.mutateAsync({
        uid: transfer.id,
        payload: {
          lines: processedItems.map((it) => ({
            transferItemUid: it.uid || it.id,
            qtyReceived: it.received,
          })),
        },
      });
    } catch (err) {
      console.error('Stock transfer receive failed:', err);
      alert('Could not record the receipt — please try again.');
      return;
    }

    setCurrentStatus(nextStatus);
    onUpdateStatus(transfer.id, nextStatus);

    if (nextStatus === 'Received') {
      alert(`Stock transfer ${transfer.transferNo} has been marked as fully Received.`);
    } else {
      alert(`Stock transfer ${transfer.transferNo} remains open and has been set to Partially Received.`);
    }
  };

  const getBadgeStyles = (status: TransferItem['status']) => {
    switch (status) {
      case 'In Transit':
        return "bg-amber-50 text-amber-700 border-amber-200/50";
      case 'Received':
        return "bg-green-50 text-green-700 border-green-200/50";
      case 'Partially Received':
        return "bg-blue-50 text-blue-700 border-blue-200/50";
      case 'Cancelled':
        return "bg-red-50 text-red-700 border-red-200/50";
      case 'Draft':
        return "bg-slate-100 text-slate-700 border-slate-200/50";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200/50";
    }
  };

  const getDotStyles = (status: TransferItem['status']) => {
    switch (status) {
      case 'In Transit': return "bg-amber-500";
      case 'Received': return "bg-green-500";
      case 'Partially Received': return "bg-blue-500";
      case 'Cancelled': return "bg-red-500";
      case 'Draft': return "bg-slate-400";
      default: return "bg-slate-400";
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-50/20">
      {/* Header */}
      <div className="bg-white border-b border-surface-100 py-3.5 px-8 flex items-center shrink-0">
        <button
          onClick={onBack}
          className="p-1 hover:bg-surface-100 rounded transition-colors text-surface-900 mr-4 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-surface-900 tracking-tight">Stock Transfer Details</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 pb-28">
        {/* Unified Status and Transfer Card */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
          {/* Top row: Status Header */}
          <div className="p-6 flex flex-wrap items-center justify-between gap-6 border-b border-[#EAEBF0]">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-[#55349A]">{transfer.transferNo}</span>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 border rounded-lg text-xs font-bold leading-none",
                getBadgeStyles(currentStatus)
              )}>
                <span className={cn("w-2 h-2 rounded-full", getDotStyles(currentStatus), currentStatus === 'In Transit' ? 'animate-pulse' : '')} />
                {currentStatus}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-2 bg-white border border-[#EAEBF0] rounded-xl flex items-center gap-2 shadow-sm">
                <span className="text-xs font-medium text-surface-400">Stock Transfer Number:</span>
                <span className="text-xs font-extrabold text-surface-900">#{transfer.transferNo}</span>
              </div>
              <div className="px-4 py-2 bg-white border border-[#EAEBF0] rounded-xl flex items-center gap-2 shadow-sm">
                <span className="text-xs font-medium text-surface-400">Bill Number:</span>
                <span className="text-xs font-extrabold text-surface-900">#{transfer.transferNo}</span>
              </div>
              <div className="px-4 py-2 bg-white border border-[#EAEBF0] rounded-xl flex items-center gap-2 shadow-sm">
                <span className="text-xs font-medium text-surface-400">Date:</span>
                <span className="text-xs font-extrabold text-surface-900">{transfer.date}</span>
              </div>
            </div>
          </div>

          {/* Bottom row: Transfer Flow */}
          <div className="p-8 flex items-center justify-center gap-0 relative bg-white">
            <div className="flex-1 max-w-[280px] px-6 py-4 bg-[#F6F5ED] border border-[#E7E6DE]/30 rounded-2xl">
              <div className="font-extrabold text-surface-900 text-[15px]">{transfer.fromStore?.name || "-"}</div>
              <div className="text-[11px] text-surface-400 font-semibold mt-0.5 tracking-tight">Inv.Catalog: -</div>
            </div>

            <div className="flex-1 flex items-center justify-center relative mx-4">
              <div className="absolute inset-x-0 top-1/2 h-px border-t border-dashed border-surface-200 -translate-y-1/2" />
              <div className="relative z-10 w-11 h-11 bg-white border border-surface-200 rounded-full flex items-center justify-center shadow-md">
                <Truck className="h-5 w-5 text-surface-500" />
              </div>
            </div>

            <div className="flex-1 max-w-[280px] px-6 py-4 bg-[#F6F5ED] border border-[#E7E6DE]/30 rounded-2xl">
              <div className="font-extrabold text-[#111827] text-[15px]">{transfer.toStore?.name || "-"}</div>
              <div className="text-[11px] text-surface-400 font-semibold mt-0.5 tracking-tight">Inv.Catalog: -</div>
            </div>
          </div>
        </div>

        {/* Items Table Card */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
          <div className="p-6 flex items-center justify-between border-b border-surface-100">
            <h2 className="text-[17px] font-bold text-surface-900">Items/Products</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={handleAcceptAll}
                className="text-primary-600 text-sm font-bold hover:underline transition-all cursor-pointer"
              >
                Accept All
              </button>
              <button
                onClick={handleRejectAll}
                className="text-primary-600 text-sm font-bold hover:underline transition-all cursor-pointer"
              >
                Reject All
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-50/50 font-sans">
                  <th className="py-4 px-8 text-[11px] font-bold text-surface-500 uppercase tracking-[0.05em]">ITEM DETAILS</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-surface-500 uppercase tracking-[0.05em]">SKU</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-surface-500 uppercase tracking-[0.05em]">BATCH</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-surface-500 uppercase tracking-[0.05em]">ACCEPT</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-surface-500 uppercase tracking-[0.05em]">REJECT</th>
                  <th className="py-4 px-8 text-[11px] font-bold text-surface-500 uppercase tracking-[0.05em]">RECEIVED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 font-sans">
                {processedItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="py-5 px-8">
                       <div className="flex items-center gap-4 font-sans">
                         <img src={item.image} alt="" className="h-12 w-10 rounded-lg shadow-sm object-cover border border-surface-100 search-image" referrerPolicy="no-referrer" />
                         <div className="flex flex-col">
                           <span className="font-bold text-surface-900 text-[15px]">{item.name}</span>
                           <span className="text-[11px] text-surface-400 font-medium tracking-tight">{item.attributes}</span>
                         </div>
                       </div>
                    </td>
                    <td className="py-5 px-6">
                      <span className="text-[13px] font-bold text-surface-600">{item.sku}</span>
                    </td>
                    <td className="py-5 px-6">
                      <span className="text-[11px] font-bold text-surface-900 bg-surface-50 px-3 py-1.5 rounded-lg border border-surface-100 uppercase font-mono">{item.batch}</span>
                    </td>
                    <td className="py-5 px-6">
                       <input
                         type="number"
                         value={item.accepted}
                         onChange={(e) => updateItem(idx, 'accepted', parseInt(e.target.value) || 0)}
                         className="w-[120px] px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-mono"
                       />
                    </td>
                    <td className="py-5 px-6">
                       <input
                         type="number"
                         value={item.rejected}
                         onChange={(e) => updateItem(idx, 'rejected', parseInt(e.target.value) || 0)}
                         className="w-[120px] px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-mono"
                       />
                    </td>
                    <td className="py-5 px-8">
                      <span className="text-[13px] font-bold text-surface-600">{item.received} of {item.totalQty}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Progress Section */}
        <div className="flex items-center gap-6">
           <div className="flex-1 max-w-md h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-600 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(20,184,166,0.3)]"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
           </div>
           <div className="bg-surface-50 border border-surface-100 px-4 py-1.5 rounded-full">
             <span className="text-xs font-bold text-surface-500">Total received: <span className="text-surface-900">{totalReceived} of {totalQty}</span></span>
           </div>
        </div>
      </div>

      {/* Footer Actions Banner */}
      <div className="fixed bottom-0 right-0 left-0 bg-white/80 backdrop-blur-md border-t border-surface-200 px-8 py-5 flex items-center justify-end gap-4 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.02)] z-30">
        <button
          onClick={onBack}
          className="px-6 py-2.5 text-sm font-black text-surface-500 hover:text-surface-900 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        {currentStatus !== 'Received' && (
          <button
            id="stock-transfer-details-receive-btn"
            onClick={handleReceiveClick}
            className="px-12 py-3 bg-[#38807C] text-white rounded-xl text-sm font-black hover:bg-[#2d6663] transition-all shadow-lg shadow-teal-600/20 min-w-[160px] active:scale-98 cursor-pointer"
          >
            Receive
          </button>
        )}
      </div>
    </div>
  );
};
