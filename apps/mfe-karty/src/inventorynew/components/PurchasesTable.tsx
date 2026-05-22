import React, { useState } from 'react';
import { 
  ArrowLeft, Search, MoreHorizontal, 
  ArrowDown, ChevronDown, Filter, ChevronLeft, ChevronRight,
  Store, Check, ShoppingCart
} from '../icons';
import { cn } from '@jaldee/design-system';
import { CreatePurchase } from './CreatePurchase';
import { PurchaseDetails } from './PurchaseDetails';

interface PurchaseItem {
  id: string;
  orderNo: string;
  date: string;
  time: string;
  from: { name: string; id: string; color: string; initials: string };
  to: { name: string; id: string; type: 'store' };
  status: 'Draft' | 'In Review' | 'Approved' | 'Cancelled';
  qty: number;
}

const PURCHASE_DATA: PurchaseItem[] = [
  { 
    id: '1', orderNo: '356713', date: '17 Mar 2026', time: '08:14 AM',
    from: { name: 'SIMRAN FASHIONS', id: '#1234567', color: 'bg-[var(--color-warning-subtle)] text-[var(--color-warning)]', initials: 'SF' },
    to: { name: 'Store 1', id: '#1', type: 'store' },
    status: 'Draft', qty: 5
  },
  { 
    id: '2', orderNo: '356712', date: '17 Mar 2026', time: '08:13 AM',
    from: { name: 'JIO Wholesale', id: '#1234566', color: 'bg-[var(--color-danger-subtle)] text-[var(--color-danger)]', initials: 'JW' },
    to: { name: 'Store 1', id: '#1', type: 'store' },
    status: 'In Review', qty: 8
  },
  { 
    id: '3', orderNo: '356711', date: '17 Mar 2026', time: '08:11 AM',
    from: { name: 'SIMRAN FASHIONS', id: '#1234567', color: 'bg-[var(--color-text-primary)] text-[var(--color-surface)]', initials: 'SF' },
    to: { name: 'Store 1', id: '#1', type: 'store' },
    status: 'Approved', qty: 5
  },
  { 
    id: '4', orderNo: '356710', date: '17 Mar 2026', time: '08:10 AM',
    from: { name: 'SIMRAN FASHIONS', id: '#1234567', color: 'bg-[var(--color-text-primary)] text-[var(--color-surface)]', initials: 'SF' },
    to: { name: 'Store 1', id: '#1', type: 'store' },
    status: 'In Review', qty: 3
  },
  { 
    id: '5', orderNo: '356709', date: '17 Mar 2026', time: '07:55 AM',
    from: { name: 'JIO Wholesale', id: '#1234566', color: 'bg-[var(--color-danger-subtle)] text-[var(--color-danger)]', initials: 'JW' },
    to: { name: 'Store 1', id: '#1', type: 'store' },
    status: 'Approved', qty: 2
  },
  { 
    id: '6', orderNo: '356708', date: '17 Mar 2026', time: '07:50 AM',
    from: { name: 'JIO Wholesale', id: '#1234566', color: 'bg-[var(--color-danger-subtle)] text-[var(--color-danger)]', initials: 'JW' },
    to: { name: 'Store 1', id: '#1', type: 'store' },
    status: 'Cancelled', qty: 10
  },
  { 
    id: '7', orderNo: '356707', date: '17 Mar 2026', time: '07:45 AM',
    from: { name: 'SIMRAN FASHIONS', id: '#1234567', color: 'bg-[var(--color-text-primary)] text-[var(--color-surface)]', initials: 'SF' },
    to: { name: 'Store 1', id: '#1', type: 'store' },
    status: 'Cancelled', qty: 5
  },
  { 
    id: '8', orderNo: '356706', date: '17 Mar 2026', time: '07:43 AM',
    from: { name: 'JIO Wholesale', id: '#1234566', color: 'bg-[var(--color-danger-subtle)] text-[var(--color-danger)]', initials: 'JW' },
    to: { name: 'Store 1', id: '#1', type: 'store' },
    status: 'Draft', qty: 7
  },
  { 
    id: '9', orderNo: '356705', date: '17 Mar 2026', time: '07:30 AM',
    from: { name: 'SIMRAN FASHIONS', id: '#1234567', color: 'bg-[var(--color-text-primary)] text-[var(--color-surface)]', initials: 'SF' },
    to: { name: 'Store 1', id: '#1', type: 'store' },
    status: 'In Review', qty: 3
  },
];

export const PurchasesTable = () => {
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [statusSearchQuery, setStatusSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [viewPurchase, setViewPurchase] = useState<PurchaseItem | null>(null);

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

  const STATUS_OPTIONS = ['Draft', 'In Review', 'Approved', 'Cancelled'];
  const filteredStatusList = STATUS_OPTIONS.filter(status => 
    status.toLowerCase().includes(statusSearchQuery.toLowerCase())
  );

  const filteredData = selectedStatus 
    ? PURCHASE_DATA.filter(item => item.status === selectedStatus)
    : PURCHASE_DATA;

  if (showCreate) {
    return (
      <CreatePurchase 
        onBack={() => setShowCreate(false)}
        onCreate={(data) => {
          console.log('New Purchase:', data);
          setShowCreate(false);
        }}
        onSend={(data) => {
          console.log('Sent Purchase:', data);
          setShowCreate(false);
          setViewPurchase({
            id: 'new-id',
            orderNo: data.purchaseNo || '356714',
            date: data.date || '17 Mar 2026',
            time: '08:15 AM',
            from: { 
              name: data.vendor || 'SIMRAN FASHIONS', 
              id: '#1234567', 
              color: 'bg-[var(--color-warning-subtle)] text-[var(--color-warning)]', 
              initials: (data.vendor || 'SF').substring(0, 2).toUpperCase() 
            },
            to: { 
              name: data.store || 'Store 1', 
              id: '#1', 
              type: 'store' 
            },
            status: 'In Review',
            qty: data.items?.length || 0
          });
        }}
      />
    );
  }

  if (viewPurchase) {
    return (
      <PurchaseDetails 
        purchase={viewPurchase}
        onBack={() => setViewPurchase(null)}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-[var(--color-surface)]">
      {/* Page Header Bar */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] py-3.5 px-8 flex items-center shrink-0">
        <div className="flex items-center gap-4">
          <button className="p-1 hover:bg-[var(--color-surface-alt)] rounded transition-colors border-0 bg-transparent cursor-pointer">
            <ArrowLeft className="h-5 w-5 text-[var(--color-text-primary)]" />
          </button>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight">Purchases</h1>
        </div>
      </div>

      {/* Main Page Content */}
      <div className="p-6 space-y-6 flex-1 text-left">
        <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)]">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="relative max-w-sm flex-1 text-left">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-secondary)]" />
              <input 
                type="text" 
                placeholder="Search" 
                className="w-full pl-11 pr-4 py-2.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] transition-colors shadow-sm min-w-[160px] justify-between cursor-pointer">
                All Purchases
                <ChevronDown className="h-4 w-4 text-[var(--color-text-secondary)]" />
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] transition-colors shadow-sm cursor-pointer">
                <Filter className="h-4 w-4 text-[var(--color-primary)]" />
                Filter
              </button>
              <button 
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-[var(--color-primary-text)] rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-sm cursor-pointer border-0"
              >
                + Create New Purchase
              </button>
            </div>
          </div>

          <div className="-mx-6 border-t border-[var(--color-border)] overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-[var(--color-surface-alt)]/50 border-b border-[var(--color-border)]">
                  <th className="py-4 px-6 w-12 text-center items-center justify-center flex">
                     <input 
                      type="checkbox"
                      checked={selectedItems.length === filteredData.length && filteredData.length > 0}
                      onChange={toggleAll}
                      className="appearance-none h-5 w-5 min-w-[20px] min-h-[20px] ml-[18px] pl-0 rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface)] checked:bg-[var(--color-primary)] checked:border-[var(--color-primary)] checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none"
                     />
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">PURCHASE NUMBER & DATE</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">FROM</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">TO</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    <div className="relative inline-flex items-center gap-1 group cursor-pointer" onClick={() => setStatusFilterOpen(!statusFilterOpen)}>
                      STATUS
                      <ArrowDown className={cn("h-3 w-3 text-[var(--color-text-disabled)] transition-colors group-hover:text-[var(--color-text-primary)]", statusFilterOpen && "text-[var(--color-primary)]")} />
                      
                      {statusFilterOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setStatusFilterOpen(false); }} />
                          <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl z-20 py-2 normal-case tracking-normal font-medium">
                            <div className="px-3 pb-2 mb-2 border-b border-[var(--color-border)]">
                              <div className="relative text-left">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-disabled)]" />
                                <input 
                                  type="text" 
                                  placeholder="Search status..." 
                                  value={statusSearchQuery}
                                  onChange={(e) => setStatusSearchQuery(e.target.value)}
                                  className="w-full pl-7 pr-3 py-1.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg text-xs outline-none focus:border-[var(--color-primary)]"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                            <button 
                              className={cn(
                                "w-full text-left px-4 py-2 text-xs hover:bg-[var(--color-surface-alt)] transition-colors flex items-center justify-between border-0 bg-transparent cursor-pointer",
                                !selectedStatus ? "text-[var(--color-primary)] bg-[var(--color-primary-subtle)]" : "text-[var(--color-text-primary)]"
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
                                  "w-full text-left px-4 py-2 text-xs hover:bg-[var(--color-surface-alt)] transition-colors flex items-center justify-between border-0 bg-transparent cursor-pointer",
                                  selectedStatus === status ? "text-[var(--color-primary)] bg-[var(--color-primary-subtle)]" : "text-[var(--color-text-primary)]"
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
                  <th className="py-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">TOTAL ITEM QTY</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--color-surface-alt)]/30 transition-colors">
                    <td className="py-5 px-6 text-center flex items-center justify-center">
                      <input 
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleItem(item.id)}
                        className="appearance-none h-5 w-5 min-w-[20px] min-h-[20px] rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface)] checked:bg-[var(--color-primary)] checked:border-[var(--color-primary)] checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none"
                      />
                    </td>
                    <td className="py-5 px-6 text-left">
                      <div className="flex flex-col">
                        <span className="font-bold text-[var(--color-text-primary)] text-[15px]">#{item.orderNo}</span>
                        <span className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">{item.date} • {item.time}</span>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-left">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-bold", item.from.color)}>
                           {item.from.initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-[var(--color-text-primary)] uppercase leading-none mb-1">{item.from.name}</span>
                          <span className="text-[11px] text-[var(--color-text-secondary)]/60 font-medium">{item.from.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-left">
                       <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-[var(--color-danger-subtle)] rounded-lg flex items-center justify-center border border-[var(--color-danger)]/15">
                           <Store className="h-4 w-4 text-[var(--color-danger)]" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-[var(--color-text-primary)] leading-none mb-1">{item.to.name}</span>
                          <span className="text-[11px] text-[var(--color-text-secondary)]/60 font-medium">{item.to.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      <span className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-bold",
                        item.status === 'Draft' && "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]",
                        item.status === 'In Review' && "bg-[var(--color-warning-subtle)] text-[var(--color-warning)]",
                        item.status === 'Approved' && "bg-[var(--color-success-subtle)] text-[var(--color-success)]",
                        item.status === 'Cancelled' && "bg-[var(--color-danger-subtle)] text-[var(--color-danger)]",
                      )}>
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          item.status === 'Draft' && "bg-[var(--color-primary)]",
                          item.status === 'In Review' && "bg-[var(--color-warning)]",
                          item.status === 'Approved' && "bg-[var(--color-success)]",
                          item.status === 'Cancelled' && "bg-[var(--color-danger)]",
                        )} />
                        {item.status}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-left">
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">{item.qty}</span>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setViewPurchase(item)}
                          className="px-4 py-1.5 border border-[var(--color-border)] rounded-lg text-sm font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-alt)] transition-colors shadow-sm cursor-pointer bg-transparent"
                        >
                          Details
                        </button>
                        <button className="p-2 border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors shadow-sm cursor-pointer bg-transparent">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="mt-8 flex items-center justify-between pt-6 border-t border-[var(--color-border)]">
            <div className="text-sm text-[var(--color-text-secondary)] font-medium">
              Showing <span className="text-[var(--color-text-primary)] font-bold">9</span> of <span className="text-[var(--color-text-primary)] font-bold">230</span> purchases
            </div>
            
            <div className="flex items-center gap-2">
              <button className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors border-0 bg-transparent cursor-pointer"><ChevronLeft className="h-5 w-5" /></button>
              <button className="px-3 py-1 font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] rounded transition-colors text-sm border-0 bg-transparent cursor-pointer">Prev</button>
              <div className="flex items-center gap-1 mx-2">
                <button className="w-8 h-8 flex items-center justify-center text-sm font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] rounded border-0 bg-transparent cursor-pointer">1</button>
                <button className="w-8 h-8 flex items-center justify-center text-sm font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] rounded border-0 bg-transparent cursor-pointer">2</button>
                <span className="px-1 text-[var(--color-text-secondary)]/20">...</span>
                <button className="w-8 h-8 flex items-center justify-center text-sm font-bold bg-[var(--color-primary-subtle)] text-[var(--color-primary)] rounded shadow-sm border-0 cursor-pointer">5</button>
                <button className="w-8 h-8 flex items-center justify-center text-sm font-bold text-[var(--color-text-secondary)]/80 hover:bg-[var(--color-surface-alt)] rounded border-0 bg-transparent cursor-pointer">6</button>
              </div>
              <button className="px-3 py-1 font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] rounded transition-colors text-sm flex items-center gap-1 border-0 bg-transparent cursor-pointer">Next <ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
