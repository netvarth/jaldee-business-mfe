import React, { useState, useMemo } from 'react';
import {
  ArrowLeft, Search, ChevronDown, ChevronUp, Pencil,
  MoreHorizontal, Plus, Store as StoreIcon, Trash2,
  Settings, Check, X, ShieldAlert, DollarSign, Tag, Info,
  Printer, QrCode, Wand2, Barcode as BarcodeIcon
} from 'lucide-react';
import { useBarcodeLabels, useGenerateCatalogItemBarcodes } from '../../../services/useBarcodes';
import { useItems } from '../../../services/useItems';
import { cn } from '../lib/utils';
import { useOrderCatalogItems } from '../../../services/useOrderCatalogItems';
import { useInventoryCatalogs } from '../../../services/useInventoryCatalogs';
import { useUnits } from '../../../services/useUnits';
import { useUpdateOrderCatalogItem } from '../../../services/useOrderCatalogItems';

const ShirtThumb = ({ src, alt = "Product Thumbnail", className }: { src?: string; alt?: string; className?: string }) => {
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


interface CatalogItemUnit {
  unitUid: string;
  unitName: string;
  sellingPrice: number;
  mrp: number;
  defaultUnit: boolean;
}

interface CatalogItem {
  id: string;
  itemUid?: string;
  inventoryCatalogItemUid?: string;
  name: string;
  batch: string;
  barcode?: string;
  sellingPrice: number;
  mrp: number;
  costPrice: number;
  stock: number;
  tags: string;
  image: string;
  /** Every selling unit this item is priced in, for this catalog. */
  units: CatalogItemUnit[];
}

interface InventoryCatalogData {
  id: string;
  name: string;
  isExpanded: boolean;
  items: CatalogItem[];
}

interface OrderCatalogDetailsViewProps {
  catalog: {
    id: string;
    name: string;
    store: string;
    status: 'Active' | 'Draft' | 'Archived';
    currency?: string;
    walkInPos?: 'Yes' | 'No';
    storePickup?: 'Yes' | 'No';
    homeDelivery?: 'Yes' | 'No';
    inventoryManagement?: boolean;
    selectedInvCatalogs?: string[];
    description?: string;
  };
  onBack: () => void;
  onEdit: () => void;
  onUpdateStatus?: (newStatus: 'Active' | 'Draft' | 'Archived') => void;
}

export const OrderCatalogDetailsView = ({
  catalog,
  onBack,
  onEdit,
  onUpdateStatus
}: OrderCatalogDetailsViewProps) => {
  // Store active currency state
  const currencySymbol = catalog.currency?.includes('USD') ? '$' : catalog.currency?.includes('EUR') ? '€' : '₹';

  // Local state for tracking inventory catalog accordions and their items.
  // Seeded from the API below; kept as state so expand/collapse and inline edits stay local.
  const [invCatalogs, setInvCatalogs] = useState<InventoryCatalogData[]>([]);

  // The catalog's offerings and their per-selling-unit prices. Before order_catalog_item_tbl
  // existed this view had no data source at all and rendered a permanently empty list.
  const { data: catalogItems, isLoading: itemsLoading, isError: itemsError } = useOrderCatalogItems(catalog.id);
  const { data: inventoryCatalogs } = useInventoryCatalogs();
  const { data: allUnits } = useUnits();
  const { data: masterItems = [] } = useItems();
  const updateCatalogItemMutation = useUpdateOrderCatalogItem();
  const barcodeLabels = useBarcodeLabels();
  const generateBarcodes = useGenerateCatalogItemBarcodes();
  const [printingLabelId, setPrintingLabelId] = useState<string | null>(null);

  React.useEffect(() => {
    if (!catalogItems) return;
    const invName = (uid: string) =>
      (inventoryCatalogs || []).find((c: any) => (c.id || c.uid) === uid)?.name || 'Unassigned stock';

    // Group by source warehouse — one order catalog can span several inventory catalogs, and the
    // per-item binding is what says which stock row each offering draws from.
    const groups = new Map<string, CatalogItem[]>();
    for (const it of catalogItems as any[]) {
      const key = it.inventoryCatalogUid || 'unassigned';
      // Price shown is the catalog's default selling unit; the rest are in `units`.
      const def = (it.units || []).find((u: any) => u.defaultUnit) || (it.units || [])[0];
      const unitName = (uid: string) =>
        (allUnits || []).find((u: any) => (u.uid || u.id) === uid)?.name || 'Unit';
      const masterMatch: any = (masterItems || []).find((m: any) => (m.uid || m.id) === it.itemUid) || {};
      const resolvedBarcode = it.barcode || it.barCode || it.itemBarcode || masterMatch.barcode || masterMatch.barCode || '';
      const row: CatalogItem = {
        units: (it.units || []).map((u: any) => ({
          unitUid: u.unitUid,
          unitName: unitName(u.unitUid),
          sellingPrice: Number(u.sellingPrice ?? 0),
          mrp: Number(u.mrp ?? 0),
          defaultUnit: !!u.defaultUnit,
        })),
        id: it.uid,
        itemUid: it.itemUid,
        inventoryCatalogItemUid: it.inventoryCatalogItemUid || it.inventoryItemUid || it.uid,
        name: it.itemName || it.itemCode || 'Unnamed item',
        batch: it.itemCode || '',
        barcode: resolvedBarcode,
        sellingPrice: Number(def?.sellingPrice ?? 0),
        mrp: Number(def?.mrp ?? 0),
        costPrice: 0,
        // -1 marks "no stock row" so the badge can say NOT STOCKED rather than OUT OF STOCK.
        stock: it.inHand == null ? -1 : Number(it.inHand),
        tags: (it.units || []).map((u: any) => unitName(u.unitUid)).join(' · '),
        image: '',
      };
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    setInvCatalogs([...groups.entries()].map(([id, items]) => ({
      id,
      name: id === 'unassigned' ? 'Unassigned stock' : invName(id),
      isExpanded: true,
      items,
    })));
  }, [catalogItems, inventoryCatalogs, allUnits]);

  // UI state managers
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatalogFilter, setSelectedCatalogFilter] = useState<string>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [activeItemDotMenuId, setActiveItemDotMenuId] = useState<string | null>(null);

  // Editing state
  const [editingItem, setEditingItem] = useState<{
    catalogId: string;
    item: CatalogItem;
  } | null>(null);

  // New item creation form states
  const [targetCatalogId, setTargetCatalogId] = useState<string>('');
  const [newitemName, setNewitemName] = useState('');
  const [newitemTags, setNewitemTags] = useState('');
  const [newitemBatch, setNewitemBatch] = useState('');
  const [newitemSellingPrice, setNewitemSellingPrice] = useState('');
  const [newitemMrp, setNewitemMrp] = useState('');
  const [newitemCostPrice, setNewitemCostPrice] = useState('');
  const [newitemStock, setNewitemStock] = useState('');

  // Toggle single accordion open/closed
  const toggleAccordion = (id: string) => {
    setInvCatalogs(prev => prev.map(c =>
      c.id === id ? { ...c, isExpanded: !c.isExpanded } : c
    ));
  };

  // Filter and search computation
  const filteredAndSearchedCatalogs = useMemo(() => {
    return invCatalogs.map(catalog => {
      // Check if catalog itself fits the catalog drop-down filter
      const matchesFilter = selectedCatalogFilter === 'all' || selectedCatalogFilter === catalog.id;
      if (!matchesFilter) {
        return { ...catalog, items: [], matchesCatalogFilter: false };
      }

      // Filter its containing items by the search string
      const matchedItems = catalog.items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.batch.toLowerCase().includes(searchQuery.toLowerCase())
      );

      return {
        ...catalog,
        items: matchedItems,
        matchesCatalogFilter: true
      };
    });
  }, [invCatalogs, searchQuery, selectedCatalogFilter]);

  // Open Edit Price modal
  const handleOpenEditPrice = (catalogId: string, item: CatalogItem) => {
    setEditingItem({ catalogId, item });
    setIsEditModalOpen(true);
  };

  // Save changes to item price / parameters.
  // Persists to order_catalog_item_unit_tbl — sending `units` replaces the price list for this
  // offering. Previously this only mutated local state, so edits vanished on navigation.
  const handleSaveItemChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      await updateCatalogItemMutation.mutateAsync({
        uid: editingItem.item.id,
        itemData: {
          units: editingItem.item.units.map(u => ({
            unitUid: u.unitUid,
            sellingPrice: u.sellingPrice,
            mrp: u.mrp,
            defaultUnit: u.defaultUnit,
            active: true,
          })),
        },
      });

      setInvCatalogs(prev => prev.map(cat => {
        if (cat.id === editingItem.catalogId) {
          return {
            ...cat,
            items: cat.items.map(it => it.id === editingItem.item.id ? editingItem.item : it)
          };
        }
        return cat;
      }));

      setIsEditModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      alert(`Could not save prices: ${err?.message || 'unknown error'}`);
    }
  };

  // Open modal/form to add a new item
  const handleOpenAddItem = (catalogId: string) => {
    setTargetCatalogId(catalogId);
    setNewitemName('');
    setNewitemTags('');
    setNewitemBatch('');
    setNewitemSellingPrice('');
    setNewitemMrp('');
    setNewitemCostPrice('');
    setNewitemStock('');
    setIsAddItemModalOpen(true);
  };

  // Dispatch item addition
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newitemName.trim()) return;

    const added: CatalogItem = {
      // This local "Add Item" form is still unpersisted — it predates order_catalog_item_tbl and
      // only ever wrote to component state. Items reach a catalog from the Items/Products screen,
      // which does persist. No units here, so nothing to price.
      units: [],
      id: String(Date.now() + Math.random()),
      name: newitemName.trim(),
      tags: newitemTags.trim(),
      batch: newitemBatch.trim(),
      sellingPrice: parseFloat(newitemSellingPrice) || 0.0,
      mrp: parseFloat(newitemMrp) || 0.0,
      costPrice: parseFloat(newitemCostPrice) || 0.0,
      stock: parseInt(newitemStock, 10) || 0,
      image: '/shirt_thumbnail'
    };

    setInvCatalogs(prev => prev.map(cat => {
      if (cat.id === targetCatalogId) {
        return {
          ...cat,
          isExpanded: true, // Make sure it auto-expands so user can see it
          items: [...cat.items, added]
        };
      }
      return cat;
    }));

    setIsAddItemModalOpen(false);
  };

  // Handle single item deletion
  const handleDeleteItem = (catalogId: string, itemId: string) => {
    if (confirm('Are you sure you want to remove this item from the catalog?')) {
      setInvCatalogs(prev => prev.map(cat => {
        if (cat.id === catalogId) {
          return {
            ...cat,
            items: cat.items.filter(it => it.id !== itemId)
          };
        }
        return cat;
      }));
    }
    setActiveItemDotMenuId(null);
  };

  // Nested helper ShirtThumb deleted in favor of root component definition.

  return (
    <div className="flex flex-col flex-1 h-full bg-[#F5F6F8]">

      {/* Header Panel */}
      <div className="bg-white border-b border-[#EAEBF0] py-4 px-8 flex items-center gap-4 shrink-0 transition-all">
        <button
          id="btn-back-catalog-details"
          onClick={onBack}
          className="p-1.5 hover:bg-slate-50 border border-[#EAEBF0] rounded-lg transition-colors cursor-pointer text-slate-700"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <span className="text-base font-black text-slate-900 tracking-tight font-sans">
          Order Catalog Details
        </span>
      </div>

      {/* Main Responsive Area */}
      <div className="flex-1 p-8 space-y-6 overflow-y-auto pb-24">

        {/* Core Info Summary Board */}
        <div id="catalog-summary-board" className="bg-white rounded-2xl border border-[#EAEBF0] p-6 shadow-xs space-y-6">

          {/* Top segment: Title, ID, Badges and Actions buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-left space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-none text-[#55349A]">
                  {catalog.name}
                </h2>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border",
                  catalog.status === 'Active' && "bg-[#EAFDF4] text-emerald-700 border-[#C5F4DE]",
                  catalog.status === 'Draft' && "bg-[#E6EEF9] text-[#4267B2] border-[#C3D5FF]",
                  catalog.status === 'Archived' && "bg-[#FFF2F2] text-rose-700 border-[#FFDFDF]"
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    catalog.status === 'Active' && "bg-emerald-600",
                    catalog.status === 'Draft' && "bg-[#4267B2]",
                    catalog.status === 'Archived' && "bg-rose-600"
                  )} />
                  {catalog.status}
                </span>
              </div>
              <p className="text-xs font-mono font-medium text-slate-400">
                {catalog.id ? `#${catalog.id}` : '-'}
              </p>
            </div>

            {/* Editing and actions */}
            <div className="flex items-center gap-3">
              <button
                id="btn-edit-catalog-view"
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-[#EAEBF0] rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer select-none"
              >
                <Pencil className="h-3.5 w-3.5 text-slate-500" />
                Edit Catalog
              </button>

              <div className="relative">
                <button
                  id="btn-more-actions-view"
                  onClick={() => setIsMoreActionsOpen(!isMoreActionsOpen)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1A1E29] hover:bg-[#2C3140] border border-[#1A1E29] rounded-xl text-xs font-extrabold text-white transition-colors shadow-sm cursor-pointer select-none"
                >
                  More Actions
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isMoreActionsOpen && "rotate-180")} />
                </button>

                {isMoreActionsOpen && (
                  <>
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsMoreActionsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-52 bg-white border border-[#EAEBF0] rounded-xl shadow-xl z-50 py-1.5 text-left animate-in fade-in slide-in-from-top-2 duration-150">

                      <div className="px-3 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pb-1.5 border-b border-slate-50">
                        Status Options
                      </div>

                      {['Active', 'Draft', 'Archived'].map((st) => (
                        <button
                          key={st}
                          onClick={() => {
                            if (onUpdateStatus) onUpdateStatus(st as any);
                            else alert(`Catalog status updated to: ${st}`);
                            setIsMoreActionsOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2 text-xs font-bold flex items-center justify-between hover:bg-slate-50 text-slate-700",
                            catalog.status === st && "text-[#55349A]"
                          )}
                        >
                          {st}
                          {catalog.status === st && <Check className="h-3 w-3 text-[#55349A]" />}
                        </button>
                      ))}

                      <div className="h-px bg-slate-100 my-1.5" />

                      <button
                        onClick={async () => {
                          const allItemUids = (catalogItems || []).map((ci: any) => ci.inventoryCatalogItemUid || ci.inventoryItemUid || ci.uid);
                          if (allItemUids.length === 0) {
                            alert('No items available in this catalog to print.');
                            return;
                          }
                          try {
                            await barcodeLabels.renderAndDownload({
                              catalogItemUids: allItemUids,
                              outputFormat: 'PDF',
                              showPrice: true,
                              showBatchInfo: true,
                            });
                          } catch (err: any) {
                            alert(err?.message || 'Failed to print catalog barcode labels');
                          }
                          setIsMoreActionsOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-purple-50 hover:text-[#55349A] text-slate-700 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="h-3.5 w-3.5 text-[#55349A]" />
                        Print All Barcode Labels (PDF)
                      </button>

                      <button
                        onClick={() => {
                          alert(`Custom sync parameters pushed for #${catalog.id}`);
                          setIsMoreActionsOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Settings className="h-3.5 w-3.5 text-slate-400" />
                        Configure Rules
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Lower segment: Store name & status list precisely matching card bottom */}
          <div className="pt-5 border-t border-[#EAEBF0] flex flex-col xl:flex-row xl:items-center justify-between gap-5 text-left">

            {/* Store brand details */}
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center shrink-0 rounded-xl bg-orange-50 border border-white">
                <svg viewBox="0 0 64 64" className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 28v22a2 2 0 002 2h36a2 2 0 002-2V28" className="stroke-orange-600" />
                  <path d="M8 14h48v14H8z" className="stroke-orange-500 fill-orange-50" />
                  <path d="M16 14v14M24 14v14M32 14v14M40 14v14M48 14v14" className="stroke-orange-400" />
                  <path d="M26 52V38a2 2 0 012-2h8a2 2 0 012 2v14" className="stroke-orange-600 fill-orange-200" />
                  <rect x="42" y="34" width="8" height="8" rx="1" className="stroke-orange-400" />
                  <rect x="14" y="34" width="8" height="8" rx="1" className="stroke-orange-400" />
                </svg>
              </div>
              <div>
                <span className="block font-black text-slate-900 text-sm font-sans tracking-tight">
                  {catalog.store || '-'}
                </span>
                <span className="block text-[11px] font-mono text-slate-400 leading-none mt-1">
                  #1
                </span>
              </div>
            </div>

            {/* Delivery parameters section aligned symmetrically */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-slate-50 border border-[#EAEBF0] rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 flex items-center h-10 select-none mr-1">
                Currency: <span className="font-bold text-slate-800 ml-1.5">{catalog.currency || 'INR (₹)'}</span>
              </div>

              {/* Online Self Order */}
              <div className="bg-[#EEF7F2] border border-[#D1E6DD] rounded-xl px-4 py-2 text-xs font-bold text-[#036A42] flex items-center gap-2 h-10 select-none shadow-3xs">
                <span>Online Self Order</span>
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#036A42] text-white shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              </div>

              {/* Walk-in POS */}
              {catalog.walkInPos !== 'No' ? (
                <div className="bg-[#EEF7F2] border border-[#D1E6DD] rounded-xl px-4 py-2 text-xs font-bold text-[#036A42] flex items-center gap-2 h-10 select-none shadow-3xs">
                  <span>Walk-in POS</span>
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#036A42] text-white shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                </div>
              ) : (
                <div className="bg-slate-50 border border-[#EAEBF0] rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 flex items-center gap-2 h-10 select-none">
                  <span>Walk-in POS</span>
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-400 shrink-0">
                    <X className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                </div>
              )}

              {/* Home Delivery */}
              {catalog.homeDelivery !== 'No' ? (
                <div className="bg-[#EEF7F2] border border-[#D1E6DD] rounded-xl px-4 py-2 text-xs font-bold text-[#036A42] flex items-center gap-2 h-10 select-none shadow-3xs">
                  <span>Home Delivery</span>
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#036A42] text-white shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                </div>
              ) : (
                <div className="bg-slate-50 border border-[#EAEBF0] rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 flex items-center gap-2 h-10 select-none">
                  <span>Home Delivery</span>
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-400 shrink-0">
                    <X className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Catalog Description Box - Matching Image Exactly */}
          {catalog.description && (
            <div className="pt-6 border-t border-[#EAEBF0] text-left space-y-3.5">
              <span className="text-[11px] font-bold text-[#8FA3C7] uppercase tracking-wider block">
                CATALOG DESCRIPTION
              </span>
              <div className="bg-[#F8F9FC] rounded-2xl border border-[#EAEBF0] p-5 text-sm font-semibold text-slate-600 leading-relaxed">
                {catalog.description}
              </div>
            </div>
          )}
        </div>

        {/* Inventory accordion items and tables matching the picture exactly */}
        <div className="bg-white rounded-2xl border border-[#EAEBF0] p-6 shadow-xs space-y-6">

          {/* Header Row for Inventory Section with Search and Filter separated */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5 font-sans leading-none">
                Inventory Catalog
              </h3>
              <p className="text-[11px] font-bold text-slate-400 mt-1.5 leading-none">
                Assigned to this Order Catalog
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Filter selection drop-down */}
              <div className="relative shrink-0">
                <button
                  id="btn-inventory-filter-dropdown"
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className="h-10 px-4 flex items-center justify-between gap-2.5 text-xs font-bold text-slate-700 bg-white border border-[#EAEBF0] rounded-xl cursor-pointer text-left w-full sm:w-48 shadow-2xs hover:bg-slate-50 transition-colors"
                >
                  <span className="truncate">
                    {selectedCatalogFilter === 'all' ? 'Inventory Catalog' :
                      invCatalogs.find(c => c.id === selectedCatalogFilter)?.name || 'Inventory Catalog'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                </button>

                {isFilterDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10 bg-transparent" onClick={() => setIsFilterDropdownOpen(false)} />
                    <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-[#EAEBF0] rounded-xl shadow-xl z-20 py-1.5 animate-in fade-in slide-in-from-top-1 duration-100">
                      <button
                        onClick={() => { setSelectedCatalogFilter('all'); setIsFilterDropdownOpen(false); }}
                        className={cn(
                          "w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 text-slate-700 flex items-center justify-between",
                          selectedCatalogFilter === 'all' && "text-[#55349A]"
                        )}
                      >
                        All Catalogs
                        {selectedCatalogFilter === 'all' && <Check className="h-3.5 w-3.5 text-[#55349A]" />}
                      </button>
                      <div className="h-px bg-slate-100 my-1" />
                      {invCatalogs.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => { setSelectedCatalogFilter(cat.id); setIsFilterDropdownOpen(false); }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 text-slate-700 flex items-center justify-between",
                            selectedCatalogFilter === cat.id && "text-[#55349A]"
                          )}
                        >
                          {cat.name}
                          {selectedCatalogFilter === cat.id && <Check className="h-3.5 w-3.5 text-[#55349A]" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Real Search Input with Magnifying Glass logo (Separated) */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="input-catalog-details-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full pl-10 pr-4 h-10 bg-white border border-[#EAEBF0] rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#55349A] transition-all placeholder:text-slate-400 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Accordion List Container */}
          <div className="space-y-4 text-left">
            {/* Distinguish "still loading", "failed to load" and "genuinely empty" — rendering all
                three as an empty list is how this screen used to look permanently unpopulated. */}
            {itemsLoading && (
              <div className="py-10 text-center text-sm text-surface-400">Loading catalog items…</div>
            )}
            {!itemsLoading && itemsError && (
              <div className="py-10 text-center text-sm text-red-600">
                Catalog items failed to load — the commerce service did not respond.
              </div>
            )}
            {!itemsLoading && !itemsError && invCatalogs.length === 0 && (
              <div className="py-10 text-center text-sm text-surface-400">
                No items in this catalog yet. Items are added with their prices from the
                Items&nbsp;/&nbsp;Products screen.
              </div>
            )}
            {!itemsLoading && !itemsError && filteredAndSearchedCatalogs.map((cat) => {
              // If we filtered out the catalog, skip rendering
              if (!cat.matchesCatalogFilter) return null;

              return (
                <div
                  key={cat.id}
                  id={`accordion-block-${cat.id}`}
                  className="border border-[#EAEBF0] rounded-xl overflow-hidden shadow-2xs"
                >

                  {/* Accordion Section Header */}
                  <div
                    onClick={() => toggleAccordion(cat.id)}
                    className="flex items-center justify-between px-6 py-4 bg-slate-50/40 hover:bg-slate-50/80 cursor-pointer select-none border-b border-[#EAEBF0]"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
                      >
                        {cat.isExpanded ? (
                          <ChevronUp className="h-4 w-4 stroke-[2.5]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 stroke-[2.5]" />
                        )}
                      </button>

                      <span className="font-sans font-bold text-slate-800 text-sm tracking-tight">
                        {cat.name}
                      </span>
                    </div>

                    {/* Add Item Trigger to this specific list */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // Avoid triggering accordion collapse toggle
                        handleOpenAddItem(cat.id);
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-[#55349A] hover:text-[#422180] transition-colors cursor-pointer bg-transparent border-none p-1.5 rounded-lg select-none"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Item
                    </button>
                  </div>

                  {/* Accordion Internal Contents */}
                  {cat.isExpanded && (
                    <div className="bg-white overflow-hidden transition-all duration-300">
                      {cat.items.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                          <p className="text-xs font-semibold">No items match your active parameters.</p>
                          <button
                            onClick={() => handleOpenAddItem(cat.id)}
                            className="mt-3 text-xs font-extrabold text-[#55349A] hover:underline"
                          >
                            Add custom item row +
                          </button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                              <tr className="bg-slate-50/50 border-b border-[#EAEBF0] text-slate-400 font-sans text-[11px] font-extrabold tracking-wider uppercase">
                                <th className="py-3 px-6 h-10">ITEMS</th>
                                <th className="py-3 px-6 h-10">BATCH</th>
                                <th className="py-3 px-6 h-10">SELLING PRICE</th>
                                <th className="py-3 px-6 h-10">MRP</th>
                                <th className="py-3 px-6 h-10">COST PRICE</th>
                                <th className="py-3 px-6 h-10">STOCK</th>
                                <th className="py-3 px-6 h-10 text-right pr-12">ACTIONS</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EAEBF0] text-slate-700">
                              {cat.items.map((item) => (
                                <tr
                                  key={item.id}
                                  className="hover:bg-slate-50/20 transition-colors"
                                >
                                  {/* Item thumbnail and tags */}
                                  <td className="py-4 px-6 min-w-[240px]">
                                    <div className="flex items-center gap-3">
                                      <ShirtThumb src={item.image} alt={item.name} />
                                      <div className="flex flex-col text-left">
                                        <span className="font-extrabold text-slate-900 text-sm leading-tight">
                                          {item.name}
                                        </span>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                          <span className="text-[11px] text-slate-400 font-semibold leading-none">
                                            {item.tags}
                                          </span>
                                          {item.barcode && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] font-bold">
                                              <BarcodeIcon className="h-2.5 w-2.5 text-slate-500" />
                                              {item.barcode}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Batch Parameter */}
                                  <td className="py-4 px-6 font-mono font-bold text-xs text-slate-600">
                                    {item.batch}
                                  </td>

                                  {/* Selling Price */}
                                  <td className="py-4 px-6 font-mono text-sm font-bold text-slate-900">
                                    {currencySymbol} {item.sellingPrice.toFixed(2)}
                                  </td>

                                  {/* MRP */}
                                  <td className="py-4 px-6 font-mono text-sm font-semibold text-slate-450 text-slate-400">
                                    {currencySymbol} {item.mrp.toFixed(2)}
                                  </td>

                                  {/* Cost Price */}
                                  <td className="py-4 px-6 font-mono text-sm font-semibold text-slate-500">
                                    {currencySymbol} {item.costPrice.toFixed(2)}
                                  </td>

                                  {/* Stock Count */}
                                  <td className="py-4 px-6">
                                    {item.stock < 0 ? (
                                      /* No stock row behind this offering — unknown, which is
                                         not the same as zero. Never render it as out of stock. */
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-surface-50 text-surface-400 border border-surface-200 font-sans tracking-wide">
                                        NOT STOCKED
                                      </span>
                                    ) : item.stock === 0 ? (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-red-50 text-red-650 border border-red-200/60 font-sans tracking-wide">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                        OUT OF STOCK
                                      </span>
                                    ) : item.stock <= 25 ? (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-[#FFF9E6] text-[#D97706] border border-[#FDE68A] font-sans tracking-wide">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                                        LOW STOCK ({item.stock})
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-[#E6F4EA] text-[#0F623F] border border-[#A7F3D0] font-sans tracking-wide">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#0F623F]" />
                                        IN STOCK ({item.stock})
                                      </span>
                                    )}
                                  </td>

                                  {/* Edit button & action menu */}
                                  <td className="py-4 px-6 text-right pr-6 relative">
                                    <div className="flex items-center justify-end gap-2.5">
                                      {/* Primary responsive purple click action */}
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditPrice(cat.id, item)}
                                        className="h-8.5 px-4 bg-white border border-[#E2E6ED] hover:border-[#55349A] hover:bg-violet-50/20 text-[#55349A] rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap select-none inline-flex items-center justify-center shadow-2xs"
                                      >
                                        Edit Item Price
                                      </button>

                                      {/* Secondary actions dropdown trigger */}
                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveItemDotMenuId(activeItemDotMenuId === item.id ? null : item.id);
                                          }}
                                          className="p-1.5 border border-[#EAEBF0] hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-800 transition-colors cursor-pointer select-none bg-white flex items-center justify-center shadow-2xs"
                                        >
                                          <MoreHorizontal className="h-4 w-4" />
                                        </button>

                                        {activeItemDotMenuId === item.id && (
                                          <>
                                            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActiveItemDotMenuId(null)} />
                                            <div className="absolute right-0 mt-1.5 w-40 bg-white border border-[#EAEBF0] rounded-xl shadow-xl z-50 py-1 text-left animate-in fade-in slide-in-from-top-1 duration-100">

                                              <button
                                                onClick={() => {
                                                  const dStockStr = prompt("Add inventory quantity modifier (e.g. +10, -5):");
                                                  if (dStockStr) {
                                                    const delta = parseInt(dStockStr, 10);
                                                    if (!isNaN(delta)) {
                                                      setInvCatalogs(prev => prev.map(c => {
                                                        if (c.id === cat.id) {
                                                          return {
                                                            ...c,
                                                            items: c.items.map(it => it.id === item.id ? { ...it, stock: Math.max(0, it.stock + delta) } : it)
                                                          };
                                                        }
                                                        return c;
                                                      }));
                                                    }
                                                  }
                                                  setActiveItemDotMenuId(null);
                                                }}
                                                className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                              >
                                                Adjust Stock
                                              </button>

                                              <div className="h-px bg-slate-100 my-1" />

                                              <button
                                                onClick={() => handleDeleteItem(cat.id, item.id)}
                                                className="w-full text-left px-4 py-2 text-xs font-bold text-rose-605 text-rose-600 hover:bg-rose-50 transition-colors"
                                              >
                                                Remove Item
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
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Edit Item Price Modal Dialog Backdrop */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 transition-opacity">
          <div className="bg-white rounded-3xl border border-[#EAEBF0] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-[#EAEBF0]">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Edit Item pricing
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveItemChanges} className="p-6 space-y-4 text-left">
              <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-[#EAEBF0] mb-2">
                <ShirtThumb src={editingItem.item.image} alt={editingItem.item.name} />
                <div className="flex flex-col text-left">
                  <span className="font-extrabold text-slate-950 text-xs uppercase leading-none">
                    {editingItem.item.name}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold mt-1">
                    {editingItem.item.tags}
                  </span>
                </div>
              </div>

              {/* Selling price field */}
              {/* Per-selling-unit prices. Price is per catalog PER UNIT — a Box is priced
                  independently of a Piece — so the editor lists every unit rather than a
                  single figure. Saving replaces the whole price list for this offering. */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">
                  Prices by selling unit ({currencySymbol})
                </label>

                {editingItem.item.units.length === 0 && (
                  <p className="text-xs text-slate-400 py-2">
                    This item has no selling units configured, so there is nothing to price here.
                    Add units on the item first.
                  </p>
                )}

                <div className="space-y-2.5">
                  {editingItem.item.units.map((u, idx) => (
                    <div key={u.unitUid} className="flex items-end gap-2.5">
                      <div className="w-28 shrink-0">
                        <span className="block text-xs font-bold text-slate-700 truncate" title={u.unitName}>
                          {u.unitName}
                        </span>
                        {u.defaultUnit && (
                          <span className="text-[10px] font-extrabold text-[#55349A] uppercase tracking-wide">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Selling
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={u.sellingPrice}
                          onChange={(e) => {
                            const units = [...editingItem.item.units];
                            units[idx] = { ...u, sellingPrice: parseFloat(e.target.value) || 0 };
                            setEditingItem({ ...editingItem, item: { ...editingItem.item, units } });
                          }}
                          className="w-full px-3 py-2 bg-white border border-[#EAEBF0] rounded-lg text-sm font-bold focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          MRP
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={u.mrp}
                          onChange={(e) => {
                            const units = [...editingItem.item.units];
                            units[idx] = { ...u, mrp: parseFloat(e.target.value) || 0 };
                            setEditingItem({ ...editingItem, item: { ...editingItem.item, units } });
                          }}
                          className="w-full px-3 py-2 bg-white border border-[#EAEBF0] rounded-lg text-sm font-bold focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 flex items-center justify-end gap-3.5 border-t border-slate-50 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#55349A] text-white rounded-lg text-xs font-black hover:bg-[#432380] transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Item Modal Dialog backdrop */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 transition-opacity">
          <div className="bg-white rounded-3xl border border-[#EAEBF0] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-b border-[#EAEBF0]">
              <h3 className="text-sm font-black text-slate-850 uppercase tracking-wider text-slate-800">
                + Add Custom Item
              </h3>
              <button
                onClick={() => setIsAddItemModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddItem} className="p-6 space-y-4 text-left">

              {/* Item Name */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  value={newitemName}
                  onChange={(e) => setNewitemName(e.target.value)}
                  placeholder="Item name"
                  className="w-full px-4 py-2.5 bg-white border border-[#EAEBF0] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none"
                />
              </div>

              {/* Attributes / Options */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                  Attributes / Sizing / Gender
                </label>
                <input
                  type="text"
                  value={newitemTags}
                  onChange={(e) => setNewitemTags(e.target.value)}
                  placeholder="Attributes"
                  className="w-full px-4 py-2.5 bg-white border border-[#EAEBF0] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none"
                />
              </div>

              {/* Batch option */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                  Batch Code
                </label>
                <input
                  type="text"
                  value={newitemBatch}
                  onChange={(e) => setNewitemBatch(e.target.value)}
                  placeholder="Batch code"
                  className="w-full px-4 py-2.5 bg-white border border-[#EAEBF0] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Selling Price */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                    Selling Price ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newitemSellingPrice}
                    onChange={(e) => setNewitemSellingPrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#EAEBF0] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none font-mono"
                  />
                </div>

                {/* MRP */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                    MRP ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newitemMrp}
                    onChange={(e) => setNewitemMrp(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#EAEBF0] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Cost price */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                    Cost Price ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newitemCostPrice}
                    onChange={(e) => setNewitemCostPrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#EAEBF0] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none font-mono"
                  />
                </div>

                {/* Stock code */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    value={newitemStock}
                    onChange={(e) => setNewitemStock(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#EAEBF0] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none font-mono"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 flex items-center justify-end gap-3.5 border-t border-slate-50 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#55349A] text-white rounded-lg text-xs font-black hover:bg-[#432380] transition-colors"
                >
                  Add to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
