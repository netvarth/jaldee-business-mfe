import { Input } from "@jaldee/design-system";
import { useMFEProps } from "@jaldee/auth-context";
import { useState } from "react";
import { createPortal } from "react-dom";
import { BookingDetails } from "../../types";
import { BookingFinance, PayInput, PaymentRecord } from "../../services/useBookingDetails";
import { formatIsoTime } from "../../utils/dateTime";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  details: BookingDetails | null;
  finance: BookingFinance | null;
  payments?: PaymentRecord[];
  onPay?: (input: PayInput) => Promise<void>;
}

export default function InvoiceModal({ isOpen, onClose, details, finance, payments, onPay }: Props) {
  const mfeProps = useMFEProps();
  const [isPaying, setIsPaying] = useState(false);
  const [payAmount, setPayAmount] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);
  
  if (!isOpen || !details) return null;

  const invoiceNumber = finance?.invoiceNumber || "N/A";
  const clinicName = mfeProps?.account?.name || "Jaldee Business";
  const clinicAddress = mfeProps?.location?.name || "";
  
  const patientName = details.customerName || "Walk-in";
  const patientPhone = details.customerPhone || "";
  const patientId = details.customerUid ? `PT-${details.customerUid.substring(0, 4).toUpperCase()}` : "";
  
  const providerName = details.userName || details.providerName || "No provider assigned";
  const date = new Date(details.bookingDate || Date.now()).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });

  const serviceName = details.serviceName || "Consultation";
  const amountDue = finance?.amountDue ?? details.amountDue ?? details.price ?? 0;
  const amountPaid = finance?.amountPaid ?? details.amountPaid ?? 0;
  const totalAmount = amountDue + amountPaid;

  const isPaid = finance?.paymentStatus === "PAID" || finance?.paymentStatus === "Settled";
  const paymentStatusText = isPaid ? "PAID (ONLINE UPI)" : (finance?.paymentStatus || "UNPAID");

  const container = document.getElementById("calendar-page-container") || document.body;

  return createPortal(
    <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/40 animate-in fade-in-0" onClick={onClose}>
      <div className="w-full max-w-2xl mx-4 bg-white rounded-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-[#1a1b25] uppercase tracking-wide">
              INVOICE
            </h2>
              <div className="text-sm font-semibold text-[#8a92a6] mt-1">{invoiceNumber}</div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            {/* Clinic Info & Status */}
            <div className="flex justify-between items-start mb-8">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded bg-[#4b3394] text-white flex items-center justify-center font-bold text-lg">
                  {clinicName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1a1b25]">{clinicName}</h3>
                  <p className="text-sm font-semibold text-[#8a92a6] mt-0.5">{clinicAddress}</p>
                </div>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-xs font-bold ${isPaid ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                {paymentStatusText}
              </div>
            </div>

            {/* Grids */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-5">
                <div className="text-xs font-bold text-[#8a92a6] uppercase tracking-wider mb-3">Billed To</div>
                <div className="text-sm font-bold text-[#1a1b25] mb-1">{patientName}</div>
                <div className="text-sm font-semibold text-[#8a92a6] mb-1">{patientPhone}</div>
                <div className="text-sm font-semibold text-[#8a92a6]">{patientId}</div>
              </div>
              <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-5 overflow-hidden">
                <div className="text-xs font-bold text-[#8a92a6] uppercase tracking-wider mb-3">Details</div>
                <div className="text-sm font-bold text-[#1a1b25] mb-1 truncate" title={details.calendarName || "Calendar"}>{details.calendarName || "Calendar"}</div>
                <div className="text-sm font-semibold text-[#8a92a6] mb-1 truncate" title={providerName}>{providerName}</div>
                <div className="text-sm font-semibold text-[#8a92a6] truncate" title={serviceName}>{serviceName}</div>
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="flex justify-between px-5 py-3 bg-slate-50/80 border-b border-slate-100">
                <div className="text-xs font-bold text-[#8a92a6] uppercase tracking-wider">Description</div>
                <div className="text-xs font-bold text-[#8a92a6] uppercase tracking-wider">Amount</div>
              </div>
              
              <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
                <div>
                  <div className="text-sm font-bold text-[#1a1b25] mb-0.5">{serviceName}</div>
                  <div className="text-xs font-semibold text-[#8a92a6]">{date} {details.bookingDate ? `at ${formatIsoTime(details.bookingDate)}` : ''}</div>
                </div>
                <div className="text-sm font-bold text-[#1a1b25]">₹{totalAmount}</div>
              </div>

              {amountPaid > 0 && (
                <>
                  <div 
                    className={`flex justify-between items-center px-5 py-3 border-b border-slate-100 bg-slate-50/30 ${payments && payments.length > 0 ? 'cursor-pointer hover:bg-slate-50/50 transition-colors' : ''}`}
                    onClick={() => { if (payments && payments.length > 0) setShowHistory(!showHistory); }}
                  >
                    <div className="text-sm font-semibold text-[#8a92a6]">Amount Paid</div>
                    <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-green-600">₹{amountPaid}</div>
                        {payments && payments.length > 0 && (
                            <svg className={`w-4 h-4 text-slate-400 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        )}
                    </div>
                  </div>
                  {showHistory && payments && payments.length > 0 && (
                      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 space-y-3 shadow-inner">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Payment History</div>
                          {payments.map((p, i) => (
                              <div key={i} className="flex justify-between items-center">
                                  <div>
                                      <div className="text-sm font-bold text-slate-700">{p.mode || 'Cash'}</div>
                                      <div className="text-[11px] font-semibold text-slate-500">{new Date(p.paymentOn || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                  </div>
                                  <div className="text-sm font-bold text-green-600">₹{p.amount}</div>
                              </div>
                          ))}
                      </div>
                  )}
                </>
              )}

              <div className="flex justify-between items-center px-5 py-4 bg-slate-50/80">
                <div className="text-sm font-bold text-[#1a1b25] uppercase tracking-wider">{amountDue === 0 ? 'Total' : 'Amount Due'}</div>
                <div className="text-lg font-bold text-[#4b3394]">₹{amountDue}</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 pt-2">
            {!isPaying ? (
              <button 
                type="button" 
                onClick={() => {
                  setPayAmount(amountDue.toString());
                  setIsPaying(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#4b3394] text-white font-bold text-sm hover:bg-[#3d297a] transition-colors shadow-sm"
              >
                Pay Invoice
              </button>
            ) : (
              <div className="border border-slate-100 bg-slate-50 rounded-xl p-4 space-y-4">
                <div className="text-sm font-bold text-[#1a1b25] mb-2">Record Payment</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#8a92a6] mb-1">Amount</label>
                    <Input 
                      type="number" 
                      value={payAmount} 
                      onChange={(e) => setPayAmount(e.target.value)} 
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#8a92a6] mb-1">Mode</label>
                    <div className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-500 font-medium">Cash</div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end mt-4">
                  <button type="button" onClick={() => setIsPaying(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                  <button 
                    type="button" 
                    onClick={async () => {
                      if (!onPay) return;
                      await onPay({
                        amount: Number(payAmount),
                        mode: "Cash",
                        acceptedBy: "CASH",
                        paymentOn: new Date().toISOString(),
                        transactionId: "string",
                        note: "string"
                      });
                      setIsPaying(false);
                      onClose();
                    }} 
                    disabled={!payAmount || Number(payAmount) <= 0}
                    className="px-4 py-2 rounded-lg bg-[#4b3394] text-white text-sm font-bold hover:bg-[#3d297a] disabled:opacity-50"
                  >
                    Confirm Payment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>,
      container
    );
}
