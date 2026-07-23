import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2, Users2, BadgeCheck, Clock, CalendarDays, Plane, Fingerprint, Wallet, Plus, Pencil, Trash2, Loader2, AlertCircle, Save, X, MoreVertical, Filter, ToggleLeft, ToggleRight } from "lucide-react";
import { Dialog, Select, Input, Checkbox, Textarea, Popover, Skeleton, SkeletonTable, MultiCombobox, TimePicker, DatePicker, DataTable, Drawer, SectionCard, Button, type ColumnDef } from "@jaldee/design-system";
import {
  SchemaFilterBuilder,
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import {
  useDepartments, useDesignations, useShifts, useLeaveTypes, useHolidays,
  useCompanyProfile, useAttendanceRules, usePayrollSettings,
} from "../../services/useSettingsData";
import { useDepartmentSearchSchema, useDesignationSearchSchema, useHolidaySearchSchema } from "../../services/useHrSearchSchema";
import { useMFEProps, SHELL_TOAST_EVENT } from "@jaldee/auth-context";
import { useEmployees } from "../../services/useEmployees";
import { useHrApi } from "../../services/useHrApi";
import { CLOCK_TYPE_OPTIONS } from "../../types";

const TEAL = "var(--primary-color)";
const lbl: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--light-text)" };
const th: CSSProperties = { textAlign: "left", padding: "11px 16px", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--light-text)", background: "rgba(100,116,139,0.04)" };
const tdc: CSSProperties = { padding: "13px 16px", fontSize: 13, color: "var(--dark-text)", borderTop: "1px solid var(--border-color)" };
const field: CSSProperties = { width: "100%", height: 44, borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--surface-bg)", padding: "0 12px", fontSize: 14, fontWeight: 600, color: "var(--dark-text)" };
const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 20, overflow: "hidden" };
const LEAVE_CATEGORY_OPTIONS = [
  { value: "CASUAL", label: "Casual" },
  { value: "SICK", label: "Sick" },
  { value: "EARNED", label: "Earned" },
  { value: "MATERNITY", label: "Maternity" },
  { value: "PATERNITY", label: "Paternity" },
  { value: "COMP_OFF", label: "Comp Off" },
  { value: "LOSS_OF_PAY", label: "Loss Of Pay" },
  { value: "SPECIAL", label: "Special" },
  { value: "OTHER", label: "Other" },
] as const;

type FieldType = "text" | "number" | "date" | "time" | "checkbox" | "select" | "multiselect" | "color" | "textarea";
interface Field {
  key: string;
  label: string;
  type?: FieldType;
  serialize?: "time12" | "csv";
  options?: (string | { value: string; label: string })[];
  full?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  sourceKey?: string;
  optional?: boolean;
  is12Hour?: boolean;
}
type Row = Record<string, unknown>;

function toTimeInputValue(value: unknown): string {
  if (typeof value !== "string") return "";
  const time = value.trim();
  const twentyFourHour = time.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (twentyFourHour) return time;

  const twelveHour = time.match(/^(\d{1,2})[.:](\d{2})\s*([AP]M)$/i);
  if (!twelveHour) return "";

  let hour = Number(twelveHour[1]);
  const minute = twelveHour[2];
  const period = twelveHour[3].toUpperCase();
  if (hour < 1 || hour > 12) return "";
  if (period === "AM" && hour === 12) hour = 0;
  if (period === "PM" && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function toBackendTime(value: unknown): string | null {
  const time = toTimeInputValue(value);
  if (!time) return null;
  const [hourText, minute] = time.split(":");
  const hour24 = Number(hourText);
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${minute} ${period}`;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function leaveCategoryLabel(value: unknown): string {
  const normalized = String(value || "").trim().toUpperCase();
  return LEAVE_CATEGORY_OPTIONS.find((option) => option.value === normalized)?.label || String(value || "â€”");
}

function buildPayload(fields: Field[], form: Row): Row {
  const out: Row = {};
  fields.forEach((f) => {
    const v = form[f.key] ?? f.defaultValue;
    if (f.serialize === "time12") out[f.key] = toBackendTime(v);
    else if (f.type === "time") out[f.key] = toTimeInputValue(v) || null;
    else if (f.serialize === "csv") {
      out[f.key] = Array.isArray(v)
        ? v.map(String).filter(Boolean).join(",")
        : typeof v === "string"
          ? v.split(",").map((item) => item.trim()).filter(Boolean).join(",")
          : "";
    }
    else if (f.type === "number") out[f.key] = v === "" || v == null ? null : Number(v);
    else if (f.type === "checkbox") out[f.key] = !!v;
    else if (f.type === "multiselect") {
      out[f.key] = Array.isArray(v)
        ? v.map(String)
        : typeof v === "string"
          ? v.split(",").map((item) => item.trim()).filter(Boolean)
          : [];
    }
    else out[f.key] = v === "" || v == null ? null : v;
  });
  return out;
}

function FieldInput({ f, value, onChange, automationKey }: { f: Field; value: unknown; onChange: (v: unknown) => void; automationKey: string }) {
  if (f.type === "checkbox") {
    return (
      <div style={{ display: "flex", alignItems: "center", height: 44 }}>
        <Checkbox
          id={automationKey}
          data-testid={automationKey}
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          label={f.label}
          className="!h-4 !w-4"
        />
      </div>
    );
  }
  if (f.type === "select") {
    const opts = f.options!.map((o) => {
      if (typeof o === "object" && o !== null && "value" in o) {
        return o;
      }
      return { value: String(o), label: String(o) };
    });
    if (f.optional) {
      opts.unshift({ value: "", label: "None" });
    }
    return (
      <Select
        id={automationKey}
        testId={automationKey}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="â€”"
        options={opts}
        fullWidth
        className="!h-11 rounded-xl"
      />
    );
  }
  if (f.type === "multiselect") {
    const selected = Array.isArray(value)
      ? value.map(String)
      : typeof value === "string"
        ? value.split(",").map((item) => item.trim()).filter(Boolean)
        : [];
    return (
      <MultiCombobox
        id={automationKey}
        data-testid={automationKey}
        value={selected}
        onValueChange={onChange}
        placeholder="Select days"
        searchPlaceholder="Search weekdays..."
        options={(f.options ?? []).map((option) => ({
          value: option,
          label: option.charAt(0) + option.slice(1).toLowerCase(),
        }))}
        maxDisplay={3}
      />
    );
  }
  if (f.type === "textarea") {
    return (
      <Textarea
        id={automationKey}
        data-testid={automationKey}
        value={(value as string) ?? ""}
        placeholder={f.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl !py-2.5"
        rows={3}
      />
    );
  }
  if (f.type === "color") {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          id={`${automationKey}-picker`}
          data-testid={`${automationKey}-picker`}
          type="color"
          value={(value as string) || "#115E59"}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            border: "1px solid var(--border-color)",
            padding: 2,
            background: "var(--surface-bg)",
            cursor: "pointer",
          }}
        />
        <Input
          id={automationKey}
          data-testid={automationKey}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#115E59"
          className="rounded-xl !h-11"
        />
      </div>
    );
  }
  if (f.type === "time") {
    const tv = toTimeInputValue(value);
    return (
      <TimePicker
        id={automationKey}
        data-testid={automationKey}
        value={tv}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl !h-11"
        use12Hour={!!f.is12Hour}
      />
    );
  }
  return (
    <Input
      id={automationKey}
      data-testid={automationKey}
      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
      value={(value as string) ?? ""}
      placeholder={f.placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl !h-11"
    />
  );
}

/* ---- Singleton config form ---- */
function ConfigForm({ title, subtitle, icon, fields, data, loading, error, onSave, automationScope }: {
  title: string; subtitle: string; icon: ReactNode; fields: Field[];
  data: Row | null; loading: boolean; error: string | null; onSave: (p: Row) => Promise<void>;
  automationScope: string;
}) {
  const { eventBus } = useMFEProps();
  const [form, setForm] = useState<Row>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data) setForm({ ...data }); }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(buildPayload(fields, form));
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: title,
        message: "Settings saved successfully.",
      });
    } catch (e) {
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: title,
        message: e instanceof Error ? e.message : "Save failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PanelHeader title={title} subtitle={subtitle} icon={icon} />
      {error && <div id={`${automationScope}-error`} data-testid={`${automationScope}-error`}><ErrorBar text={error} /></div>}
      <div id={`${automationScope}-panel`} data-testid={`${automationScope}-panel`} style={{ ...card, overflow: "visible", padding: 24, position: "relative", zIndex: 1 }}>
        {loading ? (
          <div id={`${automationScope}-loading`} data-testid={`${automationScope}-loading`} className="grid grid-cols-1 sm:grid-cols-2 gap-[18px] animate-pulse">
            {fields.map((f) => (
              <div key={f.key} style={{ gridColumn: f.full ? "1 / -1" : undefined }} className="space-y-2">
                {f.type !== "checkbox" && <Skeleton height={12} width={100} className="rounded bg-[var(--border-color)] opacity-40" />}
                <Skeleton height={44} className="rounded-xl w-full bg-[var(--border-color)] opacity-60" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[18px]">
              {fields.map((f) => (
                <div key={f.key} style={{ gridColumn: f.full ? "1 / -1" : undefined }}>
                  {f.type !== "checkbox" && <label style={{ ...lbl, display: "block", marginBottom: 6 }}>{f.label}</label>}
                  <FieldInput f={f} automationKey={`${automationScope}-${slugify(f.key)}`} value={form[f.key]} onChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, marginTop: 22 }}>
              <Button id={`${automationScope}-save`} data-testid={`${automationScope}-save`} variant="primary" onClick={save} loading={saving} icon={<Save size={16} />}>Save Changes</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---- Generic list CRUD panel ---- */
interface Crud { data: (Row & { id: string })[]; loading: boolean; error: string | null; totalElements?: number; create: (p: Row) => Promise<void>; update: (uid: string, p: Row) => Promise<void>; remove: (uid: string) => Promise<void>; }
function CrudPanel({ title, subtitle, icon, addLabel, fields, columns, hook, automationScope, searchSchema, filterClauses, onFilterClausesChange, page, pageSize, onPageChange, onPageSizeChange, statusToggle }: {
  title: string; subtitle: string; icon: ReactNode; addLabel: string; fields: Field[];
  columns: { label: string; render: (r: Row) => ReactNode; align?: "right" }[]; hook: Crud;
  automationScope: string;
  searchSchema?: SearchSchema | null;
  filterClauses?: SearchFilterClause[];
  onFilterClausesChange?: (filters: SearchFilterClause[]) => void;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  statusToggle?: {
    isEnabled: (row: Row & { id: string }) => boolean;
    onChange: (uid: string, status: "Enabled" | "Disabled") => Promise<void>;
  };
}) {
  const { eventBus } = useMFEProps();
  const [open, setOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [editing, setEditing] = useState<(Row & { id: string }) | null>(null);
  const [form, setForm] = useState<Row>({});
  const [saving, setSaving] = useState(false);
  const [statusRow, setStatusRow] = useState<(Row & { id: string }) | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const appliedFilterCount = compactSearchClauses(filterClauses ?? [], searchSchema).length;
  const totalRecords = hook.totalElements ?? hook.data.length;
  const hasPagination = typeof page === "number" && typeof pageSize === "number" && typeof onPageChange === "function";

  const openFilters = () => {
    setDraftFilters(filterClauses?.length ? filterClauses : buildDefaultSearchClauses(searchSchema));
    setFiltersOpen(true);
  };
  const clearFilters = () => {
    const reset = buildDefaultSearchClauses(searchSchema);
    setDraftFilters(reset);
    onFilterClausesChange?.(reset);
    onPageChange?.(1);
  };
  const applyFilters = () => {
    onFilterClausesChange?.(draftFilters);
    onPageChange?.(1);
    setFiltersOpen(false);
  };

  const openAdd = () => {
    setEditing(null);
    setForm(Object.fromEntries(fields.filter((f) => f.defaultValue !== undefined).map((f) => [f.key, f.defaultValue])));
    setOpen(true);
  };
  const openEdit = (r: Row & { id: string }) => {
    const next = { ...r };
    fields.forEach((f) => {
      if (next[f.key] === undefined && f.sourceKey && r[f.sourceKey] !== undefined) {
        next[f.key] = r[f.sourceKey];
      }
    });
    setEditing(r);
    setForm(next);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = buildPayload(fields, form);
      if (editing) await hook.update(editing.id, payload); else await hook.create(payload);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: title,
        message: `${editing ? "Updated" : "Created"} successfully.`,
      });
      setOpen(false);
    } catch (e) {
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: title,
        message: e instanceof Error ? e.message : "Save failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    try {
      await hook.remove(id);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: title,
        message: "Deleted successfully.",
      });
    } catch (e) {
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: title,
        message: e instanceof Error ? e.message : "Delete failed.",
      });
    }
  };

  const confirmStatusChange = async () => {
    if (!statusRow || !statusToggle) return;
    const nextStatus = statusToggle.isEnabled(statusRow) ? "Disabled" : "Enabled";
    setStatusSaving(true);
    try {
      await statusToggle.onChange(statusRow.id, nextStatus);
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "success", title, message: `${title} ${nextStatus.toLowerCase()} successfully.` });
      setStatusRow(null);
    } catch (e) {
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "error", title, message: e instanceof Error ? e.message : "Status update failed." });
    } finally {
      setStatusSaving(false);
    }
  };

  const tableColumns: ColumnDef<Row & { id: string }>[] = [
    ...columns.map((column, index) => ({
      key: `column-${index}`,
      header: column.label,
      align: column.align,
      render: (row: Row & { id: string }) => column.render(row),
    })),
    {
      key: "actions",
      header: "Actions",
      align: "right",
      width: 112,
      render: (row: Row & { id: string }) => (
        <div className="flex items-center justify-end gap-2">
          <button id={`${automationScope}-edit-${row.id}`} data-testid={`${automationScope}-edit-${row.id}`} onClick={() => openEdit(row)} title="Edit" aria-label={`Edit ${title} record`} style={iconAction}><Pencil size={15} /></button>
          {statusToggle ? (() => {
            const enabled = statusToggle.isEnabled(row);
            const action = enabled ? "disable" : "enable";
            return <button id={`${automationScope}-${action}-${row.id}`} data-testid={`${automationScope}-${action}-${row.id}`} onClick={() => setStatusRow(row)} title={enabled ? "Disable department" : "Enable department"} aria-label={`${enabled ? "Disable" : "Enable"} ${title} record`} style={{ ...iconAction, width: 38, color: enabled ? "#059669" : "#64748b", background: enabled ? "rgba(5,150,105,0.07)" : "rgba(100,116,139,0.07)" }}>{enabled ? <ToggleRight size={22} strokeWidth={2.2} /> : <ToggleLeft size={22} strokeWidth={2.2} />}</button>;
          })() : <button id={`${automationScope}-delete-${row.id}`} data-testid={`${automationScope}-delete-${row.id}`} onClick={() => handleDelete(row.id)} title="Delete" aria-label={`Delete ${title} record`} style={{ ...iconAction, color: "#e11d48" }}><Trash2 size={15} /></button>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PanelHeader title={title} subtitle={subtitle} icon={icon} action={
        <div className="flex flex-wrap justify-end gap-2">
          {searchSchema && onFilterClausesChange ? (
            <Button type="button" id={`${automationScope}-filter`} data-testid={`${automationScope}-filter`} variant={appliedFilterCount > 0 ? "primary" : "outline"} icon={<Filter size={16} />} aria-label={`Open ${title} filters`} onClick={openFilters}>
              Filter{appliedFilterCount > 0 ? ` (${appliedFilterCount})` : ""}
            </Button>
          ) : null}
          <Button id={`${automationScope}-add`} data-testid={`${automationScope}-add`} variant="primary" icon={<Plus size={16} />} onClick={openAdd}>{addLabel}</Button>
        </div>
      } />
      {hook.error && <ErrorBar text={hook.error} />}
      {hook.loading ? (
        <SectionCard className="border-slate-200 shadow-sm" data-testid={`${automationScope}-panel`}>
          <div style={{ padding: 4 }}>
          <SkeletonTable rows={4} columns={columns.length + 1} />
          </div>
        </SectionCard>
      ) : (
        <SectionCard id={`${automationScope}-panel`} data-testid={`${automationScope}-panel`} className="overflow-hidden border-slate-200 shadow-sm" padding={false}>
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-5 py-4">
            <div>
              <div className="text-sm font-bold text-slate-900">{title}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{totalRecords} record{totalRecords === 1 ? "" : "s"}</div>
            </div>
          </div>
          <DataTable
            data={hook.data}
            columns={tableColumns}
            getRowId={(row) => row.id}
            data-testid={`${automationScope}-table`}
            pagination={hasPagination ? {
              page,
              pageSize,
              total: totalRecords,
              mode: "server",
              onChange: onPageChange,
              onPageSizeChange: onPageSizeChange ? (size) => {
                onPageSizeChange(size);
                onPageChange(1);
              } : undefined,
            } : undefined}
            emptyState={<div className="px-6 py-12 text-center text-sm font-semibold text-slate-500">No records yet.</div>}
            className="rounded-none border-0 shadow-none"
            tableClassName="[&_tbody_td]:py-4 [&_tbody_td]:text-sm [&_thead_th]:py-3 [&_thead_th]:text-[11px] [&_thead_th]:font-extrabold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.14em]"
          />
        </SectionCard>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        testId={`${automationScope}-modal`}
        hideHeader
        contentClassName="max-w-[560px] p-0 overflow-visible"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: "var(--dark-text)", margin: 0 }}>{editing ? "Edit" : addLabel}</h3>
          <button id={`${automationScope}-modal-close`} data-testid={`${automationScope}-modal-close`} onClick={() => setOpen(false)} aria-label={`Close ${title} dialog`} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.key} style={{ gridColumn: f.full ? "1 / -1" : undefined }}>
              {f.type !== "checkbox" && <label style={{ ...lbl, display: "block", marginBottom: 6 }}>{f.label}</label>}
              <FieldInput f={f} automationKey={`${automationScope}-${slugify(f.key)}`} value={form[f.key]} onChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))} />
            </div>
          ))}
        </div>
        <div style={{ padding: "18px 24px", background: "var(--app-bg)", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button id={`${automationScope}-cancel`} data-testid={`${automationScope}-cancel`} onClick={() => setOpen(false)} style={ghostBtn}>Cancel</button>
          <button id={`${automationScope}-save`} data-testid={`${automationScope}-save`} onClick={save} disabled={saving} style={primaryBtn}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {editing ? "Update" : "Create"}</button>
        </div>
      </Dialog>
      <Dialog
        open={!!statusRow}
        onClose={() => !statusSaving && setStatusRow(null)}
        testId={`${automationScope}-status-modal`}
        title={`${statusRow && statusToggle?.isEnabled(statusRow) ? "Disable" : "Enable"} ${title}`}
        description={`Are you sure you want to ${statusRow && statusToggle?.isEnabled(statusRow) ? "disable" : "enable"} this record?`}
        size="sm"
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button id={`${automationScope}-status-cancel`} data-testid={`${automationScope}-status-cancel`} variant="outline" onClick={() => setStatusRow(null)} disabled={statusSaving}>Cancel</Button>
          <Button id={`${automationScope}-status-confirm`} data-testid={`${automationScope}-status-confirm`} variant="primary" onClick={confirmStatusChange} loading={statusSaving}>Confirm</Button>
        </div>
      </Dialog>
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={`${title} Filters`}
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden" data-testid={`${automationScope}-filter-drawer`}>
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <SchemaFilterBuilder
              schema={searchSchema ?? null}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              onClearAll={clearFilters}
              emptyStateMessage={`No ${title.toLowerCase()} filters are available from the schema.`}
            />
          </div>
          <div className="flex shrink-0 gap-3 border-t border-gray-200 p-5">
            <button type="button" style={{ ...ghostBtn, flex: 1 }} data-testid={`${automationScope}-filter-reset`} onClick={() => { clearFilters(); setFiltersOpen(false); }}>Reset All</button>
            <button type="button" style={{ ...primaryBtn, flex: 1 }} data-testid={`${automationScope}-filter-apply`} onClick={applyFilters}>Apply Filters</button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

const PanelHeader = ({ title, subtitle, icon, action }: { title: string; subtitle: string; icon: ReactNode; action?: ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ height: 44, width: 44, borderRadius: 14, background: "rgba(17,94,89,0.08)", color: TEAL, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      <div><h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.4px", color: "var(--dark-text)", margin: 0 }}>{title}</h2><p style={{ ...lbl, marginTop: 2 }}>{subtitle}</p></div>
    </div>
    {action}
  </div>
);
const ErrorBar = ({ text }: { text: string }) => <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 12, background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}><AlertCircle size={16} /> {text}</div>;
const Center = ({ children }: { children: ReactNode }) => <div style={{ display: "flex", justifyContent: "center", padding: "40px 0", color: "var(--light-text)" }}>{children}</div>;
const yesNo = (v: unknown) => <span style={{ ...lbl, color: v ? "#059669" : "var(--light-text)" }}>{v ? "Yes" : "No"}</span>;

const ghostBtn: CSSProperties = { height: 42, padding: "0 20px", borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--surface-bg)", color: "var(--dark-text)", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const primaryBtn: CSSProperties = { height: 42, padding: "0 22px", borderRadius: 12, border: "none", background: TEAL, color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 };
const iconAction: CSSProperties = { height: 32, width: 32, borderRadius: 9, border: "1px solid var(--border-color)", background: "var(--surface-bg)", color: "var(--light-text)", cursor: "pointer", marginLeft: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" };

export { ConfigForm, CrudPanel, FieldInput, PanelHeader, ErrorBar, Center, TEAL, lbl, th, tdc, card, yesNo, LEAVE_CATEGORY_OPTIONS, leaveCategoryLabel };
export type { Field, Row, Crud };
