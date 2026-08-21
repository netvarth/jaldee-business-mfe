import React, { useState, useMemo } from 'react';
import {
  ArrowLeft, Search, Plus, Pencil, MoreHorizontal,
  ArrowDown, Check, Eye, Trash2, Globe, DollarSign,
  Activity, AlertCircle, ShoppingBag
} from 'lucide-react';
import { cn } from '../lib/utils';
import { CreateOrderCatalog } from './CreateOrderCatalog';
import { OrderCatalogDetailsView } from './OrderCatalogDetailsView';
import { useOrderCatalogs, useCreateOrderCatalog, useUpdateOrderCatalog, useUpdateOrderCatalogStatus, useDeleteOrderCatalog } from '../../../services/useOrderCatalogs';

export interface OrderCatalogItem {
  id: string;
  name: string;
  itemsCount: number;
  store: string;
  status: 'Active' | 'Draft' | 'Archived';
  currency: string;
  lastModified?: string;
  walkInPos?: 'Yes' | 'No';
  storePickup?: 'Yes' | 'No';
  homeDelivery?: 'Yes' | 'No';
  inventoryManagement?: boolean;
  selectedInvCatalogs?: string[];
  description?: string;
}

export const OrderCatalogs = () => {
  const { data: backendCatalogs } = useOrderCatalogs();
  const createCatalogMutation = useCreateOrderCatalog();
  const updateCatalogMutation = useUpdateOrderCatalog();
  const updateStatusMutation = useUpdateOrderCatalogStatus();
  const deleteCatalogMutation = useDeleteOrderCatalog();

  const [catalogs, setCatalogs] = useState<OrderCatalogItem[]>([]);

  React.useEffect(() => {
    if (backendCatalogs) {
      const mapped = backendCatalogs.map((c: any) => ({
        id: c.uid || c.id,
        name: c.name || c.catalogName || 'Unknown Order Catalog',
        itemsCount: c.itemsCount || c.itemCount || c.items?.length || 0,
        store: c.store || c.storeName || c.storeUid || '',
        status: c.status === 'ACTIVE' || c.status === 'Active' ? 'Active' : c.status === 'ARCHIVED' ? 'Archived' : 'Draft',
        // The DTO field is `currencyCode` ("INR"); reading `c.currency` always missed and fell
        // through to the hardcoded default, so the list showed INR even for a null/other currency.
        currency: c.currencyCode ? `${c.currencyCode}${c.currencyCode === 'INR' ? ' (₹)' : ''}` : 'INR (₹)',
        description: c.description || '',
      }));
      setCatalogs(mapped);
    }
  }, [backendCatalogs]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<OrderCatalogItem | null>(null);
  const [viewingCatalog, setViewingCatalog] = useState<OrderCatalogItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const toggleAll = () => {
    if (selectedItems.length === filteredCatalogs.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredCatalogs.map((item, idx) => `${item.id}-${idx}`));
    }
  };

  const toggleItem = (id: string, index: number) => {
    const key = `${id}-${index}`;
    setSelectedItems(prev =>
      prev.includes(key) ? prev.filter(i => i !== key) : [...prev, key]
    );
  };

  /**
   * Maps the form's display values onto the backend contract. Everything below the name was
   * previously dropped: the payload sent `currency` (the DTO field is `currencyCode`), and never
   * sent the fulfilment flags or the linked inventory catalogs at all — which is why every catalog
   * persisted with a null currency, all flags false, and no rows in the link table.
   */
  const toCatalogPayload = (data: OrderCatalogItem) => ({
    name: data.name,
    description: data.description,
    status: data.status.toUpperCase() as any,
    // The picker shows "INR (₹)"; the column is a 10-char code.
    currencyCode: String(data.currency || '').split(' ')[0] || undefined,
    walkinPos: (data as any).walkInPos === 'Yes',
    storePickup: (data as any).storePickup === 'Yes',
    homeDelivery: (data as any).homeDelivery === 'Yes',
    inventoryManagement: !!(data as any).inventoryManagement,
    // Which inventory catalogs this catalog draws stock from.
    selectedInventoryCatalogUids: (data as any).selectedInvCatalogs || [],
  });

  const handleCreateOrUpdate = async (data: OrderCatalogItem) => {
    try {
      if (editingCatalog) {
        await updateCatalogMutation.mutateAsync({
          uid: editingCatalog.id,
          data: toCatalogPayload(data),
        });
        setCatalogs(prev => prev.map(c => c.id === editingCatalog.id ? { ...c, ...data } : c));
      } else {
        // storeUid must be a uid — the form resolves it; never fall back to the store NAME, which
        // the backend rejects as a malformed UUID.
        const storeUid = (data as any).storeUid;
        if (!storeUid) {
          alert('Pick a store before saving the catalog.');
          return;
        }
        const created = await createCatalogMutation.mutateAsync({
          ...toCatalogPayload(data),
          storeUid,
        });
        const saved = { ...data, id: (created as any)?.uid || data.id };
        setCatalogs(prev => [saved, ...prev]);
        setViewingCatalog(saved);
      }
      setShowCreate(false);
      setEditingCatalog(null);
    } catch (e: any) {
      // Previously this reported success before the request resolved, so a failed save still
      // showed "created successfully" and left a phantom row in the list.
      alert(`Could not save the catalog: ${e?.message || 'unknown error'}`);
    }
  };

  const filteredCatalogs = useMemo(() => {
    return catalogs.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.includes(searchQuery) ||
      item.store.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.currency.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [catalogs, searchQuery]);

  if (viewingCatalog) {
    return (
      <OrderCatalogDetailsView
        catalog={{ ...viewingCatalog, id: `${viewingCatalog.id}` }}
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
      <CreateOrderCatalog
        onBack={() => {
          setShowCreate(false);
          setEditingCatalog(null);
        }}
        onCreate={handleCreateOrUpdate}
        initialData={editingCatalog ? editingCatalog : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full">
      {/* Page Header Bar */}
      <div className="bg-white border-b border-surface-100 py-3.5 px-8 flex items-center gap-4 shrink-0 justify-between">
        <div className="flex items-center gap-4 text-left">
          <button className="p-1.5 hover:bg-surface-50 rounded-lg transition-colors cursor-pointer border border-surface-100">
            <ArrowLeft className="h-5 w-5 text-surface-900" />
          </button>
          <div>
            <h1 className="text-lg font-black text-surface-900 tracking-tight flex items-center gap-2">
              <span>Order Catalogs Listing</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Main Page Content */}
      <div className="p-8 space-y-6">
        {/* Toolbar */}
        <div className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by catalog name, ID, currency or store..."
                  className="w-full pl-11 pr-4 py-2.5 bg-[#FAF9F6] border border-surface-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all shadow-2xs"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setEditingCatalog(null);
                setShowCreate(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#55349A] border border-[#55349A] rounded-xl text-sm font-black text-white hover:bg-[#452a7d] transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Create Catalog
            </button>
          </div>

          <div className="mt-6 -mx-6 border-t border-surface-100 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-surface-50 border-y border-surface-100 select-none text-surface-400 text-[10.5px] font-bold uppercase tracking-wider">
                    <th className="px-[22px] py-2.5 w-12 text-center">
                       <input
                        type="checkbox"
                        checked={selectedItems.length === filteredCatalogs.length && filteredCatalogs.length > 0}
                        onChange={toggleAll}
                        className="appearance-none h-5 w-5 min-w-[20px] min-h-[20px] rounded-[4px] border border-surface-300 bg-white checked:bg-primary-600 checked:border-primary-600 checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-primary-500/20 outline-none"
                       />
                    </th>
                    <th className="px-[22px] py-2.5 text-[10.5px] font-bold tracking-wider">CATALOG NAME & ID</th>
                    <th className="px-[22px] py-2.5 text-[10.5px] font-bold tracking-wider">CURRENCY</th>
                    <th className="px-[22px] py-2.5 text-[10.5px] font-bold tracking-wider">STORE</th>
                    <th className="px-[22px] py-2.5 text-[10.5px] font-bold tracking-wider">
                      <div className="flex items-center gap-1">
                        STATUS
                        <ArrowDown className="h-3 w-3 text-surface-400" />
                      </div>
                    </th>
                    <th className="px-[22px] py-2.5 text-[10.5px] font-bold tracking-wider text-right pr-12">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {filteredCatalogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-surface-400">
                        <div className="flex flex-col items-center gap-3">
                          <ShoppingBag className="h-10 w-10 text-surface-300" />
                          <div>
                            <span className="font-bold text-surface-700 text-sm block">No Catalogs Found</span>
                            <span className="text-xs text-surface-400 font-medium block mt-1">Try resetting or using active keywords.</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCatalogs.map((item, index) => (
                      <tr key={`${item.id}-${index}`} className="border-b border-surface-100 px-[22px] py-2.5 text-[12.5px] hover:bg-surface-50 transition-colors">
                        <td className="px-[22px] py-2.5 shrink-0 text-center">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(`${item.id}-${index}`)}
                            onChange={() => toggleItem(item.id, index)}
                            className="appearance-none h-5 w-5 min-w-[20px] min-h-[20px] rounded-[4px] border border-surface-300 bg-white checked:bg-primary-600 checked:border-primary-600 checked:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgY3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBvbHlsaW5lIHBvaW50cz0iMjAgNiA5IDE3IDQgMTIiPjwvcG9seWxpbmU+PC9zdmc+')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-primary-500/20 outline-none"
                          />
                        </td>
                        <td className="px-[22px] py-2.5 text-left">
                          <button
                            onClick={() => setViewingCatalog(item)}
                            className="flex flex-col text-left group bg-transparent border-none p-0 focus:outline-none cursor-pointer"
                          >
                            <span className="font-extrabold text-surface-900 text-sm group-hover:text-primary-600 transition-colors">{item.name}</span>
                            <span className="text-[11px] text-surface-400 font-mono font-medium mt-0.5">#ORD{item.id}</span>
                          </button>
                        </td>
                        <td className="px-[22px] py-2.5 text-left font-mono text-xs font-black text-surface-700">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-100 rounded-lg text-xs border border-surface-200">
                            {item.currency}
                          </span>
                        </td>
                        <td className="px-[22px] py-2.5 text-left">
                          <span className="text-sm font-black text-surface-900">{item.store}</span>
                        </td>
                        <td className="px-[22px] py-2.5">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold border",
                            item.status === 'Active' && "bg-success-50 text-success-600 border-success-500/20",
                            item.status === 'Draft' && "bg-[#E6EEF9] text-[#4267B2] border-[#4267B2]/20",
                            item.status === 'Archived' && "bg-danger-50 text-danger-600 border-danger-500/20",
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
                        <td className="px-[22px] py-2.5 text-right pr-12 relative">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingCatalog(item)}
                              className="inline-flex items-center justify-center gap-1.5 h-8.5 px-4 bg-white border border-[#E2E6ED] hover:border-[#55349A]/40 rounded-xl text-xs font-bold text-[#55349A] hover:bg-[#FDFBFF] hover:shadow-2xs transition-all cursor-pointer select-none"
                            >
                              <Pencil className="h-3.5 w-3.5 text-[#55349A]" />
                              <span>Edit</span>
                            </button>

                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(activeDropdownId === item.id ? null : item.id);
                                }}
                                className="p-1.5 border border-surface-200 rounded-lg text-surface-400 hover:text-surface-900 transition-colors shadow-sm cursor-pointer flex items-center justify-center bg-white"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>

                              {activeDropdownId === item.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40 bg-transparent"
                                    onClick={() => setActiveDropdownId(null)}
                                  />
                                  <div className="absolute right-0 mt-2 w-48 bg-white border border-surface-200 rounded-xl shadow-xl z-50 py-1.5 text-left animate-in fade-in slide-in-from-top-1 duration-150 min-w-[190px]">
                                    <button
                                      onClick={() => {
                                        setViewingCatalog(item);
                                        setActiveDropdownId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-surface-700 hover:bg-surface-50 hover:text-surface-900 transition-colors flex items-center gap-2 cursor-pointer border-none"
                                    >
                                      <Eye className="h-3.5 w-3.5 text-blue-650" />
                                      View Details
                                    </button>

                                    <button
                                      onClick={() => {
                                        const rNo = String(Math.floor(100000 + Math.random() * 900000));
                                        const newCatalog: OrderCatalogItem = {
                                          ...item,
                                          id: rNo,
                                          name: `${item.name} (Copy)`,
                                          status: 'Draft',
                                          lastModified: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                                        };
                                        setCatalogs(prev => [newCatalog, ...prev]);
                                        setActiveDropdownId(null);
                                        alert(`Order catalog duplicated successfully as "${newCatalog.name}" (#ORD${newCatalog.id})!`);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-surface-700 hover:bg-surface-50 hover:text-surface-900 transition-colors flex items-center gap-2 cursor-pointer border-none"
                                    >
                                      <Plus className="h-3.5 w-3.5 text-emerald-650" />
                                      Duplicate Catalog
                                    </button>

                                    <button
                                      onClick={() => {
                                        const nextStatus: OrderCatalogItem['status'] = item.status === 'Active' ? 'Archived' : 'Active';
                                        updateStatusMutation.mutate({ uid: item.id, status: nextStatus.toUpperCase() });
                                        setCatalogs(prev => prev.map(c => c.id === item.id ? { ...c, status: nextStatus } : c));
                                        setActiveDropdownId(null);
                                        alert(`Order catalog "${item.name}" status switched to ${nextStatus}!`);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-surface-700 hover:bg-surface-50 hover:text-surface-900 transition-colors flex items-center gap-2 cursor-pointer border-none"
                                    >
                                      <Activity className="h-3.5 w-3.5 text-amber-600" />
                                      Switch Status ({item.status === 'Active' ? 'Archive' : 'Activate'})
                                    </button>

                                    <div className="h-px bg-surface-100 my-1" />

                                    <button
                                      onClick={() => {
                                        if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
                                          deleteCatalogMutation.mutate(item.id);
                                          setCatalogs(prev => prev.filter(c => c.id !== item.id));
                                          alert(`Catalog "${item.name}" deleted.`);
                                        }
                                        setActiveDropdownId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-red-650 hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer border-none"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
        </div>
      </div>
    </div>
  );
};
