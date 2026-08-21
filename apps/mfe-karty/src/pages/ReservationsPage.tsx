import React, { useMemo, useState } from "react";
import {
  Lock,
  Search,
  Plus,
  X,
  Unlock,
  Clock,
  User,
  PackageCheck,
} from "lucide-react";
import {
  useReservations,
  useReserveStock,
  useReleaseReservation,
  Reservation,
} from "../services/useReservations";
import { useItems } from "../services/useItems";
import { useStores } from "../services/useStores";
import { useCustomers } from "../services/useCustomers";

/**
 * Manual Stock Reservations (GAP-16) — hold stock for a named customer outside the order flow.
 * List of active holds, a "Hold Stock" modal, and a Release action.
 */
export function ReservationsPage() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const { data: reservations, isLoading, refetch } = useReservations();
  const { data: items } = useItems();
  const { data: stores } = useStores();
  const releaseMutation = useReleaseReservation();

  const itemNameOf = (uid: string) =>
    (items || []).find((it: any) => (it.uid || it.id) === uid)?.name || "Unknown item";
  const storeNameOf = (uid: string) =>
    (stores || []).find((s: any) => (s.id || s.uid) === uid)?.name || "Unknown store";

  const rows = (reservations || []).filter((r) => {
    if (!search.trim()) return true;
    const t = search.toLowerCase();
    return (
      itemNameOf(r.itemUid).toLowerCase().includes(t) ||
      storeNameOf(r.storeUid).toLowerCase().includes(t) ||
      (r.note || "").toLowerCase().includes(t)
    );
  });

  const expiringSoon = (reservations || []).filter((r) => {
    if (!r.expiresAt) return false;
    const diff = new Date(r.expiresAt).getTime() - Date.now();
    return diff > 0 && diff < 24 * 3600 * 1000;
  }).length;

  const handleRelease = async (r: Reservation) => {
    if (!window.confirm(`Release this hold on ${itemNameOf(r.itemUid)}? The stock returns to available.`))
      return;
    try {
      await releaseMutation.mutateAsync(r.uid);
      refetch();
    } catch (err: any) {
      alert("Failed to release: " + (err?.message || "Unknown error"));
    }
  };

  const fmtExpiry = (iso?: string) => {
    if (!iso) return "No expiry";
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <Lock size={26} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-surface-900 tracking-tight">Stock Reservations</h1>
            <p className="text-xs text-surface-500 font-medium mt-0.5">
              Hold stock for a customer outside the order flow. Held stock is excluded from what is
              available to sell, so it can't be sold to someone else.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <Plus size={16} /> Hold Stock
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Active Holds</span>
            <PackageCheck size={16} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600">{(reservations || []).length}</div>
          <p className="text-[11px] text-surface-400 font-medium">Stock currently on hold</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Expiring Soon</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">{expiringSoon}</div>
          <p className="text-[11px] text-surface-400 font-medium">Holds lapsing within 24h</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>For a Customer</span>
            <User size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-surface-900">
            {(reservations || []).filter((r) => r.consumerUid).length}
          </div>
          <p className="text-[11px] text-surface-400 font-medium">Named-customer holds</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs space-y-3">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Search by item, store or note…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium outline-none"
          />
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-wider text-surface-500 border-b border-surface-200">
              <th className="py-2.5 px-3">Item</th>
              <th className="py-2.5 px-3">Store</th>
              <th className="py-2.5 px-3">Qty</th>
              <th className="py-2.5 px-3">Expires</th>
              <th className="py-2.5 px-3">Note</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-surface-400 font-medium">Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-surface-400 font-medium">
                  No active holds. Reserve stock for a customer to see it here.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.uid} className="border-b border-surface-100 hover:bg-surface-50">
                  <td className="py-3 px-3 font-bold text-surface-800">{itemNameOf(r.itemUid)}</td>
                  <td className="py-3 px-3 text-surface-600">{storeNameOf(r.storeUid)}</td>
                  <td className="py-3 px-3 font-mono text-surface-700">{r.qty}</td>
                  <td className="py-3 px-3 text-surface-500">{fmtExpiry(r.expiresAt)}</td>
                  <td className="py-3 px-3 text-surface-500 truncate max-w-[200px]">{r.note || "—"}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleRelease(r)}
                        disabled={releaseMutation.isPending}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg border border-amber-200 transition-colors"
                      >
                        <Unlock size={13} /> Release
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <ReserveModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function ReserveModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { data: items } = useItems();
  const { data: stores } = useStores();
  const [customerSearch, setCustomerSearch] = useState("");
  const { data: customers } = useCustomers(customerSearch);
  const reserveMutation = useReserveStock();

  const [storeUid, setStoreUid] = useState(stores?.[0]?.id || (stores as any)?.[0]?.uid || "");
  const [itemUid, setItemUid] = useState("");
  const [qty, setQty] = useState<number>(1);
  const [consumerUid, setConsumerUid] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");

  const customerLabel = (c: any) =>
    c.displayName ||
    [c.firstName, c.lastName].filter(Boolean).join(" ") ||
    c.phoneE164 ||
    "Customer";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeUid || !itemUid || !(Number(qty) > 0)) {
      alert("Store, item and a quantity greater than zero are required.");
      return;
    }
    try {
      await reserveMutation.mutateAsync({
        storeUid,
        itemUid,
        qty: Number(qty),
        consumerUid: consumerUid || undefined,
        // datetime-local yields "YYYY-MM-DDTHH:mm"; append seconds so it parses as OffsetDateTime-ish
        expiresAt: expiresAt ? `${expiresAt}:00` : undefined,
        note: note.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      alert("Failed to hold stock: " + (err?.message || "Unknown error"));
    }
  };

  const inputCls =
    "w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-surface-800 outline-none";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-surface-200 text-left max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-surface-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900">Hold Stock for a Customer</h2>
              <p className="text-xs text-surface-500">Reserve stock outside the order flow.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-surface-400 hover:text-surface-700 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1">Store *</label>
            <select required value={storeUid} onChange={(e) => setStoreUid(e.target.value)} className={inputCls}>
              <option value="">Select store…</option>
              {(stores || []).map((s: any) => (
                <option key={s.id || s.uid} value={s.id || s.uid}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1">Item *</label>
            <select required value={itemUid} onChange={(e) => setItemUid(e.target.value)} className={inputCls}>
              <option value="">Select item…</option>
              {(items || []).map((it: any) => (
                <option key={it.uid || it.id} value={it.uid || it.id}>{it.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1">Quantity *</label>
            <input type="number" min="0" step="any" required value={qty || ""}
              onChange={(e) => setQty(Number(e.target.value))}
              className={inputCls.replace("font-bold", "font-mono")} />
            <p className="text-[10px] text-surface-400 mt-1">In the item's base unit.</p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1">Customer (optional)</label>
            <input type="text" placeholder="Search customer…" value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className={inputCls.replace("font-bold", "font-medium") + " mb-2"} />
            <select value={consumerUid} onChange={(e) => setConsumerUid(e.target.value)} className={inputCls}>
              <option value="">No specific customer</option>
              {(customers || []).map((c: any) => (
                <option key={c.uid} value={c.uid}>{customerLabel(c)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1">Hold Until (optional)</label>
            <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
              className={inputCls.replace("font-bold", "font-medium")} />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1">Note</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Holding for weekend pickup"
              className={inputCls.replace("font-bold", "font-medium")} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-200">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-surface-600 hover:bg-surface-100 rounded-xl transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={reserveMutation.isPending}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer">
              {reserveMutation.isPending ? "Holding…" : "Hold Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
