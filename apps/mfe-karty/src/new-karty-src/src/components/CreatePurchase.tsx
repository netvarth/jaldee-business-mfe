import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, ChevronDown, Calendar, Plus,
  Search, ShoppingBasket, Check, X, Trash2,
  ChevronUp, Minus, Pencil, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useStores } from '../../../services/useStores';
import { useVendors } from '../../../services/useVendors';
import { useInventoryCatalogs, useInventoryCatalogItems } from '../../../services/useInventoryCatalogs';
import { useItems } from '../../../services/useItems';
import { useUnits } from '../../../services/useUnits';
import { useTaxes } from '../../../services/useTaxes';

interface CreatePurchaseProps {
  onBack: () => void;
  onCreate: (data: any) => void;
  onSend?: (data: any) => void;
  initialRequestMode?: boolean;
  conversionSource?: any;
  initialReadOnly?: boolean;
}

export const CreatePurchase = ({ onBack, onCreate, onSend, initialRequestMode = false, conversionSource, initialReadOnly = false }: CreatePurchaseProps) => {
  const [isReadOnlyState, setIsReadOnlyState] = useState(initialReadOnly);
  const isConverting = !!conversionSource && !isReadOnlyState;
  const [isRequestMode, setIsRequestMode] = useState(initialRequestMode);

  useEffect(() => {
    setIsRequestMode(initialRequestMode);
  }, [initialRequestMode]);

  useEffect(() => {
    setIsReadOnlyState(initialReadOnly);
  }, [initialReadOnly]);

  const [purchaseNo, setPurchaseNo] = useState(() =>
    conversionSource ? 'PO-' + conversionSource.orderNo.replace('REQ-', '') : ''
  );
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState('');
  const [date, setDate] = useState('');
  // Vendor state vs receiving-store state: drives whether the server charges CGST+SGST or IGST.
  const [supplyType, setSupplyType] = useState<'INTRA_STATE' | 'INTER_STATE'>('INTRA_STATE');

  // Tax master (finance-service). Empty/unavailable → lines just price at zero tax.
  const { data: taxRates = [] } = useTaxes({ status: 'ACTIVE' });

  const { data: backendStores } = useStores();
  const { data: backendVendors } = useVendors();
  const { data: backendCatalogs } = useInventoryCatalogs();
  const { data: backendItems } = useItems();
  const { data: backendUnitList = [] } = useUnits();
  const unitLabel = (uid: string) => {
    const u: any = (backendUnitList as any[]).find((x) => x.uid === uid);
    if (!u) return uid ? `${uid.substring(0, 8)}…` : '';
    return u.symbol ? `${u.name} (${u.symbol})` : u.name;
  };

  const [storesList, setStoresList] = useState<Array<{id: string, name: string}>>([]);
  const [catalogsList, setCatalogsList] = useState<Array<{id: string, name: string, storeUid?: string}>>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [vendorsList, setVendorsList] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    if (backendVendors?.length) setVendorsList(backendVendors.map((v: any) => ({ id: v.uid || v.id, name: v.name || v.vendorName || v.id })));
  }, [backendVendors]);

  useEffect(() => {
    if (backendStores?.length) setStoresList(backendStores.map((s: any) => ({ id: s.id || s.uid, name: s.name || s.storeName || s.id })));
  }, [backendStores]);

  useEffect(() => {
    if (backendCatalogs?.length) setCatalogsList(backendCatalogs.map((c: any) => ({ id: c.uid || c.id, name: c.name || c.catalogName || c.id, storeUid: c.storeUid })));
  }, [backendCatalogs]);

  useEffect(() => {
    if (backendItems?.length) setItemsList(backendItems.map((i: any) => ({
      id: i.uid || i.id,
      uid: i.uid || i.id,
      name: i.name || i.itemName,
      image: i.imageUrl || i.image || '',
      details: i.description || '',
      sku: i.sku || i.itemCode || '',
      barcode: i.barcode || i.barCode || '',
      category: i.categoryName || i.category || '',
      price: i.price || i.mrp || 0,
      // purchase-fix: carry baseUnitUid + batches so the line shows the real base unit and batch suggestions.
      baseUnitUid: i.baseUnitUid,
      batches: i.batches || [],
      units: i.units || []
    })));
  }, [backendItems]);

  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');

  // Calendar Picker states
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarMonth, setCalendarMonth] = useState(3); // April

  const [selectedVendor, setSelectedVendor] = useState(() =>
    conversionSource ? (conversionSource.from?.id || '') : ''
  );
  const [selectedStore, setSelectedStore] = useState(() =>
    conversionSource ? (conversionSource.to?.id || '') : ''
  );
  const [selectedCatalog, setSelectedCatalog] = useState(() =>
    conversionSource ? (conversionSource.catalogId || '') : ''
  );
  // purchase-fix: store-wise inventory catalogs — only show catalogs that belong to the chosen store.
  const storeCatalogs = React.useMemo(
    () => catalogsList.filter(c => !selectedStore || !c.storeUid || c.storeUid === selectedStore),
    [catalogsList, selectedStore]
  );
  // Clear the catalog if it no longer belongs to the newly-selected store.
  useEffect(() => {
    if (selectedCatalog && selectedStore && !storeCatalogs.some(c => c.id === selectedCatalog)) {
      setSelectedCatalog('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);
  const [showNoteField, setShowNoteField] = useState(() =>
    conversionSource ? !!conversionSource.note : false
  );
  const [note, setNote] = useState(() =>
    conversionSource ? (conversionSource.note || '') : ''
  );

  const [vendorOpen, setVendorOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const [purchasedItems, setPurchasedItems] = useState<any[]>(() => conversionSource?.items || []);
  const [taxBreakdownIndex, setTaxBreakdownIndex] = useState<number | null>(null);
  const [salesPriceBreakdownIndex, setSalesPriceBreakdownIndex] = useState<number | null>(null);

  // Search and selector states inline (replacing select modal)
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  const [form, setForm] = useState({
    batch: '',
    unit: '',
    qty: '',
    expDate: '',
    freeQty: '',
    mrp: '',
    purchasePrice: '',
    salesPrice: '',
    amount: '',
    discount: '0',
    taxUids: [] as string[],
    netAmount: '',
    catalog: ''
  });

  const updateCalculations = (newForm: any) => {
    const qty = parseFloat(newForm.qty) || 0;
    const price = parseFloat(newForm.purchasePrice) || 0;
    const discount = parseFloat(newForm.discount) || 0;

    const amount = qty * price;
    const netAmount = amount - discount;

    setForm({
      ...newForm,
      amount: amount.toString(),
      netAmount: netAmount.toString()
    });
  };

  const handleInputChange = (field: string, value: string) => {
    const newForm = { ...form, [field]: value };
    if (['qty', 'purchasePrice', 'discount'].includes(field)) {
      updateCalculations(newForm);
    } else {
      setForm(newForm);
    }
  };

  // purchase-fix: a purchase must land in a store's inventory catalog, so require Store + Catalog
  // to be picked BEFORE searching items. Once they are, search the full item master — a purchase
  // introduces/restocks items INTO the catalog, so it must not be limited to items already in it.
  const canSearchItems = !!selectedStore && !!selectedCatalog;

  const filteredItems = !canSearchItems ? [] : itemsList.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.sku.toLowerCase().includes(search.toLowerCase()) ||
    (i.barcode && i.barcode.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    if (search.length > 0 && !selectedItem) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, [search, selectedItem]);

  const handleSelect = (item: any) => {
    setSelectedItem(item);
    setSearch(item.name);
    setShowResults(false);
    setForm({
      batch: '',
      unit: '',
      qty: '',
      expDate: '',
      freeQty: '',
      mrp: String(item.mrp || ''),
      purchasePrice: String(item.price || ''),
      salesPrice: String(item.price || ''),
      amount: '',
      discount: '0',
      taxUids: [],
      netAmount: '',
      catalog: selectedCatalog
    });
  };

  const handleSaveInline = () => {
    if (!selectedItem) return;
    setPurchasedItems([
      ...purchasedItems,
      {
        ...selectedItem,
        ...form
      }
    ]);
    setSelectedItem(null);
    setSearch('');
  };

  // Helper to parse date
  const parseDateString = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let yr = parseInt(parts[2], 10);
      if (yr < 100) yr += 2000;
      const d = new Date(yr, month, day);
      if (!isNaN(d.getTime())) return d;
    }
    const d2 = new Date(dateStr);
    if (!isNaN(d2.getTime())) return d2;
    return new Date();
  };

  useEffect(() => {
    if (showCalendar) {
      const parsed = parseDateString(date);
      setCalendarYear(parsed.getFullYear());
      setCalendarMonth(parsed.getMonth());
    }
  }, [showCalendar, date]);

  const handleAddVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newVendorName.trim();
    if (trimmed) {
      const newId = String(Date.now());
      setVendorsList([...vendorsList, { id: newId, name: trimmed }]);
      setSelectedVendor(newId);
      setNewVendorName('');
      setShowAddVendorModal(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-full bg-[#F8F9FA]">
      {/* Header Bar */}
      <div className="bg-white border-b border-surface-100 py-3.5 px-8 flex items-center justify-between shrink-0 sticky top-0 z-[40]">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="p-1 hover:bg-surface-100 rounded transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-surface-900" />
          </button>
          <h1 className="text-lg font-bold text-surface-900 tracking-tight">
            {isReadOnlyState
              ? `Purchase Request Details (${conversionSource?.orderNo || 'REQ-356715'})`
              : isRequestMode
                ? "Create Purchase Request"
                : "Create New Purchase"
            }
          </h1>
        </div>

        {/* Tab switcher matching standard layout design guidelines */}
        {!isReadOnlyState ? (
          <div className="bg-[#F1EFF7] p-1 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setIsRequestMode(false);
                setPurchasedItems([]);
              }}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                !isRequestMode
                  ? "bg-[#55349A] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Standard Purchase
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRequestMode(true);
                setPurchasedItems([]);
              }}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                isRequestMode
                  ? "bg-[#55349A] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Order Ahead (PO)
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-[#EFEBFA] border border-[#DED4F3] text-[#55349A] text-xs font-black rounded-xl">
              VIEW ONLY REQUEST
            </span>
            <button
              type="button"
              onClick={() => {
                setIsReadOnlyState(false);
                setIsRequestMode(false);
              }}
              className="flex items-center gap-2 px-5 py-2 bg-[#55349A] hover:bg-opacity-95 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer whitespace-nowrap"
            >
              Convert to Purchase Order
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 p-8 space-y-6 pb-24">
        {/* Section 1: Purchase Details */}
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm">
          <div className="px-6 py-4 border-b border-surface-100 bg-white rounded-t-xl">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">Purchase Details</h2>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
              {/* Store */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Store</label>
                <div className="relative">
                  <button
                    type="button"
                    disabled={isReadOnlyState}
                    onClick={() => !isReadOnlyState && setStoreOpen(!storeOpen)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all group",
                      isReadOnlyState && "bg-slate-50 cursor-not-allowed text-slate-500"
                    )}
                  >
                    <span className={selectedStore ? "text-surface-900" : "text-surface-400"}>
                      {storesList.find(s => s.id === selectedStore)?.name || 'Select'}
                    </span>
                    {!isReadOnlyState && <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform", storeOpen && "rotate-180")} />}
                  </button>
                  {storeOpen && !isReadOnlyState && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setStoreOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-xl z-50 py-2 animate-in fade-in zoom-in duration-200 origin-top">
                        {storesList.map((s) => (
                          <button
                            key={s.id}
                            className={cn(
                              "w-full text-left px-4 py-2 text-sm hover:bg-surface-50 transition-colors flex items-center justify-between",
                              selectedStore === s.id ? "text-primary-600 bg-primary-50/50" : "text-surface-700"
                            )}
                            onClick={() => {
                              setSelectedStore(s.id);
                              setStoreOpen(false);
                            }}
                          >
                            {s.name}
                            {selectedStore === s.id && <Check className="h-3.5 w-3.5" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Inventory Catalog */}
              {!isRequestMode && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Inventory Catalog</label>
                  <div className="relative">
                    <button
                      type="button"
                      disabled={isReadOnlyState}
                      onClick={() => !isReadOnlyState && setCatalogOpen(!catalogOpen)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all group",
                        isReadOnlyState && "bg-slate-50 cursor-not-allowed text-slate-500"
                      )}
                    >
                      <span className={selectedCatalog ? "text-surface-900" : "text-surface-400"}>
                        {catalogsList.find(c => c.id === selectedCatalog)?.name || (selectedStore ? 'Select' : 'Select store first')}
                      </span>
                      {!isReadOnlyState && <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform", catalogOpen && "rotate-180")} />}
                    </button>
                    {catalogOpen && !isReadOnlyState && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setCatalogOpen(false)} />
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-xl z-50 py-2 animate-in fade-in zoom-in duration-200 origin-top max-h-[280px] overflow-y-auto">
                          {/* purchase-fix: store-wise catalogs — options limited to the selected store's inventory catalogs. */}
                          {storeCatalogs.length === 0 && (
                            <div className="px-4 py-2 text-sm text-surface-400">{selectedStore ? 'No inventory catalog for this store' : 'Select a store first'}</div>
                          )}
                          {storeCatalogs.map((c) => (
                            <button
                              key={c.id}
                              className={cn(
                                "w-full text-left px-4 py-2 text-sm hover:bg-surface-50 transition-colors flex items-center justify-between",
                                selectedCatalog === c.id ? "text-primary-600 bg-primary-50/50" : "text-surface-700"
                              )}
                              onClick={() => {
                                setSelectedCatalog(c.id);
                                setCatalogOpen(false);
                              }}
                            >
                              {c.name}
                              {selectedCatalog === c.id && <Check className="h-3.5 w-3.5" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Vendor */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Vendor</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <button
                      type="button"
                      disabled={isReadOnlyState}
                      onClick={() => !isReadOnlyState && setVendorOpen(!vendorOpen)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all group",
                        isReadOnlyState && "bg-slate-50 cursor-not-allowed text-slate-500"
                      )}
                    >
                      <span className={selectedVendor ? "text-surface-900" : "text-surface-400"}>
                        {vendorsList.find(v => v.id === selectedVendor)?.name || 'Select'}
                      </span>
                      {!isReadOnlyState && <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform", vendorOpen && "rotate-180")} />}
                    </button>
                    {vendorOpen && !isReadOnlyState && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setVendorOpen(false)} />
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-xl z-50 py-2 animate-in fade-in zoom-in duration-200 origin-top">
                          {vendorsList.map((v) => (
                            <button
                              key={v.id}
                              className={cn(
                                "w-full text-left px-4 py-2 text-sm hover:bg-surface-50 transition-colors flex items-center justify-between",
                                selectedVendor === v.id ? "text-primary-600 bg-primary-50/50" : "text-surface-700"
                              )}
                              onClick={() => {
                                setSelectedVendor(v.id);
                                setVendorOpen(false);
                              }}
                            >
                              {v.name}
                              {selectedVendor === v.id && <Check className="h-3.5 w-3.5" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {!isReadOnlyState && (
                    <button
                      type="button"
                      onClick={() => setShowAddVendorModal(true)}
                      className="px-3 bg-[#EFEBFA] border border-[#DED4F3] rounded-xl flex items-center justify-center hover:bg-[#DED4F3] transition-colors cursor-pointer"
                    >
                      <Plus className="h-4 w-4 text-[#55349A]" strokeWidth={3} />
                    </button>
                  )}
                </div>
              </div>

              {/* Bill No */}
              {!isRequestMode && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">
                    Bill No
                  </label>
                  <input
                    type="text"
                    value={billNo}
                    readOnly={isReadOnlyState}
                    onChange={(e) => setBillNo(e.target.value)}
                    placeholder="Enter bill number"
                    className={cn(
                      "w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-medium text-surface-900 focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all shadow-sm",
                      isReadOnlyState && "bg-slate-50 cursor-not-allowed text-slate-500"
                    )}
                  />
                </div>
              )}

              {/* Bill Date — the vendor invoice date; GST filing keys off this, not the entry date */}
              {!isRequestMode && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">
                    Bill Date
                  </label>
                  <input
                    type="date"
                    value={billDate}
                    readOnly={isReadOnlyState}
                    onChange={(e) => setBillDate(e.target.value)}
                    className={cn(
                      "w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-medium text-surface-900 focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all shadow-sm",
                      isReadOnlyState && "bg-slate-50 cursor-not-allowed text-slate-500"
                    )}
                  />
                </div>
              )}

              {/* Supply Type — decides CGST+SGST (same state) vs IGST (inter-state) for all lines */}
              {!isRequestMode && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">
                    Supply Type
                  </label>
                  <div className="flex items-center gap-1 bg-[#F1EFF7] p-1 rounded-xl">
                    {([['INTRA_STATE', 'Intra-state'], ['INTER_STATE', 'Inter-state']] as const).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        disabled={isReadOnlyState}
                        onClick={() => setSupplyType(val)}
                        className={cn(
                          'flex-1 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all',
                          supplyType === val ? 'bg-white text-[#55349A] shadow-sm' : 'text-surface-500',
                          isReadOnlyState && 'cursor-not-allowed opacity-70'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Date</label>
                <div className="relative">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={date}
                      readOnly={isReadOnlyState}
                      onChange={(e) => !isReadOnlyState && setDate(e.target.value)}
                      onClick={() => !isReadOnlyState && setShowCalendar(!showCalendar)}
                      className={cn(
                        "w-full px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-medium text-surface-900 focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all shadow-sm pr-12 select-none",
                        isReadOnlyState ? "bg-slate-50 cursor-not-allowed text-slate-500" : "cursor-pointer"
                      )}
                    />
                    {!isReadOnlyState && (
                      <button
                        type="button"
                        onClick={() => setShowCalendar(!showCalendar)}
                        className="absolute right-0 top-0 bottom-0 px-3 bg-[#EFEBFA] border border-l border-surface-200 rounded-r-xl flex items-center justify-center cursor-pointer hover:bg-[#DED4F3] transition-colors"
                      >
                        <Calendar className="h-4 w-4 text-[#55349A]" />
                      </button>
                    )}
                  </div>

                  {/* Custom Calendar Dropdown matching style parameters exactly */}
                  <AnimatePresence>
                    {showCalendar && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setShowCalendar(false)} />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="absolute right-0 mt-2 w-[320px] bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 z-40 text-left space-y-4"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <select
                              value={calendarMonth}
                              onChange={(e) => setCalendarMonth(parseInt(e.target.value, 10))}
                              className="bg-[#F1EFF7] hover:bg-[#E9E4F5] border-none text-[#55349A] text-xs font-bold px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer outline-none transition-colors"
                            >
                              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((mName, mIdx) => (
                                <option key={mIdx} value={mIdx} className="text-slate-800 font-medium">{mName}</option>
                              ))}
                            </select>

                            <select
                              value={calendarYear}
                              onChange={(e) => setCalendarYear(parseInt(e.target.value, 10))}
                              className="bg-[#F1EFF7] hover:bg-[#E9E4F5] border-none text-[#55349A] text-xs font-bold px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer outline-none transition-colors"
                            >
                              {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() + i).map((yr) => (
                                <option key={yr} value={yr} className="text-slate-800 font-medium">{yr}</option>
                              ))}
                            </select>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (calendarMonth === 0) {
                                    setCalendarMonth(11);
                                    setCalendarYear(calendarYear - 1);
                                  } else {
                                    setCalendarMonth(calendarMonth - 1);
                                  }
                                }}
                                className="p-1 hover:bg-[#F1EFF7] text-slate-500 rounded transition-colors cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (calendarMonth === 11) {
                                    setCalendarMonth(0);
                                    setCalendarYear(calendarYear + 1);
                                  } else {
                                    setCalendarMonth(calendarMonth + 1);
                                  }
                                }}
                                className="p-1 hover:bg-[#F1EFF7] text-slate-500 rounded transition-colors cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 tracking-wider">
                            {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((dayName) => (
                              <div key={dayName} className="py-1">{dayName}</div>
                            ))}
                          </div>

                          <div className="grid grid-cols-7 text-center gap-1">
                            {(() => {
                              const daysInPrevMonth = new Date(calendarYear, calendarMonth, 0).getDate();
                              const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
                              const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

                              const cells = [];

                              for (let i = firstDayIndex - 1; i >= 0; i--) {
                                cells.push(
                                  <div
                                    key={`prev-${i}`}
                                    className="py-1.5 text-xs text-slate-300 font-bold select-none cursor-default"
                                  >
                                    {daysInPrevMonth - i}
                                  </div>
                                );
                              }

                              for (let dNum = 1; dNum <= daysInMonth; dNum++) {
                                const parsedDateState = parseDateString(date);
                                const isSelected = parsedDateState.getDate() === dNum &&
                                                   parsedDateState.getMonth() === calendarMonth &&
                                                   parsedDateState.getFullYear() === calendarYear;

                                cells.push(
                                  <button
                                    key={`current-${dNum}`}
                                    type="button"
                                    onClick={() => {
                                      const dayStr = dNum.toString().padStart(2, '0');
                                      const monthStr = (calendarMonth + 1).toString().padStart(2, '0');
                                      const yearShort = calendarYear.toString().substring(2);
                                      setDate(`${dayStr}-${monthStr}-${yearShort}`);
                                      setShowCalendar(false);
                                    }}
                                    className={cn(
                                      "py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer block w-full text-center hover:bg-[#F1EFF7]",
                                      isSelected
                                        ? "bg-[#55349A] text-white hover:bg-[#452a7d]"
                                        : "text-slate-600 hover:text-[#55349A]"
                                    )}
                                  >
                                    {dNum}
                                  </button>
                                );
                              }

                              const totalCells = cells.length;
                              const nextCellsCount = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
                              for (let i = 1; i <= nextCellsCount; i++) {
                                cells.push(
                                  <div
                                    key={`next-${i}`}
                                    className="py-1.5 text-xs text-slate-300 font-bold select-none cursor-default"
                                  >
                                    {i}
                                  </div>
                                );
                              }

                              return cells;
                            })()}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="mt-4">
              {isReadOnlyState ? (
                note ? (
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Purchase Note</label>
                    <div className="p-4 bg-surface-50 border border-surface-200 rounded-xl text-sm text-surface-700 font-medium">
                      {note}
                    </div>
                  </div>
                ) : null
              ) : showNoteField ? (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Purchase Note</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Enter purchase note..."
                    rows={3}
                    className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all resize-none"
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowNoteField(true)}
                  className="text-[11px] font-bold text-primary-600 hover:underline"
                >
                  + Add Purchase Note
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Items/Products & Bill Details */}
        <div className="space-y-6 pb-24">
          <div className="bg-white rounded-xl border border-surface-200 shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-surface-100 bg-white relative z-10 shrink-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-surface-900 uppercase tracking-tight">Items/Products Info</h2>
                  <p className="text-xs text-surface-500 font-semibold mt-0.5">
                    {isReadOnlyState
                      ? "List of requested items in this Purchase Request."
                      : "Search and select items to purchase, and configure their batch, qty, and price details inline."
                    }
                  </p>
                </div>
              </div>

              {/* Inline Search Bar */}
              {!isReadOnlyState && (
                <div className="relative mt-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                    <input
                      type="text"
                      placeholder={canSearchItems ? "Search Item by name or SKU..." : "Select a store & inventory catalog first…"}
                      value={search}
                      disabled={!canSearchItems}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        if (selectedItem) setSelectedItem(null);
                      }}
                      className="w-full pl-11 pr-10 py-3 bg-[#F8F9FA] border border-surface-200 rounded-xl text-sm font-bold text-surface-900 focus:ring-4 focus:ring-[#55349A]/5 focus:border-[#55349A] outline-none transition-all placeholder:text-surface-400 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItem(null);
                          setSearch('');
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-surface-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <X className="h-4 w-4 text-surface-400" />
                      </button>
                    )}
                  </div>

                  {/* Floating Search Results */}
                  {showResults && filteredItems.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-2xl z-30 py-2 animate-in fade-in slide-in-from-top-1 duration-200 max-h-[300px] overflow-y-auto">
                      {filteredItems.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelect(item)}
                          className="w-full px-5 py-2.5 hover:bg-surface-50 flex items-center gap-4 transition-colors group text-left cursor-pointer"
                        >
                          <img src={item.image} className="w-8 h-8 rounded-lg object-cover border border-surface-100" />
                          <div className="flex flex-col items-start translate-x-0 group-hover:translate-x-1 transition-transform">
                            <span className="text-sm font-bold text-surface-900">{item.name}</span>
                            <span className="text-xs text-surface-400 font-medium">{item.details} • {item.sku}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Item Inline configuration form */}
              <AnimatePresence>
                {selectedItem && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={cn(
                      "border-t border-dashed border-surface-200 text-left",
                      isRequestMode ? "mt-3 pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-[#F9F8FF] rounded-xl border border-[#DED4F3]/40" : "mt-5 pt-5 space-y-5"
                    )}>
                      {isRequestMode ? (
                        <>
                          {/* Left Side: Product Info (Avatar + Name) */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-surface-200 bg-white p-0.5 shrink-0 shadow-sm">
                              <img src={selectedItem.image} alt="Selected" className="w-full h-full object-cover rounded-md" />
                            </div>
                            <div className="flex flex-col text-left">
                              <h4 className="text-xs font-black text-slate-900 leading-tight">
                                {selectedItem.name}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-bold tracking-tight mt-0.5">
                                {selectedItem.details} • {selectedItem.sku}
                              </p>
                            </div>
                          </div>

                          {/* Right Side: Qty Requested Input on same line, very compact */}
                          <div className="flex items-center gap-2.5 shrink-0">
                            <label className="text-xs font-extrabold text-[#55349A] uppercase tracking-wider whitespace-nowrap">Quantity Requested:</label>
                            <input
                              type="text"
                              value={form.qty}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                handleInputChange('qty', val);
                              }}
                              placeholder="e.g. 50"
                              className="w-24 px-3 py-1.5 bg-white border border-surface-200 rounded-lg text-xs font-bold text-surface-900 focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none transition-all shadow-sm text-center"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Selected Item Details */}
                          <div className="flex items-center gap-4 p-4 bg-[#F1EFF7] rounded-x2 border border-[#DED4F3]/30">
                            <div className="w-12 h-12 rounded-xl overflow-hidden border border-surface-200 bg-white p-0.5 shadow-sm">
                              <img src={selectedItem.image} alt="Selected" className="w-full h-full object-cover rounded-lg" />
                            </div>
                            <div className="flex flex-col text-left">
                              <h4 className="text-sm font-black text-slate-900 leading-tight">
                                {selectedItem.name}
                              </h4>
                              <p className="text-xs text-slate-500 font-bold tracking-tight mt-1">
                                {selectedItem.details} • {selectedItem.sku}
                              </p>
                            </div>
                          </div>
                        <div className="overflow-x-auto pb-4 -mx-2">
                          <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                              <tr className="border-b border-surface-100">
                                <th className="pb-2.5 px-2 text-[10px] font-bold text-surface-400 uppercase tracking-widest">Batch</th>
                                <th className="pb-2.5 px-2 text-[10px] font-bold text-surface-400 uppercase tracking-widest">Unit</th>
                                <th className="pb-2.5 px-2 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center">Qty</th>
                                <th className="pb-2.5 px-2 text-[10px] font-bold text-surface-400 uppercase tracking-widest">Exp Date</th>
                                {/* purchase-fix: removed per-line "Order Catalog" — a purchase receives into the header Inventory Catalog only. */}
                                <th className="pb-2.5 px-2 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center">Free Qty</th>
                                <th className="pb-2.5 px-2 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center">MRP (₹)</th>
                                <th className="pb-2.5 px-2 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center">Pur. Price (₹)</th>
                                <th className="pb-2.5 px-2 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center">Sales Price (₹)</th>
                                <th className="pb-2.5 px-2 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center">Amount (₹)</th>
                                <th className="pb-2.5 px-2 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center">Discount (₹)</th>
                                <th className="pb-2.5 px-2 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-center">Tax</th>
                                <th className="pb-2.5 px-2 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-right">Net Amount (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="py-3 px-1.5">
                                  <div className="relative min-w-[130px]">
                                    {/* purchase-fix: batchNumber is a free String on the line — type a NEW batch (saved on receipt) or pick an existing one. Was a select with a hardcoded dummy option. */}
                                    <input
                                      type="text"
                                      list={`batch-options-${selectedItem?.uid || 'new'}`}
                                      value={form.batch}
                                      onChange={(e) => setForm({...form, batch: e.target.value})}
                                      placeholder="Type or select"
                                      className="w-full pl-3 pr-8 py-2 bg-white border border-surface-200 rounded-xl text-[12px] font-bold text-surface-900 focus:border-primary-500 outline-none transition-all shadow-sm"
                                    />
                                    <datalist id={`batch-options-${selectedItem?.uid || 'new'}`}>
                                      {(selectedItem?.batches || []).map((b: any) => (
                                        <option key={b.uid || b.batchNumber || b} value={b.batchNumber || b} />
                                      ))}
                                    </datalist>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400 pointer-events-none" />
                                  </div>
                                </td>
                                <td className="py-3 px-1.5">
                                  <div className="relative min-w-[110px]">
                                    <select
                                      value={form.unit}
                                      onChange={(e) => setForm({...form, unit: e.target.value})}
                                      className="w-full appearance-none pl-3 pr-8 py-2 bg-white border border-surface-200 rounded-xl text-[12px] font-bold text-surface-900 focus:border-primary-500 outline-none transition-all shadow-sm"
                                    >
                                      {/* purchase-fix: show the item's actual base unit (e.g. "Gram (Gm)"), not a generic "Base unit". */}
                                      <option value="">{selectedItem?.baseUnitUid ? `${unitLabel(selectedItem.baseUnitUid)} · base` : 'Base unit'}</option>
                                      {(selectedItem?.units || [])
                                        .filter((u: any) => u.purchase)
                                        .map((u: any) => (
                                          <option key={u.unitUid} value={u.unitUid}>{unitLabel(u.unitUid)}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400 pointer-events-none" />
                                  </div>
                                </td>
                                <td className="py-3 px-1.5 text-center">
                                  <input
                                    type="text"
                                    value={form.qty}
                                    onChange={(e) => handleInputChange('qty', e.target.value)}
                                    className="w-16 px-2 py-2 bg-white border border-surface-200 rounded-xl text-[12px] font-medium text-surface-900 focus:border-primary-500 outline-none transition-all shadow-sm text-center"
                                  />
                                </td>
                                <td className="py-3 px-1.5">
                                  <div className="relative min-w-[130px]">
                                    {/* purchase-fix: native date picker (backend expiryDate is a real LocalDate) — was a text box with a decorative-only calendar icon. */}
                                    <input
                                      type="date"
                                      value={form.expDate}
                                      onChange={(e) => handleInputChange('expDate', e.target.value)}
                                      className="w-full px-2.5 py-2 bg-white border border-surface-200 rounded-xl text-[12px] font-medium text-surface-900 focus:border-primary-500 outline-none transition-all shadow-sm"
                                    />
                                  </div>
                                </td>
                                {/* purchase-fix: removed the per-line Order Catalog selector (wrong for purchase — receipt goes to the header Inventory Catalog). */}
                                <td className="py-3 px-1.5 text-center">
                                  <input
                                    type="text"
                                    value={form.freeQty}
                                    onChange={(e) => handleInputChange('freeQty', e.target.value)}
                                    className="w-14 px-2 py-2 bg-surface-50 border border-surface-100 rounded-xl text-[12px] font-medium text-surface-600 outline-none text-center"
                                  />
                                </td>
                                <td className="py-3 px-1.5 text-center">
                                  <input
                                    type="text"
                                    value={form.mrp}
                                    onChange={(e) => handleInputChange('mrp', e.target.value)}
                                    className="w-14 px-2 py-2 bg-surface-50 border border-surface-100 rounded-xl text-[12px] font-medium text-surface-600 outline-none text-center"
                                  />
                                </td>
                                <td className="py-3 px-1.5 text-center">
                                  <input
                                    type="text"
                                    value={form.purchasePrice}
                                    onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                                    className="w-20 px-2 py-2 bg-white border border-surface-200 rounded-xl text-[12px] font-medium text-surface-900 focus:border-primary-500 outline-none transition-all shadow-sm text-center"
                                  />
                                </td>
                                <td className="py-3 px-1.5 text-center">
                                  <input
                                    type="text"
                                    value={form.salesPrice}
                                    onChange={(e) => handleInputChange('salesPrice', e.target.value)}
                                    className="w-20 px-2 py-2 bg-white border border-surface-200 rounded-xl text-[12px] font-medium text-surface-900 focus:border-primary-500 outline-none transition-all shadow-sm text-center"
                                  />
                                </td>
                                <td className="py-3 px-1.5 text-center">
                                  <input
                                    type="text"
                                    value={form.amount}
                                    readOnly
                                    className="w-18 px-2 py-2 bg-surface-50 border border-surface-100 rounded-xl text-[12px] font-bold text-surface-900 outline-none text-center"
                                  />
                                </td>
                                <td className="py-3 px-1.5 text-center">
                                  <input
                                    type="text"
                                    value={form.discount}
                                    onChange={(e) => handleInputChange('discount', e.target.value)}
                                    className="w-18 px-2 py-2 bg-white border border-surface-200 rounded-xl text-[12px] font-medium text-surface-900 focus:border-primary-500 outline-none transition-all shadow-sm text-center"
                                  />
                                </td>
                                <td className="py-3 px-1.5">
                                  {/* Single GST rate per line (the common case). Server derives the
                                      CGST/SGST/IGST split from this + supply type. Empty when the
                                      tenant has no taxes configured (or finance-service is down). */}
                                  <div className="relative min-w-[120px]">
                                    <select
                                      value={form.taxUids[0] || ''}
                                      onChange={(e) => setForm({ ...form, taxUids: e.target.value ? [e.target.value] : [] })}
                                      className="w-full appearance-none pl-3 pr-7 py-2 bg-white border border-surface-200 rounded-xl text-[12px] font-bold text-surface-900 focus:border-primary-500 outline-none transition-all shadow-sm cursor-pointer"
                                    >
                                      <option value="">No tax</option>
                                      {taxRates.map((t: any) => (
                                        <option key={t.uid} value={t.uid}>
                                          {t.taxName || t.taxCode}{t.taxPercentage != null ? ` (${t.taxPercentage}%)` : ''}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400 pointer-events-none" />
                                  </div>
                                </td>
                                <td className="py-3 px-1.5 text-right">
                                  <input
                                    type="text"
                                    value={form.netAmount}
                                    readOnly
                                    className="w-20 px-2.5 py-2 bg-surface-50 border border-surface-100 rounded-xl text-[12px] font-bold text-surface-900 outline-none text-right"
                                  />
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </>
                      )}

                      {/* Add Form Action Bar */}
                      <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-100">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(null);
                            setSearch('');
                          }}
                          className="px-5 py-2 bg-white border border-surface-200 text-xs font-bold text-surface-700 hover:bg-surface-100 rounded-xl transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveInline}
                          className="px-6 py-2 bg-[#55349A] hover:bg-opacity-90 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-98 cursor-pointer"
                        >
                          Add to Items List
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex-1 overflow-x-auto w-full">
              {purchasedItems.length === 0 ? (
                <div className="min-h-[220px] flex flex-col items-center justify-center p-8 text-center bg-[#fdfdfd] border-t border-surface-100 rounded-b-xl overflow-hidden">
                  <div className="mb-4 relative">
                    <div className="w-16 h-16 bg-surface-50 rounded-full flex items-center justify-center">
                      <ShoppingBasket className="h-8 w-8 text-[#9EB1D3] stroke-[1px]" />
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-surface-900 mb-1" id="select-items-heading">No items added yet</h3>
                  <p className="text-xs text-surface-500 max-w-xs leading-normal">
                    Please use the search bar above to select items and configure prices.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse border-t border-surface-100 min-w-[#800px]">
                  <thead>
                    <tr className="bg-surface-50/50 border-b border-surface-100">
                      <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest min-w-[220px]">Item Details</th>
                      {isConverting && (
                        <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest whitespace-nowrap">Requested Qty</th>
                      )}
                      <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest whitespace-nowrap">Quantity</th>
                      {!isRequestMode && (
                        <>
                          <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest whitespace-nowrap">Expires</th>
                          {/* purchase-fix: removed "Order Catalog" column from the purchase line table. */}
                        </>
                      )}
                      {!isRequestMode && (
                        <>
                          <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest whitespace-nowrap">MRP (₹)</th>
                          <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest whitespace-nowrap">Pur. Price (₹)</th>
                          <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest whitespace-nowrap">Sales Price (₹)</th>
                          <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest whitespace-nowrap">Disc. (₹)</th>
                          <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest whitespace-nowrap">Tax%</th>
                          <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest whitespace-nowrap">Net. Amount(₹)</th>
                        </>
                      )}
                      {!isReadOnlyState && <th className="py-4 px-6 text-[10px] font-bold text-surface-400 uppercase tracking-widest text-right"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 uppercase">
                    {purchasedItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-surface-50/50 transition-colors align-top">
                        <td className="py-4 px-6">
                          <div className="flex items-start gap-4">
                            <div className="w-11 h-11 rounded-lg overflow-hidden border border-surface-200 bg-white p-0.5 shrink-0">
                               <img src={item.image} className="w-full h-full object-cover rounded-md" />
                            </div>
                            <div className="flex flex-col gap-1.5 min-w-0">
                              <div className="flex flex-col">
                                <span className="text-[13px] font-bold text-surface-900 leading-tight truncate">{item.name}</span>
                                <span className="text-[11px] text-surface-400 font-bold mt-0.5">{item.details}</span>
                              </div>
                              {!isRequestMode && (
                                <div className="px-2 py-0.5 bg-[#EFEBFA] border border-[#DED4F3] rounded text-[10px] font-extrabold text-[#55349A] w-fit whitespace-nowrap">
                                  BATCH {item.batch} - {item.unit}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        {isConverting && (
                          <td className="py-4 px-6">
                            <span className="text-[13px] font-extrabold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/50 block w-fit">
                              {item.requestedQty || '100'} PIECES
                            </span>
                          </td>
                        )}
                        <td className="py-4 px-6">
                          {isReadOnlyState ? (
                            <span className="text-[13px] font-extrabold text-[#55349A] bg-[#EFEBFA] px-3.5 py-1.5 rounded-xl border border-[#DED4F3] block w-fit whitespace-nowrap">
                              {item.qty} PIECES
                            </span>
                          ) : isRequestMode || isConverting ? (
                            <input
                              type="text"
                              value={item.qty}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                setPurchasedItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: val } : it));
                              }}
                              className="w-24 px-3 py-1.5 bg-white border border-surface-200 rounded-xl text-center text-xs font-bold text-surface-900 focus:border-[#55349A] outline-none shadow-sm"
                            />
                          ) : (
                            <span className="text-[13px] font-bold text-surface-700">{item.qty} + 0 FREE</span>
                          )}
                        </td>
                        {!isRequestMode && (
                          <td className="py-4 px-6">
                            <span className="text-[13px] font-bold text-surface-700">{item.expDate.split('/').length > 1 ? item.expDate.split('/').slice(1).join(' ') : item.expDate}</span>
                          </td>
                        )}
                        {/* purchase-fix: removed per-line Order Catalog cell — receipt uses the header Inventory Catalog. */}
                        {!isRequestMode && (
                          <>
                            <td className="py-4 px-6">
                              <span className="text-[13px] font-bold text-surface-700">{parseFloat(item.mrp).toFixed(2)}</span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-[13px] font-bold text-surface-700">{parseFloat(item.purchasePrice).toFixed(2)}</span>
                            </td>
                            <td className="py-4 px-6 min-w-[180px]">
                              <div className="flex flex-col gap-1 text-left">
                                {item.catalogPrices && item.catalogPrices.length > 0 ? (
                                  item.catalogPrices.map((cp: any, cpIdx: number) => (
                                    <div key={cpIdx} className="flex items-center justify-between gap-2 text-[11px]">
                                      <span className="font-medium text-slate-500 truncate max-w-[110px]" title={cp.catalogName}>
                                        {cp.catalogName}:
                                      </span>
                                      <span className="font-extrabold text-[#55349A] shrink-0 font-mono">
                                        ₹{parseFloat(cp.salesPrice).toFixed(2)}
                                      </span>
                                    </div>
                                  ))
                                ) : item.salesPrice ? (
                                  <div className="flex items-center justify-between gap-2 text-[11px]">
                                    <span className="font-medium text-slate-500">
                                      General:
                                    </span>
                                    <span className="font-extrabold text-[#55349A] shrink-0 font-mono">
                                      ₹{parseFloat(item.salesPrice).toFixed(2)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px] font-medium font-mono">—</span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-[13px] font-bold text-surface-700">{parseFloat(item.discount).toFixed(2)}</span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col relative group/tax">
                                <span className="text-[13px] font-bold text-surface-700">0</span>
                                <button
                                  onClick={() => setTaxBreakdownIndex(taxBreakdownIndex === idx ? null : idx)}
                                  className="flex items-center gap-0.5 text-[11px] font-bold text-[#55349A] hover:underline mt-0.5 uppercase w-fit"
                                >
                                  Tax Breakdown
                                  <ArrowUpRight className="h-3 w-3" strokeWidth={3} />
                                </button>

                                <AnimatePresence>
                                  {taxBreakdownIndex === idx && (
                                    <>
                                      <div className="fixed inset-0 z-[40]" onClick={() => setTaxBreakdownIndex(null)} />
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.95, x: 20 }}
                                        animate={{ opacity: 1, scale: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, x: 20 }}
                                        className="absolute right-[-40px] top-0 w-[240px] bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-surface-100 z-[50] overflow-hidden uppercase"
                                      >
                                        <div className="px-5 py-4 border-b border-surface-50 bg-[#F8FAFC]/50 text-left">
                                          <h3 className="text-[13px] font-extrabold text-[#1A1D1F]">Tax Breakdown</h3>
                                        </div>
                                        <div className="p-5 space-y-4">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-bold text-[#6F767E]">CGST%</span>
                                            <span className="text-[12px] font-bold text-[#9A9FA5]">0</span>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-bold text-[#6F767E]">SGST%</span>
                                            <span className="text-[12px] font-bold text-[#9A9FA5]">0</span>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-bold text-[#6F767E]">CESS%</span>
                                            <span className="text-[12px] font-bold text-[#9A9FA5]">0</span>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-bold text-[#6F767E]">CESS Amount(₹)</span>
                                            <span className="text-[12px] font-bold text-[#9A9FA5]">₹ 0.00</span>
                                          </div>
                                          <div className="pt-3 border-t border-dashed border-surface-100 flex items-center justify-between">
                                            <span className="text-[12px] font-bold text-[#6F767E]">Taxable amount(₹)</span>
                                            <span className="text-[13px] font-black text-[#1A1D1F]">₹ 0.00</span>
                                          </div>
                                        </div>
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-[13px] font-black text-surface-900">{parseFloat(item.netAmount).toFixed(2)}</span>
                            </td>
                          </>
                        )}
                        {!isReadOnlyState && (
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isRequestMode && (
                                <button className="w-9 h-9 flex items-center justify-center bg-[#F0EBFF] text-[#55349A] rounded-xl border border-[#DED4F3] hover:bg-[#DED4F3] transition-colors shadow-sm active:scale-95">
                                  <Pencil className="h-4 w-4" strokeWidth={2.5} />
                                </button>
                              )}
                              <button
                                onClick={() => setPurchasedItems(purchasedItems.filter((_, i) => i !== idx))}
                                className="w-9 h-9 flex items-center justify-center bg-[#FFF0F0] text-danger-600 rounded-xl border border-[#FFD8D8] hover:bg-[#FFD8D8] transition-colors shadow-sm active:scale-95"
                              >
                                <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {purchasedItems.length > 0 && (
            <div className="grid grid-cols-12">
              <div className="col-span-12 lg:col-start-9 lg:col-span-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden flex flex-col h-fit sticky top-6">
                  <div className="px-6 py-4 border-b border-surface-100 bg-white">
                    <h2 className="text-sm font-bold text-surface-900 tracking-tight">
                      {isRequestMode ? "Request Details" : "Bill Details"}
                    </h2>
                  </div>

                  {isRequestMode ? (
                    <div className="p-6 space-y-4 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-surface-400 uppercase tracking-widest">Total Items</span>
                        <span className="text-[13px] text-surface-900 font-bold">
                          {purchasedItems.length} Products
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-surface-400 uppercase tracking-widest">Total Qty Requested</span>
                        <span className="text-[13px] text-surface-900 font-bold">
                          {purchasedItems.reduce((acc, item) => acc + (parseFloat(item.qty) || 0), 0)} Pieces
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-surface-400 uppercase tracking-widest">Total quantity</span>
                          <span className="text-[13px] text-surface-900 font-bold">
                            {purchasedItems.reduce((acc, item) => acc + (parseFloat(item.qty) || 0) + (parseFloat(item.freeQty) || 0), 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-surface-400 uppercase tracking-widest">Gross amount</span>
                          <span className="text-[13px] text-surface-900 font-black">
                            ₹{purchasedItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-surface-400 uppercase tracking-widest">CGST%</span>
                          <span className="text-[13px] text-surface-900 font-bold">0</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-surface-400 uppercase tracking-widest">SGST%</span>
                          <span className="text-[13px] text-surface-900 font-bold">0</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-surface-400 uppercase tracking-widest">CESS%</span>
                          <span className="text-[13px] text-surface-900 font-bold">0</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-surface-400 uppercase tracking-widest">CESS Amount(₹)</span>
                          <span className="text-[13px] text-surface-400 font-bold">₹ 0.00</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-surface-400 uppercase tracking-widest">Taxable amount(₹)</span>
                          <span className="text-[13px] text-surface-900 font-black">
                            ₹{purchasedItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-surface-50">
                          <span className="text-[11px] font-bold text-surface-400 uppercase tracking-widest">Round Off</span>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-surface-400">₹</span>
                            <input
                              type="text"
                              value={purchasedItems.reduce((acc, item) => acc + (parseFloat(item.netAmount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              readOnly
                              className="w-36 pl-7 pr-4 py-2.5 bg-[#F8F9FA] border border-surface-200 rounded-xl text-[13px] font-black text-surface-900 focus:outline-none text-right shadow-sm"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-[#F8F9FA] border-t border-dashed border-surface-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] text-surface-900 font-bold">Net Bill Amount(₹)</span>
                          <span className="text-lg font-black text-surface-900">
                            ₹{purchasedItems.reduce((acc, item) => acc + (parseFloat(item.netAmount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      {purchasedItems.length > 0 && (
        <div className="fixed bottom-0 right-0 left-0 bg-white/80 backdrop-blur-md border-t border-surface-200 px-8 py-5 flex items-center justify-end gap-3 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
          <button
            onClick={onBack}
            className="px-6 py-2.5 text-sm font-black text-surface-500 hover:text-surface-900 transition-colors"
          >
            {isReadOnlyState ? "Back to Purchases" : "Cancel"}
          </button>
          {isReadOnlyState ? (
            <button
              type="button"
              onClick={() => {
                setIsReadOnlyState(false);
                setIsRequestMode(false);
              }}
              className="px-12 py-3 bg-[#55349A] hover:bg-opacity-95 text-white rounded-xl text-[13px] font-black shadow-lg shadow-primary-500/20 active:scale-95 min-w-[220px]"
            >
              Convert to Purchase Order
            </button>
          ) : isRequestMode ? (
            <button
              onClick={() => onCreate({
                purchaseNo,
                billNo,
                date,
                vendor: selectedVendor,
                store: selectedStore,
                catalog: selectedCatalog,
                note,
                items: purchasedItems,
                isRequest: true
              })}
              className="px-12 py-3 bg-[#55349A] text-white rounded-xl text-[13px] font-black hover:bg-opacity-90 transition-all shadow-lg shadow-primary-500/20 active:scale-95 min-w-[220px]"
            >
              Request for Purchase
            </button>
          ) : (
            <>
              {/* purchase-fix: Bill No + Bill Date are mandatory on a purchase entry (not on a request). */}
              {!isRequestMode && (!billNo.trim() || !billDate) && (
                <span className="text-[11px] font-bold text-rose-500 self-center mr-2">Bill No &amp; Bill Date are required</span>
              )}
              <button
                disabled={!isRequestMode && (!billNo.trim() || !billDate)}
                onClick={() => onCreate({
                  purchaseNo,
                  billNo,
                  billDate,
                  date,
                  supplyType,
                  vendor: selectedVendor,
                  vendorName: vendorsList.find(v => v.id === selectedVendor)?.name,
                  store: selectedStore,
                  storeName: storesList.find(s => s.id === selectedStore)?.name,
                  catalog: selectedCatalog,
                  note,
                  items: purchasedItems
                })}
                className="px-8 py-3 bg-[#1A1D1F] text-white rounded-xl text-[13px] font-black hover:bg-opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save Purchase
              </button>
              <button
                disabled={!isRequestMode && (!billNo.trim() || !billDate)}
                onClick={() => onSend?.({
                  purchaseNo,
                  billNo,
                  billDate,
                  date,
                  supplyType,
                  vendor: selectedVendor,
                  vendorName: vendorsList.find(v => v.id === selectedVendor)?.name,
                  store: selectedStore,
                  storeName: storesList.find(s => s.id === selectedStore)?.name,
                  catalog: selectedCatalog,
                  note,
                  items: purchasedItems
                })}
                className="px-12 py-3 bg-[#55349A] text-white rounded-xl text-[13px] font-black hover:bg-opacity-90 transition-all shadow-lg shadow-primary-500/20 active:scale-95 min-w-[220px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Create & Send
              </button>
            </>
          )}
        </div>
      )}


      {/* Custom Add Vendor Modal Popup matching the design criteria exactly */}
      <AnimatePresence>
        {showAddVendorModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-4">
            <div className="fixed inset-0" onClick={() => setShowAddVendorModal(false)} />
            <motion.form
              onSubmit={handleAddVendorSubmit}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-slate-100 z-10 text-left space-y-6"
            >
              {/* Close Circular Button */}
              <button
                type="button"
                onClick={() => setShowAddVendorModal(false)}
                className="absolute top-6 right-6 p-2 bg-[#F1EFF7] hover:bg-[#E9E4F5] text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-[#55349A]" strokeWidth={3} />
              </button>

              <div>
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Add Brand New Vendor
                </h3>
                <p className="text-sm font-semibold text-slate-400 leading-normal mt-2">
                  Create a top-level vendor entry to catalog procurement records instantly.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-[#8FA3C7] uppercase tracking-wider block">
                  VENDOR NAME
                </label>
                <input
                  type="text"
                  placeholder="Vendor name"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  className="w-full px-5 py-4 bg-white border-2 border-violet-100/80 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#55349A] focus:ring-4 focus:ring-[#55349A]/5 transition-all outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVendorModal(false)}
                  className="px-6 py-3 bg-[#EEF2F6] hover:bg-[#E3E8F0] text-slate-600 font-bold text-sm rounded-2xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#55349A] hover:bg-[#452a7d] text-white font-bold text-sm rounded-2xl transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  Add Vendor
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
