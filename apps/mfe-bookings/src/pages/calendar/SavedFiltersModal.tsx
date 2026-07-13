import { useState } from "react";
import { Button, Input } from "@jaldee/design-system";
import { useModal } from "../../contexts/ModalContext";
import { useToast } from "../../contexts/ToastContext";
import { useSavedFilters, type SavedFilter } from "../../services/useSavedFilters";

/**
 * Saved filters for the calendar dashboard — FilterController @ /filters
 * (filterType = CALENDAR_DASHBOARD). Save the current view criteria under a name,
 * re-apply a saved one, or delete it. `criteria` is an opaque blob the caller owns;
 * `onApply` receives it back so the dashboard can restore its selection.
 */
export default function SavedFiltersModal({
  criteria,
  onApply,
}: {
  criteria: Record<string, unknown>;
  onApply: (criteria: Record<string, unknown>) => void;
}) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const { filters, loading, error, create, remove } = useSavedFilters("CALENDAR_DASHBOARD");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const saveCurrent = async () => {
    if (!name.trim()) { showToast("Name your filter", "error"); return; }
    setSaving(true);
    try {
      await create({ name: name.trim(), filter: criteria, filterType: "CALENDAR_DASHBOARD" });
      showToast("Filter saved", "success");
      setName("");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to save filter", "error");
    } finally {
      setSaving(false);
    }
  };

  const apply = (f: SavedFilter) => {
    onApply(f.filter ?? {});
    showToast(`Applied "${f.name}"`, "success");
    closeModal();
  };

  return (
    <div className="w-[420px] max-w-full bg-white rounded-xl p-5">
      <h3 className="font-bold text-lg text-slate-800 mb-4">Saved filters</h3>

      <div className="flex gap-2 mb-4">
        <Input placeholder="Save current view as…" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
        <Button onClick={saveCurrent} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
      </div>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : filters.length === 0 ? (
        <p className="text-sm text-slate-400">No saved filters yet.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {filters.map((f) => (
            <div key={f.uid} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 p-2">
              <span className="text-sm font-medium text-slate-700 truncate">{f.name}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => apply(f)}>Apply</Button>
                <Button variant="ghost" size="sm" onClick={() => f.uid && remove(f.uid)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end mt-4">
        <Button variant="secondary" onClick={closeModal}>Close</Button>
      </div>
    </div>
  );
}
