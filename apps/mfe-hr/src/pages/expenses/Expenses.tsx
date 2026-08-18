import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Plus, Clock, CheckCircle2, Receipt, Search, Eye, Car, User, AlertCircle, Loader2, X, Table as Rows3, LayoutGrid, Filter } from "lucide-react";
import { Button, Combobox, Input, Select, DatePicker, Textarea, Dialog, DataTable, EmptyState, SkeletonTable, DataTablePagination, Drawer, FileUpload, SectionCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { HrPageHeader as PageHeader } from "../../components/HrPageHeader";
import {
  SchemaFilterBuilder,
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { useMFEProps, SHELL_TOAST_EVENT } from "@jaldee/auth-context";
import { useLocation, useNavigate } from "react-router-dom";
import { useEmployees } from "../../services/useEmployees";
import { usePagedEmployeeOptions } from "../../services/usePagedEmployeeOptions";
import { useExpenses, type ExpenseClaim } from "../../services/useExpenses";
import { useExpenseSearchSchema } from "../../services/useHrSearchSchema";
import { useMyProfile } from "../../services/useEss";
import { formatCurrency, formatDate } from "../../lib/utils";

type Tab = "ledger" | "approvals";
const EXPENSE_ROUTES: Array<{ key: Tab; route: string; label: string }> = [
  { key: "ledger", route: "ledger", label: "Company Claims Ledger" },
  { key: "approvals", route: "verifications", label: "Verifications Control" },
];
const TEAL = "var(--primary-color)";
const TEXT_PRIMARY = "var(--dark-text)";
const TEXT_SECONDARY = "var(--light-text)";
const TEXT_INVERSE = "var(--color-text-inverse)";
const SURFACE = "var(--surface-bg)";
const SURFACE_SUBTLE = "rgba(100,116,139,0.06)";
const BORDER = "var(--border-color)";
const BORDER_SUBTLE = "rgba(148,163,184,0.16)";
const INFO = "var(--color-info)";
const INFO_SUBTLE = "var(--color-info-subtle)";
const SUCCESS = "var(--success-color)";
const SUCCESS_SOFT = "var(--success-bg)";
const WARNING = "var(--warning-color)";
const DANGER = "var(--danger-color)";
const CATEGORIES = ["Travel", "Food", "Lodging", "Other"];

const card: CSSProperties = { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" };
const panel: CSSProperties = { background: SURFACE, border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)" };
const lbl: CSSProperties = { fontSize: "var(--text-xs)", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: TEXT_SECONDARY };
const th: CSSProperties = { textAlign: "left", padding: "14px 16px", fontSize: "var(--text-xs)", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: TEXT_SECONDARY, background: "rgba(100,116,139,0.04)" };
const tdc: CSSProperties = { padding: "16px", fontSize: "var(--text-sm)", color: TEXT_PRIMARY, borderTop: `1px solid ${BORDER}` };
const field: CSSProperties = { width: "100%", height: 48, borderRadius: 14, border: "none", background: SURFACE_SUBTLE, padding: "0 14px", fontSize: "var(--text-sm)", fontWeight: 700, color: TEXT_PRIMARY };
const sectionStack: CSSProperties = { display: "flex", flexDirection: "column", gap: 18 };
type ViewMode = "table" | "cards";

function fmtDate(d?: string) { return formatDate(d) || "N/A"; }
function tabFromPath(pathname: string): Tab {
  const segment = pathname.split("/").filter(Boolean).at(-1);
  const match = EXPENSE_ROUTES.find((item) => item.route === segment || item.key === segment);
  return match?.key || "ledger";
}
function getPreferredViewMode() {
  if (typeof window === "undefined") return "table" as ViewMode;
  return window.matchMedia("(max-width: 767px)").matches ? "cards" : "table";
}

function catStyle(c?: string): CSSProperties {
  switch (c) {
    case "Travel": return { background: "color-mix(in srgb, var(--color-info-subtle) 55%, white)", color: INFO, border: `1px solid ${INFO_SUBTLE}` };
    case "Food": return { background: "color-mix(in srgb, var(--warning-bg) 55%, white)", color: WARNING, border: "1px solid var(--warning-border)" };
    case "Lodging": return { background: "color-mix(in srgb, var(--color-primary-subtle) 45%, white)", color: "var(--color-primary)", border: "1px solid var(--color-primary-muted)" };
    default: return { background: "rgba(100,116,139,0.06)", color: TEXT_SECONDARY, border: `1px solid ${BORDER}` };
  }
}
function statStyle(s?: string): CSSProperties {
  switch (s) {
    case "Approved": return { background: "rgba(16,185,129,0.06)", color: SUCCESS, border: "1px solid rgba(16,185,129,0.15)" };
    case "Reimbursed": return { background: "rgba(59,130,246,0.06)", color: INFO, border: "1px solid rgba(59,130,246,0.15)" };
    case "Paid": return { background: "rgba(124,58,237,0.06)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.15)" };
    case "Rejected": return { background: "rgba(244,63,94,0.06)", color: DANGER, border: "1px solid rgba(244,63,94,0.15)" };
    default: return { background: "rgba(245,158,11,0.06)", color: WARNING, border: "1px solid rgba(245,158,11,0.15)" };
  }
}
const tag = (st: CSSProperties): CSSProperties => ({ ...st, display: "inline-block", padding: "3px 10px", borderRadius: 4, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" });
const actionButton: CSSProperties = { height: 42, padding: "0 22px", borderRadius: 12, border: "none", cursor: "pointer", background: TEAL, color: TEXT_INVERSE, fontWeight: 800, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 };
const employeeActionButton: CSSProperties = { ...actionButton, background: SUCCESS };
const secondaryActionButton: CSSProperties = { height: 36, padding: "0 14px", borderRadius: 12, background: "rgba(17,94,89,0.05)", border: "1px solid rgba(17,94,89,0.12)", color: TEAL, fontWeight: 800, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const errorBar: CSSProperties = { padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: DANGER, borderRadius: 12, fontSize: 13 };

function ExpensesViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs shrink-0">
      <button
        type="button"
        id="hr-expenses-view-table"
        data-testid="hr-expenses-view-table"
        data-active={value === "table"}
        onClick={() => onChange("table")}
        className={[
          "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all",
          value === "table" ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
        ].join(" ")}
        aria-label="Table view"
        title="Table view"
      >
        <Rows3 size={16} />
      </button>
      <button
        type="button"
        id="hr-expenses-view-cards"
        data-testid="hr-expenses-view-cards"
        data-active={value === "cards"}
        onClick={() => onChange("cards")}
        className={[
          "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all",
          value === "cards" ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
        ].join(" ")}
        aria-label="Card view"
        title="Card view"
      >
        <LayoutGrid size={16} />
      </button>
    </div>
  );
}

function StatCard({ tag: t, label, value, sub, tone, icon, accent }: { tag: string; label: string; value: ReactNode; sub: string; tone: string; icon: ReactNode; accent?: boolean }) {
  return (
    <div style={{ ...panel, borderRadius: 8, padding: "14px 16px", background: accent ? "rgba(17,94,89,0.04)" : SURFACE, borderColor: accent ? "rgba(17,94,89,0.18)" : BORDER_SUBTLE }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ height: 36, width: 36, borderRadius: 6, background: `${tone}14`, border: `1px solid ${tone}33`, display: "flex", alignItems: "center", justifyContent: "center", color: tone }}>{icon}</div>
        <span style={{ ...lbl, color: tone, background: `${tone}14`, border: `1px solid ${tone}33`, padding: "2px 8px", borderRadius: 4, fontSize: 9 }}>{t}</span>
      </div>
      <p style={{ ...lbl, marginBottom: 3, fontSize: 10 }}>{label}</p>
      <div style={{ fontSize: "var(--text-lg)", fontWeight: 900, color: accent ? TEAL : TEXT_PRIMARY, letterSpacing: "-0.5px" }}>{value}</div>
      <p style={{ ...lbl, marginTop: 4, fontSize: 9.5, fontWeight: 700 }}>{sub}</p>
    </div>
  );
}

export default function Expenses() {
  const { eventBus } = useMFEProps();
  const location = useLocation();
  const navigate = useNavigate();
  const isEmployeeView = location.pathname.includes("/me/");
  const tab = tabFromPath(location.pathname);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const { schema: rawExpenseSchema, loading: schemaLoading } = useExpenseSearchSchema(true, isEmployeeView);
  const expenseSchema = useMemo(() => {
    if (!rawExpenseSchema) return null;
    const fields = rawExpenseSchema.fields.filter((f) => {
      const label = (f.label || "").trim().toLowerCase();
      const name = (f.name || f.key || "").trim().toLowerCase();
      if (name === "date" || label === "date") return false;
      if (name.includes("transport") || name.includes("kms") || name.includes("mode")) return false;
      if (label === "employee" || name === "employee" || name === "employeeuid") return false;
      return true;
    });
    const defaultSortField = rawExpenseSchema.defaultSort?.field;
    const defaultSort = defaultSortField === "date" ? undefined : rawExpenseSchema.defaultSort;
    return {
      ...rawExpenseSchema,
      fields,
      defaultSort,
    };
  }, [rawExpenseSchema]);
  const { data: employees } = useEmployees({ enabled: !isEmployeeView });
  const expenses = useExpenses(advancedFilters, expenseSchema, { scope: isEmployeeView ? "ess" : "admin" });
  const { data: myProfile } = useMyProfile({ enabled: isEmployeeView });

  useEffect(() => {
    if (expenses.error) {
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Expenses",
        message: expenses.error,
      });
    }
  }, [expenses.error, eventBus]);

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e] as const)), [employees]);
  const empName = (uid?: string) => uid ? empMap.get(uid)?.name ?? uid : "—";
  const empDept = (uid?: string) => uid ? empMap.get(uid)?.department ?? "N/A" : "—";
  const empCode = (uid?: string) => uid ? empMap.get(uid)?.employeeId ?? "—" : "—";
  const scopedExpenses = expenses.data;

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<ViewMode>(() => getPreferredViewMode());
  const sumPending = useMemo(() => scopedExpenses.filter((e) => e.status === "Pending").reduce((a, e) => a + (e.amount || 0), 0), [scopedExpenses]);
  const sumSettled = useMemo(() => scopedExpenses.filter((e) => ["Approved", "Reimbursed", "Paid"].includes(e.status || "")).reduce((a, e) => a + (e.amount || 0), 0), [scopedExpenses]);
  const pendingCount = useMemo(() => scopedExpenses.filter((e) => e.status === "Pending").length, [scopedExpenses]);

  const appliedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, expenseSchema).length,
    [advancedFilters, expenseSchema]
  );

  const openFilters = () => {
    setDraftFilters(advancedFilters.length ? advancedFilters : buildDefaultSearchClauses(expenseSchema));
    setFiltersOpen(true);
  };
  const clearFilters = () => {
    const reset = buildDefaultSearchClauses(expenseSchema);
    setDraftFilters(reset);
    setAdvancedFilters(reset);
    setCategoryFilter("all");
    setStatusFilter("all");
    setSearch("");
    setPage(1);
  };
  const resetFilters = () => { clearFilters(); setFiltersOpen(false); };
  const applyFilters = () => { setAdvancedFilters(draftFilters); setPage(1); setFiltersOpen(false); };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const syncViewMode = () => setViewMode(media.matches ? "cards" : "table");
    syncViewMode();
    media.addEventListener("change", syncViewMode);
    return () => media.removeEventListener("change", syncViewMode);
  }, []);

  const rows = useMemo(() => {
    const activeTab = isEmployeeView ? "ledger" : tab;
    const base = activeTab === "approvals" ? scopedExpenses.filter((e) => e.status === "Pending") : scopedExpenses;
    const q = search.trim().toLowerCase();
    return base.filter((e) => {
      const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      const matchesQ = !q || (e.category || "").toLowerCase().includes(q) || (e.notes || "").toLowerCase().includes(q) || empName(e.employeeUid).toLowerCase().includes(q);
      return matchesCategory && matchesStatus && matchesQ;
    });
  }, [categoryFilter, empMap, isEmployeeView, scopedExpenses, search, statusFilter, tab]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [page, pageSize, rows]);

  const columns = useMemo<ColumnDef<ExpenseClaim>[]>(() => [
    {
      key: "amount",
      header: "Amount",
      width: "15%",
      render: (e) => (
        <span className="font-extrabold text-sm text-[var(--primary-color)]">
          {formatCurrency(e.amount)}
        </span>
      ),
    },
    {
      key: "employeeName",
      header: "Employee Name",
      width: "25%",
      render: (e) => (
        <div className="min-w-0 font-bold text-sm text-[var(--dark-text)] truncate">
          {empName(e.employeeUid)}
        </div>
      ),
    },
    {
      key: "approvalDate",
      header: "Approval Date",
      width: "18%",
      render: (e) => (
        <span className="text-xs font-semibold text-[var(--light-text)]">
          {fmtDate((e as any).approvedAt || (["Approved", "Reimbursed", "Paid"].includes(e.status || "") ? e.date : undefined)) || "—"}
        </span>
      ),
    },
    {
      key: "submissionDate",
      header: "Submission Date",
      width: "18%",
      render: (e) => (
        <span className="text-xs font-bold text-[var(--dark-text)]">
          {fmtDate(e.submittedAt || e.date)}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      width: "12%",
      render: (e) => (
        <span style={tag(catStyle(e.category))}>{e.category || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "12%",
      render: (e) => (
        <span style={tag(statStyle(e.status))}>{e.status || "—"}</span>
      ),
    },
    {
      key: "actions",
      header: "Action",
      width: "14%",
      align: "right",
      render: (e) => (
        <button
          id={`hr-expenses-view-${e.id}`}
          data-testid={`hr-expenses-view-${e.id}`}
          onClick={() => { setMsg(null); setSelected(e); }}
          style={secondaryActionButton}
        >
          <Eye size={14} /> {!isEmployeeView && tab === "approvals" ? "Inspect & Verify" : "View Profile"}
        </button>
      ),
    },
  ], [empCode, empDept, empName, isEmployeeView, tab]);

  // submit modal
  const [addOpen, setAddOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState<ExpenseClaim | null>(null);
  const employeeOptions = usePagedEmployeeOptions({ enabled: addOpen && !isEmployeeView });
  const [form, setForm] = useState({ employeeUid: "", amount: "", category: "Food", kms: "", modeOfTransport: "", notes: "", date: new Date().toISOString().slice(0, 10) });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // detail modal
  const [selected, setSelected] = useState<ExpenseClaim | null>(null);
  const [acting, setActing] = useState(false);
  const [actingKind, setActingKind] = useState<"approve" | "reject" | "reimburse" | "pay" | null>(null);

  const submit = async () => {
    const employeeUid = isEmployeeView ? myProfile?.id || "" : form.employeeUid;
    if (!employeeUid || !form.amount) { setMsg("Employee and amount are required."); return; }
    setSaving(true); setMsg(null);
    try {
      const payload: Record<string, unknown> = {
        employeeUid, amount: Number(form.amount), category: form.category,
        notes: form.notes || null, date: form.date, status: "Pending",
      };
      if (form.category === "Travel") { payload.kms = form.kms ? Number(form.kms) : null; payload.modeOfTransport = form.modeOfTransport || null; }
      if (editingClaim) await expenses.update(editingClaim.id, { ...payload, status: editingClaim.status });
      else await expenses.create(payload, isEmployeeView ? receiptFile : null);
      setForm({ employeeUid: "", amount: "", category: "Food", kms: "", modeOfTransport: "", notes: "", date: new Date().toISOString().slice(0, 10) });
      setReceiptFile(null);
      setAddOpen(false);
      setEditingClaim(null);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Expense claim submitted",
        message: "The expense claim was submitted successfully.",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to submit.";
      setMsg(message);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Expense claim submission failed",
        message,
      });
    }
    finally { setSaving(false); }
  };

  const act = async (kind: "approve" | "reject" | "reimburse" | "pay") => {
    if (!selected) return;
    setActing(true);
    setActingKind(kind);
    try {
      if (kind === "approve") await expenses.approve(selected.id);
      else if (kind === "reimburse") await expenses.reimburse(selected.id);
      else if (kind === "pay") await expenses.pay(selected.id);
      else await expenses.update(selected.id, { status: "Rejected" });
      const nextStatus = kind === "approve"
        ? "Approved"
        : kind === "reject"
          ? "Rejected"
          : kind === "reimburse"
            ? "Reimbursed"
            : "Paid";
      setSelected((current) => current ? { ...current, status: nextStatus } : current);
      const success = kind === "approve"
        ? { title: "Expense claim approved", message: "The expense claim was approved successfully." }
        : kind === "reject"
          ? { title: "Expense claim declined", message: "The expense claim was declined successfully." }
          : kind === "reimburse"
            ? { title: "Expense reimbursed", message: "The expense claim was marked as reimbursed." }
            : { title: "Expense paid", message: "The expense claim was marked as paid." };
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "success", ...success });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Action failed.";
      setMsg(message);
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "error", title: "Expense action failed", message });
    }
    finally { setActing(false); setActingKind(null); }
  };

  return (
    <section id="hr-expenses-page" data-testid="hr-expenses-page" className="page-section active hr-page-shell">
      <div style={sectionStack}>
        {!isEmployeeView ? (
          <PageHeader
            title="Expense Claims & Mileage Ledger"
            subtitle="Reimbursements, travel logs and settlement control"
            actions={<Button id="hr-expenses-submit-open" data-testid="hr-expenses-submit-open" variant="primary" icon={<Plus size={16} />} onClick={() => { setMsg(null); setAddOpen(true); }}>Submit Expense Claim</Button>}
          />
        ) : null}

        {isEmployeeView ? (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              id="hr-expenses-submit-open"
              data-testid="hr-expenses-submit-open"
              variant="primary"
              className="bg-[linear-gradient(135deg,#0f766e_0%,#0f9f8c_100%)] text-white hover:brightness-95 active:brightness-90"
              icon={<Plus size={16} />}
              onClick={() => { setMsg(null); setAddOpen(true); }}
            >
              Submit Claim
            </Button>
          </div>
        ) : null}

      {/* STAT CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
        <StatCard tag="Pending" label="Pending Clearance" value={formatCurrency(sumPending)} sub={`${pendingCount} requests waiting review`} tone={WARNING} icon={<Clock size={24} />} />
        <StatCard tag="Settled" label="Approved & Paid" value={formatCurrency(sumSettled)} sub={`From ${scopedExpenses.filter((e) => ["Approved", "Reimbursed", "Paid"].includes(e.status || "")).length} approved profiles`} tone={SUCCESS} icon={<CheckCircle2 size={24} />} />
        <StatCard tag="Total Registers" label="Total Ledger Count" value={`${scopedExpenses.length} Claims`} sub="Expense claims logged" tone={TEAL} icon={<Receipt size={24} />} accent />
      </div>

      {/* TABS + FILTERS HEADER IN INTEGRATED CARD */}
      <SectionCard className="border-[color:color-mix(in_srgb,var(--color-border)_72%,white)] shadow-sm" padding={false}>
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-4">
          {/* ROW 1: TABS */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-[color:color-mix(in_srgb,var(--color-border)_25%,transparent)] p-1">
              {(isEmployeeView ? EXPENSE_ROUTES.filter((t) => t.key === "ledger") : EXPENSE_ROUTES).map((t) => {
                const activeTab = isEmployeeView ? "ledger" : tab;
                const label = t.key === "ledger" ? `${t.label} (${scopedExpenses.length})` : `${t.label} (${pendingCount} Pending)`;
                return (
                  <button
                    key={t.key}
                    id={`hr-expenses-tab-${t.key}`}
                    data-testid={`hr-expenses-tab-${t.key}`}
                    data-active={activeTab === t.key ? "true" : "false"}
                    onClick={() => { setPage(1); navigate(isEmployeeView ? "/me/expenses" : `/expenses/${t.route}`); }}
                    className={`rounded px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] transition-colors ${activeTab === t.key ? (t.key === "approvals" ? "bg-[var(--primary-color)] text-white shadow-xs" : "bg-white text-slate-900 shadow-xs") : "text-slate-500 hover:text-slate-800"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ROW 2: INLINE FILTERS */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <div className="min-w-[150px] sm:min-w-[180px]">
                <Select
                  id="hr-expenses-filter-category"
                  testId="hr-expenses-filter-category"
                  aria-label="Filter by Category"
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                  options={[
                    { value: "all", label: "All Categories" },
                    { value: "Travel", label: "Travel" },
                    { value: "Food", label: "Food" },
                    { value: "Lodging", label: "Lodging" },
                    { value: "Other", label: "Other" },
                  ]}
                />
              </div>
              {!isEmployeeView && tab === "ledger" && (
                <div className="min-w-[150px] sm:min-w-[180px]">
                  <Select
                    id="hr-expenses-filter-status"
                    testId="hr-expenses-filter-status"
                    aria-label="Filter by Status"
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    options={[
                      { value: "all", label: "All Statuses" },
                      { value: "Pending", label: "Pending" },
                      { value: "Approved", label: "Approved" },
                      { value: "Reimbursed", label: "Reimbursed" },
                      { value: "Paid", label: "Paid" },
                      { value: "Rejected", label: "Rejected" },
                    ]}
                  />
                </div>
              )}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Button
                type="button"
                id="hr-expenses-filter-button"
                data-testid="hr-expenses-filter-button"
                variant={appliedFilterCount > 0 ? "primary" : "outline"}
                icon={<Filter size={16} />}
                aria-label="Open expense claim filters"
                onClick={openFilters}
              >
                <span className="hidden sm:inline">Filter</span>
                {appliedFilterCount > 0 ? ` (${appliedFilterCount})` : ""}
              </Button>
              <ExpensesViewToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>
        </div>

        {/* TABLE */}
        {expenses.loading ? (
          <div className="p-5">
            <SkeletonTable rows={4} columns={tab === "approvals" ? 7 : 6} />
          </div>
        ) : viewMode === "table" ? (
          <div data-testid="hr-expenses-table-panel">
            <DataTable
              data-testid="hr-expenses-table"
              data={pagedRows}
              columns={columns}
              getRowId={(e) => e.id}
              loading={expenses.loading}
              className="rounded-none border-0 bg-transparent shadow-none"
              tableClassName="w-full min-w-0"
              emptyState={
                <EmptyState
                  icon={<Receipt size={36} strokeWidth={1.5} />}
                  title={tab === "approvals" && !isEmployeeView ? "No claims awaiting verification" : "No expense claim logs found"}
                  description="Expense claims matching your filters will appear here."
                />
              }
            />
            <DataTablePagination
              testId="hr-expenses-pagination"
              page={page}
              pageSize={pageSize}
              total={rows.length}
              onChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        ) : (
        <div data-testid="hr-expenses-cards-panel" style={{ ...card, padding: 16 }}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pagedRows.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--light-text)", gridColumn: "1/-1", padding: 24 }}>
                {tab === "approvals" && !isEmployeeView ? "Excellent! No claims awaiting verification." : "No expense claim logs found."}
              </div>
            ) : pagedRows.map((e) => (
              <div
                key={e.id}
                id={`hr-expenses-card-${e.id}`}
                data-testid={`hr-expenses-card-${e.id}`}
                style={{ ...panel, borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 14, height: "100%", transition: "box-shadow 0.2s, transform 0.2s" }}
                className="hover:shadow-md hover:-translate-y-0.5"
              >
                {/* Header: Claimant / Date & Status */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    {!isEmployeeView ? (
                      <>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(17,94,89,0.08)", border: "1px solid rgba(17,94,89,0.18)", color: TEAL, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                          {empName(e.employeeUid).charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: "var(--text-sm)", color: TEXT_PRIMARY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={empName(e.employeeUid)}>
                            {empName(e.employeeUid)}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(17,94,89,0.08)", border: "1px solid rgba(17,94,89,0.16)", color: TEAL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Receipt size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: TEXT_SECONDARY }}>Submit Date</div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: TEXT_PRIMARY }}>{fmtDate(e.date)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <span style={{ ...tag(statStyle(e.status)), borderRadius: 999, padding: "4px 10px", flexShrink: 0 }}>
                    {e.status || "Pending"}
                  </span>
                </div>

                {/* Amount & Category Highlight Box */}
                <div style={{ background: "rgba(100,116,139,0.04)", border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: TEXT_SECONDARY }}>Claim Amount</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: TEAL, letterSpacing: "-0.5px", marginTop: 2 }}>{formatCurrency(e.amount)}</div>
                  </div>
                  <span style={{ ...tag(catStyle(e.category)), borderRadius: 6, padding: "4px 10px" }}>
                    {e.category || "General"}
                  </span>
                </div>

                {/* Summary / Notes Block */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexGrow: 1 }}>
                  {!isEmployeeView ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: TEXT_SECONDARY }}>
                      <Clock size={12} style={{ color: "var(--light-text)" }} />
                      <span>Submitted {fmtDate(e.date)}</span>
                    </div>
                  ) : null}

                  <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_PRIMARY, background: SURFACE_SUBTLE, borderRadius: 8, padding: "9px 12px", border: `1px solid ${BORDER_SUBTLE}`, minHeight: 46, display: "flex", alignItems: "center" }}>
                    <span style={{ color: e.notes ? TEXT_PRIMARY : "var(--light-text)", fontStyle: e.notes ? "normal" : "italic", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {e.notes ? `“${e.notes}”` : "No description provided."}
                    </span>
                  </div>
                </div>

                {/* Footer Action */}
                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 10, borderTop: `1px solid ${BORDER_SUBTLE}`, marginTop: "auto" }}>
                  <button
                    id={`hr-expenses-view-${e.id}`}
                    data-testid={`hr-expenses-view-${e.id}`}
                    onClick={() => { setMsg(null); setSelected(e); }}
                    style={{
                      ...secondaryActionButton,
                      width: "100%",
                      justifyContent: "center",
                      height: 38,
                      borderRadius: 8,
                    }}
                  >
                    <Eye size={14} /> {!isEmployeeView && tab === "approvals" ? "Inspect & Verify" : "View Details"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <DataTablePagination
            testId="hr-expenses-pagination"
            page={page}
            pageSize={pageSize}
            total={rows.length}
            onChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      )}
      </SectionCard>
      </div>

      {/* SUBMIT MODAL */}
      <Dialog
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditingClaim(null); }}
        testId="hr-expenses-submit-modal"
        hideHeader
        contentClassName="max-w-[760px] h-auto max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] p-0 overflow-hidden flex flex-col"
        bodyClassName="flex min-h-0 flex-none sm:flex-1 flex-col overflow-hidden"
      >
        <div className="max-[640px]:!px-4 max-[640px]:!py-4" style={{ background: "rgba(17,94,89,0.05)", padding: "24px 30px", borderBottom: "1px solid rgba(17,94,89,0.1)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div><h3 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.6px", color: TEAL, margin: 0 }}>{editingClaim ? "Edit Expense Claim" : "Submit Expense Claim"}</h3><p style={{ fontSize: 13, fontWeight: 600, color: TEAL, opacity: 0.8, margin: "4px 0 0" }}>Log a reimbursement or mileage voucher.</p></div>
          <button id="hr-expenses-submit-close" data-testid="hr-expenses-submit-close" onClick={() => setAddOpen(false)} aria-label="Close submit expense claim" style={iconBtn}><X size={20} /></button>
        </div>
        <div className="max-[640px]:!grid-cols-1 max-[640px]:!p-4" style={{ padding: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, overflowY: "auto", maxHeight: "calc(100dvh - 180px)", flex: 1 }}>
          {!isEmployeeView ? (
            <Combobox
              id="hr-expenses-employee-select"
              data-testid="hr-expenses-employee-select"
              label="Claimant Employee"
              value={form.employeeUid}
              onValueChange={(employeeUid) => setForm({ ...form, employeeUid })}
              placeholder="Select employee"
              searchPlaceholder="Search employees..."
              searchValue={employeeOptions.searchValue}
              onSearchChange={employeeOptions.onSearchChange}
              loading={employeeOptions.loading}
              hasMore={employeeOptions.hasMore}
              onEndReached={employeeOptions.onLoadMore}
              options={employeeOptions.data.map((employee) => ({ value: employee.id, label: employee.name }))}
            />
          ) : (
            <div>
              <label style={{ ...lbl, color: TEAL }}>Claimant Employee</label>
              <div style={{ ...field, marginTop: 6, display: "flex", alignItems: "center" }}>{myProfile?.name || "Employee"}</div>
            </div>
          )}
          <Input id="hr-expenses-amount-input" data-testid="hr-expenses-amount-input" label="Reimbursement Amount (INR)" type="number" min="0" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Select
            id="hr-expenses-category-select"
            testId="hr-expenses-category-select"
            label="Expense Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
          <DatePicker
            id="hr-expenses-date-input"
            label="Claim Date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          {form.category === "Travel" && (
            <>
              <Input id="hr-expenses-distance-input" data-testid="hr-expenses-distance-input" label="Distance (KMs)" type="number" min="0" placeholder="e.g. 120" value={form.kms} onChange={(e) => setForm({ ...form, kms: e.target.value })} />
              <Input id="hr-expenses-transport-input" data-testid="hr-expenses-transport-input" label="Mode of Transport" placeholder="e.g. Company Sedan" value={form.modeOfTransport} onChange={(e) => setForm({ ...form, modeOfTransport: e.target.value })} />
            </>
          )}
          <div style={{ gridColumn: "1 / -1" }}>
            <Textarea
              id="hr-expenses-notes-textarea"
              data-testid="hr-expenses-notes-textarea"
              label="Notes / Description"
              placeholder="Short description of the expense…"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={4}
            />
          </div>
          {isEmployeeView ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <FileUpload
                id="hr-expenses-receipt"
                testId="hr-expenses-receipt"
                label="Receipt (Optional)"
                accept="image/*,application/pdf"
                multiple={false}
                maxSize={10 * 1024 * 1024}
                onUpload={(files) => setReceiptFile(files[0] ?? null)}
              />
            </div>
          ) : null}
        </div>
        {msg && <div style={{ margin: "0 28px", ...errorBar }}>{msg}</div>}
        <div className="max-[480px]:!px-4 max-[480px]:[&>button]:flex-1" style={{ padding: "20px 28px", background: "var(--app-bg)", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "flex-end", gap: 12, flexShrink: 0 }}>
          <Button id="hr-expenses-submit-cancel" data-testid="hr-expenses-submit-cancel" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button id="hr-expenses-submit-save" data-testid="hr-expenses-submit-save" data-state={saving ? "saving" : "idle"} variant="primary" className={isEmployeeView ? "bg-[linear-gradient(135deg,#0f766e_0%,#0f9f8c_100%)] text-white hover:brightness-95 active:brightness-90" : undefined} onClick={submit} loading={saving}>{editingClaim ? "Save Changes" : "Submit Claim Proposal"}</Button>
        </div>
      </Dialog>

      {/* DETAIL MODAL */}
      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        testId="hr-expenses-detail-modal"
        hideHeader
        contentClassName="max-w-[560px] p-0 overflow-hidden"
      >
        {selected && (
          <>
            <div style={{ background: "rgba(17,94,89,0.05)", padding: "22px 28px", borderBottom: "1px solid rgba(17,94,89,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><h3 style={{ fontSize: 20, fontWeight: 900, color: TEAL, margin: 0 }}>Claim Profile</h3><p style={{ ...lbl, color: TEAL, marginTop: 4 }}>{empName(selected.employeeUid)} · {empCode(selected.employeeUid)}</p></div>
              <button id={`hr-expenses-detail-close-${selected.id}`} data-testid={`hr-expenses-detail-close-${selected.id}`} onClick={() => setSelected(null)} aria-label="Close expense claim profile" style={iconBtn}><X size={20} /></button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, maxHeight: "60vh", overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={infoBox}><span style={{ ...lbl, fontSize: 10 }}>Amount</span><span style={{ fontSize: 22, fontWeight: 900, color: TEAL, display: "block", marginTop: 4 }}>{formatCurrency(selected.amount)}</span></div>
                <div style={infoBox}><span style={{ ...lbl, fontSize: 10 }}>Category</span><span style={{ display: "block", marginTop: 6 }}><span style={tag(catStyle(selected.category))}>{selected.category}</span></span></div>
                <div style={infoBox}><span style={{ ...lbl, fontSize: 10 }}>Submit Date</span><span style={{ fontSize: 14, fontWeight: 800, display: "block", marginTop: 4 }}>{fmtDate(selected.date)}</span></div>
                <div style={infoBox}><span style={{ ...lbl, fontSize: 10 }}>Status</span><span style={{ display: "block", marginTop: 6 }}><span style={tag(statStyle(selected.status))}>{selected.status}</span></span></div>
              </div>

              <div style={{ background: "rgba(100,116,139,0.04)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 14 }}>
                <span style={{ ...lbl, fontSize: 10 }}>Notes / Description</span>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--dark-text)", fontStyle: "italic", margin: "8px 0 0" }}>“{selected.notes || "No description provided."}”</p>
              </div>
              <div style={infoBox}><span style={{ ...lbl, fontSize: 10 }}><User size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> Claimant</span><span style={{ fontSize: 14, fontWeight: 800, display: "block", marginTop: 4 }}>{empName(selected.employeeUid)} — {empDept(selected.employeeUid)}</span></div>

              {(selected.status === "Pending" || selected.status === "Rejected") && (
                <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                  <Button className="!w-auto" data-testid={`hr-expenses-edit-${selected.id}`} variant="outline" onClick={() => {
                    setEditingClaim(selected);
                    setForm({ employeeUid: selected.employeeUid || "", amount: String(selected.amount ?? ""), category: selected.category || "Food", kms: selected.kms != null ? String(selected.kms) : "", modeOfTransport: selected.modeOfTransport || "", notes: selected.notes || "", date: selected.date || new Date().toISOString().slice(0, 10) });
                    setSelected(null);
                    setAddOpen(true);
                  }}>Edit Claim</Button>
                  {!isEmployeeView && selected.status === "Pending" ? (
                    <>
                      <Button id={`hr-expenses-reject-${selected.id}`} data-testid={`hr-expenses-reject-${selected.id}`} data-state={actingKind === "reject" ? "acting" : "idle"} variant="danger" onClick={() => act("reject")} disabled={acting} loading={actingKind === "reject"}>Decline</Button>
                      <Button id={`hr-expenses-approve-${selected.id}`} data-testid={`hr-expenses-approve-${selected.id}`} data-state={actingKind === "approve" ? "acting" : "idle"} variant="primary" onClick={() => act("approve")} disabled={acting} loading={actingKind === "approve"}>Approve Claim</Button>
                    </>
                  ) : null}
                </div>
              )}
              {!isEmployeeView && selected.status?.toLowerCase() === "approved" && (
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
                  <Button id={`hr-expenses-reimburse-${selected.id}`} data-testid={`hr-expenses-reimburse-${selected.id}`} data-state={actingKind === "reimburse" ? "acting" : "idle"} variant="outline" onClick={() => act("reimburse")} disabled={acting} loading={actingKind === "reimburse"}>Mark as Reimbursed</Button>
                  <Button id={`hr-expenses-pay-${selected.id}`} data-testid={`hr-expenses-pay-${selected.id}`} data-state={actingKind === "pay" ? "acting" : "idle"} variant="primary" onClick={() => act("pay")} disabled={acting} loading={actingKind === "pay"}>Mark as Paid</Button>
                </div>
              )}
              {msg && <div style={errorBar}>{msg}</div>}
            </div>
          </>
        )}
      </Dialog>

      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Expense Claim Filters"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden" data-testid="hr-expenses-filter-drawer">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <SchemaFilterBuilder
              schema={expenseSchema}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              onClearAll={clearFilters}
              emptyStateMessage="No expense filters are available from the schema."
            />
          </div>
          <div className="flex shrink-0 gap-3 border-t border-gray-200 p-5">
            <Button type="button" variant="outline" className="flex-1" data-testid="hr-expenses-filter-reset" onClick={resetFilters}>Reset All</Button>
            <Button type="button" variant="primary" className="flex-1" data-testid="hr-expenses-filter-apply" onClick={applyFilters}>Apply Filters</Button>
          </div>
        </div>
      </Drawer>
    </section>
  );
}

const overlay: CSSProperties = { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const modalBox: CSSProperties = { background: "var(--surface-bg)", borderRadius: 28, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", overflow: "hidden", maxHeight: "92vh" };
const iconBtn: CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" };
const ghostBtn: CSSProperties = { height: 44, padding: "0 22px", borderRadius: 12, border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT_PRIMARY, fontWeight: 700, fontSize: 13, cursor: "pointer" };
const primaryBtn: CSSProperties = { height: 44, padding: "0 26px", borderRadius: 12, border: "none", background: TEAL, color: TEXT_INVERSE, fontWeight: 900, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 };
const infoBox: CSSProperties = { padding: 14, borderRadius: 14, background: "rgba(100,116,139,0.04)", border: `1px solid ${BORDER}` };
