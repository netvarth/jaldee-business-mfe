import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Search, MoreHorizontal,
  ArrowDown, ChevronDown, Filter, ChevronLeft, ChevronRight,
  Store, Check, ShoppingCart, Edit2, CheckCircle2, RotateCcw,
  Download, Share2, Printer, XCircle, Upload, X, FileText, CheckSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import { TablePagination } from './TablePagination';

const PURCHASE_PAGE_SIZE = 10;
import { CreatePurchase } from './CreatePurchase';
import { PurchaseDetails } from './PurchaseDetails';
import { usePurchases, useCreatePurchase, useUpdatePurchaseStatus, useApprovePurchase, useCancelPurchase } from '../../../services/usePurchases';

export interface PurchaseItem {
  id: string;
  orderNo: string;
  date: string;
  time: string;
  from: { name: string; id: string; color: string; initials: string };
  to: { name: string; id: string; type: 'store' };
  status: 'Draft' | 'In Review' | 'Approved' | 'Cancelled' | 'Requested';
  qty: number;
  purchaseNo?: string;
  billNo?: string;
  catalog?: string;
  note?: string;
}

// Maps the CreatePurchase form payload to the backend PurchaseDto contract.
// Backend fields: orderNo, billNo, billDate, purchaseDate (OffsetDateTime), vendorUid,
// toStoreUid (required), catalogUid, supplyType, status, items[], note.
// Money (discount/tax/net/totals) is NOT sent — the server recomputes it from the raw
// inputs below via PurchaseLineCalculator, so the browser can't be wrong about amounts.
function buildPurchaseApiPayload(data: any, status: string) {
  const parsed = data.date ? new Date(data.date) : null;
  const purchaseDate = parsed && !isNaN(parsed.getTime())
    ? parsed.toISOString()
    : new Date().toISOString();
  const isUuid = (v: any) => v && String(v).length === 36;
  // Accepts dd-mm-yyyy (the form's display format) or anything Date can parse; → yyyy-mm-dd.
  const toIsoDate = (v: any): string | undefined => {
    if (!v) return undefined;
    const m = String(v).match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
    if (m) {
      const yr = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${yr}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
  };
  const num = (v: any) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  return {
    orderNo: data.purchaseNo || String(Date.now()),
    billNo: data.billNo || undefined,
    billDate: toIsoDate(data.billDate),
    purchaseDate,
    vendorUid: data.vendor || undefined,
    toStoreUid: data.store || undefined,
    catalogUid: isUuid(data.catalog) ? data.catalog : undefined,
    // INTRA_STATE → CGST+SGST, INTER_STATE → IGST. Defaults intra-state.
    supplyType: data.supplyType || 'INTRA_STATE',
    status,
    items: (data.items || []).map((i: any) => {
      const enteredQty = num(i.qty);
      const price = num(i.purchasePrice ?? i.price);
      return {
        itemUid: i.id,
        // Backend contract: qty (int) + purchQty (fractional, in the
        // purchase unit) + unitUid → converted to base stock on receive.
        qty: Math.round(enteredQty),
        purchQty: enteredQty,
        unitUid: isUuid(i.unit) ? i.unit : null,
        unitPrice: price,
        // Raw inputs the server prices from — previously dropped, so free stock and
        // discounts silently vanished from every purchase.
        freeQty: num(i.freeQty),
        fixedDiscount: num(i.discount),
        mrp: i.mrp != null && i.mrp !== '' ? num(i.mrp) : undefined,
        batchNumber: i.batch || undefined,
        expiryDate: toIsoDate(i.expDate),
        // Tax rows chosen for the line (finance uids). Empty when the tenant has no tax set up.
        taxUids: Array.isArray(i.taxUids) && i.taxUids.length ? i.taxUids : undefined,
      };
    }),
    note: data.note,
  };
}

export const PurchasesTable = ({
  hideHeader = false,
  onSubScreenChange,
}: { hideHeader?: boolean; onSubScreenChange?: (active: boolean) => void } = {}) => {
  const { data: backendPurchases } = usePurchases();
  const createPurchaseMutation = useCreatePurchase();
  const updateStatusMutation = useUpdatePurchaseStatus();
  const approvePurchaseMutation = useApprovePurchase();
  const cancelPurchaseMutation = useCancelPurchase();
  const [purchaseList, setPurchaseList] = useState<PurchaseItem[]>([]);

  React.useEffect(() => {
    if (backendPurchases) {
      setPurchaseList(backendPurchases);
    }
  }, [backendPurchases]);

  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [statusSearchQuery, setStatusSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createRequestMode, setCreateRequestMode] = useState(false);
  const [viewPurchase, setViewPurchase] = useState<PurchaseItem | null>(null);
  const [activeActionsId, setActiveActionsId] = useState<string | null>(null);
  const [conversionSource, setConversionSource] = useState<PurchaseItem | null>(null);
  const [selectedType, setSelectedType] = useState('All Purchases');
  const [isViewOnlyRequest, setIsViewOnlyRequest] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);

  // Import flow states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importingProgress, setImportingProgress] = useState<number | null>(null);
  const [validationStage, setValidationStage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [importedFile, setImportedFile] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tells the workspace to drop its tab header while a full-screen sub-view is up.
  useEffect(() => {
    onSubScreenChange?.(showCreate || !!viewPurchase);
  }, [showCreate, viewPurchase, onSubScreenChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportedFile(file.name);
      startImportSimulation();
    }
  };

  const startImportSimulation = () => {
    setImportingProgress(10);
    setValidationStage('Reading document columns...');

    setTimeout(() => {
      setImportingProgress(45);
      setValidationStage('Validating vendor register keys & item codes...');
    }, 600);

    setTimeout(() => {
      setImportingProgress(80);
      setValidationStage('Writing purchase contracts...');
    }, 1200);

    setTimeout(() => {
      setImportingProgress(100);
      setValidationStage('Purchases imported successfully!');
      setToastMessage('Purchase import completed. Refreshing backend purchases.');
      setTimeout(() => {
        setShowImportModal(false);
        setImportingProgress(null);
        setImportedFile(null);
        setToastMessage(null);
      }, 1500);
    }, 1800);
  };

  const handleStatusChange = (id: string, newStatus: 'Draft' | 'In Review' | 'Approved' | 'Cancelled') => {
    if (newStatus === 'Approved') {
      approvePurchaseMutation.mutate(id);
    } else if (newStatus === 'Cancelled') {
      cancelPurchaseMutation.mutate(id);
    } else {
      updateStatusMutation.mutate({ uid: id, status: newStatus === 'In Review' ? 'IN_REVIEW' : newStatus.toUpperCase() });
    }

    setPurchaseList(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    if (viewPurchase && viewPurchase.id === id) {
      setViewPurchase(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const toggleAll = () => {
    if (selectedItems.length === filteredData.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredData.map(item => item.id));
    }
  };

  const toggleItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };


  const STATUS_OPTIONS = ['Draft', 'In Review', 'Approved', 'Cancelled', 'Requested'];
  const filteredStatusList = STATUS_OPTIONS.filter(status =>
    status.toLowerCase().includes(statusSearchQuery.toLowerCase())
  );

  const filteredData = purchaseList.filter(item => {
    // Main filter from "All Purchases" dropdown
    if (selectedType !== 'All Purchases' && item.status !== selectedType) return false;

    // Status column quick filter
    if (selectedStatus && item.status !== selectedStatus) return false;

    return true;
  });

  const [purchasePage, setPurchasePage] = useState(1);
  React.useEffect(() => { setPurchasePage(1); }, [selectedType, selectedStatus, purchaseList.length]);
  const pagedData = filteredData.slice(
    (purchasePage - 1) * PURCHASE_PAGE_SIZE,
    purchasePage * PURCHASE_PAGE_SIZE
  );

  if (showCreate) {
    return (
      <CreatePurchase
        initialRequestMode={createRequestMode}
        conversionSource={conversionSource}
        initialReadOnly={isViewOnlyRequest}
        onBack={() => {
          setShowCreate(false);
          setCreateRequestMode(false);
          setConversionSource(null);
          setIsViewOnlyRequest(false);
        }}
        onCreate={(data) => {
          console.log('New Purchase:', data);
          const freshPurchase: PurchaseItem = {
            id: String(Date.now()),
            orderNo: data.purchaseNo || String(Date.now()),
            date: data.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            from: {
              name: data.vendorName || 'Unknown Vendor',
              id: data.vendor ? `#${String(data.vendor).slice(0, 6)}` : '#-',
              color: 'bg-[#FDF2E9]',
              initials: (data.vendorName || 'UV').substring(0, 2).toUpperCase()
            },
            to: {
              name: data.storeName || 'Unknown Store',
              id: data.store ? `#${String(data.store).slice(0, 6)}` : '#-',
              type: 'store'
            },
            status: data.isRequest ? 'In Review' : 'Draft',
            qty: data.items?.length || 0,
            purchaseNo: data.purchaseNo,
            billNo: data.billNo,
            catalog: data.catalog,
            note: data.note
          };

          const tempId = freshPurchase.id;
          createPurchaseMutation.mutate(
            buildPurchaseApiPayload(data, data.isRequest ? 'IN_REVIEW' : 'DRAFT'),
            {
              // F9/F10: adopt the server-assigned uid + purchaseNo so the detail fetches by UUID
              // (not the temp Date.now() id) and the list shows PUR-#### instead of an epoch number.
              onSuccess: (created: any) => {
                const realUid = created?.uid || created?.id;
                const realNo = created?.purchaseNo || created?.orderNo;
                if (!realUid) return;
                setPurchaseList(prev => prev.map(p => p.id === tempId
                  ? { ...p, id: realUid, orderNo: realNo || p.orderNo, purchaseNo: realNo || p.purchaseNo } : p));
                setViewPurchase(prev => (prev && prev.id === tempId)
                  ? { ...prev, id: realUid, orderNo: realNo || prev.orderNo, purchaseNo: realNo || prev.purchaseNo } : prev);
              },
            }
          );

          if (conversionSource) {
            setPurchaseList(prev => prev.map(p => p.id === conversionSource.id ? { ...p, status: 'Approved' } : p));
          }
          setPurchaseList(prev => [freshPurchase, ...prev]);
          setShowCreate(false);
          setCreateRequestMode(false);
          setConversionSource(null);
          setIsViewOnlyRequest(false);
          setViewPurchase(freshPurchase);
        }}
        onSend={(data) => {
          console.log('Sent Purchase:', data);
          const freshPurchase: PurchaseItem = {
            id: String(Date.now()),
            orderNo: data.purchaseNo || String(Date.now()),
            date: data.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            from: {
              name: data.vendorName || 'Unknown Vendor',
              id: data.vendor ? `#${String(data.vendor).slice(0, 6)}` : '#-',
              color: 'bg-[#FDF2E9]',
              initials: (data.vendorName || 'UV').substring(0, 2).toUpperCase()
            },
            to: {
              name: data.storeName || 'Unknown Store',
              id: data.store ? `#${String(data.store).slice(0, 6)}` : '#-',
              type: 'store'
            },
            status: 'In Review',
            qty: data.items?.length || 0,
            purchaseNo: data.purchaseNo,
            billNo: data.billNo,
            catalog: data.catalog,
            note: data.note
          };

          const tempId = freshPurchase.id;
          createPurchaseMutation.mutate(
            buildPurchaseApiPayload(data, 'IN_REVIEW'),
            {
              onSuccess: (created: any) => {
                const realUid = created?.uid || created?.id;
                const realNo = created?.purchaseNo || created?.orderNo;
                if (!realUid) return;
                setPurchaseList(prev => prev.map(p => p.id === tempId
                  ? { ...p, id: realUid, orderNo: realNo || p.orderNo, purchaseNo: realNo || p.purchaseNo } : p));
                setViewPurchase(prev => (prev && prev.id === tempId)
                  ? { ...prev, id: realUid, orderNo: realNo || prev.orderNo, purchaseNo: realNo || prev.purchaseNo } : prev);
              },
            }
          );

          if (conversionSource) {
            setPurchaseList(prev => prev.map(p => p.id === conversionSource.id ? { ...p, status: 'Approved' } : p));
          }
          setPurchaseList(prev => [freshPurchase, ...prev]);
          setShowCreate(false);
          setCreateRequestMode(false);
          setConversionSource(null);
          setIsViewOnlyRequest(false);
          setViewPurchase(freshPurchase);
        }}
      />
    );
  }

  if (viewPurchase) {
    return (
      <PurchaseDetails
        purchase={viewPurchase}
        onBack={() => setViewPurchase(null)}
        onStatusChange={(status) => handleStatusChange(viewPurchase.id, status)}
        onConvertToPO={(sourceItem) => {
          setViewPurchase(null);
          setConversionSource(sourceItem);
          setCreateRequestMode(false);
          setShowCreate(true);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-white">
      {/* Page Header Bar */}
      {!hideHeader && (
      <div className="bg-white border-b border-surface-100 py-3.5 px-8 flex items-center shrink-0">
        <div className="flex items-center gap-4">
          <button className="p-1 hover:bg-surface-100 rounded transition-colors">
            <ArrowLeft className="h-5 w-5 text-surface-900" />
          </button>
          <h1 className="text-lg font-bold text-surface-900 tracking-tight text-[#1A1D1F]">Purchases</h1>
        </div>
      </div>
      )}

      {/* Main Page Content */}
      <div className="p-6 space-y-6 flex-1">
        <div className="bg-white p-6 rounded-2xl border border-surface-200">
          <div className="flex items-center justify-between gap-4 mb-6 animate-in fade-in duration-300">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-11 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
              />
            </div>

             <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedType('All Purchases');
                  setSelectedStatus(null);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-bold text-surface-900 hover:bg-surface-50 transition-colors shadow-sm"
              >
                <Filter className="h-4 w-4 text-primary-600" />
                Reset Filter
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#FAF9F6] border border-surface-200 hover:border-[#55349A]/50 hover:bg-violet-50/50 rounded-xl text-sm font-bold text-[#55349A] transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-95 duration-150"
              >
                <Upload className="h-4 w-4 text-[#55349A] stroke-[2.5]" />
                <span>Import</span>
              </button>
              <div className="relative">
                <button
                  onClick={() => setCreateDropdownOpen(!createDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#55349A] text-white rounded-xl text-sm font-bold hover:bg-[#462885] transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <span>Create</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", createDropdownOpen ? "rotate-180" : "")} strokeWidth={2.5} />
                </button>

                {createDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setCreateDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E4E7EC] rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-[#F2F4F7]">
                      <button
                        type="button"
                        onClick={() => {
                          setCreateRequestMode(false);
                          setShowCreate(true);
                          setCreateDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-xs font-semibold text-[#101828] hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer"
                      >
                        <ShoppingCart className="h-4 w-4 text-[#667085]" strokeWidth={2} />
                        Create New Purchase
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCreateRequestMode(true);
                          setShowCreate(true);
                          setCreateDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-xs font-semibold text-[#101828] hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer"
                      >
                        <Store className="h-4 w-4 text-[#667085]" strokeWidth={2} />
                        Create Purchase Request
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="-mx-6 border-t border-surface-100 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-surface-50/50 border-b border-surface-100">
                  <th className="py-4 px-6 w-12 text-center items-center justify-center flex">
                     <input
                      type="checkbox"
                      checked={selectedItems.length === filteredData.length && filteredData.length > 0}
                      onChange={toggleAll}
                      className="appearance-none h-5 w-5 min-w-[20px] min-h-[20px] ml-[18px] pl-0 rounded-[4px] border border-surface-300 bg-white checked:bg-primary-600 checked:border-primary-600 checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-primary-500/20 outline-none"
                     />
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-surface-500 uppercase tracking-wider">PURCHASE NUMBER & DATE</th>
                  <th className="py-4 px-6 text-xs font-bold text-surface-500 uppercase tracking-wider">FROM</th>
                  <th className="py-4 px-6 text-xs font-bold text-surface-500 uppercase tracking-wider">TO</th>
                  <th className="py-4 px-6 text-xs font-bold text-surface-500 uppercase tracking-wider">
                    <div className="relative inline-flex items-center gap-1 group cursor-pointer" onClick={() => setStatusFilterOpen(!statusFilterOpen)}>
                      STATUS
                      <ArrowDown className={cn("h-3 w-3 text-surface-300 transition-colors group-hover:text-surface-700", statusFilterOpen && "text-primary-600")} />

                      {statusFilterOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setStatusFilterOpen(false); }} />
                          <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-surface-200 rounded-xl shadow-xl z-20 py-2 normal-case tracking-normal font-medium">
                            <div className="px-3 pb-2 mb-2 border-b border-surface-100">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                                <input
                                  type="text"
                                  placeholder="Search status..."
                                  value={statusSearchQuery}
                                  onChange={(e) => setStatusSearchQuery(e.target.value)}
                                  className="w-full pl-7 pr-3 py-1.5 bg-surface-50 border border-surface-100 rounded-lg text-xs outline-none focus:border-primary-500"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                            <button
                              className={cn(
                                "w-full text-left px-4 py-2 text-xs hover:bg-surface-50 transition-colors flex items-center justify-between",
                                !selectedStatus ? "text-primary-600 bg-primary-50/50" : "text-surface-700"
                              )}
                              onClick={(e) => { e.stopPropagation(); setSelectedStatus(null); setStatusFilterOpen(false); setStatusSearchQuery(''); }}
                            >
                              All Statuses
                              {!selectedStatus && <Check className="h-3 w-3" />}
                            </button>
                            {filteredStatusList.map(status => (
                              <button
                                key={status}
                                className={cn(
                                  "w-full text-left px-4 py-2 text-xs hover:bg-surface-50 transition-colors flex items-center justify-between",
                                  selectedStatus === status ? "text-primary-600 bg-primary-50/50" : "text-surface-700"
                                )}
                                onClick={(e) => { e.stopPropagation(); setSelectedStatus(status as any); setStatusFilterOpen(false); setStatusSearchQuery(''); }}
                              >
                                {status}
                                {selectedStatus === status && <Check className="h-3 w-3" />}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-surface-500 uppercase tracking-wider">TOTAL ITEM QTY</th>
                  <th className="py-4 px-6 text-xs font-bold text-surface-500 uppercase tracking-wider">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {pagedData.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-50/30 transition-colors">
                    <td className="py-5 px-6 text-center flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleItem(item.id)}
                        className="appearance-none h-5 w-5 min-w-[20px] min-h-[20px] rounded-[4px] border border-surface-300 bg-white checked:bg-primary-600 checked:border-primary-600 checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-primary-500/20 outline-none"
                      />
                    </td>
                    <td className="py-5 px-6">
                      <button
                        onClick={() => {
                          if (item.status === 'Requested') {
                            setConversionSource(item);
                            setCreateRequestMode(true);
                            setIsViewOnlyRequest(true);
                            setShowCreate(true);
                          } else {
                            setViewPurchase(item);
                          }
                        }}
                        className="flex flex-col group/id text-left outline-none"
                      >
                        <span className="font-bold text-surface-900 text-[15px] group-hover/id:text-[#55349A] transition-colors decoration-dotted underline-offset-4 group-hover/id:underline">#{item.orderNo}</span>
                        <span className="text-[11px] text-surface-400 mt-0.5">{item.date} • {item.time}</span>
                      </button>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white", item.from.color)}>
                           {item.from.initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-surface-900 uppercase leading-none mb-1">{item.from.name}</span>
                          <span className="text-[11px] text-surface-400 font-medium">{item.from.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6">
                       <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-red-100/50 rounded-lg flex items-center justify-center border border-red-100">
                           <Store className="h-4 w-4 text-red-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-surface-900 leading-none mb-1">{item.to.name}</span>
                          <span className="text-[11px] text-surface-400 font-medium">{item.to.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      <span
                        onClick={(e) => {
                          if (item.status === 'Requested') {
                            e.stopPropagation();
                            setConversionSource(item);
                            setCreateRequestMode(true);
                            setIsViewOnlyRequest(true);
                            setShowCreate(true);
                          }
                        }}
                        className={cn(
                          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-bold",
                          item.status === 'Requested' && "cursor-pointer hover:bg-[#DED4F3]/80 transition-all select-none active:scale-95",
                          item.status === 'Draft' && "bg-[#E6EEF9] text-[#4267B2]",
                          item.status === 'In Review' && "bg-[#FDF2E9] text-[#AD6A34]",
                          item.status === 'Approved' && "bg-green-50 text-green-600",
                          item.status === 'Cancelled' && "bg-red-50 text-red-600",
                          item.status === 'Requested' && "bg-[#EFEBFA] text-[#55349A]",
                        )}>
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          item.status === 'Draft' && "bg-[#4267B2]",
                          item.status === 'In Review' && "bg-[#AD6A34]",
                          item.status === 'Approved' && "bg-green-600",
                          item.status === 'Cancelled' && "bg-red-600",
                          item.status === 'Requested' && "bg-[#55349A]",
                        )} />
                        {item.status}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      <span className="text-sm font-bold text-surface-900">{item.qty}</span>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (item.status === 'Requested') {
                              setConversionSource(item);
                              setCreateRequestMode(true);
                              setIsViewOnlyRequest(true);
                              setShowCreate(true);
                            } else {
                              setViewPurchase(item);
                            }
                          }}
                          className="px-4 py-1.5 border border-surface-200 rounded-lg text-sm font-bold text-primary-700 hover:bg-surface-50 transition-colors shadow-sm"
                        >
                          Details
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setActiveActionsId(activeActionsId === item.id ? null : item.id)}
                            className={cn(
                              "p-2 border border-surface-200 rounded-lg text-surface-400 hover:text-surface-900 transition-all shadow-sm",
                              activeActionsId === item.id && "bg-surface-100 text-surface-900 border-surface-400"
                            )}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {activeActionsId === item.id && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setActiveActionsId(null)} />
                              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-surface-200 rounded-xl shadow-2xl z-30 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                {item.status === 'Requested' ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        setConversionSource(item);
                                        setCreateRequestMode(true);
                                        setIsViewOnlyRequest(true);
                                        setShowCreate(true);
                                        setActiveActionsId(null);
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-sm font-semibold text-surface-700 hover:bg-surface-50 transition-colors flex items-center gap-3"
                                    >
                                      <FileText className="h-4 w-4 text-surface-400" />
                                      View Request
                                    </button>
                                    <button
                                      onClick={() => {
                                        setConversionSource(item);
                                        setCreateRequestMode(false);
                                        setIsViewOnlyRequest(false);
                                        setShowCreate(true);
                                        setActiveActionsId(null);
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-sm font-semibold text-[#55349A] hover:bg-[#EFEBFA] transition-colors flex items-center gap-3"
                                    >
                                      <CheckSquare className="h-4 w-4" />
                                      Convert to Order
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button className="w-full text-left px-4 py-2.5 text-sm font-semibold text-surface-700 hover:bg-surface-50 transition-colors flex items-center gap-3">
                                      <Edit2 className="h-4 w-4 text-surface-400" />
                                      Edit Purchase
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleStatusChange(item.id, 'Approved');
                                        setActiveActionsId(null);
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-sm font-semibold text-green-600 hover:bg-green-50 transition-colors flex items-center gap-3"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                      Approve Purchase
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleStatusChange(item.id, 'Draft');
                                        setActiveActionsId(null);
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-sm font-semibold text-amber-600 hover:bg-amber-50 transition-colors flex items-center gap-3"
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                      Return Purchase
                                    </button>
                                  </>
                                )}
                                <div className="h-px bg-surface-100 my-1" />
                                <button className="w-full text-left px-4 py-2.5 text-sm font-semibold text-surface-700 hover:bg-surface-50 transition-colors flex items-center gap-3">
                                  <Download className="h-4 w-4 text-surface-400" />
                                  Download
                                </button>
                                <button className="w-full text-left px-4 py-2.5 text-sm font-semibold text-surface-700 hover:bg-surface-50 transition-colors flex items-center gap-3">
                                  <Share2 className="h-4 w-4 text-surface-400" />
                                  Share
                                </button>
                                <button className="w-full text-left px-4 py-2.5 text-sm font-semibold text-surface-700 hover:bg-surface-50 transition-colors flex items-center gap-3">
                                  <Printer className="h-4 w-4 text-surface-400" />
                                  Print
                                </button>
                                <div className="h-px bg-surface-100 my-1" />
                                <button
                                  onClick={() => {
                                    handleStatusChange(item.id, 'Cancelled');
                                    setActiveActionsId(null);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Cancel Purchase
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
            page={purchasePage}
            pageSize={PURCHASE_PAGE_SIZE}
            onPageChange={setPurchasePage}
            noun="purchases"
          />
        </div>
      </div>

      {/* Real-time Toast success message */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-55 bg-slate-900 border border-slate-850 text-white rounded-2xl px-5 py-3.5 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold tracking-normal">{toastMessage}</span>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-150 shadow-2xl relative text-left">
            <button
              type="button"
              onClick={() => {
                setShowImportModal(false);
                setImportingProgress(null);
                setImportedFile(null);
              }}
              className="absolute right-4 top-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-md font-extrabold text-slate-900 pr-8">Import Purchase Orders</h3>
            <p className="text-xs text-slate-400 font-semibold mt-1">Upload an Excel/CSV file to bulk record and register vendor supply plans.</p>

            {importingProgress === null ? (
              <div className="mt-5 space-y-4">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => { e.preventDefault(); setDragActive(false); const file = e.dataTransfer.files?.[0]; if (file) { setImportedFile(file.name); startImportSimulation(); } }}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-colors text-center cursor-pointer",
                    dragActive ? "border-[#55349A] bg-violet-50/20" : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="bg-[#EBE9F5] p-3 rounded-full text-[#55349A]">
                    <Upload className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#55349A] cursor-pointer hover:underline block">
                      Click to upload
                      <input
                        type="file"
                        accept=".csv,.xlsx"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">or drag and drop here</p>
                  </div>
                  <p className="text-[10px] text-slate-400">Supports CSV, XLSX up to 10MB</p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Need the setup template?</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Includes vendor identifiers & quantities.</p>
                  </div>
                  <a
                    href={`data:text/csv;charset=utf-8,${encodeURIComponent("OrderNo,Date,FromVendor,ToStore,Status,TotalQty\n")}`}
                    download="purchase_order_template.csv"
                    className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-[#55349A]/50 rounded-lg text-xs font-extrabold text-[#55349A] shadow-xs cursor-pointer select-none"
                  >
                    Download CSV
                  </a>
                </div>
              </div>
            ) : (
              <div className="mt-6 py-4 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="relative inline-flex items-center justify-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-100 border-t-[#55349A]" />
                  <span className="absolute text-xs font-bold text-slate-700">{importingProgress}%</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{validationStage}</p>
                  <p className="text-xs text-slate-400 font-semibold mt-1">Filename: {importedFile}</p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#55349A] h-1.5 transition-all duration-300" style={{ width: `${importingProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
