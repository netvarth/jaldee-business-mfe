import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Calendar, Plus, Clock, Users, UserCheck, Info, Eye, AlertCircle, Search, Loader2, X } from "lucide-react";
import { PageHeader, Select, DatePicker, Dialog, Skeleton, SkeletonTable } from "@jaldee/design-system";
import { useMFEProps, SHELL_TOAST_EVENT } from "@jaldee/auth-context";
import { useEmployees } from "../../services/useEmployees";
import { useLeaves, useLeaveBalances, type LeaveRequest, type LeaveBalance } from "../../services/useLeaveData";

type Tab = "overview" | "balances" | "ledger";

const TEAL = "var(--primary-color)";
const LEAVE_QUOTAS = [
  { type: "Casual Leave", quota: 12, color: "#3b82f6" },
  { type: "Sick Leave", quota: 10, color: "#10b981" },
  { type: "Earned Leave", quota: 15, color: "#f59e0b" },
  { type: "Comp Off", quota: 2, color: "#8b5cf6" },
];
const MAX_TOTAL = LEAVE_QUOTAS.reduce((s, q) => s + q.quota, 0);

const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 24, overflow: "hidden" };
const lbl: CSSProperties = { fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--light-text)" };
const th: CSSProperties = { textAlign: "left", padding: "12px 16px", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--light-text)", background: "rgba(100,116,139,0.04)" };
const tdc: CSSProperties = { padding: "14px 16px", fontSize: 12.5, color: "var(--dark-text)", borderTop: "1px solid var(--border-color)" };
const field: CSSProperties = { width: "100%", height: 48, borderRadius: 14, border: "none", background: "rgba(100,116,139,0.06)", padding: "0 14px", fontSize: 14, fontWeight: 700, color: "var(--dark-text)" };

function calcDays(start?: string, end?: string, half?: boolean): number {
  if (!start || !end) return 0;
  if (half && start === end) return 0.5;
  const s = new Date(start), e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}
function statusStyle(status?: string): CSSProperties {
  const s = (status || "").toLowerCase();
  if (s === "approved") return { background: "rgba(16,185,129,0.06)", color: "#059669", border: "1px solid rgba(16,185,129,0.15)" };
  if (s === "rejected") return { background: "rgba(244,63,94,0.06)", color: "#e11d48", border: "1px solid rgba(244,63,94,0.15)" };
  return { background: "rgba(245,158,11,0.06)", color: "#d97706", border: "1px solid rgba(245,158,11,0.15)" };
}
const pill = (s?: string): CSSProperties => ({ ...statusStyle(s), display: "inline-block", padding: "3px 10px", borderRadius: 8, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" });

function StatCard({ tag, value, sub, tone, icon, accent }: { tag: string; value: ReactNode; sub: string; tone: string; icon: ReactNode; accent?: boolean }) {
  return (
    <div style={{ ...card, borderRadius: 28, padding: 24, display: "flex", alignItems: "center", justifyContent: "space-between", background: accent ? "rgba(17,94,89,0.04)" : "var(--surface-bg)", borderColor: accent ? "rgba(17,94,89,0.18)" : "var(--border-color)" }}>
      <div>
        <span style={{ ...lbl, color: TEAL }}>{tag}</span>
        <h3 style={{ fontSize: 28, fontWeight: 900, color: accent ? TEAL : "var(--dark-text)", letterSpacing: "-0.5px", margin: "4px 0 4px" }}>{value}</h3>
        <p style={{ ...lbl, color: tone }}>{sub}</p>
      </div>
      <div style={{ height: 48, width: 48, borderRadius: 16, background: `${tone}14`, border: `1px solid ${tone}33`, display: "flex", alignItems: "center", justifyContent: "center", color: tone }}>{icon}</div>
    </div>
  );
}

export default function Leave() {
  const { eventBus } = useMFEProps();
  const [tab, setTab] = useState<Tab>("overview");
  const { data: employees, loading: empLoading } = useEmployees();
  const leaves = useLeaves();
  const balances = useLeaveBalances();
  const isLoading = leaves.loading || balances.loading || empLoading;

  useEffect(() => {
    const err = leaves.error || balances.error;
    if (err) {
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Leave",
        message: err,
      });
    }
  }, [leaves.error, balances.error, eventBus]);

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e] as const)), [employees]);
  const empName = (uid?: string) => (uid ? empMap.get(uid)?.name ?? uid : "—");
  const empDept = (uid?: string) => (uid ? empMap.get(uid)?.department ?? "General" : "—");
  const empCode = (uid?: string) => (uid ? empMap.get(uid)?.employeeId ?? "—" : "—");

  const today = new Date().toISOString().slice(0, 10);
  const pendingLeaves = useMemo(() => leaves.data.filter((l) => (l.status || "").toLowerCase() === "pending"), [leaves.data]);
  const onLeaveToday = useMemo(() => leaves.data.filter((l) => (l.status || "").toLowerCase() === "approved" && l.startDate && l.endDate && l.startDate <= today && l.endDate >= today), [leaves.data, today]);

  // balances grouped by employee
  const balByEmp = useMemo(() => {
    const m = new Map<string, Map<string, LeaveBalance>>();
    balances.data.forEach((b) => {
      if (!b.employeeUid) return;
      if (!m.has(b.employeeUid)) m.set(b.employeeUid, new Map());
      m.get(b.employeeUid)!.set((b.leaveType || "").toLowerCase(), b);
    });
    return m;
  }, [balances.data]);
  const balFor = (uid: string, type: string) => balByEmp.get(uid)?.get(type.toLowerCase());

  // apply modal
  const [applyOpen, setApplyOpen] = useState(false);
  const [form, setForm] = useState({ employeeUid: "", type: "Casual Leave", startDate: "", endDate: "", isHalfDay: false, reason: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // detail modal
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [remarks, setRemarks] = useState("");
  const [acting, setActing] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const submitApply = async () => {
    if (!form.employeeUid || !form.startDate || !form.endDate || !form.reason) { setMsg("Employee, dates and reason are required."); return; }
    setSaving(true); setMsg(null);
    try {
      await leaves.apply({
        employeeUid: form.employeeUid, type: form.type, startDate: form.startDate, endDate: form.endDate,
        isHalfDay: form.isHalfDay, duration: calcDays(form.startDate, form.endDate, form.isHalfDay), reason: form.reason, status: "Pending",
      });
      setForm({ employeeUid: "", type: "Casual Leave", startDate: "", endDate: "", isHalfDay: false, reason: "" });
      setApplyOpen(false);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Failed to submit."); }
    finally { setSaving(false); }
  };

  const act = async (status: "Approved" | "Rejected") => {
    if (!selected) return;
    setActing(true);
    try {
      await leaves.update(selected.id, { status, statusRemarks: remarks || null });
      setSelected(null); setRemarks("");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Action failed."); }
    finally { setActing(false); }
  };

  const ledgerRows = useMemo(() => leaves.data
    .filter((l) => statusFilter === "all" || (l.status || "").toLowerCase() === statusFilter)
    .slice().sort((a, b) => (b.appliedAt || "").localeCompare(a.appliedAt || "")), [leaves.data, statusFilter]);

  const balanceRows = useMemo(() => employees.filter((e) => {
    const q = search.toLowerCase();
    return !q || e.name.toLowerCase().includes(q) || (e.employeeId || "").toLowerCase().includes(q) || (e.department || "").toLowerCase().includes(q);
  }), [employees, search]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview & Approvals" },
    { key: "balances", label: "Employee Balances" },
    { key: "ledger", label: "Company Leave Ledger" },
  ];

  return (
    <section id="hr-leave-page" data-testid="hr-leave-page" className="page-section active" style={{ background: "var(--app-bg)", minWidth: 0 }}>
      <PageHeader
        title="Corporate Leave Dashboard"
        subtitle="Administrative leave and attendance control"
        actions={
          <>
          <span id="hr-leave-admin-badge" data-testid="hr-leave-admin-badge" style={{ ...lbl, color: TEAL, display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(17,94,89,0.05)", border: "1px solid rgba(17,94,89,0.12)", padding: "7px 14px", borderRadius: 12 }}><UserCheck size={14} /> Corporate Admin Control</span>
          <button id="hr-leave-apply-button" data-testid="hr-leave-apply-button" onClick={() => { setMsg(null); setApplyOpen(true); }} style={{ height: 42, padding: "0 22px", borderRadius: 12, border: "none", cursor: "pointer", background: TEAL, color: "white", fontWeight: 800, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}><Plus size={16} /> Apply for Leave</button>
          </>
        }
      />

      {/* PILL TABS */}
      <div style={{ display: "inline-flex", gap: 4, background: "rgba(100,116,139,0.08)", padding: 4, borderRadius: 12, marginBottom: 28 }}>
        {tabs.map((t) => (
          <button id={`hr-leave-tab-${t.key}`} data-testid={`hr-leave-tab-${t.key}`} data-active={tab === t.key ? "true" : "false"} key={t.key} onClick={() => setTab(t.key)} style={{ padding: "8px 20px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", background: tab === t.key ? "white" : "transparent", color: tab === t.key ? "var(--dark-text)" : "var(--light-text)", boxShadow: tab === t.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>{t.label}</button>
        ))}
      </div>



      {/* ===== OVERVIEW ===== */}
      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {isLoading ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20 }}>
                <div style={{ ...card, borderRadius: 28, padding: 24, height: 124 }} className="animate-pulse space-y-3">
                  <Skeleton height={12} width={100} className="rounded bg-[var(--border-color)] opacity-40" />
                  <Skeleton height={32} width={140} className="rounded-lg bg-[var(--border-color)] opacity-60" />
                  <Skeleton height={12} width={160} className="rounded bg-[var(--border-color)] opacity-40" />
                </div>
                <div style={{ ...card, borderRadius: 28, padding: 24, height: 124 }} className="animate-pulse space-y-3">
                  <Skeleton height={12} width={100} className="rounded bg-[var(--border-color)] opacity-40" />
                  <Skeleton height={32} width={120} className="rounded-lg bg-[var(--border-color)] opacity-60" />
                  <Skeleton height={12} width={140} className="rounded bg-[var(--border-color)] opacity-40" />
                </div>
                <div style={{ ...card, borderRadius: 28, padding: 24, height: 124 }} className="animate-pulse space-y-3">
                  <Skeleton height={12} width={100} className="rounded bg-[var(--border-color)] opacity-40" />
                  <Skeleton height={32} width={150} className="rounded-lg bg-[var(--border-color)] opacity-60" />
                  <Skeleton height={12} width={170} className="rounded bg-[var(--border-color)] opacity-40" />
                </div>
              </div>
              <div style={{ ...card, padding: 20 }}>
                <SkeletonTable rows={3} columns={5} />
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20 }}>
                <StatCard tag="Total Submitted" value={`${pendingLeaves.length} Pending`} sub="Needs verification" tone="#d97706" icon={<Clock size={24} />} />
                <StatCard tag="Active Workforce Status" value={`${employees.length - onLeaveToday.length} / ${employees.length}`} sub="Active today" tone="#10b981" icon={<Users size={24} />} />
                <StatCard tag="Out of Office" value={`${onLeaveToday.length} On Leave`} sub="Absent today" tone={TEAL} icon={<Calendar size={24} />} accent />
              </div>

          {/* who is on leave today */}
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--dark-text)", margin: "0 0 2px" }}>Who is on Leave Today</h2>
            <p style={{ ...lbl, marginBottom: 16 }}>Staff members scheduled away from office right now</p>
            {onLeaveToday.length === 0 ? (
              <div style={{ border: "1px dashed var(--border-color)", background: "rgba(100,116,139,0.03)", borderRadius: 18, padding: 32, textAlign: "center", ...lbl, fontSize: 11 }}>🎉 All hands on deck! No employees are registered on leave today.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
                {onLeaveToday.map((l) => (
                  <div key={l.id} style={{ border: "1px solid rgba(16,185,129,0.18)", background: "rgba(16,185,129,0.03)", borderRadius: 18, padding: 16, display: "flex", gap: 12 }}>
                    <div style={{ height: 40, width: 40, borderRadius: 12, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.18)", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14 }}>{empName(l.employeeUid).charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <h4 style={{ fontSize: 12.5, fontWeight: 900, color: "var(--dark-text)", margin: 0 }}>{empName(l.employeeUid)}</h4>
                        <span style={{ ...lbl, color: "#059669", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", padding: "2px 6px", borderRadius: 6 }}>{l.type}</span>
                      </div>
                      <p style={{ ...lbl, marginTop: 4 }}>{empDept(l.employeeUid)} · {calcDays(l.startDate, l.endDate, l.isHalfDay)} days away</p>
                      <p style={{ fontSize: 11.5, color: "var(--dark-text)", fontStyle: "italic", margin: "6px 0 0", opacity: 0.8 }}>“{l.reason}”</p>
                      <p style={{ ...lbl, marginTop: 8, color: "var(--light-text)" }}>{l.startDate} to {l.endDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* pending approvals */}
          <div style={{ ...card }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--dark-text)" }}>Pending Absence Requests</div>
                <div style={{ ...lbl, marginTop: 2 }}>Staff submissions requiring immediate clearance</div>
              </div>
              <span style={{ background: "rgba(245,158,11,0.12)", color: "#b45309", border: "1px solid rgba(245,158,11,0.25)", padding: "4px 10px", borderRadius: 8, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{pendingLeaves.length} Pending</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Staff Individual</th><th style={th}>Leave Category</th><th style={th}>Period Range</th><th style={th}>Days</th><th style={th}>Reason</th><th style={{ ...th, textAlign: "right" }}>Clearance</th></tr></thead>
              <tbody>
                {pendingLeaves.length === 0 ? (
                  <tr><td colSpan={6} style={{ ...tdc, textAlign: "center", ...lbl, padding: "32px 16px" }}>Excellent! No pending absence application logs found.</td></tr>
                ) : pendingLeaves.map((l) => (
                  <tr key={l.id}>
                    <td style={{ ...tdc, fontWeight: 700 }}>{empName(l.employeeUid)}<span style={{ display: "block", ...lbl, fontSize: 8 }}>Dept: {empDept(l.employeeUid)}</span></td>
                    <td style={{ ...tdc, fontWeight: 700 }}>{l.type}</td>
                    <td style={{ ...tdc, fontFamily: "monospace", fontSize: 11, color: "var(--light-text)" }}>{l.startDate} → {l.endDate}</td>
                    <td style={{ ...tdc, fontWeight: 900, color: TEAL }}>{calcDays(l.startDate, l.endDate, l.isHalfDay)}d</td>
                    <td style={{ ...tdc, color: "var(--light-text)", fontStyle: "italic", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>“{l.reason}”</td>
                    <td style={{ ...tdc, textAlign: "right" }}>
                      <button id={`hr-leave-pending-inspect-${l.id}`} data-testid={`hr-leave-pending-inspect-${l.id}`} onClick={() => { setSelected(l); setRemarks(""); }} style={{ height: 32, padding: "0 14px", borderRadius: 12, background: "rgba(17,94,89,0.05)", border: "1px solid rgba(17,94,89,0.12)", color: TEAL, fontWeight: 800, fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><Eye size={14} /> Inspect</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
          )}
        </div>
      )}

      {/* ===== BALANCES ===== */}
      {tab === "balances" && (
        <div style={{ ...card }}>
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={5} columns={6} />
            </div>
          ) : (
            <>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: TEAL }}>Overall Leave Left status for each employee</div>
              <div style={{ ...lbl, marginTop: 2 }}>Remaining balances computed from approved ledger history</div>
            </div>
            <div style={{ position: "relative", width: 300, maxWidth: "100%" }}>
              <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--light-text)" }} />
              <input id="hr-leave-balance-search" data-testid="hr-leave-balance-search" placeholder="Search employee or department…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...field, height: 40, borderRadius: 999, paddingLeft: 38, fontWeight: 600, fontSize: 12.5 }} />
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>Employee Details</th>
              {LEAVE_QUOTAS.map((q) => <th key={q.type} style={th}>{q.type} ({q.quota}d)</th>)}
              <th style={{ ...th, textAlign: "right", color: TEAL }}>Total Left</th>
            </tr></thead>
            <tbody>
              {balanceRows.length === 0 ? (
                <tr><td colSpan={6} style={{ ...tdc, textAlign: "center", ...lbl, padding: "32px 16px" }}>No employees found.</td></tr>
              ) : balanceRows.map((emp) => {
                const totalLeft = LEAVE_QUOTAS.reduce((s, q) => s + (balFor(emp.id, q.type)?.available ?? 0), 0);
                return (
                  <tr key={emp.id}>
                    <td style={tdc}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ height: 36, width: 36, borderRadius: 12, background: "rgba(17,94,89,0.05)", border: "1px solid rgba(17,94,89,0.1)", color: TEAL, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13 }}>{emp.name.charAt(0)}</div>
                        <div><div style={{ fontWeight: 800, fontSize: 12.5 }}>{emp.name}</div><div style={{ ...lbl, fontSize: 9 }}>{emp.employeeId} · {emp.department || "General"}</div></div>
                      </div>
                    </td>
                    {LEAVE_QUOTAS.map((q) => {
                      const avl = balFor(emp.id, q.type)?.available ?? 0;
                      return (
                        <td key={q.type} style={tdc}>
                          <div style={{ width: 96 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 800, color: "var(--dark-text)" }}><span>{avl} avl</span><span style={{ color: "var(--light-text)" }}>/ {q.quota}</span></div>
                            <div style={{ height: 4, background: "rgba(100,116,139,0.15)", borderRadius: 999, overflow: "hidden", marginTop: 4 }}><div style={{ height: "100%", width: `${Math.min(100, (avl / q.quota) * 100)}%`, background: q.color, borderRadius: 999 }} /></div>
                          </div>
                        </td>
                      );
                    })}
                    <td style={{ ...tdc, textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: TEAL }}>{totalLeft}</div>
                      <div style={{ ...lbl, fontSize: 8 }}>of {MAX_TOTAL}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
            </>
          )}
        </div>
      )}

      {/* ===== LEDGER ===== */}
      {tab === "ledger" && (
        <div style={{ ...card }}>
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={5} columns={6} />
            </div>
          ) : (
            <>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--dark-text)" }}>Global Leave Register History</div>
              <div style={{ ...lbl, marginTop: 2 }}>Master record ledger of all submissions</div>
            </div>
            <Select
              id="hr-leave-status-filter"
              testId="hr-leave-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              containerClassName="w-[170px]"
              fullWidth={false}
              options={[
                { value: "all", label: "All Status" },
                { value: "approved", label: "Approved" },
                { value: "pending", label: "Pending" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Staff Associate</th><th style={th}>Category</th><th style={th}>Duration</th><th style={th}>Days</th><th style={th}>Statement</th><th style={{ ...th, textAlign: "right" }}>Status</th></tr></thead>
            <tbody>
              {ledgerRows.length === 0 ? (
                <tr><td colSpan={6} style={{ ...tdc, textAlign: "center", ...lbl, padding: "32px 16px" }}>No records in the ledger.</td></tr>
              ) : ledgerRows.map((l) => (
                <tr key={l.id}>
                  <td style={tdc}><div style={{ fontWeight: 800, fontSize: 12.5 }}>{empName(l.employeeUid)}</div><div style={{ ...lbl, fontSize: 9 }}>ID: {empCode(l.employeeUid)}</div></td>
                  <td style={{ ...tdc, fontWeight: 600 }}>{l.type}</td>
                  <td style={{ ...tdc, fontFamily: "monospace", fontSize: 11, color: "var(--light-text)" }}>{l.startDate} → {l.endDate}</td>
                  <td style={{ ...tdc, fontWeight: 900, color: TEAL }}>{calcDays(l.startDate, l.endDate, l.isHalfDay)}d</td>
                  <td style={{ ...tdc, color: "var(--light-text)", fontStyle: "italic", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>“{l.reason}”</td>
                  <td style={{ ...tdc, textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <span style={pill(l.status)}>{l.status}</span>
                      <button id={`hr-leave-ledger-inspect-${l.id}`} data-testid={`hr-leave-ledger-inspect-${l.id}`} onClick={() => { setSelected(l); setRemarks(""); }} title="Inspect" style={{ height: 28, width: 28, borderRadius: 8, border: "1px solid transparent", background: "transparent", color: "var(--light-text)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Eye size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </>
          )}
        </div>
      )}

      {/* ===== APPLY MODAL ===== */}
      <Dialog
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        testId="hr-leave-apply-modal"
        hideHeader
        contentClassName="max-w-[900px] p-0 overflow-hidden"
      >
        <div style={{ background: "rgba(17,94,89,0.05)", padding: "26px 32px", borderBottom: "1px solid rgba(17,94,89,0.1)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.6px", color: TEAL, margin: 0 }}>Apply for Leave</h3>
            <p style={{ fontSize: 13, fontWeight: 600, color: TEAL, opacity: 0.8, margin: "4px 0 0" }}>Submit details of your upcoming absence plan.</p>
          </div>
          <button id="hr-leave-apply-close" data-testid="hr-leave-apply-close" onClick={() => setApplyOpen(false)} style={iconBtn}><X size={20} /></button>
        </div>
        <div style={{ padding: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Select
              id="hr-leave-employee"
              testId="hr-leave-employee"
              label="Employee"
              value={form.employeeUid}
              onChange={(e) => setForm({ ...form, employeeUid: e.target.value })}
              placeholder="Select employee"
              options={employees.map((e) => ({ value: e.id, label: e.name }))}
            />
            <Select
              id="hr-leave-type"
              testId="hr-leave-type"
              label="Leave Type Profile"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              options={LEAVE_QUOTAS.map((q) => ({ value: q.type, label: q.type }))}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DatePicker
                id="hr-leave-start-date"
                label="Start Date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
              <DatePicker
                id="hr-leave-end-date"
                label="End Date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            {form.startDate && form.startDate === form.endDate && (
              <label style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(100,116,139,0.06)", padding: 12, borderRadius: 12, fontSize: 13, fontWeight: 700, color: "var(--dark-text)" }}>
                <input id="hr-leave-half-day" data-testid="hr-leave-half-day" type="checkbox" checked={form.isHalfDay} onChange={(e) => setForm({ ...form, isHalfDay: e.target.checked })} /> Apply as Half Day (0.5 days)
              </label>
            )}
            {form.startDate && form.endDate && (
              <div style={{ background: "rgba(17,94,89,0.05)", border: "1px solid rgba(17,94,89,0.1)", padding: 16, borderRadius: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ ...lbl, color: TEAL }}>Total Days Count</span>
                <span style={{ background: TEAL, color: "white", fontWeight: 900, fontSize: 12, padding: "4px 12px", borderRadius: 999 }}>{calcDays(form.startDate, form.endDate, form.isHalfDay)} Days</span>
              </div>
            )}
            <div style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 20, padding: 16, display: "flex", gap: 14 }}>
              <div style={{ height: 40, width: 40, borderRadius: 12, background: "rgba(99,102,241,0.1)", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Info size={20} /></div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#4338ca", lineHeight: 1.5, margin: 0 }}>Leave balances are real-time and auto-deducted once administrators verify and approve your request.</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={lbl}>Detailed Statement / Reason</label>
            <textarea id="hr-leave-reason" data-testid="hr-leave-reason" placeholder="Share a short note detailing the cause of your request…" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} style={{ marginTop: 6, flex: 1, minHeight: 220, borderRadius: 16, border: "none", background: "rgba(100,116,139,0.06)", padding: 18, fontSize: 14, fontWeight: 500, color: "var(--dark-text)", resize: "vertical" }} />
          </div>
        </div>
        {msg && <div style={{ margin: "0 28px", padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
        <div style={{ padding: "20px 28px", background: "var(--app-bg)", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button id="hr-leave-apply-cancel" data-testid="hr-leave-apply-cancel" onClick={() => setApplyOpen(false)} style={ghostBtn}>Close</button>
          <button id="hr-leave-apply-submit" data-testid="hr-leave-apply-submit" onClick={submitApply} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1 }}>{saving ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : "Submit Application"}</button>
        </div>
      </Dialog>

      {/* ===== DETAIL / APPROVE MODAL ===== */}
      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        testId="hr-leave-detail-modal"
        hideHeader
        contentClassName="max-w-[620px] p-0 overflow-hidden"
      >
        {selected && (
          <>
            <div style={{ background: "rgba(17,94,89,0.05)", padding: "22px 28px", borderBottom: "1px solid rgba(17,94,89,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><h3 style={{ fontSize: 20, fontWeight: 900, color: TEAL, margin: 0 }}>Leave Request Detail</h3><p style={{ ...lbl, color: TEAL, marginTop: 4 }}>{empName(selected.employeeUid)} · {empCode(selected.employeeUid)}</p></div>
              <button id="hr-leave-detail-close" data-testid="hr-leave-detail-close" onClick={() => setSelected(null)} style={iconBtn}><X size={20} /></button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, maxHeight: "60vh", overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={infoBox}><span style={{ ...lbl, fontSize: 8 }}>Applicant</span><span style={{ fontSize: 13, fontWeight: 800, color: "var(--dark-text)", display: "block", marginTop: 4 }}>{empName(selected.employeeUid)}</span></div>
                <div style={infoBox}><span style={{ ...lbl, fontSize: 8 }}>Department</span><span style={{ fontSize: 13, fontWeight: 800, color: "var(--dark-text)", display: "block", marginTop: 4 }}>{empDept(selected.employeeUid)}</span></div>
              </div>
              <div style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 20, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 10, borderBottom: "1px solid rgba(59,130,246,0.1)", marginBottom: 12 }}><Calendar size={16} color="#2563eb" /><span style={{ ...lbl, color: "#1e40af" }}>Duration Range Profile</span></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><span style={{ ...lbl, fontSize: 8, color: "#2563eb" }}>Period</span><div style={{ fontSize: 13, fontWeight: 800, color: TEAL, marginTop: 2 }}>{selected.startDate} to {selected.endDate}</div></div>
                  <div><span style={{ ...lbl, fontSize: 8, color: "#2563eb" }}>Requested</span><div><span style={{ background: TEAL, color: "white", fontWeight: 900, fontSize: 12, padding: "3px 12px", borderRadius: 999, display: "inline-block", marginTop: 2 }}>{calcDays(selected.startDate, selected.endDate, selected.isHalfDay)} Days</span></div></div>
                </div>
              </div>
              <div>
                <span style={{ ...lbl, marginBottom: 8, display: "block" }}>Applicant Remaining Balance</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                  {LEAVE_QUOTAS.map((q) => {
                    const isReq = q.type.toLowerCase() === (selected.type || "").toLowerCase();
                    const avl = balFor(selected.employeeUid || "", q.type)?.available ?? 0;
                    return (
                      <div key={q.type} style={{ padding: 10, borderRadius: 12, textAlign: "center", background: isReq ? "rgba(17,94,89,0.08)" : "rgba(100,116,139,0.04)", border: isReq ? "1px solid rgba(17,94,89,0.3)" : "1px solid var(--border-color)" }}>
                        <span style={{ ...lbl, fontSize: 7.5, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.type}</span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: isReq ? TEAL : "var(--dark-text)", display: "block", marginTop: 2 }}>{avl} avl</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 16, padding: 14 }}>
                <span style={{ ...lbl, fontSize: 8, color: "#b45309" }}>Leave Reason Statement</span>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--dark-text)", fontStyle: "italic", margin: "8px 0 0", padding: 12, background: "rgba(255,255,255,0.7)", borderRadius: 12 }}>“{selected.reason}”</p>
              </div>
              {selected.statusRemarks && (
                <div style={infoBox}><span style={{ ...lbl, fontSize: 8 }}>Clearance Remarks</span><p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--dark-text)", margin: "6px 0 0" }}>{selected.statusRemarks}</p></div>
              )}
              {(selected.status || "").toLowerCase() === "pending" && (
                <div style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 20, padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}><AlertCircle size={16} color="#d97706" /><span style={{ ...lbl, color: "#b45309" }}>Authorized Approver Clearance Action</span></div>
                  <textarea id="hr-leave-approval-remarks" data-testid="hr-leave-approval-remarks" placeholder="Comment explaining approval or rejection…" value={remarks} onChange={(e) => setRemarks(e.target.value)} style={{ width: "100%", minHeight: 70, borderRadius: 12, border: "1px solid rgba(245,158,11,0.3)", background: "white", padding: 12, fontSize: 12.5, resize: "vertical" }} />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
                    <button id="hr-leave-reject" data-testid="hr-leave-reject" onClick={() => act("Rejected")} disabled={acting} style={{ height: 38, padding: "0 18px", borderRadius: 12, border: "none", background: "#f43f5e", color: "white", fontWeight: 900, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>Decline &amp; Reject</button>
                    <button id="hr-leave-approve" data-testid="hr-leave-approve" onClick={() => act("Approved")} disabled={acting} style={{ height: 38, padding: "0 22px", borderRadius: 12, border: "none", background: TEAL, color: "white", fontWeight: 900, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>{acting && <Loader2 size={14} className="animate-spin" />} Clear &amp; Approve</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </Dialog>
    </section>
  );
}

const iconBtn: CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" };
const ghostBtn: CSSProperties = { height: 44, padding: "0 22px", borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--surface-bg)", color: "var(--dark-text)", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const primaryBtn: CSSProperties = { height: 44, padding: "0 26px", borderRadius: 12, border: "none", background: TEAL, color: "white", fontWeight: 900, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 };
const infoBox: CSSProperties = { padding: 14, borderRadius: 14, background: "rgba(100,116,139,0.04)", border: "1px solid var(--border-color)" };
