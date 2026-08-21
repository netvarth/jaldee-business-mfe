import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Plus, Minus, MoreHorizontal, ArrowDown, Check, Eye, Trash2,
  ShoppingCart, Calendar, User, ShieldAlert, Award, FileText,
  CornerUpLeft,
  CheckCircle2,
  RotateCcw,
  Truck, Copy, Tag, UserPlus, Star, Printer, X, Download,
  RefreshCw, XCircle, ChevronRight, HelpCircle, ArrowLeft, ArrowRight,
  ChevronDown, Filter, Store, Share2, MapPin, Mail, Phone, Activity,
  Pencil, ChevronUp, Upload, Camera, Sparkles, CheckCircle, ZoomIn, Edit,
  LayoutGrid, List, Layers, CreditCard, QrCode, Banknote, Globe, Coins, Clock, ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { DraftOrderStep1 } from './DraftOrderStep1';
import { DraftOrderStep2 } from './DraftOrderStep2';
import { OrderLabelModal, OrderAssigneeModal, OrderTemplateModal, OrderRatingModal, PhotoLightbox, OrderDetailDrawer, OrderInvoiceModal, OrderCancelWarningModal } from './OrdersModals';
import { useOrderFilters } from '../hooks/useOrderFilters';
import { OrdersFilterDrawer } from './OrdersFilterDrawer';
import { OrderCreateWizard } from './OrderCreateWizard';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useOrdersData } from '../hooks/useOrdersData';
import { useOrderInvoice } from '../../../services/useOrderInvoice';
import { InvoiceSheet } from '../../../pages/TaxInvoicePage';
import { BulkLabelPreview, SingleLabelPreview } from '../../../pages/shipping/LabelPreview';

export interface OrderItem {
  id: string; // Order uid (routing/mutation key)
  orderNo?: string; // Human-readable order number (ORD-xxxxx); absent on orders the backend never numbered
  date: string; // Order Date
  customerName: string;
  customerId: string; // consumerUid — the base-CRM consumer this order belongs to
  customerNo?: string; // CRM customer number (readable id shown in the list)
  customerPhone?: string;
  customerEmail?: string;
  billingAddress?: string;  // ORD-020: address snapshot on the order
  shippingAddress?: string;
  channel: 'walkin' | 'online';
  itemsCount: number;
  totalAmount: number;
  status: 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Returned';
  label?: { text: string; color: string; bg: string };
  assignee?: { name: string; role: string; avatar: string };
  review?: { rating: number; comment: string; date: string };
  invoiceTemplate?: 'Standard' | 'Elegant' | 'Compact';
  store?: string;
  invoiceType?: string;
  catalogs?: string[];
}

const AVAILABLE_LABELS = [
  { text: "VIP", color: "#B45309", bg: "#FEF3C7" },
  { text: "Urgent", color: "#DC2626", bg: "#FEE2E2" },
  { text: "Fragile", color: "#1D4ED8", bg: "#DBEAFE" },
  { text: "Standard", color: "#047857", bg: "#D1FAE5" },
  { text: "None", color: "", bg: "" }
];

const AVAILABLE_ASSIGNEES: Array<{ name: string; role: string; avatar: string }> = [];

// (removed existingCustomers — POS picker uses live useCustomers)

const AVAILABLE_INVOICE_TYPES = ["B2C", "B2B"];


export interface POSUnit {
  unitUid: string;
  name: string;
  conversionQty: number;   // qty of base unit per 1 of this unit
  sellingPrice: number;
  isDefault?: boolean;
}

export interface POSProduct {
  id: string;
  itemUid?: string;        // real commerce item uid (for the order payload)
  variantUid?: string;     // real variant uid when the offering is a specific variant
  name: string;
  category: string;
  price: number;
  image: string;
  sizes: string[];
  colors: string[];
  units?: POSUnit[];       // real selling units for this item
  inHand?: number | null;
  trackInventory?: boolean; // when false the item is not stock-managed → always sellable
  code?: string;
  sku?: string;
  barcode?: string;
  brand?: string;
}

export interface POSCartItem {
  product: POSProduct;
  qty: number;
  selectedSize: string;
  selectedColor: string;
  selectedUnit?: string;   // display label of the chosen selling unit
  unitUid?: string;        // chosen selling unit uid (sent to backend)
  unitPrice?: number;      // price for the chosen selling unit
  sellQty?: number;        // qty expressed in the selling unit
}

export const POS_PRODUCTS: POSProduct[] = [];

export const PRODUCT_REVIEWS_AND_PHOTOS: Record<string, {
  rating: number;
  author: string;
  avatar: string;
  date: string;
  comment: string;
  photos: string[];
}[]> = {
  "POS-001": [
    {
      rating: 5,
      author: "Sneha Reddy",
      avatar: "SR",
      date: "2026-05-21",
      comment: "Absolutely gorgeous shirt! The linen blend fabric is incredibly breathable, light, and fits like an absolute dream. Highly recommended for daily office commutes during summer.",
      photos: [
        "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=80"
      ]
    }
  ],
  "POS-002": [
    {
      rating: 4,
      author: "Vikram Malhotra",
      avatar: "VM",
      date: "2026-05-19",
      comment: "Stout material and solid double-needle stitching. Fits straight and modern as shown. Left pocket is deep enough for large screens.",
      photos: [
        "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=500&auto=format&fit=crop&q=80"
      ]
    }
  ],
  "POS-003": [
    {
      rating: 5,
      author: "Aditya Puri",
      avatar: "AP",
      date: "2026-05-18",
      comment: "This watch is an absolute stunner. Captures the studio light beautifully and gets nice comments everywhere. Weight feels high-end and premium.",
      photos: [
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1622434641406-a158123450f9?w=500&auto=format&fit=crop&q=80"
      ]
    }
  ],
  "POS-004": [
    {
      rating: 5,
      author: "Karan Johar",
      avatar: "KJ",
      date: "2026-05-20",
      comment: "Unmatched comfort and bold crimson color! Looks even better under outdoor sunshine. Outsole has amazing traction and responsiveness.",
      photos: [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&auto=format&fit=crop&q=80"
      ]
    }
  ],
  "POS-005": [
    {
      rating: 5,
      author: "Ritu Kumar",
      avatar: "RK",
      date: "2026-05-16",
      comment: "Perfect daily sneakers. Exceptionally comfortable for all-day conferences and long walk shifts. Blends perfectly with casual and semi-formal wear.",
      photos: [
        "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=500&auto=format&fit=crop&q=80"
      ]
    }
  ],
  "POS-006": [
    {
      rating: 4,
      author: "Anish Gupta",
      avatar: "AG",
      date: "2026-05-15",
      comment: "Powerful productivity workstation. Backlit keyboard makes typing logs super comfortable at night. Speakers are crisp for video calls.",
      photos: [
        "https://images.unsplash.com/photo-1496181130204-7552cc145cdb?w=500&auto=format&fit=crop&q=80"
      ]
    }
  ],
  "POS-007": [
    {
      rating: 5,
      author: "Rohan Mehra",
      avatar: "RM",
      date: "2026-05-14",
      comment: "Incredible heavy bass response and active ambient transparency filter. Over-ear padding is secure yet plush. Beautiful minimal matte aesthetics.",
      photos: [
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500&auto=format&fit=crop&q=80"
      ]
    }
  ]
};

export const OrdersTable = () => {
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarStyle = (name: string) => {
    const colors = [
      { bg: '#E1523D', text: '#FFFFFF' }, // Orange
      { bg: '#EA4335', text: '#FFFFFF' }, // Red
      { bg: '#1A73E8', text: '#FFFFFF' }, // Blue
      { bg: '#8A3FFC', text: '#FFFFFF' }, // Purple
      { bg: '#0F9D58', text: '#FFFFFF' }  // Green
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    const pair = colors[sum % colors.length];
    return { backgroundColor: pair.bg, color: pair.text };
  };

  const formatOrderDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      const day = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthStr = months[d.getMonth()];
      const year = d.getFullYear();

      const formattedDayVal = day < 10 ? `0${day}` : `${day}`;

      // Date-only values (no time component) must not imply a time we don't have.
      if (!/\d{2}:\d{2}/.test(dateStr)) {
        return `${formattedDayVal} ${monthStr} ${year}`;
      }

      const timeStr = d.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
      return `${formattedDayVal} ${monthStr} ${year} • ${timeStr}`;
    } catch {
      return dateStr;
    }
  };

  const getStatusStyles = (status?: string) => {
    const s = String(status || '').toUpperCase();
    if (s === 'PENDING') return "bg-[#FFF5EC] text-[#B25E00]";
    if (s === 'CONFIRMED') return "bg-[#EAF2FA] text-[#1A73E8]";
    if (s === 'SHIPPED') return "bg-[#F3E8FF] text-[#55349A]";
    if (s === 'DELIVERED') return "bg-[#E6F4EA] text-[#137333]";
    if (s === 'COMPLETED') return "bg-[#DEF7EC] text-[#03543F] border border-emerald-300";
    if (s === 'CANCELLED') return "bg-[#FCE8E6] text-[#C5221F]";
    if (s === 'RETURNED') return "bg-[#F1F3F4] text-[#5F6368]";
    return "bg-[#F1F3F4] text-[#5F6368]";
  };

  const getStatusDot = (status?: string) => {
    const s = String(status || '').toUpperCase();
    if (s === 'PENDING') return "bg-[#FF8800]";
    if (s === 'CONFIRMED') return "bg-[#1A73E8]";
    if (s === 'SHIPPED') return "bg-[#55349A]";
    if (s === 'DELIVERED') return "bg-[#0F9D58]";
    if (s === 'COMPLETED') return "bg-[#03543F]";
    if (s === 'CANCELLED') return "bg-[#D93025]";
    return "bg-[#70757A]";
  };

  const [selectedStore, setSelectedStore] = useState('');
  const ordersData = useOrdersData(selectedStore);
  const {
    backendOrders,
    ordersLoading,
    createOrderMutation,
    updateOrderMutation,
    updateStatusMutation,
    cancelOrderMutation,
    raiseInvoiceMutation,
    recordPaymentMutation,
    reviewOrderMutation,
    attachConsumer,
    assignOrderMutation,
    setOrderLabelMutation,
    staffAssignees,
    backendItems,
    backendStores,
    backendCatalogs,
    tradePartners,
    backendUnits,
    backendCustomers,
    createCustomerMutation,
    consumerMandatory,
    existingCustomers,
    availableStores,
    availableCatalogs,
    unitNameByUid,
    backendItemMap,
    activeProducts,
    productCategories,
    selectedStoreUid,
    storeCatalogItems,
  } = ordersData;

  const handleUpdateOrderStatus = (newStatus: 'Delivered' | 'Completed' | 'Cancelled' | 'Shipped') => {
    const finalId = activeGeneratedOrderId;
    if (finalId) {
      const backendStatus = newStatus.toUpperCase();
      updateStatusMutation.mutate({
        uid: finalId,
        status: backendStatus
      });
      setOrders(prev => prev.map(o => o.id === finalId ? { ...o, status: newStatus as any } : o));
    }
    setCurrentOrderStatus(newStatus as any);
  };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // The base-CRM consumer UID of the order currently being viewed (Order Details). Kept
  // separate from the display id so ORD-018 can link to the real customer profile.
  const [viewOrderConsumerUid, setViewOrderConsumerUid] = useState<string | null>(null);
  const [viewOrderDate, setViewOrderDate] = useState<string>('');
  const [viewOrderCanAttach, setViewOrderCanAttach] = useState(false);
  const [attachPickerOpen, setAttachPickerOpen] = useState(false);
  const [attachSearch, setAttachSearch] = useState('');
  const [attachMode, setAttachMode] = useState<'search' | 'create'>('search');
  const [attachNewFirstName, setAttachNewFirstName] = useState('');
  const [attachNewLastName, setAttachNewLastName] = useState('');
  const [attachNewPhone, setAttachNewPhone] = useState('');
  const [attachNewEmail, setAttachNewEmail] = useState('');
  const [attachNewAddress, setAttachNewAddress] = useState('');
  const [isCreatingAndAttaching, setIsCreatingAndAttaching] = useState(false);
  const [b2bPartnerUid, setB2bPartnerUid] = useState('');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync backend orders into local state (live data only — no mock fallback)
  React.useEffect(() => {
    if (backendOrders) {
      const mapped = backendOrders.map((o: any) => {
        const rawStatus = (o.status || o.orderStatus || 'PENDING').toString().toUpperCase();
        let normalizedStatus: OrderItem['status'] = 'Pending';
        if (rawStatus === 'CONFIRMED') normalizedStatus = 'Confirmed';
        else if (rawStatus === 'SHIPPED') normalizedStatus = 'Shipped';
        else if (rawStatus === 'DELIVERED') normalizedStatus = 'Delivered';
        else if (rawStatus === 'COMPLETED') normalizedStatus = 'Completed';
        else if (rawStatus === 'CANCELLED') normalizedStatus = 'Cancelled';
        else if (rawStatus === 'RETURNED') normalizedStatus = 'Returned';

        const lines = o.orderLines || o.items || [];
        const itemsCount = o.itemsCount || lines.reduce((acc: number, li: any) => acc + (Number(li.quantity || li.qty) || 1), 0) || 1;
        const totalAmount = Number(o.totalAmount || o.netTotal || o.orderTotal || o.total) || 0;

        return {
          id: o.uid || o.id,
          orderNo: o.orderNo || undefined,
          date: o.orderDate || o.createdAt || '',
          customerName: o.consumerName || o.customerName || 'Walk-in Customer',
          customerPhone: o.consumerPhone || o.customerPhone || '',
          customerEmail: o.consumerEmail || o.customerEmail || '',
          itemsCount,
          totalAmount,
          items: lines.map((li: any) => ({
            name: li.itemName || li.name || 'Order Item',
            qty: Number(li.quantity || li.qty) || 1,
            price: Number(li.price || li.unitPrice) || 0,
            unitName: li.unitName || undefined,
          })),
          total: totalAmount,
          status: normalizedStatus,
          paymentStatus: (o.paymentStatus || 'UNPAID') as OrderItem['paymentStatus'],
          deliveryType: (o.deliveryMode || o.deliveryType || 'PICKUP') as OrderItem['deliveryType'],
          assignee: o.assigneeName || o.assignee || undefined,
          labels: Array.isArray(o.labels) ? o.labels : [],
          notes: o.notes || o.orderNotes || undefined,
          auditLogs: o.auditLogs || [],
        };
      });
      setOrders(mapped);
    }
  }, [backendOrders]);

  // Quick utilities state
  const [assigneeOrder, setAssigneeOrder] = useState<OrderItem | null>(null);
  const [labelOrder, setLabelOrder] = useState<OrderItem | null>(null);
  const [templateOrder, setTemplateOrder] = useState<OrderItem | null>(null);
  const [viewingOrder, setViewingOrder] = useState<OrderItem | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<OrderItem | null>(null);
  const [ratingOrder, setRatingOrder] = useState<OrderItem | null>(null);
  const [viewingReviewsOrder, setViewingReviewsOrder] = useState<OrderItem | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [cancelTargetOrderIds, setCancelTargetOrderIds] = useState<string[] | null>(null);
  const [bulkStatusMenuOpen, setBulkStatusMenuOpen] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [activePhotoLightbox, setActivePhotoLightbox] = useState<string | null>(null);
  const [expandedItemReviews, setExpandedItemReviews] = useState<Record<string, boolean>>({});
  const [step1Errors, setStep1Errors] = useState<Record<string, string | undefined>>({});

  // New order form wizard states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [enableOrderPreSetup, setEnableOrderPreSetup] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('karty_enable_order_presetup');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowCreateModal(true);
      setCreateStep(enableOrderPreSetup ? 1 : 2);
      setCurrentOrderStatus('Draft');
      setInvoiceGenerated(false);
      setOpenedFromList(false);
    }
  }, [searchParams, enableOrderPreSetup]);

  const [openedFromList, setOpenedFromList] = useState(false);
  const [currentOrderStatus, setCurrentOrderStatus] = useState<'Draft' | 'Confirmed' | 'Completed'>('Draft');
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);
  const [activeGeneratedOrderId, setActiveGeneratedOrderId] = useState<string>('');
  const [showShippingLabelModal, setShowShippingLabelModal] = useState<boolean>(false);
  const [activeGeneratedOrderNo, setActiveGeneratedOrderNo] = useState<string>('');
  const [activeGeneratedOrder, setActiveGeneratedOrder] = useState<any>(null);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderNo: string | null;
    customerName: string;
    total: number;
    items: number;
  } | null>(null);

  // Draft Creation Step 1 States
  const [customerMode, setCustomerMode] = useState<'guest' | 'existing' | 'create'>('guest');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [searchCustomerQuery, setSearchCustomerQuery] = useState('');
  const [searchB2bPartnerQuery, setSearchB2bPartnerQuery] = useState('');

  const [selectedInvoiceType, setSelectedInvoiceType] = useState('B2C');
  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([]);

  // Automatically pre-select first store if not selected
  useEffect(() => {
    if (!selectedStore && availableStores.length > 0) {
      setSelectedStore(availableStores[0].name);
    }
  }, [availableStores, selectedStore]);

  // Keep catalog selection in sync with the (store-scoped) available catalogs: drop any selection
  // that no longer belongs to the chosen store, and default to all of the store's catalogs when
  // nothing valid remains (initial load or after switching fulfillment store).
  useEffect(() => {
    setSelectedCatalogs(prev => {
      const valid = prev.filter(c => availableCatalogs.includes(c));
      // Keep a still-valid sub-selection; otherwise default to all of the store's catalogs
      // (or clear to none when the store has no catalogs at all).
      return valid.length > 0 ? valid : availableCatalogs;
    });
  }, [availableCatalogs]);

  const conversionByItemUnit = React.useMemo(() => {
    const map: Record<string, number> = {};
    (backendItems || []).forEach((item: any) => {
      (item.units || []).forEach((u: any) => {
        if (item.uid && u.unitUid) {
          map[`${item.uid}|${u.unitUid}`] = Number(u.conversionQty) || 1;
        }
      });
    });
    return map;
  }, [backendItems]);

  const catalogProducts = React.useMemo<POSProduct[] | null>(() => {
    if (!storeCatalogItems || storeCatalogItems.length === 0) return null;

    // Deduplicate offerings by unique itemUid/variantUid key
    const prodMap = new Map<string, POSProduct>();

    storeCatalogItems.forEach((oci: any) => {
      const itemUid = oci.itemUid;
      const masterItem = backendItemMap.get(itemUid) || {};
      const itemName = (oci.itemName || masterItem.name || "Unknown Item").trim();
      const key = (itemUid || itemName).toLowerCase();

      const units: POSUnit[] = (oci.units || [])
        .filter((u: any) => u?.active !== false && u?.unitUid)
        .map((u: any) => ({
          unitUid: u.unitUid,
          name: unitNameByUid[u.unitUid] || u.unitName || 'Unit',
          conversionQty: conversionByItemUnit[`${itemUid}|${u.unitUid}`] || 1,
          sellingPrice: Number(u.sellingPrice) || 0,
          isDefault: !!u.defaultUnit,
        }));

      const resolvedUnits: POSUnit[] = units.length > 0 ? units : (masterItem.units || [])
        .filter((u: any) => u?.selling)
        .map((u: any) => ({
          unitUid: u.unitUid,
          name: unitNameByUid[u.unitUid] || u.unitName || u.name || 'Unit',
          conversionQty: Number(u.conversionQty) || 1,
          sellingPrice: Number(u.sellingPrice) || 0,
          isDefault: !!u.isDefault,
        }));

      const defaultUnit = resolvedUnits.find((u) => u.isDefault) || resolvedUnits[0];
      const catName = masterItem.categoryName || masterItem.category?.name || oci.categoryName || oci.category || 'General';
      const barcode = masterItem.attributes?.barcode || masterItem.barcode || oci.barcode || '';
      const sku = masterItem.sku || oci.itemCode || oci.sku || '';
      const code = masterItem.code || oci.itemCode || '';
      const brand = masterItem.brandName || masterItem.brand || '';
      const imgUrl = oci.image || oci.imageUrl || oci.itemImage || masterItem.image || masterItem.displayImage || masterItem.imageUrl || '';
      const price = Number(defaultUnit?.sellingPrice) || Number(masterItem.price) || 0;

      if (!prodMap.has(key)) {
        prodMap.set(key, {
          id: oci.uid || itemUid,
          itemUid,
          variantUid: oci.variantUid || undefined,
          name: oci.itemName || masterItem.name || 'Unknown Item',
          category: catName,
          price,
          image: imgUrl,
          sizes: ['Standard'],
          colors: ['Default'],
          units: resolvedUnits,
          inHand: oci.inHand === undefined ? null : oci.inHand,
          trackInventory: masterItem.trackInventory,
          code,
          sku,
          barcode,
          brand,
        });
      } else {
        const existing = prodMap.get(key)!;
        if (price > 0 && existing.price === 0) {
          existing.price = price;
        }
        if (resolvedUnits.length > 0 && (!existing.units || existing.units.length === 0)) {
          existing.units = resolvedUnits;
        }
      }
    });

    return Array.from(prodMap.values());
  }, [storeCatalogItems, backendItemMap, unitNameByUid, conversionByItemUnit]);

  const pickerProducts = React.useMemo(() => {
    if (catalogProducts && catalogProducts.length > 0) {
      return catalogProducts;
    }
    return activeProducts;
  }, [catalogProducts, activeProducts]);

  const isHealthOrder = false;

  // Step 3 (Order Details Checkout Confirmation) States
  const [prescribedBy, setPrescribedBy] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingAddressSame, setShippingAddressSame] = useState(true);
  const [businessName, setBusinessName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState<Record<string, string>>({});

  // Workflow states matching the requested behavior and image.png
  const [showInvoiceDetailsPage, setShowInvoiceDetailsPage] = useState(false);
  const [isOrderEditable, setIsOrderEditable] = useState(true);
  const [moreActionsDropdownOpen, setMoreActionsDropdownOpen] = useState(false);
  const [paymentDropdownOpen, setPaymentDropdownOpen] = useState(false);
  // Shipping-label print flows: bulk (from the selected list rows) and single (from an order).
  const [bulkLabelsOpen, setBulkLabelsOpen] = useState(false);
  const [singleLabelUid, setSingleLabelUid] = useState<string | null>(null);

  // GST Tax Invoice — built from the saved order (real backend uid only; the create
  // flow's fabricated "ORD-xxxx" ids are skipped so the query stays disabled for them).
  // Seller name is left blank so useOrderInvoice falls back to the store name — we avoid
  // useMFEProps() here because it throws outside the shell provider and this is the
  // high-traffic orders list.
  const gstInvoiceUid =
    activeGeneratedOrderId && !activeGeneratedOrderId.startsWith('ORD-')
      ? activeGeneratedOrderId
      : undefined;
  const { data: gstInvoice, isLoading: gstInvoiceLoading } = useOrderInvoice(
    gstInvoiceUid,
    '',
  );

  // Records a real offline payment (cash/UPI/card) against the order's finance invoice.
  // `mode` is a finance PaymentMode name. On full settlement we warn before marking the order
  // completed (payment status is kept separate from fulfillment status).
  const handleGetPayment = (mode: string, label: string) => {
    setPaymentDropdownOpen(false);
    if (!gstInvoiceUid) { alert("Save the order before recording a payment."); return; }
    recordPaymentMutation.mutate(
      { uid: gstInvoiceUid, mode },
      {
        onSuccess: (res: any) => {
          if (res?.fullyPaid) {
            if (confirm(`Payment received via ${label}. This order is now fully paid — mark it as Completed?`)) {
              setCurrentOrderStatus('Completed');
            }
          } else {
            alert(`Payment of ₹${res?.amountPaid ?? ''} received via ${label}. Balance due: ₹${res?.amountDue ?? ''}.`);
          }
        },
        onError: (e: any) => alert(`Couldn't record the payment: ${e?.message || 'server error'}`),
      },
    );
  };
  const [orderLogExpanded, setOrderLogExpanded] = useState(true);

  useEffect(() => {
    const handleShowList = () => {
      setShowCreateModal(false);
      setShowInvoiceDetailsPage(false);
    };
    window.addEventListener('show-orders-list', handleShowList);
    return () => {
      window.removeEventListener('show-orders-list', handleShowList);
    };
  }, []);



  // New order form second-step states
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newCustomerGender, setNewCustomerGender] = useState('');
  const [newCustomerDob, setNewCustomerDob] = useState('');
  const [showMoreCustomerFields, setShowMoreCustomerFields] = useState(false);
  const [newChannel, setNewChannel] = useState<'walkin' | 'online'>('walkin');
  const [newStatus, setNewStatus] = useState<OrderItem['status']>('Confirmed');

  // Walk-in POS states for Step 2
  const [posCart, setPosCart] = useState<POSCartItem[]>([]);
  const [posCategory, setPosCategory] = useState<string>('All');
  const [posSearch, setPosSearch] = useState<string>('');
  const [posViewMode, setPosViewMode] = useState<'card' | 'list'>('card');
  const [editingCartItemIndex, setEditingCartItemIndex] = useState<number | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, { size: string; color: string }>>({});

  // OVERHAULED POS STATE ENGINES
  const [activeVariantProduct, setActiveVariantProduct] = useState<POSProduct | null>(null);
  const [selectedSizeState, setSelectedSizeState] = useState<string>('');
  const [selectedColorState, setSelectedColorState] = useState<string>('');
  const [variantQtyState, setVariantQtyState] = useState<number>(1);
  const [isEditVariantMode, setIsEditVariantMode] = useState<boolean>(false);
  const [posToast, setPosToast] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'netbanking'>('card');
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState<boolean>(false);
  const [filterBrand, setFilterBrand] = useState<string>('All');
  const [filterStockStatus, setFilterStockStatus] = useState<string>('All');
  const [filterMaxPrice, setFilterMaxPrice] = useState<number>(15050);

  // Orders list filters hook (11 filter facets + filteredOrders calculation)
  const filters = useOrderFilters(orders, searchQuery);
  const {
    filterDropdownOpen,
    setFilterDropdownOpen,
    activeDropdownId,
    setActiveDropdownId,
    activeFilterCount,
    filteredOrders,
  } = filters;

  // Custom states matching image.png workflow
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addItemSearchQuery, setAddItemSearchQuery] = useState('');

  // Global Enter Key Handler for Step 1: Pressing Enter instantly proceeds to POS Order Creation (Step 2)
  useEffect(() => {
    if (!showCreateModal || createStep !== 1) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const target = e.target as HTMLElement | null;
        if (target?.tagName === 'TEXTAREA') return;

        // If cashier is currently typing in the customer search input
        if (searchCustomerQuery && searchCustomerQuery.trim().length > 0) {
          const matched = (existingCustomers || []).filter(c =>
            (c.name || '').toLowerCase().includes(searchCustomerQuery.toLowerCase()) ||
            (c.phone || '').includes(searchCustomerQuery) ||
            (c.consumerNo || '').toLowerCase().includes(searchCustomerQuery.toLowerCase())
          );
          if (matched.length > 0) {
            e.preventDefault();
            setSelectedCustomerId(matched[0].id);
            setSearchCustomerQuery('');
            setStep1Errors(prev => ({ ...prev, customer: undefined }));
            if (selectedCatalogs.length > 0) {
              setCreateStep(2);
            }
            return;
          }
        }

        // If in B2B partner search
        if (searchB2bPartnerQuery && searchB2bPartnerQuery.trim().length > 0) {
          const matched = (tradePartners ?? []).filter((p: any) =>
            p.status === 'ACTIVE' && (
              (p.name || '').toLowerCase().includes(searchB2bPartnerQuery.toLowerCase()) ||
              (p.uid || '').toLowerCase().includes(searchB2bPartnerQuery.toLowerCase())
            )
          );
          if (matched.length > 0) {
            e.preventDefault();
            setB2bPartnerUid(matched[0].uid);
            setSearchB2bPartnerQuery('');
            setStep1Errors(prev => ({ ...prev, customer: undefined }));
            if (selectedCatalogs.length > 0) {
              setCreateStep(2);
            }
            return;
          }
        }

        // Check if customer is selected or guest mode is active
        const hasCustomer = customerMode === 'guest'
          || (selectedInvoiceType === 'B2B' && !!b2bPartnerUid)
          || (customerMode === 'existing' && !!selectedCustomerId)
          || (customerMode === 'create' && !!newCustomerName.trim());

        if (hasCustomer && selectedCatalogs.length > 0) {
          e.preventDefault();
          setCreateStep(2);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    showCreateModal,
    createStep,
    customerMode,
    selectedInvoiceType,
    b2bPartnerUid,
    selectedCustomerId,
    newCustomerName,
    searchCustomerQuery,
    searchB2bPartnerQuery,
    existingCustomers,
    tradePartners,
    selectedCatalogs
  ]);

  // Quick helper to spark a toast notification
  const showToastMsg = (msg: string) => {
    setPosToast(msg);
    setTimeout(() => {
      setPosToast(null);
    }, 2800);
  };

  const getActiveCustomerDetails = () => {
    try {
      if (selectedInvoiceType === 'B2B') {
        const partner = (tradePartners ?? []).find((p: any) => p.uid === b2bPartnerUid);
        const name = partner?.name || 'B2B Trade Partner';
        const initials = name.split(/\s+/).map((n: string) => n?.[0] || '').join('').substring(0, 2).toUpperCase() || 'TP';
        return { name, id: partner?.uid ? `#${partner.uid.slice(0, 8)}` : 'B2B', initials, phone: partner?.phone || '', email: partner?.email || '', address: partner?.address || '' };
      }
      if (customerMode === 'guest') {
        return { name: 'Guest Walk-in', id: 'GUEST', initials: 'GW', phone: '', email: '', address: '' };
      } else if (customerMode === 'create') {
        const name = newCustomerName || 'New Customer';
        const initials = name.split(/\s+/).map((n: string) => n?.[0] || '').join('').substring(0, 2).toUpperCase() || 'NC';
        return {
          name,
          id: newCustomerId || 'NEW PROFILE',
          initials,
          phone: newCustomerPhone || '',
          email: newCustomerEmail || '',
          address: newCustomerAddress || '',
        };
      } else {
        const found = (existingCustomers || []).find(c => c.id === selectedCustomerId);
        const name = (found && found.name) ? String(found.name) : (newCustomerName || 'Walk-in Customer');
        const initials = name.split(/\s+/).map((n: string) => n?.[0] || '').join('').substring(0, 2).toUpperCase() || 'WC';
        return {
          name,
          id: found?.consumerNo || selectedCustomerId || 'CRM',
          initials,
          phone: found?.phone || '',
          email: found?.email || '',
          address: found?.address || '',
        };
      }
    } catch {
      return { name: 'Customer', id: 'CRM', initials: 'CU', phone: '', email: '', address: '' };
    }
  };

  // ORD-005/026: attach the chosen customer to the guest order being viewed, then reflect
  // the refreshed CRM snapshot (name/no/phone/email) the server returns in the detail panel.
  const attachCandidates = React.useMemo(() => {
    const q = attachSearch.trim().toLowerCase();
    if (!q) return existingCustomers;
    return existingCustomers.filter((c: any) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.consumerNo || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
  }, [existingCustomers, attachSearch]);

  const handleAttachConsumer = (c: any) => {
    if (!activeGeneratedOrderId) return;
    attachConsumer.mutate(
      { uid: activeGeneratedOrderId, consumerUid: c.id },
      {
        onSuccess: (dto: any) => {
          setViewOrderConsumerUid(dto?.consumerUid || c.id);
          setNewCustomerName(dto?.consumerName || c.name || '');
          setNewCustomerId(dto?.consumerNo || c.consumerNo || '');
          setNewCustomerPhone(dto?.consumerPhone || c.phone || '');
          setNewCustomerEmail(dto?.consumerEmail || c.email || '');
          setViewOrderCanAttach(false);
          setAttachPickerOpen(false);
          setAttachSearch('');
        },
      }
    );
  };

  const handleCreateAndAttachConsumer = async () => {
    if (!activeGeneratedOrderId) return;
    if (!attachNewFirstName.trim()) {
      alert('Please provide customer name');
      return;
    }
    setIsCreatingAndAttaching(true);
    try {
      const created = await createCustomerMutation.mutateAsync({
        firstName: attachNewFirstName.trim(),
        lastName: attachNewLastName.trim() || undefined,
        phone: attachNewPhone.trim() || undefined,
        email: attachNewEmail.trim() || undefined,
        address: attachNewAddress.trim() ? { addressLine1: attachNewAddress.trim() } : undefined,
      } as any);

      const createdUid = (created as any)?.uid || (created as any)?.id;
      if (createdUid) {
        attachConsumer.mutate(
          { uid: activeGeneratedOrderId, consumerUid: createdUid },
          {
            onSuccess: (dto: any) => {
              setViewOrderConsumerUid(dto?.consumerUid || createdUid);
              setNewCustomerName(dto?.consumerName || [attachNewFirstName, attachNewLastName].filter(Boolean).join(' ').trim());
              setNewCustomerId(dto?.consumerNo || (created as any)?.consumerNo || '');
              setNewCustomerPhone(dto?.consumerPhone || attachNewPhone || '');
              setNewCustomerEmail(dto?.consumerEmail || attachNewEmail || '');
              setViewOrderCanAttach(false);
              setAttachPickerOpen(false);
              setAttachSearch('');
              setAttachNewFirstName('');
              setAttachNewLastName('');
              setAttachNewPhone('');
              setAttachNewEmail('');
              setAttachNewAddress('');
              setAttachMode('search');
            },
            onSettled: () => {
              setIsCreatingAndAttaching(false);
            }
          }
        );
      } else {
        setIsCreatingAndAttaching(false);
      }
    } catch (err: any) {
      setIsCreatingAndAttaching(false);
      alert(err?.message || 'Failed to create customer');
    }
  };

  // Fallback state in case needed
  const [newItemsCount, setNewItemsCount] = useState(1);
  const [newTotalAmount, setNewTotalAmount] = useState(1500);

  // Close and clear the whole create-order wizard. Called only after a successful save,
  // so a failed POST leaves the user's entered data intact for a retry (ORD-014 FE rule).
  const resetOrderWizard = () => {
    setB2bPartnerUid('');
    setShowCreateModal(false);
    setCreateStep(1);
    setCustomerMode('existing');
    setSearchCustomerQuery('');
    setSelectedCustomerId('');
    setSelectedStore('');
    setSelectedInvoiceType('B2H');
    setSelectedCatalogs([]);
    setNewCustomerName('');
    setNewCustomerId('');
    setNewCustomerPhone('');
    setNewCustomerEmail('');
    setNewCustomerGender('');
    setNewCustomerDob('');
    setNewCustomerAddress('');
    setShowMoreCustomerFields(false);
    setNewChannel('walkin');
    setNewItemsCount(1);
    setNewTotalAmount(1500);
    setNewStatus('Pending');
    setPosCart([]);
    setPosCategory('All');
    setPosSearch('');
    setEditingCartItemIndex(null);
  };

  // Handle Create Order
  const handleCreateOrder = async (e?: React.FormEvent) => {
    e?.preventDefault();

    let finalCustomerName = '';
    // The consumerUid the order is filed against — a real base-CRM consumer uid, or
    // null for a guest/walk-in order. It used to be a fabricated "CUST-4821" string,
    // which the backend rejects (OrderDto.consumerUid is a UUID), so "create new
    // customer" produced no customer and no order.
    let finalConsumerUid: string | null = null;

    if (selectedInvoiceType === 'B2B') {
      if (!b2bPartnerUid) {
        alert("Please select an active Trade Partner for B2B order.");
        return;
      }
      const partner = (tradePartners ?? []).find((p: any) => p.uid === b2bPartnerUid);
      finalCustomerName = partner?.name || 'B2B Trade Partner';
      finalConsumerUid = partner?.consumerUid || null;
    } else if (customerMode === 'existing' && selectedCustomerId) {
      const found = existingCustomers.find(c => (c.id === selectedCustomerId || c.uid === selectedCustomerId));
      if (found) {
        finalCustomerName = found.name;
        finalConsumerUid = found.id || found.uid;
      } else {
        finalCustomerName = "Guest Customer";
        finalConsumerUid = null;
      }
    } else if (customerMode === 'create' && newCustomerName && newCustomerName.trim()) {
      const [firstName, ...rest] = newCustomerName.trim().split(/\s+/);
      try {
        const created = await createCustomerMutation.mutateAsync({
          firstName,
          lastName: rest.join(' ') || undefined,
          primaryNumber: newCustomerPhone.trim() || undefined,
          email: newCustomerEmail.trim() || undefined,
          gender: newCustomerGender || undefined,
          dob: newCustomerDob || undefined,
          address: newCustomerAddress.trim() || undefined,
        });
        if (!created?.uid) {
          alert('Could not create the customer. Please try again.');
          return;
        }
        finalCustomerName = created.displayName || newCustomerName;
        finalConsumerUid = created.uid;
      } catch (err: any) {
        alert('Could not create the customer: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
        return;
      }
    } else {
      finalCustomerName = "Guest Customer";
      finalConsumerUid = null;
    }

    const calculatedItemsCount = posCart.reduce((total, c) => total + c.qty, 0);
    const calculatedTotalAmount = posCart.reduce((total, c) => total + c.qty * c.product.price, 0);

    if (calculatedItemsCount === 0) {
      alert("Your cart is empty. Please select at least one item.");
      return;
    }

    const resolvedCustAddr = (newCustomerAddress || getActiveCustomerDetails().address || '').trim();
    const finalBillingAddr = (billingAddress || resolvedCustAddr || '').trim() || null;
    const finalShippingAddr = (shippingAddressSame ? finalBillingAddr : (shippingAddress || resolvedCustAddr || finalBillingAddr)) || null;

    // F12: resolve the selected store to a UID robustly. The store picker only carries the
    // display name (and some tenants have duplicate store names), so match exact → trimmed →
    // case-insensitive, preferring the hook-resolved selectedStoreUid. Never silently send null
    // when a store is selected, or the order loses its store attribution.
    const resolvedStoreUid =
      selectedStoreUid ||
      (backendStores || []).find((s: any) => s.name === selectedStore)?.id ||
      (backendStores || []).find((s: any) => (s.name || '').trim() === (selectedStore || '').trim())?.id ||
      (backendStores || []).find((s: any) => (s.name || '').trim().toLowerCase() === (selectedStore || '').trim().toLowerCase())?.id ||
      null;

    // F11: send the money breakdown so the recorded order matches what the counter shows.
    // subTotal = pre-tax sum of lines; tax at 18% (same rate the POS displays); totalAmount is the
    // grand total the customer pays (subTotal + tax − discount).
    const subTotal = Math.round(posCart.reduce((t, c) => t + (c.sellQty ?? c.qty) * (c.unitPrice ?? c.product.price), 0) * 100) / 100;
    const taxAmount = Math.round(subTotal * 0.18 * 100) / 100;
    const grandTotal = Math.round((subTotal + taxAmount - (discountValue || 0)) * 100) / 100;

    const payload = {
      consumerUid: finalConsumerUid,
      consumerName: finalCustomerName !== "Guest Customer" ? finalCustomerName : undefined,
      consumerPhone: (getActiveCustomerDetails().phone || newCustomerPhone || "").trim() || undefined,
      consumerEmail: (getActiveCustomerDetails().email || newCustomerEmail || "").trim() || undefined,
      channel: b2bPartnerUid ? 'B2B' : (newChannel === 'walkin' ? 'WALKIN' : 'ONLINE'),
      partnerUid: b2bPartnerUid || null,
      storeUid: resolvedStoreUid,
      subTotal,
      taxAmount,
      totalAmount: grandTotal,
      status: newStatus.toUpperCase(),
      invoiceType: selectedInvoiceType || null,
      billingAddress: finalBillingAddr,
      shippingAddress: finalShippingAddr,
      // Backend OrderDto.catalogs is List<UUID>; selectedCatalogs holds catalog NAMES.
      // Map name -> uid (drop any that don't resolve) or the whole request 400s with
      // MALFORMED_JSON ("Kerala Dealer Catalog" is not a UUID).
      catalogs: (selectedCatalogs || [])
        .map((name) => (backendCatalogs || []).find((c: any) => c.name === name)?.id)
        .filter(Boolean),
      clientRequestId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined,
      prescribedBy: prescribedBy || undefined,
      doctorNotes: doctorNotes || undefined,
      items: posCart.map(c => {
        const unitPrice = c.unitPrice ?? c.product.price;
        const sellQty = c.sellQty ?? c.qty;
        return {
          itemUid: c.product.itemUid || c.product.id,
          variantUid: c.product.variantUid || (c as any).variantUid || undefined,
          batchUid: c.batchUid || (c as any).batchUid || undefined,
          unitUid: c.unitUid || null,   // selling unit → backend converts to base qty
          sellQty,                       // qty in the selling unit
          qty: c.qty,
          unitPrice,
          lineTotal: sellQty * unitPrice,
        };
      }),
    };

    setOrderError(null);
    createOrderMutation.mutate(payload, {
      onSuccess: (data: any) => {
        // Real, server-assigned order number (strip any ORD- prefix for display).
        const rawNo = (data?.orderNo ?? data?.data?.orderNo ?? '').toString();
        const createdUid = (data?.uid ?? data?.id ?? data?.data?.uid ?? data?.data?.id ?? '').toString();

        // Populate view order state to stay in Order Details (Step 3)
        setActiveGeneratedOrderId(createdUid || rawNo);
        setActiveGeneratedOrderNo(rawNo ? rawNo.replace(/^ORD-/, '') : (createdUid ? createdUid.slice(0, 8) : ''));
        setCurrentOrderStatus('Confirmed');
        setViewOrderConsumerUid(payload.consumerUid || null);
        setViewOrderDate(new Date().toISOString());
        setViewOrderCanAttach(!payload.consumerUid);
        setBillingAddress(data?.billingAddress || finalBillingAddr || '');
        setShippingAddress(data?.shippingAddress || finalShippingAddr || '');

        // Show Confirmation Popup
        setOrderSuccess({
          orderNo: rawNo ? rawNo.replace(/^ORD-/, '') : (createdUid ? createdUid.slice(0, 8) : null),
          customerName: finalCustomerName,
          total: calculatedTotalAmount,
          items: calculatedItemsCount,
        });

        // Set Step 3 in background so clicking View Order Details reveals it
        setCreateStep(3);
        setOpenedFromList(true);
        setShowCreateModal(true);
        setShowInvoiceDetailsPage(false);
      },
      onError: (err: any) => {
        // Keep the wizard open so the user can fix and retry — a real error, not a fake success.
        // INV-001: the backend blocks orders when an inventory-tracked item is short of stock.
        // Surface that cleanly (the raw server text carries internal UIDs) and refresh live stock
        // so the picker's "in stock" counts reflect what actually changed.
        if (err?.code === 'INSUFFICIENT_STOCK') {
          setOrderError('Not enough stock for one or more items in this order. Reduce the quantity (or remove the item) and try again — the availability shown has been refreshed.');
          queryClient.invalidateQueries({ queryKey: ['storeCatalogProducts'] });
          queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
        } else if (err?.code === 'ITEM_NOT_IN_CATALOG') {
          // ORD-003: an item that isn't in the selected store's order catalog was submitted.
          setOrderError('One or more items are not part of the selected store’s order catalog and cannot be ordered here. Remove them (or add them to the store catalog) and try again.');
          queryClient.invalidateQueries({ queryKey: ['storeCatalogProducts'] });
        } else {
          setOrderError(err?.serverMessage || err?.response?.data?.message || err?.message || 'Order creation failed. Please try again.');
        }
      },
    });
  };

  // New handler to view ANY order inside the gorgeous image-based invoice UI
  // ORD-020: persist the billing/shipping address snapshot on the order being viewed.
  // Sends ONLY the address fields — the backend update ignores nulls, so this cannot disturb
  // line items, totals or the consumer identity.
  const handleSaveOrderAddress = () => {
    if (!activeGeneratedOrderId) return;
    const shipping = shippingAddressSame ? billingAddress : shippingAddress;
    updateOrderMutation.mutate(
      { uid: activeGeneratedOrderId, payload: { billingAddress, shippingAddress: shipping } },
      {
        onError: (err: any) => {
          alert('Could not save the address: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
        },
      }
    );
    setIsEditingAddress(false);
  };

  const handleViewOrderInvoice = (order: OrderItem) => {
    try {
      setActiveGeneratedOrderId(order?.id || '');
      setActiveGeneratedOrderNo(
        order?.orderNo ? order.orderNo.replace('ORD-', '') : (order?.id ? String(order.id).slice(0, 8) : '00044')
      );

      const s = String(order?.status || '').toUpperCase();
      let mappedStatus: 'Draft' | 'Confirmed' | 'Completed' = 'Confirmed';
      if (s === 'DELIVERED' || s === 'COMPLETED') {
        mappedStatus = 'Completed';
      } else if (s === 'PENDING' || s === 'DRAFT') {
        mappedStatus = 'Draft';
      } else {
        mappedStatus = 'Confirmed';
      }
      setCurrentOrderStatus(mappedStatus);
      setInvoiceGenerated(true);
      setIsOrderEditable(false);

      setSelectedStore(order?.store || "");
      setSelectedCatalogs(order?.catalogs || []);
      setCustomerMode('create');
      setNewCustomerName(order?.customerName || 'Customer');
      setNewCustomerId(order?.customerNo || order?.customerId || '');
      setNewCustomerPhone(order?.customerPhone || '');
      setNewCustomerEmail(order?.customerEmail || '');
      setViewOrderConsumerUid(order?.customerId && order.customerId !== 'GUEST' ? order.customerId : null);

      const isGuestOrder = !order?.customerId || order.customerId === 'GUEST';
      const orderMutable = ['Pending', 'Confirmed', 'Shipped'].includes(order?.status as string);
      setViewOrderCanAttach(isGuestOrder && orderMutable);
      setAttachPickerOpen(false);
      setNewCustomerAddress(order?.billingAddress || '');
      setBillingAddress(order?.billingAddress || '');
      setShippingAddress(order?.shippingAddress || '');
      setShippingAddressSame(!order?.shippingAddress || order?.shippingAddress === order?.billingAddress);
      setViewOrderDate(order?.date || '');

      const totalCount = Number(order?.itemsCount || 1);
      const totalVal = Number(order?.totalAmount || 1500);

      const prods = (activeProducts && activeProducts.length > 0) ? activeProducts : (pickerProducts || []);
      if (prods.length === 0) {
        setPosCart([{
          product: { id: 'PROD-1', name: 'Order Line Item', price: totalVal / 1.18, category: 'General', image: '', inStock: true },
          qty: totalCount,
          selectedSize: 'Standard',
          selectedColor: 'Default'
        }]);
        setDiscountValue(0);
        setCreateStep(3);
        setOpenedFromList(true);
        setShowCreateModal(true);
        setShowInvoiceDetailsPage(false);
        return;
      }

      const baseSubtotal = totalVal / 1.18;
      const cartItems: POSCartItem[] = [];
      let remainingSubtotal = baseSubtotal;

      for (let i = 0; i < totalCount; i++) {
        const isLast = i === totalCount - 1;
        const originalProduct = prods[i % prods.length];

        let itemPrice = 0;
        if (isLast) {
          itemPrice = Math.max(0.01, remainingSubtotal);
        } else {
          const approx = baseSubtotal / totalCount;
          itemPrice = Math.max(0.01, Number(approx.toFixed(2)));
          remainingSubtotal -= itemPrice;
        }

        cartItems.push({
          product: {
            ...originalProduct,
            id: originalProduct?.id || `ITEM-${i+1}`,
            name: originalProduct?.name || 'Product Item',
            price: itemPrice
          },
          qty: 1,
          selectedSize: originalProduct?.sizes?.[0] || 'Standard',
          selectedColor: originalProduct?.colors?.[0] || 'Default'
        });
      }

      setPosCart(cartItems);
      setDiscountValue(0);
      setCreateStep(3);
      setOpenedFromList(true);
      setShowCreateModal(true);
      setShowInvoiceDetailsPage(false);
    } catch (err) {
      console.error('Error opening order details:', err);
    }
  };

  // POS Cart management helper functions
  const handleAddToCart = (product: POSProduct, size?: string, color?: string) => {
    const finalSize = size || selectedVariants[product.id]?.size || product.sizes[0] || "Standard";
    const finalColor = color || selectedVariants[product.id]?.color || product.colors[0] || "Default";

    setPosCart(prev => {
      const existingIndex = prev.findIndex(item =>
        item.product.id === product.id &&
        item.selectedSize === finalSize &&
        item.selectedColor === finalColor
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].qty += 1;
        return updated;
      } else {
        return [...prev, {
          product,
          qty: 1,
          selectedSize: finalSize,
          selectedColor: finalColor
        }];
      }
    });
  };

  const handleRemoveOrDecrementFromCart = (productId: string, size?: string, color?: string) => {
    const finalSize = size || selectedVariants[productId]?.size || "Standard";
    const finalColor = color || selectedVariants[productId]?.color || "Default";

    setPosCart(prev => {
      const existingIndex = prev.findIndex(item =>
        item.product.id === productId &&
        item.selectedSize === finalSize &&
        item.selectedColor === finalColor
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        if (updated[existingIndex].qty > 1) {
          updated[existingIndex].qty -= 1;
          return updated;
        } else {
          return prev.filter((_, idx) => idx !== existingIndex);
        }
      }
      return prev;
    });
  };

  const handleDeleteFromCart = (productId: string, size?: string, color?: string) => {
    setPosCart(prev => {
      if (size && color) {
        return prev.filter(item =>
          !(item.product.id === productId && item.selectedSize === size && item.selectedColor === color)
        );
      }
      return prev.filter(item => item.product.id !== productId);
    });
  };

  // Actions handlers
  const handleReturnOrder = (id: string) => {
    updateStatusMutation.mutate({ uid: id, status: 'RETURNED' });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'Returned' } : o));
    alert(`Order ${id} has been marked as Returned.`);
  };

  const handleCancelOrder = (id: string) => {
    setCancelTargetOrderIds([id]);
  };

  const handleDuplicateOrder = (order: OrderItem) => {
    const duplicated: OrderItem = {
      ...order,
      id: `ORD-${Math.floor(10000 + Math.random() * 90000)}D`,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending'
    };
    setOrders(prev => [duplicated, ...prev]);
    alert(`Order duplicated successfully with ID ${duplicated.id}`);
  };

  const handleAddLabel = async (orderId: string, label: typeof AVAILABLE_LABELS[0]) => {
    try {
      await setOrderLabelMutation.mutateAsync({
        uid: orderId,
        label: label.text === 'None' ? null : label.text,
        colour: label.text === 'None' ? undefined : label.color
      });
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            label: label.text === "None" ? undefined : { text: label.text, color: label.color, bg: label.bg }
          };
        }
        return o;
      }));
    } catch (err) {
      console.error('Failed to set order label:', err);
    }
    setLabelOrder(null);
  };

  const handleAddAssignee = async (orderId: string, assignee: { uid?: string; name: string; role: string; avatar: string }) => {
    try {
      await assignOrderMutation.mutateAsync({
        uid: orderId,
        userUid: assignee.uid === 'UNASSIGN' ? null : (assignee.uid || null)
      });
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            assignee: assignee.uid === 'UNASSIGN' ? undefined : { name: assignee.name, role: assignee.role, avatar: assignee.avatar }
          };
        }
        return o;
      }));
    } catch (err) {
      console.error('Failed to assign order:', err);
    }
    setAssigneeOrder(null);
  };

  const handleSetTemplate = (orderId: string, temp: 'Standard' | 'Elegant' | 'Compact') => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return { ...o, invoiceTemplate: temp };
      }
      return o;
    }));
    setTemplateOrder(null);
    alert(`Template updated to "${temp}". Open the invoice to view changes.`);
  };

  // Selection toggle
  const toggleAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id));
    }
  };

  const toggleItem = (id: string) => {
    setSelectedOrders(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Filter logic
  // ORD-015: animated post-create confirmation. Shown ONLY from the mutation's onSuccess,
  // with the real server-assigned order number — never on a failed/optimistic save.
  const orderSuccessPopup = orderSuccess ? (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 font-sans"
      onClick={() => setOrderSuccess(null)}
    >
      <style>{`
        @keyframes ktOcPop {0%{transform:scale(.6);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
        @keyframes ktOcRing {0%{transform:scale(.4);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes ktOcCheck {to{stroke-dashoffset:0}}
        .kt-oc-card{animation:ktOcPop .45s cubic-bezier(.16,1,.3,1) both}
        .kt-oc-ring{animation:ktOcRing .4s ease-out both}
        .kt-oc-check{stroke-dasharray:48;stroke-dashoffset:48;animation:ktOcCheck .5s .22s cubic-bezier(.65,0,.45,1) forwards}
      `}</style>
      <div className="kt-oc-card bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 text-center border border-slate-100 relative" onClick={(e) => e.stopPropagation()}>

        {/* Animated Checkmark */}
        <div className="kt-oc-ring mx-auto mb-4 h-20 w-20 rounded-full bg-emerald-50 flex items-center justify-center ring-8 ring-emerald-100/60">
          <svg viewBox="0 0 52 52" className="h-11 w-11 text-emerald-500">
            <path className="kt-oc-check" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" d="M14 27 l8 8 l16 -18" />
          </svg>
        </div>

        <h3 className="text-xl font-black text-slate-900 tracking-tight">Order Placed Successfully!</h3>
        <p className="text-xs text-slate-500 font-medium mt-1">
          {orderSuccess.orderNo
            ? <>Order <span className="font-extrabold text-[#55349A] font-mono">#{orderSuccess.orderNo}</span> has been confirmed & stock reserved.</>
            : 'Your order has been placed successfully.'}
        </p>

        {/* Order Metric Snapshot */}
        <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200/80 divide-y divide-slate-100 text-xs text-left">
          <div className="flex justify-between px-4 py-2.5"><span className="text-slate-500 font-bold">Customer</span><span className="font-extrabold text-slate-800 truncate ml-3">{orderSuccess.customerName || 'Guest Walk-in'}</span></div>
          <div className="flex justify-between px-4 py-2.5"><span className="text-slate-500 font-bold">Total Items</span><span className="font-extrabold text-slate-800">{orderSuccess.items} Units</span></div>
          <div className="flex justify-between px-4 py-2.5"><span className="text-slate-500 font-bold">Total Amount</span><span className="font-black text-emerald-600 font-mono text-sm">₹{Number(orderSuccess.total || 0).toFixed(2)}</span></div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-2.5">
          {/* Primary Action: View Order Details */}
          <button
            type="button"
            onClick={() => {
              setOrderSuccess(null);
              setCreateStep(3);
              setOpenedFromList(true);
            }}
            className="w-full h-12 rounded-xl bg-[#55349A] hover:bg-[#462980] text-white text-xs font-black tracking-wide transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>View Order Details</span>
            <ArrowRight className="h-4 w-4 stroke-[2.5]" />
          </button>

          {/* Secondary Action: View/Print Tax Invoice */}
          <button
            type="button"
            onClick={() => {
              setOrderSuccess(null);
              setInvoiceGenerated(true);
              setShowInvoiceDetailsPage(true);
            }}
            className="w-full h-11 rounded-xl bg-[#0F172A] hover:bg-black text-white text-xs font-extrabold tracking-wide transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
          >
            <FileText className="h-4 w-4" />
            <span>Print / View Tax Invoice</span>
          </button>

          {/* Tertiary Action: Create Another Order */}
          <button
            type="button"
            onClick={() => {
              setOrderSuccess(null);
              setPosCart([]);
              setCreateStep(1);
            }}
            className="w-full py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors cursor-pointer text-center"
          >
            + Create Another Order
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const orderErrorToast = orderError ? (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-md animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-start gap-3 rounded-xl bg-white border border-red-200 shadow-lg px-4 py-3">
        <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-black">!</div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-red-700">Order not placed</p>
          <p className="text-xs text-slate-600 mt-0.5">{orderError}</p>
        </div>
        <button type="button" onClick={() => setOrderError(null)} className="text-slate-400 hover:text-slate-600 text-base font-bold leading-none">×</button>
      </div>
    </div>
  ) : null;

  if (showCreateModal) {
    return (
      <>
      <OrderCreateWizard
        orderError={orderError}
        setOrderError={setOrderError}
        orderSuccess={orderSuccess}
        setOrderSuccess={setOrderSuccess}
        createStep={createStep}
        setCreateStep={setCreateStep}
        onClose={() => setShowCreateModal(false)}
        availableStores={availableStores}
        selectedStore={selectedStore}
        setSelectedStore={setSelectedStore}
        availableCatalogs={availableCatalogs}
        selectedCatalogs={selectedCatalogs}
        setSelectedCatalogs={setSelectedCatalogs}
        selectedInvoiceType={selectedInvoiceType}
        setSelectedInvoiceType={setSelectedInvoiceType}
        customerMode={customerMode}
        setCustomerMode={setCustomerMode}
        selectedCustomerId={selectedCustomerId}
        setSelectedCustomerId={setSelectedCustomerId}
        newCustomerName={newCustomerName}
        setNewCustomerName={setNewCustomerName}
        newCustomerPhone={newCustomerPhone}
        setNewCustomerPhone={setNewCustomerPhone}
        newCustomerEmail={newCustomerEmail}
        setNewCustomerEmail={setNewCustomerEmail}
        newCustomerAddress={newCustomerAddress}
        setNewCustomerAddress={setNewCustomerAddress}
        existingCustomers={existingCustomers}
        searchCustomerQuery={searchCustomerQuery}
        setSearchCustomerQuery={setSearchCustomerQuery}
        searchB2bPartnerQuery={searchB2bPartnerQuery}
        setSearchB2bPartnerQuery={setSearchB2bPartnerQuery}
        businessName={businessName}
        setBusinessName={setBusinessName}
        enableOrderPreSetup={enableOrderPreSetup}
        setEnableOrderPreSetup={setEnableOrderPreSetup}
        posCart={posCart}
        setPosCart={setPosCart}
        prescribedBy={prescribedBy}
        setPrescribedBy={setPrescribedBy}
        doctorNotes={doctorNotes}
        setDoctorNotes={setDoctorNotes}
        billingAddress={billingAddress}
        setBillingAddress={setBillingAddress}
        shippingAddress={shippingAddress}
        setShippingAddress={setShippingAddress}
        shippingAddressSame={shippingAddressSame}
        setShippingAddressSame={setShippingAddressSame}
        getActiveCustomerDetails={getActiveCustomerDetails}
        setShowCreateModal={setShowCreateModal}
        setShowInvoiceDetailsPage={setShowInvoiceDetailsPage}
        setActiveGeneratedOrderId={setActiveGeneratedOrderId}
        pickerProducts={pickerProducts}
        currentOrderStatus={currentOrderStatus}
        setCurrentOrderStatus={setCurrentOrderStatus}
        invoiceGenerated={invoiceGenerated}
        setInvoiceGenerated={setInvoiceGenerated}
        setOrders={setOrders}
        handleCreateOrder={handleCreateOrder}
        activeGeneratedOrderNo={activeGeneratedOrderNo}
        activeGeneratedOrderId={activeGeneratedOrderId}
        showShippingLabelModal={showShippingLabelModal}
        setShowShippingLabelModal={setShowShippingLabelModal}
        handleUpdateOrderStatus={handleUpdateOrderStatus}
        updateStatusMutation={updateStatusMutation}
        orderLogExpanded={orderLogExpanded}
        setOrderLogExpanded={setOrderLogExpanded}
        activePhotoLightbox={activePhotoLightbox}
        setActivePhotoLightbox={setActivePhotoLightbox}
        customerNotes={customerNotes}
        setCustomerNotes={setCustomerNotes}
        isEditingAddress={isEditingAddress}
        setIsEditingAddress={setIsEditingAddress}
        discountValue={discountValue}
        setDiscountValue={setDiscountValue}
        gstInvoice={gstInvoice}
        gstInvoiceLoading={gstInvoiceLoading}
        handleGetPayment={handleGetPayment}
        paymentDropdownOpen={paymentDropdownOpen}
        setPaymentDropdownOpen={setPaymentDropdownOpen}
        moreActionsDropdownOpen={moreActionsDropdownOpen}
        setMoreActionsDropdownOpen={setMoreActionsDropdownOpen}
        isOrderEditable={isOrderEditable}
        setIsOrderEditable={setIsOrderEditable}
        viewOrderConsumerUid={viewOrderConsumerUid}
        onOpenInvoice={(order) => setInvoiceOrder(order)}
      />
      </>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-screen overflow-x-hidden w-full max-w-full">
      {orderSuccessPopup}
      {/* 1. Page Header */}
      <div className="bg-white border-b border-surface-100 py-4 px-4 md:px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="p-1 hover:bg-surface-100 rounded transition-colors cursor-pointer flex items-center justify-center border-none bg-transparent"
            aria-label="Go Back"
          >
            <ArrowLeft className="h-5 w-5 text-surface-900" />
          </button>
          <h1 className="text-xl font-black text-surface-900 tracking-tight">
            Orders
          </h1>
        </div>
      </div>

      {/* 2. Main Page Content */}
      <div className="p-4 md:p-8 space-y-4 md:space-y-6 flex-1">
        {/* Filters and Search toolbar */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-surface-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Search inputs */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full pl-11 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
              />
            </div>

            {/* Dedicated Custom Filter Popup Drawer */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setFilterDropdownOpen(true)}
                  className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-surface-200 rounded-xl text-xs font-bold text-surface-700 hover:bg-surface-50 transition-colors shadow-sm cursor-pointer min-w-[130px]"
                >
                  <div className="flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-primary-600" />
                    <span>Filter</span>
                    {activeFilterCount > 0 && (
                      <span className="flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary-600 text-[9px] font-black text-white leading-none">
                        {activeFilterCount}
                      </span>
                    )}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-surface-400" />
                </button>

                <AnimatePresence>
                  {filterDropdownOpen && (
                    <OrdersFilterDrawer
                      filters={filters}
                      onClose={() => setFilterDropdownOpen(false)}
                    />
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={() => {
                  setInvoiceGenerated(false);
                  setShowInvoiceDetailsPage(false);
                  setCurrentOrderStatus('Draft');
                  setIsOrderEditable(true);
                  setMoreActionsDropdownOpen(false);
                  setActiveGeneratedOrderId('');
                  setActiveGeneratedOrderNo('');
                  setPosCart([]);
                  setOpenedFromList(false);
                  if (!selectedStore && availableStores.length > 0) {
                    setSelectedStore(availableStores[0].name);
                  }
                  if (selectedCatalogs.length === 0 && availableCatalogs.length > 0) {
                    setSelectedCatalogs(availableCatalogs);
                  }
                  setCustomerMode('existing');
                  setSelectedInvoiceType('B2C');
                  setCreateStep(enableOrderPreSetup ? 1 : 2);
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#55349A] hover:bg-[#462980] border border-[#55349A] rounded-xl text-xs font-bold text-white transition-all transform hover:shadow-lg active:scale-95 cursor-pointer ml-1"
              >
                <Plus className="h-4 w-4" />
                Create New Order
              </button>

              {selectedOrders.length > 0 && (
                <>
                  <button
                    onClick={() => setBulkLabelsOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#55349A] text-white border border-[#55349A] rounded-xl text-xs font-bold hover:bg-[#462980] transition-colors cursor-pointer shadow-sm"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print shipping labels ({selectedOrders.length})</span>
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setBulkStatusMenuOpen(!bulkStatusMenuOpen)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-surface-800 border border-surface-200 rounded-xl text-xs font-bold hover:bg-surface-50 transition-colors cursor-pointer shadow-sm"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-primary-600" />
                      <span>Change Status ({selectedOrders.length})</span>
                      <ChevronDown className="h-3.5 w-3.5 text-surface-400" />
                    </button>

                    {bulkStatusMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40 bg-transparent"
                          onClick={() => setBulkStatusMenuOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-56 bg-white border border-surface-200 rounded-xl shadow-xl z-50 py-1.5 text-left animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="px-3 py-1 text-[10px] font-black uppercase text-surface-400 tracking-wider">
                            Set Status for {selectedOrders.length} Orders
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              setBulkStatusMenuOpen(false);
                              for (const id of selectedOrders) {
                                await updateStatusMutation.mutateAsync({ uid: id, status: 'DELIVERED' });
                              }
                              setOrders(prev => prev.map(o => selectedOrders.includes(o.id) ? { ...o, status: 'Delivered' } : o));
                              setSelectedOrders([]);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Mark Completed / Delivered</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              setBulkStatusMenuOpen(false);
                              for (const id of selectedOrders) {
                                await updateStatusMutation.mutateAsync({ uid: id, status: 'CONFIRMED' });
                              }
                              setOrders(prev => prev.map(o => selectedOrders.includes(o.id) ? { ...o, status: 'Confirmed' } : o));
                              setSelectedOrders([]);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                          >
                            <Check className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Mark Confirmed</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              setBulkStatusMenuOpen(false);
                              for (const id of selectedOrders) {
                                await updateStatusMutation.mutateAsync({ uid: id, status: 'SHIPPED' });
                              }
                              setOrders(prev => prev.map(o => selectedOrders.includes(o.id) ? { ...o, status: 'Shipped' } : o));
                              setSelectedOrders([]);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                          >
                            <Truck className="h-3.5 w-3.5 text-blue-600" />
                            <span>Mark Shipped</span>
                          </button>

                          <div className="h-px bg-surface-100 my-1" />

                          <button
                            type="button"
                            onClick={() => {
                              setBulkStatusMenuOpen(false);
                              setCancelTargetOrderIds(selectedOrders);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                          >
                            <XCircle className="h-3.5 w-3.5 text-rose-600" />
                            <span>Cancel Selected ({selectedOrders.length})</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Table list */}
          <div className="w-full overflow-x-auto rounded-xl border border-surface-200 shadow-3xs">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-surface-50 border-y border-surface-100 select-none text-surface-400 text-[10.5px] font-bold uppercase tracking-wider">
                  <th className="px-[22px] py-2.5 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                      onChange={toggleAll}
                      className="h-[15px] w-[15px] cursor-pointer accent-primary-600"
                    />
                  </th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">ORDER NUMBER & DATE</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">CUSTOMER NAME</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">TAGS</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">STATUS ↓</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">TOTAL ITEM QTY</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider text-right pr-8">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-surface-400">
                      <div className="flex flex-col items-center gap-3">
                        <ShoppingCart className="h-10 w-10 text-surface-300" />
                        <div>
                          <span className="font-bold text-surface-700 text-sm block">No Orders Found</span>
                          <span className="text-xs text-surface-400 font-medium block mt-1">Try adapting your filters or searching another ID.</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    return (
                      <tr
                        key={order.id}
                        onClick={() => handleViewOrderInvoice(order)}
                        className="border-b border-surface-100 px-[22px] py-2.5 text-[12.5px] hover:bg-surface-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="px-[22px] py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order.id)}
                            onChange={() => toggleItem(order.id)}
                            className="h-[15px] w-[15px] cursor-pointer accent-primary-600"
                          />
                        </td>
                        <td className="px-[22px] py-2.5 text-left">
                          <span
                            onClick={() => handleViewOrderInvoice(order)}
                            className="font-bold text-primary-600 tracking-tight cursor-pointer hover:underline inline-block"
                          >
                            {order.orderNo
                              ? `#${order.orderNo.replace('ORD-', '')}`
                              : `#${(order.id || '').toString().slice(0, 8)}`}
                          </span>
                          <span className="text-[11px] text-surface-400 font-bold block mt-1">
                            {formatOrderDate(order.date)}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-left">
                          <div className="flex items-center gap-3.5">
                            <div
                              className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs select-none shadow-xs shrink-0"
                              style={getAvatarStyle(order.customerName)}
                            >
                              {getInitials(order.customerName)}
                            </div>
                            <div>
                              <span
                                className="font-bold text-surface-900 text-sm block leading-none"
                              >
                                {(order?.customerName || "").toUpperCase()}
                              </span>
                              {/* Prefer the readable CRM customer number / phone over the raw uid. */}
                              <span className="text-[10.5px] text-surface-400 font-mono mt-1.5 block leading-none font-semibold">
                                {order.customerNo
                                  ? `#${order.customerNo}`
                                  : order.customerPhone
                                    ? order.customerPhone
                                    : order.customerId === 'GUEST'
                                      ? 'Guest'
                                      : `#${(order.customerId || '').toString().slice(0, 8)}`}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-4 font-sans text-left">
                          {order.label ? (
                            <span
                              className="inline-flex items-center justify-center px-2.5 py-1 rounded-[6px] text-[10.5px] font-black uppercase tracking-wider select-none leading-none h-[22px] border"
                              style={{
                                color: order.label.color || '#374151',
                                backgroundColor: order.label.bg || '#F3F4F6',
                                borderColor: `${order.label.color}25` || '#E5E7EB'
                              }}
                            >
                              {order.label.text}
                            </span>
                          ) : (
                            <span className="text-surface-300 font-bold ml-1">—</span>
                          )}
                        </td>
                        <td className="py-5 px-4 font-sans">
                          <span className={cn(
                            "inline-flex items-center justify-center gap-1.5 rounded-md text-[12px] font-black normal-case select-none leading-none h-[26px] w-[95px] shrink-0",
                            getStatusStyles(order.status)
                          )}>
                            <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", getStatusDot(order.status))} />
                            {order.status}
                          </span>
                        </td>
                        <td className="py-5 px-4 text-left font-sans">
                          <div>
                            <span className="font-bold text-[14px] text-surface-900 block leading-none">{order.itemsCount}</span>
                            <span className="text-[10.5px] text-surface-400 font-bold block mt-1.5 leading-none font-mono">₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}</span>
                          </div>
                        </td>
                        <td className="py-5 px-6 text-right pr-8 relative" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleViewOrderInvoice(order)}
                              className="h-8 px-3.5 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 text-xs font-semibold shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer select-none leading-none active:scale-[0.98]"
                              title="View Order Details"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
                              <span>Details</span>
                            </button>

                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(activeDropdownId === order.id ? null : order.id);
                                }}
                                className={cn(
                                  "h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all cursor-pointer active:scale-[0.98]",
                                  activeDropdownId === order.id && "bg-slate-100 border-slate-300 text-slate-900 shadow-xs"
                                )}
                                title="More Actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>

                              {activeDropdownId === order.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40 bg-transparent"
                                    onClick={() => setActiveDropdownId(null)}
                                  />
                                  <div className="absolute right-0 mt-2 w-52 bg-white border border-surface-200 rounded-xl shadow-xl z-50 py-1.5 text-left animate-in fade-in slide-in-from-top-1 duration-150">
                                    {order.status !== 'Delivered' && order.status !== 'Cancelled' && order.status !== 'Returned' && (
                                      <button
                                        onClick={() => {
                                          updateStatusMutation.mutate({ uid: order.id, status: 'DELIVERED' });
                                          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Delivered' } : o));
                                          setActiveDropdownId(null);
                                        }}
                                        disabled={updateStatusMutation.isPending}
                                        className="w-full text-left px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                        Mark as Completed
                                      </button>
                                    )}

                                    {order.status === 'Pending' && (
                                      <button
                                        onClick={() => {
                                          updateStatusMutation.mutate({ uid: order.id, status: 'CONFIRMED' });
                                          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Confirmed' } : o));
                                          setActiveDropdownId(null);
                                        }}
                                        disabled={updateStatusMutation.isPending}
                                        className="w-full text-left px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                                      >
                                        <Check className="h-3.5 w-3.5 text-indigo-600" />
                                        Mark Confirmed
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setInvoiceOrder(order);
                                        setActiveDropdownId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-surface-700 hover:bg-surface-50 hover:text-surface-900 transition-colors flex items-center gap-2 cursor-pointer border-none"
                                    >
                                      <Printer className="h-3.5 w-3.5 text-primary-600" />
                                      View Invoice
                                    </button>

                                    <button
                                      onClick={() => {
                                        handleReturnOrder(order.id);
                                        setActiveDropdownId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-surface-700 hover:bg-surface-50 hover:text-surface-900 transition-colors flex items-center gap-2 cursor-pointer border-none"
                                      disabled={order.status === 'Cancelled' || order.status === 'Returned'}
                                    >
                                      <CornerUpLeft className="h-3.5 w-3.5 text-amber-600" />
                                      Return Order
                                    </button>


                                    <button
                                      onClick={() => {
                                        setLabelOrder(order);
                                        setActiveDropdownId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-surface-700 hover:bg-surface-50 hover:text-surface-900 transition-colors flex items-center gap-2 cursor-pointer border-none"
                                    >
                                      <Tag className="h-3.5 w-3.5 text-blue-600" />
                                      Add Label
                                    </button>

                                    <button
                                      onClick={() => {
                                        setAssigneeOrder(order);
                                        setActiveDropdownId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-surface-700 hover:bg-surface-50 hover:text-surface-900 transition-colors flex items-center gap-2 cursor-pointer border-none"
                                    >
                                      <UserPlus className="h-3.5 w-3.5 text-indigo-600" />
                                      Add Assignee
                                    </button>

                                    <button
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        if (!order.id || String(order.id).startsWith('ORD-')) { alert("Save the order before printing a shipping label."); return; }
                                        setSingleLabelUid(String(order.id));
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-surface-700 hover:bg-surface-50 hover:text-surface-900 transition-colors flex items-center gap-2 cursor-pointer border-none"
                                    >
                                      <Printer className="h-3.5 w-3.5 text-[#55349A]" />
                                      Print shipping label
                                    </button>

                                    <button
                                      onClick={() => {
                                        setViewingReviewsOrder(order);
                                        setActiveDropdownId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-surface-700 hover:bg-surface-50 hover:text-surface-900 transition-colors flex items-center gap-2 cursor-pointer border-none"
                                    >
                                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500/10" />
                                      Reviews
                                    </button>

                                    <button
                                      onClick={() => {
                                        setTemplateOrder(order);
                                        setActiveDropdownId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-surface-700 hover:bg-surface-50 hover:text-surface-900 transition-colors flex items-center gap-2 cursor-pointer border-none"
                                    >
                                      <FileText className="h-3.5 w-3.5 text-purple-600" />
                                      Invoice Template
                                    </button>

                                    <div className="h-px bg-surface-100 my-1" />

                                    <button
                                      onClick={() => {
                                        handleCancelOrder(order.id);
                                        setActiveDropdownId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-bold text-red-650 hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
                                      disabled={order.status === 'Cancelled' || order.status === 'Delivered'}
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      Cancel Order
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
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
      </div>

      {/* ANIME DIALOGS & OVERLAYS */}
      <AnimatePresence>
        {/* A. Create Order Dialog */}
        {/* B. View Details Side Drawer */}
        {viewingOrder && (
          <OrderDetailDrawer
            order={viewingOrder}
            onClose={() => setViewingOrder(null)}
            onPrintInvoice={(order) => {
              setViewingOrder(null);
              navigate(`/orders/${order.uid || order.id}/tax-invoice`);
            }}
            onCancelOrder={(orderId) => {
              handleCancelOrder(orderId);
              setViewingOrder(null);
            }}
          />
        )}

        {/* C. Printable Invoice Navigation */}
        {invoiceOrder && (
          <OrderInvoiceModal
            order={invoiceOrder}
            onClose={() => setInvoiceOrder(null)}
          />
        )}

        {/* Cancellation Warning Modal */}
        {cancelTargetOrderIds && cancelTargetOrderIds.length > 0 && (
          <OrderCancelWarningModal
            orderIds={cancelTargetOrderIds}
            isPending={cancelOrderMutation.isPending}
            onConfirm={async () => {
              for (const id of cancelTargetOrderIds) {
                try {
                  await cancelOrderMutation.mutateAsync(id);
                } catch (e) {
                  console.error(e);
                }
              }
              setOrders(prev => prev.map(o => cancelTargetOrderIds.includes(o.id) ? { ...o, status: 'Cancelled' } : o));
              setSelectedOrders(prev => prev.filter(id => !cancelTargetOrderIds.includes(id)));
              setCancelTargetOrderIds(null);
            }}
            onClose={() => setCancelTargetOrderIds(null)}
          />
        )}

        {/* D. Add Label Popover Modal */}
        {labelOrder && (
          <OrderLabelModal
            order={labelOrder}
            labels={AVAILABLE_LABELS}
            onSelect={handleAddLabel}
            onClose={() => setLabelOrder(null)}
          />
        )}

        {/* E. Add Assignee Popover Modal */}
        {assigneeOrder && (
          <OrderAssigneeModal
            order={assigneeOrder}
            assignees={staffAssignees.length > 1 ? staffAssignees : AVAILABLE_ASSIGNEES}
            onSelect={handleAddAssignee}
            onClose={() => setAssigneeOrder(null)}
          />
        )}

        {/* F. Template Selector Popover Modal */}
        {templateOrder && (
          <OrderTemplateModal
            order={templateOrder}
            onSelect={handleSetTemplate}
            onClose={() => setTemplateOrder(null)}
          />
        )}

        {/* G. Customer Reviews Feedback Dialog */}
        {ratingOrder && (
          <OrderRatingModal order={ratingOrder} onClose={() => setRatingOrder(null)} />
        )}
      </AnimatePresence>

      {/* Shipping labels — bulk (selected list rows) + single (order-details dropdown) */}
      {bulkLabelsOpen && (
        <BulkLabelPreview orderUids={selectedOrders} sellerName="" onClose={() => setBulkLabelsOpen(false)} />
      )}
      {singleLabelUid && (
        <SingleLabelPreview orderUid={singleLabelUid} sellerName="" onClose={() => setSingleLabelUid(null)} />
      )}
    </div>
  );
};
