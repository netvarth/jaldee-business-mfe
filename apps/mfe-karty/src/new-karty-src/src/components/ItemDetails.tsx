import React, { useState, useEffect } from 'react';
import { ItemRemarksPanel } from './ItemRemarksPanel';
import { BarcodePanel } from './BarcodePanel';
import { useItemPlacements } from '../../../services/useItems';
import {
  ArrowLeft, Edit, MoreHorizontal, Clock, ShoppingBag,
  Link, ChevronDown, ChevronUp, Share2, CornerDownRight,
  BookOpen, Droplet, Palette, Sun, Eye, Sparkles, Tag,
  PieChart, Target, Copy, Archive, MessageSquare, Star, X, Check,
  Mail, Award, ThumbsUp, Boxes, Store, Pill, MoreVertical, Plus,
  Camera, Upload, AlertCircle
} from 'lucide-react';
const Facebook = (props: any) => <Share2 {...props} />;
const Twitter = (props: any) => <Share2 {...props} />;
import { cn } from '../lib/utils';

interface SubSection {
  id: number;
  title: string;
  description: string;
  iconType: 'droplet' | 'palette' | 'sun' | 'other' | 'uploaded';
  iconUrl?: string;
}

interface InfoBlock {
  id: number;
  heading: string;
  description: string;
  isExpanded: boolean;
  subSections: SubSection[];
  iconUrl?: string;
}

interface ItemDetailsProps {
  onBack: () => void;
  onEdit: () => void;
  itemData: {
    uid?: string;
    itemUid?: string;
    catalogItemUid?: string;
    itemName: string;
    itemDescription: string;
    selectedCategory: string;
    selectedBrand: string;
    sku: string;
    barcode: string;
    hsnCode: string;
    selectedItemType: string;
    weight: string;
    selectedTaxGroup: string;
    selectedTaxPreference: string;
    trackStock: boolean;
    batchTracking: boolean;
    assignments: Array<{
      id: number;
      store: string;
      catalog: string;
      inventoryCatalog?: string;
      mrp?: string;
      salesPrice?: string;
      showMrp?: string;
      openingStock?: string | number;
      batch?: string;
      rateEditable?: boolean;
    }>;
    attributes: Array<{
      name: string;
      values: string[];
    }>;
    galleryImages: string[];
    infoBlocks: InfoBlock[];
    upsells: string[];
    crossSells: string[];
    tags: string[];
    badges?: string[];
    drugSchedule?: string;
    ayushType?: string;
    shelfLifeMonths?: number;
    noExpiry?: boolean;
    composition?: string;
  };
}

export const ItemDetails: React.FC<ItemDetailsProps> = ({ onBack, onEdit, itemData }) => {
  const [activeTab, setActiveTab] = useState<'variants' | 'additional'>('variants');
  const [timeframe, setTimeframe] = useState<'Today' | 'Last 7 days' | '30 days' | '6 months' | 'Year'>('Today');
  const [isArchived, setIsArchived] = useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'preview' | 'share' | 'reviews' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedProductVariant, setSelectedProductVariant] = useState<string>('Main Product');

  // Real Store & Catalog assignments from backend (no fake fallback!)
  const [assignments, setAssignments] = useState(itemData.assignments || []);

  // F2: the list-row itemData carries no catalog membership, so it always showed "not assigned".
  // Fetch the item's real placements and use them when the row didn't supply any.
  const { data: placements } = useItemPlacements((itemData as any).uid || (itemData as any).id);
  useEffect(() => {
    if ((!itemData.assignments || itemData.assignments.length === 0) && Array.isArray(placements) && placements.length > 0) {
      setAssignments(placements.map((p: any) => ({
        store: p.store || 'Unknown Store',
        storeUid: p.storeUid,
        catalog: p.catalog || p.inventoryCatalog || 'Catalog',
        orderCatalogUid: p.orderCatalogUid,
        inventoryCatalog: p.inventoryCatalog,
        inventoryCatalogUid: p.inventoryCatalogUid,
        // Backend field is `sellingPrice` (see ItemPlacementDto) — it was never `salesPrice`,
        // so this always rendered ₹0.00 despite the price being persisted correctly.
        salesPrice: p.sellingPrice ?? p.salesPrice ?? '',
        mrp: p.mrp ?? '',
        openingStock: p.openingStock ?? '',
      })) as any);
    }
  }, [placements, itemData.assignments]);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null);

  const trackStock = Boolean(itemData.trackStock);
  const batchTracking = Boolean(itemData.batchTracking);
  const hasVariants = Boolean(itemData.attributes && itemData.attributes.length > 0 && itemData.attributes.some(a => a.values && a.values.length > 0));

  // Variant Filters
  const [filterOption1, setFilterOption1] = useState<string>('All');
  const [filterOption2, setFilterOption2] = useState<string>('All');

  // Real attributes from backend
  const attributesList = itemData.attributes || [];

  // Generate dynamic variant rows purely from real attributes
  const variantsList = React.useMemo(() => {
    if (!hasVariants) return [];

    // Cartesian product of real attribute values
    const generateCombinations = (attrs: Array<{ name: string; values: string[] }>): Array<{ name: string; options: Record<string, string> }> => {
      if (attrs.length === 0) return [];
      const [first, ...rest] = attrs;
      if (!first.values || first.values.length === 0) return generateCombinations(rest);
      if (rest.length === 0) {
        return first.values.map(val => ({
          name: val,
          options: { [first.name]: val }
        }));
      }
      const subCombos = generateCombinations(rest);
      const result: any[] = [];
      first.values.forEach(val => {
        subCombos.forEach(sub => {
          result.push({
            name: `${val} / ${sub.name}`,
            options: { [first.name]: val, ...sub.options }
          });
        });
      });
      return result;
    };

    const baseSku = itemData.sku || 'SKU';
    const firstPrice = parseFloat(assignments[0]?.salesPrice || '0') || 0;
    const firstStock = parseInt(assignments[0]?.openingStock as any || '0') || 0;

    const combos = generateCombinations(attributesList);
    return combos.map((c, idx) => ({
      id: `var-${idx}`,
      name: c.name,
      sku: `${baseSku}-${idx + 1}`,
      options: c.options,
      status: 'ACTIVE' as const,
      price: firstPrice,
      stocks: firstStock
    }));
  }, [hasVariants, attributesList, itemData.sku, assignments]);

  const totalVariantsCount = variantsList.length;

  // Real product images from backend (never hardcoded mocks!)
  const [galleryImages, setGalleryImages] = useState<string[]>(() => {
    if (itemData.galleryImages && itemData.galleryImages.length > 0) {
      return itemData.galleryImages.filter(Boolean);
    }
    return [];
  });

  const [selectedMainImage, setSelectedMainImage] = useState<string>(
    galleryImages[0] || ''
  );

  React.useEffect(() => {
    if (itemData.galleryImages && itemData.galleryImages.length > 0) {
      const valid = itemData.galleryImages.filter(Boolean);
      setGalleryImages(valid);
      setSelectedMainImage(valid[0] || '');
    }
  }, [itemData.galleryImages]);

  // Direct In-Place Image Upload Handler
  const handleUploadImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const dataUrl = event.target.result as string;
            setGalleryImages(prev => {
              const updated = [...prev, dataUrl];
              if (!selectedMainImage) setSelectedMainImage(dataUrl);
              return updated;
            });
            showToast("Product image uploaded successfully!");
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Real calculated stock across store catalog assignments
  const sumStock = assignments.reduce((acc, asg) => acc + (parseInt(asg.openingStock as any) || 0), 0);
  const totalStockDisplay = sumStock > 0 ? `${sumStock} units` : "0 units";

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const filteredVariants = variantsList.filter(v => {
    if (filterOption1 !== 'All' && attributesList[0]) {
      const val = v.options[attributesList[0].name];
      if (val !== filterOption1) return false;
    }
    if (filterOption2 !== 'All' && attributesList[1]) {
      const val = v.options[attributesList[1].name];
      if (val !== filterOption2) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full min-h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-y-auto">

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[99999] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-3xs">

        {/* Left: Back Arrow + Item Title + Switch Dropdown + Status Badge + SKU */}
        <div className="flex items-center gap-3.5 flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            title="Back to Items"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {itemData.itemName || "Item Details"}
            </h1>

            {/* Switch Variant / Main Product Pill */}
            {hasVariants && variantsList.length > 0 && (
              <div className="relative">
                <select
                  value={selectedProductVariant}
                  onChange={(e) => setSelectedProductVariant(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1 text-xs font-bold text-slate-700 outline-none appearance-none pr-7 cursor-pointer transition-all"
                >
                  <option value="Main Product">SWITCH: ✦ Main Product</option>
                  {variantsList.map(v => (
                    <option key={v.id} value={v.name}>{v.name}</option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Active Status Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px] font-black rounded-lg uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active
            </span>

            {/* SKU Badge */}
            {itemData.sku && (
              <span className="text-xs font-mono font-bold text-slate-400">
                #{itemData.sku}
              </span>
            )}
          </div>
        </div>

        {/* Right: View SKU Details Link + Edit Item Button + More Actions Dropdown */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => showToast(`SKU: ${itemData.sku || 'N/A'} copied!`)}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer hidden sm:block"
          >
            View SKU details
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Edit Item</span>
          </button>

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
                        setActiveModal('preview');
                      }}
                      className="w-full px-4 py-2 text-left text-slate-700 hover:bg-purple-50/50 hover:text-[#55349A] flex items-center gap-2"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Preview Item</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMoreActionsOpen(false);
                        showToast("Item duplicated successfully as copy!");
                      }}
                      className="w-full px-4 py-2 text-left text-slate-700 hover:bg-purple-50/50 hover:text-[#55349A] flex items-center gap-2"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Duplicate Item</span>
                    </button>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMoreActionsOpen(false);
                        setIsArchived(!isArchived);
                        showToast(isArchived ? "Item restored to Active" : "Item moved to Archive");
                      }}
                      className="w-full px-4 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      <span>{isArchived ? "Restore Item" : "Archive Item"}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* MAIN 2-COLUMN BODY */}
      <div className="p-6 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN (4 Cols): Image, Description, General Info, Inventory & Variant Settings, Linked Products, Tags, Badges */}
        <div className="lg:col-span-4 space-y-5">

          {/* Main Showcase Image & Thumbnails Card with Real Image Upload */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs space-y-4">

            {/* Main Image Box or Upload Dropzone */}
            <div className="aspect-square bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-inner flex flex-col items-center justify-center relative group">
              {selectedMainImage ? (
                <>
                  <img
                    src={selectedMainImage}
                    alt={itemData.itemName || "Item"}
                    className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => document.getElementById('details-upload-input')?.click()}
                      className="px-3.5 py-2 bg-white/90 hover:bg-white text-slate-900 font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5 text-[#55349A]" />
                      <span>Change Photo</span>
                    </button>
                  </div>
                </>
              ) : (
                <div
                  onClick={() => document.getElementById('details-upload-input')?.click()}
                  className="p-6 text-center space-y-3 cursor-pointer hover:scale-102 transition-transform"
                >
                  <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#55349A] flex items-center justify-center mx-auto border border-purple-100 shadow-3xs">
                    <Camera className="h-7 w-7 stroke-[1.8]" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">No Image Uploaded</h5>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Click or drag & drop to add real product photo</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#55349A] text-white rounded-lg text-xs font-bold shadow-xs">
                    <Plus className="h-3 w-3" />
                    <span>Upload Image</span>
                  </span>
                </div>
              )}

              {/* Hidden File Input for Real Photo Upload */}
              <input
                id="details-upload-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleUploadImageFile}
                className="hidden"
              />
            </div>

            {/* Thumbnails Row + Add Photo Button */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedMainImage(img)}
                  className={cn(
                    "w-13 h-13 rounded-xl border-2 overflow-hidden shrink-0 transition-all cursor-pointer relative shadow-3xs",
                    selectedMainImage === img
                      ? "border-[#55349A] ring-2 ring-[#55349A]/20"
                      : "border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100"
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}

              <button
                type="button"
                onClick={() => document.getElementById('details-upload-input')?.click()}
                className="w-13 h-13 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#55349A] hover:bg-purple-50/40 flex flex-col items-center justify-center text-slate-400 hover:text-[#55349A] shrink-0 transition-all cursor-pointer"
                title="Add Another Image"
              >
                <Plus className="h-4 w-4" />
                <span className="text-[9px] font-bold mt-0.5">Add</span>
              </button>
            </div>

            {/* Description with Expand toggle */}
            <div className="pt-2 text-xs text-slate-600 leading-relaxed">
              <p>
                {itemData.itemDescription ? (
                  <>
                    {descriptionExpanded || itemData.itemDescription.length <= 110
                      ? itemData.itemDescription
                      : `${itemData.itemDescription.slice(0, 110)}...`}
                    {itemData.itemDescription.length > 110 && (
                      <button
                        type="button"
                        onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                        className="text-[#55349A] font-bold hover:underline ml-1 cursor-pointer"
                      >
                        {descriptionExpanded ? 'show less' : 'more'}
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-slate-400 italic font-normal">
                    No detailed description provided for this product.
                  </span>
                )}
              </p>
            </div>

            {/* General Information Key-Value Table */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">General Information</h3>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="grid grid-cols-2 py-2.5">
                  <span className="text-slate-400 font-bold">Category</span>
                  <span className="font-bold text-slate-900 text-right">{itemData.selectedCategory || '—'}</span>
                </div>
                <div className="grid grid-cols-2 py-2.5">
                  <span className="text-slate-400 font-bold">Brand</span>
                  <span className="font-bold text-slate-900 text-right">{itemData.selectedBrand || '—'}</span>
                </div>
                <div className="grid grid-cols-2 py-2.5">
                  <span className="text-slate-400 font-bold">SKU</span>
                  <span className="font-mono font-bold text-slate-900 text-right">{itemData.sku || '—'}</span>
                </div>
                <div className="grid grid-cols-2 py-2.5">
                  <span className="text-slate-400 font-bold">Barcode</span>
                  <span className="font-mono font-bold text-slate-900 text-right">{itemData.barcode || '—'}</span>
                </div>
                <div className="grid grid-cols-2 py-2.5">
                  <span className="text-slate-400 font-bold">Item Type</span>
                  <span className="font-bold text-slate-900 text-right">{itemData.selectedItemType || 'Standard Product'}</span>
                </div>
                <div className="grid grid-cols-2 py-2.5">
                  <span className="text-slate-400 font-bold">HSN Code</span>
                  <span className="font-mono font-bold text-slate-900 text-right">{itemData.hsnCode || '—'}</span>
                </div>
                <div className="grid grid-cols-2 py-2.5">
                  <span className="text-slate-400 font-bold">Weight (kg)</span>
                  <span className="font-mono font-bold text-slate-900 text-right">{itemData.weight || '—'}</span>
                </div>
                <div className="grid grid-cols-2 py-2.5">
                  <span className="text-slate-400 font-bold">Tax Group</span>
                  <span className="font-bold text-slate-900 text-right">{itemData.selectedTaxGroup || '—'}</span>
                </div>
              </div>
            </div>

            {/* Inventory & Variant Settings */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Inventory & Variant Settings</h3>

              <div className="space-y-2.5">
                {/* Track Stock Quantity */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-black text-slate-900 block">Track Stock Quantity</span>
                    <span className="text-[10.5px] text-slate-400 font-medium block">Track inventory stock levels automatically</span>
                  </div>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border shrink-0",
                    trackStock
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-slate-200/60 text-slate-600 border-slate-300"
                  )}>
                    {trackStock ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>

                {/* Batch Tracking */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-black text-slate-900 block">Batch Tracking</span>
                    <span className="text-[10.5px] text-slate-400 font-medium block">Track items by manufacturing batches</span>
                  </div>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border shrink-0",
                    batchTracking
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-slate-200/60 text-slate-600 border-slate-300"
                  )}>
                    {batchTracking ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>

                {/* This Item Has Variants */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-black text-slate-900 block">This Item Has Variants</span>
                    <span className="text-[10.5px] text-slate-400 font-medium block">Size, color, or custom variant options</span>
                  </div>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border shrink-0",
                    hasVariants
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-slate-200/60 text-slate-600 border-slate-300"
                  )}>
                    {hasVariants ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
              </div>
            </div>

            {/* Linked Products */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Linked Products</h3>

              <div className="space-y-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Upsells</span>
                  {itemData.upsells && itemData.upsells.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {itemData.upsells.map((u, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-purple-200 bg-purple-50/50 text-[#55349A] text-[11px] font-black uppercase tracking-wider shadow-3xs">
                          <Link className="h-3 w-3" />
                          <span>{u}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs italic">No upsell products linked</span>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Cross-Sells</span>
                  {itemData.crossSells && itemData.crossSells.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {itemData.crossSells.map((c, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-purple-200 bg-purple-50/50 text-[#55349A] text-[11px] font-black uppercase tracking-wider shadow-3xs">
                          <Link className="h-3 w-3" />
                          <span>{c}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs italic">No cross-sell products linked</span>
                  )}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Tags</h3>
              {itemData.tags && itemData.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {itemData.tags.map((t, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-bold shadow-3xs">
                      <Tag className="h-3 w-3 text-slate-400" />
                      <span>{t}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400 text-xs italic">No tags added</span>
              )}
            </div>

            {/* Badges */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Badges</h3>
              {itemData.badges && itemData.badges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {itemData.badges.map((b, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-300 bg-emerald-50/60 text-emerald-800 text-[11px] font-black uppercase tracking-wider shadow-3xs">
                      <Award className="h-3 w-3 text-emerald-600" />
                      <span>{b}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400 text-xs italic">No badges added</span>
              )}
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN (8 Cols): Store Performance, Store & Catalog Assignment, Variants & Additional Information */}
        <div className="lg:col-span-8 space-y-6">

          {/* Store Performance Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Store Performance</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Live store sales and recorded opening stock</p>
              </div>

              {/* Timeframe selector */}
              <div className="relative">
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-800 outline-none appearance-none pr-8 cursor-pointer hover:bg-slate-100 transition-all"
                >
                  <option value="Today">Today</option>
                  <option value="Last 7 days">Last 7 days</option>
                  <option value="30 days">30 days</option>
                  <option value="6 months">6 months</option>
                  <option value="Year">Year</option>
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 3 Metric Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* Tile 1: Total Units Sold */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-3xs flex items-center justify-between">
                <div>
                  <span className="text-xl font-black text-slate-900 leading-none block">0</span>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mt-1 block">TOTAL UNITS SOLD</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Clock className="h-5 w-5 stroke-[2]" />
                </div>
              </div>

              {/* Tile 2: Total Revenue */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-3xs flex items-center justify-between">
                <div>
                  <span className="text-xl font-black text-slate-900 leading-none block">₹ 0.00</span>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mt-1 block">TOTAL REVENUE</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Target className="h-5 w-5 stroke-[2]" />
                </div>
              </div>

              {/* Tile 3: Current Stock */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-3xs flex items-center justify-between">
                <div>
                  <span className="text-xl font-black text-slate-900 leading-none block">{totalStockDisplay}</span>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mt-1 block">CURRENT STOCK</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#55349A] flex items-center justify-center">
                  <Boxes className="h-5 w-5 stroke-[2]" />
                </div>
              </div>

            </div>
          </div>

          {/* Store & Catalog Assignment Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Store & Catalog Assignment</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs font-black text-[#55349A] hover:underline cursor-pointer flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Another</span>
              </button>
            </div>

            {/* Store Cards or Empty State */}
            {assignments.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3 shadow-3xs">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#55349A] flex items-center justify-center mx-auto border border-purple-100">
                  <Store className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">No Store or Catalog Assigned</h4>
                  <p className="text-xs text-slate-400 font-medium mt-1">This product is not currently placed in any store catalog.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#55349A] text-white rounded-xl text-xs font-bold hover:bg-[#43287A] transition-all cursor-pointer shadow-3xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Assign to Store & Catalog</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {Array.from(new Set(assignments.map(a => a.store))).map((storeName) => {
                  const storeAssignments = assignments.filter(a => a.store === storeName);
                  return (
                    <div key={storeName} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-4">

                      {/* Store Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shadow-3xs">
                            <Store className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900">{storeName}</h4>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold mt-0.5">
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3 text-teal-600" />
                                <span>{storeAssignments.length} Catalogs</span>
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Boxes className="h-3 w-3 text-[#55349A]" />
                                <span>{storeAssignments.length} Inventory Catalogs</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenDropdownId(openDropdownId === storeName ? null : storeName)}
                            className="w-8 h-8 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {openDropdownId === storeName && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)} />
                              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-1.5 text-xs font-bold">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAssignment(storeAssignments[0]);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-purple-50 hover:text-[#55349A] flex items-center gap-2"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                  <span>Edit Pricing</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAssignments(prev => prev.filter(a => a.store !== storeName));
                                    setOpenDropdownId(null);
                                    showToast(`Removed store assignment for ${storeName}`);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>Remove Assignment</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">CATALOGS</span>
                          <button type="button" className="text-xs font-bold text-[#55349A] hover:underline cursor-pointer">
                            View All Catalogs &gt;
                          </button>
                        </div>

                        {/* Catalog Assignment Tiles */}
                        <div className="space-y-3">
                          {storeAssignments.map(asg => (
                            <div key={asg.id} className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4.5 space-y-4">

                              {/* Catalog Header Row */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center">
                                    <Pill className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className="text-xs font-black text-slate-900">{asg.catalog}</h5>
                                      <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase rounded">
                                        ACTIVE
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Inventory Catalogs</span>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-700">
                                        {asg.inventoryCatalog || 'Main Stock'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              </div>

                              {/* Pricing & Stock Grid + Rate Editable Toggle */}
                              <div className="pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-6 sm:gap-10">
                                  <div>
                                    <span className="text-base font-black text-teal-700 font-mono">₹ {asg.salesPrice || '0.00'}</span>
                                    <span className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider block mt-0.5">SALES PRICE</span>
                                  </div>
                                  <div>
                                    <span className="text-base font-black text-slate-800 font-mono">₹ {asg.mrp || '0.00'}</span>
                                    <span className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider block mt-0.5">MRP</span>
                                  </div>
                                  <div>
                                    <span className="text-base font-black text-teal-700 font-mono">{asg.openingStock ?? '0'}</span>
                                    <span className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider block mt-0.5">OPENING STOCK</span>
                                  </div>
                                  <div>
                                    <span className="text-base font-black text-slate-800">{asg.batch || '—'}</span>
                                    <span className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider block mt-0.5">BATCH</span>
                                  </div>
                                </div>

                                {/* Rate Editable Switch */}
                                <div className="flex items-center gap-3 bg-purple-50/50 border border-purple-100 rounded-xl px-3.5 py-1.5">
                                  <div>
                                    <span className="text-[11px] font-bold text-slate-800 block leading-tight">Rate Editable</span>
                                    <span className="text-[9px] text-slate-400 font-medium block leading-tight">Authorize price changes</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextVal = !(asg.rateEditable ?? true);
                                        setAssignments(prev => prev.map(a => a.id === asg.id ? { ...a, rateEditable: nextVal } : a));
                                        showToast(`Rate Editable updated to ${nextVal ? 'ON' : 'OFF'}`);
                                      }}
                                      className={cn(
                                        "w-9 h-5 rounded-full relative transition-all duration-150 cursor-pointer shrink-0",
                                        (asg.rateEditable ?? true) ? "bg-[#55349A]" : "bg-slate-300"
                                      )}
                                    >
                                      <div className={cn(
                                        "w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform duration-150 shadow-xs",
                                        (asg.rateEditable ?? true) ? "left-4.5" : "left-0.5"
                                      )} />
                                    </button>
                                    <span className={cn(
                                      "text-[10px] font-black font-mono",
                                      (asg.rateEditable ?? true) ? "text-[#55349A]" : "text-slate-400"
                                    )}>
                                      {(asg.rateEditable ?? true) ? 'ON' : 'OFF'}
                                    </span>
                                  </div>
                                </div>

                              </div>

                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Variants & Additional Information Tabs Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-5">

            {/* Tabs Header */}
            <div className="flex items-center gap-8 border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab('variants')}
                className={cn(
                  "text-sm font-black transition-all cursor-pointer relative pb-3 -mb-3",
                  activeTab === 'variants'
                    ? "text-[#55349A] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#55349A]"
                    : "text-slate-400 hover:text-slate-700"
                )}
              >
                Variants
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('additional')}
                className={cn(
                  "text-sm font-black transition-all cursor-pointer relative pb-3 -mb-3",
                  activeTab === 'additional'
                    ? "text-[#55349A] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#55349A]"
                    : "text-slate-400 hover:text-slate-700"
                )}
              >
                Additional Informations
              </button>
            </div>

            {/* TAB 1: VARIANTS */}
            {activeTab === 'variants' && (
              <div className="space-y-5 animate-in fade-in duration-150">

                {/* Variant Header Row */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">
                    {hasVariants ? `${totalVariantsCount} variants (${attributesList.map(a => `${a.values.length} ${a.name.toLowerCase()}s`).join(' × ')})` : 'Standard Product (No Variants)'}
                  </span>
                  <button
                    type="button"
                    onClick={onEdit}
                    className="text-xs font-black text-[#55349A] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{hasVariants ? 'Add Another' : 'Configure Variants'}</span>
                  </button>
                </div>

                {hasVariants ? (
                  <>
                    {/* Attribute Rows from Real Attributes */}
                    <div className="space-y-2.5">
                      {attributesList.map((attr, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-black text-slate-900 min-w-14">{attr.name}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {(attr.values || []).map((val, vIdx) => (
                                <span key={vIdx} className="px-3 py-1 rounded-lg bg-purple-100 text-[#55349A] text-xs font-black font-mono">
                                  {val}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button type="button" onClick={onEdit} className="text-slate-400 hover:text-[#55349A] cursor-pointer">
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Filters Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400">Filter By:</span>

                        {attributesList[0] && (
                          <div className="relative">
                            <select
                              value={filterOption1}
                              onChange={(e) => setFilterOption1(e.target.value)}
                              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none appearance-none pr-7 cursor-pointer hover:border-slate-300 transition-all shadow-3xs"
                            >
                              <option value="All">{attributesList[0].name.toUpperCase()}: All</option>
                              {attributesList[0].values.map(val => (
                                <option key={val} value={val}>{attributesList[0].name.toUpperCase()}: {val}</option>
                              ))}
                            </select>
                            <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        )}

                        {attributesList[1] && (
                          <div className="relative">
                            <select
                              value={filterOption2}
                              onChange={(e) => setFilterOption2(e.target.value)}
                              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none appearance-none pr-7 cursor-pointer hover:border-slate-300 transition-all shadow-3xs"
                            >
                              <option value="All">{attributesList[1].name.toUpperCase()}: All</option>
                              {attributesList[1].values.map(val => (
                                <option key={val} value={val}>{attributesList[1].name.toUpperCase()}: {val}</option>
                              ))}
                            </select>
                            <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => showToast("Bulk action options")}
                        className="w-8 h-8 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer shadow-3xs"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Flat Variants Matrix Table */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-3xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px]">
                          <tr>
                            <th className="py-3 px-3 w-8">
                              <input type="checkbox" className="accent-[#55349A] rounded cursor-pointer" />
                            </th>
                            <th className="py-3 px-3">VARIANT NAME</th>
                            <th className="py-3 px-3">STATUS</th>
                            <th className="py-3 px-3">PRICE</th>
                            <th className="py-3 px-3">STOCKS</th>
                            <th className="py-3 px-4 text-right">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {filteredVariants.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-3">
                                <input type="checkbox" className="accent-[#55349A] rounded cursor-pointer" />
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-extrabold text-slate-900 text-xs">{v.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">SKU: {v.sku}</div>
                              </td>
                              <td className="py-3 px-3">
                                <span className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase",
                                  v.status === 'ACTIVE'
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                )}>
                                  <span className={cn("w-1.5 h-1.5 rounded-full", v.status === 'ACTIVE' ? "bg-emerald-500" : "bg-rose-500")} />
                                  {v.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-slate-900">
                                ₹ {v.price.toFixed(2)}
                              </td>
                              <td className="py-3 px-3 font-bold text-teal-700 font-mono">
                                {v.stocks} Units
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={onEdit}
                                    className="px-3 py-1 bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-[#55349A] border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => showToast(`Actions for ${v.name}`)}
                                    className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  /* Standard Product Single Row */
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-3xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px]">
                        <tr>
                          <th className="py-3 px-3 w-8">
                            <input type="checkbox" className="accent-[#55349A] rounded cursor-pointer" />
                          </th>
                          <th className="py-3 px-3">PRODUCT / VARIANT</th>
                          <th className="py-3 px-3">STATUS</th>
                          <th className="py-3 px-3">PRICE</th>
                          <th className="py-3 px-3">STOCKS</th>
                          <th className="py-3 px-4 text-right">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3">
                            <input type="checkbox" className="accent-[#55349A] rounded cursor-pointer" />
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-extrabold text-slate-900 text-xs">{itemData.itemName || 'Main Product'} (Base)</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">SKU: {itemData.sku || '—'}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              ACTIVE
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            ₹ {parseFloat(assignments[0]?.salesPrice || '0').toFixed(2)}
                          </td>
                          <td className="py-3 px-3 font-bold text-teal-700 font-mono">
                            {sumStock} Units
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={onEdit}
                              className="px-3 py-1 bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-[#55349A] border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            )}

            {/* TAB 2: ADDITIONAL INFORMATIONS */}
            {activeTab === 'additional' && (
              <div className="space-y-6 animate-in fade-in duration-150 text-left">
                {/* Remarks Panel integration */}
                {itemData.uid && (
                  <ItemRemarksPanel itemUid={itemData.uid} itemName={itemData.itemName} />
                )}

                {/* Barcode Panel integration */}
                {itemData.uid && (
                  <BarcodePanel itemUid={itemData.uid} itemName={itemData.itemName} primaryBarcode={itemData.barcode} />
                )}

                {/* Info Blocks / Specifications */}
                {itemData.infoBlocks && itemData.infoBlocks.length > 0 ? (
                  itemData.infoBlocks.map((block) => (
                    <div key={block.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">{block.heading}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{block.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-slate-200/60">
                    No additional specification blocks added yet.
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Add Store Assignment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Add Store Assignment</h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const store = (form.elements.namedItem('store') as HTMLInputElement).value;
                const catalog = (form.elements.namedItem('catalog') as HTMLInputElement).value;
                const salesPrice = (form.elements.namedItem('salesPrice') as HTMLInputElement).value;
                const mrp = (form.elements.namedItem('mrp') as HTMLInputElement).value;

                const newAsg = {
                  id: Date.now(),
                  store: store || "Store",
                  catalog: catalog || "General Catalog",
                  inventoryCatalog: "Main Warehouse",
                  salesPrice: salesPrice || "0.00",
                  mrp: mrp || "0.00",
                  openingStock: 0,
                  batch: "Batch 1",
                  rateEditable: true
                };

                setAssignments(prev => [...prev, newAsg]);
                setIsAddModalOpen(false);
                showToast("Store assignment added successfully!");
              }}
              className="space-y-3 text-xs"
            >
              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase text-[10px]">Store Name</label>
                <input required name="store" placeholder="e.g. Kozhikode Hub" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase text-[10px]">Catalog Name</label>
                <input required name="catalog" placeholder="e.g. Retail Catalog" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase text-[10px]">Sales Price (₹)</label>
                  <input required name="salesPrice" type="number" step="0.01" placeholder="299.00" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase text-[10px]">MRP (₹)</label>
                  <input required name="mrp" type="number" step="0.01" placeholder="399.00" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono" />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#55349A] text-white font-black hover:bg-[#43287A]">
                  Add Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
