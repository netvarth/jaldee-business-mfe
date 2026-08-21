import React, { useMemo, useState } from "react";
import {
  Gift,
  Search,
  Plus,
  X,
  Trash2,
  Power,
  Pencil,
  Tag,
  Percent,
} from "lucide-react";
import {
  useSchemes,
  useSaveScheme,
  useDeleteScheme,
  useSetSchemeActive,
  Scheme,
  SchemeLine,
  SchemeType,
  SchemeScope,
} from "../services/useSchemes";
import { useItems } from "../services/useItems";
import { useTradePartners } from "../services/useTradePartners";

const TYPE_LABELS: Record<SchemeType, string> = {
  QTY_SLAB: "Quantity Slab Discount",
  BOGO: "Buy X Get Y",
  FREE_GOODS: "Free Goods",
  VALUE_DISCOUNT: "Order-Value Discount",
};
const SCOPE_LABELS: Record<SchemeScope, string> = {
  ITEM: "One item",
  CATEGORY: "A category",
  PARTNER: "A trade partner",
  ALL: "All orders",
};

/** True when the type rewards free units rather than a discount. */
const isFreeGoods = (t: SchemeType) => t === "BOGO" || t === "FREE_GOODS";
/** True when the slab threshold is an order/line value rather than a quantity. */
const isValueBased = (t: SchemeType) => t === "VALUE_DISCOUNT";

export function SchemesPage() {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; editing?: Scheme }>({ open: false });

  const { data: schemes, isLoading, refetch } = useSchemes();
  const deleteMutation = useDeleteScheme();
  const activeMutation = useSetSchemeActive();

  const rows = (schemes || []).filter((s) =>
    !search.trim() ? true : s.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = (schemes || []).filter((s) => s.active).length;

  const toggleActive = async (s: Scheme) => {
    try {
      await activeMutation.mutateAsync({ uid: s.uid!, active: !s.active });
      refetch();
    } catch (err: any) {
      alert("Failed to change status: " + (err?.message || "Unknown error"));
    }
  };

  const handleDelete = async (s: Scheme) => {
    if (!window.confirm(`Delete scheme "${s.name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(s.uid!);
      refetch();
    } catch (err: any) {
      alert("Failed to delete: " + (err?.message || "Unknown error"));
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
            <Gift size={26} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-surface-900 tracking-tight">Trade Schemes</h1>
            <p className="text-xs text-surface-500 font-medium mt-0.5">
              Quantity-slab discounts and free-goods offers for B2B trade. Matching schemes apply
              automatically at order time.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModal({ open: true })}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <Plus size={16} /> New Scheme
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Active Schemes</span>
            <Power size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{activeCount}</div>
          <p className="text-[11px] text-surface-400 font-medium">Currently applying to orders</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Schemes</span>
            <Tag size={16} className="text-purple-600" />
          </div>
          <div className="text-2xl font-black text-surface-900">{(schemes || []).length}</div>
          <p className="text-[11px] text-surface-400 font-medium">Active and inactive</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Free-Goods Offers</span>
            <Gift size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">
            {(schemes || []).filter((s) => isFreeGoods(s.schemeType)).length}
          </div>
          <p className="text-[11px] text-surface-400 font-medium">Buy-X-get-Y and free goods</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs space-y-3">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Search schemes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium outline-none"
          />
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-wider text-surface-500 border-b border-surface-200">
              <th className="py-2.5 px-3">Name</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Applies to</th>
              <th className="py-2.5 px-3">Slabs</th>
              <th className="py-2.5 px-3">Priority</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-surface-400 font-medium">Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-surface-400 font-medium">
                  No trade schemes yet. Create one to start rewarding volume orders.
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr key={s.uid} className="border-b border-surface-100 hover:bg-surface-50">
                  <td className="py-3 px-3 font-bold text-surface-800">{s.name}</td>
                  <td className="py-3 px-3 text-surface-600">{TYPE_LABELS[s.schemeType]}</td>
                  <td className="py-3 px-3 text-surface-500">{SCOPE_LABELS[s.schemeScope]}</td>
                  <td className="py-3 px-3 text-surface-600">{s.lines?.length || 0}</td>
                  <td className="py-3 px-3 text-surface-500">{s.priority}</td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(s)}
                      className={
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-colors " +
                        (s.active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-surface-100 text-surface-500 border-surface-200 hover:bg-surface-200")
                      }
                    >
                      <Power size={12} /> {s.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setModal({ open: true, editing: s })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-100 hover:bg-surface-200 text-surface-700 text-xs font-bold rounded-lg border border-surface-200 transition-colors"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg border border-red-200 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <SchemeModal
          editing={modal.editing}
          onClose={() => setModal({ open: false })}
          onSuccess={() => {
            setModal({ open: false });
            refetch();
          }}
        />
      )}
    </div>
  );
}

interface DraftLine extends SchemeLine {
  _key: number;
}

function SchemeModal({
  editing,
  onClose,
  onSuccess,
}: {
  editing?: Scheme;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: items } = useItems();
  const { data: partners } = useTradePartners();
  const saveMutation = useSaveScheme();

  const [name, setName] = useState(editing?.name || "");
  const [schemeType, setSchemeType] = useState<SchemeType>(editing?.schemeType || "QTY_SLAB");
  const [schemeScope, setSchemeScope] = useState<SchemeScope>(editing?.schemeScope || "ALL");
  const [targetUid, setTargetUid] = useState(editing?.targetUid || "");
  const [priority, setPriority] = useState(editing?.priority ?? 0);
  const [validFrom, setValidFrom] = useState(editing?.validFrom || "");
  const [validTo, setValidTo] = useState(editing?.validTo || "");
  const [active, setActive] = useState(editing?.active ?? true);
  const [lines, setLines] = useState<DraftLine[]>(
    (editing?.lines || []).map((l, i) => ({ ...l, _key: i }))
  );
  const keyRef = React.useRef(lines.length);

  // Categories are derived from the item list — there is no dedicated category endpoint.
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    (items || []).forEach((it: any) => {
      if (it.categoryId) map.set(it.categoryId, it.categoryName || "Category");
    });
    return Array.from(map, ([id, label]) => ({ id, label }));
  }, [items]);

  const addLine = () => setLines((ls) => [...ls, { _key: keyRef.current++ }]);
  const updateLine = (key: number, patch: Partial<DraftLine>) =>
    setLines((ls) => ls.map((l) => (l._key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: number) => setLines((ls) => ls.filter((l) => l._key !== key));

  const num = (v: any) => (v === "" || v == null ? undefined : Number(v));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please give the scheme a name.");
      return;
    }
    if (schemeScope !== "ALL" && !targetUid) {
      alert(`Please pick the ${SCOPE_LABELS[schemeScope].toLowerCase()} this scheme applies to.`);
      return;
    }
    // Build lines by type so we never send fields the engine ignores for that type.
    const builtLines: SchemeLine[] = lines
      .map((l) => {
        if (isFreeGoods(schemeType)) {
          return {
            buyQty: num(l.buyQty),
            getQty: num(l.getQty),
            freeItemUid: l.freeItemUid || undefined,
          } as SchemeLine;
        }
        if (isValueBased(schemeType)) {
          return {
            minValue: num(l.minValue),
            discountPercent: num(l.discountPercent),
            discountAmount: num(l.discountAmount),
          } as SchemeLine;
        }
        // QTY_SLAB
        return {
          buyQty: num(l.buyQty),
          discountPercent: num(l.discountPercent),
          discountAmount: num(l.discountAmount),
        } as SchemeLine;
      })
      .filter((l) => {
        if (isFreeGoods(schemeType)) return l.buyQty && l.getQty;
        if (isValueBased(schemeType)) return l.minValue && (l.discountPercent || l.discountAmount);
        return l.buyQty && (l.discountPercent || l.discountAmount);
      });

    if (builtLines.length === 0) {
      alert("Add at least one complete slab for this scheme type.");
      return;
    }

    const payload: Scheme = {
      uid: editing?.uid,
      name: name.trim(),
      schemeType,
      schemeScope,
      targetUid: schemeScope === "ALL" ? undefined : targetUid,
      active,
      priority: Number(priority) || 0,
      validFrom: validFrom || undefined,
      validTo: validTo || undefined,
      lines: builtLines,
    };
    try {
      await saveMutation.mutateAsync(payload);
      onSuccess();
    } catch (err: any) {
      alert("Failed to save scheme: " + (err?.message || "Unknown error"));
    }
  };

  const inputCls =
    "w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-surface-800 outline-none";
  const cellCls =
    "w-full px-2 py-1.5 bg-surface-50 border border-surface-200 rounded-lg text-xs font-mono outline-none";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-surface-200 text-left max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-surface-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
              <Gift size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900">
                {editing ? "Edit Trade Scheme" : "New Trade Scheme"}
              </h2>
              <p className="text-xs text-surface-500">
                Define the reward and the slabs that trigger it.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-surface-400 hover:text-surface-700 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-surface-600 mb-1">Scheme Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Diwali — Buy 10 get 1" className={inputCls.replace("font-bold", "font-medium")} />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-surface-600 mb-1">Type *</label>
              <select value={schemeType} onChange={(e) => setSchemeType(e.target.value as SchemeType)} className={inputCls}>
                {(Object.keys(TYPE_LABELS) as SchemeType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-surface-600 mb-1">Applies to *</label>
              <select
                value={schemeScope}
                onChange={(e) => { setSchemeScope(e.target.value as SchemeScope); setTargetUid(""); }}
                className={inputCls}
              >
                {(Object.keys(SCOPE_LABELS) as SchemeScope[]).map((sc) => (
                  <option key={sc} value={sc}>{SCOPE_LABELS[sc]}</option>
                ))}
              </select>
            </div>

            {schemeScope === "ITEM" && (
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-surface-600 mb-1">Item *</label>
                <select value={targetUid} onChange={(e) => setTargetUid(e.target.value)} className={inputCls}>
                  <option value="">Select item…</option>
                  {(items || []).map((it: any) => (
                    <option key={it.uid || it.id} value={it.uid || it.id}>{it.name}</option>
                  ))}
                </select>
              </div>
            )}
            {schemeScope === "CATEGORY" && (
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-surface-600 mb-1">Category *</label>
                <select value={targetUid} onChange={(e) => setTargetUid(e.target.value)} className={inputCls}>
                  <option value="">Select category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
            )}
            {schemeScope === "PARTNER" && (
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-surface-600 mb-1">Trade Partner *</label>
                <select value={targetUid} onChange={(e) => setTargetUid(e.target.value)} className={inputCls}>
                  <option value="">Select partner…</option>
                  {(partners || []).map((p: any) => (
                    <option key={p.uid} value={p.uid}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-surface-600 mb-1">Priority</label>
              <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))}
                className={inputCls.replace("font-bold", "font-mono")} />
              <p className="text-[10px] text-surface-400 mt-1">Higher wins when schemes overlap.</p>
            </div>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-surface-600 mb-1">Valid From</label>
                <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)}
                  className={inputCls.replace("font-bold", "font-medium")} />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-surface-600 mb-1">Valid To</label>
                <input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)}
                  className={inputCls.replace("font-bold", "font-medium")} />
              </div>
            </div>
            <label className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              <span className="text-[11px] font-bold text-surface-600">Active (applies to new orders immediately)</span>
            </label>
          </div>

          {/* Slabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-surface-600 uppercase tracking-wider">Slabs</label>
              <button type="button" onClick={addLine}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-lg border border-purple-200 transition-colors">
                <Plus size={13} /> Add Slab
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="py-6 text-center text-surface-400 font-medium border border-dashed border-surface-200 rounded-xl">
                No slabs yet. A slab is one threshold and its reward.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                      {isFreeGoods(schemeType) ? (
                        <>
                          <th className="py-1.5 px-2 w-24">Buy Qty</th>
                          <th className="py-1.5 px-2 w-24">Free Qty</th>
                          <th className="py-1.5 px-2">Free Item (optional)</th>
                        </>
                      ) : (
                        <>
                          <th className="py-1.5 px-2 w-32">{isValueBased(schemeType) ? "Min Order Value" : "Buy Qty (≥)"}</th>
                          <th className="py-1.5 px-2 w-24">Disc %</th>
                          <th className="py-1.5 px-2 w-28">Disc Amount</th>
                        </>
                      )}
                      <th className="py-1.5 px-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l._key} className="border-t border-surface-100">
                        {isFreeGoods(schemeType) ? (
                          <>
                            <td className="py-1.5 px-2">
                              <input type="number" min="0" step="any" value={l.buyQty ?? ""}
                                onChange={(e) => updateLine(l._key, { buyQty: Number(e.target.value) })} className={cellCls} />
                            </td>
                            <td className="py-1.5 px-2">
                              <input type="number" min="0" step="any" value={l.getQty ?? ""}
                                onChange={(e) => updateLine(l._key, { getQty: Number(e.target.value) })} className={cellCls} />
                            </td>
                            <td className="py-1.5 px-2">
                              <select value={l.freeItemUid || ""} onChange={(e) => updateLine(l._key, { freeItemUid: e.target.value })}
                                className={cellCls.replace("font-mono", "font-bold")}>
                                <option value="">Same item bought</option>
                                {(items || []).map((it: any) => (
                                  <option key={it.uid || it.id} value={it.uid || it.id}>{it.name}</option>
                                ))}
                              </select>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-1.5 px-2">
                              <input type="number" min="0" step="any"
                                value={isValueBased(schemeType) ? (l.minValue ?? "") : (l.buyQty ?? "")}
                                onChange={(e) =>
                                  updateLine(l._key, isValueBased(schemeType)
                                    ? { minValue: Number(e.target.value) }
                                    : { buyQty: Number(e.target.value) })}
                                className={cellCls} />
                            </td>
                            <td className="py-1.5 px-2">
                              <input type="number" min="0" step="any" value={l.discountPercent ?? ""}
                                onChange={(e) => updateLine(l._key, { discountPercent: Number(e.target.value) })} className={cellCls} />
                            </td>
                            <td className="py-1.5 px-2">
                              <input type="number" min="0" step="any" value={l.discountAmount ?? ""}
                                onChange={(e) => updateLine(l._key, { discountAmount: Number(e.target.value) })} className={cellCls} />
                            </td>
                          </>
                        )}
                        <td className="py-1.5 px-2 text-center">
                          <button type="button" onClick={() => removeLine(l._key)} className="p-1 text-surface-400 hover:text-red-600 rounded">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[11px] text-surface-400 font-medium flex items-center gap-1">
              <Percent size={12} />
              {isFreeGoods(schemeType)
                ? "Buy the first quantity, get the free quantity added as a zero-priced line."
                : "Give a percentage or a flat amount off — set one, not both."}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-200">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-surface-600 hover:bg-surface-100 rounded-xl transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={saveMutation.isPending}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer">
              {saveMutation.isPending ? "Saving…" : editing ? "Save Scheme" : "Create Scheme"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
