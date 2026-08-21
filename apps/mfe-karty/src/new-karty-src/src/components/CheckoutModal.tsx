import React, { useState, useEffect } from 'react';
import { X, CheckCircle, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { cn } from '../lib/utils';
import { useCreatePaymentIn, PaymentDto } from '../../../services/usePaymentsIn';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payment: PaymentDto) => void;
  orderId: string;
  totalAmount: number;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  orderId,
  totalAmount
}) => {
  const [paymentMode, setPaymentMode] = useState<PaymentDto['mode']>('CASH');
  const [tenderedAmount, setTenderedAmount] = useState<string>(totalAmount.toString());

  const createPayment = useCreatePaymentIn();

  useEffect(() => {
    if (isOpen) {
      setPaymentMode('CASH');
      setTenderedAmount(totalAmount.toString());
    }
  }, [isOpen, totalAmount]);

  if (!isOpen) return null;

  const parsedTendered = parseFloat(tenderedAmount) || 0;
  const changeDue = Math.max(0, parsedTendered - totalAmount);
  const canCapture = paymentMode === 'CASH' ? parsedTendered >= totalAmount : true;

  const handleCapture = () => {
    const payload: PaymentDto = {
      amount: totalAmount,
      mode: paymentMode,
      paymentForRefId: orderId,
      description: `Payment for Order ${orderId}`
    };

    createPayment.mutate(payload, {
      onSuccess: (res) => {
        onSuccess(res);
      },
      onError: () => {}
    });
  };

  const paymentMethods = [
    { id: 'CASH', label: 'Cash', icon: Banknote },
    { id: 'UPI', label: 'UPI / QR', icon: Smartphone },
    { id: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard },
    { id: 'DEBIT_CARD', label: 'Debit Card', icon: CreditCard },
  ] as const;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Checkout</h2>
            <p className="text-sm text-slate-500">Order <span className="font-mono text-slate-700">{orderId}</span></p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">

          {/* Left Column: Payment Methods */}
          <div className="flex-1 space-y-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Payment Method</h3>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map(method => {
                const Icon = method.icon;
                const isSelected = paymentMode === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMode(method.id as any)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all",
                      isSelected
                        ? "border-[#55349A] bg-[#55349A]/5 text-[#55349A]"
                        : "border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <Icon className={cn("h-6 w-6 mb-2", isSelected ? "text-[#55349A]" : "text-slate-400")} />
                    <span className="text-sm font-semibold">{method.label}</span>
                  </button>
                );
              })}
            </div>

            {paymentMode === 'CASH' && (
              <div className="pt-4 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Amount Tendered</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                    <input
                      type="number"
                      value={tenderedAmount}
                      onChange={e => setTenderedAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-900 focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-sm font-bold text-slate-600">Change Due</span>
                  <span className={cn(
                    "text-xl font-black",
                    changeDue > 0 ? "text-emerald-600" : "text-slate-400"
                  )}>
                    ₹ {changeDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {paymentMode === 'UPI' && (
              <div className="pt-6 pb-2 border-t border-slate-100 flex flex-col items-center justify-center text-center animate-in slide-in-from-top-2">
                <div className="w-32 h-32 bg-slate-100 rounded-xl mb-4 flex items-center justify-center border-2 border-dashed border-slate-300">
                  <span className="text-slate-400 font-semibold text-sm">QR Code</span>
                </div>
                <p className="text-sm text-slate-500">Scan via any UPI App</p>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary */}
          <div className="md:w-[280px] bg-slate-50 rounded-2xl p-5 border border-slate-100 h-fit">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Summary</h3>

            <div className="space-y-3 mb-6 border-b border-slate-200/60 pb-6 text-sm">
              <div className="flex justify-between items-center text-slate-600">
                <span>Total Amount</span>
                <span className="font-semibold text-slate-900">₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="flex justify-between items-end mb-8">
              <span className="text-sm font-bold text-slate-500">To Pay</span>
              <span className="text-3xl font-black text-[#55349A]">
                ₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              onClick={handleCapture}
              disabled={!canCapture || createPayment.isPending}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-[#55349A] hover:bg-[#43297a] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
            >
              {createPayment.isPending ? (
                'Processing...'
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Capture Payment
                </>
              )}
            </button>
            {!canCapture && paymentMode === 'CASH' && (
              <p className="text-xs text-red-500 text-center mt-3 font-semibold">
                Tendered amount is less than total
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
