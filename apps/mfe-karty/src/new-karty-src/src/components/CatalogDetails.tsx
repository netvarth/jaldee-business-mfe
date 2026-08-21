import React from 'react';
import {
  ArrowLeft, Pencil, MoreHorizontal, Search,
  ChevronLeft, ChevronRight, LayoutGrid, List,
  Calendar, Store, Activity, FileText, ChevronDown, ChevronRight as ChevronRightIcon,
  Trash2, Package, ShoppingCart, X, Sliders, Coins, Boxes,
  Eye, EyeOff, Power, Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { CreatePurchase } from './CreatePurchase';
import { useInventoryCatalogItems } from '../../../services/useInventoryCatalogs';
import { CatalogItemUnitPriceEditor } from './CatalogItemUnitPriceEditor';

interface Batch {
  id: string;
  expiryDate: string;
  inHand: number;
  onHold: number;
  status: 'In Stock' | 'Expired';
  salesPrice?: number;
  mrp?: number;
}

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  sku: string;
  variants: number;
  image: string;
  inHand: number;
  onHold: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  batches?: Batch[];
  sellingPrice: number;
  mrp: number;
  batchNumber: string;
  disabled?: boolean;
}

interface CatalogDetailsProps {
  title?: string;
  catalog: {
    id: string;
    name: string;
    store: string;
    status: 'Active' | 'Draft' | 'Archived';
    description?: string;
    currency?: string;
    walkInPos?: 'Yes' | 'No';
    storePickup?: 'Yes' | 'No';
    homeDelivery?: 'Yes' | 'No';
    inventoryManagement?: boolean;
    selectedInvCatalogs?: string[];
    lastModified?: string;
  };
  onBack: () => void;
  onEdit: () => void;
}

export const CatalogDetails = ({ title = 'Catalog Details', catalog, onBack, onEdit }: CatalogDetailsProps) => {
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');
  const [expandedRows, setExpandedRows] = React.useState<string[]>([]);
  const [activeActionMenu, setActiveActionMenu] = React.useState<string | null>(null);
  const [editingPriceItemId, setEditingPriceItemId] = React.useState<string | null>(null);
  const [showCreatePurchase, setShowCreatePurchase] = React.useState(false);
  const [showMRP, setShowMRP] = React.useState(true);

  const linkedInvIds = catalog.selectedInvCatalogs || [];
  const [activeInvTab, setActiveInvTab] = React.useState<string>(linkedInvIds[0] || catalog.id);
  const { data: backendCatalogItems = [] } = useInventoryCatalogItems(activeInvTab || catalog.id);
  const mappedCatalogItems = React.useMemo<CatalogItem[]>(() => backendCatalogItems.map((catalogItem: any) => {
    const detail = catalogItem.itemDetail || {};
    const batches = Array.isArray(catalogItem.batches) ? catalogItem.batches.map((batch: any) => ({
      id: batch.id || batch.uid || batch.batchNumber || 'N/A',
      expiryDate: batch.expiryDate || batch.expiry || '',
      inHand: Number(batch.inHand ?? batch.stock ?? batch.quantity ?? 0),
      onHold: Number(batch.onHold ?? batch.holdQty ?? 0),
      status: batch.status === 'EXPIRED' ? 'Expired' : 'In Stock',
      salesPrice: Number(batch.salesPrice ?? batch.sellingPrice ?? catalogItem.sellingPrice ?? 0),
      mrp: Number(batch.mrp ?? catalogItem.mrp ?? 0),
    })) : [];
    const inHand = Number(catalogItem.inHand ?? detail.inHand ?? batches.reduce((sum: number, batch: Batch) => sum + batch.inHand, 0));
    const status: CatalogItem['status'] = inHand <= 0 ? 'Out of Stock' : inHand <= Number(detail.itemThreshold ?? detail.reorderLevel ?? 0) ? 'Low Stock' : 'In Stock';
    return {
      id: catalogItem.id || catalogItem.uid || catalogItem.itemUid,
      name: catalogItem.itemAliasName || detail.name || catalogItem.name || 'Unnamed Item',
      category: detail.categoryName || detail.category || catalogItem.categoryName || 'Uncategorized',
      sku: detail.sku || catalogItem.sku || '',
      variants: Number(detail.variantsCount ?? detail.variants?.length ?? catalogItem.units?.length ?? (catalogItem.variantUid ? 1 : 0)),
      image: detail.image || detail.imageUrl || catalogItem.image || catalogItem.imageUrl || '',
      inHand,
      onHold: Number(catalogItem.onHold ?? detail.onHold ?? 0),
      status,
      batches,
      sellingPrice: Number(catalogItem.sellingPrice ?? detail.sellingPrice ?? 0),
      mrp: Number(catalogItem.mrp ?? detail.mrp ?? 0),
      batchNumber: catalogItem.batchNumber || batches[0]?.id || 'N/A',
      disabled: catalogItem.status === 'DISABLED',
    };
  }).filter((item: CatalogItem) => item.id), [backendCatalogItems]);
  const [currentItems, setCurrentItems] = React.useState<CatalogItem[]>([]);

  React.useEffect(() => {
    setCurrentItems(mappedCatalogItems);
  }, [mappedCatalogItems]);

  const inventoryTabs = React.useMemo(() => {
    if (linkedInvIds.length > 0) {
      return linkedInvIds.map((id) => ({ id, name: `Catalog ${id}` }));
    }
    return [{ id: catalog.id, name: catalog.name }];
  }, [catalog.id, catalog.name, linkedInvIds]);

  const toggleRow = (itemId: string) => {
    setExpandedRows(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClick = () => setActiveActionMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  if (showCreatePurchase) {
    return (
      <CreatePurchase
        onBack={() => setShowCreatePurchase(false)}
        onCreate={(data) => {
          console.log('New Purchase:', data);
          setShowCreatePurchase(false);
        }}
      />
    );
  }

  const ActionMenu = ({ itemId }: { itemId: string }) => {
    const item = currentItems.find(i => i.id === itemId);
    if (!item) return null;

    return (
      <div
        className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-surface-200 py-1.5 z-50 text-left animate-in fade-in slide-in-from-top-1 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-1 text-[10px] font-extrabold text-[#7C8DB5] uppercase tracking-wider border-b border-surface-100 pb-1 mb-1.5">
          General Actions
        </div>
        <button
          type="button"
          onClick={() => {
            alert(`Adjust stock triggered for item: ${item.name}`);
            setActiveActionMenu(null);
          }}
          className="w-full px-4 py-2 text-xs font-bold text-surface-700 hover:bg-surface-50 flex items-center gap-2.5 transition-colors"
        >
          <Activity className="h-3.5 w-3.5 text-primary-600 shrink-0" />
          Adjust stock
        </button>
        <button
          type="button"
          onClick={() => { setEditingPriceItemId(itemId); setActiveActionMenu(null); }}
          className="w-full px-4 py-2 text-xs font-bold text-surface-700 hover:bg-surface-50 flex items-center gap-2.5 transition-colors"
        >
          <Activity className="h-3.5 w-3.5 text-primary-600 shrink-0" />
          Edit unit prices
        </button>
        <button
          type="button"
          onClick={() => {
            const confirmed = window.confirm(`Are you sure you want to remove ${item.name}?`);
            if (confirmed) {
              setCurrentItems(prev => prev.filter(i => i.id !== itemId));
            }
            setActiveActionMenu(null);
          }}
          className="w-full px-4 py-2 text-xs font-bold text-danger-600 hover:bg-danger-50 flex items-center gap-2.5 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
          Remove item
        </button>

        {/* 1. Show MRP Toggle Option */}
        <div className="border-t border-surface-100 my-1.5 pt-1.5">
          <div className="px-3 py-1 text-[10px] font-extrabold text-[#7C8DB5] uppercase tracking-wider mb-1">
            Display Preferences
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMRP(v => !v);
            }}
            className="w-full px-4 py-2 text-xs font-bold text-surface-700 hover:bg-surface-50 flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2.5">
              {showMRP ? (
                <Eye className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              )}
              <span>Show MRP Price</span>
            </span>
            <span className={cn(
              "text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase leading-none border",
              showMRP ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"
            )}>
              {showMRP ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        {/* 2. Item Status Selector */}
        <div className="border-t border-surface-100 my-1.5 pt-1.5">
          <div className="px-3 py-1 text-[10px] font-extrabold text-[#7C8DB5] uppercase tracking-wider mb-1">
            Item Stock Status
          </div>
          {(['In Stock', 'Low Stock', 'Out of Stock'] as const).map((statusVal) => {
            const isSelected = item.status === statusVal;
            return (
              <button
                key={statusVal}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentItems(prev => prev.map(i => i.id === itemId ? { ...i, status: statusVal } : i));
                  setActiveActionMenu(null);
                }}
                className="w-full px-4 py-1.5 text-xs font-semibold text-surface-600 hover:bg-surface-50 flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    statusVal === 'In Stock' && "bg-success-500",
                    statusVal === 'Low Stock' && "bg-orange-500",
                    statusVal === 'Out of Stock' && "bg-danger-500"
                  )} />
                  <span>{statusVal}</span>
                </span>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary-600 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* 3. Enable / Disable Toggle Option */}
        <div className="border-t border-surface-100 my-1.5 pt-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentItems(prev => prev.map(i => i.id === itemId ? { ...i, disabled: !i.disabled } : i));
              setActiveActionMenu(null);
            }}
            className="w-full px-4 py-2 text-xs font-bold text-surface-700 hover:bg-surface-50 flex items-center justify-between transition-all"
          >
            <span className="flex items-center gap-2.5">
              <Power className={cn("h-3.5 w-3.5", item.disabled ? "text-slate-400" : "text-emerald-500")} />
              <span>{item.disabled ? 'Enable Item' : 'Disable Item'}</span>
            </span>
            <span className={cn(
              "text-[9px] font-black px-2 py-0.5 rounded uppercase leading-none border",
              item.disabled ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-700 border-emerald-110"
            )}>
              {item.disabled ? 'DISABLED' : 'ACTIVE'}
            </span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#F8F9FA]">
      {/* Header Bar */}
      <div className="bg-white border-b border-surface-100 py-3.5 px-8 flex items-center gap-4 shrink-0">
        <button
          onClick={onBack}
          className="p-1 hover:bg-surface-100 rounded transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-surface-900" />
        </button>
        <h1 className="text-lg font-bold text-surface-900 tracking-tight">{title}</h1>
      </div>

      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {/* Consolidated Catalog Header */}
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-100 flex items-center justify-between bg-surface-50/20">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-surface-900 tracking-tight leading-tight">{catalog.name}</h2>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                    catalog.status === 'Active' && "bg-success-50 text-success-600",
                    catalog.status === 'Draft' && "bg-[#E6EEF9] text-[#4267B2]",
                    catalog.status === 'Archived' && "bg-danger-50 text-danger-600",
                  )}>
                    {catalog.status}
                  </span>
                </div>
                {title !== 'Order Catalog Details' && (
                  <span className="text-[11px] text-surface-400 font-medium tracking-tight">Catalog ID: #{catalog.id}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={onEdit}
                  className="flex items-center gap-2 px-3 py-1.5 border border-surface-200 rounded-lg text-xs font-bold text-primary-700 hover:bg-primary-50 transition-colors shadow-sm"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button className="p-1.5 border border-surface-200 rounded-lg text-surface-400 hover:text-surface-900 transition-colors shadow-sm">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-5">
            <p className="text-[13px] text-surface-600 leading-relaxed mb-4 max-w-3xl">
              {catalog.description || "Contains pricing structures, multi-channel dispatch settings, currency assignments, and point-of-sale routes."}
            </p>

            {title === 'Order Catalog Details' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-surface-100 text-left">
                {/* 1. Sales Channels (Walk-In POS, Store Pickup, Home Delivery) */}
                <div className="p-4 bg-surface-50 border border-surface-200 rounded-2xl">
                  <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-3.5 flex items-center gap-1.5 leading-none">
                    <Sliders className="h-4 w-4 text-primary-600" />
                    Sales & Dispatch Channels
                  </h3>
                  <div className="space-y-2.5 font-semibold text-xs text-surface-700">
                    <div className="flex items-center justify-between py-1 border-b border-surface-100">
                      <span>Walk-In POS Route</span>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase text-center min-w-[55px]",
                        catalog.walkInPos === 'Yes' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-500 border border-slate-200"
                      )}>
                        {catalog.walkInPos || 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-surface-100">
                      <span>Store Pickup Service</span>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase text-center min-w-[55px]",
                        catalog.storePickup === 'Yes' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-500 border border-slate-200"
                      )}>
                        {catalog.storePickup || 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span>Home Delivery Network</span>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase text-center min-w-[55px]",
                        catalog.homeDelivery === 'Yes' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-500 border border-slate-200"
                      )}>
                        {catalog.homeDelivery || 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Core Config (Currency, Store location, Inventory sync status) */}
                <div className="p-4 bg-surface-50 border border-surface-200 rounded-2xl">
                  <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-3.5 flex items-center gap-1.5 leading-none">
                    <Coins className="h-4 w-4 text-amber-600" />
                    Store & Price Parameters
                  </h3>
                  <div className="space-y-2.5 font-semibold text-xs text-surface-700">
                    <div className="flex items-center justify-between py-1 border-b border-surface-100">
                      <span>Linked Store Location</span>
                      <span className="font-extrabold text-[#55349A]">{catalog.store}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-surface-100">
                      <span>Base Catalog Currency</span>
                      <span className="font-mono text-[11px] font-bold text-surface-900 bg-white px-2 py-0.5 border border-surface-200 rounded leading-none">
                        {catalog.currency || 'INR (₹)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span>Inventory Management</span>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase",
                        catalog.inventoryManagement !== false ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-200"
                      )}>
                        {catalog.inventoryManagement !== false ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-surface-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                    <Store className="h-3.5 w-3.5 text-primary-600" />
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-surface-400 uppercase tracking-widest">Store</div>
                    <div className="text-[12px] font-bold text-surface-900">{catalog.store}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Activity className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-surface-400 uppercase tracking-widest">Status</div>
                    <div className="text-[10px] font-bold text-success-600 bg-success-50 px-1.5 py-0.5 rounded leading-none inline-block uppercase">
                      {catalog.status}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                    <LayoutGrid className="h-3.5 w-3.5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-surface-400 uppercase tracking-widest">Items</div>
                    <div className="text-[12px] font-bold text-surface-900">{currentItems.length} Total</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                    <Calendar className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-surface-400 uppercase tracking-widest">Modified</div>
                    <div className="text-[12px] font-bold text-surface-900">{catalog.lastModified || '-'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Items Table Section */}
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
          {/* Connected Inventory directory switcher tabs above search (integrated table header precisely matching image.png) */}
          {title === 'Order Catalog Details' && (
            <div className="bg-white border-b border-slate-100">
              {/* Header Row */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
                <h3 className="font-sans font-bold text-slate-800 text-[14px] select-none tracking-tight">
                  Inventory Catalogs
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    const name = prompt("Enter new Inventory Catalog name:", "New Catalog");
                    if (name && name.trim()) {
                      alert(`Created inventory catalog: ${name.trim()}`);
                    }
                  }}
                  className="border border-[#55349A] text-[#55349A] hover:bg-violet-50 hover:text-[#432380] transition-colors px-4 py-1.5 rounded-lg text-xs font-bold font-sans cursor-pointer select-none"
                >
                  Add Inventory
                </button>
              </div>

              {/* Tabs Row */}
              <div className="flex items-center gap-8 px-6 bg-[#f9f9f9] border-b border-slate-200/60 h-[44px] text-slate-600 overflow-x-auto scrollbar-none">
                {inventoryTabs.map((tab) => {
                  const isActive = activeInvTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveInvTab(tab.id)}
                      className={cn(
                        "relative h-full text-xs font-bold transition-all duration-200 cursor-pointer select-none whitespace-nowrap border-b-2 -mb-[1px] focus:outline-none",
                        isActive
                          ? "border-[#55349A] text-[#55349A]"
                          : "border-transparent text-slate-400 hover:text-slate-700"
                      )}
                    >
                      {tab.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {/* Items Toolbar */}
          <div className="px-5 py-3 border-b border-surface-100 flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search items..."
                className="pl-9 pr-4 py-1.5 bg-surface-50 border border-surface-200 rounded-lg text-sm outline-none focus:border-primary-500 w-64 transition-all shadow-sm"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center border border-surface-200 rounded-lg p-0.5 bg-white shadow-sm">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    viewMode === 'list' ? "bg-surface-100 text-surface-900 shadow-sm" : "text-surface-400 hover:text-surface-600"
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    viewMode === 'grid' ? "bg-surface-100 text-surface-900 shadow-sm" : "text-surface-400 hover:text-surface-600"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={() => setShowCreatePurchase(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-surface-200 text-surface-900 rounded-lg text-[13px] font-bold hover:bg-surface-50 transition-all shadow-sm active:scale-95"
              >
                <ShoppingCart className="h-4 w-4 text-surface-400" />
                Create Purchase
              </button>

              <button
                className="flex items-center gap-2 px-3 py-1.5 bg-[#55349A] text-white rounded-lg text-[13px] font-bold hover:bg-opacity-90 transition-all shadow-md active:scale-95"
              >
                + Add Item
              </button>
            </div>
          </div>

          {viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50/50 border-b border-surface-100">
                    <th className="py-3 px-5 w-10"></th>
                    <th className="py-3 px-5 text-[11px] font-bold text-surface-500 uppercase tracking-wider">Item Details</th>
                    <th className="py-3 px-5 text-[11px] font-bold text-surface-500 uppercase tracking-wider">Category</th>
                    <th className="py-3 px-5 text-[11px] font-bold text-surface-500 uppercase tracking-wider">Batch</th>
                    <th className="py-3 px-5 text-[11px] font-bold text-surface-500 uppercase tracking-wider">Selling Price</th>
                    {showMRP && <th className="py-3 px-5 text-[11px] font-bold text-surface-500 uppercase tracking-wider">MRP</th>}
                    <th className="py-3 px-5 text-[11px] font-bold text-surface-500 uppercase tracking-wider text-center">Inhand Stock</th>
                    <th className="py-3 px-5 text-[11px] font-bold text-surface-500 uppercase tracking-wider">Stock Status</th>
                    <th className="py-3 px-5 text-[11px] font-bold text-surface-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {currentItems.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr
                         className={cn(
                          "transition-colors",
                          item.batches && item.batches.length > 0
                            ? "hover:bg-surface-50/20 cursor-pointer"
                            : "cursor-default",
                          expandedRows.includes(item.id) && "bg-surface-50/10",
                          item.disabled && "opacity-60 bg-slate-50/50 hover:bg-slate-50/50"
                        )}
                        onClick={() => !item.disabled && item.batches && item.batches.length > 0 && toggleRow(item.id)}
                      >
                        <td className="py-3 px-5">
                          {item.batches && item.batches.length > 0 && !item.disabled && (
                            <div className="text-surface-400">
                              {expandedRows.includes(item.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRightIcon className="h-4 w-4" />
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-10 h-10 rounded-lg object-cover border border-surface-100 shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-surface-900 leading-tight">
                                {item.name}
                                {item.disabled && (
                                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-slate-200 text-slate-600 border border-slate-300">
                                    Disabled
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-surface-400 font-medium">#{item.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <span className="text-[12px] font-bold text-surface-600">{item.category}</span>
                        </td>
                        <td className="py-3 px-5">
                          {item.batches && item.batches.length > 0 ? (
                            <span className="text-slate-300 font-bold" title="See nested batch list in accordion below">—</span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-150 text-[11px] font-semibold font-mono leading-none">
                              <Package className="h-3 w-3 mr-1 text-slate-400 shrink-0" />
                              {item.batchNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-5">
                          <span className="text-[12px] font-bold text-[#55349A]">
                            ₹{item.sellingPrice.toLocaleString()}
                          </span>
                        </td>
                        {showMRP && (
                          <td className="py-3 px-5">
                            <span className="text-[11px] font-semibold text-slate-400 line-through">
                              ₹{item.mrp.toLocaleString()}
                            </span>
                          </td>
                        )}
                        <td className="py-3 px-5 text-center">
                          <span className="text-[12px] font-bold text-surface-900">{item.inHand}</span>
                        </td>
                        <td className="py-3 px-5">
                          {item.disabled ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-100 text-slate-500 border border-slate-205">
                              Disabled
                            </span>
                          ) : (
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              item.status === 'In Stock' && "bg-success-50 text-success-600",
                              item.status === 'Low Stock' && "bg-orange-50 text-orange-600",
                              item.status === 'Out of Stock' && "bg-danger-50 text-danger-600",
                            )}>
                              {item.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-right relative">
                          <button
                            className="p-1 px-2 hover:bg-surface-100 rounded text-surface-400 hover:text-surface-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionMenu(activeActionMenu === item.id ? null : item.id);
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {activeActionMenu === item.id && <ActionMenu itemId={item.id} />}
                        </td>
                      </tr>
                      {expandedRows.includes(item.id) && item.batches && item.batches.length > 0 && !item.disabled && (
                        <tr className="bg-surface-50/30">
                          <td colSpan={showMRP ? 9 : 8} className="p-0 border-l-[3px] border-primary-500">
                            <div className="px-10 py-3 bg-gradient-to-r from-primary-50/10 via-white to-white">
                              <table className="w-full text-left border-collapse bg-white rounded-lg border border-surface-200 overflow-hidden shadow-sm">
                                <thead>
                                  <tr className="bg-surface-50 border-b border-surface-100">
                                    <th className="py-2.5 px-4 text-[10px] font-bold text-surface-500 uppercase tracking-wider">Batch Number</th>
                                    <th className="py-2.5 px-4 text-[10px] font-bold text-surface-500 uppercase tracking-wider">Expiry</th>
                                    <th className="py-2.5 px-4 text-[10px] font-bold text-surface-500 uppercase tracking-wider">Sales Price (₹) <span className="text-[9px] font-normal text-surface-400 lowercase">(tax inclusive)</span></th>
                                    {showMRP && <th className="py-2.5 px-4 text-[10px] font-bold text-surface-500 uppercase tracking-wider">MRP (₹)</th>}
                                    <th className="py-2.5 px-4 text-[10px] font-bold text-surface-500 uppercase tracking-wider text-center">Inhand Stock</th>
                                    <th className="py-2.5 px-4 text-[10px] font-bold text-surface-500 uppercase tracking-wider text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-50">
                                  {item.batches.map((batch) => {
                                    const salesPriceVal = batch.salesPrice ?? item.sellingPrice;
                                    const mrpVal = batch.mrp ?? item.mrp;
                                    return (
                                      <tr key={batch.id} className="hover:bg-surface-50/50">
                                        <td className="py-2.5 px-4">
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary-50/60 border border-primary-100/50 text-[11px] font-bold text-primary-700 font-mono">
                                            <Boxes className="h-3.5 w-3.5 mr-1 text-primary-500 shrink-0" />
                                            {batch.id}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-4">
                                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-surface-700">
                                            <Calendar className="h-3 w-3 text-surface-400" />
                                            {batch.expiryDate}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-4">
                                          <span className="text-[12px] font-extrabold text-[#55349A]">
                                            ₹{salesPriceVal.toLocaleString()}
                                          </span>
                                        </td>
                                        {showMRP && (
                                          <td className="py-2.5 px-4">
                                            <span className="text-[11px] font-semibold text-slate-400 line-through">
                                              ₹{mrpVal.toLocaleString()}
                                            </span>
                                          </td>
                                        )}
                                        <td className="py-2.5 px-4 text-center">
                                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold">
                                            {batch.inHand}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-4 text-right">
                                          <button
                                            className="p-1 px-2.5 hover:bg-primary-50 rounded text-primary-600 border border-transparent hover:border-primary-100 transition-all shadow-sm active:scale-95 flex items-center gap-1.5 ml-auto"
                                            onClick={(e) => { e.stopPropagation(); }}
                                          >
                                            <Activity className="h-3 w-3" />
                                            <span className="text-[10px] font-bold">Adjust</span>
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "bg-white border border-surface-200 rounded-xl shadow-sm hover:shadow-md transition-shadow group flex flex-col relative overflow-hidden",
                    item.disabled && "opacity-70 bg-slate-50/50"
                  )}
                >
                  {/* Top: Image Section */}
                  <div className="p-1.5">
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-surface-50 border border-surface-100 relative">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      {item.disabled && (
                        <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[1px] flex items-center justify-center">
                          <span className="bg-slate-800 text-white font-mono text-[9px] font-black tracking-wider uppercase px-2.5 py-1 rounded-md shadow-md">
                            DISABLED ITEM
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body: Compact info sections */}
                  <div className="px-3 pb-3 flex-1 flex flex-col">
                    <div className="mb-2">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-[13px] font-bold text-surface-900 truncate leading-tight flex-1">
                          {item.name}
                        </h3>
                        {item.batches && item.batches.length > 0 ? (
                          <span className="text-[9px] bg-primary-50 border border-primary-150 text-primary-700 font-bold px-1.5 py-0.5 rounded leading-none shrink-0">
                            {item.batches.length} Batches
                          </span>
                        ) : (
                          <span className="text-[9px] bg-slate-50 border border-slate-150 text-slate-600 font-bold px-1.5 py-0.5 rounded font-mono leading-none shrink-0" title="Batch">
                            {item.batchNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[10px] text-surface-400 font-mono tracking-tight">#{item.id}</p>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100/60 px-1.5 py-0.5 rounded leading-none">{item.category}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 py-2 border-t border-b border-surface-50">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-surface-400 uppercase font-bold tracking-widest leading-none mb-1">Inhand Stock</span>
                        <span className="text-[11px] font-bold text-surface-900">{item.inHand}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[8px] text-surface-400 uppercase font-bold tracking-widest leading-none mb-1">Stock Status</span>
                        {item.disabled ? (
                          <span className="text-[9.5px] font-black uppercase text-slate-400">DISABLED</span>
                        ) : (
                          <span className={cn(
                            "text-[9.5px] font-bold uppercase",
                            item.status === 'In Stock' && "text-success-600",
                            item.status === 'Low Stock' && "text-orange-600",
                            item.status === 'Out of Stock' && "text-danger-600",
                          )}>
                            {item.status}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-surface-50 mb-1">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-surface-400 uppercase font-bold tracking-widest leading-none mb-1">Selling Price</span>
                        <span className="text-[11.5px] font-bold text-[#55349A]">₹{item.sellingPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[8px] text-surface-400 uppercase font-bold tracking-widest leading-none mb-1">MRP</span>
                        {showMRP ? (
                          <span className="text-[10px] font-semibold text-slate-400 line-through">₹{item.mrp.toLocaleString()}</span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300">—</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between relative">
                      {item.batches && item.batches.length > 0 && !item.disabled ? (
                        <button
                          className="flex items-center gap-1.5 px-2 py-1 hover:bg-primary-50 rounded-md text-primary-600 transition-all font-bold text-[10px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(item.id);
                          }}
                        >
                          <Package className="h-3.5 w-3.5" />
                          Batch Details
                        </button>
                      ) : (
                        <div />
                      )}
                      <button
                        className="p-1 hover:bg-surface-50 rounded text-surface-400 hover:text-surface-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveActionMenu(activeActionMenu === item.id ? null : item.id);
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {activeActionMenu === item.id && <ActionMenu itemId={item.id} />}
                    </div>

                    {/* Floating Batch Details Popover */}
                    {expandedRows.includes(item.id) && item.batches && !item.disabled && (
                      <div
                        className="absolute -top-4 -left-4 -right-4 z-40 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-surface-200 rounded-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 min-w-[200px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-3 py-2.5 border-b border-surface-100 flex items-center justify-between bg-surface-50/50">
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5 text-primary-600" />
                            <span className="text-[12px] font-bold text-surface-900 tracking-tight">Batch Details</span>
                          </div>
                          <button
                            onClick={() => toggleRow(item.id)}
                            className="p-1 hover:bg-surface-200 rounded-md transition-colors"
                          >
                            <X className="h-3.5 w-3.5 text-surface-400" />
                          </button>
                        </div>
                        <div className="divide-y divide-surface-100 p-1.5">
                          {item.batches.map((batch) => {
                            const salesPriceVal = batch.salesPrice ?? item.sellingPrice;
                            const mrpVal = batch.mrp ?? item.mrp;
                            return (
                              <div key={batch.id} className="p-2.5 transition-colors hover:bg-surface-50 rounded-lg group/batch">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="inline-flex items-center text-[11px] font-bold text-surface-900 font-mono">
                                    <Boxes className="h-3.5 w-3.5 mr-1 text-primary-500" />
                                    {batch.id}
                                  </span>
                                  <span className="text-[10px] font-bold text-primary-600 bg-primary-100/70 border border-primary-200/40 px-1.5 py-0.5 rounded-full">{batch.inHand} in stock</span>
                                </div>
                                <div className="flex flex-col gap-1 mt-1 bg-slate-50/70 p-1.5 rounded-lg border border-slate-100 text-[10.5px]">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Price: <span className="font-extrabold text-[#55349A]">₹{salesPriceVal.toLocaleString()}</span> <span className="text-[8px] text-slate-400 font-normal">(incl.)</span></span>
                                    {showMRP && (
                                      <span className="text-slate-400 font-medium">MRP: <span className="line-through">₹{mrpVal.toLocaleString()}</span></span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-1.5">
                                  <span className="text-[10px] text-surface-400 font-medium">Expires: {batch.expiryDate}</span>
                                  <button className="p-1 bg-white border border-surface-200 rounded-md text-primary-600 shadow-sm hover:bg-primary-50 active:scale-90 transition-all">
                                    <Activity className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="p-2 border-t border-surface-100 bg-surface-50/20">
                          <button
                            onClick={() => toggleRow(item.id)}
                            className="w-full py-2 text-[10px] font-bold text-surface-500 hover:text-surface-900 transition-colors uppercase tracking-widest"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Table Footer */}
          <div className="px-5 py-3 border-t border-surface-100 flex items-center justify-between">
            <span className="text-xs font-medium text-surface-400">
              Showing <span className="text-surface-900 font-bold">{currentItems.length}</span> items
            </span>
            <div className="flex items-center gap-1.5">
              <button className="p-1 border border-surface-200 rounded-lg text-surface-400 opacity-50 cursor-not-allowed">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button className="w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold bg-primary-50 text-primary-600">1</button>
              <button className="p-1 border border-surface-200 rounded-lg text-surface-400 opacity-50 cursor-not-allowed">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {editingPriceItemId && (
        <CatalogItemUnitPriceEditor
          catalogItem={(backendCatalogItems as any[]).find((i) => i.id === editingPriceItemId)}
          onClose={() => setEditingPriceItemId(null)}
        />
      )}
    </div>
  );
};
