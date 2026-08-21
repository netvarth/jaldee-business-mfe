import React, { useState } from 'react';
import {
  ArrowLeft, Search, ChevronDown,
  Calendar, ShoppingBasket, Plus,
  Trash2, MinusCircle, Pencil
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStores } from '../../../services/useStores';
import { useInventoryCatalogs } from '../../../services/useInventoryCatalogs';
import { useItems } from '../../../services/useItems';
import { useUnits } from '../../../services/useUnits';

interface TransferListItem {
  id: string;
  name: string;
  sku: string;
  batch: string;
  available: number;
  qty: number;
  image: string;
}

interface CreateStockTransferProps {
  onBack: () => void;
  onCreate?: (data: {
    fromStore: string;
    toStore: string;
    itemsCount: number;
    note?: string;
  }) => void;
}

export const CreateStockTransfer: React.FC<CreateStockTransferProps> = ({ onBack, onCreate }) => {
  const [fromStoreOpen, setFromStoreOpen] = useState(false);
  const [fromInventoryOpen, setFromInventoryOpen] = useState(false);
  const [toStoreOpen, setToStoreOpen] = useState(false);
  const [toInventoryOpen, setToInventoryOpen] = useState(false);

  const { data: backendStores } = useStores();
  const { data: backendCatalogs } = useInventoryCatalogs();
  const { data: backendItems } = useItems();
  const { data: transferUnitList = [] } = useUnits();
  const transferUnitName = (uid: string) => {
    const u: any = (transferUnitList as any[]).find((x) => x.uid === uid);
    if (!u) return uid ? `${uid.substring(0, 8)}…` : 'Base unit';
    return u.symbol ? `${u.name} (${u.symbol})` : u.name;
  };

  const [storesList, setStoresList] = useState<Array<{id: string, name: string}>>([]);
  const [inventoriesList, setInventoriesList] = useState<Array<{id: string, name: string}>>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);

  React.useEffect(() => {
    if (backendItems && backendItems.length > 0) {
      setItemsList(backendItems.map((i: any) => ({
        id: i.uid || i.id,
        name: i.name || i.itemName || 'Unknown Item',
        image: i.imageUrl || i.image || '',
        details: i.description || '',
        sku: i.sku || i.itemCode || '',
        available: i.inHand || 0,
        units: i.units || [],
      })));
    } else {
      setItemsList([]);
    }
  }, [backendItems]);

  React.useEffect(() => {
    if (backendStores && backendStores.length > 0) {
      setStoresList(backendStores.map((s: any) => ({ id: s.uid || s.id, name: s.name || s.storeName || s.id })));
    }
  }, [backendStores]);

  React.useEffect(() => {
    if (backendCatalogs && backendCatalogs.length > 0) {
      setInventoriesList(backendCatalogs.map((c: any) => ({ id: c.uid || c.id, name: c.name || c.catalogName || c.id, storeUid: c.storeUid })));
    }
  }, [backendCatalogs]);

  const [selectedFromStore, setSelectedFromStore] = useState('');
  const [selectedFromInventory, setSelectedFromInventory] = useState('');
  const [selectedToStore, setSelectedToStore] = useState('');
  const [selectedToInventory, setSelectedToInventory] = useState('');

  const fromInventoriesList = React.useMemo(() => {
    return inventoriesList.filter(i => !selectedFromStore || !i.storeUid || i.storeUid === selectedFromStore);
  }, [inventoriesList, selectedFromStore]);

  const toInventoriesList = React.useMemo(() => {
    return inventoriesList.filter(i => !selectedToStore || !i.storeUid || i.storeUid === selectedToStore);
  }, [inventoriesList, selectedToStore]);

  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');
  const [showSelectItemModal, setShowSelectItemModal] = useState(false);

  const [items, setItems] = useState<TransferListItem[]>([]);
  const [saveDropdownOpen, setSaveDropdownOpen] = useState(false);

  const [itemQtys, setItemQtys] = useState<Record<string, number>>({});
  const [itemBatches, setItemBatches] = useState<Record<string, string>>({});

  // Function to add selected items to transfer
  const addItemToTransfer = () => {
    const newItems: TransferListItem[] = itemsList
      .filter(item => itemQtys[item.id] > 0)
      .map(item => ({
        id: Math.random().toString(36).substr(2, 9),
        itemUid: item.id,
        units: item.units || [],
        unitUid: '',
        name: item.name,
        sku: item.sku,
        batch: itemBatches[item.id] || '',
        available: item.available,
        qty: itemQtys[item.id],
        image: item.image
      }));

    if (newItems.length > 0) {
      setItems([...items, ...newItems]);
      setItemQtys({});
    } else {
      setShowSelectItemModal(false);
      return;
    }
    setShowSelectItemModal(false);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-surface-50/20">
      {/* Page Header */}
      <div className="bg-white border-b border-surface-100 py-3.5 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-1 hover:bg-surface-100 rounded transition-colors text-surface-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-surface-900 tracking-tight">Create New Stock Transfer</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-8 pb-12 space-y-6">
        {/* Stock Transfer Details Card */}
        {/* NOTE: no `overflow-hidden` here — it clips the absolutely-positioned store/inventory
            dropdown panels (they open past the card edge). Rounded corners still clip via the border. */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm">
          <div className="p-6 border-b border-surface-100">
            <h2 className="text-[17px] font-bold text-surface-900">Stock Transfer Details</h2>
          </div>

          <div className="p-8 space-y-8">
            {/* Top Row: IDs and Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Stock Transfer No</label>
                <input
                  type="text"
                  defaultValue=""
                  className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-semibold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Bill No</label>
                <input
                  type="text"
                  placeholder="Batch number"
                  className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-semibold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Date</label>
                <div className="relative">
                  <input
                    type="text"
                    defaultValue="27-04-26"
                    className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-semibold"
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-500" />
                </div>
              </div>
            </div>

            {/* Middle Row: Transfer From and To */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-4">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Transfer From</label>
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <button
                      onClick={() => setFromStoreOpen(!fromStoreOpen)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all group"
                    >
                      <span className={selectedFromStore ? "text-surface-900 font-semibold" : "text-surface-400 font-semibold"}>
                        {storesList.find(s => s.id === selectedFromStore)?.name || 'Select Store'}
                      </span>
                      <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform", fromStoreOpen && "rotate-180")} />
                    </button>
                    {fromStoreOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in duration-200 origin-top">
                        {storesList.map(s => (
                          <button key={s.id} onClick={() => { setSelectedFromStore(s.id); setFromStoreOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold text-surface-700 transition-colors">{s.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative flex-1">
                    <button
                      onClick={() => setFromInventoryOpen(!fromInventoryOpen)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all group"
                    >
                      <span className={selectedFromInventory ? "text-surface-900 font-semibold" : "text-surface-400 font-semibold"}>
                        {inventoriesList.find(i => i.id === selectedFromInventory)?.name || 'Select Inventory'}
                      </span>
                      <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform", fromInventoryOpen && "rotate-180")} />
                    </button>
                    {fromInventoryOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in duration-200 origin-top">
                        {fromInventoriesList.map(i => (
                          <button key={i.id} onClick={() => { setSelectedFromInventory(i.id); setFromInventoryOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold text-surface-700 transition-colors">{i.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Transfer To</label>
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <button
                      onClick={() => setToStoreOpen(!toStoreOpen)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all group"
                    >
                      <span className={selectedToStore ? "text-surface-900 font-semibold" : "text-surface-400 font-semibold"}>
                        {storesList.find(s => s.id === selectedToStore)?.name || 'Select Store'}
                      </span>
                      <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform", toStoreOpen && "rotate-180")} />
                    </button>
                    {toStoreOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in duration-200 origin-top">
                        {storesList.map(s => (
                          <button key={s.id} onClick={() => { setSelectedToStore(s.id); setToStoreOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold text-surface-700 transition-colors">{s.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative flex-1">
                    <button
                      onClick={() => setToInventoryOpen(!toInventoryOpen)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all group"
                    >
                      <span className={selectedToInventory ? "text-surface-900 font-semibold" : "text-surface-400 font-semibold"}>
                        {inventoriesList.find(i => i.id === selectedToInventory)?.name || 'Select Inventory'}
                      </span>
                      <ChevronDown className={cn("h-4 w-4 text-surface-400 transition-transform", toInventoryOpen && "rotate-180")} />
                    </button>
                    {toInventoryOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-xl z-20 py-2 animate-in fade-in zoom-in duration-200 origin-top">
                        {toInventoriesList.map(i => (
                          <button key={i.id} onClick={() => { setSelectedToInventory(i.id); setToInventoryOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-50 font-semibold text-surface-700 transition-colors">{i.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Note Section */}
            <div className="space-y-4">
              {!showNoteInput ? (
                <button
                  onClick={() => setShowNoteInput(true)}
                  className="text-[13px] font-bold text-[#55349A] hover:underline underline-offset-4 decoration-dotted"
                >
                  Add Transfer Note
                </button>
              ) : (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Transfer Note</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Enter some notes about this transfer..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-semibold"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items/Products Card */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
          <div className="p-6 flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-surface-900">Items/Products</h2>
            <button
              onClick={() => setShowSelectItemModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-surface-900 text-white rounded-lg text-[13px] font-bold hover:bg-black transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>

          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-32 h-32 bg-surface-50 rounded-full flex items-center justify-center mb-6 relative">
                <div className="relative">
                  <ShoppingBasket className="h-16 w-16 text-surface-200" />
                  <div className="absolute -right-2 -bottom-2 bg-surface-300 rounded-full p-1.5 border-4 border-surface-50">
                    <Plus className="h-5 w-5 text-white stroke-[3px]" />
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-bold text-surface-900 mb-2">Select Items</h3>
              <p className="text-[15px] text-surface-400 font-medium max-w-xs mb-8">
                Search and select items to initiate the purchase process.
              </p>

              <button
                onClick={() => setShowSelectItemModal(true)}
                className="flex items-center gap-3 px-8 py-3 bg-[#262626] text-white rounded-xl text-[15px] font-bold hover:bg-black transition-all shadow-xl shadow-black/10"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50 border-y border-surface-100">
                    <th className="py-4 px-8 text-[11px] font-bold text-surface-400 uppercase tracking-[0.05em]">ITEM DETAILS</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-surface-400 uppercase tracking-[0.05em]">SKU</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-surface-400 uppercase tracking-[0.05em]">BATCH</th>
                    <th className="py-4 px-12 text-[11px] font-bold text-surface-400 uppercase tracking-[0.05em]">QUANTITY</th>
                    <th className="py-4 px-8 text-[11px] font-bold text-surface-400 uppercase tracking-[0.05em] text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-50/50 transition-colors group">
                      <td className="py-5 px-8">
                        <div className="flex items-center gap-4">
                          <img src={item.image} alt={item.name} className="h-12 w-10 rounded-lg shadow-sm object-cover border border-surface-100" />
                          <div className="flex flex-col">
                            <span className="font-bold text-surface-900 text-[15px]">{item.name}</span>
                            <span className="text-[11px] text-surface-400 font-medium tracking-tight">Blue / Large / Male</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <span className="text-sm font-bold text-surface-600 tracking-tight">{item.sku}</span>
                      </td>
                      <td className="py-5 px-6">
                        <span className="text-[11px] font-bold text-surface-900 bg-surface-50 px-3 py-1.5 rounded-lg border border-surface-100 uppercase">{item.batch}</span>
                      </td>
                      <td className="py-5 px-12">
                        <span className="text-[15px] font-bold text-surface-600">{item.qty}</span>
                        {((item as any).units?.length > 0) && (
                          <select
                            value={(item as any).unitUid || ''}
                            onChange={(e) => setItems(items.map(it => it.id === item.id ? ({ ...it, unitUid: e.target.value } as any) : it))}
                            className="mt-2 block w-full px-2 py-1 bg-surface-50 border border-surface-200 rounded-lg text-[11px] font-bold text-surface-700 outline-none cursor-pointer"
                          >
                            <option value="">Base unit</option>
                            {(item as any).units.map((u: any) => (
                              <option key={u.unitUid} value={u.unitUid}>{transferUnitName(u.unitUid)}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-5 px-8 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-2 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-all"
                            title="Edit item"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        </div>
      </div>

      {/* Sticky Footer Bar */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-surface-100 py-4 px-8 flex items-center justify-end gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10">
        <button
          onClick={onBack}
          className="px-8 py-2.5 border border-surface-200 rounded-xl text-sm font-bold text-surface-500 hover:bg-surface-50 transition-all min-w-[120px]"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (onCreate) {
              onCreate({
                fromStore: storesList.find(s => s.id === selectedFromStore)?.name || selectedFromStore,
                toStore: storesList.find(s => s.id === selectedToStore)?.name || selectedToStore,
                fromStoreUid: selectedFromStore || null,
                toStoreUid: selectedToStore || null,
                itemsCount: items.reduce((acc, it) => acc + it.qty, 0),
                note: note,
                items: items.map((it) => ({
                  itemUid: (it as any).itemUid,
                  qtySent: it.qty,
                  qtyReceived: 0,
                  unitUid: (it as any).unitUid || null,
                  batchNumber: it.batch || null,
                })),
              } as any);
            } else {
              onBack();
            }
          }}
          className="px-10 py-2.5 bg-[#55349A] text-white rounded-xl text-sm font-bold hover:bg-[#452a7d] transition-all shadow-lg shadow-primary-600/20 min-w-[140px]"
        >
          Transfer Request
        </button>
      </div>

      {/* Select Item Modal Popup */}
      {showSelectItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-8 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold text-surface-900">Select Item</h2>
                <p className="text-[15px] text-surface-400 font-medium tracking-tight">
                  Search & Choose item to Transfer, and set inventory.
                </p>
              </div>
              <button
                onClick={() => setShowSelectItemModal(false)}
                className="p-2.5 hover:bg-surface-50 rounded-full text-surface-400 transition-colors border border-surface-100"
              >
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>

            {/* Modal Search */}
            <div className="px-8 pb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-300" />
                <input
                  type="text"
                  placeholder="Search."
                  className="w-full max-w-[360px] pl-11 pr-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            {/* Modal Table content — flex-1 + own scroll so the footer stays pinned & reachable */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-50/50">
                    <th className="py-4 px-8 text-[11px] font-bold text-surface-400 uppercase tracking-widest text-left">ITEM</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-surface-400 uppercase tracking-widest text-left">SKU</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-surface-400 uppercase tracking-widest text-left">BATCH</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-surface-400 uppercase tracking-widest text-left">AVAILABLE</th>
                    <th className="py-4 px-8 text-[11px] font-bold text-surface-400 uppercase tracking-widest text-left">QTY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {itemsList.map(item => (
                    <tr key={item.id} className="group transition-colors">
                      <td className="py-5 px-8">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-12 bg-surface-100 rounded-lg overflow-hidden shrink-0 border border-surface-200">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-surface-900 text-[15px]">{item.name}</span>
                            <span className="text-[11px] text-surface-400 mt-0.5">{item.details}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <span className="text-sm font-bold text-surface-700 font-mono tracking-tight">{item.sku}</span>
                      </td>
                      <td className="py-5 px-6">
                        <div className="relative">
                          <select
                            value={itemBatches[item.id] || ''}
                            onChange={(e) => setItemBatches(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className="w-full appearance-none px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-700 min-w-[140px] hover:border-surface-300 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500"
                          >
                            <option value="">Select batch</option>
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <span className="text-[15px] font-bold text-surface-700">{item.available}</span>
                      </td>
                      <td className="py-5 px-8">
                        <input
                          type="number"
                          min="0"
                          value={itemQtys[item.id] || ''}
                          onChange={(e) => setItemQtys(prev => ({ ...prev, [item.id]: parseInt(e.target.value) || 0 }))}
                          placeholder="0"
                          className="w-full max-w-[120px] px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-[15px] font-bold text-surface-900 focus:ring-2 focus:outline-none focus:ring-primary-500/10 focus:border-primary-500 text-center"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer with Dropdown — shrink-0 so it never scrolls out of reach (was mt-32, which shoved Save off-screen) */}
            <div className="shrink-0 p-8 border-t border-surface-100 flex items-center justify-end gap-4 bg-white relative">
              <button
                onClick={() => setShowSelectItemModal(false)}
                className="px-8 py-3.5 border border-surface-200 rounded-xl text-lg font-bold text-surface-500 hover:bg-surface-50 transition-all min-w-[140px]"
              >
                Cancel
              </button>

              <div className="relative flex shadow-lg shadow-primary-600/20">
                <button
                  onClick={addItemToTransfer}
                  className="px-12 py-3.5 bg-[#55349A] text-white rounded-l-xl text-xl font-bold hover:bg-[#452a7d] transition-all min-w-[140px]"
                >
                  Save
                </button>
                <div className="w-px bg-white/20 my-2" />
                <button
                  onClick={() => setSaveDropdownOpen(!saveDropdownOpen)}
                  className="px-3 py-3.5 bg-[#55349A] text-white rounded-r-xl hover:bg-[#452a7d] transition-all border-l border-white/10"
                >
                  <ChevronDown className={cn("h-6 w-6 transition-transform duration-200", saveDropdownOpen && "rotate-180")} />
                </button>

                {/* Dropdown Menu - EXACTLY as per catalog image */}
                {saveDropdownOpen && (
                  <div className="absolute bottom-full right-0 mb-3 w-[360px] bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden z-[60] animate-in slide-in-from-bottom-4 duration-200">
                    <div className="flex flex-col p-2 gap-1">
                      <button
                        onClick={() => { addItemToTransfer(); setSaveDropdownOpen(false); }}
                        className="flex items-center gap-4 p-4 hover:bg-surface-50 rounded-xl transition-all text-left group"
                      >
                        <div className="h-10 w-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 group-hover:bg-primary-100">
                          <Plus className="h-6 w-6 stroke-[3px]" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[17px] font-bold text-surface-900 leading-tight">Save & Create New</span>
                          <span className="text-[13px] font-medium text-surface-400">Save this entry and start a new Item.</span>
                        </div>
                      </button>

                      <div className="h-px bg-surface-100 mx-4" />

                      <button
                        onClick={() => { setShowSelectItemModal(false); setSaveDropdownOpen(false); }}
                        className="flex items-center gap-4 p-4 hover:bg-red-50 rounded-xl transition-all text-left group"
                      >
                        <div className="h-10 w-10 bg-red-50 rounded-lg flex items-center justify-center text-red-600 group-hover:bg-red-100">
                          <MinusCircle className="h-6 w-6 stroke-[3px]" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[17px] font-bold text-surface-900 leading-tight">Discard & Create New</span>
                          <span className="text-[13px] font-medium text-surface-400">Discard this entry and start a new invoice.</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
