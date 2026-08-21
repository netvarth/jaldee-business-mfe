import React, { useState } from "react";
import { FlaskConical, Plus, X, Trash2, CheckCircle2, Ban } from "lucide-react";
import {
  useProductionOrders,
  useCreateProductionOrder,
  useCompleteProductionOrder,
  useCancelProductionOrder,
  ProductionOrderDto,
} from "../../services/useProductionOrders";
import { useStores } from "../../services/useStores";
import { useItems } from "../../services/useItems";
import { useUnits } from "../../services/useUnits";

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-surface-100 text-surface-600 border-surface-200",
  PLANNED: "bg-surface-100 text-surface-600 border-surface-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
};
// Orders still open to Complete/Cancel (backend uses DRAFT as the initial state).
const OPEN_STATUSES = ["DRAFT", "PLANNED", "IN_PROGRESS"];

const fmtDate = (raw?: string) => {
  if (!raw) return "—";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

interface CompRow { itemUid: string; requiredQty: string; }

export function ProductionOrdersPage() {
  const ordersQ = useProductionOrders();
  const createPo = useCreateProductionOrder();
  const completePo = useCompleteProductionOrder();
  const cancelPo = useCancelProductionOrder();
  const { data: stores = [] } = useStores() as any;
  const { data: items = [] } = useItems() as any;
  const { data: units = [] } = useUnits() as any;

  const orders: ProductionOrderDto[] = ordersQ.data || [];
  const itemName = (uid?: string) => (items as any[]).find((i) => i.uid === uid)?.name;
  const storeName = (uid?: string) => (stores as any[]).find((s) => (s.uid || s.id) === uid)?.name;
  const [showCreate, setShowCreate] = useState(false);

  // create form state
  const [storeUid, setStoreUid] = useState("");
  const [outputItemUid, setOutputItemUid] = useState("");
  const [outputUnitUid, setOutputUnitUid] = useState("");
  const [targetBatchNumber, setTargetBatchNumber] = useState("");
  const [mfgDate, setMfgDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState("");
  const [plannedQty, setPlannedQty] = useState("");
  const [notes, setNotes] = useState("");
  const [components, setComponents] = useState<CompRow[]>([{ itemUid: "", requiredQty: "" }]);
  const [err, setErr] = useState("");

  // Default the output unit from the picked item's units (base/default), else leave for manual pick.
  const pickOutputItem = (uid: string) => {
    setOutputItemUid(uid);
    const it: any = (items as any[]).find((i) => i.uid === uid);
    const u = it?.units?.find((x: any) => x.isDefault || x.selling) || it?.units?.[0];
    if (u?.unitUid) setOutputUnitUid(u.unitUid);
  };

  const reset = () => {
    setStoreUid(""); setOutputItemUid(""); setOutputUnitUid(""); setTargetBatchNumber(""); setExpiryDate("");
    setPlannedQty(""); setNotes(""); setComponents([{ itemUid: "", requiredQty: "" }]); setErr("");
  };

  const submit = async () => {
    setErr("");
    if (!storeUid) return setErr("Select a store.");
    if (!outputItemUid) return setErr("Select the output item.");
    if (!outputUnitUid) return setErr("Select the output unit.");
    if (!targetBatchNumber.trim()) return setErr("Enter a target batch number.");
    if (!(parseFloat(plannedQty) > 0)) return setErr("Enter a planned quantity.");
    const comps = components.filter((c) => c.itemUid && parseFloat(c.requiredQty) > 0);
    if (comps.length === 0) return setErr("Add at least one component (BOM line).");
    try {
      await createPo.mutateAsync({
        storeUid, outputItemUid, outputUnitUid, targetBatchNumber: targetBatchNumber.trim(),
        mfgDate: new Date(mfgDate).toISOString(),
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        plannedQty: parseFloat(plannedQty),
        notes: notes || undefined,
        components: comps.map((c) => ({ itemUid: c.itemUid, requiredQty: parseFloat(c.requiredQty) })),
      } as any);
      setShowCreate(false); reset();
    } catch (e: any) {
      setErr(e?.message || "Failed to create production order.");
    }
  };

  const complete = (o: ProductionOrderDto) => {
    const val = window.prompt(`Actual quantity produced for ${o.productionNo}?`, String(o.plannedQty));
    if (val == null) return;
    const qty = parseFloat(val);
    if (!(qty > 0)) { alert("Enter a valid quantity."); return; }
    completePo.mutate({ uid: o.uid, actualQtyProduced: qty } as any);
  };

  const cancel = (o: ProductionOrderDto) => {
    if (window.confirm(`Cancel production order ${o.productionNo}?`)) cancelPo.mutate(o.uid as any);
  };

  const inputCls = "w-full px-3 py-2 bg-white border border-surface-200 rounded-xl text-sm outline-none focus:border-[#55349A]";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl border border-violet-100">
            <FlaskConical size={26} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-surface-900 tracking-tight">Production / Compounding</h1>
            <p className="text-xs text-surface-500 font-medium mt-0.5">
              Build finished goods from a bill of materials — consume components, yield a batch.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#55349A] hover:bg-[#43287A] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <Plus size={15} /> New Production Order
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Metric label="Total Orders" value={String(orders.length)} />
        <Metric label="In Progress" value={String(orders.filter((o) => OPEN_STATUSES.includes(o.status)).length)} valueClass="text-amber-600" />
        <Metric label="Completed" value={String(orders.filter((o) => o.status === "COMPLETED").length)} valueClass="text-emerald-600" />
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 text-[11px] uppercase tracking-wider text-surface-500 font-bold">
              <tr>
                <th className="py-3 px-6 text-left">Order</th>
                <th className="py-3 px-4 text-left">Output / Batch</th>
                <th className="py-3 px-4 text-left">Store</th>
                <th className="py-3 px-4 text-right">Planned / Actual</th>
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {ordersQ.isLoading ? (
                <tr><td colSpan={7} className="py-10 text-center text-surface-400 text-xs">Loading…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-surface-400 text-xs">No production orders yet — create one to compound a batch from a BOM.</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.uid} className="hover:bg-surface-50/50">
                    <td className="py-3 px-6 font-bold text-[#55349A]">{(o as any).orderNo || o.productionNo || `PR-${o.uid.slice(0, 6).toUpperCase()}`}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-surface-900 text-sm">{o.outputItemName || itemName(o.outputItemUid) || "—"}</div>
                      <div className="text-[11px] text-surface-400 font-mono">Batch {(o as any).resultingBatchNo || o.targetBatchNumber || "—"}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-surface-600">{o.storeName || storeName(o.storeUid) || "—"}</td>
                    <td className="py-3 px-4 text-right font-bold text-surface-800">
                      {o.plannedQty}{((o as any).outputUnitName || o.outputUnitSymbol) ? ` ${(o as any).outputUnitName || o.outputUnitSymbol}` : ""}
                      {((o as any).producedQty ?? o.actualQtyProduced) != null && <span className="text-emerald-600"> → {(o as any).producedQty ?? o.actualQtyProduced}</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-surface-500">{fmtDate((o as any).mfgDate || o.createdAt)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full border text-[10px] font-bold ${STATUS_STYLE[o.status] || STATUS_STYLE.DRAFT}`}>{o.status.replace("_", " ")}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {OPEN_STATUSES.includes(o.status) && (
                          <>
                            <button type="button" onClick={() => complete(o)} disabled={completePo.isPending} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg cursor-pointer disabled:opacity-40">
                              <CheckCircle2 size={13} /> Complete
                            </button>
                            <button type="button" onClick={() => cancel(o)} disabled={cancelPo.isPending} className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded-lg cursor-pointer disabled:opacity-40">
                              <Ban size={13} /> Cancel
                            </button>
                          </>
                        )}
                        {(o.status === "COMPLETED" || o.status === "CANCELLED") && <span className="text-[11px] text-surface-400">—</span>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 sticky top-0 bg-white">
              <h3 className="text-base font-extrabold text-surface-900">New Production Order</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1 hover:bg-surface-100 rounded"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {err && <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Store">
                  <select className={inputCls} value={storeUid} onChange={(e) => setStoreUid(e.target.value)}>
                    <option value="">Select store</option>
                    {(stores as any[]).map((s) => <option key={s.id || s.uid} value={s.id || s.uid}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="Output Item">
                  <select className={inputCls} value={outputItemUid} onChange={(e) => pickOutputItem(e.target.value)}>
                    <option value="">Select item</option>
                    {(items as any[]).map((i) => <option key={i.uid} value={i.uid}>{i.name}</option>)}
                  </select>
                </Field>
                <Field label="Output Unit">
                  <select className={inputCls} value={outputUnitUid} onChange={(e) => setOutputUnitUid(e.target.value)}>
                    <option value="">Select unit</option>
                    {(units as any[]).map((u) => <option key={u.uid || u.unitUid} value={u.uid || u.unitUid}>{u.symbol ? `${u.name} (${u.symbol})` : u.name}</option>)}
                  </select>
                </Field>
                <Field label="Target Batch No.">
                  <input className={inputCls} value={targetBatchNumber} onChange={(e) => setTargetBatchNumber(e.target.value)} placeholder="e.g. CMP-2026-01" />
                </Field>
                <Field label="Planned Qty">
                  <input className={inputCls} type="number" value={plannedQty} onChange={(e) => setPlannedQty(e.target.value)} placeholder="0" />
                </Field>
                <Field label="Mfg Date">
                  <input className={inputCls} type="date" value={mfgDate} onChange={(e) => setMfgDate(e.target.value)} />
                </Field>
                <Field label="Expiry Date">
                  <input className={inputCls} type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                </Field>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Components (BOM)</label>
                  <button type="button" onClick={() => setComponents([...components, { itemUid: "", requiredQty: "" }])} className="text-[11px] font-bold text-[#55349A] hover:underline">+ Add component</button>
                </div>
                <div className="space-y-2">
                  {components.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select className={inputCls} value={c.itemUid} onChange={(e) => setComponents(components.map((x, i) => i === idx ? { ...x, itemUid: e.target.value } : x))}>
                        <option value="">Select component</option>
                        {(items as any[]).map((i) => <option key={i.uid} value={i.uid}>{i.name}</option>)}
                      </select>
                      <input className={inputCls + " max-w-[110px]"} type="number" placeholder="Qty" value={c.requiredQty} onChange={(e) => setComponents(components.map((x, i) => i === idx ? { ...x, requiredQty: e.target.value } : x))} />
                      {components.length > 1 && (
                        <button type="button" onClick={() => setComponents(components.filter((_, i) => i !== idx))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={15} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Field label="Notes">
                <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
              </Field>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-100 sticky bottom-0 bg-white">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-xs font-bold text-surface-600 hover:bg-surface-100 rounded-xl">Cancel</button>
              <button type="button" onClick={submit} disabled={createPo.isPending} className="px-5 py-2 bg-[#55349A] hover:bg-[#43287A] text-white text-xs font-bold rounded-xl disabled:opacity-40">
                {createPo.isPending ? "Creating…" : "Create Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
      <div className="text-surface-500 text-xs font-bold uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-black ${valueClass || "text-surface-900"}`}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

export default ProductionOrdersPage;
