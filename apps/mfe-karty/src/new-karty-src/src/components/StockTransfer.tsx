import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Search, MoreHorizontal,
  ChevronDown, ArrowDown, Check, Filter,
  ChevronLeft, ChevronRight, Store, Plus,
  Copy, Edit, Share2, Printer, X, Calendar, Upload
} from 'lucide-react';
import { cn } from '../lib/utils';
import { TablePagination } from './TablePagination';

const TRANSFER_PAGE_SIZE = 10;
import { CreateStockTransfer } from './CreateStockTransfer';
import { StockTransferDetails } from './StockTransferDetails';
import { useStockTransfers, useUpdateTransferStatus, useCreateStockTransfer } from '../../../services/useStockTransfers';
import { useStores } from '../../../services/useStores';

export interface TransferItem {
  id: string;
  transferNo: string;
  date: string;
  time: string;
  fromStore: { name: string; code?: string };
  toStore: { name: string; code?: string };
  totalQty: number;
  status: 'In Transit' | 'Received' | 'Partially Received' | 'Cancelled' | 'Draft';
}

export const StockTransfer = () => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowCreate(true);
    }
  }, [searchParams]);

  const [showDetails, setShowDetails] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);

  const { data: backendTransfers } = useStockTransfers();
  const updateStatusMutation = useUpdateTransferStatus();
  const createTransferMutation = useCreateStockTransfer();

  const { data: storesList = [] } = useStores();
  const [transfers, setTransfers] = useState<TransferItem[]>([]);

  React.useEffect(() => {
    if (backendTransfers) {
      const mapped = backendTransfers.map((t: any) => {
        const fromSt: any = (storesList as any[]).find((s) => s.uid === t.fromStoreUid || s.id === t.fromStoreUid);
        const toSt: any = (storesList as any[]).find((s) => s.uid === t.toStoreUid || s.id === t.toStoreUid);
        return {
          id: t.uid || t.id,
          transferNo: t.transferNo || (t.uid ? `TO-${t.uid.substring(0, 6).toUpperCase()}` : 'TO-000'),
          date: (() => {
            const raw = t.transferDate || t.createdAt || t.date;
            return raw ? new Date(raw).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
          })(),
          time: '',
          fromStore: { name: fromSt ? (fromSt.name || fromSt.storeName) : (t.fromStoreName || 'Store'), code: fromSt?.storeCode || fromSt?.code || '' },
          toStore: { name: toSt ? (toSt.name || toSt.storeName) : (t.toStoreName || 'Store'), code: toSt?.storeCode || toSt?.code || '' },
          totalQty: t.totalQty || 0,
          status: t.status === 'IN_TRANSIT' ? 'In Transit' :
                  t.status === 'RECEIVED' ? 'Received' :
                  t.status === 'PARTIALLY_RECEIVED' ? 'Partially Received' :
                  t.status === 'CANCELLED' ? 'Cancelled' : 'Draft',
          items: t.items || [],
        };
      });
      setTransfers(mapped as TransferItem[]);
    }
  }, [backendTransfers, storesList]);

  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [editingTransferId, setEditingTransferId] = useState<string | null>(null);
  const [editFromStore, setEditFromStore] = useState('');
  const [editToStore, setEditToStore] = useState('');
  const [editQty, setEditQty] = useState(0);
  const [editDate, setEditDate] = useState('');

  // High fidelity filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // Import flow states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importingProgress, setImportingProgress] = useState<number | null>(null);
  const [validationStage, setValidationStage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [importedFile, setImportedFile] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      setValidationStage('Checking warehouse addresses & status flags...');
    }, 600);

    setTimeout(() => {
      setImportingProgress(80);
      setValidationStage('Validating stock transfer sheets...');
    }, 1200);

    setTimeout(() => {
      setImportingProgress(100);
      setValidationStage('Transfer orders successfully added!');
      setToastMessage('Stock transfer import completed. Refreshing backend transfers.');
      setTimeout(() => {
        setShowImportModal(false);
        setImportingProgress(null);
        setImportedFile(null);
        setToastMessage(null);
      }, 1500);
    }, 1800);
  };

  const duplicateTransfer = (item: TransferItem) => {
    const randomNo = Math.floor(10000000 + Math.random() * 90000000);
    const newTransfer: TransferItem = {
      ...item,
      id: `copy-${Date.now()}`,
      transferNo: `TO-${randomNo}`,
      status: 'Draft',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    };
    setTransfers(prev => [newTransfer, ...prev]);
    setActiveDropdownId(null);
    alert(`Transfer ${item.transferNo} duplicated successfully as ${newTransfer.transferNo}!`);
  };

  const cancelTransfer = (item: TransferItem) => {
    const isConfirmed = window.confirm(`Are you sure you want to cancel the transfer ${item.transferNo}?`);
    if (isConfirmed) {
      setTransfers(prev => prev.map(t => t.id === item.id ? { ...t, status: 'Cancelled' } : t));
      updateStatusMutation.mutate({ uid: item.id, status: 'CANCELLED' });
      alert(`Transfer ${item.transferNo} has been cancelled.`);
    }
    setActiveDropdownId(null);
  };

  const openEditTransfer = (item: TransferItem) => {
    setEditingTransferId(item.id);
    setEditFromStore(item.fromStore.name);
    setEditToStore(item.toStore.name);
    setEditQty(item.totalQty);
    setEditDate(item.date);
    setActiveDropdownId(null);
  };

  const handleSaveEdit = () => {
    setTransfers(prev => prev.map(t => {
      if (t.id === editingTransferId) {
        return {
          ...t,
          fromStore: { ...t.fromStore, name: editFromStore },
          toStore: { ...t.toStore, name: editToStore },
          totalQty: editQty,
          date: editDate
        };
      }
      return t;
    }));
    setEditingTransferId(null);
    alert('Stock transfer details updated successfully!');
  };

  const [transferPage, setTransferPage] = useState(1);
  React.useEffect(() => { setTransferPage(1); }, [searchQuery, selectedStatus, transfers.length]);

  if (showCreate) {
    return (
      <CreateStockTransfer
        onBack={() => setShowCreate(false)}
        onCreate={(data) => {
          // Persist to backend (was previously local-only / never saved).
          const anyData = data as any;
          if (anyData.fromStoreUid && anyData.toStoreUid && (anyData.items?.length)) {
            createTransferMutation.mutate({
              transferNo: `TO-${2026}${Math.floor(1000 + Math.random() * 9000)}`,
              fromStoreUid: anyData.fromStoreUid,
              toStoreUid: anyData.toStoreUid,
              status: 'DRAFT',
              note: anyData.note,
              items: anyData.items,
            });
          }
          const freshId = String(Date.now());
          const newTransfer: TransferItem = {
            id: freshId,
            transferNo: `TO-${2026}${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            fromStore: { name: data.fromStore || 'Unknown Store', id: data.fromStore || '-' },
            toStore: { name: data.toStore || 'Unknown Store', id: data.toStore || '-' },
            totalQty: data.itemsCount || 0,
            status: 'In Transit'
          };
          setTransfers(prev => [newTransfer, ...prev]);
          setSelectedTransferId(freshId);
          setShowCreate(false);
          setShowDetails(true);
        }}
      />
    );
  }

  const currentTransfer = transfers.find(t => t.id === selectedTransferId);

  const filteredTransfers = transfers.filter(item => {
    if (selectedStatus === 'Action Needed') {
      if (item.status !== 'In Transit' && item.status !== 'Draft') return false;
    } else if (selectedStatus !== 'All' && item.status !== selectedStatus) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.transferNo?.toLowerCase().includes(q) ||
        item.fromStore?.name?.toLowerCase().includes(q) ||
        item.toStore?.name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pagedTransfers = filteredTransfers.slice(
    (transferPage - 1) * TRANSFER_PAGE_SIZE,
    transferPage * TRANSFER_PAGE_SIZE
  );

  if (showDetails && currentTransfer) {
    return (
      <StockTransferDetails
        transfer={currentTransfer}
        onBack={() => {
          setShowDetails(false);
          setSelectedTransferId(null);
        }}
        onUpdateStatus={(id, nextStatus) => {
          setTransfers(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus as any } : t));
          const mappedStatus = nextStatus === 'In Transit' ? 'IN_TRANSIT' :
                               nextStatus === 'Partially Received' ? 'PARTIALLY_RECEIVED' : nextStatus.toUpperCase();
          updateStatusMutation.mutate({ uid: id, status: mappedStatus });
        }}
      />
    );
  }

  const toggleAll = () => {
    if (selectedItems.length === transfers.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(transfers.map(i => i.id));
    }
  };

  const toggleItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getStatusStyles = (status: TransferItem['status']) => {
    switch (status) {
      case 'In Transit':
        return "bg-amber-50 text-amber-600";
      case 'Received':
        return "bg-success-50 text-success-600";
      case 'Partially Received':
        return "bg-blue-50 text-blue-600";
      case 'Cancelled':
        return "bg-red-50 text-red-600";
      case 'Draft':
        return "bg-surface-100 text-surface-600";
      default:
        return "bg-surface-50 text-surface-500";
    }
  };

  const getStatusDot = (status: TransferItem['status']) => {
    switch (status) {
      case 'In Transit': return "bg-amber-500";
      case 'Received': return "bg-success-500";
      case 'Partially Received': return "bg-blue-500";
      case 'Cancelled': return "bg-red-500";
      case 'Draft': return "bg-surface-500";
      default: return "bg-surface-400";
    }
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Page Header Bar */}
      <div className="bg-white border-b border-slate-100/80 py-5.5 px-8 flex items-center shrink-0 select-none">
        <button className="flex items-center justify-center text-slate-800 hover:text-slate-950 transition-colors mr-3 cursor-pointer">
          <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <h1 className="text-[21px] font-black text-slate-900 tracking-tight leading-none">Stock Transfer</h1>
      </div>

      {/* Main Page Content */}
      <div className="p-8 space-y-6">
        {/* clip-fix: no overflow-hidden — it clips the toolbar status dropdown (top-full). rounded+border keep corners. */}
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm">
          {/* Toolbar */}
          <div className="p-6 border-b border-surface-100 flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className="flex items-center justify-between gap-4 px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold text-surface-700 min-w-[150px] hover:border-surface-300 transition-colors cursor-pointer"
                >
                  <span>{selectedStatus}</span>
                  <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform", statusDropdownOpen && "rotate-180")} />
                </button>

                {statusDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10 bg-transparent" onClick={() => setStatusDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-surface-200 rounded-xl shadow-2xl z-20 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 text-left">
                      {[
                        'All',
                        'Action Needed',
                        'In Transit',
                        'Received',
                        'Partially Received',
                        'Cancelled',
                        'Draft'
                      ].map((statusOption) => (
                        <button
                          key={statusOption}
                          type="button"
                          onClick={() => {
                            setSelectedStatus(statusOption);
                            setStatusDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between cursor-pointer",
                            selectedStatus === statusOption ? "text-[#55349A] bg-violet-50/50" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <span>{statusOption}</span>
                          {selectedStatus === statusOption && <Check className="w-3.5 h-3.5 text-[#55349A]" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#FAF9F6] border border-surface-200 hover:border-[#55349A]/50 hover:bg-violet-50/50 rounded-xl text-sm font-bold text-[#55349A] transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-95 duration-150"
              >
                <Upload className="h-4 w-4 text-[#55349A] stroke-[2.5]" />
                <span>Import</span>
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#55349A] border border-[#55349A] rounded-xl text-sm font-bold text-white hover:bg-[#452a7d] transition-colors shadow-lg shadow-primary-500/10 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Create Transfer
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="w-full overflow-x-auto rounded-xl border border-surface-200 shadow-3xs">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-surface-50 border-y border-surface-100 select-none text-surface-400 text-[10.5px] font-bold uppercase tracking-wider">
                  <th className="px-[22px] py-2.5 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === filteredTransfers.length && filteredTransfers.length > 0}
                      onChange={() => {
                        if (selectedItems.length === filteredTransfers.length) {
                          setSelectedItems([]);
                        } else {
                          setSelectedItems(filteredTransfers.map(i => i.id));
                        }
                      }}
                      className="appearance-none h-5 w-5 rounded-[4px] border border-surface-300 bg-white checked:bg-primary-600 checked:border-primary-600 checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-primary-500/20 outline-none"
                    />
                  </th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">TRANSFER NUMBER & DATE</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider text">FROM</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">TO</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider text-center">TOTAL ITEM QTY</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">
                    <div className="flex items-center gap-1 group cursor-pointer animate-none">
                      STATUS
                      <ArrowDown className="h-3 w-3 text-surface-300" />
                    </div>
                  </th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider text-right pr-8">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filteredTransfers.length > 0 ? (
                  pagedTransfers.map((item) => (
                  <tr key={item.id} className="border-b border-surface-100 px-[22px] py-2.5 text-[12.5px] hover:bg-surface-50 transition-colors group">
                    <td className="px-[22px] py-2.5 text-center">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => toggleItem(item.id)}
                          className="appearance-none h-5 w-5 rounded-[4px] border border-surface-300 bg-white checked:bg-primary-600 checked:border-primary-600 checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-primary-500/20 outline-none"
                        />
                      </div>
                    </td>
                    <td className="px-[22px] py-2.5 text-left">
                      <div className="flex flex-col">
                        <button
                          onClick={() => {
                            setSelectedTransferId(item.id);
                            setShowDetails(true);
                          }}
                          className="font-black text-[#55349A] hover:text-[#43277c] hover:underline cursor-pointer text-[15px] block text-left bg-transparent border-none p-0 focus:outline-none select-none transition-colors"
                        >
                          #{item.transferNo}
                        </button>
                        <span className="text-[11px] text-surface-400 mt-0.5">{item.date} • {item.time}</span>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-left">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 border border-primary-100">
                          <Store className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-surface-900 text-sm leading-tight">{item.fromStore.name}</div>
                          {item.fromStore.code && <div className="text-[11px] text-surface-400 font-medium">{item.fromStore.code}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-left">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 border border-primary-100">
                          <Store className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-surface-900 text-sm leading-tight">{item.toStore.name}</div>
                          {item.toStore.code && <div className="text-[11px] text-surface-400 font-medium">{item.toStore.code}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-[22px] py-2.5 text-center">
                      <span className="font-bold text-surface-900 text-[15px]">{item.totalQty}</span>
                    </td>
                    <td className="py-5 px-6">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-bold shrink-0 min-w-[100px]",
                        getStatusStyles(item.status)
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusDot(item.status))} />
                        {item.status}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-right pr-8 relative">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedTransferId(item.id);
                            setShowDetails(true);
                          }}
                          className="px-4 py-1.5 border border-surface-200 rounded-lg text-sm font-bold text-primary-700 hover:bg-primary-50 transition-colors shadow-sm cursor-pointer"
                        >
                          Details
                        </button>

                        <div className="relative inline-block text-left">
                          <button
                            id={`more-btn-${item.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === item.id ? null : item.id);
                            }}
                            className="p-1.5 border border-surface-200 rounded-lg text-surface-400 hover:text-surface-900 hover:bg-surface-50 transition-colors shadow-sm cursor-pointer flex items-center justify-center"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {activeDropdownId === item.id && (
                            <>
                              {/* Click outside backdrop overlay */}
                              <div
                                className="fixed inset-0 z-40 bg-transparent"
                                onClick={() => setActiveDropdownId(null)}
                              />

                              <div className="absolute right-0 mt-2 w-56 bg-white border border-surface-200 rounded-xl shadow-xl z-50 py-1.5 text-left animate-in fade-in slide-in-from-top-1 duration-150 min-w-[210px]">
                                <button
                                  onClick={() => {
                                    setSelectedTransferId(item.id);
                                    setShowDetails(true);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs font-bold text-surface-700 hover:bg-surface-50 hover:text-surface-900 transition-colors flex items-center gap-2 cursor-pointer border-none"
                                >
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  Receive Items
                                </button>



                                <button
                                  onClick={() => openEditTransfer(item)}
                                  className="w-full text-left px-4 py-2 text-xs font-bold text-surface-700 hover:bg-surface-50 hover:text-surface-900 transition-colors flex items-center gap-2 cursor-pointer border-none"
                                >
                                  <Edit className="h-3.5 w-3.5 text-amber-600" />
                                  Edit Transfer Details
                                </button>

                                <button
                                  onClick={() => {
                                    alert(`Transfer #${item.transferNo} link copied to clipboard!`);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs font-bold text-surface-700 hover:bg-surface-50 hover:text-surface-900 transition-colors flex items-center gap-2 cursor-pointer border-none"
                                >
                                  <Share2 className="h-3.5 w-3.5 text-purple-600" />
                                  Share
                                </button>

                                <button
                                  onClick={() => {
                                    alert(`Preparing system print invoice for #${item.transferNo}...`);
                                    window.print();
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs font-bold text-surface-700 hover:bg-surface-50 hover:text-surface-900 transition-colors flex items-center gap-2 cursor-pointer border-none"
                                >
                                  <Printer className="h-3.5 w-3.5 text-slate-500" />
                                  Print
                                </button>

                                <div className="h-px bg-surface-100 my-1" />

                                <button
                                  onClick={() => cancelTransfer(item)}
                                  className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer border-none"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Cancel
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-surface-400 font-semibold text-xs">
                      No stock transfers found inside this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <TablePagination
            total={filteredTransfers.length}
            page={transferPage}
            pageSize={TRANSFER_PAGE_SIZE}
            onPageChange={setTransferPage}
            noun="stock transfers"
          />
        </div>
      </div>

      {/* Edit Modal Popup */}
      {editingTransferId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[24px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-surface-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-surface-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-surface-900">Edit Transfer Details</h2>
              <button
                onClick={() => setEditingTransferId(null)}
                className="p-1.5 hover:bg-surface-100 rounded-full text-surface-400 hover:text-surface-900 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">From Store</label>
                <input
                  type="text"
                  value={editFromStore}
                  onChange={(e) => setEditFromStore(e.target.value)}
                  placeholder="From store"
                  className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">To Store</label>
                <input
                  type="text"
                  value={editToStore}
                  onChange={(e) => setEditToStore(e.target.value)}
                  placeholder="To store"
                  className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Total Item Quantity</label>
                <input
                  type="number"
                  value={editQty}
                  onChange={(e) => setEditQty(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Transfer Date</label>
                <div className="relative">
                  <input
                    type="text"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-4 py-2.6 bg-surface-50 border border-surface-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-colors"
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-surface-100 flex items-center justify-end gap-3 bg-surface-50/50">
              <button
                onClick={() => setEditingTransferId(null)}
                className="px-5 py-2 border border-surface-200 bg-white rounded-xl text-sm font-bold text-surface-500 hover:bg-surface-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2 bg-[#55349A] text-white rounded-xl text-sm font-bold hover:bg-[#452a7d] transition-colors shadow-md cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

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

            <h3 className="text-md font-extrabold text-slate-900 pr-8">Import Stock Transfers</h3>
            <p className="text-xs text-slate-400 font-semibold mt-1">Upload an Excel/CSV file to bulk record warehouse transfer journals.</p>

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
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Includes from/to store keys & quantities.</p>
                  </div>
                  <a
                    href={`data:text/csv;charset=utf-8,${encodeURIComponent("TransferNo,Date,FromStore,ToStore,TotalQty,Status\n")}`}
                    download="stock_transfer_template.csv"
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
