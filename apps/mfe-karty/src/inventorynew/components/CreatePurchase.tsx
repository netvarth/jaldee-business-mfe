import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, ChevronDown, Calendar, Plus, 
  Search, ShoppingBasket, Check, X, Trash2,
  ChevronUp, Minus, Pencil, ArrowUpRight
} from '../icons';
import { cn } from '@jaldee/design-system';

interface CreatePurchaseProps {
  onBack: () => void;
  onCreate: (data: any) => void;
  onSend?: (data: any) => void;
}

const STORES = ['SIMRAN FASHIONS', 'East End Outlet', 'West Coast Retail', 'Kottayam Hub'];
const VENDORS = ['Vendor A', 'Vendor B', 'Vendor C'];
const CATALOGS = ['Main Hardware', 'Apparel 2024', 'Electronics Q3'];

export const CreatePurchase = ({ onBack, onCreate, onSend }: CreatePurchaseProps) => {
  const [purchaseNo, setPurchaseNo] = useState('123');
  const [billNo, setBillNo] = useState('ABC-5567');
  const [date, setDate] = useState('27-04-26');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedCatalog, setSelectedCatalog] = useState('');
  const [showNoteField, setShowNoteField] = useState(false);
  const [note, setNote] = useState('');

  const [vendorOpen, setVendorOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const [showItemModal, setShowItemModal] = useState(false);
  const [purchasedItems, setPurchasedItems] = useState<any[]>([]);
  const [taxBreakdownIndex, setTaxBreakdownIndex] = useState<number | null>(null);

  const handleAddItem = (itemData: any) => {
    setPurchasedItems([...purchasedItems, itemData]);
    setShowItemModal(false);
  };

  return (
    <div className="flex flex-col flex-1 min-h-full bg-[var(--color-surface-alt)]/20">
      {/* Header Bar */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] py-3.5 px-8 flex items-center gap-4 shrink-0 sticky top-0 z-[40]">
        <button 
          onClick={onBack}
          className="p-1 hover:bg-[var(--color-surface-alt)] rounded transition-colors border-0 bg-transparent cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-[var(--color-text-primary)]" />
        </button>
        <h1 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight">Create New Purchase</h1>
      </div>

      <div className="flex-1 p-8 space-y-6 pb-24 text-left">
        {/* Section 1: Purchase Details */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Purchase Details</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 text-left">
              {/* Purchase No */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Purchase No</label>
                <input 
                  type="text" 
                  value={purchaseNo}
                  onChange={(e) => setPurchaseNo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm font-medium text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all shadow-sm"
                />
              </div>

              {/* Bill No */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Bill No</label>
                <input 
                  type="text" 
                  value={billNo}
                  onChange={(e) => setBillNo(e.target.value)}
                  placeholder="Enter bill number"
                  className="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm font-medium text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all shadow-sm"
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Date</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm font-medium text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all shadow-sm pr-12"
                  />
                  <div className="absolute right-0 top-0 bottom-0 px-3 bg-[var(--color-primary-subtle)] border-l border-[var(--color-border)] rounded-r-xl flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
                  </div>
                </div>
              </div>

              {/* Vendor */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Vendor</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <button 
                      onClick={() => setVendorOpen(!vendorOpen)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all group cursor-pointer"
                    >
                      <span className={selectedVendor ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-disabled)]"}>
                        {selectedVendor || 'Select'}
                      </span>
                      <ChevronDown className={cn("h-4 w-4 text-[var(--color-text-secondary)] transition-transform", vendorOpen && "rotate-180")} />
                    </button>
                    {vendorOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setVendorOpen(false)} />
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-50 py-2 origin-top">
                          {VENDORS.map((v) => (
                            <button 
                              key={v}
                              className={cn(
                                "w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-surface-alt)] transition-colors flex items-center justify-between border-0 bg-transparent cursor-pointer",
                                selectedVendor === v ? "text-[var(--color-primary)] bg-[var(--color-primary-subtle)]" : "text-[var(--color-text-primary)]"
                              )}
                              onClick={() => {
                                setSelectedVendor(v);
                                setVendorOpen(false);
                              }}
                            >
                              {v}
                              {selectedVendor === v && <Check className="h-3.5 w-3.5" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <button className="px-3 bg-[var(--color-primary-subtle)] border border-[var(--color-border)] rounded-xl flex items-center justify-center hover:opacity-90 transition-colors cursor-pointer">
                    <Plus className="h-4 w-4 text-[var(--color-primary)]" strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* Store */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Store</label>
                <div className="relative">
                  <button 
                    onClick={() => setStoreOpen(!storeOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all group cursor-pointer"
                  >
                    <span className={selectedStore ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-disabled)]"}>
                      {selectedStore || 'Select'}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-[var(--color-text-secondary)] transition-transform", storeOpen && "rotate-180")} />
                  </button>
                  {storeOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setStoreOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-50 py-2 origin-top">
                        {STORES.map((s) => (
                          <button 
                            key={s}
                            className={cn(
                              "w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-surface-alt)] transition-colors flex items-center justify-between border-0 bg-transparent cursor-pointer",
                              selectedStore === s ? "text-[var(--color-primary)] bg-[var(--color-primary-subtle)]" : "text-[var(--color-text-primary)]"
                            )}
                            onClick={() => {
                              setSelectedStore(s);
                              setStoreOpen(false);
                            }}
                          >
                            {s}
                            {selectedStore === s && <Check className="h-3.5 w-3.5" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Inventory Catalog */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Inventory Catalog</label>
                <div className="relative">
                  <button 
                    onClick={() => setCatalogOpen(!catalogOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all group cursor-pointer"
                  >
                    <span className={selectedCatalog ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-disabled)]"}>
                      {selectedCatalog || 'Select'}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-[var(--color-text-secondary)] transition-transform", catalogOpen && "rotate-180")} />
                  </button>
                  {catalogOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setCatalogOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-50 py-2 origin-top">
                        {CATALOGS.map((c) => (
                          <button 
                            key={c}
                            className={cn(
                              "w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-surface-alt)] transition-colors flex items-center justify-between border-0 bg-transparent cursor-pointer",
                              selectedCatalog === c ? "text-[var(--color-primary)] bg-[var(--color-primary-subtle)]" : "text-[var(--color-text-primary)]"
                            )}
                            onClick={() => {
                              setSelectedCatalog(c);
                              setCatalogOpen(false);
                            }}
                          >
                            {c}
                            {selectedCatalog === c && <Check className="h-3.5 w-3.5" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              {showNoteField ? (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Purchase Note</label>
                  <textarea 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Enter purchase note..."
                    rows={3}
                    className="w-full px-4 py-2 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all resize-none"
                    autoFocus
                  />
                </div>
              ) : (
                <button 
                  onClick={() => setShowNoteField(true)}
                  className="text-[11px] font-bold text-[var(--color-primary)] hover:underline border-0 bg-transparent cursor-pointer"
                >
                  + Add Purchase Note
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Items/Products & Bill Details */}
        <div className="space-y-6 pb-24">
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] relative z-10 shrink-0 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-tight">Items/Products Info</h2>
              {purchasedItems.length > 0 && (
                <button 
                  onClick={() => setShowItemModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-text-primary)] text-[var(--color-surface)] rounded-lg text-xs font-bold hover:opacity-90 transition-all shadow-sm active:scale-95 border-0 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                  Add Item
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-x-auto">
              {purchasedItems.length === 0 ? (
                <div className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-[var(--color-surface)] rounded-b-xl overflow-hidden">
                  <div className="mb-6 relative">
                    <div className="w-24 h-24 bg-[var(--color-surface-alt)] rounded-full flex items-center justify-center">
                      <ShoppingBasket className="h-12 w-12 text-[var(--color-text-disabled)] stroke-[1px]" />
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                       <div className="w-8 h-8 translate-x-6 translate-y-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full flex items-center justify-center shadow-md">
                          <Plus className="h-4 w-4 text-[var(--color-text-disabled)]" />
                       </div>
                    </div>
                  </div>
                  
                  <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-2" id="select-items-heading">Select Items</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] max-w-xs mb-8">
                    Search and select items to initiate the purchase process.
                  </p>
                  
                  <button 
                    onClick={() => setShowItemModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[var(--color-text-primary)] text-[var(--color-surface)] rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md active:scale-95 border-0 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" strokeWidth={3} />
                    Add Item
                  </button>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-surface-alt)]/50 border-b border-[var(--color-border)]">
                      <th className="py-4 px-6 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest min-w-[220px]">Item Details</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest whitespace-nowrap">Quantity</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest whitespace-nowrap">Expires</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest whitespace-nowrap">MRP (₹)</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest whitespace-nowrap">Pur. Price (₹)</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest whitespace-nowrap">Disc. (₹)</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest whitespace-nowrap">Tax%</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest whitespace-nowrap">Net. Amount(₹)</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] uppercase">
                    {purchasedItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[var(--color-surface-alt)]/50 transition-colors align-top">
                        <td className="py-4 px-6">
                          <div className="flex items-start gap-4">
                            <div className="w-11 h-11 rounded-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 shrink-0">
                               <img src={item.image} className="w-full h-full object-cover rounded-md" />
                            </div>
                            <div className="flex flex-col gap-1.5 min-w-0">
                              <div className="flex flex-col">
                                <span className="text-[13px] font-bold text-[var(--color-text-primary)] leading-tight truncate">{item.name}</span>
                                <span className="text-[11px] text-[var(--color-text-secondary)]/60 font-bold mt-0.5">{item.details}</span>
                              </div>
                              <div className="px-2 py-0.5 bg-[var(--color-primary-subtle)] border border-[var(--color-primary)]/10 rounded text-[10px] font-extrabold text-[var(--color-primary)] w-fit whitespace-nowrap">
                                BATCH {item.batch} - {item.unit}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-[13px] font-bold text-[var(--color-text-secondary)]">{item.qty} + 0 FREE</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-[13px] font-bold text-[var(--color-text-secondary)]">{item.expDate.split('/').length > 1 ? item.expDate.split('/').slice(1).join(' ') : item.expDate}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-[13px] font-bold text-[var(--color-text-secondary)]">{parseFloat(item.mrp).toFixed(2)}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-[13px] font-bold text-[var(--color-text-secondary)]">{parseFloat(item.purchasePrice).toFixed(2)}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-[13px] font-bold text-[var(--color-text-secondary)]">{parseFloat(item.discount).toFixed(2)}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col relative group/tax">
                            <span className="text-[13px] font-bold text-[var(--color-text-secondary)]">0</span>
                            <button 
                              onClick={() => setTaxBreakdownIndex(taxBreakdownIndex === idx ? null : idx)}
                              className="flex items-center gap-0.5 text-[11px] font-bold text-[var(--color-primary)] hover:underline mt-0.5 uppercase w-fit border-0 bg-transparent cursor-pointer"
                            >
                              Tax Breakdown
                              <ArrowUpRight className="h-3 w-3" strokeWidth={3} />
                            </button>

                            {taxBreakdownIndex === idx && (
                              <>
                                <div className="fixed inset-0 z-[40]" onClick={() => setTaxBreakdownIndex(null)} />
                                <div className="absolute right-[-40px] top-0 w-[240px] bg-[var(--color-surface)] rounded-xl shadow-2xl border border-[var(--color-border)] z-[50] overflow-hidden uppercase">
                                  <div className="px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 text-left">
                                    <h3 className="text-[13px] font-extrabold text-[var(--color-text-primary)]">Tax Breakdown</h3>
                                  </div>
                                  <div className="p-5 space-y-4 text-left">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[12px] font-bold text-[var(--color-text-secondary)]">CGST%</span>
                                      <span className="text-[12px] font-bold text-[var(--color-text-disabled)]">0</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[12px] font-bold text-[var(--color-text-secondary)]">SGST%</span>
                                      <span className="text-[12px] font-bold text-[var(--color-text-disabled)]">0</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[12px] font-bold text-[var(--color-text-secondary)]">CESS%</span>
                                      <span className="text-[12px] font-bold text-[var(--color-text-disabled)]">0</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[12px] font-bold text-[var(--color-text-secondary)]">CESS Amount(₹)</span>
                                      <span className="text-[12px] font-bold text-[var(--color-text-disabled)]">₹ 0.00</span>
                                    </div>
                                    <div className="pt-3 border-t border-dashed border-[var(--color-border)] flex items-center justify-between">
                                      <span className="text-[12px] font-bold text-[var(--color-text-secondary)]">Taxable amount(₹)</span>
                                      <span className="text-[13px] font-black text-[var(--color-text-primary)]">₹ 0.00</span>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-[13px] font-black text-[var(--color-text-primary)]">{parseFloat(item.netAmount).toFixed(2)}</span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button className="w-9 h-9 flex items-center justify-center bg-[var(--color-primary-subtle)] text-[var(--color-primary)] rounded-xl border border-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 transition-colors shadow-sm active:scale-95 cursor-pointer">
                              <Pencil className="h-4 w-4" strokeWidth={2.5} />
                            </button>
                            <button 
                              onClick={() => setPurchasedItems(purchasedItems.filter((_, i) => i !== idx))}
                              className="w-9 h-9 flex items-center justify-center bg-[var(--color-danger-subtle)] text-[var(--color-danger)] rounded-xl border border-[var(--color-danger)]/15 hover:bg-[var(--color-danger)]/20 transition-colors shadow-sm active:scale-95 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {purchasedItems.length > 0 && (
            <div className="grid grid-cols-12 text-left">
              <div className="col-span-12 lg:col-start-9 lg:col-span-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden flex flex-col h-fit sticky top-6">
                  <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                    <h2 className="text-sm font-bold text-[var(--color-text-primary)] tracking-tight">Bill Details</h2>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--color-text-secondary)]/50 uppercase tracking-widest">Total quantity</span>
                      <span className="text-[13px] text-[var(--color-text-primary)] font-bold">
                        {purchasedItems.reduce((acc, item) => acc + (parseFloat(item.qty) || 0) + (parseFloat(item.freeQty) || 0), 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--color-text-secondary)]/50 uppercase tracking-widest">Gross amount</span>
                      <span className="text-[13px] text-[var(--color-text-primary)] font-black">
                        ₹{purchasedItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--color-text-secondary)]/50 uppercase tracking-widest">CGST%</span>
                      <span className="text-[13px] text-[var(--color-text-primary)] font-bold">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--color-text-secondary)]/50 uppercase tracking-widest">SGST%</span>
                      <span className="text-[13px] text-[var(--color-text-primary)] font-bold">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--color-text-secondary)]/50 uppercase tracking-widest">CESS%</span>
                      <span className="text-[13px] text-[var(--color-text-primary)] font-bold">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--color-text-secondary)]/50 uppercase tracking-widest">CESS Amount(₹)</span>
                      <span className="text-[13px] text-[var(--color-text-secondary)]/60 font-bold">₹ 0.00</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--color-text-secondary)]/50 uppercase tracking-widest">Taxable amount(₹)</span>
                      <span className="text-[13px] text-[var(--color-text-primary)] font-black">
                        ₹{purchasedItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
 
                    <div className="pt-2 flex items-center justify-between border-t border-[var(--color-border)]">
                      <span className="text-[11px] font-bold text-[var(--color-text-secondary)]/50 uppercase tracking-widest">Round Off</span>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[var(--color-text-secondary)]/50">₹</span>
                        <input 
                          type="text" 
                          value={purchasedItems.reduce((acc, item) => acc + (parseFloat(item.netAmount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          readOnly
                          className="w-36 pl-7 pr-4 py-2.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl text-[13px] font-black text-[var(--color-text-primary)] focus:outline-none text-right shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-[var(--color-surface-alt)] border-t border-dashed border-[var(--color-border)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[var(--color-text-primary)] font-bold">Net Bill Amount(₹)</span>
                      <span className="text-lg font-black text-[var(--color-text-primary)]">
                        ₹{purchasedItems.reduce((acc, item) => acc + (parseFloat(item.netAmount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer Actions */}
      {purchasedItems.length > 0 && (
        <div className="fixed bottom-0 right-0 left-0 bg-[var(--color-surface)]/80 backdrop-blur-md border-t border-[var(--color-border)] px-8 py-5 flex items-center justify-end gap-3 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
          <button 
            onClick={onBack}
            className="px-6 py-2.5 text-sm font-black text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors border-0 bg-transparent cursor-pointer"
          >
            Cancel
          </button>
          <button 
            onClick={() => onCreate({
              purchaseNo,
              billNo,
              date,
              vendor: selectedVendor,
              store: selectedStore,
              catalog: selectedCatalog,
              note,
              items: purchasedItems
            })}
            className="px-8 py-3 bg-[var(--color-text-primary)] text-[var(--color-surface)] rounded-xl text-[13px] font-black hover:opacity-90 transition-all shadow-sm active:scale-95 cursor-pointer border-0"
          >
            Save Purchase
          </button>
          <button 
            onClick={() => onSend?.({
              purchaseNo,
              billNo,
              date,
              vendor: selectedVendor,
              store: selectedStore,
              catalog: selectedCatalog,
              note,
              items: purchasedItems
            })}
            className="px-12 py-3 bg-[var(--color-primary)] text-[var(--color-primary-text)] rounded-xl text-[13px] font-black hover:opacity-90 transition-all shadow-lg active:scale-95 min-w-[220px] cursor-pointer border-0"
          >
            Create & Send
          </button>
        </div>
      )}

      {showItemModal && (
        <SelectItemModal 
          onClose={() => setShowItemModal(false)}
          onSave={handleAddItem}
        />
      )}
    </div>
  );
};

interface SelectItemModalProps {
  onClose: () => void;
  onSave: (item: any) => void;
}

const MOCK_ITEMS = [
  { id: 'item-1', name: 'Shirt', image: 'https://images.unsplash.com/photo-1523381235212-d73f49382117?w=400&h=400&fit=crop&q=80', details: 'Blue / Large / Male', sku: 'SHT-01', category: 'Apparel' },
  { id: 'item-2', name: 'Lantern Shirt', image: 'https://images.unsplash.com/photo-1624371414361-e6e8ea3024d0?w=400&h=400&fit=crop&q=80', details: 'White / Medium / Unisex', sku: 'LAN-SHT', category: 'Apparel' },
  { id: 'item-3', name: 'Black Linen Pant', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop&q=80', details: 'Black / 34 / Male', sku: 'LIN-PNT', category: 'Apparel' },
];

const SelectItemModal = ({ onClose, onSave }: SelectItemModalProps) => {
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);

  const [form, setForm] = useState({
    batch: 'ABC-5567',
    unit: 'Piece',
    qty: '50',
    expDate: '28/04/2026',
    freeQty: '12',
    mrp: '47',
    purchasePrice: '12',
    amount: '6',
    discount: '0',
    netAmount: '6'
  });

  const updateCalculations = (newForm: any) => {
    const qty = parseFloat(newForm.qty) || 0;
    const price = parseFloat(newForm.purchasePrice) || 0;
    const discount = parseFloat(newForm.discount) || 0;
    
    const amount = qty * price;
    const netAmount = amount - discount;
    
    setForm({
      ...newForm,
      amount: amount.toString(),
      netAmount: netAmount.toString()
    });
  };

  const handleInputChange = (field: string, value: string) => {
    const newForm = { ...form, [field]: value };
    if (['qty', 'purchasePrice', 'discount'].includes(field)) {
      updateCalculations(newForm);
    } else {
      setForm(newForm);
    }
  };

  const filteredItems = MOCK_ITEMS.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.sku.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (search.length > 0 && !selectedItem) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, [search, selectedItem]);

  const handleSelect = (item: any) => {
    setSelectedItem(item);
    setSearch(item.name);
    setShowResults(false);
  };

  const handleSave = () => {
    if (!selectedItem) return;
    onSave({
      ...selectedItem,
      ...form
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--color-text-primary)]/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[var(--color-surface)] w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
          <div className="flex flex-col text-left">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">Select Item</h2>
            <p className="text-sm text-[var(--color-text-secondary)] font-medium tracking-tight mt-0.5">Search & Choose item to purchase, and set inventory.</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all active:scale-95 border border-[var(--color-border)] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 p-8 space-y-8 overflow-y-auto">
          {/* Search Bar */}
          <div className="relative text-left">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-disabled)]" />
              <input 
                type="text"
                placeholder="Search Item by name or SKU..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (selectedItem) setSelectedItem(null);
                }}
                className="w-full pl-14 pr-4 py-4 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl text-base font-medium text-[var(--color-text-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/5 focus:border-[var(--color-primary)] outline-none transition-all placeholder:text-[var(--color-text-disabled)] shadow-sm"
              />
              {selectedItem && (
                <button 
                  onClick={() => {
                    setSelectedItem(null);
                    setSearch('');
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-[var(--color-surface-alt)] rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                >
                  <X className="h-4 w-4 text-[var(--color-text-secondary)]" />
                </button>
              )}
            </div>

            {/* Floating Search Results */}
            {showResults && filteredItems.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl z-20 py-3 max-h-[300px] overflow-y-auto">
                {filteredItems.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="w-full px-6 py-3 hover:bg-[var(--color-surface-alt)] flex items-center gap-4 transition-colors group border-0 bg-transparent text-left cursor-pointer"
                  >
                    <img src={item.image} className="w-10 h-10 rounded-lg object-cover border border-[var(--color-border)]" />
                    <div className="flex flex-col items-start translate-x-0 group-hover:translate-x-1 transition-transform">
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">{item.name}</span>
                      <span className="text-xs text-[var(--color-text-secondary)] font-medium">{item.details} • {item.sku}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Configuration Area */}
          <div className={cn(
            "space-y-8 transition-all duration-500",
            selectedItem ? "opacity-100 translate-y-0" : "opacity-30 pointer-events-none translate-y-4"
          )}>
            {/* Selected Item Card Detail */}
            <div className="flex items-center gap-4 p-4 bg-[var(--color-primary-subtle)] rounded-2xl border border-[var(--color-primary)]/10 text-left">
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-sm">
                <img src={selectedItem?.image || MOCK_ITEMS[0].image} alt="Selected" className="w-full h-full object-cover rounded-lg" />
              </div>
              <div className="flex flex-col">
                <h4 className="text-lg font-bold text-[var(--color-text-primary)] leading-tight">
                  {selectedItem?.name || 'Select an item to see details'}
                </h4>
                <p className="text-sm text-[var(--color-text-secondary)] font-medium tracking-tight mt-1">
                  {selectedItem?.details || 'Choose an item from search above'} {selectedItem && `• ${selectedItem.sku}`}
                </p>
              </div>
            </div>

            {/* Table Form (Matches reference image) */}
            <div className="overflow-x-auto pb-4 -mx-2">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="pb-3 px-3 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">Batch</th>
                    <th className="pb-3 px-3 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">Unit</th>
                    <th className="pb-3 px-3 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest text-center">Qty</th>
                    <th className="pb-3 px-3 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">Exp Date</th>
                    <th className="pb-3 px-3 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest text-center">Free Qty</th>
                    <th className="pb-3 px-3 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest text-center">MRP(T)</th>
                    <th className="pb-3 px-3 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest text-center">Purchase Price(T)</th>
                    <th className="pb-3 px-3 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest text-center">Amount(T)</th>
                    <th className="pb-3 px-3 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest text-center">Discount(T)</th>
                    <th className="pb-3 px-3 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest text-right">Net Amount(T)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-4 px-2">
                      <div className="relative min-w-[140px]">
                        <select 
                          value={form.batch}
                          onChange={(e) => setForm({...form, batch: e.target.value})}
                          className="w-full appearance-none pl-3 pr-8 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[13px] font-bold text-[var(--color-text-primary)] focus:border-[var(--color-primary)] outline-none transition-all shadow-sm"
                        >
                          <option>ABC-5567</option>
                          <option>BATCH-002</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-secondary)] pointer-events-none" />
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="relative min-w-[120px]">
                        <select 
                          value={form.unit}
                          onChange={(e) => setForm({...form, unit: e.target.value})}
                          className="w-full appearance-none pl-3 pr-8 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[13px] font-bold text-[var(--color-text-primary)] focus:border-[var(--color-primary)] outline-none transition-all shadow-sm"
                        >
                          <option>Piece</option>
                          <option>Box</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-secondary)] pointer-events-none" />
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <input 
                        type="text" 
                        value={form.qty}
                        onChange={(e) => handleInputChange('qty', e.target.value)}
                        className="w-20 px-3 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[13px] font-medium text-[var(--color-text-primary)] focus:border-[var(--color-primary)] outline-none transition-all shadow-sm text-center"
                      />
                    </td>
                    <td className="py-4 px-2">
                      <div className="relative min-w-[150px]">
                        <input 
                          type="text" 
                          value={form.expDate}
                          onChange={(e) => handleInputChange('expDate', e.target.value)}
                          className="w-full px-3 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[13px] font-medium text-[var(--color-text-primary)] focus:border-[var(--color-primary)] outline-none transition-all shadow-sm pr-9"
                        />
                        <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-primary)]" />
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <input 
                        type="text" 
                        value={form.freeQty}
                        onChange={(e) => handleInputChange('freeQty', e.target.value)}
                        className="w-16 mx-auto px-3 py-2.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl text-[13px] font-medium text-[var(--color-text-secondary)] outline-none text-center"
                      />
                    </td>
                    <td className="py-4 px-2">
                      <input 
                        type="text" 
                        value={form.mrp}
                        onChange={(e) => handleInputChange('mrp', e.target.value)}
                        className="w-16 mx-auto px-3 py-2.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl text-[13px] font-medium text-[var(--color-text-secondary)] outline-none text-center"
                      />
                    </td>
                    <td className="py-4 px-2 text-center">
                      <input 
                        type="text" 
                        value={form.purchasePrice}
                        onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                        className="w-24 px-3 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[13px] font-medium text-[var(--color-text-primary)] focus:border-[var(--color-primary)] outline-none transition-all shadow-sm text-center"
                      />
                    </td>
                    <td className="py-4 px-2 text-center">
                      <input 
                        type="text" 
                        value={form.amount}
                        readOnly
                        className="w-20 px-3 py-2.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl text-[13px] font-bold text-[var(--color-text-primary)] outline-none text-center"
                      />
                    </td>
                    <td className="py-4 px-2 text-center">
                      <input 
                        type="text" 
                        value={form.discount}
                        onChange={(e) => handleInputChange('discount', e.target.value)}
                        className="w-20 px-3 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[13px] font-medium text-[var(--color-text-primary)] focus:border-[var(--color-primary)] outline-none transition-all shadow-sm text-center"
                      />
                    </td>
                    <td className="py-4 px-2 text-right">
                      <input 
                        type="text" 
                        value={form.netAmount}
                        readOnly
                        className="w-24 px-3 py-2.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl text-[13px] font-bold text-[var(--color-text-primary)] outline-none text-right"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 flex items-center justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] transition-colors shadow-sm cursor-pointer"
          >
            Cancel
          </button>
          
          <div className="relative flex items-center">
            {saveMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSaveMenuOpen(false)} />
                <div className="absolute bottom-full right-0 mb-4 w-[320px] bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-[var(--color-border)] overflow-hidden z-50 p-2 text-left">
                  <button 
                    className="w-full p-3 flex items-center gap-4 hover:bg-[var(--color-surface-alt)] rounded-xl transition-colors text-left group border-0 bg-transparent cursor-pointer"
                    onClick={() => {
                      handleSave();
                      setSaveMenuOpen(false);
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-subtle)] flex items-center justify-center shrink-0">
                      <Plus className="h-5 w-5 text-[var(--color-primary)]" strokeWidth={3} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[var(--color-text-primary)] leading-none">Save & Create New</span>
                      <span className="text-[11px] text-[var(--color-text-secondary)] font-medium mt-1 leading-tight">Save this entry and start a new Item.</span>
                    </div>
                  </button>

                  <div className="my-1.5 h-px bg-[var(--color-border)] mx-2" />

                  <button 
                    className="w-full p-3 flex items-center gap-4 hover:bg-[var(--color-danger-subtle)] rounded-xl transition-colors text-left group border-0 bg-transparent cursor-pointer"
                    onClick={() => {
                      onClose();
                      setSaveMenuOpen(false);
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-danger-subtle)] flex items-center justify-center shrink-0">
                      <Minus className="h-5 w-5 text-[var(--color-danger)]" strokeWidth={3} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[var(--color-text-primary)] leading-none">Discard & Create New</span>
                      <span className="text-[11px] text-[var(--color-text-secondary)] font-medium mt-1 leading-tight">Discard this entry and start a new Invoice.</span>
                    </div>
                  </button>
                </div>
              </>
            )}

            <button 
              onClick={handleSave}
              disabled={!selectedItem}
              className="px-10 py-[15px] bg-[var(--color-primary)] text-[var(--color-primary-text)] rounded-l-xl text-sm font-bold hover:opacity-90 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:active:scale-100 cursor-pointer border-0"
            >
              Save
            </button>
            <div className="w-[1px] h-[50px] bg-white/20" />
            <button 
              disabled={!selectedItem}
              onClick={() => setSaveMenuOpen(!saveMenuOpen)}
              className={cn(
                "px-4 py-[15px] bg-[var(--color-primary)] text-[var(--color-primary-text)] rounded-r-xl hover:opacity-90 transition-all flex items-center justify-center disabled:opacity-50 border-0 cursor-pointer",
                saveMenuOpen && "bg-opacity-90"
              )}
            >
              <ChevronUp className={cn("h-5 w-5 transition-transform", saveMenuOpen && "rotate-180")} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
