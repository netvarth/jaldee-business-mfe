import React, { useState, useMemo } from 'react';
import {
  X, Plus, Trash2, Search, User, Store, FileText,
  Calendar, Check, AlertCircle, Sparkles, ShoppingBag, ArrowRight
} from 'lucide-react';
import { useCreateOrderRequest } from '../services/useOrderRequests';
import { useStores } from '../services/useStores';
import { useCustomers, useCreateCustomer } from '../services/useCustomers';
import { useItems } from '../services/useItems';
import { useUnits } from '../services/useUnits';
import { cn } from '../new-karty-src/src/lib/utils';

interface CreateQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (createdUid?: string) => void;
}

interface QuotationLine {
  itemUid: string;
  itemName: string;
  unitUid?: string;
  unitName?: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export function CreateQuotationModal({ isOpen, onClose, onCreated }: CreateQuotationModalProps) {
  const createMutation = useCreateOrderRequest();
  const storesQ = useStores();
  const customersQ = useCustomers("", 0, 200);
  const itemsQ = useItems();
  const unitsQ = useUnits();
  const createCustomerMutation = useCreateCustomer();

  const [docType, setDocType] = useState<'QUOTATION' | 'ENQUIRY' | 'RX'>('QUOTATION');
  const [selectedStoreUid, setSelectedStoreUid] = useState<string>('');
  const [validityDays, setValidityDays] = useState<number>(15);
  const [notes, setNotes] = useState<string>('');

  // Customer selection
  const [customerMode, setCustomerMode] = useState<'existing' | 'new' | 'guest'>('existing');
  const [selectedCustomerUid, setSelectedCustomerUid] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustEmail, setNewCustEmail] = useState<string>('');
  const [newCustAddress, setNewCustAddress] = useState<string>('');

  // Items
  const [lines, setLines] = useState<QuotationLine[]>([]);
  const [itemSearch, setItemSearch] = useState<string>('');

  // Error / Loading
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stores = useMemo(() => storesQ.data ?? [], [storesQ.data]);
  const customers = useMemo(() => customersQ.data ?? [], [customersQ.data]);
  const allItems = useMemo(() => itemsQ.data ?? [], [itemsQ.data]);

  // Set default store
  React.useEffect(() => {
    if (stores.length > 0 && !selectedStoreUid) {
      setSelectedStoreUid(stores[0].id || stores[0].uid);
    }
  }, [stores, selectedStoreUid]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 10);
    const q = customerSearch.toLowerCase();
    return customers.filter((c: any) =>
      (c.displayName || `${c.firstName || ''} ${c.lastName || ''}`).toLowerCase().includes(q) ||
      (c.primaryNumber || c.phone || '').includes(q) ||
      (c.consumerNo || '').toLowerCase().includes(q)
    ).slice(0, 15);
  }, [customers, customerSearch]);

  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return allItems.slice(0, 8);
    const q = itemSearch.toLowerCase();
    return allItems.filter((i: any) =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.code || i.sku || '').toLowerCase().includes(q)
    ).slice(0, 12);
  }, [allItems, itemSearch]);

  const handleAddItem = (item: any) => {
    const defaultUnit = (item.units || []).find((u: any) => u.isDefault || u.selling) || item.units?.[0];
    const price = Number(defaultUnit?.sellingPrice || item.price || 0);
    const unitUid = defaultUnit?.unitUid || item.unitUid || undefined;
    const unitName = defaultUnit?.unitName || defaultUnit?.name || item.unit || 'Unit';

    setLines(prev => [
      ...prev,
      {
        itemUid: item.uid || item.id,
        itemName: item.name || 'Product',
        unitUid,
        unitName,
        qty: 1,
        unitPrice: price,
        lineTotal: price * 1,
      }
    ]);
    setItemSearch('');
  };

  const handleUpdateLineQty = (idx: number, newQty: number) => {
    if (newQty <= 0) {
      setLines(prev => prev.filter((_, i) => i !== idx));
      return;
    }
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, qty: newQty, lineTotal: newQty * l.unitPrice } : l));
  };

  const handleUpdateLinePrice = (idx: number, newPrice: number) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, unitPrice: newPrice, lineTotal: l.qty * newPrice } : l));
  };

  const totalAmount = useMemo(() => {
    return lines.reduce((acc, l) => acc + l.lineTotal, 0);
  }, [lines]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (lines.length === 0) {
      setErrorMsg("Please add at least one line item to the quotation.");
      return;
    }

    try {
      let finalConsumerUid: string | null = null;
      let finalConsumerName = "";
      let finalConsumerPhone = "";
      let finalConsumerEmail = "";

      if (customerMode === 'existing' && selectedCustomerUid) {
        finalConsumerUid = selectedCustomerUid;
        const c = customers.find((cust: any) => (cust.uid || cust.id) === selectedCustomerUid);
        finalConsumerName = c?.displayName || `${c?.firstName || ''} ${c?.lastName || ''}`.trim() || '';
        finalConsumerPhone = c?.primaryNumber || c?.phone || '';
        finalConsumerEmail = c?.email || '';
      } else if (customerMode === 'new' && newCustName.trim()) {
        try {
          const created = await createCustomerMutation.mutateAsync({
            firstName: newCustName.trim(),
            primaryNumber: newCustPhone.trim() || undefined,
            email: newCustEmail.trim() || undefined,
            address: newCustAddress.trim() || undefined,
          });
          finalConsumerUid = created?.uid || (created as any)?.id || null;
          finalConsumerName = newCustName.trim();
          finalConsumerPhone = newCustPhone.trim();
          finalConsumerEmail = newCustEmail.trim();
        } catch {
          finalConsumerName = newCustName.trim();
          finalConsumerPhone = newCustPhone.trim();
          finalConsumerEmail = newCustEmail.trim();
        }
      } else if (customerMode === 'guest') {
        finalConsumerName = "Walk-in Guest";
      }

      const validUntilDate = new Date();
      validUntilDate.setDate(validUntilDate.getDate() + validityDays);

      const payload = {
        docType,
        storeUid: selectedStoreUid || null,
        consumerUid: finalConsumerUid || null,
        consumerName: finalConsumerName || undefined,
        consumerPhone: finalConsumerPhone || undefined,
        consumerEmail: finalConsumerEmail || undefined,
        status: 'PENDING',
        notes: notes.trim() || undefined,
        validUntil: validUntilDate.toISOString(),
        itemsCount: lines.reduce((acc, l) => acc + l.qty, 0),
        totalAmount,
        items: lines.map(l => ({
          itemUid: l.itemUid,
          itemName: l.itemName,
          unitUid: l.unitUid,
          qty: l.qty,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
        })),
      };

      const res = await createMutation.mutateAsync(payload);
      const newUid = res?.uid || res?.id;
      if (onCreated) onCreated(newUid);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create quotation request");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col text-left font-sans overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#55349A] flex items-center justify-center font-black">
              <FileText className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Create Quotation / Order Request</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Prepare commercial pricing quotation or prescription estimate</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Top Row: Doc Type, Store, Validity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Document Type</label>
              <select
                value={docType}
                onChange={(e: any) => setDocType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#55349A]"
              >
                <option value="QUOTATION">Commercial Quotation (Quote)</option>
                <option value="ENQUIRY">Customer Inquiry</option>
                <option value="RX">Prescription / Rx Estimate</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Fulfillment Store</label>
              <select
                value={selectedStoreUid}
                onChange={(e) => setSelectedStoreUid(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#55349A]"
              >
                {stores.map((s: any) => (
                  <option key={s.id || s.uid} value={s.id || s.uid}>{s.name || 'Main Store'}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Validity Period</label>
              <select
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#55349A]"
              >
                <option value={7}>Valid for 7 Days</option>
                <option value={15}>Valid for 15 Days</option>
                <option value={30}>Valid for 30 Days</option>
                <option value={60}>Valid for 60 Days</option>
              </select>
            </div>
          </div>

          {/* Customer Selection Section */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase tracking-wider">
                <User className="h-4 w-4 text-[#55349A]" />
                <span>Customer Details</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCustomerMode('existing')}
                  className={cn("px-2.5 py-1 rounded-md transition-all cursor-pointer", customerMode === 'existing' ? "bg-white text-[#55349A] shadow-2xs" : "text-slate-600")}
                >
                  Existing CRM
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode('new')}
                  className={cn("px-2.5 py-1 rounded-md transition-all cursor-pointer", customerMode === 'new' ? "bg-white text-[#55349A] shadow-2xs" : "text-slate-600")}
                >
                  + New Customer
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode('guest')}
                  className={cn("px-2.5 py-1 rounded-md transition-all cursor-pointer", customerMode === 'guest' ? "bg-white text-[#55349A] shadow-2xs" : "text-slate-600")}
                >
                  Walk-in Guest
                </button>
              </div>
            </div>

            {customerMode === 'existing' && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search existing customer by name, mobile, or ID..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#55349A]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {filteredCustomers.map((c: any) => {
                    const cid = c.uid || c.id;
                    const isSel = selectedCustomerUid === cid;
                    return (
                      <button
                        key={cid}
                        type="button"
                        onClick={() => setSelectedCustomerUid(cid)}
                        className={cn(
                          "p-2 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all",
                          isSel ? "border-[#55349A] bg-purple-50/50 ring-1 ring-[#55349A]" : "border-slate-200 bg-white hover:bg-slate-50"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {c.displayName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Customer'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {c.primaryNumber || c.phone || 'No phone'}
                          </div>
                        </div>
                        {isSel && <Check className="h-4 w-4 text-[#55349A] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {customerMode === 'new' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Customer Full Name *"
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#55349A]"
                />
                <input
                  type="tel"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="Mobile / WhatsApp Number"
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#55349A]"
                />
                <input
                  type="email"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  placeholder="Email Address"
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#55349A]"
                />
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="Delivery Address / City"
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#55349A]"
                />
              </div>
            )}
          </div>

          {/* Line Items Builder Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                Line Items & Quotation Rates ({lines.length} items)
              </label>
            </div>

            {/* Search and add item */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search catalog products by name, code or SKU to add..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#55349A]"
              />
            </div>

            {itemSearch.trim() && (
              <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-lg space-y-1 max-h-48 overflow-y-auto">
                {filteredItems.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">No items match "{itemSearch}"</div>
                ) : (
                  filteredItems.map((item: any) => (
                    <button
                      key={item.uid || item.id}
                      type="button"
                      onClick={() => handleAddItem(item)}
                      className="w-full p-2 hover:bg-purple-50/60 rounded-lg text-left flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.code || item.sku || 'SKU'} · ₹{item.price || 0}</span>
                      </div>
                      <span className="text-xs font-bold text-[#55349A] flex items-center gap-1">+ Add</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Line Items Table */}
            {lines.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase">
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-2 text-center w-24">Qty</th>
                      <th className="py-2.5 px-2 text-right w-28">Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right w-28">Total</th>
                      <th className="py-2.5 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-900 text-xs block">{line.itemName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{line.unitName || 'Unit'}</span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={line.qty}
                            onChange={(e) => handleUpdateLineQty(idx, Number(e.target.value))}
                            className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-center text-xs font-bold outline-none focus:border-[#55349A]"
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) => handleUpdateLinePrice(idx, Number(e.target.value))}
                            className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-right text-xs font-mono font-bold outline-none focus:border-[#55349A]"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                          ₹{line.lineTotal.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => setLines(prev => prev.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quotation Remarks */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
              Quotation Terms & Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Terms of delivery, payment options, or customer instructions..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#55349A] resize-none"
            />
          </div>

          {/* Summary & Grand Total */}
          <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-[#55349A] uppercase tracking-wider block">Estimated Grand Total</span>
              <span className="text-xs text-slate-500 font-medium">{lines.length} product(s) · {lines.reduce((a, b) => a + b.qty, 0)} units</span>
            </div>
            <div className="text-xl font-black text-[#55349A] font-mono">
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2.5 bg-[#55349A] hover:bg-[#43287A] disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-98 flex items-center gap-2 cursor-pointer"
            >
              <span>{createMutation.isPending ? 'Creating Quotation…' : 'Create Quotation →'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
