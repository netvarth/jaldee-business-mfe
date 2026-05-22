import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InventoryCatalogs } from './components/InventoryCatalogs';
import { OrderCatalogs } from './components/OrderCatalogs';
import { PurchasesTable } from './components/PurchasesTable';
import { StoresGrid } from './components/StoresGrid';
import { Package, ShoppingCart, Truck, Store } from './icons';
import { cn } from '@jaldee/design-system';

type TabId = 'inventory-catalogs' | 'order-catalogs' | 'purchases' | 'stores';

export default function InventoryNewPage() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  
  // Resolve tab from url parameter or default to 'inventory-catalogs'
  const activeTab: TabId = (tab as TabId) || 'inventory-catalogs';

  const handleTabChange = (newTab: TabId) => {
    navigate(`/inventorynew/${newTab}`);
  };

  const tabs = [
    { id: 'inventory-catalogs' as TabId, label: 'Inventory Catalogs', icon: Package, component: <InventoryCatalogs /> },
    { id: 'order-catalogs' as TabId, label: 'Order Catalogs', icon: ShoppingCart, component: <OrderCatalogs /> },
    { id: 'purchases' as TabId, label: 'Purchases', icon: Truck, component: <PurchasesTable /> },
    { id: 'stores' as TabId, label: 'Stores', icon: Store, component: <StoresGrid /> },
  ];

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-[var(--color-surface-alt)]/10 font-sans">
      {/* Tab Navigation Header */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-8 py-2 sticky top-0 z-[40] shadow-sm">
        <div className="flex items-center gap-6 overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={cn(
                  "flex items-center gap-2 py-3 px-1 border-b-2 font-bold text-sm transition-all duration-200 cursor-pointer bg-transparent border-0 outline-none whitespace-nowrap",
                  isActive 
                    ? "border-[var(--color-primary)] text-[var(--color-primary)] font-extrabold" 
                    : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                )}
              >
                <Icon size={16} className={cn("transition-colors", isActive ? "text-[var(--color-primary)]" : "text-[var(--color-text-secondary)]/70")} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Screen Area */}
      <div className="flex-1 flex flex-col">
        {currentTab.component}
      </div>
    </div>
  );
}
