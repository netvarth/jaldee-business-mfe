import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2, Users2, BadgeCheck, Clock, CalendarDays, Plane, Fingerprint, Wallet, Plus, Pencil, Trash2, Loader2, AlertCircle, Save, X, MoreVertical } from "lucide-react";
import { PageHeader, Dialog, Select, Input, Checkbox, Textarea, Popover, Skeleton, SkeletonTable, MultiCombobox, TimePicker, DatePicker } from "@jaldee/design-system";
import {
  useDepartments, useDesignations, useShifts, useLeaveTypes, useHolidays,
  useCompanyProfile, useAttendanceRules, usePayrollSettings,
} from "../../services/useSettingsData";
import { useMFEProps, SHELL_TOAST_EVENT } from "@jaldee/auth-context";
import { useEmployees } from "../../services/useEmployees";
import { useHrApi } from "../../services/useHrApi";

const TEAL = "var(--primary-color)";
const lbl: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--light-text)" };
const th: CSSProperties = { textAlign: "left", padding: "11px 16px", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--light-text)", background: "rgba(100,116,139,0.04)" };
const tdc: CSSProperties = { padding: "13px 16px", fontSize: 13, color: "var(--dark-text)", borderTop: "1px solid var(--border-color)" };
const field: CSSProperties = { width: "100%", height: 44, borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--surface-bg)", padding: "0 12px", fontSize: 14, fontWeight: 600, color: "var(--dark-text)" };
const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 20, overflow: "hidden" };

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

function buildPayload(fields: Field[], form: Row): Row {
  const out: Row = {};
  fields.forEach((f) => {
    const v = form[f.key] ?? f.defaultValue;
    if (f.serialize === "time12") out[f.key] = toBackendTime(v);
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
        placeholder="—"
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
      {error && <ErrorBar text={error} />}
      <div id={`${automationScope}-panel`} data-testid={`${automationScope}-panel`} style={{ ...card, padding: 24 }}>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[18px] animate-pulse">
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
              <button id={`${automationScope}-save`} data-testid={`${automationScope}-save`} onClick={save} disabled={saving} style={primaryBtn}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---- Generic list CRUD panel ---- */
interface Crud { data: (Row & { id: string })[]; loading: boolean; error: string | null; create: (p: Row) => Promise<void>; update: (uid: string, p: Row) => Promise<void>; remove: (uid: string) => Promise<void>; }
function CrudPanel({ title, subtitle, icon, addLabel, fields, columns, hook, automationScope }: {
  title: string; subtitle: string; icon: ReactNode; addLabel: string; fields: Field[];
  columns: { label: string; render: (r: Row) => ReactNode; align?: "right" }[]; hook: Crud;
  automationScope: string;
}) {
  const { eventBus } = useMFEProps();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<(Row & { id: string }) | null>(null);
  const [form, setForm] = useState<Row>({});
  const [saving, setSaving] = useState(false);

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

  return (
    <div>
      <PanelHeader title={title} subtitle={subtitle} icon={icon} action={<button id={`${automationScope}-add`} data-testid={`${automationScope}-add`} onClick={openAdd} style={primaryBtn}><Plus size={16} /> {addLabel}</button>} />
      {hook.error && <ErrorBar text={hook.error} />}
      {hook.loading ? (
        <div style={{ ...card, padding: 20 }}>
          <SkeletonTable rows={4} columns={columns.length + 1} />
        </div>
      ) : (
        <div id={`${automationScope}-panel`} data-testid={`${automationScope}-panel`} style={card}>
          <div className="overflow-x-auto w-full">
            <table id={`${automationScope}-table`} data-testid={`${automationScope}-table`} style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{columns.map((c) => <th key={c.label} style={{ ...th, textAlign: c.align || "left" }}>{c.label}</th>)}<th style={{ ...th, textAlign: "right" }}>Actions</th></tr></thead>
              <tbody>
                {hook.data.length === 0 ? (
                  <tr><td colSpan={columns.length + 1} style={{ ...tdc, textAlign: "center", ...lbl, padding: "36px 0" }}>No records yet.</td></tr>
                ) : hook.data.map((r) => (
                  <tr key={r.id} id={`${automationScope}-row-${r.id}`} data-testid={`${automationScope}-row-${r.id}`}>
                    {columns.map((c) => <td key={c.label} style={{ ...tdc, textAlign: c.align || "left" }}>{c.render(r)}</td>)}
                    <td style={{ ...tdc, textAlign: "right" }}>
                      <button id={`${automationScope}-edit-${r.id}`} data-testid={`${automationScope}-edit-${r.id}`} onClick={() => openEdit(r)} title="Edit" aria-label={`Edit ${title} record`} style={iconAction}><Pencil size={15} /></button>
                      <button id={`${automationScope}-delete-${r.id}`} data-testid={`${automationScope}-delete-${r.id}`} onClick={() => handleDelete(r.id)} title="Delete" aria-label={`Delete ${title} record`} style={{ ...iconAction, color: "#e11d48" }}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
    </div>
  );
}

function LeavePolicyAssignmentDashboard({ leaveTypes }: { leaveTypes: Crud }) {
  const { eventBus } = useMFEProps();
  const api = useHrApi();
  const navigate = useNavigate();
  const { subsection } = useParams<{ subsection?: string }>();
  const employees = useEmployees();
  const view = subsection === "assign" ? "assignment" : "policies";
  const [policyOpen, setPolicyOpen] = useState(false);
  const [editing, setEditing] = useState<(Row & { id: string }) | null>(null);
  const [policyForm, setPolicyForm] = useState<Row>({
    name: "",
    category: "Annual",
    annualQuota: 0,
    accrualType: "Monthly",
    paid: true,
    carryForward: false,
    carryForwardMax: 0,
    colorHex: "#115E59",
  });
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [selectedPolicyUid, setSelectedPolicyUid] = useState("");
  const [selectedLeaveTypeUids, setSelectedLeaveTypeUids] = useState<string[]>([]);
  const [targetMode, setTargetMode] = useState<"all" | "specific">("all");
  const [assignAllActive, setAssignAllActive] = useState(true);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeUids, setSelectedEmployeeUids] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  const activeEmployees = useMemo(
    () => employees.data.filter((employee) => !employee.status || String(employee.status).toLowerCase() === "active"),
    [employees.data]
  );
  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return activeEmployees;
    return activeEmployees.filter((employee) => (
      employee.name.toLowerCase().includes(q) ||
      (employee.employeeId || "").toLowerCase().includes(q) ||
      (employee.department || "").toLowerCase().includes(q) ||
      (employee.email || "").toLowerCase().includes(q)
    ));
  }, [activeEmployees, employeeSearch]);
  const selectedPolicy = leaveTypes.data.find((policy) => policy.id === selectedPolicyUid || policy.uid === selectedPolicyUid);
  const effectiveLeaveTypeUids = selectedLeaveTypeUids.length > 0 ? selectedLeaveTypeUids : selectedPolicyUid ? [selectedPolicyUid] : [];
  const assignmentCount = assignAllActive ? activeEmployees.length : selectedEmployeeUids.length;
  const canAssign = effectiveLeaveTypeUids.length > 0 && !!periodStart && !!periodEnd && !assigning && !employees.loading && (assignAllActive || selectedEmployeeUids.length > 0);

  const openCreatePolicy = () => {
    setEditing(null);
    setPolicyForm({
      name: "",
      category: "Annual",
      annualQuota: 0,
      accrualType: "Monthly",
      paid: true,
      carryForward: false,
      carryForwardMax: 0,
      colorHex: "#115E59",
    });
    setPolicyOpen(true);
  };

  const openEditPolicy = (policy: Row & { id: string }) => {
    setEditing(policy);
    setPolicyForm({
      name: policy.name || "",
      category: policy.category || "Annual",
      annualQuota: policy.annualQuota ?? 0,
      accrualType: policy.accrualType || "Monthly",
      paid: policy.paid ?? true,
      carryForward: policy.carryForward ?? false,
      carryForwardMax: policy.carryForwardMax ?? 0,
      colorHex: policy.colorHex || "#115E59",
    });
    setPolicyOpen(true);
  };

  const savePolicy = async () => {
    if (!policyForm.name) {
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "error", title: "Leave Policy", message: "Leave type name is required." });
      return;
    }
    setSavingPolicy(true);
    try {
      const payload = {
        name: policyForm.name,
        category: policyForm.category,
        annualQuota: Number(policyForm.annualQuota || 0),
        accrualType: policyForm.accrualType,
        paid: !!policyForm.paid,
        carryForward: !!policyForm.carryForward,
        carryForwardMax: policyForm.carryForward ? Number(policyForm.carryForwardMax || 0) : 0,
        colorHex: policyForm.colorHex || "#115E59",
      };
      if (editing) await leaveTypes.update(editing.id, payload);
      else await leaveTypes.create(payload);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Leave Policy",
        message: editing ? "Leave type updated successfully." : "Leave type created successfully.",
      });
      setPolicyOpen(false);
    } catch (e) {
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Leave Policy",
        message: e instanceof Error ? e.message : "Save failed.",
      });
    } finally {
      setSavingPolicy(false);
    }
  };

  const deletePolicy = async (policy: Row & { id: string }) => {
    if (!confirm("Delete this leave type?")) return;
    try {
      await leaveTypes.remove(policy.id);
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "success", title: "Leave Policy", message: "Leave type deleted successfully." });
    } catch (e) {
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "error", title: "Leave Policy", message: e instanceof Error ? e.message : "Delete failed." });
    }
  };

  const toggleEmployee = (employeeUid: string) => {
    setSelectedEmployeeUids((current) => current.includes(employeeUid)
      ? current.filter((uid) => uid !== employeeUid)
      : [...current, employeeUid]);
  };
  const selectVisibleEmployees = () => {
    setSelectedEmployeeUids((current) => Array.from(new Set([...current, ...filteredEmployees.map((employee) => employee.id)])));
  };
  const clearSelectedEmployees = () => setSelectedEmployeeUids([]);

  const confirmAssignment = async () => {
    if (effectiveLeaveTypeUids.length === 0) {
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "error", title: "Leave Assignment", message: "Select at least one leave type." });
      return;
    }
    if (!periodStart || !periodEnd) {
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "error", title: "Leave Assignment", message: "Period start and end dates are required." });
      return;
    }
    if (periodEnd < periodStart) {
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "error", title: "Leave Assignment", message: "Period end date must be on or after the start date." });
      return;
    }
    if (!assignAllActive && selectedEmployeeUids.length === 0) {
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "error", title: "Leave Assignment", message: "Select at least one employee." });
      return;
    }
    setAssigning(true);
    try {
      await api.post("/leaves/balances/assign", {
        leaveTypeUids: effectiveLeaveTypeUids,
        employeeUids: assignAllActive ? [] : selectedEmployeeUids,
        allEmployees: assignAllActive,
        periodStart,
        periodEnd,
      });
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Leave Assignment",
        message: assignAllActive
          ? `Leave balances assigned for ${activeEmployees.length} active employees.`
          : `Leave balances assigned for ${selectedEmployeeUids.length} selected employees.`,
      });
      setSelectedEmployeeUids([]);
      setSelectedLeaveTypeUids([]);
      setSelectedPolicyUid("");
      setAssignAllActive(true);
      setPeriodStart("");
      setPeriodEnd("");
      navigate("/settings/leavetypes");
    } catch (e) {
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Leave Assignment",
        message: e instanceof Error ? e.message : "Assignment failed.",
      });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div id="hr-settings-leave-policy-dashboard" data-testid="hr-settings-leave-policy-dashboard" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <PanelHeader
        title={view === "assignment" ? "Assign Leave Balance" : "Leave Types"}
        subtitle={view === "assignment" ? "Assign explicit balance periods to employees and leave types" : "Define leave types, quotas and carry-forward rules"}
        icon={<Plane size={20} />}
        action={view === "assignment"
          ? <button id="hr-settings-leave-assignment-back" data-testid="hr-settings-leave-assignment-back" onClick={() => navigate("/settings/leavetypes")} style={ghostBtn}>Back to Leave Types</button>
          : <button id="hr-settings-leave-assignment-open" data-testid="hr-settings-leave-assignment-open" onClick={() => navigate("/settings/leavetypes/assign")} style={primaryBtn}><Users2 size={16} /> Assign Balance</button>}
      />

      {view === "policies" && <div style={card}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 900, color: "var(--dark-text)", margin: 0 }}>Leave Type Configuration</h3>
            <p style={{ ...lbl, marginTop: 4 }}>Policy builder for quotas, accrual and calendar styling</p>
          </div>
          <button id="hr-settings-leave-policy-create" data-testid="hr-settings-leave-policy-create" onClick={openCreatePolicy} style={primaryBtn}><Plus size={16} /> Create New Leave Type</button>
        </div>
        {leaveTypes.error && <div style={{ padding: "16px 24px" }}><ErrorBar text={leaveTypes.error} /></div>}
        {leaveTypes.loading ? (
          <div style={{ padding: 20 }}><SkeletonTable rows={4} columns={7} /></div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table id="hr-settings-leave-policy-table" data-testid="hr-settings-leave-policy-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Leave Type</th><th style={th}>Category</th><th style={th}>Quota</th><th style={th}>Accrual</th><th style={th}>Rules</th><th style={th}>Color</th><th style={{ ...th, textAlign: "right" }}>Actions</th></tr></thead>
              <tbody>
                {leaveTypes.data.length === 0 ? (
                  <tr><td colSpan={7} style={{ ...tdc, textAlign: "center", ...lbl, padding: "36px 0" }}>No leave types configured.</td></tr>
                ) : leaveTypes.data.map((policy) => (
                  <tr key={policy.id}>
                    <td style={tdc}><b>{policy.name as string}</b></td>
                    <td style={tdc}>{(policy.category as string) || "Annual"}</td>
                    <td style={tdc}>{policy.annualQuota != null ? `${policy.annualQuota} days` : "—"}</td>
                    <td style={tdc}>{(policy.accrualType as string) || "—"}</td>
                    <td style={tdc}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={miniPill(policy.paid ? "#059669" : "#64748b")}>{policy.paid ? "Paid" : "Unpaid"}</span>
                        <span style={miniPill(policy.carryForward ? "#2563eb" : "#64748b")}>{policy.carryForward ? `Carry ${policy.carryForwardMax || 0}d` : "No Carry"}</span>
                      </div>
                    </td>
                    <td style={tdc}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width: 18, height: 18, borderRadius: 6, border: "1px solid var(--border-color)", background: (policy.colorHex as string) || "#cbd5e1" }} />{(policy.colorHex as string) || "—"}</span></td>
                    <td style={{ ...tdc, textAlign: "right" }}>
                      <button id={`hr-settings-leave-policy-edit-${policy.id}`} data-testid={`hr-settings-leave-policy-edit-${policy.id}`} onClick={() => openEditPolicy(policy)} title="Edit" aria-label="Edit leave type" style={iconAction}><Pencil size={15} /></button>
                      <button id={`hr-settings-leave-policy-delete-${policy.id}`} data-testid={`hr-settings-leave-policy-delete-${policy.id}`} onClick={() => deletePolicy(policy)} title="Delete" aria-label="Delete leave type" style={{ ...iconAction, color: "#e11d48" }}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>}

      {view === "assignment" && <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ ...card, overflow: "visible", padding: 22, position: "relative", zIndex: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18, alignItems: "end" }}>
            <div style={{ minWidth: 0 }}>
              <MultiCombobox
                id="hr-settings-leave-assignment-policy"
                data-testid="hr-settings-leave-assignment-policy"
                label="Leave Type Selection"
                value={effectiveLeaveTypeUids}
                onValueChange={(value) => {
                  setSelectedLeaveTypeUids(value);
                  setSelectedPolicyUid(value[0] || "");
                }}
                placeholder="Select leave types"
                searchPlaceholder="Search leave types..."
                options={leaveTypes.data.map((policy) => ({ value: policy.id, label: String(policy.name || policy.id) }))}
                maxDisplay={3}
              />
            </div>
            <DatePicker
              id="hr-settings-leave-assignment-period-start"
              label="Period Start Date"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
            />
            <DatePicker
              id="hr-settings-leave-assignment-period-end"
              label="Period End Date"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
            />
          </div>
          <div style={{ display: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 320px" }}>
              <div style={{ height: 40, width: 40, borderRadius: 14, background: "rgba(17,94,89,0.08)", color: TEAL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Users2 size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <span style={{ ...lbl, display: "block", marginBottom: 3 }}>Employees</span>
                <p style={{ margin: 0, color: "var(--dark-text)", fontSize: 13, fontWeight: 800, overflowWrap: "anywhere" }}>
                  <strong style={{ color: TEAL }}>{assignmentCount} selected</strong>
                  <span style={{ color: "var(--light-text)", fontWeight: 700 }}> · {selectedPolicy ? `${selectedPolicy.name} will be assigned to ${assignmentCount} employee${assignmentCount === 1 ? "" : "s"}.` : "Select a leave type to continue."}</span>
                </p>
              </div>
            </div>
            <button id="hr-settings-leave-assignment-confirm" data-testid="hr-settings-leave-assignment-confirm" onClick={confirmAssignment} disabled={!canAssign} style={{ ...primaryBtn, opacity: canAssign ? 1 : 0.55, flex: "0 0 auto", justifyContent: "center" }}>
              {assigning ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Confirm Assignment
            </button>
          </div>
        </div>

        <div style={{ ...card, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: 280, maxWidth: "100%" }}>
            <button id="hr-settings-leave-assignment-all" data-testid="hr-settings-leave-assignment-all" onClick={() => { setTargetMode("all"); setAssignAllActive(true); setSelectedEmployeeUids([]); }} style={segmentedButton(assignAllActive)} type="button">All Active</button>
            <button id="hr-settings-leave-assignment-specific" data-testid="hr-settings-leave-assignment-specific" onClick={() => { setTargetMode("specific"); setAssignAllActive(false); }} style={segmentedButton(!assignAllActive)} type="button">Specific</button>
          </div>
          <p style={{ margin: 0, color: "var(--dark-text)", fontSize: 13, fontWeight: 800, overflowWrap: "anywhere", textAlign: "right", flex: "1 1 320px" }}>
            <strong style={{ color: TEAL }}>{assignmentCount} selected</strong>
            <span style={{ color: "var(--light-text)", fontWeight: 700 }}> - {selectedPolicy ? `${selectedPolicy.name} will be assigned to ${assignmentCount} employee${assignmentCount === 1 ? "" : "s"}.` : "Select a leave type to continue."}</span>
          </p>
        </div>

        {!assignAllActive && (
          <div style={card}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "var(--dark-text)" }}>Select Employees</h3>
                <p style={{ ...lbl, marginTop: 3 }}>{selectedEmployeeUids.length} selected from {activeEmployees.length} active employees</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button id="hr-settings-leave-select-visible" data-testid="hr-settings-leave-select-visible" onClick={selectVisibleEmployees} style={ghostBtn} type="button">Select Visible</button>
                <button id="hr-settings-leave-clear-selected" data-testid="hr-settings-leave-clear-selected" onClick={clearSelectedEmployees} style={ghostBtn} type="button">Clear</button>
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <Input
                id="hr-settings-leave-employee-search"
                data-testid="hr-settings-leave-employee-search"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Search by name, ID, department, or email"
                className="rounded-xl !h-11 mb-3"
              />
              {employees.loading ? (
                <SkeletonTable rows={5} columns={4} />
              ) : (
                <div style={{ maxHeight: 420, overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: 14 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={th}>Select</th><th style={th}>Employee</th><th style={th}>Department</th><th style={th}>Status</th></tr></thead>
                    <tbody>
                      {filteredEmployees.length === 0 ? (
                        <tr><td colSpan={4} style={{ ...tdc, textAlign: "center", ...lbl, padding: "30px 0" }}>No active employees found.</td></tr>
                      ) : filteredEmployees.map((employee) => (
                        <tr key={employee.id}>
                          <td style={tdc}><input id={`hr-settings-leave-employee-${employee.id}`} data-testid={`hr-settings-leave-employee-${employee.id}`} type="checkbox" checked={selectedEmployeeUids.includes(employee.id)} onChange={() => toggleEmployee(employee.id)} /></td>
                          <td style={tdc}><b>{employee.name}</b><span style={{ display: "block", ...lbl, fontSize: 8 }}>{employee.employeeId}</span></td>
                          <td style={tdc}>{employee.department || "General"}</td>
                          <td style={tdc}><span style={miniPill("#059669")}>{employee.status || "Active"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button id="hr-settings-leave-assignment-confirm-bottom" data-testid="hr-settings-leave-assignment-confirm-bottom" onClick={confirmAssignment} disabled={!canAssign} style={{ ...primaryBtn, opacity: canAssign ? 1 : 0.55, flex: "0 0 auto", justifyContent: "center" }}>
            {assigning ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Confirm Assignment
          </button>
        </div>
      </div>}

      <Dialog open={policyOpen} onClose={() => setPolicyOpen(false)} testId="hr-settings-leave-policy-modal" hideHeader contentClassName="max-w-[620px] p-0 overflow-visible">
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: "var(--dark-text)", margin: 0 }}>{editing ? "Edit Leave Type" : "Create New Leave Type"}</h3>
            <p style={{ ...lbl, marginTop: 3 }}>Define quota, accrual, rules and calendar color</p>
          </div>
          <button id="hr-settings-leave-policy-modal-close" data-testid="hr-settings-leave-policy-modal-close" onClick={() => setPolicyOpen(false)} style={{ background: "none", border: "none", color: "var(--light-text)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
          <div>
            <label style={{ ...lbl, display: "block", marginBottom: 6 }}>Name</label>
            <Input id="hr-settings-leave-policy-name" data-testid="hr-settings-leave-policy-name" value={(policyForm.name as string) || ""} onChange={(e) => setPolicyForm((f) => ({ ...f, name: e.target.value }))} placeholder="Annual Paid Leave" className="rounded-xl !h-11" />
          </div>
          <div>
            <label style={{ ...lbl, display: "block", marginBottom: 6 }}>Category</label>
            <Select id="hr-settings-leave-policy-category" testId="hr-settings-leave-policy-category" value={(policyForm.category as string) || "Annual"} onChange={(e) => setPolicyForm((f) => ({ ...f, category: e.target.value }))} options={["Annual", "Sick", "Maternity", "Paternity", "Comp-Off", "Unpaid", "Other"].map((value) => ({ value, label: value }))} />
          </div>
          <div>
            <label style={{ ...lbl, display: "block", marginBottom: 6 }}>Annual Quota</label>
            <Input id="hr-settings-leave-policy-quota" data-testid="hr-settings-leave-policy-quota" type="number" value={String(policyForm.annualQuota ?? "")} onChange={(e) => setPolicyForm((f) => ({ ...f, annualQuota: e.target.value }))} className="rounded-xl !h-11" />
          </div>
          <div>
            <label style={{ ...lbl, display: "block", marginBottom: 6 }}>Accrual Type</label>
            <Select id="hr-settings-leave-policy-accrual" testId="hr-settings-leave-policy-accrual" value={(policyForm.accrualType as string) || "Monthly"} onChange={(e) => setPolicyForm((f) => ({ ...f, accrualType: e.target.value }))} options={["Monthly", "Yearly", "Quarterly"].map((value) => ({ value, label: value }))} />
          </div>
          <label style={{ ...ruleToggle(!!policyForm.paid), gridColumn: "1 / -1" }}>
            <input id="hr-settings-leave-policy-paid" data-testid="hr-settings-leave-policy-paid" type="checkbox" checked={!!policyForm.paid} onChange={(e) => setPolicyForm((f) => ({ ...f, paid: e.target.checked }))} />
            <span><b>Is Paid Leave?</b><small style={{ display: "block", color: "var(--light-text)", marginTop: 2 }}>Approved days remain payable.</small></span>
          </label>
          <label style={{ ...ruleToggle(!!policyForm.carryForward), gridColumn: "1 / -1" }}>
            <input id="hr-settings-leave-policy-carry-forward" data-testid="hr-settings-leave-policy-carry-forward" type="checkbox" checked={!!policyForm.carryForward} onChange={(e) => setPolicyForm((f) => ({ ...f, carryForward: e.target.checked }))} />
            <span><b>Allow Carry Forward?</b><small style={{ display: "block", color: "var(--light-text)", marginTop: 2 }}>Unused balance can roll into the next cycle.</small></span>
          </label>
          {policyForm.carryForward && (
            <div>
              <label style={{ ...lbl, display: "block", marginBottom: 6 }}>Max Carry Forward Days</label>
              <Input id="hr-settings-leave-policy-carry-forward-max" data-testid="hr-settings-leave-policy-carry-forward-max" type="number" value={String(policyForm.carryForwardMax ?? "")} onChange={(e) => setPolicyForm((f) => ({ ...f, carryForwardMax: e.target.value }))} className="rounded-xl !h-11" />
            </div>
          )}
          <div>
            <label style={{ ...lbl, display: "block", marginBottom: 6 }}>Badge Color</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input id="hr-settings-leave-policy-color-picker" data-testid="hr-settings-leave-policy-color-picker" type="color" value={(policyForm.colorHex as string) || "#115E59"} onChange={(e) => setPolicyForm((f) => ({ ...f, colorHex: e.target.value }))} style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--border-color)", padding: 2, background: "var(--surface-bg)" }} />
              <Input id="hr-settings-leave-policy-color" data-testid="hr-settings-leave-policy-color" value={(policyForm.colorHex as string) || ""} onChange={(e) => setPolicyForm((f) => ({ ...f, colorHex: e.target.value }))} placeholder="#115E59" className="rounded-xl !h-11" />
            </div>
          </div>
        </div>
        <div style={{ padding: "18px 24px", background: "var(--app-bg)", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button id="hr-settings-leave-policy-cancel" data-testid="hr-settings-leave-policy-cancel" onClick={() => setPolicyOpen(false)} style={ghostBtn}>Cancel</button>
          <button id="hr-settings-leave-policy-save" data-testid="hr-settings-leave-policy-save" onClick={savePolicy} disabled={savingPolicy} style={primaryBtn}>{savingPolicy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Leave Type</button>
        </div>
      </Dialog>
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
  { key: "shifts", label: "Shifts", icon: <Clock size={18} /> },
  { key: "leavetypes", label: "Leave Policy", icon: <Plane size={18} /> },
  { key: "holidays", label: "Holiday Calendar", icon: <CalendarDays size={18} /> },
  { key: "attendance", label: "Attendance Rules", icon: <Fingerprint size={18} /> },
  { key: "payroll", label: "Payroll Settings", icon: <Wallet size={18} /> },
] as const;
type SectionKey = (typeof SECTIONS)[number]["key"];

export default function Settings() {
  const { section: routeSection } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const section = (routeSection as SectionKey) || "company";
  const [menuOpen, setMenuOpen] = useState(false);

  const departments = useDepartments();
  const designations = useDesignations();
  const shifts = useShifts();
  const leaveTypes = useLeaveTypes();
  const holidays = useHolidays();
  const company = useCompanyProfile();
  const attRules = useAttendanceRules();
  const payroll = usePayrollSettings();

  return (
    <section id="hr-settings-page" data-testid="hr-settings-page" className="page-section active" style={{ background: "var(--app-bg)", minWidth: 0, overflow: "visible" }}>
      {/* HEADER WITH MOBILE INLINE 3-DOT MENU */}
      <div className="mb-6 flex flex-row items-center justify-between gap-4 relative z-50">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="m-0 max-w-full text-2xl font-bold leading-tight text-gray-900">
            Settings
          </h1>
          <p className="m-0 max-w-full text-sm leading-5 text-gray-500">
            Organization configuration and HR policy control
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* MOBILE NAV SWITCHER */}
          <div className="flex md:hidden items-center">
            <Popover
              portal
              open={menuOpen}
              onOpenChange={setMenuOpen}
              placement="bottom"
              align="end"
              contentClassName="!w-56 !p-0 !bg-[var(--surface-bg)] !border !border-[var(--border-color)] rounded-xl shadow-xl py-1.5 overflow-hidden !z-[9999]"
              trigger={
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                  className="p-2 hover:bg-[rgba(0,0,0,0.04)] rounded-full transition-colors flex items-center justify-center text-[var(--light-text)]"
                  aria-label="Toggle settings menu"
                >
                  <MoreVertical size={20} />
                </button>
              }
            >
              <div className="flex flex-col w-full">
                {SECTIONS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => {
                      navigate(`/settings/${s.key}`);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-[rgba(17,94,89,0.04)]"
                    style={{
                      color: section === s.key ? TEAL : "var(--dark-text)",
                      background: section === s.key ? "rgba(17,94,89,0.04)" : "transparent",
                      border: "none",
                      cursor: "pointer"
                    }}
                  >
                    <span style={{ color: section === s.key ? TEAL : "var(--light-text)" }}>{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </Popover>
          </div>
        </div>
      </div>

      <div style={{ alignItems: "start" }} className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-7">
        {/* LEFT NAV */}
        <nav id="hr-settings-sections" data-testid="hr-settings-sections" style={{ ...card, padding: 8, position: "sticky", top: 0 }} className="hidden md:block">
          {SECTIONS.map((s) => (
            <button key={s.key} id={`hr-settings-section-${s.key}`} data-testid={`hr-settings-section-${s.key}`} data-active={section === s.key ? "true" : "false"} onClick={() => navigate(`/settings/${s.key}`)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 12, border: "none", cursor: "pointer", textAlign: "left", marginBottom: 2, background: section === s.key ? "rgba(17,94,89,0.08)" : "transparent", color: section === s.key ? TEAL : "var(--dark-text)", fontWeight: section === s.key ? 800 : 600, fontSize: 13.5 }}>
              <span style={{ color: section === s.key ? TEAL : "var(--light-text)" }}>{s.icon}</span> {s.label}
            </button>
          ))}
        </nav>

        {/* CONTENT */}
        <div style={{ minWidth: 0 }}>
          {section === "company" && (
            <ConfigForm title="Company Profile" subtitle="Organization identity, tax & locale" icon={<Building2 size={20} />}
              data={company.data} loading={company.loading} error={company.error} onSave={company.save} automationScope="hr-settings-company"
              fields={[
                { key: "name", label: "Company Name" }, { key: "legalName", label: "Legal Name" },
                { key: "industry", label: "Industry" }, { key: "email", label: "Contact Email" },
                { key: "phone", label: "Phone" }, { key: "logoUrl", label: "Logo URL" },
                { key: "addressLine", label: "Address", full: true },
                { key: "city", label: "City" }, { key: "state", label: "State" }, { key: "country", label: "Country" },
                { key: "gstin", label: "GSTIN" }, { key: "pan", label: "PAN" },
                { key: "currency", label: "Currency", type: "select", options: ["INR", "USD", "EUR", "GBP", "AED"] },
                { key: "workingDays", label: "Working Days", placeholder: "e.g. Mon–Fri", full: true },
              ]} />
          )}
          {section === "departments" && (
            <CrudPanel title="Departments" subtitle="Organizational units" icon={<Users2 size={20} />} addLabel="Add Department" hook={departments} automationScope="hr-settings-departments"
              fields={[{ key: "name", label: "Department Name" }, { key: "code", label: "Code" }]}
              columns={[{ label: "Name", render: (r) => <b>{r.name as string}</b> }, { label: "Code", render: (r) => (r.code as string) || "—" }]} />
          )}
          {section === "designations" && (
            <CrudPanel title="Roles & Designations" subtitle="Job roles / titles, bands & owning department" icon={<BadgeCheck size={20} />} addLabel="Add Role / Designation" hook={designations} automationScope="hr-settings-designations"
              fields={[
                { key: "name", label: "Role / Designation" }, { key: "code", label: "Code" },
                { key: "hrDepartmentUid", label: "Department", type: "select", options: departments.data.map((d) => ({ value: d.id, label: d.name as string })), optional: true },
                { key: "level", label: "Level / Band", type: "number" },
                { key: "description", label: "Description", type: "textarea", full: true },
              ]}
              columns={[
                { label: "Role / Designation", render: (r) => <b>{r.name as string}</b> },
                { label: "Code", render: (r) => (r.code as string) || "—" },
                { label: "Department", render: (r) => {
                  const dept = departments.data.find(d => d.id === r.hrDepartmentUid);
                  return dept?.name || (r.department as string) || "—";
                }},
                { label: "Level", render: (r) => r.level != null ? `L${r.level}` : "—" },
              ]} />
          )}
          {section === "shifts" && (
            <CrudPanel title="Shifts" subtitle="Working hours & weekly off" icon={<Clock size={20} />} addLabel="Add Shift" hook={shifts} automationScope="hr-settings-shifts"
              fields={[
                { key: "name", label: "Shift Name" },
                { key: "startTime", label: "Start Time", type: "time", serialize: "time12", is12Hour: true },
                { key: "endTime", label: "End Time", type: "time", serialize: "time12", is12Hour: true },
                { key: "graceMinutes", label: "Grace (min)", type: "number" }, { key: "halfDayThresholdMinutes", label: "Half-Day Threshold (min)", type: "number" },
                { key: "breakMinutes", sourceKey: "break_minutes", label: "Break Minutes", type: "number", defaultValue: 0 },
                {
                  key: "weeklyOffDays",
                  label: "Weekly Off",
                  type: "multiselect",
                  options: ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
                  full: true,
                },
              ]}
              columns={[
                { label: "Name", render: (r) => <b>{r.name as string}</b> },
                { label: "Timing", render: (r) => `${(r.startTime as string) || "—"} – ${(r.endTime as string) || "—"}` },
                { label: "Grace", render: (r) => r.graceMinutes != null ? `${r.graceMinutes}m` : "—" },
                { label: "Break", render: (r) => r.break_minutes != null || r.breakMinutes != null ? `${r.break_minutes ?? r.breakMinutes}m` : "—" },
                {
                  label: "Weekly Off",
                  render: (r) => Array.isArray(r.weeklyOffDays)
                    ? r.weeklyOffDays.join(", ")
                    : (r.weeklyOffDays as string) || "—",
                },
              ]} />
          )}
          {section === "leavetypes-old" && (
            <CrudPanel title="Leave Policy" subtitle="Leave types, quotas & carry-forward" icon={<Plane size={20} />} addLabel="Add Leave Type" hook={leaveTypes} automationScope="hr-settings-leave-types"
              fields={[
                { key: "name", label: "Leave Type" }, { key: "annualQuota", label: "Annual Quota (days)", type: "number" },
                { key: "accrualType", label: "Accrual", type: "select", options: ["Yearly", "Monthly", "Quarterly"] },
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
          {section === "leavetypes" && (
            <LeavePolicyAssignmentDashboard leaveTypes={leaveTypes} />
          )}
          {section === "holidays" && (
            <CrudPanel title="Holiday Calendar" subtitle="Company holidays & observances" icon={<CalendarDays size={20} />} addLabel="Add Holiday" hook={holidays} automationScope="hr-settings-holidays"
              fields={[
                { key: "name", label: "Holiday Name" }, { key: "date", label: "Date", type: "date" },
                { key: "type", label: "Type", type: "select", options: ["Public", "Optional", "Restricted"] },
              ]}
              columns={[
                { label: "Holiday", render: (r) => <b>{r.name as string}</b> },
                { label: "Date", render: (r) => (r.date as string) || "—" },
                { label: "Type", render: (r) => (r.type as string) || "—" },
              ]} />
          )}
          {section === "attendance" && (
            <ConfigForm title="Attendance Rules" subtitle="Work hours, thresholds & verification" icon={<Fingerprint size={20} />}
              data={attRules.data} loading={attRules.loading} error={attRules.error} onSave={attRules.save} automationScope="hr-settings-attendance"
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
              data={payroll.data} loading={payroll.loading} error={payroll.error} onSave={payroll.save} automationScope="hr-settings-payroll"
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
const wizardStep: CSSProperties = { display: "flex", gap: 14, padding: 16, borderRadius: 16, border: "1px solid var(--border-color)", background: "rgba(100,116,139,0.03)" };
const stepBadge: CSSProperties = { height: 28, width: 28, borderRadius: 10, background: "rgba(17,94,89,0.1)", color: TEAL, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, flexShrink: 0 };
const miniPill = (color: string): CSSProperties => ({ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 999, background: `${color}12`, color, border: `1px solid ${color}24`, fontSize: 9, fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase" });
const segmentedButton = (active: boolean): CSSProperties => ({ height: 42, borderRadius: 12, border: active ? "1px solid rgba(17,94,89,0.35)" : "1px solid var(--border-color)", background: active ? "rgba(17,94,89,0.08)" : "var(--surface-bg)", color: active ? TEAL : "var(--dark-text)", fontSize: 12, fontWeight: 900, cursor: "pointer" });
const assignmentActionRow: CSSProperties = { padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" };
const radioCard = (active: boolean): CSSProperties => ({ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, border: active ? "1px solid rgba(17,94,89,0.28)" : "1px solid var(--border-color)", background: active ? "rgba(17,94,89,0.06)" : "var(--surface-bg)", color: "var(--dark-text)", fontSize: 13, cursor: "pointer" });
const ruleToggle = (active: boolean): CSSProperties => ({ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, border: active ? "1px solid rgba(17,94,89,0.28)" : "1px solid var(--border-color)", background: active ? "rgba(17,94,89,0.06)" : "rgba(100,116,139,0.03)", color: "var(--dark-text)", fontSize: 13, cursor: "pointer" });
