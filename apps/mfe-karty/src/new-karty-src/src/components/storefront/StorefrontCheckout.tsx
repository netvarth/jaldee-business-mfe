import React, { useState } from 'react';
import { useStorefrontCart } from './StorefrontCartProvider';
import { useNavigate } from 'react-router-dom';
import { Truck, CreditCard, ShieldCheck, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export const StorefrontCheckout = () => {
  const { cart, cartTotal, clearCart } = useStorefrontCart();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [shippingDetails, setShippingDetails] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    pincode: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'cod'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);

  const deliveryFee = 0;
  const grandTotal = cartTotal + deliveryFee;

  if (cart.length === 0 && step !== 3) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-black text-slate-900 mb-4">Your cart is empty</h2>
        <button
          onClick={() => navigate('/store')}
          className="text-[#55349A] font-bold hover:underline"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const handlePlaceOrder = () => {
    setIsProcessing(true);
    // Simulate API call to create order
    setTimeout(() => {
      setIsProcessing(false);
      clearCart();
      setStep(3);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Checkout</h1>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
          <span className={cn(step >= 1 ? "text-[#55349A]" : "")}>Shipping</span>
          <span className="text-slate-300">/</span>
          <span className={cn(step >= 2 ? "text-[#55349A]" : "")}>Payment</span>
          <span className="text-slate-300">/</span>
          <span className={cn(step === 3 ? "text-[#55349A]" : "")}>Confirmation</span>
        </div>
      </div>

      {step === 3 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xl">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Order Confirmed!</h2>
          <p className="text-lg text-slate-500 mb-8 max-w-md mx-auto">
            Thank you for shopping with us, {shippingDetails.name}. Your order has been placed successfully and will be shipped soon.
          </p>
          <div className="bg-slate-50 rounded-2xl p-6 mb-8 max-w-sm mx-auto border border-slate-100">
            <p className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">Order Reference</p>
            <p className="text-2xl font-black text-[#55349A] font-mono">ORD-{Math.floor(Math.random() * 90000) + 10000}</p>
          </div>
          <button
            onClick={() => navigate('/store')}
            className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-xl font-black transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Left Column: Form */}
          <div className="flex-1 space-y-6">
            {step === 1 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-[#55349A]" />
                  Shipping Details
                </h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Full Name</label>
                      <input
                        type="text"
                        value={shippingDetails.name}
                        onChange={e => setShippingDetails(d => ({ ...d, name: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Email Address</label>
                      <input
                        type="email"
                        value={shippingDetails.email}
                        onChange={e => setShippingDetails(d => ({ ...d, email: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Street Address</label>
                    <textarea
                      rows={2}
                      value={shippingDetails.address}
                      onChange={e => setShippingDetails(d => ({ ...d, address: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">City / Region</label>
                      <input
                        type="text"
                        value={shippingDetails.city}
                        onChange={e => setShippingDetails(d => ({ ...d, city: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Pincode</label>
                      <input
                        type="text"
                        value={shippingDetails.pincode}
                        onChange={e => setShippingDetails(d => ({ ...d, pincode: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    disabled={!shippingDetails.name || !shippingDetails.address || !shippingDetails.pincode}
                    className="w-full py-4 mt-4 bg-slate-900 hover:bg-black text-white font-black rounded-xl text-sm transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
                  >
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-[#55349A]" />
                    Payment Method
                  </h2>
                  <button onClick={() => setStep(1)} className="text-sm font-bold text-slate-400 hover:text-slate-600">
                    Back to Shipping
                  </button>
                </div>

                <div className="space-y-3 mb-8">
                  {[
                    { id: 'upi', label: 'UPI / QR Code', desc: 'Google Pay, PhonePe, Paytm' },
                    { id: 'card', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay' },
                    { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when you receive' }
                  ].map(method => (
                    <div
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id as any)}
                      className={cn(
                        "p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between",
                        paymentMethod === method.id
                          ? "border-[#55349A] bg-[#55349A]/5"
                          : "border-slate-100 hover:border-slate-300"
                      )}
                    >
                      <div>
                        <h4 className={cn("font-bold text-sm", paymentMethod === method.id ? "text-[#55349A]" : "text-slate-700")}>{method.label}</h4>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">{method.desc}</p>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        paymentMethod === method.id ? "border-[#55349A]" : "border-slate-300"
                      )}>
                        {paymentMethod === method.id && <div className="w-2.5 h-2.5 bg-[#55349A] rounded-full" />}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 py-3 rounded-xl border border-slate-100 mb-6">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Payments are secure and encrypted
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={isProcessing}
                  className="w-full py-4 bg-[#55349A] hover:bg-[#43297a] text-white font-black rounded-xl text-lg transition-all shadow-xl hover:shadow-2xl active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isProcessing ? 'Processing Payment...' : `Pay ₹ ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:w-80 shrink-0">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm sticky top-24">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Order Summary</h3>

              <div className="space-y-4 mb-6">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-start text-sm">
                    <div className="flex gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-slate-100 rounded-lg shrink-0 border border-slate-200 overflow-hidden">
                          {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                        </div>
                        <span className="absolute -top-2 -right-2 bg-slate-500 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                          {item.qty}
                        </span>
                      </div>
                      <div className="flex flex-col pt-0.5">
                        <span className="font-bold text-slate-800 line-clamp-2 leading-snug">{item.name}</span>
                        {item.variant && (
                          <span className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">{item.variant.size}</span>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-slate-900 pl-4 mt-0.5 whitespace-nowrap">
                      ₹ {(item.price * item.qty).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3 text-sm">
                <div className="flex justify-between items-center text-slate-500 font-semibold">
                  <span>Subtotal</span>
                  <span>₹ {cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 font-semibold">
                  <span>Shipping</span>
                  <span>₹ {deliveryFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 font-semibold">
                  <span>Tax</span>
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">Calculated in Total</span>
                </div>
              </div>

              <div className="border-t border-slate-200 mt-4 pt-4 flex justify-between items-end">
                <span className="text-sm font-black text-slate-900 uppercase tracking-wider">Total</span>
                <span className="text-2xl font-black text-[#55349A]">
                  ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
