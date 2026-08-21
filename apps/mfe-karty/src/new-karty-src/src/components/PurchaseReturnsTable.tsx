import React, { useState } from 'react';
import {
  ArrowLeft, Search, Filter, ChevronLeft, ChevronRight,
  Store, MoreHorizontal, Check, Edit2, RotateCcw,
  Download, Share2, Printer, XCircle, Trash2, ArrowUpDown, FileText,
  ArrowUpRight, ChevronDown, X, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { TablePagination } from './TablePagination';

const RETURN_PAGE_SIZE = 10;
import { usePurchaseReturns, useUpdatePurchaseReturnStatus, useCreatePurchaseReturn } from '../../../services/usePurchaseReturns';
import { useReturnablePurchases } from '../../../services/useReturnablePurchases';
import { CreatePurchaseReturn } from './CreatePurchaseReturn';
import { useStores } from '../../../services/useStores';
import { useVendors } from '../../../services/useVendors';

export interface PaymentItem {
  id: string;
  date: string;
  mode: string;
  amount: number;
  note?: string;
}

export interface PurchaseReturnItem {
  id: string;
  returnId: string;
  date: string;
  time: string;
  to: { name: string; id: string; color: string; initials: string; isLogo?: boolean };
  from: { name: string; id: string };
  invoiceNo: string;
  invoiceDate: string;
  invoiceTime: string;
  refundAmount: number;
  status: 'Completed' | 'Pending' | 'Draft';
  payments?: PaymentItem[];
}

interface ReturnablePurchaseItem {
  id: string;
  name: string;
  details: string;
  batch: string;
  image: string;
  availableQty: string;
  purPrice: number;
  returnQty: number;
  reason: string;
  taxPercent: number;
  unit?: string;
  unitDescription?: string;
  selectedUnit?: string;
  boxSize?: number;
}

interface ReturnablePurchaseOrder {
  purchaseNo: string;
  billNo: string;
  date: string;
  vendorName: string;
  vendorId: string;
  storeName: string;
  storeSubtitle: string;
  items: ReturnablePurchaseItem[];
}

export const PurchaseReturnsTable = ({ onBackToInventory }: { onBackToInventory?: () => void }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [activeActionsId, setActiveActionsId] = useState<string | null>(null);
  const [viewDetailsItem, setViewDetailsItem] = useState<PurchaseReturnItem | null>(null);
  const [showCreateReturn, setShowCreateReturn] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [showSelectPOModal, setShowSelectPOModal] = useState(false);
  const [showSelectBulkVendorModal, setShowSelectBulkVendorModal] = useState(false);
  const [selectedBulkVendor, setSelectedBulkVendor] = useState<string | null>(null);
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);
  const [showBulkReturnModal, setShowBulkReturnModal] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<number | null>(null);
  const [bulkValidationStage, setBulkValidationStage] = useState('');
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [bulkDragActive, setBulkDragActive] = useState(false);
  const [selectPOSearchQuery, setSelectPOSearchQuery] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [openUnitDropdownId, setOpenUnitDropdownId] = useState<string | null>(null);

  // Dynamic returns data pool
  const { data: backendReturns } = usePurchaseReturns();
  const updateStatusMutation = useUpdatePurchaseReturnStatus();
  const createReturnMutation = useCreatePurchaseReturn();
  const { data: prStores = [] } = useStores();
  const { data: prVendors = [] } = useVendors();

  const [returnsList, setReturnsList] = useState<PurchaseReturnItem[]>([]);

  const handleCompleteReturn = async (returnId: string) => {
    try {
      await updateStatusMutation.mutateAsync({ uid: returnId, status: 'COMPLETED' });
      setReturnsList(prev => prev.map(item => item.id === returnId ? { ...item, status: 'Completed' } : item));
      if (viewDetailsItem && viewDetailsItem.id === returnId) {
        setViewDetailsItem(prev => prev ? { ...prev, status: 'Completed' } : null);
      }
      setNotification({
        show: true,
        message: 'Purchase Return has been confirmed and completed. Inventory updated.'
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (e: any) {
      alert(e?.message || 'Failed to complete purchase return');
    }
  };

  React.useEffect(() => {
    if (backendReturns) {
      // Resolve vendor/store UUIDs to names (the list used to show raw UUIDs).
      const vendorName = new Map((prVendors as any[]).map((v: any) => [v.uid || v.id, v.name]));
      const storeName = new Map((prStores as any[]).map((s: any) => [s.id || s.uid, s.name || s.storeName]));
      const mapped = backendReturns.map((r: any) => {
        const vName = r.vendorName || vendorName.get(r.vendorUid) || 'Unknown Vendor';
        const sName = r.storeName || storeName.get(r.fromStoreUid) || 'Unknown Store';
        return ({
        id: r.uid || r.id,
        returnId: r.returnNo || (r.uid ? `PR-${r.uid.substring(0, 6).toUpperCase()}` : 'PR-000'),
        date: (() => {
          const raw = r.returnDate || r.createdAt;
          return raw ? new Date(raw).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        })(),
        time: '',
        to: { name: vName, id: '', color: 'bg-[#1E1C24] text-[#E5C384]', initials: vName.substring(0, 2).toUpperCase() },
        from: { name: sName, id: '' },
        invoiceNo: r.invoiceNo || 'N/A',
        invoiceDate: r.invoiceDate || '',
        invoiceTime: '',
        refundAmount: r.refundAmount || 0,
        status: r.status === 'COMPLETED' ? 'Completed' : r.status === 'DRAFT' ? 'Draft' : 'Pending',
        payments: []
        });
      });
      setReturnsList(mapped as PurchaseReturnItem[]);
    }
  }, [backendReturns, prVendors, prStores]);

  // Collect Payment state Setup
  const [collectPaymentOpen, setCollectPaymentOpen] = useState(false);
  const [paymentReturnItem, setPaymentReturnItem] = useState<PurchaseReturnItem | null>(null);
  const [payableAmount, setPayableAmount] = useState(0);
  const [paymentAmountNow, setPaymentAmountNow] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [markAsSettled, setMarkAsSettled] = useState(true);
  const [paidAmountExpanded, setPaidAmountExpanded] = useState(true);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  const openCollectPayment = (item: PurchaseReturnItem) => {
    const currentPaid = (item.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const currentDue = Math.max(0, item.refundAmount - currentPaid);

    setPaymentReturnItem(item);
    setPaymentAmountNow(String(currentDue > 0 ? currentDue : item.refundAmount));
    setPayableAmount(item.refundAmount);
    setPaymentDate('2026-05-20');
    setPaymentMode('UPI');
    setPaymentNote('');
    setPaymentReference('');
    setMarkAsSettled(true);
    setEditingPaymentId(null);
    setCollectPaymentOpen(true);
  };

  const handleConfirmCollectPayment = () => {
    if (!paymentReturnItem) return;

    const amountNow = parseFloat(paymentAmountNow) || 0;
    if (amountNow <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    // Format payment date from 'YYYY-MM-DD' to 'DD/MM/YY'
    let formattedDate = paymentDate;
    if (paymentDate && paymentDate.includes('-')) {
      const parts = paymentDate.split('-');
      if (parts.length === 3) {
        const year = parts[0].substring(2);
        const month = parts[1];
        const day = parts[2];
        formattedDate = `${day}/${month}/${year}`;
      }
    }

    if (editingPaymentId) {
      setReturnsList(prev => prev.map(item => {
        if (item.id === paymentReturnItem.id) {
          const updatedPayments = (item.payments || []).map(p => {
            if (p.id === editingPaymentId) {
              return {
                ...p,
                amount: amountNow,
                date: formattedDate,
                mode: paymentMode,
                note: paymentNote
              };
            }
            return p;
          });
          const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
          const nextStatus = (markAsSettled || totalPaid >= item.refundAmount) ? 'Completed' as const : 'Pending' as const;
          return {
            ...item,
            payments: updatedPayments,
            status: nextStatus
          };
        }
        return item;
      }));

      setViewDetailsItem(prev => {
        if (prev && prev.id === paymentReturnItem.id) {
          const updatedPayments = (prev.payments || []).map(p => {
            if (p.id === editingPaymentId) {
              return {
                ...p,
                amount: amountNow,
                date: formattedDate,
                mode: paymentMode,
                note: paymentNote
              };
            }
            return p;
          });
          const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
          const nextStatus = (markAsSettled || totalPaid >= prev.refundAmount) ? 'Completed' as const : 'Pending' as const;
          return {
            ...prev,
            payments: updatedPayments,
            status: nextStatus
          };
        }
        return prev;
      });

      setNotification({
        show: true,
        message: `Successfully updated payment of ₹${amountNow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}!`
      });
    } else {
      const newPayment = {
        id: `pay-${Date.now()}`,
        date: formattedDate,
        mode: paymentMode,
        amount: amountNow,
        note: paymentNote
      };

      setReturnsList(prev => prev.map(item => {
        if (item.id === paymentReturnItem.id) {
          const updatedPayments = [...(item.payments || []), newPayment];
          const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
          const nextStatus = (markAsSettled || totalPaid >= item.refundAmount) ? 'Completed' as const : 'Pending' as const;
          return {
            ...item,
            payments: updatedPayments,
            status: nextStatus
          };
        }
        return item;
      }));

      setViewDetailsItem(prev => {
        if (prev && prev.id === paymentReturnItem.id) {
          const updatedPayments = [...(prev.payments || []), newPayment];
          const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
          const nextStatus = (markAsSettled || totalPaid >= prev.refundAmount) ? 'Completed' as const : 'Pending' as const;
          return {
            ...prev,
            payments: updatedPayments,
            status: nextStatus
          };
        }
        return prev;
      });

      setNotification({
        show: true,
        message: `Successfully collected ₹${amountNow.toLocaleString('en-IN', { minimumFractionDigits: 2 })} refund payment for ${paymentReturnItem.returnId}!`
      });
    }

    setTimeout(() => {
      setNotification(null);
    }, 4500);

    setCollectPaymentOpen(false);
  };

  const handleDeleteEditingPayment = () => {
    if (!paymentReturnItem || !editingPaymentId) return;

    if (!confirm(`Are you sure you want to delete this payment record of ₹${parseFloat(paymentAmountNow).toLocaleString('en-IN')}?`)) return;

    setReturnsList(prev => prev.map(item => {
      if (item.id === paymentReturnItem.id) {
        const updatedPayments = (item.payments || []).filter(p => p.id !== editingPaymentId);
        const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        const nextStatus = totalPaid >= item.refundAmount ? 'Completed' as const : 'Pending' as const;
        return { ...item, payments: updatedPayments, status: nextStatus };
      }
      return item;
    }));

    setViewDetailsItem(prev => {
      if (prev && prev.id === paymentReturnItem.id) {
        const updatedPayments = (prev.payments || []).filter(p => p.id !== editingPaymentId);
        const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        const nextStatus = totalPaid >= prev.refundAmount ? 'Completed' as const : 'Pending' as const;
        return { ...prev, payments: updatedPayments, status: nextStatus };
      }
      return prev;
    });

    setNotification({
      show: true,
      message: `Successfully deleted payment record!`
    });

    setTimeout(() => {
      setNotification(null);
    }, 4500);

    setCollectPaymentOpen(false);
  };

  const handleEditPaymentClick = (payment: any) => {
    if (!viewDetailsItem) return;

    let isoDate = '2026-05-20';
    if (payment.date && payment.date.includes('/')) {
      const parts = payment.date.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const yearPart = parts[2];
        const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
        isoDate = `${year}-${month}-${day}`;
      }
    }

    setPaymentReturnItem(viewDetailsItem);
    setPayableAmount(viewDetailsItem.refundAmount);
    setPaymentAmountNow(String(payment.amount));
    setPaymentDate(isoDate);
    setPaymentMode(payment.mode);
    setPaymentNote(payment.note || '');
    setMarkAsSettled(viewDetailsItem.status === 'Completed');
    setEditingPaymentId(payment.id);
    setCollectPaymentOpen(true);
  };

  // Create Return active configurations — sourced from live purchases.
  const { data: purchaseOrders = [], isLoading: posLoading } = useReturnablePurchases();
  const [selectedPO, setSelectedPO] = useState<ReturnablePurchaseOrder | null>(null);
  const [activeReturnItems, setActiveReturnItems] = useState<ReturnablePurchaseItem[]>([]);

  // Seed the wizard with the first returnable PO once live data arrives.
  React.useEffect(() => {
    if (!selectedPO && purchaseOrders.length > 0) {
      setSelectedPO(purchaseOrders[0]);
      setActiveReturnItems(purchaseOrders[0].items.map(it => ({ ...it })));
    }
  }, [purchaseOrders, selectedPO]);
  const [poSearchOpen, setPoSearchOpen] = useState(false);
  const [poSearchQuery, setPoSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ show: boolean; message: string } | null>(null);

  const startBulkImportSimulation = (filename: string) => {
    setBulkFileName(filename);
    setBulkProgress(15);
    setBulkValidationStage('Opening and scanning document headers...');

    setTimeout(() => {
      setBulkProgress(45);
      setBulkValidationStage('Validating supplier identities & linking return IDs...');
    }, 600);

    setTimeout(() => {
      setBulkProgress(80);
      setBulkValidationStage('Verifying invoice reference numbers & refund item totals...');
    }, 1200);

    setTimeout(() => {
      setBulkProgress(100);
      setBulkValidationStage('Verified! Row counts: 3 ready, 0 mismatches. Click Import to finalize.');
    }, 1800);
  };

  const handleProcessBulkImport = () => {
    if (!bulkFileName) return;
    setNotification({
      show: true,
      message: `Processed purchase returns from '${bulkFileName}'. Refreshing backend returns.`
    });

    setShowBulkReturnModal(false);
    setBulkFileName(null);
    setBulkProgress(null);
    setBulkValidationStage('');
  };

  const handleSelectPO = (po: ReturnablePurchaseOrder) => {
    setIsBulkMode(false);
    setSelectedPO(po);
    setActiveReturnItems(po.items.map(it => ({ ...it })));
    setPoSearchOpen(false);
  };

  const incrementQty = (itemId: string) => {
    setActiveReturnItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, returnQty: item.returnQty + 1 };
      }
      return item;
    }));
  };

  const decrementQty = (itemId: string) => {
    setActiveReturnItems(prev => prev.map(item => {
      if (item.id === itemId && item.returnQty > 0) {
        return { ...item, returnQty: item.returnQty - 1 };
      }
      return item;
    }));
  };

  const changeReason = (itemId: string, reason: string) => {
    setActiveReturnItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, reason };
      }
      return item;
    }));
  };

  const getUnitMultiplier = (selectedUnit: string | undefined, itemBoxSize: number): number => {
    if (!selectedUnit) return 1;
    const unitStr = selectedUnit.toLowerCase().trim();
    if (unitStr === 'numbers') {
      return 1 / itemBoxSize;
    }
    if (unitStr === 'pack') {
      return 1;
    }

    // Extract number from units like "box of 100", "strip of 20", "box of 25", etc.
    const match = unitStr.match(/\d+/);
    if (match) {
      const qty = parseInt(match[0], 10);
      // Return relative quantity to standard box size
      return qty / itemBoxSize;
    }
    return 1;
  };

  const selectItemUnit = (itemId: string, unit: string) => {
    setActiveReturnItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, selectedUnit: unit };
      }
      return item;
    }));
  };

  // Calculations
  const totalReturnQty = activeReturnItems.reduce((sum, item) => sum + item.returnQty, 0);
  const netRefundAmount = activeReturnItems.reduce((sum, item) => {
    const multiplier = getUnitMultiplier(item.selectedUnit || 'Box of 100', item.boxSize || 100);
    const itemRefund = item.returnQty * item.purPrice * multiplier;
    return sum + itemRefund;
  }, 0);

  const handleConfirmReturn = (status: 'Completed' | 'Pending' | 'Draft') => {
    const nextReturnIdNum = 2045 + returnsList.length + 1;
    const vendorName = isBulkMode
      ? ([...new Set(activeReturnItems.map(it => (it as any).vendorName))].join(', ') || 'Multiple Vendors')
      : (selectedPO?.vendorName ?? 'Unknown Vendor');
    const vendorId = isBulkMode ? 'BULK-CONSOLIDATED' : (selectedPO?.vendorId ?? '#-');

    const newReturn: PurchaseReturnItem = {
      id: String(returnsList.length + 1),
      returnId: `PR-${nextReturnIdNum}`,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
      to: {
        name: vendorName,
        id: vendorId,
        color: 'bg-[#1E1C24] text-[#E5C384]',
        initials: vendorName.substring(0, 2).toUpperCase(),
        isLogo: vendorName.includes('SIMRAN')
      },
      from: { name: isBulkMode ? 'Store' : (selectedPO?.storeName ?? 'Store'), id: '' },
      invoiceNo: `INV-${nextReturnIdNum}`,
      invoiceDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      invoiceTime: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
      refundAmount: netRefundAmount,
      status: status
    };

    setReturnsList(prev => [newReturn, ...prev]);

    // Persist to backend (was previously a no-op status call on a local id).
    // Uses the real item/store/vendor uids surfaced by useReturnablePurchases;
    // items issue stock in base units (unitUid converts when set).
    const fromStoreUid = (selectedPO as any)?.storeUid
      || (prStores as any[]).find((s: any) => (s.name || s.storeName) === (selectedPO?.storeName))?.uid
      || null;
    const payloadItems = activeReturnItems
      .filter((it) => it.returnQty > 0)
      .map((it) => ({
        itemUid: (it as any).itemUid || it.id,
        qty: Math.round(it.returnQty),
        purchQty: it.returnQty,
        unitUid: (it as any).unitUid || null,
        unitPrice: it.purPrice,
        batchNumber: (it as any).batchNumber || null,
      }));
    if (payloadItems.length > 0) {
      createReturnMutation.mutate({
        returnNo: newReturn.returnId,
        vendorUid: isBulkMode ? null : ((selectedPO as any)?.vendorUid ?? null),
        fromStoreUid,
        status: status.toUpperCase(),
        items: payloadItems,
      });
    }

    setNotification({
      show: true,
      message: `Purchase Return ${newReturn.returnId} has been successfully created as a ${status}!`
    });

    setTimeout(() => {
      setNotification(null);
    }, 4500);

    setShowCreateReturn(false);
    setShowConfirmModal(false);
  };

  // Filter data based on search and status
  const filteredData = returnsList.filter(item => {
    const matchesSearch =
      item.returnId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.to.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedStatus) {
      return matchesSearch && item.status.toLowerCase() === selectedStatus.toLowerCase();
    }
    return matchesSearch;
  });

  const [returnPage, setReturnPage] = useState(1);
  React.useEffect(() => { setReturnPage(1); }, [searchQuery, selectedStatus, returnsList.length]);
  const pagedData = filteredData.slice(
    (returnPage - 1) * RETURN_PAGE_SIZE,
    returnPage * RETURN_PAGE_SIZE
  );

  if (viewDetailsItem) {
    const matchedPO = purchaseOrders.find(po =>
      po.vendorName.toLowerCase().includes(viewDetailsItem.to.name.toLowerCase()) ||
      viewDetailsItem.to.name.toLowerCase().includes(po.vendorName.toLowerCase())
    ) || purchaseOrders[0] || { items: [] as ReturnablePurchaseItem[] } as ReturnablePurchaseOrder;

    const detailsTotalQty = matchedPO.items.reduce((sum, item) => sum + item.returnQty, 0);

    return (
      <div className="flex flex-col flex-1 bg-[#F9F8FA] min-h-screen">
        {/* Detail Header bar with status indicator */}
        <div className="bg-white border-b border-slate-100 py-3.5 px-8 flex items-center justify-between shrink-0 shadow-xs z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setViewDetailsItem(null)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors group"
            >
              <ArrowLeft className="h-5 w-5 text-slate-900 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-black text-slate-950 tracking-tight leading-none">
                Purchase Return Details - {viewDetailsItem.returnId}
              </h1>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black uppercase text-[11px] tracking-wide",
                viewDetailsItem.status === 'Completed' && "bg-[#DEF9EC] text-[#1E7D53]",
                viewDetailsItem.status === 'Pending' && "bg-[#FEF1E1] text-[#BD6C15]",
                viewDetailsItem.status === 'Draft' && "bg-[#F3F1F5] text-[#716C7B]",
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full select-none",
                  viewDetailsItem.status === 'Completed' && "bg-[#1E7D53]",
                  viewDetailsItem.status === 'Pending' && "bg-[#BD6C15]",
                  viewDetailsItem.status === 'Draft' && "bg-[#716C7B]",
                )} />
                {viewDetailsItem.status}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Details Content Wrapper - removed left/right space and matches Process Purchase Return page layout */}
        <div className="p-6 md:p-8 w-full flex flex-col gap-6 flex-1 items-stretch">

          {/* SECTION 2: PATHWAY & PURCHASE DETAILS DIV */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col relative z-20">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-4 text-left">
              Pathway & Return Details
            </span>

            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 border-b border-[#FAF9FD] pb-6">
              {/* Vendor block */}
              <div className="bg-[#FAF9F5] border border-slate-200/50 rounded-xl px-5 py-4 text-left flex-1">
                <div className="text-[10px] font-extrabold text-[#87858E] uppercase tracking-wider mb-1">
                  Returned To (Vendor)
                </div>
                <div className="text-base font-black text-[#1E1C24] uppercase mb-1">
                  {viewDetailsItem.to.name}
                </div>
                <div className="text-[11px] font-bold text-slate-400">
                  {viewDetailsItem.to.id}
                </div>
              </div>

              {/* Connecting U-turn symbol */}
              <div className="flex items-center justify-center relative min-w-[60px] select-none">
                <div className="hidden md:block absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-slate-200 w-full" />
                <div className="h-10 w-10 rounded-full border border-slate-200 bg-white flex items-center justify-center shadow-xs text-slate-750 relative z-10">
                  <RotateCcw className="h-4 w-4 text-[#55349A]" strokeWidth={2.5} />
                </div>
              </div>

              {/* Store block */}
              <div className="bg-[#FAF9F5] border border-slate-200/50 rounded-xl px-5 py-4 text-left flex-1">
                <div className="text-[10px] font-extrabold text-[#87858E] uppercase tracking-wider mb-1">
                  Returned From (Store)
                </div>
                <div className="text-base font-black text-[#1E1C24] uppercase mb-1">
                  {viewDetailsItem.from.name}
                </div>
                <div className="text-[11px] font-bold text-slate-400">
                  Inv.Catalog: -
                </div>
              </div>
            </div>

            {/* Info details badges */}
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="border border-slate-100 bg-[#FAF9FD] px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs text-slate-500 shadow-2xs w-fit">
                <span className="text-slate-400 font-bold">Return ID:</span>
                <span className="text-slate-900 font-black">{viewDetailsItem.returnId}</span>
              </div>
              <div className="border border-slate-100 bg-[#FAF9FD] px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs text-slate-500 shadow-2xs w-fit">
                <span className="text-slate-400 font-bold">Created Date & Time:</span>
                <span className="text-slate-900 font-black">{viewDetailsItem.date} • {viewDetailsItem.time}</span>
              </div>
              <div className="border border-slate-100 bg-[#FAF9FD] px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs text-slate-500 shadow-2xs w-fit">
                <span className="text-slate-400 font-bold">Invoice Ref:</span>
                <span className="text-slate-900 font-black">{viewDetailsItem.invoiceNo}</span>
              </div>
            </div>
          </div>

          {/* SECTION 3: ITEMS/PRODUCTS DIV - READ ONLY VIEW TABLE */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs relative z-10">
            <div className="p-5 border-b border-slate-100 bg-white">
              <h3 className="text-sm font-black text-[#1E1C24] uppercase tracking-wider text-left">Returned Items / Products</h3>
            </div>

            <div className="w-full overflow-x-auto select-none">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100/80 text-[10px] font-black text-[#8B8993] uppercase tracking-wider">
                    <th className="py-3.5 px-6">ITEM DETAILS</th>
                    <th className="py-3.5 px-6">TOTAL STOCK QTY</th>
                    <th className="py-3.5 px-6">PUR. PRICE (₹)</th>
                    <th className="py-3.5 px-6 text-center">RETURN QTY</th>
                    <th className="py-3.5 px-6 text-center">Return Unit</th>
                    <th className="py-3.5 px-6">REASON FOR RETURN</th>
                    <th className="py-3.5 px-6">TAX%</th>
                    <th className="py-3.5 px-6 text-right">TOTAL REFUND (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/75">
                  {matchedPO.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/10 transition-colors">
                      {/* ITEM DETAILS with Thumbnail & batch badge */}
                      <td className="py-4.5 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-11 w-11 rounded-xl object-cover bg-slate-50 border border-slate-100"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex flex-col text-left">
                            <span className="text-[13px] font-black text-[#1E1C24]">{item.name}</span>
                            <span className="text-[11px] text-[#A2A0AA] font-semibold mt-0.5">{item.details}</span>
                            <span className="inline-block self-start mt-2 px-2.5 py-0.5 bg-[#FAF9FC] border border-[#EDEBF1] text-[#55349A] text-[10px] font-extrabold rounded-md uppercase tracking-wider">
                              {item.batch}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* QUANTITY */}
                      <td className="py-4.5 px-6 text-xs font-bold text-[#1E1C24]">
                        <div className="font-black text-[13px]">
                          {item.availableQty} {item.unit || 'box'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5 whitespace-nowrap">
                          ({item.unitDescription || 'box of 100 pieces'})
                        </div>
                      </td>

                      {/* PUR PRICE */}
                      <td className="py-4.5 px-6 text-xs font-extrabold text-slate-800">
                        {item.purPrice.toFixed(2)}
                      </td>

                      {/* RETURN QTY COLOURED BADGE */}
                      <td className="py-4.5 px-6 text-center">
                        <span className="text-[#1D1B20] font-black text-sm">{item.returnQty}</span>
                      </td>

                      {/* RETURN UNIT COLOURED BADGE */}
                      <td className="py-4.5 px-6 text-center">
                        <span className="inline-block px-2 py-0.5 bg-[#55349A]/5 text-[#55349A] text-[9px] font-black uppercase rounded border border-[#55349A]/10">
                          {item.selectedUnit || 'Box of 100'}
                        </span>
                      </td>

                      {/* REASON */}
                      <td className="py-4.5 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-[#FAF9FC] text-slate-700 border border-slate-200/50">
                          {item.reason}
                        </span>
                      </td>

                      {/* TAX PERCENT */}
                      <td className="py-4.5 px-6">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-[#1E1C24]">{item.taxPercent.toFixed(2)}%</span>
                          <span className="text-[9px] text-[#8B8993] font-semibold mt-0.5 uppercase tracking-wide">Exempted</span>
                        </div>
                      </td>

                      {/* REFUND */}
                      <td className="py-4.5 px-6 text-right text-xs font-extrabold text-[#1E1C24]">
                        ₹ {(item.returnQty * item.purPrice * getUnitMultiplier(item.selectedUnit || 'Box of 100', item.boxSize || 100)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: BILL SUMMARY & DETAILS DIV MATCHING THE LOOK OF image.png */}
          <div className="max-w-[400px] w-full ml-auto relative z-10 self-end">
            <div className="bg-white border border-slate-200/95 rounded-2xl shadow-xs overflow-hidden flex flex-col">

              {/* Card Header matching image.png */}
              <div className="px-5 py-4 border-b border-slate-100 bg-white">
                <h3 className="text-[#1D1B20] font-bold text-[14px] text-left">Bill Details</h3>
              </div>

              {/* Card Body matching image.png */}
              <div className="p-5 flex flex-col select-none">

                {/* Total Quantity Row */}
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-4">
                  <span>Total quantity</span>
                  <span className="text-[#1D1B20] font-black text-sm">{detailsTotalQty}</span>
                </div>

                {/* Dotted Divider matching image.png */}
                <div className="border-t border-dashed border-slate-200 my-1" />

                {/* Net Refund Row */}
                <div className="flex items-center justify-between text-xs text-slate-900 font-bold py-4">
                  <span className="text-[#1D1B20] font-black">Net Refund Amount(₹)</span>
                  <span className="text-sm font-black text-[#1D1B20] font-sans">
                    ₹ {viewDetailsItem.refundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Paid Amount list box matching image.png */}
                <div className="border border-slate-200/80 rounded-2xl bg-[#FCFBFE] p-4.5 mb-4 text-left">
                  {/* Clickable Header line to expand/collapse */}
                  <div
                    onClick={() => setPaidAmountExpanded(!paidAmountExpanded)}
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <span className="text-[14px] font-bold text-[#4B5563] group-hover:text-slate-800 transition-colors">Paid Amount</span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-[#1D1B20]">
                        ₹ {(viewDetailsItem.payments || []).reduce((sum, p) => sum + p.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 text-slate-400 transition-transform duration-250",
                          paidAmountExpanded ? "transform rotate-180" : ""
                        )}
                      />
                    </div>
                  </div>

                  {/* Payment Details Sub-list */}
                  <AnimatePresence initial={false}>
                    {paidAmountExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 mt-4 pt-4 border-t border-dashed border-slate-200/70">
                          {(!viewDetailsItem.payments || viewDetailsItem.payments.length === 0) ? (
                            <div className="text-[11px] text-slate-400 font-bold italic">No payments recorded yet.</div>
                          ) : (
                            viewDetailsItem.payments.map((payment, idx) => (
                              <div key={payment.id || idx}>
                                {idx > 0 && <div className="border-t border-dashed border-slate-200/30 my-2.5" />}
                                <div className="flex items-center justify-between text-xs font-bold text-[#4B5563]">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleEditPaymentClick(payment)}
                                      className="text-[#55349A] hover:text-[#43277c] font-bold underline cursor-pointer text-left font-sans"
                                    >
                                      {payment.date}({payment.mode.toUpperCase()})
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEditPaymentClick(payment)}
                                      className="p-1 text-[#55349A] hover:bg-purple-50 rounded-md transition-colors cursor-pointer"
                                    >
                                      <Edit2 className="h-3 w-3 stroke-[2.5]" />
                                    </button>
                                  </div>
                                  <span className="text-slate-500 font-black font-sans">₹ {payment.amount}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Amount Due Row matching image.png */}
                <div className="flex items-center justify-between text-xs text-slate-900 font-black py-2 mb-4">
                  <span className="text-[#4B5563] text-[14px] font-bold font-sans">Amount Due</span>
                  <span className="text-base font-black text-[#1D1B20] font-sans">
                    ₹ {Math.max(0, viewDetailsItem.refundAmount - (viewDetailsItem.payments || []).reduce((sum, p) => sum + p.amount, 0)).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  </span>
                </div>

                {/* High quality report action stacked buttons */}
                <div className="space-y-3 mt-1">
                  {viewDetailsItem.status !== 'Completed' && (
                    <button
                      type="button"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => handleCompleteReturn(viewDetailsItem.id)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black tracking-wider uppercase transition-all shadow-md cursor-pointer text-center active:scale-98 flex items-center justify-center gap-2"
                    >
                      <Check className="h-4 w-4 stroke-[2.5]" />
                      {updateStatusMutation.isPending ? 'Completing…' : 'Confirm & Complete Return'}
                    </button>
                  )}
                  {Math.max(0, viewDetailsItem.refundAmount - (viewDetailsItem.payments || []).reduce((sum, p) => sum + p.amount, 0)) > 0 && (
                    <button
                      type="button"
                      onClick={() => openCollectPayment(viewDetailsItem)}
                      className="w-full py-3 bg-[#55349A] hover:bg-[#43277c] text-white rounded-lg text-xs font-black tracking-wider uppercase transition-all shadow-md cursor-pointer text-center active:scale-98 flex items-center justify-center gap-2"
                    >
                      <Check className="h-4 w-4 stroke-[2.5]" />
                      Collect Refund Payment
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => alert('Printing has been triggered successfully')}
                      className="py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-black tracking-wider uppercase transition-all shadow-3xs cursor-pointer text-center inline-flex items-center justify-center gap-1.5"
                    >
                      <Printer className="h-3 w-3 text-slate-500" />
                      Print
                    </button>
                    <button
                      type="button"
                      onClick={() => alert('Download PDF is started')}
                      className="py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-black tracking-wider uppercase transition-all shadow-3xs cursor-pointer text-center inline-flex items-center justify-center gap-1.5"
                    >
                      <Download className="h-3 w-3 text-slate-500" />
                      PDF
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewDetailsItem(null)}
                    className="w-full py-2.5 bg-[#55349A] hover:bg-[#43277c] text-white rounded-lg text-xs font-black tracking-wider uppercase transition-all shadow-xs cursor-pointer text-center active:scale-98"
                  >
                    Back to Returns List
                  </button>
                </div>

              </div>

            </div>
          </div>

        </div>

        {/* Collect Payment Modal/Popup */}
        <AnimatePresence>
          {collectPaymentOpen && paymentReturnItem && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              {/* Backdrop wrapper */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setCollectPaymentOpen(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
              />

              {/* Modal Content Box */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                className="bg-white rounded-[26px] shadow-2xl w-full max-w-[540px] overflow-hidden relative z-20 flex flex-col p-8 md:p-9"
              >
                {/* Header Box mirroring image.png */}
                <div className="flex items-center justify-between mb-8 text-left">
                  <h2 className="text-[22px] font-black text-[#1D1B20] tracking-tight leading-none">
                    {editingPaymentId ? "Edit Payment Record" : `Payable Amount : ₹${payableAmount.toLocaleString('en-IN')}`}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setCollectPaymentOpen(false)}
                    className="h-10 w-10 border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="h-4.5 w-4.5" strokeWidth={2.5} />
                  </button>
                </div>

                {/* Form elements from image.png */}
                <div className="space-y-6 text-left">

                  {/* Amount To Pay Now */}
                  <div>
                    <label className="block text-[14px] font-bold text-[#4B5563] mb-2 text-left">
                      {editingPaymentId ? "Payment Amount (₹)" : "Amount To Pay Now (₹)"}
                    </label>
                    <input
                      type="number"
                      value={paymentAmountNow}
                      onChange={(e) => setPaymentAmountNow(e.target.value)}
                      className="w-full px-4.5 py-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-base font-semibold text-[#1D1B20] outline-none focus:ring-2 focus:ring-[#55349A]/15 focus:border-[#55349A] transition-all"
                      placeholder="Enter amount"
                    />
                  </div>

                  {/* Payment Date with Calendar icon on right */}
                  <div>
                    <label className="block text-[14px] font-bold text-[#4B5563] mb-2 text-left">
                      Payment Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full pl-4.5 pr-12 py-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-base font-semibold text-[#1D1B20] outline-none focus:ring-2 focus:ring-[#55349A]/15 focus:border-[#55349A] transition-all cursor-pointer"
                      />
                      <div className="absolute right-4.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Calendar className="h-5 w-5 text-[#55349A]" />
                      </div>
                    </div>
                  </div>

                  {/* Payment Mode drop-down with Chevron icon on right */}
                  <div>
                    <label className="block text-[14px] font-bold text-[#4B5563] mb-2 text-left">
                      Payment Mode
                    </label>
                    <div className="relative">
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-full pl-4.5 pr-12 py-3.5 bg-white border border-slate-200 hover:border-[#1A73E8] rounded-xl text-base font-bold text-[#1D1B20] outline-none focus:ring-2 focus:ring-[#55349A]/15 focus:border-[#55349A] transition-all cursor-pointer appearance-none"
                      >
                        <option value="UPI">UPI</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Net Banking">Net Banking</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Card">Card</option>
                      </select>
                      <div className="absolute right-4.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {/* Leave a Payment Note */}
                  <div>
                    <label className="block text-[14px] font-bold text-[#4B5563] mb-2 text-left">
                      Leave a Payment Note
                    </label>
                    <textarea
                      rows={3}
                      placeholder=""
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      className="w-full px-4.5 py-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-base font-semibold text-[#1D1B20] outline-none focus:ring-2 focus:ring-[#55349A]/15 focus:border-[#55349A] transition-all resize-none"
                    />
                  </div>

                  {/* Mark Invoice as Settled Switch Container Box and Warn styling from image.png */}
                  <div className="bg-[#FAF9FC] border border-[#F3EFFB] rounded-2xl p-4.5 flex items-start gap-4">
                    {/* Purple Switch Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setMarkAsSettled(!markAsSettled)}
                      className={cn(
                        "w-12 h-[26px] rounded-full p-0.5 transition-colors duration-200 focus:outline-none shrink-0 relative mt-1 cursor-pointer select-none",
                        markAsSettled ? "bg-[#55349A]" : "bg-slate-300"
                      )}
                    >
                      <span className={cn(
                        "block w-5.5 h-5.5 rounded-full bg-white transition-all shadow-md",
                        markAsSettled ? "translate-x-5.5" : "translate-x-0"
                      )} />
                    </button>

                    {/* Toggle note description text */}
                    <div className="flex-1 text-left">
                      <span className="text-[14px] font-black text-[#1D1B20] block">Mark Invoice as Settled</span>
                      <span className="text-[11px] text-[#7E828F] font-bold leading-normal mt-1 block">
                        Review invoice details carefully, as settled invoices cannot be edited or reversed.
                      </span>
                    </div>
                  </div>

                </div>

                {/* Footer Actions matching cancel and pay look of image.png */}
                <div className="flex justify-between items-center mt-8 shrink-0">
                  {editingPaymentId ? (
                    <button
                      type="button"
                      onClick={handleDeleteEditingPayment}
                      className="px-6 py-3 bg-[#FCE8E6] text-[#C5221F] hover:bg-red-100 rounded-xl text-base font-bold transition-colors cursor-pointer min-w-[100px]"
                    >
                      Delete
                    </button>
                  ) : <div />}
                  <div className="flex justify-end gap-3.5">
                    <button
                      type="button"
                      onClick={() => setCollectPaymentOpen(false)}
                      className="px-8 py-3 bg-white border border-slate-200 hover:bg-slate-50/80 active:bg-slate-100 text-[#4F5B76] rounded-xl text-base font-black transition-colors cursor-pointer min-w-[120px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCollectPayment}
                      className="px-10 py-3 bg-[#55349A] hover:bg-[#43277c] active:bg-[#341d61] text-white rounded-xl text-base font-black transition-all shadow-md hover:shadow-lg active:scale-98 cursor-pointer min-w-[120px]"
                    >
                      {editingPaymentId ? "Update" : "Pay"}
                    </button>
                  </div>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    );
  }

  if (showCreateReturn) {
    // Dealer-first purchase return (select the dealer → their returnable lines). Replaces the old
    // purchase-first wizard that follows (now unreachable, kept only to avoid a large risky deletion).
    return (
      <CreatePurchaseReturn
        onBack={() => { setShowCreateReturn(false); setSelectedBulkVendor(null); setIsBulkMode(false); }}
        onCreated={() => { setShowCreateReturn(false); }}
      />
    );
    // eslint-disable-next-line no-constant-condition
    if (!selectedPO) {
      return (
        <div className="flex flex-col flex-1 bg-[#F9F8FA] min-h-screen">
          <div className="bg-white border-b border-slate-100 py-4 px-8 flex items-center gap-4 shrink-0 shadow-xs z-20">
            <button
              onClick={() => { setShowCreateReturn(false); setSelectedBulkVendor(null); setIsBulkMode(false); }}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors group"
            >
              <ArrowLeft className="h-5 w-5 text-slate-900 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <h1 className="text-lg font-black text-slate-950 tracking-tight">Create Purchase Return</h1>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <RotateCcw className="h-10 w-10 text-slate-300 mb-4" />
            <h2 className="text-base font-black text-slate-800">
              {posLoading ? 'Loading purchases…' : 'No returnable purchases yet'}
            </h2>
            <p className="text-sm text-slate-400 font-medium mt-1 max-w-sm">
              {posLoading
                ? 'Fetching your recent purchase orders.'
                : 'Record and receive a purchase first — its items will then be available to return here.'}
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col flex-1 bg-[#F9F8FA] min-h-screen">
        {/* Creation Header */}
        <div className="bg-white border-b border-slate-100 py-4 px-8 flex items-center justify-between shrink-0 shadow-xs z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setShowCreateReturn(false);
                setSelectedBulkVendor(null);
                setIsBulkMode(false);
              }}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors group"
            >
              <ArrowLeft className="h-5 w-5 text-slate-900 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <h1 className="text-lg font-black text-slate-950 tracking-tight leading-none">
              {isBulkMode ? "Process Bulk Purchase Return" : "Process Purchase Return"}
            </h1>
          </div>
        </div>
        {/* Content View with structured sequential sections */}
        <div className="p-6 md:p-8 w-full flex flex-col gap-6 flex-1 items-stretch">

          {/* SECTION 1: SEARCH SELECTOR DIV */}
          {isBulkMode ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative z-30">
              <label className="block text-[11px] font-black text-[#55349A] uppercase tracking-wider mb-2.5 text-left flex items-center gap-1.5 flex-wrap">
                <span className="inline-block h-2 w-2 rounded-full bg-[#319795] animate-pulse" />
                Bulk Mode {selectedBulkVendor ? `(Vendor: ${selectedBulkVendor})` : ""}: Search & Select Items/Products to Return
              </label>
              <div className="relative max-w-xl">
                <input
                  type="text"
                  placeholder="Search products by Name, Details, Batch, Vendor Name or Purchase #..."
                  value={poSearchQuery}
                  onFocus={() => setPoSearchOpen(true)}
                  onChange={(e) => {
                    setPoSearchQuery(e.target.value);
                    setPoSearchOpen(true);
                  }}
                  className="w-full pl-10 pr-10 py-3 bg-[#FAF9FD] border-2 border-[#55349A]/30 focus:border-[#55349A] rounded-xl text-xs font-bold text-[#1E1C24] focus:ring-2 focus:ring-[#55349A]/15 outline-none transition-all placeholder:text-slate-400 text-left"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#55349A]" />
                <button
                  type="button"
                  onClick={() => setPoSearchOpen(!poSearchOpen)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5"
                >
                  <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", poSearchOpen && "rotate-180")} />
                </button>

                {/* List Dropdown for Searching Items dynamically */}
                {poSearchOpen && (
                  <>
                    <div className="fixed inset-0 z-50" onClick={() => setPoSearchOpen(false)} />
                    <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-64 overflow-y-auto py-1.5 animate-in fade-in slide-in-from-top-1 duration-100">
                      <div className="px-4 py-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-b-slate-50 text-left">
                        MATCHING PRODUCTS ({
                          purchaseOrders.filter(po => !isBulkMode || !selectedBulkVendor || po.vendorName === selectedBulkVendor).flatMap(po =>
                            po.items.map(item => ({
                              ...item,
                              purchaseNo: po.purchaseNo,
                              vendorName: po.vendorName,
                              billNo: po.billNo,
                              vendorId: po.vendorId,
                              storeName: po.storeName,
                            }))
                          ).filter(it =>
                            it.name.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
                            it.details.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
                            it.batch.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
                            it.purchaseNo.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
                            it.vendorName.toLowerCase().includes(poSearchQuery.toLowerCase())
                          ).length
                        })
                      </div>
                      {purchaseOrders.filter(po => !isBulkMode || !selectedBulkVendor || po.vendorName === selectedBulkVendor).flatMap(po =>
                        po.items.map(item => ({
                          ...item,
                          id: `${item.id}-${po.purchaseNo}`, // unique ID for bulk items
                          originalItemId: item.id,
                          purchaseNo: po.purchaseNo,
                          vendorName: po.vendorName,
                          billNo: po.billNo,
                          vendorId: po.vendorId,
                          storeName: po.storeName,
                          storeSubtitle: po.storeSubtitle,
                        }))
                      ).filter(it =>
                        it.name.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
                        it.details.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
                        it.batch.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
                        it.purchaseNo.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
                        it.vendorName.toLowerCase().includes(poSearchQuery.toLowerCase())
                      ).map(item => {
                        const isAdded = activeReturnItems.some(it => it.id === item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              if (!isAdded) {
                                const itemWithQty = { ...item, returnQty: 1 };
                                setActiveReturnItems(prev => [...prev, itemWithQty]);
                              } else {
                                // Increment existing item quantity
                                setActiveReturnItems(prev => prev.map(it =>
                                  it.id === item.id ? { ...it, returnQty: Math.min(Number(it.availableQty), it.returnQty + 1) } : it
                                ));
                              }
                              setPoSearchQuery('');
                              setPoSearchOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-3 text-xs hover:bg-[#F9F8FA] transition-all flex items-center justify-between gap-3 border-b border-slate-50 last:border-0",
                              isAdded ? "bg-[#319795]/5" : ""
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <img src={item.image} alt={item.name} className="h-10 w-10 rounded-lg object-cover bg-slate-100 border border-slate-200" referrerPolicy="no-referrer" />
                              <div className="flex flex-col text-left">
                                <span className="font-extrabold text-[#1E1C24] text-sm flex items-center gap-1.5">
                                  {item.name}
                                  <span className="text-[10px] font-bold text-slate-400 font-mono">({item.batch.split(' ')?.[1] || item.batch})</span>
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium">{item.details} • Vendor: <span className="text-[#55349A] font-bold">{item.vendorName}</span></span>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1 shrink-0">
                              <span className="text-[11px] font-black text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded-md">PO: {item.purchaseNo}</span>
                              {isAdded ? (
                                <span className="text-[10px] text-[#2e7d32] font-black uppercase tracking-wider flex items-center gap-1">
                                  <Check className="h-3 w-3" strokeWidth={3} /> Added ({activeReturnItems.find(it => it.id === item.id)?.returnQty})
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#55349A] font-extrabold">+ Add to Return</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      {purchaseOrders.filter(po => !isBulkMode || !selectedBulkVendor || po.vendorName === selectedBulkVendor).flatMap(po =>
                        po.items.map(item => ({
                          ...item,
                          purchaseNo: po.purchaseNo,
                          vendorName: po.vendorName,
                          billNo: po.billNo,
                        }))
                      ).filter(it =>
                        it.name.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
                        it.details.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
                        it.batch.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
                        it.purchaseNo.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
                        it.vendorName.toLowerCase().includes(poSearchQuery.toLowerCase())
                      ).length === 0 && (
                        <div className="px-5 py-5 text-xs font-bold text-slate-400 text-center">
                          No matching items or products found
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative z-30">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2.5 text-left">
                Select Purchase Order / Choose a Purchase to process return
              </label>
              <div className="relative max-w-xl">
                <input
                  type="text"
                  placeholder="Search by Purchase #, Bill #, Vendor..."
                  value={poSearchQuery}
                  onFocus={() => setPoSearchOpen(true)}
                  onChange={(e) => {
                    setPoSearchQuery(e.target.value);
                    setPoSearchOpen(true);
                  }}
                  className="w-full pl-10 pr-10 py-3 bg-[#FAF9FD] border border-[#E1DEE4] rounded-xl text-xs font-bold text-[#1E1C24] focus:ring-2 focus:ring-[#55349A]/15 focus:border-[#55349A] outline-none transition-all placeholder:text-slate-400 text-left"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setPoSearchOpen(!poSearchOpen)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5"
                >
                  <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", poSearchOpen && "rotate-180")} />
                </button>

                {/* List Dropdown matching query */}
                {poSearchOpen && (
                  <>
                    <div className="fixed inset-0 z-50" onClick={() => setPoSearchOpen(false)} />
                    <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-64 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1 duration-100">
                      {purchaseOrders.filter(po =>
                        po.purchaseNo.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
                        po.vendorName.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
                        po.billNo.toLowerCase().includes(poSearchQuery.toLowerCase())
                      ).map(po => (
                        <button
                          key={po.purchaseNo}
                          type="button"
                          onClick={() => handleSelectPO(po)}
                          className={cn(
                            "w-full text-left px-5 py-3 text-xs hover:bg-[#F9F8FA] transition-colors flex flex-col gap-1 border-b border-slate-50 last:border-0",
                            selectedPO.purchaseNo === po.purchaseNo ? "bg-[#55349A]/5 border-l-4 border-l-[#55349A]" : ""
                          )}
                        >
                          <div className="flex justify-between font-black text-[#1E1C24]">
                            <span>Purchase Order {po.purchaseNo}</span>
                            <span className="text-[#55349A] font-extrabold">{po.vendorName}</span>
                          </div>
                          <div className="flex justify-between text-slate-400 font-semibold text-[10px] mt-0.5">
                            <span>Invoice Bill: {po.billNo}</span>
                            <span>Date: {po.date}</span>
                          </div>
                        </button>
                      ))}
                      {purchaseOrders.filter(po =>
                        po.purchaseNo.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
                        po.vendorName.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
                        po.billNo.toLowerCase().includes(poSearchQuery.toLowerCase())
                      ).length === 0 && (
                        <div className="px-5 py-4 text-xs font-bold text-slate-400 text-center">
                          No matching purchase orders found
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
           {/* SECTION 2: PATHWAY & PURCHASE DETAILS DIV */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col relative z-20">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-4 text-left">
              {isBulkMode ? "Pathway & Bulk Details" : "Pathway & Purchase Details"}
            </span>

            {isBulkMode ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 border-b border-[#FAF9FD] pb-6">
                  {/* Vendor block */}
                  <div className="bg-[#FAF9F5] border border-slate-200/50 rounded-xl px-5 py-4 text-left flex-1">
                    <div className="text-[10px] font-extrabold text-[#87858E] uppercase tracking-wider mb-1">
                      Vendor (Bulk Return)
                    </div>
                    <div className="text-base font-black text-[#1E1C24] uppercase mb-1 truncate max-w-xs md:max-w-md">
                      {selectedBulkVendor || [...new Set(activeReturnItems.map(it => (it as any).vendorName || selectedPO.vendorName))].join(', ') || 'General / Multi-vendor'}
                    </div>
                    <div className="text-[11px] font-bold text-slate-400">
                      Multi-record Consolidated return
                    </div>
                  </div>

                  {/* Connecting U-turn symbol */}
                  <div className="flex items-center justify-center relative min-w-[60px] select-none">
                    <div className="hidden md:block absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-slate-200 w-full" />
                    <div className="h-10 w-10 rounded-full border border-slate-200 bg-white flex items-center justify-center shadow-xs text-slate-750 relative z-10">
                      <RotateCcw className="h-4 w-4 text-[#55349A]" strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* Store block */}
                  <div className="bg-[#FAF9F5] border border-slate-200/50 rounded-xl px-5 py-4 text-left flex-1">
                    <div className="text-[10px] font-extrabold text-[#87858E] uppercase tracking-wider mb-1">
                      Destination Store
                    </div>
                    <div className="text-base font-black text-[#1E1C24] uppercase mb-1">
                      {createdReturn.from.name || '-'}
                    </div>
                    <div className="text-[11px] font-bold text-slate-400">
                      Inv.Catalog: -
                    </div>
                  </div>
                </div>

                {/* Info details badges with different mapped POs */}
                <div className="flex flex-wrap gap-3 mt-1">
                  {activeReturnItems.length > 0 && (
                    <div className="border border-slate-100 bg-[#FAF9FD] px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs text-slate-500 shadow-2xs w-fit">
                      <span className="text-slate-400 font-bold">Consolidated POs:</span>
                      <span className="text-[#55349A] font-black">{[...new Set(activeReturnItems.map(it => (it as any).purchaseNo || (it as any).poRef || selectedPO.purchaseNo))].join(', ')}</span>
                    </div>
                  )}
                  <div className="border border-slate-100 bg-[#FAF9FD] px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs text-slate-500 shadow-2xs w-fit">
                    <span className="text-slate-400 font-bold">Items Count:</span>
                    <span className="text-slate-900 font-black">{activeReturnItems.length} Products</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 border-b border-[#FAF9FD] pb-6">
                  {/* Vendor block */}
                  <div className="bg-[#FAF9F5] border border-slate-200/50 rounded-xl px-5 py-4 text-left flex-1">
                    <div className="text-[10px] font-extrabold text-[#87858E] uppercase tracking-wider mb-1">
                      Vendor
                    </div>
                    <div className="text-base font-black text-[#1E1C24] uppercase mb-1">
                      {selectedPO.vendorName}
                    </div>
                    <div className="text-[11px] font-bold text-slate-400">
                      {selectedPO.vendorId}
                    </div>
                  </div>

                  {/* Connecting U-turn symbol */}
                  <div className="flex items-center justify-center relative min-w-[60px] select-none">
                    <div className="hidden md:block absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-slate-200 w-full" />
                    <div className="h-10 w-10 rounded-full border border-slate-200 bg-white flex items-center justify-center shadow-xs text-slate-750 relative z-10">
                      <RotateCcw className="h-4 w-4 text-[#55349A]" strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* Store block */}
                  <div className="bg-[#FAF9F5] border border-slate-200/50 rounded-xl px-5 py-4 text-left flex-1">
                    <div className="text-[10px] font-extrabold text-[#87858E] uppercase tracking-wider mb-1">
                      Destination Store
                    </div>
                    <div className="text-base font-black text-[#1E1C24] uppercase mb-1">
                      {selectedPO.storeName}
                    </div>
                    <div className="text-[11px] font-bold text-slate-400">
                      {selectedPO.storeSubtitle ? selectedPO.storeSubtitle.replace('InvcCatalog/', 'Inv.Catalog:') : 'Inv.Catalog: -'}
                    </div>
                  </div>
                </div>

                {/* Info details badges */}
                <div className="flex flex-wrap gap-3 mt-4">
                  <div className="border border-slate-100 bg-[#FAF9FD] px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs text-slate-500 shadow-2xs w-fit">
                    <span className="text-slate-400 font-bold">Purchase Number:</span>
                    <span className="text-slate-900 font-black">{selectedPO.purchaseNo}</span>
                  </div>
                  <div className="border border-slate-100 bg-[#FAF9FD] px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs text-slate-500 shadow-2xs w-fit">
                    <span className="text-slate-400 font-bold">Bill Number:</span>
                    <span className="text-slate-900 font-black">{selectedPO.billNo}</span>
                  </div>
                  <div className="border border-slate-100 bg-[#FAF9FD] px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs text-slate-500 shadow-2xs w-fit">
                    <span className="text-slate-400 font-bold">Order Date:</span>
                    <span className="text-slate-900 font-black">{selectedPO.date}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* SECTION 3: ITEMS/PRODUCTS DIV WITHOUT INTERNAL SCROLLING */}
          {/* clip-fix: no overflow-hidden — it clips the per-row unit dropdown (bottom-full). rounded+border keep the corners. */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs relative z-10">
            <div className="p-5 border-b border-slate-100 bg-white">
              <h3 className="text-sm font-black text-[#1E1C24] uppercase tracking-wider text-left">Items/Products</h3>
            </div>

            <div className="w-full select-none">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100/80 text-[10px] font-black text-[#8B8993] uppercase tracking-wider">
                    <th className="py-3.5 px-6">ITEM DETAILS</th>
                    <th className="py-3.5 px-6">QUANTITY</th>
                    <th className="py-3.5 px-6">PUR. PRICE (₹)</th>
                    <th className="py-3.5 px-6 text-center">RETURN QTY</th>
                    <th className="py-3.5 px-6 text-center">Return Unit</th>
                    <th className="py-3.5 px-6">REASON</th>
                    <th className="py-3.5 px-6">TAX%</th>
                    <th className="py-3.5 px-6 text-right">REFUND(₹)</th>
                    {isBulkMode && <th className="py-3.5 px-4 text-center">REMOVE</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/75">
                  {activeReturnItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/20 active:bg-slate-50/10">
                      {/* ITEM DETAILS with Thumbnail & batch badge */}
                      <td className="py-4.5 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-11 w-11 rounded-xl object-cover bg-slate-50 border border-slate-100"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex flex-col text-left">
                            <span className="text-[13px] font-black text-[#1E1C24]">{item.name}</span>
                            <span className="text-[11px] text-[#A2A0AA] font-semibold mt-0.5">{item.details}</span>
                            <span className="inline-block self-start mt-2 px-2.5 py-0.5 bg-[#FAF9FC] border border-[#EDEBF1] text-[#55349A] text-[10px] font-extrabold rounded-md uppercase tracking-wider">
                              {item.batch}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* QUANTITY */}
                      <td className="py-4.5 px-6 text-xs font-bold text-[#1E1C24]">
                        <div className="font-black text-[13px]">
                          {item.availableQty} {item.unit || 'box'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5 whitespace-nowrap">
                          ({item.unitDescription || 'box of 100 pieces'})
                        </div>
                      </td>

                      {/* PUR PRICE */}
                      <td className="py-4.5 px-6 text-xs font-extrabold text-slate-800">
                        {item.purPrice.toFixed(2)}
                      </td>

                      {/* RETURN QTY CONTROLLER */}
                      <td className="py-4.5 px-6 text-center">
                        <div className="flex items-center justify-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 shadow-xs mx-auto w-fit">
                          <button
                            type="button"
                            onClick={() => decrementQty(item.id)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 border-r border-slate-200 text-slate-500 font-extrabold cursor-pointer select-none"
                          >
                            -
                          </button>
                          <span className="w-10 text-center font-black text-xs text-[#1E1C24] bg-white py-1.5 select-none">
                            {item.returnQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => incrementQty(item.id)}
                            className="w-8 h-8 flex items-center justify-center bg-[#55349A] hover:bg-[#43277c] text-white font-extrabold cursor-pointer select-none transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* RETURN UNIT */}
                      <td className="py-4.5 px-6 text-center">
                        {/* Expandable Unit Selector */}
                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={() => setOpenUnitDropdownId(openUnitDropdownId === item.id ? null : item.id)}
                            className="inline-flex items-center justify-between gap-1 border border-slate-200/85 rounded-lg py-2 px-3 bg-white hover:bg-[#FAF9FC] hover:border-[#55349A]/40 text-[10px] font-black text-slate-700 shadow-2xs transition-all cursor-pointer select-none min-w-[6.5rem]"
                          >
                            <span className="capitalize">{item.selectedUnit || 'Box of 100'}</span>
                            <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
                          </button>

                          {openUnitDropdownId === item.id && (
                            <>
                              <div className="fixed inset-0 z-45" onClick={() => setOpenUnitDropdownId(null)} />
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-36 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 animate-in fade-in slide-in-from-bottom-1 duration-150">
                                <div className="px-3 py-1.5 text-[8px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100">
                                  Select Unit
                                </div>
                                <div className="max-h-56 overflow-y-auto">
                                  {[
                                    'Pack',
                                    'Box of 100',
                                    'Box of 50',
                                    'Box of 25',
                                    'Box of 20',
                                    'Box of 15',
                                    'Box of 12',
                                    'Strip of 20',
                                    'Strip of 15',
                                    'Strip of 12',
                                    'Strip of 5',
                                    'Strip of 4',
                                    'Strip of 2',
                                    'Numbers'
                                  ].map((unitOption) => (
                                    <button
                                      key={unitOption}
                                      type="button"
                                      onClick={() => {
                                        selectItemUnit(item.id, unitOption);
                                        setOpenUnitDropdownId(null);
                                      }}
                                      className={cn(
                                        "w-full text-left px-3 py-1.5 text-[10px] font-extrabold hover:bg-[#F9F8FA] transition-colors flex items-center justify-between",
                                        (item.selectedUnit || 'Box of 100').toLowerCase() === unitOption.toLowerCase() ? "bg-[#55349A]/5 text-[#55349A]" : "text-slate-600"
                                      )}
                                    >
                                      <span>{unitOption}</span>
                                      {(item.selectedUnit || 'Box of 100').toLowerCase() === unitOption.toLowerCase() && (
                                        <Check className="h-3 w-3 text-[#55349A]" strokeWidth={3} />
                                      )}
                                    </button>
                                  ))}
                                </div>

                                {/* Custom Unit input */}
                                <div className="p-2 border-t border-slate-100 bg-slate-50">
                                  <input
                                    type="text"
                                    placeholder="Add Custom Unit..."
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const val = (e.currentTarget.value || '').trim();
                                        if (val) {
                                          selectItemUnit(item.id, val);
                                          setOpenUnitDropdownId(null);
                                        }
                                      }
                                    }}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-slate-750 focus:outline-none focus:ring-1 focus:ring-[#55349A] focus:border-[#55349A] uppercase placeholder:text-slate-400 placeholder:normal-case"
                                  />
                                  <div className="text-[7px] text-slate-400 font-extrabold mt-1 text-center uppercase tracking-wider">Press Enter to select</div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      {/* REASON */}
                      <td className="py-4.5 px-6">
                        <div className="relative inline-block w-32">
                          <select
                            value={item.reason}
                            onChange={(e) => changeReason(item.id, e.target.value)}
                            className="appearance-none w-full bg-white border border-[#E1DEE4] rounded-lg pl-3 pr-8 py-2 text-xs font-bold text-slate-750 focus:outline-none focus:border-[#55349A] cursor-pointer"
                          >
                            <option value="Damaged">Damaged</option>
                            <option value="Shortage">Shortage</option>
                            <option value="Excess">Excess</option>
                            <option value="Wrong Item">Wrong Item</option>
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                      </td>

                      {/* TAX PERCENT */}
                      <td className="py-4.5 px-6">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-[#1E1C24]">{item.taxPercent.toFixed(2)}%</span>
                          <button type="button" className="text-[10px] text-[#55349A] font-black hover:underline mt-0.5 inline-flex items-center gap-0.5 cursor-pointer">
                            Tax Breakdown <ArrowUpRight className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </td>

                      {/* REFUND */}
                      <td className="py-4.5 px-6 text-right text-xs font-extrabold text-[#1E1C24]">
                        {(item.returnQty * item.purPrice * getUnitMultiplier(item.selectedUnit || 'Box of 100', item.boxSize || 100)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {isBulkMode && (
                        <td className="py-4.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReturnItems(prev => prev.filter(it => it.id !== item.id));
                            }}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {activeReturnItems.length === 0 && (
                    <tr>
                      <td colSpan={isBulkMode ? 9 : 8} className="py-12 px-6 text-center">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                          <div className="h-12 w-12 rounded-full bg-[#EFEBFA] flex items-center justify-center text-[#55349A] mb-4">
                            <Search className="h-5 w-5" />
                          </div>
                          <p className="text-sm font-black text-slate-800">No items added to return</p>
                          <p className="text-[11px] font-semibold text-slate-400 mt-1">
                            Use the search field at the top to search catalog and add products to start executing your bulk purchase return.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: BILL SUMMARY & DETAILS DIV (Replicating the Bill Details card in image.png) */}
          <div className="max-w-[400px] w-full ml-auto relative z-10 self-end">
            <div className="bg-white border border-slate-200/95 rounded-2xl shadow-xs overflow-hidden flex flex-col">

              {/* Card Header matching image.png */}
              <div className="px-5 py-4 border-b border-slate-100 bg-white">
                <h3 className="text-[#1D1B20] font-bold text-[14px] text-left">Bill Details</h3>
              </div>

              {/* Card Body matching image.png */}
              <div className="p-5 flex flex-col">

                {/* Total Quantity Row */}
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-4">
                  <span>Total quantity</span>
                  <span className="text-[#1D1B20] font-black text-sm">{totalReturnQty}</span>
                </div>

                {/* Dotted Divider matching image.png */}
                <div className="border-t border-dashed border-slate-200 my-1" />

                {/* Net Refund Row */}
                <div className="flex items-center justify-between text-xs text-slate-900 font-bold py-4">
                  <span className="text-[#1D1B20] font-black">Net Refund Amount(₹)</span>
                  <span className="text-sm font-black text-[#1D1B20] font-sans">
                    ₹ {netRefundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Stacked Vertical Action Buttons matching image.png */}
                <div className="space-y-3 mt-1">
                  <button
                    type="button"
                    onClick={() => handleConfirmReturn('Draft')}
                    className="w-full py-2.5 bg-[#55349A] hover:bg-[#43277c] text-white rounded-lg text-xs font-black tracking-wider uppercase transition-all shadow-xs cursor-pointer text-center active:scale-98"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="w-full py-2.5 bg-[#319795] hover:bg-[#257371] text-white rounded-lg text-xs font-black tracking-wider uppercase transition-all shadow-xs cursor-pointer text-center active:scale-98"
                  >
                    Confirm Return
                  </button>
                </div>

              </div>

            </div>
          </div>

        </div>

        {/* CONFIRMATION DIALOG MODAL MATCHING image.png */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-3xs transition-all duration-200">
            <div className="bg-white rounded-2xl max-w-[460px] w-full mx-4 shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
                <h2 className="text-[#1D1B20] font-bold text-[15px] text-left">Confirm Purchse Return</h2>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="h-8 w-8 rounded-full border border-slate-200/90 hover:border-slate-300 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
                >
                  <span className="text-lg leading-none font-light text-slate-400">&times;</span>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 flex flex-col">
                <p className="text-[#1D1B20] font-black text-sm text-left mb-1.5">Proceed with this Purchase return?</p>
                <p className="text-xs font-semibold text-slate-400 text-left leading-relaxed mb-6">
                  The selected items will be added back to stock and a sales return will be created.
                </p>

                {/* Actions Row */}
                <div className="flex items-center justify-end gap-3.5">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="px-5 py-2 hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-600 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmReturn('Completed')}
                    className="px-5 py-2 bg-[#55349A] hover:bg-[#43277c] text-white rounded-lg text-xs font-black tracking-wider transition-all cursor-pointer"
                  >
                    Confirm Return
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-white">
      {/* Page Header Bar */}
      <div className="bg-white border-b border-slate-100 py-3.5 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToInventory}
            className="p-1 hover:bg-slate-100 rounded transition-colors group"
          >
            <ArrowLeft className="h-5 w-5 text-slate-900 group-hover:-translate-x-1 transition-transform" />
          </button>
          <h1 className="text-[17px] font-black text-slate-950 tracking-tight leading-tight flex items-center gap-1.5">
            Purchase Returns
          </h1>
        </div>
      </div>

      {/* Main Page Content */}
      <div className="p-6 space-y-6 flex-1 bg-[#F9F8FA]">
        {notification && notification.show && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4.5 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1">
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="text-emerald-500 hover:text-emerald-700 font-extrabold text-sm px-2">×</button>
          </div>
        )}

        <div className="bg-white p-6 rounded-[11px] border border-slate-200/85 shadow-xs">

          {/* Action Bar */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A7A5AF]" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-[#E1DEE4] rounded-xl text-sm font-semibold text-[#1E1C24] focus:ring-2 focus:ring-primary-500/10 focus:border-[#55349A] outline-none transition-all placeholder:text-[#BBB9C4]"
              />
            </div>

            <div className="flex items-center gap-3">
              {/* Filter Button */}
              <div className="relative">
                <button
                  onClick={() => setStatusFilterOpen(!statusFilterOpen)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E1DEE4] rounded-xl text-sm font-black text-[#5C5A64] hover:bg-[#FBFBFC] transition-colors shadow-xs"
                >
                  <Filter className="h-4 w-4 text-[#55349A]" />
                  Filter
                </button>
                {statusFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setStatusFilterOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-2">
                      <button
                        onClick={() => { setSelectedStatus(null); setStatusFilterOpen(false); }}
                        className={cn("w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-between", !selectedStatus ? "text-[#55349A]" : "text-slate-700")}
                      >
                        All Statuses
                        {!selectedStatus && <Check className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => { setSelectedStatus('Completed'); setStatusFilterOpen(false); }}
                        className={cn("w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-between", selectedStatus === 'Completed' ? "text-[#55349A]" : "text-slate-700")}
                      >
                        Completed
                        {selectedStatus === 'Completed' && <Check className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => { setSelectedStatus('Pending'); setStatusFilterOpen(false); }}
                        className={cn("w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-between", selectedStatus === 'Pending' ? "text-[#55349A]" : "text-slate-700")}
                      >
                        Pending
                        {selectedStatus === 'Pending' && <Check className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => { setSelectedStatus('Draft'); setStatusFilterOpen(false); }}
                        className={cn("w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-between", selectedStatus === 'Draft' ? "text-[#55349A]" : "text-slate-700")}
                      >
                        Draft
                        {selectedStatus === 'Draft' && <Check className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Create Purchase Return Button Dropdown */}
              <div className="relative flex items-center shadow-md rounded-xl bg-[#55349A] text-white hover:bg-opacity-95 transition-all select-none">
                <button
                  type="button"
                  onClick={() => { setIsBulkMode(false); setShowCreateReturn(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-black text-white hover:bg-white/10 rounded-l-xl transition-colors cursor-pointer border-r border-white/10"
                >
                  + Create Purchase Return
                </button>
                <button
                  type="button"
                  onClick={() => setCreateDropdownOpen(!createDropdownOpen)}
                  className="px-3 py-2.5 text-white hover:bg-white/10 rounded-r-xl transition-colors cursor-pointer flex items-center justify-center h-full"
                >
                  <ChevronDown className={cn("h-4 w-4 transition-transform", createDropdownOpen ? "rotate-180" : "")} strokeWidth={2.5} />
                </button>

                {createDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setCreateDropdownOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-[#E4E7EC] rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-[#F2F4F7] text-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setIsBulkMode(false);
                          setShowCreateReturn(true);
                          setCreateDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-[#101828] hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer"
                      >
                        <RotateCcw className="h-4 w-4 text-[#55349A]" strokeWidth={2} />
                        Standard Purchase Return
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSelectBulkVendorModal(true);
                          setCreateDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-[#101828] hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer"
                      >
                        <Download className="h-4 w-4 text-[#55349A] rotate-180" strokeWidth={2} />
                        Bulk Purchase Return
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="w-full overflow-x-auto rounded-xl border border-surface-200 shadow-3xs">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-surface-50 border-y border-surface-100 select-none text-surface-400 text-[10.5px] font-bold uppercase tracking-wider">
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">RETURN ID</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">TO</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">FROM</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">INVOICE DETAILS</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">REFUND AMOUNT(₹)</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">
                    <div className="flex items-center gap-1 group cursor-pointer" onClick={() => setStatusFilterOpen(!statusFilterOpen)}>
                      STATUS
                      <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover:text-slate-600 transition-colors" />
                    </div>
                  </th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider text-right pr-8">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {pagedData.map((item) => (
                  <tr key={item.id} className="border-b border-surface-100 px-[22px] py-2.5 text-[12.5px] hover:bg-surface-50 transition-colors">
                    {/* RETURN ID */}
                    <td className="px-[22px] py-2.5 text-left">
                      <div className="flex flex-col text-left">
                        <span className="font-extrabold text-[#1E1C24] text-sm">
                          {item.returnId}
                        </span>
                        <span className="text-[11px] font-semibold text-[#8B8993] mt-0.5">
                          {item.date} • {item.time}
                        </span>
                      </div>
                    </td>

                    {/* TO */}
                    <td className="px-[22px] py-2.5 text-left">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#1A1D1F] flex items-center justify-center shrink-0">
                          {item.to.isLogo ? (
                            <div className="h-4 w-4 border border-teal-500 rounded-full flex items-center justify-center select-none bg-teal-500/10">
                              <span className="text-[7px] font-bold text-teal-400">S</span>
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold text-white uppercase">{item.to.initials}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-extrabold text-[#1E1C24] uppercase leading-none mb-1">{item.to.name}</span>
                          <span className="text-[11px] text-[#8B8993] font-semibold">{item.to.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* FROM */}
                    <td className="px-[22px] py-2.5 text-left">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0">
                          <svg className="w-full h-full" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="40" height="40" rx="8" fill="#FCECEC"/>
                            <path d="M12 18L10 21V28C10 28.5523 10.4477 29 11 29H29C29.5523 29 30 28.5523 30 28V21L28 18M12 18H28M12 18L13.5 14H26.5L28 18" stroke="#D32F2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <rect x="18" y="22" width="4" height="7" rx="1" stroke="#D32F2F" strokeWidth="2"/>
                            <path d="M14 18V22H26V18" stroke="#D32F2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-extrabold text-[#1E1C24] leading-none mb-1">{item.from.name}</span>
                          <span className="text-[11px] text-[#8B8993] font-semibold">{item.from.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* INVOICE DETAILS */}
                    <td className="px-[22px] py-2.5 text-left">
                      <div className="flex flex-col text-left">
                        <span className="font-extrabold text-[#1E1C24] text-sm">
                          {item.invoiceNo}
                        </span>
                        <span className="text-[11px] font-semibold text-[#8B8993] mt-0.5">
                          {item.invoiceDate} • {item.invoiceTime}
                        </span>
                      </div>
                    </td>

                    {/* REFUND AMOUNT */}
                    <td className="px-[22px] py-2.5 text-left">
                      <span className="text-sm font-extrabold text-[#1E1C24]">{item.refundAmount}</span>
                    </td>

                    {/* STATUS */}
                    <td className="px-[22px] py-2.5 text-left">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black uppercase text-[11px] tracking-wide",
                        item.status === 'Completed' && "bg-[#DEF9EC] text-[#1E7D53]",
                        item.status === 'Pending' && "bg-[#FEF1E1] text-[#BD6C15]",
                        item.status === 'Draft' && "bg-[#F3F1F5] text-[#716C7B]",
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full select-none",
                          item.status === 'Completed' && "bg-[#1E7D53]",
                          item.status === 'Pending' && "bg-[#BD6C15]",
                          item.status === 'Draft' && "bg-[#716C7B]",
                        )} />
                        {item.status}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-[22px] py-2.5 pr-8 relative text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewDetailsItem(item)}
                          className="px-4 py-1.5 border border-slate-200/80 rounded-lg text-xs font-black text-[#55349A] hover:bg-[#FBFBFC] transition-colors shadow-xs hover:border-[#55349A]"
                        >
                          View Details
                        </button>

                        <div className="relative">
                          <button
                            onClick={() => setActiveActionsId(activeActionsId === item.id ? null : item.id)}
                            className={cn(
                              "p-2 border border-slate-200/80 rounded-lg text-slate-400 hover:text-slate-900 transition-all shadow-xs",
                              activeActionsId === item.id && "bg-slate-100 text-slate-950 border-slate-400"
                            )}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>

                          {activeActionsId === item.id && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setActiveActionsId(null)} />
                              <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200/80 rounded-xl shadow-xl z-30 py-1.5 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                                <button
                                  onClick={() => { setActiveActionsId(null); setViewDetailsItem(item); }}
                                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5"
                                >
                                  <FileText className="h-4 w-4 text-slate-400" />
                                  View Details
                                </button>
                                <button className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5">
                                  <Edit2 className="h-4 w-4 text-slate-400" />
                                  Edit Return
                                </button>
                                <div className="h-px bg-slate-100/80 my-1" />
                                <button className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5">
                                  <Download className="h-4 w-4 text-slate-400" />
                                  Download PDF
                                </button>
                                <button className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5">
                                  <Share2 className="h-4 w-4 text-slate-400" />
                                  Share Return
                                </button>
                                <button className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5">
                                  <Printer className="h-4 w-4 text-slate-400" />
                                  Print Slip
                                </button>
                                <div className="h-px bg-slate-100/80 my-1" />
                                <button className="w-full text-left px-4 py-2.5 text-xs font-black text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2.5">
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                  Delete Record
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

          {/* Pagination Footer */}
          <TablePagination
            total={filteredData.length}
            page={returnPage}
            pageSize={RETURN_PAGE_SIZE}
            onPageChange={setReturnPage}
            noun="purchase returns"
          />

        </div>
      </div>

      {/* Collect Payment Modal/Popup */}
      <AnimatePresence>
        {collectPaymentOpen && paymentReturnItem && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop wrapper */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCollectPaymentOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            {/* Modal Content Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-white rounded-[26px] shadow-2xl w-full max-w-[540px] overflow-hidden relative z-20 flex flex-col p-8 md:p-9"
            >
              {/* Header Box mirroring image.png */}
              <div className="flex items-center justify-between mb-8 text-left">
                <h2 className="text-[22px] font-black text-[#1D1B20] tracking-tight leading-none">
                  Payable Amount : ₹{payableAmount.toLocaleString('en-IN')}
                </h2>
                <button
                  type="button"
                  onClick={() => setCollectPaymentOpen(false)}
                  className="h-10 w-10 border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" strokeWidth={2.5} />
                </button>
              </div>

              {/* Form elements from image.png */}
              <div className="space-y-6 text-left">

                {/* Amount To Pay Now */}
                <div>
                  <label className="block text-[14px] font-bold text-[#4B5563] mb-2 text-left">
                    Amount To Pay Now (₹)
                  </label>
                  <input
                    type="number"
                    value={paymentAmountNow}
                    onChange={(e) => setPaymentAmountNow(e.target.value)}
                    className="w-full px-4.5 py-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-base font-semibold text-[#1D1B20] outline-none focus:ring-2 focus:ring-[#55349A]/15 focus:border-[#55349A] transition-all"
                    placeholder="Enter amount"
                  />
                </div>

                {/* Payment Date with Calendar icon on right */}
                <div>
                  <label className="block text-[14px] font-bold text-[#4B5563] mb-2 text-left">
                    Payment Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full pl-4.5 pr-12 py-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-base font-semibold text-[#1D1B20] outline-none focus:ring-2 focus:ring-[#55349A]/15 focus:border-[#55349A] transition-all cursor-pointer"
                    />
                    <div className="absolute right-4.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Calendar className="h-5 w-5 text-[#55349A]" />
                    </div>
                  </div>
                </div>

                {/* Payment Mode drop-down with Chevron icon on right */}
                <div>
                  <label className="block text-[14px] font-bold text-[#4B5563] mb-2 text-left">
                    Payment Mode
                  </label>
                  <div className="relative">
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full pl-4.5 pr-12 py-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-base font-bold text-slate-500 outline-none focus:ring-2 focus:ring-[#55349A]/15 focus:border-[#55349A] transition-all cursor-pointer appearance-none"
                    >
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Net Banking">Net Banking</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Card">Card</option>
                    </select>
                    <div className="absolute right-4.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Leave a Payment Note */}
                <div>
                  <label className="block text-[14px] font-bold text-[#4B5563] mb-2 text-left">
                    Leave a Payment Note
                  </label>
                  <textarea
                    rows={3}
                    placeholder=""
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full px-4.5 py-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-base font-semibold text-[#1D1B20] outline-none focus:ring-2 focus:ring-[#55349A]/15 focus:border-[#55349A] transition-all resize-none"
                  />
                </div>

                {/* Mark Invoice as Settled Switch Container Box and Warn styling from image.png */}
                <div className="bg-[#FAF9FC] border border-[#F3EFFB] rounded-2xl p-4.5 flex items-start gap-4">
                  {/* Purple Switch Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setMarkAsSettled(!markAsSettled)}
                    className={cn(
                      "w-12 h-[26px] rounded-full p-0.5 transition-colors duration-200 focus:outline-none shrink-0 relative mt-1 cursor-pointer select-none",
                      markAsSettled ? "bg-[#55349A]" : "bg-slate-300"
                    )}
                  >
                    <span className={cn(
                      "block w-5.5 h-5.5 rounded-full bg-white transition-all shadow-md",
                      markAsSettled ? "translate-x-5.5" : "translate-x-0"
                    )} />
                  </button>

                  {/* Toggle note description text */}
                  <div className="flex-1 text-left">
                    <span className="text-[14px] font-black text-[#1D1B20] block">Mark Invoice as Settled</span>
                    <span className="text-[11px] text-[#7E828F] font-bold leading-normal mt-1 block">
                      Review invoice details carefully, as settled invoices cannot be edited or reversed.
                    </span>
                  </div>
                </div>

              </div>

              {/* Footer Actions matching cancel and pay look of image.png */}
              <div className="flex justify-end gap-3.5 mt-8 shrink-0">
                <button
                  type="button"
                  onClick={() => setCollectPaymentOpen(false)}
                  className="px-8 py-3 bg-white border border-slate-200 hover:bg-slate-50/80 active:bg-slate-100 text-[#4F5B76] rounded-xl text-base font-black transition-colors cursor-pointer min-w-[120px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCollectPayment}
                  className="px-10 py-3 bg-[#55349A] hover:bg-[#43277c] active:bg-[#341d61] text-white rounded-xl text-base font-black transition-all shadow-md hover:shadow-lg active:scale-98 cursor-pointer min-w-[120px]"
                >
                  Pay
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Select Purchase Order Modal to choose PO for return */}
      <AnimatePresence>
        {showSelectPOModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSelectPOModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[24px] shadow-2xl w-full max-w-[620px] overflow-hidden relative z-20 flex flex-col p-7 md:p-8"
            >
              {/* Header */}
              <div className="flex items-start justify-between text-left pr-10">
                <div>
                  <h2 className="text-[20px] font-black text-[#1E1C24] tracking-tight leading-tight">
                    Select Purchase Order
                  </h2>
                  <p className="text-xs font-semibold text-slate-400 mt-1 leading-normal">
                    Choose a Purchase to process return
                  </p>
                </div>

                {/* Circular Close Button with custom styling */}
                <button
                  type="button"
                  onClick={() => setShowSelectPOModal(false)}
                  className="absolute top-7 right-7 h-9 w-9 bg-[#F1EFF7] hover:bg-[#E9E4F5] text-slate-400 hover:text-[#55349A] rounded-full flex items-center justify-center transition-colors cursor-pointer border border-slate-100/50"
                >
                  <X className="h-4 w-4" strokeWidth={3} />
                </button>
              </div>

              {/* Horizontal Divider Line */}
              <div className="border-b border-slate-100 my-5 -mx-8" />

              {/* Input field wrapper */}
              <div className="w-full text-left">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by Purchase Id, Store Name or Vendor Name"
                    value={selectPOSearchQuery}
                    onChange={(e) => setSelectPOSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-5 py-4 bg-white border-2 border-[#55349A] rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400/80 outline-none transition-all shadow-[0_0_12px_rgba(85,52,154,0.04)]"
                    autoFocus
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#55349A]" />
                </div>

                {/* Filtered Items List */}
                {(() => {
                  const query = selectPOSearchQuery.trim().toLowerCase();
                  const filtered = purchaseOrders.filter(po => {
                    return (
                      po.purchaseNo.toLowerCase().includes(query) ||
                      po.storeName.toLowerCase().includes(query) ||
                      po.vendorName.toLowerCase().includes(query) ||
                      (po.billNo && po.billNo.toLowerCase().includes(query))
                    );
                  });

                  if (filtered.length > 0) {
                    return (
                      <div className="mt-5 max-h-[280px] overflow-y-auto divide-y divide-slate-100/80 pr-1 select-none">
                        {filtered.map((po) => (
                          <button
                            key={po.purchaseNo}
                            type="button"
                            onClick={() => {
                              handleSelectPO(po);
                              setShowCreateReturn(true);
                              setShowSelectPOModal(false);
                              setSelectPOSearchQuery('');
                            }}
                            className="w-full text-left py-3.5 px-4 rounded-xl hover:bg-[#FAF9FD] transition-all flex items-center justify-between group mt-1"
                          >
                            <div className="flex flex-col gap-1 text-left">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900 group-hover:text-[#55349A] transition-colors">
                                  Purchase {po.purchaseNo}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 bg-slate-100 rounded-md">
                                  {po.storeName}
                                </span>
                              </div>
                              <div className="flex gap-2 text-[10px] font-semibold text-slate-400">
                                <span>Bill: <span className="text-slate-650">{po.billNo}</span></span>
                                <span>•</span>
                                <span>Date: <span className="text-slate-650">{po.date}</span></span>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className="text-[11px] font-extrabold text-[#55349A] bg-[#FAF1FD] px-3 py-1.5 rounded-lg border border-[#EFEBFA] group-hover:bg-[#55349A] group-hover:text-white transition-all shadow-2xs">
                                {po.vendorName}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    );
                  } else {
                    return (
                      <div className="mt-5 py-8 text-center text-slate-400 text-xs font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        No matching purchase orders found
                      </div>
                    );
                  }
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Select Vendor for Bulk Purchase Return */}
      <AnimatePresence>
        {showSelectBulkVendorModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSelectBulkVendorModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[24px] shadow-2xl w-full max-w-[460px] overflow-hidden relative z-20 flex flex-col p-7 md:p-8"
            >
              {/* Header */}
              <div className="flex items-start justify-between text-left pr-10">
                <div>
                  <h2 className="text-[20px] font-black text-[#1E1C24] tracking-tight leading-tight flex items-center gap-2">
                    <Store className="h-5 w-5 text-[#55349A]" />
                    Select Vendor for Bulk Return
                  </h2>
                  <p className="text-xs font-semibold text-slate-400 mt-1 leading-normal">
                    Select a supplier to initiate your bulk items purchase return.
                  </p>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setShowSelectBulkVendorModal(false)}
                  className="absolute top-7 right-7 h-9 w-9 bg-[#F1EFF7] hover:bg-[#E9E4F5] text-slate-400 hover:text-[#55349A] rounded-full flex items-center justify-center transition-colors cursor-pointer border border-slate-100/50"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" strokeWidth={3} />
                </button>
              </div>

              {/* Horizontal Divider Line */}
              <div className="border-b border-slate-100 my-5 -mx-8" />

              {/* Vendors List */}
              <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto select-none mt-1 pr-1 text-left">
                {Array.from(new Set(purchaseOrders.map(po => po.vendorName))).map((vendorName) => {
                  const count = purchaseOrders.filter(po => po.vendorName === vendorName).length;
                  const initials = vendorName.substring(0, 2).toUpperCase();
                  const avatarColor = vendorName.includes('SIMRAN') ? 'bg-[#1E1C24] text-[#E5C384]' : 'bg-[#EFECF8] text-[#55349A]';
                  return (
                    <button
                      key={vendorName}
                      type="button"
                      onClick={() => {
                        setSelectedBulkVendor(vendorName);
                        setIsBulkMode(true);
                        setActiveReturnItems([]);
                        setPoSearchQuery('');
                        setShowCreateReturn(true);
                        setShowSelectBulkVendorModal(false);
                      }}
                      className="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-[#FAF9FD] transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 select-none", avatarColor)}>
                          {initials}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-black text-slate-900 group-hover:text-[#55349A] transition-colors leading-tight">
                            {vendorName}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 mt-1">
                            {count} associated purchase order{count > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-[10px] font-black uppercase text-[#55349A] bg-[#55349A]/5 group-hover:bg-[#55349A] group-hover:text-white px-2.5 py-1.5 rounded-lg border border-[#55349A]/10 group-hover:border-transparent transition-all">
                          Select
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Select Bulk Return Modal */}
      <AnimatePresence>
        {showBulkReturnModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (bulkProgress === null || bulkProgress === 100) {
                  setShowBulkReturnModal(false);
                  setBulkFileName(null);
                  setBulkProgress(null);
                  setBulkValidationStage('');
                }
              }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[24px] shadow-2xl w-full max-w-[580px] overflow-hidden relative z-20 flex flex-col p-7 md:p-8 text-left"
            >
              {/* Header */}
              <div className="flex items-start justify-between text-left pr-10 mb-4">
                <div>
                  <h2 className="text-[18px] font-black text-[#1E1C24] tracking-tight leading-tight flex items-center gap-2">
                    <Download className="h-5 w-5 text-[#55349A] rotate-180" />
                    Bulk Purchase Return
                  </h2>
                  <p className="text-xs font-semibold text-slate-400 mt-1 leading-normal">
                    Import multiple purchase return records using a standardized CSV/Excel worksheet template.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowBulkReturnModal(false);
                    setBulkFileName(null);
                    setBulkProgress(null);
                    setBulkValidationStage('');
                  }}
                  className="absolute top-7 right-7 h-9 w-9 bg-[#F1EFF7] hover:bg-[#E9E4F5] text-slate-400 hover:text-[#55349A] rounded-full flex items-center justify-center transition-colors cursor-pointer border border-slate-100/50"
                >
                  <X className="h-4 w-4" strokeWidth={3} />
                </button>
              </div>

              {/* Drag n Drop and simulation */}
              {!bulkFileName ? (
                <div className="space-y-4">
                  {/* Download Template Strip */}
                  <div className="bg-[#FAF9FC] border border-[#EFEBFA] rounded-xl p-4.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-[#EFEBFA] rounded-lg flex items-center justify-center text-[#55349A]">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-extrabold text-[#1E1C24]">Need the Excel / CSV Template?</p>
                        <p className="text-[10px] font-semibold text-slate-400">Download formatted headers to ensure smooth mapping.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert("Downloading formatted template: purchase_returns_template.csv...")}
                      className="px-3.5 py-1.5 bg-white border border-[#E1DEE4] rounded-lg text-xs font-black text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      Download
                    </button>
                  </div>

                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setBulkDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setBulkDragActive(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setBulkDragActive(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        startBulkImportSimulation(file.name);
                      }
                    }}
                    className={cn(
                      "border-2 border-dashed rounded-3xl p-10 text-center flex flex-col items-center justify-center cursor-pointer transition-all animate-in fade-in zoom-in-95",
                      bulkDragActive
                        ? "border-[#55349A] bg-[#55349A]/5 scale-99"
                        : "border-[#E1DEE4] hover:border-[#55349A]/50 hover:bg-slate-50/50"
                    )}
                    onClick={() => document.getElementById("bulk-return-file-input")?.click()}
                  >
                    <input
                      id="bulk-return-file-input"
                      type="file"
                      accept=".csv,.xlsx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          startBulkImportSimulation(file.name);
                        }
                      }}
                    />
                    <div className="h-14 w-14 rounded-full bg-[#FAF9FC] flex items-center justify-center text-[#9c9aa6] border border-slate-100 mb-4 transition-transform">
                      <Download className="h-6 w-6 text-[#55349A]/80 rotate-180" />
                    </div>
                    <p className="text-sm font-black text-slate-800">
                      Drag & Drop your returns list here
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400 mt-1">
                      Supports .csv or .xlsx up to 10MB
                    </p>
                    <div className="mt-4 px-4 py-1.5 bg-[#FAF9FC] border border-slate-200/90 rounded-lg text-[10px] font-bold text-slate-500 hover:text-[#55349A] transition-colors">
                      Browse Files
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 animate-in fade-in duration-300">
                  {/* File Info Card */}
                  <div className="border border-slate-200 rounded-2xl p-4.5 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-[#EFEBFA] rounded-xl flex items-center justify-center text-[#55349A] font-black text-xs">
                        CSV
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-extrabold text-[#1E1C24] truncate max-w-[280px]">
                          {bulkFileName}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400">
                          3 total rows detected
                        </p>
                      </div>
                    </div>
                    {bulkProgress === 100 && (
                      <button
                        type="button"
                        onClick={() => {
                          setBulkFileName(null);
                          setBulkProgress(null);
                          setBulkValidationStage('');
                        }}
                        className="text-slate-400 hover:text-slate-600 font-extrabold text-xs px-2.5 py-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                      >
                        Reset File
                      </button>
                    )}
                  </div>

                  {/* Loader Simulation status */}
                  <div className="space-y-2 bg-[#FBFBFC] border border-slate-150 p-5 rounded-2xl text-left">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-700">Validation & Parsing</span>
                      <span className="font-black text-[#55349A]">{bulkProgress}%</span>
                    </div>
                    {/* Progress Bar Container */}
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${bulkProgress}%` }}
                        transition={{ ease: "easeInOut", duration: 0.3 }}
                        className="h-full bg-[#55349A] rounded-full"
                      />
                    </div>
                    <p className="text-[10px] font-semibold text-slate-400 italic animate-pulse mt-1">
                      {bulkValidationStage}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowBulkReturnModal(false);
                        setBulkFileName(null);
                        setBulkProgress(null);
                        setBulkValidationStage('');
                      }}
                      className="px-5 py-2.5 bg-white border border-[#E1DEE4] rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 active:scale-98 transition-all cursor-pointer shadow-2xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={bulkProgress !== 100}
                      onClick={handleProcessBulkImport}
                      className={cn(
                        "px-6 py-2.5 rounded-xl text-xs font-black text-white transition-all shadow-md active:scale-98 cursor-pointer flex items-center gap-1.5",
                        bulkProgress === 100
                          ? "bg-[#55349A] hover:bg-[#43277c]"
                          : "bg-slate-300 cursor-not-allowed shadow-none"
                      )}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      Import Bulk Returns (3 rows)
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
