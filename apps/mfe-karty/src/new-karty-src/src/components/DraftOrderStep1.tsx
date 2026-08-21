import React, { useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Store,
  BookOpen,
  User,
  Users,
  Building2,
  Check,
  Search,
  Plus,
  Zap,
  Phone,
  Mail,
  MapPin,
  Receipt,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface DraftOrderStep1Props {
  availableStores: { name: string; code?: string; id?: string }[];
  selectedStore: string;
  setSelectedStore: (storeName: string) => void;
  availableCatalogs: string[];
  selectedCatalogs: string[];
  setSelectedCatalogs: React.Dispatch<React.SetStateAction<string[]>>;
  selectedInvoiceType: string;
  setSelectedInvoiceType: (type: string) => void;
  customerMode: 'guest' | 'existing' | 'create';
  setCustomerMode: (mode: 'guest' | 'existing' | 'create') => void;
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  newCustomerName: string;
  setNewCustomerName: (name: string) => void;
  newCustomerPhone: string;
  setNewCustomerPhone: (phone: string) => void;
  newCustomerEmail: string;
  setNewCustomerEmail: (email: string) => void;
  newCustomerAddress: string;
  setNewCustomerAddress: (address: string) => void;
  existingCustomers: any[];
  searchCustomerQuery: string;
  setSearchCustomerQuery: (q: string) => void;
  searchB2bPartnerQuery: string;
  setSearchB2bPartnerQuery: (q: string) => void;
  businessName: string;
  setBusinessName: (b: string) => void;
  enableOrderPreSetup: boolean;
  setEnableOrderPreSetup: (enabled: boolean) => void;
  onProceed: () => void;
  onCancel: () => void;
}

export const DraftOrderStep1: React.FC<DraftOrderStep1Props> = ({
  availableStores,
  selectedStore,
  setSelectedStore,
  availableCatalogs,
  selectedCatalogs,
  setSelectedCatalogs,
  selectedInvoiceType,
  setSelectedInvoiceType,
  customerMode,
  setCustomerMode,
  selectedCustomerId,
  setSelectedCustomerId,
  newCustomerName,
  setNewCustomerName,
  newCustomerPhone,
  setNewCustomerPhone,
  newCustomerEmail,
  setNewCustomerEmail,
  newCustomerAddress,
  setNewCustomerAddress,
  existingCustomers,
  searchCustomerQuery,
  setSearchCustomerQuery,
  businessName,
  setBusinessName,
  enableOrderPreSetup,
  setEnableOrderPreSetup,
  onProceed,
  onCancel
}) => {
  // Filtered customer list for CRM search
  const filteredCustomers = useMemo(() => {
    const q = searchCustomerQuery.trim().toLowerCase();
    if (!q) return (existingCustomers || []).slice(0, 5);
    return (existingCustomers || []).filter(c => {
      const name = (c.name || c.displayName || `${c.firstName || ''} ${c.lastName || ''}`).toLowerCase();
      const phone = (c.phone || c.mobile || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    }).slice(0, 6);
  }, [existingCustomers, searchCustomerQuery]);

  const selectedCustomerObj = useMemo(() => {
    if (!selectedCustomerId) return null;
    return (existingCustomers || []).find(c => (c.id || c.uid) === selectedCustomerId) || null;
  }, [existingCustomers, selectedCustomerId]);

  const toggleCatalog = (catName: string) => {
    setSelectedCatalogs(prev => {
      if (prev.includes(catName)) {
        if (prev.length === 1) return prev;
        return prev.filter(c => c !== catName);
      } else {
        return [...prev, catName];
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 font-sans h-full overflow-hidden">
      {/* 1. TOP HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-3xs z-20">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            title="Back to Orders"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Create New Order</h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-100 text-[#55349A] border border-[#55349A]/20">
                Step 1: Configuration
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Select order type, customer identity, store, and product catalogs
            </p>
          </div>
        </div>

        {/* Step Breadcrumbs & Top Action Buttons */}
        <div className="flex items-center gap-3.5">
          {/* Breadcrumb Steps */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-bold">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#55349A] text-white shadow-3xs">
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
              <span>Order Setup</span>
            </span>
            <span className="text-slate-300">›</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-400">
              <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">2</span>
              <span>POS Catalog & Items</span>
            </span>
            <span className="text-slate-300">›</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-400">
              <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">3</span>
              <span>Invoice</span>
            </span>
          </div>



          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onProceed}
            className="flex items-center gap-2 px-5 py-2 bg-[#55349A] hover:bg-[#43287A] text-white rounded-xl text-xs font-bold shadow-md shadow-purple-900/15 transition-all active:scale-98 cursor-pointer"
          >
            <span>Proceed to POS Catalog</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* 2. BODY CONTENT: BALANCED 2x2 GRID (Fills nicely, no vast empty space) */}
      <main className="flex-1 overflow-y-auto p-5 md:p-6 min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-7xl mx-auto h-full items-stretch">

          {/* CARD 1: COMMERCIAL MODE & ORDER TYPE */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-3xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <span className="text-[#55349A]">1.</span> Commercial Mode & Order Type <span className="text-rose-500">*</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-400">Mode: {selectedInvoiceType}</span>
              </div>
              <p className="text-[11px] text-slate-400">Select retail counter sales or wholesale B2B billing</p>

              <div className="grid grid-cols-2 gap-3 mt-4">
                {/* B2C Retail */}
                <div
                  onClick={() => setSelectedInvoiceType('B2C')}
                  className={cn(
                    "border-2 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between select-none relative",
                    selectedInvoiceType === 'B2C'
                      ? "border-[#55349A] bg-[#F3E8FF]/20 shadow-xs ring-1 ring-[#55349A]/30"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-[#55349A] font-black text-[10px]">
                      B2C
                    </span>
                    {selectedInvoiceType === 'B2C' && (
                      <span className="w-5 h-5 rounded-full bg-[#55349A] text-white flex items-center justify-center text-[10px]">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Retail (B2C)</h4>
                    <p className="text-[10.5px] text-slate-500 mt-0.5">Direct counter consumer sale</p>
                  </div>
                </div>

                {/* B2B Wholesale */}
                <div
                  onClick={() => setSelectedInvoiceType('B2B')}
                  className={cn(
                    "border-2 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between select-none relative",
                    selectedInvoiceType === 'B2B'
                      ? "border-[#55349A] bg-[#F3E8FF]/20 shadow-xs ring-1 ring-[#55349A]/30"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-black text-[10px]">
                      B2B
                    </span>
                    {selectedInvoiceType === 'B2B' && (
                      <span className="w-5 h-5 rounded-full bg-[#55349A] text-white flex items-center justify-center text-[10px]">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Wholesale (B2B)</h4>
                    <p className="text-[10.5px] text-slate-500 mt-0.5">Trade partner credit billing</p>
                  </div>
                </div>
              </div>
            </div>

            {selectedInvoiceType === 'B2B' && (
              <div className="pt-3 border-t border-slate-100">
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Company / Trade Partner Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Auto Care Pvt Ltd"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#55349A] focus:bg-white"
                />
              </div>
            )}
          </div>

          {/* CARD 2: CUSTOMER IDENTITY */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-3xs flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <span className="text-[#55349A]">2.</span> Customer Identity
                </h3>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-md",
                  customerMode === 'guest'
                    ? "bg-slate-100 text-slate-600"
                    : customerMode === 'existing' && selectedCustomerId
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-purple-100 text-[#55349A]"
                )}>
                  {customerMode === 'guest' ? 'Walk-in' : customerMode === 'existing' && selectedCustomerId ? 'Attached' : 'New Profile'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Quick walk-in, registered CRM, or new profile</p>

              {/* Segmented Control */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode('guest');
                    setSelectedCustomerId('');
                  }}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none",
                    customerMode === 'guest' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Zap className="h-3 w-3 text-amber-500" />
                  <span>Walk-in</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomerMode('existing')}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none",
                    customerMode === 'existing' ? "bg-white text-[#55349A] shadow-xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Search className="h-3 w-3" />
                  <span>Search Member</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode('create');
                    setSelectedCustomerId('');
                  }}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none",
                    customerMode === 'create' ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Plus className="h-3 w-3" />
                  <span>+ New Profile</span>
                </button>
              </div>

              {/* Mode 1: Walk-in */}
              {customerMode === 'guest' && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black">
                      ⚡
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">Walk-in Counter Customer</h5>
                      <p className="text-[10.5px] text-slate-400">Anonymous instant retail billing</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Active
                  </span>
                </div>
              )}

              {/* Mode 2: CRM Search */}
              {customerMode === 'existing' && (
                <div className="space-y-2 mt-3">
                  {selectedCustomerObj ? (
                    <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#55349A] text-white flex items-center justify-center text-xs font-black">
                          {(selectedCustomerObj.name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">{selectedCustomerObj.name || selectedCustomerObj.displayName}</h5>
                          <p className="text-[10.5px] text-slate-500 font-mono">
                            {[selectedCustomerObj.phone, selectedCustomerObj.email].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomerId('')}
                        className="text-slate-500 hover:text-slate-800 text-xs font-bold px-2.5 py-1 bg-white rounded-lg border border-slate-200 shadow-3xs cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={searchCustomerQuery}
                          onChange={(e) => setSearchCustomerQuery(e.target.value)}
                          placeholder="Search name, phone, or CRM ID..."
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#55349A] focus:bg-white"
                          autoFocus
                        />
                      </div>

                      <div className="mt-2 max-h-36 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100 shadow-3xs">
                        {filteredCustomers.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400">No member found</div>
                        ) : (
                          filteredCustomers.map((c) => (
                            <div
                              key={c.id || c.uid}
                              onClick={() => {
                                setSelectedCustomerId(c.id || c.uid);
                                setSearchCustomerQuery('');
                              }}
                              className="p-2 hover:bg-purple-50 flex items-center justify-between cursor-pointer transition-colors text-left"
                            >
                              <div className="text-xs font-bold text-slate-900">{c.name || c.displayName}</div>
                              <span className="text-[10px] font-bold text-[#55349A]">+ Select</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 3: New Customer */}
              {customerMode === 'create' && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Full Name *"
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#55349A] focus:bg-white"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="Phone Number *"
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#55349A] focus:bg-white"
                  />
                  <input
                    type="email"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    placeholder="Email (Optional)"
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#55349A] focus:bg-white"
                  />
                  <input
                    type="text"
                    value={newCustomerAddress}
                    onChange={(e) => setNewCustomerAddress(e.target.value)}
                    placeholder="Delivery Address"
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#55349A] focus:bg-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* CARD 3: FULFILLMENT STORE */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-3xs flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <span className="text-[#55349A]">3.</span> Fulfillment Store <span className="text-rose-500">*</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  {availableStores?.length || 0} Stores
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Physical warehouse or branch fulfilling the order</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 max-h-44 overflow-y-auto pr-1">
                {(availableStores || []).map((store) => {
                  const isSelected = selectedStore === store.name;
                  return (
                    <div
                      key={store.name}
                      onClick={() => setSelectedStore(store.name)}
                      className={cn(
                        "border-2 rounded-xl p-3 cursor-pointer transition-all flex items-center justify-between select-none",
                        isSelected
                          ? "border-[#55349A] bg-[#F3E8FF]/20 shadow-xs ring-1 ring-[#55349A]/30"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold",
                          isSelected ? "bg-[#55349A] text-white" : "bg-slate-100 text-slate-600"
                        )}>
                          <Store className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{store.name}</h4>
                          {store.code && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(store.code) && (
                            <span className="text-[9.5px] text-slate-400 font-mono block">{store.code}</span>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-[#55349A] text-white flex items-center justify-center text-[9px]">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CARD 4: PRODUCT CATALOGS */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-3xs flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <span className="text-[#55349A]">4.</span> Product Catalogs <span className="text-rose-500">*</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  {selectedCatalogs.length} Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Product scope available for POS selection</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 max-h-44 overflow-y-auto pr-1">
                {(availableCatalogs || []).map((cat) => {
                  const isSelected = selectedCatalogs.includes(cat);
                  return (
                    <div
                      key={cat}
                      onClick={() => toggleCatalog(cat)}
                      className={cn(
                        "border-2 rounded-xl p-3 cursor-pointer transition-all flex items-center justify-between select-none",
                        isSelected
                          ? "border-[#55349A] bg-[#F3E8FF]/20 shadow-xs ring-1 ring-[#55349A]/30"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold",
                          isSelected ? "bg-[#55349A] text-white" : "bg-slate-100 text-slate-600"
                        )}>
                          <BookOpen className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{cat}</h4>
                          <span className="text-[9.5px] text-slate-400 font-mono block">Active Catalog</span>
                        </div>
                      </div>

                      <div className={cn(
                        "w-4 h-4 rounded-md border flex items-center justify-center transition-colors",
                        isSelected ? "bg-[#55349A] border-[#55349A] text-white" : "border-slate-300 bg-white"
                      )}>
                        {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default DraftOrderStep1;
