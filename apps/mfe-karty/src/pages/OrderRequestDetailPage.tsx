import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, X, Clock, ShoppingCart, User,
  Store, FileText, AlertCircle, CheckCircle2, XCircle, RefreshCw,
  Truck, ShieldCheck, Mail, Phone, ExternalLink, Zap, Sparkles,
  ChevronRight, Building2, Tag, Receipt, Share2, Printer, MessageCircle
} from 'lucide-react';
import {
  useOrderRequest,
  useUpdateOrderRequestStatus,
  useConvertOrderRequest,
  type OrderRequest
} from '../services/useOrderRequests';
import { useStores } from '../services/useStores';
import { useCustomers } from '../services/useCustomers';
import { useItems } from '../services/useItems';
import { cn } from '../new-karty-src/src/lib/utils';

interface OrderRequestDetailProps {
  initialRequest?: OrderRequest;
  onBack?: () => void;
}

export function OrderRequestDetailPage({ initialRequest, onBack }: OrderRequestDetailProps) {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const targetUid = initialRequest?.uid || uid;

  const { data: fetchedRequest, isLoading, error } = useOrderRequest(targetUid);
  const request: OrderRequest | undefined = initialRequest || fetchedRequest;

  const storesQ = useStores();
  const customersQ = useCustomers("", 0, 200);
  const itemsQ = useItems();

  const updateStatus = useUpdateOrderRequestStatus();
  const convertToOrder = useConvertOrderRequest();

  const [showShareModal, setShowShareModal] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/orders');
    }
  };

  const storeObj = (storesQ.data ?? []).find((s: any) => (s.id ?? s.uid) === request?.storeUid);
  const customerObj = (customersQ.data ?? []).find((c: any) => c.uid === request?.consumerUid);

  const hasRealCustomer = !!request?.consumerUid && request.consumerUid !== 'GUEST';

  const customerName = (request as any)?.consumerName ||
    customerObj?.displayName ||
    [customerObj?.firstName, customerObj?.lastName].filter(Boolean).join(" ") ||
    (hasRealCustomer ? `Customer #${request?.consumerUid?.slice(0, 8)}` : "Walk-in / Guest Customer");

  const customerPhone = customerObj?.primaryNumber || customerObj?.phone || (request as any)?.consumerPhone || null;
  const customerEmail = customerObj?.email || (request as any)?.consumerEmail || null;
  const customerCrmNo = customerObj?.consumerNo || (hasRealCustomer ? request?.consumerUid?.slice(0, 8) : null);

  const customerInitials = hasRealCustomer
    ? customerName.split(/\s+/).map((n: string) => n?.[0] || '').join('').substring(0, 2).toUpperCase()
    : 'WK';

  const status = String(request?.status || 'PENDING').toUpperCase();

  const isPending = status === 'PENDING' || status === 'DRAFT';
  const isInReview = status === 'IN_REVIEW';
  const isApproved = status === 'APPROVED';
  const isConverted = status === 'CONVERTED';
  const isRejected = status === 'REJECTED' || status === 'CANCELLED';

  const canConvert = !isConverted && !isRejected;

  const items = request?.items || [];
  const itemsCount = request?.itemsCount ?? items.length ?? 1;
  const totalAmount = Number(request?.totalAmount || 0);

  const reqNumber = request?.requestNo || (request?.uid ? `REQ-${request.uid.slice(0, 8).toUpperCase()}` : 'REQ-0001');

  const handleConvert = () => {
    if (!targetUid) return;
    convertToOrder.mutate(targetUid, {
      onSuccess: (data: any) => {
        const orderUid = data?.uid || data?.id;
        if (orderUid) {
          navigate(`/orders/${orderUid}`);
        } else {
          navigate('/orders');
        }
      }
    });
  };

  const getQuotationShareText = () => {
    const linesText = items.length > 0
      ? items.map((it: any) => `• ${it.itemName || it.name} (${it.qty || 1} x ₹${it.unitPrice || it.price || 0}) = ₹${(it.qty || 1) * (it.unitPrice || it.price || 0)}`).join('\n')
      : `• Commercial Package = ₹${totalAmount}`;

    return `*COMMERCIAL QUOTATION / ESTIMATE*\nQuotation Ref: #${reqNumber}\nStore: ${storeObj?.name || 'Main Fulfillment Hub'}\nCustomer: ${customerName}\n\n*Line Items:*\n${linesText}\n\n*Estimated Total: ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n\nPlease reply to confirm this quotation and convert it into a confirmed order. Thank you!`;
  };

  const handleSendWhatsApp = () => {
    const text = getQuotationShareText();
    const cleanPhone = (customerPhone || '').replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setShowShareModal(false);
  };

  const handleSendEmail = () => {
    const text = getQuotationShareText();
    const subject = `Quotation #${reqNumber} from ${storeObj?.name || 'Store'}`;
    const url = `mailto:${customerEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setShowShareModal(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading && !request) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-16 bg-[#FAF9F6]">
        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#55349A] flex items-center justify-center mb-4 shadow-sm animate-pulse">
          <RefreshCw className="h-6 w-6 animate-spin stroke-[2.5]" />
        </div>
        <span className="text-sm font-black text-slate-800 tracking-tight">Loading Quotation & Request...</span>
        <span className="text-xs text-slate-400 mt-1">Retrieving live line items and customer data</span>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-16 bg-[#FAF9F6]">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
          <AlertCircle className="h-6 w-6 stroke-[2.5]" />
        </div>
        <h3 className="text-base font-black text-slate-900">Quotation / Request Not Found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-5">{(error as Error)?.message || 'The requested quotation could not be loaded.'}</p>
        <button
          onClick={handleBack}
          className="px-5 py-2.5 bg-[#55349A] hover:bg-[#43287A] text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer"
        >
          Return to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] max-h-[calc(100vh-56px)] flex flex-col bg-[#F8FAFC] font-sans overflow-hidden">

      {/* Print Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .quotation-print-area, .quotation-print-area * {
            visibility: visible;
          }
          .quotation-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 24px;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* 1. TOP STICKY HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 shrink-0 z-20 shadow-3xs no-print">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-all shadow-3xs shrink-0 cursor-pointer active:scale-95"
            title="Back to Orders"
          >
            <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>Quotation #{reqNumber}</span>
              </h2>

              {/* Status Badge */}
              <span className={cn(
                "text-[10.5px] font-mono font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1.5",
                isConverted ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                isApproved ? "bg-blue-100 text-blue-800 border border-blue-200" :
                isInReview ? "bg-purple-100 text-[#55349A] border border-[#55349A]/20" :
                isRejected ? "bg-rose-100 text-rose-800 border border-rose-200" :
                "bg-amber-100 text-amber-900 border border-amber-200"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isConverted ? "bg-emerald-500" :
                  isApproved ? "bg-blue-500" :
                  isInReview ? "bg-[#55349A]" :
                  isRejected ? "bg-rose-500" :
                  "bg-amber-500"
                )} />
                {status}
              </span>

              {/* Store Badge */}
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 font-mono uppercase truncate max-w-[220px]">
                🏪 {storeObj?.name || 'Main Fulfillment Hub'}
              </span>

              {/* Channel */}
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 font-mono uppercase">
                {request?.channel || 'Online / Quotation'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Requested {request?.requestDate ? new Date(request.requestDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today'} · {itemsCount} Line Item(s) · Total ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Share & Print Buttons */}
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-purple-50 hover:text-[#55349A] text-slate-700 rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer border border-slate-200"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Send Quotation</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer border border-slate-200"
            title="Print Quotation"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </button>

          {canConvert && (
            <>
              {/* Reject Action */}
              <button
                type="button"
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ uid: targetUid!, status: 'REJECTED' })}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Reject
              </button>

              {/* Convert to Order - PROMINENT PRIMARY ACTION */}
              <button
                type="button"
                disabled={convertToOrder.isPending}
                onClick={handleConvert}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#55349A] to-[#6E42C1] hover:from-[#43287A] hover:to-[#55349A] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5 fill-current" />
                <span>{convertToOrder.isPending ? 'Converting…' : 'Convert to Order →'}</span>
              </button>
            </>
          )}

          {isConverted && (
            <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-black flex items-center gap-2 shadow-2xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Converted to Order</span>
            </div>
          )}

          {isRejected && (
            <div className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-black flex items-center gap-2 shadow-2xs">
              <XCircle className="h-4 w-4 text-rose-600" />
              <span>Request Rejected</span>
            </div>
          )}
        </div>
      </header>

      {/* 2. PROGRESS TIMELINE */}
      <div className="bg-white border-b border-slate-200 px-8 py-3 shrink-0 shadow-3xs no-print">
        <div className="max-w-5xl mx-auto flex items-center justify-between relative">

          {/* Step 1: Request Received */}
          <div className="flex items-center gap-2.5 z-10 bg-white pr-3">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
              ✓
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 leading-none">Request Received</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none">Inquiry Created</div>
            </div>
          </div>

          <div className="flex-1 h-0.5 bg-emerald-500 mx-2" />

          {/* Step 2: Customer Linked */}
          <div className="flex items-center gap-2.5 z-10 bg-white px-3">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
              ✓
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 leading-none">
                {hasRealCustomer ? 'Customer Linked' : 'Guest Inquiry'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none truncate max-w-[140px]">
                {customerName}
              </div>
            </div>
          </div>

          <div className={cn("flex-1 h-0.5 mx-2", (isApproved || isConverted) ? "bg-emerald-500" : (isInReview ? "bg-[#55349A]" : "bg-slate-200"))} />

          {/* Step 3: Quotation & Review */}
          <div className="flex items-center gap-2.5 z-10 bg-white px-3">
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-xs",
              (isApproved || isConverted) ? "bg-emerald-600 text-white" :
              isInReview ? "bg-[#55349A] text-white" :
              isRejected ? "bg-rose-500 text-white" :
              "bg-purple-100 text-[#55349A] border border-[#55349A]/30"
            )}>
              {(isApproved || isConverted) ? '✓' : isInReview ? '⏳' : isRejected ? '✕' : '3'}
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 leading-none">
                {isApproved ? 'Approved' : isInReview ? 'In Review' : isRejected ? 'Rejected' : 'Quotation Ready'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none">
                {isApproved ? 'Ready to Convert' : isRejected ? 'Declined' : 'Ready for Order'}
              </div>
            </div>
          </div>

          <div className={cn("flex-1 h-0.5 mx-2", isConverted ? "bg-emerald-500" : "bg-slate-200")} />

          {/* Step 4: Converted Order */}
          <div className="flex items-center gap-2.5 z-10 bg-white pl-3">
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-xs",
              isConverted ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400 border border-slate-200"
            )}>
              {isConverted ? '✓' : '4'}
            </div>
            <div>
              <div className={cn("text-xs font-black leading-none", isConverted ? "text-slate-900" : "text-slate-400")}>
                Converted Order
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none">
                {isConverted ? 'Confirmed Order Placed' : 'Final Step'}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. MAIN WORKSPACE / PRINT AREA */}
      <div className="flex-1 overflow-y-auto p-5 md:p-6 min-h-0 bg-[#F8FAFC] quotation-print-area">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* LEFT COLUMN: REQUESTED ITEMS & STORE SCOPE (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">

            {/* CARD 1: REQUESTED ITEMS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-[#55349A]" />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Requested Items ({itemsCount} units)
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">
                  {storeObj?.name || 'Main Store'}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Product / Description</th>
                      <th className="py-2.5 px-2 text-right">Unit Price</th>
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.length > 0 ? (
                      items.map((item: any, idx: number) => {
                        const pName = item.itemName || item.name || item.productName || 'Quotation Product';
                        const pPrice = Number(item.unitPrice || item.price || 0);
                        const pQty = Number(item.qty || item.quantity || 1);
                        const pTotal = Number(item.lineTotal || (pPrice * pQty));
                        const pUnit = item.unitName || item.unit || 'Unit';
                        const pSku = item.sku || item.code || '';

                        return (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#55349A] flex items-center justify-center font-black text-xs shrink-0 border border-purple-100">
                                  {pName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 text-xs truncate max-w-[200px]">
                                    {pName}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    {pUnit} {pSku && `· ${pSku}`}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right font-mono text-slate-700 font-semibold">
                              ₹{pPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-2 text-center font-mono">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-xs text-slate-800">
                                {pQty}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                              ₹{pTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-900 text-xs truncate max-w-[220px]">
                            Custom Quotation / Requested Package
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Ref: {(request?.uid || 'ENQUIRY').slice(0, 8).toUpperCase()}
                          </div>
                        </td>
                        <td className="py-3.5 px-2 text-right font-mono text-slate-700 font-semibold">
                          ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono">
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 font-bold text-xs text-slate-800">
                            {itemsCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-black text-slate-900">
                          ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CARD 2: STORE & FULFILLMENT SCOPE */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-[#55349A]" />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Store & Fulfillment Scope
                  </h3>
                </div>
                <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                  Store Quotation
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Assigned Store</span>
                  <p className="text-slate-900 font-bold text-xs">
                    {storeObj?.name || 'Main Retail & Distribution Hub'}
                  </p>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    {storeObj?.address || 'Active Store Location'}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Enquiry Channel:</span>
                    <span className="font-bold text-slate-800">Online Store / Web</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quote Status:</span>
                    <span className="font-bold text-slate-800">{status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Conversion State:</span>
                    <span className={cn("font-bold", isConverted ? "text-emerald-700" : "text-amber-700")}>
                      {isConverted ? "Ready & Converted" : "Awaiting Conversion"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: NOTES & SPECIAL REMARKS */}
            {request?.notes && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 shadow-3xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-900" />
                  <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                    Customer Instructions / Remarks
                  </h4>
                </div>
                <p className="text-xs text-slate-800 font-medium leading-relaxed">
                  {request.notes}
                </p>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: CUSTOMER PROFILE & COMMERCIAL ESTIMATE (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">

            {/* CARD 4: CUSTOMER PROFILE */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-[#55349A]" />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Customer Profile
                  </h3>
                </div>
                {hasRealCustomer ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/customers/${request?.consumerUid}`)}
                    className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 hover:bg-emerald-200 cursor-pointer flex items-center gap-1"
                  >
                    <span>CRM Profile</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                ) : (
                  <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    Walk-in Guest
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#55349A] to-[#8E24AA] text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                    {customerInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-slate-900 truncate">
                      {customerName}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                      {customerCrmNo ? (
                        <>CRM ID: <span className="font-bold text-slate-700">#{customerCrmNo}</span></>
                      ) : (
                        <span className="text-slate-400">Guest / Unregistered</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Phone</span>
                    <span className="font-bold text-slate-800 text-xs font-mono">
                      {customerPhone || '— (Not provided)'}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Email</span>
                    <span className="font-bold text-slate-800 truncate block text-xs">
                      {customerEmail || '— (Not provided)'}
                    </span>
                  </div>
                </div>

                {/* Quick Share Buttons on Card */}
                <div className="pt-1 flex items-center gap-2 no-print">
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <span>WhatsApp Quote</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Mail className="h-3.5 w-3.5 text-slate-600" />
                    <span>Email Quote</span>
                  </button>
                </div>
              </div>
            </div>

            {/* CARD 5: COMMERCIAL VALUE & TAX ESTIMATE */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Quotation & Value Estimate
                </h3>
                <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                  ESTIMATE
                </span>
              </div>

              {(() => {
                const subtotal = totalAmount > 0 ? (totalAmount / 1.18) : 0;
                const taxAmt = totalAmount > 0 ? (totalAmount - subtotal) : 0;
                return (
                  <div className="space-y-2 text-xs font-medium text-slate-600">
                    <div className="flex justify-between">
                      <span>Items Subtotal</span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Estimated GST (18%)</span>
                      <span className="font-mono font-medium text-slate-700">₹{taxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery / Shipping Fee</span>
                      <span className="font-bold text-emerald-700">FREE</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2.5 border-t border-slate-100">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wide">Estimated Total</span>
                      <span className="text-base font-black text-[#55349A] font-mono">
                        ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* CARD 6: CONVERT TO ORDER CARD */}
            <div className="bg-gradient-to-br from-purple-50 via-white to-slate-50 border border-purple-200 rounded-2xl p-5 shadow-3xs space-y-3.5 no-print">
              <div className="flex items-center gap-2 border-b border-purple-100 pb-2">
                <Zap className="h-4 w-4 text-[#55349A]" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Order Conversion Action
                </h4>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {isConverted
                  ? "This request was successfully converted to an active confirmed order."
                  : isRejected
                    ? "This request was rejected and cannot be converted."
                    : "Convert this approved quotation into a live confirmed order to reserve stock, generate tax invoice, and process fulfillment."}
              </p>

              {canConvert && (
                <button
                  type="button"
                  disabled={convertToOrder.isPending}
                  onClick={handleConvert}
                  className="w-full py-3 bg-[#55349A] hover:bg-[#43287A] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="h-4 w-4 fill-current" />
                  <span>{convertToOrder.isPending ? 'Converting to Order…' : 'Convert to Active Order →'}</span>
                </button>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Share / Send Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-[#55349A] flex items-center justify-center font-bold">
                  <Share2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Send Quotation to Customer</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Ref: #{reqNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 font-mono text-slate-700">
              <div className="font-bold text-slate-900">Quotation Summary:</div>
              <div>Customer: {customerName}</div>
              <div>Phone: {customerPhone || 'Not provided'}</div>
              <div>Total Amount: ₹{totalAmount.toLocaleString('en-IN')}</div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Send via WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleSendEmail}
                className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Mail className="h-4 w-4" />
                <span>Send via Email</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowShareModal(false);
                  handlePrint();
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Quotation Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
