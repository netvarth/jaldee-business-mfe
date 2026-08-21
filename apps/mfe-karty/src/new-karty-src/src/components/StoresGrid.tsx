import React, { useState } from 'react';
import {
  ArrowLeft, Search, Plus, Filter, ChevronDown, ChevronUp, Edit2,
  MoreHorizontal, ChevronLeft, ChevronRight, Store, MapPin,
  Trash2, Phone, Users, Check, Upload, Image, Mail, Sliders, Receipt, CheckCircle,
  Copy, Edit, Pencil, Info, ShoppingBag, MoreVertical, Loader2, ShieldCheck, Clock, AlertCircle, Boxes, BookOpen
} from 'lucide-react';
import { cn } from '../lib/utils';
import { TablePagination } from './TablePagination';
import { StoreDetails } from './StoreDetails';

const STORE_PAGE_SIZE = 10;
import { useQueryClient } from '@tanstack/react-query';
import { useStoreSearch, useCreateStore, useUpdateStore, useDeleteStore, useUpdateStoreStatus, type StoreSearchRequest } from '../../../services/useStores';
import { useInventoryCatalogs, useCreateCatalog, useAddInventoryCatalogItem } from '../../../services/useInventoryCatalogs';
import { useOrderCatalogs, useCreateOrderCatalog } from '../../../services/useOrderCatalogs';
import { useLocations } from '../../../services/useLocations';
import { useItems } from '../../../services/useItems';

export interface OrderTypeItem {
  type: string;
  name: string;
  description: string;
  prefix: string;
  suffix: string;
  active: boolean;
  independentSequence?: boolean;
  isCustom?: boolean;
}

export const DEFAULT_ORDER_TYPES: OrderTypeItem[] = [
  {
    type: 'B2C',
    name: 'B2C (Retail Consumer)',
    description: 'Retail consumer tax invoice.',
    prefix: 'INV-C',
    suffix: '',
    active: true,
    independentSequence: true,
    isCustom: false,
  },
  {
    type: 'B2B',
    name: 'B2B (Business-to-Business)',
    description: 'Business-to-business tax invoice (includes customer GSTIN for input tax credit).',
    prefix: 'INV-B',
    suffix: '',
    active: true,
    independentSequence: true,
    isCustom: false,
  },
];

interface CatalogCreationModalProps {
  isOpen: boolean;
  type: 'inventory' | 'order';
  storeName: string;
  onClose: () => void;
  onCreated: (catalog: any) => void;
}

interface SequenceChangeConfirmationModalProps {
  isOpen: boolean;
  storeName: string;
  changes: Array<{
    type: string;
    name: string;
    oldFormat: string;
    newFormat: string;
    oldMode: string;
    newMode: string;
  }>;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

const SequenceChangeConfirmationModal: React.FC<SequenceChangeConfirmationModalProps> = ({
  isOpen,
  storeName,
  changes,
  onCancel,
  onConfirm,
  isSubmitting = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/60 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">
              Confirm Invoice Sequence & Numbering Changes
            </h3>
            <p className="text-xs text-amber-900/80 font-medium leading-relaxed">
              You are modifying the live invoice prefix, suffix, or counter mode for <span className="font-bold text-slate-900">{storeName || 'this store'}</span>.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Comparison Table */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
              Summary of Modifications
            </label>
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3.5">Order Type</th>
                    <th className="py-2.5 px-3">Previous Format</th>
                    <th className="py-2.5 px-3">New Format</th>
                    <th className="py-2.5 px-3 text-right">Counter Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 font-medium">
                  {changes.map((ch, idx) => (
                    <tr key={idx} className="hover:bg-white transition-colors">
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">
                        <span className="px-1.5 py-0.5 rounded text-[10.5px] font-mono font-black bg-purple-50 text-[#55349A] border border-purple-200 mr-1.5">
                          {ch.type}
                        </span>
                        <span>{ch.name}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 line-through">
                        {ch.oldFormat}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 bg-emerald-50/50">
                        {ch.newFormat}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold border",
                          ch.newMode === 'Independent Counter'
                            ? "bg-purple-50 text-[#55349A] border-purple-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        )}>
                          {ch.newMode}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Safeguards & Warnings */}
          <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4 space-y-2.5 text-xs text-amber-950">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Historical Orders are Immutable:</span> All previously generated invoices retain their original sequential numbers and printed receipts.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Future Invoices Only:</span> The new prefix and counter mode will apply exclusively to new orders created after this change.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-5 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel & Review
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-[#55349A] text-white rounded-xl text-xs font-bold hover:bg-[#43287A] transition-all shadow-md shadow-purple-900/10 cursor-pointer flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" />
            <span>Confirm & Update Sequence</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const CatalogCreationModal: React.FC<CatalogCreationModalProps> = ({
  isOpen,
  type,
  storeName,
  storeUid,
  onClose,
  onCreated
}) => {
  const { data: backendItems = [], isLoading: itemsLoading } = useItems();
  const { data: backendInvCatalogs = [] } = useInventoryCatalogs();
  const { data: backendOrderCatalogs = [] } = useOrderCatalogs();
  const createInventoryCatalogMutation = useCreateCatalog();
  const createOrderCatalogMutation = useCreateOrderCatalog();
  const addInventoryItemMutation = useAddInventoryCatalogItem();

  const [catalogName, setCatalogName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemUids, setSelectedItemUids] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      const defaultPrefix = storeName ? `${storeName} ` : '';
      setCatalogName(type === 'inventory' ? `${defaultPrefix}Inventory Catalog` : `${defaultPrefix}Order Catalog`);
      setDescription('');
      setSearchQuery('');
      setSelectedItemUids(new Set());
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, type, storeName]);

  if (!isOpen) return null;

  const items = backendItems.map((item: any) => ({
    id: item.uid || item.id,
    name: item.name || item.itemName || 'Unnamed Item',
    category: item.categoryName || item.category || 'General',
    sku: item.sku || item.code || item.itemNo || '',
    price: item.attributes?.sellingPrice || item.sellingPrice || item.mrp || 0,
  })).filter((i: any) => i.id);

  const filteredItems = items.filter((i: any) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q);
  });

  const toggleItem = (id: string) => {
    setSelectedItemUids(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedItemUids.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedItemUids(new Set());
    } else {
      setSelectedItemUids(new Set(filteredItems.map(i => i.id)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogName.trim()) {
      setErrorMsg('Please enter a catalog name.');
      return;
    }

    const existingCatalogs = type === 'inventory' ? backendInvCatalogs : backendOrderCatalogs;
    const isDuplicate = existingCatalogs.some((c: any) =>
      c.name?.trim().toLowerCase() === catalogName.trim().toLowerCase()
    );
    if (isDuplicate) {
      setErrorMsg(`A ${type === 'inventory' ? 'inventory' : 'order'} catalog named "${catalogName.trim()}" already exists in this tenant. Please choose a unique name.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (storeUid) {
        if (type === 'inventory') {
          const result: any = await createInventoryCatalogMutation.mutateAsync({
            name: catalogName.trim(),
            description: description.trim() || undefined,
            status: 'ACTIVE',
            storeUid: storeUid,
          });
          const catalogUid = result?.id || result?.uid;

          if (catalogUid && selectedItemUids.size > 0) {
            const uids = Array.from(selectedItemUids);
            for (const itemUid of uids) {
              try {
                await addInventoryItemMutation.mutateAsync({
                  catalogUid,
                  itemData: { itemUid, status: 'ACTIVE' }
                });
              } catch (err) {
                console.warn('Failed attaching item', itemUid, err);
              }
            }
          }

          onCreated({ id: catalogUid, name: catalogName.trim(), selectedItemUids: Array.from(selectedItemUids) });
        } else {
          const result: any = await createOrderCatalogMutation.mutateAsync({
            name: catalogName.trim(),
            description: description.trim() || undefined,
            status: 'ACTIVE',
            storeUid: storeUid,
            walkinPos: true,
            storePickup: true,
            homeDelivery: true,
            inventoryManagement: true,
          });
          const catalogUid = result?.id || result?.uid;
          onCreated({ id: catalogUid, name: catalogName.trim(), selectedItemUids: Array.from(selectedItemUids) });
        }
      } else {
        // New store: provisioned atomically with store to guarantee valid store_uid in database
        onCreated({
          id: '',
          name: catalogName.trim(),
          selectedItemUids: Array.from(selectedItemUids),
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create catalog. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-surface-200 overflow-hidden flex flex-col max-h-[90vh] text-left animate-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="p-6 border-b border-surface-100 flex items-center justify-between bg-[#FAFAFB]">
          <div>
            <h3 className="text-base font-bold text-surface-900">
              {type === 'inventory' ? 'Create New Inventory Catalog' : 'Create New Order Catalog'}
            </h3>
            <p className="text-xs text-surface-500 mt-0.5">
              {type === 'inventory'
                ? 'Create a physical stock catalog for this store. Optionally select items from Item Master to attach now.'
                : 'Create a storefront catalog for counter POS and online orders.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-surface-200 bg-white hover:bg-surface-100 flex items-center justify-center text-surface-500 font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Catalog Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-surface-600 uppercase tracking-wider block">
              Catalog Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={catalogName}
              onChange={(e) => setCatalogName(e.target.value)}
              placeholder="e.g. Central Pharmacy Retail Catalog"
              className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A]"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-surface-600 uppercase tracking-wider block">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this catalog..."
              className="w-full px-4 py-2 bg-white border border-surface-200 rounded-xl text-xs font-medium text-surface-800 outline-none focus:border-[#55349A]"
            />
          </div>

          {/* Item Master Selection Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-surface-700 uppercase tracking-wider block">
                  Select Items to Attach <span className="text-surface-400 font-normal capitalize">(Optional — items if needed)</span>
                </label>
                <span className="text-[11px] text-surface-400">
                  You can select items now or add them later from Item Master.
                </span>
              </div>
              <span className="px-2.5 py-1 bg-purple-50 text-[#55349A] border border-purple-100 rounded-lg text-xs font-bold font-mono">
                {selectedItemUids.size} selected
              </span>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="h-4 w-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items by name, SKU, or category..."
                className="w-full pl-10 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-semibold text-surface-900 outline-none focus:bg-white focus:border-[#55349A]"
              />
            </div>

            {/* Items Table */}
            <div className="border border-surface-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-50 border-b border-surface-200 sticky top-0 z-10 select-none">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredItems.length > 0 && selectedItemUids.size === filteredItems.length}
                        onChange={toggleAll}
                        className="rounded cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3 font-bold text-surface-500 uppercase text-[10px]">Item Name</th>
                    <th className="py-2.5 px-3 font-bold text-surface-500 uppercase text-[10px]">Category</th>
                    <th className="py-2.5 px-3 font-bold text-surface-500 uppercase text-[10px]">SKU</th>
                    <th className="py-2.5 px-3 font-bold text-surface-500 uppercase text-[10px] text-right">Base Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {itemsLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-surface-400 font-semibold">
                        Loading items from Item Master...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-surface-400 font-semibold">
                        {searchQuery ? 'No items matched your search.' : 'No items found in Item Master.'}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item: any) => {
                      const isSelected = selectedItemUids.has(item.id);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          className={cn("cursor-pointer transition-colors", isSelected ? "bg-purple-50/40" : "hover:bg-surface-50/50")}
                        >
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItem(item.id)}
                              className="rounded cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-bold text-surface-900">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-3 text-surface-600 font-medium">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[10.5px]">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-surface-500">
                            {item.sku || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right text-surface-900">
                            {item.price ? `₹ ${item.price}` : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-surface-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 border border-surface-200 rounded-xl text-xs font-bold text-surface-600 hover:bg-surface-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !catalogName.trim()}
              className="px-6 py-2.5 bg-[#55349A] text-white rounded-xl text-xs font-bold hover:bg-[#43287A] disabled:opacity-50 transition-all shadow-md shadow-purple-900/20 cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? 'Creating Catalog...' : 'Create & Attach Catalog'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export interface StoreItem {
  id: string;
  name: string;
  code: string;
  gstin?: string;
  /** Human-readable location label, resolved from locationUid via base-crm locations. */
  location: string;
  /** The base-crm location this store is tied to. This is what the backend persists. */
  locationUid?: string;
  type: string;
  status: 'Active' | 'Draft' | 'Archived';
  contact: string;
  staff: number;
  trackInventory?: boolean;
  inventoryCatalogUid?: string;
  inventoryCatalogName?: string;
  isSelfOrder?: boolean;
  orderCatalogUid?: string;
  orderCatalogName?: string;
  walkInPos?: boolean;
  storePickup?: boolean;
  homeDelivery?: boolean;
  orderTypes?: OrderTypeItem[];
  prefixSuffixRows?: Array<{ type: string; prefix: string; suffix: string; active: boolean }>;
  // Invoice & payment profile (printed on the store's GST tax invoice).
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankIfsc?: string;
  bankBranch?: string;
  upiId?: string;
  invoiceTerms?: string;
  invoiceSignatory?: string;
}

export const StoresGrid = () => {
  const { data: inventoryCatalogs = [] } = useInventoryCatalogs();
  const { data: orderCatalogs = [] } = useOrderCatalogs();
  // Real base-crm tenant locations — the same ones every other module uses. A store is
  // tied to one of these by uid; it is never a free-text label.
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const locationNameByUid = React.useMemo(
    () => new Map(locations.map((l) => [l.uid, l.name])),
    [locations]
  );
  const createStoreMutation = useCreateStore();
  const updateStoreMutation = useUpdateStore();
  const updateStatusMutation = useUpdateStoreStatus();
  const deleteStoreMutation = useDeleteStore();

  const [stores, setStores] = useState<StoreItem[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedLocationUid, setSelectedLocationUid] = useState('All');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [locationFilterOpen, setLocationFilterOpen] = useState(false);

  // Debounce the free-text box so we don't fire a search request on every keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState('');
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Build the structured SearchRequestDto from the toolbar controls. Tenant scope
  // is applied server-side from the auth token, so it never appears here.
  const searchRequest = React.useMemo<StoreSearchRequest>(() => {
    const conditions: any[] = [];
    const q = debouncedQuery.trim();
    if (q) {
      conditions.push({
        logic: 'OR',
        conditions: [
          { field: 'name', operator: 'CONTAINS', values: [q] },
          { field: 'code', operator: 'CONTAINS', values: [q] },
        ],
      });
    }
    if (selectedType !== 'All') {
      conditions.push({ field: 'type', operator: 'EQ', values: [selectedType] });
    }
    if (selectedStatus !== 'All') {
      conditions.push({ field: 'status', operator: 'EQ', values: [selectedStatus] });
    }
    if (selectedLocationUid !== 'All') {
      conditions.push({ field: 'locationUid', operator: 'EQ', values: [selectedLocationUid] });
    }
    return {
      filters: conditions.length ? { logic: 'AND', conditions } : undefined,
      sort: [{ field: 'createdAt', direction: 'DESC' }],
      page: 0,
      size: 100,
    };
  }, [debouncedQuery, selectedType, selectedStatus, selectedLocationUid]);

  const { data: searchResult } = useStoreSearch(searchRequest);

  React.useEffect(() => {
    const rows = searchResult?.content;
    if (rows) {
      const mapped = rows.map((s: any) => ({
        id: s.uid || s.id,
        name: s.name,
        code: s.code || '',
        gstin: s.gstin || '',
        locationUid: s.locationUid || undefined,
        // Backend returns only locationUid; resolve the label from base-crm locations.
        location: (s.locationUid && locationNameByUid.get(s.locationUid)) || '',
        type: s.type || 'RETAIL',
        status: s.status === 'ACTIVE' || s.status === 'Active'
          ? 'Active'
          : s.status === 'ARCHIVED' || s.status === 'Archived'
            ? 'Archived'
            : 'Draft',
        contact: s.contactNumber || s.contact || s.phone || '',
        staff: s.staffCount || s.staff || 0,
        trackInventory: Boolean(s.trackInventory),
        inventoryCatalogUid: s.inventoryCatalogUid || undefined,
        inventoryCatalogName: s.inventoryCatalogName || undefined,
        isSelfOrder: Boolean(s.selfOrder ?? s.isSelfOrder),
        orderCatalogUid: s.orderCatalogUid || undefined,
        orderCatalogName: s.orderCatalogName || undefined,
        walkInPos: Boolean(s.walkinPos ?? s.walkInPos),
        storePickup: Boolean(s.storePickup),
        homeDelivery: Boolean(s.homeDelivery),
        // Invoice & payment profile — carried through so the edit form can pre-fill them.
        email: s.email || '',
        addressLine1: s.addressLine1 || '', addressLine2: s.addressLine2 || '',
        city: s.city || '', state: s.state || '', pinCode: s.pinCode || '',
        bankAccountName: s.bankAccountName || '', bankAccountNumber: s.bankAccountNumber || '',
        bankName: s.bankName || '', bankIfsc: s.bankIfsc || '', bankBranch: s.bankBranch || '',
        upiId: s.upiId || '', invoiceTerms: s.invoiceTerms || '', invoiceSignatory: s.invoiceSignatory || '',
      }));
      setStores(mapped);
    }
  }, [searchResult, locationNameByUid]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [storeToEdit, setStoreToEdit] = useState<StoreItem | null>(null);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [showCreatedPage, setShowCreatedPage] = useState(false);
  const [newlyCreatedStore, setNewlyCreatedStore] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<'inventory' | 'order'>('inventory');
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [activeStoreDropdownId, setActiveStoreDropdownId] = useState<string | null>(null);
  const [cameFromDetail, setCameFromDetail] = useState(false);
  const [toastNotification, setToastNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [confirmRowModeModal, setConfirmRowModeModal] = useState<{
    isOpen: boolean;
    rowIndex: number;
    rowName: string;
    rowType: string;
    targetMode: 'independent' | 'shared';
    currentPrefix: string;
  } | null>(null);

  const [selectedInventoryItemUids, setSelectedInventoryItemUids] = useState<string[]>([]);
  const [selectedOrderItemUids, setSelectedOrderItemUids] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const addInventoryItemMutation = useAddInventoryCatalogItem();

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastNotification({ message, type });
    setTimeout(() => setToastNotification(null), 4000);
  };

  const availableInventoryCatalogs = React.useMemo(() => {
    const assignedIds = new Set(
      stores
        .filter(s => s.id !== storeToEdit?.id && s.inventoryCatalogUid)
        .map(s => s.inventoryCatalogUid)
    );
    return inventoryCatalogs.filter((c: any) => {
      if (storeToEdit && (c.id === storeToEdit.inventoryCatalogUid || (c.storeUid && c.storeUid === storeToEdit.id))) {
        return true;
      }
      if (assignedIds.has(c.id)) return false;
      if (c.storeUid && (!storeToEdit || c.storeUid !== storeToEdit.id)) return false;
      if (c.store && c.store !== 'Unknown Store' && (!storeToEdit || c.store !== storeToEdit.name)) {
        return false;
      }
      return true;
    });
  }, [inventoryCatalogs, stores, storeToEdit]);

  const availableOrderCatalogs = React.useMemo(() => {
    const assignedIds = new Set(
      stores
        .filter(s => s.id !== storeToEdit?.id && s.orderCatalogUid)
        .map(s => s.orderCatalogUid)
    );
    return orderCatalogs.filter((c: any) => {
      if (storeToEdit && (c.id === storeToEdit.orderCatalogUid || (c.storeUid && c.storeUid === storeToEdit.id))) {
        return true;
      }
      if (assignedIds.has(c.id)) return false;
      if (c.storeUid && (!storeToEdit || c.storeUid !== storeToEdit.id)) return false;
      if (c.store && c.store !== 'Unknown Store' && (!storeToEdit || c.store !== storeToEdit.name)) {
        return false;
      }
      return true;
    });
  }, [orderCatalogs, stores, storeToEdit]);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formLocationUid, setFormLocationUid] = useState('');
  const [formType, setFormType] = useState('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Draft' | 'Archived'>('Active');
  const [formContact, setFormContact] = useState('');
  const [formStaff, setFormStaff] = useState(0);

  // New form states as requested by image.png
  const [formEmail, setFormEmail] = useState('');
  const [formMobile, setFormMobile] = useState('');

  // --- Invoice & payment profile (printed on this store's GST tax invoice) ---
  const [formAddressLine1, setFormAddressLine1] = useState('');
  const [formAddressLine2, setFormAddressLine2] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formPinCode, setFormPinCode] = useState('');
  const [formBankAccountName, setFormBankAccountName] = useState('');
  const [formBankAccountNumber, setFormBankAccountNumber] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [formBankIfsc, setFormBankIfsc] = useState('');
  const [formBankBranch, setFormBankBranch] = useState('');
  const [formUpiId, setFormUpiId] = useState('');
  const [formInvoiceTerms, setFormInvoiceTerms] = useState('');
  const [formInvoiceSignatory, setFormInvoiceSignatory] = useState('');
  const [onlineSelfOrder, setOnlineSelfOrder] = useState(false);
  const [walkInPos, setWalkInPos] = useState(true);

  // Track Inventory states & Defaults
  const [trackInventory, setTrackInventory] = useState(true);
  const [inventoryCatalogUid, setInventoryCatalogUid] = useState('');
  const [inventoryCatalogName, setInventoryCatalogName] = useState('');
  const [isCustomInventoryCatalog, setIsCustomInventoryCatalog] = useState(false);

  const [isSelfOrder, setIsSelfOrder] = useState(true);
  const [orderCatalogUid, setOrderCatalogUid] = useState('');
  const [orderCatalogName, setOrderCatalogName] = useState('');
  const [isCustomOrderCatalog, setIsCustomOrderCatalog] = useState(false);

  const [storePickup, setStorePickup] = useState(true);
  const [homeDelivery, setHomeDelivery] = useState(true);
  const [walkInDropdownOpen, setWalkInDropdownOpen] = useState(false);
  const [pickupDropdownOpen, setPickupDropdownOpen] = useState(false);
  const [deliveryDropdownOpen, setDeliveryDropdownOpen] = useState(false);

  // Order Types & Invoicing sequence config
  const [orderTypes, setOrderTypes] = useState<OrderTypeItem[]>(DEFAULT_ORDER_TYPES);
  const [initialOrderTypes, setInitialOrderTypes] = useState<OrderTypeItem[]>(DEFAULT_ORDER_TYPES);
  const [sequenceConfirmationOpen, setSequenceConfirmationOpen] = useState(false);
  const [pendingSequenceChanges, setPendingSequenceChanges] = useState<Array<{
    type: string;
    name: string;
    oldFormat: string;
    newFormat: string;
    oldMode: string;
    newMode: string;
  }>>([]);

  const [isAddingOrderType, setIsAddingOrderType] = useState(false);
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [newTypePrefix, setNewTypePrefix] = useState('');
  const [newTypeSuffix, setNewTypeSuffix] = useState('');

  const [advancedOpen, setAdvancedOpen] = useState(true);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogModalType, setCatalogModalType] = useState<'inventory' | 'order'>('inventory');

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const [storeTypeDropdownOpen, setStoreTypeDropdownOpen] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [invoiceTypeDropdownOpen, setInvoiceTypeDropdownOpen] = useState(false);
  const [walkInInvoiceTypesDropdownOpen, setWalkInInvoiceTypesDropdownOpen] = useState(false);

  const filteredStores = stores.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          store.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          store.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'All' || store.type === selectedType;
    return matchesSearch && matchesType;
  });

  const [storePage, setStorePage] = useState(1);
  React.useEffect(() => { setStorePage(1); }, [searchQuery, selectedType, stores.length]);
  const pagedStores = filteredStores.slice((storePage - 1) * STORE_PAGE_SIZE, storePage * STORE_PAGE_SIZE);

  const toggleAll = () => {
    if (selectedStoreIds.length === filteredStores.length) {
      setSelectedStoreIds([]);
    } else {
      setSelectedStoreIds(filteredStores.map(s => s.id));
    }
  };

  const toggleStore = (id: string) => {
    setSelectedStoreIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleCreateNew = () => {
    setFormName('');
    setFormCode('');
    setFormGstin('');
    const defaultLoc = locations[0];
    setFormLocationUid(defaultLoc?.uid ?? '');
    setFormLocation(defaultLoc?.name ?? '');
    setFormType('Retail');
    setFormStatus('Active');
    setFormContact('');
    setFormMobile('');
    setFormEmail('');
    setFormAddressLine1(''); setFormAddressLine2(''); setFormCity(''); setFormState(''); setFormPinCode('');
    setFormBankAccountName(''); setFormBankAccountNumber(''); setFormBankName(''); setFormBankIfsc(''); setFormBankBranch('');
    setFormUpiId(''); setFormInvoiceTerms(''); setFormInvoiceSignatory('');
    setOnlineSelfOrder(true);
    setWalkInPos(true);
    setTrackInventory(true);
    if (availableInventoryCatalogs.length > 0) {
      setInventoryCatalogUid(availableInventoryCatalogs[0].id);
      setInventoryCatalogName(availableInventoryCatalogs[0].name);
      setIsCustomInventoryCatalog(false);
    } else {
      setInventoryCatalogUid('');
      setInventoryCatalogName('');
      setIsCustomInventoryCatalog(true);
    }
    setIsSelfOrder(true);
    if (availableOrderCatalogs.length > 0) {
      setOrderCatalogUid(availableOrderCatalogs[0].id);
      setOrderCatalogName(availableOrderCatalogs[0].name);
      setIsCustomOrderCatalog(false);
    } else {
      setOrderCatalogUid('');
      setOrderCatalogName('');
      setIsCustomOrderCatalog(true);
    }
    setStorePickup(true);
    setHomeDelivery(true);
    setOrderTypes(DEFAULT_ORDER_TYPES.map(o => ({ ...o })));
    setIsAddingOrderType(false);
    setUploadedImage(null);
    setAdvancedOpen(true);
    setStoreToEdit(null);
    setShowCreateForm(true);
  };

  const handleEdit = (store: StoreItem) => {
    setStoreToEdit(store);
    setFormName(store.name);
    setFormCode(store.code);
    setFormGstin(store.gstin ?? '');
    setFormLocationUid(store.locationUid ?? '');
    setFormLocation((store.locationUid && locationNameByUid.get(store.locationUid)) || store.location || '');
    setFormType(store.type);
    setFormStatus(store.status);
    setFormContact(store.contact);
    setFormStaff(store.staff);
    setFormMobile(store.contact.replace(/[^\d]/g, '').slice(-10));
    setFormEmail((store as any).email || '');
    const s: any = store;
    setFormAddressLine1(s.addressLine1 || ''); setFormAddressLine2(s.addressLine2 || '');
    setFormCity(s.city || ''); setFormState(s.state || ''); setFormPinCode(s.pinCode || '');
    setFormBankAccountName(s.bankAccountName || ''); setFormBankAccountNumber(s.bankAccountNumber || '');
    setFormBankName(s.bankName || ''); setFormBankIfsc(s.bankIfsc || ''); setFormBankBranch(s.bankBranch || '');
    setFormUpiId(s.upiId || ''); setFormInvoiceTerms(s.invoiceTerms || ''); setFormInvoiceSignatory(s.invoiceSignatory || '');
    setOnlineSelfOrder(false);
    setWalkInPos(store.walkInPos ?? true);
    setTrackInventory(store.trackInventory ?? true);
    setInventoryCatalogUid(store.inventoryCatalogUid ?? '');
    setInventoryCatalogName(store.inventoryCatalogName ?? '');
    setIsCustomInventoryCatalog(!store.inventoryCatalogUid && !!store.inventoryCatalogName);
    setIsSelfOrder(store.isSelfOrder ?? true);
    setOrderCatalogUid(store.orderCatalogUid ?? '');
    setOrderCatalogName(store.orderCatalogName ?? '');
    setIsCustomOrderCatalog(!store.orderCatalogUid && !!store.orderCatalogName);
    setStorePickup(store.storePickup ?? true);
    setHomeDelivery(store.homeDelivery ?? true);

    if ((store as any).orderTypes && Array.isArray((store as any).orderTypes) && (store as any).orderTypes.length > 0) {
      const initTypes = (store as any).orderTypes.map((o: any) => ({ ...o, independentSequence: o.independentSequence !== false }));
      setOrderTypes(initTypes);
      setInitialOrderTypes(initTypes);
    } else if ((store as any).prefixSuffixRows && Array.isArray((store as any).prefixSuffixRows) && (store as any).prefixSuffixRows.length > 0) {
      const mapped = (store as any).prefixSuffixRows.map((r: any) => {
        const isB2B = r.type === 'B2B';
        return {
          type: r.type === 'B2H' ? 'B2C' : r.type,
          name: isB2B ? 'B2B (Business-to-Business)' : 'B2C (Retail Consumer)',
          description: isB2B
            ? 'Business-to-business tax invoice (includes customer GSTIN for input tax credit).'
            : 'Retail consumer tax invoice.',
          prefix: r.prefix || (isB2B ? 'INV-B' : 'INV-C'),
          suffix: r.suffix || '',
          active: r.active ?? true,
          independentSequence: r.independentSequence !== false,
          isCustom: r.type !== 'B2B' && r.type !== 'B2C' && r.type !== 'B2H',
        };
      });
      setOrderTypes(mapped);
      setInitialOrderTypes(mapped);
    } else {
      const defaultTypes = DEFAULT_ORDER_TYPES.map(o => ({ ...o }));
      setOrderTypes(defaultTypes);
      setInitialOrderTypes(defaultTypes);
    }
    setIsAddingOrderType(false);
    setUploadedImage(null);
    setAdvancedOpen(true);
    setShowCreateForm(true);
  };

  const executeSaveForm = () => {
    const compiledContact = formMobile ? `+91 ${formMobile}` : formContact;
    const activeOrderTypes = orderTypes.filter(ot => ot.active);
    const defaultInvoiceType = activeOrderTypes.length > 0 ? activeOrderTypes[0].type : 'B2C';
    const activeTypesStr = activeOrderTypes.map(ot => ot.type).join(',');

    const storeData = {
      id: storeToEdit ? storeToEdit.id : String(stores.length + 1),
      name: formName,
      code: formCode,
      gstin: formGstin || null,
      locationUid: formLocationUid || null,
      location: formLocation,
      type: formType,
      status: formStatus,
      contact: compiledContact,
      email: formEmail,
      mobile: formMobile,
      // Invoice & payment profile
      addressLine1: formAddressLine1 || null,
      addressLine2: formAddressLine2 || null,
      city: formCity || null,
      state: formState || null,
      pinCode: formPinCode || null,
      bankAccountName: formBankAccountName || null,
      bankAccountNumber: formBankAccountNumber || null,
      bankName: formBankName || null,
      bankIfsc: formBankIfsc || null,
      bankBranch: formBankBranch || null,
      upiId: formUpiId || null,
      invoiceTerms: formInvoiceTerms || null,
      invoiceSignatory: formInvoiceSignatory || null,
      onlineSelfOrder,
      walkInPos,
      walkinPos: walkInPos,
      trackInventory,
      inventoryCatalogUid: trackInventory ? (inventoryCatalogUid || undefined) : undefined,
      inventoryCatalogName: trackInventory ? inventoryCatalogName : '',
      isSelfOrder: trackInventory ? isSelfOrder : false,
      selfOrder: trackInventory ? isSelfOrder : false,
      orderCatalogUid: (trackInventory && isSelfOrder) ? (orderCatalogUid || undefined) : undefined,
      orderCatalogName: (trackInventory && isSelfOrder) ? orderCatalogName : '',
      inventoryCatalogItemUids: selectedInventoryItemUids.length > 0 ? selectedInventoryItemUids : undefined,
      orderCatalogItemUids: selectedOrderItemUids.length > 0 ? selectedOrderItemUids : undefined,
      storePickup: (trackInventory && isSelfOrder) ? storePickup : false,
      homeDelivery: (trackInventory && isSelfOrder) ? homeDelivery : false,
      orderTypes: orderTypes.map(ot => ({
        type: ot.type,
        name: ot.name,
        description: ot.description,
        prefix: ot.prefix,
        suffix: ot.suffix,
        active: ot.active,
        independentSequence: ot.independentSequence !== false,
      })),
      prefixSuffixRows: orderTypes.map(ot => ({
        type: ot.type,
        name: ot.name,
        description: ot.description,
        prefix: ot.prefix,
        suffix: ot.suffix,
        active: ot.active,
        independentSequence: ot.independentSequence !== false,
      })),
      invoiceTypeRequiredVal: defaultInvoiceType,
      walkInInvoiceTypes: activeTypesStr,
      uploadedImage: uploadedImage,
      staff: formStaff
    };

    if (storeToEdit) {
      // Edit mode
      const updatedStore: StoreItem = {
        ...storeToEdit,
        name: formName,
        code: formCode,
        gstin: formGstin || undefined,
        locationUid: formLocationUid || undefined,
        location: formLocation,
        type: formType,
        status: formStatus,
        contact: compiledContact,
        email: formEmail,
        staff: formStaff,
        // Invoice & payment profile
        addressLine1: formAddressLine1 || undefined,
        addressLine2: formAddressLine2 || undefined,
        city: formCity || undefined,
        state: formState || undefined,
        pinCode: formPinCode || undefined,
        bankAccountName: formBankAccountName || undefined,
        bankAccountNumber: formBankAccountNumber || undefined,
        bankName: formBankName || undefined,
        bankIfsc: formBankIfsc || undefined,
        bankBranch: formBankBranch || undefined,
        upiId: formUpiId || undefined,
        invoiceTerms: formInvoiceTerms || undefined,
        invoiceSignatory: formInvoiceSignatory || undefined,
        trackInventory,
        inventoryCatalogName: trackInventory ? inventoryCatalogName : '',
        isSelfOrder: trackInventory ? isSelfOrder : false,
        orderCatalogName: (trackInventory && isSelfOrder) ? orderCatalogName : '',
        walkInPos: (trackInventory && isSelfOrder) ? walkInPos : false,
        storePickup: (trackInventory && isSelfOrder) ? storePickup : false,
        homeDelivery: (trackInventory && isSelfOrder) ? homeDelivery : false,
      };
      updateStoreMutation.mutate({ uid: storeToEdit.id, payload: { ...updatedStore, inventoryCatalogItemUids: selectedInventoryItemUids.length > 0 ? selectedInventoryItemUids : undefined } as any }, {
        onSuccess: async (saved: any) => {
          const targetInvUid = saved?.inventoryCatalogUid || storeToEdit.inventoryCatalogUid || inventoryCatalogUid;
          if (targetInvUid && selectedInventoryItemUids.length > 0) {
            for (const itemUid of selectedInventoryItemUids) {
              try {
                await addInventoryItemMutation.mutateAsync({
                  catalogUid: targetInvUid,
                  itemData: { itemUid, status: 'ACTIVE' }
                });
              } catch (e) {
                console.warn('Item attach', e);
              }
            }
          }
          queryClient.invalidateQueries({ queryKey: ['inventoryCatalogs'] });
          queryClient.invalidateQueries({ queryKey: ['inventoryCatalogItems'] });
          queryClient.invalidateQueries({ queryKey: ['orderCatalogs'] });
          queryClient.invalidateQueries({ queryKey: ['orderCatalogItems'] });
          showToast('Store and sequence configuration updated successfully!', 'success');
          setNewlyCreatedStore({ ...storeData, id: saved?.uid || saved?.id || storeToEdit.id });
          setShowCreatedPage(true);
          setShowCreateForm(false);
          setStoreToEdit(null);
          setSequenceConfirmationOpen(false);
        },
        onError: (err: any) => {
          showToast(`Failed to update store: ${err?.message || 'Server error'}`, 'error');
          setSequenceConfirmationOpen(false);
        }
      });
    } else {
      // Create mode
      createStoreMutation.mutate(storeData, {
        onSuccess: async (saved: any) => {
          const freshId = saved?.uid || saved?.id || '';
          const targetInvUid = saved?.inventoryCatalogUid || inventoryCatalogUid;
          if (targetInvUid && selectedInventoryItemUids.length > 0) {
            for (const itemUid of selectedInventoryItemUids) {
              try {
                await addInventoryItemMutation.mutateAsync({
                  catalogUid: targetInvUid,
                  itemData: { itemUid, status: 'ACTIVE' }
                });
              } catch (e) {
                console.warn('Item attach fallback', e);
              }
            }
          }
          queryClient.invalidateQueries({ queryKey: ['inventoryCatalogs'] });
          queryClient.invalidateQueries({ queryKey: ['inventoryCatalogItems'] });
          queryClient.invalidateQueries({ queryKey: ['orderCatalogs'] });
          queryClient.invalidateQueries({ queryKey: ['orderCatalogItems'] });
          showToast('Store created successfully!', 'success');
          setNewlyCreatedStore({ ...storeData, id: freshId });
          setShowCreatedPage(true);
          setShowCreateForm(false);
          setStoreToEdit(null);
          setSequenceConfirmationOpen(false);
        },
        onError: (err: any) => {
          showToast(`Failed to create store: ${err?.message || 'Server error'}`, 'error');
          setSequenceConfirmationOpen(false);
        }
      });
    }
  };

  const handleSaveForm = () => {
    if (!formName.trim()) {
      showToast('Please enter a store name.', 'error');
      return;
    }

    // Check if editing an existing store and sequence rules or prefixes were modified
    if (storeToEdit && initialOrderTypes.length > 0) {
      const diffs: Array<{
        type: string;
        name: string;
        oldFormat: string;
        newFormat: string;
        oldMode: string;
        newMode: string;
      }> = [];

      orderTypes.forEach(cur => {
        const init = initialOrderTypes.find(i => i.type === cur.type);
        if (init) {
          const prefixChanged = (init.prefix || '') !== (cur.prefix || '');
          const suffixChanged = (init.suffix || '') !== (cur.suffix || '');
          const modeChanged = (init.independentSequence !== false) !== (cur.independentSequence !== false);
          if (prefixChanged || suffixChanged || modeChanged) {
            diffs.push({
              type: cur.type,
              name: cur.name || cur.type,
              oldFormat: `${init.prefix || ''}1001${init.suffix || ''}`,
              newFormat: `${cur.prefix || ''}1001${cur.suffix || ''}`,
              oldMode: init.independentSequence !== false ? 'Independent Counter' : 'Tenant Shared',
              newMode: cur.independentSequence !== false ? 'Independent Counter' : 'Tenant Shared',
            });
          }
        }
      });

      if (diffs.length > 0) {
        setPendingSequenceChanges(diffs);
        setSequenceConfirmationOpen(true);
        return;
      }
    }

    executeSaveForm();
  };

  const handleDeleteSelected = () => {
    setStores(prev => prev.filter(s => !selectedStoreIds.includes(s.id)));
    selectedStoreIds.forEach(id => deleteStoreMutation.mutate(id));
    setSelectedStoreIds([]);
  };

  const getStatusStyles = (status: StoreItem['status']) => {
    switch (status) {
      case 'Active':
        return "bg-[#E6F4EA] text-[#137333] font-extrabold";
      case 'Draft':
        return "bg-[#E8F0FE] text-[#1A73E8] font-extrabold";
      case 'Archived':
        return "bg-[#FCE8E6] text-[#C5221F] font-extrabold";
      default:
        return "bg-[#F1F3F4] text-[#5F6368] font-extrabold";
    }
  };

  const getStatusDot = (status: StoreItem['status']) => {
    switch (status) {
      case 'Active': return "bg-[#137333]";
      case 'Draft': return "bg-[#1A73E8]";
      case 'Archived': return "bg-[#C5221F]";
      default: return "bg-[#5F6368]";
    }
  };

  if (showCreatedPage && newlyCreatedStore) {
    return (
      <StoreDetails
        store={newlyCreatedStore}
        onBack={() => {
          setShowCreatedPage(false);
          setNewlyCreatedStore(null);
        }}
        onEdit={() => {
          const found = stores.find(s => s.id === newlyCreatedStore.id);
          setCameFromDetail(true);
          if (found) {
            handleEdit(found);
          } else {
            setStoreToEdit(newlyCreatedStore);
            setShowCreateForm(true);
          }
          setShowCreatedPage(false);
        }}
        onDelete={() => {
          handleDeleteStore(newlyCreatedStore.id);
          setShowCreatedPage(false);
          setNewlyCreatedStore(null);
        }}
      />
    );
  }

  if (showCreateForm) {
    return (
      <div className="flex flex-col h-full bg-[#FAFAFB] font-sans relative">
        {toastNotification && (
          <div className={cn(
            "fixed top-5 right-5 z-[99999] px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-200 border text-left",
            toastNotification.type === 'error' ? "bg-rose-900 text-rose-50 border-rose-700" :
            toastNotification.type === 'success' ? "bg-emerald-900 text-emerald-50 border-emerald-700" :
            "bg-slate-900 text-slate-50 border-slate-700"
          )}>
            {toastNotification.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            ) : toastNotification.type === 'success' ? (
              <Check className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
            )}
            <span>{toastNotification.message}</span>
          </div>
        )}
        {/* Page Header Bar */}
        <div className="bg-white border-b border-surface-100 py-4 px-8 flex items-center gap-4 shrink-0 text-left">
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(false);
              if (cameFromDetail) {
                setShowCreatedPage(true);
                setCameFromDetail(false);
              } else {
                setStoreToEdit(null);
              }
            }}
            className="flex items-center gap-2 hover:opacity-85 text-surface-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
            <h1 className="text-base font-bold text-surface-900 tracking-tight">
              {storeToEdit ? 'Edit Store' : 'Create New Store'}
            </h1>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-8 pb-32">
            <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">

              {/* Left Column (Forms - Col Span 8) */}
              <div className="lg:col-span-8 space-y-6 flex flex-col">

                {/* Card 1: Store Details */}
                <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden text-left">
                  <div className="p-6 border-b border-surface-100">
                    <h2 className="text-[17px] font-bold text-surface-900">Store Details</h2>
                  </div>

                  <div className="p-5 md:p-6 space-y-5">
                    {/* Store Name */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block mb-2">
                        Store Name <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Store name"
                        className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] shadow-sm transition-all placeholder:text-surface-300"
                      />
                    </div>

                    {/* Store GSTIN — its state code decides IGST vs CGST/SGST for this store's invoices */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block mb-2">
                        GSTIN
                      </label>
                      <input
                        type="text"
                        value={formGstin}
                        onChange={(e) => setFormGstin(e.target.value.toUpperCase())}
                        placeholder="e.g. 32ABCDE1234F1Z5"
                        className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] shadow-sm transition-all placeholder:text-surface-300"
                      />
                      <p className="text-[11px] text-surface-400">State code (first 2 digits) sets whether IGST or CGST+SGST applies on this store's invoices.</p>
                    </div>

                    {/* Store Type & Location */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block mb-2">
                          Store Type <span className="text-red-500 font-bold">*</span>
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <button
                              type="button"
                              onClick={() => {
                                setStoreTypeDropdownOpen(!storeTypeDropdownOpen);
                                setLocationDropdownOpen(false);
                                setInvoiceTypeDropdownOpen(false);
                                setWalkInInvoiceTypesDropdownOpen(false);
                              }}
                              className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 hover:border-surface-300 transition-colors focus:ring-2 focus:ring-[#55349A]/10 outline-none text-left"
                            >
                              {formType}
                              <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform duration-200", storeTypeDropdownOpen && "rotate-180")} />
                            </button>

                            {storeTypeDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top max-h-60 overflow-y-auto text-left">
                                {['RETAIL', 'PHARMACY', 'RESTAURANT', 'GROCERY', 'BAKERY', 'AYURVEDA', 'WAREHOUSE', 'CAFE', 'KITCHEN', 'CINEMA', 'DISTRIBUTOR', 'OTHER'].map(option => (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => { setFormType(option); setStoreTypeDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold text-surface-700 transition-colors cursor-pointer"
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newType = prompt("Enter custom Store Type:", "SUPERMARKET");
                              if (newType && newType.trim()) {
                                setFormType(newType.toUpperCase().trim());
                              }
                            }}
                            className="p-2.5 bg-purple-50 border border-purple-100 rounded-xl text-[#55349A] hover:bg-purple-100 transition-colors shrink-0 flex items-center justify-center h-[40px] w-[40px] cursor-pointer"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block mb-2">
                          Location
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <button
                              type="button"
                              onClick={() => {
                                setLocationDropdownOpen(!locationDropdownOpen);
                                setStoreTypeDropdownOpen(false);
                                setInvoiceTypeDropdownOpen(false);
                                setWalkInInvoiceTypesDropdownOpen(false);
                              }}
                              className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 hover:border-surface-300 transition-colors focus:ring-2 focus:ring-[#55349A]/10 outline-none text-left"
                            >
                              <span className={cn(!formLocationUid && "text-surface-300 font-medium")}>
                                {formLocation || (locationsLoading ? 'Loading locations…' : 'Select location')}
                              </span>
                              <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform duration-200", locationDropdownOpen && "rotate-180")} />
                            </button>

                            {locationDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top max-h-60 overflow-y-auto text-left">
                                {locations.length === 0 && (
                                  <div className="px-4 py-2 text-sm text-surface-400 font-medium">
                                    {locationsLoading ? 'Loading locations…' : 'No locations found. Add one in Business Setup.'}
                                  </div>
                                )}
                                {locations.map(loc => (
                                  <button
                                    key={loc.uid}
                                    type="button"
                                    onClick={() => { setFormLocationUid(loc.uid); setFormLocation(loc.name); setLocationDropdownOpen(false); }}
                                    className={cn(
                                      "w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-surface-50 font-semibold text-surface-700 transition-colors cursor-pointer",
                                      loc.uid === formLocationUid && "bg-purple-50 text-[#55349A]"
                                    )}
                                  >
                                    <span>{loc.name}</span>
                                    {loc.isBase && <span className="text-[10px] font-bold uppercase tracking-wider text-[#55349A] bg-purple-50 px-1.5 py-0.5 rounded">Base</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Email & Mobile Number */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          placeholder="Email address"
                          className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] shadow-sm transition-all placeholder:text-surface-300"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block mb-2">
                          Mobile Number
                        </label>
                        <div className="flex border border-surface-200 rounded-xl bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#55349A]/10 focus-within:border-[#55349A] shadow-sm transition-all h-[40px]">
                          <div className="flex items-center gap-1.5 px-3 bg-slate-50 border-r border-surface-200 select-none cursor-pointer hover:bg-slate-150 transition-colors">
                            <span className="text-sm font-bold">🇮🇳</span>
                            <ChevronDown className="h-3 w-3 text-surface-400" />
                          </div>
                          <input
                            type="text"
                            value={formMobile}
                            onChange={(e) => setFormMobile(e.target.value)}
                            placeholder="Mobile number"
                            className="flex-1 px-4 py-2 bg-transparent text-sm outline-none font-semibold text-surface-900 placeholder:text-surface-300"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Invoice & Payment Details — printed on this store's GST tax invoice */}
                    <div className="space-y-4 pt-2 border-t border-surface-100">
                      <div className="pt-2">
                        <h4 className="text-sm font-black text-surface-900">Invoice &amp; Payment Details</h4>
                        <p className="text-[11px] text-surface-400 mt-0.5">Address, bank details, UPI and terms shown on this store's GST tax invoice.</p>
                      </div>

                      {/* Printable address */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block">Address Line 1</label>
                          <input type="text" value={formAddressLine1} onChange={(e) => setFormAddressLine1(e.target.value)} placeholder="Building, street"
                            className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] shadow-sm transition-all placeholder:text-surface-300" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block">Address Line 2</label>
                          <input type="text" value={formAddressLine2} onChange={(e) => setFormAddressLine2(e.target.value)} placeholder="Area, landmark (optional)"
                            className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] shadow-sm transition-all placeholder:text-surface-300" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block">City</label>
                          <input type="text" value={formCity} onChange={(e) => setFormCity(e.target.value)} placeholder="City"
                            className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] shadow-sm transition-all placeholder:text-surface-300" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block">State</label>
                            <input type="text" value={formState} onChange={(e) => setFormState(e.target.value)} placeholder="State"
                              className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] shadow-sm transition-all placeholder:text-surface-300" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block">PIN Code</label>
                            <input type="text" value={formPinCode} onChange={(e) => setFormPinCode(e.target.value)} placeholder="PIN"
                              className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] shadow-sm transition-all placeholder:text-surface-300" />
                          </div>
                        </div>
                      </div>

                      {/* Bank details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block">Bank A/c Holder Name</label>
                          <input type="text" value={formBankAccountName} onChange={(e) => setFormBankAccountName(e.target.value)} placeholder="Account holder name"
                            className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] shadow-sm transition-all placeholder:text-surface-300" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block">Bank A/c Number</label>
                          <input type="text" value={formBankAccountNumber} onChange={(e) => setFormBankAccountNumber(e.target.value)} placeholder="Account number"
                            className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] shadow-sm transition-all placeholder:text-surface-300" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block">Bank Name</label>
                          <input type="text" value={formBankName} onChange={(e) => setFormBankName(e.target.value)} placeholder="Bank name"
                            className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] shadow-sm transition-all placeholder:text-surface-300" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block">IFSC</label>
                            <input type="text" value={formBankIfsc} onChange={(e) => setFormBankIfsc(e.target.value.toUpperCase())} placeholder="IFSC"
                              className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] shadow-sm transition-all placeholder:text-surface-300" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block">Branch</label>
                            <input type="text" value={formBankBranch} onChange={(e) => setFormBankBranch(e.target.value)} placeholder="Branch"
                              className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] shadow-sm transition-all placeholder:text-surface-300" />
                          </div>
                        </div>
                      </div>

                      {/* UPI + signatory */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block">UPI ID (for payable QR)</label>
                          <input type="text" value={formUpiId} onChange={(e) => setFormUpiId(e.target.value)} placeholder="name@bank"
                            className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] shadow-sm transition-all placeholder:text-surface-300" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block">Authorised Signatory</label>
                          <input type="text" value={formInvoiceSignatory} onChange={(e) => setFormInvoiceSignatory(e.target.value)} placeholder="Defaults to store name"
                            className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] shadow-sm transition-all placeholder:text-surface-300" />
                        </div>
                      </div>

                      {/* Terms */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block">Terms &amp; Conditions</label>
                        <textarea value={formInvoiceTerms} onChange={(e) => setFormInvoiceTerms(e.target.value)} rows={3} placeholder="One line per term; shown in the invoice footer."
                          className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] shadow-sm transition-all placeholder:text-surface-300 resize-y" />
                      </div>
                    </div>

                     {/* Switched Row / Track Inventory & Options */}
                     <div className="space-y-4 pt-2">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* Track Inventory Switch container (corresponds to CSS Selector 1) */}
                         <div
                           id="track-inventory-toggle-container"
                           className="flex items-center justify-between p-4 bg-surface-50 rounded-xl cursor-pointer hover:bg-surface-100 transition-colors"
                           onClick={() => setTrackInventory(!trackInventory)}
                         >
                           <div className="flex flex-col text-left">
                             <span className="text-sm font-bold text-surface-900 leading-none mb-1">
                               Track Inventory
                             </span>
                             <span className="text-[11px] text-surface-400 leading-tight">
                               Enable inventory tracking for this store
                             </span>
                           </div>

                           <button
                             type="button"
                             className={cn(
                               "w-[45px] h-[26px] rounded-full relative transition-colors shrink-0",
                               trackInventory ? "bg-[#55349A]" : "bg-surface-300"
                             )}
                           >
                             <div className={cn(
                               "absolute top-[3px] left-[3px] w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                               trackInventory ? "translate-x-[19px]" : "translate-x-0"
                             )} />
                           </button>
                         </div>

                         {/* Spacer or second column to keep grid balance */}
                         <div className="bg-slate-50/20 border border-dashed border-slate-200/55 rounded-xl p-4 flex items-center justify-center text-center text-xs font-semibold text-slate-400">
                           {trackInventory ? "✓ Configure inventory catalogs below" : "Inventory tracking is disabled"}
                         </div>
                       </div>

                       {/* Expanded Dynamic Settings when Track Inventory is ON */}
                       {trackInventory && (
                         <div className="border border-[#E2E6ED] rounded-xl p-5 bg-slate-50/40 space-y-5 text-left animate-in fade-in slide-in-from-top-2 duration-250">
                            {/* Inventory Catalog Selection & Creation */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block">
                                  Inventory Catalog <span className="text-red-500 font-bold">*</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCatalogModalType('inventory');
                                    setCatalogModalOpen(true);
                                  }}
                                  className="text-xs font-bold text-[#55349A] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  + Create New Catalog
                                </button>
                              </div>

                              <div className="relative">
                                <select
                                  value={inventoryCatalogUid || inventoryCatalogName}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '__new__') {
                                      setCatalogModalType('inventory');
                                      setCatalogModalOpen(true);
                                    } else {
                                      const selected = availableInventoryCatalogs.find((c: any) => c.id === val || c.name === val);
                                      if (selected) {
                                        setInventoryCatalogUid(selected.id);
                                        setInventoryCatalogName(selected.name);
                                      } else if (!val) {
                                        setInventoryCatalogUid('');
                                        setInventoryCatalogName('');
                                      }
                                    }
                                  }}
                                  className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] shadow-sm transition-all appearance-none cursor-pointer"
                                >
                                  <option value="">
                                    {inventoryCatalogName ? inventoryCatalogName : 'Select an inventory catalog'}
                                  </option>
                                  {availableInventoryCatalogs.map((cat: any) => (
                                    <option key={cat.id} value={cat.id}>
                                      {cat.name} ({cat.itemsCount || 0} items)
                                    </option>
                                  ))}
                                  <option value="__new__" className="text-[#55349A] font-bold">+ Create New Catalog (Pop-up with Items)...</option>
                                </select>
                                <ChevronDown className="h-4 w-4 text-surface-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            </div>

                            {/* Ask if that inventory catalog is self order (as toggle button) */}
                            <div
                              className={cn(
                                "flex items-center justify-between p-4 bg-white border border-surface-200 rounded-xl transition-all",
                                (!walkInPos && !storePickup && !homeDelivery)
                                  ? "cursor-pointer hover:bg-slate-50"
                                  : "cursor-pointer hover:bg-slate-50"
                              )}
                              onClick={() => {
                                setIsSelfOrder(!isSelfOrder);
                              }}
                            >
                              <div className="flex flex-col text-left">
                                <span className="text-sm font-bold text-surface-900 leading-none mb-1">Self Order</span>
                                <span className="text-[11px] text-surface-400 leading-tight block mt-1">
                                  {!walkInPos && !storePickup && !homeDelivery
                                    ? "Enable self ordering catalog for customers"
                                    : "Enable self ordering catalog for customers"}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const isForcedOn = false;
                                  if (!isForcedOn) {
                                    setIsSelfOrder(!isSelfOrder);
                                  }
                                }}
                                className={cn(
                                  "w-[45px] h-[26px] rounded-full relative transition-colors shrink-0",
                                  isSelfOrder ? "bg-[#55349A]" : "bg-surface-300",
                                   "cursor-pointer"
                                )}
                              >
                                <div className={cn(
                                  "absolute top-[3px] left-[3px] w-5 h-5 bg-white rounded-full transition-transform shadow-sm pointer-events-none",
                                  isSelfOrder ? "translate-x-[19px]" : "translate-x-0"
                                )} />
                              </button>
                            </div>

                            {/* Dynamic Order Catalog inputs and Channel selections */}
                            {isSelfOrder && (
                              <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-5 animate-in fade-in duration-200">

                                {/* Order Catalog Selection & Creation */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block">
                                      Order Catalog <span className="text-red-500 font-bold">*</span>
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCatalogModalType('order');
                                        setCatalogModalOpen(true);
                                      }}
                                      className="text-xs font-bold text-[#55349A] hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      + Create New Catalog
                                    </button>
                                  </div>

                                  <div className="relative">
                                    <select
                                      value={orderCatalogUid || orderCatalogName}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '__new__') {
                                          setCatalogModalType('order');
                                          setCatalogModalOpen(true);
                                        } else {
                                          const selected = availableOrderCatalogs.find((c: any) => c.id === val || c.name === val);
                                          if (selected) {
                                            setOrderCatalogUid(selected.id);
                                            setOrderCatalogName(selected.name);
                                          } else if (!val) {
                                            setOrderCatalogUid('');
                                            setOrderCatalogName('');
                                          }
                                        }
                                      }}
                                      className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-900 outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] shadow-sm transition-all appearance-none cursor-pointer"
                                    >
                                      <option value="">
                                        {orderCatalogName ? orderCatalogName : 'Select an order catalog'}
                                      </option>
                                      {availableOrderCatalogs.map((cat: any) => (
                                        <option key={cat.id} value={cat.id}>
                                          {cat.name} ({cat.itemsCount || 0} items)
                                        </option>
                                      ))}
                                      <option value="__new__" className="text-[#55349A] font-bold">+ Create New Catalog (Pop-up with Items)...</option>
                                    </select>
                                    <ChevronDown className="h-4 w-4 text-surface-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  </div>
                                </div>

                                {/* Order Channels */}
                                <div className="bg-white border border-surface-200 rounded-xl p-5 space-y-4">
                                 <span className="text-xs font-black tracking-wider text-surface-400 uppercase block mb-1">
                                   Select Order Channels
                                 </span>

                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                   {/* Walk-in POS Select */}
                                   <div className="space-y-1.5 text-left bg-white">
                                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Walk-In POS</label>
                                     <div className="relative">
                                       <button
                                         type="button"
                                         onClick={() => setWalkInDropdownOpen(!walkInDropdownOpen)}
                                         className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-[#EAEBF0] rounded-xl text-sm font-semibold text-surface-900"
                                       >
                                         <span>{walkInPos ? 'Yes' : 'No'}</span>
                                         <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform", walkInDropdownOpen && "rotate-180")} />
                                       </button>
                                       {walkInDropdownOpen && (
                                         <>
                                           <div className="fixed inset-0 z-10" onClick={() => setWalkInDropdownOpen(false)} />
                                           <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#EAEBF0] rounded-xl shadow-xl z-20 py-2">
                                             <button
                                               type="button"
                                               className="w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold text-surface-950"
                                               onClick={() => { setWalkInPos(true); setWalkInDropdownOpen(false); }}
                                             >
                                               Yes
                                             </button>
                                             <button
                                               type="button"
                                               className="w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold text-surface-950"
                                               onClick={() => { setWalkInPos(false); setWalkInDropdownOpen(false); }}
                                             >
                                               No
                                             </button>
                                           </div>
                                         </>
                                       )}
                                     </div>
                                   </div>

                                   {/* Store Pickup Select */}
                                   <div className="space-y-1.5 text-left bg-white">
                                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Store Pickup</label>
                                     <div className="relative">
                                       <button
                                         type="button"
                                         onClick={() => setPickupDropdownOpen(!pickupDropdownOpen)}
                                         className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-[#EAEBF0] rounded-xl text-sm font-semibold text-surface-900"
                                       >
                                         <span>{storePickup ? 'Yes' : 'No'}</span>
                                         <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform", pickupDropdownOpen && "rotate-180")} />
                                       </button>
                                       {pickupDropdownOpen && (
                                         <>
                                           <div className="fixed inset-0 z-10" onClick={() => setPickupDropdownOpen(false)} />
                                           <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#EAEBF0] rounded-xl shadow-xl z-20 py-2">
                                             <button
                                               type="button"
                                               className="w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold text-surface-950"
                                               onClick={() => { setStorePickup(true); setPickupDropdownOpen(false); }}
                                             >
                                               Yes
                                             </button>
                                             <button
                                               type="button"
                                               className="w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold text-surface-950"
                                               onClick={() => { setStorePickup(false); setPickupDropdownOpen(false); }}
                                             >
                                               No
                                              </button>
                                           </div>
                                         </>
                                       )}
                                     </div>
                                   </div>

                                   {/* Home Delivery Select */}
                                   <div className="space-y-1.5 text-left bg-white">
                                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Home Delivery</label>
                                     <div className="relative">
                                       <button
                                         type="button"
                                         onClick={() => setDeliveryDropdownOpen(!deliveryDropdownOpen)}
                                         className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-[#EAEBF0] rounded-xl text-sm font-semibold text-surface-900"
                                       >
                                         <span>{homeDelivery ? 'Yes' : 'No'}</span>
                                         <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform", deliveryDropdownOpen && "rotate-180")} />
                                       </button>
                                       {deliveryDropdownOpen && (
                                         <>
                                           <div className="fixed inset-0 z-10" onClick={() => setDeliveryDropdownOpen(false)} />
                                           <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#EAEBF0] rounded-xl shadow-xl z-20 py-2">
                                             <button
                                               type="button"
                                               className="w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold text-surface-950"
                                               onClick={() => { setHomeDelivery(true); setDeliveryDropdownOpen(false); }}
                                             >
                                               Yes
                                             </button>
                                             <button
                                               type="button"
                                               className="w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold text-surface-950"
                                               onClick={() => { setHomeDelivery(false); setDeliveryDropdownOpen(false); }}
                                             >
                                               No
                                             </button>
                                           </div>
                                         </>
                                       )}
                                     </div>
                                   </div>
                                 </div>
                               </div>

                             </div>
                           )}

                         </div>
                       )}
                     </div>
                  </div>
                </div>

                {/* Card 2: Order Types (Collapsible) */}
                <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden text-left">
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen(!advancedOpen)}
                    className="w-full flex items-center justify-between p-6 mb-0 font-bold hover:bg-slate-50/50 transition-colors text-left"
                  >
                    <div>
                      <span className="flex items-center gap-1.5 leading-none font-bold text-surface-900 text-[15px]">
                        Order Types
                      </span>
                      <p className="text-xs text-surface-400 font-normal mt-1">
                        Configure order invoice types, serial numbering prefixes, and tax invoice formats.
                      </p>
                    </div>
                    {advancedOpen ? (
                      <ChevronUp className="h-4.5 w-4.5 text-surface-400" />
                    ) : (
                      <ChevronDown className="h-4.5 w-4.5 text-surface-400" />
                    )}
                  </button>

                  {advancedOpen && (
                    <div className="p-6 border-t border-surface-200 space-y-6 animate-in slide-in-from-top-1 duration-200">

                      {/* Top Controls: Header + Add Order Type Button */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-surface-500 uppercase tracking-wider">
                            Active Order & Invoice Types
                          </h3>
                          <p className="text-[11px] text-surface-400 mt-0.5">
                            Default types include B2C (Retail) and B2B (Tax Invoice with ITC). Enable/disable and edit sequence prefix/suffix.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAddingOrderType(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-[#55349A] hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Order Type</span>
                        </button>
                      </div>

                      {/* Inline Form to Add New Order Type */}
                      {isAddingOrderType && (
                        <div className="p-4 bg-purple-50/40 border border-purple-200/80 rounded-xl space-y-3 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#55349A] uppercase tracking-wider">
                              + New Order Type
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingOrderType(false);
                                setNewTypeCode('');
                                setNewTypeName('');
                                setNewTypeDescription('');
                                setNewTypePrefix('');
                                setNewTypeSuffix('');
                              }}
                              className="text-xs text-surface-400 hover:text-surface-600 font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[11px] font-bold text-surface-600 block mb-1">Type Code *</label>
                              <input
                                type="text"
                                placeholder="e.g. B2G, SAMPLE, EXPORT"
                                value={newTypeCode}
                                onChange={(e) => setNewTypeCode(e.target.value.toUpperCase())}
                                className="w-full px-3 py-1.5 bg-white border border-surface-200 rounded-lg text-xs font-bold uppercase outline-none focus:border-[#55349A]"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-surface-600 block mb-1">Prefix</label>
                              <input
                                type="text"
                                placeholder="e.g. GOV-, EXP-"
                                value={newTypePrefix}
                                onChange={(e) => setNewTypePrefix(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-surface-200 rounded-lg text-xs font-mono outline-none focus:border-[#55349A]"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-surface-600 block mb-1">Suffix</label>
                              <input
                                type="text"
                                placeholder="Optional suffix"
                                value={newTypeSuffix}
                                onChange={(e) => setNewTypeSuffix(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-surface-200 rounded-lg text-xs font-mono outline-none focus:border-[#55349A]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-surface-600 block mb-1">Description / Purpose</label>
                            <input
                              type="text"
                              placeholder="e.g. Government supply tax invoice"
                              value={newTypeDescription}
                              onChange={(e) => setNewTypeDescription(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-surface-200 rounded-lg text-xs outline-none focus:border-[#55349A]"
                            />
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (!newTypeCode.trim()) {
                                  showToast('Please enter a type code (e.g. B2G)', 'error');
                                  return;
                                }
                                const code = newTypeCode.trim().toUpperCase();
                                if (orderTypes.some(t => t.type === code)) {
                                  showToast(`Order type ${code} already exists.`, 'error');
                                  return;
                                }
                                setOrderTypes(prev => [
                                  ...prev,
                                  {
                                    type: code,
                                    name: newTypeName.trim() || code,
                                    description: newTypeDescription.trim() || `${code} order tax invoice`,
                                    prefix: newTypePrefix.trim() || `${code}-`,
                                    suffix: newTypeSuffix.trim(),
                                    active: true,
                                    isCustom: true,
                                  }
                                ]);
                                setIsAddingOrderType(false);
                                setNewTypeCode('');
                                setNewTypeName('');
                                setNewTypeDescription('');
                                setNewTypePrefix('');
                                setNewTypeSuffix('');
                              }}
                              className="px-4 py-1.5 bg-[#55349A] text-white rounded-lg text-xs font-bold hover:bg-[#43287A] transition-colors cursor-pointer"
                            >
                              Add Type
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Table: Order Types with Editable Prefix / Suffix and Active Switches */}
                      <div className="border border-surface-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-surface-100 font-bold select-none">
                              <th className="py-3.5 px-5 text-[10px] font-bold text-surface-400 uppercase tracking-widest w-[30%]">
                                Order Type & Description
                              </th>
                              <th className="py-3.5 px-3 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center w-[18%]">
                                Sequence Mode
                              </th>
                              <th className="py-3.5 px-3 text-[10px] font-bold text-surface-400 uppercase tracking-widest w-[16%]">
                                Prefix
                              </th>
                              <th className="py-3.5 px-3 text-[10px] font-bold text-surface-400 uppercase tracking-widest w-[14%]">
                                Suffix
                              </th>
                              <th className="py-3.5 px-3 text-[10px] font-bold text-surface-400 uppercase tracking-widest w-[14%]">
                                Preview
                              </th>
                              <th className="py-3.5 px-4 text-right w-[8%]">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-100">
                            {orderTypes.map((row, index) => (
                              <tr key={row.type} className={cn("transition-colors", !row.active ? "bg-slate-50/50 opacity-60" : "hover:bg-surface-50/30")}>
                                {/* Type + Description */}
                                <td className="py-3.5 px-5">
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-md font-mono font-black text-xs",
                                      row.type === 'B2C' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                      row.type === 'B2B' ? "bg-purple-50 text-[#55349A] border border-purple-200" :
                                      "bg-blue-50 text-blue-700 border border-blue-200"
                                    )}>
                                      {row.type}
                                    </span>
                                    <span className="font-bold text-surface-900 text-xs">{row.name || row.type}</span>
                                    {row.isCustom && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOrderTypes(prev => prev.filter((_, idx) => idx !== index));
                                        }}
                                        className="text-red-400 hover:text-red-600 p-0.5 ml-auto cursor-pointer"
                                        title="Delete custom type"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-surface-500 font-normal mt-1 leading-tight">
                                    {row.description}
                                  </p>
                                </td>

                                {/* Sequence Stream Mode */}
                                <td className="py-3.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const willBeIndependent = row.independentSequence === false;
                                      setConfirmRowModeModal({
                                        isOpen: true,
                                        rowIndex: index,
                                        rowName: row.name || row.type,
                                        rowType: row.type,
                                        targetMode: willBeIndependent ? 'independent' : 'shared',
                                        currentPrefix: row.prefix || (row.type === 'B2B' ? 'INV-B' : 'INV-C')
                                      });
                                    }}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer",
                                      row.independentSequence !== false
                                        ? "bg-purple-50 text-[#55349A] border-purple-200 hover:bg-purple-100"
                                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                    )}
                                    title="Click to switch sequence numbering stream"
                                  >
                                    <span className={cn("w-1.5 h-1.5 rounded-full", row.independentSequence !== false ? "bg-[#55349A]" : "bg-slate-400")} />
                                    <span>{row.independentSequence !== false ? 'Independent' : 'Tenant Shared'}</span>
                                  </button>
                                </td>

                                {/* Editable Prefix */}
                                <td className="py-3.5 px-3">
                                  <input
                                    type="text"
                                    value={row.prefix}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setOrderTypes(prev => prev.map((r, idx) => idx === index ? { ...r, prefix: val } : r));
                                    }}
                                    placeholder="Prefix"
                                    className="w-full px-2.5 py-1.5 bg-white border border-surface-200 rounded-lg text-xs font-mono font-semibold text-surface-900 outline-none focus:border-[#55349A] focus:ring-1 focus:ring-[#55349A]"
                                  />
                                </td>

                                {/* Editable Suffix */}
                                <td className="py-3.5 px-3">
                                  <input
                                    type="text"
                                    value={row.suffix}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setOrderTypes(prev => prev.map((r, idx) => idx === index ? { ...r, suffix: val } : r));
                                    }}
                                    placeholder="Suffix"
                                    className="w-full px-2.5 py-1.5 bg-white border border-surface-200 rounded-lg text-xs font-mono font-semibold text-surface-900 outline-none focus:border-[#55349A] focus:ring-1 focus:ring-[#55349A]"
                                  />
                                </td>

                                {/* Sample Preview */}
                                <td className="py-3.5 px-3">
                                  <span className="font-mono text-[11px] font-bold text-surface-700 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 block text-center truncate" title={row.independentSequence !== false ? `${row.prefix || ''}1001${row.suffix || ''}` : `${row.prefix || 'INV-'}1001 (Shared)`}>
                                    {row.independentSequence !== false
                                      ? `${row.prefix || ''}1001${row.suffix || ''}`
                                      : `${row.prefix || 'INV-'}1001`}
                                  </span>
                                </td>

                                {/* Enable/Disable Toggle */}
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOrderTypes(prev => prev.map((r, idx) => idx === index ? { ...r, active: !r.active } : r));
                                    }}
                                    className={cn(
                                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                      row.active ? "bg-[#55349A]" : "bg-surface-200"
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                                        row.active ? "translate-x-4" : "translate-x-0"
                                      )}
                                    />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (Col Span 4) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Store Gallery */}
                <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden text-left">
                  <div className="p-6 border-b border-surface-100 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">Store Gallery</h2>
                  </div>
                  <div className="p-6 space-y-6">
                    <div
                      onClick={() => document.getElementById('store-gallery-file-input')?.click()}
                      className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 bg-[#F8FAFC] hover:border-violet-300 hover:bg-violet-50/20 transition-all cursor-pointer group"
                    >
                      <input
                        type="file"
                        id="store-gallery-file-input"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setUploadedImage(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <div className="text-surface-400 group-hover:text-[#55349A] transition-colors">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="12" y1="18" x2="12" y2="12" />
                          <polyline points="9 15 12 12 15 15" />
                        </svg>
                      </div>
                      <p className="text-[15px] font-semibold text-surface-900">
                        Drag & Drop or <span className="text-[#55349A] font-bold">Choose file</span> to upload
                      </p>
                      <p className="text-xs text-surface-400 font-medium font-sans">jpg, png, jpeg</p>
                    </div>

                    {/* Display uploaded image */}
                    {uploadedImage && (
                      <div className="flex flex-wrap gap-4 pt-2">
                        <div className="relative w-[90px] h-[105px] rounded-xl border border-surface-200/60 shadow-sm overflow-visible bg-white group/thumb">
                          <img
                            src={uploadedImage}
                            alt="Store Gallery"
                            className="w-full h-full object-cover rounded-xl"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedImage(null);
                            }}
                            className="absolute -top-1.5 -right-1.5 w-6.5 h-6.5 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors shadow-md ring-2 ring-white cursor-pointer z-10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Sticky Bottom Bar */}
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-surface-100 py-4 px-8 flex items-center justify-end gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10">
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(false);
              if (cameFromDetail) {
                setShowCreatedPage(true);
                setCameFromDetail(false);
              } else {
                setStoreToEdit(null);
              }
            }}
            className="px-8 py-2.5 border border-surface-200 rounded-xl text-sm font-bold text-surface-500 hover:bg-surface-50 transition-all min-w-[125px] cursor-pointer animate-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveForm}
            className="px-10 py-2.5 bg-[#55349A] text-white rounded-xl text-sm font-bold hover:bg-[#452a7d] transition-all shadow-lg shadow-primary-600/20 min-w-[145px] cursor-pointer animate-none"
          >
            {storeToEdit ? 'Save Store' : 'Create Store'}
          </button>
        </div>

        {/* Catalog Creation Pop-up Modal */}
        <CatalogCreationModal
          isOpen={catalogModalOpen}
          type={catalogModalType}
          storeName={formName}
          storeUid={storeToEdit ? storeToEdit.id : undefined}
          onClose={() => setCatalogModalOpen(false)}
          onCreated={(cat) => {
            if (catalogModalType === 'inventory') {
              setInventoryCatalogUid(cat.id || '');
              setInventoryCatalogName(cat.name);
              if (cat.selectedItemUids) {
                setSelectedInventoryItemUids(cat.selectedItemUids);
              }
            } else {
              setOrderCatalogUid(cat.id || '');
              setOrderCatalogName(cat.name);
              if (cat.selectedItemUids) {
                setSelectedOrderItemUids(cat.selectedItemUids);
              }
            }
          }}
        />

        {/* Sequence & Prefix Change Confirmation Modal */}
        <SequenceChangeConfirmationModal
          isOpen={sequenceConfirmationOpen}
          storeName={formName}
          changes={pendingSequenceChanges}
          onCancel={() => setSequenceConfirmationOpen(false)}
          onConfirm={executeSaveForm}
          isSubmitting={updateStoreMutation.isPending}
        />

        {/* Immediate Row Mode Confirmation Modal */}
        {confirmRowModeModal && confirmRowModeModal.isOpen && (
          <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#55349A]/10 border border-[#55349A]/20 text-[#55349A] flex items-center justify-center shrink-0">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-900">
                    Switch to {confirmRowModeModal.targetMode === 'independent' ? 'Independent' : 'Tenant Shared'} Sequence?
                  </h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Changing numbering stream for <span className="font-bold text-slate-900">{confirmRowModeModal.rowName}</span> ({confirmRowModeModal.rowType}).
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4 text-xs text-slate-600">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-500 uppercase">Target Configuration</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded font-bold text-[10.5px]",
                      confirmRowModeModal.targetMode === 'independent'
                        ? "bg-purple-100 text-[#55349A]"
                        : "bg-slate-200 text-slate-700"
                    )}>
                      {confirmRowModeModal.targetMode === 'independent' ? 'Independent Counter' : 'Tenant Shared'}
                    </span>
                  </div>
                  <div className="text-[11.5px] font-mono text-slate-800">
                    Sample Next Bill: <span className="font-bold text-emerald-600">
                      {confirmRowModeModal.targetMode === 'independent'
                        ? `${confirmRowModeModal.currentPrefix}1001`
                        : `${confirmRowModeModal.currentPrefix || 'INV-'}1001 (Shared)`}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-slate-500 text-[11.5px] leading-relaxed">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Past orders & receipts will maintain their original invoice numbers.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>New orders will follow the selected numbering sequence.</span>
                  </div>
                </div>
              </div>

              <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmRowModeModal(null)}
                  className="px-4 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const idxToUpdate = confirmRowModeModal.rowIndex;
                    const newMode = confirmRowModeModal.targetMode === 'independent';
                    setOrderTypes(prev => prev.map((r, idx) => idx === idxToUpdate ? { ...r, independentSequence: newMode } : r));
                    showToast(`Switched ${confirmRowModeModal.rowType} to ${confirmRowModeModal.targetMode === 'independent' ? 'Independent' : 'Tenant Shared'} sequence`, 'success');
                    setConfirmRowModeModal(null);
                  }}
                  className="px-5 py-2 bg-[#55349A] text-white rounded-xl text-xs font-bold hover:bg-[#43287A] transition-all shadow-md shadow-purple-900/10 cursor-pointer"
                >
                  Confirm Switch
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay Modal during store creation/update */}
        {(createStoreMutation.isPending || updateStoreMutation.isPending) && (
          <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-sm w-full text-center space-y-4 animate-in zoom-in-95 duration-150">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#55349A] border border-purple-100 flex items-center justify-center mx-auto animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-900">
                  {storeToEdit ? 'Saving Store Changes...' : 'Creating Store...'}
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Provisioning store configuration, warehouse inventory catalog, and POS order streams...
                </p>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#55349A] h-full rounded-full w-2/3 animate-pulse" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-[#FAFAFB] relative">
      {toastNotification && (
        <div className={cn(
          "fixed top-5 right-5 z-[99999] px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-200 border text-left",
          toastNotification.type === 'error' ? "bg-rose-900 text-rose-50 border-rose-700" :
          toastNotification.type === 'success' ? "bg-emerald-900 text-emerald-50 border-emerald-700" :
          "bg-slate-900 text-slate-50 border-slate-700"
        )}>
          {toastNotification.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          ) : toastNotification.type === 'success' ? (
            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
          )}
          <span>{toastNotification.message}</span>
        </div>
      )}
      {/* Page Header Bar */}
      <div className="bg-white border-b border-slate-100/80 py-5.5 px-8 flex items-center shrink-0 select-none">
        <button className="flex items-center justify-center text-slate-800 hover:text-slate-950 transition-colors mr-3 cursor-pointer">
          <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <h1 className="text-[21px] font-black text-slate-900 tracking-tight leading-none">Stores</h1>
      </div>

      <div className="p-8 space-y-6">
        {/* clip-fix: no overflow-hidden — it clips the per-row store actions menu (top-full). rounded+border keep corners. */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm">

          {/* Toolbar */}
          <div className="p-6 border-b border-surface-100 flex flex-wrap items-center justify-between gap-4">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full pl-11 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-medium"
              />
            </div>

            <div className="flex items-center gap-3">
              {/* Category Dropdown Filter */}
              <div className="relative">
                <button
                  onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                  className="flex items-center justify-between gap-8 px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold text-surface-700 min-w-[160px] hover:border-surface-300 transition-colors"
                >
                  {selectedType === 'All' ? 'Store Type' : selectedType}
                  <ChevronDown className="h-4 w-4 text-surface-400" />
                </button>
                {typeDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-surface-200 rounded-xl shadow-lg z-20 overflow-hidden">
                    {['All', 'RETAIL', 'PHARMACY', 'RESTAURANT', 'GROCERY', 'BAKERY', 'AYURVEDA', 'WAREHOUSE', 'CAFE', 'KITCHEN', 'CINEMA', 'DISTRIBUTOR', 'OTHER'].map((typeOption) => (
                      <button
                        key={typeOption}
                        onClick={() => {
                          setSelectedType(typeOption);
                          setTypeDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 hover:text-primary-700 transition-colors font-medium"
                      >
                        {typeOption === 'All' ? 'All Types' : typeOption}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Dropdown Filter (server-side) */}
              <div className="relative">
                <button
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className="flex items-center justify-between gap-8 px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold text-surface-700 min-w-[150px] hover:border-surface-300 transition-colors"
                >
                  {selectedStatus === 'All' ? 'Status' : selectedStatus.charAt(0) + selectedStatus.slice(1).toLowerCase()}
                  <ChevronDown className="h-4 w-4 text-surface-400" />
                </button>
                {statusDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-surface-200 rounded-xl shadow-lg z-20 overflow-hidden">
                    {['All', 'ACTIVE', 'DRAFT', 'ARCHIVED'].map((statusOption) => (
                      <button
                        key={statusOption}
                        onClick={() => {
                          setSelectedStatus(statusOption);
                          setStatusDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 hover:text-primary-700 transition-colors font-medium"
                      >
                        {statusOption === 'All' ? 'All Statuses' : statusOption.charAt(0) + statusOption.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Location Dropdown Filter (server-side, base-crm locations) */}
              <div className="relative">
                <button
                  onClick={() => setLocationFilterOpen(!locationFilterOpen)}
                  className="flex items-center justify-between gap-6 px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold text-surface-700 min-w-[160px] hover:border-surface-300 transition-colors"
                >
                  <span className="flex items-center gap-2 truncate">
                    <MapPin className="h-4 w-4 text-surface-400 shrink-0" />
                    <span className="truncate">
                      {selectedLocationUid === 'All'
                        ? 'Location'
                        : (locationNameByUid.get(selectedLocationUid) || 'Location')}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-surface-400 shrink-0" />
                </button>
                {locationFilterOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-surface-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-72 overflow-y-auto">
                    <button
                      onClick={() => { setSelectedLocationUid('All'); setLocationFilterOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 hover:text-primary-700 transition-colors font-medium"
                    >
                      All Locations
                    </button>
                    {locations.length === 0 && (
                      <div className="px-4 py-2 text-sm text-surface-400 font-medium">
                        {locationsLoading ? 'Loading…' : 'No locations found'}
                      </div>
                    )}
                    {locations.map((loc) => (
                      <button
                        key={loc.uid}
                        onClick={() => { setSelectedLocationUid(loc.uid); setLocationFilterOpen(false); }}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 hover:text-primary-700 transition-colors font-medium",
                          loc.uid === selectedLocationUid && "bg-purple-50 text-[#55349A]"
                        )}
                      >
                        <span className="truncate">{loc.name}</span>
                        {loc.isBase && <span className="text-[10px] font-bold uppercase tracking-wider text-[#55349A] bg-purple-50 px-1.5 py-0.5 rounded shrink-0">Base</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bulk Actions (Delete) */}
              {selectedStoreIds.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-2 px-4 py-2.5 border border-red-200 bg-red-50 rounded-xl text-sm font-bold text-red-600 hover:bg-red-100 transition-colors shadow-sm"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete ({selectedStoreIds.length})
                </button>
              )}

              {/* Create Store Button */}
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#55349A] border border-[#55349A] rounded-xl text-sm font-bold text-white hover:bg-[#452a7d] transition-colors shadow-lg shadow-primary-500/10 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Create Store
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-left text-sm min-w-[800px]">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200 select-none">
                  <th className="py-5 px-6 w-12 text-center">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={filteredStores.length > 0 && selectedStoreIds.length === filteredStores.length}
                        onChange={toggleAll}
                        className="appearance-none h-5 w-5 rounded-[4px] border border-surface-300 bg-white checked:bg-[#55349A] checked:border-[#55349A] checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-primary-500/20 outline-none"
                      />
                    </div>
                  </th>
                  <th className="py-5 px-6 font-semibold text-surface-500 tracking-wider text-[11px] uppercase">Store Name</th>
                  <th className="py-5 px-6 font-semibold text-surface-500 tracking-wider text-[11px] uppercase">Location</th>
                  <th className="py-5 px-6 font-semibold text-surface-500 tracking-wider text-[11px] uppercase">Store Type</th>
                  <th className="py-5 px-6 font-semibold text-surface-500 tracking-wider text-[11px] uppercase">Status ↓</th>
                  <th className="py-5 px-6 font-semibold text-surface-500 tracking-wider text-[11px] uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {pagedStores.map((store) => (
                  <tr key={store.id} className="hover:bg-surface-50/30 transition-colors group">
                    <td className="py-5 px-6">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedStoreIds.includes(store.id)}
                          onChange={() => toggleStore(store.id)}
                          className="appearance-none h-5 w-5 rounded-[4px] border border-surface-300 bg-white checked:bg-[#55349A] checked:border-[#55349A] checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-primary-500/20 outline-none"
                        />
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3.5 cursor-pointer group/item" onClick={() => { setNewlyCreatedStore(store); setShowCreatedPage(true); }}>
                        <div className="h-10 w-10 bg-orange-50 rounded-xl flex items-center justify-center text-[#E1523D] border border-orange-100 shrink-0 shadow-sm group-hover/item:scale-105 transition-transform">
                          <Store className="h-[21px] w-[21px] text-[#E1523D]" />
                        </div>
                        <div>
                          <div className="font-bold text-surface-900 leading-tight block text-sm group-hover/item:text-[#55349A] transition-colors">{store.name}</div>
                          <div className="text-xs text-surface-400 font-mono mt-0.5">{store.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-surface-700 font-semibold text-sm">
                      {store.location || <span className="text-surface-300 font-medium">—</span>}
                    </td>
                    <td className="py-5 px-6 text-surface-800 font-bold text-xs font-sans">
                      {store.type}
                    </td>
                    <td className="py-5 px-6">
                      <span className={cn(
                        "inline-flex items-center justify-center gap-1.5 rounded-md text-[12px] select-none normal-case font-black tracking-wider h-[26px] w-[90px] shrink-0",
                        getStatusStyles(store.status)
                      )}>
                        <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", getStatusDot(store.status))} />
                        {store.status}
                      </span>
                    </td>
                    <td className="py-5 px-6 select-none">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(store)}
                          className="flex items-center gap-2 px-4 py-1.5 border border-surface-200 rounded-lg text-sm font-bold text-[#55349A] hover:bg-violet-50 hover:border-[#55349A] transition-all shadow-sm cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveStoreDropdownId(activeStoreDropdownId === store.id ? null : store.id);
                            }}
                            className="p-1.5 border border-surface-200 rounded-lg lg:hover:bg-surface-50 text-surface-400 hover:text-surface-900 transition-all cursor-pointer"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {activeStoreDropdownId === store.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setActiveStoreDropdownId(null); }} />
                              <div className="absolute right-0 top-full mt-2 w-[210px] bg-white border border-slate-200 shadow-xl rounded-xl z-40 py-1.5 overflow-hidden text-left animate-in fade-in slide-in-from-top-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNewlyCreatedStore(store);
                                    setShowCreatedPage(true);
                                    setActiveStoreDropdownId(null);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2.5 cursor-pointer"
                                >
                                  <Store className="w-4 h-4 text-slate-450" />
                                  <span>View Details</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(store);
                                    setActiveStoreDropdownId(null);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2.5 cursor-pointer"
                                >
                                  <Edit2 className="w-4 h-4 text-slate-450" />
                                  <span>Edit Store</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const duplicated: StoreItem = {
                                      id: String(stores.length + 1 + Math.floor(Math.random() * 1000)),
                                      name: `${store.name} (Copy)`,
                                      code: `#STR${Math.floor(10000 + Math.random() * 90000)}`,
                                      locationUid: store.locationUid,
                                      location: store.location,
                                      type: store.type,
                                      status: store.status,
                                      contact: store.contact,
                                      staff: store.staff
                                    };
                                    setStores(prev => [...prev, duplicated]);
                                    setActiveStoreDropdownId(null);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2.5 cursor-pointer"
                                >
                                  <Copy className="w-4 h-4 text-slate-450" />
                                  <span>Duplicate</span>
                                </button>

                                <div className="border-t border-slate-100 my-1" />

                                <div className="px-4 py-1 text-[10px] uppercase font-black tracking-wider text-slate-400 select-none">
                                  Change Status
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStores(prev => prev.map(s => s.id === store.id ? { ...s, status: 'Active' } : s));
                                    setActiveStoreDropdownId(null);
                                  }}
                                  className="w-full text-left px-6 py-2 text-xs font-bold text-[#137333] hover:bg-emerald-50/50 transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#137333]" />
                                  <span>Set Active</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStores(prev => prev.map(s => s.id === store.id ? { ...s, status: 'Draft' } : s));
                                    setActiveStoreDropdownId(null);
                                  }}
                                  className="w-full text-left px-6 py-2 text-xs font-bold text-[#1A73E8] hover:bg-blue-50/50 transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#1A73E8]" />
                                  <span>Set Draft</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStores(prev => prev.map(s => s.id === store.id ? { ...s, status: 'Archived' } : s));
                                    setActiveStoreDropdownId(null);
                                  }}
                                  className="w-full text-left px-6 py-2 text-xs font-bold text-[#C5221F] hover:bg-rose-50/50 transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#C5221F]" />
                                  <span>Set Archived</span>
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

          {/* Footer Pagination */}
          <TablePagination
            total={filteredStores.length}
            page={storePage}
            pageSize={STORE_PAGE_SIZE}
            onPageChange={setStorePage}
            noun="stores"
          />

        </div>
      </div>
    </div>
  );
};
