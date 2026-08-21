import React, { useState } from 'react';
import {
  ArrowLeft, Search, Archive, Package, Activity, History
} from '../icons';
import { cn } from '@jaldee/design-system';

import { useInventoryStock } from '../../services/useStock';
import { useStores } from '../../services/useStores';
import { useItems } from '../../services/useItems';
import { useUnits } from '../../services/useUnits';
import { StockLedgerHistory } from './StockLedgerHistory';

export const StockSummary = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('');

  const { data: stockItems = [], isLoading } = useInventoryStock(selectedStore || undefined, searchQuery);
  const { data: stores = [] } = useStores();
  const { data: globalItems = [] } = useItems(); // To map names since backend might not return them yet
  const { data: units = [] } = useUnits(); // INV-005: to show stock qty with its base unit

  const [viewingLedgerFor, setViewingLedgerFor] = useState<{storeUid: string, itemUid: string} | null>(null);

  if (viewingLedgerFor) {
    return (
      <StockLedgerHistory
        storeUid={viewingLedgerFor.storeUid}
        itemUid={viewingLedgerFor.itemUid}
        onBack={() => setViewingLedgerFor(null)}
      />
    );
  }

  // INV-005: resolve each item's base unit so stock reads e.g. "480 Btl", not a bare number.
  const unitSymbolByUid = new Map((units as any[]).map((u: any) => [u.uid, u.symbol || u.name]));

  // Enhance data with names
  const enhancedStock = stockItems.map(stock => {
    const item = globalItems.find(i => i.uid === stock.catalogItemUid || i.uid === stock.itemUid);
    const baseUnitSymbol = (item as any)?.baseUnitUid ? (unitSymbolByUid.get((item as any).baseUnitUid) || '') : '';
    const store = stores.find(s => s.uid === stock.storeUid);
    return {
      ...stock,
      itemName: stock.itemName || item?.name || 'Unknown Item',
      itemSku: stock.itemSku || item?.sku || '-',
      baseUnitSymbol,
      storeName: stock.storeName || store?.name || 'Unknown Store'
    };
  });

  const totalInHand = enhancedStock.reduce((acc, curr) => acc + (curr.inHand || 0), 0);
  const totalOnHold = enhancedStock.reduce((acc, curr) => acc + (curr.onHold || 0), 0);
  const totalItems = enhancedStock.length;

  return (
    <div className="flex flex-col flex-1 h-full bg-[var(--color-surface-alt)]/10">
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] py-4 px-8 flex flex-col gap-6 shrink-0 shadow-sm z-10 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">Stock Summary</h1>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="px-4 py-2 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none"
            >
              <option value="">All Stores</option>
              {stores.map(s => <option key={s.uid} value={s.uid}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)] rounded-xl p-4 flex items-center gap-4">
            <div className="bg-[var(--color-primary)]/10 p-3 rounded-xl text-[var(--color-primary)]">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-0.5">Total In-Hand Quantity</p>
              <p className="text-xl font-black text-[var(--color-text-primary)]">{totalInHand.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)] rounded-xl p-4 flex items-center gap-4">
            <div className="bg-orange-500/10 p-3 rounded-xl text-orange-600">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-0.5">Committed / On Hold</p>
              <p className="text-xl font-black text-[var(--color-text-primary)]">{totalOnHold.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)] rounded-xl p-4 flex items-center gap-4">
            <div className="bg-green-500/10 p-3 rounded-xl text-green-600">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-0.5">Active SKUs in Store</p>
              <p className="text-xl font-black text-[var(--color-text-primary)]">{totalItems}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">

          {/* Toolbar */}
          <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stock by item name or SKU..."
                className="w-full pl-10 pr-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none"
              />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 bg-[var(--color-surface-alt)] z-10 shadow-[0_1px_0_var(--color-border)]">
                <tr>
                  <th className="py-3 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Item & SKU</th>
                  <th className="py-3 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Store Location</th>
                  <th className="py-3 px-6 text-right text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">In Hand (Base)</th>
                  <th className="py-3 px-6 text-right text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">On Hold</th>
                  <th className="py-3 px-6 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider pl-12">Status</th>
                  <th className="py-3 px-6 text-right w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-[var(--color-text-secondary)]">Loading stock data...</td></tr>
                ) : enhancedStock.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-[var(--color-text-secondary)]">No stock records found.</td></tr>
                ) : enhancedStock.map(stock => (
                  <tr key={stock.uid} className="hover:bg-[var(--color-surface-alt)]/30 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[var(--color-text-primary)]">{stock.itemName}</span>
                        <span className="text-xs font-mono text-[var(--color-text-secondary)] mt-0.5">{stock.itemSku}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-medium text-[var(--color-text-secondary)]">{stock.storeName}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className={cn(
                        "text-lg font-black",
                        stock.inHand <= 0 ? "text-red-600" : "text-[var(--color-text-primary)]"
                      )}>
                        {stock.inHand}{stock.baseUnitSymbol ? <span className="text-xs font-bold text-[var(--color-text-secondary)] ml-1">{stock.baseUnitSymbol}</span> : null}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm font-bold text-orange-600">
                        {stock.onHold > 0 ? stock.onHold : '-'}
                      </span>
                    </td>
                    <td className="py-4 px-6 pl-12">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        stock.stockStatus === 'IN_STOCK' ? "bg-green-50 text-green-700" :
                        stock.stockStatus === 'LOW_STOCK' ? "bg-orange-50 text-orange-700" :
                        "bg-red-50 text-red-700"
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          stock.stockStatus === 'IN_STOCK' ? "bg-green-500" :
                          stock.stockStatus === 'LOW_STOCK' ? "bg-orange-500" :
                          "bg-red-500"
                        )} />
                        {stock.stockStatus?.replace('_', ' ') || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setViewingLedgerFor({ storeUid: stock.storeUid, itemUid: stock.catalogItemUid || stock.itemUid })}
                        className="opacity-0 group-hover:opacity-100 p-2 bg-[var(--color-primary-subtle)] text-[var(--color-primary)] rounded-lg text-xs font-bold hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-text)] transition-all border-0 cursor-pointer flex items-center gap-2 whitespace-nowrap"
                      >
                        <History className="h-3.5 w-3.5" />
                        View Ledger
                      </button>
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
