import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, X, Clock, ShoppingCart, User,
  Store, FileText, AlertCircle, CheckCircle2, XCircle, RefreshCw,
  RotateCcw, CreditCard, DollarSign, ExternalLink
} from 'lucide-react';
import {
  useSalesReturn,
  useUpdateSalesReturnStatus,
  useRefundSalesReturn,
  type SalesReturn,
  type RefundStatus
} from '../services/useSalesReturns';
import { useStores } from '../services/useStores';
import { useCustomers } from '../services/useCustomers';
import { useItems } from '../services/useItems';
import { useUnits } from '../services/useUnits';
import { cn } from '../new-karty-src/src/lib/utils';

interface SalesReturnDetailProps {
  initialReturn?: SalesReturn;
  onBack?: () => void;
}

export function SalesReturnDetailPage({ initialReturn, onBack }: SalesReturnDetailProps) {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const targetUid = initialReturn?.uid || uid;

  const { data: fetchedReturn, isLoading, error } = useSalesReturn(targetUid);
  const ret: SalesReturn | undefined = initialReturn || fetchedReturn;

  const storesQ = useStores();
  const customersQ = useCustomers("", 0, 200);
  const itemsQ = useItems();
  const unitsQ = useUnits();

  const updateStatus = useUpdateSalesReturnStatus();
  const refundReturn = useRefundSalesReturn();

  // Refund Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundAmountInput, setRefundAmountInput] = useState<string>('');
  const [refundStatusInput, setRefundStatusInput] = useState<RefundStatus>('REFUNDED');

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/orders/sales-returns');
    }
  };

  const storeObj = (storesQ.data ?? []).find((s: any) => (s.id ?? s.uid) === ret?.storeUid);
  const customerObj = (customersQ.data ?? []).find((c: any) => c.uid === ret?.consumerUid);
  const hasCustomer = !!ret?.consumerUid;

  const customerName = (ret as any)?.consumerName ||
    customerObj?.displayName ||
    [customerObj?.firstName, customerObj?.lastName].filter(Boolean).join(" ") ||
    (hasCustomer ? `Customer #${ret?.consumerUid?.slice(0, 8)}` : "Walk-in Retail Customer");

  const customerInitials = customerName
    .split(/\s+/)
    .map((n: string) => n?.[0] || '')
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'SR';

  const status = String(ret?.status || 'DRAFT').toUpperCase();
  const refundStatus = String(ret?.refundStatus || 'NONE').toUpperCase();

  const isDraft = status === 'DRAFT';
  const isPending = status === 'PENDING';
  const isCompleted = status === 'COMPLETED';
  const isCancelled = status === 'CANCELLED' || status === 'REJECTED';

  const isRefunded = refundStatus === 'REFUNDED';
  const isRefundPending = refundStatus === 'PENDING';

  const items = ret?.items || [];
  const itemsCount = items.reduce((acc, it) => acc + (Number(it.qty) || 1), 0) || 1;
  const refundAmount = Number(ret?.refundAmount || 0);

  const unitName = (uUid?: string) => {
    if (!uUid) return "Unit";
    const u = (unitsQ.data ?? []).find((x: any) => x.uid === uUid || x.id === uUid);
    return u?.symbol || u?.name || "Unit";
  };

  const getItemName = (itemUid?: string) => {
    if (!itemUid) return "Returned Item";
    const it = (itemsQ.data ?? []).find((x: any) => x.uid === itemUid || x.id === itemUid);
    return it?.name || "Returned Product";
  };

  const submitRefund = () => {
    const amt = parseFloat(refundAmountInput || String(refundAmount));
    if (isNaN(amt) || amt < 0) {
      alert('Please enter a valid refund amount.');
      return;
    }
    refundReturn.mutate(
      { uid: targetUid!, amount: amt, refundStatus: refundStatusInput },
      {
        onSuccess: () => {
          setIsRefundModalOpen(false);
        }
      }
    );
  };

  if (isLoading && !ret) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50">
        <RefreshCw className="h-8 w-8 text-[#55349A] animate-spin mb-3" />
        <span className="text-sm font-bold text-slate-700">Loading sales return details...</span>
      </div>
    );
  }

  if (error && !ret) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50">
        <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
        <h3 className="text-base font-extrabold text-slate-900">Failed to load return</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">{(error as Error)?.message || 'Return not found'}</p>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          Return to Sales Returns
        </button>
      </div>
    );
  }

  const retNumber = ret?.returnNo || (ret?.uid ? `SRET-${ret.uid.slice(0, 8).toUpperCase()}` : 'SRET-0001');

  return (
    <div className="h-[calc(100vh-56px)] max-h-[calc(100vh-56px)] flex flex-col bg-slate-50 font-sans overflow-hidden">

      {/* 1. TOP STICKY ACTION HEADER */}
      <header className="bg-white border-b border-slate-200 px-7 py-4 flex items-center justify-between gap-4 shrink-0 z-20">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-colors shadow-2xs shrink-0 cursor-pointer"
            title="Back to Sales Returns"
          >
            <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Return #{retNumber}
              </h2>

              {/* Return Status Badge */}
              <span className={cn(
                "text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5",
                isCompleted ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                isPending ? "bg-amber-50 text-amber-800 border border-amber-200" :
                isCancelled ? "bg-red-50 text-red-700 border border-red-200" :
                "bg-slate-100 text-slate-700 border border-slate-200"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isCompleted ? "bg-emerald-500" :
                  isPending ? "bg-amber-500" :
                  isCancelled ? "bg-red-500" :
                  "bg-slate-500"
                )} />
                {status}
              </span>

              {/* Refund Status Badge */}
              <span className={cn(
                "text-xs font-bold px-2.5 py-0.5 rounded-md border",
                isRefunded ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                isRefundPending ? "bg-amber-50 text-amber-700 border-amber-200" :
                "bg-slate-100 text-slate-700 border-slate-200"
              )}>
                Refund: {refundStatus}
              </span>

              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200/80 truncate max-w-[280px]">
                🏪 {storeObj?.name || 'Main Fulfillment Hub'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Returned on {ret?.returnDate ? new Date(ret.returnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today'} · {itemsCount} Item(s)
            </p>
          </div>
        </div>

        {/* Top Action Shortcuts */}
        <div className="flex items-center gap-2.5 shrink-0">
          {isDraft && (
            <button
              type="button"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ uid: targetUid!, status: 'PENDING' })}
              className="flex items-center gap-1.5 px-4.5 py-2 bg-[#55349A] hover:bg-[#462980] text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-98"
            >
              <span>Send for Approval</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}

          {isPending && (
            <button
              type="button"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ uid: targetUid!, status: 'COMPLETED' })}
              className="flex items-center gap-1.5 px-4.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-98"
            >
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              <span>Complete Return</span>
            </button>
          )}

          {isCompleted && !isRefunded && (
            <button
              type="button"
              onClick={() => {
                setRefundAmountInput(String(refundAmount || ''));
                setIsRefundModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4.5 py-2 bg-[#55349A] hover:bg-[#462980] text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-98"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Record Refund</span>
            </button>
          )}

          {isCompleted && isRefunded && (
            <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Refund Settled</span>
            </div>
          )}
        </div>
      </header>

      {/* 2. TOP HORIZONTAL 'TRAIN' TIMELINE PROGRESS */}
      <div className="bg-white border-b border-slate-200 px-8 py-3.5 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between relative">

          {/* Step 1: Return Initiated */}
          <div className="flex items-center gap-3 z-10 bg-white pr-4">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-2xs">
              ✓
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-900">Return Raised</div>
              <div className="text-[11px] text-slate-400 font-medium">Intake Logged</div>
            </div>
          </div>

          <div className="flex-1 h-0.5 bg-emerald-500 rounded-full mx-2" />

          {/* Step 2: Items Verified */}
          <div className="flex items-center gap-3 z-10 bg-white px-4">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-2xs",
              (isPending || isCompleted) ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400 border border-slate-200"
            )}>
              {(isPending || isCompleted) ? '✓' : '2'}
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-900">Items Verified</div>
              <div className="text-[11px] text-slate-400 font-medium">
                {isCompleted ? 'Approved' : isPending ? 'In Review' : 'Pending'}
              </div>
            </div>
          </div>

          <div className={cn("flex-1 h-0.5 rounded-full mx-2", isCompleted ? "bg-emerald-500" : "bg-slate-200")} />

          {/* Step 3: Restocked & Completed */}
          <div className="flex items-center gap-3 z-10 bg-white px-4">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-2xs",
              isCompleted ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400 border border-slate-200"
            )}>
              {isCompleted ? '✓' : '3'}
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-900">Restocked</div>
              <div className="text-[11px] text-slate-400 font-medium">
                {isCompleted ? 'Inventory Restored' : 'Pending Restock'}
              </div>
            </div>
          </div>

          <div className={cn("flex-1 h-0.5 rounded-full mx-2", isRefunded ? "bg-emerald-500" : "bg-slate-200")} />

          {/* Step 4: Refund Settled */}
          <div className="flex items-center gap-3 z-10 bg-white pl-4">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-2xs",
              isRefunded ? "bg-emerald-600 text-white" :
              isRefundPending ? "bg-amber-500 text-white" :
              "bg-slate-100 text-slate-400 border border-slate-200"
            )}>
              {isRefunded ? '✓' : isRefundPending ? '⏳' : '4'}
            </div>
            <div>
              <div className={cn("text-xs font-extrabold", isRefunded ? "text-slate-900" : "text-slate-400")}>
                Refund Settled
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {isRefunded ? 'Completed' : isRefundPending ? 'In Progress' : 'Pending'}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. MAIN 2-COLUMN SALES RETURN WORKSPACE (SCROLLABLE) */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT COLUMN: RETURNED ITEMS & REASON (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">

            {/* CARD 1: RETURNED ITEMS TABLE */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="h-4.5 w-4.5 text-slate-700" />
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">
                    Returned Line Items ({items.length || 1} product(s) · {itemsCount} units)
                  </h3>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  Store: <span className="font-bold text-slate-700">{storeObj?.name || 'Main Fulfillment Hub'}</span>
                </span>
              </div>

              {/* Items Table */}
              <div className="overflow-hidden border border-slate-200/80 rounded-xl divide-y divide-slate-100">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Product / Item</th>
                      <th className="py-3 px-2 text-right">Unit Price</th>
                      <th className="py-3 px-2 text-center">Returned Qty</th>
                      <th className="py-3 px-4 text-right">Refund Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {items.length > 0 ? (
                      items.map((line, idx) => {
                        const pName = getItemName(line.itemUid);
                        const pPrice = Number(line.unitPrice || (refundAmount / Math.max(1, itemsCount)));
                        const pQty = Number(line.qty || 1);
                        const pTotal = pPrice * pQty;
                        return (
                          <tr key={line.uid || idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 text-xs truncate max-w-[220px]">
                                {pName}
                              </div>
                              <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                                <span>UID: {(line.itemUid || 'ITEM').slice(0, 8)}</span>
                                {line.batchNumber && <span>· Batch: {line.batchNumber}</span>}
                                <span>· Unit: {unitName(line.unitUid)}</span>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right text-slate-700 font-semibold">
                              ₹{pPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-bold text-xs">
                                {pQty}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-black text-slate-900">
                              ₹{pTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-xs truncate max-w-[220px]">
                            Returned Order Items
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                            Ref: {ret?.uid?.slice(0, 8) || 'SALES_RETURN'}
                          </div>
                        </td>
                        <td className="py-3.5 px-2 text-right text-slate-700 font-semibold">
                          ₹{refundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 font-bold text-xs text-slate-800">
                            {itemsCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900">
                          ₹{refundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CARD 2: RETURN REASON & INSPECTION */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-700" />
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">Return Reason & Inspection Log</h3>
                </div>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                  Reason Logged
                </span>
              </div>

              <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-1">
                <span className="text-[10.5px] font-bold uppercase text-amber-900 tracking-wider block">Customer Return Reason</span>
                <p className="text-slate-800 font-bold text-xs leading-relaxed">
                  {ret?.reason || "Customer requested return for purchased merchandise."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs pt-1">
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs font-medium text-slate-500">Original Order</span>
                    <span className="font-bold text-[#55349A]">
                      {ret?.orderUid ? `#${ret.orderUid.slice(0, 8)}` : (ret?.invoiceNo ? `#${ret.invoiceNo}` : 'Walk-in Sale')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-medium text-slate-500">Invoice Reference</span>
                    <span className="text-slate-700 font-bold">{ret?.invoiceNo || '—'}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs font-medium text-slate-500">Return Mode</span>
                    <span className="font-bold text-slate-800">Counter Drop-off</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-medium text-slate-500">Stock Restocked</span>
                    <span className={cn("font-bold", isCompleted ? "text-emerald-700" : "text-slate-500")}>
                      {isCompleted ? "✓ Restocked to Store" : "Pending Intake"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: CUSTOMER & REFUND SETTLEMENT (5 Cols - UNCLUTTERED) */}
          <div className="lg:col-span-5 space-y-5">

            {/* CARD 3: CUSTOMER PROFILE */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-700" />
                  <h3 className="text-xs font-black text-slate-900 tracking-tight">Customer Information</h3>
                </div>
                {ret?.consumerUid ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/customers/${ret.consumerUid}`)}
                    className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 hover:bg-emerald-100 cursor-pointer flex items-center gap-1"
                  >
                    <span>CRM Profile</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                    Retail Guest
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                    {customerInitials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {customerName}
                    </div>
                    <div className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                      {customerObj?.consumerNo ? (
                        <>CRM ID: <span className="font-bold text-slate-700">{customerObj.consumerNo}</span></>
                      ) : (
                        <span className="text-slate-400">Walk-in / Unregistered</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase block">Phone</span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {customerObj?.primaryNumber || customerObj?.phone || '— (Not provided)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase block">Email</span>
                    <span className="font-semibold text-slate-800 truncate block text-xs">
                      {customerObj?.email || '— (Not provided)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 4: REFUND & FINANCIAL SETTLEMENT */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-black text-slate-900 tracking-tight">
                  Refund & Financial Settlement
                </h3>
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-md border",
                  isRefunded ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  isRefundPending ? "bg-amber-50 text-amber-700 border-amber-200" :
                  "bg-slate-100 text-slate-600 border-slate-200"
                )}>
                  {refundStatus}
                </span>
              </div>

              <div className="space-y-2 text-xs font-medium text-slate-600">
                <div className="flex justify-between">
                  <span>Returned Items Value</span>
                  <span className="font-bold text-slate-900">
                    ₹{refundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>GST Tax Reversal (18%)</span>
                  <span className="font-medium text-slate-700">
                    ₹{(refundAmount > 0 ? refundAmount * 0.18 : 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-2.5 border-t border-slate-100">
                  <span className="text-xs font-black text-slate-900 uppercase">Total Refund Amount</span>
                  <span className="text-lg font-black text-emerald-700">
                    ₹{refundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {isCompleted && !isRefunded && (
                <button
                  type="button"
                  onClick={() => {
                    setRefundAmountInput(String(refundAmount || ''));
                    setIsRefundModalOpen(true);
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <DollarSign className="h-4 w-4 stroke-[3]" />
                  <span>Record Refund Now</span>
                </button>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* 4. ZERO-SCROLL STICKY FOOTER */}
      <footer className="bg-white border-t border-slate-200 px-8 py-3.5 flex items-center justify-between shrink-0 shadow-lg z-30">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Refund Payable:</span>
          <span className="text-xl font-black text-emerald-700">
            ₹{refundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-xs text-slate-500 font-medium">({itemsCount} units)</span>
        </div>

        <div className="flex items-center gap-3">
          {isDraft && (
            <button
              type="button"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ uid: targetUid!, status: 'PENDING' })}
              className="px-6 py-2.5 bg-[#55349A] hover:bg-[#462980] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer flex items-center gap-2"
            >
              <span>{updateStatus.isPending ? 'Submitting…' : 'Send for Approval'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {isPending && (
            <button
              type="button"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ uid: targetUid!, status: 'COMPLETED' })}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer flex items-center gap-2"
            >
              <Check className="h-4 w-4 stroke-[3]" />
              <span>{updateStatus.isPending ? 'Completing…' : 'Complete Return'}</span>
            </button>
          )}

          {isCompleted && !isRefunded && (
            <button
              type="button"
              onClick={() => {
                setRefundAmountInput(String(refundAmount || ''));
                setIsRefundModalOpen(true);
              }}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4 stroke-[3]" />
              <span>Record Refund</span>
            </button>
          )}

          {isRefunded && (
            <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-black flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Refund Settled & Recorded</span>
            </div>
          )}
        </div>
      </footer>

      {/* 5. REFUND RECORDING MODAL */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <CreditCard className="h-5 w-5 text-[#55349A]" />
                <h3 className="text-base font-extrabold text-slate-900">Record Sales Refund</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRefundModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Refund Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={refundAmountInput}
                  onChange={(e) => setRefundAmountInput(e.target.value)}
                  placeholder={String(refundAmount || '0.00')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] font-bold text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Refund Settlement Status
                </label>
                <select
                  value={refundStatusInput}
                  onChange={(e) => setRefundStatusInput(e.target.value as RefundStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] font-medium text-xs text-slate-900 bg-white"
                >
                  <option value="REFUNDED">REFUNDED — Payout Settled</option>
                  <option value="PENDING">PENDING — Approval / Processing</option>
                  <option value="REJECTED">REJECTED — Refund Declined</option>
                  <option value="NONE">NONE — No Refund Required</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRefundModalOpen(false)}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={refundReturn.isPending}
                onClick={submitRefund}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md"
              >
                {refundReturn.isPending ? 'Saving…' : 'Save Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default SalesReturnDetailPage;
