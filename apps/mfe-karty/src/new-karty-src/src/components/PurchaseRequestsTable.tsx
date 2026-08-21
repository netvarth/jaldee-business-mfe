import React, { useEffect, useState } from 'react';
import { Plus, ArrowRight, Eye } from 'lucide-react';
import { usePurchaseOrders } from '../../../services/usePurchaseOrders';
import { CreatePurchaseOrder } from './CreatePurchaseOrder';
import { PurchaseEntryAgainstPO } from './PurchaseEntryAgainstPO';
import { PurchaseRequestDetails } from './PurchaseRequestDetails';

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-[#F1F5F9] text-[#475569]',
  SENT: 'bg-[#EFEBFA] text-[#55349A]',
  PARTIALLY_RECEIVED: 'bg-[#FDF2E9] text-[#AD6A34]',
  RECEIVED: 'bg-[#E7F7EF] text-[#0A874F]',
  CLOSED: 'bg-[#E7F7EF] text-[#0A874F]',
  CANCELLED: 'bg-[#FEECEC] text-[#C0392B]',
};

/**
 * Purchase Requests = backend Purchase Orders. Open requests (SENT /
 * PARTIALLY_RECEIVED) can be fulfilled by creating a Purchase (goods receipt)
 * against them via the PurchaseEntryAgainstPO screen.
 */
export const PurchaseRequestsTable = ({
  onSubScreenChange,
}: { onSubScreenChange?: (active: boolean) => void } = {}) => {
  const { data: orders = [], isLoading } = usePurchaseOrders();
  const [mode, setMode] = useState<'list' | 'create' | 'receive' | 'details'>('list');
  const [activePoUid, setActivePoUid] = useState<string>('');

  // Tells the workspace to drop its tab header while a full-screen sub-view is up.
  useEffect(() => { onSubScreenChange?.(mode !== 'list'); }, [mode, onSubScreenChange]);

  if (mode === 'create')
    return <CreatePurchaseOrder onBack={() => setMode('list')} onCreated={() => setMode('list')} />;
  if (mode === 'receive')
    return (
      <PurchaseEntryAgainstPO
        initialPoUid={activePoUid}
        onBack={() => setMode('list')}
        onSaved={() => setMode('list')}
      />
    );
  if (mode === 'details')
    return (
      <PurchaseRequestDetails
        poUid={activePoUid}
        onBack={() => setMode('list')}
        onReceive={(uid) => { setActivePoUid(uid); setMode('receive'); }}
      />
    );

  return (
    <div className="p-6 space-y-6 flex-1">
      <div className="bg-white p-6 rounded-2xl border border-surface-200">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#1A1D1F]">Purchase Orders</h2>
            <p className="text-sm text-surface-500">
              Orders raised to vendors. Receive stock against an open request to create a purchase.
            </p>
          </div>
          <button
            onClick={() => setMode('create')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#55349A] text-white rounded-xl text-sm font-bold hover:bg-[#462885] transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> New Request
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[920px]">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="py-3 px-4 text-[10px] font-bold text-surface-400 uppercase tracking-widest">Request No</th>
                <th className="py-3 px-4 text-[10px] font-bold text-surface-400 uppercase tracking-widest">Vendor</th>
                <th className="py-3 px-4 text-[10px] font-bold text-surface-400 uppercase tracking-widest">Destination</th>
                <th className="py-3 px-4 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center">Ordered Qty</th>
                <th className="py-3 px-4 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center">Status</th>
                <th className="py-3 px-4 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50">
              {isLoading ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-surface-400">Loading purchase requests…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-surface-400">No purchase requests yet. Click “New Request” to raise one.</td></tr>
              ) : (
                orders.map((po) => {
                  const canReceive = po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED';
                  return (
                    <tr key={po.id} className="hover:bg-surface-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <button
                          onClick={() => { setActivePoUid(po.id); setMode('details'); }}
                          className="text-[13px] font-black text-[#55349A] hover:underline cursor-pointer"
                        >
                          {po.poNo}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-[13px] font-semibold text-surface-900">{po.vendorName}</td>
                      <td className="py-4 px-4 text-[13px] text-surface-600">{po.storeName}</td>
                      <td className="py-4 px-4 text-[13px] text-center text-surface-900 font-bold">{po.totalOrderedQty}</td>
                      <td className="py-4 px-4 text-[13px] text-right text-surface-900 font-bold">₹{po.totalAmount.toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${STATUS_STYLE[po.status] || ''}`}>
                          {po.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setActivePoUid(po.id); setMode('details'); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-surface-200 hover:bg-surface-50 text-surface-900 rounded-lg text-[11px] font-bold active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                          >
                            <Eye className="h-3.5 w-3.5 text-surface-400" /> View
                          </button>
                          {canReceive && (
                            <button
                              onClick={() => { setActivePoUid(po.id); setMode('receive'); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[11px] font-bold active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                            >
                              Create Purchase <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
