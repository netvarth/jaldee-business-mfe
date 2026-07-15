import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Plus, Clock, CheckCircle2, Receipt, Search, Eye, Car, User, AlertCircle, Loader2, X, Rows3, LayoutGrid } from "lucide-react";
import { PageHeader, Select, DatePicker, Textarea, Dialog, SkeletonTable } from "@jaldee/design-system";
import { useMFEProps, SHELL_TOAST_EVENT } from "@jaldee/auth-context";
import { useLocation, useNavigate } from "react-router-dom";
import { useEmployees } from "../../services/useEmployees";
import { useExpenses, type ExpenseClaim } from "../../services/useExpenses";
import { useMyProfile } from "../../services/useEss";
import { formatCurrency } from "../../lib/utils";

type Tab = "ledger" | "approvals";
const EXPENSE_ROUTES: Array<{ key: Tab; route: string; label: string }> = [
  { key: "ledger", route: "ledger", label: "Company Claims Ledger" },
  { key: "approvals", route: "verifications", label: "Verifications Control" },
];
const TEAL = "var(--primary-color)";
const CATEGORIES = ["Travel", "Food", "Lodging", "Other"];

const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 8, overflow: "hidden" };
const panel: CSSProperties = { background: "var(--surface-bg)", border: "1px solid rgba(148,163,184,0.16)", borderRadius: 8, boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)" };
const lbl: CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--light-text)" };
const th: CSSProperties = { textAlign: "left", padding: "14px 16px", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--light-text)", background: "rgba(100,116,139,0.04)" };
const tdc: CSSProperties = { padding: "16px", fontSize: 14, color: "var(--dark-text)", borderTop: "1px solid var(--border-color)" };
const field: CSSProperties = { width: "100%", height: 48, borderRadius: 14, border: "none", background: "rgba(100,116,139,0.06)", padding: "0 14px", fontSize: 15, fontWeight: 700, color: "var(--dark-text)" };
const sectionStack: CSSProperties = { display: "flex", flexDirection: "column", gap: 18 };
type ViewMode = "table" | "cards";

function fmtDate(d?: string) { if (!d) return "N/A"; const x = new Date(d); return isNaN(x.getTime()) ? "N/A" : x.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" }); }
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
    case "Travel": return { background: "#ecfeff", color: "#0e7490", border: "1px solid #cffafe" };
    case "Food": return { background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" };
    case "Lodging": return { background: "#eef2ff", color: "#4338ca", border: "1px solid #e0e7ff" };
    default: return { background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" };
  }
}
function statStyle(s?: string): CSSProperties {
  switch (s) {
    case "Approved": return { background: "rgba(16,185,129,0.06)", color: "#059669", border: "1px solid rgba(16,185,129,0.15)" };
    case "Reimbursed": return { background: "rgba(59,130,246,0.06)", color: "#2563eb", border: "1px solid rgba(59,130,246,0.15)" };
    case "Rejected": return { background: "rgba(244,63,94,0.06)", color: "#e11d48", border: "1px solid rgba(244,63,94,0.15)" };
    default: return { background: "rgba(245,158,11,0.06)", color: "#d97706", border: "1px solid rgba(245,158,11,0.15)" };
  }
}
const tag = (st: CSSProperties): CSSProperties => ({ ...st, display: "inline-block", padding: "3px 10px", borderRadius: 4, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" });

function ExpensesViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: 3, border: "1px solid var(--border-color)", borderRadius: 8, background: "var(--surface-bg)" }}>
      <button
        type="button"
        id="hr-expenses-view-table"
        data-testid="hr-expenses-view-table"
        onClick={() => onChange("table")}
        style={{
          display: "inline-flex",
          width: 32,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
          background: value === "table" ? "var(--primary-color)" : "transparent",
          color: value === "table" ? "white" : "var(--light-text)",
          transition: "background-color 0.15s, color 0.15s",
        }}
        aria-label="Table view"
        title="Table view"
      >
        <Rows3 size={15} />
      </button>
      <button
        type="button"
        id="hr-expenses-view-cards"
        data-testid="hr-expenses-view-cards"
        onClick={() => onChange("cards")}
        style={{
          display: "inline-flex",
          width: 32,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
          background: value === "cards" ? "var(--primary-color)" : "transparent",
          color: value === "cards" ? "white" : "var(--light-text)",
          transition: "background-color 0.15s, color 0.15s",
        }}
        aria-label="Card view"
        title="Card view"
      >
        <LayoutGrid size={15} />
      </button>
    </div>
  );
}

function StatCard({ tag: t, label, value, sub, tone, icon, accent }: { tag: string; label: string; value: ReactNode; sub: string; tone: string; icon: ReactNode; accent?: boolean }) {
  return (
    <div style={{ ...panel, borderRadius: 8, padding: 22, background: accent ? "rgba(17,94,89,0.04)" : "var(--surface-bg)", borderColor: accent ? "rgba(17,94,89,0.18)" : "rgba(148,163,184,0.16)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ height: 48, width: 48, borderRadius: 6, background: `${tone}14`, border: `1px solid ${tone}33`, display: "flex", alignItems: "center", justifyContent: "center", color: tone }}>{icon}</div>
        <span style={{ ...lbl, color: tone, background: `${tone}14`, border: `1px solid ${tone}33`, padding: "4px 10px", borderRadius: 4 }}>{t}</span>
      </div>
      <p style={{ ...lbl, marginBottom: 6 }}>{label}</p>
      <div style={{ fontSize: 28, fontWeight: 900, color: accent ? TEAL : "var(--dark-text)", letterSpacing: "-0.5px" }}>{value}</div>
      <p style={{ ...lbl, marginTop: 8, fontSize: 10, fontWeight: 700 }}>{sub}</p>
    </div>
  );
}

export default function Expenses() {
  const { eventBus } = useMFEProps();
  const location = useLocation();
  const navigate = useNavigate();
  const isEmployeeView = location.pathname.includes("/me/");
  const tab = tabFromPath(location.pathname);
  const { data: employees } = useEmployees({ enabled: !isEmployeeView });
  const expenses = useExpenses();
  const { data: myProfile } = useMyProfile();

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
  const empName = (uid?: string) => uid && myProfile?.id === uid ? (myProfile.name ?? uid) : (uid ? empMap.get(uid)?.name ?? uid : "—");
  const empDept = (uid?: string) => uid && myProfile?.id === uid ? (myProfile.department ?? "N/A") : (uid ? empMap.get(uid)?.department ?? "N/A" : "—");
  const empCode = (uid?: string) => uid && myProfile?.id === uid ? (myProfile.employeeId ?? "—") : (uid ? empMap.get(uid)?.employeeId ?? "—" : "—");
  const scopedExpenses = useMemo(() => (
    isEmployeeView && myProfile?.id ? expenses.data.filter((e) => e.employeeUid === myProfile.id) : expenses.data
  ), [expenses.data, isEmployeeView, myProfile?.id]);

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(() => getPreferredViewMode());
  const sumPending = useMemo(() => scopedExpenses.filter((e) => e.status === "Pending").reduce((a, e) => a + (e.amount || 0), 0), [scopedExpenses]);
  const sumSettled = useMemo(() => scopedExpenses.filter((e) => e.status === "Approved" || e.status === "Reimbursed").reduce((a, e) => a + (e.amount || 0), 0), [scopedExpenses]);
  const pendingCount = useMemo(() => scopedExpenses.filter((e) => e.status === "Pending").length, [scopedExpenses]);

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
    const q = search.toLowerCase();
    return base.filter((e) => !q || (e.category || "").toLowerCase().includes(q) || (e.notes || "").toLowerCase().includes(q) || empName(e.employeeUid).toLowerCase().includes(q));
  }, [empMap, isEmployeeView, scopedExpenses, search, tab]);

  // submit modal
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ employeeUid: "", amount: "", category: "Food", kms: "", modeOfTransport: "", notes: "", date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // detail modal
  const [selected, setSelected] = useState<ExpenseClaim | null>(null);
  const [acting, setActing] = useState(false);

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
      await expenses.create(payload);
      setForm({ employeeUid: "", amount: "", category: "Food", kms: "", modeOfTransport: "", notes: "", date: new Date().toISOString().slice(0, 10) });
      setAddOpen(false);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Failed to submit."); }
    finally { setSaving(false); }
  };

  const act = async (kind: "approve" | "reject" | "reimburse") => {
    if (!selected) return;
    setActing(true);
    try {
      if (kind === "approve") await expenses.approve(selected.id);
      else await expenses.update(selected.id, { status: kind === "reject" ? "Rejected" : "Reimbursed" });
      setSelected(null);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Action failed."); }
    finally { setActing(false); }
  };

  return (
    <section id="hr-expenses-page" data-testid="hr-expenses-page" className="page-section active hr-page-shell">
      <div style={sectionStack}>
        {!isEmployeeView ? (
          <PageHeader
            title="Expense Claims & Mileage Ledger"
            subtitle="Reimbursements, travel logs and settlement control"
            actions={<button id="hr-expenses-submit-open" data-testid="hr-expenses-submit-open" onClick={() => { setMsg(null); setAddOpen(true); }} style={{ height: 42, padding: "0 22px", borderRadius: 12, border: "none", cursor: "pointer", background: TEAL, color: "white", fontWeight: 800, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}><Plus size={16} /> Submit Expense Claim</button>}
          />
        ) : null}

        {isEmployeeView ? (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button id="hr-expenses-submit-open" data-testid="hr-expenses-submit-open" onClick={() => { setMsg(null); setAddOpen(true); }} style={{ height: 40, padding: "0 18px", borderRadius: 10, border: "none", cursor: "pointer", background: TEAL, color: "white", fontWeight: 800, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}><Plus size={15} /> Submit Claim</button>
          </div>
        ) : null}

      {/* STAT CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
        <StatCard tag="Pending" label="Pending Clearance" value={formatCurrency(sumPending)} sub={`${pendingCount} requests waiting review`} tone="#d97706" icon={<Clock size={24} />} />
        <StatCard tag="Settled" label="Approved & Paid" value={formatCurrency(sumSettled)} sub={`From ${scopedExpenses.filter((e) => e.status === "Approved" || e.status === "Reimbursed").length} approved profiles`} tone="#10b981" icon={<CheckCircle2 size={24} />} />
        <StatCard tag="Total Registers" label="Total Ledger Count" value={`${scopedExpenses.length} Claims`} sub="Expense claims logged" tone={TEAL} icon={<Receipt size={24} />} accent />
      </div>

      {/* TABS + SEARCH */}
      <div style={{ ...panel, padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 4, background: "rgba(100,116,139,0.08)", padding: 4, borderRadius: 6, maxWidth: "100%" }}>
            {(isEmployeeView ? EXPENSE_ROUTES.filter((t) => t.key === "ledger") : EXPENSE_ROUTES).map((t) => {
              const activeTab = isEmployeeView ? "ledger" : tab;
              const label = t.key === "ledger" ? `${t.label} (${scopedExpenses.length})` : `${t.label} (${pendingCount} Pending)`;
              return (
                <button key={t.key} id={`hr-expenses-tab-${t.key}`} data-testid={`hr-expenses-tab-${t.key}`} data-active={activeTab === t.key ? "true" : "false"} onClick={() => navigate(isEmployeeView ? "/me/expenses" : `/expenses/${t.route}`)} style={{ padding: "8px 16px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", background: activeTab === t.key ? (t.key === "approvals" ? TEAL : "white") : "transparent", color: activeTab === t.key ? (t.key === "approvals" ? "white" : "var(--dark-text)") : "var(--light-text)", boxShadow: activeTab === t.key && t.key === "ledger" ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>{label}</button>
              );
            })}
          </div>
          <ExpensesViewToggle value={viewMode} onChange={setViewMode} />
        </div>
        <div style={{ position: "relative", width: "100%", maxWidth: 360, alignSelf: "flex-end" }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--light-text)" }} />
          <input id="hr-expenses-search" data-testid="hr-expenses-search" placeholder="Search description, categories..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...field, height: 42, width: "100%", borderRadius: 999, paddingLeft: 34, fontSize: 13.5, fontWeight: 600, background: "#ffffff", border: "1px solid rgba(148,163,184,0.14)" }} />
        </div>
      </div>



      {/* TABLE */}
      {/* TABLE */}
      {expenses.loading ? (
        <div style={{ ...card, padding: 20 }}>
          <SkeletonTable rows={4} columns={tab === "approvals" ? 7 : 6} />
        </div>
      ) : viewMode === "table" ? (
        <div data-testid="hr-expenses-table-panel" style={{ ...card }}>
          <div style={{ overflowX: "auto" }}>
          <table id="hr-expenses-table" data-testid="hr-expenses-table" style={{ width: "100%", minWidth: isEmployeeView ? 860 : 980, borderCollapse: "collapse" }}>
            <thead><tr>
              {!isEmployeeView && tab === "approvals" && <th style={th}>Claimant Staff</th>}
              <th style={th}>Submit Date</th><th style={th}>Voucher Category</th><th style={th}>Claim Amount</th><th style={th}>Travel Summary</th><th style={th}>Status</th><th style={{ ...th, textAlign: "right" }}>Action</th>
            </tr></thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={isEmployeeView ? 6 : 7} style={{ ...tdc, textAlign: "center", ...lbl, padding: "48px 16px" }}>{tab === "approvals" && !isEmployeeView ? "Excellent! No claims awaiting verification." : "No expense claim logs found."}</td></tr>
              ) : rows.map((e) => (
                <tr key={e.id} id={`hr-expenses-row-${e.id}`} data-testid={`hr-expenses-row-${e.id}`}>
                  {!isEmployeeView && tab === "approvals" && <td style={tdc}><div style={{ fontWeight: 800, fontSize: 14 }}>{empName(e.employeeUid)}</div><div style={{ ...lbl, fontSize: 10 }}>ID: {empCode(e.employeeUid)} · {empDept(e.employeeUid)}</div></td>}
                  <td style={{ ...tdc, fontFamily: "monospace", fontWeight: 700, fontSize: 13.5, color: "var(--light-text)" }}>{fmtDate(e.date)}</td>
                  <td style={tdc}><span style={tag(catStyle(e.category))}>{e.category || "—"}</span></td>
                  <td style={{ ...tdc, fontWeight: 900, fontSize: 15 }}>{formatCurrency(e.amount)}</td>
                  <td style={{ ...tdc, maxWidth: 200 }}>
                    {e.category === "Travel" && e.kms ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13.5, fontWeight: 700 }}><Car size={13} color="#0891b2" /> {e.kms} KMs {e.modeOfTransport ? `via ${e.modeOfTransport}` : ""}</div>
                    ) : (
                      <span style={{ fontSize: 13.5, fontStyle: "italic", color: "var(--light-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>“{e.notes || "—"}”</span>
                    )}
                  </td>
                  <td style={tdc}><span style={tag(statStyle(e.status))}>{e.status || "—"}</span></td>
                  <td style={{ ...tdc, textAlign: "right" }}>
                    <button id={`hr-expenses-view-${e.id}`} data-testid={`hr-expenses-view-${e.id}`} onClick={() => { setMsg(null); setSelected(e); }} style={{ height: 36, padding: "0 14px", borderRadius: 12, background: "rgba(17,94,89,0.05)", border: "1px solid rgba(17,94,89,0.12)", color: TEAL, fontWeight: 800, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><Eye size={14} /> {!isEmployeeView && tab === "approvals" ? "Inspect & Verify" : "View Profile"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        <div data-testid="hr-expenses-cards-panel" style={{ ...card, padding: 16 }}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--light-text)", gridColumn: "1/-1", padding: 24 }}>
                {tab === "approvals" && !isEmployeeView ? "Excellent! No claims awaiting verification." : "No expense claim logs found."}
              </div>
            ) : rows.map((e) => (
              <div key={e.id} id={`hr-expenses-card-${e.id}`} data-testid={`hr-expenses-card-${e.id}`} style={{ ...panel, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    {!isEmployeeView && tab === "approvals" ? (
                      <>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "var(--dark-text)" }}>{empName(e.employeeUid)}</div>
                        <div style={{ ...lbl, fontSize: 10, marginTop: 3 }}>ID: {empCode(e.employeeUid)} · {empDept(e.employeeUid)}</div>
                      </>
                    ) : (
                      <div style={{ fontWeight: 800, fontSize: 15, color: "var(--dark-text)" }}>{fmtDate(e.date)}</div>
                    )}
                  </div>
                  <span style={tag(statStyle(e.status))}>{e.status || "—"}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={lbl}>Submit Date</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dark-text)", marginTop: 4 }}>{fmtDate(e.date)}</div>
                  </div>
                  <div>
                    <div style={lbl}>Category</div>
                    <div style={{ marginTop: 5 }}><span style={tag(catStyle(e.category))}>{e.category || "—"}</span></div>
                  </div>
                  <div>
                    <div style={lbl}>Claim Amount</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "var(--dark-text)", marginTop: 4 }}>{formatCurrency(e.amount)}</div>
                  </div>
                  <div>
                    <div style={lbl}>Travel Summary</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--dark-text)", marginTop: 4 }}>
                      {e.category === "Travel" && e.kms ? `${e.kms} KMs${e.modeOfTransport ? ` via ${e.modeOfTransport}` : ""}` : (e.notes || "—")}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 6, borderTop: "1px solid var(--border-color)" }}>
                  <button id={`hr-expenses-view-${e.id}`} data-testid={`hr-expenses-view-${e.id}`} onClick={() => { setMsg(null); setSelected(e); }} style={{ height: 36, padding: "0 14px", borderRadius: 12, background: "rgba(17,94,89,0.05)", border: "1px solid rgba(17,94,89,0.12)", color: TEAL, fontWeight: 800, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><Eye size={14} /> {!isEmployeeView && tab === "approvals" ? "Inspect & Verify" : "View Profile"}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* SUBMIT MODAL */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        testId="hr-expenses-submit-modal"
        hideHeader
        contentClassName="max-w-[760px] p-0 overflow-hidden"
      >
        <div style={{ background: "rgba(17,94,89,0.05)", padding: "24px 30px", borderBottom: "1px solid rgba(17,94,89,0.1)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div><h3 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.6px", color: TEAL, margin: 0 }}>Submit Expense Claim</h3><p style={{ fontSize: 13, fontWeight: 600, color: TEAL, opacity: 0.8, margin: "4px 0 0" }}>Log a reimbursement or mileage voucher.</p></div>
          <button id="hr-expenses-submit-close" data-testid="hr-expenses-submit-close" onClick={() => setAddOpen(false)} aria-label="Close submit expense claim" style={iconBtn}><X size={20} /></button>
        </div>
        <div style={{ padding: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {!isEmployeeView ? (
            <Select
              id="hr-expenses-employee-select"
              testId="hr-expenses-employee-select"
              label="Claimant Employee"
              value={form.employeeUid}
              onChange={(e) => setForm({ ...form, employeeUid: e.target.value })}
              placeholder="Select employee"
              options={employees.map((e) => ({ value: e.id, label: e.name }))}
            />
          ) : (
            <div>
              <label style={{ ...lbl, color: TEAL }}>Claimant Employee</label>
              <div style={{ ...field, marginTop: 6, display: "flex", alignItems: "center" }}>{myProfile?.name || "Employee"}</div>
            </div>
          )}
          <div><label style={{ ...lbl, color: TEAL }}>Reimbursement Amount (INR)</label><input id="hr-expenses-amount-input" data-testid="hr-expenses-amount-input" type="number" min="0" placeholder="0.00" style={{ ...field, marginTop: 6 }} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
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
              <div><label style={lbl}>Distance (KMs)</label><input id="hr-expenses-distance-input" data-testid="hr-expenses-distance-input" type="number" min="0" placeholder="e.g. 120" style={{ ...field, marginTop: 6 }} value={form.kms} onChange={(e) => setForm({ ...form, kms: e.target.value })} /></div>
              <div><label style={lbl}>Mode of Transport</label><input id="hr-expenses-transport-input" data-testid="hr-expenses-transport-input" placeholder="e.g. Company Sedan" style={{ ...field, marginTop: 6 }} value={form.modeOfTransport} onChange={(e) => setForm({ ...form, modeOfTransport: e.target.value })} /></div>
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
        </div>
        {msg && <div style={{ margin: "0 28px", padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
        <div style={{ padding: "20px 28px", background: "var(--app-bg)", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button id="hr-expenses-submit-cancel" data-testid="hr-expenses-submit-cancel" onClick={() => setAddOpen(false)} style={ghostBtn}>Cancel</button>
          <button id="hr-expenses-submit-save" data-testid="hr-expenses-submit-save" data-state={saving ? "saving" : "idle"} onClick={submit} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1 }}>{saving ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : "Submit Claim Proposal"}</button>
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
                <div style={infoBox}><span style={{ ...lbl, fontSize: 10 }}>Submit Date</span><span style={{ fontSize: 14, fontWeight: 800, display: "block", marginTop: 4, fontFamily: "monospace" }}>{fmtDate(selected.date)}</span></div>
                <div style={infoBox}><span style={{ ...lbl, fontSize: 10 }}>Status</span><span style={{ display: "block", marginTop: 6 }}><span style={tag(statStyle(selected.status))}>{selected.status}</span></span></div>
              </div>
              {selected.category === "Travel" && selected.kms != null && (
                <div style={{ background: "#ecfeff", border: "1px solid #cffafe", borderRadius: 16, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, ...lbl, color: "#0e7490", marginBottom: 8 }}><Car size={15} /> Travel / Mileage Profile</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--dark-text)" }}>{selected.kms} KMs {selected.modeOfTransport ? `· ${selected.modeOfTransport}` : ""}</div>
                </div>
              )}
              <div style={{ background: "rgba(100,116,139,0.04)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 14 }}>
                <span style={{ ...lbl, fontSize: 10 }}>Notes / Description</span>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--dark-text)", fontStyle: "italic", margin: "8px 0 0" }}>“{selected.notes || "No description provided."}”</p>
              </div>
              <div style={infoBox}><span style={{ ...lbl, fontSize: 10 }}><User size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> Claimant</span><span style={{ fontSize: 14, fontWeight: 800, display: "block", marginTop: 4 }}>{empName(selected.employeeUid)} — {empDept(selected.employeeUid)}</span></div>

              {!isEmployeeView && selected.status === "Pending" && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 4 }}>
                  <button id={`hr-expenses-reject-${selected.id}`} data-testid={`hr-expenses-reject-${selected.id}`} data-state={acting ? "acting" : "idle"} onClick={() => act("reject")} disabled={acting} style={{ height: 40, padding: "0 18px", borderRadius: 12, border: "none", background: "#f43f5e", color: "white", fontWeight: 900, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>Decline</button>
                  <button id={`hr-expenses-approve-${selected.id}`} data-testid={`hr-expenses-approve-${selected.id}`} data-state={acting ? "acting" : "idle"} onClick={() => act("approve")} disabled={acting} style={{ height: 40, padding: "0 22px", borderRadius: 12, border: "none", background: TEAL, color: "white", fontWeight: 900, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>{acting && <Loader2 size={14} className="animate-spin" />} Approve Claim</button>
                </div>
              )}
              {!isEmployeeView && selected.status === "Approved" && (
                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
                  <button id={`hr-expenses-reimburse-${selected.id}`} data-testid={`hr-expenses-reimburse-${selected.id}`} data-state={acting ? "acting" : "idle"} onClick={() => act("reimburse")} disabled={acting} style={{ height: 40, padding: "0 22px", borderRadius: 12, border: "none", background: "#2563eb", color: "white", fontWeight: 900, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>{acting && <Loader2 size={14} className="animate-spin" />} Mark Reimbursed</button>
                </div>
              )}
              {msg && <div style={{ padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
            </div>
          </>
        )}
      </Dialog>
    </section>
  );
}

const overlay: CSSProperties = { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const modalBox: CSSProperties = { background: "var(--surface-bg)", borderRadius: 28, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", overflow: "hidden", maxHeight: "92vh" };
const iconBtn: CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" };
const ghostBtn: CSSProperties = { height: 44, padding: "0 22px", borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--surface-bg)", color: "var(--dark-text)", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const primaryBtn: CSSProperties = { height: 44, padding: "0 26px", borderRadius: 12, border: "none", background: TEAL, color: "white", fontWeight: 900, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 };
const infoBox: CSSProperties = { padding: 14, borderRadius: 14, background: "rgba(100,116,139,0.04)", border: "1px solid var(--border-color)" };
