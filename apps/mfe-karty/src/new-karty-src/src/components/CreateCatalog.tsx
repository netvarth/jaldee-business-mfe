import React, { useState } from 'react';
import {
  ArrowLeft, Search, Check, ChevronDown, ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useItems } from '../../../services/useItems';
import { useStores } from '../../../services/useStores';

interface Item {
  id: string;
  name: string;
  category: string;
  sku: string;
  variants: number;
  image: string;
}

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
  const { data: backendItems = [], isLoading: itemsLoading } = useItems();
  const { data: backendStores = [], isLoading: storesLoading } = useStores();
  const [catalogName, setCatalogName] = React.useState(initialData?.name || '');
  const [description, setDescription] = React.useState(initialData?.description || '');
  const [showDescriptionField, setShowDescriptionField] = React.useState(!!initialData?.description);
  const [storeOpen, setStoreOpen] = React.useState(false);
  const [selectedStore, setSelectedStore] = React.useState(initialData?.store || '');
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState('');

  const stores = React.useMemo(() => backendStores.map((store: any) => ({
    id: store.id || store.uid,
    name: store.name || store.storeName || store.id || store.uid,
  })).filter((store: any) => store.id && store.name), [backendStores]);

  const items = React.useMemo<Item[]>(() => backendItems.map((item: any) => ({
    id: item.uid || item.id,
    name: item.name || item.itemName || 'Unnamed Item',
    category: item.categoryName || item.category || 'Uncategorized',
    sku: item.sku || item.itemCode || item.code || '',
    variants: item.variantsCount || item.variants?.length || 0,
    image: item.image || item.imageUrl || '',
  })).filter((item: Item) => item.id), [backendItems]);

  const filteredItems = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.sku.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const selectedStoreName = stores.find((store: any) => store.id === selectedStore)?.name || selectedStore;

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
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(i => i.id)));
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#F8F9FA]">
      {/* Header */}
      <div className="bg-white border-b border-surface-100 py-3.5 px-8 flex items-center gap-4 shrink-0">
        <button
          onClick={onBack}
          className="p-1 hover:bg-surface-100 rounded transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-surface-900" />
        </button>
        <h1 className="text-lg font-bold text-surface-900 tracking-tight">
          {initialData ? 'Edit Inventory Catalog' : 'Create New Inventory Catalog'}
        </h1>
      </div>

      <div className="flex-1 p-6 md:p-8 pb-32">
        {/* Unified workspace */}
        {/* clip-fix: no overflow-hidden — it clips the catalog form dropdown (top-full). rounded+border keep corners. */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm">
          {/* Top segment: Catalog Details Form */}
          <div className="p-6 md:p-8 bg-[#FAFAFB]/50 border-b border-surface-100">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-5">
              Catalog Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Catalog Name</label>
                <input
                  type="text"
                  value={catalogName}
                  onChange={(e) => setCatalogName(e.target.value)}
                  placeholder="Enter catalog name"
                  className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none transition-all font-semibold"
                />
                {showDescriptionField ? (
                  <div className="space-y-1.5 pt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter catalog description..."
                      rows={2}
                      className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none transition-all resize-none font-semibold"
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDescriptionField(true)}
                    className="text-[11px] font-bold text-[#55349A] hover:underline pt-1"
                  >
                    + Add Catalog Description
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Store</label>
                <div className="relative">
                  <button
                    onClick={() => setStoreOpen(!storeOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none transition-all font-semibold"
                  >
                    <span className={selectedStore ? "text-surface-900" : "text-surface-400"}>
                      {selectedStore || 'Select Store'}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform", storeOpen && "rotate-180")} />
                  </button>
                  {storeOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setStoreOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-surface-200 rounded-xl shadow-xl z-20 py-1.5 animate-in fade-in zoom-in-95 duration-200 origin-top">
                        {storesLoading && (
                          <div className="px-4 py-2 text-xs font-semibold text-surface-400">Loading stores...</div>
                        )}
                        {!storesLoading && stores.length === 0 && (
                          <div className="px-4 py-2 text-xs font-semibold text-surface-400">No stores available</div>
                        )}
                        {stores.map((store) => (
                          <button
                            key={store.id}
                            className={cn(
                              "w-full text-left px-4 py-2 text-sm hover:bg-surface-50 transition-colors flex items-center justify-between font-semibold",
                              selectedStore === store.id ? "text-[#55349A] bg-primary-50/50" : "text-surface-700"
                            )}
                            onClick={() => {
                              setSelectedStore(store.id);
                              setStoreOpen(false);
                            }}
                          >
                            {store.name}
                            {selectedStore === store.id && <Check className="h-3.5 w-3.5" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom segment: Select & Add Items */}
          <div className="p-6 md:p-8">
            <div className="flex flex-col gap-1 mb-5">
              <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">Select & Add Items to Inventory</h2>
              <p className="text-xs text-surface-400 font-semibold">Select the items you want to track and manage in this month's catalog.</p>
            </div>

            <div className="relative mb-5 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Item..."
                className="w-full pl-10 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none transition-all font-semibold"
              />
            </div>

            <div className="-mx-6 md:-mx-8 border-t border-surface-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50/50 border-b border-surface-100">
                    <th className="py-4 px-6 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                        onChange={toggleAll}
                        className="appearance-none w-5 h-5 rounded border border-surface-300 bg-white cursor-pointer transition-all checked:bg-[#55349A] checked:border-[#55349A] checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] focus:ring-2 focus:ring-[#55349A]/20 outline-none shadow-sm"
                      />
                    </th>
                    <th className="py-4 px-6 text-xs font-bold text-surface-500 uppercase tracking-wider">Item</th>
                    <th className="py-4 px-6 text-xs font-bold text-surface-500 uppercase tracking-wider">Category</th>
                    <th className="py-4 px-6 text-xs font-bold text-surface-400 uppercase tracking-wider">SKU</th>
                    <th className="py-4 px-6 text-xs font-bold text-surface-500 uppercase tracking-wider text-center">Variants</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-50/30 transition-colors group">
                      <td className="py-4 px-6 text-center">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItem(item.id)}
                          className="appearance-none w-5 h-5 rounded border border-surface-300 bg-white cursor-pointer transition-all checked:bg-[#55349A] checked:border-[#55349A] checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] focus:ring-2 focus:ring-[#55349A]/20 outline-none shadow-sm"
                        />
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-10 h-10 rounded-lg object-cover border border-surface-100 shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg border border-surface-100 bg-surface-50 flex items-center justify-center text-[10px] font-bold text-surface-400">
                              IMG
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-surface-900 leading-tight">{item.name}</span>
                            <span className="text-[11px] text-surface-400 font-medium">#{item.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-bold text-surface-605">{item.category}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-mono text-surface-500">{item.sku}</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="text-xs font-bold text-surface-700">{item.variants}</span>
                      </td>
                    </tr>
                  ))}
                  {!itemsLoading && filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs font-semibold text-surface-400">
                        {searchQuery ? 'No items match your search.' : 'No items available from the backend.'}
                      </td>
                    </tr>
                  )}
                  {itemsLoading && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs font-semibold text-surface-400">
                        Loading items...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="mt-6 flex items-center justify-between border-t border-surface-100 pt-6">
              <span className="text-xs font-medium text-surface-400">
                Showing <span className="text-surface-900 font-bold">{filteredItems.length}</span> of <span className="text-surface-900 font-bold">{items.length}</span> items
              </span>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-surface-200 rounded-lg text-xs font-bold text-surface-500 hover:bg-surface-50 disabled:opacity-50 transition-colors">
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <div className="flex items-center gap-1">
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold bg-[#E9E4F5] text-[#55349A]">1</button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-surface-500 hover:bg-surface-50">2</button>
                  <span className="px-1 text-surface-300">...</span>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-surface-500 hover:bg-surface-50">5</button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-surface-500 hover:bg-surface-50">6</button>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-surface-200 rounded-lg text-xs font-bold text-surface-500 hover:bg-surface-50 transition-colors">
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar Footer */}
      <div className="fixed bottom-0 right-0 left-0 bg-white border-t border-surface-200 px-8 py-4 flex items-center justify-end gap-3 z-30">
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-surface-100 border border-surface-200 rounded-xl text-sm font-bold text-surface-700 hover:bg-surface-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onCreate({
              id: initialData?.id || `INV${Math.floor(300000 + Math.random() * 600000)}`,
              name: catalogName,
              store: selectedStore,
              storeName: selectedStoreName,
              description: showDescriptionField ? description : '',
              status: (initialData as any)?.status || 'Active',
              itemsCount: selectedItems.size,
              selectedItemUids: Array.from(selectedItems)
            });
          }}
          disabled={!catalogName || !selectedStore}
          className="px-8 py-2.5 bg-primary-600 text-white border border-primary-600 rounded-xl text-sm font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:shadow-none"
        >
          {initialData ? 'Save Changes' : 'Create Catalog'}
        </button>
      </div>
    </div>
  );
};
