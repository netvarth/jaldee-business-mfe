import React, { useState, useMemo, useEffect } from 'react';
import {
  X, ArrowLeft, ArrowRight, Check, Search, Plus, Minus, Trash2,
  ShoppingCart, User, UserPlus, Store, Building2, FileText, CheckCircle2,
  AlertTriangle, ShieldAlert, CreditCard, Banknote, QrCode, Globe, Clock,
  Calendar, Stethoscope, Pill, Printer, Download, Sparkles, RefreshCw,
  Phone, Mail, MapPin, ChevronRight, CheckCircle, ChevronLeft
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useStores } from '../../services/useStores';
import { useStoreCapabilities } from '../../services/useCapabilities';
import { useCustomers, useCreateCustomer } from '../../services/useCustomers';
import { useItems } from '../../services/useItems';
import { useInventoryStock } from '../../services/useStock';
import { useOrderCatalogs } from '../../services/useOrderCatalogs';
import { useStoreCatalogProducts } from '../../services/useOrderCatalogItems';
import { useUnits } from '../../services/useUnits';
import { useCreateOrder, useRecordOrderPayment } from '../../services/useOrders';
import { CapabilityPanelSlots } from './panelRegistry';
import { RxPrescriberData } from './panels/RxPrescriberPanel';
import { DosageCalculator } from './panels/DosageCalculator';

export interface OrderComposerProps {
  isOpen?: boolean;
  onClose: () => void;
  mode?: 'standard' | 'prescription';
  initialStoreUid?: string;
  initialCustomer?: { id?: string; name?: string; phone?: string; email?: string };
  initialPrescriber?: Partial<RxPrescriberData>;
  initialItems?: any[];
  onSuccess?: (order: any) => void;
}

export interface CartLineItem {
  id: string;
  itemUid: string;
  name: string;
  category?: string;
  sku?: string;
  price: number;
  qty: number;
  unitPrice?: number;
  unitUid?: string;
  selectedUnit?: string;
  batchUid?: string;
  batchNumber?: string;
  drugSchedule?: string;
  requiresPrescription?: boolean;
  packageSize?: number;
  dosageSummary?: string;
}

export const OrderComposer: React.FC<OrderComposerProps> = ({
  isOpen = true,
  onClose,
  mode = 'standard',
  initialStoreUid,
  initialCustomer,
  initialPrescriber,
  initialItems,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const isPharmaMode = mode === 'prescription';

  // --- Stores & Capabilities ---
  const { data: rawStores = [] } = useStores();
  const stores = useMemo(() => Array.isArray(rawStores) ? rawStores : [], [rawStores]);

  const defaultStoreUid = useMemo(() => {
    if (initialStoreUid) return initialStoreUid;
    if (isPharmaMode) {
      const pharma = stores.find((s: any) => s.verticalType === 'PHARMACY' || s.type === 'PHARMACY' || s.verticalType === 'AYURVEDA');
      if (pharma) return pharma.id || pharma.uid;
    }
    return stores[0]?.id || stores[0]?.uid || '';
  }, [stores, initialStoreUid, isPharmaMode]);

  const [selectedStoreUid, setSelectedStoreUid] = useState<string>(defaultStoreUid);

  useEffect(() => {
    if (!selectedStoreUid && defaultStoreUid) {
      setSelectedStoreUid(defaultStoreUid);
    }
  }, [defaultStoreUid, selectedStoreUid]);

  const selectedStoreObj = useMemo(() => {
    return stores.find((s: any) => (s.id || s.uid) === selectedStoreUid) || stores[0];
  }, [stores, selectedStoreUid]);

  const { data: storeCaps = {} } = useStoreCapabilities(selectedStoreUid || undefined);

  // --- Customers ---
  const { data: customers = [] } = useCustomers();
  const createCustomerMutation = useCreateCustomer();
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(initialCustomer || null);
  const [customerMode, setCustomerMode] = useState<'walkin' | 'existing' | 'create'>(
    initialCustomer ? 'existing' : 'walkin'
  );
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');

  // --- Catalogs & Products ---
  const { data: catalogs = [] } = useOrderCatalogs();
  const [selectedCatalogUid, setSelectedCatalogUid] = useState<string>('');
  const activeCatalog = useMemo(() => {
    if (selectedCatalogUid) return catalogs.find((c: any) => (c.uid || c.id) === selectedCatalogUid);
    return catalogs[0];
  }, [catalogs, selectedCatalogUid]);

  const { data: catalogProducts = [] } = useStoreCatalogProducts(
    selectedStoreUid || undefined,
    activeCatalog?.uid || activeCatalog?.id || undefined
  );
  const { data: allItems = [] } = useItems();
  const { data: stockItems = [] } = useInventoryStock(selectedStoreUid || undefined);

  // Unified items list
  const availableItems = useMemo(() => {
    const list = catalogProducts.length > 0 ? catalogProducts : allItems;
    return list.map((item: any) => {
      const stock = stockItems.find((s: any) => (s.itemUid || s.uid) === (item.itemUid || item.uid || item.id));
      return {
        id: item.uid || item.id || item.itemUid,
        itemUid: item.itemUid || item.uid || item.id,
        name: item.name || item.itemName || 'Item',
        category: item.category || item.categoryName || 'General',
        sku: item.sku || item.code || '',
        price: Number(item.price || item.mrp || item.unitPrice || 0),
        drugSchedule: item.drugSchedule || item.schedule || null,
        requiresPrescription: Boolean(
          item.drugSchedule &&
          item.drugSchedule !== 'NONE' &&
          item.drugSchedule !== 'SCHEDULE_NONE'
        ),
        inHand: stock?.inHand ?? stock?.totalInHand ?? null,
        packageSize: item.packageSize || item.unitsPerPack || 10,
      };
    });
  }, [catalogProducts, allItems, stockItems]);

  const [itemSearch, setItemSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categories = useMemo(() => {
    const set = new Set<string>();
    availableItems.forEach((i: any) => { if (i.category) set.add(i.category); });
    return ['ALL', ...Array.from(set)];
  }, [availableItems]);

  const filteredItems = useMemo(() => {
    return availableItems.filter((i: any) => {
      const matchesSearch =
        i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        i.sku.toLowerCase().includes(itemSearch.toLowerCase());
      const matchesCat = selectedCategory === 'ALL' || i.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [availableItems, itemSearch, selectedCategory]);

  // --- Cart ---
  const [cart, setCart] = useState<CartLineItem[]>(initialItems || []);

  const hasScheduledDrugs = useMemo(() => {
    return cart.some(c => c.requiresPrescription || (c.drugSchedule && c.drugSchedule !== 'NONE'));
  }, [cart]);

  // --- Clinical Prescriber State ---
  const [prescriberData, setPrescriberData] = useState<RxPrescriberData>({
    prescriberName: initialPrescriber?.prescriberName || '',
    prescriberRegNo: initialPrescriber?.prescriberRegNo || '',
    hospitalName: initialPrescriber?.hospitalName || '',
    prescriptionRef: initialPrescriber?.prescriptionRef || '',
    prescriptionDate: initialPrescriber?.prescriptionDate || new Date().toISOString().split('T')[0],
    patientName: initialPrescriber?.patientName || initialCustomer?.name || '',
    patientAge: initialPrescriber?.patientAge || '',
    patientGender: initialPrescriber?.patientGender || 'MALE',
    patientAddress: initialPrescriber?.patientAddress || '',
  });

  const [isPrescriberExpanded, setIsPrescriberExpanded] = useState<boolean>(
    isPharmaMode || hasScheduledDrugs
  );

  const handlePrescriberChange = (field: keyof RxPrescriberData, value: string) => {
    setPrescriberData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (selectedCustomer?.name && !prescriberData.patientName) {
      setPrescriberData(prev => ({ ...prev, patientName: selectedCustomer.name }));
    }
  }, [selectedCustomer]);

  function addToCart(item: any) {
    setCart(prev => {
      const existing = prev.find(c => c.itemUid === item.itemUid);
      if (existing) {
        return prev.map(c => c.itemUid === item.itemUid ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, {
        id: item.id,
        itemUid: item.itemUid,
        name: item.name,
        category: item.category,
        sku: item.sku,
        price: item.price,
        qty: 1,
        unitPrice: item.price,
        drugSchedule: item.drugSchedule,
        requiresPrescription: item.requiresPrescription,
        packageSize: item.packageSize,
      }];
    });
  }

  function updateQty(itemUid: string, qty: number, dosageSummary?: string) {
    if (qty <= 0) {
      removeFromCart(itemUid);
      return;
    }
    setCart(prev => prev.map(c => {
      if (c.itemUid === itemUid) {
        return {
          ...c,
          qty,
          dosageSummary: dosageSummary || c.dosageSummary,
        };
      }
      return c;
    }));
  }

  function removeFromCart(itemUid: string) {
    setCart(prev => prev.filter(c => c.itemUid !== itemUid));
  }

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + ((item.unitPrice || item.price) * item.qty), 0);
  }, [cart]);

  const taxAmount = useMemo(() => {
    return Math.round(subtotal * 0.05 * 100) / 100;
  }, [subtotal]);

  const totalAmount = subtotal + taxAmount;

  // --- Step 3: Payment & Settlement ---
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'CREDIT'>('CASH');
  const [amountPaid, setAmountPaid] = useState<number>(totalAmount);
  const [billingAddress, setBillingAddress] = useState(prescriberData.patientAddress || '');
  const [shippingAddress, setShippingAddress] = useState(prescriberData.patientAddress || '');
  const [createdOrderResult, setCreatedOrderResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    setAmountPaid(totalAmount);
  }, [totalAmount]);

  const createOrderMutation = useCreateOrder();
  const recordPaymentMutation = useRecordOrderPayment();

  const prescriberValid = useMemo(() => {
    if (!hasScheduledDrugs && !isPharmaMode) return true;
    return Boolean(
      prescriberData.prescriberName?.trim() &&
      prescriberData.prescriberRegNo?.trim() &&
      (prescriberData.patientName?.trim() || selectedCustomer?.name?.trim())
    );
  }, [hasScheduledDrugs, isPharmaMode, prescriberData, selectedCustomer]);

  async function handleFinalSubmit() {
    if (!selectedStoreUid) {
      setSubmissionError('Please select a store to fulfill this order.');
      return;
    }
    if (cart.length === 0) {
      setSubmissionError('Cannot submit an empty order. Please add at least 1 item.');
      return;
    }
    if (hasScheduledDrugs && !prescriberValid) {
      setSubmissionError('Scheduled controlled drugs require Doctor Name, Reg No, and Patient Name.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const payload: any = {
        storeUid: selectedStoreUid,
        consumerUid: selectedCustomer?.id || selectedCustomer?.uid || null,
        consumerName: selectedCustomer?.name || prescriberData.patientName || 'Walk-in Customer',
        consumerPhone: selectedCustomer?.phone || null,
        channel: 'WALKIN',
        billingAddress: billingAddress || prescriberData.patientAddress || null,
        shippingAddress: shippingAddress || prescriberData.patientAddress || null,
        prescriberName: prescriberData.prescriberName || null,
        prescriberRegNo: prescriberData.prescriberRegNo || null,
        hospitalName: prescriberData.hospitalName || null,
        prescriptionRef: prescriberData.prescriptionRef || null,
        patientName: prescriberData.patientName || selectedCustomer?.name || null,
        patientAddress: prescriberData.patientAddress || null,
        catalogs: activeCatalog?.uid ? [activeCatalog.uid] : [],
        items: cart.map(line => ({
          itemUid: line.itemUid,
          qty: line.qty,
          sellQty: line.qty,
          unitPrice: line.unitPrice || line.price,
          unitUid: line.unitUid || null,
          batchUid: line.batchUid || null,
          rxRequiredQty: line.qty,
        })),
      };

      const res = await createOrderMutation.mutateAsync(payload);
      const createdUid = res?.uid || res?.id;

      if (createdUid && amountPaid > 0) {
        try {
          await recordPaymentMutation.mutateAsync({
            uid: createdUid,
            mode: paymentMode,
            amount: amountPaid,
          });
        } catch (payErr) {
          console.warn('[OrderComposer] offline payment settlement warning', payErr);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['drug-register'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });

      setCreatedOrderResult(res || { uid: createdUid, orderNo: 'ORD-PROCESSED', totalAmount });
      if (onSuccess) onSuccess(res);
    } catch (err: any) {
      console.error('[OrderComposer] order creation failed', err);
      setSubmissionError(err?.message || 'Failed to create order. Please check required fields.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  // Theme accents
  const primaryBg = isPharmaMode ? 'bg-[#0d9488]' : 'bg-[#55349A]';
  const primaryHoverBg = isPharmaMode ? 'hover:bg-[#0f766e]' : 'hover:bg-[#462980]';
  const primaryText = isPharmaMode ? 'text-[#0d9488]' : 'text-[#55349A]';
  const primaryBorder = isPharmaMode ? 'border-[#0d9488]' : 'border-[#55349A]';

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col font-sans animate-in fade-in duration-150">

      {/* 1. TOP FULL-PAGE HEADER BAR */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={15} />
            <span>Back to Orders</span>
          </button>

          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs ${
              isPharmaMode ? 'bg-teal-50 text-teal-700 border border-teal-200/60' : 'bg-purple-50 text-[#55349A] border border-purple-200/60'
            }`}>
              {isPharmaMode ? <Stethoscope size={20} /> : <ShoppingCart size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {isPharmaMode ? 'New Rx Prescription Dispense' : 'Create New Order'}
                </h1>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  STEP {step}/3
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {step === 1 && 'Select fulfilling store location & customer profile'}
                {step === 2 && 'Scan items, clinical dosing & prescriber validation'}
                {step === 3 && 'Review invoice summary, payment settlement & receipt'}
              </p>
            </div>
          </div>
        </div>

        {/* Stepper Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 text-xs font-bold">
            {[
              { s: 1, label: '1. Customer & Store' },
              { s: 2, label: '2. Products & Cart' },
              { s: 3, label: '3. Payment' },
            ].map(({ s, label }) => (
              <button
                key={s}
                type="button"
                onClick={() => { if (s < step) setStep(s as any); }}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  step === s
                    ? isPharmaMode ? 'bg-teal-700 text-white shadow-xs' : 'bg-[#55349A] text-white shadow-xs'
                    : s < step
                    ? 'text-slate-700 hover:bg-white/80'
                    : 'text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* 2. FULL-PAGE BODY CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-6 pb-24">

        {/* STEP 1: Store & Customer Selection */}
        {step === 1 && (
          <div className="max-w-4xl mx-auto space-y-6">

            {/* Store Selection Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  <Store size={16} className={primaryText} />
                  <span>Fulfilling Store / Dispensary Location</span>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {stores.length} store{stores.length !== 1 ? 's' : ''} available
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {stores.map((s: any) => {
                  const isSelected = (s.id || s.uid) === selectedStoreUid;
                  const isPharma = s.verticalType === 'PHARMACY' || s.type === 'PHARMACY';
                  return (
                    <div
                      key={s.id || s.uid}
                      onClick={() => setSelectedStoreUid(s.id || s.uid)}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? isPharmaMode
                            ? 'border-teal-600 bg-teal-50/40 shadow-xs ring-2 ring-teal-500/20'
                            : 'border-[#55349A] bg-purple-50/30 shadow-xs ring-2 ring-purple-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? isPharmaMode ? 'bg-teal-600 text-white' : 'bg-[#55349A] text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isPharma ? <Pill size={20} /> : <Building2 size={20} />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900 truncate">{s.name}</span>
                            {isPharma && (
                              <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-[9px] font-black uppercase">
                                Pharmacy
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                            {s.location || s.code || s.type || 'RETAIL'}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className={`shrink-0 ${primaryText}`}>
                          <CheckCircle2 size={20} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customer / Patient Profile Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  <User size={16} className={primaryText} />
                  <span>Customer / Patient Profile</span>
                </div>

                {/* Segmented Control */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => { setCustomerMode('walkin'); setSelectedCustomer(null); }}
                    className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                      customerMode === 'walkin' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Walk-in / Direct
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomerMode('existing'); }}
                    className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                      customerMode === 'existing' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Existing Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomerMode('create'); }}
                    className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                      customerMode === 'create' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    + New Profile
                  </button>
                </div>
              </div>

              {/* Walk-in View */}
              {customerMode === 'walkin' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                      <User size={20} />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-slate-900">Walk-in Customer / Direct Counter Patient</div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        Standard OTC walk-in sale. Patient identity & doctor prescription details can be specified in Step 2 if required.
                      </div>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-2xs shrink-0">
                    ✓ Walk-in Mode Active
                  </span>
                </div>
              )}

              {/* Existing Customer Search View */}
              {customerMode === 'existing' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search customers by name, mobile phone number, or customer ID..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-teal-600 focus:bg-white transition-all shadow-2xs"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {customers
                      .filter((c: any) =>
                        c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                        c.phone?.includes(customerSearch) ||
                        c.customerNo?.toLowerCase().includes(customerSearch.toLowerCase())
                      )
                      .slice(0, 8)
                      .map((c: any) => {
                        const isSelected = selectedCustomer?.id === c.id || selectedCustomer?.uid === c.id;
                        return (
                          <div
                            key={c.id || c.uid}
                            onClick={() => setSelectedCustomer(c)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? isPharmaMode ? 'border-teal-600 bg-teal-50/50 shadow-xs' : 'border-[#55349A] bg-purple-50/50 shadow-xs'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                                {c.name?.charAt(0) || 'C'}
                              </div>
                              <div>
                                <div className="font-extrabold text-xs text-slate-900">{c.name}</div>
                                <div className="text-[11px] text-slate-400 font-mono mt-0.5">{c.phone || c.customerNo || 'No phone'}</div>
                              </div>
                            </div>
                            {isSelected && <CheckCircle size={18} className={primaryText} />}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Create Customer Inline Form View */}
              {customerMode === 'create' && (
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  <div className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">New Patient / Customer Identity</div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Full Name <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      placeholder="e.g. Rahul Varma"
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium outline-none focus:border-teal-600"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={newCustPhone}
                        onChange={(e) => setNewCustPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium outline-none focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={newCustEmail}
                        onChange={(e) => setNewCustEmail(e.target.value)}
                        placeholder="e.g. rahul@example.com"
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium outline-none focus:border-teal-600"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newCustName.trim()) return;
                      const created = await createCustomerMutation.mutateAsync({
                        name: newCustName,
                        phone: newCustPhone,
                        email: newCustEmail,
                      });
                      setSelectedCustomer(created);
                      setCustomerMode('existing');
                    }}
                    className={`px-5 py-2.5 ${primaryBg} ${primaryHoverBg} text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs`}
                  >
                    Save Profile
                  </button>
                </div>
              )}

              {/* Selected Customer Card */}
              {selectedCustomer && customerMode !== 'create' && customerMode !== 'walkin' && (
                <div className="p-4 bg-teal-50/80 border border-teal-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center font-black text-xs">
                      {selectedCustomer.name?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-slate-900">{selectedCustomer.name}</div>
                      <div className="text-xs text-teal-800 font-medium">
                        {selectedCustomer.phone ? `Phone: ${selectedCustomer.phone}` : 'Registered Customer'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="text-xs text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* STEP 2: Products Catalog, Cart & Clinical Prescriber Header */}
        {step === 2 && (
          <div className="space-y-6">

            {/* Capability-Driven Clinical Header Panel */}
            <CapabilityPanelSlots
              capabilities={storeCaps}
              prescriberData={prescriberData}
              onPrescriberChange={handlePrescriberChange}
              hasScheduledDrugs={hasScheduledDrugs}
              isPrescriptionMode={isPharmaMode}
              isPrescriberExpanded={isPrescriberExpanded}
              onTogglePrescriberExpand={() => setIsPrescriberExpanded(!isPrescriberExpanded)}
            />

            {/* Main POS Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* Left Side: Product Catalog (7 cols) */}
              <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search medicines or items by name, composition, SKU..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-teal-600 focus:bg-white transition-all shadow-2xs"
                    />
                  </div>

                  {categories.length > 2 && (
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                  {filteredItems.map((item: any) => {
                    const cartMatch = cart.find(c => c.itemUid === item.itemUid);
                    return (
                      <div
                        key={item.itemUid || item.id}
                        className="p-4 bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl transition-all flex flex-col justify-between gap-3 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-extrabold text-xs text-slate-900 line-clamp-2 leading-tight">
                              {item.name}
                            </span>
                            {item.requiresPrescription && (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 text-[9px] font-black shrink-0">
                                {item.drugSchedule || 'Rx'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                            <span>{item.category}</span>
                            {item.inHand != null && (
                              <span>• Stock: <strong className={item.inHand > 0 ? 'text-emerald-700' : 'text-rose-600'}>{item.inHand}</strong></span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                          <span className="text-sm font-black text-slate-900">₹{item.price.toFixed(2)}</span>

                          {cartMatch ? (
                            <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-lg p-1">
                              <button
                                type="button"
                                onClick={() => updateQty(item.itemUid, cartMatch.qty - 1)}
                                className="w-5 h-5 rounded flex items-center justify-center bg-white text-teal-700 font-bold hover:bg-teal-100 cursor-pointer shadow-2xs"
                              >
                                -
                              </button>
                              <span className="text-xs font-bold text-teal-900 px-1.5">{cartMatch.qty}</span>
                              <button
                                type="button"
                                onClick={() => updateQty(item.itemUid, cartMatch.qty + 1)}
                                className="w-5 h-5 rounded flex items-center justify-center bg-white text-teal-700 font-bold hover:bg-teal-100 cursor-pointer shadow-2xs"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addToCart(item)}
                              className={`px-3.5 py-1.5 ${primaryBg} ${primaryHoverBg} text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95`}
                            >
                              + Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Side: Cart Summary & Dosage Actions (5 cols) */}
              <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <ShoppingCart size={18} className={primaryText} />
                      <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Current Cart ({cart.length})</span>
                    </div>
                    {cart.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCart([])}
                        className="text-xs text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Cart Lines */}
                  <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
                    {cart.length === 0 ? (
                      <div className="py-14 text-center text-slate-400">
                        <ShoppingCart size={36} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs font-bold text-slate-700">Your cart is empty</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Select medicines or items from the catalog.</p>
                      </div>
                    ) : (
                      cart.map((line) => (
                        <div key={line.itemUid} className="py-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-extrabold text-xs text-slate-900 truncate">{line.name}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                ₹{line.unitPrice || line.price} × {line.qty} = <strong className="text-slate-900 font-bold">₹{((line.unitPrice || line.price) * line.qty).toFixed(2)}</strong>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(line.itemUid)}
                              className="text-slate-300 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          {/* Dosage Summary or Calculator for pharma */}
                          <div className="flex items-center justify-between gap-2">
                            {storeCaps?.pharmaModeEnabled || isPharmaMode ? (
                              <DosageCalculator
                                item={line}
                                currentQty={line.qty}
                                packageSize={line.packageSize}
                                onApplyQuantity={(q, summary) => updateQty(line.itemUid, q, summary)}
                              />
                            ) : <div />}

                            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => updateQty(line.itemUid, line.qty - 1)}
                                className="w-5 h-5 rounded flex items-center justify-center bg-white text-slate-700 font-bold hover:bg-slate-200"
                              >
                                -
                              </button>
                              <span className="text-xs font-bold text-slate-900 px-2">{line.qty}</span>
                              <button
                                type="button"
                                onClick={() => updateQty(line.itemUid, line.qty + 1)}
                                className="w-5 h-5 rounded flex items-center justify-center bg-white text-slate-700 font-bold hover:bg-slate-200"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {line.dosageSummary && (
                            <div className="text-[11px] text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md font-medium border border-teal-100">
                              💊 {line.dosageSummary}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Financial Bill Total */}
                <div className="border-t border-slate-200 pt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Items Subtotal</span>
                    <span className="font-bold text-slate-800">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Estimated GST (5%)</span>
                    <span className="font-bold text-slate-800">₹{taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-slate-900 pt-1.5 border-t border-slate-100">
                    <span>Total Amount</span>
                    <span className={primaryText}>₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* STEP 3: Review, Payment Settlement & Invoice */}
        {step === 3 && (
          <div className="max-w-4xl mx-auto space-y-6">

            {createdOrderResult ? (
              /* Success View */
              <div className="bg-white p-10 rounded-2xl border border-emerald-200 shadow-lg text-center space-y-6 animate-in zoom-in-95">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 size={44} />
                </div>

                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    Order Fulfilled Successfully!
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Order #{createdOrderResult.orderNo || 'ORD-COMPLETE'} has been recorded and synced to inventory and revenue KPIs.
                  </p>
                </div>

                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-sans max-w-md mx-auto space-y-2.5 text-left">
                  <div className="flex justify-between"><span className="text-slate-500">Total Bill Amount:</span><strong className="text-slate-900 font-bold text-sm">₹{totalAmount.toFixed(2)}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Payment Status:</span><strong className="text-emerald-700">✓ PAID ({paymentMode})</strong></div>
                  {hasScheduledDrugs && (
                    <div className="flex justify-between text-amber-800"><span className="font-medium">Statutory Drug Register:</span><strong>✓ Logged Schedule H1</strong></div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95"
                  >
                    <Printer size={16} />
                    Print Tax Invoice
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    Done & Return to Orders
                  </button>
                </div>
              </div>
            ) : (
              /* Payment Selection Form */
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    <CreditCard size={16} className={primaryText} />
                    <span>Select Payment Method</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: 'CASH', label: 'Cash', icon: Banknote },
                      { key: 'UPI', label: 'UPI / QR', icon: QrCode },
                      { key: 'CARD', label: 'Card / POS', icon: CreditCard },
                      { key: 'CREDIT', label: 'Credit / B2B', icon: Globe },
                    ].map((m) => {
                      const Icon = m.icon;
                      const isSelected = paymentMode === m.key;
                      return (
                        <div
                          key={m.key}
                          onClick={() => setPaymentMode(m.key as any)}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-center flex flex-col items-center gap-2 ${
                            isSelected
                              ? isPharmaMode
                                ? 'border-teal-600 bg-teal-50/50 text-teal-950 shadow-xs font-bold ring-2 ring-teal-500/20'
                                : 'border-[#55349A] bg-purple-50/50 text-purple-950 shadow-xs font-bold ring-2 ring-purple-500/20'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 font-semibold'
                          }`}
                        >
                          <Icon size={24} className={isSelected ? primaryText : 'text-slate-400'} />
                          <span className="text-xs">{m.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Amount Collected (₹)</label>
                      <input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-teal-600 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Change Return (₹)</label>
                      <div className="px-3.5 py-2.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center">
                        ₹{Math.max(0, amountPaid - totalAmount).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address Confirmation */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Billing & Delivery Address Snapshot
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Billing Address</label>
                      <input
                        type="text"
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        placeholder="Customer billing address"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-teal-600 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Shipping / Patient Residence</label>
                      <input
                        type="text"
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        placeholder="Delivery or patient residence"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-teal-600 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {submissionError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    <span>{submissionError}</span>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </main>

      {/* 3. BOTTOM STICKY ACTION BAR */}
      {!createdOrderResult && (
        <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-8 py-3.5 flex items-center justify-between shadow-lg">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((step - 1) as any)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft size={15} /> Back
            </button>
          ) : <div />}

          <div className="flex items-center gap-5 ml-auto">
            <span className="text-xs font-bold text-slate-500">
              Total Bill: <strong className="text-slate-900 font-black text-base ml-1.5">₹{totalAmount.toFixed(2)}</strong>
            </span>

            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className={`px-7 py-2.5 ${primaryBg} ${primaryHoverBg} text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95`}
              >
                <span>Proceed to Products</span>
                <ArrowRight size={15} />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                disabled={cart.length === 0 || (hasScheduledDrugs && !prescriberValid)}
                onClick={() => setStep(3)}
                className={`px-7 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                  cart.length > 0 && (!hasScheduledDrugs || prescriberValid)
                    ? `${primaryBg} ${primaryHoverBg} text-white cursor-pointer`
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title={hasScheduledDrugs && !prescriberValid ? 'Doctor details required for controlled drugs' : ''}
              >
                <span>{hasScheduledDrugs && !prescriberValid ? 'Doctor Details Required' : 'Proceed to Payment'}</span>
                <ArrowRight size={15} />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="px-7 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                <span>Confirm & Complete Order</span>
              </button>
            )}
          </div>
        </footer>
      )}

    </div>
  );
};
