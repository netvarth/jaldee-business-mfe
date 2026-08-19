import { useMemo, useState } from "react";
import {
  Button, DataTable, EmptyState, Input, PageHeader, Textarea, type ColumnDef, Badge, Popover, Drawer
} from "@jaldee/design-system";
import {
  SchemaFilterBuilder,
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { useCustomerLabels, type CustomerLabel } from "../../services/useCustomerLabels";
import { useCustomerLabelSearchSchema } from "../../services/useCustomerLabelSearchSchema";
import { formatAppliedCustomerFilterSummary } from "../../services/customerSearch";
import { useToast } from "../../contexts/ToastContext";
import { LayoutGrid, List, Filter } from "lucide-react";

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
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { schema, loading: schemaLoading } = useCustomerLabelSearchSchema();

  const { labels, loading, error, create, update, setEnabled, remove } = useCustomerLabels({
    filterClauses: advancedFilters,
    schema,
  });
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const appliedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, schema).length,
    [advancedFilters, schema]
  );

  const appliedFilterSummary = useMemo(
    () => formatAppliedCustomerFilterSummary(advancedFilters, schema),
    [advancedFilters, schema]
  );

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

  const renderActions = (l: CustomerLabel) => {
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
          <div className="flex min-w-[150px] flex-col whitespace-nowrap py-1">
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
      render: renderActions,
    },
  ];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col gap-4">
      <PageHeader
        title="Customer Labels"
        subtitle="Tags for segmenting customers (e.g. VIP, New, Follow-up)."
        actions={!formOpen ? <Button onClick={openCreate}>New Label</Button> : undefined}
        stackOnMobile={false}
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
        <>
          <div className="-mt-2 flex flex-row items-center justify-between gap-2 sm:gap-4">
            <div className="flex-1" />
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:ml-auto">
              <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm mr-2">
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center justify-center rounded-md p-1.5 transition ${viewMode === "list" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
                  aria-label="List View"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center justify-center rounded-md p-1.5 transition ${viewMode === "grid" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
                  aria-label="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
              <Button
                type="button"
                variant={appliedFilterCount > 0 ? "primary" : "outline"}
                onClick={() => {
                  setDraftFilters(
                    advancedFilters.length > 0
                      ? advancedFilters
                      : buildDefaultSearchClauses(schema)
                  );
                  setDrawerOpen(true);
                }}
                className={`flex items-center gap-2 rounded-md px-4 py-2 font-semibold ${
                  appliedFilterCount > 0 ? "" : "border-indigo-100 text-indigo-700 hover:bg-indigo-50/20"
                }`}
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {appliedFilterCount > 0 ? (
                  <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                    appliedFilterCount > 0 ? "bg-white/20" : "bg-indigo-100 text-indigo-700"
                  }`}>
                    {appliedFilterCount}
                  </span>
                ) : null}
              </Button>
            </div>
          </div>

          {viewMode === "list" ? (
          <DataTable
            data={labels}
            columns={columns}
            getRowId={(l) => String(l.id ?? l.name)}
            loading={loading}
            emptyState={<EmptyState title="No labels yet" description="Create a label to start segmenting customers." />}
            tableClassName="min-w-[500px]"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {loading ? (
              <div className="col-span-full py-12 text-center text-sm text-slate-500">Loading labels...</div>
            ) : labels.length === 0 ? (
              <div className="col-span-full">
                <EmptyState title="No labels yet" description="Create a label to start segmenting customers." />
              </div>
            ) : (
              labels.map((l) => {
                const isActive = (l.status ?? "").toLowerCase() === "enabled";
                return (
                  <div key={l.id ?? l.name} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                    <div className="flex items-start justify-between mb-4 gap-4">
                      <LabelChip label={l} />
                      {renderActions(l)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-600 line-clamp-2">{l.description || "—"}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-xs font-medium text-slate-500">{l.isSystem ? "System" : "Custom"}</span>
                      <Badge variant={isActive ? "success" : "neutral"}>
                        {isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          )}
        </>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filters"
        size="sm"
        contentClassName="flex flex-col overflow-hidden p-0"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <SchemaFilterBuilder
              schema={schema}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              appliedSummary={appliedFilterSummary}
              onClearAll={() => {
                const resetClauses = buildDefaultSearchClauses(schema);
                setDraftFilters(resetClauses);
                setAdvancedFilters(resetClauses);
              }}
              emptyStateMessage="No label filters are available from the schema."
            />
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white p-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const resetClauses = buildDefaultSearchClauses(schema);
                setDraftFilters(resetClauses);
                setAdvancedFilters(resetClauses);
              }}
            >
              Reset All
            </Button>
            <Button
              type="button"
              onClick={() => {
                setAdvancedFilters(draftFilters);
                setDrawerOpen(false);
              }}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
