import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShoppingBag, Eye } from 'lucide-react';
import { useItems } from '@/services/useItems';
import { useStorefrontCart } from '../StorefrontCartProvider';
import { StorefrontCartDrawer } from '../StorefrontCartDrawer';

// -------------------------------------------------------------
// DARK LAYOUT
// -------------------------------------------------------------
export const Layout = () => {
  const { cartCount } = useStorefrontCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col antialiased">
      <header className="border-b border-slate-900 py-5 sticky top-0 bg-slate-950/80 backdrop-blur-md z-30">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <Link to="/store" className="text-xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-wider">
            NEON.STORE
          </Link>
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2 border border-slate-800 hover:border-indigo-500 hover:text-indigo-400 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shadow-[0_0_15px_rgba(99,102,241,0.05)] hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]"
          >
            Cart ({cartCount})
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        <Outlet />
      </main>

      <footer className="border-t border-slate-900 py-10 bg-slate-950 text-xs text-slate-600 tracking-wider uppercase mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <span>© 2026 NEON.STORE</span>
          <span>Powered by Karty Node</span>
        </div>
      </footer>

      <StorefrontCartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

// -------------------------------------------------------------
// DARK HOME
// -------------------------------------------------------------
export const Home = () => {
  const { data: items, isLoading } = useItems();
  const { addToCart } = useStorefrontCart();
  const activeItems = items?.filter(item => item.status === 'ACTIVE') || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 text-xs tracking-widest uppercase text-slate-500">
        Loading Neon Grid...
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {/* Editorial dark hero */}
      <section className="py-16 text-center max-w-2xl mx-auto space-y-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
          Future of Shopping is Dark.
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          Premium collection of curated tech and apparel item profiles designed for the modern lifestyle.
        </p>
      </section>

      {/* Glow Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {activeItems.length === 0 ? (
          <p className="col-span-4 text-center text-xs tracking-widest uppercase text-slate-600 py-10">No glowing items detected</p>
        ) : (
          activeItems.map(item => {
            const price = item.variants?.[0]?.price || 0;
            return (
              <div key={item.uid} className="bg-slate-900 border border-slate-800/80 hover:border-indigo-500/50 p-5 rounded-2xl flex flex-col justify-between hover:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all duration-300">
                <div>
                  <div className="aspect-square bg-slate-950 rounded-xl flex items-center justify-center relative overflow-hidden mb-4 border border-slate-900">
                    <span className="text-6xl font-black text-slate-800">
                      {item.name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-900/30">
                    {item.categoryName || 'General'}
                  </span>
                  <h3 className="text-base font-extrabold text-white mt-2 tracking-tight">{item.name}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">{item.sku}</p>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
                  <span className="text-lg font-black text-indigo-300">₹{price}</span>
                  <button
                    onClick={() => addToCart({ id: item.uid, name: item.name, price, qty: 1 })}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-[0_0_10px_rgba(99,102,241,0.3)] hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
};
