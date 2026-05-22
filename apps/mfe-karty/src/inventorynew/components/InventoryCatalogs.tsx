import React, { useState } from 'react';
import { 
  ArrowLeft, Search, Plus, Pencil, MoreHorizontal, 
  ArrowDown, ChevronDown, Check, Eye, Trash2, RefreshCw,
  Package
} from '../icons';
import { cn } from '@jaldee/design-system';
import { CreateCatalog } from './CreateCatalog';
import { CatalogDetails } from './CatalogDetails';

interface CatalogItem {
  id: string;
  name: string;
  itemsCount: number;
  store: string;
  status: 'Active' | 'Draft' | 'Archived';
  description?: string;
}

const INITIAL_CATALOG_DATA: CatalogItem[] = [
  { id: 'INV324567', name: 'Warehouse Catalog', itemsCount: 156, store: 'Store 1', status: 'Active' },
  { id: 'INV324566', name: 'Main Directory Catalog', itemsCount: 42, store: 'Store 1', status: 'Draft' },
  { id: 'INV324565', name: 'Inventory Domestic Catalog', itemsCount: 89, store: 'Store 6', status: 'Archived' },
  { id: 'INV324564', name: 'Inventory International Catalog', itemsCount: 204, store: 'Store 2', status: 'Draft' },
];

export const InventoryCatalogs = () => {
  const [catalogs, setCatalogs] = useState<CatalogItem[]>(INITIAL_CATALOG_DATA);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<CatalogItem | null>(null);
  const [viewingCatalog, setViewingCatalog] = useState<CatalogItem | null>(null);
  const [storeFilterOpen, setStoreFilterOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [statusSearchQuery, setStatusSearchQuery] = useState('');
  
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const toggleAll = () => {
    if (selectedItems.length === filteredData.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredData.map(item => item.id));
    }
  };

  const toggleItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleStatus = (id: string) => {
    setCatalogs(prev => prev.map(c => {
      if (c.id === id) {
        const newStatus = c.status === 'Active' ? 'Archived' : 'Active';
        return { ...c, status: newStatus as any };
      }
      return c;
    }));
    setActiveActionMenu(null);
  };

  const deleteCatalog = (id: string) => {
    setCatalogs(prev => prev.filter(c => c.id !== id));
    setActiveActionMenu(null);
  };

  if (viewingCatalog) {
    return (
      <CatalogDetails 
        title="Inventory Catalog Details"
        catalog={viewingCatalog}
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
      <CreateCatalog 
        onBack={() => {
          setShowCreate(false);
          setEditingCatalog(null);
        }} 
        onCreate={() => {
          setShowCreate(false);
          setEditingCatalog(null);
        }} 
        initialData={editingCatalog || undefined}
      />
    );
  }

  const UNIQUE_STORES = Array.from(new Set(catalogs.map(item => item.store))) as string[];
  const filteredStoresList = UNIQUE_STORES.filter(store => 
    store.toLowerCase().includes(storeSearchQuery.toLowerCase())
  );

  const STATUS_OPTIONS = ['Active', 'Draft', 'Archived'];
  const filteredStatusList = STATUS_OPTIONS.filter(status => 
    status.toLowerCase().includes(statusSearchQuery.toLowerCase())
  );

  const filteredData = catalogs.filter(item => {
    const matchesStore = !selectedStore || item.store === selectedStore;
    const matchesStatus = !selectedStatus || item.status === selectedStatus;
    return matchesStore && matchesStatus;
  });

  return (
    <div className="flex flex-col flex-1">
      {/* Page Header Bar */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] py-3.5 px-8 flex items-center gap-4 shrink-0">
        <button className="p-1 hover:bg-[var(--color-surface-alt)] rounded transition-colors border-0 bg-transparent cursor-pointer">
          <ArrowLeft className="h-5 w-5 text-[var(--color-text-primary)]" />
        </button>
        <h1 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight">Inventory Catalogs</h1>
      </div>

      {/* Main Page Content */}
      <div className="p-8 space-y-6">
        {/* Toolbar */}
        <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-secondary)]" />
              <input 
                type="text" 
                placeholder="Search" 
                className="w-full pl-11 pr-4 py-2.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all"
              />
            </div>
            
            <button 
              onClick={() => setShowCreate(true)}
              className="bg-[var(--color-primary)] text-[var(--color-primary-text)] px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2.5 hover:opacity-90 active:opacity-100 transition-colors shadow-sm cursor-pointer border-0"
            >
              <div className="bg-white rounded-full p-0.5 flex items-center justify-center shrink-0">
                <Plus className="h-4 w-4 text-[var(--color-primary)]" strokeWidth={3} />
              </div>
              Create Catalog
            </button>
          </div>

          {/* Table */}
          <div className="mt-6 -mx-6 border-t border-[var(--color-border)] overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[var(--color-surface-alt)]/50 border-b border-[var(--color-border)]">
                  <th className="py-4 px-6 w-12 text-center items-center justify-center flex">
                     <input 
                      type="checkbox"
                      checked={selectedItems.length === filteredData.length && filteredData.length > 0}
                      onChange={toggleAll}
                      className="appearance-none h-5 w-5 min-w-[20px] min-h-[20px] ml-[18px] pl-0 rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface)] checked:bg-[var(--color-primary)] checked:border-[var(--color-primary)] checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none"
                     />
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">CATALOG NAME & ID</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    <div className="relative inline-flex items-center gap-1 group cursor-pointer" onClick={() => setStoreFilterOpen(!storeFilterOpen)}>
                      STORE
                      <ArrowDown className={cn("h-3 w-3 text-[var(--color-text-secondary)]/50 transition-colors group-hover:text-[var(--color-text-secondary)]", storeFilterOpen && "text-[var(--color-primary)]")} />
                      
                      {storeFilterOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setStoreFilterOpen(false); }} />
                          <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-20 py-2 normal-case tracking-normal font-medium">
                            <div className="px-3 pb-2 mb-2 border-b border-[var(--color-border)]">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
                                <input 
                                  type="text" 
                                  placeholder="Search store..." 
                                  value={storeSearchQuery}
                                  onChange={(e) => setStoreSearchQuery(e.target.value)}
                                  className="w-full pl-7 pr-3 py-1.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg text-xs outline-none focus:border-[var(--color-primary)]"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                            <button 
                              className={cn(
                                "w-full text-left px-4 py-2 text-xs hover:bg-[var(--color-surface-alt)] transition-colors flex items-center justify-between border-0 bg-transparent cursor-pointer",
                                !selectedStore ? "text-[var(--color-primary)] bg-[var(--color-primary-subtle)]" : "text-[var(--color-text-primary)]"
                              )}
                              onClick={(e) => { e.stopPropagation(); setSelectedStore(null); setStoreFilterOpen(false); setStoreSearchQuery(''); }}
                            >
                              All Stores
                              {!selectedStore && <Check className="h-3 w-3" />}
                            </button>
                            {filteredStoresList.map(store => (
                              <button 
                                key={store}
                                className={cn(
                                  "w-full text-left px-4 py-2 text-xs hover:bg-[var(--color-surface-alt)] transition-colors flex items-center justify-between border-0 bg-transparent cursor-pointer",
                                  selectedStore === store ? "text-[var(--color-primary)] bg-[var(--color-primary-subtle)]" : "text-[var(--color-text-primary)]"
                                )}
                                onClick={(e) => { e.stopPropagation(); setSelectedStore(store); setStoreFilterOpen(false); setStoreSearchQuery(''); }}
                              >
                                {store}
                                {selectedStore === store && <Check className="h-3 w-3" />}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">ITEM COUNTS</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    <div className="relative inline-flex items-center gap-1 group cursor-pointer" onClick={() => setStatusFilterOpen(!statusFilterOpen)}>
                      STATUS
                      <ArrowDown className={cn("h-3 w-3 text-[var(--color-text-secondary)]/50 transition-colors group-hover:text-[var(--color-text-secondary)]", statusFilterOpen && "text-[var(--color-primary)]")} />
                      
                      {statusFilterOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setStatusFilterOpen(false); }} />
                          <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-20 py-2 normal-case tracking-normal font-medium">
                            <div className="px-3 pb-2 mb-2 border-b border-[var(--color-border)]">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
                                <input 
                                  type="text" 
                                  placeholder="Search status..." 
                                  value={statusSearchQuery}
                                  onChange={(e) => setStatusSearchQuery(e.target.value)}
                                  className="w-full pl-7 pr-3 py-1.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg text-xs outline-none focus:border-[var(--color-primary)]"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                            <button 
                              className={cn(
                                "w-full text-left px-4 py-2 text-xs hover:bg-[var(--color-surface-alt)] transition-colors flex items-center justify-between border-0 bg-transparent cursor-pointer",
                                !selectedStatus ? "text-[var(--color-primary)] bg-[var(--color-primary-subtle)]" : "text-[var(--color-text-primary)]"
                              )}
                              onClick={(e) => { e.stopPropagation(); setSelectedStatus(null); setStatusFilterOpen(false); setStatusSearchQuery(''); }}
                            >
                              All Statuses
                              {!selectedStatus && <Check className="h-3 w-3" />}
                            </button>
                            {filteredStatusList.map(status => (
                              <button 
                                key={status}
                                className={cn(
                                  "w-full text-left px-4 py-2 text-xs hover:bg-[var(--color-surface-alt)] transition-colors flex items-center justify-between border-0 bg-transparent cursor-pointer",
                                  selectedStatus === status ? "text-[var(--color-primary)] bg-[var(--color-primary-subtle)]" : "text-[var(--color-text-primary)]"
                                )}
                                onClick={(e) => { e.stopPropagation(); setSelectedStatus(status as any); setStatusFilterOpen(false); setStatusSearchQuery(''); }}
                              >
                                {status}
                                {selectedStatus === status && <Check className="h-3 w-3" />}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </th>
                  <th className="py-4 pl-6 pr-[110px] text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]/30 transition-colors">
                    <td className="py-5 px-6">
                      <input 
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleItem(item.id)}
                        className="appearance-none h-5 w-5 min-w-[20px] min-h-[20px] rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface)] checked:bg-[var(--color-primary)] checked:border-[var(--color-primary)] checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none"
                      />
                    </td>
                    <td className="py-5 px-6">
                      <button 
                        onClick={() => setViewingCatalog(item)}
                        className="text-left group/name border-0 bg-transparent cursor-pointer"
                      >
                        <div className="font-bold text-[var(--color-text-primary)] text-[15px] group-hover/name:text-[var(--color-primary)] transition-colors tracking-tight">{item.name}</div>
                        <div className="text-[11px] text-[var(--color-text-secondary)] font-medium mt-0.5">#{item.id}</div>
                      </button>
                    </td>
                    <td className="py-5 px-6">
                      <span className="text-sm font-medium text-[var(--color-text-secondary)]">{item.store}</span>
                    </td>
                    <td className="py-5 px-6">
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">{item.itemsCount} Items</span>
                    </td>
                    <td className="py-5 px-6">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-bold",
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
                    <td className="py-5 px-6 text-right relative">
                      <div className="flex items-center justify-end gap-2 pr-6">
                        <button 
                          onClick={() => setEditingCatalog(item)}
                          className="flex items-center gap-2 px-4 py-1.5 border border-[var(--color-border)] rounded-lg text-sm font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] transition-colors bg-transparent cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <div className="relative">
                          <button 
                            onClick={() => setActiveActionMenu(activeActionMenu === item.id ? null : item.id)}
                            className="p-1.5 border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors bg-transparent cursor-pointer"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          
                          {activeActionMenu === item.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setActiveActionMenu(null)} />
                              <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-40 py-2 text-left overflow-hidden">
                                <button 
                                  onClick={() => { setViewingCatalog(item); setActiveActionMenu(null); }}
                                  className="w-full px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] flex items-center gap-3 transition-colors border-0 bg-transparent text-left cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 text-[var(--color-text-secondary)]" />
                                  View
                                </button>
                                
                                <button 
                                  onClick={() => toggleStatus(item.id)}
                                  className="w-full px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] flex items-center justify-between transition-colors border-0 bg-transparent text-left cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    <RefreshCw className="h-4 w-4 text-[var(--color-text-secondary)]" />
                                    Change Status
                                  </div>
                                  <div className={cn(
                                    "w-8 h-4.5 rounded-full relative transition-colors",
                                    item.status === 'Active' ? "bg-[var(--color-success)]" : "bg-[var(--color-border)]"
                                  )}>
                                    <div className={cn(
                                      "absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all shadow-sm",
                                      item.status === 'Active' ? "right-0.5" : "left-0.5"
                                    )} />
                                  </div>
                                </button>
 
                                <button 
                                  onClick={() => { setEditingCatalog(item); setActiveActionMenu(null); }}
                                  className="w-full px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] flex items-center gap-3 transition-colors border-0 bg-transparent text-left cursor-pointer"
                                >
                                  <Package className="h-4 w-4 text-[var(--color-text-secondary)]" />
                                  Update Items
                                </button>
 
                                <div className="h-px bg-[var(--color-border)] my-1" />
                                
                                <button 
                                  onClick={() => deleteCatalog(item.id)}
                                  className="w-full px-4 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] flex items-center gap-3 transition-colors font-medium border-0 bg-transparent text-left cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
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
