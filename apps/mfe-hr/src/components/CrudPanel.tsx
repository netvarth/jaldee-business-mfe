import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Building2, Users2, BadgeCheck, MapPin, Clock, CalendarDays, Plane, Fingerprint, Wallet, Plus, Pencil, Trash2, Loader2, AlertCircle, Save, X, Info, GitBranch, ShieldAlert, Hash, Rows3, LayoutGrid, Filter } from "lucide-react";
import { Button, Input, Select, Checkbox, Textarea, DataTable, DataTablePagination, Drawer, SectionCard, type ColumnDef } from "@jaldee/design-system";
import {
  SchemaFilterBuilder,
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";

export const TEAL = "var(--primary-color)";
export const lbl: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--light-text)" };
export const th: CSSProperties = { textAlign: "left", padding: "11px 16px", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--light-text)", background: "rgba(100,116,139,0.04)" };
export const tdc: CSSProperties = { padding: "13px 16px", fontSize: 13, color: "var(--dark-text)", borderTop: "1px solid var(--border-color)" };
export const field: CSSProperties = { width: "100%", height: 44, borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--surface-bg)", padding: "0 12px", fontSize: 14, fontWeight: 600, color: "var(--dark-text)" };
export const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 20, overflow: "hidden" };
export const chip: CSSProperties = { height: 38, padding: "0 16px", borderRadius: 10, border: "1px solid var(--border-color)", background: "var(--surface-bg)", color: "var(--dark-text)", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 };
export const chipOn: CSSProperties = { border: `1px solid ${TEAL}`, background: "rgba(17,94,89,0.08)", color: TEAL };
const viewToggleWrap: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 3, padding: 3, borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--surface-bg)" };
const viewToggleButton = (active: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 32,
  width: 32,
  borderRadius: 7,
  border: "none",
  cursor: "pointer",
  background: active ? "var(--primary-color)" : "transparent",
  color: active ? "#fff" : "var(--light-text)",
});

export type FieldType = "text" | "number" | "date" | "time" | "checkbox" | "select" | "multiselect" | "color" | "textarea";
export interface Field { key: string; label: string; type?: FieldType; options?: string[]; full?: boolean; placeholder?: string; }
export type Row = Record<string, unknown>;

/** Normalise a CSV string or array into a clean string[] (used by multiselect). */
export function toList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string" && v) return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

export function buildPayload(fields: Field[], form: Row): Row {
  const out: Row = {};
  fields.forEach((f) => {
    const v = form[f.key];
    if (f.type === "number") out[f.key] = v === "" || v == null ? null : Number(v);
    else if (f.type === "checkbox") out[f.key] = !!v;
    else if (f.type === "multiselect") { const arr = toList(v); out[f.key] = arr.length ? arr : null; } // JSON array (e.g. ClockTypeEnum[])
    else out[f.key] = v === "" || v == null ? null : v;
  });
  return out;
}

export function FieldInput({ f, value, onChange }: { f: Field; value: unknown; onChange: (v: unknown) => void }) {
  if (f.type === "checkbox") {
    return (
      <div style={{ height: 44, display: "flex", alignItems: "center" }}>
        <Checkbox label={f.label} checked={!!value} onCheckedChange={(v) => onChange(v as boolean)} />
      </div>
    );
  }
  if (f.type === "select") {
    return <Select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} options={[{value:"",label:"—"}, ...f.options!.map(o => ({value:o,label:o}))]} />;
  }
  if (f.type === "multiselect") {
    const selected = toList(value);
    const toggle = (opt: string) => onChange(selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt]);
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {f.options!.map((opt) => {
          const on = selected.includes(opt);
          return <button type="button" key={opt} onClick={() => toggle(opt)} aria-pressed={on} style={{ ...chip, ...(on ? chipOn : {}) }}>{opt}</button>;
        })}
      </div>
    );
  }
  if (f.type === "textarea") {
    return <Textarea value={(value as string) ?? ""} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} rows={4} />;
  }
  if (f.type === "color") {
    return <div style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="color" value={(value as string) || "#115E59"} onChange={(e) => onChange(e.target.value)} style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--border-color)", padding: 2, background: "var(--surface-bg)" }} /><Input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="#115E59" /></div>;
  }
  const tv = f.type === "time" && typeof value === "string" ? value.slice(0, 5) : value;
  return <Input type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "time" ? "time" : "text"} value={(tv as string) ?? ""} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />;
}

/* ---- Google Places location picker ---- */
const GMAPS_KEY = (import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_GOOGLE_MAPS_API_KEY;
let gmapsPromise: Promise<void> | null = null;
export function loadGoogleMaps(): Promise<void> {
  const w = window as unknown as { google?: { maps?: { places?: unknown } } };
  if (w.google?.maps?.places) return Promise.resolve();
  if (gmapsPromise) return gmapsPromise;
  gmapsPromise = new Promise<void>((resolve, reject) => {
    if (!GMAPS_KEY) { reject(new Error("no-key")); return; }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places`;
    s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps."));
    document.head.appendChild(s);
  });
  return gmapsPromise;
}

export interface PickedPlace { address: string; latitude: number; longitude: number; name?: string; }
export function LocationPicker({ onPick }: { onPick: (p: PickedPlace) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let ac: any;
    loadGoogleMaps().then(() => {
      const g = (window as any).google;
      if (!inputRef.current || !g?.maps?.places) { setErr("Google Maps unavailable."); return; }
      ac = new g.maps.places.Autocomplete(inputRef.current, { fields: ["formatted_address", "geometry", "name"] });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const loc = place?.geometry?.location;
        if (!loc) { setErr("No location data for that place. Pick a suggestion from the list."); return; }
        setErr(null);
        onPick({ address: place.formatted_address ?? place.name ?? "", latitude: loc.lat(), longitude: loc.lng(), name: place.name });
      });
    }).catch((e) => setErr(e.message === "no-key"
      ? "Set VITE_GOOGLE_MAPS_API_KEY in apps/mfe-hr/.env to enable Google location search."
      : (e instanceof Error ? e.message : "Failed to load Google Maps.")));
    return () => { const g = (window as any).google; if (ac && g) g.maps.event.clearInstanceListeners(ac); };
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, [onPick]);
  return (
    <div>
      <div style={{ position: "relative" }}>
        <Input ref={inputRef as any} placeholder="Search a place on Google… (auto-fills address & coordinates)" icon={<MapPin size={16} />} />
      </div>
      {err && <div style={{ marginTop: 6, fontSize: 12, color: err.includes("VITE_GOOGLE") ? "var(--light-text)" : "#e11d48" }}>{err}</div>}
    </div>
  );
}

/* ---- Singleton config form ---- */
export function ConfigForm({ title, subtitle, icon, fields, data, loading, error, onSave }: {
  title: string; subtitle: string; icon: ReactNode; fields: Field[];
  data: any; loading: boolean; error: string | null; onSave: (p: Row) => Promise<void>;
}) {
  const [form, setForm] = useState<Row>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { if (data) setForm({ ...data }); }, [data]);

  const save = async () => {
    setSaving(true); setMsg(null);
    try { await onSave(buildPayload(fields, form)); setMsg("Saved."); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PanelHeader title={title} subtitle={subtitle} icon={icon} />
      {error && <ErrorBar text={error} />}
      <div style={{ ...card, padding: 24 }}>
        {loading ? <Center><Loader2 size={22} className="animate-spin" /></Center> : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              {fields.map((f) => (
                <div key={f.key} style={{ gridColumn: f.full ? "1 / -1" : undefined }}>
                  {f.type !== "checkbox" && <label style={{ ...lbl, display: "block", marginBottom: 6 }}>{f.label}</label>}
                  <FieldInput f={f} value={form[f.key]} onChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))} />
                </div>
              ))}
            </div>
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, marginTop: 22 }}>
                {msg && <span style={{ fontSize: 13, color: msg === "Saved." ? "#059669" : "#e11d48", fontWeight: 600 }}>{msg}</span>}
                <Button onClick={save} disabled={saving} loading={saving} icon={!saving && <Save size={16} />}>Save Changes</Button>
              </div>
          </>
        )}
      </div>
    </div>
  );
}

const overlay: CSSProperties = { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const modalBox: CSSProperties = { background: "var(--surface-bg)", borderRadius: 24, width: "100%", maxWidth: 560, boxShadow: "0 24px 60px rgba(0,0,0,0.25)", overflow: "hidden", maxHeight: "92vh" };

/* ---- Generic list CRUD panel ---- */
// data typed loosely so specific hook interfaces (Shift, ShiftRotation, LeaveType…) satisfy it
// (TS interfaces aren't assignable to Record<string, unknown> without an index signature).
export interface Crud { data: any[]; loading: boolean; error: string | null; totalElements?: number; create: (p: Row) => Promise<void>; update: (uid: string, p: Row) => Promise<void>; remove: (uid: string) => Promise<void>; }
type CrudViewMode = "table" | "cards";
export function CrudPanel({ title, subtitle, icon, addLabel, fields, columns, hook, locationPicker, readOnly, viewMode, onViewModeChange, viewScope, cardTitle, cardRows, emptyText, tableContainerClassName, tableClassName, cardGridClassName, searchSchema, filterClauses, onFilterClausesChange, page, pageSize, onPageChange, onPageSizeChange }: {
  title: string; subtitle: string; icon: ReactNode; addLabel: string; fields: Field[];
  columns: { label: string; render: (r: Row) => ReactNode; align?: "right" }[]; hook: Crud;
  locationPicker?: boolean;
  /** When set, hides add/edit/delete and shows this note (data managed elsewhere). */
  readOnly?: string;
  viewMode?: CrudViewMode;
  onViewModeChange?: (value: CrudViewMode) => void;
  viewScope?: string;
  cardTitle?: (row: Row) => ReactNode;
  cardRows?: (row: Row) => Array<{ label: string; value: ReactNode }>;
  emptyText?: string;
  tableContainerClassName?: string;
  tableClassName?: string;
  cardGridClassName?: string;
  searchSchema?: SearchSchema | null;
  filterClauses?: SearchFilterClause[];
  onFilterClausesChange?: (filters: SearchFilterClause[]) => void;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [editing, setEditing] = useState<(Row & { id: string }) | null>(null);
  const [form, setForm] = useState<Row>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const openAdd = () => { setEditing(null); setForm({}); setMsg(null); setOpen(true); };
  const openEdit = (r: Row & { id: string }) => { setEditing(r); setForm({ ...r }); setMsg(null); setOpen(true); };
  const resolvedEmptyText = emptyText ?? "No records yet.";
  const appliedFilterCount = compactSearchClauses(filterClauses ?? [], searchSchema).length;
  const hasServerPagination = typeof page === "number" && typeof pageSize === "number" && typeof onPageChange === "function";
  const totalRecords = hook.totalElements ?? hook.data.length;
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

  const tableColumns: ColumnDef<Row & { id: string }>[] = [
    ...columns.map((column, index) => ({
      key: `column-${index}`,
      header: column.label,
      align: column.align,
      render: (row: Row & { id: string }) => column.render(row),
    })),
    ...(!readOnly
      ? [{
          key: "actions",
          header: "Actions",
          align: "right" as const,
          width: 116,
          render: (row: Row & { id: string }) => (
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit"><Pencil size={15} /></Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { if (confirm("Delete this record?")) void hook.remove(row.id); }}
                title="Delete"
                style={{ color: "#e11d48" }}
              >
                <Trash2 size={15} />
              </Button>
            </div>
          ),
        }]
      : []),
  ];

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const payload = buildPayload(fields, form);
      if (editing) await hook.update(editing.id, payload); else await hook.create(payload);
      setOpen(false);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Save failed."); }
    finally { setSaving(false); }
  };

  const showCardView = viewMode === "cards" && typeof cardTitle === "function" && typeof cardRows === "function";
  const actionNode = (
    <div className="flex w-full items-center justify-between gap-3 flex-wrap sm:w-auto sm:justify-end" style={{ minHeight: 44 }}>
      {!readOnly ? <Button onClick={openAdd} icon={<Plus size={16} />}>{addLabel}</Button> : null}
      {searchSchema && onFilterClausesChange ? (
        <Button
          type="button"
          variant={appliedFilterCount > 0 ? "primary" : "outline"}
          onClick={openFilters}
          icon={<Filter size={16} />}
        >
          Filter{appliedFilterCount > 0 ? ` (${appliedFilterCount})` : ""}
        </Button>
      ) : null}
      {viewMode && onViewModeChange && viewScope ? (
        <div className="ml-auto shrink-0" style={viewToggleWrap}>
          <button
            id={`${viewScope}-table`}
            data-testid={`${viewScope}-table`}
            type="button"
            onClick={() => onViewModeChange("table")}
            style={viewToggleButton(viewMode === "table")}
            aria-label="Table view"
            title="Table view"
          >
            <Rows3 size={14} />
          </button>
          <button
            id={`${viewScope}-cards`}
            data-testid={`${viewScope}-cards`}
            type="button"
            onClick={() => onViewModeChange("cards")}
            style={viewToggleButton(viewMode === "cards")}
            aria-label="Card view"
            title="Card view"
          >
            <LayoutGrid size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <div>
      <PanelHeader title={title} subtitle={subtitle} icon={icon} action={readOnly && !viewMode ? undefined : actionNode} />
      {readOnly && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 12, borderRadius: 10, background: "rgba(17,94,89,0.06)", border: "1px solid rgba(17,94,89,0.15)", fontSize: 12.5, fontWeight: 600, color: "var(--dark-text)" }}>
          <Info size={14} style={{ color: TEAL, flexShrink: 0 }} /> {readOnly}
        </div>
      )}
      {hook.error && <ErrorBar text={hook.error} />}
      <SectionCard className={tableContainerClassName ? "overflow-hidden border-0 shadow-none" : "overflow-hidden border-slate-200 shadow-sm"} padding={false}>
        {showCardView ? (
          hook.loading ? (
            <Center><Loader2 size={22} className="animate-spin" /></Center>
          ) : hook.data.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm font-semibold text-slate-500">{resolvedEmptyText}</div>
          ) : (
            <div className={cardGridClassName ?? "grid gap-3 p-[14px]"}>
              {hook.data.map((row) => (
                <div key={row.id} style={{ border: "1px solid var(--border-color)", borderRadius: 18, padding: 16, background: "var(--surface-bg)", display: "grid", gap: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--dark-text)" }}>{cardTitle(row)}</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {cardRows(row).map((item) => (
                      <div key={String(item.label)} style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
                        <span style={{ ...lbl, fontSize: 8.5 }}>{item.label}</span>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--dark-text)", textAlign: "right" }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                  {!readOnly ? (
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit"><Pencil size={15} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this record?")) void hook.remove(row.id); }} title="Delete" style={{ color: "#e11d48" }}><Trash2 size={15} /></Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )
        ) : (
          <DataTable
            data={hook.data as Array<Row & { id: string }>}
            columns={tableColumns}
            getRowId={(row) => row.id}
            loading={hook.loading}
            emptyState={<div className="px-6 py-12 text-center text-sm font-semibold text-slate-500">{resolvedEmptyText}</div>}
            className={tableContainerClassName ?? "rounded-none border-0 shadow-none"}
            tableClassName={tableClassName ?? "min-w-[720px] [&_thead_tr]:border-[color:color-mix(in_srgb,var(--color-border)_42%,white)] [&_tbody_tr]:border-[color:color-mix(in_srgb,var(--color-border)_38%,white)] [&_thead_th]:h-12 [&_thead_th]:px-5 [&_thead_th]:py-3 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.02em] [&_tbody_td]:h-[72px] [&_tbody_td]:px-5 [&_tbody_td]:py-4 [&_tbody_td]:text-sm [&_tbody_td]:font-medium"}
            pagination={hasServerPagination ? {
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
          />
        )}
        {showCardView && hasServerPagination ? (
          <DataTablePagination
            testId={`${viewScope ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-pagination`}
            page={page}
            pageSize={pageSize}
            total={totalRecords}
            onChange={onPageChange}
            onPageSizeChange={onPageSizeChange ? (size) => {
              onPageSizeChange(size);
              onPageChange(1);
            } : undefined}
          />
        ) : null}
      </SectionCard>

      {open && (
        <div style={overlay} onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
               <h3 style={{ fontSize: 18, fontWeight: 900, color: "var(--dark-text)", margin: 0 }}>{editing ? "Edit" : addLabel}</h3>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}><X size={20} /></button>
            </div>
            <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxHeight: "62vh", overflowY: "auto" }}>
              {locationPicker && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ ...lbl, display: "block", marginBottom: 6 }}>Search location (Google)</label>
                  <LocationPicker onPick={(p) => setForm((prev) => ({
                    ...prev,
                    address: p.address,
                    latitude: p.latitude,
                    longitude: p.longitude,
                    name: (prev.name as string) || p.name || "",
                  }))} />
                </div>
              )}
              {fields.map((f) => (
                <div key={f.key} style={{ gridColumn: f.full ? "1 / -1" : undefined }}>
                  {f.type !== "checkbox" && <label style={{ ...lbl, display: "block", marginBottom: 6 }}>{f.label}</label>}
                  <FieldInput f={f} value={form[f.key]} onChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))} />
                </div>
              ))}
            </div>
            {msg && <div style={{ margin: "0 24px", padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
            <div style={{ padding: "18px 24px", background: "var(--app-bg)", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving} loading={saving} icon={!saving && <Save size={16} />}>{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </div>
      )}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={`${title} Filters`}
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden">
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
            <Button type="button" variant="outline" className="flex-1" onClick={() => { clearFilters(); setFiltersOpen(false); }}>Reset All</Button>
            <Button type="button" variant="primary" className="flex-1" onClick={applyFilters}>Apply Filters</Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

/* ---- small shared bits ---- */
export const PanelHeader = ({ title, subtitle, icon, action }: { title: string; subtitle: string; icon: ReactNode; action?: ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 44 }}>
      <div style={{ height: 44, width: 44, borderRadius: 14, background: "rgba(17,94,89,0.08)", color: TEAL, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.4px", color: "var(--dark-text)", margin: 0 }}>{title}</h2>
        <p style={{ ...lbl, marginTop: 2 }}>{subtitle}</p>
      </div>
    </div>
    <div className="w-full sm:w-auto" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", minHeight: 44 }}>
      {action}
    </div>
  </div>
);
export const ErrorBar = ({ text }: { text: string }) => <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 12, background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}><AlertCircle size={16} /> {text}</div>;
export const Center = ({ children }: { children: ReactNode }) => <div style={{ display: "flex", justifyContent: "center", padding: "40px 0", color: "var(--light-text)" }}>{children}</div>;
export const yesNo = (v: unknown) => <span style={{ ...lbl, color: v ? "#059669" : "var(--light-text)" }}>{v ? "Yes" : "No"}</span>;
