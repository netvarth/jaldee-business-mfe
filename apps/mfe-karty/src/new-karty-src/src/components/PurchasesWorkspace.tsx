import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PurchasesTable } from './PurchasesTable';
import { PurchaseRequestsTable } from './PurchaseRequestsTable';

/**
 * Hosts the two distinct views of the buy-side flow:
 *   • Purchases        — goods actually received (stock in)
 *   • Purchase Requests — Purchase Orders raised to vendors; a request is
 *                         fulfilled by creating a Purchase against it.
 */
export const PurchasesWorkspace = () => {
  // Default to plain Purchases (buy + receive in one step — no ordered/received/pending).
  // The Purchase Orders "order-ahead" flow (with stage tracking) is one tab away for those
  // who receive against a PO over time, so most staff never see pending unless they need it.
  const [tab, setTab] = useState<'purchases' | 'requests'>('purchases');
  /**
   * Both tables push full-screen sub-views (details, create, receive) that carry their own
   * nav bar and back button. The tab switcher belongs to the list only — keeping it mounted
   * over a sub-view stacks two headers and prints on the purchase-order document.
   */
  const [onSubScreen, setOnSubScreen] = useState(false);

  const selectTab = (key: 'purchases' | 'requests') => {
    setOnSubScreen(false);
    setTab(key);
  };

  return (
    <div className="flex flex-col flex-1 bg-white">
      {!onSubScreen && (
        <div className="bg-white border-b border-surface-100 py-3 px-8 flex items-center gap-6 shrink-0">
          <div className="flex items-center gap-4">
            <button className="p-1 hover:bg-surface-100 rounded transition-colors">
              <ArrowLeft className="h-5 w-5 text-surface-900" />
            </button>
            <h1 className="text-lg font-bold text-[#1A1D1F] tracking-tight">Purchasing</h1>
          </div>
          <div className="flex items-center gap-1 bg-surface-100/70 p-1 rounded-xl">
            {([['purchases', 'Purchases'], ['requests', 'Purchase Orders']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => selectTab(key)}
                className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
                  tab === key ? 'bg-white text-[#55349A] shadow-sm' : 'text-surface-500 hover:text-surface-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto">
        {tab === 'purchases'
          ? <PurchasesTable hideHeader onSubScreenChange={setOnSubScreen} />
          : <PurchaseRequestsTable onSubScreenChange={setOnSubScreen} />}
      </div>
    </div>
  );
};
