import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, X, Plus, Minus, Trash2 } from 'lucide-react';
import { useStorefrontCart } from './StorefrontCartProvider';

interface StorefrontCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorefrontCartDrawer = ({ isOpen, onClose }: StorefrontCartDrawerProps) => {
  const { cart, cartTotal, updateQty, removeFromCart } = useStorefrontCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">

        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#55349A]" />
            Your Cart
          </h2>
          <button onClick={onClose} className="p-2 bg-white text-slate-400 hover:text-slate-600 rounded-full shadow-sm">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <p className="text-slate-500 font-semibold">Your cart is empty.</p>
              <button onClick={onClose} className="text-[#55349A] font-bold text-sm hover:underline">
                Continue Shopping
              </button>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-4 items-center bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-slate-300 uppercase">Image</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">{item.name}</h4>
                  <p className="text-sm font-black text-[#55349A] mt-1">₹ {item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-100">
                    <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-white rounded shadow-sm text-slate-500 hover:text-slate-900 transition-colors">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-black w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-white rounded shadow-sm text-slate-500 hover:text-slate-900 transition-colors">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-5 bg-slate-50 border-t border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Subtotal</span>
              <span className="text-xl font-black text-slate-900">
                ₹ {cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <button
              onClick={() => {
                onClose();
                navigate('/store/checkout');
              }}
              className="w-full py-4 bg-slate-900 hover:bg-black text-white font-black rounded-xl text-sm transition-all shadow-xl hover:shadow-2xl active:scale-[0.98]"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
