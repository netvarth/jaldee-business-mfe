import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useItems } from '@/services/useItems';
import { useStorefrontCart } from '../StorefrontCartProvider';
import { StorefrontCartDrawer } from '../StorefrontCartDrawer';

// -------------------------------------------------------------
// BOLD LAYOUT
// -------------------------------------------------------------
export const Layout = () => {
  const { cartCount } = useStorefrontCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-black font-mono flex flex-col antialiased">
      <header className="border-4 border-black bg-yellow-300 py-5 sticky top-0 z-30 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] m-4">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link to="/store" className="text-2xl font-black uppercase tracking-tight">
            BOLD.CO
          </Link>
          <button
            onClick={() => setIsCartOpen(true)}
            className="bg-black text-white px-4 py-2 border-2 border-black font-bold uppercase tracking-wide hover:bg-white hover:text-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]"
          >
            BAG ({cartCount})
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <Outlet />
      </main>

      <footer className="border-t-4 border-black py-8 bg-black text-white text-xs font-mono uppercase mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <span>© 2026 BOLD.CO</span>
          <span>POWERED BY KARTY</span>
        </div>
      </footer>

      <StorefrontCartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

// -------------------------------------------------------------
// BOLD HOME
// -------------------------------------------------------------
export const Home = () => {
  const { data: items, isLoading } = useItems();
  const { addToCart } = useStorefrontCart();
  const activeItems = items?.filter(item => item.status === 'ACTIVE') || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 text-lg font-black uppercase tracking-wider">
        LOADING CATALOGUE...
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {/* High Contrast Banner */}
      <section className="bg-black text-white border-4 border-black p-10 md:p-16 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
          NO RETAIL MOCKERY.
        </h1>
        <p className="text-sm md:text-lg max-w-lg mb-8 text-yellow-300 font-bold uppercase">
          RAW STUFF ONLY. ZERO COMPROMISE.
        </p>
        <button className="bg-yellow-300 text-black px-8 py-3 border-2 border-black font-black uppercase hover:bg-white hover:text-black transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]">
          EXPLORE CATALOG
        </button>
      </section>

      {/* Grid of heavy boxes */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {activeItems.length === 0 ? (
          <p className="col-span-4 text-center text-lg font-black uppercase py-10">NO PRODUCTS DETECTED</p>
        ) : (
          activeItems.map(item => {
            const price = item.variants?.[0]?.price || 0;
            return (
              <div key={item.uid} className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col h-full">
                <div className="aspect-square bg-slate-100 border-2 border-black flex items-center justify-center relative overflow-hidden mb-4">
                  <span className="text-8xl font-black text-black select-none opacity-20">
                    {item.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <span className="bg-yellow-300 text-black text-[10px] font-black border border-black px-2 py-0.5 uppercase">
                      {item.categoryName || 'General'}
                    </span>
                    <h3 className="text-lg font-black uppercase mt-2">{item.name}</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-1">{item.sku}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t-2 border-black pt-4">
                    <span className="text-xl font-black">₹{price}</span>
                    <button
                      onClick={() => addToCart({ id: item.uid, name: item.name, price, qty: 1 })}
                      className="bg-black hover:bg-yellow-300 hover:text-black text-white p-2 border-2 border-black font-black transition-colors"
                    >
                      ADD TO BAG
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
};
