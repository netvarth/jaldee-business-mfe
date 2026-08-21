import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Boxes, Package, Settings } from 'lucide-react';

export function KartyMobileFooter() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  // Do not show on storefront preview routes if any
  if (path.startsWith('/store')) {
    return null;
  }

  const navItems = [
    { label: 'Overview', icon: LayoutDashboard, to: '/', active: path === '/' || path === '/overview' },
    { label: 'Orders', icon: ShoppingBag, to: '/orders', active: path.startsWith('/orders') },
    { label: 'Inventory', icon: Boxes, to: '/inventory/inventory-catalogs', active: path.startsWith('/inventory') },
    { label: 'Items', icon: Package, to: '/items', active: path.startsWith('/items') },
    { label: 'Settings', icon: Settings, to: '/settings', active: path.startsWith('/settings') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[999] bg-white/95 backdrop-blur-md border-t border-surface-200 px-2 py-1.5 md:hidden shadow-lg">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.to)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer border-none bg-transparent active:scale-95 ${
                item.active
                  ? 'text-[#55349A] font-bold'
                  : 'text-surface-500 font-medium hover:text-surface-800'
              }`}
            >
              <Icon className={`h-5 w-5 mb-0.5 ${item.active ? 'stroke-[2.5px]' : 'stroke-[1.75px]'}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
