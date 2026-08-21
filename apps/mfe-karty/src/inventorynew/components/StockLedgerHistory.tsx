import React from 'react';
import { ArrowLeft, Clock, ArrowDownRight, ArrowUpRight } from '../icons';
import { cn } from '@jaldee/design-system';

import { useStockLedger } from '../../services/useStock';
import { useItems } from '../../services/useItems';

interface StockLedgerHistoryProps {
  storeUid: string;
  itemUid: string;
  onBack: () => void;
}

export const StockLedgerHistory = ({ storeUid, itemUid, onBack }: StockLedgerHistoryProps) => {
  const { data: ledger = [], isLoading } = useStockLedger(storeUid, itemUid);
  const { data: globalItems = [] } = useItems();

  const item = globalItems.find(i => i.uid === itemUid);

  return (
    <div className="flex flex-col flex-1 h-full bg-[var(--color-surface-alt)]/10">
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] py-4 px-8 flex flex-col gap-2 shrink-0 shadow-sm z-10 relative">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-[var(--color-surface-alt)] rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--color-text-primary)]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">Stock Ledger</h1>
            <p className="text-xs font-medium text-[var(--color-text-secondary)] mt-0.5">
              Movement history for <span className="font-bold text-[var(--color-text-primary)]">{item?.name || 'Item'}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden min-h-[500px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[var(--color-surface-alt)]/50">
              <tr>
                <th className="py-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Date & Time</th>
                <th className="py-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Movement Type</th>
                <th className="py-4 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Source Doc</th>
                <th className="py-4 px-6 text-right text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Delta (Change)</th>
                <th className="py-4 px-6 text-right text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {isLoading ? (
                <tr><td colSpan={5} className="py-12 text-center text-sm text-[var(--color-text-secondary)]">Loading ledger...</td></tr>
              ) : ledger.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-sm text-[var(--color-text-secondary)]">No stock movements recorded yet.</td></tr>
              ) : ledger.map(record => {
                const isAddition = record.inHandDelta > 0;
                const isDeduction = record.inHandDelta < 0;
                const isNeutral = record.inHandDelta === 0;

                return (
                  <tr key={record.uid} className="hover:bg-[var(--color-surface-alt)]/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[var(--color-text-disabled)]" />
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {new Date(record.occurredAt).toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">{record.movementType}</span>
                      {record.reason && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{record.reason}</p>}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-xs font-mono bg-[var(--color-surface-alt)] px-2 py-1 rounded text-[var(--color-text-secondary)]">
                        {record.sourceDoc}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold",
                        isAddition ? "bg-green-50 text-green-700" :
                        isDeduction ? "bg-red-50 text-red-700" :
                        "bg-gray-50 text-gray-700"
                      )}>
                        {isAddition ? <ArrowUpRight className="h-3 w-3" /> :
                         isDeduction ? <ArrowDownRight className="h-3 w-3" /> : null}
                        {record.inHandDelta > 0 ? '+' : ''}{record.inHandDelta}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-base font-black text-[var(--color-text-primary)]">{record.inHandAfter}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
