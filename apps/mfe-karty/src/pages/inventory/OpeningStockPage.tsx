import React, { useMemo, useState } from "react";
import {
  PackagePlus,
  Search,
  Plus,
  X,
  Trash2,
  CheckCircle2,
  FileText,
  PlayCircle,
  Pencil,
  Layers,
} from "lucide-react";
import {
  useOpeningStockList,
  useCreateOpeningStock,
  useUpdateOpeningStock,
  useApplyOpeningStock,
  useDeleteOpeningStock,
  OpeningStockDto,
  OpeningStockItemDto,
} from "../../services/useOpeningStock";
import { useItems } from "../../services/useItems";
import { useStores } from "../../services/useStores";

/**
 * Opening Stock — declare the stock a business already holds when it goes live (use case E1).
 * List of declarations with their status, plus a create/edit modal and an "Apply" action that
 * posts the declaration into the stock engine. Applied declarations are immutable.
 */
export function OpeningStockPage() {
  const [storeFilter, setStoreFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [modalState, setModalState] = useState<{ open: boolean; editing?: OpeningStockDto }>({
    open: false,
  });

  const { data: stores } = useStores();
  const { data: declarations, isLoading, refetch } = useOpeningStockList(storeFilter || undefined);
  const applyMutation = useApplyOpeningStock();
  const deleteMutation = useDeleteOpeningStock();

  const storeNameOf = (uid: string) =>
    (stores || []).find((s: any) => (s.id || s.uid) === uid)?.name || "Unknown store";

  const rows = (declarations || []).filter((d) => {
    if (!searchTerm.trim()) return true;
    const t = searchTerm.toLowerCase();
    return (
      storeNameOf(d.storeUid).toLowerCase().includes(t) ||
      (d.note || "").toLowerCase().includes(t)
    );
  });

  const draftCount = (declarations || []).filter((d) => d.status === "DRAFT").length;
  const appliedCount = (declarations || []).filter((d) => d.status === "APPLIED").length;

  const handleApply = async (d: OpeningStockDto) => {
    if (
      !window.confirm(
        `Apply this opening-stock declaration into inventory?\n\nThis posts ${d.items?.length || 0} line(s) into stock and cannot be undone.`
      )
    )
      return;
    try {
      await applyMutation.mutateAsync(d.uid);
      refetch();
    } catch (err: any) {
      alert("Failed to apply: " + (err?.message || "Unknown error"));
    }
  };

  const handleDelete = async (d: OpeningStockDto) => {
    if (!window.confirm("Delete this draft opening-stock declaration?")) return;
    try {
      await deleteMutation.mutateAsync(d.uid);
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
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <PackagePlus size={26} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-surface-900 tracking-tight">Opening Stock</h1>
            <p className="text-xs text-surface-500 font-medium mt-0.5">
              Declare the stock you already hold when going live — no fictional purchase, just your
              true starting position per store and item.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setModalState({ open: true })}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} /> New Declaration
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Draft Declarations</span>
            <FileText size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">{draftCount}</div>
          <p className="text-[11px] text-surface-400 font-medium">Editable, not yet posted to stock</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Applied</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{appliedCount}</div>
          <p className="text-[11px] text-surface-400 font-medium">Posted into inventory (immutable)</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Declarations</span>
            <Layers size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-surface-900">{(declarations || []).length}</div>
          <p className="text-[11px] text-surface-400 font-medium">Across all stores</p>
        </div>
      </div>

      {/* Filters + table */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-5 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Search by store or note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium outline-none"
            />
          </div>
          <div className="sm:col-span-4">
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-surface-800 outline-none"
            >
              <option value="">All stores</option>
              {(stores || []).map((s: any) => (
                <option key={s.id || s.uid} value={s.id || s.uid}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-wider text-surface-500 border-b border-surface-200">
              <th className="py-2.5 px-3">Store</th>
              <th className="py-2.5 px-3">Lines</th>
              <th className="py-2.5 px-3">Note</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-surface-400 font-medium">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-surface-400 font-medium">
                  No opening-stock declarations yet. Create one to set your starting inventory.
                </td>
              </tr>
            ) : (
              rows.map((d) => {
                const applied = d.status === "APPLIED";
                return (
                  <tr key={d.uid} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="py-3 px-3 font-bold text-surface-800">{storeNameOf(d.storeUid)}</td>
                    <td className="py-3 px-3 text-surface-600">{d.items?.length || 0}</td>
                    <td className="py-3 px-3 text-surface-500 truncate max-w-[220px]">{d.note || "—"}</td>
                    <td className="py-3 px-3">
                      <span
                        className={
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border " +
                          (applied
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200")
                        }
                      >
                        {applied ? "Applied" : "Draft"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-2">
                        {!applied && (
                          <>
                            <button
                              type="button"
                              onClick={() => setModalState({ open: true, editing: d })}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-100 hover:bg-surface-200 text-surface-700 text-xs font-bold rounded-lg border border-surface-200 transition-colors"
                            >
                              <Pencil size={13} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApply(d)}
                              disabled={applyMutation.isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition-colors"
                            >
                              <PlayCircle size={13} /> Apply
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(d)}
                              disabled={deleteMutation.isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg border border-red-200 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                        {applied && (
                          <span className="text-[11px] text-surface-400 font-medium italic">Locked</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalState.open && (
        <OpeningStockModal
          editing={modalState.editing}
          onClose={() => setModalState({ open: false })}
          onSuccess={() => {
            setModalState({ open: false });
            refetch();
          }}
        />
      )}
    </div>
  );
}

interface DraftLine extends OpeningStockItemDto {
  _key: number;
}

function OpeningStockModal({
  editing,
  onClose,
  onSuccess,
}: {
  editing?: OpeningStockDto;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: items } = useItems();
  const { data: stores } = useStores();
  const createMutation = useCreateOpeningStock();
  const updateMutation = useUpdateOpeningStock();

  const [storeUid, setStoreUid] = useState(
    editing?.storeUid || stores?.[0]?.id || (stores as any)?.[0]?.uid || ""
  );
  const [note, setNote] = useState(editing?.note || "");
  const [lines, setLines] = useState<DraftLine[]>(
    (editing?.items || []).map((it, i) => ({ ...it, _key: i })) || []
  );
  const keyRef = React.useRef(lines.length);

  const itemNameOf = (uid: string) =>
    (items || []).find((it: any) => (it.uid || it.id) === uid)?.name || "";

  const addLine = () =>
    setLines((ls) => [
      ...ls,
      { _key: keyRef.current++, itemUid: "", qty: 0 } as DraftLine,
    ]);

  const updateLine = (key: number, patch: Partial<DraftLine>) =>
    setLines((ls) => ls.map((l) => (l._key === key ? { ...l, ...patch } : l)));

  const removeLine = (key: number) => setLines((ls) => ls.filter((l) => l._key !== key));

  const validLines = useMemo(
    () => lines.filter((l) => l.itemUid && Number(l.qty) > 0),
    [lines]
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeUid) {
      alert("Please select a store.");
      return;
    }
    if (validLines.length === 0) {
      alert("Add at least one line with an item and a quantity greater than zero.");
      return;
    }
    const payload: Partial<OpeningStockDto> = {
      storeUid,
      note: note.trim() || undefined,
      items: validLines.map((l) => ({
        itemUid: l.itemUid,
        qty: Number(l.qty),
        batchNumber: l.batchNumber?.trim() || undefined,
        expiryDate: l.expiryDate || undefined,
        mrp: l.mrp != null && `${l.mrp}` !== "" ? Number(l.mrp) : undefined,
        costPrice: l.costPrice != null && `${l.costPrice}` !== "" ? Number(l.costPrice) : undefined,
      })),
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ uid: editing.uid, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onSuccess();
    } catch (err: any) {
      alert("Failed to save: " + (err?.message || "Unknown error"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-surface-200 text-left max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-surface-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <PackagePlus size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900">
                {editing ? "Edit Opening-Stock Declaration" : "New Opening-Stock Declaration"}
              </h2>
              <p className="text-xs text-surface-500">
                Draft your starting inventory. Nothing posts to stock until you Apply it.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-surface-400 hover:text-surface-700 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-surface-600 mb-1">Store *</label>
              <select
                required
                value={storeUid}
                onChange={(e) => setStoreUid(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-surface-800 outline-none"
              >
                <option value="">Select store…</option>
                {(stores || []).map((s: any) => (
                  <option key={s.id || s.uid} value={s.id || s.uid}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-surface-600 mb-1">Note</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Go-live count, 1 Apr"
                className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-surface-600 uppercase tracking-wider">
                Items
              </label>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors"
              >
                <Plus size={13} /> Add Line
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="py-6 text-center text-surface-400 font-medium border border-dashed border-surface-200 rounded-xl">
                No lines yet. Add one to declare an item's opening quantity.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                      <th className="py-1.5 px-2">Item *</th>
                      <th className="py-1.5 px-2 w-20">Qty *</th>
                      <th className="py-1.5 px-2 w-28">Batch</th>
                      <th className="py-1.5 px-2 w-32">Expiry</th>
                      <th className="py-1.5 px-2 w-20">MRP</th>
                      <th className="py-1.5 px-2 w-20">Cost</th>
                      <th className="py-1.5 px-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l._key} className="border-t border-surface-100">
                        <td className="py-1.5 px-2">
                          <select
                            value={l.itemUid}
                            onChange={(e) => updateLine(l._key, { itemUid: e.target.value })}
                            className="w-full px-2 py-1.5 bg-surface-50 border border-surface-200 rounded-lg text-xs font-bold text-surface-800 outline-none"
                          >
                            <option value="">Select…</option>
                            {(items || []).map((it: any) => (
                              <option key={it.uid || it.id} value={it.uid || it.id}>
                                {it.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={l.qty || ""}
                            onChange={(e) => updateLine(l._key, { qty: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 bg-surface-50 border border-surface-200 rounded-lg text-xs font-mono outline-none"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={l.batchNumber || ""}
                            onChange={(e) => updateLine(l._key, { batchNumber: e.target.value })}
                            className="w-full px-2 py-1.5 bg-surface-50 border border-surface-200 rounded-lg text-xs outline-none"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="date"
                            value={l.expiryDate || ""}
                            onChange={(e) => updateLine(l._key, { expiryDate: e.target.value })}
                            className="w-full px-2 py-1.5 bg-surface-50 border border-surface-200 rounded-lg text-xs outline-none"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={l.mrp ?? ""}
                            onChange={(e) => updateLine(l._key, { mrp: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 bg-surface-50 border border-surface-200 rounded-lg text-xs font-mono outline-none"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={l.costPrice ?? ""}
                            onChange={(e) => updateLine(l._key, { costPrice: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 bg-surface-50 border border-surface-200 rounded-lg text-xs font-mono outline-none"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(l._key)}
                            className="p-1 text-surface-400 hover:text-red-600 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[11px] text-surface-400 font-medium">
              Quantity is in the item's base unit. Batch and expiry apply only to batch-tracked
              items. {validLines.length} of {lines.length} line(s) ready.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-surface-600 hover:bg-surface-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              {isPending ? "Saving…" : editing ? "Save Draft" : "Create Draft"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
