import React, { useState } from 'react';
import {
  ArrowLeft, Search, Pencil, ChevronDown, Check, X,
  Plus, MoreHorizontal, Store, Trash2, ShieldAlert, Layers,
  Filter, Ban
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  useAddInventoryCatalogItem,
  useInventoryCatalogItems,
  useRemoveInventoryCatalogItem
} from '../../../services/useInventoryCatalogs';
import { useItems } from '../../../services/useItems';
import { useUnits } from '../../../services/useUnits';

// Helper component to render beautiful item thumbnails with error fallback
const ItemThumb = ({ src, alt = "Product Thumbnail", className }: { src?: string; alt?: string; className?: string }) => {
  const [hasError, setHasError] = useState(false);

  if (src && !src.startsWith('/') && !hasError) {
    return (
      <div className={cn("w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0 shadow-sm relative bg-slate-50 flex items-center justify-center", className)}>
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={cn("w-10 h-10 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden", className)}>
      <svg className="w-6 h-6 text-slate-500 fill-slate-300/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 4V2a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v2" />
        <path d="M3 10V7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v3a1 1 0 0 1-1 1h-1.55a1 1 0 0 0-.77.36L15 14H9L6.32 11.36a1 1 0 0 0-.77-.36H4a1 1 0 0 1-1-1Z" />
        <path d="M18 11v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-9" />
      </svg>
      <div className="absolute right-0.5 bottom-0.5 w-1.5 h-1.5 rounded-full bg-[#55349A]/50" />
    </div>
  );
};

interface CatalogItem {
  id: string;
  itemUid: string;
  name: string;
  tags: string;
  stock: number;
  variants: number;
  itemThreshold: number;
  image?: string;
}

interface InventoryCatalogDetailsViewProps {
  catalog: {
    id: string;
    name: string;
    store: string;
    status: 'Active' | 'Draft' | 'Archived';
    description?: string;
  };
  onBack: () => void;
  onEdit: () => void;
  onUpdateStatus?: (newStatus: 'Active' | 'Draft' | 'Archived') => void;
}

export const InventoryCatalogDetailsView = ({
  catalog,
  onBack,
  onEdit,
  onUpdateStatus
}: InventoryCatalogDetailsViewProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [stockFilter, setStockFilter] = useState<'All' | 'Low Stock' | 'In Stock'>('All');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  const { data: catalogItems = [], isLoading: catalogItemsLoading } = useInventoryCatalogItems(catalog.id);
  const { data: backendItems = [], isLoading: backendItemsLoading } = useItems();
  const addItemMutation = useAddInventoryCatalogItem();
  const removeItemMutation = useRemoveInventoryCatalogItem();

  // InventoryCatalogItemDto carries only itemUid (no item name/sku/category), so resolve those
  // from the item master already loaded via useItems() — otherwise every row renders "Unnamed
  // Item". `itemDetail` is used first if the backend ever embeds it (newer builds may).
  const { data: units = [] } = useUnits(); // INV-006: base-unit symbol for the Stock column
  const unitSymbolByUid = React.useMemo(
    () => new Map((units as any[]).map((u: any) => [u.uid, u.symbol || u.name])),
    [units]
  );
  const itemMasterByUid = React.useMemo(() => {
    const map = new Map<string, any>();
    (backendItems || []).forEach((it: any) => {
      const uid = it.uid || it.id;
      if (uid) map.set(String(uid), it);
    });
    return map;
  }, [backendItems]);

  const items = React.useMemo<CatalogItem[]>(() => catalogItems.map((catalogItem: any) => {
    const detail = catalogItem.itemDetail || {};
    const itemUid = catalogItem.itemUid || detail.uid || detail.id || catalogItem.id;
    const master = itemMasterByUid.get(String(itemUid)) || {};
    const stockFromBatches = Array.isArray(catalogItem.batches)
      ? catalogItem.batches.reduce((sum: number, batch: any) => sum + Number(batch.inHand ?? batch.stock ?? batch.quantity ?? 0), 0)
      : 0;
    const tags = [
      detail.categoryName || detail.category || catalogItem.categoryName || master.categoryName || master.category,
      detail.sku || catalogItem.itemSku || catalogItem.sku || master.sku,
      catalogItem.status
    ].filter(Boolean).join(' / ');

    return {
      id: catalogItem.id || catalogItem.uid || catalogItem.itemUid,
      itemUid,
      // Prefer the name the backend now resolves on the catalog-item DTO; the item-master map is
      // only a fallback (it is paginated and misses items, which produced "Unnamed Item").
      name: catalogItem.itemAliasName || catalogItem.itemName || detail.name || catalogItem.name || master.name || master.itemName || 'Unnamed Item',
      tags: tags || 'No item details available',
      stock: Number(catalogItem.stock ?? catalogItem.inHand ?? detail.stock ?? detail.inHand ?? stockFromBatches),
      variants: Number(detail.variantsCount ?? detail.variants?.length ?? master.variants?.length ?? catalogItem.units?.length ?? (catalogItem.variantUid ? 1 : 0)),
      itemThreshold: Number(detail.itemThreshold ?? detail.reorderLevel ?? catalogItem.itemThreshold ?? master.itemThreshold ?? 0),
      image: detail.image || detail.imageUrl || catalogItem.image || catalogItem.imageUrl || master.image,
      // INV-006: base-unit symbol + batch-tracked flag for the Stock column.
      unit: (master.baseUnitUid ? (unitSymbolByUid.get(master.baseUnitUid) || '') : ''),
      batchTracked: Boolean(master.batchApplicable ?? master.trackBatch ?? (Array.isArray(catalogItem.batches) && catalogItem.batches.length > 0)),
    } as any;
  }).filter((item: CatalogItem) => item.id), [catalogItems, itemMasterByUid, unitSymbolByUid]);

  const availableItems = React.useMemo(() => {
    const linkedItemUids = new Set(items.map((item) => item.itemUid));
    return backendItems
      .map((item: any) => ({
        id: item.uid || item.id,
        name: item.name || item.itemName || 'Unnamed Item',
        sku: item.sku || item.itemCode || item.code || '',
      }))
      .filter((item: any) => item.id && !linkedItemUids.has(item.id));
  }, [backendItems, items]);

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [selectedItemUid, setSelectedItemUid] = useState('');

  const [activeItemDotMenuId, setActiveItemDotMenuId] = useState<string | null>(null);

  const handleUpdateStatus = (status: 'Active' | 'Draft' | 'Archived') => {
    if (onUpdateStatus) {
      onUpdateStatus(status);
    }
    setStatusMenuOpen(false);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemUid) return;
    addItemMutation.mutate(
      { catalogUid: catalog.id, itemData: { itemUid: selectedItemUid, active: true } },
      {
        onSuccess: () => {
          setSelectedItemUid('');
          setIsAddItemOpen(false);
        }
      }
    );
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm('Are you sure you want to delete this item from the catalog?')) {
      removeItemMutation.mutate({ catalogUid: catalog.id, itemUid: itemId });
    }
    setActiveItemDotMenuId(null);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.tags.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (stockFilter === 'Low Stock') {
      return item.stock <= item.itemThreshold;
    }
    if (stockFilter === 'In Stock') {
      return item.stock > item.itemThreshold;
    }
    return true;
  });

  return (
    <div id="inventory-catalog-details-view-root" className="flex flex-col flex-1 h-full bg-[#F5F6F8]">
      {/* Top Header Navigation */}
      <div id="inventory-details-top-header" className="bg-white border-b border-slate-100 py-4 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            id="back-to-catalogs-btn"
            onClick={onBack}
            className="p-1 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-slate-800" />
          </button>
          <h1 id="inventory-details-page-title" className="text-lg font-bold text-slate-900 tracking-tight">
            Inventory Catalog Details
          </h1>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-7xl w-full mx-auto">
        {/* Catalog Banner/Board exactly matching design in picture */}
        <div id="catalog-summary-board" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col gap-5 relative overflow-hidden">
          <div className="w-full flex flex-col gap-5">
            <div className="w-full flex flex-col gap-5 text-left">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                <div className="flex items-start gap-3.5">
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 id="catalog-name-display" className="text-xl font-extrabold text-[#55349A] tracking-tight leading-none">
                        {catalog.name}
                      </h2>
                      <div className="relative">
                        <button
                          id="catalog-status-toggle-pill"
                          onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase transition-all select-none cursor-pointer border",
                            catalog.status === 'Active' && "bg-emerald-50 text-emerald-600 border-emerald-200/60 hover:bg-emerald-100/50",
                            catalog.status === 'Draft' && "bg-blue-50 text-blue-600 border-blue-200/60 hover:bg-blue-100/50",
                            catalog.status === 'Archived' && "bg-rose-50 text-rose-600 border-rose-200/60 hover:bg-rose-100/50"
                          )}
                        >
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            catalog.status === 'Active' && "bg-emerald-500",
                            catalog.status === 'Draft' && "bg-blue-500",
                            catalog.status === 'Archived' && "bg-rose-500"
                          )} />
                          <span>{catalog.status}</span>
                          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                        </button>

                        {statusMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setStatusMenuOpen(false)} />
                            <div className="absolute left-0 mt-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-40 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 text-left">
                              {(['Active', 'Draft', 'Archived'] as const).map((statusOption) => (
                                <button
                                  key={statusOption}
                                  type="button"
                                  onClick={() => handleUpdateStatus(statusOption)}
                                  className={cn(
                                    "w-full px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between",
                                    catalog.status === statusOption ? "text-[#55349A] bg-violet-50/50" : "text-slate-600 hover:bg-slate-50"
                                  )}
                                >
                                  <span>{statusOption}</span>
                                  {catalog.status === statusOption && <Check className="w-3.5 h-3.5 text-[#55349A]" />}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <span id="catalog-id-display" className="text-xs text-slate-400 font-extrabold mt-1.5">
                      #{catalog.id.startsWith('INV') ? catalog.id : `INV${catalog.id}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Store Information Segment matches picture perfectly */}
                  <div id="store-association-plate" className="bg-[#FAFAFB] border border-[#EAEBF0] rounded-xl px-4 py-2 flex items-center gap-3 shadow-3xs h-12">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 border border-white flex items-center justify-center shrink-0 shadow-2xs">
                      <svg viewBox="0 0 64 64" className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 28v22a2 2 0 002 2h36a2 2 0 002-2V28" />
                        <path d="M8 14h48v14H8z" className="fill-orange-50/30" />
                      </svg>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-extrabold text-slate-800 text-xs tracking-tight uppercase leading-tight">
                        {catalog.store || '-'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold leading-tight">
                        #1
                      </span>
                    </div>
                  </div>

                  {/* Edit Catalog Button */}
                  <button
                    id="edit-catalog-entry-btn"
                    onClick={onEdit}
                    className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-[#F1EFF7] hover:bg-[#E9E4F5] hover:text-[#452a7d] rounded-xl text-xs font-bold text-[#55349A] select-none transition-all duration-200 cursor-pointer"
                  >
                    <Pencil className="h-4 w-4" />
                    <span>Edit Catalog</span>
                  </button>

                  {/* Dropdown More Actions */}
                  <div className="relative">
                    <button
                      id="more-catalog-actions-dropdown-btn"
                      type="button"
                      onClick={() => setMoreActionsOpen(!moreActionsOpen)}
                      className="inline-flex items-center justify-center gap-1.5 h-10 px-5 bg-[#2B2D3B] hover:bg-[#1E202B] rounded-xl text-xs font-bold text-white shadow-md cursor-pointer select-none transition-all duration-150"
                    >
                      <span>More Actions</span>
                      <ChevronDown className={cn("h-4 w-4 stroke-[2.5] transition-transform duration-150", moreActionsOpen && "rotate-180")} />
                    </button>

                    {moreActionsOpen && (
                      <>
                        <div className="fixed inset-0 z-30 bg-transparent" onClick={() => setMoreActionsOpen(false)} />
                        <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-40 py-1.5 overflow-hidden text-left animate-in fade-in slide-in-from-top-1">
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateStatus('Archived');
                              setMoreActionsOpen(false);
                            }}
                            className="w-full px-4 py-2 hover:bg-slate-50 text-xs font-bold text-rose-600 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5 text-rose-500" />
                            <span>Disable</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateStatus('Active');
                              setMoreActionsOpen(false);
                            }}
                            className="w-full px-4 py-2 hover:bg-slate-50 text-xs font-bold text-emerald-600 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Enable</span>
                          </button>


                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Catalog Description Box - Matching Image Exactly */}
              {catalog.description && (
                <div className="pt-6 border-t border-[#EAEBF0] text-left space-y-3.5 w-full">
                  <span className="text-[11.5px] font-bold text-[#8FA3C7] uppercase tracking-wider block">
                    CATALOG DESCRIPTION
                  </span>
                  <p id="catalog-description-display" className="bg-[#F8F9FC] rounded-2xl border border-[#EAEBF0] p-5 text-sm font-semibold text-slate-600 leading-relaxed block w-full">
                    {catalog.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Core Items container Card matching mockup exactly */}
        <div id="catalog-items-panel" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-sans font-extrabold text-slate-900 text-[14px] uppercase tracking-wider select-none">
              Items
            </h3>

            <div className="flex items-center gap-2">
              {/* Filter Dropdown */}
              <div className="relative">
                <button
                  id="catalog-items-filter-dropdown-btn"
                  type="button"
                  onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-bold transition-all select-none cursor-pointer",
                    stockFilter !== 'All'
                      ? "border-[#55349A] text-[#55349A] bg-[#55349A]/5 shadow-sm"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  )}
                >
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span>Filter{stockFilter !== 'All' ? `: ${stockFilter}` : ''}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {filterDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setFilterDropdownOpen(false)} />
                    <div className="absolute right-0 mt-1.5 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-45 py-1.5 text-left animate-in fade-in slide-in-from-top-1">
                      {(['All', 'In Stock', 'Low Stock'] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setStockFilter(option);
                            setFilterDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-between text-left cursor-pointer",
                            stockFilter === option ? "text-[#55349A] font-extrabold bg-[#55349A]/5" : "text-slate-600"
                          )}
                        >
                          <span>{option}</span>
                          {stockFilter === option && <Check className="w-3.5 h-3.5 text-[#55349A]" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Add Item Trigger button on right */}
              <button
                id="trigger-add-item-modal-btn"
                type="button"
                onClick={() => setIsAddItemOpen(true)}
                className="border border-[#55349A] text-[#55349A] hover:bg-violet-50/50 hover:border-[#452a7d] hover:text-[#452a7d] transition-all px-4 py-1.5 rounded-lg text-xs font-bold font-sans cursor-pointer select-none shadow-3xs"
              >
                Add Item
              </button>
            </div>
          </div>

          {/* Table Toolbar containing search field */}
          <div className="p-4 border-b border-slate-100 bg-[#FAFAFB]/30">
            <div className="relative max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="item-table-search-box"
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#EAEBF0] rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none transition-all shadow-3xs"
              />
            </div>
          </div>

          {/* High-fidelity table with layout requested */}
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-surface-50 border-y border-surface-100 select-none text-surface-400 text-[10.5px] font-bold uppercase tracking-wider">
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">ITEMS</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">STOCK</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">VARIANTS</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">ITEM THRESHOLD</th>
                  <th className="px-[22px] py-2.5 text-right w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {catalogItemsLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold text-xs">
                      Loading catalog items...
                    </td>
                  </tr>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="border-b border-surface-100 px-[22px] py-2.5 text-[12.5px] hover:bg-surface-50 transition-colors">
                      {/* Items Column: Image thumbnail + title + tags */}
                      <td className="px-[22px] py-2.5">
                        <div className="flex items-center gap-3">
                          <ItemThumb src={item.image} alt={item.name} />
                          <div className="flex flex-col text-left">
                            <span className="font-extrabold text-[#2B2D3B] text-sm leading-tight">
                              {item.name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-bold mt-1 max-w-[180px] md:max-w-xs truncate" title={item.tags}>
                              {item.tags}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Stock Column — INV-006: qty with base unit + a batch-tracked chip */}
                      <td className="px-[22px] py-2.5">
                        <span className="font-extrabold text-[#2B2D3B] text-sm">
                          {item.stock}{(item as any).unit ? <span className="text-[11px] font-bold text-slate-400 ml-1">{(item as any).unit}</span> : null}
                        </span>
                        {(item as any).batchTracked && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#55349A]/10 text-[#55349A] text-[9px] font-black uppercase tracking-wide align-middle">Batch</span>
                        )}
                      </td>

                      {/* Variants Column */}
                      <td className="px-[22px] py-2.5">
                        <span className="font-extrabold text-[#2B2D3B] text-sm">
                          {item.variants}
                        </span>
                      </td>

                      {/* Item Threshold Column */}
                      <td className="px-[22px] py-2.5">
                        <span className="font-bold text-[#2B2D3B] text-sm">
                          {item.itemThreshold}
                        </span>
                      </td>

                      {/* More actions dot-menu trigger */}
                      <td className="px-[22px] py-2.5 text-right relative">
                        <button
                          onClick={() => setActiveItemDotMenuId(activeItemDotMenuId === item.id ? null : item.id)}
                          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {activeItemDotMenuId === item.id && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setActiveItemDotMenuId(null)} />
                            <div className="absolute right-6 top-12 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-40 py-1.5 text-left overflow-hidden">
                              <button
                                onClick={() => handleDeleteItem(item.itemUid)}
                                className="w-full px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Remove Item
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold text-xs">
                      No matching items found inside this catalog.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Item Drawer/Modal Form */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={() => setIsAddItemOpen(false)} />
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl transition-all border border-slate-150 z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-[#EAEBF0] py-4 px-6 flex items-center justify-between">
              <span className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
                Add Catalog Item
              </span>
              <button
                onClick={() => setIsAddItemOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg cursor-pointer text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddItem} className="p-6 space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Item</label>
                <select
                  required
                  value={selectedItemUid}
                  onChange={(e) => setSelectedItemUid(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-[#EAEBF0] rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#55349A]/15 focus:border-[#55349A] outline-none transition-all"
                >
                  <option value="">{backendItemsLoading ? 'Loading items...' : 'Select item'}</option>
                  {availableItems.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.name}{item.sku ? ` (${item.sku})` : ''}
                    </option>
                  ))}
                </select>
                {!backendItemsLoading && availableItems.length === 0 && (
                  <p className="text-[11px] font-semibold text-slate-400">
                    No unassigned backend items are available.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 font-bold hover:bg-slate-200 transition-colors text-slate-700 text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedItemUid || addItemMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-[#55349A] font-bold hover:bg-[#452a7d] transition-colors text-white text-xs rounded-xl shadow-md"
                >
                  {addItemMutation.isPending ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
