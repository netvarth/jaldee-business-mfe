import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Plus, Clock, CheckCircle2, Receipt, Search, Eye, Car, User, AlertCircle, Loader2, X } from "lucide-react";
import { PageHeader, Select, DatePicker, Textarea, Dialog, SkeletonTable } from "@jaldee/design-system";
import { useMFEProps, SHELL_TOAST_EVENT } from "@jaldee/auth-context";
import { useLocation, useNavigate } from "react-router-dom";
import { useEmployees } from "../../services/useEmployees";
import { useExpenses, type ExpenseClaim } from "../../services/useExpenses";
import { formatCurrency } from "../../lib/utils";

type Tab = "ledger" | "approvals";
const EXPENSE_ROUTES: Array<{ key: Tab; route: string; label: string }> = [
  { key: "ledger", route: "ledger", label: "Company Claims Ledger" },
  { key: "approvals", route: "verifications", label: "Verifications Control" },
];
const TEAL = "var(--primary-color)";
const CATEGORIES = ["Travel", "Food", "Lodging", "Other"];

const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 24, overflow: "hidden" };
const lbl: CSSProperties = { fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--light-text)" };
const th: CSSProperties = { textAlign: "left", padding: "12px 16px", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--light-text)", background: "rgba(100,116,139,0.04)" };
const tdc: CSSProperties = { padding: "14px 16px", fontSize: 12.5, color: "var(--dark-text)", borderTop: "1px solid var(--border-color)" };
const field: CSSProperties = { width: "100%", height: 48, borderRadius: 14, border: "none", background: "rgba(100,116,139,0.06)", padding: "0 14px", fontSize: 14, fontWeight: 700, color: "var(--dark-text)" };

function fmtDate(d?: string) { if (!d) return "N/A"; const x = new Date(d); return isNaN(x.getTime()) ? "N/A" : x.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" }); }
function tabFromPath(pathname: string): Tab {
  const segment = pathname.split("/").filter(Boolean).at(-1);
  const match = EXPENSE_ROUTES.find((item) => item.route === segment || item.key === segment);
  return match?.key || "ledger";
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
const tag = (st: CSSProperties): CSSProperties => ({ ...st, display: "inline-block", padding: "3px 10px", borderRadius: 8, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" });

function StatCard({ tag: t, label, value, sub, tone, icon, accent }: { tag: string; label: string; value: ReactNode; sub: string; tone: string; icon: ReactNode; accent?: boolean }) {
  return (
    <div style={{ ...card, borderRadius: 28, padding: 24, background: accent ? "rgba(17,94,89,0.04)" : "var(--surface-bg)", borderColor: accent ? "rgba(17,94,89,0.18)" : "var(--border-color)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ height: 48, width: 48, borderRadius: 16, background: `${tone}14`, border: `1px solid ${tone}33`, display: "flex", alignItems: "center", justifyContent: "center", color: tone }}>{icon}</div>
        <span style={{ ...lbl, color: tone, background: `${tone}14`, border: `1px solid ${tone}33`, padding: "4px 10px", borderRadius: 999 }}>{t}</span>
      </div>
      <p style={{ ...lbl, marginBottom: 4 }}>{label}</p>
      <div style={{ fontSize: 28, fontWeight: 900, color: accent ? TEAL : "var(--dark-text)", letterSpacing: "-0.5px" }}>{value}</div>
      <p style={{ ...lbl, marginTop: 8, fontWeight: 700 }}>{sub}</p>
    </div>
  );
}

export default function Expenses() {
  const { eventBus } = useMFEProps();
  const location = useLocation();
  const navigate = useNavigate();
  const tab = tabFromPath(location.pathname);
  const { data: employees } = useEmployees();
  const expenses = useExpenses();

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
  const empName = (uid?: string) => (uid ? empMap.get(uid)?.name ?? uid : "—");
  const empDept = (uid?: string) => (uid ? empMap.get(uid)?.department ?? "N/A" : "—");
  const empCode = (uid?: string) => (uid ? empMap.get(uid)?.employeeId ?? "—" : "—");

  const [search, setSearch] = useState("");
  const sumPending = useMemo(() => expenses.data.filter((e) => e.status === "Pending").reduce((a, e) => a + (e.amount || 0), 0), [expenses.data]);
  const sumSettled = useMemo(() => expenses.data.filter((e) => e.status === "Approved" || e.status === "Reimbursed").reduce((a, e) => a + (e.amount || 0), 0), [expenses.data]);
  const pendingCount = useMemo(() => expenses.data.filter((e) => e.status === "Pending").length, [expenses.data]);

  const rows = useMemo(() => {
    const base = tab === "approvals" ? expenses.data.filter((e) => e.status === "Pending") : expenses.data;
    const q = search.toLowerCase();
    return base.filter((e) => !q || (e.category || "").toLowerCase().includes(q) || (e.notes || "").toLowerCase().includes(q) || empName(e.employeeUid).toLowerCase().includes(q));
  }, [expenses.data, tab, search, empMap]);

  // submit modal
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ employeeUid: "", amount: "", category: "Food", kms: "", modeOfTransport: "", notes: "", date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // detail modal
  const [selected, setSelected] = useState<ExpenseClaim | null>(null);
  const [acting, setActing] = useState(false);

  const submit = async () => {
    if (!form.employeeUid || !form.amount) { setMsg("Employee and amount are required."); return; }
    setSaving(true); setMsg(null);
    try {
      const payload: Record<string, unknown> = {
        employeeUid: form.employeeUid, amount: Number(form.amount), category: form.category,
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
      <PageHeader
        title="Expense Claims & Mileage Ledger"
        subtitle="Reimbursements, travel logs and settlement control"
        actions={<button id="hr-expenses-submit-open" data-testid="hr-expenses-submit-open" onClick={() => { setMsg(null); setAddOpen(true); }} style={{ height: 42, padding: "0 22px", borderRadius: 12, border: "none", cursor: "pointer", background: TEAL, color: "white", fontWeight: 800, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}><Plus size={16} /> Submit Expense Claim</button>}
      />

      {/* STAT CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20, marginBottom: 28 }}>
        <StatCard tag="Pending" label="Pending Clearance" value={formatCurrency(sumPending)} sub={`${pendingCount} requests waiting review`} tone="#d97706" icon={<Clock size={24} />} />
        <StatCard tag="Settled" label="Approved & Paid" value={formatCurrency(sumSettled)} sub={`From ${expenses.data.filter((e) => e.status === "Approved" || e.status === "Reimbursed").length} approved profiles`} tone="#10b981" icon={<CheckCircle2 size={24} />} />
        <StatCard tag="Total Registers" label="Total Ledger Count" value={`${expenses.data.length} Claims`} sub="Company-wide receipts logged" tone={TEAL} icon={<Receipt size={24} />} accent />
      </div>

      {/* TABS + SEARCH */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "inline-flex", gap: 4, background: "rgba(100,116,139,0.08)", padding: 4, borderRadius: 999 }}>
          {EXPENSE_ROUTES.map((t) => {
            const label = t.key === "ledger" ? `${t.label} (${expenses.data.length})` : `${t.label} (${pendingCount} Pending)`;
            return (
              <button key={t.key} id={`hr-expenses-tab-${t.key}`} data-testid={`hr-expenses-tab-${t.key}`} data-active={tab === t.key ? "true" : "false"} onClick={() => navigate(`/expenses/${t.route}`)} style={{ padding: "8px 18px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", background: tab === t.key ? (t.key === "approvals" ? TEAL : "white") : "transparent", color: tab === t.key ? (t.key === "approvals" ? "white" : "var(--dark-text)") : "var(--light-text)", boxShadow: tab === t.key && t.key === "ledger" ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>{label}</button>
            );
          })}
        </div>
        <div style={{ position: "relative", width: 260, maxWidth: "100%" }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--light-text)" }} />
          <input id="hr-expenses-search" data-testid="hr-expenses-search" placeholder="Search description, categories…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...field, height: 38, borderRadius: 999, paddingLeft: 34, fontSize: 12.5, fontWeight: 600 }} />
        </div>
      </div>



      {/* TABLE */}
      {/* TABLE */}
      {expenses.loading ? (
        <div style={{ ...card, padding: 20 }}>
          <SkeletonTable rows={4} columns={tab === "approvals" ? 7 : 6} />
        </div>
      ) : (
        <div data-testid="hr-expenses-table-panel" style={{ ...card }}>
          <table id="hr-expenses-table" data-testid="hr-expenses-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              {tab === "approvals" && <th style={th}>Claimant Staff</th>}
              <th style={th}>Submit Date</th><th style={th}>Voucher Category</th><th style={th}>Claim Amount</th><th style={th}>Travel Summary</th><th style={th}>Status</th><th style={{ ...th, textAlign: "right" }}>Action</th>
            </tr></thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} style={{ ...tdc, textAlign: "center", ...lbl, padding: "48px 16px" }}>{tab === "approvals" ? "Excellent! No claims awaiting verification." : "No expense claim logs found."}</td></tr>
              ) : rows.map((e) => (
                <tr key={e.id} id={`hr-expenses-row-${e.id}`} data-testid={`hr-expenses-row-${e.id}`}>
                  {tab === "approvals" && <td style={tdc}><div style={{ fontWeight: 800, fontSize: 12.5 }}>{empName(e.employeeUid)}</div><div style={{ ...lbl, fontSize: 8 }}>ID: {empCode(e.employeeUid)} · {empDept(e.employeeUid)}</div></td>}
                  <td style={{ ...tdc, fontFamily: "monospace", fontWeight: 700, color: "var(--light-text)" }}>{fmtDate(e.date)}</td>
                  <td style={tdc}><span style={tag(catStyle(e.category))}>{e.category || "—"}</span></td>
                  <td style={{ ...tdc, fontWeight: 900 }}>{formatCurrency(e.amount)}</td>
                  <td style={{ ...tdc, maxWidth: 200 }}>
                    {e.category === "Travel" && e.kms ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700 }}><Car size={13} color="#0891b2" /> {e.kms} KMs {e.modeOfTransport ? `via ${e.modeOfTransport}` : ""}</div>
                    ) : (
                      <span style={{ fontSize: 12, fontStyle: "italic", color: "var(--light-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>“{e.notes || "—"}”</span>
                    )}
                  </td>
                  <td style={tdc}><span style={tag(statStyle(e.status))}>{e.status || "—"}</span></td>
                  <td style={{ ...tdc, textAlign: "right" }}>
                    <button id={`hr-expenses-view-${e.id}`} data-testid={`hr-expenses-view-${e.id}`} onClick={() => { setMsg(null); setSelected(e); }} style={{ height: 32, padding: "0 14px", borderRadius: 12, background: "rgba(17,94,89,0.05)", border: "1px solid rgba(17,94,89,0.12)", color: TEAL, fontWeight: 800, fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><Eye size={14} /> {tab === "approvals" ? "Inspect & Verify" : "View Profile"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
          <Select
            id="hr-expenses-employee-select"
            testId="hr-expenses-employee-select"
            label="Claimant Employee"
            value={form.employeeUid}
            onChange={(e) => setForm({ ...form, employeeUid: e.target.value })}
            placeholder="Select employee"
            options={employees.map((e) => ({ value: e.id, label: e.name }))}
          />
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
                <div style={infoBox}><span style={{ ...lbl, fontSize: 8 }}>Amount</span><span style={{ fontSize: 20, fontWeight: 900, color: TEAL, display: "block", marginTop: 4 }}>{formatCurrency(selected.amount)}</span></div>
                <div style={infoBox}><span style={{ ...lbl, fontSize: 8 }}>Category</span><span style={{ display: "block", marginTop: 6 }}><span style={tag(catStyle(selected.category))}>{selected.category}</span></span></div>
                <div style={infoBox}><span style={{ ...lbl, fontSize: 8 }}>Submit Date</span><span style={{ fontSize: 13, fontWeight: 800, display: "block", marginTop: 4, fontFamily: "monospace" }}>{fmtDate(selected.date)}</span></div>
                <div style={infoBox}><span style={{ ...lbl, fontSize: 8 }}>Status</span><span style={{ display: "block", marginTop: 6 }}><span style={tag(statStyle(selected.status))}>{selected.status}</span></span></div>
              </div>
              {selected.category === "Travel" && selected.kms != null && (
                <div style={{ background: "#ecfeff", border: "1px solid #cffafe", borderRadius: 16, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, ...lbl, color: "#0e7490", marginBottom: 8 }}><Car size={15} /> Travel / Mileage Profile</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--dark-text)" }}>{selected.kms} KMs {selected.modeOfTransport ? `· ${selected.modeOfTransport}` : ""}</div>
                </div>
              )}
              <div style={{ background: "rgba(100,116,139,0.04)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 14 }}>
                <span style={{ ...lbl, fontSize: 8 }}>Notes / Description</span>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--dark-text)", fontStyle: "italic", margin: "8px 0 0" }}>“{selected.notes || "No description provided."}”</p>
              </div>
              <div style={infoBox}><span style={{ ...lbl, fontSize: 8 }}><User size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> Claimant</span><span style={{ fontSize: 13, fontWeight: 800, display: "block", marginTop: 4 }}>{empName(selected.employeeUid)} — {empDept(selected.employeeUid)}</span></div>

              {selected.status === "Pending" && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 4 }}>
                  <button id={`hr-expenses-reject-${selected.id}`} data-testid={`hr-expenses-reject-${selected.id}`} data-state={acting ? "acting" : "idle"} onClick={() => act("reject")} disabled={acting} style={{ height: 40, padding: "0 18px", borderRadius: 12, border: "none", background: "#f43f5e", color: "white", fontWeight: 900, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>Decline</button>
                  <button id={`hr-expenses-approve-${selected.id}`} data-testid={`hr-expenses-approve-${selected.id}`} data-state={acting ? "acting" : "idle"} onClick={() => act("approve")} disabled={acting} style={{ height: 40, padding: "0 22px", borderRadius: 12, border: "none", background: TEAL, color: "white", fontWeight: 900, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>{acting && <Loader2 size={14} className="animate-spin" />} Approve Claim</button>
                </div>
              )}
              {selected.status === "Approved" && (
                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
                  <button id={`hr-expenses-reimburse-${selected.id}`} data-testid={`hr-expenses-reimburse-${selected.id}`} data-state={acting ? "acting" : "idle"} onClick={() => act("reimburse")} disabled={acting} style={{ height: 40, padding: "0 22px", borderRadius: 12, border: "none", background: "#2563eb", color: "white", fontWeight: 900, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>{acting && <Loader2 size={14} className="animate-spin" />} Mark Reimbursed</button>
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
