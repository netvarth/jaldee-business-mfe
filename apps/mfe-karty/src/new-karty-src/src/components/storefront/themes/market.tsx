import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShoppingBag, Search } from 'lucide-react';
import { useItems } from '@/services/useItems';
import { useStorefrontCart } from '../StorefrontCartProvider';
import { StorefrontCartDrawer } from '../StorefrontCartDrawer';

// -------------------------------------------------------------
// MARKET LAYOUT
// -------------------------------------------------------------
export const Layout = () => {
  const { cartCount, cartTotal } = useStorefrontCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col antialiased">
      <header className="bg-blue-600 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          <Link to="/store" className="text-2xl font-black tracking-tight flex items-center gap-2">
            <span className="bg-orange-500 text-white px-2.5 py-0.5 rounded-lg text-lg">Super</span>
            Market
          </Link>

          {/* Search bar inside header */}
          <div className="w-full md:w-96 relative">
            <input
              type="text"
              placeholder="Search weekly flyer deals..."
              className="w-full pl-10 pr-4 py-1.5 bg-white text-slate-800 rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-2.5" />
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-full text-xs font-black transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            Cart: ₹{cartTotal.toLocaleString()} ({cartCount})
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <Outlet />
      </main>

      <footer className="bg-slate-800 text-slate-400 py-8 text-xs font-semibold mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <span>© 2026 SuperMarket. All flyers and deals synced instantly.</span>
          <span>Powered by Karty Commerce Hub</span>
        </div>
      </footer>

      <StorefrontCartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

// -------------------------------------------------------------
// MARKET HOME
// -------------------------------------------------------------
export const Home = () => {
  const { data: items, isLoading } = useItems();
  const { addToCart } = useStorefrontCart();
  const activeItems = items?.filter(item => item.status === 'ACTIVE') || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 text-sm font-bold text-slate-500">
        Loading fresh deals...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Deals banner */}
      <section className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-6 rounded-2xl shadow-md flex justify-between items-center flex-wrap gap-4">
        <div>
          <span className="bg-white text-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            Flyer Deals
          </span>
          <h2 className="text-xl md:text-3xl font-black mt-2">Low Price Guarantee!</h2>
          <p className="text-xs md:text-sm font-semibold opacity-90 mt-1">Stock up now before the weekly flyer changes.</p>
        </div>
        <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl text-center">
          <span className="text-2xl font-black text-white">UP TO 50% OFF</span>
        </div>
      </section>

      {/* Dense Deals Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {activeItems.length === 0 ? (
          <p className="col-span-6 text-center text-sm font-bold py-10 text-slate-400 bg-white rounded-2xl border border-slate-200">No flyer deals currently listed.</p>
        ) : (
          activeItems.map(item => {
            const price = item.variants?.[0]?.price || 0;
            return (
              <div key={item.uid} className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="aspect-square bg-slate-50 rounded-lg flex items-center justify-center relative overflow-hidden mb-2">
                    <span className="text-4xl font-black text-slate-200">
                      {item.name.charAt(0)}
                    </span>
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                      Sale
                    </span>
                  </div>
                  <span className="text-[9px] font-black text-blue-600 uppercase">
                    {item.categoryName || 'General'}
                  </span>
                  <h3 className="text-xs font-bold text-slate-800 line-clamp-2 mt-1 leading-snug">{item.name}</h3>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-100">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-black text-slate-900">₹{price}</span>
                    <span className="text-[9px] text-slate-400 line-through">₹{Math.floor(price * 1.3)}</span>
                  </div>
                  <button
                    onClick={() => addToCart({ id: item.uid, name: item.name, price, qty: 1 })}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-1.5 rounded-lg text-[10px] font-bold transition-colors mt-2"
                  >
                    Add to Cart
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
