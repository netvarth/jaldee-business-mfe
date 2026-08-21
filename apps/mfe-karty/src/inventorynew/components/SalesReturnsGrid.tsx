import React, { useState } from 'react';
import { ArrowLeft, Search } from '../icons';
import { useSalesReturns, useUpdateSalesReturnStatus } from '../../services/useSalesReturns';
import { useStores } from '../../services/useStores';
import { CreateSalesReturn } from './CreateSalesReturn';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)]',
  PENDING: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

export const SalesReturnsGrid = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const { data: returns = [], isLoading } = useSalesReturns(searchQuery);
  const { data: stores = [] } = useStores();
  const updateStatus = useUpdateSalesReturnStatus();

  if (showCreate) {
    return <CreateSalesReturn onBack={() => setShowCreate(false)} onCreate={() => setShowCreate(false)} />;
  }

  const rows = (returns as any[]).map((r) => ({
    ...r,
    storeName: (stores as any[]).find((s) => s.uid === r.storeUid)?.name || '—',
    totalQty: (r.items || []).reduce((a: number, c: any) => a + (c.qty || 0), 0),
  })).filter((r) =>
    !searchQuery || (r.returnNo || '').toLowerCase().includes(searchQuery.toLowerCase())
    || (r.invoiceNo || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 h-full bg-[var(--color-surface-alt)]/10">
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] py-4 px-8 flex items-center justify-between shrink-0 shadow-sm z-10 relative">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-[var(--color-surface-alt)] rounded-lg transition-colors border-0 bg-transparent cursor-pointer">
            <ArrowLeft className="h-5 w-5 text-[var(--color-text-primary)]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">Sales Returns</h1>
            <p className="text-xs text-[var(--color-text-secondary)] font-medium mt-0.5">Customer returns restocked to inventory</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 bg-[var(--color-primary)] text-[var(--color-primary-text)] rounded-xl text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer border-0"
        >
          + New Return
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="bg-white border border-surface-200 rounded-xl shadow-3xs overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 outline-none"
              />
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-surface-50 border-y border-surface-100 select-none text-surface-400 text-[10.5px] font-bold uppercase tracking-wider">
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">Return # & Date</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">Invoice</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">Store</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider text-right">Items Qty</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider">Status</th>
                  <th className="px-[22px] py-2.5 font-bold tracking-wider text-right w-40"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-[var(--color-text-secondary)]">Loading sales returns...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-[var(--color-text-secondary)]">No sales returns found.</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.uid} className="border-b border-surface-100 px-[22px] py-2.5 text-[12.5px] hover:bg-surface-50 transition-colors">
                    <td className="px-[22px] py-2.5 text-left">
                      <div className="text-sm font-bold text-surface-900">{r.returnNo}</div>
                      <div className="text-xs text-surface-500">{r.returnDate ? new Date(r.returnDate).toLocaleDateString() : '—'}</div>
                    </td>
                    <td className="px-[22px] py-2.5 text-left text-surface-500">{r.invoiceNo || '—'}</td>
                    <td className="px-[22px] py-2.5 text-left text-surface-500">{r.storeName}</td>
                    <td className="px-[22px] py-2.5 text-right font-bold">{r.totalQty}</td>
                    <td className="px-[22px] py-2.5 text-left">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_STYLES[r.status] || STATUS_STYLES.DRAFT}`}>{r.status}</span>
                    </td>
                    <td className="px-[22px] py-2.5 text-right">
                      {r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && (
                        <button
                          onClick={() => updateStatus.mutate({ uid: r.uid, status: 'COMPLETED' })}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors border-0 cursor-pointer"
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
