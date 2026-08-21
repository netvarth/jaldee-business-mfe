import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronDown, Plus, Minus, X, Trash2, ShoppingCart, Edit2,
  FileText, ArrowRight, Store, Search, User, UserPlus, ClipboardList, Check, Sparkles, Folder,
  LayoutGrid, List, Truck, Tag, CreditCard, Clock, ChevronRight, Eye, Phone, Mail, MapPin
} from 'lucide-react';
import { useCustomers, useCreateCustomer } from '../../../services/useCustomers';
import { useStorefrontSettings } from '../../../services/useStorefrontSettings';
import { cn } from '../lib/utils';
import { POSProduct, POSCartItem } from './OrdersTable';
import { useTaxes, TaxDto } from '../../../services/useTaxes';
import { CheckoutModal } from './CheckoutModal';
import { PaymentDto } from '../../../services/usePaymentsIn';
import { useDeliveryProfiles, calculateDeliveryFee, resolveDelivery, availableMethods, isV2Profile, DeliveryProfileDto } from '../../../services/useDeliveryProfiles';
import { usePickLocations, readRackEnabledSetting } from '../../../services/useRackManagement';

interface DraftOrderStep2Props {
  enableOrderPreSetup?: boolean;
  availableStores?: { name: string; code?: string }[];
  availableCatalogs?: string[];
  posCart: POSCartItem[];
  setPosCart: React.Dispatch<React.SetStateAction<POSCartItem[]>>;
  selectedStore: string;
  setSelectedStore: (v: string) => void;
  selectedInvoiceType: string;
  setSelectedInvoiceType: (v: string) => void;
  selectedCatalogs: string[];
  setSelectedCatalogs: React.Dispatch<React.SetStateAction<string[]>>;
  prescribedBy: string;
  setPrescribedBy: (v: string) => void;
  doctorNotes: string;
  setDoctorNotes: (v: string) => void;
  billingAddress: string;
  setBillingAddress: (v: string) => void;
  shippingAddress: string;
  setShippingAddress: (v: string) => void;
  shippingAddressSame: boolean;
  setShippingAddressSame: (v: boolean) => void;
  businessName: string;
  setBusinessName: (v: string) => void;
  getActiveCustomerDetails: () => { name: string; id: string; initials: string; phone?: string; email?: string; address?: string };
  setCreateStep: (v: number) => void;
  setShowCreateModal?: (v: boolean) => void;
  setShowInvoiceDetailsPage: (v: boolean) => void;
  setActiveGeneratedOrderId: (v: string) => void;
  POS_PRODUCTS: POSProduct[];
  currentOrderStatus: 'Draft' | 'Confirmed' | 'Completed';
  setCurrentOrderStatus: React.Dispatch<React.SetStateAction<'Draft' | 'Confirmed' | 'Completed'>>;
  invoiceGenerated: boolean;
  setInvoiceGenerated: (v: boolean) => void;
  setOrders: React.Dispatch<React.SetStateAction<any[]>>;
  /** Persist the order to the backend (POST /orders). Reuses the wizard's step-1 customer/store/catalog state. */
  onPlaceOrder?: () => void;
  selectedCustomerId?: string;
  setSelectedCustomerId?: (v: string) => void;
  customerMode?: 'guest' | 'existing' | 'create';
  setCustomerMode?: (v: 'guest' | 'existing' | 'create') => void;
  newCustomerName?: string;
  setNewCustomerName?: (v: string) => void;
  newCustomerPhone?: string;
  setNewCustomerPhone?: (v: string) => void;
  newCustomerEmail?: string;
  setNewCustomerEmail?: (v: string) => void;
  newCustomerAddress?: string;
  setNewCustomerAddress?: (v: string) => void;
  existingCustomers?: any[];
}

const CATEGORY_TILES: Record<string, { bg: string; fg: string; accent: string }> = {
  Grocery:  { bg: "#F1EDE5", fg: "#78716C", accent: "#D6D1C7" },
  Spices:   { bg: "#FBF7ED", fg: "#B45309", accent: "#FDE68A" },
  Hardware: { bg: "#EFF6FF", fg: "#1D4ED8", accent: "#BFDBFE" },
  Pharma:   { bg: "#ECFDF5", fg: "#047857", accent: "#A7F3D0" },
  General:  { bg: "#F8FAFC", fg: "#64748B", accent: "#E2E8F0" },
  default:  { bg: "#F8FAFC", fg: "#55349A", accent: "#E9D5FF" },
};

const getCategoryTheme = (cat?: string) => {
  if (!cat) return CATEGORY_TILES.default;
  for (const key of Object.keys(CATEGORY_TILES)) {
    if (cat.toLowerCase().includes(key.toLowerCase())) {
      return CATEGORY_TILES[key];
    }
  }
  return CATEGORY_TILES.default;
};

export const DraftOrderStep2: React.FC<DraftOrderStep2Props> = ({
  enableOrderPreSetup = true,
  availableStores = [],
  availableCatalogs = [],
  posCart,
  setPosCart,
  selectedStore,
  setSelectedStore,
  selectedInvoiceType,
  setSelectedInvoiceType,
  selectedCatalogs,
  setSelectedCatalogs,
  prescribedBy,
  setPrescribedBy,
  doctorNotes,
  setDoctorNotes,
  billingAddress,
  setBillingAddress,
  shippingAddress,
  setShippingAddress,
  shippingAddressSame,
  setShippingAddressSame,
  businessName,
  setBusinessName,
  getActiveCustomerDetails,
  setCreateStep,
  setShowCreateModal,
  setShowInvoiceDetailsPage,
  setActiveGeneratedOrderId,
  POS_PRODUCTS,
  currentOrderStatus,
  setCurrentOrderStatus,
  invoiceGenerated,
  setInvoiceGenerated,
  setOrders,
  onPlaceOrder,
  selectedCustomerId,
  setSelectedCustomerId,
  customerMode,
  setCustomerMode,
  newCustomerName,
  setNewCustomerName,
  newCustomerPhone,
  setNewCustomerPhone,
  newCustomerEmail,
  setNewCustomerEmail,
  newCustomerAddress,
  setNewCustomerAddress,
  existingCustomers = []
}) => {
  const [inlineViewMode, setInlineViewMode] = useState<'grid' | 'list'>(() => {
    try {
      const saved = localStorage.getItem('karty_default_pos_view_mode');
      return (saved === 'list' || saved === 'grid') ? saved : 'grid';
    } catch {
      return 'grid';
    }
  });
  const [inlineSearchQuery, setInlineSearchQuery] = useState<string>('');
  const [selectedKioskCategory, setSelectedKioskCategory] = useState<string>('⭐ Top Items');
  const [catalogDisplayLimit, setCatalogDisplayLimit] = useState<number>(12);
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [pendingCheckoutOrderId, setPendingCheckoutOrderId] = useState<string>('');
  const [showAddressSection, setShowAddressSection] = useState<boolean>(false);
  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);
  const [customerSearchText, setCustomerSearchText] = useState<string>("");
  const [customerTab, setCustomerTab] = useState<"search" | "create">("search");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState<boolean>(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ firstName: "", phone: "", email: "", address: "" });

  const { data: backendCustomers = [] } = useCustomers(customerSearchText);
  const createCustomerMutation = useCreateCustomer();
  const { data: storefrontSettings } = useStorefrontSettings();

  const combinedCustomers = useMemo(() => {
    const map = new Map<string, any>();
    (existingCustomers || []).forEach((c: any) => {
      if (c && (c.id || c.uid)) map.set(c.id || c.uid, c);
    });
    (backendCustomers || []).forEach((c: any) => {
      if (c && (c.id || c.uid)) {
        const id = c.id || c.uid;
        if (!map.has(id)) {
          map.set(id, {
            id,
            uid: id,
            name: c.displayName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Customer",
            consumerNo: c.consumerNo,
            phone: c.phoneE164 || c.primaryNumber || "",
            email: c.email || "",
            address: c.address || "",
          });
        }
      }
    });
    return Array.from(map.values());
  }, [existingCustomers, backendCustomers]);

  const filteredCustomersList = useMemo(() => {
    const q = customerSearchText.trim().toLowerCase();
    if (!q) return combinedCustomers;
    return combinedCustomers.filter((c: any) => {
      const nameMatch = (c.name || `${c.firstName || ""} ${c.lastName || ""}`).toLowerCase().includes(q);
      const phoneMatch = (c.phone || c.phoneE164 || "").includes(q);
      const idMatch = (c.consumerNo || c.id || c.uid || "").toLowerCase().includes(q);
      return nameMatch || phoneMatch || idMatch;
    });
  }, [combinedCustomers, customerSearchText]);
  const [showGstSection, setShowGstSection] = useState<boolean>(false);
  const [gstNumber, setGstNumber] = useState<string>('');
  const [showAddItemModal, setShowAddItemModal] = useState<boolean>(false);

  // Dropdown open states for header selectors
  const [storeDropdownOpen, setStoreDropdownOpen] = useState<boolean>(false);
  const [catalogDropdownOpen, setCatalogDropdownOpen] = useState<boolean>(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState<boolean>(false);

  const storeDropdownRef = useRef<HTMLDivElement>(null);
  const catalogDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target as Node)) {
        setStoreDropdownOpen(false);
      }
      if (catalogDropdownRef.current && !catalogDropdownRef.current.contains(e.target as Node)) {
        setCatalogDropdownOpen(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Variant / Selling-unit selection popup states
  const [variantPopupProduct, setVariantPopupProduct] = useState<POSProduct | null>(null);
  const [selectedPopupSize, setSelectedPopupSize] = useState<string>('');
  const [selectedPopupColor, setSelectedPopupColor] = useState<string>('');
  const [popupQty, setPopupQty] = useState<number>(1);
  const [selectedPopupUnitUid, setSelectedPopupUnitUid] = useState<string>('');

  // Delivery & Fulfillment state
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'WALK_IN' | 'DELIVERY'>('WALK_IN');
  const [selectedDeliveryProfileUid, setSelectedDeliveryProfileUid] = useState<string>('');
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [codSelected, setCodSelected] = useState<boolean>(false);

  // Taxes
  const { data: taxes } = useTaxes({ status: 'ACTIVE' });
  const [selectedTaxUid, setSelectedTaxUid] = useState<string>('');
  const activeTax = taxes?.find(t => t.uid === selectedTaxUid) || taxes?.[0] || null;

  // Delivery Profiles
  const { data: deliveryProfiles } = useDeliveryProfiles({ status: 'ACTIVE' });
  const activeDeliveryProfile = useMemo(() => {
    if (!deliveryProfiles || deliveryProfiles.length === 0) return null;
    return deliveryProfiles.find(p => p.uid === selectedDeliveryProfileUid) || deliveryProfiles[0];
  }, [deliveryProfiles, selectedDeliveryProfileUid]);

  const profileIsV2 = isV2Profile(activeDeliveryProfile);
  const methodOptions = useMemo(() => {
    if (!profileIsV2 || !activeDeliveryProfile) return [];
    return availableMethods(activeDeliveryProfile);
  }, [activeDeliveryProfile, profileIsV2]);

  // Resolve active store UID for Warehouse Pick Locations
  const activeStoreUid = useMemo(() => {
    const storeObj = (availableStores || []).find((s: any) => s.name === selectedStore || s.id === selectedStore || s.uid === selectedStore);
    return storeObj?.id || storeObj?.uid || (selectedStore && selectedStore.includes('-') ? selectedStore : undefined);
  }, [availableStores, selectedStore]);

  const pickLocationsQ = usePickLocations(activeStoreUid);
  const pickLocations = pickLocationsQ.data ?? [];

  const isRackEnabled = useMemo(() => {
    if (!activeStoreUid) return false;
    // Explicit toggle wins; otherwise infer from whether pick locations exist for this store.
    return readRackEnabledSetting(activeStoreUid) ?? (pickLocations || []).length > 0;
  }, [activeStoreUid, pickLocations]);

  const getPickBadge = (itemUid?: string) => {
    if (!isRackEnabled || !itemUid) return null;
    const loc = pickLocations.find((l: any) => l.itemUid === itemUid || l.binUid === itemUid);
    if (!loc || !loc.binCode) return null; // Never show unallocated noise
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 text-[#55349A] hover:bg-purple-100 border border-purple-200/90 font-mono text-[9.5px] font-black cursor-pointer transition-colors shadow-3xs shrink-0"
        title={`Warehouse Pick Location: ${loc.zoneName || 'Zone'} ➔ ${loc.rackName || 'Rack'} ➔ ${loc.shelfName || 'Shelf'} (${loc.binCode})`}
      >
        <span className="text-purple-600">📍</span>
        <span>{loc.rackCode || 'R01'}-{loc.binCode.split('-').slice(-2).join('-')}</span>
      </span>
    );
  };

  // Categories list
  // Categories list extracted cleanly from POS_PRODUCTS
  const categories = useMemo(() => {
    const set = new Set<string>();
    (POS_PRODUCTS || []).forEach(p => {
      if (p?.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return ['⭐ Top Items', 'All', ...Array.from(set)];
  }, [POS_PRODUCTS]);

  // Top / Frequently ordered items (clean, priced items with stock)
  const topProducts = useMemo(() => {
    return (POS_PRODUCTS || [])
      .filter(p => p && p.price > 0)
      .slice(0, 8);
  }, [POS_PRODUCTS]);

  // Filtered Products for Catalog Grid / List with Tokenized Lucene-style search & exact category filtering
  const filteredCatalogProducts = useMemo(() => {
    const q = inlineSearchQuery.trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

    // If searching, search across all products (or within selected category if not Top/All)
    if (tokens.length > 0) {
      return (POS_PRODUCTS || []).filter(p => {
        if (selectedKioskCategory !== 'All' && selectedKioskCategory !== '⭐ Top Items') {
          const itemCat = (p?.category || '').trim().toLowerCase();
          const selectedCat = selectedKioskCategory.trim().toLowerCase();
          if (itemCat !== selectedCat) return false;
        }

        const name = (p?.name || '').toLowerCase();
        const code = (p?.code || '').toLowerCase();
        const sku = (p?.sku || '').toLowerCase();
        const barcode = (p?.barcode || '').toLowerCase();
        const brand = (p?.brand || '').toLowerCase();
        const id = (p?.id || '').toLowerCase();
        const itemUid = (p?.itemUid || '').toLowerCase();

        return tokens.every(token =>
          name.includes(token) ||
          code.includes(token) ||
          sku.includes(token) ||
          barcode.includes(token) ||
          brand.includes(token) ||
          id.includes(token) ||
          itemUid.includes(token)
        );
      }).sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q);
        const bStarts = b.name.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });
    }

    // When no search query:
    if (selectedKioskCategory === '⭐ Top Items') {
      return topProducts;
    }

    if (selectedKioskCategory === 'All') {
      return POS_PRODUCTS || [];
    }

    return (POS_PRODUCTS || []).filter(p => {
      const itemCat = (p?.category || '').trim().toLowerCase();
      const selectedCat = selectedKioskCategory.trim().toLowerCase();
      return itemCat === selectedCat;
    });
  }, [POS_PRODUCTS, inlineSearchQuery, selectedKioskCategory, topProducts]);

  // Helper to get active cart quantity for a product
  const getCartItemQty = (prodId: string) => {
    return posCart.filter(item => item.product.id === prodId).reduce((sum, i) => sum + i.qty, 0);
  };

  // Stock helpers
  const availableStockOf = (prod: POSProduct): number | null =>
    prod.inHand === null || prod.inHand === undefined ? null : Number(prod.inHand);
  const isOutOfStock = (prod: POSProduct): boolean => {
    if (prod.trackInventory === false) return false; // not stock-managed → always sellable
    const avail = availableStockOf(prod);
    return avail !== null && avail <= 0;
  };

  // Price helper with unit label
  const priceWithUnit = (prod: POSProduct): string => {
    const defaultUnit = prod.units?.find(u => u.isDefault) || prod.units?.[0];
    const unitPrice = defaultUnit?.sellingPrice ?? prod.price;
    const unitName = defaultUnit?.name || 'unit';
    return `₹${unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / ${unitName}`;
  };

  // Helper: check if product has configurable options (multiple units, variant sizes, or colors)
  const hasConfigurableOptions = (prod: POSProduct | null | undefined): boolean => {
    if (!prod) return false;
    const hasMultipleUnits = Boolean(prod.units && prod.units.length > 1);
    const hasMultipleSizes = Boolean(prod.sizes && prod.sizes.filter(s => s && s.toLowerCase() !== 'standard').length > 0);
    const hasMultipleColors = Boolean(prod.colors && prod.colors.filter(c => c && c.toLowerCase() !== 'default').length > 0);
    return hasMultipleUnits || hasMultipleSizes || hasMultipleColors;
  };

  // Helper to get the active unit object for a product
  const activeUnitOf = (prod: POSProduct | null, unitUid?: string) => {
    if (!prod || !prod.units || prod.units.length === 0) return null;
    return prod.units.find(u => u.unitUid === unitUid) || prod.units.find(u => u.isDefault) || prod.units[0];
  };

  // Add Item to Cart
  const addItemToCartWithVariant = (prod: POSProduct, size: string, color: string, qty: number = 1, unitUid?: string) => {
    const stockManaged = prod.trackInventory !== false;
    const avail = availableStockOf(prod);
    if (stockManaged && avail !== null && avail <= 0) {
      alert(`"${prod.name}" is out of stock in ${selectedStore || 'this store'} and cannot be added.`);
      return;
    }
    if (stockManaged && avail !== null) {
      const existingQty = posCart
        .filter(item => item.product.id === prod.id && item.selectedSize === size && item.selectedColor === color)
        .reduce((sum, item) => sum + item.qty, 0);
      if (existingQty + qty > avail) {
        alert(`Only ${avail} unit(s) of "${prod.name}" are in stock.`);
        return;
      }
    }

    setPosCart(prev => {
      const existingIdx = prev.findIndex(item =>
        item.product.id === prod.id &&
        item.selectedSize === size &&
        item.selectedColor === color &&
        (unitUid ? item.unitUid === unitUid : true)
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        const newQty = updated[existingIdx].qty + qty;
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: newQty,
          sellQty: newQty
        };
        return updated;
      }
      const chosenUnit = (unitUid && prod.units?.find(u => u.unitUid === unitUid))
        || prod.units?.find(u => u.isDefault) || prod.units?.[0];
      return [
        ...prev,
        {
          product: prod,
          qty: qty,
          selectedSize: size,
          selectedColor: color,
          selectedUnit: chosenUnit?.name || 'Unit',
          unitUid: chosenUnit?.unitUid,
          unitPrice: chosenUnit?.sellingPrice ?? prod.price,
          sellQty: qty,
        }
      ];
    });
  };

  const handleKioskDecrement = (prodId: string) => {
    setPosCart(prev => {
      const existingIdx = prev.findIndex(item => item.product.id === prodId);
      if (existingIdx > -1) {
        const currentQty = prev[existingIdx].qty;
        if (currentQty <= 1) {
          return prev.filter((_, idx) => idx !== existingIdx);
        }
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], qty: currentQty - 1, sellQty: currentQty - 1 };
        return updated;
      }
      return prev;
    });
  };

  const handleQtyChange = (idx: number, delta: number) => {
    setPosCart(prev => {
      const item = prev[idx];
      if (!item) return prev;
      const newQty = item.qty + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      const avail = availableStockOf(item.product);
      if (avail !== null && newQty > avail) {
        alert(`Only ${avail} unit(s) of "${item.product.name}" are in stock.`);
        return prev;
      }
      const updated = [...prev];
      updated[idx] = { ...item, qty: newQty, sellQty: newQty };
      return updated;
    });
  };

  const handleRemoveFromCart = (idx: number) => {
    setPosCart(prev => prev.filter((_, i) => i !== idx));
  };

  const removeItem = handleRemoveFromCart;

  // Subtotal & Tax Calculation
  const cartSubtotal = useMemo(() => {
    return posCart.reduce((total, item) => {
      const price = item.unitPrice ?? item.product.price;
      return total + price * item.qty;
    }, 0);
  }, [posCart]);

  const totalUnits = useMemo(() => {
    return posCart.reduce((acc, i) => acc + i.qty, 0);
  }, [posCart]);

  const cartWeightGrams = useMemo(() => {
    return posCart.reduce((acc, i) => acc + ((i.product.weightGrams ?? 500) * i.qty), 0);
  }, [posCart]);

  const deliveryQuote = useMemo(() => {
    if (!activeDeliveryProfile) {
      return { fee: 0, codFee: 0, codAvailable: false, method: null, zone: null };
    }
    try {
      return resolveDelivery(activeDeliveryProfile, {
        subtotal: cartSubtotal,
        weightGrams: cartWeightGrams,
        methodId: selectedMethodId,
        cod: codSelected,
      });
    } catch (err) {
      console.error("Error resolving delivery:", err);
      return { fee: 0, codFee: 0, codAvailable: false, method: null, zone: null };
    }
  }, [activeDeliveryProfile, cartSubtotal, cartWeightGrams, selectedMethodId, codSelected]);

  const deliveryFee = fulfillmentMethod === 'DELIVERY' ? deliveryQuote.fee : 0;
  const taxRate = activeTax?.rate ?? 18;
  const taxAmount = Math.round(cartSubtotal * (taxRate / 100) * 100) / 100;
  const total = Math.max(0, cartSubtotal + taxAmount + deliveryFee - (discountType === 'PERCENTAGE' ? (cartSubtotal * discountValue / 100) : discountValue));

  const handleConfirmOrder = () => {
    if (posCart.length === 0) {
      alert("Please add at least one item to confirm an order.");
      return;
    }

    // If customer is not selected and guest order is not enabled, pop up customer selection directly!
    const isGuest = isGuestCustomer || customerMode === 'guest' || (!selectedCustomerId && !newCustomerName?.trim());
    const guestAllowed = storefrontSettings?.allowOrderWithoutConsumer !== false && !storefrontSettings?.orderRequiresConsumer;

    if (isGuest && !guestAllowed) {
      setShowCustomerModal(true);
      return;
    }

    if (onPlaceOrder) {
      onPlaceOrder();
      return;
    }
    const finalId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    setPendingCheckoutOrderId(finalId);
    setIsCheckoutOpen(true);
  };

  const handlePaymentSuccess = (payment: PaymentDto) => {
    setIsCheckoutOpen(false);
    setActiveGeneratedOrderId(pendingCheckoutOrderId);

    const newOrderObj = {
      id: pendingCheckoutOrderId,
      date: new Date().toISOString().split('T')[0],
      customerName: cust.name,
      customerId: cust.id,
      channel: 'walkin' as const,
      itemsCount: posCart.reduce((acc, c) => acc + c.qty, 0),
      totalAmount: total,
      status: 'Confirmed' as const,
      store: selectedStore,
      invoiceType: selectedInvoiceType,
      catalogs: selectedCatalogs,
      paymentMode: payment.mode
    };

    setOrders(prev => [newOrderObj, ...prev]);
    setCurrentOrderStatus('Confirmed');
    alert(`ORDER CONFIRMED & PAYMENT CAPTURED SUCCESSFULLY!\n\nOrder ID: ${pendingCheckoutOrderId}\nStatus changed to: Confirmed.`);
  };

  const isHealthDomain = useMemo(() => {
    return (selectedCatalogs || []).some(c => c.toLowerCase().includes('health') || c.toLowerCase().includes('pharma') || c.toLowerCase().includes('rx'));
  }, [selectedCatalogs]);

  const cust = (typeof getActiveCustomerDetails === 'function' ? getActiveCustomerDetails() : null) || { name: 'Guest Customer', id: 'GUEST', initials: 'GC' };
  const isGuestCustomer = !cust.id || cust.id === 'GUEST' || cust.name === 'GUEST CUSTOMER';

  return (
    <div className="flex-1 flex flex-col bg-[#F3F4F6] text-slate-800 font-sans h-full max-h-full min-h-0 overflow-hidden">

      {/* 1. Header Navigation & Context Bar with Interactive Dropdowns */}
      <header className="flex items-center justify-between gap-4 px-6 py-3 bg-white border-b border-slate-200 shrink-0 select-none shadow-3xs z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (enableOrderPreSetup) {
                setCreateStep(1);
              } else {
                if (setShowCreateModal) {
                  setShowCreateModal(false);
                }
                setPosCart([]);
              }
            }}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            title={enableOrderPreSetup ? "Back to Order Setup" : "Back to Orders list"}
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight leading-none">
                Create new order
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-mono text-[10.5px] font-extrabold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {currentOrderStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Global Context Controls (Instant Toggle & Dropdowns) */}
        <div className="flex items-center gap-2.5">

          {/* Invoice Type Toggle */}
          <button
            type="button"
            onClick={() => setSelectedInvoiceType(selectedInvoiceType === 'B2C' ? 'B2B' : 'B2C')}
            className="flex items-center gap-2 h-9 px-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer select-none"
            title="Click to toggle between B2C and B2B"
          >
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Type</span>
            <span className="font-extrabold text-[#55349A] uppercase">{selectedInvoiceType || 'B2C'}</span>
            <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
              ({selectedInvoiceType === 'B2C' ? 'Retail' : 'Wholesale'})
            </span>
          </button>

          {/* Store Selector Dropdown */}
          <div className="relative flex items-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3.5 h-9 text-xs font-bold transition-all max-w-[280px]">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mr-2 shrink-0">Store</span>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-5 truncate appearance-none w-full"
            >
              {(availableStores.length > 0 ? availableStores : [{ name: selectedStore || 'Main Warehouse' }]).map(st => (
                <option key={st.name} value={st.name}>{st.name}</option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 pointer-events-none absolute right-3" />
          </div>

          {/* Catalogs Dropdown */}
          <div className="relative flex items-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3.5 h-9 text-xs font-bold transition-all max-w-[220px]">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mr-2 shrink-0">Catalog</span>
            <select
              value={selectedCatalogs?.[0] || ''}
              onChange={(e) => setSelectedCatalogs(e.target.value ? [e.target.value] : [])}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-5 truncate appearance-none w-full"
            >
              <option value="">All Catalogs</option>
              {availableCatalogs.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 pointer-events-none absolute right-3" />
          </div>

          {/* Prescribed By (Health Domain) */}
          {isHealthDomain && (
            <div className="flex items-center gap-2 h-9 px-3 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-800">
              <span className="text-[10px] uppercase tracking-wider text-emerald-600">Rx</span>
              <select
                value={prescribedBy}
                onChange={(e) => setPrescribedBy(e.target.value)}
                className="bg-transparent text-xs font-bold text-emerald-900 outline-none cursor-pointer"
              >
                <option value="">Direct Walk-In</option>
                <option value="Dr. Ramesh (MBBS)">Dr. Ramesh (MBBS)</option>
              </select>
            </div>
          )}
        </div>
      </header>

            {/* 2. Main Workspace Body: Switches smoothly between Full Workspace (List) and Fast POS Catalog Matrix (Grid) */}
      {inlineViewMode === 'list' ? (
        /* ==================== LIST VIEW (FULL ORDER WORKSPACE) ==================== */
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-5 md:p-6 gap-4 bg-[#F8FAFC]">

          {/* Top Info Context Strip (STORE | CATALOGS | INVOICE TYPE | PRESCRIBED BY) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-8 md:gap-12">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">STORE</span>
                <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{selectedStore || 'STORE 1'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CATALOGS</span>
                <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{(selectedCatalogs || []).join(', ') || 'STANDARD ORDER CATALOG'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">INVOICE TYPE</span>
                <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{selectedInvoiceType || 'B2C'}</span>
              </div>
            </div>

            {/* Prescribed By Selector */}
            <div className="flex items-center gap-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PRESCRIBED BY</span>
                <div className="relative mt-0.5 min-w-[200px]">
                  <select
                    value={prescribedBy || ''}
                    onChange={(e) => setPrescribedBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-slate-800 outline-none appearance-none cursor-pointer focus:border-[#55349A]"
                  >
                    <option value="Dr. Rakesh Sharma">Dr. Rakesh Sharma</option>
                    <option value="Dr. Ramesh (MBBS)">Dr. Ramesh (MBBS)</option>
                    <option value="Direct Walk-In">Direct Walk-In</option>
                  </select>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* 2-Column Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

            {/* Left 8 Columns: Order Items List & Notes */}
            <div className="lg:col-span-8 space-y-4">

              {/* ORDER ITEMS LIST CARD */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-[#55349A]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      ORDER ITEMS LIST ({posCart.length})
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const inputEl = document.getElementById('list-view-item-search');
                        if (inputEl) inputEl.focus();
                      }}
                      className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-[#55349A] hover:bg-purple-50/40 text-[#55349A] rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer"
                    >
                      + Add More Items
                    </button>
                    {posCart.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPosCart([])}
                        className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        Clear Cart
                      </button>
                    )}
                  </div>
                </div>

                {/* Search Bar + List / Grid View Switcher */}
                <div className="flex items-center gap-2 relative">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="list-view-item-search"
                      type="text"
                      value={inlineSearchQuery}
                      onChange={(e) => setInlineSearchQuery(e.target.value)}
                      placeholder="Quick search and select items to add to this order..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-[#55349A] focus:bg-white transition-all shadow-3xs"
                    />
                    {inlineSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setInlineSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Toggle Button Group */}
                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setInlineViewMode('list')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        inlineViewMode === 'list' ? "bg-[#55349A] text-white shadow-3xs" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      <List className="h-3.5 w-3.5" />
                      <span>List</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInlineViewMode('grid')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        inlineViewMode === 'grid' ? "bg-[#55349A] text-white shadow-3xs" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      <span>Grid</span>
                    </button>
                  </div>

                  {/* Live Search Autocomplete Popover */}
                  {inlineSearchQuery && (
                    <div className="absolute left-0 top-full mt-1.5 w-full max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl z-30 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                      {filteredCatalogProducts.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No items found matching "{inlineSearchQuery}"
                        </div>
                      ) : (
                        filteredCatalogProducts.slice(0, 8).map(prod => {
                          const oos = isOutOfStock(prod);
                          return (
                            <div
                              key={prod.id}
                              onClick={() => {
                                if (oos) return;
                                const defUnit = prod.units?.find(u => u.isDefault) || prod.units?.[0];
                                addItemToCartWithVariant(prod, prod.sizes?.[0] || "Standard", prod.colors?.[0] || "Default", 1, defUnit?.unitUid);
                                setInlineSearchQuery('');
                              }}
                              className="p-3 hover:bg-purple-50/40 flex items-center justify-between cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                                  {prod.name.charAt(0)}
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-slate-900">{prod.name}</h5>
                                  <span className="text-[10px] text-slate-400 font-mono">₹{prod.price}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={oos}
                                className="px-3 py-1 bg-[#55349A] text-white text-xs font-bold rounded-lg hover:bg-[#43287A] disabled:opacity-40"
                              >
                                + Add
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-3xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">ITEM</th>
                        <th className="py-3 px-3">BATCH</th>
                        <th className="py-3 px-3">UNIT</th>
                        <th className="py-3 px-3">PRICE (₹)</th>
                        <th className="py-3 px-3 text-center">QUANTITY</th>
                        <th className="py-3 px-4 text-right">TOTAL (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {posCart.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            <div className="space-y-1">
                              <p className="font-bold text-slate-700">No items added to order yet</p>
                              <p className="text-[11px]">Type in the search bar above or click + Add More Items</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        posCart.map((item, idx) => {
                          const unitPrice = item.unitPrice ?? item.product.price;
                          const lineTotal = item.qty * unitPrice;
                          return (
                            <tr key={`${item.product.id}-${idx}`} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0 overflow-hidden">
                                    {item.product.image ? (
                                      <img src={item.product.image} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      item.product.name.charAt(0)
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <h5 className="font-bold text-xs text-slate-900 truncate">{item.product.name}</h5>
                                    <span className="text-[10px] text-slate-400 font-mono uppercase block">
                                      {[item.selectedSize !== 'Standard' && item.selectedSize, item.product.brand || item.product.sku].filter(Boolean).join(' / ') || 'DEFAULT'}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Batch Selector */}
                              <td className="py-3 px-3">
                                <select className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 outline-none">
                                  <option value="Batch 1">Batch 1</option>
                                  <option value="Batch 2">Batch 2</option>
                                </select>
                              </td>

                              {/* Unit Selector */}
                              <td className="py-3 px-3">
                                <select
                                  value={item.unitUid || ''}
                                  onChange={(e) => {
                                    const newUnit = item.product.units?.find((u: any) => u.unitUid === e.target.value);
                                    setPosCart(prev => prev.map((p, i) => i === idx ? { ...p, unitUid: e.target.value, selectedUnit: newUnit?.name || p.selectedUnit, unitPrice: newUnit?.sellingPrice ?? p.unitPrice } : p));
                                  }}
                                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 outline-none"
                                >
                                  {(item.product.units || [{ name: item.selectedUnit || 'Unit', unitUid: 'def' }]).map((u: any) => (
                                    <option key={u.unitUid || u.name} value={u.unitUid}>{u.name || u.unitName || 'Unit'}</option>
                                  ))}
                                </select>
                              </td>

                              {/* Price */}
                              <td className="py-3 px-3 font-mono font-bold text-slate-900">
                                ₹ {unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>

                              {/* Quantity Stepper */}
                              <td className="py-3 px-3 text-center">
                                <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleQtyChange(idx, -1)}
                                    className="w-6 h-6 rounded hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="w-7 text-center font-mono font-black text-xs text-slate-900">
                                    {item.qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleQtyChange(idx, 1)}
                                    className="w-6 h-6 rounded hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>

                              {/* Line Total & Remove */}
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <span className="font-mono font-black text-xs text-slate-900">
                                    ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFromCart(idx)}
                                    className="w-5 h-5 rounded-full hover:bg-red-50 text-red-500 hover:text-red-700 flex items-center justify-center cursor-pointer transition-colors"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* NOTES CARD (Doctor & Customer Notes) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-3.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Notes</h4>

                {/* Doctor Notes Box */}
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px] uppercase tracking-wider">
                      <FileText className="h-3.5 w-3.5 text-emerald-600" />
                      <span>DOCTOR NOTES:</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-200/60 text-emerald-800 text-[9.5px] font-black uppercase">
                      PRESCRIBED
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    placeholder="Doctor advice / Rx notes (e.g. Lantern Shirt and AirPods suggested for corporate stress reduction and relaxation)..."
                    className="w-full bg-transparent text-xs font-semibold text-emerald-950 outline-none resize-none placeholder:text-emerald-700/60"
                  />
                </div>

                {/* Customer Notes Box */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    CUSTOMER NOTES
                  </span>
                  <textarea
                    rows={2}
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Please deliver to office address if available..."
                    className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none resize-none placeholder:text-slate-400"
                  />
                </div>
              </div>

            </div>

            {/* Right 4 Columns: Customer Details + Billing Summary */}
            <div className="lg:col-span-4 space-y-4">

              {/* CUSTOMER DETAILS CARD */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Customer Details</h4>
                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(true)}
                    className="text-xs font-bold text-[#55349A] hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#55349A] flex items-center justify-center font-black text-sm shrink-0">
                    {cust.initials || (cust.name || 'C').charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h5 className="text-xs font-black text-slate-900 truncate">{cust.name}</h5>
                      {cust.id && cust.id !== 'GUEST' && (
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                          #{cust.id}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">34 yr - Male</p>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Phone</span>
                    <span className="font-mono font-bold text-slate-800">{cust.phone || '+91 98430 21234'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Email</span>
                    <span className="font-mono text-slate-800">{cust.email || 'arjun@gmail.com'}</span>
                  </div>
                </div>

                {/* Billing Address section */}
                <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-[#55349A] tracking-wider">
                      BILLING ADDRESS
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddressSection(!showAddressSection)}
                      className="text-[10px] font-bold text-[#55349A] hover:underline cursor-pointer"
                    >
                      {showAddressSection ? 'Save' : 'Edit'}
                    </button>
                  </div>
                  {showAddressSection ? (
                    <textarea
                      rows={2}
                      value={billingAddress}
                      onChange={(e) => setBillingAddress(e.target.value)}
                      placeholder="Billing address..."
                      className="w-full bg-white border border-purple-200 rounded-lg p-2 text-xs font-medium outline-none resize-none"
                    />
                  ) : (
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                      {billingAddress || 'ABC House, Street no:4, Vadakke Stand, Thrissur, Kerala 680000'}
                    </p>
                  )}
                </div>

                {/* Shipping toggle */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-slate-700">Shipping Address Same as Billing</span>
                  <input
                    type="checkbox"
                    checked={shippingAddressSame}
                    onChange={(e) => setShippingAddressSame(e.target.checked)}
                    className="accent-[#55349A] h-4 w-4 rounded cursor-pointer"
                  />
                </div>

                {/* Business & GST inputs */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">BUSINESS NAME</label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Meditex Solutions"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-[#55349A] focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">GST NUMBER</label>
                    <input
                      type="text"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      placeholder="e.g. 32AACCP2411C1Z1"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 font-mono outline-none focus:border-[#55349A] focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* BILLING SUMMARY CARD */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-3.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Billing Summary</h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Items</span>
                    <span className="font-bold text-slate-900">{totalUnits} units</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Sub Total</span>
                    <span className="font-mono font-bold text-slate-900">₹ {cartSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Estimated Tax ({taxRate}%)</span>
                    <span className="font-mono font-bold text-slate-900">₹ {taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {deliveryFee > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Delivery Fee</span>
                      <span className="font-mono font-bold text-slate-900">₹ {deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900">Grand Total</span>
                    <span className="text-base font-black text-[#55349A] font-mono">
                      ₹ {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  className="w-full py-3 bg-[#55349A] hover:bg-[#43287A] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-purple-900/20 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Proceed to Invoice / Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

            </div>

          </div>
        </div>
      ) : (
        /* ==================== GRID VIEW (FAST POS CATALOG MATRIX) ==================== */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] min-h-0 overflow-hidden">
          {/* LEFT COLUMN: Catalog Search, Filter Chips, and Grid */}
          <main className="flex flex-col min-h-0 overflow-y-auto p-5 md:p-6 gap-4 bg-[#F8FAFC]">

            {/* TOP SEARCH + VIEW SWITCHER */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Scan barcode (EAN/SKU) or type to search & add items… (F2)"
                  value={inlineSearchQuery}
                  onChange={(e) => setInlineSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredCatalogProducts.length > 0) {
                      const firstProd = filteredCatalogProducts[0];
                      if (!isOutOfStock(firstProd)) {
                        const defUnit = firstProd.units?.find(u => u.isDefault) || firstProd.units?.[0];
                        addItemToCartWithVariant(firstProd, firstProd.sizes?.[0] || "Standard", firstProd.colors?.[0] || "Default", 1, defUnit?.unitUid);
                        setInlineSearchQuery('');
                      }
                    }
                  }}
                  className="w-full pl-11 pr-20 h-11 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#55349A] focus:ring-2 focus:ring-[#55349A]/15 transition-all placeholder:text-slate-400 shadow-3xs"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {inlineSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setInlineSearchQuery('')}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <span className="font-mono text-[10px] font-bold text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50">
                    F2
                  </span>
                </div>
              </div>

              {/* List / Grid Switcher */}
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-1 shrink-0 h-11 shadow-3xs">
                <button
                  type="button"
                  onClick={() => setInlineViewMode('grid')}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer h-9",
                    inlineViewMode === 'grid'
                      ? "bg-[#55349A] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInlineViewMode('list')}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer h-9",
                    inlineViewMode === 'list'
                      ? "bg-[#55349A] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                  <span>List</span>
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
                Categories:
              </span>
              {categories.map((cat) => {
                const isSelected = selectedKioskCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedKioskCategory(cat)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 border select-none",
                      isSelected
                        ? "bg-[#22251F] border-[#22251F] text-white shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Product Grid Cards */}
            {filteredCatalogProducts.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 space-y-2 shadow-3xs">
                <p className="text-sm font-bold text-slate-700">No products found matching "{inlineSearchQuery}"</p>
                <p className="text-xs text-slate-400">Try searching by item name, barcode, or SKU</p>
                <button
                  type="button"
                  onClick={() => {
                    setInlineSearchQuery('');
                    setSelectedKioskCategory('⭐ Top Items');
                  }}
                  className="mt-2 text-xs font-bold text-[#55349A] hover:underline cursor-pointer"
                >
                  Reset to Top Items
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredCatalogProducts.slice(0, catalogDisplayLimit).map((prod) => {
                    const qty = getCartItemQty(prod.id);
                    const oos = isOutOfStock(prod);
                    const avail = availableStockOf(prod);

                    return (
                      <div
                        key={prod.id}
                        onClick={() => {
                          if (oos) return;
                          if (hasConfigurableOptions(prod)) {
                            setVariantPopupProduct(prod);
                            setSelectedPopupSize(prod.sizes?.[0] || "Standard");
                            setSelectedPopupColor(prod.colors?.[0] || "Default");
                            const defUnit = prod.units?.find(u => u.isDefault) || prod.units?.[0];
                            setSelectedPopupUnitUid(defUnit?.unitUid || '');
                            setPopupQty(1);
                          } else {
                            const defUnit = prod.units?.find(u => u.isDefault) || prod.units?.[0];
                            addItemToCartWithVariant(prod, prod.sizes?.[0] || "Standard", prod.colors?.[0] || "Default", 1, defUnit?.unitUid);
                          }
                        }}
                        className={cn(
                          "text-left border bg-white rounded-2xl p-3 flex flex-col justify-between transition-all duration-150 group font-sans relative select-none cursor-pointer shadow-3xs hover:-translate-y-0.5 min-h-[125px]",
                          oos
                            ? "opacity-45 cursor-not-allowed border-slate-200 bg-slate-50/50"
                            : qty > 0
                              ? "border-[#55349A] shadow-sm ring-1 ring-[#55349A]/30 bg-[#F3E8FF]/10"
                              : "border-slate-200/90 hover:border-[#55349A] hover:shadow-md"
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              {prod.category || 'General'}
                            </span>
                            <span className={cn("text-[10px] font-bold", oos ? "text-rose-600" : (avail == null ? "text-slate-400" : "text-emerald-700"))}>
                              {/* F13: don't fabricate a "15 in stock" placeholder. Show real on-hand
                                  when known, and a neutral marker when the item's stock is unknown. */}
                              {oos ? "● Out of stock" : (avail == null ? "● Stock —" : `● ${avail} in stock`)}
                            </span>
                          </div>

                          <div className="my-1">
                            <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2 group-hover:text-[#55349A] transition-colors">
                              {prod.name}
                            </h4>
                            {(prod.sku || prod.brand) && (
                              <span className="text-[9.5px] text-slate-400 font-mono mt-0.5 block truncate">
                                {[prod.brand, prod.sku].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="font-mono text-xs font-black text-slate-900">
                            {priceWithUnit(prod)}
                          </span>
                          {qty > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-[#2F6F5B] text-white font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-lg shadow-xs">
                              <Check className="h-3 w-3 stroke-[3]" />
                              <span>{qty}</span>
                            </span>
                          ) : hasConfigurableOptions(prod) ? (
                            <span className="text-[10.5px] font-extrabold text-[#55349A] bg-purple-50 group-hover:bg-[#55349A] group-hover:text-white px-2.5 py-0.5 rounded-lg transition-colors border border-purple-200/60 flex items-center gap-1">
                              <span>+ Options</span>
                            </span>
                          ) : (
                            <span className="text-[10.5px] font-extrabold text-[#55349A] bg-[#55349A]/10 group-hover:bg-[#55349A] group-hover:text-white px-2.5 py-0.5 rounded-lg transition-colors">
                              + Add
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredCatalogProducts.length > catalogDisplayLimit && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setCatalogDisplayLimit(prev => prev + 12)}
                      className="px-5 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#55349A] text-[#55349A] text-xs font-bold shadow-3xs transition-all cursor-pointer"
                    >
                      Showing {catalogDisplayLimit} of {filteredCatalogProducts.length} items · Load more
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* RIGHT COLUMN: Dedicated Sticky Cart & Totalizer Sidebar */}
          <aside className="border-l border-[#EAE5DC] bg-[#FFFDF9] flex flex-col h-full overflow-hidden font-sans shadow-sm">
            <div className="shrink-0 bg-white border-b border-[#EAE5DC]">
              <div className="px-5 py-3.5 flex items-center justify-between bg-[#FAF8F5] border-b border-[#EAE5DC]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#55349A]/10 text-[#55349A] flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-extrabold tracking-tight text-slate-900">
                    Order Cart <span className="font-mono text-[11px] font-bold text-[#55349A]">({posCart.length} items · {totalUnits} units)</span>
                  </span>
                </div>
                {posCart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPosCart([])}
                    className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Customer Tile */}
              <div className="p-3.5 bg-gradient-to-b from-purple-50/30 via-[#FFFDF9] to-white border-b border-[#EAE5DC]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      "w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shadow-xs shrink-0",
                      isGuestCustomer
                        ? "bg-amber-100 text-amber-900"
                        : "bg-gradient-to-tr from-[#55349A] to-[#8E24AA] text-white"
                    )}>
                      {isGuestCustomer ? '⚡' : (cust.initials || 'C')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 leading-tight truncate flex items-center gap-1.5">
                        <span className="truncate">{cust.name}</span>
                        {!isGuestCustomer && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[8.5px] font-black uppercase shrink-0">
                            ✓ CRM
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5 truncate">
                        {isGuestCustomer ? 'Walk-in Guest' : [cust.phone, cust.email].filter(Boolean).join(' · ') || `#${cust.id}`}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(true)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer shrink-0 shadow-3xs",
                      isGuestCustomer
                        ? "bg-[#55349A] hover:bg-[#43287A] text-white shadow-purple-900/20 flex items-center gap-1"
                        : "bg-slate-100 hover:bg-slate-200 text-[#55349A]"
                    )}
                  >
                    {isGuestCustomer ? (
                      <>
                        <Sparkles className="h-3 w-3" />
                        <span>+ Link Customer</span>
                      </>
                    ) : (
                      'Change'
                    )}
                  </button>
                </div>
              </div>

              {/* Delivery & Shipping Address Block */}
              <div className="px-3.5 py-2.5 bg-slate-50 border-b border-[#EAE5DC] text-xs">
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px]">
                    <Truck className="h-3.5 w-3.5 text-[#55349A]" />
                    <span>Delivery & Shipping Address</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddressSection(!showAddressSection)}
                    className="text-[10.5px] font-bold text-[#55349A] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                  >
                    <Edit2 className="h-2.5 w-2.5" />
                    <span>{showAddressSection ? 'Done' : (shippingAddress || billingAddress || cust.address ? 'Edit Address' : '+ Add Address')}</span>
                  </button>
                </div>

                {!showAddressSection ? (
                  <div
                    onClick={() => setShowAddressSection(true)}
                    className="p-2 bg-white rounded-lg border border-slate-200 hover:border-[#55349A]/50 transition-colors cursor-pointer"
                  >
                    <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                      {shippingAddress ? 'Shipping Address:' : 'Fulfillment:'}
                    </div>
                    <div className="text-[11px] text-slate-800 font-medium truncate mt-0.5">
                      {shippingAddress || billingAddress || newCustomerAddress || cust.address || 'In-Store / Counter Walk-in (Click to add delivery address)'}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 p-2.5 bg-white rounded-xl border border-purple-200 shadow-2xs animate-in fade-in duration-150">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                        Shipping / Delivery Address
                      </label>
                      <textarea
                        rows={2}
                        value={shippingAddress || ''}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        placeholder="House/Flat No, Building, Street, Area, City, Pincode"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:bg-white focus:border-[#55349A] resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      <input
                        type="checkbox"
                        id="shippingAddressSameCheck"
                        checked={shippingAddressSame}
                        onChange={(e) => {
                          setShippingAddressSame(e.target.checked);
                          if (e.target.checked) setBillingAddress(shippingAddress);
                        }}
                        className="h-3.5 w-3.5 accent-[#55349A] cursor-pointer rounded"
                      />
                      <label htmlFor="shippingAddressSameCheck" className="text-[11px] font-bold text-slate-600 cursor-pointer">
                        Billing address same as shipping
                      </label>
                    </div>

                    {!shippingAddressSame && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                          Billing Address
                        </label>
                        <textarea
                          rows={2}
                          value={billingAddress || ''}
                          onChange={(e) => setBillingAddress(e.target.value)}
                          placeholder="Billing address (if different from shipping)"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:bg-white focus:border-[#55349A] resize-none"
                        />
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddressSection(false)}
                        className="px-3 py-1 bg-[#55349A] text-white text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        Save Address
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-[#FFFDF9]">
              {posCart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-6 space-y-2 border-2 border-dashed border-[#EAE5DC] rounded-2xl bg-white/70">
                  <div className="w-12 h-12 rounded-2xl bg-[#F3E8FF]/60 text-[#55349A] flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 stroke-[1.8]" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-700">Order Cart is Empty</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Scan barcode or tap any catalog tile to add</p>
                  </div>
                </div>
              ) : (
                posCart.map((item, idx) => {
                  const unitPrice = item.unitPrice ?? item.product.price;
                  const itemLineTotal = item.qty * unitPrice;
                  return (
                    <div
                      key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}-${idx}`}
                      className="p-3 bg-white border border-[#EAE5DC] hover:border-[#55349A]/40 rounded-xl flex flex-col gap-2 shadow-3xs transition-all animate-fadeIn"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h5 className="font-extrabold text-xs text-slate-900 leading-snug truncate">
                            {item.product.name}
                          </h5>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <span>₹{unitPrice}</span>
                            {item.selectedSize && item.selectedSize !== 'Standard' && (
                              <span className="text-[#55349A] font-bold">· {item.selectedSize}</span>
                            )}
                          </div>
                        </div>

                        {/* Line Total & Remove */}
                        <div className="text-right shrink-0">
                          <div className="font-mono text-xs font-black text-slate-900">
                            ₹{itemLineTotal.toFixed(2)}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(idx)}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Unit & Batch Selection in Cart */}
                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          {/* Unit Dropdown */}
                          <select
                            value={item.unitUid || ''}
                            onChange={(e) => {
                              const newUnit = item.product.units?.find((u: any) => u.unitUid === e.target.value);
                              setPosCart(prev => prev.map((p, i) => i === idx ? { ...p, unitUid: e.target.value, selectedUnit: newUnit?.name || p.selectedUnit, unitPrice: newUnit?.sellingPrice ?? p.unitPrice } : p));
                            }}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-[10.5px] font-bold text-slate-700 outline-none max-w-[110px] truncate cursor-pointer"
                          >
                            {(item.product.units || [{ name: item.selectedUnit || 'Unit', unitUid: 'def' }]).map((u: any) => (
                              <option key={u.unitUid || u.name} value={u.unitUid}>{u.name || u.unitName || 'Unit'}</option>
                            ))}
                          </select>

                          {/* Batch Dropdown */}
                          <select
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-[10.5px] font-bold text-slate-700 outline-none max-w-[90px] cursor-pointer"
                          >
                            <option value="Batch 1">Batch 1</option>
                            <option value="Batch 2">Batch 2</option>
                          </select>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center bg-[#FAF8F5] border border-[#EAE5DC] rounded-lg p-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(idx, -1)}
                            className="w-5 h-5 rounded hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <span className="w-5 text-center font-mono font-black text-xs text-[#55349A]">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(idx, 1)}
                            className="w-5 h-5 rounded hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar Footer Totals */}
            <div className="p-4 bg-white border-t border-[#EAE5DC] space-y-3 shrink-0">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono font-bold text-slate-900">₹{cartSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Tax ({taxRate}%)</span>
                  <span className="font-mono font-bold text-slate-900">₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-black text-slate-900">Total</span>
                  <span className="text-base font-black text-[#55349A] font-mono">₹{total.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmOrder}
                className="w-full py-3 bg-[#55349A] hover:bg-[#43287A] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <span>Confirm Order</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </aside>
        </div>
      )}
{/* Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          totalAmount={total}
          customerName={cust.name}
          orderId={pendingCheckoutOrderId}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Option Selection Popup Modal (for multi-unit or variant items) */}
      {variantPopupProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs select-none animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col text-left font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">{variantPopupProduct.category}</span>
                <h3 className="text-sm font-extrabold text-slate-900">{variantPopupProduct.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setVariantPopupProduct(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Selling Unit selector */}
            {variantPopupProduct.units && variantPopupProduct.units.length > 1 && (
              <div className="mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Selling Unit</span>
                <div className="flex flex-wrap gap-2">
                  {variantPopupProduct.units.map(u => {
                    const active = (activeUnitOf(variantPopupProduct, selectedPopupUnitUid)?.unitUid) === u.unitUid;
                    return (
                      <button
                        key={u.unitUid}
                        type="button"
                        onClick={() => setSelectedPopupUnitUid(u.unitUid)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                          active
                            ? "bg-[#55349A] border-[#55349A] text-white"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {u.name} · ₹{Number(u.sellingPrice ?? 0).toLocaleString('en-IN')}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size selector */}
            {variantPopupProduct.sizes && variantPopupProduct.sizes.filter(s => s && s.toLowerCase() !== 'standard').length > 0 && (
              <div className="mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Size</span>
                <div className="flex flex-wrap gap-2">
                  {variantPopupProduct.sizes.map(sz => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedPopupSize(sz)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                        selectedPopupSize === sz
                          ? "bg-[#55349A] border-[#55349A] text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Qty and Confirm Add */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Qty:</span>
                <div className="flex items-center border border-slate-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPopupQty(Math.max(1, popupQty - 1))}
                    className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 cursor-pointer"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center font-bold text-xs font-mono">{popupQty}</span>
                  <button
                    type="button"
                    onClick={() => setPopupQty(popupQty + 1)}
                    className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  addItemToCartWithVariant(
                    variantPopupProduct,
                    selectedPopupSize || variantPopupProduct.sizes?.[0] || 'Standard',
                    selectedPopupColor || variantPopupProduct.colors?.[0] || 'Default',
                    popupQty,
                    selectedPopupUnitUid
                  );
                  setVariantPopupProduct(null);
                }}
                className="bg-[#55349A] hover:bg-[#432380] text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Customer Search & Add Modal (Without leaving POS Cart!) */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setShowCustomerModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-left z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-150 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-primary-100 text-[#55349A] flex items-center justify-center font-bold">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Select or Add Customer</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Link a customer profile or patient to this order</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs: Search / Add New */}
            <div className="px-5 pt-3 pb-2 border-b border-slate-150 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full">
                <button
                  type="button"
                  onClick={() => setCustomerTab('search')}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    customerTab === 'search' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Search Customer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerTab('create')}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    customerTab === 'create' ? "bg-white text-[#55349A] shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Customer / Patient</span>
                </button>
              </div>
            </div>

            {/* Content Body */}
            {customerTab === 'search' ? (
              <div className="p-5 space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    autoFocus
                    value={customerSearchText}
                    onChange={(e) => setCustomerSearchText(e.target.value)}
                    placeholder="Search by name, mobile number, or CRM ID..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#55349A] focus:ring-2 focus:ring-primary-500/10 outline-none transition-all"
                  />
                </div>

                {/* Quick Guest Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (setCustomerMode) setCustomerMode('guest');
                    if (setSelectedCustomerId) setSelectedCustomerId('');
                    setShowCustomerModal(false);
                  }}
                  className={cn(
                    "w-full p-2.5 rounded-xl border transition-all flex items-center justify-between text-left cursor-pointer",
                    isGuestCustomer
                      ? "border-[#55349A] bg-primary-50/30 ring-1 ring-[#55349A]/20"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                      GW
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Walk-in Guest Checkout</div>
                      <div className="text-[10px] text-slate-500">Quick checkout without attaching customer records</div>
                    </div>
                  </div>
                  {isGuestCustomer && <Check className="h-4 w-4 text-[#55349A]" />}
                </button>

                {/* Customer Results List */}
                <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">
                    Matched Customers ({filteredCustomersList.length})
                  </div>
                  {filteredCustomersList.length === 0 ? (
                    <div className="text-center py-5 text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-xl">
                      <User className="h-6 w-6 text-slate-300 mx-auto" />
                      <p className="text-xs font-semibold">No customer found matching "{customerSearchText}"</p>
                      <button
                        type="button"
                        onClick={() => {
                          setNewCustomerForm(prev => ({ ...prev, firstName: customerSearchText }));
                          setCustomerTab('create');
                        }}
                        className="text-xs font-bold text-[#55349A] hover:underline cursor-pointer"
                      >
                        + Create "{customerSearchText}" as New Customer
                      </button>
                    </div>
                  ) : (
                    filteredCustomersList.map((c: any) => {
                      const isSelected = selectedCustomerId === (c.id || c.uid);
                      return (
                        <button
                          key={c.id || c.uid}
                          type="button"
                          onClick={() => {
                            if (setCustomerMode) setCustomerMode('existing');
                            if (setSelectedCustomerId) setSelectedCustomerId(c.id || c.uid);
                            if (c.address) {
                              if (setBillingAddress) setBillingAddress(c.address);
                              if (setShippingAddress) setShippingAddress(c.address);
                            }
                            setShowCustomerModal(false);
                          }}
                          className={cn(
                            "w-full p-2.5 rounded-xl border transition-all flex items-center justify-between text-left cursor-pointer",
                            isSelected
                              ? "border-[#55349A] bg-primary-50/30 ring-1 ring-[#55349A]/20"
                              : "border-slate-150 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {c.name ? c.name.slice(0, 2).toUpperCase() : (c.firstName ? c.firstName.slice(0, 2).toUpperCase() : 'CU')}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {c.name || c.firstName || 'Customer'}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                                <span>{c.consumerNo ? '#' + c.consumerNo : '#' + (c.id || c.uid || '').slice(0, 8)}</span>
                                {c.phone && <span>· {c.phone}</span>}
                              </div>
                            </div>
                          </div>
                          {isSelected ? (
                            <Check className="h-4 w-4 text-[#55349A] shrink-0" />
                          ) : (
                            <span className="text-[11px] font-bold text-[#55349A] hover:underline shrink-0">Select</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* Add New Customer / Patient Form */
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newCustomerForm.firstName.trim()) return;
                  setIsCreatingCustomer(true);
                  try {
                    const created = await createCustomerMutation.mutateAsync({
                      firstName: newCustomerForm.firstName.trim(),
                      primaryNumber: newCustomerForm.phone.trim() || undefined,
                      email: newCustomerForm.email.trim() || undefined,
                      address: newCustomerForm.address.trim() || undefined,
                    });
                    if (created && (created.uid || (created as any).id)) {
                      const cid = created.uid || (created as any).id;
                      if (setCustomerMode) setCustomerMode('existing');
                      if (setSelectedCustomerId) setSelectedCustomerId(cid);
                      if (newCustomerForm.address && setBillingAddress) setBillingAddress(newCustomerForm.address);
                    } else {
                      if (setCustomerMode) setCustomerMode('create');
                      if (setNewCustomerName) setNewCustomerName(newCustomerForm.firstName.trim());
                      if (setNewCustomerPhone) setNewCustomerPhone(newCustomerForm.phone.trim());
                      if (setNewCustomerEmail) setNewCustomerEmail(newCustomerForm.email.trim());
                      if (setNewCustomerAddress) setNewCustomerAddress(newCustomerForm.address.trim());
                      if (newCustomerForm.address && setBillingAddress) setBillingAddress(newCustomerForm.address);
                    }
                    setShowCustomerModal(false);
                    setNewCustomerForm({ firstName: '', phone: '', email: '', address: '' });
                  } catch (err) {
                    if (setCustomerMode) setCustomerMode('create');
                    if (setNewCustomerName) setNewCustomerName(newCustomerForm.firstName.trim());
                    if (setNewCustomerPhone) setNewCustomerPhone(newCustomerForm.phone.trim());
                    if (setNewCustomerEmail) setNewCustomerEmail(newCustomerForm.email.trim());
                    if (setNewCustomerAddress) setNewCustomerAddress(newCustomerForm.address.trim());
                    if (newCustomerForm.address && setBillingAddress) setBillingAddress(newCustomerForm.address);
                    setShowCustomerModal(false);
                  } finally {
                    setIsCreatingCustomer(false);
                  }
                }}
                className="p-5 space-y-3"
              >
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Customer / Patient Name *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newCustomerForm.firstName}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter full name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#55349A] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Mobile Phone *</label>
                    <input
                      type="tel"
                      required
                      value={newCustomerForm.phone}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="10-digit mobile"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#55349A] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={newCustomerForm.email}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="customer@email.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#55349A] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Address (Optional)</label>
                  <input
                    type="text"
                    value={newCustomerForm.address}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Street, City, Pin Code"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#55349A] outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerTab('search')}
                    className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-xl cursor-pointer"
                  >
                    Back to Search
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingCustomer || !newCustomerForm.firstName.trim()}
                    className="px-4 py-2 bg-[#55349A] hover:bg-[#432480] text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
                  >
                    {isCreatingCustomer ? <span>Saving...</span> : <span>Save & Link to Order</span>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
</div>
  );
};
