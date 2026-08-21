import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit, MoreVertical, Store, MapPin, Mail, Phone,
  Clock, Check, X, Copy, Trash2, BookOpen, Boxes, Tag,
  ShoppingBag, Truck, Globe, Smartphone, User, Users, ShieldCheck,
  CreditCard, Plus, Upload, Camera, ExternalLink, Calendar,
  ChevronDown, ChevronRight, FileText, Activity, AlertCircle, Sparkles,
  Search, Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useQueryClient } from '@tanstack/react-query';

import { useInventoryCatalogs, useInventoryCatalogItems, useAddInventoryCatalogItem } from '../../../services/useInventoryCatalogs';
import { useOrderCatalogs, useOrderCatalogItems } from '../../../services/useOrderCatalogs';
import { useAddOrderCatalogItem } from '../../../services/useOrderCatalogItems';
import { useItems } from '../../../services/useItems';

export interface StoreDetailData {
  id: string;
  name: string;
  code?: string;
  location?: string;
  locationUid?: string;
  type?: string;
  status: 'Active' | 'Draft' | 'Archived';
  contact?: string;
  mobile?: string;
  email?: string;
  staff?: number;
  gstin?: string;
  pan?: string;
  tradeLicense?: string;
  trackInventory?: boolean;
  onlineSelfOrder?: boolean;
  walkInPos?: boolean;
  storePickup?: boolean;
  homeDelivery?: boolean;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  image?: string;
  operatingHours?: string;
  managerName?: string;
  inventoryCatalogUid?: string;
  inventoryCatalogName?: string;
  orderCatalogUid?: string;
  orderCatalogName?: string;
  invoiceTypeRequiredVal?: string;
  walkInInvoiceTypes?: string;
  orderTypes?: Array<{ type: string; prefix: string; suffix: string; active: boolean; description?: string }>;
  prefixSuffixRows?: Array<{ type: string; prefix: string; suffix: string; active: boolean; description?: string }>;
}

interface StoreDetailsProps {
  store: StoreDetailData;
  onBack: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  catalogs?: any[];
  orders?: any[];
}

const InventoryCatalogCardRow: React.FC<{
  cat: any;
  store: StoreDetailData;
  displayLocation: string;
  onAddProducts: (cat: any) => void;
  onViewStocks: () => void;
}> = ({ cat, store, displayLocation, onAddProducts, onViewStocks }) => {
  const catId = cat.id || cat.uid || '';
  const { data: catalogItems = [] } = useInventoryCatalogItems(catId);
  const count = catalogItems.length > 0 ? catalogItems.length : (cat.itemsCount || 0);

  return (
    <div className="p-4.5 bg-white border border-slate-200/90 hover:border-teal-300/80 rounded-2xl space-y-3.5 transition-all shadow-3xs hover:shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center font-bold shadow-3xs shrink-0">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-slate-900">{cat.name || 'Store Inventory Catalog'}</h4>
              <span className={cn(
                "px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-md tracking-wider border",
                cat.status === 'Active' || cat.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
              )}>
                {cat.status || 'ACTIVE'}
              </span>
              <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200/60 text-[10px] font-bold rounded-md uppercase tracking-wider">
                Inventory Catalog
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">{cat.description || 'Stock, batch tracking, and purchasing warehouse'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onAddProducts(cat)}
            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100/80 border border-teal-200 text-teal-800 rounded-xl text-xs font-bold transition-all shadow-3xs flex items-center gap-1.5 cursor-pointer active:scale-95 duration-100"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Add Products</span>
          </button>
          <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-3xs">
            {count} {count === 1 ? 'Product' : 'Products'}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Warehouse Storage:</span>
          <span className="px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-semibold text-slate-800">
            {displayLocation}
          </span>
        </div>
        <button
          type="button"
          onClick={onViewStocks}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#55349A] text-xs font-bold transition-all cursor-pointer group active:scale-95 duration-100"
        >
          <span>View Stock Ledger</span>
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};

const OrderCatalogCardRow: React.FC<{
  cat: any;
  store: StoreDetailData;
  inventoryCatalogName?: string;
  onAddProducts: (cat: any) => void;
  onManagePricing: () => void;
}> = ({ cat, store, inventoryCatalogName, onAddProducts, onManagePricing }) => {
  const catId = cat.id || cat.uid || '';
  const { data: orderItems = [] } = useOrderCatalogItems(catId);
  const count = orderItems.length > 0 ? orderItems.length : (cat.itemsCount || 0);

  return (
    <div className="p-4.5 bg-white border border-slate-200/90 hover:border-purple-300/80 rounded-2xl space-y-3.5 transition-all shadow-3xs hover:shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#55349A] border border-purple-100 flex items-center justify-center font-bold shadow-3xs shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-slate-900">{cat.name || 'Sales Order Catalog'}</h4>
              <span className={cn(
                "px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-md tracking-wider border",
                cat.status === 'Active' || cat.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
              )}>
                {cat.status || 'ACTIVE'}
              </span>
              <span className="px-2 py-0.5 bg-purple-50 text-[#55349A] border border-purple-200/60 text-[10px] font-bold rounded-md uppercase tracking-wider">
                Order Catalog
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">{cat.description || 'Sales ordering catalog for POS and store counter'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onAddProducts(cat)}
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100/80 border border-purple-200 text-[#55349A] rounded-xl text-xs font-bold transition-all shadow-3xs flex items-center gap-1.5 cursor-pointer active:scale-95 duration-100"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Add Products</span>
          </button>
          <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-3xs">
            {count} {count === 1 ? 'Product' : 'Products'}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Inventory Backing:</span>
          <span className="px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-semibold text-slate-800">
            {inventoryCatalogName || store.inventoryCatalogName || 'Direct Store Inventory'}
          </span>
        </div>
        <button
          type="button"
          onClick={onManagePricing}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#55349A] text-xs font-bold transition-all cursor-pointer group active:scale-95 duration-100"
        >
          <span>Manage Pricing Rules</span>
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};

interface AddProductsToCatalogModalProps {
  isOpen: boolean;
  catalog: any;
  onClose: () => void;
  onSuccess: () => void;
}

const AddProductsToCatalogModal: React.FC<AddProductsToCatalogModalProps> = ({
  isOpen,
  catalog,
  onClose,
  onSuccess
}) => {
  const isOrderCatalog = catalog?.type === 'order' || catalog?.kind === 'ORDER';
  const { data: allItems = [], isLoading } = useItems();
  const { data: inventoryCatalogItems = [] } = useInventoryCatalogItems(isOrderCatalog ? '' : (catalog?.id || ''));
  const { data: orderCatalogItems = [] } = useOrderCatalogItems(isOrderCatalog ? (catalog?.id || '') : '');
  const addInventoryItemMutation = useAddInventoryCatalogItem();
  const addOrderCatalogItemMutation = useAddOrderCatalogItem();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set existing items as already added
  const existingItemUids = React.useMemo(() => {
    if (isOrderCatalog) {
      return new Set(orderCatalogItems.map((ci: any) => ci.itemUid));
    }
    return new Set(inventoryCatalogItems.map((ci: any) => ci.itemUid));
  }, [isOrderCatalog, inventoryCatalogItems, orderCatalogItems]);

  React.useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedUids(new Set());
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !catalog) return null;

  const items = allItems.map((item: any) => ({
    id: item.uid || item.id,
    name: item.name || item.itemName || 'Unnamed Item',
    category: item.categoryName || item.category || 'General',
    sku: item.sku || item.code || item.itemNo || '',
    price: item.attributes?.sellingPrice || item.sellingPrice || item.mrp || 0,
    alreadyInCatalog: existingItemUids.has(item.uid || item.id)
  })).filter((i: any) => i.id);

  const filteredItems = items.filter((i: any) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q);
  });

  const toggleItem = (id: string) => {
    setSelectedUids(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedUids.size === 0) return;
    setIsSubmitting(true);
    try {
      if (isOrderCatalog) {
        for (const itemUid of Array.from(selectedUids)) {
          await addOrderCatalogItemMutation.mutateAsync({
            orderCatalogUid: catalog.id,
            itemData: { itemUid, active: true }
          });
        }
        queryClient.invalidateQueries({ queryKey: ['orderCatalogItems', catalog.id] });
        queryClient.invalidateQueries({ queryKey: ['orderCatalogs'] });
        queryClient.invalidateQueries({ queryKey: ['storeCatalogProducts'] });
      } else {
        for (const itemUid of Array.from(selectedUids)) {
          await addInventoryItemMutation.mutateAsync({
            catalogUid: catalog.id,
            itemData: { itemUid, status: 'ACTIVE' }
          });
        }
        queryClient.invalidateQueries({ queryKey: ['inventoryCatalogItems', catalog.id] });
        queryClient.invalidateQueries({ queryKey: ['inventoryCatalogs'] });
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900">Add Products to {catalog.name}</h3>
            <p className="text-xs text-slate-400 font-medium">Select products from Item Master to attach to this warehouse catalog</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search items by name, SKU or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#55349A] focus:bg-white transition-all"
          />
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1 max-h-[350px]">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No products found.</div>
          ) : (
            filteredItems.map((item: any) => (
              <div
                key={item.id}
                onClick={() => !item.alreadyInCatalog && toggleItem(item.id)}
                className={cn(
                  "py-2.5 px-3 flex items-center justify-between rounded-xl transition-colors cursor-pointer",
                  item.alreadyInCatalog ? "opacity-50 cursor-not-allowed bg-slate-50/50" : selectedUids.has(item.id) ? "bg-purple-50/60" : "hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.alreadyInCatalog || selectedUids.has(item.id)}
                    disabled={item.alreadyInCatalog}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (!item.alreadyInCatalog) toggleItem(item.id);
                    }}
                    className="w-4 h-4 rounded text-[#55349A] border-slate-300 focus:ring-[#55349A] cursor-pointer"
                  />
                  <div>
                    <h5 className="text-xs font-black text-slate-900">{item.name}</h5>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                      <span>{item.category}</span>
                      {item.sku && <span>• SKU: {item.sku}</span>}
                    </div>
                  </div>
                </div>
                {item.alreadyInCatalog ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">In Catalog</span>
                ) : (
                  <span className="text-xs font-mono font-bold text-slate-700">₹ {Number(item.price).toFixed(2)}</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            {selectedUids.size} {selectedUids.size === 1 ? 'product' : 'products'} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedUids.size === 0 || isSubmitting}
              onClick={handleAdd}
              className="px-5 py-2 bg-[#55349A] hover:bg-[#43287A] text-white rounded-xl text-xs font-black transition-all shadow-md shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <span>Add Selected Products</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const StoreDetails: React.FC<StoreDetailsProps> = ({
  store,
  onBack,
  onEdit,
  onDelete,
  catalogs = [],
  orders = []
}) => {
  const { data: allInvCatalogs = [] } = useInventoryCatalogs();
  const { data: allOrderCatalogs = [] } = useOrderCatalogs();
  const { data: allItems = [] } = useItems();

  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<'Today' | '7 Days' | '30 Days' | 'Year'>('Today');
  const [activeTab, setActiveTab] = useState<'catalogs' | 'orders' | 'invoicing'>('catalogs');
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [addProductsModalCatalog, setAddProductsModalCatalog] = useState<any | null>(null);
  const [storeImage, setStoreImage] = useState<string>(store.image || '');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setStoreImage(uploadEvent.target.result as string);
          showToast("Store photo updated successfully!");
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Strictly real server-persisted catalogs attached to this store (NO phantom fallbacks)
  const storeInvCatalogs = allInvCatalogs.filter((c: any) =>
    (c.storeUid && (c.storeUid === store.id || c.storeUid === (store as any).uid)) ||
    (c.id && c.id === store.inventoryCatalogUid)
  );

  const storeOrderCatalogs = allOrderCatalogs.filter((c: any) =>
    (c.storeUid && (c.storeUid === store.id || c.storeUid === (store as any).uid)) ||
    (c.id && c.id === store.orderCatalogUid)
  );

  const totalAssignedCatalogs = storeInvCatalogs.length + storeOrderCatalogs.length;

  const storeOrders = orders.filter(o => !o.store || o.store === store.name || o.storeName === store.name);
  const totalStoreOrdersCount = storeOrders.length;
  const storeRevenue = storeOrders.reduce((sum, o) => sum + (parseFloat(o.total || o.amount || '0') || 0), 0);

  const displayLocation = [store.addressLine, store.city || store.location, store.state, store.pincode].filter(Boolean).join(', ') || store.location || 'Location not specified';

  return (
    <div className="flex-1 flex flex-col h-full min-h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-y-auto">

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[99999] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP HEADER BAR */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-3xs">

        {/* Left: Back Arrow + Store Name + Status Badge + Type Pill + Store Code */}
        <div className="flex items-center gap-3.5 flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            title="Back to Stores List"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {store.name || "Store Details"}
            </h1>

            {/* Status Badge */}
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10.5px] font-black rounded-lg uppercase tracking-wider border",
              store.status === 'Active' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              store.status === 'Draft' ? "bg-amber-50 text-amber-700 border-amber-200" :
              "bg-rose-50 text-rose-700 border-rose-200"
            )}>
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                store.status === 'Active' ? "bg-emerald-500" :
                store.status === 'Draft' ? "bg-amber-500" : "bg-rose-500"
              )} />
              {store.status || 'Active'}
            </span>

            {/* Store Type Pill */}
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10.5px] font-extrabold uppercase tracking-wider font-mono">
              {store.type || 'RETAIL STORE'}
            </span>

            {/* Store Code */}
            {store.code && (
              <span className="text-xs font-mono font-bold text-slate-400">
                #{store.code}
              </span>
            )}
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (store.location) {
                window.open(`https://maps.google.com/?q=${encodeURIComponent(displayLocation)}`, '_blank');
              } else {
                showToast("No GPS coordinates or address configured.");
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer"
          >
            <MapPin className="h-3.5 w-3.5 text-teal-600" />
            <span>View on Map</span>
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-[#55349A] hover:bg-purple-50/30 text-slate-800 hover:text-[#55349A] rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Edit Store</span>
          </button>

          {/* More Actions Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreActionsOpen(!moreActionsOpen)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#55349A] hover:bg-[#43287A] text-white rounded-xl text-xs font-black tracking-wide shadow-md shadow-purple-900/20 transition-all cursor-pointer"
            >
              <span>More Actions</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", moreActionsOpen && "rotate-180")} />
            </button>

            {moreActionsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMoreActionsOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-1.5 divide-y divide-slate-100 text-xs font-bold animate-in fade-in zoom-in-95 duration-100">
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMoreActionsOpen(false);
                        navigator.clipboard.writeText(JSON.stringify(store, null, 2));
                        showToast("Store details copied to clipboard!");
                      }}
                      className="w-full px-4 py-2 text-left text-slate-700 hover:bg-purple-50 hover:text-[#55349A] flex items-center gap-2"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Store Config</span>
                    </button>
                  </div>
                  {onDelete && (
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMoreActionsOpen(false);
                          if (confirm(`Are you sure you want to archive ${store.name}?`)) {
                            onDelete();
                          }
                        }}
                        className="w-full px-4 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Archive Store</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* 2. MAIN 2-COLUMN BODY */}
      <div className="p-6 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN (4 Cols): Store Identity, Location, Contact, Operating Hours, Fulfillment Channels, Team */}
        <div className="lg:col-span-4 space-y-5">

          {/* Store Visual & Identity Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs space-y-4">

            {/* Store Photo / Banner Box */}
            <div className="aspect-video bg-gradient-to-br from-purple-50 to-slate-100 border border-slate-200 rounded-2xl overflow-hidden shadow-inner flex flex-col items-center justify-center relative group">
              {storeImage ? (
                <>
                  <img
                    src={storeImage}
                    alt={store.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => document.getElementById('store-photo-upload')?.click()}
                      className="px-3.5 py-1.5 bg-white/95 text-slate-900 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="h-3.5 w-3.5 text-[#55349A]" />
                      <span>Change Photo</span>
                    </button>
                  </div>
                </>
              ) : (
                <div
                  onClick={() => document.getElementById('store-photo-upload')?.click()}
                  className="text-center space-y-2 cursor-pointer p-4 hover:scale-102 transition-transform"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white border border-purple-200 text-[#55349A] flex items-center justify-center mx-auto shadow-xs">
                    <Store className="h-6 w-6" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Add Store Photo</h5>
                    <p className="text-[10px] text-slate-400 font-medium">Click to upload store storefront image</p>
                  </div>
                </div>
              )}

              <input
                id="store-photo-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Store Overview Details */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Store Type</span>
                <span className="font-bold text-xs text-slate-900">{store.type || 'Retail Store'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Store Code</span>
                <span className="font-mono font-bold text-xs text-slate-900">{store.code || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Store Manager</span>
                <span className="font-bold text-xs text-slate-900">{store.managerName || 'Admin Manager'}</span>
              </div>
            </div>

            {/* Location & Address Section */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Location & Address</h3>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(displayLocation);
                    showToast("Address copied to clipboard!");
                  }}
                  className="text-[11px] font-bold text-[#55349A] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </button>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-700 font-medium leading-relaxed">{displayLocation}</p>
              </div>
            </div>

            {/* Contact Details */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Contact Information</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="flex items-center gap-2 text-slate-500 font-bold">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>Primary Contact</span>
                  </span>
                  <span className="font-mono font-bold text-slate-900">{store.contact || store.mobile || '—'}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="flex items-center gap-2 text-slate-500 font-bold">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>Store Email</span>
                  </span>
                  <span className="font-bold text-slate-900 truncate max-w-[180px]">{store.email || '—'}</span>
                </div>
              </div>
            </div>

            {/* Operating Hours */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Operating Schedule</h3>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[9.5px] font-black uppercase">
                  ● Open Now
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <Clock className="h-4 w-4 text-[#55349A]" />
                  <span>{store.operatingHours || 'Mon – Sat: 09:00 AM – 09:00 PM'}</span>
                </div>
              </div>
            </div>

            {/* Sales & Fulfillment Channels */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Fulfillment Channels</h3>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-slate-700">POS Walk-in</span>
                    <span className={cn("w-1.5 h-1.5 rounded-full", store.walkInPos ? "bg-emerald-500" : "bg-slate-400")} />
                  </div>
                  <span className={cn("text-[9.5px] font-black block uppercase", store.walkInPos ? "text-emerald-700" : "text-slate-500")}>
                    {store.walkInPos ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-slate-700">Online Storefront</span>
                    <span className={cn("w-1.5 h-1.5 rounded-full", store.onlineSelfOrder ? "bg-emerald-500" : "bg-slate-400")} />
                  </div>
                  <span className={cn("text-[9.5px] font-black block uppercase", store.onlineSelfOrder ? "text-emerald-700" : "text-slate-500")}>
                    {store.onlineSelfOrder ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-slate-700">Store Pickup</span>
                    <span className={cn("w-1.5 h-1.5 rounded-full", store.storePickup ? "bg-emerald-500" : "bg-slate-400")} />
                  </div>
                  <span className={cn("text-[9.5px] font-black block uppercase", store.storePickup ? "text-emerald-700" : "text-slate-500")}>
                    {store.storePickup ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-slate-700">Home Delivery</span>
                    <span className={cn("w-1.5 h-1.5 rounded-full", store.homeDelivery ? "bg-emerald-500" : "bg-slate-400")} />
                  </div>
                  <span className={cn("text-[9.5px] font-black block uppercase", store.homeDelivery ? "text-emerald-700" : "text-slate-500")}>
                    {store.homeDelivery ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tax & Statutory Info */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Tax & Registrations</h3>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="grid grid-cols-2 py-2">
                  <span className="text-slate-400 font-bold">GSTIN</span>
                  <span className="font-mono font-bold text-slate-900 text-right">{store.gstin || '—'}</span>
                </div>
                <div className="grid grid-cols-2 py-2">
                  <span className="text-slate-400 font-bold">PAN</span>
                  <span className="font-mono font-bold text-slate-900 text-right">{store.pan || '—'}</span>
                </div>
                <div className="grid grid-cols-2 py-2">
                  <span className="text-slate-400 font-bold">Trade License</span>
                  <span className="font-mono font-bold text-slate-900 text-right">{store.tradeLicense || '—'}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN (8 Cols): Performance Metrics, Catalogs, Recent Orders, Invoicing */}
        <div className="lg:col-span-8 space-y-6">

          {/* Store Performance Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Store Performance</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Sales metrics, active catalogs, and store orders</p>
              </div>

              {/* Timeframe Selector */}
              <div className="relative">
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-800 outline-none appearance-none pr-8 cursor-pointer hover:bg-slate-100 transition-all"
                >
                  <option value="Today">Today</option>
                  <option value="7 Days">Last 7 Days</option>
                  <option value="30 Days">Last 30 Days</option>
                  <option value="Year">This Year</option>
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 4 Metric Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">

              {/* Metric 1: Orders */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-3xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">ORDERS</span>
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <ShoppingBag className="h-3.5 w-3.5" />
                  </div>
                </div>
                <span className="text-xl font-black text-slate-900 font-mono">{totalStoreOrdersCount}</span>
              </div>

              {/* Metric 2: Gross Revenue */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-3xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">REVENUE</span>
                  <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                    <CreditCard className="h-3.5 w-3.5" />
                  </div>
                </div>
                <span className="text-xl font-black text-slate-900 font-mono">₹ {storeRevenue.toLocaleString('en-IN')}</span>
              </div>

              {/* Metric 3: Active Catalogs */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-3xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">CATALOGS</span>
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-[#55349A] flex items-center justify-center">
                    <BookOpen className="h-3.5 w-3.5" />
                  </div>
                </div>
                <span className="text-xl font-black text-slate-900 font-mono">{totalAssignedCatalogs}</span>
              </div>

              {/* Metric 4: Staff Team */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-3xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">STAFF</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                </div>
                <span className="text-xl font-black text-slate-900 font-mono">{store.staff || 0} Members</span>
              </div>

            </div>
          </div>

          {/* Store Tabs: Catalogs | Orders | Invoicing */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-5">

            {/* Tabs Header */}
            <div className="flex items-center gap-8 border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab('catalogs')}
                className={cn(
                  "text-sm font-black transition-all cursor-pointer relative pb-3 -mb-3",
                  activeTab === 'catalogs'
                    ? "text-[#55349A] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#55349A]"
                    : "text-slate-400 hover:text-slate-700"
                )}
              >
                Store Catalogs & Warehouses
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={cn(
                  "text-sm font-black transition-all cursor-pointer relative pb-3 -mb-3",
                  activeTab === 'orders'
                    ? "text-[#55349A] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#55349A]"
                    : "text-slate-400 hover:text-slate-700"
                )}
              >
                Recent Store Orders
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('invoicing')}
                className={cn(
                  "text-sm font-black transition-all cursor-pointer relative pb-3 -mb-3",
                  activeTab === 'invoicing'
                    ? "text-[#55349A] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#55349A]"
                    : "text-slate-400 hover:text-slate-700"
                )}
              >
                Order Types & Invoicing
              </button>
            </div>

            {/* TAB 1: CATALOGS & WAREHOUSES */}
            {activeTab === 'catalogs' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">
                    {totalAssignedCatalogs} Catalogs Assigned to this Store
                  </span>
                  <button
                    type="button"
                    onClick={onEdit}
                    className="text-xs font-black text-[#55349A] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Manage Catalogs</span>
                  </button>
                </div>

                {totalAssignedCatalogs === 0 && !store.inventoryCatalogName && !store.orderCatalogName ? (
                  <div className="p-8 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                    <BookOpen className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-700">No Catalogs Assigned</p>
                    <p className="text-xs text-slate-400">This store has not been linked with an inventory or sales catalog yet.</p>
                    <button type="button" onClick={onEdit} className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#55349A] text-white text-xs font-bold rounded-xl hover:bg-[#43287A] transition-all cursor-pointer">
                      <Plus className="h-3.5 w-3.5" /> Assign Catalog
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Render Order Catalogs */}
                    {storeOrderCatalogs.map((cat: any) => (
                      <OrderCatalogCardRow
                        key={cat.id || cat.uid}
                        cat={cat}
                        store={store}
                        inventoryCatalogName={storeInvCatalogs[0]?.name || store.inventoryCatalogName}
                        onAddProducts={(c) => setAddProductsModalCatalog({ ...c, type: 'order' })}
                        onManagePricing={() => navigate('/orders/catalogs')}
                      />
                    ))}

                    {/* Render Inventory Catalogs */}
                    {storeInvCatalogs.map((cat: any) => (
                      <InventoryCatalogCardRow
                        key={cat.id || cat.uid}
                        cat={cat}
                        store={store}
                        displayLocation={displayLocation}
                        onAddProducts={(c) => setAddProductsModalCatalog(c)}
                        onViewStocks={() => navigate('/inventory/stocks')}
                      />
                    ))}

                    {/* Fallback if catalog was saved by name in store but pending query reload */}
                    {storeInvCatalogs.length === 0 && storeOrderCatalogs.length === 0 && (store.inventoryCatalogName || store.orderCatalogName) && (
                      <div className="p-4.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#55349A] border border-purple-100 flex items-center justify-center font-bold">
                              <BookOpen className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-black text-slate-900">{store.orderCatalogName || store.inventoryCatalogName}</h4>
                                <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase rounded">
                                  ACTIVE
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Assigned Catalog</p>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-3xs">
                            0 Products
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: RECENT STORE ORDERS */}
            {activeTab === 'orders' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {storeOrders.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                    <ShoppingBag className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-700">No Orders Placed Yet</p>
                    <p className="text-xs text-slate-400">No counter POS or online orders have been registered for this store location.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-3xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px]">
                        <tr>
                          <th className="py-3 px-4">ORDER #</th>
                          <th className="py-3 px-4">CUSTOMER</th>
                          <th className="py-3 px-4">DATE / TIME</th>
                          <th className="py-3 px-3 text-right">TOTAL</th>
                          <th className="py-3 px-4 text-center">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {storeOrders.map((ord, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                              {ord.orderNo || ord.orderNumber || `ORD-${idx + 1}`}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-800">
                              {ord.customer || ord.customerName || 'Walk-in Customer'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 font-mono">
                              {ord.time || ord.createdDate || 'Today'}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                              ₹ {ord.total || ord.amount || '0.00'}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[9.5px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {ord.status || 'COMPLETED'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ORDER TYPES & INVOICING */}
            {activeTab === 'invoicing' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Order & Invoice Numbering Rules</h4>
                    <button type="button" onClick={onEdit} className="text-xs font-bold text-[#55349A] hover:underline flex items-center gap-1 cursor-pointer">
                      <Edit className="h-3 w-3" />
                      <span>Edit Order Types</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Custom prefix and suffix rules configured for this physical store location to ensure tax compliance and distinctive billing sequences across counter POS and online orders.
                  </p>

                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white mt-3">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px]">
                        <tr>
                          <th className="py-3 px-4">ORDER TYPE</th>
                          <th className="py-3 px-4">DESCRIPTION</th>
                          <th className="py-3 px-4 text-center">SEQUENCE MODE</th>
                          <th className="py-3 px-4">PREFIX</th>
                          <th className="py-3 px-4">SUFFIX</th>
                          <th className="py-3 px-4">SAMPLE INVOICE #</th>
                          <th className="py-3 px-4 text-center">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {(store.orderTypes || store.prefixSuffixRows || [
                          { type: 'B2C', name: 'B2C (Retail Consumer)', description: 'Retail consumer tax invoice.', prefix: 'INV-C', suffix: '', active: true, independentSequence: true },
                          { type: 'B2B', name: 'B2B (Business-to-Business)', description: 'Business-to-business tax invoice (includes customer GSTIN for input tax credit).', prefix: 'INV-B', suffix: '', active: true, independentSequence: true },
                        ]).map((row: any, idx: number) => {
                          const prefix = row.prefix || (row.type === 'B2B' ? 'INV-B' : 'INV-C');
                          const suffix = row.suffix || '';
                          const isActive = row.active !== false;
                          const isIndependent = row.independentSequence !== false;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-bold">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[11px] font-black",
                                  row.type === 'B2C' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                  row.type === 'B2B' ? "bg-purple-50 text-[#55349A] border border-purple-200" :
                                  "bg-blue-50 text-blue-700 border border-blue-200"
                                )}>
                                  {row.type}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-slate-700">
                                {row.description || (row.type === 'B2B' ? 'Business-to-business tax invoice with ITC' : 'Retail consumer tax invoice')}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border",
                                  isIndependent ? "bg-purple-50 text-[#55349A] border-purple-200" : "bg-slate-100 text-slate-600 border-slate-200"
                                )}>
                                  <span className={cn("w-1.5 h-1.5 rounded-full", isIndependent ? "bg-[#55349A]" : "bg-slate-400")} />
                                  {isIndependent ? 'Independent' : 'Tenant Shared'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                                {prefix}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-slate-500">
                                {suffix || '—'}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                                {isIndependent ? `${prefix}1001${suffix}` : `${prefix || 'INV-'}1001`}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase",
                                  isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                                )}>
                                  <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-slate-400")} />
                                  {isActive ? 'ACTIVE' : 'DISABLED'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Add Products Modal */}
      {addProductsModalCatalog && (
        <AddProductsToCatalogModal
          isOpen={!!addProductsModalCatalog}
          catalog={addProductsModalCatalog}
          onClose={() => setAddProductsModalCatalog(null)}
          onSuccess={() => {
            showToast("Products added to catalog successfully!");
          }}
        />
      )}
    </div>
  );
};
