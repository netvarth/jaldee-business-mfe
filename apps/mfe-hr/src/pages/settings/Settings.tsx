import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Building2, Users2, BadgeCheck, MapPin, Clock, CalendarDays, Plane, Fingerprint, Wallet, Plus, Pencil, Trash2, Loader2, AlertCircle, Save, X } from "lucide-react";
import { PageHeader } from "@jaldee/design-system";
import {
  useDepartments, useDesignations, useBranchesAdmin, useShifts, useLeaveTypes, useHolidays,
  useCompanyProfile, useAttendanceRules, usePayrollSettings,
} from "../../services/useSettingsData";

const TEAL = "var(--primary-color)";
const lbl: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--light-text)" };
const th: CSSProperties = { textAlign: "left", padding: "11px 16px", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--light-text)", background: "rgba(100,116,139,0.04)" };
const tdc: CSSProperties = { padding: "13px 16px", fontSize: 13, color: "var(--dark-text)", borderTop: "1px solid var(--border-color)" };
const field: CSSProperties = { width: "100%", height: 44, borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--surface-bg)", padding: "0 12px", fontSize: 14, fontWeight: 600, color: "var(--dark-text)" };
const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 20, overflow: "hidden" };

type FieldType = "text" | "number" | "date" | "time" | "checkbox" | "select" | "color" | "textarea";
interface Field { key: string; label: string; type?: FieldType; options?: string[]; full?: boolean; placeholder?: string; }
type Row = Record<string, unknown>;

function buildPayload(fields: Field[], form: Row): Row {
  const out: Row = {};
  fields.forEach((f) => {
    const v = form[f.key];
    if (f.type === "number") out[f.key] = v === "" || v == null ? null : Number(v);
    else if (f.type === "checkbox") out[f.key] = !!v;
    else out[f.key] = v === "" || v == null ? null : v;
  });
  return out;
}

function FieldInput({ f, value, onChange }: { f: Field; value: unknown; onChange: (v: unknown) => void }) {
  if (f.type === "checkbox") {
    return (
      <label style={{ display: "flex", alignItems: "center", gap: 10, height: 44, fontSize: 14, fontWeight: 700, color: "var(--dark-text)", cursor: "pointer" }}>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18 }} /> {f.label}
      </label>
    );
  }
  if (f.type === "select") {
    return <select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} style={field}><option value="">—</option>{f.options!.map((o) => <option key={o} value={o}>{o}</option>)}</select>;
  }
  if (f.type === "textarea") {
    return <textarea value={(value as string) ?? ""} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} style={{ ...field, height: 80, padding: 12, resize: "vertical" }} />;
  }
  if (f.type === "color") {
    return <div style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="color" value={(value as string) || "#115E59"} onChange={(e) => onChange(e.target.value)} style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--border-color)", padding: 2, background: "var(--surface-bg)" }} /><input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="#115E59" style={field} /></div>;
  }
  const tv = f.type === "time" && typeof value === "string" ? value.slice(0, 5) : value;
  return <input type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "time" ? "time" : "text"} value={(tv as string) ?? ""} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} style={field} />;
}

/* ---- Google Places location picker ---- */
const GMAPS_KEY = (import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_GOOGLE_MAPS_API_KEY;
let gmapsPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
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
function LocationPicker({ onPick }: { onPick: (p: PickedPlace) => void }) {
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
        <MapPin size={16} style={{ position: "absolute", left: 12, top: 14, color: "var(--light-text)" }} />
        <input ref={inputRef} placeholder="Search a place on Google… (auto-fills address & coordinates)" style={{ ...field, paddingLeft: 36 }} />
      </div>
      {err && <div style={{ marginTop: 6, fontSize: 12, color: err.includes("VITE_GOOGLE") ? "var(--light-text)" : "#e11d48" }}>{err}</div>}
    </div>
  );
}

/* ---- Singleton config form ---- */
function ConfigForm({ title, subtitle, icon, fields, data, loading, error, onSave }: {
  title: string; subtitle: string; icon: ReactNode; fields: Field[];
  data: Row | null; loading: boolean; error: string | null; onSave: (p: Row) => Promise<void>;
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
              <button onClick={save} disabled={saving} style={primaryBtn}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---- Generic list CRUD panel ---- */
interface Crud { data: (Row & { id: string })[]; loading: boolean; error: string | null; create: (p: Row) => Promise<void>; update: (uid: string, p: Row) => Promise<void>; remove: (uid: string) => Promise<void>; }
function CrudPanel({ title, subtitle, icon, addLabel, fields, columns, hook, locationPicker }: {
  title: string; subtitle: string; icon: ReactNode; addLabel: string; fields: Field[];
  columns: { label: string; render: (r: Row) => ReactNode; align?: "right" }[]; hook: Crud;
  locationPicker?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<(Row & { id: string }) | null>(null);
  const [form, setForm] = useState<Row>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const openAdd = () => { setEditing(null); setForm({}); setMsg(null); setOpen(true); };
  const openEdit = (r: Row & { id: string }) => { setEditing(r); setForm({ ...r }); setMsg(null); setOpen(true); };

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const payload = buildPayload(fields, form);
      if (editing) await hook.update(editing.id, payload); else await hook.create(payload);
      setOpen(false);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PanelHeader title={title} subtitle={subtitle} icon={icon} action={<button onClick={openAdd} style={primaryBtn}><Plus size={16} /> {addLabel}</button>} />
      {hook.error && <ErrorBar text={hook.error} />}
      <div style={card}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{columns.map((c) => <th key={c.label} style={{ ...th, textAlign: c.align || "left" }}>{c.label}</th>)}<th style={{ ...th, textAlign: "right" }}>Actions</th></tr></thead>
          <tbody>
            {hook.loading ? (
              <tr><td colSpan={columns.length + 1} style={{ ...tdc, textAlign: "center", padding: "36px 0" }}><Loader2 size={20} className="animate-spin" style={{ display: "inline" }} /></td></tr>
            ) : hook.data.length === 0 ? (
              <tr><td colSpan={columns.length + 1} style={{ ...tdc, textAlign: "center", ...lbl, padding: "36px 0" }}>No records yet.</td></tr>
            ) : hook.data.map((r) => (
              <tr key={r.id}>
                {columns.map((c) => <td key={c.label} style={{ ...tdc, textAlign: c.align || "left" }}>{c.render(r)}</td>)}
                <td style={{ ...tdc, textAlign: "right" }}>
                  <button onClick={() => openEdit(r)} title="Edit" style={iconAction}><Pencil size={15} /></button>
                  <button onClick={() => { if (confirm("Delete this record?")) hook.remove(r.id); }} title="Delete" style={{ ...iconAction, color: "#e11d48" }}><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
              <button onClick={() => setOpen(false)} style={ghostBtn}>Cancel</button>
              <button onClick={save} disabled={saving} style={primaryBtn}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {editing ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- small shared bits ---- */
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

const SECTIONS = [
  { key: "company", label: "Company Profile", icon: <Building2 size={18} /> },
  { key: "departments", label: "Departments", icon: <Users2 size={18} /> },
  { key: "designations", label: "Roles & Designations", icon: <BadgeCheck size={18} /> },
  { key: "branches", label: "Branches & Geofence", icon: <MapPin size={18} /> },
  { key: "shifts", label: "Shifts", icon: <Clock size={18} /> },
  { key: "leavetypes", label: "Leave Policy", icon: <Plane size={18} /> },
  { key: "holidays", label: "Holiday Calendar", icon: <CalendarDays size={18} /> },
  { key: "attendance", label: "Attendance Rules", icon: <Fingerprint size={18} /> },
  { key: "payroll", label: "Payroll Settings", icon: <Wallet size={18} /> },
] as const;
type SectionKey = (typeof SECTIONS)[number]["key"];

export default function Settings() {
  const [section, setSection] = useState<SectionKey>("company");
  const departments = useDepartments();
  const designations = useDesignations();
  const branches = useBranchesAdmin();
  const shifts = useShifts();
  const leaveTypes = useLeaveTypes();
  const holidays = useHolidays();
  const company = useCompanyProfile();
  const attRules = useAttendanceRules();
  const payroll = usePayrollSettings();

  return (
    <section className="page-section active" style={{ background: "var(--app-bg)", minWidth: 0 }}>
      <PageHeader title="Settings" subtitle="Organization configuration and HR policy control" />

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 28, alignItems: "start" }}>
        {/* LEFT NAV */}
        <nav style={{ ...card, padding: 8, position: "sticky", top: 0 }}>
          {SECTIONS.map((s) => (
            <button key={s.key} onClick={() => setSection(s.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 12, border: "none", cursor: "pointer", textAlign: "left", marginBottom: 2, background: section === s.key ? "rgba(17,94,89,0.08)" : "transparent", color: section === s.key ? TEAL : "var(--dark-text)", fontWeight: section === s.key ? 800 : 600, fontSize: 13.5 }}>
              <span style={{ color: section === s.key ? TEAL : "var(--light-text)" }}>{s.icon}</span> {s.label}
            </button>
          ))}
        </nav>

        {/* CONTENT */}
        <div style={{ minWidth: 0 }}>
          {section === "company" && (
            <ConfigForm title="Company Profile" subtitle="Organization identity, tax & locale" icon={<Building2 size={20} />}
              data={company.data} loading={company.loading} error={company.error} onSave={company.save}
              fields={[
                { key: "name", label: "Company Name" }, { key: "legalName", label: "Legal Name" },
                { key: "industry", label: "Industry" }, { key: "email", label: "Contact Email" },
                { key: "phone", label: "Phone" }, { key: "logoUrl", label: "Logo URL" },
                { key: "addressLine", label: "Address", full: true },
                { key: "city", label: "City" }, { key: "state", label: "State" }, { key: "country", label: "Country" },
                { key: "gstin", label: "GSTIN" }, { key: "pan", label: "PAN" },
                { key: "currency", label: "Currency", type: "select", options: ["INR", "USD", "EUR", "GBP", "AED"] },
                { key: "fiscalYearStart", label: "Fiscal Year Start", type: "select", options: ["January", "April", "July", "October"] },
                { key: "workingDays", label: "Working Days", placeholder: "e.g. Mon–Fri", full: true },
              ]} />
          )}
          {section === "departments" && (
            <CrudPanel title="Departments" subtitle="Organizational units" icon={<Users2 size={20} />} addLabel="Add Department" hook={departments}
              fields={[{ key: "name", label: "Department Name" }, { key: "code", label: "Code" }]}
              columns={[{ label: "Name", render: (r) => <b>{r.name as string}</b> }, { label: "Code", render: (r) => (r.code as string) || "—" }]} />
          )}
          {section === "designations" && (
            <CrudPanel title="Roles & Designations" subtitle="Job roles / titles, bands & owning department" icon={<BadgeCheck size={20} />} addLabel="Add Role / Designation" hook={designations}
              fields={[
                { key: "name", label: "Role / Designation" }, { key: "code", label: "Code" },
                { key: "department", label: "Department", type: "select", options: departments.data.map((d) => (d.name as string)).filter(Boolean) },
                { key: "level", label: "Level / Band", type: "number" },
                { key: "description", label: "Description", type: "textarea", full: true },
              ]}
              columns={[
                { label: "Role / Designation", render: (r) => <b>{r.name as string}</b> },
                { label: "Code", render: (r) => (r.code as string) || "—" },
                { label: "Department", render: (r) => (r.department as string) || "—" },
                { label: "Level", render: (r) => r.level != null ? `L${r.level}` : "—" },
              ]} />
          )}
          {section === "branches" && (
            <CrudPanel title="Branches & Geofence" subtitle="Office locations & attendance perimeter" icon={<MapPin size={20} />} addLabel="Add Branch" hook={branches} locationPicker
              fields={[
                { key: "name", label: "Branch Name" }, { key: "code", label: "Code" },
                { key: "address", label: "Address", full: true },
                { key: "latitude", label: "Latitude", type: "number" }, { key: "longitude", label: "Longitude", type: "number" },
                { key: "radius", label: "Geofence Radius (m)", type: "number" },
              ]}
              columns={[
                { label: "Name", render: (r) => <b>{r.name as string}</b> },
                { label: "Code", render: (r) => (r.code as string) || "—" },
                { label: "Address", render: (r) => (r.address as string) || "—" },
                { label: "Geofence", render: (r) => r.latitude != null ? `${r.latitude}, ${r.longitude} · ${r.radius ?? "—"}m` : "—" },
              ]} />
          )}
          {section === "shifts" && (
            <CrudPanel title="Shifts" subtitle="Working hours & weekly off" icon={<Clock size={20} />} addLabel="Add Shift" hook={shifts}
              fields={[
                { key: "name", label: "Shift Name" },
                { key: "startTime", label: "Start Time", type: "time" }, { key: "endTime", label: "End Time", type: "time" },
                { key: "graceMinutes", label: "Grace (min)", type: "number" }, { key: "halfDayThresholdMinutes", label: "Half-Day Threshold (min)", type: "number" },
                { key: "weeklyOffDays", label: "Weekly Off (comma)", placeholder: "SATURDAY,SUNDAY", full: true },
              ]}
              columns={[
                { label: "Name", render: (r) => <b>{r.name as string}</b> },
                { label: "Timing", render: (r) => `${((r.startTime as string) || "—").slice(0, 5)} – ${((r.endTime as string) || "—").slice(0, 5)}` },
                { label: "Grace", render: (r) => r.graceMinutes != null ? `${r.graceMinutes}m` : "—" },
                { label: "Weekly Off", render: (r) => (r.weeklyOffDays as string) || "—" },
              ]} />
          )}
          {section === "leavetypes" && (
            <CrudPanel title="Leave Policy" subtitle="Leave types, quotas & carry-forward" icon={<Plane size={20} />} addLabel="Add Leave Type" hook={leaveTypes}
              fields={[
                { key: "name", label: "Leave Type" }, { key: "annualQuota", label: "Annual Quota (days)", type: "number" },
                { key: "accrualType", label: "Accrual", type: "select", options: ["Annual", "Monthly", "Quarterly"] },
                { key: "carryForwardMax", label: "Carry-Forward Max", type: "number" },
                { key: "colorHex", label: "Colour", type: "color" },
                { key: "carryForward", label: "Allow Carry-Forward", type: "checkbox" },
                { key: "paid", label: "Paid Leave", type: "checkbox" },
              ]}
              columns={[
                { label: "Type", render: (r) => <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: (r.colorHex as string) || "#cbd5e1", display: "inline-block" }} /><b>{r.name as string}</b></span> },
                { label: "Quota", render: (r) => r.annualQuota != null ? `${r.annualQuota}d` : "—" },
                { label: "Accrual", render: (r) => (r.accrualType as string) || "—" },
                { label: "Carry-Fwd", render: (r) => yesNo(r.carryForward) },
                { label: "Paid", render: (r) => yesNo(r.paid) },
              ]} />
          )}
          {section === "holidays" && (
            <CrudPanel title="Holiday Calendar" subtitle="Company holidays & observances" icon={<CalendarDays size={20} />} addLabel="Add Holiday" hook={holidays}
              fields={[
                { key: "name", label: "Holiday Name" }, { key: "date", label: "Date", type: "date" },
                { key: "type", label: "Type", type: "select", options: ["Public", "Optional", "Restricted"] },
                { key: "recurring", label: "Recurs Annually", type: "checkbox" },
              ]}
              columns={[
                { label: "Holiday", render: (r) => <b>{r.name as string}</b> },
                { label: "Date", render: (r) => (r.date as string) || "—" },
                { label: "Type", render: (r) => (r.type as string) || "—" },
                { label: "Recurring", render: (r) => yesNo(r.recurring) },
              ]} />
          )}
          {section === "attendance" && (
            <ConfigForm title="Attendance Rules" subtitle="Work hours, thresholds & verification" icon={<Fingerprint size={20} />}
              data={attRules.data} loading={attRules.loading} error={attRules.error} onSave={attRules.save}
              fields={[
                { key: "workHoursPerDay", label: "Work Hours / Day", type: "number" }, { key: "fullDayThresholdHours", label: "Full-Day Threshold (hrs)", type: "number" },
                { key: "shiftStartTime", label: "Default Shift Start", type: "time" }, { key: "graceMinutes", label: "Grace Period (min)", type: "number" },
                { key: "lateThresholdMinutes", label: "Late Threshold (min)", type: "number" }, { key: "halfDayThresholdMinutes", label: "Half-Day Threshold (min)", type: "number" },
                { key: "geofenceRadiusMeters", label: "Geofence Radius (m)", type: "number" }, { key: "autoClockOutMinutes", label: "Auto Clock-Out (min)", type: "number" },
                { key: "allowedWorkModes", label: "Allowed Work Modes", placeholder: "Office,WFH,On-Field", full: true },
                { key: "faceRecognitionRequired", label: "Require Face Recognition for Clock-In", type: "checkbox", full: true },
              ]} />
          )}
          {section === "payroll" && (
            <ConfigForm title="Payroll Settings" subtitle="Pay cycle, statutory rates & deductions" icon={<Wallet size={20} />}
              data={payroll.data} loading={payroll.loading} error={payroll.error} onSave={payroll.save}
              fields={[
                { key: "payCycle", label: "Pay Cycle", type: "select", options: ["Monthly", "Bi-Weekly", "Weekly"] },
                { key: "payDay", label: "Pay Day (day of month)", type: "number" },
                { key: "currency", label: "Currency", type: "select", options: ["INR", "USD", "EUR", "GBP", "AED"] },
                { key: "professionalTax", label: "Professional Tax (₹)", type: "number" },
                { key: "pfRate", label: "PF Rate (%)", type: "number" }, { key: "esiRate", label: "ESI Rate (%)", type: "number" },
                { key: "pfEnabled", label: "Provident Fund (PF) Enabled", type: "checkbox" },
                { key: "esiEnabled", label: "ESI Enabled", type: "checkbox" },
                { key: "tdsEnabled", label: "TDS Deduction Enabled", type: "checkbox" },
              ]} />
          )}
        </div>
      </div>
    </section>
  );
}

const overlay: CSSProperties = { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const modalBox: CSSProperties = { background: "var(--surface-bg)", borderRadius: 24, width: "100%", maxWidth: 560, boxShadow: "0 24px 60px rgba(0,0,0,0.25)", overflow: "hidden", maxHeight: "92vh" };
const ghostBtn: CSSProperties = { height: 42, padding: "0 20px", borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--surface-bg)", color: "var(--dark-text)", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const primaryBtn: CSSProperties = { height: 42, padding: "0 22px", borderRadius: 12, border: "none", background: TEAL, color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 };
const iconAction: CSSProperties = { height: 32, width: 32, borderRadius: 9, border: "1px solid var(--border-color)", background: "var(--surface-bg)", color: "var(--light-text)", cursor: "pointer", marginLeft: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" };
