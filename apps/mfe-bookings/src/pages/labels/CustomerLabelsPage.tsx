import { useState } from "react";
import {
  Button, DataTable, EmptyState, Input, PageHeader, Textarea, type ColumnDef, Badge, Popover
} from "@jaldee/design-system";
import { useCustomerLabels, type CustomerLabel } from "../../services/useCustomerLabels";
import { useToast } from "../../contexts/ToastContext";

interface FormState {
  id?: string;
  name: string;
  description: string;
  color: string;
}

const EMPTY_FORM: FormState = { name: "", description: "", color: "#55349A" };

/** Colored chip — reusable when surfacing labels on customers. */
export function LabelChip({ label }: { label: CustomerLabel }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ background: `${label.color ?? "#64748b"}22`, color: label.color ?? "#334155" }}
    >
      {label.name}
    </span>
  );
}

export default function CustomerLabelsPage() {
  const { labels, loading, error, create, update, setEnabled, remove } = useCustomerLabels();
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (l: CustomerLabel) => {
    setForm({ id: l.id, name: l.name ?? "", description: l.description ?? "", color: l.color ?? "#55349A" });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { showToast("Label name is required", "error"); return; }
    setSaving(true);
    try {
      const payload: CustomerLabel = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        color: form.color,
      };
      if (form.id) await update(form.id, payload);
      else await create(payload);
      showToast(form.id ? "Label updated" : "Label created", "success");
      setFormOpen(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to save label", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (l: CustomerLabel) => {
    try {
      await setEnabled(l.id!, (l.status ?? "").toLowerCase() !== "enabled");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to update label", "error");
    }
  };

  const del = async (l: CustomerLabel) => {
    if (l.isSystem) { showToast("System labels can't be deleted", "info"); return; }
    try { await remove(l.id!); showToast("Label deleted", "success"); }
    catch (e) { showToast(e instanceof Error ? e.message : "Failed to delete label", "error"); }
  };

  const columns: ColumnDef<CustomerLabel>[] = [
    { key: "name", header: "Label", render: (l) => <LabelChip label={l} /> },
    { key: "description", header: "Description", render: (l) => l.description ?? "—" },
    { key: "isSystem", header: "Type", render: (l) => (l.isSystem ? "System" : "Custom") },
    { 
      key: "status", 
      header: "Status", 
      render: (l) => {
        const isActive = (l.status ?? "").toLowerCase() === "enabled";
        return (
          <Badge variant={isActive ? "success" : "neutral"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      } 
    },
    {
      key: "actions", header: "", align: "right",
      render: (l) => {
        const isActive = (l.status ?? "").toLowerCase() === "enabled";
        return (
          <div className="flex justify-end gap-1">
            <Popover
              trigger={
                <button
                  id={`bookings-label-actions-${l.id}`}
                  data-testid={`bookings-label-actions-${l.id}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>
              }
              placement="bottom"
              align="end"
              portal
            >
              <div className="flex min-w-[150px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg whitespace-nowrap">
                <button
                  className="px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={() => openEdit(l)}
                >
                  Edit
                </button>
                <button
                  className="px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={() => toggle(l)}
                >
                  {isActive ? "Disable" : "Enable"}
                </button>
                {!l.isSystem && (
                  <button
                    className="px-4 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                    onClick={() => del(l)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </Popover>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col gap-4">
      <PageHeader
        title="Customer Labels"
        subtitle="Tags for segmenting customers (e.g. VIP, New, Follow-up)."
        actions={<Button onClick={openCreate}>New Label</Button>}
      />

      {formOpen && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Color</label>
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-10 w-16 rounded border border-slate-200" />
            </div>
          </div>
          <Textarea label="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}

      {!formOpen && (
        <DataTable
          data={labels}
          columns={columns}
          getRowId={(l) => String(l.id ?? l.name)}
          loading={loading}
          emptyState={<EmptyState title="No labels yet" description="Create a label to start segmenting customers." />}
        />
      )}
    </div>
  );
}
