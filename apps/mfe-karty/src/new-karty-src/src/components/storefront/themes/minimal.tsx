import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useItems } from '@/services/useItems';
import { useStorefrontCart } from '../StorefrontCartProvider';
import { StorefrontCartDrawer } from '../StorefrontCartDrawer';

// -------------------------------------------------------------
// MINIMAL LAYOUT
// -------------------------------------------------------------
export const Layout = () => {
  const { cartCount } = useStorefrontCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#111111] font-sans flex flex-col antialiased">
      <header className="border-b border-[#EEEEEE] py-6 sticky top-0 bg-[#FDFDFD]/90 backdrop-blur-sm z-30">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <Link to="/store" className="text-lg font-medium tracking-widest uppercase">
            Minimalist
          </Link>
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-1.5 text-sm uppercase tracking-wider hover:opacity-60 transition-opacity"
          >
            Cart ({cartCount})
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        <Outlet />
      </main>

      <footer className="border-t border-[#EEEEEE] py-10 mt-auto text-xs text-[#888888] tracking-widest uppercase">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <span>© 2026 Minimalist. All Rights Reserved.</span>
          <span>Powered by Karty</span>
        </div>
      </footer>

      <StorefrontCartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

// -------------------------------------------------------------
// MINIMAL HOME
// -------------------------------------------------------------
export const Home = () => {
  const { data: items, isLoading } = useItems();
  const { addToCart } = useStorefrontCart();
  const activeItems = items?.filter(item => item.status === 'ACTIVE') || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 text-xs tracking-widest uppercase text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-20">
      {/* Editorial Hero */}
      <section className="py-20 text-center max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl md:text-4xl font-light tracking-widest uppercase leading-snug">
          Simplicity is the ultimate sophistication.
        </h1>
        <p className="text-sm text-slate-500 font-light leading-relaxed max-w-md mx-auto">
          Thoughtfully designed products that elevate your everyday routine. Experience beauty in detail.
        </p>
      </section>

      {/* Sparse Product Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-16">
        {activeItems.length === 0 ? (
          <p className="col-span-3 text-center text-xs tracking-widest uppercase text-slate-400 py-10">No items available</p>
        ) : (
          activeItems.map(item => {
            const price = item.variants?.[0]?.price || 0;
            return (
              <div key={item.uid} className="group space-y-4">
                <div className="aspect-[3/4] bg-[#F7F7F7] flex items-center justify-center relative overflow-hidden">
                  <span className="text-5xl font-extralight text-[#D2D2D2]">
                    {item.name.charAt(0)}
                  </span>
                  <button
                    onClick={() => addToCart({ id: item.uid, name: item.name, price, qty: 1 })}
                    className="absolute bottom-4 right-4 bg-white border border-[#E0E0E0] px-4 py-2 text-xs uppercase tracking-wider hover:bg-black hover:text-white transition-colors duration-300 opacity-0 group-hover:opacity-100"
                  >
                    Quick Add
                  </button>
                </div>
                <div className="flex justify-between items-start text-xs tracking-widest uppercase pt-2">
                  <div className="space-y-1">
                    <h3 className="font-medium text-[#111]">{item.name}</h3>
                    <p className="text-[10px] text-slate-400">{item.categoryName || 'General'}</p>
                  </div>
                  <span className="font-semibold">₹{price}</span>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
};
