import React, { useState } from 'react';
import {
  ArrowLeft, ChevronDown, Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useInventoryCatalogs } from '../../../services/useInventoryCatalogs';
import { useStores } from '../../../services/useStores';

interface InvCatalog {
  id: string;
  name: string;
  itemsCount: number;
}

const CURRENCIES = ['INR (₹)', 'USD ($)', 'EUR (€)'];
const YES_NO = ['Yes', 'No'];

interface CreateOrderCatalogProps {
  onBack: () => void;
  onCreate: (data?: any) => void;
  initialData?: any;
}

export const CreateOrderCatalog = ({ onBack, onCreate, initialData }: CreateOrderCatalogProps) => {
  const { data: inventoryCatalogs = [] } = useInventoryCatalogs();
  const { data: stores = [] } = useStores();
  const invCatalogs: InvCatalog[] = inventoryCatalogs.map((catalog: any) => ({
    id: catalog.uid || catalog.id,
    name: catalog.name || catalog.catalogName || 'Untitled Catalog',
    itemsCount: catalog.itemsCount || catalog.itemCount || catalog.items?.length || 0,
  }));
  const storeOptions = stores.map((store: any) => store.name || store.storeName).filter(Boolean);

  const [catalogName, setCatalogName] = useState(initialData?.name || '');
  const [selectedStore, setSelectedStore] = useState(initialData?.store || '');
  const [currency, setCurrency] = useState(initialData?.currency || 'INR (₹)');
  const [walkInPos, setWalkInPos] = useState(initialData?.walkInPos || 'Yes');
  const [storePickup, setStorePickup] = useState(initialData?.storePickup || 'Yes');
  const [homeDelivery, setHomeDelivery] = useState(initialData?.homeDelivery || 'No');
  const [inventoryManagement, setInventoryManagement] = useState(initialData?.inventoryManagement !== false);
  const [selectedInvCatalogs, setSelectedInvCatalogs] = useState<string[]>(initialData?.selectedInvCatalogs || []);
  const [description, setDescription] = useState(initialData?.description || '');
  const [showDescription, setShowDescription] = useState(!!initialData?.description);

  const toggleAll = () => {
    if (selectedInvCatalogs.length === invCatalogs.length) {
      setSelectedInvCatalogs([]);
    } else {
      setSelectedInvCatalogs(invCatalogs.map(item => item.id));
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
    <div className="flex flex-col flex-1 h-full bg-[#F8F9FA]">
      {/* Header */}
      <div className="bg-white border-b border-surface-100 py-3.5 px-8 flex items-center gap-4 shrink-0">
        <button
          onClick={onBack}
          className="p-1 hover:bg-surface-100 rounded transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-surface-900" />
        </button>
        <h1 className="text-lg font-bold text-surface-900 tracking-tight">
          Create New Order Catalog
        </h1>
      </div>

      <div className="flex-1 p-6 md:p-8 pb-32">
        {/* Unified workspace */}
        {/* clip-fix: no overflow-hidden — it clips the form's store/catalog/unit dropdowns (top-full). rounded+border keep corners. */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm">
          {/* Top segment: Catalog Details Form */}
          <div className="p-6 md:p-8 bg-[#FAFAFB]/50 border-b border-surface-100 space-y-6">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
              Catalog Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Catalog Name</label>
                <input
                  type="text"
                  value={catalogName}
                  onChange={(e) => setCatalogName(e.target.value)}
                  placeholder="Enter catalog name"
                  className="w-full px-4 py-2.5 bg-white border border-[#EAEBF0] rounded-xl text-sm focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none transition-all font-semibold"
                />
                {!showDescription ? (
                  <button
                    type="button"
                    onClick={() => setShowDescription(true)}
                    className="text-[11px] font-bold text-[#55349A] hover:underline pt-0.5 block"
                  >
                    + Add Catalog Description
                  </button>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider block">Catalog Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter catalog description..."
                      rows={3}
                      className="w-full px-4 py-2.5 bg-white border border-[#EAEBF0] rounded-xl text-sm focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none transition-all font-semibold resize-none"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Store</label>
                <div className="relative">
                  <button
                    onClick={() => setStoreOpen(!storeOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-[#EAEBF0] rounded-xl text-sm focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none transition-all font-semibold"
                  >
                    <span className={selectedStore ? "text-surface-900" : "text-surface-400"}>
                      {selectedStore || 'Select Store'}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform", storeOpen && "rotate-180")} />
                  </button>
                  {storeOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setStoreOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#EAEBF0] rounded-xl shadow-xl z-20 py-1.5 animate-in fade-in zoom-in-95 duration-200 origin-top">
                        {storeOptions.map((store) => (
                          <button
                            key={store}
                            className={cn(
                              "w-full text-left px-4 py-2 text-sm hover:bg-surface-50 transition-colors flex items-center justify-between font-semibold",
                              selectedStore === store ? "text-[#55349A] bg-primary-50/50" : "text-surface-700"
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-400 uppercase tracking-wider">Walk-in POS</label>
                <div className="relative">
                  <button
                    onClick={() => setWalkInOpen(!walkInOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-[#EAEBF0] rounded-xl text-sm font-semibold"
                  >
                    <span className="text-surface-900">{walkInPos}</span>
                    <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform", walkInOpen && "rotate-180")} />
                  </button>
                  {walkInOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setWalkInOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#EAEBF0] rounded-xl shadow-xl z-20 py-2">
                        {YES_NO.map((v) => (
                          <button key={v} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold" onClick={() => { setWalkInPos(v); setWalkInOpen(false); }}>{v}</button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-400 uppercase tracking-wider">Store Pickup</label>
                <div className="relative">
                  <button
                    onClick={() => setPickupOpen(!pickupOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-[#EAEBF0] rounded-xl text-sm font-semibold"
                  >
                    <span className="text-surface-900">{storePickup}</span>
                    <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform", pickupOpen && "rotate-180")} />
                  </button>
                  {pickupOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setPickupOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#EAEBF0] rounded-xl shadow-xl z-20 py-2">
                        {YES_NO.map((v) => (
                          <button key={v} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold" onClick={() => { setStorePickup(v); setPickupOpen(false); }}>{v}</button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-400 uppercase tracking-wider">Home Delivery</label>
                <div className="relative">
                  <button
                    onClick={() => setDeliveryOpen(!deliveryOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-[#FAFAFB] border border-[#EAEBF0] rounded-xl text-sm font-semibold"
                  >
                    <span className="text-surface-900">{homeDelivery}</span>
                    <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform", deliveryOpen && "rotate-180")} />
                  </button>
                  {deliveryOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setDeliveryOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#EAEBF0] rounded-xl shadow-xl z-20 py-2">
                        {YES_NO.map((v) => (
                          <button key={v} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold" onClick={() => { setHomeDelivery(v); setDeliveryOpen(false); }}>{v}</button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom segment: Inventory Management */}
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4 bg-surface-50 p-2 sm:pr-8 rounded-xl border border-surface-100">
                <button
                  onClick={() => setInventoryManagement(!inventoryManagement)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    inventoryManagement ? "bg-primary-600" : "bg-surface-200"
                  )}
                >
                  <span className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    inventoryManagement ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-surface-900">Inventory Management</span>
                  <span className="text-[11px] text-surface-400 font-semibold leading-none mt-0.5">Link an Inventory Catalog to enable item tracking</span>
                </div>
              </div>
            </div>

            <div className="w-full overflow-x-auto rounded-xl border border-surface-200 shadow-3xs mt-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50 border-y border-surface-100 select-none text-surface-400 text-[10.5px] font-bold uppercase tracking-wider">
                    <th className="px-[22px] py-2.5 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedInvCatalogs.length === invCatalogs.length && invCatalogs.length > 0}
                        onChange={toggleAll}
                        className="appearance-none h-5 w-5 min-w-[20px] min-h-[20px] rounded-[4px] border border-surface-300 bg-white checked:bg-[#55349A] checked:border-[#55349A] checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-[#55349A]/20 outline-none"
                      />
                    </th>
                    <th className="px-[22px] py-2.5 font-bold tracking-wider">INV.CATALOG NAME & ID</th>
                    <th className="px-[22px] py-2.5 font-bold tracking-wider">ITEMS COUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {invCatalogs.map((item) => (
                    <tr key={item.id} className="border-b border-surface-100 px-[22px] py-2.5 text-[12.5px] hover:bg-surface-50 transition-colors">
                      <td className="px-[22px] py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedInvCatalogs.includes(item.id)}
                          onChange={() => toggleItem(item.id)}
                          className="appearance-none h-5 w-5 min-w-[20px] min-h-[20px] rounded-[4px] border border-surface-300 bg-white checked:bg-[#55349A] checked:border-[#55349A] checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-[#55349A]/20 outline-none"
                        />
                      </td>
                      <td className="px-[22px] py-2.5">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-surface-900">{item.name}</span>
                          <span className="text-[11px] text-surface-400 mt-0.5">{item.catalogNo}</span>
                        </div>
                      </td>
                      <td className="px-[22px] py-2.5">
                        <span className="text-[13px] font-bold text-surface-900">{item.itemsCount} Items</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar Footer */}
      <div className="fixed bottom-0 right-0 left-0 bg-white border-t border-t-surface-200 px-10 py-4.5 flex items-center justify-end gap-3.5 z-30 shadow-md">
        <button
          onClick={onBack}
          className="px-8 py-2.5 bg-surface-100 border border-surface-200 rounded-lg text-sm font-bold text-surface-700 hover:bg-surface-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (!catalogName.trim()) {
              alert('Please enter a catalog name');
              return;
            }
            const isWholesale = catalogName.trim().toLowerCase() === 'wholesale catalog';
            const matchedStore = stores.find((s: any) => (s.name || s.storeName) === selectedStore);
            onCreate({
              id: initialData?.id ? initialData.id.replace('ORD', '') : (isWholesale ? '324567' : String(Math.floor(100000 + Math.random() * 900000))),
              name: catalogName,
              description,
              store: selectedStore,
              // Backend needs the store UUID, not its display name.
              storeUid: matchedStore?.id || initialData?.storeUid || selectedStore,
              currency,
              status: initialData?.status || (isWholesale ? 'Active' : 'Active'),
              itemsCount: initialData?.itemsCount || 0,
              walkInPos,
              storePickup,
              homeDelivery,
              inventoryManagement,
              selectedInvCatalogs,
              lastModified: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
            });
          }}
          className="px-8 py-2.5 bg-primary-600 text-white border border-primary-600 rounded-lg text-sm font-bold hover:bg-primary-705 transition-colors cursor-pointer"
        >
          {initialData ? 'Save Changes' : 'Create Catalog'}
        </button>
      </div>
    </div>
  );
};
