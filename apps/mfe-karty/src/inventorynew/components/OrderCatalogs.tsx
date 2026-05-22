import React, { useState } from 'react';
import { 
  ArrowLeft, Search, Plus, Pencil, MoreHorizontal, 
  ArrowDown, Check, Eye, Trash2, RefreshCw,
  Package, LayoutGrid, List, Grid
} from '../icons';
import { cn } from '@jaldee/design-system';
import { CreateOrderCatalog } from './CreateOrderCatalog';
import { CatalogDetails } from './CatalogDetails';

interface OrderCatalogItem {
  id: string;
  name: string;
  itemsCount: number;
  store: string;
  status: 'Active' | 'Draft' | 'Archived';
  lastModified?: string;
}

const INITIAL_DATA: OrderCatalogItem[] = [
  { id: '324567', name: 'Wholesale Catalog', itemsCount: 124, store: 'Store 1', status: 'Active', lastModified: 'Aug 12, 2024' },
  { id: '324566', name: 'Supply Directory', itemsCount: 48, store: 'Store 1', status: 'Draft', lastModified: 'Aug 10, 2024' },
  { id: '324565', name: 'Domestic Catalog', itemsCount: 86, store: 'Store 6', status: 'Archived', lastModified: 'Aug 05, 2024' },
  { id: '324512', name: 'International Catalog', itemsCount: 210, store: 'Store 2', status: 'Draft', lastModified: 'Aug 01, 2024' },
];

export const OrderCatalogs = () => {
  const [catalogs, setCatalogs] = useState<OrderCatalogItem[]>(INITIAL_DATA);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<OrderCatalogItem | null>(null);
  const [viewingCatalog, setViewingCatalog] = useState<OrderCatalogItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const toggleAll = () => {
    if (selectedItems.length === catalogs.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(catalogs.map((item, idx) => `${item.id}-${idx}`));
    }
  };

  const toggleItem = (id: string, index: number) => {
    const key = `${id}-${index}`;
    setSelectedItems(prev => 
      prev.includes(key) ? prev.filter(i => i !== key) : [...prev, key]
    );
  };

  if (viewingCatalog) {
    return (
      <CatalogDetails 
        title="Order Catalog Details"
        catalog={{ ...viewingCatalog, id: `ORD${viewingCatalog.id}` }}
        onBack={() => setViewingCatalog(null)}
        onEdit={() => {
          setEditingCatalog(viewingCatalog);
          setViewingCatalog(null);
        }}
      />
    );
  }

  if (showCreate || editingCatalog) {
    return (
      <CreateOrderCatalog 
        onBack={() => {
          setShowCreate(false);
          setEditingCatalog(null);
        }} 
        onCreate={() => {
          setShowCreate(false);
          setEditingCatalog(null);
        }} 
        initialData={editingCatalog ? { ...editingCatalog, id: `ORD${editingCatalog.id}` } : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Page Header Bar */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] py-3.5 px-8 flex items-center gap-4 shrink-0">
        <button className="p-1 hover:bg-[var(--color-surface-alt)] rounded transition-colors border-0 bg-transparent cursor-pointer">
          <ArrowLeft className="h-5 w-5 text-[var(--color-text-primary)]" />
        </button>
        <h1 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight">Order Catalogs</h1>
      </div>

      {/* Main Page Content */}
      <div className="p-8 space-y-6 text-left">
        {/* Toolbar */}
        <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 max-w-2xl text-left">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-secondary)]" />
                <input 
                  type="text" 
                  placeholder="Search order catalogs..." 
                  className="w-full pl-11 pr-4 py-2.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all"
                />
              </div>
            </div>
            
            <button 
              onClick={() => setShowCreate(true)}
              className="bg-[var(--color-primary)] text-[var(--color-primary-text)] px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2.5 hover:opacity-90 transition-colors shadow-sm cursor-pointer border-0"
            >
              <div className="bg-white rounded-full p-0.5 flex items-center justify-center shrink-0">
                <Plus className="h-4 w-4 text-[var(--color-primary)]" strokeWidth={3} />
              </div>
              Create Catalog
            </button>
          </div>

          <div className="mt-6 -mx-6 border-t border-[var(--color-border)] overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-[var(--color-surface-alt)]/50 border-b border-[var(--color-border)]">
                    <th className="py-4 px-6 w-12 text-center items-center justify-center flex">
                       <input 
                        type="checkbox"
                        checked={selectedItems.length === catalogs.length && catalogs.length > 0}
                        onChange={toggleAll}
                        className="appearance-none h-5 w-5 min-w-[20px] min-h-[20px] ml-[18px] pl-0 rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface)] checked:bg-[var(--color-primary)] checked:border-[var(--color-primary)] checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none"
                       />
                    </th>
                    <th className="py-4 px-6 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">CATALOG NAME & ID</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">STORE</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        STATUS
                        <ArrowDown className="h-3 w-3 text-[var(--color-text-disabled)]" />
                      </div>
                    </th>
                    <th className="py-4 px-6 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider text-right pr-[110px]">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogs.map((item, index) => (
                    <tr key={`${item.id}-${index}`} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]/30 transition-colors">
                      <td className="py-5 px-6">
                        <input 
                          type="checkbox"
                          checked={selectedItems.includes(`${item.id}-${index}`)}
                          onChange={() => toggleItem(item.id, index)}
                          className="appearance-none h-5 w-5 min-w-[20px] min-h-[20px] rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface)] checked:bg-[var(--color-primary)] checked:border-[var(--color-primary)] checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none"
                        />
                      </td>
                      <td className="py-5 px-6 text-left">
                        <button 
                          onClick={() => setViewingCatalog(item)}
                          className="flex flex-col text-left group border-0 bg-transparent cursor-pointer"
                        >
                          <span className="font-bold text-[var(--color-text-primary)] text-sm group-hover:text-[var(--color-primary)] transition-colors">{item.name}</span>
                          <span className="text-[11px] text-[var(--color-text-secondary)]/60 font-medium mt-0.5">#{item.id}</span>
                        </button>
                      </td>
                      <td className="py-5 px-6 text-left">
                        <span className="text-sm font-bold text-[var(--color-text-primary)]">{item.store}</span>
                      </td>
                      <td className="py-5 px-6">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[12px] font-bold",
                          item.status === 'Active' && "bg-[var(--color-success-subtle)] text-[var(--color-success)]",
                          item.status === 'Draft' && "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]",
                          item.status === 'Archived' && "bg-[var(--color-danger-subtle)] text-[var(--color-danger)]",
                        )}>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            item.status === 'Active' && "bg-[var(--color-success)]",
                            item.status === 'Draft' && "bg-[var(--color-primary)]",
                            item.status === 'Archived' && "bg-[var(--color-danger)]",
                          )} />
                          {item.status}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-right pr-6">
                        <div className="flex items-center justify-end gap-2 text-right">
                          <button 
                            onClick={() => setEditingCatalog(item)}
                            className="flex items-center justify-center gap-2 px-6 py-2 border border-[var(--color-border)] rounded-lg text-sm font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-alt)] transition-colors shadow-sm cursor-pointer bg-transparent"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                          <button className="p-2 border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors shadow-sm cursor-pointer bg-transparent">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
      </div>
    </div>
  );
};
