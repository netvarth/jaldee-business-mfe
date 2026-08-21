import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useItems } from '@/services/useItems';
import { useStorefrontCart } from '../StorefrontCartProvider';
import { StorefrontCartDrawer } from '../StorefrontCartDrawer';

// -------------------------------------------------------------
// BOUTIQUE LAYOUT
// -------------------------------------------------------------
export const Layout = () => {
  const { cartCount } = useStorefrontCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#2C2620] font-serif flex flex-col antialiased">
      <header className="border-b border-[#E6DEC9] py-8 sticky top-0 bg-[#FAF6F0]/95 backdrop-blur-sm z-30">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <Link to="/store" className="text-xl font-normal tracking-[0.2em] italic">
            La Boutique
          </Link>
          <button
            onClick={() => setIsCartOpen(true)}
            className="text-xs uppercase tracking-[0.15em] border-b border-[#2C2620] pb-1 hover:opacity-60 transition-opacity"
          >
            PANIER ({cartCount})
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        <Outlet />
      </main>

      <footer className="border-t border-[#E6DEC9] py-12 bg-[#FAF6F0] text-xs text-[#7F7264] tracking-[0.15em] uppercase font-sans mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <span>© 2026 La Boutique</span>
          <span>PROPULSÉ PAR KARTY</span>
        </div>
      </footer>

      <StorefrontCartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

// -------------------------------------------------------------
// BOUTIQUE HOME
// -------------------------------------------------------------
export const Home = () => {
  const { data: items, isLoading } = useItems();
  const { addToCart } = useStorefrontCart();
  const activeItems = items?.filter(item => item.status === 'ACTIVE') || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 text-xs italic tracking-widest text-[#7F7264]">
        Chargement de la collection...
      </div>
    );
  }

  return (
    <div className="space-y-20">
      {/* Elegantly styled hero */}
      <section className="text-center max-w-xl mx-auto space-y-6 py-12">
        <h1 className="text-4xl md:text-5xl font-light italic leading-tight text-[#2C2620]">
          La Collection Essentielle
        </h1>
        <p className="text-sm font-sans font-light text-[#7F7264] leading-relaxed max-w-sm mx-auto">
          Delicate, timeless designs crafted for the modern individual who values heritage and craft.
        </p>
      </section>

      {/* Boutique Product Display */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {activeItems.length === 0 ? (
          <p className="col-span-3 text-center text-xs tracking-widest uppercase text-slate-400 py-10">No collections found</p>
        ) : (
          activeItems.map(item => {
            const price = item.variants?.[0]?.price || 0;
            return (
              <div key={item.uid} className="group space-y-6 flex flex-col h-full bg-[#FCFBF8] border border-[#EBE6DC] p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-[4/5] bg-[#FAF6F0] rounded-[1.5rem] overflow-hidden flex items-center justify-center relative">
                  <span className="text-6xl font-light italic text-[#DFD9CD]">
                    {item.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-[#7F7264] font-sans">
                      {item.categoryName || 'General'}
                    </span>
                    <h3 className="text-lg font-normal text-[#2C2620] leading-snug">{item.name}</h3>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-[#EBE6DC] pt-4">
                    <span className="text-sm font-semibold tracking-wider font-sans text-[#7F7264]">₹{price}</span>
                    <button
                      onClick={() => addToCart({ id: item.uid, name: item.name, price, qty: 1 })}
                      className="bg-[#2C2620] hover:bg-[#4E443A] text-white px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-sans transition-colors"
                    >
                      Ajouter
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
