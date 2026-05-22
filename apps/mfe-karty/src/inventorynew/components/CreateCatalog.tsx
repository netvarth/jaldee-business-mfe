import React, { useState } from 'react';
import { 
  ArrowLeft, Search, Check, ChevronDown, ChevronRight, 
  ChevronLeft, Info
} from '../icons';
import { cn } from '@jaldee/design-system';

interface Item {
  id: string;
  name: string;
  category: string;
  sku: string;
  variants: number;
  image: string;
}

const MOCK_ITEMS: Item[] = [
  { id: 'HF12338', name: 'Lantern Shirt', category: 'Shirt', sku: 'LAN-SHIRT', variants: 5, image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=64&h=64&fit=crop' },
  { id: 'HP32145', name: 'Black Linen Pant', category: 'Pant', sku: 'B-LIN-PANT', variants: 3, image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=64&h=64&fit=crop' },
  { id: 'HF12345', name: 'Lantern Shirt', category: 'Shirt', sku: 'LAN-SHIRT', variants: 1, image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=64&h=64&fit=crop' },
  { id: 'HF12352', name: 'Lantern Shirt', category: 'Shirt', sku: 'LAN-SHIRT', variants: 3, image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=64&h=64&fit=crop' },
  { id: 'HF12340', name: 'Lantern Shirt', category: 'Shirt', sku: 'LAN-SHIRT', variants: 2, image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=64&h=64&fit=crop' },
  { id: 'HF12330', name: 'Lantern Shirt', category: 'Shirt', sku: 'LAN-SHIRT', variants: 5, image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=64&h=64&fit=crop' },
  { id: 'HF12315', name: 'Lantern Shirt', category: 'Shirt', sku: 'LAN-SHIRT', variants: 1, image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=64&h=64&fit=crop' },
  { id: 'HF12341', name: 'Lantern Shirt', category: 'Shirt', sku: 'LAN-SHIRT', variants: 5, image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=64&h=64&fit=crop' },
];

const STORES = ['SIMRAN FASHIONS', 'East End Outlet', 'West Coast Retail', 'Kottayam Hub'];

interface CreateCatalogProps {
  onBack: () => void;
  onCreate: (data?: any) => void;
  initialData?: {
    id: string;
    name: string;
    store: string;
    description?: string;
  };
}

export const CreateCatalog = ({ onBack, onCreate, initialData }: CreateCatalogProps) => {
  const [catalogName, setCatalogName] = React.useState(initialData?.name || '');
  const [description, setDescription] = React.useState(initialData?.description || '');
  const [showDescriptionField, setShowDescriptionField] = React.useState(!!initialData?.description);
  const [storeOpen, setStoreOpen] = React.useState(false);
  const [selectedStore, setSelectedStore] = React.useState(initialData?.store || '');
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState('');

  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleAll = () => {
    if (selectedItems.size === MOCK_ITEMS.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(MOCK_ITEMS.map(i => i.id)));
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[var(--color-surface-alt)]/20">
      {/* Header */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] py-3.5 px-8 flex items-center gap-4 shrink-0">
        <button 
          onClick={onBack}
          className="p-1 hover:bg-[var(--color-surface-alt)] rounded transition-colors border-0 bg-transparent cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-[var(--color-text-primary)]" />
        </button>
        <h1 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight">
          {initialData ? 'Edit Inventory Catalog' : 'Create New Inventory Catalog'}
        </h1>
      </div>

      <div className="flex-1 p-8 space-y-6 pb-24 text-left">
        {/* Section: Catalog Details */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Catalog Details</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Catalog Name</label>
              <input 
                type="text" 
                value={catalogName}
                onChange={(e) => setCatalogName(e.target.value)}
                placeholder="Enter catalog name"
                className="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all"
              />
              {showDescriptionField ? (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Description</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter catalog description..."
                    rows={3}
                    className="w-full px-4 py-2 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all resize-none"
                    autoFocus
                  />
                </div>
              ) : (
                <button 
                  onClick={() => setShowDescriptionField(true)}
                  className="text-[11px] font-bold text-[var(--color-primary)] hover:underline pt-1 border-0 bg-transparent cursor-pointer"
                >
                  + Add Catalog Description
                </button>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Store</label>
              <div className="relative">
                <button 
                  onClick={() => setStoreOpen(!storeOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all group cursor-pointer"
                >
                  <span className={selectedStore ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-disabled)]"}>
                    {selectedStore || 'Select Store'}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 text-[var(--color-text-secondary)] transition-transform", storeOpen && "rotate-180")} />
                </button>
                {storeOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setStoreOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-20 py-2 origin-top">
                      {STORES.map((store) => (
                        <button 
                          key={store}
                          className={cn(
                            "w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-surface-alt)] transition-colors flex items-center justify-between border-0 bg-transparent cursor-pointer",
                            selectedStore === store ? "text-[var(--color-primary)] bg-[var(--color-primary-subtle)]" : "text-[var(--color-text-primary)]"
                          )}
                          onClick={() => {
                            setSelectedStore(store);
                            setStoreOpen(false);
                          }}
                        >
                          {store}
                          {selectedStore === store && <Check className="h-3.5 w-3.5" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section: Select & Add Items */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)] flex flex-col gap-1">
            <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Select & Add Items to Inventory</h2>
            <p className="text-xs text-[var(--color-text-secondary)]/60 font-medium">Select the items you want to track and manage in this month's catalog.</p>
          </div>
          
          <div className="p-6">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-secondary)]" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Item..." 
                className="w-full pl-11 pr-4 py-2.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all"
              />
            </div>

            <div className="-mx-6 border-t border-[var(--color-border)] overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-surface-alt)]/50 border-b border-[var(--color-border)]">
                    <th className="py-4 px-6 w-12">
                      <input 
                        type="checkbox" 
                        checked={selectedItems.size === MOCK_ITEMS.length && MOCK_ITEMS.length > 0}
                        onChange={toggleAll}
                        className="appearance-none w-5 h-5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] cursor-pointer transition-all checked:bg-[var(--color-primary)] checked:border-[var(--color-primary)] checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:14px_14px] focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none shadow-sm" 
                      />
                    </th>
                    <th className="py-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Item</th>
                    <th className="py-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Category</th>
                    <th className="py-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">SKU</th>
                    <th className="py-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider text-center">Variants</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {MOCK_ITEMS.map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--color-surface-alt)]/30 transition-colors group">
                      <td className="py-4 px-6">
                        <input 
                          type="checkbox" 
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItem(item.id)}
                          className="appearance-none w-5 h-5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] cursor-pointer transition-all checked:bg-[var(--color-primary)] checked:border-[var(--color-primary)] checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:14px_14px] focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none shadow-sm" 
                        />
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-10 h-10 rounded-lg object-cover border border-[var(--color-border)] shadow-sm"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-[var(--color-text-primary)] leading-tight">{item.name}</span>
                            <span className="text-[11px] text-[var(--color-text-secondary)]/60 font-medium">#{item.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-bold text-[var(--color-text-secondary)]">{item.category}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-mono text-[var(--color-text-secondary)]/80">{item.sku}</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="text-xs font-bold text-[var(--color-text-secondary)]">{item.variants}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="mt-6 flex items-center justify-between border-t border-[var(--color-border)] pt-6">
              <span className="text-xs font-medium text-[var(--color-text-secondary)]/60">
                Showing <span className="text-[var(--color-text-primary)] font-bold">8</span> of <span className="text-[var(--color-text-primary)] font-bold">2536</span> items
              </span>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--color-border)] rounded-lg text-xs font-bold text-[var(--color-text-secondary)]/80 hover:bg-[var(--color-surface-alt)] disabled:opacity-50 transition-colors bg-transparent cursor-pointer">
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <div className="flex items-center gap-1">
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold bg-[var(--color-primary-subtle)] text-[var(--color-primary)] border-0 cursor-pointer">1</button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-[var(--color-text-secondary)]/80 hover:bg-[var(--color-surface-alt)] border-0 cursor-pointer">2</button>
                  <span className="px-1 text-[var(--color-border)]">...</span>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-[var(--color-text-secondary)]/80 hover:bg-[var(--color-surface-alt)] border-0 cursor-pointer">5</button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-[var(--color-text-secondary)]/80 hover:bg-[var(--color-surface-alt)] border-0 cursor-pointer">6</button>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--color-border)] rounded-lg text-xs font-bold text-[var(--color-text-secondary)]/80 hover:bg-[var(--color-surface-alt)] transition-colors bg-transparent cursor-pointer">
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar Footer */}
      <div className="fixed bottom-0 right-0 left-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] px-8 py-4 flex items-center justify-end gap-3 z-30">
        <button 
          onClick={onBack}
          className="px-6 py-2.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl text-sm font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button 
          onClick={onCreate}
          disabled={!catalogName || !selectedStore}
          className="px-8 py-2.5 bg-[var(--color-primary)] text-[var(--color-primary-text)] border border-[var(--color-primary)] rounded-xl text-sm font-bold hover:opacity-90 transition-colors shadow-sm disabled:opacity-50 disabled:shadow-none cursor-pointer"
        >
          {initialData ? 'Save Changes' : 'Create Catalog'}
        </button>
      </div>
    </div>
  );
};
