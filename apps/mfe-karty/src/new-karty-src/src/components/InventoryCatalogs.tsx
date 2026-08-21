import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Plus, Pencil, MoreHorizontal,
  ArrowDown, ChevronDown, Check, Eye, Trash2, RefreshCw,
  Package, LayoutDashboard, SlidersHorizontal
} from 'lucide-react';
import { cn } from '../lib/utils';
import { CreateCatalog } from './CreateCatalog';
import { CatalogDetails } from './CatalogDetails';
import { InventoryCatalogDetailsView } from './InventoryCatalogDetailsView';
import {
  useAddInventoryCatalogItem,
  useCreateCatalog,
  useDeleteCatalog,
  useInventoryCatalogs,
  useUpdateCatalog,
  useUpdateCatalogStatus
} from '../../../services/useInventoryCatalogs';

export interface CatalogItem {
  id: string;
  name: string;
  itemsCount: number;
  store: string;
  status: 'Active' | 'Draft' | 'Archived';
  description?: string;
}

// (removed INITIAL_CATALOG_DATA mock — catalogs are loaded from useInventoryCatalogs)

export const InventoryCatalogs = () => {
  const navigate = useNavigate();
  const { data: backendCatalogs } = useInventoryCatalogs();
  const createCatalogMutation = useCreateCatalog();
  const addCatalogItemMutation = useAddInventoryCatalogItem();
  const updateStatusMutation = useUpdateCatalogStatus();
  const updateCatalogMutation = useUpdateCatalog();
  const deleteCatalogMutation = useDeleteCatalog();

  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  React.useEffect(() => {
    if (backendCatalogs) {
      const mapped = backendCatalogs.map((c: any) => ({
        id: c.uid || c.id,
        name: c.name || c.catalogName || 'Unknown Catalog',
        itemsCount: c.itemsCount || c.itemCount || c.items?.length || 0,
        store: c.store || c.storeName || c.storeUid || 'Default Store',
        status: c.status === 'ACTIVE' || c.status === 'Active' ? 'Active' : c.status === 'ARCHIVED' ? 'Archived' : 'Draft',
        description: c.description || '',
      }));
      setCatalogs(mapped);
    }
  }, [backendCatalogs]);
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
        updateStatusMutation.mutate({ uid: id, status: newStatus.toUpperCase() });
        return { ...c, status: newStatus as any };
      }
      return c;
    }));
    setActiveActionMenu(null);
  };

  const deleteCatalog = (id: string) => {
    deleteCatalogMutation.mutate(id);
    setCatalogs(prev => prev.filter(c => c.id !== id));
    setActiveActionMenu(null);
  };

  if (viewingCatalog) {
    return (
      <InventoryCatalogDetailsView
        catalog={viewingCatalog}
        onBack={() => setViewingCatalog(null)}
        onEdit={() => {
          setEditingCatalog(viewingCatalog);
          setViewingCatalog(null);
        }}
        onUpdateStatus={(newStatus) => {
          updateStatusMutation.mutate({ uid: viewingCatalog.id, status: newStatus.toUpperCase() });
          setCatalogs(prev => prev.map(c => c.id === viewingCatalog.id ? { ...c, status: newStatus } : c));
          setViewingCatalog(prev => prev ? { ...prev, status: newStatus } : null);
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
        onCreate={async (data) => {
          if (data) {
            if (editingCatalog) {
              // Bug fix: this used to be a local-only setCatalogs update — useUpdateCatalog
              // existed but was never called, so edits appeared to save and vanished on refresh.
              await updateCatalogMutation.mutateAsync({
                uid: editingCatalog.id,
                data: {
                  name: data.name,
                  description: data.description,
                  status: (data.status || editingCatalog.status).toUpperCase(),
                  storeUid: data.store,
                },
              });
              const updated = {
                ...editingCatalog,
                name: data.name,
                description: data.description,
                status: data.status || editingCatalog.status,
                store: data.storeName || data.store || editingCatalog.store,
              };
              setCatalogs(prev => prev.map(c => c.id === editingCatalog.id ? updated : c));
              setViewingCatalog(updated as any);
            } else {
              const created = await createCatalogMutation.mutateAsync({
                name: data.name,
                description: data.description,
                status: data.status.toUpperCase(),
                storeUid: data.store
              });
              const catalogId = (created as any)?.uid || (created as any)?.id || data.id;
              if (catalogId && data.selectedItemUids?.length) {
                await Promise.all(data.selectedItemUids.map((itemUid: string) =>
                  addCatalogItemMutation.mutateAsync({
                    catalogUid: catalogId,
                    itemData: { itemUid, active: true }
                  })
                ));
              }
              const createdCatalog = { ...data, id: catalogId, store: data.storeName || data.store };
              setCatalogs(prev => [createdCatalog, ...prev]);
              setViewingCatalog(createdCatalog);
            }
          }
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
    <div className="flex flex-col flex-1 h-full min-h-screen overflow-x-hidden w-full max-w-full">
      <div className="bg-white border-b border-surface-100 py-3.5 px-4 md:px-8 flex items-center gap-4 shrink-0">
        <button className="p-1 hover:bg-surface-100 rounded transition-colors text-surface-900">
          <ArrowLeft className="h-5 w-5 text-surface-900" />
        </button>
        <h1 className="text-lg font-bold text-surface-900 tracking-tight">Inventory Catalogs</h1>
      </div>

      <div className="p-4 md:p-8 space-y-4 md:space-y-6">

        {/* Quick Actions Bar */}
        <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs mb-4">
          <div className="mb-2 text-[10.5px] font-extrabold uppercase tracking-wider text-surface-400">
            Quick Actions
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => navigate('/items?action=create')}
              className="flex items-center gap-2.5 rounded-xl border border-primary-500/20 bg-primary-50/60 p-2.5 text-left transition-all hover:bg-primary-50 active:scale-95 cursor-pointer shadow-2xs"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white font-bold shadow-xs">
                <Plus className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-primary-950 truncate">Add Item</div>
                <div className="text-[10px] text-primary-700/80 truncate">New SKU / item</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/inventory/dashboard')}
              className="flex items-center gap-2.5 rounded-xl border border-surface-200 bg-white p-2.5 text-left transition-all hover:bg-surface-50 active:scale-95 cursor-pointer shadow-3xs"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-700">
                <LayoutDashboard className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-surface-900 truncate">Dashboard</div>
                <div className="text-[10px] text-surface-500 truncate">Stock metrics</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/inventory/transfers?action=create')}
              className="flex items-center gap-2.5 rounded-xl border border-surface-200 bg-white p-2.5 text-left transition-all hover:bg-surface-50 active:scale-95 cursor-pointer shadow-3xs"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-700">
                <RefreshCw className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-surface-900 truncate">Transfer</div>
                <div className="text-[10px] text-surface-500 truncate">Inter-store</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/inventory/adjustments?action=create')}
              className="flex items-center gap-2.5 rounded-xl border border-surface-200 bg-white p-2.5 text-left transition-all hover:bg-surface-50 active:scale-95 cursor-pointer shadow-3xs"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-700">
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-surface-900 truncate">Adjustments</div>
                <div className="text-[10px] text-surface-500 truncate">Audit & count</div>
              </div>
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-11 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
              />
            </div>

            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#55349A] border border-[#55349A] rounded-xl text-sm font-bold text-white hover:bg-[#452a7d] transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Create Catalog
            </button>
          </div>

          {/* Table */}
          <div className="mt-6 -mx-6 border-t border-surface-100 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-50 border-y border-surface-100 select-none text-surface-400 text-[10.5px] font-bold uppercase tracking-wider">
                  <th className="px-[22px] py-2.5 w-12 text-center items-center justify-center flex">
                     <input
                      type="checkbox"
                      checked={selectedItems.length === filteredData.length && filteredData.length > 0}
                      onChange={toggleAll}
                      className="appearance-none h-5 w-5 min-w-[20px] min-h-[20px] ml-[18px] pl-0 rounded-[4px] border border-surface-300 bg-white checked:bg-primary-600 checked:border-primary-600 checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-primary-500/20 outline-none"
                     />
                  </th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">CATALOG NAME & ID</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">
                    <div className="relative inline-flex items-center gap-1 group cursor-pointer" onClick={() => setStoreFilterOpen(!storeFilterOpen)}>
                      STORE
                      <ArrowDown className={cn("h-3 w-3 text-surface-300 transition-colors group-hover:text-surface-700", storeFilterOpen && "text-primary-600")} />

                      {storeFilterOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setStoreFilterOpen(false); }} />
                          <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-surface-200 rounded-xl shadow-xl z-20 py-2 normal-case tracking-normal font-medium">
                            <div className="px-3 pb-2 mb-2 border-b border-surface-100">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                                <input
                                  type="text"
                                  placeholder="Search store..."
                                  value={storeSearchQuery}
                                  onChange={(e) => setStoreSearchQuery(e.target.value)}
                                  className="w-full pl-7 pr-3 py-1.5 bg-surface-50 border border-surface-100 rounded-lg text-xs outline-none focus:border-primary-500"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                            <button
                              className={cn(
                                "w-full text-left px-4 py-2 text-xs hover:bg-surface-50 transition-colors flex items-center justify-between",
                                !selectedStore ? "text-primary-600 bg-primary-50/50" : "text-surface-700"
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
                                  "w-full text-left px-4 py-2 text-xs hover:bg-surface-50 transition-colors flex items-center justify-between",
                                  selectedStore === store ? "text-primary-600 bg-primary-50/50" : "text-surface-700"
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
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">ITEM COUNTS</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">
                    <div className="relative inline-flex items-center gap-1 group cursor-pointer" onClick={() => setStatusFilterOpen(!statusFilterOpen)}>
                      STATUS
                      <ArrowDown className={cn("h-3 w-3 text-surface-300 transition-colors group-hover:text-surface-700", statusFilterOpen && "text-primary-600")} />

                      {statusFilterOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setStatusFilterOpen(false); }} />
                          <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-surface-200 rounded-xl shadow-xl z-20 py-2 normal-case tracking-normal font-medium">
                            <div className="px-3 pb-2 mb-2 border-b border-surface-100">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                                <input
                                  type="text"
                                  placeholder="Search status..."
                                  value={statusSearchQuery}
                                  onChange={(e) => setStatusSearchQuery(e.target.value)}
                                  className="w-full pl-7 pr-3 py-1.5 bg-surface-50 border border-surface-100 rounded-lg text-xs outline-none focus:border-primary-500"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                            <button
                              className={cn(
                                "w-full text-left px-4 py-2 text-xs hover:bg-surface-50 transition-colors flex items-center justify-between",
                                !selectedStatus ? "text-primary-600 bg-primary-50/50" : "text-surface-700"
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
                                  "w-full text-left px-4 py-2 text-xs hover:bg-surface-50 transition-colors flex items-center justify-between",
                                  selectedStatus === status ? "text-primary-600 bg-primary-50/50" : "text-surface-700"
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
                  <th className="px-[22px] py-2.5 font-bold tracking-wider text-right pr-[110px]">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id} className="border-b border-surface-100 px-[22px] py-2.5 text-[12.5px] hover:bg-surface-50 transition-colors">
                    <td className="px-[22px] py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleItem(item.id)}
                        className="appearance-none h-5 w-5 min-w-[20px] min-h-[20px] rounded-[4px] border border-surface-300 bg-white checked:bg-primary-600 checked:border-primary-600 checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-primary-500/20 outline-none"
                      />
                    </td>
                    <td className="px-[22px] py-2.5">
                      <button
                        onClick={() => setViewingCatalog(item)}
                        className="text-left group/name"
                      >
                        <div className="font-bold text-surface-900 text-[15px] group-hover/name:text-primary-600 transition-colors tracking-tight">{item.name}</div>
                        <div className="text-[11px] text-surface-400 font-medium mt-0.5">#{item.id}</div>
                      </button>
                    </td>
                    <td className="px-[22px] py-2.5">
                      <span className="text-sm font-medium text-surface-700">{item.store}</span>
                    </td>
                    <td className="px-[22px] py-2.5">
                      <span className="text-sm font-bold text-surface-900">{item.itemsCount} Items</span>
                    </td>
                    <td className="px-[22px] py-2.5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-bold",
                        item.status === 'Active' && "bg-success-50 text-success-600",
                        item.status === 'Draft' && "bg-[#E6EEF9] text-[#4267B2]",
                        item.status === 'Archived' && "bg-danger-50 text-danger-600",
                      )}>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          item.status === 'Active' && "bg-success-600",
                          item.status === 'Draft' && "bg-[#4267B2]",
                          item.status === 'Archived' && "bg-danger-600",
                        )} />
                        {item.status}
                      </span>
                    </td>
                    <td className="px-[22px] py-2.5 text-right relative">
                      <div className="flex items-center justify-end gap-2 pr-6">
                        <button
                          onClick={() => setEditingCatalog(item)}
                          className="inline-flex items-center justify-center gap-1.5 h-8.5 px-4 bg-white border border-[#E2E6ED] hover:border-[#55349A]/40 rounded-xl text-xs font-bold text-[#55349A] hover:bg-[#FDFBFF] hover:shadow-2xs transition-all cursor-pointer select-none"
                        >
                          <Pencil className="h-3.5 w-3.5 text-[#55349A]" />
                          <span>Edit</span>
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setActiveActionMenu(activeActionMenu === item.id ? null : item.id)}
                            className="p-1.5 border border-surface-200 rounded-lg text-surface-400 hover:text-surface-900 transition-colors"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {activeActionMenu === item.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setActiveActionMenu(null)} />
                              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-surface-200 rounded-xl shadow-xl z-40 py-2 text-left overflow-hidden">
                                <button
                                  onClick={() => { setViewingCatalog(item); setActiveActionMenu(null); }}
                                  className="w-full px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 flex items-center gap-3 transition-colors"
                                >
                                  <Eye className="h-4 w-4 text-surface-400" />
                                  View
                                </button>

                                <button
                                  onClick={() => toggleStatus(item.id)}
                                  className="w-full px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 flex items-center justify-between transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <RefreshCw className="h-4 w-4 text-surface-400" />
                                    Change Status
                                  </div>
                                  <div className={cn(
                                    "w-8 h-4.5 rounded-full relative transition-colors",
                                    item.status === 'Active' ? "bg-success-500" : "bg-surface-200"
                                  )}>
                                    <div className={cn(
                                      "absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all shadow-sm",
                                      item.status === 'Active' ? "right-0.5" : "left-0.5"
                                    )} />
                                  </div>
                                </button>

                                <button
                                  onClick={() => { setEditingCatalog(item); setActiveActionMenu(null); }}
                                  className="w-full px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 flex items-center gap-3 transition-colors"
                                >
                                  <Package className="h-4 w-4 text-surface-400" />
                                  Update Items
                                </button>

                                <div className="h-px bg-surface-100 my-1" />

                                <button
                                  onClick={() => deleteCatalog(item.id)}
                                  className="w-full px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 flex items-center gap-3 transition-colors font-medium"
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
