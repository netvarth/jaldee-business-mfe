import { useState } from "react";
import { Button, Input } from "@jaldee/design-system";
import { useModal } from "../../contexts/ModalContext";

interface SaveDashboardFilterModalProps {
  onSave: (name: string) => Promise<void>;
  onSaveAndApply?: (name: string) => Promise<void>;
}

export default function SaveDashboardFilterModal({
  onSave,
  onSaveAndApply,
}: SaveDashboardFilterModalProps) {
  const { closeModal } = useModal();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (apply: boolean) => {
    if (!name.trim()) {
      setError("Please enter a filter name.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (apply && onSaveAndApply) {
        await onSaveAndApply(name.trim());
      } else {
        await onSave(name.trim());
      }
      closeModal();
    } catch (err: any) {
      setError(err.message || "Failed to save filter.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-5 rounded-lg bg-white p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Create Filter</h2>
        <button
          type="button"
          aria-label="Close"
          onClick={closeModal}
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-name" className="text-sm font-semibold text-slate-700">
          Filter Name
        </label>
        <Input
          id="filter-name"
          placeholder="Enter Filter Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          disabled={saving}
          autoFocus
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => void handleSave(false)}
          loading={saving}
          disabled={!name.trim()}
        >
          Save
        </Button>
        {onSaveAndApply && (
          <Button
            type="button"
            onClick={() => void handleSave(true)}
            loading={saving}
            disabled={!name.trim()}
          >
            Save & Apply
          </Button>
        )}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="m5 5 10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
