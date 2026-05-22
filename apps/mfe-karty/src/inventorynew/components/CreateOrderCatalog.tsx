import React, { useState } from 'react';
import { 
  ArrowLeft, ChevronDown, Check
} from '../icons';
import { cn } from '@jaldee/design-system';

interface InvCatalog {
  id: string;
  name: string;
  itemsCount: number;
}

const INV_CATALOGS: InvCatalog[] = [
  { id: '324567', name: 'Warehouse Catalog', itemsCount: 5 },
  { id: '324566', name: 'Main Directory Catalog', itemsCount: 5 },
  { id: '324565', name: 'Inventory Domestic Catalog', itemsCount: 5 },
  { id: '324565b', name: 'Inventory International Catalog', itemsCount: 5 },
];

const STORES = ['Store 1', 'Store 2', 'Store 6'];
const CURRENCIES = ['INR (₹)', 'USD ($)', 'EUR (€)'];
const YES_NO = ['Yes', 'No'];

interface CreateOrderCatalogProps {
  onBack: () => void;
  onCreate: (data?: any) => void;
  initialData?: any;
}

export const CreateOrderCatalog = ({ onBack, onCreate }: CreateOrderCatalogProps) => {
  const [catalogName, setCatalogName] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [currency, setCurrency] = useState('INR (₹)');
  const [walkInPos, setWalkInPos] = useState('Yes');
  const [storePickup, setStorePickup] = useState('Yes');
  const [homeDelivery, setHomeDelivery] = useState('Yes');
  const [inventoryManagement, setInventoryManagement] = useState(true);
  const [selectedInvCatalogs, setSelectedInvCatalogs] = useState<string[]>(['324566']);

  const toggleAll = () => {
    if (selectedInvCatalogs.length === INV_CATALOGS.length) {
      setSelectedInvCatalogs([]);
    } else {
      setSelectedInvCatalogs(INV_CATALOGS.map(item => item.id));
    }
  };

  const toggleItem = (id: string) => {
    setSelectedInvCatalogs(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const [storeOpen, setStoreOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [pickupOpen, setPickupOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);

  return (
    <div className="flex flex-col flex-1 h-full bg-[var(--color-surface-alt)]/20">
      {/* Header */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] py-3.5 px-8 flex items-center gap-4 shrink-0">
        <button 
          onClick={onBack}
          className="p-1 hover:bg-[var(--color-surface-alt)] rounded transition-colors border-0 bg-transparent cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-[var(--color-text-primary)]" />
        </button>
        <h1 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight">
          Create New Order Catalog
        </h1>
      </div>

      <div className="flex-1 p-8 space-y-6 pb-24 text-left">
        {/* Section: Catalog Details */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-visible">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Catalog Details</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">Catalog Name</label>
                <input 
                  type="text" 
                  value={catalogName}
                  onChange={(e) => setCatalogName(e.target.value)}
                  placeholder="Enter catalog name"
                  className="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all"
                />
                <button className="text-[11px] font-bold text-[var(--color-primary)] hover:underline border-0 bg-transparent cursor-pointer">
                  + Add Catalog Description
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">Store</label>
                <div className="relative">
                  <button 
                    onClick={() => setStoreOpen(!storeOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all group cursor-pointer"
                  >
                    <span className={selectedStore ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-disabled)]"}>
                      {selectedStore || 'Select Store'}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-[var(--color-text-secondary)] transition-transform", storeOpen && "rotate-180")} />
                  </button>
                  {storeOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setStoreOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-20 py-2 origin-top">
                        {STORES.map((store) => (
                          <button 
                            key={store}
                            className={cn(
                              "w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-surface-alt)] transition-colors flex items-center justify-between border-0 bg-transparent cursor-pointer",
                              selectedStore === store ? "text-[var(--color-primary)] bg-[var(--color-primary-subtle)]" : "text-[var(--color-text-primary)]"
                            )}
                            onClick={() => {
                              setSelectedStore(store);
                              setStoreOpen(false);
                            }}
                          >
                            {store}
                            {selectedStore === store && <Check className="h-3.5 w-3.5" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">Currency</label>
                <div className="relative">
                  <button 
                    onClick={() => setCurrencyOpen(!currencyOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all cursor-pointer"
                  >
                    <span className="text-[var(--color-text-primary)]">{currency}</span>
                    <ChevronDown className={cn("h-4 w-4 text-[var(--color-text-secondary)] transition-transform", currencyOpen && "rotate-180")} />
                  </button>
                  {currencyOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setCurrencyOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-20 py-2">
                        {CURRENCIES.map((c) => (
                          <button 
                            key={c}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-surface-alt)] border-0 bg-transparent cursor-pointer"
                            onClick={() => { setCurrency(c); setCurrencyOpen(false); }}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">Walk-in POS</label>
                <div className="relative">
                  <button 
                    onClick={() => setWalkInOpen(!walkInOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm transition-all cursor-pointer"
                  >
                    <span className="text-[var(--color-text-primary)]">{walkInPos}</span>
                    <ChevronDown className={cn("h-4 w-4 text-[var(--color-text-secondary)] transition-transform", walkInOpen && "rotate-180")} />
                  </button>
                  {walkInOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setWalkInOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-20 py-2">
                        {YES_NO.map((v) => (
                          <button key={v} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-surface-alt)] border-0 bg-transparent cursor-pointer" onClick={() => { setWalkInPos(v); setWalkInOpen(false); }}>{v}</button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">Store Pickup</label>
                <div className="relative">
                  <button 
                    onClick={() => setPickupOpen(!pickupOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm transition-all cursor-pointer"
                  >
                    <span className="text-[var(--color-text-primary)]">{storePickup}</span>
                    <ChevronDown className={cn("h-4 w-4 text-[var(--color-text-secondary)] transition-transform", pickupOpen && "rotate-180")} />
                  </button>
                  {pickupOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setPickupOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-20 py-2">
                        {YES_NO.map((v) => (
                          <button key={v} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-surface-alt)] border-0 bg-transparent cursor-pointer" onClick={() => { setStorePickup(v); setPickupOpen(false); }}>{v}</button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">Home Delivery</label>
                <div className="relative">
                  <button 
                    onClick={() => setDeliveryOpen(!deliveryOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm transition-all cursor-pointer"
                  >
                    <span className="text-[var(--color-text-primary)]">{homeDelivery}</span>
                    <ChevronDown className={cn("h-4 w-4 text-[var(--color-text-secondary)] transition-transform", deliveryOpen && "rotate-180")} />
                  </button>
                  {deliveryOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setDeliveryOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-20 py-2">
                        {YES_NO.map((v) => (
                          <button key={v} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-surface-alt)] border-0 bg-transparent cursor-pointer" onClick={() => { setHomeDelivery(v); setDeliveryOpen(false); }}>{v}</button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Inventory Management */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
             <div className="flex items-center gap-4 bg-[var(--color-surface-alt)] p-2 pr-8 rounded-lg">
                <button 
                  onClick={() => setInventoryManagement(!inventoryManagement)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    inventoryManagement ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
                  )}
                >
                  <span className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    inventoryManagement ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
                <div className="flex flex-col text-left">
                  <span className="text-[13px] font-bold text-[var(--color-text-primary)]">Inventory Management</span>
                  <span className="text-[12px] text-[var(--color-text-secondary)]/60 font-medium leading-none mt-0.5">Link an Inventory Catalog to enable item tracking</span>
                </div>
             </div>
          </div>
          
          <div className="-mx-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]">
                  <th className="py-2 px-6 w-12 text-center items-center justify-center flex mt-1">
                     <input 
                      type="checkbox"
                      checked={selectedInvCatalogs.length === INV_CATALOGS.length && INV_CATALOGS.length > 0}
                      onChange={toggleAll}
                      className="appearance-none h-5 w-5 min-w-[20px] min-h-[20px] ml-[18px] pl-0 rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface)] checked:bg-[var(--color-primary)] checked:border-[var(--color-primary)] checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none"
                     />
                  </th>
                  <th className="py-2 px-6 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">INV.CATALOG NAME & ID</th>
                  <th className="py-2 px-6 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">ITEMS COUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {INV_CATALOGS.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--color-surface-alt)]/30 transition-colors">
                    <td className="py-4 px-6">
                      <input 
                        type="checkbox"
                        checked={selectedInvCatalogs.includes(item.id)}
                        onChange={() => toggleItem(item.id)}
                        className="appearance-none h-5 w-5 min-w-[20px] min-h-[20px] rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface)] checked:bg-[var(--color-primary)] checked:border-[var(--color-primary)] checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none"
                      />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-[var(--color-text-primary)] leading-tight">{item.name}</span>
                        <span className="text-[10px] text-[var(--color-text-secondary)]/60 font-medium mt-0.5">#{item.id}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">{item.itemsCount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Bar Footer */}
      <div className="fixed bottom-0 right-0 left-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] px-8 py-4 flex items-center justify-start gap-3 z-30">
        <button 
          onClick={onBack}
          className="px-8 py-2.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg text-sm font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button 
          onClick={onCreate}
          className="px-8 py-2.5 bg-[var(--color-primary)] text-[var(--color-primary-text)] border border-[var(--color-primary)] rounded-lg text-sm font-bold hover:opacity-90 transition-colors cursor-pointer"
        >
          Create Catalog
        </button>
      </div>
    </div>
  );
};
