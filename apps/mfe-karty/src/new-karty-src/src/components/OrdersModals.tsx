import { motion } from 'motion/react';
import { useState } from 'react';
import { X, Check, Star, Printer, XCircle, MapPin, Edit2, Loader2, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useUpdateOrder, useUpdateOrderStatus } from '../../../services/useOrders';
import { InvoiceSheet } from '../../../pages/TaxInvoicePage';
import { useOrderInvoice } from '../../../services/useOrderInvoice';
import { cn } from '../lib/utils';
import type { OrderItem } from './OrdersTable';

/**
 * Leaf modal/overlay components extracted verbatim from OrdersTable.tsx (Phase 1 of the
 * OrdersTable split). Each is pure presentational: it receives the target order plus its
 * close/select callbacks and owns no state. Parents keep rendering them conditionally inside
 * their existing <AnimatePresence> so exit animations are unchanged.
 */

type OrderLabel = { text: string; color: string; bg: string };
type Assignee = { uid?: string; name: string; role: string; avatar: string };

export function OrderLabelModal({
  order,
  labels,
  onSelect,
  onClose,
}: {
  order: OrderItem;
  labels: OrderLabel[];
  onSelect: (orderId: string, label: OrderLabel) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-surface-900/40 backdrop-blur-xs"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl border border-surface-200 w-full max-w-sm z-10 overflow-hidden text-left"
      >
        <div className="px-5 py-4 border-b border-surface-150 flex justify-between items-center">
          <span className="text-xs font-extrabold text-[#55349A] uppercase tracking-wide">Assign Status Tag</span>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-650">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-2">
          <p className="text-xs text-surface-400 mb-2 font-medium">Define immediate label tag on order #{order.id}</p>
          {labels.map((lbl, i) => (
            <button
              key={i}
              onClick={() => onSelect(order.id, lbl)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-surface-100 hover:border-[#55349A] hover:bg-primary-50/20 text-xs font-bold transition-all text-left"
            >
              <span
                className="px-2 py-0.5 rounded text-[10px]"
                style={{ color: lbl.color, backgroundColor: lbl.bg }}
              >
                {lbl.text}
              </span>
              <Check className={cn("h-4 w-4 text-primary-600 transition-opacity", order.label?.text === lbl.text ? "opacity-100" : "opacity-0")} />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export function OrderAssigneeModal({
  order,
  assignees,
  onSelect,
  onClose,
}: {
  order: OrderItem;
  assignees: Assignee[];
  onSelect: (orderId: string, assignee: Assignee) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-surface-900/40 backdrop-blur-xs"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl border border-surface-200 w-full max-w-sm z-10 overflow-hidden text-left"
      >
        <div className="px-5 py-3.5 border-b border-surface-150 flex justify-between items-center bg-surface-50">
          <span className="text-xs font-extrabold text-[#55349A] uppercase tracking-wide">Select Team Assignee</span>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-650">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-2 max-h-[350px] overflow-y-auto">
          {assignees.map((asg, i) => (
            <button
              key={i}
              onClick={() => onSelect(order.id, asg)}
              className="w-full p-2.5 rounded-xl border border-surface-150 hover:bg-primary-50/20 hover:border-[#55349A] transition-all flex items-center gap-3 text-left cursor-pointer"
            >
              <div className="h-8 w-8 rounded-full bg-primary-100 text-[#55349A] flex items-center justify-center font-bold text-xs shrink-0">
                {asg.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold text-surface-900 truncate">{asg.name}</p>
                <p className="text-[10px] text-surface-400 font-semibold">{asg.role}</p>
              </div>
              <Check className={cn("h-4 w-4 text-[#55349A]", order.assignee?.name === asg.name ? "opacity-100" : "opacity-0")} />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export function OrderTemplateModal({
  order,
  onSelect,
  onClose,
}: {
  order: OrderItem;
  onSelect: (orderId: string, template: 'Standard' | 'Elegant' | 'Compact') => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-surface-900/40 backdrop-blur-xs"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl border border-surface-200 w-full max-w-sm z-10 overflow-hidden text-left"
      >
        <div className="px-5 py-3.5 border-b border-surface-150 flex justify-between items-center bg-surface-50">
          <span className="text-xs font-extrabold text-[#55349A] uppercase tracking-wide">Choose Invoice Template</span>
          <button onClick={onClose} className="text-surface-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <button
            onClick={() => onSelect(order.id, 'Standard')}
            className="w-full p-3 border border-surface-150 hover:border-primary-500 rounded-xl hover:bg-primary-50/10 text-left transition-all"
          >
            <p className="text-xs font-black text-surface-950">Standard Minimalist</p>
            <p className="text-[10px] text-surface-400 font-medium mt-0.5">Classic corporate invoice grid with system Helvetica layout.</p>
          </button>

          <button
            onClick={() => onSelect(order.id, 'Elegant')}
            className="w-full p-3 border border-surface-150 hover:border-primary-500 rounded-xl hover:bg-primary-50/10 text-left transition-all font-serif"
          >
            <p className="text-xs font-black text-[#55349A]">Elegant Premium</p>
            <p className="text-[10px] text-surface-400 font-medium font-sans mt-0.5">Stylish display fonts, top colored branding bar, and serif spacing.</p>
          </button>

          <button
            onClick={() => onSelect(order.id, 'Compact')}
            className="w-full p-3 border border-surface-150 hover:border-primary-500 rounded-xl hover:bg-primary-50/10 text-left transition-all font-mono text-xs"
          >
            <p className="font-black text-surface-850">Compact Receipt</p>
            <p className="text-[10px] text-surface-400 font-sans mt-0.5">Dot-matrix style layout optimized for thermal paper billing receipts.</p>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function OrderRatingModal({
  order,
  onClose,
}: {
  order: OrderItem;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-surface-900/40 backdrop-blur-xs"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl border border-surface-200 w-full max-w-sm z-10 overflow-hidden text-left"
      >
        <div className="px-5 py-3.5 border-b border-surface-150 flex justify-between items-center bg-surface-50">
          <span className="text-xs font-extrabold text-[#55349A] uppercase tracking-wide">Client Rating & Review</span>
          <button onClick={onClose} className="text-surface-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {order.review ? (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 bg-amber-50 rounded-xl px-4 py-3 border border-amber-500/10">
                <div className="flex text-amber-500 gap-0.5">
                  {Array.from({ length: order.review.rating }).map((_, i) => (
                    <Star key={i} className="h-4.5 w-4.5 fill-current" />
                  ))}
                </div>
                <span className="text-xs font-black text-amber-700 ml-auto">{order.review.rating} / 5 Stars</span>
              </div>

              <div className="text-xs text-surface-600 italic leading-relaxed border-l-4 border-amber-400 pl-3">
                "{order.review.comment}"
              </div>

              <p className="text-[10px] text-surface-400 font-mono font-bold">Feedback Date: {order.review.date}</p>
            </div>
          ) : (
            <div className="text-center py-6 text-surface-400 space-y-2">
              <Star className="h-10 w-10 text-surface-250 mx-auto" />
              <div>
                <p className="text-sm font-bold text-surface-700">No Review Submitted Yet</p>
                <p className="text-xs font-semibold mt-1">Order status is currently "{order.status}". Reviews can be posted by clients once they receive products.</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function PhotoLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
      />
      <div className="relative max-w-4xl max-h-[85vh] z-10 overflow-hidden flex flex-col items-center gap-4">
        <img
          src={src}
          alt="Enlarged Review Attachment"
          className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border-2 border-white/10"
          referrerPolicy="no-referrer"
        />
        <button
          onClick={onClose}
          className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-black rounded-full shadow-lg border-none cursor-pointer transition-all flex items-center gap-1.5"
        >
          <X className="h-4 w-4 stroke-[2.5]" />
          Close Image
        </button>
      </div>
    </div>
  );
}

export function OrderDetailDrawer({
  order,
  onClose,
  onPrintInvoice,
  onCancelOrder,
}: {
  order: OrderItem;
  onClose: () => void;
  onPrintInvoice: (order: OrderItem) => void;
  onCancelOrder: (orderId: string) => void;
}) {
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [shippingAddress, setShippingAddress] = useState(order.shippingAddress || '');
  const [billingAddress, setBillingAddress] = useState(order.billingAddress || '');
  const [sameAsShipping, setSameAsShipping] = useState(!order.billingAddress || order.billingAddress === order.shippingAddress);
  const [addressSavedMsg, setAddressSavedMsg] = useState<string | null>(null);

  const updateOrder = useUpdateOrder();
  const updateStatus = useUpdateOrderStatus();

  const handleSaveAddresses = async () => {
    const finalBilling = sameAsShipping ? shippingAddress : billingAddress;
    try {
      await updateOrder.mutateAsync({
        uid: order.id,
        payload: {
          shippingAddress: shippingAddress.trim() || null,
          billingAddress: finalBilling.trim() || null,
        },
      });
      order.shippingAddress = shippingAddress.trim() || undefined;
      order.billingAddress = finalBilling.trim() || undefined;
      setIsEditingAddress(false);
      setAddressSavedMsg("Address updated successfully!");
      setTimeout(() => setAddressSavedMsg(null), 3000);
    } catch (err: any) {
      alert("Failed to update address: " + (err?.message || "Server error"));
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-surface-900/30 backdrop-blur-xs"
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="bg-white border-l border-surface-200 w-full max-w-md z-10 shadow-2xl relative flex flex-col h-full text-left"
      >
        <div className="px-6 py-5 border-b border-surface-150 flex items-center justify-between bg-surface-50">
          <div>
            <h3 className="text-sm font-black text-surface-900 uppercase tracking-tight">Order Details</h3>
            <p className="text-[11px] text-surface-400 font-mono mt-0.5">{order.id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-200 rounded-lg transition-colors text-surface-400 hover:text-surface-750">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Visual state map */}
          <div className="border border-surface-150 rounded-xl p-4 bg-[#FAF9F6]">
            <span className="text-[9px] font-black text-surface-400 tracking-widest uppercase block mb-3">Workflow State</span>
            <div className="flex gap-2 items-center text-xs">
              <span className={cn(
                "px-2.5 py-1 rounded-lg font-black border",
                order.status === 'Cancelled' ? "bg-red-50 text-red-650 border-red-200" : "bg-primary-50 text-[#55349A] border-primary-100"
              )}>
                {order.status}
              </span>
              <span className="text-surface-300">|</span>
              <span className="text-surface-500 font-semibold">{order.date}</span>
            </div>
          </div>

          <div className="space-y-4">
            <span className="text-[10px] font-black text-surface-400 tracking-wider uppercase block border-b border-surface-100 pb-1">Client Profile</span>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-surface-400 font-bold">Client Name:</span>
                <span className="text-xs text-surface-900 font-extrabold">{order.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-surface-400 font-bold">Account ID:</span>
                <span className="text-xs text-surface-700 font-mono">{order.customerId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-surface-400 font-bold">Billing Channel:</span>
                <span className="text-xs text-surface-900 font-extrabold uppercase">{order.channel}</span>
              </div>
              <div className="flex justify-between border-t border-surface-100/50 pt-2">
                <span className="text-xs text-surface-400 font-bold">Designated Store:</span>
                <span className="text-xs text-[#55349A] font-extrabold uppercase">{order.store || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-surface-400 font-bold">Invoice Type:</span>
                <span className="text-xs text-surface-800 font-black">{order.invoiceType || "B2H"}</span>
              </div>
              <div className="flex flex-col gap-1 border-t border-surface-100/50 pt-2">
                <span className="text-[10px] text-surface-400 font-black uppercase tracking-wider">Access Catalogs:</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {(order.catalogs || []).map((cat, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-purple-50 text-[#55349A] border border-purple-100 rounded-md text-[10px] font-bold">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Addresses & Shipping */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-surface-100 pb-1">
              <span className="text-[10px] font-black text-surface-400 tracking-wider uppercase flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-primary-600" />
                <span>Addresses & Delivery</span>
              </span>
              {!isEditingAddress && (
                <button
                  type="button"
                  onClick={() => {
                    setShippingAddress(order.shippingAddress || '');
                    setBillingAddress(order.billingAddress || '');
                    setSameAsShipping(!order.billingAddress || order.billingAddress === order.shippingAddress);
                    setIsEditingAddress(true);
                  }}
                  className="text-primary-600 hover:text-primary-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                >
                  <Edit2 className="h-2.5 w-2.5" />
                  <span>{order.shippingAddress || order.billingAddress ? 'Edit' : '+ Add Address'}</span>
                </button>
              )}
            </div>

            {addressSavedMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>{addressSavedMsg}</span>
              </div>
            )}

            {isEditingAddress ? (
              <div className="p-3.5 bg-surface-50 rounded-xl border border-surface-200 space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-wider block">
                    Shipping Address (Deliver To)
                  </label>
                  <textarea
                    rows={2}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Enter street, city, state, pincode..."
                    className="w-full px-3 py-2 bg-white border border-surface-200 rounded-xl text-xs outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 font-medium resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="drawerSameAsShipping"
                    checked={sameAsShipping}
                    onChange={(e) => setSameAsShipping(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                  <label htmlFor="drawerSameAsShipping" className="text-xs text-surface-700 font-semibold cursor-pointer select-none">
                    Billing address is same as shipping
                  </label>
                </div>

                {!sameAsShipping && (
                  <div className="space-y-1 animate-in fade-in duration-150">
                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-wider block">
                      Billing Address (Bill To)
                    </label>
                    <textarea
                      rows={2}
                      value={billingAddress}
                      onChange={(e) => setBillingAddress(e.target.value)}
                      placeholder="Enter legal billing address..."
                      className="w-full px-3 py-2 bg-white border border-surface-200 rounded-xl text-xs outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 font-medium resize-none"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingAddress(false)}
                    className="px-3 py-1.5 text-xs font-bold text-surface-600 hover:bg-surface-200 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={updateOrder.isPending}
                    onClick={handleSaveAddresses}
                    className="px-4 py-1.5 bg-[#55349A] hover:bg-[#462980] text-white text-xs font-black rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer border-none disabled:opacity-50"
                  >
                    {updateOrder.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                    <span>{updateOrder.isPending ? 'Saving...' : 'Save Address'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-surface-50 rounded-xl border border-surface-150">
                  <span className="text-[9.5px] font-black uppercase text-surface-400 tracking-wider block mb-0.5">Shipping Address</span>
                  {order.shippingAddress ? (
                    <p className="text-xs text-surface-800 font-medium whitespace-pre-wrap">{order.shippingAddress}</p>
                  ) : (
                    <p className="text-xs text-amber-700 font-semibold italic flex items-center gap-1">
                      <span>⚠ No shipping address (Required for shipping labels)</span>
                    </p>
                  )}
                </div>

                {order.billingAddress && order.billingAddress !== order.shippingAddress && (
                  <div className="p-3 bg-surface-50 rounded-xl border border-surface-150">
                    <span className="text-[9.5px] font-black uppercase text-surface-400 tracking-wider block mb-0.5">Billing Address</span>
                    <p className="text-xs text-surface-800 font-medium whitespace-pre-wrap">{order.billingAddress}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <span className="text-[10px] font-black text-surface-400 tracking-wider uppercase block border-b border-surface-100 pb-1">Line Items</span>
            <div className="p-4 bg-surface-50 rounded-xl space-y-3">
              <div className="flex justify-between text-xs font-semibold text-surface-600">
                <span>Standard Package Item Block</span>
                <span className="font-mono">x{order.itemsCount}</span>
              </div>
              <div className="h-px bg-surface-200/50" />
              <div className="flex justify-between text-sm font-black text-[#55349A]">
                <span>Subtotal (₹)</span>
                <span>₹{Number(order?.totalAmount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {order.assignee && (
            <div className="space-y-3">
              <span className="text-[10px] font-black text-surface-400 tracking-wider uppercase block border-b border-surface-100 pb-1">Store Assignee</span>
              <div className="flex items-center gap-2.5 p-3 border border-surface-150 rounded-xl bg-white">
                <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                  {order.assignee.avatar}
                </div>
                <div>
                  <p className="text-xs font-black text-surface-900">{order.assignee.name}</p>
                  <p className="text-[10px] text-surface-450 font-semibold">{order.assignee.role}</p>
                </div>
              </div>
            </div>
          )}

          {order.review && (
            <div className="space-y-3">
              <span className="text-[10px] font-black text-surface-400 tracking-wider uppercase block border-b border-surface-100 pb-1">Client Feedback</span>
              <div className="p-3 bg-amber-50/50 border border-amber-500/10 rounded-xl">
                <div className="flex gap-0.5 text-amber-500 mb-1">
                  {Array.from({ length: order.review.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="text-[#B45309] text-xs font-semibold leading-relaxed">"{order.review.comment}"</p>
                <span className="text-[9px] text-[#D97706] font-extrabold mt-1 block">{order.review.date}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-surface-150 bg-surface-50 flex flex-wrap gap-2.5">
          {order.status !== 'Delivered' && order.status !== 'Cancelled' && order.status !== 'Returned' && (
            <button
              onClick={() => {
                updateStatus.mutate({ uid: order.id, status: 'DELIVERED' });
                order.status = 'Delivered';
              }}
              disabled={updateStatus.isPending}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-colors cursor-pointer border-none shadow-xs"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{updateStatus.isPending ? 'Updating...' : 'Mark as Completed'}</span>
            </button>
          )}

          <button
            onClick={() => onPrintInvoice(order)}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 border border-primary-600 rounded-xl text-xs font-black text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer bg-white"
          >
            <Printer className="h-4 w-4" />
            Print Invoice
          </button>
          <button
            onClick={() => onCancelOrder(order.id)}
            disabled={order.status === 'Cancelled' || order.status === 'Delivered'}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-danger-600 hover:bg-danger-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-colors cursor-pointer border-none"
          >
            <XCircle className="h-4 w-4" />
            Cancel Order
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function OrderInvoiceModal({
  order,
  onClose,
}: {
  order: any;
  onClose: () => void;
}) {
  const orderUid = order?.uid || order?.id;
  const sellerName = order?.storeName || "Store";
  const { data: model, isLoading, error } = useOrderInvoice(orderUid, sellerName);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <style>{`
        @media print {
          .no-print { display:none !important; }
          .dcinv-sheet { box-shadow:none !important; border:none !important; margin:0 auto !important; }
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-100 rounded-2xl shadow-2xl border border-surface-200 w-full max-w-4xl z-10 overflow-hidden text-left max-h-[92vh] flex flex-col"
      >
        <div className="px-6 py-3.5 border-b border-surface-150 flex items-center justify-between no-print bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#55349A] text-sm tracking-tight">
              GST Tax Invoice · #{String(order?.orderNo || order?.id || '2026').replace('ORD-', '')}
            </span>
            <span className="px-2 py-0.5 bg-purple-100 text-[#55349A] text-[10px] rounded-full font-black">
              {order?.channel ? String(order.channel).toUpperCase() : 'POS / WALK-IN'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!model}
              className="px-4 py-1.5 bg-[#55349A] hover:bg-[#462980] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-none shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Download PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-surface-400 hover:text-surface-600 transition-colors p-1 cursor-pointer bg-transparent border-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Area with the real InvoiceSheet */}
        <div className="overflow-y-auto flex-1 p-6 flex justify-center bg-slate-100">
          {isLoading && (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#55349A]" />
              <p className="text-xs font-semibold">Generating GST Tax Invoice...</p>
            </div>
          )}
          {error && (
            <div className="p-6 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              Failed to build tax invoice: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          )}
          {model && <InvoiceSheet m={model} />}
        </div>
      </motion.div>
    </div>
  );
}

export function OrderCancelWarningModal({
  orderIds,
  onConfirm,
  onClose,
  isPending,
}: {
  orderIds: string[];
  onConfirm: () => void;
  onClose: () => void;
  isPending?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-lg z-10 overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 shadow-inner">
            <AlertTriangle className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                Critical Warning
              </span>
            </div>
            <h3 className="text-base font-black text-rose-950 tracking-tight mt-1">
              {orderIds.length === 1 ? `Cancel Order #${orderIds[0].replace(/^ORD-/, '')}` : `Cancel ${orderIds.length} Selected Orders`}
            </h3>
            <p className="text-xs text-rose-700 font-medium mt-0.5">
              Please review the consequences before confirming cancellation.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg bg-transparent border-none cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200/80 space-y-2.5">
            <div className="text-xs font-black text-rose-900 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
              <span>Consequences of Order Cancellation:</span>
            </div>
            <ul className="text-xs text-rose-800 space-y-2 list-disc list-inside font-medium pl-1 leading-relaxed">
              <li><strong>Inventory Stock:</strong> All reserved item units will be immediately released back to available inventory.</li>
              <li><strong>Accounting & Revenue:</strong> Sales revenue will be reversed from net sales ledgers and financial reports.</li>
              <li><strong>Permanent & Irreversible:</strong> Cancelled orders cannot be reopened or edited.</li>
            </ul>
          </div>

          {orderIds.length > 1 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              <span className="font-bold block mb-1">Target Orders ({orderIds.length}):</span>
              <span className="font-mono text-[11px] text-slate-800 break-words">{orderIds.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border-none bg-transparent"
          >
            No, Keep Order
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border-none disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            <span>{isPending ? 'Cancelling...' : orderIds.length === 1 ? 'Yes, Cancel Order' : `Yes, Cancel ${orderIds.length} Orders`}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
